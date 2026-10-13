/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다(문구는 앱 프로젝트의 랜딩 키트 영어판(랜딩-문구-en.md)과 앱스토어 영어 설명을 따름).
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고, body 끝(defer 없이)에서 이 파일이 글·스크린숏을 바꾼다.
   한국어 글을 고치면 여기 영어도 같이 고친다. */
(function () {
  var EN = {
    docTitle: 'Owlight · A quiet night watch for you',
    skip: 'Skip to content',
    brandLabel: 'Owlight home',
    navLabel: 'On this page',
    navFeatures: 'Features',
    navPrice: 'Price',
    navFaq: 'FAQ',
    navSupport: 'Support',
    privacy: 'Privacy Policy',
    heroKicker: 'Menu bar app for macOS',
    heroTitle: 'A quiet night watch <span class="nw">for you</span>',
    heroLead: 'Ever scrambled to tidy your desktop right before a talk? Click the little owl in your menu bar: your computer stays awake, a messy desktop disappears, and only the window you’re using stays sharp.',
    status: 'Getting ready for the Mac App Store',
    heroMeta: '<span class="nw">US$5.99, one-time purchase</span> <span aria-hidden="true">·</span> <span class="nw">macOS 14 or later</span> <span aria-hidden="true">·</span> <span class="nw">No data collected</span>',
    file1: 'Contract.pdf',
    file2: 'Screenshot.png',
    file3: 'Notes.txt',
    file4: 'New Folder',
    file5: 'Photo.jpg',
    file6: 'Quote.pdf',
    winBack: 'Notes',
    winFront: 'Slides',
    awake: 'Awake',
    nightwatch: 'Nightwatch',
    curtain: 'Curtain',
    halo: 'Halo',
    scTry: 'Try a Scene',
    scPresent: 'Presenting',
    scFocus: 'Deep Focus',
    scShare: 'Screen Share',
    scMovie: 'Movie Night',
    demoNote: 'A preview drawn for the web. <a href="#features">The real app screens</a> are just below.',
    ftTitle: 'What it looks like <span class="nw">in the real app</span>',
    haShort: 'Dims the other windows',
    ctShort: 'Hides desktop files',
    nwShort: 'Stops automatic sleep',
    haTitle: 'Only your window <span class="nw">stays sharp</span>',
    ha1: 'Your current window stays crisp while the rest of the screen takes a tint or a blur. You choose the color and the strength.',
    ha2: 'Keep up to five recent windows bright, handy on wide screens.',
    ha3: 'Halo stays out of the way in full screen and when you swipe between Spaces.',
    haAlt: 'Halo on: the settings window in front stays bright while the note windows behind it are dimmed',
    ctTitle: 'A calm desktop <span class="nw">in one click</span>',
    ct1: 'Draws a curtain over your desktop icons. Your open windows stay on top as usual, on every connected display.',
    ct2: 'Choose slowly drifting Aurora gradients (six palettes), ten calm scenery pictures, frosted glass, a solid color or your own picture.',
    ct3: 'Add an optional large clock and a short note, like “Back in five” or the title of your talk.',
    ctAlt: 'Curtain on the desktop: an Aurora gradient with a large clock, the date and the note “Back in five”',
    sgTitle: 'The ten scenery pictures inside Curtain',
    sg1: 'Misty green hills',
    sg2: 'A lake at dusk',
    sg3: 'A mountain ridge under the night sky',
    sg4: 'Sand dunes',
    sg5: 'A sea in the fog',
    sg6: 'A forest in the fog',
    sg7: 'Rose paper waves',
    sg8: 'Teal paper hills',
    sg9: 'A snowy plain',
    sg10: 'Tea terraces in the mist',
    ctNote: 'The ten scenery pictures were made with an AI image generator. They ship inside the app; the app itself does not generate images.',
    nwTitle: 'Awake exactly <span class="nw">when it should be</span>',
    nw1: 'Keep your computer from sleeping for 15 minutes to 4 hours, or until you switch it off. Choose whether the display stays on too.',
    nw2: 'It steps back on its own when the battery drops below the level you set.',
    nwAlt: 'Nightwatch settings: default duration, keep display on, battery guard and the battery level to stop at',
    limTitle: 'It stops automatic sleep only',
    lim1: 'Closing the lid or choosing Sleep still puts the computer to sleep.',
    lim2: 'So does a very low battery or overheating.',
    lim3: 'A schedule can’t wake a computer that is already asleep.',
    auTitle: 'Set it once, <span class="nw">and it switches itself</span>',
    auLead: 'It can act on its own when the charger is connected, while chosen apps run, or on a weekday schedule.',
    example: 'Example',
    d1t: '9:00 AM',
    d1w: 'When the weekday schedule starts',
    d1a: 'Nightwatch switches on',
    d2t: '10:30 AM',
    d2w: 'When a meeting app opens',
    d2a: 'Curtain comes down',
    d3t: '2:00 PM',
    d3w: 'When a 25-minute Focus Session starts',
    d3a: 'Halo switches on, and off when it ends',
    d4t: '5:40 PM',
    d4w: 'When the battery drops below 20%',
    d4a: 'Nightwatch steps back on its own',
    ssTitle: 'Focus Sessions that keep score',
    ssText: 'Pick a length; your chosen features switch on and off with the countdown. A notification tells you when time is up, and you can see today’s focused minutes and finished sessions at a glance.',
    ssAlt: 'The menu panel during a Focus Session: 24:54 left, 95 minutes focused today',
    hkTitle: 'One shortcut when you want it now',
    hkText: 'Set global keyboard shortcuts for every feature, Scene and Focus Session. From Shortcuts, launchers and scripts, use a link like this.',
    hkAlt: 'Shortcut settings: a shortcut field for Nightwatch, Curtain, Halo, Focus Session and each Scene',
    copy: 'Copy',
    copied: 'Copied',
    pvTitle: 'Everything stays <span class="nw">on this device</span>',
    pvLead: 'It runs inside the Mac App Store sandbox, and your settings never leave your device.',
    pvLink: 'Read the full Privacy Policy',
    no1: 'No account',
    no1d: 'No sign-up, no sign-in.',
    no2: 'No network access',
    no2d: 'It never connects to the internet.',
    no3: 'No analytics, no ads',
    no3d: 'What you switch on isn’t sent anywhere.',
    no4: 'No Accessibility or Screen Recording permission',
    no4d: 'Halo looks only at window positions and sizes, never at window titles or screen contents.',
    prTitle: 'Buy once, and that’s it',
    prSub: 'No subscription, no in-app purchases',
    prKrw: 'The App Store shows the price in your local currency, set by Apple.',
    pf1: 'What you get',
    pf1d: 'Nightwatch, Curtain and Halo, four built-in Scenes, Focus Sessions, global shortcuts and owlight:// links, ten scenery pictures',
    pf2: 'What you need',
    pf2d: 'macOS 14 Sonoma or later. Available in English and Korean.',
    pf3: 'Where to buy',
    pf3d: 'The App Store in 148 countries and regions. Not yet sold in the European Union.',
    pf4: 'Trial and refunds',
    pf4d: 'There is no free trial. Refund requests for App Store purchases go to Apple.',
    faqTitle: 'Questions',
    q1: 'Does it stay awake with the lid closed?',
    a1: 'No. Nightwatch stops automatic sleep only. Closing the lid, choosing Sleep, a very low battery or overheating still put the computer to sleep, and a schedule can’t wake a sleeping computer.',
    q2: 'Does it work with several displays?',
    a2: 'Yes. Curtain covers every connected display. For Halo you choose whether it works on all displays, and you can turn it off for certain apps.',
    q3: 'I can’t see the owl in the menu bar.',
    a3: 'The notch or a crowded menu bar may be hiding it. Open Owlight again to get its settings window, where every feature can be switched on and off. There is no Dock icon.',
    q4: 'When can I get it?',
    a4: 'We are getting it ready for the Mac App Store. When it is out, the App Store link will be right here on this page.',
    q5: 'More questions?',
    a5: 'The <a href="/support/">support page</a> has more on using Owlight and fixing problems. You can also email <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.',
    endTitle: 'Getting ready for <span class="nw">the Mac App Store</span>',
    endLead: 'When it’s out, the App Store link will be right here. Until then, the support page shows how it works.',
    endBtn: 'See how it works',
    lumenLine: 'Owlight is one light Lumen Lab has switched on',
    lumenGo: 'See our other apps and tools →',
    footMaker: 'Owlight is made by <a href="https://lumenlab.page/" class="nw">Lumen Lab</a>, a sole proprietorship in Korea.',
    crumbSupport: 'Support',
    crumbPrivacy: 'Privacy Policy',
    lostTitle: 'This page doesn’t exist',
    lostText: 'The address may have changed. Head back to the Owlight page.',
    lostBack: 'Go to Owlight'
  };
  var root = document.documentElement;
  var lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'ko';
  var KO = {};
  var apply = function (l) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (!(k in KO)) KO[k] = el.tagName === 'TITLE' ? el.textContent : el.innerHTML;
      var v = l === 'en' ? EN[k] : KO[k];
      if (v == null) return;
      if (el.tagName === 'TITLE') el.textContent = v; else el.innerHTML = v;
    });
    [['data-i18n-alt', 'alt'], ['data-i18n-aria', 'aria-label']].forEach(function (pair) {
      document.querySelectorAll('[' + pair[0] + ']').forEach(function (el) {
        var k = el.getAttribute(pair[0]), store = pair[1] + ':' + k;
        if (!(store in KO)) KO[store] = el.getAttribute(pair[1]);
        var v = l === 'en' ? EN[k] : KO[store];
        if (v != null) el.setAttribute(pair[1], v);
      });
    });
    /* 스크린숏: 앱 화면이 언어마다 따로 있다(/img/ko-… ↔ /img/en-…). 처음 열 때 영어는 머리말 스크립트가 이미 바꿔 둠.
       값이 같으면 다시 넣지 않는다(넣기만 해도 그림을 다시 고른다) */
    document.querySelectorAll('[data-shot]').forEach(function (el) {
      ['src', 'srcset'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (!v) return;
        var w = v.replace(/\/img\/(ko|en)-/g, '/img/' + l + '-');
        if (w !== v) el.setAttribute(a, w);
      });
    });
    /* 루멘랩 본페이지는 한국어 / 와 영어 /en/ 이 따로 된 페이지: 고른 언어 쪽으로.
       지원·방침(/support/, /privacy/)은 한 주소에 두 언어라 영어면 #en 을 붙여 영어 칸이 열리게 */
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href').replace(/#(ko|en)$/, '');
      if (h === 'https://lumenlab.page/' || h === 'https://lumenlab.page/en/') a.setAttribute('href', 'https://lumenlab.page/' + (l === 'en' ? 'en/' : ''));
      else if (h === '/support/' || h === '/privacy/') a.setAttribute('href', h + (l === 'en' ? '#en' : ''));
    });
    root.setAttribute('data-lang', l); root.lang = l;
    try { document.dispatchEvent(new CustomEvent('owlight:lang', { detail: l })); } catch (e) {}
    var b = document.querySelector('[data-lang-btn]');
    if (b) { b.textContent = l === 'en' ? '한국어' : 'English'; b.setAttribute('lang', l === 'en' ? 'ko' : 'en'); }
  };
  if (lang === 'en') apply('en');
  root.classList.remove('i18n-wait');
  /* 지원·방침 페이지의 '한국어 / English' 단추: 그 언어 칸으로 바꾸고 기억한다 */
  document.querySelectorAll('.doc-head nav a[href="#ko"], .doc-head nav a[href="#en"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      lang = a.getAttribute('href').slice(1);
      try { localStorage.setItem('owlight:lang', lang); } catch (err) {}
      apply(lang);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });
  var btn = document.querySelector('[data-lang-btn]');
  if (btn) {
    btn.hidden = false;
    if (lang === 'ko') { btn.textContent = 'English'; btn.setAttribute('lang', 'en'); }
    btn.addEventListener('click', function () {
      lang = lang === 'en' ? 'ko' : 'en';
      try { localStorage.setItem('owlight:lang', lang); } catch (e) {}
      apply(lang);
    });
  }
})();
