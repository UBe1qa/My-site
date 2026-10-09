// 로컬 확인용 정적 서버(Cloudflare처럼 폴더 주소 → index.html, 없는 주소 → 404.html): node pick/_dev/serve.mjs [포트]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.wasm': 'application/wasm' };
const port = +process.argv[2] || 8442;
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.split('/').some((s) => s === '_dev' || s === 'tests' || s === '..')) p = '/__nope';
  let f = path.join(ROOT, p);
  if (p.endsWith('/')) f = path.join(f, 'index.html');
  else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { res.writeHead(307, { Location: p + '/' }); return res.end(); }
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return res.end(fs.readFileSync(path.join(ROOT, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
