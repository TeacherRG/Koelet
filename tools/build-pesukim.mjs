// Builds data/pesukim.json for «Твой стих в Танахе» from the Open Scriptures Hebrew Bible
// (Westminster Leningrad Codex, public domain; OSHB markup CC BY 4.0).
//
//   npm pack morphhb@2.0.2 && tar xzf morphhb-2.0.2.tgz      # once, anywhere outside the repo
//   node tools/build-pesukim.mjs path/to/package/wlc
//
// Segula: before the second «יהיו לרצון» of the Amidah one says a verse that begins with the first
// letter of one's Hebrew name and ends with its last letter, or a verse with the name in it.
// For every pair of letters we keep a few short verses (Torah first), and for every proper name
// in Tanakh one short verse where it appears. The text keeps nikud without cantillation; Divine
// Names are written the way they are in books for learning (ה׳, אלקים…), so the screen can be printed.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: node tools/build-pesukim.mjs <morphhb>/wlc'); process.exit(1); }

/* order of Tanakh; [OSIS file, Hebrew name, group: 0 Torah, 1 Tehillim/Mishlei, 2 the rest, 3 lists and genealogies] */
const BOOKS = [
  ['Gen','בראשית',0],['Exod','שמות',0],['Lev','ויקרא',0],['Num','במדבר',0],['Deut','דברים',0],
  ['Josh','יהושע',2],['Judg','שופטים',2],['1Sam','שמואל א',2],['2Sam','שמואל ב',2],['1Kgs','מלכים א',2],['2Kgs','מלכים ב',2],
  ['Isa','ישעיהו',2],['Jer','ירמיהו',2],['Ezek','יחזקאל',2],['Hos','הושע',2],['Joel','יואל',2],['Amos','עמוס',2],['Obad','עובדיה',2],
  ['Jonah','יונה',2],['Mic','מיכה',2],['Nah','נחום',2],['Hab','חבקוק',2],['Zeph','צפניה',2],['Hag','חגי',2],['Zech','זכריה',2],['Mal','מלאכי',2],
  ['Ps','תהלים',1],['Prov','משלי',1],['Job','איוב',2],['Song','שיר השירים',2],['Ruth','רות',2],['Lam','איכה',2],['Eccl','קהלת',2],
  ['Esth','אסתר',2],['Dan','דניאל',2],['Ezra','עזרא',3],['Neh','נחמיה',3],['1Chr','דברי הימים א',3],['2Chr','דברי הימים ב',3],
];
const WEIGHT = [0.75, 0.85, 1.1, 1.5];
/* chapters that are not for a children's screen (curses, prohibitions, violence, harlotry parables, impurity laws) */
const SKIP = {
  Gen:[19,34,38,39],Lev:[12,13,14,15,18,20],Num:[5,25,31],Deut:[21,22,23,27,28],
  Judg:[19,20,21],'2Sam':[11,13,16],'1Kgs':[14],'2Kgs':[6,9,10],Isa:[3,47],Jer:[3,13,19],
  Ezek:[4,5,16,23],Hos:[1,2,3,4],Nah:[3],Lam:[2,4],Prov:[5,6,7],Song:'all',
};

/* Strong's numbers: verses with these words go to the end of the line (evil, sword, death, blood,
   enemy, hatred, smiting, killing, destruction, harlotry, wrath, trouble)… */
const DARK = new Set('7451 7489 7455 2719 4191 4194 4193 1818 7563 7562 341 8130 8135 5221 2026 7523 6 8045 7843 2181 2183 5003 2534 7110 6862 6869 6887 2490 3772 5307 2491 4347 5062 7701'.split(' '));
/* …and verses with these come first (peace, kindness, joy, blessing, good, love, Torah, wisdom, song, praise, thanks) */
const LIGHT = new Set('7965 2617 8055 8057 7442 1288 1293 2896 157 160 8451 2451 7891 7892 1984 3034 8426 539 530 3820 5797 4268'.split(' '));
const FINAL = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const letters = s => s.replace(/[^א-ת]/g, '');
const base = c => FINAL[c] || c;

/* nikud without cantillation, meteg, paseq and the like */
const clean = s => s.replace(/[֑-ֽֿ֯׀׃-׆͏‌‍]/g, '');
/* Divine Names, written the way books for learning do */
function divine(word, lemma) {
  const L = lemma.split('/').pop().replace(/\s.*/, '');
  if (L === '3068' || L === '3069') return word.replace(/י[ְ-ׇ]*ה[ְ-ׇ]*ו[ְ-ׇ]*ה[ְ-ׇ]*/, 'ה׳');
  if (L === '430' || L === '433') return word.replace(/(ל[ְ-ׇ]*)ה/, '$1ק');
  if (L === '3050') return word.replace(/י([ְ-ׇ]*)ה/, 'ק$1ה');
  if (L === '7706') return word.replace(/(ש[ְ-ׇ]*)(ד)/, '$1-$2');
  if (L === '136') return word.replace(/(א[ְ-ׇ]*)(ד)/, '$1-$2');
  if (L === '410' && letters(word).endsWith('אל')) return word.replace(/(א[ְ-ׇ]*)(ל)/, '$1-$2');
  return word;
}
const NAMES = new Set(['3068','3069','430','433','3050','7706','136','410']);

const verses = [];   // {b, c, v, text, first, last, len, edge, np, ok}
const names = new Map(); // consonantal proper name → [verse indices]
for (let bi = 0; bi < BOOKS.length; bi++) {
  const [osis] = BOOKS[bi];
  const xml = readFileSync(join(SRC, osis + '.xml'), 'utf8');
  for (const m of xml.matchAll(/<verse osisID="[^.]+\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g)) {
    const [, c, v] = m;
    let body = m[3];
    const variant = /<note type="variant">/.test(body);
    body = body.replace(/<note[\s\S]*?<\/note>/g, '')
      .replace(/<seg type="x-(pe|samekh|reversednun|sof-pasuq|paseq)">[^<]*<\/seg>/g, '')
      .replace(/<seg type="x-maqqef">[^<]*<\/seg>/g, '־');
    const words = [];
    for (const w of body.matchAll(/<w lemma="([^"]*)"[^>]*morph="([^"]*)"[^>]*>([\s\S]*?)<\/w>(־?)/g)) {
      const raw = w[3].replace(/<[^>]+>/g, '').replace(/\//g, '');
      words.push({raw, lemma: w[1], morph: w[2], maq: !!w[4]});
    }
    if (!words.length) continue;
    const text = words.map((w, i) => divine(clean(w.raw), w.lemma) + (w.maq ? '־' : i < words.length - 1 ? ' ' : '')).join('');
    const all = letters(words.map(w => w.raw).join(''));
    const lem = w => w.lemma.split('/').pop().replace(/\s.*/, '');
    const vi = verses.length;
    verses.push({b: bi, c: +c, v: +v, text, first: all[0], last: base(all.at(-1)), len: all.length,
      edge: NAMES.has(lem(words[0])) || NAMES.has(lem(words.at(-1))),
      np: words.filter(w => /Np/.test(w.morph)).length / words.length,
      mood: words.some(w => w.lemma.split('/').some(l => DARK.has(l.replace(/\s.*/, '')))) ? 3
        : words.some(w => w.lemma.split('/').some(l => LIGHT.has(l.replace(/\s.*/, '')))) ? 0.7 : 1,
      ok: !variant && SKIP[osis] !== 'all' && !(SKIP[osis] || []).includes(+c)});
    /* proper names (the part after the prefixes ו/ה/ל/ב/מ/כ/ש) */
    for (const w of words) {
      const parts = w.raw.split('/'), mp = w.morph.slice(1).split('/');
      mp.forEach((mo, k) => {
        if (!/^Np/.test(mo) || NAMES.has(w.lemma.split('/')[k]?.replace(/\s.*/, ''))) return;
        const nm = letters(parts[k] || '');
        if (nm.length < 2) return;
        if (!names.has(nm)) names.set(nm, []);
        const l = names.get(nm); if (l.at(-1) !== vi) l.push(vi);
      });
    }
  }
}

/* short and bright verses first, Torah and Tehillim preferred, lists of names last */
const score = v => v.len * WEIGHT[BOOKS[v.b][2]] * (1 + 2 * v.np) * v.mood;
const good = v => v.ok && !v.edge && v.len >= 12;
const PER_PAIR = 3;
const keep = new Map(); // verse index → output index
const out = [];
const use = i => { if (!keep.has(i)) { keep.set(i, out.length); const v = verses[i]; out.push([v.b, v.c, v.v, v.text]); } return keep.get(i); };

const byPair = {};
verses.forEach((v, i) => { (byPair[v.first + v.last] ||= []).push(i); });
const pairs = {};
let missing = 0;
for (const [k, list] of Object.entries(byPair)) {
  let cand = list.filter(i => good(verses[i]));
  if (!cand.length) cand = list.filter(i => verses[i].ok);
  if (!cand.length) cand = list;
  cand.sort((a, b) => score(verses[a]) - score(verses[b]));
  /* not three verses from one chapter */
  const pick = [];
  for (const i of cand) {
    if (pick.length >= PER_PAIR) break;
    if (pick.some(j => verses[j].b === verses[i].b && verses[j].c === verses[i].c)) continue;
    pick.push(i);
  }
  pairs[k] = pick.map(use);
}
const AB = [...'אבגדהוזחטיכלמנסעפצקרשת'];
for (const a of AB) for (const b of AB) if (!pairs[a + b]) missing++;

const nameIdx = {};
for (const [nm, list] of names) {
  let cand = list.filter(i => verses[i].ok);
  if (!cand.length) continue;
  cand.sort((a, b) => score(verses[a]) - score(verses[b]));
  nameIdx[nm] = use(cand[0]);
}

const data = {
  src: 'Westminster Leningrad Codex (public domain) via Open Scriptures Hebrew Bible, CC BY 4.0, https://github.com/openscriptures/morphhb',
  books: BOOKS.map(b => b[1]),
  v: out, pairs, names: nameIdx,
};
const json = JSON.stringify(data);
writeFileSync(join(ROOT, 'data', 'pesukim.json'), json + '\n');
console.log(`${verses.length} verses read; ${out.length} kept; ${Object.keys(pairs).length} letter pairs (${missing} pairs have no verse); ${Object.keys(nameIdx).length} names; ${(json.length / 1024).toFixed(0)} KB`);
