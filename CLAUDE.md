# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Python (recommended)
python -m http.server 8000

# Node.js alternative
npx serve .
```

Open `http://localhost:8000`. PWA features (service worker, install prompt) require HTTPS in production.

The `test.html` page at `http://localhost:8000/test.html` provides manual LocalStorage validation and program data tests useful during development.

## Architecture

This is a **no-dependency vanilla JS PWA** using ES modules. There is no build step, no bundler, no framework, and no backend.

```
js/
├── main.js       # Entry point — instantiates TrainingApp, registers service worker
├── app.js        # TrainingApp class — all UI logic and screen management
├── programs.js   # Pure data: training program definitions and motivational quotes
└── storage.js    # LocalStorage wrapper — thin functions over the three storage keys
```

### TrainingApp class (`js/app.js`)

All UI logic lives here. Key responsibilities:

- **Screen navigation** — `showScreen(screenId)` toggles one `.screen.active` at a time. The four screens (`#main-menu`, `#workout-screen`, `#history-screen`, `#progress-screen`) are always present in the DOM; only visibility changes.
- **State** — All persistence is browser `localStorage` via three keys (managed in `js/storage.js`):
  - `training-workouts` — array of completed workout objects
  - `training-form-data` — auto-saved in-progress form inputs (survives refresh)
  - `training-workout-state` — full workout session state for 24-hour recovery
- **Timers** — workout timer runs at 1s intervals; rest timer at 100ms intervals for smooth circular progress animation using `conic-gradient`.

### Data model

```js
// Stored in training-workouts[]
{
  program: "chest-triceps",       // matches data-program attribute on button
  programName: "Chest & Triceps",
  date: "<ISO string>",
  duration: <ms>,
  exercises: [
    { name: "Bench Press", sets: [{ weight: "100", reps: "10" }] }
  ]
}
```

### Programs

Defined and exported from `js/programs.js`. The key matches the `data-program` attribute on `.program-btn` in `index.html` and the filter values in `#program-filter`. When adding/renaming a program, update all three: the `programs` object, the HTML button, and the history filter `<select>`.

### Styling conventions

CSS custom properties are declared on `:root` in `styles.css` — always use variables for colors rather than hardcoded values. The rest timer's circular countdown is rendered via `conic-gradient` on `.rest-timer-progress`; the JS updates the `background` property directly on that element.

## Rules

### Branch workflow

- **Never develop on `main`.** If the current branch is `main`, stop and ask the user to create or switch to a feature branch before writing any code.
- All work must be done on a feature branch (e.g. `feature/my-change`).
- `main` is the production branch — it deploys on every merge.

### Committing

- Commit at logical milestones (after a completed feature, bug fix, or self-contained refactor).
- After significant work, suggest a commit by showing the list of changed files and the intended commit message — wait for confirmation before executing.
- Commit messages must describe *what changed and why*, not just *what was done* (e.g. `feat: add rest timer` rather than `updated app`).
- Never add `Co-Authored-By` or any reference to Claude, Anthropic, or AI in commit messages.

### Pushing

- Always ask for explicit approval before running `git push`.
- Before pushing, present: the branch name, the commits that will be pushed, and any other Git actions (e.g. setting upstream).
- Never force-push without explicit user instruction.
- Never stage or push `.claude/` or any Claude-specific local files.

### Pre-action summary

Before any commit or push, state:
1. Which files are being staged
2. The exact commit message
3. The Git command(s) that will run

Wait for confirmation before proceeding.

---

## TODO

### Cloud-backed data persistence (Supabase)

All workout data is currently stored in `localStorage` which is lost if the user clears site data. The plan is to migrate to **Supabase** (free tier, PostgreSQL) so data survives across devices and browser resets.

Approach:
- Keep `js/storage.js` as the interface — swap localStorage calls for Supabase client calls there
- Add user authentication (Supabase Auth) so each user's data is isolated
- Keep localStorage as an offline fallback (write to both, read from Supabase when online)
- The data model maps cleanly to a `workouts` table matching the existing JSON structure

### Modernize the app

The current UI is functional but basic. Planned improvements:
- Smoother animations and transitions between screens
- Better visual feedback on interactions (haptic-style button press effects)
- Improved typography and spacing
- Enhanced progress charts (e.g. line charts, volume tracking)
- Consider a component-based structure if complexity grows

### Custom domain

Register and configure a custom domain for the app so it can be accessed via a proper URL instead of a GitHub Pages subdomain. Steps when ready:
- Purchase a domain (e.g. via Namecheap or Cloudflare)
- Point DNS to the hosting provider
- Enable HTTPS (required for PWA features like service worker and install prompt)
- Update `manifest.json` start URL and any hardcoded paths if needed

---

### Service Worker

`sw.js` uses a cache-first strategy with cache name `training-tracker-v2`. When adding new static assets or JS modules, add them to the `urlsToCache` array in `sw.js` and bump the cache version to force re-cache on update.
