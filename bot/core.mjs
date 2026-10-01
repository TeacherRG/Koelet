// Telegram-бот «Мой удел в Торе»: ядро без сети (сеть — в bot/bot.mjs, проверка — tests/bot.mjs).
// Бот считает три свитка теми же файлами, что и игра: pasuk.js (стих имени), hayomyom.js («Айом-йом»),
// lot.js (глава рождения) — они запускаются в vm с данными из data/ и строками из locales/, поэтому
// ответ бота всегда совпадает с сайтом. Свои строки бота — bot/texts.json (ru/uk/de/en, те же ключи).
// Ничего не пишется на диск и в лог: ответы живут в памяти, пока человек отвечает, и стираются,
// когда свитки открыты (или через сутки без ответа). Язык помнится в памяти, пока бот работает.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const LANGS = ['ru', 'uk', 'de', 'en'];
export const SITE = 'https://mylot.mychitas.app/';
const readJSON = p => JSON.parse(readFileSync(ROOT + p, 'utf8'));
export const TEXTS = readJSON('bot/texts.json');
const LOC = Object.fromEntries(LANGS.map(l => [l, readJSON(`locales/${l}.json`)]));
const PTXT = Object.fromEntries(LANGS.map(l => [l, (() => { try { return readJSON(`content/${l}/parsha.json`); } catch (e) { return {}; } })()]));

/* ---------- код игры в песочнице ---------- */
// то, что в браузере дают i18n.js и game.js: t/tl, роды {м|ж}, возраст, esc, язык дат
const PRELUDE = `
var S={hero:{}},LANG='ru',UI={},UI_BASE={};
const LANGS={ru:{locale:'ru-RU'},uk:{locale:'uk-UA'},de:{locale:'de-DE'},en:{locale:'en-GB'}};
const langLocale=()=>LANGS[LANG].locale;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const young=()=>S.hero.age==='y';
const adult=()=>S.hero.age==='a';
const T=s=>typeof s==='string'?s.replace(/\\{([^{}|]*)\\|([^{}|]*)\\}/g,(_,m,f)=>S.hero.g==='f'?f:m):s;
function R(v){
  if(typeof v==='string')return T(v);
  if(Array.isArray(v))return v.map(R);
  if(v&&typeof v==='object'){if(v.__ag)return R(young()?v.y:adult()&&'a' in v?v.a:v.t);const o={};for(const k in v)o[k]=R(v[k]);return o}
  return v;
}
function t(key,vars){let s=UI[key]??UI_BASE[key];if(s==null)return key;if(typeof s!=='string')return s;
  if(vars)s=s.replace(/\\{\\{(\\w+)\\}\\}/g,(_,n)=>vars[n]??'');return T(s)}
function tl(key){return R(UI[key]??UI_BASE[key])}
`;
const API = `({hebGuess,hebFinals,hebOnly,pairVerses,nameVerse,firstOf,baseL,HEB_AB,bdayHeb,hayomEntry,hyDate,hyHebDate,
  T,t,tl,birthRD,parshaOf,parshaHe,parshaName,parshaRange,rdToHeb,hebDateStr,rdDate,parshaText,loadPesukim,loadHayom,loadParsha})`;
const ctx = vm.createContext({console, fetch: async p => {
  try { const d = readFileSync(ROOT + p, 'utf8'); return {ok: true, json: async () => JSON.parse(d)}; }
  catch (e) { return {ok: false, status: 404}; }
}});
vm.runInContext(PRELUDE, ctx, {filename: 'bot-prelude.js'});
for (const f of ['hayomyom.js', 'pasuk.js', 'lot.js']) vm.runInContext(readFileSync(ROOT + f, 'utf8'), ctx, {filename: f});
const G = vm.runInContext(API, ctx);
let ready = null;
/* все данные — сразу при старте: дальше расчёты синхронные, и общий S песочницы не путается между людьми */
export const load = () => ready || (ready = Promise.all([G.loadPesukim([...Array(22).keys()]), G.loadHayom(), G.loadParsha()]));

/* код игры видит одного «героя»: перед каждым расчётом ставим этого человека */
function as(u, fn) {
  ctx.S = {hero: {g: u.g || 'm', age: 't', name: u.name || ''}, hebName: u.heb || '', bday: u.bday || null};
  ctx.LANG = u.lang; ctx.UI = LOC[u.lang]; ctx.UI_BASE = LOC.ru;
  return fn();
}
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
/* строка бота (bot/texts.json) или игры (locales), {{x}} и роды {м|ж} */
function tx(u, key, vars) {
  const s = TEXTS[u.lang]?.[key] ?? TEXTS.ru[key];
  if (s == null) return as(u, () => G.t(key, vars));
  return as(u, () => G.T(s.replace(/\{\{(\w+)\}\}/g, (_, n) => vars?.[n] ?? '')));
}
const tlist = (u, key) => as(u, () => G.tl(key));

/* ---------- разговор ---------- */
const users = new Map();   // chat id → ответы, пока человек отвечает
const langs = new Map();   // chat id → выбранный язык
const DAY = 864e5;
const HY_PICK = [0, 1, 2, 3, 4, 'adar', 5, 6, 7, 8, 9, 10, 11, 12];
const KB = [...'אבגדהוזחטיכךלמםנןסעפףצץקרשת'];
const btn = (text, data) => ({text, callback_data: data});
const rows = (list, n) => list.reduce((a, b, i) => (i % n ? a[a.length - 1].push(b) : a.push([b]), a), []);
const siteUrl = u => SITE + (u.lang === 'ru' ? '' : `?lang=${u.lang}`);

export function forget(now = Date.now()) {
  for (const [id, u] of users) if (now - u.at > DAY) users.delete(id);
}
function langOf(id, from) {
  if (langs.has(id)) return langs.get(id);
  const c = String(from?.language_code || '').slice(0, 2).toLowerCase();
  return LANGS.includes(c) ? c : 'ru';
}
function fresh(id, from) {
  const u = {lang: langOf(id, from), step: 'g', at: Date.now(), tgName: (from?.first_name || '').slice(0, 40)};
  users.set(id, u);
  return u;
}
const heroName = u => (u.name || u.tgName || tx(u, 'hero.default')).slice(0, 40);

/* шаги: g → name → (confirm | kb) → mode → greg → sun → place | hm → hd → hy → place → свитки */
function ask(u) {
  switch (u.step) {
    case 'g': return {text: tx(u, 'askG'), kb: [[btn(tx(u, 'g.m'), 'g:m'), btn(tx(u, 'g.f'), 'g:f')]]};
    case 'name': return {text: tx(u, 'askName')};
    case 'confirm': return {text: tx(u, 'nameGuess', {heb: esc(u.heb)}),
      kb: [[btn(tx(u, 'nameOk'), 'n:ok'), btn(tx(u, 'nameFix'), 'n:fix')], [btn(tx(u, 'lot.skip'), 'n:skip')]]};
    case 'kb': return {text: tx(u, 'kbHint', {heb: u.heb ? `<b>${esc(u.heb)}</b>` : '—'}),
      kb: [...rows(KB.map(c => btn(c, 'k:' + c)), 7), [btn('␣', 'k:sp'), btn('⌫', 'k:del'), btn(tx(u, 'kbDone'), 'k:ok')], [btn(tx(u, 'lot.skip'), 'n:skip')]]};
    case 'mode': return {text: tx(u, 'lot.dateSay') + '\n\n' + tx(u, 'dateNote'),
      kb: [[btn(tx(u, 'hy.mode.g'), 'm:g'), btn(tx(u, 'hy.mode.h'), 'm:h')], [btn(tx(u, 'lot.skip'), 'm:skip')]]};
    case 'greg': return {text: tx(u, 'askGreg')};
    case 'sun': return {text: tx(u, 'askSun'), kb: [[btn(tx(u, 'sunDay'), 's:0')], [btn(tx(u, 'sunEve'), 's:1')]]};
    case 'hm': {
      const months = tlist(u, 'hy.months');
      return {text: tx(u, 'askHm'), kb: rows(HY_PICK.map(k => btn(k === 'adar' ? tx(u, 'hy.adar') : months[k], 'hm:' + k)), 3)};
    }
    case 'hd': return {text: tx(u, 'askHd')};
    case 'hy': return {text: tx(u, 'askHy'), kb: [[btn(tx(u, 'yearSkip'), 'y:skip')]]};
    case 'place': return {text: `${tx(u, 'hy.placeH')}\n${tx(u, 'hy.placeHint')}`,
      kb: [[btn(tx(u, 'hy.place.d'), 'p:0'), btn(tx(u, 'hy.place.il'), 'p:1')]]};
  }
  return null;
}

/* ---------- три свитка ---------- */
function verseText(v, first) {
  let s = esc(v[3]);
  if (first) {
    const a = s.search(/[א-ת]/), b = s.search(/[א-ת][^א-ת]*$/);
    if (a >= 0 && b > a) s = s.slice(0, a) + '<b>' + s[a] + '</b>' + s.slice(a + 1, b) + '<b>' + s[b] + '</b>' + s.slice(b + 1);
  }
  return s;
}
const bookHe = i => vm.runInContext('PESUKIM', ctx).books[i] || '';
const verseRef = (u, v) => `${esc(tlist(u, 'pasuk.books')[v[0]] || '')} ${v[1]}:${v[2]} · ${esc(bookHe(v[0]))}`;
const names = heb => G.hebFinals(heb || '').trim().split(' ').filter(n => n.length >= 2).slice(0, 3);

function scrollVerse(u) {
  const head = `<b>1 · ${esc(tx(u, 'lot.verseH'))}</b> · פָּסוּק`;
  const ns = names(u.heb);
  if (!ns.length) return {text: `${head}\n\n${esc(tx(u, 'lot.verseNeed'))}`};
  const letters = tlist(u, 'pasuk.letters'), L = c => letters[G.HEB_AB.indexOf(G.baseL(c))] || '';
  const kb = [];
  const parts = ns.map(n => {
    const [pv, ...more] = G.pairVerses(n), nv = G.nameVerse(n);
    if (more.length) kb.push([btn(tx(u, 'pasuk.more', {n: more.length}) + (ns.length > 1 ? ` · ${n}` : ''), 'more:' + n)]);
    return `<b>${esc(n)}</b>\n${esc(tx(u, 'pasuk.what', {a: L(n[0]), b: L(n.at(-1))}))}\n\n` +
      (pv ? `${verseText(pv, true)}\n<i>${verseRef(u, pv)}</i>` : esc(tx(u, 'pasuk.none'))) +
      (nv ? `\n\n<b>${esc(tx(u, 'pasuk.withName'))}</b>\n${verseText(nv)}\n<i>${verseRef(u, nv)}</i>` : '');
  });
  return {text: `${head}\n\n${parts.join('\n\n')}\n\n<i>${esc(tx(u, 'sheet.verseNote'))}</i>`, kb};
}
function scrollHayom(u) {
  const head = `<b>2 · ${esc(tx(u, 'lot.hayomH'))}</b> · הַיּוֹם יוֹם`;
  const h = as(u, () => G.bdayHeb());
  if (!h) return {text: `${head}\n\n${esc(tx(u, 'lot.hayomNeed'))}`};
  const e = as(u, () => G.hayomEntry(h));
  if (!e) return {text: `${head}\n\n${esc(tx(u, 'hy.none'))}`};
  return {text: `${head}\n<b>${esc(as(u, () => G.hyDate(e)))}</b> · ${esc(as(u, () => G.hyHebDate(e)))}\n\n` +
    (e.near ? `<i>${esc(tx(u, 'hy.near', {date: as(u, () => G.hyDate(e))}))}</i>\n\n` : '') +
    `${esc(e.text)}\n\n<i>${esc(tx(u, 'hy.cite'))}</i>`};
}
function scrollParsha(u) {
  const head = `<b>3 · ${esc(tx(u, 'lot.parshaH'))}</b> · פָּרָשָׁה`;
  const pp = as(u, () => { const rd = G.birthRD(); return rd == null ? null : G.parshaOf(rd, !!u.bday?.il); });
  if (!pp) return {text: `${head}\n\n${esc(tx(u, 'lot.parshaNeed'))}`};
  return as(u, () => {
    const tex = PTXT[u.lang]?.parshiot || PTXT.ru.parshiot || [];
    const theme = pp.p.map(i => G.parshaText((tex[i] || {}).theme)).filter(Boolean);
    const q = pp.p.map(i => G.parshaText((tex[i] || {}).question)).filter(Boolean);
    return {text: `${head}\n\n<b>פָּרָשַׁת ${esc(G.parshaHe(pp))}</b> · ${esc(G.parshaName(pp))}\n` +
      `${esc(G.t('lot.parshaWhen', {date: G.rdDate(pp.sh)}))} · ${esc(G.hebDateStr(G.rdToHeb(pp.sh)))}\n` +
      `${esc(G.t('lot.parshaRange', {range: G.parshaRange(pp)}))}` +
      (pp.moved ? `\n\n<i>${esc(G.t('lot.parshaMoved', {date: G.rdDate(pp.holiday)}))}</i>` : '') +
      (theme.length ? `\n\n${esc(theme.join('\n\n'))}` : '') + (q.length ? `\n\n<b>${esc(q.join(' '))}</b>` : '') +
      `\n\n<i>${esc(G.t(u.bday?.il ? 'lot.parshaIL' : 'lot.parshaD'))}</i>`};
  });
}

/* ---------- обработка обновления Telegram ---------- */
// api(method, params) — вызов Bot API; в тестах подменяется
export async function handle(upd, api) {
  await load();
  forget();
  const send = (id, m) => api('sendMessage', {chat_id: id, text: m.text, parse_mode: 'HTML', link_preview_options: {is_disabled: true},
    ...(m.kb?.length ? {reply_markup: {inline_keyboard: m.kb}} : {})});
  const next = async (id, u) => {
    if (u.step === 'done') return reveal(id, u);
    await send(id, ask(u));
  };
  const reveal = async (id, u) => {
    users.delete(id);   // ответы больше не нужны
    await send(id, {text: esc(tx(u, 'lot.revealSay', {name: heroName(u)}))});
    for (const m of [scrollVerse(u), scrollHayom(u), scrollParsha(u)]) await send(id, m);
    await send(id, {text: tx(u, 'end'), kb: [[{text: tx(u, 'openSite'), url: siteUrl(u)}], [btn(tx(u, 'again'), 'r')]]});
  };

  if (upd.callback_query) {
    const q = upd.callback_query, id = q.message?.chat?.id, d = q.data || '';
    await api('answerCallbackQuery', {callback_query_id: q.id});
    if (id == null) return;
    if (d.startsWith('l:') && LANGS.includes(d.slice(2))) {
      langs.set(id, d.slice(2));
      const u = users.get(id);
      if (u) { u.lang = d.slice(2); return next(id, u); }
      return start(id, q.from);
    }
    if (d.startsWith('more:')) return more(id, {lang: langOf(id, q.from)}, d.slice(5));
    if (d === 'r') return start(id, q.from);
    const u = users.get(id);
    if (!u) return start(id, q.from);
    u.at = Date.now();
    const [k, v] = [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)];
    const done = () => api('editMessageReplyMarkup', {chat_id: id, message_id: q.message.message_id, reply_markup: {inline_keyboard: []}});
    if (k === 'g' && u.step === 'g') { u.g = v === 'f' ? 'f' : 'm'; u.step = 'name'; await done(); return next(id, u); }
    if (k === 'n' && ['confirm', 'kb'].includes(u.step)) {
      if (v === 'fix') { u.step = 'kb'; await done(); return next(id, u); }
      if (v === 'skip') u.heb = '';
      u.step = 'mode'; await done(); return next(id, u);
    }
    if (k === 'k' && u.step === 'kb') {
      if (v === 'ok') {
        if (names(u.heb).length) { u.step = 'mode'; await done(); return next(id, u); }
        return send(id, {text: tx(u, 'nameShort')});
      }
      const h = u.heb || '';
      u.heb = v === 'del' ? h.slice(0, -1) : G.hebFinals(G.hebOnly(h + (v === 'sp' ? ' ' : v)));
      const m = ask(u);
      return api('editMessageText', {chat_id: id, message_id: q.message.message_id, text: m.text, parse_mode: 'HTML', reply_markup: {inline_keyboard: m.kb}});
    }
    if (k === 'm' && u.step === 'mode') {
      await done();
      if (v === 'skip') { u.bday = null; u.step = 'done'; return next(id, u); }
      u.bday = v === 'h' ? {mode: 'h', hd: '', hm: '', hy: ''} : {mode: 'g', g: '', sunset: false};
      u.step = v === 'h' ? 'hm' : 'greg'; return next(id, u);
    }
    if (k === 's' && u.step === 'sun') { u.bday.sunset = v === '1'; u.step = 'place'; await done(); return next(id, u); }
    if (k === 'hm' && u.step === 'hm' && HY_PICK.map(String).includes(v)) { u.bday.hm = v; u.step = 'hd'; await done(); return next(id, u); }
    if (k === 'y' && u.step === 'hy') { u.bday.hy = ''; u.step = 'done'; await done(); return next(id, u); }   // без года главы нет — место не нужно
    if (k === 'p' && u.step === 'place') { u.bday.il = v === '1'; u.step = 'done'; await done(); return next(id, u); }
    return;   // старая кнопка — молчим
  }

  const msg = upd.message;
  if (!msg?.chat || typeof msg.text !== 'string') return;
  const id = msg.chat.id, text = msg.text.trim();
  const cmd = text.match(/^\/(\w+)/)?.[1]?.toLowerCase();
  if (cmd === 'start') return start(id, msg.from);
  if (cmd === 'lang') return send(id, {text: tx({lang: langOf(id, msg.from)}, 'langPick'), kb: [LANGS.map(l => btn(TEXTS[l].langName, 'l:' + l))]});
  if (cmd === 'privacy') return send(id, {text: tx({lang: langOf(id, msg.from)}, 'privacy')});
  if (cmd === 'help') return send(id, {text: tx({lang: langOf(id, msg.from)}, 'help')});
  const u = users.get(id);
  if (!u || cmd) return start(id, msg.from);
  u.at = Date.now();
  switch (u.step) {
    case 'name': {
      if (/[א-ת]/.test(text)) { u.heb = G.hebFinals(G.hebOnly(text)).trim(); u.step = names(u.heb).length ? 'confirm' : 'kb'; }
      else { u.name = text.replace(/\s+/g, ' ').slice(0, 40); u.heb = G.hebGuess(u.name); u.step = names(u.heb).length ? 'confirm' : 'kb'; }
      return next(id, u);
    }
    case 'confirm': case 'kb':
      if (/[א-ת]/.test(text)) { u.heb = G.hebFinals(G.hebOnly(text)).trim(); u.step = names(u.heb).length ? 'confirm' : 'kb'; return next(id, u); }
      return send(id, {text: tx(u, 'useButtons')});
    case 'greg': {
      const g = parseGreg(text);
      if (!g) return send(id, {text: tx(u, 'badDate')});
      u.bday.g = g; u.step = 'sun'; return next(id, u);
    }
    case 'hd': {
      const d = +text;
      if (!/^\d{1,2}$/.test(text) || d < 1 || d > 30) return send(id, {text: tx(u, 'badHd')});
      u.bday.hd = String(d); u.step = 'hy'; return next(id, u);
    }
    case 'hy': {
      const y = +text, max = new Date().getFullYear() + 3761;
      if (!/^\d{4}$/.test(text) || y < 5600 || y > max) return send(id, {text: tx(u, 'badHy', {max})});
      u.bday.hy = String(y); u.step = 'place'; return next(id, u);
    }
  }
  return send(id, {text: tx(u, 'useButtons')});

  async function start(id, from) {
    const u = fresh(id, from);
    await send(id, {text: tx(u, 'start', {name: esc(heroName(u))}), kb: [LANGS.filter(l => l !== u.lang).map(l => btn(TEXTS[l].langName, 'l:' + l))]});
    return next(id, u);
  }
  async function more(id, u, n) {
    n = G.hebFinals(G.hebOnly(n)).trim();
    if (n.length < 2) return;
    const [, ...list] = G.pairVerses(n);
    let out = `<b>${esc(n)}</b> · ${esc(tx(u, 'pasuk.more', {n: list.length}))}`;
    for (const [i, v] of list.entries()) {
      const line = `\n\n${i + 1}. ${verseText(v)}\n<i>${verseRef(u, v)}</i>`;
      if (out.length + line.length > 3800) { await send(id, {text: out}); out = ''; }
      out += line;
    }
    return send(id, {text: out.trim()});
  }
}

/* 14.03.2012, 14/3/2012, 2012-03-14 → 'YYYY-MM-DD' (только существующий прошедший день) */
export function parseGreg(s) {
  let m = s.match(/^(\d{1,2})[./\- ](\d{1,2})[./\- ](\d{4})$/), y, mo, d;
  if (m) [d, mo, y] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1850 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || dt > new Date()) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* команды в меню Telegram — на каждом языке */
export const commands = l => ['start', 'lang', 'privacy', 'help'].map(c => ({command: c, description: TEXTS[l]['cmd.' + c]}));
