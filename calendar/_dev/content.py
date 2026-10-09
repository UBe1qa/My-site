# 화면 문구와 글(데이터 파일). build.py 가 읽는다. 여기서 고치고 `python3 _dev/build.py` 를 다시 돌린다.
# 글 속 숫자는 tests/run.js 의 '글 속 숫자' 묶음이 검산한다(글을 고치면 테스트도 같이).
# {P} = 그 언어판의 앞머리('/' 또는 '/ko/'). 글 속 표에 class="stack" 을 주면 휴대폰에서 줄 카드가 된다(build.py tables()).
# 글마다 받기 단추(class="cta") 하나를 본문 가운데에 둔다. 글 속 광고 자리는 그 단추 바로 아래에 들어간다.
# sources: (이름, 주소, 확인한 날 SEEN9·SEEN10). 공식 출처가 필요한 문장은 확인된 것만 쓴다.

LAW = 'https://www.law.go.kr/법령/관공서의공휴일에관한규정'
KASA = 'https://www.kasa.go.kr/prog/plcyBrf/brief/kor/sub01_01_04/view.do?plcyBrfNo=431'
KASI = 'https://astro.kasi.re.kr/kor/life/post/calendarData'
OPM = 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/'
LAW55 = 'https://www.law.go.kr/법령/근로기준법/제55조'
LAW30 = 'https://www.law.go.kr/법령/근로기준법시행령/제30조'
LAW11 = 'https://www.law.go.kr/법령/근로기준법/제11조'
NODONG = 'https://www.law.go.kr/법령/노동절제정에관한법률'
CFWA = 'https://www.cloudflare.com/web-analytics/'
# 출처를 실제로 열어 확인한 날(화면에 같이 싣는다). 사실 확인 기록: 지휘자 쪽 verified-facts 문서.
SEEN9 = {'ko': '2026. 10. 9. 확인', 'en': 'checked Oct 9, 2026'}
SEEN10 = {'ko': '2026. 10. 10. 확인', 'en': 'checked Oct 10, 2026'}
CHECKED = {'ko': '2026년 10월 10일', 'en': 'October 10, 2026'}   # 글 본문을 마지막으로 확인한 날

UI = {
    'ko': dict(
        brand='한장달력', skip='본문으로 건너뛰기', menu='사이트 메뉴', lang_other='English', ad='광고',
        nav=[('', '달력 만들기'), ('2027/', '2027년 달력'), ('@month', '월 달력'), ('2027/holidays/', '공휴일·연휴'), ('lunar/', '음력 변환'), ('son-eomneun-nal/', '손 없는 날'), ('guide/', '가이드')],
        h1_tool='<span data-y>{y}</span>년 달력 인쇄', why=['2026년에 바뀐 공휴일<br class="s-br">(노동절·제헌절)까지 반영', '받는 파일에 광고·로고 없음'],
        prev_year='이전 해', next_year='다음 해', prev_month='이전 달', next_month='다음 달',
        pdf='PDF 받기', print='인쇄', png='이미지로 저장', zoom='달력 크게 보기',
        shapes_h='모양 고르기', s_land='1년 · 가로', s_port='1년 · 세로', s_months='월별 12장', s_months_sub='음력·절기 포함', s_month='한 달',
        xlsx='엑셀 파일로 받기', xlsx_sub='일요일 시작 기본판 · 칸을 고쳐 쓸 수 있어요',
        opt='내 설정으로 바꾸기', opt_sub='주 시작 요일, 용지, 음력, 흑백', opt_h='내 설정', close='닫기',
        f_ws='주 시작', ws0='일요일', ws1='월요일', f_paper='용지', f_country='공휴일', c_kr='대한민국', c_us='미국(연방)', c_none='표시 안 함', month_group='달',
        f_show='표시', o_names='공휴일 이름', o_week='주 번호', o_lunar='음력', o_terms='24절기', o_son='손 없는 날', f_color='색', o_mono='흑백(잉크 절약)',
        opt_note='보이는 그대로 인쇄돼요. 설정은 주소에 담겨서, 주소를 복사해 두면 같은 달력이 다시 열려요.',
        up_h='다가오는 쉬는 날', up_sub='오늘 기준으로 며칠 남았는지 보여 줘요.',
        ways_h='다른 달력 보기', guides_h='가이드', faq_h='자주 묻는 질문', all_guides='가이드 전체 보기',
        made='펴낸 곳', lumen_b='루멘랩', lumen_s='다른 앱과 도구 보기', about='소개', privacy='개인정보 처리방침', licenses='오픈소스 고지', contact='문의',
        home_title='2027년 달력 인쇄 · 공휴일 넣은 한 장 PDF | 한장달력',
        home_desc='2027년 달력을 공휴일·대체공휴일까지 넣어 한 장으로 인쇄하거나 PDF·이미지로 받아요. 음력·24절기·손 없는 날도 넣을 수 있어요. 가입 없이 무료예요.',
        updated='마지막 확인', read='읽기', crumb_home='달력 만들기', guide='가이드', sources='출처',
    ),
    'en': dict(
        brand='Onesheet', skip='Skip to content', menu='Site', lang_other='한국어', ad='Ad',
        nav=[('', 'Calendar maker'), ('2027/', '2027 calendar'), ('@month', 'Monthly'), ('2027/holidays/', 'Holidays'), ('guide/', 'Guides')],
        h1_tool='Printable <span data-y>{y}</span> Calendar', why=['Observed holidays included', 'No ads or logos in your files'],
        prev_year='Previous year', next_year='Next year', prev_month='Previous month', next_month='Next month',
        pdf='Download PDF', print='Print', png='Save as image', zoom='Enlarge the calendar',
        shapes_h='Choose a layout', s_land='Year · landscape', s_port='Year · portrait', s_months='12 monthly pages', s_months_sub='one month per page', s_month='One month',
        xlsx='', xlsx_sub='',
        opt='Change settings', opt_sub='Week start, paper size, country, ink', opt_h='Settings', close='Close',
        f_ws='Week starts', ws0='Sunday', ws1='Monday', f_paper='Paper', f_country='Holidays', c_kr='South Korea', c_us='United States (federal)', c_none='None', month_group='Month',
        f_show='Show', o_names='Holiday names', o_week='Week numbers', o_lunar='Lunar dates', o_terms='Solar terms', o_son='Son-eomneun-nal (moving days)', f_color='Ink', o_mono='Black only (saves ink)',
        opt_note='It prints exactly as shown. Settings live in the page address, so a copied link reopens the same calendar.',
        up_h='Upcoming holidays', up_sub='Counted from today.',
        ways_h='More calendars', guides_h='Guides', faq_h='Questions', all_guides='All guides',
        made='Published by', lumen_b='Lumen Lab', lumen_s='More apps and tools', about='About', privacy='Privacy', licenses='Open-source licenses', contact='Contact',
        home_title='Printable 2027 Calendar: One Page with Holidays (Free PDF) | Onesheet',
        home_desc='Print a one-page 2027 calendar with US federal holidays, or download it as a PDF or image. Letter or A4, Sunday or Monday start. Free, no sign-up.',
        updated='Last checked', read='Read', crumb_home='Calendar maker', guide='Guides', sources='Sources',
    ),
}

# 답에는 링크(<a>)를 쓸 수 있다. 구조화 데이터에는 태그를 뺀 글자가 들어간다(화면 글자와 같다).
FAQ = {
    'ko': [
        ('받는 파일에 광고나 로고가 들어가나요?', '아니요. PDF와 이미지, 인쇄물에는 광고가 없어요. 종이 오른쪽 아래 구석에 사이트 주소 한 줄만 아주 작게 들어가요.'),
        ('2027년 5월 3일과 7월 19일은 왜 빨간 날인가요?', '2026년 4월에 관공서의 공휴일에 관한 규정이 바뀌어 노동절(5월 1일)과 제헌절(7월 17일)이 공휴일이 됐어요. 2027년에는 두 날이 모두 토요일이라 다음 월요일인 5월 3일과 7월 19일이 대체공휴일이에요.'),
        ('선거일이나 임시공휴일도 들어 있나요?', '확정된 날만 들어 있어요. 2026년 6월 3일 전국동시지방선거와 2028년 4월 12일 국회의원선거일이 그래요. 임시공휴일과 그 뒤 선거일은 정해지면 더해요.'),
        ('음력과 손 없는 날은 어디에 나오나요?', '월별 12장과 한 달 모양에 넣을 수 있어요. ‘내 설정으로 바꾸기’에서 음력, 24절기, 손 없는 날을 켜고 꺼요. 1년 한 장에는 자리가 없어 넣지 않아요.'),
        ('빨간 날이면 회사도 쉬나요?', '상시 근로자가 5명 이상인 사업장에서는 일요일을 뺀 관공서 공휴일과 대체공휴일이 유급휴일이에요. 근로자대표와 서면으로 합의하면 다른 근로일로 바꿀 수 있어요. 4명 이하 사업장에는 이 조항이 적용되지 않아요. 근거는 <a href="' + LAW55 + '">근로기준법 제55조 제2항</a>, <a href="' + LAW30 + '">시행령 제30조 제2항</a>, <a href="' + LAW11 + '">제11조</a>예요(2026. 10. 10. 확인).'),
        ('설정을 바꿔도 PDF가 선명한가요?', '네. 어떤 설정으로 받아도 PDF에 글자가 그대로 들어가요. 크게 인쇄해도 선명하고 글자를 검색할 수 있어요.'),
        ('휴대폰에서도 받을 수 있나요?', '네. PDF 받기를 누르면 파일이 바로 저장돼요. 미리보기를 누르면 크게 볼 수 있어요.'),
    ],
    'en': [
        ('Are there ads or logos inside the file?', 'No. The PDF, the image and the printout carry no ads. Only the site address is printed in very small type in the bottom corner.'),
        ('Why is December 31, 2027 marked as a holiday?', 'New Year’s Day 2028 falls on a Saturday, so the federal holiday is observed on Friday, December 31, 2027. The calendar shows observed days because those are the days offices actually close.'),
        ('Can I print on A4 instead of Letter?', 'Yes. Open “Change settings” and pick A4. The preview changes shape and the PDF and print layout follow it.'),
        ('Can weeks start on Monday?', 'Yes. Choose Monday under “Change settings”. With week numbers on, Monday-start calendars use ISO 8601 week numbers and Sunday-start calendars count from the week that contains January 1.'),
        ('Is the PDF real text or a picture?', 'Real text. Every PDF, whatever settings you pick, keeps its letters as letters, so it prints sharply at any size and the text can be searched.'),
        ('Does it work on a phone?', 'Yes. “Download PDF” saves the file directly. Tap the preview to enlarge it.'),
    ],
}


ARTICLES = {
    'ko': [
        dict(slug='2026-nodongjeol-jeheonjeol', title='노동절·제헌절, 2026년부터 공휴일이 됐어요',
             desc='2026년 4월 개정으로 노동절(5월 1일)과 제헌절(7월 17일)이 관공서 공휴일이 됐어요. 5월 1일이 그전과 무엇이 다른지, 2026~2028년 달력에서 달라지는 날, 회사가 쉬는 기준을 담았어요.',
             lead='2026년 4월 30일 관공서의 공휴일에 관한 규정이 바뀌어 노동절(5월 1일)과 제헌절(7월 17일)이 공휴일이 됐어요. 2026년 달력부터 두 날이 빨간 날이에요.',
             body='''<h2>무엇이 바뀌었나요</h2>
<p>바뀐 규정은 대통령령 제36290호(2026년 4월 30일 일부개정)예요. 노동절은 2026년 5월 1일부터, 제헌절을 포함한 국경일 조항은 2026년 5월 11일부터 시행됐어요. 그래서 2026년에는 5월 1일과 7월 17일이 모두 공휴일이었어요.</p>
<p>두 날은 대체공휴일도 받아요. 토요일이나 일요일과 겹치면 그다음 첫 번째 평일이 쉬는 날이 돼요.</p>
<h2>5월 1일은 원래 쉬는 날 아니었나요</h2>
<p>5월 1일은 ‘근로자의 날’이던 때부터 근로기준법에 따른 유급휴일이었어요. 이 날을 정한 법은 2025년 11월 11일에 이름이 「근로자의 날 제정에 관한 법률」에서 <a href="''' + NODONG + '''">「노동절 제정에 관한 법률」</a>로 바뀌었고, 조문은 “5월 1일을 노동절로 하고, 이 날을 「근로기준법」에 따른 유급휴일로 한다.” 한 문장이에요.</p>
<p>2026년에 달라진 것은 이 날이 관공서의 공휴일에 관한 규정에도 들어갔다는 점이에요. 그래서 달력에 빨간 날로 찍히고, 주말과 겹치면 대체공휴일이 생겨요.</p>
<h2>2026~2028년 달력에서 달라지는 날</h2>
<table><thead><tr><th>해</th><th>노동절 5월 1일</th><th>제헌절 7월 17일</th><th>새로 생기는 대체공휴일</th></tr></thead><tbody>
<tr><td>2026년</td><td>금요일</td><td>금요일</td><td>없음</td></tr>
<tr><td>2027년</td><td>토요일</td><td>토요일</td><td>5월 3일(월), 7월 19일(월)</td></tr>
<tr><td>2028년</td><td>월요일</td><td>월요일</td><td>없음</td></tr>
</tbody></table>
<p>2027년에는 쉬는 날이 네 번 달라져요. 5월 1일과 7월 17일은 토요일이라 눈에 띄지 않지만, 5월 3일과 7월 19일 월요일이 새로 빨간 날이 돼요. 5월 4일 하루만 연차를 내면 5월 1일부터 어린이날(5월 5일)까지 5일을 쉬어요.</p>
<h2>2027년 공휴일은 모두 며칠인가요</h2>
<p>세는 방법에 따라 숫자가 셋이에요. 달력에 이름이 붙는 공휴일은 대체공휴일까지 24일이고, 이 가운데 4일은 일요일과 겹쳐요. 일요일 52일을 더하고 겹치는 4일을 빼면 관공서가 쉬는 날은 72일이에요. 여기에 토요일까지 쉬면 주5일 기준 휴일은 119일이에요. 72일과 119일은 우주항공청이 2026년 6월 29일에 발표한 2027년 월력요항에 나온 숫자예요.</p>
<p><a class="btn btn-main cta" href="{P}2027/">2027년 달력 한 장 받기</a></p>
<h2>회사도 쉬나요</h2>
<p>상시 근로자가 5명 이상인 사업장에서는 유급휴일이에요. <a href="''' + LAW55 + '''">근로기준법 제55조 제2항</a>은 사용자가 “대통령령으로 정하는 휴일”을 유급으로 보장하도록 정하고, <a href="''' + LAW30 + '''">시행령 제30조 제2항</a>은 그 휴일을 관공서의 공휴일(일요일은 제외)과 대체공휴일로 정해요. 근로자대표와 서면으로 합의하면 그날 대신 다른 근로일에 쉴 수 있어요.</p>
<p>상시 근로자가 4명 이하인 사업장에는 이 조항이 적용되지 않아요(<a href="''' + LAW11 + '''">근로기준법 제11조</a>와 시행령 별표 1). 학교와 그 밖의 기관은 그곳의 규정을 따로 확인하세요.</p>
<h2>오래된 달력을 쓰고 있다면</h2>
<p>2026년 4월 전에 만든 달력과 일정 앱에는 이 날들이 빠져 있을 수 있어요. 5월 1일, 7월 17일, 그리고 2027년 5월 3일과 7월 19일이 빨간 날로 나오는지 보면 바로 알 수 있어요.</p>''',
             sources=[('관공서의 공휴일에 관한 규정 (국가법령정보센터, 시행 2026. 5. 11.)', LAW, SEEN9), ('우주항공청 「2027년 월력요항」 발표 (2026. 6. 29.)', KASA, SEEN9),
                      ('노동절 제정에 관한 법률 (시행 2025. 11. 11.)', NODONG, SEEN10), ('근로기준법 제55조', LAW55, SEEN10), ('근로기준법 시행령 제30조', LAW30, SEEN10), ('근로기준법 제11조', LAW11, SEEN10)]),
        dict(slug='daeche-gonghyuil', title='대체공휴일이 생기는 세 가지 경우와 2026~2030년 날짜',
             desc='대체공휴일이 생기는 세 가지 경우와 생기지 않는 경우(1월 1일·현충일), 2026년부터 2030년까지의 날짜를 표로 담았어요. 회사에 적용되는 기준도 같이 적었어요.',
             lead='공휴일이 주말이나 다른 공휴일과 겹치면 그다음 첫 번째 평일이 대체공휴일이 돼요. 다만 겹쳐도 생기지 않는 날이 있어요.',
             body='''<h2>생기는 경우 세 가지</h2>
<ol>
<li><b>국경일, 부처님오신날, 노동절, 어린이날, 기독탄신일</b>이 토요일이나 일요일과 겹칠 때</li>
<li><b>설 연휴와 추석 연휴</b>가 일요일과 겹칠 때 (토요일과 겹치는 것은 해당하지 않아요)</li>
<li>위 공휴일이 <b>평일에 다른 공휴일과 겹칠 때</b></li>
</ol>
<p>대체공휴일은 그 공휴일 다음의 첫 번째 비공휴일이에요. 그날이 토요일이거나 이미 다른 대체공휴일이면 그다음 날로 넘어가요.</p>
<h2>겹쳐도 생기지 않는 날</h2>
<ul>
<li><b>1월 1일과 현충일</b>은 대체공휴일이 없어요. 2027년 현충일(6월 6일)은 일요일이지만 6월 7일은 평일이고, 2028년 1월 1일은 토요일이지만 1월 3일도 평일이에요.</li>
<li><b>설·추석 연휴가 토요일과 겹칠 때</b>도 없어요. 2026년 추석 연휴는 9월 24일(목)부터 26일(토)까지였는데 대체공휴일이 붙지 않았어요.</li>
</ul>
<h2>2026~2030년 대체공휴일</h2>
<table class="stack"><thead><tr><th>해</th><th>날짜</th><th>까닭</th></tr></thead><tbody>
<tr><td>2026년 (4일)</td><td>3월 2일(월), 5월 25일(월), 8월 17일(월), 10월 5일(월)</td><td>3·1절 일요일, 부처님오신날 일요일, 광복절 토요일, 개천절 토요일</td></tr>
<tr><td>2027년 (7일)</td><td>2월 9일(화), 5월 3일(월), 7월 19일(월), 8월 16일(월), 10월 4일(월), 10월 11일(월), 12월 27일(월)</td><td>설날 일요일, 노동절·제헌절·한글날·기독탄신일 토요일, 광복절·개천절 일요일</td></tr>
<tr><td>2028년 (1일)</td><td>10월 5일(목)</td><td>추석(10월 3일 화요일)과 개천절이 같은 날</td></tr>
<tr><td>2029년 (3일, 예상)</td><td>5월 7일(월), 5월 21일(월), 9월 24일(월)</td><td>어린이날 토요일, 부처님오신날 일요일, 추석 연휴 일요일</td></tr>
<tr><td>2030년 (2일, 예상)</td><td>2월 5일(화), 5월 6일(월)</td><td>설 연휴 일요일, 어린이날 일요일</td></tr>
</tbody></table>
<p>2026·2027년은 공식 발표와 맞춰 본 날짜예요. 2028년은 한국천문연구원 달력자료 기준(월력요항 발표 전), 2029·2030년은 지금 규정으로 계산한 예상이에요. 선거일과 임시공휴일은 정해지면 달라질 수 있어요.</p>
<p><a class="btn btn-main cta" href="{P}2027/holidays/">2027년 공휴일과 연휴 한눈에 보기</a></p>
<h2>회사에도 적용되나요</h2>
<p>상시 근로자가 5명 이상인 사업장에서는 대체공휴일도 유급휴일이에요. <a href="''' + LAW30 + '''">근로기준법 시행령 제30조 제2항</a>이 유급으로 보장할 휴일에 관공서의 공휴일(일요일은 제외)과 함께 대체공휴일을 넣어 두었어요. 근로자대표와 서면으로 합의하면 다른 근로일로 바꿀 수 있고, 4명 이하 사업장에는 이 조항이 적용되지 않아요(<a href="''' + LAW11 + '''">근로기준법 제11조</a>와 시행령 별표 1).</p>
<h2>2028년처럼 평일에 두 공휴일이 겹치면</h2>
<p>2028년 10월 3일은 추석이면서 개천절이에요. 하루에 공휴일이 둘이라 대체공휴일이 하루 생기는데, 10월 4일이 추석 다음 날이라 그다음 평일인 10월 5일(목)이 대체공휴일이 돼요. 그래서 9월 30일(토)부터 10월 5일(목)까지 6일이 이어져요.</p>''',
             sources=[('관공서의 공휴일에 관한 규정 제3조 (국가법령정보센터)', LAW, SEEN9), ('우주항공청 「2027년 월력요항」 발표', KASA, SEEN9), ('한국천문연구원 달력자료', KASI, None),
                      ('근로기준법 제55조', LAW55, SEEN10), ('근로기준법 시행령 제30조', LAW30, SEEN10), ('근로기준법 제11조', LAW11, SEEN10)]),
        dict(slug='a4-han-jang-inswae', pair='print-calendar-on-one-page', title='달력을 A4 한 장에 맞게 인쇄하는 법',
             desc='달력이 두 장으로 나뉘거나 한쪽이 잘릴 때 볼 인쇄 설정이에요. 용지 크기, 배율, 여백, 머리글과 바닥글, 가로세로를 차례로 짚어요.',
             lead='가장 확실한 방법은 PDF로 받아서 인쇄하는 거예요. 브라우저에서 바로 인쇄할 때는 용지 크기와 배율 두 가지만 보면 대부분 해결돼요.',
             body='''<h2>이 사이트에서 인쇄할 때</h2>
<p>인쇄 단추를 누르면 고른 용지(A4 또는 Letter)와 방향(가로·세로)을 인쇄 창에 넘겨요. 브라우저에 따라 인쇄 창에서 용지 크기를 다시 골라야 할 수 있어요. 달력 한 장만 인쇄되고 머리글, 메뉴, 광고는 인쇄되지 않아요.</p>
<h2>한 장에 안 맞을 때 볼 곳 (크롬 기준)</h2>
<p>크롬 인쇄 창에서 ‘설정 더보기’를 펼치면 아래 항목이 나와요. 브라우저와 버전에 따라 이름이 조금 달라요.</p>
<table class="stack"><thead><tr><th>항목</th><th>맞춰 둘 값</th><th>어긋나면 생기는 일</th></tr></thead><tbody>
<tr><td>용지 크기</td><td>A4</td><td>Letter로 돼 있으면 아래쪽이 잘리거나 두 장이 돼요</td></tr>
<tr><td>배율</td><td>기본값</td><td>크게 잡으면 넘치고, 작게 잡으면 한쪽에 몰려요</td></tr>
<tr><td>여백</td><td>기본값</td><td>넓게 잡으면 달력이 줄거나 다음 장으로 넘어가요</td></tr>
<tr><td>머리글과 바닥글</td><td>끔</td><td>날짜와 주소가 종이 위아래에 찍혀요</td></tr>
<tr><td>배경 그래픽</td><td>상관없음</td><td>이 달력은 배경색을 쓰지 않아요</td></tr>
</tbody></table>
<p><a class="btn btn-main cta" href="{P}">달력 만들러 가기</a></p>
<h2>A4와 Letter는 크기가 달라요</h2>
<p>A4는 210 × 297mm, Letter는 215.9 × 279.4mm예요. A4가 5.9mm 좁고 17.6mm 길어요. 그래서 A4로 만든 달력을 Letter 용지에 그대로 찍으면 긴 쪽이 모자라요. 프린터에 든 종이와 같은 크기로 만드는 게 먼저예요. 용지는 ‘내 설정으로 바꾸기’에서 고를 수 있어요.</p>
<h2>가장자리가 잘린다면</h2>
<p>이 달력의 글자는 종이 가장자리에서 위와 옆으로 11mm 넘게, 아래로 6mm 넘게 들어와 있어요. 그래도 가장자리가 잘리면 프린터가 그만큼 여백이 필요한 기종이에요. 인쇄 창에서 용지에 맞게 줄이는 항목을 고르면 전체가 조금 작아지며 다 들어가요.</p>
<h2>잉크를 아끼고 싶다면</h2>
<p>‘내 설정으로 바꾸기’에서 흑백(잉크 절약)을 켜면 빨강·파랑 없이 검은색만 써요. 공휴일은 굵은 숫자와 밑줄로 표시돼요.</p>''',
             sources=[]),
        dict(slug='eumnyeok-yundal', title='2025년 윤6월, 2028년 윤5월로 보는 음력과 윤달',
             desc='음력 한 달은 29일이나 30일이고, 몇 해에 한 번 윤달이 들어가요. 2025~2028년 음력 해의 길이와 윤달 날짜, 설날·추석 날짜를 표로 볼 수 있어요.',
             lead='음력 한 달은 29일(작은달)이거나 30일(큰달)이에요. 열두 달이면 354일쯤이라 양력보다 11일쯤 짧고, 그 차이를 메우려고 몇 해에 한 번 윤달을 넣어요.',
             body='''<h2>2025~2028년 음력 해의 길이</h2>
<table><thead><tr><th>음력 해</th><th>달 수</th><th>날 수</th><th>윤달</th></tr></thead><tbody>
<tr><td>2025년</td><td>13달</td><td>384일</td><td>윤6월 (양력 2025년 7월 25일 ~ 8월 22일, 29일)</td></tr>
<tr><td>2026년</td><td>12달</td><td>355일</td><td>없음</td></tr>
<tr><td>2027년</td><td>12달</td><td>354일</td><td>없음</td></tr>
<tr><td>2028년</td><td>13달</td><td>383일</td><td>윤5월 (양력 2028년 6월 23일 ~ 7월 21일, 29일)</td></tr>
</tbody></table>
<p>윤달이 든 해는 음력 한 해가 383일이나 384일로 길어져요. 그래서 2025년 추석은 10월 6일로 늦었고, 2028년 추석도 10월 3일이에요.</p>
<h2>윤달은 어떻게 정하나요</h2>
<p>음력 달은 달이 해와 같은 방향에 오는 날(합삭)에 시작해요. 24절기 가운데 한 달에 하나씩 드는 열두 절기를 중기라고 하는데, 중기가 들지 않는 달이 생기면 그 달을 앞 달의 윤달로 삼아요. 이렇게 하면 19년에 일곱 번쯤 윤달이 들어가요.</p>
<p>이 사이트의 음력 표는 한국천문연구원 자료를 따른 표예요. 같은 규칙을 천문 계산으로 따로 돌려 1912년부터 2049년까지 모든 달의 시작일이 표와 같은지 맞춰 봤고, 2025~2028년은 천문연구원이 낸 달력자료와 직접 대조했어요.</p>
<p><a class="btn btn-main cta" href="{P}lunar/">양력·음력 바꿔 보기</a></p>
<h2>설날과 추석은 양력으로 언제인가요</h2>
<table><thead><tr><th>해</th><th>설날 (음력 1월 1일)</th><th>추석 (음력 8월 15일)</th></tr></thead><tbody>
<tr><td>2026년</td><td>2월 17일(화)</td><td>9월 25일(금)</td></tr>
<tr><td>2027년</td><td>2월 7일(일)</td><td>9월 15일(수)</td></tr>
<tr><td>2028년</td><td>1월 27일(목)</td><td>10월 3일(화)</td></tr>
</tbody></table>
<h2>윤달 날짜를 양력으로 바꿀 때</h2>
<p>윤달은 같은 번호의 평달 바로 뒤에 와요. 음력 2025년 6월 1일은 양력 6월 25일이고, 윤6월 1일은 양력 7월 25일이에요. 한 달 차이가 나니 변환할 때 윤달인지 꼭 표시해야 해요. 윤달이 없는 해에 윤달을 고르면 변환기가 그 해에는 윤달이 없다고 알려 줘요.</p>''',
             sources=[('한국천문연구원 천문우주지식정보 달력자료', KASI, None), ('우주항공청 「2027년 월력요항」 발표', KASA, SEEN9)]),
    ],
    'en': [
        dict(slug='print-calendar-on-one-page', pair='a4-han-jang-inswae', title='How to Print a Calendar on One Page (Letter vs A4)',
             desc='Why a calendar spills onto a second page or gets cut off, and the print settings that fix it: paper size, scale, margins, headers and footers.',
             lead='The surest way is to download the PDF and print that. If you print straight from the browser, two settings solve most problems: paper size and scale.',
             body='''<h2>Printing from this site</h2>
<p>When you press Print, the paper size (Letter or A4) and orientation you picked are passed to the print dialog. Some browsers still ask you to choose the paper size there. Only the calendar sheet is printed. The page header, menus and ads are left out.</p>
<h2>What to check when it does not fit (Chrome)</h2>
<p>In Chrome’s print dialog, open “More settings”. The names vary a little between browsers and versions.</p>
<table class="stack"><thead><tr><th>Setting</th><th>Set it to</th><th>What goes wrong otherwise</th></tr></thead><tbody>
<tr><td>Paper size</td><td>The paper in your printer</td><td>The wrong size cuts off one edge or adds a second page</td></tr>
<tr><td>Scale</td><td>Default</td><td>Too large overflows, too small leaves the calendar in a corner</td></tr>
<tr><td>Margins</td><td>Default</td><td>Wide margins shrink the calendar or push it to a new page</td></tr>
<tr><td>Headers and footers</td><td>Off</td><td>The date and page address are printed at the top and bottom</td></tr>
<tr><td>Background graphics</td><td>Either</td><td>This calendar has no background color</td></tr>
</tbody></table>
<p><a class="btn btn-main cta" href="{P}">Make a calendar</a></p>
<h2>Letter and A4 are not the same shape</h2>
<p>Letter is 8.5 × 11 inches (215.9 × 279.4 mm). A4 is 210 × 297 mm. A4 is 5.9 mm narrower and 17.6 mm longer. A calendar laid out for A4 will not fit the long side of Letter paper at full size, and a Letter layout leaves a band of empty paper on A4. Make the file in the size of the paper you have. You can switch under “Change settings”.</p>
<h2>If the edges are clipped</h2>
<p>Everything on this calendar sits more than 11 mm from the top and side edges and more than 6 mm from the bottom edge. If the edges still get clipped, your printer needs wider margins than that. Choose the option in the print dialog that fits the page to the paper and the whole sheet shrinks slightly to fit.</p>
<h2>Saving ink</h2>
<p>Turn on “Black only” under “Change settings”. Holidays are then shown with bold, underlined numbers instead of color.</p>''',
             sources=[]),
        dict(slug='2027-long-weekends', title='2027 Long Weekends from US Federal Holidays',
             desc='The ten three-day weekends that US federal holidays create in 2027, with dates, plus the two Thursdays where one day off makes four.',
             lead='US federal holidays create ten three-day weekends in 2027. Five come from Monday holidays, four from holidays observed on a Friday or Monday because the date falls on a weekend, and one from New Year’s Day itself.',
             body='''<h2>The ten long weekends</h2>
<table class="stack"><thead><tr><th>Dates</th><th>Holiday</th><th>Why it is a long weekend</th></tr></thead><tbody>
<tr><td>Fri Jan 1 to Sun Jan 3</td><td>New Year’s Day</td><td>January 1 is a Friday</td></tr>
<tr><td>Sat Jan 16 to Mon Jan 18</td><td>Martin Luther King Jr. Day</td><td>Third Monday in January</td></tr>
<tr><td>Sat Feb 13 to Mon Feb 15</td><td>Washington’s Birthday</td><td>Third Monday in February</td></tr>
<tr><td>Sat May 29 to Mon May 31</td><td>Memorial Day</td><td>Last Monday in May</td></tr>
<tr><td>Fri Jun 18 to Sun Jun 20</td><td>Juneteenth (observed)</td><td>June 19 is a Saturday, so it is observed on Friday</td></tr>
<tr><td>Sat Jul 3 to Mon Jul 5</td><td>Independence Day (observed)</td><td>July 4 is a Sunday, so it is observed on Monday</td></tr>
<tr><td>Sat Sep 4 to Mon Sep 6</td><td>Labor Day</td><td>First Monday in September</td></tr>
<tr><td>Sat Oct 9 to Mon Oct 11</td><td>Columbus Day</td><td>Second Monday in October</td></tr>
<tr><td>Fri Dec 24 to Sun Dec 26</td><td>Christmas Day (observed)</td><td>December 25 is a Saturday, so it is observed on Friday</td></tr>
<tr><td>Fri Dec 31 to Sun Jan 2, 2028</td><td>New Year’s Day 2028 (observed)</td><td>January 1, 2028 is a Saturday, so it is observed on Friday, December 31, 2027</td></tr>
</tbody></table>
<p>The days off in 2027 match the holiday schedule published by the U.S. Office of Personnel Management, which lists Friday, June 18, Monday, July 5 and Friday, December 24 as the observed days. OPM calls the January holiday by its legal name, Birthday of Martin Luther King, Jr.</p>
<p><a class="btn btn-main cta" href="{P}2027/">Get the 2027 calendar on one page</a></p>
<h2>The rule behind “observed”</h2>
<p>Federal law (5 U.S.C. 6103) fixes the eleven holidays. When one falls on a Saturday it is observed on the Friday before, and when one falls on a Sunday it is observed on the Monday after. That is why 2027 ends with a holiday that belongs to 2028.</p>
<h2>Two Thursdays worth one day of leave</h2>
<p>Veterans Day (November 11) and Thanksgiving (November 25) both fall on a Thursday in 2027. Neither makes a three-day weekend on its own. Taking Friday, November 12 gives four days off from November 11 to 14, and taking Friday, November 26 gives four days off from November 25 to 28.</p>
<p>This list covers federal holidays, which apply to federal employees. Your employer, school or state may follow a different schedule.</p>''',
             sources=[('U.S. Office of Personnel Management: Federal Holidays (2027 schedule)', OPM, SEEN10)]),
        dict(slug='week-numbers-iso-vs-us', title='Week Numbers: ISO 8601 vs US Week Numbering',
             desc='Two common ways to number weeks give different answers around New Year. How each works, with worked examples for 2026 and 2027.',
             lead='ISO 8601 weeks start on Monday and week 1 is the week with the year’s first Thursday. The common US style starts weeks on Sunday and calls the week containing January 1 week 1. Around New Year the two disagree.',
             body='''<h2>The two rules</h2>
<table class="stack"><thead><tr><th></th><th>ISO 8601</th><th>US style</th></tr></thead><tbody>
<tr><td>Week starts on</td><td>Monday</td><td>Sunday</td></tr>
<tr><td>Week 1 is</td><td>The week with the first Thursday (the week containing January 4)</td><td>The week containing January 1</td></tr>
<tr><td>Days at the turn of the year</td><td>Can belong to the last week of the previous year, or week 1 of the next</td><td>Always belong to their own calendar year</td></tr>
<tr><td>Weeks in a year</td><td>52 or 53</td><td>53 or 54, with short first and last weeks</td></tr>
</tbody></table>
<h2>Worked examples</h2>
<table><thead><tr><th>Date</th><th>ISO 8601</th><th>US style</th></tr></thead><tbody>
<tr><td>Thu Dec 31, 2026</td><td>2026, week 53</td><td>Week 53</td></tr>
<tr><td>Fri Jan 1, 2027</td><td>2026, week 53</td><td>Week 1</td></tr>
<tr><td>Sun Jan 3, 2027</td><td>2026, week 53</td><td>Week 2</td></tr>
<tr><td>Mon Jan 4, 2027</td><td>2027, week 1</td><td>Week 2</td></tr>
<tr><td>Fri Dec 31, 2027</td><td>2027, week 52</td><td>Week 53</td></tr>
</tbody></table>
<p>January 1, 2027 is a Friday. Its week has only three days in 2027, so ISO counts it as the last week of 2026. That makes 2026 a 53-week year in ISO numbering. In the US style the same Friday is in week 1, and a new week starts two days later on Sunday, January 3.</p>
<p><a class="btn btn-main cta" href="{P}?wk=1">Make a calendar with week numbers</a></p>
<h2>Which one to use</h2>
<p>Use ISO week numbers when you share schedules across countries or with software that says “ISO week”. Use the US style when your calendar starts on Sunday and you want week 1 to begin with January 1. What matters is that everyone reading the calendar uses the same rule.</p>
<h2>On this site</h2>
<p>Turn on “Week numbers” under “Change settings”. A Monday-start calendar is numbered by ISO 8601 and a Sunday-start calendar by the US style, so the numbers always match the rows you see.</p>''',
             sources=[]),
        dict(slug='south-korea-public-holidays-2027', title='South Korea Public Holidays in 2027 (in English)',
             desc='All 24 public holiday dates in South Korea for 2027 with weekdays, including the substitute holidays and the two holidays added by the 2026 rule change.',
             lead='South Korea has 24 public holiday dates in 2027, not counting ordinary Sundays. Seven of them are substitute holidays, because many holidays land on a weekend that year.',
             body='''<h2>The full list</h2>
{KR2027_TABLE}
<p>English names here are the commonly used translations, not official titles. Substitute holidays are extra days off given when a holiday falls on a weekend or on another holiday.</p>
<p><a class="btn btn-main cta" href="{P}?c=kr">Print a 2027 calendar with these holidays</a></p>
<h2>What changed in 2026</h2>
<p>A revision to the public holiday rules dated April 30, 2026 made Labor Day (May 1) a public holiday from May 1, 2026 and restored Constitution Day (July 17) as one from 2026. Both also qualify for substitute holidays. In 2027 both fall on a Saturday, so Monday, May 3 and Monday, July 19 are days off. Calendars made before the change will not show them.</p>
<h2>How many days off is that</h2>
<p>According to the 2027 almanac notice from the Korea AeroSpace Administration, the 24 dates plus 52 Sundays, minus the 4 holidays that fall on a Sunday, give 72 public holidays. Counting Saturdays as well, a five-day work week has 119 days off in 2027.</p>
<h2>Do private companies close too</h2>
<p>These are holidays for government offices. Under <a href="''' + LAW55 + '''">Article 55(2) of the Labor Standards Act</a> and Article 30 of its Enforcement Decree, workplaces with five or more regular employees must give the same days (Sundays aside) and the substitute holidays as paid days off, unless a written agreement with the employee representative swaps a day for another working day. The rule does not apply to workplaces with four or fewer employees.</p>
<h2>Long weekends</h2>
<p>There are ten breaks of three days or more: Jan 1 to 3, Feb 6 to 9 (Seollal), Feb 27 to Mar 1, May 1 to 3, Jul 17 to 19, Aug 14 to 16, Sep 14 to 16 (Chuseok), Oct 2 to 4, Oct 9 to 11 and Dec 25 to 27. Chuseok runs Tuesday to Thursday, so taking Monday, September 13 or Friday, September 17 off gives six days in a row.</p>
<h2>Print it</h2>
<p>The calendar maker can print a 2027 calendar with these holidays in English. Open “Change settings” and choose South Korea under Holidays.</p>''',
             sources=[('Regulations on Holidays of Government Offices (Korean, National Law Information Center)', LAW, SEEN9), ('Korea AeroSpace Administration: 2027 almanac notice (Korean)', KASA, SEEN9),
                      ('Labor Standards Act, Article 55 (Korean)', LAW55, SEEN10), ('Enforcement Decree of the Labor Standards Act, Article 30 (Korean)', LAW30, SEEN10), ('Labor Standards Act, Article 11 (Korean)', LAW11, SEEN10)]),
    ],
}

ABOUT = {
    'ko': ('소개 | 한장달력', '한장달력이 무엇이고 누가 만들었는지, 공휴일·음력·절기를 어떤 자료로 계산하고 어떻게 검산하는지 적었어요.', '''<h1>한장달력 소개</h1>
<p class="lead">공휴일이 들어간 1년 달력을 한 장으로 인쇄하거나 PDF·이미지로 받는 곳이에요. 가입이 없고, 받는 파일에 광고가 없어요.</p>
<p class="meta">마지막 확인 2026년 10월 10일</p>
<div class="prose">
<h2>누가 만들었나요</h2>
<p>개인사업자 루멘랩(Lumen Lab)이 만들고 운영해요. 다른 앱과 도구는 <a href="https://lumenlab.page/">루멘랩</a>에 있어요. 문의는 <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>으로 보내 주세요.</p>
<h2>공휴일은 무엇을 기준으로 하나요</h2>
<ul>
<li>한국: <a href="''' + LAW + '''">관공서의 공휴일에 관한 규정</a>(시행 2026. 5. 11., 대통령령 제36290호)의 공휴일과 대체공휴일 규칙을 그대로 옮겨 계산해요. 2026·2027년은 공식 발표와 한 날도 다르지 않은지 맞춰 봤어요. 2027년은 <a href="''' + KASA + '''">우주항공청 2027년 월력요항</a> 기준 공휴일 72일, 주5일 휴일 119일이에요.</li>
<li>2028년은 <a href="''' + KASI + '''">한국천문연구원 달력자료</a> 기준이고, 월력요항 발표 전이라 ‘공식 발표 전 자료’라고 표시해요. 2029·2030년은 규정으로 계산한 예상이에요.</li>
<li>선거일과 임시공휴일은 규칙으로 구할 수 없어서 확정된 날만 넣어요.</li>
<li>미국: 연방 공휴일(5 U.S.C. 6103)과, 주말과 겹칠 때 대신 쉬는 날이에요. 2026·2027년은 <a href="''' + OPM + '''">미국 인사관리처(OPM)의 공휴일 일정표</a>와 한 날씩 맞춰 봤어요(2026. 10. 10. 확인).</li>
</ul>
<h2>음력·절기·손 없는 날</h2>
<ul>
<li>음력은 한국천문연구원 자료를 따른 표(1912~2049년)를 써요. 천문 계산으로 모든 달의 시작일을 따로 구해 표와 같은지 검산했고, 2025~2028년은 천문연구원 달력자료와 직접 대조했어요.</li>
<li>24절기는 한국천문연구원 자료가 있는 2025~2028년만 보여 줘요. 그 밖의 해는 지어내지 않아요.</li>
<li>손 없는 날은 음력 날짜 끝자리가 9와 0인 날이에요. 전해 오는 풍습이라 공식 기준은 없어요.</li>
</ul>
<h2>결과는 어떻게 확인하나요</h2>
<p>요일은 1900~2100년 모든 날을, 주 번호와 달 격자는 표준 라이브러리 값과, 공휴일은 공식 표와 자동으로 대조해요. 틀린 곳을 발견하면 메일로 알려 주세요.</p>
<h2>내 정보는 어디로 가나요</h2>
<p>달력은 이 기기의 브라우저 안에서 만들어요. 만든 파일과 음력 변환에 넣은 날짜는 이 기기 밖으로 나가지 않아요. 고른 설정은 주소 뒤에 붙어서, 그 주소를 다시 열면 같은 달력이 나와요. 광고와 방문 통계 요청은 나가요. 자세한 내용은 <a href="{P}privacy/">개인정보 처리방침</a>에 있어요.</p>
</div>'''),
    'en': ('About | Onesheet', 'What Onesheet is, who makes it, and which sources and checks stand behind its holidays, week numbers and lunar dates.', '''<h1>About Onesheet</h1>
<p class="lead">Onesheet prints a whole-year calendar with holidays on a single page, or saves it as a PDF or image. There is no sign-up and no advertising inside the files.</p>
<p class="meta">Last checked October 10, 2026</p>
<div class="prose">
<h2>Who makes it</h2>
<p>Onesheet is made and run by Lumen Lab, a one-person studio. More apps and tools are at <a href="https://lumenlab.page/en/">Lumen Lab</a>. Contact: <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.</p>
<h2>Where the holidays come from</h2>
<ul>
<li>United States: the federal holidays set by 5 U.S.C. 6103, including the observed weekday when a holiday falls on a weekend. The 2026 and 2027 dates were compared day by day with the <a href="''' + OPM + '''">holiday schedules of the U.S. Office of Personnel Management</a> (checked October 10, 2026).</li>
<li>South Korea: computed from the <a href="''' + LAW + '''">Regulations on Holidays of Government Offices</a> as amended on April 30, 2026, and checked date by date against the official tables for 2026 and 2027. 2028 uses astronomical almanac data published before the official notice, and 2029 and 2030 are projections from the rules.</li>
<li>Election days and one-off holidays cannot be computed, so only confirmed dates are included.</li>
</ul>
<h2>Week numbers and lunar dates</h2>
<p>Monday-start calendars use ISO 8601 week numbers. Sunday-start calendars count from the week containing January 1. Korean lunar dates follow a table based on Korea Astronomy and Space Science Institute data for 1912 to 2049, cross-checked against an independent astronomical calculation.</p>
<h2>How results are checked</h2>
<p>Weekdays are tested for every day from 1900 to 2100, and week numbers, month grids and holiday lists are compared automatically with independent references. If you find a mistake, please email us.</p>
<h2>Your data</h2>
<p>Calendars are made inside your browser. The files you make are not sent anywhere. Your settings are kept in the page address, so a saved link reopens the same calendar. Requests for ads and visit statistics do leave your browser. See the <a href="{P}privacy/">privacy policy</a>.</p>
</div>'''),
}

PRIVACY = {
    'ko': ('개인정보 처리방침 | 한장달력', '한장달력은 달력을 브라우저 안에서 만들고, 만든 파일과 넣은 날짜를 전송하지 않아요. 기기에 남는 것, 방문 통계, 광고 쿠키를 적었어요.', '''<h1>개인정보 처리방침</h1>
<p class="meta">시행일: 2026년 10월 10일 · 운영: 루멘랩(Lumen Lab)</p>
<div class="prose">
<h2>입력한 내용과 만든 파일</h2>
<p>한장달력은 달력을 이용자의 브라우저 안에서 만들어요. 음력 변환에 넣은 날짜와 만들어진 PDF·이미지는 저희를 포함해 어디에도 전송되지 않아요. 회원 가입은 없어요.</p>
<p>고른 연도와 설정(주 시작, 용지, 나라 같은 선택)은 주소 뒤에 붙어요. 그 주소를 다시 열거나 남에게 보내면 같은 달력이 열려요. 주소는 다른 웹 요청과 마찬가지로 서버 기록과 방문 통계에 남을 수 있어요.</p>
<h2>기기에 저장하는 정보</h2>
<p>다른 언어판 안내 띠를 닫거나 언어 링크를 누르면, 띠를 다시 띄우지 않으려고 그 선택을 브라우저 저장소(localStorage)의 <code>cal.lang</code> 항목에 기억해요. 브라우저의 사이트 데이터 지우기로 언제든 지울 수 있어요. 달력 설정과 입력한 날짜는 저장하지 않아요.</p>
<h2>방문 통계</h2>
<p>방문 통계는 <a href="''' + CFWA + '''">Cloudflare Web Analytics</a>로 봐요. 어느 페이지를 몇 번 봤는지, 페이지가 얼마나 빨리 떴는지 같은 숫자예요. Cloudflare 설명으로는 쿠키나 기기 저장소를 쓰지 않아요. 음력 변환에 넣은 날짜와 만든 파일은 여기에 실리지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="https://policies.google.com/technologies/partner-sites?hl=ko">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="https://www.google.com/settings/ads">Google 광고 설정</a>에서 끌 수 있어요. 받는 파일과 인쇄물에는 광고가 들어가지 않아요.</p>
<h2>글꼴과 서버 기록</h2>
<p>글꼴은 공개 전송망인 jsDelivr에서 받아요. 다른 웹 요청처럼 접속 IP가 전달돼요. 사이트는 Cloudflare에서 제공되고, Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>
</div>'''),
    'en': ('Privacy policy | Onesheet', 'Onesheet makes calendars inside your browser and does not send the files you make. What is stored on your device, visit statistics, and how ads use cookies.', '''<h1>Privacy policy</h1>
<p class="meta">Effective October 10, 2026 · Operated by Lumen Lab</p>
<div class="prose">
<h2>What you enter and the files you make</h2>
<p>Onesheet builds calendars inside your browser. The PDF and image files it creates are never sent to us or anyone else. There are no accounts.</p>
<p>The year and settings you choose (week start, paper size, country and so on) are added to the page address. Opening or sharing that address shows the same calendar. Like any web request, the address can appear in server logs and visit statistics.</p>
<h2>What is stored on your device</h2>
<p>If you close the language suggestion bar or follow a language link, that choice is saved in your browser’s localStorage under the key <code>cal.lang</code> so the bar does not come back. Clearing site data removes it. Calendar settings are not stored.</p>
<h2>Visit statistics</h2>
<p>We look at visit statistics through <a href="''' + CFWA + '''">Cloudflare Web Analytics</a>: which pages were viewed and how fast they loaded. According to Cloudflare, it does not use cookies or local storage. The files you make are not included.</p>
<h2>Ads</h2>
<p>This site shows ads through Google AdSense. Google and other ad vendors use cookies to serve ads based on your visits to this and other websites. Because of these ads, third parties such as Google may place or read cookies in your browser and collect information through web beacons (tiny invisible images). See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites or apps that use its services</a>. You can turn off personalized ads in <a href="https://www.google.com/settings/ads">Google Ad Settings</a>. The files you download and the pages you print contain no ads.</p>
<h2>Fonts and server logs</h2>
<p>The page loads its font from jsDelivr, a public content network, which receives your IP address like any web request. The site is served by Cloudflare, which may briefly keep basic request logs such as IP addresses to run the service securely.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>
</div>'''),
}

LICENSES = [
    ('Pretendard (글꼴 / typeface)', 'Kil Hyung-jin', 'SIL Open Font License 1.1', 'https://github.com/orioncactus/pretendard', 'https://openfontlicense.org/'),
    ('Onesheet Sans (PDF에 담는 글꼴. Pretendard에서 달력에 쓰는 글자만 남기고 이름을 바꾼 것 / the font embedded in PDFs: a renamed subset of Pretendard)', 'Kil Hyung-jin', 'SIL Open Font License 1.1', 'https://github.com/orioncactus/pretendard', 'https://openfontlicense.org/'),
    ('korean_lunar_calendar (음력 표를 만들 때 / used to build the lunar table)', 'Jinil Lee', 'MIT', 'https://github.com/usingsky/korean_lunar_calendar_py', 'https://opensource.org/license/mit'),
    ('holidays (미국 표·대조용 / US table and cross-checks)', 'Vacanza Team and contributors', 'MIT', 'https://github.com/vacanza/holidays', 'https://opensource.org/license/mit'),
    ('PyEphem (검산용 천문 계산 / astronomical cross-check)', 'Brandon Rhodes', 'MIT', 'https://github.com/brandon-rhodes/pyephem', 'https://opensource.org/license/mit'),
    ('openpyxl (엑셀 파일을 만들 때 / used to build the .xlsx files)', 'Eric Gazoni, Charlie Clark', 'MIT', 'https://openpyxl.readthedocs.io/', 'https://opensource.org/license/mit'),
    ('fontTools (PDF용 글꼴을 줄일 때 / used to subset the PDF font)', 'Just van Rossum and contributors', 'MIT', 'https://github.com/fonttools/fonttools', 'https://opensource.org/license/mit'),
    ('pypdf (미리 만든 PDF에 제목을 적을 때 / used to set titles in the prebuilt PDFs)', 'pypdf contributors', 'BSD 3-Clause', 'https://github.com/py-pdf/pypdf', 'https://opensource.org/license/bsd-3-clause'),
]
