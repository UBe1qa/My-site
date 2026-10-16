"""한바퀴 화면 글. build.py가 읽는다. 말투: 한국어 해요체, 영어 짧고 평범하게.
공식 사실은 facts.json에서만 가져온다(출처 링크·확인한 날을 같이)."""
import json
from pathlib import Path

_F = json.loads((Path(__file__).resolve().parent / 'facts.json').read_text(encoding='utf-8'))
CHROME = _F['chrome_throttling']['url']
LIFE = _F['page_lifecycle']['url']
NIST = _F['dst_us']['url']
IANA = _F['tz_2026']['url']
CHK = {'ko': '2026년 10월 14일 확인', 'en': 'checked Oct 14, 2026'}

NAV = {
    'ko': {'timer': '타이머', 'stopwatch': '스톱워치', 'alarm': '알람', 'world': '세계 시간'},
    'en': {'timer': 'Timer', 'stopwatch': 'Stopwatch', 'alarm': 'Alarm', 'world': 'World clock'},
}

UI = {
    'ko': {
        'brand': '한바퀴', 'skip': '본문으로', 'nav_label': '도구', 'guides': '가이드', 'lang_other': 'English', 'lang_offer': 'English version',
        'about': '소개', 'privacy': '개인정보 처리방침', 'contact': '문의', 'ad': '광고', 'faq': '자주 묻는 질문',
        'guides_h': '시간을 제대로 재는 법', 'tools_h': '다른 시간 도구', 'sources': '출처', 'crumb': '가이드', 'checked': '마지막 확인',
        'lumen_b': '루멘랩이 만든 다른 도구', 'lumen_s': '며칠 계산기·글자수 세기·타자 연습…', 'home': '타이머로 가기', 'nf_title': '없는 페이지예요',
        'trust': '가입 없이 무료예요. 타이머·알람·도시 목록은 이 기기에만 저장돼요.',
        'nojs': '이 도구는 자바스크립트가 켜져 있어야 움직여요.',
        'unit_s': '초', 'unit_m': '분', 'unit_h': '시간',
        'dial_label': '시계판을 돌려 분 맞추기', 'dial_now': '5분', 'drag_hint': '판을 돌려 맞춰요', 'full': '전체 화면',
        'start': '시작', 'pause': '멈춤', 'resume': '계속', 'reset': '초기화', 'plus1': '+1분', 'byline': '한바퀴 · 루멘랩',
        'presets_h': '누르면 바로 시작', 'presets': [(1, '1분'), (3, '3분'), (5, '5분'), (10, '10분'), (15, '15분'), (25, '25분'), (30, '30분'), (60, '1시간')],
        'hms_h': '직접 맞추기', 'h': '시간', 'm': '분', 's': '초', 'name_ph': '이름 붙이기 (예: 파스타)', 'name_label': '타이머 이름',
        'sound': '소리', 'sound_test': '미리 듣기', 'sounds': [('bell', '종'), ('beep', '삐삐'), ('soft', '부드럽게'), ('none', '소리 없음')],
        'more': '화면·소리 설정', 'wake': '화면 켜 두기', 'wake_s': '휴대폰에서 켜 두면 화면이 꺼지지 않아요',
        'notify': '컴퓨터 알림', 'notify_s': '다른 창을 볼 때 알림 띄우기', 'fx': '움직임', 'fx_v': [('high', '화려하게'), ('low', '가볍게'), ('off', '끔')],
        'theme': '화면 색', 'theme_v': [('auto', '기기대로'), ('light', '밝게'), ('dark', '어둡게')],
        'keys': '단축키: 스페이스 시작·멈춤 · R 초기화 · F 전체 화면 · + 1분 더하기 · Esc 소리 끄기',
        'keys_watch': '단축키: 스페이스 시작·멈춤 · L 랩 · R 초기화 · F 전체 화면', 'keys_alarm': '단축키: F 전체 화면 · Esc 소리 끄기', 'm_time': '시각',
        'multi_h': '타이머 여러 개', 'multi_s': '눌러서 시계판에 크게 보기', 'add_timer': '타이머 더하기',
        'w_idle': '시작을 눌러요', 'lap': '랩', 'laps_h': '랩 기록', 'copy': '복사', 'csv': 'CSV 저장', 'lap_n': '랩', 'lap_t': '랩 시간', 'lap_total': '누적',
        'laps_empty': '재는 중에 랩을 누르면 구간 기록이 여기에 쌓여요.',
        'a_set_h': '알람 맞추기', 'a_time': '울릴 시각', 'a_name': '이름', 'a_name_ph': '예: 회의 준비', 'a_quick_h': '지금부터 시각 채우기',
        'a_quick': [(10, '+10분'), (30, '+30분'), (60, '+1시간')], 'a_add': '알람 맞추기', 'a_list_h': '맞춘 알람', 'a_empty': '맞춘 알람이 없어요.',
        'wc_now': '지금 내 시각', 'wc_base': '기준 도시', 'wc_add_ph': '도시 이름 (예: 뉴욕, 파리)', 'wc_add_label': '더할 도시', 'wc_add': '도시 더하기',
        'm_h': '회의 시간 찾기', 'm_date': '날짜', 'm_all': '모두 근무 시간', 'm_work': '근무 시간(월~금 9~18시)', 'm_night': '밤(22~7시)', 'm_weekend': '주말',
        'm_pick': '칸을 누르거나 시각을 넣으면 그 순간을 도시마다 한 줄로 적어 줘요.',
        'w_defaults': ['newyork', 'losangeles', 'london', 'paris', 'sydney', 'hanoi'],
        'js': {
            'start': '시작', 'pause': '멈춤', 'resume': '계속', 'restart': '다시 시작', 'stop_sound': '소리 끄기', 'close': '닫기',
            'ends_at': '{t}에 끝나요', 'paused': '멈춤 · {t} 남음', 'done': '끝났어요', 'done_ago': '{ago}에 끝났어요', 'one_turn': '한 바퀴 {n}',
            'set_hint': '판을 돌려 맞춰요', 'set_long': '{t} 맞춤', 'ring_title': '⏰ 끝! {name}', 'ring_msg': '{name} 끝났어요', 'timer': '타이머', 'timer_n': '타이머 {n}',
            'need_tap': '소리를 켜려면 화면을 한 번 눌러 주세요', 'bad_frac': '정수만 넣을 수 있어요', 'bad_neg': '0 이상만 넣을 수 있어요', 'bad_nan': '숫자만 넣을 수 있어요',
            'bad_max': '{max}까지 넣을 수 있어요', 'zero': '시간을 1초 이상 맞춰 주세요', 'read_as': '{t}으로 맞췄어요', 'max_timers': '타이머는 8개까지예요',
            'presets_idle': '누르면 바로 시작', 'presets_run': '누르면 새 타이머로 더해서 시작', 'del': '지우기', 'play': '시작', 'pausebtn': '멈춤', 'minutes': '{n}분', 'unit_s': '초', 'unit_m': '분', 'unit_h': '시간',
            'w_run': '재는 중', 'w_stop': '멈춤', 'w_idle': '시작을 눌러요', 'fast': '가장 빠름', 'slow': '가장 느림', 'copied': '복사했어요', 'saved': 'CSV로 저장했어요',
            'lap_head': '랩', 'laps_note': '랩 {n}개', 'wake_on': '화면을 켜 둬요', 'wake_no': '이 브라우저는 화면 켜 두기를 못 해요', 'wake_lost': '화면 켜 두기가 풀렸어요',
            'notify_denied': '브라우저에서 알림이 막혀 있어요', 'a_in': '{t}', 'a_off': '꺼짐', 'a_missed': '닫혀 있는 동안 지나갔어요 ({ago})', 'a_shift': '서머타임으로 {t}에 울려요',
            'a_next': '다음 알람 {t}', 'a_none': '맞춘 알람 없음', 'a_snooze': '5분 뒤 다시', 'a_added': '{t}에 울려요 ({in})', 'a_bad': '시각을 다시 확인해 주세요', 'a_ringing': '울리는 중',
            'a_max': '알람은 12개까지예요', 'a_dup': '같은 시각에 켜진 알람이 이미 있어요', 'a_filled': '{t}로 채웠어요. \'알람 맞추기\'를 눌러 주세요',
            'a_missed_bar': '기기가 쉬는 동안 지나간 알람: {list}', 'a_on': '켜기', 'today': '오늘', 'tomorrow': '내일', 'yesterday': '어제', 'me': '내 기기', 'you': '내 시간',
            'dst_next': '{date} {time}에 {what} → {diff}', 'dst_start': '서머타임 시작', 'dst_end': '서머타임 끝', 'dst_change': '시차 바뀜', 'dst_none': '1년 안에 바뀌는 날 없음',
            'stale': '이 브라우저의 시간대 자료가 예전 것이에요({cities}). 2026년에 바뀐 규칙은 이 사이트가 고친 값으로 계산해요. 다른 사이트·앱에서는 1시간 틀릴 수 있으니 브라우저를 업데이트해 주세요.',
            'all_none': '이 날은 모두 근무 시간인 때가 없어요. 가장 가까운 칸을 눌러 보세요.', 'all_some': '모두 근무 시간: {list}', 'city_dup': '이미 있는 도시예요', 'city_none': '찾는 도시가 없어요. 같은 나라의 큰 도시를 넣어 보세요',
            'city_max': '도시는 12개까지예요', 'remove': '빼기', 'base_me': '내 기기 시간대 ({zone})', 'pick_line': '{list}', 'gap': '(그날 없는 시각)',
            'weekday': ['일', '월', '화', '수', '목', '금', '토'], 'date_fmt': '{m}월 {d}일 ({w})', 'full_exit': '전체 화면 닫기',
        },
    },
    'en': {
        'brand': 'Oneturn', 'skip': 'Skip to content', 'nav_label': 'Tools', 'guides': 'Guides', 'lang_other': '한국어', 'lang_offer': '한국어로 보기',
        'about': 'About', 'privacy': 'Privacy', 'contact': 'Contact', 'ad': 'Advertisement', 'faq': 'Questions people ask',
        'guides_h': 'Guides', 'tools_h': 'More time tools', 'sources': 'Sources', 'crumb': 'Guides', 'checked': 'Last checked',
        'lumen_b': 'More tools from Lumen Lab', 'lumen_s': 'Day counter, word counter, typing test…', 'home': 'Go to the timer', 'nf_title': 'Page not found',
        'trust': 'Free, no sign-up. Your timers, alarms and city list stay on this device.',
        'nojs': 'This tool needs JavaScript turned on.',
        'unit_s': 'sec', 'unit_m': 'min', 'unit_h': 'hr',
        'dial_label': 'Turn the dial to set minutes', 'dial_now': '5 minutes', 'drag_hint': 'Turn the dial to set', 'full': 'Full screen',
        'start': 'Start', 'pause': 'Pause', 'resume': 'Resume', 'reset': 'Reset', 'plus1': '+1 min', 'byline': 'Oneturn by Lumen Lab',
        'presets_h': 'Tap to start', 'presets': [(1, '1 min'), (3, '3 min'), (5, '5 min'), (10, '10 min'), (15, '15 min'), (25, '25 min'), (30, '30 min'), (60, '1 hour')],
        'hms_h': 'Set exactly', 'h': 'Hours', 'm': 'Minutes', 's': 'Seconds', 'name_ph': 'Name it (e.g. Pasta)', 'name_label': 'Timer name',
        'sound': 'Sound', 'sound_test': 'Test sound', 'sounds': [('bell', 'Bell'), ('beep', 'Beep'), ('soft', 'Soft'), ('none', 'No sound')],
        'more': 'Screen and sound settings', 'wake': 'Keep screen on', 'wake_s': 'Stops a phone screen from turning off',
        'notify': 'Desktop notification', 'notify_s': 'Notify me when I am in another window', 'fx': 'Motion', 'fx_v': [('high', 'Full'), ('low', 'Light'), ('off', 'Off')],
        'theme': 'Colors', 'theme_v': [('auto', 'Device'), ('light', 'Light'), ('dark', 'Dark')],
        'keys': 'Shortcuts: Space start/pause · R reset · F full screen · + add a minute · Esc stop the sound',
        'keys_watch': 'Shortcuts: Space start/stop · L lap · R reset · F full screen', 'keys_alarm': 'Shortcuts: F full screen · Esc stop the sound', 'm_time': 'Time',
        'multi_h': 'Several timers', 'multi_s': 'Tap one to show it on the dial', 'add_timer': 'Add a timer',
        'w_idle': 'Press Start', 'lap': 'Lap', 'laps_h': 'Laps', 'copy': 'Copy', 'csv': 'Save CSV', 'lap_n': 'Lap', 'lap_t': 'Lap time', 'lap_total': 'Total',
        'laps_empty': 'Press Lap while it runs and each split shows up here.',
        'a_set_h': 'Set an alarm', 'a_time': 'Ring at', 'a_name': 'Label', 'a_name_ph': 'e.g. Call mom', 'a_quick_h': 'Fill in from now',
        'a_quick': [(10, '+10 min'), (30, '+30 min'), (60, '+1 hour')], 'a_add': 'Set alarm', 'a_list_h': 'Your alarms', 'a_empty': 'No alarms yet.',
        'wc_now': 'Your time now', 'wc_base': 'Compare with', 'wc_add_ph': 'City name (e.g. Tokyo, Paris)', 'wc_add_label': 'City to add', 'wc_add': 'Add city',
        'm_h': 'Find a meeting time', 'm_date': 'Date', 'm_all': 'Everyone at work', 'm_work': 'Work hours (Mon–Fri 9–18)', 'm_night': 'Night (22–7)', 'm_weekend': 'Weekend',
        'm_pick': 'Tap a cell or type a time to write that moment out for every city.',
        'w_defaults': ['london', 'newyork', 'losangeles', 'tokyo', 'sydney', 'dubai'],
        'js': {
            'start': 'Start', 'pause': 'Pause', 'resume': 'Resume', 'restart': 'Start again', 'stop_sound': 'Stop sound', 'close': 'Close',
            'ends_at': 'Ends at {t}', 'paused': 'Paused · {t} left', 'done': 'Time is up', 'done_ago': 'Finished {ago}', 'one_turn': 'One turn = {n}',
            'set_hint': 'Turn the dial to set', 'set_long': '{t} set', 'ring_title': '⏰ Done! {name}', 'ring_msg': '{name} is done', 'timer': 'Timer', 'timer_n': 'Timer {n}',
            'need_tap': 'Tap the page once to allow sound', 'bad_frac': 'Whole numbers only', 'bad_neg': 'Use 0 or more', 'bad_nan': 'Numbers only',
            'bad_max': 'Up to {max}', 'zero': 'Set at least 1 second', 'read_as': 'Set to {t}', 'max_timers': 'You can have up to 8 timers',
            'presets_idle': 'Tap to start', 'presets_run': 'Tap to add a new timer and start it', 'del': 'Remove', 'play': 'Start', 'pausebtn': 'Pause', 'minutes': '{n} min', 'unit_s': 'sec', 'unit_m': 'min', 'unit_h': 'hr',
            'w_run': 'Running', 'w_stop': 'Stopped', 'w_idle': 'Press Start', 'fast': 'fastest', 'slow': 'slowest', 'copied': 'Copied', 'saved': 'Saved as CSV',
            'lap_head': 'Lap', 'laps_note': '{n} laps', 'wake_on': 'Screen stays on', 'wake_no': 'This browser cannot keep the screen on', 'wake_lost': 'Screen lock was released',
            'notify_denied': 'Notifications are blocked in this browser', 'a_in': '{t}', 'a_off': 'Off', 'a_missed': 'Missed while the page was closed ({ago})', 'a_shift': 'Rings at {t} (clocks change that night)',
            'a_next': 'Next alarm {t}', 'a_none': 'No alarm set', 'a_snooze': 'Snooze 5 min', 'a_added': 'Rings at {t} ({in})', 'a_bad': 'Check the time', 'a_ringing': 'Ringing',
            'a_max': 'You can have up to 12 alarms', 'a_dup': 'An alarm is already on for that time', 'a_filled': 'Filled in {t}. Press Set alarm',
            'a_missed_bar': 'Missed while the device was asleep: {list}', 'a_on': 'Turn on', 'today': 'Today', 'tomorrow': 'Tomorrow', 'yesterday': 'Yesterday', 'me': 'This device', 'you': 'you',
            'dst_next': '{what} on {date} at {time} → {diff}', 'dst_start': 'Clocks go forward', 'dst_end': 'Clocks go back', 'dst_change': 'Offset changes', 'dst_none': 'No clock change in the next year',
            'stale': 'This browser has old time zone data ({cities}). This site applies the 2026 rule changes itself, but other sites and apps on this device may be an hour off. Updating the browser fixes it.',
            'all_none': 'No hour has everyone at work on this day. Tap the closest cell.', 'all_some': 'Everyone at work: {list}', 'city_dup': 'That city is already here', 'city_none': 'City not found. Try a larger city in the same country',
            'city_max': 'Up to 12 cities', 'remove': 'Remove', 'base_me': 'This device ({zone})', 'pick_line': '{list}', 'gap': '(skipped that day)',
            'weekday': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 'date_fmt': '{w}, {mon} {d}', 'full_exit': 'Exit full screen',
        },
    },
}

PAGES = {
    'ko': {
        'timer': {'title': '온라인 타이머 - 시계판으로 남은 시간이 보이는 타이머 | 한바퀴',
                  'desc': '판을 돌려 맞추는 온라인 타이머예요. 다른 탭에 가도 제때 울리고, 새로고침해도 이어지고, 여러 개를 같이 돌려요. 가입 없이 무료.',
                  'h1': '온라인 타이머', 'card': '남은 시간이 시계판에 보이는 타이머',
                  'why': '남은 시간이 시계판에 보여요. <b>다른 탭에 가도 제때 울리고</b>, 새로고침해도 이어지고, 여러 개를 같이 돌릴 수 있어요. <a href="/ko/guide/timer-background/">어떻게 제때 울리나요?</a>'},
        'stopwatch': {'title': '스톱워치 - 랩 기록·CSV 저장되는 온라인 스톱워치 | 한바퀴',
                      'desc': '백분의 1초까지 재는 온라인 스톱워치예요. 랩마다 구간과 누적 시간, 가장 빠른·느린 랩을 보여 주고 표를 복사하거나 CSV로 저장해요.',
                      'h1': '스톱워치', 'card': '랩 기록·가장 빠른 랩·CSV 저장',
                      'why': '랩마다 <b>구간 시간과 누적 시간</b>을 나란히, 가장 빠른 랩과 느린 랩을 표시해요. 새로고침해도 이어서 재요.'},
        'alarm': {'title': '온라인 알람 - 시각 맞추면 이 화면에서 울리는 알람 | 한바퀴',
                  'desc': '울릴 시각만 넣으면 되는 온라인 알람이에요. 몇 시간 뒤에 울리는지 바로 보이고, 여러 개를 맞추고, 5분 뒤 다시 울리기도 돼요.',
                  'h1': '온라인 알람', 'card': '시각을 맞추면 이 화면에서 울려요',
                  'why': '시계판에 <b>지금부터 알람까지</b>가 부채꼴로 보여요. 이 탭을 열어 두면 울리고, 닫혀 있던 사이 지나간 알람은 알려 줘요.'},
        'world': {'title': '세계 시간·시차 계산 - 서머타임 바뀌는 날까지 | 한바퀴',
                  'desc': '나라별 현재 시각과 시차를 한 화면에. 서머타임이 바뀌는 날과 바뀐 뒤 시차, 모두 근무 시간인 회의 시각까지 찾아 줘요.',
                  'h1': '세계 시간·시차 계산', 'card': '시차·서머타임·회의 시간 찾기',
                  'why': '도시마다 <b>다음 서머타임 바뀌는 날과 바뀐 뒤 시차</b>까지 보여 줘요. 2026년에 바뀐 캐나다·모로코 시간도 반영했어요.'},
        'guide': {'title': '타이머·스톱워치·시차 가이드 | 한바퀴', 'desc': '타이머가 늦게 울리는 이유, 랩과 스플릿의 차이, 나라별 시차와 서머타임 바뀌는 날을 실제 계산으로 정리했어요.',
                  'h1': '가이드', 'lead': '시간 도구를 쓰다 생기는 질문을, 이 사이트의 계산과 공식 자료로 답했어요.'},
        'about': {'title': '한바퀴 소개 | 루멘랩', 'desc': '한바퀴는 시계판 하나로 타이머·스톱워치·알람·세계 시간을 쓰는 무료 도구예요. 무엇을 하고 무엇을 못 하는지 적었어요.', 'body': ''},
        'privacy': {'title': '개인정보 처리방침 | 한바퀴', 'desc': '한바퀴가 이 기기에 저장하는 것, 방문 통계, 광고 쿠키에 대해 적었어요.', 'body': ''},
    },
    'en': {
        'timer': {'title': 'Online Timer – Visual Countdown Timer with Alarm | Oneturn',
                  'desc': 'A visual online timer you set by turning the dial. Rings on time in a background tab, keeps going after a refresh, runs several timers. Free.',
                  'h1': 'Online Timer', 'card': 'A countdown you can read from across the room',
                  'why': 'See the time left at a glance. <b>Rings on time in a background tab</b>, keeps going after a refresh, and runs several timers at once. <a href="/guide/timer-in-background-tab/">How?</a>'},
        'stopwatch': {'title': 'Online Stopwatch with Laps and CSV Export | Oneturn',
                      'desc': 'A free online stopwatch to the hundredth of a second. Lap and total time side by side, fastest and slowest lap marked, copy or save laps as CSV.',
                      'h1': 'Stopwatch', 'card': 'Laps, fastest lap and CSV export',
                      'why': 'Each lap shows <b>its own time and the running total</b>, with the fastest and slowest lap marked. It keeps counting after a refresh.'},
        'alarm': {'title': 'Online Alarm Clock – Set a Time, It Rings Here | Oneturn',
                  'desc': 'Set the time and this page rings. See how long until it goes off, keep several alarms, and snooze for five minutes. Free, no sign-up.',
                  'h1': 'Online Alarm Clock', 'card': 'Set a time and this page rings',
                  'why': 'The dial shows <b>the time left until your alarm</b>. Keep this tab open and it rings; alarms that passed while the page was closed are flagged.'},
        'world': {'title': 'World Clock & Time Zone Converter with DST Dates | Oneturn',
                  'desc': 'Current time and time difference for cities worldwide, the next daylight saving change for each, and the hours when everyone is at work.',
                  'h1': 'World Clock and Time Zone Converter', 'card': 'Time differences, DST dates, meeting hours',
                  'why': 'Every city shows <b>its next clock change and the new difference</b>. Includes the 2026 changes in Canada and Morocco.'},
        'guide': {'title': 'Timer, Stopwatch and Time Zone Guides | Oneturn', 'desc': 'Why web timers run late, lap versus split time, and how daylight saving moves time differences, worked out with real numbers.',
                  'h1': 'Guides', 'lead': 'Answers to the questions that come up when you time things, checked against official sources.'},
        'about': {'title': 'About Oneturn | Lumen Lab', 'desc': 'Oneturn is a free set of time tools built around one dial: timer, stopwatch, alarm and world clock. What it does and what it cannot do.', 'body': ''},
        'privacy': {'title': 'Privacy Policy | Oneturn', 'desc': 'What Oneturn keeps on your device, the visit statistics it gets, and how advertising cookies work.', 'body': ''},
    },
}


def L(url, text):
    return f'<a href="{url}">{text}</a>'


FACTS = {
    'ko': {
        'timer': {'h2': '이 타이머가 지키는 것, 못 하는 것', 'items': [
            ('다른 탭에 가도 제때 울려요', [
                f'끝나는 순간에 알람을 한 번만 걸어 둬요. 크롬은 숨은 탭에서 되풀이되는 타이머를 1분에 한 번으로 늦추기도 하지만, 한 번만 건 알람은 1초에 한 번씩 확인해요({L(CHROME, "Chrome 문서")}, {CHK["ko"]}).',
                '남은 시간도 1초씩 빼서 세지 않고 끝나는 시각으로 계산해요. 탭으로 돌아오면 바로 맞는 시간이 보여요.']),
            ('새로고침하거나 닫았다 열어도 이어져요', [
                '타이머마다 끝나는 시각을 이 기기의 브라우저 저장소에 적어 둬요. 다시 열면 거기서 이어 가고, 닫혀 있는 동안 끝났으면 몇 분 전에 끝났는지 알려요. 닫혀 있던 동안에는 소리가 나지 않아요.']),
            ('창을 닫거나 기기가 잠들면 울리지 않아요', [
                f'브라우저는 배터리를 아끼려고 페이지를 얼리기도 하고, 얼어 있는 동안에는 페이지의 타이머가 돌지 않아요({L(LIFE, "Chrome 문서")}). 휴대폰이라면 설정에서 \'화면 켜 두기\'를 켜고 이 화면을 띄워 두세요.']),
            ('여러 개를 같이 돌려요', [
                '\'타이머 더하기\'로 8개까지 돌려요. 이름을 붙여 두면 울릴 때 어느 타이머인지 띄워 줘요. 시계판에는 고른 타이머가 크게 나와요.']),
        ]},
        'stopwatch': {'h2': '이 스톱워치가 재는 법', 'items': [
            ('시작한 시각과의 차이로 재요', ['1초마다 숫자를 더하지 않고, 누른 순간의 시각과 지금 시각의 차이로 계산해요. 다른 탭에 갔다 와도 맞는 시간이 보여요.']),
            ('새로고침해도 이어서 재요', ['시작 시각과 랩 기록을 이 기기에 적어 둬요. 실수로 새로고침하거나 닫았다 열어도 그대로 이어져요. \'초기화\'를 누르면 지워져요.']),
            ('랩 시간과 누적 시간을 나란히', ['랩 시간은 바로 앞 랩부터 이번 랩까지, 누적은 시작부터 지금까지예요. 랩이 둘 이상이면 가장 빠른 랩과 느린 랩에 표시해요.']),
            ('표 그대로 가져가요', ['\'복사\'는 표 모양 그대로 붙여 넣을 수 있게, \'CSV 저장\'은 엑셀·구글 시트에서 열 수 있게 밀리초 값까지 담아요.']),
        ]},
        'alarm': {'h2': '이 알람을 쓰기 전에', 'items': [
            ('이 탭을 열어 두세요', ['알람은 이 페이지가 울려요. 창을 닫거나 컴퓨터가 잠자기에 들어가면 울리지 않아요. 놓치면 안 되는 아침 알람은 휴대폰의 기본 알람 앱을 쓰세요.']),
            ('닫혀 있던 사이 지난 알람은 알려 줘요', ['다시 열었을 때 이미 지난 알람은 목록에 \'지나갔어요\'로 표시하고, 다시 켤 수 있게 남겨 둬요.']),
            ('몇 시간 뒤에 울리는지 보여요', ['시계판에 지금부터 다음 알람까지가 부채꼴로 칠해지고, 목록에는 \'6시간 12분 뒤\'처럼 남은 시간이 적혀요. 12시간이 넘게 남으면 부채꼴은 한 바퀴로 그려요.']),
            ('울리면 끄거나 5분 뒤 다시', ['울리는 동안 화면 위에 띠가 뜨고, 소리 끄기와 5분 뒤 다시 울리기 중에 고를 수 있어요. 알람은 한 번 울리면 꺼져요.']),
        ]},
        'world': {'h2': '시차를 믿고 쓸 수 있게', 'items': [
            ('서머타임 바뀌는 날까지 적어요', [f'도시마다 다음에 시계가 바뀌는 날과 바뀐 뒤 시차를 적어요. 예를 들어 뉴욕은 2026년 11월 1일 새벽 2시에 서머타임이 끝나고, 계산하면 서울과의 시차가 13시간에서 14시간이 돼요({L(NIST, "NIST")}).']),
            ('2026년에 바뀐 시간대도 반영했어요', [f'캐나다 브리티시컬럼비아·앨버타·매니토바는 2026년부터 시계를 더 바꾸지 않고, 모로코는 9월 20일부터 늘 UTC+0이에요({L(IANA, "IANA 시간대 자료")}, {CHK["ko"]}). 브라우저의 시간대 자료가 그보다 예전 것이면 이 사이트가 고친 값으로 계산하고 알려 줘요.']),
            ('모두 근무 시간인 때를 찾아요', ['도시마다 현지 월~금 9시~18시를 근무 시간으로 보고, 그 시각에 시작한 한 시간이 모두 근무 시간 안이면 칠해요. 공휴일은 반영하지 않아요.']),
            ('기준은 이 기기 시간대', ['처음 기준은 기기에 설정된 시간대예요. 위의 \'기준 도시\'에서 다른 도시로 바꿀 수 있어요.']),
        ]},
    },
    'en': {
        'timer': {'h2': 'What this timer promises, and what it cannot do', 'items': [
            ('It rings on time in a background tab', [
                f'It sets one alarm for the moment the timer ends. Chrome may slow repeating timers in hidden tabs to once a minute, but a single timer is still checked once a second ({L(CHROME, "Chrome docs")}, {CHK["en"]}).',
                'The time left is worked out from the end time, not by counting down one second at a time, so it is right the moment you come back.']),
            ('A refresh does not reset it', [
                'Each timer saves its end time in this browser. Reopen the page and it carries on; if it finished while the page was closed, you see how long ago. No sound plays while the page is closed.']),
            ('It cannot ring if the page is closed or the device sleeps', [
                f'Browsers freeze pages to save battery, and a frozen page runs no timers ({L(LIFE, "Chrome docs")}). On a phone, turn on Keep screen on in the settings and leave this page open.']),
            ('Run several at once', [
                'Add up to 8 timers. Give one a name and the alert tells you which one finished. The dial shows the timer you picked.']),
        ]},
        'stopwatch': {'h2': 'How this stopwatch keeps time', 'items': [
            ('It measures from the start time', ['It does not add up ticks. It subtracts the moment you pressed Start from the current time, so switching tabs never loses time.']),
            ('A refresh does not reset it', ['The start time and laps are saved in this browser. Reload or reopen the page and it keeps counting. Reset clears it.']),
            ('Lap time and total side by side', ['Lap time is from the previous lap to this one; total is from Start until now. With two or more laps, the fastest and slowest are marked.']),
            ('Take the table with you', ['Copy pastes as a table. Save CSV opens in Excel or Google Sheets and includes the raw milliseconds.']),
        ]},
        'alarm': {'h2': 'Before you rely on this alarm', 'items': [
            ('Keep this tab open', ['This page plays the alarm. If you close the tab or the computer goes to sleep, it will not ring. For a wake-up alarm you cannot miss, use your phone\'s clock app.']),
            ('Missed alarms are flagged', ['When you come back, any alarm that already passed is marked as missed and kept so you can turn it on again.']),
            ('See how long until it rings', ['The dial shades the time from now to the next alarm, and the list says things like "in 6 h 12 min". Past 12 hours the dial shows a full turn.']),
            ('Stop it or snooze', ['While it rings, a bar appears at the top with Stop sound and Snooze 5 min. An alarm turns off after it rings once.']),
        ]},
        'world': {'h2': 'Time differences you can trust', 'items': [
            ('The next clock change for every city', [f'Each city shows when its clocks change next and the difference afterwards. New York, for example, falls back at 2:00 a.m. on November 1, 2026 ({L(NIST, "NIST")}).']),
            ('The 2026 changes are included', [f'British Columbia, Alberta and Manitoba stopped changing their clocks in 2026, and Morocco moved to UTC+0 for good on September 20 ({L(IANA, "IANA time zone data")}, {CHK["en"]}). If your browser\'s data is older, this site uses the corrected values and tells you.']),
            ('Find hours when everyone is at work', ['Work hours are 9:00 to 18:00 local time, Monday to Friday. A cell is filled when an hour-long meeting starting then fits everyone\'s work hours. Public holidays are not included.']),
            ('Your device sets the reference', ['The comparison starts from your device time zone. Pick another city under Compare with to change it.']),
        ]},
    },
}

FAQ = {
    'ko': {
        'timer': [
            ('타이머 소리가 안 나요.', '\'미리 듣기\'로 먼저 들어 보세요. 휴대폰 무음 모드와 미디어 볼륨, 연결된 블루투스 기기를 확인해 주세요. 브라우저는 페이지를 한 번 누르기 전에는 소리를 막을 수 있어서, 새로고침한 뒤 이어진 타이머는 화면을 한 번 눌러 두면 소리가 나요.'),
            ('최대 몇 시간까지 맞출 수 있나요?', '99시간 59분 59초까지예요. 시계판 한 바퀴는 맞춘 시간에 따라 1분·5분·10분·15분·20분·30분·1시간에서 24시간 판까지 바뀌고, 판 위쪽에 단위가 적혀요.'),
            ('휴대폰 화면이 꺼지면 울리나요?', '울리지 않을 수 있어요. 화면이 꺼지거나 다른 앱으로 가면 브라우저가 페이지를 멈추기도 해요. \'화면·소리 설정\'에서 \'화면 켜 두기\'를 켜고 이 화면을 띄워 두세요.'),
            ('시계판은 어떻게 읽나요?', '청록 부채꼴이 남은 시간이에요. 시간이 갈수록 12시 쪽으로 줄어들어요. 멈춘 상태에서는 동그란 손잡이를 끌거나 판을 돌려 분을 맞출 수 있어요.'),
            ('단축키가 있나요?', '스페이스 시작·멈춤, R 초기화, F 전체 화면, + 1분 더하기, Esc 울리는 소리 끄기예요. 한글 자판 그대로(ㄱ, ㄹ)도 돼요.'),
            ('맞춘 타이머가 어디로 보내지나요?', '아니요. 타이머 이름과 시간은 이 기기의 브라우저에만 저장되고 서버로 보내지 않아요.'),
        ],
        'stopwatch': [
            ('랩 시간과 누적 시간은 무엇이 다른가요?', '랩 시간은 바로 앞 랩부터 이번 랩까지 걸린 시간, 누적 시간은 시작부터 그 랩을 누른 순간까지예요. 자세한 예는 <a href="/ko/guide/lap-split/">랩 타임과 스플릿 타임</a> 글에 있어요.'),
            ('다른 탭에 가도 계속 재나요?', '네. 시작한 시각과의 차이로 재기 때문에 다른 탭에 있거나 화면이 잠깐 멈춰도 시간이 빠지지 않아요.'),
            ('랩 기록을 남기려면요?', '\'복사\'를 누르면 표 그대로 붙여 넣을 수 있고, \'CSV 저장\'은 엑셀·구글 시트에서 여는 파일을 받아요.'),
            ('단축키가 있나요?', '스페이스 시작·멈춤, L 랩, R 초기화예요. 한글 자판 그대로(ㅣ, ㄱ)도 돼요.'),
            ('얼마나 정확한가요?', '화면에는 백분의 1초까지 보여 주지만, 누르는 손과 기기 화면의 지연이 더해져요. 공식 경기 기록 장비를 대신하지는 않아요.'),
        ],
        'alarm': [
            ('컴퓨터가 잠자기에 들어가면 울리나요?', '울리지 않아요. 잠자기·창 닫기·브라우저 종료 때는 페이지가 멈춰요. 다시 열면 지나간 알람을 표시해요.'),
            ('매일 같은 시각에 울리게 할 수 있나요?', '지금은 한 번 울리면 꺼지는 알람만 있어요. 목록에서 다시 켜면 다음 그 시각에 울려요.'),
            ('알람 소리가 안 나요.', '\'미리 듣기\'로 확인하고, 기기 볼륨과 무음 모드를 봐 주세요. 브라우저는 페이지를 한 번 누르기 전에는 소리를 막을 수 있어서, 새로고침한 뒤에는 화면을 한 번 눌러 두세요.'),
            ('몇 개까지 맞출 수 있나요?', '12개까지예요. 알람마다 이름을 붙이면 울릴 때 이름이 떠요.'),
        ],
        'world': [
            ('계절마다 시차가 달라지는 이유는요?', '서머타임 때문이에요. 미국·유럽·호주 등은 여름에 시계를 1시간 앞당겨서, 서머타임이 없는 한국과의 시차가 1시간 달라져요. 도시마다 다음 바뀌는 날이 적혀 있어요.'),
            ('한국은 서머타임을 하나요?', '지금은 하지 않아요. 시간대 자료(IANA)에 따르면 1987년과 1988년에 시행한 뒤로는 없어요.'),
            ('찾는 도시가 없어요.', '같은 나라의 큰 도시를 넣어 보세요. 같은 시간대라면 시각이 같아요. 예: 오사카는 도쿄와 같은 시각이에요.'),
            ('회의 시간의 근무 시간 기준은요?', '현지 월~금 9시~18시예요. 그 시각에 시작한 한 시간이 모두의 근무 시간 안에 들어가면 진하게 칠해요. 나라별 공휴일은 반영하지 않아요.'),
        ],
    },
    'en': {
        'timer': [
            ('Why is there no sound?', 'Try Test sound first. Check the phone\'s silent switch, media volume and any Bluetooth device. Browsers may block sound until you tap the page once, so after a refresh, tap the page once and the alarm can play.'),
            ('How long can a timer run?', 'Up to 99 hours 59 minutes 59 seconds. The dial switches between 1, 5, 10, 15, 20, 30 and 60 minutes per turn, and up to 24 hours, with the unit printed at the top.'),
            ('Will it ring if my phone screen turns off?', 'It may not. When the screen turns off or you switch apps, the browser can pause the page. Turn on Keep screen on under Screen and sound settings and leave the page open.'),
            ('How do I read the dial?', 'The teal band is the time left; it shrinks back toward 12 as time passes. While stopped, drag the round handle or turn the dial to set minutes.'),
            ('Are there keyboard shortcuts?', 'Space starts and pauses, R resets, F goes full screen, + adds a minute and Esc stops the sound.'),
            ('Is my timer sent anywhere?', 'No. Timer names and times are kept in this browser only and never sent to a server.'),
        ],
        'stopwatch': [
            ('What is the difference between lap time and total time?', 'Lap time is how long this lap took since the previous one; total is the time from Start to the moment you pressed Lap. See <a href="/guide/lap-vs-split-time/">lap time vs split time</a> for worked examples.'),
            ('Does it keep counting in another tab?', 'Yes. It measures from the moment you pressed Start, so nothing is lost while the tab is hidden.'),
            ('How do I keep my laps?', 'Copy pastes the table as it is, and Save CSV downloads a file for Excel or Google Sheets.'),
            ('Are there keyboard shortcuts?', 'Space starts and stops, L records a lap and R resets.'),
            ('How accurate is it?', 'The display shows hundredths of a second, but your reaction time and screen delay add to it. It does not replace official race timing equipment.'),
        ],
        'alarm': [
            ('Will it ring if my computer goes to sleep?', 'No. Sleep, closing the tab or quitting the browser stops the page. When you come back, missed alarms are flagged.'),
            ('Can it ring every day?', 'Not yet. An alarm turns off after it rings once; switch it back on in the list and it rings at that time next.'),
            ('Why is there no sound?', 'Use Test sound and check the volume and silent mode. Browsers may block sound until you tap the page once, so after a refresh tap the page once.'),
            ('How many alarms can I set?', 'Up to 12. Give each one a label and it shows when it rings.'),
        ],
        'world': [
            ('Why does the time difference change during the year?', 'Daylight saving time. Many places move their clocks an hour forward in summer, so the gap to places without it changes by an hour. Each city shows its next change.'),
            ('Which places stopped changing their clocks in 2026?', f'According to the {L(IANA, "IANA time zone data")}, British Columbia, Alberta, the Northwest Territories and Manitoba in Canada stay on one time all year from 2026, and Morocco is on UTC+0 all year from September 20, 2026.'),
            ('My city is not in the list.', 'Try a larger city in the same country. Cities in the same time zone show the same time, so Osaka matches Tokyo.'),
            ('What counts as work hours in the meeting planner?', '9:00 to 18:00 local time, Monday to Friday. A cell is filled when an hour-long meeting starting then fits everyone\'s work hours. Public holidays are not included.'),
        ],
    },
}


def _about(lang):
    if lang == 'ko':
        return f'''<h1>한바퀴 소개</h1>
<p>한바퀴는 시계판 하나로 쓰는 시간 도구예요. 타이머는 남은 시간을, 스톱워치는 지나간 시간을, 알람은 지금부터 울릴 때까지를 시계판 부채꼴로 보여 줘요. 세계 시간은 도시마다 시차와 다음 서머타임 바뀌는 날을 적어요.</p>
<h2>무엇을 하나요</h2>
<ul><li>타이머: 판을 돌리거나 시·분·초를 넣어 맞추고, 8개까지 같이 돌려요. 끝나는 시각을 이 기기에 적어 두어 새로고침해도 이어져요.</li>
<li>스톱워치: 백분의 1초까지, 랩 시간과 누적 시간, 가장 빠른·느린 랩, 복사와 CSV 저장.</li>
<li>알람: 시각을 맞추면 이 화면에서 울려요. 5분 뒤 다시 울리기, 지나간 알람 표시.</li>
<li>세계 시간: {{NCITY}}개 도시, 다음 서머타임 바뀌는 날, 모두 근무 시간인 회의 시각 찾기.</li></ul>
<h2>못 하는 것</h2>
<p>웹페이지라서 창을 닫거나 기기가 잠들면 울리지 않아요. 휴대폰은 화면이 꺼지면 브라우저가 페이지를 멈출 수 있어요. 놓치면 안 되는 알람은 휴대폰의 기본 알람 앱을 쓰세요.</p>
<h2>시간대 자료</h2>
<p>도시별 시각은 브라우저에 들어 있는 시간대 자료(IANA)로 계산해요. 2026년에 바뀐 캐나다 세 주와 모로코의 규칙은 브라우저 자료가 예전 것이어도 맞게 계산하도록 이 사이트가 따로 고쳐 넣었어요({L(IANA, "IANA 변경 기록")}, {CHK['ko']}). 시험할 때는 파이썬 zoneinfo로 구한 값과 도시 시간대마다 대조해요.</p>
<h2>만든 곳</h2>
<p>루멘랩(Lumen Lab)이 만들었어요. 틀린 곳이나 바라는 기능은 <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>로 알려 주세요. 다른 도구는 <a href="https://lumenlab.page/">lumenlab.page</a>에 있어요.</p>'''
    return f'''<h1>About Oneturn</h1>
<p>Oneturn is a set of time tools built around one dial. The timer shows the time left, the stopwatch the time gone by, and the alarm the time until it rings, all as a band on the dial. The world clock gives each city's time difference and its next daylight saving change.</p>
<h2>What it does</h2>
<ul><li>Timer: turn the dial or type hours, minutes and seconds; run up to 8 at once. The end time is saved, so a refresh does not reset it.</li>
<li>Stopwatch: hundredths of a second, lap and total time, fastest and slowest lap, copy and CSV export.</li>
<li>Alarm: set a time and this page rings. Snooze for five minutes; missed alarms are flagged.</li>
<li>World clock: {{NCITY}} cities, the next clock change for each, and the hours when everyone is at work.</li></ul>
<h2>What it cannot do</h2>
<p>It is a web page, so it cannot ring after you close the tab or the device sleeps. Phones may pause the page when the screen turns off. Use your phone's clock app for an alarm you cannot miss.</p>
<h2>Time zone data</h2>
<p>City times come from the time zone database built into your browser (IANA). The 2026 rule changes for three Canadian provinces and Morocco are applied by this site even if your browser's data is older ({L(IANA, "IANA change log")}, {CHK['en']}). The tests compare every city's time zone with Python's zoneinfo.</p>
<h2>Who makes it</h2>
<p>Made by Lumen Lab. Found a mistake or want a feature? Write to <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>. More tools at <a href="https://lumenlab.page/en/">lumenlab.page</a>.</p>'''


STORE_KEYS = ['ot.set', 'ot.timers', 'ot.watch', 'ot.alarms', 'ot.cities', 'ot.lang']


def _privacy(lang):
    if lang == 'ko':
        return f'''<h1>개인정보 처리방침</h1>
<p>마지막 확인: 2026년 10월 14일</p>
<h2>이 사이트가 이 기기에 남기는 것</h2>
<p>타이머·스톱워치·알람·도시 목록을 다음에도 쓰도록 이 기기의 브라우저 저장소(localStorage)에만 적어요. 서버로 보내지 않아요. 키는 다음 여섯 개예요.</p>
<ul><li><code>ot.set</code>: 소리 종류, 화면 켜 두기, 컴퓨터 알림, 움직임, 화면 색 설정</li>
<li><code>ot.timers</code>: 타이머마다 이름, 맞춘 시간, 끝나는 시각</li>
<li><code>ot.watch</code>: 스톱워치 시작 시각과 랩 기록</li>
<li><code>ot.alarms</code>: 알람 시각, 이름, 켜짐 여부, 맞출 때의 기기 시간대</li>
<li><code>ot.cities</code>: 세계 시간의 도시 목록과 기준 도시</li>
<li><code>ot.lang</code>: 다른 언어 안내를 닫았는지</li></ul>
<p>브라우저 설정에서 이 사이트의 데이터를 지우면 모두 사라져요.</p>
<h2>방문 통계</h2>
<p>사이트를 호스팅하는 Cloudflare가 방문 통계(Cloudflare Web Analytics)를 위해 작은 스크립트를 페이지에 넣어요. 본 페이지 주소, 직전 페이지 주소, 페이지가 열리는 데 걸린 시간, 브라우저 종류 같은 것을 모으고 쿠키는 쓰지 않아요. 맞춘 타이머나 도시 목록은 여기에 들어가지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스 광고를 보여 줄 수 있어요. Google을 비롯한 제3자 광고 업체는 쿠키를 써서 이 사이트와 다른 사이트에 방문한 기록을 바탕으로 광고를 보여 줄 수 있고, 웹 비콘으로 정보를 모을 수 있어요. 자세한 내용은 <a href="https://policies.google.com/technologies/partner-sites">파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에서 볼 수 있고, 맞춤 광고는 <a href="https://adssettings.google.com/">Google 광고 설정</a>에서 끌 수 있어요. 유럽 경제 지역·영국·스위스에서는 Google의 동의 메시지가 먼저 떠요.</p>
<h2>알림</h2>
<p>\'컴퓨터 알림\'을 켜면 브라우저가 알림 권한을 물어요. 알림은 이 기기 안에서만 띄우고, 알림 내용(타이머 이름)은 서버로 보내지 않아요.</p>
<h2>문의</h2>
<p>루멘랩: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''
    return f'''<h1>Privacy Policy</h1>
<p>Last checked: October 14, 2026</p>
<h2>What this site keeps on your device</h2>
<p>So your timers, stopwatch, alarms and cities are there next time, they are saved in this browser's storage (localStorage) only. Nothing is sent to a server. These are the six keys:</p>
<ul><li><code>ot.set</code>: sound, keep screen on, desktop notification, motion and color settings</li>
<li><code>ot.timers</code>: each timer's name, length and end time</li>
<li><code>ot.watch</code>: the stopwatch start time and laps</li>
<li><code>ot.alarms</code>: alarm times, labels, on/off and the device time zone when set</li>
<li><code>ot.cities</code>: your world clock cities and the comparison city</li>
<li><code>ot.lang</code>: whether you closed the language suggestion</li></ul>
<p>Clearing this site's data in your browser settings removes all of it.</p>
<h2>Visit statistics</h2>
<p>Cloudflare, which hosts the site, adds a small script for visit statistics (Cloudflare Web Analytics). It collects things like the page address, the previous page address, how long the page took to load and the browser type, and it does not use cookies. Your timers and city list are not part of it.</p>
<h2>Advertising</h2>
<p>This site may show Google AdSense ads. Third-party vendors, including Google, use cookies to serve ads based on your visits to this and other websites, and may collect information through web beacons. See <a href="https://policies.google.com/technologies/partner-sites">How Google uses data when you use our partners' sites or apps</a>; you can turn off personalized ads in <a href="https://adssettings.google.com/">Google Ad Settings</a>. Visitors in the EEA, the UK and Switzerland see Google's consent message first.</p>
<h2>Notifications</h2>
<p>If you turn on desktop notifications, the browser asks for permission. Notifications are shown on this device only; the timer name is not sent anywhere.</p>
<h2>Contact</h2>
<p>Lumen Lab: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''


for _l in ('ko', 'en'):
    PAGES[_l]['about']['body'] = _about(_l)
    PAGES[_l]['privacy']['body'] = _privacy(_l)
