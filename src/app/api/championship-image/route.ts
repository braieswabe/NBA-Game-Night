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
  winnerRosterPlayers: z.array(z.string().min(1)).length(5),
  loserRosterPlayers: z.array(z.string().min(1)).length(5),
  winnerLedgerOwnerName: z.string().min(1).max(40),
  loserLedgerOwnerName: z.string().min(1).max(40),
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
            "You prepare image prompts for cinematic basketball championship stills. Return JSON only. Do not add real NBA or league logos. Reference photos map to the same league-owner identities used on the in-app leaderboard (winnerLedgerOwnerName / loserLedgerOwnerName). The winning user's face (first reference) must appear on the MVP; the entire winning roster of five fictional NBA-style players must share the winner podium celebration; the entire losing roster must appear together as a second group, crying, separate from the podium.",
        },
        {
          role: "user",
          content: `Create a detailed prompt for an image generator.

Scene JSON (includes rosters and leaderboard-linked owner labels): ${sceneBlock}

Winning roster (all five must appear on the winner side with ${scene.winnerTeamName} ${scene.winnerTeamColor} custom jerseys): ${scene.winnerRosterPlayers.join(", ")}.
Losing roster (all five must appear together, crying, in ${scene.loserTeamName} ${scene.loserTeamColor} jerseys, clearly defeated): ${scene.loserRosterPlayers.join(", ")}.

Leaderboard identity linkage (for narration only—no real-person names beyond these labels): champion-side owner slot "${scene.winnerLedgerOwnerName}" matches the MVP reference face; defeated-side owner slot "${scene.loserLedgerOwnerName}" matches the emotional losing-bench reference if provided.

Reference photos (in file order for the editor):
${refLabels || "No uploads; invent fictional athletes."}

STRICT composition:
- Center podium: finals MVP ${scene.mvpPlayerName} (${scene.winnerTeamName}) with trophy, ${scene.winnerTeamColor} gear; use reference #1 for that player's face (league member tied to ${scene.winnerLedgerOwnerName} on the leaderboard).
- Same frame, same winner group: the other four starters ${scene.winnerRosterPlayers.filter((p) => p !== scene.mvpPlayerName).join(", ")} flank or ring the MVP so ALL FIVE ${scene.winnerTeamName} players are visible as one winning unit (fictional faces except the MVP likeness from the reference).
- Losing team ${scene.loserTeamName}: show the FULL roster ${scene.loserRosterPlayers.join(", ")} together off the podium—tears, red eyes, hugging, devastated body language—${scene.loserTeamColor} jerseys. If a second reference exists, use it for ${scene.loserSpotlightPlayerName}'s face in that crying cluster; invent plausible faces for the other four losers.
- Depth: losers mid-ground or tunnel; never standing on the champion podium.

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
        `Image ${index + 1}: likeness for league owner ${scene.winnerLedgerOwnerName} → MVP ${scene.mvpPlayerName} (${scene.winnerTeamName}); rest of winner five are fictional athletes in the same ${scene.winnerTeamColor} uniforms.`,
      );
    } else {
      lines.push(
        `Image ${index + 1}: likeness for league owner ${scene.loserLedgerOwnerName} → ${scene.loserSpotlightPlayerName} in the crying ${scene.loserTeamName} group (${scene.loserTeamColor}); whole losing five visible and emotional, not on podium.`,
      );
    }
  });
  return lines.join("\n");
}

function fallbackPrompt(basePrompt: string, scene: ChampionshipImageScene, references: ReferenceInput[]) {
  const podium = references.find((reference) => reference.role === "podium_mvp");
  const bench = references.find((reference) => reference.role === "loser_background");
  const winnerFive = scene.winnerRosterPlayers.join(", ");
  const loserFive = scene.loserRosterPlayers.join(", ");
  const likenessParts: string[] = [];
  if (podium) {
    likenessParts.push(
      `Use the first reference for league owner ${scene.winnerLedgerOwnerName} (${podium.name}) as the face of MVP ${scene.mvpPlayerName} on ${scene.winnerTeamName}'s podium in ${scene.winnerTeamColor}. Show ALL FIVE winners together: ${winnerFive}, same team celebration, fictional faces for the non-MVP starters.`,
    );
  }
  if (bench) {
    likenessParts.push(
      `Use the second reference for ${scene.loserLedgerOwnerName} (${bench.name}) as ${scene.loserSpotlightPlayerName} within the ENTIRE defeated ${scene.loserTeamName} group (${loserFive}) in ${scene.loserTeamColor}, all crying and emotional off the podium.`,
    );
  }
  return [
    basePrompt,
    likenessParts.join(" ") ||
      `Fictional championship: MVP ${scene.mvpPlayerName} with full winner five (${winnerFive}) vs full losing five (${loserFive}) crying in ${scene.loserTeamColor}, no real league branding.`,
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
