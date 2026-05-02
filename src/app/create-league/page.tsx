"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { ArenaShell } from "@/components/court/arena-shell";
import { emptyFaceReferences, FaceReferenceFields } from "@/components/court/face-reference-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leagueInputSchema } from "@/lib/schemas";
import { createAndSaveLeague } from "@/lib/storage";
import type { FaceReference, TeamInput } from "@/lib/types";

const presets: TeamInput[] = [
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

export default function CreateLeaguePage() {
  const router = useRouter();
  const [leagueName, setLeagueName] = useState("Court Legends Invitational");
  const [teams, setTeams] = useState<TeamInput[]>(presets);
  const [faceReferences, setFaceReferences] = useState<FaceReference[]>(() => emptyFaceReferences());
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => leagueInputSchema.safeParse({ name: leagueName, teams }), [leagueName, teams]);

  function updateTeam(index: number, field: keyof TeamInput, value: string) {
    setTeams((current) => current.map((team, teamIndex) => (teamIndex === index ? { ...team, [field]: value } : team)));
  }

  function submit() {
    const result = leagueInputSchema.safeParse({ name: leagueName, teams });
    if (!result.success) {
      setError("Fill in every team name, color, and roster slot before starting the league.");
      return;
    }
    const league = createAndSaveLeague(
      result.data.name,
      result.data.teams,
      faceReferences.filter((reference) => reference.name.trim() && reference.imageDataUrl),
    );
    router.push(`/league/${league.id}`);
  }

  return (
    <ArenaShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200">Team Builder</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Create a 3-Team League</h1>
          </div>
          <Button onClick={submit} disabled={!parsed.success} size="lg">
            <PlusCircle className="h-4 w-4" /> Save League
          </Button>
        </header>

        <Card className="mb-5">
          <CardContent className="grid gap-3 p-5 md:grid-cols-[180px_1fr] md:items-center">
            <Label htmlFor="leagueName">League Name</Label>
            <Input id="leagueName" value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
          </CardContent>
        </Card>

        <div className="mb-5">
          <FaceReferenceFields value={faceReferences} onChange={setFaceReferences} teams={teams} />
        </div>

        {error ? <div className="mb-5 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

        <div className="grid gap-5 lg:grid-cols-3">
          {teams.map((team, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: team.color }} />
              <CardHeader>
                <CardTitle>Team {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Team Name" value={team.name} onChange={(value) => updateTeam(index, "name", value)} />
                <div className="grid grid-cols-[1fr_52px] gap-3">
                  <Field label="Team Color" value={team.color} onChange={(value) => updateTeam(index, "color", value)} />
                  <input
                    aria-label={`${team.name} color`}
                    className="mt-6 h-10 w-full rounded-md border border-white/12 bg-black"
                    type="color"
                    value={team.color}
                    onChange={(event) => updateTeam(index, "color", event.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Field label="PG" value={team.pg} onChange={(value) => updateTeam(index, "pg", value)} />
                  <Field label="SG" value={team.sg} onChange={(value) => updateTeam(index, "sg", value)} />
                  <Field label="SF" value={team.sf} onChange={(value) => updateTeam(index, "sf", value)} />
                  <Field label="PF" value={team.pf} onChange={(value) => updateTeam(index, "pf", value)} />
                  <Field label="C" value={team.c} onChange={(value) => updateTeam(index, "c", value)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ArenaShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
