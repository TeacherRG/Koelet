// Fast data check (no browser): npm run test:data
// Compares every language with Russian (the reference) and reports:
//  - invalid JSON, missing files or keys;
//  - different structure (keys, list lengths, step order);
//  - changed technical values (type, key, ic, game, who: "mentor", Hebrew...);
//  - {{placeholders}} and {boy|girl} forms that don't match or aren't closed;
//  - wrong alphabet (Cyrillic in German, Russian-only letters in Ukrainian).
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REF = 'ru';
const TECH = new Set(['type','key','game','ic','art','mood','age','tool','he','heb','pic','item','__dynamic','__ag','skin','hair','style','M']);
const ALPHABET = {
  de: {bad: /[А-Яа-яЁёІіЇїЄєҐґ]/, what: 'Cyrillic letters'},
  en: {bad: /[А-Яа-яЁёІіЇїЄєҐґ]/, what: 'Cyrillic letters'},
  uk: {bad: /[ЫыЭэЪъЁё]/, what: 'Russian-only letters (ы, э, ъ, ё)'}
};
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const i18n = await readFile(ROOT + 'i18n.js', 'utf8');
const langs = [...i18n.match(/const LANGS = \{([\s\S]*?)\};/)[1].matchAll(/^\s*(\w+):\{name:/gm)].map(m => m[1]);
const files = JSON.parse(i18n.match(/const CONTENT_FILES = (\[[^\]]*\])/)[1].replace(/'/g, '"'));

async function load(path) {
  try { return JSON.parse(await readFile(ROOT + path, 'utf8')); }
  catch (e) { err(path, e.code === 'ENOENT' ? 'file is missing' : 'invalid JSON — ' + e.message); return undefined; }
}
const placeholders = s => (s.match(/\{\{\w+\}\}/g) || []).sort().join(' ');
function checkString(where, s, lang) {
  const plain = s.replace(/\{\{\w+\}\}/g, '');
  const opens = (plain.match(/\{/g) || []).length, closes = (plain.match(/\}/g) || []).length;
  if (opens !== closes) err(where, `unbalanced { } in "${s.slice(0, 60)}"`);
  for (const m of plain.matchAll(/\{([^{}]*)\}/g)) if (!m[1].includes('|')) err(where, `gender form without "|": {${m[1]}}`);
  const a = ALPHABET[lang];
  if (a && a.bad.test(s)) err(where, `${a.what} in "${s.slice(0, 60)}"`);
}
// Walk reference and translation side by side.
function compare(where, ref, val, lang, key) {
  const t = v => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
  if (t(ref) !== t(val)) { err(where, `expected ${t(ref)}, got ${t(val)}`); return; }
  if (Array.isArray(ref)) {
    if (ref.length !== val.length) err(where, `list has ${val.length} items, ${REF} has ${ref.length}`);
    ref.forEach((r, i) => i < val.length && compare(`${where}[${i}]`, r, val[i], lang, key));
  } else if (t(ref) === 'object') {
    for (const k of Object.keys(ref)) {
      if (!(k in val)) err(where, `missing key "${k}"`);
      else compare(`${where}.${k}`, ref[k], val[k], lang, k);
    }
    for (const k of Object.keys(val)) if (!(k in ref)) err(where, `extra key "${k}"`);
  } else if (typeof ref === 'string') {
    if (TECH.has(key) || (key === 'who' && ref === 'mentor')) {
      if (ref !== val) err(where, `technical value changed: "${ref}" → "${val}"`);
    } else {
      if (placeholders(ref) !== placeholders(val)) err(where, `placeholders differ: "${placeholders(ref)}" vs "${placeholders(val)}"`);
      if (lang !== REF) checkString(where, val, lang);
    }
  }
}

for (const lang of langs) {
  if (lang !== REF) {
    for (const f of files) {
      const ref = await load(`content/${REF}/${f}.json`), val = await load(`content/${lang}/${f}.json`);
      if (ref !== undefined && val !== undefined) compare(`content/${lang}/${f}.json`, ref, val, lang);
    }
    const ref = await load(`locales/${REF}.json`), val = await load(`locales/${lang}.json`);
    if (ref !== undefined && val !== undefined) compare(`locales/${lang}.json`, ref, val, lang);
  } else {
    for (const f of files) await load(`content/${REF}/${f}.json`);
    await load(`locales/${REF}.json`);
  }
}

if (errors.length) {
  console.error(`✗ Data check failed (${errors.length}):\n  ` + errors.slice(0, 80).join('\n  ') + (errors.length > 80 ? `\n  …and ${errors.length - 80} more` : ''));
  process.exit(1);
}
console.log(`✓ Data check passed: ${langs.join(', ')} · ${files.length} content files + locales`);
