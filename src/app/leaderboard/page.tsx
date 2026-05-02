"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, Trophy } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildLeaderboard } from "@/lib/leaderboard";
import { LEDGER_OWNER_NAMES, type LedgerOwnerName } from "@/lib/ledger-owners";
import { loadLeaguesWithDatabase } from "@/lib/storage";
import type { League } from "@/lib/types";

export default function LeaderboardPage() {
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

  const leaderboard = useMemo(() => buildLeaderboard(leagues), [leagues]);
  const spotlight = useMemo(() => {
    const slot = (n: string) => LEDGER_OWNER_NAMES.indexOf(n as LedgerOwnerName);
    const sorted = [...leaderboard].sort(
      (a, b) =>
        b.championships - a.championships ||
        b.finalsAppearances - a.finalsAppearances ||
        slot(a.name) - slot(b.name),
    );
    return sorted[0];
  }, [leaderboard]);

  const hasAnyFinals = useMemo(
    () => leaderboard.some((row) => row.championships > 0 || row.finalsAppearances > 0),
    [leaderboard],
  );

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">Championship Table</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Leaderboard</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              BRAIE, LORENZO, and ALLEN always appear here. Portraits are the face photos you upload in Create League or Finals—saved with your league everywhere, no extra step.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/history">
              <History className="h-4 w-4" /> Past Games
            </Link>
          </Button>
        </header>

        {spotlight ? (
          <Card className="mb-6 overflow-hidden border-amber-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_42%),rgba(10,10,10,0.88)]">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr] md:items-center">
              <AvatarStage name={spotlight.name} src={spotlight.portraitUrl} />
              <div>
                <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100">Spotlight</Badge>
                <h2 className="mt-4 text-4xl font-black">{spotlight.name}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  {spotlight.championships} championship{spotlight.championships === 1 ? "" : "s"},{" "}
                  {spotlight.finalsAppearances} finals appearance{spotlight.finalsAppearances === 1 ? "" : "s"}.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3">
          {!loaded ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-400">
                Fetching championship history from this browser and the database...
              </CardContent>
            </Card>
          ) : (
            leaderboard.map((entry) => (
              <Card key={entry.name}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[56px_1fr_130px_130px] md:items-center">
                  <RowAvatar src={entry.portraitUrl} label={entry.name} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-bold text-white">{entry.name}</p>
                      {spotlight && entry.name === spotlight.name && hasAnyFinals ? (
                        <Badge>
                          <Trophy className="mr-1 h-3 w-3" /> Leader
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{entry.teams.length ? entry.teams.join(", ") : "—"}</p>
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

function RowAvatar({ src, label }: { src?: string; label: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-center text-[10px] font-bold leading-tight text-zinc-500">{label.slice(0, 3)}</span>
      )}
    </div>
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
          alt={`${name} face`}
          className="relative h-40 w-40 animate-[float_3.5s_ease-in-out_infinite] rounded-full object-cover shadow-2xl shadow-amber-900/40"
        />
      ) : (
        <div className="relative grid h-40 w-40 animate-[float_3.5s_ease-in-out_infinite] place-items-center rounded-full border border-white/15 bg-white/5 px-4 text-center text-sm text-zinc-400">
          Upload a face in Create League or Finals for {name}
        </div>
      )}
    </div>
  );
}
