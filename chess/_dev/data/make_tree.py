"""1단계: 수순 집계(count2.py → merge.py의 part0.pkl)를 '판(EPD) → 다음 수' 그물로 바꾼다.
쓰는 법(저장소 밖 빈 폴더에서, python-chess 필요):
  python3 -I chess/_dev/data/make_tree.py <리체스 part0.pkl> <대회 part0.pkl> <출력 폴더>
출력:
  tree.pkl  = {'games': 판 수, 'otb_games': 판 수,
               'pos': {epd: {'r': 온 판 12칸, 'm': {san: 12칸}, 'o': [(판 수, 수순), ...]}},  # 리체스(레이팅대 <1200·1200-1599·1600-1999·2000+ × 백승·무·흑승), o = 이 판에 오는 수순 중 많은 것 셋
               'otb': {epd: {'r': 12칸, 'm': {san: 12칸}}},            # 대회 중계(<2200·2200-2399·2400-2599·2600+)
               'names': {epd: [ECO, 영어 이름, 한국어 이름]}, 'named_line': {epd: 이름 수순(SAN)}}
  epds.txt  = 엔진 평가를 찾을 판 목록(한 줄에 '찾는 모양<TAB>표준 EPD'). 앙파상 칸을 적는 두 방식을 다 넣는다.
판 id = python-chess epd()(앙파상은 실제로 잡을 수 있을 때만 적음)."""
import sys, os, io, csv, glob, pickle, collections, time
import chess, chess.pgn

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from names_ko import ko_name  # noqa: E402

MIN_NODE = 20


def replay(counts):
    keys = [k for k, v in counts.items() if v[12] >= MIN_NODE]
    keys.sort(key=lambda k: (k.count(' ') if k else -1, k))
    fen_of = {'': chess.STARTING_FEN}
    epd_of = {'': chess.Board().epd()}
    pos = collections.defaultdict(lambda: {'r': [0] * 12, 'm': collections.defaultdict(lambda: [0] * 12)})
    orders = {}          # epd → 이 판에 오는 수순 가운데 판이 많은 것 셋 [(판 수, 수순)]
    bad = 0
    t0 = time.time()
    for i, k in enumerate(keys):
        v = counts[k]
        if k == '':
            r = pos[epd_of['']]['r']
            for j in range(12):
                r[j] += v[j]
            continue
        par, _, san = k.rpartition(' ')
        pf = fen_of.get(par)
        if pf is None:
            continue
        b = chess.Board(pf)
        try:
            mv = b.parse_san(san)
        except Exception:
            bad += 1
            continue
        msan = b.san(mv)
        b.push(mv)
        fen_of[k] = b.fen()
        e = b.epd()
        epd_of[k] = e
        r = pos[e]['r']
        for j in range(12):
            r[j] += v[j]
        pm = pos[epd_of[par]]['m'][msan]
        for j in range(12):
            pm[j] += v[j]
        o = orders.setdefault(e, [])
        o.append((v[12], k))
        if len(o) > 3:
            o.sort(reverse=True)
            o.pop()
        if i % 500000 == 0:
            print(f'  {i:,}/{len(keys):,} {time.time() - t0:.0f}s', flush=True)
    out = {e: {'r': d['r'], 'm': dict(d['m']), 'o': sorted(orders.get(e, []), reverse=True)} for e, d in pos.items()}
    print('수순', len(keys), '판', len(out), '읽지 못한 수', bad, flush=True)
    return out


def names():
    nm, line_of, along = {}, {}, set()
    for f in sorted(glob.glob(os.path.join(HERE, '..', 'openings', '?.tsv'))):
        for r in csv.DictReader(open(f, encoding='utf-8'), delimiter='\t'):
            b = chess.Board()
            g = chess.pgn.read_game(io.StringIO(r['pgn']))
            sans = []
            for mv in g.mainline_moves():
                sans.append(b.san(mv))
                b.push(mv)
                along.add(b.epd())
            e = b.epd()
            if e not in nm:            # 같은 판에 이름이 여럿이면 목록에서 먼저 나온 것
                nm[e] = [r['eco'], r['name'], ko_name(r['name'])]
                line_of[e] = ' '.join(sans)
    return nm, line_of, along


def variants(epd):
    # 표준 EPD 하나 → 평가 DB에서 쓸 수 있는 모양들(앙파상 칸을 늘 적는 방식 포함)
    out = {epd}
    b = chess.Board(epd + ' 0 1')
    # 앞 수가 두 칸 폰 전진이었으면 그 칸을 적는 FEN도 찾는다(잡을 수 없어도 적는 DB가 있다)
    turn_rank = 5 if b.turn == chess.WHITE else 2   # 백 차례면 흑 폰이 7→5로 왔다: 지나친 칸은 6번째 줄(인덱스 5)
    pawn_rank = 4 if b.turn == chess.WHITE else 3
    them = not b.turn
    parts = epd.split(' ')
    if parts[3] == '-':
        for f in range(8):
            sq = chess.square(f, pawn_rank)
            if b.piece_at(sq) == chess.Piece(chess.PAWN, them):
                ep = chess.square(f, turn_rank)
                behind = chess.square(f, turn_rank + (1 if b.turn == chess.WHITE else -1))
                if b.piece_at(ep) is None and b.piece_at(behind) is None:
                    v = ' '.join(parts[:3] + [chess.square_name(ep)])
                    # 그 칸으로 앙파상을 실제로 잡을 수 있으면 다른 판이다(그 판은 따로 제 EPD가 있다)
                    if not chess.Board(v + ' 0 1').has_legal_en_passant():
                        out.add(v)
    return out


def main(src, otb_src, outdir):
    os.makedirs(outdir, exist_ok=True)
    games, c = pickle.load(open(src, 'rb'))
    print('리체스 판', games, flush=True)
    pos = replay(c)
    del c
    og, oc = pickle.load(open(otb_src, 'rb'))
    print('대회 판', og, flush=True)
    otb = replay(oc)
    nm, line_of, along = names()
    tree = {'games': games, 'otb_games': og, 'pos': pos, 'otb': otb, 'names': nm, 'named_line': line_of}
    pickle.dump(tree, open(f'{outdir}/tree.pkl', 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
    want = set(pos) | set(otb) | along
    n = 0
    with open(f'{outdir}/epds.txt', 'w') as f:
        for e in want:
            for v in variants(e):
                f.write(f'{v}\t{e}\n')
                n += 1
    print('평가 찾을 판', len(want), '찾는 모양', n, '이름', len(nm), flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
