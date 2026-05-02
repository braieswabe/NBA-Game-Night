import type { FaceReference, Game, League, Team } from "@/lib/types";

export type LeaderboardEntry = {
  name: string;
  championships: number;
  finalsAppearances: number;
  teams: string[];
  avatarImageUrl?: string;
  referenceImageDataUrl?: string;
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

export function ownerForTeam(league: League, team?: Team) {
  if (!team) return null;
  if (team.ownerName) return team.ownerName;
  const index = league.teams.findIndex((candidate) => candidate.id === team.id);
  return league.faceReferences?.[index]?.name ?? team.name;
}

export function faceForOwner(league: League, ownerName: string): FaceReference | undefined {
  return league.faceReferences?.find((reference) => reference.name.toLowerCase() === ownerName.toLowerCase());
}

export function buildLeaderboard(leagues: League[]): LeaderboardEntry[] {
  const entries = new Map<string, LeaderboardEntry>();

  leagues.forEach((league) => {
    completedFinals(league).forEach((game) => {
      const winner = game.winnerTeamId ? teamForGame(league, game, game.winnerTeamId) : undefined;
      const home = teamForGame(league, game, game.homeTeamId);
      const away = teamForGame(league, game, game.awayTeamId);

      [home, away].forEach((team) => {
        const owner = ownerForTeam(league, team);
        if (!owner || !team) return;
        const face = faceForOwner(league, owner);
        const entry = getEntry(entries, owner, face);
        entry.finalsAppearances += 1;
        if (!entry.teams.includes(team.name)) entry.teams.push(team.name);
      });

      const winnerOwner = ownerForTeam(league, winner);
      if (!winnerOwner) return;
      const face = faceForOwner(league, winnerOwner);
      const entry = getEntry(entries, winnerOwner, face);
      entry.championships += 1;
      if (winner && !entry.teams.includes(winner.name)) entry.teams.push(winner.name);
    });
  });

  return [...entries.values()].sort(
    (a, b) => b.championships - a.championships || b.finalsAppearances - a.finalsAppearances || a.name.localeCompare(b.name),
  );
}

function getEntry(entries: Map<string, LeaderboardEntry>, name: string, face?: FaceReference) {
  const key = name.toLowerCase();
  const existing = entries.get(key);
  if (existing) {
    existing.avatarImageUrl ||= face?.avatarImageUrl;
    existing.referenceImageDataUrl ||= face?.imageDataUrl;
    return existing;
  }

  const entry: LeaderboardEntry = {
    name,
    championships: 0,
    finalsAppearances: 0,
    teams: [],
    avatarImageUrl: face?.avatarImageUrl,
    referenceImageDataUrl: face?.imageDataUrl,
  };
  entries.set(key, entry);
  return entry;
}
