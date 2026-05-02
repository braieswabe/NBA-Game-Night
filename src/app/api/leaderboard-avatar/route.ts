import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

let client: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const requestSchema = z.object({
  name: z.string().min(1).max(40),
  imageDataUrl: z.string().startsWith("data:image/"),
});

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid avatar reference." }, { status: 400 });
  }

  const image = await dataUrlToFile(parsed.data);
  if (!image) {
    return NextResponse.json({ error: "Unsupported image reference." }, { status: 400 });
  }

  const response = await openai.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    image,
    prompt: `Create one polished cartoon sports-avatar version of ${parsed.data.name} from the uploaded reference photo. Keep recognizable facial features, make it energetic and friendly, wearing a premium fictional basketball warmup jacket, bold arena lighting, transparent-feeling clean background, no real logos, no NBA branding.`,
    size: "1024x1024",
    quality: "medium",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "No avatar image returned." }, { status: 502 });
  }

  return NextResponse.json({ avatarImageUrl: `data:image/png;base64,${b64}` });
}

async function dataUrlToFile(reference: { name: string; imageDataUrl: string }) {
  const match = reference.imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  const safeName = reference.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "reference";
  return new File([bytes], `${safeName}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`, {
    type: mime,
  });
}
