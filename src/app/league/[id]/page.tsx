"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Film, Home, Play, Trophy } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { TeamCard } from "@/components/court/team-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRecord } from "@/lib/utils";
import { getLeague, getLeagueWithDatabase, simulateAndSaveGame } from "@/lib/storage";
import type { Game, League } from "@/lib/types";

export default function LeaguePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [loadedLeagueId, setLoadedLeagueId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = getLeague(params.id);
    if (cached) {
      setLeague(cached);
      setLoadedLeagueId(params.id);
    }
    void getLeagueWithDatabase(params.id).then((nextLeague) => {
      if (!active) return;
      if (nextLeague) setLeague(nextLeague);
      setLoadedLeagueId(params.id);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  const nextGame = useMemo(() => league?.games.find((game) => game.status === "pending") ?? null, [league]);
  const finalsGame = league?.games.find((game) => game.gameType === "finals") ?? null;

  async function simulateNext() {
    if (!league || !nextGame) return;
    setSimulating(true);
    const nextLeague = await simulateAndSaveGame(league, nextGame);
    const simulated = nextLeague.games.find((game) => game.id === nextGame.id);
    setLeague(nextLeague);
    setSimulating(false);
    if (simulated?.gameType === "finals") router.push(`/finals/${simulated.id}`);
    else if (simulated) router.push(`/game/${simulated.id}`);
  }

  if (loadedLeagueId !== params.id) {
    return (
      <ArenaShell>
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Card>
            <CardHeader>
              <CardTitle>Loading league...</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Checking this browser and the database for the tournament.
            </CardContent>
          </Card>
        </div>
      </ArenaShell>
    );
  }

  if (!league) {
    return (
      <ArenaShell>
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Card>
            <CardHeader>
              <CardTitle>League not found</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">
                  <Home className="h-4 w-4" /> Home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/create-league">Create League</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ArenaShell>
    );
  }

  const championGame = league.games.find((game) => game.gameType === "finals" && game.status === "simulated");
  const champion = championGame?.winnerTeamId
    ? league.teams.find((team) => team.id === championGame.winnerTeamId)
    : null;

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">League Dashboard</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">{league.name}</h1>
          </div>
          {nextGame ? (
            <Button onClick={simulateNext} disabled={simulating} size="lg">
              {finalsGame && nextGame.gameType === "finals" ? <Trophy className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {simulating ? "Writing broadcast story…" : "Simulate Next Game"}
            </Button>
          ) : championGame ? (
            <Button asChild size="lg">
              <Link href={`/finals/${championGame.id}`}>
                <Trophy className="h-4 w-4" /> Tournament Complete
              </Link>
            </Button>
          ) : (
            <Button disabled size="lg">
              <Trophy className="h-4 w-4" /> Tournament Complete
            </Button>
          )}
        </header>

        <div className="mb-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/">
              <Home className="h-4 w-4" /> Home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/history">Past Games</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
        </div>

        {champion && championGame ? (
          <Card className="mb-6 border-amber-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.2),transparent_40%),rgba(10,10,10,0.86)]">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100">Tournament Complete</Badge>
                <Badge>{league.games.filter((game) => game.status === "simulated").length} games played</Badge>
              </div>
              <CardTitle className="text-3xl">{champion.name} owns the league trophy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <p className="text-sm leading-7 text-zinc-300">
                The round-robin table is locked, the finals tape is complete, and the championship broadcast is ready to replay from the opening tunnel shot to the final confetti frame.
              </p>
              <Button asChild>
                <Link href={`/finals/${championGame.id}`}>
                  <Trophy className="h-4 w-4" /> Watch Finals
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-3">
          {league.teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {league.standings.map((standing, index) => {
                  const team = league.teams.find((candidate) => candidate.id === standing.teamId)!;
                  return (
                    <div key={standing.teamId} className="grid grid-cols-[32px_1fr_64px_64px] items-center gap-3 rounded-md bg-white/5 p-3 text-sm">
                      <span className="font-mono text-zinc-500">{index + 1}</span>
                      <span className="font-semibold text-white">{team.name}</span>
                      <span className="font-mono text-zinc-300">{formatRecord(standing.wins, standing.losses)}</span>
                      <span className="font-mono text-amber-200">{standing.pointDifferential > 0 ? "+" : ""}{standing.pointDifferential}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {league.games.map((game) => (
                <ScheduleRow key={game.id} league={league} game={game} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ArenaShell>
  );
}

function ScheduleRow({ league, game }: { league: League; game: Game }) {
  const home = league.teams.find((team) => team.id === game.homeTeamId)!;
  const away = league.teams.find((team) => team.id === game.awayTeamId)!;
  const href = game.gameType === "finals" ? `/finals/${game.id}` : `/game/${game.id}`;

  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{game.gameType === "finals" ? "Finals" : "Round Robin"}</Badge>
          <span className="font-semibold text-white">{away.name} at {home.name}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {game.status === "simulated" && game.finalScoreHome != null && game.finalScoreAway != null
            ? "Broadcast complete"
            : "Awaiting simulation"}
        </p>
      </div>
      {game.status === "simulated" ? (
        <Button asChild variant="secondary">
          <Link href={href}>
            <Film className="h-4 w-4" /> Watch
          </Link>
        </Button>
      ) : (
        <Badge>Pending</Badge>
      )}
    </div>
  );
}
