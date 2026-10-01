/* «Твой стих в Танахе»: стих, который начинается на первую букву имени на иврите и кончается на последнюю,
   и стих, где встречается само имя. Обычай — говорить его в конце Амиды, перед вторым «יהיו לרצון».
   Данные — data/pesukim.json (tools/build-pesukim.mjs), грузятся только на этом экране. Тексты — pasuk.* в locales. */
const HEB_AB=[...'אבגדהוזחטיכלמנסעפצקרשת'];
const HEB_FINAL={'כ':'ך','מ':'ם','נ':'ן','פ':'ף','צ':'ץ'};
const HEB_BASE={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const hebOnly=s=>(s||'').replace(/[^א-ת ]/g,'').replace(/ +/g,' ').trimStart().slice(0,24);
/* конечные формы в конце слова, обычные — внутри */
const hebFinals=s=>s.replace(/[ךםןףץ](?=[א-ת])/g,c=>HEB_BASE[c]).replace(/[כמנפצ](?=\s|$)/g,c=>HEB_FINAL[c]);

/* частые имена: как их пишут на иврите */
const HEB_NAMES=[
  ['אברהם','авраам абрам авром abraham avraham'],['יצחק','исаак ицхак ицик isaac yitzchak yitzhak itzhak'],
  ['יעקב','яков яаков янкель яків jacob jakob yaakov yakov'],['משה','моше моисей мойша moshe moses mose'],
  ['אהרן','аарон арон aaron aharon aron'],['דוד','давид давыд david dovid'],['שלמה','шломо соломон shlomo solomon salomon'],
  ['יוסף','иосиф йосеф иосеф осип йосип joseph josef yosef'],['בנימין','вениамин беньямин веня benjamin binyamin'],
  ['מיכאל','михаил миша михаэль михайло michael michail mikhail misha'],['גבריאל','гавриил габриэль gabriel gavriel'],
  ['רפאל','рафаэль raphael rafael'],['דניאל','даниил даниэль данил данило даня daniel'],['שמואל','самуил шмуэль samuel shmuel'],
  ['נתן','натан nathan natan'],['יונה','иона йона jonah jona yona'],['אליהו','илья элияху ілля elijah eliyahu ilya'],
  ['אלישע','елисей элиша elisha'],['יוחנן','иван иоанн йоханан іван ivan john johann johannes yochanan'],
  ['יהודה','иуда иегуда йегуда yehuda judah juda'],['לוי','леви levi'],['אריה','арье arie arieh aryeh'],
  ['נח','ной ноах noah noach'],['חיים','хаим chaim haim chayim'],['מנחם','менахем menachem'],['מרדכי','мордехай мордух mordechai'],
  ['פנחס','пинхас pinchas pinhas'],['ישראל','исраэль израиль israel yisrael'],['עזרא','эзра ездра ezra'],['גדעון','гидеон gideon'],
  ['אליעזר','элиэзер лазарь eliezer lazar'],['צבי','цви tzvi zvi hirsch'],['זאב','зеэв вольф zeev wolf volf'],['דב','дов dov'],
  ['ברוך','барух baruch'],['מתתיהו','матвей матфей matthew matthias mattityahu'],['אורי','ури uri'],['נחום','нахум наум nahum'],
  ['אלכסנדר','александр саша олександр alexander alexandr aleksandr sasha'],['עמנואל','эммануил эмануэль emmanuel immanuel'],
  ['שרה','сара сарра sara sarah'],['רבקה','ревекка ривка ребекка rebecca rebekka rivka'],['רחל','рахель рахиль rachel rahel'],
  ['לאה','лея лия леа leah lea'],['מרים','мириам мирьям мария маша маня марія miriam maria mary marie'],
  ['חנה','анна ханна хана аня ганна anna hannah hanna chana ann anne'],['אסתר','эстер эсфирь esther ester'],
  ['דבורה','дебора двора deborah debora dvora'],['יהודית','юдифь иегудит юдит judith yehudit'],['רות','рут руфь ruth rut'],
  ['חוה','ева хава єва eva eve chava'],['אביגיל','абигайль авигаиль abigail avigail'],['תמר','тамар тамара tamar tamara'],
  ['דינה','дина dina dinah'],['נעמי','наоми ноэми naomi noemi'],['יעל','яэль yael jael'],['שושנה','сусанна сюзанна шошана susanna susan shoshana'],
  ['אלישבע','елизавета лиза элишева єлизавета elizabeth elisabeth elisheva'],['מלכה','малка malka'],['נעה','ноа noa'],
  ['חיה','хая chaya'],['שולמית','шуламит shulamit'],['אילנה','илана ilana'],
];
const HEB_DICT={};HEB_NAMES.forEach(([h,v])=>v.split(' ').forEach(k=>HEB_DICT[k]=h));
/* имени нет в списке — пишем по звукам: важны только первая и последняя буквы, их игрок проверит */
function hebGuess(name){
  const key=(name||'').trim().toLowerCase().replace(/ё/g,'е').replace(/['’ʼ`-]/g,'').split(/\s+/)[0];
  if(!key)return '';
  if(HEB_DICT[key])return HEB_DICT[key];
  const R=[['tsch','צ'],['sch','ש'],['sh','ש'],['ch','ח'],['kh','ח'],['tz','צ'],['ts','צ'],['th','ת'],['ph','פ'],['ck','ק'],
    ['щ','ש'],['ш','ש'],['ч','צ'],['ц','צ'],['ж','ז'],['х','ח'],['ю','יו'],['я','יא'],['ё','יו'],['й','י'],['ы','י'],['ь',''],['ъ',''],
    ['б','ב'],['в','ב'],['г','ג'],['ґ','ג'],['д','ד'],['з','ז'],['и','י'],['і','י'],['ї','י'],['к','ק'],['л','ל'],['м','מ'],['н','נ'],
    ['п','פ'],['р','ר'],['с','ס'],['т','ט'],['ф','פ'],['b','ב'],['v','ב'],['w','ו'],['g','ג'],['d','ד'],['z','ז'],['j','י'],['y','י'],
    ['i','י'],['k','ק'],['c','ק'],['q','ק'],['l','ל'],['m','מ'],['n','נ'],['p','פ'],['f','פ'],['r','ר'],['s','ס'],['t','ט'],['x','קס'],['h','ה']];
  const vowel=/^[аеэоуaeouєäöü]/;
  let out='';
  for(let i=0;i<key.length;){
    const rest=key.slice(i),last=i===key.length-1;
    if(vowel.test(rest)){const c=rest[0];
      if(i===0)out+=/[оуou]/.test(c)?'או':/[еє]/.test(c)?'י':'א';
      else if(last)out+=/[аaeе]/.test(c)?'ה':/[оуou]/.test(c)?'ו':'';
      else if(/[оуou]/.test(c))out+='ו';
      i++;continue}
    if(i===0&&/[иі]|i/.test(rest[0]))out+='א';
    const r=R.find(([k])=>rest.startsWith(k));
    if(r){out+=r[1];i+=r[0].length}else i++;
  }
  return hebFinals(out.replace(/(.)\1/g,'$1').replace(/יא$/,'יה'));
}

let PESUKIM=null,pesukimLoad=null;
function loadPesukim(){
  if(!pesukimLoad)pesukimLoad=fetch('data/pesukim.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>{
    /* имена без «лишних» י и ו: אהרון найдёт אהרן */
    d.loose={};for(const n in d.names){const k=nameKey(n);if(!(k in d.loose))d.loose[k]=d.names[n]}
    return PESUKIM=d}).catch(e=>{pesukimLoad=null;throw e});
  return pesukimLoad;
}
const baseL=c=>HEB_BASE[c]||c;
const nameKey=n=>[...n].map(baseL).join('').replace(/(?!^)[וי]/g,'');
function pairVerses(n){const k=baseL(n[0])+baseL(n.at(-1));return (PESUKIM.pairs[k]||[]).map(i=>PESUKIM.v[i])}
function nameVerse(n){const i=PESUKIM.names[hebFinals(n)]??PESUKIM.loose[nameKey(n)];return i==null?null:PESUKIM.v[i]}

function verseHTML(v,first,last){
  const books=tl('pasuk.books');
  /* первая и последняя буквы стиха — тем же цветом, что и буквы имени */
  let txt=esc(v[3]);
  if(first){const a=txt.search(/[א-ת]/),b=txt.search(/[א-ת][^א-ת]*$/);
    if(a>=0&&b>a)txt=txt.slice(0,a)+'<mark>'+txt[a]+'</mark>'+txt.slice(a+1,b)+'<mark>'+txt[b]+'</mark>'+txt.slice(b+1)}
  return `<figure class="pasuk-v"><blockquote class="heb" lang="he" dir="rtl">${txt}</blockquote>
    <figcaption>${esc(books[v[0]]||'')} ${v[1]}:${v[2]} · <span class="heb" lang="he">${esc(PESUKIM.books[v[0]])}</span></figcaption></figure>`;
}
function letterChip(c){const L=tl('pasuk.letters');return `<span class="pasuk-l"><b class="heb" lang="he">${c}</b><small>${esc(L[HEB_AB.indexOf(baseL(c))]||'')}</small></span>`}

function openPasuk(){if(S.screen!=='pasuk')S.pasukFrom=S.screen;go('pasuk')}
function renderPasuk(){
  if(S.hebName==null)S.hebName=hebGuess(S.hero.name);
  const kb=[...'אבגדהוזחטיכךלמםנןסעפףצץקרשת'];
  stage.innerHTML=`<section class="scene pasuk">
    <div><button class="btn ghost small" id="paback">${t('shab.back')}</button></div>
    <span class="kicker">${icon('scroll')} ${t('pasuk.kicker')}</span>
    <h2 class="h2">${t('pasuk.title')}</h2>
    <p class="lead">${t('pasuk.lead')}</p>
    <p class="shab-note">${icon('info')}<span>${t('pasuk.custom')}</span></p>
    <div class="group"><h3><label for="hebname">${t('pasuk.nameH')}</label></h3>
      <p class="muted pasuk-hint">${t('pasuk.nameHint')}</p>
      <input id="hebname" class="pasuk-in heb" lang="he" dir="rtl" maxlength="24" autocomplete="off" spellcheck="false" value="${esc(S.hebName)}" placeholder="${esc(t('pasuk.namePh'))}">
      <div class="pasuk-kb" role="group" aria-label="${esc(t('pasuk.kb'))}" dir="rtl">${kb.map(c=>`<button class="heb" lang="he" data-k="${c}">${c}</button>`).join('')}
        <button data-k=" " class="wide" aria-label="${esc(t('pasuk.space'))}">␣</button><button data-k="del" class="wide" aria-label="${esc(t('pasuk.del'))}">⌫</button></div>
    </div>
    <div id="pares" aria-live="polite"></div>
    <p class="muted pasuk-src">${t('pasuk.src')}</p>
  </section>`;
  const inp=$('#hebname');
  const set=v=>{S.hebName=hebOnly(v);inp.value=S.hebName;save();showPasuk()};
  inp.oninput=()=>{const p=inp.selectionStart,v=hebFinals(hebOnly(inp.value));if(v!==inp.value){inp.value=v;inp.setSelectionRange(p,p)}S.hebName=v;save();showPasuk()};
  stage.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{sfx.tap();const k=b.dataset.k;
    set(k==='del'?S.hebName.slice(0,-1):hebFinals(S.hebName+k))});
  $('#paback').onclick=()=>{sfx.tap();go(S.pasukFrom&&S.pasukFrom!=='pasuk'?S.pasukFrom:'title')};
  showPasuk();
}
function showPasuk(){
  const box=$('#pares');if(!box)return;
  if(!PESUKIM){box.innerHTML=`<p class="muted">${t('pasuk.loading')}</p>`;
    loadPesukim().then(showPasuk).catch(()=>{const b=$('#pares');if(b)b.innerHTML=`<p class="muted">${t('pasuk.error')}</p>`});return}
  const names=hebFinals(S.hebName||'').trim().split(' ').filter(n=>n.length>=2).slice(0,3);
  if(!names.length){box.innerHTML=`<p class="muted">${t('pasuk.empty')}</p>`;return}
  S.pasukAlt=S.pasukAlt||{};
  box.innerHTML=names.map((n,ni)=>{
    const list=pairVerses(n),alt=(S.pasukAlt[n]||0)%Math.max(list.length,1),nv=nameVerse(n);
    return `<div class="pasuk-card">
      <div class="pasuk-name"><span class="heb" lang="he">${esc(n)}</span><span class="pasuk-ls">${letterChip(n[0])}<i aria-hidden="true">…</i>${letterChip(n.at(-1))}</span></div>
      <p class="pasuk-what">${t('pasuk.what',{a:esc(tl('pasuk.letters')[HEB_AB.indexOf(baseL(n[0]))]),b:esc(tl('pasuk.letters')[HEB_AB.indexOf(baseL(n.at(-1)))])})}</p>
      ${list.length?verseHTML(list[alt],true):`<p class="muted">${t('pasuk.none')}</p>`}
      ${list.length>1?`<button class="btn ghost small" data-alt="${ni}">${icon('sparkle')}<span>${t('pasuk.other',{n:alt+1,all:list.length})}</span></button>`:''}
      ${nv?`<h3 class="pasuk-h">${t('pasuk.withName')}</h3>${verseHTML(nv)}`:''}
    </div>`}).join('');
  box.querySelectorAll('[data-alt]').forEach(b=>b.onclick=()=>{sfx.tap();const n=names[+b.dataset.alt];S.pasukAlt[n]=(S.pasukAlt[n]||0)+1;save();showPasuk();
    const f=box.querySelector(`[data-alt="${b.dataset.alt}"]`);if(f)f.focus({preventScroll:true})});
}
