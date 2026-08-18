# Training Tracker — Project Log

Running record of what's been built and what's next. Update this at the end of each working session so the next one has full context. See `CLAUDE.md` for architecture and working rules.

---

## Done

### Codebase structure
- Split the original monolithic `app.js` into ES modules under `js/` (`main.js`, `app.js`, `programs.js`, `storage.js`, later `config.js`, `supabase.js`, `auth.js`). No build step — plain ES modules loaded via `<script type="module">`.
- Removed unused files (old `requirements.txt`, `test.html`, a stray git artifact) and modernized `README.md`.

### Cloud backend (Supabase)
- Email/password authentication. Each user's data is isolated via Row Level Security.
- Workouts stored in the cloud (`workouts` table); `localStorage` kept as an offline cache/fallback.
- **Email confirmation is currently disabled** in Supabase Auth settings (for easy testing). Re-enable before real launch.

### Professional redesign
- Replaced the blue/navy gradient + emoji look with a neutral charcoal/zinc palette and a single restrained accent.
- Removed all emojis app-wide; refined typography, spacing, program cards (category labels), and centered content with a max-width for desktop.

### In-app confirm modal
- Replaced the browser's native `confirm()` dialogs with a custom, styled, promise-based modal (`showConfirm`) used for leave-workout, save, delete, log out, resume, and delete-account.

### Account menu + Profile
- Avatar (default anonymous icon) in the header opens a dropdown: Profile · Settings · Log out.
- **Display name** field added to sign-up.
- Profile page: basics (name, birthdate, gender), body metrics (height, current weight), goals (goal weight, sessions/week), and a weight-over-time chart.
- Avatar photo upload with square cropping (Cropper.js loaded from CDN), stored in Supabase Storage.

### Settings
- Light/dark theme toggle (saved in `localStorage`, applied pre-render to avoid flash).
- Change password.
- Delete account (calls a `security definer` SQL function, cascades all user data).

### Program tweaks + resume bug fix
- Added standalone **Shoulder** (Shoulder Press, Lateral Raise, Reverse Flies) and **Glutes** (Hip Thrusters, Bulgarian Split Squat, Romanian Deadlift) programs.
- Corrected the **Arms** category label to Push / Pull.
- Fixed the bug where an in-progress workout was lost when backgrounding the app: `onAuthStateChange` now ignores `SIGNED_IN` on resume/token-refresh (same user) and only resets state on a genuine new login/logout.

### Customizable workouts + exercise variants
- New master **exercise catalog** (`js/exercises.js`) — every exercise tagged with muscle group(s); cable/equipment exercises carry variants (e.g. Triceps Pushdown → Bar / Rope / Handle).
- In a workout you can **remove** exercises (✕) and **add** from a picker filtered to the program's muscle groups; variant exercises prompt for the attachment.
- The customised list is **saved per program per user** (`profiles.program_exercises` jsonb) and becomes that program's new default next time.
- Program defaults and the workout-resume state were aligned to catalog names and now carry the exercise list.

### Social — friends and sharing
- `friendships` table + 3 security-definer functions (`are_friends`, `find_user_by_email`, `get_friends_with_profiles`) in Supabase
- RLS on `workouts` extended so accepted friends can read each other's workouts
- Friends screen accessible from the avatar dropdown; search by email, send/accept/decline requests, remove friends
- Friend cards expand inline to show their 5 latest workouts (lazy-loaded)
- Pending-request badge on the Friends menu item

### Progress page — line chart + best set
- Replaced the bar chart with a hand-built SVG line chart (no external library): grid lines, polyline, dots, date/weight labels, and a click-to-reveal tooltip per point.
- Summary now shows the **best set** (weight × reps) instead of just best weight.

### Deployment + custom domain
- Deployed via **GitHub Pages**; custom domain **fittracker.se** (CNAME committed).
- **Registrar: Loopia** — domain is purchased/renewed there. Expires **2027-06-25**.
- **DNS: Cloudflare** (free tier, all records "DNS only" — GitHub Pages needs a direct connection, not proxied). Nameservers were switched at Loopia to point to Cloudflare (`lex.ns.cloudflare.com`, `gene.ns.cloudflare.com`), so all DNS record changes (A/CNAME etc.) happen in the Cloudflare dashboard, not Loopia.
- "Enforce HTTPS" enabled in GitHub Pages settings (required for the PWA service worker + install prompt).
- `manifest.json` `start_url` is the absolute `https://fittracker.se/`; service worker caches assets relative to `self.registration.scope` so it works on the custom domain.
- PWA installs to the Android home screen from the live site.

### Rebrand — FitTracker
- Logo mark changed from "TT" to "FT" (auth screen + main-menu header, and the base64 SVG app icons in `manifest.json`).
- Main-menu header now reads **FitTracker**; the auth/login screen keeps "Training Tracker".

### Visual theme — gym background + transparent UI
- Gym photo background fixed behind all screens via a `.bg-wrap` element (`background-size: cover`). The source image had baked-in black letterbox bars that showed on narrow viewports; cropped to `images/gym_v2.png`.
- Light theme swaps to a brighter gym photo (`images/gym_light.jpg`) with a white wash so dark text stays readable.
- Cards/boxes throughout (program buttons, auth card, settings sections, account dropdown, and all workout boxes) are semi-transparent with a light border + backdrop blur, with per-theme overrides so both dark and light stay legible.
- Dark theme remains the default for all users; light is opt-in via Settings (stored in `localStorage` per device).

### Global account menu
- The avatar + dropdown (Profile · Friends · Settings · Log out) moved out of the main-menu header into a single global, fixed top-right element shown on every screen **except** the auth screen and during an active workout.

### Two-level exercise variants
- Exercises can now carry an optional `subVariants` second choice asked after the variant. Example: **Cable Curl** → attachment (Bar/Rope/Handle) → direction (Front/Back), saved as e.g. `Cable Curl (Handle, Front)`.
- Added Hammer Curl equipment variants (Dumbbell/Cable) and a new **Chest Supported T-Bar Row** (back / PullPass).

### Preacher Curl equipment variants
- Added `variants: ['Barbell', 'Dumbbell', 'Machine – Single Arm', 'Machine – Both Arms']` to Preacher Curl. Flat list rather than a `subVariants` second step, since only the machine option needs the single/both-arm split.

### Supersets
- Any exercise card has a superset control (⇅ button) that opens a picker listing both exercises already in the workout and the catalog (with the usual variant/subVariant steps); picking one links the two.
- Linked exercises are automatically reordered to sit next to each other (both in `workoutExercises` and the DOM), and a pair of connector-arrow icons is rendered between the two cards to make the link visually obvious. A badge on each card shows the partner's name with an unlink (✕) control.
- Pairs only (no giant sets), and it's session-scoped/visual only — not persisted to the saved workout record, and doesn't change rest-timer or set-logging behavior.
- Superset state survives the 24h workout-resume snapshot (`supersetPairs` added to `saveWorkoutState`), but resets when a new workout is opened.

### Per-exercise history (replacing the single "Last Workout" block)
- Removed the old combined last-workout block shown once above the exercise list.
- Each exercise card now shows its own "Last <date> · weight × reps" line, sourced from the most recent workout — **any program** — containing that exact exercise name. So e.g. Bench Press history shows up whether it was last logged under Chest & Triceps or Chest alone.

### Service worker — immediate activation
- Added `self.skipWaiting()` (install) and `self.clients.claim()` (activate) so a newly deployed version takes over on next load instead of waiting for every client to fully close — this was blocking updates from reaching the installed home-screen PWA, which has no way to hard-refresh.

### Transparent UI — History, Progress, and nav buttons
- `.workout-card` (History), `#progress-chart` / `.progress-summary` (Progress), and `.nav-btn` (History/Progress buttons on the main menu) now use the same semi-transparent glass style as `.exercise-entry` / `.program-btn` / `.settings-section`, with matching light-theme overrides. They previously used the old solid surface color, standing out against the transparent theme everywhere else.

### Machine brand selection
- Picking a machine exercise now asks for the machine **brand** so history is tracked per machine. Brands: `machineBrands` in `exercises.js` — Thor, Hammer Strength, Life Fitness, Hoist, Gymleco, TechnoGym, Other.
- Two ways it triggers: (1) machine-only exercises flagged `machine: true` go straight to the brand step → `Hack Squat (Life Fitness)`; (2) any variant starting with `Machine` (e.g. `Machine`, or Preacher Curl's `Machine – Single Arm`) asks the brand after it's chosen → `Shoulder Press (Machine, Hoist)`. Handled by `showBrandStep()` in `app.js`.
- Flagged `machine: true`: Chest Press, Incline Chest Press, Wide Machine Row, Hack Squat, Leg Press, Leg Extension, Lying/Seated Leg Curl, Seated Calf Raise, Glute Machine, Hip Abduction. **Pec Deck** now has `variants: ['Machine', 'Cable']` (Machine → brand, Cable → no brand).

### Chest exercise consolidation
- Collapsed the five free-weight bench duplicates into one **Bench Press** entry using the two-level picker: `variants: ['Barbell', 'Dumbbell']` (equipment) → `subVariants: ['Flat', 'Incline', 'Decline']` (angle) → e.g. `Bench Press (Barbell, Incline)`. Removed the standalone Incline/Decline Bench Press, Dumbbell Bench Press, and Incline Dumbbell Press.
- Renamed the machine presses to drop the redundant "Machine" prefix (they're `machine: true`, so they jump straight to brand anyway): `Machine Chest Press` → **Chest Press**, `Machine Incline Press` → **Incline Chest Press**.
- Updated `programs.js` defaults to the new names (`chest-triceps`: Bench Press (Barbell, Flat) + Bench Press (Barbell, Incline); `chest`: Chest Press, Incline Chest Press).

### Friend search showed "Unknown" — profiles.name sync
- **Bug:** searching for a friend by email returned "Unknown", and searching by name returned nothing, for users who had signed up but never opened/saved the Profile page (e.g. Adam).
- **Root cause:** signup only writes the name to `auth.users.raw_user_meta_data.display_name` (`auth.js` `signUp`). `public.profiles.name` stays NULL until the user saves their profile. The friend-search functions read `profiles.name`, so a NULL there shows as "Unknown" (email search) or no match (name search). Not an app-code bug — a data/backend gap.
- **Fix (run in Supabase SQL editor, not in the repo):**
  - One-time **backfill** copying `display_name` → `profiles.name` for existing users whose name is blank.
  - **Trigger** `fill_profile_name` (`before insert on public.profiles`, `security definer`) that fills `name` from the auth metadata whenever a profile row is created, so future signups are searchable without saving the profile first. Chosen over hardening each search function because several functions read `profiles.name` (search + friend list) — fixing the column fixes them all.
  - Run the backfill and the trigger block in **separate SQL tabs** — the editor runs a tab as one transaction, so an error in the trigger DDL rolls back the backfill in the same tab (this is what silently blocked the first attempt).
- SQL for both is in "Supabase resources → Triggers" below.

### Exercise catalog cleanup (dedup + naming)
- Merged the duplicate `Rope Crunch` / `Cable Crunch` into one **Cable Crunch** with `variants: ['Rope', 'Bar']` (abs default now seeds `Cable Crunch (Rope)`).
- Renamed for clarity / consistency: `Leg Raises` → **Lying Leg Raise** (was ambiguous vs Hanging Leg Raise), `Squats` → **Squat** (matches Front/Hack Squat), `Hip Thrusters` → **Hip Thrust**, `Toes To Bar` → **Toes to Bar**. `programs.js` defaults updated to match.
- Left intentionally: `Glute Machine` (vague but kept), `Reverse Flies` vs `Cable Fly` spelling, and the `back` program's "PullPass" name.

### New machine brand + Machine Row exercise
- Added **Bcube** to `machineBrands` in `exercises.js`.
- Added a new **Machine Row** exercise (back program) as its own catalog entry, separate from the existing **Wide Machine Row** — both `machine: true`.

### Rest timer alarm — louder + stronger vibration
- `playRestCompleteSound()`: peak gain raised 0.25 → 0.8, note duration 0.15s → 0.3s, and a triangle-wave harmonic layer added on top of the sine tones so the chime cuts through background music better.
- Vibration pattern lengthened `[200, 100, 200]` → `[300, 100, 300, 100, 300]`.
- Foreground-only limitation is unchanged (see TODO) — this only improves the alarm while the app is open and audible.

### Fixed spurious "reload site?" prompt on resume
- **Bug:** every time the app was reopened (esp. the installed home-screen PWA — Android reclaims its backgrounded process more aggressively than a browser tab), Chrome showed its native "Vill du läsa in webbplatsen igen?" reload-confirmation dialog before the app would load.
- **Root cause:** a `beforeunload` handler in `setupPageProtection()` (`js/app.js`) blocked any reload while a workout was active — including reloads the browser itself initiated after discarding the tab for memory.
- **Fix:** removed the `beforeunload` guard entirely. Safe because the active workout already autosaves every second and fully restores via `restoreWorkoutState()`.

### Auto-resume active workout instead of prompting
- **Bug (follow-on from the fix above):** removing the reload block meant reloads happen far more often, and each one triggered a "Resume workout?" confirm dialog (Discard/Resume) that the user had to tap through every time, instead of landing back exactly where they were.
- **Fix:** `checkForActiveWorkout()` now calls `restoreWorkoutState()` silently (no prompt) when the saved session is under 24h old, and discards it if older. `exitWorkout()` (the in-app back-button "Leave workout?" flow, unchanged) now also clears the saved state once the user confirms leaving, so an intentionally-abandoned workout doesn't get silently resumed on the next reopen.

### Sessions per week/year chart (Profile)
- New chart on the Profile screen, directly below Weight over time, sharing the same hand-built SVG line-chart style. A Week/Year segmented toggle (`.chart-toggle`) switches between:
  - **Week** — session count per week, last 8 weeks (`getWeeklySessionCounts`).
  - **Year** — session count per calendar month, Jan–Dec of the current year (`getMonthlySessionCounts`).
- **Session merging:** back-to-back workout entries on the same day (e.g. Abs immediately followed by another program) count as **one** session; a real gap (e.g. morning vs evening) counts as **two**. Implemented in `getDistinctSessions()` — entries merge when the next one starts within 4 hours of the previous one ending.

### Native Android app (Capacitor) — real fix for the background rest-timer alarm
- **Why:** the rest-timer alarm relies on a `setInterval` in the page; the OS fully freezes JS in a backgrounded/locked tab, so on the plain web/PWA the alarm can only ever fire *after* you return to the app, never while you're actually away (see the "background reliability" TODO above — this only fixes it inside the native app, not the browser/installed-PWA case).
- **Setup:** added Node tooling to the repo for the first time (`package.json`, `node_modules/` — gitignored) purely to run the Capacitor CLI; the web app itself is still a plain no-build ES module PWA, unaffected.
- `capacitor.config.json`: `appId` **se.fittracker.app**, loads the **live site** (`https://fittracker.se`) directly in the native WebView via `server.url`, rather than bundling a local copy of the web assets — the native app always reflects whatever is currently deployed, no separate native release needed for web-only changes. `www/index.html` is an unused placeholder Capacitor's CLI requires a `webDir` to exist.
- `android/` — the generated native project (`npx cap add android`). Default Capacitor icons/splash screen, not yet customized.
- Installed `@capacitor/local-notifications` + `@capacitor/haptics`. In `js/app.js`: `setupRestNotifications()` (requests permission + creates the `rest-timer` notification channel, called once from `init()`), `scheduleRestNotification()` / `cancelRestNotification()` (wired into `startRestTimer()`, `stopRestTimer()`, `extendRest()`). All are no-ops via `Capacitor.isNativePlatform()` when not running in the native app, so the web/PWA behavior is untouched.
- **Verified on-device:** alarm fires correctly whether the app is merely backgrounded or the phone is fully locked/screen-off.
- **Local dev/test workflow** (since the app loads the live site, not local files): temporarily point `capacitor.config.json`'s `server.url` at `http://<your-LAN-IP>:8000` with `cleartext: true`, run `python -m http.server 8000` bound to all interfaces, `npx cap sync android`, rebuild (`gradlew assembleDebug` in `android/`), install (`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`) — phone and PC must be on the same WiFi. **Revert `server.url` back to the production URL before committing/shipping.**
- **Machine-specific one-time setup** (not part of the repo): Android Studio + SDK installed to `C:\Android` (default path under the Windows profile folder had non-ASCII characters — `ö` — which breaks native build tooling); `ANDROID_HOME`/`ANDROID_SDK_ROOT` user env vars set to `C:\Android`; `~/.gradle/gradle.properties` pins `org.gradle.java.home` to Android Studio's bundled JBR (`...\Android Studio\jbr`), since the system's own JDK 17 install failed to compile against the Java 21 source level the current Android Gradle Plugin targets.
- Samsung phones (this project's test device, a Galaxy S25 FE) additionally required disabling **"Automatisk blockerare" / Auto Blocker** (Settings → Security and privacy) before USB debugging would connect — it blocks USB debugging by default. Safe to re-enable after development.

---

## Supabase resources (so we can reproduce / track schema)

**Tables** (all RLS-enabled, scoped to `auth.uid()`):
- `workouts` — program, program_name, date, duration, exercises (jsonb); SELECT also allowed for accepted friends
- `profiles` — id (= user id), name, birthdate, gender, height, current_weight, goal_weight, weekly_goal, avatar_url, program_exercises (jsonb: per-program custom exercise lists)
- `weight_logs` — user_id, weight, date
- `friendships` — requester_id, addressee_id, status (pending/accepted); UNIQUE on (requester_id, addressee_id)

**Storage:**
- `avatars` bucket (public read; insert/update restricted to a user's own `{user_id}/` folder)

**Functions:**
- `delete_user()` — `security definer`, deletes the calling user's `auth.users` row (cascades to all tables)
- `are_friends(user_a, user_b)` — `security definer`, returns bool; used by workouts RLS policy
- `find_user_by_email(search_email)` — `security definer`, returns (user_id, display_name, avatar_url); joins `profiles` on `auth.users`, matches by lower/trimmed email, excludes the caller. `display_name` comes from `profiles.name`.
- `find_users_by_name(search_name)` — `security definer`, returns (user_id, display_name, avatar_url); name search over `profiles.name`. Used by friend search.
- `get_friends_with_profiles()` — `security definer`, returns all friendships for the current user joined with profile data

**Triggers:**
- `fill_profile_name` on `public.profiles` (`before insert`, `security definer`) — populates `name` from `auth.users.raw_user_meta_data->>'display_name'` when a profile row is created, so users are findable in friend search before they ever save their profile. See the "Friend search showed 'Unknown'" entry under Done.

```sql
-- One-time backfill for existing users (run alone in its own tab):
update public.profiles p
set name = u.raw_user_meta_data->>'display_name'
from auth.users u
where p.id = u.id
  and coalesce(p.name, '') = ''
  and coalesce(u.raw_user_meta_data->>'display_name', '') <> '';

-- Trigger for future signups (run alone in its own tab):
create or replace function public.fill_profile_name_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.name, '') = '' then
    select nullif(u.raw_user_meta_data->>'display_name', '')
      into new.name
    from auth.users u
    where u.id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists fill_profile_name on public.profiles;
create trigger fill_profile_name
  before insert on public.profiles
  for each row execute function public.fill_profile_name_from_auth();
```

---

## TODO / Next

### Rest timer alarm — background reliability ✓ Done for the native Android app
- **Fixed in the native app** via `@capacitor/local-notifications` — see "Native Android app (Capacitor)" under Done. Verified working with the app merely backgrounded and with the phone fully locked.
- **Still unresolved on the plain web/installed-PWA path** (browser tab, or "Add to Home Screen" without the native wrapper): the rest-timer alarm relies on a `setInterval` in the page, which the OS fully freezes while backgrounded — Web Audio and `navigator.vibrate()` can't run during that time, so the alarm only ever fires *after* returning to the app. Foreground alarm is louder/longer with a richer tone and stronger vibration (see "Rest timer alarm — louder + stronger vibration" under Done), but that's a foreground-only improvement.
- **Also unfixable from web code:** iOS's physical silent switch mutes Web Audio regardless of in-app volume.
- **Web-only partial option, not implemented:** schedule a `Notification` via the service worker (supports a vibration pattern on Android even when backgrounded) — would only help Android web/PWA users, not iOS, and not as reliably as the native local-notifications approach.

### Social — friends and sharing ✓ Done
- `friendships` table with `requester_id`, `addressee_id`, `status` (pending/accepted), RLS-secured
- `are_friends()` and `find_user_by_email()` and `get_friends_with_profiles()` security-definer functions
- RLS policy on `workouts` allowing accepted friends to read each other's workouts
- Friends accessible via avatar dropdown (Profile · Friends · Settings · Log out)
- Search by email, send/accept/decline requests, remove friends
- Friend cards expand to show their 5 most recent workouts (lazy-loaded)
- Pending-request badge on the Friends menu item
- **Remaining optional:** real-time toast when a friend saves a workout (Supabase Realtime)

### Units toggle (kg/lbs, cm/in)
Deferred from the Settings work. Let users switch measurement system; store the preference and convert display values.

### Native mobile app — Android started, not yet distributed
- Android side scaffolded via **Capacitor** — see "Native Android app (Capacitor)" under Done. Currently sideloaded for personal use only (debug build via `adb install`), not signed for release or published anywhere.
- **Remaining for real distribution:** a signed release build (keystore), default Capacitor icon/splash need replacing with real branding, and a Google Play Developer account ($25 one-time) if publishing to the Play Store — not required just to keep using it on your own device.
- **iOS not started.** Same Capacitor project can add an `ios` platform later, but needs a Mac to build, plus an Apple Developer account ($99/year) for any distribution beyond a 7-day free-provisioning sideload.

### Custom domain ✓ Done
- Live on **fittracker.se** via GitHub Pages + Cloudflare DNS, HTTPS enforced, PWA installable. See the "Deployment + custom domain" entry under Done.
- Still to come when we go native: privacy policy + support URLs (App Store / Play Store), Supabase auth email links, and native deep / universal links.

### Modernize — polish leftovers
- Smoother screen transitions and button press feedback
- Total-volume tracking on the progress page (line chart + best set already done)
- Consider a component structure if complexity grows
