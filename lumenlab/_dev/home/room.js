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
  W=cv.clientWidth;H=cv.clientHeight;if(!W||!H)return;D=Math.min(W<860?1.5:2,window.devicePixelRatio||1);cv.width=W*D;cv.height=H*D;
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
let fLast=0;
function frame(now){
  if(W<860&&!reduce&&now-fLast<30&&!window.__roomPaused){raf=requestAnimationFrame(frame);return;}fLast=now;
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
