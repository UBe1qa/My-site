/* 화면 연결. 계산은 core.js(CAL), 종이 배치는 sheet.js(SHEET), 글자 PDF는 pdf.js(PDFDOC).
   만든 파일과 음력 변환에 넣은 날짜는 이 기기 밖으로 나가지 않는다. 달력 설정은 주소(?w=mon&p=a4 …)에 담는다(저장은 하지 않는다).
   주소는 설정을 바꾼 뒤 1.5초 가만히 있을 때 한 번만 고친다(바꿀 때마다 고치면 방문 통계가 그때마다 쪽 보기로 센다).
   기기에 저장하는 것: localStorage 'cal.lang' 하나(다른 언어 안내 띠를 닫았는지). */
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
    pngOne: '이 달만 이미지로', monthsTitle: function (y) { return y + '년 월별 달력'; }, site: '한장달력',
    imgNote: '글꼴을 불러오지 못해 300ppi 그림으로 저장했어요. 글자 그대로 받으려면 인쇄에서 ‘PDF로 저장’을 고르세요.',
    badUrl: '주소의 설정 가운데 쓸 수 없는 값이 있어 기본값으로 열었어요.',
    today: '오늘', inDays: function (n) { return n + '일 뒤'; },
    date: function (h) { return h.m + '월 ' + h.d + '일 ' + WD[h.wd]; }
  } : {
    kinds: { 'year-landscape': 'Year on a page · landscape', 'year-portrait': 'Year on a page · portrait', months: '12 monthly pages', month: 'One month' },
    pages: function (n) { return n + (n > 1 ? ' pages' : ' page'); }, land: 'landscape', port: 'portrait', saved: 'Saved ✓', making: 'Working…', savedSr: 'File saved.',
    fail: 'Could not create the file. Use Print and choose “Save as PDF” instead.', close: 'Close', zoom: 'Enlarge',
    pngOne: 'This month as image', monthsTitle: function (y) { return y + ' monthly calendar'; }, site: 'Onesheet',
    imgNote: 'The font could not be loaded, so this PDF was saved as a 300 ppi image. For real text, use Print and choose “Save as PDF”.',
    badUrl: 'Some settings in this link could not be used, so the defaults are shown.',
    today: 'today', inDays: function (n) { return 'in ' + n + (n === 1 ? ' day' : ' days'); },
    date: function (h) { return WD[h.wd] + ', ' + EN_M[h.m - 1].slice(0, 3) + ' ' + h.d; }
  };

  // ---------- 다른 언어 안내 띠(자동으로 넘기지 않는다. 닫을 수 있고 내용을 밀지 않는다) ----------
  // 컴퓨터 폭에서 머리 줄의 메뉴와 언어 링크 사이가 비어 있으면 그 빈자리에 둔다(.is-docked): 누를 수 있는 것을 하나도 덮지 않고, 화면을 내려도 따라오지 않는다.
  // 자리가 모자라면(휴대폰, 좁은 창) 화면 아래에 띄우고, 내 설정이 열려 있는 동안은 숨긴다(style.css 의 body.has-opts).
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
    var last = $('header.top .nav a:last-child'), link = $('header.top a.lang'), wide = window.matchMedia('(min-width: 901px)'), raf = 0;
    function place() {
      raf = 0;
      if (!bar.parentNode) return;
      bar.classList.remove('is-docked'); bar.style.right = '';
      if (!last || !link || !wide.matches) return;
      var l = link.getBoundingClientRect(), n = last.getBoundingClientRect();
      if (l.left - n.right < bar.offsetWidth + 48) return;        // 메뉴와 띠 사이에 틈이 없으면 아래에 띄운다
      bar.style.right = Math.round(html.clientWidth - l.left + 14) + 'px';
      bar.classList.add('is-docked');
    }
    place();
    window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(place); });
    if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', function () { if (!raf) raf = requestAnimationFrame(place); });   // 글꼴이 늦게 오면 메뉴 폭이 달라진다
  })();

  if (window.CAL_ADS) window.CAL_ADS.mount();

  // ---------- 머리 메뉴 '월 달력'은 오늘이 든 달로(그 달 페이지가 없으면 가장 가까운 달로) ----------
  (function () {
    var a = $('a[data-nav-month]'); if (!a) return;
    var t = today(), now = t[0] * 12 + t[1], best = null;
    (a.dataset.navMonth || '').split(',').forEach(function (s) {
      var p = s.split('-'), n = p[0] * 12 + (+p[1]);
      if (p.length === 2 && (best === null || Math.abs(n - now) < Math.abs(best[0] - now))) best = [n, +p[0], +p[1]];
    });
    if (!best) return;
    a.setAttribute('href', KO ? '/ko/' + best[1] + '/' + best[2] + '/' : '/' + best[1] + '/' + EN_M[best[2] - 1].toLowerCase() + '/');
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
    var wait = Promise.all([500, 600, 700, 800].map(function (w) { return doc.fonts.load(w + ' 20px "Pretendard Variable"', all); })).catch(function () {});
    return Promise.race([wait, new Promise(function (r) { setTimeout(r, 3000); })]);
  }
  function toCanvas(sheet, dpi) {
    var k = dpi / 25.4, c = doc.createElement('canvas');
    c.width = Math.round(sheet.w * k); c.height = Math.round(sheet.h * k);
    SHEET.draw(c.getContext('2d'), sheet, k);
    return c;
  }
  function blobOf(canvas, type, q) { return new Promise(function (res, rej) { canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, type, q); }); }
  // PDF: 글자 그대로(글꼴을 담는다). 미리 만든 파일이 없는 설정은 전부 이 길로 만든다.
  // 글꼴(네 굵기, 하나에 30KB쯤)과 글자 폭 표는 처음 받을 때 한 번만 가져온다. 못 가져오면 300ppi 그림 PDF로 대신하고 그 사실을 알린다.
  var kitP = null;
  function loadKit() {
    if (kitP) return kitP;
    function get(u, kind) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r[kind](); }); }
    kitP = Promise.all([get('/assets/fonts/metrics.json', 'json')].concat([500, 600, 700, 800].map(function (w) { return get('/assets/fonts/onesheet-' + w + '.ttf', 'arrayBuffer'); })))
      .then(function (a) { return { metrics: a[0], fonts: { 500: new Uint8Array(a[1]), 600: new Uint8Array(a[2]), 700: new Uint8Array(a[3]), 800: new Uint8Array(a[4]) } }; });
    kitP.catch(function () { kitP = null; });
    return kitP;
  }
  function deflate(bytes) {
    if (!window.CompressionStream) return Promise.resolve(null);
    try { return new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer().then(function (b) { return new Uint8Array(b); }, function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  }
  function imagePdf(sheets, meta) {
    return fontsReady(sheets).then(function () {
      var out = [], chain = Promise.resolve();
      sheets.forEach(function (sh) {
        chain = chain.then(function () {
          var c = toCanvas(sh, 300);
          return blobOf(c, 'image/jpeg', 0.94).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
            out.push({ jpeg: new Uint8Array(buf), wpx: c.width, hpx: c.height, wmm: sh.w, hmm: sh.h });
            c.width = c.height = 0;
          });
        });
      });
      return chain.then(function () { return PDFDOC.image(out, meta); });
    });
  }
  // → { blob, image }  image = true 면 그림 PDF로 대신 만든 것
  function makePdf(sheets, title) {
    if (!window.PDFDOC) return Promise.reject(new Error('pdf.js'));
    var meta = { title: title, lang: LANG, color: SHEET.color, author: TX.site + ' (calendar.lumenlab.page)' };
    return loadKit().then(function (kit) {
      if (!PDFDOC.covers(sheets, kit.metrics)) throw new Error('glyph');
      return PDFDOC.make(sheets, kit, meta, deflate);
    }).then(function (bytes) { return { blob: new Blob([bytes], { type: 'application/pdf' }), image: false }; },
      function () { return imagePdf(sheets, meta).then(function (bytes) { return { blob: new Blob([bytes], { type: 'application/pdf' }), image: true }; }); });
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

  // ---------- 다가오는 쉬는 날(기기 날짜 기준으로 다시 채움. 줄 수는 그대로, 자료가 없으면 칸을 숨긴다) ----------
  function fillUp(ul, country) {
    var t = today(), n0 = CAL.dn(t[0], t[1], t[2]), items = [], lis = $$('li', ul), sec = ul.closest('section');
    [t[0], t[0] + 1].forEach(function (yy) {
      var h = CAL.holidays(country, yy); if (!h) return;
      h.list.forEach(function (x) { var n = CAL.dn(x.y, x.m, x.d); if (n >= n0 && items.length < lis.length) items.push([x, n - n0]); });
    });
    if (sec) sec.hidden = !items.length;
    lis.forEach(function (li, i) {
      li.hidden = !items[i];
      if (!items[i]) return;
      var x = items[i][0], d = items[i][1];
      li.innerHTML = '<time datetime="' + x.date + '"></time><span></span><small></small>';
      li.children[0].textContent = TX.date(x);
      li.children[1].textContent = SHEET.label(x, { lang: LANG, country: country });
      li.children[2].textContent = d === 0 ? TX.today : TX.inDays(d);
    });
  }
  $$('[data-up]').forEach(function (ul) { fillUp(ul, ul.dataset.country); });

  // ---------- 달력 만들기(첫 화면·연간 페이지) ----------
  $$('[data-tool]').forEach(function (el) {
    var t = today(), ds = el.dataset, MIN = 2025, MAX = 2030, fixed = ds.fixed === '1';
    // 기본 연도: 연간 페이지는 그 해. 첫 화면은 기기 날짜를 따른다(10~12월이면 다음 해 달력을 찾는 때라 다음 해).
    var year0 = fixed ? +ds.year : Math.max(MIN, Math.min(MAX, t[1] >= 10 ? t[0] + 1 : t[0]));
    var BASE = { year: year0, paper: ds.paper, country: ds.country, fixed: fixed, min: MIN, max: MAX };
    var S = { lang: LANG, country: ds.country, year: year0, paper: ds.paper, kind: 'year', orient: 'landscape', month: 1,
      weekStart: 0, mono: false, names: true, week: false, lunar: true, terms: true, son: false };
    // 주소에 담긴 설정(?y=2028&k=monthly&m=5&w=mon&p=a4&c=kr&names=0&wk=1&lunar=0&terms=0&son=1&ink=bw). 읽고 쓰는 규칙은 sheet.js urlRead·urlQuery.
    // 쓸 수 없는 값(범위 밖 연도, 모르는 용지 등)은 버리고 기본값으로 연다. 조용히 넘기지 않고 종이 위에 한 줄로 알린다(badUrl).
    var badUrl = (function () {
      var have = Object.create(null);
      new URLSearchParams(location.search).forEach(function (v, k) { k = k.toLowerCase(); if (!(k in have)) have[k] = v; });
      var r = SHEET.urlRead(function (k) { return k in have ? have[k] : null; }, BASE);
      for (var k in r.set) S[k] = r.set[k];
      if (!('month' in r.set)) S.month = S.year === t[0] ? t[1] : 1;
      return r.bad.length > 0;
    })();
    var urlTimer = 0;
    function writeUrl() {   // 기본값과 다른 것만, 늘 같은 순서로. 우리 것이 아닌 값(?adpreview 등)은 그대로 둔다.
      urlTimer = 0;
      var q = new URLSearchParams(location.search), mine = [];
      q.forEach(function (v, k) { if (SHEET.URL_KEYS.indexOf(k.toLowerCase()) >= 0) mine.push(k); });
      mine.forEach(function (k) { q.delete(k); });
      var s = [q.toString(), SHEET.urlQuery(S, BASE)].filter(Boolean).join('&');
      try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
    }
    // 주소는 설정을 바꾼 뒤 1.5초 가만히 있을 때 한 번만 고친다. 그 전에 페이지를 떠나면 떠나기 직전에 적는다(뒤로 왔을 때 같은 달력이 열리게).
    function writeUrlSoon() { clearTimeout(urlTimer); urlTimer = setTimeout(writeUrl, 1500); }
    window.addEventListener('pagehide', function () { if (urlTimer) { clearTimeout(urlTimer); writeUrl(); } });
    // 언어를 바꿔도 같은 달력이 열리게, 머리의 언어 링크와 안내 띠 링크에 지금 설정을 싣는다. 아무것도 안 바꿨으면 그 언어판의 기본 달력 그대로.
    var langA = $('a.lang'), alt0 = langA ? langA.getAttribute('href').split('?')[0] : '';
    function syncLang() {
      if (!langA) return;
      var other = KO ? 'en' : 'ko', ed = SHEET.EDITION[other], h = alt0;
      if (SHEET.urlQuery(S, BASE)) {
        var q = SHEET.urlQuery(SHEET.urlCarry(S, other), { year: year0, paper: ed.paper, country: ed.country, fixed: fixed });
        if (q) h += '?' + q;
      }
      $$('a.lang, .lang-bar a').forEach(function (a) { a.setAttribute('href', h); });
    }
    var paper = $('.paper', el), crop = $('.crop', el), pdfBtn = $('[data-pdf]', el), pngBtn = $('[data-png]', el), first = true;
    var title0 = doc.title, pngLabel = pngBtn.textContent, upList = $('[data-up]');
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
    // 미리보기 아래 한 줄: 공휴일 기준과, 고른 나라의 공휴일 목록 링크. 처음 값은 build.py basis_line() 과 같은 글자.
    function basis() {
      var h = S.country === 'NONE' ? null : CAL.holidays(S.country, S.year), b = h ? h.basis : '', y = S.year, s, link = '';
      function a(href, text, lang) { return ' <a href="' + href + '"' + (lang ? ' hreflang="' + lang + '"' : '') + '>' + text + '</a>'; }
      if (S.country === 'KR') {
        if (KO) s = b === 'official' ? '공휴일 기준: 관공서의 공휴일에 관한 규정, ' + (y === 2027 ? '우주항공청 2027년 월력요항.' : '한국천문연구원 달력자료.')
          : b === 'provisional' ? '공휴일 기준: 관공서의 공휴일에 관한 규정, 한국천문연구원 달력자료. ' + y + '년 월력요항은 아직 발표 전이에요.'
          : b === 'rule' ? y + '년은 규정으로 계산한 예상이에요. 선거일·임시공휴일·절기는 정해지면 더해요.'
          : '공휴일 기준: ' + y + '년에 확정된 공휴일(임시공휴일·선거일 포함).';
        else s = b === 'rule' ? y + ' is projected from South Korea’s holiday rules. Election days and one-off holidays are added once they are announced.'
          : b === 'table' ? 'Holidays: South Korea’s confirmed public holidays for ' + y + ', including the one-off holiday and the election day.'
          : 'Holidays: South Korea’s public holiday rules as amended in April 2026' + (b === 'provisional' ? ' (the official ' + y + ' almanac notice is not out yet).' : '.');
        if (KO && (y === 2026 || y === 2027)) link = a('/ko/' + y + '/holidays/', y + '년 공휴일 보기');
        else if (!KO && y === 2027) link = a('/guide/south-korea-public-holidays-2027/', 'See South Korea’s 2027 holidays');
        else if (!KO && y === 2026) link = a('/ko/2026/holidays/', 'See the 2026 list (in Korean)', 'ko');
      } else if (S.country === 'US') {
        s = KO ? '공휴일 기준: 미국 연방 공휴일(5 U.S.C. 6103). 주말과 겹치면 대신 쉬는 날까지 표시해요.' : 'Holidays: US federal holidays under 5 U.S.C. 6103, with the observed weekday when one falls on a weekend.';
        if (y === 2026 || y === 2027) link = KO ? a('/' + y + '/holidays/', y + '년 미국 연방 공휴일 보기(영어)', 'en') : a('/' + y + '/holidays/', 'See the ' + y + ' holiday list');
      } else s = KO ? '공휴일을 표시하지 않은 달력이에요.' : 'No holidays are marked on this calendar.';
      var e = $('[data-basis]', el); e.innerHTML = s + link; e.classList.toggle('is-est', b === 'rule');
    }
    function pdfTitle() { return S.kind === 'months' ? TX.monthsTitle(S.year) : SHEET.build(opts()).title; }
    function note(text) { var n = $('[data-note]', el); if (n) { n.textContent = text || ''; n.hidden = !text; } }
    function render() {
      var o = opts(), sh = SHEET.build(o), key = S.kind === 'year' ? 'year-' + S.orient : S.kind;
      crop.style.setProperty('--ratio', (sh.w / sh.h).toFixed(4));
      paper.innerHTML = SHEET.svg(sh) + '<span class="zoom-hint" aria-hidden="true">' + TX.zoom + '</span>';
      if (!first && !reduce) { paper.classList.remove('is-swap'); void paper.offsetWidth; paper.classList.add('is-swap'); }
      $$('[data-y]', el).forEach(function (e) { e.textContent = S.year; });
      if (!fixed) doc.title = title0.replace(ds.year, S.year);
      $('[data-what]', el).textContent = TX.kinds[key];      // 어느 달인지는 옆의 달 고르는 줄이 보여 준다
      $('[data-meta]', el).textContent = (S.paper === 'a4' ? 'A4' : 'Letter') + ' · PDF ' + TX.pages(S.kind === 'months' ? 12 : 1);
      var st = SHEET.staticFile(fileOpts());
      pdfBtn.setAttribute('href', st || '#'); if (st) pdfBtn.setAttribute('download', ''); else pdfBtn.removeAttribute('download');
      // '월별 12장'에서 이미지는 보이는 달 한 장만 저장한다 → 단추에 그렇게 적는다
      pngBtn.textContent = S.kind === 'months' ? TX.pngOne : pngLabel;
      var ms = $('.mstep', el); ms.hidden = S.kind === 'year'; $('b', ms).textContent = KO ? mName(S.month) : EN_M[S.month - 1].slice(0, 3);
      $$('.shape', el).forEach(function (b) {
        var k = b.dataset.kind, on = k === S.kind && (k !== 'year' || b.dataset.orient === S.orient);
        b.setAttribute('aria-pressed', on);
        var th = $('.thumb', b), so = opts(k === 'months' ? 'month' : k, k === 'months' ? 1 : S.month, b.dataset.orient), ssh = SHEET.build(so);
        th.style.setProperty('--ratio', (ssh.w / ssh.h).toFixed(4)); th.innerHTML = SHEET.svg(ssh, 'thumb-svg').replace(' role="img"', ' aria-hidden="true"');
        var sm = $('[data-mname]', b); if (sm) sm.textContent = mName(S.month);
      });
      var x = $('[data-xlsx]', el);
      if (x) { var okx = KO && S.country === 'KR' && S.year >= 2026 && S.year <= 2028; x.hidden = !okx; if (okx) x.setAttribute('href', '/files/' + S.year + '-calendar-korea.xlsx'); }
      var krStyle = S.country === 'KR' || (S.country === 'NONE' && KO);
      $$('[data-only="month-kr"]', el).forEach(function (e) { e.hidden = !(S.kind !== 'year' && krStyle); });
      $$('[data-only="hol"]', el).forEach(function (e) { e.hidden = S.country === 'NONE'; });
      // 24절기는 자료가 있는 해(2025~2028)만: 없는 해에는 칸을 끈 것처럼 보이게 한다
      var tc = $('[data-opt="terms"]', el);
      if (tc) { var noTerms = !CAL.terms(S.year); tc.disabled = noTerms; tc.parentNode.classList.toggle('is-off', noTerms); tc.parentNode.title = noTerms ? (KO ? S.year + '년 절기 자료는 아직 없어요' : 'No solar-term data for ' + S.year + ' yet') : ''; }
      var pv = $('[data-step="-1"]', el), nx = $('[data-step="1"]', el);
      if (pv) { pv.disabled = S.year <= MIN; nx.disabled = S.year >= MAX; }
      if (!first || S.country !== ds.country || S.year !== +ds.year) basis();
      if (first) {   // 주소에서 읽은 설정을 단추·칸에 비춘다
        $$('[data-seg="weekStart"]', el).forEach(function (k) { k.setAttribute('aria-pressed', +k.dataset.v === S.weekStart); });
        $$('[data-opt]', el).forEach(function (i) { if (i.type === 'checkbox') i.checked = !!S[i.dataset.opt]; else i.value = S[i.dataset.opt]; });
      }
      note('');
      first = false;
    }
    // 주소에 쓸 수 없는 값이 있었으면 종이 위에 한 줄(겹쳐 띄워서 화면을 밀지 않는다. 닫을 수 있고, 설정을 바꾸면 사라진다)
    var urlNote = null;
    if (badUrl) {
      urlNote = doc.createElement('p'); urlNote.className = 'url-note'; urlNote.setAttribute('role', 'status');
      var un = doc.createElement('span'), ux = doc.createElement('button');
      un.textContent = TX.badUrl; ux.type = 'button'; ux.textContent = '×'; ux.setAttribute('aria-label', TX.close);
      ux.addEventListener('click', function () { if (urlNote) { urlNote.remove(); urlNote = null; } });
      urlNote.appendChild(un); urlNote.appendChild(ux); $('.paper-box', el).appendChild(urlNote);
    }
    function changed(country) {
      if (urlNote) { urlNote.remove(); urlNote = null; }
      render(); writeUrlSoon(); syncLang();
      if (country && upList) fillUp(upList, S.country === 'NONE' ? ds.country : S.country);
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button,a'); if (!b || !el.contains(b)) return;
      if (b.dataset.step && !fixed) { S.year = Math.max(MIN, Math.min(MAX, S.year + (+b.dataset.step))); changed(); }
      else if (b.dataset.mstep) { S.month = (S.month - 1 + (+b.dataset.mstep) + 12) % 12 + 1; changed(); }
      else if (b.classList.contains('shape')) { S.kind = b.dataset.kind; if (b.dataset.orient) S.orient = b.dataset.orient; changed(); }
      else if (b.dataset.seg) { S[b.dataset.seg] = +b.dataset.v; $$('[data-seg="' + b.dataset.seg + '"]', el).forEach(function (k) { k.setAttribute('aria-pressed', k === b); }); changed(); }
      else if (b.classList.contains('opt-toggle') || b.dataset.optClose !== undefined) toggleOpts();
      else if (b === paper) zoom(SHEET.svg(SHEET.build(opts())));
      else if (b === pdfBtn) {
        var key = JSON.stringify(fileOpts());
        if (pdfBtn.hasAttribute('download')) { celebrate(pdfBtn, paper, key); return; }
        e.preventDefault(); busy(pdfBtn, true);
        makePdf(sheets(), pdfTitle()).then(function (r) { note(r.image ? TX.imgNote : ''); return save(r.blob, SHEET.fileBase(fileOpts()) + '.pdf'); })
          .then(function () { busy(pdfBtn, false); celebrate(pdfBtn, paper, key); }, function () { busy(pdfBtn, false); failed(); });
      } else if (b === pngBtn) {
        busy(b, true);
        makePng(SHEET.build(opts())).then(function (blob) { return save(blob, SHEET.fileBase(opts()) + '.png'); })
          .then(function () { busy(b, false); celebrate(null, paper, 'png' + JSON.stringify(opts())); }, function () { busy(b, false); failed(); });
      } else if (b.dataset.print !== undefined) { printSource = sheets; if (preparePrint()) window.print(); }
    });
    el.addEventListener('change', function (e) {
      var i = e.target, k = i.dataset.opt;
      if (!k) return;
      if (k === 'paper' || k === 'country') S[k] = i.value; else S[k] = i.checked;
      changed(k === 'country');
    });
    function toggleOpts() {
      var tg = $('.opt-toggle', el), box = $('.opts', el), open = box.hidden;
      box.hidden = !open; tg.setAttribute('aria-expanded', open);
      var mobile = window.matchMedia('(max-width: 900px)').matches;
      el.classList.toggle('is-opts', open && mobile);
      doc.body.classList.toggle('has-sheet', open && mobile);
      doc.body.classList.toggle('has-opts', open);
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
    syncLang();
    if (upList && S.country !== ds.country && S.country !== 'NONE') fillUp(upList, S.country);
  });

  // ---------- 월 페이지 ----------
  $$('[data-month-page]').forEach(function (el) {
    var ds = el.dataset, y = +ds.year, m = +ds.month, t = today();
    function mopts() { return { kind: 'month', year: y, month: m, lang: LANG, country: ds.country, paper: ds.paper, show: { names: true, lunar: true, terms: true, son: true } }; }
    function sheet() { return SHEET.build(mopts()); }
    function base() { return SHEET.fileBase(mopts()); }
    function note(text) { var n = $('[data-note]', el); if (n) { n.textContent = text || ''; n.hidden = !text; } }
    printSource = function () { return [sheet()]; };
    var box = $('.wm-box', el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pdf !== undefined) {
        busy(b, true);
        makePdf([sheet()], sheet().title).then(function (r) { note(r.image ? TX.imgNote : ''); return save(r.blob, base() + '.pdf'); })
          .then(function () { busy(b, false); celebrate(b, box, 'm' + y + m); }, function () { busy(b, false); failed(); });
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

  // ---------- 음력 변환 ----------
  $$('[data-lunar]').forEach(function (el) {
    var t = today();
    function val(n) {   // 전각 숫자(２０２７)는 반각으로 바꿔 받는다
      var v = $('[name="' + n + '"]', el).value.trim().replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
      return /^\d+$/.test(v) ? +v : NaN;
    }
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
