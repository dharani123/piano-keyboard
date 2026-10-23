# Ear training: name that note — design

Status: draft for approval · 2026-10-21

## Why

The user considers ear training the most important part of learning piano and
wants to *nail* it. The concrete goal for this round: **hear a single note and
find it on the keyboard.** Playing back a whole tune by ear is a later goal and
is out of scope here.

The current Ear training unit (Unit 4: "Echo: C, D, E", "Echo: C to G",
"Echo a melody") is too thin for that.

## Approach

**Relative pitch, not perfect pitch.** (Proposed by Claude, agreed by the user.)
Every note is first learned *against a reference C*. The reference is then
faded out, so the user ends up carrying C in their head. Absolute pitch with
no reference at all is not a goal.

**Answer by pressing the key on the piano** (user's choice), not by picking a
note name.

**Progression** (user's direction: each note on its own first, then mixes,
then harder): single notes, then small mixes, then all whites, then black keys,
then reference fading, then harder conditions.

Two parts:

1. **Learn**: a new Unit 4 in the existing course, with the same ★★-to-pass
   and in-order unlock rules.
2. **Ear Gym**: a repeatable practice mode that tracks per-note accuracy
   and which notes get confused, and drills weak spots harder (user asked for this).

## Goals

- A step-by-step lesson path from "C and G" to "all 12 notes, no reference,
  any octave, any voice, under time pressure".
- Every wrong answer teaches something: the user hears **their** note and then
  the **real** one.
- Ear Gym gives short (≈20-note, 2–3 min) sessions that are good for office breaks
  and adapt to the user's weak notes and confusions.
- Visible progress: per-note accuracy, top confusions, daily streak.

## Non-goals

- Melody / tune playback by ear (later unit).
- Intervals, chords, scale-degree singing.
- Microphone / singing input.
- Perfect-pitch training (no reference ever).

## Anti-goals (would be a failure even if it "works")

- Showing the answer before the user tries (no glow, no labels on the target).
- Judging by *which keyboard key* was pressed when transpose is on. The judge
  must compare **sounding** pitch class (see Constraints).
- Breaking the user's chosen key layout: A S D F / J K L whites,
  W E / U I O blacks, Z/X octave.
- Losing the user's existing lesson stars. Unit 1–3 lesson ids stay unchanged.

## Constraints

- Existing stack: React + Vite 5, Node 20.16 (Vite ≥6 is not available). Vitest for pure
  logic. Match existing code style (small pure modules + thin components).
- Progress lives in `localStorage` (per origin; served at `localhost:5173`).
- Answers are judged by **pitch class, any octave** in all ear exercises:
  the user is naming a note, not finding a register. The engine plays notes at
  `frequency(octave, semitone, transpose)`, so the comparison must use
  `(semitone + transpose) mod 12` against the prompt's sounding pitch class, or
  ear exercises must force transpose to 0 while they're running.
  *Claude's call: force transpose 0 during ear exercises and the Gym, and
  restore it afterwards. This is simpler and keeps the display honest.*

## Part 1: Learn, Unit 4 "Ear training"

Replaces `ear-3`, `ear-5`, `ear-melody`. (`ear-melody` returns in the future tune
unit. The user hasn't done any of these, so no stars are lost.)

### How every ear round works

1. **Reference** (when the lesson uses one): C4 plays, then a short gap, then the target note.
2. The user presses a key. **Right** (correct pitch class, any octave): "✓ E" shows,
   and the next round starts after about 600 ms.
3. **Wrong**: the app plays *the user's note*, then *the real note* (labelled
   "you: D → it was: E"). The target then glows, and the user must press it to move on.
   This counts as one mistake for stars, however many wrong presses there were in that round.
4. **🔊 Hear again** replays reference + target. It is free and costs no stars.
5. Stars use the existing `starsForMistakes`.

### Lessons

Each "meet" lesson opens with a **listen phase**: the new note is played next to
C a few times with its name shown, and the user plays along freely. Then the drill
starts. In meet lessons about 50% of rounds are the new note.
Each lesson's theory describes the note's *character relative to C*, so the
user has something to hear it by. For example, G is "open, stable, like a
fanfare"; B "leans hard up to C"; F "wants to fall to E"; F♯ "tense,
unsettled".

| # | id | Title | Pool | Reference | Rounds |
|---|----|-------|------|-----------|--------|
| 4.1 | ear-cg | Your anchor: C and G | C G | every round | 12 |
| 4.2 | ear-e | Meet E | C E G | every round | 12 |
| 4.3 | ear-d | Meet D | C D E G | every round | 14 |
| 4.4 | ear-f | Meet F | C D E F G | every round | 14 |
| 4.5 | ear-a | Meet A | C–A (whites) | every round | 16 |
| 4.6 | ear-b | Meet B | all 7 whites | every round | 16 |
| 4.7 | ear-neighbours | Close neighbours | pairs D/E, E/F, A/B, B/C' | every round | 16 |
| 4.8 | ear-whites | All the white keys | 7 whites | every round | 20 |
| 4.9 | ear-fs | Black keys: F♯ | 7 whites + F♯ | every round | 16 |
| 4.10 | ear-cs-ds | C♯ and D♯ | + C♯ D♯ | every round | 16 |
| 4.11 | ear-gs-as | G♯ and A♯ | all 12 | every round | 16 |
| 4.12 | ear-twelve | All twelve notes | all 12 | every round | 20 |
| 4.13 | ear-ref-sometimes | Reference sometimes | all 12 | 50% of rounds | 20 |
| 4.14 | ear-ref-once | Reference once | all 12 | only at the start | 20 |
| 4.15 | ear-octaves | Any octave | all 12, octaves 3–5 | only at start | 20 |
| 4.16 | ear-voices | Any instrument | all 12, random voice per round | only at start | 20 |
| 4.17 | ear-quick | Quick ear | all 12 | only at start | 20, 3 s per answer (too slow = mistake) |

The unit grows from 3 lessons to 17, and the course from 26 lessons to 40.

In 4.7, pairs come up as back-to-back rounds (for example D then E, or E then D) so
the user compares them directly. "Reference once" (4.14) and later lessons play C
when the drill starts, and also whenever the user presses **🔊 Hear C**.
"Hear again" in those lessons replays only the target.

## Part 2: Ear Gym

A second tab next to **Lessons** in the panel under the piano.

### Session

- 20 rounds. They work like Learn rounds (same right/wrong/hear-again behaviour).
- Settings (remembered):
  - **Notes**: "Auto" (every note introduced in the ear lessons passed so far)
    or a custom pick of any of the 12.
  - **Reference**: every round / sometimes / start only.
  - **Octaves**: just 4 / 3–5. **Voice**: current / random.
- End screen: score, notes that improved, and today's top confusion.

### Choosing the next note (adaptive)

For each note in the pool:
`weight = 1 + 3 × errorRate(last 20 answers of that note) + (fewer than 10 answers ever ? 1 : 0)`.
After a wrong answer (target T, answered W), the next 3 rounds have a 50% chance of
coming from {T, W}, which forces the direct comparison. The same note never plays
twice in a row, except in that follow-up.

### Stats (saved in localStorage key `desk-piano-ear`)

- Per note: the last 50 answers (right/wrong) and lifetime counts.
- Confusions: `target → answeredAs → count`.
- Practice days (for the streak).
- Only the **first** answer in each round counts.

### Stats view

- 12-note grid shaped like the keyboard. Each note is coloured by its accuracy over the last 20
  answers: grey under 5 answers, red below 60%, amber 60–89%, green 90% and up (**mastered**).
- "Most confused" list: the top 3 pairs, for example "D heard as E: 7×".
- 🔥 streak in days, and today's rounds.

### When it opens

**After the whole ear unit is passed** (lesson 4.17 at ★★ or better, which is the user's
decision). Until then the tab shows as locked, with a "Pass Ear training to open" note.
The "Unlock all lessons" checkbox also opens it. Because the unit is finished by then,
"Auto" means all 12 notes.

## Starting point for the user

The user asked for Units 1–3 to be unlocked, so they can go straight to the
new ear unit. *Claude's call:* this is a one-time progress update in the user's
browser (Unit 1–3 lessons marked ★★), not a change to the course's default unlock
rule. The in-order rule stays for everything else.

## Left to the builder

- Exact component split. Suggested: put the pure logic (round generation,
  adaptive picking, stats update, judging) in `src/ear/` with Vitest tests,
  and reuse `piano.subscribe` / `engine.playNote` as `StepExercise` does.
  Ear lessons can extend the `steps` exercise or use a new `ear` exercise type.
- Exact wording of the theory text per note.
- Visual styling. It must match the existing EP-7 panel look.
- Timing gaps between reference, target, and feedback notes (around 600 ms is a good start).
