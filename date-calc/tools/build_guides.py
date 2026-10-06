#!/usr/bin/env python3
"""가이드 글 페이지(guide/*/index.html), 가이드 목록, 소개 페이지, 404 페이지, sitemap.xml, rss.xml을 만든다.
영어판(en/: 계산기·영어 글·목록·소개)도 같은 명령으로 tools/build_en.py가 만든다.

글 내용은 이 파일의 GUIDES에 있다(영어 글은 build_en.py). 고친 뒤 `python3 date-calc/tools/build_guides.py` 를 돌리고 결과를 커밋한다.
예시 숫자는 assets/dates.js로 검산한 값이다(tests/run.js의 '가이드 예시' 묶음이 같은 값을 시험한다).
"""
import html, json, os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
BASE = "https://date.lumenlab.page"
UPDATED = "2026-10-03"
# sitemap lastmod: 본문·구조화 데이터·링크가 실제로 바뀐 날만 적는다(배포 날짜를 일괄로 찍지 않는다). 없으면 UPDATED
# 영어 페이지(/en/…)는 build_en.UPDATED. /about/은 영어 소개와 hreflang으로 이어서 2026-10-05
LASTMOD = {"/": "2026-10-05", "/privacy": "2026-10-05", "/about/": "2026-10-05"}
AD_HEAD = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9496167591465154" crossorigin="anonymous"></script>'

# slug, 제목(h1), 짧은 제목(목록·링크), 설명(meta), 계산기 해시, 본문 HTML, 이어서 볼 글
GUIDES = [
    {
        "slug": "days-between",
        "title": "두 날짜 사이 며칠인지 세는 법 — 시작일 포함과 미포함",
        "short": "두 날짜 사이 며칠인지 세는 법",
        "desc": "두 날짜 사이 기간을 셀 때 시작일을 넣느냐에 따라 하루가 달라져요. 빼기 계산, 시작일 포함, 개월·주 단위로 바꾸는 법을 예시로 정리했어요.",
        "tool": "period",
        "body": """
<p>"10월 3일부터 12월 25일까지 며칠이야?"라는 질문엔 답이 두 개 나올 수 있어요. <b>83일</b>과 <b>84일</b>이에요. 둘 다 맞고, 차이는 <b>시작일을 하루로 세느냐</b>예요.</p>

<h2>1. 기본은 빼기: 종료일 − 시작일</h2>
<p>달력에서 두 날짜를 빼면 '그 사이에 지나는 밤의 수'가 나와요. 10월 3일에서 하루 지나면 10월 4일이니, 10월 3일 → 12월 25일은 83일이에요. 나이, 남은 날(디데이), 경과 일수를 셀 때 쓰는 방식이에요.</p>

<h2>2. 시작일 포함: 빼기 + 1</h2>
<p>첫날도 하루로 치면 1을 더해요. 휴가·여행 일정("3일부터 5일까지 3일간"), 근무 일수, 숙박이 아니라 '머무는 날' 수를 셀 때 이렇게 세요.</p>
<table>
<thead><tr><th>기간</th><th>빼기</th><th>시작일 포함</th></tr></thead>
<tbody>
<tr><td>10월 1일 ~ 10월 3일</td><td>2일</td><td>3일</td></tr>
<tr><td>2026년 10월 3일 ~ 12월 25일</td><td>83일</td><td>84일</td></tr>
<tr><td>2026년 1월 1일 ~ 12월 31일</td><td>364일</td><td>365일</td></tr>
</tbody>
</table>
<p class="tip">헷갈리면 이렇게 기억하세요. "며칠 <b>뒤</b>"는 빼기, "며칠 <b>동안</b>"은 시작일 포함.</p>

<h2>3. 개월·주로 바꾸기</h2>
<p>일수를 30으로 나누면 틀려요. 달마다 날수가 다르니까요. 개월은 '같은 날짜'를 기준으로 세요.</p>
<ul>
<li>2026년 3월 1일 → 4월 15일: <b>1개월 14일</b> (4월 1일이 1개월, 거기서 14일 더)</li>
<li>1월 31일 → 3월 1일: <b>1개월 1일</b>. 2월엔 31일이 없어서 '1개월 뒤'를 2월 말일(28일)로 보기 때문이에요.</li>
<li>주는 7로 나눈 몫과 나머지예요. 83일 = <b>11주 6일</b>.</li>
</ul>

<h2>4. 자주 하는 실수</h2>
<ul>
<li><b>윤년 빼먹기</b>: 2028년처럼 2월이 29일까지 있는 해가 끼면 하루가 늘어요. 4로 나눠떨어지는 해가 윤년이지만, 100으로 나눠떨어지면 평년(1900년, 2100년), 400으로 나눠떨어지면 다시 윤년(2000년)이에요.</li>
<li><b>시간대</b>: 날짜만 셀 땐 시각을 신경 쓰지 않아도 돼요. 시각까지 필요하면 <a href="/#time">시간 차이 계산기</a>를 쓰세요.</li>
</ul>
""",
        "related": ["d-day", "anniversary", "business-days"],
    },
    {
        "slug": "d-day",
        "title": "디데이(D-day) 세는 법 — D-1, D-Day, D+1의 뜻",
        "short": "디데이 세는 법 (D-1, D-Day, D+1)",
        "desc": "디데이는 목표일까지 남은 날을 D-숫자로, 지난 날을 D+숫자로 표시해요. 계산 공식과 시험·전역일·기념일에서 쓰는 방식 차이를 정리했어요.",
        "tool": "dday",
        "body": """
<p>디데이(D-day)는 원래 군사 작전 개시일을 부르던 말인데, 지금은 '목표한 날'을 뜻해요. 그날까지 남은 날은 <b>D-숫자</b>, 그날이 지난 뒤는 <b>D+숫자</b>로 적어요.</p>

<h2>1. 공식</h2>
<p><b>남은 날 = 목표일 − 오늘</b> (빼기, 시작일 미포함)</p>
<table>
<thead><tr><th>오늘</th><th>목표일</th><th>표시</th></tr></thead>
<tbody>
<tr><td>12월 24일</td><td>12월 25일</td><td>D-1</td></tr>
<tr><td>12월 25일</td><td>12월 25일</td><td>D-Day</td></tr>
<tr><td>12월 26일</td><td>12월 25일</td><td>D+1</td></tr>
<tr><td>2026년 10월 3일</td><td>2026년 12월 25일</td><td>D-83</td></tr>
</tbody>
</table>
<p>시험·마감·출국처럼 '그날까지 몇 밤 남았나'를 셀 땐 이 방식이 표준이에요.</p>

<h2>2. 지난 날을 셀 때: D+0이냐 D+1이냐</h2>
<p>사귄 날, 아기 태어난 날처럼 <b>지난 날짜를 기준으로 셀 땐</b> 관습이 갈려요.</p>
<ul>
<li><b>빼기 방식</b>: 그날 당일이 D+0, 다음 날이 D+1. 계산기와 대부분의 앱이 이 방식이에요.</li>
<li><b>1일째 방식</b>: 그날 당일을 1일째로 세요. 한국에서 100일·1000일 기념일을 셀 때 흔히 써요. 자세한 건 <a href="/guide/anniversary/">기념일 세는 법</a>에 있어요.</li>
</ul>
<p class="tip">같은 날짜라도 두 방식은 하루 차이가 나요. 상대와 어느 방식으로 셀지 먼저 맞추면 기념일을 놓치지 않아요.</p>

<h2>3. 주·개월로 보면 감이 와요</h2>
<p>83일 남았다는 건 <b>11주 6일</b>, 또는 <b>2개월 22일</b>이에요. 계획을 세울 땐 주 단위가, 체감에는 개월 단위가 편해요. 계산기는 두 가지를 같이 보여 줘요.</p>

<h2>4. 영업일 기준 디데이</h2>
<p>"5영업일 안에 처리"처럼 주말과 공휴일을 빼고 세야 하는 기한도 있어요. 이건 달력 디데이와 달라서 <a href="/guide/business-days/">영업일 계산법</a>을 따로 보세요.</p>
""",
        "related": ["days-between", "anniversary", "business-days"],
    },
    {
        "slug": "korean-age",
        "title": "만 나이 계산법 — 만 나이, 연 나이, 세는 나이 차이",
        "short": "만 나이·연 나이·세는 나이 차이",
        "desc": "2023년 6월 28일부터 한국 법과 행정은 만 나이를 써요. 만 나이 계산 공식과 연 나이(병역·청소년보호법), 세는 나이의 차이를 예시와 표로 정리했어요.",
        "tool": "age",
        "body": """
<p>한국에는 나이를 세는 방법이 세 가지 있었어요. 2023년 6월 28일부터는 법과 행정에서 <b>만 나이</b>로 통일됐어요(행정기본법·민법 개정). 다만 몇몇 법은 여전히 '연 나이'를 써요.</p>

<h2>1. 세 가지 나이 비교</h2>
<table>
<thead><tr><th>방식</th><th>계산</th><th>2000년 5월 15일생<br>(2026년 10월 3일 기준)</th><th>2000년 12월 20일생<br>(같은 날 기준)</th></tr></thead>
<tbody>
<tr><td><b>만 나이</b></td><td>태어나면 0살, 생일마다 +1</td><td>26세</td><td>25세</td></tr>
<tr><td>연 나이</td><td>올해 − 태어난 해</td><td>26세</td><td>26세</td></tr>
<tr><td>세는 나이</td><td>태어나면 1살, 1월 1일마다 +1</td><td>27세</td><td>27세</td></tr>
</tbody>
</table>

<h2>2. 만 나이 공식</h2>
<p><b>만 나이 = 올해 − 태어난 해</b>, 단 <b>올해 생일이 아직 안 지났으면 1을 빼요.</b></p>
<p>2000년 12월 20일생은 2026년 10월 3일에 2026 − 2000 = 26인데, 12월 20일 생일이 아직이라 <b>만 25세</b>예요.</p>

<h2>3. 연 나이를 아직 쓰는 곳</h2>
<p>병역법(입영 대상 나이), 청소년보호법(술·담배 판매 금지 기준) 같은 일부 법은 행정 편의를 위해 '그해 1월 1일 기준'인 연 나이를 써요. 그래서 같은 해에 태어난 친구들은 생일과 상관없이 같은 날 기준이 바뀌어요. 정확한 적용 대상은 해당 법 조문을 확인하세요.</p>

<h2>4. 2월 29일생은?</h2>
<p>윤년이 아닌 해엔 2월 29일이 없어요. 이 계산기는 평년엔 <b>2월 28일</b>을 생일로 봐요. 기관이나 서비스에 따라 3월 1일로 보는 곳도 있으니, 중요한 서류라면 그 기관 기준을 따르세요.</p>

<h2>5. 살아온 날 세기</h2>
<p>태어난 날부터 오늘까지 며칠인지도 같은 원리예요. 2000년 5월 15일생은 2026년 10월 3일 기준으로 태어난 지 <b>9,637일</b>이 지났고, 태어난 날을 1일째로 치면 오늘이 <b>9,638일째</b>예요.</p>
""",
        "related": ["days-between", "anniversary", "d-day"],
    },
    {
        "slug": "business-days",
        "title": "영업일 계산법 — 주말·공휴일을 빼고 세는 방법",
        "short": "영업일 계산법",
        "desc": "영업일은 토·일요일과 공휴일(대체 휴일 포함)을 뺀 날이에요. '5영업일 이내' 기한 계산, 기간 안 영업일 수 세기를 실제 2026년 달력 예시로 설명해요.",
        "tool": "workdays",
        "body": """
<p>택배 배송, 환불 처리, 서류 발급 기한에 자주 나오는 말이 "영업일 기준 3~5일"이에요. <b>영업일</b>은 은행·관공서가 문을 여는 날, 즉 <b>토요일·일요일·공휴일을 뺀 평일</b>이에요.</p>

<h2>1. 기간 안에 영업일이 며칠인지</h2>
<p>2026년 10월(1일~31일, 31일)을 예로 들어 볼게요.</p>
<table>
<thead><tr><th>구분</th><th>일수</th></tr></thead>
<tbody>
<tr><td>달력상 날짜</td><td>31일</td></tr>
<tr><td>주말(토·일)</td><td>− 9일</td></tr>
<tr><td>평일에 걸린 공휴일: 10월 5일 개천절 대체 휴일, 10월 9일 한글날</td><td>− 2일</td></tr>
<tr><td><b>영업일</b></td><td><b>20일</b></td></tr>
</tbody>
</table>
<p>10월 3일 개천절은 토요일이라 주말에 이미 빠졌고, 대신 월요일(10월 5일)이 대체 휴일로 쉬어요. 공휴일이 주말과 겹치면 대체 휴일을 꼭 확인해야 하는 이유예요(<a href="/guide/substitute-holidays/">대체공휴일 규칙</a>).</p>

<h2>2. "N영업일 뒤"는 언제일까</h2>
<p>기준일(접수일)은 세지 않고, <b>다음 날부터 영업일만 하나씩</b> 세요.</p>
<ul>
<li>2026년 10월 2일(금) 접수, 5영업일 뒤 → 10월 3일(토)·4일(일)·5일(대체 휴일)을 건너뛰고 6·7·8일, 9일(한글날) 건너뛰고 12·13일 → <b>10월 13일(화)</b></li>
<li>2026년 9월 22일(화) 접수, 3영업일 뒤 → 23일, 24~26일(추석 연휴) 건너뛰고 28·29일 → <b>9월 29일(화)</b></li>
</ul>
<p class="tip">추석·설 연휴가 끼면 '3영업일'이 달력으로 일주일이 넘기도 해요. 명절 전에 보내는 서류는 넉넉히 잡으세요.</p>

<h2>3. 나라마다 공휴일이 달라요</h2>
<p>해외 거래처와 기한을 맞출 땐 그 나라 공휴일로 세야 해요. 미국은 2026년 11월에 재향군인의 날(11일)과 추수감사절(26일)이 있어서, 11월 영업일이 <b>19일</b>이에요. 같은 달 한국은 공휴일이 없어 21일이에요. 계산기 위쪽에서 공휴일 기준 나라를 바꿀 수 있어요.</p>

<h2>4. 주의할 점</h2>
<ul>
<li>회사·은행마다 '영업일'에 토요일을 넣기도 하고, 근로자의 날(5월 1일)처럼 법정 공휴일은 아니지만 쉬는 날이 있어요. 중요한 기한은 상대 기관의 기준을 확인하세요.</li>
<li>선거일, 정부가 따로 정하는 임시공휴일은 발표 뒤에 반영돼요.</li>
</ul>
""",
        "related": ["substitute-holidays", "d-day", "days-between"],
    },
    {
        "slug": "substitute-holidays",
        "title": "대체공휴일 규칙 정리 — 언제, 어떤 공휴일이 대신 쉬나",
        "short": "대체공휴일 규칙",
        "desc": "설·추석은 일요일이나 다른 공휴일과 겹칠 때, 어린이날·국경일·부처님오신날·성탄절은 토·일요일과 겹칠 때 대체공휴일이 생겨요. 2026·2027년 실제 예시로 정리했어요.",
        "tool": "holidays",
        "body": """
<p>공휴일이 주말과 겹쳐 쉬는 날이 사라지는 걸 막으려고 생긴 게 <b>대체공휴일</b>이에요. 다만 모든 공휴일이 대상은 아니고, 공휴일마다 조건이 달라요(관공서의 공휴일에 관한 규정).</p>

<h2>1. 공휴일별 조건</h2>
<table>
<thead><tr><th>공휴일</th><th>대체공휴일이 생기는 경우</th></tr></thead>
<tbody>
<tr><td>설날·추석 연휴(3일)</td><td><b>일요일</b> 또는 다른 공휴일과 겹칠 때 (토요일은 해당 없음)</td></tr>
<tr><td>어린이날</td><td>토요일·일요일 또는 다른 공휴일과 겹칠 때</td></tr>
<tr><td>삼일절·광복절·개천절·한글날</td><td>토요일·일요일과 겹칠 때 (2021년부터)</td></tr>
<tr><td>부처님오신날·기독탄신일(성탄절)</td><td>토요일·일요일과 겹칠 때 (2023년부터)</td></tr>
<tr><td>신정·현충일</td><td>대체공휴일 없음</td></tr>
</tbody>
</table>
<p>대체공휴일은 겹친 날 <b>다음의 첫 번째 평일(비공휴일)</b>이에요.</p>

<h2>2. 2026년 실제 예시</h2>
<ul>
<li>삼일절 3월 1일(일) → <b>3월 2일(월)</b> 대체 휴일</li>
<li>부처님오신날 5월 24일(일) → <b>5월 25일(월)</b></li>
<li>광복절 8월 15일(토) → <b>8월 17일(월)</b></li>
<li>개천절 10월 3일(토) → <b>10월 5일(월)</b></li>
<li>추석 연휴 9월 24~26일 중 26일이 <b>토요일</b>이지만, 설·추석은 일요일과 겹칠 때만 대상이라 <b>대체 휴일이 없어요.</b></li>
<li>현충일 6월 6일(토)은 대체공휴일 대상이 아니라 그대로 지나가요.</li>
</ul>

<h2>3. 2027년 미리 보기</h2>
<ul>
<li>설 연휴 2월 6일(토)~8일(월) 중 7일이 일요일 → <b>2월 9일(화)</b> 대체 휴일</li>
<li>광복절 8월 15일(일) → 8월 16일(월), 개천절 10월 3일(일) → 10월 4일(월)</li>
<li>한글날 10월 9일(토) → 10월 11일(월), 성탄절 12월 25일(토) → 12월 27일(월)</li>
</ul>
<p class="tip">2027년 이후 날짜는 현재 규정으로 계산한 값이에요. 정부가 임시공휴일을 지정하거나 규정을 바꾸면 달라질 수 있어요.</p>

<h2>4. 선거일과 임시공휴일</h2>
<p>대통령·국회의원·지방선거일은 법정 공휴일이에요(2026년 6월 3일 지방선거). 정부가 따로 정하는 임시공휴일은 보통 몇 주 전에 발표돼서, 그 전엔 어떤 달력에도 없어요.</p>
""",
        "related": ["business-days", "days-between", "d-day"],
    },
    {
        "slug": "anniversary",
        "title": "100일·1000일 기념일 계산법 — 시작한 날을 1일로 셀까",
        "short": "100일·1000일 기념일 계산법",
        "desc": "한국에서 100일은 보통 시작한 날을 1일째로 세서 99일 뒤예요. 100일·200일·1000일·주년 날짜를 2026년 1월 1일 예시로 계산해 보고 헷갈리는 점을 정리했어요.",
        "tool": "anniv",
        "body": """
<p>"우리 100일이 언제야?" 아기 백일, 연애 기념일, 금연·운동 100일 챌린지까지, 100일 단위로 세는 일이 많아요. 그런데 계산법에 따라 <b>하루 차이</b>가 나요.</p>

<h2>1. 한국식: 시작한 날 = 1일째</h2>
<p>한국에서는 보통 <b>시작한 날을 1일째</b>로 세요. 그래서 100일째는 <b>시작일 + 99일</b>이에요. 아기 백일도 태어난 날을 1일로 쳐서 세는 게 관례예요.</p>
<table>
<thead><tr><th>2026년 1월 1일에 시작</th><th>날짜</th></tr></thead>
<tbody>
<tr><td>100일</td><td>2026년 4월 10일 (금)</td></tr>
<tr><td>200일</td><td>2026년 7월 19일 (일)</td></tr>
<tr><td>300일</td><td>2026년 10월 27일 (화)</td></tr>
<tr><td>1주년</td><td>2027년 1월 1일 (금)</td></tr>
<tr><td>500일</td><td>2027년 5월 15일 (토)</td></tr>
<tr><td>1000일</td><td>2028년 9월 26일 (화)</td></tr>
</tbody>
</table>

<h2>2. 빼기 방식: 시작 다음 날 = 1일</h2>
<p>시작일을 0일로 보면 100일은 <b>시작일 + 100일</b>, 위 예시에선 4월 11일이에요. 해외 앱이나 일부 서비스는 이 방식이라 날짜가 하루 늦게 나와요. 계산기의 '시작한 날을 1일째로 세기'를 끄면 이 방식으로 바뀌어요.</p>

<h2>3. 주년은 날짜로 세요</h2>
<p>1주년, 2주년은 일수가 아니라 <b>같은 월·일</b>이에요. 그래서 1주년(1월 1일)은 365일째(12월 31일)와 하루 차이가 나요. 윤년이 끼면 366일 뒤가 1주년이에요.</p>

<h2>4. 요일도 같이 보세요</h2>
<p>기념일이 평일이면 그 전 주말에 미리 챙기는 경우가 많아요. 계산기는 날짜마다 요일과 남은 날(D-숫자)을 같이 보여 줘요. 예를 들어 1000일(2028년 9월 26일)은 화요일이에요.</p>
""",
        "related": ["d-day", "days-between", "korean-age"],
    },
]

GUIDE_BY_SLUG = {g["slug"]: g for g in GUIDES}
E = html.escape


def head(title, desc, path, extra_ld, alt=""):
    url = BASE + path
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="theme-color" content="#faf6f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15110f" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="{url}">
{alt}<meta property="og:type" content="article">
<meta property="og:site_name" content="며칠 계산기">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="https://date.lumenlab.page/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="며칠 계산기: 날짜 사이 며칠인지 바로 계산">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/assets/style.css">
{AD_HEAD}
<script type="application/ld+json">
{json.dumps(extra_ld, ensure_ascii=False)}
</script>
</head>
<body class="doc-page">
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="top wrap">
  <a class="logo" href="/"><span class="logo-mark" aria-hidden="true"><b></b><b></b><b></b></span><span>며칠 계산기</span></a>
  <nav class="top-nav" aria-label="사이트 메뉴"><a href="/">계산기</a><a href="/guide/">가이드</a><a href="/about/">소개</a></nav>
</header>
"""


FOOT = """<footer class="foot wrap">
  <div class="maker"><svg class="maker-mark" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" opacity=".28"/><circle cx="11" cy="11" r="5"/></svg><p>며칠 계산기는 <b>루멘랩</b>이 만들었어요. 다른 앱과 도구도 있어요.</p><a href="https://lumenlab.page/">루멘랩 둘러보기 →</a></div>
  <p><a href="/">며칠 계산기</a> · <a href="/guide/">가이드</a> · <a href="/about/">소개</a> · <a href="/privacy">개인정보 처리방침</a> · <a href="mailto:woxocoso@gmail.com">문의</a></p>
  <p>© 2026 루멘랩(Lumen Lab)</p>
</footer>
</body>
</html>
"""


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + p} for i, (n, p) in enumerate(items)]}


def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(text)


def guide_page(g):
    path = f"/guide/{g['slug']}/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": g["title"], "description": g["desc"], "inLanguage": "ko",
         "datePublished": UPDATED, "dateModified": UPDATED, "mainEntityOfPage": BASE + path,
         "author": {"@type": "Organization", "name": "루멘랩(Lumen Lab)", "url": "https://lumenlab.page/"},
         "publisher": {"@type": "Organization", "name": "루멘랩(Lumen Lab)", "url": "https://lumenlab.page/"}},
        crumbs([("며칠 계산기", "/"), ("가이드", "/guide/"), (g["short"], path)])]}
    rel = "".join(f'<li><a href="/guide/{s}/">{E(GUIDE_BY_SLUG[s]["short"])}</a></li>' for s in g["related"])
    return head(g["title"] + " | 며칠 계산기", g["desc"], path, ld) + f"""
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="현재 위치"><a href="/">며칠 계산기</a> › <a href="/guide/">가이드</a> › <span>{E(g['short'])}</span></nav>
  <article class="doc article">
    <h1>{E(g['title'])}</h1>
    <p class="meta">루멘랩 · {UPDATED} 작성</p>
    {g['body'].strip()}
    <p class="cta"><a class="btn" href="/#{g['tool']}">계산기로 바로 계산하기 →</a></p>
  </article>
  <section class="related doc" aria-labelledby="rel-h">
    <h2 id="rel-h">이어서 볼 글</h2>
    <ul>{rel}</ul>
  </section>
</main>
""" + FOOT


def guide_index():
    path = "/guide/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "name": "날짜 계산 가이드", "url": BASE + path, "inLanguage": "ko",
         "hasPart": [{"@type": "Article", "headline": g["title"], "url": f"{BASE}/guide/{g['slug']}/"} for g in GUIDES]},
        crumbs([("며칠 계산기", "/"), ("가이드", path)])]}
    items = "".join(f'<li><a href="/guide/{g["slug"]}/"><b>{E(g["short"])}</b><span>{E(g["desc"])}</span></a></li>' for g in GUIDES)
    return head("날짜 계산 가이드 — 기간, 디데이, 만 나이, 영업일, 공휴일 | 며칠 계산기",
                "날짜 사이 기간, 디데이, 만 나이, 영업일, 대체공휴일, 기념일을 정확하게 세는 법을 예시와 표로 정리한 가이드 모음이에요.", path, ld) + f"""
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="현재 위치"><a href="/">며칠 계산기</a> › <span>가이드</span></nav>
  <article class="doc article">
    <h1>날짜 계산 가이드</h1>
    <p>계산기가 숫자를 바로 알려 주지만, 왜 그런 숫자가 나오는지 알면 실수가 줄어요. 헷갈리기 쉬운 날짜 계산을 예시와 함께 정리했어요.</p>
    <ul class="guide-list">{items}</ul>
  </article>
</main>
""" + FOOT


def about_page():
    path = "/about/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "AboutPage", "name": "며칠 계산기 소개", "url": BASE + path, "inLanguage": "ko",
         "publisher": {"@type": "Organization", "name": "루멘랩(Lumen Lab)", "url": "https://lumenlab.page/", "email": "woxocoso@gmail.com"}},
        crumbs([("며칠 계산기", "/"), ("소개", path)])]}
    import build_en  # 영어 소개(/en/about/)와 hreflang으로 잇는다
    return head("며칠 계산기 소개 — 만든 곳, 계산 기준, 문의 | 며칠 계산기",
                "며칠 계산기는 루멘랩이 만든 무료 날짜 계산 도구예요. 계산 기준, 공휴일 데이터 출처, 정확도 확인 방법과 문의처를 안내해요.", path, ld,
                build_en.alternates(path, "/en/about/")) + """
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="현재 위치"><a href="/">며칠 계산기</a> › <span>소개</span></nav>
  <article class="doc article">
    <h1>며칠 계산기 소개</h1>
    <p>며칠 계산기는 날짜에 관한 계산을 한곳에서 끝낼 수 있게 만든 무료 웹 도구예요. 두 날짜 사이 기간, 디데이, 날짜 더하기·빼기, 영업일, 만 나이, 기념일, 요일, 주차, 시간 차이, 공휴일 목록까지 11가지를 계산해요. 가입 없이 쓰고, 입력한 날짜는 서버로 보내지 않아요.</p>

    <h2>만든 곳</h2>
    <p>1인 개발 스튜디오 <a href="https://lumenlab.page/">루멘랩(Lumen Lab)</a>이 만들고 운영해요. Mac 메뉴 막대 앱 Owlight, 운동 기록 웹앱 세트노트도 만들고 있어요.</p>

    <h2>계산 기준</h2>
    <ul>
      <li><b>기간</b>: 기본은 종료일 − 시작일, '시작일 포함'을 켜면 +1일. 개월은 같은 날짜 기준이고, 그 달에 같은 날이 없으면 말일로 맞춰요.</li>
      <li><b>만 나이</b>: 2023년 6월 28일부터 한국 법·행정이 쓰는 기준. 2월 29일생은 평년에 2월 28일을 생일로 봐요.</li>
      <li><b>영업일</b>: 토·일요일과 고른 나라(한국·미국)의 공휴일을 빼요. 대체 휴일과 선거일을 포함해요.</li>
      <li><b>주차</b>: 국제 표준 ISO 8601(월요일 시작, 그해 첫 목요일이 든 주가 1주차).</li>
    </ul>

    <h2>공휴일 데이터와 정확도</h2>
    <p>한국·미국 공휴일 2015~2035년은 공개 라이브러리 <a href="https://github.com/vacanza/holidays">holidays</a>의 데이터로 만들었어요. 계산 로직은 다른 방식(파이썬 표준 날짜 라이브러리)으로 따로 구한 3,200여 개의 정답과 대조하는 자동 시험을 통과해야 배포돼요. 정부가 나중에 정하는 임시공휴일은 발표 뒤에 반영돼요.</p>
    <p>계산 결과는 참고용이에요. 법적 기한, 계약, 급여처럼 중요한 날짜는 해당 기관의 기준을 꼭 함께 확인하세요.</p>

    <h2>광고</h2>
    <p>사이트 운영비를 위해 Google 애드센스 광고를 보여 줘요. 광고와 쿠키에 관한 내용은 <a href="/privacy">개인정보 처리방침</a>에 있어요.</p>

    <h2>문의</h2>
    <p>틀린 계산, 빠진 공휴일, 있었으면 하는 기능은 <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>으로 알려 주세요.</p>
  </article>
</main>
""" + FOOT


def sitemap(en_urls=(), en_updated=UPDATED):
    urls = ["/", "/guide/"] + [f"/guide/{g['slug']}/" for g in GUIDES] + ["/about/", "/privacy"]
    rows = "\n".join(f"  <url><loc>{BASE}{u}</loc><lastmod>{LASTMOD.get(u, UPDATED)}</lastmod></url>" for u in urls)
    rows += "".join(f"\n  <url><loc>{BASE}{u}</loc><lastmod>{en_updated}</lastmod></url>" for u in en_urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'


def rss():
    """네이버 서치어드바이저에 내는 RSS. 글마다 본문 전체, 링크는 전부 이 도메인의 전체 주소로."""
    import datetime
    d = datetime.date.fromisoformat(UPDATED)
    pub = d.strftime("%a, %d %b %Y 00:00:00 +0900")
    items = []
    for g in GUIDES:
        url = f"{BASE}/guide/{g['slug']}/"
        body = g["body"].strip().replace('href="/', f'href="{BASE}/')
        items.append(f"""  <item>
    <title>{E(g['title'])}</title>
    <link>{url}</link>
    <guid isPermaLink="true">{url}</guid>
    <pubDate>{pub}</pubDate>
    <description><![CDATA[{body}]]></description>
  </item>""")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>며칠 계산기 가이드</title>
  <link>{BASE}/guide/</link>
  <description>날짜 사이 기간, 디데이, 만 나이, 영업일, 대체공휴일, 기념일을 정확하게 세는 법</description>
  <language>ko</language>
{chr(10).join(items)}
</channel>
</rss>
"""


def not_found_page():
    """없는 주소에 보여 주는 페이지(한국어·영어). 내용이 없는 화면이라 광고 코드를 넣지 않고(애드센스 게시자 정책), 검색에도 안 올린다."""
    page = head("페이지를 찾을 수 없어요 · Page not found | 며칠 계산기", "찾는 페이지가 없어요. This page doesn't exist.", "/404", {"@context": "https://schema.org", "@type": "WebPage", "name": "404"})
    page = page.replace(AD_HEAD + "\n", "").replace('<link rel="canonical" href="' + BASE + '/404">\n', '<meta name="robots" content="noindex">\n')
    page = page.replace('<meta property="og:url" content="' + BASE + '/404">\n', "")
    return page + """
<main id="main" class="wrap">
  <article class="doc article">
    <h1>페이지를 찾을 수 없어요</h1>
    <p>주소가 바뀌었거나 없는 페이지예요.</p>
    <ul>
      <li><a href="/">며칠 계산기 첫 화면</a> (기간·디데이·만 나이 등 11가지 계산)</li>
      <li><a href="/guide/">날짜 계산 가이드</a></li>
    </ul>
    <div lang="en">
      <h2>Page not found</h2>
      <p>This address doesn't exist or has moved.</p>
      <ul>
        <li><a href="/en/">Daycount date calculator</a> (days between dates, business days, age and more)</li>
        <li><a href="/en/guide/">Date calculation guides</a></li>
      </ul>
    </div>
  </article>
</main>
""" + FOOT


if __name__ == "__main__":
    import build_en
    n_en = build_en.build_all()
    for g in GUIDES:
        write(f"guide/{g['slug']}/index.html", guide_page(g))
    write("guide/index.html", guide_index())
    write("about/index.html", about_page())
    write("404.html", not_found_page())
    write("sitemap.xml", sitemap(build_en.urls(), build_en.UPDATED))
    write("rss.xml", rss())
    print("가이드 %d편 + 목록 + 소개 + 404 + sitemap + rss 만듦, 영어판(/en/: 계산기 + 글 %d편 + 목록 + 소개) 만듦" % (len(GUIDES), n_en))
