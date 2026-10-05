/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다.
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고(저장한 선택 > 브라우저 언어), 이 파일이 body 끝에서 글을 바꾼다.
   방침·지원 페이지의 본문은 원래 문구 그대로 두고, 고른 언어의 칸(section#ko / #en)만 보여 준다(CSS). */
(function () {
  var EN = {
    docTitle: 'Lumen Lab · Owlight and SetNote support',
    skip: 'Skip to content',
    navLabel: 'Site',
    navContact: 'Contact',
    h1a: 'The makers of',
    h1b: 'Owlight and SetNote',
    lead: 'About our apps, plus Owlight’s support page and privacy policy. Can’t find your answer? Email us.',
    appsLabel: 'Apps by Lumen Lab',
    owlKind: 'Menu bar app for Mac <span aria-hidden="true">·</span> <span class="nw">macOS 14 or later</span>',
    owlStatus: 'Getting ready for the App Store',
    owlLine: 'Keep your Mac awake, cover the desktop, highlight the front-most window and more, right from the menu bar.',
    support: 'Support',
    privacy: 'Privacy Policy',
    snName: 'SetNote',
    snKind: 'Opens in your browser <span aria-hidden="true">·</span> <span class="nw">add it to your Home Screen</span>',
    snLine: 'Save your routines and log every set with last time’s weight and reps beside it.',
    snOpen: 'Open SetNote',
    snMore: 'What it does',
    dcName: 'Daycount',
    dcLine: 'Days between dates, countdowns, business days excluding holidays, age and anniversaries.',
    dcShort: 'Daycount',
    navTools: 'Tools',
    heroTools: 'We also make free web tools, no sign-up needed',
    tlKicker: 'Free web tools',
    tlTitle: 'Open it, use it, <span class="nw">done</span>',
    tlLead: 'No sign-up, nothing to install. Everything runs in your browser, and each tool has its own address under <span class="nw">lumenlab.page</span>.',
    toolsLabel: 'Free web tools by Lumen Lab',
    tlNext: 'New tools will <span class="nw">show up here</span>',
    owlTitle: 'Five switches in your menu bar',
    owlLead: 'No Dock icon. It collects no personal data and never connects to the internet.',
    panelLabel: 'Example of the Owlight menu',
    example: 'Example',
    f1: 'Nightwatch', f1d: 'Keep your Mac from sleeping',
    f2: 'Curtain', f2d: 'Cover desktop icons and widgets',
    f3: 'Halo', f3d: 'Front-most window sharp, the rest dimmed',
    f4: 'Scenes', f4d: 'Switch several features on at once',
    f5: 'Focus Session', f5d: 'Focus for a set time, get a note when it ends',
    snKicker: 'SetNote',
    snTitle: 'Log this set with last time right beside it',
    fact1: '<b>Save your routines</b> and bring them up at the gym',
    fact2: '<b>Add it to your Home Screen</b> and it opens even offline',
    fact3: '<b>Your log stays on this device</b>, and a backup file moves it',
    logLabel: 'Example of a SetNote log',
    bench: 'Bench press',
    lastToday: 'Last time → Today',
    logCap: 'Highlighted cells are what you logged today',
    ctTitle: 'Something not working? Let us know by email',
    ctLead: 'Tell us which app, your device and version, and what happened. It helps us help you faster.',
    ctBtn: 'Write an email',
    sole: 'Sole proprietorship',
    openApp: 'Open app',
    crumbSupport: 'Support',
    crumbPrivacy: 'Privacy Policy',
    nfTitle: 'This page doesn’t exist',
    nfText: 'The address may have changed or been mistyped. Please pick an app again.',
    nfHome: 'Back to apps',
    nfMail: 'Email us'
  };
  var d = document.documentElement;
  var KO = {}, KOA = {};
  var texts = document.querySelectorAll('[data-i18n]');
  var arias = document.querySelectorAll('[data-i18n-aria]');
  texts.forEach(function (el) { KO[el.getAttribute('data-i18n')] = el.innerHTML; });
  arias.forEach(function (el) { KOA[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });
  var btn = document.querySelector('[data-lang-toggle]');

  function apply(lang) {
    d.setAttribute('data-lang', lang);
    d.lang = lang;
    texts.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = lang === 'en' && EN[k] != null ? EN[k] : KO[k];
      if (el.innerHTML !== v) el.innerHTML = v;
    });
    arias.forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', lang === 'en' && EN[k] != null ? EN[k] : KOA[k]);
    });
    if (btn) {
      btn.innerHTML = lang === 'en' ? '<span lang="ko">한국어</span>' : '<span lang="en">English</span>';
      btn.setAttribute('aria-label', lang === 'en' ? '한국어로 보기' : 'View in English');
    }
  }
  function choose(lang) {
    try { localStorage.setItem('lumen:lang', lang); } catch (e) {}
    apply(lang);
  }

  apply(d.getAttribute('data-lang') === 'en' ? 'en' : 'ko');
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () { choose(d.getAttribute('data-lang') === 'en' ? 'ko' : 'en'); });
  }
  /* 방침·지원 페이지의 '한국어 / English' 이동 줄은 언어 고르기로 */
  document.querySelectorAll('.doc-head nav a[href="#ko"], .doc-head nav a[href="#en"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      choose(a.getAttribute('href').slice(1));
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });
  /* 주소 끝이 #ko·#en이면 그 언어로 (예전 링크 호환) */
  if (location.hash === '#ko' || location.hash === '#en') apply(location.hash.slice(1));
})();
