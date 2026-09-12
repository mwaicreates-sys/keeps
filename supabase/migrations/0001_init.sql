-- ============================================================================
-- Keeps — initial schema
-- A private social space for exactly two people.
-- Every private row is scoped to a `space`; access is enforced with RLS via
-- the `is_space_member()` helper below. Nothing relies on frontend filtering.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New Keeper',
  handle text unique not null,
  avatar_url text,
  bio text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- spaces + membership (a Keeps space is designed for exactly two members)
-- ----------------------------------------------------------------------------
create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Space',
  invite_code text unique not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table space_members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index space_members_user_idx on space_members(user_id);

-- helper: is the current user a member of this space?
create or replace function is_space_member(target_space uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from space_members
    where space_id = target_space and user_id = auth.uid()
  );
$$;

-- helper: enforce a space never exceeds two members (invite-code join path)
create or replace function enforce_space_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from space_members where space_id = new.space_id) >= 2 then
    raise exception 'This space already has two members.';
  end if;
  return new;
end;
$$;

create trigger space_members_capacity
  before insert on space_members
  for each row execute function enforce_space_capacity();

-- ----------------------------------------------------------------------------
-- tags & collections
-- ----------------------------------------------------------------------------
create table tags (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null,
  cover_url text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index collections_space_idx on collections(space_id);

-- ----------------------------------------------------------------------------
-- posts (Drops) — the core content unit for Home + Memories
-- ----------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  author_id uuid not null references profiles(id),
  type text not null check (type in
    ('photo','video','text','song','activity','favorite','link','place','milestone','screenshot')),
  caption text,
  place text,
  category text,
  occurred_at timestamptz not null default now(),
  saved_to_memories boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_space_idx on posts(space_id, created_at desc);
create index posts_space_memories_idx on posts(space_id, saved_to_memories, occurred_at desc);
create index posts_space_occurred_idx on posts(space_id, occurred_at);

create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  url text not null,
  media_type text not null check (media_type in ('photo','video')),
  width int,
  height int,
  order_index int not null default 0
);

create index post_media_post_idx on post_media(post_id, order_index);

create table post_song_metadata (
  post_id uuid primary key references posts(id) on delete cascade,
  title text not null,
  artist text,
  album text,
  artwork_url text,
  url text,
  note text
);

create table post_favorite_metadata (
  post_id uuid primary key references posts(id) on delete cascade,
  favorite_type text not null,
  item_name text not null,
  note text
);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table collection_items (
  collection_id uuid not null references collections(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, post_id)
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id),
  emoji text not null check (emoji in ('❤️','😂','🔥','😭','⭐')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index reactions_post_idx on reactions(post_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_post_idx on comments(post_id, created_at);

create table saved_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  favorite_type text not null,
  item_name text not null,
  note text,
  post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index favorites_space_user_idx on favorites(space_id, user_id);

-- ----------------------------------------------------------------------------
-- stories (24h ephemeral)
-- ----------------------------------------------------------------------------
create table stories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  author_id uuid not null references profiles(id),
  type text not null check (type in ('photo','video','text','song')),
  media_url text,
  text_content text,
  song_title text,
  song_artist text,
  song_artwork_url text,
  song_url text,
  saved_to_memories boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index stories_space_idx on stories(space_id, created_at desc);

create table story_views (
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references profiles(id),
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references profiles(id),
  emoji text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Play — games
-- ----------------------------------------------------------------------------
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  game_type text not null check (game_type in
    ('this_or_that','top5','blind_rank','match_predictions','guess_mine','keep3_drop2')),
  topic text not null,
  category text,
  status text not null default 'pending' check (status in ('pending','ready','completed')),
  prompt jsonb not null default '{}'::jsonb,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index game_sessions_space_idx on game_sessions(space_id, created_at desc);

create table game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id),
  answer jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table game_results (
  session_id uuid primary key references game_sessions(id) on delete cascade,
  result jsonb not null,
  computed_at timestamptz not null default now()
);

create table top5_lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  session_id uuid references game_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id),
  topic text not null,
  created_at timestamptz not null default now()
);

create table top5_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references top5_lists(id) on delete cascade,
  rank int not null check (rank between 1 and 5),
  item_name text not null,
  item_meta jsonb default '{}'::jsonb,
  unique (list_id, rank)
);

create table match_fixtures (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  home_team text not null,
  away_team text not null,
  home_crest_url text,
  away_crest_url text,
  kickoff_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual','external')),
  external_id text,
  result jsonb,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index match_fixtures_space_idx on match_fixtures(space_id, kickoff_at desc);

create table match_predictions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references match_fixtures(id) on delete cascade,
  user_id uuid not null references profiles(id),
  winner_pick text not null check (winner_pick in ('home','draw','away')),
  over_under text check (over_under in ('over','under')),
  btts text check (btts in ('yes','no')),
  created_at timestamptz not null default now(),
  unique (fixture_id, user_id)
);

-- ----------------------------------------------------------------------------
-- notifications & activity
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  type text not null check (type in
    ('new_drop','reaction','reply','story_activity','game_invite','game_answer',
     'game_ready','prediction_settled','memory_resurfaced','saved_memory')),
  category text not null default 'social' check (category in ('social','play','memories')),
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_unread_idx on notifications(user_id, read_at);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references profiles(id),
  type text not null,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_space_idx on activity_events(space_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table spaces enable row level security;
alter table space_members enable row level security;
alter table tags enable row level security;
alter table collections enable row level security;
alter table posts enable row level security;
alter table post_media enable row level security;
alter table post_song_metadata enable row level security;
alter table post_favorite_metadata enable row level security;
alter table post_tags enable row level security;
alter table collection_items enable row level security;
alter table reactions enable row level security;
alter table comments enable row level security;
alter table saved_items enable row level security;
alter table favorites enable row level security;
alter table stories enable row level security;
alter table story_views enable row level security;
alter table story_reactions enable row level security;
alter table game_sessions enable row level security;
alter table game_answers enable row level security;
alter table game_results enable row level security;
alter table top5_lists enable row level security;
alter table top5_items enable row level security;
alter table match_fixtures enable row level security;
alter table match_predictions enable row level security;
alter table notifications enable row level security;
alter table activity_events enable row level security;

-- profiles: readable by any authenticated user who shares a space with them;
-- writable only by the owner.
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from space_members sm1
      join space_members sm2 on sm1.space_id = sm2.space_id
      where sm1.user_id = auth.uid() and sm2.user_id = profiles.id
    )
  );
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

-- spaces: members only
create policy spaces_select on spaces for select using (is_space_member(id));
create policy spaces_insert on spaces for insert with check (created_by = auth.uid());
create policy spaces_update on spaces for update using (is_space_member(id));

-- space_members: visible to members of that space; a user can insert
-- themselves (join via invite code, validated in the join RPC).
create policy space_members_select on space_members for select using (is_space_member(space_id));
create policy space_members_insert on space_members for insert with check (user_id = auth.uid());

-- generic "member of the row's space" policy, applied per-table below
create policy tags_all on tags for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy collections_all on collections for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy posts_all on posts for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy favorites_all on favorites for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy stories_all on stories for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy game_sessions_all on game_sessions for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy top5_lists_all on top5_lists for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy match_fixtures_all on match_fixtures for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_insert on notifications for insert with check (is_space_member(space_id));
create policy activity_events_all on activity_events for all using (is_space_member(space_id)) with check (is_space_member(space_id));
create policy saved_items_all on saved_items for all using (is_space_member(space_id) and user_id = auth.uid()) with check (is_space_member(space_id) and user_id = auth.uid());

-- child tables: gate through their parent's space membership
create policy post_media_all on post_media for all
  using (exists (select 1 from posts p where p.id = post_media.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = post_media.post_id and is_space_member(p.space_id)));

create policy post_song_metadata_all on post_song_metadata for all
  using (exists (select 1 from posts p where p.id = post_song_metadata.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = post_song_metadata.post_id and is_space_member(p.space_id)));

create policy post_favorite_metadata_all on post_favorite_metadata for all
  using (exists (select 1 from posts p where p.id = post_favorite_metadata.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = post_favorite_metadata.post_id and is_space_member(p.space_id)));

create policy post_tags_all on post_tags for all
  using (exists (select 1 from posts p where p.id = post_tags.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = post_tags.post_id and is_space_member(p.space_id)));

create policy collection_items_all on collection_items for all
  using (exists (select 1 from collections c where c.id = collection_items.collection_id and is_space_member(c.space_id)))
  with check (exists (select 1 from collections c where c.id = collection_items.collection_id and is_space_member(c.space_id)));

create policy reactions_all on reactions for all
  using (exists (select 1 from posts p where p.id = reactions.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = reactions.post_id and is_space_member(p.space_id)) and user_id = auth.uid());

create policy comments_all on comments for all
  using (exists (select 1 from posts p where p.id = comments.post_id and is_space_member(p.space_id)))
  with check (exists (select 1 from posts p where p.id = comments.post_id and is_space_member(p.space_id)) and author_id = auth.uid());

create policy story_views_all on story_views for all
  using (exists (select 1 from stories s where s.id = story_views.story_id and is_space_member(s.space_id)))
  with check (user_id = auth.uid());

create policy story_reactions_all on story_reactions for all
  using (exists (select 1 from stories s where s.id = story_reactions.story_id and is_space_member(s.space_id)))
  with check (user_id = auth.uid());

create policy game_answers_all on game_answers for all
  using (exists (select 1 from game_sessions g where g.id = game_answers.session_id and is_space_member(g.space_id)))
  with check (user_id = auth.uid());

create policy game_results_all on game_results for all
  using (exists (select 1 from game_sessions g where g.id = game_results.session_id and is_space_member(g.space_id)))
  with check (exists (select 1 from game_sessions g where g.id = game_results.session_id and is_space_member(g.space_id)));

create policy top5_items_all on top5_items for all
  using (exists (select 1 from top5_lists l where l.id = top5_items.list_id and is_space_member(l.space_id)))
  with check (exists (select 1 from top5_lists l where l.id = top5_items.list_id and is_space_member(l.space_id)));

create policy match_predictions_all on match_predictions for all
  using (exists (select 1 from match_fixtures f where f.id = match_predictions.fixture_id and is_space_member(f.space_id)))
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RPC: join a space by invite code (kept as a function so the invite code
-- itself never needs a broad "select all spaces" policy on the client).
-- ----------------------------------------------------------------------------
create or replace function join_space_by_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_space_id uuid;
  member_count int;
begin
  select id into target_space_id from spaces where invite_code = code;
  if target_space_id is null then
    raise exception 'Invalid invite code.';
  end if;

  select count(*) into member_count from space_members where space_id = target_space_id;
  if member_count >= 2 then
    raise exception 'This space is already full.';
  end if;

  insert into space_members (space_id, user_id, role)
  values (target_space_id, auth.uid(), 'member')
  on conflict do nothing;

  return target_space_id;
end;
$$;

grant execute on function join_space_by_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger posts_updated_at before update on posts for each row execute function set_updated_at();
create trigger collections_updated_at before update on collections for each row execute function set_updated_at();

-- enforce_space_capacity is only ever invoked as a trigger, never directly by clients
revoke execute on function enforce_space_capacity() from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Only space members may upload into their own space's folder
-- (object path convention: media/<space_id>/<...>), and reads are public
-- so images load fast via CDN, matching non-sensitive media-sharing apps.
create policy media_read on storage.objects for select
  using (bucket_id = 'media');

create policy media_insert on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and is_space_member((storage.foldername(name))[1]::uuid)
  );

create policy media_delete on storage.objects for delete
  using (
    bucket_id = 'media'
    and is_space_member((storage.foldername(name))[1]::uuid)
  );
