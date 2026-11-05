# Lichess 기보(zst)를 읽어 앞 MAX_PLY 수까지 '수순 접두사'별 결과를 레이팅대마다 센다.
# 부모 수순이 GATE 판 이상 나온 뒤부터 자식 수순을 센다(드문 줄로 메모리가 터지지 않게).
import sys, re, pickle, multiprocessing as mp, zstandard, time, zlib
NB = 16

MAX_PLY = int(__import__("os").environ.get("MAX_PLY", "32"))
GATE = 6                      # 일꾼 하나 기준
BANDS = (1200, 1600, 2000)    # <1200, 1200-1599, 1600-1999, 2000+
COMMENT = re.compile(r'\{[^}]*\}')
NUMTOK = re.compile(r'^\d+\.+$')
ANNOT = re.compile(r'[?!]+$')

def band(avg):
    if avg < 1200: return 0
    if avg < 1600: return 1
    if avg < 2000: return 2
    return 3

def parse_game(g):
    # g: 게임 하나의 글(머리 + 수순)
    i = g.find('[Event "')
    if i < 0: return None
    ev = g[i+8:g.find('"', i+8)]
    if 'Bullet' in ev or 'Correspondence' in ev or 'Rated' not in ev: return None
    try:
        j = g.find('[WhiteElo "'); we = int(g[j+11:g.find('"', j+11)])
        j = g.find('[BlackElo "'); be = int(g[j+11:g.find('"', j+11)])
    except ValueError:
        return None
    j = g.find('[Result "'); res = g[j+9:g.find('"', j+9)]
    r = 0 if res == '1-0' else 1 if res == '1/2-1/2' else 2 if res == '0-1' else -1
    if r < 0: return None
    k = g.find('\n\n')
    if k < 0: return None
    mt = g[k+2:]
    cut = mt.find(' %d. ' % (MAX_PLY//2 + 1))
    if cut > 0: mt = mt[:cut]
    mt = COMMENT.sub(' ', mt)
    sans = []
    for t in mt.split():
        if NUMTOK.match(t) or t in ('1-0', '0-1', '1/2-1/2', '*') or t.startswith('$'):
            continue
        sans.append(ANNOT.sub('', t))
        if len(sans) >= MAX_PLY: break
    return band((we + be) / 2), r, sans

def worker(q, out_path):
    counts = {'': [0]*13}
    n = 0
    while True:
        batch = q.get()
        if batch is None: break
        for g in batch:
            p = parse_game(g)
            if not p: continue
            b, r, sans = p
            idx = b*3 + r
            node = counts['']
            node[idx] += 1; node[12] += 1
            key = ''
            for s in sans:
                parent_tot = node[12]
                key = key + ' ' + s if key else s
                node = counts.get(key)
                if node is None:
                    if parent_tot < GATE: break
                    node = [0]*13
                    counts[key] = node
                node[idx] += 1; node[12] += 1
            n += 1
    # 합칠 때 메모리가 모자라지 않게 수순 열쇠의 crc32로 NB개 통에 나눠 쓴다. 판 수 n은 0번 통에만.
    bk = [dict() for _ in range(NB)]
    for k, v in counts.items():
        bk[zlib.crc32(k.encode()) % NB][k] = v
    del counts
    for b in range(NB):
        with open(f'{out_path}.b{b:02d}', 'wb') as f:
            pickle.dump((n if b == 0 else 0, bk[b]), f, protocol=pickle.HIGHEST_PROTOCOL)
        bk[b] = None

def main(src, outdir, nworkers=3, max_games=None):
    q = mp.Queue(maxsize=24)
    ps = [mp.Process(target=worker, args=(q, f'{outdir}/w{i}')) for i in range(nworkers)]
    for p in ps: p.start()
    dctx = zstandard.ZstdDecompressor(max_window_size=2**31)
    t0 = time.time(); total = 0; buf = ''
    batch = []
    with (sys.stdin.buffer if src == '-' else open(src, 'rb')) as fh:
        reader = dctx.stream_reader(fh, read_size=1<<20)
        while True:
            try:
                chunk = reader.read(1<<22)
            except zstandard.ZstdError as e:
                print('끝(잘린 조각):', e, flush=True); break
            if not chunk: break
            buf += chunk.decode('utf-8', 'replace')
            parts = buf.split('\n\n[Event ')
            buf = parts.pop()
            for gtxt in parts:
                batch.append('[Event ' + gtxt if not gtxt.startswith('[Event') else gtxt)
                if len(batch) >= 5000:
                    q.put(batch); total += len(batch); batch = []
                    if total % 500000 == 0:
                        print(f'{total:,} 판  {time.time()-t0:.0f}s', flush=True)
            if max_games and total >= max_games: break
    if batch: q.put(batch); total += len(batch)
    for _ in ps: q.put(None)
    for p in ps: p.join()
    print(f'읽은 판 {total:,}  {time.time()-t0:.0f}s', flush=True)

if __name__ == '__main__':
    mg = int(sys.argv[3]) if len(sys.argv) > 3 else None
    main(sys.argv[1], sys.argv[2], 3, mg)
