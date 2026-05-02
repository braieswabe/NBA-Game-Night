"use client";

import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FaceReference, Team, TeamInput } from "@/lib/types";

const defaultNames = ["Allen", "Lorenzo", "Braie"];

const ROSTER_KEYS = ["pg", "sg", "sf", "pf", "c"] as const;

export function emptyFaceReferences(): FaceReference[] {
  return defaultNames.map((name) => ({ id: crypto.randomUUID(), name, imageDataUrl: "" }));
}

/** One row per league team index so finals and storage always align with `league.teams`. */
export function faceReferencesAligned(teams: Team[] | TeamInput[], stored?: FaceReference[]): FaceReference[] {
  const fallbacks = emptyFaceReferences();
  return teams.map((_, index) => {
    const row = stored?.[index];
    if (row) return row;
    return { id: crypto.randomUUID(), name: fallbacks[index]?.name ?? `Team ${index + 1}`, imageDataUrl: "" };
  });
}

export function FaceReferenceFields({
  value,
  onChange,
  teams,
  compact = false,
}: {
  value: FaceReference[];
  onChange: (references: FaceReference[]) => void;
  /** When set (same order as face slots), each upload is tied to a roster player on that team. */
  teams?: Team[] | TeamInput[];
  compact?: boolean;
}) {
  function update(index: number, patch: Partial<FaceReference>) {
    onChange(value.map((reference, referenceIndex) => (referenceIndex === index ? { ...reference, ...patch } : reference)));
  }

  async function setFile(index: number, file: File | null) {
    if (!file) return;
    const imageDataUrl = await readAsDataUrl(file);
    update(index, { imageDataUrl });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{compact ? "Reference Faces" : "Reference Faces for Championship Jerseys"}</CardTitle>
        <p className="text-sm leading-6 text-zinc-400">
          Each column matches a team in order. Set your display name, choose which roster player your photo is for, then upload. AI broadcast highlight images for each game use the same link so the featured player&apos;s jersey shot matches your face when that roster player is the star of the moment. At the finals, only the championship MVP&apos;s face appears on the podium; the losing team&apos;s photo can appear in a distant emotional background—not on the podium with the winner.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {value.map((reference, index) => (
          <div key={reference.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
            {teams?.[index] ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90">{teams[index].name}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`reference-${reference.id}`}>Your name</Label>
              <Input
                id={`reference-${reference.id}`}
                value={reference.name}
                onChange={(event) => update(index, { name: event.target.value })}
              />
            </div>
            {teams?.[index] ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor={`reference-player-${reference.id}`}>Face is for roster player</Label>
                <select
                  id={`reference-player-${reference.id}`}
                  className="h-10 w-full rounded-md border border-white/12 bg-black/35 px-3 text-sm text-white outline-none transition focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
                  value={reference.linkedPlayerName ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    update(index, { linkedPlayerName: next || undefined });
                  }}
                >
                  <option value="">Not set (any roster)</option>
                  {ROSTER_KEYS.map((key) => (
                    <option key={key} value={teams[index][key]}>
                      {key.toUpperCase()} — {teams[index][key]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="mt-3 grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-white/20 bg-white/5 text-center text-sm text-zinc-400 transition hover:bg-white/10">
              {reference.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reference.imageDataUrl} alt={`${reference.name} reference`} className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 px-3">
                  <ImagePlus className="h-5 w-5 text-amber-200" />
                  Upload face photo
                </span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => setFile(index, event.target.files?.[0] ?? null)}
              />
            </label>
            {reference.imageDataUrl ? (
              <Button className="mt-3 w-full" type="button" variant="secondary" onClick={() => update(index, { imageDataUrl: "" })}>
                <X className="h-4 w-4" /> Remove
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
