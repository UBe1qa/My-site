#!/usr/bin/env python3
"""현지화 검사: 화면에 쓰는 한국어 키가 i18n.js 영어 사전에 다 있는지, %s·%d 개수가 맞는지 본다."""
import os, re, sys, json
root = os.path.join(os.path.dirname(__file__), "..")
rd = lambda p: open(os.path.join(root, p), encoding="utf-8").read()
app, html, i18n = rd("assets/app.js"), rd("index.html"), rd("assets/i18n.js")

keys = set(re.findall(r'\b[LF]\("((?:[^"\\]|\\.)*)"', app))
keys |= set(re.findall(r'data-i18n(?:-aria)?="([^"]+)"', html))
body = i18n[i18n.index("var EN = {") + 9: i18n.index("};", i18n.index("var EN = {")) + 1]
body = re.sub(r"^\s*//.*$", "", body, flags=re.M)
en = json.loads(re.sub(r",\s*}", "}", body))

def spec(s):
    toks = re.findall(r"%(?:(\d)\$)?([sd])", s)
    if any(p for p, _ in toks):
        return sorted(int(p) for p, _ in toks)
    return list(range(1, len(toks) + 1))

bad = 0
for k in sorted(keys):
    if k not in en:
        print("✗ 영어 없음:", k); bad += 1
    elif spec(k) != spec(en[k]):
        print("✗ 형식 지정자 다름:", k, "→", en[k]); bad += 1
for k in sorted(set(en) - keys):
    print("· 안 쓰는 키:", k)
# HTML 안 글자가 data-i18n 키와 같은지(원문을 고치고 키를 안 고친 경우)
for key, text in re.findall(r'data-i18n="([^"]+)"[^>]*>([^<]*)<', html):
    if text.strip() and text.strip() != key:
        print("✗ 키와 본문이 다름:", key, "/", text.strip()); bad += 1
print(("✗ %d개 문제" % bad) if bad else "✅ 현지화 검사 통과 (%d개 키)" % len(keys))
sys.exit(1 if bad else 0)
