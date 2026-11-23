(function(){
/* 내리는 만큼 움직이는 것(틀 문서 4절 수식 그대로). u = 고정 장면 칸을 몇 화면 내렸나 */
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const walk=document.getElementById('walk')||document.querySelector('.walk'),pin=document.getElementById('hero'),cv=document.getElementById('scene'),room=document.getElementById('room'),
 flash=pin.querySelector('.flash'),say=pin.querySelector('.say'),low=document.getElementById('low'),stage=document.getElementById('stage'),
 chaps=stage.querySelector('.chaps'),pills=[...chaps.querySelectorAll('button')],chs=[...stage.querySelectorAll('.ch')],objs=chs.map(c=>c.querySelector('.obj')),plates=chs.map(c=>c.querySelector('.plate')),
 nav=document.getElementById('nav'),vid=stage.querySelector('video'),pop=document.getElementById('pop'),icon=document.getElementById('owlIcon'),owlObj=chs[1].querySelector('.obj'),
 chips=[...stage.querySelectorAll('.o-set .chip')],wall=window.wallCycle(owlObj);
/* 작품 넷은 옆으로 넘긴다(11-24 사용자 「단추들 내려갈때 내려가는거 말고 이거 왼쪽오른쪽으로 스와이프하는걸로 해볼까? pc나 모바일이나 둘다, 알약줄 모션이랑도 일관성」).
   내리기(세로)는 거리 → 창 안 → 작업대(작품 한 자리) → 걸이판 그대로이고, 작업대 위에서 몇 번째 작품인지(HB.x, 0~3 실수)는 따로 스프링으로 움직인다.
   넘기는 길: 손가락·마우스로 옆으로 끌기(따라오다 놓으면 한 작품), 트랙패드 옆 밀기(한 손짓에 한 작품), ← → 키, 양옆 화살표, 장 알약 */
const X0=1.3,END=2.1,N=4;
const HB={x:0,v:0,t:0},HK=280,HC=22;   // 디자인북마크 tokens.css 'settle'(280 22): 닿을 때 살짝 지나쳤다 돌아옴 = 알약(Rubber dock)과 같은 출렁임
let hp=null,hSup=false,t1=null,t2=null,loLast=0,peeked=false,peekT=0,hraf=0,hlast=0;
const nvs=[...stage.querySelectorAll('.nv')];
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
  // 지금 작품이 아래 90px에서 제자리로 올라오며(.93→1) 들어오고, 옆 작품은 화면 폭만큼 옆에 비켜 있다. 끌거나 넘기면 HB.x 만큼 같이 옆으로
  // 앞판 글은 가운데 작품 것만: 두 작품 사이 절반(|d| .45)에서 앞 글이 다 빠지고 다음 글이 들어옴(두 장 글이 같이 보이지 않게, 11-19 제3자 평가)
  const hx=HB.x,ein=cl((u-(X0-.24))/.22),pe=cl((u-(X0-.2))/.2),now=performance.now(),sh=W>=860?Math.min(W*.5,720):W*.86,
    near=u>1.15&&Math.abs(u-STOP[1])<.12&&!ride;
  pin.classList.toggle('hz',near);
  const act=u>=X0-.1?cl(Math.round(hx),0,N-1):-1;
  for(let k=0;k<N;k++){const d=k-hx,ad=Math.abs(d);
    const vis=ein*(reduce?cl(1-ad*2):cl(1-ad*1.05)),vp=pe*cl(1-ad/.45);
    const ty=reduce?0:(1-sm(ein))*90,sc=reduce?1:(.93+.07*sm(ein))*(1-.07*Math.min(1,ad)),tx=reduce?0:d*sh;
    objs[k].style.opacity=vis.toFixed(3);objs[k].style.transform='translate('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px) scale('+sc.toFixed(3)+')';
    plates[k].style.opacity=vp.toFixed(3);plates[k].style.transform=reduce?'none':'translate('+(d*70).toFixed(1)+'px,'+((1-sm(pe))*36).toFixed(1)+'px)';
    chs[k].classList.toggle('on',k===act&&vp>.5);chs[k].style.visibility=vis<.01&&vp<.01?'hidden':'';
    pills[k].querySelector('b').style.width=k===act?'100%':'0%';}
  if(act!==lastAct){pills.forEach((p,k)=>{if(k===act)p.setAttribute('aria-current','true');else p.removeAttribute('aria-current');});lastAct=act;}
  const co=cl((u-1.1)/.2);nvs.forEach(b=>{const dis=act<0||(b.classList.contains('prev')?act<=0:act>=N-1);b.disabled=dis;b.style.opacity=(co*(dis?.28:1)).toFixed(3);b.style.visibility=u<1.1?'hidden':'visible';});
  // Owlight: 그 작품이 가운데 오면 메뉴 막대 아이콘에서 패널이 작게 시작해 커지며 튀어나옴(0.45초 .06→1). 옆으로 다 비켜나면 다시 접힘
  const f1=Math.abs(1-hx);if(ein>.9&&f1<.5){if(t1===null)t1=now;}else if(f1>.95||ein<.5)t1=null;
  const lo=reduce?1:t1!==null?sm(cl((now-t1-60)/450)):(f1>.95||ein<.5?0:loLast),sc2=.06+.94*lo;loLast=lo;
  pop.style.opacity=cl(lo*4).toFixed(3);pop.style.transform='translate('+(P.x*(1-lo)).toFixed(1)+'px,'+(P.y*(1-lo)).toFixed(1)+'px) scale('+sc2.toFixed(3)+')';
  // 세트노트: 가운데 오면 기록 조각 셋이 0.22초마다 하나씩
  const f2=Math.abs(2-hx);if(ein>.9&&f2<.5){if(t2===null)t2=now;}else if(f2>.95||ein<.5)t2=null;
  if(t2!==null)chips.forEach((c,i)=>c.classList.toggle('on',reduce||now-t2>120+i*220));else if(f2>.95||ein<.5)chips.forEach(c=>c.classList.remove('on'));
  // 영상은 다가오면 받기 시작하고, 이 작품이 가운데일 때만 돈다. 바탕화면도 Owlight 가 가운데일 때만 바뀐다
  if(vid){if(!vidReady&&u>.45){vidReady=true;vid.preload='auto';try{vid.load();}catch(e){}}
    if(act===0&&u<END+.6&&Math.abs(hx)<.5){if(vid.paused&&!reduce)vid.play().catch(()=>{});}else if(!vid.paused)vid.pause();}
  if(act===1&&f1<.6)wall.start();else wall.stop();
  if(pending())hKick();
  // 처음 작업대에 서면 한 번, 다음 작품이 오른쪽에서 살짝 비쳤다 돌아감(옆으로 넘어간다는 표시)
  if(near&&!peeked&&!reduce&&act===0&&!hp&&HB.t===0&&Math.abs(hx)<.01&&Math.abs(HB.v)<.01){peeked=true;clearTimeout(peekT);
    peekT=setTimeout(()=>{if(hp||HB.t!==0||!benchLive())return;HB.t=.17;hKick();peekT=setTimeout(()=>{if(HB.t===.17){HB.t=0;hKick();}},430);},700);}
}
function pending(){const n=performance.now();return (t1!==null&&n-t1<620)||(t2!==null&&n-t2<760);}
/* 작업대 위 옆 넘기기: 스프링을 4번 나눠 밟고(원본 motion.js), 다 서고 패널·조각도 다 뜨면 rAF 를 멈춤 */
function hstep(now){hraf=0;const dt=hlast?Math.min((now-hlast)/1000,1/30):1/60;hlast=now;
  if(!(hp&&hp.live)){for(let i=0;i<4;i++){const a=-HK*(HB.x-HB.t)-HC*HB.v;HB.v+=a*dt/4;HB.x+=HB.v*dt/4;}
    if(Math.abs(HB.x-HB.t)<.0006&&Math.abs(HB.v)<.006){HB.x=HB.t;HB.v=0;}}
  update();
  if((hp&&hp.live)||HB.x!==HB.t||HB.v||pending())hraf=requestAnimationFrame(hstep);else hlast=0;}
function hKick(){if(!hraf){hlast=0;hraf=requestAnimationFrame(hstep);}}
function peekStop(){clearTimeout(peekT);peeked=true;if(HB.t===.17)HB.t=0;}
function hGo(k,instant){k=cl(Math.round(k),0,N-1);peekStop();HB.t=k;if(instant||reduce){HB.x=k;HB.v=0;}hKick();}
window.BENCH={go:hGo,at:()=>HB.x,set:x=>{peekStop();HB.x=HB.t=x;HB.v=0;update();}};   // check.py 가 씀(set = 두 작품 사이에 세워 두고 보기)
function req(){if(!ticking){ticking=true;requestAnimationFrame(update);}}
addEventListener('resize',()=>{geo();req();});
addEventListener('scene:built',()=>{geo();update();});

/* 손가락 한 번 = 작품 하나(디자인-방법 249). 위 장면은 스크롤 위치에 묶여 있어서, 그대로 두면 폰에서 한 번 튕길 때 작품 넷이 1초 안에 다 지나간다
   (사용자 11-20 「모바일에서 보면 화면이 수루룩 넘어가서 각각의 앱들이 인식이 잘 안 됨」). 그래서 이 칸 안에서 손가락으로 한 번 밀면
   정해진 빠르기로 다음 멈춤 자리까지 가서 선다. 가는 중에 같은 쪽으로 또 밀면 빨리(2배씩, 4배까지), 반대쪽이면 되돌아감. 동작 줄이기면 그냥 스크롤.
   PC 휠·트랙패드는 아래 '턱'(onWheel) 참고. 키는 브라우저 그대로.
   멈춤 자리: 첫 화면(u 0) → 작품마다 X+.45(들어오는 움직임·Owlight 패널·기록 조각 셋이 다 끝난 자리) → 마지막 다음은 칸 끝(걸이판이 화면 맨 위) */
const STOP=[0,X0+.45],D=document.documentElement,fine=matchMedia('(hover: hover) and (pointer: fine)');
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
  wHalt();ride={dir:b>a?1:-1,a,b,y:a,t:0,dur,rate:1,sped:now,last:0};
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
  if(hp&&hp.live){if(e.cancelable)e.preventDefault();return;}   // 작업대에서 옆으로 끄는 중
  const dy=e.touches[0].clientY-ty0,dx=e.touches[0].clientX-tx0;
  if(tDone){if(e.cancelable)e.preventDefault();return;}   // 이 손가락은 이미 한 작품을 넘김: 남은 움직임은 버린다
  if(ride){if(e.cancelable)e.preventDefault();if(Math.abs(dy)>10){tDone=true;go(dy<0?1:-1);}return;}
  if(benchLive()&&Math.max(Math.abs(dx),Math.abs(dy))<10)return;   // 작업대 위에선 옆 끌기인지 먼저 봄
  if(Math.abs(dy)<3||Math.abs(dx)>Math.abs(dy))return;
  if(intent(dy<0?1:-1)){tDone=true;hp=null;if(e.cancelable)e.preventDefault();}}
/* PC 휠·트랙패드 = 작품 앞 '턱'. 11-20 #48은 휠을 통째로 붙잡아 한 작품씩 넘겨 뻑뻑했고(사용자 「pc에서 스크롤할 때 스무스하게 안됨」, 트랙패드 관성이 끊김),
   #49는 브라우저 그대로라 이번엔 「너무 저항감이 없거든... 조금만 더 저항감이 있긴해야함」(11-21). 그 사이로:
   이 칸 안에서만 휠 값을 받아 부드럽게 따라가고(매 프레임 남은 거리의 15%, 60fps 기준), 멈춤 자리 ±0.28화면 안에서는 휠이 35%만 먹는다(턱).
   손을 떼고 0.22초 뒤, 가던 쪽 앞에 멈춤 자리가 0.65화면 안이면(두 작품이 겹쳐 바뀌는 구간에 서지 않게) 거기로 미끄러져 붙고, 이번 손짓에 0.12화면 안으로 살짝 지나쳤으면 거기 걸린다.
   손짓을 시작한 자리로 되돌려 끌지는 않는다(scroll-snap처럼 작은 휠이 갇히지 않게).
   첫 화면 위·칸 끝(걸이판) 밑으로는 브라우저 그대로. 손가락 화면·동작 줄이기면 안 씀. CSS scroll-snap(proximity)은 크롬에서 작은 휠이 되돌려져 갇혀서 안 씀 */
let wT=0,wC=0,wRaf=0,wDir=0,wIdle=0,wPrev=0,wStart=0,wEv=0;
function wStep(now){wRaf=0;const dt=wPrev?Math.min(64,now-wPrev):16.7;wPrev=now;const d=wT-wC;
  if(Math.abs(d)<.6){wC=wT;jumpTo(wC);lastY=scrollY;update();wPrev=0;return;}
  wC+=d*(1-Math.pow(.85,dt/16.7));jumpTo(wC);lastY=scrollY;update();wRaf=requestAnimationFrame(wStep);}
function wGo(){if(!wRaf){wPrev=0;wRaf=requestAnimationFrame(wStep);}}
function wHalt(){if(wRaf){cancelAnimationFrame(wRaf);wRaf=0;wPrev=0;}clearTimeout(wIdle);}
function onWheel(e){
  if(!fine.matches||!can()||e.ctrlKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY)||inSheet(e))return;
  if(ride)stop(false);
  const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),a=top0(),z=yExit(),vh=vhNow();
  if(!wRaf)wT=wC=scrollY;
  const t=performance.now();if(t-wEv>220)wStart=wT;wEv=t;   // 손짓 하나의 시작 자리
  if(wT>z+2)return;   // 걸이판 밑: 브라우저 그대로
  if((dy>0&&wT>=z-1)||(dy<0&&wT<=a+1)){if(wRaf)e.preventDefault();return;}   // 칸 끝에서 더 밀면 브라우저에 넘김(따라가는 중이면 다 따라간 뒤)
  e.preventDefault();
  let n=1e9;for(const v of stops())n=Math.min(n,Math.abs(v-wT)/vh);
  // 창 안으로 들어가는 구간(u .4~1.1, 거리가 커지고 방과 겹쳐 바뀜)은 휠이 절반만(11-21 사용자 「처음 내릴 때는 저항감이 거의 없거든... 슈루룩 넘겨져서」)
  const uu=(wT-a)/vh,zf=1-.5*sm(cl((uu-.15)/.25))*(1-sm(cl((uu-1.1)/.15))),f=Math.min(zf,.35+.65*sm(cl((n-.03)/.25)));
  wT=cl(wT+dy*f,a,z);wDir=dy>0?1:-1;wGo();
  clearTimeout(wIdle);wIdle=setTimeout(wSettle,220);}
function wSettle(){if(ride||!fine.matches)return;
  for(const v of stops())if((v-wStart)*(wT-v)>0&&Math.abs(wT-v)/vhNow()<.12){wT=v;wC=scrollY;wGo();return;}   // 이번 손짓에 살짝 지나친 멈춤 자리면 거기 걸림
  const uu=(wT-top0())/vhNow();   // 거리와 방이 겹쳐 흐린 구간(u .86~1.1)엔 서지 않음: 내려가던 중이면 첫 작품까지 정해진 빠르기로(폰과 같은 느낌), 올라가던 중이면 겹치기 전으로
  if(uu>.86&&uu<1.1){if(wDir>0)go(1,yU(STOP[1]));else{wT=yU(.86);wC=scrollY;wGo();}return;}
  const h=nextStop(wT,wDir);if(h!=null&&Math.abs(h-wT)/vhNow()<.65){wT=h;wC=scrollY;wGo();}}
addEventListener('keydown',e=>{
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.altKey&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&stage.classList.contains('live')&&!D.classList.contains('is-sheet')
    &&!(e.target.closest&&e.target.closest('input,textarea,select,dialog,[contenteditable]'))){const u=(scrollY-top0())/vhNow();
    if(u>X0-.1&&u<END+.3){e.preventDefault();hGo(Math.round(HB.t)+(e.key==='ArrowRight'?1:-1));return;}}   // 작업대가 보이면 ← → 로 작품 넘김
  if(/^(Arrow|Page|Home|End| )/.test(e.key)){if(ride)stop(false);wHalt();}});   // 키로 움직이면 브라우저에 넘김
addEventListener('touchmove',()=>{lastIn=performance.now();},{passive:true});
addEventListener('touchend',()=>{lastIn=performance.now();},{passive:true});
// 막을 수 있는(passive 아닌) 손가락 듣기는 이 칸 안(걸이판 맨 위 조금 밑까지)에서만 단다. 그 밑에선 떼어 둬서 브라우저가 기다리지 않고 바로 스크롤
function hold(){const want=!!ride||(can()&&scrollY<=yExit()+40);if(want===grab)return;grab=want;
  (grab?addEventListener:removeEventListener)('touchmove',onTouch,{passive:false});
  (grab?addEventListener:removeEventListener)('wheel',onWheel,{passive:false});}
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href*="#"]');if(a&&!a.hasAttribute('data-go'))free=performance.now()+2500;});   // 다른 # 링크는 브라우저가 옮기는 동안 손대지 않음
addEventListener('mousedown',e=>{if(e.target===D||e.clientX>=D.clientWidth)free=Infinity;});   // 스크롤 막대를 끄는 중
addEventListener('mouseup',()=>{if(free===Infinity)free=0;});
// 손가락 관성으로 칸 안 멈춤 자리 사이에 들어오면(손가락이 막 움직인 뒤에만, 예: 걸이판에서 위로 튕김) 그쪽 다음 멈춤 자리까지
addEventListener('scroll',()=>{const y=scrollY,now=performance.now();
  if(!ride&&can()&&Math.abs(y-lastY)>4&&now-lastIn<3000&&now>free&&y>top0()+2&&y<yExit()-3)go(y>lastY?1:-1);
  lastY=y;hold();if(!ride)req();},{passive:true});
/* 옆으로 끌기(손가락·마우스 같이, pointer 사건). .pin 은 touch-action pan-y 라 옆 움직임은 브라우저가 스크롤로 안 가져감.
   8px 넘게 옆으로(세로의 1.2배) 움직이면 잡고, 작품이 손을 따라옴(폰 화면 폭 80%, PC 42%·620px까지 = 한 작품). 양 끝 밖으론 28%만 따라옴(고무).
   놓으면 손 빠르기 0.16초만큼 더 간 자리에서 가까운 작품, 단 한 손짓에 한 작품까지(디자인-방법 249) */
const benchLive=()=>stage.classList.contains('live')&&!ride&&Math.abs(scrollY-yU(STOP[1]))<vhNow()*.12;
const span=()=>innerWidth>=860?Math.min(innerWidth*.42,620):innerWidth*.8;
const rubH=h=>h<0?h*.28:h>N-1?N-1+(h-N+1)*.28:h;
pin.addEventListener('pointerdown',e=>{if(e.button||!benchLive()||(e.target.closest&&e.target.closest('.chaps,.nv,dialog')))return;
  hp={id:e.pointerId,x0:e.clientX,y0:e.clientY,h0:HB.x,live:false,px:e.clientX,pt:performance.now(),vx:0};});
addEventListener('pointermove',e=>{if(!hp||e.pointerId!==hp.id)return;const dx=e.clientX-hp.x0,dy=e.clientY-hp.y0;
  if(!hp.live){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2&&!ride){peekStop();hp.live=true;hp.x0=e.clientX;hp.h0=HB.x;hp.px=e.clientX;hp.pt=performance.now();pin.classList.add('hdrag');
      try{pin.setPointerCapture(e.pointerId);}catch(err){}hKick();}else if(Math.abs(dy)>12)hp=null;return;}
  const n=performance.now(),dt=Math.max(1,n-hp.pt);hp.vx=hp.vx*.5+((e.clientX-hp.px)/dt)*.5;hp.px=e.clientX;hp.pt=n;
  HB.x=rubH(hp.h0-(e.clientX-hp.x0)/span());HB.v=0;hKick();});
function hEnd(e,cancel){if(!hp||e.pointerId!==hp.id)return;
  if(hp.live){const old=performance.now()-hp.pt>90,v=cancel||old?0:-hp.vx*1000/span(),base=Math.round(hp.h0);
    let k=Math.round(HB.x+v*.16);k=cl(cl(k,base-1,base+1),0,N-1);
    HB.t=k;HB.v=reduce?0:cl(v,-7,7);if(reduce)HB.x=k;pin.classList.remove('hdrag');hSup=true;setTimeout(()=>{hSup=false;},0);hp=null;hKick();return;}
  hp=null;}
addEventListener('pointerup',e=>hEnd(e,false));addEventListener('pointercancel',e=>hEnd(e,true));
document.addEventListener('click',e=>{if(hSup){e.stopPropagation();e.preventDefault();}},true);   // 끌기를 놓을 때 밑에 있던 단추가 눌리지 않게
pin.addEventListener('dragstart',e=>{if(stage.classList.contains('live'))e.preventDefault();});
// 트랙패드 옆 밀기 = 한 손짓에 한 작품: 30px 쌓이면 넘기고, 남은 관성은 버림. 마지막 값에서 0.22초 동안 아무것도 안 오고 작품도 거의 다 넘어갔으면 다음 손짓으로 받음.
// (값 사이 틈으로 재면, 다음 작품 그림을 풀며 화면이 잠깐 버벅인 틈을 새 손짓으로 잘못 봄 → 타이머로 잼: 밀린 입력이 타이머보다 먼저 처리됨). 옆 밀기는 브라우저 '뒤로 가기'로도 안 넘김
let hwAcc=0,hwLock=false,hwT=0;
function hwFree(){if(Math.abs(HB.x-HB.t)>=.08){hwT=setTimeout(hwFree,120);return;}hwLock=false;hwAcc=0;}
pin.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||e.ctrlKey||!benchLive())return;e.preventDefault();
  clearTimeout(hwT);hwT=setTimeout(hwFree,220);if(hwLock)return;hwAcc+=e.deltaX*(e.deltaMode===1?16:1);
  if(Math.abs(hwAcc)>30){hGo(Math.round(HB.t)+(hwAcc>0?1:-1));hwLock=true;hwAcc=0;}},{passive:false});
stage.querySelectorAll('.nv').forEach(b=>b.addEventListener('click',()=>hGo(Math.round(HB.t)+(b.classList.contains('prev')?-1:1))));
// 장 알약·위 막대 '만든 것 보기': 작업대에 서 있으면 옆으로 그 작품까지. 아니면 그 작품을 가운데 놓고 작업대까지 같은 빠르기로(멀면 바로 앞으로 옮겨 놓고 들어오는 것만)
function goChap(k,smooth){const to=yU(STOP[1]),vh=vhNow();
  if(smooth&&can()&&!ride&&Math.abs(scrollY-to)<vh*.15){hGo(k);if(Math.abs(scrollY-to)>2){wHalt();go(scrollY<to?1:-1,to);}return;}
  hGo(k,true);
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
