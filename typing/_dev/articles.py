"""토독 가이드 글(한국어 4편, 영어 3편). build.py 가 읽는다.
- 언어판마다 그 언어 검색에 맞게 따로 고른 주제다(번역이 아니다). '속도를 어떻게 계산하나' 한 쌍만 hreflang 으로 잇는다(pair).
- 글 속 예시 숫자·표는 표시(data-st, data-pm, data-wpm, data-acc, data-ok, data-ime, data-finger, data-hand, data-q)를 달아 두고
  tests/run.mjs 'guide' 묶음이 만든 HTML 을 읽어 로직(tj-core.js)으로 다시 계산해 대조한다. 숫자를 고치면 시험이 알려 준다.
- 공식 출처가 필요한 사실은 확인된 것만 쓴다: Dhakal 외(CHI 2018) 값은 논문에서 직접 확인한 범위(2026-10-10) 안에서만, 출처 링크와 확인한 날을 같이 싣는다.
  두벌식 표준 번호, 평균 타수, '몇 타면 빠른 편', 자격시험 기준, 다른 프로그램의 계산 방식, 기기별 입력기 동작은 확인하지 못해 쓰지 않았다.
- <!--ad--> 자리에 글 가운데 광고 자리가 들어간다. <table class="wide"> 는 휴대폰에서 옆으로 미는 넓은 표.
"""
PAPER = 'https://userinterfaces.aalto.fi/136Mkeystrokes/resources/chi-18-analysis.pdf'
PAGE = 'https://userinterfaces.aalto.fi/136Mkeystrokes/'


def st(text, n):
    """글 → 타수(Shift 포함). 시험이 TJ.hangul.strokeCount 로 대조"""
    return f'<b class="num" data-st="{text}">{n}</b>'


def pm(strokes, ms, n):
    """타수·시간 → 타/분. 시험이 TJ.report 로 대조"""
    return f'<b class="num" data-pm="{strokes},{ms}">{n}</b>'


def wpm(chars, ms, n):
    return f'<b class="num" data-wpm="{chars},{ms}">{n}</b>'


def acc(ok, typed, n):
    return f'<b class="num" data-acc="{ok},{typed}">{n}</b>'


def ime_table(text, steps, head_key, head_show):
    """글쇠마다 입력칸에 보이는 글. 시험이 입력기 흉내(기준 라이브러리와 대조한 것)로 다시 만들어 본다"""
    keys = steps[0]
    shows = steps[1]
    k = ''.join(f'<td>{x}</td>' for x in keys)
    s = ''.join(f'<td>{x}</td>' for x in shows)
    wide = ' class="wide"' if len(keys) > 6 else ''   # 칸이 많은 표만 휴대폰에서 옆으로 민다
    return f'<table{wide} data-ime="{text}"><tr><th>{head_key}</th>{k}</tr><tr><th>{head_show}</th>{s}</tr></table>'


def finger_rows(rows, lang):
    out = ''
    for n, name, keys, shown in rows:
        out += f'<tr data-finger="{n}" data-keys="{keys}"><td>{name}</td><td>{shown}</td></tr>'
    return out


KO_FINGERS = [
    (1, '왼손 새끼손가락', 'ㅂㅁㅋ', 'ㅂ ㅁ ㅋ'), (2, '왼손 약손가락', 'ㅈㄴㅌ', 'ㅈ ㄴ ㅌ'), (3, '왼손 가운뎃손가락', 'ㄷㅇㅊ', 'ㄷ ㅇ ㅊ'),
    (4, '왼손 집게손가락', 'ㄱㅅㄹㅎㅍㅠ', 'ㄱ ㅅ ㄹ ㅎ ㅍ ㅠ'), (5, '오른손 집게손가락', 'ㅛㅕㅗㅓㅜㅡ', 'ㅛ ㅕ ㅗ ㅓ ㅜ ㅡ'),
    (6, '오른손 가운뎃손가락', 'ㅑㅏ', 'ㅑ ㅏ'), (7, '오른손 약손가락', 'ㅐㅣ', 'ㅐ ㅣ'), (8, '오른손 새끼손가락', 'ㅔ', 'ㅔ'),
]
EN_FINGERS = [
    (1, 'Left little finger', 'qaz', 'Q A Z'), (2, 'Left ring finger', 'wsx', 'W S X'), (3, 'Left middle finger', 'edc', 'E D C'),
    (4, 'Left index finger', 'rtfgvb', 'R T F G V B'), (5, 'Right index finger', 'yuhjnm', 'Y U H J N M'),
    (6, 'Right middle finger', 'ik,', 'I K ,'), (7, 'Right ring finger', 'ol.', 'O L .'), (8, 'Right little finger', 'p;/', 'P ; /'),
]

ARTICLES = {'ko': [], 'en': []}

# ------------------------------------------------------------------ 한국어 1
ARTICLES['ko'].append(dict(
    slug='tasu-gyesan', pair='how-wpm-is-calculated', published='2026-10-10',
    title='타수(타/분)는 어떻게 계산하나요: 토독의 기준과 예시', h1='타수(타/분)는 어떻게 계산하나요',
    desc='타수는 맞게 친 키 수를 분으로 나눈 값이에요. 글자마다 몇 타로 세는지, Shift와 겹받침은 어떻게 세는지, 틀린 키는 어떻게 되는지를 예시 계산으로 보여 드려요.',
    tag='기준과 예시', cta=('', '타자 속도 재 보기'),
    answer='타수는 <b>맞게 친 키 수 ÷ 걸린 시간(분)</b>이에요. 토독은 두벌식 자판에서 실제로 누르는 키를 세고, Shift를 같이 누르는 키는 2타로 세어요. 이 글의 숫자는 전부 토독이 쓰는 계산으로 다시 구한 값이에요.',
    body=f'''<h2>한 글자는 몇 타인가요</h2>
<p>한글 한 글자는 누르는 키 수만큼이에요. 받침이 없으면 두 번, 받침이 있으면 세 번, 겹받침이면 네 번 눌러요. 쌍자음과 ㅒ·ㅖ는 Shift를 같이 누르니 그 키만 2타로 세어요.</p>
<table>
<tr><th>글자</th><th>누르는 키</th><th class="n">타수</th></tr>
<tr><td>가</td><td>ㄱ ㅏ</td><td class="n">{st('가', 2)}</td></tr>
<tr><td>한</td><td>ㅎ ㅏ ㄴ</td><td class="n">{st('한', 3)}</td></tr>
<tr><td>값</td><td>ㄱ ㅏ ㅂ ㅅ (겹받침은 키 두 개)</td><td class="n">{st('값', 4)}</td></tr>
<tr><td>과</td><td>ㄱ ㅗ ㅏ (겹모음은 키 두 개)</td><td class="n">{st('과', 3)}</td></tr>
<tr><td>까</td><td>Shift+ㄱ ㅏ</td><td class="n">{st('까', 3)}</td></tr>
<tr><td>쌌</td><td>Shift+ㅅ ㅏ Shift+ㅅ</td><td class="n">{st('쌌', 5)}</td></tr>
<tr><td>얘</td><td>ㅇ Shift+ㅐ</td><td class="n">{st('얘', 3)}</td></tr>
</table>
<p>띄어쓰기와 줄바꿈은 1타, 마침표·쉼표도 1타예요. 물음표와 느낌표는 Shift가 필요해서 2타예요.</p>
<h2>문장으로 세어 보기</h2>
<div class="calc"><p><b>한글 타자</b> = 한(3) + 글(3) + 띄어쓰기(1) + 타(2) + 자(2) = {st('한글 타자', 11)}타</p>
<p><b>값이 싸요</b> = 값(4) + 이(2) + 띄어쓰기(1) + 싸(3) + 요(2) = {st('값이 싸요', 12)}타</p>
<p><b>까치</b> = 까(3) + 치(2) = {st('까치', 5)}타</p></div>
<h2>분으로 나누기</h2>
<p>타수(타/분) = 맞게 친 타수 ÷ 걸린 시간(초) × 60이에요.</p>
<ul>
<li>'한글 타자' 11타를 3초에 쳤다면 11 ÷ 3 × 60 = {pm(11, 3000, 220)}타/분</li>
<li>'값이 싸요' 12타를 4초에 쳤다면 12 ÷ 4 × 60 = {pm(12, 4000, 180)}타/분</li>
<li>30초 동안 맞게 친 타수가 184타라면 184 ÷ 30 × 60 = {pm(184, 30000, 368)}타/분</li>
</ul>
<p>시간으로 재지 않는 연습(문장 연습, 틀린 키 연습)은 걸린 시간을 0.1초까지 반올림한 다음 계산해요. 184타를 23.449초에 쳤다면 23.4초로 보고 184 ÷ 23.4 × 60 = {pm(184, 23449, 472)}타/분이에요. 결과 화면에 이 식이 그대로 나오니, 계산기로 다시 해 봐도 같은 수가 나와요.</p>
<!--ad-->
<h2>틀린 키는 어떻게 되나요</h2>
<p>타수에는 <b>끝났을 때 맞게 남아 있는 키</b>만 들어가요. '한글 타자'를 '핫글 타자'로 치고 고치지 않았다면, 틀린 ㅅ 하나를 뺀 <b class="num" data-ok="한글 타자|핫글 타자">10</b>타만 세어요. 틀렸다가 지우고 다시 쳤다면 11타가 다 들어가요. 고친 키는 한 번만 세니까요.</p>
<p>정확도는 따로 세어요. 맞게 누른 키 ÷ 누른 키인데, 키가 눌린 그 순간 맞았는지로 따져요. '한글'을 치다가 ㄴ 자리에 ㅅ을 눌렀다가 지우고 다시 쳤다면, 누른 키 7개 가운데 6개가 맞았으니 정확도는 {acc(6, 7, 86)}%예요. 지우기 키는 누른 키에 넣지 않아요. 그래서 고쳐 치면 타수는 지켜지지만 정확도에는 흔적이 남아요.</p>
<p>틀린 글자를 고치지 않고 그대로 두면 그 글자만 타수에서 빠지고, 정확도에는 틀린 키로 남아요. 틀린 글자가 든 단어 전체를 빼는 프로그램과는 숫자가 달라요. 결과 화면의 정확도 아래에는 틀렸거나 지운 것까지 누른 키 전부로 계산한 '총 타수'도 작게 나와요.</p>
<h2>다른 프로그램과 숫자가 다를 수 있는 이유</h2>
<p>타수를 세는 방법은 하나로 정해져 있지 않아요. 프로그램마다 아래 같은 곳에서 기준이 갈릴 수 있어요.</p>
<ul>
<li>Shift를 한 타로 세는지</li>
<li>틀렸다가 고친 키를 빼는지, 틀린 글자에 벌점을 주는지</li>
<li>띄어쓰기와 줄바꿈을 세는지</li>
<li>시간을 언제부터 재는지(첫 키부터인지, 화면이 뜬 때부터인지)</li>
</ul>
<p>그래서 토독의 숫자를 다른 프로그램의 숫자와 그대로 견주기는 어려워요. 같은 도구로 잰 어제의 내 기록과 견주는 쪽이 정확해요. 토독의 기준 전체는 <a href="/ko/#basis">계산 기준</a>에 있어요.</p>
<h2>영어의 WPM과는 다른 단위예요</h2>
<p>영어권에서는 분당 단어 수(WPM)를 써요. 토독은 다섯 글자를 한 단어로 치고 맞게 친 글자 수 ÷ 5 ÷ 분으로 계산해요. 다섯 글자를 한 단어로 치는 것은 타자 연구에서도 같아요(<a href="{PAPER}" rel="noopener">Dhakal 외, CHI 2018</a>, 2026-10-10 확인). 다만 그 연구는 맞게 친 글자만이 아니라 친 글 전체의 길이를 세고, 문장의 첫 키부터 마지막 키까지의 시간으로 나눠요. 토독의 채점과는 달라요. 한글 타수는 글자가 아니라 키를 세니까, 타수를 5로 나눈다고 WPM이 되지는 않아요. 영어를 칠 때의 두 숫자는 <a href="/ko/english/">영타 연습</a>에서 같이 볼 수 있어요.</p>
<h2>휴대폰에서 잴 때</h2>
<p>터치 자판은 어떤 키를 눌렀는지 브라우저가 알 수 없어요. 그래서 토독은 완성된 글자를 두벌식 키 수로 바꿔서 세어요. '한'을 어떤 방식으로 입력했든 3타로 쳐요. 컴퓨터 자판으로 잰 타수와는 조건이 다르고, 자판 앱에 따라 다르게 보일 수 있어요.</p>''',
))

# ------------------------------------------------------------------ 한국어 2
ARTICLES['ko'].append(dict(
    slug='dubeolsik-jari', published='2026-10-10',
    title='두벌식 자리 익히는 순서: 기본 자리부터 손가락별 키까지', h1='두벌식 자리 익히는 순서',
    desc='두벌식 자판을 보지 않고 치려면 가운데 줄에 손가락을 올리는 것부터 시작해요. 손가락마다 맡는 키 표와, 기본 자리에서 Shift 키까지 다섯 단계 순서를 정리했어요.',
    tag='기본 자리부터', cta=('practice/', '자리 연습 시작하기'),
    answer='가운데 줄에 여덟 손가락을 올리는 <b>기본 자리</b>부터 익히고, 윗줄, 아랫줄, Shift 키 순서로 넓혀 가요. 손가락마다 맡은 키가 정해져 있어서, 그 약속만 지키면 자판을 보지 않아도 손이 자리를 찾아요.',
    body=f'''<h2>먼저 손을 올리는 자리</h2>
<p>두벌식(한국에서 가장 널리 쓰는 한글 자판 배열)은 자음이 왼쪽, 모음이 오른쪽에 모여 있어요. 왼손 네 손가락을 <span class="cap">ㅁ</span><span class="cap">ㄴ</span><span class="cap">ㅇ</span><span class="cap">ㄹ</span>에, 오른손 네 손가락을 <span class="cap">ㅓ</span><span class="cap">ㅏ</span><span class="cap">ㅣ</span><span class="cap">;</span>에 올려요. 엄지는 띄어쓰기 위에 둬요.</p>
<p>집게손가락이 놓이는 ㄹ과 ㅓ 키(영문 F, J)에는 작은 돌기가 있어요. 화면만 보면서도 손끝으로 이 돌기를 찾으면 손이 제자리에 온 거예요. 키를 누른 손가락은 곧바로 이 자리로 돌아와요.</p>
<h2>손가락마다 맡는 키</h2>
<p>각 손가락은 자기 자리의 위아래 키를 맡아요. 집게손가락만 안쪽 한 줄을 더 맡아요.</p>
<table>
<tr><th>손가락</th><th>맡는 키</th></tr>
{finger_rows(KO_FINGERS, 'ko')}
</table>
<p>표에서 보듯 모음은 거의 오른손이 치는데, ㅠ만은 왼손 집게손가락 차례예요(영문 B 자리). 처음에 가장 헷갈리는 키라서 따로 기억해 두면 좋아요.</p>
<!--ad-->
<h2>익히는 순서</h2>
<ol>
<li><b>기본 자리</b>: ㅁㄴㅇㄹ과 ㅓㅏㅣ, 그리고 집게손가락을 안쪽으로 뻗는 ㅎ과 ㅗ. '어머니', '나라', '호랑이' 같은 말은 이 줄만으로 칠 수 있어요.</li>
<li><b>윗줄</b>: ㅂㅈㄷㄱㅅ과 ㅛㅕㅑㅐㅔ. 손가락을 위로 뻗었다가 기본 자리로 돌아오는 연습이에요.</li>
<li><b>아랫줄</b>: ㅋㅌㅊㅍ과 ㅠㅜㅡ. 손가락을 아래로 접어 내려요.</li>
<li><b>Shift 키</b>: 쌍자음 ㄲㄸㅃㅆㅉ은 왼손 키라서 오른손 새끼손가락으로 Shift를 누르고, ㅒㅖ는 오른손 키라서 왼손 새끼손가락으로 Shift를 눌러요.</li>
<li><b>전체</b>: 짧은 문장으로 배운 키를 섞어 쳐요.</li>
</ol>
<p><a href="/ko/practice/">타자 자리 연습</a>이 이 순서 그대로예요. 단계마다 그때까지 배운 키만 나오고, 화면 자판이 다음에 누를 키와 손가락을 알려 줘요.</p>
<h2>연습할 때 지킬 것 세 가지</h2>
<ul>
<li><b>틀린 손가락으로 맞히지 않기.</b> 빨리 치려고 가까운 손가락으로 누르면 그 버릇이 굳어요. 느려도 맡은 손가락으로 눌러요.</li>
<li><b>정확도를 먼저.</b> 토독의 자리 연습은 정확도가 95% 이상이어야 다음 단계를 권해요. 속도는 그다음이에요.</li>
<li><b>익숙해지면 화면 자판을 가리기.</b> '자판 가리기'를 누르고도 같은 정확도가 나오면 그 단계는 손에 붙은 거예요.</li>
</ul>
<h2>어느 키에서 막히는지 보기</h2>
<p>한 판이 끝나면 틀린 키가 자판 그림에 주홍색으로 칠해져요. 같은 키가 되풀이해서 칠해진다면 그 키를 맡은 손가락을 표에서 다시 확인해 보세요. <a href="/ko/">타자 속도 측정</a>의 '틀린 키만 연습'은 그 키가 든 단어만 모아서 내 줘요.</p>''',
))

# ------------------------------------------------------------------ 한국어 3
ARTICLES['ko'].append(dict(
    slug='batchim-neomeogam', published='2026-10-10',
    title='받침이 다음 글자로 넘어가 보이는 이유: 한글 조합 입력', h1='받침이 다음 글자로 넘어가 보이는 이유',
    desc="'가나'를 치면 화면에 잠깐 '간'이 보였다가 '가나'가 돼요. 두벌식에 받침 키가 따로 없어서 생기는 일이에요. 키마다 화면에 무엇이 보이는지 표로 정리했어요.",
    tag='조합 입력', cta=('', '한글 타자 재 보기'),
    answer="두벌식에는 받침만 치는 키가 따로 없어요. 그래서 자음을 누른 순간에는 그 자음이 <b>앞 글자의 받침인지 다음 글자의 첫소리인지</b> 알 수 없어요. 입력기는 일단 받침으로 붙여 두었다가, 바로 뒤에 모음이 오면 그 자음을 다음 글자로 옮겨요.",
    body=f'''<h2>'가나'를 칠 때 화면에 보이는 것</h2>
<p>키를 하나 누를 때마다 입력칸에 보이는 글이에요.</p>
{ime_table('가나', (['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ'], ['ㄱ', '가', '간', '가나']), '누른 키', '화면')}
<p>셋째 키 ㄴ을 누른 순간 화면은 '간'이에요. 틀린 게 아니에요. 넷째 키로 모음 ㅏ가 오자 ㄴ이 다음 글자의 첫소리로 넘어가서 '가나'가 됐어요. 받침이 잠깐 붙었다가 떨어지는 이 모습을 흔히 '도깨비불'이라고 불러요.</p>
<h2>겹받침에서는 한 번 더 일어나요</h2>
<p>받침 자리에 자음 두 개가 겹받침을 이룰 수 있으면, 입력기는 그것도 일단 붙여 둬요.</p>
{ime_table('달기', (['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ', 'ㅣ'], ['ㄷ', '다', '달', '닭', '달기']), '누른 키', '화면')}
<p>'달기'를 치는데 중간에 '닭'이 보여요. 다음 키가 모음이라 ㄱ이 넘어가면서 '달기'가 돼요.</p>
{ime_table('각사', (['ㄱ', 'ㅏ', 'ㄱ', 'ㅅ', 'ㅏ'], ['ㄱ', '가', '각', '갃', '각사']), '누른 키', '화면')}
<p>'각사'에서는 평소에 볼 일이 없는 '갃'이 잠깐 나타나요. 반대로 '없어요'는 겹받침이 그대로 남는 경우예요.</p>
{ime_table('없어요', (['ㅇ', 'ㅓ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅓ', 'ㅇ', 'ㅛ'], ['ㅇ', '어', '업', '없', '없ㅇ', '없어', '없엉', '없어요']), '누른 키', '화면')}
<p>여기서도 일곱째 키에서 '없엉'이 보였다가 마지막 모음에서 '없어요'로 바뀌어요.</p>
<p class="note">이 표들은 토독의 시험에서 쓰는 두벌식 입력 흉내로 만든 것이고, 공개된 한글 처리 라이브러리 두 가지와 키마다 같은 결과가 나오는지 대조했어요. 실제 기기의 입력기는 조금씩 다르게 보일 수 있어요.</p>
<!--ad-->
<h2>타자 연습 프로그램에서는 왜 문제가 되나요</h2>
<p>화면의 글자를 목표 글자와 한 글자씩 견주면, '가나'를 맞게 치는 중인데도 '간'이 보이는 순간 둘째 글자가 틀렸다고 나와요. 글자가 깜빡이며 빨갛게 바뀌면 맞게 치고 있는 사람도 손이 멈춰요.</p>
<p>토독은 글자가 아니라 <b>누른 키의 순서</b>를 견줘요. '가나'의 키 순서는 ㄱ ㅏ ㄴ ㅏ이고, 화면에 '간'이 보이는 순간까지 누른 키는 ㄱ ㅏ ㄴ이에요. 순서가 맞으니 맞게 치는 중이에요. 그래서 조합 중인 글자와 받침이 넘어가는 순간을 틀림으로 표시하지 않아요. 치는 중인 글자는 목표 글자 모양 그대로 두고, 친 만큼만 왼쪽부터 색을 채워서 보여 줘요.</p>
<h2>연습할 때 볼 것</h2>
<ul>
<li><b>중간 모양에 멈추지 않기.</b> '간'이나 '닭'이 보여도 다음 키를 그대로 누르면 돼요. 화면이 아니라 목표 글을 보고 쳐요.</li>
<li><b>진짜 틀린 순간은 색으로 알 수 있어요.</b> 토독에서는 틀린 키를 누른 그 순간에만 글자가 주홍색으로 바뀌어요.</li>
<li><b>고쳐 쳐도 타수는 깎이지 않아요.</b> 틀린 키를 지우고 다시 치면 타수에는 맞게 친 것으로 들어가요. 정확도에만 틀렸던 기록이 남아요.</li>
<li><b>겹받침이 든 말을 따로 연습하기.</b> '읽어요', '앉아서', '없어요'처럼 겹받침 뒤에 모음이 오는 말에서 손이 자주 꼬여요. <a href="/ko/sentences/">문장 연습</a>의 문장에는 겹받침이 고루 들어 있어요.</li>
</ul>
<h2>휴대폰 자판은 방식이 달라요</h2>
<p>키 몇 개로 모음을 만들어 가는 터치 자판에서는 글자가 완성되기 전의 모양이 화면에 보일 수 있어요. 토독은 터치 자판에서는 글자가 끝난 뒤에 판정하고, 조합 중인 글자는 다음 글자가 올 때까지 판정을 미뤄요. 키 수는 두벌식 기준으로 바꿔서 세어요. 자판 앱마다 내보내는 글자가 달라서 실제 기기에서는 다르게 보일 수 있어요. 계산 방법은 <a href="/ko/guide/tasu-gyesan/">타수 계산 글</a>에 있어요.</p>''',
))

# ------------------------------------------------------------------ 한국어 4
ARTICLES['ko'].append(dict(
    slug='yeongta-yeonseup', published='2026-10-10',
    title='영타가 느릴 때 연습 순서: 한글 자리에서 영문 자리로', h1='영타가 느릴 때 연습 순서',
    desc='한글 타자는 빠른데 영타만 느리다면 손가락 자리는 이미 알고 있는 거예요. 같은 키의 한글·영문 짝, 한 손으로만 치는 단어, 타수와 WPM의 관계, 연습 순서를 정리했어요.',
    tag='한글에서 영문으로', cta=('english/', '영타 연습 시작하기'),
    answer='한글과 영문은 <b>같은 키, 같은 손가락</b>을 써요. 손가락 자리는 이미 몸에 있으니, 키마다 어떤 영문자가 있는지만 새로 붙이면 돼요. 자리 → 흔한 단어 → 문장 순서로 가고, 속도보다 정확도를 먼저 맞춰요.',
    body=f'''<h2>아는 자리에 영문자 붙이기</h2>
<p>손을 올려 두는 기본 자리의 한글 키와 영문 키는 이렇게 짝이에요.</p>
<table class="wide">
<tr><th>한글</th><td>ㅁ</td><td>ㄴ</td><td>ㅇ</td><td>ㄹ</td><td>ㅎ</td><td>ㅗ</td><td>ㅓ</td><td>ㅏ</td><td>ㅣ</td></tr>
<tr><th>영문</th><td data-q="ㅁ">A</td><td data-q="ㄴ">S</td><td data-q="ㅇ">D</td><td data-q="ㄹ">F</td><td data-q="ㅎ">G</td><td data-q="ㅗ">H</td><td data-q="ㅓ">J</td><td data-q="ㅏ">K</td><td data-q="ㅣ">L</td></tr>
</table>
<p>ㄹ을 치는 왼손 집게손가락이 F를, ㅓ를 치는 오른손 집게손가락이 J를 쳐요. 손가락 약속은 그대로예요. 윗줄과 아랫줄도 같아요.</p>
<h2>한글과 다른 점: 한 손으로 이어 치는 단어</h2>
<p>두벌식은 자음이 왼손, 모음이 오른손이라 두 손을 번갈아 쓰게 돼요. 영문은 자음과 모음이 양쪽에 섞여 있어서 한 손으로만 이어 쳐야 하는 단어가 나와요. 영타가 유난히 느리게 느껴지는 곳이 여기예요.</p>
<ul>
<li>왼손으로만 치는 단어: <span data-hand="L" lang="en">water</span>, <span data-hand="L" lang="en">after</span>, <span data-hand="L" lang="en">great</span>, <span data-hand="L" lang="en">street</span>, <span data-hand="L" lang="en">better</span></li>
<li>오른손으로만 치는 단어: <span data-hand="R" lang="en">you</span>, <span data-hand="R" lang="en">only</span>, <span data-hand="R" lang="en">look</span>, <span data-hand="R" lang="en">jump</span>, <span data-hand="R" lang="en">him</span></li>
</ul>
<p>이런 단어에서 틀리거나 느려진다면 정상이에요. 결과 화면의 '느린 키'에 한쪽 손 키가 몰려 나오면 그 단어들을 따로 쳐 보세요.</p>
<!--ad-->
<h2>타수와 WPM은 어떻게 이어지나요</h2>
<p>영어 소문자는 키 하나가 글자 하나예요. 그래서 대문자와 Shift 기호 없이 소문자와 띄어쓰기만 칠 때는 타수가 곧 글자 수이고, WPM은 글자 수 ÷ 5 ÷ 분이니 <b>타수 ÷ 5 = WPM</b>이 돼요. 30초에 150자를 맞게 쳤다면 {pm(150, 30000, 300)}타/분이고 {wpm(150, 30000, 60)} WPM이에요.</p>
<p>대문자와 물음표·느낌표 같은 기호가 섞이면 Shift 때문에 타수가 더 많이 올라가요. 'Hi there'는 글자로는 8자지만 타수로는 {st('Hi there', 9)}타예요. 토독의 <a href="/ko/english/">영타 연습</a>은 두 숫자를 같이 보여 줘요.</p>
<h2>연습 순서</h2>
<ol>
<li><b>단어, 30초.</b> 영타 연습의 기본값이에요. 아주 흔한 단어만 나와요. 정확도가 95% 아래면 속도를 늦춰요.</li>
<li><b>틀린 키만 연습.</b> 결과 화면에서 틀린 키가 든 단어만 모아 한 번 더 쳐요. 기록에는 넣지 않으니 편하게 쳐요.</li>
<li><b>문장.</b> 대문자와 쉼표, 마침표가 들어와요. Shift는 치는 글자의 반대쪽 손 새끼손가락으로 눌러요.</li>
<li><b>팬그램.</b> 알파벳 26자가 모두 든 문장이에요. 평소 잘 안 쓰는 Q, Z, X 자리를 확인할 수 있어요.</li>
<li><b>60초, 120초.</b> 짧은 판에서 정확도가 안정되면 시간을 늘려요.</li>
</ol>
<p>영문 자리를 처음부터 다시 잡고 싶다면 영어판의 <a href="/practice/" lang="en" hreflang="en">Typing Practice</a>에 기본 자리부터 다섯 단계가 있어요. 화면 글은 영어지만 쓰는 법은 <a href="/ko/practice/">타자 자리 연습</a>과 같아요.</p>
<h2>한/영 키를 잘못 눌렀을 때</h2>
<p>영어 글인데 한글이 찍히면 화면에 한/영 키를 누르라는 안내가 떠요. 안내가 떠 있는 동안 친 키는 정확도와 틀린 키 기록에 넣지 않아요. 자판 전환 실수가 타자 실력은 아니니까요.</p>
<h2>정확도를 먼저 보는 이유</h2>
<p>틀린 글자 하나를 고치려면 틀린 키, 지우기, 맞는 키로 세 번을 눌러야 해요. 온라인 영어 타자 시험 참가자 168,960명의 기록을 분석한 연구도 빠른 사람일수록 오타가 대체로 적었다고 요약해요(<a href="{PAGE}" rel="noopener">Dhakal 외, CHI 2018</a>, 2026-10-10 확인. 영어 문장을 베껴 친 시험에 스스로 참여한 사람들의 값이에요).</p>''',
))

# ------------------------------------------------------------------ 영어 1
ARTICLES['en'].append(dict(
    slug='how-wpm-is-calculated', pair='tasu-gyesan', published='2026-10-10',
    title='How WPM Is Calculated: Gross vs Net, and Why Sites Disagree', h1='How WPM is calculated',
    desc='WPM is characters divided by five, divided by minutes. See worked examples of net and gross WPM and accuracy, the rounding we use, and the choices that make typing sites report different numbers.',
    tag='Gross, net and worked examples', cta=('', 'Take the typing test'),
    answer='WPM is <b>characters ÷ 5 ÷ minutes</b>. A "word" is any five characters, so a long word and a short one are treated the same. <b>Net</b> WPM counts only the characters you got right. <b>Gross</b> (or raw) WPM counts every key you pressed. Every number below was recalculated with the same code the test runs.',
    body=f'''<h2>Why five characters?</h2>
<p>Real words vary in length, so counting actual words would reward text full of short ones. Typing research uses the same convention. A 2018 study of 136 million keystrokes defines WPM as the length of the typed text "in words, where one word consists of any five characters", divided by the time in minutes (<a href="{PAPER}" rel="noopener">Dhakal et al., CHI 2018</a>, checked 2026-10-10).</p>
<h2>A clean run</h2>
<div class="calc"><p>You type <code>the cat sat on the mat</code> with no mistakes in 12 seconds. That is 22 characters, spaces included.</p>
<p>22 ÷ 5 ÷ 12 s × 60 = {wpm(22, 12000, 22)} WPM. Net and gross are the same, and accuracy is 100%.</p></div>
<h2>One mistake, left alone</h2>
<div class="calc"><p>The text is <code>hello world</code>. You type <code>hellp world</code> in 6 seconds and do not fix it.</p>
<p>Net: 10 correct characters ÷ 5 ÷ 6 s × 60 = {wpm(10, 6000, 20)} WPM</p>
<p>Gross: 11 key presses ÷ 5 ÷ 6 s × 60 = {wpm(11, 6000, 22)} WPM</p>
<p>Accuracy: 10 of 11 key presses were right, so {acc(10, 11, 91)}%</p></div>
<h2>The same mistake, fixed</h2>
<div class="calc"><p>This time you notice the <code>p</code>, press Backspace, and type <code>o</code>. Still 6 seconds.</p>
<p>Net: 11 correct characters ÷ 5 ÷ 6 s × 60 = {wpm(11, 6000, 22)} WPM</p>
<p>Gross: 12 key presses ÷ 5 ÷ 6 s × 60 = {wpm(12, 6000, 24)} WPM</p>
<p>Accuracy: 11 of 12 key presses were right, so {acc(11, 12, 92)}%</p></div>
<p>Fixing the error brought net WPM back up, but accuracy still remembers it. On Todok a key is judged at the moment you press it, and Backspace is not counted as a key press.</p>
<!--ad-->
<h2>Where typing sites differ</h2>
<p>There is no single rulebook, which is why the same person can get different scores on different sites. These are the choices that move the number:</p>
<table>
<tr><th>Choice</th><th>What Todok does</th></tr>
<tr><td>Headline number</td><td>Net WPM. Raw WPM is shown in small print under the accuracy, with its formula.</td></tr>
<tr><td>Uncorrected errors</td><td>The wrong characters are simply not counted. No extra penalty is subtracted, and the rest of the word still counts.</td></tr>
<tr><td>Corrected errors</td><td>Count once toward WPM after the fix, and still count against accuracy.</td></tr>
<tr><td>Spaces</td><td>Counted as characters.</td></tr>
<tr><td>When the clock starts</td><td>On your first key, not when the page loads. It pauses if the tab is hidden.</td></tr>
<tr><td>Rounding</td><td>Time is rounded to 0.1 s first, then WPM is calculated and rounded.</td></tr>
</table>
<p>A site that subtracts a penalty for each error, drops the whole word around a mistake, or starts the clock earlier will show a lower number for the same typing. We do not claim our score matches any other site. Compare today's result with your own earlier results from the same tool.</p>
<h2>The rounding, in one example</h2>
<p>Tests that end when you finish the text rarely take a whole number of seconds. If you type 80 correct characters in 23.449 seconds, Todok shows 23.4 s and calculates 80 ÷ 5 ÷ 23.4 × 60 = {wpm(80, 23449, 41)} WPM. The formula appears on the result screen, so you can redo it on a calculator and get the same number.</p>
<h2>A reference point, with caveats</h2>
<p>In the study mentioned above, 168,960 volunteers took an online English typing test and averaged 51.56 WPM, with a standard deviation of 20.2. The fastest tenth typed above roughly 78 WPM and the slowest tenth below roughly 26 WPM (<a href="{PAPER}" rel="noopener">Dhakal et al., CHI 2018</a>, checked 2026-10-10). These people chose to take part and were copying English sentences, so this is not a world average, and that study's scoring is not identical to ours.</p>
<h2>Keystrokes per minute</h2>
<p>Some countries measure typing in keystrokes per minute instead. Todok's <a href="/ko/" lang="ko" hreflang="ko">Korean edition</a> does, because one Korean syllable takes two to five key presses. For lowercase English with no Shift, one key is one character, so keystrokes per minute is simply WPM × 5: 60 WPM is {pm(150, 30000, 300)} keystrokes per minute.</p>''',
))

# ------------------------------------------------------------------ 영어 2
ARTICLES['en'].append(dict(
    slug='touch-typing-home-row', published='2026-10-10',
    title='Touch Typing Basics: The Home Row and Which Finger Takes Which Key', h1='Touch typing basics: the home row and finger chart',
    desc='Touch typing starts with eight fingers resting on the home row. Here is the finger chart for every letter key, the order to learn the rows in, and how to tell which keys are holding you back.',
    tag='Home row and finger chart', cta=('practice/', 'Start typing practice'),
    answer='Touch typing means each key always gets the <b>same finger</b>, so your hands can find it without your eyes. It starts from the home row: left fingers on <span class="cap">A</span><span class="cap">S</span><span class="cap">D</span><span class="cap">F</span>, right fingers on <span class="cap">J</span><span class="cap">K</span><span class="cap">L</span><span class="cap">;</span>, thumbs over the space bar.',
    body=f'''<h2>Finding the home row without looking</h2>
<p>The F and J keys have a small raised bump. Rest your index fingers on those two bumps and the other fingers fall onto the keys beside them. After every key press, the finger comes back to its home key. That return trip is what lets you find the next key by feel.</p>
<h2>Which finger takes which key</h2>
<p>Each finger covers its home key and the keys directly above and below it. The two index fingers also cover one extra column toward the middle of the keyboard.</p>
<table>
<tr><th>Finger</th><th>Keys</th></tr>
{finger_rows(EN_FINGERS, 'en')}
</table>
<p>Either thumb presses the space bar. For a capital letter or a symbol that needs Shift, hold Shift with the little finger of the <em>other</em> hand: right Shift for a capital A, left Shift for a capital L.</p>
<p>Two keys cause most early mix-ups. B belongs to the left index finger and Y to the right index finger, even though each sits near the middle where either hand could reach.</p>
<!--ad-->
<h2>The order to learn it in</h2>
<ol>
<li><b>Home row.</b> A S D F and J K L ; then G and H, which the index fingers reach inward for. Words like "glass", "salad" and "flash" use this row only.</li>
<li><b>Top row.</b> Q W E R T and Y U I O P. Reach up, press, return.</li>
<li><b>Bottom row.</b> Z X C V B and N M, plus the comma and period. Curl the finger down rather than moving the whole hand.</li>
<li><b>Shift.</b> Capitals and marks such as ? ! : and quotation marks.</li>
<li><b>Everything together.</b> Short sentences.</li>
</ol>
<p><a href="/practice/">Typing Practice</a> follows exactly this order. Each step only gives you keys you have already met, and the on-screen keyboard lights the next key and names the finger for it.</p>
<h2>Three habits that matter more than speed</h2>
<ul>
<li><b>Use the assigned finger even when another is closer.</b> A shortcut that works at slow speed becomes the thing that trips you later.</li>
<li><b>Accuracy first.</b> Todok's practice suggests the next step once your accuracy is 95% or higher. Speed follows once the reach is automatic.</li>
<li><b>Hide the on-screen keyboard when a step feels easy.</b> If your accuracy holds with the keyboard hidden, that row is learned.</li>
</ul>
<h2>Seeing which keys hold you back</h2>
<p>When a round ends, the keys you missed are painted on a picture of the keyboard, and the ones you were slow on are outlined. If the same key keeps showing up, check the chart above for its finger. On the <a href="/">typing test</a>, "Practice missed keys" builds a short drill from words that contain them.</p>
<p>For how the score itself is worked out, see <a href="/guide/how-wpm-is-calculated/">How WPM is calculated</a>.</p>''',
))

# ------------------------------------------------------------------ 영어 3
ARTICLES['en'].append(dict(
    slug='accuracy-before-speed', published='2026-10-10',
    title='Why Accuracy First Makes You a Faster Typist', h1='Why accuracy first makes you faster',
    desc='A fixed typo costs three key presses for one character. See the arithmetic for 30 seconds of typing with and without errors, and how to use a missed-key map to practice the keys that slow you down.',
    tag='The arithmetic of a typo', cta=('', 'Find your missed keys'),
    answer='A mistake you go back and fix costs <b>three key presses for one character</b>: the wrong key, Backspace, and the right key. A mistake you leave costs the character outright. Either way your net WPM drops, so cutting errors is usually the quickest route to a higher score.',
    body=f'''<h2>Thirty seconds, three ways</h2>
<p>Suppose your fingers manage 150 key presses in 30 seconds, including Backspace. Here is what the score looks like in three cases, using the same formulas as the test (WPM = correct characters ÷ 5 ÷ minutes).</p>
<table class="wide">
<tr><th>What happens</th><th class="n">Correct characters</th><th class="n">Net WPM</th><th class="n">Accuracy</th></tr>
<tr><td>No mistakes</td><td class="n">150</td><td class="n">{wpm(150, 30000, 60)}</td><td class="n">{acc(150, 150, 100)}%</td></tr>
<tr><td>10 mistakes, each fixed</td><td class="n">130</td><td class="n">{wpm(130, 30000, 52)}</td><td class="n">{acc(130, 140, 93)}%</td></tr>
<tr><td>10 mistakes, left in</td><td class="n">140</td><td class="n">{wpm(140, 30000, 56)}</td><td class="n">{acc(140, 150, 93)}%</td></tr>
</table>
<p>In the second row, each of the 10 fixes used up three presses (wrong key, Backspace, right key) to produce one character, so 30 presses yielded 10 characters and the other 120 yielded 120. Backspace is not counted as a key press for accuracy, which is why accuracy there is 130 out of 140.</p>
<p>Ten slips in half a minute took 4 to 8 WPM off the score without your fingers moving any slower.</p>
<h2>What a large study observed</h2>
<p>An analysis of 136 million keystrokes from 168,960 volunteers summarises one of its findings this way: "Faster typists make generally less errors." (<a href="{PAGE}" rel="noopener">Dhakal et al., CHI 2018</a>, checked 2026-10-10). The participants chose to take an online English typing test, and the study observed this pattern rather than proving that slowing down makes anyone fast. It does fit the arithmetic above.</p>
<!--ad-->
<h2>Find the keys, not just the score</h2>
<p>An accuracy percentage tells you that you are making mistakes, not where. On Todok the result screen does two more things:</p>
<ul>
<li><b>Missed keys</b> are painted on a keyboard map, with the count on each key. A miss is recorded on the key you <em>should</em> have pressed, so the map shows the reach your hand gets wrong.</li>
<li><b>Slow keys</b> are outlined. These are keys you hit correctly but hesitated on, measured by the gap from the previous key.</li>
</ul>
<p>The same keys tend to come back run after run. "Keys you miss most" under the test keeps a running tally on your device.</p>
<h2>A short routine</h2>
<ol>
<li>Take one 30-second <a href="/">typing test</a> at a pace where you feel in control.</li>
<li>If accuracy is under 95%, slow down on the next run until it is not. That threshold is the one Todok's own <a href="/practice/">practice steps</a> use.</li>
<li>Press "Practice missed keys". It builds a drill from words containing the keys you just missed. Drill results are not added to your records.</li>
<li>Run the test again and compare with your previous result, which is shown under the big number.</li>
</ol>
<p>If one finger's keys keep appearing on the map, the <a href="/guide/touch-typing-home-row/">finger chart</a> shows which keys that finger is supposed to cover.</p>''',
))


def by_slug(lang, slug):
    for a in ARTICLES[lang]:
        if a['slug'] == slug:
            return a
    return None
