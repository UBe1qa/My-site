/* 화면 연결. 계산은 core.js(CAL), 종이 배치는 sheet.js(SHEET). 입력은 이 기기 밖으로 나가지 않는다.
   기기에 저장하는 것: localStorage 'cal.lang' 하나(다른 언어 안내 띠를 닫았는지). 달력 설정은 저장하지 않는다. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement, KO = /^ko\b/i.test(html.lang), LANG = KO ? 'ko' : 'en';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function today() { var t = new Date(); return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; }
  var WD = KO ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function mName(m) { return KO ? m + '월' : EN_M[m - 1]; }
  var TX = KO ? {
    kinds: { 'year-landscape': '1년 한 장 · 가로', 'year-portrait': '1년 한 장 · 세로', months: '월별 12장', month: '한 달' },
    pages: function (n) { return n + '쪽'; }, land: '가로', port: '세로', saved: '받았어요 ✓', making: '만드는 중…', savedSr: '파일을 받았어요.',
    fail: '파일을 만들지 못했어요. 인쇄 단추를 눌러 PDF로 저장해 보세요.', close: '닫기', zoom: '크게 보기',
    today: '오늘', inDays: function (n) { return n + '일 뒤'; },
    date: function (h) { return h.m + '월 ' + h.d + '일 ' + WD[h.wd]; }
  } : {
    kinds: { 'year-landscape': 'Year on a page · landscape', 'year-portrait': 'Year on a page · portrait', months: '12 monthly pages', month: 'One month' },
    pages: function (n) { return n + (n > 1 ? ' pages' : ' page'); }, land: 'landscape', port: 'portrait', saved: 'Saved ✓', making: 'Working…', savedSr: 'File saved.',
    fail: 'Could not create the file. Use Print and choose “Save as PDF” instead.', close: 'Close', zoom: 'Enlarge',
    today: 'today', inDays: function (n) { return 'in ' + n + (n === 1 ? ' day' : ' days'); },
    date: function (h) { return WD[h.wd] + ', ' + EN_M[h.m - 1].slice(0, 3) + ' ' + h.d; }
  };

  // ---------- 다른 언어 안내 띠(겹쳐 띄움, 자동으로 넘기지 않음) ----------
  (function () {
    var saved = null; try { saved = localStorage.getItem('cal.lang'); } catch (e) {}
    var userKo = /^ko\b/i.test(navigator.language || '');
    var alt = $('link[rel="alternate"][hreflang="' + (KO ? 'en' : 'ko') + '"]');
    var href = alt ? alt.getAttribute('href').replace(/^https?:\/\/[^/]+/, '') : (KO ? '/' : '/ko/');
    $$('a.lang').forEach(function (a) { a.addEventListener('click', function () { try { localStorage.setItem('cal.lang', KO ? 'en' : 'ko'); } catch (e) {} }); });
    if (saved || userKo === KO) return;
    var bar = doc.createElement('div'); bar.className = 'lang-bar'; bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', KO ? 'Language' : '언어');
    var a = doc.createElement('a'); a.href = href; a.lang = KO ? 'en' : 'ko'; a.textContent = KO ? 'English version →' : '한국어로 보기 →';
    var x = doc.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', KO ? 'Close' : '닫기');
    a.addEventListener('click', function () { try { localStorage.setItem('cal.lang', KO ? 'en' : 'ko'); } catch (e) {} });
    x.addEventListener('click', function () { try { localStorage.setItem('cal.lang', LANG); } catch (e) {} bar.remove(); });
    bar.appendChild(a); bar.appendChild(x); doc.body.appendChild(bar);
  })();

  if (window.CAL_ADS) window.CAL_ADS.mount();

  // ---------- 머리 메뉴 '월 달력'은 오늘이 든 달로(그 달 페이지가 있을 때만) ----------
  (function () {
    var a = $('a[data-nav-month]'); if (!a) return;
    var t = today(), list = (a.dataset.navMonth || '').split(',');
    if (list.indexOf(t[0] + '-' + t[1]) < 0) return;
    a.setAttribute('href', KO ? '/ko/' + t[0] + '/' + t[1] + '/' : '/' + t[0] + '/' + EN_M[t[1] - 1].toLowerCase() + '/');
  })();

  // ---------- 연출 3: 루멘랩 종이의 접힌 귀퉁이(화면에 들어올 때 한 번) ----------
  (function () {
    window.__calOn = 1;
    var l = $('.lumen'); if (!l) return;
    if (reduce || !('IntersectionObserver' in window)) { l.classList.add('in'); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { l.classList.add('in'); io.disconnect(); } }, { threshold: .7 });
    io.observe(l);
  })();

  if (!window.CAL || !window.SHEET) return;

  // ---------- 파일 만들기 ----------
  function fontsReady(sheets) {
    if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
    var text = {};
    sheets.forEach(function (s) { s.items.forEach(function (i) { if (i.t) for (var k = 0; k < i.s.length; k++) text[i.s[k]] = 1; }); });
    var all = Object.keys(text).join('');
    var wait = Promise.all([450, 650, 800].map(function (w) { return doc.fonts.load(w + ' 20px "Pretendard Variable"', all); })).catch(function () {});
    return Promise.race([wait, new Promise(function (r) { setTimeout(r, 3000); })]);
  }
  function toCanvas(sheet, dpi) {
    var k = dpi / 25.4, c = doc.createElement('canvas');
    c.width = Math.round(sheet.w * k); c.height = Math.round(sheet.h * k);
    SHEET.draw(c.getContext('2d'), sheet, k);
    return c;
  }
  function blobOf(canvas, type, q) { return new Promise(function (res, rej) { canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, type, q); }); }
  // 라이브러리 없는 아주 작은 PDF: 쪽마다 JPEG 한 장.
  function pdfOf(pages) {
    var enc = new TextEncoder(), parts = [], offs = [], pos = 0, n = pages.length;
    function put(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); pos += b.length; }
    function obj(id, body) { offs[id] = pos; put(id + ' 0 obj\n' + body + '\nendobj\n'); }
    put('%PDF-1.4\n%âãÏÓ\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    var kids = []; for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');
    pages.forEach(function (p, i) {
      var id = 3 + i * 3, w = p.wpt.toFixed(2), h = p.hpt.toFixed(2), cs = 'q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q';
      obj(id, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 ' + (id + 2) + ' 0 R >> >> /Contents ' + (id + 1) + ' 0 R >>');
      obj(id + 1, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
      offs[id + 2] = pos;
      put((id + 2) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.wpx + ' /Height ' + p.hpx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      put(p.jpeg); put('\nendstream\nendobj\n');
    });
    var total = 3 + n * 3, xref = pos, s = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var k = 1; k < total; k++) s += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
    put(s + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }
  function makePdf(sheets) {
    var dpi = sheets.length > 1 ? 150 : 200;
    return fontsReady(sheets).then(function () {
      var out = [], chain = Promise.resolve();
      sheets.forEach(function (sh) {
        chain = chain.then(function () {
          var c = toCanvas(sh, dpi);
          return blobOf(c, 'image/jpeg', 0.92).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
            out.push({ jpeg: new Uint8Array(buf), wpx: c.width, hpx: c.height, wpt: sh.w / 25.4 * 72, hpt: sh.h / 25.4 * 72 });
            c.width = c.height = 0;
          });
        });
      });
      return chain.then(function () { return pdfOf(out); });
    });
  }
  function makePng(sheet) { return fontsReady([sheet]).then(function () { return blobOf(toCanvas(sheet, 200), 'image/png'); }); }
  function save(blob, name) {
    var file = null; try { file = new File([blob], name, { type: blob.type }); } catch (e) {}
    if (file && /iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file] }).catch(function () {});
    }
    var a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; doc.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return Promise.resolve();
  }

  // ---------- 인쇄: 종이만, 쪽 크기는 설정대로 ----------
  var printRoot = $('#print-root'), pageStyle = null, printSource = null;
  function preparePrint() {
    if (!printSource || !printRoot) return false;
    var sheets = printSource();
    if (!sheets.length) return false;
    if (!pageStyle) { pageStyle = doc.createElement('style'); doc.head.appendChild(pageStyle); }
    pageStyle.textContent = '@page{size:' + sheets[0].w + 'mm ' + sheets[0].h + 'mm;margin:0}';
    printRoot.style.setProperty('--pw', sheets[0].w + 'mm'); printRoot.style.setProperty('--ph', (sheets[0].h - 0.3) + 'mm');
    printRoot.innerHTML = sheets.map(function (s) { return SHEET.svg(s, 'print-svg'); }).join('');
    html.classList.add('print-sheet');
    return true;
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', function () { html.classList.remove('print-sheet'); if (printRoot) printRoot.textContent = ''; });

  // ---------- 연출 1: 한 장 뽑기 + '받았어요' ----------
  var liveSr = doc.createElement('p'); liveSr.className = 'live-sr'; liveSr.setAttribute('aria-live', 'polite'); doc.body.appendChild(liveSr);
  var lastDone = { key: '', at: 0 };
  function celebrate(btn, box, key) {
    var now = Date.now();
    if (key === lastDone.key && now - lastDone.at < 2000) return;
    lastDone = { key: key, at: now };
    liveSr.textContent = TX.savedSr;
    if (btn && !btn.dataset.label) {
      var span = $('span', btn) || btn;
      btn.dataset.label = span.textContent; btn.style.width = btn.offsetWidth + 'px'; span.textContent = TX.saved;
      setTimeout(function () { span.textContent = btn.dataset.label; delete btn.dataset.label; btn.style.width = ''; }, 1200);
    }
    if (reduce || !box || !box.animate || doc.hidden) return;
    var s = doc.createElement('div'); s.className = 'sheet-out'; s.setAttribute('aria-hidden', 'true'); box.appendChild(s);
    var an = s.animate([{ transform: 'translateY(0) rotate(0)', opacity: .96 }, { transform: 'translateY(18%) rotate(1.5deg)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.3,.6,.2,1)' });
    an.onfinish = an.oncancel = function () { s.remove(); };
  }
  function busy(btn, on) { if (btn) btn.setAttribute('aria-busy', on ? 'true' : 'false'); }
  function failed() { liveSr.textContent = TX.fail; alert(TX.fail); }

  // ---------- 크게 보기 ----------
  function zoom(svg) {
    var d = doc.createElement('dialog'); d.className = 'zoom';
    d.innerHTML = '<div class="zoom-in">' + svg + '</div><button type="button" class="zoom-x">' + TX.close + '</button>';
    doc.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target.closest('.zoom-x') || e.target === d || e.target.classList.contains('zoom-in')) d.close(); });
    d.addEventListener('close', function () { d.remove(); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }

  // ---------- 달력 만들기(첫 화면·연간 페이지) ----------
  $$('[data-tool]').forEach(function (el) {
    var t = today(), ds = el.dataset;
    var S = { lang: LANG, country: ds.country, year: +ds.year, paper: ds.paper, kind: 'year', orient: 'landscape', month: (+ds.year === t[0] ? t[1] : 1),
      weekStart: 0, mono: false, names: true, week: false, lunar: true, terms: true, son: false };
    var MIN = 2025, MAX = 2030, fixed = ds.fixed === '1';
    var paper = $('.paper', el), crop = $('.crop', el), pdfBtn = $('[data-pdf]', el), first = true;
    function opts(kind, month, orient) {
      var k = kind || S.kind;
      return { kind: k === 'year' ? 'year' : 'month', year: S.year, month: month || S.month, lang: S.lang, country: S.country, paper: S.paper,
        orient: k === 'year' ? (orient || S.orient) : 'landscape', weekStart: S.weekStart, mono: S.mono,
        show: { names: S.names, week: S.week, lunar: S.lunar, terms: S.terms, son: S.son } };
    }
    function sheets() {
      if (S.kind === 'months') { var a = []; for (var m = 1; m <= 12; m++) a.push(SHEET.build(opts('month', m))); return a; }
      return [SHEET.build(opts())];
    }
    function fileOpts() { var o = opts(); o.kind = S.kind === 'months' ? 'months' : o.kind; return o; }
    function basis() {
      var h = CAL.holidays(S.country, S.year), b = h ? h.basis : '', p = KO ? '/ko/' : '/', y = S.year;
      var link = (y === 2026 || y === 2027) ? (KO ? ' <a href="' + p + y + '/holidays/">' + y + '년 공휴일 보기</a>' : ' <a href="' + p + y + '/holidays/">See the ' + y + ' holiday list</a>') : '';
      var est = b === 'rule', s;
      if (S.country === 'KR') {
        if (KO) s = b === 'official' ? '공휴일 기준: 관공서의 공휴일에 관한 규정(2026년 4월 개정 반영), ' + (y === 2027 ? '우주항공청 2027년 월력요항.' : '한국천문연구원 달력자료.')
          : b === 'provisional' ? '공휴일 기준: 관공서의 공휴일에 관한 규정(2026년 4월 개정 반영), 한국천문연구원 달력자료. ' + y + '년 월력요항은 아직 발표 전이에요.'
          : b === 'rule' ? y + '년은 규정으로 계산한 예상이에요. 선거일·임시공휴일·절기는 정해지면 더해요.'
          : '공휴일 기준: ' + y + '년에 확정된 공휴일(임시공휴일·선거일 포함).';
        else s = b === 'rule' ? y + ' is projected from South Korea’s holiday rules. Election days and one-off holidays are added once they are announced.'
          : 'Holidays: South Korea’s public holiday rules as amended in April 2026' + (b === 'provisional' ? ' (the official ' + y + ' almanac notice is not out yet).' : '.');
      } else s = KO ? '공휴일 기준: 미국 연방 공휴일(5 U.S.C. 6103), 주말과 겹치면 쉬는 날(관측일)까지 표시해요.' : 'Holidays: US federal holidays under 5 U.S.C. 6103, with the observed weekday when one falls on a weekend.';
      var e = $('[data-basis]', el); e.innerHTML = s + link; e.classList.toggle('is-est', est);
    }
    function render() {
      var o = opts(), sh = SHEET.build(o), key = S.kind === 'year' ? 'year-' + S.orient : S.kind;
      crop.style.setProperty('--ratio', (sh.w / sh.h).toFixed(4));
      paper.innerHTML = SHEET.svg(sh) + '<span class="zoom-hint" aria-hidden="true">' + TX.zoom + '</span>';
      if (!first && !reduce) { paper.classList.remove('is-swap'); void paper.offsetWidth; paper.classList.add('is-swap'); }
      $$('[data-y]', el).forEach(function (e) { e.textContent = S.year; });
      $('[data-what]', el).textContent = TX.kinds[key] + (S.kind === 'month' ? ' · ' + mName(S.month) : '');
      $('[data-meta]', el).textContent = (S.paper === 'a4' ? 'A4' : 'Letter') + ' · PDF ' + TX.pages(S.kind === 'months' ? 12 : 1);
      var st = SHEET.staticFile(fileOpts());
      pdfBtn.setAttribute('href', st || '#'); if (st) pdfBtn.setAttribute('download', ''); else pdfBtn.removeAttribute('download');
      var ms = $('.mstep', el); ms.hidden = S.kind === 'year'; $('b', ms).textContent = mName(S.month);
      $$('.shape', el).forEach(function (b) {
        var k = b.dataset.kind, on = k === S.kind && (k !== 'year' || b.dataset.orient === S.orient);
        b.setAttribute('aria-pressed', on);
        var th = $('.thumb', b), so = opts(k === 'months' ? 'month' : k, k === 'months' ? 1 : S.month, b.dataset.orient), ssh = SHEET.build(so);
        th.style.setProperty('--ratio', (ssh.w / ssh.h).toFixed(4)); th.innerHTML = SHEET.svg(ssh, 'thumb-svg').replace(' role="img"', ' aria-hidden="true"');
        var sm = $('[data-mname]', b); if (sm) sm.textContent = mName(S.month);
      });
      var x = $('[data-xlsx]', el);
      if (x) { var okx = KO && S.country === 'KR' && S.year >= 2026 && S.year <= 2028; x.hidden = !okx; if (okx) x.setAttribute('href', '/files/' + S.year + '-calendar-korea.xlsx'); }
      $$('[data-only="month-kr"]', el).forEach(function (e) { e.hidden = !(S.kind !== 'year' && S.country === 'KR'); });
      var pv = $('[data-step="-1"]', el), nx = $('[data-step="1"]', el);
      if (pv) { pv.disabled = S.year <= MIN; nx.disabled = S.year >= MAX; }
      basis();
      first = false;
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button,a'); if (!b || !el.contains(b)) return;
      if (b.dataset.step && !fixed) { S.year = Math.max(MIN, Math.min(MAX, S.year + (+b.dataset.step))); render(); }
      else if (b.dataset.mstep) { S.month = (S.month - 1 + (+b.dataset.mstep) + 12) % 12 + 1; render(); }
      else if (b.classList.contains('shape')) { S.kind = b.dataset.kind; if (b.dataset.orient) S.orient = b.dataset.orient; render(); }
      else if (b.dataset.seg) { S[b.dataset.seg] = +b.dataset.v; $$('[data-seg="' + b.dataset.seg + '"]', el).forEach(function (k) { k.setAttribute('aria-pressed', k === b); }); render(); }
      else if (b.classList.contains('opt-toggle') || b.dataset.optClose !== undefined) toggleOpts();
      else if (b === paper) zoom(SHEET.svg(SHEET.build(opts())));
      else if (b === pdfBtn) {
        var key = JSON.stringify(fileOpts());
        if (pdfBtn.hasAttribute('download')) { celebrate(pdfBtn, paper, key); return; }
        e.preventDefault(); busy(pdfBtn, true);
        makePdf(sheets()).then(function (blob) { return save(blob, SHEET.fileBase(fileOpts()) + '.pdf'); })
          .then(function () { busy(pdfBtn, false); celebrate(pdfBtn, paper, key); }, function () { busy(pdfBtn, false); failed(); });
      } else if (b.dataset.png !== undefined) {
        busy(b, true);
        makePng(SHEET.build(opts())).then(function (blob) { return save(blob, SHEET.fileBase(opts()) + '.png'); })
          .then(function () { busy(b, false); celebrate(null, paper, 'png' + JSON.stringify(opts())); }, function () { busy(b, false); failed(); });
      } else if (b.dataset.print !== undefined) { printSource = sheets; if (preparePrint()) window.print(); }
    });
    el.addEventListener('change', function (e) {
      var i = e.target;
      if (i.dataset.opt === 'paper' || i.dataset.opt === 'country') S[i.dataset.opt] = i.value;
      else if (i.dataset.opt) S[i.dataset.opt] = i.checked;
      render();
    });
    function toggleOpts() {
      var tg = $('.opt-toggle', el), box = $('.opts', el), open = box.hidden;
      box.hidden = !open; tg.setAttribute('aria-expanded', open);
      var mobile = window.matchMedia('(max-width: 900px)').matches;
      el.classList.toggle('is-opts', open && mobile);
      if (open && mobile) {
        el.style.setProperty('--ph0', crop.offsetHeight + 'px');
        requestAnimationFrame(function () {
          el.style.setProperty('--ph', crop.offsetHeight + 'px');
          $('.paper-box', el).scrollIntoView({ block: 'start', behavior: 'auto' }); window.scrollBy(0, -8);
        });
      }
    }
    printSource = sheets;
    render();
  });

  // ---------- 월 페이지 ----------
  $$('[data-month-page]').forEach(function (el) {
    var ds = el.dataset, y = +ds.year, m = +ds.month, t = today();
    function sheet() { return SHEET.build({ kind: 'month', year: y, month: m, lang: LANG, country: ds.country, paper: ds.paper, show: { names: true, lunar: true, terms: true, son: true } }); }
    function base() { return SHEET.fileBase({ kind: 'month', year: y, month: m, lang: LANG, country: ds.country, paper: ds.paper }); }
    printSource = function () { return [sheet()]; };
    var box = $('.wm-box', el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pdf !== undefined) {
        busy(b, true);
        makePdf([sheet()]).then(function (blob) { return save(blob, base() + '.pdf'); }).then(function () { busy(b, false); celebrate(b, box, 'm' + y + m); }, function () { busy(b, false); failed(); });
      } else if (b.dataset.png !== undefined) {
        busy(b, true);
        makePng(sheet()).then(function (blob) { return save(blob, base() + '.png'); }).then(function () { busy(b, false); celebrate(null, box, 'p' + y + m); }, function () { busy(b, false); failed(); });
      } else if (b.dataset.print !== undefined) { if (preparePrint()) window.print(); }
    });
    // 연출 2: 오늘 동그라미(이번 달 페이지에서만, 한 번)
    if (t[0] === y && t[1] === m) {
      var td = $('td[data-d="' + t[2] + '"]', el);
      if (td) {
        td.classList.add('is-today');
        var sr = doc.createElement('span'); sr.className = 'sr'; sr.textContent = ' (' + TX.today + ')'; $('b', td).appendChild(sr);
        $('b', td).insertAdjacentHTML('beforeend', '<svg class="today-ring" viewBox="0 0 40 36" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" vector-effect="non-scaling-stroke" d="M20 3.5c9.5-.8 17 5.6 17 14.3 0 8.9-7.4 15-17.2 14.7C10.4 32.2 3 26.6 3.2 17.6 3.4 9.200 10.8 3.2 22.5 3.9"/></svg>');
        var ring = $('.today-ring', td);
        if (reduce || !('IntersectionObserver' in window)) ring.classList.add('on');
        else {
          var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting && !doc.hidden) { ring.classList.add('on'); io.disconnect(); } }, { threshold: .6 });
          io.observe(td);
        }
      }
    }
  });

  // ---------- 다가오는 쉬는 날(오늘 기준으로 다시 채움, 줄 수는 그대로) ----------
  $$('[data-up]').forEach(function (ul) {
    var t = today(), n0 = CAL.dn(t[0], t[1], t[2]), items = [], c = ul.dataset.country, lis = $$('li', ul);
    [t[0], t[0] + 1].forEach(function (yy) {
      var h = CAL.holidays(c, yy); if (!h) return;
      h.list.forEach(function (x) { var n = CAL.dn(x.y, x.m, x.d); if (n >= n0 && items.length < lis.length) items.push([x, n - n0]); });
    });
    if (items.length < lis.length) return;
    lis.forEach(function (li, i) {
      var x = items[i][0], d = items[i][1];
      li.innerHTML = '<time datetime="' + x.date + '"></time><span></span><small></small>';
      li.children[0].textContent = TX.date(x);
      li.children[1].textContent = SHEET.label(x, { lang: LANG, country: c });
      li.children[2].textContent = d === 0 ? TX.today : TX.inDays(d);
    });
  });

  // ---------- 음력 변환 ----------
  $$('[data-lunar]').forEach(function (el) {
    var t = today();
    function val(n) { var v = $('[name="' + n + '"]', el).value.trim(); return /^\d+$/.test(v) ? +v : NaN; }
    function out(sel, main, sub, err) { var o = $(sel, el); o.classList.toggle('is-err', !!err); o.innerHTML = '<b></b><span></span>'; o.children[0].textContent = main; o.children[1].textContent = sub || ''; }
    var RANGE = '지원 범위는 양력 1912년 2월 18일 ~ 2050년 1월 22일이에요.';
    function s2l() {
      var y = val('sy'), m = val('sm'), d = val('sd');
      if (isNaN(y) || isNaN(m) || isNaN(d)) return out('[data-out="s2l"]', '날짜를 숫자로 넣어 주세요.', '', 1);
      if (!CAL.valid(y, m, d)) return out('[data-out="s2l"]', '달력에 없는 날짜예요.', y + '년 ' + m + '월 ' + d + '일', 1);
      var l = CAL.lunar.fromSolar(y, m, d);
      if (!l) return out('[data-out="s2l"]', '지원 범위 밖이에요.', RANGE, 1);
      out('[data-out="s2l"]', '음력 ' + l.y + '년 ' + (l.leap ? '윤' : '') + l.m + '월 ' + l.d + '일',
        '양력 ' + y + '년 ' + m + '월 ' + d + '일 ' + WD[CAL.wd(y, m, d)] + '요일 · 이 달은 ' + (l.days === 30 ? '큰달(30일)' : '작은달(29일)') + (CAL.sonDay(l.d) ? ' · 손 없는 날' : ''));
    }
    function l2s() {
      var y = val('ly'), m = val('lm'), d = val('ld'), leap = $('[name="leap"]', el).checked;
      if (isNaN(y) || isNaN(m) || isNaN(d)) return out('[data-out="l2s"]', '날짜를 숫자로 넣어 주세요.', '', 1);
      if (y < CAL.lunar.firstYear || y > CAL.lunar.lastYear) return out('[data-out="l2s"]', '지원 범위 밖이에요.', '음력 ' + CAL.lunar.firstYear + '년 ~ ' + CAL.lunar.lastYear + '년만 바꿀 수 있어요.', 1);
      var s = CAL.lunar.toSolar(y, m, d, leap);
      if (!s) {
        var ms = CAL.lunar.months(y), lm = ms.filter(function (x) { return x.leap; })[0], mo = ms.filter(function (x) { return x.m === m && x.leap === leap; })[0];
        if (m < 1 || m > 12 || d < 1 || d > 30) return out('[data-out="l2s"]', '음력에 없는 날짜예요.', '월은 1~12, 일은 1~30이에요.', 1);
        if (leap && !mo) return out('[data-out="l2s"]', '음력 ' + y + '년에는 윤' + m + '월이 없어요.', lm ? '이 해의 윤달은 윤' + lm.m + '월이에요.' : '이 해에는 윤달이 없어요.', 1);
        return out('[data-out="l2s"]', '음력 ' + y + '년 ' + (leap ? '윤' : '') + m + '월은 29일까지예요.', '작은달이라 30일이 없어요.', 1);
      }
      out('[data-out="l2s"]', '양력 ' + s[0] + '년 ' + s[1] + '월 ' + s[2] + '일 ' + WD[CAL.wd(s[0], s[1], s[2])] + '요일', '음력 ' + y + '년 ' + (leap ? '윤' : '') + m + '월 ' + d + '일');
    }
    $('[name="sy"]', el).value = t[0]; $('[name="sm"]', el).value = t[1]; $('[name="sd"]', el).value = t[2];
    var l0 = CAL.lunar.fromSolar(t[0], t[1], t[2]);
    if (l0) { $('[name="ly"]', el).value = l0.y; $('[name="lm"]', el).value = l0.m; $('[name="ld"]', el).value = l0.d; $('[name="leap"]', el).checked = l0.leap; }
    el.addEventListener('input', function (e) { if (/^s/.test(e.target.name)) s2l(); else l2s(); });
    el.addEventListener('change', function (e) { if (e.target.name === 'leap') l2s(); });
    s2l(); l2s();
    // 이번 달 음력 달력
    var box = $('[data-lmonth]'), cy = t[0], cm = t[1];
    function month() {
      $('[data-lm-title]').textContent = cy + '년 ' + cm + '월';
      $('.wm-box', box).innerHTML = SHEET.webMonth({ year: cy, month: cm, lang: 'ko', country: 'KR' });
      if (cy === t[0] && cm === t[1]) { var td = $('td[data-d="' + t[2] + '"]', box); if (td) td.classList.add('is-today'); }
    }
    if (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-lstep]'); if (!b) return;
        var n = cy * 12 + cm - 1 + (+b.dataset.lstep); cy = Math.floor(n / 12); cm = n % 12 + 1;
        if (cy < 1913) { cy = 1913; cm = 1; } if (cy > 2049) { cy = 2049; cm = 12; }
        month();
      });
      month();
    }
  });

})();
