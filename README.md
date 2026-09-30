# Koelet

Game text is stored per language in `/content/<lang>/`: shared labels and settings are in `shared.json`, the introduction is in `prologue.json`, and each of the seven worlds has its own JSON file. Interface strings (buttons, menus, certificate, mini-games) are in `/locales/<lang>.json`. Run the game through a web server so the browser can load these files.

## Languages

Available: Russian (`ru`, default) and German (`de`). The game picks the saved language, otherwise the browser language, otherwise Russian. Players can switch on the title screen and in the menu.

`i18n.js` is the language module. It provides `t('key', {vars})` for interface strings and `tl('key')` for lists, and it loads all texts for the chosen language.

To add a language:

1. Copy `content/ru/` to `content/<lang>/` and translate the text values. Keep the structure, keys and technical values (`type`, `key`, `ic`, `game`, `who: "mentor"`, Hebrew `he`) unchanged.
2. Copy `locales/ru.json` to `locales/<lang>.json` and translate the values. Keys that are missing fall back to Russian.
3. Add the language to `LANGS` in `i18n.js`.

Placeholders in interface strings look like `{{name}}`. Forms that depend on the player's gender look like `{boy form|girl form}`, e.g. `{Wanderer|Wanderin}`. Texts for the two age groups are written as `{"__ag": 1, "y": "8–11", "t": "12–15"}`.
