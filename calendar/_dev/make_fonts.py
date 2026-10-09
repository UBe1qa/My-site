#!/usr/bin/env python3
"""내 설정 PDF에 담는 글꼴을 만든다: assets/fonts/onesheet-{500,600,700,800}.ttf + metrics.json

  /tmp/cv/bin/python calendar/_dev/make_fonts.py        (fonttools·brotli 필요, 글꼴 경로는 CAL_FONT)

- Pretendard 가변 글꼴에서 **종이에 찍힐 수 있는 글자만**(node _dev/sheets.js 의 chars 일감 + 아스키 + 여유 글자) 남기고,
  종이가 쓰는 굵기 네 가지(500·600·700·800)로 굳혀 TrueType 파일로 저장한다. 하나에 20~30KB.
- Pretendard는 SIL OFL 1.1이고 이름을 예약해 두었다(Reserved Font Name). 줄여 만든 글꼴은 '고친 판'이라 이름을 'Onesheet Sans'로 바꾼다.
  저작권·라이선스 줄은 글꼴 안(name 표 0·13·14번)에 그대로 둔다. 사이트의 오픈소스 고지에도 적는다.
- 공휴일 이름이 새로 생기면(임시공휴일·선거일 등) 이 스크립트를 다시 돌린다. 빠진 글자가 있으면 tests/run.js 가 실패하고,
  화면에서는 그 PDF만 300ppi 그림으로 대신 만든다(app.js).
"""
import sys
sys.dont_write_bytecode = True
import copy
import json
import os
import subprocess
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / '_dev'
SRC = os.environ.get('CAL_FONT', '/home/claude/sp/calendar/mock/shared/fonts/PretendardVariable.woff2')
WEIGHTS = [500, 600, 700, 800]
FAMILY = 'Onesheet Sans'
# 앞으로 생길 수 있는 이름에 쓰일 글자(선거일·임시공휴일 등)
EXTRA = '임시공휴일대통령선거국회의원전국동시지방재보궐국민투표기념추가지정쉬는날’‘“”…~/&%+!?:#@*\'"<>[]_'


def main():
    jobs = json.loads(subprocess.run(['node', str(DEV / 'sheets.js')], input='[{"chars":1}]', capture_output=True, text=True, check=True).stdout)
    chars = sorted(set(jobs[0]['chars']) | set(chr(c) for c in range(32, 127)) | set(EXTRA))
    base = TTFont(SRC)
    opt = subset.Options()
    opt.layout_features = []          # 글자 사이 좁힘·합자는 쓰지 않는다(PDF에서 글자를 하나씩 놓는다)
    opt.hinting = False
    opt.notdef_outline = True
    opt.name_IDs = [0, 1, 2, 3, 4, 6, 13, 14]
    opt.name_languages = [0x409]
    opt.drop_tables += ['GSUB', 'GPOS', 'GDEF', 'STAT', 'meta', 'DSIG']
    sub = subset.Subsetter(opt)
    sub.populate(text=''.join(chars))
    sub.subset(base)
    out = ROOT / 'assets' / 'fonts'
    out.mkdir(parents=True, exist_ok=True)
    metrics = None
    for w in WEIGHTS:
        f = instancer.instantiateVariableFont(copy.deepcopy(base), {'wght': w})
        f.flavor = None
        ps = FAMILY.replace(' ', '') + '-' + str(w)
        for rec in list(f['name'].names):
            if rec.nameID == 1:
                rec.string = FAMILY + ' ' + str(w)
            elif rec.nameID == 2:
                rec.string = 'Regular'
            elif rec.nameID == 3:
                rec.string = ps + ';subset of Pretendard'
            elif rec.nameID == 4:
                rec.string = FAMILY + ' ' + str(w)
            elif rec.nameID == 6:
                rec.string = ps
        f['OS/2'].usWeightClass = w
        path = out / f'onesheet-{w}.ttf'
        f.save(str(path))
        order = f.getGlyphOrder()
        cmap = f.getBestCmap()
        gid = {name: i for i, name in enumerate(order)}
        hm = f['hmtx'].metrics
        if metrics is None:
            cps = sorted(cmap)
            metrics = dict(family=FAMILY, upm=f['head'].unitsPerEm, n=len(order), asc=f['hhea'].ascent, desc=f['hhea'].descent,
                           cap=getattr(f['OS/2'], 'sCapHeight', 1400), bbox=[f['head'].xMin, f['head'].yMin, f['head'].xMax, f['head'].yMax],
                           chars=''.join(chr(c) for c in cps), gid=[gid[cmap[c]] for c in cps], adv={}, bytes={})
        assert [gid[cmap[c]] for c in sorted(cmap)] == metrics['gid'], '굵기마다 글리프 순서가 같아야 한다'
        metrics['adv'][str(w)] = [hm[n][0] for n in order]
        metrics['bytes'][str(w)] = path.stat().st_size
        print(path.name, path.stat().st_size, 'glyphs', len(order))
    missing = [c for c in chars if c not in metrics['chars']]
    if missing:
        print('글꼴에 없는 글자:', ''.join(missing))
    (out / 'metrics.json').write_text(json.dumps(metrics, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('metrics.json', (out / 'metrics.json').stat().st_size, 'chars', len(metrics['chars']))


if __name__ == '__main__':
    main()
