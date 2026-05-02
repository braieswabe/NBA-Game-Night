-- Court Legends — normalized schema for Neon (PostgreSQL)
-- Run once in the Neon SQL editor (or psql) against your database.
-- Replaces the legacy single-row JSON blob table.

BEGIN;

-- Legacy blob store (remove if you are migrating a fresh project)
DROP TABLE IF EXISTS court_legends_leagues CASCADE;

CREATE TABLE court_leagues (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE court_teams (
  id text PRIMARY KEY,
  league_id text NOT NULL REFERENCES court_leagues (id) ON DELETE CASCADE,
  sort_order smallint NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  identity text NOT NULL DEFAULT '',
  owner_name text,
  pg text NOT NULL,
  sg text NOT NULL,
  sf text NOT NULL,
  pf text NOT NULL,
  c text NOT NULL,
  ratings jsonb NOT NULL,
  UNIQUE (league_id, sort_order)
);

CREATE INDEX court_teams_league_id_idx ON court_teams (league_id);

CREATE TABLE court_standings (
  league_id text NOT NULL REFERENCES court_leagues (id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES court_teams (id) ON DELETE CASCADE,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  point_differential integer NOT NULL DEFAULT 0,
  PRIMARY KEY (league_id, team_id)
);

CREATE INDEX court_standings_league_id_idx ON court_standings (league_id);

CREATE TABLE court_games (
  id text PRIMARY KEY,
  league_id text NOT NULL REFERENCES court_leagues (id) ON DELETE CASCADE,
  home_team_id text NOT NULL REFERENCES court_teams (id) ON DELETE CASCADE,
  away_team_id text NOT NULL REFERENCES court_teams (id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('round_robin', 'finals')),
  status text NOT NULL CHECK (status IN ('pending', 'simulated')),
  winner_team_id text REFERENCES court_teams (id) ON DELETE SET NULL,
  final_score_home integer,
  final_score_away integer,
  celebration_image_url text,
  simulation jsonb,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX court_games_league_id_idx ON court_games (league_id);
CREATE INDEX court_games_league_sort_idx ON court_games (league_id, sort_order);

CREATE TABLE court_face_references (
  id text PRIMARY KEY,
  league_id text NOT NULL REFERENCES court_leagues (id) ON DELETE CASCADE,
  slot_index smallint NOT NULL,
  display_name text NOT NULL,
  linked_player_name text,
  image_data_url text NOT NULL DEFAULT '',
  avatar_image_url text,
  UNIQUE (league_id, slot_index)
);

CREATE INDEX court_face_references_league_id_idx ON court_face_references (league_id);

-- Fast league directory for sync / list (small payload)
CREATE INDEX court_leagues_updated_at_idx ON court_leagues (updated_at DESC);

COMMIT;
