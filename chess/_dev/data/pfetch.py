# 큰 파일을 여러 범위 요청으로 나눠 받아 순서대로 표준 출력에 쓴다(저장하지 않음).
# 쓰는 법: pfetch.py URL [시작 바이트] [끝 바이트(제외)]
import sys, subprocess, time, collections, concurrent.futures as cf
url = sys.argv[1]
def size():
    h = subprocess.run(['curl', '-sSI', url], capture_output=True, text=True).stdout
    for l in h.splitlines():
        if l.lower().startswith('content-length:'):
            v = l.split(':', 1)[1].strip()
            if v: return int(v)
    raise SystemExit('크기를 못 읽음')
start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
end = int(sys.argv[3]) if len(sys.argv) > 3 else size()
CH, W = 64 << 20, 8
def get(a, b):
    for t in range(7):
        r = subprocess.run(['curl', '-sS', '--fail', '-r', f'{a}-{b}', url], capture_output=True)
        if r.returncode == 0 and len(r.stdout) == b - a + 1:
            return r.stdout
        sys.stderr.write(f'다시 {a}-{b} ({r.returncode}, {len(r.stdout)})\n'); time.sleep(2 ** t)
    raise SystemExit(f'실패 {a}-{b}')
out = sys.stdout.buffer
t0 = time.time(); done = 0
with cf.ThreadPoolExecutor(W) as ex:
    q = collections.deque(); pos = start
    while pos < end or q:
        while pos < end and len(q) < W * 2:
            b = min(pos + CH, end) - 1
            q.append(ex.submit(get, pos, b)); pos = b + 1
        d = q.popleft().result(); out.write(d); done += len(d)
        if done % (CH * 32) < CH:
            sys.stderr.write(f'받음 {done/1e9:.1f}GB / {(end-start)/1e9:.1f}GB  {done/1e6/(time.time()-t0):.1f}MB/s\n'); sys.stderr.flush()
out.flush()
sys.stderr.write(f'받기 끝 {done} 바이트 {time.time()-t0:.0f}s\n')
