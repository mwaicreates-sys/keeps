-- Guards against a shared-run swap making another active participant's
-- already-loaded question set stale: every client that fetches a run
-- carries the version its copy of `questions` matches, and every write
-- that depends on that copy (answer submission) must present it back.
-- A swap bumps the version (compare-and-swap on the old value, so two
-- concurrent swaps can't silently clobber each other); a submission
-- presenting a stale version is rejected rather than silently recorded
-- against content the player never actually saw.
alter table game_runs add column if not exists questions_version integer not null default 1;
