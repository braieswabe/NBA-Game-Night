import { neon } from "@neondatabase/serverless";
import type { FaceReference, Game, League, LeagueSummary, Standing, Team, TeamRatings } from "@/lib/types";

type SqlClient = ReturnType<typeof neon>;

let sqlClient: SqlClient | null = null;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  sqlClient ??= neon(databaseUrl);
  return sqlClient;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function isoTimestamp(value: string | Date | null | undefined): string {
  if (value == null) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/** Lightweight directory for sync (no roster / games / images). */
export async function listLeagueSummaries(): Promise<LeagueSummary[] | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT id, name, updated_at
    FROM court_leagues
    ORDER BY updated_at DESC
  `) as { id: string; name: string; updated_at: string | Date }[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: isoTimestamp(row.updated_at),
  }));
}

type JsonRecord = Record<string, unknown>;

function parseTeamJson(raw: JsonRecord): Team {
  const ratings = raw.ratings as TeamRatings;
  return {
    id: String(raw.id),
    name: String(raw.name),
    color: String(raw.color),
    pg: String(raw.pg),
    sg: String(raw.sg),
    sf: String(raw.sf),
    pf: String(raw.pf),
    c: String(raw.c),
    ownerName: raw.owner_name != null && raw.owner_name !== "" ? String(raw.owner_name) : undefined,
    identity: String(raw.identity ?? ""),
    ratings,
  };
}

function parseStandingJson(raw: JsonRecord): Standing {
  return {
    teamId: String(raw.team_id),
    wins: Number(raw.wins),
    losses: Number(raw.losses),
    pointsFor: Number(raw.points_for),
    pointsAgainst: Number(raw.points_against),
    pointDifferential: Number(raw.point_differential),
  };
}

function parseGameJson(raw: JsonRecord): Game {
  const simulation = raw.simulation;
  return {
    id: String(raw.id),
    leagueId: String(raw.league_id),
    homeTeamId: String(raw.home_team_id),
    awayTeamId: String(raw.away_team_id),
    gameType: raw.game_type as Game["gameType"],
    status: raw.status as Game["status"],
    winnerTeamId: raw.winner_team_id != null ? String(raw.winner_team_id) : undefined,
    finalScoreHome: raw.final_score_home != null ? Number(raw.final_score_home) : undefined,
    finalScoreAway: raw.final_score_away != null ? Number(raw.final_score_away) : undefined,
    celebrationImageUrl:
      raw.celebration_image_url != null && raw.celebration_image_url !== ""
        ? String(raw.celebration_image_url)
        : undefined,
    simulation: simulation && typeof simulation === "object" ? (simulation as Game["simulation"]) : undefined,
  };
}

function parseFaceJson(raw: JsonRecord): FaceReference {
  return {
    id: String(raw.id),
    name: String(raw.display_name),
    linkedPlayerName:
      raw.linked_player_name != null && raw.linked_player_name !== ""
        ? String(raw.linked_player_name)
        : undefined,
    imageDataUrl: String(raw.image_data_url ?? ""),
    avatarImageUrl:
      raw.avatar_image_url != null && raw.avatar_image_url !== "" ? String(raw.avatar_image_url) : undefined,
  };
}

function parseJsonbArray(value: unknown, parse: (row: JsonRecord) => unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parse(item as JsonRecord));
}

/** One round-trip: league + nested aggregates (normalized storage, assembled League). */
export async function getDatabaseLeague(id: string): Promise<League | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    SELECT
      l.id,
      l.name,
      l.created_at,
      l.updated_at,
      (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order), '[]'::jsonb)
        FROM court_teams t
        WHERE t.league_id = l.id
      ) AS teams,
      (
        SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
        FROM court_standings s
        WHERE s.league_id = l.id
      ) AS standings,
      (
        SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.sort_order), '[]'::jsonb)
        FROM court_games g
        WHERE g.league_id = l.id
      ) AS games,
      (
        SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.slot_index), '[]'::jsonb)
        FROM court_face_references f
        WHERE f.league_id = l.id
      ) AS face_references
    FROM court_leagues l
    WHERE l.id = ${id}
    LIMIT 1
  `) as {
    id: string;
    name: string;
    created_at: string | Date;
    updated_at: string | Date;
    teams: unknown;
    standings: unknown;
    games: unknown;
    face_references: unknown;
  }[];

  const row = rows[0];
  if (!row) return null;

  const teams = parseJsonbArray(row.teams, parseTeamJson) as Team[];
  const standings = parseJsonbArray(row.standings, parseStandingJson) as Standing[];
  const games = parseJsonbArray(row.games, parseGameJson) as Game[];
  const faceReferences = parseJsonbArray(row.face_references, parseFaceJson) as FaceReference[];

  return {
    id: row.id,
    name: row.name,
    teams,
    games,
    standings,
    faceReferences: faceReferences.length > 0 ? faceReferences : undefined,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
}

export async function saveDatabaseLeague(league: League): Promise<League | null> {
  const sql = getSql();
  if (!sql) return null;

  const createdAt = isoTimestamp(league.createdAt);
  const updatedAt = isoTimestamp(league.updatedAt);

  const queries = [
    sql`
      INSERT INTO court_leagues (id, name, created_at, updated_at)
      VALUES (${league.id}, ${league.name}, ${createdAt}::timestamptz, ${updatedAt}::timestamptz)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
    `,
    sql`DELETE FROM court_games WHERE league_id = ${league.id}`,
    sql`DELETE FROM court_standings WHERE league_id = ${league.id}`,
    sql`DELETE FROM court_face_references WHERE league_id = ${league.id}`,
    sql`DELETE FROM court_teams WHERE league_id = ${league.id}`,
  ];

  for (const [index, team] of league.teams.entries()) {
    queries.push(sql`
      INSERT INTO court_teams (
        id, league_id, sort_order, name, color, identity, owner_name,
        pg, sg, sf, pf, c, ratings
      )
      VALUES (
        ${team.id},
        ${league.id},
        ${index},
        ${team.name},
        ${team.color},
        ${team.identity},
        ${team.ownerName ?? null},
        ${team.pg},
        ${team.sg},
        ${team.sf},
        ${team.pf},
        ${team.c},
        ${JSON.stringify(team.ratings)}::jsonb
      )
    `);
  }

  for (const standing of league.standings) {
    queries.push(sql`
      INSERT INTO court_standings (
        league_id, team_id, wins, losses, points_for, points_against, point_differential
      )
      VALUES (
        ${league.id},
        ${standing.teamId},
        ${standing.wins},
        ${standing.losses},
        ${standing.pointsFor},
        ${standing.pointsAgainst},
        ${standing.pointDifferential}
      )
    `);
  }

  for (const [sortOrder, game] of league.games.entries()) {
    const simulationJson = game.simulation ? JSON.stringify(game.simulation) : null;
    queries.push(sql`
      INSERT INTO court_games (
        id, league_id, home_team_id, away_team_id, game_type, status,
        winner_team_id, final_score_home, final_score_away,
        celebration_image_url, simulation, sort_order
      )
      VALUES (
        ${game.id},
        ${league.id},
        ${game.homeTeamId},
        ${game.awayTeamId},
        ${game.gameType},
        ${game.status},
        ${game.winnerTeamId ?? null},
        ${game.finalScoreHome ?? null},
        ${game.finalScoreAway ?? null},
        ${game.celebrationImageUrl ?? null},
        ${simulationJson}::jsonb,
        ${sortOrder}
      )
    `);
  }

  const faceSlots = league.teams.length;
  for (let slot = 0; slot < faceSlots; slot += 1) {
    const ref = league.faceReferences?.[slot];
    const refId = ref?.id ?? `${league.id}_face_${slot}`;
    const displayName = ref?.name ?? "";
    const linked = ref?.linkedPlayerName ?? null;
    const imageData = ref?.imageDataUrl ?? "";
    const avatar = ref?.avatarImageUrl ?? null;
    queries.push(sql`
      INSERT INTO court_face_references (
        id, league_id, slot_index, display_name, linked_player_name, image_data_url, avatar_image_url
      )
      VALUES (
        ${refId},
        ${league.id},
        ${slot},
        ${displayName},
        ${linked},
        ${imageData},
        ${avatar}
      )
    `);
  }

  await sql.transaction(queries);
  return league;
}
