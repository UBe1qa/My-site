"""토독 화면 글(두 언어). build.py 가 읽는다. 글(가이드)은 articles.py 에 따로 있다.
- JS[lang]   : assets/app.js 가 쓰는 문구(페이지의 #tj-cfg JSON 으로 들어간다)
- TX[lang]   : HTML 틀에 들어가는 문구
- TOOLS      : 도구 페이지(주소·제목·설명·배치·옵션)
- BASIS, FAQ : 계산 기준과 자주 묻는 질문(FAQ 는 화면과 JSON-LD 에 같은 글자로 들어간다)
화면 말: '글쇠'·'낱말' 대신 '키'·'단어'(처음 온 사람이 걸리는 말이라서). 말투는 해요체.
"""

SOURCE_DHAKAL = 'https://userinterfaces.aalto.fi/136Mkeystrokes/'
SOURCE_DHAKAL_PDF = 'https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf'
CHECKED = '2026-10-10'  # 공식 출처를 확인한 날

JS = {
    'ko': {
        'brand': '토독', 'unit': '타/분', 'unitShort': '타', 'accuracy': '정확도', 'sec': '초', 'space': '띄어쓰기', 'enter': '줄바꿈', 'times': '번',
        'needKo': '<kbd>한/영</kbd> 키를 눌러 한글로 바꿔 주세요', 'needEn': '<kbd>한/영</kbd> 키를 눌러 영어로 바꿔 주세요', 'caps': '<kbd>Caps Lock</kbd>이 켜져 있어요',
        'none': '틀린 키가 없어요', 'missed': '틀린 키', 'slow': '느린 키', 'touchNote': '터치 자판이라 글자 단위로 쟀어요. 느린 키는 재지 않아요.',
        'timeLeft': '남은 시간(초)', 'elapsed': '걸린 시간(초)', 'progress': '문장',
        'daily': '{m}월 {d}일의 글', 'drillLabel': '틀린 키만 모은 연습',
        'formulaKo': '맞게 친 {n}타 ÷ {t}초 × 60 = {s}타/분', 'formulaEn': '맞게 친 {n}자 ÷ 5 ÷ {t}초 × 60 = {s} WPM',
        'alsoWpm': '{w} WPM',
        'accDetail': '누른 키 {typed}개 중 {ok}개 맞음',
        'rawKo': '총 타수 {s}타/분 = 누른 {n}타 ÷ {t}초 × 60', 'rawEn': '총 WPM {w} = 누른 키 {n}개 ÷ 5 ÷ {t}초 × 60', 'rawAlso': '총 WPM {w}',
        'withPunct': '문장부호', 'withNums': '숫자', 'recMore': '더 보기({n}개)', 'recLess': '접기',
        'skipped': '한/영이나 Caps Lock이 반대로 켜진 동안 친 키 {n}개는 세지 않았어요.',
        'first': '첫 기록이에요. 다음 판부터 이 기록과 견줘요.',
        'diffUp': '지난번보다 +{d}{u}', 'diffDown': '지난번보다 −{d}{u}', 'diffSame': '지난번과 같아요', 'bestIs': '내 최고 {b}{u}',
        'newBest': '최고 기록이에요. 앞 기록 {b}{u}', 'drillDone': '틀린 키 연습은 기록에 넣지 않아요.',
        'kinds': {'sentences': '문장', 'words': '단어', 'proverbs': '속담', 'pangrams': '팬그램', 'lesson': '자리 연습',
                  'all': '전체', 'daily': '일상', 'season': '계절', 'food': '음식', 'work': '일'},
        'lenSecs': '{n}초', 'lenSent': '{n}문장', 'sizes': {'25': '짧게', '50': '보통', '100': '길게'},
        'lenTime': '시간(초)', 'lenSize': '분량',
        'lessons': ['기본 자리', '윗줄', '아랫줄', 'Shift 키', '전체'], 'lessonN': '{n}단계 {name}',
        'lessonSay': ['손가락을 올려 두는 가운데 줄이에요. ㅁㄴㅇㄹ과 ㅓㅏㅣ, 집게손가락을 안쪽으로 뻗는 ㅎㅗ.',
                      '가운데 줄에서 손가락을 위로 뻗어요. ㅂㅈㄷㄱㅅ과 ㅛㅕㅑㅐㅔ.',
                      '가운데 줄에서 손가락을 아래로 내려요. ㅋㅌㅊㅍ과 ㅠㅜㅡ.',
                      'Shift를 누른 채 치는 ㄲㄸㅃㅆㅉ과 ㅒㅖ. Shift는 반대쪽 손 새끼손가락으로 눌러요.',
                      '배운 키를 모두 써서 짧은 문장을 쳐요.'],
        'passed': '{n}단계 통과예요.', 'passedAll': '마지막 단계까지 통과했어요. 이제 속도 측정으로 가 보세요.',
        'notPassed': '정확도가 {a}% 이상이면 다음 단계로 가요.', 'nextLesson': '다음 단계: {name}', 'againBtn': '한 번 더',
        'nextKey': '다음 키', 'fingers': ['엄지', '왼손 새끼손가락', '왼손 약손가락', '왼손 가운뎃손가락', '왼손 집게손가락', '오른손 집게손가락', '오른손 가운뎃손가락', '오른손 약손가락', '오른손 새끼손가락'],
        'kbShow': '자판 보기', 'kbHide': '자판 가리기',
        'todayAt': '오늘 {t}', 'dateFmt': '{m}월 {d}일', 'bestTag': '최고', 'recBest': '{c} 최고 {b}{u}',
        'clearBtn': '기록 지우기', 'clearSure': '한 번 더 누르면 지워요', 'cleared': '기록을 지웠어요.',
        'speedNow': '지금 속도', 'thisRun': '이번 기록',
        'topicSay': {'all': '모든 주제에서 골랐어요', 'daily': '일상을 쓴 문장', 'season': '계절을 쓴 문장', 'food': '음식을 쓴 문장', 'work': '일과 연습을 쓴 문장', 'proverbs': '전해 오는 속담'},
    },
    'en': {
        'brand': 'Todok', 'unit': 'WPM', 'unitShort': ' WPM', 'accuracy': 'Accuracy', 'sec': 's', 'space': 'Space', 'enter': 'Enter', 'times': '×',
        'needKo': 'Switch your keyboard to Korean', 'needEn': 'Your keyboard is set to another language. Switch it to English',
        'caps': '<kbd>Caps Lock</kbd> is on',
        'none': 'No missed keys', 'missed': 'Missed', 'slow': 'Slow', 'touchNote': 'Measured per character on a touch keyboard. Slow keys are not timed.',
        'timeLeft': 'Seconds left', 'elapsed': 'Seconds', 'progress': 'Sentence',
        'daily': 'Text for {mon} {d}', 'drillLabel': 'Practice for your missed keys',
        'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        'formulaKo': '{n} correct keystrokes ÷ {t} s × 60 = {s} per minute', 'formulaEn': '{n} correct characters ÷ 5 ÷ {t} s × 60 = {s} WPM',
        'alsoWpm': '{w} WPM',
        'accDetail': '{ok} of {typed} key presses correct',
        'rawKo': 'Raw {s} keystrokes per minute = {n} keystrokes ÷ {t} s × 60', 'rawEn': 'Raw {w} WPM = {n} key presses ÷ 5 ÷ {t} s × 60', 'rawAlso': 'raw {w} WPM',
        'withPunct': 'punctuation', 'withNums': 'numbers', 'recMore': 'Show all ({n})', 'recLess': 'Show fewer',
        'skipped': '{n} key presses made with the wrong keyboard layout or Caps Lock were not counted.',
        'first': 'Your first result. The next one will be compared with it.',
        'diffUp': '+{d}{u} from last time', 'diffDown': '−{d}{u} from last time', 'diffSame': 'Same as last time', 'bestIs': 'your best {b}{u}',
        'newBest': 'New best. Previous best {b}{u}', 'drillDone': 'Missed-key practice is not added to your results.',
        'kinds': {'sentences': 'Sentences', 'words': 'Words', 'pangrams': 'Pangrams', 'lesson': 'Practice'},
        'lenSecs': '{n} s', 'lenSent': '{n} sentences', 'sizes': {'25': 'Short', '50': 'Medium', '100': 'Long'},
        'lenTime': 'Seconds', 'lenSize': 'Length',
        'lessons': ['Home row', 'Top row', 'Bottom row', 'Shift', 'All keys'], 'lessonN': 'Step {n}: {name}',
        'lessonSay': ['The row your fingers rest on: A S D F and J K L ; plus G and H, which the index fingers reach inward for.',
                      'Reach up from the home row: Q W E R T and Y U I O P.',
                      'Reach down from the home row: Z X C V B and N M , .',
                      'Capitals and marks that need Shift. Hold Shift with the little finger of the other hand.',
                      'Short sentences that use every key you have practiced.'],
        'passed': 'Step {n} passed.', 'passedAll': 'You passed the last step. Try the typing test next.',
        'notPassed': 'Reach {a}% accuracy or higher to move on to the next step.', 'nextLesson': 'Next step: {name}', 'againBtn': 'Once more',
        'nextKey': 'Next key', 'fingers': ['thumb', 'left little finger', 'left ring finger', 'left middle finger', 'left index finger', 'right index finger', 'right middle finger', 'right ring finger', 'right little finger'],
        'kbShow': 'Show keyboard', 'kbHide': 'Hide keyboard',
        'todayAt': 'Today {t}', 'dateFmt': '{m}/{d}', 'bestTag': 'best', 'recBest': '{c}: best {b} {u}',
        'clearBtn': 'Clear results', 'clearSure': 'Press again to clear', 'cleared': 'Results cleared.',
        'speedNow': 'Speed now', 'thisRun': 'This run', 'topicSay': {},
    },
}

TX = {
    'ko': {
        'brand': '토독', 'skip': '본문으로 건너뛰기', 'nav_label': '사이트 메뉴', 'lang_other': 'English', 'lang_offer': 'English version', 'lang_bar': 'This page is in Korean.', 'close': '닫기',
        'guides': '가이드', 'about': '소개', 'privacy': '개인정보 처리방침', 'contact': '문의', 'ad': '광고', 'home': '타자 속도 측정으로 가기',
        'lumen': '만든 곳 루멘랩', 'lumen_s': '다른 앱과 도구 보기',
        'kind_l': '글', 'more': '설정', 'mode_l': '재는 방법', 'mode_time': '시간', 'mode_count': '분량', 'punct': '문장부호 넣기', 'nums': '숫자 넣기',
        'keys_note': '<kbd>Tab</kbd> 다른 글 · <kbd>Esc</kbd> 처음으로(치는 칸에서 나오기)',
        'esc_note': '<kbd>Esc</kbd>를 누르면 치는 칸에서 나와요.',
        'start_pc': '첫 글자부터 치면 바로 시작해요', 'start_off': '글을 누르거나 아무 키나 치면 시작해요', 'start_mo': '글을 누르면 자판이 열려요',
        'trap': '화면에 보이는 글을 따라 치세요', 'trap_help': '칠 글은 이 칸 바로 앞 문단에 있어요. Esc를 누르면 치는 칸에서 나오고, Tab을 누르면 다른 글로 바뀌어요.', 'unit': '타/분', 'acc_pct': '정확도 %', 'left': '남은 시간(초)', 'nextkey': '다음 키',
        'fresh': '다른 글', 'quit': '그만', 'quit2': '처음 화면으로',
        'acc': '정확도', 'again': '다른 글로 다시', 'same': '같은 글 다시', 'drill': '틀린 키만 연습', 'share': '결과 그림 저장',
        'chart_aria': '초마다 속도 그래프', 'chart_cap': '초마다 속도', 'chart_err': '틀린 키가 있던 초',
        'rec_h': '내 기록', 'rec_note': '이 기기에만 저장돼요.', 'rec_empty': '<b>아직 기록이 없어요.</b> 한 판 치면 속도와 정확도가 여기에 쌓이고, 다음 판부터 지난 기록과 견줘 드려요.',
        'rec_keys_h': '자주 틀린 키', 'rec_keys_empty': '틀린 키가 쌓이면 여기에 모여요.', 'rec_drill': '이 키들만 연습',
        'basis_h': '계산 기준', 'faq_h': '자주 묻는 질문', 'guides_h': '타자 연습 가이드', 'guides_all': '가이드 전체 보기', 'tools_h': '다른 연습',
        'kb_legend_m': '틀린 키', 'kb_legend_s': '느린 키', 'kb_hide': '자판 가리기', 'steps_l': '단계',
        'mine': '내가 친 글', 'look': '보고 치는 글', 'count_l': '한 번에', 'topic_l': '주제',
        'mo_kb': '휴대폰에서는 기기 자판으로 쳐요. 손가락 자리 안내는 컴퓨터 자판에 맞춘 것이에요.',
        'checked': '마지막 확인', 'published': '처음 쓴 날', 'crumb_home': '토독', 'crumb_guides': '가이드', 'try': '바로 재 보기',
        'nf_title': '없는 페이지예요', 'swipe': '표를 옆으로 밀어 보세요',
    },
    'en': {
        'brand': 'Todok', 'skip': 'Skip to content', 'nav_label': 'Site menu', 'lang_other': '한국어', 'lang_offer': '한국어판 보기', 'lang_bar': '이 페이지는 영어판이에요.', 'close': 'Close',
        'guides': 'Guides', 'about': 'About', 'privacy': 'Privacy', 'contact': 'Contact', 'ad': 'Ad', 'home': 'Go to the typing test',
        'lumen': 'Made by Lumen Lab', 'lumen_s': 'See our other apps and tools',
        'kind_l': 'Text', 'more': 'Settings', 'mode_l': 'Measure by', 'mode_time': 'Time', 'mode_count': 'Length', 'punct': 'Add punctuation', 'nums': 'Add numbers',
        'keys_note': '<kbd>Tab</kbd> new text · <kbd>Esc</kbd> reset and leave the typing field',
        'esc_note': 'Press <kbd>Esc</kbd> to leave the typing field.',
        'start_pc': 'Type the first letter to start', 'start_off': 'Click the text or press any key to start', 'start_mo': 'Tap the text to open your keyboard',
        'trap': 'Type the text shown on screen', 'trap_help': 'The text to type is in the paragraph right before this field. Press Esc to leave the typing field, or Tab for a new text.', 'unit': 'WPM', 'acc_pct': 'Accuracy %', 'left': 'Seconds left', 'nextkey': 'Next key',
        'fresh': 'New text', 'quit': 'Stop', 'quit2': 'Back to start',
        'acc': 'Accuracy', 'again': 'Try again', 'same': 'Same text', 'drill': 'Practice missed keys', 'share': 'Save result image',
        'chart_aria': 'Speed for each second', 'chart_cap': 'Speed each second', 'chart_err': 'a second with a missed key',
        'rec_h': 'Your results', 'rec_note': 'Stored on this device only.', 'rec_empty': '<b>No results yet.</b> Finish one test and it shows up here. From the next one on, each result is compared with your last.',
        'rec_keys_h': 'Keys you miss most', 'rec_keys_empty': 'Missed keys will collect here.', 'rec_drill': 'Practice these keys',
        'basis_h': 'How the numbers are calculated', 'faq_h': 'Questions people ask', 'guides_h': 'Typing guides', 'guides_all': 'All guides', 'tools_h': 'More practice',
        'kb_legend_m': 'Missed', 'kb_legend_s': 'Slow', 'kb_hide': 'Hide keyboard', 'steps_l': 'Step',
        'mo_kb': 'On a phone you type with the device keyboard. The finger guide is for a physical keyboard.',
        'checked': 'Last checked', 'published': 'First published', 'crumb_home': 'Todok', 'crumb_guides': 'Guides', 'try': 'Try the test',
        'nf_title': 'Page not found', 'swipe': 'Swipe the table sideways',
    },
}

NAV = {
    'en': [('', 'Typing Test', 'test'), ('practice/', 'Practice', 'practice'), ('guide/', 'Guides', 'guide')],
    'ko': [('', '속도 측정', 'test'), ('practice/', '자리 연습', 'practice'), ('sentences/', '문장 연습', 'sentences'), ('english/', '영타 연습', 'english'), ('guide/', '가이드', 'guide')],
}
# 같은 역할이라 서로 잇는 페이지(영어 경로 -> 한국어 경로). 문장 연습·영타 연습(한국어)은 짝이 없다. 글은 articles.py 의 pair.
PAIRS = {'': '', 'practice/': 'practice/', 'guide/': 'guide/', 'about/': 'about/', 'privacy/': 'privacy/'}

# 연구 값 한 줄(영어 타자에만 곁들인다. verified-facts 14번: Dhakal 외 2018, 2026-10-10 확인)
CTX = {
    'en': f'For context: in a 2018 study, 168,960 volunteers who took an online English typing test averaged 51.56 WPM. They chose to take part and copied English sentences, so this is not a world average. <a href="{SOURCE_DHAKAL}" rel="noopener">Dhakal et al., CHI 2018</a> (checked 2026-10-10).',
    'ko': f'참고: 2018년 연구에서 온라인 영어 타자 시험에 스스로 참여한 168,960명의 평균은 51.56 WPM이었어요. 영어 문장을 베껴 친 값이라 세계 평균은 아니에요. <a href="{SOURCE_DHAKAL}" rel="noopener">Dhakal 외, CHI 2018</a> (2026-10-10 확인).',
}

TOOLS = {
    ('ko', 'test'): dict(
        path='', layout='a', text='ko', tool='test', kinds=['sentences', 'words', 'proverbs'], kind='sentences',
        title='타자 속도 측정·타자 연습 (한글·영어) | 토독', h1='타자 속도 측정',
        desc='들어오자마자 치는 무료 타자 속도 측정이에요. 한글 두벌식 타수(타/분)와 정확도를 재고, 끝나면 자주 틀린 키와 느린 키를 자판 그림으로 알려 줘요.',
        app_name='토독 타자 속도 측정',
        basis='타수는 맞게 친 키 수(Shift 포함)를 분으로 나눈 값이에요. 다른 프로그램과 숫자가 다를 수 있어요.',
        safe='친 글과 기록은 이 기기 밖으로 나가지 않아요.',
    ),
    ('ko', 'practice'): dict(
        path='practice/', layout='c', text='ko', tool='practice',
        title='한글 타자 자리 연습: 두벌식 기본 자리부터 다섯 단계 | 토독', h1='타자 자리 연습',
        desc='두벌식 자판을 기본 자리, 윗줄, 아랫줄, Shift 키, 전체 순서로 익히는 무료 자리 연습이에요. 화면 자판이 다음에 누를 키와 손가락을 알려 줘요.',
        app_name='토독 타자 자리 연습',
        basis='배운 키만으로 칠 수 있는 글이 나와요. 정확도가 95% 이상이면 다음 단계로 가요.',
        safe='친 글과 기록은 이 기기 밖으로 나가지 않아요.',
    ),
    ('ko', 'sentences'): dict(
        path='sentences/', layout='b', text='ko', tool='sentences', topics=['all', 'daily', 'season', 'food', 'work', 'proverbs'], counts=[5, 10, 20], count=5,
        title='타자 문장 연습: 짧은 글과 속담 따라 치기 | 토독', h1='타자 문장 연습',
        desc='시간 제한 없이 한 문장씩 보고 치는 한글 타자 문장 연습이에요. 일상·계절·음식·일을 쓴 문장 200여 개와 전해 오는 속담을 골라 칠 수 있어요.',
        app_name='토독 타자 문장 연습',
        basis='시간 제한이 없어요. 고른 문장을 다 치면 타수와 정확도가 나와요. 문장 끝에서는 띄어쓰기나 Enter로 다음 문장으로 넘어가요.',
        safe='친 글과 기록은 이 기기 밖으로 나가지 않아요.',
    ),
    ('ko', 'english'): dict(
        path='english/', layout='a', text='en', tool='english', kinds=['words', 'sentences', 'pangrams'], kind='words', both=True,
        title='영타 연습: 영어 타자 속도 측정 (타수·WPM) | 토독', h1='영타 연습',
        desc='영어 타자 속도를 타수(타/분)와 WPM으로 같이 재는 영타 연습이에요. 흔한 영어 단어와 문장을 치고, 끝나면 틀린 키와 느린 키를 알려 줘요.',
        app_name='토독 영타 연습',
        basis='타수는 맞게 친 키 수(대문자·기호의 Shift 포함), WPM은 맞게 친 글자 수 ÷ 5를 분으로 나눈 값이에요.',
        safe='친 글과 기록은 이 기기 밖으로 나가지 않아요.',
    ),
    ('en', 'test'): dict(
        path='', layout='a', text='en', tool='test', kinds=['words', 'sentences'], kind='words',
        title='Typing Test (WPM): Free Typing Speed Test | Todok', h1='Typing Test',
        desc='A free typing speed test with no sign-up. Start typing to measure WPM and accuracy over 15 to 120 seconds, then see which keys you missed and which were slow.',
        app_name='Todok Typing Test',
        basis='WPM here is correct characters ÷ 5 ÷ minutes. Other sites may count differently.',
        safe='What you type and your results stay on this device.',
    ),
    ('en', 'practice'): dict(
        path='practice/', layout='c', text='en', tool='practice',
        title='Typing Practice: Home Row to Full Keyboard, with a Finger Guide | Todok', h1='Typing Practice',
        desc='Free touch typing practice in five steps: home row, top row, bottom row, Shift, then full sentences. An on-screen keyboard shows the next key and the finger to use.',
        app_name='Todok Typing Practice',
        basis='Each step only uses keys you have already practiced. Reach 95% accuracy or higher to move on.',
        safe='What you type and your results stay on this device.',
    ),
}

# 계산 기준: (이름, 설명). 화면에 밝히는 기준이라 로직(tj-core.js)과 글자 그대로 맞아야 한다.
BASIS = {
    'ko': [
        ('타수(타/분)', '맞게 친 키 수 ÷ 걸린 시간(초) × 60. 두벌식 키로 세어요. 쌍자음(ㄲㄸㅃㅆㅉ)과 ㅒ·ㅖ, 영어 대문자는 Shift를 같이 누르니 2타, 겹받침(ㄳ = ㄱ + ㅅ)과 겹모음(ㅘ = ㅗ + ㅏ)은 키 두 개라 2타, 띄어쓰기와 줄바꿈은 1타예요. 예: \'한글 타자\'는 3 + 3 + 1 + 2 + 2 = 11타.'),
        ('끝났을 때의 글 기준', '타수에는 끝났을 때 화면에 맞게 남아 있는 키만 들어가요. 틀렸다가 고쳐 친 키는 한 번만 세어요.'),
        ('정확도', '맞게 누른 키 ÷ 누른 키. 키가 눌린 그 순간 맞았는지로 세니까, 고쳐 쳐도 틀렸던 기록은 남아요. 지우기(Backspace)는 누른 키에 넣지 않아요. 누른 키는 실제로 누른 횟수예요. 받침이 다음 글자로 넘어가느라 화면 글자가 두 번 바뀌어도 한 번만 세어요.'),
        ('총 타수', '틀렸거나 지운 것까지, 누른 키 전부의 타수 ÷ 걸린 시간(초) × 60. 지우기(Backspace)는 넣지 않아요. 결과의 정확도 아래에 작게 나와요.'),
        ('틀린 키와 느린 키', '틀린 키는 \'그때 쳐야 했던 키\'에 적어요(ㄴ 자리에 ㅅ을 치면 ㄴ에 1번). 느린 키는 맞게 친 키의 앞 키와의 간격 평균이 전체 평균보다 긴 키예요. 3초 넘게 쉰 간격과 세 번 못 친 키는 빼요.'),
        ('한글은 키 흐름으로 비교', '글자 모양이 아니라 두벌식 키 순서끼리 견줘요. 그래서 조합 중인 글자(\'한\'을 치는 중의 \'하\')와 받침이 다음 글자로 넘어가는 순간(\'간\' → \'가나\')을 틀렸다고 하지 않아요.'),
        ('한/영·Caps Lock이 반대일 때', '안내가 뜬 동안 친 키는 정확도와 틀린 키 기록에 넣지 않아요. 띄어쓰기를 넘어 여러 단어를 그렇게 쳐도 같아요. 자판 전환 실수는 타자 실력이 아니니까요.'),
        ('시간', '첫 키에서 시작하고, 탭이 가려지면 멈춰요. 결과의 시간은 0.1초까지 반올림한 값이고, 타수는 그 시간으로 계산해 반올림해요. 그래서 화면의 식을 그대로 다시 계산하면 같은 수가 나와요.'),
        ('휴대폰 자판', '터치 자판은 어떤 키를 눌렀는지 알 수 없어서 글자가 끝날 때 판정하고, 글자를 두벌식 키 수로 환산해요. 지웠다가 같은 글자를 다시 치면 한 번만 세고, 느린 키는 재지 않아요. 자판 앱에 따라 다르게 보일 수 있어요.'),
        ('다른 프로그램과의 차이', '타수를 세는 방법은 프로그램마다 다를 수 있어요. 토독에서는 틀린 채 둔 글자가 속도에서 빠지고 정확도에 남아요. 틀린 단어 전체를 빼는 곳과는 숫자가 달라요. 토독의 숫자가 다른 곳과 같다고 하지 않아요.'),
    ],
    'en': [
        ('WPM', 'Correct characters ÷ 5 ÷ seconds × 60. One "word" is any five characters, spaces included. This is net WPM: only characters that are correct in the final text count.'),
        ('Raw speed', 'Every key press ÷ 5 ÷ seconds × 60, including the ones you got wrong or erased. Backspace itself is not counted. It is shown in small print under the accuracy.'),
        ('Accuracy', 'Correct key presses ÷ all key presses. A key is judged at the moment you press it, so a mistake you go back and fix still counts against accuracy.'),
        ('Missed and slow keys', 'A miss is recorded on the key you should have pressed (typing "r" where "e" was expected counts against "e"). A slow key is one whose average gap from the previous key is longer than your overall average. Pauses longer than 3 seconds and keys typed fewer than three times are left out.'),
        ('Wrong layout or Caps Lock', 'While the "switch your keyboard" or Caps Lock notice is showing, key presses are not counted toward accuracy or missed keys, even when it lasts for several words.'),
        ('Time', 'The clock starts on your first key and pauses when the tab is hidden. The time in the result is rounded to 0.1 s first, and WPM is calculated from that rounded time, so the formula on screen gives the same number if you redo it by hand.'),
        ('Touch keyboards', 'On a phone we cannot see individual keys, so each character is judged when it is complete. If you erase a character and type the same one again, it is counted once. Slow keys are not timed. Keyboard apps differ, so results can look different from one app to another.'),
        ('Other sites', 'Typing sites do not all count the same way. Here a character you leave wrong is left out of WPM and stays in accuracy, so a site that drops the whole word around a mistake will show a lower number. We do not claim our numbers match anyone else\'s.'),
    ],
}

# 영타 연습(한국어 화면, 영어 글)에 더하는 기준
BASIS_ENGLISH = [
    ('WPM', '맞게 친 글자 수 ÷ 5 ÷ 걸린 시간(초) × 60. 다섯 글자를 한 단어로 쳐요(띄어쓰기 포함). 총 WPM은 틀렸거나 지운 것까지 누른 키 전부로 같은 계산을 한 값이에요.'),
    ('영어 타수', '맞게 친 키 수 ÷ 걸린 시간(초) × 60. 대문자와 Shift가 필요한 기호(? ! : " 등)는 2타예요. 예: \'Hi there\'는 2 + 1 + 1 + 5 = 9타.'),
]

FAQ = {
    ('ko', 'test'): [
        ('다른 타자 프로그램과 타수가 왜 다른가요?', '프로그램마다 세는 기준이 다를 수 있어요. 토독은 끝났을 때 맞게 남은 키만 세고, Shift를 같이 누르는 키는 2타로 세어요. 그래서 다른 곳의 숫자와 같다고 하지 않아요. 기준은 위 \'계산 기준\'에 전부 적어 뒀어요.'),
        ('기록은 어디에 저장되나요?', '이 기기의 브라우저 저장소에만 남아요. 서버로 보내지 않고, 회원 가입도 없어요. \'내 기록\' 칸의 \'기록 지우기\'를 누르면 바로 지워져요. 다른 기기나 다른 브라우저에서는 보이지 않아요.'),
        ('휴대폰에서도 잴 수 있나요?', '잴 수 있어요. 터치 자판은 어떤 키를 눌렀는지 알 수 없어서 글자가 끝날 때 판정하고, 글자를 두벌식 키 수로 환산해요. 자판 앱에 따라 다르게 보일 수 있고, 컴퓨터 자판으로 잰 타수와 그대로 견주기는 어려워요.'),
        ('한글을 치는 중에 왜 틀렸다고 안 나오나요?', '글자가 아니라 키 순서로 비교해서 그래요. \'한\'을 치는 중에 보이는 \'하\'나, 받침이 다음 글자로 넘어가기 직전의 모양은 맞게 치는 중이라 틀림으로 표시하지 않아요. 틀린 키를 누른 순간에는 바로 주홍색으로 바뀌어요.'),
    ],
    ('en', 'test'): [
        ('How is WPM calculated here?', 'Correct characters ÷ 5 ÷ minutes. A "word" is any five characters, spaces included, so long and short words are treated the same. The result screen shows the numbers that went into your score.'),
        ('Why do I get a different score on another typing site?', 'Sites differ on what they count: every key press or only correct characters, whether fixed mistakes still count, and how long the test runs. We list our rules above and do not claim to match other sites.'),
        ('Where are my results stored?', 'In this browser, on this device only. Nothing you type is sent to a server and there is no account. The "Clear results" button under "Your results" deletes them.'),
        ('Does the test work on a phone?', 'Yes. A touch keyboard does not report individual keys, so the test judges each character when it is complete and does not time slow keys. Keyboard apps differ, so results can look different from one app to another, and scores from a phone and a physical keyboard are not directly comparable.'),
    ],
}

# 도구 아래 설명(짧게). (제목, 본문 HTML)
EXPLAIN = {
    ('ko', 'test'): [],
    ('en', 'test'): [],
    ('ko', 'practice'): [
        ('손가락마다 맡은 키가 있어요', '<p>두 손 집게손가락을 ㄹ(F)과 ㅓ(J)에 올려요. 두 키에는 손끝으로 찾을 수 있는 작은 돌기가 있어요. 나머지 손가락은 옆 키에 차례로 놓고, 각 손가락은 자기 줄의 위아래 키만 맡아요. 화면 자판에서 지금 누를 키가 가지색으로 켜지고, 그 아래에 어느 손가락인지 나와요.</p>'),
        ('단계는 다섯 개예요', '<ol class="steps-list"><li><b>기본 자리</b> ㅁㄴㅇㄹ ㅎㅗ ㅓㅏㅣ</li><li><b>윗줄</b> ㅂㅈㄷㄱㅅ ㅛㅕㅑㅐㅔ</li><li><b>아랫줄</b> ㅋㅌㅊㅍ ㅠㅜㅡ</li><li><b>Shift 키</b> ㄲㄸㅃㅆㅉ ㅒㅖ</li><li><b>전체</b> 짧은 문장</li></ol><p>단계마다 앞에서 배운 키와 새 키만 나와요. 정확도가 95% 이상이면 다음 단계를 권해요. 순서를 건너뛰어도 괜찮아요.</p>'),
    ],
    ('en', 'practice'): [
        ('Every finger has its own keys', '<p>Rest your index fingers on F and J. Both keys have a small bump you can find without looking. The other fingers sit on the keys beside them, and each finger only reaches for the keys directly above and below its own. The on-screen keyboard lights the next key and names the finger under it.</p>'),
        ('Five steps', '<ol class="steps-list"><li><b>Home row</b> A S D F G H J K L ;</li><li><b>Top row</b> Q W E R T Y U I O P</li><li><b>Bottom row</b> Z X C V B N M , .</li><li><b>Shift</b> capitals and ? ! : "</li><li><b>All keys</b> short sentences</li></ol><p>Each step uses only the new keys and the ones before them. Reach 95% accuracy or higher and the next step is suggested. You can also jump to any step.</p>'),
    ],
    ('ko', 'sentences'): [
        ('보고 치는 글과 내가 친 글을 나란히', '<p>위 줄이 보고 칠 글, 아래 줄이 내가 친 글이에요. 틀린 글자는 위 줄에서 바로 주홍색으로 바뀌어요. 문장을 다 치고 띄어쓰기나 Enter를 누르면 다음 문장이 올라와요.</p>'),
        ('연습 글은 직접 썼어요', '<p>문장은 이 사이트를 만들며 쓴 것이고, 속담은 지은이가 알려지지 않은 채 전해 오는 속담이에요. 책·기사·노래 가사는 넣지 않았어요. 겹받침과 쌍자음이 고루 나오도록 골랐어요.</p>'),
    ],
    ('ko', 'english'): [
        ('한/영 키부터 확인해요', '<p>영어 글인데 한글이 들어오면 화면에 \'한/영 키를 눌러 영어로 바꿔 주세요\'가 떠요. 그동안 친 키는 정확도에 넣지 않아요.</p>'),
        ('타수와 WPM을 같이 보여 줘요', '<p>한국에서 익숙한 타수(타/분)와 영어권에서 쓰는 WPM을 한 화면에 보여 줘요. 둘은 세는 단위가 달라요. 타수는 키를 세고, WPM은 다섯 글자를 한 단어로 쳐서 단어를 세어요.</p>'),
    ],
}

# 소개
ABOUT = {
    'ko': dict(
        title='토독 소개: 타수를 어떻게 재는지와 만든 곳', h1='토독 소개',
        desc='토독은 한글과 영어 타자 속도를 재고 자주 틀린 키를 알려 주는 무료 도구예요. 타수와 정확도를 계산하는 기준, 연습 글의 출처, 만든 곳을 적었어요.',
        body=f'''<p class="lead">토독은 들어오자마자 칠 수 있는 타자 속도 측정·타자 연습 도구예요. 한글(두벌식)과 영어를 같은 화면에서 재고, 끝나면 어느 키에서 틀리고 느렸는지 자판 그림으로 보여 줘요.</p>
<h2>무엇을 할 수 있나요</h2>
<ul>
<li><a href="/ko/">타자 속도 측정</a>: 15초부터 120초까지, 문장·단어·속담으로 타수(타/분)와 정확도를 재요.</li>
<li><a href="/ko/practice/">타자 자리 연습</a>: 두벌식 기본 자리부터 다섯 단계로, 화면 자판이 다음 키와 손가락을 알려 줘요.</li>
<li><a href="/ko/sentences/">타자 문장 연습</a>: 시간 제한 없이 한 문장씩 보고 쳐요.</li>
<li><a href="/ko/english/">영타 연습</a>: 영어 타자를 타수와 WPM으로 같이 재요.</li>
</ul>
<h2>계산 기준</h2>
<p>타수(타/분)는 맞게 친 키 수(두벌식 환산, Shift 포함)를 분으로 나눈 값이고, 영어 WPM은 맞게 친 글자 수 ÷ 5를 분으로 나눈 값이에요. 정확도는 맞게 누른 키 ÷ 누른 키예요. 자세한 기준과 예시는 <a href="/ko/#basis">계산 기준</a>과 <a href="/ko/guide/tasu-gyesan/">타수 계산 글</a>에 있어요. 타수를 세는 방법은 프로그램마다 다를 수 있어서, 토독의 숫자가 다른 곳과 같다고 하지 않아요.</p>
<p>WPM에서 다섯 글자를 한 단어로 치는 것은 타자 연구에서도 쓰는 정의예요. 타자 1억 3천6백만 번을 분석한 2018년 논문에 그 정의가 적혀 있어요(<a href="{SOURCE_DHAKAL_PDF}" rel="noopener">Dhakal 외, CHI 2018</a>, 2026-10-10 확인).</p>
<h2>연습 글</h2>
<p>문장은 이 사이트를 만들며 직접 썼고, 속담은 지은이가 알려지지 않은 채 전해 오는 속담이에요. 단어는 흔히 쓰는 말을 직접 골랐어요. 책·기사·노래 가사·시·영화 대사·유명인의 말은 넣지 않았어요.</p>
<h2>내 기기 안에서</h2>
<p>친 글과 기록은 이 기기의 브라우저에만 남고 서버로 보내지 않아요. 회원 가입도 없어요. 광고와 방문 통계가 어떻게 돌아가는지는 <a href="/ko/privacy/">개인정보 처리방침</a>에 적었어요.</p>
<h2>확인하지 못한 것</h2>
<p>실제 한글 입력기(윈도우·맥·아이폰·안드로이드)는 기기마다 조금씩 다르게 움직여요. 이상하게 재지는 곳이 있으면 아래 메일로 알려 주세요. 어떤 기기와 브라우저였는지 같이 적어 주시면 고치기 쉬워요.</p>
<h2>만든 곳</h2>
<p>루멘랩(Lumen Lab)이 만들고 운영해요. 글꼴은 Pretendard(길형진, SIL 오픈 폰트 라이선스 1.1)에서 이 사이트에 나오는 글자만 남긴 조각을 써요(<a href="/assets/fonts/OFL.txt">라이선스 전문</a>). 다른 앱과 도구는 <a href="https://lumenlab.page/">루멘랩 본페이지</a>에 있어요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>''',
    ),
    'en': dict(
        title='About Todok: How This Typing Test Counts Speed and Accuracy', h1='About Todok',
        desc='Todok is a free typing test and practice tool for English and Korean. This page explains how WPM and accuracy are calculated, where the practice text comes from, and who runs it.',
        body=f'''<p class="lead">Todok is a typing test you can start the moment the page opens. It measures speed and accuracy and then shows, on a picture of the keyboard, which keys you missed and which were slow.</p>
<h2>What you can do here</h2>
<ul>
<li><a href="/">Typing Test</a>: 15 to 120 seconds of common words or sentences, scored in WPM.</li>
<li><a href="/practice/">Typing Practice</a>: five steps from the home row to full sentences, with an on-screen keyboard that shows the next key and finger.</li>
<li>A Korean edition at <a href="/ko/" lang="ko" hreflang="ko">/ko/</a> measures Korean typing in keystrokes per minute.</li>
</ul>
<h2>How scores are calculated</h2>
<p>WPM is correct characters ÷ 5 ÷ minutes. Accuracy is correct key presses ÷ all key presses, judged at the moment each key is pressed. The full rules are under <a href="/#basis">How the numbers are calculated</a>, and the worked examples are in <a href="/guide/how-wpm-is-calculated/">How WPM is calculated</a>. Typing sites do not all count the same way, and we do not claim our numbers match anyone else's.</p>
<p>Counting five characters as one word is the definition used in typing research too. It is stated in a 2018 paper that analysed 136 million keystrokes (<a href="{SOURCE_DHAKAL_PDF}" rel="noopener">Dhakal et al., CHI 2018</a>, checked 2026-10-10).</p>
<h2>Practice text</h2>
<p>The sentences were written for this site and the word list is our own pick of very common words. The pangrams are long-standing anonymous ones or written here. There is no text from books, articles, lyrics, poems, films or quotes.</p>
<h2>On your device</h2>
<p>What you type and your results stay in this browser and are not sent to a server. There is no account. How ads and visit statistics work is described in the <a href="/privacy/">privacy policy</a>.</p>
<h2>What we could not check</h2>
<p>Keyboards and input methods behave a little differently from device to device. If something is measured oddly, write to the address below and include your device and browser.</p>
<h2>Who makes it</h2>
<p>Todok is made and run by Lumen Lab. The typeface is a subset of Pretendard by Kil Hyung-jin, kept to the characters this site uses, under the SIL Open Font License 1.1 (<a href="/assets/fonts/OFL.txt">license text</a>). Our other apps and tools are at <a href="https://lumenlab.page/en/">lumenlab.page</a>.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>''',
    ),
}

PARTNER = 'https://policies.google.com/technologies/partner-sites'
ADSET = 'https://adssettings.google.com/'
CFWA = 'https://www.cloudflare.com/web-analytics/'

# 개인정보 처리방침. 저장 키 이름은 assets/tj-store.js·site.js 와 글자 그대로 같아야 한다(check.py 가 대조).
PRIVACY = {
    'ko': dict(
        title='개인정보 처리방침 | 토독', h1='개인정보 처리방침',
        desc='토독(타자 속도 측정·타자 연습)이 기기에 저장하는 것, 광고와 방문 통계, 글꼴과 서버 기록에 대한 안내예요.',
        body=f'''<p class="meta">시행일: 2026년 10월 10일 · 운영: 루멘랩(Lumen Lab)</p>
<h2>친 글</h2>
<p>토독은 타자를 이용자의 브라우저 안에서 재요. 친 글을 이 사이트가 서버로 보내거나 모으지 않아요. 회원 가입은 없어요.</p>
<h2>기기에 저장하는 정보</h2>
<p>브라우저 저장소(localStorage)에 아래 다섯 항목만 남겨요. 서버로 보내지 않아요.</p>
<ul>
<li><code>todok.runs</code>: 최근 기록 50개까지. 한 판의 조건(도구·글 종류·시간), 속도, 정확도, 끝난 시각이에요. 친 글 자체는 저장하지 않아요.</li>
<li><code>todok.best</code>: 조건마다의 최고 기록(속도, 정확도, 시각).</li>
<li><code>todok.keys</code>: 키마다 틀린 횟수와 맞은 횟수. \'자주 틀린 키\'를 보여 주는 데 써요.</li>
<li><code>todok.set</code>: 마지막으로 고른 설정(글 종류, 시간, 문장부호·숫자, 자리 연습 단계).</li>
<li><code>todok.lang</code>: 다른 언어판 안내 띠를 닫았다는 표시.</li>
</ul>
<p>\'내 기록\' 칸의 \'기록 지우기\'를 누르면 <code>todok.runs</code>, <code>todok.best</code>, <code>todok.keys</code>가 바로 지워져요. 나머지 둘은 브라우저의 사이트 데이터 지우기로 지울 수 있어요. 그 밖에는 저장하지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스로 광고를 보여 줘요. Google을 비롯한 광고 회사는 쿠키를 써서 이 사이트나 다른 사이트에 방문한 기록을 바탕으로 광고를 고를 수 있어요. 광고 때문에 Google 같은 제3자가 이용자 브라우저에 쿠키를 넣거나 읽을 수 있고, 웹 비콘(눈에 보이지 않는 작은 이미지) 같은 기술로 정보를 모을 수 있어요. Google이 이 정보를 어떻게 쓰는지는 <a href="{PARTNER}" rel="noopener">Google 파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에 있어요. 맞춤 광고는 <a href="{ADSET}" rel="noopener">Google 광고 설정</a>에서 끌 수 있어요.</p>
<h2>방문 통계</h2>
<p>방문 통계는 <a href="{CFWA}" rel="noopener">Cloudflare Web Analytics</a>로 봐요. 어느 페이지를 몇 번 봤는지와 브라우저 종류, 페이지가 얼마나 빨리 떴고 어디가 느렸는지 같은 성능 정보예요. Cloudflare 설명으로는 쿠키나 기기 저장소를 쓰지 않아요. 이 사이트에서 친 글과 기록, 설정은 여기에 실리지 않아요.</p>
<h2>글꼴과 서버 기록</h2>
<p>화면 글자의 글꼴은 이 사이트에서 같이 받아요. 그 파일에 없는 드문 글자가 화면에 나올 때만 공개 전송망인 jsDelivr에서 그 글자의 글꼴을 받고, 그때는 다른 웹 요청처럼 접속 IP가 전달돼요. 사이트는 Cloudflare에서 제공되고, Cloudflare는 서비스를 안전하게 운영하려고 접속 IP 같은 기본 기록을 잠시 남길 수 있어요. 어느 쪽도 이용자가 친 글은 받지 않아요.</p>
<h2>문의</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>''',
    ),
    'en': dict(
        title='Privacy Policy | Todok', h1='Privacy policy',
        desc='What Todok (typing test and typing practice) stores on your device, and how ads, visit statistics, fonts and server logs work.',
        body=f'''<p class="meta">Effective October 10, 2026 · Operated by Lumen Lab</p>
<h2>What you type</h2>
<p>Todok measures typing inside your browser. This site does not send what you type to a server and does not collect it. There are no accounts.</p>
<h2>What is stored on your device</h2>
<p>Only the five items below are kept in your browser's localStorage. They are not sent to a server.</p>
<ul>
<li><code>todok.runs</code>: up to 50 recent results. Each holds the conditions of a test (tool, text type, length), the speed, the accuracy and when it ended. The text you typed is not stored.</li>
<li><code>todok.best</code>: your best result for each set of conditions (speed, accuracy, time).</li>
<li><code>todok.keys</code>: how many times each key was missed and hit, used to show the keys you miss most.</li>
<li><code>todok.set</code>: the settings you last chose (text type, length, punctuation and numbers, practice step).</li>
<li><code>todok.lang</code>: a note that you closed the language suggestion bar.</li>
</ul>
<p>The "Clear results" button under "Your results" deletes <code>todok.runs</code>, <code>todok.best</code> and <code>todok.keys</code> at once. The other two can be removed by clearing site data in your browser. Nothing else is stored.</p>
<h2>Ads</h2>
<p>This site shows ads through Google AdSense. Google and other ad vendors use cookies to serve ads based on your visits to this and other websites. Because of these ads, third parties such as Google may place or read cookies in your browser and collect information through web beacons (tiny invisible images). See <a href="{PARTNER}" rel="noopener">how Google uses information from sites or apps that use its services</a>. You can turn off personalized ads in <a href="{ADSET}" rel="noopener">Google Ad Settings</a>.</p>
<h2>Visit statistics</h2>
<p>We look at visit statistics through <a href="{CFWA}" rel="noopener">Cloudflare Web Analytics</a>: which pages were viewed, the kind of browser, and performance details such as how fast a page loaded and which part of it was slow. According to Cloudflare, it does not use cookies or local storage. Nothing you type, and none of your results or settings, is included.</p>
<h2>Fonts and server logs</h2>
<p>The font for the text on screen comes from this site. Only when a rare character that is not in that file appears does the page fetch a font for it from jsDelivr, a public content network, which then receives your IP address like any web request. The site is served by Cloudflare, which may briefly keep basic request logs such as IP addresses to run the service securely. Neither ever receives what you type.</p>
<h2>Contact</h2>
<p><a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a></p>''',
    ),
}

GUIDE_INDEX = {
    'ko': dict(title='타자 연습 가이드: 타수 계산·자리 익히기·받침 | 토독', h1='타자 연습 가이드',
               desc='타수(타/분)를 계산하는 기준, 두벌식 자리를 익히는 순서, 받침이 다음 글자로 넘어가 보이는 이유, 영타 연습 순서를 한 편씩 정리했어요.',
               lead='도구를 쓰다 생기는 질문을 한 편씩 풀었어요. 숫자는 토독의 계산으로 다시 확인한 것만 실었어요.'),
    'en': dict(title='Typing Guides: WPM, Touch Typing and Accuracy | Todok', h1='Typing guides',
               desc='Short guides on how WPM is calculated, how to learn the home row and which finger takes which key, and why accuracy comes before speed.',
               lead='One question per guide. Every number is one we recalculated with the same code the test uses.'),
}
