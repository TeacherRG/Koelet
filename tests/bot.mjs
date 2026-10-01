// Telegram-бот «Мой удел в Торе» без сети: npm run test:bot
// Тексты бота (bot/texts.json) — одинаковые ключи и {{переменные}} на всех языках; на каждом языке бот проходит
// разговор с обычной и с еврейской датой, и три свитка совпадают с расчётом игры (тот же код, что на сайте).
import {handle, TEXTS, LANGS, parseGreg, forget} from '../bot/core.mjs';

const errors = [];
const fail = m => errors.push(m);

// 1. тексты
const ru = TEXTS.ru, vars = s => (s.match(/\{\{\w+\}\}/g) || []).sort().join();
for (const l of LANGS) {
  const d = TEXTS[l];
  if (!d) { fail(`${l}: no texts`); continue; }
  for (const k in ru) {
    if (typeof d[k] !== 'string' || !d[k].trim()) fail(`${l}: missing ${k}`);
    else if (vars(d[k]) !== vars(ru[k])) fail(`${l}.${k}: placeholders ${vars(d[k])} ≠ ${vars(ru[k])}`);
    if (/\bБог\b|\bGod\b|\bGott\b/.test(d[k] || '')) fail(`${l}.${k}: write «Всевышний» / «the Almighty» / «G-tt»`);
  }
  for (const k in d) if (!(k in ru)) fail(`${l}: extra key ${k}`);
}

// 2. разговоры
let chat = 1000;
async function talk(lang, steps) {
  const id = ++chat, from = {first_name: 'Test', language_code: lang}, out = [];
  let mid = 0;
  const api = async (method, p) => {
    if (method === 'sendMessage') {
      if (p.text.length > 4096) fail(`${lang}: message longer than 4096`);
      if (/\{\{|\{[^{}|]*\|[^{}|]*\}/.test(p.text)) fail(`${lang}: unresolved placeholder or gender form: ${p.text.slice(0, 80)}`);
      out.push(p);
      return {message_id: ++mid};
    }
    return true;
  };
  const say = text => handle({message: {chat: {id}, from, text}}, api);
  const tap = data => handle({callback_query: {id: 'q', from, data, message: {chat: {id}, message_id: mid}}}, api);
  for (const s of steps) await (s.startsWith('#') ? tap(s.slice(1)) : say(s));
  return out;
}
const T = (l, k) => TEXTS[l][k];
for (const lang of LANGS) {
  // обычная дата: Мария, 14.03.2012, днём, не в Израиле
  let out = await talk(lang, ['/start', '#g:f', 'Мария', '#n:ok', '#m:g', '32.13.2012', '14.03.2012', '#s:0', '#p:0']);
  const all = out.map(m => m.text).join('\n\n');
  if (!all.includes(T(lang, 'badDate'))) fail(`${lang}: wrong date accepted`);
  if (!all.includes('מרים')) fail(`${lang}: the name was not written in Hebrew`);
  if (!/פָּרָשַׁת /.test(all)) fail(`${lang}: no portion of the birth week`);
  if (!/<b>[א-ת]<\/b>/.test(all)) fail(`${lang}: no personal verse`);
  if (!all.includes('כ׳ אדר')) fail(`${lang}: Hayom Yom of 20 Adar (14.03.2012) missing`);
  if (!all.includes('ויקהל־פקודי')) fail(`${lang}: 14.03.2012 is the week of Vayakhel-Pekudei (Shabbat 17.03.2012, Hebcal)`);
  const last = out.at(-1);
  if (!last.reply_markup?.inline_keyboard?.flat().some(b => b.url?.startsWith('https://mylot.mychitas.app/'))) fail(`${lang}: no link to the game`);
  // еврейская дата, имя на иврите сразу, исправление на клавиатуре
  out = await talk(lang, ['/start', '#g:m', 'משה', '#n:fix', '#k:del', '#k:ה', '#k:ok', '#m:h', '#hm:7', '40', '15', '5770', '#p:1']);
  const all2 = out.map(m => m.text).join('\n\n');
  if (!all2.includes('ט״ו ניסן')) fail(`${lang}: Hayom Yom of 15 Nisan missing`);
  if (!all2.includes(T(lang, 'badHd'))) fail(`${lang}: wrong day accepted`);
  if (!/פָּרָשַׁת /.test(all2)) fail(`${lang}: no portion for a Hebrew date`);
  // всё пропустить: три свитка всё равно приходят, с подсказками
  out = await talk(lang, ['/start', '#g:m', 'Abc', '#n:skip', '#m:skip']);
  if (out.filter(m => /^<b>[123] · /.test(m.text)).length !== 3) fail(`${lang}: three scrolls expected after skipping`);
  // все стихи на буквы
  out = await talk(lang, ['#more:מרים']);
  if (!out.length || !out[0].text.includes('מרים')) fail(`${lang}: «more verses» failed`);
}
// 3. дата
for (const [s, want] of [['14.03.2012', '2012-03-14'], ['1/2/2000', '2000-02-01'], ['2012-03-14', '2012-03-14'], ['31.02.2012', null], ['14.03.2999', null], ['abc', null]])
  if (parseGreg(s) !== want) fail(`parseGreg(${s}) = ${parseGreg(s)}, expected ${want}`);
forget(Date.now() + 2 * 864e5);

if (errors.length) { console.error(`✗ Bot check failed:\n  ${errors.join('\n  ')}`); process.exit(1); }
console.log(`✓ Bot check passed: ${LANGS.length} languages, texts and conversations`);
