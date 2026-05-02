import { referenceFaceForRosterPlayer } from "@/lib/face-reference-matching";
import type { Game, League } from "@/lib/types";

export type ChampionshipImageScene = {
  winnerTeamName: string;
  winnerTeamColor: string;
  loserTeamName: string;
  loserTeamColor: string;
  mvpPlayerName: string;
  loserSpotlightPlayerName: string;
};

export type ChampionshipImageReferencePayload = {
  name: string;
  linkedPlayerName?: string;
  imageDataUrl: string;
  role: "podium_mvp" | "loser_background";
};

export type ChampionshipImageRequestBody = {
  prompt: string;
  scene: ChampionshipImageScene;
  references: ChampionshipImageReferencePayload[];
};

function losingSpotlightPlayer(simulation: NonNullable<Game["simulation"]>, loserTeamName: string): string {
  const loserRows = simulation.topPerformers.filter((row) => row.team === loserTeamName);
  if (loserRows.length === 0) return "";
  return [...loserRows].sort((a, b) => b.points - a.points)[0]!.player;
}

export type BuildChampionshipImageResult =
  | { ok: true; body: ChampionshipImageRequestBody; warnings: string[] }
  | { ok: false; error: string };

export function buildChampionshipImageRequest(league: League, game: Game): BuildChampionshipImageResult {
  const simulation = game.simulation;
  const winnerTeamId = game.winnerTeamId;
  if (!simulation) return { ok: false, error: "The finals simulation is missing." };
  if (!winnerTeamId) return { ok: false, error: "This game does not have a recorded winner yet." };

  const winnerTeam = league.teams.find((team) => team.id === winnerTeamId);
  if (!winnerTeam) return { ok: false, error: "Winner team not found for this league." };

  const loserTeam = league.teams.find(
    (team) => team.id !== winnerTeamId && (team.id === game.homeTeamId || team.id === game.awayTeamId),
  );
  if (!loserTeam) return { ok: false, error: "Opponent team not found for this finals game." };

  const winIdx = league.teams.findIndex((team) => team.id === winnerTeam.id);
  const loseIdx = league.teams.findIndex((team) => team.id === loserTeam.id);
  const refs = league.faceReferences ?? [];
  const winRef = refs[winIdx];
  const loseRef = refs[loseIdx];

  const mvpPlayer = simulation.mvp.player;
  let loserPlayer = losingSpotlightPlayer(simulation, loserTeam.name);
  if (!loserPlayer) loserPlayer = loserTeam.sg;

  const podiumRef = referenceFaceForRosterPlayer(winRef, mvpPlayer);
  const backgroundRef = referenceFaceForRosterPlayer(loseRef, loserPlayer);

  const warnings: string[] = [];
  if (winRef?.imageDataUrl && !podiumRef) {
    warnings.push(
      `Championship MVP is ${mvpPlayer}. Link team ${winnerTeam.name}'s uploaded face to that roster player (or clear the link) so they can appear on the podium.`,
    );
  }
  if (loseRef?.imageDataUrl && !backgroundRef) {
    warnings.push(
      `For the losing bench reaction, link ${loserTeam.name}'s face to ${loserPlayer} (their leading scorer in this game) or clear the link to use your upload in the background.`,
    );
  }

  const scene: ChampionshipImageScene = {
    winnerTeamName: winnerTeam.name,
    winnerTeamColor: winnerTeam.color,
    loserTeamName: loserTeam.name,
    loserTeamColor: loserTeam.color,
    mvpPlayerName: mvpPlayer,
    loserSpotlightPlayerName: loserPlayer,
  };

  const references: ChampionshipImageReferencePayload[] = [];
  if (podiumRef) {
    references.push({
      name: podiumRef.name,
      linkedPlayerName: podiumRef.linkedPlayerName,
      imageDataUrl: podiumRef.imageDataUrl,
      role: "podium_mvp",
    });
  }
  if (backgroundRef) {
    references.push({
      name: backgroundRef.name,
      linkedPlayerName: backgroundRef.linkedPlayerName,
      imageDataUrl: backgroundRef.imageDataUrl,
      role: "loser_background",
    });
  }

  return {
    ok: true,
    body: {
      prompt: simulation.imagePrompts.championshipCelebration,
      scene,
      references,
    },
    warnings,
  };
}
