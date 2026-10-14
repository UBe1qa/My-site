/* 한바퀴(Oneturn) 시간 로직. 화면(DOM)을 모른다. 브라우저(window.OT)와 노드 시험(globalThis.OT)이 같이 쓴다.
   - 시간 재기는 언제나 '시작·끝 시각(밀리초)'으로 한다. 몇 초마다 1씩 빼지 않는다(숨은 탭에서 늦게 불려도 틀리지 않게).
   - 시간대 계산은 브라우저의 시간대 자료(Intl, IANA tz database). 시험은 파이썬 zoneinfo 값과 대조한다. */
(function (G) {
  'use strict';
  var OT = {};
  var SEC = 1000, MIN = 60000, HOUR = 3600000, DAY = 86400000;
  OT.MAX_TIMER = 99 * HOUR + 59 * MIN + 59 * SEC; // 99:59:59

  /* ---------- 숫자 칸 읽기 ---------- */
  // 전각 숫자(１０)를 반각으로. 그 밖의 글자는 그대로 둔다(조용히 바꿔 읽지 않기).
  OT.toHalf = function (s) {
    return String(s == null ? '' : s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).trim();
  };
  // 0 이상 max 이하의 정수만 받는다. 빈칸 = 0. 소수·음수·글자·너무 큰 값은 ok:false 와 까닭.
  OT.parseField = function (raw, max) {
    var s = OT.toHalf(raw);
    if (s === '') return { ok: true, value: 0, empty: true };
    if (!/^\d+$/.test(s)) return { ok: false, err: /^-/.test(s) ? 'neg' : /[.,]/.test(s) ? 'frac' : 'nan' };
    var v = parseInt(s, 10);
    if (v > max) return { ok: false, err: 'max', max: max };
    return { ok: true, value: v };
  };
  OT.hms = function (h, m, s) { return (h || 0) * HOUR + (m || 0) * MIN + (s || 0) * SEC; };
  OT.split = function (ms) {
    ms = Math.max(0, Math.floor(ms));
    return { h: Math.floor(ms / HOUR), m: Math.floor(ms % HOUR / MIN), s: Math.floor(ms % MIN / SEC), cs: Math.floor(ms % SEC / 10) };
  };

  function p2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 글자로 보이기 ---------- */
  // 타이머: 남은 시간은 초 단위 올림(시작하자마자 5:00, 1초 뒤 4:59, 끝나는 순간 0:00).
  OT.fmtTimer = function (ms) {
    var t = OT.split(Math.ceil(Math.max(0, ms) / SEC) * SEC);
    return t.h ? t.h + ':' + p2(t.m) + ':' + p2(t.s) : p2(t.m) + ':' + p2(t.s);
  };
  // 스톱워치: 내림, 100분의 1초까지.
  OT.fmtWatch = function (ms, noCs) {
    var t = OT.split(ms);
    var main = t.h ? t.h + ':' + p2(t.m) + ':' + p2(t.s) : p2(t.m) + ':' + p2(t.s);
    return noCs ? main : main + '.' + p2(t.cs);
  };
  // 읽어 주는 말(화면 읽기·제목). lang: 'ko' | 'en'
  OT.say = function (ms, lang, ceil) {
    var t = OT.split(ceil ? Math.ceil(Math.max(0, ms) / SEC) * SEC : ms), out = [];
    if (lang === 'ko') {
      if (t.h) out.push(t.h + '시간');
      if (t.m) out.push(t.m + '분');
      if (t.s || !out.length) out.push(t.s + '초');
      return out.join(' ');
    }
    if (t.h) out.push(t.h + (t.h === 1 ? ' hour' : ' hours'));
    if (t.m) out.push(t.m + (t.m === 1 ? ' minute' : ' minutes'));
    if (t.s || !out.length) out.push(t.s + (t.s === 1 ? ' second' : ' seconds'));
    return out.join(' ');
  };
  // '3분 전', '2시간 뒤' 같은 대략의 거리(분 단위 내림, 1분 미만은 '방금').
  OT.ago = function (ms, lang) {
    var m = Math.floor(Math.abs(ms) / MIN), h = Math.floor(m / 60), r = m % 60;
    if (lang === 'ko') return m < 1 ? '방금' : (h ? h + '시간 ' + (r ? r + '분 ' : '') : m + '분 ') + '전';
    if (m < 1) return 'just now';
    return (h ? h + ' h ' + (r ? r + ' min ' : '') : m + ' min ') + 'ago';
  };
  OT.until = function (ms, lang) { // 알람까지 남은 시간(분 올림)
    var m = Math.ceil(Math.max(0, ms) / MIN), h = Math.floor(m / 60), r = m % 60;
    if (lang === 'ko') return (h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분') + ' 뒤';
    return 'in ' + (h ? h + ' h' + (r ? ' ' + r + ' min' : '') : r + ' min');
  };

  /* ---------- 시계판 눈금 ---------- */
  // 부채꼴 한 바퀴가 몇 분인지: 맞춘 시간보다 크거나 같은 것 가운데 가장 작은 것.
  OT.SCALES = [1, 5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440];
  OT.scaleFor = function (ms) {
    var min = ms / MIN;
    for (var i = 0; i < OT.SCALES.length; i++) if (min <= OT.SCALES[i] + 1e-9) return OT.SCALES[i];
    return Math.ceil(min / 60) * 60;
  };
  // 시계판에 쓸 숫자: 한 바퀴(분) → 숫자 목록. 12개 안팎. unit 's'면 초, 'm'이면 분, 'h'면 시간.
  // ticks = 작은 눈금 수(한 눈금이 늘 딱 떨어지는 시간: 60분 판 1분, 5분 판 5초, 2시간 판 5분, 하루 판 1시간).
  var FACE = { 1: ['s', 5, 60], 5: ['m', 1, 60], 10: ['m', 1, 60], 15: ['m', 5, 60], 20: ['m', 2, 60], 30: ['m', 5, 60], 60: ['m', 5, 60],
    120: ['m', 15, 24], 180: ['m', 30, 36], 240: ['h', 1, 24], 360: ['h', 1, 24], 480: ['h', 1, 24], 720: ['h', 1, 24], 1440: ['h', 2, 24] };
  OT.faceLabels = function (scale) {
    var f = FACE[scale], out = [];
    if (!f) { var hs = Math.ceil(scale / 60); f = ['h', Math.max(1, Math.ceil(hs / 12)), hs]; }
    var unit = f[0], step = f[1], n = unit === 's' ? 60 : unit === 'm' ? scale : scale / 60;
    for (var v = 0; v < n - 1e-9; v += step) out.push({ v: v, frac: v / n });
    return { unit: unit, labels: out, ticks: f[2] };
  };
  // 시계판을 돌려 맞추기: 12시 방향에서 시계 방향으로 잰 각도(도) → 분(1분 단위, 0~60). 60분 판.
  OT.angleToMinutes = function (deg) {
    var a = ((deg % 360) + 360) % 360;
    return Math.round(a / 6) % 60; // 60은 0과 같은 자리라 끌기 코드(dragMinutes)가 이전 값을 보고 정한다
  };
  // 끌기: 이전 값(0~60)에서 가장 가까운 쪽으로 움직인 만큼 더하고 0~60에 묶는다(12시를 넘어 한 바퀴를 넘기지 않음).
  OT.dragMinutes = function (prev, deg) {
    var m = OT.angleToMinutes(deg), cur = prev % 60, dlt = m - cur;
    if (dlt > 30) dlt -= 60; else if (dlt <= -30) dlt += 60;
    if (prev === 60 && dlt > 0) dlt = 0;
    return Math.max(0, Math.min(60, prev + dlt));
  };

  /* ---------- 타이머 상태 ---------- */
  // 타이머 하나 = { dur, end(돌 때), left(멈췄을 때), state: 'idle'|'run'|'pause'|'done', doneAt }
  OT.timerLeft = function (t, now) {
    if (t.state === 'run') return Math.max(0, t.end - now);
    if (t.state === 'pause') return t.left;
    if (t.state === 'done') return 0;
    return t.dur;
  };
  OT.timerStart = function (t, now) {
    var left = t.state === 'pause' ? t.left : t.dur;
    if (!(left > 0)) return t;
    return assign(t, { state: 'run', end: now + left, left: null, doneAt: null });
  };
  OT.timerPause = function (t, now) {
    if (t.state !== 'run') return t;
    return assign(t, { state: 'pause', left: Math.max(0, t.end - now), end: null });
  };
  OT.timerReset = function (t) { return assign(t, { state: 'idle', end: null, left: null, doneAt: null }); };
  OT.timerAdd = function (t, ms, now) { // +1분 등. 돌 때는 끝 시각을, 멈췄을 때는 남은 시간을, 쉬는 중엔 맞춘 시간을 늘린다
    if (t.state === 'run') return assign(t, { end: t.end + ms, dur: Math.min(OT.MAX_TIMER, t.dur + ms) });
    if (t.state === 'pause') return assign(t, { left: Math.min(OT.MAX_TIMER, t.left + ms), dur: Math.min(OT.MAX_TIMER, t.dur + ms) });
    if (t.state === 'done') return assign(t, { state: 'run', end: now + ms, dur: ms, doneAt: null });
    return assign(t, { dur: Math.min(OT.MAX_TIMER, t.dur + ms) });
  };
  // 돌던 타이머가 끝났는지(끝 시각이 지났는지). 끝났으면 done 으로 바꾼 새 객체.
  OT.timerTick = function (t, now) {
    if (t.state === 'run' && now >= t.end) return assign(t, { state: 'done', doneAt: t.end, end: null });
    return t;
  };

  /* ---------- 스톱워치 ---------- */
  // { state:'idle'|'run'|'stop', start(돌 때 기준 시각), acc(멈추기 전까지 쌓인 시간), laps:[누적 시간] }
  OT.watchTime = function (w, now) { return w.state === 'run' ? w.acc + (now - w.start) : w.acc; };
  OT.watchStart = function (w, now) { return w.state === 'run' ? w : assign(w, { state: 'run', start: now }); };
  OT.watchStop = function (w, now) { return w.state !== 'run' ? w : assign(w, { state: 'stop', acc: w.acc + (now - w.start), start: null }); };
  OT.watchLap = function (w, now) {
    if (w.state !== 'run') return w;
    return assign(w, { laps: w.laps.concat([OT.watchTime(w, now)]) });
  };
  OT.watchReset = function () { return { state: 'idle', start: null, acc: 0, laps: [] }; };
  // 랩 표: [{n, lap, split}] (lap = 이번 구간, split = 처음부터 누적). 가장 빠름·느림은 랩이 둘 이상일 때만.
  OT.lapRows = function (laps) {
    var rows = [], prev = 0;
    for (var i = 0; i < laps.length; i++) { rows.push({ n: i + 1, lap: laps[i] - prev, split: laps[i] }); prev = laps[i]; }
    var fast = -1, slow = -1;
    if (rows.length >= 2) {
      for (var j = 0; j < rows.length; j++) {
        if (fast < 0 || rows[j].lap < rows[fast].lap) fast = j;
        if (slow < 0 || rows[j].lap > rows[slow].lap) slow = j;
      }
      if (rows[fast].lap === rows[slow].lap) { fast = -1; slow = -1; }
    }
    return { rows: rows, fast: fast, slow: slow };
  };
  OT.lapCsv = function (laps, lang) {
    var r = OT.lapRows(laps).rows;
    var head = lang === 'ko' ? '랩,랩 시간,누적 시간,랩(밀리초),누적(밀리초)' : 'Lap,Lap time,Total time,Lap (ms),Total (ms)';
    return head + '\n' + r.map(function (x) { return [x.n, OT.fmtWatch(x.lap), OT.fmtWatch(x.split), Math.round(x.lap), Math.round(x.split)].join(','); }).join('\n') + '\n';
  };

  /* ---------- 알람 ---------- */
  // 'HH:MM' 다음에 오는 그 시각(이 기기의 시간대). 지금과 같은 분이거나 지났으면 내일.
  // 서머타임으로 없는 시각(봄에 2:30)이면 Date가 앞으로 밀어 준 시각(3:30)을 쓰고 shifted:true.
  OT.nextAlarm = function (hh, mm, now) {
    var d = new Date(now), y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
    for (var add = 0; add < 3; add++) {
      var t = new Date(y, mo, da + add, hh, mm, 0, 0);
      if (t.getTime() > now) return { at: t.getTime(), shifted: t.getHours() !== hh || t.getMinutes() !== mm };
    }
    return null;
  };
  // 같은 일을 시간대를 지정해서(기기 시간대 + OT.PATCH. 브라우저 tz 자료가 낡아도 맞게). 없는 시각은 뒤로 밀고 shifted:true.
  OT.nextAlarmZ = function (zone, hh, mm, now) {
    var p = OT.parts(zone, now);
    for (var add = 0; add < 3; add++) {
      var d = new Date(Date.UTC(p.y, p.mo - 1, p.d + add));
      var r = OT.fromLocal(zone, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hh, mm);
      if (r.ts > now) return { at: r.ts, shifted: r.gap };
    }
    return null;
  };
  // 바뀌는 순간을 '바뀌기 직전 벽시계'로: 자정에 바꾸는 곳(산티아고 토 24:00)은 다음 날 0:00으로 읽는다
  OT.changeWall = function (ch) {
    var t = ch.at + ch.before * MIN, d = new Date(t);
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() };
  };
  OT.parseClock = function (s) { // '07:30' / '7:30' / '０７：３０' → {h,m}
    var x = OT.toHalf(s).replace('：', ':');
    var m = /^(\d{1,2}):(\d{2})$/.exec(x);
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return { h: h, m: mi };
  };

  /* ---------- 시간대 ---------- */
  var FMT = {};
  function fmtFor(zone) {
    if (!FMT[zone]) FMT[zone] = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' });
    return FMT[zone];
  }
  OT.validZone = function (zone) { try { fmtFor(zone); return true; } catch (e) { return false; } };
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // 2026년에 정해진 '시계 안 바꾸기'(IANA tz 2026b~2026e). 브라우저의 시간대 자료가 그보다 낡았으면 틀리므로
  // 이 표로 덮는다: from(UTC ms) 뒤로는 늘 offset(분). 새 tz 자료와 값이 같다(tests 'tz' 묶음이 2026e와 대조).
  OT.PATCH = {
    'America/Vancouver': { from: Date.UTC(2026, 2, 8, 10), offset: -420, src: '2026b' },
    'America/Edmonton': { from: Date.UTC(2026, 2, 8, 9), offset: -360, src: '2026c' },
    'America/Inuvik': { from: Date.UTC(2026, 2, 8, 9), offset: -360, src: '2026d' },
    'America/Winnipeg': { from: Date.UTC(2026, 2, 8, 8), offset: -300, src: '2026e' },
    'Africa/Casablanca': { from: Date.UTC(2026, 8, 20, 1), offset: 0, src: '2026c' },
    'Africa/El_Aaiun': { from: Date.UTC(2026, 8, 20, 1), offset: 0, src: '2026c' }
  };
  function patchOf(zone, ts) { var p = OT.PATCH[zone]; return p && ts >= p.from ? p : null; }
  // 이 브라우저의 시간대 자료가 위 표보다 낡았나(표의 시간대 가운데 하나라도 다르면 true)
  OT.staleZones = function () {
    var out = [];
    for (var z in OT.PATCH) { var p = OT.PATCH[z], t = p.from + 300 * OT.DAY; try { if (rawOffset(z, t) !== p.offset) out.push(z); } catch (e) {} }
    return out;
  };
  function rawOffset(zone, ts) {
    var t = Math.floor(ts / SEC) * SEC, p = rawParts(zone, t);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - t) / MIN);
  }
  OT.parts = function (zone, ts) {
    var pt = patchOf(zone, ts);
    return pt ? rawParts('UTC', ts + pt.offset * MIN) : rawParts(zone, ts);
  };
  function rawParts(zone, ts) {
    var o = {}, ps = fmtFor(zone).formatToParts(new Date(ts));
    for (var i = 0; i < ps.length; i++) o[ps[i].type] = ps[i].value;
    var h = +o.hour; if (h === 24) h = 0;
    return { y: +o.year, mo: +o.month, d: +o.day, h: h, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
  }
  // 그 시간대가 UTC보다 몇 분 앞서나(서울 +540, 뉴욕 여름 -240)
  OT.offset = function (zone, ts) {
    var t = Math.floor(ts / SEC) * SEC, p = OT.parts(zone, t);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - t) / MIN);
  };
  // 그 시간대의 벽시계 시각(년·월·일·시·분) → 실제 순간(ts). 없는 시각(봄의 빈 시간)은 뒤로 밀고 gap:true,
  // 두 번 있는 시각(가을)은 앞의 것.
  OT.fromLocal = function (zone, y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi);
    var o1 = OT.offset(zone, guess - OT.offset(zone, guess) * MIN);
    var cands = [guess - o1 * MIN, guess - OT.offset(zone, guess) * MIN, guess - OT.offset(zone, guess - DAY) * MIN, guess - OT.offset(zone, guess + DAY) * MIN];
    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var p = OT.parts(zone, cands[i]);
      if (p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi && (best === null || cands[i] < best)) best = cands[i];
    }
    if (best !== null) return { ts: best, gap: false };
    // 빈 시간: 바뀌기 전 오프셋으로 계산하면 바뀐 뒤 시각으로 밀린다
    var before = OT.offset(zone, guess - DAY);
    return { ts: guess - before * MIN, gap: true };
  };
  // 다음 오프셋 변화(서머타임 시작·끝). from 부터 days 일 안에서 찾는다. 분 단위까지 좁힌다.
  OT.nextChange = function (zone, from, days) {
    days = days || 400;
    var a = from, oa = OT.offset(zone, a), step = 6 * HOUR;
    for (var t = from + step; t <= from + days * DAY; t += step) {
      var ot = OT.offset(zone, t);
      if (ot !== oa) {
        var lo = t - step, hi = t;
        while (hi - lo > MIN) { var mid = Math.floor((lo + hi) / 2 / MIN) * MIN; if (mid <= lo) mid = lo + MIN; if (OT.offset(zone, mid) === oa) lo = mid; else hi = mid; }
        return { at: hi, before: oa, after: ot };
      }
    }
    return null;
  };
  // 두 시간대의 차(분): b가 a보다 몇 분 앞서나
  OT.diff = function (zoneA, zoneB, ts) { return OT.offset(zoneB, ts) - OT.offset(zoneA, ts); };
  OT.diffText = function (min, lang, other) {
    // min: 이 도시가 기준보다 앞선 분. other = 기준 이름(한국어판 '서울', 영어판 'you')
    if (min === 0) return lang === 'ko' ? other + '과 같은 시각' : 'Same time as ' + other;
    var a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
    if (lang === 'ko') {
      var s = (h ? h + '시간' : '') + (m ? (h ? ' ' : '') + m + '분' : '');
      return other + '보다 ' + s + (min > 0 ? ' 빠름' : ' 느림');
    }
    var e = (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : '');
    return e + (min > 0 ? ' ahead of ' : ' behind ') + other;
  };
  OT.utcLabel = function (min) {
    var s = min < 0 ? '−' : '+', a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
    return 'UTC' + s + h + (m ? ':' + p2(m) : '');
  };
  // 회의 시간 띠: 기준 시간대(base)의 그 날(y,mo,d) 0~23시마다, 각 도시의 현지 시·요일·근무 여부.
  // 근무 = 현지 월~금, 그 시각에 시작한 한 시간이 9시~18시 안에 들어감(반 시간 차 도시도 셈). 모두 근무인 시간 목록도 돌려준다.
  OT.meeting = function (base, zones, y, mo, d, work) {
    work = work || { from: 9, to: 18 };
    var hours = [], all = [];
    for (var h = 0; h < 24; h++) {
      var r = OT.fromLocal(base, y, mo, d, h, 0);
      var row = { h: h, ts: r.ts, gap: r.gap, cells: [] }, ok = true;
      for (var i = 0; i < zones.length; i++) {
        var p = OT.parts(zones[i], r.ts);
        var mm = p.h * 60 + p.mi, w = p.wd >= 1 && p.wd <= 5 && mm >= work.from * 60 && mm + 60 <= work.to * 60;
        var dayShift = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(y, mo - 1, d)) / DAY);
        row.cells.push({ h: p.h, mi: p.mi, wd: p.wd, work: w, day: dayShift, night: p.h < 7 || p.h >= 22 });
        if (!w) ok = false;
      }
      row.all = ok && !r.gap;
      if (row.all) all.push(h);
      hours.push(row);
    }
    return { hours: hours, all: all };
  };
  OT.fmtClock = function (h, mi, lang, h12) {
    if (!h12) return p2(h) + ':' + p2(mi);
    var am = h < 12, hh = h % 12 === 0 ? 12 : h % 12;
    return lang === 'ko' ? (am ? '오전 ' : '오후 ') + hh + ':' + p2(mi) : hh + ':' + p2(mi) + (am ? ' AM' : ' PM');
  };

  function assign(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  OT.assign = assign;
  OT.SEC = SEC; OT.MIN = MIN; OT.HOUR = HOUR; OT.DAY = DAY;
  G.OT = OT;
})(typeof window !== 'undefined' ? window : globalThis);
