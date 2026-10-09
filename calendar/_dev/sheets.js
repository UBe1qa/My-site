// make_files.py 가 부른다: 표준 입력으로 받은 일감(JSON 배열)마다 종이 SVG와 크기를 돌려준다.
// 일감: { name, pages: [sheet 옵션, ...] }  /  { xlsx: 연도 } 면 엑셀용 날짜 정보.
const path = require('path');
const C = require(path.join(__dirname, '..', 'assets', 'core.js'));
const S = require(path.join(__dirname, '..', 'assets', 'sheet.js'));
let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  const out = JSON.parse(input).map((job) => {
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
