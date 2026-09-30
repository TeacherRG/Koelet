# Koelet

Game text is stored per language in `/content/<lang>/`: shared labels and settings are in `shared.json`, the introduction is in `prologue.json`, and each of the seven worlds has its own JSON file. Interface strings (buttons, menus, certificate, mini-games) are in `/locales/<lang>.json`. Run the game through a web server so the browser can load these files.

## Run and test

- `npm start` — local server at http://localhost:8080 (no dependencies).
- `npm test` — syntax check, data check for all languages, and a full playthrough in Chromium for ru/uk/de, both age groups. Needs `npm install` once (Playwright).
- `npm run test:data` — fast check of texts only (no browser): catches missing translations, broken JSON, wrong placeholders or gender forms.
- `npm run test:play -- --shots` — playthrough with screenshots of every screen in `tests/screenshots/`.

Project rules for contributors and Claude Code are in `CLAUDE.md`.

## Languages

Available: Russian (`ru`, default), Ukrainian (`uk`) and German (`de`). The game picks the saved language, otherwise the browser language, otherwise Russian. Players can switch on the title screen and in the menu.

`i18n.js` is the language module. It provides `t('key', {vars})` for interface strings and `tl('key')` for lists, and it loads all texts for the chosen language.

To add a language:

1. Copy `content/ru/` to `content/<lang>/` and translate the text values. Keep the structure, keys and technical values (`type`, `key`, `ic`, `game`, `who: "mentor"`, Hebrew `he`) unchanged.
2. Copy `locales/ru.json` to `locales/<lang>.json` and translate the values. Keys that are missing fall back to Russian.
3. Add the language to `LANGS` in `i18n.js`.

Placeholders in interface strings look like `{{name}}`. Forms that depend on the player's gender look like `{boy form|girl form}`, e.g. `{Wanderer|Wanderin}`. Texts for the two age groups are written as `{"__ag": 1, "y": "8–11", "t": "12–15"}`.

## Third-party code

`vendor/headbreaker.js` is [headbreaker](https://github.com/flbulgarelli/headbreaker) 3.0.0 (ISC) bundled with [Konva](https://konvajs.org) 6.0.0 (MIT), built from the official npm sources. It powers the real jigsaw in the “Puzzle” world. It is stored in the repository and loaded only on that step, so the game does not contact any outside server. License texts are in `vendor/LICENSES.md`.

## Music and voice

The game is a spoken quest: when it opens, the Keeper greets the player, and on every screen a voice says what to do (browser speech synthesis in the chosen language). Background music plays from `music/` — four Chabad niggunim listed in `music/tracks.json`. Browsers allow sound only after the first tap, so the game starts with a screen «Начать с музыкой» / «Без звука». Music and voice are on at every start («Без звука» lasts only until the page is reloaded). If the Keeper has been silent for a minute and the player has tapped nothing, he asks «Тебе чем-то помочь?» and repeats what to do. Music, track, volume and voice hints can be changed in the menu and on the title screen; track and volume are remembered.

## Camera (mirror)

In the “Mirror” world the player can turn on the camera to see themselves in a mirror. The camera starts only after the player presses the button and the browser grants access. The picture stays in the browser: it is not sent or recorded anywhere, and the camera turns off when the player moves on. Without a camera, or if access is denied, the mirror shows the player’s avatar. Browsers allow the camera only over `https://` or on `localhost`.
