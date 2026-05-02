import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { HighlightImageScene } from "@/lib/highlight-image";

let client: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const sceneSchema = z.object({
  teamName: z.string().min(1).max(60),
  playerName: z.string().min(1).max(80),
});

const referenceSchema = z.object({
  name: z.string().min(1).max(40),
  linkedPlayerName: z.string().min(1).max(80).optional(),
  imageDataUrl: z.string().startsWith("data:image/"),
});

const requestSchema = z.object({
  prompt: z.string().min(20).max(4000),
  scene: sceneSchema,
  references: z.array(referenceSchema).max(1),
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
    return NextResponse.json({ error: "Invalid highlight prompt." }, { status: 400 });
  }

  const { prompt, scene, references } = parsed.data;
  const imagePrompt = await prepareImagePrompt(openai, prompt, scene, references);
  const broadcastSuffix =
    " Make it feel like a dramatic broadcast still from a playoff documentary, high contrast, sweat, motion, crowd emotion, no real league logos.";
  const finalPrompt = `${imagePrompt}${broadcastSuffix}`;
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
  const referenceFiles = await Promise.all(references.map(dataUrlToFile));
  const validReferences = referenceFiles.filter((file): file is File => Boolean(file));

  const response =
    validReferences.length > 0
      ? await openai.images.edit({
          model,
          image: validReferences,
          prompt: finalPrompt,
          size: "1536x1024",
          quality: "medium",
        })
      : await openai.images.generate({
          model,
          prompt: finalPrompt,
          size: "1536x1024",
          quality: "medium",
        });

  const image = response.data?.[0];
  const b64 = image?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "No highlight image returned." }, { status: 502 });
  }

  return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
}

async function prepareImagePrompt(openai: OpenAI, basePrompt: string, scene: HighlightImageScene, references: ReferenceInput[]) {
  const model = process.env.OPENAI_IMAGE_PROMPT_MODEL ?? "gpt-4o-mini";
  const sceneBlock = JSON.stringify(scene);
  const refLine =
    references.length > 0
      ? `One reference photo (file order): league member ${references[0]!.name}${references[0]!.linkedPlayerName ? `, linked roster player ${references[0]!.linkedPlayerName}` : ""} — use as the face/likeness for fictional roster player ${scene.playerName} on ${scene.teamName} in the custom team jersey described in the scene.`
      : "No reference uploads; invent a plausible fictional athlete face for the featured player.";

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You prepare image prompts for dramatic basketball broadcast stills. Return JSON only. Do not add real logos, NBA branding, or celebrity likeness instructions beyond mapping uploaded references to the named fictional roster player.",
        },
        {
          role: "user",
          content: `Create a detailed prompt for an image generator.

Scene (featured fictional player and team from the simulation): ${sceneBlock}

${refLine}

The image must show ${scene.playerName} (${scene.teamName}) as the primary subject in their custom team-color jersey (stitched fictional numbers), arena lighting, sweat, motion blur where appropriate—like a TV documentary freeze-frame.

Base notes from the simulation: ${basePrompt}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "highlight_image_prompt",
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

function fallbackPrompt(basePrompt: string, scene: HighlightImageScene, references: ReferenceInput[]) {
  const ref = references[0];
  const likeness = ref
    ? `Use the uploaded reference photo to preserve ${ref.name}'s recognizable facial features on fictional player ${scene.playerName} (${scene.teamName}) wearing the described custom jersey in a broadcast-style sports photograph.`
    : `Depict fictional player ${scene.playerName} for ${scene.teamName} with no specific real-person likeness.`;
  return [
    basePrompt,
    likeness,
    "Dramatic broadcast documentary still: high contrast, crowd emotion, arena depth, no real league or NBA logos.",
  ].join(" ");
}

async function dataUrlToFile(reference: { name: string; imageDataUrl: string }) {
  const match = reference.imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  const safeName = `highlight-${reference.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "reference";
  return new File([bytes], `${safeName}.${extensionFor(mime)}`, { type: mime });
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
