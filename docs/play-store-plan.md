# Abide: Google Play Store release plan

Written by the `play-store-planner` agent on **2026-11-04**. The `play-store-executor` agent and the owner work through it from top to bottom.
Tick items (`- [x]`) as they get done, and add a one-line note saying what changed and where.
**Owner notes:** add your own notes under any item, starting the line with `> Owner:`. The planner keeps them when it updates this file.

---

## Summary: where Abide stands

Abide is closer to the Play Store than it might feel. The hard technical parts are done and already match Google's rules:

- **Target API level is fine.** Expo SDK 58 targets Android 16 (API 36). Since 31 August 2026, Google requires API 36 for new apps and updates. Nothing to change.
- **Bundle and signing are easy.** An EAS `production` build makes an `.aab` by default, EAS creates and stores the upload key, and Google's Play App Signing handles the rest. `appVersionSource: remote` is already set, so EAS will count `versionCode` for you.
- **Privacy design is strong.** Notebook photos are read on the phone and deleted (`src/lib/notebook-scan.ts`). Bible text is never stored. RLS is on every table. Every user table uses `on delete cascade` from `profiles`, which makes account deletion straightforward.
- **Credits are already shown.** Each version's copyright line appears under Scripture (`src/app/(tabs)/bible.tsx`, `src/components/bible/passage-sheet.tsx`), and "Devotional by NewSpring Church" links back on the plan screen (`src/app/plans/[id].tsx`).
- **Permissions are already trimmed.** The microphone is blocked (`microphonePermission: false`), and nothing uses location, contacts or ads.

### Biggest blockers

1. **The $25 Play Console fee and the account type.** CLAUDE.md says "must stay $0", but Google charges a one-time US$25 to register. Only the owner or the church can decide who pays and whose name the account is in (see Decisions).
2. **No in-app account deletion and no web deletion link.** Google requires both for any app with sign-up. Profile only has "Report a problem" and "Sign out".
3. **No privacy policy.** Google requires one in the store listing *and inside the app*, plus a completed Data safety form. Neither exists yet. The policy also needs a free public web page to live on.
4. **The closed test: 12 testers for 14 days in a row** (personal accounts only). Production stays locked until this is done. The planned Phase 8 pilot of 5–10 leaders is too small. Recruit about 15–20 so a few dropouts don't reset the clock.
5. **The app still uses the default Expo icon** (the blue "A" in `assets/images/icon.png` and the adaptive-icon files). Abide needs its own icon, a 512×512 store icon, a 1024×500 feature graphic and screenshots.

Other things to check, each small: the package name must be confirmed before the first upload; NewSpring and YouVersion terms need a quick confirmation; EAS needs the Supabase URL and publishable key as environment variables for cloud builds; and Google reviewers need a test account.

---

## Decisions for the owner

Only a person can do these. The executor agent can't spend money, create accounts or accept terms.

1. **Who pays the US$25, and which account type?**
   - **Option A: personal account** (in your own name). Quick to set up. Needs a government ID, a credit or debit card in your name (prepaid cards are not accepted), and access to an Android phone through the Play Console app. **You must run the 12-tester, 14-day closed test** before production. Your legal name is verified, and your developer name appears on the listing.
   - **Option B: organization account owned by the church.** Needs a free **D-U-N-S number** for the church as a registered organization (apply directly with Dun & Bradstreet for free; avoid paid middlemen). The church name appears as the developer. Google lists the 12-tester rule only for personal accounts, so an organization account probably skips it, but confirm that during sign-up. D-U-N-S approval can take a while.
   - **About $0:** the fee is a one-time cost paid by a person or the church, not a paid service inside the app, so the app itself still runs at $0. Write down who paid it. Suggestion: ask the church to pay (or reimburse) and, if it already has a D-U-N-S number or legal registration, use Option B so the app belongs to the church, not to one person.
2. **The final package name.** `com.mannigoy.abide` is in `app.json`. **It can never change after the first upload to Play.** If the app should belong to the church, consider something like `ph.<churchname>.abide` or `org.<churchname>.abide`. If you're happy with `com.mannigoy.abide`, just confirm it.
3. **Recruit testers.** You need 12 or more people with Google accounts who stay opted in for 14 days in a row. Aim for 15–20 leaders. This group can be your Phase 8 pilot too, and installing from Play is easier than passing around APK files.
4. **Approve the privacy policy, and choose where the public pages live (free).** The executor will draft it. You review and publish it. Free options: Google Sites, a page on the church website, or GitHub Pages (free for public repos). You need two URLs: a **privacy policy** and an **account deletion** page (they can be one page with a "Delete your account" section).
5. **The contact email for the listing.** Google shows it publicly. A church or ministry address is better than a personal one.
6. **Target audience.** If every user is 18 or older, choose "18 and over" only. If any youth leaders are 13–17, also select those age groups. Avoid under-13: the Families policy adds a lot of extra requirements.
7. **Third-party permissions.** Send one email to NewSpring (writingteam@newspring.cc) and check the YouVersion terms yourself (details in section A).
8. **The icon and artwork.** Design or approve the app icon, feature graphic and screenshots (Figma has the brand: cream #FAF7F2, green #2F5D50, amber #E9A23B).
9. **Category.** Suggested: **Books & Reference**, where most Bible apps are listed, or **Lifestyle**.

---

## Checklist

Legend: **who**: `executor` (the agent can do it in the repo) or `owner` (you). **Size**: S = under an hour, M = a few hours, L = a day or more.

### A. Account & policies

- [ ] **A1. Decide the account type and who pays the US$25 fee.**
  *Why:* Play Console registration (one-time US$25), and the CLAUDE.md $0 rule. *Where:* Decisions 1 above. *Who:* owner. *Size:* S.
- [ ] **A2. Create the Google Play developer account and finish identity verification.**
  *Why:* required to publish. Personal accounts also verify an Android device through the Play Console app. Organization accounts need the D-U-N-S number. *Where:* https://play.google.com/console/signup. *Who:* owner. *Size:* M (verification can take days).
- [ ] **A3. Confirm the final `android.package`.**
  *Why:* it can never change after the first upload. *Where:* `app.json` → `expo.android.package`. *Who:* owner decides. If it changes, the executor edits `app.json` (only with your explicit OK). *Size:* S.
- [ ] **A4. Check the YouVersion Platform terms for a Play Store app.**
  *Why:* YouVersion's terms of use govern how we show Bible text and attribution. The terms page didn't load for the planner (it needs JavaScript), so read it yourself in a browser. Confirm: (1) a free church app on Google Play is allowed with our app key; (2) the attribution we show (version name, copyright line, link) is enough; (3) we may list YouVersion in our privacy policy. Abide already keeps chapter text in memory only and keeps the key in a Supabase secret. *Where:* https://platform.youversion.com/?tos=1 and https://platform.youversion.com/support. *Who:* owner. *Size:* S.
- [ ] **A5. Email NewSpring Church for permission to use the devotional plans.**
  *Why:* NewSpring's reprint rules ask for credit with a link back (Abide already shows this on the plan screen), no money made (Abide is free), and **no changes to the copy without written approval**. Our plan files contain short summaries and reflection questions taken from their guides, so ask for written OK. Mention: free app for ~100 church leaders in Cebu, credit and link shown, no ads. If they say no, remove or rewrite the plans before the public release. *Where:* writingteam@newspring.cc. *Who:* owner (the executor can draft the email text if you ask). *Size:* S.
- [x] **A6. Draft the privacy policy.**
  *Why:* required for every app, and needed before you can fill in Data safety. It must cover: what is collected (see the D7 table), why, who processes it (Supabase hosting; Expo for builds and, later, push; Google ML Kit diagnostics; YouVersion receives only Bible version and chapter requests, never user data), that notebook photos stay on the phone and are deleted, that overseers see read status, streak and passage but never RRR text, that friends see only "read today" and streak, how to delete your account (in-app and web), what may be kept briefly after deletion (e.g. Supabase backups and logs), and a contact email. Plain English, short. *Where:* new file `docs/privacy-policy.md` (draft only, the executor doesn't publish it). *Who:* executor drafts, owner approves. *Size:* M.
  > Done 2026-11-04 (executor): drafted in `docs/privacy-policy.md`. Placeholders for developer name, contact email, effective date and deletion URL. Owner reviews, then publishes (A8).
- [x] **A7. Draft the "Delete your Abide account" web page.**
  *Why:* account deletion policy: a web link where people can request deletion without the app. It must name the app and the developer. Simplest $0 approach: explain the in-app steps (Profile → Delete my account), plus "or email <contact> from the address you signed up with, and we'll delete your account and data within 30 days". An admin then deletes the user in the Supabase dashboard (Authentication → Users → Delete user), and the cascades remove the rest. *Where:* new file `docs/delete-account.md` (draft). *Who:* executor drafts, owner approves. *Size:* S.
  > Done 2026-11-04 (executor): drafted in `docs/delete-account.md` (in-app steps, email option, what's deleted/kept, plus an admin-only section on handling email requests). Placeholders for developer name, contact email, privacy URL.
- [x] **A8. Publish the privacy policy and deletion page at free public URLs.**
  *2026-11-05:* live on GitHub Pages from the `gh-pages` branch (built from the drafts, admin section excluded): https://mannigoy.github.io/Abide/privacy.html and https://mannigoy.github.io/Abide/delete-account.html. App link updated in `src/constants/links.ts`. Republish after editing the drafts.
  *Why:* Play Console needs working URLs (no login, not a PDF download). *Where:* Google Sites, the church website, or GitHub Pages. *Who:* owner. *Size:* S.

### B. App changes

- [x] **B1. Database function for account deletion.**
  *Why:* account deletion requirement (in-app path, all associated data deleted). *What:* a migration adding a `security definer` function, e.g. `public.delete_my_account()`, that deletes the caller's row from `auth.users` (`where id = auth.uid()`). Every user table already cascades from `profiles` (checkins, highlights, user_plans, friendships, encouragements, feedback, group_members, streak_adjustments), `profiles.overseer_id` is set to null for their leaders, and `streak_adjustments.admin_id` is set to null.
  **Watch out:** `groups.overseer_id` is `on delete cascade`, so deleting an overseer would **delete their whole groups and everyone's memberships**. Smallest safe fix: the function refuses if the caller still leads any group, with a friendly message ("Ask an admin to move your groups to another overseer first"). `admin_set_group_overseer` already exists for that. Grant execute only to `authenticated`. Test with a rolled-back SQL DO block: a leader can delete themselves, can't delete anyone else, and an overseer with groups is refused. Regenerate `src/lib/database.types.ts`.
  *Where:* `supabase/migrations/<timestamp>_delete_my_account.sql`. *Who:* executor. *Size:* M.
  > If the direct `auth.users` delete turns out to be blocked, use a small Edge Function `delete-account` instead. It checks the caller's JWT and calls `auth.admin.deleteUser`, using the `SUPABASE_SERVICE_ROLE_KEY` that Supabase provides only inside Edge Functions (never in the app).
  > Done 2026-11-04 (executor): `supabase/migrations/20261104000000_delete_my_account.sql` pushed. Refuses with errcode 55000 while the caller leads a group, otherwise deletes `auth.users` for `auth.uid()` (direct delete works, no Edge Function needed). Rolled-back DO-block test passed: anon refused; overseer with a group refused and kept; leader deleted only themselves with all cascades; overseer deleted after their group moved, leaders' `overseer_id` cleared, group kept. Types regenerated (`src/lib/database.types.ts`).
- [x] **B2. "Delete my account" in Profile.**
  *Why:* account deletion requirement: easy to find in the app. *What:* a `deleteMyAccount()` call in `src/lib/auth.ts`. In `src/app/(tabs)/profile.tsx`, add a quiet "Delete my account" button below Sign out, then a confirmation sheet (reuse `src/components/sheet.tsx`) explaining what gets deleted ("your check-ins, notes, highlights, plans, friends and encouragements") and that it can't be undone. Then sign out. Keep the tone kind. *Who:* executor. *Size:* M.
  > Done 2026-11-04 (executor): `deleteMyAccount()` in `src/lib/auth.ts` (RPC, friendly message for group leaders, then local sign-out). New `src/components/delete-account-sheet.tsx` on `Sheet`. Quiet "Delete my account" link under Sign out in `src/app/(tabs)/profile.tsx`.
- [x] **B3. Privacy policy link inside the app.**
  *Why:* Google requires the privacy policy to be linked "on your store listing and within your app". *What:* a "Privacy policy" link in Profile and a small "By creating an account you agree to our Privacy policy" line on `src/app/(auth)/sign-up.tsx`. Store the URL once (e.g. `src/constants/links.ts`) and open it with `Linking.openURL`, as the Bible screen already does. Put a placeholder until A8 gives the real URL. *Who:* executor. *Size:* S.
  > Done 2026-11-04 (executor): `PRIVACY_POLICY_URL` in `src/constants/links.ts` (**placeholder** example.com URL, must be replaced after A8). "Privacy policy" link in Profile; "By creating an account you agree to our Privacy policy" on `src/app/(auth)/sign-up.tsx`.
- [x] **B4. Check which permissions the built app really asks for.**
  *Why:* Photo and video permissions policy (`READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` aren't allowed unless the app's core feature needs broad photo access, and Abide doesn't). This also gives accurate Data safety answers. *What:* run `npx expo config --type introspect` and list the Android manifest permissions. Expected: `CAMERA`, `INTERNET`, legacy `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` from expo-image-picker (they do nothing on Android 13+), `RECORD_AUDIO` blocked. If `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `SYSTEM_ALERT_WINDOW` or `com.google.android.gms.permission.AD_ID` show up, add them to `expo.android.blockedPermissions` in `app.json` and re-check that gallery picking still works (Android's photo picker needs no permission). Write the final list into this file under B4. *Who:* executor. *Size:* S.
  > Done 2026-11-04 (executor): added `expo.android.blockedPermissions` in `app.json`: `SYSTEM_ALERT_WINDOW` (was present, from the Expo template), plus `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED` and `AD_ID` as a safety net (not present). Final list: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `VIBRATE`, `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` (maxSdk 32). Blocked: `RECORD_AUDIO` and the five above. Gallery picking is unaffected: expo-image-picker asks for no permission on Android 13+. *Caveat:* ML Kit's Gradle dependencies can only be fully confirmed in a real build. Check the merged manifest of the first preview/production build (or Play Console → App bundle explorer → Permissions).
- [x] **B5. Replace the default Expo icon and splash.**
  *2026-11-05:* open book with an amber sprout on green, drawn by `scripts/make-icons.py` (re-run to regenerate). All app icons, splash, favicon, notification icon, plus `assets/store/play-icon-512.png` and `assets/store/feature-graphic-1024x500.png`. Adaptive background is now green; the old iOS `expo.icon` was removed.
  *Why:* store listing quality and branding (the current icon is Expo's template). *What:* new `assets/images/icon.png` (1024×1024), `android-icon-foreground.png`, `android-icon-background.png` (or just use `backgroundColor`), `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png`. Also export a **512×512 32-bit PNG under 1 MB** for the store. *Who:* owner provides the artwork; the executor can wire up files and check sizes. *Size:* M.
- [ ] **B6. Quick Android 16 check on a phone.**
  *Why:* when targeting API 36, Android forces edge-to-edge and ignores portrait-only on large screens and tablets. Check that no screen content hides under the status bar or nav bar, and that screens look OK in landscape on a tablet or foldable if anyone uses one. *Who:* owner tests, executor fixes. *Size:* S–M.
- [x] **B7. (Phase 8, when reminders are built) Notifications done the Play-friendly way.**
  *2026-11-05:* expo-notifications added. Permission is asked only when a leader sets a reminder in Profile; daily reminders use an inexact daily trigger (no exact-alarm permission). Encouragements send a push via Expo (database trigger with pg_net); push tokens are hidden from other users. Privacy policy updated (reminder time + notification token). **Still to do:** owner sets up Firebase (FCM) for push, and Data safety must list "Device or other IDs" (see data-safety.md).
  *Why:* the Android 13+ notification permission and Google's exact-alarm restrictions. *What:* ask for notification permission only when the leader turns reminders on, not at first launch. For daily reminders, **don't add `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`**: an approximate time is fine for a reading reminder, and `USE_EXACT_ALARM` is limited to alarm-clock and calendar apps. Push notifications (if added) need Firebase Cloud Messaging (free Spark plan). Its key is uploaded to EAS credentials, never committed. Once a push token is stored in `profiles.push_token`, update Data safety ("Device or other IDs") and the privacy policy. *Who:* executor. *Size:* M (part of Phase 8).

### C. Build & signing

- [x] **C1. Finish the `production` profile in `eas.json`.**
  *Why:* Google Play needs an `.aab` and a higher `versionCode` for each upload. *What:* change `"production": {}` to something like:
  ```json
  "production": {
    "environment": "production",
    "autoIncrement": true,
    "android": { "buildType": "app-bundle" }
  }
  ```
  (`app-bundle` is already the default; writing it makes it clear.) With `appVersionSource: remote`, EAS stores `versionCode` and starts at 1. Don't add `versionCode` to `app.json` (it would be ignored). Optionally add a `submit.production.android` section with `"track": "internal"` and `"releaseStatus": "draft"`. *Where:* `eas.json`. *Who:* executor. *Size:* S.
  > Done 2026-11-04 (executor): `eas.json` production profile now has `environment: production`, `autoIncrement: true`, `android.buildType: app-bundle`, plus `submit.production.android` (`track: internal`, `releaseStatus: draft`). No build was run.
- [ ] **C2. Set the Supabase environment variables on EAS for `production`.**
  *Why:* EAS builds in the cloud and doesn't upload `.env.local` (it's git-ignored), so without these the store build can't reach Supabase. Only the **public** values: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never the service-role key. *Where:* expo.dev → project → Environment variables, or `eas env:create --environment production`. The executor can check what exists with `eas env:list --environment production`. *Who:* owner creates (it's an account change). *Size:* S.
- [ ] **C3. Decide the user-facing version.**
  *Why:* `version` in `app.json` (now `1.0.0`) is the `versionName` people see. Keep `1.0.0` for the first public release, or use `0.9.0` for the closed test. *Who:* owner. *Size:* S.
- [ ] **C4. First production build.**
  *Why:* the `.aab` to upload. EAS creates the upload keystore the first time and keeps it safe. Don't download it into the repo (`*.jks` is already git-ignored). *Where:* `eas build --platform android --profile production`. Uses one of the free monthly EAS builds. *Who:* owner (the executor never starts production builds). *Size:* S (plus build wait).
- [ ] **C5. Upload the first build and accept Play App Signing.**
  *Why:* Play App Signing is required for new apps. Let Google generate the app signing key (the default). The EAS key becomes the "upload key", and if it's ever lost Google can reset it. *Where:* Play Console → create app → Testing → Internal testing → Create release → upload the `.aab` (or `eas submit --platform android`, which needs a Google service account key set up in EAS; uploading the first one by hand is simpler). *Who:* owner. *Size:* S.

### D. Store listing & App content (Play Console)

- [x] **D1. Draft the listing text.**
  *Why:* store listing limits: **app name ≤ 30**, **short description ≤ 80**, **full description ≤ 4,000** characters. *What:* e.g. name "Abide: Daily Bible Check-in" (27); a short description such as "Build a daily Bible reading habit with your small group. Read, Reflect, Respond." Keep it under 80 and count before pasting. Full description: what RRR is, notebook scan (on-device, photo never saved), Bible reader (credit YouVersion and the versions), NewSpring reading plans (credit), friends and encouragement, overseers, "made for church leaders; join your group with a code". Avoid claims Google might read as misleading. *Where:* new file `docs/store-listing.md`. *Who:* executor drafts, owner approves. *Size:* S.
  > Done 2026-11-04 (executor): drafted in `docs/store-listing.md`: name 27/30, short description 80/80, full description 1,960/4,000, plus a screenshot shot list. Remove the reading-plans paragraph if NewSpring says no (A5).
- [ ] **D2. Graphics.**
  *2026-11-05:* icon and feature graphic are ready in `assets/store/`; screenshots still to take.
  *Why:* required assets. **Icon 512×512** 32-bit PNG ≤ 1 MB; **feature graphic 1024×500** JPEG or 24-bit PNG (no transparency); **at least 2 phone screenshots** (aim for 4+ at 1080×1920 portrait, longest side no more than 2× the shortest). Use a demo account so no real names show. Don't show RRR notes from real people. *Who:* owner (the executor can list which screens to capture). *Size:* M.
- [ ] **D3. Category, contact email, website.**
  *Where:* Play Console → Grow → Store presence → Store settings. Category: Books & Reference (or Lifestyle). A contact email is required. Website optional (the privacy page URL is fine). *Who:* owner. *Size:* S.
- [ ] **D4. App access (reviewer login).**
  *Why:* the whole app is behind sign-in, so Google's reviewers need a working login. *What:* create a **demo leader account** (email confirmed) in a **demo group** with a few check-ins and a friend, and paste the email, password and a note ("Join code not needed; already in a group. Notebook scan uses the camera on-device") into App access. Keep this account working permanently. *Where:* Play Console → Policy → App content → App access. *Who:* owner (the executor can write the steps or a seed script that uses no real data). *Size:* S.
- [ ] **D5. Ads declaration: No ads.** *Where:* App content → Ads. *Who:* owner. *Size:* S.
- [ ] **D6. Content rating questionnaire.**
  *Why:* every app needs a rating. Answer honestly: reference/education-style app; no violence, sex, gambling or drugs; **users can interact** (friends, fixed encouragements, and later chat in Phase 9); no location sharing; no purchases. *Where:* App content → Content rating. *Who:* owner. *Size:* S.
- [x] **D7. Data safety form.**
  *Why:* required for apps on closed, open and production tracks. *Who:* executor drafts the answers into `docs/data-safety.md`, owner enters them in Play Console. *Size:* M.
  > Done 2026-11-04 (executor): drafted in `docs/data-safety.md` (section-by-section answers, not-collected list, permission list). One open owner question added: how to answer "Religious or political beliefs".
  Draft answers based on the current code (re-check after Phase 8 and 9):

  | Play data type | What in Abide | Collected? | Shared? | Required/optional | Purposes |
  |---|---|---|---|---|---|
  | Personal info → Name | `profiles.full_name` | Yes | No | Required | App functionality, Account management |
  | Personal info → Email address | Supabase Auth email | Yes | No | Required | Account management |
  | Personal info → User IDs | account id, `friend_code` | Yes | No | Required | App functionality, Account management |
  | App activity → App interactions | check-in dates, passages, plan progress, highlights (verse refs + colour), friendships | Yes | No | Required | App functionality |
  | App activity → Other user-generated content | Read/Reflect/Respond notes (typed or from the reviewed scan text), highlight notes, "Report a problem" messages | Yes | No | Optional | App functionality |
  | Messages → Other in-app messages | encouragements (fixed kinds, no free text); chat later | Yes | No | Optional | App functionality |
  | App info and performance → Diagnostics | Google ML Kit (text recognition) sends usage and diagnostic data | Yes | No | Required | Analytics |
  | Device or other IDs | ML Kit per-install ID; later the push token | Yes | No | Required | Analytics (ML Kit); App functionality (push, later) |
  | Photos and videos | notebook photos | **No**: processed only on the phone and deleted | No | n/a | n/a |
  | Location, contacts, financial, health, files, web history | not used | No | No | n/a | n/a |

  Other answers: **data encrypted in transit: Yes** (HTTPS to Supabase). **Users can request deletion: Yes**, with the web link from A8. **Shared with third parties: No.** Supabase, Expo and Google ML Kit act as service providers, and YouVersion gets no user data. Overseers and friends seeing someone's status is part of how the app works for those users, not third-party sharing. *Note:* ML Kit's own disclosure page lists device info, app info, per-install IDs and performance metrics, sent over HTTPS and not passed to third parties. Re-check it before submitting.
- [ ] **D8. Target audience and content.**
  *Why:* required. Choose the age groups from Decision 6 (suggested: 18 and over). Don't use child-like visuals in the listing. *Where:* App content → Target audience and content. *Who:* owner. *Size:* S.
- [ ] **D9. The other declarations in App content.**
  Answer each one: **Government app:** No. **Financial features:** none. **Health apps:** "My app doesn't provide any health features". **News app:** No. **Advertising ID:** No (after B4 confirms no `AD_ID` permission). **Privacy policy:** URL from A8. **Data deletion:** URL from A8. *Who:* owner. *Size:* S.

### E. Testing tracks

- [ ] **E1. Internal testing (optional but quick).**
  *Why:* lets you and 1–2 helpers install from Play within minutes, to catch problems before the clock starts on the closed test. Up to 100 testers by email list. *Where:* Play Console → Testing → Internal testing. *Who:* owner. *Size:* S.
- [ ] **E2. Closed testing with 12 or more testers for 14 days in a row.**
  *Why:* required for personal accounts created after 13 Nov 2023 before **Apply for production** unlocks. Testers must stay opted in for **14 consecutive days**, and 12 must still be opted in on the day you apply. People who opt out don't count, and the 14 days restart for anyone who leaves and rejoins. *What:* create a closed track, add testers by email list or Google Group, send them the opt-in link, and ask them to install and use the app daily (this is your Phase 8 pilot). Collect feedback through "Report a problem". *Who:* owner. *Size:* L (2+ weeks of calendar time).
- [ ] **E3. Fix pilot feedback, ship updates to the closed track.**
  *Why:* each new `.aab` needs a higher `versionCode` (handled by `autoIncrement`). *Who:* executor fixes, owner builds and uploads. *Size:* varies.
- [ ] **E4. Pre-launch report.**
  *Why:* Play tests your build on real devices automatically and flags crashes and accessibility issues. Review it after each closed-track upload. *Where:* Play Console → Testing → Pre-launch report. *Who:* owner (share findings with the executor). *Size:* S.

### F. Production

- [ ] **F1. Apply for production access.**
  *Why:* the personal-account gate. Google asks about your test (how you recruited testers, what feedback you got, what you changed). Keep notes during E2 so this is easy. *Where:* Play Console → Dashboard → Apply for production. *Who:* owner. *Size:* S (review can take days).
- [ ] **F2. Production release with a staged rollout.**
  *What:* promote the tested build, start at e.g. 20%, then go to 100%. Countries: Philippines (add others if needed). *Who:* owner. *Size:* S.
- [ ] **F3. Keep it compliant each year.**
  *Why:* Google raises the target API level every August (now API 36). Plan one Expo SDK upgrade a year. Re-check Data safety and the privacy policy whenever data collection changes (Phase 8 push token, Phase 9 chat messages). *Who:* executor and owner. *Size:* M per year.

---

## Notes for later

- **Sideloaded APKs and Android developer verification:** Google is rolling out developer verification for apps on certified Android devices. From 30 Sept 2026 it covers Brazil, Indonesia, Singapore and Thailand, and it goes global in 2027. The Philippines isn't in the first wave, but handing out APK files will get harder in 2027. Distributing through the Play closed or production track avoids this.
- **Supabase free-plan email:** sign-up sends a confirmation email. Supabase's built-in email sender has low rate limits, so if 15–20 testers sign up on the same day, some may wait. Spread out sign-ups, or confirm users from the dashboard. Not a Play requirement, but it affects the closed test.

---

## Sources (all checked 2026-11-04)

- Testing requirements for new personal accounts (12 testers, 14 days): https://support.google.com/googleplay/android-developer/answer/14151465
- Register a developer account (US$25 fee, ID, card, device verification): https://support.google.com/googleplay/android-developer/answer/6112435
- Personal vs organization accounts (D-U-N-S): https://support.google.com/googleplay/android-developer/answer/13634885
- Target API level (API 36 from 31 Aug 2026): https://developer.android.com/google/play/requirements/target-sdk
- Expo SDK 58 → compileSdk 37 / targetSdk 36: https://docs.expo.dev/versions/latest/
- Play App Signing and upload keys: https://developer.android.com/studio/publish/app-signing
- EAS Submit for Android: https://docs.expo.dev/submit/android/
- EAS app versions (`appVersionSource: remote`, `autoIncrement`): https://docs.expo.dev/build-reference/app-versions/
- Store listing text limits (30 / 80 / 4,000) and contact email: https://support.google.com/googleplay/android-developer/answer/9859152
- Graphic assets (icon 512×512, feature graphic 1024×500, screenshots): https://support.google.com/googleplay/android-developer/answer/9866151
- Prepare your app for review (privacy policy in listing and in app, ads, target audience, content rating, sign-in details): https://support.google.com/googleplay/android-developer/answer/9859455
- Target audience and content: https://support.google.com/googleplay/android-developer/answer/9867159
- Content ratings: https://support.google.com/googleplay/android-developer/answer/188189
- Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion requirement: https://support.google.com/googleplay/android-developer/answer/13327111
- Health apps declaration (all apps): https://support.google.com/googleplay/android-developer/answer/14738291
- Financial features declaration (all apps): https://support.google.com/googleplay/android-developer/answer/13849271
- Photo and video permissions policy: https://support.google.com/googleplay/android-developer/answer/14115180
- expo-image-picker permissions: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- expo-notifications (exact alarms, boot permission): https://docs.expo.dev/versions/latest/sdk/notifications/
- Google ML Kit data disclosure: https://developers.google.com/ml-kit/android-data-disclosure
- Android developer verification timeline: https://developer.android.com/developer-verification
- YouVersion Platform (terms link: https://platform.youversion.com/?tos=1; the page didn't render for the planner, so the owner must read it, see A4): https://platform.youversion.com/
- NewSpring reprinting and reposting rules: https://newspring.cc/reprinting-and-reposting
