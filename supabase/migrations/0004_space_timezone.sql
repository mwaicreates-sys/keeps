-- Shared daily-run games must key run_date off ONE timezone for the
-- whole space, never per-player -- otherwise two players in different
-- zones (or just past midnight in one of them) could resolve different
-- dates and never land on the same game_runs row. Nullable: falls back
-- to UTC (never a hardcoded region) until TimezoneSync initializes it
-- from whichever member opens the app first.
alter table spaces add column if not exists timezone text;
