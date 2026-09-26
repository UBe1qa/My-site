/* ===== 운영 지표 계산 (공통) =====
   ops/data.js 를 읽어서 캐릭터별 팔로워·참여율·수익·판정을 계산해요.
   운영 대시보드, 캐릭터 프로필, 메인에서 같은 숫자를 쓰도록 한곳에 모았어요.
   판정 기준(제안): 최근 4주 평균 참여율 10% 이상 = 계속 · 7~10% = 지켜보기 · 7% 미만 = 보류 후보 */
window.M=(function(){
  const O=window.OPS;if(!O)return null;
  const W=O.weeks.length;
  const RULE={go:.10,watch:.07};
  const eng=p=>(p.likes+p.comments+p.saves+p.shares)/p.views;
  const avg=a=>a.length?a.reduce((s,p)=>s+p.eng,0)/a.length:0;
  const sum=(a,k)=>a.reduce((s,x)=>s+x[k],0);
  function verdictOf(r){return r>=RULE.go?{k:'go',label:'계속',ic:'🟢'}:r>=RULE.watch?{k:'watch',label:'지켜보기',ic:'🟡'}:{k:'stop',label:'보류 후보',ic:'🔴'};}
  function char(id){
    const d=O.chars[id];if(!d)return null;
    const posts=d.posts.map(p=>({...p,c:id,eng:eng(p)}));
    const f=d.followers;let li=f.length-1;while(li>=0&&f[li]==null)li--;
    const latest=li>=0?f[li]:0,prev=li>0&&f[li-1]!=null?f[li-1]:0;
    const start=f.findIndex(v=>v!=null)+1;
    const recent=posts.filter(p=>p.w>W-4);
    const avgEng=avg(recent.length?recent:posts);
    const income=sum(O.money.income.filter(x=>x.c===id),'amount');
    const views=sum(posts,'views')||1;
    return {id,posts,followers:f,latest,delta:latest-prev,start,weeksRun:li-start+2,
      avgEng,allEng:avg(posts),best:[...posts].sort((a,b)=>b.eng-a.eng)[0],
      income,saveRate:sum(posts,'saves')/views,verdict:verdictOf(avgEng),events:d.events||[]};
  }
  const ids=Object.keys(O.chars),all=ids.map(char);
  const income=sum(O.money.income,'amount'),expense=sum(O.money.expense,'amount');
  return {O,W,RULE,eng,avg,char,ids,all,income,expense,net:income-expense,verdictOf,
    totalFollowers:all.reduce((s,c)=>s+c.latest,0),allPosts:all.flatMap(c=>c.posts)};
})();
