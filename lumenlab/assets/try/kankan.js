/* 칸칸 바로 써 보기: 칸칸 사이트의 세는 파일(lc-core.js·lc-cp949.js·lc-wongoji.js, 전역 LC)을 그대로 불러
   글자를 칠 때마다 센다. 아래 원고지는 LC.wongoji.layout(칸칸의 원고지 놓기)이 놓은 그대로 첫 장을 그린다. */
window.LLTry.kankan = function (stage, c) {
  var h = c.h, ko = c.lang === 'ko', LC = window.LC;
  var nf = new Intl.NumberFormat(ko ? 'ko-KR' : 'en-US');
  var T = ko
    ? { label: '세어 볼 글', ph: '글을 쓰거나 붙여 넣어 보세요', chars: '글자(공백 포함)', nospace: '공백 제외', utf8: '바이트(UTF-8)', euckr: '바이트(EUC-KR)', words: '단어',
        nl: '줄바꿈 한 번을', nlv: ['안 셈', '1자', '2자'], sheet: function (n) { return '200자 원고지 ' + n + '장'; }, more: function (n) { return '첫 장만 보여요 · ' + n + '장'; },
        sample: ['자기소개서 첫 문장을 써 볼게요.', '저는 맡은 일을 끝까지 해내는 사람입니다.'] }
    : { label: 'Text to count', ph: 'Type or paste some text', chars: 'Characters', nospace: 'No spaces', utf8: 'Bytes (UTF-8)', euckr: 'Bytes (EUC-KR)', words: 'Words',
        nl: 'Count a line break as', nlv: ['0', '1', '2'], sheet: function (n) { return n + (n === 1 ? ' sheet' : ' sheets') + ' of 200-square manuscript paper'; }, more: function (n) { return 'Showing sheet 1 of ' + n; },
        sample: ['Here is the first line of my essay.', 'Every space and line break counts.'] };
  var nl = 1;
  var ta = h('textarea', { class: 'tr-in', rows: 3, placeholder: T.ph, 'aria-label': T.label, spellcheck: 'false' });
  var big = h('p', { class: 'tr-big', 'aria-live': 'polite' });
  var tiles = {};
  var stats = h('ul', { class: 'tr-stats' }, ['nospace', 'utf8', 'euckr', 'words'].map(function (k) {
    tiles[k] = h('b', { text: '0' });
    return h('li', null, [tiles[k], h('span', { text: T[k] })]);
  }));
  var nlBtns = [0, 1, 2].map(function (v) {
    return h('button', { type: 'button', class: 'tr-btn', 'aria-pressed': String(v === nl), onclick: function () { nl = v; nlBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === v)); }); count(true); } }, [T.nlv[v]]);
  });
  var paper = h('div', { class: 'wg', 'aria-hidden': 'true' });
  var cells = [];
  for (var i = 0; i < 200; i++) { var cl = h('span'); cells.push(cl); paper.appendChild(cl); }
  var sheetNote = h('p', { class: 'tr-note wg-note' });

  function count(pop) {
    var t = ta.value;
    var r = LC.analyze(t, { newline: nl, locale: c.lang });
    big.textContent = '';
    big.appendChild(document.createTextNode(nf.format(r.chars)));
    big.appendChild(h('small', { text: T.chars }));
    if (pop) big.classList.remove('tr-pop'), void big.offsetWidth, big.classList.add('tr-pop');
    tiles.nospace.textContent = nf.format(r.charsNoSpace);
    tiles.utf8.textContent = nf.format(r.bytes.utf8);
    tiles.euckr.textContent = r.bytes.euckr ? nf.format(r.bytes.euckr.bytes) : '–';
    tiles.words.textContent = nf.format(r.words);
    var lay = LC.wongoji.layout(t), k = 0;
    for (var y = 0; y < 10; y++) {
      var row = lay.rows[y] || [];
      for (var x = 0; x < 20; x++, k++) {
        var cell = row[x], el = cells[k], txt = cell ? cell.t : '';
        if (el.textContent !== txt || el.classList.contains('is-used') !== !!cell) {
          el.textContent = txt;
          el.classList.toggle('is-used', !!cell);
        }
      }
    }
    var n = Math.max(lay.sheets, t ? 1 : 0);
    sheetNote.textContent = n > 1 ? T.sheet(n) + ' · ' + T.more(n) : T.sheet(n);
  }
  ta.addEventListener('input', function () { count(false); });
  if (!document.getElementById('try-wg-css')) document.head.appendChild(h('style', { id: 'try-wg-css', text:
    '.wg{display:grid;grid-template-columns:repeat(20,minmax(0,1fr));border:1.5px solid #c9573f;border-radius:6px;background:var(--paper);overflow:hidden}' +
    '.wg span{aspect-ratio:1;display:grid;place-items:center;border-right:1px solid color-mix(in srgb,#c9573f 35%,transparent);border-bottom:1px solid color-mix(in srgb,#c9573f 35%,transparent);' +
    'font-size:clamp(9px,2.4vw,15px);line-height:1;color:var(--ink);overflow:hidden;white-space:nowrap}' +
    '.wg span:nth-child(20n){border-right:0}.wg span:nth-child(n+181){border-bottom:0}' +
    '.wg span.is-used{background:color-mix(in srgb,#c9573f 7%,transparent)}' +
    '.wg-nl{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.wg-nl p{margin:0;font-size:15px;font-weight:600;color:var(--muted)}' }));
  stage.appendChild(h('div', { class: 'tr' }, [
    ta, big, stats,
    h('div', { class: 'wg-nl' }, [h('p', { text: T.nl })].concat(nlBtns)),
    paper, sheetNote
  ]));
  count(false);
  return {
    auto: function (A) {
      A.set(ta, '');
      // 첫 화면 '이 글 글자 수' 칸에서 열면 그 글을 그대로 넣어 같은 수가 나오는 것을 보인다
      if (c.seed && c.seed.text) return A.type(ta, c.seed.text, Math.min(28, Math.round(2600 / Array.from(c.seed.text).length)));
      return A.type(ta, T.sample[0], 70)
        .then(function () { return A.wait(250); })
        .then(function () { A.set(ta, ta.value + '\n'); return A.type(ta, T.sample[1], 70); })
        .then(function () { return A.wait(600); })
        .then(function () { return A.press(nlBtns[2]); })
        .then(function () { return A.wait(1100); })
        .then(function () { return A.press(nlBtns[1]); });
    }
  };
};
