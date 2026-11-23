/* 작은 부품 손맛 다섯(2026-11-23). 디자인북마크 Motion(designbookmark.com/motion)의 원본 소스(/motion-src/<이름>/)를 읽고 옮겼다.
   스프링은 원본 tokens.css 값 그대로('강도 감쇠'), 색·크기·글은 루멘랩 것. 부품 도감 머리의 '작은 부품 움직임은 디자인북마크에서' 줄.
   1) 장 알약(.chaps) = Rubber dock: 흰 알약의 앞 가장자리는 빠르고(640 38) 뒤는 느려서(150 16) 옮길 때 고무처럼 늘어남. 알약 줄을 옆으로 끌면 따라오고 놓으면 가까운 작품으로
   2) 걸이판 꼬리표(.tg) = Parallax ticket: 손을 올린 쪽으로 기울고(14°, 220 18) 아이콘·글이 깊이만큼 어긋나며 빛이 따라옴
   3) Owlight 모니터 화면 = Glass lens: 둥근 돋보기가 화면 위를 다니며 메뉴 막대·시계를 키워 보여 줌(180 17, 1.7배, 누르면 2.4배). 그 장일 때만 돈다
   4) 주 단추(작품 단추·위 막대 '만든 것 보기'·메일 복사) = Magnetic button: 마우스가 다가가면 단추가 끌려오고 글은 더 끌려옴(170 13 / 220 15). PC 마우스만
   5) 문 밖 '불은 늘 켜 둘게요' = Pull cord: 줄 달린 등. 당기면 딸깍 불이 꺼지며 어둠이 전구에서 번지고, 잠시 뒤 스스로 다시 켜짐(밧줄 12마디, 딸깍 22px)
   스프링 엔진은 원본 shared/motion.js 를 줄인 것. 움직일 게 없으면 rAF 를 멈춘다(원본은 늘 돎). 동작 줄이기면 출렁임 없이(임계 감쇠) 가고, 자석·돋보기 떠돌기·등 힌트는 끈다 */
(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover: hover) and (pointer: fine)');
const Sp=(x,k=400,c=30)=>({x,v:0,t:x,k,c:reduce?2*Math.sqrt(k):c});
const tune=(s,k,c)=>{s.k=k;s.c=reduce?2*Math.sqrt(k):c;};
const step=(s,dt)=>{const a=-s.k*(s.x-s.t)-s.c*s.v;s.v+=a*dt;s.x+=s.v*dt;};
const still=(ss,e=.002)=>ss.every(s=>Math.abs(s.x-s.t)<e&&Math.abs(s.v)<e*20);
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const comps=new Set();let raf=0,last=0;
function loop(now){raf=0;const dt=Math.min((now-last)/1000,1/30);last=now;
  comps.forEach(c=>{for(let k=0;k<4;k++)c.frame(dt/4);c.render();if(!c.busy())comps.delete(c);});
  if(comps.size)raf=requestAnimationFrame(loop);}
function wake(c){comps.add(c);if(!raf){last=performance.now();raf=requestAnimationFrame(loop);}}

/* ── 1) 장 알약 = Rubber dock ── */
(function(){
  const chaps=document.querySelector('.chaps');if(!chaps)return;
  const btns=[...chaps.querySelectorAll('button')];if(btns.length<2)return;
  chaps.classList.add('rb');
  const pill=document.createElement('span');pill.className='rb-pill';pill.setAttribute('aria-hidden','true');
  const ink=document.createElement('div');ink.className='rb-ink';ink.setAttribute('aria-hidden','true');ink.inert=true;
  const tops=btns.map(b=>{const c=b.cloneNode(true);c.removeAttribute('data-go');c.removeAttribute('aria-current');c.tabIndex=-1;c.type='button';ink.appendChild(c);return c;});
  chaps.prepend(pill);chaps.appendChild(ink);
  // 밑줄 진행 막대는 walk.js 가 원래 알약에 그린다 → 위 글자 층(알약 위에 보이는 쪽)에 그대로 옮겨 적음
  const bars=btns.map(b=>b.querySelector('b')),tbars=tops.map(t=>t.querySelector('b'));
  const mo=new MutationObserver(()=>bars.forEach((b,i)=>{if(b&&tbars[i])tbars[i].style.width=b.style.width;}));
  bars.forEach(b=>b&&mo.observe(b,{attributes:true,attributeFilter:['style']}));
  const T={lead:[640,38],trail:[150,16],dragLead:[1100,56],dragTrail:[320,26],pop:[520,16]};
  const L=Sp(0),R=Sp(0),Y=Sp(0,400,34),HH=Sp(0,400,34),nudge=Sp(0,300,18),O=Sp(0,420,32),pops=btns.map(()=>Sp(1,...T.pop));
  const all=[L,R,Y,HH,nudge,O,...pops];
  let geo=[],active=-1,drag=null,suppress=false,started=false;
  const measure=()=>{geo=btns.map(b=>({l:b.offsetLeft,w:b.offsetWidth,t:b.offsetTop,h:b.offsetHeight}));};
  const cx=i=>geo[i].l+geo[i].w/2;
  function moveTo(i,center,dir,isDrag){
    const lead=isDrag?T.dragLead:T.lead,trail=isDrag?T.dragTrail:T.trail;
    if(!dir){tune(L,600,44);tune(R,600,44);}else{const[l,r]=dir>0?[trail,lead]:[lead,trail];tune(L,...l);tune(R,...r);}
    const w=geo[i].w;L.t=center-w/2;R.t=center+w/2;Y.t=geo[i].t;HH.t=geo[i].h;}
  function setActive(i){
    if(!geo.length)measure();
    if(i<0){O.t=0;wake(comp);return;}
    O.t=1;
    if(!started){started=true;const g=geo[i];L.x=L.t=g.l+g.w/2-2;R.x=R.t=g.l+g.w/2+2;Y.x=g.t;HH.x=g.h;}   // 처음: 점 하나가 알약으로 자람(원본 intro)
    const dir=Math.sign(cx(i)-(L.x+R.x)/2);
    moveTo(i,cx(i),dir,false);if(i!==active)pops[i].v-=3.2;active=i;wake(comp);}
  const cur=()=>btns.findIndex(b=>b.hasAttribute('aria-current'));
  // 알약을 누르면 스크롤이 그 작품에 닿기를 기다리지 않고 바로 그쪽으로 늘어나 감. 가는 길에 지나는 장(aria-current)은 그동안 무시
  let lockTo=-1,lockUntil=0;
  btns.forEach((bt,i)=>bt.addEventListener('click',()=>{lockTo=i;lockUntil=performance.now()+2600;setActive(i);}));
  new MutationObserver(()=>{const i=cur();if(lockTo>=0&&performance.now()<lockUntil){if(i===lockTo)lockTo=-1;return;}lockTo=-1;if(i!==active||i<0)setActive(i);}).observe(chaps,{subtree:true,attributes:true,attributeFilter:['aria-current']});
  addEventListener('resize',()=>{measure();if(active>=0){L.x=L.t=geo[active].l;R.x=R.t=geo[active].l+geo[active].w;}wake(comp);});
  // 끌기: 4px 넘게 옆으로 움직이면 알약이 손가락을 따라오고(양 끝 밖으론 고무처럼 버팀), 놓으면 가던 쪽으로 살짝 더 가서 가까운 작품
  const rubber=(x,a,b,d=46)=>x<a?a-(1-1/((a-x)*.55/d+1))*d:x>b?b+(1-1/((x-b)*.55/d+1))*d:x;
  const lx=e=>{const r=chaps.getBoundingClientRect();return e.clientX-r.left-nudge.x;};
  chaps.addEventListener('pointerdown',e=>{if(e.button)return;measure();drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,last:lx(e),live:false,dir:0};});
  chaps.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(!drag.live){if(Math.abs(e.clientX-drag.x0)>4&&Math.abs(e.clientX-drag.x0)>Math.abs(e.clientY-drag.y0)){drag.live=true;try{chaps.setPointerCapture(e.pointerId);}catch(err){}chaps.classList.add('dragging');}else return;}
    const raw=lx(e),d=raw-drag.last;drag.last=raw;if(Math.abs(d)>.5)drag.dir=Math.sign(d);
    const a=cx(0),b=cx(btns.length-1),c=rubber(raw,a,b);
    let k=0;for(let i=1;i<btns.length;i++)if(Math.abs(cx(i)-c)<Math.abs(cx(k)-c))k=i;
    moveTo(k,c,drag.dir,true);nudge.t=(c-cl(c,a,b))*.35;O.t=1;wake(comp);});
  const end=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(drag.live){const c=(L.t+R.t)/2+drag.dir*18;let k=0;for(let i=1;i<btns.length;i++)if(Math.abs(cx(i)-c)<Math.abs(cx(k)-c))k=i;
      nudge.t=0;chaps.classList.remove('dragging');
      if(k===active)setActive(k);else{active=-2;btns[k].click();setActive(k);}   // 이 click 이 walk.js 로 가서 그 작품까지 감. 그 뒤 브라우저가 내는 click 만 막음
      suppress=true;setTimeout(()=>{suppress=false;},0);wake(comp);}
    drag=null;};
  chaps.addEventListener('pointerup',end);chaps.addEventListener('pointercancel',end);
  chaps.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();}},true);
  const comp={
    frame(dt){all.forEach(s=>step(s,dt));},
    render(){
      let l=L.x,r=R.x;if(r<l)[l,r]=[r,l];
      const base=Math.max(24,R.t-L.t),iw=Math.max(r-l,20),h=HH.x||32,ih=h*cl(Math.sqrt(base/iw),.66,1.1),top=Y.x+(h-ih)/2,o=cl(O.x,0,1);
      pill.style.width=iw.toFixed(2)+'px';pill.style.height=ih.toFixed(2)+'px';pill.style.borderRadius=(ih/2).toFixed(2)+'px';
      pill.style.transform='translate3d('+l.toFixed(2)+'px,'+top.toFixed(2)+'px,0)';pill.style.opacity=o.toFixed(3);
      const W=chaps.clientWidth,H=chaps.clientHeight;
      ink.style.clipPath=o<.02?'inset(50%)':'inset('+top.toFixed(2)+'px '+(W-l-iw).toFixed(2)+'px '+(H-top-ih).toFixed(2)+'px '+l.toFixed(2)+'px round '+(ih/2).toFixed(2)+'px)';
      chaps.style.translate=Math.abs(nudge.x)<.05?'':nudge.x.toFixed(2)+'px 0';
      pops.forEach((p,i)=>{const t=Math.abs(p.x-1)<.001?'':'scale('+p.x.toFixed(4)+')';const a=btns[i].querySelector('span'),b=tops[i].querySelector('span');if(a)a.style.transform=t;if(b)b.style.transform=t;});},
    busy(){return !!drag||!still(all,.01);}};
  requestAnimationFrame(()=>{measure();const i=cur();if(i>=0)setActive(i);});
})();

/* ── 2) 걸이판 꼬리표 = Parallax ticket(기울기 14°, 깊이 12px). 앞뒤 뒤집기는 뺌: 누르면 소개 창이 뜨니까 ── */
(function(){
  const TILT=14,DEPTH=12;
  document.querySelectorAll('.tg').forEach(tg=>{
    const card=tg.querySelector('.card');if(!card)return;
    let c=null;
    function make(){
      tg.classList.add('tl');
      const gl=document.createElement('span');gl.className='gl';gl.setAttribute('aria-hidden','true');card.appendChild(gl);
      const layers=[[card.querySelector('img'),.9],[card.querySelector('b'),.5],[card.querySelector('.wt'),.4]].filter(l=>l[0]);
      const RX=Sp(0,220,18),RY=Sp(0,220,18),G=Sp(0,300,26),LIFT=Sp(1,300,18),UP=Sp(0,300,26);
      const s={hover:false,gx:50,gy:30};
      c={s,set(e){const r=card.getBoundingClientRect(),nx=cl((e.clientX-r.left)/r.width*2-1,-1,1),ny=cl((e.clientY-r.top)/r.height*2-1,-1,1);
          s.gx=(nx+1)*50;s.gy=(ny+1)*50;RX.t=-ny*TILT;RY.t=nx*TILT;G.t=1;UP.t=-3;s.hover=true;wake(c);},
        out(){s.hover=false;RX.t=RY.t=0;G.t=0;UP.t=0;LIFT.t=1;wake(c);},
        press(v){LIFT.t=v?.97:1;if(!v)LIFT.v+=1.5;wake(c);},
        frame(dt){[RX,RY,G,LIFT,UP].forEach(x=>step(x,dt));},
        render(){
          card.style.transform='perspective(700px) translateY('+UP.x.toFixed(2)+'px) rotateX('+RX.x.toFixed(3)+'deg) rotateY('+RY.x.toFixed(3)+'deg) scale('+LIFT.x.toFixed(4)+')';
          const ox=RY.x/TILT,oy=-RX.x/TILT;
          layers.forEach(([el,d])=>{el.style.translate=(ox*DEPTH*d).toFixed(2)+'px '+(oy*DEPTH*d).toFixed(2)+'px';});
          gl.style.opacity=cl(G.x,0,1).toFixed(3);gl.style.setProperty('--gx',(s.hover?s.gx:50+ox*30).toFixed(1)+'%');gl.style.setProperty('--gy',(s.hover?s.gy:30+oy*30).toFixed(1)+'%');},
        busy(){return s.hover||!still([RX,RY,G,LIFT,UP],.003);}};
      return c;}
    tg.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)(c||make()).set(e);});
    tg.addEventListener('pointerleave',()=>{if(c)c.out();});
    tg.addEventListener('pointerdown',e=>{(c||make()).set(e);c.press(true);});
    addEventListener('pointerup',()=>{if(c){c.press(false);if(!fine.matches)c.out();}});
    addEventListener('pointercancel',()=>{if(c&&!fine.matches)c.out();});
  });
})();

/* ── 3) Owlight 모니터 = Glass lens. 화면(.mac) 속 그림·메뉴 막대·시계를 세 벌 겹쳐(가장자리일수록 조금 더 키움) 볼록 렌즈처럼 ── */
(function(){
  const mac=document.querySelector('.o-owl .mac'),ch=document.getElementById('c1');if(!mac||!ch)return;
  const lens=document.createElement('div');lens.className='lens';lens.setAttribute('aria-hidden','true');
  const view=document.createElement('div');view.className='lens-view';
  const glass=document.createElement('div');glass.className='lens-glass';
  lens.append(view,glass);
  const kids=[...mac.children];
  const BEND=[1,1.05,1.12];
  const copies=BEND.map((b,i)=>{const layer=document.createElement('div');layer.className='layer l'+i;const c=document.createElement('div');c.className='lc';
    kids.forEach(k=>{const n=k.cloneNode(true);n.removeAttribute('id');n.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));n.querySelectorAll('img').forEach(im=>{im.alt='';im.loading='eager';});c.appendChild(n);});
    layer.appendChild(c);view.appendChild(layer);return{c,b};});
  mac.appendChild(lens);
  // 바탕화면 두 장이 바뀌는 것(home.js wallCycle)과 천천히 다가가는 움직임(kb)을 렌즈 속 사본에도 맞춘다
  const oimg=[...mac.querySelectorAll(':scope > .wall img')];
  const cimg=copies.map(({c})=>[...c.querySelectorAll('.wall img')]);
  function sync(){oimg.forEach((o,i)=>{const on=o.classList.contains('on');cimg.forEach(set=>{const c=set[i];if(!c)return;c.classList.toggle('on',on);
    try{const a=o.getAnimations()[0],b=c.getAnimations()[0];if(a&&b&&a.currentTime!=null)b.currentTime=a.currentTime;}catch(e){}});});}
  oimg.forEach(o=>new MutationObserver(sync).observe(o,{attributes:true,attributeFilter:['class']}));
  let LS=128,W=0,H=0;
  const X=Sp(0,180,17),Y=Sp(0,180,17),Z=Sp(1.7,260,26);
  let px=null,py=null,lastP=-1e9,clock=0,on=false,first=true;
  function size(){W=mac.offsetWidth;H=mac.offsetHeight;LS=Math.round(cl(W*.26,84,150));lens.style.width=lens.style.height=LS+'px';
    copies.forEach(({c})=>{c.style.width=W+'px';c.style.height=H+'px';});}
  const loc=e=>{const r=mac.getBoundingClientRect(),k=W/(r.width||1);return[(e.clientX-r.left)*k,(e.clientY-r.top)*k];};
  const drift=t=>{const a=t*.42;return[W*(.5+.36*Math.cos(a)),H*(.5-.34*Math.cos(a)+.12*Math.sin(a))];};   // 메뉴 막대(오른쪽 위) ↔ 시계(왼쪽 아래)를 오감
  mac.addEventListener('pointermove',e=>{if(!on)return;[px,py]=loc(e);lastP=performance.now();wake(comp);});
  mac.addEventListener('pointerleave',()=>{px=null;});
  mac.addEventListener('pointerdown',e=>{if(!on)return;[px,py]=loc(e);lastP=performance.now();Z.t=2.4;wake(comp);});
  addEventListener('pointerup',()=>{Z.t=1.7;if(!fine.matches)px=null;});
  function show(v){if(v===on)return;on=v;lens.classList.toggle('on',v);
    if(v){size();sync();if(first){first=false;const[a,b]=drift(clock);X.x=X.t=a;Y.x=Y.t=b;}wake(comp);}}
  new MutationObserver(()=>show(ch.classList.contains('on'))).observe(ch,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',()=>{if(on)size();});
  const comp={
    frame(dt){clock+=dt;const idle=px===null||performance.now()-lastP>2500;
      if(idle){if(reduce){X.t=W*.86;Y.t=H*.2;}else[X.t,Y.t]=drift(clock);}else{X.t=px;Y.t=py;}
      step(X,dt);step(Y,dt);step(Z,dt);},
    render(){const x=X.x,y=Y.x,tilt=cl(X.v/220,-6,6);
      lens.style.transform='translate('+(x-LS/2).toFixed(2)+'px,'+(y-LS/2).toFixed(2)+'px) rotate('+tilt.toFixed(2)+'deg)';
      const o=(x).toFixed(2)+'px '+(y).toFixed(2)+'px',ox=-(x-LS/2),oy=-(y-LS/2);
      copies.forEach(({c,b})=>{c.style.transformOrigin=o;c.style.transform='translate('+ox.toFixed(2)+'px,'+oy.toFixed(2)+'px) scale('+(Z.x*b).toFixed(4)+')';});
      view.style.transform='rotate('+(-tilt).toFixed(2)+'deg)';},
    busy(){return on||!still([X,Y,Z],.05);}};
})();

/* ── 4) 주 단추 = Magnetic button(끌림 반경: 단추 반 폭 + 46px). PC 마우스만, 동작 줄이기면 안 씀 ── */
(function(){
  if(reduce)return;
  const els=[...document.querySelectorAll('.plate .btn, .nav .go, #copy')];if(!els.length)return;
  const ms=els.map(el=>{const lb=document.createElement('span');lb.className='mg-l';while(el.firstChild)lb.appendChild(el.firstChild);el.appendChild(lb);el.classList.add('mg');
    return{el,lb,bx:Sp(0,170,13),by:Sp(0,170,13),lx:Sp(0,220,15),ly:Sp(0,220,15),sc:Sp(1,400,18),press:false};});
  let px=-1e4,py=-1e4;
  const MX=12,MY=8;   // 원본은 홀로 선 단추라 30px 가까이 끌려가지만, 여기 단추는 옆 단추·메일 칸과 붙어 있어 가로 12·세로 8px까지만
  const live=m=>{const c=m.el.closest('.ch');return !c||c.classList.contains('on');};
  function aim(){ms.forEach(m=>{const r=m.el.getBoundingClientRect();
    if(!r.width||!live(m)){m.bx.t=m.by.t=m.lx.t=m.ly.t=0;if(!m.press)m.sc.t=1;return;}
    // 지금 끌려가 있는 만큼을 빼고 원래 자리 가운데에서 잰다
    const cx=r.left+r.width/2-m.bx.x,cy=r.top+r.height/2-m.by.x,dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy),R=r.width/2+46,pull=d<R?1-d/R*.35:0;
    const pv=m.el.previousElementSibling,nx=m.el.nextElementSibling,ol=r.left-m.bx.x,orr=r.right-m.bx.x;   // 옆 단추 쪽으로는 사이 틈만큼만(옆 단추를 덮지 않게)
    const capL=pv?Math.min(MX,Math.max(0,ol-pv.getBoundingClientRect().right-2)):MX,capR=nx?Math.min(MX,Math.max(0,nx.getBoundingClientRect().left-orr-2)):MX;
    m.bx.t=cl(dx*.32*pull,-capL,capR);m.by.t=cl(dy*.38*pull,-MY,MY);m.lx.t=cl(dx*.14*pull,-5,5);m.ly.t=cl(dy*.18*pull,-4,4);if(!m.press)m.sc.t=1+.06*pull;});}
  const comp={
    frame(dt){ms.forEach(m=>[m.bx,m.by,m.lx,m.ly,m.sc].forEach(s=>step(s,dt)));},
    render(){ms.forEach(m=>{const z=still([m.bx,m.by,m.sc],.01)&&Math.abs(m.bx.x)<.05&&Math.abs(m.by.x)<.05&&Math.abs(m.sc.x-1)<.001;
      m.el.style.transform=z?'':'translate('+m.bx.x.toFixed(2)+'px,'+m.by.x.toFixed(2)+'px) scale('+m.sc.x.toFixed(4)+')';
      m.lb.style.transform=z?'':'translate('+m.lx.x.toFixed(2)+'px,'+m.ly.x.toFixed(2)+'px)';});},
    busy(){return ms.some(m=>!still([m.bx,m.by,m.lx,m.ly,m.sc],.01));}};
  addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!fine.matches)return;px=e.clientX;py=e.clientY;aim();wake(comp);},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{px=py=-1e4;aim();wake(comp);});
  addEventListener('scroll',()=>{if(px>-1e4){aim();wake(comp);}},{passive:true});
  ms.forEach(m=>{m.el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;m.press=true;m.sc.t=.94;wake(comp);});
    m.el.addEventListener('pointerup',()=>{if(!m.press)return;m.press=false;m.sc.t=1;m.sc.v=3;wake(comp);});
    m.el.addEventListener('pointerleave',()=>{if(m.press){m.press=false;m.sc.t=1;wake(comp);}});});
})();

/* ── 5) 문 밖 = Pull cord. 밧줄은 무게 있는 점 12개를 길이로 묶은 것. 잡으면 줄이 팽팽할 때까지 따라오고 그 너머론 고무처럼 늘며 등을 끌어당김.
   22px 넘게 늘이면 딸깍: 불이 꺼지며 어둠이 전구에서 둥글게 번진다. 「불은 늘 켜 둘게요」라서 1.4초 뒤 스스로 다시 켜짐. 화면에 처음 보이면 한 번 살짝 당겨 보임(안 꺼질 만큼) ── */
(function(){
  const exit=document.querySelector('.exit');if(!exit)return;
  const box=document.createElement('div');box.className='cord';
  box.innerHTML='<svg class="rope" aria-hidden="true"><path/></svg><div class="lamp" aria-hidden="true"><div class="head"><i class="glow"></i><i class="bulb"></i><i class="shade"></i><i class="cap"></i></div></div><svg class="rope" aria-hidden="true"><path/></svg><i class="bead" aria-hidden="true"></i>'
    +'<button class="grab" type="button" role="switch" aria-checked="true" aria-label="등 줄 당기기(불 끄고 켜기)"></button><span class="cord-say" role="status" aria-live="polite"></span>';
  const dark=document.createElement('div');dark.className='dark';dark.setAttribute('aria-hidden','true');
  exit.append(dark,box);
  const q=s=>box.querySelector(s),grab=q('.grab'),say=q('.cord-say');
  const o={lamp:q('.lamp'),wire:q('.rope path'),head:q('.head'),bulb:q('.bulb'),glow:q('.glow'),path:q('.rope + .lamp ~ .rope path'),bead:q('.bead')};
  const AX=34,AY=63,N=12,CLICK=22,MAXS=54;   // 원본: 전선 122, 갓 66, 밧줄 9×12. 여기선 문구·메일 칸에 안 닿게 PC 전선 96, 폰(0.7배) 전선 50·밧줄 6×12
  let WIRE=96,SEG=9,L=N*SEG;
  const TH=Sp(0,46,3),TUG=Sp(0,300,13),R=Sp(0,120,21),BP=Sp(1,420,13),HX=Sp(0,210,22),HY=Sp(0,210,22),K=Sp(1,300,17);
  let lit=true,armed=true,held=null,ghost=null,stretch=0,lean=0,W=0,k=1,back=0,sayT=0,touched=false;
  const pts=[];
  const anchor=()=>{const c=Math.cos(TH.x),s=Math.sin(TH.x),y=WIRE+TUG.x+AY;return[W/2+AX*c-y*s,AX*s+y*c];};
  const bulbAt=()=>{const c=Math.cos(TH.x),s=Math.sin(TH.x),y=WIRE+TUG.x+63;return[W/2-y*s,y*c];};
  function measure(){W=box.offsetWidth;const r=box.getBoundingClientRect();k=r.width/(W||1);
    const wide=innerWidth>=860,sg=wide?9:6;if(sg!==SEG){SEG=sg;L=N*SEG;WIRE=wide?96:50;pts.length=0;}
    if(!pts.length){const[ax,ay]=anchor();for(let i=0;i<=N;i++)pts.push({x:ax,y:ay+i*SEG,vx:0,vy:0});}}
  measure();
  function tell(t){say.textContent=t;say.classList.toggle('on',!!t);clearTimeout(sayT);if(t)sayT=setTimeout(()=>{say.classList.remove('on');},2600);}
  function flip(to){if(to===lit)return;lit=to;grab.setAttribute('aria-checked',String(lit));BP.x=lit?1.35:.8;TUG.v+=150;exit.classList.toggle('lights-off',!lit);
    clearTimeout(back);
    if(!lit){tell('');back=setTimeout(()=>{pull(true);},1400);}else if(touched)tell('다시 켜 뒀어요');
    wake(comp);}
  // 잡는 손이 없을 때 당기는 손: soft = 안 꺼질 만큼 살짝(힌트), 아니면 딸깍까지
  function pull(hard){if(held)return;const b=pts[N],[ax,ay]=anchor();
    ghost={hard};armed=true;HX.x=b.x;HY.x=b.y;HX.v=b.vx;HY.v=b.vy;HX.t=ax+(hard?-26:18);HY.t=ay+L+(hard?64:14);
    setTimeout(()=>{ghost=null;wake(comp);},hard?1100:700);wake(comp);}
  const local=e=>{const r=box.getBoundingClientRect();return[(e.clientX-r.left)/k,(e.clientY-r.top)/k];};
  grab.addEventListener('pointerdown',e=>{measure();const[x,y]=local(e),b=pts[N];
    held={id:e.pointerId,x:b.x,y:b.y,ox:b.x-x,oy:b.y-y,moved:0,sx:x,sy:y,flipped:false};ghost=null;armed=true;touched=true;box.classList.add('touched');
    try{grab.setPointerCapture(e.pointerId);}catch(err){}grab.classList.add('is-held');wake(comp);});
  grab.addEventListener('pointermove',e=>{if(!held||e.pointerId!==held.id)return;const[x,y]=local(e);
    held.x=x+held.ox;held.y=y+held.oy;held.moved=Math.max(held.moved,Math.hypot(x-held.sx,y-held.sy));wake(comp);});
  function drop(e){if(!held||e.pointerId!==held.id)return;const tap=held.moved<5&&!held.flipped&&e.type==='pointerup';
    held=null;grab.classList.remove('is-held');if(tap)pull(true);wake(comp);}
  grab.addEventListener('pointerup',drop);grab.addEventListener('pointercancel',drop);
  grab.addEventListener('click',e=>{if(!e.detail){touched=true;box.classList.add('touched');pull(true);}});   // 키보드 Enter·Space
  // 손가락으로 줄을 끌 때 화면이 같이 내려가지 않게(walk.js 손가락 듣기보다 먼저 막음)
  grab.addEventListener('touchmove',e=>{if(held&&e.cancelable)e.preventDefault();},{passive:false});
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){io.disconnect();measure();if(!reduce)setTimeout(()=>{if(!touched)pull(false);},500);}},{threshold:.5});io.observe(box);}
  addEventListener('resize',()=>{measure();wake(comp);});
  const comp={
    frame(dt){
      [TH,TUG,R,BP,HX,HY,K].forEach(s=>step(s,dt));if(dt<=0)return;
      const[ax,ay]=anchor(),p=held?[held.x,held.y]:ghost?[HX.x,HY.x]:null,b=pts[N];
      let px=0,py=0;stretch=0;lean=0;
      if(p){const dx=p[0]-ax,dy=p[1]-ay,d=Math.hypot(dx,dy)||1,over=Math.max(0,d-L),give=MAXS*(1-Math.exp(-over/70)),r=Math.min(d,L)+give;
        px=ax+dx/d*r;py=ay+dy/d*r;stretch=give;lean=over>0?dx/d:0;
        if(over>0){K.x=K.t=r/L;K.v=0;}
        if(armed&&give>CLICK&&(held||ghost.hard)){armed=false;flip(!lit);if(held)held.flipped=true;else setTimeout(()=>{ghost=null;},120);}}
      if(!p||!stretch)K.t=1;
      const seg=SEG*Math.max(1,K.x);TUG.t=stretch*.22;TH.t=cl(-lean*stretch/MAXS*.5,-.3,.3);
      const prev=pts.map(q=>[q.x,q.y]);
      for(let i=1;i<=N;i++){const q=pts[i],f=Math.exp(-(i===N?1.1:2.4)*dt);q.vy+=2600*dt;q.vx*=f;q.vy*=f;
        const sp=Math.hypot(q.vx,q.vy);if(sp>2600){q.vx*=2600/sp;q.vy*=2600/sp;}q.x+=q.vx*dt;q.y+=q.vy*dt;}
      for(let it=0;it<8;it++){pts[0].x=ax;pts[0].y=ay;if(p){b.x=px;b.y=py;}
        for(let i=0;i<N;i++){const a=pts[i],c=pts[i+1],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||1e-6,f=(d-seg)/d*.5;
          const wa=i===0?0:1,wc=i+1===N?(p?0:.3):1,sum=wa+wc||1;
          a.x+=dx*f*wa/sum*2;a.y+=dy*f*wa/sum*2;c.x-=dx*f*wc/sum*2;c.y-=dy*f*wc/sum*2;}}
      pts[0].x=ax;pts[0].y=ay;if(p){b.x=px;b.y=py;}
      for(let i=1;i<=N;i++){pts[i].vx=(pts[i].x-prev[i][0])/dt;pts[i].vy=(pts[i].y-prev[i][1])/dt;}
      R.t=lit?0:1;if(lit)tune(R,170,27);else tune(R,120,21);},   // 어둠은 넓게 번지고, 다시 켜질 땐 조금 빨리 전구로 빨려 들어감
    render(){
      const th=TH.x,tug=TUG.x,b=pts[N],e=pts[N-1];
      let d='M'+pts[0].x.toFixed(1)+' '+pts[0].y.toFixed(1);
      for(let i=1;i<N;i++)d+='Q'+pts[i].x.toFixed(1)+' '+pts[i].y.toFixed(1)+' '+((pts[i].x+pts[i+1].x)/2).toFixed(1)+' '+((pts[i].y+pts[i+1].y)/2).toFixed(1);
      d+='L'+b.x.toFixed(1)+' '+b.y.toFixed(1);
      const ang=Math.atan2(e.x-b.x,b.y-e.y),wl=WIRE+tug-4;
      o.lamp.style.transform='rotate('+th.toFixed(4)+'rad)';
      o.wire.setAttribute('d','M'+(W/2).toFixed(1)+' -4L'+(W/2-Math.sin(th)*wl).toFixed(2)+' '+(Math.cos(th)*wl).toFixed(2));
      o.head.style.transform='translateY('+(WIRE+tug).toFixed(2)+'px)';o.bulb.style.transform='scale('+BP.x.toFixed(4)+')';
      o.path.setAttribute('d',d);o.bead.style.transform='translate('+b.x.toFixed(2)+'px,'+b.y.toFixed(2)+'px) rotate('+ang.toFixed(4)+'rad)';
      grab.style.transform='translate('+b.x.toFixed(2)+'px,'+b.y.toFixed(2)+'px)';
      say.style.transform='translate('+(b.x).toFixed(1)+'px,'+(b.y+34).toFixed(1)+'px)';
      // 어둠: 전구에서 둥글게, 이 칸의 가장 먼 모서리를 넘을 만큼
      const er=exit.getBoundingClientRect(),br=box.getBoundingClientRect(),[bx0,by0]=bulbAt(),bx=br.left-er.left+bx0*k,by=br.top-er.top+by0*k,
        far=Math.hypot(Math.max(bx,er.width-bx),Math.max(by,er.height-by))+24,r=Math.max(0,R.x)*far;
      dark.style.visibility=r<4?'hidden':'visible';dark.style.clipPath='circle('+r.toFixed(1)+'px at '+bx.toFixed(1)+'px '+by.toFixed(1)+'px)';
      o.glow.style.opacity=cl(1-R.x,0,1).toFixed(3);},
    busy(){if(held||ghost||!still([TH,TUG,R,BP,K],.002))return true;return pts.some(q=>Math.abs(q.vx)+Math.abs(q.vy)>2);}};
  wake(comp);
})();
})();
