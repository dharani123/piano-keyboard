# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Desk Piano: a React + Vite app for practising piano on a computer keyboard. It has lessons, ear training, falling-notes songs, Carnatic varisais and sheet reading. All sound is synthesised with Web Audio; there is no backend beyond a small dev-server plugin. The code is plain JS/JSX (no TypeScript).

## Commands

```sh
npm install
npx vite --port 5173                     # dev server (http://localhost:5173)
npm run build                            # production build to dist/
npm test                                 # all tests once (vitest run)
npx vitest run src/songs/player.test.js  # one test file
npx vitest run -t "dChordThird"          # tests matching a name
```

There is no linter or formatter configured. Tests sit next to the code as `*.test.js` and cover logic modules only; there are no component tests.

## Architecture

**Pure logic vs. UI.** Logic that can be tested lives in plain modules (`src/ear`, `src/lessons`, `src/songs`, `src/sheet`, `src/data`) and components in `src/components` stay thin. Keep Web Audio out of tested code: `VoiceManager` is free of it on purpose, and `engine.js` injects its start/stop functions.

**The `piano` object.** `App.jsx` owns all playing state and passes a single `piano` prop down through `Lessons` to every exercise and mode. This is the contract between the instrument and the learning features:
- `subscribe(fn)` delivers every note played, with `{ semitone, octave, code, time, held, chordFilled }`.
- `setHighlight` lights keys, `setStatus` writes to the display, and `getHeld` returns the keys held now.
- `setLayout` lets a song tab force a keyboard layout (it overrides the player's Shift setting; pass `null` to release).
- `lockTranspose` returns its unlock function, so it can be an effect's cleanup.
- `onStartStop(fn)` gives the left Shift key (tapped alone) to the open song tab, and returns its release function, also for an effect's cleanup.
- `slot`, `fallSlot` and `playSlot` are DOM elements in the instrument that features render into through portals.

**Tabs.** `src/components/lessons/Lessons.jsx` is the tab shell. `Course` runs both the Lessons and Sheet Reading tabs from different data. `SongsMode` serves the Western, Decoded and Carnatic (Practice) tabs through its `kind` prop. `RelaxMode` is Carnatic (Relax). `Course` also runs the Scales tab from `src/scales/curriculum.js` (24 units, one per major and minor scale); its lessons carry a `layout` that `LessonPage` forces while they are open. `Course` also runs the Ear Training tab from `src/eartraining/curriculum.js` (basic swara patterns, Sa = C: pattern lessons fall like Relax through `FlowExercise` and `src/eartraining/flow.js`, flowing on to the unit's last pattern; Identify 1 to 4 notes play random swaras and ask for the matching graph; Play it back 1 to 4 notes (`PlaybackExercise`, `src/eartraining/playback.js`) waits until your last notes match; every lesson is `unscored`, with no stars or mistakes). Each unit's lessons sit in sections (Patterns, Identify Notes, Play It Back) shown as numbered subheadings. The Ear Gym tab was removed (2026-11-09) and the Identify Notes tab too (2026-11-17, Ear Training covers it); `src/components/ear/EarGym.jsx` and `src/identify/` are still there but unused.

**Content is data.**
- Courses are `UNITS`/`LESSONS` in `src/lessons/curriculum.js` and `SHEET_UNITS`/`SHEET_LESSONS` in `src/sheet/curriculum.js`. The header comments in those files document the theory block and exercise types.
- Songs are pattern strings in `src/songs/library.js`; the syntax is documented in `src/songs/parse.js` (`"C E G/2 | C,E,G/4 r"`).
- Instruments are data in `src/audio/instruments.js`, whose header documents every field. `engine.js` turns them into Web Audio nodes, and `pluck.js` renders the plucked and veena samples.

**Keyboard layouts.** `src/data/keymap.js` defines layout shifts: `SHIFTS` is `[0, 2, -2, 1, -1]`. Songs pick the first layout that fits, so that order matters. The tests enforce that exercises stay playable, so check them when adding content that uses new notes. In the default layout the range is B3 (on `A`, added 2026-11-09) to high F.

**Progress storage.** All state lives in `desk-piano-*` localStorage keys. `src/storage/fileSync.js` patches `Storage.prototype` to mirror them through the `/__progress` plugin in `vite.config.js` into `saved-progress.json`, which is committed so progress follows the user between machines.
- `main.jsx` runs this sync and only then dynamically imports and renders `App`, so that nothing reads localStorage before the file has been loaded into it.
- On load, the file wins over the browser.
- Keys in `BROWSER_ONLY` are never synced. That covers imported songs (the repo is public and they may transcribe copyrighted recordings) and the current place in the app (it changes on every click, and syncing it would make reloads jump back). Add new high-churn or private keys there.
- The dev server rewrites `saved-progress.json` while you use the app, so it often shows as modified. Only include it in a commit when that is intended.

## Conventions

- Don't commit audio: `piano_samples/` and `*.mp3`/`*.wav`/`*.m4a` are git-ignored because they are personal, copyrighted recordings. Songs in `library.js` are public-domain tunes, or the user's own transcriptions marked as such in its header.
- `TRANSPOSE_ENABLED` in `App.jsx` is deliberately `false` (the user's choice). The control stays visible but greyed out.
- The player's keyboard can't register some three-key chords, so `App.jsx` fills in the third note of a D major chord when two of its notes land within `CHORD_WINDOW_MS` (see `src/data/dChord.js`). Exercises see this as `chordFilled` on the note event.
- `classic.html` is a standalone single-file version of the piano. It isn't part of the Vite build or linked from the app.
- `docs/` holds the ear-training design and plan.
