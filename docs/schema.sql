-- Run in the Supabase SQL Editor (or any PostgreSQL instance) before deploying.
-- Server-only database credentials. No direct browser access to this table.
CREATE TABLE IF NOT EXISTS tower_players (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tower_players_updated_at_idx ON tower_players (updated_at DESC);

-- Defense in depth: anonymous browser clients must NEVER access player JSON
-- through Supabase's auto-generated public API. The Next.js server uses its
-- own private Postgres connection string and remains the sole writer.
ALTER TABLE public.tower_players ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tower_players FROM anon, authenticated;
