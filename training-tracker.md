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
- DNS managed through **Cloudflare** (free tier, all records "DNS only" — GitHub Pages needs a direct connection, not proxied). Nameservers switched at Loopia to Cloudflare.
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
- `find_user_by_email(search_email)` — `security definer`, returns (user_id, display_name, avatar_url); used for friend search
- `get_friends_with_profiles()` — `security definer`, returns all friendships for the current user joined with profile data

---

## TODO / Next

### Rest timer alarm — sound + vibration (incl. background)
- Want an audible alarm (headphones/phone) and/or vibration when the rest timer ends, even while the user is in another app.
- **Reality check:** Backgrounded web pages are throttled/suspended (especially iOS Safari) — JS timers and Web Audio don't run reliably and a backgrounded tab generally can't vibrate or play sound. This is the same underlying constraint as the background-workout bug above.
- **Web-only partial options:** schedule a `Notification` via the service worker (supports a vibration pattern on Android), and pre-load/play an audio element on completion while foregrounded. Cross-app reliability on iOS is poor.
- **Robust solution:** ties to the native-app path (Capacitor) — local notifications + background audio can fire while the user is in another app.

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

### Native mobile app
From earlier discussion: the Supabase backend carries over fully. Lowest-effort path to the App Store / Play Store is **Capacitor** — wraps the existing web app in a native shell, so the current frontend ships largely as-is. (React Native/Flutter would be a rewrite.)

### Custom domain ✓ Done
- Live on **fittracker.se** via GitHub Pages + Cloudflare DNS, HTTPS enforced, PWA installable. See the "Deployment + custom domain" entry under Done.
- Still to come when we go native: privacy policy + support URLs (App Store / Play Store), Supabase auth email links, and native deep / universal links.

### Modernize — polish leftovers
- Smoother screen transitions and button press feedback
- Total-volume tracking on the progress page (line chart + best set already done)
- Consider a component structure if complexity grows
