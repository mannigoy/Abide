# Abide: Google Play Data safety answers (DRAFT for the owner to review)

> **Draft only.** The owner enters these in Play Console → Policy → App content → Data safety.
> Based on the code as of 2026-11-04 (before Phase 8 reminders and Phase 9 chat). **Re-check when either ships:**
> a stored push token adds "Device or other IDs → App functionality", and chat adds "Messages → Other in-app messages" with free text.
> Also re-read Google's ML Kit disclosure (https://developers.google.com/ml-kit/android-data-disclosure) just before submitting.
> **Update 2026-11-05:** Phase 8 now stores a push token (`profiles.push_token`) and the reminder time. Add **Device or other IDs → collected, not shared, App functionality, required for encouragement alerts**. The reminder time falls under App activity / app functionality.
> Delete-account URL: https://mannigoy.github.io/Abide/delete-account.html (once GitHub Pages is on).

## Section 1: Data collection and security

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Accounts, check-ins, notes, ML Kit diagnostics. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | All traffic to Supabase and YouVersion (through our Edge Function) is HTTPS. ML Kit uses HTTPS. |
| Do you provide a way for users to request that their data is deleted? | **Yes** | In-app: Profile → Delete my account (`delete_my_account()` database function). Web: [DELETE ACCOUNT URL]. |

## Section 2: Data types

"Collected" = sent off the phone to us or a service provider. "Shared" = given to a third party that isn't a service provider. Abide shares nothing: Supabase, Google (ML Kit) and Expo are service providers, YouVersion receives no user data, and overseers or friends seeing someone's status is part of the app working for those users (Google doesn't count user-initiated, in-app visibility as sharing).

"Processed ephemerally" = No for everything stored in the database, since it is kept until the account is deleted.

| Play category → data type | What in Abide | Collected | Shared | Ephemeral | Required or optional | Purposes |
|---|---|---|---|---|---|---|
| Personal info → **Name** | `profiles.full_name` | Yes | No | No | Required | App functionality, Account management |
| Personal info → **Email address** | Supabase Auth sign-in email | Yes | No | No | Required | Account management |
| Personal info → **User IDs** | account id, `friend_code` | Yes | No | No | Required | App functionality, Account management |
| App activity → **App interactions** | check-in dates and passages, plan progress, highlights (verse reference + colour), friendships, group memberships | Yes | No | No | Required | App functionality |
| App activity → **Other user-generated content** | Read/Reflect/Respond notes (typed or reviewed scan text), highlight notes, "Report a problem" messages | Yes | No | No | Optional | App functionality |
| Messages → **Other in-app messages** | encouragements (a fixed set of kinds, no free text) | Yes | No | No | Optional | App functionality |
| App info and performance → **Diagnostics** | Google ML Kit usage and performance data | Yes | No | No | Required* | Analytics |
| Device or other IDs → **Device or other IDs** | ML Kit per-install identifier | Yes | No | No | Required* | Analytics |

\* ML Kit sends this whenever text recognition is used, and the user can't turn it off. If the owner prefers, these can be marked "Optional" because the notebook scan feature itself is optional. Either is defensible; "Required" is the cautious choice.

### Not collected (answer "No")

| Data type | Why not |
|---|---|
| **Photos and videos** | Notebook photos are processed on the phone by ML Kit and deleted (`src/lib/notebook-scan.ts`). They are never uploaded or saved. On-device-only processing isn't "collection" in Play's definition. |
| Location (approximate, precise) | Not used. No location permission. |
| Contacts, Calendar | Not used. |
| Financial info, Health and fitness | Not used. |
| Files and docs | Not used. |
| Web browsing, Search history | Not used. |
| Audio | Not used. `RECORD_AUDIO` is blocked in `app.json`. |
| Installed apps | Not used. |
| Personal info → phone number, address, race, religious beliefs, other info | Not collected as fields. **Note for the owner:** Play lists "Religious or political beliefs" under Personal info. Abide doesn't ask for anyone's beliefs, but using a church Bible app could be seen as implying them. The planner's table didn't include it. Most Bible apps answer No, since no belief data field is collected. Decide and note your choice here. |
| Advertising ID | Not used. `com.google.android.gms.permission.AD_ID` is blocked in `app.json` (plan item B4). |

## Section 3: Other App content answers that depend on this

- **Advertising ID declaration:** "No, my app doesn't use advertising ID".
- **Ads:** No ads.
- **Privacy policy URL:** [PRIVACY POLICY URL]
- **Data deletion URL:** [DELETE ACCOUNT URL]

## Android permissions in the build (from plan item B4, 2026-11-04)

From `npx expo config --type introspect` plus the library manifests that get merged at build time:

| Permission | From | Notes |
|---|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | React Native, expo-image, ML Kit | Normal permissions, no user prompt. |
| `CAMERA` | expo-image-picker | Asked for only when the user taps "Take a photo". |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (max SDK 32) | expo-image-picker, expo-file-system | Only on Android 12 and older. Ignored on Android 13+. |
| `VIBRATE` | Expo template | Normal permission, no user prompt. |
| Blocked (`tools:node="remove"`) | `app.json` | `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `AD_ID` |

Gallery picking on Android 13+ uses the system photo picker, which needs no permission.
