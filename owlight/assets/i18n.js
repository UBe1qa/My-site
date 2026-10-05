/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다(문구는 앱 저장소 docs/APPSTORE.md 영어판을 따름).
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고, body 끝(defer 없이)에서 이 파일이 글·스크린숏을 바꾼다.
   한국어 글을 고치면 여기 영어도 같이 고친다. */
(function () {
  var EN = {
    docTitle: 'Owlight · Keep your Mac awake, hide the desktop, light up your window',
    skip: 'Skip to content',
    brandLabel: 'Owlight home',
    navLabel: 'On this page',
    navFeatures: 'Features',
    navScenes: 'Scenes',
    navFaq: 'FAQ',
    navSupport: 'Support',
    privacy: 'Privacy Policy',
    heroKicker: 'Menu bar app for Mac <span aria-hidden="true">·</span> <span class="nw">macOS 14 or later</span>',
    heroTitle: 'One click, and your Mac is <span class="nw">ready to present</span>',
    heroLead: 'Owlight keeps your Mac awake, covers the desktop with a calm backdrop and a clock, and dims the windows behind the one you are using. Group the combinations you use into Scenes and switch them on at once from the menu bar.',
    heroCta: 'Try a Scene below',
    status: 'Getting ready for the App Store',
    heroAlt: 'The Owlight menu panel with the Presenting scene on: Nightwatch and Curtain are switched on and a large clock fills the desktop.',
    heroCap: 'After clicking the Presenting scene: the Mac stays awake and a Curtain with a clock covers the desktop.',
    whyTitle: 'Three small Mac annoyances, <span class="nw">taken care of</span>',
    whyQ1: 'Your Mac falls asleep during a talk or a long download',
    whyQ2: 'Sharing your screen shows every file on your desktop',
    whyQ3: 'With lots of windows open, you lose the one you are working in',
    whyA1: 'keeps your Mac awake for as long as you want',
    whyA2: 'puts a calm backdrop and a clock over the desktop',
    whyA3: 'dims or blurs everything except your current window',
    nightwatch: 'Nightwatch',
    curtain: 'Curtain',
    halo: 'Halo',
    nwTitle: 'Keeps your Mac awake <span class="nw">only while you need it</span>',
    nw1: 'Pick 15 minutes to 4 hours, or leave it on until you switch it off. Choose whether the display stays on too.',
    nw2: 'Switches itself on while the charger is connected, while apps you picked are running, or on a weekday schedule.',
    nw3: 'Battery guard stops it when the charge drops below the level you set (for example 20%).',
    nwNote: 'It stops automatic sleep only. Closing the lid or choosing Sleep still puts your Mac to sleep.',
    nwAlt: 'Nightwatch settings: default duration, keep display on, battery guard and the battery level to stop at',
    ctTitle: 'When you share your screen, <span class="nw">they see the Curtain</span>',
    ct1: 'Show a large clock and a short line of text (for example “Back in five” or the title of your talk).',
    ct2: 'Covers only the desktop and its icons; your open windows stay on top as usual. Works on every connected display.',
    ct3: 'Choose slowly drifting Aurora gradients in six palettes, ten calm scenery pictures, frosted glass, a solid color or a picture of your own.',
    ct4: 'Can come up on its own when you open a meeting or streaming app.',
    ctNote: 'The ten scenery pictures were made with an AI image generator. The night mountains in the background of the screenshots on this page are one of them.',
    ctAlt: 'Curtain on the desktop: an Aurora gradient with a large clock, the date and the note “Back in five”',
    haTitle: 'Only your window <span class="nw">stays sharp</span>',
    ha1: 'The rest of the screen takes a tint or a blur. You choose the color and the strength.',
    ha2: 'On wide screens you can keep a few recent windows bright too (up to five).',
    ha3: 'Let apps you pick opt out, and choose whether it covers every display.',
    haAlt: 'Halo on: the settings window in front stays bright while the note windows behind it are dimmed',
    scTitle: 'Pick a Scene and <span class="nw">the switches follow</span>',
    scLead: 'Four Scenes are ready from the start. Tap one to see what it switches on.',
    scNote: 'Rename them, change what they switch on, or add your own.',
    scGroup: 'Built-in Scenes',
    scPresent: 'Presenting',
    scFocus: 'Deep Focus',
    scShare: 'Screen Share',
    scMovie: 'Movie Night',
    on: 'On',
    off: 'Off',
    scCap: 'These are the app’s defaults. Click the active Scene again and all three switch off.',
    moTitle: 'Faster with <span class="nw">timers and shortcuts</span>',
    ssTitle: 'Focus Session: on for as long as you set',
    ssText: 'Start a countdown and the features you picked switch on, then off again when it ends. When time is up a soft chime and a notification let you know, and today’s focused minutes and finished sessions are kept.',
    ssAlt: 'The menu panel during a Focus Session: 24:54 left, 95 minutes focused today',
    hkTitle: 'Shortcuts and links: no menu needed',
    hkText: 'Set global keyboard shortcuts for every feature, Scene and Focus Session. From Shortcuts or scripts, use a link like this.',
    hkAlt: 'Shortcut settings: a shortcut field for Nightwatch, Curtain, Halo, Focus Session and each Scene',
    pvTitle: 'Everything stays <span class="nw">on this Mac</span>',
    pv1: 'No account, no analytics, no ads, no network access. Your settings never leave your Mac.',
    pv2: 'Runs inside the App Store’s security sandbox and never asks for Screen Recording or Accessibility permission.',
    pvLink: 'Read the full Privacy Policy',
    faqTitle: 'Questions',
    q1: 'Does my Mac stay awake with the lid closed?',
    a1: 'No. Nightwatch stops automatic sleep only. Closing the lid, choosing Sleep, a very low battery or overheating still put a Mac to sleep, and a schedule can’t wake a sleeping Mac.',
    q2: 'Which permissions does it need?',
    a2: 'No Accessibility or Screen Recording permission. Halo looks only at window positions and sizes, never at window titles or screen contents. Owlight may ask for notification permission so it can tell you when Nightwatch ends.',
    q3: 'Which Macs does it run on?',
    a3: 'macOS 14 Sonoma or later. It lives in the menu bar, so there is no Dock icon. Available in English and Korean.',
    q4: 'What if I can’t see the owl in the menu bar?',
    a4: 'A notch or a crowded menu bar can hide it. Every feature can also be switched from the Settings window, and opening Owlight again while it runs brings that window up.',
    q5: 'When can I get it?',
    a5: 'We are getting it ready for the App Store. When it is out, the App Store link will be right here on this page.',
    q6: 'More questions?',
    a6: 'The <a href="https://lumenlab.page/owlight/support/">support page</a> has more on using Owlight and fixing problems. You can also email <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.',
    endTitle: 'Getting ready <span class="nw">for the App Store</span>',
    endLead: 'When it is out, the App Store link will be right here.',
    footMaker: 'Owlight is made by <a href="https://lumenlab.page/" class="nw">Lumen Lab</a>, a sole proprietorship in Korea.',
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
    /* 스크린숏: 앱 화면이 언어마다 따로 있다(/img/ko-… ↔ /img/en-…) */
    document.querySelectorAll('img[data-shot]').forEach(function (img) {
      var re = /\/img\/(ko|en)-/g, to = '/img/' + l + '-';
      img.src = img.getAttribute('src').replace(re, to);
      if (img.getAttribute('srcset')) img.setAttribute('srcset', img.getAttribute('srcset').replace(re, to));
    });
    document.querySelectorAll('source[data-shot]').forEach(function (s) {
      s.setAttribute('srcset', s.getAttribute('srcset').replace(/\/img\/(ko|en)-/g, '/img/' + l + '-'));
    });
    root.setAttribute('data-lang', l); root.lang = l;
    var b = document.querySelector('[data-lang-btn]');
    if (b) { b.textContent = l === 'en' ? '한국어' : 'English'; b.setAttribute('lang', l === 'en' ? 'ko' : 'en'); }
  };
  if (lang === 'en') apply('en');
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
