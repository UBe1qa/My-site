/* 한국어·영어 전환. 한국어는 HTML에 그대로 있고, 영어만 여기 모아 둔다(문구는 앱 프로젝트의 랜딩 키트 영어판(랜딩-문구-en.md)과 앱스토어 영어 설명을 따름).
   <head>의 짧은 스크립트가 html[data-lang]을 먼저 정해 두고, body 끝(defer 없이)에서 이 파일이 글·스크린숏을 바꾼다.
   한국어 글을 고치면 여기 영어도 같이 고친다. */
(function () {
  var EN = {
    docTitle: 'Owlight · Your Mac’s quiet night watch',
    skip: 'Skip to content',
    brandLabel: 'Owlight home',
    navLabel: 'On this page',
    navFeatures: 'Features',
    navScenes: 'Scenes',
    navFaq: 'FAQ',
    navSupport: 'Support',
    privacy: 'Privacy Policy',
    heroKicker: 'Menu bar app for Mac',
    heroTitle: 'Your Mac’s <span class="nw">quiet night watch</span>',
    heroLead: 'A small owl in your menu bar keeps your Mac awake, hides a busy desktop, and keeps light on the window you’re using. Switch each on by itself, or all at once with a Scene.',
    heroCta: 'Try a Scene below',
    status: 'Getting ready for the Mac App Store',
    heroMeta: '<span class="nw">US$5.99, one-time purchase</span> <span aria-hidden="true">·</span> <span class="nw">macOS 14 or later</span> <span aria-hidden="true">·</span> <span class="nw">English and Korean</span> <span aria-hidden="true">·</span> <span class="nw">No data collected</span>',
    heroAlt: 'The Owlight menu panel with the Presenting scene on: Nightwatch and Curtain are switched on and a large clock fills the desktop.',
    heroCap: 'After clicking the Presenting scene: the Mac stays awake and a Curtain with a clock covers the desktop.',
    nightwatch: 'Nightwatch',
    curtain: 'Curtain',
    halo: 'Halo',
    haTitle: 'Only your window <span class="nw">stays sharp</span>',
    ha1: 'Your current window stays crisp while the rest of the screen takes a tint or a blur. You choose the color and the strength.',
    ha2: 'Keep up to five recent windows bright, handy on wide screens.',
    ha3: 'Halo stays out of the way in full screen and when you swipe between Spaces.',
    haAlt: 'Halo on: the settings window in front stays bright while the note windows behind it are dimmed',
    ctTitle: 'A calm desktop <span class="nw">in one click</span>',
    ct1: 'Draws a curtain over your desktop icons. Your open windows stay on top as usual, on every connected display.',
    ct2: 'Choose slowly drifting Aurora gradients (six palettes), ten calm scenery pictures, frosted glass, a solid color or your own picture.',
    ct3: 'Add an optional large clock and a short note, like “Back in five” or the title of your talk.',
    ct4: 'It can come up on its own when meeting or streaming apps open.',
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
    nw1: 'Keep your Mac from sleeping for 15 minutes to 4 hours, or until you switch it off. Choose whether the display stays on too.',
    nw2: 'It can switch itself on while the charger is connected, while chosen apps run, or on a weekday schedule.',
    nw3: 'It steps back when the battery drops below the level you set.',
    nwNote: 'Stops automatic sleep only. Closing the lid or choosing Sleep still puts your Mac to sleep.',
    nwAlt: 'Nightwatch settings: default duration, keep display on, battery guard and the battery level to stop at',
    scKicker: 'Scenes',
    scTitle: 'One Scene, <span class="nw">every switch</span>',
    scLead: 'Presenting, Deep Focus, Screen Share, Movie Night. One click switches on what you need, another switches it off. Try one.',
    scNote: 'Rename them, change what they switch on, or build your own.',
    scGroup: 'Built-in Scenes',
    scPresent: 'Presenting',
    scFocus: 'Deep Focus',
    scShare: 'Screen Share',
    scMovie: 'Movie Night',
    on: 'On',
    off: 'Off',
    scCap: 'These are the app’s defaults. Click the active Scene again and all three switch off.',
    moTitle: 'Faster with <span class="nw">timers and shortcuts</span>',
    ssTitle: 'Focus Sessions that keep score',
    ssText: 'Pick a length; your chosen features switch on and off with the countdown. A soft chime and a notification tell you when time is up, and you can see today’s focused minutes and finished sessions at a glance.',
    ssAlt: 'The menu panel during a Focus Session: 24:54 left, 95 minutes focused today',
    hkTitle: 'Shortcuts and links, your way',
    hkText: 'Set global keyboard shortcuts for every feature, Scene and Focus Session. From Shortcuts, launchers and scripts, use a link like this.',
    hkAlt: 'Shortcut settings: a shortcut field for Nightwatch, Curtain, Halo, Focus Session and each Scene',
    pvTitle: 'Everything stays <span class="nw">on this Mac</span>',
    pv1: 'No account, no analytics, no ads, no network access. Your settings never leave your Mac.',
    pv2: 'Runs inside the Mac App Store sandbox. No Accessibility or Screen Recording permission needed.',
    pvLink: 'Read the full Privacy Policy',
    faqTitle: 'Questions',
    q1: 'Is it a subscription?',
    a1: 'No. Buy it once for US$5.99. There is no subscription and no in-app purchase. The App Store shows the price in your local currency, set by Apple.',
    q2: 'Which Macs does it run on?',
    a2: 'macOS 14 Sonoma or later. It lives in the menu bar, so there is no Dock icon. Available in English and Korean.',
    q3: 'Which permissions does it need?',
    a3: 'No Accessibility or Screen Recording permission. Halo looks only at window positions and sizes, never at window titles or screen contents. It may ask for notification permission if you use notifications.',
    q4: 'Does my Mac stay awake with the lid closed?',
    a4: 'No. Nightwatch stops automatic sleep only. Closing the lid, choosing Sleep, a very low battery or overheating still put a Mac to sleep, and a schedule can’t wake a sleeping Mac.',
    q5: 'I can’t see the owl in the menu bar.',
    a5: 'The notch or a crowded menu bar may be hiding it. Open Owlight again to get its settings window, where every feature can be switched on and off.',
    q6: 'When can I get it?',
    a6: 'We are getting it ready for the Mac App Store. When it is out, the App Store link will be right here on this page.',
    q7: 'More questions?',
    a7: 'The <a href="https://lumenlab.page/owlight/support/">support page</a> has more on using Owlight and fixing problems. You can also email <a href="mailto:woxocoso@gmail.com">woxocoso@gmail.com</a>.',
    endTitle: 'Getting ready for <span class="nw">the Mac App Store</span>',
    endLead: 'Buy it once for US$5.99. When it is out, the App Store link will be right here.',
    lumenLine: 'Owlight is one light Lumen Lab has switched on',
    lumenGo: 'See our other apps and tools →',
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
