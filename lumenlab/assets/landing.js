/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면 방: 결과 카드 위로 불빛을 대면 그 칸의 속(어떻게 확인했는지)이 보인다.
      화면에 들어오면 불이 첫째 줄에서 켜지고 세 줄을 차례로 짚는다(과정 다시 보기). 방문자가 한 번 만지면 그 뒤론 방문자 몫(다시 보기 없음).
   2) 만든 것 칸: 줄(.shelf)이 처음 화면에 들어올 때 한 번 .in → CSS가 그 줄 아이콘을 하나씩 켠다(꺼진 전구 → 켜진 불).
      아이콘을 누르면 뜨는 소개 창은 assets/store.js. */
(function () {
  var d = document.documentElement;
  var ko = d.lang !== 'en';
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  var moving = function () { return d.classList.contains('anim') && !calm.matches; };

  /* ---------- 1) 방 ---------- */
  var room = document.querySelector('[data-room]');
  if (room) (function () {
    var stage = room.querySelector('[data-stage]');
    var allBtn = room.querySelector('[data-allon]');
    var tabs = Array.prototype.slice.call(room.querySelectorAll('[role="tab"]'));
    var specs = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var caps = Array.prototype.slice.call(document.querySelectorAll('[data-cap]'));
    var cur = 0, x = 0, y = 0, R = 100;
    var used = false, touring = false, tourId = 0, tween = 0;

    var card = function () { return specs[cur].querySelector('.card--in'); };
    var rows = function (sp) { return Array.prototype.slice.call((sp || specs[cur]).querySelectorAll('.card--in p')); };
    var box = function (el) { return { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; };

    /* 카드 안 자리(가로 비율, 몇째 줄 가운데)를 무대 좌표로 */
    var spot = function (fx, i) {
      var c = box(card()), r = box(rows()[i]);
      return [c.l + c.w * fx, r.t + r.h / 2];
    };

    /* 불빛이 닿은 줄에 .hit(확인 표시가 튐). 과정 다시 보기 중엔 멈출 때마다 그 줄만 */
    var hits = function () {
      if (touring) return;
      rows().forEach(function (p) {
        var b = box(p);
        var dx = Math.max(b.l - x, 0, x - b.l - b.w), dy = Math.max(b.t - y, 0, y - b.t - b.h);
        if (dx * dx + dy * dy < R * R * .09) p.classList.add('hit');
      });
    };

    /* 손잡이(원의 3시 방향, 44px)가 무대 밖으로 잘리지 않게 오른쪽·위아래를 막는다. 막아도 카드 끝까지 불빛이 닿고, 셋째 줄 가운데까지 내려간다 */
    var place = function (nx, ny) {
      x = Math.max(0, Math.min(stage.clientWidth - R - 24, nx));
      y = Math.max(24, Math.min(stage.clientHeight - 24, ny));
      var c = card();
      stage.style.setProperty('--sx', x + 'px');
      stage.style.setProperty('--sy', y + 'px');
      c.style.setProperty('--lx', (x - c.offsetLeft) + 'px');
      c.style.setProperty('--ly', (y - c.offsetTop) + 'px');
      hits();
    };

    var stop = function () { tourId++; touring = false; cancelAnimationFrame(tween); tween = 0; };

    /* 지금 자리에서 (tx, ty)까지 ms 동안 미끄러지듯. 끝나면 done */
    var glide = function (tx, ty, ms, done) {
      cancelAnimationFrame(tween);
      var x0 = x, y0 = y, t0 = 0;
      if (!moving() || ms <= 0) { place(tx, ty); tween = 0; if (done) done(); return; }
      var step = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        place(x0 + (tx - x0) * e, y0 + (ty - y0) * e);
        if (k < 1) tween = requestAnimationFrame(step); else { tween = 0; if (done) done(); }
      };
      tween = requestAnimationFrame(step);
    };

    /* 쉬는 자리: 위 두 줄(속 문장, 결과와 도장)은 가로 전체가 불빛 안, 셋째 줄 글은 불빛 밖으로 깨끗이 갈리게 */
    var restAt = function () {
      var c = box(card()), r = rows(), a = box(r[0]), b = box(r[2]);
      return [c.l + c.w / 2, Math.min(a.t + a.h, b.t - R - 4)];
    };
    var rest = function () { var s = restAt(); place(s[0], s[1]); };
    /* 불 끔(is-dark, 반지름 0): 과정 다시 보기 전엔 겉(도구 화면)만 깨끗이 보이고, 첫째 줄에서 불이 켜진다 */
    var dark = function (on) { room.classList.toggle('is-dark', on); };
    var unhit = function (sp) { rows(sp).forEach(function (p) { p.classList.remove('hit'); }); };

    /* 과정 다시 보기: 불이 꺼져 있으면 첫째 줄에서 켜지고(here 면 지금 자리에서 미끄러져) 첫째 줄 → 가운데 줄 → 셋째 줄을 차례로 짚고 쉬는 자리로.
       줄마다 멈출 때 그 줄의 확인 표시만 튄다. 가운데 줄(결과와 도장)에서 가장 오래 멈춘다. 이동 0.42초 */
    var tour = function (wait, here) {
      stop();
      if (used || room.classList.contains('is-all')) return;
      if (!moving()) { dark(false); rest(); rows().forEach(function (p) { p.classList.add('hit'); }); return; }
      var id = tourId;
      unhit();
      if (!here) dark(true);
      touring = true;
      var stops = [[0, 260], [1, 700], [2, 260], [-1, 0]], i = 0;
      var next = function () {
        if (id !== tourId) return;
        if (i >= stops.length) { touring = false; hits(); return; }
        var st = stops[i++], s = st[0] < 0 ? restAt() : spot(.5, st[0]);
        var arrive = function () {
          if (id !== tourId) return;
          if (st[0] >= 0) rows()[st[0]].classList.add('hit');
          setTimeout(next, st[1]);
        };
        if (room.classList.contains('is-dark')) { place(s[0], s[1]); dark(false); setTimeout(arrive, 450); }
        else glide(s[0], s[1], 420, arrive);
      };
      setTimeout(next, wait || 0);
    };

    var take = function () {
      if (used) return;
      used = true; stop(); dark(false); room.classList.add('is-used');
    };

    /* 끌기: 손잡이는 바로 잡고, 무대 빈 곳은 마우스면 그 자리로 미끄러진 뒤 따라오고,
       손가락이면 짧게 누르거나(탭) 옆으로 밀 때만 움직인다(위아래로 밀면 화면이 내려가야 하므로) */
    var drag = null;
    var at = function (e) { var b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    stage.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || e.target.closest('button, a') || room.classList.contains('is-all')) return;
      var p = at(e), knob = e.target.classList.contains('lamp__knob');
      drag = { id: e.pointerId, ox: knob ? x - p[0] : 0, oy: knob ? y - p[1] : 0, sx: p[0], sy: p[1], live: knob || e.pointerType !== 'touch' };
      if (drag.live) {
        take(); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
        if (!knob) glide(p[0], p[1], 220);
        e.preventDefault();
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = at(e);
      if (!drag.live) {
        if (Math.abs(p[0] - drag.sx) < 8) return;
        drag.live = true; take(); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
      }
      if (tween) return;
      place(p[0] + drag.ox, p[1] + drag.oy);
    });
    var end = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.live && e.type === 'pointerup') { take(); var p = at(e); glide(p[0], p[1], 220); }
      drag = null;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) drag = null; });

    /* 불 다 켜기 ↔ 불 끄기: 모든 카드의 속을 한 번에(키보드로도 속을 다 볼 수 있게). 단추 글이 바뀐다 */
    var labels = allBtn.querySelectorAll('[data-i18n]');
    allBtn.addEventListener('click', function () {
      var on = !room.classList.contains('is-all');
      stop(); dark(false);
      room.classList.toggle('is-all', on);
      labels[0].hidden = on; labels[1].hidden = !on;
      if (on) specs.forEach(function (sp) { rows(sp).forEach(function (p) { p.classList.add('hit'); }); });
      else { used = true; room.classList.add('is-used'); rest(); }
    });

    /* 공평뽑기 카드: 뽑기 칸을 열 때마다 실제로 하나 뽑아 겉(이름)과 속(모두 25%) 양쪽에 표시(4는 2^32를 나누어떨어지므로 나머지로 고르게) */
    var draw = function () {
      var lists = [specs[cur].querySelectorAll('.names > span'), specs[cur].querySelectorAll('.odds > .o')];
      var n = lists[0].length, win = crypto.getRandomValues(new Uint32Array(1))[0] % n;
      var show = function (k) { lists.forEach(function (ns) { for (var j = 0; j < ns.length; j++) ns[j].classList.toggle('win', j === k); }); };
      if (!moving()) { show(win); return; }
      var waits = [60, 70, 85, 105, 135, 175], k = (win + n - waits.length % n) % n, i = 0, sel = cur;
      var go = function () {
        if (sel !== cur) return;
        show(k); k = (k + 1) % n;
        if (i < waits.length) setTimeout(go, waits[i++]);
      };
      go();
    };

    var select = function (i, focus) {
      if (i === cur) return;
      stop(); unhit(specs[cur]);
      var c0 = box(card()), fx = (x - c0.l) / c0.w, fy = (y - c0.t) / c0.h;
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        specs[j].hidden = !on;
        specs[j].classList.toggle('is-on', on);
      });
      caps.forEach(function (c) { c.hidden = c.getAttribute('data-cap') !== specs[i].id; });
      cur = i;
      if (focus) tabs[i].focus();
      if (specs[i].hasAttribute('data-pick')) draw();
      if (room.classList.contains('is-all')) return;
      var c = box(card());
      place(c.l + c.w * fx, c.t + c.h * fy);
      /* 새 카드는 늘 쉬는 자리에서 시작(가장자리에 두고 바꿔도 조각난 글로 시작하지 않게). 아직 안 만졌으면 과정 다시 보기 */
      if (!used) tour(120, true);
      else { var s = restAt(); glide(s[0], s[1], 240); }
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key], n = tabs.length;
        if (e.key === 'Home') k = -cur; else if (e.key === 'End') k = n - 1 - cur;
        if (k === undefined) return;
        e.preventDefault();
        select((cur + k + n) % n, true);
      });
    });

    /* 크기 바뀌면 지금 칸 가운데 줄로 */
    var measure = function () {
      var v = parseFloat(getComputedStyle(room).getPropertyValue('--r'));
      if (!room.classList.contains('is-all') && !room.classList.contains('is-dark') && v) R = v;
    };
    var rw = stage.clientWidth;
    addEventListener('resize', function () {
      if (stage.clientWidth === rw) return;
      rw = stage.clientWidth; stop(); measure(); rest();
    });

    /* JS가 없으면 CSS가 불을 다 켠 채로 둔다. 켜지는 순간의 전환은 건너뛰고 불빛 모드로(움직임이 있으면 불을 끈 채로 시작) */
    var lamp = room.querySelector('.lamp');
    room.style.transition = lamp.style.transition = 'none';
    room.classList.add('is-live');
    measure();
    if (moving() && 'IntersectionObserver' in window) { unhit(); dark(true); }
    void room.offsetWidth;
    room.style.transition = lamp.style.transition = '';

    /* 움직임이 없으면 불빛은 쉬는 자리, 세 줄 다 확인 표시. 있으면 불을 끈 채 기다리다가
       화면에 40% 이상 들어올 때마다 과정 다시 보기(방문자가 한 번 만졌으면 더는 안 함, 옮겨 둔 불빛을 뺏지 않게) */
    rest();
    var seen = false, first = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.intersectionRatio >= .4 && !seen) {
            seen = true; tour(first ? 500 : 150); first = false;
          } else if (!e.isIntersecting && seen) {
            seen = false;
            if (!used) { stop(); unhit(); dark(true); }
          }
        });
      }, { threshold: [0, .4] }).observe(room);
    } else tour(0);
  })();

  /* ---------- 2) 만든 것 칸 ---------- */
  var shelves = Array.prototype.slice.call(document.querySelectorAll('.works .shelf'));
  shelves.forEach(function (sh) { Array.prototype.forEach.call(sh.querySelectorAll('.wi'), function (a, i) { a.style.setProperty('--i', i); }); });
  if (!shelves.length || !moving() || !('IntersectionObserver' in window)) return;
  d.classList.add('wall-wait');
  var on = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); on.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  shelves.forEach(function (el) { on.observe(el); });
})();
