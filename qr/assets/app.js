/* 오래QR — 만들기 화면(만들기·와이파이·명함 페이지). 문구는 #qr-cfg JSON 에서 읽는다.
   흐름: 칸을 바꾸면 → 그 자리에서 내용 만들기(QRP) → QR 부호(QR) → 장면(QRR.scene) → 미리보기 SVG 를 바로 바꾼다(결과를 늦추지 않음)
         → 멈춘 뒤 0.5초에 찍힘 확인(QRV.check: 저장할 그림과 같은 장면을 다시 읽음) → 도장·판정 문구.
   저장: 같은 장면에서 PNG·JPG(캔버스)·SVG·PDF·EPS(qr-export.js). 설정은 주소(?…)에 담지 않는다(와이파이 비밀번호가 주소에 남지 않게).
   localStorage: staycode.styles(내 꾸밈) · staycode.recent(최근 QR 8개, 내용 앞 40자, 와이파이 비밀번호 없음). */
(function () {
  'use strict';
  var D = document, H = D.documentElement;
  var CFG = JSON.parse(D.getElementById('qr-cfg').textContent), MSG = CFG.M, LANG = CFG.lang;
  var $ = function (id) { return D.getElementById(id); };
  var qa = function (sel, r) { return Array.prototype.slice.call((r || D).querySelectorAll(sel)); };
  var fmt = function (s, p) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return p && p[k] != null ? p[k] : ''; }); };
  var escH = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  QRV.setWorker(CFG.worker);

  /* ---------- 상태 ---------- */
  var S = {
    type: CFG.start,
    fields: {},
    style: JSON.parse(JSON.stringify(QRPRE.BASE)),
    ecl: 'M', eclAuto: false, margin: 4,
    logo: null,   // { src(dataURL), w, h, size(0~1), clear, plate }
    preset: null
  };
  QRP.TYPES.forEach(function (t) { S.fields[t] = QRP.blank(t); });
  var lastV = null, cur = { r: null, qr: null, scene: null, key: '' }, imgs = {}, glyphs = null, glyphChunks = {}, verifyT = 0, lastVerdict = '', verifySeq = 0;

  /* ---------- 글자 모양(틀 문구) ---------- */
  function loadGlyphs() {
    if (glyphs) return Promise.resolve(glyphs);
    return fetch(CFG.glyphs).then(function (r) { return r.json(); }).then(function (g) { glyphs = g; return g; }).catch(function () { return null; });
  }
  /* 직접 쓴 문구에 base 에 없는 글자가 있으면 그 글자가 든 조각(한글 ko-n, 라틴 lat, 기호 sym)만 받는다 */
  function needChunks(text) {
    return loadGlyphs().then(function () {
      if (!glyphs) return;
      var need = {};
      Array.from(text).forEach(function (ch) {
        if (glyphs.g[ch]) return;
        var c = ch.codePointAt(0);
        glyphs.chunks.forEach(function (rg) { if (c >= rg[0] && c <= rg[1] && !glyphChunks[rg[2]]) need[rg[2]] = 1; });
      });
      var ks = Object.keys(need);
      return Promise.all(ks.map(function (name) {
        glyphChunks[name] = 'loading';
        return fetch(CFG.glyphs.replace('base.json', name + '.json')).then(function (r) { return r.json(); }).then(function (g) { for (var k in g) glyphs.g[k] = g[k]; glyphChunks[name] = 1; }).catch(function () { glyphChunks[name] = 0; });
      }));
    });
  }
  /* 틀 문구에서 그릴 수 없는 글자(어느 조각에도 없는 글자)를 입력하는 순간 칸 바로 아래에 알린다 */
  function missingChars(text) {
    if (!glyphs) return [];
    var miss = [];
    Array.from(text).forEach(function (ch) {
      if (ch === ' ' || ch === '\u3000' || glyphs.g[ch]) return;
      var c = ch.codePointAt(0), inChunk = glyphs.chunks.some(function (rg) { return c >= rg[0] && c <= rg[1] && (rg[2].indexOf('ko-') === 0 || (glyphs.sets[rg[2]] || []).indexOf(ch) >= 0); });
      if (!inChunk && miss.indexOf(ch) < 0) miss.push(ch);
    });
    return miss;
  }
  function frameTextNote() {
    var el = $('ft-msg'); if (!el) return;
    var miss = missingChars(S.style.frame !== 'none' ? (S.style.frameText || '') : '');
    el.textContent = miss.length ? fmt(MSG.v.text_missing, { c: miss.join(' ') }) : '';
    el.className = 'msg' + (miss.length ? ' warn' : '');
  }

  /* ---------- 칸 읽기·쓰기 ---------- */
  function fs(t) { return D.querySelector('.fs[data-t="' + t + '"]'); }
  function readFields(t) {
    var f = S.fields[t], box = fs(t);
    if (t === 'event') {   // 넣은 시작·끝 시각의 이 기기 시간대(서머타임 포함)
      var sv = ($('f-event-start') || {}).value;
      f.tzOffset = new Date(sv && sv.length > 10 ? sv : Date.now()).getTimezoneOffset();
    }
    qa('[data-f]', box).forEach(function (el) {
      var k = el.getAttribute('data-f');
      if (k === 'phones') return;
      f[k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    if (t === 'vcard') f.phones = qa('.ph-row', box).map(function (row) { return { type: row.querySelector('.ph-type').value, num: row.querySelector('.ph-num').value }; });
    return f;
  }
  function writeFields(t) {
    var f = S.fields[t], box = fs(t);
    qa('[data-f]', box).forEach(function (el) {
      var k = el.getAttribute('data-f');
      if (k === 'phones' || f[k] == null) return;
      if (el.type === 'checkbox') el.checked = !!f[k]; else el.value = f[k];
    });
  }
  function allEmpty(t) {
    var f = S.fields[t], skip = { auth: 1, mode: 1, utm: 1, utm_source: 1, utm_medium: 1, utm_campaign: 1, allday: 1, hidden: 1 };
    return Object.keys(f).every(function (k) {
      if (skip[k]) return true;
      if (k === 'phones') return f.phones.every(function (p) { return !String(p.num).trim(); });
      return !String(f[k] == null ? '' : f[k]).trim();
    });
  }

  /* ---------- 그리기 ---------- */
  function styleForScene() {
    var st = JSON.parse(JSON.stringify(S.style));
    st.margin = S.margin;
    if (!st.eyeColor) { st.eyeOut = ''; st.eyeIn = ''; }
    if (S.logo) st.logo = { src: S.logo.src, w: S.logo.w, h: S.logo.h, size: S.logo.size, clear: S.logo.clear, plate: S.logo.plate };
    return st;
  }
  var lastNote = {};
  function showMsgs(t, list, kind) {
    var box = fs(t);
    qa('.msg', box).forEach(function (m) { if (!lastNote[m.id] || lastNote[m.id] === kind) { m.textContent = ''; m.className = 'msg'; } });
    qa('[aria-invalid]', box).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    (list || []).forEach(function (e) {
      var m = $('m-' + t + '-' + e.f);
      if (!m) return;
      var txt = fmt((kind === 'err' ? MSG.err : MSG.warn)[e.c] || e.c, e.p);
      m.textContent = txt; m.className = 'msg ' + kind; lastNote[m.id] = kind;
      var inp = $('f-' + t + '-' + e.f) || (e.f.indexOf('phone') === 0 && box.querySelectorAll('.ph-num')[+e.f.slice(5)]);
      if (inp && kind === 'err') inp.setAttribute('aria-invalid', 'true');
    });
  }
  function notes(list) {
    var box = $('notes');
    box.innerHTML = list.map(function (n) { return '<p class="note ' + (n.k || '') + '">' + n.h + '</p>'; }).join('');
  }

  var rendering = false;
  function render(why) {
    var t0 = performance.now();
    var t = S.type, f = readFields(t);
    var empty = allEmpty(t), r = empty ? null : QRP.build(t, f);
    var touched = !empty;
    showMsgs(t, r && !r.ok ? r.err.filter(function (e) { return e.c !== 'empty' || touched; }) : [], 'err');
    if (r && r.ok) showMsgs(t, r.warn, 'warn');
    var nt = [];
    var qr = null;
    if (r && r.ok) {
      try { qr = QR.encode(r.data, { ecl: S.ecl, boost: false }); }
      catch (e) {
        if (e.code === 'TOO_LONG') nt.push({ k: 'err', h: escH(fmt(MSG.err.too_long, { b: e.bytes, e: S.ecl, m: e.max })) });
        qr = null;
      }
    }
    var st = styleForScene();
    if (qr) {
      var sc = QRR.scene(qr, st, glyphs);
      if (sc.needsGlyphs) loadGlyphs().then(function () { render('glyph'); });
      cur = { r: r, qr: qr, scene: sc, st: st, key: JSON.stringify([r.data, st, S.ecl]) };
      $('sticker').innerHTML = QRR.toSVG(sc, { bare: true, cut: 1.4, cls: 'qr-svg', aria: r.target, idp: 'q' });
      $('sticker').classList.remove('is-ex', 'is-bad');
      $('ex-tag').hidden = true; $('ex-note').hidden = true;
      $('info').textContent = fmt(MSG.info, { v: qr.version, n: qr.size, e: qr.ecl, b: r.bytes });
      if (qr.version >= 10) nt.push({ k: 'warn', h: escH(fmt(MSG.dense, { v: qr.version, n: qr.size })) });
      var go = t === 'url' || t === 'whatsapp' ? MSG.go_url : t === 'wifi' ? MSG.go_wifi : MSG.go_other;
      $('go').innerHTML = fmt(go, { t: escH(r.target) }) + ' ' + escH(MSG.go_tail);
      setSave(true);
      scheduleVerify();
    } else {
      cur = { r: null, qr: null, scene: null, key: '' };
      $('info').textContent = '';
      $('go').textContent = '';
      if (empty) showExample(); else { $('sticker').classList.add('is-bad'); }
      setStamp(empty ? 'none' : 'fail', empty);
      $('v-main').textContent = ''; $('v-list').innerHTML = '';
      setSave(false);
    }
    notes(nt);
    sheetCount();
    var dt = performance.now() - t0;
    window.__lastRenderMs = dt;
    if (why === 'type' && FX.note(dt)) toast(MSG.fx_lowered);
    return dt;
  }
  function showExample() {
    $('sticker').classList.add('is-ex'); $('sticker').classList.remove('is-bad');
    $('ex-tag').hidden = false; $('ex-note').hidden = false;
    // 예시는 지금 고른 꾸밈으로 다시 그린다(꾸밈을 먼저 골라 봐도 보이게)
    try {
      var ex = { url: 'https://example.com/menu', wifi: 'WIFI:T:WPA;S:Cafe Guest;P:hello2026;;' }[S.type] || 'https://example.com/menu';
      var q = QRR.fake(QR.encode(ex, { ecl: S.ecl, boost: false }));
      $('sticker').innerHTML = QRR.toSVG(QRR.scene(q, styleForScene(), glyphs), { bare: true, cut: 1.4, cls: 'qr-svg', aria: CFG.U.example, idp: 'x' });
    } catch (e) { /* 예시는 그대로 */ }
  }
  function setSave(on) {
    qa('#save-box button, #savebar button').forEach(function (b) { b.disabled = !on; });
    $('savebar').classList.toggle('off', !on);
  }

  /* ---------- 찍힘 확인 ---------- */
  function setStamp(s, quiet) {
    var el = $('stamp');
    el.setAttribute('data-s', s);
    $('stamp-t').textContent = quiet ? '' : (MSG.stamp[s === 'pass' ? 'pass_' : s] || '');
  }
  var pendingKey = '';
  function scheduleVerify() {
    var key = cur.key;
    if (lastVerdict === key || pendingKey === key) return;   // 같은 그림이면 판정을 그대로 둔다(기다리는 확인도 지우지 않는다)
    clearTimeout(verifyT);
    pendingKey = key;
    setStamp('wait');
    $('v-main').textContent = MSG.v.wait;
    $('v-list').innerHTML = '';
    verifyT = setTimeout(function () { pendingKey = ''; runVerify(key); }, 500);
  }
  function runVerify(key) {
    if (!cur.scene || cur.key !== key) return;
    var my = ++verifySeq, sc = cur.scene;
    var go = function () {
      QRV.check(sc, cur.r.data, cur.st, imgs).then(function (v) {
        if (my !== verifySeq || cur.key !== key) return;
        lastVerdict = key; lastV = v;
        var prev = $('stamp').getAttribute('data-s');
        setStamp(v.s);
        var main = { none: MSG.v.none, mismatch: MSG.v.mismatch, fail: MSG.v.fail, rule_fail: MSG.v.rule_fail, read_warn: MSG.v.read_warn, unsure: MSG.v.unsure, pass_: MSG.v.pass_ }[v.main] || MSG.v.fail;
        $('v-main').textContent = main;
        $('v-list').innerHTML = v.list.map(function (w) { return '<li class="' + (w.info ? 'info' : 'w') + '">' + escH(fmt(MSG.v[w.c] || w.c, w.p)) + '</li>'; }).join('');
        $('verdict').setAttribute('data-s', v.s);
        if (v.s === 'pass' || v.s === 'warn') FX.stamp(prev !== 'pass' && v.s === 'pass');
        window.__verdict = v;
      });
    };
    // 로고 그림이 아직 안 불러졌으면 기다린다
    var need = sc.images.filter(function (im) { return !imgs[im.src]; });
    if (need.length) Promise.all(need.map(function (im) { return loadImg(im.src); })).then(go); else go();
  }
  function loadImg(src) {
    return new Promise(function (res) {
      var i = new Image();
      i.onload = function () { imgs[src] = i; res(i); };
      i.onerror = function () { res(null); };
      i.src = src;
    });
  }

  /* ---------- 종류 고르기 ---------- */
  function setType(t, focus) {
    if (t === S.type && !focus) return;
    S.type = t;
    qa('#types [data-t]').forEach(function (b) { var on = b.getAttribute('data-t') === t; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    qa('.fs').forEach(function (x) { x.hidden = x.getAttribute('data-t') !== t; });
    $('tool').setAttribute('data-type', t);
    $('happen').textContent = CFG.happen[t];
    lastVerdict = '';
    render('switch');
    if (focus) { var first = fs(t).querySelector('input,textarea,select'); if (first) first.focus({ preventScroll: true }); }
  }
  // 휴대폰에서 종류 칩 줄을 옆으로 밀 수 있다는 표시(›): 끝까지 밀면 숨긴다(평가 L7)
  (function () {
    var tp = $('types'), w = $('types-w');
    var f = function () { w.classList.toggle('at-end', tp.scrollLeft + tp.clientWidth >= tp.scrollWidth - 4); };
    tp.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f); f();
  })();
  $('types').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) setType(b.getAttribute('data-t')); });
  $('types').addEventListener('keydown', function (e) {
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!keys[e.key]) return;
    e.preventDefault();
    var bs = qa('#types [data-t]'), i = bs.findIndex(function (b) { return b.getAttribute('data-t') === S.type; });
    var n = bs[(i + keys[e.key] + bs.length) % bs.length];
    setType(n.getAttribute('data-t')); n.focus();
  });

  /* ---------- 입력 ---------- */
  var form = $('fields');
  form.addEventListener('input', function (e) {
    render('type');
    if (e.target.matches('input[type=text],input[type=url],input[type=email],input[type=tel],textarea,input:not([type])')) FX.press();
  });
  form.addEventListener('change', function () { render('change'); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  // 와이파이 비밀번호 보이기/가리기(기본: 보임 — 고치기 쉽게)
  qa('.pw-t').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = $(b.getAttribute('data-show')), shown = inp.classList.toggle('masked') === false;
      b.setAttribute('aria-pressed', shown ? 'true' : 'false');
      b.textContent = shown ? (LANG === 'ko' ? '가리기' : 'Hide') : (LANG === 'ko' ? '보기' : 'Show');
    });
  });
  // UTM 칸: 체크하면 접힌 칸에도 표시
  var utmBox = $('f-url-utm');
  if (utmBox) utmBox.addEventListener('change', function () { $('utm-on').hidden = !utmBox.checked; });
  // 전화 여러 개
  var addPh = $('add-ph');
  if (addPh) {
    addPh.addEventListener('click', function () {
      var list = $('ph-list'), n = list.querySelectorAll('.ph-row').length;
      if (n >= 5) return;
      var row = $('ph-tpl').content.firstElementChild.cloneNode(true), idx = n;
      row.setAttribute('data-i', idx);
      row.querySelector('.ph-type').value = idx === 1 ? 'work' : 'home';
      row.querySelector('.ph-type').setAttribute('aria-label', (LANG === 'ko' ? '전화 ' : 'Phone ') + (idx + 1));
      row.querySelector('.ph-num').setAttribute('aria-label', (LANG === 'ko' ? '전화 ' : 'Phone ') + (idx + 1));
      row.querySelector('.ph-num').setAttribute('aria-describedby', 'm-vcard-phone' + idx);
      var m = D.createElement('p'); m.className = 'msg'; m.id = 'm-vcard-phone' + idx; m.setAttribute('aria-live', 'polite');
      list.appendChild(row); list.appendChild(m);
      row.querySelector('.ph-num').focus();
      if (n + 1 >= 5) addPh.hidden = true;
    });
    $('ph-list').addEventListener('click', function (e) {
      var b = e.target.closest('.ph-rm');
      if (!b) return;
      var row = b.closest('.ph-row'), m = row.nextElementSibling;
      if (m && m.classList.contains('msg')) m.remove();
      row.remove();
      addPh.hidden = false;
      qa('.ph-row', $('ph-list')).forEach(function (r, i) { r.setAttribute('data-i', i); });
      render('change');
    });
  }
  // 일정: 하루 종일이면 날짜만
  var allday = $('f-event-allday');
  if (allday) allday.addEventListener('change', function () {
    ['start', 'end'].forEach(function (k) {
      var el = $('f-event-' + k), v = el.value;
      el.type = allday.checked ? 'date' : 'datetime-local';
      el.value = allday.checked ? v.slice(0, 10) : (v ? v.slice(0, 10) + 'T09:00' : '');
    });
    render('change');
  });

  /* ---------- 꾸미기 ---------- */
  function syncDesign() {
    var st = S.style;
    qa('.choice[data-g]').forEach(function (g) {
      var k = g.getAttribute('data-g'), v = k === 'ecl' ? S.ecl : st[k];
      qa('button', g).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(v) ? 'true' : 'false'); });
    });
    $('c-fg').value = st.fg; $('c-fg-hex').textContent = st.fg;
    $('c-fg2').value = st.fg2; $('c-fg2-hex').textContent = st.fg2;
    $('c-bg').value = st.bg; $('c-bg-hex').textContent = st.bg;
    $('c-eo').value = st.eyeOut; $('c-eo-hex').textContent = st.eyeOut;
    $('c-ei').value = st.eyeIn; $('c-ei-hex').textContent = st.eyeIn;
    $('c-fr').value = st.frameColor; $('c-fr-hex').textContent = st.frameColor;
    $('c-ft').value = st.frameTextColor; $('c-ft-hex').textContent = st.frameTextColor;
    $('c-ang').value = st.angle; $('c-ang-o').textContent = st.angle + MSG.angle_unit;
    $('c-tr').checked = !!st.transparent; $('c-eye').checked = !!st.eyeColor;
    $('c-fg2-w').hidden = st.grad === 'none'; $('c-ang-w').hidden = st.grad !== 'linear';
    $('c-eye-w').hidden = !st.eyeColor;
    $('frame-opts').hidden = st.frame === 'none';
    $('ft-text').value = st.frameText || '';
    $('ft-pick').value = qa('#ft-pick option').some(function (o) { return o.value === st.frameText; }) ? st.frameText : '';
    $('margin').value = S.margin; $('margin-o').textContent = S.margin + ' ' + CFG.U.margin_unit;
    $('margin').closest('.col').classList.toggle('low', S.margin < 4);
    qa('#presets .pre').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === S.preset ? 'true' : 'false'); });
    contrastLine();
    frameTextNote();
  }
  function contrastLine() {
    var st = S.style, bg = st.transparent ? '#ffffff' : st.bg, c = QRR.contrast(st.fg, bg), c2 = st.grad !== 'none' ? QRR.contrast(st.fg2, bg) : c;
    var w = Math.min(c, c2), inv = QRR.lum(st.fg) > QRR.lum(bg) || (st.grad !== 'none' && QRR.lum(st.fg2) > QRR.lum(bg));
    var el = $('contrast');
    el.textContent = (LANG === 'ko' ? '대비 ' : 'Contrast ') + (Math.floor(w * 10) / 10).toFixed(1) + ':1';
    el.className = 'contrast ' + (inv || w < 4 ? 'low' : 'ok');
  }
  function designChanged(why) {
    S.preset = why === 'preset' ? S.preset : null;
    syncDesign();
    render('design');
    FX.sweep();
  }
  qa('.choice[data-g]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      var k = g.getAttribute('data-g'), v = b.getAttribute('data-v');
      if (k === 'ecl') { S.ecl = v; S.eclAuto = false; if ($('logo-msg').className.indexOf('ok') >= 0) { $('logo-msg').textContent = ''; $('logo-msg').className = 'msg'; } }   // 직접 고르면 'H로 올렸어요' 알림을 지운다(평가 L6)
      else {
        S.style[k] = v;
        if (k === 'frame' && v !== 'none' && !S.style.frameText) S.style.frameText = 'SCAN ME';
        if (k === 'frame' && v !== 'none' && S.style.frameText) needChunks(S.style.frameText).then(function () { loadGlyphs().then(function () { render('glyph'); }); });
      }
      designChanged();
    });
  });
  function bindColor(id, key) {
    $(id).addEventListener('input', function () { S.style[key] = $(id).value; $(id + '-hex').textContent = $(id).value; S.preset = null; contrastLine(); render('design'); });
    $(id).addEventListener('change', function () { FX.sweep(); });
  }
  bindColor('c-fg', 'fg'); bindColor('c-fg2', 'fg2'); bindColor('c-bg', 'bg'); bindColor('c-eo', 'eyeOut'); bindColor('c-ei', 'eyeIn'); bindColor('c-fr', 'frameColor'); bindColor('c-ft', 'frameTextColor');
  $('c-ang').addEventListener('input', function () { S.style.angle = +$('c-ang').value; $('c-ang-o').textContent = S.style.angle + MSG.angle_unit; render('design'); });
  $('c-tr').addEventListener('change', function () { S.style.transparent = $('c-tr').checked; designChanged(); });
  $('c-eye').addEventListener('change', function () {
    S.style.eyeColor = $('c-eye').checked;
    if (S.style.eyeColor && S.style.eyeOut === QRPRE.BASE.eyeOut) { S.style.eyeOut = S.style.fg; S.style.eyeIn = S.style.fg; }
    designChanged();
  });
  $('ft-pick').addEventListener('change', function () { if ($('ft-pick').value) { S.style.frameText = $('ft-pick').value; $('ft-text').value = S.style.frameText; designChanged(); } });
  $('ft-text').addEventListener('input', function () {
    S.style.frameText = $('ft-text').value; S.preset = null;
    needChunks(S.style.frameText).then(function () { render('design'); frameTextNote(); });
    render('design');
    frameTextNote();
  });
  $('margin').addEventListener('input', function () { S.margin = +$('margin').value; $('margin-o').textContent = S.margin + ' ' + CFG.U.margin_unit; $('margin').closest('.col').classList.toggle('low', S.margin < 4); render('design'); });
  // 꾸밈 세트
  $('presets').addEventListener('click', function (e) {
    var b = e.target.closest('.pre');
    if (!b) return;
    var p = QRPRE.LIST.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0];
    applyStyle(QRPRE.style(p, LANG));
    S.preset = p.id;
    if (S.style.frameText) needChunks(S.style.frameText).then(function () { loadGlyphs().then(function () { render('glyph'); }); });
    designChanged('preset');
  });
  /* 꾸밈 세트 그림(작은 QR + 그 세트의 틀·문구). 자리는 CSS 가 정사각으로 잡아 두었다 */
  function drawPresets() {
    var q = QR.encode('Staycode', { ecl: 'L', boost: false });
    qa('#presets .pre').forEach(function (b) {
      var p = QRPRE.LIST.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0], st = QRPRE.style(p, LANG);
      st.margin = 2;
      b.querySelector('.pre-i').innerHTML = QRR.toSVG(QRR.scene(q, st, glyphs), { bare: true, idp: 'p' + p.id });
    });
  }
  function applyStyle(st) {
    var keep = S.style;
    S.style = JSON.parse(JSON.stringify(QRPRE.BASE));
    for (var k in st) if (k in S.style) S.style[k] = st[k];
    return keep;
  }
  // 탭
  var tabs = qa('[role=tab]');
  function selectTab(tb, focus) {
    tabs.forEach(function (x) { var on = x === tb; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; $(x.getAttribute('aria-controls')).hidden = !on; });
    if (focus) tb.focus();
  }
  tabs.forEach(function (tb, i) {
    tb.addEventListener('click', function () { selectTab(tb); });
    tb.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- 로고 ---------- */
  $('logo-file').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    $('logo-msg').textContent = '';
    if (f.size > 10 * 1024 * 1024) { $('logo-msg').textContent = MSG.logo_big_file; $('logo-msg').className = 'msg err'; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var i = new Image();
      i.onload = function () {
        // 큰 그림은 512px 로 줄여 PNG 로(저장·PDF 를 가볍게. SVG 로고도 그림으로 굳힌다)
        var w = i.naturalWidth || 512, h = i.naturalHeight || 512, k = Math.min(1, 512 / Math.max(w, h));
        var cv = D.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        cv.getContext('2d').drawImage(i, 0, 0, cv.width, cv.height);
        var src = cv.toDataURL('image/png');
        var j = new Image();
        j.onload = function () {
          imgs[src] = j;
          S.logo = { src: src, w: cv.width, h: cv.height, size: (+$('logo-size').value) / 100, clear: $('logo-clear').checked, plate: $('logo-plate').checked };
          $('logo-img').src = src; $('logo-img').hidden = false; $('logo-opts').hidden = false;
          if (S.ecl !== 'H') { S.ecl = 'H'; S.eclAuto = true; $('logo-msg').textContent = CFG.U.logo_ecl; $('logo-msg').className = 'msg ok'; }
          designChanged();
        };
        j.src = src;
      };
      i.onerror = function () { $('logo-msg').textContent = MSG.logo_bad; $('logo-msg').className = 'msg err'; };
      i.src = rd.result;
    };
    rd.onerror = function () { $('logo-msg').textContent = MSG.logo_bad; $('logo-msg').className = 'msg err'; };
    rd.readAsDataURL(f);
  });
  $('logo-size').addEventListener('input', function () { $('logo-size-o').textContent = this.value + '%'; if (S.logo) { S.logo.size = (+this.value) / 100; render('design'); } });
  $('logo-clear').addEventListener('change', function () { if (S.logo) { S.logo.clear = this.checked; designChanged(); } });
  $('logo-plate').addEventListener('change', function () { if (S.logo) { S.logo.plate = this.checked; designChanged(); } });
  $('logo-rm').addEventListener('click', function () {
    S.logo = null; $('logo-opts').hidden = true; $('logo-msg').textContent = '';
    if (S.eclAuto) { S.ecl = 'M'; S.eclAuto = false; }
    designChanged();
  });

  /* ---------- 내 꾸밈 ---------- */
  var KEY_STY = 'staycode.styles';
  function mineList() { return store.get(KEY_STY, []); }
  function drawMine() {
    var list = mineList(), ul = $('mine-list');
    $('mine-empty').hidden = list.length > 0;
    ul.innerHTML = list.map(function (m, i) {
      return '<li><button type="button" class="btn ghost sm" data-use="' + i + '">' + escH(MSG.mine_apply) + '</button><span class="mn">' + escH(m.name) + '</span><button type="button" class="lnk" data-del="' + i + '">' + escH(CFG.U.mine_del) + '</button></li>';
    }).join('');
  }
  $('mine-save').addEventListener('click', function () {
    var name = $('mine-name').value.trim(), msg = $('mine-msg');
    if (!name) { msg.textContent = MSG.mine_noname; msg.className = 'msg err'; $('mine-name').focus(); return; }
    var list = mineList().filter(function (m) { return m.name !== name; });
    list.unshift({ name: name, style: S.style, ecl: S.ecl, margin: S.margin, logo: S.logo, at: Date.now() });
    if (list.length > 20) list.length = 20;
    if (!store.set(KEY_STY, list)) {   // 로고가 커서 안 들어가면 로고 없이 한 번 더
      list[0].logo = null;
      if (!store.set(KEY_STY, list)) { msg.textContent = MSG.mine_full; msg.className = 'msg err'; return; }
    }
    msg.textContent = fmt(MSG.mine_saved, { n: name }); msg.className = 'msg ok';
    $('mine-name').value = '';
    drawMine();
  });
  $('mine-list').addEventListener('click', function (e) {
    var u = e.target.closest('[data-use]'), d = e.target.closest('[data-del]'), list = mineList();
    if (u) {
      var m = list[+u.getAttribute('data-use')];
      applyStyle(m.style); S.ecl = m.ecl || 'M'; S.margin = m.margin == null ? 4 : m.margin;
      if (m.logo && m.logo.src) { S.logo = m.logo; $('logo-img').src = m.logo.src; $('logo-img').hidden = false; $('logo-opts').hidden = false; loadImg(m.logo.src).then(function () { render('design'); }); }
      if (S.style.frameText) needChunks(S.style.frameText).then(function () { loadGlyphs().then(function () { render('glyph'); }); });
      designChanged();
    }
    if (d) {
      var n = list[+d.getAttribute('data-del')];
      list.splice(+d.getAttribute('data-del'), 1);
      store.set(KEY_STY, list);
      $('mine-msg').textContent = fmt(MSG.mine_deleted, { n: n.name }); $('mine-msg').className = 'msg';
      drawMine();
    }
  });

  /* ---------- 저장 ---------- */
  function base() { return QRP.fileBase(cur.r); }
  function download(blob, name) {
    var a = D.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; D.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function canvasFor(px, under) {
    var cv = D.createElement('canvas');
    QRR.toCanvas(cur.scene, cv, px, imgs, under);
    return cv;
  }
  function blobOf(cv, type, q) { return new Promise(function (res) { cv.toBlob(res, type, q); }); }
  /* 로고를 PDF·EPS 에 넣을 RGB(+투명) 바이트로 */
  function logoBytes(flat) {
    var out = {};
    cur.scene.images.forEach(function (im) {
      var el = imgs[im.src];
      if (!el) return;
      var w = Math.min(512, el.naturalWidth || 256), h = Math.round(w * (el.naturalHeight || 256) / (el.naturalWidth || 256));
      var cv = D.createElement('canvas'); cv.width = w; cv.height = h;
      var c = cv.getContext('2d');
      if (flat) { c.fillStyle = cur.scene.bg || '#ffffff'; c.fillRect(0, 0, w, h); }
      c.drawImage(el, 0, 0, w, h);
      var d = c.getImageData(0, 0, w, h).data, rgb = new Uint8Array(w * h * 3), a = new Uint8Array(w * h), hasA = false;
      for (var i = 0, j = 0, k = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; a[k++] = d[i + 3]; if (d[i + 3] < 255) hasA = true; }
      out[im.src] = { w: w, h: h, rgb: rgb, alpha: !flat && hasA ? a : null };
    });
    return out;
  }
  function saved(kind) {
    FX.peel();
    toast(MSG.saved);
    addRecent();
    window.__saved = (window.__saved || 0) + 1;
    window.__lastSave = kind;
  }
  function onSave(kind) {
    if (!cur.scene) { toast(MSG.need_content); return; }
    var b = base();
    if (kind === 'png') {
      var px = +$('png-size').value;
      blobOf(canvasFor(px, null), 'image/png').then(function (bl) { download(bl, b + '.png'); saved('png'); });
    } else if (kind === 'jpg') {
      blobOf(canvasFor(+$('png-size').value, cur.scene.bg || '#ffffff'), 'image/jpeg', 0.92).then(function (bl) { download(bl, b + '.jpg'); saved('jpg'); });
    } else if (kind === 'svg') {
      var svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + QRR.toSVG(cur.scene, { px: 1000, title: cur.r.target, idp: 'g' });
      download(new Blob([svg], { type: 'image/svg+xml' }), b + '.svg'); saved('svg');
    } else if (kind === 'pdf') {
      var mode = (D.querySelector('input[name=pdfm]:checked') || {}).value || 'a4';
      download(new Blob([QRX.pdfOne(cur.scene, +$('pdf-cm').value, mode, logoBytes(false))], { type: 'application/pdf' }), b + '.pdf'); saved('pdf');
    } else if (kind === 'eps') {
      download(new Blob([QRX.eps(cur.scene, +$('pdf-cm').value, logoBytes(true))], { type: 'application/postscript' }), b + '.eps'); saved('eps');
    }
  }
  $('dl-png').addEventListener('click', function () { onSave('png'); });
  $('sb-save').addEventListener('click', function () { onSave('png'); });
  qa('[data-dl]').forEach(function (bt) { bt.addEventListener('click', function () { onSave(bt.getAttribute('data-dl')); }); });
  $('copy-img').addEventListener('click', function () {
    if (!cur.scene) return;
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') { toast(MSG.copy_fail); return; }
    var p = blobOf(canvasFor(1024, null), 'image/png');
    navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]).then(function () { toast(MSG.copied); FX.peel(); }, function () { toast(MSG.copy_fail); });
  });
  if (navigator.canShare && navigator.share) {
    try { if (navigator.canShare({ files: [new File([new Blob(['x'])], 'x.png', { type: 'image/png' })] })) $('share-img').hidden = false; } catch (e) { /* 공유 안 됨 */ }
  }
  $('share-img').addEventListener('click', function () {
    if (!cur.scene) return;
    // 공유 창은 누른 순간에 열어야 해서 그림을 바로 만든다
    var cv = canvasFor(1024, null), name = base() + '.png';
    cv.toBlob(function (bl) {
      navigator.share({ files: [new File([bl], name, { type: 'image/png' })] }).then(function () { saved('share'); }).catch(function () { /* 닫음 */ });
    }, 'image/png');
  });
  // 스티커 시트
  function sheetGeo() { return cur.scene ? QRX.sheet(cur.scene.W, cur.scene.H, +$('sheet-cm').value, { marks: $('sheet-marks').checked }, cur.scene.qr.n) : null; }
  function sheetCount() {
    var g = sheetGeo(), el = $('sheet-n');
    if (!g) { el.textContent = ''; return; }
    var mm = function (pt) { return Math.round(pt / QRX.MM); };
    el.textContent = g.fits ? fmt(CFG.U.sheet_count, { n: g.cells.length, c: g.cols, r: g.rows }) + ' · ' + fmt(CFG.U.sheet_size, { w: mm(g.w), h: mm(g.h) }) : CFG.U.sheet_none;
  }
  $('sheet-cm').addEventListener('change', sheetCount);
  $('sheet-marks').addEventListener('change', sheetCount);
  $('sheet-pdf').addEventListener('click', function () {
    if (!cur.scene) return;
    var r = QRX.pdfSheet(cur.scene, +$('sheet-cm').value, { marks: $('sheet-marks').checked }, logoBytes(false));
    if (!r.geo.fits) { toast(CFG.U.sheet_none); return; }
    download(new Blob([r.bytes], { type: 'application/pdf' }), base() + '-sheet.pdf'); saved('sheet');
  });
  $('sheet-print').addEventListener('click', function () {
    if (!cur.scene) return;
    var g = sheetGeo();
    if (!g.fits) { toast(CFG.U.sheet_none); return; }
    var svg = QRR.toSVG(cur.scene, { idp: 'pr' }), mm = 25.4 / 72, box = $('print-sheet');
    var cells = g.cells.map(function (c) { return '<div class="ps-c" style="left:' + (c.x * mm).toFixed(2) + 'mm;top:' + (c.y * mm).toFixed(2) + 'mm;width:' + (c.w * mm).toFixed(2) + 'mm;height:' + (c.h * mm).toFixed(2) + 'mm">' + svg + '</div>'; }).join('');
    var marks = g.marks.map(function (m) {
      var x = Math.min(m[0], m[2]) * mm, y = Math.min(m[1], m[3]) * mm, w = Math.abs(m[2] - m[0]) * mm, h = Math.abs(m[3] - m[1]) * mm;
      return '<i class="ps-m" style="left:' + x.toFixed(2) + 'mm;top:' + y.toFixed(2) + 'mm;width:' + Math.max(w, 0.12).toFixed(2) + 'mm;height:' + Math.max(h, 0.12).toFixed(2) + 'mm"></i>';
    }).join('');
    box.innerHTML = cells + marks;
    H.classList.add('printing-sheet');
    var done = function () { H.classList.remove('printing-sheet'); box.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 30);
  });

  /* ---------- 최근에 만든 QR ---------- */
  var KEY_REC = 'staycode.recent';
  /* 최근 목록: 넣은 내용 '전체'를 저장하고 화면에는 앞부분만 보여 준다(잘린 내용을 되살리면 틀린 QR 이 된다: 평가 H3).
     연락처·와이파이는 개인정보(전화·주소·비밀번호)가 들어 있어 아예 저장하지 않는다(평가 M4, 방침에 그대로 적음). */
  var NO_RECENT = { vcard: 1, wifi: 1 };
  function recentList() { return store.get(KEY_REC, []).filter(function (x) { return x && x.v === 2 && !NO_RECENT[x.t]; }); }
  function addRecent() {
    if (!cur.r || NO_RECENT[S.type]) return;
    var t = S.type, show = String(cur.r.target);
    var snap = JSON.parse(JSON.stringify(S.fields[t]));
    var list = recentList().filter(function (x) { return !(x.t === t && x.data === cur.r.data); });
    list.unshift({ v: 2, t: t, data: cur.r.data, show: show.length > 40 ? show.slice(0, 39) + '…' : show, f: snap, style: S.style, ecl: S.ecl, margin: S.margin, at: Date.now() });
    if (list.length > 8) list.length = 8;
    store.set(KEY_REC, list);
    drawRecent();
  }
  function drawRecent() {
    var list = recentList(), box = $('recent');
    box.hidden = !list.length;
    $('rec-list').innerHTML = list.map(function (x, i) {
      return '<li><button type="button" class="rec" data-i="' + i + '"><span class="rec-t">' + escH(CFG.types[x.t] || x.t) + '</span><span class="rec-s">' + escH(x.show) + '</span></button></li>';
    }).join('');
  }
  $('rec-list').addEventListener('click', function (e) {
    var b = e.target.closest('.rec');
    if (!b) return;
    var x = recentList()[+b.getAttribute('data-i')];
    if (!x) return;
    S.fields[x.t] = Object.assign(QRP.blank(x.t), x.f);
    applyStyle(x.style); S.ecl = x.ecl || 'M'; S.margin = x.margin == null ? 4 : x.margin;
    writeFields(x.t);   // 칸에 먼저 써야 한다(종류를 바꾸면 칸에서 다시 읽는다)
    setType(x.t, true);
    if (S.style.frameText) needChunks(S.style.frameText).then(function () { render('glyph'); });
    designChanged();
    // 되살린 내용이 저장할 때와 같은지 확인(다르면 알린다)
    if (cur.r && cur.r.data !== x.data) toast(MSG.recent_changed);
    $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('rec-clear').addEventListener('click', function () { store.set(KEY_REC, []); try { localStorage.removeItem(KEY_REC); } catch (e) { /* 무시 */ } drawRecent(); });

  /* ---------- 알림 ---------- */
  var toastT = 0;
  function toast(s) {
    var el = $('toast');
    el.textContent = s; el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* ---------- 아래 저장 막대(저장 단추가 화면 밖일 때만) ---------- */
  /* 아래 저장 막대: 원래 '저장' 단추를 지나 아래(꾸미기)로 내려갔을 때만. 미리보기·판정 글·원래 단추가 보이는 동안은 숨긴다(평가 M2) */
  if ('IntersectionObserver' in window) {
    var sb = $('savebar'), past = false, toolIn = true;
    var upd = function () { var on = past && toolIn && !!cur.scene; sb.classList.toggle('on', on); sb.setAttribute('aria-hidden', on ? 'false' : 'true'); $('sb-save').tabIndex = on ? 0 : -1; };
    new IntersectionObserver(function (es) { es.forEach(function (e) { past = !e.isIntersecting && e.boundingClientRect.bottom < 0; }); upd(); }, { threshold: 0 }).observe($('save-box'));
    new IntersectionObserver(function (es) { es.forEach(function (e) { toolIn = e.isIntersecting; }); upd(); }, { rootMargin: '0px 0px -40% 0px' }).observe($('tool'));
    window.__sbUpd = upd;
  }

  /* ---------- 시작 ---------- */
  function boot() {
    writeFields(S.type);
    syncDesign();
    drawMine();
    drawRecent();
    // 뒤로 가기·탭 복제로 되살아난 칸 값도 읽는다
    render('boot');
    if (window.__sbUpd) window.__sbUpd();
    // 틀 문구 글자 모양은 화면이 다 뜬 뒤 미리 받아 둔다(꾸밈 세트에 문구가 있어서)
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
    idle(function () { loadGlyphs().then(drawPresets); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) render('boot'); });
  if (D.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  // 시험용 손잡이(화면 동작에는 쓰지 않는다)
  window.__qr = { S: S, cur: function () { return cur; }, render: render, setType: setType, applyStyle: applyStyle, designChanged: designChanged, loadGlyphs: loadGlyphs, needChunks: needChunks, imgs: imgs };
})();
