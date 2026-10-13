/* 가죽결 수선소 · 화면 코드 (움직임이 꺼져 있어도 다 돌아가는 것들) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var won = function (n) { return n.toLocaleString('ko-KR') + '원'; };
  var anim = function () { return root.classList.contains('anim'); };

  /* ---------- 알림 ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 3600);
  }

  /* ---------- 1분 견적 ---------- */
  var R = window.REPAIRS || [];
  var byId = {}; R.forEach(function (r) { byId[r.id] = r; });
  var picked = [];          // 고른 순서대로
  var lastCleared = null;
  var boot = $('#boot'), spots = $('#spots'), chips = $('#chips');
  var rowsEl = $('#paper-rows'), emptyEl = $('#paper-empty'), totalEl = $('#paper-total'), daysEl = $('#paper-days');
  var whyEl = $('#quote-why');
  var stamp = $('#stamp'), clearBtn = $('#quote-clear'), undoP = $('#quote-undo');

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

  /* ---------- 전후 비교 ---------- */
  var ba = $('#ba'), baRange = $('.ba__range');
  function setPos() { ba.style.setProperty('--pos', baRange.value + '%'); }
  baRange.addEventListener('input', setPos); setPos();

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

  /* ---------- 머리줄: 첫 화면 뒤로 내릴 땐 숨고, 올릴 땐 나온다 ---------- */
  var topEl = $('#top'), lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, d = y - lastY;
      if (Math.abs(d) > 6) { topEl.classList.toggle('is-hidden', d > 0 && y > window.innerHeight * .8 && !topEl.contains(document.activeElement)); lastY = y; }
      ticking = false;
    });
  }, { passive: true });
  topEl.addEventListener('focusin', function () { topEl.classList.remove('is-hidden'); });

  /* ---------- 신청 바 ---------- */
  var dock = $('#dock'), form = $('#dock-form'), phone = $('#dock-phone'), msg = $('#dock-msg');
  var wide = window.matchMedia('(min-width: 900px)');
  if ('IntersectionObserver' in window) {
    var hero = $('.hero'), foot = $('.foot'), heroOut = false, footIn = false;
    var busy = 0;   // 견적서·끝 칸이 보이는 동안은 숨긴다 (그 칸에 같은 단추가 있다)
    var upd = function () { dock.classList.toggle('is-show', heroOut && !footIn && !busy || dock.classList.contains('is-open')); };
    var busyIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.__in = e.isIntersecting; });
      busy = $$('#quote .btns, .end__in').filter(function (el) { return el.__in; }).length; upd();
    }, { rootMargin: '-15% 0px -15% 0px' });
    $$('#quote .btns, .end__in').forEach(function (el) { busyIO.observe(el); });
    new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting; upd(); }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
    new IntersectionObserver(function (es) { footIn = es[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -120px 0px' }).observe(foot);
  } else dock.classList.add('is-show');

  function openApply() {
    dock.classList.add('is-show');
    if (!wide.matches) dock.classList.add('is-open');
    setTimeout(function () { (wide.matches ? phone : $('#dock-kind')).focus(); }, 60);
  }
  $$('[data-open-apply]').forEach(function (b) { b.addEventListener('click', openApply); });
  $$('a[href="#apply"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.closest('.end')) return;
      e.preventDefault();
      $('#apply').scrollIntoView({ behavior: anim() ? 'smooth' : 'auto', block: 'center' });
      setTimeout(openApply, anim() ? 500 : 0);
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dock.classList.remove('is-open'); });
  document.addEventListener('pointerdown', function (e) {
    if (dock.classList.contains('is-open') && !dock.contains(e.target) && !e.target.closest('[data-open-apply], a[href="#apply"]')) dock.classList.remove('is-open');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var digits = phone.value.replace(/[^0-9０-９]/g, '');
    if (digits.length < 9) {
      phone.setAttribute('aria-invalid', 'true');
      msg.textContent = digits.length ? '번호가 짧아요. 010부터 다 적어 주세요.' : '연락받을 휴대폰 번호를 적어 주세요.';
      phone.focus(); return;
    }
    phone.removeAttribute('aria-invalid'); msg.textContent = '';
    toast('연습용 사이트라 실제로 접수되지는 않아요. 진짜 공방이라면 여기서 사진 보낼 링크가 문자로 가요.', 5200);
  });
  phone.addEventListener('input', function () { if (phone.getAttribute('aria-invalid')) { phone.removeAttribute('aria-invalid'); msg.textContent = ''; } });

  /* ---------- 드러내기 + 숫자 세기 (들어올 때마다) ---------- */
  if (anim()) {
    var groups = [
      ['#quote .head', '#quote .chips', '#quote .panel'],
      ['#photo .head', '#photo .panel'],
      ['#compare .head', '#compare .ticks', '#compare .panel'],
      ['#cases .head', '.case'],
      ['#faq .head', '.qa'],
      ['.end__title', '.end__lead']
    ];
    groups.forEach(function (g) {
      var els = []; g.forEach(function (s) { els = els.concat($$(s)); });
      els.forEach(function (el, k) { el.classList.add('rv'); el.style.setProperty('--d', (k * 0.08) + 's'); });
    });
    var play = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { rootMargin: '0px 0px -12% 0px' });
    // 되돌리기는 화면에서 40px 넘게 벗어났을 때만: 드러내기의 24px 미끄러짐보다 커야 경계에서 깜빡이지 않는다
    var reset = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting && !e.target.contains(document.activeElement)) e.target.classList.remove('in'); });
    }, { rootMargin: '40px 0px 40px 0px' });
    $$('.rv').forEach(function (el) { play.observe(el); reset.observe(el); });
    document.addEventListener('focusin', function (e) { var r = e.target.closest('.rv'); if (r) r.classList.add('in'); });

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

  window.addEventListener('beforeprint', function () { $$('.rv').forEach(function (el) { el.classList.add('in'); }); });
})();
