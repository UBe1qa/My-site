/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면 방: 결과 카드 위로 불빛을 대면 그 칸의 속(어떻게 확인했는지)이 보인다.
      화면에 들어오면 불이 첫째 줄에서 켜지고 세 줄을 차례로 짚는다(과정 다시 보기). 방문자가 한 번 만지면 그 뒤론 방문자 몫(다시 보기 없음).
   2) 찾기: 하려는 일을 적으면 catalog.json 의 이름·찾는 말·설명으로 점수를 매겨 맞는 것만 켠다(판의 아이콘도 같이).
   3) 기록지·작업대: 처음 화면에 들어올 때 한 번 .in (CSS가 기록지를 내리고 전구를 켬). */
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

  /* ---------- 2) 찾기 ---------- */
  var finder = document.querySelector('[data-finder]');
  if (finder) (function () {
    var input = finder.querySelector('input');
    var list = finder.querySelector('.finder__list');
    var count = finder.querySelector('.finder__n');
    var none = finder.querySelector('.finder__none');
    var chips = Array.prototype.slice.call(finder.querySelectorAll('.finder__chips button'));
    var more = finder.querySelector('.finder__more');
    var tiles = {};
    Array.prototype.forEach.call(finder.querySelectorAll('.bd'), function (a) { tiles[a.getAttribute('data-id')] = a; });
    finder.classList.add('is-live');
    var items = Array.prototype.slice.call(list.querySelectorAll('.fi')).map(function (li) {
      var f = {};
      ['k', 'n', 'f', 'w', 'l'].forEach(function (k) {
        f[k] = li.getAttribute('data-' + k) || '';
        f[k + 'c'] = f[k].replace(/\s+/g, '');
        f[k + 'w'] = f[k].split(/\s+/).filter(function (w) { return w.length > 1; });
      });
      return { li: li, f: f, id: li.getAttribute('data-id') };
    });
    /* 칸마다 무게: 종류(게임·앱·웹 도구) > 이름 > 찾는 말 > 설명 > 한 줄 소개 */
    var W = { k: 5, n: 4, f: 3, w: 2, l: 1 };
    /* '계산기·무료·사이트'처럼 어디에나 붙는 말과 '5분·2027·10명' 같은 숫자는 맞으면 점수만 더하고, 꼭 맞아야 하는 말에선 뺀다 */
    var SOFT = /^(\d+[가-힣]*|계산기|계산|도구|사이트|무료|하기|해주는|변환기|프로그램|온라인|웹|앱|어플|만들기|사용법|방법|calculator|calc|tools?|online|free|apps?|maker|generator|converter|website|site|web)$/;

    /* 낱말 하나가 칸 k에 맞는지: 칸 글 안에 들어 있으면(띄어쓰기 빼고도) 온 무게(실수령 → 실수령액, 타자연습 → 타자 연습).
       아니면 절반 무게로: 낱말이 종류·이름·찾는 말의 세 글자 넘는 낱말을 품거나(연봉실수령액 → 실수령액, apps → app.
       설명 글과 두 글자 낱말은 빼서 유튜브 → 튜브, 게임패드 → 게임 같은 헛맞음이 없게),
       세 글자 넘는 한글 낱말의 끝 글자를 뗀 줄기가 들어 있거나(합치는 → 합치기) */
    var match = function (f, t) {
      var k, j, w, stem = /^[가-힣]{3,}$/.test(t) ? t.slice(0, -1) : '';
      for (k in W) if (f[k].indexOf(t) > -1 || f[k + 'c'].indexOf(t) > -1) return { k: k, w: W[k], full: true };
      for (k in W) {
        if (W[k] >= 3) for (j = 0; j < f[k + 'w'].length; j++) { w = f[k + 'w'][j]; if (w.length > 2 && t.indexOf(w) > -1) return { k: k, w: W[k] / 2 }; }
        if (stem && f[k].indexOf(stem) > -1) return { k: k, w: W[k] / 2 };
      }
      return null;
    };

    /* 꼭 맞아야 하는 말(SOFT 아닌 것)이 두 개 이하면 다, 그보다 많으면 하나 빼고 맞아야 후보. 붙여 쓴 말이 이름·찾는 말에 통째로 있으면 바로 후보.
       loose 면 하나만 맞아도 후보(엄격하게 찾아 0개일 때 '비슷한 것'으로) */
    var score = function (it, toks, whole, loose) {
      var s = 0, need = 0, hit = 0, kind = false, f = it.f, all = false;
      toks.forEach(function (t) {
        var soft = SOFT.test(t) && toks.length > 1, m = match(f, t);
        if (!soft) need++;
        if (!m) return;
        s += m.w;
        if (!soft) { hit++; if (m.k === 'k' && m.full) kind = true; }
      });
      if (toks.length > 1 && whole.length > 1) {
        if (f.nc.indexOf(whole) > -1) { s += 5; all = true; }
        else if (f.fc.indexOf(whole) > -1) { s += 4; all = true; }
      }
      var ok = all || (need ? hit >= (loose ? 1 : need > 2 ? need - 1 : need) : s > 0);
      return ok ? { s: s, kind: kind } : null;
    };

    var run = function (q) {
      q = q.trim().toLowerCase();
      var toks = q.split(/\s+/).filter(Boolean), whole = q.replace(/\s+/g, '');
      items.forEach(function (it) { it.li.hidden = true; it.li.classList.remove('is-top', 'is-lit'); });
      for (var id in tiles) tiles[id].classList.remove('on');
      none.hidden = true; more.hidden = true;
      finder.classList.toggle('is-q', toks.length > 0);
      if (!toks.length) { count.textContent = ''; return; }
      var rank = function (loose) {
        return items.map(function (it) { var r = score(it, toks, whole, loose); return r && { it: it, s: r.s, kind: r.kind }; })
          .filter(Boolean)
          .sort(function (a, b) { return b.s - a.s; });
      };
      var ranked = rank(false), near = false;
      if (!ranked.length && toks.length > 1) { ranked = rank(true); near = ranked.length > 0; }
      /* '게임'·'앱'처럼 종류를 찾으면 그 종류만 */
      if (ranked.some(function (r) { return r.kind; })) ranked = ranked.filter(function (r) { return r.kind; });
      var top = ranked.length ? ranked[0].s : 0;
      ranked = ranked.filter(function (r) { return r.s >= top * .5; });
      if (!ranked.length) { count.textContent = ''; none.hidden = false; return; }
      ranked.forEach(function (r) { if (tiles[r.it.id]) tiles[r.it.id].classList.add('on'); });
      var total = ranked.length;
      more.hidden = total <= 4;
      ranked = ranked.slice(0, 4);
      ranked.forEach(function (r, i) {
        var li = r.it.li;
        list.appendChild(li);
        li.hidden = false;
        li.classList.toggle('is-top', i === 0);
        li.style.setProperty('--d', (i * .07).toFixed(2) + 's');
        void li.offsetWidth;
        li.classList.add('is-lit');
      });
      count.textContent = near ? (ko ? '딱 맞는 건 없고, 비슷한 것 ' + total + '개' : 'No exact match. ' + total + ' close') :
        ko ? total + '개 찾았어요' : total + (total === 1 ? ' match' : ' matches');
    };

    var press = function (b) { chips.forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); };
    chips.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { input.value = b.textContent; press(b); run(input.value); });
    });
    input.addEventListener('input', function () {
      press(chips.filter(function (c) { return c.textContent === input.value; })[0]);
      run(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      var a = list.querySelector('.fi.is-top a');
      if (a) { e.preventDefault(); location.href = a.href; }
    });
    if (input.value) run(input.value);
    /* '하려는 일로 찾기' 단추: 입력 칸으로 내려가 바로 칠 수 있게(휴대폰은 키보드가 뜨면서 결과가 입력 칸 바로 밑에) */
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#fq"]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        input.scrollIntoView({ block: 'start', behavior: moving() && !matchMedia('(pointer: coarse)').matches ? 'smooth' : 'auto' });
        input.focus({ preventScroll: true });
      });
    });
  })();

  /* ---------- 3) 기록지·작업대 ---------- */
  var slip = document.querySelector('[data-slip]'), making = document.querySelector('[data-making]');
  if (slip) Array.prototype.forEach.call(slip.querySelectorAll('.slip__rows li'), function (li, i) { li.style.setProperty('--i', i); });
  if (making) Array.prototype.forEach.call(making.querySelectorAll('.bulb'), function (b, i) { b.style.setProperty('--d', (.15 + i * .22).toFixed(2) + 's'); });
  var watched = [slip, making].filter(Boolean);
  if (!watched.length || !('IntersectionObserver' in window)) return;
  var on = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); on.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -25% 0px' });
  watched.forEach(function (el) { on.observe(el); });
})();
