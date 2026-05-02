import { neon } from "@neondatabase/serverless";
import type { League } from "@/lib/types";

type SqlClient = ReturnType<typeof neon>;

let sqlClient: SqlClient | null = null;
let initialized = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  sqlClient ??= neon(databaseUrl);
  return sqlClient;
}

async function ensureSchema(sql: SqlClient) {
  if (initialized) return;
  await sql`
    create table if not exists court_legends_leagues (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
  initialized = true;
}

export async function listDatabaseLeagues() {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = (await sql`
    select data
    from court_legends_leagues
    order by updated_at desc
  `) as { data: League }[];
  return rows.map((row) => row.data);
}

export async function getDatabaseLeague(id: string) {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = (await sql`
    select data
    from court_legends_leagues
    where id = ${id}
    limit 1
  `) as { data: League }[];
  return rows[0]?.data ?? null;
}

export async function saveDatabaseLeague(league: League) {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  await sql`
    insert into court_legends_leagues (id, data, updated_at)
    values (${league.id}, ${JSON.stringify(league)}::jsonb, now())
    on conflict (id) do update
      set data = excluded.data,
          updated_at = now()
  `;
  return league;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}
