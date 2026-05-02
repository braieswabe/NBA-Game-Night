"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, Loader2, Sparkles, Trophy } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildLeaderboard } from "@/lib/leaderboard";
import { loadLeaguesWithDatabase, updateFaceReferenceAvatar } from "@/lib/storage";
import type { League } from "@/lib/types";

export default function LeaderboardPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const leaderboard = useMemo(() => buildLeaderboard(leagues), [leagues]);
  const top = leaderboard[0];

  async function generateAvatar(name: string, imageDataUrl?: string) {
    if (!imageDataUrl) {
      setError("Upload a face reference in Create League or Finals before generating a leaderboard avatar.");
      return;
    }
    setGenerating(name);
    setError(null);
    try {
      const response = await fetch("/api/leaderboard-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageDataUrl }),
      });
      const payload = (await response.json()) as { avatarImageUrl?: string; error?: string };
      if (!response.ok || !payload.avatarImageUrl) {
        setError(payload.error ?? "Avatar generation failed.");
        return;
      }
      setLeagues(updateFaceReferenceAvatar(leagues, name, payload.avatarImageUrl));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">Championship Table</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Leaderboard</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Championship totals are calculated from every completed finals game fetched from saved browser leagues and the database.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/history">
              <History className="h-4 w-4" /> Past Games
            </Link>
          </Button>
        </header>

        {top ? (
          <Card className="mb-6 overflow-hidden border-amber-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_42%),rgba(10,10,10,0.88)]">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr] md:items-center">
              <AvatarStage name={top.name} src={top.avatarImageUrl} />
              <div>
                <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100">Current Champion Leader</Badge>
                <h2 className="mt-4 text-4xl font-black">{top.name}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  {top.championships} championship{top.championships === 1 ? "" : "s"}, {top.finalsAppearances} finals appearance{top.finalsAppearances === 1 ? "" : "s"}.
                </p>
                {!top.avatarImageUrl ? (
                  <Button className="mt-5" onClick={() => generateAvatar(top.name, top.referenceImageDataUrl)} disabled={generating === top.name}>
                    {generating === top.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Cartoon Avatar Once
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {error ? <div className="mb-5 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</div> : null}

        <div className="grid gap-3">
          {!loaded ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-400">
                Fetching championship history from this browser and the database...
              </CardContent>
            </Card>
          ) : leaderboard.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-400">Complete a finals game to unlock championship standings.</CardContent>
            </Card>
          ) : (
            leaderboard.map((entry, index) => (
              <Card key={entry.name}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[48px_1fr_130px_130px] md:items-center">
                  <div className="font-mono text-2xl text-zinc-500">#{index + 1}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-bold text-white">{entry.name}</p>
                      {index === 0 ? <Badge><Trophy className="mr-1 h-3 w-3" /> Leader</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{entry.teams.join(", ")}</p>
                  </div>
                  <div className="font-mono text-amber-200">{entry.championships} titles</div>
                  <div className="font-mono text-zinc-300">{entry.finalsAppearances} finals</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ArenaShell>
  );
}

function AvatarStage({ name, src }: { name: string; src?: string }) {
  return (
    <div className="relative mx-auto grid h-52 w-52 place-items-center rounded-full border border-amber-300/25 bg-black/40">
      <div className="absolute inset-8 rounded-full bg-amber-200/20 blur-2xl" />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} cartoon leaderboard avatar`}
          className="relative h-40 w-40 animate-[float_3.5s_ease-in-out_infinite] rounded-full object-cover shadow-2xl shadow-amber-900/40"
        />
      ) : (
        <div className="relative grid h-40 w-40 animate-[float_3.5s_ease-in-out_infinite] place-items-center rounded-full border border-white/15 bg-white/5 text-center text-sm text-zinc-400">
          Avatar pending
        </div>
      )}
    </div>
  );
}
