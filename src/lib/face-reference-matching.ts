import type { FaceReference } from "@/lib/types";

export function normalizePlayerName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * If `linkedPlayerName` is set, the photo is only used when it matches the roster player we need for that shot.
 * If unset (legacy leagues), any uploaded image for that team slot may be used.
 */
export function referenceFaceForRosterPlayer(
  ref: FaceReference | undefined,
  rosterPlayer: string,
): FaceReference | undefined {
  if (!ref?.imageDataUrl?.trim()) return undefined;
  const link = ref.linkedPlayerName?.trim();
  if (!link) return ref;
  return normalizePlayerName(link) === normalizePlayerName(rosterPlayer) ? ref : undefined;
}
