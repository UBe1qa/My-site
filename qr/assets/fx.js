/* 오래QR — 손마다 반응(이펙트 엔진). 로직을 모르고, app.js 가 '무슨 일이 일어났다'만 알려 준다.
   세기: html.fx0(끔: 색만) / fx1(가볍게) / fx2(화려하게, 기본). '동작 줄이기'면 fx0 으로 고정(html.rm: 짧은 페이드만).
   - press(): 내용을 칠 때 스티커가 살짝 눌림(0.12초) — 결과(QR)는 이미 바뀐 뒤라 늦추지 않는다
   - sweep(): 디자인을 고를 때 점이 '인쇄되듯' 빛 띠가 한 번 쓸고 지나감(0.22초)
   - peel(): 저장할 때 스티커가 떼어짐: 모서리 말림 → 들림 → 제자리(0.68초, 화려하게만 크게)
   - stamp(big): 찍힘 확인 통과 때 도장 '쿵'(0.32초). 이어서 통과면 작게
   transform·opacity 만 움직이고, 끝나면 아무것도 돌지 않는다. 느린 기기는 스스로 한 단계 낮춘다. */
(function (root) {
  'use strict';
  var D = document, H = D.documentElement;
  function level() { return H.classList.contains('fx2') ? 2 : H.classList.contains('fx1') ? 1 : 0; }
  function el(id) { return D.getElementById(id); }
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var running = {};
  function play(key, node, frames, opt) {
    if (!node || !node.animate) return null;
    if (running[key]) { try { running[key].cancel(); } catch (e) { /* 이미 끝남 */ } }
    var a = node.animate(frames, opt);
    running[key] = a;
    a.onfinish = a.oncancel = function () { if (running[key] === a) running[key] = null; };
    return a;
  }
  var FX = {
    level: level,
    press: function () {
      if (level() < 1) return;
      play('press', el('sticker'), [{ transform: 'scale(1)' }, { transform: 'scale(.985) translateY(1px)' }, { transform: 'scale(1)' }], { duration: 120, easing: 'ease-out' });
    },
    sweep: function () {
      var lv = level(), s = D.querySelector('.liner .sweep');
      if (lv < 1 || !s) { if (H.classList.contains('rm')) play('fade', el('sticker'), [{ opacity: 0.6 }, { opacity: 1 }], { duration: 160 }); return; }
      play('sweep', s, [{ transform: 'translateX(-110%)', opacity: 0 }, { opacity: lv === 2 ? 0.9 : 0.55, offset: 0.25 }, { transform: 'translateX(110%)', opacity: 0 }], { duration: 220, easing: 'linear' });
      if (lv === 2) play('press', el('sticker'), [{ transform: 'scale(1)' }, { transform: 'scale(1.012)' }, { transform: 'scale(1)' }], { duration: 220, easing: EASE });
    },
    peel: function () {
      var lv = level(), st = el('sticker'), curl = D.querySelector('.liner .curl'), sh = D.querySelector('.liner .lift');
      if (lv < 1) { if (H.classList.contains('rm')) play('fade', st, [{ opacity: 0.55 }, { opacity: 1 }], { duration: 200 }); return; }
      if (lv === 1) { play('peel', st, [{ transform: 'none' }, { transform: 'translateY(-6px) rotate(-1deg)' }, { transform: 'none' }], { duration: 360, easing: EASE }); return; }
      play('peel', st, [
        { transform: 'none', offset: 0 },
        { transform: 'translate(2px,-2px) rotate(0deg)', offset: 0.22 },
        { transform: 'translate(-6px,-22px) rotate(-5deg) scale(1.03)', offset: 0.55 },
        { transform: 'translate(0,-6px) rotate(-1deg)', offset: 0.8 },
        { transform: 'none', offset: 1 }], { duration: 680, easing: EASE });
      if (curl) play('curl', curl, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 1, offset: 0.25 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.55 }, { transform: 'scale(0)', opacity: 1 }], { duration: 680, easing: EASE });
      if (sh) play('lift', sh, [{ opacity: 0, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(.94) translateY(10px)', offset: 0.55 }, { opacity: 0, transform: 'scale(1)' }], { duration: 680, easing: EASE });
    },
    stamp: function (big) {
      var lv = level(), s = el('stamp');
      if (!s) return;
      if (lv < 1) { play('stamp', s, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return; }
      if (!big || lv === 1) { play('stamp', s, [{ transform: 'rotate(-12deg) scale(1.15)', opacity: 0.4 }, { transform: 'rotate(-12deg) scale(1)', opacity: 1 }], { duration: 180, easing: EASE }); return; }
      play('stamp', s, [{ transform: 'rotate(-20deg) scale(2.1)', opacity: 0 }, { transform: 'rotate(-12deg) scale(.92)', opacity: 1, offset: 0.62 }, { transform: 'rotate(-12deg) scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.3,.1,.4,1)' });
      play('thud', el('sticker'), [{ transform: 'none' }, { transform: 'translateY(2px) scale(.992)', offset: 0.65 }, { transform: 'none' }], { duration: 320, delay: 0, easing: 'ease-out' });
    },
    /* 느린 기기 알아채기: app.js 가 '입력 → 그림이 바뀜' 시간을 알려 준다(여섯 번에 한 번). 최근 18번 가운데 6번 넘게 70ms 넘으면 한 단계 내림 */
    _t: [],
    note: function (ms) {
      if (root.navigator && root.navigator.webdriver) return false;
      var t = FX._t;
      t.push(ms); if (t.length > 18) t.shift();
      if (t.filter(function (x) { return x > 70; }).length > 6 && level() > 0) {
        FX._t = [];
        var lv = level() - 1;
        H.classList.remove('fx0', 'fx1', 'fx2'); H.classList.add('fx' + lv);
        return true;
      }
      return false;
    }
  };
  root.FX = FX;
})(typeof self !== 'undefined' ? self : this);
