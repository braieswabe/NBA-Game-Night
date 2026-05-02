import { referenceFaceForRosterPlayer } from "@/lib/face-reference-matching";
import type { Game, League } from "@/lib/types";

export type HighlightImageScene = {
  teamName: string;
  playerName: string;
};

export type HighlightImageReferencePayload = {
  name: string;
  linkedPlayerName?: string;
  imageDataUrl: string;
};

export type HighlightImageRequestBody = {
  prompt: string;
  scene: HighlightImageScene;
  references: HighlightImageReferencePayload[];
};

export type BuildHighlightImageBodyResult =
  | { ok: true; body: HighlightImageRequestBody; warning?: string }
  | { ok: false; error: string };

export function buildHighlightImageRequestBody(
  league: League,
  game: Game,
  highlightIndex: number,
): BuildHighlightImageBodyResult {
  const simulation = game.simulation;
  if (!simulation) return { ok: false, error: "Simulation is missing." };
  const highlight = simulation.highlightMoments[highlightIndex];
  if (!highlight) return { ok: false, error: "Highlight moment not found." };

  const teamIndex = league.teams.findIndex((team) => team.name === highlight.team);
  const slotRef = teamIndex >= 0 ? league.faceReferences?.[teamIndex] : undefined;
  const matched = referenceFaceForRosterPlayer(slotRef, highlight.player);

  let warning: string | undefined;
  if (slotRef?.imageDataUrl?.trim() && !matched) {
    warning = `This highlight features ${highlight.player} (${highlight.team}). Link that team's reference face to that roster player (or set "Not set (any roster)") so the upload is used in the image.`;
  }

  const references: HighlightImageReferencePayload[] = matched
    ? [{ name: matched.name, linkedPlayerName: matched.linkedPlayerName, imageDataUrl: matched.imageDataUrl }]
    : [];

  return {
    ok: true,
    body: {
      prompt: highlight.imagePrompt,
      scene: { teamName: highlight.team, playerName: highlight.player },
      references,
    },
    warning,
  };
}
