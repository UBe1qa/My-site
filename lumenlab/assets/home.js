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
// 문 밖 가게 문 = 메일 보내기: 누르면 문이 활짝 열리고(0.55초 뒤 메일 앱) 주소도 복사, 말풍선으로 알림. 메일 앱이 없는 PC에서도 '눌렸다'가 보이게
const door=document.getElementById('door'),dsay=document.getElementById('doorSay');
if(door&&dsay)door.addEventListener('click',function(e){
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  e.preventDefault();const href=door.href;
  door.classList.add('open');dsay.textContent='메일 앱을 열어요';dsay.classList.add('on');
  try{navigator.clipboard.writeText('contact@lumenlab.page').then(()=>{dsay.textContent='메일 앱을 열어요. 주소도 복사해 뒀어요';},()=>{});}catch(err){}
  clearTimeout(door._t);door._t=setTimeout(()=>{door.classList.remove('open');dsay.classList.remove('on');},5000);
  setTimeout(()=>{location.href=href;},reduce?0:550);});
const days='일월화수목금토';
function tick(){const d=new Date();let h=d.getHours();const ap=h<12?'오전':'오후';h=h%12||12;const m=String(d.getMinutes()).padStart(2,'0');const ds=(d.getMonth()+1)+'월 '+d.getDate()+'일 ';
  document.querySelectorAll('[data-clock]').forEach(el=>{el.querySelector('small').textContent=ap;el.querySelector('b').textContent=h+':'+m;el.querySelector('span').textContent=ds+days[d.getDay()]+'요일';});
  document.querySelectorAll('[data-bartime]').forEach(el=>el.textContent=ds+'('+days[d.getDay()]+') '+ap+' '+h+':'+m);}
tick();setInterval(tick,15000);
window.wallCycle=function(root){const imgs=[...root.querySelectorAll('.wall img')];let i=0,id=0;if(imgs[0])imgs[0].classList.add('on');
  return{start(){if(id||reduce||imgs.length<2)return;id=setInterval(()=>{imgs[i].classList.remove('on');i=(i+1)%imgs.length;imgs[i].classList.add('on');},5200);},stop(){clearInterval(id);id=0;}};};
})();

(function(){
const cv=document.getElementById('scene'), hero=document.getElementById('hero');
const ctx=cv.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=0,H=0,D=1,bg=null,wins=[],stars=[],motes=[],G={},t0=performance.now(),shoot=null,lastAuto=0,raf=0;
function rnd(seed){let s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function lg(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function rg(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}

function bricks(c,x,y,w,h,bh,col){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();const bw=bh*2.6;let row=0;
  for(let yy=y;yy<y+h;yy+=bh,row++){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x,yy,w,1);
    for(let xx=x-(row%2?bw/2:0);xx<x+w;xx+=bw){c.fillStyle='rgba(0,0,0,.22)';c.fillRect(xx,yy,1,bh);
      const k=Math.sin(xx*12.9898+yy*78.233)*43758.5453;const f=k-Math.floor(k);
      if(f>.62){c.fillStyle=col[0];c.fillRect(xx+1,yy+1,bw-1,bh-1);}else if(f<.2){c.fillStyle=col[1];c.fillRect(xx+1,yy+1,bw-1,bh-1);}
      c.fillStyle='rgba(255,255,255,.035)';c.fillRect(xx+1,yy+1,bw-1,1);}}
  c.restore();}

function building(c,R,x,w,top,gy,base,isNear){
  c.fillStyle=lg(c,0,top,0,gy,[[0,base[0]],[1,base[1]]]);c.fillRect(x,top,w,gy-top);
  if(isNear)bricks(c,x,top,w,gy-top,Math.max(5,H*.0075),['rgba(255,255,255,.03)','rgba(0,0,0,.12)']);
  // cornice
  c.fillStyle=base[2];c.fillRect(x-3,top-5,w+6,7);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x,top+2,w,4);
  // roof bits
  const k=R();if(k<.4){c.fillStyle=base[1];c.fillRect(x+w*.2,top-26,12,22);c.fillRect(x+w*.2-2,top-29,16,4);}
  else if(k<.75){c.fillStyle=base[1];c.fillRect(x+w*.55,top-30,w*.28,18);c.beginPath();c.moveTo(x+w*.53,top-30);c.lineTo(x+w*.69,top-42);c.lineTo(x+w*.85,top-30);c.fill();c.fillRect(x+w*.58,top-12,2,8);c.fillRect(x+w*.78,top-12,2,8);}
  else{c.strokeStyle=base[2];c.lineWidth=1.2;c.beginPath();c.moveTo(x+w*.7,top-4);c.lineTo(x+w*.7,top-38);c.moveTo(x+w*.7-8,top-30);c.lineTo(x+w*.7+8,top-30);c.moveTo(x+w*.7-5,top-24);c.lineTo(x+w*.7+5,top-24);c.stroke();}
  // windows
  const ww=Math.max(18,Math.min(34,w*.2)),wh=ww*1.45,cols=Math.max(1,Math.floor((w-14)/(ww+14))),gapx=(w-cols*ww)/(cols+1);
  const rows=Math.floor((gy-top-30)/(wh+22));
  for(let r=0;r<rows;r++)for(let i=0;i<cols;i++){
    const wx=x+gapx+i*(ww+gapx),wy=top+24+r*(wh+22);
    if(wy+wh>gy-12)continue;
    c.fillStyle='rgba(0,0,0,.45)';rr(c,wx-2,wy-2,ww+4,wh+5,3);c.fill();
    c.fillStyle=lg(c,0,wy,0,wy+wh,[[0,'#17153a'],[1,'#0c0b22']]);rr(c,wx,wy,ww,wh,2);c.fill();
    c.fillStyle='rgba(160,150,255,.10)';c.beginPath();c.moveTo(wx,wy+wh*.55);c.lineTo(wx+ww*.7,wy);c.lineTo(wx+ww,wy);c.lineTo(wx,wy+wh);c.fill();
    c.fillStyle=base[2];c.fillRect(wx-3,wy+wh+1,ww+6,3);
    const pal=['255,196,104','255,170,120','255,214,150','214,170,255','255,150,170'];
    wins.push({x:wx,y:wy,w:ww,h:wh,a:0,on:R()<.16?1:0,col:pal[Math.floor(R()*pal.length)],k:R()});
  }
}

function build(){
  const r=hero.getBoundingClientRect();W=Math.round(r.width);H=Math.round(r.height);D=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*D;cv.height=H*D;wins=[];
  bg=document.createElement('canvas');bg.width=W*D;bg.height=H*D;const c=bg.getContext('2d');c.scale(D,D);
  const R=rnd(20261110);
  const gy=Math.round(H*.80), curb=Math.round(H*.835);
  const sw=Math.min(W*.80,600), x0=Math.round((W-sw)/2), x1=x0+sw, top=Math.round(H*.40);
  G={gy,curb,sw,x0,x1,top};window.SCENE=G;
  // sky
  c.fillStyle=lg(c,0,0,0,gy,[[0,'#070619'],[.32,'#120f3a'],[.62,'#2a1a5c'],[.84,'#5a2f78'],[1,'#8a4a84']]);c.fillRect(0,0,W,gy);
  // moon
  const mx=W*.80,my=H*.115,mr=Math.max(20,Math.min(W,H)*.052);G.mx=mx;G.my=my;G.mr=mr;
  c.fillStyle=rg(c,mx,my,mr*.6,mr*5,[[0,'rgba(255,236,200,.30)'],[.35,'rgba(214,170,255,.10)'],[1,'rgba(214,170,255,0)']]);c.fillRect(0,0,W,gy);
  c.fillStyle=rg(c,mx-mr*.3,my-mr*.3,0,mr*1.1,[[0,'#fff6dc'],[.8,'#f6dfae'],[1,'#e2c592']]);c.beginPath();c.arc(mx,my,mr,0,7);c.fill();
  c.fillStyle='rgba(190,150,110,.22)';[[.25,-.2,.22],[-.3,.25,.16],[.1,.42,.1],[-.42,-.28,.09]].forEach(k=>{c.beginPath();c.arc(mx+k[0]*mr,my+k[1]*mr,k[2]*mr,0,7);c.fill();});
  // cloud bands
  for(let i=0;i<5;i++){const cy=gy*(.34+R()*.42),cw=W*(.5+R()*.7),cx=R()*W;c.fillStyle=rg(c,cx,cy,0,cw*.5,[[0,'rgba(196,150,230,.12)'],[1,'rgba(196,150,230,0)']]);c.save();c.translate(cx,cy);c.scale(1,.12);c.translate(-cx,-cy);c.beginPath();c.arc(cx,cy,cw*.5,0,7);c.fill();c.restore();}
  // stars
  stars=[];const ns=Math.round(W*H/3600);for(let i=0;i<ns;i++){const y=Math.pow(R(),1.3)*H*.25;stars.push({x:R()*W,y,r:R()<.08?1.5:R()*.9+.3,p:R()*6.28,s:.6+R()*1.6});}
  // far skyline
  let fx=-10;while(fx<W){const fw=22+R()*46,fh=H*(.10+R()*.15);c.fillStyle='#3d2a6c';c.fillRect(fx,gy-H*.34-fh*.4,fw,H*.5);
    if(R()<.3){c.beginPath();c.moveTo(fx,gy-H*.34-fh*.4);c.lineTo(fx+fw/2,gy-H*.34-fh*.4-fw*.5);c.lineTo(fx+fw,gy-H*.34-fh*.4);c.fill();}
    for(let j=0;j<5;j++){if(R()<.5){c.fillStyle='rgba(255,206,130,'+(.25+R()*.4)+')';c.fillRect(fx+4+R()*(fw-8),gy-H*.34-fh*.4+8+R()*60,2,3);}}
    fx+=fw+R()*4;}
  c.fillStyle=lg(c,0,gy-H*.5,0,gy,[[0,'rgba(90,47,120,0)'],[1,'rgba(120,64,130,.55)']]);c.fillRect(0,gy-H*.5,W,H*.5);
  // neighbours left and right
  const pals=[['#231c49','#161233','#3a2e68'],['#2a1d4f','#1a1238','#44306f'],['#1d1b44','#12112e','#34316a'],['#2e2150','#1c1437','#4a3674']];
  let lx=x0-5;while(lx>-10){const w=Math.max(44,Math.min(150,sw*(.22+R()*.2)));const tp=top-H*(.02+R()*.13);building(c,R,lx-w,w,tp,gy,pals[Math.floor(R()*4)],true);lx-=w+3;}
  let rx=x1+5;while(rx<W+10){const w=Math.max(44,Math.min(150,sw*(.22+R()*.2)));const tp=top-H*(.01+R()*.12);building(c,R,rx,w,tp,gy,pals[Math.floor(R()*4)],true);rx+=w+3;}
  // ---- the workshop
  const fh=gy-top, mid=top+fh*.40, sb=mid+fh*.085; // sign band bottom
  c.fillStyle=lg(c,0,top,0,gy,[[0,'#3a2a63'],[1,'#2a1d4c']]);c.fillRect(x0,top,sw,fh);
  bricks(c,x0,top,sw,mid-top,Math.max(6,H*.0085),['rgba(255,220,180,.05)','rgba(0,0,0,.14)']);
  // parapet + chimney + tank
  c.fillStyle='#4b3879';c.fillRect(x0-6,top-9,sw+12,11);c.fillStyle='#5d4790';c.fillRect(x0-6,top-9,sw+12,2);c.fillStyle='rgba(0,0,0,.4)';c.fillRect(x0,top+2,sw,6);
  c.fillStyle='#241a45';c.fillRect(x0+sw*.12,top-44,sw*.07,36);c.fillStyle='#3a2a63';c.fillRect(x0+sw*.12-3,top-48,sw*.07+6,6);
  c.fillStyle='#241a45';rr(c,x0+sw*.66,top-50,sw*.16,34,4);c.fill();c.beginPath();c.moveTo(x0+sw*.65,top-50);c.lineTo(x0+sw*.74,top-64);c.lineTo(x0+sw*.83,top-50);c.fill();c.fillRect(x0+sw*.68,top-16,3,8);c.fillRect(x0+sw*.79,top-16,3,8);
  // upper windows (arched) — handled live for the middle one
  G.up=[];const uw=sw*.17,uh=(mid-top)*.62,uy=top+(mid-top)*.2;
  for(let i=0;i<3;i++){const ux=x0+sw*(.115+i*.30);
    c.fillStyle='#1b1338';c.beginPath();c.moveTo(ux-4,uy+uh+4);c.lineTo(ux-4,uy+uw*.5);c.arc(ux+uw/2,uy+uw*.5,uw/2+4,Math.PI,0);c.lineTo(ux+uw+4,uy+uh+4);c.fill();
    const lit=i===1;
    c.fillStyle=lit?lg(c,0,uy,0,uy+uh,[[0,'#ffd487'],[1,'#f09a55']]):lg(c,0,uy,0,uy+uh,[[0,'#1c1a48'],[1,'#0e0c26']]);
    c.beginPath();c.moveTo(ux,uy+uh);c.lineTo(ux,uy+uw*.5);c.arc(ux+uw/2,uy+uw*.5,uw/2,Math.PI,0);c.lineTo(ux+uw,uy+uh);c.fill();
    if(lit){c.fillStyle='rgba(120,50,60,.35)';c.fillRect(ux,uy+uw*.2,uw*.3,uh);c.fillRect(ux+uw*.7,uy+uw*.2,uw*.3,uh);c.fillStyle='#3b2440';c.beginPath();c.ellipse(ux+uw*.5,uy+uh-4,uw*.14,uh*.2,0,0,7);c.fill();c.fillRect(ux+uw*.42,uy+uh-8,uw*.16,8);}
    else{c.fillStyle='rgba(170,150,255,.10)';c.beginPath();c.moveTo(ux,uy+uh*.7);c.lineTo(ux+uw*.8,uy+uw*.1);c.lineTo(ux+uw,uy+uw*.3);c.lineTo(ux,uy+uh);c.fill();}
    c.strokeStyle='#1b1338';c.lineWidth=2;c.beginPath();c.moveTo(ux+uw/2,uy);c.lineTo(ux+uw/2,uy+uh);c.moveTo(ux,uy+uh*.5);c.lineTo(ux+uw,uy+uh*.5);c.stroke();
    c.fillStyle='#4b3879';c.fillRect(ux-7,uy+uh+3,uw+14,5);
    // flower box
    c.fillStyle='#1a2a2a';for(let k=0;k<7;k++){c.beginPath();c.arc(ux-3+k*(uw+6)/6,uy+uh+1-(k%2)*3,5,0,7);c.fill();}
    c.fillStyle=lit?'#ffb0c0':'#8a6fc0';for(let k=0;k<4;k++){c.beginPath();c.arc(ux+2+k*(uw-2)/3,uy+uh-3-(k%2)*3,1.8,0,7);c.fill();}
    G.up.push({x:ux,y:uy,w:uw,h:uh,lit});}
  // sign band
  c.fillStyle='#15102c';c.fillRect(x0,mid,sw,sb-mid);c.fillStyle='#4b3879';c.fillRect(x0,mid-3,sw,3);
  const fs=Math.round((sb-mid)*.52);c.font='600 '+fs+'px "Geist","Noto Sans KR",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
  try{c.letterSpacing=(fs*.32)+'px';}catch(e){}
  c.shadowColor='rgba(255,190,90,.9)';c.shadowBlur=14;c.fillStyle='#ffe2a6';c.fillText('LUMEN LAB',W/2+fs*.16,mid+(sb-mid)/2+1);c.shadowBlur=0;
  try{c.letterSpacing='0px';}catch(e){}
  // awning
  const ah=fh*.075,ay=sb;const n=Math.round(sw/26);const aw=sw/n;
  for(let i=0;i<n;i++){c.fillStyle=i%2?'#7a2f58':'#f0c98a';c.beginPath();c.moveTo(x0+i*aw,ay);c.lineTo(x0+(i+1)*aw,ay);c.lineTo(x0+(i+1)*aw+ (i+1-n/2)*.6,ay+ah);c.arc(x0+(i+.5)*aw+(i+.5-n/2)*.6,ay+ah,aw/2,0,Math.PI);c.lineTo(x0+i*aw+(i-n/2)*.6,ay+ah);c.fill();}
  c.fillStyle=lg(c,0,ay,0,ay+ah+aw/2,[[0,'rgba(10,6,30,.55)'],[1,'rgba(10,6,30,.1)']]);c.fillRect(x0-8,ay,sw+16,ah+aw/2);
  // ground floor frame
  const gt=ay+ah*.6, pad=sw*.045, dw=sw*.2, wx=x0+pad, ww=sw-pad*3-dw, wy=gt+fh*.05, wh=gy-wy-fh*.085;
  G.win={x:wx,y:wy,w:ww,h:wh};
  c.fillStyle='#22183f';c.fillRect(x0,gt,sw,gy-gt);
  // interior
  c.save();rr(c,wx,wy,ww,wh,4);c.clip();
  c.fillStyle=lg(c,0,wy,0,wy+wh,[[0,'#ffcf7a'],[.55,'#f6a85a'],[1,'#c96d42']]);c.fillRect(wx,wy,ww,wh);
  c.fillStyle=rg(c,wx+ww*.5,wy+wh*.25,0,ww*.7,[[0,'rgba(255,244,200,.75)'],[1,'rgba(255,244,200,0)']]);c.fillRect(wx,wy,ww,wh);
  // back shelves
  const obj=['#7a3550','#3f6a7a','#e9d9b0','#5a4a8a','#b85a4a','#f2c14e','#3d7a5a','#c98aa8'];
  for(let s=0;s<2;s++){const sy=wy+wh*(.30+s*.22);c.fillStyle='#8a4a34';c.fillRect(wx+ww*.04,sy,ww*.52,3.5);c.fillStyle='rgba(90,40,30,.35)';c.fillRect(wx+ww*.04,sy+3.5,ww*.52,3);
    let ox=wx+ww*.06;while(ox<wx+ww*.52){const ow=6+R()*13,oh=10+R()*wh*.11,t=R();c.fillStyle=obj[Math.floor(R()*obj.length)];
      if(t<.35){rr(c,ox,sy-oh,ow,oh,2);c.fill();c.fillStyle='rgba(255,255,255,.25)';c.fillRect(ox+1.5,sy-oh+2,1.5,oh-4);}
      else if(t<.6){c.beginPath();c.arc(ox+ow/2,sy-ow/2,ow/2,0,7);c.fill();}
      else if(t<.8){c.fillRect(ox,sy-oh,ow*.45,oh);c.fillStyle=obj[Math.floor(R()*obj.length)];c.fillRect(ox+ow*.5,sy-oh*.85,ow*.45,oh*.85);}
      else{c.beginPath();c.moveTo(ox,sy);c.lineTo(ox+ow/2,sy-oh);c.lineTo(ox+ow,sy);c.fill();}
      ox+=ow+3+R()*7;}}
  // a round yellow toy and a small owl on the top shelf (nods to what is made here)
  const ty=wy+wh*.30;c.fillStyle='#ffd84a';c.beginPath();c.arc(wx+ww*.60,ty-9,9,0,7);c.fill();c.fillStyle='#ff9a3c';c.beginPath();c.moveTo(wx+ww*.60+7,ty-9);c.lineTo(wx+ww*.60+13,ty-7);c.lineTo(wx+ww*.60+7,ty-5);c.fill();c.fillStyle='#2a1a2a';c.beginPath();c.arc(wx+ww*.60+3,ty-11,1.4,0,7);c.fill();c.fillStyle='#8a4a34';c.fillRect(wx+ww*.56,ty,ww*.1,3.5);
  // pendant lamps
  G.lamps=[];[.2,.5,.8].forEach((p,i)=>{const lx=wx+ww*p,ly=wy+wh*(.13+(i%2)*.04);c.strokeStyle='#5a2d2a';c.lineWidth=1.5;c.beginPath();c.moveTo(lx,wy);c.lineTo(lx,ly);c.stroke();c.fillStyle='#4a2330';c.beginPath();c.moveTo(lx-11,ly+9);c.quadraticCurveTo(lx,ly-10,lx+11,ly+9);c.fill();c.fillStyle='#fffbe6';c.beginPath();c.arc(lx,ly+9,4,0,7);c.fill();G.lamps.push({x:lx,y:ly+9});});
  // workbench + monitor + lamp + plant
  const by=wy+wh*.74;c.fillStyle='#5b2c26';c.fillRect(wx+ww*.5,by,ww*.46,5);c.fillRect(wx+ww*.53,by,4,wh);c.fillRect(wx+ww*.91,by,4,wh);
  const mw=ww*.2,mh=mw*.64,mxx=wx+ww*.63,myy=by-mh-9;c.fillStyle='#2a1a2e';rr(c,mxx-3,myy-3,mw+6,mh+6,4);c.fill();c.fillRect(mxx+mw/2-3,by-9,6,9);c.fillRect(mxx+mw/2-12,by-3,24,3);
  c.fillStyle=lg(c,0,myy,0,myy+mh,[[0,'#232a5c'],[1,'#3b2a6e']]);c.fillRect(mxx,myy,mw,mh);
  [['#ffd84a',.08,.15,.2,.5],['#8fd3ff',.34,.15,.56,.12],['#ff9ab0',.34,.36,.4,.1],['#b6f09c',.34,.55,.5,.1],['#ffffff',.08,.74,.82,.08]].forEach(k=>{c.fillStyle=k[0];rr(c,mxx+mw*k[1],myy+mh*k[2],mw*k[3],mh*k[4],1.5);c.fill();});
  G.mon={x:mxx,y:myy,w:mw,h:mh};
  c.strokeStyle='#3a1f24';c.lineWidth=2;c.beginPath();c.moveTo(wx+ww*.56,by);c.lineTo(wx+ww*.545,by-22);c.lineTo(wx+ww*.585,by-36);c.stroke();c.fillStyle='#3a1f24';c.beginPath();c.moveTo(wx+ww*.575,by-42);c.lineTo(wx+ww*.615,by-34);c.lineTo(wx+ww*.6,by-28);c.fill();
  c.fillStyle='#7a3b2e';rr(c,wx+ww*.86,by-13,13,13,2);c.fill();c.fillStyle='#2f5a48';[[-6,-22,7],[6,-26,8],[0,-34,7],[-9,-34,5],[10,-38,5]].forEach(k=>{c.beginPath();c.arc(wx+ww*.86+6.5+k[0],by+k[1],k[2],0,7);c.fill();});
  // tall plant left, stool
  c.fillStyle='#7a3b2e';rr(c,wx+ww*.08,wy+wh-26,22,26,3);c.fill();c.fillStyle='#285041';for(let k=0;k<7;k++){const a=-1.9+k*.33;c.save();c.translate(wx+ww*.08+11,wy+wh-24);c.rotate(a+1.57);c.beginPath();c.ellipse(0,-wh*.18,5,wh*.18,0,0,7);c.fill();c.restore();}
  c.fillStyle='#5b2c26';c.fillRect(wx+ww*.30,wy+wh*.8,ww*.1,4);c.fillRect(wx+ww*.31,wy+wh*.8,3,wh);c.fillRect(wx+ww*.385,wy+wh*.8,3,wh);
  // floor
  c.fillStyle='rgba(120,50,40,.5)';c.fillRect(wx,wy+wh*.93,ww,wh*.07);
  // glass sheen
  c.fillStyle='rgba(255,255,255,.07)';c.beginPath();c.moveTo(wx+ww*.1,wy);c.lineTo(wx+ww*.28,wy);c.lineTo(wx+ww*.06,wy+wh);c.lineTo(wx-ww*.1,wy+wh);c.fill();c.beginPath();c.moveTo(wx+ww*.34,wy);c.lineTo(wx+ww*.38,wy);c.lineTo(wx+ww*.16,wy+wh);c.lineTo(wx+ww*.12,wy+wh);c.fill();
  c.restore();
  // mullions
  c.strokeStyle='#1a1233';c.lineWidth=5;rr(c,wx,wy,ww,wh,4);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(wx+ww/3,wy);c.lineTo(wx+ww/3,wy+wh);c.moveTo(wx+ww*2/3,wy);c.lineTo(wx+ww*2/3,wy+wh);c.moveTo(wx,wy+wh*.2);c.lineTo(wx+ww,wy+wh*.2);c.stroke();
  // window sill planter
  c.fillStyle='#1a1233';c.fillRect(wx-6,wy+wh+2,ww+12,6);
  c.fillStyle='#18302c';for(let k=0;k<Math.round(ww/9);k++){c.beginPath();c.arc(wx+k*9+4,wy+wh+2-(k%3)*2.5,6,0,7);c.fill();}
  ['#ffd0a0','#ffb0c0','#fff0c0'].forEach((col,j)=>{c.fillStyle=col;for(let k=j;k<Math.round(ww/9);k+=3){c.beginPath();c.arc(wx+k*9+4,wy+wh-3-(k%2)*3,1.9,0,7);c.fill();}});
  // door
  const dx=x1-pad-dw,dy=wy-fh*.01,dh=gy-dy;c.fillStyle='#1a1233';rr(c,dx-4,dy-4,dw+8,dh+4,5);c.fill();c.fillStyle='#6a2c4e';rr(c,dx,dy,dw,dh,3);c.fill();
  c.fillStyle=lg(c,0,dy,0,dy+dh*.6,[[0,'#ffcf7a'],[1,'#e58a4e']]);rr(c,dx+dw*.16,dy+dh*.08,dw*.68,dh*.5,3);c.fill();
  c.fillStyle='rgba(255,255,255,.1)';c.beginPath();c.moveTo(dx+dw*.2,dy+dh*.5);c.lineTo(dx+dw*.6,dy+dh*.08);c.lineTo(dx+dw*.75,dy+dh*.08);c.lineTo(dx+dw*.3,dy+dh*.58);c.fill();
  c.fillStyle='#1a1233';rr(c,dx+dw*.3,dy+dh*.2,dw*.4,dh*.09,2);c.fill();c.fillStyle='#ffe2a6';c.font='600 '+Math.max(7,dh*.045)+'px "Geist",system-ui,sans-serif';c.fillText('OPEN',dx+dw*.5,dy+dh*.247);
  c.fillStyle='#4a1d38';rr(c,dx+dw*.16,dy+dh*.66,dw*.68,dh*.26,3);c.fill();c.fillStyle='#ffd98a';c.beginPath();c.arc(dx+dw*.86,dy+dh*.6,2.6,0,7);c.fill();
  G.door={x:dx,y:dy,w:dw,h:dh};
  // wall lantern beside door
  const lnx=dx-pad*.5,lny=wy-2;c.fillStyle='#1a1233';c.fillRect(lnx-1,lny-10,2,10);rr(c,lnx-5,lny,10,13,2);c.fill();c.fillStyle='#fff3c8';c.fillRect(lnx-3,lny+2,6,9);G.lan={x:lnx,y:lny+6};
  // pavement
  c.fillStyle=lg(c,0,gy,0,curb,[[0,'#3a2a5e'],[1,'#241a45']]);c.fillRect(0,gy,W,curb-gy);
  c.fillStyle='rgba(0,0,0,.3)';for(let px=-20;px<W;px+=46){c.fillRect(px,gy,1,curb-gy);}
  c.fillStyle='#4a3777';c.fillRect(0,gy,W,1.5);c.fillStyle='#17102e';c.fillRect(0,curb-3,W,3);
  // step
  c.fillStyle='#4a3777';c.fillRect(dx-6,gy-4,dw+12,5);
  // cat on the pavement
  const cx=wx+ww*.18,cy=gy+ (curb-gy)*.25;c.fillStyle='#120c24';c.beginPath();c.ellipse(cx,cy-9,9,10,0,0,7);c.fill();c.beginPath();c.arc(cx-1,cy-23,6.5,0,7);c.fill();c.beginPath();c.moveTo(cx-7,cy-26);c.lineTo(cx-6,cy-34);c.lineTo(cx-1,cy-28);c.moveTo(cx+5,cy-26);c.lineTo(cx+4,cy-34);c.lineTo(cx-1,cy-28);c.fill();c.strokeStyle='#120c24';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(cx+8,cy-3);c.quadraticCurveTo(cx+22,cy-2,cx+19,cy-14);c.stroke();
  // street lamp (foreground)
  const px=Math.max(18,x0-sw*.02), ph=H*.33;c.fillStyle='#0f0a22';c.fillRect(px-2.5,curb-ph,5,ph+2);c.fillRect(px-6,curb-6,12,8);c.beginPath();c.moveTo(px,curb-ph);c.quadraticCurveTo(px+4,curb-ph-18,px+20,curb-ph-16);c.lineTo(px+20,curb-ph-13);c.quadraticCurveTo(px+7,curb-ph-13,px+2.5,curb-ph+4);c.fill();
  rr(c,px+13,curb-ph-14,14,16,3);c.fill();c.fillStyle='#fff3c8';rr(c,px+15,curb-ph-11,10,11,2);c.fill();G.sl={x:px+20,y:curb-ph-5};
  // motes
  motes=[];for(let i=0;i<22;i++)motes.push({x:wx+R()*ww,y:wy+R()*(wh+60),r:.4+R()*.8,p:R()*6.28,s:.2+R()*.5});
}

function glow(x,y,r,col,a){ctx.fillStyle=rg(ctx,x,y,0,r,[[0,'rgba('+col+','+a+')'],[.4,'rgba('+col+','+(a*.35)+')'],[1,'rgba('+col+',0)']]);ctx.fillRect(x-r,y-r,r*2,r*2);}

let rc=null,rx=null;
function frame(now){
  if(window.__scenePaused){raf=requestAnimationFrame(frame);return;}
  const t=(now-t0)/1000;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bg,0,0);ctx.setTransform(D,0,0,D,0,0);
  const {gy,curb,sw,win,door}=G;
  // stars
  for(const s of stars){const a=.35+.65*Math.abs(Math.sin(t*s.s+s.p));ctx.fillStyle='rgba(255,246,230,'+a.toFixed(2)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
  // shooting star
  if(!shoot&&!reduce&&Math.sin(t*.7)>.995)shoot={x:W*(.1+Math.random()*.5),y:H*(.04+Math.random()*.12),t};
  if(shoot){const k=(t-shoot.t)/.9;if(k>1)shoot=null;else{const x=shoot.x+k*W*.35,y=shoot.y+k*H*.08;const g=ctx.createLinearGradient(x,y,x-60,y-14);g.addColorStop(0,'rgba(255,255,255,'+(1-k)+')');g.addColorStop(1,'rgba(255,255,255,0)');ctx.strokeStyle=g;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-60,y-14);ctx.stroke();}}
  // neighbour windows
  if(!reduce&&t-lastAuto>1.6){lastAuto=t;const w=wins[Math.floor(Math.random()*wins.length)];if(w&&!w.d)w.on=w.on?0:1;}
  ctx.globalCompositeOperation='lighter';
  for(const w of wins){if(w.d!==undefined&&t>=w.d){w.on=w.to;w.d=undefined;}w.a+=(w.on-w.a)*.08;if(w.a<.01)continue;
    ctx.globalCompositeOperation='source-over';ctx.fillStyle=lg(ctx,0,w.y,0,w.y+w.h,[[0,'rgba('+w.col+','+w.a+')'],[1,'rgba('+w.col+','+(w.a*.75)+')']]);rr(ctx,w.x,w.y,w.w,w.h,2);ctx.fill();
    ctx.fillStyle='rgba(40,20,50,'+(w.a*.55)+')';ctx.fillRect(w.x+w.w/2-1,w.y,2,w.h);ctx.fillRect(w.x,w.y+w.h*.45,w.w,2);
    if(w.k>.5){ctx.fillStyle='rgba(60,30,60,'+(w.a*.5)+')';ctx.fillRect(w.x,w.y,w.w*.22,w.h);ctx.fillRect(w.x+w.w*.78,w.y,w.w*.22,w.h);}
    ctx.globalCompositeOperation='lighter';glow(w.x+w.w/2,w.y+w.h/2,w.w*2.2,w.col,.16*w.a);}
  // warm light
  const fl=reduce?1:.94+.06*Math.sin(t*2.3)*Math.sin(t*.7+1);
  glow(win.x+win.w/2,win.y+win.h*.5,sw*.95,'255,186,96',.34*fl);
  glow(door.x+door.w/2,door.y+door.h*.35,sw*.3,'255,186,96',.22*fl);
  for(const l of G.lamps)glow(l.x,l.y,26,'255,244,200',.7*fl);
  glow(G.lan.x,G.lan.y,46,'255,220,150',.55*fl);glow(G.sl.x,G.sl.y,sw*.3,'255,214,150',.42);glow(G.sl.x,G.sl.y,18,'255,250,225',.9);
  glow(G.mon.x+G.mon.w/2,G.mon.y+G.mon.h/2,G.mon.w,'150,170,255',.25);
  for(const u of G.up)if(u.lit)glow(u.x+u.w/2,u.y+u.h/2,u.w*1.6,'255,186,96',.22*fl);
  glow(G.mx,G.my,G.mr*2.2,'255,236,200',.10+.03*Math.sin(t*.5));
  // light spill on pavement
  ctx.fillStyle=lg(ctx,0,gy,0,curb,[[0,'rgba(255,190,100,'+(.42*fl)+')'],[1,'rgba(255,190,100,'+(.16*fl)+')']]);ctx.beginPath();ctx.moveTo(win.x,gy);ctx.lineTo(door.x+door.w,gy);ctx.lineTo(door.x+door.w+sw*.12,curb);ctx.lineTo(win.x-sw*.12,curb);ctx.fill();
  // motes
  for(const m of motes){const yy=m.y-((t*m.s*9)%60),xx=m.x+Math.sin(t*m.s+m.p)*8;const a=.25+.35*Math.sin(t*m.s*2+m.p);if(a>0){ctx.fillStyle='rgba(255,236,190,'+a.toFixed(2)+')';ctx.beginPath();ctx.arc(xx,yy,m.r,0,7);ctx.fill();}}
  ctx.globalCompositeOperation='source-over';
  // wet street reflection: mirror what is above the curb
  // (캔버스를 자기 자신에 줄마다 그리면 사파리가 줄마다 캔버스 전체를 복사한다 → 비칠 띠만 한 번 떠 두고 거기서 그림)
  const sh=H-curb,top0=Math.max(0,Math.floor(curb-3-sh*1.55-4)),bh=Math.ceil((curb-top0)*D);
  if(!rc){rc=document.createElement('canvas');rx=rc.getContext('2d');}
  if(rc.width!==W*D||rc.height!==bh){rc.width=W*D;rc.height=bh;}
  rx.clearRect(0,0,rc.width,bh);rx.drawImage(cv,0,top0*D,W*D,bh,0,0,W*D,bh);
  ctx.fillStyle='#0a0718';ctx.fillRect(0,curb,W,sh);
  const step=2;for(let y=0;y<sh;y+=step){const sy=curb-3-y*1.55;if(sy<top0)break;const dx=reduce?0:Math.sin(y*.16+t*1.4)*(.5+y*.012)+Math.sin(y*.05-t*.7)*1.2;
    ctx.drawImage(rc,0,Math.round((sy-top0)*D),W*D,Math.max(1,Math.round(step*1.55*D)),dx,curb+y,W,step+.6);}
  ctx.fillStyle=lg(ctx,0,curb,0,H,[[0,'rgba(10,7,26,.30)'],[.5,'rgba(8,6,20,.52)'],[1,'rgba(6,6,12,.94)']]);ctx.fillRect(0,curb,W,sh);
  // glints on the wet road
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<14;i++){const gx=win.x+((i*97.3)%(win.w+door.w+40)),gyy=curb+8+((i*53.7)%(sh*.75));const a=.10+.10*Math.sin(t*1.3+i);ctx.fillStyle='rgba(255,214,150,'+Math.max(0,a).toFixed(2)+')';ctx.fillRect(gx,gyy,18+((i*13)%26),1.2);}
  ctx.globalCompositeOperation='source-over';
  // low mist
  const mxo=reduce?0:Math.sin(t*.12)*40;ctx.fillStyle=rg(ctx,W*.3+mxo,gy-10,0,W*.9,[[0,'rgba(190,150,220,.10)'],[1,'rgba(190,150,220,0)']]);ctx.save();ctx.translate(0,gy-10);ctx.scale(1,.13);ctx.translate(0,-(gy-10));ctx.fillRect(-W,gy-10-W*8,W*3,W*16);ctx.restore();
  // top + bottom vignette for text and for the seam into the page
  ctx.fillStyle=lg(ctx,0,0,0,H*.3,[[0,'rgba(5,5,14,.55)'],[1,'rgba(5,5,14,0)']]);ctx.fillRect(0,0,W,H*.3);
  ctx.fillStyle=lg(ctx,0,H-70,0,H,[[0,'rgba(6,6,12,0)'],[1,'rgba(6,6,12,1)']]);ctx.fillRect(0,H-70,W,70);
  if(!reduce)raf=requestAnimationFrame(frame);
}
function wave(px,py){const lit=wins.filter(w=>w.on).length>wins.length*.6;const now=(performance.now()-t0)/1000;for(const w of wins){const d=Math.hypot(w.x-px,w.y-py);w.d=now+d/420;w.to=lit?(Math.random()<.12?1:0):1;}}
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect();wave(e.clientX-r.left,e.clientY-r.top);const h=document.getElementById('hint');if(h)h.classList.add('gone');if(reduce){setTimeout(()=>{wins.forEach(w=>{w.on=w.to;w.a=w.on;w.d=undefined});frame(performance.now())},50);}});
function start(){cancelAnimationFrame(raf);build();if(reduce){wins.forEach(w=>w.a=w.on);}raf=requestAnimationFrame(frame);window.dispatchEvent(new Event('scene:built'));}
let lw=0,rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.abs(innerWidth-lw)>8){lw=innerWidth;start();}},180);});
// 간판 글꼴(Geist)을 기다리되 0.9초까지만. 늦게 오면 받은 뒤 한 번 다시 그린다(그동안은 기본 글꼴)
lw=innerWidth;if(document.fonts&&document.fonts.load){let late=false;const tm=setTimeout(()=>{late=true;start();},900);document.fonts.load('600 20px Geist').catch(()=>{}).then(()=>{if(!late){clearTimeout(tm);start();}else if(document.fonts.check('600 20px Geist'))start();});}else start();
})();

(function(){
/* 작업실 안: 창(밖은 밤 거리), 선반, 매단 등 셋, 작업대. 첫 화면 창 속 그림과 같은 색·같은 자리 */
const cv=document.getElementById('room');if(!cv)return;const ctx=cv.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=0,H=0,D=1,bg=null,motes=[],lamps=[],deskY=0,raf=0,t0=performance.now();
function rnd(s){s>>>=0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function lg(c,x0,y0,x1,y1,s){const g=c.createLinearGradient(x0,y0,x1,y1);s.forEach(k=>g.addColorStop(k[0],k[1]));return g;}
function rg(c,x,y,r0,r1,s){const g=c.createRadialGradient(x,y,r0,x,y,r1);s.forEach(k=>g.addColorStop(k[0],k[1]));return g;}
function build(){
  W=cv.clientWidth;H=cv.clientHeight;if(!W||!H)return;D=Math.min(2,window.devicePixelRatio||1);cv.width=W*D;cv.height=H*D;
  const pc=W>=860,low=W>=600&&H<=560;deskY=Math.round(pc||low?H*.80:H-176);window.ROOM={deskY,pc};
  bg=document.createElement('canvas');bg.width=W*D;bg.height=H*D;const c=bg.getContext('2d');c.scale(D,D);const R=rnd(1119);
  // 벽
  c.fillStyle=lg(c,0,0,0,deskY,[[0,'#1a0b08'],[.35,'#3e1c12'],[.75,'#6a3219'],[1,'#7e3d1f']]);c.fillRect(0,0,W,deskY);
  for(let i=0;i<900;i++){c.fillStyle='rgba(255,220,180,'+(R()*.03).toFixed(3)+')';c.fillRect(R()*W,R()*deskY,1+R()*2,1+R()*2);}
  const wb=deskY*.58;for(let x=0;x<W;x+=pc?46:32){c.fillStyle='rgba(0,0,0,.14)';c.fillRect(x,wb,1.4,deskY-wb);c.fillStyle='rgba(255,210,160,.05)';c.fillRect(x+1.4,wb,1,deskY-wb);}
  c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,wb-4,W,4);c.fillStyle='rgba(255,214,170,.10)';c.fillRect(0,wb-5,W,1.4);
  // 창: 밖은 들어온 그 밤 거리
  const wx=Math.round(pc?W*.06:W*.06),wy=Math.round(pc?H*.10:H*.135),ww=Math.round(pc?W*.17:W*.34),wh=Math.round(pc?H*.30:H*.25);
  c.fillStyle='#160a07';rr(c,wx-9,wy-9,ww+18,wh+18,6);c.fill();
  c.save();rr(c,wx,wy,ww,wh,3);c.clip();
  c.fillStyle=lg(c,0,wy,0,wy+wh,[[0,'#08071c'],[.6,'#22174e'],[1,'#4a2a6a']]);c.fillRect(wx,wy,ww,wh);
  for(let i=0;i<40;i++){c.fillStyle='rgba(255,246,230,'+(.3+R()*.6).toFixed(2)+')';c.fillRect(wx+R()*ww,wy+R()*wh*.45,R()<.1?1.6:1,R()<.1?1.6:1);}
  c.fillStyle='#fff3d6';c.beginPath();c.arc(wx+ww*.76,wy+wh*.2,Math.max(6,ww*.07),0,7);c.fill();
  let bx=wx-6;while(bx<wx+ww){const bw=14+R()*30,bh=wh*(.25+R()*.35);c.fillStyle=R()<.5?'#1c1440':'#241a4e';c.fillRect(bx,wy+wh-bh,bw,bh);
    for(let j=0;j<6;j++)if(R()<.45){c.fillStyle='rgba(255,200,120,'+(.5+R()*.5).toFixed(2)+')';c.fillRect(bx+3+R()*(bw-7),wy+wh-bh+6+R()*(bh-12),3,4);}
    bx+=bw+2;}
  c.fillStyle='rgba(255,255,255,.06)';c.beginPath();c.moveTo(wx+ww*.15,wy);c.lineTo(wx+ww*.35,wy);c.lineTo(wx+ww*.05,wy+wh);c.lineTo(wx-ww*.15,wy+wh);c.fill();
  c.restore();
  c.strokeStyle='#160a07';c.lineWidth=5;c.beginPath();c.moveTo(wx+ww/2,wy);c.lineTo(wx+ww/2,wy+wh);c.moveTo(wx,wy+wh*.45);c.lineTo(wx+ww,wy+wh*.45);c.stroke();
  c.fillStyle='#2a140c';c.fillRect(wx-14,wy+wh+8,ww+28,7);
  // 창턱 화분
  const px=wx+ww*.72;c.fillStyle='#8a4030';rr(c,px,wy+wh-6,24,14,2);c.fill();c.fillStyle='#2f5a48';[[4,-10,8],[14,-14,9],[22,-8,7],[10,-22,6]].forEach(k=>{c.beginPath();c.arc(px+k[0],wy+wh-6+k[1],k[2],0,7);c.fill();});
  // 선반(오른쪽 벽): 흐리게 = 깊이
  const sx0=pc?W*.60:W*.50,sx1=W*.985;const obj=['#7a3550','#3f6a7a','#e9d9b0','#5a4a8a','#b85a4a','#f2c14e','#3d7a5a','#c98aa8'];
  for(let s=0;s<2;s++){const sy=Math.round(H*(pc?.20+s*.17:.16+s*.13));
    let ox=sx0+6;while(ox<sx1-14){const ow=7+R()*(pc?20:13),oh=10+R()*H*(pc?.07:.05),t=R();c.fillStyle=obj[Math.floor(R()*obj.length)];
      if(t<.35){rr(c,ox,sy-oh,ow,oh,2);c.fill();c.fillStyle='rgba(255,255,255,.22)';c.fillRect(ox+1.5,sy-oh+2,1.5,oh-4);}
      else if(t<.6){c.beginPath();c.arc(ox+ow/2,sy-ow/2,ow/2,0,7);c.fill();}
      else if(t<.82){c.fillRect(ox,sy-oh,ow*.45,oh);c.fillStyle=obj[Math.floor(R()*obj.length)];c.fillRect(ox+ow*.5,sy-oh*.85,ow*.45,oh*.85);}
      else{c.beginPath();c.moveTo(ox,sy);c.lineTo(ox+ow/2,sy-oh);c.lineTo(ox+ow,sy);c.fill();}
      ox+=ow+3+R()*8;}
    c.fillStyle='#8a4a34';c.fillRect(sx0,sy,sx1-sx0,5);c.fillStyle='rgba(40,12,6,.55)';c.fillRect(sx0,sy+5,sx1-sx0,6);
    c.fillStyle='#5a2c1e';c.fillRect(sx0+12,sy+5,4,14);c.fillRect(sx1-18,sy+5,4,14);}
  // 매단 등 셋 (첫 화면 창 속 20·50·80% 자리)
  lamps=[];[.22,.5,.8].forEach((p,i)=>{const lx=W*p,ly=Math.round(H*(pc?.07:.055)+(i%2)*H*.025);c.strokeStyle='#2a120c';c.lineWidth=1.6;c.beginPath();c.moveTo(lx,0);c.lineTo(lx,ly);c.stroke();
    const sw=pc?26:18;c.fillStyle='#3a1a1a';c.beginPath();c.moveTo(lx-sw,ly+sw*.75);c.quadraticCurveTo(lx,ly-sw*.85,lx+sw,ly+sw*.75);c.closePath();c.fill();
    c.fillStyle='rgba(255,210,150,.25)';c.fillRect(lx-sw,ly+sw*.72,sw*2,2);lamps.push({x:lx,y:ly+sw*.8,s:sw});});
  // 작업대: 윗면(원근) + 앞면
  const top=pc?22:16;c.fillStyle=lg(c,0,deskY-top,0,deskY,[[0,'#7a4126'],[1,'#a35a31']]);c.fillRect(0,deskY-top,W,top);
  c.fillStyle='rgba(30,10,4,.35)';c.fillRect(0,deskY-top,W,2);
  c.fillStyle=lg(c,0,deskY,0,H,[[0,'#4c2514'],[.4,'#33180d'],[1,'#1a0b06']]);c.fillRect(0,deskY,W,H-deskY);
  c.fillStyle='rgba(255,206,150,.40)';c.fillRect(0,deskY,W,1.6);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,deskY+1.6,W,3);
  for(let i=0;i<(pc?16:11);i++){const y0=deskY+8+i*((H-deskY)/(pc?16:11));c.strokeStyle='rgba(0,0,0,'+(.08+R()*.08).toFixed(2)+')';c.lineWidth=1;c.beginPath();c.moveTo(0,y0);
    for(let x=0;x<=W;x+=40)c.lineTo(x,y0+Math.sin(x*.013+i*1.7)*3+Math.sin(x*.041+i)*1.2);c.stroke();}
  for(let i=0;i<(pc?9:6);i++){const y0=deskY-top+3+i*(top/(pc?9:6));c.strokeStyle='rgba(60,20,8,.18)';c.beginPath();c.moveTo(0,y0);for(let x=0;x<=W;x+=50)c.lineTo(x,y0+Math.sin(x*.02+i)*1.1);c.stroke();}
  motes=[];for(let i=0;i<(pc?60:34);i++)motes.push({x:R()*W,y:R()*deskY,r:.5+R()*1.1,p:R()*6.28,s:.15+R()*.45});
}
function glow(x,y,r,col,a){ctx.fillStyle=rg(ctx,x,y,0,r,[[0,'rgba('+col+','+a+')'],[.45,'rgba('+col+','+(a*.32)+')'],[1,'rgba('+col+',0)']]);ctx.fillRect(x-r,y-r,r*2,r*2);}
function frame(now){
  if(window.__roomPaused){raf=requestAnimationFrame(frame);return;}
  if(!bg){raf=requestAnimationFrame(frame);return;}
  const t=(now-t0)/1000;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bg,0,0);ctx.setTransform(D,0,0,D,0,0);
  const fl=reduce?1:.95+.05*Math.sin(t*2.1)*Math.sin(t*.6+1);
  ctx.globalCompositeOperation='lighter';
  glow(W*.5,H*.34,Math.max(W,H)*.62,'255,170,90',.30*fl);
  for(const l of lamps){glow(l.x,l.y,l.s*1.3,'255,248,215',.95);glow(l.x,l.y,l.s*7,'255,196,110',.30*fl);
    ctx.fillStyle=lg(ctx,0,l.y,0,deskY,[[0,'rgba(255,200,120,'+(.10*fl)+')'],[1,'rgba(255,200,120,0)']]);ctx.beginPath();ctx.moveTo(l.x-l.s*.9,l.y);ctx.lineTo(l.x+l.s*.9,l.y);ctx.lineTo(l.x+l.s*6,deskY);ctx.lineTo(l.x-l.s*6,deskY);ctx.fill();}
  // 작업대 위 빛 웅덩이
  const top=window.ROOM.pc?22:16;ctx.save();ctx.translate(W*.5,deskY-top*.5);ctx.scale(1,.09);glow(0,0,W*.55,'255,214,150',.55*fl);ctx.restore();
  for(const m of motes){const yy=(m.y-((t*m.s*10)%(deskY*.4))+deskY)%deskY,xx=m.x+Math.sin(t*m.s+m.p)*10;const a=.18+.3*Math.sin(t*m.s*2+m.p);if(a>0){ctx.fillStyle='rgba(255,232,190,'+a.toFixed(2)+')';ctx.beginPath();ctx.arc(xx,yy,m.r,0,7);ctx.fill();}}
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=lg(ctx,0,H-60,0,H,[[0,'rgba(10,4,2,0)'],[1,'rgba(10,4,2,.55)']]);ctx.fillRect(0,H-60,W,60);
  if(!reduce)raf=requestAnimationFrame(frame);
}
function start(){cancelAnimationFrame(raf);build();raf=requestAnimationFrame(frame);}
let lw=0,rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Math.abs(innerWidth-lw)>8){lw=innerWidth;start();}},180);});
lw=innerWidth;start();
window.roomRedraw=()=>{if(reduce)requestAnimationFrame(frame);};
})();

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
   PC 휠·트랙패드는 아래 '턱'(onWheel) 참고. 키는 브라우저 그대로.
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
  const dy=e.touches[0].clientY-ty0,dx=e.touches[0].clientX-tx0;
  if(tDone){if(e.cancelable)e.preventDefault();return;}   // 이 손가락은 이미 한 작품을 넘김: 남은 움직임은 버린다
  if(ride){if(e.cancelable)e.preventDefault();if(Math.abs(dy)>10){tDone=true;go(dy<0?1:-1);}return;}
  if(Math.abs(dy)<3||Math.abs(dx)>Math.abs(dy))return;
  if(intent(dy<0?1:-1)){tDone=true;if(e.cancelable)e.preventDefault();}}
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
  const f=.35+.65*sm(cl((n-.03)/.25));
  wT=cl(wT+dy*f,a,z);wDir=dy>0?1:-1;wGo();
  clearTimeout(wIdle);wIdle=setTimeout(wSettle,220);}
function wSettle(){if(ride||!fine.matches)return;
  for(const v of stops())if((v-wStart)*(wT-v)>0&&Math.abs(wT-v)/vhNow()<.12){wT=v;wC=scrollY;wGo();return;}   // 이번 손짓에 살짝 지나친 멈춤 자리면 거기 걸림
  const h=nextStop(wT,wDir);if(h!=null&&Math.abs(h-wT)/vhNow()<.65){wT=h;wC=scrollY;wGo();}}
addEventListener('keydown',e=>{if(/^(Arrow|Page|Home|End| )/.test(e.key)){if(ride)stop(false);wHalt();}});   // 키로 움직이면 브라우저에 넘김
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
