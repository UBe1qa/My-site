// make_files.py 가 부른다: 표준 입력으로 받은 일감(JSON 배열)마다 종이 SVG와 크기를 돌려준다.
// 일감: { name, pages: [sheet 옵션, ...] }  /  { xlsx: 연도 } 면 엑셀용 날짜 정보  /  { chars: 1 } 이면 종이에 찍힐 수 있는 글자 전부.
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'core.js'));
const S = require(path.join(__dirname, '..', 'assets', 'sheet.js'));
// 종이에 찍힐 수 있는 글자 전부(연도 2025~2030 × 언어 × 나라 × 용지 × 주 시작 × 모양 × 표시 항목). make_fonts.py 가 이 글자만 담은 글꼴을 만든다.
function allChars() {
  const set = new Set();
  const add = (sh) => sh.items.forEach((i) => { if (i.t) for (const ch of i.s) set.add(ch); });
  for (let year = 2025; year <= 2030; year++) for (const lang of ['ko', 'en']) for (const country of ['KR', 'US', 'NONE']) for (const paper of ['a4', 'letter']) for (const weekStart of [0, 1]) {
    for (const orient of ['landscape', 'portrait']) add(S.build({ kind: 'year', year, lang, country, paper, weekStart, orient, show: { week: true } }));
    for (let month = 1; month <= 12; month++) add(S.build({ kind: 'month', year, month, lang, country, paper, weekStart, show: { week: true, lunar: true, terms: true, son: true } }));
  }
  return [...set].sort().join('');
}
let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  const out = JSON.parse(input).map((job) => {
    if (job.chars) return { chars: allChars() };
    if (job.xlsx) {
      const y = job.xlsx, h = C.holidays('KR', y), months = [];
      for (let m = 1; m <= 12; m++) {
        const days = [];
        for (let d = 1; d <= C.dim(y, m); d++) {
          const l = C.lunar.fromSolar(y, m, d), it = h.byDate[C.iso(y, m, d)];
          days.push({ d, wd: C.wd(y, m, d), hol: it ? it.label : '', lunar: l && (l.d === 1 || l.d === 15 || d === 1) ? '음 ' + (l.leap ? '윤' : '') + l.m + '.' + l.d : '', term: C.termOn(y, m, d) || '' });
        }
        months.push({ m, grid: C.monthGrid(y, m, 0), days });
      }
      return { xlsx: y, basis: h.basis, months, list: h.list };
    }
    const sheets = job.pages.map((o) => S.build(o));
    return { name: job.name, w: sheets[0].w, h: sheets[0].h, title: job.title || sheets[0].title, svgs: sheets.map((s) => S.svg(s)) };
  });
  process.stdout.write(JSON.stringify(out));
});
