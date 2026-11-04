"""가이드 글(숫자 글). 2026-11-04부터 도구 사이트의 가이드 글은 루멘랩 홈(lumenlab.page/guides/chess/<글>/)이 읽어 싣는 원본이다.
여기서는 본문만 만든다(build.py가 틀에 담고, 배포하지 않으며 sitemap에도 넣지 않는다. 옛 주소는 _redirects가 홈으로).
숫자와 '많아진다·줄어든다' 같은 방향은 모두 data/p에서 계산한다. 글이 말하는 방향이 데이터와 어긋나면 build.py가 멈춘다(want())."""
from html import escape as esc

SLUG = 'openings-by-rating'
PUBLISHED = '2026-11-04'

META = {
    'en': {'title': 'Chess Openings by Rating: What 17.4M Lichess Games Show',
           'h1': 'Which chess openings do players use at each rating?',
           'desc': 'How the openings people play change from under 1200 to 2000+, counted from 17.4 million rated Lichess games: first moves, 31 openings, results and draws.'},
    'ko': {'title': '레이팅별로 많이 두는 체스 오프닝: 리체스 1,740만 판',
           'h1': '레이팅마다 어떤 체스 오프닝을 둘까?',
           'desc': '1200 미만부터 2000 이상까지 레이팅에 따라 두는 오프닝이 어떻게 바뀌는지, 리체스 레이팅 대국 1,740만 판으로 셌어요. 첫 수, 오프닝 31개, 결과와 무승부.'},
}
INDEX = {
    'en': {'title': 'Chess Opening Guides | Fewmoves', 'h1': 'Guides',
           'desc': 'Articles on chess openings, written from the numbers in millions of rated Lichess games.',
           'lead': 'Articles built on the same numbers as the explorer.'},
    'ko': {'title': '체스 오프닝 가이드 | 외울수', 'h1': '가이드',
           'desc': '리체스 레이팅 대국 수백만 판의 숫자로 쓴 체스 오프닝 글이에요.',
           'lead': '탐색기와 같은 숫자로 쓴 글이에요.'},
}


def body(lang, D):
    """D = build.py가 계산한 숫자: games, bands, first(수별 4칸 비율), first_white, rows(오프닝 31개), rise, fall, score_gap, draws, top_low."""
    p, pct, n_ = D['prefix'], D['pct'], D['count']
    B = D['bands']
    th = ''.join(f'<th scope="col">{esc(b)}</th>' for b in B)
    first_rows = ''.join(f'<tr><th scope="row"><span class="san">1.{esc(s)}</span></th>' + ''.join(f'<td>{pct(v, 1)}</td>' for v in vs) + '</tr>' for s, vs in D['first'])
    o_rows = ''.join(f'<tr><th scope="row"><a href="{p}openings/{r["slug"]}/">{esc(r["name"][lang])}</a></th>' + ''.join(f'<td>{pct(v, 1)}</td>' for v in r['share']) + '</tr>' for r in D['rows'])
    sc_rows = ''.join(f'<tr><th scope="row"><a href="{p}openings/{r["slug"]}/">{esc(r["name"][lang])}</a></th>' + ''.join(f'<td>{pct(v, 1)}</td>' for v in r['score']) + '</tr>' for r in D['score_gap'])
    rise = D['rise']
    fall = D['fall']
    e4, d4 = D['e4'], D['d4']
    dr = D['draws']
    low = D['top_low']
    sic = D['by']['sicilian-defense']
    def names(rows, l):
        nm = [f'<a href="{p}openings/{r["slug"]}/">{esc(r["name"][l])}</a>' for r in rows]
        if l == 'ko':
            return ', '.join(nm)
        return nm[0] if len(nm) == 1 else ', '.join(nm[:-1]) + ' and ' + nm[-1]
    ups = [r for r in D['score_gap'] if r['score'][0] > r['score'][3]]
    downs = [r for r in D['score_gap'] if r['score'][0] < r['score'][3]]
    up_ko, down_ko, up_en, down_en = names(ups, 'ko'), names(downs, 'ko'), names(ups, 'en'), names(downs, 'en')
    if lang == 'ko':
        def li_r(r):
            return f'<li><a href="{p}openings/{r["slug"]}/">{esc(r["name"]["ko"])}</a>: 1200 미만 {pct(r["share"][0], 2)} → 2000 이상 {pct(r["share"][3], 2)}</li>'
        return f'''<p class="answer">리체스 레이팅 대국 {n_(D['games'])} 판을 세어 보면, 1200 미만에서는 판의 {pct(e4[0])}가 1.e4로 시작하지만 2000 이상에서는 {pct(e4[3])}예요. 시실리안은 판의 {pct(sic['share'][0])}에서 {pct(sic['share'][3])}로 늘고, {esc(fall[0]['name']['ko'])}·{esc(fall[1]['name']['ko'])}처럼 레이팅이 오를수록 드물어지는 오프닝도 뚜렷해요.</p>
<h2>자료: 무엇을 셌나</h2>
<p>리체스가 공개한 2026년 10월 레이팅 대국 기록의 앞부분을 받아 블리츠·래피드·클래식만 셌어요(불릿·통신 대국 제외). 레이팅대는 두 사람 레이팅의 평균으로 나눴고, 판 수는 1200 미만 {n_(D['band_n'][0])}, 1200–1599 {n_(D['band_n'][1])}, 1600–1999 {n_(D['band_n'][2])}, 2000 이상 {n_(D['band_n'][3])} 판이에요. 비율은 모두 '그 레이팅대 판 가운데 그 국면에 온 판'이에요. 다른 순서로 같은 국면에 온 판도 같이 셌어요.</p>
<h2>첫 수: 레이팅이 오를수록 1.e4가 줄어요</h2>
<div class="tbl"><table><thead><tr><th scope="col">첫 수</th>{th}</tr></thead><tbody>{first_rows}</tbody></table></div>
<p>1.e4는 {pct(e4[0])} → {pct(e4[3])}로 줄고, 1.d4는 {pct(d4[0])} → {pct(d4[3])}로 늘어요. 1.Nf3·1.c4처럼 바로 중앙 폰을 밀지 않는 수도 2000 이상에서 눈에 띄게 많아져요. 레이팅이 낮을수록 상대가 1.e4를 둘 가능성이 크니, 흑으로는 1.e4 대비부터 하는 게 시간을 아끼는 길이에요.</p>
<h2>오프닝 31개, 레이팅대별 비율</h2>
<p>외울수 해설이 있는 오프닝 31개가 각 레이팅대 판에서 얼마나 나오는지예요(전체에서 많이 나온 순). 오프닝 이름을 누르면 해설과 탐색기가 열려요.</p>
<div class="tbl"><table><thead><tr><th scope="col">오프닝</th>{th}</tr></thead><tbody>{o_rows}</tbody></table></div>
<h2>레이팅이 오를수록 많아지는 오프닝</h2>
<ul>{''.join(li_r(r) for r in rise)}</ul>
<p>이론이 깊은 갈래(나이도르프, 킹스 인디언, 님조 인디언 같은)는 1200 미만에서는 거의 안 나와요. 그 레이팅대에서는 상대가 그 수순까지 따라와 주지 않기 때문이에요. 이런 오프닝을 외우는 건 레이팅이 오른 뒤에 해도 늦지 않아요.</p>
<h2>레이팅이 오를수록 줄어드는 오프닝</h2>
<ul>{''.join(li_r(r) for r in fall)}</ul>
<p>{esc(fall[0]['name']['ko'])}처럼 일찍 비숍이나 퀸을 꺼내는 수, 대칭으로 따라 두는 수가 낮은 레이팅에서 훨씬 많아요. 1600 아래에서 둔다면 이런 오프닝을 상대로 무엇을 할지 먼저 정해 두는 게 좋아요.</p>
<h2>1600 아래에서 가장 많이 만나는 오프닝</h2>
<p>1200 미만과 1200–1599를 합쳐 가장 많이 나온 다섯 개예요: {', '.join(f'<a href="{p}openings/{r["slug"]}/">{esc(r["name"]["ko"])}</a>' for r in low)}. 이 다섯 개의 첫 몇 수와 흔한 함정만 알아도 실전 오프닝의 큰 몫을 덮어요.</p>
<h2>결과: 백 점수가 레이팅에 따라 갈리는 오프닝</h2>
<p>백 점수는 백이 이기면 1, 비기면 0.5로 쳐서 평균을 낸 값이에요(50%면 반반). 1200 미만과 2000 이상의 차이가 큰 오프닝이에요.</p>
<div class="tbl"><table><thead><tr><th scope="col">오프닝(백 점수)</th>{th}</tr></thead><tbody>{sc_rows}</tbody></table></div>
<p>같은 오프닝이라도 레이팅대에 따라 결과가 꽤 달라요. 백이 낮은 레이팅에서 더 잘하는 오프닝: {up_ko}. 높은 레이팅에서 더 잘하는 오프닝: {down_ko}. 낮은 레이팅에서는 받는 쪽이 정확한 응수를 못 찾아 점수가 한쪽으로 쏠리고, 높은 레이팅으로 갈수록 그 쏠림이 바뀌거나 줄어요. 다만 이 숫자는 그 레이팅대 사람들끼리 둔 결과라서 수 자체가 좋은지 나쁜지(엔진 평가)와는 다를 수 있어요.</p>
<h2>2000 이상에서 무승부가 늘어요</h2>
<p>무승부는 1200 미만 {pct(dr[0], 1)}, 1200–1599 {pct(dr[1], 1)}, 1600–1999 {pct(dr[2], 1)}, 2000 이상 {pct(dr[3], 1)}예요. 블리츠·래피드가 대부분이라 전체 무승부는 적어요. 2000 이상에서는 판을 가르는 큰 실수가 줄어 비기는 판이 눈에 띄게 많아져요.</p>
<h2>내 레퍼토리에 쓰는 법</h2>
<ul><li>내 레이팅대를 고르고 <a href="{p}">탐색기</a>에서 내 오프닝의 첫 다섯 수를 따라가 보세요. 비율이 큰 응수부터 준비하면 돼요.</li>
<li>낮은 레이팅에서 자주 나오는 오프닝은 함정까지 알아 두세요. 오프닝 해설마다 실전에서 걸리는 함정을 판에서 볼 수 있어요.</li>
<li><a href="{p}practice/">연습</a>에서 내 레이팅대 상대가 실제로 두는 비율대로 응수를 받아 보며 외우세요. 틀린 수는 정해진 날에 다시 나와요.</li></ul>
<p class="note">숫자는 리체스 레이팅 기준이에요. 같은 사람이라도 체스닷컴 레이팅은 대체로 더 낮게 나와요. 센 방법은 <a href="{p}about/">소개</a>에 있어요.</p>'''

    def li_r(r):
        return f'<li><a href="{p}openings/{r["slug"]}/">{esc(r["name"]["en"])}</a>: {pct(r["share"][0], 2)} of games under 1200 → {pct(r["share"][3], 2)} at 2000+</li>'
    return f'''<p class="answer">In {n_(D['games'])} rated Lichess games, 1.e4 starts {pct(e4[0])} of games under 1200 but only {pct(e4[3])} at 2000+. The Sicilian grows from {pct(sic['share'][0])} of games to {pct(sic['share'][3])}, while openings like the {esc(fall[0]['name']['en'])} and the {esc(fall[1]['name']['en'])} get rarer as ratings rise.</p>
<h2>The data</h2>
<p>We took the first part of the October 2026 rated games file that Lichess publishes and counted blitz, rapid and classical games (bullet and correspondence left out). Rating levels use the average of both players’ ratings: {n_(D['band_n'][0])} games under 1200, {n_(D['band_n'][1])} at 1200–1599, {n_(D['band_n'][2])} at 1600–1999 and {n_(D['band_n'][3])} at 2000+. Every share below is “games at that level that reached the position”, including games that got there by a different move order.</p>
<h2>First moves: less 1.e4 as ratings rise</h2>
<div class="tbl"><table><thead><tr><th scope="col">First move</th>{th}</tr></thead><tbody>{first_rows}</tbody></table></div>
<p>1.e4 drops from {pct(e4[0])} to {pct(e4[3])} and 1.d4 rises from {pct(d4[0])} to {pct(d4[3])}. Quieter first moves such as 1.Nf3 and 1.c4 also become much more common at 2000+. The lower your rating, the more likely your opponent opens 1.e4, so as Black your time is best spent on your answer to 1.e4 first.</p>
<h2>31 openings at each rating</h2>
<p>How often each of the 31 openings with a Fewmoves guide comes up at each level, most played first. Click a name to open its guide and explorer.</p>
<div class="tbl"><table><thead><tr><th scope="col">Opening</th>{th}</tr></thead><tbody>{o_rows}</tbody></table></div>
<h2>Openings that grow with rating</h2>
<ul>{''.join(li_r(r) for r in rise)}</ul>
<p>Deep theoretical lines such as the Najdorf, the King’s Indian and the Nimzo-Indian almost never happen under 1200, because opponents at that level rarely follow the moves that lead there. Learning them can wait until your rating climbs.</p>
<h2>Openings that fade with rating</h2>
<ul>{''.join(li_r(r) for r in fall)}</ul>
<p>Early bishop and queen moves, and openings where both sides copy each other, are far more common at lower ratings. If you play under 1600, decide in advance what you will do against these.</p>
<h2>The openings you meet most under 1600</h2>
<p>Across under-1200 and 1200–1599 games, these five come up most: {', '.join(f'<a href="{p}openings/{r["slug"]}/">{esc(r["name"]["en"])}</a>' for r in low)}. Knowing their first few moves and common traps covers a large share of real games.</p>
<h2>Results: where White’s score depends on rating</h2>
<p>White’s score counts a win as 1 and a draw as 0.5 (50% means even). These are the openings with the biggest gap between under 1200 and 2000+.</p>
<div class="tbl"><table><thead><tr><th scope="col">Opening (White’s score)</th>{th}</tr></thead><tbody>{sc_rows}</tbody></table></div>
<p>The same opening can score quite differently at different levels. White does better at low ratings in {up_en}, and better at high ratings in {down_en}. At low ratings the defending side often misses the accurate reply, which tilts the score; higher up the tilt shrinks or turns. These are results between players at each level, not an engine evaluation of the moves.</p>
<h2>More draws at 2000+</h2>
<p>Draws are {pct(dr[0], 1)} of games under 1200, {pct(dr[1], 1)} at 1200–1599, {pct(dr[2], 1)} at 1600–1999 and {pct(dr[3], 1)} at 2000+. Most games are blitz or rapid, so draws are rare overall. At 2000+ there are fewer of the big mistakes that decide a game, and noticeably more draws.</p>
<h2>Using this for your repertoire</h2>
<ul><li>Pick your rating in the <a href="{p}">explorer</a> and follow your opening for five moves. Prepare the replies with the biggest share first.</li>
<li>For the openings common at your level, learn the traps too. Every opening guide shows the traps that really happen, move by move on the board.</li>
<li>Drill it in the <a href="{p}practice/">trainer</a>, where your opponent plays the replies people at your rating really choose, in the same proportions. Mistakes come back on a schedule.</li></ul>
<p class="note">All ratings are Lichess ratings, which usually run higher than Chess.com ratings for the same player. How we counted is on the <a href="{p}about/">about page</a>.</p>'''
