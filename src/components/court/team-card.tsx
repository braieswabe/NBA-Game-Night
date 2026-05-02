import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingBar } from "@/components/ui/progress";
import type { Team } from "@/lib/types";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: team.color }} />
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{team.name}</CardTitle>
          <Badge>{Math.round((team.ratings.offense + team.ratings.defenseOverall) / 2)} OVR</Badge>
        </div>
        <p className="text-sm leading-6 text-zinc-400">{team.identity}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2 text-center text-xs text-zinc-400">
          <RosterSlot label="PG" value={team.pg} />
          <RosterSlot label="SG" value={team.sg} />
          <RosterSlot label="SF" value={team.sf} />
          <RosterSlot label="PF" value={team.pf} />
          <RosterSlot label="C" value={team.c} />
        </div>
        <div className="grid gap-2">
          <Metric label="Offense" value={team.ratings.offense} />
          <Metric label="Defense" value={team.ratings.defenseOverall} />
          <Metric label="Clutch" value={team.ratings.clutch} />
        </div>
      </CardContent>
    </Card>
  );
}

function RosterSlot({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/5 p-2">
      <div className="font-mono text-[10px] text-amber-200">{label}</div>
      <div className="truncate text-zinc-200" title={value}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[76px_1fr_32px] items-center gap-2 text-xs">
      <span className="text-zinc-400">{label}</span>
      <RatingBar value={value} />
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}
