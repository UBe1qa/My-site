"""화면 글(UI), 소개·방침. 오프닝 해설은 openings.py."""

UI = {
    'en': {
        'brand': 'Fewmoves', 'skip': 'Skip to content', 'nav_label': 'Main',
        'nav': {'explore': 'Explorer', 'openings': 'Openings', 'practice': 'Practice'},
        'lang_other': '한국어', 'lang_offer': 'This page is also in Korean.', 'lang_go': 'Read in Korean', 'close': 'Close',
        'about': 'About', 'privacy': 'Privacy', 'contact': 'Contact', 'ad': 'Advertisement',
        'lumen_b': 'Made by Lumen Lab', 'lumen_s': 'More free tools and games',
        'band_lbl': 'Lichess rating', 'band_all': 'All',
        'first': 'Start position', 'prev': 'Previous move', 'next': 'Next move', 'last': 'Last move', 'flip': 'Flip board',
        'th_move': 'Move', 'th_share': 'Played', 'th_games': 'Games', 'th_wdl': 'White · Draw · Black',
        'practice_w': 'Practice as White', 'practice_b': 'Practice as Black', 'guide_read': 'Read the guide:',
        'data_note': 'Rated blitz, rapid and classical games on Lichess, October 2026. Bullet is left out. Rating = average of both players.',
        'js': {
            'band_all': 'all ratings', 'name_start': 'Starting position', 'name_none': 'Unnamed position', 'mate': 'Checkmate. The game ends here.', 'drawn': 'The game is drawn here.',
            'ml_empty': 'Play a move on the board, or pick one from the table.',
            'sum': 'Games from this position ({band}): {n}',
            'sum_none': 'No games from this position ({band}) in our data.',
            'rows_none': 'Not enough games from here. Go back a move or pick another rating.',
            'load_fail': 'Could not load the numbers. Check your connection and try again.',
            'wdl_aria': 'White wins {w}, draws {d}, Black wins {b}',
            'white': 'White', 'black': 'Black', 'custom_line': 'your line from the explorer',
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
        },
    },
    'ko': {
        'brand': '외울수', 'skip': '본문으로 건너뛰기', 'nav_label': '주요 메뉴',
        'nav': {'explore': '탐색기', 'openings': '오프닝', 'practice': '연습'},
        'lang_other': 'English', 'lang_offer': '이 페이지는 영어로도 있어요.', 'lang_go': '영어로 보기', 'close': '닫기',
        'about': '소개', 'privacy': '개인정보 처리방침', 'contact': '문의', 'ad': '광고',
        'lumen_b': '루멘랩이 만들었어요', 'lumen_s': '다른 무료 도구와 게임 보기',
        'band_lbl': '리체스 레이팅', 'band_all': '전체',
        'first': '처음 국면', 'prev': '한 수 뒤로', 'next': '한 수 앞으로', 'last': '마지막 수', 'flip': '판 뒤집기',
        'th_move': '수', 'th_share': '비율', 'th_games': '판 수', 'th_wdl': '백 승 · 무 · 흑 승',
        'practice_w': '백으로 연습', 'practice_b': '흑으로 연습', 'guide_read': '해설 읽기:',
        'data_note': '리체스 2026년 10월 레이팅 대국(블리츠·래피드·클래식, 불릿 제외). 레이팅은 두 사람 평균.',
        'js': {
            'band_all': '전체 레이팅', 'name_start': '처음 국면', 'name_none': '이름 없는 국면', 'mate': '체크메이트예요. 대국이 여기서 끝나요.', 'drawn': '여기서 무승부로 끝나요.',
            'ml_empty': '판에서 말을 움직이거나 표에서 수를 고르세요.',
            'sum': '이 국면에서 둔 판({band}): {n}',
            'sum_none': '이 국면에서 둔 판이 없어요({band}).',
            'rows_none': '여기서부터는 판이 너무 적어요. 한 수 뒤로 가거나 다른 레이팅을 골라 보세요.',
            'load_fail': '숫자를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 해 보세요.',
            'wdl_aria': '백 승 {w}, 무승부 {d}, 흑 승 {b}',
            'white': '백', 'black': '흑', 'custom_line': '탐색기에서 고른 수순',
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
        },
    },
}

PAGES = {
    'en': {
        'home': {
            'title': 'Chess Opening Explorer by Rating | Fewmoves',
            'desc': 'See which moves players at your rating really play in every opening, with win rates from millions of Lichess games. Free, no sign-up.',
            'h1': 'Chess opening explorer by rating',
            'why': 'Move a piece or tap a move in the table. You see the moves players <b>at your rating</b> choose, from {games} Lichess games: the thicker the arrow, the more often it is played.',
        },
        'openings': {
            'title': 'Chess Openings List: Ideas and Stats by Rating | Fewmoves',
            'desc': 'The {n} most played chess openings with main lines, plans for both sides, common traps and win rates at four rating levels.',
            'h1': 'Chess openings, with numbers from real games',
            'lead': 'Each guide gives the main line, what each side is trying to do, the traps that really happen in club games, and how often every reply is played at four rating levels.',
        },
        'practice': {
            'title': 'Chess Opening Trainer with Spaced Repetition | Fewmoves',
            'desc': 'Drill your openings against the replies people really play at your rating. Mistakes come back on a schedule. Free, works in your browser.',
            'h1': 'Opening trainer',
            'why': 'Your opponent answers with the moves people at your rating <b>really play, in the same proportions</b>. Get one wrong and it comes back in your review.',
        },
    },
    'ko': {
        'home': {
            'title': '레이팅별 체스 오프닝 탐색기 | 외울수',
            'desc': '오프닝마다 내 레이팅대 사람들이 실제로 두는 수와 승률을 리체스 수백만 판으로 보여 줘요. 무료, 가입 없음.',
            'h1': '레이팅별 체스 오프닝 탐색기',
            'why': '말을 움직이거나 표에서 수를 눌러 보세요. <b>내 레이팅대 사람들</b>이 두는 수를 리체스 {games} 판으로 보여 줘요. 화살표가 굵을수록 많이 두는 수예요.',
        },
        'openings': {
            'title': '체스 오프닝 정리: 수순·계획·레이팅별 승률 | 외울수',
            'desc': '많이 두는 체스 오프닝 {n}개의 주요 수순, 양쪽의 계획, 실전에서 자주 걸리는 함정, 레이팅대 네 곳의 승률을 정리했어요.',
            'h1': '체스 오프닝, 실제 대국 숫자로 정리',
            'lead': '오프닝마다 주요 수순, 양쪽이 하려는 것, 동호인 대국에서 실제로 나오는 함정, 레이팅대 네 곳에서 각 응수가 얼마나 나오는지를 적었어요.',
        },
        'practice': {
            'title': '체스 오프닝 연습: 간격 반복으로 외우기 | 외울수',
            'desc': '내 레이팅대 사람들이 실제로 두는 응수를 상대로 오프닝을 연습해요. 틀린 수는 정해진 날에 다시 나와요. 무료, 브라우저에서.',
            'h1': '오프닝 연습',
            'why': '상대는 내 레이팅대 사람들이 <b>실제로 두는 수를 그 비율대로</b> 둬요. 틀린 수는 복습에 다시 나와요.',
        },
    },
}


def about(lang, meta):
    g = meta['games']
    if lang == 'ko':
        return f'''<h1>외울수 소개</h1>
<p class="lead">외울수는 체스 오프닝을 '책 한 권'이 아니라 <b>내 상대가 실제로 두는 수</b>부터 익히게 돕는 무료 사이트예요. 루멘랩이 만들었어요.</p>
<h2>숫자는 어디서 왔나</h2>
<p>리체스(lichess.org)가 공개한 2026년 10월 레이팅 대국 기록의 앞부분을 받아 직접 셌어요. 블리츠·래피드·클래식만 세고 불릿·초불릿·통신 대국은 뺐어요. 그렇게 남은 {g:,}판의 첫 12수(24수순)까지를 국면마다 묶었어요. 레이팅대는 두 사람 레이팅의 평균으로 나눠요(1200 미만, 1200–1599, 1600–1999, 2000 이상). 60판이 안 되는 국면과 6판이 안 되는 수는 싣지 않았어요.</p>
<p>리체스 레이팅은 같은 사람이라도 체스닷컴 레이팅보다 대체로 높게 나와요. 두 사이트 사이를 정확히 바꾸는 공식은 없어서, 사이트 안의 레이팅은 모두 리체스 기준이에요.</p>
<h2>오프닝 이름</h2>
<p>오프닝 이름과 ECO 분류는 리체스가 공개한 <a href="https://github.com/lichess-org/chess-openings">chess-openings</a> 목록(3,865개, CC0)을 써요. 한국어 이름은 갈래 이름을 모두 옮기고, 변화 이름은 많이 쓰는 것만 옮겼어요. 나머지 사람 이름은 영어로 두었어요.</p>
<h2>해설 수순은 어떻게 확인하나</h2>
<p>해설에 적은 주요 수순, 갈래, 함정은 사이트를 만들 때마다 체스 규칙 프로그램(chess.js)으로 처음부터 한 수씩 둬 봐요. 규칙에 어긋난 수가 하나라도 있으면 사이트가 만들어지지 않아요. "메이트까지"라고 적은 함정은 마지막 국면이 실제 체크메이트인지도 확인해요.</p>
<h2>연습은 어떻게 고르나</h2>
<p>연습에서 내가 둘 수는 해설의 주요 수순, 그다음은 같은 국면에서 레이팅 2000 이상이 가장 많이 둔 수예요. 상대 수는 고른 레이팅대에서 5% 넘게 나온 수 가운데 실제 비율대로 뽑아요. 틀린 수와 힌트를 본 수는 그날 다시, 맞힌 수는 1·3·7·16·35·90일 뒤에 다시 나와요. 기록은 이 기기의 브라우저에만 남아요.</p>
<h2>한계</h2>
<ul><li>많이 두는 수가 꼭 좋은 수는 아니에요. 승률은 그 레이팅대 사람들끼리 둔 결과라서 수 자체의 평가(엔진 점수)와 다를 수 있어요.</li>
<li>한 달 기록의 앞부분이라 아주 드문 수순은 숫자가 없어요.</li>
<li>해설은 사람이 쓴 설명이고 엔진 분석이 아니에요. 틀린 곳을 보면 <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>로 알려 주세요.</li></ul>
<h2>쓴 것</h2>
<ul><li>기보: <a href="https://database.lichess.org/">Lichess 대국 데이터베이스</a> (CC0)</li>
<li>오프닝 이름: <a href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a> (CC0)</li>
<li>규칙 계산: <a href="https://github.com/jhlywa/chess.js">chess.js</a> (BSD-2-Clause, <a href="/assets/chess.js-LICENSE.txt">사용 허가</a>)</li>
<li>말 그림: Cburnett, 위키미디어 공용 (BSD-3-Clause로 사용)</li>
<li>글꼴: Pretendard (SIL Open Font License 1.1)</li></ul>
<h2>문의</h2>
<p>루멘랩: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''
    return f'''<h1>About Fewmoves</h1>
<p class="lead">Fewmoves helps you learn chess openings starting from <b>the moves your opponents actually play</b>, not from a whole book. It is free and made by Lumen Lab.</p>
<h2>Where the numbers come from</h2>
<p>We downloaded the first part of the October 2026 rated games file that Lichess publishes and counted it ourselves. Only blitz, rapid and classical games are counted; bullet, ultrabullet and correspondence are left out. The first 12 moves (24 plies) of the remaining {g:,} games are grouped by position. Rating levels use the average of both players' ratings (under 1200, 1200–1599, 1600–1999, 2000 and up). Positions with fewer than 60 games and moves with fewer than 6 games are left out.</p>
<p>Lichess ratings usually run higher than Chess.com ratings for the same player. There is no exact conversion, so every rating on this site is a Lichess rating.</p>
<h2>Opening names</h2>
<p>Names and ECO codes come from the <a href="https://github.com/lichess-org/chess-openings">chess-openings</a> list that Lichess publishes (3,865 entries, CC0).</p>
<h2>How the guide lines are checked</h2>
<p>Every main line, variation and trap in the guides is played move by move with a chess rules library (chess.js) each time the site is built. If any move is illegal, the build stops. Traps marked "ends in mate" are also checked to end in checkmate.</p>
<h2>How practice picks moves</h2>
<p>In practice, your moves follow the guide's main line, then the move players rated 2000+ chose most often in that position. Your opponent's moves are drawn from the replies played more than 5% of the time at the rating you picked, in their real proportions. Wrong answers and hints come back the same day; right answers come back after 1, 3, 7, 16, 35 and 90 days. Your progress stays in this browser only.</p>
<h2>Limits</h2>
<ul><li>The most played move is not always the best move. Win rates are results between players at that level, which can differ from an engine evaluation.</li>
<li>This is the first part of one month of games, so very rare lines have no numbers.</li>
<li>The guides are written explanations, not engine analysis. If you spot a mistake, write to <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a>.</li></ul>
<h2>Credits</h2>
<ul><li>Games: <a href="https://database.lichess.org/">Lichess game database</a> (CC0)</li>
<li>Opening names: <a href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a> (CC0)</li>
<li>Move rules: <a href="https://github.com/jhlywa/chess.js">chess.js</a> (BSD-2-Clause, <a href="/assets/chess.js-LICENSE.txt">license</a>)</li>
<li>Piece set: Cburnett, Wikimedia Commons (used under the BSD-3-Clause license)</li>
<li>Font: Pretendard (SIL Open Font License 1.1)</li></ul>
<h2>Contact</h2>
<p>Lumen Lab: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''


STORE_KEYS = ['fm.band', 'fm.cards', 'fm.lang']


def privacy(lang):
    if lang == 'ko':
        return '''<h1>개인정보 처리방침</h1>
<p>마지막 확인: 2026년 11월 4일</p>
<h2>이 사이트가 이 기기에 남기는 것</h2>
<p>고른 레이팅대와 연습 기록을 다음에도 쓰도록 이 기기의 브라우저 저장소(localStorage)에만 적어요. 서버로 보내지 않아요. 키는 다음 세 개예요.</p>
<ul><li><code>fm.band</code>: 고른 레이팅대</li>
<li><code>fm.cards</code>: 연습한 국면마다 다음에 볼 날짜, 간격, 맞힌·틀린 횟수, 그 국면까지의 수순</li>
<li><code>fm.lang</code>: 다른 언어 안내를 닫았는지</li></ul>
<p>브라우저 설정에서 이 사이트의 데이터를 지우면 모두 사라져요. 회원 가입이나 로그인은 없어요.</p>
<h2>받아 오는 것</h2>
<p>수 통계는 이 사이트(chess.lumenlab.page)의 파일에서 읽어요. 판에서 둔 수는 어디에도 보내지 않아요. 글꼴은 jsDelivr에서 받아요.</p>
<h2>방문 통계</h2>
<p>사이트를 호스팅하는 Cloudflare가 방문 통계(Cloudflare Web Analytics)를 위해 작은 스크립트를 페이지에 넣어요. 본 페이지 주소, 직전 페이지 주소, 페이지가 열리는 데 걸린 시간, 브라우저 종류 같은 것을 모으고 쿠키는 쓰지 않아요. 판에서 둔 수나 연습 기록은 여기에 들어가지 않아요.</p>
<h2>광고</h2>
<p>이 사이트는 Google 애드센스 광고를 보여 줄 수 있어요. Google을 비롯한 제3자 광고 업체는 쿠키를 써서 이 사이트와 다른 사이트에 방문한 기록을 바탕으로 광고를 보여 줄 수 있고, 웹 비콘으로 정보를 모을 수 있어요. 자세한 내용은 <a href="https://policies.google.com/technologies/partner-sites">파트너 사이트에서 Google이 데이터를 사용하는 방식</a>에서 볼 수 있고, 맞춤 광고는 <a href="https://adssettings.google.com/">Google 광고 설정</a>에서 끌 수 있어요. 유럽 경제 지역·영국·스위스에서는 Google의 동의 메시지가 먼저 떠요.</p>
<h2>문의</h2>
<p>루멘랩: <a href="mailto:contact@lumenlab.page">contact@lumenlab.page</a></p>'''
    return '''<h1>Privacy Policy</h1>
<p>Last checked: November 4, 2026</p>
<h2>What this site keeps on your device</h2>
<p>So your rating choice and practice progress are there next time, they are saved in this browser's storage (localStorage) only. Nothing is sent to a server. These are the three keys:</p>
<ul><li><code>fm.band</code>: the rating level you picked</li>
<li><code>fm.cards</code>: for each practiced position, the next review date, the interval, right and wrong counts, and the moves that led there</li>
<li><code>fm.lang</code>: whether you closed the language suggestion</li></ul>
<p>Clearing this site's data in your browser settings removes all of it. There are no accounts or logins.</p>
<h2>What the site loads</h2>
<p>Move statistics are read from files on this site (chess.lumenlab.page). The moves you play on the board are not sent anywhere. The font is loaded from jsDelivr.</p>
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
        'seen': 'Seen in {p} of rated games', 'games_n': '{n} games',
        'plans_h': 'Plans for both sides', 'white': 'White', 'black': 'Black',
        'rating_h': '{name} at each rating',
        'rating_p': 'How often the position after <span class="san">{line}</span> comes up in rated Lichess games, how it scores and what players answer next.',
        'th_band': 'Rating', 'th_games': 'Games', 'th_share': 'Share of games', 'th_result': 'White · Draw · Black', 'th_reply': 'Top next move',
        'band_all': 'All',
        'tree_h': 'What usually comes next',
        'tree_p': 'The most played moves from here, all ratings together. Thicker line = played more often.',
        'vars_h': 'Main variations', 'show_board': 'Show on the board',
        'var_stats': '{n} games from this position (all ratings, any move order). White won {w}, {d} were drawn, Black won {b}.',
        'var_rare': 'Too rare in our data for numbers.',
        'traps_h': 'Common traps', 'trap_n': 'In our data, the last move of this line was played in {n} games.', 'trap_rare': 'Fewer than 6 games in our data reached the end of this line.', 'mate': '(ends in mate)',
        'club_h': 'At club level',
        'practice_h': 'Practice it',
        'practice_p': 'The trainer answers with the replies people at your rating choose, in the same proportions, and brings back your mistakes on a schedule.',
        'practice_go': 'Practice as {side}',
        'related_h': 'Related openings',
        'first_h': 'First moves by rating', 'first_p': 'What players open with at each level. Share of games at that rating.',
        'e4_h': 'Answers to 1.e4 by rating', 'd4_h': 'Answers to 1.d4 by rating',
        'popular_h': 'Most played openings', 'all_openings': 'See all {n} openings',
        'how_h': 'How to use the explorer',
        'how': ['Play a move on the board, or tap a row in the table. The arrows show the most played moves; a thicker arrow means a more common move.',
                'Pick a rating level. The numbers change to games between players at that level, so you see what your own opponents play.',
                'The bar shows how the games ended: White wins, draws and Black wins. It is the result between people at that level, not an engine score.',
                'When you reach a named opening, a link to its guide appears. "Practice" starts the trainer from the position on the board.'],
        'move': 'Move', 'share': 'Share',
        'opening_lbl': 'Opening', 'side_lbl': 'You play', 'start': 'Start', 'review': 'Review due moves', 'hint': 'Show the move', 'stop': 'Stop',
        'pr_how_h': 'How the trainer works',
        'pr_how': ['Your moves follow the guide’s main line. After that, the trainer expects the move that players rated 2000+ choose most often in that position.',
                   'Your opponent plays the replies that people at the rating you picked really play, in the same proportions. Popular replies come up often; rare ones do not waste your time.',
                   'A wrong move shows the right one with a green arrow and saves the position. It comes back the same day, then after 1, 3, 7, 16, 35 and 90 days as you get it right.',
                   'If you play a different move that strong players also choose often, it does not count as wrong. You are asked to find the move this line trains.'],
        'pr_list_h': 'Openings you can practice',
        'nf_title': 'Page not found', 'nf_home': 'Go to the explorer',
        'upd': 'Updated {d}', 'by': 'Lumen Lab', 'read_lbl': 'Read the analysis',
    },
    'ko': {
        'crumb': '오프닝', 'home': '홈', 'for_w': '백 오프닝', 'for_b': '흑 오프닝',
        'seen': '레이팅 대국의 {p}에서 나와요', 'games_n': '{n} 판',
        'plans_h': '양쪽 계획', 'white': '백', 'black': '흑',
        'rating_h': '레이팅대별 {name}',
        'rating_p': '<span class="san">{line}</span> 뒤 국면이 리체스 레이팅 대국에서 얼마나 나오는지, 결과가 어떤지, 다음에 무엇을 두는지예요.',
        'th_band': '레이팅', 'th_games': '판 수', 'th_share': '전체 중 비율', 'th_result': '백 승 · 무 · 흑 승', 'th_reply': '최다 다음 수',
        'band_all': '전체',
        'tree_h': '다음에 자주 나오는 수',
        'tree_p': '여기서 가장 많이 두는 수예요(전체 레이팅). 선이 굵을수록 많이 둬요.',
        'vars_h': '주요 갈래', 'show_board': '판에서 보기',
        'var_stats': '이 국면에서 둔 판 {n}(전체 레이팅, 다른 순서 포함). 백 승 {w}, 무승부 {d}, 흑 승 {b}.',
        'var_rare': '숫자를 내기엔 판이 적어요.',
        'traps_h': '자주 나오는 함정', 'trap_n': '우리 자료에서 이 수순의 마지막 수까지 둔 판: {n}', 'trap_rare': '우리 자료에서 이 수순 끝까지 간 판은 6판이 안 돼요.', 'mate': '(메이트까지)',
        'club_h': '동호인 레벨에서는',
        'practice_h': '연습하기',
        'practice_p': '연습 상대는 내 레이팅대 사람들이 실제로 두는 응수를 그 비율대로 두고, 틀린 수는 정해진 날에 다시 보여 줘요.',
        'practice_go': '{side}으로 연습',
        'related_h': '같은 갈래 오프닝',
        'first_h': '레이팅별 첫 수', 'first_p': '레이팅대마다 첫 수로 무엇을 두는지, 그 레이팅대 판 중 비율이에요.',
        'e4_h': '레이팅별 1.e4 응수', 'd4_h': '레이팅별 1.d4 응수',
        'popular_h': '많이 두는 오프닝', 'all_openings': '오프닝 {n}개 모두 보기',
        'how_h': '탐색기 쓰는 법',
        'how': ['판에서 말을 움직이거나 표의 줄을 누르세요. 화살표는 많이 두는 수이고, 굵을수록 더 많이 둬요.',
                '레이팅대를 고르면 그 레이팅대 사람들끼리 둔 판으로 숫자가 바뀌어요. 내 상대가 실제로 두는 수를 볼 수 있어요.',
                '막대는 판이 어떻게 끝났는지예요. 백 승, 무승부, 흑 승. 엔진 점수가 아니라 그 레이팅대 사람들끼리 둔 결과예요.',
                '이름 있는 오프닝에 닿으면 해설 링크가 떠요. "연습"을 누르면 판의 국면부터 연습을 시작해요.'],
        'move': '수', 'share': '비율',
        'opening_lbl': '오프닝', 'side_lbl': '내 쪽', 'start': '시작', 'review': '오늘 복습', 'hint': '정답 보기', 'stop': '그만',
        'pr_how_h': '연습은 이렇게 돌아가요',
        'pr_how': ['내 수는 해설의 주요 수순을 따라가요. 그다음은 같은 국면에서 레이팅 2000 이상이 가장 많이 둔 수가 정답이에요.',
                   '상대는 고른 레이팅대 사람들이 실제로 두는 응수를 그 비율대로 둬요. 자주 나오는 응수는 자주, 드문 응수는 드물게 나와요.',
                   '틀리면 초록 화살표로 정답을 보여 주고 그 국면을 저장해요. 그날 다시 나오고, 맞히면 1·3·7·16·35·90일 뒤에 또 나와요.',
                   '고수들도 많이 두는 다른 수를 두면 틀린 것으로 치지 않아요. 이 수순이 익히는 수를 다시 찾아보게 해요.'],
        'pr_list_h': '연습할 수 있는 오프닝',
        'nf_title': '없는 페이지예요', 'nf_home': '탐색기로 가기',
        'upd': '{d} 고침', 'by': '루멘랩', 'read_lbl': '분석 글 읽기',
    },
}
