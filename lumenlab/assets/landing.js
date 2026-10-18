/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면 문장: 빛나는 칸을 루멘랩 도구 넷의 진짜 계산 파일(문장의 data-core, 소개 창과 같은 주소)로 이 기기에서 채운다.
      date·left = 며칠 계산기(DC: 요일, 두 날짜 사이), time = 한바퀴(OT: 그 도시의 지금 시각과 UTC 차), hz = 체크벤치(CK: 화면 121장 시각 간격의 중앙값,
      고르지 않으면 체크벤치 기준대로 값을 말하지 않고 다시 잰다), count = 칸칸(LC: 이 문장 전체 글자 수, 띄어쓰기 포함, 이 숫자까지 들어가니 바뀌지 않을 때까지 다시 셈).
      칸이 처음 켜질 때마다 풀이 줄에 그 칸을 무엇으로 어떻게 셌는지가 나오고, 칸에 손을 대거나 포커스가 가면 그 칸 풀이로 바뀐다. 누르면 그 도구 소개 창(store.js).
      계산 파일을 못 불러오면 칸 없는 글(.now__plain)로 바꾼다. 시각과 날짜는 분이 바뀔 때마다 다시 센다.
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
    var box = line.closest('[data-now-box]'), how = box.querySelector('[data-now-how]');
    var howI = how.querySelector('img'), howT = how.querySelector('span'), city = line.querySelector('[data-city]');
    var tok = {}, why = {}, keys = [];
    $$(line, '.nt').forEach(function (a) { var k = a.getAttribute('data-nt'); tok[k] = a; keys.push(k); });
    var lit = 0, hot = null, anim = {};
    var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
    var WD = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // 다른 도시: 첫째가 방문자와 같은 시각대면 둘째
    var T = ko ? {
      hz: function (n) { return n + '번'; }, left: function (n) { return nf.format(n) + '일'; }, count: function (n) { return nf.format(n) + '자'; },
      date: function (m, dd, w) { return m + '월 ' + dd + '일 ' + WD[w] + '요일'; }, dayPre: function (w) { return WD[w] + '요일 '; },
      hzWait: '이 페이지가 새로 그려지는 간격을 재는 중', hzRe: '간격이 고르지 않아 다시 재는 중',
      hzWhy: function (n, ms) { return '화면 ' + n + '장을 그린 시각, 간격의 중앙값 ' + ms + 'ms'; },
      dateWhy: '이 기기 시계의 오늘, 요일은 1970년 1월 1일부터 센 날 번호로', leftWhy: function (y) { return '오늘은 빼고 ' + y + '년 12월 31일까지'; },
      timeWhy: function (z, u) { return z + ' 시간대, 지금 ' + u; }, countWhy: '이 문장 전체, 띄어쓰기와 이 숫자까지',
      cities: [['America/New_York', '뉴욕'], ['Asia/Seoul', '서울']]
    } : {
      hz: function (n) { return n + ' times'; }, left: function (n) { return nf.format(n) + (n === 1 ? ' day' : ' days'); }, count: function (n) { return nf.format(n) + ' characters'; },
      date: function (m, dd, w) { return WD[w] + ', ' + MON[m - 1] + ' ' + dd; }, dayPre: function (w) { return WD[w] + ' '; },
      hzWait: 'Timing how often this page redraws', hzRe: 'Frames came unevenly, timing again',
      hzWhy: function (n, ms) { return 'median gap between ' + n + ' frames, ' + ms + ' ms'; },
      dateWhy: 'today on this device’s clock, weekday from the day number since Jan 1, 1970', leftWhy: function (y) { return 'to December 31, ' + y + ', not counting today'; },
      timeWhy: function (z, u) { return z + ' time zone, ' + u + ' right now'; }, countWhy: 'this whole sentence, spaces and this number included',
      cities: [['Asia/Seoul', 'Seoul'], ['America/New_York', 'New York']]
    };
    var later = function (fn, ms) { return ms > 0 ? setTimeout(fn, ms) : fn(); };
    var who = function (k) { return tok[k].querySelector('.nt__who').textContent.replace(/^\s*\(|\)\s*$/g, ''); };
    var setVal = function (k, text) { tok[k].querySelector('.nt__v').textContent = text; };

    /* 풀이 줄: 도구 아이콘 + 이름 + 어떻게 셌는지 */
    function show(k) {
      if (!why[k]) return;
      howI.src = tok[k].querySelector('.nt__i').getAttribute('src');
      howT.textContent = '';
      var b = document.createElement('b'); b.textContent = who(k);
      howT.appendChild(b); howT.appendChild(document.createTextNode(' · ' + why[k]));
      how.classList.remove('is-new'); void how.offsetWidth; how.classList.add('is-new');
    }
    /* 칸 켜기: 처음이면 깜빡이며 켜지고 방 불빛이 한 칸만큼 밝아진다 */
    function light(k, text, w) {
      var a = tok[k], first = !a.classList.contains('is-on'), same = why[k] === w;
      why[k] = w;
      if (text != null) setVal(k, text);
      a.classList.remove('is-wait');
      if (first) {
        a.classList.add('is-on'); lit++;
        box.style.setProperty('--glow', (lit / keys.length).toFixed(2));
        if (moving()) { a.classList.remove('is-flick'); void a.offsetWidth; a.classList.add('is-flick'); }
      }
      if (hot ? hot === k && !same : first) show(k);
      if (k !== 'count') recount();
    }
    /* 숫자가 0에서 올라가며 켜진다(움직임을 줄이면 바로) */
    function rise(k, n, fmt, w) {
      if (!moving()) return light(k, fmt(n), w);
      cancelAnimationFrame(anim[k]);
      var t0 = 0, ms = 520;
      light(k, fmt(0), w);
      anim[k] = requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var e = Math.min(1, (t - t0) / ms), v = Math.round(n * (1 - Math.pow(1 - e, 3)));
        setVal(k, fmt(v));
        if (e < 1) anim[k] = requestAnimationFrame(step); else recount();
      });
    }

    /* 이 문장 글자 수(칸칸). 안 보이는 도구 이름은 빼고, 화면에 보이는 그대로 */
    var countReady = false;
    function text() {
      var c = line.cloneNode(true);
      $$(c, '.nt__who').forEach(function (x) { x.parentNode.removeChild(x); });
      return c.textContent.replace(/\s+/g, ' ').trim();
    }
    function recount() {
      if (!countReady || !tok.count) return;
      var n = 0;
      for (var i = 0; i < 8; i++) {
        setVal('count', T.count(n));
        var m = LC.analyze(text(), { segment: false, locale: ko ? 'ko' : 'en' }).chars;
        if (m === n) break;
        n = m;
      }
      light('count', T.count(n), T.countWhy);
    }

    /* 오늘·올해 남은 날(며칠 계산기), 다른 도시 지금 시각(한바퀴). 분이 바뀌면 다시 */
    function tick(first) {
      var now = new Date(), ts = now.getTime(), y = now.getFullYear(), m = now.getMonth() + 1, dd = now.getDate();
      var n = DC.fromYMD(y, m, dd), gap = first && moving() ? 170 : 0;
      later(function () { light('date', T.date(m, dd, DC.weekday(n)), T.dateWhy); }, 0);
      later(function () { var left = DC.between(n, DC.fromYMD(y, 12, 31)).days; if (first) rise('left', left, T.left, T.leftWhy(y)); else light('left', T.left(left), T.leftWhy(y)); }, gap);
      later(function () {
        var here = -now.getTimezoneOffset(), c = T.cities[0];
        if (OT.offset(c[0], ts) === here) c = T.cities[1];
        city.textContent = c[1];
        var p = OT.parts(c[0], ts), clock = OT.fmtClock(p.h, p.mi, ko ? 'ko' : 'en', true);
        if (p.d !== dd) clock = T.dayPre(p.wd) + clock;
        light('time', clock, T.timeWhy(c[0], OT.utcLabel(OT.offset(c[0], ts))));
      }, gap * 2);
      setTimeout(function () { tick(false); }, 60000 - ts % 60000 + 40);
    }

    /* 이 페이지 주사율(체크벤치와 같은 방법·기준). 탭이 가려져 있으면 보일 때 잰다 */
    function measure(tries) {
      if (document.hidden) {
        document.addEventListener('visibilitychange', function f() { if (!document.hidden) { document.removeEventListener('visibilitychange', f); measure(tries); } });
        return;
      }
      tok.hz.classList.add('is-wait'); why.hz = tries ? T.hzRe : T.hzWait;
      if (!hot && !tok.hz.classList.contains('is-on') && (tries || !lit)) show('hz');
      var times = [], N = 121;
      requestAnimationFrame(function f(t) {
        times.push(t);
        if (times.length < N) return requestAnimationFrame(f);
        var est = CK.refreshEstimate(CK.intervals(times));
        if (CK.refreshSteady(est)) rise('hz', Math.round(est.hz), T.hz, T.hzWhy(N, est.medianMs.toFixed(1)));
        else setTimeout(function () { measure(tries + 1); }, 600);
      });
    }

    function start() {
      if (!window.DC || !window.OT || !window.CK || !window.LC) return plain();
      line.classList.add('is-live');
      tok.hz.classList.add('is-wait');
      tick(true);
      // 처음엔 나머지 칸이 다 켜진 뒤에 글자 수를 센다(주사율은 재는 데 1~2초)
      later(function () { countReady = true; recount(); }, moving() ? 520 : 0);
      var go = function () { setTimeout(function () { measure(0); }, 250); };
      if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    }
    function plain() { box.classList.add('is-plain'); }

    keys.forEach(function (k) {
      var a = tok[k];
      var on = function () { hot = k; a.classList.add('is-hot'); show(k); };
      var off = function () { if (hot === k) hot = null; a.classList.remove('is-hot'); };
      a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });

    var core = [];
    try { core = JSON.parse(line.getAttribute('data-core') || '[]'); } catch (e) {}
    var load = function (src) {
      return new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = src; s.async = false; s.onload = ok; s.onerror = no;
        document.head.appendChild(s);
      });
    };
    if (!window.Promise || !core.length) return plain();
    Promise.all(core.map(load)).then(start, plain);
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
