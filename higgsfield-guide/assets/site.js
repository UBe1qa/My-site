/* 힉스필드 첫걸음 — 모든 페이지 공통 스크립트
   각 기능은 그 부분이 있는 페이지에서만 동작해요. */
(function(){
  var ROOT = document.body.getAttribute('data-root') || '';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

  /* 알림, 복사 */
  var toastEl=$('#toast'),toastT;
  function toast(msg){if(!toastEl)return;toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},1600)}
  function copy(text,okMsg){
    function done(){toast(okMsg||'복사했어요')}
    function fallback(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('복사가 안 돼요. 직접 선택해 주세요')}document.body.removeChild(ta)}
    try{navigator.clipboard.writeText(text).then(done,fallback)}catch(e){fallback()}
  }

  /* 체크리스트 (첫걸음, 올리기 전) — 이 브라우저에만 저장 */
  function checklist(listSel,itemSel,key,countEl,fmt){
    var boxes=$$(listSel+' input[type=checkbox]');
    if(!boxes.length||!countEl)return;
    var saved=load(key)||[];
    boxes.forEach(function(b,i){b.checked=saved.indexOf(i)>-1});
    function update(){
      var on=[];boxes.forEach(function(b,i){if(b.checked)on.push(i);if(itemSel){var it=b.closest(itemSel);if(it)it.classList.toggle('done',b.checked)}});
      countEl.textContent=fmt(on.length,boxes.length);save(key,on);
    }
    boxes.forEach(function(b){b.addEventListener('change',update)});update();
  }
  checklist('#route','.stop','hf-route-v2',$('#routeCount'),function(a,b){return a+' / '+b+' 완료'});
  checklist('#postList',null,'hf-post-v1',$('#postCount'),function(a,b){return a+' / '+b+' 확인'});

  /* 크레딧 계산기 */
  var rowsEl=$('#calcRows');
  if(rowsEl){
    var ITEMS=[
      {g:'사진',c:'img',items:[
        {n:'Soul 2.0 사진',s:'인물·일상 감성',cost:0.12,u:'장',min:'starter'},
        {n:'Nano Banana Pro 사진',s:'글자·제품·부분 수정',cost:2,u:'장',min:'starter'}]},
      {g:'영상',c:'vid',items:[
        {n:'Kling 3.0 영상',s:'5초 · 720p · 소리 끔',cost:7.5,u:'개',min:'starter'},
        {n:'Kling 3.0 영상',s:'5초 · 1080p',cost:8,u:'개',min:'plus'},
        {n:'Seedance 2.0 영상',s:'5초 · 720p',cost:22,u:'개',min:'plus'},
        {n:'Veo 3.1 영상',s:'4초 · 소리 포함',cost:40,u:'개',min:'plus'},
        {n:'Cinema Studio 영상',s:'5초 · 1080p',cost:50,u:'개',min:'starter'}]},
      {g:'인물·소리',c:'chr',items:[
        {n:'Soul ID 학습',s:'얼굴 학습 1회',cost:25,u:'번',min:'starter',c:'chr'},
        {n:'말하는 영상 (Wan 2.5 Speak Fast)',s:'5초 · 720p',cost:9,u:'개',min:'starter',c:'snd'},
        {n:'말하는 영상 (Speak 2.0)',s:'5초 · 720p',cost:14,u:'개',min:'plus',c:'snd'}]}
    ];
    var MAXC=50,rank={starter:1,plus:2,ultra:3,custom:9},html='';
    ITEMS.forEach(function(grp){
      html+='<div class="calc-group c-'+grp.c+'"><h4><i></i>'+grp.g+'</h4>';
      grp.items.forEach(function(it){
        var cc=it.c?' c-'+it.c:'',w=Math.max(it.cost/MAXC*100,1.2);
        html+='<div class="row'+cc+'" data-cost="'+it.cost+'" data-min="'+it.min+'" data-u="'+it.u+'">'+
          '<div class="name">'+it.n+'<small>'+it.s+'</small></div>'+
          '<div class="bar"><div class="track"><div class="fill" style="width:'+w+'%"></div></div><span class="each num">'+it.cost+' 크레딧</span></div>'+
          '<div class="got num">–</div></div>';
      });
      html+='</div>';
    });
    rowsEl.innerHTML=html;
    var plan='plus',credits=1200,segBtns=$$('#planSeg button'),customBox=$('#customBox'),customIn=$('#customCr'),retry=$('#retry');
    var fmtN=function(n){return n.toLocaleString('ko-KR')};
    var calc=function(){
      var div=retry.checked?3:1;
      $$('#calcRows .row').forEach(function(r){
        var cost=parseFloat(r.getAttribute('data-cost')),min=r.getAttribute('data-min'),u=r.getAttribute('data-u'),got=r.querySelector('.got');
        if(plan!=='custom'&&rank[plan]<rank[min]){got.className='got na';got.textContent='Plus부터';return}
        got.className='got num';got.innerHTML=fmtN(Math.floor(credits/cost/div))+'<small>'+u+'</small>';
      });
    };
    segBtns.forEach(function(b){b.addEventListener('click',function(){
      segBtns.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
      plan=b.getAttribute('data-plan');
      if(plan==='custom'){customBox.classList.add('show');credits=Math.max(0,parseFloat(customIn.value)||0);customIn.focus()}
      else{customBox.classList.remove('show');credits=parseFloat(b.getAttribute('data-cr'))}
      calc();
    })});
    customIn.addEventListener('input',function(){credits=Math.max(0,parseFloat(customIn.value)||0);calc()});
    retry.addEventListener('change',calc);
    calc();
  }

  /* 프롬프트 만들기 */
  var slotsEl=$('#slots');
  if(slotsEl){
    var PHOTO={sep:', ',slots:[
      {lab:'① 누가',hint:'Soul ID를 쓰면 외모는 비워도 돼요',opts:[
        ['20대 여성 · 단발','a Korean woman in her mid-20s with a short black bob and light freckles'],
        ['20대 남성 · 짧은 머리','a Korean man in his late 20s with short textured black hair'],
        ['30대 여성 · 긴 웨이브','a Korean woman in her early 30s with long wavy dark-brown hair and a small mole under her left eye'],
        ['Soul ID 인물 (외모 생략)','the person']]},
      {lab:'② 입은 것',opts:[
        ['베이지 트렌치코트','wearing an oversized beige trench coat'],
        ['크림색 니트','wearing a cream knit cardigan over a white T-shirt'],
        ['검정 정장','wearing a tailored black suit'],
        ['회색 운동복','wearing a gray zip-up track jacket']]},
      {lab:'③ 어디서',opts:[
        ['카페 창가','sitting by the window of a small Seoul cafe'],
        ['한강 공원','standing at the Han River park in Seoul'],
        ['퇴근길 거리','walking down a busy Seoul street after work'],
        ['집 거실','sitting on the sofa in a cozy apartment living room']]},
      {lab:'④ 무엇을',opts:[
        ['커피 들기','holding an iced latte'],
        ['웃으며 돌아보기','looking back over the shoulder with a soft smile'],
        ['폰 보기','scrolling on a smartphone'],
        ['책 읽기','reading a paperback book']]},
      {lab:'⑤ 빛',opts:[
        ['아침 햇살','soft morning sunlight from the left'],
        ['노을','warm golden-hour sunset light'],
        ['흐린 날','soft overcast daylight'],
        ['밤 네온','neon signs at night with cool blue and pink tones']]},
      {lab:'⑥ 카메라·분위기',opts:[
        ['폰으로 찍은 일상','candid iPhone photo, natural skin texture, casual everyday snapshot'],
        ['35mm 필름','shot on 35mm film, slight grain, shallow depth of field'],
        ['50mm 인물 사진','50mm portrait lens, eye level, shallow depth of field, calm mood'],
        ['잡지 화보','editorial fashion photo, clean composition, natural skin texture']]}
    ],set:'<b>추천 설정</b> Image → Soul 2.0 · 프리셋 하나 · 비율 4:5 또는 9:16'};
    var VIDEO={sep:' ',slots:[
      {lab:'① 동작',hint:'하나만 고르세요',opts:[
        ['창밖 보다가 미소','The person looks out the window, then turns to the camera and smiles softly.'],
        ['커피 한 모금','The person takes a slow sip of coffee and gently puts the cup down.'],
        ['카메라 쪽으로 걷기','The person walks slowly toward the camera.'],
        ['머리 넘기며 웃기','The person tucks their hair behind one ear and laughs.']]},
      {lab:'② 카메라',hint:'이것도 하나만',opts:[
        ['천천히 다가가기','Slow push-in at a constant speed, ending on a close-up.'],
        ['고정','Static camera, locked-off tripod shot.'],
        ['옆으로 따라가기','Slow tracking shot moving from left to right.'],
        ['반 바퀴 돌기','Slow half orbit around the person, keeping the face in frame.']]},
      {lab:'③ 분위기·디테일',opts:[
        ['머리카락 살랑','Subtle hair movement from a light breeze.'],
        ['따뜻하고 차분','Warm, calm mood.'],
        ['나뭇잎 사이 햇빛','Sunlight flickering through leaves.'],
        ['폰으로 찍은 느낌','Handheld phone-camera feel with natural motion.']]}
    ],set:'<b>추천 설정</b> Video → Kling 3.0 · 720p · 5초 · 9:16. 사진에 있는 옷·배경은 다시 안 써도 돼요.'};
    var mode='photo',pick={photo:[0,0,0,0,0,0],video:[0,0,0]};
    var outEn=$('#outEn'),outKo=$('#outKo'),outSet=$('#outSet');
    var cfg=function(){return mode==='photo'?PHOTO:VIDEO};
    /* 고른 조합의 실제 결과 (힉스필드로 직접 만든 예시) */
    var EX_LIGHT={0:'photo-morning',1:'photo-sunset',3:'photo-neon'},EX_CAM={0:'pushin',1:'static',3:'orbit'};
    var setOutMedia=function(){
      var m=$('#outMedia'),cap=$('#outMediaCap'),p=pick[mode],src,kind,h,exact;
      if(!m)return;
      if(mode==='photo'){
        var name=EX_LIGHT[p[4]];
        exact=!!name&&p.every(function(v,i){return i===4||v===0});
        if(!exact)name='photo-morning';
        src=ROOT+'examples/'+name+'.webp';kind='img';
        h='<img src="'+src+'" alt="이 프롬프트로 만든 예시 사진" width="900" height="1200"><span class="ai">AI 예시</span>';
      }else{
        var cam=EX_CAM[p[1]];
        exact=!!cam&&p[0]===0&&p[2]===0;
        if(!exact)cam='pushin';
        src=ROOT+'examples/video-'+cam+'.mp4';kind='video';
        h='<video src="'+src+'" poster="'+ROOT+'examples/video-'+cam+'.webp" autoplay muted loop playsinline preload="metadata"></video><span class="ai">AI 예시</span>';
      }
      if(m.getAttribute('data-src')!==src){m.innerHTML=h;m.setAttribute('data-src',src);m.setAttribute('data-lb',kind)}
      m.setAttribute('data-cap',exact?outEn.textContent:'기본 조합으로 만든 예시예요.');
      cap.innerHTML=exact?'<b>이 프롬프트 그대로 만든 결과</b>'+(mode==='photo'?'Soul 2.0':'Kling 3.0 · 720p · 5초')+' · 누르면 크게 보여요'
        :'<b>이 조합은 예시가 없어요</b>기본 조합 결과를 보여 드려요. 직접 만들어 비교해 보세요.';
    };
    var renderOut=function(){
      var c=cfg(),en=[],ko=[];
      c.slots.forEach(function(s,si){var o=s.opts[pick[mode][si]];if(o[1])en.push(o[1]);ko.push(o[0])});
      outEn.textContent=en.join(c.sep);
      outKo.textContent='뜻: '+ko.join(' / ');
      outSet.innerHTML=c.set+(mode==='photo'&&pick.photo[0]===3?'<br>Soul ID 인물은 Character 탭에서 먼저 골라 주세요.':'');
      setOutMedia();
    };
    var renderSlots=function(){
      var c=cfg(),h='';
      c.slots.forEach(function(s,si){
        h+='<div class="slot"><div class="lab">'+s.lab+(s.hint?'<small>'+s.hint+'</small>':'')+'</div><div class="chips" role="group" aria-label="'+s.lab+'">';
        s.opts.forEach(function(o,oi){h+='<button type="button" data-s="'+si+'" data-o="'+oi+'" aria-pressed="'+(pick[mode][si]===oi)+'">'+o[0]+'</button>'});
        h+='</div></div>';
      });
      slotsEl.innerHTML=h;renderOut();
    };
    slotsEl.addEventListener('click',function(e){
      var b=e.target.closest('button[data-s]');if(!b)return;
      var si=+b.getAttribute('data-s'),oi=+b.getAttribute('data-o');
      pick[mode][si]=oi;
      $$('button[data-s="'+si+'"]',slotsEl).forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
      renderOut();
    });
    var tabP=$('#tab-photo'),tabV=$('#tab-video'),panel=$('#builder');
    var setTab=function(m){mode=m;tabP.setAttribute('aria-selected',String(m==='photo'));tabV.setAttribute('aria-selected',String(m==='video'));panel.setAttribute('aria-labelledby',m==='photo'?'tab-photo':'tab-video');renderSlots()};
    tabP.addEventListener('click',function(){setTab('photo')});
    tabV.addEventListener('click',function(){setTab('video')});
    [tabP,tabV].forEach(function(t){t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){var n=t===tabP?tabV:tabP;n.focus();n.click()}})});
    $('#copyPrompt').addEventListener('click',function(){copy(outEn.textContent,'프롬프트를 복사했어요')});
    if(location.hash==='#video')setTab('video');else renderSlots();
  }
  var helperBtn=$('#copyHelper');
  if(helperBtn)helperBtn.addEventListener('click',function(){copy($('#helperText').textContent,'복사했어요. ChatGPT나 Claude에 붙여 넣으세요')});

  /* 크게 보기 */
  if($('[data-lb]')||slotsEl){
    var lb=document.createElement('dialog');lb.className='lb';
    lb.innerHTML='<div class="media"><button type="button" class="close" aria-label="닫기">×</button><div class="lb-body"></div></div><p></p>';
    document.body.appendChild(lb);
    var openLB=function(kind,src,cap){
      lb.querySelector('.lb-body').innerHTML=kind==='video'?'<video src="'+src+'" autoplay muted loop playsinline controls></video>':'<img src="'+src+'" alt="">';
      lb.querySelector('p').textContent=cap||'';
      if(typeof lb.showModal==='function')lb.showModal();else window.open(src,'_blank');
    };
    lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('close'))lb.close()});
    lb.addEventListener('close',function(){lb.querySelector('.lb-body').innerHTML=''});
    document.addEventListener('click',function(e){var b=e.target.closest('[data-lb]');if(!b||b.closest('dialog'))return;openLB(b.getAttribute('data-lb'),b.getAttribute('data-src'),b.getAttribute('data-cap'))});
  }

  /* 용어 찾기 */
  var q=$('#gq');
  if(q){
    var empty=$('#gempty'),terms=$$('#gloss > div');
    q.addEventListener('input',function(){
      var v=q.value.trim().toLowerCase(),n=0;
      terms.forEach(function(d){var hit=!v||d.textContent.toLowerCase().indexOf(v)>-1;d.hidden=!hit;if(hit)n++});
      empty.hidden=n>0;
    });
  }

  /* 읽은 위치, 맨 위로 */
  var bar=$('#progress'),top=$('#totop');
  function onScroll(){
    var h=document.documentElement,max=h.scrollHeight-h.clientHeight;
    if(bar)bar.style.transform='scaleX('+(max>0?h.scrollTop/max:0)+')';
    if(top)top.classList.toggle('show',h.scrollTop>700);
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(top)top.addEventListener('click',function(){scrollTo({top:0,behavior:reduce?'auto':'smooth'})});

  /* 도움말 안쪽 목차 강조 */
  var sub=$('nav.subnav .wrap');
  if(sub&&'IntersectionObserver' in window){
    var links={};
    $$('a',sub).forEach(function(a){links[a.getAttribute('href').slice(1)]=a});
    var spy=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return;var a=links[e.target.id];if(!a)return;
      $$('a.active',sub).forEach(function(x){x.classList.remove('active')});a.classList.add('active');
    })},{rootMargin:'-30% 0px -65% 0px'});
    $$('main section[id]').forEach(function(s){spy.observe(s)});
  }
})();
