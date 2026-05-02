"use client";

import { buildChampionshipImageRequest } from "@/lib/championship-image";
import { buildHighlightImageRequestBody } from "@/lib/highlight-image";
import { applySimulatedGame, createLeague, lockSimulationResult, simulateGame } from "@/lib/simulation";
import type { FaceReference, Game, League, Simulation, TeamInput } from "@/lib/types";

const STORAGE_KEY = "court-legends-leagues";

export function loadLeagues(): League[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    return JSON.parse(value) as League[];
  } catch {
    return [];
  }
}

export async function loadLeaguesWithDatabase(): Promise<League[]> {
  const local = loadLeagues();
  try {
    const response = await fetch("/api/leagues");
    if (!response.ok) return local;
    const payload = (await response.json()) as { leagues?: League[]; database?: string };
    const remote = payload.leagues ?? [];
    const merged = mergeLeagues(local, remote);
    saveLeagues(merged);
    if (payload.database === "connected") {
      void syncLocalLeaguesToDatabase(local, remote);
    }
    return merged;
  } catch {
    return local;
  }
}

export async function getLeagueWithDatabase(leagueId: string): Promise<League | undefined> {
  const local = getLeague(leagueId);
  try {
    const response = await fetch(`/api/leagues/${leagueId}`);
    if (!response.ok) return local;
    const payload = (await response.json()) as { league?: League | null };
    if (!payload.league) return local;
    saveLeague(payload.league);
    return payload.league;
  } catch {
    return local;
  }
}

export function saveLeagues(leagues: League[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leagues));
}

export function getLeague(leagueId: string) {
  return loadLeagues().find((league) => league.id === leagueId);
}

export function saveLeague(league: League) {
  const leagues = loadLeagues();
  const next = leagues.some((candidate) => candidate.id === league.id)
    ? leagues.map((candidate) => (candidate.id === league.id ? league : candidate))
    : [league, ...leagues];
  saveLeagues(next);
  void persistLeagueToDatabase(league);
}

export function createAndSaveLeague(name: string, teams: TeamInput[], faceReferences: FaceReference[] = []) {
  const league = createLeague(name, teams, faceReferences);
  saveLeague(league);
  return league;
}

export function updateLeagueFaceReferences(league: League, faceReferences: FaceReference[]) {
  const nextLeague = { ...league, faceReferences, updatedAt: new Date().toISOString() };
  saveLeague(nextLeague);
  return nextLeague;
}

export function updateFaceReferenceAvatar(leagues: League[], referenceName: string, avatarImageUrl: string) {
  const nextLeagues = leagues.map((league) => ({
    ...league,
    faceReferences: league.faceReferences?.map((reference) =>
      reference.name.toLowerCase() === referenceName.toLowerCase()
        ? { ...reference, avatarImageUrl }
        : reference,
    ),
    updatedAt: new Date().toISOString(),
  }));
  saveLeagues(nextLeagues);
  nextLeagues.forEach((league) => void persistLeagueToDatabase(league));
  return nextLeagues;
}

export function mergeLeagues(local: League[], remote: League[]) {
  const byId = new Map<string, League>();
  [...local, ...remote].forEach((league) => {
    const existing = byId.get(league.id);
    if (!existing || new Date(league.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      byId.set(league.id, league);
    }
  });
  return [...byId.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function syncLocalLeaguesToDatabase(local: League[], remote: League[]) {
  const remoteById = new Map(remote.map((league) => [league.id, league]));
  const leaguesToSync = local.filter((league) => {
    const remoteLeague = remoteById.get(league.id);
    return !remoteLeague || new Date(league.updatedAt).getTime() > new Date(remoteLeague.updatedAt).getTime();
  });

  await Promise.allSettled(leaguesToSync.map(persistLeagueToDatabase));
}

export async function simulateAndSaveGame(league: League, game: Game) {
  const baseGame = simulateGame(league, game);
  const nextLeague = applySimulatedGame(league, baseGame);
  saveLeague(nextLeague);
  void enrichSimulationInBackground(nextLeague.id, baseGame);
  return nextLeague;
}

async function enrichSimulationInBackground(leagueId: string, baseGame: Game) {
  if (!baseGame.simulation) return;
  const currentLeague = getLeague(leagueId);
  if (!currentLeague) return;
  const enrichedSimulation = await requestAiSimulation(currentLeague, baseGame, baseGame.simulation);
  if (!enrichedSimulation) return;

  const latestLeague = getLeague(leagueId);
  if (!latestLeague) return;
  const latestGame = latestLeague.games.find((game) => game.id === baseGame.id);
  if (!latestGame?.simulation) return;

  const enrichedGame = {
    ...latestGame,
    simulation: lockSimulationResult(latestGame.simulation, enrichedSimulation),
  };
  const nextLeague = {
    ...latestLeague,
    games: latestLeague.games.map((game) => (game.id === enrichedGame.id ? enrichedGame : game)),
    updatedAt: new Date().toISOString(),
  };
  saveLeague(nextLeague);
}

async function requestAiSimulation(league: League, game: Game, baseSimulation?: Simulation) {
  if (!baseSimulation) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ league, game, baseSimulation }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { simulation?: unknown };
    return payload.simulation ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generateAndSaveChampionshipImage(league: League, game: Game) {
  const built = buildChampionshipImageRequest(league, game);
  if (!built.ok) {
    return { league, imageUrl: null, error: built.error, warnings: [] as string[] };
  }

  try {
    const response = await fetch("/api/championship-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return {
        league,
        imageUrl: null,
        error: payload?.error ?? "Image generation is unavailable.",
        warnings: built.warnings,
      };
    }
    const payload = (await response.json()) as { imageUrl?: string };
    if (!payload.imageUrl) {
      return { league, imageUrl: null, error: "No image was returned.", warnings: built.warnings };
    }

    const games = league.games.map((candidate) =>
      candidate.id === game.id ? { ...candidate, celebrationImageUrl: payload.imageUrl } : candidate,
    );
    const nextLeague = { ...league, games, updatedAt: new Date().toISOString() };
    saveLeague(nextLeague);
    return { league: nextLeague, imageUrl: payload.imageUrl, error: null, warnings: built.warnings };
  } catch {
    return { league, imageUrl: null, error: "Image generation request failed.", warnings: built.warnings };
  }
}

export async function generateAndSaveHighlightImage(league: League, game: Game, highlightIndex: number) {
  const built = buildHighlightImageRequestBody(league, game, highlightIndex);
  if (!built.ok) {
    return { league, imageUrl: null, error: built.error, warning: undefined };
  }

  try {
    const response = await fetch("/api/highlight-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return {
        league,
        imageUrl: null,
        error: payload?.error ?? "Highlight image generation is unavailable.",
        warning: built.warning,
      };
    }
    const payload = (await response.json()) as { imageUrl?: string };
    if (!payload.imageUrl) {
      return { league, imageUrl: null, error: "No highlight image was returned.", warning: built.warning };
    }

    const games = league.games.map((candidate) => {
      if (candidate.id !== game.id || !candidate.simulation) return candidate;
      return {
        ...candidate,
        simulation: {
          ...candidate.simulation,
          highlightMoments: candidate.simulation.highlightMoments.map((moment, index) =>
            index === highlightIndex ? { ...moment, imageUrl: payload.imageUrl } : moment,
          ),
        },
      };
    });
    const nextLeague = { ...league, games, updatedAt: new Date().toISOString() };
    saveLeague(nextLeague);
    return { league: nextLeague, imageUrl: payload.imageUrl, error: null, warning: built.warning };
  } catch {
    return { league, imageUrl: null, error: "Highlight image request failed.", warning: built.warning };
  }
}

async function persistLeagueToDatabase(league: League) {
  try {
    await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league }),
    });
  } catch {
    // Local storage is the offline fallback.
  }
}
