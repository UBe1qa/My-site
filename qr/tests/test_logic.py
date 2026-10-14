#!/usr/bin/env python3
"""로직 시험(브라우저 없이): python3 qr/tests/test_logic.py [묶음…]
묶음: encoder(segno 와 버전 1~40 × L/M/Q/H 칸 단위 같음) · formats(와이파이·vCard·일정·메일·문자 = 표준 문자열 + vobject/icalendar 로 다시 읽기)
      design(꾸밈 세트 + 무작위 조합 SVG 를 cairosvg 로 그려 zxing-cpp 로 읽기) · files(PDF·EPS 를 pdftoppm·ghostscript 로 그려 읽기, 스티커 시트, ZIP)
      scanner(경고 규칙) · presets(대비) · names(파일 이름)
pip: segno qrcode zxing-cpp cairosvg vobject icalendar pillow / apt: ghostscript poppler-utils
"""
import sys
sys.dont_write_bytecode = True
import io
import json
import os
import random
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
ONLY = set(sys.argv[1:])
fails, passed, cant = [], 0, []
TMP = Path(tempfile.mkdtemp(prefix='qrtest-'))


def ok(cond, msg):
    global passed
    if cond:
        passed += 1
    else:
        fails.append(msg)
        if len(fails) < 40:
            print('  실패', msg[:300])


def node(code, data=None):
    """노드에서 assets 모듈을 불러 code 를 돌리고 JSON 을 돌려받는다. data 는 stdin JSON."""
    pre = (f"const QR=require({json.dumps(str(A / 'qr.js'))}),R=require({json.dumps(str(A / 'qr-render.js'))}),X=require({json.dumps(str(A / 'qr-export.js'))}),"
           f"P=require({json.dumps(str(A / 'qr-payload.js'))}),S=require({json.dumps(str(A / 'qr-parse.js'))}),PRE=require({json.dumps(str(A / 'qr-presets.js'))}),fs=require('fs');"
           f"const G=JSON.parse(fs.readFileSync({json.dumps(str(A / 'glyphs/base.json'))},'utf8'));const IN=JSON.parse(fs.readFileSync(0,'utf8')||'null');")
    r = subprocess.run(['node', '-e', pre + code], input=json.dumps(data), capture_output=True, text=True, timeout=600)
    if r.returncode:
        raise RuntimeError(r.stderr[:2000])
    return json.loads(r.stdout) if r.stdout.strip() else None


def want(name):
    return not ONLY or name in ONLY


# ---------- 인코더 ----------
def encoder():
    import segno
    import segno.consts as sc_
    import segno.encoder as se
    # segno 1.6.x 는 끝 표시(0000) 뒤 길이가 이미 8의 배수여도 0 을 8개 더 쓴다(표준 7.4.10 은 '8의 배수가 아닐 때만').
    # 두 모양 모두 판독기는 같은 내용으로 읽지만 칸이 달라지므로, 그 한 줄만 표준대로 바꿔 대조한다. 바꾸지 않은 python-qrcode 와도 따로 대조한다.
    def std_pad(buff, version, length):
        if version not in (sc_.VERSION_M1, sc_.VERSION_M3) and length % 8:
            buff.extend([0] * (8 - (length % 8)))
    se.write_padding_bits = std_pad
    print('encoder: segno(끝 맞춤 한 줄만 표준대로)·python-qrcode 와 칸 단위 대조')
    texts = ['', 'A', 'https://qr.lumenlab.page/', '한글 테스트 😀', 'x' * 50]
    jobs = []
    rnd = random.Random(7)
    for v in range(1, 41):
        for e in 'LMQH':
            # 그 버전에 들어가는 가장 긴 글(꽉 찬 경우)과 짧은 글: segno 로 담을 수 있는 바이트 수를 찾는다
            base = rnd.choice(texts) + 'QR데이터-' * 400
            hi = len(base.encode())
            lo_n, hi_n = 0, len(base)
            while lo_n < hi_n:   # 글자 수 이분 탐색
                mid = (lo_n + hi_n + 1) // 2
                try:
                    segno.make_qr(base[:mid].encode(), error=e, version=v, boost_error=False, mode='byte')
                    lo_n = mid
                except Exception:
                    hi_n = mid - 1
            jobs.append({'v': v, 'e': e, 't': base[:lo_n]})
            jobs.append({'v': v, 'e': e, 't': base[:max(1, lo_n // 3)]})
    res = node("process.stdout.write(JSON.stringify(IN.map(j=>{const q=QR.encode(j.t,{ecl:j.e,version:j.v,boost:false});return {m:q.mask,s:q.size,d:Array.from(q.modules).join('')}})))", jobs)
    for j, r in zip(jobs, res):
        q = segno.make_qr(j['t'].encode('utf-8'), error=j['e'], version=j['v'], mask=r['m'], boost_error=False, mode='byte', encoding='utf-8')
        mx = ''.join('1' if c else '0' for row in q.matrix for c in row)
        ok(mx == r['d'] and q.version == j['v'], f"encoder v{j['v']} {j['e']} 칸이 다름")
    # python-qrcode(손대지 않음)와도: 같은 마스크로
    import qrcode
    from qrcode import util as qu
    EL = {'L': qrcode.constants.ERROR_CORRECT_L, 'M': qrcode.constants.ERROR_CORRECT_M, 'Q': qrcode.constants.ERROR_CORRECT_Q, 'H': qrcode.constants.ERROR_CORRECT_H}
    for j, r in list(zip(jobs, res))[::3]:
        q2 = qrcode.QRCode(version=j['v'], error_correction=EL[j['e']], border=0, mask_pattern=r['m'])
        q2.add_data(qu.QRData(j['t'].encode('utf-8'), mode=qu.MODE_8BIT_BYTE))
        q2.make(fit=False)
        mx = ''.join('1' if c else '0' for row in q2.get_matrix() for c in row)
        ok(mx == r['d'], f"encoder python-qrcode v{j['v']} {j['e']} 칸이 다름")
    # 마스크 고르기까지 같은지(segno 가 고르는 것과)
    jobs2 = [{'t': f'https://example.com/{i}' * (1 + i % 5), 'e': 'LMQH'[i % 4]} for i in range(60)]
    res2 = node("process.stdout.write(JSON.stringify(IN.map(j=>{const q=QR.encode(j.t,{ecl:j.e,boost:false});return {v:q.version,m:q.mask,d:Array.from(q.modules).join('')}})))", jobs2)
    for j, r in zip(jobs2, res2):
        # 고르는 마스크(벌점 계산)는 라이브러리마다 다르다(segno·python-qrcode 끼리도 60개 중 절반쯤만 같다). 8가지 모두 표준에 맞는 모양이라
        # 자동으로 고른 '버전'이 같은지와, 그 마스크로 만든 칸이 같은지를 본다
        q = segno.make_qr(j['t'].encode(), error=j['e'], boost_error=False, mode='byte', mask=r['m'])
        mx = ''.join('1' if c else '0' for row in q.matrix for c in row)
        ok(q.version == r['v'] and mx == r['d'], f"encoder 자동 버전 {j['t'][:30]} {j['e']}")
    print(f'  {len(jobs)}+{len(jobs2)}개 대조')


# ---------- 형식 ----------
def formats():
    import vobject
    from icalendar import Event
    print('formats: 표준 문자열')
    cases = [
        ('wifi', {'ssid': 'Cafe', 'password': 'pass1234', 'auth': 'WPA'}, 'WIFI:T:WPA;S:Cafe;P:pass1234;;'),
        ('wifi', {'ssid': 'a;b,c:d"e\\f', 'password': 'p;w,"x\\', 'auth': 'WPA', 'hidden': True}, 'WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;w\\,\\"x\\\\;H:true;;'),
        ('wifi', {'ssid': '카페 와이파이 😀', 'password': '', 'auth': 'nopass'}, 'WIFI:T:nopass;S:카페 와이파이 😀;;'),
        ('wifi', {'ssid': 'Old', 'password': 'abcde', 'auth': 'WEP'}, 'WIFI:T:WEP;S:Old;P:abcde;;'),
        ('email', {'to': 'a@b.com', 'subject': '안녕 & 반가워요?', 'body': 'line1\nline2 = ok'}, 'mailto:a@b.com?subject=%EC%95%88%EB%85%95%20%26%20%EB%B0%98%EA%B0%80%EC%9B%8C%EC%9A%94%3F&body=line1%0D%0Aline2%20%3D%20ok'),
        ('email', {'to': 'x@y.org', 'subject': '', 'body': ''}, 'mailto:x@y.org'),
        ('sms', {'phone': '010-1234-5678', 'message': '안녕: 주문 확인'}, 'SMSTO:01012345678:안녕: 주문 확인'),
        ('sms', {'phone': '+1 (555) 123-4567', 'message': ''}, 'SMSTO:+15551234567:'),
        ('tel', {'phone': '02-123-4567'}, 'tel:021234567'),
        ('tel', {'phone': '＋８２ １０'}, 'tel:+8210'),
        ('geo', {'lat': '37.5665', 'lng': '126.9780', 'mode': 'geo'}, 'geo:37.5665,126.9780'),
        ('geo', {'lat': '37.5665, 126.978', 'lng': '', 'mode': 'map'}, 'https://www.google.com/maps/search/?api=1&query=37.5665,126.978'),
        ('whatsapp', {'phone': '+82 10-1234-5678', 'message': '안녕 하세요'}, 'https://wa.me/821012345678?text=%EC%95%88%EB%85%95%20%ED%95%98%EC%84%B8%EC%9A%94'),
        ('url', {'url': 'example.com'}, 'https://example.com'),
        ('url', {'url': 'https://ex.com/a?b=1#h', 'utm': True, 'utm_source': 'qr', 'utm_medium': 'print', 'utm_campaign': '가을 전단'}, 'https://ex.com/a?b=1&utm_source=qr&utm_medium=print&utm_campaign=%EA%B0%80%EC%9D%84%20%EC%A0%84%EB%8B%A8#h'),
        ('url', {'url': 'ex.com', 'utm': True, 'utm_source': 'qr', 'utm_medium': '', 'utm_campaign': ''}, 'https://ex.com/?utm_source=qr'),
        ('text', {'text': '줄1\n줄2 😀'}, '줄1\n줄2 😀'),
    ]
    res = node("process.stdout.write(JSON.stringify(IN.map(c=>P.build(c[0],c[1]))))", cases)
    for (t, f, exp), r in zip(cases, res):
        ok(r['ok'] and r['data'] == exp, f'formats {t}: {r.get("data")!r} != {exp!r}')
    bad = [('url', {'url': 'exa mple.com'}, 'url_space'), ('url', {'url': 'javascript:alert(1)'}, 'url_scheme'), ('url', {'url': 'localhostt'}, 'url_nodot'),
           ('wifi', {'ssid': 'x', 'password': '', 'auth': 'WPA'}, 'wifi_nopass'), ('geo', {'lat': '91', 'lng': '0'}, 'lat_range'), ('geo', {'lat': 'abc', 'lng': '0'}, 'lat_bad'),
           ('tel', {'phone': '12a'}, 'phone_bad'), ('email', {'to': 'a@b'}, 'email_bad'), ('whatsapp', {'phone': '010-1234-5678'}, 'wa_country'),
           ('event', {'title': 'x', 'start': '2026-10-14T10:00', 'end': '2026-10-14T09:00'}, 'end_before'), ('event', {'title': 'x', 'start': '2026-02-30T10:00'}, 'date_bad'),
           ('vcard', {'phones': [{'type': 'cell', 'num': '1'}]}, 'vcard_name')]
    res = node("process.stdout.write(JSON.stringify(IN.map(c=>P.build(c[0],c[1]))))", bad)
    for (t, f, code), r in zip(bad, res):
        ok(not r['ok'] and any(e['c'] == code for e in r['err']), f'formats 틀린 입력 {t} {f} → {code} 기대, {r}')
    # vCard: 줄 접기 75바이트, CRLF, 이스케이프 → vobject 로 다시 읽어 값이 같은지
    long_note = '한글 메모가 아주 길어서 접기가 여러 번 일어나야 합니다. ' * 5 + '😀 끝; 쉼표, 역슬래시\\'
    vc = {'first': '길동', 'last': '홍', 'org': '루멘랩; 연구소', 'title': '대표, 개발', 'phones': [{'type': 'cell', 'num': '010-1234-5678'}, {'type': 'work', 'num': '+82 2 123 4567'}],
          'email': 'gd@example.com', 'web': 'example.com', 'street': '세종대로 1', 'city': '중구', 'region': '서울', 'zip': '04524', 'country': '대한민국', 'note': long_note + '\n둘째 줄'}
    r = node("process.stdout.write(JSON.stringify(P.build('vcard',IN)))", vc)
    d = r['data']
    lines = d.split('\r\n')
    ok(all(len(l.encode('utf-8')) <= 75 for l in lines), 'vcard 줄이 75바이트를 넘음')
    ok('\n' not in d.replace('\r\n', ''), 'vcard 에 CRLF 아닌 줄바꿈')
    ok(lines[0] == 'BEGIN:VCARD' and lines[1] == 'VERSION:3.0' and lines[-1] == 'END:VCARD', 'vcard 머리·꼬리')
    v = vobject.readOne(d)
    ok(v.fn.value == '홍길동', f'vcard FN {v.fn.value}')
    ok(v.n.value.family == '홍' and v.n.value.given == '길동', 'vcard N')
    ok(v.org.value == ['루멘랩; 연구소'], f'vcard ORG {v.org.value}')
    ok(v.title.value == '대표, 개발', 'vcard TITLE')
    ok(v.note.value == long_note + '\n둘째 줄', 'vcard NOTE(접기·이스케이프 되돌림)')
    ok([t.value for t in v.tel_list] == ['01012345678', '+8221234567'], 'vcard TEL 둘')
    ok(v.url.value == 'https://example.com', 'vcard URL')
    ok(v.adr.value.street == '세종대로 1' and v.adr.value.code == '04524', 'vcard ADR')
    # 영어 이름
    r = node("process.stdout.write(JSON.stringify(P.build('vcard',{first:'Jamie',last:'Kim',phones:[]})))")
    ok('FN:Jamie Kim' in r['data'], 'vcard 영어 FN 은 이름 성')
    # 일정
    ev = {'title': '가을 행사; 1부, 2부', 'start': '2026-10-20T18:30', 'end': '2026-10-20T21:00', 'location': '서울, 중구', 'desc': '줄1\n줄2'}
    r = node("process.stdout.write(JSON.stringify(P.build('event',IN)))", ev)
    e = Event.from_ical(r['data'])
    ok(str(e['SUMMARY']) == ev['title'] and str(e['LOCATION']) == ev['location'] and str(e['DESCRIPTION']) == ev['desc'], 'event 글 이스케이프')
    ok(e['DTSTART'].dt.strftime('%Y%m%d%H%M') == '202610201830' and e['DTEND'].dt.strftime('%H%M') == '2100', 'event 시각')
    r = node("process.stdout.write(JSON.stringify(P.build('event',{title:'휴가',allday:true,start:'2026-12-24',end:'2026-12-26'})))")
    ok('DTSTART;VALUE=DATE:20261224' in r['data'] and 'DTEND;VALUE=DATE:20261227' in r['data'], f'event 하루 종일(끝 다음 날) {r["data"]!r}')
    r = node("process.stdout.write(JSON.stringify(P.build('event',{title:'x',start:'2026-10-20T09:00'})))")
    ok('DTEND:20261020T100000' in r['data'], 'event 끝이 없으면 1시간')
    # 와이파이: 스캐너 풀기와 왕복
    rt = node("process.stdout.write(JSON.stringify(IN.map(f=>S.parseWifi(P.build('wifi',f).data))))", [c[1] for c in cases if c[0] == 'wifi'])
    for c, p in zip([c[1] for c in cases if c[0] == 'wifi'], rt):
        ok(p['ssid'] == c['ssid'] and p['password'] == (c['password'] if c['auth'] != 'nopass' else '') and p['hidden'] == bool(c.get('hidden')), f'wifi 왕복 {c}')
    # vCard 줄 접기: 글자 하나(여러 바이트)를 쪼개지 않음
    r = node("process.stdout.write(JSON.stringify(P.fold('NOTE:'+'가'.repeat(60))))")
    ok(all(len(l.encode()) <= 75 for l in r.split('\r\n')) and ''.join(x.lstrip(' ') if i else x for i, x in enumerate(r.split('\r\n'))) == 'NOTE:' + '가' * 60, 'fold 한글 경계')
    r = node("process.stdout.write(JSON.stringify(P.fold('NOTE:'+'😀'.repeat(30))))")
    ok(all(len(l.encode()) <= 75 for l in r.split('\r\n')) and '�' not in r, 'fold 이모지 경계')


# ---------- 디자인 → 판독 ----------
def zx(im):
    import zxingcpp
    return [x.text for x in zxingcpp.read_barcodes(im, formats=zxingcpp.BarcodeFormat.QRCode)]


def svg_png(svg, px=700, bg='white'):
    import cairosvg
    from PIL import Image
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, background_color=bg)
    return Image.open(io.BytesIO(png)).convert('RGB')


def designs(n_random):
    """꾸밈 세트(두 언어) + 무작위 조합. 대비가 충분한 색만(시험은 '읽혀야 하는 조합'이 읽히는지 본다)."""
    rnd = random.Random(20261014)
    pre = node("process.stdout.write(JSON.stringify({L:PRE.LIST.map(p=>[PRE.style(p,'ko'),PRE.style(p,'en')]).flat(),D:R.DOTS,EO:R.EYE_OUT,EI:R.EYE_IN,F:R.FRAMES}))")
    out = [dict(s, margin=4) for s in pre['L']]
    darks = ['#111111', '#1f2a44', '#0f3d5e', '#4a2e1f', '#14532d', '#5b2a86', '#7a1f2b', '#0b5c56', '#333333']
    lights = ['#ffffff', '#fffaf2', '#fff7f2', '#f4fbf6', '#fffdf4']
    words = ['SCAN ME', '메뉴 보기', 'JOIN WI-FI', '리뷰 남기기', '']
    for i in range(n_random):
        g = rnd.choice(['none', 'none', 'linear', 'radial'])
        st = {'dots': rnd.choice(pre['D']), 'eyeOuter': rnd.choice(pre['EO']), 'eyeInner': rnd.choice(pre['EI']), 'fg': rnd.choice(darks), 'grad': g, 'fg2': rnd.choice(darks),
              'angle': rnd.randrange(0, 360, 15), 'eyeColor': rnd.random() < 0.3, 'eyeOut': rnd.choice(darks), 'eyeIn': rnd.choice(darks + ['#b3261e']),
              'bg': rnd.choice(lights), 'transparent': rnd.random() < 0.15, 'frame': rnd.choice(pre['F']), 'frameText': rnd.choice(words),
              'frameColor': rnd.choice(darks), 'frameTextColor': '#ffffff', 'margin': 4}
        out.append(st)
    return out


CONTENTS = ['https://qr.lumenlab.page/ko/', 'WIFI:T:WPA;S:Cafe Guest;P:hello2026;;', 'https://example.com/menu?table=12&utm_source=qr', '안녕하세요 오래QR 😀',
            'BEGIN:VCARD\r\nVERSION:3.0\r\nN:홍;길동;;;\r\nFN:홍길동\r\nTEL;TYPE=CELL,VOICE:01012345678\r\nEND:VCARD', 'mailto:a@b.com?subject=hi']


def design():
    print('design: 꾸밈 세트 + 무작위 조합을 SVG 로 그려 zxing 으로 읽기')
    styles = designs(220)
    jobs = [{'t': CONTENTS[i % len(CONTENTS)], 'e': 'MQHL'[i % 4] if i % 4 != 3 else 'Q', 's': s} for i, s in enumerate(styles)]
    svgs = node("process.stdout.write(JSON.stringify(IN.map(j=>R.toSVG(R.scene(QR.encode(j.t,{ecl:j.e,boost:false}),j.s,G),{px:700}))))", jobs)
    bad = 0
    for j, svg in zip(jobs, svgs):
        got = zx(svg_png(svg))
        good = j['t'] in got
        bad += not good
        ok(good, f"design 안 읽힘: {json.dumps(j['s'], ensure_ascii=False)[:220]} 내용 {j['t'][:30]!r}")
    print(f'  {len(jobs)}개 중 안 읽힘 {bad}')
    # 로고 칸 비우기(가운데 상자, 오류 복원 H, 크기 22%)
    logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    jobs = [{'t': CONTENTS[0], 'e': 'H', 's': dict(s, logo={'src': logo, 'w': 1, 'h': 1, 'size': 0.22, 'clear': True, 'plate': True})} for s in styles[:30]]
    svgs = node("process.stdout.write(JSON.stringify(IN.map(j=>R.toSVG(R.scene(QR.encode(j.t,{ecl:j.e,boost:false}),j.s,G),{px:700}))))", jobs)
    lb = sum(1 for j, svg in zip(jobs, svgs) if j['t'] in zx(svg_png(svg)))
    ok(lb == len(jobs), f'design 로고 22% + H: {lb}/{len(jobs)} 읽힘')
    print(f'  로고 넣은 것 {lb}/{len(jobs)}')
    # 어두운 바탕 위의 투명 PNG 처럼: 투명 + 흰 종이 위 / 어두운 판 위 스티커(다이컷 흰 테두리 포함)
    jobs = [{'t': CONTENTS[0], 'e': 'M', 's': dict(s, transparent=True)} for s in styles[:20]]
    svgs = node("process.stdout.write(JSON.stringify(IN.map(j=>R.toSVG(R.scene(QR.encode(j.t,{ecl:j.e,boost:false}),j.s,G),{px:700, cut:1.4}).replace('class=\"cut\"','fill=\"#fff\" stroke=\"#fff\"'))))", jobs)
    dk = sum(1 for j, svg in zip(jobs, svgs) if j['t'] in zx(svg_png(svg, bg='#121815')))
    ok(dk == len(jobs), f'design 어두운 판 위 스티커: {dk}/{len(jobs)}')
    print(f'  어두운 판 위 스티커 {dk}/{len(jobs)}')


# ---------- 파일 ----------
def files():
    print('files: PDF·EPS·시트·ZIP')
    styles = designs(12)
    for i, s in enumerate(styles[:14]):
        t = CONTENTS[i % len(CONTENTS)]
        r = node("const sc=R.scene(QR.encode(IN.t,{ecl:'Q',boost:false}),IN.s,G);fs.writeFileSync(IN.p+'.pdf',Buffer.from(X.pdfOne(sc,5,IN.i%2?'fit':'a4')));fs.writeFileSync(IN.p+'.eps',Buffer.from(X.eps(sc,5)));process.stdout.write('1')",
                 {'t': t, 's': s, 'p': str(TMP / f'f{i}'), 'i': i})
        subprocess.run(['pdftoppm', '-r', '150', '-png', '-singlefile', str(TMP / f'f{i}.pdf'), str(TMP / f'f{i}p')], check=True)
        from PIL import Image
        ok(t in zx(Image.open(TMP / f'f{i}p.png')), f'files PDF 안 읽힘 #{i}')
        if shutil.which('gs'):
            subprocess.run(['gs', '-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-sDEVICE=png16m', '-r300', '-dEPSCrop', f'-sOutputFile={TMP / f"f{i}e.png"}', str(TMP / f'f{i}.eps')], check=True)
            ok(t in zx(Image.open(TMP / f'f{i}e.png')), f'files EPS 안 읽힘 #{i}')
        elif i == 0:
            cant.append('EPS: ghostscript 없음')
        # PDF 가 벡터인지(그림 없이 경로만): 이미지 객체 수
        pdf = (TMP / f'f{i}.pdf').read_bytes()
        ok(b'/Subtype /Image' not in pdf, 'files PDF 에 그림(비트맵)이 들어감')
    # qpdf 로 PDF 구조 검사
    if shutil.which('qpdf'):
        r = subprocess.run(['qpdf', '--check', str(TMP / 'f0.pdf')], capture_output=True, text=True)
        ok(r.returncode == 0, 'files qpdf --check 실패: ' + r.stdout[-300:])
    # PDF 크기: A4 / 그림 크기 5cm
    from PIL import Image
    r = subprocess.run(['pdfinfo', str(TMP / 'f0.pdf')], capture_output=True, text=True).stdout
    ok('595.276 x 841.89' in r or '595.28 x 841.89' in r, 'files A4 크기: ' + r)
    r = subprocess.run(['pdfinfo', str(TMP / 'f1.pdf')], capture_output=True, text=True).stdout
    import re as _re
    m = _re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', r)
    # 크기 = QR 무늬(여백·틀 빼고) 한 변. 쪽 크기 = 장면 크기 × (5cm / 무늬 칸 수)
    geo = node("const sc=R.scene(QR.encode(IN.t,{ecl:'Q',boost:false}),IN.s,G);process.stdout.write(JSON.stringify({W:sc.W,H:sc.H,n:sc.qr.n}))", {'t': CONTENTS[1], 's': styles[1]})
    want = max(geo['W'], geo['H']) * (50 / 25.4 * 72) / geo['n']
    ok(m and abs(max(float(m.group(1)), float(m.group(2))) - want) < 0.1, f'files 그림 크기(무늬 5cm): {m and m.groups()} != {want:.2f}')
    # 그린 그림에서 무늬 폭을 직접 잰다(눈 바깥 왼쪽 끝 ~ 오른쪽 끝)
    subprocess.run(['pdftoppm', '-r', '254', '-png', '-singlefile', str(TMP / 'f0.pdf'), str(TMP / 'f0m')], check=True)   # 254dpi = 1mm 에 10px
    import numpy as np
    a = np.asarray(Image.open(TMP / 'f0m.png').convert('L')) < 100
    xs = np.where(a.any(axis=0))[0]   # 진한 픽셀이 있는 열의 처음·끝 = 눈 바깥 끝(첫 꾸밈은 틀 없는 '기본')
    ok(len(xs) and abs((xs[-1] - xs[0] + 1) / 10 - 50) < 1.0, f'files A4 PDF 의 QR 무늬 폭 {(xs[-1] - xs[0] + 1) / 10 if len(xs) else 0}mm (50mm 기대)')
    # 스티커 시트: 칸 수와 각 칸이 읽힘, 재단선
    for cm in (2, 3, 4, 5, 8):
        g = node("const sc=R.scene(QR.encode('https://qr.lumenlab.page/',{ecl:'M'}),{frame:'band',frameText:'SCAN ME'},G);const r=X.pdfSheet(sc,IN.cm,{});fs.writeFileSync(IN.p,Buffer.from(r.bytes));process.stdout.write(JSON.stringify({n:r.geo.cells.length,c:r.geo.cols,r:r.geo.rows,m:r.geo.marks.length,w:r.geo.w,h:r.geo.h}))",
                 {'cm': cm, 'p': str(TMP / f'sheet{cm}.pdf')})
        ok(g['n'] == g['c'] * g['r'] and g['n'] > 0 and g['m'] == g['n'] * 8, f'files 시트 {cm}cm 칸·재단선 {g}')
        nn = node("const sc=R.scene(QR.encode('https://qr.lumenlab.page/',{ecl:'M'}),{frame:'band',frameText:'SCAN ME'},G);process.stdout.write(JSON.stringify({n:sc.qr.n,W:sc.W,H:sc.H}))")
        ok(abs(g['w'] - nn['W'] * (cm * 10 / 25.4 * 72) / nn['n']) < 0.01, f'files 시트 {cm}cm: 무늬 크기 = {cm}cm')
        # 칸들이 A4 안·서로 안 겹침은 sheet() 계산으로(여백 10mm)
        subprocess.run(['pdftoppm', '-r', '200' if cm <= 3 else '120', '-png', '-singlefile', str(TMP / f'sheet{cm}.pdf'), str(TMP / f'sheet{cm}')], check=True)
        got = zx(Image.open(TMP / f'sheet{cm}.png'))
        ok(got.count('https://qr.lumenlab.page/') == g['n'], f'files 시트 {cm}cm: {g["n"]}칸 중 {got.count("https://qr.lumenlab.page/")}개 읽힘')
        print(f'  시트 {cm}cm: {g["n"]}장({g["c"]}×{g["r"]}), 읽힘 {got.count("https://qr.lumenlab.page/")}')
    big = node("const sc=R.scene(QR.encode('a'),{},G);process.stdout.write(JSON.stringify(X.sheet(sc.W,sc.H,30,{})))")
    ok(not big['fits'] and big['cells'] == [], 'files 시트 30cm 는 A4 에 안 들어감')
    # ZIP: 파일 수·이름(한글·같은 이름)·각 PNG 읽힘
    names = ['가게.png', 'menu.png', 'menu.png', 'MENU.png', 'a/b.png'.replace('/', '-')]
    uniq = node("process.stdout.write(JSON.stringify(X.uniqueNames(IN)))", names)
    ok(uniq == ['가게.png', 'menu.png', 'menu-2.png', 'MENU-3.png', 'a-b.png'], f'files 같은 이름 번호 {uniq}')
    svgs = node("process.stdout.write(JSON.stringify(IN.map((t,i)=>R.toSVG(R.scene(QR.encode(t,{ecl:'M'}),{dots:'rounded'},G),{px:600}))))", CONTENTS[:5])
    import cairosvg
    pngs = [cairosvg.svg2png(bytestring=s.encode(), output_width=600, background_color='white') for s in svgs]
    zbytes = node("const z=X.zip(IN.map(f=>({name:f.n,data:Buffer.from(f.d,'base64')})));process.stdout.write(JSON.stringify(Buffer.from(z).toString('base64')))",
                  [{'n': n, 'd': __import__('base64').b64encode(p).decode()} for n, p in zip(uniq, pngs)])
    zf = zipfile.ZipFile(io.BytesIO(__import__('base64').b64decode(zbytes)))
    ok(zf.testzip() is None, 'files ZIP CRC')
    ok(zf.namelist() == uniq, f'files ZIP 이름 {zf.namelist()}')
    for n, t in zip(uniq, CONTENTS[:5]):
        ok(t in zx(__import__('PIL.Image', fromlist=['Image']).open(io.BytesIO(zf.read(n)))), f'files ZIP 속 {n} 안 읽힘')
    # 시스템 unzip 으로도 열리는지
    if shutil.which('unzip'):
        (TMP / 'z.zip').write_bytes(__import__('base64').b64decode(zbytes))
        r = subprocess.run(['unzip', '-t', str(TMP / 'z.zip')], capture_output=True, text=True)
        ok(r.returncode == 0, 'files unzip -t 실패 ' + r.stdout[-200:])


# ---------- 스캐너 경고 ----------
def scanner():
    print('scanner: 경고 규칙')
    cases = [
        ('https://naver.com', []), ('http://naver.com', ['http']), ('https://bit.ly/abc', ['short']), ('https://192.168.0.1/login', ['ip', 'words']),
        ('https://xn--80ak6aa92e.com', ['puny']), ('https://www.google.com@evil.example/', ['at']), ('https://user:pw@site.com', ['at']),
        ('https://secure-login.example.com/verify', ['words']), ('https://shop.co.kr:8443/', ['port']), ('https://kko.to/x', ['short']), ('https://naver.me/abc', ['short']),
        ('https://www.bbc.co.uk/news', []), ('https://me2.do/xyz', ['short']), ('https://택배조회.kr/미납', ['puny', 'words']),
    ]
    res = node("process.stdout.write(JSON.stringify(IN.map(u=>S.urlRisk(u))))", [c[0] for c in cases])
    for (u, exp), r in zip(cases, res):
        ok(sorted(r['flags']) == sorted(exp), f'scanner {u}: {r["flags"]} != {exp}')
    md = node("process.stdout.write(JSON.stringify([S.urlRisk('https://www.google.com@evil.example/').main, S.urlRisk('https://a.b.shop.co.kr/').main, S.urlRisk('https://m.blog.naver.com/x').main]))")
    ok(md == ['evil.example', 'shop.co.kr', 'naver.com'], f'scanner 실제 도메인 {md}')
    kinds = [('javascript:alert(1)', 'blocked'), ('data:text/html,hi', 'blocked'), ('WIFI:S:x;T:WPA;P:y;;', 'wifi'), ('BEGIN:VCARD\nFN:x\nEND:VCARD', 'vcard'), ('MATMSG:TO:a@b.c;SUB:s;BODY:b;;', 'email'),
             ('smsto:010:hi', 'sms'), ('tel:+1', 'tel'), ('geo:1,2', 'geo'), ('www.example.com/a', 'url'), ('hello world', 'text'), ('BEGIN:VEVENT\nSUMMARY:x\nEND:VEVENT', 'event')]
    res = node("process.stdout.write(JSON.stringify(IN.map(t=>S.parse(t).type)))", [k[0] for k in kinds])
    for (t, exp), r in zip(kinds, res):
        ok(r == exp, f'scanner 종류 {t!r}: {r} != {exp}')


def presets():
    print('presets: 대비 4.5:1 이상, 문구 글자가 base.json 에 다 있음')
    r = node("process.stdout.write(JSON.stringify(PRE.LIST.map(p=>{const s=PRE.style(p,'ko'),e=PRE.style(p,'en');const cs=[s.fg].concat(s.grad!=='none'?[s.fg2]:[]).concat(s.eyeColor?[s.eyeOut,s.eyeIn]:[]);"
             "return {id:p.id,min:Math.min(...cs.map(c=>R.contrast(c,s.bg))),miss:[...(s.frameText+e.frameText)].filter(c=>c!==' '&&!G.g[c])}})))")
    ok(len(r) >= 8, f'presets {len(r)}개(8개 이상)')
    for p in r:
        ok(p['min'] >= 4.5, f"presets {p['id']} 대비 {p['min']:.2f}")
        ok(not p['miss'], f"presets {p['id']} 글자 없음 {p['miss']}")


def names():
    print('names: 파일 이름')
    cases = [('url', {'url': 'https://www.example.com/menu/today?x=1'}, 'qr-url-example-com-menu-today'), ('wifi', {'ssid': 'Cafe: Guest/2', 'password': 'pw123456'}, 'qr-wifi-Cafe-Guest-2'),
             ('text', {'text': '안녕 하세요'}, 'qr-text-안녕-하세요')]
    r = node("process.stdout.write(JSON.stringify(IN.map(c=>P.fileBase(P.build(c[0],c[1])))))", cases)
    for c, x in zip(cases, r):
        ok(x == c[2], f'names {x} != {c[2]}')


# ---------- 2단계(제3자 평가) ----------
def phase2():
    print('phase2: 틀 여백·규칙 판정·글자 모양·스캐너·일정 시간대')
    # H1: 틀이 있으면 여백이 2칸 아래로 안 내려간다(틀 없음은 그대로)
    r = node("process.stdout.write(JSON.stringify(R.FRAMES.map(f=>{const sc=R.scene(QR.encode('a'),{frame:f,margin:0,frameText:'X'},G);return [f,sc.qr.margin,sc.qr.asked]})))")
    for f, m, asked in r:
        ok(m == (0 if f == 'none' else 2) and asked == 0, f'틀 {f} 여백 {m}')
    # 규칙 판정(브라우저 없이 warnings 만): verify.js 는 브라우저 전용이라 노드에서 root 를 흉내 낸다
    code = (A / 'verify.js').read_text(encoding='utf-8')
    cases = [({'fg': '#e53935', 'bg': '#43a047'}, 'contrast', True), ({'fg': '#9a9a9a'}, 'contrast', False), ({'fg': '#ffffff', 'bg': '#111111'}, 'inverted', True),
             ({'grad': 'linear', 'fg': '#000000', 'fg2': '#ffffff'}, 'contrast_grad', False), ({'grad': 'linear', 'fg': '#dddddd', 'fg2': '#eeeeee'}, 'contrast_grad', True),
             ({'grad': 'radial', 'fg': '#1e88e5', 'fg2': '#26a69a'}, 'contrast_grad', False), ({'eyeColor': True, 'eyeOut': '#f0f0f0', 'eyeIn': '#111111'}, 'eye', True),
             ({'fg': '#795548', 'bg': '#d7ccc8'}, None, False)]
    js = ("global.self=global;" + "global.QRR=R;" + code + ";const out=IN.map(c=>{const st=Object.assign({},PRE.BASE,c[0]);const sc=R.scene(QR.encode('https://a.co'),st,G);"
          "const w=QRV.warnings(sc,st).filter(x=>!x.info);return w.map(x=>[x.c,!!x.hard,x.p||{}])});process.stdout.write(JSON.stringify(out))")
    res = node(js, cases)
    for (st, code_, hard), w in zip(cases, res):
        if code_ is None:
            ok(not w, f'규칙 {st}: 걸리면 안 됨 {w}')
        else:
            ok(w and w[0][0] == code_ and w[0][1] == hard, f'규칙 {st}: {w} (기대 {code_}, hard={hard})')
            if 'c' in (w[0][2] if w else {}):
                ok(w[0][2].get('a') and w[0][2].get('b'), f'규칙 {st}: 비교한 두 색을 알림')
    # 그라데이션 검정→흰: 가장 밝은 점 색(#ffffff)으로 대비를 계산 → 반전/대비 1.0 이 아니라 '가장 밝은 쪽' 경고
    # M5: 틀 문구 글자 — Café, ñ, ü, ß, €, –, …, ✓, → 를 그린다(빠지는 글자 0)
    g = json.loads((A / 'glyphs/base.json').read_text(encoding='utf-8'))
    for name in ('lat', 'sym'):
        g['g'].update(json.loads((A / f'glyphs/{name}.json').read_text(encoding='utf-8')))
    r = node("const g=IN;const out=['Café ☕','Niño über Straße','€5 – 10…','✓ →','SCAN ME'].map(t=>R.textPath(g,t,{x:0,y:0,w:100,h:20}).missing);process.stdout.write(JSON.stringify(out))", g)
    ok(r[0] == ['☕'] and r[1] == [] and r[2] == [] and r[3] == [] and r[4] == [], f'틀 문구 빠진 글자 {r}')
    ok(all(any(lo <= ord(c) <= hi and nm in ('lat', 'sym') for lo, hi, nm in g['chunks']) for c in 'éñü€–✓'), 'glyph 조각 색인에 라틴·기호')
    # L4 스캐너
    r = node("process.stdout.write(JSON.stringify([S.urlRisk('https://exa%6Dple.com/a').flags,S.urlRisk('https://kakaobank.co.kr.secure-login.top/x').flags,S.urlRisk('https://www.bbc.co.uk/').flags,S.parse('tel:060-700-1234').paid,S.parse('SMSTO:+1 900 555 0000:x').paid,S.parse('tel:02-123-4567').paid]))")
    ok(r[0] == ['pct'] and 'lookalike' in r[1] and r[2] == [] and r[3] is True and r[4] is True and r[5] is False, f'스캐너 새 경고 {r}')
    # L9 일정: 시간대 → UTC Z
    r = node("process.stdout.write(JSON.stringify(P.build('event',{title:'x',start:'2026-11-01T18:00',end:'2026-11-01T19:00',tzOffset:-540}).data))")
    ok('DTSTART:20261101T090000Z' in r and 'DTEND:20261101T100000Z' in r, f'일정 UTC {r!r}')
    r = node("process.stdout.write(JSON.stringify(P.build('event',{title:'x',allday:true,start:'2026-11-01',tzOffset:-540}).data))")
    ok('DTSTART;VALUE=DATE:20261101' in r, '하루 종일은 날짜 그대로')
    # 가짜 예시 무늬는 안 읽힌다, 진짜는 읽힌다
    svgs = node("const q=QR.encode('https://example.com/menu',{ecl:'M',boost:false});process.stdout.write(JSON.stringify([R.toSVG(R.scene(R.fake(q),{},G),{px:600}),R.toSVG(R.scene(q,{},G),{px:600})]))")
    ok(not zx(svg_png(svgs[0])) and 'https://example.com/menu' in zx(svg_png(svgs[1])), '예시 무늬는 찍어도 안 읽힘')


for name, fn in (('encoder', encoder), ('formats', formats), ('phase2', phase2), ('scanner', scanner), ('presets', presets), ('names', names), ('design', design), ('files', files)):
    if want(name):
        try:
            fn()
        except Exception as e:  # 한 묶음이 죽어도 나머지는 돌린다
            import traceback
            traceback.print_exc()
            fails.append(f'{name} 가 도중에 멈춤: {e!r}'[:300])
shutil.rmtree(TMP, ignore_errors=True)
print(f'로직 시험 {passed + len(fails)}개 중 실패 {len(fails)}개' + (f' · 못 함: {"; ".join(cant)}' if cant else ''))
sys.exit(1 if fails else 0)
