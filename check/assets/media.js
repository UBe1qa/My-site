/* 체크벤치: 마이크·카메라·스피커. 권한은 단추를 눌렀을 때만 묻는다.
   소리·영상·녹음·사진은 이 탭 안에서만 다루고 어디에도 보내지 않는다. 끄기를 누르거나, 페이지를 떠나거나, 탭이 가려지면 마이크와 카메라를 끄고 테스트 소리도 멈춘다.
   - 카메라: 카메라가 낼 수 있는 가장 큰 크기를 요청한다(ideal 조건. exact는 쓰지 않는다: 못 맞추면 실패하기 때문). 화면에는 받은 값(트랙 설정)을 그대로 보여 주고,
     브라우저가 알려 주면 카메라가 밝힌 최대 크기(getCapabilities)도 같이 보여 준다. 초당 장 수는 따로 요청하지 않는다(같이 요청하면 브라우저가 장 수를 맞추려고 더 작은 크기를 고를 수 있다).
   - 마이크: 브라우저의 소리 다듬기(울림 제거·소음 억제·자동 음량)를 끄고 요청한다(ideal). 그래도 켜져 있으면(트랙 설정) 화면에 밝힌다. */
(function () {
  'use strict';
  var A = window.CKApp, CK = window.CK;
  if (!A || !CK || !CK.dbfs) return;
  var T = A.T, $ = A.$, $$ = A.$$, fmt = A.fmt, setText = A.setText, d = document, PAGE = A.PAGE;
  function show(sel, on) { $$(sel).forEach(function (el) { el.hidden = !on; }); }
  function able(sel, on) { $$(sel).forEach(function (el) { el.disabled = !on; }); }
  function hasGUM() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function fail(dev, e) {
    var c = CK.classifyMediaError(e, { secure: window.isSecureContext !== false, hasApi: hasGUM() }), m = T.err[c.kind] || T.err.unknown;
    A.verdict(dev, m[0], m[1]);
    A.setDev(dev, 'err', m[0]);
    setText('[data-note="' + dev + '"]', m[1]);
  }
  /* 켜면 늘어나는 칸은 단추를 누른 순간에 자리를 잡는다(권한 창에 답한 뒤에 늘어나면 아래 글이 늦게 밀린다).
     실패해도 접지 않는다. 첫 화면 휴대폰의 카메라 창만 '끄기'를 누를 때 다시 작아진다 */
  function openCam() {
    $$('[data-cam-box]').forEach(function (el) { el.classList.add('is-open'); });
    show('[data-cam-tools], [data-on-note="cam"]', true);
  }
  /* 권한 창을 그냥 두면 브라우저가 끝내 답을 주지 않을 수 있다(MDN getUserMedia). 15초가 지나도 답이 없으면 다시 누르라고 알려 준다 */
  var askTimer = { mic: 0, cam: 0 };
  function asking(dev) {
    clearTimeout(askTimer[dev]);
    askTimer[dev] = setTimeout(function () { if (T.ask_long) A.verdict(dev, T[dev + '_ask'], T.ask_long); }, 15000);
  }
  function answered(dev) { clearTimeout(askTimer[dev]); }
  /* 끄기 단추: 자리를 지키는 것(data-keep)은 눌리지 않게만 하고, 나머지는 숨긴다 */
  function stopBtn(dev, on) {
    $$('[data-act="' + dev + '-stop"]').forEach(function (el) { if (el.hasAttribute('data-keep')) el.disabled = !on; else el.hidden = !on; });
  }
  function fillDevices(sel, kind, current, fallback) {
    if (!sel || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (list) {
      var items = list.filter(function (x) { return x.kind === kind; });
      if (!items.length) return;
      sel.textContent = '';
      items.forEach(function (x, i) {
        var o = d.createElement('option');
        o.value = x.deviceId; o.textContent = x.label || fallback + ' ' + (i + 1);
        if (x.deviceId === current) o.selected = true;
        sel.appendChild(o);
      });
      sel.disabled = items.length < 2;
    }, function () { /* 목록을 못 받아도 테스트는 된다 */ });
  }
  var mic = { stream: null, ctx: null, raf: 0, heard: false, loud: false, rippled: false, rec: null, url: null, noise: null };
  var cam = { stream: null, mirror: false, photo: null };
  var ctx = null;      // 스피커 테스트 소리용. 마이크는 켤 때마다 따로 만들고(mic.ctx) 끄면 닫는다
  function newAudio() { return new (window.AudioContext || window.webkitAudioContext)(); }
  function audio() {
    if (!ctx) ctx = newAudio();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  /* 조건을 붙인 요청이 조건 탓에 실패하면(오래된 브라우저) 조건 없이 한 번 더 요청한다 */
  function request(kind, want, deviceId) {
    var plain = {}, rich = {}, k;
    if (deviceId) plain.deviceId = { exact: deviceId };
    for (k in plain) rich[k] = plain[k];
    for (k in want) rich[k] = want[k];
    var a = {}, b = {};
    a[kind] = rich; b[kind] = deviceId ? plain : true;
    return navigator.mediaDevices.getUserMedia(a).catch(function (e) {
      if (e && (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError' || e.name === 'TypeError')) return navigator.mediaDevices.getUserMedia(b);
      throw e;
    });
  }
  var MIC_WANT = { echoCancellation: { ideal: false }, noiseSuppression: { ideal: false }, autoGainControl: { ideal: false } };
  var CAM_WANT = { width: { ideal: 4096 }, height: { ideal: 2160 } };

  /* ════════ 마이크 ════════ */
  function micStop(quiet) {
    if (!mic.stream) return;
    mic.stream.getTracks().forEach(function (t) { t.stop(); });
    mic.stream = null;
    cancelAnimationFrame(mic.raf);
    if (mic.ctx) { try { mic.ctx.close(); } catch (e) { /* 이미 닫힘 */ } mic.ctx = null; }
    if (mic.rec && mic.rec.state !== 'inactive') mic.rec.stop();
    $$('[data-mic-meter] i').forEach(function (el) { el.style.transform = 'scaleX(0)'; });
    show('[data-act="mic"]', true); show('[data-act="mic-stop"]', false); show('[data-on-note="mic"]', false);
    able('[data-act="mic-rec"], [data-act="mic-noise"], [data-mic-device]', false);
    setText('[data-note="mic"]', T.off_note || T.asks);   // 허락을 받은 뒤라 "먼저 물어봐요"는 더는 맞지 않는다
    if (!quiet) A.verdict('mic', T.mic_stopped, T.mic_stopped_s);
    setText('[data-state="mic"]', T.mic_stopped);
  }
  function micStart(deviceId) {
    if (!hasGUM()) return fail('mic', null);
    A.verdict('mic', T.mic_ask, T.mic_ask_s);
    setText('[data-state="mic"]', T.ask_home || T.mic_ask);   // 첫 화면 칸 머리는 좁다: 한 줄에 드는 짧은 말
    show('[data-mic-more], [data-on-note="mic"]', true);
    asking('mic');
    request('audio', MIC_WANT, deviceId).then(function (stream) {
      answered('mic');
      micStop(true);
      mic.stream = stream; mic.heard = false; mic.loud = false;
      var a = mic.ctx = newAudio(), src = a.createMediaStreamSource(stream), an = a.createAnalyser(), track = stream.getAudioTracks()[0], set = track.getSettings ? track.getSettings() : {};
      if (a.state === 'suspended') a.resume();
      an.fftSize = 2048; src.connect(an);
      var buf = new Float32Array(an.fftSize), t0 = performance.now(), loud = 0, peak = -Infinity, frame = 0, warned = false, clips = [];
      /* 브라우저가 소리를 다듬고 있나: 끄고 요청했지만 실제 값은 트랙 설정에서 읽는다(echoCancellation은 글자 값일 수도 있다) */
      var shaping = ['echoCancellation', 'noiseSuppression', 'autoGainControl'].filter(function (k) { return k in set; });
      var shaped = shaping.some(function (k) { return set[k] !== false; });
      /* 하나라도 켜져 있으면 '다듬고 있어요', 셋 다 꺼졌다고 알려 줄 때만 '껐어요', 일부만 알려 주면(또는 안 알려 주면) '알려 주지 않아요' */
      setText('[data-mic-proc]', shaped ? T.mic_proc_on : shaping.length === 3 ? T.mic_proc_off : T.mic_proc_unknown);
      show('[data-act="mic"]', false); show('[data-act="mic-stop"], [data-on-note="mic"], [data-mic-more]', true);
      able('[data-act="mic-rec"], [data-act="mic-noise"]', true);
      setText('[data-note="mic"]', T.stays_on);
      setText('[data-mic-info]', fmt(T.mic_info, set.sampleRate || a.sampleRate, set.channelCount === 2 ? T.mic_ch2 : T.mic_ch1));
      A.verdict('mic', T.mic_on, T.mic_on_s);
      A.setDev('mic', 'on', T.mic_home_on);
      fillDevices($('[data-mic-device]'), 'audioinput', set.deviceId, T.mic_default);
      track.addEventListener('ended', function () { micStop(); });
      (function loop() {
        mic.raf = requestAnimationFrame(loop);
        if (window.__freeze) return;
        an.getFloatTimeDomainData(buf);
        var db = CK.dbfs(CK.rms(buf)), f = CK.levelFraction(db);
        $$('[data-mic-meter] i').forEach(function (el) { el.style.transform = 'scaleX(' + f.toFixed(3) + ')'; });
        if (db > peak) peak = db;
        if (mic.noise) mic.noise.push(db);
        if (frame++ % 6 === 0) {
          setText('[data-mic-db]', db < -90 ? '−∞' : (db < 0 ? '−' : '') + Math.abs(db).toFixed(0));
          setText('[data-mic-peak]', peak < -90 ? '−∞' : (peak < 0 ? '−' : '') + Math.abs(peak).toFixed(0));
        }
        if (db >= CK.MIC_HEARD_DB) loud++;        // 짧은 소리(손뼉)도 잡았다고 본다: 선을 넘은 화면이 세 번 쌓이면
        if (!mic.heard && loud >= 3) {
          mic.heard = true;
          A.verdict('mic', T.mic_heard, T.mic_heard_s);
          setText('[data-state="mic"]', T.mic_home_heard);
          if (!mic.rippled) { mic.rippled = true; A.ripple('mic'); }      // 연출 3: 들려요 물결(한 방문에 한 번)
        }
        if (!mic.heard && !warned && performance.now() - t0 > 6000) { warned = true; A.verdict('mic', T.mic_quiet, T.mic_quiet_s); }
        /* 너무 큼: 꼭대기에 닿아 잘린 화면이 최근 3초 안에 세 번 넘게 있으면 말로 알린다. 소리를 줄이면 다시 '소리를 잡아요'로 돌아간다 */
        var now = performance.now();
        if (CK.isClipped(buf)) clips.push(now);
        while (clips.length && now - clips[0] > 3000) clips.shift();
        var isLoud = clips.length >= 3;
        if (mic.heard && isLoud !== mic.loud) {
          mic.loud = isLoud;
          A.verdict('mic', isLoud ? T.mic_loud : T.mic_heard, isLoud ? T.mic_loud_s : T.mic_heard_s);
          A.setDev('mic', isLoud ? 'warn' : 'on', isLoud ? T.mic_home_loud : T.mic_home_heard);
        }
        if (window.__freezeAt && mic.heard && f > window.__freezeAt) window.__freeze = true;   // 화면 확인용: 소리를 잡고 막대가 올라온 순간에 멈춤
      })();
    }).catch(function (e) { answered('mic'); fail('mic', e); });
  }
  function micRecord() {
    if (!mic.stream) return;
    if (!window.MediaRecorder) return setText('[data-mic-rec-state]', T.mic_rec_fail);
    var chunks = [], rec, left = 5, timer;
    try { rec = new MediaRecorder(mic.stream); } catch (e) { return setText('[data-mic-rec-state]', T.mic_rec_fail); }
    mic.rec = rec;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      clearInterval(timer);
      able('[data-act="mic-rec"]', !!mic.stream);
      if (!chunks.length) return setText('[data-mic-rec-state]', T.mic_rec_fail);
      if (mic.url) URL.revokeObjectURL(mic.url);
      mic.url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || chunks[0].type }));
      $$('[data-mic-audio]').forEach(function (el) { el.src = mic.url; el.hidden = false; });
      show('[data-act="mic-del"]', true);
      var secs = 5 - Math.max(0, left);
      setText('[data-mic-rec-state]', secs === 1 ? T.mic_rec_done1 : fmt(T.mic_rec_done, secs));
    };
    able('[data-act="mic-rec"]', false);
    setText('[data-mic-rec-state]', fmt(T.mic_rec, left));
    rec.start();
    timer = setInterval(function () {
      left--;
      if (left <= 0) { if (rec.state !== 'inactive') rec.stop(); return; }
      setText('[data-mic-rec-state]', fmt(T.mic_rec, left));
    }, 1000);
  }
  function micDelete() {
    if (mic.url) URL.revokeObjectURL(mic.url);
    mic.url = null;
    $$('[data-mic-audio]').forEach(function (el) { el.pause(); el.removeAttribute('src'); el.load(); el.hidden = true; });
    show('[data-act="mic-del"]', false);
    setText('[data-mic-rec-state]', ' ');
  }
  function micNoise() {
    if (!mic.stream || mic.noise) return;
    mic.noise = [];
    setText('[data-mic-noise]', T.mic_noise_run);
    setTimeout(function () {
      var v = CK.noiseFloorDb(mic.noise || []);
      mic.noise = null;
      setText('[data-mic-noise]', fmt(T.mic_noise, v == null ? '·' : v === -Infinity ? '−∞' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(0)));
    }, 3000);
  }

  /* ════════ 카메라 ════════ */
  function camStop(quiet) {
    if (!cam.stream) return;
    cam.stream.getTracks().forEach(function (t) { t.stop(); });
    cam.stream = null;
    $$('[data-cam-video], [data-cam-big]').forEach(function (v) { v.srcObject = null; if (v.hasAttribute('data-cam-video')) v.hidden = true; });
    $$('[data-cam-dialog]').forEach(function (dlg) { if (dlg.open) dlg.close(); });
    show('[data-act="cam"]', true); show('[data-act="cam-large"], [data-on-note="cam"]', false); stopBtn('cam', false);
    able('[data-act="cam-mirror"], [data-act="cam-photo"], [data-cam-device]', false);
    if (!quiet) $$('[data-cam-box]').forEach(function (el) { el.classList.remove('is-open'); });
    setText('[data-note="cam"]', T.off_note || T.asks);   // 허락을 받은 뒤라 "먼저 물어봐요"는 더는 맞지 않는다
    if (!quiet) A.verdict('cam', T.cam_stopped, T.cam_stopped_s);
    setText('[data-state="cam"]', T.cam_stopped);
  }
  function camStart(deviceId) {
    if (!hasGUM()) return fail('cam', null);
    A.verdict('cam', T.cam_ask, T.cam_ask_s);
    setText('[data-state="cam"]', T.ask_home || T.cam_ask);
    openCam();
    asking('cam');
    request('video', CAM_WANT, deviceId).then(function (stream) {
      answered('cam');
      camStop(true);
      cam.stream = stream;
      var track = stream.getVideoTracks()[0], set = track.getSettings ? track.getSettings() : {}, v = $('[data-cam-video]');
      /* 카메라가 밝힌 최대 크기(되는 브라우저에서만). 가로·세로 최댓값이 숫자로 올 때만 쓴다 */
      var caps = null, top = null;
      try { caps = track.getCapabilities ? track.getCapabilities() : null; } catch (e) { caps = null; }
      if (caps && caps.width && caps.height && caps.width.max > 0 && caps.height.max > 0) top = { w: caps.width.max, h: caps.height.max, fps: caps.frameRate && caps.frameRate.max > 0 ? Math.round(caps.frameRate.max) : 0 };
      v.srcObject = stream; v.hidden = false;
      var p = v.play(); if (p && p.catch) p.catch(function () { /* 자동 재생이 막혀도 미리보기 틀은 남는다 */ });
      show('[data-act="cam"]', false); show('[data-act="cam-large"], [data-on-note="cam"], [data-cam-tools]', true); stopBtn('cam', true);
      able('[data-act="cam-mirror"], [data-act="cam-photo"]', true);
      setText('[data-note="cam"]', T.stays_on);
      A.setDev('cam', 'on', T.cam_home_on);
      fillDevices($('[data-cam-device]'), 'videoinput', set.deviceId, T.cam_default);
      track.addEventListener('ended', function () { camStop(); });
      function report(fps) {
        var w = v.videoWidth, h = v.videoHeight, name = CK.resolutionName(w, h);
        A.verdict('cam', T.cam_on, fps ? fmt(T.cam_on_s, w, h, name ? ' (' + name + ')' : '', Math.round(fps)) : fmt(T.cam_on_s0, w, h, name ? ' (' + name + ')' : ''));
        setText('[data-cam-set]', (set.width || w) + ' × ' + (set.height || h) + (set.frameRate ? ', ' + Math.round(set.frameRate) + ' fps' : ''));
        setText('[data-cam-meas]', w + ' × ' + h + (fps ? ', ' + fps.toFixed(1) + ' fps' : ''));
        /* 받은 크기가 무엇인지 밝힌다: 브라우저가 지금 준 크기이고, 가장 큰 크기를 요청했다는 것. 카메라가 밝힌 최대 크기가 있으면 같이 */
        var capName = top ? CK.resolutionName(top.w, top.h) : null;
        var capText = top ? fmt(top.fps ? T.cam_cap : T.cam_cap0, top.w, top.h, capName ? ' (' + capName + ')' : '', top.fps) : '';
        var less = top && Math.max(w, h) * Math.min(w, h) < top.w * top.h;      // 세로로 든 휴대폰은 가로·세로가 바뀌어 오므로 넓이로 견준다
        setText('[data-cam-got]', T.cam_got + (top ? ' ' + capText + (less ? ' ' + T.cam_less : '') : ' ' + T.cam_cap_none));
        setText('[data-cam-cap]', top ? top.w + ' × ' + top.h + (top.fps ? ', ' + top.fps + ' fps' : '') : T.cam_cap_none);
      }
      v.addEventListener('loadedmetadata', function once() {
        v.removeEventListener('loadedmetadata', once);
        report(0);
        if (!v.requestVideoFrameCallback) return;
        var times = [];
        (function tick(now) {             // 실제로 도착한 프레임 40장의 간격으로 초당 장 수를 잰다
          if (now) times.push(now);
          if (times.length < 41 && cam.stream === stream) return v.requestVideoFrameCallback(tick);
          var r = CK.refreshEstimate(CK.intervals(times), { minSamples: 20 });
          if (r.enough && cam.stream === stream) report(r.hz);
        })(0);
      });
    }).catch(function (e) { answered('cam'); fail('cam', e); });
  }
  function camPhoto() {
    var v = $('[data-cam-video]');
    if (!cam.stream || !v.videoWidth) return;
    var c = d.createElement('canvas'), g;
    c.width = v.videoWidth; c.height = v.videoHeight; g = c.getContext('2d');
    if (cam.mirror) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(v, 0, 0);
    c.toBlob(function (blob) {
      if (!blob) return;
      if (cam.photo) URL.revokeObjectURL(cam.photo);
      cam.photo = URL.createObjectURL(blob);
      $$('[data-cam-img]').forEach(function (img) { img.src = cam.photo; img.width = c.width; img.height = c.height; });
      $$('[data-cam-save]').forEach(function (a) { a.href = cam.photo; });
      show('[data-cam-shot]', true);
    }, 'image/png');
  }

  /* ════════ 스피커 ════════ */
  var spk = { node: null, timer: 0, btn: null };
  function vol() { var s = $('[data-spk-vol]'); return CK.clampGain(s ? parseFloat(s.value) : CK.DEFAULT_GAIN); }
  function spkStop() {
    var was = !!spk.node;
    if (spk.node) { try { spk.node.onended = null; spk.node.stop(); } catch (e) { /* 이미 끝남 */ } spk.node = null; }
    clearInterval(spk.timer);
    if (spk.btn) spk.btn.classList.remove('is-play');
    show('[data-act="spk-stop"]', false);
    return was;
  }
  function spkRest() { if (ctx && !spk.node && ctx.state === 'running' && ctx.suspend) ctx.suspend(); }   // 소리가 없을 때는 소리 장치를 붙잡고 있지 않는다
  function spkTone(ch, btn) {
    var a;
    try { a = audio(); } catch (e) { return A.verdict('spk', T.spk_fail, ''); }
    spkStop();
    var t = CK.makeTone({ sampleRate: a.sampleRate, seconds: 1.2, freq: 440, channel: ch, gain: vol() });
    var b = a.createBuffer(2, t.length, a.sampleRate), s = a.createBufferSource();
    b.getChannelData(0).set(t.left); b.getChannelData(1).set(t.right);
    s.buffer = b; s.connect(a.destination);
    spk.node = s; spk.btn = btn;
    btn.classList.add('is-play');
    A.verdict('spk', T['spk_' + ch], T.spk_idle_s);
    setText('[data-state="spk"]', T['spk_' + ch]);
    s.onended = function () {
      spk.node = null; btn.classList.remove('is-play');
      A.verdict('spk', T['spk_done_' + ch], T.spk_done_s);
      A.setDev('spk', 'on', T.spk_home_done);
      spkRest();
    };
    s.start();
  }
  function spkSweep(btn) {
    var a;
    try { a = audio(); } catch (e) { return A.verdict('spk', T.spk_fail, ''); }
    spkStop();
    var F0 = 40, F1 = 16000, DUR = 8, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime, v = vol();
    o.type = 'sine';
    o.frequency.setValueAtTime(F0, t0); o.frequency.exponentialRampToValueAtTime(F1, t0 + DUR);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.03); g.gain.setValueAtTime(v, t0 + DUR - 0.03); g.gain.linearRampToValueAtTime(0, t0 + DUR);
    o.connect(g); g.connect(a.destination);
    spk.node = o; spk.btn = btn;
    btn.classList.add('is-play'); show('[data-act="spk-stop"]', true);
    function say() { A.verdict('spk', fmt(T.spk_sweep, Math.round(CK.sweepFreq(F0, F1, DUR, a.currentTime - t0)).toLocaleString('en-US')), T.spk_idle_s); }
    say(); spk.timer = setInterval(say, 100);
    o.onended = function () {
      spkStop();
      A.verdict('spk', T.spk_done_sweep, T.spk_done_s);
      A.setDev('spk', 'on', T.spk_home_done);
      spkRest();
    };
    o.start(t0); o.stop(t0 + DUR);
  }

  /* ── 단추 ── */
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    switch (b.getAttribute('data-act')) {
      case 'mic': micStart(); break;
      case 'mic-stop': micStop(); break;
      case 'mic-rec': micRecord(); break;
      case 'mic-del': micDelete(); break;
      case 'mic-noise': micNoise(); break;
      case 'cam': camStart(); break;
      case 'cam-stop': camStop(); break;
      case 'cam-mirror':
        cam.mirror = !cam.mirror; b.setAttribute('aria-pressed', String(cam.mirror));
        $$('[data-cam-box]').forEach(function (el) { el.classList.toggle('is-mirror', cam.mirror); });
        break;
      case 'cam-photo': camPhoto(); break;
      case 'cam-large':
        $$('[data-cam-dialog]').forEach(function (dlg) {
          var big = $('[data-cam-big]', dlg);
          big.srcObject = cam.stream; var p = big.play(); if (p && p.catch) p.catch(function () {});
          if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
        });
        break;
      case 'cam-large-close': $$('[data-cam-dialog]').forEach(function (dlg) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }); break;
      case 'spk-left': spkTone('left', b); break;
      case 'spk-right': spkTone('right', b); break;
      case 'spk-both': spkTone('both', b); break;
      case 'spk-sweep': spkSweep(b); break;
      case 'spk-stop': spkStop(); spkRest(); A.verdict('spk', T.spk_idle, T.spk_idle_s); break;
    }
  });
  $$('[data-mic-device]').forEach(function (s) { s.addEventListener('change', function () { micStart(s.value); }); });
  $$('[data-cam-device]').forEach(function (s) { s.addEventListener('change', function () { camStart(s.value); }); });
  /* 페이지를 떠나거나 탭이 가려지면 마이크·카메라를 끄고, 나고 있던 테스트 소리도 멈춘다 */
  function away() {
    micStop(); camStop();
    if (spkStop()) { A.verdict('spk', T.spk_idle, T.spk_idle_s); A.$$('[data-state="spk"]').forEach(function (el) { if (PAGE === 'home') el.textContent = T.spk_home_stopped; }); }
    spkRest();
  }
  window.addEventListener('pagehide', away);
  d.addEventListener('visibilitychange', function () { if (d.hidden) away(); });
})();
