"""메인라인 후보 뽑기(사람이 보고 reasons.py MAIN에 옮긴다).
해설 주요 수순 끝에서, 그 판의 '메인'(엔진이 건전하다고 본 수 중 고수가 가장 많이 둔 수, book 없이)을 따라 몇 수 더 간다.
쓰는 법: python3 -I chess/_dev/data/main_lines.py [slug ...]   (venv의 python-chess 필요)"""
import sys
from pathlib import Path

import chess

DEV = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DEV))
import trail  # noqa: E402
from openings import OPENINGS  # noqa: E402

D = trail.Data(DEV.parent / 'data')
TARGET = 18          # 처음부터 이만큼(반수)까지, 적어도 주요 수순 + 6
MIN_EXPERT = 30


def main_move(epd):
    e = D.E.get(epd)
    if not e or not e[2]:
        return None, None
    D.classify(epd)
    share, src = D.expert_shares(epd)
    for r in e[2]:
        if r[1] == 0:
            return r[0], (share.get(r[0], 0), src, sum(r[3:]))
    return None, None


def run(slugs):
    for o in OPENINGS:
        if slugs and o['slug'] not in slugs:
            continue
        b = chess.Board()
        line = o['line'].split(' ')
        for s in line:
            b.push_san(s)
        out = list(line)
        notes = []
        want = max(TARGET, len(line) + 6)
        while len(out) < want:
            san, info = main_move(b.epd())
            if not san:
                notes.append('끝: 자료 없음')
                break
            sh, src, n = info
            if n < MIN_EXPERT:
                notes.append(f'끝: {n}판')
                break
            out.append(san)
            notes.append(f'{san}:{src}{sh:.0%}')
            b.push_san(san)
        print(f"{o['slug']}\t{' '.join(out)}\t{' '.join(notes)}")


if __name__ == '__main__':
    run(set(sys.argv[1:]))
