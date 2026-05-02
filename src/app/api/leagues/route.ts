import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabaseUrl, listDatabaseLeagues, saveDatabaseLeague } from "@/lib/database";
import type { League } from "@/lib/types";

const leaguePayloadSchema = z.object({
  league: z.custom<League>((value) => Boolean(value && typeof value === "object" && "id" in value)),
});

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ leagues: [], database: "not_configured" });
  }

  try {
    const leagues = await listDatabaseLeagues();
    return NextResponse.json({ leagues: leagues ?? [], database: "connected" });
  } catch {
    return NextResponse.json({ leagues: [], database: "error" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leaguePayloadSchema.safeParse(body);
  if (!parsed.success) {
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
