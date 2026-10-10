#!/usr/bin/env python3
"""근로소득 간이세액표 자료 → 사이트가 읽는 조회표 파일로 옮기기: python3 salary/_dev/gen_gani.py [--check]

- 원본: _dev/data/gani-2026.json (법제처 「소득세법 시행령」 별표 2 원문 표에서 옮긴 것. 줄 647개 × 공제대상가족 1~11명)
- 결과: assets/gani-2026.js (손으로 고치지 않는다). 표가 개정되면 원본 JSON을 새로 만들고 이 스크립트를 다시 돌린다.
- --check: 결과 파일이 원본과 같은지만 본다(다르면 종료 코드 1).
- 옮기기 전에 표 모양을 검사한다: 줄이 끊김 없이 이어지는지, 간격(5·10·20천 원), 월급이 오르면 세액이 줄지 않는지,
  가족이 늘면 세액이 늘지 않는지, 모든 값이 10원 단위인지. 하나라도 어긋나면 멈춘다(표를 고치지 않고 알린다).
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '_dev' / 'data' / 'gani-2026.json'
OUT = ROOT / 'assets' / 'gani-2026.js'


def validate(d):
    rows = d['rows']
    errs = []
    if rows[-1]['from'] != rows[-1]['to']:
        errs.append('마지막 줄은 딱 10,000천원 줄(from = to)이어야 한다')
    for i in range(len(rows) - 2):
        if rows[i]['to'] != rows[i + 1]['from']:
            errs.append(f"줄이 끊김: {rows[i]['to']} → {rows[i + 1]['from']}")
    if rows[-2]['to'] != rows[-1]['from']:
        errs.append('마지막 구간과 딱 10,000천원 줄이 안 이어짐')
    for i, r in enumerate(rows):
        t = r['tax']
        if len(t) != 11:
            errs.append(f"{r['from']}: 칸 수 {len(t)}")
        if any((not isinstance(v, int)) or v < 0 or v % 10 for v in t):
            errs.append(f"{r['from']}: 10원 단위가 아닌 값")
        if any(t[k] < t[k + 1] for k in range(10)):
            errs.append(f"{r['from']}: 가족이 늘었는데 세액이 늚")
        if i and any(t[k] < rows[i - 1]['tax'][k] for k in range(11)):
            errs.append(f"{r['from']}: 월급이 올랐는데 세액이 줆")
    for r in rows[:-1]:
        step = r['to'] - r['from']
        want = 5 if r['from'] < 1500 else 10 if r['from'] < 3000 else 20
        if step != want:
            errs.append(f"{r['from']}: 간격 {step} (기대 {want})")
    tiers = d['over10000']
    if tiers[0]['over'] != rows[-1]['from']:
        errs.append('계산식 구간이 표 끝과 안 이어짐')
    for a, b in zip(tiers, tiers[1:]):
        if a['upto'] != b['over']:
            errs.append(f"계산식 구간이 끊김: {a['upto']} → {b['over']}")
    return errs


def build(d):
    def pct(x):
        v = round(x * 100)
        assert abs(v - x * 100) < 1e-9, x
        return v
    out = {
        'name': d['name'], 'source': d['source'], 'law': d['law'], 'effective': d['effective'], 'viewed': d['viewed'],
        'unit': 1000,
        'rows': [[r['from'], r['to']] + r['tax'] for r in d['rows']],
        'over': [{'over': t['over'], 'upto': t['upto'], 'add': t['add'], 'ratePct': pct(t['rate']), 'factorPct': pct(t['factor']), 'text': t['text']} for t in d['over10000']],
        'child': {'one': d['child_credit']['one'], 'two': d['child_credit']['two'], 'eachOverTwo': d['child_credit']['each_over_two'], 'text': d['child_credit']['text']},
        'over11': d['over11'],
    }
    head = ('/* 근로소득 간이세액표: 소득세법 시행령 별표 2 (' + d['effective'] + ' 시행, 법제처 원문 ' + d['viewed'] + ' 열람).\n'
            '   자동으로 만든 파일이다. 손으로 고치지 않는다: python3 salary/_dev/gen_gani.py\n'
            '   rows 한 줄 = [이상(천원), 미만(천원), 공제대상가족 1명 … 11명의 소득세(원)]. 마지막 줄은 딱 10,000천원일 때. */\n')
    body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    body = body.replace('"rows":[[', '"rows":[\n[').replace('],[', '],\n[').replace(']],"over":', ']\n],"over":')
    return (head + "(function (root, factory) {\n  if (typeof module === 'object' && module.exports) module.exports = factory();\n  else root.PAY_GANI = factory();\n"
            "})(typeof self !== 'undefined' ? self : this, function () {\n  return " + body + ";\n});\n")


def main():
    d = json.loads(SRC.read_text(encoding='utf-8'))
    errs = validate(d)
    if errs:
        print('\n'.join('표 검사 실패: ' + e for e in errs[:20]))
        sys.exit(1)
    text = build(d)
    if '--check' in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding='utf-8') == text
        print('gani-2026.js: ' + ('최신' if ok else '낡음 (gen_gani.py를 다시 돌린다)'))
        sys.exit(0 if ok else 1)
    OUT.write_text(text, encoding='utf-8')
    print(f"wrote {OUT.relative_to(ROOT)} ({len(d['rows'])} rows, {len(text)} bytes)")


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    main()
