"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Film, Trophy } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { completedGames } from "@/lib/leaderboard";
import { loadLeaguesWithDatabase } from "@/lib/storage";
import type { League } from "@/lib/types";

export default function HistoryPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadLeaguesWithDatabase().then((nextLeagues) => {
      if (!active) return;
      setLeagues(nextLeagues);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const games = useMemo(
    () =>
      leagues
        .flatMap((league) =>
          completedGames(league).map((game) => ({
            league,
            game,
            home: league.teams.find((team) => team.id === game.homeTeamId),
            away: league.teams.find((team) => team.id === game.awayTeamId),
          })),
        )
        .sort((a, b) => new Date(b.league.updatedAt).getTime() - new Date(a.league.updatedAt).getTime()),
    [leagues],
  );

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">Archive</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Past Games</h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
          </Button>
        </header>

        <div className="grid gap-4">
          {!loaded ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-400">
                Fetching saved games from this browser and the database...
              </CardContent>
            </Card>
          ) : games.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-400">No completed broadcasts yet.</CardContent>
            </Card>
          ) : (
            games.map(({ league, game, home, away }) => (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{game.gameType === "finals" ? "Finals" : "Round Robin"}</Badge>
                    <Badge>{league.name}</Badge>
                  </div>
                  <CardTitle>{away?.name} at {home?.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Clock className="h-4 w-4 text-amber-200" />
                    <span>{game.simulation?.finalResult.revealText}</span>
                  </div>
                  <Button asChild>
                    <Link href={game.gameType === "finals" ? `/finals/${game.id}` : `/game/${game.id}`}>
                      <Film className="h-4 w-4" /> Replay
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ArenaShell>
  );
}
