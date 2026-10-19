/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면(불 켜진 작업실): html.zoom(움직임 켜짐)이고 화면 높이가 560px 이상이면 첫 화면이 화면 두 장 높이(CSS)이고, 무대가 붙어 있는 동안
      스크롤 위치(p 0~1)를 따라 그림이 불 켜진 창 안 모니터 화면으로 다가간다: 그 화면 가운데를 화면 가운데로 옮기며 키우고(일하는 사람 어깨 너머로,
      화면에 게임·앱·웹 도구 아이콘), 글은 먼저 걷히고, 모니터 화면이 화면을 덮을 즈음 종이색이 덮이며 '만든 것'(작업실 안)이 제자리에서 드러난다.
      '만든 것'은 둘째 장과 겹쳐 있고(CSS) 드러나기 전엔 투명·누를 수 없음. 그 안으로 포커스가 오면 드러나는 곳까지 내려 준다.
      스크롤을 붙잡거나 속도를 바꾸지 않고 위치만 따라간다(되돌리면 그대로 되돌아옴). 창 자리는 그림(SVG, 화면 모양에 따라 둘 중 하나)에서 잰다.
      머리말은 밤 장면 위에서 밤색(html.top-night, 처음엔 head 스크립트가 붙임)이고, 다가가며 창 윗변이 머리말 밑을 지나 방 안(밝은 곳)이 그 밑에 오면 원래 머리말.
      확대하지 않을 때(동작 줄이기, 낮은 화면)는 첫 화면이 머리말 밑에 있는 동안만 밤색 머리말.
   2) 만든 것 칸: 줄(.shelf)이 처음 보일 때 한 번 .in → CSS가 그 줄 아이콘을 하나씩 켠다(꺼진 전구 → 켜진 불). 1)이 '만든 것'을 가린 동안엔 미룬다.
      아이콘을 누르면 뜨는 소개 창은 assets/store.js. */
(function () {
  var d = document.documentElement;
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  var moving = function () { return d.classList.contains('anim') && !calm.matches; };
  var veiled = false, wake = function () {};   // 1)이 '만든 것'을 가리는 중인가, 다 드러나면 2)를 깨움

  /* ---------- 1) 첫 화면 ---------- */
  var hero = document.querySelector('[data-hero]');
  if (hero) (function () {
    window.__heroOn = true;   // head 스크립트의 3초 안전장치(이 파일이 안 오면 .zoom 을 뗀다)를 끈다
    var stage = hero.querySelector('.hero__stage'), night = hero.querySelector('.night'), copy = hero.querySelector('.hero__copy'),
      wash = hero.querySelector('.hero__wash'), wins = hero.querySelectorAll('[data-win]'), works = document.getElementById('works'),
      bar = document.querySelector('.top'), metas = document.querySelectorAll('meta[name="theme-color"]'), tall = matchMedia('(min-height: 560px)'), dim = matchMedia('(prefers-color-scheme: dark)');
    var day = [].map.call(metas, function (m) { return m.content; });
    var sky = getComputedStyle(d).getPropertyValue('--n-sky-1').trim() || '#05040F';
    var want = d.classList.contains('zoom');   // head 스크립트가 확대를 켰나(동작 줄이기를 나중에 끄고 켜면 따라간다)
    var on = false, dark = null, S = 1, W = 0, H = 0, ox = 0, oy = 0, wy = 0, start = 0, travel = 1, hh = 0, last = -1, raf = 0;
    // 겨누는 곳: 방 안(#n-room, 324x164) 모니터 화면(218,44 크기 68x40). 창 유리([data-win])에 대한 비율
    var AIM = [218 / 324, 44 / 164, 68 / 324, 40 / 164];
    var SHOW = 0.66;   // 이 p에서 '만든 것'이 다 드러남(제목이 화면 가운데쯤). 그 전: 0.52 모니터 화면에 닿음 → 0.48~0.58 종이색 → 0.57부터 드러남
    var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var ease = function (t) { return t * t * (3 - 2 * t); };
    function topNight(v) {
      if (v === dark) return;
      dark = v; d.classList.toggle('top-night', v);
      [].forEach.call(metas, function (m, i) { m.content = v ? sky : day[i]; });
    }
    function veil(o) {
      var v = o < 0.99;
      if (works) {
        works.style.opacity = v ? o.toFixed(3) : '';
        works.style.transform = v ? 'translateY(' + (36 * (1 - o)).toFixed(1) + 'px)' : '';
        works.style.pointerEvents = v ? 'none' : '';
      }
      if (v !== veiled) { veiled = v; if (!v) wake(); }
    }
    function clear() {
      night.style.transform = night.style.transformOrigin = night.style.filter = '';
      copy.style.opacity = copy.style.transform = '';
      wash.style.opacity = ''; hero.style.removeProperty('--f'); hero.style.removeProperty('--g');
      veil(1);
    }
    /* 화면 크기가 바뀔 때마다: 확대할지, 모니터 화면 가운데(.night 안 좌표), 그 화면이 화면을 덮는 배율 S, 창 윗변, 붙어 있는 거리 */
    function measure() {
      clear(); last = -1;
      // 확대를 못 하게 되면(동작 줄이기를 켬, site.js가 안 와서 head 스크립트가 움직임을 끔) .zoom 을 떼어 첫 화면을 화면 한 장으로
      d.classList.toggle('zoom', want && moving());
      on = d.classList.contains('zoom') && tall.matches;
      start = hero.getBoundingClientRect().top + scrollY; hh = hero.offsetHeight;
      var win = [].filter.call(wins, function (w) { return w.getBoundingClientRect().width > 0; })[0];
      if (on && win) {
        var r = win.getBoundingClientRect(), n = night.getBoundingClientRect(), aw = r.width * AIM[2], ah = r.height * AIM[3];
        W = n.width; H = n.height; wy = r.top - n.top;
        ox = r.left + r.width * AIM[0] + aw / 2 - n.left; oy = r.top + r.height * AIM[1] + ah / 2 - n.top;
        // 모니터 화면이 화면을 덮는 배율. 세로 화면은 높이까지 채우면 아이콘이 화면 밖으로 넘치니 폭의 1.3배까지만(위아래는 모니터 틀, 곧 종이색)
        S = 1.1 * Math.max(W / aw, Math.min(H / ah, 1.3 * W / aw));
        night.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
        travel = Math.max(1, hh - stage.offsetHeight);
      } else on = false;
      frame();
    }
    function frame() {
      raf = 0;
      var below = start + hh - scrollY > 64;   // 첫 화면 끝이 아직 머리말 밑으로 안 올라감
      if (!on) return topNight(below);
      var p = clamp((scrollY - start) / travel);
      if (p === last) return;
      last = p;
      // 다가가기(0~0.52): 배율은 곱으로 늘려 빠르기가 고르게 보이게, 모니터 화면 가운데는 화면 가운데로
      var z = ease(clamp(p / 0.52)), s = Math.pow(S, z), dx = (W / 2 - ox) * z, dy = (H / 2 - oy) * z;
      night.style.transform = z ? 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')' : '';
      var a = clamp((p - 0.02) / 0.18);   // 글: 한 칸 굴려도 바로 사라지지 않게 조금 두었다가 걷히며 올라간다
      copy.style.opacity = a ? (1 - a).toFixed(3) : '';
      copy.style.transform = a ? 'translateY(' + (-48 * a).toFixed(1) + 'px)' : '';   // 숨기지는 않는다(제목이 읽기 도구에서 빠지지 않게, 단추에 포커스가 오면 CSS가 다시 보임)
      // 어두운 화면 설정: 종이(어두운 색)가 덮기 전에 방 불빛을 먼저 낮춘다(밝은 방과 어두운 종이가 섞여 회색이 되지 않게)
      night.style.filter = dim.matches && p > 0.36 ? 'brightness(' + (1 - 0.75 * clamp((p - 0.36) / 0.16)).toFixed(3) + ')' : '';
      var f = clamp((p - 0.48) / 0.1);   // 종이색: 모니터 화면에 닿은 뒤 다 덮인다(p 0.58)
      wash.style.opacity = f.toFixed(3);
      hero.style.setProperty('--f', f.toFixed(3));
      // 폰 주소창이 접히면 무대(100svh) 밑으로 첫 화면 바탕이 조금 보인다: 그때 무대 아래쪽 색(거리 → 방 안 → 종이)을 따라가게
      hero.style.setProperty('--g', clamp((p - 0.16) / 0.16).toFixed(3));
      veil(clamp((p - 0.57) / (SHOW - 0.57)));
      // 머리말: 창 윗변(키운 뒤 화면 위치)이 머리말 밑을 지나 방 안이 그 밑에 오면 원래 머리말
      var gt = oy + (wy - oy) * s + dy;
      topNight(below && f < 0.5 && gt > (bar ? bar.offsetHeight : 64));
    }
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    // 가려진 '만든 것' 안으로 포커스가 오면(탭 키) 드러나는 곳까지 내려 준다
    if (works) works.addEventListener('focusin', function (e) {
      if (!veiled || !on) return;
      scrollTo({ top: start + travel * SHOW + 1, behavior: 'instant' });
      e.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    var re = 0, seen = '';
    var again = function () { cancelAnimationFrame(re); re = requestAnimationFrame(measure); };
    if (window.ResizeObserver) new ResizeObserver(function () {
      var k = stage.offsetWidth + 'x' + stage.offsetHeight + 'x' + hero.offsetHeight;
      if (k !== seen) { seen = k; again(); }
    }).observe(stage);
    else addEventListener('resize', again);
    calm.addEventListener && calm.addEventListener('change', again);
    dim.addEventListener && dim.addEventListener('change', again);
    addEventListener('load', again);
    setTimeout(again, 3100);   // head 스크립트가 3초에 움직임을 껐을 수 있다(site.js가 안 옴)
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
      if (veiled) { if (i < 0) seen.push(e.target); } else light(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  wake = function () { seen.splice(0).forEach(light); };
  shelves.forEach(function (el) { io.observe(el); });
})();
