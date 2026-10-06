(function () {
  var side = window.__proto(document.documentElement.lang);
  var grid = document.querySelector('.hero-grid'), copy = grid.querySelector('.hero-copy'), tool = grid.querySelector('.tool');
  var calc = tool.querySelector('.calc'), kf = calc.querySelector('.keys-f'), kn = calc.querySelector('.keys-n');
  var pads = document.createElement('div'); pads.className = 'pads'; kf.parentNode.insertBefore(pads, kf); pads.appendChild(kf); pads.appendChild(kn);
  var w = document.createElement('div'); w.className = 'wrap hero-a';
  var head = document.createElement('div'); head.className = 'head-line'; head.appendChild(copy.querySelector('h1')); head.appendChild(copy.querySelector('.lede'));
  var work = document.createElement('div'); work.className = 'work'; work.appendChild(tool); work.appendChild(side);
  w.appendChild(head); w.appendChild(copy.querySelector('.modes')); w.appendChild(work);
  var pts = copy.querySelector('.hero-points'); pts.className = 'feat'; w.appendChild(pts);
  var ml = document.createElement('p'); ml.className = 'm-lede'; ml.innerHTML = w.querySelector('.lede').innerHTML; w.appendChild(ml);
  grid.replaceWith(w);
})();
