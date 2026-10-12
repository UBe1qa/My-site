/* 토독 이펙트(치는 중·끝났을 때의 움직임과 키 소리). 로직을 모르고, app.js 가 "무슨 일이 일어났다"만 알려 준다.
   원칙
   - 치는 중의 이펙트는 처음에 만들어 둔 조각(.fxu i, .fx i)을 Web Animations 로 transform·opacity 만 움직인다.
     한 번 불 때 하는 일은 animate() 한 번뿐이고(클래스·크기·글자를 바꾸지 않는다), 자리(x·y)는 app.js 가 미리 재 둔 값을 받는다(여기서 화면을 재지 않는다).
     하나만 예외: 콤보 딱지(.ctag, 컴퓨터의 '화려하게'에서만)는 콤보 10 부터 방금 친 글자 위를 따라다니며 숫자를 바꾼다(조각 하나의 글자와 transform 만. 터치 기기에는 없다).
     그래서 키를 누를 때마다 배치 계산이 일어나지 않고, 움직임은 브라우저의 합성 단계에서 돈다. 끝나면 스스로 멈춘다(반복·타이머 0).
   - 세기 세 단계: 0 끔 · 1 가볍게(밑줄 미끄러짐, 단어 밑줄, 키캡 눌림, 틀렸을 때 작은 흔들림, 지울 때 쓸림) · 2 화려하게(+ 누른 글자 번쩍임, 키 조각, 지우개 가루, 콤보 꼬리표, 색종이).
     '동작 줄이기'가 켜져 있으면 0 으로 고정한다. 키를 누른 뒤 화면이 나오기까지가 계속 길면(note) 스스로 한 단계 내린다(이 방문 동안만).
   - 키 소리는 기본이 켬(app.js 가 정한다). 켜면 Web Audio 로 그 자리에서 만든 짧은 소리를 낸다(소리 파일 없음).
   - 고른 값은 app.js 가 todok.set 의 'fx' 칸에 남긴다. */
(function () {
  'use strict';
  var D = document;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CAN = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  function mk(parent, cls) { var e = D.createElement('i'); e.className = cls; parent.appendChild(e); return e; }
  function Pool(parent, cls, n) { this.a = []; this.i = 0; for (var k = 0; k < n; k++) this.a.push(mk(parent, cls)); }
  Pool.prototype.next = function () { this.i = (this.i + 1) % this.a.length; return this.a[this.i]; };
  function T(x, y, sx, sy, rot) { return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)' + (rot ? ' rotate(' + rot.toFixed(0) + 'deg)' : '') + (sx != null ? ' scale(' + sx.toFixed(3) + ',' + (sy == null ? sx : sy).toFixed(3) + ')' : ''); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  var FX = {
    level: REDUCED || !CAN ? 0 : 2, max: REDUCED || !CAN ? 0 : 2, locked: REDUCED || !CAN, reduced: REDUCED, auto: false,
    tag: null, tagOn: false, tagX: 0, tagY: 0, tagN: -1,
    stage: null, over: null, layer: null, S: null, onChange: null,
    chips: null, chipC: null, labs: null, ring: null, heat: 0, lags: [], lagN: 0
  };

  /* ---------- 준비 ---------- */
  FX.init = function (o) {
    FX.stage = o.stage; FX.over = o.over; FX.S = o.S; FX.onChange = o.onChange || null; FX.phone = !!o.phone;
    if (o.level != null && !FX.locked) FX.level = Math.max(0, Math.min(2, o.level | 0));
    FX.sound = !!o.sound;
    if (FX.over && CAN) {
      /* 키 조각: 미색·가지색·겨자색·주홍·회색(지우개 가루) */
      FX.chips = [new Pool(FX.over, 'chip', 12), new Pool(FX.over, 'chip c1', 10), new Pool(FX.over, 'chip c2', 12), new Pool(FX.over, 'chip c3', 6), new Pool(FX.over, 'chip c4', 6)];
      FX.labs = new Pool(FX.over, 'lab', 2);
      /* 콤보 딱지: 눈이 가 있는 곳(방금 친 글자 위)에 콤보 숫자를 보여 준다. 터치 기기는 숫자 줄이 글 바로 위에 있고 화면도 좁아 두지 않는다 */
      if (!FX.phone) { FX.tag = mk(FX.over, 'ctag'); FX.tag.appendChild(D.createTextNode('')); }
    }
    FX.apply();
  };
  /* 글자 줄(app.js TextLayer)에 조각을 심는다. 글이 바뀌어도 층(under)은 그대로 다시 쓰인다 */
  FX.attach = function (layer) {
    FX.layer = layer;
    if (!CAN || layer.fx) return;
    layer.fx = { tap: new Pool(layer.under, 'tap', 5), hot: new Pool(layer.under, 'tap t-hot', 5), bad: new Pool(layer.under, 'tap t-bad', 3), wd: new Pool(layer.under, 'wd', 3), wdh: new Pool(layer.under, 'wd t-hot', 3), del: new Pool(layer.under, 'tap t-del', 3) };
  };
  FX.apply = function () {
    var r = D.documentElement;
    r.classList.toggle('fx0', FX.level === 0); r.classList.toggle('fx1', FX.level === 1); r.classList.toggle('fx2', FX.level === 2);
  };
  FX.setLevel = function (n, auto) {
    if (FX.locked) return;
    FX.level = Math.max(0, Math.min(2, n | 0)); FX.auto = !!auto; FX.lags.length = 0;
    if (FX.level < 2) FX.tagHide();
    FX.apply();
    if (FX.onChange) FX.onChange(!!auto);
  };
  FX.setSound = function (on) { FX.sound = !!on; if (on) Snd.ensure(); if (FX.onChange) FX.onChange(false); };

  /* 느린 기기: 키를 누른 뒤 다음 화면이 나오기까지(ms)를 받아, 최근 24번 가운데 8번 넘게 70ms 를 넘으면 한 단계 내린다 */
  FX.note = function (lag) {
    if (FX.level === 0 || FX.locked) return;
    var a = FX.lags; a.push(lag > 70 ? 1 : 0); if (a.length > 24) a.shift();
    if (a.length < 24) return;
    var bad = 0; for (var i = 0; i < a.length; i++) bad += a[i];
    if (bad >= 8) FX.setLevel(FX.level - 1, true);
  };

  /* ---------- 치는 중 ---------- */
  /* 글자 i 를 맞게/틀리게 눌렀다. n = 이번에 새로 센 키 수 */
  FX.key = function (good, i, combo) {
    Snd.play(good ? (FX.layer && FX.layer.isSpace(i) ? 'sp' : 'k') : 'bad');
    var L = FX.layer; if (!L || !L.fx || FX.level === 0) return;
    var b = L.rect(i); if (!b) return;
    if (!good) {
      if (FX.level === 2) {
        L.fx.bad.next().animate([{ transform: T(b.cx - 20, b.cy - 20, b.w / 40 * 1.45, b.h / 40 * 1.45), opacity: 0.6 }, { transform: T(b.cx - 20, b.cy - 20, b.w / 40, b.h / 40), opacity: 0 }], { duration: 360, easing: EASE });
        /* 틀린 글자에서 주홍 키 조각이 튕겨 나간다 */
        if (FX.over && !FX.phone) { var pm = L.toStage(b.cx, b.cy); FX.chip(pm.x, pm.y, 3, 0.75); FX.chip(pm.x, pm.y, 3, 0.6); FX.chip(pm.x, pm.y, 0, 0.6); }
      }
      var amp = FX.level === 2 ? 7 : 3;
      if (L.joltEl) L.joltEl.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + -amp + 'px)' }, { transform: 'translateX(' + (amp - 1) + 'px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: FX.level === 2 ? 240 : 180, easing: 'ease-out' });
      return;
    }
    if (FX.level < 2) return;
    /* 누른 글자가 한 번 번쩍인다(키가 눌렸다 올라오는 느낌). 콤보가 쌓이면 겨자색.
       터치 기기에서는 키마다의 번쩍임과 키 조각을 뺀다: 움직임 하나가 끝날 때마다 화면을 한 번 더 그려서, 느린 휴대폰은 손을 못 따라간다.
       (콤보 고비의 꼬리표·키 조각, 단어 밑줄, 틀림 표시, 밑줄 색은 터치 기기에도 그대로 나온다) */
    if (FX.phone) return;
    var hot = FX.heat >= 2;
    (hot ? L.fx.hot : L.fx.tap).next().animate([{ transform: T(b.cx - 20, b.cy - 20 + 2, b.w / 40, b.h / 40), opacity: hot ? 0.5 : 0.32 }, { transform: T(b.cx - 20, b.cy - 20, b.w / 40 * 1.3, b.h / 40 * 1.3), opacity: 0 }], { duration: 240, easing: EASE });
    /* 열기가 오르면 누를 때마다 키 조각이 하나씩 튄다 */
    if (FX.heat >= 2 && FX.over && combo % (FX.heat === 3 ? 2 : 3) === 0) {
      var p = L.toStage(b.cx, b.cy - b.h * 0.4);
      FX.chip(p.x, p.y, FX.heat === 3 ? 2 : 0, 0.7);
    }
  };
  /* 단어 하나를 틀리지 않고 끝냈다: 그 단어 아래로 줄이 한 번 그어진다 */
  FX.word = function (a, b) {
    var L = FX.layer; if (!L || !L.fx || FX.level === 0) return;
    var r = L.span(a, b); if (!r) return;
    (FX.heat >= 2 ? L.fx.wdh : L.fx.wd).next().animate([{ transform: T(r.x, r.y) + ' scaleX(0)', opacity: 0.9 }, { transform: T(r.x, r.y) + ' scaleX(' + (r.w / 100).toFixed(3) + ')', opacity: 0.9, offset: 0.42 }, { transform: T(r.x, r.y) + ' scaleX(' + (r.w / 100).toFixed(3) + ')', opacity: 0 }], { duration: 420, easing: 'ease-out' });
  };
  /* 지웠다(사용자 2026-10-12: "글 삭제할때도 뭐든 반응이 있으면"). i = 지운 자리(지금 칠 자리), caret = '내가 친 글'의 커서, key = 화면 자판의 ⌫, gone = 지운 글자.
     소리(치는 소리와 반대로 올라간다) · '내가 친 글'에서 지운 글자가 커서 오른쪽에서 흐리게 떠올랐다 사라짐 · 커서가 뒤로 한 번 물러남 ·
     보고 치는 글의 그 자리가 커서 쪽으로 빨려 들듯 작아지며 사라짐 · ⌫ 키 눌림. 화려하게(컴퓨터)면 지우개 가루(회색 조각 셋)가 떨어진다.
     터치 기기는 키마다의 조각을 빼는 규칙대로 가루만 뺀다. 지운 글자 조각은 커서 안에 한 번만 만들어 두고 글자만 바꾼다(재지 않는다) */
  FX.del = function (i, caret, key, gone) {
    Snd.play('del');
    if (FX.level === 0 || !CAN) return;
    if (caret) {
      caret.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)', offset: 0.35 }, { transform: 'translateX(0)' }], { duration: 230, easing: EASE });
      if (gone) {
        var g = caret.firstChild || caret.appendChild(D.createElement('b'));
        g.className = 'gh'; g.textContent = gone;
        g.animate([{ transform: 'translate(0,0) scale(1)', opacity: 0.7 }, { transform: 'translate(3px,-5px) scale(1.04)', opacity: 0.55, offset: 0.3 }, { transform: 'translate(10px,-16px) scale(.86) rotate(6deg)', opacity: 0 }], { duration: 460, easing: 'cubic-bezier(.2,.6,.4,1)' });
      }
    }
    if (key && !FX.phone) FX.press(key, 'tap');
    var L = FX.layer; if (!L || !L.fx) return;
    var b = L.rect(i); if (!b) return;
    L.fx.del.next().animate([{ transform: T(b.cx - 20, b.cy - 20, b.w / 40 * 1.2, b.h / 40 * 1.2), opacity: 0.32 }, { transform: T(b.cx - 20 - b.w * 0.6, b.cy - 20, b.w / 40 * 0.25, b.h / 40 * 0.25), opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.45,0,.7,.4)' });
    /* 지우개 가루: 다시 칠 글자를 가리지 않게 글자 아래 끝에서 아래로만 떨어진다 */
    if (FX.level === 2 && FX.over && FX.chips && !FX.phone) {
      var p = L.toStage(b.cx, b.cy + b.h * 0.5);
      for (var k = 0; k < 3; k++) { var dx = rnd(-16, 16), dy = rnd(10, 24), r1 = rnd(-160, 160); FX.chips[4].next().animate([{ transform: T(p.x - 4 + dx * 0.2, p.y, 1, 1, 0), opacity: 0.9 }, { transform: T(p.x - 4 + dx, p.y + dy, 0.7, 0.7, r1), opacity: 0 }], { duration: rnd(320, 460), easing: 'cubic-bezier(.3,.2,.7,1)' }); }
    }
  };
  /* 키 조각 하나. c = 색(0 미색 1 가지색 2 겨자색 3 주홍 4 회색), pow = 세기 */
  FX.chip = function (x, y, c, pow) {
    if (!FX.chips) return;
    var e = FX.chips[c].next(), dx = rnd(-58, 58) * pow, up = rnd(30, 72) * pow, fall = rnd(24, 70) * pow, r1 = rnd(-200, 200), sz = rnd(1, 1.8);
    e.animate([{ transform: T(x - 5, y - 5, sz, sz, 0), opacity: 1 }, { transform: T(x - 5 + dx * 0.55, y - 5 - up, sz, sz, r1 * 0.6), opacity: 1, offset: 0.4, easing: 'cubic-bezier(.4,0,.8,.6)' }, { transform: T(x - 5 + dx, y - 5 - up + fall + up * 0.5, 0.8, 0.8, r1), opacity: 0 }], { duration: rnd(460, 720), easing: 'cubic-bezier(.1,.7,.3,1)' });
  };
  FX.burstAt = function (x, y, n, pow) { for (var k = 0; k < n; k++) FX.chip(x + rnd(-8, 8), y, k % 3 === 0 ? 2 : k % 3 === 1 ? 0 : 1, pow); };
  /* 콤보가 바뀌었다. 10·25·50·100, 그 뒤로는 50마다 꼬리표와 키 조각. 끊기면 콤보 키가 한 번 내려앉는다 */
  FX.STEPS = [10, 25, 50, 100];
  FX.milestone = function (n) { return FX.STEPS.indexOf(n) >= 0 || (n > 100 && n % 50 === 0); };
  FX.combo = function (n, prev, i, key) {
    var h = n >= 100 ? 3 : n >= 50 ? 2 : n >= 20 ? 1 : 0;
    if (h !== FX.heat) { FX.heat = h; if (FX.stage) FX.stage.setAttribute('data-heat', String(h)); }
    if (FX.level === 0) return;
    if (FX.tag && FX.level === 2) FX.tagAt(n, prev, i);
    if (n === 0 && prev >= 10) { if (key) FX.press(key, 'drop'); return; }
    if (n <= prev || !FX.milestone(n)) return;
    Snd.play('ms');
    if (key) FX.press(key, 'bounce');
    var L = FX.layer; if (FX.level < 2 || !L || !FX.over) return;
    var b = L.rect(i); if (!b) return;
    /* 꼬리표는 방금 친 글자 바로 위에 뜬다(눈이 가 있는 곳. 그 위는 이미 친 줄이거나 글 위의 빈 줄이라 칠 글을 가리지 않는다).
       문장 연습처럼 자리가 정해진 화면(slotRight)은 그 자리에. 키 조각은 방금 친 글자에서 튄다 */
    var p = L.toStage(b.cx, b.cy - b.h * 0.5), q = L.slot(), lab = FX.labs.next();
    if (!L.slotRight) q = { x: Math.max(L.ox, Math.min(p.x - 44, L.ox + L.bw - 170)), y: Math.max(q.y - 4, p.y - 44) };
    if (FX.tag && FX.tagOn) FX.tag.animate([{ opacity: 0 }, { opacity: 0, offset: 0.86 }, { opacity: 1 }], { duration: 1150 });
    lab.textContent = ''; var bb = D.createElement('b'); bb.textContent = String(n); lab.appendChild(bb); lab.appendChild(D.createTextNode(FX.S.combo));
    lab.animate([{ transform: T(q.x, q.y + 12, 0.6), opacity: 0 }, { transform: T(q.x, q.y - 2, 1.1), opacity: 1, offset: 0.16 }, { transform: T(q.x, q.y, 1), opacity: 1, offset: 0.3 }, { transform: T(q.x, q.y, 1), opacity: 1, offset: 0.8 }, { transform: T(q.x, q.y - 10, 1), opacity: 0 }], { duration: 1150, easing: 'ease-out' });
    FX.burstAt(p.x, p.y, n >= 100 ? 18 : n >= 25 ? 12 : 8, n >= 100 ? 1.35 : 1.05);
  };
  /* 콤보 딱지(컴퓨터·화려하게): 콤보 10 부터 방금 친 글자 위를 따라다닌다. 끊기면 떨어진다. 열기가 오르면 조금 커진다 */
  FX.tagAt = function (n, prev, i) {
    var t = FX.tag, L = FX.layer; if (!t || !L) return;
    if (n >= 10) {
      var b = L.rect(i); if (!b) return;
      var p = L.toStage(b.cx, b.cy - b.h * 0.5), sc = FX.heat >= 3 ? 1.3 : FX.heat === 2 ? 1.15 : 1;
      FX.tagX = Math.max(L.ox, Math.min(p.x - 16, L.ox + L.bw - 60)); FX.tagY = p.y - 25;
      if (n !== FX.tagN) { t.firstChild.nodeValue = String(n); FX.tagN = n; }
      t.style.transform = T(FX.tagX, FX.tagY, sc);
      if (!FX.tagOn) { FX.tagOn = true; t.style.opacity = '1'; t.animate([{ opacity: 0, transform: T(FX.tagX, FX.tagY + 8, 0.5) }, { opacity: 1, transform: T(FX.tagX, FX.tagY - 2, 1.2), offset: 0.6 }, { opacity: 1, transform: T(FX.tagX, FX.tagY, sc) }], { duration: 220, easing: EASE }); }
    } else if (FX.tagOn) {
      FX.tagOn = false; FX.tagN = -1; t.style.opacity = '0';
      if (n === 0) t.animate([{ opacity: 1, transform: T(FX.tagX, FX.tagY, 1, 1, 0) }, { opacity: 0, transform: T(FX.tagX - 8, FX.tagY + 30, 0.85, 0.85, -18) }], { duration: 380, easing: 'cubic-bezier(.4,0,.9,.6)' });
    }
  };
  FX.tagHide = function () { if (FX.tag) { FX.tag.style.opacity = '0'; } FX.tagOn = false; FX.tagN = -1; };
  /* 숫자 칸이 한 번 튄다(안쪽만 커졌다 돌아온다) / 화면 자판의 키가 한 번 눌린다. 크기와 자리는 바꾸지 않는다(transform 만) */
  FX.press = function (el, how, delay) {
    if (FX.level === 0 || !CAN || !el) return;
    var cell = el.querySelector ? (el.querySelector('.hk-f') || el.querySelector('dd span')) : null, f = cell || el, kf, dur = 180;
    if (how === 'bounce') { kf = [{ transform: 'scale(1)' }, { transform: 'scale(1.22) rotate(-3deg)', offset: 0.3 }, { transform: 'scale(.96) rotate(1deg)', offset: 0.65 }, { transform: 'scale(1)' }]; dur = 340; }
    else if (how === 'drop') { kf = [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: 'translateY(5px) rotate(-5deg)', opacity: 0.55, offset: 0.4 }, { transform: 'translateY(0) rotate(0deg)', opacity: 1 }]; dur = 340; }
    else if (cell) kf = [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.4 }, { transform: 'scale(1)' }];
    else kf = [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)', offset: 0.45 }, { transform: 'translateY(0)' }];
    f.animate(kf, { duration: dur, easing: EASE, delay: delay || 0 });
  };
  /* 첫 키: 숫자 칸이 차례로 한 번씩 튄다(시작했다는 표시) */
  FX.start = function () {
    FX.heat = 0; FX.tagHide();
    if (FX.level === 0 || !FX.stage) return;
    var ks = FX.stage.querySelectorAll('.hud .hk');
    for (var i = 0; i < ks.length; i++) FX.press(ks[i], 'tap', i * 45);
  };
  /* 남은 5초: 시간 키가 초마다 눌린다 */
  FX.tick = function (key) { Snd.play('tick'); FX.press(key, 'tap'); };
  /* 판이 끝나거나 새 판이 시작될 때: 열기를 0 으로, 아직 떠 있는 꼬리표·키 조각을 바로 거둔다(결과의 큰 숫자를 가리지 않게) */
  FX.reset = function () {
    FX.heat = 0; if (FX.stage) FX.stage.setAttribute('data-heat', '0');
    FX.tagHide();
    var as = FX.over && FX.over.getAnimations ? FX.over.getAnimations({ subtree: true }) : [];
    for (var i = 0; i < as.length; i++) as[i].cancel();
  };

  /* ---------- 끝났을 때 ---------- */
  /* 결과가 뜬다: 큰 숫자가 한 자리씩 내려앉고, 배지가 차례로 찍히고, 그래프가 자란다. 글자는 처음부터 최종 값이다(움직임이 없어도 다 보인다) */
  FX.reveal = function (o) {
    Snd.play(o.best ? 'best' : 'fin');
    if (FX.level === 0 || !CAN) return;
    var i, big = o.big;
    if (big) {
      var txt = big.textContent; big.textContent = '';
      for (i = 0; i < txt.length; i++) { var d = D.createElement('i'); d.textContent = txt.charAt(i); big.appendChild(d); d.animate([{ transform: 'translateY(-34px)', opacity: 0 }, { transform: 'translateY(4px)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, delay: i * 60, easing: EASE, fill: 'backwards' }); }
    }
    var bs = o.badges ? o.badges.children : [];
    for (i = 0; i < bs.length; i++) bs[i].animate([{ transform: 'scale(1.7) rotate(-7deg)', opacity: 0 }, { transform: 'scale(.94) rotate(1deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], { duration: 260, delay: 260 + i * 110, easing: EASE, fill: 'backwards' });
    if (o.chart) {
      var g = o.chart.querySelector('.grow');
      if (g) g.animate([{ transform: 'scaleY(0)', opacity: 0.3 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 480, delay: 120, easing: EASE, fill: 'backwards' });
    }
  };
  /* 색종이 대신 키 조각이 튀어 오른다(최고 기록, 틀린 키 없는 판). 캔버스 하나, 끝나면 지우고 그리기를 멈춘다 */
  var raf = 0, lastAt = -1e9;
  FX.stopConfetti = function (c) { if (raf) cancelAnimationFrame(raf); raf = 0; if (c) { c.hidden = true; c.width = c.width; } };
  FX.confetti = function (c, from, big) {
    var now = performance.now();
    if (!c || FX.level < 2 || D.hidden || now - lastAt < 12000) return false;
    lastAt = now;
    var box = c.parentNode.getBoundingClientRect(), dpr = Math.min(FX.phone ? 1.5 : 2, window.devicePixelRatio || 1), w = box.width, h = box.height;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.hidden = false;
    var g = c.getContext('2d'), cs = getComputedStyle(D.documentElement), col = function (n) { return cs.getPropertyValue(n).trim(); };
    var PAL = [[col('--cap'), col('--cap-edge')], [col('--hot'), col('--hot-d')], [col('--main'), col('--main-edge')], [col('--cap'), col('--cap-edge')], [col('--hot'), col('--hot-d')]];
    var o = from ? from.getBoundingClientRect() : box, ox = o.left - box.left + o.width / 2, oy = o.top - box.top + o.height * 0.7;
    var n = (w < 560 ? 30 : 56) + (big ? 14 : 0), parts = [], i;
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.1, v = 280 + Math.random() * 380;
      parts.push({ x: ox + (Math.random() - 0.5) * 80, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 11 + Math.random() * 11, r: (Math.random() - 0.5) * 0.8, vr: (Math.random() - 0.5) * 6, c: PAL[i % PAL.length] });
    }
    var t0 = now, last = now, DUR = 1600;
    function rr(x, y, ww, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); }
    function frame() {
      var t = performance.now(), dt = Math.min(0.05, (t - last) / 1000), el = t - t0; last = t;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      if (el >= DUR || D.hidden) { FX.stopConfetti(c); return; }
      g.globalAlpha = el > DUR - 380 ? Math.max(0, (DUR - el) / 380) : 1;
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k]; p.vy += 950 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        var s = p.s, q = s * 0.26;
        g.fillStyle = p.c[1]; rr(-s / 2, -s / 2 + 2.5, s, s, q); g.fill();
        g.fillStyle = p.c[0]; rr(-s / 2, -s / 2, s, s, q); g.fill();
        g.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return true;
  };

  /* ---------- 키 소리(Web Audio, 기본 켬) ---------- */
  var Snd = { ctx: null, noise: null, out: null, last: 0 };
  Snd.ensure = function () {
    if (Snd.ctx) { if (Snd.ctx.state === 'suspended') Snd.ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      var c = Snd.ctx = new AC({ latencyHint: 'interactive' }), len = Math.floor(c.sampleRate * 0.09), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      Snd.noise = buf; Snd.out = c.createGain(); Snd.out.gain.value = 0.5; Snd.out.connect(c.destination);
    } catch (e) { Snd.ctx = null; return false; }
    return true;
  };
  function tone(type, f0, f1, dur, vol, at) {
    var c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (at || 0);
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(Snd.out); o.start(t); o.stop(t + dur + 0.02);
  }
  function click(freq, q, vol, rate) {
    var c = Snd.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = Snd.noise; s.playbackRate.value = rate; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(Snd.out); s.start();
  }
  Snd.play = function (what) {
    if (!FX.sound || !Snd.ctx) return;
    if (Snd.ctx.state === 'suspended') { Snd.ctx.resume(); return; }
    var now = performance.now(), v = rnd(0.94, 1.06);
    if ((what === 'k' || what === 'sp' || what === 'bad' || what === 'del') && now - Snd.last < 10) return;
    Snd.last = now;
    try {
      if (what === 'k') { click(2300 * v, 1.1, 0.5, v); tone('sine', 170 * v, 95, 0.05, 0.22); }            /* 토 */
      else if (what === 'sp') { click(1300 * v, 0.9, 0.5, 0.8 * v); tone('sine', 120 * v, 70, 0.075, 0.3); } /* 독 */
      else if (what === 'del') { click(1700 * v, 1, 0.3, 1.2 * v); tone('sine', 105 * v, 200, 0.045, 0.16); } /* 지우기: 치는 소리와 반대로 올라간다 */
      else if (what === 'bad') { click(480, 0.8, 0.5, 0.6); tone('triangle', 150, 80, 0.11, 0.2); }
      else if (what === 'tick') tone('sine', 880, 880, 0.05, 0.05);
      else if (what === 'ms') { tone('triangle', 880, 880, 0.09, 0.07); tone('triangle', 1320, 1320, 0.12, 0.07, 0.07); }
      else if (what === 'fin') [523, 659, 784].forEach(function (f, i) { tone('triangle', f, f, 0.16, 0.08, i * 0.08); });
      else if (what === 'best') [659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.2, 0.08, i * 0.085); });
    } catch (e) { /* 소리는 없어도 된다 */ }
  };
  FX.snd = Snd;
  window.TJFX = FX;
})();
