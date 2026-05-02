import OpenAI from "openai";
import { NextResponse } from "next/server";
import { simulationSchema } from "@/lib/schemas";

let client: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const simulationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "gameTitle",
    "gameType",
    "preGameStory",
    "matchupFocus",
    "quarters",
    "halftimeReport",
    "fourthQuarter",
    "finalTwoMinutes",
    "finalPossession",
    "highlightMoments",
    "topPerformers",
    "finalResult",
    "mvp",
    "imagePrompts",
  ],
  properties: {
    gameTitle: { type: "string" },
    gameType: { type: "string", enum: ["round_robin", "finals"] },
    preGameStory: { type: "string" },
    matchupFocus: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    quarters: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quarter", "story", "momentumTeam"],
        properties: {
          quarter: { type: "number" },
          story: { type: "string" },
          momentumTeam: { type: "string" },
        },
      },
    },
    halftimeReport: { type: "string" },
    fourthQuarter: { type: "string" },
    finalTwoMinutes: { type: "string" },
    finalPossession: { type: "string" },
    highlightMoments: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "quarter", "player", "team", "description", "imagePrompt"],
        properties: {
          title: { type: "string" },
          quarter: { type: "number" },
          player: { type: "string" },
          team: { type: "string" },
          description: { type: "string" },
          imagePrompt: { type: "string" },
        },
      },
    },
    topPerformers: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["team", "player", "points", "rebounds", "assists", "steals", "blocks"],
        properties: {
          team: { type: "string" },
          player: { type: "string" },
          points: { type: "number" },
          rebounds: { type: "number" },
          assists: { type: "number" },
          steals: { type: "number" },
          blocks: { type: "number" },
        },
      },
    },
    finalResult: {
      type: "object",
      additionalProperties: false,
      required: ["winner", "loser", "winnerScore", "loserScore", "revealText"],
      properties: {
        winner: { type: "string" },
        loser: { type: "string" },
        winnerScore: { type: "number" },
        loserScore: { type: "number" },
        revealText: { type: "string" },
      },
    },
    mvp: {
      type: "object",
      additionalProperties: false,
      required: ["player", "team", "reason"],
      properties: {
        player: { type: "string" },
        team: { type: "string" },
        reason: { type: "string" },
      },
    },
    imagePrompts: {
      type: "object",
      additionalProperties: false,
      required: ["gamePoster", "clutchMoment", "championshipCelebration"],
      properties: {
        gamePoster: { type: "string" },
        clutchMoment: { type: "string" },
        championshipCelebration: { type: "string" },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const baseSimulation = body?.baseSimulation;
  const parsedBase = simulationSchema.safeParse(baseSimulation);
  if (!parsedBase.success) {
    return NextResponse.json({ error: "Invalid base simulation." }, { status: 400 });
  }

  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-mini";
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are the narration engine for a cinematic basketball fantasy simulator. Return valid JSON only. Preserve the finalResult winner, loser, and scores exactly as provided.",
      },
      {
        role: "user",
        content: `Rewrite and enrich this simulation as a realistic NBA broadcast documentary while keeping every finalResult field unchanged. Do not reveal winner, final score, or MVP in fields before finalResult. Keep stats plausible and consistent.\n\n${JSON.stringify(parsedBase.data)}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "court_legends_simulation",
        strict: true,
        schema: simulationJsonSchema,
      },
    },
  });

  const output = response.output_text;
  const parsed = simulationSchema.safeParse(JSON.parse(output));
  if (!parsed.success) {
    return NextResponse.json({ error: "Model returned invalid simulation." }, { status: 502 });
  }

  return NextResponse.json({ simulation: parsed.data });
}
