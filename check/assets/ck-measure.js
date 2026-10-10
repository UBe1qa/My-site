/* 기기 테스트: 재는 로직(중앙값, 폴링 추정, 주사율 추정, 소리 크기, 테스트 음, 스틱 쏠림, 해상도 이름, 장치 오류 나누기).
   화면(DOM)과 Web Audio를 모른다. 브라우저: window.CK / 노드: require('./ck-measure.js')
   밝혀 둘 기준:
   - 소리 크기(dBFS)는 표본 값 1.0을 0 dBFS로 본다. 꽉 찬 사인파의 RMS는 약 -3.01 dBFS로 나온다.
   - 폴링·주사율은 브라우저가 받은 시각으로 잰 '추정'이다. 흔한 값에 가까울 때만 '약 N Hz'로 붙인다.
   시험: tests/run.mjs (기준값은 tests/gen_cases.py = 파이썬 statistics·math, 손으로 따진 예시) */
(function (root) {
  'use strict';
  var CK = root.CK || (root.CK = {});

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function nums(list) { var out = []; for (var i = 0; i < (list ? list.length : 0); i++) if (isNum(list[i])) out.push(list[i]); return out; }

  /* ── 중앙값 ─────────────────────────────────────────── */
  CK.median = function (list) {
    var a = nums(list).sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  /* 가까운 흔한 값. 상대 오차가 tol 안일 때만 돌려준다(아니면 null). */
  CK.nearestCommon = function (value, commons, tol) {
    if (!isNum(value) || value <= 0) return null;
    var best = null, bestErr = Infinity;
    for (var i = 0; i < commons.length; i++) {
      var err = Math.abs(value - commons[i]) / commons[i];
      if (err < bestErr) { bestErr = err; best = commons[i]; }
    }
    return bestErr <= tol ? best : null;
  };

  /* ── 주사율 추정 ────────────────────────────────────────
     requestAnimationFrame 시각의 간격(ms) → 중앙값 → Hz. 탭이 가려져 생긴 긴 간격은 중앙값이라 영향이 작다.
     stable = 중앙값의 ±15% 안에 든 프레임 비율. enough = 표본이 minSamples(기본 30) 이상. */
  CK.REFRESH_COMMON = [30, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240, 300, 360, 480, 540];
  CK.REFRESH_TOL = 0.01;
  CK.refreshEstimate = function (intervals, opts) {
    opts = opts || {};
    var a = nums(intervals).filter(function (v) { return v > 0; });
    var minSamples = opts.minSamples == null ? 30 : opts.minSamples;
    if (!a.length) return { hz: null, medianMs: null, samples: 0, nearest: null, stable: 0, enough: false };
    var med = CK.median(a), hz = 1000 / med, inBand = 0;
    for (var i = 0; i < a.length; i++) if (Math.abs(a[i] - med) <= med * 0.15) inBand++;
    return { hz: hz, medianMs: med, samples: a.length, nearest: CK.nearestCommon(hz, CK.REFRESH_COMMON, CK.REFRESH_TOL),
      stable: inBand / a.length, enough: a.length >= minSamples };
  };
  /* 프레임이 고른가: 중앙값의 ±15% 안에 든 프레임이 REFRESH_STEADY(75%) 이상일 때만 값을 말한다(이 사이트의 기준).
     프레임이 한 장 걸러 빠지면 간격이 두 무리로 갈리고 중앙값은 그 사이 어딘가가 된다. 그런 값은 실제 주사율이 아니다. */
  CK.REFRESH_STEADY = 0.75;
  CK.refreshSteady = function (est) {
    return !!est && est.enough === true && est.stable >= CK.REFRESH_STEADY;
  };
  /* 시각 목록 → 간격 목록 */
  CK.intervals = function (times) {
    var t = nums(times), out = [];
    for (var i = 1; i < t.length; i++) out.push(t[i] - t[i - 1]);
    return out;
  };

  /* ── 폴링(초당 보고 수) 추정 ──────────────────────────────
     마우스가 움직이는 동안 들어온 이벤트 시각(ms, 오름차순).
     - 쉬는 구간: 간격이 idleGapMs(기본 40)보다 길면 끊는다.
     - avgHz: 움직인 구간 전체의 (간격 수 ÷ 시간).
     - peakHz: 이벤트마다 거기서 시작해 windowMs(기본 250) 안에 드는 가장 긴 창을 잡고, 그 창의 (간격 수 ÷ 시간) 가운데 가장 큰 값.
       창은 간격이 minIntervals(기본 10)개 이상이고 길이가 minSpanMs(기본 창의 절반) 이상일 때만 센다(짧은 뭉침에 속지 않게).
       천천히 움직이면 보고가 빠지므로 평균보다 이 값이 기기 설정에 가깝다.
     - enough: 그런 창이 하나라도 있었나. */
  CK.POLL_COMMON = [125, 250, 500, 1000, 2000, 4000, 8000];
  CK.POLL_TOL = 0.1;
  CK.pollingEstimate = function (times, opts) {
    opts = opts || {};
    var idle = opts.idleGapMs == null ? 40 : opts.idleGapMs;
    var win = opts.windowMs == null ? 250 : opts.windowMs;
    var minIv = opts.minIntervals == null ? 10 : opts.minIntervals;
    var minSpan = opts.minSpanMs == null ? win / 2 : opts.minSpanMs;
    var t = nums(times);
    var res = { avgHz: null, peakHz: null, nearest: null, events: t.length, activeMs: 0, enough: false };
    if (t.length < 2) return res;
    var activeMs = 0, activeIv = 0, runStart = 0, peak = 0;
    function closeRun(end) {            // [runStart, end] 한 구간
      var j = runStart;
      for (var i = runStart; i <= end; i++) {
        if (j < i) j = i;
        while (j + 1 <= end && t[j + 1] - t[i] <= win) j++;
        var n = j - i, span = t[j] - t[i];
        if (n >= minIv && span > 0 && span >= minSpan) { var r = n / span * 1000; if (r > peak) peak = r; }
      }
      if (end > runStart) { activeMs += t[end] - t[runStart]; activeIv += end - runStart; }
    }
    for (var i = 1; i < t.length; i++) {
      var d = t[i] - t[i - 1];
      if (d < 0 || d > idle) { closeRun(i - 1); runStart = i; }
    }
    closeRun(t.length - 1);
    res.activeMs = activeMs;
    if (activeMs > 0) res.avgHz = activeIv / activeMs * 1000;
    if (peak > 0) { res.peakHz = peak; res.enough = true; res.nearest = CK.nearestCommon(peak, CK.POLL_COMMON, CK.POLL_TOL); }
    return res;
  };

  /* ── 소리 크기 ──────────────────────────────────────────
     samples: -1..1 사이 표본(Float32Array 등). */
  CK.rms = function (samples) {
    var n = samples ? samples.length : 0, sum = 0;
    if (!n) return 0;
    for (var i = 0; i < n; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / n);
  };
  CK.peak = function (samples) {
    var m = 0;
    for (var i = 0; i < (samples ? samples.length : 0); i++) { var v = Math.abs(samples[i]); if (v > m) m = v; }
    return m;
  };
  /* 진폭(0..1) → dBFS. 0은 -Infinity. */
  CK.dbfs = function (amp) {
    if (!(amp > 0)) return -Infinity;
    return 20 * Math.log10(amp);
  };
  /* dBFS → 막대 길이 비율(0..1). floorDb(기본 -60) 아래는 0, 0 dBFS 위는 1. */
  CK.levelFraction = function (db, floorDb) {
    floorDb = floorDb == null ? -60 : floorDb;
    if (!(db > floorDb)) return 0;
    if (db >= 0) return 1;
    return (db - floorDb) / (0 - floorDb);
  };
  /* 조용할 때 바탕 소음: 짧은 구간마다 잰 RMS(dBFS) 목록의 중앙값. 전부 무음이면 -Infinity. */
  CK.noiseFloorDb = function (blockDbs) {
    var finite = [], silent = 0;
    for (var i = 0; i < (blockDbs ? blockDbs.length : 0); i++) {
      if (blockDbs[i] === -Infinity) silent++; else if (isNum(blockDbs[i])) finite.push(blockDbs[i]);
    }
    var n = silent + finite.length;
    if (!n) return null;
    finite.sort(function (x, y) { return x - y; });
    var m = n >> 1;                       // 무음 구간(-Infinity)은 맨 앞에 선다
    if (n % 2) return m < silent ? -Infinity : finite[m - silent];
    return m - 1 < silent ? -Infinity : (finite[m - 1 - silent] + finite[m - silent]) / 2;
  };
  /* '마이크가 소리를 잡았다'고 말하는 선(dBFS). 이 사이트의 기준이고 화면에 밝힌다 */
  CK.MIC_HEARD_DB = -45;
  /* 잘림(클리핑): 표본의 절댓값이 0.999 이상인 비율 */
  CK.clipRatio = function (samples) {
    var n = samples ? samples.length : 0, c = 0;
    if (!n) return 0;
    for (var i = 0; i < n; i++) if (Math.abs(samples[i]) >= 0.999) c++;
    return c / n;
  };

  /* 한 화면(표본 묶음)이 '잘렸다'고 보는 선: 꼭대기에 닿은 표본이 MIC_CLIP_SHARE(0.5%) 이상. 이 사이트의 기준 */
  CK.MIC_CLIP_SHARE = 0.005;
  CK.isClipped = function (samples) { return CK.clipRatio(samples) >= CK.MIC_CLIP_SHARE; };

  /* ── 테스트 음 만들기 ────────────────────────────────────
     channel: 'left' | 'right' | 'both'. 반대쪽 채널은 전부 0.
     gain은 MAX_GAIN(0.5)을 넘지 못한다. 처음 값은 DEFAULT_GAIN(0.1 = 약 -20 dBFS 꼭대기).
     앞뒤 fadeMs(기본 15) 동안 부드럽게 켜고 꺼서 '딱' 소리가 안 나게 한다. */
  CK.DEFAULT_GAIN = 0.1;
  CK.MAX_GAIN = 0.5;
  CK.clampGain = function (g) {
    g = Number(g);
    if (!isFinite(g) || g < 0) return CK.DEFAULT_GAIN;
    return Math.min(CK.MAX_GAIN, g);
  };
  CK.makeTone = function (o) {
    o = o || {};
    var sr = o.sampleRate || 48000, secs = o.seconds == null ? 1 : o.seconds, f = o.freq || 440;
    var gain = CK.clampGain(o.gain == null ? CK.DEFAULT_GAIN : o.gain);
    var ch = o.channel === 'left' || o.channel === 'right' ? o.channel : 'both';
    var n = Math.max(0, Math.round(sr * secs));
    var fade = Math.min(Math.round(sr * (o.fadeMs == null ? 15 : o.fadeMs) / 1000), n >> 1);
    var L = new Float32Array(n), R = new Float32Array(n), w = 2 * Math.PI * f / sr;
    for (var i = 0; i < n; i++) {
      var env = 1;
      if (fade > 0) {
        if (i < fade) env = i / fade; else if (i >= n - fade) env = (n - 1 - i) / fade;
      }
      var v = gain * env * Math.sin(w * i);
      if (ch !== 'right') L[i] = v;
      if (ch !== 'left') R[i] = v;
    }
    return { left: L, right: R, length: n, sampleRate: sr, gain: gain, channel: ch, freq: f };
  };
  /* 주파수 훑기: t초 시점의 주파수. f0에서 f1까지 duration초 동안 같은 비율로(지수) 올라간다.
     Web Audio의 exponentialRampToValueAtTime과 같은 식: f0 * (f1/f0)^(t/duration) */
  CK.sweepFreq = function (f0, f1, duration, t) {
    if (!(f0 > 0) || !(f1 > 0) || !(duration > 0)) return null;
    if (t <= 0) return f0;
    if (t >= duration) return f1;
    return f0 * Math.pow(f1 / f0, t / duration);
  };

  /* ── 스틱 쏠림 ──────────────────────────────────────────
     손을 뗀 채 모은 [x, y] 표본(-1..1). 평균 위치가 중심에서 얼마나 떨어졌나(0..1, 1을 넘으면 1로).
     wobble = 평균 위치에서 가장 멀리 튄 거리(떨림). */
  CK.DRIFT_SLIGHT = 0.05;
  CK.DRIFT_CLEAR = 0.15;
  CK.stickRest = function (samples) {
    var n = 0, sx = 0, sy = 0, i;
    for (i = 0; i < (samples ? samples.length : 0); i++) {
      var p = samples[i];
      if (p && isNum(p[0]) && isNum(p[1])) { sx += p[0]; sy += p[1]; n++; }
    }
    if (!n) return { x: null, y: null, offset: null, percent: null, wobble: null, samples: 0 };
    var mx = sx / n, my = sy / n, wob = 0;
    for (i = 0; i < samples.length; i++) {
      var q = samples[i];
      if (q && isNum(q[0]) && isNum(q[1])) { var d = Math.hypot(q[0] - mx, q[1] - my); if (d > wob) wob = d; }
    }
    var off = Math.min(1, Math.hypot(mx, my));
    return { x: mx, y: my, offset: off, percent: off * 100, wobble: wob, samples: n };
  };
  /* 판정: 'centered'(5% 미만) | 'slight'(5% 이상 15% 미만) | 'drift'(15% 이상). 기준은 화면에 밝힌다.
     화면에 보여 주는 자리(0.1%)로 맞춘 뒤에 견준다: 평균을 내다 생긴 끝자리 오차 때문에 '5.0%'라고 보여 주면서 '가운데'라고 하지 않게. */
  CK.roundTenth = function (frac) { return Math.round(frac * 1000) / 1000; };
  CK.driftVerdict = function (offset, slight, clear) {
    if (!isNum(offset)) return null;
    slight = slight == null ? CK.DRIFT_SLIGHT : slight;
    clear = clear == null ? CK.DRIFT_CLEAR : clear;
    offset = CK.roundTenth(offset);
    return offset >= clear ? 'drift' : offset >= slight ? 'slight' : 'centered';
  };
  /* 떨림: 가만히 둔 동안 평균 위치에서 가장 멀리 튄 거리(wobble)가 DRIFT_WOBBLE(5%) 이상이면 '떨려요'.
     평균만 보면 좌우로 튀는 스틱이 '가운데'로 나온다(서로 지워진다). 이 사이트의 기준이고 화면에 밝힌다. */
  CK.DRIFT_WOBBLE = 0.05;
  CK.wobbleVerdict = function (wobble, limit) {
    if (!isNum(wobble)) return null;
    return CK.roundTenth(wobble) >= (limit == null ? CK.DRIFT_WOBBLE : limit);
  };
  /* 스틱 하나의 판정을 한 번에: { verdict, jitter, percent, wobblePercent } (표본이 없으면 null) */
  CK.stickVerdict = function (rest) {
    if (!rest || !isNum(rest.offset)) return null;
    return { verdict: CK.driftVerdict(rest.offset), jitter: CK.wobbleVerdict(rest.wobble) === true,
      percent: CK.roundTenth(rest.offset) * 100, wobblePercent: CK.roundTenth(rest.wobble) * 100 };
  };
  /* 축 하나의 가만히 둔 값(브라우저가 배치를 모르는 컨트롤러: 어느 축이 스틱인지 몰라 판정하지 않고 값만 보여 준다) */
  CK.axisRest = function (values) {
    var a = nums(values);
    if (!a.length) return { mean: null, min: null, max: null, range: null, samples: 0 };
    var sum = 0, lo = a[0], hi = a[0];
    for (var i = 0; i < a.length; i++) { sum += a[i]; if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    return { mean: sum / a.length, min: lo, max: hi, range: hi - lo, samples: a.length };
  };

  /* ── 해상도 ─────────────────────────────────────────── */
  CK.megapixels = function (w, h) { return isNum(w) && isNum(h) ? w * h / 1e6 : null; };
  /* 짧은 변 기준 이름(세로로 든 휴대폰 카메라도 같은 이름). 정해진 값이 아니면 null. */
  CK.resolutionName = function (w, h) {
    if (!isNum(w) || !isNum(h)) return null;
    var s = Math.min(w, h), l = Math.max(w, h);
    var table = [[2160, 3840, '4K'], [1440, 2560, '1440p'], [1080, 1920, '1080p'], [720, 1280, '720p'], [480, 640, '480p'], [360, 640, '360p'], [240, 320, '240p']];
    for (var i = 0; i < table.length; i++) if (table[i][0] === s && table[i][1] === l) return table[i][2];
    return null;
  };

  /* ── 장치 오류 나누기 ────────────────────────────────────
     getUserMedia가 던진 오류(name, message)와 상황 → 사람 말로 풀 종류.
     ctx: { secure: 보안 연결(https·localhost)인가, hasApi: navigator.mediaDevices.getUserMedia가 있나 }
     종류: 'insecure' 보안 연결이 아님 / 'unsupported' 이 브라우저가 지원 안 함 / 'denied' 이 사이트 권한이 막힘
          'denied-system' 운영체제 설정이 막음 / 'dismissed' 묻는 창을 그냥 닫음 / 'policy' 문서 정책이 막음
          'denied-maybe' 허용되지 않았는데 막힌 것인지 창을 닫은 것인지 알 수 없음(파이어폭스·사파리는 두 경우에 같은 문장을 준다)
          'no-device' 장치 없음 / 'in-use' 다른 앱이 쓰는 중이거나 장치를 못 엶 / 'constraint' 고른 장치·설정을 못 맞춤
          'aborted' 알 수 없는 이유로 중단 / 'unknown' 그 밖
     retry: 같은 단추를 다시 눌러 볼 만한가. settings: 'browser' | 'os' | null (어디 설정을 봐야 하나) */
  CK.classifyMediaError = function (err, ctx) {
    ctx = ctx || {};
    var secure = ctx.secure !== false, hasApi = ctx.hasApi !== false;
    var name = err && err.name ? String(err.name) : '', msg = err && err.message ? String(err.message) : '';
    function out(kind, retry, settings) { return { kind: kind, retry: retry, settings: settings || null, name: name }; }
    if (!hasApi) return secure ? out('unsupported', false) : out('insecure', false);
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        if (!secure) return out('insecure', false);
        if (/dismiss/i.test(msg)) return out('dismissed', true);
        if (/system/i.test(msg)) return out('denied-system', false, 'os');
        if (/^permission denied( by user)?\.?$/i.test(msg)) return out('denied', false, 'browser');   // 크롬 계열의 문장
        return out('denied-maybe', true, 'browser');
      case 'SecurityError':
        return secure ? out('policy', false) : out('insecure', false);
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return out('no-device', true);
      case 'NotReadableError':
      case 'TrackStartError':
        return out('in-use', true);
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return out('constraint', true);
      case 'AbortError':
        return out('aborted', true);
      case 'TypeError':
        return secure ? out('unknown', true) : out('insecure', false);
      default:
        return out('unknown', true);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CK;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
