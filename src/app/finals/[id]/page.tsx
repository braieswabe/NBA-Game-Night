"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Home, ImageIcon, Loader2 } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { FaceReferenceFields, faceReferencesAligned } from "@/components/court/face-reference-fields";
import { GamePresentation } from "@/components/court/game-presentation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateAndSaveChampionshipImage,
  generateAndSaveHighlightImage,
  loadLeaguesWithDatabase,
  updateLeagueFaceReferences,
} from "@/lib/storage";
import type { Game, League } from "@/lib/types";

export default function FinalsPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<{ league: League; game: Game } | null>(null);
  const [loadedFinalsId, setLoadedFinalsId] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [championshipWarnings, setChampionshipWarnings] = useState<string[]>([]);
  const [generatingHighlightIndex, setGeneratingHighlightIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void loadLeaguesWithDatabase().then((leagues) => {
      const found = leagues
        .map((league) => ({ league, game: league.games.find((candidate) => candidate.id === params.id) }))
        .find((candidate): candidate is { league: League; game: Game } => Boolean(candidate.game));
      if (!active) return;
      setState(found ?? null);
      setLoadedFinalsId(params.id);
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function generateImage() {
    if (!state) return;
    setLoadingImage(true);
    setImageError(null);
    setChampionshipWarnings([]);
    const result = await generateAndSaveChampionshipImage(state.league, state.game);
    setLoadingImage(false);
    setChampionshipWarnings(result.warnings ?? []);
    if (result.error) setImageError(result.error);
    else setImageError(null);
    const nextGame = result.league.games.find((game) => game.id === state.game.id) ?? state.game;
    setState({ league: result.league, game: nextGame });
  }

  async function generateHighlight(index: number) {
    if (!state) return;
    setGeneratingHighlightIndex(index);
    const result = await generateAndSaveHighlightImage(state.league, state.game, index);
    setGeneratingHighlightIndex(null);
    const nextGame = result.league.games.find((game) => game.id === state.game.id) ?? state.game;
    setState({ league: result.league, game: nextGame });
  }

  if (loadedFinalsId !== params.id) {
    return (
      <ArenaShell>
        <div className="mx-auto max-w-3xl px-5 py-20">
          <Card>
            <CardHeader>
              <CardTitle>Loading finals...</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Looking up the championship broadcast and saved images.
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
              <CardTitle>Finals game not found</CardTitle>
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
  const faceReferences = faceReferencesAligned(currentState.league.teams, currentState.league.faceReferences);
  const uploadedFaceCount = faceReferences.filter((reference) => reference.imageDataUrl).length;

  function saveFaceReferences(nextReferences: typeof faceReferences) {
    const nextLeague = updateLeagueFaceReferences(currentState.league, nextReferences);
    setState({
      league: nextLeague,
      game: nextLeague.games.find((game) => game.id === currentState.game.id) ?? currentState.game,
    });
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
        <GamePresentation
          game={state.game}
          home={home}
          away={away}
          championship
          generatingHighlightIndex={generatingHighlightIndex}
          onGenerateHighlight={generateHighlight}
        >
          <FaceReferenceFields value={faceReferences} onChange={saveFaceReferences} teams={currentState.league.teams} compact />
          <div className="rounded-lg border border-white/10 bg-black/35 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Championship Image</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Only the finals MVP ({state.game.simulation?.mvp.player ?? "MVP"}) uses a face on the podium with winning{" "}
                  {state.league.teams.find((t) => t.id === state.game.winnerTeamId)?.name ?? "team"} jerseys. The runner-up
                  squad can appear as a distant emotional background from the losing team&apos;s linked photo—not on the
                  podium. {uploadedFaceCount} photo{uploadedFaceCount === 1 ? "" : "s"} uploaded across teams.
                </p>
              </div>
              <Button onClick={generateImage} disabled={loadingImage || Boolean(state.game.celebrationImageUrl)}>
                {loadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {state.game.celebrationImageUrl ? "Image Generated" : "Generate Championship Image"}
              </Button>
            </div>
            {imageError ? <p className="mt-3 text-sm text-amber-100">{imageError}</p> : null}
            {championshipWarnings.length > 0 ? (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-400">
                {championshipWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {state.game.celebrationImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.game.celebrationImageUrl}
                alt="Fictional basketball championship celebration"
                className="mt-5 aspect-[3/2] w-full rounded-lg object-cover"
              />
            ) : null}
          </div>
        </GamePresentation>
      </div>
    </ArenaShell>
  );
}
