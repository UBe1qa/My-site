/* 급여 계산 자료: 요율·상하한·최저임금·구직급여 표와 그 출처.
   해가 바뀌면 이 파일(과 gani-<연도>.js)만 고친다. 계산 로직(pay-core.js)에는 숫자를 두지 않는다.
   값마다 출처(src → SOURCES), 시행일(from), 확인한 날(SOURCES의 viewed)을 같이 둔다. 화면의 '근거' 칸이 여기서 나온다.
   status: 'fixed' 법령·고시로 확정 / 'resolved' 의결됐고 확정 절차가 남았을 수 있음 / 'carried' 다음 해 값이 아직 안 나와 지금 값을 그대로 씀. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PAY_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var V = '2026-10-10';
  var SOURCES = {
    npsLaw: { name: '국민연금법 제88조, 부칙(법률 제20903호) 제4조', url: 'https://www.law.go.kr/법령/국민연금법', viewed: V },
    npsGuide: { name: '국민연금공단 「보험료 금액 및 보험료율」', url: 'https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0038M0.do', viewed: V },
    nhisRate: { name: '국민건강보험공단 「2026년도 보험료율 인상 안내」', url: 'https://edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html', viewed: V },
    nhisLimit: { name: '월별 건강보험료액의 상한과 하한에 관한 고시(보건복지부고시 제2025-222호)', url: 'https://www.law.go.kr/행정규칙/월별건강보험료액의상한과하한에관한고시', viewed: V },
    mohw2027: { date: '2026-09-08', name: '보건복지부 보도자료(2026-09-08) 2027년도 건강보험료율', url: 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1491824', viewed: V },
    mohwCare2027: { date: '2026-08-14', name: '보건복지부 보도자료(2026-08-14) 2027년 장기요양보험료율 결정 일정', url: 'https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1491601', viewed: V },
    eiRateDecree: { name: '고용산재보험료징수법 시행령 제12조', url: 'https://www.law.go.kr/법령/고용보험및산업재해보상보험의보험료징수등에관한법률시행령/제12조', viewed: V },
    eiRateLaw: { name: '고용산재보험료징수법 제13조', url: 'https://www.law.go.kr/법령/고용보험및산업재해보상보험의보험료징수등에관한법률/제13조', viewed: V },
    gani: { name: '소득세법 시행령 별표 2 근로소득 간이세액표', url: 'https://www.law.go.kr/법령별표서식/(소득세법시행령,별표2)', viewed: V },
    ganiRatio: { name: '소득세법 시행령 제194조', url: 'https://www.law.go.kr/법령/소득세법시행령', viewed: V },
    localTax: { name: '지방세법 제103조의13', url: 'https://www.law.go.kr/법령/지방세법/제103조의13', viewed: V },
    meal: { name: '소득세법 제12조 제3호 러목', url: 'https://www.law.go.kr/법령/소득세법/제12조', viewed: V },
    minWage: { name: '최저임금위원회 「연도별 최저임금 결정현황」', url: 'https://www.minimumwage.go.kr/minWage/policy/decisionMain.do', viewed: V },
    minWageNotice2027: { name: '2027년 적용 최저임금 고시(고용노동부고시 제2026-60호)', url: 'https://www.moel.go.kr/common/downloadFile.do?file_seq=20260800249&bbs_seq=20260800150&bbs_id=19&file_ext=pdf', viewed: V },
    minWageDecree5: { name: '최저임금법 시행령 제5조', url: 'https://www.law.go.kr/법령/최저임금법시행령/제5조', viewed: V },
    sevLaw4: { name: '근로자퇴직급여 보장법 제4조', url: 'https://www.law.go.kr/법령/근로자퇴직급여보장법/제4조', viewed: V },
    sevLaw8: { name: '근로자퇴직급여 보장법 제8조', url: 'https://www.law.go.kr/법령/근로자퇴직급여보장법/제8조', viewed: V },
    sevLaw9: { name: '근로자퇴직급여 보장법 제9조', url: 'https://www.law.go.kr/법령/근로자퇴직급여보장법/제9조', viewed: V },
    lsa2: { name: '근로기준법 제2조', url: 'https://www.law.go.kr/법령/근로기준법/제2조', viewed: V },
    lsa11: { name: '근로기준법 제11조, 시행령 별표 1', url: 'https://www.law.go.kr/법령별표서식/(근로기준법시행령,별표1)', viewed: V },
    lsa18: { name: '근로기준법 제18조', url: 'https://www.law.go.kr/법령/근로기준법/제18조', viewed: V },
    lsa55: { name: '근로기준법 제55조, 시행령 제30조', url: 'https://www.law.go.kr/법령/근로기준법/제55조', viewed: V },
    lsa60: { name: '근로기준법 제60조', url: 'https://www.law.go.kr/법령/근로기준법/제60조', viewed: V },
    lsaDecreeT2: { name: '근로기준법 시행령 별표 2', url: 'https://www.law.go.kr/법령별표서식/(근로기준법시행령,별표2)', viewed: V },
    moelSev: { name: '고용노동부 「퇴직금 계산」', url: 'https://www.moel.go.kr/retirementpayCal.do', viewed: V },
    moel1350Weekly: { name: '고용노동부 1350 상담 답변(주휴수당)', url: 'https://1350.moel.go.kr/rtmview.do?id=1000059852', viewed: V },
    eiLaw: { name: '고용보험법 제40조·제45조·제46조·제49조', url: 'https://www.law.go.kr/법령/고용보험법', viewed: V },
    eiDecree68: { name: '고용보험법 시행령 제68조', url: 'https://www.law.go.kr/법령/고용보험법시행령/제68조', viewed: V },
    eiTable1: { name: '고용보험법 별표 1 구직급여의 소정급여일수', url: 'https://www.law.go.kr/법령별표서식/(고용보험법,별표1)', viewed: V },
    moel1350Ub: { name: '고용노동부 1350 상담 답변(구직급여 상·하한액)', url: 'https://1350.moel.go.kr/rtmview.do?id=1000324861', viewed: V },
    treasury47: { name: '국고금관리법 제47조(국고금의 끝수 계산)', url: 'https://www.law.go.kr/법령/국고금관리법/제47조', viewed: V },
    nhisDecree33: { name: '국민건강보험법 시행령 제33조(보수에 포함되는 금품 등)', url: 'https://www.law.go.kr/법령/국민건강보험법시행령/제33조', viewed: V },
    npsDecree3: { name: '국민연금법 시행령 제3조', url: 'https://www.law.go.kr/법령/국민연금법시행령/제3조', viewed: V },
    eiLaw2: { name: '고용산재보험료징수법 제2조', url: 'https://www.law.go.kr/법령/고용보험및산업재해보상보험의보험료징수등에관한법률/제2조', viewed: V },
    lsaDecree30: { name: '근로기준법 시행령 제30조', url: 'https://www.law.go.kr/법령/근로기준법시행령/제30조', viewed: V }
  };

  /* 원 단위 처리(버림 단위): 1 = 원 미만만 버림, 10 = 10원 미만 버림.
     2026-10-10 결정: 보험료 4종·소득세·지방소득세를 각각 10원 미만 버림으로 계산한다. 국고금관리법 제47조의 끝수 계산 방식을 따른
     '이 계산기의 방식'이다(verified: 'own'). 공단·회사가 이렇게 계산한다는 문장을 확인한 것은 아니므로 화면에도 우리 방식이라고 밝힌다. */
  var ROUNDING = {
    verified: 'own', src: ['treasury47'], decided: V,
    pension: 10, health: 10, care: 10, employment: 10, incomeTax: 10, localTax: 10
  };

  /* 기준 시기. 화면은 '지금'(now)과 '다음에 바뀌는 때'(next) 둘만 보여 준다. */
  var PERIODS = {
    '2026-10': {
      label: { ko: '2026년 10월', en: 'October 2026' },
      year: 2026,
      pension: {
        rateNum: 475, rateDen: 10000, ratePct: '4.75', status: 'fixed', src: ['npsLaw', 'npsGuide'], from: '2026-01-01', until: '2026-12-31',
        baseMin: 410000, baseMax: 6590000, baseUnit: 1000, limitStatus: 'fixed', limitSrc: ['npsGuide'], limitFrom: '2026-07-01', limitUntil: '2027-06-30'
      },
      health: {
        rateNum: 3595, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'fixed', src: ['nhisRate'], from: '2026-01-01',
        /* 고시의 상·하한은 가입자 + 사용자 합계 금액이다. 근로자 몫은 그 절반. */
        totalMin: 20160, totalMax: 9183480, employeeMin: 10080, employeeMax: 4591740, limitStatus: 'fixed', limitSrc: ['nhisLimit'], limitFrom: '2026-01-01'
      },
      /* 장기요양보험료 = 건강보험료 × 0.9448% ÷ 7.19% (공단 식 그대로. 13.14%로 줄여 곱하지 않는다) */
      care: { num: 9448, den: 71900, ratePct: '0.9448', healthPct: '7.19', status: 'fixed', src: ['nhisRate'], from: '2026-01-01' },
      employment: { rateNum: 9, rateDen: 1000, ratePct: '0.9', status: 'fixed', src: ['eiRateDecree', 'eiRateLaw'] },
      incomeTax: { table: 'gani-2026', effective: '2026-03-01', status: 'fixed', src: ['gani', 'ganiRatio'] },
      localTax: { rateNum: 10, rateDen: 100, ratePct: '10', status: 'fixed', src: ['localTax'] },
      minWage: { hourly: 10320, daily8: 82560, monthly209: 2156880, status: 'fixed', src: ['minWage'], from: '2026-01-01', until: '2026-12-31' }
    },
    '2027-01': {
      label: { ko: '2027년 1월(예정)', en: 'January 2027 (planned)' },
      year: 2027,
      pension: {
        rateNum: 500, rateDen: 10000, ratePct: '5.0', status: 'fixed', src: ['npsLaw'], from: '2027-01-01', until: '2027-12-31',
        baseMin: 410000, baseMax: 6590000, baseUnit: 1000, limitStatus: 'fixed', limitSrc: ['npsGuide'], limitFrom: '2026-07-01', limitUntil: '2027-06-30'
      },
      health: {
        rateNum: 3595, rateDen: 100000, ratePct: '3.595', totalPct: '7.19', status: 'resolved', src: ['mohw2027'], from: '2027-01-01',
        totalMin: 20160, totalMax: 9183480, employeeMin: 10080, employeeMax: 4591740, limitStatus: 'carried', limitSrc: ['nhisLimit'], limitFrom: '2026-01-01'
      },
      care: { num: 9448, den: 71900, ratePct: '0.9448', healthPct: '7.19', status: 'carried', src: ['nhisRate', 'mohwCare2027'], from: '2026-01-01' },
      employment: { rateNum: 9, rateDen: 1000, ratePct: '0.9', status: 'carried', src: ['eiRateDecree', 'eiRateLaw'] },
      incomeTax: { table: 'gani-2026', effective: '2026-03-01', status: 'carried', src: ['gani', 'ganiRatio'] },
      localTax: { rateNum: 10, rateDen: 100, ratePct: '10', status: 'fixed', src: ['localTax'] },
      minWage: { hourly: 10700, daily8: 85600, monthly209: 2236300, status: 'fixed', src: ['minWage', 'minWageNotice2027'], from: '2027-01-01', until: '2027-12-31' }
    }
  };

  /* 국민연금 근로자 몫 요율: 부칙(법률 제20903호) 제4조와 제88조 제3항에 이미 정해져 있다 */
  var PENSION_SCHEDULE = { src: ['npsLaw'], rows: [
    { year: 2026, pct: '4.75' }, { year: 2027, pct: '5.0' }, { year: 2028, pct: '5.25' }, { year: 2029, pct: '5.5' },
    { year: 2030, pct: '5.75' }, { year: 2031, pct: '6.0' }, { year: 2032, pct: '6.25' }, { year: 2033, pct: '6.5' }
  ] };

  return {
    checked: V,
    pensionSchedule: PENSION_SCHEDULE,
    now: '2026-10',
    next: '2027-01',
    sources: SOURCES,
    rounding: ROUNDING,
    periods: PERIODS,

    /* 실수령액 계산의 기본값과 지원 범위 */
    net: {
      nontaxMeal: 200000, nontaxSrc: ['meal'],
      /* 간이세액표 주석 3: 공제대상가족 가운데 8세 이상 20세 이하 자녀 */
      childAgeFrom: 8, childAgeTo: 20,
      /* 보험료를 매기는 소득에서 비과세 근로소득을 빼는 근거. 고용보험은 법 문장(제2조 제3호)까지만 확인했다. */
      baseSrc: { pension: ['npsDecree3'], health: ['nhisDecree33'], employment: ['eiLaw2'] },
      /* 65세 이후에 새로 고용된 사람은 고용보험료(실업급여분)를 떼지 않는다(징수법 제13조 제3항) */
      employmentExemptAge: 65, employmentExemptSrc: ['eiRateLaw'],
      ratios: [80, 100, 120], ratioSrc: ['ganiRatio'],
      maxMonthly: 1000000000,
      maxFamily: 30
    },

    /* 시급·주휴수당 */
    hourly: {
      fullWeekHours: 40, fullDayHours: 8, minWeekHours: 15,
      /* 주 40시간 + 유급 주휴 8시간의 월 환산 기준시간(고시 원문 값) */
      monthlyHours40: 209,
      src: { weekly: ['lsa55', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly'], monthly: ['minWageNotice2027', 'minWageDecree5'], minWage: ['minWage'] }
    },

    /* 퇴직금 */
    severance: {
      daysPerYear: 365, payDays: 30, minWeekHours: 15, payWithinDays: 14,
      /* 퇴직 전 3개월의 달력 날짜 수는 달에 따라 89~92일 */
      periodDaysMin: 89, periodDaysMax: 92,
      src: { amount: ['sevLaw8', 'moelSev'], eligible: ['sevLaw4'], avgWage: ['lsa2'], payBy: ['sevLaw9'] },
      /* 고용노동부 예제. 공식 값은 1일 평균임금 88,641원 31전까지다(최종 퇴직금은 그 화면에 없다). */
      example: {
        src: ['moelSev'], join: '2014-10-02', leave: '2017-09-16', serviceDays: 1080, periodDays: 92,
        monthlyBase: 2000000, monthlyAllowance: 360000, wages3m: 7080000,
        annualBonus: 4000000, bonusPart: 1000000, leaveUnit: 60000, leaveDays: 5, leavePay: 300000, leavePart: 75000,
        avgWon: 88641, avgJeon: 31
      }
    },

    /* 실업급여(구직급여). 상·하한은 이직일 기준. 이 표는 2026-01-01 이후 이직자용. */
    unemployment: {
      from: '2026-01-01', until: '2026-12-31',
      rateNum: 60, rateDen: 100, lowerNum: 80, lowerDen: 100,
      baseMax: 113500, upper: 68100, minWageHourly: 10320, maxDayHours: 8,
      lowerByHours: { 1: 8256, 2: 16512, 3: 24768, 4: 33024, 5: 41280, 6: 49536, 7: 57792, 8: 66048 },
      /* 소정급여일수: [피보험기간 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상] */
      days: { under50: [120, 150, 180, 210, 240], over50: [120, 180, 210, 240, 270] },
      tenureBands: [1, 3, 5, 10], ageSplit: 50,
      waitDays: 7, baseMonths: 18, needDays: 180,
      src: { rate: ['eiLaw'], upper: ['eiDecree68', 'moel1350Ub'], lower: ['moel1350Ub'], days: ['eiTable1'], need: ['eiLaw'] },
      next: { year: 2027, upperStatus: 'undecided', minWageHourly: 10700 },
      change2028: '2028-01-01'
    },

    /* 연차 유급휴가 */
    leave: {
      firstYearMax: 11, base: 15, cap: 25, addEveryYears: 2, minWeekHours: 15, minWorkers: 5, attendPct: 80, addFromYears: 3,
      src: { main: ['lsa60'], exclude: ['lsa18', 'lsa11'] }
    }
  };
});
