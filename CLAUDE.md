# Koelet — «Тайна Коэлета»

Interactive adventure for children aged 8–15 and adults (16+) based on Rabbi Shneor Ashkenazi's lesson on the Book of Kohelet. Plain HTML/CSS/JS, no framework and no build step. The team talks in Russian; answer in Russian unless asked otherwise.

## Run and test

- `npm start` → http://localhost:8080. The game loads its texts with `fetch()`, so it **must** run over http, not `file://`. The camera (mirror) works only on `localhost` or `https://`.
- `npm run lint` — `node --check` for every script, JSON validity (skips `vendor/`).
- `npm run test:data` — fast, no browser. Compares every language with Russian: keys, structure, technical values, `{{placeholders}}`, gender forms, alphabet.
- `npm run test:quick` — plays the whole game in Chromium once per language (~1 min).
- `npm run test:play` — all 12 scenarios (ru/uk/de/en × 8–11 / 12–15 / 16+, boys and girls), ~3 min. Options: `--lang=de`, `--quick`, `--shots` (screenshots of every screen → `tests/screenshots/`, gitignored), `--headed`.
- `npm run voice:dry` — how many sentences/characters would be sent to Azure; `npm run voice` generates them (needs `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`; `--lang=`, `--rpm=`, `--jobs=`, `--force`).
- `npm test` — all of the above. Run it before every commit that touches game code or texts.
- Cloud sessions: `.claude/hooks/session-start.sh` installs Playwright (pinned to 1.56.1, browsers are preinstalled in `/opt/pw-browsers`; never run `playwright install`).
- If the playthrough gets stuck on a new screen type, teach the driver loop in `tests/playthrough.mjs` how to pass it.

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell; loads scripts in order: `i18n.js` → `game-data.js` → `art.js` → `voice-key.js` → `music.js` → `game.js` → `shabbat.js` → `pasuk.js` |
| `i18n.js` | Language module: `LANGS`, `t('key', {vars})`, `tl('key')`, language detection, `loadLang()`/`setLang()` |
| `game-data.js` | Loads texts for the chosen language (falls back to Russian) |
| `game.js` | Runtime: state `S` (localStorage `koelet-game-v1`), screens, step engine, mini-games, certificate |
| `shabbat.js` | «К Шабату»: экран выбора листов A4 и их вёрстка (настольная игра «Тропа Коэлета» с правилами, фишками и бумажным кубиком, 12 карточек вопросов по возрасту, «Найди пару», «Моя деталь пазла», семейный пазл). Печать через `#print-area`: лист 188×270 мм на именованной странице `@page shab` (A4 книжная), у сертификата своя `@page cert` (альбомная) |
| `pasuk.js` | «Твой стих в Танахе»: имя на иврите (угадывается из имени героя по словарю `HEB_NAMES` или по звукам, правится экранной клавиатурой) → стих, который начинается на первую букву имени и кончается на последнюю, и стих, где встречается само имя |
| `data/pesukim/` | Стихи для `pasuk.js`: `index.json` (названия книг, имя → стих) и `0..21.json` (по первой букве: пара → её стихи, первый — личный). Генерируется `tools/build-pesukim.mjs` из традиционного списка Torat Emet `tools/sources/toratemet-f_00720.mhtml`, руками не править |
| `hayomyom.js` | «Твой день в „Айом-йом“»: день рождения (обычный — переводится в еврейский своим календарём `gregToHeb()`, с галочкой «после захода солнца», или еврейский) → запись книги Ребе «היום יום» на этот день |
| `data/hayomyom.json` | Записи «היום יום» по дням (`"<месяц>-<день>"`, месяцы книги: תשרי…אלול, Адар I и II отдельно). Генерируется `tools/build-hayomyom.mjs` из `tools/sources/hayomyom.pdf` (нужен pdftotext), руками не править |
| `music.js` | Music and voice guide: `Music` (background tracks, volume, ducking), `Voice.say()`, `guideScreen()` (spoken hint on every screen), `showGate()` (start screen), audio settings panel. Idle help after a minute of silence. Track and volume in localStorage `koelet-audio` |
| `voice-key.js` | Shared by the game and `tools/tts.mjs`: splits text into sentences (paragraphs, `.!?…`), strips tags and Hebrew, `VoiceKey.key()` = hash of the normalized sentence |
| `audio/<lang>/` | Ready-made Azure voice: one mp3 per sentence (`<key>.mp3`) + `index.json` (list of keys). Generated, never edit by hand |
| `music/` | Background music (4 Chabad niggunim, mp3) and `tracks.json` (playlist with titles in he/ru/uk/de/en) |
| `art.js` | Icon set (`ICONS`, `icon()`), the Keeper (`mentorSvg(mood)`), world themes and backdrops (`SCENES`) |
| `styles.css` | All styles; colours are CSS variables, world accent in `--accent` |
| `content/<lang>/*.json` | Story: `shared.json` (lists, labels), `prologue.json`, one file per world |
| `locales/<lang>.json` | Interface strings (buttons, menu, mini-games, certificate, report) |
| `vendor/headbreaker.js` | Third-party jigsaw library (headbreaker 3.0.0 + Konva 6.0.0), loaded only on the puzzle step. Do not edit; licenses in `vendor/LICENSES.md` |
| `tools/tts.mjs`, `tools/voice-phrases.mjs`, `tools/tts-config.json` | Voice generation via Azure AI Speech: collects every sentence, voices only new ones, prunes stale files. Voices, rate and pronunciation lexicon (`<sub alias>`) in the config |
| `.github/workflows/voice.yml` | Runs `tools/tts.mjs` after text changes land in `main` (and manually) and commits `audio/` |
| `docs/guide.ru.md` | Учебник ведущего для офлайн-проведения (учителя, родители, ведущие). Вводная часть — `tools/guide-intro.ru.md` (правится вручную), сценарии со всеми текстами по возрастам генерирует `npm run guide` (`tools/guide.mjs`) из `content/ru` и `locales/ru.json`. `test:data` падает, если учебник не пересобран после правки текстов |
| `tools/`, `tests/` | Dev server, lint, data check, browser playthrough |

## Texts and languages (the most common source of mistakes)

- Languages: `ru` (reference, default), `uk`, `de`, `en`. **Every text change must be made in all four languages**: `content/ru|uk|de|en/…` and `locales/ru|uk|de|en.json` have identical keys and structure. `npm run test:data` catches gaps.
- Never hard-code visible text in `game.js`: add a key to all four `locales/*.json` and use `t('key')` / `tl('key')` (for lists, objects and age variants). Escape user input with `esc()`.
- Gender of the player: `{boy form|girl form}` inside a string, e.g. `ты {прошёл|прошла}`, `{Wanderer|Wanderin}`. Resolved by `T()`; `t()` and step data (via `R()`) apply it automatically. Ukrainian needs forms wherever Russian has them; German and English rarely do.
- Age groups: `y` (8–11), `t` (12–15), `a` (16+, adults). `{"__ag": 1, "y": "8–11 text", "t": "12–15 text", "a": "16+ text"}` for any value; `a` is optional and falls back to `t`. A whole step only for some groups: `"age": "y"` (8–11 only), `"age": "t"` (12+, i.e. 12–15 **and** 16+), `"age": "a"` (16+ only). The 16+ version follows the full lesson (Maslow, the Netziv, Yoma 22b, the Rebbe and Rabin, Rav Ashkenazi's own story), each idea with its source. Texts for 8–11: 30–40 words per screen, 6 options + «Свой вариант».
- After changing Russian texts run `npm run guide` and commit `docs/guide.ru.md` (the teacher's guide is generated from them). A new mini-game needs an offline description in `MINI` in `tools/guide.mjs`.
- Interface placeholders: `{{name}}` (not to be confused with gender forms).
- Technical values in content JSON are never translated: `type`, `key`, `ic`, `game`, `art`, `mood`, `age`, `tool`, `who: "mentor"`, Hebrew in `he`/`heb`.
- New language: copy `content/ru/` and `locales/ru.json`, translate, add a line to `LANGS` in `i18n.js`, add an alphabet rule to `tests/check-data.mjs` and scenarios to `tests/playthrough.mjs`.

## Content rules (agreed with the rabbi and the pedagogue)

- Chelek (доля) is a **gift from the Almighty**, not just «strengths». Write «Всевышний» / «Всевишній» / «G-tt» / «the Almighty», never «Бог» / «God». English uses Hebrew names and book titles as in Jewish tradition (Shlomo, Moshe, Kohelet, Bereishit, Pirkei Avot, chelek), with the common English name once where Russian gives it.
- Interpretations of Rav Ashkenazi are labelled as such («Рав Ашкенази объясняет…»); sources are cited precisely; the source list for adults is `final.foot` in the locales.
- No «right answer» choices: every option gets the same sparks (10) and a nuanced outcome; «А что было бы, если…?» shows the others.
- Emotional safety: no pressure, no rankings, no data leaves the device. Optional own-answer fields stay in localStorage.

## Steps and mini-games

- A world is `{name, desc, steps:[…]}`; step types: `talk`, `choice`, `multi`, `quote`, `card`, `reveal`, `mini` (see `renderStep()` in `game.js`). Dynamic steps use `__dynamic` (`city-year`, `city-evening`, or `body: {"__dynamic": "strength-map"}`) and are built in `resolveDynamic()`.
- Mini-games are registered in `rMini()`: `book`, `treasure`, `find`, `puzzle` (real jigsaw; 3×3 pieces, 5×5 for 16+), `selfmirror` (camera), `pasuk` (world «Зеркало», right after `selfmirror`: the hero's Hebrew name and personal verse, `gPasuk()` in `pasuk.js`), `species`, `sky`, `hands`, `circles`, `final`; 16+ only: `maslow` (Solomon's experiments from Kohelet 2 on Maslow's pyramid, replaces `treasure` via `"game": {"__ag":1,…,"a":"maslow"}`) and `timeline` (history as a puzzle: events in order, the player's piece last).
- Adding a step shifts step indices of saved games — that is acceptable, but add it in all four languages at the same position.
- Camera (`selfmirror`): starts only after the button, stops in `render()` / on `pagehide` via `stopCamera()`; always keep the no-camera path.

## Music and voice («музыкальный текстовый квест»)

- Browsers block sound until the first tap, so every page load starts with the gate (`showGate()`): «Начать с музыкой» starts the music and speaks the greeting; «Без звука» turns both off for this visit only. Music and voice are **on at every page load**; only track and volume are saved.
- The Keeper's voice is **pre-generated with Azure AI Speech** (`audio/<lang>/`, one mp3 per sentence). `Voice.say()` splits text into sentences with `VoiceKey`, plays the matching mp3 files one after another and speaks only the missing ones (hero name, numbers, texts not yet generated) with the browser's `speechSynthesis`. Sentences with the hero's name are generated without the name (`{{name}}` → ''), other `{{x}}` are expanded with every value of field `x` in content; sentences with numbers stay browser-only. Screen text for the voice is taken as `innerHTML` so paragraphs split the same way as in JSON.
- Text changes need no manual voice work: after merge to `main` the «Озвучка» workflow voices new sentences and commits them (secrets `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`; free tier F0 ≈ 20 requests/min, the first full run of ~4000 sentences takes ~4 h, later runs only the changes). Until then the browser voice covers new sentences. `test:play` checks that every sentence the Keeper says has a key in the generated list (`[voice] no recording for: …`) — if it fails, fix `tools/voice-phrases.mjs` or `voice-key.js`, not the texts.
- The Keeper is a man: only male voices in `tools/tts-config.json` (now ru-RU-DmitryNeural, uk-UA-OstapNeural, de-DE-ConradNeural, en-GB-RyanNeural); the browser fallback prefers a male voice too (`Voice.maleVoice()`).
- Pronunciation fixes (names, «G-tt» → «Gott») go into `lexicon` in `tools/tts-config.json`; changing a voice, rate or lexicon regenerates that language.
- A minute of silence (the Keeper is not speaking, the player taps nothing) → the Keeper asks «Тебе чем-то помочь?» (`voice.idle`) and repeats the screen's hint (`Voice.idle()`, `Voice.idleMs`).
- After every `render()` the voice guide speaks the main text of the screen plus what to do (`guideParts()` in `music.js`). Hints are locale keys `voice.*`: one per step type (`voice.talk`, `voice.choice`, …) and one per mini-game (`voice.mini.<game>`). **A new step type or mini-game needs a `voice.*` key in all four locales.** After a choice the outcome is spoken.
- Music ducks to 30 % while the voice speaks and pauses in a hidden tab. Settings (music, track, volume, voice) live in the menu; the title screen has one settings button in the top corner that opens a popover (`quickMenu()` in `game.js`: language, music and voice switches, «О приложении»). They are separate from game progress.
- New track: put the mp3 into `music/` (Latin file name) and add it to `music/tracks.json` with titles for every language. Only add music the project has the right to use.

## «К Шабату» (печатные листы)

- Screen `shabbat` (`renderShabbat()` in `shabbat.js`) opens from the title screen, the menu and the final screen; «Назад» returns to `S.shabFrom`. HUD is hidden there; on reload the game starts from the title as usual.
- Texts are `shab.*` in the locales (all four languages); they are printed, not spoken (`shab` is in `SKIP_UI` of `tools/voice-phrases.mjs`), only `voice.shabbat` is spoken. Card questions use `__ag` with the age chosen on the screen (`S.shabAge`), not the hero's age.
- Halacha: everything to cut, glue, colour or write is done **before** Shabbat — say so on every sheet that needs it; on Shabbat itself the family only plays and talks. The game is cooperative (everyone wins together), no scores. No Divine Names in Hebrew on the sheets (they may end up in the bin).
- Sheets are HTML in mm (`.pp`, 188×270 mm = A4 minus 10 mm margins, with slack; never put orientation in a plain `@page`, use the named pages); `test:play` checks that six sheets print and nothing spills over the page.

## «Твой стих в Танахе»

- Screen `pasuk` (`renderPasuk()` in `pasuk.js`) opens from the title screen, the menu and the final screen; «Назад» returns to `S.pasukFrom`; HUD hidden; on reload the game starts from the title. The Hebrew name is `S.hebName` (stays on the device).
- Also a step of the world «Зеркало» (mini `pasuk` after the camera mirror: «you saw yourself — your name has its own verse») and on the personal page of the certificate (see below; `personalVerse()`).
- Custom (segula): at the end of the Amidah, before the second «יהיו לרצון», a verse that begins with the first letter of one's Hebrew name and ends with its last, or a verse with the name in it.
- Data: the verses and their text come only from the traditional list «פסוק המתחיל ומסתיים באות» of Torat Emet (toratemetfreeware.com, saved as MHTML in `tools/sources/`), every verse of Tanach per pair, Jewish chapter/verse numbers. `node tools/build-pesukim.mjs <morphhb>/wlc` (see the header of the script); morphhb is used only as a word list (proper names, mood of a verse). Each pair gets **one** personal verse: from the Torah (Chumash) when the pair has a fitting one there (short, without dark words — Strong's numbers in `DARK`, not from chapters in `SKIP`), otherwise the best verse of the rest of Tanach. It is shown first; all the other verses of the pair are in a collapsed block «Другие стихи на эти буквы». Divine Names are written as in books for learning (ה׳, אלקים, קה, ש-די, א-דני). Texts `pasuk.*` are not spoken (in `SKIP_UI`), only `voice.pasuk`; book and letter names are `pasuk.books` / `pasuk.letters` in the locales.

## «Твой день в „Айом-йом“»

- Screen `hayom` (`renderHayom()` in `hayomyom.js`) opens from the title screen, the menu and the final screen; «Назад» returns to `S.hayomFrom`; HUD hidden. Optional: the birthday `S.bday` (`{mode:'g'|'h', g:'YYYY-MM-DD', sunset, hd, hm}`) stays on the device.
- Calendar: `gregToHeb()` (R.D. days, molad, Rosh Hashana postponements; checked against known dates). After sunset → next day. Adar of a regular year is read as אדר ב of the book (Chabad custom). A day the book lacks (30 Cheshvan / 30 Kislev) → the nearest earlier day with a note.
- The PDF has no Elul (it ends with 30 Av): Elul shows `hy.none`. When the Elul pages arrive, put the full PDF into `tools/sources/hayomyom.pdf` and run `node tools/build-hayomyom.mjs`.
- Text is Hebrew only (as in the book), not spoken; `hy` is in `SKIP_UI`, only `voice.hayom` is spoken.
- Full certificate = two landscape A4 pages. Page 1 is the certificate as it always was (`drawCertificate()`, photo if taken) — do not put the verse or «Айом-йом» there. Page 2 is the personal page (`drawPersonalSheet()`, only when there is a Hebrew name and/or a birthday): hero name + Hebrew name, panels «Мой стих в Танахе» (right) and «Мой день в „Айом-йом“» (left), or one wide panel; each with its Hebrew and local reference and a one-line note (`sheet.*`). The final screen shows both, downloads each and prints both (one page each); for each missing part it shows a hint with a link to the section.

## About window

- «О приложении» (`showAbout()` in `game.js`) opens from the menu and from the title footer: project link `PROJECT_URL` (https://mychitas.app), short description, rights to the lesson and the music, open-source libraries, privacy. Texts are `about.*` in the locales — update them when the lesson source, music or libraries change.

## Design

- Icons only from `ICONS` in `art.js` (`icon('name')`), no emoji. The Keeper's moods: `smile`, `joy`, `think`, `wow`, `warm`, `point`.
- Hero screen: age and boy/girl are required, numbered blocks; «Готово» without them turns the missing block red with a hint (`--err`), scrolls to it and speaks the hint.
- Contrast WCAG AA; mobile first (375 px wide), one-line HUD, final screen in tabs.
- HUD: the hero chip (top left) opens `showProfile()` — level, progress, achievements; the menu button (top right) opens `showMenu()` — navigation, sound switches, language, «О приложении», donate link. Both are bottom sheets built with `openSheet()` (title + ✕, Escape, tap outside).
- «Назад» (`#backbar` under `#stage`, `backBar()`/`goBack()`/`backTarget()` in `game.js`) is at the bottom of every screen except the title: a step back inside a world or the prologue, from step 0 to the map, from the map to the title, from «К Шабату» / «Твой стих» to where they were opened. The phone's back button does the same (`armBack()` keeps one extra history entry; `popstate` first closes an open sheet or the quick menu). A new screen needs a line in `backTarget()`.
- New world visuals: add a theme to `THEMES`/`WORLD_THEME` and a backdrop to `SCENES` in `art.js`.

## Git

- Work on the branch given in the task; `main` is updated through PRs. Other contributors (including Copilot) also push to `main` — fetch and merge `origin/main` before opening a PR, then re-run `npm test`.
- Commit messages in Russian, describing what changed for players and teachers.
