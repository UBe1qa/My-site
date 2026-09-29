/* 더오픈 THE OPEN — 페이지 동작
   1) 스크롤하면 머리 막대 바탕 바꾸기  2) 동선 도면 점선 그리기  3) 휴대폰 아래 막대 보이기/숨기기
   4) '영상 상담하기' → 상담 종류 미리 고르기  5) 상담 신청서 → 문자·메일 앱으로 옮기기 (사이트에 저장하지 않음) */
(function () {
  'use strict';
  var PHONE = '01026110157';
  var MAIL = 'lunar_23@naver.com';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var hasIO = 'IntersectionObserver' in window;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) 머리 막대 */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 2) 동선 도면: 화면에 들어오면 점선이 입구부터 그려진다 */
  $$('[data-plan]').forEach(function (plan) {
    if (reduce || !hasIO) { plan.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { plan.classList.add('is-in'); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(plan);
  });

  /* 3) 휴대폰 아래 막대: 첫 화면을 지나면 보이고, 상담 칸·바닥글에선 숨긴다 */
  var bar = $('[data-mbar]');
  var hero = $('.hero');
  var ends = [$('#contact'), $('.site-footer')];
  if (bar && hasIO) {
    var heroVisible = true, endVisible = false;
    var endSeen = new Map();
    var update = function () { bar.classList.toggle('is-on', !heroVisible && !endVisible); };
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
    var endIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) { endSeen.set(e.target, e.isIntersecting); });
      endVisible = false;
      endSeen.forEach(function (v) { if (v) endVisible = true; });
      update();
    });
    ends.forEach(function (el) { if (el) endIO.observe(el); });
  } else if (bar) {
    bar.classList.add('is-on');
  }

  /* 4) 상담 종류 미리 고르기 */
  $$('[data-topic]').forEach(function (a) {
    a.addEventListener('click', function () {
      $$('input[name="topic"]').forEach(function (r) { r.checked = (r.value === a.getAttribute('data-topic')); });
    });
  });

  /* 5) 상담 신청서 */
  var form = $('#inquiry');
  if (!form) return;
  var status = $('[data-status]', form);
  var ua = navigator.userAgent || '';
  var isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  var touch = window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches;
  var lastText = '';

  // 컴퓨터에서는 메일 버튼을 앞에(진하게), 휴대폰에서는 문자 버튼을 앞에
  if (!touch) {
    var smsBtn = $('[data-via="sms"]', form), mailBtn = $('[data-via="mail"]', form);
    smsBtn.classList.replace('btn--ink', 'btn--line');
    mailBtn.classList.replace('btn--line', 'btn--ink');
    mailBtn.parentNode.insertBefore(mailBtn, smsBtn);
  }

  function compose() {
    var f = new FormData(form);
    var v = function (k) { return String(f.get(k) || '').trim(); };
    var lines = ['[더오픈 상담 신청]'];
    if (v('topic')) lines.push('상담: ' + v('topic'));
    if (v('budget')) lines.push('예산: ' + v('budget'));
    if (v('place')) lines.push('지역·평수: ' + v('place'));
    if (v('who')) lines.push('성함·한의원: ' + v('who'));
    if (v('memo')) lines.push('내용: ' + v('memo'));
    if (lines.length === 1) lines.push('상담을 받고 싶습니다.');
    lines.push('(더오픈 홈페이지에서 작성)');
    return lines.join('\n');
  }

  // 글자는 textContent로만 넣는다 (입력한 글이 HTML로 해석되지 않게)
  function say(parts) {
    status.textContent = '';
    parts.forEach(function (p) {
      if (typeof p === 'string') { status.appendChild(document.createTextNode(p)); return; }
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'linkbtn'; b.textContent = p.label;
      b.addEventListener('click', p.onClick);
      status.appendChild(b);
    });
    status.hidden = false;
  }

  function copy(text, done) {
    var ok = function () { done(true); }, fail = function () { done(false); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(ok, fail); return; }
    try {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var r = document.execCommand('copy'); document.body.removeChild(t);
      r ? ok() : fail();
    } catch (e) { fail(); }
  }

  var copyButton = {
    label: '적은 내용 복사',
    onClick: function (ev) {
      var btn = ev.currentTarget;
      copy(lastText, function (ok) { btn.textContent = ok ? '복사했어요' : '복사가 안 돼요 — 직접 적어 보내 주세요'; });
    }
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var via = (e.submitter && e.submitter.value) || (touch ? 'sms' : 'mail');
    lastText = compose();
    var url;
    if (via === 'sms') {
      url = 'sms:' + PHONE + (isApple ? '&' : '?') + 'body=' + encodeURIComponent(lastText);
      say(['문자 앱이 열리면 ‘보내기’만 누르세요. 열리지 않으면 ', copyButton, ' 후 010-2611-0157로 보내 주세요.']);
    } else {
      url = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('[더오픈] 상담 신청') + '&body=' + encodeURIComponent(lastText);
      say(['메일 앱이 열리면 ‘보내기’만 누르세요. 열리지 않으면 ', copyButton, ' 후 lunar_23@naver.com으로 보내 주세요.']);
    }
    // 문자·메일 앱 열기: 보통 링크를 누른 것과 같게 (보이지 않는 링크를 만들어 누름)
    var link = document.createElement('a');
    link.href = url; link.rel = 'noopener'; link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
})();
