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
    pills[k].querySelector('b').style.width=(cl((u-a)/(b-a))*100).toFixed(1)+'%';}
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
addEventListener('scroll',req,{passive:true});addEventListener('resize',()=>{geo();req();});
addEventListener('scene:built',()=>{geo();update();});
function goChap(k,smooth){window.scrollTo({top:walk.offsetTop+(X[k]+.24)*pin.clientHeight,behavior:smooth&&!reduce?'smooth':'auto'});}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();goChap(+b.dataset.go,true);}));
// 옛 홈의 주소 조각(#works·#games·#apps, 다른 페이지 머리말의 '만든 것')은 그 장으로. #tools·#g-*·#contact 는 그 칸 그대로
const HASH={works:0,games:0,chickrescue:0,c0:0,apps:1,owlight:1,c1:1,setnote:2,c2:2,next:3,c3:3};
function fromHash(smooth){const k=HASH[location.hash.slice(1)];if(k!==undefined){goChap(k,smooth);return true;}return false;}
addEventListener('hashchange',()=>fromHash(true));
geo();update();
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
