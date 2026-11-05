"""메인라인: 해설 주요 수순(openings.py line)으로 시작해 유명하게 정해진 메인라인을 몇 수 더 잇는다. reasons.py가 읽는다.
고르는 법: data/main_lines.py가 뽑은 후보(고수가 가장 많이 둔 건전한 수)를 보고, 잘 알려진 정석 수순이 따로 있으면 그쪽을 쓴다.
같은 판을 지나는 두 메인라인은 그 판에서 같은 수를 둬야 한다(build.py가 어긋나면 멈춘다).
갈래 모음(hub) 해설은 넣지 않는다(주요 수순까지만)."""

MAIN = {
    # ---- 1.e4 e5
    'italian-game': 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6',
    'ruy-lopez': 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
    'scotch-game': 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6',
    'petrovs-defense': 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6',
    'philidor-defense': 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 g3 O-O Bg2 Re8 O-O Bf8',
    'vienna-game': 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Na5 Bb3 Nxb3 axb3 d5 exd5 Nxd5 Nf3',
    'kings-gambit': 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6',
    'four-knights-game': 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 O-O O-O cxd5',
    'bishops-opening': 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bb4+ Bd2',
    'center-game': 'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O O-O-O Re8 Bc4 d6',
    'two-knights-defense': 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5',
    'evans-gambit': 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O',
    'ponziani-opening': 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 O-O',
    'elephant-gambit': 'e4 e5 Nf3 d5 exd5 e4 Qe2 Nf6 d3 Qxd5 Nc3 Bb4',
    'latvian-gambit': 'e4 e5 Nf3 f5 Nxe5 Qf6 d4 d6 Nc4 fxe4 Nc3 Qg6',
    'damiano-defense': 'e4 e5 Nf3 f6 Nxe5 Qe7 Nf3 Qxe4+ Be2',
    'wayward-queen-attack': 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Ne2 Bg7 Nbc3 O-O',
    'berlin-defense': 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',

    # ---- 시실리안
    'sicilian-defense': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
    'sicilian-najdorf': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7',
    'sicilian-dragon': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5',
    'smith-morra-gambit': 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1',
    'alapin-sicilian': 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 d4 cxd4 cxd4 Nc6 Bc4 Nb6 Bb5 dxe5',
    'sicilian-classical': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O Bd7',
    'sicilian-scheveningen': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 g4 h6 h4 Nc6 Rg1 d5',
    'sicilian-sveshnikov': 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7',
    'sicilian-taimanov': 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Qf3 Nf6 O-O-O Ne5',
    'sicilian-kan': 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Bc5 Nb3 Ba7 Qe2 Ne7',
    'closed-sicilian': 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O',
    'rossolimo-attack': 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5',
    'moscow-variation': 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6 Re1 e6 d4',

    # ---- 1.e4 다른 응수
    'french-defense': 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 a6 Qd2 b5',
    'caro-kann-defense': 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O',
    'scandinavian-defense': 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 O-O c6',
    'pirc-defense': 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 Qd2 b5 f3 Nbd7',
    'alekhine-defense': 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
    'modern-defense': 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 b5 O-O-O Bb7 f3 Nd7',
    'nimzowitsch-defense': 'e4 Nc6 Nf3 d6 d4 Nf6 Nc3 g6 h3 Bg7 Be3',
    'owen-defense': 'e4 b6 d4 Bb7 Bd3 e6 Nf3 d6 O-O Nd7 Re1',
    'st-george-defense': 'e4 a6 d4 e6 Nf3 d5 e5 c5 c3 Nc6 Bd3 Qb6 O-O',

    # ---- 1.d4 d5
    'queens-gambit': 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 h6 Bh4 Be7 Bd3 O-O Nge2 Re8',
    'queens-gambit-declined': 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 h6 Bh4 Be7 Bd3 O-O Nge2 Re8',
    'queens-gambit-accepted': 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
    'slav-defense': 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 g6',
    'london-system': 'd4 d5 Bf4 Nf6 e3 c5 Nf3 Nc6 Nbd2 cxd4 exd4 Bf5 c3 e6 Qb3',
    'colle-system': 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3 Nc6 Bb2 cxd4 exd4 Bd6 O-O',
    'blackmar-diemer-gambit': 'd4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3 Bg4 h3 Bxf3 Qxf3 c6',
    'richter-veresov-attack': 'd4 d5 Nc3 Nf6 Bg5 e6 e4 dxe4 Nxe4 Be7 Bxf6 gxf6 Nf3 f5',
    'tarrasch-defense': 'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 c4',

    # ---- 1.d4 Nf6
    'kings-indian-defense': 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 a5',
    'nimzo-indian-defense': 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 a3 Bxc3+ bxc3 dxc4 Bxc4 c5',
    'queens-indian-defense': 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4',
    'bogo-indian-defense': 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Qe7 g3 Bxd2+ Qxd2 Nc6',
    'catalan-opening': 'd4 Nf6 c4 e6 g3 d5 Bg2 Bb4+ Bd2 Be7 Nf3 O-O O-O c6 Qc2 Nbd7',
    'grunfeld-defense': 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Bb5+ Nc6 O-O O-O',
    'benoni-defense': 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7',
    'benko-gambit': 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bg7 e4 O-O Nf3',
    'budapest-gambit': 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5',
    'trompowsky-attack': 'd4 Nf6 Bg5 d5 e3 c5 Bxf6 gxf6 dxc5 e6',
    'old-indian-defense': 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6',

    # ---- 1.d4 다른 응수
    'horwitz-defense': 'd4 e6 c4 b6 e4 Bb4+ Bd2 Bxd2+ Qxd2 d5',
    'dutch-defense': 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6',
    'englund-gambit': 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4 Rb1 Qa3',
    'mikenas-defense': 'd4 Nc6 d5 Ne5 e4 Ng6 c4 e5 Nc3 Bc5 Nf3 Nf6',

    # ---- 측면·드문 첫 수
    'english-opening': 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O',
    'reti-opening': 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5',
    'kings-indian-attack': 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1',
    'bird-opening': 'f4 d5 Nf3 Nf6 e3 c5 b3 Nc6 Bb2 Bg4',
    'nimzo-larsen-attack': 'b3 e5 Bb2 Nc6 e3 d5 Bb5 Bd6',
    'hungarian-opening': 'g3 d5 Bg2 c6 Nf3 Nf6 O-O Bg4',
    'polish-opening': 'b4 e5 Bb2 Bxb4 Bxe5 Nf6 c4 O-O Nf3',
    'van-geet-opening': 'Nc3 d5 e4 d4 Nce2 e5 Ng3 Be6',
    'vant-kruijs-opening': 'e3 e5 d4 exd4 exd4 d5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
    'mieses-opening': 'd3 d5 Nf3 Nf6 g3 c5 Bg2 Nc6 O-O e5',
    'grob-opening': 'g4 d5 Bg2 Bxg4 c4 c6 Qb3 Nf6 Qxb7 Nbd7',
}
