/* 공학용 계산기 바로 써 보기: 공학용 계산기 사이트의 계산 엔진(engine.js, 전역 SC)을 그대로 불러 식을 푼다.
   식과 답은 SC가 돌려주는 줄 모양(분수·루트·거듭제곱 틀)을 이 창에서 교과서 모양으로 그린다.
   소수로 볼지 정확값으로 볼지는 계산기와 같은 규칙: 식에 점이 있거나 정확값이 없으면 소수, S⇔D로 바꾼다. */
window.LLTry.scicalc = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', SC = window.SC;
  var T = ko
    ? { label: '식', ph: '식을 쳐 보세요 (예: √8, 1/3+1/4)', sd: 'S⇔D', exact: '정확값', dec: '소수', ex: '예시',
        err: { syntax: '식 모양이 맞지 않아요', div0: '0으로 나눌 수 없어요', domain: '이 함수가 받을 수 없는 값이에요', range: '계산할 수 있는 범위를 넘었어요', math: '계산할 수 없는 값이에요' },
        notes: { '6÷2(1+2)': '곱하기 기호를 생략한 곱이 ÷보다 먼저라 1이에요. 6÷2×(1+2)는 9예요.', '√(8)+frac(1,2)': '√8은 2√2로 줄이고, 분수와 더해도 정확값 그대로예요.', 'frac(1,3)+frac(1,4)': '분수끼리 더해도 소수로 바뀌지 않아요.' },
        type: 'sin(45)' }
    : { label: 'Expression', ph: 'Type an expression (e.g. √8, 1/3+1/4)', sd: 'S⇔D', exact: 'exact', dec: 'decimal', ex: 'Examples',
        err: { syntax: 'Syntax error', div0: 'Division by zero', domain: 'Value outside this function’s domain', range: 'Result is out of range', math: 'Can’t calculate this value' },
        notes: { '6÷2(1+2)': 'Implied multiplication comes before ÷, so this is 1. 6÷2×(1+2) is 9.', '√(8)+frac(1,2)': '√8 simplifies to 2√2, and adding a fraction keeps the exact form.', 'frac(1,3)+frac(1,4)': 'Adding fractions keeps them as fractions.' },
        type: 'sin(45)' };
  var EXAMPLES = ['√(8)+frac(1,2)', 'frac(1,3)+frac(1,4)', '6÷2(1+2)'];
  var KEYS = [['√', '√('], ['π', 'π'], ['÷', '÷'], ['×', '×'], ['^', '^'], ['(', '('], [')', ')']];

  // SC 줄 → 교과서 모양 HTML 조각
  function draw(row, into) {
    row.forEach(function (n) {
      if (n.t === 'c') into.appendChild(h('span', { class: /[+−×÷=]/.test(n.v) && n.v.length === 1 ? 'm-op' : 'm-c', text: n.v }));
      else if (n.t === 'f') into.appendChild(h('span', { class: 'm-f', text: n.v }));
      else if (n.t === 'frac') {
        var a = h('span', { class: 'm-num' }), b = h('span', { class: 'm-den' });
        draw(n.a, a); draw(n.b, b);
        into.appendChild(h('span', { class: 'm-frac' }, [a, b]));
      } else if (n.t === 'sqrt' || n.t === 'root') {
        var u = h('span', { class: 'm-under' }); draw(n.a, u);
        var idx = null;
        if (n.t === 'root') { idx = h('sup', { class: 'm-idx' }); draw(n.n, idx); }
        into.appendChild(h('span', { class: 'm-sqrt' }, [idx, h('span', { class: 'm-rad', text: '√' }), u]));
      } else if (n.t === 'pow') { var s = h('sup', { class: 'm-sup' }); draw(n.a, s); into.appendChild(s); }
      else if (n.t === 'abs') { var ab = h('span'); draw(n.a, ab); into.appendChild(h('span', { class: 'm-abs' }, ['|', ab, '|'])); }
      else into.appendChild(h('span', { class: 'm-c', text: SC.rowToPlain([n]) }));
    });
    return into;
  }

  var input = h('input', { class: 'tr-in sc-in', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', placeholder: T.ph, 'aria-label': T.label });
  var exprEl = h('div', { class: 'sc-expr', 'aria-hidden': 'true' });
  var ansEl = h('div', { class: 'sc-ans', 'aria-live': 'polite' });
  var kind = h('span', { class: 'sc-kind' });
  var sdBtn = h('button', { type: 'button', class: 'tr-btn sc-sd', onclick: function () { flip = !flip; show(true); } }, [T.sd]);
  var noteEl = h('p', { class: 'tr-note sc-note' });
  var keys = KEYS.map(function (k) {
    return h('button', { type: 'button', class: 'tr-btn sc-key', onclick: function () { insert(k[1]); } }, [k[0]]);
  });
  var exBtns = EXAMPLES.map(function (e) {
    var b = h('button', { type: 'button', class: 'tr-btn sc-ex', onclick: function () { input.value = e; flip = false; show(true); } });
    draw(SC.parseText(e), b);
    return b;
  });
  var flip = false, errTimer = 0;
  function insert(s) {
    var a = input.selectionStart == null ? input.value.length : input.selectionStart, b = input.selectionEnd == null ? a : input.selectionEnd;
    input.value = input.value.slice(0, a) + s + input.value.slice(b);
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(a + s.length, a + s.length); } catch (e) {}
    show(true);
  }
  function show(pop) {
    var text = input.value.trim();
    clearTimeout(errTimer);
    exprEl.textContent = ''; noteEl.textContent = T.notes[text] || '';
    if (!text) { ansEl.textContent = ''; kind.textContent = ''; sdBtn.disabled = true; return; }
    var row;
    try { row = SC.parseText(text); draw(row, exprEl); } catch (e) { exprEl.textContent = text; }
    try {
      var env = SC.defaultEnv();
      var v = SC.evaluate(SC.parseRow(row), env);
      var exact = v.t !== 'multi' && SC.hasExactDisplay(v);
      var hasDot = row.some(function (n) { return n.t === 'c' && n.v === '.'; });
      var dec = (hasDot || !exact) !== flip;
      if (!exact) dec = true;
      ansEl.textContent = '';
      ansEl.classList.remove('is-err', 'is-wait');
      ansEl.appendChild(h('span', { class: 'm-eq', text: '=' }));
      ansEl.appendChild(draw(SC.valueRow(v, { disp: { mode: 'norm', digits: 4 }, mixed: false, polar: false, angle: env.angle, decimal: dec }), h('span', { class: 'sc-val' })));
      kind.textContent = dec ? T.dec : T.exact;
      sdBtn.disabled = !exact;
      if (pop && !c.reduced) { ansEl.classList.remove('is-flip'); void ansEl.offsetWidth; ansEl.classList.add('is-flip'); }
    } catch (e) {
      // 치는 중엔 잠깐 기다렸다가 알려 준다(틀린 게 아니라 아직 덜 친 것일 수 있다)
      ansEl.classList.add('is-wait');
      sdBtn.disabled = true;
      errTimer = setTimeout(function () {
        ansEl.textContent = ''; ansEl.classList.remove('is-wait'); ansEl.classList.add('is-err');
        ansEl.appendChild(h('span', { class: 'sc-err', text: T.err[e && e.kind === 'syntax' ? 'syntax' : (e && T.err[e.message]) ? e.message : 'math'] }));
        kind.textContent = '';
      }, 900);
    }
  }
  input.addEventListener('input', function () { flip = false; show(false); });

  if (!document.getElementById('try-sc-css')) document.head.appendChild(h('style', { id: 'try-sc-css', text:
    '.sc-lcd{position:relative;display:grid;gap:6px;padding:16px 18px 14px;border-radius:16px;background:var(--paper);border:1px solid var(--line);min-height:132px}' +
    '.sc-expr{min-height:34px;padding-right:64px;font-size:21px;color:var(--ink-2);display:flex;flex-wrap:wrap;align-items:center;row-gap:4px}' +
    '.sc-ansrow{display:flex;align-items:flex-end;gap:10px;justify-content:flex-end;min-height:62px}' +
    '.sc-ans{font-size:clamp(28px,6vw,38px);font-weight:750;display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;transition:opacity .2s}' +
    '.sc-ans.is-wait{opacity:.35}.sc-ans.is-err{font-size:17px;font-weight:600;color:var(--muted)}.sc-ans.is-flip{animation:scflip .3s cubic-bezier(.2,.8,.2,1)}' +
    '@keyframes scflip{from{opacity:0;transform:translateY(-8px) rotateX(50deg)}to{opacity:1;transform:none}}' +
    '.m-eq{color:var(--muted);font-weight:500;margin-right:10px}.sc-kind{font-size:15px;font-weight:600;color:var(--muted);padding-bottom:8px;white-space:nowrap}' +
    '.m-op{margin:0 .22em}.m-f{margin-right:1px}.m-frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .12em;font-size:.82em;line-height:1.1}' +
    '.m-num{padding:0 .2em .08em;border-bottom:.07em solid currentColor;display:flex;align-items:center}.m-den{padding:.08em .2em 0;display:flex;align-items:center}' +
    '.m-sqrt{display:inline-flex;align-items:stretch;position:relative}.m-rad{display:flex;align-items:flex-end;font-size:1.12em;line-height:1;margin-right:-.08em;transform:scaleY(1.08);transform-origin:bottom}' +
    '.m-under{display:inline-flex;align-items:center;border-top:.07em solid currentColor;padding:.06em .1em 0;line-height:1.15}' +
    '.m-idx{font-size:.55em;margin-right:-.5em;align-self:flex-start;transform:translateY(.1em)}.m-sup{font-size:.62em;align-self:flex-start;display:inline-flex}' +
    '.sc-keys{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;max-width:400px}.sc-key{min-width:0;padding:0;font-size:18px}' +
    '.sc-sd{position:absolute;top:10px;right:10px;min-height:36px;padding:0 10px;font-size:15px}.sc-sd:disabled{opacity:.4;cursor:default}' +
    '.sc-exh{margin:0;font-size:15px;font-weight:600;color:var(--muted)}.sc-ex{font-size:17px;font-weight:600;min-height:52px}' +
    '.sc-in{font-size:18px}.sc-note{min-height:1.6em}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    h('div', { class: 'sc-lcd' }, [sdBtn, exprEl, h('div', { class: 'sc-ansrow' }, [kind, ansEl])]),
    noteEl,
    input,
    h('div', { class: 'sc-keys' }, keys),
    h('p', { class: 'sc-exh', text: T.ex }),
    h('div', { class: 'tr-chips' }, exBtns)
  ]));
  show(false);
  return {
    stop: function () { clearTimeout(errTimer); },
    auto: function (A) {
      A.set(input, '');
      return A.press(exBtns[0])
        .then(function () { return A.wait(1300); })
        .then(function () { return A.press(sdBtn); })
        .then(function () { return A.wait(1200); })
        .then(function () { return A.press(exBtns[2]); })
        .then(function () { return A.wait(1900); })
        .then(function () { A.set(input, ''); return A.type(input, T.type, 120); });
    }
  };
};
