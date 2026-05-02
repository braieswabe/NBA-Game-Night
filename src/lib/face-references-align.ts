import { LEDGER_OWNER_NAMES } from "@/lib/ledger-owners";
import type { FaceReference, Team, TeamInput } from "@/lib/types";

/** Prefer the uploaded reference; fall back to a previously saved AI portrait. */
export function facePortraitDisplayUrl(ref?: Pick<FaceReference, "imageDataUrl" | "avatarImageUrl">): string | undefined {
  const fromRef = ref?.imageDataUrl?.trim();
  if (fromRef) return fromRef;
  const fromAvatar = ref?.avatarImageUrl?.trim();
  return fromAvatar || undefined;
}

export function emptyFaceReferences(): FaceReference[] {
  return LEDGER_OWNER_NAMES.map((name) => ({ id: crypto.randomUUID(), name, imageDataUrl: "" }));
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
