"""병아리 구조대 소개 사이트 만들기: 한국어 / , 영어 /en/ , 404, 개인정보 처리방침 /privacy·/en/privacy, sitemap, robots, 제목 글꼴 조각.
  python3 _dev/build.py [Jua-Regular.ttf 경로 = _dev/var2/fonts/Jua-Regular.ttf]
글은 아래 S 사전 한 곳에서 고친다(한국어·영어 같이). 페이지 틀은 page() 하나.
얼굴(2026-10-17): 시안 Q '튜브 쇼케이스'. 칸 순서 = 맛보기 → 둥지 나무 → 친구 무대 → 클래식 vs 구출 → 질문 → 끝 단추 → 꼬리말.
숫자·사실의 출처: 게임 저장소 UBe1qa/mobile-games(landing-kit d926451)와 게임 세션 답(2026-10-16).
루멘랩 사업체 문서 '병아리 구조대' 칸에 같은 내용이 있다. 맛보기 /assets/demo.js와 친구 카드 판 /assets/chick-board.js·friends.js(LEVELS는 게임 규칙으로 확인한 판)는 게임 세션이 준 그대로 두고 고치지 않는다(mobile-games landing-kit: chick-board.js a56f51a, friends.js 2f7bbeb).
"""
import hashlib, html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
BASE = 'https://chick-rescue.lumenlab.page'
MAIL = 'contact@lumenlab.page'
FONT_SRC = os.path.join(HERE, 'var2', 'fonts', 'Jua-Regular.ttf')  # OFL 원본(저장소에 넣지 않는다)
FONT_NAME = 'CR Round'  # 조각 글꼴 이름(OFL: 원래 이름을 쓰지 않는다)


def _pct(s):
    return re.sub(r'[^A-Za-z0-9]', lambda m: ''.join('%%%02X' % b for b in m.group().encode()), s)


# ── 주 단추(목표 행동): 말·주소·안내를 여기 한 곳에서 바꾸면 머리말·하단 줄·맛보기 완료 창·끝 칸이 다 같이 바뀐다 ──
# 구글 플레이 사전 등록으로 바꿀 때: 'href'를 스토어 주소로, 'label'을 ('구글 플레이 사전 등록', 'Pre-register on Google Play')로,
# 'note'를 사전 등록 안내로 바꾼다. 사이트 안 메일 신청 칸으로 바꿀 때는 'href'를 '#signup' 같은 칸 주소로.
CTA = {
    'label': ('출시 소식 메일로 받기', 'Get launch news by email'),
    'href': ('mailto:' + MAIL + '?subject=' + _pct('병아리 구조대 출시 알림 신청'),
             'mailto:' + MAIL + '?subject=' + _pct('Chick Rescue launch alert')),
    'note': ('메일 앱이 열리면 그대로 보내 주세요.', 'Your mail app opens with the note ready. Just send it.'),
}

# ── 개인정보 처리방침(/privacy, /en/privacy): 본문은 _dev/privacy/privacy_ko.md·privacy_en.md ──
# 원본은 게임 저장소 games/sort-puzzle/store/privacy_*.md(landing-kit 3d3f206: iOS 부분까지. 사이트 칸만 여기서 채움). 앱 부분(항목·권한·목적)은 실제 빌드에서 확인한 사실이라
# 바꾸지 않는다(바꿔야 하면 게임 세션에 먼저). 게임 설정 창 단추가 이 두 주소를 그대로 연다(주소를 바꾸면 게임 세션에 알린다).
PRIVACY = {
    # 보호책임자 칸: 사용자 결정(2026-10-17) 실명 대신 담당 부서 + 전화(개인정보 보호법 제30조가 허용). 비어 있으면 check.py가 실패
    'officer': ('루멘랩(LUMEN LAB) 개인정보 보호 담당', 'LUMEN LAB privacy team'),  # 운영자 이름은 계정 인증 이름(landing-kit 9679f81)
    'phone': ('070-8098-5263', '+82 70-8098-5263'),
    'inquiry_keep': ('답변을 마친 뒤 1년, 삭제를 요청하면 바로', '1 year after we reply, or right away if you ask us to delete it'),
    'title': ('개인정보 처리방침 · 병아리 구조대', 'Privacy Policy · Chick Rescue'),
    'desc': ('병아리 구조대 앱(Android·iOS)과 사이트가 처리하는 정보: 광고(Google AdMob)·추적 허용(ATT)·결제(Google Play·App Store)·앱 권한·방문 통계·문의 메일.',
             'What the Chick Rescue app (Android and iOS) and site handle: ads (Google AdMob), tracking permission (ATT), purchases (Google Play, App Store), app permissions, visit statistics and email.'),
    'link': ('개인정보 처리방침', 'Privacy Policy'),
    'short': ('개인정보', 'Privacy'), 'more': ('처리방침', 'Policy'),  # 머리말 단추: 좁은 화면은 앞말만 보인다
    'back': ('병아리 구조대 홈', 'Chick Rescue home'),
}

# 키: (한국어, 영어)
S = {
  'lang': ('ko', 'en'),
  'title': ('병아리 구조대 — 튜브를 옮겨 갇힌 병아리를 구하는 정렬 퍼즐', 'Chick Rescue — a sort puzzle where you free trapped chicks'),
  'desc': ('튜브 속 동물 친구들을 옮기고, 꾹 눌러 능력을 써서 묻힌 병아리를 둥지로 보내는 퍼즐 게임. 메인 1,440판 무료, 인터넷 없이. 안드로이드 출시 준비 중.',
           'Move animal friends between tubes, hold to use their abilities, and send the buried chicks home. 1,440 main levels free, works offline. Coming to Android.'),
  'skip': ('맛보기 판으로 건너뛰기', 'Skip to the playable level'),
  'name': ('병아리 구조대', 'Chick Rescue'),
  'other_lang': ('English', '한국어'),
  'other_lang_label': ('Read this page in English', '한국어로 보기'),

  # 1. 첫 화면 + 맛보기
  'h1': ('튜브를 옮겨 병아리를 구해요', 'Move the critters, free the chick'),
  'sub': ('<b>메인 1,440판 무료</b> · 인터넷 없이', '<b>1,440 main levels free</b> · plays offline'),
  'sound': ('소리', 'Sound'), 'undo': ('되돌리기', 'Undo'), 'hint': ('힌트', 'Hint'), 'restart': ('다시 하기', 'Restart'),
  'peep': ('삐약! 꺼내 줘요', 'Peep! Get me out!'),
  # 지금 사이트 '막혔을 때' 칸(help1~3)을 한 줄로
  'help': ('막혀도 괜찮아요. 판마다 첫 힌트와 되돌리기·다시 하기는 무료, 막히면 막히기 직전으로 한 번에 돌아가요.',
           'Stuck? The first hint on every level is free, undo and restart always are, and one tap takes you back to just before you got stuck.'),
  'status': ('안드로이드 출시 준비 중 · 웹으로 옮긴 맛보기 두 판', 'Coming to Android · two levels to try on the web'),

  # 2. 둥지 나무(판을 깨면 병아리가 사는 곳)
  'nest_h2': ('구한 병아리는<br>둥지 나무에서 살아요', 'Every chick you save<br>moves into the nest tree'),
  'nest_lead': ('별을 모아 친구 집을 짓고, 하루 한 판 오늘의 도전도 있어요.', 'Spend stars on homes for your friends, and solve a new Daily Challenge every day.'),
  'tree_alt': ('둥지 아홉 개가 달린 큰 나무. 사다리와 등불이 걸려 있어요', 'A big tree with nine nests, a ladder and a lantern'),
  'sign_n': ('1,440판', '1,440'), 'sign_s': ('메인 판<br>전부 무료', 'main levels<br>all free'),
  'ground': ('퍼즐 모음 6개·960판도 있어요. 모음마다 첫 스테이지는 무료예요.', 'Plus 6 puzzle packs with 960 levels. The first stage of each pack is free.'),

  # 3. 친구 무대
  'fr_h2': ('친구를 꾹 누르면<br>능력이 나가요', 'Hold a friend<br>to use its ability'),
  'fr_lead': ('능력을 써야만 풀리는 판이 있어요. 친구 12마리, 능력도 12가지.', 'Some levels need an ability to solve. Twelve friends, twelve abilities.'),
  'fr_show': ('친구 능력', 'Friend abilities'), 'fr_pick': ('친구 고르기', 'Pick a friend'),
  'fr_prev': ('이전 친구', 'Previous friend'), 'fr_next': ('다음 친구', 'Next friend'),
  'fr_clip': ('{name} 능력을 쓰는 실제 게임 장면', 'Real game clip of the {name} ability'),
  'fr_note': ('능력·구출 모드 1~4스테이지에서는 스테이지마다 새 친구가 셋씩 나와요.', 'In Abilities and Rescue, stages 1 to 4 each bring three new friends.'),

  # 4. 클래식 vs 구출(실제 화면)
  'real_h2': ('다 모으지 않아도 돼요<br>병아리만 꺼내면 끝', 'No need to sort it all.<br>Free the chick and you win'),
  'classic': ('클래식', 'Classic'), 'classic_c': ('같은 색끼리 다 모아야 끝', 'Sort every color to win'),
  'classic_alt': ('클래식 모드 실제 게임 화면: 같은 색끼리 다 모아야 끝나요', 'Real Classic mode screen: sort every color to finish'),
  'ability': ('능력', 'Abilities'), 'ability_c': ('꾹 눌러 능력을 써야 풀려요', 'Hold a critter to use its power'),
  'ability_alt': ('능력 모드 실제 게임 화면: 사자를 꾹 눌러 능력을 쓰는 순간', 'Real Abilities mode screen: holding the lion to use its power'),
  'rescue': ('구출', 'Rescue'), 'rescue_c': ('병아리만 꺼내면 끝', 'Free the chicks to win'),
  'video_label': ('구출 판을 처음부터 끝까지 푸는 실제 게임 영상 13초, 소리 없음', '13-second clip of a Rescue level solved start to finish in the real game, no sound'),
  'real_note': ('모드는 클래식·능력·구출 셋, 모드마다 16스테이지예요. 한 판은 18초쯤이에요.',
                'Three modes, Classic, Abilities and Rescue, with 16 stages each. A level takes about 18 seconds.'),
  'real_src': ('한 판 시간: 개발하면서 직접 푼 45판의 중앙값', 'Level time: median of 45 levels the developer played'),

  # 5. 자주 묻는 질문(넷)
  'faq_h2': ('자주 묻는 질문', 'Questions'),
  'faq': ([
    ('언제, 어디서 받을 수 있나요?', '안드로이드(구글 플레이)부터 준비하고 있어요. 지금은 휴대폰에서 테스트하는 중이고, 출시일은 아직 정하지 않았어요.'),
    ('아이폰에서도 되나요?', '준비 중이에요. 아이폰용(iOS 15 이상)으로도 만들고 있지만 실제 아이폰에서 확인하기 전이에요.'),
    ('돈을 써야 하나요? 광고는요?', '메인 1,440판은 끝까지 무료예요. 지금 정한 규칙으로는 처음 쓰는 날과 첫 15판엔 판 사이 광고가 없고, 그 뒤에도 많아야 3판에 한 번이에요. '
                            '광고 제거와 퍼즐 모음은 결제로 열고, 가격은 출시 때 정해요. 돈을 내고 무작위로 뽑는 아이템은 없어요.'),
    ('퍼즐을 잘 못해도 할 수 있나요?', '네. 능력 없는 클래식부터 시작하면 돼요. 섞인 튜브가 없으면 남은 정리는 게임이 알아서 끝내 줘요.'),
  ], [
    ('When and where can I get it?', 'Android (Google Play) comes first. The game is being play-tested on phones now, and there is no release date yet.'),
    ('Will it work on iPhone?', 'It is in the works. An iPhone build (iOS 15 or later) exists but has not been checked on a real iPhone yet.'),
    ('Do I have to pay? What about ads?', 'All 1,440 main levels are free to the end. Under the current plan there are no ads between levels on your first day or your first 15 levels, '
                                          'and after that at most one every 3 levels. Removing ads and the puzzle packs are paid, with prices set at launch. There are no paid random draws.'),
    ('I’m not great at puzzles. Can I still play?', 'Yes. Start with Classic, which has no abilities. Once no tube is mixed, the game finishes the tidy-up for you.'),
  ]),

  # 6. 끝 칸
  'end_h2': ('나오면 제일 먼저<br>알려 드릴게요', 'Be the first to know<br>when it launches'),
  'end_note': ('안드로이드부터 나와요.', 'Android comes first.'),

  # 공유 그림(og.jpg·og-en.jpg) 한 줄: _dev/og.html이 data-og로 읽는다
  'og': ('튜브 속 병아리를 구해요', 'Free the trapped chick'),

  # 꼬리말
  'lumen_small': ('이 게임을 만든 곳', 'This game is made by'), 'lumen_name': ('루멘랩', 'Lumen Lab'),
  'lumen_sub': ('다른 게임·앱·웹 도구 보기', 'See our other games, apps and tools'), 'lumen_peep': ('삐약!', 'Peep!'),
  'lumen_url': ('https://lumenlab.page/', 'https://lumenlab.page/en/'),
  'foot_ai': ('로고·배경·둥지 나무·집 그림은 AI 도구(Higgsfield)로, 동물 친구와 효과는 게임 코드로 그렸어요.',
              'The logo, backgrounds, nest tree and houses were made with an AI tool (Higgsfield); the animal friends and effects are drawn by the game’s own code.'),
  'foot_dev': ('화면과 숫자는 개발 중인 게임 기준이라 출시 전에 바뀔 수 있어요.', 'Screens and numbers reflect the game in development and may change before launch.'),
}

FRIENDS = ['squirrel', 'frog', 'otter', 'bat', 'octopus', 'turtle', 'penguin', 'mole', 'owl', 'elephant', 'lion', 'whale']
# 게임 localization/strings.csv 의 SPECIES_*·SPECIES_*_DESC 그대로
FR = {
 'squirrel': (('다람쥐', '꾹 누르면 꼭대기까지 올라가요. 위 친구들은 한 칸씩 내려와요.'), ('Squirrel', 'Hold to climb straight to the top. The critters above move down one space.')),
 'frog': (('개구리', '꾹 누른 뒤 튜브를 고르면, 어디에 있든 그 튜브 맨 위로 뛰어가요. 빈 튜브나 맨 위가 개구리인 튜브로 갈 수 있어요.'), ('Frog', 'Hold, then tap a tube. It jumps out from wherever it is onto that tube. It can land in an empty tube or on another frog.')),
 'otter': (('해달', '꾹 누르면 바로 아래 친구와 자리를 바꿔요.'), ('Otter', 'Hold to swap places with the critter right below it.')),
 'bat': (('박쥐', '꾹 누르면 박쥐가 있는 튜브를 통째로 뒤집어요.'), ('Bat', 'Hold to flip its whole tube upside down.')),
 'octopus': (('문어', '맨 위에 있을 때 꾹 누르면 왼쪽 튜브 맨 위 친구를 자기 위로 끌어와요. 맨 왼쪽에서는 맨 오른쪽 튜브에서 끌어와요.'), ('Octopus', 'When on top, hold to pull the top critter of the tube on its left onto itself. From the first tube it pulls from the last one.')),
 'turtle': (('거북이', '꾹 누르면 바닥까지 잠수해요. 아래 친구들은 한 칸씩 올라와요.'), ('Turtle', 'Hold to dive straight to the bottom. The critters below move up one space.')),
 'penguin': (('펭귄', '맨 위에 있을 때 꾹 누르면 바로 오른쪽 튜브 맨 위로 미끄러져 가요. 그 튜브에 누가 있든 자리만 있으면 돼요. 맨 오른쪽에서는 첫 튜브로 가요.'), ('Penguin', 'When on top, hold to slide onto the tube right next to it. Any critter can be on top there as long as there is room. From the last tube it slides to the first.')),
 'mole': (('두더지', '맨 위에 있을 때 꾹 누르면 오른쪽 튜브 바닥으로 파고들어요. 그 튜브 친구들은 한 칸씩 올라가요. 맨 오른쪽에서는 첫 튜브로 가요.'), ('Mole', 'When on top, hold to dig down to the bottom of the tube on its right. The critters there move up one space. From the last tube it digs into the first.')),
 'owl': (('부엉이', '꾹 누르면 자기 튜브를 한 칸 돌려요. 맨 위 친구가 바닥으로 내려가고 나머지는 한 칸씩 올라가요.'), ('Owl', 'Hold to turn its tube by one: the top critter goes to the bottom and the rest move up one space.')),
 'elephant': (('코끼리', '맨 위에 있을 때 꾹 누르면 물을 뿜어서, 오른쪽 튜브 맨 위 친구를 그다음 튜브로 날려 보내요. 받는 튜브에 자리만 있으면 돼요.'), ('Elephant', 'When on top, hold to spray water: the top critter of the tube on its right is pushed one more tube to the right. That tube just needs room.')),
 'lion': (('사자', '맨 위에 있을 때 꾹 누른 뒤 다른 튜브를 고르면, 그 튜브 맨 위 친구와 자리를 바꿔요. 튜브가 꽉 차 있어도 돼요.'), ('Lion', 'When on top, hold and then tap another tube to trade places with its top critter. Works even if the tubes are full.')),
 'whale': (('고래', '꾹 누르면 큰 파도가 쳐서, 모든 튜브의 맨 위 친구가 한 칸씩 오른쪽 튜브로 옮겨 가요. 맨 오른쪽 친구는 첫 튜브로 가요. 완성된 튜브는 쉬어요.'), ('Whale', 'Hold to make a big wave: the top critter of every tube moves one tube to the right, and the last one goes to the first. Completed tubes stay out of it.')),
}

DEMO = {
 'ko': {'names': {'A': '빨강이', 'B': '파랑이', 'C': '노랑이', 'c': '다람쥐', 'b': '병아리'}, 'empty': '비었어요', 'tube': '튜브 {n}',
        'tip1': '튜브를 눌러 맨 위 친구를 옮겨 보세요. 병아리가 맨 위로 나오면 둥지로 날아가요.',
        'tip2': '다람쥐를 꾹 누르면 꼭대기까지 올라가요. 병아리 위를 비워 주세요.',
        'pick': '옮길 튜브를 누르세요. 비었거나 맨 위가 같은 친구인 튜브로 가요.',
        'go': '좋아요. 병아리 위에 있는 친구들을 치워 주세요.',
        'cant': '거기는 못 가요. 맨 위 친구가 같은 튜브나 빈 튜브로만 옮길 수 있어요.',
        'cantFull': '그 튜브는 꽉 찼어요. 한 튜브에 4칸까지 들어가요.',
        'cantSealed': '그 튜브는 이미 다 모아서 잠겼어요.',
        'climbTop': '다람쥐가 이미 맨 위예요.',
        'saved': '병아리가 둥지로 날아갔어요!',
        'count': '이동 {n}번 · 가장 적게 {min}번', 'best': '가장 적은 수예요.',
        'doneTitle': '구했어요!', 'done': '{n}번 만에 병아리를 구했어요.',
        'doneAllTitle': '맛보기 끝!', 'doneAll': '{n}번 만에 구했어요. 실제 게임엔 무료로 하는 판만 1,440판이에요.',
        'next': '다음 판: 다람쥐 능력', 'seeReal': '실제 게임 화면 보기', 'again': '처음부터 다시',
        'hintPour': '‘여기서’ 튜브를 누른 다음 ‘여기로’ 튜브를 눌러 보세요.', 'hintFrom': '여기서', 'hintTo': '여기로', 'hintClimb': '빛나는 다람쥐를 꾹 눌러 보세요.',
        'stuck': '더 풀 수 없어요. 되돌리기나 다시 하기를 눌러 주세요.'},
 'en': {'names': {'A': 'Red', 'B': 'Blue', 'C': 'Yellow', 'c': 'Squirrel', 'b': 'Chick'}, 'empty': 'empty', 'tube': 'Tube {n}',
        'tip1': 'Tap a tube to move its top critter. When a chick reaches the top, it flies home.',
        'tip2': 'Hold the squirrel to climb to the top. Clear the way above the chick.',
        'pick': 'Now tap where it goes: an empty tube, or one with the same critter on top.',
        'go': 'Nice. Clear the critters sitting on the chick.',
        'cant': 'Can’t go there. Move onto the same critter, or into an empty tube.',
        'cantFull': 'That tube is full. Each tube holds 4.',
        'cantSealed': 'That tube is already sorted and locked.',
        'climbTop': 'The squirrel is already on top.',
        'saved': 'The chick flew home!',
        'count': 'Moves {n} · best {min}', 'best': 'That’s the fewest possible.',
        'doneTitle': 'Rescued!', 'done': 'You saved the chick in {n} moves.',
        'doneAllTitle': 'That’s the taste!', 'doneAll': 'Saved in {n} moves. The real game has 1,440 free main levels.',
        'next': 'Next: the squirrel’s ability', 'seeReal': 'See the real game', 'again': 'Start over',
        'hintPour': 'Tap the “From” tube, then the “To” tube.', 'hintFrom': 'From', 'hintTo': 'To', 'hintClimb': 'Hold the glowing squirrel.',
        'stuck': 'This board can’t be solved now. Try Undo or Restart.'},
}


# 친구 무대: 소리말(만든 말)·한 줄(FR 설명을 줄인 것)·무대 색(면, 테두리, 글자)
STAGE = {
 'squirrel': (('쏙!', '꾹 누르면 꼭대기까지 올라가요'), ('Zip!', 'Hold to climb straight to the top'), '#F5A04A', '#C9772A', 'ink'),
 'frog': (('폴짝!', '꾹 누르고 튜브를 고르면 그리로 뛰어가요'), ('Hop!', 'Hold, pick a tube, and it jumps there'), '#8FD15A', '#5FA62F', 'ink'),
 'otter': (('휙!', '꾹 누르면 바로 아래 친구와 자리를 바꿔요'), ('Swap!', 'Hold to swap with the friend right below'), '#FF9E8A', '#D9705C', 'ink'),
 'bat': (('홱!', '꾹 누르면 튜브를 통째로 뒤집어요'), ('Flip!', 'Hold to flip its whole tube upside down'), '#7A5CC0', '#5A3F99', 'white'),
 'octopus': (('쭉!', '맨 위에서 꾹 누르면 왼쪽 튜브 맨 위 친구를 끌어와요'), ('Grab!', 'On top, hold to pull over the top friend on its left'), '#F08CC8', '#C45E9E', 'ink'),
 'turtle': (('풍덩!', '꾹 누르면 바닥까지 잠수해요'), ('Dive!', 'Hold to dive straight to the bottom'), '#3FC1A5', '#23917A', 'ink'),
 'penguin': (('쓩!', '맨 위에서 꾹 누르면 오른쪽 튜브로 미끄러져 가요'), ('Slide!', 'On top, hold to slide onto the next tube'), '#7CC7F2', '#4A9CCB', 'ink'),
 'mole': (('파바박!', '맨 위에서 꾹 누르면 오른쪽 튜브 바닥으로 파고들어요'), ('Dig!', 'On top, hold to dig to the bottom of the next tube'), '#B9A4F0', '#8C74CC', 'ink'),
 'owl': (('빙그르!', '꾹 누르면 자기 튜브를 한 칸 돌려요'), ('Spin!', 'Hold to turn its tube round by one'), '#CFE9A0', '#9DC066', 'ink'),
 'elephant': (('뿌우!', '맨 위에서 꾹 누르면 물을 뿜어 옆 튜브 친구를 날려 보내요'), ('Whoosh!', 'On top, hold to spray the next top friend along'), '#A9C3F5', '#7895CF', 'ink'),
 'lion': (('어흥!', '맨 위에서 꾹 누르고 튜브를 고르면 그 맨 위 친구와 자리를 바꿔요'), ('Roar!', 'On top, hold and pick a tube to trade places with its top friend'), '#FFD45C', '#D9A825', 'ink'),
 'whale': (('철썩!', '파도 한 번에 모든 튜브 맨 위 친구가 옆 튜브로'), ('Splash!', 'One wave moves every top friend one tube along'), '#2A72C2', '#1C5594', 'white'),
}

JUA = set()  # 'CR Round'로 그리는 글자(page()가 모은다 → 글꼴 조각)


def j(s):
    """제목·숫자·단추처럼 둥근 글꼴로 그리는 글. 글자를 모아 조각에 넣는다."""
    JUA.update(re.sub(r'<[^>]+>|&[a-z]+;', '', s))
    return s


def L(key, i):
    return S[key][i]


def page(i):
    lang = S['lang'][i]
    pre = '' if i == 0 else '/en'
    url = BASE + ('/' if i == 0 else '/en/')
    other = '/en/' if i == 0 else '/'
    olang = S['lang'][1 - i]
    t = lambda k: L(k, i)
    e = lambda k: html.escape(L(k, i), quote=True)
    cta_href = html.escape(CTA['href'][i], quote=True)
    cta = lambda cls='': f'<a class="cta{(" " + cls) if cls else ""}" href="{cta_href}" data-cta>{j(CTA["label"][i])}</a>'
    # 친구 무대(옆으로 넘기기) + 12마리 줄
    slides, picks = [], []
    for n, k in enumerate(FRIENDS):
        verb, say = STAGE[k][i]
        bg, rim, ink = STAGE[k][2], STAGE[k][3], STAGE[k][4]
        nm = FR[k][i][0]
        clip = html.escape(t('fr_clip').replace('{name}', nm), quote=True)
        slides.append(
            f'<article class="stage{" is-white" if ink == "white" else ""}" id="st-{k}" data-k="{k}" style="--c:{bg};--cd:{rim}" '
            f'role="group" aria-roledescription="{"카드" if i == 0 else "slide"}" aria-label="{n + 1} / {len(FRIENDS)}: {html.escape(nm)}">'
            f'<div class="stage-top"><img class="ball" src="/img/c-{k}.webp" width="160" height="160" alt="" loading="lazy">'
            f'<div><p class="verb" aria-hidden="true">{j(verb)}</p><h3>{j(nm)}</h3></div></div>'
            f'<p class="say">{say}</p>'
            f'<div class="win"><video muted loop playsinline preload="none" poster="/img/abilities/{k}.webp" width="480" height="512" aria-label="{clip}">'
            f'<source src="/video/abilities/{k}.mp4" type="video/mp4"></video></div></article>')
        picks.append(f'<button type="button" class="pick" data-k="{k}" aria-controls="st-{k}" aria-pressed="{"true" if n == 0 else "false"}" style="--c:{bg}">'
                     f'<img src="/img/c-{k}.webp" width="160" height="160" alt="" loading="lazy"><span class="sr">{nm}</span></button>')
    rows = ''.join(f'<div class="pick-tube">{"".join(picks[r * 6:(r + 1) * 6])}</div>' for r in range(2))
    chicks = ''.join(f'<span class="tc" style="--x:{x}%;--y:{y}%;--i:{n}" aria-hidden="true"></span>' for n, (x, y) in enumerate(
        ((50, 11.5), (31, 22), (69, 22), (25, 36), (74.5, 36), (23.5, 50), (77.5, 50), (23.5, 63), (76.5, 63.5))))
    spill = ''.join(f'<img class="s{n + 1}" style="--i:{n}" src="/img/c-{k}.webp" width="160" height="160" alt="">'
                    for n, k in enumerate(('frog', 'whale', 'squirrel', 'bat', 'lion', 'penguin')))
    faq = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t('faq'))
    faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in t('faq')]}, ensure_ascii=False)
    demo = DEMO[lang]
    for k in ('doneTitle', 'doneAllTitle', 'hintFrom', 'hintTo'):
        j(demo[k])
    j({'ko': '완성!콤보 x', 'en': 'Done!Combo x'}[lang])  # demo.js 떠오르는 글자(판 글꼴로 그린다)
    demo_json = json.dumps(demo, ensure_ascii=False)
    game_ld = json.dumps({'@context': 'https://schema.org', '@type': 'VideoGame', 'name': t('name'), 'url': url,
                          'description': t('desc'), 'genre': 'Puzzle', 'gamePlatform': 'Android',
                          'inLanguage': ['ko', 'en', 'ja'], 'image': BASE + ('/og.jpg' if i == 0 else '/og-en.jpg'),
                          'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}, ensure_ascii=False)
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="only light">
<title>{e('title')}</title>
<meta name="description" content="{e('desc')}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="ko" href="{BASE}/">
<link rel="alternate" hreflang="en" href="{BASE}/en/">
<link rel="alternate" hreflang="x-default" href="{BASE}/en/">
<meta name="theme-color" content="#FFE680">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e('name')}">
<meta property="og:title" content="{e('title')}">
<meta property="og:description" content="{e('desc')}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/og{'' if i == 0 else '-en'}.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="{'ko_KR' if i == 0 else 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/head.woff2?v=__HEADFONT__" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/logo-{lang}.webp" as="image" fetchpriority="high">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
<script type="application/ld+json">{game_ld}</script>
<script type="application/ld+json">{faq_ld}</script>
</head>
<body>
<a class="skip" href="#try">{t('skip')}</a>
<header class="top" id="top">
  <div class="wrap">
    <a class="brand" href="{pre}/"><img class="brand-logo" src="/img/logo-{lang}.webp" width="640" height="425" alt="{e('name')}"><span class="brand-mini"><img src="/img/icon-256.webp" width="34" height="34" alt="">{j(t('name'))}</span></a>
    <div class="top-r">
      <a class="lang lang-pol" href="{pre}/privacy">{j(PRIVACY['short'][i])}<span class="pol-more">{j(PRIVACY['more'][i])}</span></a>
      <a class="lang" href="{other}" hreflang="{olang}" lang="{olang}" aria-label="{e('other_lang_label')}">{j(t('other_lang'))}</a>
      {cta('cta-top')}
    </div>
  </div>
</header>
<main>
<section class="hero" id="try" aria-labelledby="h1">
  <div class="rays" aria-hidden="true"></div>
  <div class="spill" aria-hidden="true">{spill}</div>
  <div class="hero-col">
    <img class="hero-logo" src="/img/logo-{lang}.webp" width="640" height="425" alt="" aria-hidden="true">
    <h1 id="h1">{j(t('h1'))}</h1>
    <p class="hero-sub">{t('sub')}</p>
    <div class="demo" id="demo">
      <div class="demo-bar">
        <span class="demo-count" aria-live="polite"></span>
        <div class="nest" aria-hidden="true"></div>
        <button type="button" class="btn demo-sound" data-act="sound" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="off" d="m16 9 6 6m0-6-6 6"/></svg>{j(t('sound'))}</button>
      </div>
      <p class="peep" aria-hidden="true" hidden>{j(t('peep'))}</p>
      <div class="board"><div class="pieces" aria-hidden="true"></div></div>
      <p class="demo-tip" aria-live="polite"></p>
      <div class="demo-ctrl">
        <button type="button" class="btn" data-act="undo">{j(t('undo'))}</button>
        <button type="button" class="btn btn-hint" data-act="hint">{j(t('hint'))}</button>
        <button type="button" class="btn" data-act="restart">{j(t('restart'))}</button>
      </div>
      <div class="demo-done" role="dialog" aria-labelledby="demo-done-h" aria-live="polite" hidden>
        <h2 id="demo-done-h"></h2><p></p>
        {cta('cta-done')}
        <small class="done-note">{CTA['note'][i]}</small>
        <div class="done-more">
          <button type="button" class="btn btn-link" data-act="next"></button>
          <button type="button" class="btn btn-link" data-act="real"></button>
        </div>
      </div>
      <canvas class="fx" aria-hidden="true"></canvas>
      <script type="application/json" id="demo-text">{demo_json}</script>
    </div>
    <p class="hero-help">{t('help')}</p>
    <p class="hero-status">{t('status')}</p>
  </div>
</section>

<section class="nestsec" id="nest" aria-labelledby="nest-h">
  <div class="wrap">
    <div class="nest-copy">
      <h2 class="h2" id="nest-h">{j(t('nest_h2'))}</h2>
      <p class="lead">{t('nest_lead')}</p>
      <div class="houses" aria-hidden="true"><img src="/img/house-squirrel.webp" width="320" height="320" alt="" loading="lazy"><img src="/img/house-frog.webp" width="320" height="320" alt="" loading="lazy"></div>
    </div>
    <div class="tree drop">
      <img src="/img/nest-tree.webp" width="640" height="857" loading="lazy" decoding="async" alt="{e('tree_alt')}">
      {chicks}
      <p class="sign"><b>{j(t('sign_n'))}</b><span>{t('sign_s')}</span></p>
    </div>
  </div>
  <div class="ground"><p>{t('ground')}</p></div>
</section>

<section class="friends" id="friends" aria-labelledby="fr-h">
  <div class="wrap">
    <h2 class="h2" id="fr-h">{j(t('fr_h2'))}</h2>
    <p class="lead">{t('fr_lead')}</p>
    <div class="show" role="region" aria-roledescription="{'카드 넘기기' if i == 0 else 'carousel'}" aria-label="{e('fr_show')}">
      <button type="button" class="nav nav-prev" aria-label="{e('fr_prev')}" aria-controls="track"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="track" id="track" tabindex="0" aria-label="{e('fr_show')}">{''.join(slides)}</div>
      <button type="button" class="nav nav-next" aria-label="{e('fr_next')}" aria-controls="track"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    <div class="picker" role="group" aria-label="{e('fr_pick')}">{rows}</div>
    <p class="fr-note">{t('fr_note')}</p>
  </div>
</section>

<section class="real" id="real" aria-labelledby="real-h">
  <div class="wrap">
    <h2 class="h2" id="real-h">{j(t('real_h2'))}</h2>
    <div class="vs">
      <figure class="ph ph-classic drop">
        <div class="ph-frame"><img src="/img/shot-classic_play_{lang}.webp" width="600" height="1300" loading="lazy" decoding="async" alt="{e('classic_alt')}"></div>
        <figcaption><b>{j(t('classic'))}</b>{t('classic_c')}</figcaption>
      </figure>
      <figure class="ph ph-ability drop">
        <div class="ph-frame"><img src="/img/shot-ability_use_{lang}.webp" width="600" height="1300" loading="lazy" decoding="async" alt="{e('ability_alt')}"></div>
        <figcaption><b>{j(t('ability'))}</b>{t('ability_c')}</figcaption>
      </figure>
      <figure class="ph ph-rescue drop">
        <div class="ph-frame"><video data-auto muted loop playsinline preload="none" poster="/img/play-{lang}-poster.webp" width="600" height="1300" aria-label="{e('video_label')}"><source src="/img/play-{lang}.mp4" type="video/mp4"><source src="/img/play-{lang}.webm" type="video/webm"></video></div>
        <figcaption><b>{j(t('rescue'))}</b><span>{t('rescue_c')}</span></figcaption>
      </figure>
    </div>
    <p class="note">{t('real_note')}</p>
    <p class="src">{t('real_src')}</p>
  </div>
</section>

<section class="faq" id="faq" aria-labelledby="faq-h">
  <div class="wrap">
    <h2 class="h2" id="faq-h">{j(t('faq_h2'))}</h2>
    <div class="qa">{faq}</div>
  </div>
</section>

<section class="end" id="end" aria-labelledby="end-h">
  <div class="wrap">
    <h2 class="h2" id="end-h">{j(t('end_h2'))}</h2>
    <div class="end-stack">
      <div class="end-cta">
        {cta('cta-end')}
        <img class="end-chick" src="/img/c-chick.webp" width="160" height="160" alt="" aria-hidden="true">
      </div>
      <div class="big-tube" aria-hidden="true">
        <img style="--i:0" src="/img/c-squirrel.webp" width="160" height="160" alt="" loading="lazy">
        <img style="--i:1" src="/img/c-frog.webp" width="160" height="160" alt="" loading="lazy">
        <img style="--i:2" src="/img/c-whale.webp" width="160" height="160" alt="" loading="lazy">
      </div>
      <div class="end-shelf" aria-hidden="true"></div>
    </div>
    <p class="end-note">{t('end_note')} {CTA['note'][i]}</p>
  </div>
</section>
</main>

<aside class="lumen" id="lumen" aria-label="{e('lumen_name')}">
  <div class="wrap">
    <a class="lumen-card" href="{t('lumen_url')}">
      <span class="lumen-tube" aria-hidden="true">
        <img class="lb" style="--i:0" src="/img/c-whale.webp" width="160" height="160" alt="" loading="lazy">
        <img class="lb" style="--i:1" src="/img/c-frog.webp" width="160" height="160" alt="" loading="lazy">
        <img class="lb" style="--i:2" src="/img/c-squirrel.webp" width="160" height="160" alt="" loading="lazy">
        <img class="lb lb-chick" style="--i:3" src="/img/c-chick.webp" width="160" height="160" alt="" loading="lazy">
        <span class="lumen-peep">{j(t('lumen_peep'))}</span>
      </span>
      <span class="lumen-txt"><small>{t('lumen_small')}</small><b>{j(t('lumen_name'))}</b><span class="lumen-sub">{t('lumen_sub')}</span></span>
      <span class="lumen-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
    </a>
  </div>
</aside>

<footer class="foot">
  <div class="wrap">
    <div class="row">
      <span>© 2026 Lumen Lab</span>
      <a href="mailto:{MAIL}">{MAIL}</a>
      <a href="{pre}/privacy">{PRIVACY['link'][i]}</a>
      <a href="{t('lumen_url')}">lumenlab.page</a>
      <a href="{other}" hreflang="{olang}" lang="{olang}">{t('other_lang')}</a>
    </div>
    <p>{t('foot_ai')}</p>
    <p>{t('foot_dev')}</p>
  </div>
</footer>

<div class="dock" id="dock">{cta('cta-dock')}</div>

<script src="/assets/demo.js?v=__DEMO__" defer></script>
<script src="/assets/site.js?v=__SITE__" defer></script>
<script src="/assets/chick-board.js?v=__BOARD__" defer></script>
<script src="/assets/friends.js?v=__FRIENDS__" defer></script>
</body>
</html>
'''


def _inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2">\1</a>', t)


def md_html(md):
    """방침 본문(제목·문단·목록·표·굵게·링크만 쓰는 마크다운)을 HTML로. 표는 칸마다 data-label을 달아 좁은 화면에서 세로 목록으로 바꾼다."""
    out, lines, k = [], md.strip('\n').split('\n'), 0
    while k < len(lines):
        ln = lines[k]
        if not ln.strip():
            k += 1
        elif ln.startswith('# '):
            out.append(f'<h1>{_inline(ln[2:])}</h1>'); k += 1
        elif ln.startswith('## '):
            out.append(f'<h2>{_inline(ln[3:])}</h2>'); k += 1
        elif ln.startswith('|'):
            rows = []
            while k < len(lines) and lines[k].startswith('|'):
                rows.append([c.strip() for c in lines[k].strip().strip('|').split('|')]); k += 1
            head, body = rows[0], [r for r in rows[2:]]
            assert all(len(r) == len(head) for r in body), rows
            th = ''.join(f'<th scope="col">{_inline(c)}</th>' for c in head)
            tr = ''.join('<tr>' + ''.join(f'<td data-label="{html.escape(h, quote=True)}">{_inline(c)}</td>' for h, c in zip(head, r)) + '</tr>' for r in body)
            out.append(f'<div class="pol-table"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
        elif ln.startswith('- '):
            items = []
            while k < len(lines) and (lines[k].startswith('- ') or lines[k].startswith('  - ')):
                if lines[k].startswith('- '):
                    items.append([_inline(lines[k][2:]), []])
                else:
                    items[-1][1].append(_inline(lines[k][4:]))
                k += 1
            out.append('<ul>' + ''.join(f'<li>{a}' + (f'<ul>{"".join(f"<li>{x}</li>" for x in sub)}</ul>' if sub else '') + '</li>' for a, sub in items) + '</ul>')
        else:
            para = []
            while k < len(lines) and lines[k].strip() and not lines[k].startswith(('#', '|', '- ')):
                para.append(lines[k]); k += 1
            out.append(f'<p>{_inline(" ".join(para))}</p>')
    return '\n'.join(out)


def privacy(i):
    lang = S['lang'][i]
    pre = '' if i == 0 else '/en'
    url = BASE + pre + '/privacy'
    other = ('/en' if i == 0 else '') + '/privacy'
    olang = S['lang'][1 - i]
    md = open(os.path.join(HERE, 'privacy', f'privacy_{lang}.md'), encoding='utf-8').read()
    for key in ('officer', 'phone', 'inquiry_keep'):
        md = md.replace('{' + key + '}', PRIVACY[key][i] or '[' + key + ']')
    e = lambda x: html.escape(x, quote=True)
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="only light">
<title>{e(PRIVACY['title'][i])}</title>
<meta name="description" content="{e(PRIVACY['desc'][i])}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="ko" href="{BASE}/privacy">
<link rel="alternate" hreflang="en" href="{BASE}/en/privacy">
<link rel="alternate" hreflang="x-default" href="{BASE}/en/privacy">
<meta name="theme-color" content="#FFE680">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="/img/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
</head>
<body class="pol-page">
<header class="pol-top">
  <div class="wrap">
    <a class="brand" href="{pre}/"><span class="brand-mini"><img src="/img/icon-256.webp" width="34" height="34" alt="">{j(S['name'][i])}</span></a>
    <a class="lang" href="{other}" hreflang="{olang}" lang="{olang}">{j(S['other_lang'][i])}</a>
  </div>
</header>
<main class="pol wrap">
{md_html(md)}
<p class="pol-back"><a class="cta" href="{pre}/">{j(PRIVACY['back'][i])}</a></p>
</main>
<footer class="foot">
  <div class="wrap">
    <div class="row">
      <span>© 2026 Lumen Lab</span>
      <a href="mailto:{MAIL}">{MAIL}</a>
      <a href="{pre}/privacy" aria-current="page">{PRIVACY['link'][i]}</a>
      <a href="{S['lumen_url'][i]}">lumenlab.page</a>
      <a href="{other}" hreflang="{olang}" lang="{olang}">{S['other_lang'][i]}</a>
    </div>
  </div>
</footer>
</body>
</html>
'''


def not_found():
    return f'''<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="only light">
<title>페이지가 없어요 · 병아리 구조대</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#FFE680"><link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
</head>
<body class="lost">
<main class="lost-box">
<div class="lost-tube" aria-hidden="true"><img src="/img/c-chick.webp" width="160" height="160" alt=""></div>
<h1>{j('이 페이지는 둥지에 없어요')}</h1>
<p lang="en">This page doesn’t exist.</p>
<p class="lost-acts"><a class="cta" href="/">{j('병아리 구조대 홈')}</a><a class="lang" href="/en/" lang="en">{j('Chick Rescue home')}</a></p>
</main>
</body>
</html>
'''


def sha(path):
    return hashlib.sha256(open(os.path.join(SITE, path), 'rb').read()).hexdigest()[:8]


def head_font(src):
    """둥근 제목 글꼴(Jua, OFL) 중 page()가 모은 글자만 남긴 조각. 이름을 바꾸고 라이선스(assets/OFL.txt)를 같이 둔다."""
    chars = set(JUA) | set('0123456789,.·!?:;-–—~() &/%+ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz’\'"“”')
    chars.discard('\n')
    txt = os.path.join(HERE, '.head-chars.txt')
    open(txt, 'w', encoding='utf-8').write(''.join(sorted(chars)))
    out = os.path.join(SITE, 'assets', 'head.woff2')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--text-file={txt}', '--flavor=woff2',
                    f'--output-file={out}', '--layout-features=kern,liga', '--no-hinting', '--desubroutinize',
                    '--name-IDs=0,1,2,3,4,5,6', '--name-languages=*'], check=True)
    from fontTools.ttLib import TTFont
    f = TTFont(out, recalcTimestamp=False)
    names = {1: FONT_NAME, 3: FONT_NAME + ' subset', 4: FONT_NAME, 6: FONT_NAME.replace(' ', '') + '-Regular', 16: FONT_NAME, 17: 'Regular'}
    for rec in f['name'].names:
        if rec.nameID in names:
            rec.string = names[rec.nameID]
    f.flavor = 'woff2'
    f.save(out)
    os.remove(txt)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else FONT_SRC
    pages = [page(0), page(1), not_found(), privacy(0), privacy(1)]  # 먼저 만들어야 둥근 글꼴 글자가 모인다
    for x in S['og']:  # 공유 그림(_dev/og.html)도 같은 조각을 쓴다
        j(x)
    if os.path.exists(src):
        head_font(src)
    else:
        print('글꼴 원본이 없어 assets/head.woff2를 그대로 둬요:', src)
    # CSS 안의 글꼴 주소 지문을 먼저 맞춘 뒤 CSS 지문을 잰다
    css_p = os.path.join(SITE, 'assets/site.css')
    css = open(css_p, encoding='utf-8').read()
    css2 = re.sub(r'head\.woff2\?v=[^)"]+', 'head.woff2?v=' + sha('assets/head.woff2'), css)
    if css2 != css:
        open(css_p, 'w', encoding='utf-8').write(css2)
    v = {'__CSS__': sha('assets/site.css'), '__DEMO__': sha('assets/demo.js'), '__SITE__': sha('assets/site.js'), '__BOARD__': sha('assets/chick-board.js'), '__FRIENDS__': sha('assets/friends.js'),
         '__HEADFONT__': sha('assets/head.woff2')}

    def fill(s):
        for k, x in v.items():
            s = s.replace(k, x)
        return s
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    for p, s in zip(('index.html', 'en/index.html', '404.html', 'privacy.html', 'en/privacy.html'), pages):  # privacy.html은 /privacy로 열린다(auto-trailing-slash)
        open(os.path.join(SITE, p), 'w', encoding='utf-8').write(fill(s))
    sm = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
''' + ''.join(f'''  <url><loc>{BASE}{p}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="{BASE}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="{BASE}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}/en/"/>
  </url>
''' for p in ('/', '/en/')) + ''.join(f'''  <url><loc>{BASE}{p}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="{BASE}/privacy"/>
    <xhtml:link rel="alternate" hreflang="en" href="{BASE}/en/privacy"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}/en/privacy"/>
  </url>
''' for p in ('/privacy', '/en/privacy')) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    open(os.path.join(SITE, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n')
    print('ok', v, '둥근 글꼴 글자', len(JUA))


if __name__ == '__main__':
    main()
