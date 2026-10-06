// 배치 시안 공통: 실제 계산 몇 개로 기록을 만들고, 옆 패널(기록 + 키보드)을 만든다
window.__proto = function (lang) {
  var ko = lang !== 'en';
  ['√(8)+frac(1,2)', 'frac(1,3)+frac(1,4)', '6÷2(1+2)'].forEach(function (t) {
    var b = document.querySelector('[data-try="' + t + '"]'); if (b) b.click();
    document.querySelector('[data-k=ac]').click();
  });
  ['sin', '3', '0', 'rp', 'eq'].forEach(function (k) { document.querySelector('[data-k="' + k + '"]').click(); });
  document.querySelector('[data-open=history]').click();
  var list = document.querySelector('.sheet .hist-list').cloneNode(true);
  document.querySelector('.sheet-close').click();
  var side = document.createElement('aside'); side.className = 'side';
  side.innerHTML = '<section class="side-box"><div class="side-h"><h2>' + (ko ? '기록' : 'History') + '</h2><button type="button" class="side-x">' + (ko ? '지우기' : 'Clear') + '</button></div>' +
    '<p class="side-note">' + (ko ? '누르면 식을 다시 불러와요' : 'Tap to reuse') + '</p></section>' +
    '<section class="side-box"><h2>' + (ko ? '키보드로 쓰기' : 'Keyboard') + '</h2><dl class="kbd-list">' +
    [['sin  sqrt  log', ko ? '글자 → 함수' : 'words → functions'], ['/', ko ? '분수' : 'fraction'], ['^', ko ? '거듭제곱' : 'power'],
     ['Enter', '='], ['Shift+Enter', ko ? '소수로' : 'decimal'], ['Esc', ko ? '모두 지우기' : 'clear'], ['↑ ↓', ko ? '이전 식' : 'previous']]
      .map(function (r) { return '<div><dt>' + r[0].split('  ').map(function (x) { return '<kbd>' + x + '</kbd>'; }).join(' ') + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') +
    '</dl><a class="side-link" href="#keys">' + (ko ? '키 뜻 전체 보기 →' : 'All keys →') + '</a></section>';
  side.querySelector('.side-box').insertBefore(list, side.querySelector('.side-note'));
  return side;
};
