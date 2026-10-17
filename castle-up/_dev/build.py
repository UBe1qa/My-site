"""캐슬업! 소개 사이트 만들기: 한국어 / , 영어 /en/ , 404, sitemap, 제목 글꼴 조각.
  python3 _dev/build.py                  사이트
  python3 _dev/build.py --font 경로.ttf  제목 글꼴 조각도 다시(Black Han Sans, OFL)
  python3 _dev/build.py --var 1|2|3      첫 화면 시안을 _dev/var/N.html(한국어)로
글은 아래 S 사전 한 곳에서 고친다(한국어·영어 같이). 페이지 틀은 page() 하나.
숫자·사실의 출처: 게임 저장소 UBe1qa/mobile-games(landing-kit 브랜치 landing-kit/castle-up, main ad6960d의 games/castle).
가격·확률 숫자·출시일·아이폰은 정해지지 않아 쓰지 않는다. 루멘랩 사업체 문서 '캐슬업!' 칸에 같은 내용이 있다.
"""
import hashlib, html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
BASE = 'https://castle-up.lumenlab.page'
MAIL = 'contact@lumenlab.page'
HERO = 1  # 고른 첫 화면 시안

# 키: (한국어, 영어)
S = {
  'lang': ('ko', 'en'),
  'title': ('캐슬업! — 영웅을 층층이 세운 성으로 보스를 무너뜨리는 디펜스 게임', 'Castle Up! — stack heroes in your castle and break the boss'),
  'desc': ('성을 층층이 쌓아 영웅을 세우는 방치형 디펜스. 15웨이브마다 나오는 보스를 약점 순서대로 맞혀 그로기로 만들어요. 안드로이드에서 플레이테스트 중.',
           'An idle castle defense game: raise your castle floor by floor and put a hero on each. Every 15 waves a boss blocks the road; hit its weakness order to stagger it. Play-testing on Android.'),
  'skip': ('맛보기로 건너뛰기', 'Skip to the playable taste'),
  'name': ('캐슬업!', 'Castle Up!'),
  'other_lang': ('English', '한국어'),
  'other_lang_label': ('Read this page in English', '한국어로 보기'),
  'h1': ('영웅을 층층이 세운 성으로 보스를 무너뜨리는 디펜스 게임', 'Stack heroes, break the boss: an idle castle defense'),
  'sub': ('15웨이브마다 보스가 길을 막아요. 보스의 약점 순서대로 스킬을 맞혀 그로기로 만들어요. 영웅을 모집해 성을 구름까지 쌓아요.',
          'A boss blocks the road every 15 waves. Hit it with skills in its weakness order to stagger it. Recruit heroes and raise your castle to the clouds.'),
  'demo_label': ('<b>맛보기</b> · 박쥐 여왕을 그로기로', '<b>Try it</b> · stagger the Bat Queen'),
  'chips': (['방치형 디펜스', '15웨이브마다 보스', '안드로이드 플레이테스트 중'], ['Idle defense', 'A boss every 15 waves', 'Play-testing on Android']),
  'real_link': ('실제 게임 화면 보기', 'See the real game'),
  'status_note': ('위 판은 웹으로 옮긴 맛보기예요. 스킬 대기 시간과 보스 체력을 줄였어요.', 'The fight above is a web taste, with shorter skill cooldowns and less boss HP.'),
  'sound': ('소리', 'Sound'),
  'boss_name': ('박쥐 여왕', 'Bat Queen'),
  'status': ('<b>안드로이드에서 플레이테스트 중</b> · 웹으로 옮긴 맛보기예요(스킬 대기 시간과 보스 체력을 줄였어요). <a href="#real">실제 게임 화면 보기</a>',
             '<b>Play-testing on Android</b> · A web taste of one boss fight (shorter cooldowns, less boss HP). <a href="#real">See the real game</a>'),
  'try_btn': ('보스 약점 직접 맞혀 보기', 'Try breaking a boss yourself'),
  'video_btn': ('실제 보스전 영상 보기', 'Watch a real boss fight'),
  'try_eye': ('맛보기', 'Try it'),
  'try_h2': ('보스 머리 위 순서대로 스킬을 맞혀 보세요', 'Hit the boss in the order above its head'),
  'grow_hero_meta': ('{n}등급 · {f}층', 'Grade {n} · {f} floors'),

  'real_eye': ('실제 게임 화면', 'The real game'),
  'real_h2': ('손대지 않고 둔 실제 보스전 15초', 'A real boss fight, 15\u00a0seconds, hands off'),
  'real_p': ('개발 중인 게임에서 45웨이브 보스 박쥐 여왕과 자동 스킬로 싸운 장면이에요. 연계 ‘불화살!’이 터지고, 필살기 예고 중에 약점 순서를 끝내 ‘카운터!’ 그로기가 되면 땅으로 떨어졌다가 다시 날아올라요. 옆 화면도 게임에서 그대로 찍었어요.',
             'Wave 45 against the Bat Queen in the game in development, with skills left on Auto. Watch the Fire Arrows combo, then a Counter stagger mid-wind-up that drops her to the ground before she flies again. The screens beside it are straight from the game too.'),
  'video_cap': ('자동 스킬 그대로 15초 · 소리 없음', '15 seconds on Auto · no sound'),
  'video_label': ('박쥐 여왕 보스전을 자동 스킬로 싸우는 실제 게임 영상', 'Video of the real game fighting the Bat Queen on Auto skills'),
  'shot_wave': ('웨이브 전투', 'Wave battle'), 'shot_wave_c': ('층마다 선 영웅이 쏘고, 오른쪽에서 적이 몰려와요', 'Heroes on every floor shoot as enemies pour in from the right'),
  'shot_weak': ('약점 순서', 'Weakness order'), 'shot_weak_c': ('화염 드래곤 머리 위 순서, 다음 스킬 버튼엔 ‘다음!’', 'The order above the Flame Dragon, and ‘Next!’ on the skill to press'),
  'shot_groggy': ('그로기 · 추락', 'Stagger · fall'), 'shot_groggy_c': ('순서를 끝내면 그로기, 나는 보스는 땅으로 떨어져요', 'Finish the order to stagger; flying bosses crash down'),
  'shot_combo': ('연계', 'Combo'), 'shot_combo_c': ('얼음 스킬 다음 번개 스킬이면 ‘감전!’', 'Ice then Lightning: Shock!'),
  'shot_result': ('웨이브 끝', 'Wave cleared'), 'shot_result_c': ('영웅별 피해를 보고 다시 하기나 다음 웨이브', 'Damage per hero, then Replay or Next wave'),
  'shot_title': ('첫 화면', 'Title'), 'shot_title_c': ('캠페인과 저장 슬롯 10개', 'Campaign and 10 save slots'),

  'boss_eye': ('보스전', 'Boss fights'),
  'boss_h2': ('15웨이브마다 보스, 순서를 맞히면 무너져요', 'A boss every 15 waves. Get the order right and it crumbles'),
  'boss_p': ('보스는 머리 위에 약점 속성 순서를 띄워요. 스킬은 자동으로 두어도 쓰지만, 순서를 노리고 직접 누르면 보스전이 달라져요.',
             'Every boss shows a weakness order above its head. Skills fire on their own if you like, but aiming for the order yourself changes the fight.'),
  'r1': ('약점 순서 → 그로기', 'Weakness order → stagger'),
  'r1_p': ('속성 2~4개를 순서대로 맞히면 보스가 4초 동안 기절하고 받는 피해가 1.8배가 돼요. 틀린 속성은 벌칙 없이 넘어가고, 누를 버튼에는 ‘다음!’이 떠요.',
           'Hit 2 to 4 elements in order and the boss is stunned for 4 seconds, taking 1.8× damage. A wrong element just passes with no penalty, and the button to press says ‘Next!’.'),
  'r2': ('패링 · 카운터', 'Parry · Counter'),
  'r2_p': ('필살기 예고 고리는 마지막 0.5초에 금빛이 돼요. 그때 맞히면 패링(필살기 취소, 5초 그로기), 예고 중에 약점 순서를 끝내면 카운터(더 길고 큰 한 방)예요.',
           'A wind-up ring turns gold for its last half second. Hit it then to parry (attack cancelled, 5-second stagger), or finish the order during the wind-up for a Counter: a longer, bigger stagger.'),
  'r3': ('카운터', 'Counter'),
  'r3_p': ('필살기 예고 중에 약점 순서를 끝내면 필살기를 끊고 더 길고 큰 한 방이 들어가요.', 'Finish the order during a wind-up to cut the attack short and land a longer, bigger stagger.'),
  'r4': ('나는 보스 추락', 'Flyers fall'),
  'r4_p': ('나는 보스는 그로기 동안 땅으로 떨어져서 땅에만 닿던 스킬도 맞아요. 그로기가 끝나면 다시 날아올라요.', 'Flying bosses crash down while staggered, so ground-only skills reach them. Then they take off again.'),
  'combo_h': ('속성 연계 14가지', '14 element combos'),
  'combo_p': ('앞 스킬과 뒤 스킬의 속성이 짝이 맞으면, 5초 안에 이어 쓴 뒤 스킬이 1.5~2배로 세지고 덤 효과가 붙어요.',
              'When two skills’ elements pair up within 5 seconds, the second one hits 1.5 to 2× harder with a bonus effect.'),
  'combo_more': ('나머지 10가지 보기', 'See the other 10'),
  'bosses_h': ('보스 20마리, 지역 10곳', '20 bosses, 10 regions'),
  'boss_note': ('지역마다 30웨이브, 15·30웨이브째에 보스가 나오고 바로 앞에는 중간 보스가 있어요. 처음 잡은 보스는 그 힘을 이은 보스 영웅으로 성에 합류해요.',
                'Each region has 30 waves, with bosses on waves 15 and 30 and a mid-boss right before each. Beat a boss for the first time and a boss hero with its power joins your castle.'),
  'weak_label': ('약점', 'Weak to'),

  'castle_eye': ('성 쌓기', 'Raise your castle'),
  'castle_h2': ('층마다 영웅을 세우고, 성을 구름까지', 'A hero on every floor, all the way to the clouds'),
  'castle_p': ('승급할 때마다 성의 모습이 바뀌고 층이 하나씩 늘어요. 아래에서 20등급을 넘겨 보세요.', 'Every promotion changes your castle and adds a floor. Flip through all 20 grades below.'),
  'grade_lbl': ('성 등급', 'Castle grade'),
  'prev': ('이전 등급', 'Previous grade'), 'next': ('다음 등급', 'Next grade'),
  'g1': ('20등급, 3층에서 22층까지', '20 grades, from 3 floors to 22'), 'g1_p': ('승급하면 층이 하나 늘고, 모든 피해와 성 체력이 1.25배가 돼요.', 'Each promotion adds a floor and multiplies all damage and castle HP by 1.25.'),
  'g2': ('영웅 50명', '50 heroes'), 'g2_p': ('모집으로 만나는 30명과, 보스를 처음 잡으면 합류하는 보스 영웅 20명이에요.', '30 you recruit, plus 20 boss heroes who join when you first beat their boss.'),
  'g3': ('누구를 어느 층에', 'Who stands where'), 'g3_p': ('층보다 영웅이 많아서 세울 영웅을 직접 골라요. 스킬이 있는 영웅은 모두 스킬 버튼이 돼요.', 'There are more heroes than floors, so you pick who stands. Every hero with a skill becomes a skill button.'),
  'g4': ('별 20성', 'Up to 20 stars'), 'g4_p': ('같은 영웅이 또 오면 ★이 올라 더 세져요. 금·빨강·보라·무지개 별까지.', 'Get the same hero again to raise its ★: gold, then red, purple and rainbow stars.'),
  'heroes_note': ('테두리: 주황 전설 · 보라 에픽 · 빨강 보스 영웅', 'Border: orange Legendary · purple Epic · red boss hero'),
  'shot_status': ('성 현황', 'Castle status'), 'shot_status_c': ('등급 길과 층마다 선 영웅', 'The grade path and the hero on each floor'),
  'shot_hero': ('영웅 정보', 'Hero info'), 'shot_hero_c': ('실제 전투를 작게 돌려 스킬을 보여 줘요', 'A tiny live battle shows the skill'),
  'shot_recruit': ('모집', 'Recruit'), 'shot_recruit_c': ('카드가 뒤집히며 희귀도 색으로 빛나요', 'Cards flip and glow in their rarity color'),

  'idle_eye': ('손을 놓아도', 'Hands off'),
  'idle_h2': ('켜 두면 성이 알아서 싸워요', 'Leave it on and the castle fights'),
  'i1': ('자동 스킬', 'Auto skills'), 'i1_p': ('수동, 자동, 보스만 수동 중에 골라요. 처음엔 자동이에요.', 'Choose Manual, Auto, or Boss by hand. It starts on Auto.'),
  'i2': ('자동 반복 무료', 'Free auto replay'), 'i2_p': ('깬 웨이브를 저절로 다시 하며 골드를 모아요. 다음 웨이브로 가는 것만 직접 눌러요.', 'Cleared waves replay by themselves to gather gold. Only moving on to the next wave is your call.'),
  'i3': ('져도 잃지 않아요', 'Losing costs nothing'), 'i3_p': ('진 것에 벌칙은 없어요. 번 골드는 그대로 남아요.', 'There is no penalty for losing. The gold you earned stays.'),
  'i4': ('꺼 둬도 가는 원정', 'Expeditions keep going'), 'i4_p': ('영웅을 셋까지 보내면 1·4·8시간 뒤 보상을 가져와요. 게임을 꺼 둬도 시간이 가고, 영웅은 성을 떠나지 않아요.', 'Send up to three heroes for 1, 4 or 8 hours. Time passes even with the game closed, and the heroes never leave the castle.'),
  'n1': ('300', '300'), 'n1_s': ('한 바퀴 웨이브', 'Waves per loop'), 'n1_m': ('지역 10곳 × 30웨이브, 그 뒤로도 이어져요', '10 regions × 30, and the waves keep coming'),
  'n2': ('20', '20'), 'n2_s': ('보스', 'Bosses'), 'n2_m': ('중간 보스 10마리는 따로', 'Plus 10 mid-bosses'),
  'n3': ('50', '50'), 'n3_s': ('영웅', 'Heroes'), 'n3_m': ('모집 30 + 보스 영웅 20', '30 recruits + 20 boss heroes'),
  'n4': ('20', '20'), 'n4_s': ('성 등급', 'Castle grades'), 'n4_m': ('돌 성에서 우주의 성까지', 'Stone Keep to Cosmic Castle'),
  'more_h': ('할 거리', 'Plenty to do'),
  'm1': ('보스 도전관', 'Boss Hall'), 'm1_p': ('잡은 보스와 1~15단계로 다시 붙어요. 방패막을 둘러서 그로기와 패링이 열쇠예요.', 'Rematch bosses you have beaten across 15 levels. They wear a barrier, so staggers and parries are the key.'),
  'm2': ('무한의 탑', 'Endless Tower'), 'm2_p': ('등반 한 번이 한 판이에요. 3층마다 축복 3장 중 1장을 골라 강해지고, 층 조건은 매주 바뀌어요.', 'One climb is one run. Every 3 floors you pick 1 of 3 blessings, and floor rules change every week.'),
  'm3': ('원정', 'Expedition'), 'm3_p': ('영웅을 셋까지 보내 두면 시간이 지난 뒤 보상을 가져와요.', 'Send up to three heroes and collect their rewards later.'),
  'idle_src': ('숫자는 지금 만든 게임 기준이에요. 출시 전에 바뀔 수 있어요.', 'Numbers are for the current build and may change before launch.'),

  'm_eye': ('돈', 'Cost'),
  'm_h2': ('광고와 결제는 아직 붙이지 않았어요', 'No ads or payments yet'),
  'm_p': ('출시 때 붙이려고 설계해 둔 규칙이에요. 지금 게임 안의 광고·결제는 돈이 나가지 않는 테스트 화면이에요.', 'This is how it is designed for launch. In the current build, ads and purchases are test screens that cost nothing.'),
  'm_free': ('무료로 하는 것', 'Free'),
  'm_free_l': (['2배속', '자동 스킬과 자동 반복', '진 뒤 다시 하기(번 골드는 남아요)'], ['2× speed', 'Auto skills and auto replay', 'Trying again after a loss (your gold stays)']),
  'm_ads': ('광고', 'Ads'),
  'm_ads_l': (['보고 싶을 때만 보는 보상형으로 설계했어요', '부활, 원정 보상 2배, 3배속 30분'], ['Designed as rewarded ads you choose to watch', 'Revive, double expedition rewards, 3× speed for 30 minutes']),
  'm_pay': ('결제하면', 'If you pay'),
  'm_pay_l': (['3배속 계속 쓰기', '광고 없이 보상 받기', '보석'], ['Keep 3× speed', 'Rewards without ads', 'Gems']),
  'm_pay_tag': ('가격은 출시 때 정해요', 'Prices are set at launch'),
  'm_note': ('영웅 모집은 확률로 뽑는 방식이에요. 확률은 게임 안에서 보여 주고, 값은 아직 맞추는 중이에요. 출시 전이라 이 규칙도 바뀔 수 있어요.',
             'Recruiting heroes is a random draw. The odds are shown in the game and are still being tuned. Since the game is not out yet, these rules may change.'),

  'faq_h2': ('자주 묻는 질문', 'Questions'),
  'faq': ([
    ('언제, 어디서 받을 수 있나요?', '안드로이드(구글 플레이) 출시를 준비하고 있어요. 지금은 휴대폰에서 테스트하는 중이고, 출시일은 아직 정하지 않았어요.'),
    ('아이폰에서도 되나요?', '아직 정하지 않았어요. 지금 준비하는 건 안드로이드예요.'),
    ('돈을 써야 하나요?', '받는 건 무료로 설계했어요. 2배속, 자동 스킬, 자동 반복은 무료예요. 광고와 결제는 아직 붙이지 않았고, 붙일 때의 규칙은 위 ‘돈’ 칸에 있어요.'),
    ('계속 붙잡고 있어야 하나요?', '아니요. 스킬은 자동으로 쓰게 둘 수 있고, 깬 웨이브는 자동 반복으로 다시 돌릴 수 있어요. 원정은 게임을 꺼 둬도 시간이 가요. 다음 웨이브로 넘어가는 것만 직접 눌러요.'),
    ('진행 기록은 어디에 저장되나요?', '휴대폰 안 저장 슬롯 10개에 저장돼요. 지금은 계정이나 클라우드 저장이 없어요.'),
    ('내 정보를 모으나요?', '지금 만든 게임은 정보를 밖으로 보내지 않아요. 출시할 때 광고나 결제를 붙이면 무엇을 모으는지 개인정보 처리방침에 먼저 적어 이 사이트에 올릴게요.'),
    ('어떤 언어로 할 수 있나요?', '한국어, 영어, 일본어예요.'),
    ('무서운 장면이 있나요?', '굵은 선 카툰 그림의 판타지 전투예요. 해골 주술사나 마왕 같은 판타지 적이 나와요. 연령 등급은 출시할 때 받아요.'),
  ], [
    ('When and where can I get it?', 'A Google Play (Android) launch is in the works. The game is being play-tested on phones now, and there is no release date yet.'),
    ('Will it be on iPhone?', 'Not decided yet. Android is what is being prepared now.'),
    ('Do I have to spend money?', 'It is designed to be free to download. 2× speed, auto skills and auto replay are free. Ads and payments are not in yet; the planned rules are in the Cost section above.'),
    ('Do I have to keep playing by hand?', 'No. Skills can fire on their own, and cleared waves can replay automatically. Expeditions keep going while the game is closed. Only moving to the next wave needs a tap.'),
    ('Where is my progress saved?', 'In 10 save slots on your phone. There are no accounts or cloud saves for now.'),
    ('Does it collect my data?', 'The current game sends nothing anywhere. If ads or payments are added at launch, we will publish a privacy policy on this site first, saying exactly what is collected.'),
    ('Which languages?', 'Korean, English and Japanese.'),
    ('Is it scary?', 'It is fantasy combat in a bold-outline cartoon style, with fantasy foes like a Bone Shaman and a Demon Lord. The age rating will be set at launch.'),
  ]),

  'end_h2': ('지금은 휴대폰에서 플레이테스트 중이에요', 'Play-testing on phones right now'),
  'end_p': ('구글 플레이 출시를 준비하고 있어요. 출시일은 아직 정하지 않았고, 나오면 이 페이지에 받는 곳을 붙일게요.', 'A Google Play release is being prepared. There is no date yet; when it is out, the download link goes right here.'),
  'steps': ([('지역 10·보스 20·영웅 50 만들기', 'done'), ('휴대폰 플레이테스트', 'now'), ('광고·결제 붙이기', ''), ('비공개 테스트', ''), ('구글 플레이 출시 준비', '')],
            [('Build 10 regions, 20 bosses, 50 heroes', 'done'), ('Play-test on phones', 'now'), ('Add ads and payments', ''), ('Closed testing', ''), ('Prepare the Google Play release', '')]),
  'step_now': ('지금', 'now'),
  'mail_btn': ('메일로 묻기', 'Ask by email'),
  'mail_subject': ('[캐슬업!] 문의', '[Castle Up!] Question'),
  'again_btn': ('맛보기 다시 하기', 'Try the boss fight again'),
  'mail_note': ('루멘랩(Lumen Lab)이 만들어요. 메일 ', 'Made by Lumen Lab. Email '),
  'copy': ('복사', 'Copy'), 'copied': ('복사했어요', 'Copied'),
  'lumen_b': ('루멘랩 Lumen Lab', 'Lumen Lab'),
  'lumen_s': ('캐슬업!을 만든 곳. 다른 게임과 앱, 무료 웹 도구도 있어요', 'The studio behind Castle Up!, with more games, apps and free web tools'),
  'lumen_url': ('https://lumenlab.page/', 'https://lumenlab.page/en/'),
  'foot_note': ('로고·아이콘·영웅·보스·성·배경 그림은 AI 도구(Higgsfield)로 만들었고, 게임 속 캐릭터 움직임은 AI 영상 도구(Kling)로 만든 장면에서 뽑았어요. 효과·화면·효과음은 게임 코드로 만들었어요. 화면과 숫자는 개발 중인 게임 기준이라 출시 전에 바뀔 수 있어요.',
                'The logo, icon, heroes, bosses, castles and backgrounds were made with an AI tool (Higgsfield), and character motion comes from AI video (Kling). Effects, screens and sounds are made by the game’s own code. Screens and numbers reflect the game in development and may change before launch.'),
}

EL = {'phys': ('물리', 'Physical'), 'fire': ('불', 'Fire'), 'ice': ('얼음', 'Ice'), 'bolt': ('번개', 'Lightning'), 'holy': ('빛', 'Light'), 'dark': ('어둠', 'Dark')}
# 맛보기 스킬 넷: (속성, 스킬 이름, 영웅) — 게임 strings.csv SKILL_*·ROOM_*
SKILLS = [('phys', ('화살비', 'Arrow Rain'), ('레인저', 'Ranger')), ('fire', ('메테오', 'Meteor'), ('불꽃 마법사', 'Flame Mage')),
          ('bolt', ('낙뢰', 'Thunder'), ('번개 수도사', 'Storm Monk')), ('ice', ('눈보라', 'Blizzard'), ('얼음 마녀', 'Frost Witch'))]
# 연계 14 (게임 balance.gd COMBOS 순서, 이름은 COMBO_*)
COMBOS = [('steam', 'ice', 'fire', '증기 폭발', 'Steam Blast'), ('shock', 'ice', 'bolt', '감전', 'Shock'), ('shatter', 'ice', 'phys', '산산조각', 'Shatter'),
          ('overload', 'fire', 'bolt', '과부하', 'Overload'), ('flame_arrows', 'phys', 'fire', '불화살', 'Fire Arrows'), ('lightning_rod', 'phys', 'bolt', '피뢰침', 'Lightning Rod'),
          ('judgement', 'bolt', 'holy', '심판', 'Judgement'), ('eclipse', 'holy', 'dark', '일식', 'Eclipse'), ('hellfire', 'dark', 'fire', '지옥불', 'Hellfire'),
          ('purify', 'dark', 'holy', '정화', 'Purify'), ('quench', 'fire', 'ice', '급랭', 'Quench'), ('black_lightning', 'bolt', 'dark', '검은 번개', 'Black Lightning'),
          ('shadow_strike', 'dark', 'phys', '그림자 일격', 'Shadow Strike'), ('blessed_blade', 'holy', 'phys', '축복의 칼날', 'Blessed Blade')]
# 보스 6 (그림이 있는 보스): 파일, 이름, 지역, 웨이브, 약점 — 게임 content-plan·strings.csv
BOSSES = [('warlord', ('돌격 대장', 'Charging Warlord'), ('푸른 초원', 'Green Meadow'), 15, 'phys', 'meadow'),
          ('bat-queen', ('박쥐 여왕', 'Bat Queen'), ('단풍 숲', 'Autumn Woods'), 45, 'fire', 'autumn'),
          ('golem', ('바위 골렘', 'Stone Golem'), ('붉은 협곡', 'Red Canyon'), 75, 'bolt', 'canyon'),
          ('dragon', ('화염 드래곤', 'Flame Dragon'), ('불의 산', 'Fire Mountain'), 135, 'ice', 'volcano'),
          ('kraken', ('크라켄', 'Kraken'), ('폭풍 해안', 'Storm Coast'), 240, 'bolt', 'coast'),
          ('demon-lord', ('마왕', 'Demon Lord'), ('마왕성', 'Demon Castle'), 300, 'holy', 'demon-castle')]
# 영웅 8 (그림이 있는 영웅): 파일, 이름, 속성, 등급(r: 0 일반 … 4 전설, b 보스 영웅)
HEROES = [('archer', ('궁수', 'Archer'), 'phys', '0'), ('spear', ('창병', 'Spearman'), 'phys', '0'), ('frost-witch', ('얼음 마녀', 'Frost Witch'), 'ice', '2'),
          ('angel', ('천사', 'Angel'), 'holy', '3'), ('sword-king', ('성검의 왕', 'Holy Sword King'), 'holy', '4'),
          ('bat-tower', ('박쥐 공주', 'Bat Princess'), 'dark', 'b'), ('golem-forge', ('꼬마 골렘', 'Little Golem'), 'phys', 'b'), ('little-demon', ('꼬마 마왕', 'Little Demon Lord'), 'fire', 'b')]
RARITY = {'0': ('일반', 'Common'), '2': ('희귀', 'Rare'), '3': ('에픽', 'Epic'), '4': ('전설', 'Legendary'), 'b': ('보스 영웅', 'Boss hero')}
# 성 등급 20 (GRADE_1~20), 층 = 등급 + 2
GRADES = [('돌 성', 'Stone Keep'), ('망루 성', 'Watch Castle'), ('요새', 'Fortress'), ('성채', 'Citadel'), ('황금 왕성', 'Golden Palace'),
          ('천공성', 'Sky Castle'), ('별의 성', 'Star Castle'), ('수정 성', 'Crystal Castle'), ('은빛 성채', 'Silver Citadel'), ('용의 성', 'Dragon Castle'),
          ('바람의 성', 'Castle of Winds'), ('달빛 궁전', 'Moonlight Palace'), ('태양 궁전', 'Sun Palace'), ('하늘 요새', 'Sky Fortress'), ('무지개 성', 'Rainbow Castle'),
          ('천사의 성', 'Castle of Angels'), ('별바다 성', 'Starsea Castle'), ('영원의 성', 'Eternal Castle'), ('신들의 성', 'Castle of Gods'), ('우주의 성', 'Cosmic Castle')]

DEMO = {
 'ko': {'tip': "평소엔 성이 알아서 싸워요. 보스는 머리 위 순서대로 스킬을 맞혀요. ‘다음!’이 뜬 버튼을 누르세요.",
        'step': '좋아요! 다음은 {el} 스킬이에요.',
        'wrong': '순서와 다른 속성은 피해만 들어가요. 벌칙은 없어요. 지금은 {el} 차례예요.',
        'reset': '8초 안에 다음 칸을 못 맞혀서 순서가 처음으로 돌아갔어요.',
        'groggyTip': '그로기! 4초 동안 기절하고 받는 피해가 1.8배예요. 나는 보스는 땅으로 떨어져요.',
        'inGroggy': '그로기 동안은 어떤 스킬이든 피해가 1.8배예요.',
        'rise': '다시 날아올랐어요. 새 약점 순서가 떴어요.',
        'groggy': '그로기!', 'weak': '약점 노출!', 'fall': '추락!',
        'chainLabel': '약점 순서: {order}.', 'chainNext': '다음: {el}.', 'comboOf': '{a} → {b} 연계',
        'doneTitle': '박쥐 여왕을 잡았어요!', 'done': '그로기 {g}번, 연계 {c}번. 실제 게임에는 이런 보스가 20마리 있어요.'},
 'en': {'tip': "Your castle fights on its own. For bosses, hit the order above its head: press the button marked ‘Next!’",
        'step': 'Nice! Next is {el}.',
        'wrong': 'Out-of-order elements just deal damage, no penalty. {el} is next.',
        'reset': 'The next step wasn’t hit within 8 seconds, so the order started over.',
        'groggyTip': 'Staggered! Stunned for 4 seconds, taking 1.8× damage. Flying bosses crash down.',
        'inGroggy': 'While staggered, any skill hits 1.8×.',
        'rise': 'She’s flying again, with a new weakness order.',
        'groggy': 'Staggered!', 'weak': 'Weak point!', 'fall': 'Fallen!',
        'chainLabel': 'Weakness order: {order}.', 'chainNext': 'Next: {el}.', 'comboOf': '{a} → {b} combo',
        'doneTitle': 'Bat Queen down!', 'done': '{g} staggers, {c} combos. The real game has 20 bosses like this.'},
}
for i, lg in enumerate(('ko', 'en')):
    DEMO[lg]['el'] = {k: v[i] for k, v in EL.items()}
    DEMO[lg]['combo'] = {c[0]: (c[3] if i == 0 else c[4]) + '!' for c in COMBOS}
DEMO['ko']['again'], DEMO['en']['again'] = '다시 하기', 'Play again'
DEMO['ko']['killed'], DEMO['en']['killed'] = '박쥐 여왕을 잡았어요!', 'You beat the Bat Queen!'
DEMO['ko']['now'], DEMO['en']['now'] = '지금!', 'NOW!'
DEMO['ko']['real'], DEMO['en']['real'] = '실제 게임 화면 보기', 'See the real game'

# 속성 그림(게임 icons.gd ELEMENT_SHAPES: 칼·불꽃·눈송이·번개·해·달)과 칸 그림
SPRITE = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-phys" viewBox="0 0 24 24"><path d="M19 3h2v2l-9.5 9.5-2-2z" fill="currentColor"/><path d="m6.5 13.5 4 4M8 16l-4 4M5 18.5 3.5 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></symbol>
<symbol id="i-fire" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.2 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.2 2.6-5.3.1 1.6.9 2.8 2 3.3-.6-3.4.2-6.3.9-9z" fill="currentColor"/></symbol>
<symbol id="i-ice" viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor"/></symbol>
<symbol id="i-holy" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
<symbol id="i-dark" viewBox="0 0 24 24"><path d="M15.5 3.2A9 9 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z" fill="currentColor"/></symbol>
</svg>'''

ICONS = {
 'auto': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
 'repeat': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
 'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
 'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 'order': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M7.5 12h2M14.5 12h2"/></svg>',
 'parry': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 7.4 5" stroke-width="3.4"/></svg>',
 'counter': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20"/></svg>',
 'fall': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13M6 11l6 6 6-6M4 21h16"/></svg>',
}


def L(key, i):
    return S[key][i]


def el_icon(el):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-{el}"/></svg>'


def page(i, hero=HERO):
    lang = S['lang'][i]
    pre = '' if i == 0 else '/en'
    url = BASE + ('/' if i == 0 else '/en/')
    other = '/en/' if i == 0 else '/'
    t = lambda k: L(k, i)
    e = lambda k: html.escape(L(k, i), quote=True)
    shot = lambda name, h, c: (
        f'<figure class="shot"><img src="/img/shot-{name}_{lang}.webp" width="600" height="1067" loading="lazy" decoding="async" '
        f'alt="{html.escape(t(h) + ": " + t(c), quote=True)}"><figcaption><b>{t(h)}</b>{t(c)}</figcaption></figure>')
    logo = (f'<img class="hero-logo" src="/img/logo-ko.webp" width="720" height="530" alt="{e("name")}" fetchpriority="high">' if i == 0
            else f'<span class="logo-text" role="img" aria-label="{e("name")}">{t("name")}</span>')
    skills = ''.join(
        f'<button type="button" class="sk" data-el="{el}" style="--c:var(--{el})"><span class="sk-next" aria-hidden="true">{"다음!" if i == 0 else "Next!"}</span><span class="sk-now" aria-hidden="true">{DEMO[lang]["now"]}</span>'
        f'<span class="ic">{el_icon(el)}</span>{sk[i]}<small>{EL[el][i]}<span class="sr"> · {who[i]}</span></small></button>' for el, sk, who in SKILLS)
    # 게임 성처럼 코드로 그린 탑(1등급 = 3층): 층마다 영웅 한 명, 바닥 띠는 희귀도 색(balance.gd RARITIES)
    floors = ''.join(f'<span class="tw-fl" style="--rc:{rc}"><img src="/img/h-{f}.webp" alt="" width="360" height="400"></span>'
                     for f, rc in (('frost-witch', '#5FB4FF'), ('angel', '#C27BFF'), ('archer', '#C9CED8')))
    demo = f'''<div class="demo" id="demo">
      <p class="demo-head"><span>{t('demo_label')}</span><button type="button" class="btn btn-soft demo-sound" data-act="sound" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="off" d="m16 9 6 6m0-6-6 6"/></svg>{t('sound')}</button></p>
      <div class="stage">
        <img class="st-bg" src="/img/bg-autumn.webp" width="1280" height="1600" alt="" fetchpriority="low">
        <div class="tw" aria-hidden="true"><i class="tw-roof"></i>{floors}<i class="tw-base"></i></div>
        <div class="st-name"><b>{t('boss_name')}</b><span class="hp"><i></i></span></div>
        <div class="boss"><div class="chain-wrap"><span class="chain-lbl" aria-hidden="true">{t('weak_label')}</span><div class="chain" role="img"></div></div><img src="/img/b-bat-queen.webp" width="360" height="345" alt="{e('boss_name')}"></div>
        <canvas class="fx" aria-hidden="true"></canvas>
        <div class="st-flash" aria-hidden="true"></div>
      </div>
      <p class="demo-tip" aria-live="polite"></p>
      <div class="skills">{skills}</div>
      <div class="demo-done" role="dialog" aria-labelledby="demo-done-h" aria-live="polite" hidden>
        <h2 id="demo-done-h"></h2><p></p>
        <button type="button" class="btn btn-main" data-act="real">{DEMO[lang]['real']}</button>
        <button type="button" class="btn btn-soft" data-act="again">{DEMO[lang]['again']}</button>
      </div>
      <script type="application/json" id="demo-text">{json.dumps(DEMO[lang], ensure_ascii=False)}</script>
    </div>'''
    video = f'''<div class="phone">
          <video id="play-video" muted loop playsinline preload="none" poster="/img/boss-{lang}-poster.webp" width="600" height="1066" aria-label="{e('video_label')}">
            <source src="/img/boss-{lang}.mp4" type="video/mp4">
            <source src="/img/boss-{lang}.webm" type="video/webm">
          </video>
        </div>
        <p class="phone-cap">{t('video_cap')}</p>'''
    grade_opts = json.dumps([[g[i], n + 1, n + 3] for n, g in enumerate(GRADES)], ensure_ascii=False)
    meta_tpl = html.escape(t('grow_hero_meta'), quote=True)

    # ── 첫 화면 시안 ──
    if hero == 1:  # 로고 + 제목 + 맛보기 판
        hero_html = f'''<section class="hero" id="try" aria-labelledby="h1">
  <div class="hero-bg" aria-hidden="true"><img src="/img/bg-autumn.webp" alt="" width="1280" height="1600" fetchpriority="low"></div>
  <div class="hero-col v1-grid">
    <div class="v1-text">
      {logo}
      <h1 id="h1">{t('h1')}</h1>
      <ul class="chips">{''.join(f'<li>{x}</li>' for x in t('chips'))}</ul>
      <p class="hero-sub v1-sub">{t('sub')}</p>
    </div>
    <div class="v1-play">
      {demo}
      <a class="real-link" href="#real"><img src="/img/boss-{lang}-poster.webp" width="600" height="1066" alt=""><span><b>{t('real_link')}</b>{t('status_note')}</span></a>
    </div>
  </div>
</section>'''
        try_sec = ''
    elif hero == 2:  # 영상 먼저
        hero_html = f'''<section class="hero hero-v2" aria-labelledby="h1">
  <div class="hero-bg" aria-hidden="true"><img src="/img/bg-autumn.webp" alt="" width="1280" height="1600" fetchpriority="low"></div>
  <div class="wrap v2-grid">
    <div class="v2-text">
      {logo}
      <h1 id="h1">{t('h1')}</h1>
      <p class="hero-sub">{t('sub')}</p>
      <p class="v2-acts"><a class="btn btn-main" href="#try">{t('try_btn')}</a></p>
      <p class="hero-status">{t('status').split(' · ')[0]}</p>
    </div>
    <div class="v2-video">{video.replace('id="play-video" muted loop playsinline preload="none"', 'id="play-video" muted loop playsinline autoplay preload="metadata"')}</div>
  </div>
</section>'''
        try_sec = f'''<section class="sec" id="try" aria-labelledby="try-h"><div class="wrap"><div class="hero-col" style="padding:0">
  <div class="sec-head" style="margin:0 auto 8px;text-align:center"><span class="eyebrow">{t('try_eye')}</span><h2 id="try-h">{t('try_h2')}</h2></div>{demo}</div></div></section>'''
    else:  # 성 키우기 먼저
        hero_html = f'''<section class="hero hero-v3" aria-labelledby="h1">
  <div class="hero-bg" aria-hidden="true"><img src="/img/bg-sky-isle.webp" alt="" width="1280" height="1600" fetchpriority="low"></div>
  <div class="hero-col">
    {logo}
    <h1 id="h1">{t('h1')}</h1>
    <div class="v3-tower" data-grades='{grade_opts}' data-meta="{meta_tpl}">
      <div class="tower-img"><img src="/img/castle-01.webp" width="320" height="444" alt=""></div>
      <p class="tower-name">{GRADES[0][i]}</p><p class="tower-meta">{t('grow_hero_meta').format(n=1, f=3)}</p>
    </div>
    <p class="hero-sub">{t('sub')}</p>
    <p class="v2-acts"><a class="btn btn-main" href="#try">{t('try_btn')}</a></p>
    <p class="hero-status">{t('status').split(' · ')[0]}</p>
  </div>
</section>'''
        try_sec = f'''<section class="sec" id="try" aria-labelledby="try-h"><div class="wrap"><div class="hero-col" style="padding:0">
  <div class="sec-head" style="margin:0 auto 8px;text-align:center"><span class="eyebrow">{t('try_eye')}</span><h2 id="try-h">{t('try_h2')}</h2></div>{demo}</div></div></section>'''

    rules = ''.join(
        f'<div class="rule rv"><h3><i>{ICONS[ic]}</i>{t(r)}</h3><p>{t(r + "_p")}</p>{extra}</div>'
        for ic, r, extra in (('order', 'r1', '<div class="rule-order" aria-hidden="true">' + '<i class="ch-arr on"></i>'.join(
            f'<span class="ch ch-done" style="--c:var(--{el})">{el_icon(el)}</span>' for el in ('ice', 'bolt', 'fire')) + '</div>'),
                             ('parry', 'r2', ''), ('fall', 'r4', '')))
    combo_li = [(
        f'<li><span class="pair"><span class="dot" style="--c:var(--{a})">{el_icon(a)}</span><span class="arr">▶</span><span class="dot" style="--c:var(--{b})">{el_icon(b)}</span></span>'
        f'<span>{ko if i == 0 else en}<span class="sr"> ({EL[a][i]} → {EL[b][i]})</span></span></li>') for _, a, b, ko, en in COMBOS]
    first = ('flame_arrows', 'shock', 'shatter', 'overload')
    order = [c for c in COMBOS if c[0] in first] + [c for c in COMBOS if c[0] not in first]
    combo_li = [combo_li[COMBOS.index(c)] for c in order]
    combos = ('<ul class="combo-list">' + ''.join(combo_li[:4]) + '</ul><details class="combo-more"><summary>' + t('combo_more') +
              '</summary><ul class="combo-list">' + ''.join(combo_li[4:]) + '</ul></details>')
    bosses = ''.join(
        f'<figure class="bossc rv"><img class="bg" src="/img/bg-{bg}.webp" width="1280" height="1600" alt="" loading="lazy">'
        f'<img class="art" src="/img/b-{f}.webp" width="360" height="360" alt="" loading="lazy">'
        f'<figcaption><b>{nm[i]}</b><span>{rg[i]} · {(str(w) + "웨이브") if i == 0 else ("wave " + str(w))}</span>'
        f'<span class="weak" style="--c:var(--{wk})"><i>{el_icon(wk)}</i>{t("weak_label")} {EL[wk][i]}</span></figcaption></figure>'
        for f, nm, rg, w, wk, bg in BOSSES)
    heroes = ''.join(
        f'<figure class="heroc" data-r="{r}"><img src="/img/h-{f}.webp" width="360" height="400" alt="" loading="lazy"><b>{nm[i]}</b><span>{RARITY[r][i]} · {EL[el][i]}</span></figure>'
        for f, nm, el, r in HEROES)
    grows = ''.join(f'<li class="rv"><b>{t(g)}</b><span>{t(g + "_p")}</span></li>' for g in ('g1', 'g2', 'g3', 'g4'))
    idles = ''.join(
        f'<div class="idle-item rv"><span class="ic">{ICONS[ic]}</span><div><h3>{t(k)}</h3><p>{t(k + "_p")}</p></div></div>'
        for ic, k in (('auto', 'i1'), ('repeat', 'i2'), ('shield', 'i3'), ('clock', 'i4')))
    nums = ''.join(f'<div class="num rv"><b>{t(n)}</b><span>{t(n + "_s")}</span><small>{t(n + "_m")}</small></div>' for n in ('n1', 'n2', 'n3', 'n4'))
    modes = ''.join(f'<div class="mode rv"><h3>{t(m)}</h3><p>{t(m + "_p")}</p></div>' for m in ('m1', 'm2', 'm3'))
    li = lambda key: ''.join(f'<li>{x}</li>' for x in t(key))
    faq = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t('faq'))
    faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in t('faq')]}, ensure_ascii=False)
    steps = ''.join(
        f'<li class="{"is-now" if s == "now" else ""}"><i aria-hidden="true">{"✓" if s == "done" else n + 1}</i>{name}'
        f'{" <span class=\"sr\">(" + t("step_now") + ")</span>" if s == "now" else ""}</li>'
        for n, (name, s) in enumerate(t('steps')))
    mailto = f'mailto:{MAIL}?subject=' + re.sub(r'[^A-Za-z0-9]', lambda m: ''.join('%%%02X' % b for b in m.group().encode()), t('mail_subject'))
    game_ld = json.dumps({'@context': 'https://schema.org', '@type': 'VideoGame', 'name': t('name'), 'url': url,
                          'description': t('desc'), 'genre': ['Idle', 'Tower defense'], 'gamePlatform': 'Android',
                          'inLanguage': ['ko', 'en', 'ja'], 'image': BASE + ('/og.jpg' if i == 0 else '/og-en.jpg'),
                          'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}, ensure_ascii=False)
    real_video = '' if hero == 2 else f'<div>{video}</div>'
    preload_logo = f'<link rel="preload" href="/img/logo-ko.webp" as="image" fetchpriority="high">' if i == 0 else ''
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
<meta name="theme-color" content="#2A1D4E">
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
{preload_logo}
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
<script type="application/ld+json">{game_ld}</script>
<script type="application/ld+json">{faq_ld}</script>
</head>
<body>
{SPRITE}
<a class="skip" href="#try">{t('skip')}</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="{pre}/"><img src="/img/icon-256.webp" width="32" height="32" alt="">{t('name')}</a>
    <a class="lang" href="{other}" hreflang="{S['lang'][1 - i]}" lang="{S['lang'][1 - i]}" aria-label="{e('other_lang_label')}">{t('other_lang')}</a>
  </div>
</header>
<main>
{hero_html}
{try_sec}
<section class="sec" id="real" aria-labelledby="real-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('real_eye')}</span><h2 id="real-h">{t('real_h2')}</h2><p>{t('real_p')}</p></div>
    <div class="real">
      {real_video}
      <div class="shots" tabindex="0" aria-label="{e('real_eye')}">
        {shot('wave_battle', 'shot_wave', 'shot_wave_c')}
        {shot('boss_weak_order', 'shot_weak', 'shot_weak_c')}
        {shot('groggy_fall', 'shot_groggy', 'shot_groggy_c')}
        {shot('skill_combo', 'shot_combo', 'shot_combo_c')}
        {shot('wave_result', 'shot_result', 'shot_result_c')}
        {shot('title', 'shot_title', 'shot_title_c')}
      </div>
    </div>
  </div>
</section>

<section class="sec sec-alt" id="boss" aria-labelledby="boss-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('boss_eye')}</span><h2 id="boss-h">{t('boss_h2')}</h2><p>{t('boss_p')}</p></div>
    <div class="rules">{rules}</div>
    <div class="combos"><h3>{t('combo_h')}</h3><p>{t('combo_p')}</p>{combos}</div>
    <div class="combos"><h3>{t('bosses_h')}</h3></div>
    <div class="bosses">{bosses}</div>
    <p class="boss-note">{t('boss_note')}</p>
  </div>
</section>

<section class="sec" id="castle" aria-labelledby="castle-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('castle_eye')}</span><h2 id="castle-h">{t('castle_h2')}</h2><p>{t('castle_p')}</p></div>
    <div class="grow">
      <div class="tower" data-grades='{grade_opts}' data-meta="{meta_tpl}">
        <div class="tower-img"><img src="/img/castle-13.webp" width="320" height="444" alt="" loading="lazy"></div>
        <p class="tower-name" aria-live="polite">{GRADES[12][i]}</p>
        <p class="tower-meta">{t('grow_hero_meta').format(n=13, f=15)}</p>
        <div class="tower-ctrl">
          <button type="button" data-step="-1" aria-label="{e('prev')}">‹</button>
          <input type="range" min="1" max="20" value="13" aria-label="{e('grade_lbl')}">
          <button type="button" data-step="1" aria-label="{e('next')}">›</button>
        </div>
      </div>
      <div class="grow-text"><ul>{grows}</ul></div>
    </div>
    <div class="heroes">{heroes}</div>
    <p class="heroes-note">{t('heroes_note')}</p>
    <div class="shots three" tabindex="0" aria-label="{e('castle_eye')}">
      {shot('castle_status', 'shot_status', 'shot_status_c')}
      {shot('hero_info', 'shot_hero', 'shot_hero_c')}
      {shot('recruit', 'shot_recruit', 'shot_recruit_c')}
    </div>
  </div>
</section>

<section class="sec sec-alt" id="idle" aria-labelledby="idle-h">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">{t('idle_eye')}</span><h2 id="idle-h">{t('idle_h2')}</h2></div>
    <div class="idle">{idles}</div>
    <h3 class="sub-h">{t('more_h')}</h3>
    <div class="nums">{nums}</div>
    <div class="modes">{modes}</div>
    <p class="src">{t('idle_src')}</p>
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
  <div class="end-bg" aria-hidden="true"><img src="/img/bg-sky-isle.webp" alt="" width="1280" height="1600" loading="lazy"></div>
  <div class="wrap">
    <h2 id="end-h">{t('end_h2')}</h2>
    <p class="end-lead">{t('end_p')}</p>
    <ol class="end-steps">{steps}</ol>
    <div class="end-acts">
      <a class="btn btn-main" href="{mailto}">{t('mail_btn')}</a>
      <a class="btn btn-line" href="#try">{t('again_btn')}</a>
    </div>
    <p class="mail-note">{t('mail_note')}<span class="nw">{MAIL}</span> <button type="button" class="btn-copy" data-copy="{MAIL}" data-done="{e('copied')}">{t('copy')}</button></p>
    <a class="lumen" href="{t('lumen_url')}">
      <svg viewBox="0 0 64 80" aria-hidden="true">
        <circle class="l-glow" cx="32" cy="14" r="22" fill="url(#lg{i})"/>
        <defs><radialGradient id="lg{i}"><stop offset="0" stop-color="#FFD24A" stop-opacity=".5"/><stop offset="1" stop-color="#FFD24A" stop-opacity="0"/></radialGradient></defs>
        <path d="M32 4v18" stroke="#9AA3BF" stroke-width="2"/>
        <g class="l-flag"><path d="M33 5h14l-4 4 4 4H33z" fill="#FFD24A"/></g>
        <path d="M16 24h32v-6h-5v3h-4v-3h-5v3h-4v-3h-5v3h-4v-3h-5z" fill="#6E6A86"/>
        <rect x="18" y="24" width="28" height="52" fill="#4D4A66"/>
        <path d="M14 76h36" stroke="#3A3752" stroke-width="4" stroke-linecap="round"/>
        <rect class="l-win w3" x="28" y="30" width="8" height="10" rx="4"/>
        <rect class="l-win w2" x="28" y="46" width="8" height="10" rx="4"/>
        <rect class="l-win w1" x="27" y="62" width="10" height="14" rx="5"/>
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
<title>페이지가 없어요 · 캐슬업!</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#2A1D4E"><link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
</head>
<body>
<main class="wrap" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:14px;padding-top:40px;padding-bottom:40px">
<img src="/img/castle-01.webp" width="120" height="166" alt="">
<h1 style="font-size:30px;color:var(--cream)">이 층은 아직 안 지었어요</h1>
<p style="color:var(--muted)">This page doesn’t exist.</p>
<p style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-main" href="/">캐슬업! 홈</a><a class="btn btn-soft" href="/en/" lang="en">Castle Up! home</a></p>
</main>
</body>
</html>
'''


def sha(path):
    return hashlib.sha256(open(os.path.join(SITE, path), 'rb').read()).hexdigest()[:8]


def head_font(src):
    """제목에 쓰는 글자만 남긴 Black Han Sans 조각(OFL: 이름을 바꾸고 라이선스를 같이 둔다)."""
    chars = set()
    for k, v in S.items():
        if re.match(r'(name|h1|.*_h2|.*_eye|n\d$|grow_hero_meta|combo_h|bosses_h|try_h2)$', k):
            for x in v:
                chars |= set(x if isinstance(x, str) else '')
    for g in GRADES:
        chars |= set(g[0]) | set(g[1])
    for d in DEMO.values():
        for k in ('groggy', 'weak', 'fall', 'doneTitle'):
            chars |= set(d[k])
        for v in d['combo'].values():
            chars |= set(v)
    chars |= set('다음!Next!0123456789,.·!?:-–— ()&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz’\'')
    chars |= set('이 층은 아직 안 지었어요')
    txt = os.path.join(HERE, '.head-chars.txt')
    open(txt, 'w', encoding='utf-8').write(''.join(sorted(chars)))
    out = os.path.join(SITE, 'assets', 'head.woff2')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--text-file={txt}', '--flavor=woff2',
                    f'--output-file={out}', '--layout-features=kern,liga', '--no-hinting', '--desubroutinize',
                    '--name-IDs=0,1,2,3,4,5,6', '--name-languages=*'], check=True)
    from fontTools.ttLib import TTFont
    f = TTFont(out, recalcTimestamp=False)
    names = {1: 'CU Head', 3: 'CU Head subset', 4: 'CU Head', 6: 'CUHead-Regular', 16: 'CU Head', 17: 'Regular'}
    for rec in f['name'].names:
        if rec.nameID in names:
            rec.string = names[rec.nameID]
    f.flavor = 'woff2'
    f.save(out)
    os.remove(txt)


def fill(s):
    v = {'__CSS__': sha('assets/site.css'), '__DEMO__': sha('assets/demo.js'), '__SITE__': sha('assets/site.js'),
         '__HEADFONT__': sha('assets/head.woff2')}
    for k, x in v.items():
        s = s.replace(k, x)
    return s, v


def main():
    args = sys.argv[1:]
    if '--font' in args:
        head_font(args[args.index('--font') + 1])
    if '--var' in args:
        n = int(args[args.index('--var') + 1])
        os.makedirs(os.path.join(HERE, 'var'), exist_ok=True)
        for i, lg in ((0, ''), (1, '-en')):
            open(os.path.join(HERE, 'var', f'{n}{lg}.html'), 'w', encoding='utf-8').write(fill(page(i, n))[0])
        print('시안', n)
        return
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    ko, v = fill(page(0))
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(ko)
    open(os.path.join(SITE, 'en', 'index.html'), 'w', encoding='utf-8').write(fill(page(1))[0])
    open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8').write(fill(NOT_FOUND)[0])
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
