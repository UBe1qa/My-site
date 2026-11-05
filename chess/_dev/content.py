"""화면 글(UI), 소개·방침, 페이지 칸 제목(TX). 오프닝 해설은 openings.py, 메인라인 수마다 이유는 reasons.py."""

UI = {
    'en': {
        'brand': 'Opening Trail', 'skip': 'Skip to content', 'nav_label': 'Main',
        'nav': {'map': 'Map', 'openings': 'Openings', 'test': 'Test', 'practice': 'Practice', 'best': 'Best by rating'},
        'search_ph': 'Search openings: Najdorf, London, e4…', 'search_lbl': 'Search openings', 'search_none': 'No opening by that name.',
        'search_page': 'Guide', 'search_line': 'Map',
        'lang_other': '한국어', 'close': 'Close',
        'about': 'About', 'privacy': 'Privacy', 'data': 'Data & sources', 'contact': 'Contact', 'ad': 'Advertisement',
        'lumen_b': 'Made by Lumen Lab', 'lumen_s': 'More free tools and games',
        'band_lbl': 'Lichess rating', 'band_all': 'All',
        'first': 'Start position', 'prev': 'Previous move', 'next': 'Next move', 'last': 'Last move', 'flip': 'Flip board', 'sound': 'Sound effects on or off',
        'th_move': 'Move', 'th_cls': 'Type', 'th_share': 'Played', 'th_games': 'Games', 'th_wdl': 'White · Draw · Black', 'th_ev': 'Engine',
        'practice_w': 'Practice as White', 'practice_b': 'Practice as Black', 'guide_read': 'Read the guide:', 'map_open': 'Open on the map',
        'data_note': 'Numbers: 174.9 million rated blitz, rapid and classical Lichess games, August–October 2026 (bullet left out; rating = average of both players). Master row: Lichess broadcasts of real events, CC BY-SA 4.0.',
        'cls': ['Main', 'Alternative', 'Side line', 'Dubious', 'Mistake'],
        'cls_tip': ['The move theory and strong players choose most', 'Also sound, and strong players play it often', 'Playable, but less common or slightly worse', 'Engine says it gives away a clear part of your chances (?!)', 'Engine says it loses a lot (?)'],
        'js': {
            'band_all': 'all ratings', 'name_start': 'Starting position', 'name_none': 'Unnamed position', 'mate': 'Checkmate. The game ends here.', 'drawn': 'The game is drawn here.',
            'ml_empty': 'Play a move on the board, or pick one from the table.',
            'sum': 'Games from this position ({band}): {n}',
            'sum_none': 'No games from this position ({band}) in our data.',
            'rows_none': 'Not enough games from here. Go back a move or pick another rating.',
            'load_fail': 'Could not load the numbers. Check your connection and try again.',
            'wdl_aria': 'White wins {w}, draws {d}, Black wins {b}',
            'white': 'White', 'black': 'Black', 'custom_line': 'your line from the map',
            'cls': ['Main', 'Alternative', 'Side line', 'Dubious', 'Mistake'],
            'ev_lbl': 'Engine', 'ev_none': 'no engine score yet', 'ev_tip': 'Engine score from White’s side, in pawns (+ = White is better)',
            'pass': '{p} of games {band} pass through here', 'theory': 'Book move, no games in our data yet',
            'trap_flag': 'Popular trap', 'trap_tip': 'Many players at this rating choose it, but the engine does not like it',
            'here_root': 'Start', 'tree_h': 'Where the trail goes next', 'tree_lbl': 'Next moves as branches. Thicker = played more.',
            'test_here': 'Test yourself from here',
            'setup_msg': 'You will play <b>{side}</b> in {name}. Your opponent answers with the moves people at your rating really play.',
            'your_move': 'Your move.', 'right': '<b>{san}</b> is the move. Keep going.', 'fixed': 'That is it. This position goes into your review.',
            'wrong': '<b>{san}</b> is not the move here. Play <b>{want}</b> (green arrow).',
            'playable': 'Strong players also play <b>{san}</b>, but this line trains a different move. Try again.',
            'hint_msg': 'The move is <b>{want}</b>. This position goes into your review.',
            'opp_played': 'Your opponent played <b>{san}</b> ({p} of games {band}).',
            'end': 'Line finished: {ok} right, {bad} to review. <span class="san">{line}</span>',
            'end_review': 'Review done: {ok} right, {bad} to look at again.',
            'again': 'Play another line', 'review_again': 'Review again', 'change': 'Change opening',
            'review_q': 'Review: what do you play here? ({left} left)',
            'due': '{n} of {total} saved moves are due today.', 'due_none': 'No saved moves yet. Wrong answers come back on a schedule.',
            'step_of': 'Move {i} of {n}',
        },
    },
    'ko': {
        'brand': '오프닝 트레일', 'skip': '본문으로 건너뛰기', 'nav_label': '주요 메뉴',
        'nav': {'map': '지도', 'openings': '오프닝', 'test': '테스트', 'practice': '연습', 'best': '레이팅별 추천'},
        'search_ph': '오프닝 찾기: 나이도르프, 런던, e4…', 'search_lbl': '오프닝 찾기', 'search_none': '그 이름의 오프닝이 없어요.',
        'search_page': '해설', 'search_line': '지도',
        'lang_other': 'English', 'close': '닫기',
        'about': '소개', 'privacy': '개인정보 처리방침', 'data': '자료와 출처', 'contact': '문의', 'ad': '광고',
        'lumen_b': '루멘랩이 만들었어요', 'lumen_s': '다른 무료 도구와 게임 보기',
        'band_lbl': '리체스 레이팅', 'band_all': '전체',
        'first': '처음 국면', 'prev': '한 수 뒤로', 'next': '한 수 앞으로', 'last': '마지막 수', 'flip': '판 뒤집기', 'sound': '효과음 켜기·끄기',
        'th_move': '수', 'th_cls': '단계', 'th_share': '비율', 'th_games': '판 수', 'th_wdl': '백 승 · 무 · 흑 승', 'th_ev': '엔진',
        'practice_w': '백으로 연습', 'practice_b': '흑으로 연습', 'guide_read': '해설 읽기:', 'map_open': '지도에서 열기',
        'data_note': '숫자: 리체스 2026년 8~10월 레이팅 대국 1억 7,493만 판(블리츠·래피드·클래식, 불릿 제외, 레이팅은 두 사람 평균). 고수 대회 줄: 리체스 중계 기보(CC BY-SA 4.0).',
        'cls': ['메인', '대안', '사이드', '의심스러운 수', '나쁜 수'],
        'cls_tip': ['이론과 고수가 가장 많이 고르는 수', '이것도 건전하고 고수가 자주 두는 수', '둘 만하지만 덜 두거나 조금 못한 수', '엔진이 보기에 승산을 눈에 띄게 잃는 수(?!)', '엔진이 보기에 많이 잃는 수(?)'],
        'js': {
            'band_all': '전체 레이팅', 'name_start': '처음 국면', 'name_none': '이름 없는 국면', 'mate': '체크메이트예요. 대국이 여기서 끝나요.', 'drawn': '여기서 무승부로 끝나요.',
            'ml_empty': '판에서 말을 움직이거나 표에서 수를 고르세요.',
            'sum': '이 국면에서 둔 판({band}): {n}',
            'sum_none': '이 국면에서 둔 판이 없어요({band}).',
            'rows_none': '여기서부터는 판이 너무 적어요. 한 수 뒤로 가거나 다른 레이팅을 골라 보세요.',
            'load_fail': '숫자를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 해 보세요.',
            'wdl_aria': '백 승 {w}, 무승부 {d}, 흑 승 {b}',
            'white': '백', 'black': '흑', 'custom_line': '지도에서 고른 수순',
            'cls': ['메인', '대안', '사이드', '의심스러운 수', '나쁜 수'],
            'ev_lbl': '엔진', 'ev_none': '엔진 점수 아직 없음', 'ev_tip': '백 쪽에서 본 엔진 점수(폰 단위, +면 백이 좋음)',
            'pass': '{band} 대국의 {p}가 이 판을 지나가요', 'theory': '이론 수, 우리 자료엔 아직 대국이 없어요',
            'trap_flag': '인기 함정수', 'trap_tip': '이 레이팅대에서 많이 두지만 엔진은 좋게 보지 않는 수',
            'here_root': '처음', 'tree_h': '여기서 길이 갈라지는 곳', 'tree_lbl': '다음 수를 가지로. 굵을수록 많이 둬요.',
            'test_here': '여기서 테스트하기',
            'setup_msg': '<b>{side}</b>으로 연습해요: {name}. 상대는 내 레이팅대 사람들이 실제로 두는 수로 받아쳐요.',
            'your_move': '둘 차례예요.', 'right': '<b>{san}</b> 맞아요. 계속 가요.', 'fixed': '맞아요. 이 국면은 복습에 넣었어요.',
            'wrong': '<b>{san}</b> 아니에요. 정답: <b>{want}</b> (초록 화살표)',
            'playable': '<b>{san}</b>도 고수들이 두는 수예요. 이 연습에서 익힐 수는 따로 있어요. 다시 둬 보세요.',
            'hint_msg': '정답: <b>{want}</b>. 이 국면은 복습에 넣었어요.',
            'opp_played': '상대 수: <b>{san}</b> ({band}에서 {p})',
            'end': '한 줄 끝: 맞힘 {ok}, 다시 볼 것 {bad}. <span class="san">{line}</span>',
            'end_review': '복습 끝: 맞힘 {ok}, 다시 볼 것 {bad}.',
            'again': '다른 줄 연습', 'review_again': '다시 복습', 'change': '오프닝 바꾸기',
            'review_q': '복습: 여기서 뭘 두나요? (남은 {left}개)',
            'due': '저장한 수 {total}개 중 오늘 볼 것 {n}개', 'due_none': '아직 저장한 수가 없어요. 틀린 수는 정해진 날에 다시 나와요.',
            'step_of': '{n}수 중 {i}번째',
        },
    },
}

PAGES = {
    'en': {
        'home': {
            'title': 'Opening Trail: Every Chess Opening, Move by Move',
            'desc': 'Walk every chess opening from move one: why each move is played, what players at your rating answer, which popular moves are really bad. Free.',
            'h1': 'Every chess opening, move by move',
            'why': 'Walk the trail from the first move. At each step you see why the move is played, what players <b>at your rating</b> answer (from {games} Lichess games), and which popular moves the engine does not like.',
        },
        'map': {
            'title': 'Chess Opening Map: Every Move, Rated and Explained',
            'desc': 'An interactive map of chess openings: 379,000 positions from 174.9 million Lichess games, engine scores, main lines and traps at your rating.',
            'h1': 'Opening map',
            'why': 'Move a piece or tap a move. Thicker arrows are played more <b>at your rating</b>; each move is sorted into main, alternative, side line or dubious by engine score and what strong players choose.',
        },
        'openings': {
            'title': 'Chess Openings List: Lines, Plans and Stats by Rating',
            'desc': 'Every chess opening we cover, grouped by first move: main lines with a reason for every move, plans, traps and win rates at four rating levels.',
            'h1': 'Chess openings, from the first move',
            'lead': 'Grouped by White’s first move and Black’s answer. Each guide walks the main line move by move, sorts the next moves, and shows how people at four rating levels really play it.',
        },
        'best': {
            'title': 'Best Chess Openings by Rating, From 175 Million Games',
            'desc': 'Which openings score best for White and Black at under 1200, 1200–1599, 1600–1999 and 2000+, counted from 174.9 million Lichess games.',
            'h1': 'Best openings at your rating',
            'lead': 'For each rating level and side: openings that come up often enough to matter, sorted by how well they score for the side that chooses them. Counted from rated Lichess games, August–October 2026.',
        },
        'practice': {
            'title': 'Chess Opening Trainer with Spaced Repetition',
            'desc': 'Drill your openings against the replies people really play at your rating. Mistakes come back on a schedule. Free, works in your browser.',
            'h1': 'Opening trainer',
            'why': 'Your opponent answers with the moves people at your rating <b>really play, in the same proportions</b>. Get one wrong and it comes back in your review.',
        },
        'test': {
            'title': 'Chess Opening Test: 10 Positions, 2 Minutes, Your Level',
            'desc': 'Ten real opening positions: pick the move strong players choose. Get your opening level, the rating your choices match and a card to share. Free, no sign-up.',
            'h1': 'Opening test',
            'why': 'Ten real positions from the opening map. In each one, pick the move <b>2000+ players choose most</b>. About two minutes.',
        },
        'data': {
            'title': 'Data and Sources: How Opening Trail Counts Games',
            'desc': 'Where the numbers on Opening Trail come from, how moves are sorted into main, alternative, side and dubious, licenses and downloads.',
            'h1': 'Data and sources',
        },
    },
    'ko': {
        'home': {
            'title': '오프닝 트레일: 체스 오프닝을 1수부터 수마다 이유와 함께',
            'desc': '체스 오프닝을 1수부터 걸어 봐요. 수마다 두는 이유, 내 레이팅대가 실제로 두는 응수, 인기 있지만 사실은 나쁜 수까지. 무료.',
            'h1': '체스 오프닝, 1수부터 수마다 이유와 함께',
            'why': '첫 수부터 길을 따라 걸어요. 한 걸음마다 왜 그 수를 두는지, <b>내 레이팅대</b> 사람들이 어떻게 받는지(리체스 {games} 판), 엔진이 싫어하는 인기 수는 무엇인지 보여 줘요.',
        },
        'map': {
            'title': '체스 오프닝 지도: 모든 수를 단계와 이유로',
            'desc': '체스 오프닝을 한 장의 지도로: 리체스 1억 7,493만 판에서 나온 판 38만 개, 엔진 점수, 메인라인, 내 레이팅대의 함정.',
            'h1': '오프닝 지도',
            'why': '말을 움직이거나 수를 눌러 보세요. 화살표가 굵을수록 <b>내 레이팅대</b>에서 많이 둬요. 수마다 엔진 점수와 고수의 선택으로 메인·대안·사이드·의심스러운 수를 나눠요.',
        },
        'openings': {
            'title': '체스 오프닝 정리: 수순·계획·레이팅별 승률',
            'desc': '다루는 체스 오프닝 전부를 첫 수별로 묶었어요. 메인라인 수마다 이유, 양쪽 계획, 함정, 레이팅대 네 곳의 승률.',
            'h1': '체스 오프닝, 첫 수부터',
            'lead': '백의 첫 수와 흑의 응수로 묶었어요. 해설마다 메인라인을 수마다 이유와 함께 걷고, 다음 수를 단계로 나누고, 레이팅대 네 곳에서 실제로 어떻게 두는지 보여 줘요.',
        },
        'best': {
            'title': '레이팅별 체스 오프닝 추천: 1억 7천만 판으로 센 승률',
            'desc': '1200 미만, 1200~1599, 1600~1999, 2000 이상에서 백과 흑으로 점수가 좋은 오프닝을 리체스 1억 7,493만 판으로 셌어요.',
            'h1': '내 레이팅에서 잘 통하는 오프닝',
            'lead': '레이팅대와 쪽마다, 충분히 자주 나오는 오프닝을 그 오프닝을 고른 쪽의 점수 순으로 놓았어요. 리체스 2026년 8~10월 레이팅 대국으로 셌어요.',
        },
        'practice': {
            'title': '체스 오프닝 연습: 간격 반복으로 외우기',
            'desc': '내 레이팅대 사람들이 실제로 두는 응수를 상대로 오프닝을 연습해요. 틀린 수는 정해진 날에 다시 나와요. 무료, 브라우저에서.',
            'h1': '오프닝 연습',
            'why': '상대는 내 레이팅대 사람들이 <b>실제로 두는 수를 그 비율대로</b> 둬요. 틀린 수는 복습에 다시 나와요.',
        },
        'test': {
            'title': '체스 오프닝 테스트: 2분, 국면 10개로 내 단계 알기',
            'desc': '실제 오프닝 국면 10개에서 고수가 두는 수를 골라요. 내 오프닝 단계, 고른 수가 닮은 레이팅대, 공유 카드까지. 무료, 가입 없음.',
            'h1': '오프닝 테스트',
            'why': '오프닝 지도에 있는 실제 국면 10개예요. 국면마다 <b>2000+ 고수가 가장 많이 두는 수</b>를 골라요. 2분쯤 걸려요.',
        },
        'data': {
            'title': '자료와 출처: 오프닝 트레일은 어떻게 세나',
            'desc': '오프닝 트레일 숫자의 출처, 수를 메인·대안·사이드·의심스러운 수로 나누는 방법, 사용 허가와 내려받기.',
            'h1': '자료와 출처',
        },
    },
}


def about(lang, meta):
    g = meta['games']
    if lang == 'ko':
        return f'''<h1>오프닝 트레일 소개</h1>
<p class="lead">오프닝 트레일은 체스 오프닝을 1수부터 길처럼 걸어 보게 하는 무료 사이트예요. 수마다 왜 두는지, 내 레이팅대 사람들이 실제로 어떻게 받는지, 인기 있지만 사실은 나쁜 수가 무엇인지 보여 줘요. 루멘랩이 만들었어요.</p>
<h2>누구를 위해</h2>
<p>체스를 두는 사람 모두예요. 오프닝 공부가 귀찮은 사람은 한 줄 설명과 메인라인만 따라가면 되고, 깊이 보고 싶은 사람은 수마다 고수용 설명과 엔진 점수, 대회 기보 비율까지 볼 수 있어요.</p>
<h2>무엇으로 만들었나</h2>
<p>리체스(lichess.org)가 공개한 2026년 8~10월 레이팅 대국 {g:,}판을 직접 셌어요. 엔진 점수는 리체스 평가 데이터베이스, 고수 대회 비율은 리체스 중계 기보에서 왔어요. 자세한 방법과 사용 허가는 <a href="/ko/data/">자료와 출처</a>에 있어요.</p>
<h2>글은 누가 쓰나</h2>
<p>해설과 수마다 이유는 Claude(AI)가 새로 쓰고, 사이트를 만들 때마다 모든 수순을 체스 규칙 프로그램으로 처음부터 둬 봐요. 칸마다 'AI가 씀 / 엔진으로 둬 봄 / 사람이 봄' 상태를 적어요. 틀린 곳을 보면 <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>로 알려 주세요.</p>
<h2>문의</h2>
<p>루멘랩: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''
    return f'''<h1>About Opening Trail</h1>
<p class="lead">Opening Trail lets you walk every chess opening from the first move, like a trail: why each move is played, how players at your rating really answer, and which popular moves are actually bad. It is free and made by Lumen Lab.</p>
<h2>Who it is for</h2>
<p>Anyone who plays chess. If you do not like studying openings, read the one-line summary and follow the main line. If you want depth, every move also has a note for stronger players, an engine score and how often masters choose it.</p>
<h2>What it is built from</h2>
<p>We counted {g:,} rated Lichess games from August to October 2026 ourselves. Engine scores come from the Lichess evaluation database, and the master numbers from Lichess broadcasts of real events. The method and licenses are on <a href="/data/">Data and sources</a>.</p>
<h2>Who writes the text</h2>
<p>Guides and move reasons are written by Claude (AI), and every line is played move by move with a chess rules library each time the site is built. Each section says whether it was written by AI, checked with the engine, or read by a person. If you spot a mistake, write to <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>.</p>
<h2>Contact</h2>
<p>Lumen Lab: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''


def data_doc(lang, meta):
    g, o, pos, nm = meta['games'], meta['otb_games'], meta['positions'], meta['names']
    ev = meta.get('evals', 0)
    if lang == 'ko':
        return f'''<h1>자료와 출처</h1>
<p class="lead">오프닝 트레일의 숫자는 모두 공개 자료를 우리가 직접 센 것이에요. 무엇을 어떻게 셌는지, 수를 어떻게 나누는지, 다시 써도 되는지를 적었어요.</p>
<h2>대국 수</h2>
<ul><li><b>리체스 레이팅 대국</b>: 2026년 8·9·10월 전체 파일에서 블리츠·래피드·클래식 {g:,}판(불릿·초불릿·통신 대국 제외). 앞 20수(40수순)까지 국면마다 묶고, 20판 넘게 나온 수순만 남겼어요. 판(국면) {pos:,}개.</li>
<li><b>레이팅대</b>: 두 사람 레이팅의 평균으로 1200 미만, 1200~1599, 1600~1999, 2000 이상. 리체스 레이팅은 같은 사람이라도 체스닷컴보다 대체로 높게 나와요.</li>
<li><b>고수 대회</b>: 리체스 중계(broadcast) 기보 가운데 FIDE 레이팅이 적힌 실제 대회 {o:,}판(2020년 1월~2026년 9월). 레이팅대는 2200 미만, 2200~2399, 2400~2599, 2600 이상.</li>
<li>같은 판에 다른 수순으로 와도 한 판으로 셉니다(전이). 판의 기준은 말 배치·차례·캐슬링·잡을 수 있는 앙파상이에요.</li></ul>
<h2>엔진 점수</h2>
<p>리체스 평가 데이터베이스(lichess_db_eval)에서 우리 판을 찾아 붙였어요. 판 {ev:,}개에 점수가 있어요. 점수는 백 쪽에서 본 폰 단위(+0.5 = 백이 폰 반 개만큼 좋음)이고, #3은 3수 안에 메이트예요.</p>
<h2>수를 네 단계로 나누는 법</h2>
<ol><li>엔진 점수를 승리 확률로 바꾸고(리체스와 같은 식), 이 판에서 둘 수 있는 가장 좋은 수보다 둔 쪽의 승리 확률이 몇 %p 떨어지는지 봐요.</li>
<li>3.5%p 미만이면 건전한 수예요. 그 가운데 고수가 가장 많이 두는 수가 <b>메인</b>, 고수의 10% 넘게 두는 수는 <b>대안</b>이에요. 고수는 대회 2400 이상(그 판이 대회에서 30판 넘게 나왔을 때), 아니면 리체스 2000 이상이에요.</li>
<li>3.5~8%p는 <b>사이드</b>, 8~15%p는 <b>의심스러운 수</b>(?!), 15%p 넘게 떨어지면 <b>나쁜 수</b>(?)예요.</li>
<li>해설에 적은 메인라인은 이름난 이론을 따라 메인으로 둡니다. 엔진 점수가 없는 수는 고수 비율로만 나눠요.</li></ol>
<p>많이 두는 수가 꼭 좋은 수는 아니에요. 그래서 레이팅대에서 많이 두지만 엔진이 싫어하는 수에는 '인기 함정수' 표시를 달아요.</p>
<h2>이름</h2>
<p>오프닝 이름과 ECO 분류는 리체스가 공개한 <a href="https://github.com/lichess-org/chess-openings">chess-openings</a> 목록({nm:,}개)을 써요. 한국어 이름은 우리 용어표로 옮겼어요.</p>
<p>해설의 메인라인·갈래·함정 수순은 사이트를 만들 때마다 <a href="https://github.com/jhlywa/chess.js">chess.js</a>로 한 수씩 둬 보고, 메이트라고 적은 함정은 실제 체크메이트인지 확인해요.</p>
<h2>사용 허가</h2>
<ul><li>리체스 대국·평가 데이터베이스·chess-openings: <a href="https://database.lichess.org/">CC0</a>(마음대로 써도 돼요).</li>
<li>고수 대회 숫자: 리체스 중계 기보에서 셌고 <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ko">CC BY-SA 4.0</a>을 따라요. 그 숫자를 다시 쓰려면 출처(리체스 중계, 오프닝 트레일)를 적고 같은 조건으로 공개해 주세요.</li>
<li>규칙 계산: chess.js(BSD-2-Clause), 말 그림: Cburnett(BSD-3-Clause로 사용), 글꼴: Pretendard(SIL OFL 1.1).</li></ul>
<h2>내려받기</h2>
<p>오프닝 해설마다 화면과 같은 숫자를 JSON으로 받을 수 있어요(해설 맨 아래 'JSON'). 전체 판 자료는 <code>/data/t/</code> 아래 조각 파일이에요. 만든 날과 판 수는 <a href="/data/meta.json">meta.json</a>에 있어요.</p>'''
    return f'''<h1>Data and sources</h1>
<p class="lead">Every number on Opening Trail is counted by us from public data. Here is what we counted, how moves are sorted, and how you may reuse it.</p>
<h2>Games</h2>
<ul><li><b>Rated Lichess games</b>: the whole August, September and October 2026 files, {g:,} blitz, rapid and classical games (bullet, ultrabullet and correspondence left out). The first 20 moves (40 plies) are grouped by position, keeping move orders seen in more than 20 games: {pos:,} positions.</li>
<li><b>Rating levels</b>: the average of both players: under 1200, 1200–1599, 1600–1999 and 2000+. Lichess ratings usually run higher than Chess.com ratings for the same player.</li>
<li><b>Masters</b>: {o:,} games from real events with FIDE ratings in Lichess broadcasts (January 2020 to September 2026). Levels: under 2200, 2200–2399, 2400–2599 and 2600+.</li>
<li>The same position reached by a different move order counts as one position (transposition). A position is the piece placement, side to move, castling rights and a capturable en passant square.</li></ul>
<h2>Engine scores</h2>
<p>Taken from the Lichess evaluation database (lichess_db_eval) for our positions: {ev:,} positions have a score. Scores are from White’s side in pawns (+0.5 = White is half a pawn better); #3 means mate in 3.</p>
<h2>How moves are sorted</h2>
<ol><li>Engine scores are turned into winning chances (the same formula Lichess uses), and we look at how many percentage points the side to move gives up compared with the best move in that position.</li>
<li>Less than 3.5 points: a sound move. Among sound moves, the one strong players choose most is the <b>main</b> move; others chosen in more than 10% of strong players’ games are <b>alternatives</b>. Strong players means masters rated 2400+ in events (when the position appears in more than 30 such games), otherwise Lichess players rated 2000+.</li>
<li>3.5 to 8 points: <b>side line</b>. 8 to 15: <b>dubious</b> (?!). More than 15: <b>mistake</b> (?).</li>
<li>Main lines written in the guides follow established theory and are always marked main. Moves without an engine score are sorted by how often strong players choose them.</li></ol>
<p>The most played move is not always a good move, so moves that are popular at a rating level but disliked by the engine get a “popular trap” mark.</p>
<h2>Names</h2>
<p>Opening names and ECO codes come from the <a href="https://github.com/lichess-org/chess-openings">chess-openings</a> list that Lichess publishes ({nm:,} entries).</p>
<p>Every main line, variation and trap in the guides is played move by move with <a href="https://github.com/jhlywa/chess.js">chess.js</a> each time the site is built, and traps marked as mate are checked to end in checkmate.</p>
<h2>Licenses</h2>
<ul><li>Lichess games, evaluation database and chess-openings: <a href="https://database.lichess.org/">CC0</a> (free to use).</li>
<li>Master numbers: counted from Lichess broadcasts and shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. If you reuse them, credit the source (Lichess broadcasts, Opening Trail) and share under the same terms.</li>
<li>Move rules: chess.js (BSD-2-Clause). Piece set: Cburnett (used under BSD-3-Clause). Font: Pretendard (SIL OFL 1.1).</li></ul>
<h2>Downloads</h2>
<p>Every opening guide offers the same numbers as JSON (the “JSON” link at the bottom of the guide). The full position data is in shard files under <code>/data/t/</code>. The build date and counts are in <a href="/data/meta.json">meta.json</a>.</p>'''


STORE_KEYS = ['fm.band', 'fm.cards', 'fm.lang', 'fm.sound']


def privacy(lang):
    if lang == 'ko':
        return '''<h1>개인정보 처리방침</h1>
<p>마지막 확인: 2026년 11월 5일</p>
<h2>이 사이트가 이 기기에 남기는 것</h2>
<p>고른 레이팅대, 연습 기록, 효과음 설정을 다음에도 쓰도록 이 기기의 브라우저 저장소(localStorage)에만 적어요. 서버로 보내지 않아요. 키는 다음 네 개예요.</p>
<ul><li><code>fm.band</code>: 고른 레이팅대</li>
<li><code>fm.cards</code>: 연습한 국면마다 다음에 볼 날짜, 간격, 맞힌·틀린 횟수, 그 국면까지의 수순</li>
<li><code>fm.lang</code>: 다른 언어 안내를 닫았는지</li>
<li><code>fm.sound</code>: 효과음을 껐는지</li></ul>
<p>브라우저 설정에서 이 사이트의 데이터를 지우면 모두 사라져요. 회원 가입이나 로그인은 없어요.</p>
<h2>받아 오는 것</h2>
<p>수 통계와 오프닝 이름은 이 사이트(chess.lumenlab.page)의 파일에서 읽어요. 판에서 둔 수와 찾기 칸에 쓴 글은 어디에도 보내지 않아요. 글꼴은 jsDelivr에서 받아요.</p>
<h2>방문 통계</h2>
<p>사이트를 호스팅하는 Cloudflare가 방문 통계(Cloudflare Web Analytics)를 위해 작은 스크립트를 페이지에 넣어요. 본 페이지 주소, 직전 페이지 주소, 페이지가 열리는 데 걸린 시간, 브라우저 종류 같은 것을 모으고 쿠키는 쓰지 않아요. 판에서 둔 수나 연습 기록은 여기에 들어가지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스 광고를 보여 줄 수 있어요. Google을 비롯한 제3자 광고 업체는 쿠키를 써서 이 사이트와 다른 사이트에 방문한 기록을 바탕으로 광고를 보여 줄 수 있고, 웹 비콘으로 정보를 모을 수 있어요. 자세한 내용은 <a href="https://policies.google.com/technologies/partner-sites">파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에서 볼 수 있고, 맞춤 광고는 <a href="https://adssettings.google.com/">Google 광고 설정</a>에서 끌 수 있어요. 유럽 경제 지역·영국·스위스에서는 Google의 동의 메시지가 먼저 떠요.</p>
<h2>문의</h2>
<p>루멘랩: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''
    return '''<h1>Privacy Policy</h1>
<p>Last checked: November 5, 2026</p>
<h2>What this site keeps on your device</h2>
<p>So your rating choice, practice progress and sound setting are there next time, they are saved in this browser's storage (localStorage) only. Nothing is sent to a server. These are the four keys:</p>
<ul><li><code>fm.band</code>: the rating level you picked</li>
<li><code>fm.cards</code>: for each practiced position, the next review date, the interval, right and wrong counts, and the moves that led there</li>
<li><code>fm.lang</code>: whether you closed the language suggestion</li>
<li><code>fm.sound</code>: whether you turned sound effects off</li></ul>
<p>Clearing this site's data in your browser settings removes all of it. There are no accounts or logins.</p>
<h2>What the site loads</h2>
<p>Move statistics and opening names are read from files on this site (chess.lumenlab.page). The moves you play on the board and what you type in the search box are not sent anywhere. The font is loaded from jsDelivr.</p>
<h2>Visit statistics</h2>
<p>Cloudflare, which hosts the site, adds a small script for visit statistics (Cloudflare Web Analytics). It collects things like the page address, the previous page address, how long the page took to load and the browser type, and it does not use cookies. The moves you play and your practice progress are not part of it.</p>
<h2>Advertising</h2>
<p>This site may show Google AdSense ads. Third-party vendors, including Google, use cookies to serve ads based on your visits to this and other websites, and may collect information through web beacons. See <a href="https://policies.google.com/technologies/partner-sites">How Google uses data when you use our partners' sites or apps</a>; you can turn off personalized ads in <a href="https://adssettings.google.com/">Google Ad Settings</a>. Visitors in the EEA, the UK and Switzerland see Google's consent message first.</p>
<h2>Contact</h2>
<p>Lumen Lab: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''


# 페이지 칸 제목·짧은 글(build.py)
TX = {
    'en': {
        'crumb': 'Openings', 'home': 'Home', 'for_w': 'For White', 'for_b': 'For Black',
        'seen': 'Seen in {p} of rated games', 'games_n': '{n} games', 'eco': 'ECO',
        # 오프닝 페이지 11칸
        's_short': 'In one line', 's_deep': 'For stronger players',
        's_main': 'Main line, move by move', 's_main_p': 'Tap a move to see it on the board. Each move says why it is played.',
        's_next': 'What to play next', 's_next_p': 'Every move played after <span class="san">{line}</span>, sorted by engine score and what strong players choose. Share = {band}.',
        's_rating': '{name} at each rating',
        's_rating_p': 'How often the position after <span class="san">{line}</span> comes up in rated Lichess games, how it scores and what players answer next.',
        's_traps': 'Traps and how to punish them', 's_traps_auto': 'Popular mistakes here', 's_traps_auto_p': 'Moves that many players choose but the engine dislikes, with the best answer.',
        's_plans': 'What now: plans for both sides',
        's_vars': 'Variations', 's_same': 'Same position, other move orders', 's_same_p': 'Ways players reach the same position, and openings with the same pawn structure.',
        's_same_orders': 'Move orders that reach this position', 's_same_pawns': 'Same pawn structure', 's_same_none': 'Almost everyone reaches this position by the move order above.',
        's_learn': 'Who should learn it, and how this page was checked', 's_cont': 'Keep going',
        'learn_band': 'Worth learning from: {band}', 'learn_why': 'This is the first rating level where at least 1 in 200 games reaches the position.',
        'learn_any': 'Common at every level', 'learn_high': 'Mostly seen at 2000+',
        'rv': ['Written by AI', 'Played through by the engine', 'Read by a person'],
        'rv_sec': {'short': 'One-line summary', 'main': 'Move reasons', 'next': 'Next-move types', 'traps': 'Traps', 'plans': 'Plans', 'vars': 'Variations', 'stats': 'Numbers'},
        'rv_note': 'Lines and traps are played move by move with chess.js on every build; traps marked mate are checked to be mate. Numbers are counted from games, not written.',
        'otb_row': 'Masters (events)', 'otb_src': 'Lichess broadcasts, CC BY-SA 4.0',
        'cont_map': 'Open this position on the map', 'cont_test': 'Test yourself on this opening', 'cont_practice': 'Practice it as {side}',
        'cont_rep': 'Save to my repertoire (soon)', 'cont_json': 'Numbers as JSON',
        'cls_h': 'Type', 'ev_h': 'Engine', 'best_reply': 'Best answer', 'why_bad': 'Why people fall for it',
        'plans_h': 'Plans for both sides', 'white': 'White', 'black': 'Black',
        'th_band': 'Rating', 'th_games': 'Games', 'th_share': 'Share of games', 'th_result': 'White · Draw · Black', 'th_reply': 'Top next move',
        'band_all': 'All',
        'tree_h': 'What usually comes next',
        'tree_p': 'The most played moves from here, all ratings together. Thicker line = played more often.',
        'vars_h': 'Main variations', 'show_board': 'Show on the board',
        'var_stats': '{n} games from this position (all ratings, any move order). White won {w}, {d} were drawn, Black won {b}.',
        'var_rare': 'Too rare in our data for numbers.',
        'traps_h': 'Common traps', 'trap_n': 'In our data, the last move of this line was played in {n} games.', 'trap_rare': 'Fewer than 20 games in our data reached the end of this line.', 'mate': '(ends in mate)',
        'club_h': 'At club level',
        'practice_h': 'Practice it',
        'practice_p': 'The trainer answers with the replies people at your rating choose, in the same proportions, and brings back your mistakes on a schedule.',
        'practice_go': 'Practice as {side}',
        'related_h': 'Related openings',
        'first_h': 'First moves by rating', 'first_p': 'What players open with at each level. Share of games at that rating.',
        'popular_h': 'Most played openings', 'all_openings': 'See all {n} openings',
        'move': 'Move', 'share': 'Share',
        'opening_lbl': 'Opening', 'side_lbl': 'You play', 'start': 'Start', 'review': 'Review due moves', 'hint': 'Show the move', 'stop': 'Stop',
        'pr_how_h': 'How the trainer works',
        'pr_how': ['Your moves follow the guide’s main line. After that, the trainer expects the main move in that position: the sound move strong players choose most.',
                   'Your opponent plays the replies that people at the rating you picked really play, in the same proportions. Popular replies come up often; rare ones do not waste your time.',
                   'A wrong move shows the right one with a green arrow and saves the position. It comes back the same day, then after 1, 3, 7, 16, 35 and 90 days as you get it right.',
                   'If you play a different sound move that strong players also choose, it does not count as wrong. You are asked to find the move this line trains.'],
        'pr_list_h': 'Openings you can practice',
        'nf_title': 'Page not found', 'nf_home': 'Open the map',
        'upd': 'Updated {d}', 'by': 'Lumen Lab', 'read_lbl': 'Read the analysis',
        # 첫 수별·목록·추천
        'fm_h': 'Answers to 1.{m}', 'fm_lead': 'Every reply to 1.{m} in our games, how often each level plays it, how it scores, and where each one leads.',
        'fm_white': 'As White after 1.{m}', 'fm_black': 'As Black against 1.{m}',
        'fm_reply': 'Reply', 'fm_go': 'Guide', 'fm_none': '—', 'fm_other_h': 'Other first moves', 'fm_other_lead': 'First moves other than 1.e4, 1.d4, 1.c4 and 1.Nf3: how often they are played and where they lead.',
        'fm_first': 'First move', 'fm_cards': 'Openings that start here',
        'list_by_first': 'By first move',
        'best_side': ['For White', 'For Black'], 'best_score': 'Score', 'best_games': 'Games', 'best_pop': 'How often', 'best_none': 'Not enough games at this level.',
        'best_note': 'Score = (wins + half the draws) ÷ games, for the side that chooses the opening, between players at that level. Only openings reached in at least 1 in 400 games at that level are listed. A high score often means the opening sets problems that players at that level do not solve; it does not mean it is objectively best.',
        'home_map': 'Open the map', 'home_test': 'Take the opening test', 'home_list': 'All openings', 'home_best': 'Best openings at my rating',
        'home_first_h': 'Start from the first move', 'home_popular_h': 'Most played openings', 'home_how_h': 'How it works',
        'home_how': ['Every opening is a trail from move one. Each step says why the move is played.',
                     'Numbers come from 174.9 million rated games, split by rating, so you see what your own opponents play.',
                     'Each move is sorted: main, alternative, side line, dubious. Popular moves that the engine dislikes are marked as traps.'],
        'json_note': 'Same numbers as the page. Lichess games CC0; master numbers CC BY-SA 4.0 (Lichess broadcasts, Opening Trail).',
    },
    'ko': {
        'crumb': '오프닝', 'home': '홈', 'for_w': '백 오프닝', 'for_b': '흑 오프닝',
        'seen': '레이팅 대국의 {p}에서 나와요', 'games_n': '{n} 판', 'eco': 'ECO',
        's_short': '한 줄로', 's_deep': '더 깊이',
        's_main': '메인라인, 수마다 이유', 's_main_p': '수를 누르면 판에서 볼 수 있어요. 수마다 왜 두는지 적었어요.',
        's_next': '다음 수 4단계', 's_next_p': '<span class="san">{line}</span> 뒤에 두는 수 전부를 엔진 점수와 고수의 선택으로 나눴어요. 비율 = {band}.',
        's_rating': '레이팅대별 {name}',
        's_rating_p': '<span class="san">{line}</span> 뒤 국면이 리체스 레이팅 대국에서 얼마나 나오는지, 결과가 어떤지, 다음에 무엇을 두는지예요.',
        's_traps': '함정과 응징', 's_traps_auto': '여기서 자주 나오는 실수', 's_traps_auto_p': '많이 두지만 엔진이 싫어하는 수와 가장 좋은 응수예요.',
        's_plans': '여기서 이제 뭘 하나: 양쪽 계획',
        's_vars': '세부 갈래', 's_same': '같은 판, 다른 수순', 's_same_p': '같은 판에 다른 순서로 오는 길과, 폰 모양이 같은 오프닝이에요.',
        's_same_orders': '이 판에 오는 수순', 's_same_pawns': '폰 모양이 같은 오프닝', 's_same_none': '거의 모두 위 수순으로 이 판에 와요.',
        's_learn': '배울 레이팅대와 검토 상태', 's_cont': '이어 가기',
        'learn_band': '배우기 좋은 때: {band}', 'learn_why': '200판에 1판 넘게 이 판에 오는 첫 레이팅대예요.',
        'learn_any': '모든 레이팅대에서 흔해요', 'learn_high': '주로 2000 이상에서 나와요',
        'rv': ['AI가 씀', '엔진으로 둬 봄', '사람이 봄'],
        'rv_sec': {'short': '한 줄 설명', 'main': '수마다 이유', 'next': '다음 수 단계', 'traps': '함정', 'plans': '계획', 'vars': '갈래', 'stats': '숫자'},
        'rv_note': '수순과 함정은 빌드할 때마다 chess.js로 한 수씩 둬 보고, 메이트라고 적은 함정은 실제 메이트인지 봐요. 숫자는 쓴 것이 아니라 대국에서 센 것이에요.',
        'otb_row': '고수 대회', 'otb_src': '리체스 중계 기보, CC BY-SA 4.0',
        'cont_map': '지도에서 이 판 열기', 'cont_test': '이 오프닝으로 테스트', 'cont_practice': '{side}으로 연습',
        'cont_rep': '내 레퍼토리에 넣기(곧)', 'cont_json': '숫자를 JSON으로',
        'cls_h': '단계', 'ev_h': '엔진', 'best_reply': '가장 좋은 응수', 'why_bad': '왜 속나',
        'plans_h': '양쪽 계획', 'white': '백', 'black': '흑',
        'th_band': '레이팅', 'th_games': '판 수', 'th_share': '전체 중 비율', 'th_result': '백 승 · 무 · 흑 승', 'th_reply': '최다 다음 수',
        'band_all': '전체',
        'tree_h': '다음에 자주 나오는 수',
        'tree_p': '여기서 가장 많이 두는 수예요(전체 레이팅). 선이 굵을수록 많이 둬요.',
        'vars_h': '주요 갈래', 'show_board': '판에서 보기',
        'var_stats': '이 국면에서 둔 판 {n}(전체 레이팅, 다른 순서 포함). 백 승 {w}, 무승부 {d}, 흑 승 {b}.',
        'var_rare': '숫자를 내기엔 판이 적어요.',
        'traps_h': '자주 나오는 함정', 'trap_n': '우리 자료에서 이 수순의 마지막 수까지 둔 판: {n}', 'trap_rare': '우리 자료에서 이 수순 끝까지 간 판은 20판이 안 돼요.', 'mate': '(메이트까지)',
        'club_h': '동호인 레벨에서는',
        'practice_h': '연습하기',
        'practice_p': '연습 상대는 내 레이팅대 사람들이 실제로 두는 응수를 그 비율대로 두고, 틀린 수는 정해진 날에 다시 보여 줘요.',
        'practice_go': '{side}으로 연습',
        'related_h': '같은 갈래 오프닝',
        'first_h': '레이팅별 첫 수', 'first_p': '레이팅대마다 첫 수로 무엇을 두는지, 그 레이팅대 판 중 비율이에요.',
        'popular_h': '많이 두는 오프닝', 'all_openings': '오프닝 {n}개 모두 보기',
        'move': '수', 'share': '비율',
        'opening_lbl': '오프닝', 'side_lbl': '내 쪽', 'start': '시작', 'review': '오늘 복습', 'hint': '정답 보기', 'stop': '그만',
        'pr_how_h': '연습은 이렇게 돌아가요',
        'pr_how': ['내 수는 해설의 메인라인을 따라가요. 그다음은 그 판의 메인 수(고수가 가장 많이 고르는 건전한 수)가 정답이에요.',
                   '상대는 고른 레이팅대 사람들이 실제로 두는 응수를 그 비율대로 둬요. 자주 나오는 응수는 자주, 드문 응수는 드물게 나와요.',
                   '틀리면 초록 화살표로 정답을 보여 주고 그 국면을 저장해요. 그날 다시 나오고, 맞히면 1·3·7·16·35·90일 뒤에 또 나와요.',
                   '고수들도 두는 다른 건전한 수를 두면 틀린 것으로 치지 않아요. 이 수순이 익히는 수를 다시 찾아보게 해요.'],
        'pr_list_h': '연습할 수 있는 오프닝',
        'nf_title': '없는 페이지예요', 'nf_home': '지도 열기',
        'upd': '{d} 고침', 'by': '루멘랩', 'read_lbl': '분석 글 읽기',
        'fm_h': '1.{m}에 대한 응수', 'fm_lead': '우리 대국에서 1.{m} 뒤에 나온 응수 전부, 레이팅대마다 얼마나 두는지, 결과, 각각 어디로 이어지는지예요.',
        'fm_white': '1.{m} 뒤 백으로', 'fm_black': '1.{m}을 흑으로 상대할 때',
        'fm_reply': '응수', 'fm_go': '해설', 'fm_none': '—', 'fm_other_h': '그 밖의 첫 수', 'fm_other_lead': '1.e4·1.d4·1.c4·1.Nf3이 아닌 첫 수가 얼마나 나오고 어디로 이어지는지예요.',
        'fm_first': '첫 수', 'fm_cards': '여기서 시작하는 오프닝',
        'list_by_first': '첫 수별로',
        'best_side': ['백으로', '흑으로'], 'best_score': '점수', 'best_games': '판 수', 'best_pop': '나오는 비율', 'best_none': '이 레이팅대엔 판이 모자라요.',
        'best_note': '점수 = (이긴 판 + 비긴 판의 절반) ÷ 판 수, 그 오프닝을 고른 쪽 기준, 같은 레이팅대 사람들끼리. 그 레이팅대 400판에 1판 넘게 오는 오프닝만 올렸어요. 점수가 높다는 건 그 레이팅대 사람들이 잘 못 푸는 문제를 낸다는 뜻이 많고, 객관적으로 가장 좋다는 뜻은 아니에요.',
        'home_map': '지도 열기', 'home_test': '오프닝 실력 테스트', 'home_list': '오프닝 전부', 'home_best': '내 레이팅 추천 오프닝',
        'home_first_h': '첫 수부터 시작', 'home_popular_h': '많이 두는 오프닝', 'home_how_h': '이렇게 돌아가요',
        'home_how': ['오프닝마다 1수부터 이어진 길이에요. 한 걸음마다 왜 그 수를 두는지 적었어요.',
                     '숫자는 레이팅 대국 1억 7,493만 판을 레이팅대로 나눠 센 것이라, 내 상대가 실제로 두는 수가 보여요.',
                     '수마다 메인·대안·사이드·의심스러운 수로 나누고, 엔진이 싫어하는 인기 수는 함정수로 표시해요.'],
        'json_note': '페이지와 같은 숫자예요. 리체스 대국 CC0, 고수 대회 숫자 CC BY-SA 4.0(리체스 중계, 오프닝 트레일).',
    },
}


# ---------------------------------------------------------------- 테스트 한 판(app.js Test가 읽는다)
TEST = {
    'en': {
        'start': 'Start the test', 'q_of': 'Question {i} of {n}',
        'prompt_w': 'White to move. Which move do 2000+ players choose most?',
        'prompt_b': 'Black to move. Which move do 2000+ players choose most?',
        'tap': 'Tap a move or play it on the board.',
        'right': 'Right. {p} of 2000+ players choose {san}.',
        'wrong': 'Not this time. 2000+ players choose {san} most ({p}); {mine} gets {q}.',
        'off': '{mine} is not one of the four, and 2000+ players almost never play it here. They choose {san} ({p}).',
        'next': 'Next', 'see': 'See my result',
        'result_h': 'Your opening level', 'score': '{k} of {n} right',
        'like': 'Your picks look most like players at {band}.',
        'miss_h': 'Worth a second look', 'miss_none': 'You found the main road every time.',
        'guide': 'Guide', 'map': 'Map',
        'again': 'Play again', 'share': 'Share my card', 'save': 'Save the image', 'copied': 'Link copied',
        'share_text': 'I got {k}/{n} on the Opening Trail test: {level}. Can you beat it?',
        'only': 'Only {name}', 'all': 'All openings', 'load_fail': 'The test could not load. Check the connection and try again.',
        'card_sub': '10 real opening positions', 'card_url': 'chess.lumenlab.page/test',
        'levels': [['Trailhead', 'You are at the start of the trail. The first moves of each opening are the place to begin.'],
                   ['Wanderer', 'You know the first steps; after move three the path gets foggy.'],
                   ['Hiker', 'You stay on the main road in the common openings.'],
                   ['Pathfinder', 'You find the main road almost every time, even a few moves deep.'],
                   ['Mapmaker', 'You know the map better than most club players.'],
                   ['Trailblazer', 'Every move matched the strongest players. Try a harder opening next.']],
        'how_h': 'How the test works',
        'how': ['Every position comes from the opening map: real Lichess games, counted by rating.',
                'The right answer is the move that 2000+ players choose most in that position. The other three are moves people play at lower ratings.',
                'Your level comes from how many you get right. The rating line compares your picks with how often each rating group plays them.',
                'Nothing is sent anywhere: the test runs in your browser.'],
    },
    'ko': {
        'start': '테스트 시작', 'q_of': '{n}문제 중 {i}번째',
        'prompt_w': '백 차례예요. 2000+ 고수는 무엇을 가장 많이 둘까요?',
        'prompt_b': '흑 차례예요. 2000+ 고수는 무엇을 가장 많이 둘까요?',
        'tap': '아래 수를 누르거나 판에서 직접 둬요.',
        'right': '맞아요. 2000+의 {p}가 {san}를 둬요.',
        'wrong': '아쉬워요. 2000+는 {san}를 가장 많이 둬요({p}). {mine}는 {q}예요.',
        'off': '{mine}는 보기에 없고, 2000+는 여기서 거의 두지 않아요. 고수는 {san}를 둬요({p}).',
        'next': '다음', 'see': '결과 보기',
        'result_h': '내 오프닝 단계', 'score': '{n}문제 중 {k}개',
        'like': '고른 수가 {band} 사람들과 가장 닮았어요.',
        'miss_h': '다시 볼 국면', 'miss_none': '모든 국면에서 큰길을 찾았어요.',
        'guide': '해설', 'map': '지도',
        'again': '한 판 더', 'share': '카드 공유하기', 'save': '그림 저장', 'copied': '링크를 복사했어요',
        'share_text': '오프닝 트레일 테스트 {n}문제 중 {k}개, {level}! 이길 수 있어요?',
        'only': '{name}만', 'all': '모든 오프닝', 'load_fail': '테스트를 불러오지 못했어요. 연결을 확인하고 다시 해 봐요.',
        'card_sub': '실제 오프닝 국면 10개', 'card_url': 'chess.lumenlab.page/ko/test',
        'levels': [['출발점', '이제 길 입구에 섰어요. 오프닝마다 처음 몇 수부터 보면 좋아요.'],
                   ['산책자', '첫걸음은 알아요. 셋째 수 뒤로는 길이 흐려져요.'],
                   ['등산객', '흔한 오프닝에서는 큰길을 따라가요.'],
                   ['길잡이', '몇 수 깊이 들어가도 거의 늘 큰길을 찾아요.'],
                   ['지도 제작자', '웬만한 동호인보다 지도를 잘 알아요.'],
                   ['개척자', '모든 수가 고수와 같았어요. 다음엔 더 어려운 오프닝으로 해 봐요.']],
        'how_h': '테스트는 이렇게 만들어요',
        'how': ['국면은 모두 오프닝 지도에서 나와요. 리체스 실제 대국을 레이팅대별로 센 숫자예요.',
                '정답은 그 국면에서 2000+가 가장 많이 두는 수예요. 나머지 셋은 더 낮은 레이팅대가 많이 두는 수예요.',
                '단계는 맞힌 개수로 정해요. 레이팅 줄은 고른 수를 레이팅대마다 얼마나 두는지와 견줘서 정해요.',
                '아무것도 밖으로 보내지 않아요. 테스트는 브라우저 안에서만 돌아요.'],
    },
}
