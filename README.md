# Abide

**A daily Bible reading companion for church leaders in Cebu, Philippines.**

Leaders do **RRR** (Read, Reflect, Respond) in a paper notebook, then check in on the app. Overseers see who has read today and can encourage those who haven't. The tone is always encouraging, never shaming.

- 👥 Built for about 100 leaders and their overseers
- 📱 Android first (Expo / React Native)
- 💸 Runs entirely on free plans: $0 to operate
- 🔒 Private by design: notebook photos never leave the phone, and leaders only see their own data

---

## Status

**Phases 2–6 of 9 (accounts, check-ins, Bible reader, notebook scan, overseer view and streaks): code complete, being tested on a phone.** The admin website is done. Now building **guided reading plans** in the Bible tab.

```
Overall  ███████████████░░░░░  ~75%
```

```mermaid
flowchart LR
  P1["1 · Setup"]:::done --> P2["2 · Sign-in"]:::wip --> P3["3 · Check-in"]:::wip --> P4["4 · Bible reader"]:::wip --> P5["5 · Notebook scan"]:::wip
  P5 --> P6["6 · Overseer view + streaks"]:::wip --> P7["7 · Friends"]:::wip --> P8["8 · Pilot"]:::todo --> P9["9 · Chat"]:::todo

  classDef done fill:#2F5D50,stroke:#2F5D50,color:#FFFFFF
  classDef wip fill:#E9A23B,stroke:#E9A23B,color:#1F2A26
  classDef todo fill:#FAF7F2,stroke:#C9C1B4,color:#5E6B66
```

| | Phase | What it delivers | Status |
|---|---|---|---|
| 1 | **Setup** | Runs on a phone, Supabase connected, theme, tab layout | ✅ Done |
| 2 | **Sign-in & roles** | Accounts, profiles, small groups with join codes, leader/overseer/admin roles | 🟡 Testing |
| 3 | **Check-in** | Simple mode, then guided Read → Reflect → Respond screens | 🟡 Testing |
| 4 | **Bible reader** | Read Scripture in the app, version picker, highlights | 🟡 Testing |
| 5 | **Notebook scan** | Snap your notebook page; on-device text recognition fills in your check-in | 🟡 Testing |
| 6 | **Overseer view & streaks** | "Who read today" for overseers; streaks with a weekly grace day | 🟡 Testing |
| 7 | **Friends** | Add friends and encourage each other (replaces badges / *My Bible Heroes*, dropped) | 🟡 Testing |
| 8 | **Pilot** | Daily reminders, backups, Android APK for 5–10 leaders | ⬜ Planned |
| 9 | **Chat** | 1:1 leader–overseer and cell-group chats | ⬜ After launch |

### Phase 2 progress

- [x] Database: `profiles`, `groups` and `group_members` tables, with Row Level Security
- [x] Open sign-up; a new account only sees its own data until it joins a group
- [x] Sign-in / sign-up screens; the app remembers who's signed in
- [x] Show/hide password button
- [x] Separate tabs for overseers (Today, Leaders) and leaders (Home, Heroes)
- [x] Overseers create small groups (cell groups or ministries) and share each group's join code
- [x] Leaders join one or more groups with a code from Profile; their group's overseer can then see them
- [ ] Tested end-to-end on an Android phone

### Phase 3 progress

- [x] `checkins` table: one per leader per day, today or yesterday only (Philippine time), enforced by the database
- [x] Simple mode: one tap on Home, with an optional passage
- [x] Guided mode: Read → Reflect → Respond steps with notebook reminders
- [x] Check in for yesterday if you forgot
- [x] Celebration screen after each check-in
- [x] Passage is picked from a list (book → chapter → verse or verse range), not typed
- [ ] Tested end-to-end on an Android phone

### Phase 4 progress

- [x] Bible tab: pick a book and chapter, previous/next, remembers where you were
- [x] Versions: every English, Tagalog and Cebuano version our YouVersion key is licensed for (e.g. NIV)
- [x] Bible text from YouVersion (NIV and other licensed versions) through a Supabase Edge Function, so the key stays secret
- [x] Each version's copyright and licence shown under the text
- [x] Highlights: tap a verse, pick one of 4 colours; only the verse reference (e.g. `JHN.3.16`) is stored
- [ ] Connect to check-in: the Read step opens today's passage
- [ ] Tested end-to-end on an Android phone

### Reading plans (in the Bible tab)

Guided RRR plans: each day gives a passage and reflection questions. A day counts as done only when the leader checks in for it, so missing a calendar day never skips a reading.

- [x] 4 Gospel plans (Matthew 28 days, Mark 41, Luke 24, John 21) from NewSpring Church devotionals, in [`assets/guided_plans/`](assets/guided_plans/)
- [x] `lib/plans.ts` loads and checks them; `npm run check:plans` validates every plan file
- [x] `user_plans` table: one active plan per user, **locked until it's finished** (no pausing or switching, enforced by the database), restart after finishing
- [x] Check-ins can record which plan day they were for; a plan only moves forward when that check-in exists
- [x] Bible tab: **Bible | Plans** switch, *My plan* card with progress, filter chips, plan list
- [x] "Continue today's RRR" opens the guided check-in with the day's passage, theme and Reflect questions; "Read it here" shows just that day's verses
- [x] Saving the check-in moves the plan to the next day (and finishes it after the last day); the celebration screen says which day was done
- [x] Plan detail screen: what you'll read, Start / Start again, or "Finish your current plan first" while another plan is active
- [ ] Tested end-to-end on an Android phone

### Phase 7 progress: Friends

- [x] Every account has a friend code (8 letters/numbers, no look-alikes); share it from the Friends tab
- [x] Add a friend with their code; they accept or decline. If you both add each other, it's accepted straight away
- [x] Friends see each other's "read today" and streak only, never passages or notebook text (enforced by the database)
- [x] Encourage a friend with one tap: 🙏 Praying for you, 💪 Keep going!, 🎉 Well done today!, 💛 Thinking of you (one per friend per day, no free text)
- [x] New encouragements show on Home and in the Friends tab
- [x] Leader tabs: Home, Bible, Chats, Friends, Profile (My Bible Heroes was dropped)
- [ ] Push notification when a friend encourages you (Phase 8, with reminders)
- [ ] Tested end-to-end on an Android phone

### Phase 5 progress

- [x] Guided check-in: Read → Reflect → Respond → Review
- [x] Take a photo of the notebook page or pick one from the gallery
- [x] Google ML Kit reads the handwriting on the phone; the photo is deleted right after
- [x] Text is split into Read / Reflect / Respond by the headings on the page (English, Cebuano, Tagalog)
- [x] Leader reviews and fixes the text before saving
- [ ] Development build installed on a phone (`eas build --profile development`)
- [ ] Tested with real handwriting

### Phase 6 progress

- [x] Streaks with one grace day per Monday–Sunday week (Philippine time), calculated in the database
- [x] Home shows your streak and whether this week's grace day is still available
- [x] Overseer **Today**: "Not yet today" and "Read today", with streaks and last reading date
- [x] Leader page: streak, last 7 days, days read in the last 30, recent passages
- [x] Overseers switch a leader between Guided and Simple
- [x] Privacy: overseers see that a leader read and the passage, never their Read/Reflect/Respond text
- [x] `streak_adjustments` table for admin corrections
- [x] Admin website: add a streak adjustment (e.g. dead phone battery)
- [ ] Tested end-to-end on an Android phone

---

## Tech stack

| Area | Choice |
|---|---|
| App | [Expo](https://expo.dev) (React Native) + TypeScript, [Expo Router](https://docs.expo.dev/router/introduction/) |
| Backend | [Supabase](https://supabase.com): Postgres, Auth, Realtime, Edge Functions (free plan) |
| Text recognition | Google ML Kit, on-device |
| Scripture | [YouVersion Platform](https://platform.youversion.com) via the `youversion` Edge Function (free for non-commercial apps) |

## Running it locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **publishable** key.
3. Apply the database migrations to your Supabase project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
4. Set the YouVersion app key for the Bible (it stays on Supabase, never in the app):
   ```bash
   npx supabase functions deploy youversion
   npx supabase secrets set YVP_APP_KEY=<your-youversion-app-key>
   ```
5. Start the app. With the Abide development build installed, open it and connect; or use [Expo Go](https://expo.dev/go) (notebook scan is hidden there):
   ```bash
   npx expo start        # development build
   npx expo start --go   # Expo Go
   ```

## Admin website

Admins manage the church's people and groups from a separate website in [`admin/`](admin/) (React + Vite). The phone app is for leaders and overseers; admins who sign in on the phone get the overseer tabs.

- **People & roles:** make someone an overseer or admin, set Guided/Simple mode, change a leader's main overseer, see each person's last check-in
- **Groups:** see every group and its members, move a group to another overseer, remove members
- **Check-in fixes:** see anyone's last 30 days, add a streak adjustment (with a reason) for a day they read but couldn't check in, remove an adjustment, or delete a mistaken check-in. Check-in text is never shown.
- **Feedback:** messages from "Report a problem" in the app's Profile tab; mark them resolved
- **Reports:** a monthly summary per person (days read, current streak, groups) with a CSV download for pastors

Run it locally:

```bash
cd admin
npm install
cp .env.example .env.local   # same Supabase URL + publishable key as the app
npm run dev                  # http://localhost:5174
```

Admin powers are enforced by the database (functions that check the caller is an admin), not by the website.

## Project layout

```
src/app/          Screens (file-based routes)
  (auth)/         Sign-in and sign-up
  (tabs)/         The signed-in tabs
src/components/   Reusable UI (Button, TextField, Screen, …)
src/constants/    Theme: colours, spacing, fonts
src/lib/          Supabase client and data functions
assets/guided_plans/  Reading plans (JSON)
scripts/          Dev checks (e.g. check-plans.mts)
supabase/         Database migrations and Edge Functions
admin/            Admin website (separate app)
```
