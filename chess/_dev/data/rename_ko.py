"""data/p 조각의 한국어 이름을 names_ko.py로 다시 만든다(판 수는 그대로). 쓰는 법: python3 -B chess/_dev/data/rename_ko.py"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from names_ko import ko_name  # noqa: E402

P = pathlib.Path(__file__).resolve().parents[2] / 'data' / 'p'
changed = 0
for f in sorted(P.glob('*.json')):
    sh = json.loads(f.read_text(encoding='utf-8'))
    dirty = False
    for epd, v in sh['n'].items():
        ko = ko_name(v[1])
        if v[2] != ko:
            v[2] = ko
            dirty = True
    if dirty:
        changed += 1
        f.write_text(json.dumps(sh, separators=(',', ':'), ensure_ascii=False, sort_keys=True), encoding='utf-8')
print(f'한국어 이름 다시 씀: 조각 {changed}개')
