# Ear Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-lesson Ear training unit with a 17-lesson "name that note" unit, and add an adaptive Ear Gym practice tab that opens once the unit is passed.

**Architecture:** All ear logic is pure and tested in `src/ear/`: round generation, judging, a session reducer, adaptive picking, and stats. One `EarExercise` component runs a round sequence for both lessons (`exercise.type === 'ear'`) and the Gym. The App forces transpose to 0 while an ear exercise is mounted.

**Tech Stack:** React 18 + Vite 5 (Node 20.16), Vitest, Web Audio via existing `engine`.

**Spec:** `docs/ear-training-design.md`

## Global Constraints

- Vite stays on 5.x; no new dependencies.
- Key layout unchanged: whites A S D F J K L, blacks W E U I O, Z/X octave.
- Unit 1–3 and 5–7 lesson ids unchanged; course becomes 40 lessons.
- Answers judged by pitch class, any octave; transpose forced to 0 during ear exercises and Gym, restored after.
- Stats in localStorage key `desk-piano-ear`; lesson progress stays in `desk-piano-progress`.
- Gym unlocks only when `ear-quick` is passed (★★) or "Unlock all lessons" is on.
- Project is not a git repo: "checkpoint" steps = run full `npx vitest run`, no commit.

## Review Focus

1. User has transpose ≠ 0, then starts an ear lesson: prompts and judging act as transpose 0; leaving mid-exercise (switching lessons/tabs) restores the previous transpose. → Task 4 test via `effectiveTranspose`.
2. Key pressed while the prompt (reference + target) is still sounding: ignored, not counted as wrong. → Task 2 reducer test.
3. Several keys held at once (chord): only the newly pressed note is judged. → Task 2 (reducer takes one `semitone` per press; component passes `e.semitone` only).
4. Missing or corrupt `desk-piano-ear` storage: Gym loads empty stats, no crash. → Task 3 test.
5. Tiny pools (1–2 notes) with the "no immediate repeat" rule must not loop forever. → Task 1 and Task 3 tests.

---

### Task 1: Round generation and judging (`src/ear/rounds.js`)

**Files:**
- Create: `src/ear/rounds.js`
- Test: `src/ear/rounds.test.js`

**Interfaces:**
- Produces:
  - `type Round = { target: number /*semitone 0-11*/, oct: number /*relative to base, -1..1*/, reference: boolean, voice: string | null }`
  - `type EarConfig = { pool: string[] /*note names, e.g. ['C','G','F#']*/, count: number, focus?: string /*~50% of rounds*/, pairs?: [string,string][] , reference: 'every' | 'sometimes' | 'start', octaves?: number[] /*relative, default [0]*/, randomVoice?: boolean, timeLimit?: number /*ms*/, intro?: string[] /*new notes to present before round 1*/ }`
  - `makeRounds(config: EarConfig, rng = Math.random, voices: string[] = INSTRUMENTS.map(i => i.id)): Round[]`
  - `isCorrect(target: number, pressedSemitone: number): boolean` (`pressed % 12 === target`)
  - `SEMI: Record<string, number>` re-exported from `SEMITONES` in `src/data/keymap.js`.

- [ ] **Step 1: Write failing tests** in `rounds.test.js`, using a seeded rng (`const rng = mulberry32(1)`, defined in the test file):
  - `makeRounds({pool:['C','G'], count:12, reference:'every'})` gives length 12, every target in {0,7}, every `reference === true`, no two consecutive targets equal.
  - `pool:['C']`, count 5: returns 5 rounds, all target 0. Repeat is allowed when the pool has one note, and the call terminates.
  - `focus:'E'`, pool C E G, count 400: E share between 0.4 and 0.6.
  - `pairs:[['D','E'],['B','C']]`, count 16: rounds come in consecutive pairs `(2k, 2k+1)` whose targets are a pair's two notes in either order. The `C` of the `B/C` pair has `oct === 1`.
  - `reference:'start'`: only round 0 has `reference === true`. `'sometimes'` over 400 rounds: share in 0.4–0.6, and round 0 is always true.
  - `octaves:[-1,0,1]`: every `oct` in that set, and all three appear in 60 rounds.
  - `randomVoice:true`: every `voice` is in the provided voices list. Otherwise `voice === null`.
  - `isCorrect(4, 4)`, `isCorrect(4, 16)` true; `isCorrect(4, 5)` false.
- [ ] **Step 2: Run** `npx vitest run src/ear/rounds.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.** Without pairs: pick from `focus` with p=0.5, else uniform from the pool. Re-pick at most 10 times if equal to the previous target and the pool has more than 1 note. With pairs: `count/2` random pairs, each shuffled. The second note's `oct` is +1 when it is lower in semitone than the first note of that pair as written (the B→C case).
- [ ] **Step 4: Run** the same command. Expected: PASS.

### Task 2: Session reducer (`src/ear/session.js`)

**Files:**
- Create: `src/ear/session.js`
- Test: `src/ear/session.test.js`

**Interfaces:**
- Consumes: `Round`, `isCorrect` (Task 1).
- Produces:
  - `startSession(rounds: Round[]): EarState` where `EarState = { rounds, index, phase: 'prompt' | 'answer' | 'fix' | 'done', mistakes: number, answers: { target: number, answered: number | null }[], last: { answered: number | null, correct: boolean } | null }`
  - `earReducer(state, action)` with actions:
    - `{ type: 'prompted' }`: `prompt → answer`
    - `{ type: 'press', semitone }`
    - `{ type: 'timeout' }`: counts like a wrong answer with `answered: null`
    - `{ type: 'advance' }`: after a correct answer, moves to the next round (`phase: 'prompt'`) or `'done'`.
    - `{ type: 'replaceUpcoming', rounds: Round[] }`: keeps `rounds[0..index]` and replaces the rest (used by the Gym; length stays the same).
  - `export const RIGHT_DELAY = 600`

- [ ] **Step 1: Write failing tests:**
  - A press while `phase === 'prompt'` returns the same state object (ignored; Review Focus 2).
  - In `answer`, a correct press sets `last.correct = true`, pushes `{target, answered}`, and leaves `mistakes` at 0. `advance` then gives `index 1`, `phase 'prompt'`.
  - In `answer`, a wrong press gives `phase 'fix'`, `mistakes 1`, and `answers` gets `{target, answered: wrongSemitone}`. A second wrong press in `fix` keeps `mistakes` at 1. A correct press in `fix` sets `last.correct = true` without pushing another answer, and `advance` moves on.
  - `replaceUpcoming` at index 3 of 6 keeps rounds 0–3 unchanged and swaps rounds 4–5.
  - `timeout` in `answer` gives `phase 'fix'`, `mistakes 1`, answer `answered: null`. A `timeout` in any other phase is ignored.
  - Correct on the last round followed by `advance` gives `phase 'done'`.
- [ ] **Step 2: Run** `npx vitest run src/ear/session.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `earReducer` as specified. `press` in `answer`/`fix` uses `isCorrect(round.target, semitone)`. Once `last.correct` is true, further presses are ignored until `advance`.
- [ ] **Step 4: Run.** Expected: PASS.

### Task 3: Stats and adaptive picking (`src/ear/stats.js`)

**Files:**
- Create: `src/ear/stats.js`
- Test: `src/ear/stats.test.js`

**Interfaces:**
- Produces:
  - `type EarStats = { notes: Record<number, { recent: boolean[] /*≤50, newest last*/, right: number, wrong: number }>, confusions: Record<number, Record<number, number>>, days: string[] /*'YYYY-MM-DD', unique, sorted*/, settings: GymSettings }`
  - `type GymSettings = { pool: 'auto' | number[], reference: 'every' | 'sometimes' | 'start', octaves: 'one' | 'three', randomVoice: boolean }` with default `{ pool: 'auto', reference: 'every', octaves: 'one', randomVoice: false }`
  - `emptyStats(): EarStats`, `loadStats(): EarStats`, `saveStats(s): void` (key `desk-piano-ear`, try/catch like `progress.js`)
  - `recordAnswer(s, target: number, answered: number | null, today: string): EarStats` (pure)
  - `accuracy(s, semitone): { rate: number, n: number }` (over the last 20 answers)
  - `level(s, semitone): 'new' | 'weak' | 'ok' | 'mastered'` (`n < 5` gives new; rate < 0.6 weak; < 0.9 ok; else mastered)
  - `topConfusions(s, k = 3): { target, heardAs, count }[]` (sorted by count desc)
  - `streak(s, today: string): number` (consecutive days ending today or yesterday)
  - `weightFor(s, semitone): number` = `1 + 3 × errorRate(last 20) + (right + wrong < 10 ? 1 : 0)`
  - `pickNext(s, pool: number[], ctx: { prev: number | null, followUp: { pair: [number, number], left: number } | null }, rng = Math.random): { target: number, ctx }`
  - `localDay(date = new Date()): string`

- [ ] **Step 1: Write failing tests:**
  - `recordAnswer(empty, 4, 2, '2026-10-21')`: `notes[4].wrong 1`, `recent [false]`, `confusions[4][2] 1`, `days ['2026-10-21']`. `answered: null` (timeout) records a wrong answer with no confusion entry.
  - After 60 answers, `recent.length === 50`.
  - `level` for 4 answers gives `'new'`. For 20 answers with 18 right gives `'mastered'`. With 15 right gives `'ok'`.
  - `streak` with days `['2026-10-19','2026-10-20','2026-10-21']` and today `'2026-10-21'` gives 3. With today `'2026-10-22'` gives 3. With today `'2026-10-23'` gives 0.
  - `weightFor` for an untouched note gives 2. For 20 answers, all wrong, gives 4.
  - `pickNext` with pool `[0]` returns 0 and terminates (Review Focus 5). With pool `[0,7]` and `prev 0`, it never returns 0 when no follow-up is active (100 trials).
  - Follow-up: `ctx.followUp = {pair:[4,2], left:3}`. Over 1000 trials, the share of picks in {4,2} is above 0.5. Each pick decrements `left`, and at 0 `followUp` becomes `null`. Repeats are allowed during a follow-up.
  - `loadStats` with `localStorage.getItem` returning `'{bad json'` gives `emptyStats()`. Stub `globalThis.localStorage` in the test.
- [ ] **Step 2: Run** `npx vitest run src/ear/stats.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** For `pickNext` with an active follow-up: with p=0.5, pick uniformly from the pair. Otherwise, do a weighted pick over the pool excluding `prev` (unless the pool has 1 note). The caller sets `followUp = {pair:[target, answered], left:3}` after a wrong answer where `answered !== null`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Checkpoint.** `npx vitest run`, all green.

### Task 4: Transpose lock in App

**Files:**
- Modify: `src/App.jsx`
- Create: `src/ear/transposeLock.js`, Test: `src/ear/transposeLock.test.js`

**Interfaces:**
- Produces:
  - `effectiveTranspose(transpose: number, locks: number): number` (returns 0 when `locks > 0`)
  - `piano.lockTranspose(): () => void`. Calling it increments a lock counter in App, and the returned function decrements it. `piano.transpose` and the Display report the effective value. `[`/`]` do nothing while locked. The user's stored transpose is never modified, so it is "restored" automatically.

- [ ] **Step 1: Write failing test**: `effectiveTranspose(5, 1) === 0`, `effectiveTranspose(5, 0) === 5`, `effectiveTranspose(-3, 2) === 0`.
- [ ] **Step 2: Run** `npx vitest run src/ear/transposeLock.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the helper. In `App.jsx`, add `const [transposeLocks, setTransposeLocks] = useState(0)` and use `effectiveTranspose` wherever `transpose` is passed to `frequency`, `Display`, `Controls` and `piano`. `shiftTranspose` becomes a no-op while locked. Add `lockTranspose` (stable via `useCallback`) to `piano`.
- [ ] **Step 4: Run** the test (PASS), then `npx vite build` (succeeds).

### Task 5: `EarExercise` component

**Files:**
- Create: `src/components/lessons/EarExercise.jsx`
- Modify: `src/components/lessons/LessonPage.jsx` (choose `EarExercise` when `lesson.exercise.type === 'ear'`), `src/App.css` (styles for the feedback line and intro panel, matching existing `.exercise` classes)

**Interfaces:**
- Consumes: `makeRounds` (T1), `startSession/earReducer/RIGHT_DELAY` (T2), `loadStats/saveStats/recordAnswer/localDay` (T3), `piano.lockTranspose` (T4), `engine.playNote/now/cancelScheduled`, `frequency`.
- Produces: `<EarExercise exercise={{ type:'ear', ...EarConfig, prompt }} piano onProgress onComplete rounds? onAnswer? />`. `rounds` overrides `makeRounds` (used by the Gym). `onAnswer(target, answered)` is called on each first answer. If `onAnswer` is absent, the component itself records into stats via `recordAnswer` + `saveStats` (lessons count toward Gym stats; Claude's call).

Behaviour (from the spec):
- On mount: `useEffect(() => piano.lockTranspose(), [])`.
- **Intro** (when `exercise.intro`): before round 1, for each intro note show "Listen: C then <note>" and play C → note ×3 (about 0.7 s apart), show their names, let the user play freely, then a **Start** button.
- **Prompt:** when `reference` is set, play C at base octave, wait 600 ms, play the target at `base + oct` in `round.voice ?? piano.instrumentId`, then dispatch `prompted`. Base octave = `piano.octave` at mount.
- **Answer:** subscribe to `piano.subscribe` and dispatch `press` with `e.semitone`. A right answer shows "✓ <name>" and dispatches `advance` after `RIGHT_DELAY`. On wrong/timeout, play the user's note (skip on timeout), then the target 600 ms later, show "you: D → it was: E", and glow the target via `piano.setHighlight({targets:[code], wrong})`.
- `timeLimit`: start a timer when the phase becomes `answer`; it dispatches `timeout`.
- Buttons: **🔊 Hear again** (reference + target if `round.reference`, else target only). **🔊 Hear C** is shown when the config's `reference !== 'every'`.
- On `done`: `onComplete({ stars: starsForMistakes(mistakes, rounds.length), detail })` with the same detail copy style as `StepExercise`.
- Unmount: clear the highlight, `engine.cancelScheduled()`, release the transpose lock.

- [ ] **Step 1:** Implement the component and the LessonPage switch.
- [ ] **Step 2:** `npx vite build` succeeds. Then, in the browser at `localhost:5173` with "Unlock all lessons" on and transpose set to +2, open lesson 4.1. Check that the display shows TRN 0, C then the target are heard, a wrong press plays both notes and glows the answer, and leaving the lesson restores TRN +2.

### Task 6: New Unit 4 curriculum

**Files:**
- Modify: `src/lessons/curriculum.js` (replace the 'Ear training' unit; delete `earSteps`, `melodySteps`, `randomSeq` if unused), `src/lessons/curriculum.test.js`

**Interfaces:**
- Consumes: `makeRounds` (T1).

- [ ] **Step 1: Update tests** in `curriculum.test.js`:
  - `LESSONS.length === 40`.
  - Unit 4 ids, in order: `ear-cg, ear-e, ear-d, ear-f, ear-a, ear-b, ear-neighbours, ear-whites, ear-fs, ear-cs-ds, ear-gs-as, ear-twelve, ear-ref-sometimes, ear-ref-once, ear-octaves, ear-voices, ear-quick`.
  - The generic per-lesson test: for `type === 'ear'`, `makeRounds(ex)` has length `ex.count`, and every target is in the semitones of `ex.pool`.
  - Lesson ids from Units 1–3 and 5–7 are unchanged. Snapshot the list of ids as a literal array, taken from the current file before editing.
- [ ] **Step 2: Run** `npx vitest run src/lessons/curriculum.test.js`. Expected: FAIL.
- [ ] **Step 3: Write the 17 lessons** exactly per the spec table (pool, reference, rounds; `focus: X, intro: [X]` for the new note in 4.2–4.6 and 4.9; 4.10 `intro: ['C#','D#']`, 4.11 `intro: ['G#','A#']`, no focus; 4.1 `intro: ['C','G']`; 4.7 `pairs: [['D','E'],['E','F'],['A','B'],['B','C']]`; 4.15 `octaves:[-1,0,1]`; 4.16 `randomVoice:true`; 4.17 `timeLimit:3000`). Each lesson's theory explains the new note's character relative to C, as in the spec (G open/stable, B leans up to C, F falls to E, F♯ tense), plus a `{ keys: { mark } }` mini keyboard of the pool. 4.1 also explains relative pitch and "carry C in your head".
- [ ] **Step 4: Run.** Expected: PASS. Then `npx vitest run`, all green.

### Task 7: Ear Gym tab

**Files:**
- Create: `src/components/ear/EarGym.jsx`, `src/components/ear/NoteGrid.jsx`
- Modify: `src/components/lessons/Lessons.jsx` (tab bar "Lessons | Ear Gym 🔒"), `src/App.css`

**Interfaces:**
- Consumes: everything from T1–T3 and T5, plus `hasPassed(progress, 'ear-quick')` / `progress.unlockAll`.

Behaviour:
- Locked tab: disabled, with the title "Pass Ear training to open".
- Home view: `NoteGrid` (12 keys laid out like the piano, coloured by `level`: new grey, weak red, ok amber, mastered green, plus the % shown), top-3 confusions ("D heard as E · 7×"), 🔥 `streak` days, today's rounds, the settings controls (persisted in `stats.settings`), and a **Start (20 notes)** button.
- Session: build 20 `Round`s up front by calling `pickNext` sequentially with the pool from the settings ('auto' = all 12). Wrong answers must reshape upcoming rounds, so Gym keeps `rounds` in state. It passes `rounds` plus `onAnswer`, and on each first answer it records stats, saves them, and (if the answer was wrong) replaces the not-yet-played rounds `index+1..` with fresh `pickNext` picks under the new follow-up ctx. `EarExercise` dispatches `replaceUpcoming` whenever its `rounds` prop changes after mount.
- Reference / octaves / voice settings map onto the `Round` fields the same way as in `makeRounds`.
- End screen: score x/20, notes whose `level` improved during the session, and the top confusion from today.

- [ ] **Step 1:** Implement `NoteGrid`, `EarGym`, and the tab bar.
- [ ] **Step 2:** `npx vite build` succeeds, and `npx vitest run` is all green.
- [ ] **Step 3:** In the browser: the tab is locked by default. Tick "Unlock all", run a Gym session and answer D for E twice. Check that the grid and confusions update, that E/D come up more in the next rounds, and that reloading keeps the stats.

### Task 8: User's starting point and memory

- [ ] **Step 1:** In the user's "chrome piano" browser at `localhost:5173`, set `stars[id] = max(existing, 2)` in `desk-piano-progress` for every Unit 1–3 lesson id. Reload, and check that Lesson 4.1 is unlocked and the Gym tab is locked.
- [ ] **Step 2:** Update the piano memory file: ear unit = 17 lessons, Ear Gym built, user at 4.1.
