"""판·수 자료(data/t/*.json) 읽기와 수 분류. build.py가 쓴다(core.js의 FM.stats와 같은 모양).
판 = [온 판 12칸, 평가, [[수, 분류, 둔 뒤 평가, 12칸], ...], 대회 온 판 12칸 | 0, [[수, 대회 판 4칸], ...] | 0, 엔진 첫 수, 다른 수순 | 0]
분류: 0 메인 · 1 대안 · 2 사이드 · 3 의심스러운 수(?!) · 4 나쁜 수(?) · -1 모름(빌드 전).

분류 규칙(사이트 /data/ 페이지에 같은 말로 적는다):
- 손실 = 이 판에서 둘 수 있는 가장 좋은 수와 비교해 둔 쪽 승리 확률이 몇 %p 떨어지나(엔진 평가 → 승리 확률은 리체스와 같은 식).
- 손실 3.5 미만 = 건전한 수. 그 가운데 고수가 가장 많이 두는 수가 메인, 고수의 10% 넘게 두는 수는 대안.
  고수 = 리체스 중계 대회 2400 이상(그 판이 30판 넘게 나왔을 때), 아니면 리체스 2000 이상(30판 넘게), 아니면 전체.
- 손실 3.5~8 = 사이드, 8~15 = 의심스러운 수(?!), 15 이상 = 나쁜 수(?).
- 평가가 없는 수는 고수 비율로만(메인·대안·사이드).
- 해설에 적은 메인라인(reasons.py MAIN, openings.py 주요 수순)은 메인으로 고정한다(유명하게 정해진 메인라인을 따른다).
"""
import json
import math
from pathlib import Path

SHARDS = 4096
SOUND, SIDE, DUB = 3.5, 8.0, 15.0


def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & 0xffffffff
    return h


def sid(epd):
    return f'{fnv(epd) % SHARDS:03x}'


def win(v):
    """평가(백 기준) → 백 승리 확률 %"""
    if v is None:
        return None
    if isinstance(v, str):
        return 0.0 if v[1:2] == '-' else 100.0
    return 100.0 / (1 + math.exp(-0.00368208 * v))


def sumband(arr, off, band):
    w = d = b = 0
    for k in range(4):
        if band >= 0 and k != band:
            continue
        w += arr[off + k * 3]
        d += arr[off + k * 3 + 1]
        b += arr[off + k * 3 + 2]
    return {'w': w, 'd': d, 'b': b, 'n': w + d + b}


class Data:
    def __init__(self, root):
        self.root = Path(root)
        self.shards = {}
        self.E, self.N, self.X = {}, {}, {}
        for f in sorted((self.root / 't').glob('*.json')):
            sh = json.loads(f.read_text(encoding='utf-8'))
            self.shards[f.stem] = sh
            self.E.update(sh['e'])
            self.N.update(sh['n'])
            self.X.update(sh.get('x', {}))

    # ---------------------------------------------------------------- 통계
    def stats(self, epd, band=-1, all_=False):
        e = self.E.get(epd)
        if not e:
            return None
        reached = sumband(e[0], 0, band)
        moves, played = [], 0
        for row in e[2]:
            s = sumband(row, 3, band)
            played += s['n']
            if not s['n'] and not all_:
                continue
            moves.append(dict(s, san=row[0], cls=row[1], ev=row[2]))
        for m in moves:
            m['share'] = m['n'] / played if played else 0
        moves.sort(key=lambda m: (-m['n'], m['cls']))
        return dict(reached, played=played, moves=moves, ev=e[1], best=e[5] if len(e) > 5 else None)

    def otb(self, epd, band=-1):
        e = self.E.get(epd)
        if not e or not e[3]:
            return None
        r = sumband(e[3], 0, band)
        moves, played = [], 0
        for row in e[4] or []:
            n = sum(row[1 + k] for k in range(4) if band < 0 or k == band)
            played += n
            if n:
                moves.append({'san': row[0], 'n': n})
        for m in moves:
            m['share'] = m['n'] / played if played else 0
        moves.sort(key=lambda m: -m['n'])
        return dict(r, played=played, moves=moves)

    # ---------------------------------------------------------------- 분류
    def expert_shares(self, epd):
        """고수 비율: 대회 2400+ → 리체스 2000+ → 전체. (비율 dict, 출처)"""
        e = self.E[epd]
        if e[3]:
            rows = e[4] or []
            tot = sum(r[3] + r[4] for r in rows)
            if tot >= 30:
                return {r[0]: (r[3] + r[4]) / tot for r in rows}, 'otb'
        tot = 0
        sh = {}
        for row in e[2]:
            n = sum(row[3 + 9:3 + 12])
            sh[row[0]] = n
            tot += n
        if tot >= 30:
            return {k: v / tot for k, v in sh.items()}, '2000'
        tot = sum(sum(row[3:]) for row in e[2])
        return ({row[0]: sum(row[3:]) / tot for row in e[2]} if tot else {}), 'all'

    def classify(self, epd, book=()):
        """이 판의 수마다 분류를 정해 행의 두 번째 칸에 쓴다. book = 메인으로 고정할 수(SAN)들."""
        e = self.E[epd]
        rows = e[2]
        if not rows:
            return
        white = epd.split(' ')[1] == 'w'

        def mover(v):
            w = win(v)
            return None if w is None else (w if white else 100 - w)

        vals = [mover(r[2]) for r in rows]
        cands = [v for v in vals if v is not None]
        pe = mover(e[1])
        if pe is not None:
            cands.append(pe)
        best = max(cands) if cands else None
        share, _ = self.expert_shares(epd)
        loss = [None if (v is None or best is None) else best - v for v in vals]
        cls = []
        for r, l in zip(rows, loss):
            if l is None:
                cls.append(None)
            elif l < SOUND:
                cls.append('sound')
            elif l < SIDE:
                cls.append(2)
            elif l < DUB:
                cls.append(3)
            else:
                cls.append(4)
        sound = [i for i, c in enumerate(cls) if c in ('sound', None)]
        main = None
        if sound:
            main = max(sound, key=lambda i: (cls[i] == 'sound', share.get(rows[i][0], 0), sum(rows[i][3:])))
            if cls[main] is None and share.get(rows[main][0], 0) < 0.05 and any(c == 'sound' for c in cls):
                main = max([i for i in sound if cls[i] == 'sound'], key=lambda i: share.get(rows[i][0], 0))
        for i, r in enumerate(rows):
            c = cls[i]
            if i == main:
                r[1] = 0
            elif c in ('sound', None):
                sh = share.get(r[0], 0)
                r[1] = 1 if (sh >= 0.10 and (c == 'sound' or sh >= 0.25)) else 2
            else:
                r[1] = c
        for i, r in enumerate(rows):
            if r[0] in book:
                if r[1] != 0:
                    for q in rows:
                        if q[1] == 0:
                            q[1] = 1
                r[1] = 0

    def save(self):
        """바뀐 조각만 다시 쓴다. 바뀐 조각 수를 돌려준다."""
        changed = 0
        for k, sh in self.shards.items():
            s = json.dumps(sh, separators=(',', ':'), ensure_ascii=False, sort_keys=True)
            f = self.root / 't' / f'{k}.json'
            if f.read_text(encoding='utf-8') != s:
                f.write_text(s, encoding='utf-8')
                changed += 1
        return changed
