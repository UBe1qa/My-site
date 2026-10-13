/* 첫 화면 '바느질 필름' — 영상 파일 없이 캔버스로.
   그림(SVG 좌표)의 웰트 선을 따라 바늘이 한 땀씩 박고, 끝까지 가면 잠깐 멈췄다가 실이 옅어지며 다시 시작한다.
   화면 밖·탭 숨김·일시정지·동작 줄이기에서는 그리기를 멈춘다(동작 줄이기면 다 박힌 한 장만). */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var cv = document.querySelector('.hero__film');
  var img = document.querySelector('.hero__pic img');
  var btn = document.querySelector('.hero__pause');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var tallMQ = window.matchMedia('(max-width: 699.98px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 웰트 실 길(그림 좌표): 뒤꿈치 쪽 → 앞코 쪽
  var A = { x: 178, y: 579 }, B = { x: 936, y: 571 };
  var STEP = 18, DASH = 10;
  var crop, s, ox, oy, W, H, dpr;
  var motes = [];

  function readCrop() {
    var v = (tallMQ.matches ? img.dataset.cropTall : img.dataset.cropWide).split(' ').map(Number);
    crop = { x: v[0], y: v[1], w: v[2], h: v[3] };
  }
  function size() {
    readCrop();
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = Math.max(W / crop.w, H / crop.h);            // object-fit: cover
    ox = (W - crop.w * s) / 2; oy = (H - crop.h * s) / 2;
    if (!motes.length) for (var i = 0; i < 22; i++) motes.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.6, v: .004 + Math.random() * .01, ph: Math.random() * 6.28 });
  }
  function P(x, y) { return { x: ox + (x - crop.x) * s, y: oy + (y - crop.y) * s }; }
  function at(t) { return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }; }

  var total = Math.floor((B.x - A.x) / STEP);
  var PER = 0.26;               // 한 땀에 걸리는 초
  var HOLD = 1.8, FADE = .9;    // 끝에서 멈춤, 옅어짐
  var CYCLE = total * PER + HOLD + FADE;
  // 화면에 보이는 첫 땀부터 시작한다(잘려 나간 앞부분은 건너뜀)
  function firstVisible() {
    var min = tallMQ.matches ? -10 : W * 0.44;   // 컴퓨터는 글자 밑을 피해 오른쪽부터
    var i = 0; while (i < total && P(A.x + i * STEP, A.y).x < min) i++; return i;
  }

  function draw(time, still) {
    ctx.clearRect(0, 0, W, H);
    var start = firstVisible();
    var n = total - start;
    var cyc = n * PER + HOLD + FADE;
    var tt = still ? n * PER : (time / 1000) % cyc;
    var done = Math.min(n, Math.floor(tt / PER));
    var frac = still ? 1 : Math.min(1, (tt - done * PER) / PER);
    var fade = tt > n * PER + HOLD ? 1 - (tt - n * PER - HOLD) / FADE : 1;
    var u = s;  // 그림 1단위 = u px

    // 박힌 땀 (그림자 + 실)
    ctx.lineCap = 'round';
    for (var k = 0; k < 2; k++) {
      ctx.strokeStyle = k ? 'rgba(246,240,228,' + (0.95 * fade) + ')' : 'rgba(20,10,5,' + (0.55 * fade) + ')';
      ctx.lineWidth = Math.max(1.5, 3 * u);
      ctx.beginPath();
      for (var i = 0; i < done; i++) {
        var a = (start + i) * STEP, p0 = P(A.x + a, A.y + (B.y - A.y) * (a / (B.x - A.x))), p1 = P(A.x + a + DASH, A.y + (B.y - A.y) * ((a + DASH) / (B.x - A.x)));
        var dy = k ? 0 : 1.6 * u;
        ctx.moveTo(p0.x, p0.y + dy); ctx.lineTo(p1.x, p1.y + dy);
      }
      ctx.stroke();
    }

    // 바늘과 실 (박는 중일 때만)
    if (!still && done < n) {
      var a2 = (start + done) * STEP + DASH * frac;
      var q = P(A.x + a2, A.y + (B.y - A.y) * (a2 / (B.x - A.x)));
      // 바늘이 들어갔다 나오는 깊이: 0→1→0
      var dip = Math.sin(frac * Math.PI);
      var tipY = q.y + (dip * 6 - 2) * u;
      var len = 70 * u;
      var nx = q.x - len * 0.32, ny = tipY - len;
      // 당겨지는 실: 바늘귀에서 위쪽으로 휘어 나감
      ctx.strokeStyle = 'rgba(246,240,228,.75)'; ctx.lineWidth = Math.max(1, 1.6 * u);
      ctx.beginPath(); ctx.moveTo(nx, ny);
      ctx.quadraticCurveTo(nx - 60 * u, ny - 40 * u * (1 - dip * .5), nx - 150 * u, ny - 130 * u);
      ctx.stroke();
      // 바늘
      var g = ctx.createLinearGradient(nx, ny, q.x, tipY);
      g.addColorStop(0, '#9aa0a6'); g.addColorStop(.5, '#e9eef2'); g.addColorStop(1, '#8b9096');
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1.6, 3.2 * u);
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(q.x, tipY); ctx.stroke();
      // 막 박은 자리의 작은 빛
      ctx.fillStyle = 'rgba(255,226,190,' + (0.35 * dip) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, 9 * u, 0, 6.283); ctx.fill();
    }

    // 램프 빛 속 먼지
    if (!still) {
      var tsec = time / 1000;
      for (var m = 0; m < motes.length; m++) {
        var d = motes[m];
        var my = ((d.y - tsec * d.v) % 1 + 1) % 1, mx = d.x + Math.sin(tsec * .5 + d.ph) * .01;
        var al = .18 + .22 * Math.sin(tsec * 1.3 + d.ph);
        ctx.fillStyle = 'rgba(255,230,200,' + Math.max(0, al) + ')';
        ctx.beginPath(); ctx.arc(W * (.35 + mx * .6), H * (.05 + my * .7), d.r, 0, 6.283); ctx.fill();
      }
    }
  }

  var raf = 0, visible = true, paused = false, t0 = 0, elapsed = 0;
  var allow = !reduce && document.documentElement.classList.contains('anim');
  function loop(now) { elapsed = now - t0; draw(elapsed, false); raf = requestAnimationFrame(loop); }
  function run() {
    var go = allow && visible && !paused && !document.hidden;
    if (go && !raf) { t0 = performance.now() - elapsed; raf = requestAnimationFrame(loop); }
    if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function init() {
    size();
    if (!allow) { draw(0, true); return; }
    run();
  }
  if (img.complete) init(); else img.addEventListener('load', init);
  var rT; window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { size(); if (!raf) draw(elapsed, !allow); }, 120); });
  tallMQ.addEventListener && tallMQ.addEventListener('change', function () { size(); });
  document.addEventListener('visibilitychange', run);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; run(); }).observe(hero);
  if (btn) btn.addEventListener('click', function () {
    paused = !paused;
    hero.classList.toggle('is-paused', paused);
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    btn.querySelector('.hero__pause-txt').textContent = paused ? '다시 재생' : '일시정지';
    run();
  });
  // motion.js가 늦게 '움직임 끔'을 정하면 다 박힌 한 장으로
  window.__filmStill = function () { allow = false; run(); draw(0, true); };
})();
