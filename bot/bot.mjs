// Telegram-бот «Мой удел в Торе»: запуск (long polling, без зависимостей, Node 18+).
//   TELEGRAM_BOT_TOKEN=123:abc npm run bot
// Логика и тексты — bot/core.mjs и bot/texts.json; как развернуть — bot/README.md.
import {handle, load, commands, LANGS} from './core.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('Set TELEGRAM_BOT_TOKEN (token from @BotFather).'); process.exit(1); }
const BASE = `https://api.telegram.org/bot${TOKEN}/`;

async function api(method, params = {}) {
  const r = await fetch(BASE + method, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(params)});
  const j = await r.json().catch(() => ({ok: false, description: `HTTP ${r.status}`}));
  // «message is not modified» и подобное — не ошибка разговора; в лог — только метод и описание, без текста людей
  if (!j.ok && !/not modified/.test(j.description || '')) console.error(`${method}: ${j.description}`);
  return j.result;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

await load();
const me = await api('getMe');
if (!me) { console.error('Bad token?'); process.exit(1); }
await api('setMyCommands', {commands: commands('ru')});
for (const l of LANGS) await api('setMyCommands', {commands: commands(l), language_code: l});
console.log(`@${me.username} is running`);

let offset = 0, stop = false;
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { stop = true; console.log('stopping…'); });
while (!stop) {
  let ups;
  try { ups = await api('getUpdates', {offset, timeout: 50, allowed_updates: ['message', 'callback_query']}); }
  catch (e) { console.error('getUpdates:', e.message); await wait(5000); continue; }
  if (!Array.isArray(ups)) { await wait(5000); continue; }
  for (const u of ups) {
    offset = u.update_id + 1;
    try { await handle(u, api); } catch (e) { console.error('update failed:', e.message); }
  }
}
