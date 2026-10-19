/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면(불 켜진 작업실). 움직임(html.anim, 동작 줄이기 아님)일 때만 움직이고, 아니면 불 켜진 그림 한 장 그대로. 글과 단추는 처음부터 보인다.
      들어올 때(html.intro, #로 들어오거나 이미 내려와 있으면 건너뜀, 2.5초): 해 질 녘 하늘이 밤이 되고 먼 창이 하나씩 꺼진 뒤, 스탠드가 켜지며
      그 자리에서 방 불이 가장자리부터 부드럽게 번지고(흰 빛무리는 조금 늦게), 간판 점이 한 번 깜빡이고 글자가 한 자씩 켜진다.
      머무는 동안: 방 안 사람이 타자를 치고(모니터에 글줄과 커서), 머그잔에서 김이 오르고, 먼 창이 가끔 하나 켜졌다 꺼진다. 별 반짝임은 CSS.
      마우스(PC): 층(먼 지붕, 거리와 건물)이 조금씩 다르게 움직여 깊이가 생기고, 마우스가 지나가는 위층 창이 잠깐 켜진다. 단추 불빛은 CSS(:hover).
      폰(마우스 없음): 위층 창에 이웃이 드나들듯 하나씩 불이 켜졌다 꺼지고, 손가락이 닿은 곳 가까운 창이 켜진다. 기울이면(안드로이드, 허락 없이 되는 곳만) 층 깊이.
      내릴 때(html.zoom, 화면 높이 560px 이상, 첫 화면이 화면 두 장): 장면 위치(p 0~1)를 따라 카메라가 다섯 박자로 들어간다.
        ① 건물 앞으로 옆걸음(글은 걷힘) ② 창으로 다가가며 간판 빛이 번짐 ③ 유리를 지나며 반사 빛줄기·따뜻한 빛 ④ 방 안에서 일하는 사람 어깨 쪽으로
        (가까운 사람은 많이, 먼 벽은 반대로 조금) ⑤ 모니터 화면이 화면을 덮고 그 화면 자리에서 종이색이 넓어진다.
        세로 화면은 박자를 세운 화면에 맞춰 따로 잡는다: ② 위층 창·간판·방 창을 한 화면에 ③ 유리를 지나면 방이 화면 높이를 다 채운 채 어깨 너머 ④⑤ 모니터.
        화면 속 아이콘 셋은 종이색이 덮이기 시작하면 떠올라 '만든 것'의 제 칸으로 날아가 앉고, '만든 것' 글은 그 끝에 드러난다(SHOW).
        박자 마디는 한 곡선(단조 3차)으로 이어서 멈칫하는 구간이 없다.
        한 번 튕긴 스크롤에 장면이 0.5초 만에 지나가지 않게, 맨 위에서 내리려 하면(휠·손가락·키·'작업실 구경하기') 장면을 정해진 빠르기(FWD)로
        끝(END, '만든 것'이 드러난 자리)까지 보여 주고 멈춘다. 그동안 같은 쪽으로 또 밀면 빨라지고, 반대로 밀면 되돌아간다. END에서 올리려 하면
        거꾸로(BWD) 맨 위까지. 손가락의 관성이나 휠로 그 사이에 들어와도 같은 쪽 끝까지. 스크립트가 옮긴 스크롤(시험, #tools 링크 등)은 건드리지 않는다.
      '만든 것'은 둘째 장과 겹쳐 있고(CSS) 드러나기 전엔 투명·누를 수 없음. 그 안으로 포커스가 오면 드러나는 곳까지 내려 준다.
      머리말은 밤 장면 위에서 밤색(html.top-night, 처음엔 head 스크립트가 붙임)이고, 다가가며 창 윗변이 머리말 밑을 지나 방 안이 그 밑에 오면 원래 머리말.
      확대하지 않을 때(낮은 화면)는 첫 화면이 머리말 밑에 있는 동안만 밤색 머리말. 첫 화면이 화면 밖이거나 종이색이 다 덮으면 매 프레임 그리기를 쉰다.
   2) 만든 것 칸: 줄(.shelf)이 처음 보일 때 한 번 .in → CSS가 그 줄 아이콘을 하나씩 켠다(꺼진 전구 → 켜진 불). 1)이 '만든 것'을 다 가린 동안엔 미루고, 드러나기 시작하면 켠다.
      1)에서 날아와 앉은 아이콘(.landed)은 이미 켜진 채.
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
      dusk = night.querySelector('.night__dusk'), copy = hero.querySelector('.hero__copy'), wash = hero.querySelector('.hero__wash'), works = document.getElementById('works'),
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

    /* 움직일 때 쓰는 것(처음 움직일 때 한 번 만든다): 창마다 펼친 방, 간판 글자, 위층 창 불, 별, 지나가는 빛, 날아갈 아이콘 */
    var rig = null, B = null;   // B = 지금 보이는 건물(넓은 화면용/세로 화면용 중 하나)
    function build() {
      var sym = document.getElementById('n-room'), seed = 7;
      var rnd = function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
      rig = { blds: [], far: [].slice.call(night.querySelectorAll('.night__far .n-farwin')) };
      rig.early = rig.far.filter(function (r) { return r.matches(':nth-child(4n+1)'); });   // .intro 동안 켜져 있는 먼 창(landing.css와 같은 고르기)
      rig.early.forEach(function (r, i) { r._off = 250 + (i * 383) % 1000; });   // 0.25~1.25초에 하나씩 꺼짐(도시가 잠듦)
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
      [].forEach.call(near.querySelectorAll('.night__bld'), function (svg, n) {
        // 방을 창마다 펼쳐 넣는다(<use> 안은 따로 움직일 수 없음). 스탠드 자리에서 가장자리가 부드럽게 퍼지는 가림(mask)도 창마다
        var u = svg.querySelector('use[href="#n-room"]'), at = function (a) { return +u.getAttribute(a); };
        var room = el('svg', { 'class': 'n-lit', x: at('x'), y: at('y'), width: at('width'), height: at('height'), viewBox: '0 0 324 164', overflow: 'hidden' });
        var mask = el('mask', { id: 'n-rv' + n, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 324, height: 164 }, el('defs', {}, room));
        var spot = el('circle', { cx: 194, cy: 72, r: 0, fill: 'url(#n-rv)' }, mask);
        var all = el('g', {}, room);
        [].forEach.call(sym.children, function (c) { all.appendChild(c.cloneNode(true)); });
        var tint = el('rect', { width: 324, height: 164, fill: '#D9893A', opacity: 0 }, all);   // 켜지는 동안만: 처음 번지는 빛을 호박색으로(하얀 원이 손전등처럼 보이지 않게)
        u.parentNode.replaceChild(room, u);
        var q = function (s) { return all.querySelector(s); };
        var name = svg.querySelector('.n-name'), txt = name.textContent; name.textContent = '';
        var letters = txt.split('').map(function (c) { var t = el('tspan', {}, name); t.textContent = c; return t; });
        // 위층 창: 마우스가 지나가면 잠깐 켜지는 불(창 유리 위, 창살 밑)
        var ups = [].filter.call(svg.querySelectorAll('rect.n-dark'), function (r) { return +r.getAttribute('height') <= 100; }).map(function (r) {
          var gl = el('rect', { 'class': 'n-glow', x: r.getAttribute('x'), y: r.getAttribute('y'), width: r.getAttribute('width'), height: r.getAttribute('height'), fill: 'url(#n-wall)', opacity: 0 });
          r.parentNode.insertBefore(gl, r.nextSibling);
          return { el: gl, r: r, v: 0, at: -1e9, cx: -1e4, cy: -1e4 };   // cx·cy: 화면에서 창 가운데(frame이 잼)
        });
        rig.blds.push({ svg: svg, wide: svg.classList.contains('night__bld--wide'), room: room, all: all, mask: 'url(#n-rv' + n + ')', spot: spot, tint: tint,
          rx: at('x'), ry: at('y'), rw: at('width'), rh: at('height'),
          back: q('.rg-back'), lamp: q('.rg-lamp'), man: q('.rg-man'), hot: q('.r-hot'), head: q('.rm-head'), body: q('.rm-body'),
          l1: q('.rm-l1'), l2: q('.rm-l2'), caret: q('.rm-caret'), steam: [].slice.call(all.querySelectorAll('.r-steam')),
          board: svg.querySelector('.n-board'), name: name, letters: letters, core: svg.querySelector('.n-core'),
          dot: svg.querySelector('circle[fill="url(#n-dot)"]'), glow: svg.querySelector('ellipse.n-lit'),
          lit: [].filter.call(svg.querySelectorAll('.n-lit'), function (e) { return e !== room && e !== name && !e.matches('.n-core, ellipse, circle[fill="url(#n-dot)"]'); }),
          ups: ups });
      });
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

    /* 들어올 때(it = 들어올 때 시계: 그동안 내리기 시작하면 2.5배로 빨리 끝냄) */
    var t0 = performance.now(), last = t0, it = 0, INTRO = 2500, introing = false;
    function introAt(t) {
      dusk.style.opacity = (1 - ease(k(t, 0, 1400))).toFixed(3);
      night.style.setProperty('--st', k(t, 300, 1400).toFixed(3));
      rig.early.forEach(function (r) { var lit = t < r._off; r.style.fill = lit ? '' : 'var(--n-far-win)'; r.style.opacity = lit ? '' : '1'; });
      var on = eo(k(t, 1050, 1750));   // 1초에 스탠드 딸깍, 그 자리에서 방 불이 번짐
      rig.blds.forEach(function (b) {
        b.room.style.opacity = t < 1000 ? '0' : '1';
        b.spot.setAttribute('r', (t < 1000 ? 0 : t < 1050 ? 16 : 16 + 300 * on).toFixed(1));
        b.hot.style.opacity = eo(k(t, 1300, 1900)).toFixed(3);   // 흰 빛무리는 조금 늦게: 처음 번지는 빛이 손전등처럼 하얗지 않고 따뜻하게
        b.tint.setAttribute('opacity', ((1 - on) * .55).toFixed(3));
        b.lit.forEach(function (e) { e.style.opacity = on.toFixed(3); });
        var dot = t < 1700 ? 0 : t < 1760 ? 1 : t < 1820 ? .15 : 1;   // 간판 점: 한 번 깜빡이고 켜짐
        b.core.style.opacity = b.dot.style.opacity = dot;
        b.name.style.opacity = '1';
        b.letters.forEach(function (e, i) { e.style.fillOpacity = k(t, 1800 + i * 60, 1900 + i * 60).toFixed(3); });
        b.glow.style.opacity = k(t, 1850, 2400).toFixed(3);
      });
    }
    function finishIntro() {
      introing = false; d.classList.remove('intro');
      if (!rig) return;
      dusk.style.opacity = ''; night.style.removeProperty('--st');
      rig.early.forEach(function (r) { r.style.fill = r.style.opacity = ''; });
      rig.blds.forEach(function (b) {
        b.all.removeAttribute('mask'); b.tint.setAttribute('opacity', 0);
        [b.room, b.hot, b.name, b.core, b.dot, b.glow].concat(b.lit).forEach(function (e) { e.style.opacity = ''; });
        b.letters.forEach(function (e) { e.style.fillOpacity = ''; });
      });
    }

    /* 머무는 동안: 일하는 사람, 김, 먼 창 하나 */
    var farOn = null;
    function idleAt(t, b) {
      if (t > 1100) {   // 스탠드가 켜진 뒤부터. 3.6초마다 2.6초 치고 쉼, 글 두 줄이 써지고 커서가 따라감
        var u = t - 1100, ph = u % 3600, burst = ph < 2600, n = Math.floor(u / 3600) % 3;
        var bob = burst ? Math.abs(Math.sin(u * .021)) * .55 + Math.abs(Math.sin(u * .047)) * .35 : 0;
        tf(b.head, Math.sin(u / 1900) * .5, bob * 1.3); tf(b.body, 0, bob * .5);
        var w1 = [30, 24, 34][n], w2 = [20, 28, 14][n], a1 = Math.min(1, ph / 1300), a2 = k(ph, 1300, 2600);
        b.l1.setAttribute('width', (a1 * w1).toFixed(1)); b.l2.setAttribute('width', (a2 * w2).toFixed(1));
        b.caret.setAttribute('x', (228.6 + (ph < 1300 ? a1 * w1 : a2 * w2)).toFixed(1)); b.caret.setAttribute('y', ph < 1300 ? 73.2 : 77.6);
        b.caret.setAttribute('opacity', burst || u % 900 < 450 ? .9 : 0);
      }
      b.steam.forEach(function (s, i) {
        var c = ((t + i * 900) % 1800) / 1800;
        tf(s, 0, -c * 7); s.style.opacity = t > 1400 ? (Math.sin(c * Math.PI) * .55).toFixed(3) : '';
      });
      var slot = Math.floor(t / 2200), pick = !introing && t % 2200 < 1400 ? rig.far[(slot * 7919) % rig.far.length] : null;
      if (pick !== farOn) {
        if (farOn) farOn.style.fill = farOn.style.opacity = '';
        if (pick) { pick.style.fill = 'var(--lamp)'; pick.style.opacity = '.3'; }
        farOn = pick;
      }
    }
    function still() {   // 움직임을 끄면 그림 한 장(타자 멈춘 자리)으로
      finishIntro();
      if (!rig) return;
      rig.blds.forEach(function (b) {
        [b.head, b.body].concat(b.steam).forEach(function (e) { e.removeAttribute('transform'); });
        b.steam.forEach(function (e) { e.style.opacity = ''; });
        b.l1.setAttribute('width', 30); b.l2.setAttribute('width', 20); b.caret.setAttribute('x', 248.6); b.caret.setAttribute('y', 77.6); b.caret.setAttribute('opacity', 0);
        b.ups.forEach(function (w) { w.v = 0; w.at = -1e9; w.el.setAttribute('opacity', 0); });
      });
      if (farOn) farOn.style.fill = farOn.style.opacity = '';
      farOn = null; pmx = pmy = 0;
    }

    /* 마우스(PC): 층 깊이, 지나가는 위층 창 불. 폰: 이웃 창이 하나씩, 닿은 곳 가까운 창, 기울기로 층 깊이 */
    var mx = -1, my = -1, pmx = 0, pmy = 0, tap = null, slot = -1, tilt = null;
    addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
    addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { tap = { x: e.clientX, y: e.clientY }; kick(); } }, { passive: true });
    d.addEventListener('mouseleave', function () { mx = my = -1; kick(); });
    // 기울기: 허락을 묻지 않고 되는 곳(안드로이드 크롬 등)만. 처음 든 자세를 가운데로 두고 천천히 다시 가운데로 돌아간다
    if (!fine.matches && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function')
      addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        if (!tilt) tilt = { g: e.gamma, b: e.beta, x: 0, y: 0 };
        tilt.g += (e.gamma - tilt.g) * .02; tilt.b += (e.beta - tilt.b) * .02;
        tilt.x = clamp((e.gamma - tilt.g) / 24 + .5) - .5; tilt.y = clamp((e.beta - tilt.b) / 24 + .5) - .5;
      });
    var NEXT = [0, 1, 2, 1, 0, 2];   // 폰에서 이웃 창이 켜지는 차례(처음 켜지는 칸 = 1번, 가운데부터)
    function pointerAt(now, t, m, ml, b) {   // m: 첫 화면이 그대로인 정도(내리기 시작하면 0으로), ml: 위층 창 불이 보이는 정도. 아직 움직이는 중이면 true
      var aim = fine.matches && mx >= 0, tx = aim ? mx / innerWidth - .5 : tilt ? tilt.x : 0, ty = aim ? my / innerHeight - .5 : tilt ? tilt.y : 0;
      pmx += (tx - pmx) * .08; pmy += (ty - pmy) * .08;
      var busy = Math.abs(tx - pmx) > .001 || Math.abs(ty - pmy) > .001;
      if (!busy) { pmx = tx; pmy = ty; }
      if (!fine.matches && !introing && t > 2600) {   // 폰: 2.6초마다 위층 창 하나에 1.6초 불
        var s = Math.floor(t / 2600), w0 = b.ups[NEXT[s % NEXT.length] % b.ups.length];
        if (s !== slot && w0) { slot = s; w0.at = Math.max(w0.at, now + 400); }
      }
      b.ups.forEach(function (w) {
        if (aim && m > .5) { var dx = mx - w.cx, dy = my - w.cy; if (dx * dx + dy * dy < 150 * 150) w.at = now; }
        if (tap && ml > .5) { var ex = tap.x - w.cx, ey = tap.y - w.cy; if (ex * ex + ey * ey < 130 * 130) w.at = now + 600; }
        var to = now - w.at < 1200 ? 1 : 0;   // 가까이 오면 켜지고 1.2초 뒤 천천히 꺼짐
        w.v += (to - w.v) * .1; if (Math.abs(to - w.v) < .01) w.v = to; else busy = true;
        w.el.setAttribute('opacity', (w.v * .85 * ml).toFixed(3));
      });
      tap = null;
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
      wash.style.opacity = wo.toFixed(3);
      wash.style.clipPath = wo && we < 1 ? 'inset(' + [Y(pt.s0), W - X(pt.s1), H - Y(pt.s1), X(pt.s0)].map(function (v) { return (Math.max(0, v) * (1 - we)).toFixed(1) + 'px'; }).join(' ') + ' round ' + (8 * (1 - we)).toFixed(1) + 'px)' : '';
      hero.style.setProperty('--f', we.toFixed(3));
      // 폰 주소창이 접히면 무대(100svh) 밑으로 첫 화면 바탕이 조금 보인다: 그때 무대 아래쪽 색(거리 → 방 안 → 종이)을 따라가게
      hero.style.setProperty('--g', k(p, .2, .36).toFixed(3));
      // 어두운 화면 설정: 종이(어두운 색)가 덮기 전에 방 불빛을 먼저 낮춘다(밝은 방과 어두운 종이가 섞여 회색이 되지 않게)
      var dk = dim.matches ? k(p, .36, .48) : 0;
      night.style.filter = dk ? 'brightness(' + (1 - .8 * dk).toFixed(3) + ') saturate(' + (1 + .6 * dk).toFixed(3) + ')' : '';
      veil(k(p, .64, SHOW));
      return { X: X, Y: Y, s: s, we: we, gt: Y(pt.o) };
    }
    function lay(l, s, fx, fy, tx, ty, p) {
      var x = tx - fx * s, y = ty - fy * s;
      l.style.transform = !p && Math.abs(x) < .05 && Math.abs(y) < .05 ? '' : 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }
    // 아이콘 셋: 종이색이 덮이기 시작하면(모니터 화면 속 그대로) 떠올라, 조금씩 엇갈려 '만든 것'의 제 칸으로 날아가 앉는다. 다 드러나면 진짜 아이콘으로
    function fly(p, c, sr, rs) {
      rig.ghosts.forEach(function (g, j) {
        var live = p >= .47 && p < SHOW;
        g.img.style.opacity = live ? '1' : '';
        g.icon.style.visibility = live ? 'hidden' : '';
        if (p >= SHOW) g.wi.classList.add('landed');   // 켜진 채 앉았으니 선반이 다시 끄고 켜지 않게
        if (!live) return;
        var gp = eio(k(p, .58 + j * .015, .67 + j * .015)), q = pt.ic[j], tr = rs[j];
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
    function veil(o) {
      // 흐리기만 한다(밀어 올리지 않음): 위치를 옮기면 #works·#tools 로 가는 링크가 옮겨진 자리를 재서 덜 내려간다
      var v = o < 0.99, h = o <= 0;
      if (works) {
        works.style.opacity = v ? o.toFixed(3) : '';
        works.style.pointerEvents = v ? 'none' : '';
      }
      veiled = v;
      if (h !== hush) { hush = h; if (!h) wake(); }
    }
    function rest() {   // 확대·지나가는 빛·날아가는 아이콘을 처음 자리로(재기 전에, 움직임을 끌 때)
      near.style.transform = back.style.transform = night.style.filter = '';
      copy.style.opacity = copy.style.transform = '';
      wash.style.opacity = wash.style.clipPath = ''; hero.style.removeProperty('--f'); hero.style.removeProperty('--g');
      if (rig) {
        [rig.flare, rig.streak, rig.bloom].forEach(function (e) { e.style.opacity = ''; });
        rig.blds.forEach(function (b) { [b.man, b.lamp, b.back].forEach(function (g) { g.removeAttribute('transform'); }); });
        rig.ghosts.forEach(function (g) { g.img.style.opacity = ''; g.icon.style.visibility = ''; });
      }
      veil(1);
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
        var y = works.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(d).scrollPaddingTop) || 0);
        go(1, (y - start) / travel);
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
      if (awake && ((fine.matches && mx >= 0) || tap)) B.ups.forEach(function (w) { var r = w.r.getBoundingClientRect(); w.cx = r.left + r.width / 2; w.cy = r.top + r.height / 2; });   // 그리기 전에 잰다
      if (awake) { idleAt(t, B); more = true; }
      if (awake && pointerAt(now, t, m, ml, B)) more = true;
      tap = null;
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


  /* ---------- 2) 만든 것 칸 ---------- */
  var shelves = Array.prototype.slice.call(document.querySelectorAll('.works .shelf'));
  shelves.forEach(function (sh) { Array.prototype.forEach.call(sh.querySelectorAll('.wi'), function (a, i) { a.style.setProperty('--i', i); }); });
  if (!shelves.length || !moving() || !('IntersectionObserver' in window)) return;
  d.classList.add('wall-wait');
  var seen = [];   // 가려진 동안 화면에 들어온 줄: 드러나면 켠다
  var light = function (el) { el.classList.add('in'); io.unobserve(el); };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var i = seen.indexOf(e.target);
      if (!e.isIntersecting) { if (i >= 0) seen.splice(i, 1); return; }
      if (hush) { if (i < 0) seen.push(e.target); } else light(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  wake = function () { seen.splice(0).forEach(light); };
  shelves.forEach(function (el) { io.observe(el); });
})();
