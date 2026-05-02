"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { GamePresentation } from "@/components/court/game-presentation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAndSaveHighlightImage, loadLeaguesWithDatabase } from "@/lib/storage";
import type { Game, League } from "@/lib/types";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<{ league: League; game: Game } | null>(null);
  const [loadedGameId, setLoadedGameId] = useState<string | null>(null);
  const [generatingHighlightIndex, setGeneratingHighlightIndex] = useState<number | null>(null);
  const [highlightNotice, setHighlightNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadLeaguesWithDatabase().then((leagues) => {
      const found = leagues
        .map((league) => ({ league, game: league.games.find((candidate) => candidate.id === params.id) }))
        .find((candidate): candidate is { league: League; game: Game } => Boolean(candidate.game));
      if (!active) return;
      setState(found ?? null);
      setLoadedGameId(params.id);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loadedGameId !== params.id) {
    return (
      <ArenaShell>
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Card>
            <CardHeader>
              <CardTitle>Loading game...</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Finding the saved broadcast before showing the replay.
            </CardContent>
          </Card>
        </div>
      </ArenaShell>
    );
  }

  if (!state) {
    return (
      <ArenaShell>
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Card>
            <CardHeader>
              <CardTitle>Game not found</CardTitle>
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

  const home = state.league.teams.find((team) => team.id === state.game.homeTeamId)!;
  const away = state.league.teams.find((team) => team.id === state.game.awayTeamId)!;
  const currentState = state;

  async function generateHighlight(index: number) {
    setGeneratingHighlightIndex(index);
    setHighlightNotice(null);
    const result = await generateAndSaveHighlightImage(currentState.league, currentState.game, index);
    setGeneratingHighlightIndex(null);
    const nextGame = result.league.games.find((game) => game.id === currentState.game.id) ?? currentState.game;
    setState({ league: result.league, game: nextGame });
    if ("warning" in result && result.warning) setHighlightNotice(result.warning);
  }

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
        <div className="mb-5">
          <Button asChild variant="ghost">
            <Link href={`/league/${state.league.id}`}>
              <ArrowLeft className="h-4 w-4" /> Back to League
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">
              <Home className="h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
        {highlightNotice ? (
          <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">{highlightNotice}</p>
        ) : null}
        <GamePresentation
          game={state.game}
          home={home}
          away={away}
          generatingHighlightIndex={generatingHighlightIndex}
          onGenerateHighlight={generateHighlight}
        />
      </div>
    </ArenaShell>
  );
}
