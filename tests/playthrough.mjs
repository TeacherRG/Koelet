// Full playthrough in a real browser (Playwright + Chromium): npm run test:play
// Plays the game from the title screen to the certificate for several
// language × age × gender combinations and checks every screen:
//  - no JavaScript errors and no failed local files;
//  - no leftover {boy|girl} forms, {{placeholders}}, raw locale keys or "undefined";
//  - the right alphabet (no Cyrillic in German, no ы/э/ъ/ё in Ukrainian);
//  - all 7 worlds done, final tabs render, certificate image is drawn;
//  - the real jigsaw appears and the mirror step works without a camera;
//  - the start screen turns on music, the greeting is spoken, every screen gets a voice hint;
//  - sound is on at every start, even if an earlier visit chose «Без звука»;
//  - after a silence the Keeper asks «Тебе чем-то помочь?».
//
// Options:
//   --lang=de        only scenarios in this language (ru | uk | de)
//   --quick          one scenario per language instead of all
//   --shots[=dir]    save screenshots of every screen (default: tests/screenshots/)
//   --headed         show the browser window
import {chromium} from 'playwright';
import {mkdir, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startServer} from '../tools/serve.mjs';
import {collect} from '../tools/voice-phrases.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name) => { const a = process.argv.find(x => x === `--${name}` || x.startsWith(`--${name}=`)); return a === undefined ? undefined : (a.split('=')[1] ?? true); };
const onlyLang = arg('lang'), quick = !!arg('quick'), headed = !!arg('headed');
const shotsDir = arg('shots') === undefined ? null : (arg('shots') === true ? ROOT + 'tests/screenshots' : arg('shots'));

const ALL = [
  {lang: 'ru', age: 't', g: 'm'}, {lang: 'ru', age: 'y', g: 'f'},
  {lang: 'uk', age: 'y', g: 'f'}, {lang: 'uk', age: 't', g: 'm'},
  {lang: 'de', age: 't', g: 'm'}, {lang: 'de', age: 'y', g: 'f'},
  {lang: 'ru', age: 'a', g: 'f'}, {lang: 'uk', age: 'a', g: 'm'}, {lang: 'de', age: 'a', g: 'f'}
];
let scenarios = ALL.filter(s => !onlyLang || s.lang === onlyLang);
if (quick) scenarios = scenarios.filter((s, i, a) => a.findIndex(x => x.lang === s.lang) === i);
if (!scenarios.length) { console.error(`No scenarios for --lang=${onlyLang}`); process.exit(2); }

const INPUT = {ru: ['Тест', 'собираю модели', 'умею мирить друзей'], uk: ['Тест', 'збираю моделі', 'вмію мирити друзів'], de: ['Test', 'Modelle bauen', 'Streit schlichten']};
const ALPHABET = {de: /[А-Яа-яЁёІіЇїЄєҐґ]/, uk: /[ЫыЭэЪъЁё]/};
const localeKeys = Object.keys(JSON.parse(await readFile(ROOT + 'locales/ru.json', 'utf8')));
const KEY_RE = new RegExp('(^|\\s)(' + localeKeys.map(k => k.replace(/\./g, '\\.')).join('|') + ')(\\s|$)');

function textProblems(text, lang) {
  const out = [];
  const snip = re => (text.match(new RegExp('.{0,30}' + re.source + '.{0,30}', 's')) || [''])[0].replace(/\s+/g, ' ');
  if (/[{}|]/.test(text)) out.push('leftover {…|…} or {{…}}: ' + snip(/[{}|]/));
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) out.push('undefined/NaN: ' + snip(/undefined|NaN|\[object Object\]/));
  if (KEY_RE.test(text)) out.push('raw locale key: ' + snip(KEY_RE));
  if (ALPHABET[lang]?.test(text)) out.push('wrong alphabet: ' + snip(ALPHABET[lang]));
  return out;
}

async function run(browser, base, sc) {
  const name = `${sc.lang}-${{y: '8-11', t: '12-15', a: '16plus'}[sc.age]}-${sc.g === 'f' ? 'girl' : 'boy'}`;
  const ctx = await browser.newContext({viewport: {width: 375, height: 800}});
  const page = await ctx.newPage();
  const problems = new Set(), seen = {jigsaw: false, mirror: false};
  const add = m => problems.add(m);
  page.on('pageerror', e => add('JS error: ' + e.message));
  page.on('requestfailed', r => { if (r.url().startsWith(base) && !/\/audio\/.*\.mp3$/.test(r.url())) add('failed to load ' + r.url().slice(base.length)); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) add('console error: ' + m.text()); });
  await page.addInitScript(l => {
    try { localStorage.setItem('koelet-lang', l); localStorage.setItem('koelet-audio', JSON.stringify({music: false, voice: false})); } catch (e) {}   // an old «Без звука» must not stick
    // record everything the voice guide says (headless browsers have no audible voices)
    window.__spoken = [];
    if (window.speechSynthesis) { const orig = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__spoken.push(u.text); try { orig(u); } catch (e) {} }; }
  }, sc.lang);
  // ready-made voice (audio/<lang>/): the list of every phrase from the texts, the mp3 files
  // themselves are «missing» so the browser voice speaks and gets recorded
  const phrases = [...collect(sc.lang).keys()];
  await page.route(`${base}audio/${sc.lang}/index.json`, r => r.fulfill({json: {keys: phrases}}));
  await page.route(`${base}audio/**/*.mp3`, r => r.fulfill({status: 404, body: ''}));
  await page.goto(base + 'index.html');
  await page.waitForSelector('#start', {timeout: 15000});
  await page.waitForFunction(() => Voice.keys, null, {timeout: 5000}).catch(() => add('voice: audio/index.json was not loaded'));
  await page.evaluate(() => { window.__miss = []; const clip = Voice.clip; Voice.clip = function (s) { const r = clip.call(this, s); if (!r) window.__miss.push(s); return r; }; });
  let shot = 0;
  // start screen: the tap turns on music and the greeting
  if (!(await page.waitForSelector('#gate-go', {timeout: 5000}).catch(() => null))) add('start screen (music gate) did not appear');
  else {
    await page.click('#gate-go');
    await page.waitForTimeout(1500);
    const a = await page.evaluate(() => ({playing: Music.playing, t: Music.el ? Music.el.currentTime : 0, spoken: window.__spoken.slice()}));
    if (!a.playing || a.t <= 0) add('background music is not playing after the start screen');
    if (!a.spoken.length) add('greeting was not spoken');
  }
  const snap = async label => { if (shotsDir) await page.screenshot({path: `${shotsDir}/${name}-${String(++shot).padStart(3, '0')}-${label}.png`, fullPage: true}); };
  await snap('title');
  const [heroName, ownFlow, ownQuality] = INPUT[sc.lang];
  // quick settings on the title screen: language + music/voice switches
  await page.click('#setbtn');
  if (!(await page.$('#qmenu [data-lang]')) || (await page.$$('#qmenu [data-audio]')).length !== 2) add('title settings menu is incomplete');
  await page.keyboard.press('Escape');
  await page.click('#start');
  // «Готово» without age and gender → both fields turn red with a hint
  await page.click('#ready');
  if ((await page.$$('.req.bad .req-err')).length !== 2 || await page.evaluate(() => S.screen) !== 'create') add('missing age/gender is not highlighted on the hero screen');
  await page.click(`[data-age="${sc.age}"]`); await page.click(`[data-g="${sc.g}"]`);
  await page.fill('#hname', heroName);
  await snap('create');
  await page.click('#ready'); await page.click('#go');

  const has = async s => (await page.$(s)) !== null;
  const enabled = async s => { const e = await page.$(s); return !!e && await e.isEnabled(); };
  let steps = 0, ownUsed = false, i = 0;
  for (; i < 700; i++) {
    const screen = await page.evaluate(() => S.screen);
    const text = await page.evaluate(() => document.querySelector('#stage').innerText);
    for (const p of textProblems(text, sc.lang)) add(`[${screen}] ${p}`);
    if (screen === 'final') break;
    if (!(await has('.whatif')) && await has('#wi')) { await page.click('#wi'); continue; }
    if (await enabled('#nx')) { await snap(screen); await page.click('#nx'); steps++; continue; }
    if (screen === 'map') { const n = await page.$('.mnode.open'); if (n) { await n.click(); continue; } if (await has('#fin')) { await page.click('#fin'); continue; } }
    if (await has('#autosolve')) {
      seen.jigsaw = !!(await page.waitForSelector('#jig canvas', {timeout: 10000}).catch(() => null));
      if (!seen.jigsaw) add('jigsaw did not render');
      await snap('jigsaw'); await page.click('#autosolve'); continue;
    }
    if (await has('#camskip')) { seen.mirror = true; await snap('mirror'); await page.click('#camskip'); continue; }
    if (!ownUsed && await has('#ownok') && await has('.opts') && await enabled('#ownin')) { await page.fill('#ownin', ownFlow); await page.click('#ownok'); ownUsed = true; continue; }
    const opts = await page.$$('.opt:not([disabled])');
    if (opts.length) { await opts[i % opts.length].click(); continue; }
    if (await has('#tap')) { await page.click('#tap'); await page.waitForTimeout(250); continue; }
    if (await has('#show')) { await page.click('#show'); continue; }
    let clicked = false;
    for (const id of ['#night', '#see', '#put']) if (await has(id)) { await page.click(id); clicked = true; break; }
    if (clicked) continue;
    if (await has('.mz-card')) { seen.maslow = true; await page.click('.mz-card'); await page.click(`.mz-drop >> nth=${(await has('.mz-chip')) ? 3 : 0}`); continue; }
    if (await has('.tl-ev')) { seen.timeline = true; const n = (await page.$$('.tl-slot.in')).length; if (!n) await page.click('.tl-ev[data-n="1"]'); await page.click(`.tl-ev[data-n="${n}"]`); continue; }
    if (await has('.item') && await page.evaluate(() => { const d = document.querySelector('#donate'); return !!d && !d.hidden; })) add('donate heart is shown over a mini-game');
    if (await has('.item')) { await page.click('.item:not(.got)', {force: true}).catch(() => {}); await page.waitForTimeout(250); continue; }
    if (await has('.tile')) { for (const t of await page.$$('.tile[data-t="1"]:not(.hit)')) await t.click(); continue; }
    if (await has('.sp:not(.on)')) { await page.click('.sp:not(.on)'); continue; }
    if (await has('.circ')) { for (let k = 0; k < 4; k++) { await page.click(`.circ >> nth=${k}`); await page.click('[data-o="0"]'); } continue; }
    if (await has('.chip')) { if (await has('#ownin')) await page.fill('#ownin', ownQuality); await page.click('.chip:not(.on)'); await page.click('.chip:not(.on) >> nth=1'); continue; }
    add(`stuck on screen "${screen}"`); break;
  }
  if (i >= 700) {
    // say where the driver got stuck: screen, step type, open sheet, visible buttons
    const where = await page.evaluate(() => { let st = typeof steps === 'function' && ['world', 'prologue'].includes(S.screen) ? steps()[idx()] : null; if (typeof st === 'function') st = null;
      return `${S.screen}/${st ? st.type + (st.game ? ':' + JSON.stringify(st.game) : '') : '-'}${document.querySelector('.sheet') ? ' + open sheet' : ''}; buttons: ` + [...document.querySelectorAll('#stage button:not([disabled])')].slice(0, 6).map(b => (b.id || b.className) + (b.innerText ? ' «' + b.innerText.slice(0, 20) + '»' : '')).join(', '); });
    add('did not reach the final screen — stuck on ' + where);
  }

  const spoken = await page.evaluate(() => window.__spoken);
  // every sentence the Keeper says must have a ready-made recording (tools/tts.mjs)
  for (const m of new Set(await page.evaluate(() => window.__miss))) add(`[voice] no recording for: ${m}`);
  for (const text of spoken) for (const p of textProblems(text, sc.lang)) add(`[voice] ${p}`);
  if (spoken.length < steps) add(`voice hints: only ${spoken.length} phrases for ${steps} screens`);
  const state = await page.evaluate(() => ({screen: S.screen, done: S.done.filter(Boolean).length}));
  if (state.screen !== 'final') add(`ended on "${state.screen}" instead of "final"`);
  if (state.done !== 7) add(`only ${state.done} of 7 worlds done`);
  if (!seen.jigsaw) add('jigsaw step was not reached');
  if (!seen.mirror) add('mirror step was not reached');
  if (sc.age === 'a' && !seen.maslow) add('16+: Maslow pyramid (Solomon\'s experiments) was not reached');
  if (sc.age === 'a' && !seen.timeline) add('16+: history timeline was not reached');
  if (sc.age !== 'a' && (seen.maslow || seen.timeline)) add('16+ mini-games shown to a child');
  if (state.screen === 'final') {
    for (const tab of ['path', 'ach', 'cert']) {
      await page.click(`[data-tab="${tab}"]`);
      const tx = await page.evaluate(() => document.querySelector('#tabp').innerText);
      for (const p of textProblems(tx, sc.lang)) add(`[final/${tab}] ${p}`);
      await snap('final-' + tab);
    }
    // a minute of silence (shortened here) → the Keeper offers help
    const idleText = JSON.parse(await readFile(ROOT + `locales/${sc.lang}.json`, 'utf8'))['voice.idle'];
    await page.evaluate(() => { window.__spoken.length = 0; Voice.idleMs = 700; Voice.cancel(); });
    await page.waitForTimeout(1500);
    if (!(await page.evaluate(q => window.__spoken.some(x => x.startsWith(q)), idleText))) add('no «can I help?» after silence');
    await page.evaluate(() => { Voice.idleMs = 60000; Voice.idle(); });
    if (!(await page.waitForSelector('#cert img', {timeout: 8000}).catch(() => null))) add('certificate image was not drawn');
    // «About» from the menu: project link, four sections, closes with Escape
    await page.click('#menubtn'); await page.click('[data-m="about"]');
    const about = await page.evaluate(() => { const d = document.querySelector('.sheet.about'); return d && {text: d.innerText, href: (d.querySelector('a') || {}).href, secs: d.querySelectorAll('.about-sec').length}; });
    if (!about) add('«About» window did not open');
    else {
      if (!/^https:\/\/mychitas\.app\/?$/.test(about.href || '')) add('«About»: no link to mychitas.app');
      if (about.secs !== 4) add(`«About»: ${about.secs} sections instead of 4`);
      for (const p of textProblems(about.text, sc.lang)) add(`[about] ${p}`);
      await snap('about');
      await page.keyboard.press('Escape');
      if (await has('.sheet.about')) add('«About» did not close with Escape');
    }
    // donate button (heart) leads to mychitas.app/donate
    const donate = await page.evaluate(() => (document.querySelector('#donate') || {}).href);
    if (donate !== 'https://mychitas.app/donate') add(`donate link is "${donate}" instead of https://mychitas.app/donate`);
    // the hero chip opens the profile with level and all achievements
    await page.click('#herobtn');
    const prof = await page.evaluate(() => { const d = document.querySelector('.sheet.profile'); return d && {text: d.innerText, achs: d.querySelectorAll('.ach').length}; });
    if (!prof) add('hero chip did not open the profile');
    else {
      if (prof.achs !== 6) add(`profile: ${prof.achs} achievements instead of 6`);
      for (const p of textProblems(prof.text, sc.lang)) add(`[profile] ${p}`);
      await snap('profile');
      await page.click('#closeM');
      if (await has('.sheet.profile')) add('profile did not close with ✕');
    }
  }
  await ctx.close();
  return {name, steps, problems: [...problems]};
}

const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}/`;
if (shotsDir) await mkdir(shotsDir, {recursive: true});
const launch = {headless: !headed};
if (!existsSync(chromium.executablePath()) && existsSync('/opt/pw-browsers/chromium')) launch.executablePath = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(launch);
let failed = 0;
try {
  const results = await Promise.all(scenarios.map(sc => run(browser, base, sc).catch(e => ({name: `${sc.lang}-${sc.age}-${sc.g}`, steps: 0, problems: ['crashed: ' + e.message]}))));
  for (const r of results) {
    if (r.problems.length) { failed++; console.log(`✗ ${r.name} (${r.steps} steps)\n    ` + r.problems.join('\n    ')); }
    else console.log(`✓ ${r.name} — ${r.steps} steps, all 7 worlds, certificate, music and voice`);
  }
} finally { await browser.close(); server.close(); }
if (shotsDir) console.log(`Screenshots: ${shotsDir}`);
process.exit(failed ? 1 : 0);
