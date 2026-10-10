/* 체크벤치: 불량화소 테스트(전체 화면 단색). 색은 누르거나 키를 눌렀을 때만 바뀐다(스스로 넘어가지 않는다).
   전체 화면 위에는 아무것도 그리지 않는다. 전체 화면을 못 쓰는 브라우저(아이폰 등)에서는 창을 가득 채운다. */
(function () {
  'use strict';
  var A = window.CKApp, d = document;
  if (!A) return;
  var el = A.$('[data-px-full]');
  if (!el) return;
  var T = A.T, COLORS = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
  var active = false, start = 0, shown = 0, usedFs = false;
  function fsEl() { return d.fullscreenElement || d.webkitFullscreenElement || null; }
  function paint() { el.style.background = COLORS[(start + shown) % COLORS.length]; }
  function exit() {
    if (!active) return;
    active = false;
    el.hidden = true;
    d.documentElement.style.overflow = '';
    if (fsEl()) { var x = d.exitFullscreen || d.webkitExitFullscreen; if (x) { try { var p = x.call(d); if (p && p.catch) p.catch(function () {}); } catch (e) { /* 이미 나감 */ } } }
    A.verdict('px', A.fmt(T.px_done, Math.min(shown + 1, 5)), T.px_done_s);
    A.setDev('px', 'on', null);
  }
  function next() { if (!active) return; if (shown >= COLORS.length - 1) return exit(); shown++; paint(); }
  function prev() { if (active && shown > 0) { shown--; paint(); } }
  function begin() {
    var picked = A.$('input[name="px"]:checked');
    start = picked ? +picked.value : 0; shown = 0; active = true; usedFs = false;
    paint();
    el.hidden = false;
    d.documentElement.style.overflow = 'hidden';
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { try { var p = req.call(el); usedFs = true; if (p && p.catch) p.catch(function () { usedFs = false; }); } catch (e) { usedFs = false; } }
  }
  d.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-act="px-start"]')) begin();
  });
  el.addEventListener('click', next);
  window.addEventListener('keydown', function (e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); exit(); }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  }, true);
  function fsChange() { if (active && usedFs && !fsEl()) exit(); }
  d.addEventListener('fullscreenchange', fsChange);
  d.addEventListener('webkitfullscreenchange', fsChange);
})();
