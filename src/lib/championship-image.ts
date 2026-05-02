import { faceReferencesAligned, facePortraitDisplayUrl } from "@/lib/face-references-align";
import { referenceFaceForRosterPlayer } from "@/lib/face-reference-matching";
import { ownerForTeam } from "@/lib/leaderboard";
import type { Game, League, Team } from "@/lib/types";

export type ChampionshipImageScene = {
  winnerTeamName: string;
  winnerTeamColor: string;
  loserTeamName: string;
  loserTeamColor: string;
  mvpPlayerName: string;
  loserSpotlightPlayerName: string;
  /** Full winning roster (PG–C) for the image prompt. */
  winnerRosterPlayers: string[];
  /** Full losing roster for the crying group. */
  loserRosterPlayers: string[];
  /** Same identity keys as the leaderboard (BRAIE / LORENZO / ALLEN by team slot). */
  winnerLedgerOwnerName: string;
  loserLedgerOwnerName: string;
};

function teamRoster(team: Team) {
  return [team.pg, team.sg, team.sf, team.pf, team.c];
}

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
  const alignedRefs = faceReferencesAligned(league.teams, league.faceReferences);
  const winRef = alignedRefs[winIdx];
  const loseRef = alignedRefs[loseIdx];

  const mvpPlayer = simulation.mvp.player;
  let loserPlayer = losingSpotlightPlayer(simulation, loserTeam.name);
  if (!loserPlayer) loserPlayer = loserTeam.sg;

  const podiumRef = referenceFaceForRosterPlayer(winRef, mvpPlayer);
  const backgroundRef = referenceFaceForRosterPlayer(loseRef, loserPlayer);

  const warnings: string[] = [];
  if (facePortraitDisplayUrl(winRef) && !podiumRef) {
    warnings.push(
      `Championship MVP is ${mvpPlayer}. Link team ${winnerTeam.name}'s uploaded face to that roster player (or clear the link) so they can appear on the podium.`,
    );
  }
  if (facePortraitDisplayUrl(loseRef) && !backgroundRef) {
    warnings.push(
      `For the losing bench reaction, link ${loserTeam.name}'s face to ${loserPlayer} (their leading scorer in this game) or clear the link to use your upload in the background.`,
    );
  }

  const winnerRosterPlayers = teamRoster(winnerTeam);
  const loserRosterPlayers = teamRoster(loserTeam);
  const winnerLedgerOwnerName = ownerForTeam(league, winnerTeam) ?? winnerTeam.name;
  const loserLedgerOwnerName = ownerForTeam(league, loserTeam) ?? loserTeam.name;

  const scene: ChampionshipImageScene = {
    winnerTeamName: winnerTeam.name,
    winnerTeamColor: winnerTeam.color,
    loserTeamName: loserTeam.name,
    loserTeamColor: loserTeam.color,
    mvpPlayerName: mvpPlayer,
    loserSpotlightPlayerName: loserPlayer,
    winnerRosterPlayers,
    loserRosterPlayers,
    winnerLedgerOwnerName,
    loserLedgerOwnerName,
  };

  const references: ChampionshipImageReferencePayload[] = [];
  if (podiumRef) {
    const portrait = facePortraitDisplayUrl(podiumRef);
    if (portrait && portrait.startsWith("data:image/")) {
      references.push({
        name: podiumRef.name,
        linkedPlayerName: podiumRef.linkedPlayerName,
        imageDataUrl: portrait,
        role: "podium_mvp",
      });
    }
  }
  if (backgroundRef) {
    const portrait = facePortraitDisplayUrl(backgroundRef);
    if (portrait && portrait.startsWith("data:image/")) {
      references.push({
        name: backgroundRef.name,
        linkedPlayerName: backgroundRef.linkedPlayerName,
        imageDataUrl: portrait,
        role: "loser_background",
      });
    }
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
