/* 루멘랩 한국어 홈 「창 안으로」 움직임(라이브러리 없음). 틀: My-site-private reports/lumenlab/2026-11-19-홈-디자인-틀.md
   1) 공통: 메일 복사, 맥 시계(지금 시각), Owlight 바탕화면 바꾸기
   2) 거리 장면 #scene (캔버스, 2026-11-10 시안 그대로): 밤 거리·작업실 건물·이웃 창·젖은 길. 누르면 이웃 창에 불이 번진다
   3) 작업실 안 #room (캔버스): 창 밖은 방금 그 거리, 매단 등 셋, 선반, 작업대
   4) 내리는 만큼: 0~1.15화면 = 진열창 속으로 들어감, 1.3~5.1화면 = 작업대 위 작품 넷(장 알약), 걸이판 꼬리표 흔들림
   5) 언어 띠(브라우저가 한국어가 아니면 첫 화면 아래에 영어판 안내, 자동 이동 없음), #works·#games 같은 옛 주소 조각은 그 장으로
   캔버스 둘은 보이는 쪽만 그린다(__scenePaused·__roomPaused), 화면 배율은 최대 2. 영상은 그 장일 때만 돈다. */
(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cb=document.getElementById('copy');
if(cb)cb.addEventListener('click',function(){const b=this,t=document.getElementById('addr');
  function sel(){const r=document.createRange();r.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='선택했어요';}
  try{navigator.clipboard.writeText(t.textContent).then(()=>{b.textContent='복사했어요';},sel);}catch(e){sel();}});
const days='일월화수목금토';
function tick(){const d=new Date();let h=d.getHours();const ap=h<12?'오전':'오후';h=h%12||12;const m=String(d.getMinutes()).padStart(2,'0');const ds=(d.getMonth()+1)+'월 '+d.getDate()+'일 ';
  document.querySelectorAll('[data-clock]').forEach(el=>{el.querySelector('small').textContent=ap;el.querySelector('b').textContent=h+':'+m;el.querySelector('span').textContent=ds+days[d.getDay()]+'요일';});
  document.querySelectorAll('[data-bartime]').forEach(el=>el.textContent=ds+'('+days[d.getDay()]+') '+ap+' '+h+':'+m);}
tick();setInterval(tick,15000);
window.wallCycle=function(root){const imgs=[...root.querySelectorAll('.wall img')];let i=0,id=0;if(imgs[0])imgs[0].classList.add('on');
  return{start(){if(id||reduce||imgs.length<2)return;id=setInterval(()=>{imgs[i].classList.remove('on');i=(i+1)%imgs.length;imgs[i].classList.add('on');},5200);},stop(){clearInterval(id);id=0;}};};
})();
