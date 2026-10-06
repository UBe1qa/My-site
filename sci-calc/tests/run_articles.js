// 가이드 글에 적은 숫자를 계산기로 다시 계산해 맞춰 본다 (tests/article_cases.json 은 tools/build.py 가 만든다)
var fs = require('fs'), path = require('path');
var SC = require('../assets/engine.js'), SCM = require('../assets/modes.js');
module.exports = function (ok) {
  var file = path.join(__dirname, 'article_cases.json');
  if (!fs.existsSync(file)) return;
  var cases = JSON.parse(fs.readFileSync(file, 'utf8'));
  function exact(v) { return SC.rowToPlain(SC.valueRow(v, {})).replace(/\((√?[0-9]+)\)/g, '$1').replace(/√\(([0-9]+)\)/g, '√$1'); }
  function dec(v) { return SC.decimalText(SC.formatDecimal(v, { mode: 'norm' })); }
  function x(n) { return SC.calc(String(n).replace(/-/g, '−')); }
  cases.forEach(function (c) {
    var where = c.page + ' ';
    try {
      if (c.e) {
        var env = SC.defaultEnv(); if (c.angle) env.angle = c.angle;
        var v = SC.calc(c.e, env);
        if (c.exact) ok(exact(v) === c.exact, where + c.e + ' 정확값', exact(v) + ' ≠ ' + c.exact);
        if (c.dec) ok(dec(v) === c.dec, where + c.e + ' 소수', dec(v) + ' ≠ ' + c.dec);
      } else if (c.stats) {
        var s = SCM.stats1(c.stats.map(x), null);
        ok(dec(s[c.key]) === c.dec, where + 'stats ' + c.key, dec(s[c.key]) + ' ≠ ' + c.dec);
      } else if (c.poly) {
        var rs = SCM.polyRoots(c.poly.map(x)).map(exact).sort();
        var want = c.roots.slice().sort();
        ok(JSON.stringify(rs) === JSON.stringify(want), where + 'poly ' + c.poly, rs.join(', ') + ' ≠ ' + want.join(', '));
      } else if (c.sys) {
        var r = SCM.solveSystem(c.sys.map(function (row) { return row.map(x); }), c.b.map(x));
        if (c.kind) ok(r.kind === c.kind, where + 'sys kind', r.kind + ' ≠ ' + c.kind);
        else ok(r.kind === 'one' && JSON.stringify(r.x.map(exact)) === JSON.stringify(c.x), where + 'sys', JSON.stringify(r.x && r.x.map(exact)) + ' ≠ ' + c.x);
      }
    } catch (e) { ok(false, where + JSON.stringify(c), e.message); }
  });
};
