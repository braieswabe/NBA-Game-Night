import { faceReferencesAligned, facePortraitDisplayUrl } from "@/lib/face-references-align";
import {
  canonicalLedgerName,
  isLedgerOwnerName,
  LEDGER_OWNER_NAMES,
  ledgerNameForTeamSlot,
  type LedgerOwnerName,
} from "@/lib/ledger-owners";
import type { FaceReference, Game, League, Team } from "@/lib/types";

export type LeaderboardEntry = {
  name: LedgerOwnerName;
  championships: number;
  finalsAppearances: number;
  teams: string[];
  /** Uploaded reference photo, or legacy AI portrait — no extra step required. */
  portraitUrl?: string;
};

export function completedGames(league: League) {
  return league.games.filter((game) => game.status === "simulated" && game.simulation);
}

export function completedFinals(league: League) {
  return league.games.filter((game) => game.gameType === "finals" && game.status === "simulated");
}

export function teamForGame(league: League, game: Game, teamId: string) {
  return league.teams.find((team) => team.id === teamId);
}

export function ownerForTeam(league: League, team?: Team): LedgerOwnerName | null {
  if (!team) return null;
  const index = league.teams.findIndex((candidate) => candidate.id === team.id);
  if (index < 0) return null;
  const ref = league.faceReferences?.[index];
  const raw = (team.ownerName ?? ref?.name ?? "").trim();
  const canon = canonicalLedgerName(raw);
  if (canon) return canon;
  return ledgerNameForTeamSlot(index);
}

export function faceForOwner(league: League, ownerName: string): FaceReference | undefined {
  const target =
    canonicalLedgerName(ownerName) ??
    (isLedgerOwnerName(ownerName) ? (ownerName.toUpperCase() as LedgerOwnerName) : null);
  if (!target) {
    return league.faceReferences?.find((reference) => reference.name.toLowerCase() === ownerName.toLowerCase());
  }
  const aligned = faceReferencesAligned(league.teams, league.faceReferences);
  return aligned.find(
    (reference, index) => (canonicalLedgerName(reference.name) ?? LEDGER_OWNER_NAMES[index]) === target,
  );
}

function collectLedgerPortrait(leagues: League[], player: LedgerOwnerName): string | undefined {
  let bestScore = -1;
  let portrait: string | undefined;

  for (const league of leagues) {
    const aligned = faceReferencesAligned(league.teams, league.faceReferences);
    aligned.forEach((ref, index) => {
      const slot = canonicalLedgerName(ref.name) ?? LEDGER_OWNER_NAMES[index];
      if (slot !== player) return;
      const url = facePortraitDisplayUrl(ref);
      if (!url) return;
      const score = (ref.imageDataUrl?.trim() ? 4 : 0) + (ref.avatarImageUrl?.trim() ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        portrait = url;
      }
    });
  }
  return portrait;
}

/** Always BRAIE → LORENZO → ALLEN with merged stats and best-known face assets across leagues. */
export function buildLeaderboard(leagues: League[]): LeaderboardEntry[] {
  const tally = new Map<LedgerOwnerName, { championships: number; finalsAppearances: number; teams: Set<string> }>();
  LEDGER_OWNER_NAMES.forEach((id) => tally.set(id, { championships: 0, finalsAppearances: 0, teams: new Set<string>() }));

  leagues.forEach((league) => {
    completedFinals(league).forEach((game) => {
      const winner = game.winnerTeamId ? teamForGame(league, game, game.winnerTeamId) : undefined;
      const home = teamForGame(league, game, game.homeTeamId);
      const away = teamForGame(league, game, game.awayTeamId);

      [home, away].forEach((team) => {
        const owner = ownerForTeam(league, team);
        if (!owner || !team) return;
        const row = tally.get(owner)!;
        row.finalsAppearances += 1;
        if (!row.teams.has(team.name)) row.teams.add(team.name);
      });

      const winnerOwner = ownerForTeam(league, winner);
      if (!winnerOwner) return;
      const entry = tally.get(winnerOwner)!;
      entry.championships += 1;
      if (winner && !entry.teams.has(winner.name)) entry.teams.add(winner.name);
    });
  });

  return LEDGER_OWNER_NAMES.map((id) => {
    const row = tally.get(id)!;
    return {
      name: id,
      championships: row.championships,
      finalsAppearances: row.finalsAppearances,
      teams: [...row.teams],
      portraitUrl: collectLedgerPortrait(leagues, id),
    };
  });
}
