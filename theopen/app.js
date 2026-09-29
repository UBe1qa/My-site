/* 더오픈 THE OPEN — 페이지 동작 (움직임은 motion.js)
   1) 스크롤하면 머리 막대 아래 선  3) 휴대폰 아래 막대 보이기/숨기기
   4) '영상 상담하기'·'개원/리뉴얼 상담 신청하기' → 상담 종류 미리 고르기  6) 공간마다 살필 것 (평면 표시)
   5) 상담 신청서 → 휴대폰: 문자·메일 앱으로 옮기기 / 컴퓨터: 적은 내용 복사(+메일 앱) — 사이트에 저장하지 않음 */
(function () {
  'use strict';
  var PHONE = '01026110157';
  var MAIL = 'lunar_23@naver.com';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var hasIO = 'IntersectionObserver' in window;

  /* 1) 머리 막대 */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

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

  /* 6) 공간마다 살필 것
     컴퓨터: 오른쪽 평면(따라 내려옴)에서 지금 읽는 공간을 칠해 보여 준다
     휴대폰: 평면을 칸마다 복사해 그 공간을 칠해 보여 준다 — 잘라 내면 벽이 끊겨 보여서 전체를 작게 (자바스크립트가 없으면 평면 하나가 그대로 보임) */
  var spaceFig = $('[data-space-fig]');
  var zones = $$('.zone[data-zone]');
  if (spaceFig && zones.length) {
    var plan = $('svg', spaceFig);
    zones.forEach(function (z) {
      var n = z.getAttribute('data-zone');
      var c = plan.cloneNode(true);
      c.removeAttribute('role');
      c.removeAttribute('aria-labelledby');
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('focusable', 'false');
      $$('title, desc', c).forEach(function (el) { el.parentNode.removeChild(el); });
      $$('[id]', c).forEach(function (el) { el.removeAttribute('id'); });
      $$('[data-z="' + n + '"]', c).forEach(function (el) { el.classList.add('is-on'); });
      var box = document.createElement('div');
      box.className = 'zone__crop';
      box.appendChild(c);
      z.appendChild(box);
    });
    var setZone = function (n) {
      zones.forEach(function (z) { z.classList.toggle('is-on', z.getAttribute('data-zone') === n); });
      $$('[data-z]', plan).forEach(function (el) { el.classList.toggle('is-on', el.getAttribute('data-z') === n); });
    };
    if (hasIO) {
      // 화면 가운데 줄에 걸린 칸을 '지금 읽는 공간'으로 본다
      var zio = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) setZone(e.target.getAttribute('data-zone')); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      zones.forEach(function (z) { zio.observe(z); });
    }
  }

  /* 5) 상담 신청서 */
  var form = $('#inquiry');
  if (!form) return;
  var status = $('[data-status]', form);
  var ua = navigator.userAgent || '';
  var isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  var touch = window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches;
  var lastText = '';

  // 휴대폰: [문자로 보내기] [이메일로 보내기]
  // 컴퓨터: [적은 내용 복사하기] [메일 앱으로 보내기] — 컴퓨터엔 메일 프로그램이 설정 안 된 경우가 많고
  //         (네이버 메일을 웹으로 쓰면 mailto가 설정 창만 띄움), 문자는 보낼 수 없어서 복사를 앞에 둔다
  if (!touch) {
    $('[data-via="sms"]', form).hidden = true;
    $('[data-via="copy"]', form).hidden = false;
    $('[data-mail-label]', form).textContent = '메일 앱으로 보내기';
    var note = $('[data-note]', form);
    if (note) note.textContent = '적으신 내용은 이 사이트에 저장되지 않습니다. 복사한 내용을 평소 쓰시는 메일에 붙여 넣어 ' + MAIL + '으로 보내 주세요.';
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

  function send(via) {
    lastText = compose();
    if (via === 'copy') {
      copy(lastText, function (ok) {
        say(ok ? ['복사했습니다. 평소 쓰시는 메일에서 받는 사람에 ' + MAIL + '을 넣고, 붙여 넣어 보내 주세요.']
               : ['복사가 되지 않았습니다. 적으신 내용을 ' + MAIL + '으로 직접 보내 주시거나 010-2611-0157로 전화 주세요.']);
      });
      return;
    }
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
  }

  // 버튼은 모두 type="button" (자바스크립트가 없을 때 적은 내용이 주소창에 실려 가지 않게)
  $$('[data-via]', form).forEach(function (b) {
    b.addEventListener('click', function () { send(b.getAttribute('data-via')); });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(touch ? 'sms' : 'copy'); });
})();
