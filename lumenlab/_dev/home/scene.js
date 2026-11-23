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
  const r=hero.getBoundingClientRect();W=Math.round(r.width);H=Math.round(r.height);D=Math.min(W<860?1.5:2,window.devicePixelRatio||1);
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
let fLast=0;
function frame(now){
  if(W<860&&!reduce&&now-fLast<30&&!window.__scenePaused){raf=requestAnimationFrame(frame);return;}fLast=now;
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
  const step=W<860?3:2;for(let y=0;y<sh;y+=step){const sy=curb-3-y*1.55;if(sy<top0)break;const dx=reduce?0:Math.sin(y*.16+t*1.4)*(.5+y*.012)+Math.sin(y*.05-t*.7)*1.2;
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
