/* 외울수 바로 써 보기: 외울수 사이트의 판(board.js), 규칙(chess.min.js), 통계 읽기(core.js, 전역 FM)를 그대로 불러
   리체스 레이팅 대국 1,740만 판에서 '이 국면 다음에 무엇을 두나'를 화살표 굵기(= 두는 비율)로 보여 준다.
   레이팅을 바꾸면 굵기와 수 목록이 바뀐다. 숫자는 chess.lumenlab.page/data/ 조각에서 읽는다(그 사이트 _headers가 CORS를 연다). */
window.LLTry.fewmoves = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', FM = window.FM, Chess = window.Chess;
  FM.DATA = 'https://chess.lumenlab.page/data/';
  var T = ko
    ? { bands: ['1200 미만', '1600–1999', '2000+'], start: '처음 국면', none: '이름 없는 국면', back: '한 수 뒤로', reset: '처음으로',
        games: function (n) { return '이 국면은 ' + FM.count(n, 'ko') + ' 판에서 나왔어요.'; }, hint: '화살표 아래 수를 누르거나 판에서 말을 움직여 보세요.', fail: '숫자를 불러오지 못했어요.', board: '체스판' }
    : { bands: ['Under 1200', '1600–1999', '2000+'], start: 'Starting position', none: 'Unnamed position', back: 'Back one move', reset: 'Start over',
        games: function (n) { return FM.count(n, 'en') + ' games from this position'; }, hint: 'Tap a move below or move a piece on the board.', fail: 'Could not load the numbers.', board: 'Chess board' };
  var BANDS = [0, 2, 3];
  var ch = new Chess(), line = [], band = 2, alive = true, seq = 0;
  if (!document.getElementById('try-fm-pieces')) document.head.appendChild(h('link', { id: 'try-fm-pieces', rel: 'stylesheet', href: 'https://chess.lumenlab.page/assets/pieces.css' }));
  if (!document.getElementById('try-fm-css')) document.head.appendChild(h('style', { id: 'try-fm-css', text:
    '.fw{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:18px;align-items:start}' +
    '.fw-b{position:relative;width:100%;aspect-ratio:1/1;touch-action:none;user-select:none;-webkit-user-select:none;border-radius:6px;overflow:hidden;contain:layout paint;' +
    'background:conic-gradient(#b78a62 90deg,#eedcb6 0 180deg,#b78a62 0 270deg,#eedcb6 0) 0 0/25% 25%}' +
    '.fw-b .bd-hl,.fw-b .bd-pc,.fw-b .bd-pr{position:absolute;inset:0}.fw-b .bd-hl i,.fw-b .pc,.fw-b>.fl{position:absolute;left:0;top:0;width:12.5%;height:12.5%}' +
    '.fw-b .bd-hl .lm{background:rgba(255,214,64,.46)}.fw-b .bd-hl .sl{background:rgba(44,71,201,.28)}.fw-b .bd-hl .ck{background:radial-gradient(circle,rgba(230,30,30,.85) 0,rgba(230,30,30,.45) 35%,transparent 70%)}' +
    '.fw-b .bd-hl .tg::after{content:"";position:absolute;inset:37%;border-radius:50%;background:rgba(20,30,60,.28)}.fw-b .bd-hl .tg.cap::after{inset:4%;background:none;border:5px solid rgba(20,30,60,.26)}' +
    '.fw-b .pc{background-size:100% 100%;background-repeat:no-repeat;transition:translate .16s cubic-bezier(.2,.7,.3,1);cursor:grab}.fw-b .pc.drag{transition:none;z-index:5;scale:1.1}' +
    '.fw-b .bd-co{display:none}.fw-b .bd-ar{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4}' +
    '.fw-b .arw line{stroke:#2c47c9;stroke-linecap:round;opacity:var(--o)}.fw-b .arw polygon{fill:#2c47c9;opacity:var(--o)}' +
    '.fw-b .arw.hot line,.fw-b .arw.hot polygon{stroke:#e0661a;fill:#e0661a;opacity:.92}.fw-b .arw{animation:fwin .25s ease-out both;animation-delay:calc(var(--i)*40ms)}@keyframes fwin{from{opacity:0}}' +
    '.fw-b .bd-pr{background:rgba(10,12,18,.45);z-index:8}.fw-b .bd-pr .pc{border:0;background-color:#fff;border-radius:50%}.fw-b>.fl{z-index:3;pointer-events:none;animation:fwfl .7s ease-out forwards;background:rgba(44,71,201,.35)}@keyframes fwfl{to{opacity:0}}' +
    '.fw-side{display:grid;gap:10px;align-content:start;min-width:0}.fw-side .tr-chips{flex-wrap:nowrap;gap:6px}.fw-side .tr-chips .tr-btn{flex:1 1 0;min-width:0;padding-left:4px;padding-right:4px;white-space:nowrap;font-size:14px}.fw-name{margin:0;font-weight:700;font-size:16px;display:flex;gap:8px;align-items:baseline}.fw-name i{font:600 12px/1 ui-monospace,Menlo,monospace;font-style:normal;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:3px 5px}' +
    '.fw-mv{display:grid;gap:6px}.fw-mv button{display:grid;grid-template-columns:64px 1fr 44px;gap:10px;align-items:center;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}' +
    '.fw-mv button:hover,.fw-mv button:focus-visible{border-color:#2c47c9}.fw-mv b{font-family:ui-monospace,Menlo,monospace}.fw-mv em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}' +
    '.fw-mv s{display:block;height:8px;border-radius:4px;background:#2c47c9;transform-origin:left;transform:scaleX(var(--s));transition:transform .35s cubic-bezier(.2,.7,.3,1)}' +
    '.fw-ml{margin:0;font:13px/1.4 ui-monospace,Menlo,monospace;color:var(--muted);min-height:18px}' +
    '@media (max-width:620px){.fw{grid-template-columns:minmax(0,1fr)}.fw-b{max-width:300px;margin:0 auto}}' }));

  var boardEl = h('div', { class: 'fw-b', 'data-grab': '', role: 'img', 'aria-label': T.board });
  var board = new FM.Board(boardEl, {
    orient: 'w',
    movable: function (col) { return col === ch.turn(); },
    legal: function (sq) { return ch.moves({ square: sq, verbose: true }).map(function (m) { return { to: m.to, promotion: m.promotion }; }); },
    onMove: function (mv) { play(mv); }
  });
  var nameEl = h('p', { class: 'fw-name' });
  var sumEl = h('p', { class: 'tr-note' });
  var mlEl = h('p', { class: 'fw-ml' });
  var mvEl = h('div', { class: 'fw-mv' });
  var chips = BANDS.map(function (b, i) {
    return h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': String(b === band), 'data-b': String(b), onclick: function () { setBand(b); } }, [T.bands[i]]);
  });
  var back = h('button', { type: 'button', class: 'tr-btn', onclick: function () { undo(); } }, [T.back]);
  var reset = h('button', { type: 'button', class: 'tr-btn', onclick: function () { doReset(); } }, [T.reset]);

  function setBand(b) {
    band = b;
    chips.forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-b') === b)); });
    render();
  }
  function play(mv) {
    var m;
    try { m = ch.move(mv); } catch (e) { m = null; }
    if (m) line.push(m);
    render();
  }
  function undo() { if (line.length) { ch.undo(); line.pop(); render(); } }
  function doReset() { ch.reset(); line = []; setBand(2); }
  function epds() {
    var t = new Chess(), out = [FM.epd(t.fen())];
    line.forEach(function (m) { t.move(m.san); out.push(FM.epd(t.fen())); });
    return out;
  }
  function render() {
    var last = line.length ? [line[line.length - 1].from, line[line.length - 1].to] : null;
    board.set(ch.fen(), last, null);
    var txt = '';
    line.forEach(function (m, i) { txt += (i % 2 ? '' : (i / 2 + 1) + '.') + m.san + ' '; });
    mlEl.textContent = txt.trim();
    back.disabled = !line.length;
    var my = ++seq, list = epds();
    Promise.all(list.map(function (e) { return FM.entry(e).catch(function () { return null; }); })).then(function (ens) {
      if (!alive || my !== seq) return;
      var nm = FM.nameOf(list, c.lang);
      nameEl.textContent = '';
      if (nm) { nameEl.appendChild(h('i', { text: nm.eco })); nameEl.appendChild(h('span', { text: nm.name })); }
      else nameEl.appendChild(h('span', { text: line.length ? T.none : T.start }));
      var s = FM.stats(ens[ens.length - 1], band);
      mvEl.textContent = '';
      var arrows = [];
      if (!s || !s.moves.length) { sumEl.textContent = T.hint; board.drawArrows([]); return; }
      sumEl.textContent = T.games(s.played);
      s.moves.slice(0, 4).forEach(function (m) {
        var mv;
        try { mv = ch.move(m.san); } catch (e) { mv = null; }
        if (!mv) return;
        ch.undo();
        arrows.push({ from: mv.from, to: mv.to, share: m.share, kind: 'freq' });
        var bar = h('s', { 'aria-hidden': 'true' });
        bar.style.setProperty('--s', '0');
        var b = h('button', { type: 'button', 'data-san': m.san, onclick: function () { play(m.san); } }, [h('b', { text: m.san }), bar, h('em', { text: FM.pct(m.share) })]);
        b.addEventListener('pointerenter', function () { board.drawArrows(arrows.map(function (a) { return Object.assign({}, a, { kind: a.from === mv.from && a.to === mv.to ? 'hot' : 'freq' }); }).reverse()); });
        b.addEventListener('pointerleave', function () { board.drawArrows(arrows.slice().reverse()); });
        mvEl.appendChild(b);
        requestAnimationFrame(function () { bar.style.setProperty('--s', Math.min(1, m.share * 1.4).toFixed(3)); });
      });
      board.drawArrows(arrows.slice().reverse());
    }, function () { if (alive) sumEl.textContent = T.fail; });
  }
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'fw' }, [boardEl, h('div', { class: 'fw-side' }, [
      h('div', { class: 'tr-chips' }, chips), nameEl, mlEl, mvEl, sumEl, h('div', { class: 'tr-row' }, [back, reset])
    ])])
  ]));
  render();
  function moveBtn(san) { return mvEl.querySelector('button[data-san="' + san + '"]'); }
  function waitBtn(A, san, tries) {
    return A.wait(160).then(function () { var b = moveBtn(san); return b || (tries > 0 ? waitBtn(A, san, tries - 1) : null); });
  }
  function pressMove(A, san) {
    return waitBtn(A, san, 20).then(function (b) { if (!b) throw new Error('no move ' + san); return A.press(b); });
  }
  return {
    // 시연: 1.e4 → 레이팅을 2000+로 바꿔 시실리안이 굵어지는 것 → 1...c5 2.Nf3
    auto: function (A) {
      return A.wait(700)
        .then(function () { return pressMove(A, 'e4'); })
        .then(function () { return A.wait(900); })
        .then(function () { return A.press(chips[0]); })
        .then(function () { return A.wait(1100); })
        .then(function () { return A.press(chips[2]); })
        .then(function () { return A.wait(1100); })
        .then(function () { return pressMove(A, 'c5'); })
        .then(function () { return A.wait(800); })
        .then(function () { return pressMove(A, 'Nf3'); });
    },
    reset: doReset,
    stop: function () { alive = false; }
  };
};
