-- ============================================================================
-- Keeps — demo seed data (Gerry & Cuz)
-- ============================================================================
-- This can't safely fabricate confirmed Supabase Auth users from raw SQL
-- (that requires GoTrue's own password hashing + identity rows), so it
-- assumes Gerry and Cuz have already signed up for real through /signup —
-- each user gets a `profiles` row automatically at that point.
--
-- To use this:
--   1. Sign up as Gerry, then as Cuz, through the running app.
--   2. Find their two profile ids:
--        select id, display_name from profiles order by created_at;
--   3. Replace :gerry_id and :cuz_id below and run this file
--      (psql -v gerry_id="'<uuid>'" -v cuz_id="'<uuid>'" -f demo-seed.sql,
--      or paste into the Supabase SQL editor with the ids substituted).
-- ============================================================================

do $$
declare
  gerry_id uuid := :gerry_id;
  cuz_id uuid := :cuz_id;
  space_id uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
begin
  insert into spaces (name, invite_code, created_by)
  values ('Gerry & Cuz', 'DEMO01', gerry_id)
  returning id into space_id;

  insert into space_members (space_id, user_id, role) values
    (space_id, gerry_id, 'owner'),
    (space_id, cuz_id, 'member');

  -- Photo memory
  insert into posts (id, space_id, author_id, type, caption, place, category, occurred_at, saved_to_memories)
  values (gen_random_uuid(), space_id, gerry_id, 'photo', 'Sunday football at the usual spot ⚽️', 'Kasarani', 'football', now() - interval '40 days', true)
  returning id into p1;
  insert into post_media (post_id, url, media_type, order_index)
  values (p1, 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800', 'photo', 0);

  -- Song memory
  insert into posts (id, space_id, author_id, type, caption, occurred_at, saved_to_memories)
  values (gen_random_uuid(), space_id, cuz_id, 'song', 'This one''s been on repeat all week', now() - interval '90 days', true)
  returning id into p2;
  insert into post_song_metadata (post_id, title, artist, url)
  values (p2, 'Water', 'Tyla', 'https://open.spotify.com/track/2H7g0hRxYnAywA0PdvIMFq');

  -- Text thought
  insert into posts (id, space_id, author_id, type, caption, occurred_at)
  values (gen_random_uuid(), space_id, gerry_id, 'text', 'Can''t believe we''re actually doing this app thing 😂', now() - interval '2 days')
  returning id into p3;

  -- Activity, milestone-worthy
  insert into posts (id, space_id, author_id, type, caption, place, occurred_at, saved_to_memories)
  values (gen_random_uuid(), space_id, cuz_id, 'activity', 'Road trip to the coast, finally', 'Mombasa', now() - interval '400 days', true)
  returning id into p4;

  -- Favorite
  insert into posts (id, space_id, author_id, type, occurred_at)
  values (gen_random_uuid(), space_id, gerry_id, 'favorite', now() - interval '10 days')
  returning id into p5;
  insert into post_favorite_metadata (post_id, favorite_type, item_name, note)
  values (p5, 'Player', 'Bukayo Saka', 'Been rating him since 2020');

  -- Reactions + a reply
  insert into reactions (post_id, user_id, emoji) values (p1, cuz_id, '🔥'), (p2, gerry_id, '❤️');
  insert into comments (post_id, author_id, body) values (p1, cuz_id, 'we need to run it back this weekend');

  -- A collection
  insert into collections (space_id, name, created_by) values (space_id, 'Football', gerry_id);

  -- Notifications
  insert into notifications (space_id, user_id, type, category, title, body) values
    (space_id, cuz_id, 'new_drop', 'social', 'New Drop', 'Gerry dropped a photo'),
    (space_id, gerry_id, 'reaction', 'social', 'Reacted 🔥', null);

  raise notice 'Seeded space % for gerry=% cuz=%', space_id, gerry_id, cuz_id;
end $$;
