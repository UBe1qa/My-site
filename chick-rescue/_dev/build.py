"""병아리 구조대 소개 사이트 만들기: 한국어 / , 영어 /en/ , 404, sitemap, 제목 글꼴 조각.
  python3 _dev/build.py [게임 글꼴 PretendardJP-Bold.otf 경로]
글은 아래 S 사전 한 곳에서 고친다(한국어·영어 같이). 페이지 틀은 PAGE 하나.
숫자·사실의 출처: 게임 저장소 UBe1qa/mobile-games(landing-kit d926451)와 게임 세션 답(2026-10-16).
루멘랩 사업체 문서 '병아리 구조대' 칸에 같은 내용이 있다.
"""
import hashlib, html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
BASE = 'https://chick-rescue.lumenlab.page'
MAIL = 'woxocoso@gmail.com'

# 키: (한국어, 영어)
S = {
  'lang': ('ko', 'en'),
  'title': ('병아리 구조대 — 동물 친구들과 병아리를 구하는 정렬 퍼즐', 'Chick Rescue — an animal sort puzzle with special abilities'),
  'desc': ('튜브 속 동물 친구들을 옮기고, 꾹 눌러 능력을 써서 묻힌 병아리를 둥지로 보내는 퍼즐 게임. 메인 1,440판 무료, 인터넷 없이. 안드로이드 출시 준비 중.',
           'Move animal friends between tubes, hold to use their abilities, and send the buried chicks home. 1,440 main levels free, works offline. Coming to Android.'),
  'skip': ('맛보기 판으로 건너뛰기', 'Skip to the playable level'),
  'name': ('병아리 구조대', 'Chick Rescue'),
  'other_lang': ('English', '한국어'),
  'other_lang_label': ('Read this page in English', '한국어로 보기'),
  'h1': ('동물 친구들을 옮겨 갇힌 병아리를 구하는 정렬 퍼즐', 'A sort puzzle: move the critters, free the trapped chicks'),
  'undo': ('되돌리기', 'Undo'), 'hint': ('힌트', 'Hint'), 'restart': ('다시 하기', 'Restart'),
  'status': ('<b>안드로이드 출시 준비 중</b> · 웹으로 옮긴 맛보기예요. <a href="#real">실제 게임 화면 보기</a>',
             '<b>Coming to Android</b> · This is a web taste of two levels. <a href="#real">See the real game</a>'),
  'side_l': ('실제 게임 첫 화면', 'The real game’s home screen'),
  'side_r': ('판을 깨면 별을 받아요', 'Clear a level, earn stars'),

  'real_eye': ('실제 게임 화면', 'The real game'),
  'real_h2': ('맛보기 말고, 진짜 게임은 이렇게 움직여요', 'Here is how the real game plays'),
  'real_p': ('개발 중인 게임에서 병아리 구출 한 판을 처음부터 끝까지 푼 화면이에요. 함께 놓인 화면도 게임에서 그대로 찍었어요.',
             'One Rescue level solved start to finish in the game in development. Every screen here is captured straight from the game.'),
  'video_cap': ('실제 플레이 13초 · 소리 없음', '13 seconds of real play · no sound'),
  'video_label': ('구출 판을 푸는 실제 게임 영상', 'Video of the real game solving a Rescue level'),
  'shot_rescue': ('구출', 'Rescue'), 'shot_rescue_c': ('병아리만 꺼내면 끝, 다 정리하지 않아도 돼요', 'Free every chick and you win, no need to sort it all'),
  'shot_ability': ('능력', 'Abilities'), 'shot_ability_c': ('사자를 꾹 눌러 다른 튜브 맨 위 친구와 자리를 바꿔요', 'Hold the lion to trade places with another tube’s top critter'),
  'shot_classic': ('클래식', 'Classic'), 'shot_classic_c': ('능력 없이 같은 색끼리 모아요', 'Plain sorting, no abilities'),
  'shot_clear': ('판 깸', 'Level clear'), 'shot_clear_c': ('적은 수로 깰수록 별이 많아요', 'Fewer moves, more stars'),
  'shot_map': ('판 지도', 'Level map'), 'shot_map_c': ('모드마다 16스테이지, 절반을 깨면 다음 스테이지가 열려요', '16 stages per mode, clear half to open the next'),
  'shot_home': ('첫 화면', 'Home'), 'shot_home_c': ('모드 셋과 퍼즐 모음', 'Three modes and puzzle packs'),

  'fr_eye': ('열두 친구의 능력', 'Twelve friends, twelve abilities'),
  'fr_h2': ('꾹 누르면 능력을 써요. 능력을 써야 풀리는 판이 있어요', 'Hold a friend to use its ability. Some levels need it.'),
  'fr_p': ('같은 색끼리 옮기는 것만이 아니에요. 친구를 눌러 무슨 능력인지 보세요.', 'It is more than moving colors around. Tap a friend to see what it can do.'),
  'fr_note': ('능력 모드에서 동물 친구가 나오는 판은 모두 능력을 써야 풀려요. 능력·구출 모드 1~4스테이지에서 스테이지마다 새 친구가 세 마리씩 나와요.',
              'Every Abilities level with a friend in it needs that ability to solve. In Abilities and Rescue, stages 1 to 4 each bring three new friends.'),

  'help_eye': ('막혔을 때', 'When you get stuck'),
  'help_h2': ('막혀도 혼자 끙끙대지 않게 만들었어요', 'Built so you never stay stuck'),
  'help1': ('판마다 첫 힌트는 무료', 'First hint free on every level'),
  'help1_p': ('다음에 둘 수를 판 위에 보여 줘요. 위 맛보기의 힌트 단추와 같아요.', 'It shows your next move on the board, like the Hint button in the level above.'),
  'help2': ('되돌리기와 다시 하기는 늘 무료', 'Undo and restart are always free'),
  'help2_p': ('지금 정한 규칙으로는 몇 번을 눌러도 광고나 돈이 들지 않아요.', 'Under the current plan, use them as often as you like with no ads and no cost.'),
  'help3': ('막히면 막히기 직전으로 한 번에', 'Back to just before you got stuck'),
  'help3_p': ('더 풀 수 없는 상태가 되면 알려 주고, 그 직전으로 한 번에 되돌려요.', 'If the board can no longer be solved, the game tells you and takes you back in one tap.'),
  'help4': ('남은 정리는 알아서', 'The tidy-up is done for you'),
  'help4_p': ('섞인 튜브가 없으면 같은 색끼리 합치는 마무리는 게임이 해요.', 'Once no tube is mixed, the game finishes merging the colors itself.'),
  'help_note': ('퍼즐이 낯설면 능력 없는 클래식부터 시작하면 돼요.', 'New to sort puzzles? Start with Classic, which has no abilities.'),

  'long_eye': ('오래 할 거리', 'Plenty to play'),
  'long_h2': ('한 판은 짧고, 할 판은 많아요', 'Short levels, lots of them'),
  'n1': ('18초', '18 s'), 'n1_s': ('한 판에 걸린 시간(중앙값)', 'Median time per level'), 'n1_m': ('개발하면서 직접 푼 45판 기준', 'Based on 45 levels the developer played'),
  'n2': ('1,440판', '1,440'), 'n2_s': ('메인 판, 전부 무료', 'Main levels, all free'), 'n2_m': ('클래식·능력·구출 × 16스테이지 × 30판', 'Classic, Abilities, Rescue × 16 stages × 30'),
  'n3': ('960판', '960'), 'n3_s': ('퍼즐 모음(중난도·고난도)', 'Puzzle pack levels (medium and expert)'), 'n3_m': ('모음 6개, 모음마다 첫 스테이지 무료', '6 packs, first stage of each free'),
  'n4': ('하루 1판', '1 a day'), 'n4_s': ('오늘의 도전', 'Daily Challenge'), 'n4_m': ('도장 7개마다 친구들 장식', 'A new accessory every 7 stamps'),
  'l_village': ('마을', 'Village'), 'l_village_c': ('별로 친구 집을 짓고 넓히면 그 친구의 옷이 열려요', 'Spend stars to build and grow homes, and unlock outfits'),
  'l_nest': ('둥지 나무', 'Nest tree'), 'l_nest_c': ('구한 병아리는 둥지 나무에 살아요', 'Every chick you rescue lives in the nest tree'),
  'l_daily': ('오늘의 도전', 'Daily Challenge'), 'l_daily_c': ('같은 날엔 모두 같은 문제, 풀면 도장을 받아요', 'Everyone gets the same puzzle each day, and a stamp for solving it'),
  'long_src': ('판 수는 지금 만든 게임 기준이에요. 출시 전에 바뀔 수 있어요.', 'Level counts are for the current build and may change before launch.'),

  'm_eye': ('돈', 'Cost'),
  'm_h2': ('메인 1,440판은 끝까지 무료예요', 'All 1,440 main levels are free'),
  'm_p': ('광고와 앱 안 결제는 아직 붙이지 않았어요. 지금 만들어 둔 규칙은 이래요.', 'Ads and in-app purchases are not switched on yet. Here are the rules already built in.'),
  'm_free': ('무료로 하는 것', 'Free'),
  'm_free_l': (['메인 1,440판 전부', '오늘의 도전', '퍼즐 모음 6개의 첫 스테이지', '판마다 첫 힌트, 되돌리기, 다시 하기'],
               ['All 1,440 main levels', 'The Daily Challenge', 'The first stage of all 6 puzzle packs', 'The first hint on every level, plus undo and restart']),
  'm_ads': ('광고', 'Ads'),
  'm_ads_l': (['처음 쓰는 날과 첫 15판에는 판 사이 광고가 없어요', '그 뒤에도 많아야 3판에 한 번, 3분 간격을 두게 만들었어요', '짧은 광고를 보면 힌트나 별을 더 받을 수 있어요(원할 때만)'],
              ['No ads between levels on your first day or your first 15 levels', 'After that, at most one every 3 levels and never within 3 minutes', 'Watch a short ad for an extra hint or stars, only if you want to']),
  'm_pay': ('결제하면', 'If you pay'),
  'm_pay_l': (['광고 제거', '퍼즐 모음 2스테이지부터(840판)', '지난 날의 오늘의 도전', '힌트 묶음'],
              ['Remove ads', 'Puzzle packs from stage 2 on (840 levels)', 'Past Daily Challenges', 'Hint bundles']),
  'm_pay_tag': ('가격은 출시 때 정해요', 'Prices are set at launch'),
  'm_note': ('돈을 내고 무작위로 뽑는 아이템은 없어요. 출시 전이라 이 규칙도 바뀔 수 있어요.', 'There are no paid random draws. Since the game is not out yet, these rules may still change.'),

  'faq_h2': ('자주 묻는 질문', 'Questions'),
  'faq': ([
    ('언제, 어디서 받을 수 있나요?', '안드로이드(구글 플레이)부터 준비하고 있어요. 지금은 휴대폰에서 테스트하는 중이고, 출시일은 아직 정하지 않았어요.'),
    ('아이폰에서도 되나요?', '준비 중이에요. 아이폰용(iOS 15 이상)으로도 만들고 있지만 실제 아이폰에서 확인하기 전이에요.'),
    ('인터넷 없이 되나요?', '네. 게임은 인터넷 연결 없이 돌아가요.'),
    ('진행 기록은 어디에 저장되나요?', '휴대폰 안에 저장돼요. 계정이나 클라우드 저장은 없어요.'),
    ('내 정보를 모으나요?', '지금 만든 게임은 정보를 모으거나 보내지 않아요. 출시할 때 광고를 붙이면 무엇을 모으는지 개인정보 처리방침에 먼저 적어 이 사이트에 올릴게요.'),
    ('어떤 언어로 할 수 있나요?', '한국어, 영어, 일본어예요.'),
    ('무서운 장면이나 뽑기가 있나요?', '없어요. 싸우거나 무서운 장면이 없고, 돈을 내고 무작위로 뽑는 아이템도 없어요. 연령 등급은 출시할 때 받아요.'),
  ], [
    ('When and where can I get it?', 'Android (Google Play) comes first. The game is being play-tested on phones now, and there is no release date yet.'),
    ('Will it work on iPhone?', 'It is in the works. An iPhone build (iOS 15 or later) exists but has not been checked on a real iPhone yet.'),
    ('Does it work offline?', 'Yes. The game runs without an internet connection.'),
    ('Where is my progress saved?', 'On your phone. There are no accounts and no cloud saves.'),
    ('Does it collect my data?', 'The current game collects and sends nothing. If ads are added at launch, we will publish a privacy policy on this site first, saying exactly what is collected.'),
    ('Which languages?', 'Korean, English and Japanese.'),
    ('Any scary scenes or loot boxes?', 'No. There is no fighting or scary content, and no paid random draws. The age rating will be set at launch.'),
  ]),

  'end_h2': ('지금은 출시 준비 중이에요', 'Getting ready for launch'),
  'end_p': ('안드로이드부터 내놓을 거예요. 나오면 이 페이지에 받는 곳을 바로 붙일게요.', 'Android comes first. When it is out, the download link goes right here.'),
  'steps': ([('게임 내용 만들기', 'done'), ('휴대폰 플레이테스트', 'now'), ('비공개 테스트', ''), ('구글 플레이 출시', ''), ('아이폰', '')],
            [('Build the game', 'done'), ('Play-test on phones', 'now'), ('Closed testing', ''), ('Launch on Google Play', ''), ('iPhone', '')]),
  'step_done': ('끝남', 'done'), 'step_now': ('지금', 'now'),
  'mail_btn': ('메일로 묻기', 'Ask by email'),
  'mail_subject': ('[병아리 구조대] 문의', '[Chick Rescue] Question'),
  'again_btn': ('맛보기 다시 하기', 'Play the level again'),
  'mail_note': ('루멘랩(Lumen Lab)이 만들어요. 메일 ', 'Made by Lumen Lab. Email '),
  'copy': ('복사', 'Copy'), 'copied': ('복사했어요', 'Copied'),
  'lumen_b': ('루멘랩 Lumen Lab', 'Lumen Lab'),
  'lumen_s': ('병아리 구조대를 만든 곳. 다른 앱과 무료 웹 도구도 있어요', 'The studio behind Chick Rescue, with more apps and free web tools'),
  'lumen_url': ('https://lumenlab.page/', 'https://lumenlab.page/en/'),
  'foot_note': ('로고·배경·집 그림은 AI 도구(Higgsfield)로 만들었고, 동물 친구와 효과는 게임 코드로 그렸어요. 화면과 숫자는 개발 중인 게임 기준이라 출시 전에 바뀔 수 있어요.',
                'The logo, backgrounds and houses were made with an AI tool (Higgsfield); the animal friends and effects are drawn by the game’s own code. Screens and numbers reflect the game in development and may change before launch.'),
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

ICONS = {
 'hint': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
 'undo': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
 'back': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 'auto': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>',
}


def L(key, i):
    return S[key][i]


def page(i):
    lang = S['lang'][i]
    pre = '' if i == 0 else '/en'
    url = BASE + ('/' if i == 0 else '/en/')
    other = '/en/' if i == 0 else '/'
    t = lambda k: L(k, i)
    e = lambda k: html.escape(L(k, i), quote=True)
    shot = lambda name, h, c, extra='': (
        f'<figure class="shot{extra}"><img src="/img/shot-{name}_{lang}.webp" width="600" height="1300" loading="lazy" decoding="async" '
        f'alt="{html.escape(t(h) + ": " + t(c), quote=True)}"><figcaption><b>{t(h)}</b>{t(c)}</figcaption></figure>')
    friends = ''.join(
        f'<button type="button" class="friend" data-k="{k}" aria-pressed="{"true" if k == "squirrel" else "false"}">'
        f'<img src="/img/c-{k}.webp" width="52" height="52" alt="" loading="lazy">{FR[k][i][0]}</button>' for k in FRIENDS)
    fr_json = json.dumps({k: FR[k][i] for k in FRIENDS}, ensure_ascii=False)
    helps = ''.join(
        f'<div class="help rv"><span class="help-ic">{ICONS[ic]}</span><div><h3>{t(h)}</h3><p>{t(h + "_p")}</p></div></div>'
        for ic, h in (('hint', 'help1'), ('undo', 'help2'), ('back', 'help3'), ('auto', 'help4')))
    nums = ''.join(
        f'<div class="num rv"><b>{t(n)}</b><span>{t(n + "_s")}</span><small>{t(n + "_m")}</small></div>' for n in ('n1', 'n2', 'n3', 'n4'))
    li = lambda key: ''.join(f'<li>{x}</li>' for x in t(key))
    faq = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t('faq'))
    faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in t('faq')]}, ensure_ascii=False)
    steps = ''.join(
        f'<li class="{"is-now" if s == "now" else ""}"><i aria-hidden="true">{"✓" if s == "done" else n + 1}</i>{name}'
        f'{" <span class=\"sr\">(" + t("step_now") + ")</span>" if s == "now" else ""}</li>'
        for n, (name, s) in enumerate(t('steps')))
    mailto = f'mailto:{MAIL}?subject=' + re.sub(r'[^A-Za-z0-9]', lambda m: ''.join('%%%02X' % b for b in m.group().encode()), t('mail_subject'))
    demo_json = json.dumps(DEMO[lang], ensure_ascii=False)
    game_ld = json.dumps({'@context': 'https://schema.org', '@type': 'VideoGame', 'name': t('name'), 'url': url,
                          'description': t('desc'), 'genre': 'Puzzle', 'gamePlatform': 'Android',
                          'inLanguage': ['ko', 'en', 'ja'], 'image': BASE + ('/og.jpg' if i == 0 else '/og-en.jpg'),
                          'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}, ensure_ascii=False)
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e('title')}</title>
<meta name="description" content="{e('desc')}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="ko" href="{BASE}/">
<link rel="alternate" hreflang="en" href="{BASE}/en/">
<link rel="alternate" hreflang="x-default" href="{BASE}/en/">
<meta name="theme-color" content="#171B2B">
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
<header class="top">
  <div class="wrap">
    <a class="brand" href="{pre}/"><img src="/img/icon-256.webp" width="32" height="32" alt="">{t('name')}</a>
    <a class="lang" href="{other}" hreflang="{S['lang'][1 - i]}" lang="{S['lang'][1 - i]}" aria-label="{e('other_lang_label')}">{t('other_lang')}</a>
  </div>
</header>
<main>
<section class="hero" id="try" aria-labelledby="h1">
  <div class="hero-bg" aria-hidden="true"><img src="/img/bg-forest.webp" alt="" width="1080" height="1920" fetchpriority="low"></div>
  <figure class="hero-side l" aria-hidden="true"><img src="/img/shot-home_{lang}.webp" width="600" height="1300" alt="" loading="lazy"><figcaption>{t('side_l')}</figcaption></figure>
  <figure class="hero-side r" aria-hidden="true"><img src="/img/shot-level_clear_{lang}.webp" width="600" height="1300" alt="" loading="lazy"><figcaption>{t('side_r')}</figcaption></figure>
  <div class="hero-col">
    <img class="hero-logo" src="/img/logo-{lang}.webp" width="640" height="425" alt="{e('name')}">
    <h1 id="h1">{t('h1')}</h1>
    <div class="demo" id="demo">
      <p class="demo-head"><span class="demo-count" aria-live="polite"></span></p>
      <div class="nest" aria-hidden="true"></div>
      <div class="board"><div class="pieces" aria-hidden="true"></div></div>
      <p class="demo-tip" aria-live="polite"></p>
      <div class="demo-ctrl">
        <button type="button" class="btn btn-soft" data-act="undo">{t('undo')}</button>
        <button type="button" class="btn btn-hint" data-act="hint">{t('hint')}</button>
        <button type="button" class="btn btn-soft" data-act="restart">{t('restart')}</button>
      </div>
      <div class="demo-done" role="dialog" aria-labelledby="demo-done-h" aria-live="polite" hidden>
        <h2 id="demo-done-h"></h2><p></p>
        <button type="button" class="btn btn-play" data-act="next"></button>
        <button type="button" class="btn btn-soft" data-act="real"></button>
      </div>
      <canvas class="fx" aria-hidden="true"></canvas>
      <script type="application/json" id="demo-text">{demo_json}</script>
    </div>
    <p class="hero-status">{t('status')}</p>
  </div>
</section>

<section class="sec" id="real" aria-labelledby="real-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('real_eye')}</span><h2 id="real-h">{t('real_h2')}</h2><p>{t('real_p')}</p></div>
    <div class="real">
      <div>
        <div class="phone">
          <video id="play-video" muted loop playsinline preload="none" poster="/img/play-{lang}-poster.webp" width="600" height="1300" aria-label="{e('video_label')}">
            <source src="/img/play-{lang}.mp4" type="video/mp4">
            <source src="/img/play-{lang}.webm" type="video/webm">
          </video>
        </div>
        <p class="phone-cap">{t('video_cap')}</p>
      </div>
      <div class="shots" tabindex="0" aria-label="{e('real_eye')}">
        {shot('rescue_play', 'shot_rescue', 'shot_rescue_c')}
        {shot('ability_use', 'shot_ability', 'shot_ability_c')}
        {shot('classic_play', 'shot_classic', 'shot_classic_c')}
        {shot('level_clear', 'shot_clear', 'shot_clear_c')}
        {shot('stage_map', 'shot_map', 'shot_map_c')}
        {shot('home', 'shot_home', 'shot_home_c')}
      </div>
    </div>
  </div>
</section>

<section class="sec sec-alt" id="friends" aria-labelledby="fr-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('fr_eye')}</span><h2 id="fr-h">{t('fr_h2')}</h2><p>{t('fr_p')}</p></div>
    <div class="abil">
      <div>
        <div class="friends">{friends}</div>
        <div class="friend-say" aria-live="polite"><img src="/img/c-squirrel.webp" width="64" height="64" alt=""><div><h3>{FR['squirrel'][i][0]}</h3><p>{FR['squirrel'][i][1]}</p></div></div>
        <p class="abil-note">{t('fr_note')}</p>
      </div>
      {shot('ability_use', 'shot_ability', 'shot_ability_c', ' abil-shot')}
    </div>
    <script type="application/json" id="friend-text">{fr_json}</script>
  </div>
</section>

<section class="sec" id="help" aria-labelledby="help-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('help_eye')}</span><h2 id="help-h">{t('help_h2')}</h2></div>
    <div class="helps">{helps}</div>
    <p class="money-note">{t('help_note')}</p>
  </div>
</section>

<section class="sec sec-alt" id="long" aria-labelledby="long-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('long_eye')}</span><h2 id="long-h">{t('long_h2')}</h2></div>
    <div class="nums">{nums}</div>
    <div class="shots long" tabindex="0" aria-label="{e('long_eye')}">
      {shot('village_homes', 'l_village', 'l_village_c')}
      {shot('chick_nest', 'l_nest', 'l_nest_c')}
      {shot('daily_calendar', 'l_daily', 'l_daily_c')}
    </div>
    <p class="src">{t('long_src')}</p>
  </div>
</section>

<section class="sec" id="money" aria-labelledby="money-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('m_eye')}</span><h2 id="money-h">{t('m_h2')}</h2><p>{t('m_p')}</p></div>
    <div class="money">
      <div class="mcard free rv"><h3>{t('m_free')}</h3><ul>{li('m_free_l')}</ul></div>
      <div class="mcard rv"><h3>{t('m_ads')}</h3><ul>{li('m_ads_l')}</ul></div>
      <div class="mcard rv"><h3>{t('m_pay')}</h3><ul>{li('m_pay_l')}</ul><span class="tag">{t('m_pay_tag')}</span></div>
    </div>
    <p class="money-note">{t('m_note')}</p>
  </div>
</section>

<section class="sec" id="faq" aria-labelledby="faq-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="faq-h">{t('faq_h2')}</h2></div>
    <div class="faq">{faq}</div>
  </div>
</section>

<section class="end" id="end" aria-labelledby="end-h">
  <div class="end-bg" aria-hidden="true"><img src="/img/bg-night.webp" alt="" width="1080" height="1920" loading="lazy"></div>
  <div class="wrap">
    <h2 id="end-h">{t('end_h2')}</h2>
    <p class="end-lead">{t('end_p')}</p>
    <ol class="end-steps">{steps}</ol>
    <div class="end-acts">
      <a class="btn btn-play" href="{mailto}">{t('mail_btn')}</a>
      <a class="btn btn-line" href="#try">{t('again_btn')}</a>
    </div>
    <p class="mail-note">{t('mail_note')}<span class="nw">{MAIL}</span> <button type="button" class="btn-copy" data-copy="{MAIL}" data-done="{e('copied')}">{t('copy')}</button></p>
    <a class="lumen" href="{t('lumen_url')}">
      <svg viewBox="0 0 96 64" aria-hidden="true">
        <circle class="l-glow" cx="70" cy="30" r="26" fill="url(#lg{i})"/>
        <defs><radialGradient id="lg{i}"><stop offset="0" stop-color="#FFD166" stop-opacity=".55"/><stop offset="1" stop-color="#FFD166" stop-opacity="0"/></radialGradient></defs>
        <path d="M2 50 Q40 40 94 46" stroke="#6E4A2D" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M52 44 Q70 60 88 44 Z" fill="#5C3B23"/><path d="M50 44 h40" stroke="#8A5E3A" stroke-width="5" stroke-linecap="round"/>
        <g class="l-chick"><image href="/img/c-chick.webp" x="57" y="14" width="26" height="26"/></g>
      </svg>
      <div><b>{t('lumen_b')}</b><span>{t('lumen_s')}</span></div><span class="arr" aria-hidden="true">→</span>
    </a>
  </div>
</section>
</main>
<footer class="foot">
  <div class="wrap">
    <span>© 2026 Lumen Lab</span>
    <a href="{other}" hreflang="{S['lang'][1 - i]}" lang="{S['lang'][1 - i]}">{t('other_lang')}</a>
    <a href="mailto:{MAIL}">{MAIL}</a>
    <p>{t('foot_note')}</p>
  </div>
</footer>
<script src="/assets/demo.js?v=__DEMO__" defer></script>
<script src="/assets/site.js?v=__SITE__" defer></script>
</body>
</html>
'''


NOT_FOUND = '''<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>페이지가 없어요 · 병아리 구조대</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#171B2B"><link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
</head>
<body style="background:var(--night);color:var(--night-ink)">
<main class="wrap" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:14px;padding-top:40px;padding-bottom:40px">
<img src="/img/c-chick.webp" width="72" height="72" alt="">
<h1 style="font-size:28px">이 페이지는 둥지에 없어요</h1>
<p style="color:var(--night-muted)">This page doesn’t exist.</p>
<p style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-play" href="/">병아리 구조대 홈</a><a class="btn btn-soft" href="/en/" lang="en">Chick Rescue home</a></p>
</main>
</body>
</html>
'''


def sha(path):
    return hashlib.sha256(open(os.path.join(SITE, path), 'rb').read()).hexdigest()[:8]


def head_font(src):
    """제목에 쓰는 글자만 남긴 게임 글꼴 조각(OFL: 이름을 바꾸고 라이선스를 같이 둔다)."""
    keys = [k for k in S if re.match(r'(h1|real_h2|fr_h2|help\d$|help_h2|long_h2|n\d$|m_h2|m_free$|m_ads$|m_pay$|faq_h2|end_h2|name|fr_eye)', k)]
    chars = set()
    for k in keys:
        for v in S[k]:
            chars |= set(v if isinstance(v, str) else '')
    for k in FRIENDS:
        chars |= set(FR[k][0][0]) | set(FR[k][1][0])
    for d in DEMO.values():
        chars |= set(d['doneTitle'] + d['doneAllTitle'])
    chars |= set('0123456789,.·!?:-–— ()&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz’\'')
    txt = os.path.join(HERE, '.head-chars.txt')
    open(txt, 'w', encoding='utf-8').write(''.join(sorted(chars)))
    out = os.path.join(SITE, 'assets', 'head.woff2')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--text-file={txt}', '--flavor=woff2',
                    f'--output-file={out}', '--layout-features=kern,liga', '--no-hinting', '--desubroutinize',
                    '--name-IDs=0,1,2,3,4,5,6', '--name-languages=*'], check=True)
    from fontTools.ttLib import TTFont
    f = TTFont(out, recalcTimestamp=False)
    for rec in f['name'].names:  # OFL 예약 이름(Pretendard) 빼기
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            rec.string = 'CR Head Bold' if rec.nameID in (4,) else ('CRHead-Bold' if rec.nameID == 6 else ('CR Head' if rec.nameID in (1, 16) else ('Bold' if rec.nameID == 17 else 'CR Head Bold subset')))
    f.flavor = 'woff2'
    f.save(out)
    os.remove(txt)


def main():
    if len(sys.argv) > 1:
        head_font(sys.argv[1])
    v = {'__CSS__': sha('assets/site.css'), '__DEMO__': sha('assets/demo.js'), '__SITE__': sha('assets/site.js'),
         '__HEADFONT__': sha('assets/head.woff2')}
    def fill(s):
        for k, x in v.items():
            s = s.replace(k, x)
        return s
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(fill(page(0)))
    open(os.path.join(SITE, 'en', 'index.html'), 'w', encoding='utf-8').write(fill(page(1)))
    open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8').write(fill(NOT_FOUND))
    # CSS 안의 글꼴 주소 지문
    css = open(os.path.join(SITE, 'assets/site.css'), encoding='utf-8').read()
    css2 = re.sub(r'head\.woff2\?v=[^)"]+', 'head.woff2?v=' + v['__HEADFONT__'], css)
    if css2 != css:
        open(os.path.join(SITE, 'assets/site.css'), 'w', encoding='utf-8').write(css2)
        print('site.css 글꼴 지문을 바꿨어요. 한 번 더 돌려 주세요(CSS 지문이 바뀜).')
    sm = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
''' + ''.join(f'''  <url><loc>{BASE}{p}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="{BASE}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="{BASE}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}/en/"/>
  </url>
''' for p in ('/', '/en/')) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    open(os.path.join(SITE, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n')
    print('ok', v)


if __name__ == '__main__':
    main()
