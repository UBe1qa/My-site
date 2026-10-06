"""가이드 글. 한국어 6편, 영어 5편 (같은 slug 는 서로 짝: hreflang 으로 이어진다).
본문 안의 [[try:식|글자]] 는 '계산기에서 열기' 단추, [[open:/경로/?…|글자]] 는 모드 화면 단추가 된다.
checks: 글에 적은 숫자를 tests/run_articles.js 가 계산기로 다시 계산해 맞춰 본다(build.py 가 tests/article_cases.json 으로 꺼냄).
  {'e': 식, 'angle': 'deg'|'rad', 'exact': 정확값 글자, 'dec': 소수 10자리 글자}
  {'stats': [자료], 'key': 'popSD'|'sampleSD'|…, 'dec': …}
  {'poly': [계수 높은 차수부터], 'roots': [글자…]}   {'sys': [[계수]], 'b': [상수], 'x': [글자…]}
"""
import re
from urllib.parse import quote

D = '2026-10-06'

ARTICLES = [
    # ================================================================ 계산 순서
    {'slug': 'order-of-operations', 'lang': 'ko', 'date': D,
     'title': '6÷2(1+2)는 1일까 9일까? 계산기 계산 순서 정리',
     'short': '곱하기 생략, −2², 지수가 계산기마다 다른 이유',
     'desc': '6÷2(1+2)가 계산기마다 1 또는 9로 다르게 나오는 이유와 공학용 계산기의 계산 순서(괄호, 함수, 거듭제곱, 생략된 곱, 곱셈·나눗셈)를 예시로 정리했어요.',
     'answer': '이 계산기에서는 <b>1</b>이에요. 곱하기 기호를 생략한 2(1+2)를 먼저 묶어 6÷6으로 계산하기 때문이에요. ×와 ÷를 왼쪽부터 차례로 계산하는 규칙을 그대로 쓰면 9가 나와요. 두 가지로 읽히는 식은 괄호를 넣어 뜻을 하나로 정하는 게 가장 확실해요.',
     'body': '''
<h2>답이 둘로 갈리는 이유</h2>
<p>학교에서 배우는 기본 규칙은 “곱셈과 나눗셈은 같은 순위이고 왼쪽부터”예요. 이 규칙으로 6÷2(1+2)를 읽으면 6÷2 = 3을 먼저 하고 3×3 = 9가 돼요.</p>
<p>그런데 2(1+2)처럼 숫자와 괄호를 붙여 쓴 곱을 한 덩어리로 보는 약속도 널리 쓰여요. 1÷2x 를 보통 1/(2x)로 읽는 것과 같은 이유예요. 이렇게 읽으면 6÷(2×3) = 1이에요.</p>
<p>어느 한쪽이 틀렸다기보다 식을 쓰는 약속이 두 가지인 거예요. 그래서 계산기도 제품과 모델에 따라 1이 나오기도 하고 9가 나오기도 해요. 예를 들어 카시오 fx-570ES PLUS·fx-991ES PLUS 설명서의 <a href="https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/sequence.html" rel="noopener">계산 순서표</a>(영어)에는 “곱하기 기호를 생략한 곱”이 곱하기·나누기보다 위에 있어요. 이 계산기도 그 방식을 따라요.</p>
<p>[[try:6÷2(1+2)|6÷2(1+2) 계산해 보기]] [[try:6÷2×(1+2)|6÷2×(1+2) 계산해 보기]]</p>
<h2>이 계산기의 계산 순서</h2>
<p>표의 위쪽부터 먼저 계산해요. 같은 줄끼리는 왼쪽부터예요.</p>
<table><thead><tr><th>순서</th><th>무엇</th><th>예</th></tr></thead><tbody>
<tr><td>1</td><td>괄호, 분수 칸, 루트 칸, 함수</td><td>(1+2), □/□, √□, sin(30)</td></tr>
<tr><td>2</td><td>숫자 뒤에 붙는 기호 (x², x! 키)</td><td>x², x⁻¹, x!, %, °′″</td></tr>
<tr><td>3</td><td>지수 칸에 쓰는 거듭제곱 (x<sup>□</sup> 키)</td><td>2³</td></tr>
<tr><td>4</td><td>앞에 붙는 마이너스 부호</td><td>−2² = −(2²) = −4</td></tr>
<tr><td>5</td><td>곱하기 기호를 생략한 곱</td><td>2π, 2(1+2), 3sin(30)</td></tr>
<tr><td>6</td><td>순열·조합</td><td>5P2, 5C2</td></tr>
<tr><td>7</td><td>곱하기·나누기</td><td>6÷2×3 = 9</td></tr>
<tr><td>8</td><td>더하기·빼기</td><td>1−2+3 = 2</td></tr>
</tbody></table>
<h2>자주 헷갈리는 예</h2>
<table><thead><tr><th>식</th><th>이 계산기</th><th>이유</th></tr></thead><tbody>
<tr><td>6÷2(1+2)</td><td>1</td><td>생략된 곱 2(1+2)를 먼저</td></tr>
<tr><td>6÷2×(1+2)</td><td>9</td><td>× 를 쓰면 왼쪽부터</td></tr>
<tr><td>−2²</td><td>−4</td><td>제곱을 먼저 하고 부호를 붙여요</td></tr>
<tr><td>(−2)²</td><td>4</td><td>괄호 안의 −2 를 제곱</td></tr>
<tr><td>1÷2π</td><td>≈&nbsp;0.159</td><td>1÷(2π) 와 같아요. 분모에 π가 있으면 소수로 보여 줘요</td></tr>
<tr><td>3sin(30), DEG</td><td>3/2</td><td>sin 30° = 1/2 에 3을 곱해요</td></tr>
</tbody></table>
<p>엑셀은 조금 달라요. 엑셀에 <code>=-2^2</code> 를 넣으면 부호를 먼저 붙여 4가 나와요. 같은 식이라도 프로그램마다 약속이 다를 수 있다는 걸 기억해 두세요.</p>
<h3>지수 안의 지수</h3>
<p>자연 표시 입력에서는 지수가 작은 칸에 들어가요. 지수 칸 안에서 다시 x<sup>□</sup> 를 누르면 지수 안의 지수가 되어 2<sup>3<sup>2</sup></sup> = 2⁹ = 512 예요. 지수 칸에서 ▶ 로 빠져나온 다음 x² 를 누르면 (2³)² = 64 예요. 칸이 눈에 보이니 어떤 뜻인지 헷갈릴 일이 적어요.</p>
<h2>헷갈리지 않게 쓰는 법</h2>
<ul>
<li>나누는 식은 분수 키 □/□ 로 쓰면 분모가 어디까지인지 눈에 보여요. 분자에 6, 분모에 2(1+2)를 넣으면 1이에요. 분수 6/2 를 쓰고 뒤에 ×(1+2)를 하면 9예요.</li>
<li>다른 사람에게 식을 보낼 때는 6÷(2(1+2)) 처럼 괄호를 하나 더 넣어요.</li>
<li>엑셀과 대부분의 프로그래밍 언어는 곱하기 생략을 쓸 수 없어서 <code>6/2*(1+2)</code> 처럼 써야 하고, 왼쪽부터 계산해 9가 나와요.</li>
</ul>''',
     'checks': [{'e': '6÷2(1+2)', 'exact': '1'}, {'e': '6÷2×(1+2)', 'exact': '9'}, {'e': '−2^2', 'exact': '−4'}, {'e': '(−2)^2', 'exact': '4'},
                {'e': '1÷2π', 'dec': '0.1591549431'}, {'e': '3sin(30)', 'angle': 'deg', 'exact': '3/2'}, {'e': '1−2+3', 'exact': '2'},
                {'e': '2^(3^2)', 'exact': '512'}, {'e': '(2^3)^2', 'exact': '64'}]},
    {'slug': 'order-of-operations', 'lang': 'en', 'date': D,
     'title': '6÷2(1+2) = 1 or 9? Order of operations on a calculator',
     'short': 'Implied multiplication, −2² and why calculators disagree',
     'desc': 'Why 6÷2(1+2) gives 1 on some calculators and 9 on others, and the exact order of operations a scientific calculator uses: brackets, functions, powers, implied multiplication, then × ÷ and + −.',
     'answer': 'On this calculator it is <b>1</b>, because the implied multiplication 2(1+2) is grouped first, making it 6÷6. If you apply PEMDAS strictly left to right for × and ÷, you get 9. When an expression can be read two ways, add brackets so it can only mean one thing.',
     'body': '''
<h2>Why there are two answers</h2>
<p>PEMDAS (or BODMAS) says multiplication and division have equal rank and go left to right. Read that way, 6÷2(1+2) is 6÷2 = 3 first, then 3×3 = 9.</p>
<p>But many people, textbooks and calculators treat a number written right against a bracket, like 2(1+2), as one unit. It is the same reason 1/2x is usually read as 1/(2x). Read that way, 6÷(2×3) = 1.</p>
<p>Neither reading is a math error; they are two writing conventions. That is why calculators differ by brand and model: some give 1 and some give 9. For example, the <a href="https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/sequence.html" rel="noopener">calculation priority table</a> in the Casio fx-570ES PLUS / fx-991ES PLUS manual puts “multiplication where the multiplication sign is omitted” above multiplication and division. This calculator follows the same rule.</p>
<p>[[try:6÷2(1+2)|Try 6÷2(1+2)]] [[try:6÷2×(1+2)|Try 6÷2×(1+2)]]</p>
<h2>The order this calculator uses</h2>
<p>Rows higher in the table are worked out first; within a row, left to right.</p>
<table><thead><tr><th>Step</th><th>What</th><th>Example</th></tr></thead><tbody>
<tr><td>1</td><td>Brackets, fraction boxes, root boxes, functions</td><td>(1+2), □/□, √□, sin(30)</td></tr>
<tr><td>2</td><td>Signs written after a number (x², x! keys)</td><td>x², x⁻¹, x!, %, °′″</td></tr>
<tr><td>3</td><td>Powers in an exponent box (x<sup>□</sup> key)</td><td>2³</td></tr>
<tr><td>4</td><td>Leading minus sign</td><td>−2² = −(2²) = −4</td></tr>
<tr><td>5</td><td>Implied multiplication</td><td>2π, 2(1+2), 3sin(30)</td></tr>
<tr><td>6</td><td>Permutations and combinations</td><td>5P2, 5C2</td></tr>
<tr><td>7</td><td>Multiply and divide</td><td>6÷2×3 = 9</td></tr>
<tr><td>8</td><td>Add and subtract</td><td>1−2+3 = 2</td></tr>
</tbody></table>
<h2>Examples that trip people up</h2>
<table><thead><tr><th>Expression</th><th>This calculator</th><th>Why</th></tr></thead><tbody>
<tr><td>6÷2(1+2)</td><td>1</td><td>Implied product 2(1+2) first</td></tr>
<tr><td>6÷2×(1+2)</td><td>9</td><td>With an explicit ×, left to right</td></tr>
<tr><td>−2²</td><td>−4</td><td>Square first, then the sign</td></tr>
<tr><td>(−2)²</td><td>4</td><td>The bracket squares −2</td></tr>
<tr><td>1÷2π</td><td>≈&nbsp;0.159</td><td>Same as 1÷(2π). With π in the denominator the answer is shown as a decimal</td></tr>
<tr><td>3sin(30), DEG</td><td>3/2</td><td>sin 30° = 1/2, times 3</td></tr>
</tbody></table>
<p>Spreadsheets differ again: Excel evaluates <code>=-2^2</code> as 4 because it applies the sign first. The same expression can mean different things in different programs.</p>
<h3>Powers of powers</h3>
<p>With natural display, an exponent sits in its own small box. Press x<sup>□</sup> again inside the exponent box and you get a tower: 2<sup>3<sup>2</sup></sup> = 2⁹ = 512. Leave the exponent box with ▶ and press x² instead, and you get (2³)² = 64. Because you can see the boxes, there is little room for confusion.</p>
<h2>How to avoid ambiguity</h2>
<ul>
<li>Use the fraction key □/□ for division, so you can see exactly what is in the denominator. 6 over 2(1+2) gives 1; the fraction 6/2 times (1+2) gives 9.</li>
<li>When you send an expression to someone else, write 6÷(2(1+2)) with the extra bracket.</li>
<li>Spreadsheets and most programming languages have no implied multiplication, so you must type <code>6/2*(1+2)</code>, which evaluates left to right to 9.</li>
</ul>''',
     'checks': [{'e': '6÷2(1+2)', 'exact': '1'}, {'e': '6÷2×(1+2)', 'exact': '9'}, {'e': '−2^2', 'exact': '−4'}, {'e': '(−2)^2', 'exact': '4'},
                {'e': '1÷2π', 'dec': '0.1591549431'}, {'e': '3sin(30)', 'angle': 'deg', 'exact': '3/2'}, {'e': '2^(3^2)', 'exact': '512'}, {'e': '(2^3)^2', 'exact': '64'}]},

    # ================================================================ 표준편차
    {'slug': 'standard-deviation', 'lang': 'ko', 'date': D,
     'title': '표준편차 σ와 s 차이 — 모표준편차와 표본표준편차 고르는 법',
     'short': 'n으로 나눌까 n−1로 나눌까, 예제로 비교',
     'desc': '모표준편차 σ와 표본표준편차 s가 무엇이 다른지, 언제 무엇을 써야 하는지 예제 자료 2, 4, 4, 4, 5, 5, 7, 9로 직접 계산하며 설명해요. 엑셀 STDEV.P, STDEV.S와의 관계도 정리했어요.',
     'answer': '자료가 알고 싶은 집단 <b>전체</b>면 σ(n으로 나눔), 전체에서 <b>일부를 뽑은 표본</b>으로 전체를 짐작하는 거면 s(n−1로 나눔)를 써요. 예를 들어 2, 4, 4, 4, 5, 5, 7, 9 의 σ는 2, s는 약 2.138 이에요.',
     'body': '''
<h2>두 공식</h2>
<p>표준편차는 자료가 평균에서 얼마나 퍼져 있는지를 나타내요. 각 값에서 평균을 뺀 편차를 제곱해 더한 뒤, 무엇으로 나누느냐만 달라요.</p>
<ul>
<li><b>모표준편차 σ</b> = √( Σ(x − x̄)² ÷ n )</li>
<li><b>표본표준편차 s</b> = √( Σ(x − x̄)² ÷ (n − 1) )</li>
</ul>
<p>계산기에서는 보통 σx 와 sx 로 표시해요. 엑셀에서는 STDEV.P 가 σ, STDEV.S(예전 이름 STDEV)가 s 예요.</p>
<h2>직접 계산해 보기</h2>
<p>자료 2, 4, 4, 4, 5, 5, 7, 9 (n = 8)의 평균은 40 ÷ 8 = 5 예요.</p>
<table><thead><tr><th>x</th><th>x − 5</th><th>(x − 5)²</th></tr></thead><tbody>
<tr><td>2</td><td>−3</td><td>9</td></tr>
<tr><td>4 (3개)</td><td>−1</td><td>1 × 3 = 3</td></tr>
<tr><td>5 (2개)</td><td>0</td><td>0</td></tr>
<tr><td>7</td><td>2</td><td>4</td></tr>
<tr><td>9</td><td>4</td><td>16</td></tr>
<tr><td colspan="2">합</td><td>32</td></tr>
</tbody></table>
<ul>
<li>σ² = 32 ÷ 8 = 4 이라서 <b>σ = 2</b></li>
<li>s² = 32 ÷ 7 ≈ 4.571428571 이라서 <b>s = √(32/7) ≈ 2.138089935</b></li>
</ul>
<p>[[open:/stats/?x=2,4,4,4,5,5,7,9|통계 화면에서 이 자료 열기]]</p>
<h2>왜 n − 1 로 나누나요</h2>
<p>표본의 평균 x̄ 는 표본 값들에 가장 가깝게 잡히는 값이라, 표본으로 구한 편차 제곱합은 진짜 모집단 평균으로 구했을 때보다 조금 작게 나오는 경향이 있어요. 그래서 n 대신 조금 작은 n − 1 로 나눠 모집단의 분산을 치우치지 않게 짐작해요. 이것을 베셀 보정이라고 불러요.</p>
<h2>어느 것을 쓰나요</h2>
<ul>
<li><b>σ</b>: 우리 반 30명 전체의 시험 점수, 올해 열두 달의 매출처럼 알고 싶은 대상을 빠짐없이 다 가진 경우</li>
<li><b>s</b>: 공장에서 매일 10개를 뽑아 검사하거나 설문에서 1,000명에게 물어 전체를 짐작하는 경우</li>
<li>교과서 문제는 대부분 σ, 실험 보고서와 통계 검정은 대부분 s 를 써요. 헷갈리면 문제나 과제에서 “표본”이라는 말이 있는지 보세요.</li>
</ul>
<p>자료가 많아지면 두 값의 차이는 작아져요. n = 100 이면 s 는 σ 의 √(100/99) ≈ 1.005 배라서 0.5% 정도만 커요.</p>''',
     'checks': [{'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'mean', 'dec': '5'}, {'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'popSD', 'dec': '2'},
                {'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'sampleSD', 'dec': '2.138089935'},
                {'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'sampleVar', 'dec': '4.571428571'}, {'e': 'sqrt(100÷99)', 'dec': '1.005037815'}]},
    {'slug': 'standard-deviation', 'lang': 'en', 'date': D,
     'title': 'σ vs s: population or sample standard deviation?',
     'short': 'Divide by n or n − 1? A worked example',
     'desc': 'The difference between population standard deviation σ and sample standard deviation s, when to use each, and a worked example with the data 2, 4, 4, 4, 5, 5, 7, 9. Also how they map to Excel STDEV.P and STDEV.S.',
     'answer': 'Use <b>σ</b> (divide by n) when your data is the <b>whole population</b> you care about, and <b>s</b> (divide by n − 1) when it is a <b>sample</b> used to estimate a larger population. For 2, 4, 4, 4, 5, 5, 7, 9, σ = 2 and s ≈ 2.138.',
     'body': '''
<h2>The two formulas</h2>
<p>Standard deviation measures how spread out data is around its mean. Both versions square each deviation from the mean and add them up; they differ only in what you divide by.</p>
<ul>
<li><b>Population SD σ</b> = √( Σ(x − x̄)² ÷ n )</li>
<li><b>Sample SD s</b> = √( Σ(x − x̄)² ÷ (n − 1) )</li>
</ul>
<p>Calculators usually label them σx and sx. In Excel, STDEV.P is σ and STDEV.S (formerly STDEV) is s.</p>
<h2>Worked example</h2>
<p>The data 2, 4, 4, 4, 5, 5, 7, 9 has n = 8 and mean 40 ÷ 8 = 5.</p>
<table><thead><tr><th>x</th><th>x − 5</th><th>(x − 5)²</th></tr></thead><tbody>
<tr><td>2</td><td>−3</td><td>9</td></tr>
<tr><td>4 (three times)</td><td>−1</td><td>1 × 3 = 3</td></tr>
<tr><td>5 (twice)</td><td>0</td><td>0</td></tr>
<tr><td>7</td><td>2</td><td>4</td></tr>
<tr><td>9</td><td>4</td><td>16</td></tr>
<tr><td colspan="2">Total</td><td>32</td></tr>
</tbody></table>
<ul>
<li>σ² = 32 ÷ 8 = 4, so <b>σ = 2</b></li>
<li>s² = 32 ÷ 7 ≈ 4.571428571, so <b>s = √(32/7) ≈ 2.138089935</b></li>
</ul>
<p>[[open:/stats/?x=2,4,4,4,5,5,7,9|Open this data on the statistics screen]]</p>
<h2>Why divide by n − 1?</h2>
<p>A sample’s mean x̄ is, by construction, the value closest to that sample, so the sum of squared deviations around it tends to come out a little smaller than it would around the true population mean. Dividing by the slightly smaller n − 1 corrects for that and gives an unbiased estimate of the population variance. This is called Bessel’s correction.</p>
<h2>Which one should you use?</h2>
<ul>
<li><b>σ</b>: you have every member of the group you care about, such as all 30 test scores in a class or 12 months of this year’s sales.</li>
<li><b>s</b>: you measured part of a larger group to learn about the whole, such as 10 items pulled from a production line or a survey of 1,000 people.</li>
<li>Textbook exercises often want σ; lab reports and statistical tests almost always use s. If the question says “sample”, use s.</li>
</ul>
<p>The gap shrinks as n grows. With n = 100, s is √(100/99) ≈ 1.005 times σ, only about 0.5% larger.</p>''',
     'checks': [{'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'popSD', 'dec': '2'}, {'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'sampleSD', 'dec': '2.138089935'},
                {'stats': [2, 4, 4, 4, 5, 5, 7, 9], 'key': 'sampleVar', 'dec': '4.571428571'}, {'e': 'sqrt(100÷99)', 'dec': '1.005037815'}]},

    # ================================================================ 도와 라디안
    {'slug': 'degrees-radians', 'lang': 'ko', 'date': D,
     'title': '도(DEG)와 라디안(RAD) — sin 30이 이상하게 나올 때',
     'short': '각도 단위 바꾸기와 도 ↔ 라디안 환산표',
     'desc': '공학용 계산기에서 sin 30이 0.5가 아니라 −0.988이 나오는 이유, 도와 라디안의 뜻과 환산 공식, 자주 쓰는 각도 환산표, 어떤 단위를 언제 쓰는지 정리했어요.',
     'answer': 'sin 30 이 0.5 가 아니라 −0.988… 이 나오면 계산기가 <b>라디안(RAD)</b> 모드예요. 30 을 30 라디안으로 읽은 거예요. 화면 위의 각도 표시를 눌러 DEG 로 바꾸면 0.5 가 나와요. 환산은 <b>라디안 = 도 × π/180</b> 이에요.',
     'body': '''
<h2>라디안이란</h2>
<p>도는 한 바퀴를 360 으로 나눈 단위예요. 라디안은 반지름과 같은 길이의 호가 만드는 각을 1 로 하는 단위예요. 한 바퀴의 호 길이는 2πr 이니까 한 바퀴는 2π 라디안이에요.</p>
<ul>
<li>360° = 2π rad, 180° = π rad</li>
<li>1 rad = 180°/π ≈ 57.29577951°</li>
<li>도 → 라디안: × π/180, 라디안 → 도: × 180/π</li>
</ul>
<p>[[try:180÷π|180÷π 계산해 보기]]</p>
<h2>자주 쓰는 각도</h2>
<table><thead><tr><th>도</th><th>라디안</th><th>sin</th><th>cos</th></tr></thead><tbody>
<tr><td>0°</td><td>0</td><td>0</td><td>1</td></tr>
<tr><td>30°</td><td>π/6</td><td>1/2</td><td>√3/2</td></tr>
<tr><td>45°</td><td>π/4</td><td>√2/2</td><td>√2/2</td></tr>
<tr><td>60°</td><td>π/3</td><td>√3/2</td><td>1/2</td></tr>
<tr><td>90°</td><td>π/2</td><td>1</td><td>0</td></tr>
<tr><td>180°</td><td>π</td><td>0</td><td>−1</td></tr>
<tr><td>360°</td><td>2π</td><td>0</td><td>1</td></tr>
</tbody></table>
<p>이 계산기는 이 각도들의 삼각함수 값을 위 표처럼 정확값으로 보여 줘요. S⇔D 를 누르면 소수로 바뀌어요(예: √3/2 → 0.8660254038).</p>
<h2>어떤 단위를 언제 쓰나요</h2>
<ul>
<li><b>DEG(도)</b>: 삼각형, 도형, 측량, 경사각, 방위처럼 각도를 눈으로 재는 문제</li>
<li><b>RAD(라디안)</b>: 미분·적분, 호의 길이(l = rθ), 각속도, 진동과 파동 같은 물리 공식. sin x 를 미분하면 cos x 라는 공식도 라디안일 때만 맞아요.</li>
<li><b>GRA(그레이드)</b>: 직각을 100 으로 나눈 단위예요. 일부 나라의 측량에서 써요. 거의 쓸 일이 없어요.</li>
</ul>
<p>엑셀과 프로그래밍 언어의 SIN, COS 함수는 라디안을 받아요. 엑셀에서 30° 의 사인은 <code>=SIN(RADIANS(30))</code> 처럼 써요.</p>
<h2>계산기에서 바꾸는 법</h2>
<ul>
<li>화면 왼쪽 위 DEG·RAD·GRA 표시를 누를 때마다 차례로 바뀌어요. 설정에서 골라도 돼요.</li>
<li>도·분·초는 °′″ 키(SHIFT + 괄호)로 넣어요. 30°15′ 는 30.25° 예요.</li>
<li>결과를 도·분·초로 보려면 결과 아래 °′″ 를 눌러요.</li>
</ul>''',
     'checks': [{'e': 'sin(30)', 'angle': 'rad', 'dec': '-0.9880316241'}, {'e': 'sin(30)', 'angle': 'deg', 'exact': '1/2'}, {'e': '180÷π', 'dec': '57.29577951'},
                {'e': 'sin(π÷6)', 'angle': 'rad', 'exact': '1/2'}, {'e': 'sin(60)', 'angle': 'deg', 'exact': '√3/2', 'dec': '0.8660254038'},
                {'e': 'cos(45)', 'angle': 'deg', 'exact': '√2/2'}, {'e': 'cos(180)', 'angle': 'deg', 'exact': '−1'}, {'e': '30°15′', 'dec': '30.25'}]},
    {'slug': 'degrees-radians', 'lang': 'en', 'date': D,
     'title': 'Degrees vs radians: why sin 30 gives −0.988 on your calculator',
     'short': 'Switching the angle mode, with a conversion table',
     'desc': 'Why a calculator returns sin 30 = −0.988 instead of 0.5, what degrees and radians mean, the conversion formulas, a table of common angles and when to use each unit.',
     'answer': 'If sin 30 gives −0.988… instead of 0.5, the calculator is in <b>radian (RAD)</b> mode and read 30 as 30 radians. Tap the angle indicator at the top of the screen to switch to DEG and you get 0.5. To convert, <b>radians = degrees × π/180</b>.',
     'body': '''
<h2>What a radian is</h2>
<p>A degree is 1/360 of a full turn. A radian is the angle made by an arc as long as the radius. A full circle’s arc is 2πr long, so a full turn is 2π radians.</p>
<ul>
<li>360° = 2π rad, 180° = π rad</li>
<li>1 rad = 180°/π ≈ 57.29577951°</li>
<li>Degrees → radians: × π/180. Radians → degrees: × 180/π.</li>
</ul>
<p>[[try:180÷π|Try 180÷π]]</p>
<h2>Common angles</h2>
<table><thead><tr><th>Degrees</th><th>Radians</th><th>sin</th><th>cos</th></tr></thead><tbody>
<tr><td>0°</td><td>0</td><td>0</td><td>1</td></tr>
<tr><td>30°</td><td>π/6</td><td>1/2</td><td>√3/2</td></tr>
<tr><td>45°</td><td>π/4</td><td>√2/2</td><td>√2/2</td></tr>
<tr><td>60°</td><td>π/3</td><td>√3/2</td><td>1/2</td></tr>
<tr><td>90°</td><td>π/2</td><td>1</td><td>0</td></tr>
<tr><td>180°</td><td>π</td><td>0</td><td>−1</td></tr>
<tr><td>360°</td><td>2π</td><td>0</td><td>1</td></tr>
</tbody></table>
<p>This calculator returns these values exactly, as in the table. Tap S⇔D for the decimal (for example √3/2 → 0.8660254038).</p>
<h2>When to use which</h2>
<ul>
<li><b>DEG</b>: triangles, geometry, surveying, slopes and bearings, anywhere you measure angles with a protractor.</li>
<li><b>RAD</b>: calculus, arc length (s = rθ), angular velocity, oscillations and waves. The rule that the derivative of sin x is cos x only holds in radians.</li>
<li><b>GRA</b> (gradians): a right angle is 100 gradians. Used in some surveying; you will rarely need it.</li>
</ul>
<p>The SIN and COS functions in Excel and in programming languages take radians. In Excel, the sine of 30° is <code>=SIN(RADIANS(30))</code>.</p>
<h2>Changing the mode here</h2>
<ul>
<li>Tap DEG, RAD or GRA at the top left of the screen to cycle through them, or choose in Settings.</li>
<li>Enter degrees-minutes-seconds with the °′″ key (SHIFT + bracket). 30°15′ is 30.25°.</li>
<li>To see a result in degrees-minutes-seconds, tap °′″ under the result.</li>
</ul>''',
     'checks': [{'e': 'sin(30)', 'angle': 'rad', 'dec': '-0.9880316241'}, {'e': 'sin(30)', 'angle': 'deg', 'exact': '1/2'}, {'e': '180÷π', 'dec': '57.29577951'},
                {'e': 'sin(60)', 'angle': 'deg', 'exact': '√3/2', 'dec': '0.8660254038'}, {'e': '30°15′', 'dec': '30.25'}]},

    # ================================================================ 방정식
    {'slug': 'equations', 'lang': 'ko', 'date': D,
     'title': '이차방정식·연립방정식 푸는 법 — 근의 공식, 판별식, 계산기 사용법',
     'short': '근의 공식과 판별식, 해가 없거나 무수히 많을 때',
     'desc': '이차방정식 근의 공식과 판별식으로 실근·중근·허근을 구분하는 법, 연립일차방정식의 해가 없거나 무수히 많은 경우, 방정식 계산기로 푸는 법을 예제로 정리했어요.',
     'answer': 'ax²+bx+c = 0 의 근은 <b>x = (−b ± √(b²−4ac)) / 2a</b> 예요. 판별식 D = b²−4ac 가 양수면 서로 다른 두 실근, 0 이면 중근, 음수면 두 허근이에요. 방정식 화면에 a, b, c 만 넣으면 근을 1+√2 같은 정확값으로 보여 줘요.',
     'body': '''
<h2>이차방정식 예제</h2>
<table><thead><tr><th>방정식</th><th>판별식 D</th><th>근</th></tr></thead><tbody>
<tr><td>x² − 2x − 1 = 0</td><td>8 (양수)</td><td>x = 1 − √2, 1 + √2 (약 −0.4142135624, 2.414213562)</td></tr>
<tr><td>x² − 6x + 9 = 0</td><td>0</td><td>x = 3 (중근)</td></tr>
<tr><td>x² + 2x + 5 = 0</td><td>−16 (음수)</td><td>x = −1 − 2i, −1 + 2i</td></tr>
</tbody></table>
<p>첫 번째 식을 공식에 넣으면 x = (2 ± √8)/2 = (2 ± 2√2)/2 = 1 ± √2 예요. √8 = 2√2 처럼 루트 안을 간단히 하는 것까지 계산기가 해 줘요.</p>
<p>y = x² − 2x − 1 의 그래프는 x = 1 에서 가장 낮고 그때 y = −2 예요(꼭짓점 (1, −2)). 방정식 화면은 근과 함께 이 꼭짓점도 보여 줘요.</p>
<p>[[open:/equation/?poly=1,-2,-1|방정식 화면에서 x²−2x−1=0 풀기]]</p>
<h2>삼차·사차방정식</h2>
<p>삼차방정식부터는 손으로 풀기가 어려워요. 계산기는 정수·분수 근을 먼저 찾아 차수를 낮추고, 남은 부분을 근의 공식이나 수치 계산으로 풀어요. 예: x³ − 6x² + 11x − 6 = 0 의 근은 1, 2, 3 이에요.</p>
<h2>연립일차방정식</h2>
<p>2x + 3y = 12, x − y = 1 을 풀면 x = 3, y = 2 예요. 둘째 식에서 x = y + 1 을 첫째 식에 넣으면 2(y + 1) + 3y = 12, 5y = 10 이라서 y = 2 예요.</p>
<p>연립방정식은 해가 하나가 아닐 수도 있어요.</p>
<ul>
<li><b>해가 없음</b>: x + y = 1, 2x + 2y = 3 처럼 왼쪽은 비례하는데 오른쪽은 비례하지 않을 때(평행한 두 직선)</li>
<li><b>해가 무수히 많음</b>: x + y = 1, 2x + 2y = 2 처럼 두 식이 사실 같은 식일 때(겹치는 두 직선)</li>
</ul>
<p>방정식 화면은 이런 경우를 “해 없음”, “해가 무수히 많음”으로 알려 줘요. 미지수는 4개까지 풀 수 있어요.</p>
<h2>계산기로 풀 때 주의할 점</h2>
<ul>
<li>계수는 높은 차수부터 넣어요. 빠진 항은 0 을 넣어요. x² − 4 = 0 이면 a = 1, b = 0, c = −4 예요.</li>
<li>칸에는 1/3, √2, 2π 같은 식도 넣을 수 있어요.</li>
<li>근이 맞는지 확인하려면 계산기에서 근을 원래 식에 넣어 0 이 되는지 보세요.</li>
</ul>''',
     'checks': [{'poly': [1, -2, -1], 'roots': ['1−√2', '1+√2']}, {'poly': [1, -6, 9], 'roots': ['3', '3']}, {'poly': [1, 2, 5], 'roots': ['−1+2i', '−1−2i']},
                {'poly': [1, -6, 11, -6], 'roots': ['1', '2', '3']}, {'e': '1−√(2)', 'dec': '-0.4142135624'}, {'e': '1+√(2)', 'dec': '2.414213562'},
                {'sys': [[2, 3], [1, -1]], 'b': [12, 1], 'x': ['3', '2']}, {'sys': [[1, 1], [2, 2]], 'b': [1, 3], 'kind': 'none'},
                {'sys': [[1, 1], [2, 2]], 'b': [1, 2], 'kind': 'many'}]},
    {'slug': 'equations', 'lang': 'en', 'date': D,
     'title': 'Solving quadratic and simultaneous equations',
     'short': 'Quadratic formula, discriminant, no or infinitely many solutions',
     'desc': 'The quadratic formula and how the discriminant tells you whether roots are real, repeated or complex; when a system of linear equations has no solution or infinitely many; and how to use the equation solver.',
     'answer': 'The roots of ax²+bx+c = 0 are <b>x = (−b ± √(b²−4ac)) / 2a</b>. If the discriminant D = b²−4ac is positive there are two real roots, if it is 0 one repeated root, and if negative two complex roots. Enter a, b and c on the equation screen to get exact roots like 1+√2.',
     'body': '''
<h2>Quadratic examples</h2>
<table><thead><tr><th>Equation</th><th>Discriminant D</th><th>Roots</th></tr></thead><tbody>
<tr><td>x² − 2x − 1 = 0</td><td>8 (positive)</td><td>x = 1 − √2, 1 + √2 (about −0.4142135624, 2.414213562)</td></tr>
<tr><td>x² − 6x + 9 = 0</td><td>0</td><td>x = 3 (repeated)</td></tr>
<tr><td>x² + 2x + 5 = 0</td><td>−16 (negative)</td><td>x = −1 − 2i, −1 + 2i</td></tr>
</tbody></table>
<p>For the first one, the formula gives x = (2 ± √8)/2 = (2 ± 2√2)/2 = 1 ± √2. The calculator simplifies √8 to 2√2 for you.</p>
<p>The graph of y = x² − 2x − 1 is lowest at x = 1, where y = −2 (vertex (1, −2)). The equation screen shows the vertex along with the roots.</p>
<p>[[open:/equation/?poly=1,-2,-1|Solve x²−2x−1=0 on the equation screen]]</p>
<h2>Cubics and quartics</h2>
<p>From degree three on, solving by hand gets hard. The calculator first looks for whole-number and fraction roots to lower the degree, then solves what is left with the quadratic formula or numerically. For example, x³ − 6x² + 11x − 6 = 0 has roots 1, 2 and 3.</p>
<h2>Simultaneous linear equations</h2>
<p>Solving 2x + 3y = 12 and x − y = 1 gives x = 3, y = 2. From the second equation x = y + 1; substituting, 2(y + 1) + 3y = 12, so 5y = 10 and y = 2.</p>
<p>A system does not always have exactly one solution:</p>
<ul>
<li><b>No solution</b>: x + y = 1 and 2x + 2y = 3. The left sides are proportional but the right sides are not (parallel lines).</li>
<li><b>Infinitely many</b>: x + y = 1 and 2x + 2y = 2. The two equations are really the same line.</li>
</ul>
<p>The equation screen reports these cases as “no solution” and “infinitely many solutions”. It handles up to four unknowns.</p>
<h2>Tips</h2>
<ul>
<li>Enter coefficients from the highest power down, with 0 for missing terms: x² − 4 = 0 is a = 1, b = 0, c = −4.</li>
<li>Boxes accept expressions such as 1/3, √2 or 2π.</li>
<li>To check a root, substitute it back into the original equation and see that you get 0.</li>
</ul>''',
     'checks': [{'poly': [1, -2, -1], 'roots': ['1−√2', '1+√2']}, {'poly': [1, -6, 9], 'roots': ['3', '3']}, {'poly': [1, 2, 5], 'roots': ['−1+2i', '−1−2i']},
                {'poly': [1, -6, 11, -6], 'roots': ['1', '2', '3']}, {'sys': [[2, 3], [1, -1]], 'b': [12, 1], 'x': ['3', '2']},
                {'sys': [[1, 1], [2, 2]], 'b': [1, 3], 'kind': 'none'}, {'sys': [[1, 1], [2, 2]], 'b': [1, 2], 'kind': 'many'}]},

    # ================================================================ 순열·조합
    {'slug': 'permutations-combinations', 'lang': 'ko', 'date': D,
     'title': '순열과 조합 차이 — nPr, nCr 공식과 계산기 사용법',
     'short': '순서가 있으면 순열, 없으면 조합. 로또 확률까지',
     'desc': '순열 nPr 과 조합 nCr 의 차이와 공식, 공학용 계산기에서 nPr·nCr 입력하는 법, 로또 당첨 확률·비밀번호 경우의 수 같은 예제를 정리했어요.',
     'answer': '뽑는 <b>순서가 중요하면 순열</b> nPr = n!/(n−r)!, <b>순서가 상관없으면 조합</b> nCr = n!/(r!(n−r)!) 이에요. 5명 중 회장·부회장을 뽑는 경우는 5P2 = 20가지, 대표 2명을 뽑는 경우는 5C2 = 10가지예요.',
     'body': '''
<h2>순서가 있나 없나</h2>
<p>5명(가, 나, 다, 라, 마) 중 2명을 뽑는다고 해 볼게요.</p>
<ul>
<li><b>회장과 부회장</b>을 뽑으면 (가 회장, 나 부회장)과 (나 회장, 가 부회장)이 달라요. 순서가 있으니 순열: 5 × 4 = <b>20</b>가지</li>
<li><b>대표 2명</b>을 뽑으면 {가, 나}와 {나, 가}가 같아요. 순서가 없으니 조합: 20 ÷ 2 = <b>10</b>가지</li>
</ul>
<p>조합은 순열을 “뽑힌 사람끼리 줄 세우는 경우의 수 r!”로 나눈 거예요. 그래서 nCr = nPr ÷ r! 이에요.</p>
<h2>공식</h2>
<ul>
<li>nPr = n! / (n − r)! = n × (n−1) × … × (n−r+1)</li>
<li>nCr = n! / (r! × (n − r)!)</li>
<li>n! = 1 × 2 × … × n, 0! = 1</li>
<li>nCr = nC(n−r): 45개 중 6개를 고르는 수는 39개를 남기는 수와 같아요.</li>
</ul>
<h2>계산기에서 넣는 법</h2>
<p>n 을 누르고 <b>SHIFT ×</b>(nPr) 또는 <b>SHIFT ÷</b>(nCr), 그다음 r 을 누르고 = 예요. 키보드로는 <code>5P2</code>, <code>5C2</code> 처럼 대문자 P, C 를 써요. 팩토리얼은 <b>SHIFT x⁻¹</b>(x!) 이에요.</p>
<p>[[try:5P2|5P2 계산해 보기]] [[try:5C2|5C2 계산해 보기]]</p>
<h2>예제</h2>
<table><thead><tr><th>상황</th><th>식</th><th>경우의 수</th></tr></thead><tbody>
<tr><td>로또 6/45 번호 고르기</td><td>45C6</td><td>8,145,060</td></tr>
<tr><td>카드 52장 중 5장 받기</td><td>52C5</td><td>2,598,960</td></tr>
<tr><td>서로 다른 숫자 4자리 비밀번호</td><td>10P4</td><td>5,040</td></tr>
<tr><td>숫자 4자리 비밀번호(같은 숫자 허용)</td><td>10⁴</td><td>10,000</td></tr>
<tr><td>10명을 한 줄로 세우기</td><td>10!</td><td>3,628,800</td></tr>
</tbody></table>
<p>로또 1등 확률은 1 ÷ 45C6 = 1/8145060 ≈ 0.000000123 이에요. 계산기에서는 1.22773804×10⁻⁷ 처럼 지수 표기로 보여 줘요.</p>
<p>[[try:1÷45C6|1÷45C6 계산해 보기]]</p>
<h2>큰 수</h2>
<p>팩토리얼은 금방 커져요. 70! 은 약 1.197857167×10¹⁰⁰ 이에요. 이 계산기는 정수 팩토리얼을 3000! 까지 계산해요. 너무 크면 지수 표기로 보여 줘요.</p>''',
     'checks': [{'e': '5P2', 'exact': '20'}, {'e': '5C2', 'exact': '10'}, {'e': '45C6', 'exact': '8145060'}, {'e': '52C5', 'exact': '2598960'},
                {'e': '10P4', 'exact': '5040'}, {'e': '10^4', 'exact': '10000'}, {'e': '10!', 'exact': '3628800'}, {'e': '1÷45C6', 'exact': '1/8145060', 'dec': '1.22773804E-7'},
                {'e': '70!', 'dec': '1.197857167E100'}, {'e': '45C39', 'exact': '8145060'}]},
    {'slug': 'permutations-combinations', 'lang': 'en', 'date': D,
     'title': 'Permutations vs combinations: nPr and nCr explained',
     'short': 'Order matters → permutation; it doesn’t → combination',
     'desc': 'The difference between permutations (nPr) and combinations (nCr), their formulas, how to enter them on a scientific calculator, and worked examples from lottery odds to PIN codes and card hands.',
     'answer': 'If <b>order matters</b>, it is a permutation: nPr = n!/(n−r)!. If <b>order doesn’t matter</b>, it is a combination: nCr = n!/(r!(n−r)!). Choosing a president and vice-president from 5 people gives 5P2 = 20 ways; choosing 2 representatives gives 5C2 = 10.',
     'body': '''
<h2>Does order matter?</h2>
<p>Say you pick 2 of 5 people: Ann, Ben, Cal, Dee and Eve.</p>
<ul>
<li>Picking a <b>president and a vice-president</b>: (Ann, Ben) is different from (Ben, Ann). Order matters, so it is a permutation: 5 × 4 = <b>20</b> ways.</li>
<li>Picking <b>two representatives</b>: {Ann, Ben} is the same as {Ben, Ann}. Order doesn’t matter, so it is a combination: 20 ÷ 2 = <b>10</b> ways.</li>
</ul>
<p>A combination is a permutation divided by the r! ways to arrange the chosen items, so nCr = nPr ÷ r!.</p>
<h2>Formulas</h2>
<ul>
<li>nPr = n! / (n − r)! = n × (n−1) × … × (n−r+1)</li>
<li>nCr = n! / (r! × (n − r)!)</li>
<li>n! = 1 × 2 × … × n, and 0! = 1</li>
<li>nCr = nC(n−r): choosing 6 of 45 is the same as choosing the 39 to leave out.</li>
</ul>
<h2>Entering them on the calculator</h2>
<p>Type n, press <b>SHIFT ×</b> (nPr) or <b>SHIFT ÷</b> (nCr), type r and press =. On a keyboard, type <code>5P2</code> or <code>5C2</code> with a capital P or C. Factorial is <b>SHIFT x⁻¹</b> (x!).</p>
<p>[[try:5P2|Try 5P2]] [[try:5C2|Try 5C2]]</p>
<h2>Examples</h2>
<table><thead><tr><th>Situation</th><th>Expression</th><th>Ways</th></tr></thead><tbody>
<tr><td>Pick 6 lottery numbers from 1–45</td><td>45C6</td><td>8,145,060</td></tr>
<tr><td>A 5-card poker hand from 52</td><td>52C5</td><td>2,598,960</td></tr>
<tr><td>4-digit PIN, all digits different</td><td>10P4</td><td>5,040</td></tr>
<tr><td>4-digit PIN, repeats allowed</td><td>10⁴</td><td>10,000</td></tr>
<tr><td>Line up 10 people</td><td>10!</td><td>3,628,800</td></tr>
</tbody></table>
<p>The chance of matching all 6 numbers in a 6/45 lottery is 1 ÷ 45C6 = 1/8145060 ≈ 0.000000123, shown as 1.22773804×10⁻⁷ in scientific notation.</p>
<p>[[try:1÷45C6|Try 1÷45C6]]</p>
<h2>Big numbers</h2>
<p>Factorials grow fast: 70! is about 1.197857167×10¹⁰⁰. This calculator handles integer factorials up to 3000! and switches to scientific notation when the result is long.</p>''',
     'checks': [{'e': '5P2', 'exact': '20'}, {'e': '5C2', 'exact': '10'}, {'e': '45C6', 'exact': '8145060'}, {'e': '52C5', 'exact': '2598960'},
                {'e': '10P4', 'exact': '5040'}, {'e': '10^4', 'exact': '10000'}, {'e': '10!', 'exact': '3628800'}, {'e': '1÷45C6', 'exact': '1/8145060', 'dec': '1.22773804E-7'},
                {'e': '70!', 'dec': '1.197857167E100'}]},

    # ================================================================ 정확값과 소수 (한국어만)
    {'slug': 'exact-vs-decimal', 'lang': 'ko', 'date': D,
     'title': '계산기 답이 분수·루트로 나올 때 — S⇔D로 소수 바꾸기',
     'short': '√2/2, 1/3 같은 정확값과 소수, 반올림 오차',
     'desc': '공학용 계산기 답이 √2/2, 1/3, π/4처럼 분수·루트로 나오는 이유와 S⇔D로 소수로 바꾸는 법, 소수점 자리 고정(Fix)·유효숫자(Sci) 설정, 0.1+0.2 반올림 오차 이야기를 정리했어요.',
     'answer': '이 계산기는 답을 먼저 <b>정확값</b>(분수, 루트, π)으로 보여 줘요. 결과 아래 <b>S⇔D</b> 를 누르면 소수로, 다시 누르면 정확값으로 돌아와요. 처음부터 소수로 받으려면 <b>SHIFT =</b>(≈)로 계산해요.',
     'body': '''
<h2>정확값으로 나오는 것</h2>
<table><thead><tr><th>식</th><th>정확값</th><th>소수 (S⇔D)</th></tr></thead><tbody>
<tr><td>2 ÷ 3</td><td>2/3</td><td>0.6666666667</td></tr>
<tr><td>√12</td><td>2√3</td><td>3.464101615</td></tr>
<tr><td>sin 60°</td><td>√3/2</td><td>0.8660254038</td></tr>
<tr><td>tan 30°</td><td>√3/3</td><td>0.5773502692</td></tr>
<tr><td>π ÷ 4</td><td>π/4</td><td>0.7853981634</td></tr>
</tbody></table>
<p>분수는 약분하고, 루트는 √12 = 2√3 처럼 밖으로 꺼낼 수 있는 만큼 꺼내요. 분모의 루트는 없애서 1/√3 대신 √3/3 으로 보여 줘요. 교과서 답과 같은 모양이라 숙제 답을 맞춰 보기 좋아요.</p>
<p>log, ln, e 가 들어간 값, 정확값이 너무 길어지는 값은 처음부터 소수로 보여 줘요.</p>
<p>[[try:sqrt(12)|√12 계산해 보기]] [[try:sin(60)|sin 60 계산해 보기]]</p>
<h2>왜 정확값이 좋나요</h2>
<p>컴퓨터는 0.1 같은 소수를 2진수로 정확히 담지 못해서 아주 작은 오차가 생겨요. 그래서 많은 프로그램이 0.1 + 0.2 − 0.3 을 0 이 아니라 5.55×10⁻¹⁷ 같은 아주 작은 수로 계산해요. 이 계산기는 0.1 을 1/10 로 계산해서 0 이 나와요.</p>
<p>[[try:0.1+0.2−0.3|0.1+0.2−0.3 계산해 보기]]</p>
<h2>소수로 보는 법</h2>
<ul>
<li><b>S⇔D</b>: 결과 아래 단추. 정확값 ⇔ 소수를 오가요.</li>
<li><b>SHIFT =</b>(≈): 처음부터 소수로 계산해요.</li>
<li><b>소수점을 넣은 식</b>: 0.5 × 3 처럼 소수를 넣으면 답도 1.5 처럼 소수로 보여 줘요. 설정에서 “소수를 넣으면 결과도 소수로”를 끄면 3/2 로 보여 줘요.</li>
<li>소수 결과에서 S⇔D 를 누르면 분수로 나타낼 수 있을 때 분수로 바꿔 줘요.</li>
</ul>
<h2>몇 자리까지 보이나요</h2>
<ul>
<li><b>보통(Norm)</b>: 유효숫자 10자리. 10¹⁰ 이상이나 10⁻⁹ 미만은 1.23×10¹² 처럼 지수 표기예요.</li>
<li><b>Fix</b>: 소수점 아래 자리를 0~9자리로 고정해요. 돈 계산은 Fix 2 가 편해요.</li>
<li><b>Sci</b>: 유효숫자 1~10자리 지수 표기로 보여 줘요. 실험값을 유효숫자 3자리로 쓸 때 Sci 3 을 써요.</li>
<li><b>ENG</b>: 결과 아래 단추. 지수를 3의 배수(10³, 10⁻⁶)로 맞춰서 k, m, μ 같은 단위로 읽기 쉬워요.</li>
</ul>
<p>반올림은 사사오입이에요. 표시만 반올림하고 계산은 원래 값으로 이어 가요. 반올림한 값으로 계산하고 싶으면 함수 목록의 Rnd 를 써요.</p>''',
     'checks': [{'e': '2÷3', 'exact': '2/3', 'dec': '0.6666666667'}, {'e': 'sqrt(12)', 'exact': '2√3', 'dec': '3.464101615'},
                {'e': 'sin(60)', 'angle': 'deg', 'exact': '√3/2', 'dec': '0.8660254038'}, {'e': 'tan(30)', 'angle': 'deg', 'exact': '√3/3', 'dec': '0.5773502692'},
                {'e': 'π÷4', 'exact': 'π/4', 'dec': '0.7853981634'}, {'e': '0.1+0.2−0.3', 'exact': '0'}, {'e': '1÷sqrt(3)', 'exact': '√3/3'},
                {'e': '0.5×3', 'dec': '1.5'}]},
]


def list_for(lang):
    return [a for a in ARTICLES if a['lang'] == lang]


def paired(slug):
    return len([a for a in ARTICLES if a['slug'] == slug]) == 2


def render_body(a, lang, url, absolute=None):
    base = absolute or ''

    def try_link(m):
        expr, label = m.group(1), m.group(2)
        href = url(lang, '/') + '?e=' + quote(expr, safe='')
        return '<a class="try" href="%s%s">%s ▸</a>' % (base, href, label)

    def open_link(m):
        path, label = m.group(1), m.group(2)
        return '<a class="try" href="%s%s">%s ▸</a>' % (base, url(lang, path), label)

    s = re.sub(r'\[\[try:(.+?)\|(.+?)\]\]', try_link, a['body'])
    s = re.sub(r'\[\[open:(.+?)\|(.+?)\]\]', open_link, s)
    if absolute:   # RSS: 안쪽 링크를 전체 주소로
        s = re.sub(r'href="/', 'href="%s/' % absolute, s)
    return s
