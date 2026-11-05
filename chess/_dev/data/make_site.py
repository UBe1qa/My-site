"""3단계: 그물(tree.pkl) + 엔진 평가(evals.pkl, 더 있으면 evals_*.pkl)를 사이트 조각(chess/data/t/xxx.json)과 meta.json으로 쓴다.
쓰는 법: python3 -I chess/_dev/data/make_site.py <tree.pkl> <출력: chess/data> <evals.pkl> [evals2.pkl ...]
조각 = FNV-1a(EPD) % 4096, 이름 = 세 자리 16진수.
  {"e": {epd: [온 판 12칸, 평가, [[수, -1, 둔 뒤 평가, 12칸], ...], 대회 온 판 12칸 | 0, [[수, 대회 판 레이팅대 4칸], ...] | 0, 엔진 첫 수 | null,
                [[판 수, 이 판에 오는 수순(SAN 빈칸)], ...] | 0]},
   "n": {epd: [ECO, 영어 이름, 한국어 이름]}}
평가 = 백 기준 센티폰(정수) 또는 "M3"·"M-2"(메이트), 모르면 null. 수 분류(두 번째 칸)는 build.py가 채운다(-1 = 아직).
12칸 = 레이팅대 4개(<1200·1200-1599·1600-1999·2000+, 대회는 <2200·2200-2399·2400-2599·2600+) × 백승·무·흑승."""
import sys, os, json, pickle, datetime
import chess

SHARDS = 4096
MAX_ROWS = 24
MIN_PLAYED = 60      # 여기서 다음 수까지 둔 판이 이만큼 안 되는 판은 싣지 않는다(그 판으로 가는 수의 숫자는 부모 판 행에 남는다)


def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode():
        h ^= ch
        h = (h * 0x01000193) & 0xffffffff
    return h


def sid(epd):
    return f'{fnv(epd) % SHARDS:03x}'


def ev_val(cp, mate):
    if mate is not None:
        return f'M{mate}'
    if cp is None:
        return None
    return max(-9999, min(9999, int(cp)))


def main(tree_p, out, *ev_ps):
    T = pickle.load(open(tree_p, 'rb'))
    pos, otb, names, named_line = T['pos'], T['otb'], T['names'], T['named_line']
    EV = {}
    for p in ev_ps:
        for e, v in pickle.load(open(p, 'rb')).items():
            if e not in EV or v[0] > EV[e][0]:
                EV[e] = v
    print('판', len(pos), '대회 판', len(otb), '평가', len(EV), flush=True)

    # 이름 붙은 수순 위의 판인데 대국이 없는 것: 다음 이름 수만 0판으로 둔다(이론만 있는 길)
    theory, along = {}, set()
    for e_end, line in named_line.items():
        b = chess.Board()
        for san in line.split(' '):
            e = b.epd()
            along.add(e)
            mv = b.parse_san(san)
            nxt = b.san(mv)
            if e not in pos:
                theory.setdefault(e, set()).add(nxt)
            b.push(mv)
        if b.epd() not in pos:
            theory.setdefault(b.epd(), set())
    print('이론만 있는 판', len(theory), flush=True)

    def pos_ev(e):
        v = EV.get(e)
        if not v or not v[1]:
            return None
        _, cp, mate = v[1][0]
        return ev_val(cp, mate)

    shards = [{'e': {}, 'n': {}} for _ in range(SHARDS)]
    have_ev = have_mev = rows_n = 0
    keep = [e for e, d in pos.items() if sum(sum(c) for c in d['m'].values()) >= MIN_PLAYED or e in along or e in names]
    all_e = keep + [e for e in theory if e not in pos]
    print('싣는 판', len(all_e), flush=True)
    for i, e in enumerate(all_e):
        d = pos.get(e) or {'r': [0] * 12, 'm': {s: [0] * 12 for s in theory.get(e, ())}}
        b = chess.Board(e + ' 0 1')
        pvs = {}
        v = EV.get(e)
        if v:
            for uci, cp, mate in v[1]:
                try:
                    mv = chess.Move.from_uci(uci)
                    if mv in b.legal_moves:
                        pvs[b.san(mv)] = ev_val(cp, mate)
                except Exception:
                    pass
        pe = pos_ev(e)
        if pe is not None:
            have_ev += 1
        mv_rows = sorted(d['m'].items(), key=lambda x: -sum(x[1]))[:MAX_ROWS]
        extra = theory.get(e, set()) - set(d['m'])
        for s in sorted(extra):
            mv_rows.append((s, [0] * 12))
        rows = []
        for san, c in mv_rows:
            if san in pvs:
                mev = pvs[san]
            else:
                bb = b.copy(stack=False)
                bb.push_san(san)
                # 둔 수로 바로 메이트면 둔 쪽 승(백이 메이트 = "M1", 흑이 = "M-1")
                mev = ('M1' if b.turn == chess.WHITE else 'M-1') if bb.is_checkmate() else pos_ev(bb.epd())
            if mev is not None:
                have_mev += 1
            rows.append([san, -1, mev] + list(c))
        rows_n += len(rows)
        o = otb.get(e)
        orow = 0
        omv = 0
        if o:
            orow = o['r']
            omv = []
            for san, c in sorted(o['m'].items(), key=lambda x: -sum(x[1]))[:12]:
                omv.append([san] + [c[k * 3] + c[k * 3 + 1] + c[k * 3 + 2] for k in range(4)])
        best = next(iter(pvs), None)      # 엔진 첫 후보 수(SAN)
        # 같은 판에 오는 다른 수순: 둘째 수순이 50판 넘고 첫째의 5% 넘을 때만(전이)
        od = d.get('o') or []
        orders = [[n, q] for n, q in od] if len(od) > 1 and od[1][0] >= 50 and od[1][0] >= od[0][0] * 0.05 else 0
        shards[fnv(e) % SHARDS]['e'][e] = [d['r'], pe, rows, orow, omv, best, orders]
        if i % 50000 == 0:
            print(f'  {i:,}/{len(all_e):,}', flush=True)
    for e, v in names.items():
        shards[fnv(e) % SHARDS]['n'][e] = v
    os.makedirs(out + '/t', exist_ok=True)
    size = 0
    for i, sh in enumerate(shards):
        s = json.dumps(sh, separators=(',', ':'), ensure_ascii=False, sort_keys=True)
        size += len(s.encode())
        with open(f'{out}/t/{i:03x}.json', 'w', encoding='utf-8') as f:
            f.write(s)
    meta = {'games': T['games'], 'otb_games': T['otb_games'], 'positions': len(all_e), 'theory_positions': len([e for e in theory if e not in pos]),
            'moves': rows_n, 'names': len(names), 'evals': have_ev, 'shards': SHARDS,
            'source': 'https://database.lichess.org/ lichess_db_standard_rated_2026-08, 2026-09, 2026-10 (whole months)',
            'otb_source': 'https://database.lichess.org/ broadcast games 2020-01 to 2026-09 with FIDE ratings (CC BY-SA 4.0)',
            'eval_source': 'https://database.lichess.org/ lichess_db_eval.jsonl.zst (CC0)',
            'license': 'CC0 (Lichess games, evaluations, lichess-org/chess-openings); CC BY-SA 4.0 (broadcast numbers)',
            'bands': ['<1200', '1200-1599', '1600-1999', '2000+'], 'otb_bands': ['<2200', '2200-2399', '2400-2599', '2600+'],
            'rating': 'average of both players (Lichess ratings; FIDE for broadcasts)',
            'speeds': 'blitz, rapid, classical (bullet, ultrabullet and correspondence left out)',
            'max_ply': 40, 'min_games': 20, 'made': datetime.date.today().isoformat()}
    with open(out + '/meta.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False)
    print('판', len(all_e), '평가 있는 판', have_ev, '수', rows_n, '평가 있는 수', have_mev, '크기', size // 1024 // 1024, 'MB', flush=True)


if __name__ == '__main__':
    main(*sys.argv[1:])
