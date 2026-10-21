/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면(불 켜진 작업실). 움직임(html.anim, 동작 줄이기 아님)일 때만 움직이고, 아니면 불 켜진 그림 한 장 그대로. 글과 단추는 처음부터 보인다.
      움직임은 투명도가 아니라 자리·모양이 바뀌게 한다(폰에서 방 창이 폭 200~300px뿐이라 작은 흔들림은 안 보임: 팔을 드는 실루엣, 화면을 가로지르는 불빛).
      들어올 때(html.intro, #로 들어오거나 이미 내려와 있으면 건너뜀, 1.8초): 밤. 꺼진 방 창에 모니터 빛과 그 앞 사람 실루엣만 → 사람이 팔을 뻗어 스탠드 갓을
      당기면 딸깍, 방 불이 한 번 깜빡이고 스탠드 자리에서 번지며 갓은 튕기다 멈춘다 → 간판 네온 글자가 띄엄띄엄 들어온다(먼 창은 하나씩 꺼짐).
      이야기(머무는 동안, 2.3초에 처음, 4.6초마다): 사람이 다 만들면 모니터가 번쩍하고 아이콘 하나가 톡 튀며 불빛이 되어 방 창 유리를 뚫고 나와(유리 반사)
      휘어 솟았다가 위층 이웃 창으로 쏙 들어간다 → 그 창에 불이 켜지고(번쩍·고리) 안의 사람이 들썩인다(앱: 노트북, 게임: 소파의 휴대폰, 웹 도구: 휴대폰과 창턱 고양이).
      아래층 사람은 그때 팔을 든다(만세·한 팔·쭉 펴기 차례로). 이웃 창은 9초 뒤 꺼진다. 넓은 화면은 사이사이 먼 도시 창으로도 보내 도시가 조금씩 밝아진다.
      거리: 지나가던 사람이 방 창 아래에 서서 휴대폰을 들면 방에서 불빛이 내려와 그 화면이 켜지고, 깡충 뛰고 화면을 보며 걸어간다(4.2초에 처음, 9~13초마다).
      그 밖에: 타자(팔꿈치·어깨), 모니터 글줄·커서, 머그 김, 별 반짝임·별똥별(CSS). 누르면(폰 손가락·PC 클릭) 방 안 사람은 돌아보며 손을 흔들고,
      스탠드는 딸깍 꺼졌다 켜지고, 간판은 글자가 차례로 톡 뛰고, 거리의 사람은 깡충. 그 밖의 자리는 그리로 불빛(창 근처면 그 창, 지붕 위면 불꽃).
      PC 마우스가 꺼진 위층 창에 다가가도 그 창으로. 마우스(PC)·기울기(안드로이드, 허락 없이 되는 곳만)로 층 깊이.
      내릴 때(html.zoom, 화면 높이 560px 이상, 첫 화면이 화면 두 장): 장면 위치(p 0~1)를 따라 카메라가 다섯 박자로 들어간다.
        ① 건물 앞으로 옆걸음(글은 걷힘) ② 창으로 다가가며 간판 빛이 번짐 ③ 유리를 지나며 반사 빛줄기·따뜻한 빛 ④ 방 안에서 일하는 사람 어깨 쪽으로
        (가까운 사람은 많이, 먼 벽은 반대로 조금) ⑤ 모니터 화면이 화면을 덮고 그 화면 자리에서 종이색이 넓어진다.
        세로 화면은 박자를 세운 화면에 맞춰 따로 잡는다: ② 위층 창·간판·방 창을 한 화면에 ③ 유리를 지나면 방이 화면 높이를 다 채운 채 어깨 너머 ④⑤ 모니터.
        그 모니터 화면 안에 '만든 것'이 끝 모습 그대로 보이고(넓은 화면은 줄여서), 화면이 넓어져 화면을 다 덮으면 그대로 '만든 것' 칸이 된다(portal).
        화면 속 아이콘 셋은 화면이 넓어지기 시작하면 떠올라 '만든 것'의 제 칸으로 날아가 앉는다(SHOW에 다 앉음).
        박자 마디는 한 곡선(단조 3차)으로 이어서 멈칫하는 구간이 없다.
        한 번 튕긴 스크롤에 장면이 0.5초 만에 지나가지 않게, 맨 위에서 내리려 하면(휠·손가락·키·'작업실 구경하기') 장면을 정해진 빠르기(FWD)로
        끝(END, '만든 것' 맨 위가 화면 맨 위에 온 자리)까지 보여 주고 멈춘다. 그동안 같은 쪽으로 또 밀면 빨라지고, 반대로 밀면 되돌아간다. END에서 올리려 하면
        거꾸로(BWD) 맨 위까지. 손가락의 관성이나 휠로 그 사이에 들어와도 같은 쪽 끝까지. 스크립트가 옮긴 스크롤(시험, #tools 링크 등)은 건드리지 않는다.
      '만든 것'은 첫 화면과 겹쳐 있고(CSS, END에 맨 위가 화면 맨 위) 제자리에 오기 전엔 누를 수 없음. 그 안으로 포커스가 오면 END까지 내려 준다.
      머리말은 밤 장면 위에서 밤색(html.top-night, 처음엔 head 스크립트가 붙임)이고, 다가가며 창 윗변이 머리말 밑을 지나 방 안이 그 밑에 오면 원래 머리말.
      확대하지 않을 때(낮은 화면)는 첫 화면이 머리말 밑에 있는 동안만 밤색 머리말. 첫 화면이 화면 밖이거나 종이색이 다 덮으면 매 프레임 그리기를 쉰다.
   2) 만든 것 칸(작업실 안 선반): 줄이 처음 보이면 줄 이름 앞 등이 켜지고 첫 화면과 같은 불빛이 아이콘마다 날아가 꽂혀 켠다(아래 2) 설명). 끝 칸은 명함이 떨어진다.
      아이콘을 누르면 뜨는 소개 창은 assets/store.js. */
(function () {
  var d = document.documentElement;
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  var moving = function () { return d.classList.contains('anim') && !calm.matches; };
  var veiled = false, hush = false, wake = function () {};   // 1)이 '만든 것'을 가리는 중인가(다 드러나기 전), 아직 하나도 안 보이나(보이기 시작하면 2)를 깨워 선반 불을 켬)

  /* ---------- 1) 첫 화면 ---------- */
  var hero = document.querySelector('[data-hero]');
  if (hero) (function () {
    window.__heroOn = true;   // head 스크립트의 3초 안전장치(이 파일이 안 오면 .zoom·.intro 를 뗀다)를 끈다
    var NS = 'http://www.w3.org/2000/svg';
    var stage = hero.querySelector('.hero__stage'), night = hero.querySelector('.night'), back = night.querySelector('.night__back'), near = night.querySelector('.night__near'),
      copy = hero.querySelector('.hero__copy'), street = night.querySelector('.night__street'), wash = hero.querySelector('.hero__wash'), works = document.getElementById('works'),
      bar = document.querySelector('.top'), metas = document.querySelectorAll('meta[name="theme-color"]'), tall = matchMedia('(min-height: 560px)'),
      dim = matchMedia('(prefers-color-scheme: dark)'), fine = matchMedia('(hover: hover) and (pointer: fine)');
    var day = [].map.call(metas, function (m) { return m.content; });
    var sky = getComputedStyle(d).getPropertyValue('--n-sky-1').trim() || '#05040F';
    var want = d.classList.contains('zoom');   // head 스크립트가 확대를 켰나(동작 줄이기를 나중에 끄고 켜면 따라간다)
    var SHOW = 0.7;   // 이 p에서 아이콘이 다 앉고 '만든 것'이 다 드러남(제목이 화면 위쪽 1/3쯤)
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var k = function (v, a, b) { return clamp((v - a) / (b - a)); };
    var ease = function (t) { return t * t * (3 - 2 * t); };
    var eo = function (t) { return 1 - Math.pow(1 - t, 3); };
    var eio = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var bell = function (v, a, m, z) { return v < m ? k(v, a, m) : 1 - k(v, m, z); };
    var el = function (tag, at, parent) { var e = document.createElementNS(NS, tag); for (var n in at) e.setAttribute(n, at[n]); if (parent) parent.appendChild(e); return e; };
    var tf = function (e, x, y) { if (x || y) e.setAttribute('transform', 'translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ')'); else e.removeAttribute('transform'); };

    /* 움직일 때 쓰는 것(처음 움직일 때 한 번 만든다): 창마다 펼친 방(+ 사람 팔, 스탠드 갓, 모니터 번쩍), 간판 글자, 위층 이웃 창, 날아가는 불빛 층, 별, 지나가는 빛, 날아갈 아이콘 */
    var rig = null, B = null;   // B = 지금 보이는 건물(넓은 화면용/세로 화면용 중 하나)
    // 위층 이웃 창 셋(왼쪽부터) 안 그림. 66×56 칸(아래가 창턱, 가운데 창살 31.5~34.5), 창이 크면 비율대로 키워 아래에 붙인다.
    // .nb-who = 불빛이 들어오면 들썩이는 사람, .nb-tail = 고양이 꼬리, .n-nbg = 화면 빛(일렁임)
    var NB = [
      // 앱: 책상 뒤에서 노트북을 보는 사람(얼굴에 화면 빛, 노트북 뒤 불빛 점), 옆 칸 화분
      '<circle class="n-nbg" cx="16" cy="25" r="12" fill="url(#n-bulb)"/>' +
      '<g class="nb-who"><circle class="n-nb" cx="16" cy="19.5" r="5.4"/><path class="n-nb" d="M5.5 40c0-8.5 4.5-13 10.5-13s10.5 4.5 10.5 13z"/></g>' +
      '<rect class="n-nb2" x="7.5" y="28.5" width="17" height="10.5" rx="1.4"/><circle class="n-nbs" cx="16" cy="33.6" r="1.5"/>' +
      '<rect class="n-nb2" x="1" y="39" width="30" height="3"/><rect class="n-nb2" x="3" y="42" width="2.6" height="14"/><rect class="n-nb2" x="26.4" y="42" width="2.6" height="14"/>' +
      '<path class="n-nb2" d="M45 46h12l-1.6 10h-8.8z"/><path class="n-nbp" d="M50.4 46c-7-2-9.4-9-7-15 6 2.4 8.4 8.4 7 15zM51.6 46c0-8 3.4-13 9.4-15 1.2 7-2.4 12.6-9.4 15z"/>',
      // 게임: 소파에 앉아 휴대폰을 가로로 든 사람(옆모습)
      '<circle class="n-nbg" cx="25" cy="27" r="12" fill="url(#n-bulb)"/><rect class="n-nb2" x="1" y="27" width="8" height="29" rx="3"/>' +
      '<g class="nb-who"><circle class="n-nb" cx="15" cy="20" r="5.4"/><path class="n-nb" d="M7 45c-1-10 1.6-17 8-17s8.6 5 8.2 10.4L23 45z"/><rect class="n-nb" x="13" y="38" width="21" height="7" rx="3.5"/>' +
      '<rect class="n-nb" x="28.5" y="40" width="5.6" height="15" rx="2.8"/><path class="n-nbl" d="M17.5 32.5l6 3.4 2.6-5.6"/><rect class="n-nbs" x="23.4" y="26.4" width="7.6" height="4.6" rx="1.2"/></g>' +
      '<rect class="n-nb2" x="4" y="44" width="46" height="7" rx="3"/><rect class="n-nb2" x="43" y="36" width="9" height="20" rx="3.5"/><rect class="n-nb2" x="4" y="50" width="46" height="6"/>',
      // 웹 도구: 서서 휴대폰을 보는 사람, 창턱의 고양이(꼬리가 흔들림)
      '<circle class="n-nbg" cx="22" cy="20" r="11" fill="url(#n-bulb)"/>' +
      '<g class="nb-who"><circle class="n-nb" cx="15" cy="17.5" r="5.4"/><path class="n-nb" d="M6.5 60V33.5c0-5.6 3.6-8.5 8.5-8.5s8.5 2.9 8.5 8.5V60z"/>' +
      '<path class="n-nbl" d="M20.5 30l5.6 3.4-1-8.6"/><rect class="n-nbs" x="22.4" y="17" width="4.6" height="8" rx="1.2"/></g>' +
      '<g class="nb-cat"><path class="n-nbl nb-tail" d="M53.5 55.4c5.4 0 7-4.6 5.2-9"/><path class="n-nb" d="M43.4 56c-2-6.6-.4-12 4.6-13.6 5 1.6 6.6 7 4.6 13.6z"/><circle class="n-nb" cx="48" cy="40" r="3.8"/><path class="n-nb" d="M44.6 38.4l.2-4.6 2.6 3zM51.4 38.4l-.2-4.6-2.6 3z"/></g>'
    ];
    var ICON = [1, 0, 2];   // 이웃 창마다 받는 것 = 모니터 속 아이콘 자리(0 병아리 구조대, 1 Owlight, 2 며칠 계산기): 앱 창 ← Owlight, 게임 창 ← 병아리, 웹 도구 창 ← 며칠 계산기
    function build() {
      var sym = document.getElementById('n-room'), seed = 7;
      var rnd = function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
      rig = { blds: [], far: [].slice.call(night.querySelectorAll('.night__far .n-farwin')), farLit: [] };
      rig.early = rig.far.filter(function (r) { return r.matches(':nth-child(4n+1)'); });   // .intro 동안 켜져 있는 먼 창(landing.css와 같은 고르기)
      rig.early.forEach(function (r, i) { r._off = 150 + (i * 383) % 700; });   // 0.15~0.85초에 하나씩 꺼짐(도시가 잠듦)
      var skyEl = document.createElement('div'); skyEl.className = 'night__sky'; night.insertBefore(skyEl, back);
      for (var g = 0; g < 3; g++) {   // 별 세 무리가 따로 반짝임(CSS). 늘 같은 자리
        var tw = document.createElement('div'); tw.className = 'n-tw';
        tw.style.setProperty('--d', (2.6 + g * 1.3) + 's'); tw.style.setProperty('--dl', (-g * 1.1) + 's');
        for (var j = 0; j < 10; j++) {
          var st = document.createElement('i'), z = rnd() < .2 ? 2.4 : 1.4;
          st.style.cssText = 'left:' + (rnd() * 100).toFixed(1) + '%;top:' + (rnd() * 92).toFixed(1) + '%;width:' + z + 'px;height:' + z + 'px';
          tw.appendChild(st);
        }
        skyEl.appendChild(tw);
      }
      // 유리 반사(불빛이 방 창 유리를 뚫고 나올 때 한 번 훑음)
      var sh = el('linearGradient', { id: 'n-sheen', x1: 0, y1: 0, x2: 1, y2: .6 }, document.querySelector('.night__defs defs'));
      [[.36, 0], [.5, .6], [.64, 0]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': '#fff', 'stop-opacity': s[1] }, sh); });
      [].forEach.call(near.querySelectorAll('.night__bld'), function (svg, n) {
        // 방을 창마다 펼쳐 넣는다(<use> 안은 따로 움직일 수 없음). 불 켜기 전에 보이는 모니터 둘레와 스탠드 자리에서 퍼지는 불빛을 가림(mask)으로
        var u = svg.querySelector('use[href="#n-room"]'), at = function (a) { return +u.getAttribute(a); };
        var room = el('svg', { 'class': 'n-lit', x: at('x'), y: at('y'), width: at('width'), height: at('height'), viewBox: '0 0 324 164', overflow: 'hidden' });
        var mask = el('mask', { id: 'n-rv' + n, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 324, height: 164 }, el('defs', {}, room));
        var spot = el('circle', { cx: 194, cy: 72, r: 0, fill: 'url(#n-rv)' }, mask);   // 스탠드 불
        var dimR = el('circle', { cx: 232, cy: 72, r: 0, fill: 'url(#n-rv)' }, mask);   // 불 켜기 전: 모니터 빛이 닿는 둘레
        var all = el('g', {}, room);
        [].forEach.call(sym.children, function (c) { all.appendChild(c.cloneNode(true)); });
        var q = function (s) { return all.querySelector(s); };
        // 불 켜기 전(.pre): 벽·선반·책상은 어두운 남색, 모니터 화면 둘레에 흰 빛, 사람·스탠드는 그 빛 앞 검은 실루엣(landing.css)
        var cool = el('rect', { width: 324, height: 164, fill: '#141640', opacity: 0 }); all.insertBefore(cool, q('.rg-mon'));
        var mglow = el('circle', { cx: 252, cy: 64, r: 40, fill: 'url(#n-bulb)', opacity: 0 }); all.insertBefore(mglow, q('.rg-lamp'));
        var tint = el('rect', { width: 324, height: 164, fill: '#D9893A', opacity: 0 }, all);   // 켜지는 동안만: 처음 번지는 빛을 호박색으로(하얀 원이 손전등처럼 보이지 않게)
        u.parentNode.replaceChild(room, u);
        // 팔 둘(몸 뒤): 타자 칠 땐 팔꿈치만 살짝, 스탠드를 당기거나 만세를 하면 보인다. 스탠드 갓·전구는 묶어서 돌린다
        var man = q('.rg-man'), arms = [0, 1].map(function () { return man.insertBefore(el('path', { 'class': 'r-limb' }), man.firstChild); });
        var lamp = q('.rg-lamp'), lh = el('g', {}, lamp);
        lh.appendChild(lamp.querySelector('path[d^="M178"]')); lh.appendChild(lamp.querySelector('circle[fill="url(#n-bulb)"]'));
        var mon = q('.rg-mon'), icons = [].slice.call(mon.querySelectorAll('image'));
        var flash = el('rect', { x: 218, y: 44, width: 68, height: 40, rx: 2, fill: '#fff', opacity: 0 }, mon);   // 다 만든 순간 화면이 번쩍
        var name = svg.querySelector('.n-name'), txt = name.textContent; name.textContent = '';
        var letters = txt.split('').map(function (c) { var t = el('tspan', {}, name); t.textContent = c; return t; });
        // 위층 이웃 창: 불빛이 날아와 닿으면 불이 켜지고 안에 사람이 보인다(창 유리 위, 창살 밑)
        var defs = el('defs', {}, svg);
        var nb = [].filter.call(svg.querySelectorAll('rect.n-dark'), function (r) { return +r.getAttribute('height') <= 100; }).map(function (r, i) {
          var x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h = +r.getAttribute('height'), s = Math.min(w / 66, h / 56);
          el('rect', { x: x, y: y, width: w, height: h }, el('clipPath', { id: 'n-wc' + n + i }, defs));
          var g = el('g', { 'clip-path': 'url(#n-wc' + n + i + ')', opacity: 0 });
          r.parentNode.insertBefore(g, r.nextSibling);
          el('rect', { x: x, y: y, width: w, height: h, fill: 'url(#n-wall)' }, g);
          var art = el('g', { transform: 'translate(' + (x + (w - 66 * s) / 2).toFixed(2) + ',' + (y + h - 56 * s).toFixed(2) + ') scale(' + s.toFixed(4) + ')' }, g);
          art.innerHTML = NB[i % NB.length];
          return { g: g, r: r, who: art.querySelector('.nb-who'), tail: art.querySelector('.nb-tail'), lite: art.querySelector('.n-nbg'),
            flash: el('rect', { x: x, y: y, width: w, height: h, fill: '#fff', opacity: 0 }, g),
            cx: x + w / 2, cy: y + h / 2, w: w, h: h, kind: i % NB.length, on: false, pop: -1e9, off: 0, aim: false };
        });
        // 거리를 지나는 사람(건물 앞, 길 위). 발이 (0,0), 오른쪽을 봄. 휴대폰을 든 손(.wk-ph)은 불빛을 받으면 화면이 켜진다
        var vb = svg.getAttribute('viewBox').split(' ').map(Number), wg = el('g', { opacity: 0 }, svg);
        wg.innerHTML = '<circle class="wk-glow" cx="4" cy="-23" r="15" fill="url(#n-bulb)" opacity="0"/>' +
          '<path class="n-wkl wk-leg"/><path class="n-wkl wk-leg"/><path class="n-wkl wk-arm"/>' +
          '<path class="n-wk" d="M-3.8 -21.4q0-1.8 1.8-1.8h4q1.8 0 1.8 1.8l.7 11.6h-9z"/><circle class="n-wk wk-head" cx=".5" cy="-26.4" r="3.5"/>' +
          '<path class="n-wkl wk-arm"/><g class="wk-ph"><rect class="n-wkp" x="-1.2" y="-2" width="2.4" height="3.8" rx=".6"/><rect class="wk-scr" x="-.8" y="-1.6" width="1.6" height="3" fill="#FFF3D2" opacity="0"/></g>';
        var wq = function (s) { return [].slice.call(wg.querySelectorAll(s)); };
        // 맨 위 층: 날아가는 불빛·고리·불꽃, 방 창 유리 반사
        var fx = el('g', {}, svg), glass = svg.querySelector('[data-win]'), gx = +glass.getAttribute('x'), gy = +glass.getAttribute('y'), gw = +glass.getAttribute('width'), gh = +glass.getAttribute('height');
        el('rect', { x: gx, y: gy, width: gw, height: gh }, el('clipPath', { id: 'n-gc' + n }, defs));
        var sheen = el('rect', { x: gx - gw * .6, y: gy, width: gw * 1.2, height: gh, fill: 'url(#n-sheen)', opacity: 0 }, el('g', { 'clip-path': 'url(#n-gc' + n + ')' }, fx));
        rig.blds.push({ svg: svg, wide: svg.classList.contains('night__bld--wide'), room: room, all: all, mask: 'url(#n-rv' + n + ')', spot: spot, dimR: dimR, tint: tint, cool: cool, mglow: mglow,
          rx: at('x'), ry: at('y'), rw: at('width'), rh: at('height'), roof: +svg.querySelector('.n-bld').getAttribute('y'),
          back: q('.rg-back'), lamp: lamp, lh: lh, man: man, arms: arms, hot: q('.r-hot'), head: q('.rm-head'), body: q('.rm-body'),
          l1: q('.rm-l1'), l2: q('.rm-l2'), caret: q('.rm-caret'), steam: [].slice.call(all.querySelectorAll('.r-steam')), icons: icons, flash: flash,
          board: svg.querySelector('.n-board'), name: name, letters: letters, core: svg.querySelector('.n-core'),
          dot: svg.querySelector('circle[fill="url(#n-dot)"]'), glow: svg.querySelector('ellipse.n-lit'),
          lit: [].filter.call(svg.querySelectorAll('.n-lit'), function (e) { return e !== room && e !== name && !e.matches('.n-core, ellipse, circle[fill="url(#n-dot)"]'); }),
          nb: nb, fx: fx, sheen: sheen, gx: gx, gw: gw, sheenAt: -1e9, fl: [], bits: [], re: null,
          bx: +svg.querySelector('.n-bld').getAttribute('x'), ny: +name.getAttribute('y'), nfs: +name.getAttribute('font-size'), sign: null, wave: null, flick: null, dk: false,
          wk: { g: wg, legs: wq('.wk-leg'), arms: wq('.wk-arm'), head: wq('.wk-head')[0], ph: wq('.wk-ph')[0], scr: wq('.wk-scr')[0], glow: wq('.wk-glow')[0],
            gnd: vb[1] + vb[3], stop: gx + gw * .3, mode: '', next: 0, n: 0, x: 0, dir: 1, dist: 0, at: 0, last: 0, lit: -1e9, hop: -1e9 } });
      });
      var star = document.createElement('i'); star.className = 'n-shoot'; skyEl.appendChild(star);   // 별똥별(CSS, 가끔)
      var fx = document.createElement('div'); fx.className = 'hero__fx'; stage.insertBefore(fx, copy);
      ['flare', 'streak', 'bloom'].forEach(function (c) { var e = document.createElement('i'); e.className = 'n-' + c; fx.appendChild(e); rig[c] = e; });
      // 화면 속 아이콘 셋(방 안 모니터의 왼쪽부터) → '만든 것'의 그 칸. 날아가는 그림은 그 칸 아이콘과 같은 파일
      rig.ghosts = ['chickrescue', 'owlight', 'daycount'].map(function (id, j) {
        var wi = works && works.querySelector('.wi[data-show="' + id + '"]'), ic = wi && wi.querySelector('.wi__icon');
        if (!ic) return null;
        var g = document.createElement('img'); g.className = 'hero-ghost'; g.alt = ''; g.decoding = 'async'; g.src = ic.getAttribute('src');
        document.body.appendChild(g);
        return { img: g, wi: wi, icon: ic, j: j };
      }).filter(Boolean);
    }

    /* 들어올 때(it = 들어올 때 시계: 그동안 내리기 시작하면 2.5배로 빨리 끝냄). 밤에서 바로 시작한다(서서히 밝아지는 장면 없음)
       0       방 창은 꺼져 있고 모니터 빛만. 그 빛에 일하는 사람 뒷모습과 스탠드가 보인다(먼 창은 하나씩 꺼짐)
       .15~.55초 사람이 왼팔을 뻗어 스탠드 갓을 잡고, .55~.7초 아래로 당긴다
       .7초    딸깍: 전구가 번쩍, 방 불이 한 번 깜빡였다가 스탠드 자리에서 번지고(.84~1.4초), 놓은 갓은 튕기다 제자리
       1~1.7초 간판 네온: 점이 깜빡이고 글자가 띄엄띄엄 들어옴(몇 글자는 한 번 끊김)
       1.1초~  타자. 첫 불빛은 2.3초에 모니터에서 나간다(아래 '이야기') */
    var t0 = performance.now(), last = t0, it = 0, INTRO = 1800, introing = false, CLICK = 700, PIV = [186, 62];
    var NEON = [0, 5, 2, 7, 1, 8, 4, 6, 3];   // 간판 글자가 들어오는 차례(L U M E N _ L A B)
    function lampRot(t) {   // 스탠드 갓 각도: 손이 당김 → 딸깍 뒤 놓으면 튕기다 멈춤
      if (t < 550) return 0;
      if (t < CLICK) return 11 * ease(k(t, 550, CLICK));
      var s = (t - CLICK) / 1000; return s > 1.2 ? 0 : 11 * Math.exp(-s * 6) * Math.cos(s * 21);
    }
    function introAt(t) {
      rig.early.forEach(function (r) { var lit = t < r._off; r.style.fill = lit ? '' : 'var(--n-far-win)'; r.style.opacity = lit ? '' : '1'; });
      var blink = t >= CLICK && t < CLICK + 70, on = t < CLICK + 140 ? (blink ? 1 : 0) : eo(k(t, CLICK + 140, CLICK + 700));
      rig.blds.forEach(function (b) {
        b.room.style.opacity = '1'; b.all.classList.toggle('pre', t < CLICK || (t >= CLICK + 70 && t < CLICK + 140));
        b.dimR.setAttribute('r', t < CLICK + 140 ? 74 : 74 * (1 - k(t, CLICK + 140, CLICK + 600)));
        b.spot.setAttribute('r', (t < CLICK ? 0 : blink ? 120 : t < CLICK + 140 ? 0 : 16 + 300 * on).toFixed(1));
        b.cool.setAttribute('opacity', (blink ? 0 : t < CLICK + 140 ? .82 : .82 * (1 - k(t, CLICK + 140, CLICK + 420))).toFixed(3));
        b.mglow.setAttribute('opacity', (blink ? .2 : t < CLICK + 140 ? .85 : .85 * (1 - k(t, CLICK + 140, CLICK + 500))).toFixed(3));
        b.hot.style.opacity = (t < CLICK ? 0 : t < CLICK + 140 ? 1 : eo(k(t, CLICK + 300, CLICK + 900))).toFixed(3);   // 전구 번쩍 → 흰 빛무리는 조금 늦게
        b.tint.setAttribute('opacity', (t < CLICK + 140 ? 0 : (1 - on) * .55).toFixed(3));
        b.lit.forEach(function (e) { e.style.opacity = on.toFixed(3); });
        var dot = t < 1000 ? 0 : t < 1060 ? 1 : t < 1130 ? .15 : 1;   // 간판 점: 한 번 깜빡이고 켜짐
        b.core.style.opacity = b.dot.style.opacity = dot;
        b.name.style.opacity = '1';
        b.letters.forEach(function (e, i) {   // 네온: 차례가 오면 켜지고, 짝수 차례 글자는 한 번 끊겼다 다시
          var a = 1150 + NEON[i] * 60, v = t < a ? 0 : NEON[i] % 2 === 0 && t >= a + 50 && t < a + 110 ? .12 : 1;
          e.style.fillOpacity = v;
        });
        b.glow.style.opacity = k(t, 1500, 1800).toFixed(3);
      });
    }
    function finishIntro() {
      introing = false; d.classList.remove('intro');
      if (!rig) return;
      rig.early.forEach(function (r) { r.style.fill = r.style.opacity = ''; });
      rig.blds.forEach(function (b) {
        b.all.removeAttribute('mask'); b.all.classList.remove('pre'); b.tint.setAttribute('opacity', 0); b.cool.setAttribute('opacity', 0); b.mglow.setAttribute('opacity', 0);
        [b.room, b.hot, b.name, b.core, b.dot, b.glow].concat(b.lit).forEach(function (e) { e.style.opacity = ''; });
        b.letters.forEach(function (e) { e.style.fillOpacity = ''; });
      });
    }

    /* 머무는 동안: 방 안 사람(타자, 스탠드 당기기, 다 만들면 팔을 듦), 모니터, 김, 먼 창 하나 */
    var SH = [[199, 95], [227, 95]];   // 어깨(몸 그림 안)
    var POSE = {   // [왼팔꿈치, 왼손, 오른팔꿈치, 오른손] 뒷모습이라 타자 칠 땐 손이 몸에 가려 팔꿈치만 보인다
      reach: [[183, 80], [193, 59]],
      cheer: [[188, 76], [190, 53], [238, 76], [236, 53]],
      pump: [[191, 112], [200, 110], [244, 82], [239, 60]],
      wide: [[182, 80], [172, 61], [244, 80], [254, 61]]
    };
    var KINDS = ['cheer', 'pump', 'wide'];
    var mix = function (a, b2, w) { return [a[0] + (b2[0] - a[0]) * w, a[1] + (b2[1] - a[1]) * w]; };
    var spin = function (p, c, deg) { var a = deg * Math.PI / 180, s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
    var pts = function (a) { return a.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L'); };
    var farOn = null;
    function roomOff(b, on) {   // 스탠드를 눌러 잠깐 끈 방: 들어올 때처럼 모니터 빛 앞 실루엣
      if (on === b.dk) return;
      b.dk = on; b.all.classList.toggle('pre', on);
      b.cool.setAttribute('opacity', on ? .82 : 0); b.mglow.setAttribute('opacity', on ? .85 : 0); b.hot.style.opacity = on ? '0' : '';
      b.lit.forEach(function (e) { e.style.opacity = on ? '.25' : ''; });
    }
    function idleAt(t, b) {
      var u = t - 1100, ty = u > 0, ph = ty ? u % 2300 : 0, n = ty ? Math.floor(u / 2300) % 3 : 0;
      // 타자: 두 손이 번갈아(팔꿈치·어깨가 들썩), 2.3초마다 글 두 줄이 써지고 커서가 따라감
      var aL = ty ? Math.max(0, Math.sin(u * .05)) : 0, aR = ty ? Math.max(0, Math.sin(u * .05 + 2.4)) : 0, bob = ty ? (aL + aR) * .5 : 0;
      var P = [[191 - aL, 112 - aL], [200, 110 - aL * 2], [235 + aR, 112 - aR], [226, 110 - aR * 2]];
      // 들어올 때 스탠드 당기기(손은 갓을 따라 돈다)
      var ri = introing ? ease(k(it, 150, 550)) * (1 - ease(k(it, CLICK + 150, CLICK + 550))) : 0, rot = introing ? lampRot(it) : 0;
      // 스탠드를 누르면: 갓이 눌렸다 딸깍 꺼짐 → 한 번 깜빡이고 다시 켜지며 갓이 튕김(들어올 때와 같은 용수철)
      var fk = !introing && b.flick != null ? t - b.flick : -1;
      if (fk >= 0 && fk < 1700) rot = fk < 140 ? 11 * ease(fk / 140) : lampRot(CLICK + fk - 140);
      roomOff(b, fk >= 140 && fk < 520 && !(fk >= 400 && fk < 440));
      if (ri) { P[0] = mix(P[0], POSE.reach[0], ri); P[1] = mix(P[1], spin(POSE.reach[1], PIV, rot), ri); }
      b.lh.setAttribute('transform', 'rotate(' + rot.toFixed(2) + ' ' + PIV.join(' ') + ')');
      // 다 만들어 내보내면: 팔을 들었다(만세·한 팔·쭉 펴기 차례로) 내리며 들썩
      var r = b.re ? t - b.re.at : -1, w = r >= 0 ? eo(k(r, 60, 360)) * (1 - ease(k(r, 1050, 1500))) : 0, lift = 0;
      if (w) {
        var K = POSE[b.re.kind];
        P = P.map(function (p, i) { return mix(p, K[i], w); });
        lift = w * (1.2 + Math.abs(Math.sin(r * .011)) * 1.6);
      }
      // 사람을 누르면: 고개를 돌리고 오른손을 흔든다
      var wv = b.wave != null ? t - b.wave : -1, ww = wv >= 0 ? eo(k(wv, 0, 260)) * (1 - ease(k(wv, 1400, 1750))) : 0;
      if (ww) { P[2] = mix(P[2], [243, 74], ww); P[3] = mix(P[3], [250 + Math.sin(wv * .017) * 7, 50], ww); }
      var by = bob * .6 - lift * .7, hy = bob * 1.2 - lift - ww;
      tf(b.head, Math.sin(t / 1900) * .5 + ww * 2.6, hy); tf(b.body, 0, by);
      // 간판을 누르면: 글자가 차례로 톡 뛰고 점이 한 번 깜빡
      var sg = b.sign != null ? t - b.sign : -1;
      if (sg >= 0) {
        b.letters.forEach(function (e, i) {
          var a = sg - i * 55, h = a > 0 && a < 340 ? Math.sin(a / 340 * Math.PI) * b.nfs * .42 : 0;
          if (h) e.setAttribute('y', (b.ny - h).toFixed(2)); else e.removeAttribute('y');
        });
        b.core.style.opacity = sg < 90 ? '.15' : '';
        if (sg > 1200) b.sign = null;
      }
      b.arms[0].setAttribute('d', 'M' + pts([[SH[0][0], SH[0][1] + by], [P[0][0], P[0][1] + by], [P[1][0], P[1][1] + by]]));
      b.arms[1].setAttribute('d', 'M' + pts([[SH[1][0], SH[1][1] + by], [P[2][0], P[2][1] + by], [P[3][0], P[3][1] + by]]));
      var w1 = [30, 24, 34][n], w2 = [20, 28, 14][n], a1 = Math.min(1, ph / 1100), a2 = k(ph, 1100, 2100);
      b.l1.setAttribute('width', (a1 * w1).toFixed(1)); b.l2.setAttribute('width', (a2 * w2).toFixed(1));
      b.caret.setAttribute('x', (228.6 + (ph < 1100 ? a1 * w1 : a2 * w2)).toFixed(1)); b.caret.setAttribute('y', ph < 1100 ? 73.2 : 77.6);
      b.caret.setAttribute('opacity', ty && (ph < 2100 || u % 900 < 450) ? .9 : 0);
      // 내보내는 순간: 화면 번쩍, 그 아이콘이 톡 튐
      var fr = b.re ? t - b.re.at : -1e9;
      b.flash.setAttribute('opacity', (bell(fr, -160, 0, 380) * .85).toFixed(3));
      b.icons.forEach(function (ic, j) { var hp = b.re && b.re.j === j ? Math.sin(Math.PI * k(fr, -60, 260)) * 5 : 0; ic.setAttribute('transform', hp ? 'translate(0,' + (-hp).toFixed(2) + ')' : ''); });
      b.steam.forEach(function (s, i) {
        var c = ((t + i * 900) % 1800) / 1800;
        tf(s, Math.sin(c * 6) * .8, -c * 9); s.style.opacity = t > 1400 ? (Math.sin(c * Math.PI) * .6).toFixed(3) : '';
      });
      var slot = Math.floor(t / 2200), pick = !introing && t % 2200 < 1400 ? rig.far[(slot * 7919) % rig.far.length] : null;
      if (pick && rig.farLit.indexOf(pick) >= 0) pick = null;
      if (pick !== farOn) {
        if (farOn) farOn.style.fill = farOn.style.opacity = '';
        if (pick) { pick.style.fill = 'var(--lamp)'; pick.style.opacity = '.3'; }
        farOn = pick;
      }
    }

    /* 이야기: 모니터에서 다 만든 것이 불빛이 되어 방 창 유리를 뚫고 나와(유리 반사) 지붕 위로 높이 솟았다가 위층 이웃 창으로 쏙 들어가면
       그 창에 불이 켜지고(번쩍·고리) 안의 사람이 들썩인다. 아래층 사람은 그때 팔을 든다. 4.6초마다 한 번(처음은 2.3초), 이웃 창은 9초 뒤 꺼진다.
       위층 창 차례: 가운데(게임) → 왼쪽(앱) → 오른쪽(웹 도구). 넓은 화면은 사이사이 먼 도시의 창으로도 보낸다(켜진 채 남아 도시가 조금씩 밝아짐).
       누르면(폰 손가락·PC 클릭) 그 자리로: 창 근처면 그 창, 지붕 위 하늘이면 거기서 불꽃. PC 마우스가 꺼진 위층 창에 다가가도 그 창으로 */
    var FIRST = 2300, EVERY = 4600, STAY = 9000, ORDER = [1, 0, 2];
    var next = -1, turnN = 0, poke = null, lastGo = -1e9, hoverAt = -1e9;
    function ctm(b) { var m = b.svg.getScreenCTM(); return m; }
    function toSvg(b, x, y) { var m = ctm(b).inverse(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
    function toScr(b, x, y) { var m = ctm(b); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
    function rp(b, x, y) { return [b.rx + x * b.rw / 324, b.ry + y * b.rh / 164]; }   // 방 좌표 → 건물 좌표
    function launch(b, t, to) {   // to = { w: 이웃 창 } | { far: 먼 창, x, y } | { p: 지나가는 사람, x, y }(휴대폰) | { x, y } (하늘 불꽃)
      var m = ctm(b), px = Math.sqrt(m.a * m.a + m.b * m.b) || 1, j = to.w ? ICON[to.w.kind] : turnN % 3;
      var p0 = rp(b, 236 + 16 * j, 64), p3 = to.w ? [to.w.cx, to.w.cy] : [to.x, to.y];
      var top = Math.min(b.roof, p3[1]) - (to.w ? 80 : 30) / px, dx = p3[0] - p0[0];
      if (to.w || to.far) top = Math.max(top, Math.min(toSvg(b, 0, copy.getBoundingClientRect().bottom + (to.far ? 30 : 14))[1], Math.min(p0[1], p3[1]) - 40 / px));   // 단추·글 밑으로(먼 도시로는 더 낮게)
      var g = el('g', {}, b.fx), tail = [];
      el('circle', { r: 22 / px, fill: 'url(#n-dot)' }, g);
      for (var i = 0; i < 9; i++) tail.push(el('line', { 'class': 'n-trail' }, g));
      var core = el('circle', { 'class': 'n-bead', r: 4 / px }, g);
      var side = (dx < 0 ? 1 : -1) * Math.max(Math.abs(dx) * .45, 70 / px);   // 목표 반대쪽으로 크게 휘었다가 위에서 내려 꽂힘
      var c1 = [p0[0] + side, top - 20 / px], c2 = [p3[0] - side * .55, top - 60 / px];
      if (to.p) { c1 = [p0[0] + dx * .2, p0[1] - 50 / px]; c2 = [p3[0] - dx * .08, p3[1] - 120 / px]; }   // 길의 사람: 유리를 나와 살짝 솟았다가 들어 올린 휴대폰으로 떨어짐
      b.fl.push({ at: t, dur: to.w || to.far ? 1300 : to.p ? 1150 : 1000, p0: p0, c1: c1, c2: c2, p3: p3,
        to: to, g: g, tail: tail, core: core, px: px, hist: [], out: false });
      if (to.w) to.w.aim = true;
      b.re = { at: t, kind: KINDS[turnN % KINDS.length], j: j };
      turnN++; lastGo = t;
    }
    function ring(b, x, y, R, t, px) { b.bits.push({ e: el('circle', { 'class': 'n-ring', cx: x, cy: y, r: 0 }, b.fx), at: t, R: R / px, px: px, kind: 'ring' }); }
    function spark(b, x, y, t, px) {   // 하늘 불꽃: 열두 갈래로 퍼지며 떨어짐(큰 것·작은 것 번갈아)
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2 + .3, v = (70 + (i % 3) * 26) / px;
        b.bits.push({ e: el('circle', { 'class': i % 2 ? 'n-bead' : 'n-spark', cx: x, cy: y, r: (i % 2 ? 2.4 : 3.4) / px }, b.fx), at: t, x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, px: px, kind: 'spark' });
      }
    }
    function land(b, f, t) {
      var to = f.to;
      if (to.w) { to.w.on = true; to.w.aim = false; to.w.pop = t; to.w.off = t + STAY; ring(b, f.p3[0], f.p3[1], 48, t, f.px); }
      else if (to.p) { to.p.lit = t; to.p.mode = 'lit'; to.p.at = t; ring(b, f.p3[0], f.p3[1], 30, t, f.px); }
      else if (to.far) {
        to.far.style.fill = 'var(--lamp)'; to.far.style.opacity = '.55'; rig.farLit.push(to.far);
        if (rig.farLit.length > 7) { var o = rig.farLit.shift(); o.style.fill = o.style.opacity = ''; }
        ring(b, f.p3[0], f.p3[1], 22, t, f.px);
      } else { spark(b, f.p3[0], f.p3[1], t, f.px); ring(b, f.p3[0], f.p3[1], 30, t, f.px); }
    }
    function farTarget(b) {   // 넓은 화면: 화면에 보이는(건물에 가리지 않은) 꺼진 먼 창 하나
      var br = b.svg.querySelector('.n-bld').getBoundingClientRect(), sr = stage.getBoundingClientRect(), cand = [];
      rig.far.forEach(function (r) {
        if (r === farOn || rig.farLit.indexOf(r) >= 0) return;
        var q = r.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
        if (x > sr.left + 24 && x < sr.right - 24 && y > sr.top + 80 && y < sr.bottom && (x < br.left - 6 || y < br.top - 6)) cand.push([r, x, y]);
      });
      if (!cand.length) return null;
      var c = cand[(turnN * 7919) % cand.length], p = toSvg(b, c[1], c[2]);
      return { far: c[0], x: p[0], y: p[1] };
    }
    /* 거리의 사람: 화면 밖에서 걸어와 방 창 아래(왼쪽에서 오면 왼쪽 1/3, 오른쪽에서 오면 오른쪽 1/3)에 서서 휴대폰을 들어 올리면, 방에서 불빛이 내려와 그 화면이 켜진다
       → 두 번 깡충, 화면을 보며 가던 쪽으로 걸어 나간다. 처음은 들어온 지 6초, 그 뒤 10~14초마다(방향은 번갈아). 내리기 시작하면 불빛 없이 그냥 지나간다. 누르면 깡충 */
    var WALK = 40, WS = 1.2;   // 걷는 빠르기(건물 그림 단위/초, 폰에서 초당 40px쯤), 사람 크기(그림 단위로 키 36쯤)
    function walk(b, t, live, m) {
      var w = b.wk, dt = Math.min(100, t - (w.last || t)), step = WALK * dt / 1000;
      w.last = t;
      if (!w.mode) {
        if (!w.next) w.next = t + (introing ? 4200 - it : 2500);
        if (!live || t < w.next) { w.g.setAttribute('opacity', 0); return; }
        var cm = ctm(b), px = Math.sqrt(cm.a * cm.a + cm.b * cm.b) || 1, sr = stage.getBoundingClientRect(), L = toSvg(b, sr.left, 0)[0], R = toSvg(b, sr.right, 0)[0];
        var edge = Math.max(L - 16 / px, b.bx - 70);   // 넓은 화면은 글 밑 거리를 비워 두고 건물 왼쪽 끝 조금 앞에서 나타남
        w.dir = w.n % 2 ? -1 : 1; w.n++;
        w.from = w.dir > 0 ? edge : R + 16 / px; w.to = w.dir > 0 ? R + 16 / px : edge;
        w.stop = b.gx + b.gw * (w.dir > 0 ? .3 : .7); w.x = w.from; w.dist = 0; w.mode = 'in'; w.at = t; w.lit = -1e9;
        w.feet = Math.min(16, (street ? street.offsetHeight : 30) * .58 / px);
      }
      var md = w.mode, a = t - w.at, up = 0, read = 0;
      if (md === 'in' || md === 'out') {
        w.x += w.dir * step; w.dist += step;
        if (md === 'in' && w.dir * (w.x - w.stop) >= 0) { w.x = w.stop; w.mode = 'stop'; w.at = t; }
        if (md === 'out' && w.dir * (w.x - w.to) >= 0) { w.mode = ''; w.next = t + 9000 + (w.n % 3) * 2000; w.g.setAttribute('opacity', 0); return; }
      } else if (md === 'stop') { up = ease(k(a, 300, 650)); if (a > 700) { if (live && b.fl.length < 3) { launch(b, t, { p: w, x: w.x + w.dir * 4.6 * WS, y: w.gnd + w.feet - 31.6 * WS }); w.mode = 'wait'; } else w.mode = 'out'; w.at = t; } }
      else if (md === 'wait') { up = 1; if (a > 2600) { w.mode = 'out'; w.at = t; } }
      else if (md === 'lit') { up = 1 - ease(k(a, 300, 650)); if (a > 1050) { w.mode = 'out'; w.at = t; } }
      if (w.lit > 0 && (md === 'lit' || md === 'out')) read = ease(k(t - w.lit, 300, 650));
      var ph = w.dist / 4.6, walking = w.mode === 'in' || w.mode === 'out', sw = walking ? Math.sin(ph) : 0;
      var hopA = Math.max(md === 'lit' ? a : -1, t - w.hop), hy = hopA >= 0 && hopA < 760 ? -Math.abs(Math.sin(hopA / 380 * Math.PI)) * 5 * (1 - hopA / 900) : 0;
      var by = walking ? -Math.abs(Math.cos(ph)) * .5 : 0, f = function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); };
      w.legs[0].setAttribute('d', 'M0 ' + (-10.4 + by).toFixed(2) + 'L' + f([sw * 4.4, -Math.max(0, Math.cos(ph)) * (walking ? 1.3 : 0)]));
      w.legs[1].setAttribute('d', 'M0 ' + (-10.4 + by).toFixed(2) + 'L' + f([-sw * 4.4, -Math.max(0, -Math.cos(ph)) * (walking ? 1.3 : 0)]));
      var sh = [.4, -20.4 + by], hand = [sw * 3.2, -12.6 + by], elb = [sw * 1.4 + .4, -16.4 + by];
      w.arms[0].setAttribute('d', 'M' + f(sh) + 'L' + f([-sw * 1.4, -16.4 + by]) + 'L' + f([-sw * 3.2, -12.6 + by]));
      if (up) { elb = mix(elb, [3.2, -25], up); hand = mix(hand, [4.6, -31.6], up); }
      if (read) { elb = mix(elb, [3.4, -15.4 + by], read); hand = mix(hand, [5.4, -19.6 + by], read); }
      w.arms[1].setAttribute('d', 'M' + f(sh) + 'L' + f(elb) + 'L' + f(hand));
      var held = up > 0 || read > 0 || md === 'wait';
      w.ph.setAttribute('transform', 'translate(' + f(hand) + ')'); w.ph.setAttribute('opacity', held ? 1 : 0);
      var on = w.lit > 0 && held ? k(t - w.lit, 0, 120) : 0;
      w.scr.setAttribute('opacity', on); w.glow.setAttribute('opacity', (on * (.75 + .15 * Math.sin(t / 170))).toFixed(3));
      tf(w.head, up * .6, by - up * .5);
      var fade = Math.min(1, Math.abs(w.x - w.from) / 20, Math.abs(w.to - w.x) / 20);
      w.g.setAttribute('opacity', (fade * m).toFixed(3));
      w.g.setAttribute('transform', 'translate(' + w.x.toFixed(2) + ',' + (w.gnd + w.feet + hy).toFixed(2) + ') scale(' + w.dir * WS + ',' + WS + ')');
    }
    function pickWin(b) { for (var i = 0; i < 3; i++) { var w = b.nb[ORDER[(turnN + i) % 3] % b.nb.length]; if (w && !w.on && !w.aim) return w; } return null; }
    function story(now, t, b, m, ml) {
      if (next < 0) next = t + (introing ? FIRST - it : 900);
      var live = m > .98 && !ride;   // 내리기 시작하면 새로 보내지 않고 날던 것은 걷는다
      if (live && t >= next && b.fl.length < 2) {
        var far = b.wide && turnN % 2 === 1 ? farTarget(b) : null, w = far ? null : pickWin(b);
        if (far) launch(b, t, far);
        else if (w) launch(b, t, { w: w });
        else { var sk = toSvg(b, innerWidth * (.3 + .4 * ((turnN * .618) % 1)), stage.getBoundingClientRect().top + 90); launch(b, t, { x: sk[0], y: Math.min(sk[1], b.roof - 60) }); }
        next = t + EVERY;
      }
      if (live && poke && !introing) {   // 누른 자리: 방 안 사람·스탠드, 간판, 지나가는 사람은 그 자리에서 반응. 그 밖엔 불빛을 보낸다
        var pt = toSvg(b, poke.x, poke.y), hit = null, best = 1e9, wk = b.wk;
        var qx = (pt[0] - b.rx) * 324 / b.rw, qy = (pt[1] - b.ry) * 164 / b.rh, bd = b.board, bx = +bd.getAttribute('x'), byy = +bd.getAttribute('y');
        var inRoom = qx >= 0 && qx <= 324 && qy >= 0 && qy <= 164, inb = function (a, lo, hi) { return a >= lo && a <= hi; };
        if (inRoom && inb(qx, 186, 244) && qy > 56) b.wave = t;
        else if (inRoom && inb(qx, 146, 186) && inb(qy, 44, 112)) b.flick = t;
        else if (inb(pt[0], bx - 8, bx + +bd.getAttribute('width') + 8) && inb(pt[1], byy - 10, byy + +bd.getAttribute('height') + 10)) b.sign = t;
        else if (wk.mode && inb(pt[0], wk.x - 16, wk.x + 16) && inb(pt[1], wk.gnd - 30, wk.gnd + 30)) wk.hop = t;
        else if (t - lastGo > 280 && b.fl.length < 4) {
          b.nb.forEach(function (w) { var dx = (pt[0] - w.cx) / w.w, dy = (pt[1] - w.cy) / w.h, dd = dx * dx + dy * dy; if (dd < best) { best = dd; hit = w; } });
          if (pt[1] < b.roof - 10) launch(b, t, { x: pt[0], y: pt[1] });
          else if (hit) launch(b, t, { w: hit });
          next = Math.max(next, t + EVERY * .6);
        }
      }
      poke = null;
      walk(b, t, live, m);
      if (live && fine.matches && mx >= 0 && t - lastGo > 1100 && t - hoverAt > 300 && b.fl.length < 2) {   // PC: 마우스가 꺼진 위층 창 가까이
        hoverAt = t;
        b.nb.forEach(function (w) {
          if (w.on || w.aim || b.fl.length >= 2) return;
          var c = toScr(b, w.cx, w.cy), r = toScr(b, w.cx + w.w / 2, w.cy);
          if (Math.abs(mx - c[0]) < Math.max(70, (r[0] - c[0]) * 1.4) && Math.abs(my - c[1]) < Math.max(60, (r[0] - c[0]) * 1.4)) { launch(b, t, { w: w }); next = Math.max(next, t + EVERY * .6); }
        });
      }
      b.fx.setAttribute('opacity', m.toFixed(3));
      // 날아가는 불빛: 3차 곡선(모니터 → 지붕 위 → 목표). 유리를 지날 때 가장 크고(보는 쪽으로 다가옴) 끝에서 작아짐
      for (var i = b.fl.length - 1; i >= 0; i--) {
        var f = b.fl[i], s = k(t - f.at, 0, f.dur), e = s < .5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s), z = 1 - e, P = [0, 1].map(function (a) {
          return z * z * z * f.p0[a] + 3 * z * z * e * f.c1[a] + 3 * z * e * e * f.c2[a] + e * e * e * f.p3[a];
        });
        if (!f.out && e > .06) { f.out = true; b.sheenAt = t; }
        var sz = (1 + 1.1 * bell(e, 0, .22, 1)) * (f.to.w || f.to.far ? 1 : 1.2);
        f.hist.unshift(P); if (f.hist.length > 10) f.hist.pop();
        f.core.setAttribute('cx', P[0].toFixed(1)); f.core.setAttribute('cy', P[1].toFixed(1)); f.core.setAttribute('r', (4 * sz / f.px).toFixed(2));
        f.g.firstChild.setAttribute('cx', P[0].toFixed(1)); f.g.firstChild.setAttribute('cy', P[1].toFixed(1)); f.g.firstChild.setAttribute('r', (22 * sz / f.px).toFixed(2));
        f.tail.forEach(function (c, n) {   // 꼬리: 지난 자리들을 이은 선, 뒤로 갈수록 가늘고 흐림
          var h0 = f.hist[n], h1 = f.hist[n + 1]; if (!h1) { c.setAttribute('stroke-width', 0); return; }
          c.setAttribute('x1', h0[0].toFixed(1)); c.setAttribute('y1', h0[1].toFixed(1)); c.setAttribute('x2', h1[0].toFixed(1)); c.setAttribute('y2', h1[1].toFixed(1));
          c.setAttribute('stroke-width', (6 * sz * (1 - n / 10) / f.px).toFixed(2)); c.setAttribute('opacity', (.7 * (1 - n / 9)).toFixed(3));
        });
        if (s >= 1 || !live) { b.fx.removeChild(f.g); b.fl.splice(i, 1); if (live) land(b, f, t); else if (f.to.w) f.to.w.aim = false; else if (f.to.p) { f.to.p.mode = 'out'; f.to.p.at = t; } }
      }
      var sa = k(t - b.sheenAt, 0, 520);
      b.sheen.setAttribute('opacity', (sa > 0 && sa < 1 ? Math.sin(sa * Math.PI) : 0).toFixed(3));
      b.sheen.setAttribute('transform', 'translate(' + (lerp(-.7, .7, sa) * b.gw).toFixed(1) + ',0)');
      for (i = b.bits.length - 1; i >= 0; i--) {
        var q = b.bits[i], a = t - q.at;
        if (q.kind === 'ring') { var rr = k(a, 0, 650); q.e.setAttribute('r', (q.R * eo(rr) + 2 / q.px).toFixed(2)); q.e.setAttribute('stroke-width', (2.4 * (1 - rr) / q.px + .2 / q.px).toFixed(2)); q.e.setAttribute('opacity', (1 - rr).toFixed(3)); if (rr >= 1) { b.fx.removeChild(q.e); b.bits.splice(i, 1); } }
        else { var sp = a / 1000; q.e.setAttribute('cx', (q.x + q.vx * sp).toFixed(1)); q.e.setAttribute('cy', (q.y + q.vy * sp + 70 / q.px * sp * sp).toFixed(1)); q.e.setAttribute('opacity', (1 - k(a, 300, 800)).toFixed(3)); if (a > 800) { b.fx.removeChild(q.e); b.bits.splice(i, 1); } }
      }
      // 이웃 창: 켜지면 번쩍하고 안의 사람이 두 번 반 들썩, 화면 빛이 일렁이고 고양이 꼬리가 흔들림. 9초 뒤 꺼짐
      b.nb.forEach(function (w) {
        if (w.on && t > w.off) w.on = false;
        w.g.setAttribute('opacity', w.on ? ml.toFixed(3) : 0);
        if (!w.on) return;
        var pa = t - w.pop;
        w.flash.setAttribute('opacity', ((1 - k(pa, 0, 420)) * .8).toFixed(3));
        if (w.who) tf(w.who, 0, pa < 1100 ? -Math.abs(Math.sin(pa / 1100 * Math.PI * 2.5)) * (1 - pa / 1100) * 6 : 0);
        if (w.tail) w.tail.setAttribute('transform', 'rotate(' + (Math.sin(t / 360) * (pa < 1600 ? 24 : 10)).toFixed(1) + ' 53.5 55.4)');
        if (w.lite) w.lite.setAttribute('opacity', (.7 + .2 * Math.sin(t / 150 + w.kind * 2)).toFixed(3));
      });
      return b.fl.length || b.bits.length;
    }
    function still() {   // 움직임을 끄면 그림 한 장(타자 멈춘 자리)으로
      finishIntro();
      if (!rig) return;
      rig.blds.forEach(function (b) {
        [b.head, b.body, b.lh].concat(b.steam, b.icons).forEach(function (e) { e.removeAttribute('transform'); });
        b.steam.forEach(function (e) { e.style.opacity = ''; });
        b.arms.forEach(function (a) { a.removeAttribute('d'); });
        b.l1.setAttribute('width', 30); b.l2.setAttribute('width', 20); b.caret.setAttribute('x', 248.6); b.caret.setAttribute('y', 77.6); b.caret.setAttribute('opacity', 0);
        b.flash.setAttribute('opacity', 0); b.sheen.setAttribute('opacity', 0); b.re = null;
        b.fl.concat(b.bits).forEach(function (f) { b.fx.removeChild(f.g || f.e); }); b.fl = []; b.bits = [];
        b.nb.forEach(function (w) { w.on = w.aim = false; w.g.setAttribute('opacity', 0); });
        b.wk.mode = ''; b.wk.next = 0; b.wk.g.setAttribute('opacity', 0);
        b.letters.forEach(function (e) { e.removeAttribute('y'); }); b.sign = b.wave = b.flick = null; roomOff(b, false);
      });
      rig.farLit.forEach(function (r) { r.style.fill = r.style.opacity = ''; }); rig.farLit = [];
      if (farOn) farOn.style.fill = farOn.style.opacity = '';
      farOn = null; pmx = pmy = 0; next = -1;
    }

    /* 마우스(PC): 층 깊이. 폰: 기울기로 층 깊이. 누르기·마우스로 불빛 보내기는 위 '이야기' */
    var mx = -1, my = -1, pmx = 0, pmy = 0, tilt = null;
    addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
    d.addEventListener('mouseleave', function () { mx = my = -1; kick(); });
    stage.addEventListener('click', function (e) {
      if (!rig || !moving() || (e.target.closest && e.target.closest('a, button'))) return;
      poke = { x: e.clientX, y: e.clientY }; kick();
    });
    // 기울기: 허락을 묻지 않고 되는 곳(안드로이드 크롬 등)만. 처음 든 자세를 가운데로 두고 천천히 다시 가운데로 돌아간다
    if (!fine.matches && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function')
      addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        if (!tilt) tilt = { g: e.gamma, b: e.beta, x: 0, y: 0 };
        tilt.g += (e.gamma - tilt.g) * .02; tilt.b += (e.beta - tilt.b) * .02;
        tilt.x = clamp((e.gamma - tilt.g) / 24 + .5) - .5; tilt.y = clamp((e.beta - tilt.b) / 24 + .5) - .5;
      });
    function pointerAt() {   // 아직 움직이는 중이면 true
      var aim = fine.matches && mx >= 0, tx = aim ? mx / innerWidth - .5 : tilt ? tilt.x : 0, ty = aim ? my / innerHeight - .5 : tilt ? tilt.y : 0;
      pmx += (tx - pmx) * .08; pmy += (ty - pmy) * .08;
      var busy = Math.abs(tx - pmx) > .001 || Math.abs(ty - pmy) > .001;
      if (!busy) { pmx = tx; pmy = ty; }
      return busy || !!tilt;
    }

    /* 내릴 때: 카메라 박자(마디 p, 초점=그림의 한 점, 배율, 그 점이 올 화면 자리)를 단조 3차 곡선으로 잇는다(처음과 끝은 천천히) */
    var KN = [0, .12, .26, .38, .48, .56, 1];
    function curve(ys) {
      var n = ys.length, dl = [], m = [0];
      for (var i = 0; i < n - 1; i++) dl.push((ys[i + 1] - ys[i]) / (KN[i + 1] - KN[i]));
      for (i = 1; i < n - 1; i++) {
        var h0 = KN[i] - KN[i - 1], h1 = KN[i + 1] - KN[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m.push(dl[i - 1] * dl[i] <= 0 ? 0 : (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]));
      }
      m.push(0);
      return function (x) {
        for (var i = 0; i < n - 2 && x > KN[i + 1]; i++);
        var h = KN[i + 1] - KN[i], t = clamp((x - KN[i]) / h), t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
      };
    }
    var on = false, W = 0, H = 0, start = 0, travel = 1, hh = 0, barH = 64, cam = null, pt = null;
    function shoot(p, m) {   // 그림과 지나가는 빛, 글, 종이색. 아이콘은 fly()
      var s = Math.exp(cam.ls(p)), fx = cam.fx(p), fy = cam.fy(p), tx = cam.tx(p), ty = cam.ty(p);
      var X = function (q) { return tx + (q.x - fx) * s; }, Y = function (q) { return ty + (q.y - fy) * s; };
      lay(near, s, fx, fy, tx - 16 * pmx * m, ty - 8 * pmy * m, p);
      lay(back, Math.pow(s, .3), fx, fy, tx - 7 * pmx * m, ty - 4 * pmy * m, p);
      var a = k(p, .01, .09);   // 글: 한 칸 굴려도 바로 사라지지 않게 조금 두었다가 건물이 옆으로 오기 전에 걷히며 올라간다(숨기지는 않음: 읽기 도구, 포커스 오면 CSS가 다시 보임)
      copy.style.opacity = a ? (1 - a).toFixed(3) : ''; copy.style.transform = a ? 'translateY(' + (-64 * a).toFixed(1) + 'px)' : '';
      var fl = bell(p, .1, .18, .26);   // ② 간판 빛이 번짐
      rig.flare.style.opacity = fl ? (fl * .8).toFixed(3) : '';
      if (fl) { rig.flare.style.width = rig.flare.style.height = (240 + 560 * fl).toFixed(0) + 'px'; rig.flare.style.transform = 'translate(' + X(pt.sg).toFixed(1) + 'px,' + Math.max(Y(pt.sg), 30).toFixed(1) + 'px) translate(-50%,-50%)'; }
      var sk = bell(p, .28, .32, .37), bl = bell(p, .3, .34, .4);   // ③ 유리: 반사 빛줄기 한 번, 따뜻한 빛 한 번
      rig.streak.style.opacity = sk ? (sk * .7).toFixed(3) : '';
      if (sk) rig.streak.style.transform = 'translateX(' + lerp(-55, 55, k(p, .28, .37)).toFixed(1) + '%)';
      rig.bloom.style.opacity = bl ? (bl * .5).toFixed(3) : '';
      var ar = eio(k(p, .36, .5)) * (B.wide ? 1 : .4);   // ④ 방 안: 가까운 사람은 많이, 스탠드는 조금, 먼 벽은 반대로 → 어깨 쪽으로 돌아 들어감(세로 화면은 방이 크게 잡혀 덜)
      tf(B.man, -34 * ar, 16 * ar); tf(B.lamp, -10 * ar, 0); tf(B.back, 12 * ar, 0);
      var wo = k(p, .47, .5), we = eo(k(p, .5, .58));   // ⑤ 모니터 화면 자리에 종이색이 앉고, 거기서 화면 가득 넓어짐
      var iw = 1 - we, R = [Math.max(0, X(pt.s0)) * iw, Math.max(0, Y(pt.s0)) * iw, W - Math.max(0, W - X(pt.s1)) * iw, H - Math.max(0, H - Y(pt.s1)) * iw], rad = 8 * iw;
      wash.style.opacity = wo.toFixed(3);
      wash.style.clipPath = wo && we < 1 ? 'inset(' + [R[1], W - R[2], H - R[3], R[0]].map(function (v) { return v.toFixed(1) + 'px'; }).join(' ') + ' round ' + rad.toFixed(1) + 'px)' : '';
      hero.style.setProperty('--f', we.toFixed(3));
      // 폰 주소창이 접히면 무대(100svh) 밑으로 첫 화면 바탕이 조금 보인다: 그때 무대 아래쪽 색(거리 → 방 안 → 종이)을 따라가게
      hero.style.setProperty('--g', k(p, .2, .36).toFixed(3));
      // 어두운 화면 설정: 종이(어두운 색)가 덮기 전에 방 불빛을 먼저 낮춘다(밝은 방과 어두운 종이가 섞여 회색이 되지 않게)
      var dk = dim.matches ? k(p, .36, .48) : 0;
      night.style.filter = dk ? 'brightness(' + (1 - .8 * dk).toFixed(3) + ') saturate(' + (1 + .6 * dk).toFixed(3) + ')' : '';
      portal(p, R, rad);
      return { X: X, Y: Y, s: s, we: we, gt: Y(pt.o) };
    }
    function lay(l, s, fx, fy, tx, ty, p) {
      var x = tx - fx * s, y = ty - fy * s;
      l.style.transform = !p && Math.abs(x) < .05 && Math.abs(y) < .05 ? '' : 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }
    // 아이콘 셋: 모니터 화면이 넓어지기 시작하면(화면 속 그 자리에서) 떠올라, 조금씩 엇갈려 '만든 것'의 제 칸으로 날아가 앉는다. 제자리에 오면 진짜 아이콘으로
    function fly(p, c, sr, rs) {
      rig.ghosts.forEach(function (g, j) {
        var live = p >= .47 && p < SHOW;
        g.img.style.opacity = live ? '1' : '';
        g.icon.style.visibility = live ? 'hidden' : '';
        if (p >= SHOW) g.wi.classList.add('landed');   // 켜진 채 앉았으니 선반이 다시 끄고 켜지 않게
        if (!live) return;
        var gp = eio(k(p, .5 + j * .02, .62 + j * .02)), q = pt.ic[j], tr = rs[j];
        var x = lerp(sr.left + c.X(q), tr.left, gp), y = lerp(sr.top + c.Y(q), tr.top, gp) - Math.sin(gp * Math.PI) * 60, z = lerp(12 * pt.ru * c.s, tr.width, gp);
        g.img.style.width = g.img.style.height = z.toFixed(1) + 'px';
        g.img.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
    }

    function topNight(v) {
      if (v === dark) return;
      dark = v; d.classList.toggle('top-night', v);
      [].forEach.call(metas, function (m, i) { m.content = v ? sky : day[i]; });
    }
    var dark = null;
    /* 모니터 화면 = '만든 것'으로 가는 창: 종이색이 화면 자리에서 넓어지는 동안, 그 사각형(R, 화면 좌표) 안에 '만든 것'이 끝(END)에 있을 모습 그대로
       (넓은 화면은 그 크기로 줄여서) 보인다. 사각형이 화면을 다 덮으면 배율 1, END에서 제자리(옮김 없음). 그 전까진 누를 수 없고 선반 불은 미룬다(SHOW에 켬) */
    var wTop = 0, wH = 0;
    function portal(p, R, rad) {
      if (!works) return;
      var o = k(p, .47, .5);
      works.style.opacity = o < 1 ? o.toFixed(3) : '';
      var sc = (R[2] - R[0]) / W, now = wTop - scrollY, end = wTop - start - travel * END;
      if (o > 0 && p < END && (sc < .999 || R[0] > .5 || R[3] < H - .5 || Math.abs(R[1] + end * sc - now) > 1.5)) {   // 화면을 다 덮고 1px 안쪽이면 제자리로 둔다(스크롤은 정수 px)
        works.style.transformOrigin = '0 0';
        works.style.transform = 'translate(' + R[0].toFixed(1) + 'px,' + (R[1] + end * sc - now).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
        works.style.clipPath = 'inset(' + Math.max(0, -end).toFixed(1) + 'px 0 ' + Math.max(0, wH - (R[3] - R[1]) / sc + end).toFixed(1) + 'px 0 round ' + (rad / sc).toFixed(1) + 'px)';
      } else works.style.transform = works.style.clipPath = works.style.transformOrigin = '';
      settle(p >= SHOW);
    }
    function settle(v) {   // '만든 것'이 제자리에 다 왔나: 그 전엔 누를 수 없고(포커스가 오면 END로 내려 줌) 선반 불은 기다린다
      if (works) works.style.pointerEvents = v ? '' : 'none';
      veiled = !v;
      if (hush === v) { hush = !v; if (v) setTimeout(function () { wake(); }); }   // 다음 차례에: 같은 프레임에 날아와 앉은 아이콘(.landed)이 먼저 표시되게
    }
    function rest() {   // 확대·지나가는 빛·날아가는 아이콘을 처음 자리로(재기 전에, 움직임을 끌 때)
      near.style.transform = back.style.transform = night.style.filter = '';
      copy.style.opacity = copy.style.transform = '';
      wash.style.opacity = wash.style.clipPath = ''; hero.style.removeProperty('--f'); hero.style.removeProperty('--g');
      if (works) works.style.opacity = works.style.transform = works.style.clipPath = works.style.transformOrigin = '';
      if (rig) {
        [rig.flare, rig.streak, rig.bloom].forEach(function (e) { e.style.opacity = ''; });
        rig.blds.forEach(function (b) { [b.man, b.lamp, b.back].forEach(function (g) { g.removeAttribute('transform'); }); });
        rig.ghosts.forEach(function (g) { g.img.style.opacity = ''; g.icon.style.visibility = ''; });
      }
      settle(true);
    }
    /* 화면 크기가 바뀔 때마다: 확대할지, 보이는 건물, 그림의 점들(무대 좌표), 박자별 배율, 붙어 있는 거리 */
    function measure() {
      rest(); seen = '';
      // 확대를 못 하게 되면(동작 줄이기를 켬, site.js가 안 와서 head 스크립트가 움직임을 끔) .zoom 을 떼어 첫 화면을 화면 한 장으로
      d.classList.toggle('zoom', want && moving());
      if (moving() && !rig) build();
      if (!moving()) still();
      on = d.classList.contains('zoom') && tall.matches;
      start = hero.getBoundingClientRect().top + scrollY; hh = hero.offsetHeight; barH = bar ? bar.offsetHeight : 64;
      travel = Math.max(1, hh - stage.offsetHeight);
      if (works) { wTop = works.getBoundingClientRect().top + scrollY; wH = works.offsetHeight; }
      B = rig && rig.blds.filter(function (b) { return b.svg.getBoundingClientRect().width > 0; })[0] || null;
      if (on && B) {
        var m = B.svg.getScreenCTM(), nr = night.getBoundingClientRect();
        var toN = function (x, y) { return { x: m.a * x + m.c * y + m.e - nr.left, y: m.b * x + m.d * y + m.f - nr.top }; };
        var rn = function (x, y) { return toN(B.rx + x * B.rw / 324, B.ry + y * B.rh / 164); };
        W = nr.width; H = nr.height;
        var G = rn(162, 82), RC = rn(226, 84), M = rn(252, 64), o = rn(0, 0), bd = B.board;
        var gw = rn(324, 0).x - o.x, sw = rn(286, 0).x - rn(218, 0).x, sh = rn(0, 84).y - rn(0, 44).y;
        var s2 = Math.max(1.6, .82 * W / gw), s3 = Math.max(s2 * 1.6, 1.55 * W / gw), s5 = 1.1 * Math.max(W / sw, Math.min(H / sh, 1.3 * W / sw)), s4 = Math.max(.72 * W / sw, s3 * 1.2);
        var mid = { x: W / 2, y: H / 2 }, keys;
        // ① 옆걸음 ② 창 ③ 유리 너머 사람과 모니터 사이 ④ 모니터 화면 ⑤ 모니터 화면이 화면을 덮음(끝까지 그대로)
        if (B.wide) keys = [[G, 1, G], [G, 1.3, { x: W * .58, y: H * .62 }], [G, s2, { x: W / 2, y: H * .58 }], [RC, s3, { x: W / 2, y: H * .55 }], [M, s4, mid], [M, s5, mid], [M, s5, mid]];
        else {
          // 세로 화면: ① 글이 걷힌 자리로 건물이 조금 올라오며 커짐 ② 위층 창·간판·방 창을 한 화면에(방 창 폭 = 화면 94%, 창 아래가 화면 84%)
          // ③ 방이 화면 높이를 다 채운 채 사람과 모니터 사이(창틀·바깥이 안 보이게) ④ 모니터(방이 화면을 다 덮는 배율 이상) ⑤ 같은 끝
          var gh = rn(0, 164).y - o.y, e = rn(324, 164);
          var cover = function (q) { return Math.max(W / 2 / (q.x - o.x), W / 2 / (e.x - q.x), H / 2 / (q.y - o.y), H / 2 / (e.y - q.y)); };   // q를 화면 가운데에 둘 때 방이 화면을 다 덮는 배율
          var t2 = .94 * W / gw, C3 = rn(250, 82), t3 = Math.max(1.04 * H / gh, cover(C3)), t4 = Math.max(W / sw, t3 * 1.15, cover(M) * 1.02);
          s5 = Math.max(s5, t4 * 1.2);
          keys = [[G, 1, G], [G, 1.15, { x: W / 2, y: G.y - H * .05 }], [G, t2, { x: W / 2, y: H * .84 - gh * t2 / 2 }], [C3, t3, mid], [M, t4, mid], [M, s5, mid], [M, s5, mid]];
        }
        var col = function (f) { return curve(keys.map(f)); };
        cam = { ls: col(function (q) { return Math.log(q[1]); }), fx: col(function (q) { return q[0].x; }), fy: col(function (q) { return q[0].y; }),
          tx: col(function (q) { return q[2].x; }), ty: col(function (q) { return q[2].y; }) };
        pt = { o: o, s0: rn(218, 44), s1: rn(286, 84), ic: [rn(230, 58), rn(246, 58), rn(262, 58)], ru: rn(1, 0).x - o.x,
          sg: toN(+bd.getAttribute('x') + bd.getAttribute('width') / 2, +bd.getAttribute('y') + bd.getAttribute('height') / 2) };
      } else on = false;
      cancelAnimationFrame(raf); raf = 0; frame();
    }

    /* 장면을 끝까지(위 머리 설명): ride = { dir, a → b(p), p 지금, u 0~1, dur, rate } */
    var END = SHOW + .02, FWD = 3400, BWD = 2200, ride = null, coast = 0, free = 0, lastIn = -1e9, lastY = scrollY, lastWheel = 0;
    var can = function () { return on && !!B && moving() && !d.classList.contains('is-sheet'); };
    var yTop = function () { return Math.max(0, start); }, yEnd = function () { return start + travel * END; };
    function go(dir, to) {   // dir 1 = 내림, -1 = 올림. to: 멈출 p(없으면 END나 맨 위)
      var now = performance.now();
      if (ride && ride.dir === dir && to == null) { if (now - ride.sped > 250) { ride.rate = Math.min(4, ride.rate * 2); ride.sped = now; } return; }   // 같은 쪽으로 또: 빨리
      var a = ride ? ride.p : (scrollY - start) / travel, b = to != null ? to : dir > 0 ? END : (yTop() - start) / travel;
      var span = Math.abs(Math.min(b, END) - Math.min(a, END)) / END, dur = (dir > 0 ? FWD : BWD) * span + (Math.max(a, b) > END + .01 ? 400 : 0);
      if (dur < 80) return;
      ride = { dir: dir, a: a, b: b, p: a, u: 0, dur: dur, rate: 1, sped: now };
      if (!fine.matches) d.style.overflow = 'hidden';   // 폰: 손가락 관성을 멈춘다(스크립트 스크롤은 그대로 됨). PC는 스크롤 막대 폭이 바뀌지 않게 휠·키만 막는다
      kick();
    }
    function stop(jump) {
      if (!ride) return;
      var y = start + travel * ride.b; ride = null; d.style.overflow = '';
      if (jump) scrollTo({ top: Math.max(0, y), behavior: 'instant' });
      lastY = scrollY; coast = performance.now() + 1200;
    }
    function intent(dir) {   // 사람이 내리거나 올리려 함: 맨 위에서 내림, END에서 올림, 그 사이 어디서든이면 받아서 true
      if (!can()) return false;
      if (ride) { go(dir); return true; }
      var y = scrollY, a = yTop(), z = yEnd();
      if ((dir > 0 && y <= a + 2) || (dir < 0 && Math.abs(y - z) <= 3) || (y > a + 2 && y < z - 3)) { go(dir); return true; }
      return false;
    }
    var inSheet = function (e) { return e.target && e.target.closest && e.target.closest('dialog'); };
    addEventListener('wheel', function (e) {
      if (e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inSheet(e)) return;
      var now = performance.now(), fresh = now - lastWheel > 200; lastWheel = lastIn = now;
      if (ride) { e.preventDefault(); if (fresh) go(e.deltaY > 0 ? 1 : -1); return; }
      if (now < coast && !fresh) { e.preventDefault(); return; }   // 끝난 바로 뒤, 같은 손짓의 관성(트랙패드)은 버린다
      if (intent(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
    }, { passive: false });
    var ty0 = null, tx0 = 0, tDone = false;
    addEventListener('touchstart', function (e) {
      lastIn = performance.now();
      if (e.touches.length !== 1 || inSheet(e)) { ty0 = null; return; }
      ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; tDone = false;
    }, { passive: true });
    addEventListener('touchmove', function (e) {
      lastIn = performance.now();
      if (ty0 === null) return;
      var dy = e.touches[0].clientY - ty0, dx = e.touches[0].clientX - tx0;
      if (ride) { if (e.cancelable) e.preventDefault(); if (!tDone && Math.abs(dy) > 10) { tDone = true; go(dy < 0 ? 1 : -1); } return; }
      if (tDone || Math.abs(dy) < 3 || Math.abs(dx) > Math.abs(dy)) return;
      if (intent(dy < 0 ? 1 : -1)) { tDone = true; if (e.cancelable) e.preventDefault(); }
    }, { passive: false });
    addEventListener('touchend', function () { lastIn = performance.now(); }, { passive: true });
    addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input, textarea, select, button, [contenteditable], dialog'))) return;
      var q = e.key, dir = q === 'ArrowDown' || q === 'PageDown' || (q === ' ' && !e.shiftKey) ? 1 : q === 'ArrowUp' || q === 'PageUp' || (q === ' ' && e.shiftKey) ? -1 : 0;
      if (dir && intent(dir)) e.preventDefault();
    });
    // '작업실 구경하기'·머리말 '만든 것'(#works): 장면을 보여 주며 '만든 것' 제자리까지. 다른 # 링크(웹 도구 등)는 브라우저가 부드럽게 옮기니 그동안 손대지 않는다
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var u = new URL(a.href, location.href);
      if (u.pathname !== location.pathname || !u.hash) return;
      if (u.hash === '#works' && works && can() && scrollY < yEnd() - 3) {
        e.preventDefault();
        go(1, END);   // '만든 것'은 END에서 화면 맨 위(머리말 밑은 그 칸 위 여백)
        if (location.hash !== '#works') history.pushState(null, '', '#works');
        return;
      }
      free = performance.now() + 2500;
    });
    addEventListener('mousedown', function (e) { if (e.target === d || e.clientX >= d.clientWidth) free = Infinity; });   // 스크롤 막대를 끄는 중
    addEventListener('mouseup', function () { if (free === Infinity) free = 0; });
    // 손가락 관성·휠로 그 사이에 들어오면(사람이 막 움직인 뒤에만) 같은 쪽 끝까지
    addEventListener('scroll', function () {
      var y = scrollY, now = performance.now();
      if (!ride && y !== lastY && now - lastIn < 3000 && now > free && can() && y > yTop() + 2 && y < yEnd() - 3) go(y > lastY ? 1 : -1);
      lastY = y; kick();
    }, { passive: true });

    /* 매 프레임: 장면이 보이는 동안만(첫 화면이 화면 밖, 종이색이 다 덮음, 움직임 꺼짐이면 쉰다. 스크롤·마우스가 다시 깨움) */
    var raf = 0, vis = true, seen = '';
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame() {
      raf = 0;
      var now = performance.now(), t = now - t0, dt = Math.min(250, now - last), below = start + hh - scrollY > 64;
      last = now;
      if (!rig || !moving() || !B || !on) stop(false);
      if (!rig || !moving() || !B) return topNight(below);
      var p, more = false;
      if (ride) {
        ride.u = Math.min(1, ride.u + dt * ride.rate / ride.dur);
        p = ride.p = lerp(ride.a, ride.b, .5 * ride.u + .5 * ease(ride.u));
        scrollTo({ top: Math.max(0, start + travel * p), behavior: 'instant' }); lastY = scrollY;
        if (ride.u >= 1) stop(true);
        p = clamp(p); more = true;
      } else p = on ? clamp((scrollY - start) / travel) : 0;
      if (introing && p > .02 && !ride) finishIntro();   // 장면을 끝까지 보여 주는 중이 아닌데 내려와 있으면 바로 다 켠 그림으로
      if (introing) { it += dt * (ride ? 2.5 : 1); if (it >= INTRO) finishIntro(); else { introAt(it); more = true; } }
      var m = on ? 1 - k(p, 0, .12) : 1, ml = on ? 1 - k(p, B.wide ? 0 : .3, B.wide ? .12 : .38) : 1, awake = vis && (!on || p < .58);
      if (awake) { idleAt(t, B); story(now, t, B, m, ml); more = true; }
      if (awake && pointerAt()) more = true;
      if (on) {
        var key = p + ':' + pmx.toFixed(4) + ':' + pmy.toFixed(4);
        if (key !== seen) {   // 스크롤도 마우스도 그대로면 다시 그리지 않음
          seen = key;
          var live = p >= .47 && p < SHOW, sr = live && stage.getBoundingClientRect(), rs = live && rig.ghosts.map(function (g) { return g.icon.getBoundingClientRect(); });
          var c = shoot(p, m);
          fly(p, c, sr, rs);
          // 머리말: 창 윗변(키운 뒤 화면 위치)이 머리말 밑을 지나 방 안이 그 밑에 오면 원래 머리말
          topNight(below && c.we < .5 && c.gt > barH);
        }
      } else {
        lay(near, 1, 0, 0, -16 * pmx, -8 * pmy, 0); lay(back, 1, 0, 0, -7 * pmx, -4 * pmy, 0);
        topNight(below);
      }
      if (more) kick();
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; if (vis) kick(); }).observe(hero);
    // 키보드로 첫 화면 단추에 돌아오면(Shift+Tab) 첫 화면 처음으로 올려 준다(단추가 종이·'만든 것' 밑에 묻히지 않게). 마우스로 누를 땐 그대로
    copy.addEventListener('focusin', function (e) {
      if (on && scrollY > start + 2 && e.target.matches && e.target.matches(':focus-visible')) { stop(false); scrollTo({ top: start, behavior: 'instant' }); lastY = scrollY; }
    });
    // 가려진 '만든 것' 안으로 포커스가 오면(탭 키) 드러나는 곳(END)까지 내려 준다
    if (works) works.addEventListener('focusin', function (e) {
      if (!veiled || !on || ride) return;
      scrollTo({ top: yEnd(), behavior: 'instant' }); lastY = scrollY;
      e.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    var re = 0, size = '';
    var again = function () { cancelAnimationFrame(re); re = requestAnimationFrame(measure); };
    if (window.ResizeObserver) new ResizeObserver(function () {
      var z = stage.offsetWidth + 'x' + stage.offsetHeight + 'x' + hero.offsetHeight;
      if (z !== size) { size = z; again(); }
    }).observe(stage);
    else addEventListener('resize', again);
    calm.addEventListener && calm.addEventListener('change', again);
    dim.addEventListener && dim.addEventListener('change', again);
    addEventListener('load', again);
    setTimeout(again, 3100);   // head 스크립트가 3초에 움직임을 껐을 수 있다(site.js가 안 옴)
    if (moving()) build();
    introing = d.classList.contains('intro') && !!rig && scrollY < 2;
    if (introing) { rig.blds.forEach(function (b) { b.all.setAttribute('mask', b.mask); }); introAt(0); }
    else finishIntro();
    measure();
  })();


  /* ---------- 2) 만든 것 칸 ----------
     첫 화면과 같은 불빛으로 켠다: 줄(.shelf)이 처음 보이면 그 줄 이름 앞 등(.shelf__h 점)이 딸깍 켜지고(.in), 거기서 불빛이 아이콘마다 하나씩
     휘어 솟았다가 내려 꽂히면 그 아이콘이 켜지며 톡 튀고(.on) 고리가 퍼진다. 1)이 '만든 것'을 제자리에 놓기 전엔 미루고, 놓이면 켠다.
     1)에서 날아와 앉은 아이콘(.landed)은 이미 켜진 채. 끝 칸은 보이면 스탠드 불이 켜지고 명함이 그 불빛 속으로 떨어진다(.end.in) */
  var shelves = [].slice.call(document.querySelectorAll('.works .shelf'));
  shelves.forEach(function (sh) { [].forEach.call(sh.querySelectorAll('.wi'), function (a, i) { a.style.setProperty('--i', i); }); });
  if (!shelves.length || !moving() || !('IntersectionObserver' in window)) return;
  d.classList.add('wall-wait');
  var NS = 'http://www.w3.org/2000/svg', fx = document.createElementNS(NS, 'svg'), flights = [], rings = [], raf = 0;
  fx.setAttribute('class', 'page-fx'); fx.setAttribute('aria-hidden', 'true'); fx.setAttribute('focusable', 'false');
  fx.innerHTML = '<defs><radialGradient id="pf-dot"><stop offset="0" class="ns-lamp" stop-opacity=".6"/><stop offset=".45" class="ns-lamp" stop-opacity=".22"/><stop offset="1" class="ns-lamp" stop-opacity="0"/></radialGradient></defs>';
  document.body.appendChild(fx);
  var mk = function (tag, at, parent) { var e = document.createElementNS(NS, tag); for (var n in at) e.setAttribute(n, at[n]); (parent || fx).appendChild(e); return e; };
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var at2 = function (e) { var r = e.getBoundingClientRect(); return [r.left + r.width / 2 + scrollX, r.top + r.height / 2 + scrollY]; };
  function lamp(sh) {   // 줄 이름 앞 등(::before, 왼쪽 끝 점)의 문서 좌표
    var h = sh.querySelector('.shelf__h'), r = h.getBoundingClientRect(), lh = parseFloat(getComputedStyle(h).lineHeight) || 28;
    return [r.left + 6 + scrollX, r.top + lh / 2 + scrollY];
  }
  function send(from, a, delay, dur) {   // 불빛 하나: from → 아이콘 a(떠날 때 아이콘 자리를 잰다)
    var g = mk('g', { opacity: 0 }), tail = [];
    var halo = mk('circle', { r: 18, fill: 'url(#pf-dot)' }, g);
    for (var i = 0; i < 8; i++) tail.push(mk('line', { 'class': 'pf-trail' }, g));
    flights.push({ a: a, at: performance.now() + delay, dur: dur, p0: from, p3: null, g: g, halo: halo, core: mk('circle', { 'class': 'pf-core', r: 4 }, g), tail: tail, hist: [] });
    go();
  }
  function ring(x, y, R) { rings.push({ e: mk('circle', { 'class': 'pf-ring', cx: x, cy: y, r: 0 }), at: performance.now(), R: R }); }
  function go() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    for (var i = flights.length - 1; i >= 0; i--) {
      var f = flights[i], s = (now - f.at) / f.dur;
      if (s < 0) continue;
      if (!f.p3) {   // 떠나는 순간: 목표 아이콘 가운데, 반대쪽으로 휘었다가 위에서 꽂히는 곡선
        f.p3 = at2(f.a.querySelector('.wi__icon'));
        var dx = f.p3[0] - f.p0[0], top = Math.min(f.p0[1], f.p3[1]);
        f.c1 = [f.p0[0] + dx * .15 - 30, top - 70]; f.c2 = [f.p3[0] - dx * .12, top - 95];
        f.g.setAttribute('opacity', 1);
      }
      s = cl(s);
      var e = s < .5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s), z = 1 - e, P = [0, 1].map(function (q) {
        return z * z * z * f.p0[q] + 3 * z * z * e * f.c1[q] + 3 * z * e * e * f.c2[q] + e * e * e * f.p3[q];
      });
      var sz = 1 + .5 * Math.sin(Math.PI * e);
      f.hist.unshift(P); if (f.hist.length > 9) f.hist.pop();
      f.core.setAttribute('cx', P[0].toFixed(1)); f.core.setAttribute('cy', P[1].toFixed(1)); f.core.setAttribute('r', (3.6 * sz).toFixed(2));
      f.halo.setAttribute('cx', P[0].toFixed(1)); f.halo.setAttribute('cy', P[1].toFixed(1)); f.halo.setAttribute('r', (18 * sz).toFixed(2));
      f.tail.forEach(function (c, n) {
        var h0 = f.hist[n], h1 = f.hist[n + 1]; if (!h1) { c.setAttribute('stroke-width', 0); return; }
        c.setAttribute('x1', h0[0].toFixed(1)); c.setAttribute('y1', h0[1].toFixed(1)); c.setAttribute('x2', h1[0].toFixed(1)); c.setAttribute('y2', h1[1].toFixed(1));
        c.setAttribute('stroke-width', (5.4 * sz * (1 - n / 9)).toFixed(2)); c.setAttribute('opacity', (.75 * (1 - n / 8)).toFixed(3));
      });
      if (s >= 1) { fx.removeChild(f.g); flights.splice(i, 1); on(f.a); ring(f.p3[0], f.p3[1], 46); }
    }
    for (i = rings.length - 1; i >= 0; i--) {
      var q = rings[i], r = cl((now - q.at) / 620), eo = 1 - Math.pow(1 - r, 3);
      q.e.setAttribute('r', (q.R * eo + 2).toFixed(2)); q.e.setAttribute('stroke-width', (2.6 * (1 - r) + .2).toFixed(2)); q.e.setAttribute('opacity', (1 - r).toFixed(3));
      if (r >= 1) { fx.removeChild(q.e); rings.splice(i, 1); }
    }
    if (flights.length || rings.length) go();
  }
  var on = function (a) { a.classList.add('on'); };
  function light(sh) {
    sh.classList.add('in'); io.unobserve(sh);
    var from = lamp(sh), n = 0;
    [].forEach.call(sh.querySelectorAll('.wi'), function (a) {
      if (a.classList.contains('landed')) return on(a);
      send(from, a, 200 + n * 120, 640 + n * 40); n++;
    });
    setTimeout(function () { [].forEach.call(sh.querySelectorAll('.wi'), on); }, 3200);   // 탭이 숨어 그리기가 멈춰도 결국 켜짐
  }
  var seen = [];   // 가려진 동안 화면에 들어온 줄: 드러나면 켠다
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var i = seen.indexOf(e.target);
      if (!e.isIntersecting) { if (i >= 0) seen.splice(i, 1); return; }
      if (hush) { if (i < 0) seen.push(e.target); } else light(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  wake = function () { seen.splice(0).forEach(light); };
  shelves.forEach(function (el) { io.observe(el); });
  var end = document.querySelector('.end');
  if (end) {
    end.classList.add('end-wait');
    var eo2 = new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting) { end.classList.add('in'); eo2.disconnect(); } }, { rootMargin: '0px 0px -25% 0px' });
    eo2.observe(end);
  }
})();
