import { describe, expect, it } from "vitest";
import { applySimulatedGame, calculateStandings, createLeague, ensureFinalsGame, simulateGame } from "@/lib/simulation";
import type { TeamInput } from "@/lib/types";

const teams: TeamInput[] = [
  {
    name: "ZO",
    color: "#f59e0b",
    pg: "Steve Nash",
    sg: "Kobe Bryant",
    sf: "Larry Bird",
    pf: "Giannis Antetokounmpo",
    c: "Patrick Ewing",
  },
  {
    name: "ALLEN",
    color: "#38bdf8",
    pg: "Magic Johnson",
    sg: "Michael Jordan",
    sf: "Kevin Durant",
    pf: "Tim Duncan",
    c: "Victor Wembanyama",
  },
  {
    name: "DAGGER",
    color: "#f43f5e",
    pg: "Stephen Curry",
    sg: "Shai Gilgeous-Alexander",
    sf: "Kawhi Leonard",
    pf: "Dirk Nowitzki",
    c: "Joel Embiid",
  },
];

describe("Court Legends simulation", () => {
  it("creates three teams and a three-game round-robin schedule", () => {
    const league = createLeague("Court Legends", teams);

    expect(league.teams).toHaveLength(3);
    expect(league.games).toHaveLength(3);
    expect(league.games.every((game) => game.gameType === "round_robin")).toBe(true);
    expect(league.teams[0].ratings.offense).toBeGreaterThan(70);
  });

  it("simulates realistic scores and valid final reveals", () => {
    const league = createLeague("Court Legends", teams);
    const game = simulateGame(league, league.games[0]);

    expect(game.status).toBe("simulated");
    expect(game.finalScoreHome).toBeGreaterThanOrEqual(92);
    expect(game.finalScoreAway).toBeGreaterThanOrEqual(92);
    expect(game.simulation?.finalResult.winnerScore).toBeGreaterThan(game.simulation?.finalResult.loserScore ?? 0);
    expect(game.simulation?.quarters).toHaveLength(4);
  });

  it("uses point differential as the standings tiebreaker", () => {
    const league = createLeague("Court Legends", teams);
    const games = league.games.map((game, index) => ({
      ...game,
      status: "simulated" as const,
      winnerTeamId: index === 0 ? game.homeTeamId : game.awayTeamId,
      finalScoreHome: index === 0 ? 110 : 100,
      finalScoreAway: index === 0 ? 100 : 110,
    }));

    const standings = calculateStandings(league.teams, games);

    expect(standings[0].wins).toBeGreaterThanOrEqual(standings[1].wins);
    if (standings[0].wins === standings[1].wins) {
      expect(standings[0].pointDifferential).toBeGreaterThanOrEqual(standings[1].pointDifferential);
    }
  });

  it("adds a finals game after all round-robin games are complete", () => {
    let league = createLeague("Court Legends", teams);

    for (const pending of [...league.games]) {
      league = applySimulatedGame(league, simulateGame(league, pending));
    }

    const withFinals = ensureFinalsGame(league);

    expect(withFinals.games.filter((game) => game.gameType === "finals")).toHaveLength(1);
  });
});
