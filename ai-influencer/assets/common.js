/* ===== AI.Influence — shared script (all pages) =====
   - 상단 챕터 메뉴(#topnav)·푸터(#foot) 자동 생성
   - face(id) : 캐릭터 일러스트 (/assets/chars/{id}.svg, DiceBear Notionists · CC0)
   - avatar(AV[id]) : 예전 호출 방식 호환 → face 로 연결
   - 스크롤 등장 효과, 진행 막대, 섹션 메뉴 위치 표시
   챕터 추가 = CHAPTERS 에 한 줄 추가. */
(function(){
  const CHAPTERS=[
    {k:'plan',label:'기획',href:'/plan/'},
    {k:'characters',label:'캐릭터',href:'/characters/',count:()=>window.CHARACTERS&&window.CHARACTERS.length},
    {k:'ops',label:'운영',href:'/ops/'},
    {k:'reports',label:'리포트',href:'/reports/'}
  ];
  window.CHAPTERS=CHAPTERS;
  const cur=document.body.dataset.chapter||'home';

  const nav=document.getElementById('topnav');
  if(nav){
    nav.className='topnav';
    nav.innerHTML=`<div class="wrap"><a href="/" class="logo" aria-label="홈"><i></i><span class="lt">AI<em>.</em>Influence</span></a>
      <div class="navr"><div class="chapters" role="navigation" aria-label="챕터">${CHAPTERS.map(c=>`<a href="${c.href}" class="${c.k===cur?'on':''}" ${c.k===cur?'aria-current="page"':''}>${c.label}${c.count&&c.count()?`<span class="cnt">${c.count()}</span>`:''}</a>`).join('')}</div>
      ${cur!=='characters'?'<a class="btn primary sm navcta" href="/characters/">캐릭터 보기</a>':''}</div></div>
      <div class="ptop" id="ptop"></div>`;
    const on=nav.querySelector('.chapters a.on');if(on&&on.scrollIntoView&&innerWidth<700)on.scrollIntoView({block:'nearest',inline:'center'});
  }
  const foot=document.getElementById('foot');
  if(foot){
    foot.innerHTML=`<div class="wrap">${foot.dataset.note?`<div style="max-width:720px;margin:0 auto 14px">${foot.dataset.note}</div>`:''}
      <a href="/">홈</a> · ${CHAPTERS.map(c=>`<a href="${c.href}">${c.label}</a>`).join(' · ')}<br>
      AI 인플루언서 수익화 프로젝트 기록 · 수익을 보장하지 않아요 · 캐릭터 일러스트 DiceBear Notionists (CC0) · © 2026 AI.Influence</div>`;
  }

  /* ---------- character faces ---------- */
  const TINT={rozy:'#e4e4ec',emma:'#ffdde6'};
  window.charById=id=>(window.CHARACTERS||[]).find(c=>c.id===id);
  function face(id,zoom){
    const c=window.charById(id),tint=(c&&c.tint)||TINT[id]||'#e4e4ec',init=((c&&c.name)||id||'?').trim()[0];
    return `<span class="face${zoom?' zoom':''}" style="--tint:${tint}"><img src="/assets/chars/${id}.svg" alt="" loading="lazy" decoding="async" onerror="this.outerHTML='<b>${init}</b>'"></span>`;
  }
  window.face=face;
  /* 예전 방식 avatar(AV[id]) 호환: 작은 동그라미에서 쓰이므로 얼굴 확대 */
  window.AV=window.AV||{};
  ['rozy','emma'].forEach(id=>window.AV[id]={id});
  (window.CHARACTERS||[]).forEach(c=>window.AV[c.id]={id:c.id});
  window.avatar=o=>face(o&&o.id,!(o&&o.full));
  document.querySelectorAll('[data-av]').forEach(el=>el.innerHTML=face(el.dataset.av,!el.hasAttribute('data-full')));

  if(window.CHARACTERS){
    window.stageOf=k=>(window.STAGES||[]).find(s=>s.k===k)||{k,ic:'•',label:k};
    /* 설정표 완성도: 채워진 칸 / 전체 칸 */
    const FIELDS=['handle','age','role','home','platform','concept','target','why','risk','money','personality','looks','voice','sidekick','avoid','episodes','moneyFlow'];
    window.completeness=c=>{const n=FIELDS.filter(k=>{const v=c[k];return Array.isArray(v)?v.length:v!=null&&v!=='';}).length;return {n,total:FIELDS.length,pct:Math.round(n/FIELDS.length*100)};};
    window.stageBadge=c=>{const s=window.stageOf(c.stage);return `<span class="stg ${s.k}">${s.label}${c.demo?' <span class="d">샘플</span>':''}</span>`;};
  }

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

  /* ---------- count-up numbers: <b data-count="18" data-suffix="개"> ---------- */
  window.countUp=el=>{const t=+el.dataset.count,s=el.dataset.suffix||'',p=el.dataset.prefix||'';if(isNaN(t))return;const dur=900,t0=performance.now();
    const step=now=>{const k=Math.min(1,(now-t0)/dur),v=Math.round(t*(1-Math.pow(1-k,3)));el.textContent=p+v.toLocaleString('ko-KR')+s;if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);};

  /* ---------- scroll progress + sub-nav scrollspy ---------- */
  const ptop=document.getElementById('ptop');
  function onScroll(){
    const h=document.documentElement,max=h.scrollHeight-h.clientHeight;
    if(ptop)ptop.style.width=(max>0?h.scrollTop/max*100:0)+'%';
    const subLinks=[...document.querySelectorAll('.subnav a[href^="#"]')];
    const subSecs=subLinks.map(a=>document.querySelector(a.getAttribute('href')));
    if(subLinks.length){let c=-1;subSecs.forEach((s,i)=>{if(s&&s.getBoundingClientRect().top<150)c=i;});
      subLinks.forEach((a,i)=>{const on=i===c;if(on&&!a.classList.contains('on'))a.parentElement.scrollTo({left:a.offsetLeft-40,behavior:'smooth'});a.classList.toggle('on',on);});}
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* ---------- confetti ---------- */
  window.confetti=function(){const cols=['#ff5c8a','#7b61ff','#3ddc97','#ffb547','#fff'];
    for(let i=0;i<90;i++){const c=document.createElement('i');c.style.cssText=`position:fixed;top:-12px;left:${Math.random()*100}vw;width:9px;height:14px;z-index:100;pointer-events:none;background:${cols[i%5]};border-radius:${Math.random()>.5?'50%':'2px'};animation:ai-fall ${1.8+Math.random()*1.6}s linear ${Math.random()*.4}s forwards`;
      document.body.appendChild(c);setTimeout(()=>c.remove(),4000);}};
  const st=document.createElement('style');st.textContent='@keyframes ai-fall{to{transform:translateY(110vh) rotate(720deg)}}';document.head.appendChild(st);
})();
