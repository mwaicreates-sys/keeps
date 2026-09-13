-- Daily Play run model: one shared question/item set per
-- (space, game_type, local calendar day), with each user's own
-- continuous-answer progress tracked separately from their partner's.
-- Additive only -- game_sessions/game_answers/game_results (and
-- Match Predictions, which stays on that model entirely) are
-- untouched, so existing history keeps working exactly as before.

alter table profiles add column if not exists timezone text;

create table game_runs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  game_type text not null check (game_type in
    ('this_or_that','guess_mine','blind_rank','keep3_drop2','top5')),
  run_date date not null,
  topic text,
  category text,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (space_id, game_type, run_date)
);

create index game_runs_space_idx on game_runs(space_id, game_type, run_date desc);

create table game_run_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references game_runs(id) on delete cascade,
  user_id uuid not null references profiles(id),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (run_id, user_id)
);

create index game_run_answers_run_idx on game_run_answers(run_id);

alter table game_runs enable row level security;
alter table game_run_answers enable row level security;

create policy game_runs_all on game_runs for all
  using (is_space_member(space_id))
  with check (is_space_member(space_id));

create policy game_run_answers_all on game_run_answers for all
  using (exists (select 1 from game_runs r where r.id = game_run_answers.run_id and is_space_member(r.space_id)))
  with check (user_id = auth.uid());
