"""화면 글: 페이지 제목·설명·입력칸 이름(PAGES)과 첫 화면 아래 칸(계산 기준, 출처 표, 다른 계산기), 소개, 방침.

숫자는 손으로 적지 않는다. 전부 ctx.py 의 D(자료 파일)·F(로직으로 계산한 값)·G(간이세액표)에서 꺼내 쓴다.
법령·공단 문장은 ctx.Q(원문 그대로)에서만 인용한다. 확인하지 못한 사실은 쓰지 않는다.
"""
from ctx import *  # noqa: F401,F403

N, R, H, SV, U, L = D['net'], D['rounding'], D['hourly'], D['severance'], D['unemployment'], D['leave']
pen, hi, care, emp, mw0, mw1 = NOW['pension'], NOW['health'], NOW['care'], NOW['employment'], NOW['minWage'], NXT['minWage']
CH = G['child']
E = SV['example']
NY = U['next']['year']
MAN = 10000   # 만 원 칸의 자리 글자('예: 4,000')를 만들 때 쓰는 단위
n4 = F['net4000']
P0_KO, P1_KO, P0_EN, P1_EN = period_ko(NOWID), period_ko(NEXTID), period_en(NOWID), period_en(NEXTID)
EFF_KO, EFF_EN = date_ko(G['effective']), date_en(G['effective'])
CHK_KO, CHK_EN = date_ko(CHECKED), date_en(CHECKED)
HOLD_KO = '<span class="tag-hold">미정</span>'
HOLD_EN = '<span class="tag-hold">not decided</span>'


def kospan(s):
    return f'<span lang="ko">{s}</span>'


# ───────── 제목·설명·입력칸 ─────────
PAGES = {
    'net': {
        'ko': dict(
            title=f'연봉 실수령액 계산기: {Y0}년 4대 보험·소득세 떼고 얼마 | 떼고얼마',
            desc=f'연봉이나 월급을 넣으면 국민연금·건강보험·장기요양·고용보험과 소득세를 한 줄씩 식과 함께 계산해요. {P0_KO} 기준이고, {Y1}년에 바뀌는 금액도 같이 보여 줘요.',
            h1='연봉 실수령액 계산기', sub='4대 보험과 세금을 떼고 통장에 들어오는 돈을 계산해요.',
            basis_l='금액 종류', annual='연봉', monthly='월급', pre='세전 금액', amt_l=['세전 연봉(숫자만 쓰면 만 원)', '세전 월급(숫자만 쓰면 만 원)'], ph=[f'예: {c(CALC["example"]["annual"] // MAN)}', f'예: {c(CALC["example"]["monthly"] // MAN)}'],
            quick='바로 넣기', change='조건 바꾸기', close='조건 접기', out_l='계산 결과', cmp_l='앞뒤 금액과 견주기', cmp_more='연봉 실수령액 표 전체 보기',
            fine=('예상 금액이에요. 국민연금은 1년에 한 번 정한 소득으로 매기고 소득세는 연말정산에서 정산돼서 실제 명세서와 다를 수 있어요. '
                  '정확한 금액은 급여명세서와 공단에서 확인하세요. 입력한 금액은 이 기기 밖으로 나가지 않아요. <a href="#basis">계산 기준과 출처</a>'),
            opts=dict(
                nontax='비과세 금액(월)', nontax_h=f'식대는 월 {man(N["nontaxMeal"])}까지 세금을 안 떼요. 회사에서 식사를 따로 주면 0으로 바꾸세요.',
                fam='부양가족 수(본인 포함)', fam_h='본인, 배우자, 공제받는 가족을 더한 수예요.', kid=f'그중 {N["childAgeFrom"]}~{N["childAgeTo"]}세 자녀', kid_h='위 부양가족에 들어 있는 자녀만 세어요.',
                ratio='세금 떼는 비율', ratio_h=f'회사에 신청하면 세금을 덜({N["ratios"][0]}%) 또는 더({N["ratios"][2]}%) 떼요.', less='줄이기', more='늘리기',
                period='기준 시기', p_now=P0_KO, p_next=[f'{P1_KO}(예정)', P1_KO],
                sev='퇴직금이 연봉에 들어 있어요', sev_h='연봉을 13으로 나눠 월급을 구해요.',
                age60=f'만 {N["pensionExemptAge"]}세 이상이에요', age60_h='국민연금을 내지 않아요. 임의계속가입으로 계속 내고 있으면 끄세요.',
                age=f'{N["employmentExemptAge"]}세 이후에 새로 입사했어요', age_h='고용보험료도 내지 않아요.'),
        ),
        'en': dict(
            title=f'Korea Net Salary Calculator: take-home pay after tax, {Y0} | Takehome Korea',
            desc=(f'Enter an annual or monthly salary in won to see your take-home pay in Korea after National Pension, health, long-term care and employment insurance and income tax, '
                  f'with the math for every line. Rules as of {P0_EN}.'),
            h1='Korea Net Salary Calculator', sub='Your take-home pay in Korea after the four social insurances and income tax.',
            basis_l='Kind of amount', annual='Annual', monthly='Monthly', pre='before tax, in won', amt_l=['Annual salary before tax, in won', 'Monthly salary before tax, in won'],
            ph=[f'e.g. {c(CALC["example"]["annual"])}', f'e.g. {c(CALC["example"]["monthly"])}'],
            quick='Try', change='Change conditions', close='Close', out_l='Result', cmp_l='Amounts around yours', cmp_more='See the full net salary table',
            fine=('An estimate. The National Pension is charged on an income figure that is set once a year, so your payslip can differ, and income tax is a monthly advance that is settled in the year-end tax settlement. '
                  'This calculator uses the standard monthly withholding table that applies to residents. Check exact amounts on your payslip or with the National Pension Service and the National Health Insurance Service. '
                  'The amounts you enter never leave this device. <a href="#basis">Rules and sources</a>'),
            opts=dict(
                nontax='Non-taxable pay per month', nontax_h=f'A meal allowance is tax-free up to {wn(N["nontaxMeal"])} a month if your employer does not provide meals. Set 0 if that is not you.',
                fam='Dependents, including you', fam_h='You, your spouse and the family members you claim.', kid=f'Children aged {N["childAgeFrom"]} to {N["childAgeTo"]}', kid_h='Only children already counted among the dependents above.',
                ratio='Withholding rate', ratio_h=f'On request your employer withholds less ({N["ratios"][0]}%) or more ({N["ratios"][2]}%) than the table amount.', less='Fewer', more='More',
                period='Rules as of', p_now=P0_EN.replace(P0_EN.split()[0], P0_EN[:3]), p_next=[f'{P1_EN.replace(P1_EN.split()[0], P1_EN[:3])} (planned)', P1_EN.replace(P1_EN.split()[0], P1_EN[:3])],
                sev='Severance is included in my annual salary', sev_h='The salary is divided by 13, not by 12.',
                age60=f'I am {N["pensionExemptAge"]} or older', age60_h=f'The National Pension is not collected. Turn this off if you chose to keep paying in as a voluntarily continuing member ({kospan("임의계속가입")}).',
                age=f'I was hired after turning {N["employmentExemptAge"]}', age_h='Employment Insurance is not collected either.'),
        ),
    },
    'sev': {
        'ko': dict(
            title='퇴직금 계산기: 입사일·퇴직일로 세전 퇴직금 계산 | 떼고얼마',
            desc='입사일과 퇴직일, 퇴직 전 3개월 임금을 넣으면 1일 평균임금과 세전 퇴직금을 계산해요. 고용노동부 계산기와 같은 식·같은 끝수로, 줄마다 식을 보여 줘요.',
            h1='퇴직금 계산기', sub='입사일, 퇴직일, 퇴직 전 3개월 임금으로 세전 퇴직금을 계산해요.',
            join='입사일', leave='퇴직일', leave_h='퇴직일은 마지막으로 일한 날의 다음 날이에요. 실업급여 계산기에 넣는 이직일(마지막으로 일한 날)보다 하루 뒤예요.',
            wages='퇴직 전 3개월 동안 받은 임금(세전)', wages_h='기본급과 수당을 더한 3개월치 합계예요. 숫자만 쓰면 만 원으로 읽어요.', eg='예:',
            ph=[c(E['wages3m'] // MAN), c(E['annualBonus'] // MAN), c(E['leavePay'] // MAN)],
            more='상여금, 연차수당, 통상임금', open='넣기', shut='접기', bonus='연간 상여금', bonus_h='숫자만 쓰면 만 원으로 읽어요.', lpay='연차수당(1년치)', lpay_h='상여금과 연차수당은 3개월치(3/12)만 더해요.',
            ord='1일 통상임금', ord_h='원 단위로 읽어요. 평균임금보다 크면 통상임금으로 계산해요.', u15=f'4주 평균 주 {SV["minWeekHours"]}시간 미만으로 일했어요',
            fill='고용노동부 예제 넣어 보기', clear='지우기', out_l='계산 결과',
            fine='세전 금액이에요. 퇴직소득세는 계산하지 않아요. 회사 내규에 따라 실제 지급액과 다를 수 있어요. 입력한 값은 이 기기 밖으로 나가지 않아요. <a href="#basis">계산 기준과 출처</a>'),
        'en': dict(
            title='Korea Severance Pay Calculator: from start and end dates | Takehome Korea',
            desc='Enter your start date, leaving date and the wages of your last three months to get the average daily wage and severance pay in Korea before tax, using the Ministry of Employment and Labor formula.',
            h1='Korea Severance Pay Calculator', sub='Severance pay before tax, from your dates and the wages of your last three months.',
            join='Start date', leave='Leaving date', leave_h='The leaving date is the day after your last working day.', wages='Wages paid in the last three months, before tax', wages_h='Base pay plus allowances for the three months. Amounts are in won, read as typed.', eg='e.g.',
            ph=[c(E['wages3m']), c(E['annualBonus']), c(E['leavePay'])],
            more='Bonus, unused-leave pay, ordinary wage', open='Add', shut='Close', bonus='Bonus for the year', bonus_h='In won, read as typed.', lpay='Unused-leave pay for the year', lpay_h='Only three months’ worth (3/12) of the bonus and leave pay is added.',
            ord='Ordinary daily wage', ord_h='In won. Used instead of the average wage when it is higher.', u15=f'I worked under {SV["minWeekHours"]} hours a week on a four-week average',
            fill='Fill in the ministry’s sample case', clear='Clear', out_l='Result',
            fine='Before tax. Retirement income tax is not calculated, and company rules can change the actual amount. What you enter never leaves this device. <a href="#basis">Rules and sources</a>'),
    },
    'hourly': {
        'ko': dict(
            title=f'시급 계산기: 주휴수당·월급 환산, {Y0}년 최저임금 {c(mw0["hourly"])}원 | 떼고얼마',
            desc=f'시급과 주 근로시간을 넣으면 주휴수당, 주급, 월급을 계산하고 {Y0}년 최저임금 {c(mw0["hourly"])}원과 견줘요. 월급을 시급으로 바꿀 수도 있어요.',
            h1='시급·주휴수당 계산기', sub='시급을 주휴수당 포함 월급으로, 월급을 시급으로 바꾸고 최저임금과 견줘요.',
            mode_l='계산 방향', m_hourly='시급으로', m_monthly='월급으로', amt_l=['시급(원)', '세전 월급(숫자만 쓰면 만 원)'], ph=[f'예: {c(mw0["hourly"])}', f'예: {c(CALC["example"]["monthly"] // MAN)}'],
            hours='주 소정근로시간', hours_h='일하기로 정한 시간이에요. 연장근로는 빼요. 소수는 둘째 자리까지.', year='최저임금 기준', y='{}년', out_l='계산 결과',
            fine=('최저임금 비교는 기본급(매달 정해 놓고 받는 임금) 기준의 단순 비교예요. 수당·상여금을 어디까지 넣는지는 이 계산기가 따지지 못해요. '
                  '세전 금액이에요. <a href="#basis">계산 기준과 출처</a>')),
        'en': dict(
            title=f'Korea Hourly Wage and Weekly Holiday Pay Calculator, {Y0} | Takehome Korea',
            desc=f'Turn an hourly wage in Korea into weekly and monthly pay with the weekly holiday allowance, and compare it with the {Y0} minimum wage of {wn(mw0["hourly"])}. Works from monthly pay too.',
            h1='Korea Hourly Wage and Weekly Holiday Allowance Calculator', sub='Hourly wage to monthly pay with the weekly holiday allowance, or monthly pay to an hourly wage, compared with the minimum wage.',
            mode_l='Direction', m_hourly='From hourly', m_monthly='From monthly', amt_l=['Hourly wage, in won', 'Monthly pay before tax, in won'], ph=[f'e.g. {c(mw0["hourly"])}', f'e.g. {c(CALC["example"]["monthly"])}'],
            hours='Contractual hours a week', hours_h='The hours you agreed to work, without overtime. Up to two decimals.', year='Minimum wage year', y='{}', out_l='Result',
            fine=('The minimum wage check is a simple comparison on base pay, the wage fixed and paid every month. This calculator cannot judge which allowances or bonuses count. '
                  'All amounts are before tax. <a href="#basis">Rules and sources</a>')),
    },
    'ub': {
        'ko': dict(
            title=f'실업급여 계산기: {Y0}년 구직급여 하루 금액과 받는 날 수 | 떼고얼마',
            desc=(f'퇴직 전 3개월 임금과 나이, 고용보험 가입 기간을 넣으면 {Y0}년 기준 하루 구직급여(하한 {c(U["lowerByHours"]["8"])}원, 상한 {c(U["upper"])}원)와 받는 날 수를 계산해요.'),
            h1='실업급여 계산기', sub=f'{Y0}년·{NY}년에 퇴사했을 때 받는 구직급여의 하루 금액과 받는 날 수를 계산해요.',
            leave_h='이직일은 마지막으로 일한 날이에요. 퇴직금 계산기에 넣는 퇴직일(그 다음 날)보다 하루 앞이에요.',
            wages_h='기본급과 수당을 더한 3개월치 합계예요. 숫자만 쓰면 만 원으로 읽어요.',
            hours_h=f'공식 하한액 표가 1~{U["maxDayHours"]}시간 정수라서 정수로 골라요.',
            fine=('예상 금액이에요. 받을 수 있는지와 정확한 금액은 고용센터가 정해요. 이 계산기는 금액만 계산해요. 입력한 값은 이 기기 밖으로 나가지 않아요. '
                  '<a href="#basis">계산 기준과 출처</a>')),
    },
    'leave': {
        'ko': dict(
            title='연차 계산기: 입사일 기준 연차 발생일과 일수 | 떼고얼마',
            desc=(f'입사일을 넣으면 1년 미만은 다달이 1일(최대 {L["firstYearMax"]}일), 1년을 채우면 {L["base"]}일, 그 뒤로 {L["addEveryYears"]}년마다 1일씩 느는 연차를 날짜와 함께 표로 보여 줘요. '
                  '근로기준법 제60조 기준이에요.'),
            h1='연차 계산기', sub='입사일을 넣으면 해마다 연차가 언제 며칠 생기는지 보여 줘요.',
            fine=f'1년간 {L["attendPct"]}% 이상 출근했다고 보고 계산해요. 회계연도(1월 1일) 기준으로 주는 회사는 날짜가 달라요. <a href="#basis">계산 기준과 출처</a>'),
    },
    'table': {
        'ko': dict(
            title=f'{Y0}년 연봉 실수령액 표: {man0(CALC["table"]["rows"][0]["annual"])}~{man(CALC["table"]["rows"][-1]["annual"])} | 떼고얼마',
            desc=(f'연봉 {man(CALC["table"]["rows"][0]["annual"])}부터 {man(CALC["table"]["rows"][-1]["annual"])}까지 월 실수령액과 4대 보험·소득세를 한 표로 봐요. '
                  f'{P0_KO} 기준, 부양가족 1명·비과세 {man(N["nontaxMeal"])}으로 계산했어요.'),
            h1=f'{Y0}년 연봉 실수령액 표',
            assume=f'{P0_KO} 기준 · 부양가족 1명(본인) · 비과세 식대 월 {man(N["nontaxMeal"])} · 세금 떼는 비율 100% · 만 {N["pensionExemptAge"]}세 미만(국민연금·고용보험을 내는 경우) · 연봉 ÷ 12 · 금액 단위 원',
            find='내 연봉', find_ph=f'예: {c(F["net5500"]["annual"] // MAN)}', all='항목별로 보기', less='간단히 보기', hint='표를 옆으로 밀어 보세요.',
            caption=f'{P0_KO} 기준 연봉별 월 실수령액',
            cols=['연봉', '월급(세전)', '국민연금', '건강보험', '장기요양', '고용보험', '소득세', '지방소득세', '떼는 돈', '월 실수령액'],
            open='{} 계산기로 보기', read_as='{}에 가장 가까운 줄을 표시했어요.', none='표의 범위 밖이에요. 계산기에 넣어 보세요.',
            fine=f'예상 금액이에요. 조건(부양가족, 비과세, 세금 떼는 비율, 만 {N["pensionExemptAge"]}세 이상)이 다르면 줄을 눌러 계산기에서 바꿔 보세요. 보험료와 세금은 각각 {R["pension"]}원 미만을 버렸어요.'),
        'en': dict(
            title=f'Korea Net Salary Table {Y0}: {wn(CALC["table"]["rows"][0]["annual"])} to {wn(CALC["table"]["rows"][-1]["annual"])} | Takehome Korea',
            desc=(f'Monthly take-home pay in Korea for annual salaries from {wn(CALC["table"]["rows"][0]["annual"])} to {wn(CALC["table"]["rows"][-1]["annual"])}, with each insurance premium and tax. '
                  f'Rules as of {P0_EN}, one dependent, {wn(N["nontaxMeal"])} non-taxable.'),
            h1=f'Korea Net Salary Table, {Y0}',
            assume=f'Rules as of {P0_EN} · one dependent (you) · {wn(N["nontaxMeal"])} a month non-taxable meal allowance · withholding at 100% · under {N["pensionExemptAge"]}, paying the pension and employment insurance · salary ÷ 12 · amounts in won',
            find='My annual salary', find_ph=f'e.g. {c(F["net5500"]["annual"])}', all='Show every deduction', less='Show fewer columns', hint='Swipe the table sideways.',
            caption=f'Monthly take-home pay by annual salary, rules as of {P0_EN}',
            cols=['Annual salary', 'Monthly gross', 'National Pension', 'Health', 'Long-term care', 'Employment', 'Income tax', 'Local income tax', 'Deductions', 'Take-home a month'],
            open='Open {} in the calculator', read_as='Marked the row closest to {}.', none='Outside the table. Try the calculator instead.',
            fine=f'Estimates. If your conditions differ (dependents, non-taxable pay, withholding rate, aged {N["pensionExemptAge"]} or older), click a row to change them in the calculator. Each premium and tax is rounded down to {wn(R["pension"])}.'),
    },
    'guide': {
        'ko': dict(title='가이드: 급여명세서, 4대 보험, 퇴직금, 주휴수당 | 떼고얼마', desc='급여명세서가 계산기와 다른 이유, 4대 보험 요율, 주휴수당과 퇴직금 계산을 공식 출처와 계산 예로 풀어 쓴 글이에요.',
                   h1='가이드', lead='계산기만으로 답이 안 되는 질문을 공식 출처와 계산 예로 풀었어요.'),
        'en': dict(title='Guides to pay, severance and minimum wage in Korea | Takehome Korea', desc='Plain explanations of Korean payroll deductions, severance pay and the minimum wage, with worked numbers and links to the laws.',
                   h1='Guides', lead='The questions a calculator cannot answer alone, with worked numbers and links to the laws.'),
    },
    'about': {
        'ko': dict(title='떼고얼마 소개와 계산 기준(출처 전체 표)', desc='떼고얼마가 무엇을 계산하고 누가 만들었는지, 어떤 법령·공단 자료의 어느 값을 언제 확인해 쓰는지 한 표로 적었어요.'),
        'en': dict(title='About Takehome Korea and where every number comes from', desc='What Takehome Korea calculates, who runs it, and a full table of the laws and agency notices behind every rate, with effective dates and the day we checked.'),
    },
    'privacy': {
        'ko': dict(title='개인정보 처리방침 | 떼고얼마', desc='떼고얼마는 입력한 금액과 날짜를 브라우저 안에서만 계산하고 어디로도 보내지 않아요. 이 탭과 기기에 남는 것, 광고 쿠키, 방문 통계에 대해 적었어요.'),
        'en': dict(title='Privacy policy | Takehome Korea', desc='Takehome Korea calculates inside your browser and does not send the amounts or dates you enter. What is stored, how ads use cookies, and visit statistics.'),
    },
}


# ───────── 도우미 ─────────
def band_labels():
    """고용보험 가입 기간 구간 이름(자료의 경계 값에서 만든다): 1년 미만, 1년 이상 3년 미만 …"""
    b = U['tenureBands']
    return [f'{b[0]}년 미만'] + [f'{b[i]}년 이상 {b[i + 1]}년 미만' for i in range(len(b) - 1)] + [f'{b[-1]}년 이상']


AGE = U['ageSplit']

def table(head, rows, cls='rows', labels=None):
    th = ''.join(f'<th scope="col">{h}</th>' for h in head)
    body = ''
    for r in rows:
        cells = f'<th scope="row">{r[0]}</th>'
        for i, x in enumerate(r[1:], start=1):
            lab = f' data-l="{(labels or head)[i]}"' if x and 'rows' in cls else ''
            cells += f'<td{lab}>{x}</td>'
        body += f'<tr>{cells}</tr>'
    # 넓은 표: 좁은 화면에서 표 안에서 옆으로 밀린다. 밀어 보라는 한 줄을 표 바로 위에 같이 낸다
    hint = ''
    if 'wide' in cls.split():
        hint = '<p class="tbl-hint">' + ('표를 옆으로 밀어 보세요.' if any('가' <= ch <= '힣' for ch in ''.join(head)) else 'Swipe the table sideways.') + '</p>'
    return f'{hint}<div class="tbl {cls}"><table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'


def sec(h2, inner, sid=None, cls='narrow', lead=None):
    return f'<section class="sec {cls}"{f" id={chr(34)}{sid}{chr(34)}" if sid else ""}><h2>{h2}</h2>' + (f'<p class="lead">{lead}</p>' if lead else '') + inner + '</section>'


def tool_cards(lang, skip):
    p = '/' if lang == 'ko' else '/en/'
    if lang == 'ko':
        items = [('net', '', '연봉 실수령액 계산기', f'{P0_KO} 기준, 줄마다 식'), ('table', 'table/', '연봉 실수령액 표', f'{man0(CALC["table"]["rows"][0]["annual"])}~{man(CALC["table"]["rows"][-1]["annual"])}'),
                 ('sev', 'severance/', '퇴직금 계산기', '입사일과 퇴직일로 세전 퇴직금'), ('hourly', 'hourly/', '시급·주휴수당 계산기', f'{Y0}년 최저임금 {c(mw0["hourly"])}원'),
                 ('ub', 'unemployment/', '실업급여 계산기', '하루 금액과 받는 날 수'), ('leave', 'annual-leave/', '연차 계산기', '입사일 기준으로 해마다 며칠')]
        h = '다른 계산기'
    else:
        items = [('net', '', 'Net salary calculator', f'Rules as of {P0_EN}, with the math'), ('table', 'table/', 'Net salary table', f'{wn(CALC["table"]["rows"][0]["annual"])} to {wn(CALC["table"]["rows"][-1]["annual"])}'),
                 ('sev', 'severance/', 'Severance pay calculator', 'From your start and leaving dates'), ('hourly', 'hourly/', 'Hourly wage and weekly holiday allowance', f'{Y0} minimum wage {wn(mw0["hourly"])}')]
        h = 'More calculators'
    cards = ''.join(f'<a href="{p}{path}"><b>{name}</b><span>{line}</span></a>' for key, path, name, line in items if key != skip)
    return f'<section class="sec links"><h2>{h}</h2><div class="cards">{cards}</div></section>'


def guide_links(lang, slugs):
    import articles
    p = '/' if lang == 'ko' else '/en/'
    arts = [a for s in slugs for a in articles.ARTICLES[lang] if a['slug'] == s]
    items = ''.join(f'<li><a href="{p}guide/{a["slug"]}/"><b>{esc(a["h1"])}</b><span>{esc(a["desc"])}</span></a></li>' for a in arts)
    return f'<section class="sec narrow links"><h2>{"같이 읽을 글" if lang == "ko" else "Related guides"}</h2><ul class="glist">{items}</ul></section>'


def checked_line(lang):
    return (f'아래 법령·공단 자료를 {CHK_KO}에 직접 열어 확인했어요. 전체 표는 <a href="/about/#basis">소개와 계산 기준</a>에 있어요.' if lang == 'ko'
            else f'Checked against the laws and agency notices below on {CHK_EN}. The pages are in Korean. The full table is on the <a href="/en/about/#basis">about page</a>.')


# ───────── 입력칸 아래의 '기준 한눈에'(컴퓨터에서는 왼쪽 아래, 휴대폰에서는 명세서 아래) ─────────
def key_facts(key, lang):
    dd = U['days']
    ko = lang == 'ko'
    if key == 'sev':
        h, rows, more = (('법에 적힌 기준', [('대상', f'1년 이상 일했고 4주 평균 주 {SV["minWeekHours"]}시간 이상'), ('금액', f'계속근로기간 1년에 {SV["payDays"]}일분 이상의 평균임금'), ('기한', f'퇴직한 날부터 {SV["payWithinDays"]}일 안')], '근거 조문 보기') if ko else
                         ('What the law says', [('Covered', f'one year of service or more, and {SV["minWeekHours"]} hours a week or more on a four-week average'), ('Amount', f'at least {SV["payDays"]} days of average wages per year of service'), ('Deadline', f'within {SV["payWithinDays"]} days of leaving')], 'See the articles'))
    elif key == 'hourly':
        h, rows, more = ((f'최저임금과 주휴수당', [(f'{Y0}년', f'시급 {c(mw0["hourly"])}원 · 월 {c(mw0["monthly209"])}원'), (f'{Y1}년', f'시급 {c(mw1["hourly"])}원 · 월 {c(mw1["monthly209"])}원'), ('주휴수당', f'주 {H["minWeekHours"]}시간 이상 일하고 그 주를 개근하면')], '근거와 계산 방법 보기') if ko else
                         ('Minimum wage and the weekly holiday allowance', [(str(Y0), f'{wn(mw0["hourly"])} an hour · {wn(mw0["monthly209"])} a month'), (str(Y1), f'{wn(mw1["hourly"])} an hour · {wn(mw1["monthly209"])} a month'), ('Allowance', f'{H["minWeekHours"]} hours a week or more, with full attendance that week')], 'See the rules and sources'))
    elif key == 'ub':
        h, rows, more = f'{Y0}년 이직 기준', [('하루 하한', f'{c(U["lowerByHours"]["8"])}원(하루 {U["maxDayHours"]}시간)'), ('하루 상한', f'{c(U["upper"])}원'), (f'{NY}년 이직', f'하한 {c(F["ub"]["lowerNext8"])}원 <span class="tag-st">확정</span> 상한 {HOLD_KO}'), ('받는 날 수', f'{min(dd["under50"])}~{max(dd["over50"])}일'), ('대기기간', f'실업 신고일부터 {U["waitDays"]}일')], '근거와 받는 날 수 표 보기'
    else:
        h, rows, more = '근로기준법 제60조', [('1년 미만', f'한 달 개근마다 1일, 최대 {L["firstYearMax"]}일'), ('1년을 채우면', f'{L["base"]}일({L["attendPct"]}% 이상 출근)'), (f'{L["addFromYears"]}년 이상', f'{L["addEveryYears"]}년마다 1일 더, 한도 {L["cap"]}일')], '근거 조문 보기'
    body = ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in rows)
    return f'<section class="t-more kf"><h2>{h}</h2><dl>{body}</dl><p class="cmp-more"><a href="#basis">{more}</a></p></section>'


# ───────── 실수령액: 첫 화면 아래 ─────────
def net_below(lang):
    hl = f'<span class="nw">{c(hi["employeeMin"])}원~</span><span class="nw">{c(hi["employeeMax"])}원</span>'
    if lang == 'ko':
        rows = [
            ('국민연금', f'<b>{pen["ratePct"]}%</b> · 매기는 월 소득 <span class="nw">{man0(pen["baseMin"])}~{man(pen["baseMax"])}</span><br>만 {N["pensionExemptAge"]}세 이상은 떼지 않음', f'{P1_KO}부터 {NXT["pension"]["ratePct"]}% <span class="tag-st">확정</span>', srcs(pen['src'] + N['pensionExemptSrc'] + N['baseSrc']['pension'])),
            ('건강보험', f'<b>{hi["ratePct"]}%</b> ({hi["totalPct"]}%의 절반)', f'{NXT["health"]["totalPct"]}% 그대로 <span class="tag-st">의결</span><br>상·하한 {HOLD_KO}', srcs(hi['src'] + hi['limitSrc'] + NXT['health']['src'] + N['baseSrc']['health'])),
            ('장기요양보험', f'건강보험료 × <b>{care["ratePct"]}%</b> ÷ {care["healthPct"]}%', f'{HOLD_KO} {Y0}년 값으로 계산', srcs(NXT['care']['src'])),
            ('고용보험', f'<b>{emp["ratePct"]}%</b><br>{N["employmentExemptAge"]}세 이후에 새로 입사하면 떼지 않음', f'{Y0}년 요율로 계산', srcs(emp['src'] + N['baseSrc']['employment'])),
            ('소득세', f'근로소득 간이세액표<br>{EFF_KO} 시행', f'개정 여부 {HOLD_KO}', srcs(NOW['incomeTax']['src'])),
            ('지방소득세', f'소득세의 <b>{NOW["localTax"]["ratePct"]}%</b>', '', srcs(NOW['localTax']['src'])),
            ('비과세 식대', f'월 <b>{man(N["nontaxMeal"])}</b>까지', '', srcs(N['nontaxSrc'])),
            ('끝수', f'각각 {R["pension"]}원 미만 버림<br>(이 계산기의 방식)', '', srcs(R['src'])),
        ]
        how = f'''<div class="prose"><ul>
<li><b>월급</b>은 연봉을 12로 나눈 값이에요(원 미만 버림). 퇴직금이 연봉에 들어 있다고 고르면 13으로 나눠요. 법에 정해진 식이 아니라 흔히 쓰는 어림이에요.</li>
<li><b>과세 대상 월급</b>은 월급에서 비과세 금액을 뺀 값이에요. 보험료와 소득세를 이 금액으로 계산해요. 근거는 {src('npsDecree3')}, {src('nhisDecree33')}, {src('eiLaw2')}예요(고용보험은 법 문장까지만 확인했어요). 일부 비과세 항목은 건강보험에서는 보수에 들어가요.</li>
<li><b>비과세 식대</b>: 식사를 따로 제공받지 않는 사람이 받는 식대는 월 {man(N["nontaxMeal"])}까지 비과세예요({src('meal')}). 회사마다 비과세 항목이 달라요.</li>
<li><b>국민연금</b> = 국민연금을 매기는 월 소득 × {pen["ratePct"]}%. 과세 대상 월급에서 천 원 미만을 버리고 <span class="nw">{man0(pen["baseMin"])}~{man(pen["baseMax"])}</span> 사이로 맞춘 금액이에요. 국민연금공단은 이 금액을 기준소득월액이라고 불러요.</li>
<li><b>만 {N["pensionExemptAge"]}세 이상</b>은 국민연금 가입 대상이 아니에요. 법은 {q('nps6')}라고 정해요({src('npsLaw6')}). 조건에서 '만 {N["pensionExemptAge"]}세 이상이에요'를 켜면 국민연금을 0원으로 계산해요. 임의계속가입을 신청해 계속 내고 있으면 끄세요.</li>
<li><b>건강보험</b> = 과세 대상 월급 × {hi["ratePct"]}%(한 달 {hl}). <b>장기요양보험</b> = 건강보험료 × {care["ratePct"]}% ÷ {care["healthPct"]}%.</li>
<li><b>고용보험</b> = 과세 대상 월급 × {emp["ratePct"]}%. {N["employmentExemptAge"]}세 이후에 새로 고용된 사람은 떼지 않아요({src('eiRateLaw')}). 조건에서 '{N["employmentExemptAge"]}세 이후에 새로 입사했어요'를 켜면 고용보험료와 국민연금이 둘 다 0원이 돼요.</li>
<li><b>소득세</b>는 근로소득 간이세액표({EFF_KO} 시행)에서 과세 대상 월급 구간과 부양가족 수로 찾아요. 부양가족에는 본인과 배우자도 한 명씩 들어가요. {N["childAgeFrom"]}~{N["childAgeTo"]}세 자녀가 있으면 1명 {c(CH["one"])}원, 2명 {c(CH["two"])}원, 3명부터는 한 명에 {c(CH["eachOverTwo"])}원씩 더 빼요. <b>지방소득세</b>는 소득세의 {NOW["localTax"]["ratePct"]}%예요.</li>
<li><b>끝수</b>: 이 계산기는 보험료와 세금의 {R["pension"]}원 미만을 버려요({src('treasury47', text='국고금관리법 제47조')}의 끝수 계산 방식). 회사·공단의 계산과 몇십 원 다를 수 있어요.</li>
<li><b>소득세의 끝수 순서</b>: 표 금액에서 자녀 공제를 빼고, 세금 떼는 비율({N["ratios"][0]}%·{N["ratios"][2]}%)을 곱한 다음, 마지막에 {R["incomeTax"]}원 미만을 버려요. 월 {man(G["last"])}이 넘어 표 주석의 계산식을 쓸 때는 계산식 금액의 원 미만을 먼저 버려요. 이 순서는 이 계산기가 정한 방식이에요.</li>
<li><b>금액 칸</b>: 숫자만 쓰면 만 원으로 읽어요({F["net4000"]["annual"] // MAN} → {man(F["net4000"]["annual"])}). 만 원으로 읽기에는 너무 큰 수는 원으로 읽고 그렇게 알려 줘요. '원'이나 '만'을 붙이면 쓴 그대로 읽어요. 읽은 값은 칸 아래에 늘 보여요.</li>
</ul></div>
<p class="note">세무·노무 상담이 아니에요. 정확한 금액은 급여명세서, 국민연금공단, 국민건강보험공단에서 확인하세요. 마지막 확인 {CHECKED}.</p>'''
        nx = f'''<div class="prose"><ul>
<li><b>확정</b>: 국민연금이 {pen["ratePct"]}%에서 {NXT["pension"]["ratePct"]}%로 올라요(국민연금법 부칙). 연봉 {man(n4["annual"])}이면 한 달에 {c(-F["cmp4000"]["netDiff"])}원 덜 받아요. 최저임금은 시간당 {c(mw1["hourly"])}원이 돼요.</li>
<li><b>의결</b>: 건강보험료율은 {NXT["health"]["totalPct"]}%로 그대로예요(보건복지부 {date_ko(S["mohw2027"]["date"])} 보도자료).</li>
<li><b>미정</b>: 장기요양보험료율, 건강보험료 상·하한, 간이세액표 개정 여부는 아직 정해지지 않았어요. 정해질 때까지 {Y0}년 값으로 계산하고 줄마다 표시해요.</li>
</ul></div>'''
        return (sec('계산 기준과 출처', table(['항목', f'지금({P0_KO})', P1_KO, '출처'], rows), 'basis', cls='', lead=checked_line(lang))
                + sec('이렇게 계산해요', how) + sec(f'{P1_KO}에 바뀌는 것', nx)
                + tool_cards(lang, 'net') + guide_links(lang, ['myeongseseo-dareun-iyu', '2026-4dae-boheom-yoyul', 'sileopgeupyeo-haru-geumaek']))
    rows = [
        (f'National Pension {kospan("국민연금")}', f'<b>{pen["ratePct"]}%</b> of the income used for the pension, {wn(pen["baseMin"])} to {wn(pen["baseMax"])}<br>not collected from people aged {N["pensionExemptAge"]} or older', f'{NXT["pension"]["ratePct"]}% from {P1_EN} <span class="tag-st">set by law</span>', srcs(pen['src'] + N['pensionExemptSrc'] + N['baseSrc']['pension'], 'en')),
        (f'National Health Insurance {kospan("건강보험")}', f'<b>{hi["ratePct"]}%</b>, the employee half of {hi["totalPct"]}%', f'{NXT["health"]["totalPct"]}% kept <span class="tag-st">approved</span><br>ceiling and floor {HOLD_EN}', srcs(hi['src'] + hi['limitSrc'] + NXT['health']['src'] + N['baseSrc']['health'], 'en')),
        (f'Long-term Care Insurance {kospan("장기요양보험")}', f'health premium × <b>{care["ratePct"]}%</b> ÷ {care["healthPct"]}%', f'{HOLD_EN}, {Y0} value used', srcs(NXT['care']['src'], 'en')),
        (f'Employment Insurance {kospan("고용보험")}', f'<b>{emp["ratePct"]}%</b><br>not collected from people hired after turning {N["employmentExemptAge"]}', f'{Y0} rate used', srcs(emp['src'] + N['baseSrc']['employment'], 'en')),
        (f'Income tax {kospan("소득세")}', f'simplified withholding table in force since {EFF_EN}', f'revision {HOLD_EN}', srcs(NOW['incomeTax']['src'], 'en')),
        (f'Local income tax {kospan("지방소득세")}', f'<b>{NOW["localTax"]["ratePct"]}%</b> of the income tax', '', srcs(NOW['localTax']['src'], 'en')),
        ('Tax-free meal allowance', f'up to <b>{wn(N["nontaxMeal"])}</b> a month', '', srcs(N['nontaxSrc'], 'en')),
        ('Rounding', f'each amount rounded down to {wn(R["pension"])} (this calculator’s method)', '', srcs(R['src'], 'en')),
    ]
    how = f'''<div class="prose"><ul>
<li><b>Monthly pay</b> is the annual salary divided by 12, with won fractions dropped. If you say severance is included in the salary, it is divided by 13. That is a common rule of thumb, not a formula in the law.</li>
<li><b>Taxable monthly pay</b> is monthly pay minus non-taxable pay. Premiums and income tax are worked out on it. The basis is the {src('npsDecree3', 'en')}, the {src('nhisDecree33', 'en')} and the {src('eiLaw2', 'en')} (for Employment Insurance we confirmed the Act’s wording only). Some non-taxable items still count as pay for health insurance.</li>
<li><b>Meal allowance</b>: up to {wn(N["nontaxMeal"])} a month is tax-free for workers who are not given meals ({src('meal', 'en')}). Non-taxable items differ from company to company.</li>
<li><b>National Pension</b> = income used for the pension × {pen["ratePct"]}%. That income is your taxable monthly pay with anything under {wn(pen["baseUnit"])} dropped, kept between {wn(pen["baseMin"])} and {wn(pen["baseMax"])}. The National Pension Service calls it the standard monthly income ({kospan("기준소득월액")}).</li>
<li><b>Aged {N["pensionExemptAge"]} or older</b>: by law only workers under {N["pensionExemptAge"]} are compulsory members of the National Pension ({src('npsLaw6', 'en')}). Tick “I am {N["pensionExemptAge"]} or older” under the conditions and the pension line becomes zero. Leave it off if you chose to keep paying in as a voluntarily continuing member ({kospan("임의계속가입")}).</li>
<li><b>National Health Insurance</b> = taxable monthly pay × {hi["ratePct"]}%, between {wn(hi["employeeMin"])} and {wn(hi["employeeMax"])} a month. <b>Long-term Care Insurance</b> = the health premium × {care["ratePct"]}% ÷ {care["healthPct"]}%.</li>
<li><b>Employment Insurance</b> = taxable monthly pay × {emp["ratePct"]}%. It is not collected from people hired after turning {N["employmentExemptAge"]} ({src('eiRateLaw', 'en')}). Ticking “I was hired after turning {N["employmentExemptAge"]}” sets both this line and the pension line to zero.</li>
<li><b>Income tax (monthly withholding)</b> is looked up in the simplified withholding table ({kospan("근로소득 간이세액표")}, in force since {EFF_EN}) by pay bracket and number of dependents. You and your spouse each count as one dependent. For children aged {N["childAgeFrom"]} to {N["childAgeTo"]} the table amount is reduced by {wn(CH["one"])} for one child, {wn(CH["two"])} for two, and {wn(CH["eachOverTwo"])} more for each further child. <b>Local income tax</b> is {NOW["localTax"]["ratePct"]}% of the income tax.</li>
<li><b>Rounding</b>: this calculator rounds each premium and tax down to {wn(R["pension"])}, following the rounding rule of the {src('treasury47', 'en')}. Your employer’s figures can differ by a few tens of won.</li>
<li><b>Order of rounding for income tax</b>: the child reduction is taken off the table amount, the result is multiplied by the withholding rate ({N["ratios"][0]}% or {N["ratios"][2]}%), and only then is it rounded down to {wn(R["incomeTax"])}. Above {wn(G["last"])} a month, where the formula in the table notes applies, the formula amount first drops its won fractions. This order is this calculator’s own choice.</li>
<li><b>Amount fields</b>: every amount is read in won exactly as typed, so a salary of forty million won needs all its zeros, or the short forms m and million. What was read is always shown under the field.</li>
</ul></div>
<p class="note">This calculator uses the standard monthly withholding table that applies to residents. It is not tax or labor advice. Check exact amounts on your payslip, or with the National Pension Service and the National Health Insurance Service. Last checked {CHECKED}.</p>'''
    nx = f'''<div class="prose"><ul>
<li><b>Set by law</b>: the National Pension rate goes from {pen["ratePct"]}% to {NXT["pension"]["ratePct"]}%. On a salary of {wn(n4["annual"])} that is {wn(-F["cmp4000"]["netDiff"])} less a month. The minimum wage becomes {wn(mw1["hourly"])} an hour.</li>
<li><b>Approved</b>: the health insurance rate stays at {NXT["health"]["totalPct"]}% (Ministry of Health and Welfare press release, {date_en(S["mohw2027"]["date"])}).</li>
<li><b>Not decided</b>: the long-term care rate, the health premium ceiling and floor, and whether the withholding table will be revised. Until they are, the calculator uses the {Y0} values and marks those lines.</li>
</ul></div>'''
    return (sec('Rules and sources', table(['Item', f'Now ({P0_EN})', P1_EN, 'Source'], rows), 'basis', cls='', lead=checked_line(lang))
            + sec('How it is calculated', how) + sec(f'What changes in {P1_EN}', nx)
            + tool_cards(lang, 'net') + guide_links(lang, ['payroll-deductions-korea', 'severance-pay-korea', 'minimum-wage-weekly-holiday-allowance']))


# ───────── 퇴직금 ─────────
def sev_below(lang):
    sv, ex3, last, same = F['sev'], F['threeMonthsEx'], F['threeMonthsLast'], F['threeMonthsSame']
    if lang == 'ko':
        rows = [
            ('퇴직금', f'계속근로기간 1년에 {SV["payDays"]}일분 이상의 평균임금', srcs(SV['src']['amount'])),
            ('대상', f'1년 이상 일했고 4주 평균 주 {SV["minWeekHours"]}시간 이상', srcs(SV['src']['eligible'])),
            ('평균임금', '퇴직 전 3개월 임금 ÷ 그 기간의 날짜 수. 통상임금보다 적으면 통상임금', srcs(SV['src']['avgWage'])),
            ('지급 기한', f'퇴직한 날부터 {SV["payWithinDays"]}일 안(합의하면 연장)', srcs(SV['src']['payBy'])),
        ]
        how = f'''<div class="prose">
<p>고용노동부 「퇴직금 계산」 화면과 같은 식, 같은 끝수로 계산해요. {q('moel_sev_formula')}, {q('moel_sev_avg')}.</p>
<ul>
<li>A는 퇴직 전 3개월 동안 받은 임금, B는 연간 상여금의 3/12, C는 연차수당의 3/12예요.</li>
<li>퇴직일은 마지막으로 일한 날의 다음 날이에요. 재직일수는 입사일부터 마지막 근무일까지의 날짜 수예요.</li>
<li>1일 통상임금이 1일 평균임금보다 크면 통상임금으로 계산해요.</li>
<li>세전 금액이에요. 퇴직소득세는 계산하지 않아요.</li>
</ul>
<h3>날짜 세는 법과 끝수는 고용노동부 계산기에 맞췄어요</h3>
<ul>
<li>퇴직 전 3개월은 3개월 전 같은 날부터 퇴직일 전날까지예요({date_ko(same['leave'])}에 퇴직하면 {date_ko(same['start'])}부터 {same['days']}일).</li>
<li>3개월 전 달에 그 날짜가 없으면 그 달 말일부터 세어요({date_ko(last['leave'])}에 퇴직하면 {date_ko(last['start'])}부터 {last['days']}일). 다만 3개월 전이 2월이면 3월 1일부터 세어요({date_ko(ex3['leave'])}에 퇴직하면 {date_ko(ex3['start'])}부터 {ex3['days']}일).</li>
<li>1일 평균임금은 전(소수 둘째 자리)에서 올려요. 고용노동부 예제의 {c(E['avgWon'])}원 {E['avgJeon']}전과 같은 값이 나와요. 퇴직금은 원 미만을 반올림해요.</li>
<li>1년을 채웠는지는 달력의 같은 날짜로 따져요.</li>
</ul>
<p class="note">고용노동부 계산기에 같은 값을 넣어 본 결과와 견줘 맞췄어요(확인 {CHECKED}). 회사 내규에 따라 실제 지급액은 다를 수 있어요.</p>
<h3>받을 수 있는지는 판정하지 않아요</h3>
<p>법에 적힌 요건은 이래요. {q('sev4')} ({src('sevLaw4')}) 내 경우가 어디에 드는지는 회사나 고용노동부 1350 상담에서 확인하세요.</p>
</div>'''
        exb = f'''<div class="prose"><p>처음에 보이는 값은 {src('moelSev')} 화면의 예제 조건이에요. 입사 {date_ko(E['join'])}, 퇴사 {date_ko(E['leave'])}, 재직 {c(E['serviceDays'])}일, 월 기본급 {c(E['monthlyBase'])}원, 월 기타수당 {c(E['monthlyAllowance'])}원, 연간 상여금 {c(E['annualBonus'])}원, 연차수당 {c(E['leaveUnit'])}원 × {E['leaveDays']}일.</p>
<p class="calc">A {c(E['wages3m'])}원 + B {c(E['bonusPart'])}원 + C {c(E['leavePart'])}원 = {c(sv['total'])}원<br>{c(sv['total'])}원 ÷ {sv['periodDays']}일 = 1일 평균임금 <b>{c(sv['avg']['won'])}원 {sv['avg']['jeon']}전</b><br>{c(sv['avg']['won'])}원 {sv['avg']['jeon']}전 × {SV['payDays']}일 × {c(sv['serviceDays'])}일 ÷ {SV['daysPerYear']} = <b>{c(sv['amount'])}원</b></p>
<p>고용노동부 화면의 예제 설명에 적힌 값은 1일 평균임금 {c(E['avgWon'])}원 {E['avgJeon']}전까지예요. 퇴직금 {c(sv['amount'])}원은 그 예제 조건을 이 계산기에 넣은 값이고, 같은 조건을 고용노동부 계산기에 넣어도 같은 금액이 나와요.</p></div>'''
        return (sec('계산 기준과 출처', table(['항목', '기준', '출처'], rows), 'basis', cls='', lead=checked_line(lang))
                + sec('이렇게 계산해요', how) + sec('예시는 고용노동부 예제예요', exb)
                + tool_cards(lang, 'sev') + guide_links(lang, ['toejikgeum-gyesan-yeje', 'sileopgeupyeo-haru-geumaek']))
    rows = [
        (f'Severance pay {kospan("퇴직금")}', f'at least {SV["payDays"]} days of average wages for each year of continuous service', srcs(SV['src']['amount'], 'en')),
        ('Who is covered', f'one year of service or more, and {SV["minWeekHours"]} contractual hours a week or more on a four-week average', srcs(SV['src']['eligible'], 'en')),
        (f'Average wage {kospan("평균임금")}', 'wages paid in the three months before leaving ÷ the calendar days in that period; the ordinary wage is used if it is higher', srcs(SV['src']['avgWage'], 'en')),
        ('Payment deadline', f'within {SV["payWithinDays"]} days of leaving, unless both sides agree to extend', srcs(SV['src']['payBy'], 'en')),
    ]
    how = f'''<div class="prose">
<p>This uses the same formula and the same rounding as the Ministry of Employment and Labor’s calculator: severance pay = average daily wage × {SV["payDays"]} days × (days of service ÷ {SV["daysPerYear"]}). The average daily wage is (A + B + C) ÷ the number of days in the last three months.</p>
<ul>
<li>A is the wages paid in the last three months, B is 3/12 of the year’s bonus, C is 3/12 of the year’s unused-leave pay.</li>
<li>The leaving date is the day after your last working day. Days of service run from the start date to the last working day.</li>
<li>If your ordinary daily wage is higher than the average daily wage, the ordinary wage is used.</li>
<li>The result is before tax. Retirement income tax is not calculated.</li>
</ul>
<h3>Day counting and rounding follow the ministry’s calculator</h3>
<ul>
<li>The last three months run from the same calendar day three months earlier to the day before the leaving date (leaving on {date_en(same['leave'])} gives {same['days']} days from {date_en(same['start'])}).</li>
<li>If that day does not exist three months earlier, the count starts on the last day of that month (leaving on {date_en(last['leave'])} gives {last['days']} days from {date_en(last['start'])}). When the month three months earlier is February, it starts on 1 March instead (leaving on {date_en(ex3['leave'])} gives {ex3['days']} days from {date_en(ex3['start'])}).</li>
<li>The average daily wage is rounded up at the second decimal, which reproduces the ministry’s sample figure of {wn(E['avgWon'])}.{E['avgJeon']}. The final amount is rounded to the nearest won.</li>
</ul>
<p class="note">These choices were matched against results from the ministry’s own calculator (checked {CHECKED}). Company rules can still make the actual amount differ.</p>
<h3>It does not decide whether you qualify</h3>
<p>The Act excludes workers with less than one year of continuous service and workers whose contractual hours average under {SV["minWeekHours"]} a week over four weeks ({src('sevLaw4', 'en')}). For your own case, ask your employer or the ministry’s 1350 counselling line.</p>
</div>'''
    exb = f'''<div class="prose"><p>The figures shown at first are the sample case on the {src('moelSev', 'en')}: started {date_en(E['join'])}, left {date_en(E['leave'])}, {c(E['serviceDays'])} days of service, base pay {wn(E['monthlyBase'])} and other allowances {wn(E['monthlyAllowance'])} a month, a yearly bonus of {wn(E['annualBonus'])}, and unused-leave pay of {wn(E['leaveUnit'])} × {E['leaveDays']} days.</p>
<p class="calc">A {wn(E['wages3m'])} + B {wn(E['bonusPart'])} + C {wn(E['leavePart'])} = {wn(sv['total'])}<br>{wn(sv['total'])} ÷ {sv['periodDays']} days = average daily wage <b>{wn(sv['avg']['won'])}.{sv['avg']['jeon']}</b><br>{wn(sv['avg']['won'])}.{sv['avg']['jeon']} × {SV['payDays']} days × {c(sv['serviceDays'])} days ÷ {SV['daysPerYear']} = <b>{wn(sv['amount'])}</b></p>
<p>The ministry’s worked example states the average daily wage of {wn(E['avgWon'])}.{E['avgJeon']} and stops there. The {wn(sv['amount'])} is what this calculator returns for the same inputs, and the ministry’s calculator returns the same amount.</p></div>'''
    return (sec('Rules and sources', table(['Item', 'Rule', 'Source'], rows), 'basis', cls='', lead=checked_line(lang))
            + sec('How it is calculated', how) + sec('The example is the ministry’s sample case', exb)
            + tool_cards(lang, 'sev') + guide_links(lang, ['severance-pay-korea', 'payroll-deductions-korea']))


# ───────── 시급·주휴수당 ─────────
def mw_table(lang):
    if lang == 'ko':
        return table(['적용 연도', '시간급', '일급(8시간)', f'월급({H["monthlyHours40"]}시간)'],
                     [(f'{Y0}년', f'{c(mw0["hourly"])}원', f'{c(mw0["daily8"])}원', f'{c(mw0["monthly209"])}원'), (f'{Y1}년', f'{c(mw1["hourly"])}원', f'{c(mw1["daily8"])}원', f'{c(mw1["monthly209"])}원')], cls='wide')
    return table(['Year', 'Hourly', f'Daily ({H["fullDayHours"]} hours)', f'Monthly ({H["monthlyHours40"]} hours)'],
                 [(str(Y0), wn(mw0['hourly']), wn(mw0['daily8']), wn(mw0['monthly209'])), (str(Y1), wn(mw1['hourly']), wn(mw1['daily8']), wn(mw1['monthly209']))], cls='wide')


def hourly_below(lang):
    w20 = next(x for x in F['weekly'] if x['hours'] == 20)
    rt = F['round15']
    if lang == 'ko':
        rows = [
            ('주휴일', '1주에 평균 1회 이상의 유급휴일. 1주 소정근로일을 개근한 사람에게', srcs(['lsa55', 'lsaDecree30'])),
            ('주휴수당이 없는 경우', f'4주 평균 주 {H["minWeekHours"]}시간 미만', srcs(['lsa18'])),
            ('주휴수당 금액', '1일 소정근로시간 × 시급(단시간근로자는 통상 근로자에 비례)', srcs(['lsaDecreeT2', 'moel1350Weekly'])),
            ('월 환산 시간', f'주 {H["fullWeekHours"]}시간이면 {H["monthlyHours40"]}시간(유급 주휴 {H["fullDayHours"]}시간 포함)', srcs(H['src']['monthly'])),
            ('최저임금', f'{Y0}년 {c(mw0["hourly"])}원, {Y1}년 {c(mw1["hourly"])}원', srcs(['minWage', 'minWageNotice2027'])),
        ]
        how = f'''<div class="prose">
<ul>
<li><b>주휴수당</b> = 유급 주휴 시간 × 시급. 유급 주휴 시간은 주 소정근로시간 ÷ {H["fullWeekHours"]} × {H["fullDayHours"]}이고 {H["fullDayHours"]}시간까지예요. {src('lsaDecreeT2')}의 방식(통상 근로자 주 5일·{H["fullWeekHours"]}시간 기준)으로 풀면 이렇게 돼요. 주 {w20['hours']}시간, 시급 {c(mw0['hourly'])}원이면 {hrs(w20['paidHours'])}시간 × {c(mw0['hourly'])}원 = {c(w20['pay'])}원이에요.</li>
<li>주 {H["minWeekHours"]}시간 미만이면 주휴수당이 없어요. 그 주의 소정근로일을 개근해야 생겨요. 고용노동부 상담 답변으로는 지각·조퇴는 결근이 아니에요.</li>
<li><b>월 환산 시간</b> = (주 소정근로시간 + 유급 주휴 시간) × 365 ÷ 7 ÷ 12. 주 {H["fullWeekHours"]}시간은 고용노동부 고시의 {H["monthlyHours40"]}시간을 그대로 써요. 그보다 짧으면 식 그대로 계산하고 화면에는 소수 첫째 자리까지 보여 줘요(주 {w20['hours']}시간 = {hrs(w20['monthlyHours'])}시간).</li>
<li><b>시급 → 월급</b>은 시급 × 월 환산 시간이고 원 미만을 올려요. 최저임금 월 환산액과 같은 끝수라서, 나온 월급을 다시 시급으로 바꾸면 처음 시급이 그대로 나와요(시급 {c(rt['hourly'])}원·주 {rt['hours']}시간 → 월급 {c(rt['monthly'])}원 → 시급 {c(rt['back'])}원).</li>
<li><b>월급 → 시급</b>은 월급을 월 환산 시간으로 나눠요(원 미만 버림). 최저임금과는 이 시급으로 견줘요.</li>
<li>주 소정근로시간은 소수 둘째 자리까지 넣을 수 있어요.</li>
<li>최저임금 비교는 기본급(매달 정해 놓고 받는 임금) 기준의 단순 비교예요. 수당·상여금을 어디까지 넣는지는 이 계산기가 따지지 못해요.</li>
</ul>
<p class="note">상시 {L["minWorkers"] - 1}명 이하 사업장에도 주휴일은 적용돼요(근로기준법 시행령 별표 1). 마지막 확인 {CHECKED}.</p>
</div>'''
        return (sec('계산 기준과 출처', table(['항목', '기준', '출처'], rows), 'basis', cls='', lead=checked_line(lang))
                + sec(f'{Y0}년과 {Y1}년 최저임금', mw_table(lang) + f'<p class="note" style="margin-top:8px">출처: {src("minWage")}. 확인 {CHECKED}.</p>')
                + sec('이렇게 계산해요', how)
                + tool_cards(lang, 'hourly') + guide_links(lang, ['juhyu-sudang-gyesan', 'choejeoimgeum-209sigan']))
    rows = [
        (f'Weekly holiday {kospan("주휴일")}', 'at least one paid holiday a week on average, for workers who attended every contractual working day that week', srcs(['lsa55', 'lsaDecree30'], 'en')),
        ('No allowance', f'contractual hours under {H["minWeekHours"]} a week on a four-week average', srcs(['lsa18'], 'en')),
        (f'Amount of the weekly holiday allowance {kospan("주휴수당")}', 'contractual hours of one day × hourly wage; part-time workers in proportion to a full-time worker', srcs(['lsaDecreeT2', 'moel1350Weekly'], 'en')),
        ('Hours per month', f'{H["monthlyHours40"]} hours for a {H["fullWeekHours"]}-hour week, including {H["fullDayHours"]} paid holiday hours a week', srcs(H['src']['monthly'], 'en')),
        (f'Minimum wage {kospan("최저임금")}', f'{wn(mw0["hourly"])} in {Y0}, {wn(mw1["hourly"])} in {Y1}', srcs(['minWage', 'minWageNotice2027'], 'en')),
    ]
    how = f'''<div class="prose">
<ul>
<li><b>Weekly holiday allowance</b> = paid holiday hours × hourly wage. Paid holiday hours are weekly contractual hours ÷ {H["fullWeekHours"]} × {H["fullDayHours"]}, capped at {H["fullDayHours"]}. This is what the method in the {src('lsaDecreeT2', 'en')} gives when a full-time worker does five days and {H["fullWeekHours"]} hours a week. At {w20['hours']} hours a week on {wn(mw0['hourly'])}: {hrs(w20['paidHours'])} hours × {wn(mw0['hourly'])} = {wn(w20['pay'])}.</li>
<li>Under {H["minWeekHours"]} hours a week there is no allowance. You must attend every contractual working day of the week. According to the ministry’s counselling answers, arriving late or leaving early is not an absence.</li>
<li><b>Hours per month</b> = (weekly contractual hours + paid holiday hours) × 365 ÷ 7 ÷ 12. For a {H["fullWeekHours"]}-hour week the calculator uses the {H["monthlyHours40"]} hours stated in the ministry’s notice. For shorter weeks it uses the formula as is and shows one decimal ({w20['hours']} hours a week = {hrs(w20['monthlyHours'])} hours).</li>
<li><b>Hourly to monthly</b> is the hourly wage × hours per month, with won fractions rounded up. That is the same rounding as the monthly minimum wage, so turning the result back into an hourly wage returns the wage you started with ({wn(rt['hourly'])} at {rt['hours']} hours a week → {wn(rt['monthly'])} a month → {wn(rt['back'])} an hour).</li>
<li><b>Monthly to hourly</b> divides monthly pay by the hours per month, dropping won fractions. The minimum wage check compares that hourly figure.</li>
<li>Weekly hours can have up to two decimals.</li>
<li>The minimum wage check is a simple comparison on base pay. This calculator cannot judge which allowances or bonuses count.</li>
</ul>
<p class="note">The weekly holiday also applies to workplaces with four or fewer workers (Enforcement Decree of the Labor Standards Act, Table 1). Last checked {CHECKED}.</p>
</div>'''
    return (sec('Rules and sources', table(['Item', 'Rule', 'Source'], rows), 'basis', cls='', lead=checked_line(lang))
            + sec(f'Minimum wage in {Y0} and {Y1}', mw_table(lang) + f'<p class="note" style="margin-top:8px">Source: {src("minWage", "en")}. Checked {CHECKED}.</p>')
            + sec('How it is calculated', how)
            + tool_cards(lang, 'hourly') + guide_links(lang, ['minimum-wage-weekly-holiday-allowance', 'payroll-deductions-korea']))


# ───────── 실업급여(한국어) ─────────
def days_table():
    dd = U['days']
    return table(['이직일의 나이'] + band_labels(),
                 [(f'{AGE}세 미만', *[f'{d}일' for d in dd['under50']]), (f'{AGE}세 이상', *[f'{d}일' for d in dd['over50']])], cls='wide')


def lower_table():
    return table(['하루 소정근로시간'] + [f'{x["hours"]}시간' for x in F['ubLower']], [('하한액', *[f'{c(x["amount"])}원' for x in F['ubLower']])], cls='wide')


def ub_below():
    ub = F['ub']
    nx, d90 = ub['next'], ub['d90']
    rows = [
        ('하루 금액', f'기초일액(이직 당시 평균임금)의 {U["rateNum"]}%', srcs(U['src']['rate'])),
        ('상한', f'기초일액 {c(U["baseMax"])}원까지 → 하루 {c(U["upper"])}원({date_ko(U["from"])} 이후 이직). {NY}년 이직은 {HOLD_KO}', srcs(U['src']['upper'])),
        ('하한', f'하루 소정근로시간 × 이직일의 최저임금 × {U["lowerNum"]}%. {U["maxDayHours"]}시간이면 {Y0}년 이직 {c(U["lowerByHours"]["8"])}원, {NY}년 이직 {c(ub["lowerNext8"])}원 <span class="tag-st">확정</span>', srcs(U['src']['lower'] + U['next']['lowerSrc'])),
        ('받는 날 수', f'나이와 고용보험 가입 기간에 따라 {min(U["days"]["under50"])}~{max(U["days"]["over50"])}일', srcs(U['src']['days'])),
        ('대기기간', f'실업 신고일부터 {U["waitDays"]}일은 지급하지 않음', srcs(['eiLaw'])),
    ]
    how = f'''<div class="prose">
<ul>
<li>1일 평균임금은 넣은 3개월 임금을 그 기간의 달력 날짜 수로 나눠요. 날짜 수는 이직일 다음 날을 퇴직일로 보고 <a href="/severance/">퇴직금 계산기</a>와 같은 방식으로 세어요. 이 계산기의 방식이라 고용센터 계산과 조금 다를 수 있어요.</li>
<li>평균임금의 {U["rateNum"]}%와 하한액 가운데 큰 쪽이 하루 금액이에요. 평균임금이 {c(U["baseMax"])}원을 넘으면 {c(U["baseMax"])}원으로 봐서 하루 {c(U["upper"])}원이 상한이에요.</li>
<li>하루 금액은 원 미만만 버려요. 평균임금을 먼저 버리지 않고 임금 × {U["rateNum"]}% ÷ 날짜 수를 한 번에 계산해요(3개월 임금 {man(d90['wages3m'])}, {d90['days']}일이면 {c(d90['byRate'])}원).</li>
<li>3개월 임금이 {man(ub['mid']['wages3m'])}이면 평균임금의 {U["rateNum"]}%가 {c(ub['mid']['byRate'])}원이라 하한 {c(ub['mid']['lower'])}원을 받고, {man(ub['high']['wages3m'])}이면 상한 {c(ub['high']['daily'])}원을 받아요.</li>
<li>하루 소정근로시간은 1~{U["maxDayHours"]}시간에서 골라요. 공식 하한액 표가 1~{U["maxDayHours"]}시간 정수라서 그래요.</li>
<li>이직일은 마지막으로 일한 날이에요. 퇴직금 계산기의 퇴직일(그 다음 날)과 하루 달라요.</li>
</ul>
<h3>하루 소정근로시간별 하한액({Y0}년 이직)</h3>
{lower_table()}
<h3>받는 날 수(소정급여일수)</h3>
{days_table()}
<p class="note" style="margin-top:8px">{q('ei_table_note')} ({src('eiTable1')})</p>
</div>'''
    req = f'''<div class="prose"><p>이 계산기는 금액만 계산해요. 받을 수 있는지는 고용센터가 정해요. {src('eiLaw', text='고용보험법 제40조')}에 적힌 요건은 이래요.</p>
<ul>
<li>이직 전 {U["baseMonths"]}개월 동안 피보험 단위기간이 합쳐서 {U["needDays"]}일 이상일 것</li>
<li>일할 의사와 능력이 있는데도 취업하지 못한 상태일 것</li>
<li>이직 사유가 수급자격 제한 사유에 해당하지 않을 것</li>
<li>재취업을 위한 노력을 적극적으로 할 것</li>
</ul>
<p>법의 표현은 '피보험 단위기간 {U["needDays"]}일'이에요. 어떻게 세는지와 내 경우는 거주지 고용센터에서 확인하세요.</p>
<h3>{NY}년에 이직하면</h3>
<ul>
<li><b>하한은 확정</b>: 하한액은 이직일의 최저임금으로 계산해요(고용보험법 제45조 제4항). {NY}년 최저임금 {c(nx['minWageHourly'])}원으로 계산하면 하루 {U["maxDayHours"]}시간 기준 {c(ub['lowerNext8'])}원이에요. {Y0}년 상한액 {c(U['upper'])}원보다 {c(ub['overUpper'])}원 많아요.</li>
<li><b>상한은 미정</b>: {NY}년 이직자의 상한액은 아직 정해지지 않았어요. 평균임금의 {U["rateNum"]}%가 하한보다 적으면 상한과 상관없이 하한액을 받아요(고용보험법 제46조 제2항). 평균임금이 지금 상한의 기준인 {c(U["baseMax"])}원을 넘는 사람은 새 상한에 따라 더 받을 수도 있어서, 그런 경우에만 하루 금액과 합계를 '최소'로 보여 줘요.</li>
<li>{date_ko(U['change2028'])}부터는 구직급여를 계산하는 기준이 평균임금에서 보수(이직 전 1년 동안 신고된 보수)로 바뀔 예정이에요(고용보험법 제45조 시행 예정 조문). 그 뒤의 이직은 계산하지 않아요.</li>
</ul></div>'''
    return (sec('계산 기준과 출처', table(['항목', '기준', '출처'], rows), 'basis', cls='', lead=checked_line('ko'))
            + sec('이렇게 계산해요', how) + sec('받을 수 있는지는 고용센터가 정해요', req)
            + tool_cards('ko', 'ub') + guide_links('ko', ['sileopgeupyeo-haru-geumaek', 'toejikgeum-gyesan-yeje']))


# ───────── 연차(한국어) ─────────
def leave_below():
    rows = [
        ('1년 미만', f'1개월 개근할 때마다 1일(최대 {L["firstYearMax"]}일)', srcs(['lsa60'])),
        ('1년을 채우면', f'1년간 {L["attendPct"]}% 이상 출근했으면 {L["base"]}일', srcs(['lsa60'])),
        ('3년 이상', f'처음 1년을 넘는 근속 {L["addEveryYears"]}년마다 1일 더. 한도 {L["cap"]}일', srcs(['lsa60'])),
        ('적용되지 않는 경우', f'4주 평균 주 {L["minWeekHours"]}시간 미만, 상시 {L["minWorkers"] - 1}명 이하 사업장', srcs(L['src']['exclude'])),
    ]
    how = f'''<div class="prose">
{quote('lsa60_1')}{quote('lsa60_2')}{quote('lsa60_4')}
<ul>
<li>1년 동안 {L["attendPct"]}% 이상 출근했다고 보고 계산해요. 출근율이 그보다 낮으면 달라져요.</li>
<li>생긴 연차는 1년 동안 쓸 수 있어요. 1년 미만일 때 다달이 생긴 연차는 입사 후 1년이 되는 날까지예요(근로기준법 제60조 제7항).</li>
<li>회계연도(1월 1일) 기준으로 연차를 주는 회사는 날짜가 달라요. 회사마다 달라서 이 계산기는 입사일 기준만 계산해요.</li>
</ul>
<h3>이 계산기의 방식</h3>
<p>한 달과 1년이 찼는지는 달력의 같은 날짜로 따져요. 그 날짜가 없는 달은 말일에 찬 것으로 봐요(1월 31일에 입사하면 2월 말일에 한 달이 차고, 첫 연차는 다음 날인 {date_ko(F['leaveJan31'])[6:]}에 생겨요). 회사·고용센터 계산과 하루 차이가 날 수 있어요.</p>
</div>'''
    return (sec('계산 기준과 출처', table(['구분', '기준', '출처'], rows), 'basis', cls='', lead=checked_line('ko'))
            + sec('이렇게 계산해요', how)
            + tool_cards('ko', 'leave') + guide_links('ko', ['juhyu-sudang-gyesan', 'toejikgeum-gyesan-yeje']))


# ───────── 연봉 표 ─────────
def table_below(lang):
    n3, n5, n7 = F['net3000'], F['net5000'], F['net7000']
    if lang == 'ko':
        txt = f'''<div class="prose">
<p>표의 모든 칸은 <a href="/">연봉 실수령액 계산기</a>와 같은 식으로 계산했어요. 연봉 {man(n3['annual'])}이면 한 달에 {c(n3['net'])}원, {man(n4['annual'])}이면 {c(n4['net'])}원, {man(n5['annual'])}이면 {c(n5['net'])}원, {man(n7['annual'])}이면 {c(n7['net'])}원이에요.</p>
<ul>
<li>가정: 부양가족 1명(본인), 비과세 식대 월 {man(N["nontaxMeal"])}, 세금 떼는 비율 100%, 월급 = 연봉 ÷ 12. 만 {N["pensionExemptAge"]}세 미만이라 국민연금과 고용보험을 내는 경우예요.</li>
<li>기준: {P0_KO}. 국민연금 {pen["ratePct"]}%, 건강보험 {hi["ratePct"]}%, 장기요양 건강보험료 × {care["ratePct"]}% ÷ {care["healthPct"]}%, 고용보험 {emp["ratePct"]}%, 간이세액표 {EFF_KO} 시행.</li>
<li>국민연금은 매기는 월 소득이 {man(pen["baseMax"])}에서 멈춰요. 그 위 연봉에서는 국민연금 칸이 같아요.</li>
<li>부양가족이 늘거나 {N["childAgeFrom"]}~{N["childAgeTo"]}세 자녀가 있으면 소득세가 줄어요. 줄을 누르면 그 연봉으로 계산기가 열려요.</li>
</ul>
<p class="note">출처와 확인한 날은 <a href="/about/#basis">소개와 계산 기준</a>에 있어요. 마지막 확인 {CHECKED}.</p></div>'''
        return sec('이 표는 이렇게 만들었어요', txt) + tool_cards(lang, 'table') + guide_links(lang, ['myeongseseo-dareun-iyu', '2026-4dae-boheom-yoyul'])
    txt = f'''<div class="prose">
<p>Every cell is calculated the same way as the <a href="/en/">net salary calculator</a>. A salary of {wn(n3['annual'])} leaves {wn(n3['net'])} a month, {wn(n4['annual'])} leaves {wn(n4['net'])}, {wn(n5['annual'])} leaves {wn(n5['net'])} and {wn(n7['annual'])} leaves {wn(n7['net'])}.</p>
<ul>
<li>Assumptions: one dependent (you), a {wn(N["nontaxMeal"])} monthly non-taxable meal allowance, withholding at 100%, monthly pay = salary ÷ 12, and a worker under {N["pensionExemptAge"]} who pays the National Pension and Employment Insurance.</li>
<li>Rules as of {P0_EN}: National Pension {pen["ratePct"]}%, National Health Insurance {hi["ratePct"]}%, Long-term Care Insurance at the health premium × {care["ratePct"]}% ÷ {care["healthPct"]}%, Employment Insurance {emp["ratePct"]}%, and the withholding table in force since {EFF_EN}.</li>
<li>The income used for the National Pension stops at {wn(pen["baseMax"])} a month, so the pension column stays the same above that.</li>
<li>More dependents, or children aged {N["childAgeFrom"]} to {N["childAgeTo"]}, lower the income tax. Click a row to open that salary in the calculator. It uses the standard monthly withholding table that applies to residents.</li>
</ul>
<p class="note">Sources and the day we checked them are on the <a href="/en/about/#basis">about page</a>. Last checked {CHECKED}.</p></div>'''
    return sec('How this table was made', txt) + tool_cards(lang, 'table') + guide_links(lang, ['payroll-deductions-korea'])


# ───────── 소개(전체 근거표) ─────────
def about(lang):
    ko = lang == 'ko'
    sl = lambda keys: srcs(keys, lang)
    d = (lambda x: f'<span class="nw">{date_ko(x)}</span>') if ko else (lambda x: f'<span class="nw">{date_en(x)}</span>')
    sched = ', '.join(f'{r["year"]}{"년" if ko else ""} {r["pct"]}%' for r in D['pensionSchedule']['rows'][2:])
    dd = U['days']
    if ko:
        rows = [
            ('국민연금 요율(근로자 몫)', f'{pen["ratePct"]}%', f'{d(pen["from"])}~{d(pen["until"])}', sl(pen['src'])),
            (f'국민연금 {Y1}년 요율', f'{NXT["pension"]["ratePct"]}% <span class="tag-st">확정</span>', f'{d(NXT["pension"]["from"])}부터', sl(NXT['pension']['src'])),
            ('국민연금 그 뒤 요율', sched, '해마다 1월', sl(D['pensionSchedule']['src'])),
            ('국민연금을 매기는 월 소득(기준소득월액)', f'<span class="nw">{man0(pen["baseMin"])}~{man(pen["baseMax"])}</span>, 천 원 미만 버림', f'{d(pen["limitFrom"])}~{d(pen["limitUntil"])}', sl(pen['limitSrc'])),
            ('국민연금 가입 대상', f'만 {N["pensionExemptAge"]}세 미만. 만 {N["pensionExemptAge"]}세 이상은 떼지 않음(임의계속가입을 신청한 사람만 계속 냄)', '', sl(N['pensionExemptSrc'])),
            ('건강보험 요율(근로자 몫)', f'{hi["ratePct"]}% (합계 {hi["totalPct"]}%의 절반)', f'{d(hi["from"])}부터', sl(hi['src'])),
            (f'건강보험 {Y1}년 요율', f'{NXT["health"]["totalPct"]}% 그대로 <span class="tag-st">의결</span>', f'{d(S["mohw2027"]["date"])} 의결', sl(NXT['health']['src'])),
            ('건강보험료 한 달 상·하한(근로자 몫)', f'{c(hi["employeeMin"])}원~{c(hi["employeeMax"])}원 (고시의 {c(hi["totalMin"])}원~{c(hi["totalMax"])}원은 회사 몫을 합친 금액)', f'{d(hi["limitFrom"])}부터. {Y1}년 값은 {HOLD_KO}', sl(hi['limitSrc'])),
            ('장기요양보험료', f'건강보험료 × {care["ratePct"]}% ÷ {care["healthPct"]}%', f'{d(care["from"])}부터. {Y1}년 요율은 {HOLD_KO}', sl(NXT['care']['src'])),
            ('고용보험 요율(근로자 몫)', f'{emp["ratePct"]}%. {N["employmentExemptAge"]}세 이후에 새로 고용된 사람은 떼지 않음', '현행 시행령', sl(emp['src'])),
            ('소득세(매달 떼는 금액)', f'근로소득 간이세액표. 월 {man(G["first"])}부터 {man(G["last"])}까지 {c(G["count"])}줄, 그 위는 표 주석의 계산식', f'{d(G["effective"])} 시행', sl(NOW['incomeTax']['src'])),
            ('자녀가 있을 때 빼는 금액', f'{N["childAgeFrom"]}~{N["childAgeTo"]}세 자녀 1명 {c(CH["one"])}원, 2명 {c(CH["two"])}원, 3명부터 한 명에 {c(CH["eachOverTwo"])}원씩 더', f'{d(G["effective"])} 시행', sl(['gani'])),
            ('세금 떼는 비율', f'회사에 신청하면 덜({N["ratios"][0]}%) 또는 더({N["ratios"][2]}%) 뗄 수 있음', '', sl(N['ratioSrc'])),
            ('지방소득세', f'소득세의 {NOW["localTax"]["ratePct"]}%', '', sl(NOW['localTax']['src'])),
            ('비과세 식대', f'월 {man(N["nontaxMeal"])}까지(식사를 제공받지 않는 사람)', '', sl(N['nontaxSrc'])),
            ('보험료를 매기는 소득', '비과세 근로소득을 뺀 금액(고용보험은 법 문장까지만 확인)', '', sl(N['baseSrc']['pension'] + N['baseSrc']['health'] + N['baseSrc']['employment'])),
            ('끝수', f'보험료·세금 각각 {R["pension"]}원 미만 버림(이 계산기의 방식)', '', sl(R['src'])),
            (f'최저임금 {Y0}년', f'시간급 {c(mw0["hourly"])}원, 일급 {c(mw0["daily8"])}원, 월급 {c(mw0["monthly209"])}원', f'{d(mw0["from"])}~{d(mw0["until"])}', sl(mw0['src'])),
            (f'최저임금 {Y1}년', f'시간급 {c(mw1["hourly"])}원, 일급 {c(mw1["daily8"])}원, 월급 {c(mw1["monthly209"])}원 <span class="tag-st">확정</span>', f'{d(mw1["from"])}~{d(mw1["until"])}', sl(mw1['src'])),
            ('월 환산 시간', f'주 {H["fullWeekHours"]}시간이면 {H["monthlyHours40"]}시간(유급 주휴 {H["fullDayHours"]}시간 포함)', '', sl(H['src']['monthly'])),
            ('주휴수당', f'주 {H["minWeekHours"]}시간 이상, 소정근로일 개근. 1일 소정근로시간 × 시급', '', sl(['lsa55', 'lsaDecree30', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly'])),
            ('퇴직금', f'1일 평균임금 × {SV["payDays"]}일 × 재직일수 ÷ {SV["daysPerYear"]}. 1년 이상, 주 {SV["minWeekHours"]}시간 이상. {SV["payWithinDays"]}일 안에 지급', '', sl(['sevLaw8', 'sevLaw4', 'sevLaw9', 'lsa2', 'moelSev'])),
            ('구직급여(실업급여)', f'평균임금의 {U["rateNum"]}%. 하루 상한 {c(U["upper"])}원(기초일액 {c(U["baseMax"])}원), 하한은 8시간 기준 {c(U["lowerByHours"]["8"])}원. 받는 날 수 {min(dd["under50"])}~{max(dd["over50"])}일, 대기기간 {U["waitDays"]}일', f'{d(U["from"])} 이후 이직. {NY}년 이직의 하한은 {U["maxDayHours"]}시간 기준 {c(F["ub"]["lowerNext8"])}원 <span class="tag-st">확정</span>, 상한은 {HOLD_KO}', sl(['eiLaw', 'eiDecree68', 'moel1350Ub', 'eiTable1', 'minWageNotice2027'])),
            ('연차', f'1년 미만 다달이 1일(최대 {L["firstYearMax"]}일), 1년 {L["base"]}일, {L["addEveryYears"]}년마다 1일 더, 한도 {L["cap"]}일', '', sl(['lsa60', 'lsa18', 'lsa11'])),
        ]
        return f'''<h1>떼고얼마 소개와 계산 기준</h1>
<p class="meta">마지막 확인 <time datetime="{CHECKED}">{CHECKED}</time> · 루멘랩</p>
<div class="prose">
<p>떼고얼마는 한국에서 일하는 사람의 급여를 계산하는 무료 도구예요. 연봉·월급 실수령액, 퇴직금, 시급과 주휴수당, 실업급여(구직급여), 연차를 계산해요. 회원 가입이 없고, 입력한 금액과 날짜는 브라우저 안에서만 계산해요.</p>
<h2>무엇이 다른가요</h2>
<ul>
<li>결과 옆에 어느 시기의 기준인지 적어요. 지금은 {P0_KO} 기준이에요.</li>
<li>떼는 돈을 한 줄씩 식과 함께 보여 줘요. 급여명세서와 한 줄씩 맞춰 볼 수 있어요.</li>
<li>{Y1}년에 바뀌는 것은 확정된 것, 의결된 것, 아직 안 정해진 것으로 나눠 보여 줘요. 안 정해진 값을 지어내지 않아요.</li>
<li>숫자는 법령과 공단·부처 자료를 직접 열어 확인한 것만 써요. 확인한 날을 같이 적어요.</li>
</ul>
<h2 id="basis">계산 기준 전체 표</h2>
<p>값, 적용 기간, 출처예요. 출처는 전부 {CHK_KO}에 직접 열어 확인했어요.</p>
{table(['항목', '값', '시행·적용', f'출처(확인 {CHECKED})'], rows, labels=['항목', '', '적용', '출처'])}
<h2>이 계산기가 정한 방식</h2>
<p>법령·공단 자료에서 계산 방법을 끝까지 확인하지 못한 곳은 아래처럼 정했어요. 그래서 회사·공단·고용센터의 계산과 조금 다를 수 있어요.</p>
<ul>
<li>보험료와 세금은 각각 {R["pension"]}원 미만을 버려요({src('treasury47', text='국고금관리법 제47조')}의 끝수 계산 방식).</li>
<li>소득세는 표 금액에서 자녀 공제를 빼고, 세금 떼는 비율을 곱한 다음, 마지막에 {R["incomeTax"]}원 미만을 버려요. 월 {man(G["last"])}이 넘어 표 주석의 계산식을 쓸 때는 계산식 금액의 원 미만을 먼저 버려요.</li>
<li>퇴직금: 퇴직 전 3개월의 날짜 수와 끝수는 고용노동부 「퇴직금 계산」 화면에 맞췄어요. 3개월 전 달에 그 날짜가 없으면 그 달 말일부터, 3개월 전이 2월이면 3월 1일부터 세어요. 1일 평균임금은 전 단위에서 올리고(고용노동부 예제의 {c(E['avgWon'])}원 {E['avgJeon']}전과 같은 값), 퇴직금은 원 미만을 반올림해요.</li>
<li>연차에서 한 달·1년이 찼는지는 달력의 같은 날짜로 따지고, 그 날짜가 없는 달은 말일에 찬 것으로 봐요.</li>
<li>구직급여 하루 금액은 3개월 임금 × {U["rateNum"]}% ÷ 그 기간의 달력 날짜 수를 한 번에 계산하고 원 미만만 버려요. 날짜 수는 퇴직금과 같은 방식으로 세어요.</li>
<li>시급 → 월급은 원 미만을 올리고, 월급 → 시급은 원 미만을 버려요. 주 {H["fullWeekHours"]}시간보다 짧게 일할 때의 월 환산 시간은 식 그대로 계산하고 화면에는 소수 첫째 자리까지 보여 줘요.</li>
<li>퇴직금이 들어 있는 연봉은 13으로 나눠 월급을 구해요(흔히 쓰는 어림).</li>
<li>금액 칸에 숫자만 쓰면 만 원으로 읽어요(시급·1일 통상임금 칸은 원). 읽은 값은 칸 아래에 늘 보여 줘요.</li>
</ul>
<h2>하지 않는 것</h2>
<ul>
<li>연말정산 결과, 퇴직소득세는 계산하지 않아요. 소득세는 매달 미리 떼는 금액만 계산해요.</li>
<li>퇴직금이나 실업급여를 받을 수 있는지 판정하지 않아요. 법에 적힌 요건만 보여 줘요.</li>
<li>세무·노무 상담이 아니에요. 정확한 금액은 급여명세서, 국민연금공단, 국민건강보험공단, 고용센터에서 확인하세요.</li>
</ul>
<h2>만든 곳</h2>
<p>루멘랩(Lumen Lab)이 만들고 운영해요. 틀린 숫자나 바뀐 기준을 보면 <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>으로 알려 주세요. 루멘랩의 다른 앱과 도구는 <a href="https://lumenlab.page/">lumenlab.page</a>에 있어요.</p>
<p class="note">글꼴은 Pretendard(SIL Open Font License 1.1)에서 이 사이트에 나오는 글자만 추린 것을 써요. <a href="/assets/fonts/OFL.txt">라이선스 전문</a></p>
</div>'''
    rows = [
        (f'National Pension {kospan("국민연금")}, employee rate', f'{pen["ratePct"]}%', f'{d(pen["from"])} to {d(pen["until"])}', sl(pen['src'])),
        (f'National Pension rate for {Y1}', f'{NXT["pension"]["ratePct"]}% <span class="tag-st">set by law</span>', f'from {d(NXT["pension"]["from"])}', sl(NXT['pension']['src'])),
        ('National Pension rate after that', sched, 'each January', sl(D['pensionSchedule']['src'])),
        ('Income used for the National Pension', f'{wn(pen["baseMin"])} to {wn(pen["baseMax"])} a month, amounts under {wn(pen["baseUnit"])} dropped', f'{d(pen["limitFrom"])} to {d(pen["limitUntil"])}', sl(pen['limitSrc'])),
        ('Who pays the National Pension', f'workers under {N["pensionExemptAge"]}; not collected from people aged {N["pensionExemptAge"]} or older unless they chose to stay in voluntarily', '', sl(N['pensionExemptSrc'])),
        (f'National Health Insurance {kospan("건강보험")}, employee rate', f'{hi["ratePct"]}%, half of {hi["totalPct"]}%', f'from {d(hi["from"])}', sl(hi['src'])),
        (f'Health insurance rate for {Y1}', f'{NXT["health"]["totalPct"]}% kept <span class="tag-st">approved</span>', f'approved {d(S["mohw2027"]["date"])}', sl(NXT['health']['src'])),
        ('Monthly health premium limits, employee share', f'{wn(hi["employeeMin"])} to {wn(hi["employeeMax"])}; the notice states {wn(hi["totalMin"])} to {wn(hi["totalMax"])} for employee and employer together', f'from {d(hi["limitFrom"])}; {Y1} values {HOLD_EN}', sl(hi['limitSrc'])),
        (f'Long-term Care Insurance {kospan("장기요양보험")}', f'health premium × {care["ratePct"]}% ÷ {care["healthPct"]}%', f'from {d(care["from"])}; {Y1} rate {HOLD_EN}', sl(NXT['care']['src'])),
        (f'Employment Insurance {kospan("고용보험")}, employee rate', f'{emp["ratePct"]}%; not collected from people hired after turning {N["employmentExemptAge"]}', 'current decree', sl(emp['src'])),
        (f'Income tax (monthly withholding) {kospan("소득세")}', f'simplified withholding table: {c(G["count"])} rows from {wn(G["first"])} to {wn(G["last"])} a month, and the formula in the table notes above that', f'in force since {d(G["effective"])}', sl(NOW['incomeTax']['src'])),
        ('Reduction for children', f'children aged {N["childAgeFrom"]} to {N["childAgeTo"]}: {wn(CH["one"])} for one, {wn(CH["two"])} for two, {wn(CH["eachOverTwo"])} more for each further child', f'in force since {d(G["effective"])}', sl(['gani'])),
        ('Withholding rate', f'{N["ratios"][0]}% or {N["ratios"][2]}% of the table amount on request', '', sl(N['ratioSrc'])),
        (f'Local income tax {kospan("지방소득세")}', f'{NOW["localTax"]["ratePct"]}% of the income tax', '', sl(NOW['localTax']['src'])),
        ('Tax-free meal allowance', f'up to {wn(N["nontaxMeal"])} a month for workers who are not given meals', '', sl(N['nontaxSrc'])),
        ('Income the premiums are charged on', 'pay minus non-taxable earned income (for Employment Insurance, the Act’s wording only)', '', sl(N['baseSrc']['pension'] + N['baseSrc']['health'] + N['baseSrc']['employment'])),
        ('Rounding', f'each premium and tax rounded down to {wn(R["pension"])} (this calculator’s method)', '', sl(R['src'])),
        (f'Minimum wage {kospan("최저임금")}, {Y0}', f'{wn(mw0["hourly"])} an hour, {wn(mw0["daily8"])} a day, {wn(mw0["monthly209"])} a month', f'{d(mw0["from"])} to {d(mw0["until"])}', sl(mw0['src'])),
        (f'Minimum wage, {Y1}', f'{wn(mw1["hourly"])} an hour, {wn(mw1["daily8"])} a day, {wn(mw1["monthly209"])} a month <span class="tag-st">set</span>', f'{d(mw1["from"])} to {d(mw1["until"])}', sl(mw1['src'])),
        ('Hours per month', f'{H["monthlyHours40"]} for a {H["fullWeekHours"]}-hour week, including {H["fullDayHours"]} paid holiday hours a week', '', sl(H['src']['monthly'])),
        (f'Weekly holiday allowance {kospan("주휴수당")}', f'{H["minWeekHours"]} hours a week or more and full attendance; contractual hours of one day × hourly wage', '', sl(['lsa55', 'lsaDecree30', 'lsa18', 'lsaDecreeT2', 'moel1350Weekly'])),
        (f'Severance pay {kospan("퇴직금")}', f'average daily wage × {SV["payDays"]} days × days of service ÷ {SV["daysPerYear"]}; one year or more and {SV["minWeekHours"]} hours a week or more; paid within {SV["payWithinDays"]} days', '', sl(['sevLaw8', 'sevLaw4', 'sevLaw9', 'lsa2', 'moelSev'])),
    ]
    return f'''<h1>About Takehome Korea and where every number comes from</h1>
<p class="meta">Last checked <time datetime="{CHECKED}">{CHECKED}</time> · Lumen Lab</p>
<div class="prose">
<p>Takehome Korea is a free calculator for people who work in Korea. It works out take-home pay from an annual or monthly salary, severance pay, and hourly pay with the weekly holiday allowance, all under Korean rules. There are no accounts, and the amounts and dates you enter are calculated inside your browser.</p>
<h2>What it does differently</h2>
<ul>
<li>It says which period’s rules it is using, right beside the result. At the moment that is {P0_EN}.</li>
<li>It shows the math for every deduction, so you can compare it line by line with your Korean payslip. Korean names are shown next to the English ones.</li>
<li>For {Y1} it separates what is set by law, what has been approved, and what is not decided yet. It does not guess the undecided figures.</li>
<li>Every figure was read from the law or the agency notice itself, and the day we checked is shown.</li>
</ul>
<p>This calculator uses the standard monthly withholding table that applies to residents.</p>
<h2 id="basis">The full table of rules</h2>
<p>Values, periods and sources. Every source was opened and checked on {CHK_EN}. The source pages are in Korean.</p>
{table(['Item', 'Value', 'In force', f'Source (checked {CHECKED})'], rows, labels=['Item', '', 'In force', 'Source'])}
<h2>Conventions this calculator chose</h2>
<p>Where the laws and notices we read do not spell out the arithmetic to the last step, we chose the following. Your employer’s or an agency’s figures can therefore differ slightly.</p>
<ul>
<li>Each premium and tax is rounded down to {wn(R["pension"])}, following the rounding rule of the {src('treasury47', 'en')}.</li>
<li>For income tax, the child reduction comes off the table amount, the withholding rate is applied, and the result is then rounded down to {wn(R["incomeTax"])}. Above {wn(G["last"])} a month the formula amount first drops its won fractions.</li>
<li>For severance pay, the days in the last three months and the rounding follow the ministry’s calculator: if the day does not exist three months earlier the count starts on that month’s last day, or on 1 March when that month is February. The average daily wage is rounded up at the second decimal and the final amount is rounded to the nearest won.</li>
<li>Hourly to monthly pay rounds won fractions up, monthly to hourly drops them. For weeks shorter than {H["fullWeekHours"]} hours, hours per month follow the formula as is and are shown to one decimal.</li>
<li>A salary that includes severance is divided by 13 to get monthly pay, a common rule of thumb.</li>
<li>Amounts are read in won exactly as typed, and what was read is always shown under the field.</li>
</ul>
<h2>What it does not do</h2>
<ul>
<li>It does not calculate the year-end tax settlement or retirement income tax. Income tax here is the monthly withholding only.</li>
<li>It does not decide whether you qualify for severance pay. It shows the requirements written in the law.</li>
<li>It is not tax or labor advice. Check exact amounts on your payslip or with the National Pension Service, the National Health Insurance Service or a local employment center.</li>
</ul>
<h2>Who runs it</h2>
<p>Takehome Korea is made and run by Lumen Lab. If you spot a wrong figure or a rule that has changed, write to <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>. More apps and tools are at <a href="https://lumenlab.page/en/">lumenlab.page</a>.</p>
<p class="note">The typeface is a subset of Pretendard, under the SIL Open Font License 1.1. <a href="/assets/fonts/OFL.txt">License text</a></p>
</div>'''


# ───────── 개인정보 처리방침 ─────────
def privacy(lang):
    if lang == 'ko':
        return f'''<h1>개인정보 처리방침</h1>
<p class="meta">시행일 {date_ko(CHECKED)} · 운영 루멘랩(Lumen Lab)</p>
<div class="prose">
<h2>입력한 금액과 날짜</h2>
<p>떼고얼마는 계산을 이용자의 브라우저 안에서 해요. 입력한 연봉, 월급, 날짜, 조건은 저희를 포함해 어디에도 전송되지 않아요. 회원 가입은 없어요.</p>
<h2>기기에 저장하는 정보</h2>
<p>두 가지예요.</p>
<ul>
<li>계산기에 넣은 값: 다른 페이지를 보고 돌아와도 이어서 볼 수 있게 이 탭의 임시 저장소(sessionStorage의 <code>tk.in</code>)에 둬요. 이 탭을 닫으면 사라져요.</li>
<li>언어 선택: 다른 언어판 안내 띠를 닫거나 언어 링크를 누르면, 띠를 다시 띄우지 않으려고 그 선택을 브라우저 저장소(localStorage의 <code>tk.lang</code>)에 기억해요.</li>
</ul>
<p>둘 다 이 기기 안에만 있고, 브라우저의 사이트 데이터 지우기로 언제든 지울 수 있어요. 그 밖에는 저장하지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="https://policies.google.com/technologies/partner-sites?hl=ko">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="https://www.google.com/settings/ads">Google 광고 설정</a>에서 끌 수 있어요. 입력한 금액과 날짜는 광고에 쓰이지 않아요.</p>
<h2>방문 통계</h2>
<p>방문 통계는 <a href="https://www.cloudflare.com/web-analytics/">Cloudflare Web Analytics</a>로 봐요. 어느 페이지를 몇 번 봤는지, 직전에 본 페이지 주소, 브라우저 종류, 페이지가 얼마나 빨리 떴고 어디가 느렸는지 같은 성능 정보예요. Cloudflare 설명으로는 쿠키나 기기 저장소를 쓰지 않아요. 계산기에 넣은 금액과 날짜는 여기에 실리지 않아요.</p>
<h2>글꼴과 서버 기록</h2>
<p>글꼴은 이 사이트에서 함께 받아요. 글꼴 때문에 다른 곳에 접속하지 않아요. 사이트는 Cloudflare에서 제공되고, Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요. 입력한 금액과 날짜는 받지 않아요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>
</div>'''
    return f'''<h1>Privacy policy</h1>
<p class="meta">Effective {date_en(CHECKED)} · Operated by Lumen Lab</p>
<div class="prose">
<h2>The amounts and dates you enter</h2>
<p>Takehome Korea does its calculations inside your browser. The salaries, dates and conditions you enter are not sent to us or to anyone else. There are no accounts.</p>
<h2>What is stored on your device</h2>
<p>Two things.</p>
<ul>
<li>What you typed into a calculator is kept in this tab’s temporary storage (sessionStorage, the key <code>tk.in</code>) so it is still there when you come back from another page. It is gone when you close the tab.</li>
<li>If you close the language suggestion bar or follow a language link, that choice is saved in your browser’s localStorage (the key <code>tk.lang</code>) so the bar does not come back.</li>
</ul>
<p>Both stay on this device, and clearing site data removes them. Nothing else is stored.</p>
<h2>Ads</h2>
<p>This site shows ads through Google AdSense. Google and other ad vendors use cookies to serve ads based on your visits to this and other websites. Because of these ads, third parties such as Google may place or read cookies in your browser and collect information through web beacons (tiny invisible images). See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites or apps that use its services</a>. You can turn off personalized ads in <a href="https://www.google.com/settings/ads">Google Ad Settings</a>. The amounts and dates you enter are not used for ads.</p>
<h2>Visit statistics</h2>
<p>We look at visit statistics through <a href="https://www.cloudflare.com/web-analytics/">Cloudflare Web Analytics</a>: which pages were viewed, the page you came from, the kind of browser, and performance data such as how fast a page loaded and which part was slow. According to Cloudflare, it does not use cookies or local storage. Nothing you type into the calculators is included.</p>
<h2>Fonts and server logs</h2>
<p>The typeface is served from this site, so fonts do not make your browser contact anyone else. The site is served by Cloudflare, which may briefly keep basic request logs such as IP addresses to run the service securely. It does not receive the amounts or dates you enter.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>
</div>'''
