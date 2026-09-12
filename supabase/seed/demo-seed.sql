-- ============================================================================
-- Keeps — demo seed (isolated "Keeps Demo" space)
-- ============================================================================
-- Creates two real, confirmed Supabase Auth accounts (Gerry / Cuz) and one
-- shared space named "Keeps Demo", then populates it with realistic content
-- covering every visual state described in the demo-data brief: stories,
-- a multi-photo collage Drop, a single-photo Drop, a song Drop, a text
-- Drop, an activity/place Drop, a resurfaced "on this day" memory, 12+
-- memories across types/collections/years, and Play sessions in every
-- state (new / waiting / both-answered / completed).
--
-- SAFETY
--   - Everything is scoped to one space (name = 'Keeps Demo'). Real user
--     spaces are never touched: every insert below carries that space's
--     id, and RLS aside, nothing here references any other space.
--   - Idempotent: step 0 deletes any previous "Keeps Demo" space (which
--     cascades away all of its posts/stories/games/etc. per the schema's
--     ON DELETE CASCADE) and the two demo auth accounts, before recreating
--     everything fresh. Safe to run repeatedly.
--   - Demo accounts get a fresh random password each run (see the final
--     SELECT for it) — never hardcoded here, never committed anywhere.
--
-- USAGE
--   Run this whole file against the project (Supabase SQL editor, the
--   `supabase db execute` CLI, or the Supabase MCP `execute_sql` tool).
--   Read the password from the final SELECT's output immediately — it is
--   not recoverable afterward (only its bcrypt hash is stored).
--
-- RESET (without reseeding)
--   delete from auth.users where email in
--     ('gerry.demo@keepsapp.dev', 'cuz.demo@keepsapp.dev');
--   -- (cascades to profiles; the space itself has no owner left but you
--   -- can also explicitly: delete from public.spaces where name = 'Keeps Demo';)
-- ============================================================================

do $$
declare
  v_password text := encode(gen_random_bytes(9), 'base64');
  v_gerry_id uuid := gen_random_uuid();
  v_cuz_id uuid := gen_random_uuid();
  v_space_id uuid := gen_random_uuid();

  v_p_matchday uuid := gen_random_uuid();
  v_p_walk uuid := gen_random_uuid();
  v_p_song_n95 uuid := gen_random_uuid();
  v_p_text uuid := gen_random_uuid();
  v_p_activity uuid := gen_random_uuid();
  v_p_roadtrip uuid := gen_random_uuid();
  v_p_arsenal uuid := gen_random_uuid();
  v_p_goalvideo uuid := gen_random_uuid();
  v_p_nightdrive uuid := gen_random_uuid();
  v_p_fav_saka uuid := gen_random_uuid();
  v_p_fav_whiplash uuid := gen_random_uuid();
  v_p_funnyss uuid := gen_random_uuid();
  v_p_beachday uuid := gen_random_uuid();
  v_p_milestone uuid := gen_random_uuid();
  v_p_mombasa uuid := gen_random_uuid();

  v_col_football uuid := gen_random_uuid();
  v_col_songs uuid := gen_random_uuid();
  v_col_funny uuid := gen_random_uuid();
  v_col_random uuid := gen_random_uuid();

  v_tag_football uuid := gen_random_uuid();
  v_tag_kendrick uuid := gen_random_uuid();
  v_tag_funny uuid := gen_random_uuid();
  v_tag_trip uuid := gen_random_uuid();

  v_gs_tot_done uuid := gen_random_uuid();
  v_gs_tot_pending uuid := gen_random_uuid();
  v_gs_top5_done uuid := gen_random_uuid();
  v_gs_top5_pending uuid := gen_random_uuid();
  v_gs_blind_done uuid := gen_random_uuid();
  v_gs_guess_done uuid := gen_random_uuid();
  v_gs_guess_pending uuid := gen_random_uuid();
  v_gs_keep3_done uuid := gen_random_uuid();

  v_fixture_done uuid := gen_random_uuid();
  v_fixture_pending uuid := gen_random_uuid();

  v_top5_list_gerry uuid := gen_random_uuid();
  v_top5_list_cuz uuid := gen_random_uuid();
  v_top5_list_gerry_pending uuid := gen_random_uuid();
begin
  -- 0. Reset any previous demo data
  delete from public.spaces where name = 'Keeps Demo';
  delete from auth.users where email in ('gerry.demo@keepsapp.dev', 'cuz.demo@keepsapp.dev');

  -- 1. Demo auth accounts
  -- NOTE: confirmation_token / recovery_token / email_change* / phone_change* /
  -- reauthentication_token must be explicit empty strings, not NULL — GoTrue
  -- scans these as non-nullable strings and a NULL here causes login to fail
  -- with "Database error querying schema".
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_gerry_id, 'authenticated', 'authenticated',
     'gerry.demo@keepsapp.dev', crypt(v_password, gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false, false,
     '', '', '', '', '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_cuz_id, 'authenticated', 'authenticated',
     'cuz.demo@keepsapp.dev', crypt(v_password, gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false, false,
     '', '', '', '', '', '', '', '');

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
  values
    (gen_random_uuid(), v_gerry_id::text, v_gerry_id, jsonb_build_object('sub', v_gerry_id::text, 'email', 'gerry.demo@keepsapp.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_cuz_id::text, v_cuz_id, jsonb_build_object('sub', v_cuz_id::text, 'email', 'cuz.demo@keepsapp.dev'), 'email', now(), now(), now());

  insert into public.profiles (id, display_name, handle, bio, interests) values
    (v_gerry_id, 'Gerry', 'gerrydemo', 'Building things, football, music, random late-night ideas.', array['Arsenal','Kendrick','Chess','Design']),
    (v_cuz_id, 'Cuz', 'cuzdemo', 'Music, food, and finding any reason to leave the house.', array['Music','Travel','Photography']);

  -- 2. Demo space
  insert into public.spaces (id, name, invite_code, created_by) values (v_space_id, 'Keeps Demo', 'DEMO26', v_gerry_id);
  insert into public.space_members (space_id, user_id, role) values
    (v_space_id, v_gerry_id, 'owner'),
    (v_space_id, v_cuz_id, 'member');

  insert into public.tags (id, space_id, name) values
    (v_tag_football, v_space_id, 'football'),
    (v_tag_kendrick, v_space_id, 'kendrick'),
    (v_tag_funny, v_space_id, 'funny'),
    (v_tag_trip, v_space_id, 'trip');

  insert into public.collections (id, space_id, name, created_by) values
    (v_col_football, v_space_id, 'Football', v_gerry_id),
    (v_col_songs, v_space_id, 'Our Songs', v_cuz_id),
    (v_col_funny, v_space_id, 'Funny Screenshots', v_cuz_id),
    (v_col_random, v_space_id, 'Random Days', v_gerry_id);

  -- 3. Home Drops
  insert into public.posts (id, space_id, author_id, type, caption, category, occurred_at, saved_to_memories, created_at) values
    (v_p_matchday, v_space_id, v_gerry_id, 'photo', 'Still arguing about that second half 😭', 'football', now() - interval '2 days', true, now() - interval '2 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday1/900/1200', 'photo', 0),
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday2/900/1200', 'photo', 1),
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday3/900/1200', 'photo', 2),
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday4/900/1200', 'photo', 3),
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday5/900/1200', 'photo', 4),
    (v_p_matchday, 'https://picsum.photos/seed/keepsmatchday6/900/1200', 'photo', 5);
  insert into public.reactions (post_id, user_id, emoji) values (v_p_matchday, v_cuz_id, '❤️'), (v_p_matchday, v_cuz_id, '😂');
  insert into public.comments (post_id, author_id, body) values (v_p_matchday, v_cuz_id, 'That tackle in the 80th min tho 💀');
  insert into public.saved_items (space_id, user_id, post_id) values (v_space_id, v_cuz_id, v_p_matchday);
  insert into public.collection_items (collection_id, post_id) values (v_col_football, v_p_matchday);
  insert into public.post_tags (post_id, tag_id) values (v_p_matchday, v_tag_football);

  insert into public.posts (id, space_id, author_id, type, caption, occurred_at, created_at) values
    (v_p_walk, v_space_id, v_cuz_id, 'photo', 'just vibes', now() - interval '6 hours', now() - interval '6 hours');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_walk, 'https://picsum.photos/seed/keepswalk1/900/1200', 'photo', 0);

  insert into public.posts (id, space_id, author_id, type, occurred_at, saved_to_memories, created_at) values
    (v_p_song_n95, v_space_id, v_cuz_id, 'song', now() - interval '1 day', true, now() - interval '1 day');
  insert into public.post_song_metadata (post_id, title, artist, album, artwork_url, url, note) values
    (v_p_song_n95, 'N95', 'Kendrick Lamar', 'Mr. Morale & The Big Steppers', 'https://picsum.photos/seed/keepsn95/300/300',
     'https://open.spotify.com/track/1TQR5vTCCoJxma7v9RhBFf', 'This still goes crazy at night.');
  insert into public.reactions (post_id, user_id, emoji) values (v_p_song_n95, v_gerry_id, '🔥');
  insert into public.collection_items (collection_id, post_id) values (v_col_songs, v_p_song_n95);
  insert into public.post_tags (post_id, tag_id) values (v_p_song_n95, v_tag_kendrick);

  insert into public.posts (id, space_id, author_id, type, caption, occurred_at, saved_to_memories, created_at) values
    (v_p_text, v_space_id, v_gerry_id, 'text', 'Some jokes only make sense because you were there.', now() - interval '3 hours', true, now() - interval '3 hours');

  insert into public.posts (id, space_id, author_id, type, caption, place, occurred_at, saved_to_memories, created_at) values
    (v_p_activity, v_space_id, v_cuz_id, 'activity', 'Late food run — 1am and starving, don''t judge.', 'Nairobi', now() - interval '5 hours', true, now() - interval '5 hours');

  -- 4. Additional Memories (types, years, collections)
  insert into public.posts (id, space_id, author_id, type, caption, category, occurred_at, saved_to_memories, created_at) values
    (v_p_roadtrip, v_space_id, v_gerry_id, 'photo', 'Road trip', 'trip', now() - interval '365 days', true, now() - interval '365 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_roadtrip, 'https://picsum.photos/seed/keepsroadtrip/900/1200', 'photo', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_random, v_p_roadtrip);
  insert into public.post_tags (post_id, tag_id) values (v_p_roadtrip, v_tag_trip);

  insert into public.posts (id, space_id, author_id, type, caption, category, occurred_at, saved_to_memories, created_at) values
    (v_p_arsenal, v_space_id, v_gerry_id, 'photo', 'Arsenal game at the Emirates — worth the trip.', 'football', now() - interval '30 days', true, now() - interval '30 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_arsenal, 'https://picsum.photos/seed/keepsarsenal/900/1200', 'photo', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_football, v_p_arsenal);
  insert into public.post_tags (post_id, tag_id) values (v_p_arsenal, v_tag_football);

  insert into public.posts (id, space_id, author_id, type, caption, occurred_at, saved_to_memories, created_at) values
    (v_p_beachday, v_space_id, v_cuz_id, 'photo', 'Beach day energy.', now() - interval '90 days', true, now() - interval '90 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_beachday, 'https://picsum.photos/seed/keepsbeach/900/1200', 'photo', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_random, v_p_beachday);

  insert into public.posts (id, space_id, author_id, type, caption, category, occurred_at, saved_to_memories, created_at) values
    (v_p_goalvideo, v_space_id, v_gerry_id, 'video', 'That goal, one more time.', 'football', now() - interval '40 days', true, now() - interval '40 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_goalvideo, 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'video', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_football, v_p_goalvideo);
  insert into public.post_tags (post_id, tag_id) values (v_p_goalvideo, v_tag_football);

  insert into public.posts (id, space_id, author_id, type, occurred_at, saved_to_memories, created_at) values
    (v_p_nightdrive, v_space_id, v_gerry_id, 'song', now() - interval '60 days', true, now() - interval '60 days');
  insert into public.post_song_metadata (post_id, title, artist, album, artwork_url, url, note) values
    (v_p_nightdrive, 'Night Drive', 'Ta-ku', null, 'https://picsum.photos/seed/keepsnightdrive/300/300',
     'https://music.apple.com/album/night-drive', 'Windows down, no destination.');
  insert into public.collection_items (collection_id, post_id) values (v_col_songs, v_p_nightdrive);

  insert into public.posts (id, space_id, author_id, type, occurred_at, saved_to_memories, created_at) values
    (v_p_fav_saka, v_space_id, v_gerry_id, 'favorite', now() - interval '20 days', true, now() - interval '20 days');
  insert into public.post_favorite_metadata (post_id, favorite_type, item_name, note) values
    (v_p_fav_saka, 'Player', 'Bukayo Saka', 'Been rating him since 2020.');
  insert into public.collection_items (collection_id, post_id) values (v_col_football, v_p_fav_saka);
  insert into public.post_tags (post_id, tag_id) values (v_p_fav_saka, v_tag_football);

  insert into public.posts (id, space_id, author_id, type, occurred_at, saved_to_memories, created_at) values
    (v_p_fav_whiplash, v_space_id, v_cuz_id, 'favorite', now() - interval '50 days', true, now() - interval '50 days');
  insert into public.post_favorite_metadata (post_id, favorite_type, item_name, note) values
    (v_p_fav_whiplash, 'Movie', 'Whiplash', 'Rewatched it again, still not over it.');

  insert into public.posts (id, space_id, author_id, type, caption, category, occurred_at, saved_to_memories, created_at) values
    (v_p_funnyss, v_space_id, v_cuz_id, 'screenshot', 'Found this random funny screenshot from months ago 😂', 'funny', now() - interval '70 days', true, now() - interval '70 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_funnyss, 'https://picsum.photos/seed/keepsfunny/900/1200', 'photo', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_funny, v_p_funnyss);
  insert into public.post_tags (post_id, tag_id) values (v_p_funnyss, v_tag_funny);

  insert into public.posts (id, space_id, author_id, type, caption, occurred_at, saved_to_memories, created_at) values
    (v_p_milestone, v_space_id, v_gerry_id, 'milestone', '6 months of Keeps — since March 2026.', now() - interval '15 days', true, now() - interval '15 days');

  insert into public.posts (id, space_id, author_id, type, caption, place, occurred_at, saved_to_memories, created_at) values
    (v_p_mombasa, v_space_id, v_cuz_id, 'place', 'Long weekend in Mombasa.', 'Mombasa', now() - interval '120 days', true, now() - interval '120 days');
  insert into public.post_media (post_id, url, media_type, order_index) values
    (v_p_mombasa, 'https://picsum.photos/seed/keepsmombasa/900/1200', 'photo', 0);
  insert into public.collection_items (collection_id, post_id) values (v_col_random, v_p_mombasa);
  insert into public.post_tags (post_id, tag_id) values (v_p_mombasa, v_tag_trip);

  -- 5. Stories (24h active)
  insert into public.stories (space_id, author_id, type, media_url, created_at, expires_at) values
    (v_space_id, v_gerry_id, 'photo', 'https://picsum.photos/seed/keepsstory1/800/1400', now() - interval '2 hours', now() + interval '22 hours');
  insert into public.stories (space_id, author_id, type, text_content, created_at, expires_at) values
    (v_space_id, v_gerry_id, 'text', 'Late night thoughts only.', now() - interval '1 hour', now() + interval '23 hours');
  insert into public.stories (space_id, author_id, type, media_url, created_at, expires_at) values
    (v_space_id, v_cuz_id, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', now() - interval '3 hours', now() + interval '21 hours');
  insert into public.stories (space_id, author_id, type, song_title, song_artist, song_artwork_url, created_at, expires_at) values
    (v_space_id, v_cuz_id, 'song', 'N95', 'Kendrick Lamar', 'https://picsum.photos/seed/keepsn95/300/300', now() - interval '30 minutes', now() + interval '23 hours 30 minutes');

  -- 6. Play — every state across all 6 games
  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by, completed_at) values
    (v_gs_tot_done, v_space_id, 'this_or_that', 'Messi or Ronaldo', 'Football', 'completed',
     jsonb_build_object('optionA','Messi','optionB','Ronaldo'), v_gerry_id, now() - interval '1 day');
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_tot_done, v_gerry_id, jsonb_build_object('choice','A')),
    (v_gs_tot_done, v_cuz_id, jsonb_build_object('choice','B'));
  insert into public.game_results (session_id, result) values
    (v_gs_tot_done, jsonb_build_object(v_gerry_id::text, 'A', v_cuz_id::text, 'B', 'matched', false));

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by) values
    (v_gs_tot_pending, v_space_id, 'this_or_that', 'Cinema or Home cinema night', 'Movies', 'ready',
     jsonb_build_object('optionA','Cinema','optionB','Home cinema night'), v_cuz_id);
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_tot_pending, v_cuz_id, jsonb_build_object('choice','A'));

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by, completed_at) values
    (v_gs_top5_done, v_space_id, 'top5', 'Top 5 footballers of all time', 'Football', 'completed',
     jsonb_build_object('topic','Top 5 footballers of all time'), v_gerry_id, now() - interval '5 days');
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_top5_done, v_gerry_id, jsonb_build_object('items', jsonb_build_array('Messi','Ronaldo','Iniesta','Henry','Saka'))),
    (v_gs_top5_done, v_cuz_id, jsonb_build_object('items', jsonb_build_array('Messi','Ronaldo','Mbappe','Henry','Salah')));
  insert into public.game_results (session_id, result) values
    (v_gs_top5_done, jsonb_build_object(
       v_gerry_id::text, jsonb_build_array('Messi','Ronaldo','Iniesta','Henry','Saka'),
       v_cuz_id::text, jsonb_build_array('Messi','Ronaldo','Mbappe','Henry','Salah'),
       'sharedItems', jsonb_build_array('messi','ronaldo','henry'),
       'samePosition', 3,
       'overlapPct', 60));
  insert into public.top5_lists (id, space_id, session_id, user_id, topic, created_at) values
    (v_top5_list_gerry, v_space_id, v_gs_top5_done, v_gerry_id, 'Top 5 footballers of all time', now() - interval '5 days'),
    (v_top5_list_cuz, v_space_id, v_gs_top5_done, v_cuz_id, 'Top 5 footballers of all time', now() - interval '5 days');
  insert into public.top5_items (list_id, rank, item_name) values
    (v_top5_list_gerry, 1, 'Messi'), (v_top5_list_gerry, 2, 'Ronaldo'), (v_top5_list_gerry, 3, 'Iniesta'), (v_top5_list_gerry, 4, 'Henry'), (v_top5_list_gerry, 5, 'Saka'),
    (v_top5_list_cuz, 1, 'Messi'), (v_top5_list_cuz, 2, 'Ronaldo'), (v_top5_list_cuz, 3, 'Mbappe'), (v_top5_list_cuz, 4, 'Henry'), (v_top5_list_cuz, 5, 'Salah');

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by) values
    (v_gs_top5_pending, v_space_id, 'top5', 'Top 5 songs on repeat right now', 'Music', 'ready',
     jsonb_build_object('topic','Top 5 songs on repeat right now'), v_gerry_id);
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_top5_pending, v_gerry_id, jsonb_build_object('items', jsonb_build_array('N95','Not Like Us','Rich Baby Daddy','Die Hard','Euphoria')));
  insert into public.top5_lists (id, space_id, session_id, user_id, topic, created_at) values
    (v_top5_list_gerry_pending, v_space_id, v_gs_top5_pending, v_gerry_id, 'Top 5 songs on repeat right now', now());
  insert into public.top5_items (list_id, rank, item_name) values
    (v_top5_list_gerry_pending, 1, 'N95'), (v_top5_list_gerry_pending, 2, 'Not Like Us'), (v_top5_list_gerry_pending, 3, 'Rich Baby Daddy'),
    (v_top5_list_gerry_pending, 4, 'Die Hard'), (v_top5_list_gerry_pending, 5, 'Euphoria');

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by, completed_at) values
    (v_gs_blind_done, v_space_id, 'blind_rank', 'Rank these eras', 'Music', 'completed',
     jsonb_build_object('items', jsonb_build_array('2000s','2010s','90s','80s','Right now')), v_cuz_id, now() - interval '10 days');
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_blind_done, v_gerry_id, jsonb_build_object('ranking', jsonb_build_object('2000s',1,'2010s',2,'90s',3,'80s',4,'Right now',5))),
    (v_gs_blind_done, v_cuz_id, jsonb_build_object('ranking', jsonb_build_object('2000s',2,'2010s',1,'90s',4,'80s',3,'Right now',5)));
  insert into public.game_results (session_id, result) values
    (v_gs_blind_done, jsonb_build_object(
       v_gerry_id::text, jsonb_build_object('2000s',1,'2010s',2,'90s',3,'80s',4,'Right now',5),
       v_cuz_id::text, jsonb_build_object('2000s',2,'2010s',1,'90s',4,'80s',3,'Right now',5),
       'matches', 1));

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by, completed_at) values
    (v_gs_guess_done, v_space_id, 'guess_mine', 'Late night drive or stay home?', 'Preferences', 'completed',
     jsonb_build_object('question','Late night drive or stay home?','optionA','Late night drive','optionB','Stay home'), v_gerry_id, now() - interval '4 days');
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_guess_done, v_gerry_id, jsonb_build_object('choice','A')),
    (v_gs_guess_done, v_cuz_id, jsonb_build_object('choice','A'));
  insert into public.game_results (session_id, result) values
    (v_gs_guess_done, jsonb_build_object(v_gerry_id::text, 'A', v_cuz_id::text, 'A', 'matched', true));

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by) values
    (v_gs_guess_pending, v_space_id, 'guess_mine', 'Cook at home or order in?', 'Food', 'ready',
     jsonb_build_object('question','Cook at home or order in?','optionA','Cook at home','optionB','Order in'), v_cuz_id);
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_guess_pending, v_cuz_id, jsonb_build_object('choice','B'));

  insert into public.game_sessions (id, space_id, game_type, topic, category, status, prompt, created_by, completed_at) values
    (v_gs_keep3_done, v_space_id, 'keep3_drop2', 'You can only keep 3 genres', 'Movies', 'completed',
     jsonb_build_object('items', jsonb_build_array('Comedy','Action','Romance','Horror','Drama')), v_gerry_id, now() - interval '7 days');
  insert into public.game_answers (session_id, user_id, answer) values
    (v_gs_keep3_done, v_gerry_id, jsonb_build_object('kept', jsonb_build_array('Comedy','Action','Drama'))),
    (v_gs_keep3_done, v_cuz_id, jsonb_build_object('kept', jsonb_build_array('Comedy','Romance','Drama')));
  insert into public.game_results (session_id, result) values
    (v_gs_keep3_done, jsonb_build_object(
       v_gerry_id::text, jsonb_build_array('Comedy','Action','Drama'),
       v_cuz_id::text, jsonb_build_array('Comedy','Romance','Drama'),
       'overlap', jsonb_build_array('Comedy','Drama'),
       'overlapCount', 2));

  insert into public.match_fixtures (id, space_id, home_team, away_team, kickoff_at, source, result, created_by) values
    (v_fixture_done, v_space_id, 'Arsenal', 'Chelsea', now() - interval '3 days', 'manual',
     jsonb_build_object('homeGoals', 2, 'awayGoals', 1), v_gerry_id);
  insert into public.match_predictions (fixture_id, user_id, winner_pick, over_under, btts) values
    (v_fixture_done, v_gerry_id, 'home', 'over', 'yes'),
    (v_fixture_done, v_cuz_id, 'home', 'under', 'no');

  insert into public.match_fixtures (id, space_id, home_team, away_team, kickoff_at, source, created_by) values
    (v_fixture_pending, v_space_id, 'Man City', 'Liverpool', now() + interval '3 days', 'manual', v_cuz_id);
  insert into public.match_predictions (fixture_id, user_id, winner_pick, over_under, btts) values
    (v_fixture_pending, v_gerry_id, 'away', 'over', 'yes');

  -- 7. Notifications (mixed read/unread, both inboxes)
  insert into public.notifications (space_id, user_id, type, category, title, body, data, read_at, created_at) values
    (v_space_id, v_cuz_id, 'new_drop', 'social', 'New Drop', 'Gerry dropped a photo', jsonb_build_object('postId', v_p_matchday), null, now() - interval '2 days'),
    (v_space_id, v_gerry_id, 'reaction', 'social', 'Reacted ❤️', null, jsonb_build_object('postId', v_p_matchday), now() - interval '1 day', now() - interval '2 days' + interval '1 hour'),
    (v_space_id, v_gerry_id, 'reply', 'social', 'New reply', 'That tackle in the 80th min tho 💀', jsonb_build_object('postId', v_p_matchday), null, now() - interval '2 days' + interval '2 hours'),
    (v_space_id, v_gerry_id, 'new_drop', 'social', 'New Drop', 'Cuz shared a song', jsonb_build_object('postId', v_p_song_n95), now() - interval '20 hours', now() - interval '1 day'),
    (v_space_id, v_cuz_id, 'game_invite', 'play', 'New This or That challenge', 'Cinema or Home cinema night', jsonb_build_object('sessionId', v_gs_tot_pending, 'gameType', 'this_or_that'), null, now() - interval '6 hours'),
    (v_space_id, v_gerry_id, 'game_ready', 'play', 'This or That ready to compare', 'Messi or Ronaldo', jsonb_build_object('sessionId', v_gs_tot_done, 'gameType', 'this_or_that'), now() - interval '20 hours', now() - interval '1 day'),
    (v_space_id, v_gerry_id, 'game_answer', 'play', 'Your turn: Guess Mine', 'Cook at home or order in?', jsonb_build_object('sessionId', v_gs_guess_pending, 'gameType', 'guess_mine'), null, now() - interval '3 hours'),
    (v_space_id, v_gerry_id, 'prediction_settled', 'play', 'Match result is in', '2 - 1', jsonb_build_object('fixtureId', v_fixture_done), null, now() - interval '3 days' + interval '2 hours'),
    (v_space_id, v_cuz_id, 'prediction_settled', 'play', 'Match result is in', '2 - 1', jsonb_build_object('fixtureId', v_fixture_done), now() - interval '2 days', now() - interval '3 days' + interval '2 hours'),
    (v_space_id, v_cuz_id, 'memory_resurfaced', 'memories', 'A memory from a year ago', 'Road trip', jsonb_build_object('postId', v_p_roadtrip), null, now() - interval '1 hour'),
    (v_space_id, v_gerry_id, 'story_activity', 'social', 'New story', null, jsonb_build_object(), now() - interval '2 hours', now() - interval '3 hours');

  -- Hand back the generated credentials + ids (only place this ever appears)
  create temporary table if not exists _demo_seed_output (k text, v text);
  insert into _demo_seed_output values
    ('demo_space_id', v_space_id::text),
    ('gerry_id', v_gerry_id::text),
    ('cuz_id', v_cuz_id::text),
    ('gerry_email', 'gerry.demo@keepsapp.dev'),
    ('cuz_email', 'cuz.demo@keepsapp.dev'),
    ('password', v_password);
end $$;

select * from _demo_seed_output;
