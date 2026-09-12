# keeps

A private social space for exactly two people. Fun now, worth keeping later.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (Postgres, Auth, Storage) — a dedicated project named `keeps` was
  provisioned for this app (see `supabase/migrations/0001_init.sql` for the
  full schema + RLS policies)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

The schema in `supabase/migrations/0001_init.sql` is already applied to the
provisioned project. To point this app at a different Supabase project,
apply that migration there first (Supabase SQL editor, or the CLI:
`supabase db push`).

## What's implemented

- **Auth & spaces**: email/password signup, create-space (generates a
  6-character invite code) or join-space flow, enforced to exactly two
  members per space (`space_members_capacity` trigger + `join_space_by_invite`
  RPC).
- **Home**: story rail, resurfaced-memory teasers, feed of Drops with
  reactions (❤️😂🔥😭⭐), lightweight replies, save, and "keep as memory".
- **Drop**: adaptive composer for Photo / Video / Song / Text / Activity /
  Favorite, plus a separate Story mode (24h expiry, save-to-Memories).
- **Memories**: grid archive with year/category/search filters, collections,
  memory detail (reconstructs caption + media + song + tags + comments +
  reactions in one place).
- **Play**: This or That, My Top 5, Blind Rank, Guess Mine, Keep 3 Drop 2 —
  all sharing one `game_sessions` / `game_answers` / `game_results` engine
  — plus Match Predictions (manual fixtures, no paid football API required)
  with a Home/Draw/Away + Over-Under + BTTS picker.
- **Profile**: compact header + Posts / Top 5s / Favorites / Saved tabs, and
  a shared "Us" page with real (never fabricated) stats.
- **Notifications**: All / Social / Play / Memories filters, read/unread,
  mark-all-read.
- **Search**: across posts, memories, songs, collections, and games.
- **Security**: every table has RLS scoped through `is_space_member()`;
  Storage uploads are validated by type/size and scoped to the uploader's
  space folder.

## Known gaps / next steps

- Demo seed data (`supabase/seed/demo-seed.sql`) is written but requires two
  real signed-up users' profile ids — see the comment at the top of that
  file for why (Auth users can't be safely fabricated from raw SQL).
- End-to-end browser testing against the live Supabase project could not be
  run from this build environment: its outbound network policy blocks
  requests to `*.supabase.co` (confirmed via a direct `curl`, independent of
  the app). `npm run build` and `npm run lint` both pass cleanly, and the
  schema/RLS were verified live via the Supabase advisors. Test the real
  signup → create space → Drop → react loop once deployed (or from a
  network that can reach Supabase).
- `favorites`, `saved_items`, and a few other tables are modeled and
  RLS-protected but not yet wired into every corner of the UI (e.g. a
  standalone Favorites flow outside of Drop's Favorite type).
- Data export (JSON/CSV) is designed for but not yet built as a UI action —
  the schema is already structured to make it straightforward.
