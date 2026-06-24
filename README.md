# Training Tracker

A mobile-first Progressive Web App (PWA) for logging workouts, tracking sets and weights, and visualizing strength progression over time. No account needed — works offline and installs directly to your home screen.

## Features

- **7 training programs** — Chest & Triceps, Shoulder & Biceps, PullPass, Legs, Abs, Arms, Chest
- **Set logging** — record weight (kg) and reps per set, add or remove sets freely
- **Rest timer** — configurable countdown (30s–5min) with circular progress display
- **Workout timer** — tracks total session duration
- **Session recovery** — auto-saves in-progress workouts, restores them within 24 hours on reload
- **History** — browse all past workouts, filter by program, delete entries
- **Progress charts** — visualize max weight over time per exercise
- **Offline support** — fully functional without internet after first load

## Stack

Vanilla JS (ES modules) · CSS custom properties · PWA (service worker) · localStorage — no framework, no build step, no dependencies.

## Getting started

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Open `http://localhost:8000`. PWA install prompt appears automatically in Chrome/Edge on Android, and via Share → Add to Home Screen in Safari on iOS.

> **Note:** Service worker and install prompt require HTTPS in production.

## Project structure

```
├── index.html          # App shell — four screens, always in DOM
├── styles.css          # All styles, dark theme via CSS variables
├── manifest.json       # PWA metadata and icons
├── sw.js               # Cache-first service worker
└── js/
    ├── main.js         # Entry point — boots app, registers SW
    ├── app.js          # TrainingApp class — all UI and screen logic
    ├── programs.js     # Training program definitions (edit here to add exercises)
    └── storage.js      # localStorage wrapper for the three storage keys
```

## Customizing programs

Edit `js/programs.js` to add, rename, or remove programs and exercises. When changing a program key or name, also update the corresponding button in `index.html` and the filter `<select>` in the history screen.

## Data

All data is stored in `localStorage` under three keys:

| Key | Contents |
|-----|----------|
| `training-workouts` | Array of completed workout objects |
| `training-form-data` | Auto-saved in-progress form state |
| `training-workout-state` | Active session state for 24h recovery |

Data is tied to the browser — clearing site data will erase workouts. Cloud sync via Supabase is planned (see `CLAUDE.md`).

## Browser support

Chrome, Firefox, Safari, Edge (latest). PWA install: Chrome/Edge on Android, Safari 11.3+ on iOS.
