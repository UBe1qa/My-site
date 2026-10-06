/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다 (lumenlab 과 같은 방식).
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고(저장한 선택 > 브라우저 언어), 이 파일이 body 끝에서 글을 바꾼다.
   앱 본체(/app/)는 한국어 앱이라 바꾸지 않는다. */
(function () {
  var EN = {
    docTitle: 'SetNote · A workout log that keeps last time beside you',
    skip: 'Skip to content',
    brand: 'SetNote',
    brandLabel: 'SetNote home',
    navLabel: 'This page',
    navFeatures: 'Features',
    navInstall: 'Install',
    heroKicker: 'Workout log app',
    heroTitle: 'Log this set with last time <span class="nw">right beside it</span>',
    heroLead: 'Save your routines and bring them up at the gym. Last time’s weight and reps sit next to every set, so you know what to lift today without guessing.',
    open: 'Open SetNote',
    ctaNote: 'No sign-up · works in your phone’s browser (app is in Korean)',
    logLabel: 'Example of a SetNote log',
    example: 'Example',
    bench: 'Bench press',
    lastToday: 'Last time → Today',
    logCap: 'Highlighted cells are what you logged today',
    ftKicker: 'Features',
    ftTitle: 'Just what you need mid-workout',
    f1: 'Save your routines',
    f1d: 'Turn the workouts you repeat into a routine and load it in one tap. Or start from a suggested routine.',
    f2: 'Compare with last time',
    f2d: 'Last time’s weight and reps show beside every set, so you see right away whether you beat it.',
    f3: 'Rest between sets',
    f3d: 'Finish a set and the rest timer starts. You can turn on a sound for when it ends.',
    f4: 'Watch your log grow',
    f4d: 'Finished workouts stack up by date. See your best weight and estimated 1RM per exercise, plus this week’s volume and streak.',
    inKicker: 'Install and your data',
    inTitle: 'No App Store needed, <span class="nw">just your Home Screen</span>',
    inLead: 'SetNote opens in your browser. Open it on your phone and add it to your Home Screen: you get an app icon, and it opens even when the gym has no signal.',
    fact1: '<b>Add it to your Home Screen</b> and it opens offline',
    fact2: '<b>Your log stays on this device</b> and is never sent to a server',
    fact3: '<b>Backup files</b> let you export and import to move devices',
    endTitle: 'Start with today’s workout',
    nextK: 'Next set',
    nextT: 'More apps and tools from Lumen Lab, the makers of SetNote',
    madeBy: 'Made by',
    sole: 'Sole proprietorship',
    ask: 'Contact',
    lostTitle: 'This page doesn’t exist',
    lostText: 'The address may have changed. Head back to the SetNote page.',
    lostBack: 'Back to SetNote'
  };
  var d = document.documentElement;
  var KO = {}, KOA = {};
  var texts = document.querySelectorAll('[data-i18n]');
  var arias = document.querySelectorAll('[data-i18n-aria]');
  texts.forEach(function (el) { KO[el.getAttribute('data-i18n')] = el.innerHTML; });
  arias.forEach(function (el) { KOA[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });
  var btn = document.querySelector('[data-lang-toggle]');
  function apply(lang) {
    d.setAttribute('data-lang', lang); d.lang = lang;
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
  apply(d.getAttribute('data-lang') === 'en' ? 'en' : 'ko');
  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var l = d.getAttribute('data-lang') === 'en' ? 'ko' : 'en';
      try { localStorage.setItem('setnote-site:lang', l); } catch (e) {}
      apply(l);
    });
  }
})();
