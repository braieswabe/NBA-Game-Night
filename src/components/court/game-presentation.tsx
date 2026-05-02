"use client";

import { motion } from "framer-motion";
import { ImageIcon, Loader2, Trophy, Tv, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Game, Team } from "@/lib/types";

export function GamePresentation({
  game,
  home,
  away,
  championship = false,
  generatingHighlightIndex,
  onGenerateHighlight,
  children,
}: {
  game: Game;
  home: Team;
  away: Team;
  championship?: boolean;
  generatingHighlightIndex?: number | null;
  onGenerateHighlight?: (index: number) => void;
  children?: React.ReactNode;
}) {
  const simulation = game.simulation;
  if (!simulation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game not simulated</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">Return to the league dashboard and simulate this matchup.</CardContent>
      </Card>
    );
  }

  const sections = [
    { label: "Pre-game", title: "The Broadcast Opens", body: simulation.preGameStory, icon: Tv },
    {
      label: "Matchup",
      title: "Matchup Focus",
      body: simulation.matchupFocus.join(" "),
      icon: Zap,
    },
    ...simulation.quarters.map((quarter) => ({
      label: `Q${quarter.quarter}`,
      title: `Quarter ${quarter.quarter}`,
      body: quarter.story,
      icon: Tv,
      meta: quarter.momentumTeam,
    })),
    { label: "Half", title: "Halftime Report", body: simulation.halftimeReport, icon: Tv },
    { label: "Q4", title: "Fourth Quarter", body: simulation.fourthQuarter, icon: Zap },
    { label: "2:00", title: "Final Two Minutes", body: simulation.finalTwoMinutes, icon: Zap },
    { label: "Last Play", title: "Final Possession", body: simulation.finalPossession, icon: Trophy },
  ];
  const highlightMoments = simulation.highlightMoments ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-black/55">
        <div className="grid min-h-[300px] items-end bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_22%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,0.18),transparent_26%),linear-gradient(130deg,rgba(255,255,255,0.08),transparent_40%)] p-6 md:p-8">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge>{championship ? "Championship Broadcast" : "Round Robin Broadcast"}</Badge>
              <Badge className="font-mono">{simulation.gameTitle}</Badge>
            </div>
            <h1 className="text-4xl font-black leading-none text-white md:text-6xl">
              {away.name}
              <span className="mx-3 text-amber-300">vs</span>
              {home.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              The score stays off-screen until the story earns its reveal.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <BroadcastTeam team={away} label="Away" />
        <BroadcastTeam team={home} label="Home" />
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.section
              key={`${section.label}-${index}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.03, 0.18) }}
            >
              <Card className="bg-zinc-950/80">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <Badge className="mb-3">{section.label}</Badge>
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                  <Icon className="h-5 w-5 text-amber-300" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-zinc-300">{section.body}</p>
                  {"meta" in section && section.meta ? (
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">Momentum: {section.meta}</p>
                  ) : null}
                </CardContent>
              </Card>
            </motion.section>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <Badge>Box Score</Badge>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="py-3">Player</th>
                  <th>Team</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                  <th>STL</th>
                  <th>BLK</th>
                </tr>
              </thead>
              <tbody>
                {simulation.topPerformers.map((performer) => (
                  <tr key={`${performer.team}-${performer.player}`} className="border-b border-white/5">
                    <td className="py-3 font-medium text-white">{performer.player}</td>
                    <td className="text-zinc-400">{performer.team}</td>
                    <td className="font-mono text-amber-200">{performer.points}</td>
                    <td className="font-mono">{performer.rebounds}</td>
                    <td className="font-mono">{performer.assists}</td>
                    <td className="font-mono">{performer.steals}</td>
                    <td className="font-mono">{performer.blocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge>Highlight Reel</Badge>
          <CardTitle>Broadcast Moments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {highlightMoments.map((moment, index) => (
            <div key={`${moment.title}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
              {moment.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={moment.imageUrl} alt={moment.title} className="aspect-[3/2] w-full object-cover" />
              ) : (
                <div className="grid aspect-[3/2] place-items-center bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_42%),rgba(255,255,255,0.04)] p-6 text-center text-sm text-zinc-400">
                  Highlight image pending
                </div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Q{moment.quarter}</Badge>
                  <Badge>{moment.team}</Badge>
                </div>
                <h3 className="text-lg font-bold text-white">{moment.title}</h3>
                <p className="text-sm leading-6 text-zinc-300">{moment.description}</p>
                {onGenerateHighlight && !moment.imageUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onGenerateHighlight(index)}
                    disabled={generatingHighlightIndex === index}
                  >
                    {generatingHighlightIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    Generate Highlight
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-amber-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.2),transparent_42%),rgba(10,10,10,0.92)]">
          <CardHeader>
            <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100">Final Result</Badge>
            <CardTitle className="text-3xl">{simulation.finalResult.revealText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <ScorePlate label="Winner" team={simulation.finalResult.winner} score={simulation.finalResult.winnerScore} />
              <ScorePlate label="Runner-up" team={simulation.finalResult.loser} score={simulation.finalResult.loserScore} />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">MVP</p>
              <p className="mt-2 text-xl font-bold text-white">{simulation.mvp.player}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{simulation.mvp.reason}</p>
            </div>
            {children}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}

function BroadcastTeam({ team, label }: { team: Team; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Badge>{label}</Badge>
        <span className="h-3 w-10 rounded-full" style={{ backgroundColor: team.color }} />
      </div>
      <h2 className="text-2xl font-bold">{team.name}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{team.identity}</p>
    </div>
  );
}

function ScorePlate({ label, team, score }: { label: string; team: string; score: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-xl font-semibold text-white">{team}</p>
        <p className="font-mono text-4xl font-black text-amber-200">{score}</p>
      </div>
    </div>
  );
}
