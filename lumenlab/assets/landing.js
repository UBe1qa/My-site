/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면 문장: 빛나는 칸을 루멘랩 도구 넷의 진짜 계산 파일(문장의 data-core, 소개 창과 같은 주소)로 이 기기에서 채운다.
      파일마다 받는 대로 그 칸부터 켠다: date·left = 며칠 계산기(DC: 요일, 두 날짜 사이), time = 한바퀴(OT: 그 도시의 지금 시각과 시차),
      hz = 체크벤치(CK: 화면 121장 시각 간격의 중앙값. 고르지 않으면 체크벤치 기준대로 값을 말하지 않고 두 번 더 재고, 그래도 안 되면 그 문장을 뺀다),
      count = 칸칸(LC: 이 글 전체 글자 수, 띄어쓰기·마침표까지. 이 숫자도 글에 들어가니 바뀌지 않을 때까지 다시 센다. 주사율이 정해진 뒤 한 번).
      칸이 처음 켜질 때마다 풀이 줄에 무엇으로 어떻게 셌는지가 쉬운 말로 나오고, 칸·도구에 손을 대거나 포커스가 가면 그 칸 풀이로 바뀐다.
      칸을 누르면 그 도구 소개 창(store.js)이 열리고, 날짜 칸·글자 수 칸은 창 안 바로 써 보기가 이 값을 다시 계산해 보인다(data-seed).
      계산 파일 하나라도 못 받거나 6초 안에 다 안 오면 칸 없는 글(.now__plain)로 바꾼다. 날짜·시각은 분이 바뀔 때마다 다시 센다.
   2) 만든 것 칸: 줄(.shelf)이 처음 화면에 들어올 때 한 번 .in → CSS가 그 줄 아이콘을 하나씩 켠다(꺼진 전구 → 켜진 불).
      아이콘을 누르면 뜨는 소개 창은 assets/store.js. */
(function () {
  var d = document.documentElement;
  var ko = d.lang !== 'en';
  var calm = matchMedia('(prefers-reduced-motion: reduce)');
  var moving = function () { return d.classList.contains('anim') && !calm.matches; };
  var $$ = function (r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); };

  /* ---------- 1) 첫 화면 문장 ---------- */
  var line = document.querySelector('[data-now]');
  if (line) (function () {
    var box = line.closest('[data-now-box]'), how = box.querySelector('[data-now-how]'), howT = how.querySelector('span');
    var city = line.querySelector('[data-city]');
    var tok = {}, pills = {}, why = {};
    $$(line, '.nt').forEach(function (a) { tok[a.getAttribute('data-nt')] = a; });
    $$(box, '.ntool').forEach(function (a) { pills[a.getAttribute('data-tool')] = a; });
    var keys = Object.keys(tok), lit = 0, hot = null, anim = {}, dead = false, hzDone = false, lcOn = false, dcOn = false, otOn = false;
    var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
    var WD = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var ago = function (min, ko_, en_) { var a = Math.abs(min), h = Math.floor(a / 60), m = a % 60; return ko ? (h ? h + '시간' : '') + (m ? (h ? ' ' : '') + m + '분' : '') : (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : ''); };
    // 다른 도시: 첫째가 방문자와 같은 시각대면 둘째
    var T = ko ? {
      date: function (m, dd, w) { return m + '월 ' + dd + '일 ' + WD[w] + '요일'; }, dayPre: function (w) { return WD[w] + '요일 '; },
      left: function (n) { return n ? nf.format(n) + '일' : '오늘 하루'; }, hz: function (n) { return n + '번'; }, count: function (n) { return nf.format(n) + '자'; },
      dateWhy: '이 기기 시계의 오늘 날짜예요. 요일은 1970년 1월 1일부터 센 날 번호로 셌어요.',
      leftWhy: function (n) { return n ? '오늘은 빼고 12월 31일까지 남은 날을 셌어요.' : '오늘이 올해 마지막 날이에요.'; },
      timeWhy: function (c, z, diff) { return c + '(' + z + ') 시각이에요. ' + (diff ? '이 기기보다 ' + ago(diff) + (diff > 0 ? ' 빨라요.' : ' 느려요.') : '이 기기와 같은 시각이에요.'); },
      hzWait: '이 페이지가 1초에 몇 번 새로 그려지는지 재는 중이에요.', hzRe: '화면이 고르게 바뀌지 않아서 한 번 더 재는 중이에요.',
      hzWhy: function (n, ms) { return n + '번 잰 화면 간격의 가운데 값이 ' + ms + 'ms예요. 브라우저가 정한 값이라 최대 주사율보다 낮을 수 있어요.'; },
      hzFail: '화면이 끝내 고르게 바뀌지 않아서, 체크벤치 기준대로 주사율 문장은 뺐어요.',
      countWhy: '띄어쓰기와 마침표까지 이 글 전체를 셌어요. 복사해서 칸칸에 넣어도 같은 수가 나와요.',
      cities: [['America/New_York', '뉴욕'], ['Asia/Seoul', '서울']]
    } : {
      date: function (m, dd, w) { return WD[w] + ', ' + MON[m - 1] + ' ' + dd; }, dayPre: function (w) { return WD[w] + ' '; },
      left: function (n) { return n ? nf.format(n) + (n === 1 ? ' day' : ' days') : 'just today'; }, hz: function (n) { return n + ' times'; }, count: function (n) { return nf.format(n) + ' characters'; },
      dateWhy: 'Today’s date from this device’s clock, with the weekday worked out from the day number since January 1, 1970.',
      leftWhy: function (n) { return n ? 'Days from today to December 31, not counting today.' : 'Today is the last day of the year.'; },
      timeWhy: function (c, z, diff) { return c + ' time (' + z + '), ' + (diff ? ago(diff) + (diff > 0 ? ' ahead of' : ' behind') + ' this device.' : 'the same as this device.'); },
      hzWait: 'Timing how many times a second this page redraws.', hzRe: 'Frames came unevenly, so timing once more.',
      hzWhy: function (n, ms) { return 'The middle of ' + n + ' timed gaps between frames is ' + ms + ' ms. Your browser sets this rate, so it can be below your screen’s maximum.'; },
      hzFail: 'Frames kept coming unevenly, so by Checkbench’s rule the refresh-rate sentence is left out.',
      countWhy: 'The whole paragraph, spaces and the final period included. Paste it into Kankan and you get the same number.',
      cities: [['Asia/Seoul', 'Seoul'], ['America/New_York', 'New York']]
    };
    var name = function (k) { return pills[tok[k].getAttribute('data-show')].querySelector('span').textContent; };
    var setVal = function (k, text) {
      tok[k].querySelector('.nt__v').textContent = text;
      tok[k].setAttribute('aria-label', text + ' (' + name(k) + ')');
    };

    /* 풀이 줄: 도구 이름 + 어떻게 셌는지 */
    function show(k) {
      if (!why[k] || dead) return;
      howT.textContent = '';
      var b = document.createElement('b'); b.textContent = name(k);
      howT.appendChild(b); howT.appendChild(document.createTextNode(' · ' + why[k]));
      how.classList.remove('is-new'); void how.offsetWidth; how.classList.add('is-new');
    }
    function explain(k, w) {
      why[k] = w;
      var el = document.getElementById('nw-' + k);
      if (el) el.textContent = w;
    }
    /* 칸 켜기: 처음이면 서서히 켜지고, 그 도구 이름표도 켜지고, 방 불빛이 한 칸만큼 밝아진다 */
    function light(k, text, w, quiet) {
      if (dead) return;
      var a = tok[k], first = !a.classList.contains('is-on'), same = why[k] === w;
      explain(k, w);
      if (text != null) setVal(k, text);
      a.classList.remove('is-wait');
      if (first) {
        a.classList.add('is-on'); lit++;
        pills[a.getAttribute('data-show')].classList.add('is-on');
        box.style.setProperty('--glow', (lit / keys.length).toFixed(2));
        if (moving()) a.classList.add('is-fresh');
      }
      if (hot ? hot === k && !same : first) show(k);
      if (!quiet && k !== 'count') recount();
    }
    /* 숫자가 0에서 올라가며 켜진다(움직임을 줄이면 바로). 다 오르면 done.
       오르는 동안 모자란 자릿수는 숫자 폭 빈칸(U+2007)으로 채워 칸 폭이 그대로다(줄이 출렁이지 않게). 1부터(0은 '오늘 하루'처럼 다른 말이 될 수 있어서) */
    function rise(k, n, fmt, w, done) {
      if (!moving()) { light(k, fmt(n), w); if (done) done(); return; }
      cancelAnimationFrame(anim[k]);
      var t0 = 0, ms = 520, pad = function (x) { return new Array(Math.max(0, String(n).length - String(x).length) + 1).join('\u2007') + fmt(x); };
      light(k, pad(1), w, true);
      anim[k] = requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var e = Math.min(1, (t - t0) / ms);
        setVal(k, e < 1 ? pad(Math.max(1, Math.round(n * (1 - Math.pow(1 - e, 3))))) : fmt(n));
        if (e < 1) anim[k] = requestAnimationFrame(step); else { if (done) done(); recount(); }
      });
    }

    /* 이 글 글자 수(칸칸). 화면에 보이는 글 그대로(복사해 칸칸에 넣는 것과 같게) */
    function text() { return line.textContent.replace(/\s+/g, ' ').trim(); }
    function recount() {
      if (dead || !lcOn || !hzDone || !dcOn || !otOn || !tok.count) return;
      var n = 0;
      for (var i = 0; i < 8; i++) {
        setVal('count', T.count(n));
        var m = LC.analyze(text(), { segment: false, locale: ko ? 'ko' : 'en' }).chars;
        if (m === n) break;
        n = m;
      }
      light('count', T.count(n), T.countWhy);
      tok.count.setAttribute('data-seed', JSON.stringify({ text: text() }));
    }

    /* 오늘·올해 남은 날(며칠 계산기) */
    function dateChips(first) {
      var now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1, dd = now.getDate();
      var n = DC.fromYMD(y, m, dd), end = DC.fromYMD(y, 12, 31), left = DC.between(n, end).days;
      var seed = JSON.stringify({ to: DC.showDate(DC.iso(end), !ko) });
      tok.date.setAttribute('data-seed', seed); tok.left.setAttribute('data-seed', seed);
      light('date', T.date(m, dd, DC.weekday(n)), T.dateWhy, first);
      if (first && left) setTimeout(function () { rise('left', left, T.left, T.leftWhy(left)); }, moving() ? 160 : 0);
      else light('left', T.left(left), T.leftWhy(left));
    }
    /* 다른 도시 지금 시각(한바퀴) */
    function timeChip() {
      var now = new Date(), ts = now.getTime(), here = -now.getTimezoneOffset(), c = T.cities[0];
      if (OT.offset(c[0], ts) === here) c = T.cities[1];
      city.textContent = c[1];
      var off = OT.offset(c[0], ts), p = OT.parts(c[0], ts), clock = OT.fmtClock(p.h, p.mi, ko ? 'ko' : 'en', true);
      if (p.d !== now.getDate()) clock = T.dayPre(p.wd) + clock;
      light('time', clock, T.timeWhy(c[1], c[0], off - here));
    }
    function tick() {
      if (dead) return;
      if (dcOn) dateChips(false);
      if (otOn) timeChip();
      setTimeout(tick, 60000 - Date.now() % 60000 + 40);
    }

    /* 이 페이지 주사율(체크벤치와 같은 방법·기준). 탭이 가려져 있으면 보일 때 잰다. 세 번 다 고르지 않으면 그 문장을 뺀다 */
    function measure(tries) {
      if (dead) return;
      if (document.hidden) {
        document.addEventListener('visibilitychange', function f() { if (!document.hidden) { document.removeEventListener('visibilitychange', f); measure(tries); } });
        return;
      }
      tok.hz.classList.add('is-wait'); explain('hz', tries ? T.hzRe : T.hzWait);
      if (tries && !hot) show('hz');
      var times = [], N = 121;
      requestAnimationFrame(function f(t) {
        if (dead) return;
        times.push(t);
        if (times.length < N) return requestAnimationFrame(f);
        var est = CK.refreshEstimate(CK.intervals(times));
        if (CK.refreshSteady(est)) rise('hz', Math.round(est.hz), T.hz, T.hzWhy(est.samples, est.medianMs.toFixed(1)), function () { hzDone = true; });
        else if (tries < 2) setTimeout(function () { measure(tries + 1); }, 500);
        else {
          var part = line.querySelector('[data-part="hz"]');
          if (part) part.parentNode.removeChild(part);
          pills.checkbench.classList.add('is-off');
          explain('hz', T.hzFail); delete tok.hz; keys = Object.keys(tok);
          howT.textContent = ''; var b = document.createElement('b'); b.textContent = pills.checkbench.querySelector('span').textContent;
          howT.appendChild(b); howT.appendChild(document.createTextNode(' · ' + T.hzFail));
          hzDone = true; recount();
        }
      });
    }

    /* 풀이 줄 높이 = 나올 수 있는 풀이 가운데 가장 긴 것(이 폭에서). 풀이가 바뀌어도 밑의 단추·도구 줄이 움직이지 않게. 폭이 바뀌면 다시 */
    function fitHow() {
      var keep = Array.prototype.slice.call(howT.childNodes), max = 0;
      var all = [['', howT.textContent], ['date', T.dateWhy], ['left', T.leftWhy(300)], ['hz', T.hzWait], ['hz', T.hzRe], ['hz', T.hzWhy(120, '16.7')], ['hz', T.hzFail], ['count', T.countWhy]];
      T.cities.forEach(function (c) { all.push(['time', T.timeWhy(c[1], c[0], -810)]); });
      how.style.minHeight = '';
      all.forEach(function (x) {
        howT.textContent = (x[0] ? names[x[0]] + ' · ' : '') + x[1];
        max = Math.max(max, how.offsetHeight);
      });
      howT.textContent = ''; keep.forEach(function (n) { howT.appendChild(n); });
      how.style.minHeight = max + 'px';
    }

    function plain() {
      if (dead) return;
      dead = true; box.classList.add('is-plain');
    }

    var names = {}, fitW = 0;
    keys.forEach(function (k) { names[k] = name(k); });
    fitHow(); fitW = innerWidth;
    addEventListener('resize', function () { if (innerWidth !== fitW && !dead) { fitW = innerWidth; fitHow(); } });

    keys.forEach(function (k) {
      var a = tok[k];
      var on = function () { if (!tok[k]) return; hot = k; a.classList.add('is-hot'); show(k); };
      var off = function () { if (hot === k) hot = null; a.classList.remove('is-hot'); };
      a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });
    Object.keys(pills).forEach(function (t) {
      var a = pills[t], k = keys.filter(function (x) { return tok[x].getAttribute('data-show') === t; })[0];
      var on = function () { if (!tok[k]) return; hot = k; tok[k].classList.add('is-hot'); show(k); };
      var off = function () { if (hot === k) hot = null; if (tok[k]) tok[k].classList.remove('is-hot'); };
      a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });

    var core = [];
    try { core = JSON.parse(line.getAttribute('data-core') || '[]'); } catch (e) {}
    if (!window.Promise || core.length !== 4) return plain();
    var load = function (src) {
      return new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = no;
        document.head.appendChild(s);
      });
    };
    // 차례: 며칠 계산기, 한바퀴, 체크벤치, 칸칸(build_home.py 의 NOW_CORE)
    var got = core.map(load), all = false;
    var late = setTimeout(function () { if (!all) plain(); }, 6000);
    Promise.all(got).then(function () { all = true; clearTimeout(late); setTimeout(tick, 60000 - Date.now() % 60000 + 40); }, plain);
    got[0].then(function () { if (dead || !window.DC) return plain(); dcOn = true; dateChips(true); recount(); }, function () {});
    got[1].then(function () { if (dead || !window.OT) return plain(); otOn = true; setTimeout(function () { timeChip(); recount(); }, moving() ? 320 : 0); }, function () {});
    got[2].then(function () {
      if (dead || !window.CK) return plain();
      tok.hz.classList.add('is-wait'); explain('hz', T.hzWait);
      var go = function () { setTimeout(function () { measure(0); }, 250); };
      if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    }, function () {});
    got[3].then(function () { if (dead || !window.LC) return plain(); lcOn = true; recount(); }, function () {});
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
