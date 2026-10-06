/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다.
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고(저장한 선택 > 브라우저 언어), 이 파일이 body 끝에서 글을 바꾼다.
   방침·지원 페이지의 본문은 원래 문구 그대로 두고, 고른 언어의 칸(section#ko / #en)만 보여 준다(CSS). */
(function () {
  var EN = {
    docTitle: 'Lumen Lab · Apps and free web tools',
    skip: 'Skip to content',
    navLabel: 'Site',
    navContact: 'Contact',
    h1a: 'We make small apps',
    h1b: 'and web tools',
    lead: 'Apps you keep on your device, and free web tools you just open and use. Support pages and privacy policies for our apps live here too.',
    navApps: 'Apps',
    navTools: 'Tools',
    shelvesLabel: 'What Lumen Lab makes',
    appsLabel: 'Apps by Lumen Lab',
    toolsLabel: 'Free web tools by Lumen Lab',
    apKicker: 'Apps',
    apTitle: 'Apps you keep <span class="nw">and use every day</span>',
    tlKicker: 'Web tools',
    tlTitle: 'Free tools you just <span class="nw">open and use</span>',
    tlLead: 'No sign-up, nothing to install. Each tool has its own address <span class="nw">(e.g. date.lumenlab.page)</span>.',
    sh_apps: 'Apps',
    sh_tools: 'Web tools',
    ftApps: 'Apps',
    ftTools: 'Web tools',
    support: 'Support',
    privacy: 'Privacy Policy',
    snOpen: 'Open SetNote',
    /* 아래 gen 사이는 _dev/build_home.py 가 catalog.json 에서 채운다 */
    /* gen:start */
    sh_apps_n: "2 apps",
    sh_apps_names: "Owlight · SetNote",
    sh_tools_n: "2 tools",
    sh_tools_names: "Daycount · Inplace",
    c_owlight_kind: "Menu bar app for Mac <span aria-hidden=\"true\">·</span> <span class=\"nw\">macOS 14 or later</span>",
    c_owlight_name: "Owlight",
    c_owlight_status: "Getting ready for the App Store",
    c_owlight_line: "Keep your Mac awake, cover the desktop, highlight the front-most window and more, right from the menu bar.",
    c_owlight_l0: "What it does",
    c_owlight_l1: "Support",
    c_owlight_l2: "Privacy Policy",
    c_setnote_kind: "Opens in your browser <span aria-hidden=\"true\">·</span> <span class=\"nw\">add it to your Home Screen</span>",
    c_setnote_name: "SetNote",
    c_setnote_line: "Save your routines and log every set with last time’s weight and reps beside it.",
    c_setnote_l0: "Open SetNote",
    c_setnote_l1: "What it does",
    c_daycount_line: "Days between dates, countdowns, business days excluding holidays, age and anniversaries.",
    c_daycount_name: "Daycount",
    c_inplace_line: "Video to MP3, image and HEIC conversion, PDF merge and split, CSV and Excel, all in your browser with no upload.",
    c_inplace_name: "Inplace",
    f_owlight: "Owlight",
    f_setnote: "SetNote",
    f_daycount: "Daycount",
    f_inplace: "Inplace",
    backHome: "Back to Lumen Lab",
    /* gen:end */
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
