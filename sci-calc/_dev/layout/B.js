(function () {
  var lang = document.documentElement.lang, ko = lang !== 'en';
  var side = window.__proto(lang);
  var grid = document.querySelector('.hero-grid'), copy = grid.querySelector('.hero-copy'), tool = grid.querySelector('.tool');
  var desc = {};
  document.querySelectorAll('.after-hero .links a').forEach(function (a) { var s = a.querySelector('span'); if (s) desc[a.getAttribute('href')] = s.textContent; });
  var modes = copy.querySelector('.modes');
  modes.querySelectorAll('a').forEach(function (a) {
    var d = desc[a.getAttribute('href')] || (ko ? '분수·루트·함수 기본 계산' : 'Fractions, roots, functions');
    var s = document.createElement('small'); s.textContent = d; a.appendChild(s);
  });
  var w = document.createElement('div'); w.className = 'wrap hero-b';
  var left = document.createElement('div'); left.className = 'left';
  left.appendChild(copy.querySelector('h1')); left.appendChild(copy.querySelector('.lede')); left.appendChild(modes);
  w.appendChild(left); w.appendChild(tool); w.appendChild(side);
  var ml = document.createElement('p'); ml.className = 'm-lede'; ml.innerHTML = w.querySelector('.lede').innerHTML; w.appendChild(ml);
  grid.replaceWith(w);
})();
