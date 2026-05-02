import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ChampionshipImageScene } from "@/lib/championship-image";

let client: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const sceneSchema = z.object({
  winnerTeamName: z.string().min(1).max(60),
  winnerTeamColor: z.string().min(1).max(20),
  loserTeamName: z.string().min(1).max(60),
  loserTeamColor: z.string().min(1).max(20),
  mvpPlayerName: z.string().min(1).max(80),
  loserSpotlightPlayerName: z.string().min(1).max(80),
});

const referenceSchema = z.object({
  name: z.string().min(1).max(40),
  linkedPlayerName: z.string().min(1).max(80).optional(),
  imageDataUrl: z.string().startsWith("data:image/"),
  role: z.enum(["podium_mvp", "loser_background"]),
});

const requestSchema = z.object({
  prompt: z.string().min(20).max(4000),
  scene: sceneSchema,
  references: z.array(referenceSchema).max(2),
});

const promptSchema = z.object({
  prompt: z.string().min(20).max(32000),
});

type ReferenceInput = z.infer<typeof referenceSchema>;

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image prompt." }, { status: 400 });
  }

  const { prompt, scene, references } = parsed.data;
  const imagePrompt = await prepareImagePrompt(openai, prompt, scene, references);
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
  const referenceFiles = await Promise.all(references.map(dataUrlToFile));
  const validReferences = referenceFiles.filter((file): file is File => Boolean(file));

  const response =
    validReferences.length > 0
      ? await openai.images.edit({
          model,
          image: validReferences,
          prompt: imagePrompt,
          size: "1536x1024",
          quality: "medium",
        })
      : await openai.images.generate({
          model,
          prompt: imagePrompt,
          size: "1536x1024",
          quality: "medium",
        });

  const image = response.data?.[0];
  const b64 = image?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "No image data returned." }, { status: 502 });
  }

  return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
}

async function prepareImagePrompt(
  openai: OpenAI,
  basePrompt: string,
  scene: ChampionshipImageScene,
  references: ReferenceInput[],
) {
  const model = process.env.OPENAI_IMAGE_PROMPT_MODEL ?? "gpt-4o-mini";
  const sceneBlock = JSON.stringify(scene);
  const orderNotes = describeReferenceOrder(scene, references);
  const refLabels = references
    .map(
      (reference, index) =>
        `${index + 1}) ${reference.name}${reference.linkedPlayerName ? ` (linked roster: ${reference.linkedPlayerName})` : ""} — role: ${reference.role}`,
    )
    .join("\n");

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You prepare image prompts for cinematic sports portraits. Return JSON only. Do not add real logos, NBA branding, or celebrity/player likeness instructions. The winner is alone on the podium; any second reference is only for a distant defeated bench reaction—not on the podium.",
        },
        {
          role: "user",
          content: `Create a detailed prompt for an image generator.

Scene (winner vs loser teams are fictional custom squads, colors as hex or names): ${sceneBlock}

Reference photos (in file order for the editor):
${refLabels || "No uploads; invent fictional athletes."}

STRICT layout:
- ${scene.mvpPlayerName} from winning team ${scene.winnerTeamName} only on the podium with trophy and ${scene.winnerTeamColor} custom jerseys.
- Defeated team ${scene.loserTeamName} in ${scene.loserTeamColor} appears only as a distant emotional background (tears, slumped), especially ${scene.loserSpotlightPlayerName} if a second reference is provided—never sharing the podium with the MVP.

${orderNotes}

Base notes from the simulation: ${basePrompt}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "championship_image_prompt",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["prompt"],
            properties: {
              prompt: { type: "string" },
            },
          },
        },
      },
    });
    const parsed = promptSchema.safeParse(JSON.parse(response.output_text));
    return parsed.success ? parsed.data.prompt : fallbackPrompt(basePrompt, scene, references);
  } catch {
    return fallbackPrompt(basePrompt, scene, references);
  }
}

function describeReferenceOrder(scene: ChampionshipImageScene, references: ReferenceInput[]) {
  if (references.length === 0) return "";
  const lines: string[] = ["Image file order for the editor API:"];
  references.forEach((reference, index) => {
    if (reference.role === "podium_mvp") {
      lines.push(
        `Image ${index + 1}: likeness source for ${scene.mvpPlayerName} (${scene.winnerTeamName}) — center podium hero only.`,
      );
    } else {
      lines.push(
        `Image ${index + 1}: likeness source for ${scene.loserSpotlightPlayerName} (${scene.loserTeamName}) — far background, crying/defeated, smaller, not on podium.`,
      );
    }
  });
  return lines.join("\n");
}

function fallbackPrompt(basePrompt: string, scene: ChampionshipImageScene, references: ReferenceInput[]) {
  const podium = references.find((reference) => reference.role === "podium_mvp");
  const bench = references.find((reference) => reference.role === "loser_background");
  const likenessParts: string[] = [];
  if (podium) {
    likenessParts.push(
      `Use the first reference photo to preserve the face of league member ${podium.name} as fictional finals MVP ${scene.mvpPlayerName} for team ${scene.winnerTeamName} in ${scene.winnerTeamColor} custom gear on the podium only.`,
    );
  }
  if (bench) {
    likenessParts.push(
      `If a second reference is present, use it only for ${scene.loserSpotlightPlayerName} on defeated ${scene.loserTeamName} (${scene.loserTeamColor}) in the deep background looking heartbroken with teammates—tears, soft focus, not on the podium.`,
    );
  }
  return [
    basePrompt,
    likenessParts.join(" ") ||
      `Fictional MVP ${scene.mvpPlayerName} and defeated ${scene.loserTeamName} with no real league branding.`,
    "Premium fictional jerseys, confetti, arena lights, no real NBA logos.",
  ].join(" ");
}

async function dataUrlToFile(reference: { name: string; imageDataUrl: string; role: string }) {
  const match = reference.imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  const safeName = `${reference.role}-${reference.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "reference";
  return new File([bytes], `${safeName}.${extensionFor(mime)}`, { type: mime });
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
