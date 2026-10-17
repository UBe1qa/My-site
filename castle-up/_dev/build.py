"""캐슬업! 소개 사이트 만들기: 한국어 / , 영어 /en/ , 404, sitemap, robots, 제목 글꼴 조각.
  python3 _dev/build.py                  사이트
  python3 _dev/build.py --font [경로.ttf] 제목 글꼴 조각도 다시(Black Han Sans, OFL. 경로를 빼면 _dev/var2/fonts/ 의 원본)
글은 아래 S 사전 한 곳에서 고친다(한국어·영어 같이). 페이지 틀은 page() 하나.
주 단추(목표 행동)의 말·주소는 CTA 한 곳에서 바꾼다: 첫 화면·고정 줄·꼭대기가 같이 바뀐다.
숫자·사실의 출처: 게임 저장소 UBe1qa/mobile-games(landing-kit 브랜치 landing-kit/castle-up, main ad6960d의 games/castle).
가격·확률 숫자·출시일·아이폰은 정해지지 않아 쓰지 않는다. 루멘랩 사업체 문서 '캐슬업!' 칸에 같은 내용이 있다.

페이지 구조(2026-10-17, 시안 _dev/var2/a.html '쌓이는 성'을 뼈대로 b.html '보스 수배 전단'을 합침):
  첫 화면(노을 키 아트: 층마다 영웅이 선 탑 + 그 위를 덮는 화염 드래곤) → 1층 한 층에 영웅 한 명 → 2층 켜 두면 싸우고 꺼 두면 원정
  → 3층 보스 20(수배 전단 넘기기) → 질문 4 → 꼭대기 성 승급!(우주의 성) → 꼬리말.  휴대폰 아래 고정 줄: 스크롤만큼 자라는 성 + 주 단추.
사이트 안에서 직접 하는 게임플레이는 넣지 않는다(사이트 주인 결정, 방치형이라 안 맞음).
"""
import hashlib, html, json, os, re, subprocess, sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
BASE = 'https://castle-up.lumenlab.page'
MAIL = 'contact@lumenlab.page'
FONT_SRC = os.path.join(HERE, 'var2', 'fonts', 'BlackHanSans-Regular.ttf')  # 원본은 저장소에 넣지 않는다(.gitignore)


def mailto(subject):
    return f'mailto:{MAIL}?subject=' + quote(subject, safe='')


# ── 주 단추(목표 행동) — 여기 한 곳만 고친다 ──
# 지금: 출시 소식 메일(mailto). 사이트 주인이 '구글 플레이 사전 등록'과 '사이트 안 메일 신청 칸' 중 고르는 중이다.
# 사전 등록으로 바꿀 때 예: 'href': ('https://play.google.com/store/apps/details?id=…', 같은 주소), 'label': ('구글 플레이 사전 등록', 'Pre-register on Google Play'),
#   'note': ('출시되는 날 구글 플레이가 알려 줘요.', 'Google Play lets you know on launch day.'), 'icon': 'play'
CTA = {
    'href': (mailto('캐슬업! 출시 알림 신청'), mailto('Castle Up! launch alert sign-up')),
    'label': ('출시 소식 메일로 받기', 'Email me at launch'),
    'note': ('메일 앱이 열리면 그대로 보내 주세요.', 'Your mail app opens. Just hit send.'),
    'icon': 'mail',
}

# 키: (한국어, 영어)
S = {
  'lang': ('ko', 'en'),
  'name': ('캐슬업!', 'Castle Up!'),
  'title': ('캐슬업! — 켜 두면, 골드로 성이 자라요 · 방치형 디펜스', 'Castle Up! — Leave it on, gold grows your castle · idle defense'),
  'desc': ('성을 층층이 쌓아 층마다 영웅을 세우는 방치형 디펜스. 켜 두면 알아서 싸우고, 꺼 둬도 영웅이 원정 보상을 챙겨 와요. 15웨이브마다 보스가 길을 막아요. 안드로이드 출시 준비 중.',
           'An idle castle defense game: raise your castle floor by floor and put a hero on each. Leave it on and it fights by itself; close it and your heroes still bring back expedition rewards. A boss blocks the road every 15 waves. Android launch in the works.'),
  'skip': ('본문으로 건너뛰기', 'Skip to content'),
  'other_lang': ('English', '한국어'),
  'other_lang_label': ('Read this page in English', '한국어로 보기'),
  'home_label': ('캐슬업! 처음으로', 'Castle Up! home'),

  # 첫 화면
  'h1': ('켜 두면, <span class="nw">골드로 성이 자라요</span>', 'Leave it on. <span class="nw">Gold grows your castle.</span>'),
  'sub': ('꺼 둬도 영웅이 원정 보상을 챙겨 와요.', 'Close the game and your heroes still bring back expedition rewards.'),
  'tag': ('방치형 디펜스 · 안드로이드', 'Idle defense · Android'),
  'stage_alt': ('층마다 영웅이 선 작은 성 앞을 커다란 화염 드래곤이 막아섰어요. 성이 알아서 스킬을 쏘고, 드래곤의 약점은 얼음이에요.',
                'A huge Flame Dragon looms over a small castle with a hero on every floor. The castle fires its skills on its own; the dragon is weak to ice.'),
  'weak_label': ('약점', 'Weak to'),
  'pop_weak': ('약점!', 'Weak!'),

  # 1층
  'f1_h2': ('한 층에 영웅 한 명', 'One hero on every floor'),
  'f1_p': ('승급할 때마다 성이 바뀌고 층이 하나 늘어요. 층보다 영웅이 많아서 누구를 세울지 골라요.',
           'Every promotion changes your castle and adds a floor. There are more heroes than floors, so you pick who stands.'),
  'f1_count': ('영웅 50명', '50 heroes'),
  'f1_count_s': ('모집 30명 + 보스 영웅 20명', '30 recruits + 20 boss heroes'),
  'stack_label': ('층마다 선 영웅', 'The hero on each floor'),

  # 2층
  'f2_h2': ('켜 두면 싸우고,<br>꺼 두면 원정 가요', 'On, they fight.<br>Off, they explore.'),
  'day_h': ('켜 둔 동안', 'Game open'),
  'day_p': ('자동 스킬로 싸우고, 깬 웨이브는 자동 반복으로 골드를 모아요.', 'Skills fire on Auto, and cleared waves replay by themselves to gather gold.'),
  'video_cap': ('실제 게임 · 자동 스킬로 둔 보스전 · 소리 없음', 'Real game · a boss fight on Auto · no sound'),
  'video_label': ('45웨이브 보스 박쥐 여왕과 자동 스킬로 싸우는 실제 게임 영상', 'Video of the real game fighting the wave 45 boss, the Bat Queen, on Auto skills'),
  'night_h': ('꺼 둔 동안', 'Game closed'),
  'night_p': ('영웅을 셋까지 원정 보내면 1·4·8시간 뒤 보상을 가져와요.', 'Send up to three heroes on expeditions; they bring rewards back after 1, 4 or 8 hours.'),
  'trip_t': (['1시간', '4시간', '8시간'], ['1 hour', '4 hours', '8 hours']),
  'trips_label': ('원정 예시', 'Expedition example'),
  'got': ('보상 도착!', 'Rewards in!'),
  'stay': ('원정 중에도 영웅은 성을 떠나지 않아요.', 'Heroes on expeditions never leave the castle.'),
  'ribbon': ('져도 벌칙은 없어요. 번 골드는 그대로 남아요.', 'Losing costs nothing. The gold you earned stays.'),

  # 3층
  'f3_sr': ('보스 20마리. ', '20 bosses. '),
  'f3_h2': ('마리 보스가<br>길을 막아요', 'bosses<br>block the road'),
  'f3_p': ('15웨이브마다 한 마리씩. 보스마다 약점 속성이 있어요.', 'One every 15 waves, each with a weak element.'),
  'wanted': ('수배', 'WANTED'),
  'wave': ('{w}웨이브', 'Wave {w}'),
  'reel_label': ('보스 수배 전단 여섯 장. 옆으로 넘겨 보세요.', 'Six boss wanted posters. Swipe sideways.'),
  'prev_boss': ('이전 보스', 'Previous boss'), 'next_boss': ('다음 보스', 'Next boss'),
  'join': ('처음 잡은 보스는 그 힘을 이은 <b>보스 영웅</b>이 되어 성에 합류해요.', 'Beat a boss for the first time and a <b>boss hero</b> with its power joins your castle.'),

  # 질문
  'faq_h2': ('자주 묻는 질문', 'Questions'),
  'faq': ([
    ('언제, 어디서 받을 수 있나요?', '안드로이드(구글 플레이) 출시를 준비하고 있어요. 지금은 휴대폰에서 플레이테스트 중이고, 출시일은 아직 정하지 않았어요.'),
    ('아이폰에서도 되나요?', '아직 정하지 않았어요. 지금 준비하는 건 안드로이드예요.'),
    ('돈을 써야 하나요? 광고는요?', '받는 건 무료로 설계했어요. 2배속, 자동 스킬, 자동 반복도 무료예요. 광고는 보고 싶을 때만 보는 보상형으로 설계했고, 영웅 모집은 확률로 뽑는 방식이에요(확률은 게임 안에서 보여 줘요).'),
    ('계속 붙잡고 있어야 하나요?', '아니요. 스킬은 자동으로 쓰게 둘 수 있고, 깬 웨이브는 자동 반복으로 다시 돌아요. 원정은 게임을 꺼 둬도 시간이 가요. 다음 웨이브로 넘어가는 것만 직접 눌러요.'),
  ], [
    ('When and where can I get it?', 'A Google Play (Android) launch is in the works. The game is being play-tested on phones now, and there is no release date yet.'),
    ('Will it be on iPhone?', 'Not decided yet. Android is what is being prepared now.'),
    ('Do I have to spend money? What about ads?', 'It is designed to be free to download. 2× speed, auto skills and auto replay are free too. Ads are designed as rewarded ads you only watch when you want, and recruiting heroes is a random draw (the odds are shown in the game).'),
    ('Do I have to keep playing by hand?', 'No. Skills can fire on their own, and cleared waves replay automatically. Expeditions keep going while the game is closed. Only moving to the next wave needs a tap.'),
  ]),

  # 꼭대기
  'promo': ('성 승급!', 'Promoted!'),
  'end_h2': ('출시되면, 직접 쌓아 보세요', 'When it’s out, build it yourself'),
  'end_p': ('돌 성 3층에서 우주의 성 22층까지. 구글 플레이 출시를 준비하고 있어요.', 'From a 3-floor Stone Keep to the 22-floor Cosmic Castle. A Google Play launch is in the works.'),
  'summit_alt': ('20등급 우주의 성', 'Grade 20 Cosmic Castle'),
  'grade_meta': ('{n}등급 · {f}층', 'Grade {n} · {f} floors'),
  'keep_meta': ('{n}등급 · {f}층', 'Grade {n}'),
  'keep_label': ('스크롤하면 자라는 성', 'A castle that grows as you scroll'),

  # 꼬리말
  'lumen_url': ('https://lumenlab.page/', 'https://lumenlab.page/en/'),
  'foot_ai': ('로고·영웅·보스·성·배경 그림은 AI 도구(Higgsfield)로, 게임 속 캐릭터 움직임은 AI 영상 도구(Kling)로 만들었어요.',
              'The logo, heroes, bosses, castles and backgrounds were made with an AI tool (Higgsfield); in-game character motion comes from AI video (Kling).'),
  'foot_dev': ('화면과 숫자는 개발 중인 게임 기준이라 출시 전에 바뀔 수 있어요.', 'Screens and numbers reflect the game in development and may change before launch.'),
}

EL = {'phys': ('물리', 'Physical'), 'fire': ('불', 'Fire'), 'ice': ('얼음', 'Ice'), 'bolt': ('번개', 'Lightning'), 'holy': ('빛', 'Light'), 'dark': ('어둠', 'Dark')}
# 보스 6 (그림이 있는 보스): 파일, 이름, 지역, 웨이브, 약점, 배경 — 게임 content-plan·strings.csv
BOSSES = [('warlord', ('돌격 대장', 'Charging Warlord'), ('푸른 초원', 'Green Meadow'), 15, 'phys', 'meadow'),
          ('bat-queen', ('박쥐 여왕', 'Bat Queen'), ('단풍 숲', 'Autumn Woods'), 45, 'fire', 'autumn'),
          ('golem', ('바위 골렘', 'Stone Golem'), ('붉은 협곡', 'Red Canyon'), 75, 'bolt', 'canyon'),
          ('dragon', ('화염 드래곤', 'Flame Dragon'), ('불의 산', 'Fire Mountain'), 135, 'ice', 'volcano'),
          ('kraken', ('크라켄', 'Kraken'), ('폭풍 해안', 'Storm Coast'), 240, 'bolt', 'coast'),
          ('demon-lord', ('마왕', 'Demon Lord'), ('마왕성', 'Demon Castle'), 300, 'holy', 'demon-castle')]
# 영웅 8 (그림이 있는 영웅): 파일, 이름, 속성, 등급(0 일반 … 4 전설, b 보스 영웅), 그림 크기
HEROES = {'archer': (('궁수', 'Archer'), 'phys', '0', 437), 'spear': (('창병', 'Spearman'), 'phys', '0', 554),
          'frost-witch': (('얼음 마녀', 'Frost Witch'), 'ice', '2', 395), 'angel': (('천사', 'Angel'), 'holy', '3', 347),
          'sword-king': (('성검의 왕', 'Holy Sword King'), 'holy', '4', 560),
          'bat-tower': (('박쥐 공주', 'Bat Princess'), 'dark', 'b', 406), 'golem-forge': (('꼬마 골렘', 'Little Golem'), 'phys', 'b', 426),
          'little-demon': (('꼬마 마왕', 'Little Demon Lord'), 'fire', 'b', 439)}
RARITY = {'0': ('일반', 'Common'), '2': ('희귀', 'Rare'), '3': ('에픽', 'Epic'), '4': ('전설', 'Legendary'), 'b': ('보스 영웅', 'Boss hero')}
RCOLOR = {'0': '#C9CED8', '2': '#5FB4FF', '3': '#C27BFF', '4': '#FFB13D', 'b': '#FF8A8A'}  # 게임 balance.gd RARITIES 색
# 성 등급 20 (GRADE_1~20), 층 = 등급 + 2
GRADES = [('돌 성', 'Stone Keep'), ('망루 성', 'Watch Castle'), ('요새', 'Fortress'), ('성채', 'Citadel'), ('황금 왕성', 'Golden Palace'),
          ('천공성', 'Sky Castle'), ('별의 성', 'Star Castle'), ('수정 성', 'Crystal Castle'), ('은빛 성채', 'Silver Citadel'), ('용의 성', 'Dragon Castle'),
          ('바람의 성', 'Castle of Winds'), ('달빛 궁전', 'Moonlight Palace'), ('태양 궁전', 'Sun Palace'), ('하늘 요새', 'Sky Fortress'), ('무지개 성', 'Rainbow Castle'),
          ('천사의 성', 'Castle of Angels'), ('별바다 성', 'Starsea Castle'), ('영원의 성', 'Eternal Castle'), ('신들의 성', 'Castle of Gods'), ('우주의 성', 'Cosmic Castle')]

# 속성 그림(게임 icons.gd ELEMENT_SHAPES: 칼·불꽃·눈송이·번개·해·달)과 단추 그림
SPRITE = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-phys" viewBox="0 0 24 24"><path d="M19 3h2v2l-9.5 9.5-2-2z" fill="currentColor"/><path d="m6.5 13.5 4 4M8 16l-4 4M5 18.5 3.5 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></symbol>
<symbol id="i-fire" viewBox="0 0 24 24"><path d="M12 2.5c.6 3.2 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.2 2.6-5.3.1 1.6.9 2.8 2 3.3-.6-3.4.2-6.3.9-9z" fill="currentColor"/></symbol>
<symbol id="i-ice" viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor"/></symbol>
<symbol id="i-holy" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.6" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
<symbol id="i-dark" viewBox="0 0 24 24"><path d="M15.5 3.2A9 9 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z" fill="currentColor"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M5 3.5v17L20 12z" fill="currentColor"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-prev" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-next" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>'''


def use(name, cls=''):
    c = f' class="{cls}"' if cls else ''
    return f'<svg{c} viewBox="0 0 24 24" aria-hidden="true"><use href="#i-{name}"/></svg>'


def cta(i, cls='', ident=''):
    """주 단추 하나. 모든 자리가 이 함수 하나로 그려진다."""
    idattr = f' id="{ident}"' if ident else ''
    return (f'<a class="cta{(" " + cls) if cls else ""}"{idattr} href="{html.escape(CTA["href"][i], quote=True)}">'
            f'{use(CTA["icon"])}<span class="cta-t">{CTA["label"][i]}</span></a>')


def tower(i, floors, plates=False, cls=''):
    """층마다 영웅 한 명이 선 탑(코드로 그림). floors: 위층부터 영웅 파일 이름."""
    rooms = []
    for n, f in enumerate(floors):
        nm, el, r, h = HEROES[f]
        plate = (f'<div class="plate"><b class="plate-n">{nm[i]}</b><span><em>{RARITY[r][i]}</em> · {use(el)}{EL[el][i]}</span></div>'
                 if plates else '')
        alt = html.escape(nm[i], quote=True) if plates else ''
        rooms.append(f'<li class="room{" drop" if plates else ""}" style="--rc:{RCOLOR[r]};--ec:var(--{el});--dl:{(len(floors) - 1 - n) * .16:.2f}s">'
                     f'<span class="win" aria-hidden="true"></span><img src="/img/h-{f}.webp" width="360" height="{h}" alt="{alt}"'
                     f'{" loading=\"lazy\"" if plates else ""} data-el="{el}">{plate}</li>')
    label = f' aria-label="{html.escape(L("stack_label", i), quote=True)}"' if plates else ' aria-hidden="true"'
    return (f'<div class="tw {cls}"><div class="tw-roof{" drop" if plates else ""}" aria-hidden="true" style="--dl:{len(floors) * .16:.2f}s"><i class="tw-flag"></i></div>'
            f'<ul class="tw-rooms"{label}>{"".join(rooms)}</ul><div class="tw-base" aria-hidden="true"></div></div>')


def L(key, i):
    return S[key][i]


def page(i):
    lang = S['lang'][i]
    url = BASE + ('/' if i == 0 else '/en/')
    home = '/' if i == 0 else '/en/'
    other = '/en/' if i == 0 else '/'
    other_lang = S['lang'][1 - i]
    t = lambda k: L(k, i)
    e = lambda k: html.escape(L(k, i), quote=True)
    gmeta = lambda n: t('grade_meta').format(n=n, f=n + 2)

    brand = (f'<img src="/img/logo-ko.webp" width="720" height="530" alt="{e("name")}" fetchpriority="high">' if i == 0
             else f'<span class="brand-text">{t("name")}</span>')

    # ── 첫 화면: 노을 + 층마다 영웅 탑 + 그 위를 덮는 화염 드래곤 ──
    boss = BOSSES[3]
    hero = f'''<section class="hero" id="top" aria-labelledby="h1" data-live>
  <div class="sky" aria-hidden="true"><img src="/img/bg-autumn.webp" width="1280" height="1600" alt="" fetchpriority="high"></div>
  <div class="wrap wide hero-in">
    <div class="stage" id="stage" role="img" aria-label="{e('stage_alt')}">
      <div class="hud" aria-hidden="true"><b class="hud-name">{boss[1][i]}</b><span class="hud-weak" style="--c:var(--{boss[4]})">{use(boss[4])}{t('weak_label')} {EL[boss[4]][i]}</span><span class="hp"><i id="hp"></i></span></div>
      <img class="boss" id="boss" src="/img/b-{boss[0]}.webp" width="360" height="337" alt="" fetchpriority="high" data-weak="{boss[4]}">
      {tower(i, ['angel', 'frost-witch', 'archer'], cls='tw-hero')}
      <span class="tag" aria-hidden="true">{t('tag')}</span>
      <div class="fx" id="fx" aria-hidden="true" data-pop="{e('pop_weak')}"></div>
    </div>
    <div class="hero-txt">
      <h1 id="h1">{t('h1')}</h1>
      <p class="hero-sub">{t('sub')}</p>
      <div class="act" id="heroAct">{cta(i)}<p class="cta-note">{CTA['note'][i]}</p></div>
    </div>
  </div>
</section>'''

    # ── 1층: 한 층에 영웅 한 명 ──
    f1 = f'''<section class="floor f1" id="heroes" aria-labelledby="h-f1" data-live>
  <div class="wrap f1-grid">
    <div class="f1-txt drop">
      <h2 id="h-f1">{t('f1_h2')}</h2>
      <p class="lead">{t('f1_p')}</p>
      <p class="count-badge"><b>{t('f1_count')}</b><span>{t('f1_count_s')}</span></p>
    </div>
    {tower(i, ['sword-king', 'angel', 'frost-witch', 'archer'], plates=True, cls='tw-big')}
  </div>
</section>'''

    # ── 2층: 켜 둔 동안 / 꺼 둔 동안 ──
    trips = ''.join(
        f'<li class="trip" style="--t:{tt}s;--rc:{RCOLOR[HEROES[f][2]]}"><span class="face"><img src="/img/h-{f}.webp" width="360" height="{HEROES[f][3]}" alt="" loading="lazy"></span>'
        f'<div class="trip-b"><div class="trip-top"><b>{HEROES[f][0][i]}</b><span>{hrs} <span class="got">{t("got")}</span></span></div>'
        f'<div class="bar"><i></i></div></div></li>'
        for f, hrs, tt in zip(('archer', 'frost-witch', 'angel'), t('trip_t'), (1.2, 2.4, 3.8)))
    f2 = f'''<section class="floor f2" id="idle" aria-labelledby="h-f2">
  <div class="wrap">
    <h2 id="h-f2" class="drop">{t('f2_h2')}</h2>
    <div class="duo">
      <div class="pane pane-day drop">
        <div class="pane-txt">
          <h3 class="pane-h">{use('holy')}{t('day_h')}</h3>
          <p>{t('day_p')}</p>
          <p class="cap">{t('video_cap')}</p>
        </div>
        <div class="phone">
          <video id="vid" muted loop playsinline preload="none" poster="/img/boss-{lang}-poster.webp" width="600" height="1066" aria-label="{e('video_label')}">
            <source src="/img/boss-{lang}.mp4" type='video/mp4; codecs="avc1.64001F"'>
            <source src="/img/boss-{lang}.webm" type='video/webm; codecs="vp9"'>
          </video>
        </div>
      </div>
      <div class="pane pane-night drop" id="trips" style="--dl:.15s">
        <span class="moon" aria-hidden="true"></span>
        <h3 class="pane-h">{use('dark')}{t('night_h')}</h3>
        <p>{t('night_p')}</p>
        <ul class="trips" aria-label="{e('trips_label')}">{trips}</ul>
        <p class="stay">{t('stay')}</p>
      </div>
    </div>
    <p class="ribbon drop">{use('shield')}{t('ribbon')}</p>
  </div>
</section>'''

    # ── 3층: 보스 20, 수배 전단 넘기기 ──
    posters = ''.join(
        f'<article class="poster" style="--r:{r}deg;--sc:var(--s-{wk})" aria-label="{html.escape(nm[i], quote=True)}">'
        f'<span class="pin" aria-hidden="true"></span>'
        f'<p class="p-top"><b class="p-wanted">{t("wanted")}</b><span>{rg[i]} · {t("wave").format(w=w)}</span></p>'
        f'<div class="p-art"><img class="p-bg" src="/img/bg-{bg}.webp" width="1280" height="1600" alt="" loading="lazy">'
        f'<img class="p-boss" src="/img/b-{f}.webp" width="360" height="{h}" alt="{html.escape(nm[i], quote=True)}" loading="lazy"></div>'
        f'<h3 class="p-name">{nm[i]}</h3>'
        f'<p class="stamp"><small>{t("weak_label")}</small><b class="stamp-el">{EL[wk][i]}</b>{use(wk)}</p></article>'
        for (f, nm, rg, w, wk, bg), r, h in zip(BOSSES, (-2.2, 1.6, -1.2, 2.0, -1.6, 1.2), (367, 345, 364, 337, 330, 359)))
    faces = ''.join(f'<span><img src="/img/h-{f}.webp" width="360" height="{HEROES[f][3]}" alt="" loading="lazy"></span>'
                    for f in ('bat-tower', 'golem-forge', 'little-demon'))
    f3 = f'''<section class="floor f3" id="bosses" aria-labelledby="h-f3">
  <div class="wrap">
    <div class="boss-head drop">
      <span class="big" aria-hidden="true">20</span>
      <h2 id="h-f3"><span class="sr">{t('f3_sr')}</span>{t('f3_h2')}</h2>
    </div>
    <p class="lead drop">{t('f3_p')}</p>
    <div class="reel">
      <div class="board" id="board" tabindex="0" role="region" aria-label="{e('reel_label')}">{posters}</div>
      <div class="reel-nav">
        <button type="button" class="nav" id="prev" aria-label="{e('prev_boss')}" aria-controls="board">{use('prev')}</button>
        <span class="count" id="count" aria-live="polite">1 / {len(BOSSES)}</span>
        <button type="button" class="nav" id="next" aria-label="{e('next_boss')}" aria-controls="board">{use('next')}</button>
      </div>
    </div>
    <div class="join drop"><div class="join-faces" aria-hidden="true">{faces}</div><p>{t('join')}</p></div>
  </div>
</section>'''

    faq = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in t('faq'))
    f4 = f'''<section class="floor f4" id="faq" aria-labelledby="h-faq">
  <div class="wrap narrow">
    <h2 id="h-faq" class="drop">{t('faq_h2')}</h2>
    <div class="faq">{faq}</div>
  </div>
</section>'''

    f5 = f'''<section class="floor f5" id="end" aria-labelledby="h-end" data-live>
  <div class="wrap">
    <div class="summit drop" id="summit">
      <span class="beam" aria-hidden="true"></span>
      <span class="promo" aria-hidden="true">{t('promo')}</span>
      <img src="/img/castle-20.webp" width="320" height="380" alt="{e('summit_alt')}" loading="lazy">
    </div>
    <p class="plaque"><i class="plaque-n">{GRADES[19][i]}</i><span>{gmeta(20)}</span></p>
    <h2 id="h-end">{t('end_h2')}</h2>
    <p class="lead">{t('end_p')}</p>
    <div class="act" id="endAct">{cta(i, 'shine')}<p class="cta-note">{CTA['note'][i]}</p></div>
  </div>
</section>'''

    grades = json.dumps([g[i] for g in GRADES], ensure_ascii=False)
    keep = f'''<aside class="keep" id="keep" hidden aria-label="{e('keep_label')}" data-grades='{html.escape(grades, quote=False)}' data-meta="{e('keep_meta')}">
  <div class="keep-castle" aria-hidden="true"><span class="glow" id="keepGlow"></span><img id="keepImg" src="/img/castle-01.webp" width="320" height="444" alt="" loading="lazy"></div>
  <p class="keep-txt" aria-hidden="true"><b class="keep-name" id="keepName" data-grade="1">{GRADES[0][i]}</b><span id="keepMeta">{t('keep_meta').format(n=1, f=3)}</span></p>
  {cta(i, 'cta-sm')}
</aside>'''

    faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in t('faq')]}, ensure_ascii=False)
    game_ld = json.dumps({'@context': 'https://schema.org', '@type': 'VideoGame', 'name': t('name'), 'url': url,
                          'description': t('desc'), 'genre': ['Idle', 'Tower defense'], 'gamePlatform': 'Android',
                          'inLanguage': ['ko', 'en', 'ja'], 'image': BASE + ('/og.jpg' if i == 0 else '/og-en.jpg'),
                          'author': {'@type': 'Organization', 'name': 'Lumen Lab', 'url': 'https://lumenlab.page/'}}, ensure_ascii=False)
    preload_logo = '<link rel="preload" href="/img/logo-ko.webp" as="image" fetchpriority="high">\n' if i == 0 else ''
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
<meta name="theme-color" content="#3A2160">
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
{preload_logo}<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">{game_ld}</script>
<script type="application/ld+json">{faq_ld}</script>
</head>
<body>
{SPRITE}
<a class="skip" href="#heroes">{t('skip')}</a>
<header class="top">
  <div class="wrap wide top-in">
    <a class="brand" href="{home}" aria-label="{e('home_label')}">{brand}</a>
    <a class="lang" href="{other}" hreflang="{other_lang}" lang="{other_lang}" aria-label="{e('other_lang_label')}">{t('other_lang')}</a>
  </div>
</header>
<main id="main">
{hero}
{f1}
{f2}
{f3}
{f4}
{f5}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot-row"><span>© 2026 Lumen Lab</span><a href="mailto:{MAIL}">{MAIL}</a><a href="{t('lumen_url')}">lumenlab.page</a><a href="{other}" hreflang="{other_lang}" lang="{other_lang}">{t('other_lang')}</a></div>
    <p>{t('foot_ai')}</p>
    <p>{t('foot_dev')}</p>
  </div>
</footer>
{keep}
<script src="/assets/site.js?v=__SITE__" defer></script>
</body>
</html>
'''


NOT_FOUND = '''<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>페이지가 없어요 · 캐슬업!</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#3A2160"><link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/assets/site.css?v=__CSS__">
</head>
<body class="nf">
<main class="nf-in">
<img src="/img/castle-01.webp" width="160" height="222" alt="">
<h1>이 층은 아직 안 지었어요</h1>
<p lang="en">This floor isn’t built yet.</p>
<p class="nf-acts"><a class="cta" href="/">캐슬업! 처음으로</a><a class="nf-en" href="/en/" lang="en">Castle Up! home</a></p>
</main>
</body>
</html>
'''
NOT_FOUND_HEAD = '이 층은 아직 안 지었어요캐슬업! 처음으로'


def sha(path):
    return hashlib.sha256(open(os.path.join(SITE, path), 'rb').read()).hexdigest()[:8]


# 제목 글꼴(CU Head)을 쓰는 글: 제목·숫자·단추·이름표. check.py가 실제 페이지에서 빠진 글자를 다시 센다.
HEAD_KEYS = ('name', 'h1', 'f1_h2', 'f1_count', 'f2_h2', 'day_h', 'night_h', 'got', 'f3_h2', 'wanted', 'faq_h2', 'promo', 'end_h2',
             'pop_weak', 'grade_meta')


def head_font(src):
    """제목에 쓰는 글자만 남긴 Black Han Sans 조각(OFL: 이름을 바꾸고 라이선스를 같이 둔다)."""
    chars = set()
    for k in HEAD_KEYS:
        for x in S[k]:
            chars |= set(re.sub(r'<[^>]+>', '', x))
    for g in GRADES:
        chars |= set(g[0]) | set(g[1])
    for b in BOSSES:
        chars |= set(b[1][0]) | set(b[1][1])
    for h in HEROES.values():
        chars |= set(h[0][0]) | set(h[0][1])
    for v in EL.values():
        chars |= set(v[0]) | set(v[1])
    for x in CTA['label']:
        chars |= set(x)
    chars |= set(NOT_FOUND_HEAD)
    chars |= set('0123456789/,.·!?:-–— ()&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz’\'')
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
    print('글꼴 조각', len(chars), '글자', os.path.getsize(out), 'B')


def fill(s):
    v = {'__CSS__': sha('assets/site.css'), '__SITE__': sha('assets/site.js'), '__HEADFONT__': sha('assets/head.woff2')}
    for k, x in v.items():
        s = s.replace(k, x)
    return s, v


def main():
    args = sys.argv[1:]
    if '--font' in args:
        k = args.index('--font')
        head_font(args[k + 1] if len(args) > k + 1 and not args[k + 1].startswith('--') else FONT_SRC)
    os.makedirs(os.path.join(SITE, 'en'), exist_ok=True)
    css = open(os.path.join(SITE, 'assets/site.css'), encoding='utf-8').read()
    css2 = re.sub(r'head\.woff2\?v=[^)"]+', 'head.woff2?v=' + sha('assets/head.woff2'), css)
    if css2 != css:
        open(os.path.join(SITE, 'assets/site.css'), 'w', encoding='utf-8').write(css2)
        print('site.css 글꼴 지문을 바꿨어요.')
    ko, v = fill(page(0))
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(ko)
    open(os.path.join(SITE, 'en', 'index.html'), 'w', encoding='utf-8').write(fill(page(1))[0])
    open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8').write(fill(NOT_FOUND)[0])
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
