/* 루멘랩 홈(랜딩) 전용. 라이브러리 없음.
   1) 첫 화면 문장: 빛나는 칸을 루멘랩 도구 넷의 진짜 계산 파일(문장의 data-core, 소개 창과 같은 주소)로 이 기기에서 채운다.
      파일마다 받는 대로 그 칸부터 켠다: date·left = 며칠 계산기(DC: 요일, 두 날짜 사이), time = 한바퀴(OT: 그 도시의 지금 시각과 시차),
      hz = 체크벤치(CK: 화면 121장 시각 간격이 고른가. 고르지 않으면 체크벤치 기준대로 값을 말하지 않고 두 번 더 재고, 그래도 안 되면 그 문장을 뺀다),
      count = 칸칸(LC: 이 글 전체 글자 수, 띄어쓰기·마침표까지. 이 숫자도 글에 들어가니 바뀌지 않을 때까지 다시 센다).
      칸이 켜질 때 풀이 줄에 무엇으로 어떻게 셌는지가 쉬운 말로 나오고(칸·도구에 손을 대거나 포커스가 가면 그 칸 풀이), 풀이 목록(.now__all)엔 칸마다 한 줄.
      칸을 누르면 그 도구 소개 창(store.js)이 열리고, 남은 날 칸·글자 수 칸은 창 안 바로 써 보기가 같은 값을 다시 계산해 보인다(data-seed).
      계산 파일을 못 받거나 6초 안에 안 온 도구는 그 문장만 뺀다(남은 문장이 없으면 칸 없는 글 .now__plain). 날짜·시각은 분이 바뀔 때마다 다시 센다.
      칸 자리는 첫 그림 전에 index.html 안 스크립트(build_home.py GUESS)가 어림해 잡아 둔다(켜질 때 줄이 움직이지 않게).
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
    window.__nowOn = true;   // 첫 화면 안 스크립트(build_home.py GUESS)의 6초 안전장치를 끈다. 이제부터 여기서 맡는다
    var box = line.closest('[data-now-box]'), how = box.querySelector('[data-now-how]'), howT = how.querySelector('span');
    var city = line.querySelector('[data-city]'), wait = box.querySelector('.now__list-wait');
    var tok = {}, pills = {}, why = {}, names = {};
    $$(line, '.nt').forEach(function (a) { tok[a.getAttribute('data-nt')] = a; });
    $$(box, '.ntool').forEach(function (a) { pills[a.getAttribute('data-tool')] = a; });
    var keys = Object.keys(tok), lit = 0, hot = null, hold = 0, dead = false;
    // 도구별 상태: 0 기다림, 1 계산함, -1 뺌(파일을 제때 못 받았거나 주사율을 끝내 못 잼). got = 계산 파일을 받았나
    var state = { daycount: 0, oneturn: 0, checkbench: 0, kankan: 0 }, got = {};
    var PART = { daycount: 'date', oneturn: 'time', checkbench: 'hz', kankan: 'count' };
    var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
    var WD = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var ago = function (min) { var a = Math.abs(min), h = Math.floor(a / 60), m = a % 60; return ko ? (h ? h + '시간' : '') + (m ? (h ? ' ' : '') + m + '분' : '') : (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : ''); };
    // 다른 도시: 첫째가 방문자와 같은 시각대면 둘째
    var T = ko ? {
      date: function (m, dd, w) { return m + '월 ' + dd + '일 ' + WD[w] + '요일'; }, dayPre: function (w) { return WD[w] + '요일 '; },
      left: function (n) { return n ? nf.format(n) + '일' : '오늘 하루'; }, hz: function (n) { return n + '번'; }, count: function (n) { return nf.format(n) + '자'; },
      dateWhy: '이 기기 시계의 오늘 날짜예요. 요일은 1970년 1월 1일부터 센 날 번호로 셌어요.',
      leftWhy: function (n) { return n ? '오늘은 빼고 12월 31일까지 남은 날을 셌어요.' : '오늘이 올해 마지막 날이에요.'; },
      timeWhy: function (c, z, diff) { return c + '(' + z + ') 시각이에요. ' + (diff ? '이 기기보다 ' + ago(diff) + (diff > 0 ? ' 빨라요.' : ' 느려요.') : '이 기기와 같은 시각이에요.'); },
      hzWait: '이 브라우저가 화면을 1초에 몇 번 그리는지 재는 중이에요.', hzRe: '화면이 고르게 바뀌지 않아서 한 번 더 재는 중이에요.',
      hzWhy: function (n, ms) { return '고르게 온 화면 간격 ' + n + '개의 평균이 ' + ms + 'ms예요. 브라우저가 정한 값이라 최대 주사율보다 낮을 수 있어요.'; },
      hzFail: '화면이 끝내 고르게 바뀌지 않아서, 체크벤치 기준대로 주사율 문장은 뺐어요.',
      drop: '계산 파일을 제때 받지 못해서 이 도구의 문장은 뺐어요.',
      countWhy: '띄어쓰기와 마침표까지 이 글 전체를 셌어요. 누르면 칸칸 창에 이 글을 그대로 넣어 보여 줘요.',
      cities: [['America/New_York', '뉴욕'], ['Asia/Seoul', '서울']]
    } : {
      date: function (m, dd, w) { return WD[w] + ', ' + MON[m - 1] + ' ' + dd; }, dayPre: function (w) { return WD[w] + ' '; },
      left: function (n) { return n ? nf.format(n) + (n === 1 ? ' day' : ' days') : 'just today'; }, hz: function (n) { return n + ' frames'; }, count: function (n) { return nf.format(n) + ' characters'; },
      dateWhy: 'Today’s date from this device’s clock; the weekday comes from the day count since Jan 1, 1970.',
      leftWhy: function (n) { return n ? 'Days from today to December 31, not counting today.' : 'Today is the last day of the year.'; },
      timeWhy: function (c, z, diff) { return c + ' time (' + z + '), ' + (diff ? ago(diff) + (diff > 0 ? ' ahead of' : ' behind') + ' this device.' : 'the same as this device.'); },
      hzWait: 'Timing how many frames a second your browser draws.', hzRe: 'Frames came unevenly, so timing once more.',
      hzWhy: function (n, ms) { return n + ' even frame gaps average ' + ms + ' ms. Your browser sets this, so it can be below your screen’s maximum.'; },
      hzFail: 'Frames kept coming unevenly, so by Checkbench’s rule the refresh-rate sentence is left out.',
      drop: 'Its code didn’t arrive in time, so this tool’s sentence is left out.',
      countWhy: 'Every character, spaces and the final period included. Open it to see Kankan count this paragraph.',
      cities: [['Asia/Seoul', 'Seoul'], ['America/New_York', 'New York']]
    };
    var toolOf = function (k) { return tok[k].getAttribute('data-show'); };
    keys.forEach(function (k) { names[k] = pills[toolOf(k)].querySelector('span').textContent; });
    var setVal = function (k, text) {
      tok[k].querySelector('.nt__v').textContent = text;
      tok[k].setAttribute('aria-label', text + ' (' + names[k] + ')');
    };

    /* 풀이 줄(지금 짚은 칸)과 풀이 목록(칸마다 한 줄, 칸의 aria-describedby): 도구 이름 + 어떻게 셌는지 */
    function say(nm, w) {
      howT.textContent = '';
      var b = document.createElement('b'); b.textContent = nm;
      howT.appendChild(b); howT.appendChild(document.createTextNode(' · ' + w));
      how.classList.remove('is-new'); void how.offsetWidth; how.classList.add('is-new');
    }
    // 저절로 바뀔 땐 hold(주사율을 못 잰 까닭 같은 꼭 읽을 글) 동안 덮지 않는다. 손을 대거나 포커스를 주면 바로
    function show(k, byHand) {
      if (!why[k] || dead || (!byHand && Date.now() < hold)) return;
      say(names[k], why[k]);
    }
    function explain(k, w) {
      why[k] = w;
      var el = document.getElementById('nw-' + k);
      if (el) {
        el.textContent = '';
        var b = document.createElement('b'); b.textContent = names[k];
        el.appendChild(b); el.appendChild(document.createTextNode(' · ' + w));
      }
      if (wait) { wait.parentNode.removeChild(wait); wait = null; }
    }
    /* 칸 켜기: 처음이면 서서히 켜지고, 그 도구 이름표도 켜지고, 방 불빛이 한 칸만큼 밝아진다 */
    function light(k, text, w) {
      if (dead || !tok[k]) return;
      var a = tok[k], first = !a.classList.contains('is-on'), same = why[k] === w;
      explain(k, w);
      if (text != null) setVal(k, text);
      a.classList.remove('is-wait');
      if (first) {
        a.classList.add('is-on'); lit++;
        pills[toolOf(k)].classList.add('is-on');
        box.style.setProperty('--glow', (lit / keys.length).toFixed(2));
        if (moving()) a.classList.add('is-fresh');
      }
      if (hot ? hot === k && !same : first) show(k);
      if (k !== 'count') recount();
    }

    /* 이 글 글자 수(칸칸). 화면에 보이는 글 그대로(창의 바로 써 보기에 넘기는 글과 같게).
       날짜·시각 칸이 정해진 뒤 센다(주사율은 기다리지 않음: 그 칸 자리엔 흔한 값이 숨어 있고, 재고 나서 글이 바뀌면 다시 센다) */
    function text() { return line.textContent.replace(/\s+/g, ' ').trim(); }
    function recount() {
      if (dead || !tok.count || !got.kankan || !state.daycount || !state.oneturn) return;
      var n = 0;
      for (var i = 0; i < 8; i++) {
        setVal('count', T.count(n));
        var m = LC.analyze(text(), { segment: false, locale: ko ? 'ko' : 'en' }).chars;
        if (m === n) break;
        n = m;
      }
      state.kankan = 1;
      light('count', T.count(n), T.countWhy);
      tok.count.setAttribute('data-seed', JSON.stringify({ text: text() }));
    }

    /* 도구 하나 빼기: 그 도구의 문장과 이름표를 빼고, 남은 글을 다시 센다. 하나도 안 켜졌는데 남은 문장이 없으면 칸 없는 글 */
    function drop(t, w) {
      if (dead || state[t] === -1) return;
      state[t] = -1;
      var part = line.querySelector('[data-part="' + PART[t] + '"]');
      if (part) part.parentNode.removeChild(part);
      if (pills[t]) pills[t].hidden = true;
      keys.filter(function (k) { return tok[k] && toolOf(k) === t; }).forEach(function (k) { explain(k, w); delete tok[k]; });
      keys = Object.keys(tok);
      if (!keys.length) return plain();
      if (!lit) return;   // 아직 아무 칸도 안 켜졌으면 풀이 줄은 그대로 '불러오는 중'
      hold = Date.now() + 5000; say(pills[t] ? pills[t].querySelector('span').textContent : '', w);
      recount();
    }

    /* 오늘·올해 남은 날(며칠 계산기) */
    function dateChips(first) {
      var now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1, dd = now.getDate();
      var n = DC.fromYMD(y, m, dd), end = DC.fromYMD(y, 12, 31), left = DC.between(n, end).days;
      var seed = JSON.stringify({ to: DC.showDate(DC.iso(end), !ko) });
      if (tok.date) tok.date.setAttribute('data-seed', seed);
      if (tok.left) tok.left.setAttribute('data-seed', seed);
      state.daycount = 1;
      light('date', T.date(m, dd, DC.weekday(n)), T.dateWhy);
      if (first && moving()) setTimeout(function () { light('left', T.left(left), T.leftWhy(left)); }, 160);
      else light('left', T.left(left), T.leftWhy(left));
    }
    /* 다른 도시 지금 시각(한바퀴) */
    function timeChip() {
      if (!tok.time) return;
      var now = new Date(), ts = now.getTime(), here = -now.getTimezoneOffset(), c = T.cities[0];
      if (OT.offset(c[0], ts) === here) c = T.cities[1];
      city.textContent = c[1];
      var off = OT.offset(c[0], ts), p = OT.parts(c[0], ts), clock = OT.fmtClock(p.h, p.mi, ko ? 'ko' : 'en', true);
      if (p.d !== now.getDate()) clock = T.dayPre(p.wd) + clock;
      state.oneturn = 1;
      light('time', clock, T.timeWhy(c[1], c[0], off - here));
    }
    function tick() {
      if (dead) return;
      if (state.daycount === 1) dateChips(false);
      if (state.oneturn === 1) timeChip();
      setTimeout(tick, 60000 - Date.now() % 60000 + 40);
    }

    /* 이 브라우저가 화면을 그리는 횟수(체크벤치와 같은 '고른가' 기준). 탭이 가려져 있으면 보일 때 잰다. 세 번 다 고르지 않으면 그 문장을 뺀다.
       값은 고르게 온 간격(중앙값 ±15%)의 평균으로: 시각을 1ms 단위로 주는 브라우저에서도 중앙값(16·17ms)에 끌려가지 않게 */
    function measure(tries) {
      if (dead || !tok.hz) return;
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
        var iv = CK.intervals(times), est = CK.refreshEstimate(iv);
        if (CK.refreshSteady(est)) {
          var band = iv.filter(function (v) { return v > 0 && Math.abs(v - est.medianMs) <= est.medianMs * 0.15; });
          var mean = band.reduce(function (s, v) { return s + v; }, 0) / band.length;
          state.checkbench = 1;
          light('hz', T.hz(Math.round(1000 / mean)), T.hzWhy(band.length, mean.toFixed(2)));
        } else if (tries < 2) setTimeout(function () { measure(tries + 1); }, 500);
        else drop('checkbench', T.hzFail);
      });
    }

    function plain() {
      if (dead) return;
      dead = true; box.classList.add('is-plain');
    }

    /* 풀이 줄 높이 = 나올 수 있는 풀이 가운데 가장 긴 것(이 폭·글자 크기에서). 풀이가 바뀌어도 밑의 단추·도구 줄이 움직이지 않게 */
    function fitHow() {
      if (dead) return;
      var keep = Array.prototype.slice.call(howT.childNodes), max = 0;
      var all = [['', howT.textContent], ['date', T.dateWhy], ['left', T.leftWhy(300)], ['hz', T.hzWait], ['hz', T.hzRe], ['hz', T.hzWhy(120, '16.67')], ['hz', T.hzFail], ['hz', T.drop], ['count', T.countWhy]];
      T.cities.forEach(function (c) { all.push(['time', T.timeWhy(c[1], c[0], -810)]); });
      how.style.minHeight = '';
      all.forEach(function (x) {
        howT.textContent = (x[0] ? names[x[0]] + ' · ' : '') + x[1];
        max = Math.max(max, how.offsetHeight);
      });
      howT.textContent = ''; keep.forEach(function (n) { howT.appendChild(n); });
      how.style.minHeight = max + 'px';
    }
    fitHow();
    // 폭이 바뀌거나 글자만 커져도(확대) 다시 잰다
    if (window.ResizeObserver) {
      var seen = '', pend = 0;
      new ResizeObserver(function (es) {
        var r = es[0].contentRect, k = Math.round(r.width) + 'x' + Math.round(r.height);
        if (k === seen) return; seen = k;
        cancelAnimationFrame(pend); pend = requestAnimationFrame(fitHow);
      }).observe(line);
    } else addEventListener('resize', fitHow);

    keys.forEach(function (k) {
      var a = tok[k];
      var on = function () { if (!tok[k]) return; hot = k; a.classList.add('is-hot'); show(k, true); };
      var off = function () { if (hot === k) hot = null; a.classList.remove('is-hot'); };
      a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });
    Object.keys(pills).forEach(function (t) {
      var a = pills[t], k = keys.filter(function (x) { return toolOf(x) === t; })[0];
      var on = function () { if (!tok[k]) return; hot = k; tok[k].classList.add('is-hot'); show(k, true); };
      var off = function () { if (hot === k) hot = null; if (tok[k]) tok[k].classList.remove('is-hot'); };
      a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });

    var core = [], TOOLS = ['daycount', 'oneturn', 'checkbench', 'kankan'];
    try { core = JSON.parse(line.getAttribute('data-core') || '[]'); } catch (e) {}
    if (!window.Promise || core.length !== 4) return plain();
    var load = function (src) {
      return new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = no;
        document.head.appendChild(s);
      });
    };
    // 차례: 며칠 계산기, 한바퀴, 체크벤치, 칸칸(build_home.py 의 NOW_CORE). 받는 대로 그 도구 칸부터 켠다.
    // 못 받으면 그 도구 문장만 빼고, 6초가 지나도 안 온 도구도 뺀다(이미 켜진 칸은 그대로)
    var jobs = core.map(load);
    setTimeout(function () { TOOLS.forEach(function (t) { if (!got[t]) drop(t, T.drop); }); }, 6000);
    setTimeout(tick, 60000 - Date.now() % 60000 + 40);
    var on = {
      daycount: function () { dateChips(true); },
      oneturn: function () { setTimeout(timeChip, moving() ? 320 : 0); },
      checkbench: function () {
        if (!tok.hz) return;
        tok.hz.classList.add('is-wait'); explain('hz', T.hzWait);
        var go = function () { setTimeout(function () { measure(0); }, 250); };
        if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
      },
      kankan: function () { recount(); }
    };
    var NEED = { daycount: 'DC', oneturn: 'OT', checkbench: 'CK', kankan: 'LC' };
    jobs.forEach(function (j, i) {
      var t = TOOLS[i];
      j.then(function () {
        if (dead || state[t] === -1) return;
        if (!window[NEED[t]]) return drop(t, T.drop);
        got[t] = true; on[t]();
      }, function () { drop(t, T.drop); });
    });
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
