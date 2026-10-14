/* 오래QR — 스캐너. 카메라(누른 뒤에만 권한 요청, 끄기 단추) · 사진/스크린샷 올리기 · 붙여넣기(클립보드 그림).
   읽은 결과를 종류별로 풀어 보여 주고, 주소는 열기 전에 실제 도메인을 크게 + 위험 신호 경고(qr-parse.js). 자동으로 열지 않는다.
   와이파이 비밀번호는 가려 보이고 복사 단추. 카메라 화면·사진은 이 기기 안에서만 읽는다(저장·전송 없음). */
(function () {
  'use strict';
  var D = document, CFG = JSON.parse(D.getElementById('qr-cfg').textContent), S = CFG.S;
  var $ = function (id) { return D.getElementById(id); };
  var escH = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  QRV.setWorker(CFG.worker);
  var stream = null, raf = 0, busy = false, cv = D.createElement('canvas'), lastText = null;

  function msg(t, err) { var m = $('s-msg'); m.textContent = t || ''; m.className = 'msg' + (err ? ' err' : ''); }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 2000); }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(S.copied); }, function () { fallback(); });
    else fallback();
    function fallback() { var ta = D.createElement('textarea'); ta.value = text; D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); toast(S.copied); } catch (e) { /* 못 함 */ } ta.remove(); }
  }
  function dl(name, text, type) {
    var a = D.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: type }));
    a.href = u; a.download = name; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------- 결과 보여 주기 ---------- */
  function row(k, v) { return v ? '<dt>' + escH(k) + '</dt><dd>' + escH(v) + '</dd>' : ''; }
  function show(text) {
    var p = QRS.parse(text), h = '', act = '';
    h += '<p class="s-kind">' + escH(S.t[p.type] || p.type) + '</p>';
    if (p.type === 'url') {
      var r = p.risk;
      h += '<p class="s-goes">' + escH(S.goes) + '</p><p class="s-host" id="s-host">' + escH(r.main || r.host) + '</p>';
      if (r.host && r.host !== r.main) h += '<p class="s-full">' + escH(r.host) + '</p>';
      h += '<p class="s-full"><span class="sr">' + escH(S.full) + ': </span>' + escH(p.url) + '</p>';
      h += r.flags.length ? '<ul class="s-flags" id="s-flags">' + r.flags.map(function (f) { return '<li data-f="' + f + '">' + escH(S.flags[f]) + '</li>'; }).join('') + '</ul>' : '<p class="s-safe">' + escH(S.safe_none) + '</p>';
      if (r.openable) act += '<a class="btn ghost" id="s-open" href="' + escH(r.url) + '" target="_blank" rel="noopener noreferrer nofollow">' + escH(S.open) + '</a>';
      act += '<button type="button" class="btn ghost" data-copy="' + escH(p.url) + '">' + escH(S.copy) + '</button>';
    } else if (p.type === 'wifi') {
      h += '<dl class="s-dl">' + row(S.wifi_ssid, p.ssid) + (p.password ? '<dt>' + escH(S.wifi_pass) + '</dt><dd><span class="mask" id="s-pw" data-pw="' + escH(p.password) + '">' + '•'.repeat(Math.min(12, p.password.length)) + '</span> <button type="button" class="lnk" id="s-pwt" aria-pressed="false">' + escH(S.show) + '</button></dd>' : '') +
        row(S.wifi_auth, p.auth || 'nopass') + (p.hidden ? row(S.wifi_hidden, S.yes) : '') + '</dl>';
      if (p.password) act += '<button type="button" class="btn ghost" data-copy="' + escH(p.password) + '">' + escH(S.copy) + ' (' + escH(S.wifi_pass) + ')</button>';
      act += '<button type="button" class="btn ghost" data-copy="' + escH(p.ssid) + '">' + escH(S.copy) + ' (' + escH(S.wifi_ssid) + ')</button>';
    } else if (p.type === 'vcard') {
      h += '<dl class="s-dl">' + row(S.v_name, p.name) + row(S.v_org, p.org) + row(S.v_title, p.title) + p.phones.map(function (x) { return row(S.v_tel, x); }).join('') + p.emails.map(function (x) { return row(S.v_email, x); }).join('') +
        p.urls.map(function (x) { return row(S.v_url, x); }).join('') + row(S.v_adr, p.adr) + row(S.v_note, p.note) + '</dl>';
      act += '<button type="button" class="btn ghost" id="s-vcf">' + escH(S.save_vcf) + '</button>';
    } else if (p.type === 'event') {
      h += '<dl class="s-dl">' + row(S.e_title, p.title) + row(S.e_start, p.start) + row(S.e_end, p.end) + row(S.e_loc, p.location) + '</dl>';
      act += '<button type="button" class="btn ghost" id="s-ics">' + escH(S.save_ics) + '</button>';
    } else if (p.type === 'email') {
      h += '<dl class="s-dl">' + row(S.m_to, p.to) + row(S.m_sub, p.subject) + row(S.m_body, p.body) + '</dl>';
      act += '<a class="btn ghost" href="' + escH(text.trim().indexOf('mailto:') === 0 ? text.trim() : 'mailto:' + p.to) + '">' + escH(S.open_app) + '</a><button type="button" class="btn ghost" data-copy="' + escH(p.to) + '">' + escH(S.copy) + '</button>';
    } else if (p.type === 'sms' || p.type === 'tel') {
      h += '<dl class="s-dl">' + row(S.s_phone, p.phone) + row(S.s_msg, p.message) + '</dl>';
      if (p.paid) h += '<ul class="s-flags" id="s-flags"><li data-f="paid">' + escH(S.flags.paid) + '</li></ul>';
      act += '<a class="btn ghost" href="' + escH(p.type === 'tel' ? 'tel:' + p.phone : 'sms:' + p.phone + (p.message ? '?body=' + encodeURIComponent(p.message) : '')) + '">' + escH(S.open_app) + '</a><button type="button" class="btn ghost" data-copy="' + escH(p.phone) + '">' + escH(S.copy) + '</button>';
    } else if (p.type === 'geo') {
      h += '<dl class="s-dl">' + row('lat', p.lat) + row('lng', p.lng) + '</dl>';
      act += '<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat + ',' + p.lng) + '">' + escH(S.g_open) + '</a>';
    } else if (p.type === 'blocked') {
      h += '<ul class="s-flags"><li data-f="blocked">' + escH(S.flags.blocked) + '</li></ul>';
      act += '<button type="button" class="btn ghost" data-copy="' + escH(text) + '">' + escH(S.copy) + '</button>';
    } else {
      h += '<p class="s-text" style="white-space:pre-wrap;word-break:break-all">' + escH(p.text) + '</p>';
      act += '<button type="button" class="btn ghost" data-copy="' + escH(text) + '">' + escH(S.copy) + '</button>';
    }
    act += '<button type="button" class="btn main" id="s-again">' + escH(S.again) + '</button>';
    h += '<div class="s-act">' + act + '</div>';
    if (p.type !== 'text') h += '<details class="s-raw"><summary class="lnk">' + escH(S.raw) + '</summary><pre>' + escH(text) + '</pre></details>';
    var res = $('s-res');
    res.innerHTML = h; res.hidden = false; $('s-empty').hidden = true;
    res.dataset.type = p.type;
    window.__scan = { text: text, parsed: p };
    var pwt = $('s-pwt');
    if (pwt) pwt.addEventListener('click', function () {
      var pw = $('s-pw'), on = pwt.getAttribute('aria-pressed') !== 'true';
      pw.textContent = on ? pw.getAttribute('data-pw') : '•'.repeat(Math.min(12, pw.getAttribute('data-pw').length));
      pw.classList.toggle('mask', !on);
      pwt.setAttribute('aria-pressed', on ? 'true' : 'false'); pwt.textContent = on ? S.hide : S.show;
    });
    var vcf = $('s-vcf'); if (vcf) vcf.addEventListener('click', function () { dl('contact.vcf', text, 'text/vcard'); });
    var ics = $('s-ics'); if (ics) ics.addEventListener('click', function () {
      var body = /BEGIN:VCALENDAR/i.test(text) ? text : 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Staycode//QR//EN\r\n' + text.trim() + '\r\nEND:VCALENDAR\r\n';
      dl('event.ics', body, 'text/calendar');
    });
    $('s-again').addEventListener('click', function () { lastText = null; res.hidden = true; $('s-empty').hidden = false; msg(''); if (stream) loop(); else $('s-cam').focus(); });
    res.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-copy')); }); });
    if (window.matchMedia && matchMedia('(max-width: 899px)').matches) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 그림에서 읽기 ---------- */
  /* 그림 하나를 몇 가지 크기로 읽어 본다(사진·스크린샷은 크기가 제각각이고, 브라우저 안 판독기는 크기에 따라 읽고 못 읽고가 갈린다).
     카메라는 매번 새 그림이 오므로 한 번만(quick) */
  function draw(img, long, blur) {
    var w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height;
    var k = long / Math.max(w, h);
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var c = cv.getContext('2d', { willReadFrequently: true });
    c.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(img, 0, 0, cv.width, cv.height);
    c.filter = 'none';
    return c.getImageData(0, 0, cv.width, cv.height);
  }
  function fromImage(img, quick) {
    var w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height, big = Math.max(w, h);
    var tries = quick ? [[Math.min(big, 900), 0]] : [[Math.min(Math.max(big, 600), 1600), 0], [520, 0], [800, 0], [380, 0], [700, 1]];
    var i = 0;
    function next() {
      var t = tries[i++];
      return QRV.decode(draw(img, t[0], t[1]), 'both').then(function (r) { return r.ok || i >= tries.length ? r : next(); });
    }
    return next();
  }
  function readFile(f) {
    if (!f || !/^image\//.test(f.type)) { msg(S.none, true); return; }
    stopCam();
    msg('');
    var u = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      fromImage(img).then(function (r) { URL.revokeObjectURL(u); if (r.ok) show(r.text); else msg(S.none, true); });
    };
    img.onerror = function () { URL.revokeObjectURL(u); msg(S.none, true); };
    img.src = u;
  }
  $('s-file').addEventListener('change', function () { var f = this.files && this.files[0]; this.value = ''; readFile(f); });
  D.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) if (/^image\//.test(items[i].type)) { e.preventDefault(); readFile(items[i].getAsFile()); return; }
  });
  $('s-paste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.read) { msg(S.paste_denied, true); return; }
    navigator.clipboard.read().then(function (items) {
      for (var i = 0; i < items.length; i++) {
        var t = items[i].types.filter(function (x) { return /^image\//.test(x); })[0];
        if (t) return items[i].getType(t).then(function (b) { readFile(new File([b], 'paste', { type: t })); });
      }
      msg(S.paste_none, true);
    }).catch(function () { msg(S.paste_denied, true); });
  });
  // 끌어다 놓기
  var out = $('s-out');
  out.addEventListener('dragover', function (e) { e.preventDefault(); });
  out.addEventListener('drop', function (e) { e.preventDefault(); var f = e.dataTransfer.files && e.dataTransfer.files[0]; readFile(f); });

  /* ---------- 카메라 ---------- */
  var video = $('s-video');
  function stopCam() {
    cancelAnimationFrame(raf); raf = 0;
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    $('s-camw').hidden = true; $('s-cam').hidden = false;
  }
  var lastTry = 0;
  function loop() {
    raf = requestAnimationFrame(function (t) {
      if (!stream) return;
      if (!busy && video.readyState >= 2 && t - lastTry > 220) {
        lastTry = t; busy = true;
        fromImage(video, true).then(function (r) {
          busy = false;
          if (r.ok && r.text !== lastText) {
            lastText = r.text;
            if (navigator.vibrate) navigator.vibrate(40);
            show(r.text);
            cancelAnimationFrame(raf); raf = 0;   // 읽으면 멈춘다('다시 찍기'로 이어서)
            return;
          }
          if (stream) loop();
        });
        return;
      }
      loop();
    });
  }
  $('s-cam').addEventListener('click', function () {
    msg('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg(S.cam_none, true); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).then(function (s) {
      stream = s; video.srcObject = s;
      $('s-camw').hidden = false; $('s-cam').hidden = true;
      video.play().catch(function () { /* 자동 재생 막힘: 화면을 누르면 재생 */ });
      lastText = null;
      loop();
      $('s-stop').focus();
    }).catch(function (e) { msg(e && e.name === 'NotFoundError' ? S.cam_none : S.cam_denied, true); });
  });
  $('s-stop').addEventListener('click', function () { stopCam(); $('s-cam').focus(); });
  D.addEventListener('visibilitychange', function () { if (D.hidden && stream) stopCam(); });
  window.addEventListener('pagehide', stopCam);
})();
