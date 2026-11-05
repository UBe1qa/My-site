# count2.py가 쓴 통(w*.bXX)을 여러 폴더(달)에서 모아 통마다 합치고, MIN_NODE 미만을 버린 뒤 make_data.py가 읽는 part0.pkl 하나로 쓴다.
# 쓰는 법: merge.py <출력 폴더> <counts 폴더>...
import sys, glob, pickle, os
MIN_NODE = 20
out, srcs = sys.argv[1], sys.argv[2:]
os.makedirs(out, exist_ok=True)
final, games = {}, 0
for b in range(16):
    m = {}
    for d in srcs:
        for p in glob.glob(f'{d}/w*.b{b:02d}'):
            n, c = pickle.load(open(p, 'rb')); games += n
            for k, v in c.items():
                t = m.get(k)
                if t is None: m[k] = v
                else:
                    for i in range(13): t[i] += v[i]
            del c
    kept = {k: v for k, v in m.items() if v[12] >= MIN_NODE}
    print(f'통 {b:02d}: 수순 {len(m):,} → {len(kept):,}', flush=True)
    final.update(kept); del m, kept
print('판', games, '남긴 수순', len(final), flush=True)
pickle.dump((games, final), open(f'{out}/part0.pkl', 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
