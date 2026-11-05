"""2단계: 리체스 평가 DB(lichess_db_eval.jsonl.zst, CC0)를 받으면서 우리 판만 골라 엔진 평가를 남긴다(저장하지 않고 흘려 읽음).
쓰는 법: python3 pfetch.py https://database.lichess.org/lichess_db_eval.jsonl.zst | python3 -I evals_stream.py <epds.txt> <evals.pkl>
남기는 것 = {표준 EPD: (깊이, [(첫 수 UCI, cp 또는 None, mate 또는 None), ...])}. 한 판에 평가가 여럿이면 수 후보(pvs)가 많고 깊은 것.
cp·mate는 백 기준(리체스 DB와 같음)."""
import sys, json, pickle, time
import zstandard


def pick(evals):
    best = None
    for ev in evals:
        k = (min(len(ev['pvs']), 3), ev.get('depth', 0))
        if best is None or k > best[0]:
            best = (k, ev)
    ev = best[1]
    out = []
    for pv in ev['pvs']:
        line = pv.get('line', '')
        mv = line.split(' ', 1)[0] if line else ''
        out.append((mv, pv.get('cp'), pv.get('mate')))
    return ev.get('depth', 0), out


def main(epds, dst):
    want = {}
    for l in open(epds, encoding='utf-8'):
        v, e = l.rstrip('\n').split('\t')
        want[v.encode()] = e
    print('찾을 모양', len(want), flush=True)
    got = {}
    t0 = time.time()
    n = 0
    dctx = zstandard.ZstdDecompressor(max_window_size=2**31)
    reader = dctx.stream_reader(sys.stdin.buffer, read_size=1 << 22, read_across_frames=True)
    buf = b''
    while True:
        try:
            chunk = reader.read(1 << 24)
        except zstandard.ZstdError as ex:
            print('끝(잘린 조각):', ex, flush=True)
            break
        if not chunk:
            break
        buf += chunk
        lines = buf.split(b'\n')
        buf = lines.pop()
        for l in lines:
            j = l.find(b'"', 8)
            e = want.get(l[8:j])
            if e is not None:
                try:
                    got[e] = pick(json.loads(l)['evals'])
                except Exception:
                    pass
        n += len(lines)
        if n // 5_000_000 != (n - len(lines)) // 5_000_000:
            print(f'{n:,} 줄  찾음 {len(got):,}  {time.time() - t0:.0f}s', flush=True)
            if n // 20_000_000 != (n - len(lines)) // 20_000_000:
                pickle.dump(got, open(dst, 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
    pickle.dump(got, open(dst, 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
    print(f'끝 {n:,} 줄  찾음 {len(got):,}  {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
