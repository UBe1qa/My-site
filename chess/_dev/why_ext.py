"""수마다 이유 2: 메인라인(main_lines.py)에서 주요 수순 뒤에 잇는 수. reasons.py가 읽어 WHY에 합친다.
X(slug, 시작 반수, (영어, 한국어), ...) = 그 메인라인의 시작 반수부터 끝까지 수마다 한 줄. 직접 쓴 글."""
from main_lines import MAIN

W = {}


def X(slug, start, *rs):
    s = MAIN[slug].split()
    assert start - 1 + len(rs) == len(s), (slug, start, len(rs), len(s))
    for i, r in enumerate(rs):
        W.setdefault(' '.join(s[:start + i]), r)


# ---------------------------------------------------------------- 1.e4 e5
X('italian-game', 7,
  ("Prepares d4, so that White can build a full pawn center.", "d4를 준비해 폰으로 중앙을 꽉 채우려 해요."),
  ("Develops with an attack on e4 and keeps an eye on d4.", "e4를 치며 전개하고 d4도 지켜봐요."),
  ("Protects e4 calmly; the d4 push is kept for later.", "e4를 차분히 지켜요. d4는 나중으로 미뤄요."),
  ("Supports e5 and opens the c8 bishop.", "e5를 받치고 c8 비숍 길을 열어요."),
  ("Castles; the king is safe and the rook can come to e1.", "캐슬링해요. 킹이 안전해지고 룩이 e1로 갈 수 있어요."),
  ("Black castles too; both kings are safe and the slow maneuvering starts.", "흑도 캐슬링해요. 양쪽 킹이 안전하고 느린 기물 돌리기가 시작돼요."),
  ("Puts the rook behind the e-pawn and prepares Nbd2–f1.", "룩을 e폰 뒤에 두고 Nbd2–f1을 준비해요."),
  ("Grabs space on the queenside and stops b4, so the c5 bishop has a safe home.", "퀸 쪽 공간을 잡고 b4를 막아, c5 비숍이 편히 있게 해요."),
  ("Takes g4 from the black pieces before the knight starts its trip.", "나이트가 움직이기 전에 흑 기물이 g4로 못 오게 해요."),
  ("Takes g5 from White’s pieces in the same way.", "흑도 똑같이 백 기물이 g5로 못 오게 해요."))

X('ruy-lopez', 6,
  ("Asks the bishop at once whether it wants to take on c6 or retreat.", "비숍에게 바로 c6를 잡을지 물러날지 물어요."),
  ("Keeps the bishop and the pin on the c6 knight; taking on c6 is the Exchange Variation.", "비숍을 지키며 c6 나이트 압박을 이어요. c6를 잡으면 익스체인지 변화예요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Castles: e4 can be left hanging, because ...Nxe4 runs into Re1.", "캐슬링해요. ...Nxe4는 Re1에 걸리므로 e4를 그냥 둬도 돼요."),
  ("Develops quietly and prepares to castle; this is the Closed Ruy Lopez.", "조용히 전개하고 캐슬링을 준비해요. 클로즈드 루이 로페즈예요."),
  ("Defends e4 for real, so the threat Bxc6 and Nxe5 is now on.", "이제 e4를 지켜요. 그래서 Bxc6 뒤 Nxe5가 진짜 위협이 돼요."),
  ("Chases the bishop away to end the pressure on c6 for good.", "비숍을 쫓아 c6 압박을 아예 끝내요."),
  ("The bishop drops back to b3 and still aims at f7.", "비숍이 b3로 물러나도 여전히 f7을 겨눠요."),
  ("Supports e5 and opens the c8 bishop.", "e5를 받치고 c8 비숍 길을 열어요."),
  ("Prepares d4 and keeps a retreat on c2 for the bishop.", "d4를 준비하고 비숍이 c2로 물러날 길을 만들어요."),
  ("Black castles; ...Na5 or ...Bb7 come next.", "흑이 캐슬링해요. 다음은 ...Na5나 ...Bb7이에요."),
  ("Stops ...Bg4, so that d4 can follow without a pin on the f3 knight.", "...Bg4를 막아, f3 나이트가 묶이지 않은 채 d4를 둘 수 있게 해요."))

X('scotch-game', 6,
  ("Takes the pawn; holding e5 with ...d6 would be passive.", "폰을 잡아요. ...d6로 e5를 붙잡으면 수동적이에요."),
  ("Recaptures with the knight, now strong on d4.", "나이트로 다시 잡아 d4에 단단히 세워요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Trades knights so that e5 comes with tempo.", "나이트를 바꿔 다음에 e5를 시간을 벌며 둬요."),
  ("Recaptures toward the center; Black gets the b-file and a strong d-pawn later.", "중앙 쪽으로 다시 잡아요. 흑은 b파일과 나중에 강한 d폰을 얻어요."),
  ("Kicks the f6 knight and grabs space.", "f6 나이트를 쫓고 공간을 잡아요."),
  ("Pins the e5 pawn to the white king so the knight is safe on d5.", "e5 폰을 백 킹 앞에 묶어 나이트가 d5에 안전하게 해요."),
  ("Protects e5 and unpins it, with the queen opposite Black’s.", "e5를 지키고 묶임을 풀어요. 퀸끼리 마주 봐요."),
  ("The knight jumps to a fine central square.", "나이트가 좋은 중앙 칸으로 뛰어요."),
  ("Kicks the knight again and gains space.", "나이트를 또 쫓고 공간을 얻어요."),
  ("Pins the c4 pawn against the queen on e2.", "c4 폰을 e2 퀸 앞에 묶어요."))

X('petrovs-defense', 5,
  ("Takes the pawn; White is a pawn up for a moment.", "폰을 잡아요. 잠시 백이 폰 하나를 더 가져요."),
  ("Kicks the knight before taking back on e4; 3...Nxe4? 4.Qe2 is bad for Black.", "e4를 되찾기 전에 나이트부터 쫓아요. 바로 3...Nxe4?는 4.Qe2로 흑이 나빠요."),
  ("Retreats to a safe square, keeping the knight out of trouble.", "나이트를 안전한 칸으로 물려요."),
  ("Wins back the pawn; material is level.", "폰을 되찾아 기물이 같아져요."),
  ("Takes the center and plans to chase the e4 knight.", "중앙을 잡고 e4 나이트를 쫓을 준비를 해요."),
  ("Supports the e4 knight with a pawn.", "폰으로 e4 나이트를 받쳐요."),
  ("Develops toward the e4 knight and the black king.", "e4 나이트와 흑 킹 쪽을 향해 전개해요."),
  ("Develops the bishop and prepares to castle.", "비숍을 꺼내고 캐슬링을 준비해요."),
  ("Castles; c4 will hit d5 next.", "캐슬링해요. 다음은 c4로 d5를 쳐요."),
  ("Black castles too.", "흑도 캐슬링해요."),
  ("Attacks d5, the pawn that holds the e4 knight.", "e4 나이트를 받치는 d5 폰을 쳐요."),
  ("Holds d5 with another pawn.", "다른 폰으로 d5를 지켜요."))

X('philidor-defense', 5,
  ("Strikes at e5 at once before Black can hold it with ...Nd7.", "흑이 ...Nd7로 지키기 전에 바로 e5를 쳐요."),
  ("Gives up the center but frees the pieces.", "중앙을 내주는 대신 기물이 자유로워져요."),
  ("Recaptures with the knight in the center.", "나이트로 다시 잡아 중앙에 세워요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Defends e4 and develops.", "e4를 지키며 전개해요."),
  ("Develops and prepares to castle.", "전개하고 캐슬링을 준비해요."),
  ("Prepares Bg2, where the bishop protects e4 and the king.", "Bg2를 준비해요. 비숍이 e4와 킹을 지켜요."),
  ("Castles to safety.", "캐슬링해 킹을 지켜요."),
  ("The bishop takes the long diagonal.", "비숍이 긴 대각선에 서요."),
  ("Puts the rook on the half-open e-file against e4.", "반쯤 열린 e파일에 룩을 둬 e4를 겨눠요."),
  ("Castles.", "캐슬링해요."),
  ("Brings the bishop back to f8 to guard the king and free e7.", "비숍을 f8로 물려 킹을 지키고 e7을 비워요."))

X('vienna-game', 4,
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Aims the bishop at f7 and leaves f4 for later.", "비숍으로 f7을 겨누고 f4는 나중으로 미뤄요."),
  ("Defends e5 and develops.", "e5를 지키며 전개해요."),
  ("Protects e4 and opens the c1 bishop.", "e4를 지키고 c1 비숍 길을 열어요."),
  ("Goes after the strong c4 bishop.", "강한 c4 비숍을 쫓아가요."),
  ("Keeps the bishop on the a2–g8 diagonal.", "비숍을 a2–g8 대각선에 남겨요."),
  ("Takes the bishop: Black gets the bishop pair.", "비숍을 잡아요. 흑이 비숍 두 개를 가져요."),
  ("Recaptures toward the center and opens the a-file for the rook.", "중앙 쪽으로 다시 잡고 룩에게 a파일을 열어 줘요."),
  ("Frees the game with the central break.", "중앙을 밀어 판을 풀어요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Recaptures with the knight in the center.", "나이트로 다시 잡아 중앙에 세워요."),
  ("Develops and hits e5.", "전개하며 e5를 쳐요."))

X('kings-gambit', 4,
  ("Accepts the gambit; Black is a pawn up and may try to keep it with ...g5.", "갬빗을 받아요. 흑이 폰 하나를 더 가지고 ...g5로 지키려 할 수 있어요."),
  ("Develops and stops ...Qh4+.", "전개하면서 ...Qh4+를 막아요."),
  ("Protects the f4 pawn with another pawn.", "다른 폰으로 f4 폰을 지켜요."),
  ("Undermines the g5 pawn at once.", "바로 g5 폰 밑을 흔들어요."),
  ("Pushes past with tempo on the knight.", "나이트를 치며 밀고 나가요."),
  ("The knight jumps to e5, the Kieseritzky Gambit, eyeing f7 and g4.", "나이트가 e5로 뛰어요(키저리츠키 갬빗). f7과 g4를 노려요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Develops and aims at f7.", "전개하며 f7을 겨눠요."),
  ("Opens the bishop’s diagonal and gives the pawn back for activity.", "비숍 길을 열고, 활동성을 위해 폰을 돌려줘요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Develops and hits the e5 knight.", "전개하며 e5 나이트를 쳐요."))

X('four-knights-game', 7,
  ("Opens the center: the Scotch Four Knights.", "중앙을 열어요. 스카치 포 나이츠예요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Recaptures with the knight in the center.", "나이트로 다시 잡아 중앙에 세워요."),
  ("Pins the c3 knight so e4 is weaker.", "c3 나이트를 묶어 e4를 약하게 만들어요."),
  ("Trades on c6 to damage Black’s pawns.", "c6에서 바꿔 흑 폰 모양을 흔들어요."),
  ("Recaptures toward the center.", "중앙 쪽으로 다시 잡아요."),
  ("Protects e4 and prepares to castle.", "e4를 지키고 캐슬링을 준비해요."),
  ("Frees the game in the center.", "중앙을 밀어 판을 풀어요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Castles and gives the pawn back for fast development.", "캐슬링하며 폰을 돌려주고 빠르게 전개해요."),
  ("Castles too.", "백도 캐슬링해요."),
  ("Wins back the pawn with a pawn on d5.", "d5 폰으로 되찾아요."))

X('bishops-opening', 4,
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Protects e4 quietly.", "조용히 e4를 지켜요."),
  ("Prepares ...d5 to grab the center.", "...d5를 준비해 중앙을 잡으려 해요."),
  ("Develops and hits e5.", "전개하며 e5를 쳐요."),
  ("Takes the center and hits the bishop.", "중앙을 잡고 비숍을 쳐요."),
  ("Keeps the bishop on its diagonal.", "비숍을 같은 대각선에 남겨요."),
  ("A check that develops the bishop.", "체크하며 비숍을 꺼내요."),
  ("Blocks with a bishop and offers a trade.", "비숍으로 막으며 바꾸자고 해요."))

X('center-game', 5,
  ("Recaptures with the queen, which stands in the center for now.", "퀸으로 다시 잡아요. 퀸이 잠시 중앙에 서요."),
  ("Develops with an attack on the queen.", "퀸을 치며 전개해요."),
  ("The queen steps to e3, away from the knight.", "퀸이 나이트를 피해 e3로 가요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Defends e4.", "e4를 지켜요."),
  ("Pins the knight and adds pressure on e4.", "나이트를 묶고 e4를 더 눌러요."),
  ("Unpins the knight.", "나이트 묶임을 풀어요."),
  ("Castles; the rook will come to e8 against e4.", "캐슬링해요. 룩이 e8로 와 e4를 겨눠요."),
  ("Castles long, ready for a race of attacks.", "반대쪽으로 캐슬링해 공격 경쟁을 준비해요."),
  ("Puts the rook on the e-file against e4.", "룩을 e파일에 둬 e4를 겨눠요."),
  ("Develops the last minor piece and eyes f7.", "남은 비숍을 꺼내 f7을 겨눠요."),
  ("Opens the c8 bishop and takes e5 from White.", "c8 비숍 길을 열고 백이 e5에 못 오게 해요."))

X('two-knights-defense', 7,
  ("Attacks f7 with two pieces at once.", "두 기물로 한꺼번에 f7을 쳐요."),
  ("Blocks the bishop’s path to f7.", "비숍이 f7로 가는 길을 막아요."),
  ("Takes the pawn and opens the bishop again.", "폰을 잡아 비숍 길을 다시 열어요."),
  ("Hits the bishop; 5...Nxd5? lets White hit f7 with Nxf7 or d4.", "비숍을 쳐요. 5...Nxd5?는 Nxf7이나 d4로 f7이 위험해요."),
  ("Moves the bishop with check.", "체크하며 비숍을 옮겨요."),
  ("Blocks and offers a pawn for fast development.", "막으면서 폰을 줘 빨리 전개해요."),
  ("Takes the second pawn.", "두 번째 폰을 잡아요."),
  ("Recaptures and hits the bishop.", "다시 잡으며 비숍을 쳐요."),
  ("The bishop drops back to safety.", "비숍이 안전하게 물러나요."),
  ("Chases the g5 knight away.", "g5 나이트를 쫓아내요."),
  ("The knight goes back to f3.", "나이트가 f3로 돌아가요."),
  ("Hits the knight again and grabs space.", "나이트를 다시 치며 공간을 잡아요."),
  ("The knight goes to e5, the best square left.", "나이트가 남은 칸 가운데 가장 좋은 e5로 가요."))

X('evans-gambit', 8,
  ("Takes the pawn.", "폰을 잡아요."),
  ("Hits the bishop and prepares d4.", "비숍을 치고 d4를 준비해요."),
  ("The bishop goes to a5, where it pins c3 after d4.", "비숍이 a5로 가요. d4 뒤에는 c3를 묶어요."),
  ("Opens the center while Black is behind in development.", "흑 전개가 늦은 틈에 중앙을 열어요."),
  ("Takes another pawn.", "폰을 하나 더 잡아요."),
  ("Castles and gives even more for a fast attack.", "캐슬링하며 더 내주고 빠르게 공격해요."))

X('ponziani-opening', 6,
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Opens the center with pawn support from c3.", "c3 폰이 받쳐 주는 채로 중앙을 열어요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Kicks the f6 knight.", "f6 나이트를 쫓아요."),
  ("The knight jumps to the center.", "나이트가 중앙으로 뛰어요."),
  ("Takes back the pawn and builds a center.", "폰을 되찾아 중앙을 쌓아요."),
  ("Check, to trade the bishop.", "체크해서 비숍을 바꾸려 해요."),
  ("Blocks with the bishop.", "비숍으로 막아요."),
  ("Trades bishops.", "비숍을 바꿔요."),
  ("Recaptures and develops.", "다시 잡으며 전개해요."),
  ("Castles.", "캐슬링해요."))

X('elephant-gambit', 5,
  ("Takes the pawn and attacks nothing yet, but is a pawn up.", "폰을 잡아요. 당장 치는 것은 없지만 폰 하나를 더 가져요."),
  ("Kicks the knight and grabs space.", "나이트를 쫓으며 공간을 잡아요."),
  ("Pins the e4 pawn so the knight can stay.", "e4 폰을 묶어 나이트가 머물 수 있게 해요."),
  ("Defends e4 and develops.", "e4를 지키며 전개해요."),
  ("Undermines e4.", "e4 밑을 흔들어요."),
  ("Wins back a pawn.", "폰 하나를 되찾아요."),
  ("Develops with tempo on the queen.", "퀸을 치며 전개해요."),
  ("Pins the knight.", "나이트를 묶어요."))

X('latvian-gambit', 5,
  ("Takes e5 and threatens Qh5+.", "e5를 잡고 Qh5+를 노려요."),
  ("Hits the knight and covers h5.", "나이트를 치고 h5를 막아요."),
  ("Protects the knight with a pawn and takes the center.", "폰으로 나이트를 지키고 중앙을 잡아요."),
  ("Kicks the knight away.", "나이트를 쫓아내요."),
  ("The knight retreats to c4, a safe square.", "나이트가 안전한 c4로 물러나요."),
  ("Takes the e4 pawn.", "e4 폰을 잡아요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("The queen protects e4 from g6.", "퀸이 g6에서 e4를 지켜요."))

X('damiano-defense', 5,
  ("Takes the pawn anyway: 3...fxe5? 4.Qh5+ wins for White.", "그래도 폰을 잡아요. 3...fxe5?는 4.Qh5+로 백이 이겨요."),
  ("Hits the knight instead of taking it.", "나이트를 잡지 않고 쳐요."),
  ("The knight goes back home.", "나이트가 제자리로 돌아가요."),
  ("Wins back the pawn with check.", "체크하며 폰을 되찾아요."),
  ("Blocks the check; White is ahead in development.", "체크를 막아요. 백 전개가 앞서요."))

X('wayward-queen-attack', 4,
  ("Defends e5 with a piece.", "기물로 e5를 지켜요."),
  ("Adds a second attacker on f7, threatening Qxf7 mate.", "f7을 두 번째로 노려 Qxf7 메이트를 위협해요."),
  ("Blocks the queen’s path to f7.", "퀸이 f7로 오는 길을 막아요."),
  ("Renews the threat on f7.", "다시 f7을 노려요."),
  ("Develops and covers f7.", "전개하며 f7을 막아요."),
  ("Develops so that f3 stays free for the queen.", "f3를 퀸에게 남기며 전개해요."),
  ("The bishop takes the long diagonal.", "비숍이 긴 대각선에 서요."),
  ("Develops the last knight.", "남은 나이트를 꺼내요."),
  ("Castles: Black is fine.", "캐슬링해요. 흑이 괜찮아요."))

X('berlin-defense', 7,
  ("Castles and lets Black take e4.", "캐슬링하며 흑이 e4를 잡게 둬요."),
  ("Takes the pawn.", "폰을 잡아요."),
  ("Opens the center to make use of the black king in the middle.", "흑 킹이 가운데 있는 틈에 중앙을 열어요."),
  ("Hits the bishop and keeps an eye on e5.", "비숍을 치며 e5도 지켜봐요."),
  ("Trades the bishop before it is lost.", "비숍을 잃기 전에 바꿔요."),
  ("Recaptures toward the center and opens the c8 bishop.", "중앙 쪽으로 다시 잡고 c8 비숍 길을 열어요."),
  ("Takes the pawn and hits the knight.", "폰을 잡으며 나이트를 쳐요."),
  ("The knight goes to f5.", "나이트가 f5로 가요."),
  ("Trades queens; this is the famous Berlin endgame.", "퀸을 바꿔요. 유명한 베를린 엔드게임이에요."),
  ("The king recaptures: no castling, but no queens and two bishops.", "킹으로 다시 잡아요. 캐슬링은 못 하지만 퀸이 없고 비숍이 둘이에요."))

# ---------------------------------------------------------------- 시실리안
X('sicilian-najdorf', 11,
  ("Develops and prepares Qd2 and f3: the English Attack.", "전개하며 Qd2·f3를 준비해요. 잉글리시 어택이에요."),
  ("Kicks the d4 knight and takes space; d5 becomes the key square.", "d4 나이트를 쫓고 공간을 잡아요. d5가 핵심 칸이 돼요."),
  ("The knight steps back to b3, out of the way.", "나이트가 비켜 b3로 물러나요."),
  ("Covers d5 with the bishop.", "비숍으로 d5를 막아요."),
  ("Stops ...Ng4 and prepares g4.", "...Ng4를 막고 g4를 준비해요."),
  ("Develops and prepares to castle.", "전개하고 캐슬링을 준비해요."),
  ("Connects and prepares to castle long.", "기물을 잇고 반대쪽 캐슬링을 준비해요."),
  ("Castles short.", "짧게 캐슬링해요."),
  ("Castles long: both sides will race to attack the other king.", "길게 캐슬링해요. 서로 상대 킹을 먼저 치려는 경쟁이에요."),
  ("Develops and prepares ...b5.", "전개하며 ...b5를 준비해요."))

X('sicilian-dragon', 11,
  ("Develops and prepares Qd2 and Bh6.", "전개하며 Qd2·Bh6를 준비해요."),
  ("The Dragon bishop takes the long diagonal.", "드래곤 비숍이 긴 대각선에 서요."),
  ("Stops ...Ng4 and prepares g4: the Yugoslav Attack.", "...Ng4를 막고 g4를 준비해요. 유고슬라브 어택이에요."),
  ("Castles.", "캐슬링해요."),
  ("Prepares Bh6 to trade the Dragon bishop.", "Bh6로 드래곤 비숍을 바꿀 준비를 해요."),
  ("Develops and hits d4.", "전개하며 d4를 쳐요."),
  ("Castles long and plans h4–h5.", "길게 캐슬링하고 h4–h5를 노려요."),
  ("Breaks in the center at once to open lines toward White’s king.", "바로 중앙을 밀어 백 킹 쪽 길을 열어요."))

X('smith-morra-gambit', 6,
  ("Takes the second pawn.", "두 번째 폰을 잡아요."),
  ("Recaptures with the knight: two pawns down to one, but fast development.", "나이트로 다시 잡아요. 폰은 하나 모자라지만 전개가 빨라요."),
  ("Develops.", "전개해요."),
  ("Develops toward the center.", "중앙 쪽으로 전개해요."),
  ("Covers e5 and opens the bishop.", "e5를 막고 비숍 길을 열어요."),
  ("Aims at f7 and the e6 square.", "f7과 e6 칸을 겨눠요."),
  ("Closes the bishop’s diagonal and covers d5.", "비숍 대각선을 막고 d5를 지켜요."),
  ("Castles.", "캐슬링해요."),
  ("Develops.", "전개해요."),
  ("Prepares Rd1 against the d6 pawn.", "Rd1로 d6 폰을 겨눌 준비를 해요."),
  ("Develops and prepares to castle.", "전개하고 캐슬링을 준비해요."),
  ("Puts the rook on the open d-file, opposite the queen.", "열린 d파일에 룩을 둬 흑 퀸과 마주 봐요."))

X('alapin-sicilian', 4,
  ("Hits e4, which c3 no longer protects with a knight.", "e4를 쳐요. c3 때문에 나이트가 e4를 지킬 수 없어요."),
  ("Kicks the knight and grabs space.", "나이트를 쫓으며 공간을 잡아요."),
  ("The knight goes to d5; with the pawn on c3, no white knight can challenge it from c3.", "나이트가 d5로 가요. c3에 폰이 있어 백 나이트가 c3에서 그 칸을 다툴 수 없어요."),
  ("Develops.", "전개해요."),
  ("Hits the e5 pawn.", "e5 폰을 쳐요."),
  ("Builds the center.", "중앙을 쌓아요."),
  ("Trades the c-pawn.", "c폰을 바꿔요."),
  ("Recaptures with a pawn: White has a big center.", "폰으로 다시 잡아 백이 큰 중앙을 가져요."),
  ("Develops and hits d4 and e5.", "전개하며 d4·e5를 쳐요."),
  ("Hits the d5 knight.", "d5 나이트를 쳐요."),
  ("The knight hits the bishop.", "나이트가 비숍을 쳐요."),
  ("Pins the c6 knight.", "c6 나이트를 묶어요."),
  ("Takes e5.", "e5를 잡아요."))

X('sicilian-classical', 11,
  ("Pins the f6 knight: the Richter-Rauzer.", "f6 나이트를 묶어요(리히터-라우저)."),
  ("Unpins and keeps d5 covered.", "묶임에 대비하고 d5를 지켜요."),
  ("Prepares to castle long.", "반대쪽 캐슬링을 준비해요."),
  ("Prepares ...b5 and keeps the knight out of b5.", "...b5를 준비하고 나이트가 b5에 못 오게 해요."),
  ("Castles long, ready to attack d6.", "길게 캐슬링하며 d6를 노려요."),
  ("Develops and protects b5.", "전개하며 b5를 지켜요."))

X('sicilian-scheveningen', 11,
  ("Throws the g-pawn forward to kick the f6 knight: the Keres Attack.", "g폰을 올려 f6 나이트를 쫓아요(케레스 어택)."),
  ("Stops g5 for now.", "당장은 g5를 막아요."),
  ("Prepares g5 anyway.", "그래도 g5를 준비해요."),
  ("Develops and hits d4.", "전개하며 d4를 쳐요."),
  ("Supports g5 with the rook.", "룩으로 g5를 받쳐요."),
  ("Strikes in the center while White’s pieces are on the kingside.", "백 기물이 킹 쪽에 몰린 틈에 중앙을 쳐요."))

X('sicilian-sveshnikov', 11,
  ("The knight jumps to b5, eyeing d6.", "나이트가 b5로 뛰어 d6를 노려요."),
  ("Covers d6.", "d6를 막아요."),
  ("Pins the f6 knight to fight for d5.", "f6 나이트를 묶어 d5를 다퉈요."),
  ("Kicks the b5 knight.", "b5 나이트를 쫓아요."),
  ("The knight goes to a3, heading for c4 or c2.", "나이트가 a3로 가요. 다음은 c4나 c2예요."),
  ("Keeps the a3 knight out of c4.", "a3 나이트가 c4에 못 오게 해요."),
  ("The other knight lands on d5, the hole in Black’s camp.", "다른 나이트가 흑 진영의 구멍 d5에 앉아요."),
  ("Develops and challenges the g5 bishop.", "전개하며 g5 비숍에 맞서요."))

X('sicilian-taimanov', 9,
  ("Develops and covers d5 and b5.", "전개하며 d5·b5를 막아요."),
  ("The queen eyes e5 and h2 and keeps the d-pawn flexible.", "퀸이 e5와 h2를 노리고 d폰은 유연하게 남겨요."),
  ("Develops and prepares Qd2 or Qf3.", "전개하며 Qd2나 Qf3를 준비해요."),
  ("Takes b5 from the knight.", "나이트가 b5에 못 오게 해요."),
  ("The queen supports e4 and eyes f7.", "퀸이 e4를 받치고 f7을 노려요."),
  ("Develops.", "전개해요."),
  ("Castles long for a sharp game.", "날카로운 판을 위해 길게 캐슬링해요."),
  ("Hits the queen and heads for g4 or c4.", "퀸을 치며 g4나 c4를 노려요."))

X('sicilian-kan', 9,
  ("Protects e4 with the bishop and keeps c2–c4 possible.", "비숍으로 e4를 지키고 c2–c4를 남겨요."),
  ("Hits the d4 knight.", "d4 나이트를 쳐요."),
  ("The knight drops back to b3, hitting the bishop.", "나이트가 b3로 물러나며 비숍을 쳐요."),
  ("The bishop goes to a7, still aiming at f2.", "비숍이 a7로 가도 여전히 f2를 겨눠요."),
  ("Protects e4 and prepares to castle.", "e4를 지키고 캐슬링을 준비해요."),
  ("Develops the knight to e7 so the bishop’s diagonal stays open.", "비숍 대각선을 막지 않게 나이트를 e7로 꺼내요."))

X('closed-sicilian', 4,
  ("Develops and covers d4.", "전개하며 d4를 막아요."),
  ("Prepares Bg2 and keeps the center closed.", "Bg2를 준비하고 중앙을 닫아 둬요."),
  ("Black fianchettoes too.", "흑도 비숍을 세워요."),
  ("The bishop takes the long diagonal.", "비숍이 긴 대각선에 서요."),
  ("Black’s bishop does the same.", "흑 비숍도 똑같이 해요."),
  ("Keeps e4 protected and opens the c1 bishop.", "e4를 지키고 c1 비숍 길을 열어요."),
  ("Covers e5.", "e5를 막아요."),
  ("Prepares f5 and a kingside attack.", "f5와 킹 쪽 공격을 준비해요."),
  ("Prepares ...Nge7 so f5 can be met.", "...Nge7을 준비해 f5에 맞설 수 있게 해요."),
  ("Develops.", "전개해요."),
  ("Develops the knight behind the e6 pawn.", "e6 폰 뒤로 나이트를 꺼내요."),
  ("Castles.", "캐슬링해요."),
  ("Castles too.", "흑도 캐슬링해요."))

X('rossolimo-attack', 6,
  ("Prepares ...Nge7 so the c6 knight is supported.", "...Nge7을 준비해 c6 나이트를 받쳐요."),
  ("Castles.", "캐슬링해요."),
  ("Supports c6 with the other knight.", "다른 나이트로 c6를 받쳐요."),
  ("Puts the rook on the e-file and prepares d4.", "룩을 e파일에 두고 d4를 준비해요."),
  ("Asks the bishop to decide.", "비숍에게 정하라고 물어요."),
  ("The bishop drops back to f1, keeping it.", "비숍을 f1로 물려 남겨 둬요."),
  ("Takes the center.", "중앙을 잡아요."),
  ("Trades in the center.", "중앙에서 바꿔요."),
  ("Recaptures with the knight in the center.", "나이트로 다시 잡아 중앙에 세워요."))

X('moscow-variation', 6,
  ("Blocks the check with a bishop and offers a trade.", "비숍으로 체크를 막으며 바꾸자고 해요."),
  ("Trades bishops.", "비숍을 바꿔요."),
  ("Recaptures with the queen and keeps the knights flexible.", "퀸으로 다시 잡고 나이트는 유연하게 남겨요."),
  ("Castles.", "캐슬링해요."),
  ("Develops.", "전개해요."),
  ("Prepares d4 with a pawn recapture.", "폰으로 다시 잡을 수 있게 d4를 준비해요."),
  ("Develops with an attack on e4.", "e4를 치며 전개해요."),
  ("Defends e4 with the rook.", "룩으로 e4를 지켜요."),
  ("Opens the bishop and covers d5.", "비숍 길을 열고 d5를 지켜요."),
  ("Takes the center.", "중앙을 잡아요."))
