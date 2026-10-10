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
    function cut(x) { return String(Math.floor(x * 100 + 1e-7) / 100); }
    if (n >= 1000000000) return cut(n / 1000000000) + ' billion won';
    if (n >= 1000000) return cut(n / 1000000) + ' million won';
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
  /* 금액 글자를 원으로. ctx 'man': 단위 없는 작은 숫자(10만 미만)와 '4천' 같은 말을 만 원으로 읽는다(연봉·월급 칸).
     ctx 'won': 단위 없는 숫자는 원(시급 칸). 돌려주는 assumed 가 'man' 이면 화면이 "300만 원으로 읽었어요"라고 보여 준다. */
  function parseMoney(text, ctx) {
    ctx = ctx || 'man';
    var s = String(text == null ? '' : text).replace(/[０-９]/g, function (c) { return String(FULL.indexOf(c)); })
      .replace(/[\s,_]/g, '').replace(/원|₩|krw|won/gi, '').toLowerCase();
    if (s === '') return err('empty');
    if (/^[-−–]/.test(s)) return err('negative');
    s = s.replace(/^\+/, '');
    var value, assumed = null, m;
    if (/^\d+(\.\d+)?$/.test(s)) {
      var n = Number(s);
      if (ctx === 'man' && n < BARE_MAN_BELOW) { value = n * 10000; assumed = 'man'; }
      else { if (s.indexOf('.') >= 0) return err('format'); value = n; }
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
        /* '1억 2천' → 1억 2,000만, 연봉 칸의 '4천' → 4,000만. 시급 칸의 '9천' → 9,000원 */
        if (i >= 0 || ctx === 'man') { man = g; assumed = 'man'; } else won = g;
      }
      value = eok * 100000000 + man * 10000 + won;
    } else return err('format');
    value = Math.round(value);
    if (!isFinite(value)) return err('format');
    if (value > PARSE_MAX) return err('too-large');
    return { ok: true, value: value, assumed: assumed };
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
      lines.push({ id: 'pension', amount: floorTo(mulDiv(pBase, pen.rateNum, pen.rateDen), u('pension')), base: pBase, ratePct: pen.ratePct,
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
      noEmployment: !!inp.noEmployment,
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
  /* 구직급여 표(상·하한)의 유효 기간이 지났는지 */
  function unemploymentValidity(today) {
    var t = parseDate(today), U = DATA.unemployment;
    if (t === null) return err('date');
    return { ok: true, stale: t > parseDate(U.until), until: U.until };
  }

  /* 연봉 실수령액 표: 연봉 목록 → 줄마다 netPay 결과(가정은 opts 그대로) */
  function salaryTable(annuals, opts) {
    return annuals.map(function (a) { return netPay(Object.assign({}, opts || {}, { amount: a, basis: 'annual' })); });
  }

  /* ───────── 3. 퇴직금 ───────── */
  /* 퇴직일(마지막 근무일 다음 날) 이전 3개월: [3개월 전 같은 날, 퇴직일 전날]. 그 달에 같은 날이 없으면 말일부터. */
  function lastThreeMonths(leave) {
    var start = addMonths(leave, -3, 'clamp');
    return { start: start, end: leave - 1, days: leave - start };
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
    if (wages > 100000000000 || bonus > 100000000000 || leavePay > 100000000000) return err('too-large');
    var ordinary = inp.dailyOrdinary;
    if (ordinary !== undefined && ordinary !== null && (!isInt(ordinary) || ordinary < 0)) return err('ordinary');
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
    var amount = mulDiv(usedJeon * S.payDays, serviceDays, S.daysPerYear * 100);
    return {
      ok: true, eligible: !reason, reason: reason, serviceDays: serviceDays, oneYearDate: iso(oneYear),
      period: { start: iso(per.start), end: iso(per.end), days: days, calendarDays: per.days },
      wages3m: wages, bonusPart: mulDiv(bonus, 3, 12), leavePart: mulDiv(leavePay, 3, 12), total: mulDiv(num, 1, 1200),
      avgDailyJeon: avgJeon, ordinaryJeon: ordJeon, usedJeon: usedJeon, basis: ordJeon > avgJeon ? 'ordinary' : 'average',
      amount: reason ? null : amount, amountIfEligible: amount
    };
  }
  /* 전 단위 금액을 '88,641원 31전' 꼴로 나눠 준다 */
  function splitJeon(j) { return { won: Math.floor(j / 100), jeon: j % 100 }; }

  /* ───────── 4. 시급·주휴수당 ───────── */
  function h100(h) { return Math.round(h * 100); }
  function checkHours(h) { return typeof h === 'number' && isFinite(h) && h > 0 && h <= 168; }
  /* 주휴수당 = min(주 소정근로시간, 40) ÷ 40 × 8 × 시급. 주 15시간 미만은 0 */
  function weeklyHoliday(inp) {
    inp = inp || {};
    var H = DATA.hourly, wage = inp.hourly, h = inp.weeklyHours;
    if (typeof wage !== 'number' || isNaN(wage) || !checkHours(h)) return err('nan');
    if (wage < 0) return err('negative');
    if (!isInt(wage)) return err('not-integer');
    if (wage > 10000000) return err('too-large');
    var hh = h100(h), eligible = hh >= H.minWeekHours * 100, counted = Math.min(hh, H.fullWeekHours * 100);
    /* 유급 주휴 시간 × 100 = counted ÷ 40 × 8 = counted ÷ 5 */
    var paid100 = eligible ? counted / 5 : 0;
    return { ok: true, eligible: eligible, weeklyHours: h, countedHours: counted / 100, paidHours: paid100 / 100,
      pay: eligible ? mulDiv(wage * counted, 1, 500) : 0, over40: hh > H.fullWeekHours * 100 };
  }
  /* 월 환산 시간: (주 소정 + 주휴) × 365 ÷ 7 ÷ 12. 주 40시간은 고시 값 209시간 */
  function monthlyHours(weeklyHours) {
    var H = DATA.hourly, hh = Math.min(h100(weeklyHours), H.fullWeekHours * 100);
    if (hh >= H.fullWeekHours * 100) return { hours: H.monthlyHours40, official: true, num: H.monthlyHours40, den: 1 };
    var paid = hh >= H.minWeekHours * 100 ? hh / 5 : 0, num = Math.round((hh + paid) * 5) * 365, den = 100 * 5 * 7 * 12;
    return { hours: num / den, official: false, num: num, den: den };
  }
  function minWageOf(periodId) { var P = period(periodId); return P ? P.minWage : null; }
  /* 시급 → 주급·월급(주휴 포함), 최저임금 비교 */
  function hourlyToPay(inp) {
    inp = inp || {};
    var w = weeklyHoliday(inp);
    if (!w.ok) return w;
    var mw = minWageOf(inp.period);
    if (!mw) return err('period');
    var counted100 = h100(w.countedHours), mh = monthlyHours(inp.weeklyHours);
    var weeklyBase = mulDiv(inp.hourly * counted100, 1, 100);
    return { ok: true, hourly: inp.hourly, weekly: w, weeklyBase: weeklyBase, weeklyTotal: weeklyBase + w.pay,
      monthlyHours: mh, monthly: mulDiv(inp.hourly * mh.num, 1, mh.den),
      minWage: { hourly: mw.hourly, ok: inp.hourly >= mw.hourly, diff: inp.hourly - mw.hourly, status: mw.status }, period: inp.period || DATA.now };
  }
  /* 월급 → 시급(주 소정근로시간 기준. 기본 40시간 = 209시간), 최저임금 비교 */
  function monthlyToHourly(inp) {
    inp = inp || {};
    var monthly = inp.monthly, h = inp.weeklyHours === undefined ? DATA.hourly.fullWeekHours : inp.weeklyHours;
    if (typeof monthly !== 'number' || isNaN(monthly) || !checkHours(h)) return err('nan');
    if (monthly < 0) return err('negative');
    if (!isInt(monthly)) return err('not-integer');
    if (monthly > DATA.net.maxMonthly) return err('too-large');
    var mw = minWageOf(inp.period);
    if (!mw) return err('period');
    var mh = monthlyHours(h), hourly = mulDiv(monthly * mh.den, 1, mh.num), need = ceilDiv(mw.hourly * mh.num, mh.den);
    return { ok: true, monthly: monthly, monthlyHours: mh, hourly: hourly,
      minWage: { hourly: mw.hourly, monthly: need, ok: monthly >= need, diff: monthly - need, status: mw.status }, period: inp.period || DATA.now };
  }

  /* ───────── 5. 실업급여(구직급여) ───────── */
  function tenureBand(years) { var b = DATA.unemployment.tenureBands, i = 0; while (i < b.length && years >= b[i]) i++; return i; }
  function unemployment(inp) {
    inp = inp || {};
    var U = DATA.unemployment, avg = inp.avgDaily, h = inp.dayHours === undefined ? U.maxDayHours : inp.dayHours;
    if (typeof avg !== 'number' || isNaN(avg) || typeof h !== 'number' || isNaN(h)) return err('nan');
    if (avg < 0) return err('negative');
    if (avg > 100000000) return err('too-large');
    if (h <= 0 || h > 24) return err('hours');
    var leave = parseDate(inp.leave);
    if (leave === null) return err('date');
    if (leave < parseDate(U.from)) return err('before-range', { from: U.from });
    var years = inp.tenureYears;
    if (typeof years !== 'number' || isNaN(years) || years < 0 || years > 80) return err('tenure');
    var over50 = !!(inp.over50 || inp.disabled), band = tenureBand(years);
    var hh = Math.min(h100(h), U.maxDayHours * 100);
    /* 기초일액은 상한(113,500원)까지. 구직급여 = 기초일액 × 60%. 하한 = 1일 소정근로시간 × 시간급 최저임금 × 80% */
    var avgJeon = Math.round(avg * 100), baseJeon = Math.min(avgJeon, U.baseMax * 100);
    var byRate = mulDiv(baseJeon, U.rateNum, U.rateDen * 100);
    var lower = mulDiv(hh * U.minWageHourly, U.lowerNum, U.lowerDen * 100);
    var daily = Math.max(byRate, lower), days = (over50 ? U.days.over50 : U.days.under50)[band];
    return { ok: true, daily: daily, byRate: byRate, lower: lower, upper: U.upper,
      kind: lower >= byRate ? 'lower' : avgJeon > U.baseMax * 100 ? 'upper' : 'rate',
      days: days, total: daily * days, monthly30: daily * 30, band: band, over50: over50, dayHours: hh / 100,
      provisional: leave > parseDate(U.until) ? 'next-year-undecided' : null, waitDays: U.waitDays };
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
    fmt: fmt, readKo: readKo, readEn: readEn, parseMoney: parseMoney,
    parseDate: parseDate, iso: iso, addMonths: addMonths,
    netPay: netPay, compare: compare, salaryTable: salaryTable, validity: validity, unemploymentValidity: unemploymentValidity, withholding: withholding, tableTax: tableTax, childCredit: childCredit,
    severance: severance, lastThreeMonths: function (s) { var d = parseDate(s); if (d === null) return err('date'); var p = lastThreeMonths(d); return { ok: true, start: iso(p.start), end: iso(p.end), days: p.days }; }, splitJeon: splitJeon,
    weeklyHoliday: weeklyHoliday, monthlyHours: monthlyHours, hourlyToPay: hourlyToPay, monthlyToHourly: monthlyToHourly,
    unemployment: unemployment, tenureBand: tenureBand,
    annualLeave: annualLeave, leaveDaysAfterYears: leaveDaysAfterYears
  };
});
