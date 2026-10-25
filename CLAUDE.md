# Bible Reading Tracker – project guide for Claude Code

## What we're building
A mobile app for ~100 church leaders in Cebu, Philippines, to build a daily Bible reading habit.
Leaders do RRR (Read, Reflect, Respond) in a paper notebook, then check in on the app.
Overseers see who read today and encourage those who didn't.
Full plan: "Church Leaders Bible Reading Tracker – App Plan" (Google Doc). Designs: Figma "Bible Reading Tracker – Hi-fi wireframes".

## I'm learning React Native
- Work in small steps. One feature or screen at a time.
- Before writing code, explain the plan in a few sentences. After, explain what changed and why.
- When a new concept appears (hooks, navigation, RLS, etc.), explain it briefly with the code.
- Sometimes leave a small, clearly marked TODO for me to write myself, and check it after.

## Stack
- Expo (React Native) with TypeScript and Expo Router (file-based routes in `src/app/`)
- Supabase: Postgres, Auth, Realtime, Edge Functions – Free plan
- On-device OCR: Google ML Kit text recognition (needs an Expo development build, not Expo Go)
- expo-image-picker, expo-image-manipulator, expo-notifications (local reminders), expo-sqlite (local cache)
- Bible text: Free Use Bible API (https://bible.helloao.org) – free, no API key, no request limit. Chapters are cached on the phone (expo-sqlite kv-store).

## Hard rules
- Must stay $0. Do not add paid services or libraries that need a paid plan.
- Never put the Supabase service-role key or any secret in the app. Only the publishable/anon key, via `EXPO_PUBLIC_` env vars. Secrets live in Edge Functions.
- Every table has Row Level Security enabled with explicit policies. Leaders only see their own data; overseers see their leaders.
- Notebook photos never leave the phone and are never saved. Only the reviewed text is stored.
- Never store Bible text in the database. Store verse references only (e.g. `JHN.3.16`). Show the version's copyright line wherever Scripture is displayed.
- A "day" is midnight to midnight in Asia/Manila time. Compute `reading_date` in that timezone.
- Check-ins allowed for today and yesterday only. One check-in per leader per day.
- Sign-up is open to anyone. Joining a small group (cell group or ministry) requires that group's join code. A new account sees only its own data until it joins a group.
- Android first. Don't rely on iOS-only APIs.

## Data model (version 1)
- profiles: id (= auth user id), full_name, role (leader/overseer/admin), overseer_id, mode (guided/simple), reminder_time, push_token, created_at
- groups: id, name, type (cell_group/ministry), overseer_id, join_code, created_at
- group_members: group_id, user_id, joined_at – a leader can be in several groups. Overseers see members of the groups they lead. The first group a leader joins sets profiles.overseer_id (their main overseer, for 1:1 chat).
- checkins: id, user_id, reading_date, passage, read_text, reflect_text, respond_text, created_at, updated_at – unique (user_id, reading_date)
- streak_adjustments: id, user_id, admin_id, reading_date, reason, created_at
- user_badges: user_id, badge_key, unlocked_at (badge/character definitions live in app code)
- highlights: id, user_id, verse_id, color, note, created_at
- feedback: id, user_id, message, created_at
- Later (chat): conversations, conversation_members (last_read_at), messages
Streaks are calculated from checkins + streak_adjustments, never stored. One grace day per week.

## Conventions
- Database changes go in Supabase migrations (`supabase/migrations/`), not edits in the dashboard.
- Keep Supabase calls in `lib/` (e.g. `lib/supabase.ts`, `lib/checkins.ts`), not inside screens.
- Reusable UI in `components/`. Colours and spacing in one theme file.
- Design: warm cream background #FAF7F2, deep green #2F5D50, amber #E9A23B, Inter font. Encouraging tone, never shaming.
- Leader tabs: Home, Bible, Chats, Heroes, Profile. Overseer tabs: Today, Leaders, Bible, Chats, Profile.

## Build phases
1. Setup: run on phone, Supabase client, env vars, theme, tab layout
2. Sign-in + profiles + small groups (join codes) + roles
3. Check-in: Simple mode, then Guided RRR screens
4. Bible reader: Free Use Bible API, version picker, highlights
5. Notebook scan: camera/gallery, on-device OCR, review screen (dev build)
6. Overseer view + streaks with grace days
7. Gamification: badges, My Bible Heroes
8. Pilot: reminders, weekly backups, 5–10 leaders, Android APK
9. After launch: chat (1:1 leader–overseer, cell-group chats)
yow 