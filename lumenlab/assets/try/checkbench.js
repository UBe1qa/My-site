/* 체크벤치 바로 써 보기: 체크벤치 사이트의 기기 시험 파일(ck-keys.js·ck-measure.js, 전역 CK)을 그대로 불러
   ① 이 화면이 1초에 몇 번 바뀌는지 잰다(requestAnimationFrame 121번 → CK.refreshEstimate, 고른지는 CK.refreshSteady)
   ② 키보드 자리는 CK.layout, 누름·뗌은 CK.createTracker가 센다(채터링 = 뗀 뒤 30ms 안에 다시 눌림).
   키 글자는 체크벤치 build.py 의 KEY_TXT·KEY_MAC·KEY_KO 를 옮겨 왔다(CK 에는 자리만 있다). */
window.LLTry.checkbench = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', CK = window.CK;
  var T = ko
    ? { hz: '이 화면의 주사율', measuring: '재는 중…', again: '다시 재기', near: function (n) { return '흔한 값 ' + n + 'Hz에 가까워요'; }, uneven: '화면이 고르지 않게 바뀌었어요. 다시 재 보세요.',
        kb: '키보드', keys: function (a, b) { return a + ' / ' + b + '개 눌러 봄'; }, held: function (n) { return '동시에 ' + n + '개'; },
        tip: '키보드가 있으면 아무 키나 눌러 보세요. 화면의 키를 눌러도 돼요.',
        chat: function (k, ms) { return k + ' 키: 뗀 뒤 ' + ms + 'ms 만에 다시 눌렸어요 → 채터링 의심'; } }
    : { hz: 'Your screen’s refresh rate', measuring: 'Measuring…', again: 'Measure again', near: function (n) { return 'Close to the common ' + n + ' Hz'; }, uneven: 'Frames came unevenly. Try measuring again.',
        kb: 'Keyboard', keys: function (a, b) { return a + ' of ' + b + ' keys pressed'; }, held: function (n) { return n + ' at once'; },
        tip: 'If you have a keyboard, press any key. You can also tap the keys on screen.',
        chat: function (k, ms) { return k + ': pressed again ' + ms + ' ms after release → possible double-typing'; } };
  var KEY_TXT = { Escape: 'Esc', Backspace: 'Back', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
    MetaLeft: 'Win', MetaRight: 'Win', AltLeft: 'Alt', AltRight: 'Alt', ContextMenu: 'Menu', Space: '', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
    Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\' };
  var KEY_MAC = { Escape: 'esc', Backspace: 'delete', Tab: 'tab', CapsLock: 'caps', Enter: 'return', ShiftLeft: 'shift', ShiftRight: 'shift', Fn: 'fn',
    ControlLeft: '⌃', AltLeft: '⌥', AltRight: '⌥', MetaLeft: '⌘', MetaRight: '⌘', Power: '' };
  var KEY_KO = { AltRight: '한/영', ControlRight: '한자' };
  var layoutId = CK.defaultLayout(navigator.platform || '');
  var L = CK.layout(layoutId), mac = layoutId === 'mac';
  // 휴대폰에서도 읽히게 PC 자판은 글자 자판 부분(맨 왼쪽 15칸)만
  var keys = L.keys.filter(function (k) { return mac || k.x + k.w <= 15.01; });
  var W = 0, H = 0;
  keys.forEach(function (k) { W = Math.max(W, k.x + k.w); H = Math.max(H, k.y + k.h); });
  function label(code) {
    if (mac && code in KEY_MAC) return KEY_MAC[code];
    if (ko && !mac && code in KEY_KO) return KEY_KO[code];
    if (code in KEY_TXT) return KEY_TXT[code];
    if (code.indexOf('Key') === 0) return code.slice(3);
    if (code.indexOf('Digit') === 0) return code.slice(5);
    return code;
  }

  /* ① 주사율 */
  var hzBig = h('p', { class: 'tr-big ck-hz', 'aria-live': 'polite' });
  var hzNote = h('p', { class: 'tr-note' });
  var runner = h('i', { class: 'ck-run' });
  var track = h('div', { class: 'ck-track', 'aria-hidden': 'true' }, [runner]);
  var againBtn = h('button', { type: 'button', class: 'tr-btn', onclick: function () { measure(); } }, [T.again]);
  var raf = 0, alive = true;
  function measure() {
    cancelAnimationFrame(raf);
    var times = [], N = 121;
    hzBig.textContent = T.measuring; hzBig.classList.add('is-wait'); hzNote.textContent = ''; againBtn.disabled = true;
    function frame(t) {
      if (!alive) return;
      times.push(t);
      // 막대는 한 장마다 같은 거리만 간다: 끊기면 걸음이 벌어져 보인다
      runner.style.transform = 'translateX(' + ((times.length % 40) * 2.5) + 'cqw)';
      if (times.length < N) { raf = requestAnimationFrame(frame); return; }
      var est = CK.refreshEstimate(CK.intervals(times));
      hzBig.classList.remove('is-wait');
      againBtn.disabled = false;
      if (CK.refreshSteady(est)) {
        hzBig.textContent = '';
        hzBig.appendChild(document.createTextNode(String(Math.round(est.hz))));
        hzBig.appendChild(h('small', { text: 'Hz' }));
        hzNote.textContent = est.nearest ? T.near(est.nearest) : '';
        if (!c.reduced) { hzBig.classList.remove('tr-pop'); void hzBig.offsetWidth; hzBig.classList.add('tr-pop'); }
      } else { hzBig.textContent = '–'; hzNote.textContent = T.uneven; }
    }
    raf = requestAnimationFrame(frame);
  }

  /* ② 키보드 */
  var tracker = CK.createTracker({ chatterMs: CK.KEY_CHATTER_MS });
  var board = h('div', { class: 'ck-board' + (mac ? ' is-mac' : ''), style: 'aspect-ratio:' + W + '/' + H });
  var el = {};
  keys.forEach(function (k) {
    var b = h('button', { type: 'button', class: 'ck-key', tabindex: '-1', 'data-code': k.code,
      style: 'left:' + (k.x / W * 100) + '%;top:' + (k.y / H * 100) + '%;width:' + (k.w / W * 100) + '%;height:' + (k.h / H * 100) + '%' }, [h('span', { text: label(k.code) })]);
    el[k.code] = b; board.appendChild(b);
  });
  var countEl = h('b'), heldEl = h('span');
  var warn = h('p', { class: 'tr-note ck-warn', 'aria-live': 'polite' });
  function show() {
    var seen = tracker.seen().filter(function (id) { return el[id]; }).length;
    countEl.textContent = T.keys(seen, keys.length);
    heldEl.textContent = tracker.maxHeld() > 1 ? T.held(tracker.maxHeld()) : '';
  }
  function press(id, t, momentary) {
    var d = tracker.down(id, t, false, !!momentary);
    var k = el[id];
    if (k) {
      k.classList.add('is-seen', 'is-down');
      if (d.chatter) { k.classList.add('is-warn'); warn.textContent = T.chat(label(id) || id, Math.round(d.gap)); }
    }
    show();
    return d;
  }
  function release(id, t) { tracker.up(id, t); if (el[id]) el[id].classList.remove('is-down'); show(); }
  board.addEventListener('click', function (e) {
    var b = e.target.closest('.ck-key'); if (!b) return;
    var id = b.getAttribute('data-code'), t = performance.now();
    press(id, t); setTimeout(function () { release(id, performance.now()); }, 90);
  });
  function isField(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  function onDown(e) {
    if (isField(e.target) || e.key === 'Escape' || e.key === 'Tab') return;
    var r = CK.resolveKey(layoutId, e.code, e.key), id = r.slot || r.extra;
    if (!id) return;
    c.mine();
    // 창이 굴러가지 않게 막되, 단추·링크에 초점이 있으면 그 키는 원래 일(누르기)을 하게 둔다
    if (/^(Space|Arrow|Page|Home|End|Backspace)/.test(e.code) && !(e.target.closest && e.target.closest('button,a,summary,select'))) e.preventDefault();
    if (!e.repeat) press(id, e.timeStamp, CK.isMomentary(e.code, e.key)); else tracker.down(id, e.timeStamp, true, false);
  }
  function onUp(e) {
    if (isField(e.target)) return;
    var r = CK.resolveKey(layoutId, e.code, e.key), id = r.slot || r.extra;
    if (id) release(id, e.timeStamp);
  }
  function onBlur() { tracker.blur(); Object.keys(el).forEach(function (k) { el[k].classList.remove('is-down'); }); }
  document.addEventListener('keydown', onDown, true);
  document.addEventListener('keyup', onUp, true);
  addEventListener('blur', onBlur);

  if (!document.getElementById('try-ck-css')) document.head.appendChild(h('style', { id: 'try-ck-css', text:
    '.ck-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 14px;align-items:end}.ck-h{margin:0;font-size:15px;font-weight:600;color:var(--muted);grid-column:1/-1}' +
    '.ck-hz.is-wait{font-size:22px;color:var(--ink-2)}.ck-top .tr-note{grid-column:1/-1;min-height:1.6em}' +
    '.ck-track{container-type:inline-size;position:relative;height:14px;border-radius:7px;background:var(--paper);border:1px solid var(--line);overflow:hidden}' +
    '.ck-run{position:absolute;left:0;top:2px;width:8px;height:8px;border-radius:4px;background:var(--tc)}' +
    '.ck-board{container-type:inline-size;position:relative;width:100%;max-width:560px;margin:4px auto 0}' +
    '.ck-key{position:absolute;box-sizing:border-box;padding:0;border:0;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.ck-key span{position:absolute;inset:4% 5% 10% 5%;display:grid;place-items:center;border-radius:max(3px,1.1cqw);background:var(--paper);border:1px solid var(--line);' +
    'box-shadow:0 2px 0 var(--line);font-size:clamp(7px,2.3cqw,13px);font-weight:700;color:var(--ink-2);line-height:1;white-space:nowrap;overflow:hidden;transition:transform .08s,background .15s,box-shadow .08s}' +
    '.ck-key.is-seen span{background:color-mix(in srgb,var(--tc) 22%,var(--paper));border-color:color-mix(in srgb,var(--tc) 55%,var(--line));color:var(--ink)}' +
    '.ck-key.is-down span{transform:translateY(2px);box-shadow:0 0 0 var(--line);background:var(--tc);color:#fff}' +
    '.ck-key.is-warn span{background:#d9472b;border-color:#d9472b;color:#fff}' +
    '.ck-stat{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:15px;color:var(--ink-2)}.ck-stat b{color:var(--ink);font-variant-numeric:tabular-nums}' +
    '.ck-warn{color:#c23a22;font-weight:600;min-height:1.6em}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .ck-warn{color:#ff8a7a}}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'ck-top' }, [h('p', { class: 'ck-h', text: T.hz }), hzBig, againBtn, hzNote]),
    track,
    h('p', { class: 'ck-h', text: T.kb }),
    h('p', { class: 'tr-note', text: T.tip }),
    board,
    h('div', { class: 'ck-stat' }, [countEl, heldEl]),
    warn
  ]));
  show();
  measure();
  return {
    stop: function () {
      alive = false; cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onDown, true);
      document.removeEventListener('keyup', onUp, true);
      removeEventListener('blur', onBlur);
    },
    auto: function (A) {
      // L·U·M·E·N 을 차례로 누르고, N 을 뗀 지 12ms 만에 한 번 더 눌린 것처럼 보내 채터링 알림을 보여 준다
      var seq = ['KeyL', 'KeyU', 'KeyM', 'KeyE', 'KeyN'].filter(function (k) { return el[k]; });
      var p = A.wait(2400);
      seq.forEach(function (k) { p = p.then(function () { return A.press(el[k]); }).then(function () { return A.wait(160); }); });
      return p.then(function () { return A.wait(400); }).then(function () {
        if (!el.KeyN) return;
        var t = performance.now();
        press('KeyN', t); release('KeyN', t + 60); press('KeyN', t + 72); release('KeyN', t + 140);
        return A.point(el.KeyN);
      });
    }
  };
};
