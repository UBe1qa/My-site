/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다.
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고(저장한 선택 > 브라우저 언어), 이 파일이 body 끝에서 글을 바꾼다.
   방침·지원 페이지의 본문은 원래 문구 그대로 두고, 고른 언어의 칸(section#ko / #en)만 보여 준다(CSS). */
(function () {
  var EN = {
    docTitle: 'Lumen Lab · Games, apps and free web tools',
    metaDesc: 'Lumen Lab is a one-person software studio. We make games, apps and 11 free web tools you can use with no sign-up (Daycount, Scientific Calculator, Takehome Korea, Inplace, Kankan, Onesheet, Staycode, Pickboard, Checkbench, Todok and Oneturn), and show how each tool calculates and how we checked it.',
    brandLabel: 'Lumen Lab home',
    skip: 'Skip to content',
    navLabel: 'Site',
    navWorks: 'Work',
    navContact: 'Contact',
    navAbout: 'About',
    /* 홈(랜딩) */
    eyebrow: 'A one-person studio for games, apps and free web tools',
    h1: '<span class="lm"><span>Small software</span></span> <span class="lm"><span>that shows its work</span></span>',
    lead: 'Free web tools for take-home pay, file conversion, spin wheels and more. No sign-up.',
    allOn: 'Lights on',
    allOff: 'Lights off',
    hint: 'Drag the light, or tap a line',
    tabsLabel: 'Things to look inside',
    ex: 'Example',
    t1: 'Takehome', t2: 'Inplace', t3: 'Pickboard', t4: 'Chick Rescue', tab4: 'Chick',
    s1o1: 'Ministry of Employment severance example',
    s1big: '₩88,641<small>.31</small>',
    s1o3: 'Average daily wage',
    s1i1: 'Matches the ministry’s example',
    s1st: 'Same',
    s1i3: 'Each rate lists source and check date',
    s2o1: 'Convert a photo',
    s2o3: 'Done · 1 file',
    s2i1: 'Files never leave this browser',
    s2st: 'On device',
    s2i3: 'Lumen Lab has no upload server',
    s3o1: 'Who buys coffee today',
    n1: 'Mia', n2: 'Leo', n3: 'Ava', n4: 'Sam',
    s3o3: 'The result can be shared as a link',
    s3i1: 'Each draw uses the browser’s secure RNG',
    s3st: 'Fair',
    s3i3: 'Chi-square tested over 100,000 draws',
    s4o1: 'Chick Rescue',
    s4ex: 'Coming soon',
    s4o2: 'Tube sort puzzle',
    s4o3: 'Android first',
    s4i1: 'Works with no internet',
    s4i2: '1,440<small> levels</small>',
    s4st: 'Free',
    s4i3: 'No account; progress stays on the phone',
    c1: 'Korean take-home pay and severance',
    c2: 'Image, video and PDF converter',
    c3: 'Wheel, ladder and team picker',
    c4: 'Puzzle game for phones · Coming soon',
    capTry: 'Try it here',
    capSee: 'Preview the game',
    mailBtn: 'Email us',
    enTitle: 'Found a mistake? <span class="nw">One email and we fix it</span>',
    enLead: 'Tell us which tool, your device and browser, and what you entered, and we can check it quickly.',
    enAbout: 'About Lumen Lab',
    bcKind: 'Sole proprietorship · Korea',
    bcMail: 'Email',
    bcTel: 'Phone',
    bcTelN: '+82-70-8098-5263',
    ftGames: 'Games',
    ftApps: 'Apps',
    ftTools: 'Web tools',
    /* 아래 gen 사이는 _dev/build_home.py 가 catalog.json 에서 채운다 */
    /* gen:start */
    ftLumen: "Lumen Lab",
    ftWorks: "Everything we make",
    ftAbout: "About",
    ftPrivacy: "Privacy Policy",
    ftContact: "Contact",
    ftAppPrivacy: "App privacy policies",
    f_chickrescue: "Chick Rescue",
    f_castleup: "Castle Up!",
    f_owlight: "Owlight",
    f_setnote: "SetNote",
    f_daycount: "Daycount",
    f_inplace: "Inplace",
    f_scicalc: "Scientific Calculator",
    f_onesheet: "Onesheet",
    f_pickboard: "Pickboard",
    f_kankan: "Kankan",
    f_checkbench: "Checkbench",
    f_todok: "Todok",
    f_takehome: "Takehome Korea",
    f_staycode: "Staycode",
    f_oneturn: "Oneturn",
    fi_chickrescue_n: "Chick Rescue",
    wl_chickrescue_w: "Sort puzzle to rescue chicks",
    wl_chickrescue_s: "Getting ready for launch",
    fi_castleup_n: "Castle Up!",
    wl_castleup_w: "Idle defense with a hero on every floor",
    wl_castleup_s: "Play-testing",
    fi_owlight_n: "Owlight",
    wl_owlight_w: "Keeps your Mac awake, hides the desktop",
    wl_owlight_s: "Getting ready for the App Store",
    fi_setnote_n: "SetNote",
    wl_setnote_w: "Workout log with last time beside it",
    wl_setnote_s: "Available now",
    wl_games_h: "Games and apps",
    wl_games_l: "Phone games, Android first, and apps for the Mac and the browser.",
    wl_kick: "Web tools",
    fi_daycount_n: "Daycount",
    wl_daycount_w: "Days between dates, age and business days",
    wl_daycount_p: "Checked against 3,200+ answers",
    fi_scicalc_n: "Scientific Calculator",
    wl_scicalc_w: "Scientific functions and physical constants",
    wl_scicalc_p: "Checked against 3,700+ answers",
    fi_takehome_n: "Takehome Korea",
    wl_takehome_w: "Korean take-home pay and severance",
    wl_takehome_p: "Matches the ministry’s example",
    wl_g_calc_h: "Calculate",
    wl_g_calc_l: "Dates, numbers and pay, worked out with every step shown.",
    fi_inplace_n: "Inplace",
    wl_inplace_w: "Image, video and PDF converter",
    wl_inplace_p: "Files never leave your browser",
    fi_onesheet_n: "Onesheet",
    wl_onesheet_w: "Printable calendars and holidays",
    wl_onesheet_p: "Every weekday 1900–2100 tested",
    fi_kankan_n: "Kankan",
    wl_kankan_w: "Character counter",
    wl_kankan_p: "35,000+ automatic tests",
    fi_staycode_n: "Staycode",
    wl_staycode_w: "QR code maker",
    wl_staycode_p: "Every code is read back",
    wl_g_docs_h: "Text and files",
    wl_g_docs_l: "Count text, convert files and print calendars.",
    fi_pickboard_n: "Pickboard",
    wl_pickboard_w: "Wheel, ladder and team picker",
    wl_pickboard_p: "Chi-square tested on 100,000 draws",
    fi_checkbench_n: "Checkbench",
    wl_checkbench_w: "Keyboard, mouse and mic tests",
    wl_checkbench_p: "Shows the rule beside each result",
    fi_todok_n: "Todok",
    wl_todok_w: "Korean and English typing practice",
    wl_todok_p: "Publishes how speed is counted",
    fi_oneturn_n: "Oneturn",
    wl_oneturn_w: "Timer, stopwatch and world clock",
    wl_oneturn_p: "Each city checked with zoneinfo",
    wl_g_play_h: "Devices, time, practice and groups",
    wl_g_play_l: "Test your gear, time things, practice typing and pick fairly.",
    wlTitle: "15 things we make. <span class=\"nw\">Tap one to try it</span>",
    wlLead: "The web tools run their real calculations right in the window, and the games and apps show real screens. The ✓ line under each tool is what it checks and discloses.",
    ctaWorks: "See all 15 things we make",
    /* gen:end */
    sole: 'Sole proprietorship',
    crumbSupport: 'Support',
    crumbPrivacy: 'Privacy Policy',
    nfTitle: 'This page doesn’t exist',
    nfText: 'The address may have changed or been mistyped. Please pick again from the Lumen Lab home.',
    nfHome: 'Lumen Lab home',
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
    document.querySelectorAll('[data-href-en]').forEach(function (a) {   // 영어일 때 다른 주소로 가는 링크(404의 홈 단추)
      if (!a.hasAttribute('data-href-ko')) a.setAttribute('data-href-ko', a.getAttribute('href'));
      a.setAttribute('href', a.getAttribute(lang === 'en' ? 'data-href-en' : 'data-href-ko'));
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
