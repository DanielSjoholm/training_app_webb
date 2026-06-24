# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Python (recommended)
python -m http.server 8000

# Node.js alternative
npx serve .
```

Open `http://localhost:8000`. PWA features (service worker, install prompt) require HTTPS in production. Auth and cloud data require a network connection (Supabase); the app falls back to cached `localStorage` data when offline.

See `training-tracker.md` for the running log of what's built, the Supabase schema, and the TODO backlog.

## Architecture

This is a **vanilla JS PWA** using ES modules with a **Supabase backend** (auth, Postgres, storage). There is no build step, no bundler, and no framework. The only external dependencies are loaded at runtime from a CDN: the Supabase client and Cropper.js (avatar cropping).

```
js/
├── main.js       # Entry point — instantiates TrainingApp, registers service worker
├── app.js        # TrainingApp class — all UI logic and screen management
├── programs.js   # Pure data: training program definitions and motivational quotes
├── storage.js    # Data layer — localStorage cache + Supabase reads/writes (workouts, profile, weight logs, avatar)
├── supabase.js   # Creates the Supabase client
├── config.js     # Supabase URL + publishable key (safe to commit; secured by RLS)
└── auth.js       # Auth helpers — sign in/up/out, session, password update, account deletion
```

### TrainingApp class (`js/app.js`)

All UI logic lives here. Key responsibilities:

- **Screen navigation** — `showScreen(screenId)` toggles one `.screen.active` at a time. All screens (`#auth-screen`, `#main-menu`, `#workout-screen`, `#history-screen`, `#progress-screen`, `#profile-screen`, `#settings-screen`) are always in the DOM; only visibility changes. On load, the session decides whether to show auth or main menu.
- **State** — Workouts and profile data live in Supabase (per-user, RLS-enforced), with `localStorage` as an offline cache. `localStorage` also holds transient state via three keys:
  - `training-workouts` — cached copy of the user's workouts
  - `training-form-data` — auto-saved in-progress form inputs (survives refresh)
  - `training-workout-state` — full workout session state for 24-hour recovery
  - `training-theme` — light/dark preference (applied pre-render by an inline script in `index.html`)
- **Timers** — workout timer runs at 1s intervals; rest timer at 100ms intervals for smooth circular progress animation using `conic-gradient`.
- **Dialogs** — `showConfirm()` renders a custom promise-based modal; native `confirm()` is not used.

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

### Service Worker

`sw.js` uses a cache-first strategy with a versioned cache name (e.g. `training-tracker-v10`). When adding new local static assets or JS modules, add them to the `urlsToCache` array in `sw.js` **and** bump the cache version to force re-cache on update. (CDN dependencies like Supabase and Cropper.js are not cached locally.)

## Status & backlog

What's been built, the Supabase schema, and the TODO backlog live in `training-tracker.md`. Keep it updated at the end of each session.
