/* 화면 연결. 계산은 pay-core.js(PAY), 결과 그리기는 pay-view.js(PayView)가 하고 여기서는 입력을 읽어 넘기고 받은 HTML을 끼운다.
   페이지 언어는 <html lang> 이 정한다(브라우저 언어로 화면을 바꾸거나 넘기지 않는다. 다른 언어판 안내 띠만 띄운다).
   기기에 두는 것은 둘뿐이다(개인정보 처리방침과 같아야 한다. _dev/check.py 가 대조한다).
     localStorage  tk.lang : 다른 언어 안내 띠를 닫았거나 언어 링크를 눌렀다는 표시
     sessionStorage tk.in  : 계산기에 넣은 값. 다른 페이지에 갔다 돌아와도 이어서 보이게 이 탭에만 둔다(탭을 닫으면 사라진다)
   입력한 금액·날짜는 어디로도 보내지 않는다. */
(function () {
  'use strict';
  var CFG = JSON.parse(document.getElementById('tk').textContent), LANG = CFG.lang, EN = LANG === 'en';
  var $ = function (id) { return document.getElementById(id); };
  var ANIM = document.documentElement.classList.contains('anim');
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var SKEY = 'tk.in';
  function sessAll() { try { return JSON.parse(sessionStorage.getItem(SKEY) || '{}') || {}; } catch (e) { return {}; } }
  /* 이 페이지의 입력을 탭 저장소에 둔다. o 가 없으면(예시 상태) 지운다 */
  function sess(page, o) {
    try {
      var all = sessAll();
      if (o) all[page] = o; else delete all[page];
      if (Object.keys(all).length) sessionStorage.setItem(SKEY, JSON.stringify(all)); else sessionStorage.removeItem(SKEY);
    } catch (e) { /* 저장소를 못 쓰는 브라우저에서는 그냥 넘어간다 */ }
  }
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
  function invalid(input, on) { if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  if (page === 'table') { tablePage(); return; }
  if (!window.PayView) return;
  var V = window.PayView(P, LANG), slip = $('slip'), live = $('live');
  /* 기기 날짜로 정하는 것: 기본 기준 시기(해가 바뀌면 다음 기준), 다음 기준이 아직 '예정'인지 */
  var T0 = today(), DEF = P.defaultPeriod(T0), PLANNED = !!(D.periods[D.next] && T0 < D.periods[D.next].starts);

  /* ── 연출 1: 이중 밑줄 긋기. 값을 넣고 멈췄을 때, 결과가 바뀌었으면 한 번 ── */
  var drawn = null, settleT = 0, liveText = '', pending = null;
  function draw() {
    var el = slip && slip.querySelector('.dbl');
    if (!el) return;
    el.classList.remove('draw');
    void el.offsetWidth;
    el.classList.add('draw');
  }
  /* typing: 글자를 치는 중이면 0.6초 멈춘 뒤에. 단추·고르기는 바로. 예시 상태·값이 그대로면 안 그린다.
     text 는 화면 낭독기에 읽어 줄 한 줄(결과, 또는 입력을 못 읽었다는 안내) */
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
  /* 기준 기간이 지났으면 결과 위에 알린다. 더 새 기준이 이미 있고(기본으로 쓰고 있고) 옛 기준을 골라 보는 중이면 '지난 기준'이라고만 한다 */
  function setStale(pid) {
    var el = $('stale');
    if (!el) return;
    var v = P.validity(pid, T0), stale = v.ok && v.stale;
    var newer = stale && pid === D.now && DEF === D.next && !P.validity(D.next, T0).stale;
    el.hidden = !stale;
    el.textContent = V.staleText(D.periods[pid].year, newer);
  }
  function pressed(group, value) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === String(value))); });
  }
  /* 금액 칸 하나의 곁 표시: 칸 옆 단위(u-<id>), 칸 아래 읽은 값 한 줄, 오류 표시(aria-invalid). info 는 pay-view.js 의 field() 가 준 것 */
  var hints = {};
  function mark(input, info, readEl) {
    var u = $('u-' + input.id);
    if (u) u.textContent = info.unit || '';
    invalid(input, info.invalid);
    if (!readEl) return;
    if (!(readEl.id in hints)) hints[readEl.id] = readEl.innerHTML;
    var blank = info.read.cls === 'hint' && !info.read.html;
    readEl.className = 'read ' + (blank ? 'hint' : info.read.cls); readEl.innerHTML = blank ? hints[readEl.id] : info.read.html;
  }

  if (page === 'net') netPage();
  else if (page === 'sev') sevPage();
  else if (page === 'hourly') hourlyPage();
  else if (page === 'ub') ubPage();
  else if (page === 'leave') leavePage();

  /* ───────── 실수령액 ───────── */
  function netPage() {
    var st = { text: '', basis: 'annual', nontax: D.net.nontaxMeal, nontaxText: null, family: 1, children: 0, ratio: 100, sev: false, age60: false, age65: false, period: DEF, planned: PLANNED, showEx: false, open: false };
    var amt = $('amt'), read = $('read'), quick = $('quick'), cmp = $('cmp'), stick = $('stick'), body = $('optsBody'), btn = $('optsBtn'), nt = $('o-nontax');
    var memo = null, last = null, chgT = 0, sumSeen = true;

    function render(why) {
      var v = V.net(st);
      last = v;
      mark(amt, v, read);
      if (!v.nontax.invalid) st.nontax = v.nontax.value;
      mark(nt, v.nontax, $('r-o-nontax'));
      $('optsSum').textContent = v.summary;
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      cmp.innerHTML = v.compare;
      stick.innerHTML = v.stick;
      settle(v.value + '|' + st.period, v.example, why === 'type', v.live, why === 'quiet');
      keep();
      return v;
    }
    /* 다른 페이지에 갔다 와도 이어서 보이게 이 탭에만 둔다. 예시 상태(아무것도 안 바꿈)면 지운다 */
    function keep() {
      var changed = st.text.trim() || st.basis !== 'annual' || st.nontax !== D.net.nontaxMeal || st.family !== 1 || st.children || st.ratio !== 100 || st.sev || st.age60 || st.age65 || st.period !== DEF;
      sess('net', changed ? { text: st.text, basis: st.basis, nontax: st.nontax, family: st.family, children: st.children, ratio: st.ratio, sev: st.sev, age60: st.age60, age65: st.age65, period: st.period } : null);
    }
    function ntText() { nt.value = st.nontax % 10000 === 0 && !EN ? P.fmt(st.nontax / 10000) : EN ? P.fmt(st.nontax) : P.fmt(st.nontax) + '원'; st.nontaxText = st.nontax === D.net.nontaxMeal ? null : nt.value; }
    function setText(t, why) { st.text = t; amt.value = t; memo = null; render(why); }
    function controls() {
      var i = st.basis === 'annual' ? 0 : 1;
      pressed($('kind'), st.basis);
      amt.placeholder = CFG.ph[i]; $('amt-l').textContent = CFG.amtL[i];
      quick.querySelectorAll('button').forEach(function (b, k) { var q = CFG.quick[st.basis][k]; b.dataset.v = q[0]; b.textContent = q[1]; });
      body.querySelector('[data-k="family"] output').textContent = st.family;
      body.querySelector('[data-k="children"] output').textContent = st.children;
      pressed(body.querySelector('[data-k="ratio"]'), st.ratio);
      pressed(body.querySelector('[data-k="period"]'), st.period);
      body.querySelector('[data-k="period"] [data-v="' + D.next + '"]').textContent = CFG.pNext[PLANNED ? 0 : 1];
      body.querySelector('[data-sev]').hidden = st.basis !== 'annual';
      $('o-sev').checked = st.sev; $('o-age60').checked = st.age60; $('o-age').checked = st.age65;
      btn.setAttribute('aria-expanded', String(st.open)); body.hidden = !st.open; $('optsGo').textContent = st.open ? CFG.close : CFG.change;
      setStale(st.period);
      sticky();
    }
    function sticky() { stick.classList.toggle('on', st.open && !sumSeen); }

    amt.addEventListener('input', function () { st.text = amt.value; memo = null; render('type'); });
    amt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { flush(); amt.blur(); } });
    amt.addEventListener('blur', flush);
    quick.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (b) setText(b.dataset.v); });
    /* 연봉 ↔ 월급: 같은 사람의 돈으로 바꿔 준다(연봉 4,000만 → 월급 3,333,333원). 고치지 않고 되돌아오면 처음 쓴 글자를 되살린다 */
    $('kind').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.dataset.v === st.basis) return;
      var to = b.dataset.v, c = last.calc;
      if (!c.example) {
        if (memo && memo.to === st.basis && memo.text === st.text) { st.text = memo.fromText; memo = null; }
        else {
          var from = st.text, val = to === 'monthly' ? c.res.gross : c.res.gross * 12;
          st.text = V.amountText(val); memo = { to: to, text: st.text, fromText: from };
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
      if (b.dataset.act === 'step') { var n = base + (+b.dataset.v) * V.STEP[st.basis]; if (n > 0) setText(V.amountText(n)); var again = cmp.querySelector('[data-act="step"][data-v="' + b.dataset.v + '"]'); if (again) again.focus(); }
      if (b.dataset.act === 'set') { setText(V.amountText(+b.dataset.v)); var me = cmp.querySelector('.cmp-step button'); if (me) me.focus(); }
    });
    btn.addEventListener('click', function () { st.open = !st.open; controls(); });
    body.querySelectorAll('.step').forEach(function (s) {
      var k = s.dataset.k, bs = s.querySelectorAll('button');
      bs[0].addEventListener('click', function () { var min = k === 'family' ? 1 : 0; if (st[k] > min) { st[k]--; if (k === 'family' && st.children > st.family - 1) st.children = st.family - 1; controls(); render(); } });
      bs[1].addEventListener('click', function () { var max = k === 'family' ? D.net.maxFamily : st.family - 1; if (st[k] < max) { st[k]++; controls(); render(); } });
    });
    body.querySelector('[data-k="ratio"]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { st.ratio = +b.dataset.v; controls(); render(); } });
    body.querySelector('[data-k="period"]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setPeriod(b.dataset.v, false); });
    /* 비과세: 못 읽는 글자면 앞서 넣은 금액으로 계산한 채 칸 아래에 알린다. 칸을 떠날 때 읽은 값으로 글자를 정리한다 */
    nt.addEventListener('input', function () { st.nontaxText = nt.value; render('type'); });
    nt.addEventListener('blur', function () { if (last && !last.nontax.invalid) { ntText(); mark(nt, V.net(st).nontax, $('r-o-nontax')); } flush(); });
    $('o-sev').addEventListener('change', function (e) { st.sev = e.target.checked; render(); });
    /* 만 60세 이상 = 국민연금 없음. 65세 이후 입사 = 고용보험료도 없음(켜면 60세 이상도 같이 켠다. 임의계속가입으로 계속 내는 사람은 60세 쪽을 끄면 된다) */
    $('o-age60').addEventListener('change', function (e) { st.age60 = e.target.checked; render(); });
    $('o-age').addEventListener('change', function (e) { st.age65 = e.target.checked; if (st.age65 && !st.age60) { st.age60 = true; $('o-age60').checked = true; } render(); });

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

    /* 처음 열 때: ① 표에서 넘어온 연봉(#a=40000000)은 표의 조건(기본값)으로 계산하고, 읽은 뒤 주소에서 지운다(금액을 바꿔도 옛 금액이 주소에 남지 않게)
                  ② 아니면 이 탭에 두었던 입력을 되살린다 */
    var m = /[#&]a=(\d{6,12})\b/.exec(location.hash), saved = sessAll().net;
    if (m) {
      st.text = V.amountText(+m[1]); amt.value = st.text;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 주소를 못 바꾸는 환경이면 그대로 둔다 */ }
    } else if (saved && typeof saved === 'object') {
      if (typeof saved.text === 'string') st.text = saved.text;
      if (saved.basis === 'monthly') st.basis = 'monthly';
      if (P.netPay({ amount: 1000000, basis: 'monthly', nontax: saved.nontax, family: saved.family, children: saved.children, ratio: saved.ratio, period: saved.period }).ok) {
        st.nontax = saved.nontax; st.family = saved.family; st.children = saved.children; st.ratio = saved.ratio;
        if (D.periods[saved.period]) st.period = saved.period;
      }
      st.sev = !!saved.sev; st.age60 = !!saved.age60; st.age65 = !!saved.age65;
      amt.value = st.text;
      if (st.nontax !== D.net.nontaxMeal) ntText();
    }
    controls();
    if (m || saved || st.period !== D.now) render('quiet');
  }

  /* ───────── 퇴직금 ───────── */
  function sevPage() {
    var ids = { join: 'f-join', leave: 'f-leave', wages: 'f-wages', bonus: 'f-bonus', leavePay: 'f-lpay', ordinary: 'f-ord' }, E = D.severance.example;
    var money = ['wages', 'bonus', 'leavePay', 'ordinary'];
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
      money.forEach(function (k) { var el = $(ids[k]); mark(el, v.fields[k], $('r-' + el.id)); if (v.bad && v.bad[k]) invalid(el, true); });
      invalid($(ids.join), !!(v.bad && v.bad.join)); invalid($(ids.leave), !!(v.bad && v.bad.leave));
      settle(v.ok && v.res.eligible ? v.res.amount : 'x', v.example || !v.ok, typing, v.example ? '' : v.live);
      sess('sev', s.touched ? { join: s.join, leave: s.leave, wages: s.wages, bonus: s.bonus, leavePay: s.leavePay, ordinary: s.ordinary, under15: s.under15 } : null);
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
    var saved = sessAll().sev;
    if (saved && typeof saved === 'object') {
      Object.keys(ids).forEach(function (k) { if (typeof saved[k] === 'string') $(ids[k]).value = saved[k]; });
      $('f-u15').checked = !!saved.under15;
      if ($('f-bonus').value || $('f-lpay').value || $('f-ord').value || saved.under15) $('more').open = true;
      render(false);
    }
  }

  /* ───────── 시급·주휴수당 ───────── */
  function hourlyPage() {
    var st = { mode: 'hourly', text: '', hours: String(D.hourly.fullWeekHours), period: DEF }, texts = { hourly: '', monthly: '' };
    var amt = $('amt'), read = $('read'), hours = $('f-hours');
    function render(typing) {
      var v = V.hourly(st);
      mark(amt, v, read);
      invalid(hours, v.hoursBad);
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      settle(v.value + '|' + st.mode + st.period + st.hours, v.example || !v.ok, typing, v.example && !v.invalid ? '' : v.live);
      var changed = texts.hourly.trim() || texts.monthly.trim() || st.mode !== 'hourly' || st.hours !== String(D.hourly.fullWeekHours) || st.period !== DEF;
      sess('hourly', changed ? { mode: st.mode, hourly: texts.hourly, monthly: texts.monthly, hours: st.hours, period: st.period } : null);
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
    var saved = sessAll().hourly;
    if (saved && typeof saved === 'object') {
      if (typeof saved.hourly === 'string') texts.hourly = saved.hourly;
      if (typeof saved.monthly === 'string') texts.monthly = saved.monthly;
      if (saved.mode === 'monthly') st.mode = 'monthly';
      if (typeof saved.hours === 'string') { st.hours = saved.hours; hours.value = saved.hours; }
      if (D.periods[saved.period]) st.period = saved.period;
      st.text = texts[st.mode]; amt.value = st.text;
    }
    controls();
    if (saved || st.period !== D.now) { var v0 = V.hourly(st); mark(amt, v0, read); invalid(hours, v0.hoursBad); slip.innerHTML = v0.slip; slip.classList.toggle('is-ex', v0.example); settle(v0.value + '|' + st.mode + st.period + st.hours, v0.example || !v0.ok, false, '', true); }
  }

  /* ───────── 실업급여 ───────── */
  function ubPage() {
    var over50 = false, wages = $('f-wages');
    function render(typing) {
      var s = { leave: $('f-leave').value, wages: wages.value, hours: $('f-hours').value, band: $('f-band').value, over50: over50 };
      s.touched = !!(s.leave || s.wages.trim());
      var v = V.ub(s);
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', v.example);
      mark(wages, v.field.read ? v.field : { unit: V.UNIT.man, invalid: false, read: { cls: 'hint', html: '' } }, $('r-f-wages'));
      if (v.bad.wages) invalid(wages, true);
      invalid($('f-leave'), !!v.bad.leave && !v.example);
      settle(v.ok ? v.value + '|' + s.band + over50 + s.hours : 'x', v.example || !v.ok, typing, v.example ? '' : v.live);
      sess('ub', s.touched ? { leave: s.leave, wages: s.wages, hours: s.hours, band: s.band, over50: over50 } : null);
    }
    ['f-leave', 'f-hours', 'f-band'].forEach(function (id) { $(id).addEventListener('change', function () { render(false); }); $(id).addEventListener('input', function () { render(false); }); });
    wages.addEventListener('input', function () { render(true); });
    wages.addEventListener('blur', flush);
    $('age').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; over50 = b.dataset.v === '1'; pressed($('age'), b.dataset.v); render(false); });
    /* 기준 기간: 다음 해로 넘어가면 '상한액은 아직 반영하지 못했다'고, 그 해도 지나면 '새 기준을 확인 중'이라고 알린다 */
    var el = $('stale'), val = P.unemploymentValidity(T0);
    if (el) { el.hidden = !(val.ok && val.stale); el.textContent = V.ubStaleText(val.nextYear); }
    var saved = sessAll().ub;
    if (saved && typeof saved === 'object') {
      if (typeof saved.leave === 'string') $('f-leave').value = saved.leave;
      if (typeof saved.wages === 'string') wages.value = saved.wages;
      if ($('f-hours').querySelector('option[value="' + saved.hours + '"]')) $('f-hours').value = saved.hours;
      if ($('f-band').querySelector('option[value="' + saved.band + '"]')) $('f-band').value = saved.band;
      over50 = !!saved.over50; pressed($('age'), over50 ? '1' : '0');
      render(false);
    }
  }

  /* ───────── 연차 ───────── */
  function leavePage() {
    var join = $('f-join');
    function render() {
      var v = V.leave({ join: join.value, asOf: T0 });
      slip.innerHTML = v.slip; slip.classList.toggle('is-ex', !join.value);
      invalid(join, !!join.value && P.parseDate(join.value) === null);
      settle(join.value, !join.value, false, v.live);
      sess('leave', join.value ? { join: join.value } : null);
    }
    join.addEventListener('change', render); join.addEventListener('input', render);
    var saved = sessAll().leave;
    if (saved && typeof saved.join === 'string') { join.value = saved.join; render(); }
  }

  /* ───────── 연봉 표: 내 줄 찾기, 항목별로 보기, 줄 전체가 계산기로 가는 링크 ───────── */
  function tablePage() {
    var find = $('find'), read = $('read'), tbl = $('tbl'), all = $('b-all'), hint = $('hint');
    if (!tbl) return;
    var rows = [].slice.call(tbl.querySelectorAll('tbody tr'));
    all.addEventListener('click', function () {
      var on = !tbl.classList.contains('all');
      tbl.classList.toggle('all', on); all.setAttribute('aria-pressed', String(on)); all.textContent = on ? all.dataset.on : all.dataset.off;
      hint.hidden = !(on && tbl.scrollWidth > tbl.clientWidth + 1);
    });
    /* 줄 어디를 눌러도 그 연봉으로 계산기가 열린다(글자를 긁어 고르는 중이면 넘어가지 않는다) */
    tbl.querySelector('tbody').addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var tr = e.target.closest('tr'), a = tr && tr.querySelector('th a');
      if (!a || String(window.getSelection && window.getSelection()).length) return;
      location.href = a.href;
    });
    /* 내 연봉 칸도 다른 금액 칸과 같은 규칙으로 읽는다: 한국어판은 숫자만 쓰면 만 원(큰 수는 원), 영어판은 원 */
    var mb = D.input.manBelow.annual, rule = EN ? { unit: 'won' } : { unit: 'man', manBelow: mb }, unit = $('u-find'), t = 0;
    function mark2(scroll) {
      rows.forEach(function (r) { r.classList.remove('me'); });
      var empty = !find.value.trim(), r = empty ? { ok: false } : P.parseMoney(find.value, rule);
      if (unit) unit.textContent = EN ? 'won' : !r.ok || !r.bare ? (empty || !r.ok ? '만 원' : '') : r.read === 'man' ? '만 원' : '원';
      invalid(find, !empty && (!r.ok || !r.value));
      if (empty) { read.textContent = ''; read.className = 'read'; return; }
      if (!r.ok || !r.value) { read.textContent = EN ? 'Could not read that amount.' : '금액을 읽지 못했어요.'; read.className = 'read err'; return; }
      var lo = +rows[0].dataset.a, hi = +rows[rows.length - 1].dataset.a;
      if (r.value < lo * 0.9 || r.value > hi * 1.05) { read.textContent = CFG.none.replace('{}', EN ? '₩' + P.fmt(r.value) : P.readKo(r.value)); read.className = 'read'; return; }
      var best = rows[0];
      rows.forEach(function (x) { if (Math.abs(+x.dataset.a - r.value) < Math.abs(+best.dataset.a - r.value)) best = x; });
      best.classList.add('me');
      read.textContent = CFG.readAs.replace('{}', EN ? '₩' + P.fmt(r.value) : P.readKo(r.value)); read.className = 'read';
      if (scroll) best.scrollIntoView({ block: 'center' });
    }
    find.addEventListener('input', function () { clearTimeout(t); mark2(false); t = setTimeout(function () { mark2(true); }, 700); });
    find.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(t); mark2(true); } });
  }
})();
