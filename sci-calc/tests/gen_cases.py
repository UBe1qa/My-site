"""기준값 만들기: 계산기 엔진(자바스크립트)과 따로, 파이썬 sympy·mpmath·fractions·decimal로 구한다.
실행: python3 -m venv /tmp/v && /tmp/v/bin/pip install sympy mpmath scipy numpy && /tmp/v/bin/python tests/gen_cases.py
결과: tests/cases.json (tests/run.js 가 읽는다)
"""
import json, random, os
from fractions import Fraction
from decimal import Decimal, ROUND_HALF_UP, getcontext
import sympy as sp
import mpmath as mp

mp.mp.dps = 50
getcontext().prec = 80
HERE = os.path.dirname(os.path.abspath(__file__))
x = sp.Symbol('x')

# (계산기 식, 각도 모드, 기준 식(sympy), 정확값 확인 여부)
# 기준 식 안의 함수: sind/cosd/tand = 도 단위, 그 밖은 sympy 그대로
def sind(a): return sp.sin(a * sp.pi / 180)
def cosd(a): return sp.cos(a * sp.pi / 180)
def tand(a): return sp.tan(a * sp.pi / 180)
def sing(a): return sp.sin(a * sp.pi / 200)
def asind(a): return sp.asin(a) * 180 / sp.pi
def acosd(a): return sp.acos(a) * 180 / sp.pi
def atand(a): return sp.atan(a) * 180 / sp.pi
NS = dict(sp.__dict__)
NS.update(sind=sind, cosd=cosd, tand=tand, sing=sing, asind=asind, acosd=acosd, atand=atand, x=x)

C = []
def c(expr, ref, mode='deg', exact=False, cplx=False):
    C.append(dict(expr=expr, ref=ref, mode=mode, exact=exact, cplx=cplx))

# --- 사칙·분수 (정확값)
c('1/3+1/7', 'Rational(1,3)+Rational(1,7)', exact=True)
c('frac(1,3)*3', '1', exact=True)
c('0.1+0.2', 'Rational(3,10)', exact=True)
c('frac(2,3)-frac(5,6)', 'Rational(2,3)-Rational(5,6)', exact=True)
c('mixed(2,1,3)+mixed(1,1,2)', 'Rational(7,3)+Rational(3,2)', exact=True)
c('6/2(1+2)', '1', exact=True)                 # 곱하기 생략이 먼저 (카시오)
c('6/2*(1+2)', '9', exact=True)
c('1/2pi', '1/(2*pi)')
c('-2^2', '-4', exact=True)
c('(-2)^2', '4', exact=True)
c('2^3^2', '64', exact=True)                   # 왼쪽부터 (카시오)
c('2^(3^2)', '512', exact=True)
c('12.5%*80', '10', exact=True)
c('123456789*987654321', '123456789*987654321')
c('2^64', '2**64')
c('1E-5*3', 'Rational(3,100000)', exact=True)
c('7.2E3/9', '800', exact=True)
c('25!', 'factorial(25)')
c('70!', 'factorial(70)')
c('200!/198!', '200*199', exact=True)
c('5P2', '20', exact=True)
c('10C3', '120', exact=True)
c('52C5', 'binomial(52,5)', exact=True)
c('49C6', 'binomial(49,6)', exact=True)
c('0!', '1', exact=True)
c('GCD(84,126)', '42', exact=True)
c('LCM(12,18,30)', '180', exact=True)
c('Int(-7.5)', '-7', exact=True)
c('Intg(-7.5)', '-8', exact=True)
c('abs(-3/4)', 'Rational(3,4)', exact=True)
# --- 루트·거듭제곱 (정확값)
c('sqrt(8)', '2*sqrt(2)', exact=True)
c('sqrt(12)+sqrt(27)', '5*sqrt(3)', exact=True)
c('sqrt(2)*sqrt(6)', '2*sqrt(3)', exact=True)
c('sqrt(frac(3,4))', 'sqrt(3)/2', exact=True)
c('1/(1+sqrt(2))', 'sqrt(2)-1', exact=True)
c('frac(1,sqrt(3))', 'sqrt(3)/3', exact=True)
c('(1+sqrt(2))^2', '3+2*sqrt(2)', exact=True)
c('(sqrt(3)-1)(sqrt(3)+1)', '2', exact=True)
c('sqrt(50)/sqrt(2)', '5', exact=True)
c('root(3,27)', '3', exact=True)
c('root(3,-27)', '-3', exact=True)
c('root(4,81)', '3', exact=True)
c('root(3,2)', '2**Rational(1,3)')
c('8^(2/3)', '4', exact=True)
c('27^(-1/3)', 'Rational(1,3)', exact=True)
c('2^0.5', 'sqrt(2)', exact=True)
c('(-8)^(1/3)', '-2', exact=True)
c('2^-10', 'Rational(1,1024)', exact=True)
c('1.5^2.5', 'Rational(3,2)**Rational(5,2)')
c('10^0.3', '10**Rational(3,10)')
c('e^2', 'exp(2)')
c('e^-1', 'exp(-1)')
c('exp(10)', 'exp(10)')
c('pi^2', 'pi**2')
c('2pi/3', '2*pi/3', exact=True)
c('pi/2+pi/3', '5*pi/6', exact=True)
# --- 로그
c('log(1000)', '3', exact=True)
c('log(0.01)', '-2', exact=True)
c('log(2)', 'log(2,10)')
c('ln(e)', '1')
c('ln(1)', '0', exact=True)
c('ln(10)', 'log(10)')
c('logb(2,8)', '3', exact=True)
c('logb(4,8)', 'Rational(3,2)', exact=True)
c('logb(3,10)', 'log(10)/log(3)')
c('log(2,32)', '5', exact=True)
c('log(2)+log(5)', '1')
c('ln(2)*1E5', 'log(2)*100000')
# --- 삼각 (도)
for d in [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 225, 240, 270, 300, 315, 330, 345, 360, 390, -30, -45, 720]:
    c('sin(%d)' % d, 'sind(%d)' % d, exact=True)
    c('cos(%d)' % d, 'cosd(%d)' % d, exact=True)
for d in [0, 15, 30, 45, 60, 75, 120, 135, 150, 210, 225, -60]:
    c('tan(%d)' % d, 'tand(%d)' % d, exact=True)
for d in ['1', '10', '22.5', '37', '89.9', '-123.4', '1000', '1E6', '0.001']:
    c('sin(%s)' % d, 'sind(Rational("%s"))' % d.replace('E6', 'e6'))
    c('cos(%s)' % d, 'cosd(Rational("%s"))' % d.replace('E6', 'e6'))
    c('tan(%s)' % d, 'tand(Rational("%s"))' % d.replace('E6', 'e6'))
c('sin(30°30′)', 'sind(Rational(61,2))')
c('cos(12°34′56″)', 'cosd(12+Rational(34,60)+Rational(56,3600))')
c('asin(0.5)', '30', exact=True)
c('asin(-1)', '-90', exact=True)
c('acos(-0.5)', '120', exact=True)
c('acos(sqrt(2)/2)', '45', exact=True)
c('atan(1)', '45', exact=True)
c('atan(-sqrt(3))', '-60', exact=True)
c('asin(0.3)', 'asind(Rational(3,10))')
c('acos(0.3)', 'acosd(Rational(3,10))')
c('atan(2.5)', 'atand(Rational(5,2))')
c('sin(30)^2+cos(30)^2', '1', exact=True)
# --- 삼각 (라디안)
c('sin(pi/6)', 'Rational(1,2)', 'rad', exact=True)
c('cos(pi)', '-1', 'rad', exact=True)
c('tan(pi/4)', '1', 'rad', exact=True)
c('sin(5pi/12)', 'sin(5*pi/12)', 'rad', exact=True)
c('sin(1)', 'sin(1)', 'rad')
c('cos(2.5)', 'cos(Rational(5,2))', 'rad')
c('tan(1.2)', 'tan(Rational(6,5))', 'rad')
c('sin(100)', 'sin(100)', 'rad')
c('asin(0.5)', 'pi/6', 'rad', exact=True)
c('acos(-1)', 'pi', 'rad', exact=True)
c('atan(1)', 'pi/4', 'rad', exact=True)
c('atan(3)', 'atan(3)', 'rad')
c('asin(0.9)', 'asin(Rational(9,10))', 'rad')
# --- 삼각 (그라드)
c('sin(50)', 'sqrt(2)/2', 'gra', exact=True)
c('sin(100)', '1', 'gra', exact=True)
c('cos(33)', 'cos(33*pi/200)', 'gra')
c('asin(1)', '100', 'gra', exact=True)
# --- 쌍곡
c('sinh(1)', 'sinh(1)'); c('cosh(2)', 'cosh(2)'); c('tanh(0.5)', 'tanh(Rational(1,2))')
c('asinh(1)', 'asinh(1)'); c('acosh(2)', 'acosh(2)'); c('atanh(0.5)', 'atanh(Rational(1,2))')
# --- 미적분·합
c('int(x^2,0,3)', '9')
c('int(sin(x),0,pi)', '2', 'rad')
c('int(e^x,0,1)', 'E-1')
c('int(1/x,1,e)', '1')
c('int(sqrt(1-x^2),-1,1)', 'pi/2')
c('int(e^(-x^2),-3,3)', 'Integral(exp(-x**2),(x,-3,3))')
c('int(frac(1,1+x^2),0,1)', 'pi/4')
c('int(ln(x),1,2)', '2*log(2)-1')
c('int(x^3-2x,-1,2)', 'Rational(3,4)')
c('der(x^3,2)', '12')
c('der(sin(x),0)', '1', 'rad')
c('der(e^x,1)', 'E')
c('der(ln(x),3)', 'Rational(1,3)')
c('der(sqrt(x),4)', 'Rational(1,4)')
c('der(x^2-3x,1.5)', '0')
c('sum(x,1,100)', '5050', exact=True)
c('sum(x^2,1,10)', '385', exact=True)
c('sum(frac(1,x),1,10)', 'harmonic(10)', exact=True)
c('sum(frac(1,x^2),1,100)', 'Sum(1/x**2,(x,1,100)).doit()')
c('prod(x,1,10)', 'factorial(10)', exact=True)
c('prod(frac(x,x+1),1,9)', 'Rational(1,10)', exact=True)
# --- 단위·상수
c('100[in>cm]', '254', exact=True)
c('5[ft>m]', 'Rational(3048,2000)', exact=True)
c('212[F>C]', '100', exact=True)
c('-40[C>F]', '-40', exact=True)
c('100[pyeong>m2]', 'Rational(40000,121)', exact=True)
c('[c0]', '299792458', exact=True)
c('[NA][k]', 'Rational("6.02214076e23")*Rational("1.380649e-23")', exact=True)
c('[h]/(2pi)', 'Rational("6.62607015e-34")/(2*pi)')
c('[g]*2', 'Rational("19.6133")', exact=True)
# --- 오류 (계산하면 안 되는 것)
for e in ['1/0', 'tan(90)', 'tan(270)', 'sqrt(-1)', 'ln(0)', 'log(-5)', 'asin(2)', '(-2)^0.5', '0^0', '0^-1',
          '(-1)!', '2.5!', 'acosh(0.5)', 'atanh(1)', '3P5', 'logb(1,5)', '3001!']:
    c(e, 'ERR:math')
for e in ['1+', '(*2)', '2..3', 'sin', '3)']:
    c(e, 'ERR:syntax')
# --- 복소수
c('(1+2i)(3-4i)', '(1+2*I)*(3-4*I)', cplx=True, exact=True)
c('(1+2i)/(3-4i)', '(1+2*I)/(3-4*I)', cplx=True, exact=True)
c('i^2', '-1', cplx=True, exact=True)
c('sqrt(-9)', '3*I', cplx=True, exact=True)
c('abs(3+4i)', '5', cplx=True, exact=True)
c('2∠60', '1+sqrt(3)*I', cplx=True, exact=True)
c('Arg(1+i)', '45', cplx=True, exact=True)
c('Conjg(2+3i)', '2-3*I', cplx=True, exact=True)
c('(1+i)^0.5', 'sqrt(1+I)', cplx=True)
c('e^(i*pi/3)', 'exp(I*pi/3)', cplx=True)
c('ln(-1)', 'I*pi', cplx=True)

# ----------------------------------------------------------------- 기준값 계산
def to_ref(expr_str, mode):
    if expr_str.startswith('ERR'):
        return None
    e = sp.sympify(expr_str, locals=NS)
    if isinstance(e, sp.Integral) or e.has(sp.Integral):
        v = sp.N(e, 40)
    else:
        v = sp.N(e, 40)
    return e, v

def exact_terms(e):
    """sympy 정확값 → [[분자, 분모, 루트 안, π지수], ...]  (실수부/허수부 따로)"""
    e = sp.expand(sp.radsimp(sp.sqrtdenest(sp.expand(sp.sqrtdenest(e)))))
    out = []
    for t in sp.Add.make_args(sp.expand(e)):
        if t == 0:
            continue
        coeff, rest = t.as_coeff_Mul()
        coeff = sp.Rational(coeff)
        r, p = 1, 0
        for b, ex in rest.as_powers_dict().items():
            if b == sp.pi and ex == 1:
                p = 1
            elif ex == sp.Rational(1, 2) and b.is_Integer:
                r *= int(b)
            elif b == 1:
                pass
            else:
                raise ValueError('not representable: %s' % t)
        out.append([str(coeff.p), str(coeff.q), str(r), p])
    out.sort(key=lambda a: (a[3], int(a[2])))
    return out

cases = []
for cs in C:
    item = dict(expr=cs['expr'], mode=cs['mode'], cplx=cs['cplx'])
    if cs['ref'].startswith('ERR'):
        item['err'] = cs['ref'].split(':')[1]
        cases.append(item); continue
    e, v = to_ref(cs['ref'], cs['mode'])
    re_, im_ = sp.re(v), sp.im(v)
    item['re'] = sp.N(re_, 30).__str__() if re_ != 0 else '0'
    item['im'] = sp.N(im_, 30).__str__() if im_ != 0 else '0'
    if cs['exact']:
        ee = e.rewrite(sp.sqrt) if e.has(sp.sin, sp.cos, sp.tan) else e
        ee = sp.sqrtdenest(sp.expand(ee))
        item['exact_re'] = exact_terms(sp.re(sp.expand(ee)))
        item['exact_im'] = exact_terms(sp.im(sp.expand(ee)))
    cases.append(item)

# 상수 대조용 (NIST CODATA 2022 값을 사람 손으로 옮겨 적은 것 → engine.js 와 글자 비교는 run.js)
# --- 무작위 분수 식: Fraction 으로 정확히 (사칙 + 정수 거듭제곱)
random.seed(20261006)
def rnd_num():
    k = random.random()
    if k < 0.5: return str(random.randint(1, 99)), Fraction(random.randint(1, 1))  # 자리채움
    return None, None
rand_cases = []
def gen(depth):
    if depth == 0 or random.random() < 0.3:
        kind = random.random()
        if kind < 0.6:
            n = random.randint(1, 60); return str(n), Fraction(n)
        if kind < 0.85:
            a, b = random.randint(1, 30), random.randint(1, 30)
            return 'frac(%d,%d)' % (a, b), Fraction(a, b)
        d = random.randint(1, 999) / 100
        s = ('%.2f' % d).rstrip('0').rstrip('.')
        return s, Fraction(s)
    op = random.choice('+-*/^')
    sa, va = gen(depth - 1)
    if op == '^':
        k = random.randint(-3, 3)
        if va == 0 and k <= 0: k = 2
        return '(%s)^(%d)' % (sa, k), va ** k
    sb, vb = gen(depth - 1)
    if op == '/' and vb == 0:
        op = '+'
    v = {'+': va + vb, '-': va - vb, '*': va * vb, '/': va / vb if vb != 0 else None}[op]
    return '(%s)%s(%s)' % (sa, op, sb), v
while len(rand_cases) < 400:
    s, v = gen(4)
    if v is None: continue
    rand_cases.append(dict(expr=s, n=str(v.numerator), d=str(v.denominator)))

# --- 반올림 표시: 유리수를 보통(10자리)·Fix·Sci 로. Decimal ROUND_HALF_UP 기준
def fmt_norm(fr):
    if fr == 0: return '0'
    d = Decimal(fr.numerator) / Decimal(fr.denominator)
    q = d.quantize(Decimal(1).scaleb(d.adjusted() - 9), rounding=ROUND_HALF_UP)
    if q.adjusted() != d.adjusted():
        q = d.quantize(Decimal(1).scaleb(d.adjusted() - 8), rounding=ROUND_HALF_UP)
    e = q.adjusted()
    digits = str(abs(q).scaleb(-e).quantize(Decimal('1.000000000')))  # d.ddddddddd
    mant = digits.replace('.', '')
    plain = format(abs(q), 'f')
    if '.' in plain: plain = plain.rstrip('0').rstrip('.')
    nd = len(plain.replace('.', '').lstrip('0')) if plain.startswith('0') else len(plain.replace('.', ''))
    if e >= 10 or e < -9 or len(plain.replace('.', '')) > 12:
        m = digits.rstrip('0').rstrip('.')
        return ('-' if q < 0 else '') + m + 'E' + str(e)
    return ('-' if q < 0 else '') + plain
def fmt_fix(fr, n):
    d = Decimal(fr.numerator) / Decimal(fr.denominator)
    q = d.quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP)
    s = format(q, 'f')
    if s.startswith('-') and Decimal(s) == 0: s = s[1:]
    return s
def fmt_sci(fr, n):
    d = Decimal(fr.numerator) / Decimal(fr.denominator)
    q = d.quantize(Decimal(1).scaleb(d.adjusted() - (n - 1)), rounding=ROUND_HALF_UP)
    if q.adjusted() != d.adjusted():
        q = d.quantize(Decimal(1).scaleb(q.adjusted() - (n - 1)), rounding=ROUND_HALF_UP)
    e = q.adjusted()
    m = format(abs(q).scaleb(-e), 'f')
    if '.' not in m and n > 1: m += '.'
    m = m.ljust(n + 1, '0') if n > 1 else m.rstrip('.')
    return ('-' if q < 0 else '') + m + 'E' + str(e)
round_cases = []
specials = [Fraction(5, 1000), Fraction(1, 3), Fraction(2, 3), Fraction(-2, 3), Fraction(1005, 1000), Fraction(2675, 1000),
            Fraction(99999999995, 10), Fraction(9999999999, 1), Fraction(10000000000, 1), Fraction(1, 10**9), Fraction(123, 10**12),
            Fraction(-1, 7), Fraction(22, 7), Fraction(1, 8), Fraction(15, 1000), Fraction(-15, 1000), Fraction(999999999, 1000)]
for _ in range(300):
    num = random.randint(-10**random.randint(1, 15), 10**random.randint(1, 15))
    den = random.randint(1, 10**random.randint(0, 12))
    specials.append(Fraction(num, den))
for fr in specials:
    item = dict(n=str(fr.numerator), d=str(fr.denominator), norm=fmt_norm(fr))
    if abs(fr) < 10**10:
        item['fix2'] = fmt_fix(fr, 2); item['fix0'] = fmt_fix(fr, 0); item['fix5'] = fmt_fix(fr, 5)
    if fr != 0:
        item['sci4'] = fmt_sci(fr, 4)
    round_cases.append(item)

# --- 물리 상수: NIST CODATA 2022 표(tests/nist-codata-2022.txt, https://physics.nist.gov/cuu/Constants/Table/allascii.txt)
NIST_NAMES = {'c0': 'speed of light in vacuum', 'h': 'Planck constant', 'qe': 'elementary charge', 'k': 'Boltzmann constant',
              'NA': 'Avogadro constant', 'G': 'Newtonian constant of gravitation', 'g': 'standard acceleration of gravity',
              'me': 'electron mass', 'mp': 'proton mass', 'mn': 'neutron mass', 'u': 'atomic mass constant',
              'eps0': 'vacuum electric permittivity', 'mu0': 'vacuum mag. permeability', 'a0': 'Bohr radius',
              'Rinf': 'Rydberg constant', 'alpha': 'fine-structure constant', 'atm': 'standard atmosphere'}
DERIVED = {'hbar': 'reduced Planck constant', 'R': 'molar gas constant', 'F': 'Faraday constant',
           'sigma': 'Stefan-Boltzmann constant', 'Vm': 'molar volume of ideal gas (273.15 K, 101.325 kPa)'}
consts, derived = [], []
nist = {}
for line in open(os.path.join(HERE, 'nist-codata-2022.txt'), encoding='utf-8'):
    name = line[:60].strip()
    if name: nist[name] = line[60:85].strip()
def clean(v): return v.replace(' ', '').replace('...', '').replace('e', 'e')
for cid, name in NIST_NAMES.items():
    consts.append(dict(id=cid, v=clean(nist[name])))
for cid, name in DERIVED.items():
    derived.append(dict(id=cid, v=clean(nist[name])))

json.dump(dict(cases=cases, random=rand_cases, rounding=round_cases, constants=consts, derived=derived), open(os.path.join(HERE, 'cases.json'), 'w'), ensure_ascii=False, indent=0)
print('cases', len(cases), 'random', len(rand_cases), 'rounding', len(round_cases))
