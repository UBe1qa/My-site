/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면(불 켜진 작업실). 그림·영상은 힉스필드로 만든 것(img/hero/, t- = 세로 화면, w- = 가로 화면). 움직임(html.anim, 동작 줄이기 아님)일 때만 영상을 받아 틀고,
      아니면 불 켜진 그림 한 장 그대로. 글과 단추는 처음부터 보인다. 영상은 통째로 받아(fetch → blob) 틀어서 서버가 Range를 몰라도 되고 되감기도 바로 된다.
      데이터 절약(Save-Data)이면 영상을 받지 않는다.
      그림 상자(.night__cam)는 무대를 다 덮게(마우스·기울기로 옮길 여유 SL까지) 잡고, 세로 화면은 창을 가운데에 두고 간판이 글 밑에 오게, 가로 화면은 창 왼쪽이 글 오른쪽 끝을 넘게 키운다(fit).
      들어올 때(html.intro, #로 들어오거나 이미 내려와 있으면 건너뜀): 불 꺼진 그림(CSS) → 영상 intro(스탠드·방·간판·위층 순서로 불이 켜짐). 창에 불이 다 켜지는 순간 html.lit
      (글 머리·단추에도 불, CSS). 영상이 2.6초 안에 못 오면 불 꺼진 그림이 걷히며 불 켜진 그림으로. 끝나면 되풀이 영상 loop(비, 일하는 사람)로 겹쳐 넘어간다.
      마우스(PC)·기울기(안드로이드, 허락 없이 되는 곳만): 상자가 조금 따라 움직인다.
      내릴 때(html.zoom, 화면 높이 560px 이상, 첫 화면이 화면 두 장): 장면 위치 p(0~1)의 0~PV는 영상 ride(골목 → 창 → 유리 너머 방 → 어깨 너머 모니터, 한 번에 찍은 것)이고,
        PV부터는 그 끝 그림에서 모니터 화면(data-scr)으로 더 다가가며 그 자리에서 종이색이 넓어지고, 화면에 아이콘 셋이 떠서 '만든 것'의 제 칸으로 날아가 앉고,
        '만든 것' 글은 그 끝에 드러난다(SHOW).
        한 번 튕긴 스크롤에 장면이 0.5초 만에 지나가지 않게, 맨 위에서 내리려 하면(휠·손가락·키·'작업실 구경하기') 장면을 정해진 빠르기로 끝(END)까지 보여 주고 멈춘다:
        영상 구간은 영상을 그대로 틀고(TV 동안, 영상 시각이 곧 p), 그 뒤는 시계로(TW). 그동안 같은 쪽으로 또 밀면 빨라지고, 반대로 밀면 되돌아간다.
        END에서 올리려 하면 거꾸로: 종이가 걷히고 거꾸로 찍은 영상 back으로 골목까지. 손가락의 관성이나 휠로 그 사이에 들어와도 같은 쪽 끝까지.
        스크립트·스크롤 막대가 옮긴 스크롤(시험, #tools 링크 등)은 붙잡지 않고 그 p의 장면을 영상에서 찾아(되감아) 보여 준다.
        영상이 아직 없으면(받는 중, 막힘) 불 켜진 그림을 창 쪽으로 키우는 것으로 대신한다.
      '만든 것'은 둘째 장과 겹쳐 있고(CSS) 드러나기 전엔 투명·누를 수 없음. 그 안으로 포커스가 오면 드러나는 곳까지 내려 준다.
      머리말은 밤 장면 위에서 밤색(html.top-night, 처음엔 head 스크립트가 붙임)이고, 종이색이 덮으면 원래 머리말.
      확대하지 않을 때(낮은 화면)는 첫 화면이 머리말 밑에 있는 동안만 밤색 머리말. 첫 화면이 화면 밖이면 영상을 멈추고 매 프레임 그리기를 쉰다.
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
    var stage = hero.querySelector('.hero__stage'), night = hero.querySelector('.night'), cam = night.querySelector('.night__cam'), dark = cam.querySelector('.night__dark'),
      shade = night.querySelector('.night__shade'), copy = hero.querySelector('.hero__copy'), wash = hero.querySelector('.hero__wash'), works = document.getElementById('works'),
      bar = document.querySelector('.top'), metas = document.querySelectorAll('meta[name="theme-color"]'), tall = matchMedia('(min-height: 560px)'),
      dim = matchMedia('(prefers-color-scheme: dark)'), fine = matchMedia('(hover: hover) and (pointer: fine)'), port = matchMedia('(max-aspect-ratio: 5/4), (max-width: 640px)');
    var mk = { win: cam.querySelector('[data-win]'), sign: cam.querySelector('[data-sign]'), scr: cam.querySelector('[data-scr]') };
    var day = [].map.call(metas, function (m) { return m.content; });
    var sky = getComputedStyle(d).getPropertyValue('--n-sky-1').trim() || '#05040F';
    var want = d.classList.contains('zoom');   // head 스크립트가 확대를 켰나(동작 줄이기를 나중에 끄고 켜면 따라간다)
    var SHOW = 0.7, PV = 0.5;   // SHOW: 이 p에서 아이콘이 다 앉고 '만든 것'이 다 드러남(제목이 화면 위쪽 1/3쯤). PV: 영상(골목 → 모니터)이 끝나는 p
    var SL = 14, LIGHT = 1.8;   // SL: 상자를 마우스·기울기로 옮길 여유(px, 둘레마다). LIGHT: intro 영상에서 창에 불이 다 켜지는 시각(초)
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var k = function (v, a, b) { return clamp((v - a) / (b - a)); };
    var eo = function (t) { return 1 - Math.pow(1 - t, 3); };
    var eio = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };

    /* 영상: 상자 안 불 꺼진 그림 밑에 겹쳐 둔다(아래부터 ride, back, loop, intro, 보이는 것만 .on). 받는 차례는 intro → loop → ride → back */
    var NAMES = ['ride', 'back', 'loop', 'intro'], clip = {}, kind = '', saver = !!(navigator.connection && navigator.connection.saveData);
    // 파일: 애플 기기(사파리·iOS의 모든 브라우저)는 MP4(H.264, 하드웨어로 풂), 나머지는 VP9를 풀 수 있으면 더 가벼운 WebM
    var EXT = (navigator.vendor || '').indexOf('Apple') < 0 && document.createElement('video').canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4';
    var usable = function (c) { return !!c && c.ok && !c.bad; };
    function clips() {   // 화면 모양(세로 t / 가로 w)에 맞는 영상을 받는다. 움직일 때만
      var next = moving() && !saver ? (port.matches ? 't' : 'w') : '';
      if (next === kind) return;
      kind = next;
      NAMES.forEach(function (n) { var c = clip[n]; if (c) { c.v.pause(); c.v.remove(); if (c.url) URL.revokeObjectURL(c.url); } clip[n] = null; });
      if (!kind) return;
      var mine = kind, chain = Promise.resolve();
      NAMES.forEach(function (n) {
        if (n === 'intro' && !introing) return;
        var v = document.createElement('video');
        v.className = 'n-v n-v--' + n; v.muted = v.defaultMuted = true; v.playsInline = true; v.loop = n === 'loop'; v.preload = 'auto'; v.disablePictureInPicture = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
        cam.insertBefore(v, dark);
        clip[n] = { v: v, ok: false, bad: false, url: '', dur: 5 };
      });
      ['intro', 'loop', 'ride', 'back'].forEach(function (n) {
        var c = clip[n];
        if (c) chain = chain.then(function () {
          if (kind !== mine) return;
          return fetch('/img/hero/' + mine + '-' + n + EXT).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
            if (kind !== mine) return;
            c.url = URL.createObjectURL(b);
            return new Promise(function (done) {
              // 틀 수 있으면 ok. iOS는 preload를 무시하고 틀기 전엔 장면을 안 그릴 수 있어서: intro·loop는 길이만 알면 ok(틀면 받음, 첫 장이 그려진 뒤에 보임),
              // ride·back(되감아 쓰는 것)은 장면이 그려져야 ok라 길이를 알고도 안 그려지면 한 번 틀었다 멈춰 둔다(숨긴 채)
              c.v.addEventListener('loadeddata', function () { c.ok = true; c.dur = c.v.duration || 5; done(); kick(); }, { once: true });
              c.v.addEventListener('loadedmetadata', function () {
                c.dur = c.v.duration || 5;
                if (n === 'loop' || n === 'intro') { c.ok = true; done(); kick(); return; }
                setTimeout(function () { if (c.ok || c.bad || kind !== mine) return; var pr = c.v.play(); if (pr && pr.then) pr.then(function () { if (!(ride && ride.cur === c)) { c.v.pause(); c.v.currentTime = 0; } }, function () { c.bad = true; done(); kick(); }); }, 400);
              }, { once: true });
              c.v.addEventListener('playing', kick);
              c.v.addEventListener('error', function () { c.bad = true; done(); kick(); }, { once: true });
              c.v.src = c.url;
            });
          }).catch(function () { c.bad = true; kick(); });
        });
      });
    }
    function play(c, rate) {   // 틀기(막히면, 예: 저전력 모드, 그 영상은 못 쓰는 것으로)
      if (!usable(c)) return;
      if (rate) c.v.playbackRate = rate;
      if (c.v.paused) { var pr = c.v.play(); if (pr && pr.catch) pr.catch(function () { c.bad = true; kick(); }); }
    }
    function seek(c, t) { if (!c.v.seeking && Math.abs(c.v.currentTime - t) > .02) c.v.currentTime = t; }

    /* 들어올 때: 영상이 오면 틀고(첫 장이 그려진 뒤 불 꺼진 그림을 치움), 불이 다 켜지는 시각에 .lit, 끝나면 loop로. 2.6초 안에 안 오면 그림으로 */
    var t0 = performance.now(), last = t0, introing = false;
    function introTick(now) {
      var c = clip.intro;
      if (usable(c)) {
        if (!c.started) { c.started = true; play(c, 1); }
        if (c.v.currentTime > .04 && !c.v.classList.contains('on')) { c.v.classList.add('on'); dark.style.transition = 'none'; dark.style.opacity = '0'; }
        if (c.v.currentTime >= LIGHT) d.classList.add('lit');
        if (c.v.ended || c.v.currentTime >= c.dur - .12) finishIntro();
        return true;
      }
      if (!c || c.bad || now - t0 > 2600) { finishIntro(); return false; }
      return true;
    }
    function finishIntro() {
      d.classList.add('lit'); d.classList.remove('intro');
      if (!introing) return;
      introing = false;
      var c = clip.intro;
      if (c) {   // 겹쳐 걷힌 뒤(CSS .5초) 치운다
        clip.intro = null; c.v.style.transition = 'opacity .5s ease'; c.v.classList.remove('on');
        setTimeout(function () { c.v.pause(); c.v.remove(); if (c.url) URL.revokeObjectURL(c.url); }, 700);
      }
      kick();
    }
    function still() {   // 움직임을 끄면 그림 한 장
      finishIntro();
      NAMES.forEach(function (n) { var c = clip[n]; if (c) { c.v.pause(); c.v.classList.remove('on'); } });
      pmx = pmy = 0;
    }

    /* 마우스(PC)·기울기(폰): 상자가 조금 따라 움직임 */
    var mx = -1, my = -1, pmx = 0, pmy = 0, tilt = null;
    addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
    d.addEventListener('mouseleave', function () { mx = my = -1; kick(); });
    // 기울기: 허락을 묻지 않고 되는 곳(안드로이드 크롬 등)만. 처음 든 자세를 가운데로 두고 천천히 다시 가운데로 돌아간다
    if (!fine.matches && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function')
      addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        if (!tilt) tilt = { g: e.gamma, b: e.beta, x: 0, y: 0 };
        tilt.g += (e.gamma - tilt.g) * .02; tilt.b += (e.beta - tilt.b) * .02;
        tilt.x = clamp((e.gamma - tilt.g) / 24 + .5) - .5; tilt.y = clamp((e.beta - tilt.b) / 24 + .5) - .5;
        kick();
      });
    function aimAt() {   // 마우스·기울기를 천천히 따라감. 아직 움직이는 중이면 true
      var aim = fine.matches && mx >= 0, tx = aim ? mx / innerWidth - .5 : tilt ? tilt.x : 0, ty = aim ? my / innerHeight - .5 : tilt ? tilt.y : 0;
      pmx += (tx - pmx) * .06; pmy += (ty - pmy) * .06;
      var busy = Math.abs(tx - pmx) > .001 || Math.abs(ty - pmy) > .001;
      if (!busy) { pmx = tx; pmy = ty; }
      return busy;
    }

    /* 그림 상자 자리(화면 크기가 바뀔 때마다): geo = 상자 자리·크기와 창·모니터 화면의 무대 좌표(옮기기 전) */
    var geo = null, W = 0, H = 0;
    function fit() {
      var r = stage.getBoundingClientRect(), A = port.matches ? 720 / 1274 : 1920 / 1072, sl = moving() ? SL : 0;
      W = r.width; H = r.height;
      cam.style.cssText = '';   // CSS 대강 자리에서 표시 비율을 읽는다
      var cw = cam.offsetWidth, ch = cam.offsetHeight;
      var fr = function (e) { return { l: e.offsetLeft / cw, t: e.offsetTop / ch, r: (e.offsetLeft + e.offsetWidth) / cw, b: (e.offsetTop + e.offsetHeight) / ch }; };
      var fw = fr(mk.win), fs = fr(mk.sign), fc = fr(mk.scr), cr = 0, cb = 0;
      [].forEach.call(copy.querySelectorAll('.hero__kick, .hero__h1, .hero__sub, .hero__act > a'), function (e) {
        var q = e.getBoundingClientRect(); if (!q.width) return;
        cr = Math.max(cr, q.right - r.left); cb = Math.max(cb, q.bottom - r.top);
      });
      var bw, bh, L, T;
      if (port.matches) {   // 세로: 아래에 붙여 화면을 덮고(넘치는 건 위 하늘), 창은 가운데. 간판이 글 밑 14px보다 위면 창 밑이 화면 안에 남는 만큼 내린다(위가 비면 하늘색)
        bw = Math.max(W + 2 * sl, (H + 2 * sl) * A); bh = bw / A;
        T = H + sl - bh;
        var need = cb + 14 - (T + fs.t * bh), room = H - 10 - (T + fw.b * bh);
        if (need > 0) T += Math.max(0, Math.min(need, room));
        L = Math.min(-sl, Math.max(W + sl - bw, W / 2 - (fw.l + fw.r) / 2 * bw));
      } else {   // 가로: 왼쪽에 붙이고, 창 왼쪽이 글 오른쪽 끝 + 40px을 넘게 키운다. 창 가운데는 화면 높이 58%쯤
        bw = Math.max(W + 2 * sl, (H + 2 * sl) * A, (cr + 40 + sl) / fw.l); bh = bw / A;
        L = -sl;
        T = Math.min(-sl, Math.max(H + sl - bh, H * .58 - (fw.t + fw.b) / 2 * bh));
      }
      cam.style.cssText = 'width:' + bw.toFixed(1) + 'px;left:' + L.toFixed(1) + 'px;top:' + T.toFixed(1) + 'px;bottom:auto';
      var at = function (f) { var q = { l: L + f.l * bw, t: T + f.t * bh, r: L + f.r * bw, b: T + f.b * bh }; q.cx = (q.l + q.r) / 2; q.cy = (q.t + q.b) / 2; q.w = q.r - q.l; q.h = q.b - q.t; return q; };
      geo = { L: L, T: T, win: at(fw), scr: at(fc) };
      geo.zs = Math.min(2.4, Math.max(W / geo.scr.w, H / geo.scr.h));   // 끝에 모니터 화면으로 더 다가가는 배율(흐려지기 전까지만, 나머지는 종이가 덮음)
      geo.zw = Math.min(4, 1.05 * Math.max(W / geo.win.w, H / geo.win.h));   // 영상이 없을 때 창으로 다가가는 배율
    }

    /* 장면 그리기: 상자 옮김(마우스·기울기, 끝에 모니터 화면 쪽으로), 글·그늘, 종이색, 머리말 */
    var on = false, start = 0, travel = 1, hh = 0, barH = 64, vidCam = false;
    function shoot(p, m) {
      var q = vidCam ? geo.scr : geo.win, z = vidCam ? eio(k(p, PV, PV + .08)) : eio(k(p, 0, PV + .08));
      var s = Math.exp(Math.log(vidCam ? geo.zs : geo.zw) * z), tx = (W / 2 - q.cx) * z - 24 * pmx * m, ty = (H / 2 - q.cy) * z - 14 * pmy * m;
      var X = function (x) { return q.cx + (x - q.cx) * s + tx; }, Y = function (y) { return q.cy + (y - q.cy) * s + ty; };
      cam.style.transformOrigin = (q.cx - geo.L).toFixed(1) + 'px ' + (q.cy - geo.T).toFixed(1) + 'px';
      cam.style.transform = s === 1 && Math.abs(tx) < .05 && Math.abs(ty) < .05 ? '' : 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
      var a = k(p, .01, .09);   // 글: 한 칸 굴려도 바로 사라지지 않게 조금 두었다가 걷히며 올라간다(숨기지는 않음: 읽기 도구, 포커스 오면 CSS가 다시 보임)
      copy.style.opacity = a ? (1 - a).toFixed(3) : ''; copy.style.transform = a ? 'translateY(' + (-64 * a).toFixed(1) + 'px)' : '';
      var sh = k(p, .02, .16); shade.style.opacity = sh ? (1 - sh).toFixed(3) : '';
      var R = { l: X(q.l), t: Y(q.t), r: X(q.r), b: Y(q.b) }; R.cx = (R.l + R.r) / 2; R.cy = (R.t + R.b) / 2; R.w = R.r - R.l; R.h = R.b - R.t;
      var wo = k(p, PV - .03, PV), we = eo(k(p, PV, PV + .08));   // 모니터 화면 자리에 종이색이 앉고, 거기서 화면 가득 넓어짐
      wash.style.opacity = wo.toFixed(3);
      wash.style.clipPath = wo && we < 1 ? 'inset(' + [R.t, W - R.r, H - R.b, R.l].map(function (v) { return (Math.max(0, v) * (1 - we)).toFixed(1) + 'px'; }).join(' ') + ' round ' + (10 * (1 - we)).toFixed(1) + 'px)' : '';
      hero.style.setProperty('--f', we.toFixed(3));
      // 폰 주소창이 접히면 무대(100svh) 밑으로 첫 화면 바탕이 조금 보인다: 그때 무대 아래쪽 색(거리 → 방 안 → 종이)을 따라가게
      hero.style.setProperty('--g', k(p, .2, .36).toFixed(3));
      // 어두운 화면 설정: 종이(어두운 색)가 덮기 전에 방 불빛을 먼저 낮춘다(밝은 모니터와 어두운 종이가 섞여 회색이 되지 않게)
      var dk = dim.matches ? k(p, PV - .12, PV) : 0;
      night.style.filter = dk ? 'brightness(' + (1 - .8 * dk).toFixed(3) + ') saturate(' + (1 + .4 * dk).toFixed(3) + ')' : '';
      veil(k(p, .64, SHOW));
      return { R: R, we: we };
    }
    function lean() {   // 확대하지 않을 때(낮은 화면): 마우스·기울기만
      var tx = -24 * pmx, ty = -14 * pmy;
      cam.style.transform = Math.abs(tx) < .05 && Math.abs(ty) < .05 ? '' : 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
    }
    // 아이콘 셋: 종이색이 모니터 화면을 덮으면 그 화면에 떠서, 조금씩 엇갈려 '만든 것'의 제 칸으로 날아가 앉는다. 다 드러나면 진짜 아이콘으로
    var ghosts = null;
    function fly(p, c, sr, rs) {
      ghosts.forEach(function (g, j) {
        var live = p >= PV && p < SHOW;
        g.img.style.opacity = live ? eo(k(p, PV, PV + .025)).toFixed(3) : '';
        g.icon.style.visibility = live ? 'hidden' : '';
        if (p >= SHOW) g.wi.classList.add('landed');   // 켜진 채 앉았으니 선반이 다시 끄고 켜지 않게
        if (!live) return;
        var R = c.R, z0 = Math.min(R.w * .15, R.h * .34, 72, W * .2), gp = eio(k(p, .58 + j * .015, .67 + j * .015)), tr = rs[j];   // 화면 가운데 한 줄
        var x = lerp(sr.left + R.cx + (j - 1) * z0 * 1.32 - z0 / 2, tr.left, gp), y = lerp(sr.top + R.cy - z0 / 2, tr.top, gp) - Math.sin(gp * Math.PI) * 60, z = lerp(z0, tr.width, gp);
        g.img.style.width = g.img.style.height = z.toFixed(1) + 'px';
        g.img.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
    }
    function build() {   // 날아갈 아이콘(그 칸 아이콘과 같은 파일)
      ghosts = ['chickrescue', 'owlight', 'daycount'].map(function (id) {
        var wi = works && works.querySelector('.wi[data-show="' + id + '"]'), ic = wi && wi.querySelector('.wi__icon');
        if (!ic) return null;
        var g = document.createElement('img'); g.className = 'hero-ghost'; g.alt = ''; g.decoding = 'async'; g.src = ic.getAttribute('src');
        document.body.appendChild(g);
        return { img: g, wi: wi, icon: ic };
      }).filter(Boolean);
    }

    function topNight(v) {
      if (v === dark2) return;
      dark2 = v; d.classList.toggle('top-night', v);
      [].forEach.call(metas, function (m, i) { m.content = v ? sky : day[i]; });
    }
    var dark2 = null;
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
    function rest() {   // 옮김·글·종이색·날아가는 아이콘을 처음 자리로(재기 전에, 움직임을 끌 때)
      cam.style.transform = night.style.filter = '';
      copy.style.opacity = copy.style.transform = shade.style.opacity = '';
      wash.style.opacity = wash.style.clipPath = ''; hero.style.removeProperty('--f'); hero.style.removeProperty('--g');
      if (ghosts) ghosts.forEach(function (g) { g.img.style.opacity = ''; g.icon.style.visibility = ''; });
      veil(1);
    }
    /* 화면 크기가 바뀔 때마다: 확대할지, 영상(세로/가로), 상자 자리, 붙어 있는 거리 */
    function measure() {
      rest(); seen = '';
      // 확대를 못 하게 되면(동작 줄이기를 켬, site.js가 안 와서 head 스크립트가 움직임을 끔) .zoom 을 떼어 첫 화면을 화면 한 장으로
      d.classList.toggle('zoom', want && moving());
      if (moving() && !ghosts) build();
      if (!moving()) still();
      clips();
      on = d.classList.contains('zoom') && tall.matches;
      start = hero.getBoundingClientRect().top + scrollY; hh = hero.offsetHeight; barH = bar ? bar.offsetHeight : 64;
      travel = Math.max(1, hh - stage.offsetHeight);
      fit();
      cancelAnimationFrame(raf); raf = 0; frame();
    }

    /* 장면을 끝까지(위 머리 설명): ride = { dir, b(멈출 p), p 지금, rate, vid(영상으로 감), cur(지금 트는 영상) } */
    var END = SHOW + .02, TV = 3200, TW = 1000, TVB = 1800, TWB = 600;   // 빠르기 1일 때: 영상 구간·종이 구간(ms), 내림·올림
    var ride = null, coast = 0, free = 0, lastIn = -1e9, lastY = scrollY, lastWheel = 0;
    var can = function () { return on && !!geo && moving() && !d.classList.contains('is-sheet'); };
    var yTop = function () { return Math.max(0, start); }, yEnd = function () { return start + travel * END; };
    function go(dir, to) {   // dir 1 = 내림, -1 = 올림. to: 멈출 p(없으면 END나 맨 위)
      var now = performance.now();
      if (ride && ride.dir === dir && to == null) { if (now - ride.sped > 250) { ride.rate = Math.min(4, ride.rate * 2); ride.sped = now; } return; }   // 같은 쪽으로 또: 빨리
      var a = ride ? ride.p : clamp((scrollY - start) / travel), b = to != null ? to : dir > 0 ? END : (yTop() - start) / travel;
      if (Math.abs(b - a) < .002) return;
      if (introing) finishIntro();
      if (ride && ride.cur) ride.cur.v.pause();
      ride = { dir: dir, b: b, p: a, rate: 1, sped: now, vid: usable(clip.ride), cur: null, done: false };
      if (ride.vid && a < PV) { if (dir > 0) seek(clip.ride, a / PV * clip.ride.dur); else if (usable(clip.back)) seek(clip.back, (1 - a / PV) * clip.back.dur); }
      if (!fine.matches) d.style.overflow = 'hidden';   // 폰: 손가락 관성을 멈춘다(스크립트 스크롤은 그대로 됨). PC는 스크롤 막대 폭이 바뀌지 않게 휠·키만 막는다
      kick();
    }
    function step(dt) {   // 한 프레임 나아감: 영상 구간은 영상 시각이 p, 그 밖(종이 구간, 영상이 없을 때)은 시계
      var r = ride, c, t;
      if (r.dir > 0) {
        c = clip.ride;
        if (r.p < PV - 1e-4 && r.vid && usable(c)) {
          r.cur = c;
          if (c.v.paused && !c.v.ended) { t = r.p / PV * c.dur; if (Math.abs(c.v.currentTime - t) > .05) c.v.currentTime = t; play(c); }
          c.v.playbackRate = Math.min(4, c.dur * 1000 / TV * r.rate);
          r.p = c.v.ended || c.v.currentTime >= c.dur - .04 ? PV : Math.max(r.p, Math.min(PV, c.v.currentTime / c.dur * PV));
        } else {
          r.cur = null;
          r.p += dt * r.rate * (r.p < PV ? PV / TV : (END - PV) / TW);
        }
        if (r.p >= r.b) { r.p = r.b; r.done = true; }
      } else {
        c = clip.back;
        if (r.p > PV + 1e-4 || !r.vid || !usable(c)) {
          r.cur = null;
          var q = r.p - dt * r.rate * (r.p > PV ? (END - PV) / TWB : PV / TVB);
          r.p = r.p > PV && q < PV && r.vid && usable(c) ? PV : q;
        } else {
          r.cur = c;
          if (c.v.paused && !c.v.ended) { t = (1 - r.p / PV) * c.dur; if (Math.abs(c.v.currentTime - t) > .05) c.v.currentTime = t; play(c); }
          c.v.playbackRate = Math.min(4, c.dur * 1000 / TVB * r.rate);
          r.p = c.v.ended || c.v.currentTime >= c.dur - .04 ? 0 : Math.min(r.p, PV * (1 - c.v.currentTime / c.dur));
        }
        if (r.p <= r.b) { r.p = r.b; r.done = true; }
      }
    }
    function pick(p) {   // 어떤 영상을 보일지(나머지는 멈춤): 장면을 끝까지 보여 주는 중이면 그 영상, 맨 위면 loop, 그 사이면 ride를 그 p로 되감아. 없으면 그림
      var R = clip.ride, Bk = clip.back, Lp = clip.loop, show = null;
      vidCam = (ride ? ride.vid : true) && usable(R);   // 끝까지 보여 주는 중엔 시작할 때 고른 방식 그대로(도중에 바뀌면 튐)
      if (ride && ride.cur) show = ride.cur;
      else if (p <= .0005) show = usable(Lp) ? Lp : null;
      else if (vidCam) {
        show = R; if (!R.v.paused) R.v.pause();
        if (!(p >= PV && R.v.currentTime >= R.dur - .1)) seek(R, Math.min(R.dur - .04, p / PV * R.dur));
      }
      if (show && show !== R && show.v.seeking && vidCam) show = R;   // 되감는 중인 영상은 다 되감길 때까지 ride(같은 장면)로
      var lpOn = !!show && show === Lp && vis && !document.hidden;   // loop: 첫 화면이 보일 때만 튼다. 첫 장이 그려지기 전엔 그림 그대로
      if (lpOn) play(Lp);
      if (show && show === Lp && Lp.v.readyState < 2) show = null;
      NAMES.forEach(function (n) {
        var c = clip[n]; if (!c || n === 'intro') return;
        var o = c === show; c.v.classList.toggle('on', o);
        if (!c.v.paused && !(c === Lp && lpOn) && !(ride && ride.cur === c)) c.v.pause();
      });
      // 다음을 위해 안 보이는 것은 처음 장으로: ride는 맨 위에 돌아왔을 때, back은 늘
      if (show !== R && usable(R) && p <= .0005) seek(R, 0);
      if (show !== Bk && usable(Bk)) seek(Bk, 0);
    }
    function stop(jump) {
      if (!ride) return;
      var y = start + travel * ride.b;
      if (ride.cur) ride.cur.v.pause();
      ride = null; d.style.overflow = '';
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

    /* 매 프레임: 장면이 보이는 동안만(첫 화면이 화면 밖, 움직임 꺼짐이면 쉰다. 스크롤·마우스·영상 도착이 다시 깨움). 영상은 저절로 돌아가니 그동안은 그리지 않는다 */
    var raf = 0, vis = true, seen = '';
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame() {
      raf = 0;
      var now = performance.now(), dt = Math.min(250, now - last), below = start + hh - scrollY > 64;
      last = now;
      if (!moving() || !on || !geo) stop(false);
      if (!moving() || !geo) return topNight(below);
      var p, more = false;
      if (introing && introTick(now)) more = true;
      if (ride) {
        step(dt); p = ride.p;
        scrollTo({ top: Math.max(0, start + travel * p), behavior: 'instant' }); lastY = scrollY;
        if (ride.done) stop(true);
        p = clamp(p); more = true;
      } else p = on ? clamp((scrollY - start) / travel) : 0;
      if (introing && p > .02) finishIntro();   // 장면을 끝까지 보여 주는 중이 아닌데 내려와 있으면 바로 다 켠 그림으로
      if (!introing) pick(p);
      var m = on ? 1 - k(p, 0, .12) : 1;
      if (vis && m > 0 && aimAt()) more = true;
      if (on) {
        var key = p + ':' + pmx.toFixed(4) + ':' + pmy.toFixed(4) + ':' + vidCam;
        if (key !== seen) {   // 스크롤도 마우스도 그대로면 다시 그리지 않음
          seen = key;
          var live = p >= PV && p < SHOW, sr = live && stage.getBoundingClientRect(), rs = live && ghosts.map(function (g) { return g.icon.getBoundingClientRect(); });   // 그리기 전에 잰다
          var c = shoot(p, m);
          fly(p, c, sr, rs);
          topNight(below && c.we < .5);
        }
      } else { lean(); topNight(below); }
      if (more) kick();
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; kick(); }).observe(hero);
    document.addEventListener('visibilitychange', kick);
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
      var z = stage.offsetWidth + 'x' + stage.offsetHeight + 'x' + hero.offsetHeight + 'x' + copy.offsetHeight;
      if (z !== size) { size = z; again(); }
    }).observe(stage);
    else addEventListener('resize', again);
    calm.addEventListener && calm.addEventListener('change', again);
    dim.addEventListener && dim.addEventListener('change', again);
    addEventListener('load', again);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);   // 글꼴이 바뀌면 글 자리가 달라진다
    setTimeout(again, 3100);   // head 스크립트가 3초에 움직임을 껐을 수 있다(site.js가 안 옴)
    introing = d.classList.contains('intro') && moving() && scrollY < 2;
    if (!introing) finishIntro();
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
