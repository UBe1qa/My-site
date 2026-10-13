/* 가죽결 수선소 · 하위 페이지 코드 (맡길 수 있나요 / 수선 종류 / 수선 사례 / 관리법 / 수선사 / 수선 맡기기)
   내용은 data.js 에서만 가져온다. 공통 부품은 common.js (window.BR). */
(function () {
  'use strict';
  var B = window.BR, $ = B.$, $$ = B.$$, won = B.won, anim = B.anim;
  var R = window.REPAIRS || [], INFO = window.REPAIR_INFO || {}, NB = window.NEW_BOOT || 380000;
  var byId = {}; R.forEach(function (r) { byId[r.id] = r; });
  var ORDER = ['heel', 'half', 'full', 'welt', 'leather', 'eyelet', 'toe'];
  var LABEL = { heel: '굽', half: '앞바닥', full: '밑창 전체', welt: '둘레 실', leather: '가죽', eyelet: '끈구멍', toe: '앞코' };
  var SHORT = { heel: '굽 교체', half: '반창', full: '통창갈이', welt: '실밥', leather: '가죽 관리', eyelet: '끈구멍', toe: '앞코 복원' };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function total(ids) {
    var p = 0, d = 0;
    ids.forEach(function (id) { var r = byId[id]; if (r) { p += r.price; d = Math.max(d, r.days); } });
    return { price: p, days: d };
  }
  function applyHref(ids) { return '/apply/' + (ids.length ? '?items=' + ids.join(',') : ''); }
  // 수선 항목 → 그림에 칠할 부위
  function parts(ids) {
    var p = {};
    ids.forEach(function (id) {
      if (id === 'full') { p.heel = p.half = p.welt = 1; }
      else if (id === 'leather') p.upper = 1;
      else if (id === 'eyelet') p.eye = 1;
      else p[id] = 1;
    });
    return Object.keys(p);
  }
  // 처음 화면 견적 그림과 같은 선 그림. 부츠 종류마다 몸통 모양을 바꾸고, 고친 곳만 주홍으로 칠한다
  var KIND = function (name) {
    name = name || '';
    return /첼시/.test(name) ? 'chelsea' : /엔지니어/.test(name) ? 'engineer' : /처커/.test(name) ? 'chukka' : /웨스턴/.test(name) ? 'western' : 'worker';
  };
  var VAMP = 'Q426 320 470 360 Q540 420 660 446 Q800 470 884 494';
  var SHAPE = {
    worker: {
      upper: 'M176 572 Q150 520 168 470 Q186 410 194 300 L206 172 Q300 156 398 160 L414 250 ' + VAMP + ' Q936 512 936 562 L176 572 Z',
      collar: 'M206 172 Q300 156 398 160',
      extra: '<path class="b-tongue" d="M392 170 Q404 116 444 112 Q470 114 470 136 L478 330 L430 330 Z"/>',
      after: '<path class="b-tab" d="M204 178 L196 120 Q198 106 212 108 L224 168"/>' +
        '<g class="b-eye"><circle cx="404" cy="190" r="7"/><circle cx="410" cy="230" r="7"/><circle cx="418" cy="270" r="7"/><circle cx="434" cy="310" r="7"/><circle cx="462" cy="346" r="7"/><circle cx="494" cy="376" r="7"/></g>' +
        '<path class="b-lace" d="M404 190 L452 214 M410 230 L456 252 M418 270 L462 290 M434 310 L474 326"/>'
    },
    chukka: {
      upper: 'M176 572 Q150 520 168 470 Q182 420 188 332 Q300 312 418 316 Q436 350 480 376 Q540 420 660 446 Q800 470 884 494 Q936 512 936 562 L176 572 Z',
      collar: 'M188 332 Q300 312 418 316',
      extra: '<path class="b-tongue" d="M410 320 Q416 288 442 288 Q462 290 462 312 L478 352 L438 350 Z"/>',
      after: '<path class="b-tab" d="M188 338 L182 300 Q184 288 196 290 L204 332"/>' +
        '<g class="b-eye"><circle cx="424" cy="332" r="7"/><circle cx="446" cy="354" r="7"/><circle cx="472" cy="374" r="7"/></g>' +
        '<path class="b-lace" d="M424 332 L462 346 M446 354 L482 366"/>'
    },
    chelsea: {
      upper: 'M176 572 Q150 520 168 470 Q186 410 194 300 L206 172 Q300 156 398 160 L414 250 ' + VAMP + ' Q936 512 936 562 L176 572 Z',
      collar: 'M206 172 Q300 156 398 160',
      extra: '',
      after: '<path class="b-gusset" d="M288 168 L360 164 Q346 300 332 402 Q324 414 316 402 Q302 300 288 168 Z"/>' +
        '<path class="b-gline" d="M306 182 L318 380 M324 180 L324 392 M342 178 L330 380"/>' +
        '<path class="b-tab" d="M204 178 L196 120 Q198 106 212 108 L224 168"/>' +
        '<path class="b-tab" d="M380 164 L384 112 Q386 100 398 102 L398 162"/>'
    },
    engineer: {
      upper: 'M176 572 Q150 520 168 470 Q186 410 194 300 L200 112 Q300 100 404 104 L414 250 ' + VAMP + ' Q936 512 936 562 L176 572 Z',
      collar: 'M200 112 Q300 100 404 104',
      extra: '',
      after: '<path class="b-strap" d="M198 146 Q300 136 406 140 L408 166 Q300 162 197 172 Z"/><rect class="b-buckle" x="356" y="134" width="30" height="38" rx="5"/>' +
        '<path class="b-strap" d="M420 292 Q468 322 502 404 L474 416 Q446 352 408 322 Z"/><rect class="b-buckle" x="434" y="330" width="30" height="36" rx="5" transform="rotate(-28 449 348)"/>'
    },
    western: {
      upper: 'M176 572 Q150 520 168 470 Q186 410 192 300 L198 118 Q250 146 300 122 Q350 146 402 112 L414 250 ' + VAMP + ' Q944 516 954 560 L176 572 Z',
      collar: 'M198 118 Q250 146 300 122 Q350 146 402 112',
      extra: '',
      after: '<path class="b-seam" d="M226 196 Q300 272 376 196 M232 244 Q300 316 370 244"/>' +
        '<path class="b-tab" d="M206 128 L202 92 Q204 84 214 86 L222 132"/><path class="b-tab" d="M386 120 L390 86 Q392 78 402 80 L402 116"/>'
    }
  };
  function bootSVG(ids, label, kind, sm) {
    var k = SHAPE[kind] || SHAPE.worker, west = kind === 'western';
    return '<span class="minib' + (sm ? ' minib--sm' : '') + ' ' + parts(ids).map(function (x) { return 'is-' + x; }).join(' ') + '" role="img" aria-label="' + label + '">' +
      '<svg viewBox="130 90 840 570" aria-hidden="true"><g class="boot__line">' + k.extra +
      '<path class="b-upper" d="' + k.upper + '"/>' +
      '<path class="b-toe" d="M742 460 Q800 474 880 499 Q929 516 930 557 L767 560 Q778 504 742 460 Z"/>' +
      '<path class="b-seam" d="M168 452 Q250 448 296 486 Q326 520 330 568"/>' +
      '<path class="b-seam" d="M736 456 Q776 500 764 564"/>' +
      '<path class="b-collar" d="' + k.collar + '"/>' + k.after +
      '<path class="b-welt" data-part="welt" d="M164 588 L166 570 L' + (west ? '944 560 Q964 566 962 584' : '930 560 Q950 566 950 584') + ' Z"/>' +
      '<path class="b-sole" data-part="heel" d="' + (west ? 'M178 588 L322 588 L306 652 L198 652 Z' : 'M168 588 L332 588 L330 640 L182 640 Q168 640 168 626 Z') + '"/>' +
      '<path class="b-sole" data-part="half" d="M332 588 L' + (west ? '960 584 Q966 600 946 610' : '948 584 Q956 604 934 614') + ' L820 640 L520 640 Q420 612 332 606 Z"/>' +
      '</g><path class="b-stitch" d="M178 579 L936 571"/></svg></span>';
  }
  function partsLabel(ids) { return '칠한 곳: ' + ids.map(function (id) { return LABEL[id]; }).join(', '); }

  // 거르기 단추: cats = [[값, 이름]...], typeOf(item) → 값. 누르면 onPick(값)
  function makeFilters(box, cats, items, typeOf, onPick) {
    var btns = cats.map(function (c, i) {
      var n = c[0] === 'all' ? items.length : items.filter(function (it) { return typeOf(it) === c[0]; }).length;
      var b = el('button', 'fchip'); b.type = 'button'; b.dataset.v = c[0];
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.appendChild(document.createTextNode(c[1] + ' '));
      var s = el('small', null, String(n)); s.setAttribute('aria-label', n + '건'); b.appendChild(s);
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(c[0]);
      });
      box.appendChild(b);
      return b;
    });
  }

  /* ================= 맡길 수 있나요: 채팅식 자가 확인 ================= */
  function check() {
    var box = $('#quiz'); if (!box) return;
    var Q = [
      { k: 'stitch', ask: '밑창 둘레에 실밥이 보이나요?', hint: '옆에서 보면 한 땀씩 박힌 실이 보여요.', opts: [['yes', '네, 보여요'], ['no', '아니요, 매끈해요'], ['unsure', '잘 모르겠어요']] },
      { k: 'where', ask: '어디가 가장 닳았나요?', opts: [['heel', '뒤축(굽)'], ['front', '앞바닥'], ['whole', '바닥 전체'], ['leather', '가죽 겉면']] },
      { k: 'age', ask: '얼마나 신으셨나요?', opts: [['1', '1년 안'], ['3', '1~3년'], ['9', '3년 넘게']] }
    ];
    var ans = {}, stepEl, items = [];
    function start(focus) {
      box.innerHTML = ''; ans = {}; items = [];
      var hi = el('p', 'q-hi'); hi.appendChild(el('i', null, '가')); hi.appendChild(document.createTextNode('가죽결 수선소'));
      stepEl = el('span', 'q-step'); hi.appendChild(stepEl); box.appendChild(hi);
      Q.forEach(function (q, i) {
        var it = el('div', 'q-item' + (i ? ' is-wait' : ''));
        var p = el('p', 'q-ask', q.ask); if (q.hint) p.appendChild(el('small', null, q.hint)); it.appendChild(p);
        var o = el('div', 'q-opts'); o.setAttribute('role', 'group'); o.setAttribute('aria-label', q.ask);
        q.opts.forEach(function (op) {
          var b = el('button', 'q-opt', op[1]); b.type = 'button'; b.disabled = i > 0;
          b.addEventListener('click', function () { choose(i, op, o); });
          o.appendChild(b);
        });
        it.appendChild(o); box.appendChild(it); items.push(it);
      });
      // 결과가 나올 자리를 미리 보여 준다 (질문 → 결과 → 맡기기)
      var wait = el('div', 'q-wait-res'); wait.appendChild(el('b', null, '확인 결과')); wait.appendChild(document.createTextNode('세 가지에 답하면 맞는 수선과 예시 가격이 여기에 나와요.'));
      box.appendChild(wait);
      stepEl.textContent = '질문 1 / ' + Q.length;
      if (focus) items[0].querySelector('.q-opt').focus({ preventScroll: true });
    }
    function choose(i, op, o) {
      ans[Q[i].k] = op[0];
      var a = el('p', 'q-ans q-in', op[1]);
      var hadFocus = o.contains(document.activeElement);
      o.replaceWith(a);
      var nx = items[i + 1];
      if (nx) {
        nx.classList.remove('is-wait'); nx.classList.add('q-in');
        $$('.q-opt', nx).forEach(function (b) { b.disabled = false; });
        stepEl.textContent = '질문 ' + (i + 2) + ' / ' + Q.length;
        if (hadFocus) nx.querySelector('.q-opt').focus({ preventScroll: true });
      } else result(hadFocus);
    }
    function result(focus) {
      var w = ans.where, st = ans.stitch, old = ans.age === '9' && st !== 'no';
      var items, title, body;
      if (w === 'heel') { items = ['heel']; title = '굽 교체로 충분해 보여요'; }
      else if (w === 'front') { items = ['half']; title = '앞 밑창 덧대기면 돼요'; }
      else if (w === 'whole') {
        if (st === 'no') { items = ['heel', 'half']; title = '굽과 앞바닥을 따로 갈아요'; }
        else { items = ['full']; title = '통창갈이를 권해요'; }
      } else { items = ['leather']; title = '가죽 관리부터 해 보세요'; }
      if (old && (w === 'heel' || w === 'front')) items.push('welt');
      body = st === 'yes' ? '실로 박은 밑창이라 나중에 통창갈이도 할 수 있어요.'
        : st === 'no' ? '본드로 붙인 밑창이라 통창갈이는 사진을 보고 정해요.'
        : '실이 있는지는 보내 주신 사진으로 봐 드려요.';
      if (items.indexOf('welt') > -1) body += ' 3년 넘게 신었다면 둘레 실도 같이 보는 게 좋아요.';
      if (w === 'leather') body = '트기 시작했다면 집에서 하는 관리로 늦출 수 있어요. 갈라져 속이 보이면 맡겨 주세요.';

      var t = total(items);
      stepEl.textContent = '확인 끝';
      var w8 = $('.q-wait-res', box); if (w8) w8.remove();
      var res = el('div', 'q-res q-in');
      res.appendChild(el('p', 'q-res__label', '확인 결과 · 예시 가격'));
      res.appendChild(el('p', 'q-res__title', title));
      res.appendChild(el('p', 'q-res__body', body));
      var rows = el('div', 'q-res__rows');
      items.forEach(function (id) { var d = el('div'); d.appendChild(el('span', null, byId[id].name)); d.appendChild(el('b', null, won(byId[id].price))); rows.appendChild(d); });
      var sum = el('div'); sum.appendChild(el('span', null, '합계 · 작업 ' + t.days + '일')); sum.appendChild(el('b', null, won(t.price))); rows.appendChild(sum);
      res.appendChild(rows);
      var btns = el('div', 'btns');
      var go = el('a', 'btn btn--accent', '이 수선으로 맡기기'); go.href = applyHref(items); btns.appendChild(go);
      if (w === 'leather') { var c = el('a', 'btn btn--soft', '관리법 보기'); c.href = '/care/'; btns.appendChild(c); }
      var again = el('button', 'btn btn--line', '다시 하기'); again.type = 'button';
      again.addEventListener('click', function () { start(true); });
      btns.appendChild(again);
      res.appendChild(btns);
      box.appendChild(res);
      if (focus) go.focus({ preventScroll: true });
      var r = res.getBoundingClientRect();
      if (r.bottom > innerHeight) res.scrollIntoView({ behavior: anim() ? 'smooth' : 'auto', block: 'nearest' });
    }
    start(false);
    $$('.tile[data-boot]').forEach(function (t) {
      var f = el('span', 'tile__fig'); f.innerHTML = bootSVG([], t.querySelector('.tile__t').textContent + ' 모양', t.getAttribute('data-boot'), true);
      t.insertBefore(f, t.firstChild);
    });
  }

  /* ================= 수선 종류: 가격표 + 부위 탭 ================= */
  function repairs() {
    var plist = $('#plist'), tabs = $('#rtabs'), panels = $('#rpanels'); if (!tabs) return;
    var cur = null;
    ORDER.forEach(function (id) {
      var r = byId[id], info = INFO[id] || {};
      // 가격표 줄
      var a = el('a'); a.href = '#' + id;
      a.appendChild(el('b', null, r.name)); a.appendChild(el('small', null, r.why)); a.appendChild(el('em', null, won(r.price)));
      a.addEventListener('click', function (e) { e.preventDefault(); select(id, true, true); });
      plist.appendChild(a);
      // 탭
      var t = el('button', 'tab', LABEL[id]); t.type = 'button'; t.id = 'tab-' + id;
      t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', id); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1;
      t.addEventListener('click', function () { select(id, false, true); });
      tabs.appendChild(t);
      // 판
      var p = el('div', 'rpanel'); p.id = id; p.hidden = true;
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + id);
      var fig = el('div', 'mcard rpanel__fig');
      var top = el('p', 'rpanel__part'); top.appendChild(el('span', null, '부위 · ' + LABEL[id])); top.appendChild(el('span', null, '칠한 곳이 고치는 곳'));
      fig.appendChild(top);
      fig.insertAdjacentHTML('beforeend', bootSVG([id], partsLabel([id])));
      var txt = el('div', 'mcard rpanel__txt');
      txt.appendChild(el('h3', 'rpanel__name', r.name));
      var when = el('p', 'rpanel__when'); when.appendChild(el('b', null, '이럴 때 ')); when.appendChild(document.createTextNode(info.when + ' 맡겨 주세요.' + (r.includes ? ' ' + r.why : '')));
      txt.appendChild(when);
      var facts = el('p', 'rpanel__facts');
      [['예시 가격 ', won(r.price)], ['작업 ', r.days + '일'], ['왕복 택배비 포함', '']].forEach(function (f) {
        var s = el('span', null, f[0]); if (f[1]) s.appendChild(el('b', null, f[1])); facts.appendChild(s);
      });
      txt.appendChild(facts);
      var ol = el('ol', 'rsteps'); (info.steps || []).forEach(function (s) { ol.appendChild(el('li', null, s)); }); txt.appendChild(ol);
      if (info.with && byId[info.with]) {
        var w = el('p', 'rwith', '같이 많이 하는 수선 · '); w.appendChild(el('b', null, byId[info.with].name)); txt.appendChild(w);
      }
      var bt = el('div', 'btns'); var go = el('a', 'btn btn--accent', '이 수선으로 맡기기'); go.href = applyHref([id]); bt.appendChild(go); txt.appendChild(bt);
      p.appendChild(fig); p.appendChild(txt);
      panels.appendChild(p);
    });
    function select(id, scroll, user) {
      if (!byId[id] || ORDER.indexOf(id) < 0) return;
      if (cur !== id) {
        cur = id;
        $$('.tab', tabs).forEach(function (t) { var on = t.id === 'tab-' + id; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
        $$('.rpanel', panels).forEach(function (p) {
          var on = p.id === id; p.hidden = !on;
          if (on && anim() && user) { p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); }
        });
        var t = $('#tab-' + id); if (t && t.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: t.offsetLeft - 16, behavior: anim() ? 'smooth' : 'auto' });
      }
      if (user) history.replaceState(null, '', '#' + id);
      if (scroll) $('#pick').scrollIntoView({ behavior: anim() ? 'smooth' : 'auto', block: 'start' });
    }
    // 화살표로 탭 옮기기
    tabs.addEventListener('keydown', function (e) {
      var i = ORDER.indexOf(cur), n = null;
      if (e.key === 'ArrowRight') n = ORDER[(i + 1) % ORDER.length];
      else if (e.key === 'ArrowLeft') n = ORDER[(i - 1 + ORDER.length) % ORDER.length];
      else if (e.key === 'Home') n = ORDER[0];
      else if (e.key === 'End') n = ORDER[ORDER.length - 1];
      if (n) { e.preventDefault(); select(n, false, true); $('#tab-' + n).focus(); }
    });
    var h = location.hash.slice(1);
    select(byId[h] ? h : 'heel', false, false);
    if (byId[h]) setTimeout(function () { $('#pick').scrollIntoView({ block: 'start' }); }, 30);
    window.addEventListener('hashchange', function () { var k = location.hash.slice(1); if (byId[k]) select(k, true, false); });
  }

  /* ================= 수선 사례: 태그 세 장 + 카드 + 거르기 + 자세히 ================= */
  function cases() {
    var grid = $('#cgrid'); if (!grid) return;
    var L = window.CASE_LIST || [];
    var info = L.map(function (c, i) {
      var t = total(c.repairs);
      return { c: c, i: i, price: t.price, days: Math.max(t.days, c.days || 0), pct: Math.round(t.price * 100 / NB), no: 'No. 0' + (402 + i * 3) };
    });
    var pcts = info.map(function (x) { return x.pct; });
    $('#stat').textContent = '새 부츠 값의 ' + Math.min.apply(null, pcts) + '~' + Math.max.apply(null, pcts) + '%';
    var what = function (x) { return x.c.repairs.map(function (id) { return SHORT[id]; }).join(' + '); };

    // 첫 화면 태그 세 장 (가운데가 맨 앞)
    var fan = [['.ftag--l', info[1]], ['.ftag--r', info[2]], ['.ftag--c', info[0]]];
    fan.forEach(function (f, k) {
      var tg = $(f[0]), x = f[1]; if (!tg || !x) return;
      tg.innerHTML = '';
      tg.appendChild(el('span', 'ftag__hole'));
      tg.appendChild(el('p', 'ftag__shop', '작업 태그 · ' + x.no));
      tg.appendChild(el('p', 'ftag__state', '출고'));
      var rows = el('div', 'ftag__rows');
      [['부츠', x.c.boot], ['수선', what(x)], ['작업', x.days + '일'], ['값', won(x.price)]].forEach(function (r) {
        var d = el('div'); d.appendChild(el('span', null, r[0])); d.appendChild(el('b', null, r[1])); rows.appendChild(d);
      });
      tg.appendChild(rows);
      if (k === 2) tg.appendChild(el('span', 'stamp', '완료'));
    });

    // 카드
    var SHOW = 4, expanded = false, filter = 'all';
    info.forEach(function (x) {
      var li = el('li'); li.dataset.type = x.c.type; li.dataset.i = x.i;
      var b = el('button', 'ccard'); b.type = 'button'; b.setAttribute('aria-haspopup', 'dialog');
      var fig = el('span', 'ccard__fig');
      fig.appendChild(el('span', 'ccard__tag', '예시'));
      fig.appendChild(el('span', 'ccard__open', '자세히 +'));
      fig.insertAdjacentHTML('beforeend', bootSVG(x.c.repairs, x.c.boot + ' 그림, ' + partsLabel(x.c.repairs), KIND(x.c.boot)));
      b.appendChild(fig);
      var txt = el('span', 'ccard__txt');
      txt.appendChild(el('span', 'ccard__meta', x.c.boot + ' · ' + x.c.worn + ' 신음'));
      var t = el('span', 'ccard__title'); t.appendChild(el('em', null, won(x.price))); t.appendChild(document.createTextNode('으로 고쳤어요'));
      txt.appendChild(t);
      var bar = el('span', 'ccard__bar'); var bi = el('i'); bi.style.setProperty('--w', x.pct + '%'); bar.appendChild(bi); txt.appendChild(bar);
      txt.appendChild(el('span', 'ccard__pct', '새 부츠 값(38만 원)의 ' + x.pct + '%'));
      txt.appendChild(el('span', 'ccard__note', x.c.note));
      txt.appendChild(el('span', 'ccard__foot', what(x) + ' · 작업 ' + x.days + '일'));
      b.appendChild(txt);
      b.addEventListener('click', function () { openCase(x, b); });
      li.appendChild(b); grid.appendChild(li);
    });
    var more = $('#cmore');
    function apply() {
      var shown = 0, hiddenCount = 0;
      $$('li', grid).forEach(function (li) {
        var match = filter === 'all' || li.dataset.type === filter;
        var cut = filter === 'all' && !expanded && shown >= SHOW;
        li.hidden = !match || cut;
        if (match && !cut) shown++;
        if (match && cut) hiddenCount++;
      });
      more.hidden = hiddenCount === 0;
      $('#cmore-t').textContent = '나머지 ' + hiddenCount + '건 더 보기';
    }
    makeFilters($('#cfilters'), [['all', '전체'], ['sole', '밑창'], ['heel', '굽'], ['leather', '가죽']], L, function (c) { return c.type; },
      function (v) { filter = v; apply(); });
    more.addEventListener('click', function () {
      var first = $$('li', grid).filter(function (li) { return li.hidden; })[0];
      expanded = true; apply();
      if (first) first.querySelector('.ccard').focus({ preventScroll: true });
    });
    apply();
    B.reveal($$('li', grid));

    // 03 새로 사는 값과 나란히: 싼 것부터 막대
    var bars = $('#cbars');
    if (bars) {
      info.slice().sort(function (a, b) { return a.price - b.price; }).forEach(function (x) {
        var row = el('li', 'cbar');
        var n = el('span', 'cbar__name'); n.appendChild(el('b', null, x.c.boot)); n.appendChild(el('small', null, what(x))); row.appendChild(n);
        var tr = el('span', 'cbar__track'); var fi = el('i'); fi.style.setProperty('--w', (x.price * 100 / NB).toFixed(1) + '%'); tr.appendChild(fi); row.appendChild(tr);
        row.appendChild(el('span', 'cbar__v', won(x.price)));
        bars.appendChild(row);
      });
      var nb = el('li', 'cbar cbar--new');
      var nn = el('span', 'cbar__name'); nn.appendChild(el('b', null, '새 부츠')); nn.appendChild(el('small', null, '굿이어웰트 워커 한 켤레')); nb.appendChild(nn);
      var nt = el('span', 'cbar__track'); var ni = el('i'); ni.style.setProperty('--w', '100%'); nt.appendChild(ni); nb.appendChild(nt);
      nb.appendChild(el('span', 'cbar__v', won(NB)));
      bars.appendChild(nb);
      B.reveal($$('.cbar', bars), .05);
    }

    // 자세히: 작업 태그 한 장
    var dlg = $('#cdlg'), inner = $('#cdlg-in'), opener = null;
    function openCase(x, from) {
      opener = from; inner.innerHTML = '';
      var close = el('button', 'dlg__close'); close.type = 'button'; close.setAttribute('aria-label', '닫기');
      close.addEventListener('click', function () { dlg.close(); });
      inner.appendChild(close);
      inner.appendChild(el('p', 'dlg__shop', '작업 태그 · ' + x.no + ' · 예시'));
      var h = el('h2', 'dlg__title', x.c.boot + ' · ' + x.c.worn + ' 신음'); h.id = 'cdlg-t'; inner.appendChild(h);
      inner.appendChild(el('p', 'dlg__note', '맡길 때 · ' + x.c.note));
      var rows = el('div', 'dlg__rows');
      x.c.repairs.forEach(function (id) {
        var r = byId[id], row = el('div', 'dlg__row'), top = el('div');
        top.appendChild(el('span', null, r.name)); top.appendChild(el('b', null, won(r.price))); row.appendChild(top);
        var ul = el('ul'); ((INFO[id] || {}).steps || []).forEach(function (s) { ul.appendChild(el('li', null, s)); }); row.appendChild(ul);
        rows.appendChild(row);
      });
      inner.appendChild(rows);
      var sum = el('div', 'dlg__sum');
      [['합계', won(x.price)], ['작업', x.days + '일 + 택배 2~3일'], ['새 부츠 값(38만 원)과 견주면', x.pct + '%']].forEach(function (s) {
        var d = el('div'); d.appendChild(el('span', null, s[0])); d.appendChild(el('b', null, s[1])); sum.appendChild(d);
      });
      inner.appendChild(sum);
      inner.appendChild(el('p', 'dlg__foot', '설명하려고 만든 예시 사례예요. 실제 손님의 수선 기록이 아니에요.'));
      var bt = el('div', 'btns'); var go = el('a', 'btn btn--accent', '비슷하게 맡기기'); go.href = applyHref(x.c.repairs); bt.appendChild(go); inner.appendChild(bt);
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      close.focus();
    }
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (opener) opener.focus({ preventScroll: true }); });
  }

  /* ================= 관리법: 거르기 + 카드 ================= */
  var ICON = {
    umbrella: '<path class="ic" d="M10 32a22 22 0 0 1 44 0Z"/><path class="ic" d="M32 32v16a5 5 0 0 1-10 0"/><path class="ic-a" d="M16 8v6M30 4v5M46 7v6"/>',
    snow: '<path class="ic" d="M32 8v48M11 20l42 24M53 20 11 44"/><path class="ic-a" d="M26 13l6 6 6-6M26 51l6-6 6 6"/>',
    box: '<path class="ic" d="M8 18h48v9H8z"/><path class="ic" d="M12 27h40v27H12z"/><path class="ic-a" d="M25 37h14"/>',
    calendar: '<rect class="ic" x="10" y="14" width="44" height="40" rx="5"/><path class="ic" d="M10 26h44M22 8v10M42 8v10"/><path class="ic-a" d="M23 39l6 6 12-12"/>',
    drop: '<path class="ic" d="M32 7C24 20 15 29 15 39a17 17 0 0 0 34 0c0-10-9-19-17-32Z"/><path class="ic-a" d="M23 40a9 9 0 0 0 9 9"/>',
    jar: '<path class="ic" d="M16 27h32v23a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6Z"/><path class="ic" d="M13 18h38v9H13z"/><path class="ic-a" d="M24 42c3-6 7 5 10-1s6 3 7-1"/>',
    lace: '<path class="ic" d="M18 8v48M46 8v48"/><path class="ic-a" d="M18 14 46 26M46 14 18 26M18 34 46 46M46 34 18 46"/>',
    insole: '<path class="ic" d="M31 6c10 0 15 10 13 24-1 8-2 12-2 18 0 6-4 10-10 10s-10-4-10-10c0-8 4-12 2-20C22 18 22 6 31 6Z"/><path class="ic-a" d="M28 22c4 1 6 4 6 8"/>'
  };
  var CATN = { rain: '비·눈', store: '보관', leather: '가죽', lace: '끈·깔창' };
  function care() {
    var g = $('#gcards'); if (!g) return;
    var C = window.CARE || [];
    C.forEach(function (c) {
      var li = el('li', 'gcard'); li.dataset.type = c.cat;
      var fig = el('div', 'gcard__fig'); fig.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' + (ICON[c.ic] || '') + '</svg>';
      li.appendChild(fig);
      var body = el('div', 'gcard__body');
      var top = el('p', 'gcard__top'); top.appendChild(el('span', 'gcard__cat', CATN[c.cat])); top.appendChild(el('span', 'gcard__time', c.time === '-' ? '매일' : '걸리는 시간 ' + c.time));
      body.appendChild(top);
      body.appendChild(el('h3', 'gcard__t', c.title));
      var ol = el('ol'); c.steps.forEach(function (s) { ol.appendChild(el('li', null, s)); }); body.appendChild(ol);
      li.appendChild(body); g.appendChild(li);
    });
    makeFilters($('#gfilters'), [['all', '전체'], ['rain', '비·눈'], ['store', '보관'], ['leather', '가죽'], ['lace', '끈·깔창']], C, function (c) { return c.cat; },
      function (v) { $$('.gcard', g).forEach(function (li) { li.hidden = !(v === 'all' || li.dataset.type === v); }); });
    B.reveal($$('.gcard', g));
  }

  /* ================= 수선사: 순서 줄이 스크롤 따라 차오름 ================= */
  function maker() {
    var tl = $('.tline'); if (!tl) return;
    var fill = $('.tline__fill', tl), steps = $$('.tstep', tl);
    if (!anim()) { fill.style.setProperty('--fill', '100%'); steps.forEach(function (s) { s.classList.add('is-on'); }); return; }
    var ticking = false;
    function upd() {
      ticking = false;
      var r = tl.getBoundingClientRect(), mid = innerHeight * .55;
      var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      fill.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
      steps.forEach(function (s) { var d = $('.tstep__dot', s).getBoundingClientRect(); s.classList.toggle('is-on', d.top + d.height / 2 < mid); });
    }
    var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    upd();
  }

  /* ================= 수선 맡기기: 신청서 (아무 데도 보내지 않는다) ================= */
  function apply() {
    var f = $('#aform'); if (!f) return;
    var itemsBox = $('#a-items');
    // 주소의 ?items= 에는 수선 항목 id만 온다(개인정보는 주소에 싣지 않는다)
    var want = (new URLSearchParams(location.search).get('items') || '').split(',').filter(function (id) { return byId[id]; });
    var picked = want.length ? want : ['unsure'];
    if (picked.indexOf('full') > -1) picked = picked.filter(function (id) { return byId.full.includes.indexOf(id) < 0; });
    itemsBox.innerHTML = '';
    ORDER.concat(['unsure']).forEach(function (id) {
      var c = el('button', 'chip'); c.type = 'button'; c.dataset.id = id;
      c.appendChild(el('span', 'chip__name', id === 'unsure' ? '잘 모르겠어요' : byId[id].name));
      itemsBox.appendChild(c);
    });
    function inFull(id) { return picked.indexOf('full') > -1 && byId.full.includes.indexOf(id) > -1; }
    function renderItems() {
      $$('.chip', itemsBox).forEach(function (c) {
        var id = c.dataset.id, on = picked.indexOf(id) > -1, inc = inFull(id);
        c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.disabled = inc;
        var n = c.querySelector('.chip__in');
        if (inc && !n) { n = el('span', 'chip__in', '(통창갈이에 포함)'); c.appendChild(n); }
        if (!inc && n) n.remove();
      });
    }
    itemsBox.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c || c.disabled) return;
      var id = c.dataset.id;
      if (id === 'unsure') picked = ['unsure'];
      else {
        picked = picked.filter(function (p) { return p !== 'unsure'; });
        var at = picked.indexOf(id);
        if (at > -1) picked.splice(at, 1);
        else {
          picked.push(id);
          if (id === 'full') picked = picked.filter(function (p) { return byId.full.includes.indexOf(p) < 0; });
        }
        if (!picked.length) picked = ['unsure'];
      }
      renderItems();
    });
    renderItems();

    // 사진: 이 화면에서만 미리 본다 (올리지 않는다)
    var photos = [], input = $('#a-photo'), thumbs = $('#thumbs'), drop = $('#drop');
    function addFiles(list) {
      Array.prototype.slice.call(list).forEach(function (file) {
        if (photos.length >= 3 || !/^image\//.test(file.type)) return;
        photos.push({ file: file, url: URL.createObjectURL(file) });
      });
      if (list.length && photos.length >= 3) B.toast('사진은 세 장까지 볼 수 있어요.');
      drawThumbs();
    }
    function drawThumbs() {
      thumbs.innerHTML = '';
      photos.forEach(function (p, i) {
        var d = el('div', 'thumb'), img = el('img'); img.src = p.url; img.alt = '고른 사진 ' + (i + 1);
        var x = el('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', '사진 ' + (i + 1) + ' 빼기');
        x.addEventListener('click', function () { URL.revokeObjectURL(p.url); photos.splice(i, 1); drawThumbs(); input.focus(); });
        d.appendChild(img); d.appendChild(x); thumbs.appendChild(d);
      });
      $('#a-photo-note').textContent = photos.length ? photos.length + '장 골랐어요. 사진은 이 화면에서만 보여요.' : '뒤축 · 밑창 둘레 · 앞코. 사진은 이 화면에서만 보여요.';
    }
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer) addFiles(e.dataTransfer.files); });

    // 동의
    var all = $('#a-all'), reqs = $$('[data-req]', f), agreeErr = $('#a-agree-err');
    all.addEventListener('change', function () { reqs.forEach(function (c) { c.checked = all.checked; }); agreeErr.textContent = ''; });
    reqs.forEach(function (c) { c.addEventListener('change', function () { all.checked = reqs.every(function (x) { return x.checked; }); if (all.checked) agreeErr.textContent = ''; }); });
    $$('.agree__see', f).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.getAttribute('aria-controls')), open = t.hidden;
        t.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? '접기' : '보기';
      });
    });

    // 확인 → 접수 화면 예시
    var name = $('#a-name'), phone = $('#a-phone');
    function setErr(inp, box, msg) {
      $('#' + box).textContent = msg || '';
      if (inp) { if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
    }
    name.addEventListener('input', function () { setErr(name, 'a-name-err', ''); });
    phone.addEventListener('input', function () { setErr(phone, 'a-phone-err', ''); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      if (!name.value.trim()) { setErr(name, 'a-name-err', '이름을 적어 주세요.'); bad.push(name); }
      var digits = phone.value.replace(/[^0-9０-９]/g, '');
      if (digits.length < 9) { setErr(phone, 'a-phone-err', digits.length ? '번호가 짧아요. 010부터 다 적어 주세요.' : '견적 문자를 받을 번호를 적어 주세요.'); bad.push(phone); }
      if (!reqs.every(function (c) { return c.checked; })) { agreeErr.textContent = '필수 항목에 동의해 주세요.'; bad.push(reqs.filter(function (c) { return !c.checked; })[0]); }
      if (bad.length) { bad[0].focus(); return; }
      var sum = $('#done-sum'); sum.innerHTML = '';
      var how = (f.querySelector('input[name="how"]:checked') || {}).value || '택배';
      [['부츠', $('#a-kind').value || '골라 주지 않음'],
       ['수선', picked[0] === 'unsure' ? '사진 보고 정하기' : picked.map(function (id) { return SHORT[id]; }).join(', ')],
       ['사진', photos.length ? photos.length + '장' : '없음'],
       ['받는 방법', how]].forEach(function (r) { var d = el('div'); d.appendChild(el('span', null, r[0])); d.appendChild(el('b', null, r[1])); sum.appendChild(d); });
      f.hidden = true; var done = $('#done'); done.hidden = false; done.focus();
      done.scrollIntoView({ behavior: anim() ? 'smooth' : 'auto', block: 'center' });
    });
    $('#again').addEventListener('click', function () {
      $('#done').hidden = true; f.hidden = false; name.focus();
    });
  }

  var run = { check: check, repairs: repairs, cases: cases, care: care, maker: maker, apply: apply }[B.page];
  if (run) run();
})();
