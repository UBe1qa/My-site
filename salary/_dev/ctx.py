"""빌드가 같이 쓰는 값과 도우미.

- CALC: `node _dev/calc.mjs` 가 낸 JSON(자료 파일 + 로직으로 계산한 값 + 미리 그린 결과). 화면·글의 숫자는 전부 여기서 나온다.
- Q: 법령·공단 원문 인용. 확인된 사실 파일에 있는 문장을 글자 그대로 옮긴 것만 둔다(_dev/check.py 가 대조한다).
- SRC_EN: 출처의 영어 이름(공식 영문 이름이 아니라 뜻을 풀어 쓴 것).
"""
import html
import json
import subprocess
import urllib.parse
from pathlib import Path

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
SITE = 'https://salary.lumenlab.page'
CALC = json.loads(subprocess.run(['node', str(DEV / 'calc.mjs')], check=True, capture_output=True, text=True).stdout)
D, F, G, PRE = CALC['data'], CALC['facts'], CALC['gani'], CALC['pre']
NOWID, NEXTID = CALC['now'], CALC['next']
NOW, NXT = D['periods'][NOWID], D['periods'][NEXTID]
S = D['sources']
CHECKED = D['checked']
Y0, Y1 = NOW['year'], NXT['year']
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

esc = lambda s: html.escape(str(s), quote=True)


def c(n):
    return f'{n:,}'


def won(n):
    return f'{n:,}원'


def wn(n):
    return f'₩{n:,}'


def man(n):
    """3,130,000 → '313만 원' (pay-core.js readKo 와 같은 꼴)"""
    if n < 10000:
        return f'{n:,}원'
    eok, m, rest = n // 100000000, n % 100000000 // 10000, n % 10000
    parts = ([f'{eok:,}억'] if eok else []) + ([f'{m:,}만'] if m else [])
    return ' '.join(parts) + (f' {rest:,}원' if rest else ' 원')


def man0(n):
    """'4,000만 원' → '4,000만' (표·단추용)"""
    return man(n)[:-2] if man(n).endswith(' 원') else man(n)


def date_ko(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return f'{y}년 {m}월 {d}일'


def date_en(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return f'{d} {MONTHS[m - 1]} {y}'


def period_ko(pid):
    y, m = pid.split('-')
    return f'{y}년 {int(m)}월'


def period_en(pid):
    y, m = pid.split('-')
    return f'{MONTHS[int(m) - 1]} {y}'


def hrs(x):
    return str(round(x)) if abs(x - round(x)) < 1e-9 else f'{x:.1f}'


def href(u):
    """한글이 든 법령 주소를 퍼센트 인코딩한다(주소 자체는 자료 파일 그대로)."""
    return urllib.parse.quote(u, safe=":/?&=#%()~,+@!$'*;")


SRC_EN = {
    'npsLaw': 'National Pension Act, Article 88 and Addenda (Act No. 20903) Article 4',
    'npsLaw6': 'National Pension Act, Articles 6 and 8 (who is covered)',
    'npsGuide': 'National Pension Service: contribution amounts and rates',
    'nhisRate': 'National Health Insurance Service: notice of the 2026 contribution rates',
    'nhisLimit': 'Notice on the monthly ceiling and floor of health insurance premiums (Ministry of Health and Welfare Notice 2025-222)',
    'mohw2027': 'Ministry of Health and Welfare press release of 8 September 2026 on the 2027 health insurance rate',
    'mohwCare2027': 'Ministry of Health and Welfare press release of 14 August 2026 on when the 2027 long-term care rate will be set',
    'eiRateDecree': 'Enforcement Decree of the Insurance Premium Collection Act, Article 12',
    'eiRateLaw': 'Insurance Premium Collection Act, Article 13',
    'gani': 'Enforcement Decree of the Income Tax Act, Table 2: simplified withholding table for earned income',
    'ganiRatio': 'Enforcement Decree of the Income Tax Act, Article 194',
    'localTax': 'Local Tax Act, Article 103-13',
    'meal': 'Income Tax Act, Article 12, subparagraph 3',
    'minWage': 'Minimum Wage Commission: minimum wage by year',
    'minWageNotice2027': 'Ministry of Employment and Labor Notice 2026-60: minimum wage for 2027',
    'minWageDecree5': 'Enforcement Decree of the Minimum Wage Act, Article 5',
    'sevLaw4': 'Act on the Guarantee of Employees’ Retirement Benefits, Article 4',
    'sevLaw8': 'Act on the Guarantee of Employees’ Retirement Benefits, Article 8',
    'sevLaw9': 'Act on the Guarantee of Employees’ Retirement Benefits, Article 9',
    'lsa2': 'Labor Standards Act, Article 2',
    'lsa11': 'Labor Standards Act, Article 11 and Enforcement Decree Table 1',
    'lsa18': 'Labor Standards Act, Article 18',
    'lsa55': 'Labor Standards Act, Article 55',
    'lsa60': 'Labor Standards Act, Article 60',
    'lsaDecreeT2': 'Enforcement Decree of the Labor Standards Act, Table 2',
    'lsaDecree30': 'Enforcement Decree of the Labor Standards Act, Article 30',
    'moelSev': 'Ministry of Employment and Labor: severance pay calculator',
    'moel1350Weekly': 'Ministry of Employment and Labor 1350 counselling answers on the weekly holiday allowance',
    'eiLaw': 'Employment Insurance Act, Articles 40, 45, 46 and 49',
    'eiDecree68': 'Enforcement Decree of the Employment Insurance Act, Article 68',
    'eiTable1': 'Employment Insurance Act, Table 1: days of job-seeking benefit',
    'moel1350Ub': 'Ministry of Employment and Labor 1350 counselling answer on benefit ceilings and floors',
    'treasury47': 'Management of the National Funds Act, Article 47',
    'nhisDecree33': 'Enforcement Decree of the National Health Insurance Act, Article 33',
    'npsDecree3': 'Enforcement Decree of the National Pension Act, Article 3',
    'eiLaw2': 'Insurance Premium Collection Act, Article 2',
}
assert set(SRC_EN) == set(S), sorted(set(S) ^ set(SRC_EN))


def src(key, lang='ko', text=None):
    """출처 링크. 새 탭으로 연다(계산기에 넣은 값을 둔 채 원문을 볼 수 있게)."""
    s = S[key]
    if lang == 'ko':
        return f'<a href="{href(s["url"])}" target="_blank" rel="noopener">{esc(text or s["name"])}</a>'
    return f'<a href="{href(s["url"])}" target="_blank" rel="noopener" hreflang="ko">{esc(text or SRC_EN[key])}</a>'


def srcs(keys, lang='ko'):
    """출처 링크 묶음(표의 출처 칸). 링크마다 한 줄이고, 휴대폰에서는 줄마다 44px 높이로 눌린다(style.css .srcs)."""
    seen, out = set(), []
    for k in keys:
        if k not in seen:
            seen.add(k)
            out.append(src(k, lang))
    return '<span class="srcs">' + ''.join(out) + '</span>'


# 원문 인용(글자 그대로). 키: (출처 키, 인용문)
Q = {
    'nps_once': ('npsGuide', '기준소득월액은 1년에 한번 산정하므로 실제 보수와는 맞지 않을 수 있습니다.'),
    'nps_base': ('npsGuide', '기준소득월액이란 국민연금의 보험료 및 급여 산정을 위하여 가입자가 신고한 소득월액에서 천원 미만을 절사한 금액을 말하며, 최저 41만원에서 최고 659만원까지의 범위로 결정하게 됩니다.'),
    'nps_formula': ('npsGuide', '연금보험료 = 가입자의 기준소득월액 × 연금보험료율'),
    'nps_rise': ('npsGuide', '1998년 이후부터 2025년까지는 9%의 보험료율이 적용되었으며, 2026년부터는 매년 0.5%p씩 보험료율을 8년간 인상하여 2033년부터는 13%의 보험료율이 적용됩니다.'),
    'nhis_rate': ('nhisRate', '보수월액보험료(월) = 보수월액 × 보험료율(7.19%) ※ 가입자 및 사용자 각각 50%씩 부담'),
    'care_formula': ('nhisRate', '장기요양보험료 = 건강보험료 × 장기요양보험료율(0.9448%)/건강보험료율(7.19%)'),
    'mohw2027': ('mohw2027', '2027년도 건강보험료율을 동결하여 올해와 동일한 7.19%로 결정하였다.'),
    'care2027': ('mohwCare2027', '2027년 수가 및 장기요양보험료율은 … 향후 장기요양 실무위원회 및 위원회 논의를 거쳐 10월 이후 결정할 예정이다.'),
    'ei_half': ('eiRateLaw', '고용보험 가입자인 근로자가 부담하여야 하는 고용보험료는 자기의 보수총액에 제14조제1항에 따른 실업급여의 보험료율의 2분의 1을 곱한 금액으로 한다.'),
    'gani_note1': ('gani', '이 간이세액표의 해당 세액(제6호의 월급여액별ㆍ공제대상가족수별 금액을 말한다)은 「소득세법」에 따른 근로소득공제, 기본공제, 특별소득공제 및 특별세액공제 중 일부, 연금보험료공제, 근로소득세액공제와 해당 세율을 반영하여 계산한 금액임.'),
    'gani_family': ('gani', '공제대상가족의 수를 산정할 때 본인 및 배우자도 각각 1명으로 보아 계산함.'),
    'gani_ratio': ('ganiRatio', '근로자가 별표 2의 근로소득 간이세액표 해당란 세액의 100분의 120 또는 100분의 80의 비율에 해당하는 금액의 원천징수를 신청하는 경우에는 그에 따라 원천징수할 수 있다.'),
    'meal': ('meal', '근로자가 사내급식이나 이와 유사한 방법으로 제공받는 식사 기타 음식물 또는 근로자(식사 기타 음식물을 제공받지 아니하는 자에 한정한다)가 받는 월 20만원 이하의 식사대'),
    'treasury': ('treasury47', '국고금의 수입 또는 지출에서 10원 미만의 끝수가 있을 때에는 그 끝수는 계산하지 아니하고, 전액이 10원 미만일 때에도 그 전액을 계산하지 아니한다.'),
    'sev8': ('sevLaw8', '퇴직금제도를 설정하려는 사용자는 계속근로기간 1년에 대하여 30일분 이상의 평균임금을 퇴직금으로 퇴직 근로자에게 지급할 수 있는 제도를 설정하여야 한다.'),
    'sev4': ('sevLaw4', '다만, 계속근로기간이 1년 미만인 근로자, 4주간을 평균하여 1주간의 소정근로시간이 15시간 미만인 근로자에 대하여는 그러하지 아니하다.'),
    'sev9': ('sevLaw9', '사용자는 근로자가 퇴직한 경우에는 그 지급사유가 발생한 날부터 14일 이내에 퇴직금을 지급하여야 한다. 다만, 특별한 사정이 있는 경우에는 당사자 간의 합의에 따라 지급기일을 연장할 수 있다.'),
    'avg_wage': ('lsa2', '“평균임금”이란 이를 산정하여야 할 사유가 발생한 날 이전 3개월 동안에 그 근로자에게 지급된 임금의 총액을 그 기간의 총일수로 나눈 금액을 말한다.'),
    'avg_ordinary': ('lsa2', '제1항제6호에 따라 산출된 금액이 그 근로자의 통상임금보다 적으면 그 통상임금액을 평균임금으로 한다.'),
    'moel_sev_formula': ('moelSev', '퇴직금 = 1일 평균임금 × 30(일) × (재직일수/365)'),
    'moel_sev_avg': ('moelSev', '1일 평균임금 = 퇴직일 이전 3개월간에 지급받은 임금 총액 (A+B+C)/퇴직일 이전 3개월간의 총 일수'),
    'moel_sev_date': ('moelSev', '퇴직일자는 마지막으로 근무한 날의 1일 후 날짜를 기재'),
    'moel_sev_ordinary': ('moelSev', '1일 통상임금이 1일 평균임금보다 클 경우 1일 통상임금을 기준으로 퇴직금이 계산됩니다.'),
    'lsa55': ('lsa55', '사용자는 근로자에게 1주에 평균 1회 이상의 유급휴일을 보장하여야 한다.'),
    'lsa30': ('lsaDecree30', '법 제55조제1항에 따른 유급휴일은 1주 동안의 소정근로일을 개근한 자에게 주어야 한다.'),
    'lsa18': ('lsa18', '4주 동안(4주 미만으로 근로하는 경우에는 그 기간)을 평균하여 1주 동안의 소정근로시간이 15시간 미만인 근로자에 대하여는 제55조와 제60조를 적용하지 아니한다.'),
    'decree_t2': ('lsaDecreeT2', '단시간근로자의 1일 소정근로시간 수는 4주 동안의 소정근로시간을 그 기간의 통상 근로자의 총 소정근로일 수로 나눈 시간 수로 한다.'),
    'moel1350_late': ('moel1350Weekly', '우리부 행정해석에 따르면 소정근로일 중의 지각, 조퇴, 휴일, 휴가, 휴업 등은 결근으로 처리할 수 없다는 입장이므로, 지각한다고 해서 주휴수당이 발생하지 않거나 금액이 달라지지 않습니다.'),
    'moel1350_base': ('moel1350Weekly', '주휴수당은 1일 소정근로시간을 기준으로 산정하는 것이며, 이때 ‘소정근로시간’은 근로기준법 제2조제1항제8호에 따라 법정 근로시간인 1일 8시간, 1주 40시간을 초과하지 않는 범위내에서 노사가 근로하기로 정한 시간을 말합니다.'),
    'moel1350_when': ('moel1350Weekly', '주휴수당은, ①근로기준법상 근로자로서, ②4주 평균하여 1주 소정근로시간(…)이 15시간 이상이고, ③1주간의 소정근로일(…)을 개근하였을 때 발생하게 됩니다.'),
    'ei45_4': ('eiLaw', '기초일액이 그 수급자격자의 이직 전 1일 소정근로시간에 이직일 당시 적용되던 「최저임금법」에 따른 시간 단위에 해당하는 최저임금액을 곱한 금액(이하 “최저기초일액”이라 한다)보다 낮은 경우에는 최저기초일액을 기초일액으로 한다.'),
    'ei46_2': ('eiLaw', '제1항제1호에 따라 산정된 구직급여일액이 최저구직급여일액보다 낮은 경우에는 최저구직급여일액을 그 수급자격자의 구직급여일액으로 한다.'),
    'moel_sev_note': ('moelSev', '연차수당은 퇴직 전전년도(2015년)에 발생한 휴가중 퇴직 전년도(2016년)에 미사용한 휴가 일수분의 합계'),
    'mw_notice': ('minWageNotice2027', '월 환산액 2,236,300원: 주 소정근로 40시간을 근무할 경우, 월 환산 기준시간 수 209시간(주당 유급주휴 8시간 포함) 기준'),
    'mw_decree5': ('minWageDecree5', '월(月) 단위로 정해진 임금: 그 금액을 1개월의 최저임금 적용기준 시간 수(제2호에 따른 1주의 최저임금 적용기준 시간 수에 1년 동안의 평균의 주의 수를 곱한 시간을 12로 나눈 시간 수를 말한다)로 나눈 금액'),
    'ei46': ('eiLaw', '제45조제1항부터 제3항까지 및 제5항의 경우에는 그 수급자격자의 기초일액에 100분의 60을 곱한 금액'),
    'ei68': ('eiDecree68', '법 제45조제5항에 따라 구직급여의 산정 기초가 되는 임금일액이 11만3500원을 초과하는 경우에는 11만3500원을 해당 임금일액으로 한다.'),
    'ei49': ('eiLaw', '실업의 신고일부터 계산하기 시작하여 7일간은 대기기간으로 보아 구직급여를 지급하지 아니한다.'),
    'ei_table_note': ('eiTable1', '「장애인고용촉진 및 직업재활법」 제2조제1호에 따른 장애인은 50세 이상인 것으로 보아 위 표를 적용한다.'),
    'lsa60_1': ('lsa60', '사용자는 1년간 80퍼센트 이상 출근한 근로자에게 15일의 유급휴가를 주어야 한다.'),
    'lsa60_2': ('lsa60', '사용자는 계속하여 근로한 기간이 1년 미만인 근로자 또는 1년간 80퍼센트 미만 출근한 근로자에게 1개월 개근 시 1일의 유급휴가를 주어야 한다.'),
    'lsa60_4': ('lsa60', '사용자는 3년 이상 계속하여 근로한 근로자에게는 제1항에 따른 휴가에 최초 1년을 초과하는 계속 근로 연수 매 2년에 대하여 1일을 가산한 유급휴가를 주어야 한다. 이 경우 가산휴가를 포함한 총 휴가 일수는 25일을 한도로 한다.'),
    'nps6': ('npsLaw6', '국내에 거주하는 국민으로서 18세 이상 60세 미만인 자는 국민연금 가입 대상이 된다.'),
    'ei13_65': ('eiRateLaw', '65세 이후에 고용(65세 전부터 피보험자격을 유지하던 사람이 65세 이후에 계속하여 고용된 경우는 제외한다)되거나 자영업을 개시한 자에 대하여는 고용보험료 중 실업급여의 보험료를 징수하지 아니한다.'),
}


def quote(key, cite=True):
    """원문 인용 한 덩어리(한국어 글용)."""
    k, text = Q[key]
    return f'<blockquote>“{esc(text)}”' + (f'<cite>{src(k)}</cite>' if cite else '') + '</blockquote>'


def q(key):
    """문장 안에 넣는 짧은 인용."""
    return '“' + esc(Q[key][1]) + '”'
