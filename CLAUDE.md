# Koelet — «Тайна Коэлета»

Interactive adventure for children aged 8–15 based on Rabbi Shneor Ashkenazi's lesson on the Book of Kohelet. Plain HTML/CSS/JS, no framework and no build step. The team talks in Russian; answer in Russian unless asked otherwise.

## Run and test

- `npm start` → http://localhost:8080. The game loads its texts with `fetch()`, so it **must** run over http, not `file://`. The camera (mirror) works only on `localhost` or `https://`.
- `npm run lint` — `node --check` for every script, JSON validity (skips `vendor/`).
- `npm run test:data` — fast, no browser. Compares every language with Russian: keys, structure, technical values, `{{placeholders}}`, gender forms, alphabet.
- `npm run test:quick` — plays the whole game in Chromium once per language (~1 min).
- `npm run test:play` — all 6 scenarios (ru/uk/de × 8–11 girl / 12–15 boy), ~2 min. Options: `--lang=de`, `--quick`, `--shots` (screenshots of every screen → `tests/screenshots/`, gitignored), `--headed`.
- `npm run voice:dry` — how many sentences/characters would be sent to Azure; `npm run voice` generates them (needs `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`; `--lang=`, `--rpm=`, `--jobs=`, `--force`).
- `npm test` — all of the above. Run it before every commit that touches game code or texts.
- Cloud sessions: `.claude/hooks/session-start.sh` installs Playwright (pinned to 1.56.1, browsers are preinstalled in `/opt/pw-browsers`; never run `playwright install`).
- If the playthrough gets stuck on a new screen type, teach the driver loop in `tests/playthrough.mjs` how to pass it.

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell; loads scripts in order: `i18n.js` → `game-data.js` → `art.js` → `voice-key.js` → `music.js` → `game.js` |
| `i18n.js` | Language module: `LANGS`, `t('key', {vars})`, `tl('key')`, language detection, `loadLang()`/`setLang()` |
| `game-data.js` | Loads texts for the chosen language (falls back to Russian) |
| `game.js` | Runtime: state `S` (localStorage `koelet-game-v1`), screens, step engine, mini-games, certificate |
| `music.js` | Music and voice guide: `Music` (background tracks, volume, ducking), `Voice.say()`, `guideScreen()` (spoken hint on every screen), `showGate()` (start screen), audio settings panel. Idle help after a minute of silence. Track and volume in localStorage `koelet-audio` |
| `voice-key.js` | Shared by the game and `tools/tts.mjs`: splits text into sentences (paragraphs, `.!?…`), strips tags and Hebrew, `VoiceKey.key()` = hash of the normalized sentence |
| `audio/<lang>/` | Ready-made Azure voice: one mp3 per sentence (`<key>.mp3`) + `index.json` (list of keys). Generated, never edit by hand |
| `music/` | Background music (4 Chabad niggunim, mp3) and `tracks.json` (playlist with titles in he/ru/uk/de) |
| `art.js` | Icon set (`ICONS`, `icon()`), the Keeper (`mentorSvg(mood)`), world themes and backdrops (`SCENES`) |
| `styles.css` | All styles; colours are CSS variables, world accent in `--accent` |
| `content/<lang>/*.json` | Story: `shared.json` (lists, labels), `prologue.json`, one file per world |
| `locales/<lang>.json` | Interface strings (buttons, menu, mini-games, certificate, report) |
| `vendor/headbreaker.js` | Third-party jigsaw library (headbreaker 3.0.0 + Konva 6.0.0), loaded only on the puzzle step. Do not edit; licenses in `vendor/LICENSES.md` |
| `tools/tts.mjs`, `tools/voice-phrases.mjs`, `tools/tts-config.json` | Voice generation via Azure AI Speech: collects every sentence, voices only new ones, prunes stale files. Voices, rate and pronunciation lexicon (`<sub alias>`) in the config |
| `.github/workflows/voice.yml` | Runs `tools/tts.mjs` after text changes land in `main` (and manually) and commits `audio/` |
| `tools/`, `tests/` | Dev server, lint, data check, browser playthrough |

## Texts and languages (the most common source of mistakes)

- Languages: `ru` (reference, default), `uk`, `de`. **Every text change must be made in all three languages**: `content/ru|uk|de/…` and `locales/ru|uk|de.json` have identical keys and structure. `npm run test:data` catches gaps.
- Never hard-code visible text in `game.js`: add a key to all three `locales/*.json` and use `t('key')` / `tl('key')` (for lists, objects and age variants). Escape user input with `esc()`.
- Gender of the player: `{boy form|girl form}` inside a string, e.g. `ты {прошёл|прошла}`, `{Wanderer|Wanderin}`. Resolved by `T()`; `t()` and step data (via `R()`) apply it automatically. Ukrainian needs forms wherever Russian has them; German rarely does.
- Age groups: `{"__ag": 1, "y": "8–11 text", "t": "12–15 text"}` for any value. A whole step only for one group: `"age": "y"` or `"age": "t"`. Texts for 8–11: 30–40 words per screen, 6 options + «Свой вариант».
- Interface placeholders: `{{name}}` (not to be confused with gender forms).
- Technical values in content JSON are never translated: `type`, `key`, `ic`, `game`, `art`, `mood`, `age`, `tool`, `who: "mentor"`, Hebrew in `he`/`heb`.
- New language: copy `content/ru/` and `locales/ru.json`, translate, add a line to `LANGS` in `i18n.js`, add an alphabet rule to `tests/check-data.mjs` and scenarios to `tests/playthrough.mjs`.

## Content rules (agreed with the rabbi and the pedagogue)

- Chelek (доля) is a **gift from the Almighty**, not just «strengths». Write «Всевышний» / «Всевишній» / «G-tt», never «Бог».
- Interpretations of Rav Ashkenazi are labelled as such («Рав Ашкенази объясняет…»); sources are cited precisely; the source list for adults is `final.foot` in the locales.
- No «right answer» choices: every option gets the same sparks (10) and a nuanced outcome; «А что было бы, если…?» shows the others.
- Emotional safety: no pressure, no rankings, no data leaves the device. Optional own-answer fields stay in localStorage.

## Steps and mini-games

- A world is `{name, desc, steps:[…]}`; step types: `talk`, `choice`, `multi`, `quote`, `card`, `reveal`, `mini` (see `renderStep()` in `game.js`). Dynamic steps use `__dynamic` (`city-year`, `city-evening`, or `body: {"__dynamic": "strength-map"}`) and are built in `resolveDynamic()`.
- Mini-games are registered in `rMini()`: `book`, `treasure`, `find`, `puzzle` (real jigsaw), `selfmirror` (camera), `species`, `sky`, `hands`, `circles`, `final`.
- Adding a step shifts step indices of saved games — that is acceptable, but add it in all three languages at the same position.
- Camera (`selfmirror`): starts only after the button, stops in `render()` / on `pagehide` via `stopCamera()`; always keep the no-camera path.

## Music and voice («музыкальный текстовый квест»)

- Browsers block sound until the first tap, so every page load starts with the gate (`showGate()`): «Начать с музыкой» starts the music and speaks the greeting; «Без звука» turns both off for this visit only. Music and voice are **on at every page load**; only track and volume are saved.
- The Keeper's voice is **pre-generated with Azure AI Speech** (`audio/<lang>/`, one mp3 per sentence). `Voice.say()` splits text into sentences with `VoiceKey`, plays the matching mp3 files one after another and speaks only the missing ones (hero name, numbers, texts not yet generated) with the browser's `speechSynthesis`. Sentences with the hero's name are generated without the name (`{{name}}` → ''), other `{{x}}` are expanded with every value of field `x` in content; sentences with numbers stay browser-only. Screen text for the voice is taken as `innerHTML` so paragraphs split the same way as in JSON.
- Text changes need no manual voice work: after merge to `main` the «Озвучка» workflow voices new sentences and commits them (secrets `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`; free tier F0 ≈ 20 requests/min, the first full run of ~4000 sentences takes ~4 h, later runs only the changes). Until then the browser voice covers new sentences. `test:play` checks that every sentence the Keeper says has a key in the generated list (`[voice] no recording for: …`) — if it fails, fix `tools/voice-phrases.mjs` or `voice-key.js`, not the texts.
- Pronunciation fixes (names, «G-tt» → «Gott») go into `lexicon` in `tools/tts-config.json`; changing a voice, rate or lexicon regenerates that language.
- A minute of silence (the Keeper is not speaking, the player taps nothing) → the Keeper asks «Тебе чем-то помочь?» (`voice.idle`) and repeats the screen's hint (`Voice.idle()`, `Voice.idleMs`).
- After every `render()` the voice guide speaks the main text of the screen plus what to do (`guideParts()` in `music.js`). Hints are locale keys `voice.*`: one per step type (`voice.talk`, `voice.choice`, …) and one per mini-game (`voice.mini.<game>`). **A new step type or mini-game needs a `voice.*` key in all three locales.** After a choice the outcome is spoken.
- Music ducks to 30 % while the voice speaks and pauses in a hidden tab. Settings (music, track, volume, voice) live in the menu; the title screen has one settings button in the top corner that opens a popover (`quickMenu()` in `game.js`: language, music and voice switches, «О приложении»). They are separate from game progress.
- New track: put the mp3 into `music/` (Latin file name) and add it to `music/tracks.json` with titles for every language. Only add music the project has the right to use.

## About window

- «О приложении» (`showAbout()` in `game.js`) opens from the menu and from the title footer: project link `PROJECT_URL` (https://mychitas.app), short description, rights to the lesson and the music, open-source libraries, privacy. Texts are `about.*` in the locales — update them when the lesson source, music or libraries change.

## Design

- Icons only from `ICONS` in `art.js` (`icon('name')`), no emoji. The Keeper's moods: `smile`, `joy`, `think`, `wow`, `warm`, `point`.
- Hero screen: age and boy/girl are required, numbered blocks; «Готово» without them turns the missing block red with a hint (`--err`), scrolls to it and speaks the hint.
- Contrast WCAG AA; mobile first (375 px wide), one-line HUD, final screen in tabs.
- HUD: the hero chip (top left) opens `showProfile()` — level, progress, achievements; the menu button (top right) opens `showMenu()` — navigation, sound switches, language, «О приложении», donate link. Both are bottom sheets built with `openSheet()` (title + ✕, Escape, tap outside).
- New world visuals: add a theme to `THEMES`/`WORLD_THEME` and a backdrop to `SCENES` in `art.js`.

## Git

- Work on the branch given in the task; `main` is updated through PRs. Other contributors (including Copilot) also push to `main` — fetch and merge `origin/main` before opening a PR, then re-run `npm test`.
- Commit messages in Russian, describing what changed for players and teachers.
