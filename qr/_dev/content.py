"""오래QR / Staycode 화면 글 한 곳(build.py 가 읽는다). 글을 고치면 python3 qr/_dev/build.py.
- TX = HTML 틀 글, M = app.js 등 스크립트 글(페이지의 JSON 으로 넘어간다), PAGES = 페이지마다 제목·설명·H1·부제.
- '찍으면 ○○로 가요'처럼 화면의 약속 문장은 실제 동작만큼만 쓴다. 인쇄 크기 숫자는 facts.md 가 생기면 그 값과 맞춘다.
"""

BRAND = {'ko': '오래QR', 'en': 'Staycode'}
CONTACT = 'contact@lumenlab.page'
PARTNER = 'https://policies.google.com/technologies/partner-sites'
ADSET = 'https://adssettings.google.com/'
CFWA = 'https://www.cloudflare.com/web-analytics/'

# 머리 메뉴: (주소, 이름, 키)
NAV = {
    'ko': [('', '만들기', 'make'), ('wifi/', '와이파이', 'wifi'), ('vcard/', '명함', 'vcard'), ('bulk/', '대량', 'bulk'), ('scan/', '스캐너', 'scan'), ('guide/', '가이드', 'guide')],
    'en': [('', 'Generator', 'make'), ('wifi/', 'WiFi', 'wifi'), ('vcard/', 'vCard', 'vcard'), ('bulk/', 'Bulk', 'bulk'), ('scan/', 'Scanner', 'scan'), ('guide/', 'Guides', 'guide')],
}

TX = {
    'ko': dict(
        brand='오래QR', skip='본문으로 건너뛰기', nav_label='주요 메뉴', lang_other='English', lang_bar='This page is also in English.', lang_offer='English version', close='닫기',
        settings='화면 설정', fx_l='이펙트', fx=['끔', '가볍게', '화려하게'], theme_l='화면', theme=['밝게', '어둡게'], fx_reduced='기기에서 \'동작 줄이기\'가 켜져 있어 이펙트를 껐어요.',
        about='소개', privacy='개인정보 처리방침', contact='문의',
        trademark='QR 코드는 (주)덴소웨이브의 등록 상표입니다.',
        lumen='루멘랩의 다른 무료 도구', lumen_s='달력, 뽑기, 글자수, 타자, 급여 계산…',
        faq_h='자주 묻는 질문', how_h='이렇게 써요', why_h='왜 무료이고 만료가 없나요', std_h='기준', guides_h='더 읽을거리', guides_all='가이드 전체 보기',
        crumb_home='오래QR', crumb_guides='가이드', checked='마지막 확인', sources_h='출처', try_tool='QR코드 만들러 가기', swipe='표는 옆으로 밀어서 보세요',
        nojs='이 도구는 자바스크립트가 켜져 있어야 돼요.', home='처음으로', nf_title='찾는 페이지가 없어요', nf_lead='주소가 바뀌었거나 없는 페이지예요.',
        guide_empty='가이드 글을 준비하고 있어요. 그동안 도구를 써 보세요.', tools_h='다른 도구',
    ),
    'en': dict(
        brand='Staycode', skip='Skip to content', nav_label='Main menu', lang_other='한국어', lang_bar='이 페이지는 한국어로도 있어요.', lang_offer='한국어로 보기', close='Close',
        settings='Display settings', fx_l='Effects', fx=['Off', 'Light', 'Full'], theme_l='Theme', theme=['Light', 'Dark'], fx_reduced='Effects are off because "Reduce motion" is on in your device settings.',
        about='About', privacy='Privacy', contact='Contact',
        trademark='QR Code is a registered trademark of DENSO WAVE INCORPORATED.',
        lumen='More free tools from Lumen Lab', lumen_s='Calendar, picker, typing test, character counter…',
        faq_h='Questions people ask', how_h='How it works', why_h='Why it is free and never expires', std_h='Standards', guides_h='Read next', guides_all='All guides',
        crumb_home='Staycode', crumb_guides='Guides', checked='Last checked', sources_h='Sources', try_tool='Make a QR code', swipe='Swipe the table sideways',
        nojs='This tool needs JavaScript turned on.', home='Home', nf_title='Page not found', nf_lead='The address changed or the page does not exist.',
        guide_empty='Guides are on the way. In the meantime, try the tools.', tools_h='Other tools',
    ),
}

# 틀 문구 고르기(직접 쓸 수도 있다). glyphs.py 가 이 글자를 base.json 에 넣는다
FRAME_WORDS = {
    'ko': ['SCAN ME', '메뉴 보기', '찍어 보세요', '와이파이 연결', '리뷰 남기기', '주문하기', '예약하기', '쿠폰 받기'],
    'en': ['SCAN ME', 'SEE MENU', 'JOIN WI-FI', 'ORDER HERE', 'BOOK NOW', 'LEAVE A REVIEW', 'GET COUPON', 'FOLLOW US'],
}

TYPE_NAMES = {
    'ko': {'url': 'URL', 'text': '글', 'wifi': '와이파이', 'vcard': '연락처', 'email': '이메일', 'sms': '문자', 'tel': '전화', 'geo': '위치', 'event': '일정', 'whatsapp': 'WhatsApp'},
    'en': {'url': 'URL', 'text': 'Text', 'wifi': 'WiFi', 'vcard': 'Contact', 'email': 'Email', 'sms': 'SMS', 'tel': 'Phone', 'geo': 'Location', 'event': 'Event', 'whatsapp': 'WhatsApp'},
}

# 종류마다 '찍으면 일어나는 일'
HAPPEN = {
    'ko': {
        'url': '휴대폰 카메라가 이 주소를 띄우고, 누르면 바로 열려요.',
        'text': '휴대폰에 글이 그대로 보여요. 인터넷이 없어도 돼요.',
        'wifi': '대부분의 아이폰·안드로이드 카메라가 이 와이파이에 연결하라고 띄워요.',
        'vcard': '휴대폰이 \'연락처에 추가\'를 띄워요.',
        'email': '메일 앱이 받는 사람·제목·내용을 채운 채로 열려요. 보내기는 찍은 사람이 눌러요.',
        'sms': '문자 앱이 번호와 내용을 채운 채로 열려요. 보내기는 찍은 사람이 눌러요.',
        'tel': '전화 앱이 이 번호를 띄워요. 거는 건 찍은 사람이 눌러요.',
        'geo': '지도가 이 자리를 보여 줘요.',
        'event': '캘린더에 넣으라고 띄워요. 시각은 이 기기 시간대 기준으로 넣고, 다른 나라 휴대폰에서도 같은 순간이 되게 세계 표준시로 담아요. 기기에 따라 글로만 보일 수 있어요.',
        'whatsapp': 'WhatsApp이 이 번호와의 대화를 열고, 적어 둔 말을 채워 둬요.',
    },
    'en': {
        'url': 'The phone camera shows this link. One tap opens it.',
        'text': 'The text shows up on the phone as is. No internet needed.',
        'wifi': 'Most iPhone and Android cameras offer to join this network.',
        'vcard': 'The phone offers to add this contact.',
        'email': 'The mail app opens with the address, subject and message filled in. The person scanning taps Send.',
        'sms': 'The messages app opens with the number and text filled in. The person scanning taps Send.',
        'tel': 'The phone app shows this number. The person scanning places the call.',
        'geo': 'A map opens at this spot.',
        'event': 'The phone offers to add it to the calendar. Times are taken in this device\'s time zone and stored in UTC, so phones abroad get the same moment. Some phones show it as text only.',
        'whatsapp': 'WhatsApp opens a chat with this number, with your message ready.',
    },
}

# 입력 칸: (이름, 이름표, 종류, 더할 것)
# 종류: url text textarea select check tel email dt date num phones
FIELDS = {
    'ko': {
        'url': [('url', '주소(URL)', 'url', {'ph': 'example.com/menu'})],
        'text': [('text', '보여 줄 글', 'textarea', {'ph': '찍으면 보일 글을 적어요', 'rows': 4})],
        'wifi': [('ssid', '와이파이 이름(SSID)', 'text', {'ph': '공유기에 적힌 이름 그대로', 'ac': 'off'}),
                 ('password', '비밀번호', 'password', {'ph': '대소문자까지 똑같이', 'ac': 'off'}),
                 ('auth', '보안', 'select', {'opts': [('WPA', 'WPA/WPA2/WPA3 (보통 이것)'), ('WEP', 'WEP (오래된 공유기)'), ('nopass', '없음 (비밀번호 없음)')]}),
                 ('hidden', '숨긴 네트워크(이름이 목록에 안 보임)', 'check', {})],
        'vcard': [('last', '성', 'text', {'ac': 'family-name', 'half': 1}), ('first', '이름', 'text', {'ac': 'given-name', 'half': 1}),
                  ('org', '회사', 'text', {'ac': 'organization', 'half': 1}), ('title', '직함', 'text', {'ac': 'organization-title', 'half': 1}),
                  ('phones', '전화', 'phones', {}),
                  ('email', '이메일', 'email', {'ac': 'email', 'ph': 'name@example.com'}), ('web', '웹사이트', 'url', {'ph': 'example.com'}),
                  ('street', '주소', 'text', {'ac': 'street-address', 'more': 1}), ('city', '시·구', 'text', {'more': 1, 'half': 1}), ('region', '도·주', 'text', {'more': 1, 'half': 1}),
                  ('zip', '우편번호', 'text', {'more': 1, 'half': 1, 'im': 'numeric'}), ('country', '나라', 'text', {'more': 1, 'half': 1}),
                  ('note', '메모', 'textarea', {'more': 1, 'rows': 2})],
        'email': [('to', '받는 사람', 'email', {'ph': 'name@example.com'}), ('subject', '제목', 'text', {}), ('body', '내용', 'textarea', {'rows': 3})],
        'sms': [('phone', '받는 번호', 'tel', {'ph': '010-1234-5678'}), ('message', '내용', 'textarea', {'rows': 3})],
        'tel': [('phone', '전화번호', 'tel', {'ph': '02-123-4567'})],
        'geo': [('lat', '위도', 'num', {'ph': '37.5665', 'half': 1}), ('lng', '경도', 'num', {'ph': '126.9780', 'half': 1}),
                ('mode', '찍으면 열 것', 'select', {'opts': [('map', '구글 지도 링크 (어느 휴대폰이나)'), ('geo', 'geo: 좌표 (지도 앱이 고름)')]})],
        'event': [('title', '일정 이름', 'text', {}), ('allday', '하루 종일', 'check', {}),
                  ('start', '시작', 'dt', {'half': 1}), ('end', '끝', 'dt', {'half': 1}),
                  ('location', '장소', 'text', {}), ('desc', '설명', 'textarea', {'rows': 2})],
        'whatsapp': [('phone', '번호(나라 번호부터)', 'tel', {'ph': '+82 10-1234-5678'}), ('message', '미리 적어 둘 말', 'textarea', {'rows': 2})],
    },
    'en': {
        'url': [('url', 'Website URL', 'url', {'ph': 'example.com/menu'})],
        'text': [('text', 'Text to show', 'textarea', {'ph': 'What people see when they scan', 'rows': 4})],
        'wifi': [('ssid', 'Network name (SSID)', 'text', {'ph': 'Exactly as on your router', 'ac': 'off'}),
                 ('password', 'Password', 'password', {'ph': 'Case-sensitive', 'ac': 'off'}),
                 ('auth', 'Security', 'select', {'opts': [('WPA', 'WPA/WPA2/WPA3 (most networks)'), ('WEP', 'WEP (old routers)'), ('nopass', 'None (no password)')]}),
                 ('hidden', 'Hidden network (name not shown in the list)', 'check', {})],
        'vcard': [('first', 'First name', 'text', {'ac': 'given-name', 'half': 1}), ('last', 'Last name', 'text', {'ac': 'family-name', 'half': 1}),
                  ('org', 'Company', 'text', {'ac': 'organization', 'half': 1}), ('title', 'Job title', 'text', {'ac': 'organization-title', 'half': 1}),
                  ('phones', 'Phone', 'phones', {}),
                  ('email', 'Email', 'email', {'ac': 'email', 'ph': 'name@example.com'}), ('web', 'Website', 'url', {'ph': 'example.com'}),
                  ('street', 'Street', 'text', {'ac': 'street-address', 'more': 1}), ('city', 'City', 'text', {'more': 1, 'half': 1}), ('region', 'State', 'text', {'more': 1, 'half': 1}),
                  ('zip', 'ZIP code', 'text', {'more': 1, 'half': 1}), ('country', 'Country', 'text', {'more': 1, 'half': 1}),
                  ('note', 'Note', 'textarea', {'more': 1, 'rows': 2})],
        'email': [('to', 'To', 'email', {'ph': 'name@example.com'}), ('subject', 'Subject', 'text', {}), ('body', 'Message', 'textarea', {'rows': 3})],
        'sms': [('phone', 'Phone number', 'tel', {'ph': '+1 555 123 4567'}), ('message', 'Message', 'textarea', {'rows': 3})],
        'tel': [('phone', 'Phone number', 'tel', {'ph': '+1 555 123 4567'})],
        'geo': [('lat', 'Latitude', 'num', {'ph': '40.7128', 'half': 1}), ('lng', 'Longitude', 'num', {'ph': '-74.0060', 'half': 1}),
                ('mode', 'Open with', 'select', {'opts': [('map', 'Google Maps link (works on any phone)'), ('geo', 'geo: coordinates (phone picks a map app)')]})],
        'event': [('title', 'Event name', 'text', {}), ('allday', 'All day', 'check', {}),
                  ('start', 'Starts', 'dt', {'half': 1}), ('end', 'Ends', 'dt', {'half': 1}),
                  ('location', 'Location', 'text', {}), ('desc', 'Description', 'textarea', {'rows': 2})],
        'whatsapp': [('phone', 'Number (with country code)', 'tel', {'ph': '+1 555 123 4567'}), ('message', 'Pre-filled message', 'textarea', {'rows': 2})],
    },
}

UI = {
    'ko': dict(
        type_l='무엇을 담을까요', content_h='내용', preview_h='미리보기', design_h='꾸미기',
        utm_sum='UTM 꼬리표 (찍힌 수 보기)', utm_on='주소에 UTM 꼬리표 붙이기', utm_src='utm_source', utm_med='utm_medium', utm_camp='utm_campaign', utm_camp_ph='예: 2026-가을-전단',
        utm_note='찍고 들어온 방문은 내 구글 애널리틱스·네이버 애널리틱스에서 따로 보여요. 이 사이트는 찍힌 수를 세지 않아요.',
        more_fields='주소·메모 더 넣기', add_phone='전화 하나 더', remove='빼기', phone_types=[('cell', '휴대폰'), ('work', '회사'), ('home', '집'), ('fax', '팩스')],
        example='예시', example_note='내용을 넣으면 이 자리에 내 QR이 나와요.',
        presets_h='꾸밈 세트', presets_note='하나를 누르면 모양·색·틀이 한꺼번에 바뀌어요.',
        tabs=[('shape', '모양'), ('color', '색'), ('logo', '로고'), ('frame', '틀'), ('adv', '세부 설정'), ('mine', '내 꾸밈')],
        dots_l='점 모양', eyeo_l='눈 바깥', eyei_l='눈 안',
        dots=['네모', '둥근 이음', '점', '잎', '타일', '가로 줄', '세로 줄', '다이아'],
        eyeo=['네모', '둥근 네모', '동그라미', '잎', '물방울', '깎은 모서리'],
        eyei=['네모', '둥근 네모', '동그라미', '잎', '물방울', '다이아', '깎은 모서리'],
        fill_l='점 색', fill=['한 색', '그라데이션(선)', '그라데이션(원)'], fg_l='색', fg2_l='끝 색', angle_l='방향', eyecol_l='눈 색 따로', eyeout_l='눈 바깥 색', eyein_l='눈 안 색',
        bg_l='바탕색', transparent_l='바탕 투명(PNG·SVG)', swap='점·바탕 색 바꾸기',
        logo_l='로고 넣기', logo_pick='내 파일에서 고르기', logo_note='PNG·JPG·SVG. 이 기기 안에서만 써요.', logo_size='로고 크기', logo_clear='로고 뒤 점 비우기', logo_plate='로고 뒤 바탕 깔기', logo_rm='로고 빼기',
        logo_ecl='로고를 넣어서 오류 복원을 H(30%)로 올렸어요.',
        frame_l='틀(스티커 모양)', frames=['없음', '아래 띠', '위 띠', '알약', '말풍선', '입장권', '동그라미', '휴대폰', '모서리', '꼬리표'],
        ftext_l='틀 문구', ftext_ph='직접 쓰기', fcol_l='틀 색', ftcol_l='글자색',
        ecl_l='오류 복원', ecl=[('L', 'L', '약 7%'), ('M', 'M', '약 15%'), ('Q', 'Q', '약 25%'), ('H', 'H', '약 30%')],
        ecl_note='높을수록 더럽거나 가려져도 읽히지만 QR이 촘촘해져요. 로고를 넣으면 H를 권해요.',
        margin_l='둘레 여백', margin_unit='칸', margin_note='4칸이 기본이에요. 줄이면 붙이는 곳 무늬 때문에 안 읽힐 수 있어요.',
        mine_l='이 꾸밈 저장', mine_ph='이름 (예: 우리 가게)', mine_save='저장', mine_empty='저장한 꾸밈이 없어요. 꾸민 뒤 이름을 붙여 저장하면 이 브라우저에 남아요(대량 만들기에서도 써요).',
        mine_del='지우기', mine_note='이 브라우저에만 저장돼요.',
        save_png='PNG 저장', size_l='크기', fmt_l='다른 파일', jpg='JPG', svg='SVG', pdf='PDF', eps='EPS', copy='그림 복사', share='공유',
        trust='가입·워터마크 없음 · 상업용 OK · 만료 없음',
        pdf_l='PDF·EPS 모양', pdf_a4='A4 가운데', pdf_fit='그림 크기 그대로', pdf_cm='QR 무늬 크기(여백·틀 빼고)',
        sheet_sum='스티커 시트 인쇄 (A4에 여러 장)', sheet_cm='QR 무늬 크기(여백·틀 빼고)', sheet_size='스티커 한 장 {w}×{h}mm', sheet_marks='재단선', sheet_pdf='시트 PDF 받기', sheet_print='바로 인쇄',
        sheet_count='{n}장 ({c}×{r})', sheet_none='A4에 안 들어가는 크기예요.',
        recent_h='최근에 만든 QR', recent_note='이 브라우저에만 남아요. 연락처·와이파이 QR은 개인정보가 있어 여기에 남기지 않아요.', recent_clear='모두 지우기',
        sticky_save='PNG 저장',
    ),
    'en': dict(
        type_l='What should it hold?', content_h='Content', preview_h='Preview', design_h='Design',
        utm_sum='UTM tags (count scans)', utm_on='Add UTM tags to the link', utm_src='utm_source', utm_med='utm_medium', utm_camp='utm_campaign', utm_camp_ph='e.g. fall-flyer-2026',
        utm_note='Visits from scans show up separately in your own Google Analytics or Naver Analytics. This site does not count scans.',
        more_fields='Add address and note', add_phone='Add another phone', remove='Remove', phone_types=[('cell', 'Mobile'), ('work', 'Work'), ('home', 'Home'), ('fax', 'Fax')],
        example='Example', example_note='Your QR code appears here once you enter something.',
        presets_h='Design presets', presets_note='Tap one to change shape, colors and frame at once.',
        tabs=[('shape', 'Shape'), ('color', 'Color'), ('logo', 'Logo'), ('frame', 'Frame'), ('adv', 'Advanced'), ('mine', 'My designs')],
        dots_l='Dots', eyeo_l='Eye frame', eyei_l='Eye ball',
        dots=['Square', 'Rounded', 'Dots', 'Leaf', 'Tile', 'Horizontal', 'Vertical', 'Diamond'],
        eyeo=['Square', 'Rounded', 'Circle', 'Leaf', 'Drop', 'Cut corner'],
        eyei=['Square', 'Rounded', 'Circle', 'Leaf', 'Drop', 'Diamond', 'Cut corner'],
        fill_l='Dot color', fill=['Solid', 'Linear gradient', 'Radial gradient'], fg_l='Color', fg2_l='End color', angle_l='Angle', eyecol_l='Separate eye color', eyeout_l='Eye frame color', eyein_l='Eye ball color',
        bg_l='Background', transparent_l='Transparent background (PNG, SVG)', swap='Swap dot and background colors',
        logo_l='Add a logo', logo_pick='Choose a file', logo_note='PNG, JPG or SVG. It stays on this device.', logo_size='Logo size', logo_clear='Clear dots behind the logo', logo_plate='Put a background under the logo', logo_rm='Remove logo',
        logo_ecl='Error correction raised to H (30%) because you added a logo.',
        frame_l='Frame (sticker shape)', frames=['None', 'Bottom band', 'Top band', 'Pill', 'Speech bubble', 'Ticket', 'Circle', 'Phone', 'Corners', 'Tag'],
        ftext_l='Frame text', ftext_ph='Type your own', fcol_l='Frame color', ftcol_l='Text color',
        ecl_l='Error correction', ecl=[('L', 'L', 'about 7%'), ('M', 'M', 'about 15%'), ('Q', 'Q', 'about 25%'), ('H', 'H', 'about 30%')],
        ecl_note='Higher levels survive dirt and covering, but make the code denser. H is recommended with a logo.',
        margin_l='Quiet zone', margin_unit='modules', margin_note='4 modules is the standard. Less can fail on busy surfaces.',
        mine_l='Save this design', mine_ph='Name (e.g. My shop)', mine_save='Save', mine_empty='No saved designs yet. Name a design and save it to keep it in this browser (Bulk can use it too).',
        mine_del='Delete', mine_note='Saved in this browser only.',
        save_png='Download PNG', size_l='Size', fmt_l='Other files', jpg='JPG', svg='SVG', pdf='PDF', eps='EPS', copy='Copy image', share='Share',
        trust='No sign-up or watermark · Commercial use OK · Never expires',
        pdf_l='PDF and EPS layout', pdf_a4='Centered on A4', pdf_fit='Exact size', pdf_cm='QR pattern size (without quiet zone or frame)',
        sheet_sum='Print a sticker sheet (many on A4)', sheet_cm='QR pattern size (without quiet zone or frame)', sheet_size='each sticker {w}×{h} mm', sheet_marks='Cut marks', sheet_pdf='Download sheet PDF', sheet_print='Print now',
        sheet_count='{n} stickers ({c}×{r})', sheet_none='Too big for A4.',
        recent_h='Recent QR codes', recent_note='Kept in this browser only. Contact and WiFi codes are never kept here, because they hold personal details.', recent_clear='Clear all',
        sticky_save='Download PNG',
    ),
}

# 스크립트 글(앱이 #qr-cfg JSON 으로 받는다). 알림 코드는 qr-payload.js 와 같다
M = {
    'ko': dict(
        err=dict(
            empty='비어 있어요.', url_space='주소에 빈칸이 있어요. 빈칸을 지워 주세요.', url_scheme='{s}: 로 시작하는 주소는 넣지 않아요. http(s) 주소를 넣어 주세요.',
            url_bad='주소 모양이 아니에요. 예: example.com/menu', url_nodot='도메인에 점(.)이 없어요. 예: example.com',
            wifi_nopass='비밀번호가 비어 있어요. 비밀번호가 없는 와이파이면 보안을 \'없음\'으로 골라 주세요.',
            vcard_name='이름이나 회사 가운데 하나는 넣어 주세요.', phone_bad='전화번호에는 숫자, +, -, 빈칸, 괄호만 쓸 수 있어요.', phone_len='전화번호 자릿수가 너무 짧거나 길어요.',
            email_bad='이메일 모양이 아니에요. 예: name@example.com', num_bad='숫자로 넣어 주세요.', lat_bad='숫자로 넣어 주세요. 예: 37.5665', lng_bad='숫자로 넣어 주세요. 예: 126.9780',
            lat_range='위도는 -90에서 90 사이예요.', lng_range='경도는 -180에서 180 사이예요.', date_bad='날짜를 다시 골라 주세요.', time_need='시작 시각을 넣거나 \'하루 종일\'을 켜 주세요.',
            end_before='끝이 시작보다 앞이에요.', wa_country='나라 번호부터 넣어 주세요. 예: 010-1234-5678 → +82 10-1234-5678',
            too_long='너무 길어 QR에 담을 수 없어요({b}바이트, 오류 복원 {e}에서는 최대 {m}바이트). 오류 복원을 낮추거나 내용을 줄여 주세요.',
        ),
        warn=dict(
            url_added='앞에 https:// 를 붙였어요.', url_http='http 주소는 암호화가 없어 휴대폰이 \'안전하지 않음\'을 띄울 수 있어요. https가 되는 주소면 https로 바꿔 주세요.',
            text_url='주소 같아요. \'URL\' 종류로 만들면 휴대폰이 바로 열 수 있게 띄워요.', ssid_long='이름이 32바이트를 넘어요. 공유기 이름과 똑같은지 확인해 주세요.',
            ssid_space='이름 앞뒤에 빈칸이 있어요. 공유기 이름에 빈칸이 없다면 지워 주세요.', wpa_len='WPA 비밀번호는 8~63자예요. 공유기 비밀번호와 똑같은지 확인해 주세요.',
            wep_len='WEP 비밀번호는 보통 5·13자(또는 16진수 10·26자리)예요.', end_same='시작과 끝이 같아요.',
        ),
        dense='QR이 촘촘해요: 버전 {v}, {n}×{n}칸. 작게 인쇄하면 찍기 어려워요. 줄이는 법: 더 짧은 주소 쓰기, 오류 복원 한 단계 낮추기, 글 줄이기.',
        info='버전 {v} · {n}×{n}칸 · 오류 복원 {e} · {b}바이트',
        go_url='찍으면 바로 <b>{t}</b>(으)로 가요.', go_wifi='찍으면 바로 와이파이 <b>{t}</b>에 연결하라고 떠요.', go_other='찍으면 그림 안에 든 내용(<b>{t}</b>)이 바로 떠요.',
        go_tail='이 사이트를 거치지 않아서 멈출 일이 없어요.',
        print_tip='QR 무늬(여백 빼고) 한 변은 가장 작게 2cm쯤, 찍는 거리의 10분의 1쯤이 무난해요(1m 떨어져 찍으면 10cm쯤). PDF·시트의 크기도 이 무늬 크기예요.',
        stamp=dict(wait='확인 중', pass_='통과', warn='주의', fail='안 읽힘', none='확인 못 함'),
        v=dict(
            title='찍힘 확인', wait='방금 만든 그림을 읽어 보는 중이에요.', pass_='방금 만든 그림을 읽어 보니 넣은 내용과 똑같아요.',
            fail='방금 만든 그림을 읽지 못했어요.', mismatch='읽은 내용이 넣은 내용과 달라요. 모양을 기본 쪽으로 돌려 보세요.',
            none='이 브라우저에서는 확인을 못 했어요. 저장한 뒤 휴대폰으로 한 번 찍어 보세요.',
            fail_hint='점 모양을 \'네모\'로 바꾸거나, 로고를 줄이거나, 색을 더 진하게 해 보세요.',
            contrast='점 색 {a}와 바탕 {b}의 밝기 대비가 {c}:1이에요(휴대폰은 밝기만 봐요). 4:1이 넘게 점을 더 진하게(또는 바탕을 더 밝게) 해 보세요.',
            contrast_grad='그라데이션에서 가장 밝은 점 색 {a}와 바탕 {b}의 밝기 대비가 {c}:1이에요. 끝 색을 더 진하게 해 보세요.',
            inverted='점 색 {a}가 바탕 {b}보다 밝아요. 밝은 점·어두운 바탕은 휴대폰 카메라 대부분이 못 읽어요. 점을 바탕보다 어둡게 바꿔 보세요.',
            eye='눈 색 {a}와 바탕 {b}의 밝기 대비가 {c}:1이에요. 눈 색을 더 진하게 해 보세요.',
            eye_inverted='눈 색 {a}가 바탕 {b}보다 밝아요. 눈은 바탕보다 어둡게 해 주세요.',
            frame_margin='틀이 무늬에 바로 붙으면 안 찍혀서 둘레 여백을 {m}칸으로 늘렸어요.',
            unsure='이 브라우저의 판독기로는 못 읽었어요(모양에 따라 판독기마다 달라요). 휴대폰으로 한 번 찍어 보고, 안 되면 아래처럼 바꿔 보세요.',
            read_warn='이 브라우저 판독기로는 읽혔지만, 아래 이유로 휴대폰에 따라 안 찍힐 수 있어요. 고치면 다시 확인해요.',
            rule_fail='이 색 조합은 휴대폰 카메라가 무늬를 구별하기 어려워요. 아래처럼 고쳐 주세요.',
            logo_big='로고가 커서 복원 여유가 거의 없어요. 로고를 조금 줄여 보세요.', logo_ecl='로고가 있을 땐 오류 복원을 H로 올려 보세요.',
            margin='둘레 여백이 {m}칸이에요. 4칸보다 좁으면 붙이는 곳 무늬 때문에 안 읽힐 수 있어요. 여백을 4칸으로 돌려 보세요.',
            transparent='바탕이 투명해요. 밝은 곳에 붙여야 찍혀요. 확인은 흰 바탕 위에서 했어요.',
            text_missing='틀 문구의 {c} 글자는 그릴 수 없어 뺐어요.',
            how='어떻게 확인하나요?', how_body='저장할 그림과 같은 그림을 이 브라우저 안에서 QR 판독기로 다시 읽어, 넣은 내용과 글자 하나까지 같은지 봐요. 인쇄 상태·조명·카메라에 따라 실제 결과는 다를 수 있어요.',
        ),
        saved='저장했어요', copied='복사했어요', copy_fail='이 브라우저에서는 그림 복사가 안 돼요. PNG로 저장해 주세요.',
        logo_bad='그림 파일을 열 수 없어요. PNG·JPG·SVG를 골라 주세요.', logo_big_file='파일이 너무 커요(10MB까지).',
        mine_saved='\'{n}\' 꾸밈을 저장했어요.', mine_full='저장 공간이 모자라요. 오래된 꾸밈을 지워 주세요.', mine_noname='이름을 붙여 주세요.', mine_deleted='\'{n}\' 꾸밈을 지웠어요.',
        mine_apply='쓰기', fx_lowered='이 기기가 느려 보여 이펙트를 한 단계 줄였어요.',
        need_content='먼저 내용을 넣어 주세요.', angle_unit='°', preset_applied='\'{n}\' 꾸밈으로 바꿨어요.',
        recent_apply='다시 쓰기', recent_changed='저장했던 것과 내용이 달라졌어요. 칸을 확인해 주세요.',
    ),
    'en': dict(
        err=dict(
            empty='This is empty.', url_space='The URL has a space in it. Please remove it.', url_scheme='Links starting with {s}: are not supported. Use an http(s) link.',
            url_bad='That does not look like a URL. Example: example.com/menu', url_nodot='The domain has no dot. Example: example.com',
            wifi_nopass='The password is empty. For an open network, set Security to "None".',
            vcard_name='Enter a name or a company.', phone_bad='Use only digits, +, -, spaces and parentheses.', phone_len='That phone number is too short or too long.',
            email_bad='That does not look like an email address. Example: name@example.com', num_bad='Enter a number.', lat_bad='Enter a number. Example: 40.7128', lng_bad='Enter a number. Example: -74.0060',
            lat_range='Latitude must be between -90 and 90.', lng_range='Longitude must be between -180 and 180.', date_bad='Please pick the date again.', time_need='Add a start time or turn on "All day".',
            end_before='The end is before the start.', wa_country='Start with the country code. Example: +1 555 123 4567',
            too_long='Too long for a QR code ({b} bytes; error correction {e} holds up to {m}). Lower the error correction or shorten the content.',
        ),
        warn=dict(
            url_added='Added https:// in front.', url_http='http links are not encrypted, so phones may show "Not secure". If the site supports https, switch to it.',
            text_url='This looks like a link. Choose the URL type so phones offer to open it.', ssid_long='The name is over 32 bytes. Make sure it matches your router exactly.',
            ssid_space='The name starts or ends with a space. Remove it unless your network name really has one.', wpa_len='WPA passwords are 8 to 63 characters. Make sure it matches your router.',
            wep_len='WEP keys are usually 5 or 13 characters (or 10 or 26 hex digits).', end_same='Start and end are the same.',
        ),
        dense='Dense code: version {v}, {n}×{n} modules. Small prints get hard to scan. To simplify: use a shorter link, lower the error correction one step, or cut the text.',
        info='Version {v} · {n}×{n} modules · error correction {e} · {b} bytes',
        go_url='Scanning goes straight to <b>{t}</b>.', go_wifi='Scanning offers to join <b>{t}</b> right away.', go_other='Scanning shows what is inside the code (<b>{t}</b>) right away.',
        go_tail='It does not pass through this site, so there is nothing that can stop it.',
        print_tip='Make the QR pattern itself (without the quiet zone) at least about 2 cm (0.8 in) wide, and about one tenth of the scanning distance (about 10 cm from 1 m away). PDF and sheet sizes use this pattern size too.',
        stamp=dict(wait='Checking', pass_='Scans', warn='Check', fail='No scan', none='Not checked'),
        v=dict(
            title='Scan check', wait='Reading the image you just made…', pass_='We read the image you just made and it matches what you entered.',
            fail='We could not read the image you just made.', mismatch='What we read differs from what you entered. Try simpler shapes.',
            none='This browser could not run the check. Scan the saved file with your phone once.',
            fail_hint='Try Square dots, a smaller logo, or darker colors.',
            contrast='Brightness contrast between dot color {a} and background {b} is {c}:1 (phones only look at brightness). Make the dots darker or the background lighter to get above 4:1.',
            contrast_grad='The lightest dot color in the gradient, {a}, has {c}:1 brightness contrast with the background {b}. Make the end color darker.',
            inverted='Dot color {a} is lighter than the background {b}. Most phone cameras cannot read light dots on a dark background. Make the dots darker than the background.',
            eye='Brightness contrast between eye color {a} and background {b} is {c}:1. Make the eye color darker.',
            eye_inverted='Eye color {a} is lighter than the background {b}. Make the eyes darker than the background.',
            frame_margin='The quiet zone was widened to {m} modules, because a frame touching the pattern stops it from scanning.',
            unsure='The decoder in this browser could not read it (decoders differ by shape). Scan it once with your phone; if it fails, try the change below.',
            read_warn='This browser could read it, but some phones may not, for the reasons below. Fix them and it checks again.',
            rule_fail='Phone cameras will have trouble telling the dots from the background with these colors. Fix it as below.',
            logo_big='The logo leaves almost no room for error correction. Make it a bit smaller.', logo_ecl='With a logo, raise error correction to H.',
            margin='The quiet zone is {m} modules. Under 4, busy surfaces can stop it from scanning. Set it back to 4.',
            transparent='The background is transparent. Stick it on a light surface. The check used a white background.',
            text_missing='We could not draw {c} in the frame text, so it was left out.',
            how='How does the check work?', how_body='We take the same image you download and read it again with a QR decoder in this browser, then compare it with your content character by character. Real results also depend on print quality, light and camera.',
        ),
        saved='Saved', copied='Copied', copy_fail='This browser cannot copy images. Please download the PNG.',
        logo_bad='Could not open that image. Choose a PNG, JPG or SVG.', logo_big_file='That file is too large (10 MB max).',
        mine_saved='Saved "{n}".', mine_full='Out of storage space. Delete an old design first.', mine_noname='Give it a name first.', mine_deleted='Deleted "{n}".',
        mine_apply='Use', fx_lowered='This device seems slow, so effects were turned down one step.',
        need_content='Enter some content first.', angle_unit='°', preset_applied='Switched to "{n}".',
        recent_apply='Use again', recent_changed='The content differs from what was saved. Please check the fields.',
    ),
}

# ---------- 페이지 ----------
PAGES = {
    ('ko', 'make'): dict(path='', type='url',
        title='QR코드 만들기 — 무료, 만료 없는 QR 생성기 | 오래QR',
        desc='가입 없이 무료로 QR코드를 만들어요. 로고·색·틀까지 꾸미고 찍히는지 바로 확인해요. 만든 QR은 이 사이트를 거치지 않아 멈추지 않아요. PNG·SVG·PDF·EPS 저장.',
        h1='QR코드 만들기', sub='가입·체험 기간 없이, 로고·틀까지 넣고 찍히는지 바로 확인해요. 만든 QR은 이 사이트를 거치지 않아 멈추지 않아요.',
        app='오래QR QR코드 만들기'),
    ('en', 'make'): dict(path='', type='url',
        title='Free QR Code Generator — No Sign-up, Never Expires | Staycode',
        desc='Make a free QR code with your logo, colors and a frame, then check that it scans. It points straight to your link, so it never expires. PNG, SVG, PDF and EPS.',
        h1='Free QR Code Generator', sub='No sign-up, no trial. Add a logo and a frame and see right away that it scans. Your code points straight to your link, not through this site, so it never stops working.',
        app='Staycode QR Code Generator'),
    ('ko', 'wifi'): dict(path='wifi/', type='wifi',
        title='와이파이 QR코드 만들기 — 찍으면 바로 연결 | 오래QR',
        desc='와이파이 이름과 비밀번호를 넣으면 손님이 카메라로 찍어 바로 연결하는 QR코드가 나와요. 비밀번호는 이 기기 안에서만 처리하고, 스티커로 꾸며 인쇄해요.',
        h1='와이파이 QR코드 만들기', sub='이름과 비밀번호만 넣으면 돼요. 비밀번호는 이 기기 밖으로 나가지 않고 주소창에도 남지 않아요.',
        app='오래QR 와이파이 QR코드 만들기'),
    ('en', 'wifi'): dict(path='wifi/', type='wifi',
        title='WiFi QR Code Generator — Scan to Join, Free | Staycode',
        desc='Turn your WiFi name and password into a QR code guests scan to join. The password is processed on this device only. Style it as a sticker and print it.',
        h1='WiFi QR Code Generator', sub='Enter the network name and password. The password never leaves this device and never goes into the page address.',
        app='Staycode WiFi QR Code Generator'),
    ('ko', 'vcard'): dict(path='vcard/', type='vcard',
        title='QR 명함 만들기 — 연락처 QR코드(vCard) 무료 | 오래QR',
        desc='이름·전화·이메일·회사를 넣으면 찍자마자 휴대폰 연락처에 저장되는 QR코드가 나와요. 한글 이름도 그대로, 명함 인쇄용 SVG·PDF로 받아요.',
        h1='연락처(명함) QR코드 만들기', sub='찍으면 휴대폰이 바로 \'연락처에 추가\'를 띄워요. 회사·직함·주소까지 한글 그대로 담겨요.',
        app='오래QR 연락처 QR코드 만들기'),
    ('en', 'vcard'): dict(path='vcard/', type='vcard',
        title='vCard QR Code Generator — Free Business Card QR | Staycode',
        desc='Put your name, phone, email and company in a QR code that saves straight to contacts when scanned. Download print-ready SVG or PDF for business cards.',
        h1='vCard QR Code Generator', sub='Scanning it opens "Add contact" on the phone. Company, job title and address included.',
        app='Staycode vCard QR Code Generator'),
    ('ko', 'bulk'): dict(path='bulk/',
        title='QR코드 대량 만들기 — 목록·CSV로 한 번에 ZIP | 오래QR',
        desc='주소 목록이나 CSV 파일로 QR코드를 최대 1,000개까지 한 번에 만들어 ZIP으로 받아요. 줄마다 찍히는지 확인하고, 같은 꾸밈을 모두에 입혀요. 가입 없이 무료.',
        h1='QR코드 대량 만들기', sub='한 줄에 하나씩 붙여 넣거나 CSV를 올리면, 같은 꾸밈으로 최대 1,000개를 만들고 줄마다 찍히는지 확인해요.',
        app='오래QR QR코드 대량 만들기'),
    ('en', 'bulk'): dict(path='bulk/',
        title='Bulk QR Code Generator — CSV to ZIP, Free | Staycode',
        desc='Paste a list or upload a CSV to make up to 1,000 QR codes at once and download them as a ZIP. Every code is test-scanned. One design for all. Free, no sign-up.',
        h1='Bulk QR Code Generator', sub='Paste one item per line or upload a CSV. Up to 1,000 codes in the same design, each one test-scanned.',
        app='Staycode Bulk QR Code Generator'),
    ('ko', 'scan'): dict(path='scan/',
        title='QR코드 스캐너 — 열기 전에 주소부터 확인 | 오래QR',
        desc='카메라나 사진으로 QR코드를 읽고, 열기 전에 실제 주소와 위험 신호(짧은 주소·암호화 없음·이상한 도메인)를 먼저 보여 줘요. 화면은 이 기기 안에서만 처리해요.',
        h1='QR코드 스캐너', sub='읽은 주소를 바로 열지 않고 어디로 가는지 먼저 크게 보여 줘요. 카메라 화면은 이 기기 안에서만 처리해요.',
        app='오래QR QR코드 스캐너'),
    ('en', 'scan'): dict(path='scan/',
        title='QR Code Scanner Online — Check Links Before Opening | Staycode',
        desc='Scan a QR code with your camera or from a photo. See the real address and warning signs (short links, no encryption, odd domains) before opening anything.',
        h1='QR Code Scanner', sub='Nothing opens by itself. You see where the code goes first, in big letters. The camera image stays on this device.',
        app='Staycode QR Code Scanner'),
}

GUIDE_INDEX = {
    'ko': dict(title='QR코드 가이드 — 만료·인쇄·와이파이·명함 | 오래QR', desc='QR코드가 만료되는지, 인쇄는 몇 cm가 좋은지, 와이파이·명함 QR은 어떻게 만드는지 확인한 내용으로 정리한 글이에요.',
               h1='QR코드 가이드', lead='QR코드를 만들고 인쇄하기 전에 궁금한 것들을, 출처와 확인한 날을 적어 정리했어요.'),
    'en': dict(title='QR Code Guides — Expiry, Printing, WiFi | Staycode', desc='Plain answers about QR codes: whether they expire, how big to print them, and how WiFi and vCard codes work, with sources.',
               h1='QR code guides', lead='What to know before you make and print a QR code, with sources and the date we last checked.'),
}

# 도구 페이지 아래 칸
HOW = {
    'ko': [('내용 넣기', '주소·와이파이·연락처 같은 종류를 고르고 칸을 채워요. 넣는 대로 미리보기가 바뀌어요.'),
           ('꾸미기', '꾸밈 세트 하나를 누르면 모양·색·틀이 한꺼번에 바뀌어요. 로고와 틀 문구도 넣을 수 있어요.'),
           ('확인하고 저장', '스티커 위 도장이 \'통과\'인지 보고 PNG·SVG·PDF·EPS로 받아요. 스티커 시트로 여러 장 인쇄도 돼요.')],
    'en': [('Enter the content', 'Pick a type such as URL, WiFi or contact and fill in the fields. The preview updates as you type.'),
           ('Style it', 'Tap a preset to change shape, colors and frame at once. Add your logo and frame text if you like.'),
           ('Check and download', 'Make sure the stamp on the sticker says it scans, then download PNG, SVG, PDF or EPS, or print a sticker sheet.')],
}
WHY = {
    'ko': '<p>QR코드는 두 가지예요. <b>정적 QR</b>은 넣은 주소를 그림 안에 그대로 담아서, 찍으면 휴대폰이 그 주소로 바로 가요. 중간에 거치는 서버가 없으니 끌 사람도 없어요. <b>동적 QR</b>은 업체의 짧은 주소를 담아 찍을 때마다 그 업체 서버를 거쳐요. 그래서 나중에 주소를 바꾸고 찍힌 수를 셀 수 있지만, 구독이 끝나면 멈출 수 있어요.</p><p>오래QR은 정적 QR만 만들어요. 그래서 만료가 없고, 이 사이트는 광고로 운영해 돈을 받지 않아요. 대신 인쇄한 뒤에는 주소를 바꿀 수 없으니, 바뀔 수 있는 내용은 내가 관리하는 페이지 주소를 넣으세요.</p>',
    'en': '<p>There are two kinds of QR code. A <b>static</b> code holds your link inside the image, so the phone goes straight there. There is no server in between, so nobody can switch it off. A <b>dynamic</b> code holds a short link of the provider and passes through their server on every scan. That lets you change the link and count scans later, but it can stop working when the subscription ends.</p><p>Staycode only makes static codes. They never expire, and the site is paid for by ads, not by you. The trade-off: you cannot change the link after printing, so for content that may change, point the code at a page you control.</p>',
}
STD = {
    'ko': '<ul><li>ISO/IEC 18004 모델 2 QR 코드, 버전 1~40, 바이트 모드(UTF-8)로 담아요. 한글·이모지도 그대로 들어가요.</li><li>오류 복원: L 약 7% · M 약 15% · Q 약 25% · H 약 30%까지 가려지거나 더러워져도 읽혀요(로고가 가리는 칸도 여기서 빠져요).</li><li>둘레 여백(조용한 칸)은 4칸이 기본이에요.</li><li>와이파이는 <code>WIFI:</code> 형식, 연락처는 vCard 3.0, 일정은 iCalendar <code>VEVENT</code>, 메일은 <code>mailto:</code>, 문자는 <code>SMSTO:</code>로 담아요.</li></ul>',
    'en': '<ul><li>ISO/IEC 18004 Model 2 QR codes, versions 1 to 40, byte mode (UTF-8). Accents, Korean and emoji work.</li><li>Error correction: L about 7% · M about 15% · Q about 25% · H about 30% of the code can be dirty or covered and it still reads (a logo uses up part of this).</li><li>The quiet zone around the code is 4 modules by default.</li><li>WiFi uses the <code>WIFI:</code> format, contacts vCard 3.0, events iCalendar <code>VEVENT</code>, email <code>mailto:</code> and SMS <code>SMSTO:</code>.</li></ul>',
}

FAQ = {
    ('ko', 'make'): [
        ('여기서 만든 QR코드는 만료되나요?', '아니요. 여기서 만드는 QR은 정적 QR이라 넣은 주소가 그림 안에 그대로 들어가요. 찍으면 휴대폰이 그 주소로 바로 가고 이 사이트를 거치지 않아서, 이 사이트가 없어져도 계속 찍혀요. 다만 넣은 주소의 페이지가 사라지면 그 페이지는 열리지 않아요.'),
        ('인쇄한 뒤에 주소를 바꿀 수 있나요?', '바꿀 수 없어요. 바뀔 수 있는 내용이면 내가 관리하는 페이지(내 사이트·블로그 글) 주소를 넣고, 나중에 그 페이지 내용을 바꾸세요.'),
        ('정말 무료인가요? 가게에서 써도 되나요?', '네. 가입·결제·워터마크가 없고 메뉴판·전단·포장 같은 상업용으로 써도 돼요. 이 사이트는 광고로 운영해요.'),
        ('몇 번 찍혔는지 알 수 있나요?', '이 사이트는 세지 않아요(찍어도 이 사이트를 거치지 않으니까요). URL 종류에서 \'UTM 꼬리표\'를 켜면 찍고 들어온 방문이 내 구글 애널리틱스·네이버 애널리틱스에 따로 보여요.'),
        ('로고를 넣어도 찍히나요?', '로고를 넣으면 오류 복원을 H(약 30%)로 올리고, 다 만든 그림을 바로 다시 읽어 봐요. 도장이 \'통과\'면 판독기가 읽은 것이에요. \'주의\'가 뜨면 로고를 줄이세요.'),
        ('넣은 내용이나 와이파이 비밀번호는 어디로 가나요?', '어디로도 가지 않아요. QR은 이 기기 브라우저 안에서 만들고, 넣은 내용·로고를 서버로 보내지 않아요. 설정을 주소창에 담지도 않아요.'),
    ],
    ('en', 'make'): [
        ('Do QR codes made here expire?', 'No. These are static codes: your link is stored inside the image, so the phone goes straight to it without passing through this site. They keep working even if this site disappears. If the page at your link goes away, though, that page will not open.'),
        ('Can I change the link after printing?', 'No. If the content may change, point the code at a page you control, such as your own website or a blog post, and update that page later.'),
        ('Is it really free? Can I use it for my business?', 'Yes. No sign-up, payment or watermark, and commercial use such as menus, flyers and packaging is fine. The site is paid for by ads.'),
        ('Can I see how many times it was scanned?', 'This site does not count scans, because scans never pass through it. Turn on "UTM tags" for a URL and visits from the code show up separately in your own Google Analytics or Naver Analytics.'),
        ('Will it still scan with a logo?', 'Adding a logo raises error correction to H (about 30%), and the finished image is read back right away. If the stamp says it scans, a decoder read it. If you see a warning, make the logo smaller.'),
        ('Where does my content or WiFi password go?', 'Nowhere. The code is made inside your browser, and your content and logo are not sent to any server. Settings are not put in the page address either.'),
    ],
    ('ko', 'wifi'): [
        ('손님 휴대폰에서 어떻게 연결되나요?', '휴대폰 기본 카메라로 찍으면 대부분 \'이 네트워크에 연결\' 알림이 떠요. 누르면 비밀번호를 치지 않고 연결돼요. 카메라가 못 읽는 휴대폰은 QR 앱이나 이 사이트의 스캐너로 읽고 비밀번호를 복사할 수 있어요.'),
        ('비밀번호에 ; 나 : 같은 기호가 있어도 되나요?', '돼요. 와이파이 QR 형식에서 뜻이 있는 \\ ; , : " 기호 앞에는 자동으로 \\ 를 붙여 담아요.'),
        ('보안 방식은 무엇을 고르나요?', '요즘 공유기는 거의 WPA/WPA2/WPA3예요. 비밀번호가 없는 와이파이만 \'없음\', 아주 오래된 공유기만 WEP를 고르세요. 공유기 설정 화면이나 공유기 뒷면에서 확인할 수 있어요.'),
        ('비밀번호를 바꾸면 QR도 다시 만들어야 하나요?', '네. 비밀번호가 그림 안에 그대로 들어가서, 공유기 비밀번호를 바꾸면 예전 QR로는 연결되지 않아요.'),
        ('비밀번호가 어디에 저장되나요?', '저장하지 않아요. 이 기기 브라우저 안에서 QR을 만들고 서버로 보내지 않아요. 와이파이 QR은 \'최근에 만든 QR\'에도 남기지 않아요.'),
    ],
    ('en', 'wifi'): [
        ('How do guests connect?', 'Most phones show a "Join network" prompt when the built-in camera sees the code. Tapping it connects without typing the password. Phones whose camera cannot read it can use a QR app or this site\'s scanner and copy the password.'),
        ('Can the password contain ; or : and other symbols?', 'Yes. The characters \\ ; , : " have a special meaning in the WiFi QR format, so a \\ is added in front of them automatically.'),
        ('Which security type should I pick?', 'Almost all current routers use WPA/WPA2/WPA3. Choose "None" only for open networks and WEP only for very old routers. Your router settings page or label shows which one you have.'),
        ('If I change the password, do I need a new code?', 'Yes. The password is stored inside the image, so after changing it on the router the old code will not connect.'),
        ('Is the password stored anywhere?', 'No. The code is made in your browser and nothing is sent to a server. WiFi codes are not kept in "Recent QR codes" either.'),
    ],
    ('ko', 'vcard'): [
        ('찍으면 연락처에 바로 저장되나요?', '휴대폰이 \'연락처에 추가\' 화면을 띄우고, 찍은 사람이 저장을 눌러야 저장돼요. 이름·전화·이메일·회사·직함·주소·메모가 칸마다 들어가요.'),
        ('한글 이름도 되나요?', '돼요. vCard 3.0에 UTF-8로 담고, 한글 이름은 \'홍길동\'처럼 성과 이름을 붙여 표시 이름을 만들어요.'),
        ('명함에 넣기엔 QR이 너무 촘촘해요.', '칸을 많이 채울수록 QR이 촘촘해져요. 주소·메모를 빼거나, 내 연락처 페이지 주소를 담은 URL QR을 쓰면 작은 명함에서도 잘 찍혀요.'),
        ('전화번호를 여러 개 넣을 수 있나요?', '돼요. \'전화 하나 더\'로 휴대폰·회사·집·팩스를 따로 넣어요.'),
    ],
    ('en', 'vcard'): [
        ('Does scanning save the contact automatically?', 'The phone shows an "Add contact" screen and the person scanning taps Save. Name, phones, email, company, title, address and note each go in their own field.'),
        ('Do accents and non-Latin names work?', 'Yes. The vCard 3.0 data is stored as UTF-8, so any name works.'),
        ('The code is too dense for my business card.', 'More fields make a denser code. Leave out the address and note, or use a URL code that points to your contact page; it stays easy to scan on a small card.'),
        ('Can I add more than one phone number?', 'Yes. Use "Add another phone" for mobile, work, home or fax.'),
    ],
    ('ko', 'bulk'): [
        ('몇 개까지 한 번에 만들 수 있나요?', '한 번에 1,000줄까지예요. 더 많으면 나눠서 만드세요. 모두 이 기기 안에서 만들어서 기기 속도에 따라 시간이 걸려요.'),
        ('파일 이름은 어떻게 정하나요?', 'URL은 \'이름,주소\', 글은 \'이름(탭)내용\'처럼 앞에 이름을 쓰면 그 이름으로, 없으면 내용에서 이름을 만들어요. 글은 쉼표로 나누지 않아요. 같은 이름은 뒤에 -2, -3을 붙여요.'),
        ('틀린 줄은 어떻게 되나요?', '건너뛰고, 몇 번째 줄이 왜 빠졌는지 표로 보여 줘요. 나머지는 그대로 만들어요.'),
        ('꾸밈은 어떻게 고르나요?', '꾸밈 세트나, 만들기 화면에서 \'내 꾸밈\'으로 저장한 꾸밈을 골라요. 같은 꾸밈이 모든 QR에 들어가요.'),
    ],
    ('en', 'bulk'): [
        ('How many can I make at once?', 'Up to 1,000 lines per batch. Split bigger lists. Everything is made on this device, so time depends on its speed.'),
        ('How are files named?', 'Write "name,URL" for URLs or "name(tab)text" for text to set a name; otherwise a name is made from the content. Text is never split at commas. Repeated names get -2, -3 added.'),
        ('What happens to bad lines?', 'They are skipped, and a table shows which line was skipped and why. The rest are made as usual.'),
        ('How do I pick the design?', 'Choose a preset or a design you saved under "My designs" on the generator. The same design is used for every code.'),
    ],
    ('ko', 'scan'): [
        ('QR코드로 사기를 당할 수 있나요?', '네. 가짜 주소로 보내 로그인·결제 정보를 받아 가는 \'큐싱\'이 있어요. 그래서 이 스캐너는 주소를 바로 열지 않고, 실제로 가는 도메인과 위험 신호를 먼저 보여 줘요. 모르는 곳에서 본 QR이 로그인·결제를 요구하면 열지 마세요.'),
        ('어떤 신호에 경고하나요?', '암호화 없는 http, 짧은 주소 서비스, 도메인 대신 IP 주소, 모양이 비슷한 글자로 꾸민 퓨니코드(xn--)나 %로 바꿔 쓴 도메인, 주소 앞부분에 @가 들어가 실제 도메인이 숨은 경우, 앞부분을 다른 사이트 이름처럼 꾸민 주소, 로그인·결제·인증 같은 낱말, 060 같은 유료 번호예요. 경고가 없다고 안전하다는 뜻은 아니에요.'),
        ('카메라 화면이 어디로 가나요?', '어디로도 가지 않아요. 카메라 화면과 올린 사진은 이 기기 브라우저 안에서만 읽고, 저장하거나 보내지 않아요.'),
        ('카메라가 안 켜져요.', '카메라 권한을 허용해야 해요. 주소창 옆 자물쇠 아이콘에서 카메라를 허용하거나, 사진·스크린샷을 올려서 읽어도 돼요.'),
    ],
    ('en', 'scan'): [
        ('Can QR codes be used for scams?', 'Yes. "Quishing" sends people to fake pages that ask for logins or payment. That is why this scanner never opens a link by itself and shows the real domain and warning signs first. If a code you found in public asks you to log in or pay, do not open it.'),
        ('Which warning signs does it check?', 'Unencrypted http, link shorteners, IP addresses instead of a domain, punycode (xn--) or %-encoded domains that can disguise letters, an @ that hides the real domain, addresses dressed up to look like another site, words like login, verify or payment, and premium-rate numbers. No warning does not mean a link is safe.'),
        ('Where does the camera image go?', 'Nowhere. The camera feed and uploaded images are read inside your browser and are not stored or sent.'),
        ('The camera does not start.', 'Allow camera access for this site (the lock icon next to the address bar), or upload a photo or screenshot instead.'),
    ],
}

# 와이파이·명함 페이지의 짧은 안내(그 의도에 맞는 것만)
INTENT = {
    ('ko', 'wifi'): ('와이파이 QR 붙이기 전에', '<ul><li>와이파이 이름과 비밀번호는 대소문자·빈칸까지 공유기와 똑같아야 해요. 붙이기 전에 휴대폰으로 한 번 찍어 연결해 보세요.</li><li>손님용 와이파이(게스트 네트워크)를 따로 만들어 그 비밀번호를 담으면, 비밀번호를 바꿔도 가게 안쪽 기기에 영향이 없어요.</li><li>계산대·테이블처럼 손님이 앉은 자리에서 보이는 곳에, 10cm 안팎 크기로 붙이면 찍기 편해요.</li></ul>'),
    ('en', 'wifi'): ('Before you put it up', '<ul><li>The network name and password must match your router exactly, including capitals and spaces. Scan it once with your phone before printing.</li><li>A separate guest network keeps your own devices apart and lets you change the guest password without touching them.</li><li>Put it where guests sit, such as the counter or tables, at around 10 cm wide so it is easy to scan.</li></ul>'),
    ('ko', 'vcard'): ('명함에 넣을 때', '<ul><li>칸이 많을수록 QR이 촘촘해져요. 명함처럼 작게 인쇄하면 꼭 필요한 칸(이름·전화·이메일)만 넣으세요.</li><li>인쇄소에는 SVG나 PDF(벡터)를 주면 크기를 바꿔도 깨지지 않아요.</li><li>명함 색과 맞추고 싶으면 점 색만 바꾸고 바탕은 밝게 두세요. 도장이 \'통과\'인지 보고 인쇄하세요.</li></ul>'),
    ('en', 'vcard'): ('For business cards', '<ul><li>The more fields you fill, the denser the code. For a small card, keep the essentials: name, phone, email.</li><li>Give your printer the SVG or PDF (vector) so it stays sharp at any size.</li><li>To match your card, change the dot color and keep the background light. Check that the stamp says it scans before printing.</li></ul>'),
}

BULK = {
    'ko': dict(
        input_h='목록', paste_l='한 줄에 하나씩 붙여 넣기', paste_ph='https://example.com/menu\n가게2,https://example.com/shop2\n…', csv_l='또는 CSV 파일 올리기', csv_pick='CSV 고르기',
        csv_note='첫 줄이 제목줄(예: 파일이름,내용)이면 건너뛰고 칸으로 읽어요. 쉼표가 든 칸은 "따옴표"로 감싸 주세요.',
        type_l='종류', types=[('url', 'URL'), ('text', '글'), ('wifi', '와이파이')], limit='한 번에 최대 {n}줄', lines='{n}줄',
        design_h='꾸밈', design_l='꾸밈 고르기', ecl_l='오류 복원', fmt_l='파일', fmt=[('png', 'PNG'), ('svg', 'SVG')], size_l='PNG 크기',
        go='만들기', go_first='앞 {n}줄 만들기',
        rules={'url': '한 줄에 주소 하나. 파일 이름을 붙이려면 \'이름,주소\' 또는 \'이름(탭)주소\'.', 'text': '한 줄 전체가 내용이에요(쉼표가 있어도 나누지 않아요). 파일 이름을 붙이려면 \'이름(탭)내용\'처럼 탭으로 나눠 주세요.', 'wifi': 'CSV 칸: 파일이름, 이름(SSID), 비밀번호, 보안(WPA·WEP·nopass), 숨김(true). 파일이름은 비워도 돼요.'},
        making='만드는 중… {i}/{n}', cancel='멈추기', zip='ZIP 받기 ({n}개)', again='다시 만들기',
        res_h='결과', res_ok='{n}개 만들었어요.', res_skip='{n}줄은 건너뛰었어요.', res_fail='{n}개는 찍힘 확인을 통과하지 못했어요. 꾸밈을 바꿔 다시 만들어 보세요.',
        th_no='줄', th_img='QR', th_name='파일 이름', th_content='내용', th_check='찍힘 확인', ok='통과', fail='안 읽힘', nocheck='확인 못 함',
        skip_h='건너뛴 줄', th_reason='이유', too_many='{n}줄이 넘어서 앞의 {m}줄만 만들어요.', empty_list='목록이 비어 있어요.',
        mine_group='내 꾸밈', preset_group='꾸밈 세트', table_note='미리보기는 100개까지 보여요.',
        privacy='목록과 만든 파일은 이 기기 안에서만 처리해요.',
    ),
    'en': dict(
        input_h='Your list', paste_l='Paste one item per line', paste_ph='https://example.com/menu\nshop2,https://example.com/shop2\n…', csv_l='Or upload a CSV file', csv_pick='Choose CSV',
        csv_note='A header row (e.g. filename,content) is skipped and the file is read as columns. Wrap cells that contain commas in "quotes".',
        type_l='Type', types=[('url', 'URL'), ('text', 'Text'), ('wifi', 'WiFi')], limit='Up to {n} lines per batch', lines='{n} lines',
        design_h='Design', design_l='Choose a design', ecl_l='Error correction', fmt_l='Files', fmt=[('png', 'PNG'), ('svg', 'SVG')], size_l='PNG size',
        go='Generate', go_first='Generate the first {n} lines',
        rules={'url': 'One URL per line. To name a file, write "name,URL" or "name(tab)URL".', 'text': 'Each whole line is the content (commas do not split it). To name a file, separate it with a tab: "name(tab)text".', 'wifi': 'CSV columns: filename, SSID, password, security (WPA, WEP, nopass), hidden (true). The filename may be empty.'},
        making='Making… {i}/{n}', cancel='Stop', zip='Download ZIP ({n})', again='Start over',
        res_h='Results', res_ok='Made {n} codes.', res_skip='Skipped {n} lines.', res_fail='{n} codes did not pass the scan check. Try another design and generate again.',
        th_no='Line', th_img='QR', th_name='File name', th_content='Content', th_check='Scan check', ok='Scans', fail='No scan', nocheck='Not checked',
        skip_h='Skipped lines', th_reason='Reason', too_many='More than {n} lines; only the first {m} are made.', empty_list='The list is empty.',
        mine_group='My designs', preset_group='Presets', table_note='The preview shows up to 100 rows.',
        privacy='Your list and files are processed on this device only.',
    ),
}

SCAN = {
    'ko': dict(
        cam='카메라로 찍기', cam_stop='카메라 끄기', file='사진·스크린샷 올리기', paste='붙여넣기', paste_note='복사한 그림은 Ctrl+V(⌘V)로도 붙여 넣을 수 있어요.',
        cam_note='카메라는 누른 뒤에만 켜고, 화면은 이 기기 안에서만 읽어요. 어디에도 보내지 않아요.',
        waiting='QR코드를 네모 안에 맞춰 주세요.', none='QR코드를 찾지 못했어요. 더 가까이, 밝은 곳에서 다시 해 보세요.', cam_denied='카메라를 쓸 수 없어요. 권한을 허용하거나 사진을 올려 주세요.', cam_none='이 기기에서 카메라를 찾지 못했어요. 사진을 올려 주세요.',
        paste_none='붙여 넣을 그림이 없어요. 그림을 복사한 뒤 다시 눌러 주세요.', paste_denied='이 브라우저는 붙여넣기 단추를 막아요. Ctrl+V(⌘V)로 붙여 넣어 주세요.',
        res_h='읽은 내용', kind='종류', open='이 주소 열기', copy='복사', copied='복사했어요', again='다시 찍기',
        goes='실제로 가는 곳', full='전체 주소', safe_none='눈에 띄는 위험 신호는 없어요. 그래도 로그인·결제를 요구하면 주소를 한 번 더 보세요.',
        flags=dict(
            http='암호화가 없는 http 주소예요. 입력한 정보가 그대로 보일 수 있어요.', short='짧은 주소 서비스예요. 실제로 어디로 가는지 열기 전에는 알 수 없어요.',
            ip='도메인 대신 IP 주소예요. 정상 서비스는 보통 이렇게 쓰지 않아요.', puny='퓨니코드(xn--) 도메인이에요. 비슷하게 생긴 글자로 다른 사이트를 흉내 낼 수 있어요.',
            at='주소 앞부분에 @가 있어요. @ 앞은 꾸밈이고, 실제로는 @ 뒤 도메인으로 가요.', words='로그인·결제·인증 같은 낱말이 들어 있어요. 이런 페이지는 주소를 꼭 확인하세요.',
            port='드문 포트 번호가 붙어 있어요.', pct='도메인에 %로 바꿔 쓴 글자가 있어요. 눈에 보이는 이름과 실제로 가는 곳이 다를 수 있어요.',
            lookalike='앞부분이 다른 사이트 이름처럼 꾸며져 있어요. 실제로 가는 곳은 위에 크게 쓴 도메인이에요.', paid='060 같은 유료 정보 서비스 번호예요. 걸거나 보내면 요금이 붙을 수 있어요.',
            blocked='열면 안 되는 종류(스크립트·파일 등)라 열기 단추를 두지 않았어요.',
        ),
        t=dict(url='주소(URL)', wifi='와이파이', vcard='연락처', email='이메일', sms='문자', tel='전화', geo='위치', event='일정', text='글', blocked='열지 않는 내용'),
        wifi_ssid='이름', wifi_pass='비밀번호', show='보기', hide='가리기', wifi_auth='보안', wifi_hidden='숨긴 네트워크', yes='예',
        v_name='이름', v_org='회사', v_title='직함', v_tel='전화', v_email='이메일', v_url='웹', v_adr='주소', v_note='메모', save_vcf='연락처 파일(.vcf) 받기',
        e_title='일정', e_start='시작', e_end='끝', e_loc='장소', save_ics='캘린더 파일(.ics) 받기',
        m_to='받는 사람', m_sub='제목', m_body='내용', s_phone='번호', s_msg='내용', g_open='구글 지도에서 열기', open_app='앱으로 열기',
        raw='원래 글 보기',
    ),
    'en': dict(
        cam='Scan with camera', cam_stop='Stop camera', file='Upload a photo or screenshot', paste='Paste', paste_note='You can also paste a copied image with Ctrl+V (⌘V).',
        cam_note='The camera only turns on after you tap, and the image is read on this device. Nothing is sent anywhere.',
        waiting='Fit the QR code inside the square.', none='No QR code found. Try closer and in better light.', cam_denied='Camera unavailable. Allow access or upload a photo instead.', cam_none='No camera found on this device. Upload a photo instead.',
        paste_none='No image to paste. Copy an image and try again.', paste_denied='This browser blocks the Paste button. Use Ctrl+V (⌘V) instead.',
        res_h='What it says', kind='Type', open='Open this link', copy='Copy', copied='Copied', again='Scan again',
        goes='Where it really goes', full='Full address', safe_none='No obvious warning signs. If it asks you to log in or pay, check the address again anyway.',
        flags=dict(
            http='Unencrypted http link. Anything you type could be seen by others.', short='Link shortener. You cannot tell where it goes until you open it.',
            ip='An IP address instead of a domain. Legitimate services rarely do this.', puny='Punycode (xn--) domain. Look-alike letters can imitate another site.',
            at='There is an @ in the address. Everything before it is decoration; it really goes to the domain after the @.', words='Contains words like login, verify or payment. Check the address carefully on pages like this.',
            port='Unusual port number.', pct='The domain contains %-encoded characters. The name you see and where it really goes may differ.',
            lookalike='The start is dressed up to look like another site. It really goes to the domain shown in big letters above.', paid='This looks like a premium-rate number (e.g. 1-900). Calling or texting may cost extra.',
            blocked='This kind of content (script, file, etc.) should not be opened, so there is no open button.',
        ),
        t=dict(url='URL', wifi='WiFi', vcard='Contact', email='Email', sms='SMS', tel='Phone', geo='Location', event='Event', text='Text', blocked='Not opened'),
        wifi_ssid='Network', wifi_pass='Password', show='Show', hide='Hide', wifi_auth='Security', wifi_hidden='Hidden network', yes='Yes',
        v_name='Name', v_org='Company', v_title='Title', v_tel='Phone', v_email='Email', v_url='Web', v_adr='Address', v_note='Note', save_vcf='Download contact (.vcf)',
        e_title='Event', e_start='Starts', e_end='Ends', e_loc='Location', save_ics='Download calendar file (.ics)',
        m_to='To', m_sub='Subject', m_body='Message', s_phone='Number', s_msg='Message', g_open='Open in Google Maps', open_app='Open in app',
        raw='Show raw text',
    ),
}

ABOUT = {
    'ko': dict(title='오래QR 소개 — 만료 없는 무료 QR코드 생성기 | 오래QR', h1='오래QR 소개', desc='오래QR은 루멘랩이 만든 무료 QR코드 생성기예요. 정적 QR만 만들어 만료가 없고, 꾸미기·인쇄 파일·대량 만들기·스캔 확인을 가입 없이 쓸 수 있어요.',
               body='''<p>오래QR(Staycode)은 인쇄해도 멈추지 않는 QR코드를, 유료 사이트 수준으로 꾸며서, 가입 없이 만드는 도구예요.</p>
<h2>왜 만들었나</h2>
<p>\'무료 QR코드\'로 검색해 만든 코드가 며칠 뒤 멈추고 결제를 요구받는 일이 많아요. 업체 서버를 거치는 동적 QR을 기본으로 만들고, 체험 기간이 끝나면 끄기 때문이에요. 오래QR은 처음부터 정적 QR만 만들어, 넣은 주소가 그림 안에 그대로 들어가고 이 사이트를 거치지 않아요.</p>
<h2>할 수 있는 것</h2>
<ul><li>URL·글·와이파이·연락처·이메일·문자·전화·위치·일정·WhatsApp QR</li><li>점·눈 모양, 그라데이션, 로고, 틀(스티커 모양)과 문구, 오류 복원 단계, 여백</li><li>PNG·JPG·SVG·PDF·EPS 저장, A4 스티커 시트 인쇄</li><li>목록·CSV로 최대 1,000개 대량 만들기</li><li>만든 그림을 바로 다시 읽는 \'찍힘 확인\'</li><li>열기 전에 주소를 확인하는 스캐너</li></ul>
<h2>못 하는 것</h2>
<p>인쇄한 뒤 주소 바꾸기와 찍힌 수 세기는 하지 않아요. 둘 다 이 사이트 서버를 거치게 해야 해서, 이 사이트가 멈추면 코드도 멈추기 때문이에요. 찍힌 수는 UTM 꼬리표로 내 분석 도구에서 볼 수 있어요.</p>
<h2>운영</h2>
<p>루멘랩(Lumen Lab)이 만들고 광고로 운영해요. 문의: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''),
    'en': dict(title='About Staycode — A Free QR Code Generator That Never Expires', h1='About Staycode', desc='Staycode is a free QR code generator by Lumen Lab. It makes static codes only, so they never expire, with design, print files, bulk and scan check, no sign-up.',
               body='''<p>Staycode makes QR codes that keep working after you print them, styled as well as on paid sites, with no sign-up.</p>
<h2>Why we built it</h2>
<p>Many people search for a free QR code, print it, and find days later that it stopped working and wants payment. That happens because those sites make dynamic codes that pass through their server by default and switch them off after the trial. Staycode only makes static codes: your link goes inside the image and never passes through this site.</p>
<h2>What you can do</h2>
<ul><li>URL, text, WiFi, contact, email, SMS, phone, location, event and WhatsApp codes</li><li>Dot and eye shapes, gradients, logo, frames with text, error correction level and quiet zone</li><li>PNG, JPG, SVG, PDF and EPS downloads, and A4 sticker sheets</li><li>Bulk generation of up to 1,000 codes from a list or CSV</li><li>A scan check that reads back the image you just made</li><li>A scanner that shows the address before opening it</li></ul>
<h2>What it does not do</h2>
<p>It does not change links after printing or count scans. Both would require every scan to pass through this site, so the code would stop if the site did. You can count scans in your own analytics with UTM tags.</p>
<h2>Who runs it</h2>
<p>Made by Lumen Lab and paid for by ads. Contact: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''),
}

# 방침의 저장 키는 코드(assets/*.js)와 같아야 한다(check.py 가 대조)
STORE_KEYS = ['staycode.set', 'staycode.styles', 'staycode.recent', 'staycode.lang']

PRIVACY = {
    'ko': dict(title='개인정보 처리방침 | 오래QR', h1='개인정보 처리방침', desc='오래QR(QR코드 만들기·스캐너)이 기기에 저장하는 것, 넣은 내용·로고·카메라 화면의 처리, 광고와 방문 통계에 대한 안내예요.',
               body=f'''<p class="meta">시행일: 2026년 10월 14일 · 운영: 루멘랩(Lumen Lab)</p>
<h2>넣은 내용, 로고, 카메라 화면</h2>
<p>QR코드는 이용자의 브라우저 안에서 만들어요. QR에 넣은 내용(주소·와이파이 비밀번호·연락처 등), 올린 로고, 대량 만들기의 목록, 스캐너의 카메라 화면과 올린 사진은 이 기기 밖으로 나가지 않아요. 이 사이트가 서버로 보내거나 모으지 않고, 설정을 페이지 주소에 담지도 않아요. 회원 가입은 없어요.</p>
<h2>기기에 저장하는 정보</h2>
<p>브라우저 저장소(localStorage)에 아래 네 항목만 남겨요. 서버로 보내지 않아요.</p>
<ul>
<li><code>staycode.set</code>: 화면 설정(이펙트 세기, 밝게·어둡게).</li>
<li><code>staycode.styles</code>: \'내 꾸밈\'에 이름 붙여 저장한 꾸밈(모양·색·틀·문구, 넣었다면 로고 그림).</li>
<li><code>staycode.recent</code>: 저장(내려받기·복사·공유)한 QR 8개까지의 종류, 넣은 내용 전체, 꾸밈, 만든 때. URL·글·이메일·문자·전화·위치·일정·WhatsApp QR만 남기고, <b>연락처·와이파이 QR은 남기지 않아요</b>(전화번호·주소·와이파이 비밀번호가 기기에 남지 않게). 목록에는 앞부분만 보여요.</li>
<li><code>staycode.lang</code>: 다른 언어판 안내 띠를 닫았다는 표시.</li>
</ul>
<p>\'내 꾸밈\'의 지우기, \'최근에 만든 QR\'의 모두 지우기로 지울 수 있고, 브라우저의 사이트 데이터 지우기로 전부 지울 수 있어요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="{PARTNER}" rel="noopener">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="{ADSET}" rel="noopener">Google 광고 설정</a>에서 끌 수 있어요.</p>
<h2>방문 통계</h2>
<p>방문 통계는 <a href="{CFWA}" rel="noopener">Cloudflare Web Analytics</a>로 봐요. 본 페이지 주소, 직전 페이지 주소, 페이지가 뜨는 데 걸린 시간, 브라우저 종류 같은 정보예요. Cloudflare 설명으로는 쿠키를 쓰지 않아요. QR에 넣은 내용과 로고, 카메라 화면은 여기에 실리지 않아요.</p>
<h2>서버 기록</h2>
<p>사이트는 Cloudflare에서 제공되고, Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요. 이 기록에도 QR에 넣은 내용은 들어가지 않아요.</p>
<h2>문의</h2>
<p><a href="mailto:{CONTACT}">{CONTACT}</a></p>'''),
    'en': dict(title='Privacy Policy | Staycode', h1='Privacy policy', desc='What Staycode (QR code generator and scanner) stores on your device, how your content, logo and camera image are handled, and how ads and visit statistics work.',
               body=f'''<p class="meta">Effective October 14, 2026 · Operated by Lumen Lab</p>
<h2>Your content, logo and camera image</h2>
<p>QR codes are made inside your browser. What you put in a code (links, WiFi passwords, contact details and so on), logos you add, bulk lists, and the scanner's camera image and uploaded photos never leave this device. This site does not send them to a server or collect them, and settings are not put in the page address. There are no accounts.</p>
<h2>What is stored on your device</h2>
<p>Only the four items below are kept in your browser's localStorage. They are not sent to a server.</p>
<ul>
<li><code>staycode.set</code>: display settings (effects level, light or dark).</li>
<li><code>staycode.styles</code>: designs you saved under "My designs" (shapes, colors, frame, text and, if added, the logo image).</li>
<li><code>staycode.recent</code>: up to 8 codes you downloaded, copied or shared, with their type, the full content, the design and when they were made. Only URL, text, email, SMS, phone, location, event and WhatsApp codes are kept; <b>contact and WiFi codes are never kept</b> (so phone numbers, addresses and WiFi passwords are not left on the device). The list shows only the start.</li>
<li><code>staycode.lang</code>: a note that you closed the language suggestion bar.</li>
</ul>
<p>Delete saved designs or clear recent codes with the buttons next to them, or remove everything with your browser's "clear site data".</p>
<h2>Advertising</h2>
<p>This site shows ads through Google AdSense. Google and other ad companies may use cookies to choose ads based on your visits to this and other sites. Because of ads, third parties such as Google may place or read cookies in your browser and may collect information through web beacons (small invisible images). How Google uses this information is explained in <a href="{PARTNER}" rel="noopener">How Google uses information from sites or apps that use our services</a>. You can turn off personalized ads in <a href="{ADSET}" rel="noopener">Google Ad Settings</a>.</p>
<h2>Visit statistics</h2>
<p>Visit statistics come from <a href="{CFWA}" rel="noopener">Cloudflare Web Analytics</a>: the page address, the previous page address, how long the page took to load, and the browser type. According to Cloudflare it does not use cookies. Your QR content, logo and camera image are not part of it.</p>
<h2>Server logs</h2>
<p>The site is served by Cloudflare, which may briefly keep basic logs such as IP addresses to run the service securely. These logs do not include what you put in a code.</p>
<h2>Contact</h2>
<p><a href="mailto:{CONTACT}">{CONTACT}</a></p>'''),
}

# 루멘랩 칸의 작은 스티커(다른 도구). 이름만, 그림은 build.py 가 그린다
LUMEN_STICKERS = ['cal', 'pick', 'count', 'type', 'won', 'check']
