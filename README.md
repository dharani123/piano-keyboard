# Desk Piano

A small piano you play on your computer keyboard, built with React + Vite. Made for practising at a desk: lessons, ear training, falling-notes songs and Carnatic varisais.

## Run it

```sh
npm install
npx vite --port 5173
```

Open http://localhost:5173.

## Keys

- Home row `S D F G H J K` = C D E F G A B, then `L ; ' Enter` = high C D E F
- Black keys: `E R` · `Y U I` · `P [`
- Number row: a second, two-octave keyboard (`3`–`9` = C–B)
- `Z` / `X` octave down/up · `←` / `→` transpose · `Space` sustain

## What's inside

- **Lessons**: a step-by-step course (keyboard, rhythm, intervals, ear training, scales, chords, songs)
- **Ear Gym**: adaptive name-that-note drills
- **Western Music**: falling-notes songs (public-domain tunes), with *Wait for me* and *Play along* modes, plus importing your own audio to try automatic transcription
- **Carnatic Music**: Sarali and Janta varisais in Mayamalavagowla or Shankarabharanam, labelled in swaras (Sa Ri Ga Ma Pa Da Ni)
- **Carnatic Relax**: the varisais in the traditional order with a tanpura drone, listen-then-play and no scores

Progress is saved in `saved-progress.json` (through the dev server) as well as the browser, so commit it to carry your progress to another machine. Songs imported from audio stay in the browser only.

## Credits

Audio-to-notes uses [Basic Pitch](https://github.com/spotify/basic-pitch-ts) by Spotify (Apache-2.0); its model is included in `public/basic-pitch/`.
