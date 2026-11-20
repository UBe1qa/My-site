(function(){
/* 내리는 만큼 움직이는 것(틀 문서 4절 수식 그대로). u = 고정 장면 칸을 몇 화면 내렸나 */
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const walk=document.getElementById('walk')||document.querySelector('.walk'),pin=document.getElementById('hero'),cv=document.getElementById('scene'),room=document.getElementById('room'),
 flash=pin.querySelector('.flash'),say=pin.querySelector('.say'),low=document.getElementById('low'),stage=document.getElementById('stage'),
 chaps=stage.querySelector('.chaps'),pills=[...chaps.querySelectorAll('button')],chs=[...stage.querySelectorAll('.ch')],objs=chs.map(c=>c.querySelector('.obj')),plates=chs.map(c=>c.querySelector('.plate')),
 nav=document.getElementById('nav'),vid=stage.querySelector('video'),pop=document.getElementById('pop'),icon=document.getElementById('owlIcon'),owlObj=chs[1].querySelector('.obj'),
 chips=[...stage.querySelectorAll('.o-set .chip')],wall=window.wallCycle(owlObj);
const X=[1.3,2.3,3.3,4.3],END=5.1;
let W=0,H=0,cx=0,cy=0,S=5,P={x:0,y:0},ticking=false,vidReady=false,lastAct=-2;
const cl=(v,a,b)=>Math.min(b===undefined?1:b,Math.max(a===undefined?0:a,v)),sm=t=>t*t*(3-2*t),cub=t=>t*t*t;
function offs(el,root){let x=0,y=0;while(el&&el!==root){x+=el.offsetLeft;y+=el.offsetTop;el=el.offsetParent;}return{x,y};}
function geo(){W=pin.clientWidth;H=pin.clientHeight;const G=window.SCENE;if(G&&G.win){cx=G.win.x+G.win.w/2;cy=G.win.y+G.win.h*.55;S=Math.min(6,Math.max(2,W/G.win.w*1.35));}
  const a=offs(icon,owlObj),b={x:pop.offsetLeft+pop.offsetWidth,y:pop.offsetTop};P={x:a.x+icon.offsetWidth/2-b.x,y:a.y+icon.offsetHeight-b.y};}
function update(){ticking=false;
  const vh=pin.clientHeight,r=walk.getBoundingClientRect(),u=cl(-r.top/vh,0,END+1);
  nav.classList.toggle('solid',u>1.1);
  // 1) 거리 → 창 속으로: 배율은 세제곱으로 커지고 진열창 가운데는 화면 가운데로 곧게
  const z=cl(u/1.15),s=1+(S-1)*cub(z),e=sm(z),px=cx+(W/2-cx)*e,py=cy+(H/2-cy)*e;
  cv.style.transform=reduce?'none':'translate('+(px-cx*s).toFixed(1)+'px,'+(py-cy*s).toFixed(1)+'px) scale('+s.toFixed(3)+')';
  cv.style.opacity=(1-cl((u-.9)/.16)).toFixed(3);   // 거리와 방이 겹쳐 흐린 구간을 0.16화면으로(제3자 평가 11-19: 0.3화면은 뭉개져 보임)
  cv.style.visibility=u>1.12?'hidden':'';
  flash.style.opacity=reduce?0:((u<.96?cl((u-.62)/.34):1-cl((u-.96)/.2))*.4).toFixed(3);
  room.style.opacity=cl((u-.88)/.16).toFixed(3);
  const so=1-cl(u/.28);say.style.opacity=low.style.opacity=so.toFixed(3);say.style.transform='translateY('+(-u*50).toFixed(1)+'px)';low.style.visibility=so<.02?'hidden':'';
  window.__scenePaused=u>1.15;window.__roomPaused=u<.72||u>END+.95;
  // 2) 작업대 위 작품 넷: 들어오는 쪽은 아래 90px → 제자리(.93→1), 나가는 쪽은 위로 80px(1→.95). 앞 장 글이 다 빠진 뒤에 다음 장 글이 들어온다
  //    (11-19 제3자 평가: 틀 문서대로 0.44화면 겹치니 두 장의 글·단추가 300px 동안 같이 보이고 보이는 단추와 눌리는 단추가 달랐다)
  //    나가는 쪽 끝 0.2화면 전부터 0.16화면, 다음 작품은 시작 0.08화면 전부터 0.22화면(겹침 0.04), 다음 글은 시작 0.02화면 전부터 0.2화면. 첫 장은 방이 보이자마자(0.24 / 0.2 전)
  stage.classList.toggle('live',u>1.15);chaps.style.opacity=cl((u-1.1)/.2).toFixed(3);chaps.style.visibility=u<1.1?'hidden':'';
  let act=-1;
  for(let k=0;k<4;k++){const a=X[k],b=k<3?X[k+1]:END;
    const ein=cl((u-(k?a-.08:a-.24))/.22),pe=cl((u-(k?a-.02:a-.2))/.2),eout=k<3?cl((u-(b-.2))/.16):0,vis=ein*(1-eout),vp=pe*(1-eout);
    const ty=reduce?0:(1-sm(ein))*90-sm(eout)*80,sc=reduce?1:.93+.07*sm(ein)-.05*sm(eout);
    objs[k].style.opacity=vis.toFixed(3);objs[k].style.transform='translateY('+ty.toFixed(1)+'px) scale('+sc.toFixed(3)+')';
    plates[k].style.opacity=vp.toFixed(3);plates[k].style.transform=reduce?'none':'translateY('+((1-sm(pe))*36-sm(eout)*28).toFixed(1)+'px)';
    chs[k].classList.toggle('on',vp>.5);chs[k].style.visibility=vis<.01&&vp<.01?'hidden':'';
    if(u>=a-.1&&(u<b-.1||k===3))act=k;
    pills[k].querySelector('b').style.width=(cl((u-a+.2)/.65)*100).toFixed(1)+'%';}   // 알약 밑줄: 그 작품 멈춤 자리(X+.45)에 닿으면 다 참
  if(act!==lastAct){pills.forEach((p,k)=>{if(k===act)p.setAttribute('aria-current','true');else p.removeAttribute('aria-current');});lastAct=act;}
  // Owlight: 메뉴 막대 아이콘에서 패널이 작게 시작해 내리는 만큼 커지며 튀어나옴(0.42화면 동안 .06→1)
  const lo=reduce?1:sm(cl((u-X[1]+.02)/.42)),sc2=.06+.94*lo;
  pop.style.opacity=cl(lo*4).toFixed(3);pop.style.transform='translate('+(P.x*(1-lo)).toFixed(1)+'px,'+(P.y*(1-lo)).toFixed(1)+'px) scale('+sc2.toFixed(3)+')';
  // 세트노트: 기록 조각 셋이 0.2화면마다 하나씩
  chips.forEach((c,i)=>c.classList.toggle('on',u>X[2]+.02+i*.2));
  // 영상은 다가오면 받기 시작하고, 이 장일 때만 돈다. 바탕화면도 이 장일 때만 바뀐다
  if(vid){if(!vidReady&&u>.45){vidReady=true;vid.preload='auto';try{vid.load();}catch(e){}}
    if(act===0&&u<X[1]){if(vid.paused&&!reduce)vid.play().catch(()=>{});}else if(!vid.paused)vid.pause();}
  if(act===1)wall.start();else wall.stop();
}
function req(){if(!ticking){ticking=true;requestAnimationFrame(update);}}
addEventListener('resize',()=>{geo();req();});
addEventListener('scene:built',()=>{geo();update();});

/* 손가락 한 번 = 작품 하나(디자인-방법 249). 위 장면은 스크롤 위치에 묶여 있어서, 그대로 두면 폰에서 한 번 튕길 때 작품 넷이 1초 안에 다 지나간다
   (사용자 11-20 「모바일에서 보면 화면이 수루룩 넘어가서 각각의 앱들이 인식이 잘 안 됨」). 그래서 이 칸 안에서 손가락으로 한 번 밀면
   정해진 빠르기로 다음 멈춤 자리까지 가서 선다. 가는 중에 같은 쪽으로 또 밀면 빨리(2배씩, 4배까지), 반대쪽이면 되돌아감. 동작 줄이기면 그냥 스크롤.
   PC 휠·트랙패드·키는 붙잡지 않고 브라우저 스크롤 그대로(사용자 11-20 「pc에서 위로 아래로 스크롤 할때 스무스하게 안됨」: 휠까지 붙잡으니 트랙패드 관성이 끊겼다).
   CSS scroll-snap(proximity)도 시험했으나 크롬에서 휠·트랙패드 작은 움직임이 멈춤 자리로 되돌려져 갇혀서 안 씀.
   멈춤 자리: 첫 화면(u 0) → 작품마다 X+.45(들어오는 움직임·Owlight 패널·기록 조각 셋이 다 끝난 자리) → 마지막 다음은 칸 끝(걸이판이 화면 맨 위) */
const STOP=[0,...X.map(x=>x+.45)],D=document.documentElement,fine=matchMedia('(hover: hover) and (pointer: fine)');
let ride=null,settle=0,setDir=0,qT=0,free=0,lastIn=-1e9,lastY=scrollY,grab=false,rraf=0;
const can=()=>!reduce&&!D.classList.contains('is-sheet'),vhNow=()=>pin.clientHeight,
 top0=()=>walk.offsetTop,yU=u=>top0()+u*vhNow(),yExit=()=>Math.min(top0()+walk.offsetHeight,D.scrollHeight-innerHeight),
 stops=()=>STOP.map(yU).concat(yExit()),ease=t=>.5*sm(t)+.5*(1-(1-t)*(1-t)*(1-t));   // 떠날 땐 바로, 닿을 땐 천천히
function jumpTo(y){const b=D.style.scrollBehavior;D.style.scrollBehavior='auto';scrollTo(0,y);D.style.scrollBehavior=b;}   // site.css 의 부드러운 스크롤을 잠깐 끔
function nextStop(y,dir){const s=stops();if(dir>0){for(const v of s)if(v>y+2)return v;return null;}for(let i=s.length-1;i>=0;i--)if(s[i]<y-2)return s[i];return null;}
function go(dir,to){
  const now=performance.now();
  if(ride&&ride.dir===dir&&to==null){if(now-ride.sped>250){ride.rate=Math.min(4,ride.rate*2);ride.sped=now;}return true;}
  if(!ride&&to==null&&dir===setDir&&now<settle&&nextStop(scrollY,dir)!=null){clearTimeout(qT);qT=setTimeout(()=>go(dir),settle-now);return true;}   // 막 선 작품은 0.3초는 멈춰 보이고 나서 다음으로
  clearTimeout(qT);
  const a=ride?ride.y:scrollY,b=to!=null?to:nextStop(a,dir);
  if(b==null||Math.abs(b-a)<3)return false;
  let span=Math.abs(b-a)/vhNow();if(Math.max(a,b)>yExit()-3)span*=.55;   // 마지막 작품 → 걸이판은 방이 위로 빠지기만 하니 짧게
  let dur=dir>0?300+900*span:220+600*span;if(to!=null)dur=Math.min(dur,2200);   // 한 작품 1.2초, 첫 화면 → 첫 작품(창 안으로 확대) 1.9초, 올라갈 땐 0.8초
  ride={dir:b>a?1:-1,a,b,y:a,t:0,dur,rate:1,sped:now,last:0};
  if(!fine.matches)D.style.overflow='hidden';   // 폰: 손가락 관성을 멈춘다(스크립트 스크롤은 그대로 됨)
  hold();if(!rraf)rraf=requestAnimationFrame(step);return true;
}
function step(now){rraf=0;if(!ride)return;
  const dt=ride.last?Math.min(64,now-ride.last):0;ride.last=now;
  ride.t=Math.min(1,ride.t+dt*ride.rate/ride.dur);ride.y=ride.a+(ride.b-ride.a)*ease(ride.t);
  jumpTo(ride.y);lastY=scrollY;update();
  if(ride.t>=1)stop(true);else rraf=requestAnimationFrame(step);}
function stop(jump){if(!ride)return;const y=ride.b;setDir=ride.dir;settle=performance.now()+300;ride=null;D.style.overflow='';if(jump)jumpTo(y);lastY=scrollY;hold();req();}
function intent(dir){   // 사람이 내리거나 올리려 함: 이 칸 안(첫 화면 ~ 걸이판 맨 위)이면 받아서 true
  if(!can())return false;
  if(ride)return go(dir);
  const y=scrollY,a=top0(),z=yExit();
  if((dir>0&&y<z-2)||(dir<0&&y>a+2&&y<=z+3))return go(dir);
  return false;}
const inSheet=e=>e.target&&e.target.closest&&e.target.closest('dialog');
let ty0=null,tx0=0,tDone=false;
addEventListener('touchstart',e=>{lastIn=performance.now();if(e.touches.length!==1||inSheet(e)){ty0=null;return;}ty0=e.touches[0].clientY;tx0=e.touches[0].clientX;tDone=false;},{passive:true});
function onTouch(e){
  if(ty0===null)return;
  const dy=e.touches[0].clientY-ty0,dx=e.touches[0].clientX-tx0;
  if(tDone){if(e.cancelable)e.preventDefault();return;}   // 이 손가락은 이미 한 작품을 넘김: 남은 움직임은 버린다
  if(ride){if(e.cancelable)e.preventDefault();if(Math.abs(dy)>10){tDone=true;go(dy<0?1:-1);}return;}
  if(Math.abs(dy)<3||Math.abs(dx)>Math.abs(dy))return;
  if(intent(dy<0?1:-1)){tDone=true;if(e.cancelable)e.preventDefault();}}
addEventListener('wheel',()=>{if(ride)stop(false);},{passive:true});   // 알약으로 가는 중에 PC 휠·키를 쓰면 바로 사람한테 넘김
addEventListener('keydown',e=>{if(ride&&/^(Arrow|Page|Home|End| )/.test(e.key))stop(false);});
addEventListener('touchmove',()=>{lastIn=performance.now();},{passive:true});
addEventListener('touchend',()=>{lastIn=performance.now();},{passive:true});
// 막을 수 있는(passive 아닌) 손가락 듣기는 이 칸 안(걸이판 맨 위 조금 밑까지)에서만 단다. 그 밑에선 떼어 둬서 브라우저가 기다리지 않고 바로 스크롤
function hold(){const want=!!ride||(can()&&scrollY<=yExit()+40);if(want===grab)return;grab=want;
  (grab?addEventListener:removeEventListener)('touchmove',onTouch,{passive:false});}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href*="#"]');if(a&&!a.hasAttribute('data-go'))free=performance.now()+2500;});   // 다른 # 링크는 브라우저가 옮기는 동안 손대지 않음
addEventListener('mousedown',e=>{if(e.target===D||e.clientX>=D.clientWidth)free=Infinity;});   // 스크롤 막대를 끄는 중
addEventListener('mouseup',()=>{if(free===Infinity)free=0;});
// 손가락 관성으로 칸 안 멈춤 자리 사이에 들어오면(손가락이 막 움직인 뒤에만, 예: 걸이판에서 위로 튕김) 그쪽 다음 멈춤 자리까지
addEventListener('scroll',()=>{const y=scrollY,now=performance.now();
  if(!ride&&can()&&Math.abs(y-lastY)>4&&now-lastIn<3000&&now>free&&y>top0()+2&&y<yExit()-3)go(y>lastY?1:-1);
  lastY=y;hold();if(!ride)req();},{passive:true});
// 장 알약·위 막대 '만든 것 보기': 그 작품까지 같은 빠르기로. 멀면(작품 둘 넘게, 또는 걸이판 밑에서) 그 작품 바로 앞으로 옮겨 놓고 들어오는 것만 보여 줌
function goChap(k,smooth){const to=yU(STOP[k+1]),vh=vhNow();
  if(!smooth||!can()){stop(false);jumpTo(to);lastY=scrollY;req();return;}
  const y=ride?ride.y:scrollY;
  if(y>to+vh*1.05||to-y>vh*1.8){stop(false);jumpTo(to-vh*.6);lastY=scrollY;update();}
  go(scrollY<to?1:-1,to);}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();goChap(+b.dataset.go,true);}));
// 옛 홈의 주소 조각(#works·#games·#apps, 다른 페이지 머리말의 '만든 것')은 그 장으로. #tools·#g-*·#contact 는 그 칸 그대로
const HASH={works:0,games:0,chickrescue:0,c0:0,apps:1,owlight:1,c1:1,setnote:2,c2:2,next:3,c3:3};
function fromHash(smooth){const k=HASH[location.hash.slice(1)];if(k!==undefined){goChap(k,smooth);return true;}return false;}
addEventListener('hashchange',()=>fromHash(true));
geo();update();hold();
if(location.hash){if('scrollRestoration' in history)history.scrollRestoration='manual';requestAnimationFrame(()=>{fromHash(false);req();});}
// 걸이판: 보일 때 꼬리표가 하나씩 흔들리며 걸림(1.8초, 줄마다 0.05초 늦게)
const tags=[...document.querySelectorAll('.tg')];
if(!reduce&&'IntersectionObserver' in window){const cols=()=>innerWidth>=860?6:2;
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('sw');io.unobserve(en.target);}}),{threshold:.35});
  tags.forEach((t,i)=>{const c=cols();t.style.animationDelay=((i%c)*.08+Math.floor(i/c)*.05).toFixed(2)+'s';io.observe(t);});}
// 언어: 한국어 / 와 영어 /en/ 은 따로 된 페이지. 브라우저 언어가 한국어가 아니면 첫 화면 아래에 작은 띠로 알린다(자동으로 넘기지 않음). lumen:langbar = 고른 언어(다른 페이지와 같은 값)
const other=document.querySelector('a.lang[data-other-lang]');
if(other){const want=/^ko\b/i.test(navigator.language||'')?'ko':'en';let saved=null;const keep=l=>{try{localStorage.setItem('lumen:langbar',l);}catch(e){}};
  try{saved=localStorage.getItem('lumen:langbar');}catch(e){}
  other.addEventListener('click',()=>keep('en'));
  if(want!=='ko'&&saved!=='ko'){const bar=document.createElement('p');bar.className='langbar';bar.lang='en';
    bar.innerHTML='<span>This page is in Korean.</span><a hreflang="en" href="/en/">English version →</a><button type="button" aria-label="Close">×</button>';
    bar.querySelector('a').addEventListener('click',()=>keep('en'));bar.querySelector('button').addEventListener('click',()=>{keep('ko');bar.remove();});
    low.insertBefore(bar,low.firstChild);}}
})();
