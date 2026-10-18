/* 토독 바로 써 보기: 토독 사이트의 타자 파일(tj-core.js, 전역 TJ)을 그대로 불러 한 문장을 재 본다.
   비교·타수·정확도는 TJ.Session(두벌식 글쇠 흐름으로 견주는 토독의 판정), 결과는 TJ.report(화면에 쓰는 식과 같은 값).
   조합 중인 글자는 다른 글자로 바꿔 그리지 않고 친 만큼만 채운다(토독과 같다). 아래 키 줄 = 지금까지 누른 키(두벌식). */
window.LLTry.todok = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', TJ = window.TJ, HG = TJ.hangul;
  var T = ko
    ? { label: '여기에 따라 쳐 보세요', ph: '위 문장을 그대로 쳐 보세요', speed: '타/분', acc: '정확도', keys: '누른 키', next: '다른 문장',
        formula: function (r) { return '맞게 친 ' + r.strokes + '타 ÷ ' + r.secsText + '초 × 60 = ' + r.speed + '타/분'; },
        big: function (r) { return r.speed; }, unit: '타/분',
        samples: ['귀찮아도 양치질은 건너뛰지 않아요.', '동네 도서관은 화요일마다 문을 닫아요.', '쓰레기는 요일에 맞춰 내놓아야 해요.', '단추가 떨어진 스웨터를 꿰매 입었어요.'] }
    : { label: 'Type along here', ph: 'Type the sentence above', speed: 'WPM', acc: 'Accuracy', keys: 'Keys', next: 'Another sentence',
        formula: function (r) { return r.chars + ' correct characters ÷ 5 ÷ ' + r.secsText + ' s × 60 = ' + r.wpm + ' WPM'; },
        big: function (r) { return r.wpm; }, unit: 'WPM',
        samples: ['Where did you put the scissors?', 'The copier is out of paper again.', 'What a relief to finally be done!', 'Flight 608 now boards at gate 12.'] };
  var si = 0, target = T.samples[0], S = null, t0 = 0, done = false, sawKey = false, tick = 0;
  var line = h('p', { class: 'td-line', 'aria-hidden': 'true' });
  var srLine = h('p', { class: 'td-sr' });
  var input = h('input', { class: 'tr-in td-in', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: T.ph, 'aria-label': T.label });
  var spEl = h('b'), accEl = h('b'), keyEl = h('b');
  var stats = h('ul', { class: 'tr-stats td-stats' }, [
    h('li', null, [spEl, h('span', { text: T.speed })]), h('li', null, [accEl, h('span', { text: T.acc })]), h('li', null, [keyEl, h('span', { text: T.keys })])
  ]);
  var caps = h('div', { class: 'td-caps', 'aria-hidden': 'true' });
  var result = h('div', { class: 'td-res', hidden: true });
  var nextBtn = h('button', { type: 'button', class: 'tr-btn', onclick: function () { si = (si + 1) % T.samples.length; load(T.samples[si]); } }, [T.next]);
  var cells = [];

  function load(text) {
    target = text; S = null; t0 = 0; done = false; clearInterval(tick);
    line.textContent = ''; cells = [];
    TJ.prepare(text).chars.forEach(function (ch) {
      var sp = h('span', { class: ch === ' ' ? 'td-c td-sp' : 'td-c', text: ch === ' ' ? ' ' : ch });
      cells.push(sp); line.appendChild(sp);
    });
    srLine.textContent = text;
    input.value = ''; input.readOnly = false;
    caps.textContent = ''; result.hidden = true; result.textContent = '';
    spEl.textContent = '0'; accEl.textContent = '–'; keyEl.textContent = '0';
    paint(null);
  }
  function paint(r) {
    var st = r ? r.st : [], cur = r ? r.cursor : 0;
    cells.forEach(function (sp, i) {
      var s = st[i] || 0, cls = 'td-c' + (sp.classList.contains('td-sp') ? ' td-sp' : '');
      if (s === 1) cls += ' is-ok'; else if (s === 2) cls += ' is-bad';
      else if (s === 3) {
        cls += ' is-pend';
        var n = HG.keysOf(TJ.prepare(target).chars[i]).length || 1;
        sp.style.setProperty('--f', Math.round(r.pendingDone / n * 100) + '%');
      }
      if (i === cur && !(r && r.complete)) cls += ' is-cur';
      if (sp.className !== cls) sp.className = cls;
    });
  }
  function showKeys(value) {
    // 지금까지 누른 키(두벌식 글쇠). 마지막 열두 개만, 새로 생긴 것은 튀어 들어온다
    var ks = HG.keyStream(value).map(function (k) { return k === ' ' ? '␣' : k; });
    var old = caps.childNodes.length, keep = ks.slice(-12);
    caps.textContent = '';
    keep.forEach(function (k, i) {
      var isNew = ks.length > lastLen && i >= keep.length - (ks.length - lastLen);
      caps.appendChild(h('span', { class: 'td-cap' + (isNew && !c.reduced ? ' is-new' : ''), text: k }));
    });
    lastLen = ks.length;
    return old;
  }
  var lastLen = 0;
  function live() {
    if (!S || done) return;
    var ms = Math.max(performance.now() - t0, 1000);
    spEl.textContent = String(Math.round(ko ? TJ.calc.perMin(S.cmp.okStrokes, ms) : TJ.calc.wpm(S.cmp.okChars, ms)));
    var a = TJ.calc.accuracy(S.okKeys, S.typedKeys);
    accEl.textContent = a == null ? '–' : Math.round(a) + '%';
    keyEl.textContent = String(S.typedKeys);
  }
  function onInput() {
    if (done) return;
    var v = HG.cleanInput(input.value), now = performance.now();
    if (!S) {
      if (!v) return;
      S = new TJ.Session(target, { mode: sawKey ? 'key' : 'char' });
      t0 = now; lastLen = 0;
      tick = setInterval(live, 250);
    }
    var r = S.update(v, now - t0);
    paint(r);
    showKeys(v);
    live();
    if (r.complete || S.wouldComplete()) finish(now);
  }
  function finish(now) {
    done = true; clearInterval(tick);
    var res = S.finish(now - t0), rep = TJ.report(res);
    paint(S.cmp);
    input.readOnly = true;
    spEl.textContent = String(T.big(rep)); accEl.textContent = rep.accuracy == null ? '–' : rep.accuracy + '%'; keyEl.textContent = String(rep.typed);
    result.textContent = '';
    result.appendChild(h('p', { class: 'tr-big' }, [String(T.big(rep)), h('small', { text: T.unit })]));
    result.appendChild(h('p', { class: 'tr-note', text: T.formula(rep) }));
    result.hidden = false;
    if (!c.reduced) { result.classList.remove('tr-pop'); void result.offsetWidth; result.classList.add('tr-pop'); }
  }
  input.addEventListener('keydown', function (e) { if (e.code && e.code !== 'Unidentified' && e.isTrusted) sawKey = true; });
  input.addEventListener('input', onInput);
  input.addEventListener('compositionend', onInput);

  if (!document.getElementById('try-td-css')) document.head.appendChild(h('style', { id: 'try-td-css', text:
    '.td-line{margin:0;padding:16px 16px 14px;border-radius:14px;background:var(--paper);border:1px solid var(--line);font-size:clamp(19px,4.6vw,23px);line-height:1.6;letter-spacing:.01em;word-break:keep-all}' +
    '.td-c{color:var(--muted);border-bottom:2px solid transparent}.td-c.is-ok{color:var(--ink)}' +
    '.td-c.is-bad{color:#d9472b;border-bottom-color:#d9472b}.td-c.is-cur{border-bottom-color:var(--tc)}' +
    '.td-c.is-pend{background:linear-gradient(90deg,var(--tc) var(--f,0%),var(--muted) var(--f,0%));-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.td-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '.td-in{font-size:18px}.td-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.td-stats li b{color:var(--ink)}.td-stats li:first-child b{color:var(--tc)}' +
    '.td-caps{display:flex;gap:5px;min-height:36px;overflow:hidden;justify-content:flex-end}' +
    '.td-cap{flex:none;display:grid;place-items:center;min-width:32px;height:34px;padding:0 6px;border-radius:8px;background:#f1eadb;color:#2a2340;font-weight:800;font-size:16px;' +
    'box-shadow:0 3px 0 color-mix(in srgb,var(--tc) 55%,#000)}.td-cap.is-new{animation:tdcap .22s cubic-bezier(.2,.8,.2,1)}' +
    '@keyframes tdcap{from{transform:translateY(-10px) scale(.7);opacity:0}to{transform:none;opacity:1}}' +
    '.td-res{display:grid;gap:2px;padding:14px 16px;border-radius:14px;background:color-mix(in srgb,var(--tc) 10%,var(--card));border:1px solid color-mix(in srgb,var(--tc) 30%,var(--line))}' +
    '.td-res .tr-big{color:var(--tc)}.td-row{display:flex;justify-content:flex-end}' }));
  stage.appendChild(h('div', { class: 'tr' }, [line, srLine, input, caps, stats, result, h('div', { class: 'td-row' }, [nextBtn])]));
  load(target);

  // 자동 시연: 한글은 입력기가 실제로 보여 주는 모양 그대로(ㄱ → 귀 → 귀ㅊ → 귀차 → 귀찮 …) 한 단계씩 넣는다
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function stages(text) {
    var out = [], acc = '';
    Array.from(text).forEach(function (ch) {
      var k = ch.charCodeAt(0) - 0xAC00;
      if (k >= 0 && k < 11172) {
        var cho = Math.floor(k / 588), jung = Math.floor(k % 588 / 28), jong = k % 28;
        out.push(acc + CHO[cho]);
        out.push(acc + String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28));
        if (jong) out.push(acc + ch);
      } else out.push(acc + ch);
      acc += ch;
    });
    return out;
  }
  return {
    stop: function () { clearInterval(tick); },
    auto: function (A) {
      load(T.samples[si]);
      var seq = ko ? stages(target) : Array.from(target).map(function (_, i) { return target.slice(0, i + 1); });
      return A.type(input, seq, ko ? 140 : 120);
    }
  };
};
