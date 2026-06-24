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

### Service Worker

`sw.js` uses a cache-first strategy with cache name `training-tracker-v2`. When adding new static assets or JS modules, add them to the `urlsToCache` array in `sw.js` and bump the cache version to force re-cache on update.
