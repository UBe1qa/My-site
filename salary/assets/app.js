/* 화면 연결. 계산은 pay-core.js(PAY), 결과 그리기는 pay-view.js(PayView)가 하고 여기서는 입력을 읽어 넘기고 받은 HTML을 끼운다.
   페이지 언어는 <html lang> 이 정한다(브라우저 언어로 화면을 바꾸거나 넘기지 않는다. 다른 언어판 안내 띠만 띄운다).
   기기에 저장하는 것은 tk.lang 하나뿐이다(안내 띠를 닫았거나 언어 링크를 눌렀다는 표시). 입력한 금액·날짜는 저장하지도 보내지도 않는다. */
(function () {
  'use strict';
  var CFG = JSON.parse(document.getElementById('tk').textContent), LANG = CFG.lang, EN = LANG === 'en';
  var $ = function (id) { return document.getElementById(id); };
  var ANIM = document.documentElement.classList.contains('anim');
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function today() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }

  /* ── 다른 언어판 안내 띠: 머리 아래에 겹쳐 띄운다(끼워 넣지 않는다) ── */
  function langbar() {
    var other = EN ? 'ko' : 'en', nav = (navigator.language || '').toLowerCase(), wantsKo = nav.indexOf('ko') === 0;
    document.querySelectorAll('[data-lang-link]').forEach(function (a) { a.addEventListener('click', function () { store('tk.lang', other); }); });
    if (!CFG.other || store('tk.lang') || wantsKo === !EN) return;
    var top = document.querySelector('.top');
    if (!top) return;
    var bar = document.createElement('div'), box = document.createElement('div'), a = document.createElement('a'), x = document.createElement('button');
    bar.className = 'langbar';
    a.href = CFG.other; a.lang = other; a.hreflang = other; a.textContent = EN ? '한국어로 보기' : 'English version';
    x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', EN ? 'Close' : '닫기');
    box.appendChild(a); box.appendChild(x); bar.appendChild(box); top.appendChild(bar);
    x.addEventListener('click', function () { store('tk.lang', LANG); bar.remove(); });
    a.addEventListener('click', function () { store('tk.lang', other); });
  }

  /* ── 연출 3: 루멘랩 링크 칸. 화면에 절반 넘게 들어오면 봉투에서 명세서가 한 번 올라온다 ── */
  function lumen() {
    var el = document.querySelector('[data-lumen]');
    if (!el || !ANIM) return;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      el.classList.add('in');
      setTimeout(function () { el.classList.add('done'); }, 700);
    }, { threshold: 0.5 });
    io.observe(el);
  }

  langbar();
  lumen();

  var page = CFG.page;
  if (!window.PayCore || !window.PAY_DATA) return;
  var P = window.PAY || window.PayCore(window.PAY_DATA, window.PAY_GANI || null), D = P.data;
  if (page === 'table') { tablePage(); return; }
  if (!window.PayView) return;
  var V = window.PayView(P, LANG), slip = $('slip'), live = $('live');

  /* ── 연출 1: 이중 밑줄 긋기. 값을 넣고 멈췄을 때, 결과가 바뀌었으면 한 번 ── */
  var drawn = null, settleT = 0, liveText = '', pending = null;
  function draw() {
    var el = slip && slip.querySelector('.dbl');
    if (!el) return;
    el.classList.remove('draw');
    void el.offsetWidth;
    el.classList.add('draw');
  }
  /* typing: 글자를 치는 중이면 0.6초 멈춘 뒤에. 단추·고르기는 바로. 예시 상태·값이 그대로면 안 그린다 */
  function settle(value, example, typing, text, quiet) {
    clearTimeout(settleT); pending = null;
    liveText = text || '';
    if (quiet) { drawn = example ? null : value; return; }
    var go = function () {
      pending = null;
      if (live && liveText) live.textContent = liveText;
      if (example || value === drawn) { if (example) drawn = null; return; }
      drawn = value;
      draw();
    };
    if (typing) { pending = go; settleT = setTimeout(go, 600); } else go();
  }
  /* 칸을 떠나거나 Enter 를 누르면 기다리지 않고 바로. 명세서를 다시 그리지는 않는다(다시 그리면 누르던 단추가 사라져 눌림이 씹힌다) */
  function flush() { if (pending) { clearTimeout(settleT); pending(); } }
  function setStale(pid) {
    var el = $('stale');
    if (!el) return;
    var v = pid ? P.validity(pid, today()) : P.unemploymentValidity(today()), y = pid ? D.periods[pid].year : D.periods[D.now].year;
    el.hidden = !(v.ok && v.stale);
    el.textContent = EN ? 'These figures are the ' + y + ' rules. We are checking the new ones.' : '이 값은 ' + y + '년 기준이에요. 새 기준을 확인 중이에요.';
  }
  function pressed(group, value) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === String(value))); });
  }
  /* 칸에 넣어 줄 글자: 만 원으로 떨어지면 '4,100만', 아니면 '3,333,333' */
  function amountText(n) { return EN || n % 10000 ? P.fmt(n) : P.readKo(n).replace(/ ?원$/, ''); }

  if (page === 'net') netPage();
  else if (page === 'sev') sevPage();
  else if (page === 'hourly') hourlyPage();
  else if (page === 'ub') ubPage();
  else if (page === 'leave') leavePage();

  /* ───────── 실수령액 ───────── */
  function netPage() {
    var st = { text: '', basis: 'annual', nontax: D.net.nontaxMeal, family: 1, children: 0, ratio: 100, sev: false, age65: false, period: D.now, showEx: false, open: false };
    var amt = $('amt'), read = $('read'), quick = $('quick'), cmp = $('cmp'), stick = $('stick'), body = $('optsBody'), btn = $('optsBtn');
    var memo = null, last = null, chgT = 0, sumSeen = true;

    function render(why) {
      var v = V.net(st);
      last = v;
      read.className = 'read ' + v.read.cls; read.innerHTML = v.read.html;
      $('optsSum').textContent = v.summary;
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      cmp.innerHTML = v.compare;
      stick.innerHTML = v.stick;
      settle(v.value + '|' + st.period, v.example, why === 'type', v.live, why === 'quiet');
      return v;
    }
    function setText(t, why) { st.text = t; amt.value = t; memo = null; render(why); }
    function controls() {
      var i = st.basis === 'annual' ? 0 : 1;
      pressed($('basis'), st.basis);
      amt.placeholder = CFG.ph[i]; $('amt-l').textContent = CFG.amtL[i];
      quick.querySelectorAll('button').forEach(function (b, k) { var q = CFG.quick[st.basis][k]; b.dataset.v = q[0]; b.textContent = q[1]; });
      body.querySelector('[data-k="family"] output').textContent = st.family;
      body.querySelector('[data-k="children"] output').textContent = st.children;
      pressed(body.querySelector('[data-k="ratio"]'), st.ratio);
      pressed(body.querySelector('[data-k="period"]'), st.period);
      body.querySelector('[data-sev]').hidden = st.basis !== 'annual';
      btn.setAttribute('aria-expanded', String(st.open)); body.hidden = !st.open; $('optsGo').textContent = st.open ? CFG.close : CFG.change;
      setStale(st.period);
      sticky();
    }
    function sticky() { stick.classList.toggle('on', st.open && !sumSeen); }

    amt.addEventListener('input', function () { st.text = amt.value; memo = null; render('type'); });
    amt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { flush(); amt.blur(); } });
    amt.addEventListener('blur', flush);
    quick.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) setText(b.dataset.v); });
    /* 연봉 ↔ 월급: 같은 사람의 돈으로 바꿔 준다(연봉 4,000만 → 월급 3,333,333). 고치지 않고 되돌아오면 처음 쓴 글자를 되살린다 */
    $('basis').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.dataset.v === st.basis) return;
      var to = b.dataset.v, c = last.calc;
      if (!c.example) {
        if (memo && memo.to === st.basis && memo.text === st.text) { st.text = memo.fromText; memo = null; }
        else {
          var from = st.text, val = to === 'monthly' ? c.res.gross : c.res.gross * 12;
          st.text = amountText(val); memo = { to: to, text: st.text, fromText: from };
        }
        amt.value = st.text;
      } else { st.text = ''; amt.value = ''; memo = null; }
      st.basis = to; controls(); render('quiet');
    });
    slip.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'how') { st.showEx = !st.showEx; render(); var h = slip.querySelector('.how'); if (h) h.focus(); }
      if (b.dataset.act === 'period') setPeriod(b.dataset.v, true);
    });
    cmp.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var base = last.calc.input.amount;
      if (b.dataset.act === 'step') { var n = base + (+b.dataset.v) * V.STEP[st.basis]; if (n > 0) setText(amountText(n)); var again = cmp.querySelector('[data-act="step"][data-v="' + b.dataset.v + '"]'); if (again) again.focus(); }
      if (b.dataset.act === 'set') { setText(amountText(+b.dataset.v)); var me = cmp.querySelector('.cmp-step button'); if (me) me.focus(); }
    });
    btn.addEventListener('click', function () { st.open = !st.open; controls(); });
    body.querySelectorAll('.step').forEach(function (s) {
      var k = s.dataset.k, bs = s.querySelectorAll('button');
      bs[0].addEventListener('click', function () { var min = k === 'family' ? 1 : 0; if (st[k] > min) { st[k]--; if (k === 'family' && st.children > st.family - 1) st.children = st.family - 1; controls(); render(); } });
      bs[1].addEventListener('click', function () { var max = k === 'family' ? D.net.maxFamily : st.family - 1; if (st[k] < max) { st[k]++; controls(); render(); } });
    });
    body.querySelector('[data-k="ratio"]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { st.ratio = +b.dataset.v; controls(); render(); } });
    body.querySelector('[data-k="period"]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setPeriod(b.dataset.v, false); });
    var nt = $('o-nontax');
    nt.addEventListener('input', function () { var r = P.parseMoney(nt.value, 'won'); if (r.ok) st.nontax = r.value; else if (!nt.value.trim()) st.nontax = 0; else return; render('type'); });
    nt.addEventListener('blur', function () { nt.value = P.fmt(st.nontax); flush(); });
    $('o-sev').addEventListener('change', function (e) { st.sev = e.target.checked; render(); });
    $('o-age').addEventListener('change', function (e) { st.age65 = e.target.checked; render(); });

    /* 연출 2: 기준 시기를 바꿨을 때 달라진 줄만 짚는다(옅은 바탕 + 차액 꼬리표, 2초) */
    function clash(b, row) {
      var r = b.getBoundingClientRect(), w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null), g = document.createRange(), n, i, q, rs;
      while ((n = w.nextNode())) {
        if (b.contains(n) || !n.nodeValue.trim() || getComputedStyle(n.parentNode).visibility === 'hidden') continue;
        g.selectNodeContents(n); rs = g.getClientRects();
        for (i = 0; i < rs.length; i++) { q = rs[i]; if (q.width && q.right > r.left + 1 && q.left < r.right - 1 && q.bottom > r.top + 3 && q.top < r.bottom - 3) return true; }
      }
      return false;
    }
    function setPeriod(pid, focusBack) {
      if (pid === st.period || !D.periods[pid]) return;
      st.period = pid; controls();
      var v = render('quiet'), ch = V.netChanged(v.calc, pid);
      clearTimeout(chgT);
      ch.forEach(function (x) {
        var row = slip.querySelector('[data-id="' + x.id + '"]'), cell = row && row.querySelector('.am, .num');
        if (!cell) return;
        var b = document.createElement('span');
        b.className = 'chg-b'; b.setAttribute('aria-hidden', 'true'); b.textContent = (x.diff > 0 ? '+' : '−') + P.fmt(Math.abs(x.diff));
        cell.appendChild(b); row.classList.add('chg');
        /* 좁은 화면에서 꼬리표가 항목 이름을 덮으면 금액 아래 빈 줄로 옮기고, 그럴 자리도 없으면 작은 설명을 잠깐 숨긴다 */
        if (clash(b, row)) {
          b.classList.add('under');
          if (b.getBoundingClientRect().bottom > row.getBoundingClientRect().bottom + 1 || clash(b, row)) { b.classList.remove('under'); b.classList.add('solid'); row.classList.add('tight'); }
        }
      });
      if (ch.length && live) live.textContent = V.netLive(ch);
      chgT = setTimeout(function () { slip.querySelectorAll('.chg').forEach(function (r) { r.classList.remove('chg', 'tight'); }); slip.querySelectorAll('.chg-b').forEach(function (b) { b.remove(); }); }, 2100);
      if (focusBack) { var l = slip.querySelector('[data-act="period"]'); if (l) l.focus(); }
    }

    /* 휴대폰: 조건을 여는 동안 큰 숫자가 화면 밖이면 실수령액 한 줄을 위에 붙여 둔다 */
    if ('IntersectionObserver' in window) {
      var sentinel = document.createElement('div');
      sentinel.className = 'sum-eye'; sentinel.setAttribute('aria-hidden', 'true');
      slip.parentNode.insertBefore(sentinel, slip);
      new IntersectionObserver(function (es) { sumSeen = es[es.length - 1].isIntersecting; sticky(); }).observe(sentinel);
    }
    stick.addEventListener('click', function () { slip.scrollIntoView({ block: 'start', behavior: ANIM ? 'smooth' : 'auto' }); });

    /* 표에서 넘어온 연봉(#a=40000000) */
    var m = /[#&]a=(\d{6,12})\b/.exec(location.hash);
    controls();
    if (m) { st.text = amountText(+m[1]); amt.value = st.text; render('quiet'); }
  }

  /* ───────── 퇴직금 ───────── */
  function sevPage() {
    var ids = { join: 'f-join', leave: 'f-leave', wages: 'f-wages', bonus: 'f-bonus', leavePay: 'f-lpay', ordinary: 'f-ord' }, E = D.severance.example;
    function state() {
      var s = { under15: $('f-u15').checked }, any = s.under15;
      Object.keys(ids).forEach(function (k) { s[k] = $(ids[k]).value; if (s[k].trim()) any = true; });
      s.touched = any;
      return s;
    }
    function render(typing) {
      var s = state(), v = V.sev(s);
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      $('b-clear').hidden = !s.touched;
      settle(v.ok && v.res.eligible ? v.res.amount : 'x', v.example || !v.ok, typing, v.example ? '' : v.live);
    }
    Object.keys(ids).forEach(function (k) {
      var el = $(ids[k]);
      el.addEventListener('input', function () { render(el.type === 'text'); });
      el.addEventListener('change', flush);
    });
    $('f-u15').addEventListener('change', function () { render(false); });
    $('b-ex').addEventListener('click', function () {
      $('f-join').value = E.join; $('f-leave').value = E.leave; $('f-wages').value = P.fmt(E.wages3m); $('f-bonus').value = P.fmt(E.annualBonus); $('f-lpay').value = P.fmt(E.leavePay);
      $('f-ord').value = ''; $('f-u15').checked = false; $('more').open = true;
      render(false);
    });
    $('b-clear').addEventListener('click', function () {
      Object.keys(ids).forEach(function (k) { $(ids[k]).value = ''; }); $('f-u15').checked = false;
      render(false); $('f-join').focus();
    });
  }

  /* ───────── 시급·주휴수당 ───────── */
  function hourlyPage() {
    var st = { mode: 'hourly', text: '', hours: String(D.hourly.fullWeekHours), period: D.now }, texts = { hourly: '', monthly: '' };
    var amt = $('amt'), read = $('read'), hours = $('f-hours');
    function render(typing) {
      var v = V.hourly(st);
      read.className = 'read ' + v.read.cls; read.innerHTML = v.read.html;
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      settle(v.value + '|' + st.mode + st.period + st.hours, v.example, typing, v.example ? '' : v.live);
    }
    function controls() {
      var i = st.mode === 'hourly' ? 0 : 1;
      pressed($('mode'), st.mode); pressed($('period'), st.period);
      amt.placeholder = CFG.ph[i]; $('amt-l').textContent = CFG.amtL[i];
      setStale(st.period);
    }
    amt.addEventListener('input', function () { st.text = amt.value; texts[st.mode] = st.text; render(true); });
    amt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { flush(); amt.blur(); } });
    amt.addEventListener('blur', flush);
    hours.addEventListener('input', function () { st.hours = hours.value; render(true); });
    hours.addEventListener('blur', flush);
    $('mode').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.dataset.v === st.mode) return; st.mode = b.dataset.v; st.text = texts[st.mode]; amt.value = st.text; controls(); render(false); });
    $('period').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.period = b.dataset.v; controls(); render(false); });
    controls();
  }

  /* ───────── 실업급여 ───────── */
  function ubPage() {
    var over50 = false;
    function render(typing) {
      var s = { leave: $('f-leave').value, wages: $('f-wages').value, hours: $('f-hours').value, band: $('f-band').value, over50: over50 };
      s.touched = !!(s.leave || s.wages.trim());
      var v = V.ub(s);
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      settle(v.ok ? v.value + '|' + s.band + over50 + s.hours : 'x', v.example || !v.ok, typing, v.example ? '' : v.live);
    }
    ['f-leave', 'f-hours', 'f-band'].forEach(function (id) { $(id).addEventListener('change', function () { render(false); }); $(id).addEventListener('input', function () { render(false); }); });
    $('f-wages').addEventListener('input', function () { render(true); });
    $('f-wages').addEventListener('blur', flush);
    $('age').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; over50 = b.dataset.v === '1'; pressed($('age'), b.dataset.v); render(false); });
    setStale(null);
  }

  /* ───────── 연차 ───────── */
  function leavePage() {
    var join = $('f-join');
    function render() {
      var v = V.leave({ join: join.value, asOf: today() });
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', !join.value);
      settle(join.value, !join.value, false, v.live);
    }
    join.addEventListener('change', render); join.addEventListener('input', render);
  }

  /* ───────── 연봉 표: 내 줄 찾기, 항목별로 보기 ───────── */
  function tablePage() {
    var find = $('find'), read = $('read'), tbl = $('tbl'), all = $('b-all'), hint = $('hint');
    if (!tbl) return;
    var rows = [].slice.call(tbl.querySelectorAll('tbody tr'));
    all.addEventListener('click', function () {
      var on = !tbl.classList.contains('all');
      tbl.classList.toggle('all', on); all.setAttribute('aria-pressed', String(on)); all.textContent = on ? all.dataset.on : all.dataset.off;
      hint.hidden = !(on && tbl.scrollWidth > tbl.clientWidth + 1);
    });
    var t = 0;
    function mark(scroll) {
      rows.forEach(function (r) { r.classList.remove('me'); });
      var r = P.parseMoney(find.value, 'man');
      if (!find.value.trim()) { read.textContent = ''; read.className = 'read'; return; }
      if (!r.ok || !r.value) { read.textContent = EN ? 'Could not read that amount.' : '금액을 읽지 못했어요.'; read.className = 'read err'; return; }
      var lo = +rows[0].dataset.a, hi = +rows[rows.length - 1].dataset.a;
      if (r.value < lo * 0.9 || r.value > hi * 1.05) { read.textContent = CFG.none; read.className = 'read'; return; }
      var best = rows[0];
      rows.forEach(function (x) { if (Math.abs(+x.dataset.a - r.value) < Math.abs(+best.dataset.a - r.value)) best = x; });
      best.classList.add('me');
      read.textContent = CFG.readAs.replace('{}', EN ? '₩' + P.fmt(r.value) : P.readKo(r.value)); read.className = 'read';
      if (scroll) best.scrollIntoView({ block: 'center' });
    }
    find.addEventListener('input', function () { clearTimeout(t); mark(false); t = setTimeout(function () { mark(true); }, 700); });
    find.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(t); mark(true); } });
  }
})();
