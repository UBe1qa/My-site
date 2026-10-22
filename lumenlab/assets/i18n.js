/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다.
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고(저장한 선택 > 브라우저 언어), 이 파일이 body 끝에서 글을 바꾼다.
   방침·지원 페이지의 본문은 원래 문구 그대로 두고, 고른 언어의 칸(section#ko / #en)만 보여 준다(CSS). */
(function () {
  var EN = {
    docTitle: 'Lumen Lab · Games, apps and free web tools',
    metaDesc: 'Lumen Lab is a one-person software studio. We make games, apps and 11 free web tools you can use with no sign-up (Daycount, Scientific Calculator, Takehome Korea, Inplace, Staycode, Onesheet, Kankan, Pickboard, Todok, Oneturn and Checkbench), and show how each tool calculates and how we checked it.',
    brandLabel: 'Lumen Lab home',
    skip: 'Skip to content',
    navLabel: 'Site',
    navWorks: 'Work',
    navContact: 'Contact',
    navAbout: 'About',
    /* 홈(랜딩) */
    heroKick: 'Lumen Lab, a workshop with the lights on',
    h1: '<span class="hw" data-k="1">Games</span>, <span class="hw" data-k="0">apps</span> and <span class="hw" data-k="2">web tools</span>, made by one person',   // .hw = 첫 화면 이웃 창(0 앱, 1 게임, 2 웹 도구)에 불이 켜지면 같이 켜지는 낱말
    heroSub: 'Games for phones, apps for Mac and the browser. The free web tools need no sign-up or install, and what you put in never goes to a Lumen Lab server.',
    heroTry: 'Try the free web tools',
    heroCta: 'Step inside',
    wlKick: 'Inside the workshop',
    mailBtn: 'Email us',
    enKick: 'By the workshop window',
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
    f_scicalc: "Scientific Calculator",
    f_takehome: "Takehome Korea",
    f_inplace: "Inplace",
    f_staycode: "Staycode",
    f_onesheet: "Onesheet",
    f_kankan: "Kankan",
    f_pickboard: "Pickboard",
    f_todok: "Todok",
    f_oneturn: "Oneturn",
    f_checkbench: "Checkbench",
    fi_chickrescue_n: "Chick Rescue",
    wl_chickrescue_w: "Sort puzzle to rescue chicks",
    wl_chickrescue_s: "Getting ready for launch",
    fi_castleup_n: "Castle Up!",
    wl_castleup_w: "Idle defense with a hero on every floor",
    wl_castleup_s: "Play-testing",
    wl_games_h: "Games",
    wl_games_l: "Games for your phone, getting ready for Android first.",
    fi_owlight_n: "Owlight",
    wl_owlight_w: "Keeps your Mac awake, hides the desktop",
    wl_owlight_s: "Getting ready for the App Store",
    fi_setnote_n: "SetNote",
    wl_setnote_w: "Workout log with last time beside it",
    wl_setnote_s: "Available now",
    wl_apps_h: "Apps",
    wl_apps_l: "Apps for the Mac and the browser.",
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
    fi_staycode_n: "Staycode",
    wl_staycode_w: "QR code maker",
    wl_staycode_p: "Every code is read back",
    fi_onesheet_n: "Onesheet",
    wl_onesheet_w: "Printable calendars and holidays",
    wl_onesheet_p: "Every weekday 1900–2100 tested",
    fi_kankan_n: "Kankan",
    wl_kankan_w: "Character counter",
    wl_kankan_p: "35,000+ automatic tests",
    wl_g_docs_h: "Text and files",
    wl_g_docs_l: "Convert files, make QR codes, print calendars and count text.",
    fi_pickboard_n: "Pickboard",
    wl_pickboard_w: "Wheel, ladder and team picker",
    wl_pickboard_p: "Chi-square tested on 100,000 draws",
    fi_todok_n: "Todok",
    wl_todok_w: "Korean and English typing practice",
    wl_todok_p: "Publishes how speed is counted",
    fi_oneturn_n: "Oneturn",
    wl_oneturn_w: "Timer, stopwatch and world clock",
    wl_oneturn_p: "Each city checked with zoneinfo",
    fi_checkbench_n: "Checkbench",
    wl_checkbench_w: "Keyboard, mouse and mic tests",
    wl_checkbench_p: "Shows the rule beside each result",
    wl_g_play_h: "Groups, practice, time and devices",
    wl_g_play_l: "Pick fairly, practice typing, time things and test your gear.",
    wlTitle: "15 things we make. <span class=\"nw\">Open one to try it</span>",
    wlLead: "The web tools run their real calculations right in the window, and the games and apps show real screens. The ✓ line under each tool is what it checks and discloses.",
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
