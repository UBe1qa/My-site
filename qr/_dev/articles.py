"""오래QR / Staycode 가이드 글(build.py 가 읽는다). 글 담당이 쓴다.
- 사실·숫자는 _dev/facts.md 의 [확인됨]만. 예시 문자열·칸 수·스티커 장 수·로고 판정은 이 사이트의 코드(assets/*.js)로 직접 만들어 본 값.
- 형식: CLAUDE.md 의 ARTICLES = [{lang, slug, title, description, h1, lead, body, pair, tool, checked, sources}]
"""

CHECKED = '2026-10-14'

S_QRFY_HOME = {'label': 'QRFY 첫 화면(한국어)', 'url': 'https://qrfy.com/ko', 'checked': '2026-10-14'}
S_QRFY_TRIAL = {'label': 'QRFY 도움말: 체험이 끝나면 계정과 QR코드는 어떻게 되나', 'url': 'https://support.qrfy.com/en/articles/6998440-what-happens-to-my-account-and-qr-codes-when-the-trial-expires', 'checked': '2026-09-28'}
S_QRFY_PRICE = {'label': 'QRFY 요금표', 'url': 'https://qrfy.com/pricing', 'checked': '2026-09-28'}
S_QRCG_TRIAL = {'label': 'QR Code Generator 도움말: 체험이 끝나면', 'url': 'https://support.qr-code-generator.com/hc/en-us/articles/7665046137613-What-happens-to-my-account-and-QR-Codes-when-the-trial-expires', 'checked': '2026-09-28'}
S_ADOBE = {'label': 'Adobe 커뮤니티: Adobe Express QR코드는 만료되나요(Adobe 직원 답변)', 'url': 'https://community.adobe.com/t5/adobe-express-discussions/do-qr-codes-expire/m-p/13108728/highlight/true', 'checked': '2026-09-28'}
S_DEV = {'label': 'DEV Community: Trustworthy QR codes, a field guide', 'url': 'https://dev.to/danfoley1/-trustworthy-qr-codes-a-field-guide-2p5', 'checked': '2026-09-28'}
S_ZXING = {'label': 'ZXing 위키: Barcode Contents(와이파이 형식)', 'url': 'https://github.com/zxing/zxing/wiki/Barcode-Contents', 'checked': '2026-10-14'}
S_SIZE = {'label': 'QR Code Generator 블로그: QR코드 최소 크기(경험칙)', 'url': 'https://www.qr-code-generator.com/blog/minimum-qr-code-size/', 'checked': '2026-10-14'}
S_EC = {'label': 'DENSO WAVE: 오류 복원 기능', 'url': 'https://www.qrcode.com/en/about/error_correction.html', 'checked': '2026-10-14'}
S_FAQ = {'label': 'DENSO WAVE: QR코드 자주 묻는 질문(상표·사용료)', 'url': 'https://www.qrcode.com/en/faq.html', 'checked': '2026-10-14'}
S_GOV = {'label': '대한민국 정책브리핑: QR 찍기 전 주소 확인(큐싱)', 'url': 'https://www.korea.kr/news/policyNewsView.do?newsId=148935455&pWise=main&pWiseMain=A3', 'checked': '2026-09-28'}
S_MAEIL = {'label': '매일신문(2026-09-24): 큐싱 사고 비중·증가', 'url': 'https://www.imaeil.com/page/view/2026092412190559016', 'checked': '2026-09-28'}

E_QRFY_HOME = {'label': 'QRFY homepage (Korean version)', 'url': 'https://qrfy.com/ko', 'checked': '2026-10-14'}
E_QRFY_TRIAL = {'label': 'QRFY help: What happens to my account and QR codes when the trial expires', 'url': S_QRFY_TRIAL['url'], 'checked': '2026-09-28'}
E_QRCG_TRIAL = {'label': 'QR Code Generator help: What happens when the trial expires', 'url': S_QRCG_TRIAL['url'], 'checked': '2026-09-28'}
E_ADOBE = {'label': 'Adobe Community: Do QR codes expire? (answer from Adobe staff)', 'url': S_ADOBE['url'], 'checked': '2026-09-28'}
E_DEV = {'label': 'DEV Community: Trustworthy QR codes, a field guide', 'url': S_DEV['url'], 'checked': '2026-09-28'}
E_ZXING = {'label': 'ZXing wiki: Barcode Contents (WiFi format)', 'url': S_ZXING['url'], 'checked': '2026-10-14'}
E_SIZE = {'label': 'QR Code Generator blog: Minimum QR code size (rule of thumb)', 'url': S_SIZE['url'], 'checked': '2026-10-14'}
E_EC = {'label': 'DENSO WAVE: Error correction feature', 'url': S_EC['url'], 'checked': '2026-10-14'}
E_FAQ = {'label': 'DENSO WAVE: QR Code FAQ (trademark and fees)', 'url': S_FAQ['url'], 'checked': '2026-10-14'}
E_GOV = {'label': 'Korea.kr policy briefing: check the address before scanning (in Korean)', 'url': S_GOV['url'], 'checked': '2026-09-28'}


ARTICLES = [
    # ------------------------------------------------------------------ 한국어
    dict(
        lang='ko', slug='qr-manryo', pair='do-qr-codes-expire', tool='/ko/', checked=CHECKED,
        title='QR코드 유효기간·만료: 멈추는 QR과 안 멈추는 QR | 오래QR',
        description='QR코드 자체에는 유효기간이 없어요. 멈추는 건 업체 서버를 거치는 동적 QR이에요. 체험이 끝나면 꺼지는 구조, 내 QR이 동적인지 찍어서 확인하는 법, 이미 인쇄했다면 할 일.',
        h1='QR코드 유효기간과 만료: 멈추는 QR과 안 멈추는 QR',
        lead='QR코드라는 그림에는 유효기간이 없어요. <strong>정적 QR</strong>은 넣은 주소가 그림 안에 그대로 들어 있어서, 찍으면 휴대폰이 그 주소로 바로 가요. 중간에 거치는 서버가 없으니 꺼질 일도 없어요. 멈출 수 있는 건 <strong>동적 QR</strong>이에요. 그림에는 업체의 짧은 주소가 들어 있고, 찍을 때마다 그 업체 서버를 거쳐 진짜 주소로 넘어가요. 구독이나 무료 체험이 끝나면 업체가 이 넘겨주기를 멈출 수 있어요.',
        body='''
<h2>정적 QR과 동적 QR은 무엇이 다른가요?</h2>
<p>그림 안에 무엇이 들어 있느냐가 다르고, 나머지 차이는 모두 여기서 나와요.</p>
<table>
<thead><tr><th></th><th>정적 QR</th><th>동적 QR</th></tr></thead>
<tbody>
<tr><td>그림 안에 든 것</td><td>내가 넣은 주소·글 그대로</td><td>업체의 짧은 주소</td></tr>
<tr><td>찍으면</td><td>휴대폰이 바로 내 주소로</td><td>업체 서버를 거쳐 내 주소로</td></tr>
<tr><td>인쇄 뒤 주소 바꾸기</td><td>안 돼요</td><td>돼요(업체 화면에서)</td></tr>
<tr><td>찍힌 수 세기</td><td>업체가 세지 않음(UTM으로 내 분석 도구에서)</td><td>업체가 세 줘요</td></tr>
<tr><td>멈출 수 있나</td><td>그림 자체는 멈추지 않음</td><td>구독·체험이 끝나면 멈출 수 있음</td></tr>
</tbody>
</table>
<p>정적 QR이라고 페이지가 늘 열린다는 뜻은 아니에요. 넣은 주소의 페이지를 지우면 QR은 찍혀도 그 페이지가 열리지 않아요. 그림이 멈추지 않을 뿐이에요.</p>

<h2>체험이 끝나면 왜 꺼지나요?</h2>
<p>찍을 때마다 업체 서버를 거치는 구조라서, 업체가 넘겨주기를 끄면 인쇄한 QR이 모두 함께 멈춰요. 업체 도움말에 이 동작이 적혀 있어요.</p>
<ul>
<li>QRFY 첫 화면(2026년 10월 14일 확인)에는 정적 QR은 무료·만료 없음, 동적 QR은 카드 없이 7일 무료 체험 뒤 구독이 필요하다고 나와요.</li>
<li>QRFY 도움말(2026년 9월 28일 확인)에 따르면 체험이 끝나면 동적 코드가 꺼지고 QRFY 안내 페이지로 연결돼요. 끝나기 48시간 전에 메일을 보낸다고 해요.</li>
<li>QR Code Generator 도움말(2026년 9월 28일 확인)도 체험이 끝나면 동적 코드를 끄고 안내 페이지로 보낸다고 적고 있어요.</li>
<li>구독을 이어 가는 값은 업체마다 달라요. QRFY 한국 화면 요금표(2026년 9월 28일 확인)는 3개월 208,500원, 12개월 408,000원이었어요(부가세 별도).</li>
</ul>
<p>무료라도 정적 QR만 주는 곳도 있어요. Adobe 커뮤니티의 Adobe 직원 답변(2026년 9월 28일 확인)은 Adobe Express QR이 정적이라 만료·요금·스캔 한도가 없고, 대신 통계와 주소 변경도 없다고 설명해요.</p>

<h2>내 QR이 동적인지 어떻게 알 수 있나요?</h2>
<p>한 번 찍어서 뜨는 주소를 보면 돼요. 내가 넣은 주소가 아니라 처음 보는 업체 도메인의 짧은 주소가 뜨면 동적 QR이에요.</p>
<ol>
<li>인쇄물 사진이나 화면을 <a href="/ko/scan/">QR코드 스캐너</a>로 읽어요. 이 스캐너는 주소를 바로 열지 않고 '실제로 가는 곳'을 크게 보여 줘요.</li>
<li>보이는 주소를 내가 넣은 주소와 비교해요. 예를 들어 넣은 주소가 <code>https://example.com/menu</code>인데 <code>https://(업체 도메인)/aB3xY9</code>처럼 짧은 꼬리가 붙은 다른 도메인이 나오면 업체 서버를 거치는 QR이에요. 이름난 짧은 주소 서비스면 스캐너가 '짧은 주소 서비스예요'라고 따로 알려 줘요.</li>
<li>와이파이·연락처 QR은 읽었을 때 <code>WIFI:</code>나 <code>BEGIN:VCARD</code>로 시작하는 내용이 바로 보이면 정적이에요. 주소가 뜨면 업체 페이지를 거치는 방식이에요.</li>
</ol>

<h2>이미 인쇄했다면 무엇부터 하나요?</h2>
<ol>
<li><strong>동적이면 계정부터 확인해요.</strong> 체험인지, 구독이 언제 끝나는지, 끝나면 코드가 어떻게 되는지 그 업체 도움말을 봐요. 인쇄물을 계속 쓸 동안은 그 QR이 업체에 묶여 있어요.</li>
<li><strong>다음 인쇄 때는 내가 쥔 주소를 정적 QR에 담아요.</strong> DEV Community의 글은 최종 목적지 대신 내가 관리하는 중간 주소를 가리키라고 권해요. 내 사이트의 <code>/menu</code> 같은 페이지 주소를 담아 두면, 내용이 바뀔 때 QR은 그대로 두고 그 페이지만 고치면 돼요.</li>
<li><strong>찍힌 수가 필요하면 UTM 꼬리표를 붙여요.</strong> 오래QR은 찍힌 수를 세지 않아요(이 사이트를 거치지 않으니까요). 대신 <a href="/ko/">QR코드 만들기</a>에서 UTM을 켜면 아래처럼 주소 뒤에 꼬리표가 붙고, 찍고 들어온 방문이 내 구글 애널리틱스·네이버 애널리틱스에 따로 보여요.</li>
</ol>
<figure><code>https://example.com/menu?utm_source=qr&amp;utm_medium=print&amp;utm_campaign=fall-flyer-2026</code></figure>
<p>꼬리표를 붙이면 담는 글이 24바이트에서 84바이트로 늘어, 오류 복원 M 기준 무늬가 25×25칸에서 37×37칸이 돼요(이 사이트의 부호기로 만들어 본 값). 칸이 많을수록 작게 인쇄하기 어려우니 <a href="/ko/guide/qr-inswae-keugi/">QR코드 인쇄 크기</a>도 같이 보세요.</p>
''',
        sources=[S_QRFY_HOME, S_QRFY_TRIAL, S_QRCG_TRIAL, S_QRFY_PRICE, S_ADOBE, S_DEV],
    ),
    dict(
        lang='ko', slug='wifi-qr', pair='wifi-qr-code', tool='/ko/wifi/', tool_label='와이파이 QR 만들러 가기', checked=CHECKED,
        title='와이파이 QR코드 만들기: 형식·특수문자·숨긴 네트워크 | 오래QR',
        description='와이파이 QR은 WIFI:T:WPA;S:이름;P:비밀번호;; 한 줄을 담은 QR이에요. 비밀번호의 ; : 같은 기호 처리, 숨긴 네트워크, 아이폰·안드로이드에서 연결되는 방식, 가게 안내판 팁.',
        h1='와이파이 QR코드 만들기: 형식, 특수문자, 숨긴 네트워크',
        lead=r'와이파이 QR은 <code>WIFI:T:WPA;S:카페오래;P:abc\;123;;</code> 같은 한 줄을 그림에 담은 거예요. 손님이 카메라로 찍으면 휴대폰이 이 이름과 비밀번호로 연결하라고 띄워요. <a href="/ko/wifi/">와이파이 QR코드 만들기</a>에 이름과 비밀번호만 넣으면 기호 처리까지 알아서 해요. 비밀번호가 그림 안에 그대로 들어가서, 공유기 비밀번호를 바꾸면 QR도 다시 만들어 인쇄해야 해요.',
        body=r'''
<h2>와이파이 QR에는 무엇이 들어가나요?</h2>
<p>세미콜론(;)으로 나눈 칸 네 개예요. ZXing 위키에 정리된 형식이고, 이 사이트도 그대로 만들어요.</p>
<table>
<thead><tr><th>칸</th><th>뜻</th><th>예</th></tr></thead>
<tbody>
<tr><td><code>T:</code></td><td>보안 방식. <code>WPA</code>·<code>WEP</code>·<code>nopass</code>(비밀번호 없음)</td><td><code>T:WPA</code></td></tr>
<tr><td><code>S:</code></td><td>와이파이 이름(SSID). 꼭 있어야 해요</td><td><code>S:카페오래</code></td></tr>
<tr><td><code>P:</code></td><td>비밀번호. <code>nopass</code>면 쓰지 않아요</td><td><code>P:abc\;123</code></td></tr>
<tr><td><code>H:</code></td><td>숨긴 네트워크면 <code>true</code></td><td><code>H:true</code></td></tr>
</tbody>
</table>
<p>끝은 세미콜론 두 개(<code>;;</code>)로 닫아요. 이 사이트에서 '보안'은 WPA/WPA2/WPA3 공유기면 <code>WPA</code>, 아주 오래된 공유기면 <code>WEP</code>로 담아요. 형식에는 회사용 <code>WPA2-EAP</code>(사람마다 아이디가 따로 있는 방식)도 있지만, 이 도구는 그 방식은 만들지 않아요.</p>

<h2>비밀번호에 ; 나 : 같은 기호가 있으면요?</h2>
<p>앞에 역슬래시(\)를 붙여 담아요. 형식에서 <code>\ ; , : "</code> 다섯 글자는 칸을 나누는 뜻이 있어서, 그대로 두면 휴대폰이 비밀번호를 중간에서 끊어 읽어요. 이 사이트에서 직접 넣어 본 결과예요.</p>
<table>
<thead><tr><th>공유기 비밀번호</th><th>QR에 담기는 값</th></tr></thead>
<tbody>
<tr><td><code>abc;123</code></td><td><code>P:abc\;123;</code></td></tr>
<tr><td><code>sun:rise;42</code></td><td><code>P:sun\:rise\;42;</code></td></tr>
<tr><td><code>moon,light</code></td><td><code>P:moon\,light;</code></td></tr>
<tr><td><code>오늘도"맑음"</code></td><td><code>P:오늘도\"맑음\";</code></td></tr>
<tr><td><code>p@ss,word\1</code></td><td><code>P:p@ss\,word\\1;</code></td></tr>
</tbody>
</table>
<p>입력 칸에는 공유기와 똑같이 치면 되고, 역슬래시는 직접 넣지 마세요. 와이파이 이름에 기호가 있어도 같은 규칙이에요. WPA 비밀번호가 8~63자가 아니거나 이름이 32바이트를 넘으면 공유기와 같은지 확인하라는 알림이 떠요.</p>

<h2>숨긴 네트워크와 비밀번호 없는 와이파이는요?</h2>
<p>숨긴 네트워크는 '숨긴 네트워크' 칸을 켜면 <code>H:true;</code>가 붙어요. 이름이 목록에 안 보여도 휴대폰이 그 이름을 찾아 연결하게 하는 표시예요.</p>
<figure><code>WIFI:T:WPA;S:카페오래-손님;P:오늘도\"맑음\";H:true;;</code></figure>
<p>비밀번호가 없는 와이파이는 보안을 '없음'으로 고르면 <code>P:</code> 칸이 빠져요.</p>
<figure><code>WIFI:T:nopass;S:Guest;;</code></figure>

<h2>아이폰·안드로이드에서는 어떻게 연결되나요?</h2>
<p>ZXing 위키에 따르면 안드로이드와 iOS 11 이상 기본 카메라가 이 형식을 읽어요. 대부분 카메라를 비추면 '네트워크에 연결' 알림이 뜨고, 누르면 비밀번호를 치지 않고 연결돼요. 기종·버전에 따라 알림 모양은 다를 수 있어요. 카메라가 못 읽는 휴대폰은 QR 앱이나 <a href="/ko/scan/">QR코드 스캐너</a>로 읽어 비밀번호를 복사하면 돼요.</p>

<h2>비밀번호를 바꾸면 QR도 바꿔야 하나요?</h2>
<p>네. 와이파이 QR은 정적 QR이라 비밀번호가 그림 안에 들어 있어요. 공유기 비밀번호를 바꾸면 예전 QR로는 연결되지 않으니 새로 만들어 붙여야 해요. 그래서 손님용 와이파이(게스트 네트워크)를 따로 두고 그 비밀번호만 QR에 담으면, 비밀번호를 바꿔도 가게 안쪽 기기에는 영향이 없어요.</p>

<h2>가게 안내판으로 붙일 때</h2>
<ul>
<li><strong>크기:</strong> 찍는 거리가 QR 크기의 10배쯤까지라는 경험칙으로 계산하면, 테이블에서 30~50cm 떨어져 찍으면 무늬 한 변 3~5cm, 계산대 뒤 벽처럼 1m 떨어지면 10cm쯤이에요. 자세한 표는 <a href="/ko/guide/qr-inswae-keugi/">QR코드 인쇄 크기</a>에 있어요.</li>
<li><strong>문구:</strong> 틀에서 '와이파이 연결' 문구를 고르면 무엇을 찍는 QR인지 바로 보여요.</li>
<li><strong>글자도 같이:</strong> 카메라가 못 읽는 손님을 위해 와이파이 이름과 비밀번호를 QR 옆에 글자로도 적어 두면 좋아요.</li>
<li><strong>붙이기 전에:</strong> 이름·비밀번호는 대소문자와 빈칸까지 공유기와 같아야 해요. 인쇄하기 전에 휴대폰으로 한 번 찍어 연결해 보세요.</li>
</ul>
<p>비밀번호는 이 기기 브라우저 안에서만 처리하고, 주소창이나 '최근에 만든 QR'에도 남기지 않아요.</p>
''',
        sources=[S_ZXING, S_SIZE],
    ),
    dict(
        lang='ko', slug='qr-inswae-keugi', pair='qr-code-print-size', tool='/ko/', checked=CHECKED,
        title='QR코드 인쇄 크기: 명함·테이블·포스터·현수막 몇 cm? | 오래QR',
        description='가까이서 찍는 QR은 무늬 한 변 2cm 이상, 찍는 거리는 크기의 10배쯤까지가 경험칙이에요. 명함·테이블·포스터·현수막 크기 표, 둘레 여백 4칸, A4 스티커 시트에 몇 장 들어가는지.',
        h1='QR코드 인쇄 크기: 명함부터 현수막까지 몇 cm가 좋을까',
        lead='가까이서 찍는 QR은 <strong>무늬 한 변을 2cm 이상</strong>으로 하고, <strong>찍는 거리는 QR 크기의 10배쯤까지</strong>로 잡으면 돼요. 1m 떨어져 찍는다면 10cm, 5m 떨어진 현수막이라면 50cm예요. 이 기준은 QR 업체 블로그가 소개하는 경험칙이라, 담은 내용이 많아 무늬가 촘촘하면 더 크게 인쇄하는 게 안전해요.',
        body='''
<h2>어디에 붙이면 몇 cm인가요?</h2>
<p>찍는 거리를 10으로 나누면 무늬 한 변이 나와요. 아래 거리는 흔한 상황을 예로 든 값이고, 크기는 그 거리로 계산한 값이에요.</p>
<table>
<thead><tr><th>쓰임</th><th>찍는 거리(예)</th><th>무늬 한 변(계산)</th></tr></thead>
<tbody>
<tr><td>명함·스티커·포장</td><td>20cm 안쪽</td><td>2cm(이보다 작게는 권하지 않아요)</td></tr>
<tr><td>테이블 위 메뉴·와이파이 안내</td><td>30~50cm</td><td>3~5cm</td></tr>
<tr><td>매장 벽·포스터</td><td>1~2m</td><td>10~20cm</td></tr>
<tr><td>창문 시트·현수막</td><td>3~5m</td><td>30~50cm</td></tr>
</tbody>
</table>
<p>QR Code Generator 블로그(2026년 10월 14일 확인)는 2×2cm면 약 20cm 거리에서 찍힌다고 하고, 거리와 크기의 비를 10배쯤으로 잡아요. 업체가 소개하는 경험칙이지 표준 규격은 아니에요. 조명이 어둡거나 비스듬히 찍는 곳이면 한 단계 크게 잡으세요.</p>

<h2>내용이 길면 왜 더 크게 해야 하나요?</h2>
<p>담는 글이 길수록 무늬의 칸 수가 늘어, 같은 크기로 인쇄해도 칸 하나가 작아지기 때문이에요. 이 사이트의 부호기로 오류 복원 M에서 만들어 보면 이래요.</p>
<table>
<thead><tr><th>담은 내용</th><th>바이트</th><th>무늬 칸 수</th><th>2cm로 인쇄할 때 한 칸</th></tr></thead>
<tbody>
<tr><td><code>https://example.com/menu</code></td><td>24</td><td>25×25</td><td>약 0.8mm</td></tr>
<tr><td>같은 주소 + UTM 꼬리표</td><td>84</td><td>37×37</td><td>약 0.54mm</td></tr>
<tr><td>연락처(이름·전화 2개·이메일·웹·주소·메모)</td><td>317</td><td>69×69</td><td>약 0.29mm</td></tr>
</tbody>
</table>
<p>한 칸 크기는 2cm를 칸 수로 나눠 계산한 값이에요. 같은 2cm라도 마지막 줄은 칸이 첫 줄의 3분의 1 크기라 훨씬 찍기 어려워요. 이 사이트는 무늬가 버전 10(57×57칸)부터 'QR이 촘촘해요' 알림을 띄워요. 줄이는 법은 짧은 주소 쓰기, 오류 복원 한 단계 낮추기, 글 줄이기예요.</p>

<h2>둘레 여백 4칸은 왜 비워 두나요?</h2>
<p>휴대폰이 무늬가 어디서 시작하는지 알려면 둘레에 빈 띠가 있어야 해요. 이 사이트는 둘레 여백 4칸을 기본으로 두고, 4칸보다 줄이면 찍힘 확인에서 '주의'로 알려 줘요. 무늬 둘레에 다른 그림이나 글씨가 붙으면 안 읽힐 수 있어서예요. 틀을 넣으면 틀이 무늬에 붙지 않게 여백이 2칸 밑으로 내려가지 않아요.</p>
<p>이 사이트의 크기(cm)는 <strong>무늬 한 변(여백·틀 빼고)</strong>이에요. 실제 스티커는 여백만큼 더 커요. 25×25칸 무늬에 여백 4칸을 양쪽에 두면 33칸이라, 무늬를 2cm로 잡으면 스티커 한 변은 약 2.64cm가 돼요.</p>

<h2>A4 스티커 시트에는 몇 장 들어가나요?</h2>
<p>저장 칸의 '스티커 시트 인쇄'는 A4에 여백 10mm, 칸 사이 6mm를 두고 재단선을 그려 같은 QR을 여러 장 놓아요. <code>https://example.com/menu</code>(25×25칸, 여백 4칸, 틀 없음)로 만들어 본 장 수예요.</p>
<table>
<thead><tr><th>무늬 크기</th><th>스티커 한 장</th><th>A4 한 장에</th></tr></thead>
<tbody>
<tr><td>2cm</td><td>26.4mm</td><td>48장(6×8)</td></tr>
<tr><td>2.5cm</td><td>33.0mm</td><td>35장(5×7)</td></tr>
<tr><td>3cm</td><td>39.6mm</td><td>24장(4×6)</td></tr>
<tr><td>4cm</td><td>52.8mm</td><td>12장(3×4)</td></tr>
<tr><td>5cm</td><td>66.0mm</td><td>6장(2×3)</td></tr>
</tbody>
</table>
<p>칸 수나 틀이 달라지면 스티커 크기와 장 수도 달라져요. 화면에 '스티커 한 장 ○×○mm'가 바로 보이니 그 값을 보고 고르면 돼요. 'PDF 받기'와 '바로 인쇄'는 같은 칸 수로 나와요.</p>

<h2>인쇄하기 전에</h2>
<ul>
<li>인쇄소에 줄 때는 SVG·PDF·EPS를 주면 크기를 바꿔도 깨지지 않아요.</li>
<li>스티커 위 도장이 '통과'인지 보고, 실제로 찍을 거리에서 휴대폰으로 한 번 찍어 보세요. 찍힘 확인은 화면 속 그림을 읽은 결과라 인쇄 상태·조명·카메라에 따라 실제 결과는 다를 수 있어요.</li>
<li>명함처럼 작게 넣을 연락처라면 <a href="/ko/guide/myeongham-qr/">명함 QR(연락처) 가이드</a>에서 칸을 줄이는 법을 보세요.</li>
</ul>
''',
        sources=[S_SIZE],
    ),
    dict(
        lang='ko', slug='qr-logo', pair='qr-code-with-logo', tool='/ko/', checked=CHECKED,
        title='QR코드에 로고 넣기: 오류 복원·로고 크기·색 대비 | 오래QR',
        description='로고를 넣어도 찍히는 건 오류 복원 덕분이에요. 로고는 가린 만큼 복원 여유를 써요. 오류 복원 단계, 로고 크기별 판정, 대비 2:1·4:1 기준까지 이 사이트의 찍힘 확인 규칙 그대로.',
        h1='QR코드에 로고 넣기: 오류 복원, 로고 크기, 색 대비',
        lead='QR코드 가운데에 로고를 얹어도 찍히는 건 <strong>오류 복원</strong> 덕분이에요. 일부가 가려지거나 더러워져도 남은 칸으로 내용을 되살리는 기능인데, 로고가 가린 칸도 이 여유에서 빠져요. 그래서 로고를 넣을 땐 오류 복원을 H(약 30%)로 올리고, 로고는 작게, 점은 바탕보다 충분히 진하게 해야 해요. 오래QR은 로고를 넣으면 H로 올리고, 점과 바탕의 밝기 대비가 2:1 미만이면 \'안 읽힘\', 4:1 미만이면 \'주의\'로 알려 줘요.',
        body='''
<h2>오류 복원은 어느 단계로 하나요?</h2>
<p>네 단계가 있고, 높을수록 많이 가려져도 읽히지만 같은 내용에 칸이 늘어 촘촘해져요. QR코드를 만든 DENSO WAVE의 설명(2026년 10월 14일 확인)을 정리하면 이래요.</p>
<table>
<thead><tr><th>단계</th><th>복원할 수 있는 양</th><th>DENSO WAVE가 말하는 쓰임</th></tr></thead>
<tbody>
<tr><td>L</td><td>약 7%</td><td>깨끗한 곳, 담을 내용이 많을 때</td></tr>
<tr><td>M</td><td>약 15%</td><td>가장 흔히 쓰는 단계</td></tr>
<tr><td>Q</td><td>약 25%</td><td>더러워지기 쉬운 곳(공장 등)</td></tr>
<tr><td>H</td><td>약 30%</td><td>더러워지기 쉬운 곳(공장 등)</td></tr>
</tbody>
</table>
<p>퍼센트는 전체 부호어 가운데 되살릴 수 있는 비율이에요. 로고가 가린 칸 하나가 여러 부호어에 걸칠 수 있어서, 로고 넓이가 이 퍼센트에 딱 맞으면 이미 여유가 없는 셈이에요. 이 사이트는 로고를 넣으면 H로 올리고 '오류 복원을 H(30%)로 올렸어요'라고 알려요. 로고를 빼면 원래 단계로 돌아가요.</p>

<h2>로고는 얼마나 크게 넣어도 되나요?</h2>
<p>로고가 비운 넓이가 복원 여유의 3분의 1쯤(H에서 약 10.5%)을 넘지 않을 만큼이에요. 이 사이트의 찍힘 확인은 이 선을 넘으면 '주의'를 띄워요. '로고 크기'(QR 한 변에 대한 비율)를 바꿔 가며 <code>https://example.com/menu</code>를 H로 만들어 본 결과예요.</p>
<table>
<thead><tr><th>로고 크기</th><th>비운 넓이(무늬 대비)</th><th>찍힘 확인</th></tr></thead>
<tbody>
<tr><td>10~13%</td><td>3.0%</td><td>로고 규칙 통과</td></tr>
<tr><td>14~20%</td><td>5.8%</td><td>로고 규칙 통과</td></tr>
<tr><td>21~27%</td><td>9.6%</td><td>로고 규칙 통과</td></tr>
<tr><td>28~30%</td><td>14.4%</td><td>주의(로고가 커서 복원 여유가 거의 없어요)</td></tr>
</tbody>
</table>
<p>칸 단위로 비우기 때문에 넓이가 계단처럼 올라가요. 무늬가 촘촘한 긴 주소(49×49칸)에서는 28%까지 통과하고 29%부터 주의였어요. 로고 크기 기본값은 20%예요. 오류 복원을 직접 L이나 M으로 내리면 로고가 작아도 '로고가 있을 땐 오류 복원을 H로 올려 보세요'라는 주의가 떠요.</p>
<p>'로고 뒤 점 비우기'(기본으로 켜짐)는 로고 둘레 칸을 깨끗이 비워 로고가 점에 섞이지 않게 해요. 로고 가장자리가 투명하면 '로고 뒤 바탕 깔기'를 켜면 또렷해져요.</p>

<h2>색은 어떻게 고르나요? 대비 2:1과 4:1</h2>
<p>휴대폰 카메라는 색이 아니라 밝기 차이로 점을 구별해요. 이 사이트는 점 색과 바탕색의 밝기 대비를 계산해 2:1 미만이면 그림을 읽기 전에 '안 읽힘', 2~4:1이면 '주의'로 판정해요. 흰 바탕에서 계산한 예예요.</p>
<table>
<thead><tr><th>점 색</th><th>바탕</th><th>밝기 대비</th><th>찍힘 확인</th></tr></thead>
<tbody>
<tr><td><code>#1e3a8a</code> 남색</td><td><code>#fef3c7</code> 크림</td><td>9.3:1</td><td>대비 통과</td></tr>
<tr><td><code>#2e7d32</code> 진초록</td><td>흰색</td><td>5.1:1</td><td>대비 통과</td></tr>
<tr><td><code>#777777</code> 회색</td><td>흰색</td><td>4.4:1</td><td>대비 통과</td></tr>
<tr><td><code>#8a8a8a</code> 옅은 회색</td><td>흰색</td><td>3.4:1</td><td>주의</td></tr>
<tr><td><code>#ff8a00</code> 주황</td><td>흰색</td><td>2.3:1</td><td>주의</td></tr>
<tr><td><code>#ffd400</code> 노랑</td><td>흰색</td><td>1.4:1</td><td>안 읽힘</td></tr>
<tr><td>흰 점</td><td>검정 바탕</td><td>반전</td><td>안 읽힘</td></tr>
</tbody>
</table>
<p>그라데이션은 가장 밝은 끝 색으로 대비를 재고, 눈 색을 따로 정했다면 눈 색도 따로 재요. 점이 바탕보다 밝은 반전 조합은 휴대폰 카메라 대부분이 못 읽어서 대비와 상관없이 '안 읽힘'이에요.</p>

<h2>찍힘 확인은 어떤 순서로 판정하나요?</h2>
<ol>
<li><strong>규칙 먼저:</strong> 대비 2:1 미만이거나 반전이면 바로 '안 읽힘'이에요.</li>
<li><strong>그림 읽기:</strong> 저장할 그림과 같은 그림을 회색으로 바꿔 크기·흐림을 달리해 여덟 번 읽어요.</li>
<li><strong>통과:</strong> 읽은 내용이 넣은 내용과 글자 하나까지 같고, 대비 4:1 미만·로고가 큼·로고와 L/M·둘레 여백 4칸 미만 같은 규칙에 하나도 걸리지 않을 때만이에요.</li>
<li><strong>주의:</strong> 읽혔어도 규칙에 걸리면 '주의'예요. 이때는 '읽어 보니 똑같아요' 같은 안심 문구를 쓰지 않아요.</li>
</ol>
<p>도장이 '통과'여도 인쇄 상태·조명·카메라에 따라 실제 결과는 다를 수 있어요. 인쇄 전에 휴대폰으로 한 번 찍어 보고, 크기는 <a href="/ko/guide/qr-inswae-keugi/">QR코드 인쇄 크기</a>를 참고하세요. 로고는 <a href="/ko/">QR코드 만들기</a>의 '로고' 탭에서 넣어요. 파일은 이 기기 안에서만 써요.</p>
''',
        sources=[S_EC],
    ),
    dict(
        lang='ko', slug='myeongham-qr', pair='vcard-qr-code', tool='/ko/vcard/', tool_label='명함 QR 만들러 가기', checked=CHECKED,
        title='명함 QR코드(연락처 vCard) 만들기: 무엇이 들어가나 | 오래QR',
        description='명함 QR은 이름·전화·이메일을 vCard 글로 담아, 찍으면 휴대폰이 연락처 추가를 띄워요. 실제로 담기는 줄, 칸을 많이 넣으면 얼마나 촘촘해지는지, 명함 인쇄 팁.',
        h1='명함 QR코드(연락처 vCard): 무엇이 들어가고 어떻게 저장되나',
        lead='명함 QR은 이름·전화·이메일 같은 연락처를 <strong>vCard</strong>라는 글 형식으로 그림에 담은 거예요. 찍으면 휴대폰이 \'연락처에 추가\' 화면을 띄우고, 찍은 사람이 저장을 누르면 저장돼요. 칸을 많이 채울수록 무늬가 촘촘해지니, 명함처럼 작게 인쇄한다면 이름·전화·이메일 정도만 넣는 게 좋아요.',
        body='''
<h2>명함 QR에는 실제로 무엇이 들어가나요?</h2>
<p><a href="/ko/vcard/">연락처(명함) QR코드 만들기</a>에 성 '김', 이름 '오래', 회사·직함·휴대폰·이메일을 넣었을 때 담기는 줄이에요. 줄마다 CRLF로 나뉘어요.</p>
<table>
<thead><tr><th>담기는 줄</th><th>뜻</th></tr></thead>
<tbody>
<tr><td><code>BEGIN:VCARD</code> · <code>VERSION:3.0</code></td><td>vCard 3.0 시작</td></tr>
<tr><td><code>N:김;오래;;;</code></td><td>성;이름 칸</td></tr>
<tr><td><code>FN:김오래</code></td><td>화면에 보일 이름. 한글이면 성과 이름을 붙여요</td></tr>
<tr><td><code>ORG:오래상점</code> · <code>TITLE:대표</code></td><td>회사·직함</td></tr>
<tr><td><code>TEL;TYPE=CELL,VOICE:01012345678</code></td><td>휴대폰. 하이픈·빈칸은 빼고 숫자만 남겨요</td></tr>
<tr><td><code>EMAIL;TYPE=INTERNET:hello@example.com</code></td><td>이메일</td></tr>
<tr><td><code>END:VCARD</code></td><td>끝</td></tr>
</tbody>
</table>
<p>더 넣으면 <code>URL:</code>(웹사이트), <code>ADR;TYPE=WORK:</code>(주소), <code>NOTE:</code>(메모) 줄이 붙어요. '전화 하나 더'로 회사·집·팩스 번호를 <code>TEL;TYPE=WORK</code>처럼 따로 넣을 수 있어요. 글 안의 쉼표·세미콜론은 역슬래시를 붙여 담고, 한 줄이 75바이트를 넘으면 vCard 규칙대로 접어요. 한글은 UTF-8로 그대로 들어가요.</p>

<h2>칸을 많이 넣으면 얼마나 촘촘해지나요?</h2>
<p>바이트가 늘어나는 만큼 칸 수가 늘어요. 같은 사람으로 칸을 늘려 가며 오류 복원 M에서 만들어 본 결과예요.</p>
<table>
<thead><tr><th>넣은 칸</th><th>바이트</th><th>무늬 칸 수</th><th>2cm 인쇄 때 한 칸</th></tr></thead>
<tbody>
<tr><td>이름·휴대폰</td><td>99</td><td>41×41</td><td>약 0.49mm</td></tr>
<tr><td>+ 회사·직함·이메일</td><td>170</td><td>53×53</td><td>약 0.38mm</td></tr>
<tr><td>+ 회사 전화·웹·주소·메모</td><td>317</td><td>69×69</td><td>약 0.29mm</td></tr>
<tr><td>참고: 내 소개 페이지 주소만(URL QR)</td><td>22</td><td>25×25</td><td>약 0.8mm</td></tr>
</tbody>
</table>
<p>마지막 연락처 줄은 버전 13이라 화면에 'QR이 촘촘해요' 알림이 떠요(버전 10부터). 명함에서 잘 찍히게 하려면 주소·메모를 빼거나, 연락처를 모두 적은 내 페이지를 만들고 그 주소를 담은 URL QR을 쓰는 방법이 있어요. 다만 URL QR은 찍은 사람이 그 페이지를 열어야 하고, 연락처 추가 화면이 바로 뜨지는 않아요.</p>

<h2>찍으면 휴대폰에서 어떻게 되나요?</h2>
<p>휴대폰이 vCard를 알아보면 '연락처에 추가' 화면을 띄우고, 이름·전화·이메일·회사·직함·주소·메모가 칸마다 채워져 있어요. 자동으로 저장되지는 않고 찍은 사람이 저장을 눌러요. 휴대폰 기종이나 카메라 앱에 따라 화면 모양은 다를 수 있어요. 인쇄하기 전에 내 휴대폰으로 찍어 칸이 제자리에 들어가는지 보세요. <a href="/ko/scan/">QR코드 스캐너</a>로 읽어도 담긴 칸을 미리 볼 수 있어요.</p>

<h2>명함에 넣을 때 알아 둘 것</h2>
<ul>
<li><strong>크기:</strong> 가까이서 찍는 QR은 무늬 한 변 2cm 이상이 경험칙이에요. 촘촘한 연락처라면 더 크게 잡거나 칸을 줄이세요. 자세한 표는 <a href="/ko/guide/qr-inswae-keugi/">QR코드 인쇄 크기</a>에 있어요.</li>
<li><strong>파일:</strong> 인쇄소에는 SVG나 PDF를 주면 크기를 바꿔도 깨지지 않아요. PDF의 크기는 무늬 한 변(여백·틀 빼고)이에요.</li>
<li><strong>색:</strong> 명함 색과 맞추려면 점 색만 바꾸고 바탕은 밝게 두세요. 도장이 '통과'인지 보고 인쇄하세요.</li>
<li><strong>상표 문구:</strong> DENSO WAVE 자주 묻는 질문(2026년 10월 14일 확인)에 따르면 명함에 QR 그림만 넣을 때는 상표 문구가 필요 없고, 상업적으로 써도 사용료나 라이선스 계약이 필요 없어요. 'QR Code'라는 낱말을 쓸 때만 상표 문구를 넣으라고 해요.</li>
</ul>
<p>연락처는 이 기기 브라우저 안에서만 처리하고 '최근에 만든 QR'에도 남기지 않아요.</p>
''',
        sources=[S_FAQ, S_SIZE],
    ),
    dict(
        lang='ko', slug='qr-daeryang', pair=None, tool='/ko/bulk/', tool_label='QR 대량 만들러 가기', checked=CHECKED,
        title='QR코드 대량 만들기(엑셀·CSV): 줄 규칙과 1,000개 ZIP | 오래QR',
        description='목록을 붙여 넣거나 CSV를 올리면 같은 꾸밈으로 한 번에 최대 1,000개를 만들어 ZIP으로 받아요. URL·글·와이파이마다 다른 줄 규칙, 엑셀에서 붙여 넣는 법, 파일 이름 정하기.',
        h1='QR코드 대량으로 만들기: 엑셀·CSV 줄 규칙과 ZIP 받기',
        lead='<a href="/ko/bulk/">QR코드 대량 만들기</a>에 한 줄에 하나씩 붙여 넣거나 CSV 파일을 올리면, 같은 꾸밈으로 <strong>한 번에 최대 1,000개</strong>를 만들어 ZIP 하나로 받아요. 줄을 나누는 규칙은 종류마다 달라요. URL은 \'이름,주소\', 글은 <strong>한 줄 전체가 내용</strong>(파일 이름은 탭으로), 와이파이는 CSV 칸으로 읽어요.',
        body=r'''
<h2>종류마다 줄을 어떻게 쓰나요?</h2>
<p>쉼표가 흔한 글과, 쉼표가 거의 없는 주소를 다르게 읽어요. 입력 칸 아래에도 고른 종류의 규칙이 보여요.</p>
<table>
<thead><tr><th>종류</th><th>한 줄 쓰는 법</th><th>예</th><th>만들어지는 파일</th></tr></thead>
<tbody>
<tr><td>URL</td><td>주소만, 또는 '이름,주소'·'이름(탭)주소'</td><td><code>https://example.com/menu</code></td><td><code>example-com-menu.png</code></td></tr>
<tr><td>URL</td><td>이름을 붙일 때</td><td><code>테이블7,https://example.com/order?table=7</code></td><td><code>테이블7.png</code></td></tr>
<tr><td>글</td><td>한 줄 전체가 내용(쉼표로 안 나눠요)</td><td><code>오늘의 메뉴: 김밥, 라면</code></td><td>내용에서 이름을 만들어요</td></tr>
<tr><td>글</td><td>이름을 붙일 때는 탭으로만</td><td><code>메뉴판(탭)오늘의 메뉴: 김밥, 라면</code></td><td><code>메뉴판.png</code></td></tr>
<tr><td>와이파이</td><td>CSV 칸: 파일이름, SSID, 비밀번호, 보안, 숨김</td><td><code>201호,Room201,"sun;rise",WPA,</code></td><td><code>201호.png</code></td></tr>
</tbody>
</table>
<p>URL에서 쉼표 앞이 주소 모양이면 이름으로 보지 않아서, 주소 안에 쉼표가 있어도 잘리지 않아요. 와이파이 줄의 비밀번호는 <code>WIFI:T:WPA;S:Room201;P:sun\;rise;;</code>처럼 기호 앞에 역슬래시를 붙여 담아요. 보안을 비우고 비밀번호도 비우면 비밀번호 없는 와이파이(<code>nopass</code>)로 봐요. 칸이 두 개뿐이면 SSID와 비밀번호로 읽어요.</p>

<h2>글에 쉼표가 있는 CSV는 어떻게 올리나요?</h2>
<p>첫 줄을 제목줄로 두면 그때만 CSV 칸으로 읽어요. 제목줄은 <code>filename</code>·<code>content</code>·<code>파일이름</code>·<code>내용</code>·<code>ssid</code> 같은 낱말이 든 줄이고, 그 줄은 건너뛰어요. 쉼표나 줄바꿈이 든 칸은 큰따옴표로 감싸요.</p>
<figure><code>filename,content</code></figure>
<figure><code>공지,"오늘은 3시에 닫아요, 내일 봬요"</code></figure>
<p>이렇게 올리면 '공지'라는 파일에 쉼표가 든 문장 전체가 들어가요. 이 도구는 CSV를 UTF-8로 읽어요. 한글이 깨져 보이면 UTF-8로 저장한 CSV인지 확인하세요.</p>

<h2>엑셀에서 바로 붙여 넣어도 되나요?</h2>
<p>돼요. 엑셀에서 '이름'과 '주소' 두 열을 골라 복사하면 보통 두 칸 사이가 탭으로 나뉜 글로 붙어요. URL은 '이름(탭)주소'를, 글은 '이름(탭)내용'을 그대로 알아봐요. 와이파이도 탭을 쉼표처럼 읽어서, 파일이름·SSID·비밀번호·보안·숨김 다섯 열을 복사해 붙이면 돼요.</p>

<h2>1,000줄이 넘으면요?</h2>
<p>한 번에 1,000줄까지 만들어요. 넘으면 단추가 '앞 1,000줄 만들기'로 바뀌고, 나머지는 나눠서 다시 만들면 돼요. 모두 이 기기 안에서 만들기 때문에 기기 속도에 따라 시간이 걸리고, 중간에 '멈추기'로 멈출 수 있어요. 결과 미리보기 표는 100줄까지 보여요.</p>

<h2>틀린 줄과 같은 이름은 어떻게 되나요?</h2>
<ul>
<li><strong>틀린 줄:</strong> 주소 모양이 아니거나 너무 길어 QR에 못 담는 줄은 건너뛰고, '건너뛴 줄' 표에 몇 번째 줄이 왜 빠졌는지 보여 줘요. 나머지는 그대로 만들어요.</li>
<li><strong>같은 파일 이름:</strong> 뒤에 <code>-2</code>, <code>-3</code>을 붙여요. 파일 이름에 못 쓰는 글자(<code>/ : * ? " &lt; &gt; |</code>)는 하이픈으로 바꿔요.</li>
<li><strong>찍힘 확인:</strong> 줄마다 만들기 화면과 같은 찍힘 확인을 해서 표에 '통과'·'안 읽힘'을 적어요. 안 읽히는 줄이 있으면 꾸밈을 바꿔 다시 만들어 보세요.</li>
</ul>

<h2>꾸밈과 파일은 무엇을 고를 수 있나요?</h2>
<p>꾸밈 세트나, <a href="/ko/">QR코드 만들기</a>에서 '내 꾸밈'으로 저장한 꾸밈 하나를 골라 모든 QR에 똑같이 입혀요. 로고가 든 꾸밈이면 오류 복원을 H로 올려 만들어요. 파일은 PNG(512·1024·2048px)나 SVG 가운데 고르고, 다 만들면 'ZIP 받기'로 한 번에 받아요. 목록과 만든 파일은 이 기기 안에서만 처리해요.</p>
<p>상품 라벨처럼 많이 찍어 붙여도 괜찮아요. DENSO WAVE 자주 묻는 질문(2026년 10월 14일 확인)에 따르면 QR코드 무늬는 상업적으로 써도 사용료나 라이선스 계약이 필요 없어요. 인쇄 크기는 <a href="/ko/guide/qr-inswae-keugi/">QR코드 인쇄 크기</a>를 보세요.</p>
''',
        sources=[S_FAQ],
    ),
    dict(
        lang='ko', slug='qr-ssing', pair='scan-qr-code-safely', tool='/ko/scan/', tool_label='QR코드 스캐너 열기', checked=CHECKED,
        title='큐싱 피하기: QR코드 찍기 전에 주소 확인하는 법 | 오래QR',
        description='큐싱은 QR코드로 가짜 사이트에 보내는 사기예요. 찍은 뒤 바로 열지 말고 실제 도메인부터 보세요. 정부 권고와 통계, 주소에서 볼 곳, 스캐너가 알려 주는 경고 신호를 예시로.',
        h1='큐싱 피하기: QR코드 찍기 전에 주소부터 확인하는 법',
        lead='QR코드를 찍었으면 바로 열지 말고 <strong>실제로 가는 도메인</strong>부터 보세요. QR로 가짜 사이트에 보내 로그인·결제 정보를 받아 가는 \'큐싱\'이 늘고 있어서, 정부도 스캔하기 전에 주소를 확인하라고 권해요. 매일신문(2026년 9월 24일)은 큐싱이 개인을 노린 해킹·사기 사고의 17%를 차지하고 1년 새 60% 늘었다고 보도했어요.',
        body='''
<h2>주소에서 어디를 보면 되나요?</h2>
<p><code>https://</code> 다음부터 첫 <code>/</code> 앞까지가 가는 곳이고, 그 가운데 끝부분이 실제 도메인이에요. 앞부분에 익숙한 이름이 있어도 끝부분이 다르면 다른 사이트예요. <a href="/ko/scan/">QR코드 스캐너</a>는 이 실제 도메인을 크게 보여 줘요. 아래는 스캐너의 주소 검사에 직접 넣어 본 결과예요(예시 도메인).</p>
<table>
<thead><tr><th>읽은 주소</th><th>실제로 가는 곳</th><th>스캐너 경고</th></tr></thead>
<tbody>
<tr><td><code>https://example-bank.co.kr.secure-login.example/verify</code></td><td><code>secure-login.example</code></td><td>앞부분을 다른 사이트처럼 꾸밈, 로그인·인증 낱말</td></tr>
<tr><td><code>https://www.example.com@evil.example/</code></td><td><code>evil.example</code></td><td>@ 앞은 꾸밈, 실제로는 @ 뒤로 가요</td></tr>
<tr><td><code>http://192.168.0.10/login</code></td><td><code>192.168.0.10</code></td><td>암호화 없음, 도메인 대신 IP, 로그인 낱말</td></tr>
<tr><td><code>https://bit.ly/3abcXYZ</code></td><td><code>bit.ly</code></td><td>짧은 주소 서비스(열기 전엔 어디로 갈지 모름)</td></tr>
<tr><td><code>https://xn--80ak6aa92e.example/</code></td><td><code>xn--80ak6aa92e.example</code></td><td>퓨니코드: 비슷한 글자로 흉내 낼 수 있음</td></tr>
<tr><td><code>https://exa%6Dple.com/</code></td><td><code>example.com</code></td><td>도메인에 %로 바꿔 쓴 글자</td></tr>
<tr><td><code>https://example.com:8443/pay</code></td><td><code>example.com</code></td><td>드문 포트 번호</td></tr>
<tr><td><code>tel:060-700-1234</code></td><td>전화</td><td>060 유료 정보 서비스 번호</td></tr>
</tbody>
</table>

<h2>스캐너는 어떤 신호에 경고하나요?</h2>
<ul>
<li>암호화 없는 <code>http</code> 주소</li>
<li>짧은 주소 서비스(실제 목적지가 숨어 있어요)</li>
<li>도메인 대신 IP 주소</li>
<li>퓨니코드(<code>xn--</code>)나 %로 바꿔 쓴 도메인</li>
<li>주소 앞부분에 <code>@</code>가 있어 실제 도메인이 숨은 경우</li>
<li>실제 도메인 앞에 다른 사이트 이름처럼 보이는 조각을 붙인 주소</li>
<li>로그인·결제·인증·계좌·택배·미납·과태료 같은 낱말</li>
<li>드문 포트 번호, 060 같은 유료 번호</li>
<li><code>javascript:</code>처럼 열면 안 되는 종류(열기 단추를 아예 두지 않아요)</li>
</ul>
<p>스캐너는 읽은 주소를 자동으로 열지 않아요. '이 주소 열기'를 눌러야 새 창으로 열려요. 카메라 화면과 올린 사진은 이 기기 안에서만 읽어요.</p>

<h2>경고가 없으면 안전한 건가요?</h2>
<p>아니요. 경고가 없다는 건 눈에 띄는 신호가 없다는 뜻일 뿐이에요. 처음 보는 도메인인데 로그인·결제·본인 확인을 요구하면 그 페이지에서 입력하지 말고, 쓰던 앱이나 직접 친 공식 주소로 들어가 확인하세요.</p>

<h2>찍기 전·후에 이렇게 확인하세요</h2>
<ol>
<li>찍은 뒤 바로 누르지 말고, 휴대폰이나 스캐너가 보여 주는 주소를 끝까지 읽어요.</li>
<li>실제 도메인이 그 가게·기관의 이름과 맞는지 봐요.</li>
<li>짧은 주소라 목적지를 알 수 없으면, 급한 일이 아닌 이상 열지 않아요.</li>
<li>열었더니 로그인·결제를 요구하면, 그 자리에서 입력하지 말고 공식 앱으로 확인해요.</li>
</ol>

<h2>QR을 붙이는 쪽이라면</h2>
<p>손님이 주소를 보고 안심할 수 있게 하는 게 좋아요. DEV Community의 글은 최종 목적지 대신 내가 관리하는 중간 주소를 가리키라고 권해요. 가게 이름이 든 내 도메인 주소를 정적 QR에 담으면, 손님은 낯선 짧은 주소 대신 가게 이름을 보게 돼요. 정적 QR과 동적 QR의 차이는 <a href="/ko/guide/qr-manryo/">QR코드 유효기간·만료</a>에서 설명했어요.</p>
''',
        sources=[S_GOV, S_MAEIL, S_DEV],
    ),

    # ------------------------------------------------------------------ English
    dict(
        lang='en', slug='do-qr-codes-expire', pair='qr-manryo', tool='/', checked=CHECKED,
        title='Do QR Codes Expire? Static vs Dynamic, Explained | Staycode',
        description='The QR image never expires; dynamic codes that route through a provider can stop. How trials switch codes off, how to spot one, and what to do if printed.',
        h1='Do QR codes expire? Static vs dynamic codes',
        lead='A QR code itself never expires. A <strong>static</strong> code stores your link inside the image, so a phone goes straight to it and there is nothing in between to switch off. What can stop working is a <strong>dynamic</strong> code: the image holds a short link belonging to the provider, and every scan passes through their server before reaching your page. When a subscription or free trial ends, the provider can stop forwarding those scans, and every printed copy stops with it.',
        body='''
<h2>What is the difference between static and dynamic codes?</h2>
<p>It comes down to what is stored inside the image. Everything else follows from that.</p>
<table>
<thead><tr><th></th><th>Static code</th><th>Dynamic code</th></tr></thead>
<tbody>
<tr><td>What the image holds</td><td>Your link or text, as is</td><td>The provider's short link</td></tr>
<tr><td>When scanned</td><td>The phone goes straight to your link</td><td>The phone goes to the provider, then to your link</td></tr>
<tr><td>Change the link after printing</td><td>No</td><td>Yes, in the provider's dashboard</td></tr>
<tr><td>Scan counts</td><td>Not counted by the generator (use UTM tags in your own analytics)</td><td>Counted by the provider</td></tr>
<tr><td>Can it stop working?</td><td>The image itself cannot</td><td>Yes, if the subscription or trial ends</td></tr>
</tbody>
</table>
<p>A static code does not keep a page alive. If you delete the page your code points to, the code still scans but the page will not load. Only the image is permanent.</p>

<h2>Why do codes stop when a trial ends?</h2>
<p>Because every scan depends on the provider's server, switching off the redirect switches off every printed copy at once. Providers describe this in their own help pages:</p>
<ul>
<li>QRFY's homepage (checked October 14, 2026, Korean version) lists static codes as free with no expiry, and dynamic codes as a 7-day free trial without a card, followed by a subscription.</li>
<li>QRFY's help center (checked September 28, 2026) says that when the trial ends, dynamic codes are deactivated and redirect to a QRFY notice page. It says an email goes out 48 hours before.</li>
<li>QR Code Generator's help center (checked September 28, 2026) also says dynamic codes are deactivated and sent to a notice page when the trial ends.</li>
</ul>
<p>Not every free tool works this way. In an answer on the Adobe Community forum (checked September 28, 2026), Adobe staff explain that Adobe Express QR codes are static, so they have no expiry, fees or scan limits, and also no statistics or link editing.</p>

<h2>How can I tell if my code is dynamic?</h2>
<p>Scan it and look at the address that appears. If you see a short link on a provider's domain instead of the link you entered, it is a dynamic code.</p>
<ol>
<li>Read the printed code or a photo of it with the <a href="/scan/">QR code scanner</a>. It never opens the link by itself and shows "Where it really goes" in large type.</li>
<li>Compare that with the link you meant to use. If you entered <code>https://example.com/menu</code> but the code holds something like <code>https://(provider-domain)/aB3xY9</code>, scans pass through that provider. Well-known link shorteners get their own warning in the scanner.</li>
<li>For WiFi and contact codes, content that starts with <code>WIFI:</code> or <code>BEGIN:VCARD</code> means the details are stored in the image. If a web address appears instead, the code goes through a hosted page.</li>
</ol>

<h2>Already printed? What to do now</h2>
<ol>
<li><strong>If it is dynamic, check your account first.</strong> Find out whether you are on a trial, when the plan renews, and what the provider's help page says happens at the end. As long as that print run is in use, the code depends on that provider.</li>
<li><strong>Next time, put an address you control in a static code.</strong> A field guide on DEV Community recommends pointing a code at an intermediate address you own rather than at the final destination. Use a page on your own site, such as <code>/menu</code>; when things change, edit the page and leave the printed code alone.</li>
<li><strong>Need scan counts? Add UTM tags.</strong> Staycode does not count scans, because scans never pass through it. Turn on UTM tags in the <a href="/">QR code generator</a> and the link gets tags like the one below, so visits from the code show up separately in your own Google Analytics or similar tool.</li>
</ol>
<figure><code>https://example.com/menu?utm_source=qr&amp;utm_medium=print&amp;utm_campaign=fall-flyer-2026</code></figure>
<p>The tags take the content from 24 to 84 bytes, which grows the pattern from 25×25 to 37×37 modules at error correction level M (generated with this site's encoder). More modules make small prints harder to scan, so see <a href="/guide/qr-code-print-size/">QR code print size</a> before you shrink it.</p>

<h2>Is a static code always the right choice?</h2>
<p>For anything you print and leave in place for years, such as a menu, packaging, a sign or a business card, a static code pointing to a page you own avoids depending on anyone else. The trade-off is that the link inside cannot change, so choose it carefully. If you really need to change destinations without touching your own site, that is what dynamic services sell, and it is worth reading their trial and cancellation terms before you print.</p>
''',
        sources=[E_QRFY_HOME, E_QRFY_TRIAL, E_QRCG_TRIAL, E_ADOBE, E_DEV],
    ),
    dict(
        lang='en', slug='wifi-qr-code', pair='wifi-qr', tool='/wifi/', tool_label='Make a WiFi QR code', checked=CHECKED,
        title='WiFi QR Code: Format, Symbols and Hidden Networks | Staycode',
        description='A WiFi QR code holds one line like WIFI:T:WPA;S:name;P:pass;; How password symbols are escaped, hidden and open networks, iPhone and Android, and sign tips.',
        h1='WiFi QR codes: format, special characters and hidden networks',
        lead=r'A WiFi QR code is a single line of text such as <code>WIFI:T:WPA;S:Cafe Staycode;P:sun\:rise\;42;;</code> stored in the image. When guests point their camera at it, the phone offers to join that network with that password. Enter the name and password in the <a href="/wifi/">WiFi QR code generator</a> and the escaping is done for you. Because the password sits inside the image, changing it on your router means making and printing a new code.',
        body=r'''
<h2>What goes inside a WiFi QR code?</h2>
<p>Four fields separated by semicolons. The format is documented on the ZXing wiki, and this site follows it exactly.</p>
<table>
<thead><tr><th>Field</th><th>Meaning</th><th>Example</th></tr></thead>
<tbody>
<tr><td><code>T:</code></td><td>Security type: <code>WPA</code>, <code>WEP</code> or <code>nopass</code></td><td><code>T:WPA</code></td></tr>
<tr><td><code>S:</code></td><td>Network name (SSID). Required</td><td><code>S:Cafe Staycode</code></td></tr>
<tr><td><code>P:</code></td><td>Password. Left out for <code>nopass</code></td><td><code>P:sun\:rise\;42</code></td></tr>
<tr><td><code>H:</code></td><td><code>true</code> for a hidden network</td><td><code>H:true</code></td></tr>
</tbody>
</table>
<p>The line ends with two semicolons (<code>;;</code>). In this generator, routers using WPA, WPA2 or WPA3 are stored as <code>WPA</code>, and very old routers as <code>WEP</code>. The format also defines <code>WPA2-EAP</code> for enterprise networks where each person has their own login, but this tool does not create those.</p>

<h2>What if the password has ; or : in it?</h2>
<p>A backslash goes in front. Five characters, <code>\ ; , : "</code>, have a special meaning in the format, and left alone they would make a phone cut the password short. Here is what this site actually stores:</p>
<table>
<thead><tr><th>Router password</th><th>Stored in the code</th></tr></thead>
<tbody>
<tr><td><code>sun:rise;42</code></td><td><code>P:sun\:rise\;42;</code></td></tr>
<tr><td><code>abc;123</code></td><td><code>P:abc\;123;</code></td></tr>
<tr><td><code>moon,light</code></td><td><code>P:moon\,light;</code></td></tr>
<tr><td><code>say"hi"</code></td><td><code>P:say\"hi\";</code></td></tr>
<tr><td><code>p@ss,word\1</code></td><td><code>P:p@ss\,word\\1;</code></td></tr>
</tbody>
</table>
<p>Type the password exactly as it is on your router and do not add backslashes yourself. The same rule applies to network names. If a WPA password is not 8 to 63 characters, or the name is longer than 32 bytes, the generator asks you to double-check it against the router.</p>

<h2>Hidden networks and open networks</h2>
<p>Tick "Hidden network" and <code>H:true;</code> is added. It tells the phone to look for that name even though it does not appear in the list.</p>
<figure><code>WIFI:T:WPA;S:Back Office;P:p@ss\,word\\1;H:true;;</code></figure>
<p>For a network with no password, set Security to "None" and the <code>P:</code> field disappears.</p>
<figure><code>WIFI:T:nopass;S:Guest;;</code></figure>

<h2>How do iPhone and Android phones connect?</h2>
<p>According to the ZXing wiki, the built-in cameras on Android and on iOS 11 and later read this format. Usually a "Join network" prompt appears when the camera sees the code, and tapping it connects without typing the password. The exact prompt can look different by model and version. On a phone whose camera cannot read it, use a QR app or the <a href="/scan/">QR code scanner</a> to read the code and copy the password.</p>

<h2>Do I need a new code after changing the password?</h2>
<p>Yes. A WiFi code is a static code, so the password lives in the image. Once you change it on the router, the old code will not connect. A separate guest network helps here: put only the guest password in the code, and you can change it without touching your own devices.</p>

<h2>Tips for a sign at your venue</h2>
<ul>
<li><strong>Size:</strong> using the rule of thumb that a code scans from about 10 times its own width, a code on a table scanned from 30 to 50 cm (12 to 20 in) needs a pattern about 3 to 5 cm (1.2 to 2 in) wide, and one on the wall behind a counter, scanned from about 1 m (3 ft), about 10 cm (4 in). See <a href="/guide/qr-code-print-size/">QR code print size</a> for the full table.</li>
<li><strong>Label it:</strong> pick the "JOIN WI-FI" frame text so people know what the code is for.</li>
<li><strong>Print the details too:</strong> write the network name and password next to the code for guests whose camera cannot read it.</li>
<li><strong>Test before you print:</strong> name and password must match the router exactly, including capitals and spaces. Scan the code with your own phone and join once.</li>
</ul>
<p>The password is processed in your browser only. It is not sent anywhere, not put in the page address, and WiFi codes are never kept in "Recent QR codes".</p>
''',
        sources=[E_ZXING, E_SIZE],
    ),
    dict(
        lang='en', slug='qr-code-print-size', pair='qr-inswae-keugi', tool='/', checked=CHECKED,
        title='QR Code Print Size: How Big for Cards, Tables, Posters | Staycode',
        description='Close-up QR codes: at least 2 cm (0.8 in) wide, scanning from about 10 times their width. A size table, dense codes, quiet zone and sticker sheets.',
        h1='QR code print size: how big should it be?',
        lead='For close-up scans, make the QR pattern <strong>at least 2 cm (0.8 in) wide</strong>, and plan on it scanning from <strong>about 10 times its own width</strong>. A code read from 1 m (about 3 ft) away should be around 10 cm (4 in); a banner read from 5 m should be around 50 cm. This is a rule of thumb shared on a QR provider\'s blog, not a formal standard, so go bigger when the code holds a lot of data.',
        body='''
<h2>How big for each use?</h2>
<p>Divide the scanning distance by 10 to get the width of the pattern. The distances below are typical examples; the sizes are calculated from them.</p>
<table>
<thead><tr><th>Use</th><th>Scanning distance (example)</th><th>Pattern width (calculated)</th></tr></thead>
<tbody>
<tr><td>Business card, sticker, packaging</td><td>up to 20 cm (8 in)</td><td>2 cm (0.8 in), and not smaller</td></tr>
<tr><td>Table menu, WiFi sign</td><td>30 to 50 cm (12 to 20 in)</td><td>3 to 5 cm (1.2 to 2 in)</td></tr>
<tr><td>Shop wall, poster</td><td>1 to 2 m (3 to 6.5 ft)</td><td>10 to 20 cm (4 to 8 in)</td></tr>
<tr><td>Window decal, banner</td><td>3 to 5 m (10 to 16 ft)</td><td>30 to 50 cm (12 to 20 in)</td></tr>
</tbody>
</table>
<p>The QR Code Generator blog (checked October 14, 2026) puts the minimum for close-up codes at 2×2 cm, readable from about 20 cm, and gives examples of a 2-inch code at about 2 feet and an 8-inch code at about 6 to 7 feet. It presents the 10:1 ratio as a rule of thumb. In dim light or where people scan at an angle, go one size up.</p>

<h2>Why does more content need a bigger print?</h2>
<p>More data means more modules (the small squares), so at the same printed width each module gets smaller. Generated with this site's encoder at error correction level M:</p>
<table>
<thead><tr><th>Content</th><th>Bytes</th><th>Modules</th><th>One module at 2 cm</th></tr></thead>
<tbody>
<tr><td><code>https://example.com/menu</code></td><td>24</td><td>25×25</td><td>about 0.8 mm</td></tr>
<tr><td>Same link with UTM tags</td><td>84</td><td>37×37</td><td>about 0.54 mm</td></tr>
<tr><td>Contact card with two phones, email, website, address and note</td><td>305</td><td>69×69</td><td>about 0.29 mm</td></tr>
</tbody>
</table>
<p>Module size is 2 cm divided by the module count. At the same 2 cm, the last code has modules about a third the size of the first, which is much harder for a camera. The generator flags a code as dense from version 10 (57×57 modules) up. To slim it down, use a shorter link, lower error correction one step, or cut the text.</p>

<h2>Why leave a 4-module quiet zone?</h2>
<p>A phone needs an empty border to find where the pattern begins. This generator uses a 4-module quiet zone by default and shows a warning in the scan check if you go below 4, because artwork or text touching the pattern can stop it from scanning. With a frame, the quiet zone never drops below 2 modules, so the frame never touches the pattern.</p>
<p>Sizes in this generator always mean <strong>the pattern itself, without the quiet zone or frame</strong>. The sticker is larger by the quiet zone. A 25×25 pattern plus 4 modules on each side is 33 modules across, so a 2 cm pattern makes a sticker about 2.64 cm wide.</p>

<h2>How many stickers fit on an A4 sheet?</h2>
<p>"Print a sticker sheet" lays out the same code on A4 with a 10 mm page margin, 6 mm between stickers and cut marks. Counts for <code>https://example.com/menu</code> (25×25 modules, 4-module quiet zone, no frame):</p>
<table>
<thead><tr><th>Pattern width</th><th>Each sticker</th><th>Per A4 sheet</th></tr></thead>
<tbody>
<tr><td>2 cm</td><td>26.4 mm</td><td>48 (6×8)</td></tr>
<tr><td>2.5 cm</td><td>33.0 mm</td><td>35 (5×7)</td></tr>
<tr><td>3 cm</td><td>39.6 mm</td><td>24 (4×6)</td></tr>
<tr><td>4 cm</td><td>52.8 mm</td><td>12 (3×4)</td></tr>
<tr><td>5 cm</td><td>66.0 mm</td><td>6 (2×3)</td></tr>
</tbody>
</table>
<p>A different module count or frame changes the sticker size and count. The screen shows "each sticker … mm" as you choose, and "Download sheet PDF" and "Print now" give the same layout.</p>

<h2>Before you print</h2>
<ul>
<li>Give your printer SVG, PDF or EPS so the code stays sharp at any size.</li>
<li>Check that the stamp says it scans, then scan a test print with your phone from the real distance. The scan check reads the on-screen image, so print quality, light and camera can still change the result.</li>
<li>For contact details on a small card, see the <a href="/guide/vcard-qr-code/">vCard QR code guide</a> for ways to keep the code simple.</li>
</ul>
''',
        sources=[E_SIZE],
    ),
    dict(
        lang='en', slug='qr-code-with-logo', pair='qr-logo', tool='/', checked=CHECKED,
        title='QR Code With a Logo: Error Correction and Contrast | Staycode',
        description='A logo works thanks to error correction and uses up part of it. Error correction levels, logo size, and the 2:1 and 4:1 contrast rules of our scan check.',
        h1='QR code with a logo: error correction, size and contrast',
        lead='A QR code still scans with a logo in the middle thanks to <strong>error correction</strong>: extra data that lets a reader rebuild the content when part of the code is dirty or covered. The squares your logo hides use up part of that margin. So with a logo, raise error correction to H (about 30%), keep the logo small, and make the dots much darker than the background. Staycode raises error correction to H when you add a logo, and its scan check calls a brightness contrast under 2:1 "No scan" and under 4:1 "Check".',
        body='''
<h2>Which error correction level should I use?</h2>
<p>There are four levels. Higher levels survive more damage but need more modules for the same content. Summarizing DENSO WAVE, the company that created the QR code (checked October 14, 2026):</p>
<table>
<thead><tr><th>Level</th><th>Can restore</th><th>Typical use according to DENSO WAVE</th></tr></thead>
<tbody>
<tr><td>L</td><td>about 7%</td><td>Clean environments, lots of data</td></tr>
<tr><td>M</td><td>about 15%</td><td>The most commonly used level</td></tr>
<tr><td>Q</td><td>about 25%</td><td>Places where codes get dirty, such as factories</td></tr>
<tr><td>H</td><td>about 30%</td><td>Places where codes get dirty, such as factories</td></tr>
</tbody>
</table>
<p>The percentage is the share of codewords that can be restored. One hidden module can touch more than one codeword, so a logo that covers exactly that percentage leaves no room at all. This generator switches to H when you add a logo and tells you so, and switches back when you remove it.</p>

<h2>How big can the logo be?</h2>
<p>Small enough that the area it clears stays under about a third of the error correction margin, which is about 10.5% at level H. Past that line, the scan check shows a warning. Here is <code>https://example.com/menu</code> at level H with different "Logo size" settings (logo width as a share of the code width):</p>
<table>
<thead><tr><th>Logo size</th><th>Area cleared</th><th>Scan check</th></tr></thead>
<tbody>
<tr><td>10 to 13%</td><td>3.0%</td><td>Logo rule passes</td></tr>
<tr><td>14 to 20%</td><td>5.8%</td><td>Logo rule passes</td></tr>
<tr><td>21 to 27%</td><td>9.6%</td><td>Logo rule passes</td></tr>
<tr><td>28 to 30%</td><td>14.4%</td><td>Check: the logo leaves almost no room for error correction</td></tr>
</tbody>
</table>
<p>Modules are cleared whole, so the area climbs in steps. On a denser code (a longer link, 49×49 modules) the rule passed up to 28% and warned from 29%. The default logo size is 20%. If you set error correction back to L or M yourself, you get a warning even with a small logo.</p>
<p>"Clear dots behind the logo" (on by default) empties the modules around the logo so it does not blend into the dots. If your logo has transparent edges, "Put a background under the logo" makes it crisper.</p>

<h2>Picking colors: the 2:1 and 4:1 rules</h2>
<p>Phone cameras tell dots from background by brightness, not hue. The generator computes the brightness contrast between dot color and background: under 2:1 is "No scan" before the image is even read, and 2:1 to 4:1 is "Check". Examples on a white background unless noted:</p>
<table>
<thead><tr><th>Dot color</th><th>Background</th><th>Contrast</th><th>Scan check</th></tr></thead>
<tbody>
<tr><td><code>#1e3a8a</code> navy</td><td><code>#fef3c7</code> cream</td><td>9.3:1</td><td>Contrast passes</td></tr>
<tr><td><code>#2e7d32</code> dark green</td><td>white</td><td>5.1:1</td><td>Contrast passes</td></tr>
<tr><td><code>#777777</code> gray</td><td>white</td><td>4.4:1</td><td>Contrast passes</td></tr>
<tr><td><code>#8a8a8a</code> light gray</td><td>white</td><td>3.4:1</td><td>Check</td></tr>
<tr><td><code>#ff8a00</code> orange</td><td>white</td><td>2.3:1</td><td>Check</td></tr>
<tr><td><code>#ffd400</code> yellow</td><td>white</td><td>1.4:1</td><td>No scan</td></tr>
<tr><td>white dots</td><td>black</td><td>inverted</td><td>No scan</td></tr>
</tbody>
</table>
<p>For gradients, the lightest end color is measured; separate eye colors are measured on their own. Light dots on a dark background are treated as "No scan" regardless of contrast, because most phone cameras cannot read them.</p>

<h2>How the scan check decides</h2>
<ol>
<li><strong>Rules first:</strong> contrast under 2:1, or inverted colors, is "No scan" straight away.</li>
<li><strong>Read the image:</strong> the same image you download is converted to gray and read eight times at different sizes and blur levels.</li>
<li><strong>Scans:</strong> only when what was read matches your content character for character and no rule is triggered (contrast under 4:1, a large logo, a logo with L or M, or a quiet zone under 4 modules).</li>
<li><strong>Check:</strong> if it reads but a rule is triggered. In that case the check never shows the reassuring "it matches" message.</li>
</ol>
<p>Even when the stamp says it scans, print quality, light and camera can change the real result. Scan a test print with your phone, and see <a href="/guide/qr-code-print-size/">QR code print size</a> for sizing. Add a logo on the Logo tab of the <a href="/">QR code generator</a>; the file stays on your device.</p>
''',
        sources=[E_EC],
    ),
    dict(
        lang='en', slug='vcard-qr-code', pair='myeongham-qr', tool='/vcard/', tool_label='Make a vCard QR code', checked=CHECKED,
        title='vCard QR Code for Business Cards: What Goes Inside | Staycode',
        description='A vCard QR code stores contact details as text; phones offer to add the contact when scanned. The lines stored, how fields add density, and print tips.',
        h1='vCard QR codes: what goes inside and how it saves',
        lead='A vCard QR code stores contact details such as your name, phone and email as <strong>vCard</strong> text inside the image. When someone scans it, the phone shows an "Add contact" screen and they tap Save. Every field you add makes the code denser, so for a business card, stick to the essentials: name, phone and email.',
        body='''
<h2>What exactly is stored?</h2>
<p>These are the lines the <a href="/vcard/">vCard QR code generator</a> produces for Alex Kim with a company, job title, mobile number and email. Lines are separated by CRLF.</p>
<table>
<thead><tr><th>Stored line</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td><code>BEGIN:VCARD</code> · <code>VERSION:3.0</code></td><td>Start of a vCard 3.0</td></tr>
<tr><td><code>N:Kim;Alex;;;</code></td><td>Last name; first name</td></tr>
<tr><td><code>FN:Alex Kim</code></td><td>Display name</td></tr>
<tr><td><code>ORG:Staycode Studio</code> · <code>TITLE:Owner</code></td><td>Company and job title</td></tr>
<tr><td><code>TEL;TYPE=CELL,VOICE:+15551234567</code></td><td>Mobile; spaces and dashes are removed</td></tr>
<tr><td><code>EMAIL;TYPE=INTERNET:alex@example.com</code></td><td>Email</td></tr>
<tr><td><code>END:VCARD</code></td><td>End</td></tr>
</tbody>
</table>
<p>Add more and you get <code>URL:</code> (website), <code>ADR;TYPE=WORK:</code> (address) and <code>NOTE:</code> lines. "Add another phone" adds work, home or fax numbers as separate lines such as <code>TEL;TYPE=WORK</code>. Commas and semicolons in your text are escaped with a backslash, lines longer than 75 bytes are folded as vCard requires, and accented or non-Latin names are stored as UTF-8.</p>

<h2>How much denser does each field make it?</h2>
<p>Module count grows with the byte count. Same person, more fields, error correction level M, generated with this site's encoder:</p>
<table>
<thead><tr><th>Fields</th><th>Bytes</th><th>Modules</th><th>One module at 2 cm (0.8 in)</th></tr></thead>
<tbody>
<tr><td>Name and mobile</td><td>97</td><td>41×41</td><td>about 0.49 mm</td></tr>
<tr><td>+ company, title, email</td><td>169</td><td>53×53</td><td>about 0.38 mm</td></tr>
<tr><td>+ work phone, website, address, note</td><td>305</td><td>69×69</td><td>about 0.29 mm</td></tr>
<tr><td>For comparison: a link to your contact page (URL code)</td><td>22</td><td>25×25</td><td>about 0.8 mm</td></tr>
</tbody>
</table>
<p>The full card is version 13, so the generator shows its "dense code" warning (it appears from version 10). For a small card, leave out the address and note, or build a contact page and put its link in a URL code. The trade-off with a URL code: the person has to open the page, and the "Add contact" screen does not appear by itself.</p>

<h2>What happens on the phone?</h2>
<p>When the phone recognizes a vCard, it opens an "Add contact" screen with name, phones, email, company, title, address and note filled into their own fields. Nothing is saved until the person scanning taps Save. The screen can look different depending on the phone and camera app, so scan your own code before printing to check every field lands in the right place. The <a href="/scan/">QR code scanner</a> also shows the fields a code contains.</p>

<h2>Printing it on a business card</h2>
<ul>
<li><strong>Size:</strong> a common rule of thumb is at least 2 cm (0.8 in) for close-up scans. Go bigger for a dense card, or cut fields. The full table is in <a href="/guide/qr-code-print-size/">QR code print size</a>.</li>
<li><strong>Files:</strong> give your printer SVG or PDF so it stays sharp at any size. PDF sizes refer to the pattern itself, without the quiet zone or frame.</li>
<li><strong>Color:</strong> to match your card, change the dot color and keep the background light. Check that the stamp says it scans.</li>
<li><strong>Trademark line:</strong> according to DENSO WAVE's FAQ (checked October 14, 2026), you do not need a trademark notice when you only print the code image on a business card, and commercial use needs no fee or license. The notice is only asked for when you use the words "QR Code".</li>
</ul>
<p>Contact details are processed in your browser only and are never kept in "Recent QR codes".</p>

<h2>vCard or a link?</h2>
<p>A vCard code works offline and saves the contact in one tap, which suits trade shows and printed cards. A link code stays small and lets you update details later on your own page, but needs a connection and an extra step to save. One option is to put the vCard on the printed card and the link on your website or email signature.</p>
''',
        sources=[E_FAQ, E_SIZE],
    ),
    dict(
        lang='en', slug='scan-qr-code-safely', pair='qr-ssing', tool='/scan/', tool_label='Open the QR code scanner', checked=CHECKED,
        title='How to Scan a QR Code Safely: Check the Link First | Staycode',
        description='QR scams send people to fake login or payment pages. Read the real domain before opening a scanned link: where to look and the warning signs.',
        h1='How to scan a QR code safely: check the link before you open it',
        lead='After you scan a QR code, do not tap straight through. Read <strong>the domain the link really goes to</strong> first. QR scams, sometimes called quishing, send people to fake pages that ask for logins or payment details, and Korea\'s government, for one, advises people to check the address before scanning. A few seconds of reading catches most of the obvious tricks.',
        body='''
<h2>Where do I look in the address?</h2>
<p>The part after <code>https://</code> and before the first <code>/</code> is where you are going, and the end of that part is the real domain. A familiar name at the front means nothing if the end is different. The <a href="/scan/">QR code scanner</a> shows that real domain in large type. These results come from running each address through the scanner's checks (example domains):</p>
<table>
<thead><tr><th>Scanned address</th><th>Where it really goes</th><th>Scanner warnings</th></tr></thead>
<tbody>
<tr><td><code>https://mybank.com.secure-login.example/verify</code></td><td><code>secure-login.example</code></td><td>Front dressed up as another site; login words</td></tr>
<tr><td><code>https://www.example.com@evil.example/</code></td><td><code>evil.example</code></td><td>Everything before @ is decoration; it goes to what follows</td></tr>
<tr><td><code>http://192.168.0.10/login</code></td><td><code>192.168.0.10</code></td><td>No encryption; IP instead of a domain; login words</td></tr>
<tr><td><code>https://bit.ly/3abcXYZ</code></td><td><code>bit.ly</code></td><td>Link shortener: the destination is hidden until opened</td></tr>
<tr><td><code>https://xn--80ak6aa92e.example/</code></td><td><code>xn--80ak6aa92e.example</code></td><td>Punycode: look-alike letters are possible</td></tr>
<tr><td><code>https://exa%6Dple.com/</code></td><td><code>example.com</code></td><td>%-encoded characters in the domain</td></tr>
<tr><td><code>https://example.com:8443/pay</code></td><td><code>example.com</code></td><td>Unusual port number</td></tr>
<tr><td><code>tel:+1-900-555-0100</code></td><td>Phone call</td><td>Premium-rate number</td></tr>
</tbody>
</table>

<h2>Which warning signs does the scanner check?</h2>
<ul>
<li>Unencrypted <code>http</code> links</li>
<li>Link shorteners, which hide the real destination</li>
<li>An IP address instead of a domain</li>
<li>Punycode (<code>xn--</code>) or %-encoded domains that can disguise letters</li>
<li>An <code>@</code> early in the address that hides the real domain</li>
<li>A piece that looks like another site's name placed in front of the real domain</li>
<li>Words like login, verify, account, password, payment or bank</li>
<li>Unusual port numbers and premium-rate phone numbers</li>
<li>Types that should never be opened, such as <code>javascript:</code> (no open button at all)</li>
</ul>
<p>The scanner never opens a link by itself. It opens in a new tab only when you tap "Open this link". The camera feed and uploaded images are read inside your browser and are not stored or sent.</p>

<h2>No warnings means it is safe?</h2>
<p>No. No warning only means there are no obvious signs. If an unfamiliar domain asks you to log in, pay or verify your identity, do not type anything on that page. Open the official app or type the official address yourself and check from there.</p>

<h2>A quick routine for every scan</h2>
<ol>
<li>Do not tap the first prompt. Read the address your phone or scanner shows, all the way to the end.</li>
<li>Check that the real domain matches the business or organization you expect.</li>
<li>If it is a short link and you cannot see the destination, skip it unless it really matters.</li>
<li>If the page asks for a login or payment, stop and use the official app instead.</li>
<li>Look at the code itself: if it is a sticker stuck over another printed code, take a second look.</li>
</ol>

<h2>If you are the one putting up the code</h2>
<p>Make it easy for people to trust what they see. A field guide on DEV Community recommends pointing your code at an intermediate address you control rather than at a final destination. Put a link on your own domain, with your business name in it, inside a static code, and people see your name instead of an unfamiliar short link. The difference between static and dynamic codes is explained in <a href="/guide/do-qr-codes-expire/">Do QR codes expire?</a></p>
''',
        sources=[E_GOV, E_DEV],
    ),
]
