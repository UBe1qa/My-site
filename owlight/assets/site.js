/* Owlight 소개 사이트: 첫 화면 '눌러 보는 메뉴', 기능 탭, 예시 하루 재생, 복사 단추, 칸이 들어올 때 드러내기. 라이브러리 없음.
   언어는 i18n.js가 html[data-lang]을 바꾸고 'owlight:lang' 이벤트를 보낸다. */
(function () {
  var d = document, root = d.documentElement;
  var anim = root.classList.contains('anim');
  var en = function () { return root.getAttribute('data-lang') === 'en'; };
  var T = {
    ko: { nightwatch: '깨어 있음', curtain: '바탕화면 감춤', halo: '후광 켜짐', off: '모두 꺼짐', copied: '복사됨', copy: '복사' },
    en: { nightwatch: 'Awake', curtain: 'Desktop hidden', halo: 'Halo on', off: 'All off', copied: 'Copied', copy: 'Copy' }
  };
  var t = function () { return T[en() ? 'en' : 'ko']; };

  /* ── 첫 화면: 앱 메뉴 패널을 웹으로 다시 그린 것 + 그에 따라 바뀌는 화면 ──
     장면 조합은 앱의 기본 장면 4개와 같다. 켠 장면을 다시 누르면 앱처럼 모두 꺼진다. */
  var demo = d.querySelector('[data-demo]');
  var touched = false;
  if (demo) {
    var sws = demo.querySelectorAll('.sw');
    var chips = demo.querySelectorAll('.chip');
    var stateEl = demo.querySelector('[data-state]');
    var F = ['nightwatch', 'curtain', 'halo'];
    var on = {};
    var render = function () {
      var list = [];
      F.forEach(function (f) {
        var v = !!on[f];
        demo.classList.toggle('is-' + f, v);
        if (v) list.push(t()[f]);
      });
      sws.forEach(function (s) { s.setAttribute('aria-checked', on[s.getAttribute('data-f')] ? 'true' : 'false'); });
      if (stateEl) stateEl.textContent = list.length ? list.join(' · ') : t().off;
    };
    var set = function (f, v) {
      if (f === 'nightwatch' && v && !on.nightwatch && anim) {
        /* 불침번이 켜질 때 부엉이가 눈을 뜨고 한 번 깜빡인다 */
        demo.classList.remove('is-blink'); void demo.offsetWidth; demo.classList.add('is-blink');
      }
      on[f] = v;
    };
    var markChip = function () {
      /* 지금 켜진 조합과 똑같은 장면이 있으면 그 장면에 불을 켠다 */
      chips.forEach(function (c) {
        var want = c.getAttribute('data-on').split(' ');
        var same = F.every(function (f) { return !!on[f] === (want.indexOf(f) > -1); });
        c.setAttribute('aria-pressed', same ? 'true' : 'false');
      });
    };
    var pick = function (c) {
      var was = c.getAttribute('aria-pressed') === 'true';
      var want = was ? [] : c.getAttribute('data-on').split(' ');
      F.forEach(function (f) { set(f, want.indexOf(f) > -1); });
      chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c && !was ? 'true' : 'false'); });
      render();
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { touched = true; pick(c); }); });
    sws.forEach(function (s) {
      s.addEventListener('click', function () {
        touched = true;
        var f = s.getAttribute('data-f');
        set(f, !on[f]); markChip(); render();
      });
    });

    /* 시계: 지금 시각을 고른 언어로. 화면에 보일 때만 1분마다 */
    var clock = demo.querySelector('[data-clock]'), clockS = demo.querySelector('[data-clock-s]'), dateEl = demo.querySelector('[data-date]');
    var tick = function () {
      var now = new Date(), loc = en() ? 'en-US' : 'ko-KR';
      try {
        var hm = now.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?(AM|PM|오전|오후)\s?/, '');
        if (clock) clock.textContent = hm;
        if (clockS) clockS.textContent = now.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString(loc, { weekday: 'long', month: 'long', day: 'numeric' });
      } catch (e) {}
    };
    tick();
    var clockTimer = null;
    var startClock = function () { if (!clockTimer) clockTimer = setInterval(tick, 30000); };
    var stopClock = function () { clearInterval(clockTimer); clockTimer = null; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { tick(); startClock(); } else stopClock(); }); }).observe(demo);
    } else startClock();

    d.addEventListener('owlight:lang', function () { tick(); render(); });

    /* 처음: 움직임을 켠 사람에겐 어수선한 바탕화면을 1.6초 보여 준 뒤 '발표'가 스스로 눌린다(커튼이 내려오고 부엉이가 눈을 뜸).
       동작 줄이기를 고른 사람에겐 처음부터 '발표'가 켜진 채로 */
    var first = chips[0];
    if (first) {
      if (anim) setTimeout(function () { if (!touched) pick(first); }, 1600);
      else pick(first);
    }
    render();
  }

  /* ── 기능 탭: 화살표·Home·End 키로도 ── */
  d.querySelectorAll('[data-tabs]').forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role=tab]'));
    var choose = function (tab, focus) {
      tabs.forEach(function (x) {
        var sel = x === tab, p = d.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', sel ? 'true' : 'false');
        x.tabIndex = sel ? 0 : -1;
        if (!p) return;
        if (sel && p.hidden) { p.hidden = false; p.classList.remove('is-new'); void p.offsetWidth; p.classList.add('is-new'); }
        else if (!sel) p.hidden = true;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { choose(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === 'Home') n = tabs[0];
        else if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); choose(n, true); }
      });
    });
  });

  /* ── 예시 하루: 화면에 들어오면 부엉이 점이 시간 순서대로 지나가며 하나씩 켠다(한 번에 ~3초).
     화면을 벗어나면 처음으로 돌려 두고, 다시 들어오면 또 보여 준다. 움직임이 없으면 모두 켜진 채 ── */
  var day = d.querySelector('[data-day]');
  if (day) {
    var steps = day.querySelectorAll('.day__steps li');
    var line = day.querySelector('.day__line');
    var wide = matchMedia('(min-width: 900px)');
    var last = steps.length - 1;
    var place = function (i) {
      /* 점을 i번째 칸 위치로(세로: 칸의 시간 글자 높이, 가로: 칸 가운데) */
      var lr = line.getBoundingClientRect(), r = steps[i].getBoundingClientRect(), pos, len;
      if (wide.matches) { pos = r.left + r.width / 2 - lr.left; len = lr.width; }
      else { pos = r.top + 10 - lr.top; len = lr.height; }
      pos = Math.max(0, Math.min(len, pos));
      day.style.setProperty('--dot', pos + 'px');
      day.style.setProperty('--fill', len ? (pos / len).toFixed(3) : 1);
    };
    var playing = false;
    /* 화면 폭이 바뀌면 점을 마지막 칸에 다시 맞춘다 */
    addEventListener('resize', function () { if (!playing && !day.classList.contains('is-play')) place(last); });
    place(last);
    if (anim) {
      var dayT = [];
      var reset = function () {
        dayT.forEach(clearTimeout); dayT = [];
        steps.forEach(function (li) { li.classList.remove('is-lit'); });
        place(0);
      };
      var play = function () {
        playing = true; day.classList.add('is-play'); reset();
        steps.forEach(function (li, i) {
          dayT.push(setTimeout(function () { place(i); }, 250 + i * 800));
          dayT.push(setTimeout(function () { li.classList.add('is-lit'); }, 250 + i * 800 + 550));
        });
        dayT.push(setTimeout(function () { day.classList.remove('is-play'); playing = false; }, 250 + steps.length * 800 + 400));
      };
      var dot = day.querySelector('.day__dot'), fill = day.querySelector('.day__fill');
      [dot, fill].forEach(function (el) { if (el) el.style.transition = 'transform .55s cubic-bezier(.2,.75,.25,1)'; });
      /* 움직임이 있으면 처음엔 '아직 시작 전' 모습(점은 맨 앞, 칸은 흐리게) */
      day.classList.add('is-play'); place(0);
      var played = false;
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (!played) { played = true; play(); } }
          else if (played && e.boundingClientRect.top > innerHeight) {
            /* 위로 벗어나면(다시 내려올 수 있게) 처음으로: 다 켜진 모습은 두고 다음에 또 재생 */
            played = false; dayT.forEach(clearTimeout); day.classList.remove('is-play'); playing = false;
            steps.forEach(function (li) { li.classList.add('is-lit'); }); place(last);
          }
        });
      }, { threshold: 0.45 }).observe(day);
    }
  }

  /* ── 복사 단추 ── */
  d.querySelectorAll('[data-copy]').forEach(function (b) {
    var lab = b.querySelector('span'), tm = null;
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy');
      var done = function () {
        b.classList.add('is-done'); if (lab) lab.textContent = t().copied;
        clearTimeout(tm); tm = setTimeout(function () { b.classList.remove('is-done'); if (lab) lab.textContent = t().copy; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () {});
    });
  });

  /* ── 칸 드러내기 ── */
  if (anim) {
    window.__rvOn = true;
    var targets = d.querySelectorAll('.screens h2, .screens .sec-lead, .tabs, .auto h2, .auto .sec-lead, .day, .auto__item, .privacy__in > div, .nolist li, .price h2, .price__card, .faq__list, .end__in');
    /* 숨기기는 첫 알림에서 화면 밖인 칸만. 새로고침이 중간 위치를 되살렸을 때 이미 보이는 칸이
       사라졌다 다시 나타나지 않게 */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target;
        if (!el.hasAttribute('data-rv')) {
          var r = e.boundingClientRect;
          if (r.top < innerHeight && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); return; }
          el.setAttribute('data-rv', '');
        }
        if (e.isIntersecting) { el.classList.add('in'); io.unobserve(el); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }
})();
