-- Egerer Classic 2026 — Database Schema

-- Tournaments
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  start_date date,
  end_date date,
  admin_pin text not null,
  created_at timestamptz default now()
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tee_name text,
  slope int not null,
  rating numeric(4,1) not null,
  total_par int not null
);

-- Holes
create table holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 5),
  stroke_index int not null check (stroke_index between 1 and 18),
  yardage int,
  unique (course_id, hole_number)
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  handicap_index numeric(3,1) not null,
  photo_url text
);

-- Rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  course_id uuid not null references courses(id),
  round_number int not null check (round_number in (1, 2)),
  date date not null,
  unique (tournament_id, round_number)
);

-- Scores
create table scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  gross_score int not null check (gross_score between 1 and 20),
  updated_at timestamptz default now(),
  unique (round_id, player_id, hole_number)
);

-- Champions
create table champions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  year int not null,
  player_name text not null
);

-- Enable realtime on scores table for live leaderboard
alter publication supabase_realtime add table scores;

-- RLS: allow anonymous read access to everything, write only to scores
alter table tournaments enable row level security;
alter table courses enable row level security;
alter table holes enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table scores enable row level security;
alter table champions enable row level security;

-- Read policies (public)
create policy "public read" on tournaments for select using (true);
create policy "public read" on courses for select using (true);
create policy "public read" on holes for select using (true);
create policy "public read" on players for select using (true);
create policy "public read" on rounds for select using (true);
create policy "public read" on scores for select using (true);
create policy "public read" on champions for select using (true);

-- Write policy for scores (allow anonymous inserts/updates via anon key)
create policy "anon insert scores" on scores for insert with check (true);
create policy "anon update scores" on scores for update using (true);
