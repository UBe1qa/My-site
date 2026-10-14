/* 오래QR — 대량 만들기. 목록(한 줄 = 하나, '파일이름,내용' 가능) 또는 CSV → 같은 꾸밈으로 PNG·SVG → 줄마다 찍힘 확인 → ZIP(STORE).
   틀린 줄은 건너뛰고 몇 번 줄이 왜 빠졌는지 표에. 같은 파일 이름은 -2, -3. 모두 이 기기 안에서. 문구는 #qr-cfg JSON. */
(function () {
  'use strict';
  var D = document, CFG = JSON.parse(D.getElementById('qr-cfg').textContent), B = CFG.B, MSG = CFG.M, LANG = CFG.lang, LIMIT = CFG.limit;
  var $ = function (id) { return D.getElementById(id); };
  var fmt = function (s, p) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return p && p[k] != null ? p[k] : ''; }); };
  var escH = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (n) { return n.toLocaleString(LANG === 'ko' ? 'ko-KR' : 'en-US'); };
  QRV.setWorker(CFG.worker);
  var glyphs = null, imgs = {}, files = [], stop = false, running = false;

  function loadGlyphs() {
    if (glyphs) return Promise.resolve(glyphs);
    return fetch(CFG.glyphs).then(function (r) { return r.json(); }).then(function (g) { glyphs = g; return g; }).catch(function () { return null; });
  }
  function mine() { try { return JSON.parse(localStorage.getItem('staycode.styles') || '[]') || []; } catch (e) { return []; } }
  function fillMine() {
    var g = $('b-mine'), list = mine();
    g.innerHTML = list.map(function (m, i) { return '<option value="m:' + i + '">' + escH(m.name) + '</option>'; }).join('');
    g.hidden = !list.length;
    if (!list.length) g.label = B.mine_group;
  }
  function chosen() {
    var v = $('b-style').value, st = JSON.parse(JSON.stringify(QRPRE.BASE)), logo = null, margin = 4, ecl = null;
    if (v.indexOf('p:') === 0) {
      var p = QRPRE.LIST.filter(function (x) { return x.id === v.slice(2); })[0];
      st = QRPRE.style(p, LANG);
    } else if (v.indexOf('m:') === 0) {
      var m = mine()[+v.slice(2)];
      if (m) { for (var k in m.style) st[k] = m.style[k]; logo = m.logo || null; margin = m.margin == null ? 4 : m.margin; ecl = m.ecl; }
    }
    if (!st.eyeColor) { st.eyeOut = ''; st.eyeIn = ''; }
    st.margin = margin;
    if (logo && logo.src) st.logo = logo;
    return { st: st, ecl: ecl };
  }
  function preview() {
    var c = chosen();
    try {
      var q = QRR.fake(QR.encode('https://example.com/menu', { ecl: $('b-ecl').value, boost: false }));
      $('sticker').innerHTML = QRR.toSVG(QRR.scene(q, c.st, glyphs), { bare: true, cut: 1.4, cls: 'qr-svg', idp: 'x' });
    } catch (e) { /* 그대로 */ }
  }

  /* ---------- 목록 읽기 ---------- */
  function csvRows(text) {   // 따옴표·줄바꿈이 든 칸까지
    var rows = [], row = [], cell = '', q = false, i = 0, c;
    text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) {
      c = text.charAt(i);
      if (q) { if (c === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"' && cell === '') { q = true; continue; }
      if (c === ',' ) { row.push(cell); cell = ''; continue; }
      if (c === '\r') continue;
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  var HEAD = /^(name|file|filename|파일|파일이름|이름|url|주소|내용|content|text|ssid)$/i;
  /* 줄 나누기 규칙(화면에 밝혀 둠):
     - 글: 한 줄 전체가 내용(쉼표로 나누지 않는다: 글에는 쉼표가 흔하다, 평가 H4). 파일 이름은 탭으로만: '이름<탭>내용'.
       첫 줄이 '파일이름,내용'(name,content) 같은 제목줄인 CSV 면 그때만 CSV 칸(따옴표 규칙)으로 읽는다.
     - URL: '이름,주소' 또는 '이름<탭>주소'. 주소 안의 쉼표는 그대로(쉼표 앞이 주소 모양이면 이름으로 보지 않는다).
     - 와이파이: CSV 칸(파일이름, SSID, 비밀번호, 보안, 숨김) */
  function parseList(text, type) {
    var src = text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
    var lines = src.split('\n'), first = (lines[0] || '').split(/[,\t]/).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    var hasHead = first.length > 1 && first.some(function (c) { return HEAD.test(c); });
    var items = [];
    if (type === 'text' && !hasHead) {
      lines.forEach(function (ln, idx) {
        if (!ln.trim()) return;
        var tab = ln.indexOf('\t'), name = '', content = ln;
        if (tab >= 0) { name = ln.slice(0, tab).trim(); content = ln.slice(tab + 1); }
        items.push({ line: idx + 1, name: name, f: { text: content }, raw: ln });
      });
      return items;
    }
    var rows = csvRows(src.replace(/\t/g, ','));
    rows.forEach(function (r, idx) {
      var line = idx + 1;
      if (r.length === 1 && !r[0].trim()) return;
      if (idx === 0 && hasHead) return;   // 제목줄
      var name = '', fields;
      if (type === 'wifi') {
        // 칸: 파일이름, SSID, 비밀번호, 보안, 숨김 (파일이름은 비워도 된다). 칸이 둘뿐이면 SSID, 비밀번호
        var a = r.length === 2 ? [''].concat(r) : r.slice();
        name = (a[0] || '').trim();
        var auth = (a[3] || '').trim().toLowerCase();
        auth = auth === 'wep' ? 'WEP' : (auth === 'nopass' || auth === 'none' || auth === 'open') ? 'nopass' : (!auth && !(a[2] || '')) ? 'nopass' : 'WPA';
        fields = { ssid: a[1] || '', password: a[2] || '', auth: auth, hidden: /^(true|1|yes|y)$/i.test((a[4] || '').trim()) };
      } else if (type === 'text') {   // 제목줄이 있는 CSV: 파일이름, 내용(따옴표로 감싼 칸은 쉼표·줄바꿈 그대로)
        if (r.length >= 2) { name = r[0].trim(); fields = { text: r.slice(1).join(',') }; } else fields = { text: r[0] };
      } else {
        var content;
        if (r.length >= 2) { name = r[0].trim(); content = r.slice(1).join(','); }
        else content = r[0];
        // 'https://a.com/x,y' 처럼 내용에 쉼표가 든 주소를 이름으로 오해하지 않는다
        if (/^([a-z][a-z0-9+.\-]*:\/\/|www\.)/i.test(name) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(name)) { content = r.join(','); name = ''; }
        fields = { url: content.trim(), utm: false };
      }
      items.push({ line: line, name: name, f: fields, raw: r.join(',') });
    });
    return items;
  }
  function count() {
    var items = parseList($('b-list').value, $('b-type').value), n = items.length;
    $('b-count').textContent = n ? fmt(B.lines, { n: num(n) }) + ' · ' + fmt(B.limit, { n: num(LIMIT) }) : fmt(B.limit, { n: num(LIMIT) });
    $('b-count').classList.toggle('over', n > LIMIT);
    if (!running) $('b-go').textContent = n > LIMIT ? fmt(B.go_first, { n: num(LIMIT) }) : B.go;   // 1,000줄 넘으면 단추가 '앞 1,000줄 만들기'(평가 낮음)
    $('b-rule').textContent = B.rules[$('b-type').value] || '';
    return items;
  }
  function safeName(s) {
    s = String(s).replace(/[\\\/:*?"<>|\u0000-\u001f\u007f]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
    return s.slice(0, 60) || 'qr';
  }

  /* ---------- 만들기 ---------- */
  function toBytes(blob) { return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function go() {
    if (running) return;
    var items = count(), type = $('b-type').value, msg = $('b-msg');
    msg.textContent = ''; msg.className = 'msg';
    if (!items.length) { msg.textContent = B.empty_list; msg.className = 'msg err'; return; }
    var over = items.length > LIMIT;
    if (over) items = items.slice(0, LIMIT);
    var c = chosen(), ecl = $('b-ecl').value, fmtSel = (D.querySelector('input[name=bfmt]:checked') || {}).value || 'png', px = +$('b-size').value;
    if (c.st.logo && ecl !== 'H' && ecl !== 'Q') ecl = 'H';
    running = true; stop = false; files = [];
    $('b-go').disabled = true; $('b-stop').hidden = false; $('b-prog').hidden = false; $('b-res').hidden = true;
    var rows = [], skips = [], fails = 0, i = 0, cv = D.createElement('canvas'), ccv = D.createElement('canvas'), names = [], outs = [];
    var bar = $('b-bar'), pt = $('b-prog-t');
    var needLogo = c.st.logo && c.st.logo.src && !imgs[c.st.logo.src];
    var ready = Promise.all([loadGlyphs(), needLogo ? new Promise(function (res) { var im = new Image(); im.onload = function () { imgs[c.st.logo.src] = im; res(); }; im.onerror = res; im.src = c.st.logo.src; }) : null]);
    ready.then(function step() {
      if (stop || i >= items.length) return finish();
      var it = items[i++];
      var r = QRP.build(type, it.f);
      if (!r.ok) { skips.push({ line: it.line, raw: it.raw, why: r.err.map(function (e) { return fmt(MSG.err[e.c] || e.c, e.p); }).join(' ') }); return next(); }
      var qr;
      try { qr = QR.encode(r.data, { ecl: ecl, boost: false }); }
      catch (e) { skips.push({ line: it.line, raw: it.raw, why: fmt(MSG.err.too_long, { b: e.bytes, e: ecl, m: e.max }) }); return next(); }
      var sc = QRR.scene(qr, c.st, glyphs);
      var nm = safeName(it.name || QRP.fileBase(r).replace(/^qr-(url|text|wifi)-?/, '') || ('qr-' + it.line));
      names.push(nm + '.' + fmtSel);
      var job = QRV.check(sc, r.data, c.st, imgs, ccv).then(function (v) {
        if (v.s === 'fail') fails++;
        var make = fmtSel === 'svg' ? Promise.resolve(new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?>\n' + QRR.toSVG(sc, { px: 1000, idp: 'g' })))
          : new Promise(function (res) { QRR.toCanvas(sc, cv, px, imgs, null); cv.toBlob(res, 'image/png'); }).then(toBytes);
        return make.then(function (bytes) {
          outs.push(bytes);
          rows.push({ line: it.line, sc: rows.length < 100 ? sc : null, content: r.data, check: v.s, idx: outs.length - 1 });
        });
      });
      return job.then(next);
      function next() {
        bar.style.transform = 'scaleX(' + (i / items.length) + ')';
        pt.textContent = fmt(B.making, { i: num(i), n: num(items.length) });
        return new Promise(function (res) { setTimeout(res, 0); }).then(step);
      }
    });
    function finish() {
      running = false;
      $('b-go').disabled = false; $('b-stop').hidden = true; count();
      var uniq = QRX.uniqueNames(names);
      files = outs.map(function (b, k) { return { name: uniq[k], data: b }; });
      rows.forEach(function (rw) { rw.name = uniq[rw.idx]; });
      $('b-res').hidden = false;
      var sum = [fmt(B.res_ok, { n: num(files.length) })];
      if (over) sum.unshift(fmt(B.too_many, { n: num(LIMIT), m: num(LIMIT) }));
      if (skips.length) sum.push(fmt(B.res_skip, { n: num(skips.length) }));
      if (fails) sum.push(fmt(B.res_fail, { n: num(fails) }));
      $('b-sum').textContent = sum.join(' ');
      $('b-zip').textContent = fmt(B.zip, { n: num(files.length) });
      $('b-zip').disabled = !files.length;
      $('b-rows').innerHTML = rows.slice(0, 100).map(function (rw) {
        var th = rw.sc ? QRR.toSVG(rw.sc, { bare: true, cls: 'thumb', idp: 't' + rw.line }) : '';
        var ck = rw.check === 'pass' || rw.check === 'warn' ? '<span class="ok">' + escH(B.ok) + '</span>' : rw.check === 'fail' ? '<span class="bad">' + escH(B.fail) + '</span>' : escH(B.nocheck);
        return '<tr><td>' + rw.line + '</td><td>' + th + '</td><td>' + escH(rw.name) + '</td><td class="ct" title="' + escH(rw.content) + '">' + escH(rw.content) + '</td><td>' + ck + '</td></tr>';
      }).join('');
      $('b-tnote').hidden = rows.length <= 100;
      $('b-skip').hidden = !skips.length;
      $('b-skips').innerHTML = skips.map(function (s) { return '<tr><td>' + s.line + '</td><td class="ct">' + escH(s.raw) + '</td><td>' + escH(s.why) + '</td></tr>'; }).join('');
      window.__bulk = { made: files.length, skipped: skips.length, fails: fails, names: uniq };
      pt.textContent = fmt(B.res_ok, { n: num(files.length) });
      $('b-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  $('b-go').addEventListener('click', go);
  $('b-stop').addEventListener('click', function () { stop = true; });
  $('b-zip').addEventListener('click', function () {
    if (!files.length) return;
    var z = QRX.zip(files, new Date()), a = D.createElement('a'), u = URL.createObjectURL(new Blob([z], { type: 'application/zip' }));
    a.href = u; a.download = 'qr-codes-' + files.length + '.zip'; D.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
  });
  $('b-csv').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { $('b-list').value = String(rd.result); count(); };
    rd.readAsText(f, 'utf-8');
  });
  $('b-list').addEventListener('input', count);
  $('b-type').addEventListener('change', function () { count(); $('b-size-w').hidden = false; });
  $('b-style').addEventListener('change', preview);
  $('b-ecl').addEventListener('change', preview);
  D.querySelectorAll('input[name=bfmt]').forEach(function (r) { r.addEventListener('change', function () { $('b-size-w').hidden = r.value === 'svg' && r.checked; }); });
  fillMine();
  count();
  loadGlyphs().then(preview);
  window.addEventListener('pageshow', count);
})();
