"""페이지 글(한국어·영어). 계산기 첫 화면, 모드 페이지 설명, 소개, 개인정보 처리방침.
FAQ 를 바꾸면 화면의 질문과 FAQPage JSON-LD 가 같이 바뀐다(build.py 가 같은 목록으로 만든다).
"""

UPDATED = {'home': '2026-10-06', 'modes': '2026-10-06', 'about': '2026-10-06', 'privacy': '2026-10-06'}


def webapp(lang, path, site, name=None, desc=None):
    return {'@context': 'https://schema.org', '@type': 'WebApplication',
            'name': name or ('공학용 계산기' if lang == 'ko' else 'Scientific Calculator'),
            'url': site + path, 'applicationCategory': 'EducationalApplication', 'operatingSystem': 'Any', 'inLanguage': lang,
            'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW' if lang == 'ko' else 'USD'},
            'publisher': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'},
            'description': desc or HOME[lang]['desc']}


HOME = {
    'ko': {
        'title': '공학용 계산기 — 분수·루트가 그대로 보이는 무료 온라인 계산기',
        'desc': '분수, 루트, π가 교과서처럼 보이고 답도 √2/2처럼 정확한 값으로 나오는 무료 공학용 계산기. 삼각함수, 로그, 적분·미분, 통계, 방정식, 행렬, 진법까지 브라우저에서 바로 계산해요.',
        'h1': '공학용 계산기',
        'lede': '답이 <b>√2/2</b>처럼 정확한 값으로 나와요.',
        'points': ['<b>분수·루트</b>가 교과서 모양 그대로', '<b>정확값 ⇔ 소수</b>를 한 번에 (S⇔D)',
                   '<b>설치 없이 무료</b>, 계산은 이 브라우저에서'],
        'kbd': '키보드: 숫자·+ − * / ^ ( ) 는 그대로, <span class="kbd">sin</span> <span class="kbd">sqrt</span> <span class="kbd">log</span> 같은 글자는 함수로 바뀌어요. '
               '<span class="kbd">/</span> 분수 · <span class="kbd">Enter</span> = · <span class="kbd">Shift+Enter</span> 소수로 · <span class="kbd">Esc</span> 모두 지우기 · <span class="kbd">↑↓</span> 이전 식',
        'tips_h': '이렇게 써요',
        'tips': [
            ('분수는 분수 키로', '<b>□/□</b> 키를 누르면 위아래 칸이 생겨요. 숫자를 먼저 쓰고 누르면 그 숫자가 분자로 들어가요. ▶ ◀ 로 칸을 옮겨요.', '예: 1 □/□ 3 ▶ + 1 □/□ 6 = → 1/2'),
            ('답은 정확값으로', 'sin 45 는 √2/2, 1÷3 은 1/3 처럼 나와요. 결과 아래 <b>S⇔D</b> 를 누르면 소수로 바뀌어요. 소수점을 넣은 식은 처음부터 소수로 보여 줘요(설정에서 바꿔요).', '예: √8 = 2√2 → S⇔D → 2.828427125'),
            ('SHIFT 로 숨은 기능', '키 위의 주황 글자는 <b>SHIFT</b> 를 누른 다음 그 키를 누르면 돼요. sin⁻¹, 10ˣ, eˣ, nPr, nCr, Pol, Rec 가 여기 있어요.', '예: SHIFT sin 0.5 = → 30'),
            ('직전 답에 이어서', '= 다음에 바로 + − × ÷ 를 누르면 <b>Ans</b>(직전 답)에서 이어서 계산해요. ▲ ▼ 로 예전 식을 다시 불러와 고칠 수 있어요.', None),
            ('적분·미분·합', '<b>∫</b> 로 정적분, SHIFT ∫ 로 한 점의 미분계수, <b>Σ</b> 로 합을 구해요. 식 안의 <var>x</var> 가 변수예요.', '예: Σ(x, 1, 100) = 5050'),
            ('상수와 단위', '<b>함수</b> 키 안에 빛의 속력, 플랑크 상수 같은 물리 상수 23개(CODATA 2022)와 인치↔cm, 평↔m², °F↔°C 같은 단위 바꾸기가 있어요.', None),
        ],
        'modes_h': '다른 계산 화면',
        'modes': [('/stats/', '통계·회귀', '평균, 표준편차 σ·s, 사분위수, 회귀식 7가지'),
                  ('/distribution/', '확률 분포', '정규분포, 역정규, 이항, 푸아송'),
                  ('/equation/', '방정식', '연립 2~4원, 2~4차 방정식, 부등식, SOLVE'),
                  ('/matrix/', '행렬·벡터', '4×4까지 곱·역행렬·행렬식, 내적·외적'),
                  ('/base/', '진법 계산', '2·8·10·16진수, and·or·xor, 비트 수'),
                  ('/table/', '함수표', 'f(x)·g(x) 값을 200줄까지, 작은 그래프'),
                  ('/', '계산기', '자연 표시 공학용 계산기')],
        'guides_h': '헷갈릴 때 읽어 보세요',
        'faq_h': '자주 묻는 질문',
        'faq': [
            ('학생용 공학용 계산기와 기능이 같나요?',
             '3만 원대 학생용 공학용 계산기에 있는 계산은 거의 다 들어 있어요. 분수·루트 자연 표시, 삼각·역삼각·쌍곡선 함수, 로그, 순열·조합, 적분·미분·Σ·Π, 복소수, 도·분·초, 통계와 회귀, 정규·이항·푸아송 분포, 연립방정식(4원까지), 고차방정식(4차까지), 부등식, 행렬(4×4까지), 벡터, 진법, 함수표, 물리 상수와 단위 바꾸기가 있어요. 그래프를 크게 그리는 그래핑 계산기 기능은 없어요.'),
            ('6÷2(1+2)는 왜 1이 나오나요?',
             '곱하기 기호를 생략한 곱 2(1+2)를 ×, ÷ 보다 먼저 계산해서 6÷6 = 1 이 돼요. 많은 공학용 계산기가 이렇게 해요. 9를 원하면 6÷2×(1+2)처럼 × 를 넣어 주세요. <a href="/guide/order-of-operations/">계산 순서 가이드</a>에 자세히 있어요.'),
            ('sin 30 이 0.5가 아니라 −0.988… 이 나와요.',
             '각도 단위가 RAD(라디안)로 되어 있어서 그래요. 화면 왼쪽 위의 RAD 를 눌러 DEG 로 바꾸면 0.5(정확값 1/2)가 나와요.'),
            ('답이 √2/2 처럼 나오는데 소수로 보고 싶어요.',
             '결과 아래 S⇔D 를 누르거나, SHIFT 를 누르고 = 를 누르면(≈) 소수로 나와요. 보통 표시는 유효숫자 10자리예요. 설정에서 소수점 자리(Fix)나 유효숫자(Sci)를 정할 수 있어요.'),
            ('표준편차는 σ 와 s 중 무엇을 써야 하나요?',
             '자료 전체(모집단)를 다 가진 경우는 σ(모표준편차), 일부를 뽑은 표본으로 전체를 짐작하는 경우는 s(표본표준편차)를 써요. 통계 화면에 둘 다 나와요.'),
            ('입력한 식이나 자료가 어딘가로 전송되나요?',
             '아니요. 계산은 모두 이 브라우저 안에서 해요. 설정, 변수, 계산 기록만 이 기기에 저장돼요. 다만 페이지의 Google 광고는 쿠키를 쓸 수 있어요(개인정보 처리방침 참고).'),
        ],
    },
    'en': {
        'title': 'Scientific Calculator — free online, with fractions and roots shown like a textbook',
        'desc': 'Free online scientific calculator with natural textbook display: exact answers like √2/2, fractions, trig, logs, integrals and derivatives, statistics, equation solver, matrices and base-n. Works in your browser.',
        'h1': 'Free Online Scientific Calculator',
        'lede': 'Answers come out exact, like <b>√2/2</b>.',
        'points': ['<b>Fractions and roots</b> look like your textbook', '<b>Exact ⇔ decimal</b> in one tap (S⇔D)',
                   '<b>Free, nothing to install</b>, runs in your browser'],
        'kbd': 'Keyboard: digits and + − * / ^ ( ) work as usual; words like <span class="kbd">sin</span> <span class="kbd">sqrt</span> <span class="kbd">log</span> turn into functions. '
               '<span class="kbd">/</span> fraction · <span class="kbd">Enter</span> = · <span class="kbd">Shift+Enter</span> decimal · <span class="kbd">Esc</span> clear · <span class="kbd">↑↓</span> history',
        'tips_h': 'How to use it',
        'tips': [
            ('Fractions with the fraction key', 'Press <b>□/□</b> to get a top and bottom box. Type a number first and it becomes the numerator. Move between boxes with ▶ ◀.', 'Example: 1 □/□ 3 ▶ + 1 □/□ 6 = → 1/2'),
            ('Exact answers', 'sin 45 gives √2/2 and 1÷3 gives 1/3. Tap <b>S⇔D</b> under the result for the decimal. Expressions with a decimal point give a decimal right away (you can change this in Settings).', 'Example: √8 = 2√2 → S⇔D → 2.828427125'),
            ('More with SHIFT', 'The orange label above a key is its SHIFT function: press <b>SHIFT</b>, then the key. That is where sin⁻¹, 10ˣ, eˣ, nPr, nCr, Pol and Rec are.', 'Example: SHIFT sin 0.5 = → 30'),
            ('Keep going from the answer', 'Press + − × ÷ right after = to continue from <b>Ans</b>, the previous answer. Use ▲ ▼ to bring back an earlier expression and edit it.', None),
            ('Integrals, derivatives, sums', '<b>∫</b> gives a definite integral, SHIFT ∫ the derivative at a point and <b>Σ</b> a sum. Use <var>x</var> as the variable.', 'Example: Σ(x, 1, 100) = 5050'),
            ('Constants and units', 'The <b>FUNC</b> key holds 23 physical constants (CODATA 2022) such as the speed of light and Planck constant, plus conversions like in↔cm, lb↔kg and °F↔°C.', None),
        ],
        'modes_h': 'Other calculator screens',
        'modes': [('/stats/', 'Statistics & regression', 'Mean, σ and s, quartiles, 7 regression models'),
                  ('/distribution/', 'Probability distributions', 'Normal, inverse normal, binomial, Poisson'),
                  ('/equation/', 'Equation solver', 'Systems of 2–4 unknowns, quadratic to quartic, inequalities'),
                  ('/matrix/', 'Matrix & vector', 'Up to 4×4: multiply, inverse, determinant; dot and cross'),
                  ('/base/', 'Base-N', 'Binary, octal, decimal, hex with and, or, xor'),
                  ('/table/', 'Table of values', 'f(x) and g(x) for up to 200 rows, with a small chart'),
                  ('/', 'Calculator', 'Natural-display scientific calculator')],
        'guides_h': 'Guides',
        'faq_h': 'Frequently asked questions',
        'faq': [
            ('Does it do everything a school scientific calculator does?',
             'Almost everything a typical $20–30 student scientific calculator does: natural display of fractions and roots, trig, inverse and hyperbolic functions, logs, permutations and combinations, integrals, derivatives, Σ and Π, complex numbers, degrees-minutes-seconds, statistics and regression, normal, binomial and Poisson distributions, systems of up to 4 equations, polynomials up to degree 4, inequalities, matrices up to 4×4, vectors, base-n, tables of values, physical constants and unit conversions. It is not a graphing calculator.'),
            ('Why is 6÷2(1+2) equal to 1 here?',
             'A product written without the × sign, 2(1+2), is worked out before × and ÷, so it becomes 6÷6 = 1. Many scientific calculators do the same. If you want 9, type 6÷2×(1+2). The <a href="/en/guide/order-of-operations/">order of operations guide</a> explains why.'),
            ('Why does sin 30 give −0.988… instead of 0.5?',
             'The angle unit is set to RAD (radians). Tap RAD at the top left of the screen to switch to DEG and you get 0.5 (exactly 1/2).'),
            ('How do I get a decimal instead of √2/2?',
             'Tap S⇔D under the result, or press SHIFT and then = (≈). Normal display shows 10 significant digits; Settings let you fix the decimal places (Fix) or significant figures (Sci).'),
            ('Should I use σ or s for standard deviation?',
             'Use σ (population standard deviation) when your data is the whole group, and s (sample standard deviation) when your data is a sample used to estimate a larger group. The statistics screen shows both.'),
            ('Is anything I type sent to a server?',
             'No. All calculations run in your browser. Only your settings, variables and history are saved, on this device. The Google ads on the page may use cookies (see the privacy policy).'),
        ],
    },
}

MODE = {
    'stats': {
        'ko': {'name': '통계 계산기', 'title': '통계 계산기 — 평균, 표준편차, 사분위수, 회귀분석 | 공학용 계산기',
               'desc': '자료를 붙여 넣으면 평균, 모표준편차 σ와 표본표준편차 s, 분산, 중앙값, 사분위수, 합계를 바로 계산해요. 도수와 두 변수 회귀(일차·이차·로그·지수·거듭제곱·역수)도 돼요.',
               'h1': '통계 계산기', 'lede': '자료를 한 줄에 하나씩, 또는 쉼표로 붙여 넣으면 평균·표준편차·사분위수가 바로 나와요. y 를 넣으면 회귀식과 상관계수도 구해요.',
               'how': ['<b>x</b> 칸에 자료를 넣어요. 엑셀에서 복사한 열도 그대로 붙여 넣을 수 있어요.',
                       '같은 값이 여러 번이면 <b>도수</b>를 켜고 횟수를 적어요.',
                       '두 변수 자료면 <b>y</b> 를 켜고 회귀 종류를 골라요. 결과 아래에서 x 로 ŷ, y 로 x̂ 를 추정해요.',
                       '사분위수는 학생용 공학용 계산기 방식이 기본이에요. 엑셀(QUARTILE.INC)과 맞추려면 방식을 바꿔요.'],
               'more': '<p>σ(모표준편차)는 편차 제곱의 평균에 루트를, s(표본표준편차)는 n−1 로 나눈 값에 루트를 씌운 거예요. 어느 쪽을 써야 할지는 <a href="/guide/standard-deviation/">표준편차 σ 와 s 가이드</a>를 보세요.</p>'},
        'en': {'name': 'Statistics Calculator', 'title': 'Statistics Calculator — mean, standard deviation, quartiles, regression',
               'desc': 'Paste your data to get the mean, population and sample standard deviation (σ and s), variance, median, quartiles and sums. Supports frequencies and two-variable regression: linear, quadratic, log, exponential, power and inverse.',
               'h1': 'Statistics Calculator', 'lede': 'Paste numbers one per line or separated by commas to get the mean, standard deviations and quartiles at once. Add y values for regression and correlation.',
               'how': ['Put your data in the <b>x</b> column. A column copied from a spreadsheet pastes straight in.',
                       'If values repeat, turn on <b>Frequency</b> and enter how many times each occurs.',
                       'For paired data, turn on <b>y</b> and pick a regression model. Below the results you can estimate ŷ from x or x̂ from y.',
                       'Quartiles use the school scientific calculator method by default. Switch the method to match Excel’s QUARTILE.INC.'],
               'more': '<p>σ (population SD) is the square root of the mean squared deviation; s (sample SD) divides by n − 1 instead. See <a href="/en/guide/standard-deviation/">population vs sample standard deviation</a> for which one to use.</p>'},
    },
    'distribution': {
        'ko': {'name': '확률 분포 계산기', 'title': '정규분포 계산기 — 확률, 역정규분포, 이항·푸아송 분포 | 공학용 계산기',
               'desc': '정규분포의 확률 P(a≤X≤b)와 확률밀도, 확률로 값을 찾는 역정규분포, 이항분포와 푸아송분포의 확률·누적확률을 계산해요. 표준정규분포표 없이 바로.',
               'h1': '확률 분포 계산기', 'lede': '정규분포 넓이(확률), 확률로 경곗값 찾기, 이항·푸아송 분포를 계산해요. 표준정규분포표를 찾아볼 필요가 없어요.',
               'how': ['위에서 분포와 계산 종류를 골라요. <b>누적</b>은 구간의 확률, <b>밀도·확률</b>은 한 점의 값이에요.',
                       '정규분포는 평균 μ 와 표준편차 σ 를 넣어요. 표준정규분포는 μ=0, σ=1 이에요.',
                       '아래 끝을 비우면 −∞, 위 끝을 비우면 +∞ 로 계산해요.',
                       '역정규분포는 넓이(확률)와 꼬리 방향(왼쪽·오른쪽·가운데)으로 경곗값을 찾아요.'],
               'more': '<p>예: μ=0, σ=1 일 때 P(−1.96 ≤ Z ≤ 1.96) ≈ 0.9500 이고, 왼쪽 넓이 0.975 의 역정규값은 약 1.959963985 예요.</p>'},
        'en': {'name': 'Probability Distribution Calculator', 'title': 'Normal Distribution Calculator — probability, inverse normal, binomial, Poisson',
               'desc': 'Find normal distribution probabilities P(a≤X≤b) and density, inverse normal (z for a given area), and binomial and Poisson probabilities and cumulative probabilities. No z-table needed.',
               'h1': 'Normal & Probability Distribution Calculator', 'lede': 'Areas under the normal curve, the value for a given area, and binomial and Poisson probabilities. No z-table needed.',
               'how': ['Pick a distribution and a calculation at the top. <b>Cumulative</b> gives the probability of a range; <b>density / probability</b> gives the value at one point.',
                       'For the normal distribution enter the mean μ and standard deviation σ. The standard normal has μ = 0 and σ = 1.',
                       'Leave the lower bound empty for −∞ and the upper bound empty for +∞.',
                       'Inverse normal finds the cut-off value from an area and its tail (left, right or center).'],
               'more': '<p>Example: with μ = 0 and σ = 1, P(−1.96 ≤ Z ≤ 1.96) ≈ 0.9500, and the inverse normal for a left area of 0.975 is about 1.959963985.</p>'},
    },
    'equation': {
        'ko': {'name': '방정식 계산기', 'title': '방정식 계산기 — 연립방정식, 이차·삼차·사차방정식, 부등식 풀기 | 공학용 계산기',
               'desc': '연립일차방정식(2~4원), 이차·삼차·사차방정식의 근(복소수 근 포함, 정확값), 극값, 이차~사차 부등식, 아무 식이나 푸는 SOLVE, 비례식을 계산해요.',
               'h1': '방정식 계산기', 'lede': '연립방정식, 이차~사차방정식, 부등식을 풀어요. 근은 1+√2 처럼 정확값으로, 허근은 a+bi 로 보여 줘요.',
               'how': ['<b>연립방정식</b>: 미지수 개수를 고르고 계수를 칸에 넣어요. 해가 없거나 무수히 많으면 그렇게 알려 줘요.',
                       '<b>고차방정식</b>: 차수를 고르고 높은 차수부터 계수를 넣어요. 이차방정식은 꼭짓점(극값)도 함께 나와요.',
                       '<b>부등식</b>: 부등호를 고르면 해를 x<1, 3<x 같은 구간으로 보여 줘요.',
                       '<b>SOLVE</b>: x 가 들어간 아무 식이나 = 와 함께 쓰면 시작값 근처의 근을 찾아요. 예: cos(x)=x.',
                       '칸에는 1/3, √2, 2π 같은 식도 넣을 수 있어요.'],
               'more': '<p>이차방정식을 손으로 푸는 법과 판별식은 <a href="/guide/equations/">방정식 가이드</a>에 있어요.</p>'},
        'en': {'name': 'Equation Solver', 'title': 'Equation Solver — systems of equations, quadratic, cubic, quartic, inequalities',
               'desc': 'Solve systems of 2–4 linear equations, quadratic, cubic and quartic equations (exact and complex roots), find turning points, solve polynomial inequalities, or solve any equation numerically with SOLVE.',
               'h1': 'Equation Solver', 'lede': 'Systems of linear equations, quadratic to quartic polynomials and inequalities. Roots come out exact, like 1+√2, and complex roots as a+bi.',
               'how': ['<b>Simultaneous</b>: pick the number of unknowns and fill in the coefficients. It tells you when there is no solution or infinitely many.',
                       '<b>Polynomial</b>: pick the degree and enter coefficients from the highest power. Quadratics also show the vertex.',
                       '<b>Inequality</b>: pick the sign and get the solution as intervals such as x<1 or 3<x.',
                       '<b>SOLVE</b>: type any equation in x with = and it finds a root near your starting value, e.g. cos(x)=x.',
                       'Boxes accept expressions like 1/3, √2 or 2π.'],
               'more': '<p>For the quadratic formula and the discriminant, see the <a href="/en/guide/equations/">equations guide</a>.</p>'},
    },
    'matrix': {
        'ko': {'name': '행렬 계산기', 'title': '행렬 계산기 — 역행렬, 행렬식, 행렬 곱셈, 벡터 내적·외적 | 공학용 계산기',
               'desc': '4×4까지 행렬의 덧셈·뺄셈·곱셈, 역행렬, 행렬식, 전치, 계수(rank), 거듭제곱을 분수 그대로 계산해요. 벡터의 내적, 외적, 크기, 사이각, 단위벡터도 구해요.',
               'h1': '행렬·벡터 계산기', 'lede': '역행렬과 행렬식을 분수 그대로 계산해요. 4×4 까지, 벡터 내적·외적과 사이각도 돼요.',
               'how': ['행렬 A 와 B 의 크기를 고르고 칸을 채워요. 분수(1/3)나 루트(√2)도 넣을 수 있어요.',
                       '계산 버튼을 누르면 결과 행렬이 아래에 나와요. 결과를 A 나 B 로 옮겨서 이어서 계산할 수 있어요.',
                       '역행렬이 없으면(행렬식 0) 그렇게 알려 줘요.',
                       '<b>벡터</b> 탭에서는 2차원·3차원 벡터의 내적, 외적(3차원), 크기, 사이각을 구해요. 각도 단위는 계산기 설정을 따라요.'],
               'more': ''},
        'en': {'name': 'Matrix Calculator', 'title': 'Matrix Calculator — inverse, determinant, multiplication, vector dot and cross product',
               'desc': 'Add, subtract and multiply matrices up to 4×4, and find the inverse, determinant, transpose, rank and powers with exact fractions. Vectors: dot product, cross product, magnitude, angle and unit vector.',
               'h1': 'Matrix & Vector Calculator', 'lede': 'Inverses and determinants with exact fractions, up to 4×4. Dot and cross products and the angle between vectors too.',
               'how': ['Pick the sizes of matrices A and B and fill in the cells. Fractions (1/3) and roots (√2) are fine.',
                       'Press an operation to see the result below. You can copy the result into A or B to keep going.',
                       'If there is no inverse (determinant 0), it says so.',
                       'The <b>Vector</b> tab handles 2D and 3D vectors: dot product, cross product (3D), magnitude and angle. The angle unit follows the calculator setting.'],
               'more': ''},
    },
    'base': {
        'ko': {'name': '진법 변환 계산기', 'title': '진법 변환 계산기 — 2진수, 8진수, 16진수 변환과 비트 연산 | 공학용 계산기',
               'desc': '10진수, 16진수, 8진수, 2진수를 서로 바꾸고 사칙연산과 and, or, xor, xnor, not, neg 비트 연산을 해요. 8·16·32·64비트 2의 보수로 음수도 표시해요.',
               'h1': '진법 계산기', 'lede': '2진수·8진수·10진수·16진수를 한 번에 바꾸고 비트 연산을 해요. 음수는 2의 보수로 보여 줘요.',
               'how': ['입력할 진법을 고르고 수나 식을 써요. 예: 16진수에서 FF + 1, 2진수에서 1010 and 0110.',
                       '결과는 네 가지 진법으로 동시에 나와요.',
                       '비트 수(8·16·32·64)를 고르면 그 범위의 부호 있는 정수로 계산해요. 넘치면 오류를 보여 줘요.',
                       '나누기는 정수 부분만 남겨요(7÷2 = 3). 소수는 쓸 수 없어요.'],
               'more': ''},
        'en': {'name': 'Base-N Calculator', 'title': 'Binary, Hex & Octal Converter and Calculator — bitwise and, or, xor',
               'desc': 'Convert between decimal, hexadecimal, octal and binary, do arithmetic and bitwise and, or, xor, xnor, not and neg. Negative numbers shown in 8, 16, 32 or 64-bit two’s complement.',
               'h1': 'Base-N Calculator', 'lede': 'Convert between binary, octal, decimal and hex at once and do bitwise logic. Negative numbers appear in two’s complement.',
               'how': ['Pick the input base and type a number or expression, e.g. FF + 1 in hex, or 1010 and 0110 in binary.',
                       'The result appears in all four bases.',
                       'Pick a word size (8, 16, 32 or 64 bits) to calculate with signed integers of that size. Overflow is reported.',
                       'Division keeps the integer part (7÷2 = 3). Decimals are not allowed.'],
               'more': ''},
    },
    'table': {
        'ko': {'name': '함수표 계산기', 'title': '함수표 계산기 — f(x) 값 표 만들기와 그래프 | 공학용 계산기',
               'desc': 'f(x)와 g(x)를 넣고 시작값, 끝값, 간격을 정하면 함숫값 표를 200줄까지 만들어요. 작은 그래프로 모양을 확인하고 표를 복사할 수 있어요.',
               'h1': '함수표', 'lede': 'f(x) 를 넣고 시작·끝·간격을 정하면 값 표와 작은 그래프가 나와요. g(x) 를 넣으면 두 함수를 나란히 비교해요.',
               'how': ['f(x) 칸에 x 가 들어간 식을 써요. 예: x^2−3x+1, sin(x), 2^x.',
                       '시작값, 끝값, 간격을 넣어요. 표는 200줄까지예요.',
                       'g(x) 는 비워 두어도 돼요.',
                       '삼각함수는 계산기 각도 단위(DEG·RAD)를 따라요. 표 복사 버튼으로 엑셀에 붙여 넣을 수 있어요.'],
               'more': ''},
        'en': {'name': 'Table of Values Calculator', 'title': 'Table of Values Calculator — make a function table and graph',
               'desc': 'Enter f(x) and g(x), a start, end and step, and get a table of values of up to 200 rows with a small chart. Copy the table into a spreadsheet.',
               'h1': 'Table of Values', 'lede': 'Enter f(x), a start, end and step to get a table and a small chart. Add g(x) to compare two functions side by side.',
               'how': ['Type an expression in x in the f(x) box, e.g. x^2−3x+1, sin(x), 2^x.',
                       'Set the start, end and step. Up to 200 rows.',
                       'g(x) is optional.',
                       'Trig functions follow the calculator angle unit (DEG or RAD). Use Copy table to paste into a spreadsheet.'],
               'more': ''},
    },
}

PAGES = {
    'about': {
        'ko': {'title': '소개 | 공학용 계산기', 'desc': '공학용 계산기가 어떻게 계산하는지, 누가 만드는지, 계산을 어떻게 확인하는지 알려 드려요.',
               'h1': '공학용 계산기 소개', 'lede': '설치 없이 쓰는 무료 공학용 계산기예요.',
               'body': '''
<p>이 사이트는 학생용 공학용 계산기에 있는 계산을 브라우저에서 무료로 쓸 수 있게 만든 도구예요. 분수와 루트를 교과서처럼 보여 주고, 답을 √2/2, 1/3, 2π 같은 정확값으로 먼저 보여 줘요. 회원 가입이 없고 입력한 식은 서버로 보내지 않아요.</p>
<h2>누가 만드나요</h2>
<p><a href="https://lumenlab.page/">루멘랩(Lumen Lab)</a>이 만들고 운영해요. 루멘랩은 혼자 운영하는 작은 소프트웨어 스튜디오로, <a href="https://date.lumenlab.page/">며칠 계산기</a>와 맥 메뉴 막대 앱 Owlight 도 만들어요.</p>
<h2>어떻게 계산하나요</h2>
<ul>
<li><b>정확값</b>: 분수는 큰 정수 분수로, 루트와 π 는 기호 그대로 계산해서 반올림 오차가 없어요. 정확값으로 나타낼 수 없으면 소수(배정밀도)로 계산해요.</li>
<li><b>계산 순서</b>: 괄호 → 함수 → 거듭제곱(왼쪽부터) → 곱하기 기호를 생략한 곱 → × ÷ → + − 순서예요. 그래서 6÷2(1+2) = 1, −2² = −4 예요.</li>
<li><b>표시</b>: 보통 표시는 유효숫자 10자리, 10¹⁰ 이상이나 10⁻⁹ 미만은 지수 표기예요. 반올림은 사사오입이에요.</li>
<li><b>적분·미분</b>: 적분은 가우스-크론로드(7-15) 적응 적분, 미분은 리더스 방법으로 계산해요.</li>
<li><b>통계</b>: 사분위수는 학생용 공학용 계산기 방식이 기본이고, 엑셀 QUARTILE.INC 방식도 고를 수 있어요.</li>
<li><b>물리 상수</b>: 미국 표준기술연구소(NIST)의 CODATA 2022 권고값이에요.</li>
</ul>
<h2>계산을 어떻게 확인했나요</h2>
<p>Python 의 수학 라이브러리(sympy, mpmath, scipy, numpy)로 따로 구한 정답 3,700여 개와 이 계산기의 결과를 자동으로 맞춰 봐요. 물리 상수는 NIST 표와 한 자리씩 비교했어요. 그래도 시험이나 업무에 쓰기 전에는 중요한 값을 한 번 더 확인해 주세요.</p>
<h2>광고</h2>
<p>운영비를 위해 Google 애드센스 광고를 보여 줘요. 광고와 쿠키는 <a href="/privacy/">개인정보 처리방침</a>에 있어요.</p>
<h2>문의</h2>
<p>틀린 결과를 찾았거나 필요한 기능이 있으면 <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a> 으로 알려 주세요.</p>'''},
        'en': {'title': 'About | Scientific Calculator', 'desc': 'How this scientific calculator works, who makes it, and how its results are checked.',
               'h1': 'About this calculator', 'lede': 'A free scientific calculator that runs in your browser.',
               'body': '''
<p>This site puts the functions of a student scientific calculator in your browser, free. Fractions and roots are displayed as in a textbook, and answers come out exact first, like √2/2, 1/3 or 2π. There are no accounts, and what you type is never sent to a server.</p>
<h2>Who makes it</h2>
<p>It is made and run by <a href="https://lumenlab.page/en/">Lumen Lab</a>, a one-person software studio that also makes <a href="https://date.lumenlab.page/en/">Daycount</a>, a date calculator, and Owlight, a Mac menu bar app.</p>
<h2>How it calculates</h2>
<ul>
<li><b>Exact values</b>: fractions are kept as big-integer fractions and roots and π as symbols, so there is no rounding error. When an exact form is not possible it switches to double-precision decimals.</li>
<li><b>Order of operations</b>: brackets → functions → powers (left to right) → products without a × sign → × ÷ → + −. So 6÷2(1+2) = 1 and −2² = −4.</li>
<li><b>Display</b>: normal display shows 10 significant digits and switches to scientific notation at 10¹⁰ and above or below 10⁻⁹. Rounding is half up.</li>
<li><b>Calculus</b>: integrals use adaptive Gauss–Kronrod (7-15) quadrature; derivatives use Ridders’ method.</li>
<li><b>Statistics</b>: quartiles use the scientific calculator method by default, with Excel’s QUARTILE.INC as an option.</li>
<li><b>Physical constants</b>: CODATA 2022 recommended values from NIST.</li>
</ul>
<h2>How results are checked</h2>
<p>Automated tests compare the calculator with about 3,700 answers computed separately in Python (sympy, mpmath, scipy and numpy). The constants were compared digit by digit with the NIST table. Still, double-check important results before using them for exams or work.</p>
<h2>Advertising</h2>
<p>Google AdSense ads cover the running costs. See the <a href="/en/privacy/">privacy policy</a> for ads and cookies.</p>
<h2>Contact</h2>
<p>Found a wrong result or missing a feature? Email <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.</p>'''},
    },
    'privacy': {
        'ko': {'title': '개인정보 처리방침 | 공학용 계산기', 'desc': '공학용 계산기가 저장하는 정보와 광고 쿠키에 대한 안내예요.',
               'h1': '개인정보 처리방침', 'lede': '시행일: 2026년 10월 6일 · 운영: 루멘랩(Lumen Lab)',
               'body': '''
<h2>모으는 정보</h2>
<p>공학용 계산기는 회원 가입이 없고, 입력한 식과 자료를 서버로 보내지 않아요. 모든 계산은 이용자의 브라우저 안에서만 해요.</p>
<h2>기기에 저장하는 정보</h2>
<p>다음 방문 때 그대로 이어 쓰도록 브라우저 저장소(localStorage)에 설정(각도 단위, 숫자 표시), 변수 A·B·C·D·M·x·y 값, 직전 답(Ans), 최근 계산 기록 40개, 통계·방정식·행렬 같은 각 계산 화면에 넣은 값, 언어 안내 띠를 닫았는지를 기억해요. 이 정보는 이용자의 기기에만 있고, 계산기의 기록 지우기나 브라우저의 사이트 데이터 지우기로 언제든 지울 수 있어요.</p>
<h2>광고와 분석</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="https://policies.google.com/technologies/partner-sites?hl=ko">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="https://www.google.com/settings/ads">Google 광고 설정</a>에서 끌 수 있고, 자세한 내용은 <a href="https://policies.google.com/technologies/ads?hl=ko">Google 광고 정책</a>에 있어요. 방문 분석 도구는 따로 쓰지 않아요.</p>
<h2>서버 기록</h2>
<p>사이트는 Cloudflare에서 제공돼요. Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'''},
        'en': {'title': 'Privacy policy | Scientific Calculator', 'desc': 'What the scientific calculator stores and how ads use cookies.',
               'h1': 'Privacy policy', 'lede': 'Effective October 6, 2026 · Operated by Lumen Lab',
               'body': '''
<h2>What we collect</h2>
<p>The calculator has no accounts and never sends the expressions or data you enter to a server. All calculations run in your browser.</p>
<h2>What is stored on your device</h2>
<p>So you can pick up where you left off, your browser’s localStorage keeps your settings (angle unit, number format), the variables A, B, C, D, M, x and y, the previous answer (Ans), your last 40 calculations, the values you entered on the statistics, equation, matrix and other screens, and whether you closed the language bar. This stays on your device; clear it with the calculator’s Clear history button or by clearing site data in your browser.</p>
<h2>Ads and analytics</h2>
<p>This site shows ads through Google AdSense. Google and other ad vendors use cookies to serve ads based on your visits to this and other websites. Because of these ads, third parties such as Google may place or read cookies in your browser and collect information through web beacons (tiny invisible images). See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</a>. You can turn off personalized ads in <a href="https://www.google.com/settings/ads">Google Ad Settings</a>; see <a href="https://policies.google.com/technologies/ads">how Google uses cookies in advertising</a>. We don’t use separate analytics tools.</p>
<h2>Server logs</h2>
<p>The site is served by Cloudflare, which may briefly keep basic request logs such as IP addresses to operate the service securely.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>'''},
    },
}
