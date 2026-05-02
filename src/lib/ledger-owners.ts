/** Canonical owners for the three-team league (display + leaderboard identity). */
export const LEDGER_OWNER_NAMES = ["BRAIE", "LORENZO", "ALLEN"] as const;
export type LedgerOwnerName = (typeof LEDGER_OWNER_NAMES)[number];

/** Map free-text / legacy names to a ledger slot. */
export function canonicalLedgerName(raw: string): LedgerOwnerName | null {
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;
  if (compact.includes("BRAIE") || compact === "BRAIEBOOK") return "BRAIE";
  if (compact.includes("LORENZO")) return "LORENZO";
  if (compact === "ALLEN" || compact.startsWith("ALLEN")) return "ALLEN";
  return null;
}

export function ledgerNameForTeamSlot(slotIndex: number): LedgerOwnerName {
  return LEDGER_OWNER_NAMES[Math.min(Math.max(slotIndex, 0), LEDGER_OWNER_NAMES.length - 1)]!;
}

export function isLedgerOwnerName(value: string): value is LedgerOwnerName {
  const u = value.trim().toUpperCase();
  return (LEDGER_OWNER_NAMES as readonly string[]).includes(u);
}
