/* 니치 앱 리포트 — 화면 그리기와 기능 (필터·탭·펼치기·체크)
   내용은 data.js(window.R)에서 가져와요. 움직임은 motion.js가 맡아요.
   이 파일만으로도 모든 내용이 최종 모습으로 보이게 만들어요 (움직임이 없어도 읽을 수 있게). */
(function () {
  'use strict';
  var R = window.R;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // 띄어 쓴 가운뎃점은 앞 칸을 붙는 공백으로 (점이 줄 맨 앞에 오지 않게)
  // 붙여 쓴 가운뎃점(A·B)은 앞말과 떨어지지 않게 (줄 맨 앞에 '·'가 오지 않게)
  function fix(s) { return String(s).replace(/ · /g, '\u00a0· ').replace(/([^\s>])·/g, '$1\u2060·'); }

  // 요소 만들기. 글은 textContent로, 이 사이트가 직접 쓴 짧은 강조(<b>)만 html로 넣어요.
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = fix(v);
      else if (k === 'html') el.innerHTML = fix(v);
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(fix(c)) : c); });
    return el;
  }
  function fmt(n, dec) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  // 숫자 올라가기용 표시: 최종 값을 글자로 넣어 두고, motion.js가 0부터 다시 셉니다.
  function num(v, dec, pre, suf) {
    return h('span', { class: 'count', 'data-to': v, 'data-dec': dec || 0, 'data-pre': pre || '', 'data-suf': suf || '' }, [(pre || '') + fmt(v, dec) + (suf || '')]);
  }
  function srcLine(list, lead) {
    var arr = Array.isArray(list) ? list : [list];
    var p = h('p', { class: 'src' }, [(lead || '출처') + ' ']);
    arr.forEach(function (s, i) {
      if (i) p.appendChild(document.createTextNode(' · '));
      p.appendChild(h('a', { href: s.u, target: '_blank', rel: 'noopener', text: s.t }));
    });
    return p;
  }
  // 가로 막대: 가장 큰 값이 칸의 66%까지 (끝에 숫자 붙일 자리)
  function hbar(name, v, max, opts) {
    opts = opts || {};
    var pct = Math.max(1.2, (v / max) * 66);
    var label = opts.label != null ? opts.label : fmt(v, opts.dec) + (opts.suf || '');
    return h('div', { class: 'hbar' }, [
      h('div', { class: 'hbar-n', text: name }),
      h('div', { class: 'hbar-track' }, [
        h('i', { class: 'hbar-fill' + (opts.gray ? ' gray' : ''), style: 'width:' + pct + '%', 'data-bar': '', title: name + ' ' + label }),
        h('span', { class: 'hbar-v', style: 'left:' + pct + '%' }, [
          opts.count ? num(v, opts.dec, opts.pre, opts.suf) : label
        ])
      ])
    ]);
  }
  function waffle(v, per) {
    var on = Math.floor(v), w = h('div', { class: 'waffle', role: 'img', 'aria-label': '100개 중 ' + fmt(v, 1) + '개' });
    for (var i = 0; i < 100; i++) w.appendChild(h('i', { class: i < on ? 'on' : '' }));
    return w;
  }

  /* ── 0. 세 줄 요약 ───────────────────── */
  var tl = $('#tldr');
  R.tldr.forEach(function (t) { tl.appendChild(h('li', null, [h('span', { class: 'k', text: t.k }), h('div', { html: t.t })])); });

  /* ── 1. 숫자 ─────────────────────────── */
  (function () {
    var f = R.flood, box = $('#flood');
    box.appendChild(h('div', null, [
      h('div', { class: 'flood-big' }, [
        h('div', null, [h('small', { text: f.apps.label }), h('span', { class: 'n blue' }, [num(f.apps.v, 0, '+', '%')])]),
        h('div', null, [h('small', { text: f.downloads.label }), h('span', { class: 'n' }, [num(f.downloads.v, 0, '+', '%')])])
      ]),
      h('p', { class: 'flood-note', text: '신규 앱: ' + f.apps.note + '. 다운로드: ' + f.downloads.note + '.' }),
      srcLine([f.apps.src, f.downloads.src])
    ]));
    box.appendChild(h('div', { role: 'img', 'aria-label': '전년 대비 증가율: 신규 앱 출시 60%, 전체 다운로드 2%' }, [
      hbar('신규 앱 출시', 60, 60, { suf: '%', label: '+60%' }),
      hbar('전체 다운로드', 2, 60, { suf: '%', label: '+2%', gray: true })
    ]));

    var sg = $('#stats');
    R.stats.forEach(function (s) {
      var viz;
      if (s.viz === 'waffle') viz = waffle(s.v);
      else if (s.viz === 'split') viz = h('div', { role: 'img', 'aria-label': '상위 10% 앱 92.6%, 나머지 90% 앱 7.4%' }, [
        h('div', { class: 'split' }, [h('i', { style: 'width:' + s.v + '%', 'data-bar': '' }), h('i', { style: 'width:' + (100 - s.v) + '%' })]),
        h('div', { class: 'split-l' }, [h('span', { text: '상위 10% 앱' }), h('span', { text: '나머지 90% 앱 7.4%' })])
      ]);
      else viz = h('div', null, s.bars.map(function (b, i) { return hbar(b.n, b.v, 2.9, { dec: 1, suf: '%', gray: i > 0 }); }));
      sg.appendChild(h('article', { class: 'stat' }, [
        h('div', { class: 'stat-v' }, [num(s.v, s.dec), h('small', { text: s.unit })]),
        h('p', { class: 'stat-t', text: s.title }),
        viz,
        h('p', { class: 'stat-b', text: s.body }),
        srcLine(s.src)
      ]));
    });

    var g = $('#goal');
    g.appendChild(h('div', { class: 'goal-main' }, [h('p', { text: R.goal.t }), h('p', { class: 'gv', text: R.goal.v }), h('p', { class: 'gs', text: R.goal.sub })]));
    R.aiSpeed.forEach(function (a, i) {
      g.appendChild(h('div', { class: 'ai-card' }, [h('p', { class: 'v' + (i ? ' down' : ''), text: a.v }), h('p', { text: a.t }), srcLine(a.src)]));
    });
  })();

  /* ── 2. 사례 ─────────────────────────── */
  R.cases.win.forEach(function (c) {
    $('#win').appendChild(h('li', { class: 'case' }, [h('span', { class: 'case-n', text: c.n }), h('span', { class: 'case-who', text: c.who }), h('p', { class: 'case-t', text: c.t }), srcLine(c.src)]));
  });
  R.cases.lose.forEach(function (c) {
    $('#lose').appendChild(h('li', { class: 'case' }, [h('span', { class: 'case-n', text: c.n }), h('span', { class: 'case-who', text: c.why }), h('p', { class: 'case-t', text: c.t }), srcLine(c.src)]));
  });

  /* ── 3. 거름망 그림 (최종 모습) ───────── */
  var SIEVE = (function () {
    var NS = 'http://www.w3.org/2000/svg', svg = $('#funnel'), CX = 262, HOLE = 34, R_ = 8;
    var layers = [{ y: 130, w: 400, out: 12 }, { y: 210, w: 330, out: 10 }, { y: 290, w: 260, out: 5 }, { y: 370, w: 190, out: 4 }, { y: 450, w: 124, out: 2 }];
    var left = [36, 24, 14, 9, 5, 3];
    var colors = ['var(--ball-green)', 'var(--coral)', 'var(--cream)', 'var(--ball-gray)'];
    function s(tag, a) { var el = document.createElementNS(NS, tag); Object.keys(a || {}).forEach(function (k) { el.setAttribute(k, a[k]); }); return el; }
    function t(x, y, cls, txt, anchor) { var el = s('text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'start' }); el.textContent = txt; return el; }

    // 깔때기 테두리 (걸러지는 느낌)
    var L0 = layers[0], L4 = layers[4];
    svg.appendChild(s('path', { class: 'rim', d: 'M' + (CX - L0.w / 2) + ' ' + (L0.y + 6) + ' L' + (CX - L4.w / 2) + ' ' + (L4.y + 6) + ' M' + (CX + L0.w / 2) + ' ' + (L0.y + 6) + ' L' + (CX + L4.w / 2) + ' ' + (L4.y + 6) }));
    svg.appendChild(t(CX, 24, 'count', '아이디어 36개', 'middle'));
    layers.forEach(function (L, i) {
      var x0 = CX - L.w / 2, half = (L.w - HOLE) / 2;
      var g = s('g', { class: 'layer-g', 'data-i': i });
      g.appendChild(s('rect', { class: 'layer', x: x0, y: L.y, width: half, height: 12, rx: 6 }));
      g.appendChild(s('rect', { class: 'layer', x: CX + HOLE / 2, y: L.y, width: half, height: 12, rx: 6 }));
      g.appendChild(s('circle', { cx: x0 - 18, cy: L.y + 6, r: 13, fill: 'var(--cream)' }));
      g.appendChild(t(x0 - 18, L.y + 11, 'layer-no', String(i + 1), 'middle'));
      svg.appendChild(g);
      svg.appendChild(t(CX + L.w / 2 + 12, L.y + 11, 'count lc', '남음 ' + left[i + 1], 'start'));
    });
    // 공: 걸러지는 층과 쉬는 자리
    var balls = [], k = 0;
    layers.forEach(function (L, li) {
      var half = (L.w - HOLE) / 2, per = Math.floor(half / (R_ * 2 + 2));
      for (var j = 0; j < L.out; j++) {
        var side = j % 2 ? 1 : -1, slot = Math.floor(j / 2);
        var x = side < 0 ? CX - L.w / 2 + R_ + 2 + slot * (R_ * 2 + 2) : CX + L.w / 2 - R_ - 2 - slot * (R_ * 2 + 2);
        if (slot >= per) x = CX + side * (HOLE / 2 + R_ + 2);
        balls.push({ layer: li, x: x, y: L.y - R_ - 1, c: colors[k % 4] }); k++;
      }
    });
    for (var p = 0; p < 3; p++) balls.push({ layer: 5, x: CX + (p - 1) * 26, y: 506, c: colors[p] });
    // 섞어서 순서대로 떨어지게 (같은 층끼리 몰리지 않게)
    var order = balls.map(function (b, i) { return i; });
    var seed = 7; order.sort(function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - .5; });
    var startPos = [];
    order.forEach(function (bi, n) {
      var col = n % 9, row = Math.floor(n / 9);
      startPos[bi] = { x: CX - 4 * 19 + col * 19 + (row % 2 ? 9 : 0), y: 44 + row * 13 };
    });
    var els = balls.map(function (b, i) {
      var c = s('circle', { cx: b.x, cy: b.y, r: R_, fill: b.layer === 5 ? 'var(--gold)' : b.c, class: 'ball' + (b.layer === 5 ? ' coin' : '') });
      c._b = b; c._start = startPos[i]; c._color = b.c;
      svg.appendChild(c); return c;
    });
    var endT = t(CX, 545, 'count-end', '돈 낼 사람이 있는 3개', 'middle');
    svg.appendChild(endT);
    return { svg: svg, els: els, order: order, layers: layers, CX: CX, endT: endT };
  })();
  window.__SIEVE = SIEVE;

  /* ── 3. 체크 질문 ─────────────────────── */
  (function () {
    var ans = [null, null, null, null, null], list = $('#checks'), out = $('#verdict');
    R.filters.forEach(function (f, i) {
      var yes = h('button', { type: 'button', class: 'yes', 'aria-pressed': 'false', text: '예' });
      var no = h('button', { type: 'button', class: 'no', 'aria-pressed': 'false', text: '아니오' });
      function set(v) { ans[i] = ans[i] === v ? null : v; yes.setAttribute('aria-pressed', ans[i] === true); no.setAttribute('aria-pressed', ans[i] === false); render(); }
      yes.addEventListener('click', function () { set(true); });
      no.addEventListener('click', function () { set(false); });
      list.appendChild(h('li', { class: 'check' }, [
        h('span', { class: 'check-no', text: String(i + 1) }),
        h('p', { class: 'check-q' }, [f.q, h('span', { class: 'check-eg', text: f.eg })]),
        h('div', { class: 'yn', role: 'group', 'aria-label': (i + 1) + '번 답' }, [yes, no])
      ]));
    });
    function render() {
      var yes = ans.filter(function (a) { return a === true; }).length;
      var done = ans.filter(function (a) { return a !== null; }).length;
      var head, body, meter = h('div', { class: 'meter', 'aria-hidden': 'true' }, ans.map(function (a) { return h('i', { class: a === true ? 'on' : '' }); }));
      if (!done) { head = '내 아이디어로 예·아니오를 눌러 보세요'; body = '다섯 개를 다 통과하면 6주 검증으로 넘어갈 만해요.'; }
      else if (ans[1] === false) { head = '지불자가 없으면 나머지가 좋아도 어려워요'; body = '2번이 비었어요. 사용자 말고 누가 돈을 낼 수 있는지(기관·사업자·후원사)부터 다시 찾아요.'; }
      else if (done < 5) { head = '통과 ' + yes + '개 · 남은 질문 ' + (5 - done) + '개'; body = '남은 질문에도 답해 보세요.'; }
      else if (yes === 5) { head = '다섯 번 다 통과했어요'; body = null; }
      else if (yes >= 3) { head = '통과 ' + yes + '개 · 빈칸부터 채워요'; body = '아니오라고 답한 질문을 해결할 방법이 있는지 먼저 찾아요.'; }
      else { head = '통과 ' + yes + '개 · 타겟을 다시 잡아요'; body = '타겟이나 지불자를 바꿔서 다시 걸러 보세요. 아래 후보들이 예시예요.'; }
      out.innerHTML = '';
      out.appendChild(h('p', { class: 'vh', text: head }));
      out.appendChild(meter);
      if (body) out.appendChild(h('p', { class: 'vb', text: body }));
      else out.appendChild(h('p', { class: 'vb' }, ['코드보다 먼저 ', h('a', { href: '#plan', text: '6주 검증' }), '으로 돈 낼 사람이 실제로 있는지 확인해요.']));
    }
    render();
  })();

  /* ── 4. 후보 ─────────────────────────── */
  (function () {
    var grid = $('#ideaGrid'), state = { rank: 'all', area: 'all' };
    var cards = R.ideas.map(function (it) {
      var detailId = 'd-' + it.id;
      var btn = h('button', { type: 'button', class: 'more-btn', 'aria-expanded': 'false', 'aria-controls': detailId }, ['자세히 보기 ', h('span', { class: 'ar', 'aria-hidden': 'true', text: '▾' })]);
      var detail = h('div', { class: 'idea-detail', id: detailId, hidden: true }, [
        h('div', null, [h('h4', { text: '근거' }), h('ul', null, it.proof.map(function (p) { return h('li', { html: p }); }))]),
        h('div', null, [h('h4', { text: '어떻게 만들까' }), h('p', { html: it.build })]),
        h('div', { class: 'dline risk' }, [h('b', { text: '위험' }), h('span', { text: it.risk })]),
        h('div', { class: 'dline redl' }, [h('b', { text: '선' }), h('span', { text: it.line })]),
        h('div', { class: 'dline first' }, [h('b', { text: '첫 확인' }), h('span', { text: it.first })]),
        srcLine(it.src)
      ]);
      btn.addEventListener('click', function () { toggle(card, btn, detail); });
      var card = h('article', { class: 'idea', id: 'idea-' + it.id, 'data-rank': it.rank, 'data-area': it.area }, [
        h('div', { class: 'idea-top' }, [
          h('div', { class: 'idea-img' }, [h('img', { src: it.img, alt: '', width: 560, height: 560, loading: 'lazy' }), h('span', { class: 'ai-tag', text: 'AI 그림' })]),
          h('div', null, [
            h('div', { class: 'idea-meta' }, [h('span', { class: 'rank r' + it.rank, text: it.rank + '순위' }), h('span', { class: 'area-tag', text: R.areasLabel[it.area] })]),
            h('h3', { class: 'idea-name', text: it.name })
          ])
        ]),
        h('p', { class: 'idea-one', text: it.one }),
        h('div', { class: 'idea-big' }, [h('span', { class: 'v', text: it.big.v }), h('span', { class: 't', text: it.big.t })]),
        h('p', { class: 'idea-pay' }, [h('b', { text: '누가 돈을 내나' }), it.payer]),
        btn, detail
      ]);
      grid.appendChild(card);
      return card;
    });
    function toggle(card, btn, detail, force) {
      var open = force != null ? force : btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      btn.firstChild.nodeValue = open ? '접기 ' : '자세히 보기 ';
      detail.hidden = !open;
      if (open && window.__onOpen) window.__onOpen(detail);
    }
    // 거르기 칩
    var fbox = $('#filters');
    function chip(label, group, val, cnt) {
      var b = h('button', { type: 'button', class: 'chip', 'aria-pressed': state[group] === val ? 'true' : 'false', 'data-g': group, 'data-v': val }, [label, cnt != null ? h('span', { class: 'cnt', text: String(cnt) }) : null]);
      b.addEventListener('click', function () { state[group] = val; apply(); });
      return b;
    }
    var n1 = R.ideas.filter(function (i) { return i.rank === 1; }).length;
    fbox.appendChild(chip('전체', 'rank', 'all', R.ideas.length));
    fbox.appendChild(chip('1순위', 'rank', '1', n1));
    fbox.appendChild(chip('2순위', 'rank', '2', R.ideas.length - n1));
    fbox.appendChild(h('span', { class: 'sep', 'aria-hidden': 'true' }));
    fbox.appendChild(chip('모든 분야', 'area', 'all'));
    Object.keys(R.areasLabel).forEach(function (k) {
      var c = R.ideas.filter(function (i) { return i.area === k; }).length;
      if (c) fbox.appendChild(chip(R.areasLabel[k], 'area', k, c));
    });
    function apply() {
      $$('.chip', fbox).forEach(function (b) { b.setAttribute('aria-pressed', state[b.dataset.g] === b.dataset.v); });
      var shown = [];
      cards.forEach(function (c) {
        var ok = (state.rank === 'all' || c.dataset.rank === state.rank) && (state.area === 'all' || c.dataset.area === state.area);
        c.hidden = !ok; if (ok) shown.push(c);
      });
      $('#ideaEmpty').hidden = shown.length > 0;
      if (window.__onFilter) window.__onFilter(shown);
    }
    // 현장 접근권 상자
    var dc = R.ideas.filter(function (i) { return i.insider; })[0];
    var ins = $('#insider');
    var go = h('button', { type: 'button', text: '이 후보 자세히 보기 →' });
    go.addEventListener('click', function () {
      state.rank = 'all'; state.area = 'all'; apply();
      var card = $('#idea-' + dc.id);
      toggle(card, $('.more-btn', card), $('.idea-detail', card), true);
      card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    ins.appendChild(h('img', { src: dc.img, alt: '', width: 560, height: 560, loading: 'lazy' }));
    ins.appendChild(h('div', null, [
      h('p', { class: 'ih', html: '현장 접근권이 있으면 <em>순위가 뒤집혀요</em>' }),
      h('p', { text: '가족이 운영하는 주간보호센터처럼 설계를 같이 볼 현장이 있으면, 2순위 \'요양기관 운영 보조\'가 가장 빨리 검증할 수 있는 후보가 돼요. 단 보호자 알림장은 이미 잘 돌아가니 출발점이 아니에요. 송영·프로그램·기록처럼 아직 종이와 엑셀에 남은 업무를 1주 관찰해 목록으로 만드는 데서 시작해요.' }),
      go
    ]));
    // 3순위
    $('#thirds').appendChild(h('h3', null, ['3순위', h('span', { text: '지불자나 수요 검증이 먼저 필요한 것' })]));
    $('#thirds').appendChild(h('ul', null, R.thirds.map(function (t) { return h('li', { text: t }); })));
  })();

  /* ── 5. 분야별 ───────────────────────── */
  (function () {
    var tabs = $('#areaTabs'), panels = $('#areaPanels'), btns = [];
    function chartFor(c) {
      if (c.type === 'divide') {
        var wrap = h('div', null, [
          h('div', { class: 'divide', role: 'img', 'aria-label': '신규 희귀질환자 6만 2,420명 나누기 지정 질환 1,389개는 질환당 약 45명' }, [
            h('div', null, [h('div', { class: 'dv' }, [num(c.total)]), h('small', { text: '신규 환자 (명)' })]),
            h('span', { class: 'op', text: '÷' }),
            h('div', null, [h('div', { class: 'dv' }, [num(c.parts)]), h('small', { text: '지정 질환 (개)' })]),
            h('span', { class: 'op', text: '≈' }),
            h('div', null, [h('div', { class: 'dv blue' }, [num(c.avg)]), h('small', { text: '질환당 (명)' })])
          ]),
          h('div', { class: 'skew' }, [
            hbar('다낭성 신장질환', 4830, 4830, { label: '4,830명' }),
            hbar('질환 하나 평균', 45, 4830, { label: '45명', gray: true })
          ])
        ]);
        return wrap;
      }
      if (c.type === 'growth') {
        return h('div', null, c.rows.map(function (r) {
          return h('div', { class: 'grow-row' }, [
            h('div', { class: 'grow-h' }, [r.n, h('span', { text: r.tag })]),
            hbar(r.al, r.a, r.b, { gray: true, label: fmt(r.a) }),
            hbar(r.bl, r.b, r.b, { label: fmt(r.b) })
          ]);
        }));
      }
      if (c.type === 'share') {
        return h('div', null, [
          h('div', { class: 'share-big' }, [num(c.v, 1), h('small', { text: '%' })]),
          h('p', { class: 'share-t', text: c.label + ' · 전체 ' + c.total }),
          h('div', { class: 'split', role: 'img', 'aria-label': c.label + ' ' + c.v + '%, ' + c.rest + ' ' + fmt(100 - c.v, 1) + '%' }, [
            h('i', { style: 'width:' + c.v + '%', 'data-bar': '' }), h('i', { style: 'width:' + (100 - c.v) + '%' })
          ]),
          h('div', { class: 'split-l' }, [h('span', { text: c.label }), h('span', { text: c.rest + ' ' + fmt(100 - c.v, 1) + '%' })])
        ]);
      }
      if (c.type === 'waffle') {
        return h('div', null, [h('div', { class: 'share-big' }, [num(c.v, 1), h('small', { text: '%' })]), h('p', { class: 'share-t', text: '경영관리 소프트웨어를 쓰는 소상공인' }), waffle(c.v)]);
      }
      if (c.type === 'line') {
        var max = Math.max.apply(null, c.pts.map(function (p) { return p.v; }));
        return h('div', { role: 'img', 'aria-label': c.pts.map(function (p) { return p.x + '년 ' + p.v + '%'; }).join(', ') }, [
          h('div', { class: 'cols' }, c.pts.map(function (p, i) {
            return h('div', { class: 'col' + (i === c.pts.length - 1 ? ' hi' : '') }, [
              h('span', { class: 'cv' }, [num(p.v, 1, '', '%')]),
              h('i', { style: 'height:' + (p.v / max * 150) + 'px', 'data-col': '' })
            ]);
          })),
          h('div', { class: 'col-x' }, c.pts.map(function (p) { return h('span', { text: p.x }); }))
        ]);
      }
    }
    R.areas.forEach(function (a, i) {
      var tid = 'tab-' + a.id, pid = 'panel-' + a.id;
      var b = h('button', { type: 'button', class: 'tab', role: 'tab', id: tid, 'aria-controls': pid, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', text: a.tab });
      b.addEventListener('click', function () { select(i, true); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); var n = (i + d + R.areas.length) % R.areas.length; select(n, true); btns[n].focus(); }
      });
      btns.push(b); tabs.appendChild(b);
      panels.appendChild(h('div', { class: 'panel', role: 'tabpanel', id: pid, 'aria-labelledby': tid, hidden: i !== 0 }, [
        h('div', null, [
          h('h3', { text: a.head }),
          h('p', { class: 'psub', text: a.sub }),
          h('ul', null, a.points.map(function (p) { return h('li', { html: p }); })),
          h('p', { class: 'pdo' }, [h('b', { text: '그래서' }), h('span', { html: a.doIt })])
        ]),
        h('div', { class: 'pchart' }, [chartFor(a.chart), h('p', { class: 'chart-cap', text: a.chart.caption }), srcLine(a.src)])
      ]));
    });
    function select(n, user) {
      btns.forEach(function (b, i) { b.setAttribute('aria-selected', i === n); b.tabIndex = i === n ? 0 : -1; });
      $$('.panel', panels).forEach(function (p, i) { p.hidden = i !== n; });
      if (user && window.__onPanel) window.__onPanel($$('.panel', panels)[n]);
    }
  })();

  /* ── 6. 피할 곳 ───────────────────────── */
  R.avoid.forEach(function (a) { $('#avoidList').appendChild(h('li', null, [h('p', { class: 'an', text: a.n }), h('p', { class: 'aw', text: a.why })])); });

  /* ── 7. 규제 ─────────────────────────── */
  (function () {
    var L = $('#lights');
    [['green', 'g', '초록'], ['orange', 'o', '주황'], ['red', 'r', '빨강']].forEach(function (k) {
      var d = R.rules[k[0]];
      L.appendChild(h('div', { class: 'light ' + k[1] }, [
        h('span', { class: 'lamp', 'aria-hidden': 'true' }),
        h('h3', null, [k[2], h('small', { text: d.t })]),
        h('ul', null, d.items.map(function (x) { return h('li', { text: x }); })),
        h('p', { class: 'ln', text: d.note })
      ]));
    });
    R.pairs.forEach(function (p) {
      $('#pairs').appendChild(h('div', { class: 'pair' }, [
        h('div', { class: 'ok' }, [h('b', { text: '○ 괜찮아요' }), p.ok]),
        h('div', { class: 'no' }, [h('b', { text: '✕ 선을 넘어요' }), p.no]),
        h('div', { class: 'why' }, [p.why, srcLine(p.src)])
      ]));
    });
    R.gates.forEach(function (g) { $('#gates').appendChild(h('li', null, [h('div', null, [h('p', { class: 'gt', text: g.t }), h('p', { class: 'gw', text: g.why })])])); });
  })();

  /* ── 8. 지원사업 달력 ─────────────────── */
  (function () {
    var box = $('#timeline'), Y0 = new Date(2026, 0, 1), Y1 = new Date(2027, 0, 1), SPAN = Y1 - Y0;
    function pos(d) { var t = new Date(d + 'T00:00:00'); return Math.max(0, Math.min(1, (t - Y0) / SPAN)) * 100; }
    function md(d) { return (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)); }
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var inYear = today >= Y0 && today < Y1, tp = (today - Y0) / SPAN * 100;
    var grid = h('div', { class: 'tl-grid' });
    var months = h('div', { class: 'tl-months', 'aria-hidden': 'true' });
    for (var m = 1; m <= 12; m++) months.appendChild(h('span', null, [String(m), h('i', { text: '월' })]));
    grid.appendChild(months);
    var rows = h('div', { class: 'tl-rows' });
    R.grants.forEach(function (g) {
      var endPassed = new Date(g.to + 'T23:59:59') < now;
      var kind = g.kind === 'open' && !endPassed ? 'open' : 'closed';
      var l = pos(g.from), w = Math.max(1, pos(g.to) - l), inside = l + w > 60;
      var label = h('span', { class: 'tl-label' + (inside ? ' in' : ''), style: 'left:calc(' + (inside ? l : l + w) + '% + ' + (inside ? 12 : 10) + 'px)' }, [g.short || g.n]);
      rows.appendChild(h('div', { class: 'tl-row ' + kind }, [
        h('i', { class: 'tl-bar', style: 'left:' + l + '%;width:' + w + '%', 'data-tl': '', title: g.n + ' ' + md(g.from) + '~' + md(g.to) }),
        label
      ]));
    });
    if (inYear) rows.appendChild(h('div', { class: 'tl-today', style: 'left:' + tp + '%' }, [h('span', { text: '오늘 ' + (today.getMonth() + 1) + '/' + today.getDate() })]));
    grid.appendChild(rows);
    var ev = h('ul', { class: 'tl-events' });
    R.grantEvents.forEach(function (e) {
      var p = pos(e.d);
      ev.appendChild(h('li', { class: 'tl-ev' + (p > 60 ? ' right' : ''), style: '--p:' + p + '%' }, [h('b', { text: md(e.d) }), ' ' + e.n]));
    });
    grid.appendChild(ev);
    box.appendChild(grid);
    var notes = h('ul', { class: 'tl-notes' });
    R.grants.forEach(function (g) {
      var open = g.kind === 'open' && new Date(g.to + 'T23:59:59') >= now;
      var li = h('li', { class: open ? 'open' : '' }, [h('b', { text: g.n }), ' ']);
      li.appendChild(h('span', { class: 'when', text: md(g.from) + '~' + md(g.to) + (open ? '' : ' 마감') }));
      if (open) {
        var dd = Math.ceil((new Date(g.to + 'T23:59:59') - now) / 864e5);
        li.appendChild(h('span', { class: 'dday', text: 'D-' + dd }));
      }
      li.appendChild(h('span', { class: 'note', text: g.note }));
      notes.appendChild(li);
    });
    box.appendChild(notes);
    box.appendChild(srcLine([
      { t: '벤처스퀘어', u: 'https://www.venturesquare.net/announcement/1041449' },
      { t: '넥스트유니콘', u: 'https://www.nextunicorn.kr/insight/69246d75f5fa2699' },
      { t: '스타트업레시피', u: 'https://startuprecipe.co.kr/announcement/5812450' },
      { t: 'THE VC', u: 'https://thevc.kr/grants/f0d73f6fa0fc17c481aff2f7' }
    ]));
    $('#grantWarn').innerHTML = fix(R.grantWarn);
    R.grantMore.forEach(function (g) { $('#grantMore').appendChild(h('li', null, [h('b', { text: g.n }), g.t])); });
  })();

  /* ── 9. 6주 검증 ─────────────────────── */
  (function () {
    var box = $('#steps');
    R.steps.forEach(function (s, i) {
      box.appendChild(h('div', { class: 'step' }, [
        h('span', { class: 'step-dot', 'aria-hidden': 'true', text: String(i + 1) }),
        h('div', null, [h('p', { class: 'step-w', text: s.w }), h('h3', { text: s.t }), h('p', { class: 'sd', text: s.do })]),
        h('p', { class: 'sp' }, [h('b', { text: '✓ 넘어갈 기준' }), s.pass])
      ]));
    });
    R.proofs.forEach(function (p) { $('#proofs').appendChild(h('li', null, [h('b', { text: p.n }), p.t])); });
    var t = R.trial;
    $('#trial').appendChild(h('div', { role: 'img', 'aria-label': '무료 체험 기간별 유료 전환율: 17~32일 42.5%, 4일 미만 25.5%' }, [
      h('h3', { text: '무료 체험은 길게: 유료 전환율' }),
      hbar(t.bars[0].n, t.bars[0].v, t.bars[0].v, { dec: 1, suf: '%' }),
      hbar(t.bars[1].n, t.bars[1].v, t.bars[0].v, { dec: 1, suf: '%', gray: true }),
      srcLine(t.src)
    ]));
    $('#trial').appendChild(h('ul', null, t.notes.map(function (n) { return h('li', { text: n }); })));
  })();

  /* ── 10·11 ───────────────────────────── */
  R.unknowns.forEach(function (u) { $('#unknowns').appendChild(h('li', null, [h('span', { text: u })])); });
  R.ending.forEach(function (e, i) {
    $('#ending').appendChild(h('div', { class: 'end-card' }, [h('p', { class: 'en', text: String(i + 1).padStart(2, '0') }), h('h3', { text: e.t }), h('p', { text: e.b })]));
  });

  /* ── 위 막대: 배경·진행 막대·지금 보는 곳 ── */
  (function () {
    var bar = $('#bar'), prog = $('#progress'), toc = $('#toc'), links = $$('a', toc), ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
        bar.classList.toggle('solid', y > 30);
        prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
        ticking = false;
      });
    }
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if ('IntersectionObserver' in window) {
      var current = null;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id;
          if (current === id) return; current = id;
          if (id === 'top') { links.forEach(function (x) { x.classList.remove('on'); }); toc.scrollTo({ left: 0, behavior: 'smooth' }); return; }
          links.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + id; a.classList.toggle('on', on);
            if (on) toc.scrollTo({ left: a.offsetLeft - toc.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['top'].concat(links.map(function (a) { return a.getAttribute('href').slice(1); })).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    }
  })();
})();
