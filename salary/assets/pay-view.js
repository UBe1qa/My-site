/* 결과를 HTML 글자로 그리는 곳. DOM을 모른다(글자만 만든다).
   같은 함수를 두 군데서 쓴다: ① 빌드(_dev/calc.mjs)가 예시 결과를 첫 HTML에 미리 넣을 때 ② 브라우저(app.js)가 값이 바뀔 때.
   그래서 처음 그림과 스크립트가 붙은 뒤의 그림이 같고(화면 밀림 0), 화면의 숫자는 전부 pay-core.js(= PAY)가 낸 값이다.
   브라우저: PayView(PAY, 'ko' | 'en'). 노드: require('./pay-view.js')(P, lang). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PayView = factory;
})(typeof self !== 'undefined' ? self : this, function (P, LANG) {
  'use strict';
  var EN = LANG === 'en', D = P.data, NOW = D.now, NEXT = D.next;
  var EXAMPLE = { annual: 40000000, monthly: 3000000 };
  var STEP = { annual: 1000000, monthly: 100000 };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var KO = { pension: '국민연금', health: '건강보험', care: '장기요양보험', employment: '고용보험', incomeTax: '소득세', localTax: '지방소득세' };
  var ENN = { pension: 'National Pension', health: 'National Health Insurance', care: 'Long-term Care Insurance', employment: 'Employment Insurance', incomeTax: 'Income tax', localTax: 'Local income tax' };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function f(n) { return P.fmt(n); }
  function won(n) { return EN ? '₩' + f(n) : f(n) + '원'; }
  function neg(n) { return n ? '−' + won(n) : won(0); }
  function read(n) { return EN ? '₩' + f(n) : P.readKo(n); }
  function ko(s) { return EN ? '<span class="ko" lang="ko">' + s + '</span>' : ''; }
  function name(id) { return EN ? ENN[id] + ' ' + ko(KO[id]) : KO[id]; }
  function plain(id) { return EN ? ENN[id] : KO[id]; }
  /* 시간 글자. 로직이 준 정수(0.01·0.001·0.1시간 단위)를 그대로 글자로 바꾼다(14.99가 15.0으로 보이지 않게) */
  function h100(n) { return P.fmtDec(n, 100); }
  function h1000(n) { return P.fmtDec(n, 1000); }
  function mhText(m) { return m.official ? String(m.hours) : P.fmtDec(m.tenths, 10); }
  function ymd(s) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function date(s) { var p = ymd(s); if (!p) return s; return EN ? p.d + ' ' + MONTHS[p.m - 1].slice(0, 3) + ' ' + p.y : p.y + '년 ' + p.m + '월 ' + p.d + '일'; }
  function periodLabel(id) { return D.periods[id].label[EN ? 'en' : 'ko']; }
  function periodShort(id) { var p = /^(\d{4})-(\d\d)$/.exec(id); return EN ? MONTHS[+p[2] - 1] + ' ' + p[1] : p[1] + '년 ' + (+p[2]) + '월'; }
  function tag(cls, s) { return '<span class="' + cls + '">' + s + '</span>'; }
  function ganiTop() { var g = P.gani; return g.rows[g.rows.length - 1][0] * g.unit; }
  var Y0 = D.periods[NOW].year, IN = D.input;

  /* ───────── 금액 칸 읽기(모든 칸이 같은 규칙) ─────────
     한국어판: 단위 없는 숫자는 그 칸의 단위로(연봉·월급·비과세·3개월 임금·상여금·연차수당 = 만 원, 시급·1일 통상임금 = 원).
               만 원 칸이라도 그 칸에 있을 수 없는 큰 수는 원으로 읽고 그렇게 알린다. 영어판: 전부 원(₩) 그대로.
     name: 'annual' | 'monthly' | 'nontax' | 'wages3m' | 'bonus' | 'leavePay' | 'hourly' | 'dailyOrdinary'
     돌려주는 것: empty · ok · value(원) · code · read { cls, html }(칸 아래 한 줄) · unit(칸 옆에 붙여 보일 단위. 단위를 붙여 썼으면 '') · invalid */
  var UNIT = EN ? { man: 'won', won: 'won' } : { man: '만 원', won: '원' };
  var FE = EN ? { format: 'Could not read that amount. Try 40,000,000 or 40m.', negative: 'Amounts below zero are not calculated.', 'too-large': 'That amount is beyond what this calculator supports.', zero: 'Enter an amount above zero.',
    small: 'That is a small amount for this field. Amounts are read in won exactly as typed: for 40 million won, type 40,000,000 or 40m', big: '', ask: '' }
    : { format: '금액을 읽지 못했어요. 4000, 4천, 4,000만 원처럼 써 주세요.', negative: '0보다 작은 금액은 계산하지 않아요.', 'too-large': '이 계산기가 다루는 범위를 넘는 금액이에요.', zero: '0보다 큰 금액을 넣어 주세요.',
      small: '이 칸에는 작은 금액이에요. 맞는지 확인해 주세요', big: '큰 수는 원 단위로 읽어요', ask: "원 단위로 쓴 금액이면 끝에 '원'을 붙여 주세요" };
  function rule(name) { var mb = !EN && IN.manBelow[name]; return mb ? { unit: 'man', manBelow: mb } : { unit: 'won' }; }
  function baseUnit(name) { return EN ? UNIT.won : IN.manBelow[name] ? UNIT.man : UNIT.won; }
  function readAs(p) {
    var v = p.value;
    if (!v) return EN ? 'Read as <b>₩0</b>' : '<b>0원</b>으로 읽었어요';
    if (EN) return 'Read as <b>₩' + f(v) + '</b>' + (v >= 1000000 ? ' (' + P.readEn(v) + ')' : '');
    if (p.read === 'man') return '<b>' + P.readKo(v) + '</b>(' + f(v) + '원)으로 읽었어요';
    return '<b>' + f(v) + '원</b>' + (v >= 10000 ? '(' + P.readKo(v) + ')' : '') + '으로 읽었어요';
  }
  /* 읽은 값 한 줄. 덧붙일 말(큰 수라 원으로 읽음, 작은 금액, 만 원으로 읽기엔 드문 큰 금액)이 있으면 마침표로 이어 붙인다 */
  function readLine(p, small, ask) {
    var parts = [readAs(p)];
    if (p.big && FE.big) parts.push(FE.big);
    if (small) parts.push(FE.small);
    if (ask && FE.ask) parts.push(FE.ask);
    return parts.length > 1 ? parts.join('. ') + '.' : parts[0];
  }
  function field(text, name, opt) {
    opt = opt || {};
    var errs = opt.errs || FE, empty = text === undefined || text === null || !String(text).trim();
    if (empty) return { empty: true, ok: !!opt.optional, value: 0, code: 'empty', read: { cls: 'hint', html: opt.hint || '' }, unit: baseUnit(name), invalid: false };
    var p = P.parseMoney(text, rule(name));
    if (p.ok && opt.positive && p.value === 0) p = { ok: false, code: 'zero' };
    if (!p.ok) return { empty: false, ok: false, value: 0, code: p.code, read: { cls: 'err', html: errs[p.code] || errs.format }, unit: baseUnit(name), invalid: true };
    var small = !!IN.smallBelow[name] && p.value > 0 && p.value < IN.smallBelow[name];
    var ask = !EN && !!p.bare && p.read === 'man' && !!IN.askAbove[name] && p.value >= IN.askAbove[name];
    return { empty: false, ok: true, value: p.value, parsed: p, code: null, small: small, ask: ask,
      read: { cls: small || ask ? 'warn' : '', html: readLine(p, small, ask) }, unit: p.bare ? (p.read === 'man' ? UNIT.man : UNIT.won) : '', invalid: false };
  }
  /* 칸에 넣어 줄 글자(연봉 ↔ 월급 바꾸기, 앞뒤 금액, 표에서 넘어온 연봉): 만 원으로 떨어지면 '4,100만', 아니면 '3,333,333원'. 영어판은 숫자 그대로 */
  function amountText(n) { return EN ? f(n) : n % 10000 ? f(n) + '원' : P.readKo(n).replace(/ ?원$/, ''); }

  /* ───────── 글자 ───────── */
  var T = EN ? {
    asOf: function (id, planned) { return 'Rules as of ' + periodShort(id) + (id === NEXT && planned ? ' (planned)' : ''); },
    slip: 'Payslip estimate', perMonth: 'Take-home pay per month', perYear: 'Over a year', gross: 'Monthly pay, gross', grossKo: '지급액',
    nontax: 'of which non-taxable', ded: 'Deductions', dedKo: '공제', show: 'Show the math', hide: 'Hide the math',
    total: 'Take-home pay', totalSub: 'gross minus deductions',
    exA: function (n) { return 'Example · ₩' + f(n) + ' a year'; }, exM: function (n) { return 'Example · ₩' + f(n) + ' a month'; },
    readHint: { annual: 'Amounts are in won, read as typed. You can also write 40m or 40 million.', monthly: 'Amounts are in won, read as typed. You can also write 3m or 3 million.' },
    errs: { format: FE.format, negative: FE.negative, 'too-large': 'Amounts over ₩' + f(D.net.maxMonthly) + ' a month are not calculated.', zero: FE.zero },
    tooLargeMan: '',
    ntOver: function (g) { return 'Non-taxable pay is larger than the monthly pay (₩' + f(g) + '), so only the pay itself was excluded.'; },
    ntErr: 'Could not read the non-taxable amount. The last valid amount is still in use.',
    sumNontax: function (n) { return n ? 'Non-taxable ₩' + f(n) : 'No non-taxable pay'; },
    sumFam: function (n, c) { return n + (n === 1 ? ' dependent (you)' : ' dependents') + (c ? ', ' + c + (c === 1 ? ' child ' : ' children ') + D.net.childAgeFrom + ' to ' + D.net.childAgeTo : ''); },
    sumRatio: function (r) { return r === 100 ? '' : r < 100 ? 'withholding lowered to ' + r + '%' : 'withholding raised to ' + r + '%'; },
    sumSev: 'severance included in salary (divided by 13)', sumAge60: 'aged ' + D.net.pensionExemptAge + ' or older (no National Pension)', sumAge: 'hired after ' + D.net.employmentExemptAge + ' (no Employment Insurance)',
    change: 'Change conditions', close: 'Close',
    exBase: function (r) { return 'Annual salary ₩' + f(r.annual) + ' ÷ ' + r.divisor + ', won fractions dropped'; },
    exPension: function (l) { return l.exempt ? 'Not collected from people aged ' + D.net.pensionExemptAge + ' or older' : 'Income used for the pension ₩' + f(l.base) + ' (below ₩1,000 dropped) × ' + l.ratePct + '%' + cap(l); },
    exHealth: function (l) { return l.capped ? (l.capped === 'max' ? 'Monthly ceiling applies' : 'Monthly floor applies') : 'Taxable monthly pay ₩' + f(l.base) + ' × ' + l.ratePct + '%'; },
    exCare: function (l) { return 'Health premium ₩' + f(l.base) + ' × ' + l.ratePct + '% ÷ ' + l.healthPct + '%'; },
    exEmp: function (l) { return l.exempt ? 'Not collected from people hired after ' + D.net.employmentExemptAge : 'Taxable monthly pay ₩' + f(l.base) + ' × ' + l.ratePct + '%'; },
    exTax: function (l) {
      var k = l.lookup, s = k.zone === 'below' ? 'Under ₩' + f(P.gani.rows[0][0] * P.gani.unit) + ' a month: nothing withheld' : k.zone === 'formula' ? 'Over ₩' + f(ganiTop()) + ' a month: the formula in the table notes' : k.zone === 'top' ? 'Withholding table, the ₩' + f(k.row.from) + ' row' : 'Withholding table, ₩' + f(k.row.from) + ' up to ₩' + f(k.row.to);
      s += ', ' + l.family + (l.family === 1 ? ' dependent' : ' dependents');
      if (l.childCredit) s += ', less child credit ₩' + f(l.childCredit);
      if (l.ratio !== 100) s += ' × ' + l.ratio + '%';
      return s;
    },
    exLocal: function (l) { return 'Income tax ₩' + f(l.base) + ' × ' + l.ratePct + '%'; },
    exRound: 'Each premium and tax is rounded down to ₩' + D.rounding.pension + '.',
    capMax: function (n) { return ' (ceiling ₩' + f(n) + ')'; }, capMin: function (n) { return ' (floor ₩' + f(n) + ')'; },
    stFixed: 'set by law', stResolved: 'same rate approved', stCarried: 'not decided · ' + Y0 + ' value used', stCarriedTax: 'revision not decided · ' + Y0 + ' table used', stCarriedEmp: Y0 + ' rate used', stCarriedLimit: 'limits not decided · ' + Y0 + ' values used',
    nxSame: function (id) { return 'Under the ' + periodShort(id) + ' rules your take-home pay is the same.'; },
    nxPension: function (id, pct, d) { return 'From ' + periodShort(id) + ' the National Pension rate rises to ' + pct + '%, so you get <b>₩' + f(d) + '</b> less a month.'; },
    nxOther: function (id, d) { return 'From ' + periodShort(id) + ' you get <b>₩' + f(Math.abs(d)) + '</b> ' + (d < 0 ? 'less' : 'more') + ' a month.'; },
    nxGo: function (id) { return 'See the ' + D.periods[id].year + ' rules'; },
    nxNow: function (id, d, planned) { return (planned ? 'These are the rules planned for ' + periodShort(id) + '. ' : 'These are the rules as of ' + periodShort(id) + '. ') + (d ? 'Compared with ' + periodShort(NOW) + ' you get <b>₩' + f(Math.abs(d)) + '</b> ' + (d < 0 ? 'less' : 'more') + ' a month. ' : '') + 'Values not decided yet use the ' + D.periods[NOW].year + ' figures.'; },
    nxBack: function (id) { return 'Back to ' + periodShort(id); },
    noteClamp: 'The non-taxable amount was larger than the pay, so only the pay itself was excluded.', noteZero: 'Nothing is taxable, so nothing is deducted.',
    cmpH: { annual: 'Salaries around yours', monthly: 'Monthly pay around yours' }, cmpC: { annual: ['Annual salary', 'Take-home pay', 'Difference'], monthly: ['Monthly pay', 'Take-home pay', 'Difference'] },
    mine: 'yours', exTag: 'example', stepDown: function (b) { return '−₩' + (b === 'annual' ? '1M' : '100K'); }, stepUp: function (b) { return '+₩' + (b === 'annual' ? '1M' : '100K'); },
    stepDownL: function (b) { return 'Lower by ₩' + f(STEP[b]); }, stepUpL: function (b) { return 'Raise by ₩' + f(STEP[b]); },
    cmpAmt: function (n) { return n % 1000000 ? '₩' + f(n) : '₩' + f(n / 1000000) + 'M'; }, useThis: function (n) { return 'Calculate with ₩' + f(n); },
    stick: 'Take-home per month', live: function (n) { return 'Take-home pay per month ₩' + f(n); },
    diffUp: function (nm, d) { return nm + ' up ₩' + f(d); }, diffDown: function (nm, d) { return nm + ' down ₩' + f(d); }
  } : {
    asOf: function (id, planned) { return periodShort(id) + ' 기준' + (id === NEXT && planned ? '(예정)' : ''); },
    slip: '급여명세서', perMonth: '한 달 실수령액', perYear: '1년이면', gross: '월급(세전)', grossKo: '',
    nontax: '이 가운데 비과세', ded: '떼는 돈', dedKo: '', show: '계산식 보기', hide: '계산식 접기',
    total: '실수령액', totalSub: '월급 − 떼는 돈',
    exA: function (n) { return '예시 · 연봉 ' + P.readKo(n); }, exM: function (n) { return '예시 · 월급 ' + P.readKo(n); },
    readHint: { annual: '숫자만 쓰면 만 원으로 읽어요. 4000, 4천, 1억 2천처럼 써도 돼요.', monthly: '숫자만 쓰면 만 원으로 읽어요. 300, 250만처럼 써도 돼요.' },
    errs: { format: FE.format, negative: FE.negative, 'too-large': '월 ' + P.readKo(D.net.maxMonthly) + '이 넘는 금액은 계산하지 않아요.', zero: FE.zero },
    tooLargeMan: " 원 단위로 쓴 금액이면 끝에 '원'을 붙여 주세요.",
    ntOver: function (g) { return '비과세가 월급(' + f(g) + '원)보다 커요. 월급만큼만 뺐어요.'; },
    ntErr: '비과세 금액을 읽지 못했어요. 앞서 넣은 금액으로 계산하고 있어요.',
    sumNontax: function (n) { return n ? '비과세 ' + P.readKo(n) : '비과세 없음'; },
    sumFam: function (n, c) { return '부양가족 ' + n + '명' + (c ? '(자녀 ' + c + '명)' : ''); },
    sumRatio: function (r) { return r === 100 ? '' : r < 100 ? '세금을 덜 떼도록 신청(' + r + '%)' : '세금을 더 떼도록 신청(' + r + '%)'; },
    sumSev: '퇴직금이 연봉에 들어 있음(13으로 나눔)', sumAge60: '만 ' + D.net.pensionExemptAge + '세 이상(국민연금 없음)', sumAge: D.net.employmentExemptAge + '세 이후 입사(고용보험료 없음)',
    change: '조건 바꾸기', close: '조건 접기',
    exBase: function (r) { return '연봉 ' + f(r.annual) + '원 ÷ ' + r.divisor + '(원 미만 버림)'; },
    exPension: function (l) { return l.exempt ? '만 ' + D.net.pensionExemptAge + '세 이상은 가입 대상이 아니라 떼지 않아요' : '국민연금을 매기는 월 소득 ' + f(l.base) + '원(천 원 미만 버림) × ' + l.ratePct + '%' + cap(l); },
    exHealth: function (l) { return l.capped ? (l.capped === 'max' ? '월 상한액 적용' : '월 하한액 적용') : '과세 대상 월급 ' + f(l.base) + '원 × ' + l.ratePct + '%'; },
    exCare: function (l) { return '건강보험료 ' + f(l.base) + '원 × ' + l.ratePct + '% ÷ ' + l.healthPct + '%'; },
    exEmp: function (l) { return l.exempt ? D.net.employmentExemptAge + '세 이후에 새로 고용된 사람은 떼지 않아요' : '과세 대상 월급 ' + f(l.base) + '원 × ' + l.ratePct + '%'; },
    exTax: function (l) {
      var k = l.lookup, s = k.zone === 'below' ? '월 ' + P.readKo(P.gani.rows[0][0] * P.gani.unit) + ' 미만은 떼지 않아요' : k.zone === 'formula' ? '간이세액표 주석의 계산식(월 ' + P.readKo(ganiTop()) + ' 초과)' : k.zone === 'top' ? '간이세액표 ' + f(k.row.from) + '원 줄' : '간이세액표 ' + f(k.row.from) + '원 이상 ' + f(k.row.to) + '원 미만';
      s += ', 부양가족 ' + l.family + '명';
      if (l.childCredit) s += ' − 자녀 공제 ' + f(l.childCredit) + '원';
      if (l.ratio !== 100) s += ' × ' + l.ratio + '%';
      return s;
    },
    exLocal: function (l) { return '소득세 ' + f(l.base) + '원 × ' + l.ratePct + '%'; },
    exRound: '보험료와 세금은 각각 ' + D.rounding.pension + '원 미만을 버려요.',
    capMax: function (n) { return ' (상한 ' + P.readKo(n) + ')'; }, capMin: function (n) { return ' (하한 ' + P.readKo(n) + ')'; },
    stFixed: '확정', stResolved: '같은 요율로 의결', stCarried: '미정 · ' + Y0 + '년 값으로 계산', stCarriedTax: '개정 여부 미정 · ' + Y0 + '년 표로 계산', stCarriedEmp: Y0 + '년 요율로 계산', stCarriedLimit: '상·하한 미정 · ' + Y0 + '년 값으로 계산',
    nxSame: function (id) { return periodShort(id) + ' 기준으로도 실수령액이 같아요.'; },
    nxPension: function (id, pct, d) { return periodShort(id) + '부터는 국민연금이 ' + pct + '%로 올라 한 달에 <b>' + f(d) + '원</b> 덜 받아요.'; },
    nxOther: function (id, d) { return periodShort(id) + '부터는 한 달에 <b>' + f(Math.abs(d)) + '원</b> ' + (d < 0 ? '덜' : '더') + ' 받아요.'; },
    nxGo: function (id) { return D.periods[id].year + '년 기준으로 보기'; },
    nxNow: function (id, d, planned) { return periodShort(id) + (planned ? '(예정)' : '') + ' 기준이에요. ' + (d ? periodShort(NOW) + '보다 한 달에 <b>' + f(Math.abs(d)) + '원</b> ' + (d < 0 ? '덜' : '더') + ' 받아요. ' : '') + '아직 안 정해진 값은 ' + D.periods[NOW].year + '년 값으로 계산했어요.'; },
    nxBack: function (id) { return periodShort(id) + ' 기준으로 보기'; },
    noteClamp: '비과세 금액이 월급보다 커서 월급만큼만 뺐어요.', noteZero: '과세 대상 금액이 없어서 떼는 돈이 없어요.',
    cmpH: { annual: '앞뒤 연봉과 견주기', monthly: '앞뒤 월급과 견주기' }, cmpC: { annual: ['연봉', '한 달 실수령액', '차이'], monthly: ['월급', '한 달 실수령액', '차이'] },
    mine: '내 금액', exTag: '예시', stepDown: function (b) { return b === 'annual' ? '−100만' : '−10만'; }, stepUp: function (b) { return b === 'annual' ? '+100만' : '+10만'; },
    stepDownL: function (b) { return P.readKo(STEP[b]) + ' 내리기'; }, stepUpL: function (b) { return P.readKo(STEP[b]) + ' 올리기'; },
    cmpAmt: function (n) { return P.readKo(n).replace(/ 원$/, ''); }, useThis: function (n) { return P.readKo(n) + '으로 계산하기'; },
    stick: '한 달 실수령액', live: function (n) { return '한 달 실수령액 ' + f(n) + '원'; },
    diffUp: function (nm, d) { return nm + ' ' + f(d) + '원 늘어요'; }, diffDown: function (nm, d) { return nm + ' ' + f(d) + '원 줄어요'; }
  };
  function cap(l) { var pen = D.periods[NOW].pension; return l.capped === 'max' ? T.capMax(pen.baseMax) : l.capped === 'min' ? T.capMin(pen.baseMin) : ''; }

  /* ───────── 1. 실수령액 ───────── */
  /* st: { text, basis, nontax, nontaxText, family, children, ratio, sev, age60, age65, period, showEx, planned }
     nontax = 지금 계산에 쓰는 비과세(원). nontaxText = 비과세 칸에 쓴 글자(있으면 읽어 보고, 못 읽으면 nontax 를 그대로 쓴 채 알린다).
     planned = 다음 기준(2027년 1월)이 아직 시행 전인지(기기 날짜로. 안 주면 시행 전으로 본다) */
  function isPlanned(st) { return st.planned === undefined ? true : !!st.planned; }
  function netCalc(st) {
    var fld = field(st.text, st.basis, { hint: T.readHint[st.basis], positive: true, errs: T.errs });
    var typed = fld.ok && !fld.empty, error = fld.empty ? null : fld.code;
    var nt = { value: st.nontax, read: { cls: 'hint', html: '' }, unit: baseUnit('nontax'), invalid: false };
    if (st.nontaxText !== undefined && st.nontaxText !== null) {
      var nf = field(st.nontaxText, 'nontax', { optional: true });
      if (nf.empty) nt = { value: 0, read: nf.read, unit: nf.unit, invalid: false };
      else if (nf.ok) nt = { value: nf.value, read: nf.read, unit: nf.unit, invalid: false };
      else nt = { value: st.nontax, read: { cls: 'err', html: (nf.code === 'negative' ? FE.negative + ' ' : '') + T.ntErr }, unit: nf.unit, invalid: true };
    }
    var input = { amount: typed ? fld.value : EXAMPLE[st.basis], basis: st.basis, nontax: nt.value, family: st.family, children: st.children,
      ratio: st.ratio, includeSeverance: !!st.sev && st.basis === 'annual', noPension: !!st.age60, noEmployment: !!st.age65, period: st.period || NOW };
    var res = P.netPay(input), tooLargeMan = false;
    if (!res.ok) { error = res.code; tooLargeMan = res.code === 'too-large' && typed && fld.parsed.bare && fld.parsed.read === 'man'; input.amount = EXAMPLE[st.basis]; res = P.netPay(input); typed = false; }
    if (!nt.invalid && res.notes.indexOf('nontax-clamped') >= 0) nt.read = { cls: 'warn', html: T.ntOver(res.gross) };
    return { field: fld, parsed: fld.parsed || { ok: false }, example: !typed, error: error, tooLargeMan: tooLargeMan, input: input, res: res, cmp: P.compare(input), nontax: nt };
  }
  function netRead(c) {
    if (c.error && T.errs[c.error]) return { cls: 'err', html: T.errs[c.error] + (c.tooLargeMan ? T.tooLargeMan : '') };
    return c.field.read;
  }
  function netSummary(st) {
    return [T.sumNontax(st.nontax), T.sumFam(st.family, st.children), T.sumRatio(st.ratio), st.sev && st.basis === 'annual' ? T.sumSev : '',
      st.age60 ? T.sumAge60 : '', st.age65 ? T.sumAge : '', (st.period || NOW) === NOW ? '' : periodShort(st.period)].filter(Boolean).join(' · ');
  }
  function netExpr(l) {
    return l.id === 'pension' ? T.exPension(l) : l.id === 'health' ? T.exHealth(l) : l.id === 'care' ? T.exCare(l) : l.id === 'employment' ? T.exEmp(l) : l.id === 'incomeTax' ? T.exTax(l) : T.exLocal(l);
  }
  /* 2027년 기준으로 볼 때 줄마다 붙는 꼬리표: 확정 / 의결 / 미정 */
  function statusTag(l) {
    if (l.exempt) return '';   /* 떼지 않는 줄(만 60세 이상의 국민연금, 65세 이후 입사의 고용보험)에는 요율의 상태를 붙이지 않는다 */
    if (l.status === 'carried') return tag('tag-hold', l.id === 'incomeTax' ? T.stCarriedTax : l.id === 'employment' ? T.stCarriedEmp : T.stCarried);
    if (l.limitStatus === 'carried' && l.capped) return tag('tag-hold', T.stCarriedLimit);
    if (l.status === 'resolved') return tag('tag-st', T.stResolved);
    if (l.id === 'pension') return tag('tag-st', T.stFixed);
    return '';
  }
  function netNext(c, st) {
    var pid = st.period || NOW, d = c.cmp.netDiff;
    if (pid !== NOW) return '<p>' + T.nxNow(pid, d, isPlanned(st)) + '</p><button type="button" class="lnk" data-act="period" data-v="' + NOW + '">' + T.nxBack(NOW) + '</button>';
    var ch = c.cmp.lines.filter(function (x) { return x.diff !== 0; });
    var s = d === 0 ? T.nxSame(NEXT) : ch.length === 1 && ch[0].id === 'pension' && d < 0 ? T.nxPension(NEXT, D.periods[NEXT].pension.ratePct, -d) : T.nxOther(NEXT, d);
    return '<p>' + s + '</p><button type="button" class="lnk" data-act="period" data-v="' + NEXT + '">' + T.nxGo(NEXT) + '</button>';
  }
  function netSlip(c, st) {
    var r = c.res, pid = st.period || NOW, i = st.basis === 'annual' ? 0 : 1, showEx = !!st.showEx, h = '';
    h += '<div class="slip-h"><b>' + T.slip + '</b><span class="asof"><i></i>' + T.asOf(pid, isPlanned(st)) + '</span></div>';
    h += '<div class="sum"><p class="sum-l"><span>' + T.perMonth + '</span>' + (c.example ? tag('tag-ex', i ? T.exM(EXAMPLE.monthly) : T.exA(EXAMPLE.annual)) : '') + '</p>' +
      '<p class="sum-n"><span class="dbl">' + (EN ? '<small class="cur">₩</small>' : '') + '<b class="num" data-net>' + f(r.net) + '</b>' + (EN ? '' : '<small>원</small>') + '</span></p>' +
      '<p class="sum-y">' + T.perYear + ' <b class="num">' + read(r.netAnnual) + '</b></p></div>';
    h += '<div class="ln pay"><span>' + T.gross + (T.grossKo ? ' ' + ko(T.grossKo) : '') + '</span><span class="num">' + won(r.gross) + '</span></div>';
    if (showEx && r.basis === 'annual') h += '<div class="ln sub ex1"><span>' + T.exBase(r) + '</span></div>';
    h += '<div class="ln sub"><span>' + T.nontax + '</span><span class="num">' + won(r.nontax) + '</span></div>';
    h += '<div class="ln cap"><span class="cap-l">' + T.ded + (T.dedKo ? ' ' + ko(T.dedKo) : '') + '</span><button type="button" class="how" data-act="how" aria-expanded="' + showEx + '">' + (showEx ? T.hide : T.show) + '</button><span class="num">' + neg(r.deductions) + '</span></div>';
    h += '<ul class="ded">' + r.lines.map(function (l) {
      var st2 = pid === NOW ? '' : statusTag(l);
      return '<li data-id="' + l.id + '"><span class="nm">' + name(l.id) + (st2 ? ' ' + st2 : '') + '</span><span class="am num">' + neg(l.amount) + '</span>' + (showEx ? '<span class="ex">' + (r.taxable > 0 ? netExpr(l) : T.noteZero) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
    if (showEx) h += '<p class="ex-note">' + T.exRound + '</p>';
    if (r.notes.indexOf('nontax-clamped') >= 0) h += '<p class="ex-note hold">' + T.ntOver(r.gross) + '</p>';
    if (r.notes.indexOf('no-taxable') >= 0) h += '<p class="ex-note">' + T.noteZero + '</p>';
    h += '<div class="ln tot" data-id="net"><span>' + T.total + ' <small>' + T.totalSub + '</small></span><span class="num">' + won(r.net) + '</span></div>';
    h += '<div class="nx">' + netNext(c, st) + '</div>';
    return h;
  }
  function netAround(c, st) {
    var b = st.basis, opts = { nontax: c.input.nontax, family: st.family, children: st.children, ratio: st.ratio, includeSeverance: !!st.sev && b === 'annual', noPension: !!st.age60, noEmployment: !!st.age65, period: st.period || NOW };
    var base = c.input.amount, rows = [];
    for (var k = -3; k <= 3; k++) {
      var v = base + k * STEP[b];
      if (v <= 0) continue;
      var r = P.netPay(Object.assign({}, opts, { amount: v, basis: b }));
      if (r.ok) rows.push({ k: k, amount: v, net: r.net });
    }
    return rows;
  }
  function netCompare(c, st) {
    var b = st.basis, rows = netAround(c, st), mine = c.res.net, C = T.cmpC[b];
    var h = '<div class="cmp-h"><h2>' + T.cmpH[b] + '</h2><span class="cmp-step"><button type="button" data-act="step" data-v="-1" aria-label="' + T.stepDownL(b) + '">' + T.stepDown(b) + '</button><button type="button" data-act="step" data-v="1" aria-label="' + T.stepUpL(b) + '">' + T.stepUp(b) + '</button></span></div>';
    h += '<table class="cmp-t"><thead><tr><th scope="col">' + C[0] + '</th><th scope="col">' + C[1] + '</th><th scope="col">' + C[2] + '</th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var d = x.net - mine;
      if (x.k === 0) h += '<tr class="me"><th scope="row"><span class="num">' + T.cmpAmt(x.amount) + '</span> ' + tag('tag-me', c.example ? T.exTag : T.mine) + '</th><td class="num">' + won(x.net) + '</td><td></td></tr>';
      else h += '<tr><th scope="row"><button type="button" class="num" data-act="set" data-v="' + x.amount + '" aria-label="' + T.useThis(x.amount) + '">' + T.cmpAmt(x.amount) + '</button></th><td class="num">' + won(x.net) + '</td><td class="num df">' + (d > 0 ? '+' : '−') + f(Math.abs(d)) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  /* 2026 ↔ 2027 을 바꿨을 때 달라진 줄(연출 '달라진 줄 짚기'가 쓴다): [{ id, diff }] . diff 는 바꾼 뒤 − 바꾸기 전 */
  function netChanged(c, toPeriod) {
    var sign = toPeriod === NOW ? -1 : 1, out = c.cmp.lines.filter(function (x) { return x.diff !== 0; }).map(function (x) { return { id: x.id, diff: sign * x.diff }; });
    if (c.cmp.netDiff) out.push({ id: 'net', diff: sign * c.cmp.netDiff });
    return out;
  }
  function netLive(ch) {
    return ch.map(function (x) { var nm = x.id === 'net' ? T.total : plain(x.id); return x.diff > 0 ? T.diffUp(nm, x.diff) : T.diffDown(nm, -x.diff); }).join(', ');
  }
  function net(st) {
    var c = netCalc(st);
    var rd = netRead(c), sum = netSummary(Object.assign({}, st, { nontax: c.input.nontax }));
    /* live: 화면 낭독기에 읽어 줄 한 줄. 금액을 못 읽었으면 그 안내를 읽어 준다(결과는 예시로 돌아가 있다) */
    return { calc: c, read: rd, unit: c.field.unit, invalid: !!c.error, nontax: c.nontax, summary: sum, slip: netSlip(c, st), compare: netCompare(c, st), value: c.res.net, example: c.example,
      stick: T.stick + ' <b class="num">' + won(c.res.net) + '</b>', live: c.error ? rd.html.replace(/<[^>]+>/g, '') : T.live(c.res.net) };
  }

  /* ───────── 2. 퇴직금 ───────── */
  var TS = EN ? {
    slip: 'Severance pay estimate', before: 'before tax', head: 'Severance pay', ex: 'Example · Ministry of Employment and Labor sample case',
    formula: function (a, days) { return 'Average daily wage ' + a + ' × ' + D.severance.payDays + ' days × ' + f(days) + ' days of service ÷ ' + D.severance.daysPerYear; },
    service: 'Service period', lastDay: 'last working day', days: function (n) { return f(n) + ' days'; }, three: 'Last three months',
    ruleNote: 'That day does not exist three months earlier, so the count starts here, as on the ministry’s calculator.',
    a: 'A. Wages in those three months', b: function (n) { return 'B. Bonus share, ₩' + f(n) + ' a year × 3/12'; }, c: function (n) { return 'C. Unused-leave pay share, ₩' + f(n) + ' × 3/12'; },
    avg: function (d) { return 'Average daily wage, (A + B + C) ÷ ' + d + ' days'; }, jeon: function (s) { return '₩' + f(s.won) + '.' + (s.jeon < 10 ? '0' : '') + s.jeon; },
    ordinary: 'Ordinary daily wage you entered', usedOrd: 'Your ordinary daily wage is higher, so it is used instead of the average wage.',
    total: 'Severance pay, before tax', ref: 'For reference, the same inputs would give',
    r1y: function (d) { return 'Service of less than one year is outside the severance scheme (Article 4 of the Act on the Guarantee of Employees’ Retirement Benefits). With these dates, one year is reached on ' + date(d) + '.'; },
    r15: 'Workers whose contractual hours average under ' + D.severance.minWeekHours + ' a week over four weeks are outside the severance scheme (Article 4 of the same Act).',
    errs: { date: 'Enter both dates.', 'date-order': 'The leaving date must be after the starting date.', nan: 'Enter the wages paid in the last three months.', negative: 'Amounts below zero are not calculated.', 'too-large': 'That amount is beyond what this calculator supports.', format: 'Could not read that amount.', ordinary: 'Could not read the ordinary daily wage.' },
    fe: { format: 'Could not read that amount. Try 7,080,000 or 7.08m.', negative: FE.negative, 'too-large': FE['too-large'], zero: FE.zero },
    dash: 'Check the inputs'
  } : {
    slip: '퇴직금 계산서', before: '세전', head: '퇴직금', ex: '예시 · 고용노동부 퇴직금 계산 예제',
    formula: function (a, days) { return '1일 평균임금 ' + a + ' × ' + D.severance.payDays + '일 × 재직 ' + f(days) + '일 ÷ ' + D.severance.daysPerYear; },
    service: '재직 기간', lastDay: '마지막 근무일', days: function (n) { return f(n) + '일'; }, three: '퇴직 전 3개월',
    ruleNote: '3개월 전 달에 같은 날짜가 없어 이날부터 세어요(고용노동부 계산기와 같은 방식).',
    a: 'A. 3개월 동안 받은 임금', b: function (n) { return 'B. 상여금 가산(연간 ' + f(n) + '원 × 3/12)'; }, c: function (n) { return 'C. 연차수당 가산(' + f(n) + '원 × 3/12)'; },
    avg: function (d) { return '1일 평균임금, (A + B + C) ÷ ' + d + '일'; }, jeon: function (s) { return f(s.won) + '원' + (s.jeon ? ' ' + s.jeon + '전' : ''); },
    ordinary: '넣은 1일 통상임금', usedOrd: '1일 통상임금이 평균임금보다 커서 통상임금으로 계산했어요.',
    total: '퇴직금(세전)', ref: '참고로 같은 조건을 그대로 계산하면',
    r1y: function (d) { return '계속근로기간이 1년 미만이면 퇴직급여 제도의 대상에서 빠져요(근로자퇴직급여 보장법 제4조). 넣은 날짜로는 ' + date(d) + '에 1년이 돼요.'; },
    r15: '4주 평균 1주 소정근로시간이 ' + D.severance.minWeekHours + '시간 미만이면 퇴직급여 제도의 대상에서 빠져요(근로자퇴직급여 보장법 제4조).',
    errs: { date: '입사일과 퇴직일을 넣어 주세요.', 'date-order': '퇴직일은 입사일보다 뒤여야 해요.', nan: '퇴직 전 3개월 동안 받은 임금을 넣어 주세요.', negative: '0보다 작은 금액은 계산하지 않아요.', 'too-large': '이 계산기가 다루는 범위를 넘는 금액이에요.', format: '금액을 읽지 못했어요.', ordinary: '1일 통상임금을 읽지 못했어요.' },
    fe: { format: '금액을 읽지 못했어요. 708, 708만, 7,080,000원처럼 써 주세요.', negative: FE.negative, 'too-large': FE['too-large'], zero: FE.zero },
    dash: '입력을 확인해 주세요'
  };
  /* st: { join, leave, wages, bonus, leavePay, ordinary, under15, touched } . touched 가 아니면 고용노동부 예제를 보여 준다.
     fields: 금액 칸마다 읽은 값 한 줄·단위·오류 여부(화면이 칸 아래에 보여 준다). 빈 칸은 0 */
  function sev(st) {
    var E = D.severance.example, example = !st.touched, inp, err = null, bad = {};
    var F = { wages: field(st.wages, 'wages3m', { optional: true, errs: TS.fe }), bonus: field(st.bonus, 'bonus', { optional: true, errs: TS.fe }),
      leavePay: field(st.leavePay, 'leavePay', { optional: true, errs: TS.fe }), ordinary: field(st.ordinary, 'dailyOrdinary', { optional: true, errs: TS.fe }) };
    if (example) inp = { join: E.join, leave: E.leave, wages3m: E.wages3m, annualBonus: E.annualBonus, leavePay: E.leavePay };
    else {
      var w = F.wages, b = F.bonus, lp = F.leavePay, o = F.ordinary, x = !w.ok ? w : !b.ok ? b : !lp.ok ? lp : null;
      if (x) err = x.code === 'negative' || x.code === 'too-large' ? x.code : 'format';
      else if (!o.ok) err = 'ordinary';
      else if (w.empty) err = 'nan';
      inp = { join: st.join, leave: st.leave, wages3m: w.value, annualBonus: b.value || 0, leavePay: lp.value || 0, dailyOrdinary: o.value || undefined, weeklyHours: st.under15 ? 0 : undefined };
    }
    var r = err ? { ok: false, code: err } : P.severance(inp), h = '';
    h += '<div class="slip-h"><b>' + TS.slip + '</b><span class="asof">' + TS.before + '</span></div>';
    if (!r.ok) {
      h += '<div class="sum"><p class="sum-l"><span>' + TS.head + '</span></p><p class="sum-n none">' + TS.dash + '</p><p class="sum-y err">' + (TS.errs[r.code] || TS.errs.format) + '</p></div>';
      bad.join = r.code === 'date' && !example && P.parseDate(st.join) === null; bad.leave = (r.code === 'date' && !example && P.parseDate(st.leave) === null) || r.code === 'date-order'; bad.wages = r.code === 'nan';
      return { ok: false, example: example, slip: h, live: TS.errs[r.code] || TS.errs.format, fields: F, bad: bad };
    }
    var avg = P.splitJeon(r.avgDailyJeon), used = P.splitJeon(r.usedJeon), lastDay = P.iso(P.parseDate(inp.leave) - 1);
    h += '<div class="sum"><p class="sum-l"><span>' + TS.total + '</span>' + (example ? tag('tag-ex', TS.ex) : '') + '</p>';
    if (r.eligible) h += '<p class="sum-n"><span class="dbl">' + (EN ? '<small class="cur">₩</small>' : '') + '<b class="num" data-net>' + f(r.amount) + '</b>' + (EN ? '' : '<small>원</small>') + '</span></p><p class="sum-y">' + TS.formula(TS.jeon(used), r.serviceDays) + '</p>';
    else h += '<p class="sum-y why">' + (r.reason === 'under-1y' ? TS.r1y(r.oneYearDate) : TS.r15) + '</p><p class="sum-y">' + TS.ref + ' <b class="num">' + won(r.amountIfEligible) + '</b></p>';
    h += '</div>';
    h += '<div class="ln"><span>' + TS.service + '<small class="sub2">' + date(inp.join) + ' ~ ' + date(lastDay) + ' (' + TS.lastDay + ')</small></span><span class="num">' + TS.days(r.serviceDays) + '</span></div>';
    h += '<div class="ln"><span>' + TS.three + '<small class="sub2">' + date(r.period.start) + ' ~ ' + date(r.period.end) + (r.period.rule !== 'same' ? '<br>' + TS.ruleNote : '') + '</small></span><span class="num">' + TS.days(r.period.days) + '</span></div>';
    h += '<ul class="ded plus"><li><span class="nm">' + TS.a + '</span><span class="am num">' + won(r.wages3m) + '</span></li>' +
      '<li><span class="nm">' + TS.b(inp.annualBonus || 0) + '</span><span class="am num">' + won(r.bonusPart) + '</span></li>' +
      '<li><span class="nm">' + TS.c(inp.leavePay || 0) + '</span><span class="am num">' + won(r.leavePart) + '</span></li></ul>';
    h += '<div class="ln"><span>' + TS.avg(r.period.days) + '</span><span class="num">' + TS.jeon(avg) + '</span></div>';
    if (r.ordinaryJeon) h += '<div class="ln"><span>' + TS.ordinary + '</span><span class="num">' + TS.jeon(P.splitJeon(r.ordinaryJeon)) + '</span></div>';
    if (r.basis === 'ordinary') h += '<p class="ex-note">' + TS.usedOrd + '</p>';
    if (r.eligible) h += '<div class="ln tot"><span>' + TS.total + '</span><span class="num">' + won(r.amount) + '</span></div>';
    return { ok: true, example: example, res: r, slip: h, live: r.eligible ? TS.total + ' ' + won(r.amount) : (r.reason === 'under-1y' ? TS.r1y(r.oneYearDate) : TS.r15), fields: F, bad: bad };
  }

  /* ───────── 3. 시급·주휴수당·최저임금 ───────── */
  var TH = EN ? {
    slip: 'Wage sheet', asOf: function (y) { return y + ' minimum wage'; },
    exH: function (w, y) { return 'Example · ' + y + ' minimum wage ₩' + f(w) + ', ' + D.hourly.fullWeekHours + ' hours a week'; }, exM: function (n) { return 'Example · ₩' + f(n) + ' a month'; },
    headH: 'Monthly pay, holiday allowance included', headM: 'As an hourly wage', perHour: ' an hour',
    wage: 'Hourly wage', hours: 'Contractual hours a week', hUnit: function (x) { return x + ' hours'; },
    paidH: 'Paid weekly holiday hours', paidF: function (c, full, day) { return c + ' ÷ ' + full + ' × ' + day; },
    holiday: 'Weekly holiday allowance, per week', holidayKo: '주휴수당', weekBase: 'Pay for hours worked, per week', week: 'Weekly pay, allowance included',
    mh: 'Hours per month', mhOfficial: 'the figure in the official notice', mhF: function (h, p) { return '(' + h + ' + ' + p + ') × 365 ÷ 7 ÷ 12'; },
    monthly: 'Monthly pay', monthlyF: 'hourly wage × hours per month, won fractions rounded up', mPay: 'Monthly pay', mHourly: 'Hourly wage', mHourlyF: function (h) { return 'monthly pay ÷ ' + h + ' hours, won fractions dropped'; },
    mNeed: function (y) { return 'Monthly minimum for these hours, ' + y; }, mNeedF: 'minimum wage × hours per month, rounded up',
    none: 'No weekly holiday allowance: contractual hours are under ' + D.hourly.minWeekHours + ' a week (Labor Standards Act, Article 18(3)).',
    over: 'Hours above ' + D.hourly.fullWeekHours + ' a week are counted as ' + D.hourly.fullWeekHours + ' here: the paid weekly holiday is ' + D.hourly.fullDayHours + ' hours at most.',
    mwSame: function (y, w) { return 'Exactly the ' + y + ' minimum wage of ₩' + f(w) + ' an hour.'; },
    mwOver: function (y, w, d) { return '₩' + f(d) + ' an hour above the ' + y + ' minimum wage of ₩' + f(w) + '.'; },
    mwUnder: function (y, w, d) { return '₩' + f(d) + ' an hour below the ' + y + ' minimum wage of ₩' + f(w) + '.'; },
    errs: { format: 'Could not read that amount.', nan: 'Enter the wage and the weekly hours.', negative: 'Amounts below zero are not calculated.', 'too-large': 'That amount is beyond what this calculator supports.', hours: 'Weekly hours must be between 1 and 168, with at most two decimals.', zero: 'Enter an amount above zero.' },
    dash: 'Check the inputs', hintH: 'In won, read as typed. For example 10,320 or 12000.', hintM: 'In won, read as typed. For example 2,500,000 or 2.5m.'
  } : {
    slip: '시급 계산서', asOf: function (y) { return y + '년 최저임금 기준'; },
    exH: function (w, y) { return '예시 · ' + y + '년 최저임금 ' + f(w) + '원, 주 ' + D.hourly.fullWeekHours + '시간'; }, exM: function (n) { return '예시 · 월급 ' + P.readKo(n); },
    headH: '월급(주휴수당 포함)', headM: '시급으로 바꾸면', perHour: '',
    wage: '시급', hours: '주 소정근로시간', hUnit: function (x) { return x + '시간'; },
    paidH: '유급 주휴 시간', paidF: function (c, full, day) { return c + ' ÷ ' + full + ' × ' + day; },
    holiday: '주휴수당(한 주)', holidayKo: '', weekBase: '일한 시간의 임금(한 주)', week: '주급(주휴수당 포함)',
    mh: '월 환산 시간', mhOfficial: '고용노동부 고시의 값', mhF: function (h, p) { return '(' + h + ' + ' + p + ') × 365 ÷ 7 ÷ 12'; },
    monthly: '월급', monthlyF: '시급 × 월 환산 시간, 원 미만 올림', mPay: '월급', mHourly: '시급', mHourlyF: function (h) { return '월급 ÷ ' + h + '시간, 원 미만 버림'; },
    mNeed: function (y) { return '이 근로시간의 ' + y + '년 최저임금 월 환산액'; }, mNeedF: '최저임금 × 월 환산 시간, 원 미만 올림',
    none: '주 소정근로시간이 ' + D.hourly.minWeekHours + '시간 미만이라 주휴수당이 없어요(근로기준법 제18조 제3항).',
    over: '주 ' + D.hourly.fullWeekHours + '시간이 넘는 부분은 ' + D.hourly.fullWeekHours + '시간으로 계산했어요. 주휴는 ' + D.hourly.fullDayHours + '시간분까지예요.',
    mwSame: function (y, w) { return y + '년 최저임금 ' + f(w) + '원과 같아요.'; },
    mwOver: function (y, w, d) { return y + '년 최저임금 ' + f(w) + '원보다 시간당 ' + f(d) + '원 많아요.'; },
    mwUnder: function (y, w, d) { return y + '년 최저임금 ' + f(w) + '원보다 시간당 ' + f(d) + '원 적어요.'; },
    errs: { format: '금액을 읽지 못했어요.', nan: '금액과 주 근로시간을 넣어 주세요.', negative: '0보다 작은 금액은 계산하지 않아요.', 'too-large': '이 계산기가 다루는 범위를 넘는 금액이에요.', hours: '주 근로시간은 1~168시간 사이로 넣어 주세요(소수는 둘째 자리까지).', zero: '0보다 큰 금액을 넣어 주세요.' },
    dash: '입력을 확인해 주세요', hintH: '원 단위로 읽어요. 10,320이나 12000처럼 써요.', hintM: '숫자만 쓰면 만 원으로 읽어요. 250, 250만처럼 써요.'
  };
  /* st: { mode: 'hourly' | 'monthly', text, hours, period } */
  function hourly(st) {
    var pid = st.period || NOW, mw = D.periods[pid].minWage, y = D.periods[pid].year, mode = st.mode === 'monthly' ? 'monthly' : 'hourly';
    var fld = field(st.text, mode, { hint: mode === 'hourly' ? TH.hintH : TH.hintM, positive: true, errs: TH.errs });
    var typed = fld.ok && !fld.empty;
    var hoursTxt = st.hours === undefined || st.hours === null || String(st.hours).trim() === '' ? String(D.hourly.fullWeekHours) : String(st.hours).trim();
    /* 시간은 소수 둘째 자리까지만 받는다(14.999가 반올림돼 15시간이 되지 않게) */
    var h = /^\d+(\.\d{1,2})?$/.test(hoursTxt) ? Number(hoursTxt) : NaN, hoursBad = !(h > 0 && h <= 168);
    var example = !typed, amount = typed ? fld.value : (mode === 'hourly' ? mw.hourly : EXAMPLE.monthly);
    var out = '<div class="slip-h"><b>' + TH.slip + '</b><span class="asof"><i></i>' + TH.asOf(y) + '</span></div>', r, read = fld.read;
    function fail(msg) {
      out += '<div class="sum"><p class="sum-l"><span>' + (mode === 'hourly' ? TH.headH : TH.headM) + '</span></p><p class="sum-n none">' + TH.dash + '</p><p class="sum-y err">' + msg + '</p></div>';
      return { ok: false, mode: mode, example: false, read: fld.invalid ? fld.read : { cls: 'err', html: msg }, unit: fld.unit, invalid: fld.invalid, hoursBad: hoursBad, slip: out, value: 'x', live: msg };
    }
    /* 근로시간을 못 읽으면 40시간으로 바꿔 계산하지 않고 알린다 */
    if (hoursBad) return fail(TH.errs.hours);
    if (mode === 'hourly') {
      r = P.hourlyToPay({ hourly: amount, weeklyHours: h, period: pid });
      if (!r.ok) return fail(TH.errs[r.code] || TH.errs['too-large']);
      var w = r.weekly, m = r.monthlyHours;
      out += '<div class="sum"><p class="sum-l"><span>' + TH.headH + '</span>' + (example ? tag('tag-ex', TH.exH(amount, y)) : '') + '</p>' +
        '<p class="sum-n"><span class="dbl">' + (EN ? '<small class="cur">₩</small>' : '') + '<b class="num" data-net>' + f(r.monthly) + '</b>' + (EN ? '' : '<small>원</small>') + '</span></p>' +
        '<p class="sum-y mw ' + (r.minWage.diff < 0 ? 'under' : '') + '">' + (r.minWage.diff === 0 ? TH.mwSame(y, mw.hourly) : r.minWage.diff > 0 ? TH.mwOver(y, mw.hourly, r.minWage.diff) : TH.mwUnder(y, mw.hourly, -r.minWage.diff)) + '</p></div>';
      out += '<div class="ln"><span>' + TH.wage + '</span><span class="num">' + won(r.hourly) + '</span></div>';
      out += '<div class="ln"><span>' + TH.hours + '</span><span class="num">' + TH.hUnit(h100(w.hours100)) + '</span></div>';
      out += '<div class="ln"><span>' + TH.paidH + (w.eligible ? '<small class="sub2 num">' + TH.paidF(h100(w.counted100), D.hourly.fullWeekHours, D.hourly.fullDayHours) + '</small>' : '') + '</span><span class="num">' + TH.hUnit(h1000(w.paid1000)) + '</span></div>';
      out += '<div class="ln hl"><span>' + TH.holiday + (TH.holidayKo ? ' ' + ko(TH.holidayKo) : '') + '</span><span class="num">' + won(w.pay) + '</span></div>';
      if (!w.eligible) out += '<p class="ex-note">' + TH.none + '</p>';
      if (w.over40) out += '<p class="ex-note">' + TH.over + '</p>';
      out += '<div class="ln"><span>' + TH.week + '<small class="sub2 num">' + won(r.weeklyBase) + ' + ' + won(w.pay) + '</small></span><span class="num">' + won(r.weeklyTotal) + '</span></div>';
      out += '<div class="ln"><span>' + TH.mh + '<small class="sub2 num">' + (m.official ? TH.mhOfficial : TH.mhF(h100(w.counted100), h1000(w.paid1000))) + '</small></span><span class="num">' + TH.hUnit(mhText(m)) + '</span></div>';
      out += '<div class="ln tot"><span>' + TH.monthly + ' <small>' + TH.monthlyF + '</small></span><span class="num">' + won(r.monthly) + '</span></div>';
      return { ok: true, mode: mode, example: example, read: read, unit: fld.unit, invalid: fld.invalid, hoursBad: false, slip: out, value: r.monthly, live: fld.invalid ? fld.read.html : TH.headH + ' ' + won(r.monthly) };
    }
    r = P.monthlyToHourly({ monthly: amount, weeklyHours: h, period: pid });
    if (!r.ok) return fail(TH.errs[r.code] || TH.errs['too-large']);
    var mh = r.monthlyHours, wk = P.weeklyHoliday({ hourly: r.hourly, weeklyHours: h });
    /* 최저임금과는 시급끼리 견준다(월급 → 시급으로 바꿔서). 이 근로시간의 최저임금 월 환산액은 아래 줄에 따로 보여 준다 */
    out += '<div class="sum"><p class="sum-l"><span>' + TH.headM + '</span>' + (example ? tag('tag-ex', TH.exM(amount)) : '') + '</p>' +
      '<p class="sum-n"><span class="dbl">' + (EN ? '<small class="cur">₩</small>' : '') + '<b class="num" data-net>' + f(r.hourly) + '</b>' + (EN ? '<small>' + TH.perHour + '</small>' : '<small>원</small>') + '</span></p>' +
      '<p class="sum-y mw ' + (r.minWage.diff < 0 ? 'under' : '') + '">' + (r.minWage.diff === 0 ? TH.mwSame(y, mw.hourly) : r.minWage.diff > 0 ? TH.mwOver(y, mw.hourly, r.minWage.diff) : TH.mwUnder(y, mw.hourly, -r.minWage.diff)) + '</p></div>';
    out += '<div class="ln"><span>' + TH.mPay + '</span><span class="num">' + won(r.monthly) + '</span></div>';
    out += '<div class="ln"><span>' + TH.hours + '</span><span class="num">' + TH.hUnit(h100(wk.hours100)) + '</span></div>';
    out += '<div class="ln"><span>' + TH.mh + '<small class="sub2 num">' + (mh.official ? TH.mhOfficial : TH.mhF(h100(wk.counted100), h1000(wk.paid1000))) + '</small></span><span class="num">' + TH.hUnit(mhText(mh)) + '</span></div>';
    out += '<div class="ln"><span>' + TH.mNeed(y) + '<small class="sub2 num">' + TH.mNeedF + '</small></span><span class="num">' + won(r.minWage.monthly) + '</span></div>';
    out += '<div class="ln tot"><span>' + TH.mHourly + ' <small>' + TH.mHourlyF(mhText(mh)) + '</small></span><span class="num">' + won(r.hourly) + '</span></div>';
    return { ok: true, mode: mode, example: example, read: read, unit: fld.unit, invalid: fld.invalid, hoursBad: false, slip: out, value: r.hourly, live: fld.invalid ? fld.read.html : TH.headM + ' ' + won(r.hourly) };
  }

  /* ───────── 4. 실업급여(구직급여). 한국어판만 ───────── */
  var U = D.unemployment;
  var TB = U.tenureBands, BAND_YEARS = [0].concat(TB);
  var BANDS = [TB[0] + '년 미만'].concat(TB.slice(0, -1).map(function (b, i) { return b + '년 이상 ' + TB[i + 1] + '년 미만'; }), [TB[TB.length - 1] + '년 이상']);
  var UB_EX = { leave: '2026-09-30', wages: 9000000, hours: U.maxDayHours, band: 2, over50: false };
  /* st: { leave, wages, hours, band, over50, touched } . 금액은 로직이 정수로 한 번에 계산한다(임금 × 60 ÷ (날짜 수 × 100)).
     화면에 보이는 숫자끼리 다시 계산해도 맞게, 평균임금의 60%는 '임금 × 60% ÷ 날짜 수'라고 식을 보여 준다(버린 평균임금에 60%를 곱한 값이 아니다) */
  function ub(st) {
    var example = !st.touched, leave = example ? UB_EX.leave : st.leave, hours = example ? UB_EX.hours : +st.hours, band = example ? UB_EX.band : +st.band, over50 = example ? UB_EX.over50 : !!st.over50, err = null;
    var w = example ? { ok: true, empty: false, value: UB_EX.wages, invalid: false } : field(st.wages, 'wages3m', { optional: true, errs: TS.fe });
    var ld = P.parseDate(leave), r = null, bad = {};
    if (ld === null) { err = '이직일을 넣어 주세요.'; bad.leave = true; }
    else if (!w.ok) err = w.code === 'negative' ? '0보다 작은 금액은 계산하지 않아요.' : '금액을 읽지 못했어요.';
    else if (w.empty || !w.value) { err = '퇴직 전 3개월 동안 받은 임금을 넣어 주세요.'; bad.wages = true; }
    if (!err) {
      r = P.unemployment({ wages3m: w.value, dayHours: hours, leave: leave, tenureYears: BAND_YEARS[band], over50: over50 });
      if (!r.ok) {
        bad.leave = r.code === 'before-range' || r.code === 'after-range';
        err = r.code === 'before-range' ? D.periods[NOW].year + '년 1월 1일보다 앞선 이직은 상·하한액이 달라서 계산하지 않아요.'
          : r.code === 'after-range' ? date(U.change2028) + '부터는 구직급여를 계산하는 기준이 바뀔 예정이라 그 뒤의 이직은 계산하지 않아요.'
          : r.code === 'too-large' ? '이 계산기가 다루는 범위를 넘는 금액이에요.' : '입력을 확인해 주세요.';
      }
    }
    /* nextY: 다음 해 이직(하한은 그 해 최저임금으로 확정, 상한은 미정). least: 그 가운데 새 상한에 따라 더 받을 수도 있는 사람(금액·합계를 '최소'로 보여 준다) */
    var year = r && r.ok ? r.year : D.periods[NOW].year, nextY = !!(r && r.ok && r.upperStatus === 'undecided'), least = !!(r && r.ok && r.atLeast);
    var h = '<div class="slip-h"><b>구직급여 계산서</b><span class="asof"><i></i>' + year + '년 이직 기준' + (nextY ? '(상한 미정)' : '') + '</span></div>';
    if (err) {
      h += '<div class="sum"><p class="sum-l"><span>하루 구직급여</span></p><p class="sum-n none">입력을 확인해 주세요</p><p class="sum-y err">' + err + '</p></div>';
      return { ok: false, example: example, slip: h, live: err, field: w, bad: bad };
    }
    var Y = r.year + '년', kind;
    if (least) kind = r.kind === 'lower' ? Y + ' 하한액이에요. ' + Y + ' 상한액이 정해지면 더 받을 수도 있어요.' : Y0 + '년 상한액으로 계산했어요. ' + Y + ' 상한액이 정해지면 더 받을 수도 있어요.';
    else kind = r.kind === 'lower' ? '하한액이 더 커서 하한액으로 받아요.' : r.kind === 'upper' ? '평균임금이 상한(' + f(U.baseMax) + '원)을 넘어서 상한액으로 받아요.' : '평균임금의 ' + U.rateNum + '%로 받아요.';
    h += '<div class="sum"><p class="sum-l"><span>하루 구직급여' + (least ? '(최소)' : '') + '</span>' + (example ? tag('tag-ex', '예시 · 3개월 임금 ' + P.readKo(UB_EX.wages)) : '') + '</p>' +
      '<p class="sum-n"><span class="dbl"><b class="num" data-net>' + f(r.daily) + '</b><small>원</small></span></p><p class="sum-y">' + kind + '</p></div>';
    /* 2027년 이직: 하한은 확정(2027년 최저임금), 상한은 미정. 하한이 지금 상한보다 크면 그 사실을 그대로 보여 준다(누구에게나 맞는 말이라 늘 보여 준다) */
    if (nextY) h += '<p class="ex-note hold">' + Y + ' 이직은 하루 최소 ' + f(r.lower) + '원이에요(하루 ' + h100(r.hours100) + '시간 기준, ' + Y + ' 최저임금 ' + f(r.minWageHourly) + '원의 ' + U.lowerNum + '%).' +
      (r.lowerOverUpper ? ' ' + Y0 + '년 상한액 ' + f(r.upper) + '원보다 커요.' : '') + ' ' + Y + ' 상한액은 아직 정해지지 않았어요.</p>';
    h += '<div class="ln"><span>1일 평균임금<small class="sub2 num">' + f(r.wages3m) + '원 ÷ ' + r.periodDays + '일, 원 미만 버림</small></span><span class="num">' + f(r.avgFloor) + '원</span></div>';
    h += '<div class="ln"><span>평균임금의 ' + U.rateNum + '%<small class="sub2 num">' + (r.capped ? '평균임금은 ' + f(U.baseMax) + '원까지만 쳐요: ' + f(U.baseMax) + '원 × ' + U.rateNum + '%' : f(r.wages3m) + '원 × ' + U.rateNum + '% ÷ ' + r.periodDays + '일, 원 미만 버림') + '</small></span><span class="num">' + f(r.byRate) + '원</span></div>';
    h += '<div class="ln"><span>하한액' + (nextY ? ' ' + tag('tag-st', '확정') : '') + '<small class="sub2 num">1일 ' + h100(r.hours100) + '시간 × ' + Y + ' 최저임금 ' + f(r.minWageHourly) + '원 × ' + U.lowerNum + '%</small></span><span class="num">' + f(r.lower) + '원</span></div>';
    if (nextY) h += '<div class="ln"><span>상한액 ' + tag('tag-hold', '미정') + '<small class="sub2 num">' + Y0 + '년 이직은 ' + f(r.upper) + '원</small></span><span class="num">아직 없어요</span></div>';
    else h += '<div class="ln"><span>상한액</span><span class="num">' + f(r.upper) + '원</span></div>';
    h += '<div class="ln hl"><span>받는 날 수(소정급여일수)<small class="sub2">' + (r.over50 ? U.ageSplit + '세 이상' : U.ageSplit + '세 미만') + ', 가입 ' + BANDS[r.band] + '</small></span><span class="num">' + r.days + '일</span></div>';
    h += '<div class="ln"><span>30일치' + (least ? '(최소)' : '') + '</span><span class="num">' + f(r.monthly30) + '원</span></div>';
    h += '<div class="ln tot"><span>받는 날을 다 채우면' + (least ? '(최소)' : '') + ' <small>하루 금액 × ' + r.days + '일</small></span><span class="num">' + f(r.total) + '원</span></div>';
    return { ok: true, example: example, res: r, slip: h, value: r.daily, live: '하루 구직급여 ' + (least ? '최소 ' : '') + f(r.daily) + '원, ' + r.days + '일', field: w, bad: bad };
  }

  /* ───────── 5. 연차. 한국어판만 ───────── */
  /* st: { join, asOf } . join 이 없으면 근속 연수별 표만 */
  function leave(st) {
    var L = D.leave, has = st.join && P.parseDate(st.join) !== null, r = has ? P.annualLeave({ join: st.join, years: 25, asOf: st.asOf || undefined }) : null, h = '', sumHtml, liveTxt;
    if (has && r && !r.ok && r.code === 'date-order') r = P.annualLeave({ join: st.join, years: 25 });
    h += '<div class="slip-h"><b>연차 계산서</b><span class="asof">입사일 기준</span></div>';
    if (st.join && !has) {
      h += '<div class="sum"><p class="sum-l"><span>지금 쓸 수 있게 생긴 연차</span></p><p class="sum-n none">입력을 확인해 주세요</p><p class="sum-y err">입사일을 다시 넣어 주세요.</p></div>';
      liveTxt = '입사일을 다시 넣어 주세요.';
    } else if (has && r.asOf) {
      var a = r.asOf, first = a.yearsDone === 0;
      sumHtml = '<p class="sum-l"><span>' + (first ? '입사 첫해에 지금까지 생긴 연차' : '가장 최근에 생긴 연차') + '</span></p><p class="sum-n"><span class="dbl"><b class="num" data-net>' + a.current + '</b><small>일</small></span></p>' +
        '<p class="sum-y">' + date(a.date) + ' 기준, ' + (first ? '만 ' + a.monthsDone + '개월' : '만 ' + a.yearsDone + '년') + ' 근무. 다음은 ' + date(a.next.date) + '에 <b>' + a.next.days + '일</b>이 생겨요.</p>';
      h += '<div class="sum">' + sumHtml + '</div>';
      liveTxt = '연차 ' + a.current + '일, 다음은 ' + date(a.next.date) + '에 ' + a.next.days + '일';
    } else {
      h += '<div class="sum"><p class="sum-l"><span>1년을 채우면 생기는 연차</span>' + (has ? '' : tag('tag-ex', '입사일을 넣으면 날짜가 나와요')) + '</p><p class="sum-n"><span class="dbl"><b class="num" data-net>' + L.base + '</b><small>일</small></span></p>' +
        '<p class="sum-y">1년 미만은 한 달 개근할 때마다 1일씩, 많아야 ' + L.firstYearMax + '일이에요.</p></div>';
      liveTxt = '';
    }
    if (has && r.ok) {
      h += '<table class="lv"><thead><tr><th scope="col">근속</th><th scope="col">생기는 날</th><th scope="col">일수</th><th scope="col">이날까지 써요</th></tr></thead><tbody>';
      h += '<tr><th scope="row">첫해</th><td class="num">' + r.monthly[0].date + '부터 다달이</td><td class="num">1일씩(최대 ' + L.firstYearMax + '일)</td><td class="num">' + r.monthly[0].useBy + '</td></tr>';
      r.rows.forEach(function (x) {
        var cur = r.asOf && r.asOf.yearsDone === x.yearsDone;
        h += '<tr' + (cur ? ' class="me"' : '') + '><th scope="row">만 ' + x.yearsDone + '년' + (cur ? ' ' + tag('tag-me', '지금') : '') + '</th><td class="num">' + x.date + '</td><td class="num">' + x.days + '일</td><td class="num">' + x.useBy + '</td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<table class="lv"><thead><tr><th scope="col">근속</th><th scope="col">생기는 연차</th></tr></thead><tbody><tr><th scope="row">1년 미만</th><td class="num">한 달 개근마다 1일(최대 ' + L.firstYearMax + '일)</td></tr>';
      var n = 1;
      while (n <= 25) {
        var d = P.leaveDaysAfterYears(n), m = n;
        while (m < 25 && P.leaveDaysAfterYears(m + 1) === d) m++;
        h += '<tr><th scope="row">' + (m === n ? '만 ' + n + '년' : d === L.cap ? '만 ' + n + '년부터' : '만 ' + n + '~' + m + '년') + '</th><td class="num">' + d + '일</td></tr>';
        n = m + 1;
      }
      h += '</tbody></table>';
    }
    return { ok: true, slip: h, live: liveTxt };
  }

  /* 기준 기간이 지났을 때 결과 위에 띄우는 한 줄. newer: 더 새 기준이 이미 있어 골라 볼 수 있을 때 */
  function staleText(year, newer) {
    if (newer) return EN ? 'You are viewing the previous rules (' + year + ').' : '지난 기준(' + year + '년)으로 보고 있어요.';
    return EN ? 'These figures are the ' + year + ' rules. We are checking the new ones.' : '이 값은 ' + year + '년 기준이에요. 새 기준을 확인 중이에요.';
  }
  /* 구직급여: 다음 해(하한만 확정)로 넘어갔을 때 */
  function ubStaleText(next) {
    var NX = U.next;
    return next ? NX.year + '년 상한액은 아직 정해지지 않았어요. ' + NX.year + '년 이직은 하한액만 ' + NX.year + '년 값으로 계산해요.' : staleText(NX ? NX.year : Y0, false);
  }

  return { lang: LANG, T: T, EXAMPLE: EXAMPLE, STEP: STEP, UB_EX: UB_EX, BANDS: BANDS, UNIT: UNIT,
    won: won, neg: neg, read: read, date: date, name: name, plain: plain, periodShort: periodShort, periodLabel: periodLabel,
    field: field, amountText: amountText, staleText: staleText, ubStaleText: ubStaleText,
    net: net, netCalc: netCalc, netChanged: netChanged, netLive: netLive, sev: sev, hourly: hourly, ub: ub, leave: leave };
});
