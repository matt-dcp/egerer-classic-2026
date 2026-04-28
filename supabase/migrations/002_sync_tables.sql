-- Egerer Classic 2026 — Sync tables for multi-device real-time state
-- These tables use TEXT primary keys to match the app's string-based IDs.
-- Run in the Supabase SQL editor after 001_initial_schema.sql.

------------------------------------------------------------
-- app_scores: the scores table the app actually writes to
-- Uses the same deterministic ID pattern: s-{roundId}-{playerId}-{holeNumber}
------------------------------------------------------------
create table if not exists app_scores (
  id text primary key,
  round_id text not null,
  player_id text not null,
  hole_number int not null check (hole_number between 1 and 18),
  gross_score int not null check (gross_score between 1 and 20),
  updated_at timestamptz default now(),
  unique (round_id, player_id, hole_number)
);

------------------------------------------------------------
-- admin_settings: single row for tournament-wide settings
------------------------------------------------------------
create table if not exists admin_settings (
  id text primary key default 'singleton',
  settings_json jsonb not null default '{}',
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- teams
------------------------------------------------------------
create table if not exists teams (
  id text primary key,
  tournament_id text not null,
  name text not null,
  captain_id text not null,
  player_ids jsonb not null default '[]',
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- stroke_play_matchups
------------------------------------------------------------
create table if not exists stroke_play_matchups (
  id text primary key,
  round_id text not null,
  team_a_player_id text not null,
  team_b_player_id text not null,
  match_order int not null default 1,
  is_pressure_bet boolean not null default false,
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- best_ball_pairings
------------------------------------------------------------
create table if not exists best_ball_pairings (
  id text primary key,
  round_id text not null,
  team_a_player_ids jsonb not null default '[]',
  team_b_player_ids jsonb not null default '[]',
  pairing_order int not null default 1,
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- foursomes
------------------------------------------------------------
create table if not exists foursomes (
  id text primary key,
  round_id text not null,
  player_ids jsonb not null default '[]',
  updated_at timestamptz default now()
);

------------------------------------------------------------
-- Enable realtime on all sync tables
------------------------------------------------------------
alter publication supabase_realtime add table app_scores;
alter publication supabase_realtime add table admin_settings;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table stroke_play_matchups;
alter publication supabase_realtime add table best_ball_pairings;
alter publication supabase_realtime add table foursomes;

------------------------------------------------------------
-- RLS: permissive policies (private tournament app)
------------------------------------------------------------
alter table app_scores enable row level security;
alter table admin_settings enable row level security;
alter table teams enable row level security;
alter table stroke_play_matchups enable row level security;
alter table best_ball_pairings enable row level security;
alter table foursomes enable row level security;

-- app_scores
create policy "public read" on app_scores for select using (true);
create policy "anon insert" on app_scores for insert with check (true);
create policy "anon update" on app_scores for update using (true);
create policy "anon delete" on app_scores for delete using (true);

-- admin_settings
create policy "public read" on admin_settings for select using (true);
create policy "anon insert" on admin_settings for insert with check (true);
create policy "anon update" on admin_settings for update using (true);
create policy "anon delete" on admin_settings for delete using (true);

-- teams
create policy "public read" on teams for select using (true);
create policy "anon insert" on teams for insert with check (true);
create policy "anon update" on teams for update using (true);
create policy "anon delete" on teams for delete using (true);

-- stroke_play_matchups
create policy "public read" on stroke_play_matchups for select using (true);
create policy "anon insert" on stroke_play_matchups for insert with check (true);
create policy "anon update" on stroke_play_matchups for update using (true);
create policy "anon delete" on stroke_play_matchups for delete using (true);

-- best_ball_pairings
create policy "public read" on best_ball_pairings for select using (true);
create policy "anon insert" on best_ball_pairings for insert with check (true);
create policy "anon update" on best_ball_pairings for update using (true);
create policy "anon delete" on best_ball_pairings for delete using (true);

-- foursomes
create policy "public read" on foursomes for select using (true);
create policy "anon insert" on foursomes for insert with check (true);
create policy "anon update" on foursomes for update using (true);
create policy "anon delete" on foursomes for delete using (true);
