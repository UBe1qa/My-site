#!/usr/bin/env python3
"""자판 code 이름 기준 목록 만들기: python3 check/tests/gen_ref_codes.py <playwright 폴더>
Playwright(Apache-2.0)가 키 입력을 흉내 낼 때 쓰는 미국 자판 표(USKeyboardLayout)에서 code 이름만 뽑아 tests/ref-us-codes.json에 적는다.
우리 배열 표의 code가 이 목록에 있는 이름인지(오타가 없는지), 글자 키의 줄 순서가 QWERTY와 같은지 시험이 대조한다.
사이트에는 싣지 않고 시험에만 쓴다(이름과 글자만 뽑는다).
"""
import json, re, sys
from pathlib import Path

src = Path(sys.argv[1])
bundle = next(src.rglob('coreBundle.js'), None) or next(src.rglob('usKeyboardLayout.js'))
text = bundle.read_text(encoding='utf-8', errors='replace')
start = text.index('"Escape": { "keyCode": 27')
head = text.rfind('{', 0, start)
depth, i = 0, head
while True:
    c = text[i]
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0: break
    i += 1
block = text[head:i + 1]
codes = re.findall(r'^\s*"([A-Za-z0-9]+)": \{', block, flags=re.M)
# code → 그 키를 그냥 눌렀을 때 나오는 글자(key). 줄 순서를 QWERTY 글자 줄과 대조하는 데 쓴다.
chars = {}
for m in re.finditer(r'^\s*"([A-Za-z0-9]+)": (\{.*\}),?\s*$', block, flags=re.M):
    try:
        key = json.loads(m.group(2)).get('key', '')
    except ValueError:                      # 작은따옴표로 적힌 값이 섞인 줄(Quote)
        k = re.search(r'"key": ("(?:\\.|[^"\\])*")', m.group(2))
        try:
            key = json.loads(k.group(1)) if k else ''
        except ValueError:                  # "\0" 같은 JS 전용 표기
            key = ''
    if len(key) == 1:
        chars[m.group(1)] = key
ver = json.loads((bundle.parents[1] / 'package.json').read_text())['version']
out = {'source': 'playwright-core USKeyboardLayout', 'version': ver, 'codes': codes, 'chars': chars}
(Path(__file__).resolve().parent / 'ref-us-codes.json').write_text(json.dumps(out, indent=1), encoding='utf-8')
print(ver, len(codes), codes[:8], '...', len(chars), 'chars')
