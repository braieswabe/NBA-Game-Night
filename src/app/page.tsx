import Link from "next/link";
import { ArrowRight, Film, Shield, Trophy } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <ArenaShell>
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-8 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">
            AI Simulation League
          </p>
          <h1 className="text-5xl font-black leading-none text-white md:text-7xl">
            Court Legends
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Draft three fantasy squads, simulate a round-robin, and watch every matchup unfold like a playoff documentary before the championship reveal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/create-league">
                Create League <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/history">Past Games</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-black/50 p-5 shadow-2xl shadow-black/40">
          <div className="absolute inset-x-8 top-8 h-28 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="relative grid h-full min-h-[380px] place-items-center rounded-md border border-amber-200/20 bg-[linear-gradient(90deg,transparent_49%,rgba(250,204,21,0.3)_50%,transparent_51%),radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.22),transparent_18%),linear-gradient(180deg,rgba(113,63,18,0.35),rgba(24,24,27,0.7))]">
            <div className="h-48 w-48 rounded-full border-2 border-amber-200/40" />
            <div className="absolute left-8 top-10 h-24 w-24 rounded-full border border-white/20" />
            <div className="absolute bottom-10 right-8 h-24 w-24 rounded-full border border-white/20" />
            <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
              <Feature icon={Film} title="Broadcast" />
              <Feature icon={Shield} title="Matchups" />
              <Feature icon={Trophy} title="Finals" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-12 md:grid-cols-3 md:px-8">
        {[
          "Create three five-player teams with custom colors and identities.",
          "Simulate a full round-robin with standings and point differential.",
          "Reveal the champion at the bottom after the full cinematic game story.",
        ].map((text) => (
          <Card key={text}>
            <CardContent className="p-5 text-sm leading-7 text-zinc-300">{text}</CardContent>
          </Card>
        ))}
      </section>
    </ArenaShell>
  );
}

function Feature({ icon: Icon, title }: { icon: typeof Film; title: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/50 p-3 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-amber-200" />
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">{title}</div>
    </div>
  );
}
