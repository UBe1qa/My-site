/* 병아리 구조대 '열두 친구' 카드 — 카드마다 그 친구의 능력 없이는 못 푸는 2수짜리 작은 구출 판(직접 꾹 눌러 풀기). 2026-10-17.
   chick-board.js(판 엔진)를 먼저 싣는다. 카드(#track .stage[data-k])의 .win 안 영상을 판으로 바꾼다(영상 마크업은 그대로 둬도 된다:
   스크립트가 안 돌면 영상이 남는다).
   판 12개는 게임 규칙(SortRules)으로 확인했다: 붓기만으로는 못 풀고, 능력을 쓰면 2수, 첫 수가 능력(게임 저장소 dev/friend_levels.gd 조건).
   처음 1.2초 뒤 손가락이 그 친구를 꾹 누르는 모습(게임의 새 친구 안내와 같다), 그 뒤로는 4초 동안 가만히 있으면 다음 수를 보여 준다. */
(function () {
  'use strict';
  var track = document.getElementById('track');
  if (!track || !window.ChickBoard) return;
  var LANG = (document.documentElement.lang || 'ko').slice(0, 2);
  // 튜브는 앞이 바닥, 끝이 위. A 빨강이, B 파랑이, b 병아리, 소문자 = 능력 친구
  var LEVELS = {
    squirrel: ['Abc', 'cA'],         // 아래 다람쥐가 꼭대기로 → 위 다람쥐끼리 합치면 병아리가 나온다
    frog: ['hAAB', 'bB', 'h'],       // 꽉 찬 튜브 바닥의 개구리가 다른 개구리 위로 뛰어 자리를 내면 → 파랑이가 그 자리로
    otter: ['BbB', 'ABt'],           // 해달이 아래 파랑이와 자리를 바꿈 → 파랑끼리 합치기
    bat: ['Abf', 'AAA'],             // 튜브를 통째로 뒤집음 → 빨강 넣어 튜브 완성
    octopus: ['bA', 'BAB', 'o'],     // 왼쪽 튜브 파랑이를 끌어옴 → 빨강끼리 합치기
    turtle: ['AA', 'bAAs'],          // 바닥까지 잠수 → 빨강 넣어 튜브 완성
    penguin: ['BbBp', 'BAA', ''],    // 오른쪽 튜브로 미끄럼 → 파랑이를 빈 튜브로
    mole: ['AAAm', 'bA'],            // 오른쪽 튜브 바닥으로 파고듦 → 빨강 넣어 튜브 완성
    owl: ['AA', 'bAAw'],             // 튜브를 한 칸 돌림(부엉이가 바닥으로) → 빨강 넣어 튜브 완성
    elephant: ['Bbe', 'B', 'AA'],    // 물을 뿜어 옆 튜브를 비움 → 코끼리가 빈 튜브로
    lion: ['bl', 'ABB', 'BB'],       // 파랑이와 자리를 바꿈 → 파랑끼리 합치기
    whale: ['BbB', 'kA', 'AAA']      // 파도로 모든 튜브의 맨 위가 한 칸씩 오른쪽으로 → 빨강 넣어 튜브 완성
  };
  var TEXT = {
    ko: { saved: '구했어요!', again: '다시', stuck: '막혔어요', reset: '다시 하기', tube: '튜브 {n}', empty: '비었어요', board: '{name} 체험 판',
      names: { A: '빨강이', B: '파랑이', b: '병아리', c: '다람쥐', h: '개구리', t: '해달', f: '박쥐', o: '문어', s: '거북이', p: '펭귄', m: '두더지', w: '부엉이', e: '코끼리', l: '사자', k: '고래' } },
    en: { saved: 'Saved!', again: 'Again', stuck: 'Stuck', reset: 'Restart', tube: 'Tube {n}', empty: 'empty', board: 'Try the {name}',
      names: { A: 'Red', B: 'Blue', b: 'Chick', c: 'Squirrel', h: 'Frog', t: 'Otter', f: 'Bat', o: 'Octopus', s: 'Turtle', p: 'Penguin', m: 'Mole', w: 'Owl', e: 'Elephant', l: 'Lion', k: 'Whale' } },
    ja: { saved: '助けた!', again: 'もう一回', stuck: '行き止まり', reset: 'やり直す', tube: 'チューブ {n}', empty: '空', board: '{name}をためす',
      names: { A: 'あか', B: 'あお', b: 'ひよこ', c: 'リス', h: 'カエル', t: 'ラッコ', f: 'コウモリ', o: 'タコ', s: 'カメ', p: 'ペンギン', m: 'モグラ', w: 'フクロウ', e: 'ゾウ', l: 'ライオン', k: 'クジラ' } }
  }[LANG] || null;
  var T = TEXT || { saved: '구했어요!', again: '다시', stuck: '막혔어요', reset: '다시 하기', tube: '튜브 {n}', empty: '비었어요', board: '{name} 체험 판', names: {} };
  var LETTER = { squirrel: 'c', frog: 'h', otter: 't', bat: 'f', octopus: 'o', turtle: 's', penguin: 'p', mole: 'm', owl: 'w', elephant: 'e', lion: 'l', whale: 'k' };

  var css = document.createElement('style');
  css.textContent =
    // 판을 손가락으로 누르기 좋게 창을 조금 넓힌다(카드가 좁은 넓은 화면에서는 카드 폭에 맞춰진다)
    '#track .win.cr-play{width:min(100%,280px)}' +
    '.cr-host{position:relative;aspect-ratio:480/512;border-radius:17px;background:#232A48;overflow:hidden}' +
    '.cr-reset{position:absolute;right:6px;top:6px;z-index:3;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font:700 18px/36px sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.cr-reset:focus-visible{outline:2px solid #FFD166;outline-offset:2px}' +
    '.cr-done{position:absolute;left:50%;bottom:10px;z-index:4;display:flex;align-items:center;gap:10px;padding:6px 6px 6px 14px;border-radius:999px;background:rgba(20,24,44,.88);color:#FFD166;font-weight:800;font-size:15px;white-space:nowrap;translate:-50% 0;transition:opacity .2s,scale .28s cubic-bezier(.34,1.56,.64,1)}' +
    '.cr-done[hidden]{display:flex;opacity:0;scale:.6;pointer-events:none}' +
    '.cr-done button{border:0;border-radius:999px;padding:7px 14px;background:#FF9F2E;color:#1D1D2B;font-weight:800;font-size:14px;line-height:1;font-family:inherit;cursor:pointer}' +
    '.cr-done.is-stuck{color:#FF9DB0}';
  document.head.appendChild(css);

  function mount(stage) {
    var key = stage.dataset.k, tubes = LEVELS[key], win = stage.querySelector('.win');
    if (!tubes || !win || win.dataset.crPlay) return;
    win.dataset.crPlay = '1';
    win.classList.add('cr-play');
    var video = win.querySelector('video');
    if (video) { video.pause(); video.remove(); }
    var host = document.createElement('div');
    host.className = 'cr-host';
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', T.board.replace('{name}', T.names[LETTER[key]] || key));
    win.appendChild(host);
    var done = document.createElement('div');
    done.className = 'cr-done'; done.hidden = true; done.setAttribute('aria-live', 'polite');
    done.innerHTML = '<span></span><button type="button"></button>';
    done.querySelector('button').textContent = T.again;
    var reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'cr-reset'; reset.textContent = '↺'; reset.setAttribute('aria-label', T.reset);
    var board = ChickBoard.create(host, {
      tubes: tubes, coach: 'auto', names: T.names, tubeLabel: T.tube, emptyLabel: T.empty,
      onWin: function () { show(T.saved, false); },
      onStuck: function () { show(T.stuck, true); }
    });
    host.appendChild(reset); host.appendChild(done);
    function show(text, stuck) { done.querySelector('span').textContent = text; done.classList.toggle('is-stuck', stuck); done.hidden = false; }
    function again() { done.hidden = true; board.reset(); }
    reset.addEventListener('click', again);
    done.querySelector('button').addEventListener('click', again);
    stage._crBoard = board;
  }

  // 카드가 화면 가까이 오면 판을 만든다(12개를 한꺼번에 만들지 않게)
  var stages = Array.prototype.slice.call(track.querySelectorAll('.stage[data-k]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { mount(e.target); io.unobserve(e.target); } });
    }, { root: null, rootMargin: '200px' });
    stages.forEach(function (s) { io.observe(s); });
  } else stages.forEach(mount);
})();
