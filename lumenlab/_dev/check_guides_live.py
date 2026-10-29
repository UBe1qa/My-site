# 배포 뒤 가이드 이사(2026-10-29)를 실제 주소로 확인: bash lumenlab/_dev/check.sh live 가 파일 비교 다음에 부른다(혼자: python3 _dev/check_guides_live.py)
#   1) lumenlab.page 의 가이드 글·모음·RSS 가 200
#   2) 도구 사이트의 옛 가이드 주소(글·목록, 끝 / 있고 없고)가 이 사이트의 같은 글로 301 한 번에
#   3) 도구 사이트맵에 옛 /guide/ 주소가 없음
#   4) 출시 전이라 숨긴 것(catalog hold)의 옛 소개 페이지 주소가 홈의 그 선반으로 302
import os, sys, json, re, ssl, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
here = os.path.dirname(os.path.abspath(__file__)); site = os.path.dirname(here)
sys.path.insert(0, here); sys.dont_write_bytecode = True
import build_guides as BG
cat = json.load(open(os.path.join(here, 'catalog.json')))
ROOT = 'https://lumenlab.page'
ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or os.environ.get('REQUESTS_CA_BUNDLE'))

class NoFollow(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op = urllib.request.build_opener(NoFollow, urllib.request.HTTPSHandler(context=ctx))

def head(url):
    for _ in range(3):
        try:
            r = op.open(urllib.request.Request(url, method='GET', headers={'User-Agent': 'lumenlab-check'}), timeout=20)
            return r.status, r.headers.get('Location'), r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers.get('Location'), b''
        except Exception as e:
            err = str(e)
    return 0, err, b''

found = BG.find(site, cat)
jobs = []   # (주소, 기대 상태, 맞는 Location 들)
for a in found:
    tgt = ROOT + BG.root_path(a['it'], a['lang'], a['slug'])
    jobs.append((tgt, 200, None))
    jobs.append((a['src_url'], 301, (tgt,)))
    jobs.append((a['src_url'].rstrip('/'), 301, (tgt, tgt.rstrip('/'))))   # 끝 / 없는 주소는 바로 새 글로, 또는 / 없는 새 주소를 거쳐도 됨
for (iid, lang) in sorted({(a['it']['id'], a['lang']) for a in found}):
    a = next(x for x in found if x['it']['id'] == iid and x['lang'] == lang)
    jobs.append((a['index_url'], 301, (ROOT + BG.root_path(a['it'], lang),)))
for p in ('/guides/', '/en/guides/', '/guides/rss.xml'):
    jobs.append((ROOT + p, 200, None))
for k in ('games', 'apps'):
    for pre in ('', '/en'):
        jobs += [(f'{ROOT}{pre}/works/{it["id"]}/', 302, (f'{pre}/#{k}', f'{ROOT}{pre}/#{k}')) for it in cat.get(k, []) if it.get('hold')]

with ThreadPoolExecutor(12) as ex:
    res = list(ex.map(lambda j: (j, head(j[0])), jobs))
bad = [(u, got, loc, want) for (u, st, want), (got, loc, _) in res if got != st or (want and loc not in want)]
for b in bad[:15]: print('다름:', b)
print(f'가이드·숨긴 소개 페이지 주소 {len(jobs)}개 중 맞음 {len(jobs) - len(bad)}개')

# 도구 사이트맵에 옛 /guide/ 주소가 남지 않음
hosts = sorted({re.match(r'https://[^/]+', a['src_url']).group(0) for a in found})
left = []
for h in hosts:
    st, _, body = head(h + '/sitemap.xml')
    if st != 200 or b'<urlset' not in body: left.append(f'{h}/sitemap.xml {st}')
    elif re.search(rb'<loc>[^<]*/guide/', body): left.append(f'{h}/sitemap.xml 에 /guide/')
print('도구 사이트맵:', '옛 가이드 주소 없음' if not left else left)
sys.exit(1 if bad or left else 0)
