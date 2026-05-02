import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseLeague, hasDatabaseUrl, saveDatabaseLeague } from "@/lib/database";
import type { League } from "@/lib/types";

const leaguePayloadSchema = z.object({
  league: z.custom<League>((value) => Boolean(value && typeof value === "object" && "id" in value)),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ league: null, database: "not_configured" });
  }

  try {
    const league = await getDatabaseLeague(id);
    return NextResponse.json({ league, database: "connected" });
  } catch {
    return NextResponse.json({ league: null, database: "error" }, { status: 503 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = leaguePayloadSchema.safeParse(body);
  if (!parsed.success || parsed.data.league.id !== id) {
    return NextResponse.json({ error: "Invalid league payload." }, { status: 400 });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ league: parsed.data.league, database: "not_configured" });
  }

  try {
    const league = await saveDatabaseLeague(parsed.data.league);
    return NextResponse.json({ league, database: "connected" });
  } catch {
    return NextResponse.json({ error: "Could not save league." }, { status: 503 });
  }
}
