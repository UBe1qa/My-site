"""한바퀴 가이드 글. 숫자(시차·바뀌는 날)는 손으로 적지 않고 파이썬 zoneinfo로 계산해 넣는다(시험이 core.js 값과 대조).
글마다: slug, pair(다른 언어판 짝), title, desc, h1, answer(첫 문단의 답), body(<!--ad--> 로 광고 자리), sources, try."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

_F = json.loads((Path(__file__).resolve().parent / 'facts.json').read_text(encoding='utf-8'))
UTC = timezone.utc
SEOUL = 'Asia/Seoul'


def off(zone, dt):
    return int(dt.astimezone(ZoneInfo(zone)).utcoffset().total_seconds() // 60)


def changes(zone, start=datetime(2026, 1, 1, tzinfo=UTC), end=datetime(2028, 1, 1, tzinfo=UTC)):
    """[(바뀐 순간 UTC, 바뀌기 전 오프셋, 바뀐 뒤 오프셋)] — 1시간 간격으로 훑고 분 단위로 좁힌다."""
    out, t, o = [], start, off(zone, start)
    while t < end:
        t2 = t + timedelta(hours=1)
        o2 = off(zone, t2)
        if o2 != o:
            lo, hi = t, t2
            while (hi - lo) > timedelta(minutes=1):
                mid = lo + (hi - lo) / 2
                mid = mid.replace(second=0, microsecond=0)
                if mid <= lo:
                    mid = lo + timedelta(minutes=1)
                if off(zone, mid) == o:
                    lo = mid
                else:
                    hi = mid
            out.append((hi, o, o2))
            o = o2
        t = t2
    return out


def hm(mins, lang):
    a = abs(mins)
    h, m = divmod(a, 60)
    if lang == 'ko':
        return (f'{h}시간' if h else '') + (f' {m}분' if m else '')
    return (f'{h} h' if h else '') + (f' {m} min' if m else '')


def vs_seoul(mins):
    """서울보다 몇 시간 늦나/빠르나(한국어)."""
    if mins == 0:
        return '같음'
    return hm(mins, 'ko').strip() + (' 빠름' if mins > 0 else ' 늦음')


def utc_label(mins):
    s = '+' if mins >= 0 else '−'
    h, m = divmod(abs(mins), 60)
    return f'UTC{s}{h}' + (f':{m:02d}' if m else '')


def local_when(zone, ts, before, lang):
    """바뀌는 순간을 그 도시의 '바뀌기 전' 벽시계로(예: 3월 8일 새벽 2시)."""
    d = ts + timedelta(minutes=before)
    if lang == 'ko':
        ap = '새벽 ' if d.hour < 6 else '오전 ' if d.hour < 12 else '오후 '
        hh = d.hour if d.hour <= 12 else d.hour - 12
        return f'{d.year}년 {d.month}월 {d.day}일 {ap}{hh}시' + (f' {d.minute}분' if d.minute else '')
    return f'{d.strftime("%b")} {d.day}, {d.year}, {d.hour}:{d.minute:02d}'


KO_CITIES = [('뉴욕', 'America/New_York'), ('시카고', 'America/Chicago'), ('로스앤젤레스', 'America/Los_Angeles'),
             ('런던', 'Europe/London'), ('파리·베를린·로마', 'Europe/Paris'), ('시드니', 'Australia/Sydney'), ('오클랜드(뉴질랜드)', 'Pacific/Auckland')]
KO_FIXED = [('도쿄', 'Asia/Tokyo'), ('베이징·상하이', 'Asia/Shanghai'), ('하노이·호찌민', 'Asia/Ho_Chi_Minh'), ('방콕', 'Asia/Bangkok'),
            ('싱가포르', 'Asia/Singapore'), ('두바이', 'Asia/Dubai'), ('브리즈번', 'Australia/Brisbane'), ('호놀룰루(하와이)', 'Pacific/Honolulu'),
            ('밴쿠버', 'America/Vancouver'), ('카사블랑카', 'Africa/Casablanca')]


def ko_dst_table():
    """지금(2026-10-14)부터 2027년 끝까지 바뀌는 순간마다 한 줄: 도시 | 바뀌는 날(현지) | 서울과의 시차 전 → 후."""
    rows = []
    for name, z in KO_CITIES:
        ch = [c for c in changes(z, start=datetime(2026, 10, 14, tzinfo=UTC)) if c[0].year <= 2027]
        for i, (ts, b, a) in enumerate(ch):
            d = ts + timedelta(minutes=b)
            ap = '새벽 ' if d.hour < 6 else '오전 ' if d.hour < 12 else '오후 '
            when = f'{d.year}.{d.month}.{d.day} {ap}{d.hour if d.hour <= 12 else d.hour - 12}시'
            diff = f'<b>{vs_seoul(a - 540)}</b>'
            first = f'<td rowspan="{len(ch)}">{name}</td>' if i == 0 else ''
            rows.append(f'<tr>{first}<td>{when}</td><td class="nw">{diff}</td></tr>')
    return '<div class="tbl"><table><thead><tr><th>도시</th><th>바뀌는 순간(현지)</th><th>바뀐 뒤 서울과의 시차</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>'


def ko_fixed_table():
    now = datetime(2026, 10, 14, 3, tzinfo=UTC)
    rows = ''.join(f'<tr><td>{n}</td><td>{utc_label(off(z, now))}</td><td>{vs_seoul(off(z, now) - 540)}</td></tr>' for n, z in KO_FIXED)
    return '<div class="tbl"><table><thead><tr><th>도시</th><th>UTC 기준</th><th>서울과의 시차</th></tr></thead><tbody>' + rows + '</tbody></table></div>'


EN_ZONES = [('United States (most states)', 'America/New_York'),
            ('United Kingdom', 'Europe/London'),
            ('European Union', 'Europe/Paris'),
            ('Sydney, Melbourne', 'Australia/Sydney'),
            ('New Zealand', 'Pacific/Auckland')]


def en_dst_table():
    rows = []
    for name, z in EN_ZONES:
        ch = [c for c in changes(z) if c[0].year in (2026, 2027)]
        for i, (ts, b, a) in enumerate(ch):
            d = ts + timedelta(minutes=b)
            word = 'Forward' if a > b else 'Back'
            first = f'<td rowspan="{len(ch)}">{name}</td>' if i == 0 else ''
            rows.append(f'<tr>{first}<td class="nw">{d.strftime("%b")} {d.day}, {d.year}, {d.hour}:{d.minute:02d}</td><td>{word} to {utc_label(a)}</td></tr>')
    return '<div class="tbl"><table><thead><tr><th>Where</th><th>When (local time)</th><th>Clocks</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>'


def en_pairs_table():
    pairs = [('New York and London', 'America/New_York', 'Europe/London'), ('New York and Paris', 'America/New_York', 'Europe/Paris'),
             ('London and Sydney', 'Europe/London', 'Australia/Sydney'), ('Los Angeles and Tokyo', 'America/Los_Angeles', 'Asia/Tokyo'),
             ('New York and Sydney', 'America/New_York', 'Australia/Sydney')]
    days = [datetime(2026, 3, 1, 12, tzinfo=UTC), datetime(2026, 3, 20, 12, tzinfo=UTC), datetime(2026, 4, 10, 12, tzinfo=UTC), datetime(2026, 7, 1, 12, tzinfo=UTC),
            datetime(2026, 10, 30, 12, tzinfo=UTC), datetime(2026, 11, 15, 12, tzinfo=UTC)]
    head = ''.join(f'<th>{d.strftime("%b")} {d.day}</th>' for d in days)
    rows = ''
    for name, a, b in pairs:
        cells = ''.join(f'<td>{hm(off(b, d) - off(a, d), "en").strip()}</td>' for d in days)
        rows += f'<tr><td>{name}</td>{cells}</tr>'
    return f'<div class="tbl wide"><table><thead><tr><th>Gap between</th>{head}</tr></thead><tbody>{rows}</tbody></table></div><p class="swipe">Swipe the table sideways</p>'


def _ny():
    ch = [c for c in changes('America/New_York') if c[0] > datetime(2026, 10, 14, tzinfo=UTC)]
    end, start = ch[0], ch[1]
    return end, start


def ko_answer():
    (e_ts, e_b, e_a), (s_ts, s_b, s_a) = _ny()
    return (f'한국은 서머타임이 없어서, 서머타임을 하는 나라와의 시차는 1년에 두 번 1시간씩 바뀌어요. 계산하면 미국 뉴욕은 '
            f'{e_ts.month}월 {(e_ts + timedelta(minutes=e_b)).day}일 새벽부터 이듬해 {s_ts.month}월 {(s_ts + timedelta(minutes=s_b)).day}일 새벽까지 서울보다 '
            f'{hm(540 - e_a, "ko").strip()}, 그 밖에는 {hm(540 - e_b, "ko").strip()} 늦어요.')


S = {k: (v['label'], v['url']) for k, v in _F.items() if isinstance(v, dict) and 'url' in v}

ARTICLES = {'ko': [], 'en': []}

ARTICLES['ko'].append({
    'slug': 'korea-time-difference', 'pair': None, 'published': '2026-10-14',
    'title': '한국과 나라별 시차 표 - 2026·2027 서머타임 바뀌는 날 | 한바퀴',
    'desc': '미국·영국·유럽·호주·뉴질랜드와 한국의 시차가 언제 1시간 바뀌는지, 서머타임이 없는 나라의 시차, 2026년에 규칙이 바뀐 캐나다·모로코까지 계산해 정리했어요.',
    'h1': '한국과 나라별 시차 표: 2026·2027 서머타임 바뀌는 날까지',
    'answer': ko_answer(),
    'body': f'''<p>시차는 나라마다 하나로 정해져 있지 않아요. 미국·유럽·호주처럼 서머타임을 하는 곳은 여름에 시계를 1시간 앞당기고, 한국은 서머타임이 없어서 그날부터 시차가 1시간 줄었다가 시계를 되돌리는 날 다시 늘어나요. 아래 숫자는 모두 IANA 시간대 자료로 계산했고, 미국·영국·호주 시드니·뉴질랜드의 바뀌는 날은 각 정부 안내와 맞춰 봤어요(출처는 맨 아래).</p>
<h2>서머타임을 하는 곳: 시차가 바뀌는 날</h2>
<p>2026년 10월 14일부터 2027년 끝까지예요. 바뀌는 순간은 그 도시의 현지 시각(바뀌기 직전 시계)이에요. 오른쪽은 그때부터 다음에 바뀔 때까지의 서울과의 시차예요.</p>
{ko_dst_table()}
<p>유럽은 나라마다 바꾸는 시각이 현지 시각으로는 달라 보이지만, 계산하면 같은 순간(협정 세계시 새벽 1시)에 바뀌어요. 그래서 런던과 파리의 시차는 1년 내내 1시간이에요.</p>
<!--ad-->
<h2>서머타임이 없는 곳: 1년 내내 같은 시차</h2>
{ko_fixed_table()}
<p>호주는 주마다 달라요. 시드니·멜버른은 서머타임을 하지만 브리즈번(퀸즐랜드)은 하지 않아서, 10월부터 4월 사이에는 시드니가 브리즈번보다 1시간 빨라요.</p>
<h2>2026년에 규칙이 바뀐 곳: 캐나다 서부·중부와 모로코</h2>
<p>캐나다 브리티시컬럼비아(밴쿠버)는 2026년 3월에 시계를 앞당긴 뒤로 더 바꾸지 않기로 했고, 앨버타(캘거리)와 매니토바(위니펙)도 같은 길을 갔어요. 모로코는 2026년 9월 20일에 서머타임을 끝내고 1년 내내 UTC+0을 써요. 그래서 2026년 11월 1일부터는 밴쿠버와 로스앤젤레스가 1시간 차이가 나요. 밴쿠버는 서울보다 계속 16시간 늦고, 로스앤젤레스는 17시간 늦어져요(계산하면).</p>
<p>이 변경은 IANA 시간대 자료 2026b~2026e판에 들어갔어요. 브라우저나 앱의 시간대 자료가 그보다 예전 것이면 이 도시들의 시각이 1시간 틀릴 수 있어요. <a href="/ko/world-clock/">세계 시간</a> 화면은 예전 자료를 쓰는 브라우저에서도 바뀐 규칙으로 계산하고, 그런 브라우저라는 것을 알려 줘요.</p>
<h2>시차를 직접 계산하는 법</h2>
<p>한국 시각은 UTC+9예요. 상대 도시의 UTC 기준 시각을 빼면 시차가 나와요. 뉴욕이 서머타임 중(UTC−4)이면 9 − (−4) = 13시간, 서머타임이 끝나면(UTC−5) 9 − (−5) = 14시간이에요. 서울 오후 10시는 뉴욕 서머타임 중 같은 날 오전 9시, 겨울에는 오전 8시예요.</p>
<p>바뀌는 날 근처에 약속을 잡을 때는 날짜를 넣어 확인하는 게 안전해요. <a href="/ko/world-clock/">세계 시간</a>의 '회의 시간 찾기'에서 날짜를 고르면 그날의 시차로 모두 근무 시간인 때를 칠해 줘요.</p>''',
    'sources': [S['dst_us'], S['dst_uk'], S['dst_nsw'], S['dst_nz'], S['tz_2026'], ('IANA tz 2026e 발표', 'https://www.iana.org/time-zones/releases/2026e')],
    'try': ('도시를 더해 지금 시차와 다음 바뀌는 날을 바로 보세요.', 'world-clock/', '세계 시간 열기'),
})

ARTICLES['ko'].append({
    'slug': 'timer-background', 'pair': 'timer-in-background-tab', 'published': '2026-10-14',
    'title': '다른 탭·화면 꺼짐에서 타이머가 늦거나 안 울리는 이유 | 한바퀴',
    'desc': '웹 타이머가 다른 탭에서 1분씩 늦게 울리거나 휴대폰 화면이 꺼지면 멈추는 이유를 크롬 문서로 설명하고, 제때 울리게 쓰는 법을 정리했어요.',
    'h1': '다른 탭·화면 꺼짐에서 타이머가 늦거나 안 울리는 이유',
    'answer': '브라우저는 숨은 탭에서 되풀이되는 작업을 늦추고(크롬은 조건에 따라 1분에 한 번만 확인), 휴대폰 화면이 꺼지면 페이지를 아예 멈추기도 해요. 그래서 1초마다 숫자를 하나씩 빼는 웹 타이머는 늦게 울리거나 멈춰요. 끝나는 시각을 기준으로 계산하고 끝나는 순간에 한 번만 알람을 걸면 숨은 탭에서도 제때 울려요. 다만 창을 닫거나 기기가 잠들면 어떤 웹 타이머도 울리지 않아요.',
    'body': f'''<h2>숨은 탭에서 타이머가 늦어지는 규칙(크롬)</h2>
<p>크롬 개발 문서에 따르면 탭이 숨어 있을 때 페이지의 타이머(setTimeout·setInterval)는 단계별로 늦춰져요({_F['chrome_throttling']['checked']} 확인).</p>
<ul><li>페이지가 보이거나, 최근 30초 안에 소리를 냈으면: 거의 늦추지 않아요. 소리 없는 오디오는 치지 않아요.</li>
<li>그렇지 않으면: 타이머를 <b>1초에 한 번</b> 몰아서 확인해요.</li>
<li>숨은 지 5분이 넘고, 타이머를 이어서 다섯 번 이상 걸었고, 30초 넘게 조용하면: <b>1분에 한 번</b>만 확인해요(크롬 88부터).</li></ul>
<p>1초마다 다음 1초를 예약하는 방식(남은 시간에서 1씩 빼기)의 타이머는 이 세 번째 경우에 걸리기 쉬워요. 다른 탭에 5분 넘게 있으면 숫자가 1분씩 건너뛰고, 끝나는 소리도 1분 가까이 늦을 수 있어요. 사파리·파이어폭스의 숫자는 이 문서에 없어서 여기 적지 않았어요.</p>
<h2>휴대폰 화면이 꺼지면 아예 멈출 수 있어요</h2>
<p>크롬 문서는 브라우저가 CPU·배터리를 아끼려고 페이지를 멈춘 상태로 둔다고 설명해요(문서의 말로는 '얼림, frozen'). 멈춰 있는 동안에는 페이지의 타이머가 돌지 않아요. 휴대폰에서 다른 앱으로 가거나 화면이 꺼지면 이런 일이 생길 수 있고, 몇 초 뒤에 멈추는지는 브라우저마다 달라서 여기 적지 않았어요.</p>
<!--ad-->
<h2>제때 울리게 만드는 법</h2>
<ol><li><b>끝나는 시각으로 계산하기.</b> '남은 시간 = 끝나는 시각 − 지금'으로 매번 다시 구하면, 화면이 늦게 그려져도 틀린 숫자가 나오지 않아요.</li>
<li><b>끝나는 순간에 한 번만 알람 걸기.</b> 1초마다 다시 예약하는 방식이 아니라서 '1분에 한 번' 규칙에 걸리지 않고, 숨은 탭에서도 1초 안팎으로 울려요.</li>
<li><b>새로고침에 대비해 끝나는 시각 적어 두기.</b> 다시 열었을 때 이어 가거나, 이미 끝났으면 몇 분 전에 끝났는지 알릴 수 있어요.</li>
<li><b>휴대폰은 화면 켜 두기.</b> 브라우저의 화면 켜 두기 기능(Screen Wake Lock)은 크롬 84, 사파리 16.4, iOS 사파리 18.4, 파이어폭스 126부터 돼요(MDN 호환표).</li></ol>
<p><a href="/ko/">한바퀴 타이머</a>는 1~3번을 그대로 쓰고, 4번은 '화면·소리 설정'에서 켤 수 있어요.</p>
<h2>그래도 안 되는 것</h2>
<p>창을 닫거나, 브라우저를 끄거나, 컴퓨터가 잠자기에 들어가면 웹페이지는 소리를 낼 수 없어요. 아침 기상처럼 놓치면 안 되는 알람은 휴대폰의 기본 알람 앱이 맞아요.</p>''',
    'sources': [S['chrome_throttling'], S['page_lifecycle'], S['wake_lock']],
    'try': ('다른 탭으로 가 보고, 제때 울리는지 직접 확인해 보세요.', '', '타이머 열기'),
})

ARTICLES['ko'].append({
    'slug': 'lap-split', 'pair': 'lap-vs-split-time', 'published': '2026-10-14',
    'title': '스톱워치 랩 타임과 스플릿 타임 차이 - 예시로 보기 | 한바퀴',
    'desc': '랩 타임은 한 바퀴 동안 걸린 시간, 스플릿 타임은 시작부터 그 지점까지 걸린 시간이에요. 같은 기록을 두 가지로 읽는 법과 가장 빠른 랩 찾는 법을 예시로 정리했어요.',
    'h1': '스톱워치 랩 타임과 스플릿 타임, 무엇이 다를까',
    'answer': '랩 타임은 바로 앞 기록부터 이번 기록까지, 한 구간에 걸린 시간이에요. 스플릿 타임은 시작부터 그 지점까지 쌓인 시간이에요. 카시오 시계 설명서도 이렇게 나눠 써요. 한바퀴 스톱워치는 두 값을 나란히 보여 주고, 표에서는 스플릿을 \'누적\'이라고 적어요.',
    'body': '''<h2>같은 기록을 두 가지로 읽기</h2>
<p>400m 트랙을 네 바퀴 돈다고 해 볼게요. 바퀴를 돌 때마다 '랩'을 눌렀어요.</p>
<div class="tbl"><table><thead><tr><th>랩</th><th>누른 순간의 시계(스플릿)</th><th>그 바퀴에 걸린 시간(랩)</th></tr></thead><tbody>
<tr><td>1</td><td>1:52.40</td><td>1:52.40</td></tr>
<tr><td>2</td><td>3:47.15</td><td>1:54.75</td></tr>
<tr><td>3</td><td>5:39.90</td><td>1:52.75</td></tr>
<tr><td>4</td><td>7:28.30</td><td>1:48.40</td></tr></tbody></table></div>
<p>스플릿은 점점 커져요. 랩은 각 바퀴의 빠르기라서 바퀴끼리 비교할 수 있어요. 이 예에서는 4번 랩(1:48.40)이 가장 빠르고 2번 랩(1:54.75)이 가장 느려요. 랩을 다 더하면 마지막 스플릿(7:28.30)과 같아요.</p>
<!--ad-->
<h2>언제 무엇을 보나</h2>
<ul><li><b>페이스를 고르게 했는지</b>: 랩끼리 비교해요. 랩 차이가 작을수록 고르게 달렸다는 뜻이에요.</li>
<li><b>목표 기록에 맞게 가는지</b>: 스플릿을 봐요. 목표가 8분이면 2바퀴째 스플릿이 4분 안쪽인지 보면 돼요.</li>
<li><b>끝까지 버텼는지</b>: 마지막 랩이 앞 랩보다 빨랐는지 봐요(위 예처럼).</li></ul>
<h2>말이 헷갈리는 이유</h2>
<p>제조사마다, 종목마다 같은 말을 조금 다르게 쓰기도 해요. 그래서 기록을 넘길 때는 '랩(구간)'인지 '누적'인지 함께 적는 게 안전해요. 한바퀴 스톱워치의 'CSV 저장'은 두 값을 모두, 밀리초까지 담아요.</p>
<h2>한바퀴 스톱워치에서</h2>
<p>재는 중에 '랩'(키보드 L)을 누르면 표 맨 위에 새 줄이 생기고, 시계판 테두리에 그 순간의 초 자리가 점으로 찍혀요. 랩이 둘 이상이면 가장 빠른 랩과 가장 느린 랩에 표시가 붙어요.</p>''',
    'sources': [S['lap_split']],
    'try': ('랩을 몇 번 눌러 보고, 가장 빠른 랩 표시를 확인해 보세요.', 'stopwatch/', '스톱워치 열기'),
})

ARTICLES['en'].append({
    'slug': 'timer-in-background-tab', 'pair': 'timer-background', 'published': '2026-10-14',
    'title': 'Why Online Timers Run Late in a Background Tab | Oneturn',
    'desc': 'Why a web timer can ring up to a minute late in another tab or stop when a phone screen turns off, explained from Chrome\'s documentation, and how to avoid it.',
    'h1': 'Why online timers run late in a background tab',
    'answer': 'Browsers slow down repeating timers in hidden tabs (Chrome can drop them to once a minute) and may freeze pages when a phone screen turns off. A web timer that subtracts one second at a time can then ring late or stop. Working from the end time and setting a single alarm for the moment it ends keeps it on time in a hidden tab, but no web timer can ring once the tab is closed or the device sleeps.',
    'body': f'''<h2>Chrome's rules for timers in hidden tabs</h2>
<p>Chrome's developer documentation describes three levels for page timers (setTimeout and setInterval) when a tab is hidden ({_F['chrome_throttling']['checked']}):</p>
<ul><li>If the page is visible, or has played sound in the last 30 seconds, timers are barely slowed. A silent audio track does not count.</li>
<li>Otherwise timers are checked in batches <b>once per second</b>.</li>
<li>If the page has been hidden for more than 5 minutes, the timer has been chained five or more times, and the page has been silent for 30 seconds, timers are checked only <b>once per minute</b> (since Chrome 88).</li></ul>
<p>A countdown that re-arms itself every second falls into that last group. Its numbers jump a minute at a time and the end sound can be close to a minute late. The documentation does not give figures for Safari or Firefox, so they are not stated here.</p>
<h2>Phones can pause the page completely</h2>
<p>The same documentation explains that browsers "freeze" pages to save CPU and battery, and that JavaScript timers do not run while a page is frozen. This can happen when you switch apps or the screen turns off. How soon each browser freezes a page was not checked.</p>
<!--ad-->
<h2>How to keep a web timer on time</h2>
<ol><li><b>Work from the end time.</b> Recalculate "time left = end time − now" on every update, so a late redraw never shows a wrong number.</li>
<li><b>Set one alarm for the end.</b> A single, unchained timer is not subject to the once-a-minute rule and fires within about a second in a hidden tab.</li>
<li><b>Save the end time.</b> After a refresh the timer can carry on, or say how long ago it finished.</li>
<li><b>Keep the phone screen on.</b> The Screen Wake Lock API works in Chrome 84, Safari 16.4, Safari on iOS 18.4 and Firefox 126 or later (MDN compatibility data).</li></ol>
<p>The <a href="/">Oneturn timer</a> does the first three, and the fourth is a switch under Screen and sound settings.</p>
<h2>What still will not work</h2>
<p>Once you close the tab, quit the browser or the computer sleeps, a web page cannot make a sound. For a wake-up alarm you cannot miss, use your phone's clock app.</p>''',
    'sources': [S['chrome_throttling'], S['page_lifecycle'], S['wake_lock']],
    'try': ('Switch to another tab and see it ring on time.', '', 'Open the timer'),
})

ARTICLES['en'].append({
    'slug': 'daylight-saving-time-2026', 'pair': None, 'published': '2026-10-14',
    'title': 'Daylight Saving Time 2026–2027: Dates and Shifting Gaps | Oneturn',
    'desc': 'When clocks change in 2026 and 2027 in the US, UK, EU, Australia and New Zealand, how the gaps between cities shift for a few weeks, and who stopped changing.',
    'h1': 'Daylight saving time 2026–2027: when clocks change and how time differences shift',
    'answer': 'In 2026 the US falls back on November 1 and springs forward again on March 14, 2027; the UK and EU fall back on October 25, 2026 and go forward on March 28, 2027. Because these dates differ, the gap between New York and London is 4 hours instead of 5 for two weeks in March and one week around the start of November. British Columbia, Alberta and Manitoba no longer change their clocks, and Morocco is on UTC+0 all year.',
    'body': f'''<h2>When the clocks change</h2>
<p>The times are local, as shown on the clock just before the change. In the US the rule covers most states; Hawaii and most of Arizona do not change. They are worked out from the IANA time zone database and match the official notices for the US, the UK, New South Wales and New Zealand (sources at the end).</p>
{en_dst_table()}
<h2>Why the gap between two cities changes for a few weeks</h2>
<p>North America and Europe do not switch on the same day, and the southern hemisphere switches the other way round. For a short stretch, the usual gap is off by an hour. The table shows the gap on a few dates in 2026:</p>
{en_pairs_table()}
<!--ad-->
<p>If you schedule a call across these weeks, check the date, not just the usual gap. The <a href="/world-clock/">meeting planner</a> works on the exact date you pick.</p>
<h2>Places that stopped changing their clocks in 2026</h2>
<p>According to the IANA time zone database change log, British Columbia (Vancouver) has stayed on UTC−7 since its March 2026 spring forward, Alberta (Calgary, Edmonton) and the Northwest Territories on UTC−6, and Manitoba (Winnipeg) on UTC−5. Morocco ended daylight saving time on September 20, 2026 and stays on UTC+0. From November 1, 2026, Vancouver is therefore an hour ahead of Los Angeles for the winter.</p>
<p>These rules arrived in IANA releases 2026b to 2026e. Devices and browsers with older time zone data can show these places an hour off. The <a href="/world-clock/">world clock</a> applies the new rules even in older browsers and tells you when your browser is behind.</p>
<h2>Working it out yourself</h2>
<p>Write each city as an offset from UTC, then subtract. New York in winter is UTC−5 and London UTC+0, so London is 5 hours ahead. On March 20, 2026 New York is already on UTC−4 while London is still on UTC+0, so the gap is 4 hours.</p>''',
    'sources': [S['dst_us'], S['dst_uk'], S['dst_nsw'], S['dst_nz'], S['tz_2026'], ('IANA tz 2026e release', 'https://www.iana.org/time-zones/releases/2026e')],
    'try': ('Add the cities you work with and see their next clock change.', 'world-clock/', 'Open the world clock'),
})

ARTICLES['en'].append({
    'slug': 'lap-vs-split-time', 'pair': 'lap-split', 'published': '2026-10-14',
    'title': 'Lap Time vs Split Time on a Stopwatch, with Examples | Oneturn',
    'desc': 'Lap time is how long one lap took; split time is the total from the start to that point. How to read the same laps both ways and spot your fastest lap.',
    'h1': 'Lap time vs split time on a stopwatch',
    'answer': 'Lap time is the time for one segment, from the previous mark to this one. Split time is the total time from the start to that mark. Casio\'s watch manuals use the words this way. The Oneturn stopwatch shows both side by side and labels the split as Total.',
    'body': '''<h2>One set of laps, read two ways</h2>
<p>Say you run four laps of a 400 m track and press Lap at the end of each.</p>
<div class="tbl"><table><thead><tr><th>Lap</th><th>Clock when pressed (split)</th><th>Time for that lap (lap)</th></tr></thead><tbody>
<tr><td>1</td><td>1:52.40</td><td>1:52.40</td></tr>
<tr><td>2</td><td>3:47.15</td><td>1:54.75</td></tr>
<tr><td>3</td><td>5:39.90</td><td>1:52.75</td></tr>
<tr><td>4</td><td>7:28.30</td><td>1:48.40</td></tr></tbody></table></div>
<p>Splits only grow. Laps tell you the pace of each lap, so you can compare them: here lap 4 (1:48.40) is the fastest and lap 2 (1:54.75) the slowest. The laps add up to the last split, 7:28.30.</p>
<!--ad-->
<h2>Which one to look at</h2>
<ul><li><b>Was my pace even?</b> Compare laps. The smaller the spread, the more even the run.</li>
<li><b>Am I on target?</b> Look at splits. For an 8:00 target, the split after lap 2 should be under 4:00.</li>
<li><b>Did I finish strong?</b> Check whether the last lap beat the earlier ones, as in the example.</li></ul>
<h2>Why the words get mixed up</h2>
<p>Different makers and sports sometimes use the words a little differently. When you share times, say whether each figure is a lap or a running total. The Oneturn stopwatch's CSV export includes both, down to the millisecond.</p>
<h2>On the Oneturn stopwatch</h2>
<p>Press Lap (or L on a keyboard) while it runs and a new row appears at the top of the table, with a dot on the dial's rim at that second. With two or more laps, the fastest and slowest are labeled.</p>''',
    'sources': [S['lap_split']],
    'try': ('Press Lap a few times and watch the fastest lap get labeled.', 'stopwatch/', 'Open the stopwatch'),
})
