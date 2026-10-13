/* 가죽결 수선소 · 처음 화면 코드 (움직임이 꺼져 있어도 다 돌아가는 것들)
   알림·머리줄·신청 바·드러내기는 common.js (window.BR) */
(function () {
  'use strict';
  var B = window.BR, $ = B.$, $$ = B.$$, won = B.won, anim = B.anim, toast = B.toast;

  /* ---------- 1분 견적 ---------- */
  var R = window.REPAIRS || [];
  var byId = {}; R.forEach(function (r) { byId[r.id] = r; });
  var picked = [];          // 고른 순서대로
  var lastCleared = null;
  var boot = $('#boot'), spots = $('#spots'), chips = $('#chips');
  var rowsEl = $('#paper-rows'), emptyEl = $('#paper-empty'), totalEl = $('#paper-total'), daysEl = $('#paper-days');
  var whyEl = $('#quote-why');
  var stamp = $('#stamp'), clearBtn = $('#quote-clear'), undoP = $('#quote-undo'), goBtn = $('#quote-go');

  var vb = boot.querySelector('svg').viewBox.baseVal;
  R.forEach(function (r, i) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chip'; c.dataset.id = r.id;
    c.setAttribute('aria-pressed', 'false');
    c.innerHTML = '<span class="chip__name"></span>';
    c.querySelector('.chip__name').textContent = r.name;
    chips.appendChild(c);
    if (r.spot) {
      var s = document.createElement('button');
      s.type = 'button'; s.className = 'spot'; s.dataset.id = r.id;
      s.style.setProperty('--x', ((r.spot[0] - vb.x) / vb.width * 100).toFixed(2) + '%'); s.style.setProperty('--y', ((r.spot[1] - vb.y) / vb.height * 100).toFixed(2) + '%');
      s.style.setProperty('--dl', (i * 0.35) + 's');
      s.setAttribute('aria-pressed', 'false');
      s.setAttribute('aria-label', r.part + ': ' + r.name);
      s.innerHTML = '<span class="spot__label"></span>';
      s.querySelector('.spot__label').textContent = r.part;
      spots.appendChild(s);
    }
  });

  function includedBy(id) {   // id가 고른 항목 안에 들어 있으면 그 항목
    for (var i = 0; i < picked.length; i++) {
      var p = byId[picked[i]];
      if (p.includes && p.includes.indexOf(id) > -1) return p;
    }
    return null;
  }

  function toggle(id) {
    var at = picked.indexOf(id);
    if (at > -1) picked.splice(at, 1);
    else {
      if (includedBy(id)) return;
      picked.push(id);
      var r = byId[id];
      if (r.includes) {
        var dropped = picked.filter(function (p) { return r.includes.indexOf(p) > -1; });
        picked = picked.filter(function (p) { return r.includes.indexOf(p) < 0; });
        if (dropped.length) toast('통창갈이에 들어 있어서 뺐어요: ' + dropped.map(function (d) { return byId[d].name; }).join(', '));
      }
    }
    lastCleared = null; undoP.hidden = true;
    var w = byId[id];
    whyEl.innerHTML = '';
    if (at < 0) { var b = document.createElement('b'); b.textContent = w.name + ' · '; whyEl.appendChild(b); whyEl.appendChild(document.createTextNode(w.why)); }
    else whyEl.textContent = '견적서에서 뺐어요: ' + w.name;
    render(at < 0);
  }

  function render(added) {
    var wasEmpty = !rowsEl.children.length;
    // 칩·점 상태
    $$('.chip, .spot').forEach(function (b) {
      var id = b.dataset.id, on = picked.indexOf(id) > -1, inc = includedBy(id);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-on', on);
      b.disabled = !!inc;
      if (b.classList.contains('chip')) {
        var note = b.querySelector('.chip__in');
        if (inc && !note) { note = document.createElement('span'); note.className = 'chip__in'; note.textContent = '(통창갈이에 포함)'; b.appendChild(note); }
        if (!inc && note) note.remove();
      } else {
        b.setAttribute('aria-label', byId[id].part + ': ' + byId[id].name + (inc ? ' (통창갈이에 포함)' : ''));
      }
    });
    // 그림 칠하기
    var full = picked.indexOf('full') > -1;
    ['heel', 'half', 'welt'].forEach(function (p) { boot.classList.toggle('is-' + p, full || picked.indexOf(p) > -1); });
    // 견적서
    var prev = {}; $$('.prow', rowsEl).forEach(function (li) { prev[li.dataset.id] = 1; });
    rowsEl.innerHTML = '';
    var sum = 0, days = 0;
    picked.forEach(function (id, i) {
      var r = byId[id]; sum += r.price; days = Math.max(days, r.days);
      var li = document.createElement('li');
      li.className = 'prow' + (prev[id] ? '' : ' is-new'); li.dataset.id = id;
      li.innerHTML = '<span class="prow__no"></span><span class="prow__name"></span><span class="prow__v"></span>';
      li.children[0].textContent = '제' + (i + 1) + '항';
      li.children[1].textContent = r.name;
      li.children[2].textContent = won(r.price);
      rowsEl.appendChild(li);
    });
    emptyEl.hidden = picked.length > 0;
    totalEl.textContent = won(sum);
    daysEl.textContent = picked.length ? '작업 ' + days + '일 + 택배 2~3일' : '-';
    clearBtn.hidden = picked.length === 0;
    goBtn.href = '/apply/' + (picked.length ? '?items=' + picked.join(',') : '');
    // 도장: 비어 있다가 처음 적힐 때만 크게 찍는다 (드물수록 크게)
    stamp.classList.toggle('is-on', picked.length > 0);
    if (added && wasEmpty && picked.length && anim()) {
      stamp.classList.remove('is-hit'); void stamp.offsetWidth; stamp.classList.add('is-hit');
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.chip, .spot');
    if (b && !b.disabled) toggle(b.dataset.id);
  });
  clearBtn.addEventListener('click', function () {
    lastCleared = picked.slice(); picked = []; render(false);
    undoP.hidden = false; $('#quote-undo-btn').focus();
  });
  $('#quote-undo-btn').addEventListener('click', function () {
    if (!lastCleared) return;
    picked = lastCleared; lastCleared = null; undoP.hidden = true; render(false);
  });
  picked = ['heel', 'welt'];   // 빈 견적서 대신 예시 두 곳을 골라 둔 채로 시작
  render(false);

  /* ---------- 수선 예시 카드 ---------- */
  var C = window.CASES || [], NB = window.NEW_BOOT || 380000, cl = $('#cases-list');
  C.forEach(function (c) {
    var pct = Math.round(c.price * 100 / NB);
    var li = document.createElement('li'); li.className = 'case';
    li.innerHTML = '<p class="case__boot"></p><p class="case__what"></p><p class="case__why"></p>' +
      '<p class="case__pct"><span></span>%<small>새 부츠 값의</small></p><div class="case__bar"><i></i></div>' +
      '<p class="case__foot"><span></span><b></b></p>';
    li.querySelector('.case__boot').textContent = c.boot;
    li.querySelector('.case__what').textContent = c.what;
    li.querySelector('.case__why').textContent = c.why;
    li.querySelector('.case__pct span').textContent = pct;
    li.querySelector('.case__bar i').style.setProperty('--w', pct + '%');
    li.querySelector('.case__foot span').textContent = '작업 ' + c.days + '일';
    li.querySelector('.case__foot b').textContent = won(c.price);
    cl.appendChild(li);
  });

  /* ---------- 맡기는 순서 + 태그 ---------- */
  var S = window.STEPS || [], list = $('#steps-list'), dots = $('#steps-dots'), marks = $('#steps-marks');
  var tag = $('#tag'), tState = $('#tag-state'), tNote = $('#tag-note'), mini = $('#mini');
  S.forEach(function (st, i) {
    var li = document.createElement('li'); li.className = 'step'; li.dataset.i = i;
    li.innerHTML = '<span class="step__n" aria-hidden="true"></span><div><h3 class="step__t"></h3><p class="step__b"></p><p class="step__meta"></p></div>';
    li.querySelector('.step__n').textContent = i + 1;
    li.querySelector('.step__t').textContent = st.title;
    li.querySelector('.step__b').textContent = st.body;
    (st.meta || []).forEach(function (m) { var sp = document.createElement('span'); sp.textContent = m; li.querySelector('.step__meta').appendChild(sp); });
    list.appendChild(li);
    var mi = document.createElement('li'); mi.innerHTML = '<i></i><span></span>';
    mi.querySelector('i').textContent = i + 1; mi.querySelector('span').textContent = st.title; mini.appendChild(mi);
    dots.appendChild(document.createElement('i'));
    var mk = document.createElement('div'); mk.dataset.i = i; marks.appendChild(mk);
  });
  var cur = -1;
  function setStep(i) {
    if (i === cur) return; cur = i;
    if (anim()) $$('.step', list).forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
    $$('li', mini).forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); });
    $$('i', dots).forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); });
    tState.textContent = S[i].tag; tNote.textContent = S[i].note;
    if (anim()) { tag.classList.remove('is-flip'); void tag.offsetWidth; tag.classList.add('is-flip'); }
  }
  setStep(0);
  if (anim()) {
    // 고정 무대: 화면 가운데를 지나는 표시(다섯 칸)로 지금 단계를 고른다
    var stepIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setStep(+e.target.dataset.i); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('div', marks).forEach(function (m) { stepIO.observe(m); });
    // 키보드 초점이 단계 글에 들어오면 그 단계로
    list.addEventListener('focusin', function (e) { var li = e.target.closest('.step'); if (li) setStep(+li.dataset.i); });
  }

  /* ---------- 드러내기 + 숫자 세기 (들어올 때마다) ---------- */
  [
    ['#quote .head', '#quote .chips', '#quote .panel'],
    ['#photo .head', '#photo .panel'],
    ['#compare .head', '#compare .ticks', '#compare .panel'],
    ['#cases .head', '.case', '#cases .more'],
    ['#faq .head', '.qa'],
    ['.end__title', '.end__lead']
  ].forEach(function (g) {
    var els = []; g.forEach(function (s) { els = els.concat($$(s)); });
    B.reveal(els);
  });
  if (anim()) {
    // 큰 숫자: 최종 값이 기본, 보일 때 0부터 다시 센다
    var val = $('.saving__val'), fills = $$('.bar__fill'), countT;
    var countIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          var t0 = performance.now(), to = +val.dataset.count;
          fills.forEach(function (f) { f.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, easing: 'cubic-bezier(.22,.8,.26,1)', delay: 150 }); });
          cancelAnimationFrame(countT);
          (function tick(now) {
            var p = Math.min(1, (now - t0) / 1000), k = 1 - Math.pow(1 - p, 3);
            val.textContent = Math.round(to * k);
            if (p < 1) countT = requestAnimationFrame(tick);
          })(t0);
        }
      });
    }, { rootMargin: '0px 0px -25% 0px' });
    countIO.observe($('.saving__num'));
  }
})();
