"""모드 계산의 기준값 (통계·분포·방정식·행렬·진법). numpy·scipy·sympy·fractions 로 따로 구한다.
실행: /tmp/v/bin/python tests/gen_modes.py  →  tests/modes.json
"""
import json, os, random, math
from fractions import Fraction
import numpy as np
import sympy as sp
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
random.seed(1006)
out = {}

# ---------------- 통계
def casio_quartiles(data):
    d = sorted(data); n = len(d)
    def med(a):
        m = len(a)
        return a[m // 2] if m % 2 else (a[m // 2 - 1] + a[m // 2]) / 2
    half = n // 2
    return med(d[:half]), med(d), med(d[n - half:])
st = []
datasets = [
    [Fraction(v) for v in [2, 4, 4, 4, 5, 5, 7, 9]],
    [Fraction(v) for v in [1, 2, 3, 4, 5, 6, 7, 8, 9]],
    [Fraction(v) for v in ['1.5', '2.25', '3.75', '10.5', '0.125']],
    [Fraction(v) for v in [100, 102, 98, 101, 99, 100, 103, 97]],
]
for _ in range(25):
    n = random.randint(2, 40)
    if random.random() < 0.5:
        ds = [Fraction(random.randint(-50, 200)) for _ in range(n)]
    else:
        ds = [Fraction(random.randint(-9999, 99999), 100) for _ in range(n)]
    datasets.append(ds)
for ds in datasets:
    a = np.array([float(v) for v in ds])
    mean = sum(ds) / len(ds)
    var_p = sum((v - mean) ** 2 for v in ds) / len(ds)
    var_s = sum((v - mean) ** 2 for v in ds) / (len(ds) - 1)
    q1, med, q3 = casio_quartiles(ds)
    st.append(dict(data=[str(v) for v in ds],
                   mean=[str(mean.numerator), str(mean.denominator)],
                   popVar=[str(var_p.numerator), str(var_p.denominator)],
                   sampleVar=[str(var_s.numerator), str(var_s.denominator)],
                   popSD=repr(float(np.std(a, ddof=0))), sampleSD=repr(float(np.std(a, ddof=1))),
                   q1=[str(q1.numerator), str(q1.denominator)], med=[str(med.numerator), str(med.denominator)],
                   q3=[str(q3.numerator), str(q3.denominator)],
                   xq1=repr(float(np.percentile(a, 25))), xq3=repr(float(np.percentile(a, 75)))))
# 도수가 있는 자료: 펼친 자료와 같아야 함
freq_cases = []
for _ in range(8):
    k = random.randint(2, 8)
    xs = sorted(set(random.randint(0, 30) for _ in range(k)))
    fs = [random.randint(2, 6) for _ in xs]
    flat = [Fraction(x) for x, f in zip(xs, fs) for _ in range(f)]
    q1, med, q3 = casio_quartiles(flat)
    mean = sum(flat) / len(flat)
    freq_cases.append(dict(x=[str(v) for v in xs], f=[str(v) for v in fs], mean=[str(mean.numerator), str(mean.denominator)],
                           q1=[str(q1.numerator), str(q1.denominator)], med=[str(med.numerator), str(med.denominator)],
                           q3=[str(q3.numerator), str(q3.denominator)], sd=repr(float(np.std(np.array([float(v) for v in flat])))) ))
out['stats'] = st
out['freq'] = freq_cases

# ---------------- 회귀
reg = []
for t in range(12):
    n = random.randint(4, 15)
    xs = [round(random.uniform(1, 20), 2) for _ in range(n)]
    kind = ['lin', 'quad', 'log', 'exp', 'abx', 'pow', 'inv'][t % 7]
    a0, b0, c0 = random.uniform(1, 5), random.uniform(0.1, 2), random.uniform(-0.3, 0.3)
    def f(x):
        return {'lin': a0 + b0 * x, 'quad': a0 + b0 * x + c0 * x * x, 'log': a0 + b0 * math.log(x),
                'exp': a0 * math.exp(0.1 * b0 * x), 'abx': a0 * (1 + 0.1 * b0) ** x, 'pow': a0 * x ** b0, 'inv': a0 + b0 / x}[kind]
    ys = [round(f(x) * random.uniform(0.95, 1.05), 3) for x in xs]
    X, Y = np.array(xs), np.array(ys)
    item = dict(type=kind, x=[repr(v) for v in xs], y=[repr(v) for v in ys])
    if kind == 'quad':
        c2, c1, c0f = np.polyfit(X, Y, 2)
        yh = c0f + c1 * X + c2 * X * X
        item.update(a=c0f, b=c1, c=c2, r2=1 - np.sum((Y - yh) ** 2) / np.sum((Y - Y.mean()) ** 2))
    else:
        tx = {'lin': X, 'log': np.log(X), 'exp': X, 'abx': X, 'pow': np.log(X), 'inv': 1 / X}[kind]
        ty = {'lin': Y, 'log': Y, 'exp': np.log(Y), 'abx': np.log(Y), 'pow': np.log(Y), 'inv': Y}[kind]
        lr = stats.linregress(tx, ty)
        a, b = lr.intercept, lr.slope
        if kind in ('exp', 'pow'): a = math.exp(a)
        if kind == 'abx': a, b = math.exp(a), math.exp(b)
        item.update(a=a, b=b, r=lr.rvalue)
    reg.append(item)
out['reg'] = reg

# ---------------- 분포 (scipy)
dist = []
for z in [-8, -5, -3.5, -2, -1.96, -1, -0.5, 0, 0.3, 1, 1.645, 2.5, 3, 4, 6, 8.5]:
    dist.append(dict(kind='ncdf', lo=-1e99, hi=z, mu=0, sd=1, v=repr(float(stats.norm.cdf(z)))))
    dist.append(dict(kind='ncdf', lo=z, hi=1e99, mu=0, sd=1, v=repr(float(stats.norm.sf(z)))))
    dist.append(dict(kind='npdf', x=z, mu=0, sd=1, v=repr(float(stats.norm.pdf(z)))))
for (lo, hi, mu, sd) in [(60, 80, 70, 5), (-1, 1, 0, 1), (100, 130, 115, 15), (0.5, 0.7, 0.6, 0.02), (170, 1e99, 160, 7)]:
    dist.append(dict(kind='ncdf', lo=lo, hi=hi, mu=mu, sd=sd, v=repr(float(stats.norm.cdf(hi, mu, sd) - stats.norm.cdf(lo, mu, sd)))))
for p in [1e-10, 1e-6, 0.001, 0.025, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.999, 1 - 1e-9]:
    dist.append(dict(kind='inorm', p=p, mu=0, sd=1, tail='left', v=repr(float(stats.norm.ppf(p)))))
dist.append(dict(kind='inorm', p=0.95, mu=0, sd=1, tail='center', v=repr(float(stats.norm.ppf(0.975)))))
dist.append(dict(kind='inorm', p=0.05, mu=100, sd=15, tail='right', v=repr(float(stats.norm.isf(0.05, 100, 15)))))
for (k, n, p) in [(3, 10, 0.5), (0, 20, 0.1), (7, 7, 0.9), (50, 100, 0.5), (120, 1000, 0.1), (5, 30, 1 / 6), (999, 1000, 0.99)]:
    dist.append(dict(kind='bpdf', k=k, n=n, p=p, v=repr(float(stats.binom.pmf(k, n, p)))))
    dist.append(dict(kind='bcdf', lo=0, hi=k, n=n, p=p, v=repr(float(stats.binom.cdf(k, n, p)))))
for (k, lam) in [(0, 2), (3, 2), (10, 4.5), (25, 20), (100, 90)]:
    dist.append(dict(kind='ppdf', k=k, lam=lam, v=repr(float(stats.poisson.pmf(k, lam)))))
    dist.append(dict(kind='pcdf', lo=0, hi=k, lam=lam, v=repr(float(stats.poisson.cdf(k, lam)))))
out['dist'] = dist

# ---------------- 방정식
eq = []
X = sp.Symbol('x')
polys = [[1, -3, 2], [1, 2, 5], [2, -4, 2], [1, 0, -2], [3, 5, -2], [1, -6, 11, -6], [1, 0, 0, -8], [2, -3, -11, 6],
         [1, -1, -1, 1], [1, 0, -2, 0], [1, 0, 0, 0, -16], [1, -10, 35, -50, 24], [1, 0, -5, 0, 4], [1, 2, 3, 4, 5],
         [1, 0, 1, 0, -3], [1, -2, 0, 4, -4], ['1/2', '-1/3', '1/6'], ['0.5', '1.25', '-3']]
for cf in polys:
    p = sp.Poly([sp.Rational(c) for c in cf], X)
    rts = []
    for r, m in sp.roots(p, multiple=False).items() if p.degree() <= 4 else []:
        for _ in range(m):
            v = complex(sp.N(r, 30))
            rts.append([repr(v.real), repr(v.imag)])
    if len(rts) != p.degree():
        rts = [[repr(float(np.real(r))), repr(float(np.imag(r)))] for r in np.roots([float(sp.Rational(c)) for c in cf])]
    rts.sort(key=lambda z: (abs(float(z[1])) > 1e-12, float(z[0]), -float(z[1])))
    eq.append(dict(co=[str(c) for c in cf], roots=rts))
out['poly'] = eq
syss = []
for n in [2, 3, 4]:
    for _ in range(4):
        A = [[random.randint(-9, 9) for _ in range(n)] for _ in range(n)]
        b = [random.randint(-20, 20) for _ in range(n)]
        M = sp.Matrix(A)
        if M.det() == 0: continue
        sol = M.LUsolve(sp.Matrix(b))
        syss.append(dict(A=[[str(v) for v in r] for r in A], b=[str(v) for v in b], x=[[str(sp.Rational(v).p), str(sp.Rational(v).q)] for v in sol]))
syss.append(dict(A=[['1', '2'], ['2', '4']], b=['3', '6'], kind='many'))
syss.append(dict(A=[['1', '2'], ['2', '4']], b=['3', '7'], kind='none'))
out['sys'] = syss
ineq = [
    dict(co=['1', '-3', '2'], op='>', ans='x<1, 2<x'),
    dict(co=['1', '-3', '2'], op='<=', ans='1≤x≤2'),
    dict(co=['1', '2', '5'], op='>', ans='all'),
    dict(co=['1', '2', '5'], op='<', ans='none'),
    dict(co=['1', '-4', '4'], op='>', ans='x<2, 2<x'),
    dict(co=['1', '-4', '4'], op='<=', ans='x=2'),
    dict(co=['1', '-4', '4'], op='>=', ans='all'),
    dict(co=['1', '-6', '11', '-6'], op='>=', ans='1≤x≤2, 3≤x'),
    dict(co=['-1', '0', '1'], op='>', ans='-1<x<1'),
    dict(co=['1', '0', '-5', '0', '4'], op='<', ans='-2<x<-1, 1<x<2'),
]
out['ineq'] = ineq

# ---------------- 행렬
mats = []
for n in [2, 3, 4]:
    for _ in range(3):
        A = sp.Matrix(n, n, lambda i, j: sp.Rational(random.randint(-6, 9), random.choice([1, 1, 1, 2])))
        B = sp.Matrix(n, n, lambda i, j: random.randint(-5, 5))
        item = dict(A=[[str(v) for v in A.row(i)] for i in range(n)], B=[[str(v) for v in B.row(i)] for i in range(n)],
                    det=str(A.det()), AB=[[str(v) for v in (A * B).row(i)] for i in range(n)], rank=A.rank())
        if A.det() != 0:
            Ai = A.inv(); item['inv'] = [[str(v) for v in Ai.row(i)] for i in range(n)]
        mats.append(item)
S = sp.Matrix([[1, 2, 3], [2, 4, 6], [1, 0, 1]])
mats.append(dict(A=[[str(v) for v in S.row(i)] for i in range(3)], B=[['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']],
                 det='0', AB=[[str(v) for v in S.row(i)] for i in range(3)], rank=S.rank()))
out['mat'] = mats
u, v = sp.Matrix([1, 2, 2]), sp.Matrix([3, -1, 4])
out['vec'] = dict(u=['1', '2', '2'], v=['3', '-1', '4'], dot=str(u.dot(v)), cross=[str(c) for c in u.cross(v)], norm_u='3',
                  angle=repr(float(sp.N(sp.acos(u.dot(v) / (u.norm() * v.norm())) * 180 / sp.pi, 20))))

# ---------------- 진법 (파이썬 정수, 32비트 2의 보수)
def wrap(v, bits=32):
    v &= (1 << bits) - 1
    return v - (1 << bits) if v >= 1 << (bits - 1) else v
bn = []
for expr, base, val in [('7FFFFFFF', 16, 2147483647), ('FFFFFFFF', 16, -1), ('80000000', 16, -2147483648),
                        ('1010 and 0110', 2, 0b0010), ('1010 or 0110', 2, 0b1110), ('1010 xor 0110', 2, 0b1100),
                        ('not(0)', 10, -1), ('neg(5)', 10, -5), ('17/5', 10, 3), ('-17/5', 10, -3), ('777+1', 8, 512),
                        ('A*(B+C)', 16, 10 * 23), ('1010 xnor 0110', 2, wrap(~(0b1010 ^ 0b0110))), ('255 and not(15)', 10, 240)]:
    bn.append(dict(expr=expr, base=base, dec=str(val), hex=format(val & 0xFFFFFFFF, 'X'), bin=format(val & 0xFFFFFFFF, 'b'), oct=format(val & 0xFFFFFFFF, 'o')))
out['base'] = bn
out['base_err'] = [dict(expr='7FFFFFFF+1', base=16), dict(expr='2147483647+1', base=10), dict(expr='5/0', base=10), dict(expr='12', base=2)]

json.dump(out, open(os.path.join(HERE, 'modes.json'), 'w'), ensure_ascii=False, indent=0, default=float)
print({k: len(v) if isinstance(v, list) else 1 for k, v in out.items()})
