/* 루멘랩 홈 첫 화면: 밤거리의 작은 벽돌 건물(전부 canvas 2D, 사진 없음). 홈 첫 칸(section[data-scene])에서만 부른다.
   위에 연필 밑그림 종이(#paper)가 붙어 있고, 문지르면 그 자리부터 완성된 장면(#view)이 드러난다. 60% 닦이면 종이가 걷히고 '불 켜기'.
   불을 켜면 1층 작업실 창에 불(깜빡이며), 간판 글자가 한 자씩, 장면이 살짝 다가가고, 위 막대 로고 점과 아래 작품 칸 빛무리가 켜진다(html.lit, CSS).
   '장면 뼈대'부터 '연필 밑그림'까지는 맛보기(context/reports/lumenlab/2026-11-10-홈-첫화면-맛보기.html)를 숫자 하나 바꾸지 않고 옮겼다
   (바꾼 곳은 손글씨 메모 글 한 군데: 영어판을 위해 글을 HTML의 [data-i18n="sceneMemo"]에서 읽는다). 바꾸려면 홈 디자인 틀 문서를 먼저 고친다.
   '합치기, 움직임'은 이 사이트에 맞게 고쳤다: 페이지 스크롤과 다툼(처음 80ms 세로면 스크롤, 놓으면 관성), 단추 글은 HTML의 두 글 중 하나를 보임,
   window.__sceneCheck = check.py 만 쓰는 확인용 창(맛보기의 __dbg). */
(function(){
const hero=document.querySelector('[data-scene]');
if(!hero)return;
const W=390,H=560,S=Math.min(2,Math.max(1.5,window.devicePixelRatio||1));
const view=hero.querySelector('.hero__view'),paper=hero.querySelector('.hero__paper'),btn=hero.querySelector('.hero__btn'),hint=hero.querySelector('.hint'),root=document.documentElement;
const MEMO=(hero.querySelector('[data-i18n="sceneMemo"]')||{}).textContent||'여기 불, 따뜻하게';
[view,paper].forEach(c=>{c.width=Math.round(W*S);c.height=Math.round(H*S)});
const vx=view.getContext('2d'),px=paper.getContext('2d');
function mk(){const c=document.createElement('canvas');c.width=view.width;c.height=view.height;const x=c.getContext('2d');x.setTransform(S,0,0,S,0,0);return[c,x]}
let seed=1;const rs=s=>{seed=s},rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const lg=(x,a,b,c,d,st)=>{const g=x.createLinearGradient(a,b,c,d);st.forEach(s=>g.addColorStop(s[0],s[1]));return g};
const rg=(x,a,b,r0,r1,st,c,d)=>{const g=x.createRadialGradient(a,b,r0,c??a,d??b,r1);st.forEach(s=>g.addColorStop(s[0],s[1]));return g};

/* 장면 뼈대: 그림과 밑그림이 같은 숫자를 쓴다 */
const G={roof:58,c1:80,up:{y0:104,y1:192,xs:[38,160,282],w:70},band:[234,244],sign:[130,260,252,280],
 win:{x0:24,x1:366,y0:292,y1:466,gx0:34,gx1:356,gy0:302,gy1:456,m:[138,250],mw:6,tr:338},
 plinth:[466,492],curb:544,pipe:[371,379],bulb:[197,358],lamp:[316,372]};
const Wn=G.win;

/* ---------- 그림: 바탕색(재질) ---------- */
function sky(x){
 x.fillStyle=lg(x,0,0,0,G.roof+20,[[0,'#171721'],[1,'#1b1c33']]);x.fillRect(0,0,W,G.roof+20);
 rs(3);for(let i=0;i<46;i++){const sx=rnd()*W,sy=rnd()*(G.roof-6),r=rnd()*.9+.25;x.fillStyle=`rgba(230,230,255,${.25+rnd()*.6})`;x.beginPath();x.arc(sx,sy,r,0,7);x.fill()}
 x.fillStyle=rg(x,334,30,0,46,[[0,'rgba(243,231,196,.22)'],[1,'rgba(243,231,196,0)']]);x.fillRect(280,0,110,G.roof);
 const m=document.createElement('canvas');m.width=m.height=64;const mx=m.getContext('2d');mx.fillStyle='#f3e7c4';mx.beginPath();mx.arc(32,32,20,0,7);mx.fill();
 mx.fillStyle='rgba(200,180,140,.25)';mx.beginPath();mx.arc(26,38,4,0,7);mx.arc(36,44,2.5,0,7);mx.fill();
 mx.globalCompositeOperation='destination-out';mx.beginPath();mx.arc(42,24,19,0,7);mx.fill();x.drawImage(m,318,14,32,32);
}
function facade(x){
 const top=G.roof,bot=G.plinth[0];
 x.fillStyle='#6b5d55';x.fillRect(0,top,W,bot-top);
 rs(11);
 for(let y=G.c1,row=0;y<bot;y+=9,row++){const off=row%2?12:0;
  for(let bx=-off;bx<W;bx+=24){const h=10+rnd()*10,s=28+rnd()*14,l=33+rnd()*13;
   x.fillStyle=`hsl(${h},${s}%,${l}%)`;x.fillRect(bx+1,y+1,22.2,7.3);
   x.fillStyle=`rgba(255,240,220,${.08+rnd()*.06})`;x.fillRect(bx+1,y+1,22.2,.8);
   x.fillStyle='rgba(30,15,10,.18)';x.fillRect(bx+1,y+7.5,22.2,.8);
   if(rnd()<.25){x.fillStyle=`rgba(${rnd()<.5?'20,10,10':'255,235,210'},.07)`;x.fillRect(bx+2+rnd()*12,y+2,4+rnd()*8,4)}}}
 // 처마 돌띠
 x.fillStyle='#cfc7b8';x.fillRect(-4,top,W+8,6);
 x.fillStyle=lg(x,0,top+6,0,top+13,[[0,'#8f877a'],[1,'#b9b0a1']]);x.fillRect(0,top+6,W,7);
 x.fillStyle='#b4ab9c';x.fillRect(0,top+13,W,G.c1-top-13);
 for(let dx=4;dx<W;dx+=11){x.fillStyle='#cdc4b4';x.fillRect(dx,top+15,6,5);x.fillStyle='rgba(40,30,30,.35)';x.fillRect(dx,top+20,6,1.2)}
 x.fillStyle=lg(x,0,G.c1,0,G.c1+18,[[0,'rgba(10,5,10,.5)'],[1,'rgba(10,5,10,0)']]);x.fillRect(0,G.c1,W,18);
 // 위층 창
 const U=G.up;U.xs.forEach(ux=>{
  x.fillStyle='#c2b9aa';x.fillRect(ux-7,U.y0-13,U.w+14,13);x.fillStyle='#d6cebf';x.fillRect(ux+U.w/2-6,U.y0-15,12,15);
  x.fillStyle='rgba(40,30,30,.3)';x.fillRect(ux-7,U.y0-1.5,U.w+14,1.5);
  x.fillStyle='#17161d';x.fillRect(ux,U.y0,U.w,U.y1-U.y0);
  x.fillStyle=lg(x,ux,U.y0,ux+U.w,U.y1,[[0,'#2b3350'],[.6,'#1f2440'],[1,'#151a30']]);x.fillRect(ux+5,U.y0+5,U.w-10,U.y1-U.y0-8);
  x.fillStyle='#34323b';x.fillRect(ux+U.w/2-1.5,U.y0+5,3,U.y1-U.y0-8);x.fillRect(ux+5,(U.y0+U.y1)/2-1.5,U.w-10,3);
  x.fillStyle=lg(x,ux,U.y0,ux,U.y0+14,[[0,'rgba(0,0,0,.55)'],[1,'rgba(0,0,0,0)']]);x.fillRect(ux,U.y0,U.w,14);
  x.fillStyle='#cdc4b4';x.fillRect(ux-6,U.y1,U.w+12,5);x.fillStyle='#9f9687';x.fillRect(ux-6,U.y1+5,U.w+12,2.5);
  x.fillStyle=lg(x,0,U.y1+7,0,U.y1+18,[[0,'rgba(10,5,10,.45)'],[1,'rgba(10,5,10,0)']]);x.fillRect(ux-6,U.y1+7,U.w+12,11);
 });
 // 가운데 돌띠
 x.fillStyle='#c6bdae';x.fillRect(0,G.band[0],W,4);x.fillStyle='#aaa192';x.fillRect(0,G.band[0]+4,W,G.band[1]-G.band[0]-4);
 x.fillStyle=lg(x,0,G.band[1],0,G.band[1]+10,[[0,'rgba(10,5,10,.4)'],[1,'rgba(10,5,10,0)']]);x.fillRect(0,G.band[1],W,10);
 // 간판 판
 const [sx0,sx1,sy0,sy1]=G.sign;x.fillStyle='rgba(0,0,0,.35)';rr(x,sx0+2,sy0+3,sx1-sx0,sy1-sy0,4);x.fill();
 x.fillStyle=lg(x,0,sy0,0,sy1,[[0,'#34323a'],[1,'#23222a']]);rr(x,sx0,sy0,sx1-sx0,sy1-sy0,4);x.fill();
 x.strokeStyle='#55525c';x.lineWidth=1;rr(x,sx0+.5,sy0+.5,sx1-sx0-1,sy1-sy0-1,4);x.stroke();
 [[sx0+5,sy0+5],[sx1-5,sy0+5],[sx0+5,sy1-5],[sx1-5,sy1-5]].forEach(p=>{x.fillStyle='#77737d';x.beginPath();x.arc(p[0],p[1],1.2,0,7);x.fill()});
 // 작업실 창 둘레 돌
 x.fillStyle='#bdb4a5';x.fillRect(Wn.x0-9,Wn.y0-12,Wn.x1-Wn.x0+18,12);
 for(let k=0;k<7;k++){const kx=Wn.x0-9+k*(Wn.x1-Wn.x0+18)/7;x.fillStyle='rgba(60,50,45,.35)';x.fillRect(kx,Wn.y0-12,1,12)}
 x.fillStyle='#b3aa9b';x.fillRect(Wn.x0-9,Wn.y0,9,Wn.y1-Wn.y0);x.fillRect(Wn.x1,Wn.y0,9,Wn.y1-Wn.y0);
 // 받침돌
 x.fillStyle='#d2c9ba';x.fillRect(Wn.x0-14,G.plinth[0],Wn.x1-Wn.x0+28,6);
 x.fillStyle='#9a9388';x.fillRect(0,G.plinth[0]+6,W,G.plinth[1]-G.plinth[0]-6);
 for(let bx=8;bx<W;bx+=46){x.fillStyle='rgba(40,35,35,.35)';x.fillRect(bx,G.plinth[0]+6,1,G.plinth[1]-G.plinth[0]-6)}
 x.fillStyle='rgba(30,25,25,.35)';x.fillRect(0,G.plinth[0]+6,W,1.5);
 // 보도와 찻길
 x.fillStyle=lg(x,0,G.plinth[1],0,G.curb,[[0,'#605d5b'],[1,'#77736f']]);x.fillRect(0,G.plinth[1],W,G.curb-G.plinth[1]);
 rs(21);for(let bx=-10;bx<W;bx+=52){x.fillStyle='rgba(30,28,30,.4)';x.beginPath();x.moveTo(bx,G.plinth[1]);x.lineTo(bx-(195-bx)*.12,G.curb);x.lineTo(bx-(195-bx)*.12+1,G.curb);x.lineTo(bx+1,G.plinth[1]);x.fill()}
 x.fillStyle='rgba(30,28,30,.35)';x.fillRect(0,516,W,1);
 for(let i=0;i<500;i++){x.fillStyle=`rgba(${rnd()<.5?'255,255,255':'0,0,0'},.06)`;x.fillRect(rnd()*W,G.plinth[1]+rnd()*(G.curb-G.plinth[1]),1,1)}
 x.fillStyle='#a8a39b';x.fillRect(0,G.curb,W,5);x.fillStyle='#55524f';x.fillRect(0,G.curb+5,W,1.5);
 x.fillStyle='#26262d';x.fillRect(0,G.curb+6.5,W,H-G.curb);
 // 빗물관
 const [p0,p1]=G.pipe;x.fillStyle=lg(x,p0,0,p1,0,[[0,'#3e4248'],[.35,'#8a9098'],[.6,'#5a5f66'],[1,'#2e3136']]);x.fillRect(p0,G.c1-4,p1-p0,G.plinth[1]-G.c1+4);
 for(let y=G.c1+40;y<G.plinth[0];y+=96){x.fillStyle='#2b2d32';x.fillRect(p0-2,y,p1-p0+4,4);x.fillStyle='#6d727a';x.fillRect(p0-2,y,p1-p0+4,1)}
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}

/* 방 안: 바탕색 */
function room(x){
 const {gx0,gx1,gy0,gy1}=Wn,fl=432;
 x.fillStyle='#ead9bf';x.fillRect(gx0,gy0,gx1-gx0,gy1-gy0);
 rs(5);for(let i=0;i<900;i++){x.fillStyle=`rgba(${rnd()<.5?'120,90,60':'255,250,240'},.05)`;x.fillRect(gx0+rnd()*(gx1-gx0),gy0+rnd()*(fl-gy0),1.5,1.5)}
 x.fillStyle='#d9c6a8';x.fillRect(gx0,fl-5,gx1-gx0,5);
 x.fillStyle='#8a5a37';x.fillRect(gx0,fl,gx1-gx0,gy1-fl);
 for(let k=0;k<4;k++){x.fillStyle='rgba(50,25,10,.35)';x.fillRect(gx0,fl+4+k*6,gx1-gx0,.8)}
 // 액자
 x.fillStyle='#5a3e2a';x.fillRect(64,308,44,26);x.fillStyle='#efe6d4';x.fillRect(67,311,38,20);
 x.strokeStyle='rgba(70,60,50,.7)';x.lineWidth=.8;x.beginPath();x.moveTo(70,327);x.lineTo(80,317);x.lineTo(88,323);x.lineTo(95,315);x.lineTo(102,327);x.stroke();
 // 선반 둘
 [[364],[404]].forEach(([y])=>{x.fillStyle='#a26d3d';x.fillRect(42,y,92,4);x.fillStyle='#6e4626';x.fillRect(42,y+4,92,1.5);x.fillStyle='#4a4a50';x.fillRect(52,y+5,2,6);x.fillRect(122,y+5,2,6)});
 // 윗선반 물건
 x.fillStyle='#b9c7c1';rr(x,48,344,13,20,2);x.fill();x.fillStyle='#8c6a49';x.fillRect(47,341,15,4);x.fillStyle='rgba(255,255,255,.45)';x.fillRect(50,347,2,14);
 [[67,26,6,'#9b3f32'],[74,22,5,'#3e5a79'],[80,24,7,'#c9a24e'],[88,20,5,'#6f7d5a']].forEach(b=>{x.fillStyle=b[3];x.fillRect(b[0],364-b[1],b[2],b[1]);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(b[0]+1,364-b[1]+3,b[2]-2,1)});
 x.save();x.translate(95,364);x.rotate(.28);x.fillStyle='#d7c7a3';x.fillRect(0,-22,6,22);x.restore();
 x.fillStyle='#c79d6e';x.fillRect(106,348,22,16);x.fillStyle='#ad8457';x.fillRect(106,348,22,3);x.fillStyle='rgba(60,40,20,.4)';x.fillRect(116,351,1,13);
 // 아랫선반: 화분, 종이 더미
 x.fillStyle='#b35f3a';x.beginPath();x.moveTo(52,390);x.lineTo(70,390);x.lineTo(67,404);x.lineTo(55,404);x.fill();x.fillStyle='#c97650';x.fillRect(51,388,20,3);
 [[61,378,9,5,-.5],[55,382,7,4,.6],[67,380,8,4,-.9],[61,372,6,4,.1],[70,374,6,3,-1.2]].forEach(l=>{x.fillStyle='#5f8048';x.beginPath();x.ellipse(l[0],l[1],l[2],l[3],l[4],0,7);x.fill();x.fillStyle='rgba(255,255,230,.18)';x.beginPath();x.ellipse(l[0]-1,l[1]-1,l[2]*.5,l[3]*.4,l[4],0,7);x.fill()});
 for(let k=0;k<5;k++){x.fillStyle=k%2?'#efe7d8':'#e2d8c4';x.fillRect(88+k*.6,396+k*1.6,36,1.6)}
 // 벽에 꽂은 밑그림 두 장
 pin(x,180,392,38,28,-.07,true);pin(x,224,384,26,22,.09,false);
 // 전등 줄과 갓
 x.strokeStyle='#2a2626';x.lineWidth=1;x.beginPath();x.moveTo(197,gy0);x.lineTo(197,346);x.stroke();
 // 책상
 x.fillStyle='#9a6638';x.fillRect(258,406,104,5);x.fillStyle='#6f4524';x.fillRect(258,411,104,3);
 x.fillStyle='#7a4f2c';x.fillRect(264,414,4,fl+16-414);x.fillRect(346,414,4,fl+16-414);
 // 의자
 x.fillStyle='#5b3b24';x.fillRect(296,424,30,4);x.fillStyle='#4a3020';x.fillRect(299,428,2.5,26);x.fillRect(321,428,2.5,26);x.fillRect(299,442,24,2);
 // 화면
 x.fillStyle='#26262c';rr(x,274,362,54,36,2.5);x.fill();x.fillStyle='#38383f';x.fillRect(298,398,6,7);x.fillRect(289,404,24,2.5);
 // 컵, 만들던 작은 상자 집
 x.fillStyle='#e6ddce';x.fillRect(262,396,9,10);x.strokeStyle='#e6ddce';x.lineWidth=1.6;x.beginPath();x.arc(272,401,3,-1.4,1.4);x.stroke();
 x.fillStyle='#caa274';x.fillRect(334,396,14,10);x.fillStyle='#b38755';x.beginPath();x.moveTo(332,396);x.lineTo(341,388);x.lineTo(350,396);x.fill();x.fillStyle='#5a3e2a';x.fillRect(339,400,3,6);
 // 스탠드(팔)
 const [lx,ly]=G.lamp;x.strokeStyle='#3c3c43';x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(330,405);x.lineTo(326,382);x.lineTo(lx+2,ly);x.stroke();
 x.fillStyle='#3c3c43';x.beginPath();x.ellipse(330,405.5,6,1.6,0,0,7);x.fill();
 x.beginPath();x.moveTo(lx-8,ly-5);x.lineTo(lx+5,ly-3);x.lineTo(lx+1,ly+7);x.lineTo(lx-11,ly+4);x.closePath();x.fill();
 // 바닥 깔개
 x.fillStyle='#6f3d34';x.beginPath();x.moveTo(90,446);x.lineTo(230,446);x.lineTo(244,456);x.lineTo(76,456);x.fill();x.fillStyle='rgba(240,200,150,.25)';x.fillRect(90,448,140,1)
}
function pin(x,cx,cy,w,h,a,big){x.save();x.translate(cx,cy);x.rotate(a);x.fillStyle='rgba(60,40,20,.25)';x.fillRect(-w/2+1.5,-h/2+2,w,h);x.fillStyle='#f6f0e3';x.fillRect(-w/2,-h/2,w,h);
 x.strokeStyle='rgba(60,55,60,.75)';x.lineWidth=.6;x.beginPath();
 if(big){x.rect(-w/2+6,-h/2+9,w-12,h-13);x.moveTo(-w/2+4,-h/2+10);x.lineTo(0,-h/2+4);x.lineTo(w/2-4,-h/2+10);x.rect(-4,2,6,7);x.rect(6,-3,5,4)}
 else{x.arc(0,0,6,0,7);x.moveTo(-6,0);x.lineTo(6,0);x.moveTo(0,6);x.lineTo(0,9)}
 x.stroke();x.fillStyle='#c0392b';x.beginPath();x.arc(0,-h/2+2.5,1.5,0,7);x.fill();x.restore()}

/* ---------- 빛 지도 ---------- */
function facadeLight(x,on){
 x.fillStyle='#363a63';x.fillRect(0,0,W,H);
 x.globalCompositeOperation='lighter';
 x.fillStyle=lg(x,W,0,90,330,[[0,'rgba(70,78,120,.7)'],[1,'rgba(70,78,120,0)']]);x.fillRect(0,0,W,H);
 if(on){
  x.fillStyle=rg(x,197,410,0,270,[[0,'rgba(255,170,90,.95)'],[.25,'rgba(255,150,80,.6)'],[.55,'rgba(220,110,60,.2)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,H);
  // 창 둘레 돌은 바로 옆이라 더 밝다
  x.fillStyle=rg(x,197,380,60,230,[[0,'rgba(255,190,120,.5)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,Wn.y0-14,W,Wn.y1-Wn.y0+30);
  // 보도에 쏟아지는 빛
  for(let k=0;k<7;k++){const e=k*7;x.fillStyle=lg(x,0,G.plinth[0],0,H,[[0,'rgba(255,196,128,.17)'],[1,'rgba(255,170,100,.05)']]);x.beginPath();x.moveTo(Wn.gx0-e*.4,G.plinth[0]);x.lineTo(Wn.gx1+e*.4,G.plinth[0]);x.lineTo(Wn.gx1+70+e,H);x.lineTo(Wn.gx0-70-e,H);x.fill()}
  x.globalCompositeOperation='multiply';
  // 창살 그림자
  [Wn.m[0],Wn.m[1]].forEach(m=>{const f=(m+3-197);x.fillStyle='rgb(190,165,165)';x.beginPath();x.moveTo(m,G.plinth[1]);x.lineTo(m+6,G.plinth[1]);x.lineTo(m+6+f*.55+3,H);x.lineTo(m+f*.55-3,H);x.fill()});
  x.fillStyle='rgb(160,130,130)';x.fillRect(0,G.plinth[0],W,1.5);
 }
 x.globalCompositeOperation='multiply';
 x.fillStyle=rg(x,195,300,120,470,[[0,'#ffffff'],[1,'#8a8aa6']]);x.fillRect(0,0,W,H);
 x.globalCompositeOperation='source-over';
}
function roomLight(x,on){
 const [bx,by]=G.bulb,[lx,ly]=G.lamp;
 if(!on){x.fillStyle='#191b30';x.fillRect(0,0,W,H);x.globalCompositeOperation='lighter';x.fillStyle=lg(x,Wn.gx1,Wn.gy0,Wn.gx0,Wn.gy1,[[0,'rgba(40,46,84,.6)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';return}
 x.fillStyle='#3a2a2c';x.fillRect(0,0,W,H);
 x.globalCompositeOperation='lighter';
 x.fillStyle=rg(x,bx,by,0,240,[[0,'rgba(255,246,226,1)'],[.25,'rgba(255,222,170,.9)'],[.6,'rgba(230,150,90,.42)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,H);
 x.fillStyle=rg(x,lx-6,ly+28,0,70,[[0,'rgba(255,232,190,.85)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,H);
 x.globalCompositeOperation='multiply';
 // 갓 위쪽은 어둡다(갓이 빛을 아래로 모음)
 x.fillStyle=rg(x,bx,Wn.gy0,10,90,[[0,'rgb(150,120,110)'],[1,'rgb(255,255,255)']]);x.fillRect(Wn.gx0,Wn.gy0,Wn.gx1-Wn.gx0,40);
 // 선반·책상 밑 그림자
 [364,404].forEach(y=>{x.fillStyle=lg(x,0,y+5,0,y+14,[[0,'rgb(165,135,125)'],[1,'rgb(255,255,255)']]);x.beginPath();x.moveTo(42,y+5);x.lineTo(134,y+5);x.lineTo(128,y+14);x.lineTo(40,y+14);x.fill()});
 x.fillStyle=lg(x,0,414,0,456,[[0,'rgb(110,85,80)'],[1,'rgb(190,165,150)']]);x.fillRect(262,414,94,42);
 // 물건이 벽에 드리운 그림자(전구가 오른쪽 위라 왼쪽 아래로)
 x.fillStyle='rgb(212,190,178)';
 [[48,344,13,20],[67,338,6,26],[74,342,5,22],[80,340,7,24],[106,348,22,16]].forEach(o=>{const d=(o[0]-bx)*.03;x.beginPath();x.moveTo(o[0],o[1]+o[3]);x.lineTo(o[0]+d,o[1]+2);x.lineTo(o[0]+o[2]+d,o[1]+2);x.lineTo(o[0]+o[2],o[1]+o[3]);x.fill()});
 [[180,392,38,28],[224,384,26,22]].forEach(o=>{x.fillRect(o[0]-o[2]/2+(o[0]-bx)*.05,o[1]-o[3]/2+2.5,o[2],o[3])});
 x.fillStyle=lg(x,0,446,0,456,[[0,'rgb(255,255,255)'],[1,'rgb(170,140,130)']]);x.fillRect(Wn.gx0,446,Wn.gx1-Wn.gx0,10);
 // 구석은 어둡게
 x.fillStyle=rg(x,bx,by+20,140,300,[[0,'#ffffff'],[1,'#8a7068']]);x.fillRect(0,0,W,H);
 x.globalCompositeOperation='source-over';
}
function mul(x,draw,clip){const [c,l]=mk();draw(l);x.save();if(clip){x.beginPath();clip(x);x.clip()}x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='multiply';x.drawImage(c,0,0);x.restore()}

/* 스스로 빛나는 것 */
function roomGlow(x,on){
 const [bx,by]=G.bulb,[lx,ly]=G.lamp;
 // 화면
 if(on){x.fillStyle=lg(x,0,365,0,395,[[0,'#fff8e8'],[1,'#ffe8bf']]);x.fillRect(277,365,48,30);
  [[284,'#3f8a55'],[296,'#3b3463'],[308,'#d0643a']].forEach(t=>{x.fillStyle=t[1];rr(x,t[0],371,9,9,2);x.fill()});
  x.fillStyle='#d8c6a2';x.fillRect(284,385,30,2);x.fillRect(284,389,20,2);
 }else{x.fillStyle=lg(x,277,365,325,395,[[0,'#1d1f2c'],[.5,'#14151d'],[1,'#101118']]);x.fillRect(277,365,48,30);x.fillStyle='rgba(140,150,200,.12)';x.beginPath();x.moveTo(279,367);x.lineTo(294,367);x.lineTo(281,393);x.lineTo(279,393);x.fill()}
 // 갓
 x.fillStyle=lg(x,184,0,210,0,[[0,'#26252a'],[.45,'#4a4950'],[1,'#1e1d22']]);x.beginPath();x.moveTo(191,346);x.lineTo(203,346);x.lineTo(211,357);x.lineTo(183,357);x.closePath();x.fill();
 if(on){
  x.fillStyle='#fffdf2';x.beginPath();x.ellipse(bx,357,12,2.4,0,0,7);x.fill();
  x.globalCompositeOperation='lighter';
  x.fillStyle=rg(x,bx,by+2,0,46,[[0,'rgba(255,240,200,.95)'],[.3,'rgba(255,214,150,.4)'],[1,'rgba(255,190,120,0)']]);x.fillRect(bx-50,by-46,100,96);
  // 갓 아래로 퍼지는 빛 기둥
  x.fillStyle=lg(x,0,357,0,456,[[0,'rgba(255,226,170,.22)'],[1,'rgba(255,226,170,0)']]);x.beginPath();x.moveTo(184,357);x.lineTo(210,357);x.lineTo(262,456);x.lineTo(132,456);x.fill();
  x.fillStyle=rg(x,301,380,0,36,[[0,'rgba(255,236,190,.28)'],[1,'rgba(255,236,190,0)']]);x.fillRect(262,340,80,80);
  x.fillStyle=rg(x,lx-4,ly+4,0,14,[[0,'rgba(255,248,220,1)'],[1,'rgba(255,220,160,0)']]);x.fillRect(lx-20,ly-10,32,30);
  x.fillStyle=lg(x,lx,ly,lx-10,406,[[0,'rgba(255,230,180,.35)'],[1,'rgba(255,230,180,0)']]);x.beginPath();x.moveTo(lx-10,ly+5);x.lineTo(lx+1,ly+7);x.lineTo(lx+4,406);x.lineTo(lx-34,406);x.fill();
  x.globalCompositeOperation='source-over';
 }else{x.fillStyle='rgba(180,180,200,.25)';x.beginPath();x.ellipse(bx,357,10,1.8,0,0,7);x.fill()}
}
function glass(x,on){
 const {gx0,gx1,gy0,gy1}=Wn;
 x.save();x.beginPath();x.rect(gx0,gy0,gx1-gx0,gy1-gy0);G.up.xs.forEach(u=>x.rect(u+5,G.up.y0+5,G.up.w-10,G.up.y1-G.up.y0-8));x.clip();
 if(!on){x.fillStyle='rgba(28,32,64,.28)';x.fillRect(0,0,W,H)}
 const a=on?.025:.11;
 [[30,60],[110,26],[200,70],[300,34]].forEach(([s,w])=>{x.fillStyle=`rgba(200,210,255,${a})`;x.beginPath();x.moveTo(s,gy0-100);x.lineTo(s+w,gy0-100);x.lineTo(s+w-170,gy1+10);x.lineTo(s-170,gy1+10);x.fill()});
 x.restore();
}
function frame(x,on){
 const {x0,x1,y0,y1,gx0,gx1,gy0,gy1,m,mw,tr}=Wn,c=on?'#1d1916':'#121218';
 x.fillStyle=c;x.fillRect(x0,y0,x1-x0,gy0-y0);x.fillRect(x0,gy1,x1-x0,y1-gy1);x.fillRect(x0,y0,gx0-x0,y1-y0);x.fillRect(gx1,y0,x1-gx1,y1-y0);
 m.forEach(mx=>x.fillRect(mx,gy0,mw,gy1-gy0));x.fillRect(gx0,tr,gx1-gx0,5);
 // 작은 창살(위 칸)
 [[gx0,m[0]],[m[0]+mw,m[1]],[m[1]+mw,gx1]].forEach(([a,b])=>{x.fillRect((a+b)/2-1.2,gy0,2.4,tr-gy0)});
 if(on){x.fillStyle='rgba(255,200,140,.55)';m.forEach(mx=>{x.fillRect(mx-.6,tr+5,.9,gy1-tr-5);x.fillRect(mx+mw-.3,tr+5,.9,gy1-tr-5)});x.fillRect(gx0,tr+5,gx1-gx0,.9);x.fillRect(gx0,gy1-.9,gx1-gx0,.9)}
 else{x.fillStyle='rgba(150,160,210,.22)';x.fillRect(x0,y0,x1-x0,.9);m.forEach(mx=>x.fillRect(mx+mw-.9,gy0,.9,gy1-gy0))}
 // 창틀 아래 그림자, 받침돌 위 빛
 x.fillStyle=on?'rgba(255,214,150,.35)':'rgba(170,180,220,.12)';x.fillRect(x0-14,G.plinth[0],x1-x0+28,1.2);
}
function bloom(x){
 x.globalCompositeOperation='lighter';
 x.fillStyle=rg(x,197,392,20,260,[[0,'rgba(255,186,110,.26)'],[.5,'rgba(255,160,90,.08)'],[1,'rgba(0,0,0,0)']]);x.fillRect(0,0,W,H);
 x.fillStyle=rg(x,197,500,10,200,[[0,'rgba(255,190,120,.12)'],[1,'rgba(0,0,0,0)']],197,560);x.fillRect(0,G.plinth[0],W,H);
 x.globalCompositeOperation='source-over';
}
let grain;function makeGrain(){const c=document.createElement('canvas');c.width=view.width;c.height=view.height;const g=c.getContext('2d'),d=g.createImageData(c.width,c.height);rs(99);for(let i=0;i<d.data.length;i+=4){const v=rnd()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}g.putImageData(d,0,0);grain=c}
function state(on){
 const [c,x]=mk();sky(x);
 const [b,bx]=mk();facade(bx);mul(bx,l=>facadeLight(l,on),cx=>cx.rect(0,G.roof,W,H));
 const [r,rx]=mk();room(rx);mul(rx,l=>roomLight(l,on));roomGlow(rx,on);
 bx.save();bx.beginPath();bx.rect(Wn.gx0,Wn.gy0,Wn.gx1-Wn.gx0,Wn.gy1-Wn.gy0);bx.clip();bx.setTransform(1,0,0,1,0,0);bx.drawImage(r,0,0);bx.restore();
 glass(bx,on);frame(bx,on);if(on)bloom(bx);
 x.setTransform(1,0,0,1,0,0);x.drawImage(b,0,0);
 x.globalCompositeOperation='soft-light';x.globalAlpha=.22;x.drawImage(grain,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';
 x.setTransform(S,0,0,S,0,0);
 x.fillStyle=lg(x,0,0,0,30,[[0,'rgba(23,23,33,1)'],[1,'rgba(23,23,33,0)']]);x.fillRect(0,0,W,30);
 return c;
}

/* ---------- 연필 밑그림(같은 뼈대) ---------- */
function sketch(x){
 const top=y=>20+Math.sin(y*.09)*1.6+Math.sin(y*.31)*.8;
 x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.moveTo(0,top(0)+3);for(let i=0;i<=W;i+=6)x.lineTo(i,top(i)+4);x.lineTo(W,H);x.lineTo(0,H);x.fill();
 x.fillStyle=lg(x,0,20,0,H,[[0,'#efe9dd'],[1,'#e6dfd0']]);x.beginPath();x.moveTo(0,top(0));for(let i=0;i<=W;i+=6)x.lineTo(i,top(i));x.lineTo(W,H);x.lineTo(0,H);x.fill();
 rs(41);for(let i=0;i<2600;i++){const a=rnd()*W,b=24+rnd()*(H-24),l=1+rnd()*3,t=rnd()*3;x.strokeStyle=`rgba(${rnd()<.5?'120,105,85':'255,255,250'},.07)`;x.lineWidth=.5;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.cos(t)*l,b+Math.sin(t)*l);x.stroke()}
 x.fillStyle=rg(x,195,300,180,420,[[0,'rgba(0,0,0,0)'],[1,'rgba(90,70,40,.12)']]);x.fillRect(0,20,W,H);
 rs(77);
 const ink=a=>`rgba(48,46,54,${a})`;
 function L(a,b,c,d,w=.8,al=.5,ov=4,pass=2){const dx=c-a,dy=d-b,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;for(let p=0;p<pass;p++){const j=()=>(rnd()-.5)*1.1,o1=ov*(.2+rnd()),o2=ov*(.2+rnd());x.beginPath();x.moveTo(a-ux*o1+j(),b-uy*o1+j());x.quadraticCurveTo((a+c)/2+(rnd()-.5)*len*.012,(b+d)/2+(rnd()-.5)*len*.012,c+ux*o2+j(),d+uy*o2+j());x.lineWidth=w*(.65+rnd()*.5);x.strokeStyle=ink(al*(.55+rnd()*.45));x.stroke()}}
 function R(a,b,c,d,w,al,ov){L(a,b,c,b,w,al,ov);L(a,d,c,d,w,al,ov);L(a,b,a,d,w,al,ov);L(c,b,c,d,w,al,ov)}
 function hatch(a,b,c,d,gap=3,al=.22,ang=1){x.save();x.beginPath();x.rect(a,b,c-a,d-b);x.clip();for(let s=a-(d-b);s<c+(d-b);s+=gap*(.8+rnd()*.4)){L(s,ang>0?d:b,s+(d-b),ang>0?b:d,.5,al,0,1)}x.restore()}
 function smudge(a,b,c,d,al=.08){x.fillStyle=ink(al);x.fillRect(a,b,c-a,d-b)}
 function circ(cx,cy,r,al=.5){for(let p=0;p<2;p++){x.beginPath();x.ellipse(cx+(rnd()-.5),cy+(rnd()-.5),r*(.96+rnd()*.08),r*(.96+rnd()*.08),rnd(),0,6.6);x.lineWidth=.7;x.strokeStyle=ink(al*(.6+rnd()*.4));x.stroke()}}
 // 보조선
 [G.roof,G.band[0],Wn.y0,G.plinth[0],G.plinth[1]].forEach(y=>L(-10,y,W+10,y,.5,.12,0,1));
 [Wn.x0,Wn.x1,197].forEach(v=>L(v,30,v,H,.5,.09,0,1));
 // 달
 circ(334,32,10,.35);
 // 처마
 L(-4,G.roof,W+4,G.roof,1.1,.75);L(0,G.roof+6,W,G.roof+6,.8,.5);L(0,G.roof+13,W,G.roof+13,.7,.45);L(0,G.c1,W,G.c1,1,.6);
 for(let dx=4;dx<W;dx+=11){L(dx,G.roof+15,dx,G.roof+20,.5,.35,1,1);L(dx+6,G.roof+15,dx+6,G.roof+20,.5,.35,1,1)}
 hatch(0,G.c1,W,G.c1+8,2.6,.18);
 // 벽돌 몇 군데만
 const bricks=(a,b,n,m)=>{for(let r=0;r<m;r++)for(let k=0;k<n;k++){const bx=a+k*24+(r%2?12:0),by=b+r*9;if(rnd()<.8)R(bx,by,bx+22,by+7.5,.45,.28,1)}};
 bricks(6,G.c1+14,3,4);bricks(250,206,4,3);bricks(10,250,3,3);bricks(300,G.band[1]+4,3,2);
 // 위층 창
 const U=G.up;U.xs.forEach(ux=>{R(ux-7,U.y0-13,ux+U.w+7,U.y0,.8,.55,3);R(ux+U.w/2-6,U.y0-15,ux+U.w/2+6,U.y0,.6,.45,1);R(ux,U.y0,ux+U.w,U.y1,1,.7,4);R(ux+5,U.y0+5,ux+U.w-5,U.y1-3,.7,.5,2);
  L(ux+U.w/2,U.y0+5,ux+U.w/2,U.y1-3,.7,.5,1);L(ux+5,(U.y0+U.y1)/2,ux+U.w-5,(U.y0+U.y1)/2,.7,.5,1);
  hatch(ux+5,U.y0+5,ux+U.w-5,U.y1-3,2.4,.2);R(ux-6,U.y1,ux+U.w+6,U.y1+7,.8,.55,3);hatch(ux-6,U.y1+7,ux+U.w+6,U.y1+12,2.6,.14,-1)});
 // 돌띠, 간판
 L(-4,G.band[0],W+4,G.band[0],.9,.6);L(0,G.band[1],W,G.band[1],.9,.55);hatch(0,G.band[1],W,G.band[1]+6,2.8,.14);
 const [sx0,sx1,sy0,sy1]=G.sign;R(sx0,sy0,sx1,sy1,.9,.65,3);
 x.save();x.font='500 12px "Noto Sans KR",sans-serif';x.fillStyle=ink(.42);x.textAlign='center';x.textBaseline='middle';
 const t='LUMEN LAB';let wsum=0;const gap=3.4;for(const ch of t)wsum+=x.measureText(ch).width+gap;let cx=195-wsum/2+gap/2;for(const ch of t){const w=x.measureText(ch).width;x.fillText(ch,cx+w/2+(rnd()-.5)*.6,(sy0+sy1)/2+1+(rnd()-.5)*.8);cx+=w+gap}
 x.restore();
 // 작업실 창
 R(Wn.x0-9,Wn.y0-12,Wn.x1+9,Wn.y0,.9,.6,4);for(let k=1;k<7;k++){const kx=Wn.x0-9+k*(Wn.x1-Wn.x0+18)/7;L(kx,Wn.y0-12,kx,Wn.y0,.5,.35,1,1)}
 L(Wn.x0-9,Wn.y0,Wn.x0-9,Wn.y1,.8,.55,2);L(Wn.x1+9,Wn.y0,Wn.x1+9,Wn.y1,.8,.55,2);
 R(Wn.x0,Wn.y0,Wn.x1,Wn.y1,1.2,.8,6);R(Wn.gx0,Wn.gy0,Wn.gx1,Wn.gy1,.9,.6,3);
 Wn.m.forEach(mx=>{L(mx,Wn.gy0,mx,Wn.gy1,.8,.6,2);L(mx+Wn.mw,Wn.gy0,mx+Wn.mw,Wn.gy1,.8,.6,2)});L(Wn.gx0,Wn.tr,Wn.gx1,Wn.tr,.8,.6,2);L(Wn.gx0,Wn.tr+5,Wn.gx1,Wn.tr+5,.8,.55,2);
 [[Wn.gx0,Wn.m[0]],[Wn.m[0]+Wn.mw,Wn.m[1]],[Wn.m[1]+Wn.mw,Wn.gx1]].forEach(([a,b])=>L((a+b)/2,Wn.gy0,(a+b)/2,Wn.tr,.6,.45,1));
 // 방 안
 const fl=432;L(Wn.gx0,fl,Wn.gx1,fl,.7,.45,1);L(Wn.gx0,fl-5,Wn.gx1,fl-5,.5,.3,1);
 R(64,308,108,334,.6,.45,1);L(70,327,80,317,.5,.4,0,1);L(80,317,88,323,.5,.4,0,1);L(88,323,95,315,.5,.4,0,1);L(95,315,102,327,.5,.4,0,1);
 [364,404].forEach(y=>{R(42,y,134,y+4,.7,.55,3);hatch(42,y+5,134,y+14,2.6,.16)});
 R(48,344,61,364,.6,.5,1);R(47,341,62,345,.5,.45,1);[[67,26,6],[74,22,5],[80,24,7],[88,20,5]].forEach(b=>R(b[0],364-b[1],b[0]+b[2],364,.6,.5,1));
 L(95,364,101,343,.6,.45,1);R(106,348,128,364,.6,.5,1);
 L(52,390,70,390,.6,.5,1);L(52,390,55,404,.6,.5,1);L(70,390,67,404,.6,.5,1);
 [[61,378,9,5],[55,382,7,4],[67,380,8,4],[61,372,6,4]].forEach(l=>circ(l[0],l[1],l[2]*.8,.4));
 R(88,396,124,404,.5,.4,1);
 [[180,392,38,28,-.07],[224,384,26,22,.09]].forEach(p=>{x.save();x.translate(p[0],p[1]);x.rotate(p[4]);R(-p[2]/2,-p[3]/2,p[2]/2,p[3]/2,.6,.5,1);x.restore()});
 L(197,Wn.gy0,197,346,.6,.55,0);L(191,346,203,346,.7,.6,1);L(191,346,183,357,.7,.6,1);L(203,346,211,357,.7,.6,1);L(183,357,211,357,.7,.6,1);circ(197,360,3,.5);
 R(258,406,362,411,.8,.6,2);L(266,411,266,446,.7,.5,1);L(348,411,348,446,.7,.5,1);hatch(262,412,356,446,3.2,.14);
 R(274,362,328,398,.8,.6,2);R(277,365,325,395,.5,.4,1);L(301,398,301,405,.6,.5,0);L(289,405,313,405,.6,.5,1);
 R(262,396,271,406,.5,.45,1);R(334,396,348,406,.5,.45,1);L(332,396,341,388,.5,.45,1);L(341,388,350,396,.5,.45,1);
 L(330,405,326,382,.7,.55,1);L(326,382,G.lamp[0]+2,G.lamp[1],.7,.55,1);L(G.lamp[0]-8,G.lamp[1]-5,G.lamp[0]+5,G.lamp[1]-3,.6,.5,1);L(G.lamp[0]-11,G.lamp[1]+4,G.lamp[0]+1,G.lamp[1]+7,.6,.5,1);
 R(296,424,326,428,.5,.45,1);L(300,428,300,454,.5,.4,1);L(322,428,322,454,.5,.4,1);
 L(90,446,230,446,.5,.35,1);L(76,456,244,456,.5,.35,1);
 // 받침돌, 보도
 R(Wn.x0-14,G.plinth[0],Wn.x1+14,G.plinth[0]+6,.8,.6,4);L(-4,G.plinth[1],W+4,G.plinth[1],.9,.6);for(let bx=8;bx<W;bx+=46)L(bx,G.plinth[0]+6,bx,G.plinth[1],.5,.35,1,1);
 for(let bx=-10;bx<W;bx+=52)L(bx,G.plinth[1],bx-(195-bx)*.12,G.curb,.5,.3,1,1);
 L(-4,G.curb,W+4,G.curb,.9,.6);L(-4,G.curb+5,W+4,G.curb+5,.7,.5);hatch(0,G.curb+7,W,H,3,.16);
 // 빗물관
 L(G.pipe[0],G.c1,G.pipe[0],G.plinth[1],.7,.55,2);L(G.pipe[1],G.c1,G.pipe[1],G.plinth[1],.7,.55,2);for(let y=G.c1+40;y<G.plinth[0];y+=96)R(G.pipe[0]-2,y,G.pipe[1]+2,y+4,.5,.45,1);
 // 치수와 메모(손글씨)
 x.save();x.strokeStyle=ink(.4);x.fillStyle=ink(.5);x.lineWidth=.5;
 const dy=G.plinth[1]+12;L(Wn.x0,dy,Wn.x1,dy,.5,.4,0,1);[Wn.x0,Wn.x1].forEach(v=>L(v,dy-3,v,dy+3,.5,.4,0,1));
 x.font='10px "Noto Sans KR",sans-serif';x.textAlign='center';x.fillStyle='#efe9dd';x.fillStyle='#e9e2d4';x.fillRect(176,dy-6,40,12);x.fillStyle=ink(.55);x.fillText('3,420',196,dy+3.5);
 L(13,Wn.y0,13,Wn.y1,.5,.4,0,1);[Wn.y0,Wn.y1].forEach(v=>L(10,v,16,v,.5,.4,0,1));x.save();x.translate(13,379);x.rotate(-Math.PI/2);x.fillStyle='#ebe5d8';x.fillRect(-18,-6,36,12);x.fillStyle=ink(.55);x.fillText('1,740',0,3.5);x.restore();
 x.textAlign='left';x.font='11px "Noto Sans KR",sans-serif';x.fillStyle=ink(.6);x.save();x.translate(262,326);x.rotate(-.04);x.fillText(MEMO,0,0);x.restore();
 L(258,324,212,352,.5,.4,2,1);L(212,352,220,351,.5,.4,0,1);L(212,352,217,345,.5,.4,0,1);
 x.restore();
 // 테이프
 [[34,18,-.25],[352,20,.2]].forEach(t=>{x.save();x.translate(t[0],t[1]);x.rotate(t[2]);x.fillStyle='rgba(236,224,186,.82)';x.fillRect(-18,-6,36,13);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(-18,-6,36,2);x.restore()});
}

/* ---------- 합치기, 움직임 ---------- */
let OFF,ON,L=0,sig=0,lit=false,anim=null,dust=[],vis=true,raf=0,frames=0;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const S0=[0x55,0x53,0x5c],S1=[0xff,0xcf,0x6e];   // 간판 글자: 꺼짐 #55535c → 켜짐 #ffcf6e
const cl=v=>Math.max(0,Math.min(1,v));
function drawSign(x,k){
 const [sx0,sx1,sy0,sy1]=G.sign,t='LUMEN LAB';x.save();x.setTransform(S,0,0,S,0,0);x.font='600 12.5px "Pretendard","Noto Sans KR",sans-serif';x.textBaseline='middle';
 const gap=3.6;let ws=0;for(const ch of t)ws+=x.measureText(ch).width+gap;let cx=195-ws/2+gap/2;let i=0;
 for(const ch of t){const w=x.measureText(ch).width;const on=cl(k*12-i);   // 한 자 1/12초(약 0.08초)씩, 왼쪽부터
  x.shadowColor='rgba(255,190,90,'+(.9*on)+')';x.shadowBlur=on*10*S;
  x.fillStyle=`rgb(${S0.map((a,j)=>Math.round(a+(S1[j]-a)*on)).join(',')})`;
  x.fillText(ch,cx,(sy0+sy1)/2+1);if(ch!==' ')i++;cx+=w+gap}
 x.restore()}
function render(){
 if(!OFF)return;frames++;
 vx.setTransform(1,0,0,1,0,0);vx.globalAlpha=1;vx.drawImage(OFF,0,0);
 if(L>0){vx.globalAlpha=Math.min(1,L);vx.drawImage(ON,0,0);vx.globalAlpha=1}
 drawSign(vx,sig);
 if(L>.4&&!reduce){vx.save();vx.setTransform(S,0,0,S,0,0);vx.beginPath();vx.rect(Wn.gx0,Wn.gy0,Wn.gx1-Wn.gx0,Wn.gy1-Wn.gy0);vx.clip();vx.globalCompositeOperation='lighter';
  const now=performance.now()/1000;dust.forEach(d=>{const yy=d.y+((now*d.v)%140);const y=Wn.gy0+((yy-Wn.gy0)%(Wn.gy1-Wn.gy0)+(Wn.gy1-Wn.gy0))%(Wn.gy1-Wn.gy0);const xx=d.x+Math.sin(now*d.f+d.p)*6;
   const near=Math.max(0,1-Math.hypot(xx-197,y-400)/150);const a=(L-.4)*near*d.a*(.6+.4*Math.sin(now*2+d.p));vx.fillStyle=`rgba(255,226,170,${a})`;vx.beginPath();vx.arc(xx,y,d.r,0,7);vx.fill()});
  vx.restore()}
}
function loop(){raf=0;render();if((anim||lit)&&vis&&!reduce)raf=requestAnimationFrame(tick)}
function tick(t){if(anim){const e=(t-anim.t0)/1000;const r=anim.f(e);if(r)anim=null}loop()}
// 전구 깜빡임: 켠 그림 투명도 L을 이 점들 사이로 잇는다(초, L)
const flick=[[0,0],[.11,.55],[.19,.08],[.35,.75],[.44,.2],[.56,.3],[.67,.95],[.75,.7],[.93,1]];
function interp(k,e){if(e>=k[k.length-1][0])return k[k.length-1][1];for(let i=1;i<k.length;i++)if(e<k[i][0]){const a=k[i-1],b=k[i];return a[1]+(b[1]-a[1])*(e-a[0])/(b[0]-a[0])}}
const label=on=>{const s=btn.querySelectorAll('[data-i18n]');s[0].hidden=on;s[1].hidden=!on};
function lightOn(){lit=true;hero.classList.add('on');root.classList.add('lit');label(true);
 if(reduce||!OFF){L=1;sig=1;render();return}
 anim={t0:performance.now(),f:e=>{L=interp(flick,e);sig=cl((e-1.1)/1.0);return e>2.3}};if(!raf)raf=requestAnimationFrame(tick)}
function lightOff(){lit=false;hero.classList.remove('on');root.classList.remove('lit');label(false);
 if(reduce||!OFF){L=0;sig=0;render();return}
 const L0=L,s0=sig;anim={t0:performance.now(),f:e=>{const k=Math.min(1,e/.45);L=L0*(1-k);sig=s0*(1-k);if(k>=1){render();return true}}};if(!raf)raf=requestAnimationFrame(tick)}

/* 문지르기 */
let done=false,cnt=0,down=false,start=null,mode=null,last=null,fling=0,vel=0,lastMove=null;
function rub(a,b){px.save();px.setTransform(1,0,0,1,0,0);px.globalCompositeOperation='destination-out';const r=44*S;const g=px.createRadialGradient(a,b,0,a,b,r);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.6,'rgba(0,0,0,.3)');g.addColorStop(1,'rgba(0,0,0,0)');px.fillStyle=g;px.beginPath();px.arc(a,b,r,0,7);px.fill();px.restore();if(++cnt%8===0)check()}
function check(){if(done)return;const d=px.getImageData(0,0,paper.width,paper.height).data;let cl=0,n=0;for(let gy=0;gy<40;gy++)for(let gx=0;gx<28;gx++){const X=Math.floor((gx+.5)*paper.width/28),Y=Math.floor((24*S)+(gy+.5)*(paper.height-24*S)/40);n++;if(d[(Y*paper.width+X)*4+3]<100)cl++}if(cl/n>=.6)finish()}
function finish(){if(done)return;done=true;down=false;hero.classList.add('ready');setTimeout(()=>{paper.hidden=true},reduce?0:700)}
function pos(e){const b=paper.getBoundingClientRect();return[(e.clientX-b.left)*paper.width/b.width,(e.clientY-b.top)*paper.height/b.height]}
// 페이지 스크롤로 넘긴 손: 손가락 따라 내리고, 놓으면 관성으로 조금 더(16ms마다 0.95배, 빠르기는 3px/ms까지). html의 부드러운 스크롤에 먹히지 않게 instant
function scrollTo_(dy,t){window.scrollBy({top:dy,behavior:'instant'});if(lastMove){const dt=Math.max(1,t-lastMove[1]);vel=Math.max(-3,Math.min(3,.6*vel+.4*(dy/dt)))}lastMove=[0,t]}
function glide(){cancelAnimationFrame(fling);if(reduce||Math.abs(vel)<.15)return;let t0=performance.now();const f=t=>{const dt=t-t0;t0=t;window.scrollBy({top:vel*dt,behavior:'instant'});vel*=Math.pow(.95,dt/16);if(Math.abs(vel)>.02)fling=requestAnimationFrame(f)};fling=requestAnimationFrame(f)}
paper.addEventListener('pointerdown',e=>{if(done)return;cancelAnimationFrame(fling);vel=0;lastMove=null;down=true;start=[e.clientX,e.clientY,performance.now()];mode=e.pointerType==='mouse'?'rub':null;last=pos(e);try{paper.setPointerCapture(e.pointerId)}catch(_){}});
paper.addEventListener('pointermove',e=>{if(!down||done)return;
 if(!mode){const dx=Math.abs(e.clientX-start[0]),dy=Math.abs(e.clientY-start[1]),early=performance.now()-start[2]<80;
  if(early&&dy>2*dx){if(dy>6){mode='scroll'}else return}   // 처음 80ms: 세로가 가로의 2배 넘고 6 넘으면 스크롤, 그 전엔 기다림
  else if(dx+dy>4||!early)mode='rub';else return}
 if(mode==='scroll'){scrollTo_(start[1]-e.clientY,e.timeStamp);start[1]=e.clientY;return}
 const p=pos(e);const n=Math.max(1,Math.ceil(Math.hypot(p[0]-last[0],p[1]-last[1])/(10*S)));for(let k=1;k<=n&&!done;k++)rub(last[0]+(p[0]-last[0])*k/n,last[1]+(p[1]-last[1])*k/n);last=p});
['pointerup','pointercancel'].forEach(t=>paper.addEventListener(t,()=>{if(mode==='scroll')glide();down=false;mode=null;check()}));
hero.querySelector('.hint__skip').addEventListener('click',()=>{finish();btn.focus({preventScroll:true});setTimeout(lightOn,reduce?0:500)});
btn.addEventListener('click',()=>lit?lightOff():lightOn());
if('IntersectionObserver' in window)new IntersectionObserver(es=>{vis=es[es.length-1].isIntersecting;if(vis&&lit&&!raf&&!reduce)raf=requestAnimationFrame(tick)}).observe(view);

/* 시작: 밤 그림·불 켠 그림·잡티는 처음 한 번만 그려 두고 겹쳐 보인다 */
rs(5);for(let i=0;i<46;i++)dust.push({x:Wn.gx0+rnd()*(Wn.gx1-Wn.gx0),y:Wn.gy0+rnd()*(Wn.gy1-Wn.gy0),v:2+rnd()*5,f:.3+rnd()*.6,p:rnd()*6,r:.4+rnd()*.8,a:.4+rnd()*.6});
const go=()=>{if(OFF)return;makeGrain();OFF=state(false);ON=state(true);render();px.setTransform(S,0,0,S,0,0);sketch(px);hero.classList.add('drawn');if(lit&&!reduce&&!raf)raf=requestAnimationFrame(tick)};
Promise.race([Promise.all([document.fonts.load('600 12.5px "Pretendard"'),document.fonts.load('10px "Noto Sans KR"'),document.fonts.load('500 12px "Noto Sans KR"')]),new Promise(r=>setTimeout(r,1200))]).then(go,go);
window.__sceneCheck={finish,lightOn,lightOff,peek:()=>({L,sig,lit,done,raf:!!raf,frames,vis,drawn:!!OFF})};
})();
