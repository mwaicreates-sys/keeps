-- Tighten game_run_answers so a player can't peek at their partner's
-- in-progress (not-yet-completed) answers before finishing their own
-- run -- only their own row, or any row that's already completed
-- (needed once both are done, for the comparison), is selectable.
drop policy if exists game_run_answers_all on game_run_answers;

create policy game_run_answers_select on game_run_answers for select
  using (
    exists (select 1 from game_runs r where r.id = game_run_answers.run_id and is_space_member(r.space_id))
    and (user_id = auth.uid() or completed_at is not null)
  );

create policy game_run_answers_insert on game_run_answers for insert
  with check (
    exists (select 1 from game_runs r where r.id = game_run_answers.run_id and is_space_member(r.space_id))
    and user_id = auth.uid()
  );

create policy game_run_answers_update on game_run_answers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
