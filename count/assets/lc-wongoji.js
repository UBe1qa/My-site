/* 원고지 장수. 화면(DOM)을 모른다. lc-core.js 다음에 불러야 한다.
   두 가지 셈:
   1) simple(): 단순 환산 = 글자 수(띄어쓰기 포함, 줄바꿈 제외) ÷ 200, 올림.
   2) layout(): 200자 원고지(한 줄 20칸 × 10줄)에 실제로 놓아 본 장수.
      기본 규칙은 딱 두 가지: 한 칸에 한 글자(띄어쓰기도 한 칸), 줄을 바꾸면 다음 줄 첫 칸부터.
      아래는 켜고 끄는 선택 규칙이다(기본 꺼짐. 화면에 켠 규칙을 그대로 밝힌다. '공식 규칙'이라고 하지 않는다):
        indent    문단(줄을 바꾼 뒤 첫 줄)의 첫 칸을 비움
        skipLeadingSpace  줄 첫 칸에 오는 띄어쓰기는 칸을 쓰지 않음
        pairDigits 덩어리 숫자는 두 자를 한 칸에(한 자리 숫자는 한 칸에 한 자)
        hangPunct 줄 첫 칸에 올 온점·반점·물음표·느낌표는 앞줄 마지막 칸에 같이 씀
        dotQuote  온점 바로 뒤의 닫는 따옴표는 같은 칸에
        (pairHalf: 영문 소문자까지 두 자씩. 근거를 확인하지 못해 화면에서는 쓰지 않는다)
      위 다섯은 EBS미디어 '원고지 쓰는 법' 자료에 적힌 관행이고, CUSTOM 이 그 묶음이다.
      원고지 쓰는 법은 어문 규정에 없다(국립국어원 온라인가나다 답변).
   시험: tests/cases-wongoji.json(손으로 놓아 본 예시) + 성질 시험 */
(function (root) {
  'use strict';
  var LC = root.LC || (root.LC = {});
  var COLS = 20, ROWS = 10;
  var HALF = /^[a-z0-9]$/, DIGIT = /^[0-9]$/, DOT = /^[.]$/, CLOSEQ = /^[\u201D\u2019"']$/;
  var CUSTOM = { indent: true, skipLeadingSpace: true, pairDigits: true, hangPunct: true, dotQuote: true };
  var HANG = /^[.,!?]$/;   /* 줄 끝에서 넘칠 때 마지막 칸에 같이 쓰는 문장부호(확인된 자료에 나온 것만) */
  var BREAK = /^(?:\r\n|\r|\n)$/;

  function simple(text, opts) {
    opts = opts || {};
    var per = (opts.cols || COLS) * (opts.rowsPerSheet || ROWS);
    var chars = LC.analyze(text, { newline: 0, segment: false }).chars;
    return { chars: chars, perSheet: per, sheets: Math.ceil(chars / per), exact: chars / per };
  }

  function layout(text, opts) {
    opts = opts || {};
    var cols = opts.cols || COLS, perSheet = opts.rowsPerSheet || ROWS;
    var gs = LC.graphemes(text == null ? '' : String(text)), rows = [], row = null, i, g, cells = 0, atParaStart = true, cell;
    function newRow() { row = []; rows.push(row); }
    function put(t) {
      if (!row || row.length >= cols) newRow();
      row.push({ t: t });
      cells++;
    }
    for (i = 0; i < gs.length; i++) {
      g = gs[i];
      if (BREAK.test(g)) {
        if (!row) newRow();      /* 빈 줄도 한 줄을 쓴다 */
        row = null; atParaStart = true;
        continue;
      }
      if (atParaStart) {
        newRow();
        if (opts.indent) { row.push({ t: '' }); cells++; }
        atParaStart = false;
      }
      if (opts.dotQuote && DOT.test(g) && i + 1 < gs.length && CLOSEQ.test(gs[i + 1])) {
        if (opts.hangPunct && row && row.length >= cols) row[row.length - 1].t += g + gs[i + 1];
        else put(g + gs[i + 1]);
        i++;
        continue;
      }
      if (opts.hangPunct && row && row.length >= cols && HANG.test(g)) {
        cell = row[row.length - 1];
        cell.t += g;
        continue;
      }
      if (opts.skipLeadingSpace && g === ' ' && row && row.length >= cols) {
        /* 줄 끝에서 띄어 써야 하면 다음 줄 첫 칸을 비우지 않는다: 이 띄어쓰기는 칸을 쓰지 않는다 */
        continue;
      }
      if (opts.pairHalf && HALF.test(g) && i + 1 < gs.length && HALF.test(gs[i + 1])) {
        put(g + gs[i + 1]);
        i++;
        continue;
      }
      if (opts.pairDigits && DIGIT.test(g) && i + 1 < gs.length && DIGIT.test(gs[i + 1])) {
        put(g + gs[i + 1]);
        i++;
        continue;
      }
      put(g);
    }
    return {
      rows: rows,
      cols: cols,
      rowsPerSheet: perSheet,
      cells: cells,                                   /* 글자가 놓인(또는 띄어 쓴) 칸 수 */
      sheets: Math.ceil(rows.length / perSheet),
      lastRowCells: rows.length ? rows[rows.length - 1].length : 0
    };
  }

  LC.wongoji = { simple: simple, layout: layout, COLS: COLS, ROWS: ROWS, CUSTOM: CUSTOM };
  if (typeof module !== 'undefined' && module.exports) module.exports = LC.wongoji;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
