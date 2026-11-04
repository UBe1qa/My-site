"""count.py 결과(part*.pkl)를 합쳐 '국면(EPD) → 다음 수 통계'로 바꾸고 사이트용 조각 JSON(data/p/xx.json)을 만든다.
쓰는 법(저장소 밖 빈 폴더에서, python-chess 필요):
  python3 -I chess/_dev/data/count.py <lichess.pgn.zst> <counts 폴더>
  python3 -I chess/_dev/data/make_data.py <counts 폴더> chess/data
조각 = {"e": {epd: [둔 수 합계 12칸, 온 판 결과 12칸, [수, 백승·무·흑승 × 레이팅대 4개]...]}, "n": {epd: [ECO, 영어 이름, 한국어 이름]}}
레이팅대 = 두 사람 레이팅 평균 <1200 / 1200-1599 / 1600-1999 / 2000+. 해설 slug(4번째 칸)는 _dev/build.py가 더한다."""
import sys, glob, pickle, json, os, io, csv, collections, datetime
import chess, chess.pgn

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from names_ko import ko_name  # noqa: E402

MIN_NODE = 20        # 이 판 수보다 적은 수순은 버린다
MIN_POS = 60         # 싣는 국면의 최소 판 수(레이팅대 합)
MIN_MOVE = 6         # 싣는 수의 최소 판 수
SHARDS = 256


def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & 0xffffffff
    return h


def names():
    out = {}
    for f in sorted(glob.glob(os.path.join(HERE, '..', 'openings', '?.tsv'))):
        for r in csv.DictReader(open(f, encoding='utf-8'), delimiter='\t'):
            b = chess.Board()
            g = chess.pgn.read_game(io.StringIO(r['pgn']))
            for mv in g.mainline_moves():
                b.push(mv)
            e = b.epd()
            if e not in out:          # 같은 국면에 이름이 여럿이면 목록에서 먼저 나온 것
                out[e] = [r['eco'], r['name'], ko_name(r['name'])]
    return out


def main(src, out):
    merged, games = {}, 0
    for p in sorted(glob.glob(src + '/part*.pkl')):
        n, c = pickle.load(open(p, 'rb'))
        games += n
        for k, v in c.items():
            m = merged.get(k)
            if m is None:
                merged[k] = v
            else:
                for i in range(13):
                    m[i] += v[i]
        del c
    print('판', games, '수순', len(merged), flush=True)
    keys = [k for k, v in merged.items() if v[12] >= MIN_NODE]
    keys.sort(key=lambda k: (k.count(' ') if k else -1, k))
    fen_of = {'': chess.STARTING_FEN}
    epd_of = {'': chess.Board().epd()}
    reached = collections.defaultdict(lambda: [0] * 12)
    moves = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 12))
    bad = 0
    for k in keys:
        v = merged[k]
        if k == '':
            t = reached[epd_of['']]
            for i in range(12):
                t[i] += v[i]
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
        t = reached[e]
        for i in range(12):
            t[i] += v[i]
        pm = moves[epd_of[par]][msan]
        for i in range(12):
            pm[i] += v[i]
    print('읽지 못한 수', bad, '국면', len(reached), flush=True)

    shards = [{'e': {}, 'n': {}} for _ in range(SHARDS)]
    kept = kept_moves = 0
    for e, mv in moves.items():
        played = [0] * 12
        for c in mv.values():
            for i in range(12):
                played[i] += c[i]
        tot = sum(played)
        if tot < MIN_POS:
            continue
        rows = []
        for j, (s, c) in enumerate(sorted(mv.items(), key=lambda x: -sum(x[1]))):
            n = sum(c)
            if n < MIN_MOVE or (j >= 6 and n < tot * 0.004):
                break
            rows.append([s] + c)
        kept += 1
        kept_moves += len(rows)
        shards[fnv(e) % SHARDS]['e'][e] = [played, reached[e]] + rows
    nm = names()
    for e, v in nm.items():
        shards[fnv(e) % SHARDS]['n'][e] = v
    os.makedirs(out + '/p', exist_ok=True)
    size = 0
    for i, sh in enumerate(shards):
        s = json.dumps(sh, separators=(',', ':'), ensure_ascii=False, sort_keys=True)
        size += len(s.encode())
        with open(f'{out}/p/{i:02x}.json', 'w', encoding='utf-8') as f:
            f.write(s)
    meta = {'games': games, 'positions': kept, 'moves': kept_moves, 'names': len(nm),
            'source': 'https://database.lichess.org/ lichess_db_standard_rated_2026-10.pgn.zst (first part)',
            'license': 'CC0 (Lichess game database), CC0 (lichess-org/chess-openings)',
            'bands': ['<1200', '1200-1599', '1600-1999', '2000+'], 'rating': 'average of both players, Lichess ratings',
            'speeds': 'blitz, rapid, classical (bullet, ultrabullet and correspondence left out)',
            'max_ply': 24, 'made': datetime.date.today().isoformat()}
    with open(out + '/meta.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    print('국면', kept, '수', kept_moves, '이름', len(nm), '크기', size // 1024, 'KB', flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
