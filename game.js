/* Game runtime: state, rendering, interactions, and minigames. */
const KEY='koelet-game-v1';
const fresh=()=>({v:1,screen:'title',hero:{name:'',arch:0,look:0,outfit:0},w:0,s:0,ps:0,done:[0,0,0,0,0,0,0],sparks:0,ach:{},ans:{},qualities:[],lab:{can:[],like:[],need:[],help:[]},tools:{},help:0,insight:0,sound:false,phrase:null});
let S=fresh();
function load(){try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&d.v===1)S=Object.assign(fresh(),d)}}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ================================================================
   HELPERS
   ================================================================ */
const $=s=>document.querySelector(s);
const stage=$('#stage');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const heroName=()=>S.hero.name.trim()||'Путник';

function avatar(p){
  const L=LOOKS[p.look||0], out=OUTFITS[p.outfit||0], a=p.arch;
  let back='',hair='',acc='';
  if(L.style===2) back=`<path d="M30 40 Q30 17 50 17 Q70 17 70 40 L73 68 Q60 63 50 63 Q40 63 27 68Z" fill="${L.hair}"/>`;
  if(L.style===0||L.style===2) hair=`<path d="M31 41 Q30 19 50 19 Q70 19 69 41 Q63 29 50 29 Q37 29 31 41Z" fill="${L.hair}"/>`;
  if(L.style===1) hair=[[35,30],[42,23],[50,21],[58,23],[65,30],[33,38],[67,38]].map(c=>`<circle cx="${c[0]}" cy="${c[1]}" r="7.5" fill="${L.hair}"/>`).join('');
  if(L.style===3) hair=`<circle cx="50" cy="15" r="7" fill="${L.hair}"/><path d="M31 41 Q30 19 50 19 Q70 19 69 41 Q63 29 50 29 Q37 29 31 41Z" fill="${L.hair}"/>`;
  if(a===0) acc=`<path d="M24 31 L76 31 L70 27 L63 13 L37 13 L30 27Z" fill="#8a6a3f"/><rect x="30" y="25" width="40" height="4" fill="#5b4527"/>`;
  if(a===1) acc=`<rect x="31" y="28" width="38" height="4" rx="2" fill="#3b3b3b"/><circle cx="42" cy="30" r="6" fill="#9ad0d8" stroke="#ecc865" stroke-width="2.5"/><circle cx="58" cy="30" r="6" fill="#9ad0d8" stroke="#ecc865" stroke-width="2.5"/>`;
  if(a===2) acc=`<rect x="63" y="76" width="18" height="12" rx="3" fill="#f3ead8" stroke="#8a6a3f" stroke-width="2"/><path d="M68 80 H77 M68 84 H75" stroke="#8a6a3f" stroke-width="1.5"/>`;
  if(a===3) acc=`<path d="M35 65 Q50 75 65 65 L67 72 Q50 82 33 72Z" fill="#ecc865"/><path d="M58 72 L62 88 L55 86Z" fill="#ecc865"/>`;
  if(a===4) acc=`<path d="M29 31 Q33 15 52 16 Q72 17 71 29 Q50 24 29 31Z" fill="#c8445b"/><rect x="50" y="11" width="3" height="6" rx="1.5" fill="#c8445b"/>`;
  if(a===5) acc=`<path d="M30 44 Q29 17 50 17 Q71 17 70 44" stroke="#2b2b2b" stroke-width="4" fill="none"/><rect x="26" y="37" width="8" height="14" rx="3" fill="#3d7fb0"/><rect x="66" y="37" width="8" height="14" rx="3" fill="#3d7fb0"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#dcebe2"/>${back}<path d="M16 100 Q18 69 50 67 Q82 69 84 100Z" fill="${out}"/><rect x="45" y="56" width="10" height="12" fill="${L.skin}"/><circle cx="50" cy="42" r="18" fill="${L.skin}"/>${hair}<circle cx="43" cy="44" r="2.2" fill="#1b1b1b"/><circle cx="57" cy="44" r="2.2" fill="#1b1b1b"/><path d="M44 51 Q50 56 56 51" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>${acc}</svg>`;
}
function mentorSvg(){
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#dcebe2"/><circle cx="80" cy="22" r="16" fill="rgba(236,200,101,.25)"/><path d="M14 100 Q16 68 50 66 Q84 68 86 100Z" fill="#5a4a78"/><path d="M40 70 L50 100 L60 70Z" fill="#ecc865" opacity=".8"/><circle cx="50" cy="42" r="18" fill="#e7b894"/><path d="M33 44 Q33 74 50 78 Q67 74 67 44 Q60 55 50 55 Q40 55 33 44Z" fill="#ece6dc"/><path d="M36 27 Q50 15 64 27 Q50 23 36 27Z" fill="#1d2b44"/><path d="M32 36 Q33 26 38 25 L37 38Z M68 36 Q67 26 62 25 L63 38Z" fill="#ece6dc"/><circle cx="43" cy="42" r="5" fill="none" stroke="#2a2a2a" stroke-width="1.5"/><circle cx="57" cy="42" r="5" fill="none" stroke="#2a2a2a" stroke-width="1.5"/><path d="M48 42 H52" stroke="#2a2a2a" stroke-width="1.5"/><circle cx="43" cy="42" r="1.6" fill="#1b1b1b"/><circle cx="57" cy="42" r="1.6" fill="#1b1b1b"/></svg>`;
}
const PIECE='M12 12 H40 C38 2 62 2 60 12 H88 V40 C98 38 98 62 88 60 V88 H60 C62 78 38 78 40 88 H12 V60 C22 62 22 38 12 40 Z';
const pieceSvg=(fill,stroke)=>`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${PIECE}" style="fill:${fill};stroke:${stroke||'none'};stroke-width:3"/></svg>`;

function speaker(who){
  if(who===M) return {name:'Хранитель',svg:mentorSvg()};
  if(who==='hero') return {name:heroName(),svg:avatar(S.hero)};
  return {name:who.name,svg:avatar(who.av)};
}
function sayHTML(who,text){
  const sp=speaker(who);
  return `<div class="say"><div class="av">${sp.svg}</div><div class="bubble"><span class="who">${esc(sp.name)}</span><div class="txt">${text}</div></div></div>`;
}

/* ---------- sound (off by default) ---------- */
let actx=null;
function tone(f,d,type,vol){if(!S.sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain(),t=actx.currentTime;o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.05,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+d+.05)}catch(e){}}
const sfx={tap:()=>tone(520,.09),good:()=>{tone(660,.16);setTimeout(()=>tone(880,.22),110)},soft:()=>tone(330,.18,'triangle',.04),ach:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.28),i*120))};

/* ---------- progress ---------- */
const lvl=()=>Math.min(LEVELS.length,Math.floor(S.sparks/130)+1);
function addSparks(n,el){
  const before=lvl();S.sparks+=n;
  if(el){const r=el.getBoundingClientRect();const p=document.createElement('div');p.className='plus';p.textContent='+'+n;p.style.left=(r.left+r.width/2-14)+'px';p.style.top=(r.top-6)+'px';document.body.appendChild(p);setTimeout(()=>p.remove(),1200)}
  if(lvl()>before){toast('⬆️','Новый уровень: '+LEVELS[lvl()-1],'Уровень '+lvl());sfx.ach()}
  hud();save();
}
function unlock(id){
  if(S.ach[id])return;S.ach[id]=1;const a=ACHS[id];toast(a[0],'Достижение: '+a[1],a[2]);sfx.ach();save();hud();
}
function toast(ic,title,sub){
  const t=document.createElement('div');t.className='toast';t.innerHTML=`<span class="ic">${ic}</span><div><b>${esc(title)}</b><small>${esc(sub)}</small></div>`;
  $('#toasts').appendChild(t);setTimeout(()=>t.remove(),4100);
}
function hud(){
  const h=$('#hud');
  const show=!['title','create','welcome'].includes(S.screen);
  h.hidden=!show;if(!show)return;
  const L=lvl(),into=(S.sparks%130)/130*100;
  const pieces=S.done.filter(Boolean).length;
  h.innerHTML=`<span class="pill" title="Искры — твой личный прогресс"><span class="spark"></span><b>${S.sparks}</b></span>
  <div class="lvl"><small>Ур. ${L} · ${LEVELS[L-1]}</small><div class="bar"><i style="width:${L>=LEVELS.length?100:into}%"></i></div></div>
  <span class="pill">🧩 <b>${pieces}/7</b></span><span class="grow"></span>
  <button class="iconbtn" id="snd" aria-pressed="${S.sound}">${S.sound?'🔊 Звук: вкл':'🔈 Звук: выкл'}</button>
  <button class="iconbtn" id="achbtn" aria-label="Достижения">🏅 ${Object.keys(S.ach).length}/6</button>
  ${S.screen==='world'||S.screen==='prologue'?'<button class="iconbtn" id="mapbtn">Карта</button>':''}`;
  $('#snd').onclick=()=>{S.sound=!S.sound;save();hud();sfx.good()};
  $('#achbtn').onclick=showAchs;
  const mb=$('#mapbtn');if(mb)mb.onclick=()=>go('map');
}
function achGrid(){return `<div class="achs">${Object.entries(ACHS).map(([k,a])=>`<div class="ach ${S.ach[k]?'':'lock'}"><span class="ic">${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></div>`).join('')}</div>`}
function showAchs(){
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="sheet" role="dialog" aria-label="Достижения"><span class="kicker">Коллекция</span><h2 class="h2">Достижения</h2>${achGrid()}<p class="muted" style="font-size:14px">Здесь нет рейтинга и соревнования. Только твой собственный путь.</p><button class="btn ghost" id="closeM">Закрыть</button></div>`;
  document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.id==='closeM')m.remove()};
}

/* ================================================================
   SCREENS
   ================================================================ */
function go(screen,skipPrologue){
  if(skipPrologue){S.ps=PROLOGUE.length}
  S.screen=screen;save();render();window.scrollTo({top:0,behavior:'smooth'});
}
function render(){
  hud();
  ({title:renderTitle,create:renderCreate,welcome:renderWelcome,prologue:renderStep,world:renderStep,map:renderMap,done:renderDone,final:renderFinal}[S.screen]||renderTitle)();
}

function renderTitle(){
  const cols=['#cfe3d6','#f3d9a0','#bcd6ea','#9fd0ae','#f2b8c2','#f2be3d','#d9cdea'];
  let wall='';for(let i=0;i<15;i++){wall+= i===7?`<div class="pw-hole">${pieceSvg('none')}</div>`:pieceSvg(cols[(i*3)%cols.length])}
  const started=S.screen!=='title'||S.sparks>0||S.hero.name||S.done.some(Boolean);
  stage.innerHTML=`<section class="title-screen scene">
    <span class="kicker">Интерактивное приключение · 10–15 лет</span>
    <h1 class="h1">Тайна<br><span>Коэлета</span></h1>
    <p class="lead">Найди свою деталь в большом пазле.</p>
    <div class="puzzlewall" aria-hidden="true">${wall}</div>
    <div class="actions" id="ta">
      ${S.sparks>0?`<button class="btn" id="cont">Продолжить приключение</button><button class="btn ghost" id="newg">Начать заново</button>`:`<button class="btn" id="start">Начать</button>`}
    </div>
    <div id="conf"></div>
    <p class="foot">По мотивам урока раввина Шнеора Ашкенази «Тайна книги Коэлет». Игра ничего не отправляет в интернет: прогресс хранится только на этом устройстве. Без чата, рекламы и рейтингов.</p>
  </section>`;
  const st=$('#start');if(st)st.onclick=()=>{sfx.tap();go('create')};
  const c=$('#cont');if(c)c.onclick=()=>{sfx.tap();const saved=S._last||'map';go(saved)};
  const n=$('#newg');if(n)n.onclick=()=>{
    $('#conf').innerHTML=`<div class="confirm"><p>Начать сначала? Весь прогресс на этом устройстве будет стёрт.</p><div class="actions"><button class="btn small" id="yes">Да, начать заново</button><button class="btn ghost small" id="no">Отмена</button></div></div>`;
    $('#yes').onclick=()=>{const snd=S.sound;S=fresh();S.sound=snd;save();go('create')};
    $('#no').onclick=()=>{$('#conf').innerHTML=''};
  };
}

function renderCreate(){
  const h=S.hero;
  stage.innerHTML=`<section class="scene create">
    <span class="kicker">Перед путешествием</span>
    <h2 class="h2">Создай своего героя</h2>
    <div class="create-top"><div class="preview" id="pv">${avatar(h)}</div>
      <div class="field"><label for="hname">Имя героя (можно придумать любое или оставить пустым)</label><input id="hname" maxlength="16" autocomplete="off" placeholder="Путник" value="${esc(h.name)}"></div></div>
    <div class="group"><h3>Кто ты в этой истории</h3><div class="archs">${ARCHS.map((a,i)=>`<button class="arch ${h.arch===i?'on':''}" data-arch="${i}">${avatar({look:h.look,outfit:h.outfit,arch:i})}<span>${a.name}</span></button>`).join('')}</div></div>
    <div class="group"><h3>Внешность</h3><div class="swatches">${LOOKS.map((l,i)=>`<button class="sw ${h.look===i?'on':''}" data-look="${i}" aria-label="Вариант внешности ${i+1}"><span style="background:linear-gradient(135deg,${l.hair} 50%,${l.skin} 50%)"></span></button>`).join('')}</div></div>
    <div class="group"><h3>Одежда</h3><div class="swatches">${OUTFITS.map((o,i)=>`<button class="sw ${h.outfit===i?'on':''}" data-outfit="${i}" aria-label="Цвет одежды ${i+1}"><span style="background:${o}"></span></button>`).join('')}</div></div>
    <div class="actions"><button class="btn" id="ready">Готово</button></div>
  </section>`;
  $('#hname').oninput=e=>{h.name=e.target.value;save()};
  stage.querySelectorAll('[data-arch]').forEach(b=>b.onclick=()=>{h.arch=+b.dataset.arch;sfx.tap();save();renderCreate()});
  stage.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{h.look=+b.dataset.look;sfx.tap();save();renderCreate()});
  stage.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{h.outfit=+b.dataset.outfit;sfx.tap();save();renderCreate()});
  $('#ready').onclick=()=>{sfx.good();if(!S.started)S.started=new Date().toISOString();go('welcome')};
}

function renderWelcome(){
  stage.innerHTML=`<section class="scene">
    ${sayHTML('hero',`<b>${esc(heroName())}</b>, добро пожаловать в путешествие. Перед тобой большая загадка. Ты готов её разгадать?`)}
    <div class="actions"><button class="btn" id="go">Начать приключение</button><button class="btn ghost" id="back">Изменить героя</button></div>
  </section>`;
  $('#go').onclick=()=>{sfx.good();S.ps=0;go('prologue')};
  $('#back').onclick=()=>go('create');
}

/* ---------- step engine ---------- */
function steps(){return S.screen==='prologue'?PROLOGUE:WORLDS[S.w].steps}
function idx(){return S.screen==='prologue'?S.ps:S.s}
function next(){
  if(S.screen==='prologue'){S.ps++;if(S.ps>=PROLOGUE.length){return go('map')}}
  else{S.s++;if(S.s>=WORLDS[S.w].steps.length)return completeWorld()}
  save();render();window.scrollTo({top:0,behavior:'smooth'});
}
function head(){
  const st=steps(),i=idx();
  const label=S.screen==='prologue'?'Пролог · Библиотека':`Мир ${S.w+1} · ${WORLDS[S.w].name}`;
  return `<div class="scene-head"><span class="kicker">${label}</span><div class="dots" aria-label="Шаг ${i+1} из ${st.length}">${st.map((_,k)=>`<i class="${k<i?'done':k===i?'on':''}"></i>`).join('')}</div></div>`;
}
const LETTERS='АБВГДЕЖЗИК';
function optHTML(o,i){return `<button class="opt" data-i="${i}"><span class="ic ${o.ic?'e':''}" aria-hidden="true">${o.ic||LETTERS[i]}</span><span class="ot"><span>${esc(o.t)}</span>${o.s?`<small>${esc(o.s)}</small>`:''}</span></button>`}
function hintBtn(h){return h?`<button class="btn ghost small" data-hint>Мне нужна подсказка</button>`:''}
function wireHint(h,container){
  const b=(container||stage).querySelector('[data-hint]');if(!b)return;
  b.onclick=()=>{if(stage.querySelector('.hint'))return;const d=document.createElement('div');d.className='hint';d.innerHTML='💡 '+h;b.closest('.actions').before(d);sfx.soft()};
}
function toolbox(){if(!(S.screen==='world'&&WORLDS[S.w].tools))return '';
  return `<div class="toolbox" aria-label="Ящик с инструментами">${Object.entries(TOOLS).map(([k,t])=>`<div class="tool ${S.tools[k]?'on':''}" title="${t[1]}">${t[0]}${S.tools[k]>1?`<sup>${S.tools[k]}</sup>`:''}</div>`).join('')}</div>`}

function renderStep(){
  let st=steps()[idx()];if(typeof st==='function')st=st(S);
  S._last=S.screen;
  const R={talk:rTalk,choice:rChoice,multi:rMulti,quote:rQuote,card:rCard,reveal:rReveal,mini:rMini}[st.type];
  R(st);
}
function rTalk(st){
  stage.innerHTML=`<section class="scene">${head()}${toolbox()}${sayHTML(st.who,esc(st.text))}<div class="actions"><button class="btn" id="nx">Далее</button></div></section>`;
  $('#nx').onclick=()=>{sfx.tap();next()};
}
function rChoice(st){
  const hint=st.hint||(st.neutral?DEF_HINT:null);
  stage.innerHTML=`<section class="scene">${head()}${toolbox()}${sayHTML(st.who,esc(st.text))}
    ${st.q?`<p class="h2" style="font-size:18px">${esc(st.q)}</p>`:''}
    <div class="opts ${st.compact?'compact':''}" role="group">${st.options.map((o,i)=>optHTML(o,i)).join('')}</div>
    <div id="out"></div>
    <div class="actions" id="act">${hintBtn(hint)}</div></section>`;
  wireHint(hint);
  stage.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    const o=st.options[+b.dataset.i];
    stage.querySelectorAll('.opt').forEach(x=>{x.disabled=true;x.classList.add(x===b?'picked':'dim')});
    if(st.key){S.ans[st.key]=o.v||o.t;if(st.key==='city')S.city=o.v}
    if(o.help){S.help++;if(S.help>=3)unlock('friend')}
    if(o.insight){S.insight++;if(/^mirror\d/.test(st.key||''))S.mi=(S.mi||0)+1}
    let extra='';
    if(o.tool){S.tools[o.tool]=(S.tools[o.tool]||0)+1;const t=TOOLS[o.tool];extra=`<p><b>${t[0]} В ящике загорелся инструмент: ${t[1]}</b></p>`}
    addSparks(o.help||o.insight||o.tool?15:10,b);sfx.good();
    $('#out').innerHTML=`<div class="resp"><span class="who">Что произошло</span><p>${esc(o.r)}</p>${extra}${st.after?`<p class="muted">${esc(st.after)}</p>`:''}</div>`;
    const tb=stage.querySelector('.toolbox');if(tb)tb.outerHTML=toolbox();
    $('#act').innerHTML=`<button class="btn" id="nx">Продолжить</button>`;
    $('#nx').onclick=()=>{sfx.tap();next()};
    $('#out').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}
function rMulti(st){
  let sel=(S[st.key]||[]).slice();
  const draw=()=>{
    stage.innerHTML=`<section class="scene">${head()}${sayHTML(M,esc(st.text))}
      <div class="chips">${st.options.map((o,i)=>`<button class="chip ${sel.includes(o)?'on':''}" data-i="${i}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}</div>
      <p class="muted" style="font-size:14px">Выбрано ${sel.length} из ${st.max}</p>
      <div class="actions">${hintBtn(st.hint)}<button class="btn" id="nx" ${sel.length<st.min?'disabled':''}>Выбрать</button></div></section>`;
    wireHint(st.hint);
    stage.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{const o=st.options[+c.dataset.i];
      if(sel.includes(o))sel=sel.filter(x=>x!==o);else if(sel.length<st.max)sel.push(o);else{sel.shift();sel.push(o)}
      sfx.tap();draw()});
    $('#nx').onclick=()=>{S[st.key]=sel;addSparks(15,$('#nx'));sfx.good();next()};
  };draw();
}
function rQuote(st){
  stage.innerHTML=`<section class="scene">${head()}
    <div class="card"><span class="kicker">Цитата · ${esc(st.src)}</span><div class="quote-he" lang="he">${st.he}</div><div id="tr"></div></div>
    <div id="qq"></div>
    <div class="actions" id="act"><button class="btn" id="show">Посмотреть перевод</button></div></section>`;
  $('#show').onclick=()=>{sfx.tap();
    $('#tr').innerHTML=`<p style="font-size:19px;font-weight:500">${esc(st.ru)}</p><p class="muted">${esc(st.plain)}</p>`;
    $('#qq').innerHTML=`${sayHTML(M,esc(st.q))}<div class="opts" style="margin-top:12px">${st.options.map((o,i)=>optHTML({t:o},i)).join('')}</div><div id="out" style="margin-top:12px"></div>`;
    $('#act').innerHTML=hintBtn(DEF_HINT);wireHint(DEF_HINT);
    stage.querySelectorAll('#qq .opt').forEach(b=>b.onclick=()=>{
      stage.querySelectorAll('#qq .opt').forEach(x=>{x.disabled=true;x.classList.add(x===b?'picked':'dim')});
      addSparks(10,b);sfx.good();
      $('#out').innerHTML=`<div class="resp"><span class="who">Хранитель</span><p>${esc(st.r)}</p></div>`;
      $('#act').innerHTML=`<button class="btn" id="nx">Продолжить</button>`;$('#nx').onclick=()=>{sfx.tap();next()};
    });
    $('#qq').scrollIntoView({behavior:'smooth',block:'start'});
  };
}
function artHTML(a){
  if(a==='solomon')return `<div style="display:grid;gap:8px">${[['Богатство'],['Мудрость'],['Слава'],['Мир в стране'],['Язык зверей и птиц']].map((r,i)=>`<div class="stat"><span>${r[0]}</span><div class="bar"><i style="animation-delay:${i*.15}s"></i></div></div>`).join('')}</div>`;
  if(a==='brothers')return `<div style="display:flex;gap:12px;align-items:flex-end;justify-content:center"><div style="text-align:center"><div style="width:84px;height:84px;border-radius:24px;overflow:hidden">${avatar({look:0,outfit:0})}</div><small class="muted">Менаше, старший</small></div><div style="text-align:center"><div style="width:70px;height:70px;border-radius:20px;overflow:hidden;margin:0 auto">${avatar({look:1,outfit:2})}</div><small class="muted">Эфраим, младший</small></div></div>`;
  if(a==='map')return `<div style="display:flex;gap:14px;align-items:center"><div style="width:72px;height:72px;flex:none;border-radius:22px;overflow:hidden;border:2px solid var(--etrog)">${avatar(S.hero)}</div><div><span class="kicker">${esc(heroName())}</span><p class="muted" style="font-size:14px">Это подсказки, а не приговор. Их можно исследовать дальше.</p></div></div>`;
  return '';
}
function rCard(st){
  stage.innerHTML=`<section class="scene">${head()}<article class="card">
    <span class="kicker">${esc(st.kicker)}</span><h2 class="h2">${esc(st.title)}</h2>
    ${st.heb?`<div class="bigheb" lang="he">${st.heb}</div>`:''}${artHTML(st.art)}${st.body}</article>
    <div class="actions"><button class="btn" id="nx">${esc(st.btn||'Далее')}</button></div></section>`;
  $('#nx').onclick=()=>{sfx.tap();addSparks(5);next()};
}
function rReveal(st){
  stage.innerHTML=`<section class="scene">${head()}${toolbox()}<div class="card reveal"><span class="kicker">Открытие</span><p class="h1">${esc(st.text)}</p><span class="line"></span><p class="muted">${esc(st.sub)}</p></div>
    <div class="actions"><button class="btn" id="nx">Продолжить приключение</button></div></section>`;
  sfx.good();$('#nx').onclick=()=>{sfx.tap();next()};
}

/* ---------- mini-games ---------- */
function rMini(st){({book:gBook,treasure:gTreasure,find:gFind,puzzle:gPuzzle,sky:gSky,hands:gHands,circles:gCircles,final:gFinal})[st.game]()}

function gBook(){
  const cols=['#6e2433','#2c5564','#5a4a78','#3f6b4a','#8a6a3f','#1d2b44','#7a5a2a'];
  let shelves='';for(let s=0;s<3;s++){let sp='';for(let i=0;i<40;i++){sp+=`<span class="spine" style="width:${8+((i*7+s*3)%9)}px;height:${60+((i*13+s*11)%38)}%;background:${cols[(i+s*2)%cols.length]}"></span>`}shelves+=`<div class="shelf">${sp}</div>`}
  stage.innerHTML=`<section class="scene">${head()}
    <div class="library"><div class="shelves" aria-hidden="true">${shelves}</div><div class="lamp"></div>
      <button class="bookwrap" id="book" aria-label="Открыть книгу"><div class="book-pages"><span class="glow heb">חֵלֶק ?</span></div><div class="book-cover"><span class="heb">קֹהֶלֶת</span><span class="lat">КОЭЛЕТ</span></div><div class="letters" id="letters"></div></button>
    </div>
    <p class="lead" id="bt">В самом сердце старой библиотеки лежит книга, которую никто не мог открыть. На обложке одно слово.</p>
    <div class="actions" id="act"><button class="btn" id="tap">Коснуться книги</button></div></section>`;
  const open=()=>{
    const b=$('#book');if(b.classList.contains('open'))return;b.classList.add('open');sfx.ach();
    const L='אבגדהוזחטיכלמנסעפצקרשת';let h='';for(let i=0;i<16;i++){const dx=(Math.random()*260-130)|0,dy=-(60+Math.random()*140)|0;h+=`<span style="left:${40+Math.random()*40}%;top:45%;--dx:${dx}px;--dy:${dy}px;animation-delay:${.5+i*.08}s">${L[i%L.length]}</span>`}
    $('#letters').innerHTML=h;
    $('#bt').textContent='Страницы светятся. Из книги вылетают буквы, а на первой странице проступает вопрос…';
    addSparks(10,b);
    $('#act').innerHTML=`<button class="btn" id="nx">Далее</button>`;$('#nx').onclick=()=>{sfx.tap();next()};
  };
  $('#book').onclick=open;$('#tap').onclick=open;
}

function gTreasure(){
  const c=CITY[S.city||'wealth'];let got=0,inner=20;const N=10;
  stage.innerHTML=`<section class="scene">${head()}
    ${sayHTML(M,`Собирай! Нажимай на ${c.item} как можно быстрее. И следи за обеими шкалами.`)}
    <div class="meters"><div class="meter"><span>Собрано ${c.what}</span><b id="m1">0</b><div class="bar"><i id="b1" style="width:0%"></i></div></div>
    <div class="meter in"><span>Чувство, что всего хватает</span><b id="m2">20%</b><div class="bar"><i id="b2" style="width:20%"></i></div></div></div>
    <div class="arena" id="ar"></div><div id="out"></div><div class="actions" id="act">${hintBtn('Просто собирай и посмотри, как ведёт себя вторая шкала.')}</div></section>`;
  wireHint('Просто собирай и посмотри, как ведёт себя вторая шкала.');
  const ar=$('#ar');
  const spawn=()=>{
    const b=document.createElement('button');b.className='item';b.textContent=c.item;b.setAttribute('aria-label','Собрать');
    const w=ar.clientWidth-62,h=ar.clientHeight-62;b.style.left=(Math.random()*w)+'px';b.style.top=(Math.random()*h)+'px';
    b.onclick=()=>{if(b.classList.contains('got')||got>=N)return;b.classList.add('got');got++;tone(500+got*40,.1);
      $('#m1').textContent=got*(S.city==='fame'?100000:1000);$('#b1').style.width=(got/N*100)+'%';
      inner=Math.min(38,inner+14);$('#m2').textContent=inner+'%';$('#b2').style.width=inner+'%';
      setTimeout(()=>{inner=20+(got%2);const m2=$('#m2');if(m2&&$('#b2')){m2.textContent=inner+'%';$('#b2').style.width=inner+'%'}},700);
      setTimeout(()=>b.remove(),450);
      if(got<N)setTimeout(spawn,250);else setTimeout(done,900);
    };ar.appendChild(b);
  };
  const done=()=>{if(!document.body.contains(ar))return;addSparks(25,ar);
    $('#out').innerHTML=`${sayHTML(M,'Шкала «Собрано» полная. А что ты заметил?')}<div class="opts" style="margin-top:12px">${['Вторая шкала почти не растёт','Надо собрать ещё больше','Кажется, игра сломалась'].map((t,i)=>optHTML({t},i)).join('')}</div><div id="o2" style="margin-top:12px"></div>`;
    const R=['Ты это заметил сам. Собранного становится больше, а чувство «хватает» возвращается на место.','Давай проверим: вот ещё сто. Вторая шкала всё равно стоит на месте. Интересно, правда?','Игра работает. Это не ошибка: так устроена вторая шкала. Любопытно, почему.'];
    stage.querySelectorAll('#out .opt').forEach(b=>b.onclick=()=>{stage.querySelectorAll('#out .opt').forEach(x=>{x.disabled=true;x.classList.add(x===b?'picked':'dim')});addSparks(10,b);sfx.good();
      $('#o2').innerHTML=`<div class="resp"><span class="who">Что произошло</span><p>${R[+b.dataset.i]}</p></div>`;
      $('#act').innerHTML=`<button class="btn" id="nx">Продолжить</button>`;$('#nx').onclick=()=>{sfx.tap();next()}});
    $('#out').scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  spawn();
}

function gFind(){
  const T='חֵלֶק',D=['הֶבֶל','שֶׁמֶשׁ','רוּחַ','עָמָל','לֵב','דּוֹר','זְמַן','חָכְמָה'];
  const tiles=[];for(let i=0;i<8;i++)tiles.push(T);for(let i=0;i<12;i++)tiles.push(D[i%D.length]);
  for(let i=tiles.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[tiles[i],tiles[j]]=[tiles[j],tiles[i]]}
  let found=0;
  const hint='Смотри на последнюю букву: у слова «хелек» она похожа на крючок, уходящий вниз — ק. И первая буква — ח, как ворота.';
  stage.innerHTML=`<section class="scene">${head()}
    <div class="target card"><span class="heb" lang="he">${T}</span><div><span class="kicker">Ищем слово</span><p>Найди все 8 таких слов. Осторожно: «суета» — הֶבֶל — прячется рядом.</p></div></div>
    <div class="findgrid">${tiles.map((t,i)=>`<button class="tile" data-t="${t===T?1:0}" lang="he">${t}</button>`).join('')}</div>
    <p class="muted" id="cnt">Найдено: 0 из 8</p><div class="actions" id="act">${hintBtn(hint)}</div></section>`;
  wireHint(hint);
  stage.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{
    if(b.classList.contains('hit'))return;
    if(b.dataset.t==='1'){b.classList.add('hit');found++;tone(600+found*50,.12);$('#cnt').textContent=`Найдено: ${found} из 8`;
      if(found===8){addSparks(25,b);sfx.ach();$('#cnt').innerHTML='<b style="color:var(--etrog)">Все восемь найдены! Слово «доля» спрятано в книге столько же раз.</b>';$('#act').innerHTML=`<button class="btn" id="nx">Что значит это слово?</button>`;$('#nx').onclick=()=>{sfx.tap();next()}}}
    else{b.classList.remove('no');void b.offsetWidth;b.classList.add('no');sfx.soft()}
  });
}

function gPuzzle(){
  const P=[['★','Талант','То, что получается у тебя легче, чем у других.'],['◆','Характер','Какой ты: смелый, спокойный, упорный, добрый.'],['●','Интерес','То, о чём ты можешь думать часами.'],['▲','Опыт','Всё, что ты уже прожил и чему научился. Даже трудное.'],['♥','Возможность помочь','Место, где рядом с тобой кто-то нуждается в помощи.'],['■','Ответственность','То, что поручено именно тебе.']];
  const layout=[0,'d',1,2,'h',3,4,'d',5];
  const placed={};let sel=null;
  const hint='Посмотри на знак на детали и найди такой же знак в картине. Сначала нажми на деталь, потом на место.';
  const draw=()=>{
    stage.innerHTML=`<section class="scene">${head()}${sayHTML(M,'Собери картину. Нажми на деталь, а потом на место с таким же знаком.')}
      <div class="board">${layout.map((c,i)=>c==='d'?`<div class="slot deco">чужая деталь</div>`:c==='h'?`<div class="slot hole">?</div>`:placed[c]?`<div class="slot filled"><span><em>${P[c][0]}</em>${P[c][1]}</span></div>`:`<button class="slot" data-slot="${c}" aria-label="Место со знаком ${P[c][0]}">${P[c][0]}</button>`).join('')}</div>
      <div class="tray">${P.map((p,i)=>placed[i]?'':`<button class="piece ${sel===i?'sel':''}" data-p="${i}"><em>${p[0]}</em>${p[1]}</button>`).join('')}</div>
      <div id="out"></div><div class="actions" id="act">${hintBtn(hint)}</div></section>`;
    wireHint(hint);
    stage.querySelectorAll('.piece').forEach(b=>b.onclick=()=>{sel=+b.dataset.p;sfx.tap();draw()});
    stage.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
      if(sel===null){b.classList.remove('no');void b.offsetWidth;b.classList.add('no');return}
      if(+b.dataset.slot===sel){placed[sel]=1;const p=P[sel];sel=null;sfx.good();draw();
        $('#out').innerHTML=`<div class="resp"><span class="who">${p[0]} ${p[1]}</span><p>${p[2]}</p></div>`;
        if(Object.keys(placed).length===6){addSparks(25);$('#act').innerHTML=`<button class="btn" id="nx">Далее</button>`;$('#nx').onclick=()=>{sfx.tap();next()}}
      }else{b.classList.remove('no');void b.offsetWidth;b.classList.add('no');sfx.soft()}
    });
  };draw();
}

function gSky(){
  let stars='';for(let i=0;i<24;i++)stars+=`<span class="star" style="left:${(i*37)%100}%;top:${(i*23)%60}%"></span>`;
  stage.innerHTML=`<section class="scene">${head()}<article class="card"><span class="kicker">Солнце и луна</span><h2 class="h2">Моше и Йеошуа</h2>
    <p>Моше был великим учителем. Его ученик Йеошуа стал вести народ после него. Мудрецы сравнивали Моше с солнцем, а Йеошуа — с луной.</p>
    <div class="sky" id="sky">${stars}<div class="sun"></div><div class="moon"></div><div class="ground"></div></div>
    <p id="skyt" class="muted">Луна светит слабее солнца. Значит, она хуже?</p></article>
    <div class="actions" id="act"><button class="btn" id="night">Наступает ночь</button></div></section>`;
  $('#night').onclick=()=>{$('#sky').classList.add('night');sfx.good();addSparks(10,$('#sky'));
    setTimeout(()=>{if(!$('#skyt'))return;$('#skyt').innerHTML='<b style="color:var(--ink)">Ночью солнца не видно. И миру нужен именно свет луны.</b> Луне не нужно становиться солнцем. У неё своё время и своя работа.'},1200);
    $('#act').innerHTML=`<button class="btn" id="nx">Далее</button>`;$('#nx').onclick=()=>{sfx.tap();next()}};
}

function gHands(){
  stage.innerHTML=`<section class="scene">${head()}<article class="card"><span class="kicker">Берешит 48:14</span><h2 class="h2">Благословение Яакова</h2>
    <svg class="blessing" id="bl" viewBox="0 0 360 250" aria-hidden="true">
      <g transform="translate(130,6) scale(1)"><svg width="100" height="100" x="0" y="0">${mentorSvg()}</svg></g>
      <path class="arm straight" d="M160 100 Q120 140 85 175"/><path class="arm straight" d="M200 100 Q240 140 275 175"/>
      <path class="arm crossed" d="M160 100 Q210 130 275 175"/><path class="arm crossed" d="M200 100 Q150 130 85 175"/>
      <svg x="40" y="160" width="90" height="90">${avatar({look:1,outfit:2})}</svg><svg x="230" y="160" width="90" height="90">${avatar({look:0,outfit:0})}</svg>
      <text x="85" y="248" text-anchor="middle" fill="#566d67" font-size="12" font-family="Onest,sans-serif">Эфраим</text><text x="275" y="248" text-anchor="middle" fill="#566d67" font-size="12" font-family="Onest,sans-serif">Менаше</text>
    </svg>
    <p id="ht" class="muted">Менаше, старший, стоит под правой рукой дедушки. Что сделает Яаков?</p></article>
    <div class="actions" id="act"><button class="btn" id="see">Посмотреть</button></div></section>`;
  $('#see').onclick=()=>{$('#bl').classList.add('x');sfx.good();addSparks(10);
    $('#ht').innerHTML='<b style="color:var(--ink)">Яаков скрестил руки.</b> Правую руку он положил на голову младшего, Эфраима. Йосеф удивился, но Яаков сказал: «Я знаю, сын мой, я знаю». И благословил младшего первым.';
    $('#act').innerHTML=`<button class="btn" id="nx">Далее</button>`;$('#nx').onclick=()=>{sfx.tap();next()}};
}

function gCircles(){
  let act=null;
  const keys=Object.keys(LAB);
  const hint='Выбирай быстро, не думай слишком долго. Первое, что пришло в голову, часто самое точное.';
  const draw=()=>{
    const all=keys.every(k=>S.lab[k].length>0);
    stage.innerHTML=`<section class="scene">${head()}${sayHTML(M,'Четыре круга. Нажми на каждый и выбери до трёх ответов. Где круги пересекаются, там может прятаться твоя доля.')}
      <div class="circles">${keys.map(k=>`<button class="circ ${act===k?'act':''} ${S.lab[k].length?'has':''}" data-k="${k}">${LAB[k].title}<small>${S.lab[k].length?'выбрано: '+S.lab[k].length:'нажми'}</small></button>`).join('')}</div>
      ${act?`<div class="card"><span class="kicker">${LAB[act].title}</span><div class="chips">${LAB[act].opts.map((o,i)=>`<button class="chip ${S.lab[act].includes(o)?'on':''}" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`:''}
      <div class="actions">${hintBtn(hint)}<button class="btn" id="nx" ${all?'':'disabled'}>${all?'Собрать карту':'Заполни все четыре круга'}</button></div></section>`;
    wireHint(hint);
    stage.querySelectorAll('.circ').forEach(b=>b.onclick=()=>{act=b.dataset.k;sfx.tap();draw()});
    stage.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const o=LAB[act].opts[+b.dataset.o];const a=S.lab[act];
      if(a.includes(o))S.lab[act]=a.filter(x=>x!==o);else{if(a.length>=3)a.shift();a.push(o)}sfx.tap();save();
      const cur=act;if(S.lab[cur].length===3){const nk=keys.find(k=>!S.lab[k].length);if(nk)act=nk}draw()});
    $('#nx').onclick=()=>{addSparks(25,$('#nx'));sfx.good();next()};
  };draw();
}

function strengthMap(s){
  const L=s.lab,q=s.qualities||[];const list=a=>a.map(esc).join(', ');
  const combos=[[/идеи|рисовать|писать/,'создавать что-то новое и полезное для других'],[/объяснять/,'помогать другим понять сложное'],[/слушать/,'быть рядом, когда кому-то трудно'],[/организовывать/,'собирать людей вместе и доводить дело до конца'],[/задачи|мастерить|детали/,'находить решения, которые другие не замечают'],[/спорт/,'заряжать других энергией и командным духом']];
  const joined=(L.can||[]).join(' ');const c=combos.find(x=>x[0].test(joined));
  const parts=[];
  if(q.length)parts.push(`<p>Похоже, ты ${list(q)}.</p>`);
  if(L.can.length)parts.push(`<p>У тебя хорошо получается: ${list(L.can)}.</p>`);
  if(L.like.length)parts.push(`<p>Тебе нравится: ${list(L.like)}.</p>`);
  if(L.need.length)parts.push(`<p>Ты замечаешь, что людям рядом нужно: ${list(L.need)}${L.help.length?'. И ты можешь помочь: '+list(L.help):''}.</p>`);
  parts.push(`<p style="font-size:19px;font-weight:600;color:var(--etrog)">Возможно, одна из твоих сильных сторон — ${c?c[1]:'делать мир вокруг чуть лучше своим способом'}.</p>`);
  if(s.ans.flow)parts.push(`<p class="muted">Попробуй обратить внимание, когда время летит незаметно. Ты сказал: «${esc(s.ans.flow)}». Это стоит исследовать.</p>`);
  parts.push(`<p class="muted" style="font-size:14px">Раввин Шнеор Ашкенази рассказывал: однажды он почти перестал преподавать, ведь его уроки смотрели всего сто-двести человек. И тут он прочитал: «Никогда не прекращай делать то, в чём ты хорош». Он не бросил.</p>`);
  return parts.join('');
}

function gFinal(){
  stage.innerHTML=`<section class="scene">${head()}${sayHTML(M,'Вот он, большой пазл. Здесь все, кого ты встретил в пути. Каждый на своём месте. Одного места не хватает.')}
    <div class="bigboard" id="bb">${BOARD.map((b,i)=>b[1]?`<div class="bp" style="background:${b[1]};animation-delay:${i*.06}s">${b[0]}</div>`:`<div class="bp me" id="me">${esc(heroName())}?</div>`).join('')}</div>
    <div class="actions" id="act"><button class="btn" id="put">Вставить свою деталь</button></div></section>`;
  $('#put').onclick=()=>{const me=$('#me');me.classList.add('in');me.innerHTML=avatar(S.hero);sfx.ach();
    setTimeout(()=>{const bb=$('#bb');if(bb)bb.classList.add('glow')},700);addSparks(30,me);
    $('#act').innerHTML=`<button class="btn" id="nx">Посмотреть, что получилось</button>`;$('#nx').onclick=()=>{sfx.tap();next()}};
}

/* ---------- world flow ---------- */
function completeWorld(){
  const w=WORLDS[S.w];const first=!S.done[S.w];S.done[S.w]=1;
  if(first)S.sparks+=30;
  if(w.ach)unlock(w.ach);
  if(S.done.every(Boolean))unlock('explorer');
  save();
  if(S.w===6){if(!S.finished)S.finished=new Date().toISOString();S.screen='final';unlock('path');save();render();window.scrollTo({top:0});return}
  S.screen='done';save();render();window.scrollTo({top:0});
}
function renderDone(){
  const n=S.done.filter(Boolean).length;
  stage.innerHTML=`<section class="scene"><div class="card reveal"><span class="kicker">Мир ${S.w+1} пройден</span>
    <div style="width:110px;animation:pop .6s ease both">${pieceSvg('var(--gold)')}</div>
    <p class="h2">Деталь «${esc(WORLDS[S.w].name)}» у тебя</p><p class="muted">Собрано деталей: ${n} из 7 · +30 искр</p></div>
    <div class="actions"><button class="btn" id="nx">Продолжить приключение</button></div></section>`;
  $('#nx').onclick=()=>{sfx.tap();go('map')};
}
function renderMap(){
  S._last='map';
  const firstOpen=S.done.findIndex(d=>!d);
  const prologueDone=S.ps>=PROLOGUE.length;
  stage.innerHTML=`<section class="scene">
    <span class="kicker">Карта путешествия</span><h2 class="h2">Семь миров книги Коэлет</h2>
    <div class="progress-wrap"><div class="pieces">${S.done.map(d=>pieceSvg(d?'var(--gold)':'none',d?'':'#b3c7bd')).join('')}</div>
    <div class="bar" style="height:10px"><i style="width:${S.done.filter(Boolean).length/7*100}%"></i></div></div>
    ${!prologueDone?`<button class="node open" id="pro"><span class="disc">📖</span><span><span class="st">Сначала</span><br><span class="nm">Пролог: Библиотека</span></span></button>`:''}
    <div class="map"><span class="rail"></span>${WORLDS.map((w,i)=>{const d=S.done[i],o=prologueDone&&(i===firstOpen),lock=!d&&!o;
      return `<button class="node ${d?'done':''} ${o?'open':''}" data-w="${i}" ${lock?'disabled':''}><span class="disc">${d?pieceSvg('var(--gold)'):lock?'🔒':i+1}</span><span style="min-width:0"><span class="st">${d?'Пройден · можно снова':o?'Открыт':'Закрыт'}</span><br><span class="nm">${esc(w.name)}</span><br><span class="ds">${esc(w.desc)}</span></span></button>`}).join('')}</div>
    ${S.done.every(Boolean)?`<div class="actions"><button class="btn" id="fin">Мой Хелек</button></div>`:''}
  </section>`;
  const pro=$('#pro');if(pro)pro.onclick=()=>{S.ps=Math.min(S.ps,PROLOGUE.length-1);go('prologue')};
  stage.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{S.w=+b.dataset.w;S.s=0;sfx.good();go('world')});
  const f=$('#fin');if(f)f.onclick=()=>go('final');
}
const CITY_LABEL={wealth:'богатство',fame:'популярность',mind:'ум',power:'власть',beauty:'красивую жизнь',adventure:'приключения'};
function fmtDate(iso){try{return new Date(iso||Date.now()).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}catch(e){return ''}}
function strengthsList(){const q=S.qualities||[];const stem=x=>x.slice(0,6);
  const extra=(S.lab.can||[]).filter(x=>!q.some(y=>stem(y)===stem(x)||y.includes(x.split(' ').pop()))).slice(0,2);return [...q,...extra].slice(0,5)}
function worldReport(){
  const lit=Object.keys(S.tools).map(k=>TOOLS[k][0]+' '+TOOLS[k][1].toLowerCase());
  return [
    ['Город успеха',S.city?`Ты выбрал ${CITY_LABEL[S.city]}. Вечером ответил: «${S.ans.evening||'—'}».`:'—','Можно получить всё и всё равно чувствовать, что чего-то не хватает.'],
    ['Пазл',`Нашёл все 8 слов חֵלֶק. Твои качества: ${(S.qualities||[]).join(', ')||'—'}.`,'Каждый получает свою деталь, и никто — весь пазл.'],
    ['Зеркало',`В ${S.mi||0} из 4 зеркал ты помог герою увидеть свою силу.`,'Чужая сильная сторона не делает твою слабее.'],
    ['Эфраим и Менаше',`Когда друг получил награду, ты решил: «${S.ans.awardAct||'—'}».`,'Если у другого есть свой дар, твой от этого не исчезает.'],
    ['Мастерская',lit.length?`Загорелись инструменты: ${lit.join(', ')}.`:'Инструменты ещё ждут тебя.','У каждого свои инструменты. Важно понять, для чего они тебе.'],
    ['Лаборатория Хелека',`Время летит незаметно, когда: ${(S.ans.flow||'—').toLowerCase()}. Получается: ${(S.lab.can||[]).join(', ')||'—'}.`,'Где встречаются «умею», «люблю» и «нужно другим», там может быть твоя доля.'],
    ['Одна деталь',`Твой шаг на неделю: ${(S.ans.weekly||'—').toLowerCase()}.`,'Тебе не нужно собрать весь мир. Нужно найти свою деталь.']
  ];
}
function wrapLines(ctx,text,maxW){const words=text.split(' ');const lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
async function drawCertificate(){
  const W=1600,H=1130,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  try{await Promise.all(['800 60px Unbounded','700 40px Unbounded','400 30px Onest','500 30px Onest','700 60px "Frank Ruhl Libre"'].map(f=>document.fonts.load(f)))}catch(e){}
  const D='Unbounded, "Trebuchet MS", sans-serif',B='Onest, "Segoe UI", sans-serif',HB='"Frank Ruhl Libre", serif';
  x.fillStyle='#fbfdfb';x.fillRect(0,0,W,H);
  // corner puzzle motifs
  const piece=(px,py,sz,col,rot)=>{x.save();x.translate(px,py);x.rotate(rot);x.scale(sz/100,sz/100);x.translate(-50,-50);x.fillStyle=col;x.fill(new Path2D(PIECE));x.restore()};
  [[90,90,'#9fd0ae',0],[190,70,'#f2be3d',.3],[70,190,'#f2b8c2',-.2],[W-90,H-90,'#bcd6ea',0],[W-190,H-70,'#9fd0ae',.4],[W-70,H-190,'#f2be3d',-.3]].forEach(p=>piece(p[0],p[1],110,p[2],p[3]));
  x.strokeStyle='#c9951f';x.lineWidth=6;x.strokeRect(40,40,W-80,H-80);x.lineWidth=2;x.strokeRect(58,58,W-116,H-116);
  x.textAlign='center';x.fillStyle='#a2700a';x.font=`500 26px ${B}`;x.fillText('П Р И К Л Ю Ч Е Н И Е   « Т А Й Н А   К О Э Л Е Т А »',W/2,170);
  x.fillStyle='#17282e';x.font=`800 92px ${D}`;x.fillText('СЕРТИФИКАТ',W/2,280);
  x.fillStyle='#566d67';x.font=`400 32px ${B}`;x.fillText('вручается',W/2,350);
  x.fillStyle='#2f7d4a';let fs=86;x.font=`700 ${fs}px ${D}`;const nm=heroName();while(x.measureText(nm).width>1100&&fs>40){fs-=4;x.font=`700 ${fs}px ${D}`}x.fillText(nm,W/2,450);
  x.fillStyle='#17282e';x.font=`400 34px ${B}`;
  wrapLines(x,'за прохождение всех семи миров книги Коэлет и поиск своей детали большого пазла',1150).forEach((l,i)=>x.fillText(l,W/2,530+i*46));
  const st=strengthsList();
  if(st.length){x.fillStyle='#566d67';x.font=`500 28px ${B}`;x.fillText('СИЛЬНЫЕ СТОРОНЫ',W/2,660);
    x.fillStyle='#17282e';x.font=`500 32px ${B}`;wrapLines(x,st.join(' · '),1200).slice(0,2).forEach((l,i)=>x.fillText(l,W/2,706+i*44))}
  x.fillStyle='#566d67';x.font=`400 28px ${B}`;x.fillText(`Уровень ${lvl()} · ${LEVELS[lvl()-1]}  ·  ${S.sparks} искр  ·  7 из 7 деталей  ·  ${Object.keys(S.ach).length} из 6 достижений`,W/2,820);
  // seal
  x.save();x.translate(W/2,950);x.fillStyle='#f2be3d';x.beginPath();for(let i=0;i<32;i++){const r=i%2?74:84,a=i/32*Math.PI*2;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}x.closePath();x.fill();
  x.fillStyle='#fbfdfb';x.beginPath();x.arc(0,0,62,0,Math.PI*2);x.fill();x.fillStyle='#c8445b';x.font=`700 50px ${HB}`;x.fillText('חֵלֶק',0,16);x.restore();
  x.textAlign='left';x.fillStyle='#17282e';x.font=`500 28px ${B}`;x.fillText(fmtDate(S.finished),190,960);
  x.strokeStyle='#b3c7bd';x.lineWidth=2;x.beginPath();x.moveTo(190,975);x.lineTo(560,975);x.stroke();
  x.fillStyle='#566d67';x.font=`400 22px ${B}`;x.fillText('дата',190,1005);
  x.textAlign='right';x.fillStyle='#17282e';x.font=`italic 500 32px ${B}`;x.fillText('Хранитель библиотеки',W-190,960);
  x.beginPath();x.moveTo(W-560,975);x.lineTo(W-190,975);x.stroke();
  x.fillStyle='#566d67';x.font=`400 22px ${B}`;x.fillText('подпись',W-190,1005);
  x.textAlign='center';x.font=`400 20px ${B}`;x.fillText('По мотивам урока раввина Шнеора Ашкенази «Тайна книги Коэлет»',W/2,1062);
  return c.toDataURL('image/png');
}
function renderFinal(){
  S._last='final';
  const strengths=strengthsList();
  if(S.phrase===null){S.phrase=S.insight>=3?0:S.help>=3?2:1;save()}
  const rep=worldReport();
  stage.innerHTML=`<section class="scene final-grid">
    <div class="final-hero"><span class="kicker">Финал · ${esc(heroName())}</span><h1 class="h1">Твой <span style="color:var(--pome)">Хелек</span></h1>
    <p class="lead">Ты обнаружил несколько своих сильных сторон. Это не готовый ответ на всю жизнь. Это подсказки, которые можно исследовать дальше.</p></div>

    <article class="card cert-card"><div class="cert-head"><span class="kicker">Сертификат</span><span class="muted" style="font-size:14px">${fmtDate(S.finished)}</span></div>
      <div class="field"><label for="certname">Имя на сертификате</label><input id="certname" maxlength="24" autocomplete="off" placeholder="Путник" value="${esc(S.hero.name)}"></div>
      <div class="cert-frame" id="cert"><p class="muted">Готовим сертификат…</p></div>
      <p class="muted" style="font-size:14px">Чтобы сохранить сертификат, нажми на картинку и удерживай её. На компьютере нажми на неё правой кнопкой и выбери «Сохранить изображение».</p></article>

    <div class="stats">
      <div class="statcard"><span class="k">Искры</span><b>${S.sparks}</b></div>
      <div class="statcard"><span class="k">Уровень</span><b>${lvl()}</b><small>${LEVELS[lvl()-1]}</small></div>
      <div class="statcard"><span class="k">Детали пазла</span><b>${S.done.filter(Boolean).length}/7</b></div>
      <div class="statcard"><span class="k">Достижения</span><b>${Object.keys(S.ach).length}/6</b></div>
    </div>

    <div class="duo">
      <div class="card"><span class="kicker">Твои сильные стороны</span><div class="strengths">${strengths.map(x=>`<span>${esc(x)}</span>`).join('')||'<span>ещё впереди</span>'}</div></div>
      <div class="card"><span class="kicker">Твой следующий шаг</span><p class="h2" style="font-size:20px">${esc(S.ans.weekly||'Выбрать свой шаг')}</p><p class="muted">На этой неделе. Маленький, но настоящий.</p></div>
    </div>

    <div class="card"><span class="kicker">Твоя фраза</span><p class="phrase" id="ph">${PHRASES[S.phrase]}</p><div class="actions"><button class="btn ghost small" id="nph">Другая фраза</button><button class="btn ghost small" id="cp">Скопировать</button></div></div>

    <section class="report"><div><span class="kicker">Отчёт о прохождении</span><h2 class="h2">Путь по семи мирам</h2>
      <p class="muted" style="font-size:15px">Начало: ${fmtDate(S.started)} · Финиш: ${fmtDate(S.finished)}</p></div>
      <div class="rgrid">${rep.map((r,i)=>`<article class="rcard"><div class="rtop"><span class="rnum">${i+1}</span><b>${esc(r[0])}</b></div><p>${esc(r[1])}</p><p class="disc"><span>Открытие</span>${esc(r[2])}</p></article>`).join('')}</div>
    </section>

    <div class="card"><span class="kicker">Разгадка тайны Коэлета</span><p>Царь Шломо проверил богатство, мудрость и славу и назвал всё это паром. Но в его книге 8 раз звучит слово <b class="heb" lang="he">חֵלֶק</b>, «доля». Счастье не в том, чтобы собрать весь пазл. Оно в том, чтобы найти свою деталь и радоваться ей.</p></div>

    <div class="card"><span class="kicker">Достижения</span>${achGrid()}</div>

    <div class="card talk-card"><span class="kicker">Для разговора дома или в классе</span>
      <ol><li>Что у тебя получается так, что время летит незаметно?</li><li>Когда ты последний раз радовался чужому успеху? Что при этом чувствовал?</li><li>Кому рядом с тобой сейчас нужно то, что умеешь ты?</li><li>Какую «деталь» в нашей семье или классе можешь добавить только ты?</li></ol></div>

    <div class="actions"><button class="btn" id="map">Вернуться на карту</button><button class="btn ghost" id="again">Пройти заново</button></div>
    <div id="conf"></div>
    <p class="foot">Для взрослых: игра основана на уроке раввина Шнеора Ашкенази «Тайна книги Коэлет». Источники: Коэлет 1:2, 3:22, 5:17–18, 9:9; Пиркей Авот 2:16, 4:1; Берешит 30:1, 48:14–20; Эстер 4:14; Бава Батра 75а. Ответы ребёнка хранятся только в этом браузере.</p>
  </section>`;
  let tok=0;const paint=async()=>{const my=++tok;const url=await drawCertificate();if(my!==tok||!$('#cert'))return;$('#cert').innerHTML=`<img src="${url}" alt="Сертификат о прохождении приключения «Тайна Коэлета» для ${esc(heroName())}">`};
  paint();
  let tm;$('#certname').oninput=e=>{S.hero.name=e.target.value;save();clearTimeout(tm);tm=setTimeout(paint,350)};
  $('#nph').onclick=()=>{S.phrase=(S.phrase+1)%PHRASES.length;save();$('#ph').textContent=PHRASES[S.phrase];sfx.tap()};
  $('#cp').onclick=()=>{const t=PHRASES[S.phrase];const ok=()=>{$('#cp').textContent='Скопировано'};
    try{navigator.clipboard.writeText(t).then(ok,()=>{selectText($('#ph'))})}catch(e){selectText($('#ph'))}};
  $('#map').onclick=()=>go('map');
  $('#again').onclick=()=>{$('#conf').innerHTML=`<div class="confirm"><p>Начать всё сначала? Прогресс будет стёрт.</p><div class="actions"><button class="btn small" id="yes">Да</button><button class="btn ghost small" id="no">Отмена</button></div></div>`;
    $('#yes').onclick=()=>{const snd=S.sound;S=fresh();S.sound=snd;save();go('create')};$('#no').onclick=()=>{$('#conf').innerHTML=''}};
}
function selectText(el){try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}catch(e){}}

/* ---------- boot ---------- */
function start(data){
  load();
  if(data&&data.state&&data.state.v===1)S=Object.assign(fresh(),data.state);
  if(S.screen!=='title'&&S.screen!=='create'){S._last=S.screen;S.screen='title'}
  render();
}
window.claude?.hot?.snapshot?.(()=>({state:S}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
