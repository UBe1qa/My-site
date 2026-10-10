"""가이드 글. 한국어 6편, 영어 3편(번역이 아니라 언어판마다 고른 주제. 같은 질문에 답하는 한 쌍만 pair 로 잇는다).

- 숫자는 손으로 적지 않는다: ctx.py 의 D(자료 파일)·F(로직으로 계산한 값)·G(간이세액표)에서 꺼낸다. tests/site.mjs 가 만든 글의 숫자를 다시 검산한다.
- 법령·공단 문장은 ctx.Q(원문 그대로)만 인용한다. 원문에 없는 풀이는 "계산하면", "풀면"이라고 밝힌다.
- 확인하지 못한 사실(외국인 단일세율, 수급 제한 사유, 2027년 미정 값 등)은 쓰지 않는다.
"""
from ctx import *  # noqa: F401,F403
from texts import table, kospan, mw_table, days_table, lower_table, N, R, H, SV, U, L, pen, hi, care, emp, mw0, mw1, CH, E, n4, P0_KO, P1_KO, P0_EN, P1_EN, EFF_KO, EFF_EN, HOLD_KO, HOLD_EN

m300, m300nt0, m700 = F['m300'], F['m300nt0'], F['m700']
fam, famKid, r80, r120 = F['fam'], F['famKid'], F['ratio80'], F['ratio120']
sv, ub, wk = F['sev'], F['ub'], {x['hours']: x for x in F['weekly']}
cmp4 = F['cmp4000']
SCHED = D['pensionSchedule']['rows']
LIMIT_FROM, LIMIT_UNTIL = date_ko(pen['limitFrom']), date_ko(pen['limitUntil'])
TAXABLE_EX = fam[0]['taxable']
FULL, DAYH, MINW, MH = H['fullWeekHours'], H['fullDayHours'], H['minWeekHours'], H['monthlyHours40']
WEEKS, WORKDAYS = 4, 5   # 근로기준법 시행령 별표 2의 '4주', 통상 근로자 주 5일(가정)
UB8 = U['lowerByHours']['8']


def li(*xs):
    return '<ul>' + ''.join(f'<li>{x}</li>' for x in xs) + '</ul>'


# ══════════ 한국어 ══════════
def ko_payslip():
    body = f'''<p class="lede">계산기는 이번 달 월급에 올해 요율을 그대로 곱해요. 실제 급여명세서는 회사와 공단에 등록된 값으로 계산돼서 아래 다섯 군데에서 차이가 나요. 위에서부터 차례로 맞춰 보면 대부분 어디서 달라졌는지 찾을 수 있어요.</p>
<h2>국민연금은 1년에 한 번 정한 소득으로 매겨요</h2>
<p>국민연금공단의 식은 {q('nps_formula')}이에요. 그런데 이 기준소득월액은 이번 달 월급이 아니에요.</p>
{quote('nps_once')}
<p>계산기는 이번 달 과세 대상 월급에서 천 원 미만을 버린 금액으로 계산해요. 월급이 오르거나 내린 해에는 명세서의 국민연금과 다를 수 있어요.</p>
<p>상한과 하한도 있어요. 국민연금을 매기는 월 소득은 <span class="nw">{man0(pen['baseMin'])}~{man(pen['baseMax'])}</span> 사이예요({LIMIT_FROM}~{LIMIT_UNTIL}). 월급이 {man(m700['gross'])}이어도 국민연금은 {man(pen['baseMax'])} × {pen['ratePct']}%인 {c(m700['line']['pension'])}원에서 멈춰요.</p>
<h2>비과세: 회사가 어떤 항목을 비과세로 넣었는지</h2>
<p>식사를 따로 제공받지 않는 사람이 받는 식대는 월 {man(N['nontaxMeal'])}까지 세금을 매기지 않아요.</p>
{quote('meal')}
<p>보험료를 매기는 소득에서도 비과세 근로소득을 빼요({src('npsDecree3')}, {src('nhisDecree33')}). 그래서 같은 월급이어도 비과세가 있는 사람은 떼는 돈이 적어요. 다만 일부 비과세 항목은 건강보험에서는 보수에 들어가요.</p>
<p class="calc">월급 {man(m300['gross'])}, 비과세 {man(m300['nontax'])} → 실수령액 <b>{c(m300['net'])}원</b><br>월급 {man(m300nt0['gross'])}, 비과세 없음 → 실수령액 <b>{c(m300nt0['net'])}원</b> ({c(F['m300diff'])}원 차이)</p>
<p>명세서에 식대 말고 다른 비과세 항목이 있으면 계산기의 비과세 금액을 그 합계로 바꿔 보세요.</p>
<h2>부양가족 수와 자녀</h2>
<p>소득세는 근로소득 간이세액표에서 월급 구간과 부양가족 수로 찾아요. 표의 주석은 이렇게 적어요. {q('gani_family')}</p>
<p>과세 대상 월급이 {man(TAXABLE_EX)}일 때 부양가족 수에 따른 소득세예요({EFF_KO} 시행 표).</p>
{table(['부양가족 수(본인 포함)', '한 달 소득세'], [(f'{x["family"]}명', f'{c(x["line"]["incomeTax"])}원') for x in fam] + [(f'{famKid["family"]}명, 그중 {N["childAgeFrom"]}~{N["childAgeTo"]}세 자녀 {famKid["children"]}명', f'{c(famKid["line"]["incomeTax"])}원')], cls='')}
<p>회사에 낸 부양가족 수가 계산기에 넣은 수와 다르면 소득세와 지방소득세가 이만큼 달라져요.</p>
<h2>세금 떼는 비율 {N['ratios'][0]}%·100%·{N['ratios'][2]}%</h2>
<p>회사에 신청하면 표 금액보다 덜 또는 더 뗄 수 있어요.</p>
{quote('gani_ratio')}
<p>같은 조건(과세 대상 월급 {man(TAXABLE_EX)}, 부양가족 1명)에서 100%면 {c(fam[0]['line']['incomeTax'])}원, {N['ratios'][0]}%면 {c(r80['line']['incomeTax'])}원, {N['ratios'][2]}%면 {c(r120['line']['incomeTax'])}원이에요. 매달 미리 떼는 금액이 달라지는 것이고, 연말정산에서 정산돼요.</p>
<h2>끝수: 몇십 원 차이</h2>
<p>이 계산기는 보험료와 세금의 {R['pension']}원 미만을 버려요({src('treasury47', text='국고금관리법 제47조')}의 끝수 계산 방식). 회사·공단의 계산과 몇십 원 다를 수 있어요.</p>
<h2>그래도 다르면 확인할 곳</h2>
{li('급여명세서의 비과세 금액과 과세 대상 금액', '국민연금공단에 정해져 있는 내 기준소득월액', '회사에 낸 부양가족 수, 세금 떼는 비율')}
<p>소득세는 매달 미리 떼는 금액이에요. 1년 치 세금은 연말정산에서 다시 계산돼요. 이 계산기는 연말정산 결과를 계산하지 않아요.</p>'''
    return dict(slug='myeongseseo-dareun-iyu', short='명세서와 계산기 금액이 다른 이유', h1='급여명세서 금액이 실수령액 계산기와 다른 이유',
                title='급여명세서와 실수령액 계산기 금액이 다른 이유 다섯 가지 | 떼고얼마',
                desc='국민연금은 1년에 한 번 정한 소득으로 매기고, 비과세·부양가족 수·세금 떼는 비율은 회사에 등록된 값을 써요. 차이가 나는 다섯 군데를 계산 예로 짚었어요.',
                body=body, sources=['npsGuide', 'meal', 'npsDecree3', 'nhisDecree33', 'gani', 'ganiRatio', 'treasury47'],
                try_=('내 조건으로 바꿔서 계산해 보세요.', '연봉 실수령액 계산기', ''), pair=None)


def ko_rates():
    rows = [
        ('국민연금', f'{pen["ratePct"]}%', f'{NXT["pension"]["ratePct"]}%', '확정(법 부칙)'),
        ('건강보험', f'{hi["ratePct"]}%', f'{NXT["health"]["ratePct"]}%', f'의결({date_ko(S["mohw2027"]["date"])})'),
        ('장기요양보험', f'건강보험료 × {care["ratePct"]}% ÷ {care["healthPct"]}%', HOLD_KO, f'{Y0}년 값으로 계산'),
        ('고용보험', f'{emp["ratePct"]}%', f'{NXT["employment"]["ratePct"]}%', '현행 시행령 요율'),
    ]
    by = [(man(x['annual']), f'{c(x["pensionNow"])}원', f'{c(x["pensionNext"])}원', f'{c(-x["diff"])}원') for x in F['cmpBy']]
    body = f'''<p class="lede">{Y0}년에 월급에서 떼는 근로자 몫은 국민연금 {pen['ratePct']}%, 건강보험 {hi['ratePct']}%, 고용보험 {emp['ratePct']}%이고, 장기요양보험료는 건강보험료에 {care['ratePct']}% ÷ {care['healthPct']}%를 곱해요. {P1_KO}에는 국민연금이 {NXT['pension']['ratePct']}%로 올라요. 건강보험료율은 그대로 두기로 의결됐고, 장기요양보험료율은 아직 정해지지 않았어요.</p>
{table(['항목', f'{Y0}년(근로자 몫)', P1_KO, '상태'], rows, cls='wide')}
<h2>국민연금: {SCHED[-1]['year']}년까지 해마다 올라요</h2>
{quote('nps_rise')}
<p>회사와 근로자가 절반씩 내니까 근로자 몫은 {SCHED[0]['year']}년 {SCHED[0]['pct']}%, {SCHED[1]['year']}년 {SCHED[1]['pct']}%예요. 그 뒤 요율도 법에 이미 적혀 있어요.</p>
{table(['연도'] + [str(r['year']) for r in SCHED], [('근로자 몫', *[r['pct'] + '%' for r in SCHED])], cls='wide')}
<p>국민연금을 매기는 월 소득에는 상한과 하한이 있어요. {LIMIT_FROM}부터 {LIMIT_UNTIL}까지는 <span class="nw">{man0(pen['baseMin'])}~{man(pen['baseMax'])}</span>이에요. 이 범위는 해마다 7월에 바뀌어요.</p>
<h2>건강보험: {NXT['health']['totalPct']}% 그대로</h2>
<p>{Y0}년 건강보험료율은 {hi['totalPct']}%이고 근로자는 그 절반인 {hi['ratePct']}%를 내요. 공단의 식은 {q('nhis_rate')}이에요.</p>
{quote('mohw2027')}
<p>한 달 보험료에는 상한과 하한이 있어요. {Y0}년 근로자 몫은 <span class="nw">{c(hi['employeeMin'])}원~</span><span class="nw">{c(hi['employeeMax'])}원</span>이에요(고시에 적힌 {c(hi['totalMin'])}원~{c(hi['totalMax'])}원은 회사 몫을 합친 금액). {Y1}년 상·하한은 아직 확인된 값이 없어요.</p>
<h2>장기요양보험: {Y1}년 요율은 미정</h2>
<p>공단의 식은 {q('care_formula')}이에요. {Y1}년 요율에 대해 보건복지부는 {date_ko(S['mohwCare2027']['date'])} 보도자료에서 이렇게 밝혔어요.</p>
{quote('care2027')}
<p>{date_ko(CHECKED)}까지 결정 발표를 확인하지 못했어요. 그래서 계산기는 {Y1}년 기준에서도 {Y0}년 값으로 계산하고 '미정'이라고 표시해요.</p>
<h2>고용보험: 근로자 몫 {emp['ratePct']}%</h2>
{quote('ei_half')}
<p>{N['employmentExemptAge']}세 이후에 새로 고용된 사람은 이 보험료를 떼지 않아요({src('eiRateLaw')}). {Y1}년에 요율이 바뀐다는 법령은 확인하지 못했어요. 계산기는 현행 시행령 요율로 계산해요.</p>
<h2>{P1_KO}에 내 실수령액은 얼마나 줄어드나</h2>
<p>확정된 변화는 국민연금 하나예요. 부양가족 1명, 비과세 {man(N['nontaxMeal'])} 조건으로 계산하면 이래요.</p>
{table(['연봉', f'국민연금({Y0}년)', f'국민연금({Y1}년)', '한 달에 줄어드는 금액'], by, cls='wide')}
<p>연봉 {man(F['cmpBy'][-1]['annual'])}처럼 월급이 상한을 넘으면 국민연금은 {man(pen['baseMax'])}을 기준으로만 올라요.</p>
<h2>최저임금</h2>
{mw_table('ko')}'''
    return dict(slug='2026-4dae-boheom-yoyul', short=f'{Y0}년 4대 보험 요율과 {Y1}년 변화', h1=f'{Y0}년 4대 보험 요율과 {Y1}년에 바뀌는 것',
                title=f'{Y0}년 4대 보험 요율과 {Y1}년에 바뀌는 것: 확정·의결·미정 | 떼고얼마',
                desc=f'{Y0}년 근로자 몫은 국민연금 {pen["ratePct"]}%, 건강보험 {hi["ratePct"]}%, 고용보험 {emp["ratePct"]}%예요. {Y1}년에는 국민연금이 {NXT["pension"]["ratePct"]}%로 오르고 장기요양보험료율은 아직 정해지지 않았어요.',
                body=body, sources=['npsLaw', 'npsGuide', 'nhisRate', 'nhisLimit', 'mohw2027', 'mohwCare2027', 'eiRateDecree', 'eiRateLaw', 'minWage'],
                try_=(f'{Y1}년 기준으로 바꿔 보면 달라지는 줄이 표시돼요.', '연봉 실수령액 계산기', ''), pair=None)


def ko_weekly():
    rows = [(f'주 {h}시간', f'{hrs(wk[h]["paidHours"])}시간' if wk[h]['eligible'] else '없음', f'{c(wk[h]["pay"])}원', f'{c(wk[h]["weeklyTotal"])}원') for h in (14, 15, 20, 30, 40, 45)]
    body = f'''<p class="lede">주휴수당은 하루치 임금이에요. 1일 소정근로시간에 시급을 곱해요. 4주 평균 주 {MINW}시간 이상 일하기로 했고 그 주의 소정근로일을 개근하면 생겨요. {Y0}년 최저임금 {c(mw0['hourly'])}원으로 주 {FULL}시간 일하면 한 주에 {c(wk[40]['pay'])}원이에요.</p>
<h2>누가 받나요</h2>
<p>근거는 근로기준법 제55조와 시행령 제30조예요.</p>
{quote('lsa55')}{quote('lsa30')}
<p>일하기로 정한 시간이 짧으면 적용되지 않아요.</p>
{quote('lsa18')}
<p>고용노동부 상담 답변은 조건을 이렇게 정리해요. {q('moel1350_when')} 지각이나 조퇴는 결근으로 치지 않아요.</p>
{quote('moel1350_late')}
<h2>얼마를 받나요</h2>
<p>근로기준법 시행령 별표 2는 단시간근로자의 하루 소정근로시간을 이렇게 정해요.</p>
{quote('decree_t2')}
<p>통상 근로자가 주 {WORKDAYS}일, {FULL}시간 일하는 사업장이라면 {WEEKS}주 소정근로일은 {WEEKS * WORKDAYS}일이에요. 이 방식으로 풀면 유급 주휴 시간 = 주 소정근로시간 × {WEEKS} ÷ {WEEKS * WORKDAYS} = 주 소정근로시간 ÷ {FULL} × {DAYH}이 돼요.</p>
<p class="calc">주휴수당 = 주 소정근로시간 ÷ {FULL} × {DAYH} × 시급<br>주 {wk[20]['hours']}시간, 시급 {c(mw0['hourly'])}원 → {hrs(wk[20]['paidHours'])}시간 × {c(mw0['hourly'])}원 = <b>{c(wk[20]['pay'])}원</b></p>
<p>{Y0}년 최저임금({c(mw0['hourly'])}원)으로 계산한 표예요.</p>
{table(['주 소정근로시간', '유급 주휴 시간', '주휴수당(한 주)', '주급(주휴수당 포함)'], rows, cls='wide')}
<h2>주 {FULL}시간을 넘게 일해도 {DAYH}시간분까지예요</h2>
{quote('moel1350_base')}
<p>소정근로시간은 주 {FULL}시간, 하루 {DAYH}시간 안에서 정하는 시간이라 주휴수당도 {DAYH}시간분이 끝이에요. 표에서 주 {wk[45]['hours']}시간과 주 {FULL}시간의 주휴수당이 같은 이유예요.</p>
<h2>작은 사업장도 주휴일은 적용돼요</h2>
<p>상시 {L['minWorkers'] - 1}명 이하 사업장에도 근로기준법 제55조 제1항(주휴일)은 적용돼요. 근로기준법 시행령 별표 1의 적용 조항에 들어 있어요.</p>
<h2>월급제는 이미 들어 있어요</h2>
<p>주 {FULL}시간 일하는 월급제의 월 환산 시간 {MH}시간에는 유급 주휴 {DAYH}시간이 들어 있어요. 어떻게 나온 숫자인지는 <a href="/guide/choejeoimgeum-209sigan/">최저임금 월급 환산의 {MH}시간</a>에 풀어 놨어요.</p>'''
    return dict(slug='juhyu-sudang-gyesan', short='주휴수당 계산법과 계산 예', h1=f'주휴수당 계산법: 주 {MINW}시간 기준과 시간별 계산 예',
                title=f'주휴수당 계산법: 주 {MINW}시간 기준, {Y0}년 최저임금으로 본 금액 | 떼고얼마',
                desc=f'주휴수당은 1일 소정근로시간 × 시급이에요. 주 {MINW}시간 이상 일하고 그 주를 개근하면 생겨요. {Y0}년 최저임금으로 주 {MINW}시간부터 {FULL}시간까지의 금액을 계산했어요.',
                body=body, sources=['lsa55', 'lsaDecree30', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly', 'lsa11', 'minWage'],
                try_=('내 시급과 근로시간으로 계산해 보세요.', '시급·주휴수당 계산기', 'hourly/'), pair=None)


def ko_severance():
    body = f'''<p class="lede">퇴직금은 1일 평균임금 × {SV['payDays']}일 × 재직일수 ÷ {SV['daysPerYear']}예요. 고용노동부 '퇴직금 계산' 화면의 예제를 그대로 따라가면 1일 평균임금은 {c(E['avgWon'])}원 {E['avgJeon']}전이 나와요. 같은 조건을 이 사이트 계산기에 넣으면 퇴직금은 {c(sv['amount'])}원이에요.</p>
<h2>먼저, 누가 받나요</h2>
{quote('sev8')}
<p>빠지는 경우는 같은 법 제4조에 있어요. {q('sev4')} ({src('sevLaw4')})</p>
<h2>예제 조건</h2>
<p>{src('moelSev')} 화면의 예제예요.</p>
{table(['항목', '값'], [('입사일', date_ko(E['join'])), ('퇴사일', date_ko(E['leave'])), ('재직일수', f'{c(E["serviceDays"])}일'), ('월 기본급', f'{c(E["monthlyBase"])}원'), ('월 기타수당', f'{c(E["monthlyAllowance"])}원'), ('연간 상여금', f'{c(E["annualBonus"])}원'), ('연차수당', f'{c(E["leaveUnit"])}원 × {E["leaveDays"]}일')], cls='')}
<p>퇴사일은 마지막으로 일한 날의 다음 날이에요. 고용노동부 화면도 {q('moel_sev_date')}하라고 안내해요.</p>
<h2>1단계: 퇴직 전 3개월의 날짜 수</h2>
<p>평균임금의 뜻은 근로기준법에 있어요.</p>
{quote('avg_wage')}
<p>{date_ko(E['leave'])}에 퇴직하면 그 전 3개월은 {date_ko(sv['periodStart'])}부터 {date_ko(sv['periodEnd'])}까지 <b>{sv['periodDays']}일</b>이에요. 달에 따라 {SV['periodDaysMin']}일에서 {SV['periodDaysMax']}일 사이로 달라져요.</p>
<h2>2단계: 3개월 임금 A + B + C</h2>
<p class="calc">A. 3개월 임금: ({c(E['monthlyBase'])}원 + {c(E['monthlyAllowance'])}원) × 3 = {c(E['wages3m'])}원<br>B. 상여금 가산: {c(E['annualBonus'])}원 × 3/12 = {c(E['bonusPart'])}원<br>C. 연차수당 가산: {c(E['leaveUnit'])}원 × {E['leaveDays']}일 × 3/12 = {c(E['leavePart'])}원<br>합계 {c(sv['total'])}원</p>
<p>상여금과 연차수당은 1년 치 가운데 3개월분만 넣어요. 예제의 연차수당은 {q('moel_sev_note')}예요.</p>
<h2>3단계: 1일 평균임금</h2>
<p class="calc">{c(sv['total'])}원 ÷ {sv['periodDays']}일 = <b>{c(sv['avg']['won'])}원 {sv['avg']['jeon']}전</b></p>
<p>여기까지가 고용노동부 화면에 적힌 값이에요. 통상임금이 더 크면 그쪽을 써요.</p>
{quote('avg_ordinary')}
<h2>4단계: 퇴직금</h2>
<p class="calc">{c(sv['avg']['won'])}원 {sv['avg']['jeon']}전 × {SV['payDays']}일 × {c(sv['serviceDays'])}일 ÷ {SV['daysPerYear']} = <b>{c(sv['amount'])}원</b></p>
<p>이 금액은 고용노동부 예제 조건을 이 사이트 계산기에 넣은 값이에요. 고용노동부 화면에는 예제의 최종 퇴직금 숫자가 적혀 있지 않아요. 원 미만은 버렸어요.</p>
<h2>알아 둘 것</h2>
{li('세전 금액이에요. 퇴직소득세는 따로 계산돼요.', f'퇴직금은 퇴직한 날부터 {SV["payWithinDays"]}일 안에 줘야 해요. 당사자끼리 합의하면 늦출 수 있어요(근로자퇴직급여 보장법 제9조).', '회사 내규에 따라 실제 지급액과 다를 수 있어요.', '이 계산기는 퇴직 전 3개월을 달력으로 3개월 전 같은 날부터 세어요. 그 날짜가 없는 달은 말일부터라서 회사·고용센터 계산과 하루 차이가 날 수 있어요.')}'''
    return dict(slug='toejikgeum-gyesan-yeje', short='퇴직금 계산, 고용노동부 예제로 따라가기', h1='퇴직금 계산을 고용노동부 예제로 따라가 보기',
                title='퇴직금 계산 방법: 고용노동부 예제로 4단계 따라가기 | 떼고얼마',
                desc=f'퇴직금 = 1일 평균임금 × {SV["payDays"]}일 × 재직일수 ÷ {SV["daysPerYear"]}. 고용노동부 예제(재직 {c(E["serviceDays"])}일)를 한 단계씩 계산해 1일 평균임금 {c(E["avgWon"])}원 {E["avgJeon"]}전까지 맞춰 봤어요.',
                body=body, sources=['sevLaw8', 'sevLaw4', 'sevLaw9', 'lsa2', 'moelSev'],
                try_=('입사일과 퇴직일을 넣으면 같은 순서로 계산해요.', '퇴직금 계산기', 'severance/'), pair='severance-pay-korea')


def ko_209():
    raw = F['raw209']
    mh = {x['hours']: x for x in F['monthlyHours']}
    rows = [(f'주 {h}시간', f'{hrs(mh[h]["paid"])}시간', f'{hrs(mh[h]["value"])}시간' + (' (고시)' if mh[h]['official'] else '')) for h in (15, 20, 30, 40)]
    body = f'''<p class="lede">{MH}시간은 주 {FULL}시간 일하는 사람의 한 달 유급 시간이에요. 일한 {FULL}시간에 유급 주휴 {DAYH}시간을 더한 {FULL + DAYH}시간을 한 달로 환산한 값이에요. 그래서 {Y0}년 최저임금 월급은 {c(mw0['hourly'])}원 × {MH}시간 = {c(mw0['monthly209'])}원이에요.</p>
<h2>고시에 적힌 문장</h2>
<p>고용노동부의 {Y1}년 적용 최저임금 고시는 월 환산액 옆에 기준을 적어 놨어요.</p>
{quote('mw_notice')}
<h2>계산 방법은 시행령에 있어요</h2>
{quote('mw_decree5')}
<p>이 문장대로 계산하면 이래요.</p>
<p class="calc">({FULL}시간 + {DAYH}시간) × 365 ÷ 7 ÷ 12 = {raw:.2f}…시간</p>
<p>고시는 이 값을 {MH}시간이라고 적어요. 올림했다는 문장이 고시에 있는 것은 아니에요.</p>
<h2>{Y0}년과 {Y1}년 최저임금</h2>
{mw_table('ko')}
<p class="calc">{Y0}년: {c(mw0['hourly'])}원 × {MH} = <b>{c(mw0['monthly209'])}원</b><br>{Y1}년: {c(mw1['hourly'])}원 × {MH} = <b>{c(mw1['monthly209'])}원</b></p>
<h2>주 {FULL}시간보다 짧게 일하면</h2>
<p>같은 식에 내 시간을 넣으면 돼요. 유급 주휴 시간은 주 소정근로시간 ÷ {FULL} × {DAYH}이에요(근로기준법 시행령 별표 2의 방식으로 풀면). 이 사이트 계산기는 식 그대로 계산하고 소수 첫째 자리까지 보여 줘요.</p>
{table(['주 소정근로시간', '유급 주휴 시간', '월 환산 시간'], rows, cls='')}
<p>주 {FULL}시간만 고시의 값이고 나머지는 식으로 계산한 값이에요.</p>
<h2>월급을 시급으로 바꿀 때도 같은 숫자를 써요</h2>
<p>월급 {man(F['m2h']['monthly'])}을 주 {FULL}시간 기준 시급으로 바꾸면 {c(F['m2h']['monthly'])}원 ÷ {MH}시간 = {c(F['m2h']['hourly'])}원이에요(원 미만 버림). 이 {MH}시간은 주 {FULL}시간에 주휴 {DAYH}시간인 경우의 값이에요. 회사가 정한 유급 시간이 다르면 달라져요.</p>
<p>최저임금 비교는 기본급(매달 정해 놓고 받는 임금) 기준의 단순 비교예요. 수당·상여금을 어디까지 넣는지는 이 계산기가 따지지 못해요.</p>'''
    return dict(slug='choejeoimgeum-209sigan', short=f'최저임금 월급의 {MH}시간은 어디서 나오나', h1=f'최저임금 월급 환산의 {MH}시간은 어디서 나오나',
                title=f'최저임금 월급 {MH}시간은 어떻게 나온 숫자인가: {Y0}년 {c(mw0["monthly209"])}원 | 떼고얼마',
                desc=f'{MH}시간은 주 {FULL}시간에 유급 주휴 {DAYH}시간을 더해 한 달로 환산한 값이에요. 고시 문장과 시행령의 계산 방법, {Y0}·{Y1}년 최저임금 월급을 정리했어요.',
                body=body, sources=['minWageNotice2027', 'minWageDecree5', 'minWage', 'lsaDecreeT2'],
                try_=('시급과 주 근로시간을 넣어 월급으로 바꿔 보세요.', '시급·주휴수당 계산기', 'hourly/'), pair=None)


def ko_ub():
    body = f'''<p class="lede">{Y0}년에 퇴사한 하루 {U['maxDayHours']}시간 근로자의 구직급여는 하루 {c(UB8)}원에서 {c(U['upper'])}원 사이예요. 하한이 최저임금을 따라 올라와 상한 바로 아래까지 왔기 때문이에요. 폭은 {c(ub['width'])}원이에요.</p>
<h2>하루 금액은 평균임금의 {U['rateNum']}%</h2>
<p>구직급여일액은 기초일액(이직 당시 평균임금)에 {U['rateNum']}%를 곱해요. 고용보험법 제46조의 문장은 {q('ei46')}이에요.</p>
<h2>상한: 하루 {c(U['upper'])}원</h2>
{quote('ei68')}
<p>평균임금이 아무리 높아도 {c(U['baseMax'])}원으로 봐요. 계산하면 {c(U['baseMax'])}원 × {U['rateNum']}% = {c(U['upper'])}원이에요. {date_ko(U['from'])} 이후에 이직한 사람부터 적용돼요.</p>
<h2>하한: 하루 {U['maxDayHours']}시간이면 {c(UB8)}원</h2>
{quote('ei45_4')}{quote('ei46_2')}
<p>하한은 하루 소정근로시간 × 최저임금 × {U['lowerNum']}%예요. 계산하면 {U['maxDayHours']}시간 × {c(U['minWageHourly'])}원 × {U['lowerNum']}% = {c(UB8)}원이에요. 고용노동부 상담 답변에 적힌 시간별 하한액과 같아요.</p>
{lower_table()}
<h2>그래서 금액이 한곳에 모여요</h2>
<p>퇴직 전 3개월 임금으로 계산해 봤어요(하루 {U['maxDayHours']}시간, 3개월 {ub['mid']['days']}일).</p>
{table(['3개월 임금', f'평균임금의 {U["rateNum"]}%', '하루 구직급여', '적용'], [(man(x['wages3m']), f'{c(x["byRate"])}원', f'{c(x["daily"])}원', '하한' if x['kind'] == 'lower' else '상한' if x['kind'] == 'upper' else f'{U["rateNum"]}%') for x in (ub['low'], ub['mid'], ub['high'])], cls='wide')}
<p>3개월 임금이 {man(ub['low']['wages3m'])}이든 {man(ub['mid']['wages3m'])}이든 하한에 걸려 같은 금액을 받고, {man(ub['high']['wages3m'])}이면 상한에 걸려요.</p>
<h2>받는 날 수</h2>
<p>이직일의 나이와 고용보험 가입 기간(피보험기간)으로 정해져요.</p>
{days_table()}
<p>{q('ei_table_note')} 실업을 신고한 날부터 {U['waitDays']}일은 대기기간이라 지급되지 않아요.</p>
<h2>받을 수 있는지는 따로 봐요</h2>
<p>고용보험법 제40조의 요건은 네 가지예요. 이직 전 {U['baseMonths']}개월 동안 피보험 단위기간이 합쳐서 {U['needDays']}일 이상일 것, 일할 의사와 능력이 있는데도 취업하지 못한 상태일 것, 이직 사유가 수급자격 제한 사유에 해당하지 않을 것, 재취업을 위해 적극적으로 노력할 것. 내 경우가 맞는지는 거주지 고용센터에서 확인하세요. 이 글과 계산기는 금액만 다뤄요.</p>
<h2>{U['next']['year']}년에는</h2>
<p>{U['next']['year']}년 최저임금은 {c(U['next']['minWageHourly'])}원이에요. 지금 식대로 계산하면 {U['maxDayHours']}시간 하한은 {c(ub['lowerNext8'])}원으로 지금 상한 {c(U['upper'])}원보다 커져요. {U['next']['year']}년 상한이 어떻게 정해질지는 확인된 발표가 없어요. {date_ko(U['change2028'])}부터는 계산 기준이 평균임금에서 보수(이직 전 1년 동안 신고된 보수)로 바뀔 예정이에요.</p>'''
    return dict(slug='sileopgeupyeo-haru-geumaek', short=f'{Y0}년 실업급여 하루 금액', h1=f'{Y0}년 실업급여 하루 금액이 {c(UB8)}~{c(U["upper"])}원에 모이는 이유',
                title=f'{Y0}년 실업급여 하루 금액: 하한 {c(UB8)}원, 상한 {c(U["upper"])}원 | 떼고얼마',
                desc=f'{Y0}년 구직급여는 평균임금의 {U["rateNum"]}%지만 하루 {U["maxDayHours"]}시간 근로자는 하한 {c(UB8)}원과 상한 {c(U["upper"])}원 사이에서 정해져요. 상·하한이 나오는 식과 받는 날 수 표를 정리했어요.',
                body=body, sources=['eiLaw', 'eiDecree68', 'moel1350Ub', 'eiTable1', 'minWage'],
                try_=('3개월 임금과 가입 기간을 넣어 계산해 보세요.', '실업급여 계산기', 'unemployment/'), pair=None)


# ══════════ 영어 ══════════
def en_deductions():
    ln = n4['line']
    rows = [
        (f'National Pension {kospan("국민연금")}', f'{pen["ratePct"]}%', f'income used for the pension, {wn(pen["baseMin"])} to {wn(pen["baseMax"])} a month', wn(ln['pension'])),
        (f'National Health Insurance {kospan("건강보험")}', f'{hi["ratePct"]}%', 'taxable monthly pay', wn(ln['health'])),
        (f'Long-term Care Insurance {kospan("장기요양보험")}', f'{care["ratePct"]}% ÷ {care["healthPct"]}%', 'the health insurance premium', wn(ln['care'])),
        (f'Employment Insurance {kospan("고용보험")}', f'{emp["ratePct"]}%', 'taxable monthly pay', wn(ln['employment'])),
        (f'Income tax (monthly withholding) {kospan("소득세")}', 'table lookup', 'taxable monthly pay and number of dependents', wn(ln['incomeTax'])),
        (f'Local income tax {kospan("지방소득세")}', f'{NOW["localTax"]["ratePct"]}%', 'the income tax', wn(ln['localTax'])),
    ]
    body = f'''<p class="lede">A Korean payslip takes six things out of your pay every month: four social insurance premiums and two taxes. On a salary of {wn(n4['annual'])} a year, that is {wn(n4['deductions'])} out of {wn(n4['gross'])} a month, leaving {wn(n4['net'])} under the rules as of {P0_EN}.</p>
<h2>The six lines on the payslip</h2>
<p>The amounts in the last column are for the {wn(n4['annual'])} example, with one dependent and a {wn(N['nontaxMeal'])} tax-free meal allowance.</p>
{table(['Deduction', 'Employee rate', 'Charged on', 'Example'], rows, cls='wide')}
<p>The Korean names are the ones printed on a payslip, so you can match the lines one by one.</p>
<h2>What “taxable monthly pay” means</h2>
<p>Start from your gross monthly pay, which is the annual salary divided by 12, and take out non-taxable pay. The usual non-taxable item is a meal allowance: up to {wn(N['nontaxMeal'])} a month is tax-free for workers who are not given meals by the employer ({src('meal', 'en')}). The insurance premiums are charged on pay without non-taxable earned income as well ({src('npsDecree3', 'en')}, {src('nhisDecree33', 'en')}).</p>
<p class="calc">{wn(n4['annual'])} ÷ 12 = {wn(n4['gross'])} gross<br>{wn(n4['gross'])} − {wn(n4['nontax'])} = {wn(n4['taxable'])} taxable</p>
<h2>The four insurances</h2>
<ul>
<li><b>National Pension.</b> {pen['ratePct']}% in {Y0}, rising to {NXT['pension']['ratePct']}% in {Y1} under the National Pension Act. It is charged on an income figure that drops anything under {wn(pen['baseUnit'])} and is kept between {wn(pen['baseMin'])} and {wn(pen['baseMax'])} a month, so the premium stops growing above that ceiling.</li>
<li><b>National Health Insurance.</b> {hi['ratePct']}%, the employee half of the {hi['totalPct']}% rate. The monthly premium has a floor of {wn(hi['employeeMin'])} and a ceiling of {wn(hi['employeeMax'])} for the employee share.</li>
<li><b>Long-term Care Insurance.</b> Not a share of pay but of the health premium: health premium × {care['ratePct']}% ÷ {care['healthPct']}%.</li>
<li><b>Employment Insurance.</b> {emp['ratePct']}%, with no ceiling in the law we read. It is not collected from people hired after turning {N['employmentExemptAge']}.</li>
</ul>
<p>Employers pay their own share on top of each of these. Only the employee share appears as a deduction.</p>
<h2>The two taxes</h2>
<p><b>Income tax</b> is withheld every month from a table in the Enforcement Decree of the Income Tax Act, the simplified withholding table ({kospan("근로소득 간이세액표")}). You find your pay bracket and your number of dependents, counting yourself and your spouse as one each. The table in force since {EFF_EN} has {c(G['count'])} rows. For the example, taxable pay of {wn(n4['taxable'])} with one dependent gives {wn(ln['incomeTax'])}.</p>
<p>Dependents matter. At {wn(fam[0]['taxable'])} of taxable monthly pay the table gives {wn(fam[0]['line']['incomeTax'])} for one dependent, {wn(fam[1]['line']['incomeTax'])} for two and {wn(fam[3]['line']['incomeTax'])} for four. Children aged {N['childAgeFrom']} to {N['childAgeTo']} reduce it further: {wn(CH['one'])} for one child and {wn(CH['two'])} for two.</p>
<p>You may ask your employer to withhold {N['ratios'][0]}% or {N['ratios'][2]}% of the table amount instead ({src('ganiRatio', 'en')}). The monthly amount is an advance. The tax for the whole year is worked out again in the year-end tax settlement, which this site does not calculate.</p>
<p><b>Local income tax</b> is {NOW['localTax']['ratePct']}% of the income tax, collected together with it.</p>
<p>This calculator uses the standard monthly withholding table that applies to residents.</p>
<h2>Why your payslip can differ from a calculator</h2>
<ul>
<li>The National Pension Service sets the income figure for the pension once a year, so it may not match this month’s pay.</li>
<li>Your employer may treat different items as non-taxable.</li>
<li>The number of dependents on file with your employer may differ from what you typed.</li>
<li>Rounding. This site rounds each premium and tax down to {wn(R['pension'])}, following the rounding rule of the {src('treasury47', 'en')}. An employer’s figures can differ by a few tens of won.</li>
</ul>
<h2>What changes in {Y1}</h2>
<p>The National Pension rate becomes {NXT['pension']['ratePct']}%, which costs the {wn(n4['annual'])} example {wn(-cmp4['netDiff'])} a month. The health insurance rate was approved to stay at {NXT['health']['totalPct']}%. The long-term care rate for {Y1} had not been decided when we checked on {date_en(CHECKED)}.</p>'''
    return dict(slug='payroll-deductions-korea', short='How payroll deductions work in Korea', h1='How payroll deductions work in Korea: the four insurances and withholding tax',
                title='Payroll deductions in Korea: the four insurances and tax | Takehome Korea',
                desc=f'What comes out of a Korean payslip each month: National Pension {pen["ratePct"]}%, health insurance {hi["ratePct"]}%, long-term care, employment insurance {emp["ratePct"]}% and withheld income tax, with a worked example.',
                body=body, sources=['npsLaw', 'npsGuide', 'nhisRate', 'nhisLimit', 'eiRateDecree', 'eiRateLaw', 'gani', 'ganiRatio', 'localTax', 'meal', 'npsDecree3', 'nhisDecree33', 'treasury47', 'mohw2027', 'mohwCare2027'],
                try_=('Put in your own salary and see every line.', 'Net salary calculator', ''), pair=None)


def en_severance():
    body = f'''<p class="lede">Severance pay ({kospan("퇴직금")}) in Korea is at least {SV['payDays']} days of average wages for every year of continuous service. In practice: average daily wage × {SV['payDays']} × days of service ÷ {SV['daysPerYear']}. The Ministry of Employment and Labor’s own sample case gives an average daily wage of {wn(E['avgWon'])}.{E['avgJeon']}, and this site’s calculator turns the same inputs into {wn(sv['amount'])}.</p>
<h2>Who qualifies</h2>
<p>The Act on the Guarantee of Employees’ Retirement Benefits requires employers to pay it to workers who leave, with two exclusions written into Article 4 ({src('sevLaw4', 'en')}):</p>
<ul>
<li>workers with less than one year of continuous service, and</li>
<li>workers whose contractual hours average under {SV['minWeekHours']} a week over four weeks.</li>
</ul>
<p>Whether your own case falls inside is for your employer or the ministry’s 1350 counselling line to confirm. This guide and the calculator only do the arithmetic.</p>
<h2>The formula</h2>
<p class="calc">severance pay = average daily wage × {SV['payDays']} days × (days of service ÷ {SV['daysPerYear']})<br>average daily wage = (A + B + C) ÷ days in the last three months</p>
<ul>
<li><b>A</b> is the wages paid in the three months before leaving.</li>
<li><b>B</b> is 3/12 of the bonuses paid over the last year.</li>
<li><b>C</b> is 3/12 of the unused-leave pay for the year.</li>
</ul>
<p>The average wage ({kospan("평균임금")}) is defined in the Labor Standards Act as the wages paid in the three months before the event divided by the total days in that period ({src('lsa2', 'en')}). The same article says that if it comes out lower than the worker’s ordinary wage ({kospan("통상임금")}), the ordinary wage is used.</p>
<h2>The ministry’s sample case, step by step</h2>
{table(['Input', 'Value'], [('Start date', date_en(E['join'])), ('Leaving date', date_en(E['leave'])), ('Days of service', c(E['serviceDays'])), ('Base pay a month', wn(E['monthlyBase'])), ('Other allowances a month', wn(E['monthlyAllowance'])), ('Bonus for the year', wn(E['annualBonus'])), ('Unused-leave pay', f'{wn(E["leaveUnit"])} × {E["leaveDays"]} days')], cls='')}
<p>The leaving date is the day after the last working day. The three months before {date_en(E['leave'])} run from {date_en(sv['periodStart'])} to {date_en(sv['periodEnd'])}, which is {sv['periodDays']} days. Depending on the months involved it is between {SV['periodDaysMin']} and {SV['periodDaysMax']}.</p>
<p class="calc">A: ({wn(E['monthlyBase'])} + {wn(E['monthlyAllowance'])}) × 3 = {wn(E['wages3m'])}<br>B: {wn(E['annualBonus'])} × 3/12 = {wn(E['bonusPart'])}<br>C: {wn(E['leaveUnit'])} × {E['leaveDays']} × 3/12 = {wn(E['leavePart'])}<br>A + B + C = {wn(sv['total'])}<br>{wn(sv['total'])} ÷ {sv['periodDays']} = <b>{wn(sv['avg']['won'])}.{sv['avg']['jeon']}</b> a day<br>{wn(sv['avg']['won'])}.{sv['avg']['jeon']} × {SV['payDays']} × {c(sv['serviceDays'])} ÷ {SV['daysPerYear']} = <b>{wn(sv['amount'])}</b></p>
<p>The ministry’s page states the average daily wage and stops there. The final {wn(sv['amount'])} is what this site’s calculator returns for the same inputs, with won fractions dropped.</p>
<h2>Things to know</h2>
<ul>
<li>The result is before tax. Retirement income tax is calculated separately and is not covered here.</li>
<li>Severance pay must be paid within {SV['payWithinDays']} days of leaving, unless both sides agree to extend ({src('sevLaw9', 'en')}).</li>
<li>Company rules can make the actual amount differ, as the ministry’s calculator itself notes.</li>
<li>This site counts the last three months from the same calendar day three months earlier, or from the last day of that month if that day does not exist. An employer or labor office may count one day differently.</li>
</ul>'''
    return dict(slug='severance-pay-korea', short='Severance pay in Korea', h1='Severance pay in Korea: who qualifies and how it is calculated',
                title='Severance pay in Korea: who qualifies and the formula | Takehome Korea',
                desc=f'Korean severance pay is {SV["payDays"]} days of average wages per year of service, for workers with at least one year and {SV["minWeekHours"]} hours a week. The formula, with the labor ministry’s sample case worked through.',
                body=body, sources=['sevLaw8', 'sevLaw4', 'sevLaw9', 'lsa2', 'moelSev'],
                try_=('Enter your own dates and wages.', 'Severance pay calculator', 'severance/'), pair='toejikgeum-gyesan-yeje')


def en_minwage():
    rows = [(f'{h} hours', f'{hrs(wk[h]["paidHours"])} hours' if wk[h]['eligible'] else 'none', wn(wk[h]['pay']), wn(wk[h]['weeklyTotal'])) for h in (14, 15, 20, 30, 40)]
    body = f'''<p class="lede">Korea’s minimum wage is {wn(mw0['hourly'])} an hour in {Y0} and {wn(mw1['hourly'])} in {Y1}. For a {FULL}-hour week that is {wn(mw0['monthly209'])} a month in {Y0}, because the monthly figure counts {MH} paid hours: the hours worked plus a paid weekly holiday.</p>
<h2>The official figures</h2>
{mw_table('en')}
<p>The {Y1} wage is {wn(F['mw']['diff'])} an hour higher. It applies from {date_en(mw1['from'])} to {date_en(mw1['until'])}, to every industry alike ({src('minWageNotice2027', 'en')}).</p>
<h2>Where {MH} hours come from</h2>
<p>The ministry’s notice for {Y1} explains the monthly figure: a worker on {FULL} contractual hours a week is counted at {MH} hours a month, including {DAYH} paid weekly holiday hours a week. The method is in the {src('minWageDecree5', 'en')}: weekly paid hours, times the average number of weeks in a year, divided by 12.</p>
<p class="calc">({FULL} + {DAYH}) × 365 ÷ 7 ÷ 12 = {F['raw209']:.2f}… hours, stated in the notice as {MH}<br>{Y0}: {wn(mw0['hourly'])} × {MH} = <b>{wn(mw0['monthly209'])}</b><br>{Y1}: {wn(mw1['hourly'])} × {MH} = <b>{wn(mw1['monthly209'])}</b></p>
<h2>The weekly holiday allowance</h2>
<p>The Labor Standards Act gives workers at least one paid holiday a week on average. The pay for that day is the weekly holiday allowance ({kospan("주휴수당")}). Two conditions come from the law:</p>
<ul>
<li>your contractual hours average {MINW} a week or more over four weeks ({src('lsa18', 'en')}), and</li>
<li>you attended every contractual working day of that week ({src('lsaDecree30', 'en')}). According to the ministry’s counselling answers, arriving late or leaving early does not count as an absence.</li>
</ul>
<p>The amount is one day’s contractual hours times your hourly wage. For part-time workers the {src('lsaDecreeT2', 'en')} sets the day’s hours in proportion to a full-time worker. Worked out for a workplace where full-timers do {WORKDAYS} days and {FULL} hours a week, that gives:</p>
<p class="calc">paid holiday hours = weekly contractual hours ÷ {FULL} × {DAYH}, at most {DAYH}<br>{wk[20]['hours']} hours a week on {wn(mw0['hourly'])}: {hrs(wk[20]['paidHours'])} hours × {wn(mw0['hourly'])} = <b>{wn(wk[20]['pay'])}</b> a week</p>
<p>At the {Y0} minimum wage:</p>
{table(['Hours a week', 'Paid holiday hours', 'Allowance a week', 'Weekly pay with allowance'], rows, cls='wide')}
<p>The weekly holiday also applies to workplaces with {L['minWorkers'] - 1} or fewer workers.</p>
<h2>Checking a monthly salary against the minimum wage</h2>
<p>Divide the monthly pay by the hours per month. {wn(F['m2h']['monthly'])} a month for a {FULL}-hour week is {wn(F['m2h']['monthly'])} ÷ {MH} = {wn(F['m2h']['hourly'])} an hour. This is a simple comparison on base pay, the wage fixed and paid every month. Which allowances and bonuses count toward the minimum wage is a separate question that this site does not judge.</p>'''
    return dict(slug='minimum-wage-weekly-holiday-allowance', short=f'Minimum wage {Y0} and {Y1}, weekly holiday allowance', h1=f'Korea minimum wage {Y0} and {Y1}, and the weekly holiday allowance',
                title=f'Korea minimum wage {Y0} and {Y1}, weekly holiday allowance | Takehome Korea',
                desc=f'Korea’s minimum wage is {wn(mw0["hourly"])} an hour in {Y0} and {wn(mw1["hourly"])} in {Y1}. Why the monthly figure uses {MH} hours, and how the weekly holiday allowance is worked out for part-time hours.',
                body=body, sources=['minWage', 'minWageNotice2027', 'minWageDecree5', 'lsa55', 'lsaDecree30', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly'],
                try_=('Turn your hourly wage into monthly pay.', 'Hourly wage calculator', 'hourly/'), pair=None)


def _fix(a):
    a['try'] = a.pop('try_')
    return a


ARTICLES = {
    'ko': [_fix(f()) for f in (ko_payslip, ko_rates, ko_weekly, ko_severance, ko_209, ko_ub)],
    'en': [_fix(f()) for f in (en_deductions, en_severance, en_minwage)],
}
