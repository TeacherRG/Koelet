/* «Твой стих в Танахе»: стих, который начинается на первую букву имени на иврите и кончается на последнюю,
   и стих, где встречается само имя. Обычай — говорить его в конце Амиды, перед вторым «יהיו לרצון».
   Стихи — из традиционного списка Torat Emet «פסוק המתחיל ומסתיים באות»: на каждую пару букв сначала личный стих
   (по возможности из Торы), остальные — в выпадающем блоке. tools/build-pesukim.mjs → data/pesukim/: index.json
   (книги, имена) и по файлу на первую букву; грузятся только на этом экране. Тексты — pasuk.* в locales. */
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

let PESUKIM=null;const PAIRS={},pesukimLoad={};
function loadOnce(k,then){
  if(!pesukimLoad[k])pesukimLoad[k]=fetch('data/pesukim/'+k+'.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()})
    .then(then).catch(e=>{delete pesukimLoad[k];throw e});
  return pesukimLoad[k];
}
/* справочник и стихи на нужные первые буквы */
function loadPesukim(firsts){
  return Promise.all([loadOnce('index',d=>{
      PESUKIM=d}),
    ...firsts.map(i=>loadOnce(i,d=>{PAIRS[i]=d}))]);
}
const baseL=c=>HEB_BASE[c]||c;
const firstOf=n=>HEB_AB.indexOf(baseL(n[0]));
/* стихи пары: первый — личный */
const pairVerses=n=>(PAIRS[firstOf(n)]||{})[baseL(n[0])+baseL(n.at(-1))]||[];

function verseHTML(v,first){
  /* первая и последняя буквы стиха — тем же цветом, что и буквы имени */
  let txt=esc(v[3]);
  if(first){const a=txt.search(/[א-ת]/),b=txt.search(/[א-ת][^א-ת]*$/);
    if(a>=0&&b>a)txt=txt.slice(0,a)+'<mark>'+txt[a]+'</mark>'+txt.slice(a+1,b)+'<mark>'+txt[b]+'</mark>'+txt.slice(b+1)}
  return `<figure class="pasuk-v"><blockquote class="heb" lang="he" dir="rtl">${txt}</blockquote>
    <figcaption>${verseRef(v)}</figcaption></figure>`;
}
const verseRef=v=>`${esc(tl('pasuk.books')[v[0]]||'')} ${v[1]}:${v[2]} · <span class="heb" lang="he">${esc(PESUKIM.books[v[0]])}</span>`;
function letterChip(c){const L=tl('pasuk.letters');return `<span class="pasuk-l"><b class="heb" lang="he">${c}</b><small>${esc(L[HEB_AB.indexOf(baseL(c))]||'')}</small></span>`}

function openPasuk(){if(S.screen!=='pasuk')S.pasukFrom=S.screen;go('pasuk')}
/* имя на иврите: поле и экранная клавиатура (раздел и шаг в «Зеркале») */
/* имя на иврите: до трёх полей (у двойного и тройного имени у каждого имени свой стих) и экранная клавиатура.
   Хранится в S.hebName строкой «имя1 имя2 имя3» — так её читают сертификат и шаг «Зеркала». */
const HEB_MAX=3;
let hebAct=0;   // поле, в которое пишет экранная клавиатура
const hebNames=()=>{const a=(S.hebName||'').split(' ');return a.length?a:['']};
const setHebNames=a=>{S.hebName=a.map(x=>hebFinals(hebOnly(x).replace(/ /g,''))).join(' ');save()};
function hebNameHTML(){
  if(S.hebName==null)S.hebName=hebGuess(S.hero.name);
  const kb=[...'אבגדהוזחטיכךלמםנןסעפףצץקרשת'],names=hebNames(),labels=tl('pasuk.nameN');
  if(hebAct>=names.length)hebAct=names.length-1;
  return `<div class="group"><h3>${t('pasuk.nameH')}</h3>
      <p class="muted pasuk-hint">${t('pasuk.nameHint')}</p>
      <div class="pasuk-names">${names.map((n,i)=>`<div class="pasuk-nrow">
        <label for="hebname${i}">${esc(labels[i]||'')}</label>
        <div class="pasuk-nin"><input id="hebname${i}" data-ni="${i}" class="pasuk-in heb ${i===hebAct?'act':''}" lang="he" dir="rtl" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(n)}" placeholder="${esc(t('pasuk.namePh'))}">
        ${i?`<button class="iconbtn pasuk-ndel" data-ndel="${i}" aria-label="${esc(t('pasuk.delName'))}">✕</button>`:''}</div></div>`).join('')}</div>
      ${names.length<HEB_MAX?`<button class="btn ghost small" id="hebadd">${icon('sparkle')}<span>${t('pasuk.addName')}</span></button>`:''}
      <div class="pasuk-kb" role="group" aria-label="${esc(t('pasuk.kb'))}" dir="rtl">${kb.map(c=>`<button class="heb" lang="he" data-k="${c}">${c}</button>`).join('')}
        <button data-k="del" class="wide" aria-label="${esc(t('pasuk.del'))}">⌫</button></div>
    </div>
    <div id="pares" aria-live="polite"></div>`;
}
function wireHebName(){
  const box=stage.querySelector('.pasuk-names').closest('.group');
  const redraw=focus=>{box.outerHTML=hebNameHTML().replace(/<div id="pares"[^>]*><\/div>$/,'');wireHebName();
    if(focus!=null){const f=$('#hebname'+focus);if(f){f.focus();f.setSelectionRange(f.value.length,f.value.length)}}};
  stage.querySelectorAll('[data-ni]').forEach(inp=>{
    const i=+inp.dataset.ni;
    inp.onfocus=()=>{hebAct=i;stage.querySelectorAll('[data-ni]').forEach(x=>x.classList.toggle('act',x===inp))};
    inp.oninput=()=>{const p=inp.selectionStart,v=hebFinals(hebOnly(inp.value).replace(/ /g,''));if(v!==inp.value){inp.value=v;inp.setSelectionRange(p,p)}
      const a=hebNames();a[i]=v;setHebNames(a);showPasuk()};
  });
  stage.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{sfx.tap();const k=b.dataset.k,a=hebNames(),i=Math.min(hebAct,a.length-1);
    a[i]=k==='del'?a[i].slice(0,-1):hebFinals(a[i]+k);setHebNames(a);
    const f=$('#hebname'+i);if(f)f.value=hebNames()[i]||'';showPasuk()});
  stage.querySelectorAll('[data-ndel]').forEach(b=>b.onclick=()=>{sfx.tap();const a=hebNames();a.splice(+b.dataset.ndel,1);hebAct=0;setHebNames(a);redraw(0);showPasuk()});
  const add=$('#hebadd');if(add)add.onclick=()=>{sfx.tap();const a=hebNames();if(a.length>=HEB_MAX)return;
    /* пустое поле держим строкой с пробелом в конце, пока в него ничего не написали */
    S.hebName=a.join(' ')+' ';hebAct=a.length;save();redraw(hebAct)};
  showPasuk();
}
function renderPasuk(){
  stage.innerHTML=`<section class="scene pasuk">
    <div><button class="btn ghost small" id="paback">${t('shab.back')}</button></div>
    <span class="kicker">${icon('scroll')} ${t('pasuk.kicker')}</span>
    <h2 class="h2">${t('pasuk.title')}</h2>
    <p class="lead">${t('pasuk.lead')}</p>
    <p class="shab-note">${icon('info')}<span>${t('pasuk.custom')}</span></p>
    ${hebNameHTML()}
    <p class="muted pasuk-src">${t('pasuk.src')}</p>
  </section>`;
  $('#paback').onclick=()=>{sfx.tap();go(S.pasukFrom&&S.pasukFrom!=='pasuk'?S.pasukFrom:'title')};
  wireHebName();
}
/* шаг в мире «Зеркало»: после зеркала с камерой — твоё имя и твой стих */
function gPasuk(){
  stage.innerHTML=`<section class="scene pasuk">${head()}${sayHTML(M,tl('mirror.verse'),'warm')}
    ${hebNameHTML()}
    <p class="muted pasuk-src">${t('pasuk.cert')}</p>
    <div class="actions"><button class="btn" id="nx">${t('btn.next')}</button></div></section>`;
  let given=false;
  $('#nx').onclick=()=>{sfx.tap();if(!given){given=true;addSparks(10,$('#pares'))}next()};
  wireHebName();
}
/* личный стих для сертификата: первый стих пары первого имени; null, если имени нет или данные не загрузились */
/* личные стихи всех имён для сертификата: [{name, v}] (имена без стиха пропускаются) */
async function personalVerses(){
  const names=hebNames().map(hebFinals).filter(n=>n.length>=2).slice(0,HEB_MAX);
  if(!names.length)return [];
  try{await loadPesukim([...new Set(names.map(firstOf))])}catch(e){return []}
  return names.map(n=>({name:n,v:pairVerses(n)[0]})).filter(x=>x.v);
}
async function personalVerse(){const a=await personalVerses();return a.length?a[0].v:null}

/* ---------- «Твоя часть в Торе»: экран с двумя разделами — стих Торы по имени и «Айом-йом» по дню рождения ---------- */
function openMine(){if(S.screen!=='mine')S.mineFrom=S.screen;go('mine')}
function renderMine(){
  const names=hebNames().filter(n=>n.length>=2),h=typeof bdayHeb==='function'?bdayHeb():null;
  const card=(id,ic,title,text,status)=>`<button class="mine-card" id="${id}">
      <span class="mine-ic">${icon(ic)}</span>
      <span class="mine-tx"><b>${title}</b><span>${text}</span>${status?`<small>${status}</small>`:''}</span>
      <span class="mine-go" aria-hidden="true">${icon('up')}</span></button>`;
  stage.innerHTML=`<section class="scene mine">
    <div><button class="btn ghost small" id="miback">${t('shab.back')}</button></div>
    <span class="kicker">${icon('book')} ${t('mine.kicker')}</span>
    <h2 class="h2">${t('menu.mine')}</h2>
    <p class="lead">${t('mine.lead')}</p>
    <div class="mine-cards">
      ${card('mine-pasuk','scroll',t('menu.mineVerse'),t('mine.verse'),names.length?`<span class="heb" lang="he">${esc(names.join(' · '))}</span>`:'')}
      ${card('mine-hayom','candles',t('menu.mineHayom'),t('mine.hayom'),h?esc(t('hy.date',{d:h.d,m:h.adar?t('hy.adar'):tl('hy.months')[h.m]})):'')}
    </div>
    <p class="shab-note">${icon('scroll')}<span>${t('mine.cert')}</span></p>
  </section>`;
  $('#miback').onclick=()=>{sfx.tap();go(S.mineFrom&&S.mineFrom!=='mine'?S.mineFrom:'title')};
  $('#mine-pasuk').onclick=()=>{sfx.tap();openPasuk()};
  $('#mine-hayom').onclick=()=>{sfx.tap();openHayom()};
}
function showPasuk(){
  const box=$('#pares');if(!box)return;
  const names=hebNames().map(hebFinals).filter(n=>n.length>=2).slice(0,HEB_MAX);
  if(!names.length){box.innerHTML=`<p class="muted">${t('pasuk.empty')}</p>`;return}
  const need=[...new Set(names.map(firstOf))].filter(i=>!PAIRS[i]);
  if(!PESUKIM||need.length){box.innerHTML=`<p class="muted">${t('pasuk.loading')}</p>`;
    loadPesukim(need).then(showPasuk).catch(()=>{const b=$('#pares');if(b)b.innerHTML=`<p class="muted">${t('pasuk.error')}</p>`});return}
  box.innerHTML=names.map(n=>{
    const [pv,...more]=pairVerses(n);
    return `<div class="pasuk-card">
      <div class="pasuk-name"><span class="heb" lang="he">${esc(n)}</span><span class="pasuk-ls">${letterChip(n[0])}<i aria-hidden="true">…</i>${letterChip(n.at(-1))}</span></div>
      <p class="pasuk-what">${t('pasuk.what',{a:esc(tl('pasuk.letters')[HEB_AB.indexOf(baseL(n[0]))]),b:esc(tl('pasuk.letters')[HEB_AB.indexOf(baseL(n.at(-1)))])})}</p>
      ${pv?verseHTML(pv,true):`<p class="muted">${t('pasuk.none')}</p>`}
      ${more.length?`<details class="pasuk-more"><summary>${t('pasuk.more',{n:more.length})}</summary><ol>${more.map(v=>`<li><span class="heb" lang="he" dir="rtl">${esc(v[3])}</span><small>${verseRef(v)}</small></li>`).join('')}</ol></details>`:''}
    </div>`}).join('');
}
