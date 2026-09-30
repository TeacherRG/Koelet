/* ================================================================
   Многоязычность / Mehrsprachigkeit
   Новый язык добавляется так:
   1. папка content/<код>/ с теми же JSON-файлами, что и content/ru/;
   2. файл locales/<код>.json со строками интерфейса (ключи как в ru.json);
   3. строка в LANGS ниже.
   Если в локали не хватает ключа, берётся строка из русской локали.
   ================================================================ */
const LANGS = {
  ru:{name:'Русский', locale:'ru-RU'},
  uk:{name:'Українська', locale:'uk-UA'},
  de:{name:'Deutsch', locale:'de-DE'},
  en:{name:'English', locale:'en-GB'}
};
const DEFAULT_LANG = 'ru';
const LANG_KEY = 'koelet-lang';
const CONTENT_FILES = ['shared','prologue','city-of-success','puzzle','mirror','brothers','workshop','heleq-lab','one-piece'];
const LOAD_ERROR = {
  ru:['Не удалось загрузить тексты игры','Проверь подключение и обнови страницу.'],
  uk:['Не вдалося завантажити тексти гри','Перевір підключення й онови сторінку.'],
  de:['Die Texte des Spiels konnten nicht geladen werden','Prüfe die Verbindung und lade die Seite neu.'],
  en:['Could not load the game texts','Check your connection and reload the page.']
};

function detectLang(){
  try{const saved=localStorage.getItem(LANG_KEY);if(saved&&LANGS[saved])return saved}catch(e){}
  const prefs=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);
  for(const p of prefs){const code=String(p).slice(0,2).toLowerCase();if(LANGS[code])return code}
  return DEFAULT_LANG;
}
let LANG = detectLang();
let UI = {}, UI_BASE = {};

/* t('ключ', {переменные}) — строка интерфейса. Переменные пишутся как {{name}},
   формы рода — как {он|она} (их разрешает T() из game.js). */
function t(key,vars){
  let s=UI[key]??UI_BASE[key];
  if(s==null)return key;
  if(typeof s!=='string')return s;
  if(vars)s=s.replace(/\{\{(\w+)\}\}/g,(_,n)=>vars[n]??'');
  return typeof T==='function'?T(s):s;
}
/* tl('ключ') — массив или объект из локали (с учётом возраста и рода). */
function tl(key){const v=UI[key]??UI_BASE[key];return typeof R==='function'?R(v):v}
const langLocale=()=>(LANGS[LANG]||LANGS[DEFAULT_LANG]).locale;

async function fetchJSON(path){
  const r=await fetch(path);
  if(!r.ok)throw new Error('Could not load '+path);
  return r.json();
}
/* Загружает строки интерфейса и все тексты игры на языке lang. */
async function loadLang(lang){
  if(!LANGS[lang])lang=DEFAULT_LANG;
  const [base,ui,...content]=await Promise.all([
    lang===DEFAULT_LANG?null:fetchJSON(`locales/${DEFAULT_LANG}.json`),
    fetchJSON(`locales/${lang}.json`),
    ...CONTENT_FILES.map(n=>fetchJSON(`content/${lang}/${n}.json`))
  ]);
  const [shared,prologue,...worlds]=content;
  UI=ui;UI_BASE=base||ui;
  Object.assign(window,shared,{PROLOGUE:prologue,WORLDS:worlds});
  LANG=lang;
  document.documentElement.lang=lang;
  document.title=t('doc.title');
}
/* Переключение языка: сохраняем выбор и перезагружаем тексты. */
async function setLang(lang){
  if(!LANGS[lang]||lang===LANG)return false;
  try{localStorage.setItem(LANG_KEY,lang)}catch(e){}
  await loadLang(lang);
  return true;
}
