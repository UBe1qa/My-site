"""오프닝 이름 한국어로. 갈래(콜론 앞) 이름은 전부 옮기고, 변화 이름은 많이 쓰는 것만 옮긴다.
모르는 사람 이름은 영어로 둔다(한국 체스 사용자도 영어 이름을 그대로 쓰는 일이 많아서 억지로 음역하지 않음)."""
import re

FAMILY = {
    "Alekhine Defense": "알레힌 디펜스", "Amar Opening": "아마르 오프닝", "Amazon Attack": "아마존 어택",
    "Amsterdam Attack": "암스테르담 어택", "Anderssen's Opening": "안데르센 오프닝", "Australian Defense": "오스트레일리안 디펜스",
    "Barnes Defense": "반스 디펜스", "Barnes Opening": "반스 오프닝", "Basque Opening": "바스크 오프닝",
    "Benko Gambit": "벤코 갬빗", "Benko Gambit Accepted": "벤코 갬빗 수락", "Benko Gambit Declined": "벤코 갬빗 거절",
    "Benoni Defense": "베노니 디펜스", "Bird Opening": "버드 오프닝", "Bishop's Opening": "비숍스 오프닝",
    "Blackmar-Diemer Gambit": "블랙마-디머 갬빗", "Blackmar-Diemer Gambit Accepted": "블랙마-디머 갬빗 수락",
    "Blackmar-Diemer Gambit Declined": "블랙마-디머 갬빗 거절", "Blumenfeld Countergambit": "블루멘펠트 카운터갬빗",
    "Blumenfeld Countergambit Accepted": "블루멘펠트 카운터갬빗 수락", "Bogo-Indian Defense": "보고 인디언 디펜스",
    "Bongcloud Attack": "봉클라우드 어택", "Borg Defense": "보그 디펜스", "Canard Opening": "카나르 오프닝",
    "Caro-Kann Defense": "카로칸 디펜스", "Carr Defense": "카 디펜스", "Catalan Opening": "카탈란 오프닝",
    "Center Game": "센터 게임", "Center Game Accepted": "센터 게임 수락", "Clemenz Opening": "클레멘츠 오프닝",
    "Colle System": "콜레 시스템", "Creepy Crawly Formation": "크리피 크롤리 포메이션", "Czech Defense": "체코 디펜스",
    "Danish Gambit": "데니시 갬빗", "Danish Gambit Accepted": "데니시 갬빗 수락", "Danish Gambit Declined": "데니시 갬빗 거절",
    "Dresden Opening": "드레스덴 오프닝", "Duras Gambit": "두라스 갬빗", "Dutch Defense": "더치 디펜스",
    "Döry Defense": "되리 디펜스", "East Indian Defense": "이스트 인디언 디펜스", "Elephant Gambit": "엘리펀트 갬빗",
    "English Defense": "잉글리시 디펜스", "English Opening": "잉글리시 오프닝", "English Orangutan": "잉글리시 오랑우탄",
    "Englund Gambit": "잉글룬드 갬빗", "Englund Gambit Declined": "잉글룬드 갬빗 거절", "Formation": "포메이션",
    "Four Knights Game": "포 나이츠 게임", "French Defense": "프렌치 디펜스",
    "French Defense, Classical, 4. Bg5": "프렌치 디펜스, 클래시컬, 4. Bg5", "Fried Fox Defense": "프라이드 폭스 디펜스",
    "Global Opening": "글로벌 오프닝", "Goldsmith Defense": "골드스미스 디펜스", "Grob Opening": "그롭 오프닝",
    "Grünfeld Defense": "그륀펠트 디펜스", "Gunderam Defense": "군데람 디펜스", "Hippopotamus Defense": "히포포타무스 디펜스",
    "Horwitz Defense": "호르비츠 디펜스", "Hungarian Opening": "헝가리안 오프닝", "Indian Defense": "인디언 디펜스",
    "Irish Gambit": "아이리시 갬빗", "Italian Game": "이탈리안 게임", "Kangaroo Defense": "캥거루 디펜스",
    "King's Gambit": "킹스 갬빗", "King's Gambit Accepted": "킹스 갬빗 수락", "King's Gambit Declined": "킹스 갬빗 거절",
    "King's Indian Attack": "킹스 인디언 어택", "King's Indian Attack, with Bf5": "킹스 인디언 어택, Bf5",
    "King's Indian Attack, with e6": "킹스 인디언 어택, e6", "King's Indian Defense": "킹스 인디언 디펜스",
    "King's Knight Opening": "킹스 나이트 오프닝", "King's Pawn Game": "킹스 폰 게임", "King's Pawn Opening": "킹스 폰 오프닝",
    "Kádas Opening": "카다시 오프닝", "Lasker Simul Special": "라스커 시뮬 스페셜", "Latvian Gambit": "라트비안 갬빗",
    "Latvian Gambit Accepted": "라트비안 갬빗 수락", "Lemming Defense": "레밍 디펜스", "Lion Defense": "라이언 디펜스",
    "London System": "런던 시스템", "London System, with Bd3": "런던 시스템, Bd3", "London System, with Be2": "런던 시스템, Be2",
    "Marienbad System": "마리엔바트 시스템", "Mexican Defense": "멕시칸 디펜스", "Mieses Opening": "미제스 오프닝",
    "Mikenas Defense": "미케나스 디펜스", "Modern Defense": "모던 디펜스", "Montevideo Defense": "몬테비데오 디펜스",
    "Neo-Grünfeld Defense": "네오 그륀펠트 디펜스", "Nimzo-Indian Defense": "님조 인디언 디펜스",
    "Nimzo-Larsen Attack": "님조-라르센 어택", "Nimzowitsch Defense": "님조비치 디펜스", "Old Indian Defense": "올드 인디언 디펜스",
    "Owen Defense": "오웬 디펜스", "Paleface Attack": "페일페이스 어택", "Petrov's Defense": "페트로프 디펜스",
    "Philidor Defense": "필리도르 디펜스", "Pirc Defense": "피르츠 디펜스", "Polish Defense": "폴리시 디펜스",
    "Polish Opening": "폴리시 오프닝", "Polish Opening, with d5": "폴리시 오프닝, d5", "Ponziani Opening": "폰치아니 오프닝",
    "Portuguese Opening": "포르투갈 오프닝", "Pseudo Queen's Indian Defense": "유사 퀸스 인디언 디펜스",
    "Pterodactyl Defense": "프테로닥틸 디펜스", "Queen's Gambit": "퀸스 갬빗", "Queen's Gambit Accepted": "퀸스 갬빗 수락",
    "Queen's Gambit Declined": "퀸스 갬빗 거절", "Queen's Indian Accelerated": "가속 퀸스 인디언",
    "Queen's Indian Defense": "퀸스 인디언 디펜스", "Queen's Indian Defense, with e3": "퀸스 인디언 디펜스, e3",
    "Queen's Indian Defense, with e3, Bb4+ Line": "퀸스 인디언 디펜스, e3, Bb4+ 라인", "Queen's Pawn Game": "퀸스 폰 게임",
    "Queen's Pawn, Mengarini Attack": "퀸스 폰, 멘가리니 어택", "Rapport-Jobava System": "라포트-조바바 시스템",
    "Rapport-Jobava System, with e6": "라포트-조바바 시스템, e6", "Rat Defense": "랫 디펜스",
    "Richter-Veresov Attack": "리히터-베레소프 어택", "Robatsch Defense": "로바치 디펜스", "Rubinstein Opening": "루빈스타인 오프닝",
    "Ruy Lopez": "루이 로페즈", "Réti Opening": "레티 오프닝", "Saragossa Opening": "사라고사 오프닝",
    "Scandinavian Defense": "스칸디나비안 디펜스", "Scotch Game": "스카치 게임", "Semi-Slav Defense": "세미 슬라브 디펜스",
    "Semi-Slav Defense Accepted": "세미 슬라브 디펜스 수락", "Sicilian Defense": "시실리안 디펜스", "Slav Defense": "슬라브 디펜스",
    "Slav Indian": "슬라브 인디언", "Sodium Attack": "소듐 어택", "St. George Defense": "세인트 조지 디펜스",
    "Tarrasch Defense": "타라시 디펜스", "Three Knights Opening": "스리 나이츠 오프닝", "Torre Attack": "토레 어택",
    "Trompowsky Attack": "트롬포스키 어택", "Valencia Opening": "발렌시아 오프닝", "Van Geet Opening": "반 헤트 오프닝",
    "Van't Kruijs Opening": "반트 크라위스 오프닝", "Vienna Gambit, with Max Lange Defense": "비엔나 갬빗, 막스 랑게 디펜스",
    "Vienna Game": "비엔나 게임", "Vulture Defense": "벌처 디펜스", "Wade Defense": "웨이드 디펜스", "Ware Defense": "웨어 디펜스",
    "Ware Opening": "웨어 오프닝", "Yusupov-Rubinstein System": "유수포프-루빈스타인 시스템", "Zaire Defense": "자이르 디펜스",
    "Zukertort Defense": "주커토르트 디펜스", "Zukertort Opening": "주커토르트 오프닝",
}

# 변화 이름 안의 고유 이름·말(긴 것부터 바꾼다)
PHRASE = {
    "Giuoco Pianissimo": "지우오코 피아니시모", "Giuoco Piano": "지우오코 피아노", "Two Knights Defense": "투 나이츠 디펜스",
    "Fried Liver Attack": "프라이드 리버 어택", "Anti-Fried Liver Defense": "안티 프라이드 리버 디펜스",
    "Knight Attack": "나이트 공격", "Traxler Counterattack": "트랙슬러 카운터어택", "Evans Gambit": "에반스 갬빗",
    "Modern Bishop's Opening": "모던 비숍스 오프닝", "Italian Four Knights Variation": "이탈리안 포 나이츠 변화",
    "Morphy Defense": "모피 디펜스", "Berlin Defense": "베를린 디펜스", "Steinitz Defense": "슈타이니츠 디펜스",
    "Marshall Attack": "마셜 어택", "Marshall Defense": "마셜 디펜스", "Closed Variation": "클로즈드 변화",
    "Najdorf Variation": "나이도르프 변화", "Hyperaccelerated Dragon": "초가속 드래곤", "Accelerated Dragon": "가속 드래곤",
    "Dragon Variation": "드래곤 변화", "Yugoslav Attack": "유고슬라브 어택", "Sveshnikov Variation": "스베시니코프 변화",
    "Taimanov Variation": "타이마노프 변화", "Kan Variation": "칸 변화", "Scheveningen Variation": "셰베닝겐 변화",
    "Nyezhmetdinov-Rossolimo Attack": "녜즈메트디노프-로솔리모 어택", "Rossolimo": "로솔리모",
    "Smith-Morra Gambit Accepted": "스미스-모라 갬빗 수락", "Smith-Morra Gambit": "스미스-모라 갬빗",
    "Alapin Variation": "알라핀 변화", "Grand Prix Attack": "그랑프리 어택", "Bowdler Attack": "보들러 어택",
    "McDonnell Attack": "맥도넬 어택", "Old Sicilian": "올드 시실리안", "Modern Variations": "모던 변화",
    "French Variation": "프렌치 변화", "Löwenthal Variation": "뢰벤탈 변화", "English Attack": "잉글리시 어택",
    "Advance Variation": "어드밴스 변화", "Exchange Variation": "익스체인지 변화", "Tarrasch Variation": "타라시 변화",
    "Winawer Variation": "위나워 변화", "Rubinstein Variation": "루빈스타인 변화", "Classical Variation": "클래시컬 변화",
    "Paulsen Variation": "파울센 변화", "Paulsen Attack": "파울센 어택", "Nimzowitsch System": "님조비치 시스템",
    "Knight Variation": "나이트 변화", "Franco-Sicilian Defense": "프랑코-시실리안 디펜스", "King's Indian Attack": "킹스 인디언 어택",
    "La Bourdonnais Variation": "라 부르도네 변화", "Panov Attack": "파노프 어택", "Short Variation": "쇼트 변화",
    "Botvinnik-Carls Defense": "보트비닉-칼스 디펜스", "Fantasy Variation": "판타지 변화", "Two Knights Attack": "투 나이츠 공격",
    "Hillbilly Attack": "힐빌리 어택", "Mieses-Kotrč Variation": "미제스-코트르치 변화", "Valencian Variation": "발렌시안 변화",
    "Modern Variation": "모던 변화", "Max Lange Defense": "막스 랑게 디펜스", "Falkbeer Variation": "팔크베어 변화",
    "Stanley Variation": "스탠리 변화", "Vienna Gambit": "비엔나 갬빗", "Three Knights Variation": "스리 나이츠 변화",
    "Scotch Gambit": "스카치 갬빗", "Lolli Variation": "롤리 변화", "Dubois Réti Defense": "뒤부아 레티 디펜스",
    "Jaenisch Counterattack": "예니시 카운터어택", "Damiano Defense": "다미아노 디펜스", "McConnell Defense": "맥코넬 디펜스",
    "Busch-Gass Gambit": "부시-가스 갬빗", "Leonardis Variation": "레오나르디스 변화", "Wayward Queen Attack": "웨이워드 퀸 어택",
    "Napoleon Attack": "나폴레옹 어택", "MacLeod Attack": "맥러드 어택", "MacLeod Defense": "맥러드 디펜스",
    "King's Knight's Gambit": "킹스 나이츠 갬빗", "Queen's Knight Defense": "퀸스 나이트 디펜스", "Kieseritzky Variation": "키제리츠키 변화",
    "Spanish Variation": "스패니시 변화", "Scotch Variation Accepted": "스카치 변화 수락", "Scotch Variation": "스카치 변화",
    "Italian Variation": "이탈리안 변화", "Boi Variation": "보이 변화", "Accelerated London System": "가속 런던 시스템",
    "London System": "런던 시스템", "Zukertort Variation": "주커토르트 변화", "Chigorin Variation": "치고린 변화",
    "Colle System": "콜레 시스템", "Levitsky Attack": "레비츠키 어택", "Symmetrical Variation": "대칭 변화",
    "Queen's Knight Variation": "퀸스 나이트 변화", "Normal Defense": "노멀 디펜스", "Saduleto Variation": "사둘레토 변화",
    "Old Variation": "올드 변화", "Accelerated Move Order": "가속 수순", "Anti-Nimzo-Indian": "안티 님조 인디언",
    "West Indian Defense": "웨스트 인디언 디펜스", "Knights Variation": "나이츠 변화", "Old Benoni": "올드 베노니",
    "Hartlaub-Charlick Gambit": "하르트라우프-찰릭 갬빗", "Reversed French": "역 프렌치", "Small Center Defense": "스몰 센터 디펜스",
    "Maróczy Defense": "마로치 디펜스", "Kennedy Variation": "케네디 변화", "Linksspringer Variation": "링크스슈프링어 변화",
    "Declined Variation": "거절 변화", "Black Mustang Defense": "블랙 머스탱 디펜스", "Sicilian Invitation": "시실리안 초대",
    "Queen's Gambit Invitation": "퀸스 갬빗 초대", "Tennison Gambit": "테니슨 갬빗", "King's English Variation": "킹스 잉글리시 변화",
    "Reversed Sicilian": "역 시실리안", "Anglo-Indian Defense": "앵글로 인디언 디펜스", "Anglo-Scandinavian Defense": "앵글로 스칸디나비안 디펜스",
    "Agincourt Defense": "아쟁쿠르 디펜스", "Caro-Kann Defensive System": "카로칸 방어 체계", "Two Knights Variation": "투 나이츠 변화",
    "Samisch Variation": "재미시 변화", "Sämisch Variation": "재미시 변화", "Averbakh Variation": "아베르바흐 변화",
    "Fianchetto Variation": "피앙케토 변화", "Petrosian Variation": "페트로시안 변화", "Rubinstein Defense": "루빈스타인 디펜스",
    "Austrian Attack": "오스트리안 어택", "Four Pawns Attack": "포 폰스 어택", "Main Line": "메인 라인",
    "Normal Variation": "노멀 변화", "Open": "오픈", "Closed": "클로즈드", "Traditional": "전통", "Classical": "클래시컬",
    "Exchange": "익스체인지", "Modern": "모던", "Normal": "노멀", "Accepted": "수락", "Declined": "거절",
    # 2026-11-04 해설 늘리며 더함
    "Three Knights": "스리 나이츠", "Four Knights Variation": "포 나이츠 변화", "Four Knights": "포 나이츠", "Two Knights": "투 나이츠",
    "Scandinavian": "스칸디나비안", "Steinitz": "슈타이니츠", "Dutch": "더치", "Falkbeer Countergambit": "팔크베어 카운터갬빗", "Falkbeer": "팔크베어",
    "Queen's Knight": "퀸스 나이트", "Stafford Gambit": "스태퍼드 갬빗", "Chigorin": "치고린", "Budapest": "부다페스트", "Delayed": "지연",
    "Accelerated": "가속", "Polerio": "폴레리오", "Standard": "스탠더드", "Marshall": "마셜", "Central": "센트럴", "Albin": "알빈",
    "O'Kelly": "오켈리", "Anderssen": "안데르센", "Nimzowitsch": "님조비치", "Greco": "그레코", "Sicilian": "시실리안", "Göring": "괴링",
    "Vienna Hybrid": "비엔나 하이브리드", "Wing Gambit": "윙 갬빗", "Baltic": "발틱", "Tartakower": "타르타코버", "Maróczy": "마로치", "Benoni": "베노니",
    "Indian": "인디언", "Old Indian": "올드 인디언", "Queen's Indian": "퀸스 인디언", "King's Indian": "킹스 인디언", "Benoni-Indian": "베노니-인디언",
    "Spielmann-Indian": "슈필만-인디언", "Czech-Indian": "체코-인디언", "Pirc Invitation": "피르츠 초대", "Slav Invitation": "슬라브 초대",
    "Paulsen": "파울센", "Moscow": "모스크바", "Cozio": "코치오", "Hungarian": "헝가리안", "Two Pawns Attack": "투 폰스 어택", "Breyer": "브레이어",
    "Great Snake": "그레이트 스네이크", "Blackburne": "블랙번", "Big Center": "빅 센터", "Center": "센터", "King's Gambit Reversed": "역 킹스 갬빗",
    "Botvinnik System Reversed": "역 보트비닉 시스템", "Botvinnik System": "보트비닉 시스템", "Botvinnik": "보트비닉", "Reversed": "역",
    "Mieses": "미제스", "Rat": "랫", "Quiet": "조용한", "Wade-Tartakower": "웨이드-타르타코버", "Wade-Smyslov": "웨이드-스미슬로프", "Rousseau": "루소",
    "Schmidt": "슈미트", "Barmen": "바르멘", "Positional": "포지셔널", "Krause": "크라우제", "Lasker-Pelikan": "라스커-펠리칸", "Lasker": "라스커",
    "Damiano": "다미아노", "Bird": "버드", "Kingside Fianchetto": "킹 쪽 피앙케토", "Double Fianchetto": "이중 피앙케토", "Morphy": "모피",
    "Bishop Check": "비숍 체크", "Rare Defenses": "드문 디펜스", "The Whale": "더 웨일", "Chelyabinsk": "첼랴빈스크", "Sveshnikov": "스베시니코프",
    "Bogoljubow": "보골류보프", "Fajarowicz": "파야로비치", "Lithuanian": "리투아니아", "Cannstatter": "칸슈타터", "Adler": "아들러", "Alekhine": "알레힌",
    "Kasparov": "카스파로프", "Petrosian": "페트로시안", "Stockholm": "스톡홀름", "Brinckmann": "브링크만", "Russian": "러시안", "Czech": "체코",
    "Ukrainian": "우크라이나", "Yugoslav": "유고슬라브", "Grünfeld": "그륀펠트", "Smyslov": "스미슬로프", "Pawn Storm": "폰 스톰", "Taimanov": "타이마노프",
    "Fully Accepted": "완전 수락", "Pawn Return": "폰 돌려주기", "From's Gambit": "프롬 갬빗", "Williams Gambit": "윌리엄스 갬빗",
    "Grob Gambit": "그롭 갬빗", "Fritz Gambit": "프리츠 갬빗", "Bugayev": "부가예프", "Outflank": "아웃플랭크", "Dunst-Perrenet": "둔스트-페레넷",
    "Hammerschlag": "하머슐라크", "Benoni Gambit": "베노니 갬빗", "Pseudo-Benko": "유사 벤코", "Omega Gambit": "오메가 갬빗", "Seirawan": "세이라완",
    "Check Variation": "체크 변화", "Intermezzo": "인터메초", "Slav Formation": "슬라브 포메이션", "Catalan Formation": "카탈란 포메이션",
    "Formation": "포메이션", "Keres": "케레스", "Sokolsky": "소콜스키", "Birmingham": "버밍엄", "Zukertort": "주커토르트", "English": "잉글리시",
    "Spike": "스파이크", "Graz": "그라츠", "Polish": "폴리시", "Original Defense": "오리지널 디펜스", "Paris": "파리", "Anti-Torre": "안티 토레",
    "Torre": "토레", "Cochrane": "코크레인", "Hanham": "핸험", "Panov": "파노프", "Carlsbad": "카를스바트", "Ragozin": "라고진",
    "Semi-Tarrasch": "세미 타라시", "Tarrasch": "타라시", "Schara": "샤라", "Swedish": "스웨디시", "Lemberger": "렘베르거", "Teichmann": "타이히만",
    "Euwe": "에이베", "Ziegler": "치글러", "Colle": "콜레", "Stonewall": "스톤월",
}
WORD = {"Variation": "변화", "Defense": "디펜스", "Attack": "어택", "Gambit": "갬빗", "System": "시스템", "Line": "라인",
        "Opening": "오프닝", "Game": "게임", "Countergambit": "카운터갬빗", "Counterattack": "카운터어택", "with": ""}

_PH = sorted(PHRASE.items(), key=lambda kv: -len(kv[0]))


def ko_name(name):
    fam, sep, rest = name.partition(': ')
    k = FAMILY.get(fam)
    if k is None:
        # "Sicilian Defense, ..."처럼 쉼표로 붙은 갈래
        base, _, tail = fam.partition(', ')
        k = FAMILY.get(base, fam) + (', ' + tail if tail else '')
    if not sep:
        return k
    parts = []
    for part in rest.split(', '):
        p = part
        for en, ko in _PH:
            if en in p:   # 낱말 경계로만 바꾼다("Open"이 "Opening" 안에서 바뀌지 않게)
                p = re.sub(r"(?<![A-Za-zÀ-ž'])" + re.escape(en) + r"(?![A-Za-zÀ-ž])", ko, p)
        p = ' '.join(WORD.get(w, w) for w in p.split(' ')).strip()
        p = ' '.join(p.split())
        parts.append(p)
    return k + ': ' + ', '.join(x for x in parts if x)
