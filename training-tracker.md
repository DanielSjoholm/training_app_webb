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

---

## Supabase resources (so we can reproduce / track schema)

**Tables** (all RLS-enabled, scoped to `auth.uid()`):
- `workouts` — program, program_name, date, duration, exercises (jsonb)
- `profiles` — id (= user id), name, birthdate, gender, height, current_weight, goal_weight, weekly_goal, avatar_url
- `weight_logs` — user_id, weight, date

**Storage:**
- `avatars` bucket (public read; insert/update restricted to a user's own `{user_id}/` folder)

**Functions:**
- `delete_user()` — `security definer`, deletes the calling user's `auth.users` row (cascades to all tables)

---

## TODO / Next

### Social — friends and sharing
Add friends and view their workouts.
- `friendships` table in Supabase with `user_id`, `friend_id`, status (pending/accepted)
- RLS policy allowing users to read a friend's workouts once the friendship is accepted
- UI: search by email, send/accept/decline friend requests
- New "Friends" view listing friends' latest workouts (read-only)
- Optional: toast when a friend saves a workout (Supabase Realtime subscription)

### Units toggle (kg/lbs, cm/in)
Deferred from the Settings work. Let users switch measurement system; store the preference and convert display values.

### Native mobile app
From earlier discussion: the Supabase backend carries over fully. Lowest-effort path to the App Store / Play Store is **Capacitor** — wraps the existing web app in a native shell, so the current frontend ships largely as-is. (React Native/Flutter would be a rewrite.)

### Custom domain
- Buy a domain (e.g. Namecheap or Cloudflare)
- Point DNS at the host
- Enable HTTPS (required for PWA service worker + install prompt)
- Update `manifest.json` start URL / any hardcoded paths if needed

### Modernize — polish leftovers
- Smoother screen transitions and button press feedback
- Enhanced progress charts (line charts, total-volume tracking)
- Consider a component structure if complexity grows
