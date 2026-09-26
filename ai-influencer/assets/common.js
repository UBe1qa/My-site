/* ===== AI.Influence — shared script (all chapters) =====
   - builds the chapter nav (#topnav) and footer (#foot)
   - avatar() : inline SVG character portraits
   - reveal-on-scroll, scroll progress, sub-nav scrollspy
   Chapter list lives here: add a chapter = add one line to CHAPTERS. */
(function(){
  const CHAPTERS=[
    {k:'plan',n:'01',label:'기획',href:'/plan/'},
    {k:'characters',n:'02',label:'캐릭터',href:'/characters/',count:()=>window.CHARACTERS&&window.CHARACTERS.length},
    {k:'ops',n:'03',label:'운영',href:'/ops/'},
    {k:'reports',n:'04',label:'리포트',href:'/reports/'}
  ];
  window.CHAPTERS=CHAPTERS;
  const cur=document.body.dataset.chapter||'home';

  const nav=document.getElementById('topnav');
  if(nav){
    nav.className='topnav';
    nav.innerHTML=`<div class="wrap"><a href="/" class="logo" aria-label="홈">AI<span>.</span>Influence</a>
      <div class="chapters" role="navigation" aria-label="챕터">${CHAPTERS.map(c=>`<a href="${c.href}" class="${c.k===cur?'on':''}" ${c.k===cur?'aria-current="page"':''}><em>${c.n}</em>${c.label}${c.count&&c.count()?`<span class="cnt">${c.count()}</span>`:''}</a>`).join('')}</div></div>
      <div class="ptop" id="ptop"></div>`;
    const on=nav.querySelector('.chapters a.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'center'});
  }
  const foot=document.getElementById('foot');
  if(foot){
    foot.innerHTML=`<div class="wrap">${foot.dataset.note?foot.dataset.note+'<br>':''}
      <a href="/">홈</a> · ${CHAPTERS.map(c=>`<a href="${c.href}">${c.label}</a>`).join(' · ')}<br>
      AI 인플루언서 수익화 프로젝트 기록 · 이 사이트의 내용은 수익을 보장하지 않아요. © 2026 AI.Influence</div>`;
  }

  /* ---------- avatar generator ---------- */
  function avatar(o){
    const id='g'+Math.random().toString(36).slice(2,8);
    const hair={
      long:`<path d="M52 88c0-38 22-58 48-58s48 20 48 58v70c0 8-6 12-12 12H64c-6 0-12-4-12-12z" fill="${o.hair}"/>`,
      bob:`<path d="M54 92c0-38 20-58 46-58s46 20 46 58v34c0 6-4 10-10 10H64c-6 0-10-4-10-10z" fill="${o.hair}"/>`,
      short:`<path d="M58 84c0-30 18-48 42-48s42 18 42 48c-6-12-20-20-42-20s-36 8-42 20z" fill="${o.hair}"/>`,
      bun:`<circle cx="100" cy="30" r="16" fill="${o.hair}"/><path d="M58 86c0-30 18-48 42-48s42 18 42 48c-8-10-22-16-42-16s-34 6-42 16z" fill="${o.hair}"/>`
    }[o.style];
    const front={
      long:`<path d="M62 78c10-22 30-30 52-26 14 3 24 14 26 26-18-12-40-16-78 0z" fill="${o.hair}"/>`,
      bob:`<path d="M62 80c14-24 44-28 66-14 8 5 12 12 12 14-26-8-50-8-78 0z" fill="${o.hair}"/>`,
      short:`<path d="M62 80c16-18 44-22 76-4-8-16-24-24-40-24-18 0-32 10-36 28z" fill="${o.hair}"/>`,
      bun:`<path d="M62 82c16-16 50-18 76-2-6-14-22-22-38-22s-32 8-38 24z" fill="${o.hair}"/>`
    }[o.style];
    const glasses=o.glasses?`<g fill="none" stroke="#2a2233" stroke-width="3"><circle cx="84" cy="98" r="10"/><circle cx="116" cy="98" r="10"/><path d="M94 98h12"/></g>`:'';
    const lines=o.old?`<path d="M74 114q6 3 12 0M114 114q6 3 12 0" stroke="#c98b77" stroke-width="2" fill="none"/>`:'';
    return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.bg[0]}"/><stop offset="1" stop-color="${o.bg[1]}"/></linearGradient></defs>
    ${o.nobg?'':`<rect width="200" height="240" fill="url(#${id})"/>`}${hair}
    <path d="M40 240c4-40 30-58 60-58s56 18 60 58z" fill="${o.top}"/>
    <rect x="88" y="140" width="24" height="26" rx="8" fill="${o.skin}"/>
    <ellipse cx="100" cy="100" rx="38" ry="44" fill="${o.skin}"/>${front}
    <g class="blink"><ellipse cx="84" cy="100" rx="4.5" ry="5.5" fill="#1d1626"/><ellipse cx="116" cy="100" rx="4.5" ry="5.5" fill="#1d1626"/></g>
    <circle cx="85.5" cy="98" r="1.4" fill="#fff"/><circle cx="117.5" cy="98" r="1.4" fill="#fff"/>${glasses}${lines}
    <ellipse cx="76" cy="116" rx="7" ry="4" fill="#ff8fa8" opacity=".35"/><ellipse cx="124" cy="116" rx="7" ry="4" fill="#ff8fa8" opacity=".35"/>
    <path d="M90 124q10 8 20 0" stroke="#8a3b4d" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  }
  window.avatar=avatar;
  window.AV=window.AV||{};Object.assign(window.AV,{
    hana:{skin:'#f6d3bd',hair:'#3b2a4a',style:'bob',top:'#ff5c8a',bg:['#3a2350','#1b1530'],glasses:true},
    doyun:{skin:'#efc8a8',hair:'#1f1a24',style:'short',top:'#2f3b5a',bg:['#2a2f4a','#141726']},
    gyeol:{skin:'#f8d9c4',hair:'#6b3f2a',style:'long',top:'#3ddc97',bg:['#1f3a33','#101a18']},
    seojin:{skin:'#f3cfb6',hair:'#241b2e',style:'long',top:'#7b61ff',bg:['#2b2450','#151226']},
    bokdan:{skin:'#eec3a4',hair:'#b9b4c2',style:'bun',top:'#b8554e',bg:['#4a2f2a','#1e1614'],old:true,glasses:true},
    rozy:{skin:'#f3d2c0',hair:'#8b8b9e',style:'long',top:'#55556e',bg:['#2a2a3a','#1a1a24']},
    emma:{skin:'#f6d6c4',hair:'#6a3b2c',style:'bob',top:'#ff5c8a',bg:['#4a2240','#231020']}
  });
  /* characters/data.js 가 먼저 로드됐으면 캐릭터 얼굴·조회 도우미 등록 */
  const DEFAULT_AV={skin:'#f1cdb2',hair:'#3a3040',style:'short',top:'#55556e',bg:['#2a2a3a','#1a1a24']};
  if(window.CHARACTERS){
    window.CHARACTERS.forEach(c=>{window.AV[c.id]=c.av||DEFAULT_AV;});
    window.charById=id=>window.CHARACTERS.find(c=>c.id===id);
    window.stageOf=k=>(window.STAGES||[]).find(s=>s.k===k)||{k,ic:'•',label:k};
    /* 설정표 완성도: 채워진 칸 / 전체 칸 */
    const FIELDS=['handle','age','role','home','platform','concept','target','why','risk','money','personality','looks','voice','sidekick','avoid','episodes','moneyFlow'];
    window.completeness=c=>{const n=FIELDS.filter(k=>{const v=c[k];return Array.isArray(v)?v.length:v!=null&&v!=='';}).length;return {n,total:FIELDS.length,pct:Math.round(n/FIELDS.length*100)};};
    window.stageBadge=c=>{const s=window.stageOf(c.stage);return `<span class="stg ${s.k}">${s.ic} ${s.label}${c.demo?' <span class="d">샘플</span>':''}</span>`;};
  }
  document.querySelectorAll('[data-av]').forEach(el=>el.innerHTML=avatar(window.AV[el.dataset.av]));

  /* ---------- 한국어 조사: josa('하나 쌤','이','가') → '하나 쌤이' ---------- */
  window.josa=(w,a,b)=>{const ch=w.charCodeAt(w.length-1);const has=ch>=0xAC00&&ch<=0xD7A3&&(ch-0xAC00)%28>0;return w+(has?a:b);};

  /* ---------- number formatting ---------- */
  window.fmt={
    n:v=>v.toLocaleString('ko-KR'),
    won:v=>'₩'+Math.round(v).toLocaleString('ko-KR'),
    k:v=>v>=10000?(v/10000).toFixed(1).replace(/\.0$/,'')+'만':v.toLocaleString('ko-KR'),
    pct:(v,d=1)=>(v*100).toFixed(d)+'%'
  };

  /* ---------- reveal on scroll ---------- */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('show');
    e.target.dispatchEvent(new CustomEvent('revealed'));io.unobserve(e.target);}),{threshold:.12});
  window.watchReveal=()=>document.querySelectorAll('.reveal:not(.show)').forEach(el=>io.observe(el));
  window.watchReveal();

  /* ---------- scroll progress + sub-nav scrollspy ---------- */
  const ptop=document.getElementById('ptop');
  function onScroll(){
    const h=document.documentElement,max=h.scrollHeight-h.clientHeight;
    if(ptop)ptop.style.width=(max>0?h.scrollTop/max*100:0)+'%';
    const subLinks=[...document.querySelectorAll('.subnav a[href^="#"]')];
    const subSecs=subLinks.map(a=>document.querySelector(a.getAttribute('href')));
    if(subLinks.length){let c=-1;subSecs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<140)c=i;});
      subLinks.forEach((a,i)=>{const on=i===c;if(on&&!a.classList.contains('on')&&a.scrollIntoView)a.parentElement.scrollTo({left:a.offsetLeft-40,behavior:'smooth'});a.classList.toggle('on',on);});}
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* ---------- confetti ---------- */
  window.confetti=function(){const cols=['#ff5c8a','#7b61ff','#3ddc97','#ffb547','#fff'];
    for(let i=0;i<90;i++){const c=document.createElement('i');c.style.cssText=`position:fixed;top:-12px;left:${Math.random()*100}vw;width:9px;height:14px;z-index:100;pointer-events:none;background:${cols[i%5]};border-radius:${Math.random()>.5?'50%':'2px'};animation:ai-fall ${1.8+Math.random()*1.6}s linear ${Math.random()*.4}s forwards`;
      document.body.appendChild(c);setTimeout(()=>c.remove(),4000);}};
  const st=document.createElement('style');st.textContent='@keyframes ai-fall{to{transform:translateY(110vh) rotate(720deg)}}';document.head.appendChild(st);
})();
