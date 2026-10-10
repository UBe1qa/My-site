/* 급여 계산 로직. 화면(DOM)을 모른다. 숫자는 전부 pay-data.js 와 gani-<연도>.js 에서 받는다.
   브라우저: pay-data.js → gani-2026.js → 이 파일 순서로 넣으면 window.PAY 가 생긴다. 노드: require('./pay-core.js')(DATA, GANI).
   금액 계산은 정수(원)로만 한다(소수 곱셈을 쓰지 않는다). 버림 단위는 DATA.rounding(설정값)을 따른다.
   지원 범위 밖 입력은 { ok:false, code } 로 돌려준다(조용히 틀리지 않는다). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    root.PayCore = factory;
    if (root.PAY_DATA && root.PAY_GANI) root.PAY = factory(root.PAY_DATA, root.PAY_GANI);
  }
})(typeof self !== 'undefined' ? self : this, function (DATA, GANI, OPT) {
  'use strict';
  OPT = OPT || {};
  var ROUND = Object.assign({}, DATA.rounding, OPT.rounding || {});
  var DAY = 86400000;

  /* ───────── 정수 계산 ───────── */
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  /* floor(a × num ÷ den). a, num, den 은 0 이상의 정수, a × num 은 2^53 미만 */
  function mulDiv(a, num, den) { var p = a * num; return (p - (p % den)) / den; }
  function ceilDiv(a, den) { var r = a % den; return (a - r) / den + (r ? 1 : 0); }
  /* 반올림(반은 올림) 나눗셈. a, den 은 0 이상의 정수 */
  function roundDiv(a, den) { var r = a % den; return (a - r) / den + (r * 2 >= den ? 1 : 0); }
  /* 정수 n ÷ scale 을 글자로(끝의 0은 뗀다): fmtDec(1499, 100) → '14.99', fmtDec(4500, 1000) → '4.5', fmtDec(1500, 100) → '15' */
  function fmtDec(n, scale) {
    var i = Math.floor(n / scale), f = String(n % scale + scale).slice(1).replace(/0+$/, '');
    return String(i) + (f ? '.' + f : '');
  }
  function floorTo(x, unit) { return unit > 1 ? x - (x % unit) : x; }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function err(code, extra) { var o = { ok: false, code: code }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  /* ───────── 금액 읽기·쓰기 ───────── */
  function fmt(n) {
    var neg = n < 0, s = String(Math.abs(Math.trunc(n))), out = '';
    for (var i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) out += ','; out += s[i]; }
    return (neg ? '-' : '') + out;
  }
  /* 3,130,000 → '313만 원', 120,000,000 → '1억 2,000만 원', 3,333,333 → '333만 3,333원' */
  function readKo(n) {
    n = Math.trunc(n);
    if (n < 0) return '-' + readKo(-n);
    if (n < 10000) return fmt(n) + '원';
    var eok = Math.floor(n / 100000000), man = Math.floor(n % 100000000 / 10000), rest = n % 10000, parts = [];
    if (eok) parts.push(fmt(eok) + '억');
    if (man) parts.push(fmt(man) + '만');
    if (rest) return parts.join(' ') + ' ' + fmt(rest) + '원';
    return parts.join(' ') + ' 원';
  }
  /* 영어판 읽기 도움: 3,130,000 → '3.13 million won' */
  function readEn(n) {
    n = Math.trunc(n);
    function cut(unit) { return fmtDec(Math.floor(n / (unit / 100)), 100); }   /* 소수 둘째 자리 아래는 버린다 */
    if (n >= 1000000000) return cut(1000000000) + ' billion won';
    if (n >= 1000000) return cut(1000000) + ' million won';
    return fmt(n) + ' won';
  }

  var FULL = '０１２３４５６７８９', BARE_MAN_BELOW = 100000, PARSE_MAX = 1000000000000;
  /* '4천5백' · '4,500' · '3.5' 같은 한 묶음(1만 미만 단위)을 숫자로. 못 읽으면 NaN */
  function group(s) {
    if (s === '') return NaN;
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    var re = /(\d+(?:\.\d+)?)?(천|백|십)/g, m, sum = 0, last = 0, seen = false;
    var mult = { '천': 1000, '백': 100, '십': 10 };
    while ((m = re.exec(s))) {
      if (m.index !== last) return NaN;
      sum += (m[1] === undefined ? 1 : Number(m[1])) * mult[m[2]];
      last = re.lastIndex; seen = true;
    }
    if (!seen) return NaN;
    var tail = s.slice(last);
    if (tail) { if (!/^\d+$/.test(tail)) return NaN; sum += Number(tail); }
    return sum;
  }
  /* 금액 글자를 원으로. 모든 금액 칸이 이 함수 하나로 읽는다.
     ctx: 'man' | 'won' | { unit: 'man' | 'won', manBelow: 숫자 }
       unit 'man' = 단위 없는 숫자를 만 원으로 읽는 칸(연봉·월급·비과세·3개월 임금 …). 다만 manBelow 이상인 숫자는 원으로 읽는다
                    (만 원으로 읽으면 그 칸에 있을 수 없는 큰돈이 되는 수. 기본 10만). '4천' 같은 말도 만 원(4,000만).
       unit 'won' = 단위 없는 숫자를 원으로 읽는 칸(시급·1일 통상임금, 영어판의 모든 칸). '9천' → 9,000원.
     글자에 '원'·₩·won 이 붙어 있으면 어느 칸이든 원으로 쓴 것으로 본다('300원' → 300원, '4천원' → 4,000원).
     돌려주는 값: value(원), assumed('man' = 단위 없는 수·말을 만 원으로 읽음. 화면이 "300만 원으로 읽었어요"라고 보여 준다),
       read('man' | 'won'), bare(숫자만 썼는지), big(만 원 칸인데 숫자가 커서 원으로 읽었는지: 화면이 그렇게 알린다). */
  function parseMoney(text, ctx) {
    var unit = 'man', manBelow = BARE_MAN_BELOW;
    if (ctx && typeof ctx === 'object') { unit = ctx.unit === 'won' ? 'won' : 'man'; if (ctx.manBelow) manBelow = ctx.manBelow; }
    else if (ctx === 'won') unit = 'won';
    var raw = String(text == null ? '' : text).replace(/[０-９]/g, function (c) { return String(FULL.indexOf(c)); })
      .replace(/[\s,_]/g, '').toLowerCase();
    var s = raw.replace(/원|₩|￦|krw|won/g, ''), wonMark = s !== raw;
    if (s === '') return err('empty');
    if (/^[-−–]/.test(s)) return err('negative');
    s = s.replace(/^\+/, '');
    var value, assumed = null, bare = false, big = false, m;
    if (/^\d+(\.\d+)?$/.test(s)) {
      var n = Number(s);
      bare = !wonMark;
      if (unit === 'man' && !wonMark && n < manBelow) { value = n * 10000; assumed = 'man'; }
      else { if (s.indexOf('.') >= 0) return err('format'); value = n; big = unit === 'man' && !wonMark; }
    } else if ((m = /^(\d+(?:\.\d+)?)(k|thousand|m|mil|mn|million|b|bn|billion)$/.exec(s))) {
      value = Number(m[1]) * (m[2][0] === 'k' || m[2][0] === 't' ? 1e3 : m[2][0] === 'm' ? 1e6 : 1e9);
    } else if (/^[\d.억만천백십]+$/.test(s)) {
      var eok = 0, rest = s, i = s.indexOf('억');
      if (i >= 0) { eok = group(s.slice(0, i)); rest = s.slice(i + 1); if (isNaN(eok) || rest.indexOf('억') >= 0) return err('format'); }
      var man = 0, won = 0, j = rest.indexOf('만');
      if (j >= 0) {
        man = group(rest.slice(0, j)); var tail = rest.slice(j + 1);
        if (isNaN(man) || tail.indexOf('만') >= 0) return err('format');
        if (tail) { won = group(tail); if (isNaN(won)) return err('format'); }
      } else if (rest) {
        var g = group(rest);
        if (isNaN(g)) return err('format');
        /* '1억 2천' → 1억 2,000만, 연봉 칸의 '4천' → 4,000만. 시급 칸의 '9천'·'원'을 붙인 '4천원' → 원 */
        if (!wonMark && (i >= 0 || unit === 'man')) { man = g; assumed = 'man'; } else won = g;
      }
      value = eok * 100000000 + man * 10000 + won;
    } else return err('format');
    if (!isFinite(value)) return err('format');
    /* 원 미만이 남는 글자('1.23456만', '2.5원')는 조용히 깎지 않고 못 읽었다고 알린다. 소수 곱셈의 오차(1e-6 미만)만 반올림으로 지운다 */
    if (Math.abs(value - Math.round(value)) > 1e-6) return err('format');
    value = Math.round(value);
    if (value > PARSE_MAX) return err('too-large');
    return { ok: true, value: value, assumed: assumed, read: assumed === 'man' ? 'man' : 'won', bare: bare, big: big };
  }

  /* ───────── 날짜(하루 번호: 1970-01-01 = 0, UTC) ───────── */
  function dn(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / DAY); }
  function ymd(n) { var t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function monthLen(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(n) { var p = ymd(n); return p.y + '-' + pad(p.m) + '-' + pad(p.d); }
  /* 'YYYY-MM-DD' → 하루 번호. 없는 날(2월 30일)·범위 밖(1950~2100)·꼴이 다르면 null */
  function parseDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s == null ? '' : s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1950 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > monthLen(y, mo)) return null;
    return dn(y, mo, d);
  }
  /* k개월 뒤(앞)의 같은 날. 그 달에 그 날이 없으면 mode 'clamp' 는 그 달 말일, 'roll' 은 다음 달 1일.
     roll 은 "기간이 꽉 찬 다음 날"을 구할 때 쓴다(1월 31일 입사 → 한 달이 차는 날은 2월 말일, 그 다음 날은 3월 1일). */
  function addMonths(n, k, mode) {
    var p = ymd(n), idx = p.y * 12 + (p.m - 1) + k, y = Math.floor(idx / 12), m = idx % 12 + 1, len = monthLen(y, m);
    if (p.d <= len) return dn(y, m, p.d);
    return mode === 'roll' ? dn(y, m, len) + 1 : dn(y, m, len);
  }

  /* ───────── 1. 실수령액 ───────── */
  function period(id) { return DATA.periods[id || DATA.now] || null; }

  /* 간이세액표의 한 칸: 월급여액(원, 비과세 제외)과 공제대상가족 수 → 표의 소득세 */
  function colTax(row, family) {
    if (family <= 11) return row[1 + family];
    var t10 = row[11], t11 = row[12];
    return Math.max(0, t11 - (t10 - t11) * (family - 11));
  }
  function findRow(taxable) {
    var rows = GANI.rows, U = GANI.unit, lo = 0, hi = rows.length - 2;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1, r = rows[mid];
      if (taxable < r[0] * U) hi = mid - 1; else if (taxable >= r[1] * U) lo = mid + 1; else return r;
    }
    return null;
  }
  function tableTax(taxable, family) {
    var rows = GANI.rows, U = GANI.unit, last = rows[rows.length - 1], top = last[0] * U;
    if (taxable < rows[0][0] * U) return { zone: 'below', tax: 0, row: null };
    if (taxable < top) { var r = findRow(taxable); return { zone: 'table', tax: colTax(r, family), row: { from: r[0] * U, to: r[1] * U } }; }
    var base = colTax(last, family);
    if (taxable === top) return { zone: 'top', tax: base, row: { from: top, to: top } };
    for (var i = 0; i < GANI.over.length; i++) {
      var t = GANI.over[i];
      if (taxable > t.over * U && (t.upto === null || taxable <= t.upto * U)) {
        var excess = taxable - t.over * U, piece = mulDiv(excess * t.factorPct, t.ratePct, 10000);
        return { zone: 'formula', tax: base + t.add + piece, row: null, tier: i, base: base, add: t.add, excess: excess, piece: piece, ratePct: t.ratePct, factorPct: t.factorPct };
      }
    }
    return { zone: 'formula', tax: base, row: null };
  }
  function childCredit(children) {
    var c = GANI.child;
    return children <= 0 ? 0 : children === 1 ? c.one : c.two + (children - 2) * c.eachOverTwo;
  }
  /* 매달 떼는 소득세(간이세액): 표 금액 − 자녀 공제(음수면 0) → 선택 비율(80·100·120%) → 버림 */
  function withholding(taxable, family, children, ratio, unit) {
    var t = tableTax(taxable, family), credit = childCredit(children);
    var afterCredit = Math.max(0, t.tax - credit);
    var amount = floorTo(mulDiv(afterCredit, ratio, 100), unit === undefined ? ROUND.incomeTax : unit);
    return { amount: amount, tableTax: t.tax, childCredit: credit, afterCredit: afterCredit, ratio: ratio, lookup: t };
  }

  function netPay(inp) {
    inp = inp || {};
    var P = period(inp.period), N = DATA.net;
    if (!P) return err('period');
    var basis = inp.basis === 'monthly' ? 'monthly' : 'annual', amount = inp.amount;
    if (typeof amount !== 'number' || isNaN(amount)) return err('nan');
    if (amount < 0) return err('negative');
    if (!isInt(amount)) return err('not-integer');
    var family = inp.family === undefined ? 1 : inp.family, children = inp.children === undefined ? 0 : inp.children;
    var ratio = inp.ratio === undefined ? 100 : inp.ratio, nontaxIn = inp.nontax === undefined ? N.nontaxMeal : inp.nontax;
    if (!isInt(family) || family < 1 || family > N.maxFamily) return err('family');
    if (!isInt(children) || children < 0) return err('children');
    if (children > family - 1) return err('children-over-family', { max: family - 1 });
    if (N.ratios.indexOf(ratio) < 0) return err('ratio');
    if (!isInt(nontaxIn) || nontaxIn < 0) return err('nontax');
    var divisor = basis === 'annual' ? (inp.includeSeverance ? 13 : 12) : 1;
    var gross = basis === 'annual' ? mulDiv(amount, 1, divisor) : amount;
    if (gross > N.maxMonthly) return err('too-large', { max: N.maxMonthly });
    var u = function (k) { return inp.roundUnit || ROUND[k]; };
    var notes = [];
    var nontax = Math.min(nontaxIn, gross);
    if (nontaxIn > gross && gross > 0) notes.push('nontax-clamped');
    var taxable = gross - nontax;
    var lines = [], pen = P.pension, hi = P.health, care = P.care, emp = P.employment;

    if (taxable <= 0) {
      notes.push('no-taxable');
      ['pension', 'health', 'care', 'employment', 'incomeTax', 'localTax'].forEach(function (id) { lines.push({ id: id, amount: 0, base: 0, status: P[id].status }); });
    } else {
      var pBase0 = floorTo(taxable, pen.baseUnit), pBase = clamp(pBase0, pen.baseMin, pen.baseMax);
      /* 만 60세 이상은 국민연금 가입 대상이 아니다(국민연금법 제6조·제8조). 임의계속가입으로 계속 내는 사람은 noPension 을 끈다 */
      var penAmt = inp.noPension ? 0 : floorTo(mulDiv(pBase, pen.rateNum, pen.rateDen), u('pension'));
      lines.push({ id: 'pension', amount: penAmt, base: pBase, ratePct: pen.ratePct, exempt: !!inp.noPension,
        capped: pBase0 < pen.baseMin ? 'min' : pBase0 > pen.baseMax ? 'max' : null, status: pen.status });

      var hRaw = floorTo(mulDiv(taxable, hi.rateNum, hi.rateDen), u('health')), hAmt = clamp(hRaw, hi.employeeMin, hi.employeeMax);
      lines.push({ id: 'health', amount: hAmt, base: taxable, ratePct: hi.ratePct,
        capped: hRaw < hi.employeeMin ? 'min' : hRaw > hi.employeeMax ? 'max' : null, status: hi.status, limitStatus: hi.limitStatus });

      lines.push({ id: 'care', amount: floorTo(mulDiv(hAmt, care.num, care.den), u('care')), base: hAmt, ratePct: care.ratePct, healthPct: care.healthPct, status: care.status });
      /* 65세 이후에 새로 고용된 사람은 고용보험료(실업급여분)를 떼지 않는다 */
      var empAmt = inp.noEmployment ? 0 : floorTo(mulDiv(taxable, emp.rateNum, emp.rateDen), u('employment'));
      lines.push({ id: 'employment', amount: empAmt, base: taxable, ratePct: emp.ratePct, exempt: !!inp.noEmployment, status: emp.status });

      var w = withholding(taxable, family, children, ratio, u('incomeTax'));
      lines.push({ id: 'incomeTax', amount: w.amount, base: taxable, tableTax: w.tableTax, childCredit: w.childCredit, afterCredit: w.afterCredit,
        ratio: ratio, lookup: w.lookup, family: family, children: children, status: P.incomeTax.status });
      lines.push({ id: 'localTax', amount: floorTo(mulDiv(w.amount, P.localTax.rateNum, P.localTax.rateDen), u('localTax')), base: w.amount, ratePct: P.localTax.ratePct, status: P.localTax.status });
    }
    var by = {}; lines.forEach(function (l) { by[l.id] = l; });
    var insurance = by.pension.amount + by.health.amount + by.care.amount + by.employment.amount;
    var tax = by.incomeTax.amount + by.localTax.amount, deductions = insurance + tax, net = gross - deductions;
    return {
      ok: true, period: inp.period || DATA.now, basis: basis, divisor: divisor,
      annual: basis === 'annual' ? amount : gross * 12, gross: gross, nontax: nontax, taxable: taxable,
      lines: lines, line: by, insurance: insurance, tax: tax, deductions: deductions, net: net, netAnnual: net * 12,
      family: family, children: children, ratio: ratio, notes: notes,
      carried: lines.filter(function (l) { return l.status === 'carried' || l.limitStatus === 'carried'; }).map(function (l) { return l.id; }),
      noPension: !!inp.noPension, noEmployment: !!inp.noEmployment,
      rounding: { pension: u('pension'), health: u('health'), care: u('care'), employment: u('employment'), incomeTax: u('incomeTax'), localTax: u('localTax'), verified: ROUND.verified || false }
    };
  }

  /* 같은 입력을 '지금'과 '다음에 바뀌는 때' 두 기준으로 계산해 줄마다 차이를 돌려준다 */
  function compare(inp) {
    var a = netPay(Object.assign({}, inp, { period: DATA.now })), b = netPay(Object.assign({}, inp, { period: DATA.next }));
    if (!a.ok) return a;
    if (!b.ok) return b;
    return { ok: true, now: a, next: b, netDiff: b.net - a.net,
      lines: a.lines.map(function (l, i) { return { id: l.id, now: l.amount, next: b.lines[i].amount, diff: b.lines[i].amount - l.amount, status: b.lines[i].status, limitStatus: b.lines[i].limitStatus }; }) };
  }

  /* 기준 기간이 지났는지: 그 기준 시기의 값 가운데 유효 기간(until)이 today(YYYY-MM-DD)보다 앞선 것을 돌려준다.
     화면은 stale 이면 결과 위에 '이 값은 ○○년 기준이에요'를 띄운다(자료를 제때 못 고쳤을 때 조용히 틀리지 않게). */
  function validity(periodId, today) {
    var P = period(periodId), t = parseDate(today);
    if (!P) return err('period');
    if (t === null) return err('date');
    var items = [];
    function chk(id, until) { if (until && t > parseDate(until)) items.push({ id: id, until: until }); }
    chk('pensionRate', P.pension.until); chk('pensionLimit', P.pension.limitUntil); chk('minWage', P.minWage.until);
    return { ok: true, stale: items.length > 0, items: items, year: P.year };
  }
  /* 구직급여 표(상·하한)의 유효 기간이 지났는지. nextYear: 다음 해(하한만 확정, 상한 미정)의 값으로 계산하는 기간 안인지 */
  function unemploymentValidity(today) {
    var t = parseDate(today), U = DATA.unemployment, NX = U.next;
    if (t === null) return err('date');
    return { ok: true, stale: t > parseDate(U.until), until: U.until,
      nextYear: !!(NX && NX.from && t >= parseDate(NX.from) && t <= parseDate(NX.until)) };
  }
  /* 화면이 기본으로 쓸 기준 시기: 기기 날짜가 다음 기준의 시행일(starts)부터면 다음 기준(확정된 값은 새 값, 미정은 줄마다 표시).
     해가 바뀌었는데 자료를 아직 못 넘겼을 때 옛 요율로 계산해 보여 주지 않으려는 것이다. */
  function defaultPeriod(today) {
    var t = parseDate(today), nx = DATA.periods[DATA.next];
    if (t === null || !nx || !nx.starts) return DATA.now;
    return t >= parseDate(nx.starts) ? DATA.next : DATA.now;
  }

  /* 연봉 실수령액 표: 연봉 목록 → 줄마다 netPay 결과(가정은 opts 그대로) */
  function salaryTable(annuals, opts) {
    return annuals.map(function (a) { return netPay(Object.assign({}, opts || {}, { amount: a, basis: 'annual' })); });
  }

  /* ───────── 3. 퇴직금 ───────── */
  /* 퇴직일(마지막 근무일 다음 날) 이전 3개월: [시작일, 퇴직일 전날]. 고용노동부 '퇴직금 계산' 화면과 같은 방식으로 센다.
     시작일 = 3개월 전 같은 날. 그 달에 그 날이 없으면 그 달 말일(7월 31일 퇴직 → 4월 30일, 12월 31일 → 9월 30일).
     다만 3개월 전이 2월이라 그 날이 없으면(5월 29일(평년)·30일·31일 퇴직) 3월 1일부터 센다. */
  function lastThreeMonths(leave) {
    var p = ymd(leave), idx = p.y * 12 + (p.m - 1) - 3, y = Math.floor(idx / 12), m = idx % 12 + 1, len = monthLen(y, m), start, rule;
    if (p.d <= len) { start = dn(y, m, p.d); rule = 'same'; }
    else if (m === 2) { start = dn(y, 3, 1); rule = 'feb'; }
    else { start = dn(y, m, len); rule = 'last'; }
    return { start: start, end: leave - 1, days: leave - start, rule: rule };
  }
  function severance(inp) {
    inp = inp || {};
    var S = DATA.severance, join = parseDate(inp.join), leave = parseDate(inp.leave);
    if (join === null || leave === null) return err('date');
    if (leave <= join) return err('date-order');
    var wages = inp.wages3m, bonus = inp.annualBonus || 0, leavePay = inp.leavePay || 0;
    if (typeof wages !== 'number' || isNaN(wages)) return err('nan');
    if (wages < 0 || bonus < 0 || leavePay < 0) return err('negative');
    if (!isInt(wages) || !isInt(bonus) || !isInt(leavePay)) return err('not-integer');
    if (wages > S.maxWages || bonus > S.maxWages || leavePay > S.maxWages) return err('too-large');
    var ordinary = inp.dailyOrdinary;
    if (ordinary !== undefined && ordinary !== null && (!isInt(ordinary) || ordinary < 0)) return err('ordinary');
    if (ordinary > S.maxDailyOrdinary) return err('too-large');
    var per = lastThreeMonths(leave), days = per.days;
    if (inp.periodDays !== undefined && inp.periodDays !== null) {
      if (!isInt(inp.periodDays) || inp.periodDays < 1 || inp.periodDays > 92) return err('period-days');
      days = inp.periodDays;
    }
    var serviceDays = leave - join, oneYear = addMonths(join, 12, 'roll');
    var reason = leave < oneYear ? 'under-1y' : (typeof inp.weeklyHours === 'number' && inp.weeklyHours < S.minWeekHours) ? 'under-15h' : null;
    /* 1일 평균임금 = (3개월 임금 + 상여금 × 3/12 + 연차수당 × 3/12) ÷ 3개월 날짜 수. 전(0.01원) 단위에서 올림: 고용노동부 예제(88,641원 31전)와 같은 꼴 */
    var num = (wages * 12 + (bonus + leavePay) * 3) * 100, avgJeon = ceilDiv(num, 12 * days);
    var ordJeon = ordinary ? ordinary * 100 : 0, usedJeon = Math.max(avgJeon, ordJeon);
    /* 퇴직금 = 1일 평균임금 × 30 × 재직일수 ÷ 365, 원 미만 반올림(고용노동부 계산기와 같은 끝수).
       큰 수끼리 곱해 정밀도를 잃지 않게 (평균임금 × 30)을 36,500으로 먼저 나눈 몫·나머지로 계산한다. */
    var a = usedJeon * S.payDays, d = S.daysPerYear * 100, q = (a - a % d) / d;
    var amount = q * serviceDays + roundDiv((a % d) * serviceDays, d);
    return {
      ok: true, eligible: !reason, reason: reason, serviceDays: serviceDays, oneYearDate: iso(oneYear),
      period: { start: iso(per.start), end: iso(per.end), days: days, calendarDays: per.days, rule: per.rule },
      wages3m: wages, bonusPart: mulDiv(bonus, 3, 12), leavePart: mulDiv(leavePay, 3, 12), total: mulDiv(num, 1, 1200),
      avgDailyJeon: avgJeon, ordinaryJeon: ordJeon, usedJeon: usedJeon, basis: ordJeon > avgJeon ? 'ordinary' : 'average',
      amount: reason ? null : amount, amountIfEligible: amount
    };
  }
  /* 전 단위 금액을 '88,641원 31전' 꼴로 나눠 준다 */
  function splitJeon(j) { return { won: Math.floor(j / 100), jeon: j % 100 }; }

  /* ───────── 4. 시급·주휴수당 ───────── */
  /* 시간은 0.01시간 단위의 정수(h100)로 바꿔 계산한다. 소수 셋째 자리가 있는 값(14.999)은 받지 않는다(반올림돼 15시간이 되지 않게) */
  function h100(h) { return Math.round(h * 100); }
  function hoursPrecise(h) { return Math.abs(h * 100 - Math.round(h * 100)) < 1e-6; }
  function checkHours(h) { return typeof h === 'number' && isFinite(h) && h > 0 && h <= 168; }
  /* 주휴수당 = min(주 소정근로시간, 40) ÷ 40 × 8 × 시급. 주 15시간 미만은 0 */
  function weeklyHoliday(inp) {
    inp = inp || {};
    var H = DATA.hourly, wage = inp.hourly, h = inp.weeklyHours;
    if (typeof wage !== 'number' || isNaN(wage) || !checkHours(h)) return err('nan');
    if (!hoursPrecise(h)) return err('hours');
    if (wage < 0) return err('negative');
    if (!isInt(wage)) return err('not-integer');
    if (wage > H.maxHourly) return err('too-large');
    var hh = h100(h), eligible = hh >= H.minWeekHours * 100, counted = Math.min(hh, H.fullWeekHours * 100);
    /* 유급 주휴 시간 = counted ÷ 40 × 8 = counted ÷ 5. 0.001시간 단위의 정수로는 counted × 2 */
    var paid1000 = eligible ? counted * 2 : 0;
    return { ok: true, eligible: eligible, weeklyHours: h, hours100: hh, countedHours: counted / 100, counted100: counted, paidHours: paid1000 / 1000, paid1000: paid1000,
      pay: eligible ? mulDiv(wage * counted, 1, 500) : 0, over40: hh > H.fullWeekHours * 100 };
  }
  /* 월 환산 시간: (주 소정 + 주휴) × 365 ÷ 7 ÷ 12 = num ÷ den(정수). 주 40시간은 고시 값 209시간. tenths: 화면에 보여 줄 0.1시간 단위 반올림 값 */
  function monthlyHours(weeklyHours) {
    var H = DATA.hourly, hh = Math.min(h100(weeklyHours), H.fullWeekHours * 100);
    if (hh >= H.fullWeekHours * 100) return { hours: H.monthlyHours40, official: true, num: H.monthlyHours40, den: 1, tenths: H.monthlyHours40 * 10 };
    /* (hh + hh ÷ 5) × 365 ÷ (100 × 7 × 12): 분자·분모에 5를 곱해 정수로 */
    var num = (hh >= H.minWeekHours * 100 ? hh * 6 : hh * 5) * 365, den = 100 * 5 * 7 * 12;
    return { hours: num / den, official: false, num: num, den: den, tenths: roundDiv(num * 10, den) };
  }
  function minWageOf(periodId) { var P = period(periodId); return P ? P.minWage : null; }
  /* 시급 → 주급·월급(주휴 포함), 최저임금 비교.
     월급 = 시급 × 월 환산 시간, 원 미만 올림: 최저임금 월 환산액과 같은 끝수라 이 월급을 다시 시급으로 바꾸면 처음 시급이 나온다 */
  function hourlyToPay(inp) {
    inp = inp || {};
    var w = weeklyHoliday(inp);
    if (!w.ok) return w;
    var mw = minWageOf(inp.period);
    if (!mw) return err('period');
    var mh = monthlyHours(inp.weeklyHours);
    var weeklyBase = mulDiv(inp.hourly * w.counted100, 1, 100);
    return { ok: true, hourly: inp.hourly, weekly: w, weeklyBase: weeklyBase, weeklyTotal: weeklyBase + w.pay,
      monthlyHours: mh, monthly: ceilDiv(inp.hourly * mh.num, mh.den),
      minWage: { hourly: mw.hourly, ok: inp.hourly >= mw.hourly, diff: inp.hourly - mw.hourly, status: mw.status }, period: inp.period || DATA.now };
  }
  /* 월급 → 시급(주 소정근로시간 기준. 기본 40시간 = 209시간, 원 미만 버림). 최저임금과는 시급끼리 견준다.
     minWage.monthly = 이 근로시간의 최저임금 월 환산액(원 미만 올림). 시급이 최저임금 이상인 것과 월급이 이 금액 이상인 것은 같은 말이다 */
  function monthlyToHourly(inp) {
    inp = inp || {};
    var monthly = inp.monthly, h = inp.weeklyHours === undefined ? DATA.hourly.fullWeekHours : inp.weeklyHours;
    if (typeof monthly !== 'number' || isNaN(monthly) || !checkHours(h)) return err('nan');
    if (!hoursPrecise(h)) return err('hours');
    if (monthly < 0) return err('negative');
    if (!isInt(monthly)) return err('not-integer');
    if (monthly > DATA.net.maxMonthly) return err('too-large');
    var mw = minWageOf(inp.period);
    if (!mw) return err('period');
    var mh = monthlyHours(h), hourly = mulDiv(monthly * mh.den, 1, mh.num), need = ceilDiv(mw.hourly * mh.num, mh.den);
    return { ok: true, monthly: monthly, monthlyHours: mh, hourly: hourly,
      minWage: { hourly: mw.hourly, monthly: need, ok: hourly >= mw.hourly, diff: hourly - mw.hourly, diffMonthly: monthly - need, status: mw.status }, period: inp.period || DATA.now };
  }

  /* ───────── 5. 실업급여(구직급여) ───────── */
  function tenureBand(years) { var b = DATA.unemployment.tenureBands, i = 0; while (i < b.length && years >= b[i]) i++; return i; }
  /* 이직일(마지막으로 일한 날) 이전 3개월의 날짜 수: 그 다음 날을 퇴직일로 보고 퇴직금과 같은 방식으로 센다 */
  function ubPeriod(leave) { return lastThreeMonths(leave + 1); }
  /* 금액은 정수로만 계산한다.
     wages3m(3개월 임금, 원)을 넣으면 1일 평균임금 = wages3m ÷ 날짜 수 를 버리지 않은 채 60%를 곱하고 원 미만을 한 번만 버린다:
       floor(wages3m × 60 ÷ (날짜 수 × 100)).  평균임금을 먼저 버리고 60%를 곱하면 1원이 모자랄 수 있다(6,000,000 ÷ 90 × 60% = 40,000).
     avgDaily(1일 평균임금, 원. 전 단위까지)를 직접 넣을 수도 있다.
     이직일이 다음 해(U.next)면 하한은 그 해 최저임금으로 계산하고(확정), 상한은 아직 없어 올해 값을 쓴 채 atLeast(최소 금액)로 알린다. */
  function unemployment(inp) {
    inp = inp || {};
    var U = DATA.unemployment, NX = U.next, h = inp.dayHours === undefined ? U.maxDayHours : inp.dayHours;
    var byWages = inp.wages3m !== undefined && inp.wages3m !== null, avg = inp.avgDaily, wages = inp.wages3m;
    if (byWages ? (typeof wages !== 'number' || isNaN(wages)) : (typeof avg !== 'number' || isNaN(avg))) return err('nan');
    if (typeof h !== 'number' || isNaN(h)) return err('nan');
    if ((byWages ? wages : avg) < 0) return err('negative');
    if (byWages ? wages > U.maxWages3m : avg > 100000000) return err('too-large');
    if (byWages && !isInt(wages)) return err('not-integer');
    if (h <= 0 || h > 24) return err('hours');
    var leave = parseDate(inp.leave);
    if (leave === null) return err('date');
    if (leave < parseDate(U.from)) return err('before-range', { from: U.from });
    var next = leave > parseDate(U.until);
    if (next && !(NX && NX.from && leave >= parseDate(NX.from) && leave <= parseDate(NX.until))) return err('after-range', { until: NX && NX.until ? NX.until : U.until });
    var years = inp.tenureYears;
    if (typeof years !== 'number' || isNaN(years) || years < 0 || years > 80) return err('tenure');
    var over50 = !!(inp.over50 || inp.disabled), band = tenureBand(years);
    var hh = Math.min(h100(h), U.maxDayHours * 100);
    /* 1일 평균임금 = n ÷ d (원) */
    var n, d, per = null;
    if (byWages) {
      per = ubPeriod(leave); d = per.days;
      if (inp.periodDays !== undefined && inp.periodDays !== null) {
        if (!isInt(inp.periodDays) || inp.periodDays < 1 || inp.periodDays > 92) return err('period-days');
        d = inp.periodDays;
      }
      n = wages;
    } else { n = Math.round(avg * 100); d = 100; }
    /* 기초일액은 상한(113,500원)까지. 구직급여 = 기초일액 × 60%. 하한 = 1일 소정근로시간 × 이직일의 시간급 최저임금 × 80% */
    var capped = n > U.baseMax * d;
    var byRate = capped ? mulDiv(U.baseMax, U.rateNum, U.rateDen) : mulDiv(n * U.rateNum, 1, d * U.rateDen);
    var minWage = next ? NX.minWageHourly : U.minWageHourly;
    var lower = mulDiv(hh * minWage, U.lowerNum, U.lowerDen * 100);
    var daily = Math.max(byRate, lower), days = (over50 ? U.days.over50 : U.days.under50)[band];
    /* 다음 해 이직(상한 미정): 새 상한이 금액을 바꿀 수 있는 사람은 '평균임금이 지금 상한(기초일액)을 넘고, 상한이 없다고 칠 때의 60%가 하한보다 큰' 사람뿐이다.
       그 사람만 '최소 금액'으로 보여 준다. 그 밖의 사람(60%가 하한보다 적거나, 지금 상한 아래)은 상한이 어떻게 정해져도 같은 금액이다 */
    var atLeast = next && capped && mulDiv(n * U.rateNum, 1, d * U.rateDen) > lower;
    return { ok: true, daily: daily, byRate: byRate, lower: lower, upper: U.upper,
      kind: lower >= byRate ? 'lower' : capped ? 'upper' : 'rate',
      days: days, total: daily * days, monthly30: daily * 30, band: band, over50: over50, dayHours: hh / 100, hours100: hh,
      wages3m: byWages ? wages : null, periodDays: byWages ? d : null, period: per ? { start: iso(per.start), end: iso(per.end), days: per.days, rule: per.rule } : null,
      avgFloor: mulDiv(n, 1, d), capped: capped, minWageHourly: minWage, year: next ? NX.year : period(DATA.now).year,
      upperStatus: next ? NX.upperStatus : 'fixed', atLeast: atLeast, lowerOverUpper: lower > U.upper,
      provisional: next ? 'next-year-undecided' : null, waitDays: U.waitDays };
  }

  /* ───────── 6. 연차 ───────── */
  /* 계속 근로 n년을 채웠을 때 생기는 연차 일수(1년간 80% 이상 출근했다고 볼 때): 15일, 3년부터 2년마다 +1일, 한도 25일 */
  function leaveDaysAfterYears(n) {
    var L = DATA.leave;
    return n < 1 ? 0 : Math.min(L.cap, L.base + Math.floor((n - 1) / L.addEveryYears));
  }
  /* 입사일 기준 연차 표. years 만큼(기본 10년) 해마다 생기는 날과 일수, 첫해의 다달이 1일(최대 11일) */
  function annualLeave(inp) {
    inp = inp || {};
    var L = DATA.leave, join = parseDate(inp.join);
    if (join === null) return err('date');
    var years = inp.years === undefined ? 10 : inp.years;
    if (!isInt(years) || years < 1 || years > 50) return err('years');
    var asOf = inp.asOf === undefined || inp.asOf === null ? null : parseDate(inp.asOf);
    if (inp.asOf !== undefined && inp.asOf !== null && asOf === null) return err('date');
    if (asOf !== null && asOf < join) return err('date-order');
    var monthly = [], rows = [], k, n;
    var firstEnd = addMonths(join, 12, 'roll');
    for (k = 1; k <= L.firstYearMax; k++) monthly.push({ date: iso(addMonths(join, k, 'roll')), days: 1, useBy: iso(firstEnd - 1) });
    for (n = 1; n <= years; n++) {
      var at = addMonths(join, 12 * n, 'roll');
      rows.push({ yearsDone: n, date: iso(at), days: leaveDaysAfterYears(n), useBy: iso(addMonths(join, 12 * (n + 1), 'roll') - 1) });
    }
    var out = { ok: true, join: iso(join), monthly: monthly, rows: rows };
    if (asOf !== null) {
      var done = 0;
      while (done < 80 && addMonths(join, 12 * (done + 1), 'roll') <= asOf) done++;
      var months = 0;
      if (done === 0) while (months < L.firstYearMax && addMonths(join, months + 1, 'roll') <= asOf) months++;
      var nextDate = done === 0 && months < L.firstYearMax ? addMonths(join, months + 1, 'roll') : addMonths(join, 12 * (done + 1), 'roll');
      out.asOf = { date: iso(asOf), yearsDone: done, monthsDone: done === 0 ? months : null,
        current: done === 0 ? months : leaveDaysAfterYears(done),
        next: { date: iso(nextDate), days: done === 0 && months < L.firstYearMax ? 1 : leaveDaysAfterYears(done + 1) } };
    }
    return out;
  }

  return {
    data: DATA, gani: GANI,
    fmt: fmt, fmtDec: fmtDec, readKo: readKo, readEn: readEn, parseMoney: parseMoney,
    parseDate: parseDate, iso: iso, addMonths: addMonths,
    netPay: netPay, compare: compare, salaryTable: salaryTable, validity: validity, unemploymentValidity: unemploymentValidity, defaultPeriod: defaultPeriod, withholding: withholding, tableTax: tableTax, childCredit: childCredit,
    severance: severance, lastThreeMonths: function (s) { var d = parseDate(s); if (d === null) return err('date'); var p = lastThreeMonths(d); return { ok: true, start: iso(p.start), end: iso(p.end), days: p.days }; }, splitJeon: splitJeon,
    weeklyHoliday: weeklyHoliday, monthlyHours: monthlyHours, hourlyToPay: hourlyToPay, monthlyToHourly: monthlyToHourly,
    unemployment: unemployment, unemploymentPeriod: function (s) { var d = parseDate(s); if (d === null) return err('date'); var p = ubPeriod(d); return { ok: true, start: iso(p.start), end: iso(p.end), days: p.days, rule: p.rule }; }, tenureBand: tenureBand,
    annualLeave: annualLeave, leaveDaysAfterYears: leaveDaysAfterYears
  };
});
