/* 토독 도구 화면(속도 측정·자리 연습·문장 연습·영타). 로직은 tj-core.js·tj-store.js·tj-lessons.js 에 있고 여기는 화면 연결만 한다.
   화면 글자는 빌드가 페이지에 넣어 둔 #tj-cfg JSON 에서 읽는다(이 파일에는 언어별 문구를 두지 않는다).
   - 입력: 보이지 않는 입력칸(#trap) + composition 이벤트. 붙여 넣기는 막는다. 자판 글쇠 이벤트가 한 번도 안 보이면 터치 자판으로 보고 글자 단위로 잰다.
     자판에서는 지우기 키가 눌렸는지를, 터치 자판에서는 조합 중인 문자열의 길이를 로직(Session.update)에 같이 넘긴다.
   - 초점: 컴퓨터는 열자마자 치는 칸. 여백을 눌러도 초점을 지키고, 다른 곳에 있다가 치기 시작하면(한글 입력기가 켜진 키 포함) 치는 칸으로 온다.
     휴대폰은 글을 눌렀을 때만 치는 화면으로 간다(옵션을 고르는 것만으로는 가지 않는다).
   - 그리기는 가볍게: 글자 자리(줄·x·폭)는 글을 만들 때 한 번만 재 두고(TextLayer.measure), 키를 누를 때는 화면을 재지 않는다.
     지금 칠 자리는 밑줄 하나(.car)를 transform 으로 옮기고, 숫자는 값이 바뀐 것만 고친다. 결과 칸은 자리를 미리 잡아 둬서 화면이 밀리지 않는다.
   - 이펙트(누른 글자 번쩍임·단어 밑줄·콤보·키 조각·결과 연출·키 소리)는 assets/fx.js 가 한다. 여기서는 "무슨 일이 일어났는지"만 알려 준다.
     세기(끔·가볍게·화려하게)와 키 소리는 도구 아래 단추로 고르고 todok.set 의 'fx' 칸에 남는다. 동작 줄이기면 전부 안 움직인다. */
(function () {
  'use strict';
  var D = document, root = D.documentElement, cfgEl = D.getElementById('tj-cfg');
  if (!cfgEl || !window.TJ) return;
  var CFG = JSON.parse(cfgEl.textContent), S = CFG.S, H = TJ.hangul, P = TJ.pick;
  function $(id) { return D.getElementById(id); }
  function el(tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] == null ? '' : o[k]; }); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var storage = null;
  try { storage = window.localStorage; storage.getItem('todok.set'); } catch (e) { storage = null; }
  var store = new TJ.Store(storage);
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;
  /* 진단판: 주소 끝에 ?diag 를 붙이면 화면 위에 '이 기기에서 키 하나가 얼마나 걸리는지'를 숫자로 보여 준다(느리다는 기기에서 원인을 찾으려고).
     숫자만 재고 친 글은 보지 않는다. 아무 데도 보내지 않고 저장하지 않는다. 평소에는 꺼져 있고 아무 일도 하지 않는다 */
  var DG = /[?&]diag\b/.test(location.search) ? (function () {
    var box = D.createElement('pre'), t = D.createTextNode('');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;margin:0;padding:6px 8px;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;background:rgba(15,12,30,.88);color:#fff;white-space:pre-wrap;pointer-events:none;max-height:46vh;overflow:hidden';
    box.appendChild(t);
    var g = { ev: 0, ap: [], fr: [], kd: [], lt: [], who: {}, burst: 0, lastEv: 0, t0: 0 };
    function st(a) { if (!a.length) return '-'; var b = a.slice().sort(function (x, y) { return x - y; }), sum = 0; b.forEach(function (x) { sum += x; }); return (sum / b.length).toFixed(1) + ' / ' + b[Math.floor(b.length * 0.9)].toFixed(1) + ' / ' + b[b.length - 1].toFixed(1); }
    try {
      new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { g.lt.push(e.duration); var a = e.attribution && e.attribution[0], w = a ? (a.containerSrc || a.containerName || a.name || '?') : '?'; w = String(w).replace(/^https?:\/\//, '').slice(0, 40); g.who[w] = (g.who[w] || 0) + Math.round(e.duration); }); }).observe({ entryTypes: ['longtask'] });
    } catch (e) { /* 긴 작업을 못 재는 브라우저 */ }
    function draw() {
      var n = navigator, e = window.__E, ua = n.userAgent.replace(/Mozilla\/5\.0 |AppleWebKit\/[\d.]+ |\(KHTML, like Gecko\) |Safari\/[\d.]+/g, '').slice(0, 110), lt = 0;
      g.lt.forEach(function (x) { lt += x; });
      var who = Object.keys(g.who).sort(function (a, b) { return g.who[b] - g.who[a]; }).slice(0, 3).map(function (k) { return k + ' ' + g.who[k] + 'ms'; }).join(' | ');
      t.nodeValue = 'DIAG ' + ua + '\n' +
        'cores ' + (n.hardwareConcurrency || '?') + ' mem ' + (n.deviceMemory || '?') + ' dpr ' + (window.devicePixelRatio || 1) + ' view ' + window.innerWidth + 'x' + window.innerHeight + ' touch ' + (TOUCH ? 1 : 0) + '\n' +
        'mode ' + (e && e.session ? e.session.mode : '?') + ' phys ' + (e && e.phys ? 1 : 0) + ' defer ' + (e && e.defer ? 1 : 0) + ' fx ' + (FX ? FX.level : '-') + (FX && FX.auto ? '(auto)' : '') + ' typed ' + (e && e.session ? e.session.typedKeys : 0) + '\n' +
        'input events ' + g.ev + ' / draws ' + g.ap.length + ' / bursts(<8ms) ' + g.burst + '\n' +
        'draw ms avg/p90/max  ' + st(g.ap) + '\n' +
        'input->screen ms     ' + st(g.fr) + '  (n=' + g.fr.length + ')\n' +
        'key wait ms          ' + st(g.kd) + '  (n=' + g.kd.length + ')\n' +
        'long tasks ' + g.lt.length + ' total ' + Math.round(lt) + 'ms' + (who ? '  ' + who : '');
    }
    D.addEventListener('DOMContentLoaded', function () { D.body.appendChild(box); draw(); });
    if (D.body) { D.body.appendChild(box); }
    setInterval(draw, 700);
    return {
      ev: function () { var now = performance.now(); if (g.lastEv && now - g.lastEv < 8) g.burst++; g.lastEv = now; g.ev++; },
      ap: function (ms) { g.ap.push(ms); }, fr: function (ms) { g.fr.push(ms); }, kd: function (ms) { g.kd.push(ms); }, data: g
    };
  })() : null;
  var SPACE_GUARD = 1500;   /* 판이 끝난 뒤 이 시간(ms) 동안은 띄어쓰기로 쪽이 굴러가지 않는다 */
  var TEXT = window.TJ_TEXT[CFG.text], KO = CFG.text === 'ko';
  var PHYS = /^(Key|Digit|Space|Minus|Equal|Bracket|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)/;
  var SALT = (Date.now() % 100000) + 17;
  var FX = window.TJFX || null, AUTO = !!navigator.webdriver;   /* 자동 도구로 열 때는 '느린 기기' 판정을 하지 않는다(가짜 시계에서는 뜻이 없다) */
  /* 값이 바뀐 것만 고친다(같은 글자를 다시 써넣으면 그 칸의 배치를 다시 계산한다) */
  function setText(n, v) { v = String(v); if (n && n._t !== v) { n.textContent = v; n._t = v; } }
  function isSep(ch) { return ch === ' ' || ch === '\n'; }

  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function keyLabel(k) { return k === ' ' ? S.space : k === '\n' ? S.enter : k; }
  function allSentences() { return KO ? [].concat.apply([], Object.keys(TEXT.sentences).map(function (k) { return TEXT.sentences[k]; })) : TEXT.sentences; }

  /* ================= 엔진: 입력 · 시간 · 결과 ================= */
  function Engine(view) {
    var self = this, st = store.settings(CFG.page);
    this.view = view; this.trap = $('trap');
    this.kind = CFG.kinds && CFG.kinds.indexOf(st.kind) >= 0 ? st.kind : CFG.kind;
    this.mode = st.mode === 'count' && CFG.counts ? 'count' : 'time';
    this.secs = CFG.times && CFG.times.indexOf(st.secs) >= 0 ? st.secs : CFG.secs;
    this.count = CFG.counts && CFG.counts.indexOf(st.count) >= 0 ? st.count : (CFG.count || 0);
    this.punct = !!st.punct; this.nums = !!st.nums;
    this.topic = CFG.topics && CFG.topics.indexOf(st.topic) >= 0 ? st.topic : (CFG.topics ? CFG.topics[0] : null);
    this.lesson = CFG.tool === 'practice' ? Math.max(0, Math.min(4, st.lesson | 0)) : 0;
    this.passed = Array.isArray(st.passed) ? st.passed : [];
    this.round = 0; this.drill = null; this.same = false;
    this.timer = new TJ.Timer(function () { return performance.now(); });
    this.phys = false; this.composing = false; this.comp = ''; this.delKey = false; this.vlen = 0;
    /* 터치 자판: 입력 이벤트마다 바로 그리지 않고 다음 화면을 그릴 때 한 번, 가장 새 값으로만 그린다(defer).
       휴대폰 자판은 키 하나에 입력 이벤트를 여러 번 보내기도 하고, 기기가 느리면 이벤트가 밀려 쌓인다. 쌓인 것을 하나씩 다 그리면 더 밀린다 → 중간 것은 건너뛴다.
       자동 도구에서는 끈다(가짜 시계에서는 다음 화면이 오지 않는다). 시험은 __E.defer 를 켜고 진짜 시계로 따로 본다 */
    this.defer = TOUCH && !AUTO; this.pending = false; this.inAt = 0; this.nKey = 0; this.drawAt = 0; this.tickSec = -1;
    this.iv = 0; this.started = false; this.done = false; this.doneAt = 0;
    this.moreT = 0; this.lagWait = false;
    this.stage = D.querySelector('.stage'); this.bar = $('bar'); this.kCombo = $('k-combo'); this.kTime = $('k-time');
    this.recent = [];   /* 이 방문에서 이미 나온 문장(오래된 것부터). 저장하지 않는다. 다음 글을 고를 때 뒤로 미룬다 */
    this.parts = null;  /* 지금 글을 이루는 문장들(단어로 된 글이면 null) */
    var trap = this.trap;
    trap.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); if (!self.done || performance.now() - self.doneAt > 700) self.next(); return; }
      if (e.key === 'Escape') { e.preventDefault(); self.quit(); return; }
      if (self.done && e.key === 'Enter') { e.preventDefault(); if (performance.now() - self.doneAt > 700) self.primary(); return; }
      if (self.done && (e.key === ' ' || e.code === 'Space') && performance.now() - self.doneAt < SPACE_GUARD) { e.preventDefault(); return; }
      if (e.code && PHYS.test(e.code)) self.phys = true;
      /* 키가 눌린 때와 지금의 차이 = 이 키가 처리되기까지 기다린 시간. 길면 화면이 손을 못 따라가고 있다는 뜻이다 */
      if (self.started && !self.done && e.timeStamp > 0) { var kl = performance.now() - e.timeStamp; if (kl >= 0 && kl < 4000) { if (DG) DG.kd(kl); if (FX && !AUTO) FX.note(kl); } }
      /* 지우기 키가 눌렸는지 적어 둔다(조합 중에는 key 가 'Process' 라 code 도 본다). 다른 키가 눌리면 지워진다 */
      self.delKey = e.key === 'Backspace' || e.key === 'Delete' || e.code === 'Backspace' || e.code === 'Delete';
      if (/^(Arrow|Home|End|Page)/.test(e.key)) e.preventDefault();
      if (e.key === 'Enter' && !CFG.lines && !e.isComposing) e.preventDefault();
    });
    ['paste', 'drop', 'cut'].forEach(function (t) { trap.addEventListener(t, function (e) { e.preventDefault(); }); });
    trap.addEventListener('beforeinput', function (e) { if (/^(insertFromPaste|insertFromDrop|historyUndo|historyRedo)$/.test(e.inputType)) e.preventDefault(); });
    trap.addEventListener('compositionstart', function () { self.composing = true; self.comp = ''; });
    trap.addEventListener('compositionupdate', function (e) { self.comp = e.data || ''; });
    trap.addEventListener('compositionend', function () { self.composing = false; self.comp = ''; self.onInput(); });
    trap.addEventListener('input', function (e) { self.composing = !!e.isComposing; if (!self.composing) self.comp = ''; self.onInput(); });
    trap.addEventListener('focus', function () {
      root.classList.add('typing-focus'); root.classList.remove('t-blur');
      /* 휴대폰: 치는 동안에는 머리(메뉴)를 접어 글과 숫자만 남긴다. 누른 직후라 화면이 바뀌어도 '밀림'이 아니다 */
      if (TOUCH && !root.classList.contains('m-tall')) { root.classList.add('m-tall'); window.scrollTo(0, 0); }
    });
    trap.addEventListener('blur', function () { root.classList.remove('typing-focus'); root.classList.add('t-blur'); });
    D.addEventListener('visibilitychange', function () {
      if (!self.started || self.done) return;
      if (D.hidden) self.timer.pause(); else { self.timer.resume(); self.session.breakTiming(); self.barGo(); }
    });
    D.addEventListener('keydown', function (e) {
      /* 설정 팝업은 Esc 로 닫힌다(초점이 팝업 안에 있었으면 '설정' 단추로 돌려준다) */
      if (e.key === 'Escape' && e.target !== trap) { var mo = $('more'); if (mo && mo.open) { var inM = mo.contains(D.activeElement), sm = mo.querySelector('summary'); mo.open = false; if (inM && sm) sm.focus(); e.preventDefault(); return; } }
      if (e.target === trap || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target, tag = (t && t.tagName) || '';
      /* 치기 시작한 키: 글자 키, 또는 한글 입력기가 켜진 채 누른 키(key 가 'Process', keyCode 229 로 온다) */
      var typing = e.key === 'Process' || e.keyCode === 229 || e.isComposing || (!!e.key && e.key.length === 1 && e.key !== ' ');
      if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(tag)) {
        /* 설정을 바꾼 뒤 바로 치기 시작하면(고르기 단추·체크 칸에 초점이 남아 있다) 팝업을 닫고 치는 칸으로 */
        var pick = tag === 'BUTTON' || tag === 'SUMMARY' || (tag === 'INPUT' && t.type === 'checkbox');
        if (typing && pick && !self.done && t.closest('.opts, .steps, .c-opts')) { closeMore(); trap.focus({ preventScroll: true }); }
        return;
      }
      if (self.done && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); if (performance.now() - self.doneAt > 700) { if (e.key === 'Enter') self.primary(); else self.next(); } return; }
      /* 판이 끝난 직후에 치던 손이 누른 띄어쓰기가 쪽을 한 화면 굴려 결과가 사라지지 않게(시간이 끝나면 초점이 치는 칸에서 풀린다) */
      if (self.done && (e.key === ' ' || e.code === 'Space') && performance.now() - self.doneAt < SPACE_GUARD) { e.preventDefault(); return; }
      if (self.done) return;
      /* 다른 곳을 누른 뒤(Esc 로 나온 뒤) 그냥 치기 시작해도 치는 칸으로 간다 */
      if (typing) { trap.focus({ preventScroll: true }); return; }
      /* 치는 칸 밖에서 누른 띄어쓰기가 쪽을 한 화면 굴리지 않게(치는 판이 보이는 동안만) */
      if (e.key === ' ' && stageInView()) { e.preventDefault(); trap.focus({ preventScroll: true }); }
    });
    /* 컴퓨터: 여백이나 판의 빈 곳을 눌러도 치는 칸의 초점을 지킨다. 누르는 것과 읽는 글(글자를 골라 복사할 수 있게)은 그대로 둔다 */
    if (!TOUCH) D.addEventListener('mousedown', function (e) {
      var t = e.target;
      if (e.button !== 0 || D.activeElement !== trap || t === trap || !t.closest) return;
      if (e.clientX >= root.clientWidth || e.clientY >= root.clientHeight) return;   /* 쪽의 스크롤 막대는 건드리지 않는다 */
      if (t.closest('a, button, input, select, textarea, summary, label, .result, .prose, .sec, .records, .foot')) return;
      e.preventDefault();
    });
    this.reset();
    if (!TOUCH) trap.focus({ preventScroll: true });
  }
  Engine.prototype.textLang = function () { return CFG.text; };
  /* 같은 조건끼리만 기록을 견준다 */
  Engine.prototype.cond = function () {
    var len = CFG.tool === 'practice' ? 'L' + (this.lesson + 1) : CFG.tool === 'sentences' ? 'c' + this.count : this.mode === 'count' ? 'c' + this.count : 't' + this.secs;
    var kind = CFG.tool === 'practice' ? 'lesson' : CFG.tool === 'sentences' ? this.topic : this.kind;
    return { tool: CFG.tool, lang: CFG.text, kind: kind, len: len, punct: this.kind === 'words' && this.punct, nums: this.kind === 'words' && this.nums };
  };
  /* 문장으로 된 글의 재료 */
  Engine.prototype.pool = function () {
    if (CFG.tool === 'sentences') return this.topic === 'all' ? allSentences() : this.topic === 'proverbs' ? TEXT.proverbs : TEXT.sentences[this.topic];
    return this.kind === 'proverbs' ? TEXT.proverbs : this.kind === 'pangrams' ? TEXT.pangrams : allSentences();
  };
  /* 방금 낸 문장을 '최근에 나온 문장'에 적는다(다음 글에서 뒤로 미룬다) */
  Engine.prototype.note = function (parts) {
    var rc = this.recent;
    parts.forEach(function (x) { var i = rc.indexOf(x); if (i >= 0) rc.splice(i, 1); rc.push(x); });
    if (rc.length > 400) rc.splice(0, rc.length - 400);
    return parts;
  };
  /* 속담 사이의 띄어쓰기 자리. 화면에만 가운뎃점을 찍어 어디서 끊기는지 보여 준다(치는 글에는 넣지 않는다) */
  Engine.prototype.breaks = function () {
    var out = {}, at = 0, ps = this.parts;
    if (!ps || this.kind !== 'proverbs' || CFG.tool !== 'test') return out;
    for (var i = 0; i < ps.length - 1; i++) { at += H.toChars(ps[i]).length; out[at] = 1; at++; }
    return out;
  };
  Engine.prototype.seed = function () { return (P.crc32(CFG.text + ':' + CFG.tool + ':' + today()) + (this.round ? this.round * 7919 + SALT : 0)) >>> 0; };
  Engine.prototype.makeText = function () {
    var rand = P.rng(this.seed()), words = TEXT.words;
    this.parts = null;
    if (this.drill) {
      var pool = P.withKeys(words, this.drill).slice(0, 40);
      if (pool.length < 8) pool = pool.concat(P.shuffle(words, rand).slice(0, 12));
      return P.shuffle(pool, rand).slice(0, 14).join(' ');
    }
    if (CFG.tool === 'practice') return TJ.lessons.text(CFG.text, this.lesson, rand, TEXT);
    if (CFG.tool === 'sentences') return (this.parts = this.note(P.some(this.pool(), this.count, rand, this.recent))).join('\n');
    var need = Math.max(200, this.secs * 11), timed = this.mode === 'time';
    if (this.kind === 'words') {
      var n = timed ? Math.ceil(need / (KO ? 3.4 : 5.5)) : this.count;
      return P.words(words, n, rand, { lang: CFG.text, punct: this.punct, numbers: this.nums }).join(' ');
    }
    /* 한 판 안에서 같은 문장이 되풀이되지 않고, 최근 판에 나온 문장은 뒤로 밀린다 */
    this.parts = this.note(timed ? P.sentences(this.pool(), need, rand, this.recent) : P.some(this.pool(), Math.max(2, Math.round(this.count / 8)), rand, this.recent));
    return this.parts.join(' ');
  };
  Engine.prototype.limit = function () { return (this.drill || CFG.tool === 'practice' || CFG.tool === 'sentences' || this.mode === 'count') ? 0 : this.secs * 1000; };
  /* 진행 막대. 시간으로 재는 판은 남은 시간만큼 한 번에 채운다(초마다 고치지 않고 브라우저가 알아서 민다). 분량으로 재는 판은 키를 누를 때 고친다 */
  Engine.prototype.barSet = function (frac, glide) {
    var b = this.bar; if (!b) return;
    b.style.transition = glide ? 'transform ' + glide + 'ms linear' : 'none';
    b.style.transform = 'scaleX(' + frac + ')';
  };
  Engine.prototype.barGo = function () {
    var lim = this.limit(), b = this.bar; if (!b || !lim || !this.started || this.done) return;
    var ms = this.timer.elapsed();
    this.barSet(Math.min(1, ms / lim).toFixed(4), 0);
    if (REDUCED) return;                    /* 동작 줄이기: 0.2초마다 값만 고친다(tick) */
    void b.offsetWidth;                     /* 시작 값을 먼저 그리게 한다(판마다 한 번) */
    this.barSet(1, Math.max(0, Math.round(lim - ms)));
  };
  Engine.prototype.reset = function () {
    clearInterval(this.iv); this.iv = 0; clearTimeout(this.moreT); this.moreT = 0;
    this.timer.reset(); this.started = false; this.done = false; this.lastSec = 0; this.result = null;
    if (!this.same || !this.text) this.text = this.makeText();
    this.same = false;
    this.session = new TJ.Session(this.text, { soft: !!CFG.lines });
    this.T = this.session.T;
    this.trap.value = ''; this.vlen = 0; this.delKey = false; this.comp = ''; this.sig = null;
    root.classList.add('idle'); root.classList.remove('running', 'finished');
    if (FX) { FX.stopConfetti($('burst')); FX.reset(); }
    this.barSet(0, 0); this.lastLeft = -1;
    readable(this);
    this.view.onReset(this);
    this.view.render(this.session.cmp, this.live(), this);
  };
  Engine.prototype.save = function () {
    store.saveSettings(CFG.page, { kind: this.kind, mode: this.mode, secs: this.secs, count: this.count, punct: this.punct, nums: this.nums, topic: this.topic, lesson: this.lesson, passed: this.passed });
  };
  /* 다른 글로 다시(옵션을 바꿀 때도) */
  Engine.prototype.next = function (opt) {
    this.pending = false;
    opt = opt || {};
    this.round++; this.drill = opt.drill || null; this.same = !!opt.same;
    ['kind', 'mode', 'secs', 'count', 'punct', 'nums', 'topic', 'lesson'].forEach(function (k) { if (opt[k] != null) this[k] = opt[k]; }, this);
    if (opt.save !== false) this.save();
    this.reset();
    /* 휴대폰: 옵션을 고르는 것만으로는 치는 화면으로 넘어가지 않는다(이어서 다른 옵션을 고를 수 있게). 이미 치는 화면이면 그대로 이어 친다 */
    if (opt.focus !== false && (!TOUCH || root.classList.contains('m-tall'))) this.trap.focus({ preventScroll: true });
  };
  /* 결과 화면의 주 단추(Enter): 자리 연습에서 통과했으면 다음 단계 */
  Engine.prototype.primary = function () {
    if (CFG.tool === 'practice' && this.result && this.result.pass && this.lesson < 4 && !this.drill) this.next({ lesson: this.lesson + 1 });
    else this.next();
  };
  /* 그만하기(Esc, 휴대폰의 닫기): 처음 상태로 */
  Engine.prototype.quit = function () {
    this.pending = false;
    this.same = true; this.reset();
    this.trap.blur();
    if (root.classList.contains('m-tall')) { root.classList.remove('m-tall'); window.scrollTo(0, 0); }
  };
  Engine.prototype.live = function () {
    var ms = this.timer.elapsed(), s = this.session, lim = this.limit(), base = Math.max(ms, 1000);
    return {
      started: this.started, ms: ms,
      speed: this.started ? Math.round(TJ.calc.perMin(s.cmp.okStrokes, base)) : 0,
      wpm: this.started ? Math.round(TJ.calc.wpm(s.cmp.okChars, base)) : 0,
      acc: s.typedKeys ? Math.round(TJ.calc.accuracy(s.okKeys, s.typedKeys)) : null,
      left: lim ? Math.ceil(this.timer.left(lim) / 1000) : Math.floor(ms / 1000),
      frac: lim ? Math.min(1, ms / lim) : (this.T.chars.length ? Math.min(1, s.cmp.cursor / this.T.chars.length) : 0)
    };
  };
  /* 시간으로 재는 판에서 글이 모자라면 잇는다. 키를 처리하는 중이 아니라 그 바로 뒤(한가할 때)에 한다 */
  Engine.prototype.more = function () {
    var from = this.T.chars.length, rnd = P.rng(this.seed() + from), more;
    if (this.kind === 'words') more = P.words(TEXT.words, 40, rnd, { lang: CFG.text, punct: this.punct, numbers: this.nums }).join(' ');
    else { var mp = this.note(P.sentences(this.pool(), 200, rnd, this.recent)); this.parts = (this.parts || []).concat(mp); more = mp.join(' '); }
    this.session.extend(more); this.T = this.session.T;
    readable(this);
    this.view.onExtend(this, from);
    this.view.render(this.session.cmp, this.live(), this);
  };
  /* 방금 누른 키로 무슨 일이 일어났는지 이펙트에 알린다. b = 누르기 전의 값 */
  Engine.prototype.tell = function (b, r) {
    var s = this.session, dT = s.typedKeys - b.typed, dG = s.okKeys - b.ok, n = this.T.chars.length, st = r.st;
    if (!FX || !n) return;
    var at = Math.min(r.cursor, n - 1), hit = r.pendingAt >= 0 ? r.pendingAt : Math.max(0, Math.min(r.cursor - 1, n - 1));
    if (dT > 0) {
      if (dT > dG) FX.key(false, st[at] === TJ.BAD ? at : (at > 0 && st[at - 1] === TJ.BAD ? at - 1 : hit), s.combo);
      else FX.key(true, hit, s.combo);
      if (this.view.pressKey) this.view.pressKey(s.K[s.K.length - 1]);
    }
    if (s.combo !== b.combo) FX.combo(s.combo, b.combo, hit, this.kCombo);
    /* 단어 하나를 틀리지 않고 끝냈나: 방금 띄어쓰기를 맞게 쳤고 그 앞 단어가 전부 맞다 */
    if (dT > 0 && dT === dG && r.cursor > b.cursor && r.cursor >= 2) {
      var c = r.cursor - 1, ch = this.T.chars;
      if (isSep(ch[c]) && st[c] === TJ.OK) {
        var a = c - 1; while (a >= 0 && !isSep(ch[a]) && st[a] === TJ.OK) a--;
        if ((a < 0 || isSep(ch[a])) && c - 1 > a) FX.word(a + 1, c - 1);
      }
    }
  };
  Engine.prototype.onInput = function () {
    var self = this;
    if (DG) DG.ev();
    /* 시작하는 첫 입력과 자판(컴퓨터)은 바로 그린다. 터치 자판으로 치는 중에는 다음 화면을 그릴 때 한 번만 */
    if (!this.defer || !this.started || this.done || this.session.mode !== 'char') { this.inAt = 0; this.apply(); return; }
    this.inAt = performance.now();
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(function () { if (self.pending) { self.pending = false; self.apply(); } });
  };
  /* 미뤄 둔 입력이 있으면 지금 반영한다(판을 끝내거나 바꾸기 직전에) */
  Engine.prototype.flush = function () { if (this.pending) { this.pending = false; this.apply(); } };
  Engine.prototype.apply = function () {
    var trap = this.trap, v = trap.value, self = this, t0 = this.inAt || performance.now(), a0 = DG ? performance.now() : 0;
    this.inAt = 0;
    if (this.done) { trap.value = ''; return; }
    if (!this.started) {
      if (!v) return;
      /* 자판 글쇠가 한 번도 안 보였으면 터치 자판으로 보고, 글자가 끝날 때 판정한다 */
      if (!this.phys) { this.session = new TJ.Session(this.text, { mode: 'char', soft: !!CFG.lines }); this.T = this.session.T; }
      this.start();
    }
    /* 자판: 이 변화가 지우기 키 때문인지 알려 준다(값이 길어졌으면 지우기가 아니다). 터치 자판: 조합 중인 문자열의 글자 수를 알려 준다 */
    var s = this.session, touch = s.mode === 'char', del = this.delKey && v.length <= this.vlen;
    /* 같은 값으로 두 번 불리면(조합이 끝날 때 compositionend 와 input 이 같은 글을 들고 온다) 두 번째는 할 일이 없다 */
    var hold = touch && this.composing ? Array.from(this.comp).length : 0, sig = hold + ':' + v;
    if (sig === this.sig) return;
    this.sig = sig;
    var before = { typed: s.typedKeys, ok: s.okKeys, combo: s.combo, cursor: s.cmp.cursor };
    var r = s.update(v, t0, touch ? { hold: hold } : { del: del });
    if (!this.composing && r.value !== v) trap.value = r.value;
    this.vlen = trap.value.length;
    /* 시간으로 재는 판: 남은 글이 140자 아래로 내려가면 이 키를 다 그린 뒤에 이어 붙인다 */
    if (this.limit() && !this.moreT && this.T.chars.length - r.cursor < 140) this.moreT = setTimeout(function () { self.moreT = 0; if (self.started && !self.done) self.more(); }, 0);
    showHint(r.hint);
    this.view.render(r, this.live(), this);
    if (!this.limit()) this.barSet(this.live().frac.toFixed(4), REDUCED ? 0 : 200);
    this.tell(before, r);
    /* 터치 자판은 마지막 글자 판정을 미루므로 '지금 끝난 것으로 보면 다 쳤나'로 본다(마지막 글자를 조합하는 중이어도 다 쳤으면 끝). 마지막 단어를 치는 중일 때만 따져 본다 */
    this.drawAt = performance.now();
    if (DG) DG.ap(performance.now() - a0);
    if (r.complete || (touch && r.open && r.open.w === this.T.words.length - 1 && s.wouldComplete())) { this.finish(); return; }
    /* 느린 기기 알아채기: 입력을 받은 때부터 그다음 화면이 나오기까지. 키마다 재면 재는 것 자체가 화면을 한 번씩 더 그리게 하므로 여섯 번에 한 번만 잰다 */
    if ((DG || (FX && !AUTO && FX.level > 0)) && !this.lagWait && ++this.nKey % 6 === 0) {
      this.lagWait = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { self.lagWait = false; var lag = performance.now() - t0; if (DG) DG.fr(lag); if (FX && !AUTO) FX.note(lag); }); });
    }
  };
  Engine.prototype.start = function () {
    var self = this;
    this.started = true; this.timer.start();
    root.classList.remove('idle'); root.classList.add('running');
    this.barGo();
    if (FX) FX.start();
    /* 0.2초마다: 숫자만 고친다(글은 키를 누를 때만 다시 칠한다) */
    this.iv = setInterval(function () {
      var ms = self.timer.elapsed(), sec = Math.floor(ms / 1000), lim = self.limit();
      while (self.lastSec < sec) { self.lastSec++; self.session.sample(self.lastSec); }
      if (lim && ms >= lim) { self.finish(); return; }
      var live = self.live();
      /* 숫자는 키를 누를 때마다 고쳐진다. 방금(0.3초 안) 키를 그렸으면 초가 바뀔 때만 다시 쓴다(치는 동안 화면을 덜 그린다) */
      if (performance.now() - self.drawAt > 300 || sec !== self.tickSec) { self.tickSec = sec; self.view.tick(live, self); }
      if (lim && REDUCED) self.barSet(live.frac.toFixed(4), 0);
      /* 남은 5초: 시간 키가 초마다 한 번 눌린다 */
      if (lim && live.left <= 5 && live.left > 0 && live.left !== self.lastLeft) { self.lastLeft = live.left; if (FX) FX.tick(self.kTime); }
    }, 200);
  };
  Engine.prototype.finish = function () {
    if (this.pending) { this.flush(); if (this.done) return; }
    clearInterval(this.iv); this.iv = 0;
    var lim = this.limit(), ms = lim ? Math.min(this.timer.elapsed(), lim) : this.timer.elapsed();
    this.timer.pause();
    this.done = true; this.doneAt = performance.now();
    clearTimeout(this.moreT); this.moreT = 0;
    this.barSet((lim ? Math.min(1, ms / lim) : this.live().frac).toFixed(4), 0);
    var res = this.session.finish(ms), last = Math.max(1, Math.ceil(ms / 1000));
    if (!res.samples.length || res.samples[res.samples.length - 1].t < last) res.samples.push({ t: last, net: res.strokes, typed: res.typedKeys, miss: res.typedKeys - res.okKeys });
    var rep = TJ.report(res), by = this.session.byKey;
    res.rep = rep;
    res.unit = KO || CFG.ui === 'ko' ? 'ko' : 'en';          /* 큰 숫자: 한국어 화면은 타/분, 영어 화면은 WPM */
    res.v = res.unit === 'ko' ? rep.speed : rep.wpm;
    /* 자리 연습 통과: 정확도 95% 이상(반올림하기 전 값으로). 기준 바로 아래 값(94.87%)이 95%로 보이지 않게 그때만 소수 한 자리로 적는다 */
    var okAcc = CFG.tool === 'practice' && TJ.lessons.pass(rep.ok, rep.typed);
    res.pass = okAcc && this.session.cmp.complete;
    rep.accText = rep.accuracy == null ? '–' : (CFG.tool === 'practice' && !okAcc && rep.accuracy >= TJ.lessons.PASS_ACC) ? rep.accuracy1.toFixed(1) : String(rep.accuracy);
    showHint(null);
    this.trap.value = '';
    /* 기록: 이 기기에만. '틀린 키만 연습'은 최근·최고 기록에 넣지 않는다 */
    res.cmp = null;
    if (!this.drill && rep.strokes > 0) {
      var c = this.cond();
      res.cmp = store.addRun({ cond: TJ.Store.cond(c), v: res.v, unit: res.unit, acc: rep.accuracy, secs: rep.secs, at: Date.now(), tool: c.tool, lang: c.lang, kind: c.kind, len: c.len });
    }
    store.addKeys(CFG.text, Object.keys(by).map(function (k) { return { key: k, miss: by[k].miss, hit: by[k].hit }; }));
    if (res.pass && this.passed.indexOf(this.lesson) < 0) { this.passed.push(this.lesson); this.save(); }
    this.result = res;
    root.classList.remove('running', 'idle'); root.classList.add('finished');
    if (FX) FX.reset();
    this.view.render(this.session.cmp, this.live(), this);
    this.view.onFinish(res, rep, this);
    renderRecords(this);
    if (TOUCH) this.trap.blur();
  };

  /* ================= 그리기 도우미 ================= */
  /* 글자 줄(TextLayer): 글자마다 span 을 만들고, 자리(줄·x·폭)를 한 번 재 둔 뒤, 키를 누를 때는 바뀐 글자의 색과 밑줄 자리만 고친다.
     - 단어는 줄 끝에서 갈라지지 않게 묶는다(.w). 띄어쓰기 칸은 앞 단어 묶음의 끝에 붙인다(줄이 띄어쓰기로 시작하지 않게).
     - 자리를 다시 재는 때: 글을 새로 만들었을 때, 이어 붙였을 때(새 글자만), 칸의 폭이 바뀌었을 때, 글꼴이 늦게 왔을 때. 키를 누를 때는 재지 않는다.
     - 지금 칠 자리 = 밑줄 하나(.car). 같은 줄 안에서는 미끄러지고 줄이 바뀌면 바로 옮긴다. 줄이 넘어가면 글 덩어리를 위로 민다(keep = 위에 남길 줄 수). */
  function TextLayer(box, opt) {
    opt = opt || {};
    var self = this;
    this.box = box; this.keep0 = opt.keep || 0; this.keep = this.keep0; this.scrolls = opt.scroll !== false;
    this.stage = box.closest('.stage'); this.joltEl = opt.jolt || box.parentNode; this.slotRight = !!opt.slotRight; this.slotDy = opt.slotDy || 36;
    this.under = el('span', 'fxu'); this.car = el('i', 'car');
    this.spans = []; this.base = []; this.chars = []; this.prev = new Uint8Array(0);
    this.from = 0; this.to = 0; this.cur = -1; this.pend = -1; this.y = 0; this.line = -1; this.glide = false; this.lastW = null;
    this.X = new Float32Array(0); this.W = new Float32Array(0); this.L = new Int16Array(0); this.cy = []; this.lh = 1; this.ch = 0; this.ox = 0; this.oy = 0;
    this.stale = true; this.vw = -1; this.raf = 0;
    var redo = function () {
      self.stale = true;
      if (!self.raf) self.raf = requestAnimationFrame(function () { self.raf = 0; if (self.cur >= 0) self.place(self.cur); });
    };
    if (window.ResizeObserver) new ResizeObserver(function (es) { var w = Math.round(es[0].contentRect.width) + ':' + Math.round(es[0].contentRect.height); if (self.vw !== -1 && w !== self.vw) redo(); self.vw = w; }).observe(box.parentNode);
    if (D.fonts && D.fonts.addEventListener) D.fonts.addEventListener('loadingdone', redo);
    if (FX) FX.attach(this);
  }
  TextLayer.prototype._spans = function (chars, from, to, brk, marks, frag) {
    var w = this.lastW;
    for (var i = from; i < to; i++) {
      var ch = chars[i], s = D.createElement('span');
      if (ch === ' ' || ch === '\n') { this.base[i] = marks && marks[i] ? 'sp brk' : 'sp'; s.textContent = ' '; (w || frag).appendChild(s); w = null; if (brk && ch === '\n') frag.appendChild(D.createElement('br')); }
      else { if (!w) { w = D.createElement('span'); w.className = 'w'; frag.appendChild(w); } this.base[i] = 'c'; s.textContent = ch; w.appendChild(s); }
      s.className = this.base[i];
      this.spans[i] = s;
    }
    this.lastW = w;
  };
  /* brk = 줄바꿈 글자 뒤에서 실제로 줄을 바꾼다(문장 연습에서 줄을 나눠 볼 때) */
  TextLayer.prototype.build = function (chars, from, to, brk, marks) {
    var frag = D.createDocumentFragment(), box = this.box;
    this.chars = chars; this.from = from || 0; this.to = to == null ? chars.length : to;
    this.spans = []; this.base = []; this.lastW = null; this.prev = new Uint8Array(chars.length);
    this._spans(chars, this.from, this.to, brk, marks, frag);
    box.textContent = ''; box.appendChild(this.under); box.appendChild(frag); box.appendChild(this.car);
    this.cur = -1; this.pend = -1; this.line = -1; this.stale = true;
    if (this.scrolls && this.y) { box.style.transform = ''; }
    this.y = 0;
  };
  /* 글을 이어 붙인다: 새 글자만 만들고 새 글자만 잰다(앞 글자의 자리는 그대로다) */
  TextLayer.prototype.append = function (chars, start, marks) {
    var frag = D.createDocumentFragment(), prev = new Uint8Array(chars.length);
    prev.set(this.prev); this.prev = prev; this.chars = chars;
    /* 이어 붙인 첫 칸(띄어쓰기)은 앞 단어 묶음의 끝에 넣는다 */
    var last = this.spans[start - 1]; this.lastW = last && last.parentNode !== this.box ? last.parentNode : null;
    this._spans(chars, start, chars.length, false, marks, frag);
    this.box.insertBefore(frag, this.car);
    this.to = chars.length;
    if (!this.stale) this.measure(start);
  };
  TextLayer.prototype.measure = function (start) {
    var sp = this.spans, n = this.chars.length, box = this.box, i, e;
    if (start == null || this.stale) { start = this.from; this.cy = []; }
    if (this.X.length < n) { var X = new Float32Array(n + 64), W = new Float32Array(n + 64), L = new Int16Array(n + 64); X.set(this.X); W.set(this.W); L.set(this.L); this.X = X; this.W = W; this.L = L; }
    this.lh = parseFloat(getComputedStyle(box).lineHeight) || 1;
    /* 보이는 줄이 세 줄보다 적으면(낮은 화면) 지나간 줄을 남기지 않고 지금 줄부터 보여 준다 */
    if (this.scrolls) this.keep = Math.round(box.parentNode.clientHeight / this.lh) >= 3 ? this.keep0 : 0;
    for (i = start; i < this.to; i++) {
      var s = sp[i]; if (!s) continue;
      var c = this.base[i] === 'c', line = Math.round((c ? s.parentNode : s).offsetTop / this.lh);
      this.X[i] = s.offsetLeft; this.W[i] = s.offsetWidth; this.L[i] = line;
      if (c && this.cy[line] == null) { this.ch = s.offsetHeight; this.cy[line] = s.offsetTop + this.ch; }
    }
    /* 글 상자의 왼쪽 위가 무대(.stage) 안에서 어디인지(위로 튀는 이펙트의 자리). 변형(transform)과 상관없는 값으로 잰다 */
    this.ox = 0; this.oy = 0;
    for (e = box; e && e !== this.stage; e = e.offsetParent) { this.ox += e.offsetLeft; this.oy += e.offsetTop; }
    this.bw = box.offsetWidth;
    this.stale = false;
  };
  TextLayer.prototype.lineY = function (line) { var y = this.cy[line]; return y == null ? line * this.lh + (this.lh + (this.ch || this.lh * 0.6)) / 2 : y; };
  /* 글자 i 의 상자(글 상자 기준). 이펙트가 쓴다 */
  TextLayer.prototype.rect = function (i) {
    if (i < this.from || i >= this.to) return null;
    if (this.stale) this.measure();
    var w = Math.max(this.W[i], 14) + 6, h = this.ch || 30;
    return { cx: this.X[i] + this.W[i] / 2, cy: this.lineY(this.L[i]) - h / 2, w: w, h: h };
  };
  TextLayer.prototype.span = function (a, b) {
    if (a < this.from || b >= this.to || a > b) return null;
    if (this.stale) this.measure();
    if (this.L[a] !== this.L[b]) return null;
    return { x: this.X[a], y: this.lineY(this.L[a]) - 4, w: this.X[b] + this.W[b] - this.X[a] };
  };
  TextLayer.prototype.toStage = function (x, y) { return { x: this.ox + x, y: this.oy + y - this.y }; };
  /* 콤보 꼬리표가 뜨는 자리: 글 바로 위의 빈 줄(치는 글을 가리지 않는다) */
  TextLayer.prototype.slot = function () { if (this.stale) this.measure(); return { x: this.slotRight ? this.ox + this.bw - 96 : this.ox, y: this.oy - this.slotDy }; };
  TextLayer.prototype.isSpace = function (i) { return this.base[i] !== 'c'; };
  var CLS = ['', ' ok', ' bad', ' pend'];
  /* 조합 중인 글자: 목표 글자는 그대로 두고, 친 만큼만 왼쪽부터 색을 채운다(다른 글자로 바꿔 그리면 틀린 것처럼 보인다) */
  TextLayer.prototype.paint = function (r, lenient) {
    var sp = this.spans, st = r.st, prev = this.prev, base = this.base, i, n = Math.min(st.length, this.to);
    for (i = this.from; i < n; i++) {
      if (prev[i] !== st[i]) { sp[i].className = base[i] + CLS[st[i]] + (this.cur === i ? ' cur' : ''); prev[i] = st[i]; }
    }
    if (r.pendingAt >= 0 && sp[r.pendingAt]) {
      var total = H.keysOf(this.chars[r.pendingAt]).length, done = lenient ? 0 : H.keyStream(r.pendingText || '').length;
      var f = lenient || !total ? 50 : Math.max(18, Math.min(86, Math.round(done / total * 100)));
      if (this.pend !== r.pendingAt || this.pf !== f) { sp[r.pendingAt].style.setProperty('--f', f + '%'); this.pend = r.pendingAt; this.pf = f; }
    }
    this.place(r.cursor);
  };
  /* 지금 칠 자리로 밑줄을 옮기고, 줄이 넘어갔으면 글 덩어리를 민다 */
  TextLayer.prototype.place = function (cursor) {
    var sp = this.spans, car = this.car, now = performance.now(), quick = now - (this.at || 0) < 95;
    this.at = now;
    if (this.cur !== cursor) {
      if (this.cur >= 0 && sp[this.cur]) sp[this.cur].classList.remove('cur');
      if (sp[cursor]) sp[cursor].classList.add('cur');
      this.cur = cursor;
    }
    if (cursor < this.from || cursor >= this.to) { if (!this.gone) { car.style.opacity = '0'; this.gone = true; } return; }
    if (this.gone) { car.style.opacity = ''; this.gone = false; }
    if (this.stale) this.measure();
    /* 같은 줄 안에서만 미끄러진다. 키 사이가 0.1초보다 짧으면(미끄러질 틈이 없다) 바로 옮긴다 */
    var line = this.L[cursor], glide = line === this.line && !quick && !!FX && FX.level > 0 && !TOUCH;   /* 터치 기기는 미끄러지지 않고 바로(움직임이 끝날 때마다 화면을 한 번 더 그리는 값을 아낀다) */
    if (glide !== this.glide) { car.classList.toggle('glide', glide); this.glide = glide; }
    car.style.transform = 'translate3d(' + this.X[cursor].toFixed(1) + 'px,' + (this.lineY(line) - 5).toFixed(1) + 'px,0) scaleX(' + (Math.max(6, this.W[cursor]) / 20).toFixed(3) + ')';
    this.line = line;
    if (this.scrolls) {
      var y = Math.max(0, line - this.keep) * this.lh;
      if (y !== this.y) { this.box.style.transform = 'translateY(' + (-y) + 'px)'; this.y = y; }
    }
  };
  /* 화면 읽기 프로그램이 읽을 '칠 글'(그림으로 그린 글자 줄은 숨겨 두고 이 문단을 읽게 한다) */
  function readable(e) { var x = $('txt-sr'); if (x) x.textContent = e.T.text.replace(/\n/g, ' '); }
  function closeMore() { var m = $('more'); if (m) m.open = false; }
  function stageInView() { var st = D.querySelector('.stage'); if (!st) return false; var b = st.getBoundingClientRect(); return b.bottom > 80 && b.top < window.innerHeight - 80; }
  var hintNow = null;
  function showHint(h) {
    if (h === hintNow) return;
    hintNow = h;
    var box = $('hint'); if (!box) return;
    if (!h) { box.hidden = true; return; }
    box.innerHTML = h === 'ko' ? S.needKo : h === 'en' ? S.needEn : S.caps;
    box.hidden = false;
  }
  /* 다음에 누를 키를 키 모양 하나로(상징) */
  var capNow;
  function nextCap(tok) {
    if (tok === capNow) return;
    capNow = tok;
    var c = $('nextkey'); if (!c) return;
    var p = tok == null ? null : TJ.keyPlace(tok);
    c.textContent = tok == null ? '' : keyLabel(tok);
    c.classList.toggle('wide', tok === ' ' || tok === '\n');
    var sh = $('nextshift'); if (sh) sh.hidden = !(p && p.shift);
  }
  /* 숫자 줄(속도·정확도·시간·콤보): 값이 바뀐 칸만 고친다 */
  function Stats() { this.speed = $('speed'); this.wpm = $('wpm'); this.acc = $('acc'); this.left = $('left'); this.combo = $('combo'); this.kc = $('k-combo'); this.cold = null; }
  Stats.prototype.show = function (speed, wpm, acc, left, combo) {
    setText(this.speed, speed); if (this.wpm) setText(this.wpm, wpm);
    setText(this.acc, acc == null ? '–' : acc); setText(this.left, left);
    if (this.combo) {
      setText(this.combo, combo);
      /* 콤보 칸은 10부터 겨자색으로 켜진다(그 전에는 테두리만) */
      var cold = !(combo >= 10); if (cold !== this.cold && this.kc) { this.kc.classList.toggle('cold', cold); this.cold = cold; }
    }
  };
  /* 초마다 속도 그래프(SVG). 주홍 점 = 그 초에 틀린 키가 있었음 */
  function chart(svg, res) {
    var W = 600, Hh = 120, padL = 36, padB = 20, padT = 10, s = res.samples, pts = [], i, en = res.unit === 'en';
    var prev = { net: 0, miss: 0, t: 0 }, okc = res.strokes ? res.okChars / res.strokes : 0;
    for (i = 0; i < s.length; i++) {
      var dt = Math.max(1, s[i].t - prev.t), v = (s[i].net - prev.net) * 60 / dt; if (en) v = v * okc / 5;
      pts.push({ t: s[i].t, v: Math.max(0, v), err: s[i].miss > prev.miss }); prev = s[i];
    }
    var sm = pts.map(function (p, k) { var a = pts.slice(Math.max(0, k - 1), k + 2), sum = 0; a.forEach(function (x) { sum += x.v; }); return sum / a.length; });
    var max = Math.max.apply(null, sm.concat([10])), step = en ? 20 : 100, top = Math.ceil(max * 1.1 / step) * step || step, n = pts.length;
    var X = function (k) { return padL + (n > 1 ? k / (n - 1) : 0) * (W - padL - 8); }, Y = function (v) { return padT + (1 - v / top) * (Hh - padT - padB); };
    var d = sm.map(function (v, k) { return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var html = '<line class="base" x1="' + padL + '" y1="' + Y(0) + '" x2="' + (W - 8) + '" y2="' + Y(0) + '"/><line class="base" x1="' + padL + '" y1="' + Y(top) + '" x2="' + (W - 8) + '" y2="' + Y(top) + '" stroke-dasharray="3 4"/>';
    /* .grow = 결과가 뜰 때 바닥에서 자라는 묶음(fx.js) */
    if (n > 1) html += '<g class="grow"><path class="area" d="' + d + ' L' + X(n - 1).toFixed(1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + ' Z"/><path class="line" d="' + d + '"/></g>';
    pts.forEach(function (p, k) { if (p.err) html += '<circle class="err" cx="' + X(k).toFixed(1) + '" cy="' + Y(0) + '" r="3.5"/>'; });
    html += '<text x="' + (padL - 6) + '" y="' + (Y(top) + 4) + '" text-anchor="end">' + top + '</text><text x="' + (padL - 6) + '" y="' + (Y(0) + 4) + '" text-anchor="end">0</text>';
    html += '<text x="' + padL + '" y="' + (Hh - 4) + '">1' + S.sec + '</text><text x="' + (W - 8) + '" y="' + (Hh - 4) + '" text-anchor="end">' + (n ? pts[n - 1].t : 0) + S.sec + '</text>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.innerHTML = html;
  }
  /* 화면 자판 한 벌: 키마다 data-k(영문 자리). 한글 글이면 낱자를 적는다 */
  function board(box) {
    var B = TJ.board, Q2K = H.Q2K, html = '';
    var side = [['', '⌫'], ['Tab', ''], ['Caps', 'Enter'], ['Shift', 'Shift']];
    B.rows.forEach(function (row, r) {
      html += '<div class="krow r' + r + '">';
      if (side[r][0]) html += '<span class="k wide" data-k="' + side[r][0] + 'L"><b>' + side[r][0] + '</b></span>';
      Array.from(row).forEach(function (ch, c) {
        var up = B.shifted[r].charAt(c), main = ch, sub = '';
        if (KO && Q2K[ch]) { main = Q2K[ch]; sub = Q2K[up] || ''; }
        else if (/[a-z]/.test(ch)) main = ch.toUpperCase();
        else sub = up;
        var esc = function (x) { return x.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
        html += '<span class="k' + (B.home.indexOf(ch) >= 0 ? ' home' : '') + '" data-k="' + esc(ch) + '" data-f="' + B.finger[r].charAt(c) + '"><i>' + esc(sub) + '</i><b>' + esc(main) + '</b></span>';
      });
      if (side[r][1]) html += '<span class="k wide" data-k="' + side[r][1] + 'R"><b>' + side[r][1] + '</b></span>';
      html += '</div>';
    });
    html += '<div class="krow r4"><span class="k space" data-k=" " data-f="0"></span></div>';
    box.innerHTML = html;
    var map = {};
    Array.prototype.forEach.call(box.querySelectorAll('.k'), function (k) { map[k.getAttribute('data-k')] = k; });
    return map;
  }
  function keyEl(keys, tok) { var p = TJ.keyPlace(tok); return p ? keys[p.ch === '\n' ? 'EnterR' : p.ch] : null; }
  function clearMap(keys) { Object.keys(keys).forEach(function (k) { keys[k].classList.remove('next', 'with', 'miss', 'slowk', 'pop', 'new'); keys[k].style.removeProperty('--d'); var em = keys[k].querySelector('em'); if (em) em.remove(); }); }
  /* 연출 2 '틀린 키 지도 켜짐': 결과가 뜬 순간 한 번. 많이 틀린 순서로 여섯 개까지 차례로 눌리며 칠해지고, 나머지는 같이. 느린 키는 처음부터 칠해져 있다. */
  function litMap(keys, res, animate) {
    clearMap(keys);
    res.slow.slice(0, 4).forEach(function (m) { var k = keyEl(keys, m.key); if (k) k.classList.add('slowk'); });
    res.missed.forEach(function (m, i) {
      var k = keyEl(keys, m.key); if (!k) return;
      k.classList.remove('slowk'); k.classList.add('miss');
      var em = D.createElement('em'); em.textContent = m.miss; k.appendChild(em);
      if (animate && !REDUCED) { k.style.setProperty('--d', (Math.min(i, 5) * 60) + 'ms'); k.classList.add('pop'); }
    });
  }
  function names(list) { return list.map(function (m) { return keyLabel(m.key); }).join(' '); }
  function mapCaption(box, res) {
    var miss = res.missed.slice(0, 6), slow = res.slow.slice(0, 4).filter(function (s) { return !res.missed.some(function (m) { return m.key === s.key; }); });
    box.textContent = '';
    if (miss.length) { box.appendChild(D.createTextNode(S.missed + ' ')); box.appendChild(el('b', '', names(miss))); }
    else box.appendChild(D.createTextNode(S.none));
    if (slow.length && res.mode === 'key') { box.appendChild(el('span', 'sep', ' · ')); box.appendChild(D.createTextNode(S.slow + ' ')); box.appendChild(el('i', '', names(slow))); }
    if (res.mode === 'char') { box.appendChild(D.createElement('br')); box.appendChild(el('small', '', S.touchNote)); }
  }

  /* ================= 결과 칸(공통) ================= */
  function fillResult(res, rep, e) {
    var ko = res.unit === 'ko', u = ko ? S.unitShort : ' WPM', set = function (id, t) { var x = $(id); if (x) x.textContent = t; };
    set('r-speed', num(res.v)); set('r-unit', ko ? S.unit : 'WPM');
    set('r-wpm', CFG.both ? fmt(S.alsoWpm, { w: rep.wpm }) : '');
    set('r-formula', ko ? fmt(S.formulaKo, { n: num(rep.strokes), t: rep.secsText, s: num(rep.speed) }) : fmt(S.formulaEn, { n: num(rep.chars), t: rep.secsText, s: num(rep.wpm) }));
    if (CFG.both) set('r-formula2', fmt(S.formulaEn, { n: num(rep.chars), t: rep.secsText, s: num(rep.wpm) }));
    set('r-acc', rep.accuracy == null ? '–' : rep.accText + '%');
    set('r-accd', rep.typed ? fmt(S.accDetail, { typed: num(rep.typed), ok: num(rep.ok), wrong: num(rep.wrong) }) : '');
    /* 총 속도(틀렸거나 지운 것까지 누른 키 전부)를 작게, 식과 함께 */
    set('r-raw', !rep.typed ? '' : ko ? fmt(S.rawKo, { s: num(rep.grossSpeed), n: num(rep.typedStrokes), t: rep.secsText }) + (CFG.both ? ' · ' + fmt(S.rawAlso, { w: num(rep.grossWpm) }) : '') : fmt(S.rawEn, { w: num(rep.grossWpm), n: num(rep.typed), t: rep.secsText }));
    var skip = $('r-skip'); if (skip) { skip.textContent = rep.skipped ? fmt(S.skipped, { n: rep.skipped }) : ''; skip.hidden = !rep.skipped; }
    /* 이 점수가 어느 정도인지: 이 기기의 지난 기록·최고 기록과 견준다 */
    var c = res.cmp, cmp = $('r-cmp'), best = false, line = '';
    if (e.drill) line = S.drillDone;
    else if (!c) line = '';
    else if (c.first) line = S.first;
    else if (c.isBest) { line = fmt(S.newBest, { b: num(c.best), u: u }); best = true; }
    else {
      line = c.diff == null ? '' : c.diff > 0 ? fmt(S.diffUp, { d: num(c.diff), u: u }) : c.diff < 0 ? fmt(S.diffDown, { d: num(-c.diff), u: u }) : S.diffSame;
      if (c.best != null) line += (line ? ' · ' : '') + fmt(S.bestIs, { b: num(c.best), u: u });
    }
    if (cmp) { cmp.textContent = line; cmp.classList.toggle('best', best); }
    /* 배지(키캡 조각): 최고 기록 / 틀린 키 없음(스무 키 넘게 친 판) / 이 판에서 가장 길게 이어 맞힌 키 수 */
    var perfect = rep.typed >= 20 && rep.wrong === 0, bd = $('r-badges');
    if (bd) {
      bd.textContent = '';
      if (best) bd.appendChild(el('span', 'bdg hot', S.bBest));
      if (perfect) bd.appendChild(el('span', 'bdg main', S.bPerfect));
      if (res.maxCombo >= 10) { var parts = S.bCombo.split('{n}'), cb = el('span', 'bdg', parts[0].replace(/\s+$/, '')); cb.appendChild(el('b', '', num(res.maxCombo))); if (parts[1]) cb.appendChild(D.createTextNode(parts[1])); bd.appendChild(cb); }
    }
    var dr = $('drill'); if (dr) dr.hidden = !res.missed.length;
    var cap = $('map-cap'); if (cap) mapCaption(cap, res);
    var ch = $('chart'); if (ch) chart(ch, res);
    /* 연출: 결과가 내려앉고(숫자·배지·그래프), 같은 조건의 앞 최고를 넘었거나(정확도 90% 이상) 틀린 키가 없으면 키 조각이 튄다 */
    res.best = best; res.perfect = perfect;
    if (FX) {
      FX.reveal({ big: $('r-speed'), badges: bd, chart: ch, best: best });
      if (!e.drill && ((best && rep.accuracy != null && rep.accuracy >= 90) || perfect)) FX.confetti($('burst'), $('r-speed') || $('r-pass'), best);
    }
  }
  function rounded(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ================= 내 기록 칸 ================= */
  /* 문장부호·숫자를 넣은 판인지(조건이 다르면 따로 견주므로 목록에서도 구분해 보여 준다) */
  function condFlags(r) {
    var f = typeof r.cond === 'string' ? (r.cond.split('|')[4] || '') : (r.punct ? 'p' : '') + (r.nums ? 'n' : '');
    return (f.indexOf('p') >= 0 ? ' · ' + S.withPunct : '') + (f.indexOf('n') >= 0 ? ' · ' + S.withNums : '');
  }
  function condLabel(r) {
    var k = S.kinds[r.kind] || r.kind, len = /^t/.test(r.len) ? fmt(S.lenSecs, { n: r.len.slice(1) }) : /^L/.test(r.len) ? '' : /^c/.test(r.len) ? (r.tool === 'sentences' ? fmt(S.lenSent, { n: r.len.slice(1) }) : (S.sizes[r.len.slice(1)] || r.len.slice(1))) : '';
    if (r.tool === 'practice') { var les = S.lessons[+r.len.slice(1) - 1]; return fmt(S.lessonN, { n: r.len.slice(1), name: les || '' }); }
    return k + (len ? ' · ' + len : '') + condFlags(r);
  }
  function when(at) {
    var d = new Date(at), now = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.toDateString() === now.toDateString() ? fmt(S.todayAt, { t: hm }) : fmt(S.dateFmt, { m: d.getMonth() + 1, d: d.getDate() });
  }
  var REC_FEW = 5, recOpen = false;
  function renderRecords(e) {
    var box = $('rec-list'); if (!box) return;
    var all = store.runs().filter(function (r) { return r.tool === CFG.tool && r.lang === CFG.text; });
    if (all.length <= REC_FEW) recOpen = false;
    var runs = all.slice(0, recOpen ? all.length : REC_FEW), has = runs.length > 0;
    /* '더 보기': 저장된 기록(50개까지)을 전부 펼친다. 누른 뒤에만 칸이 길어진다 */
    var more = $('rec-more');
    if (more) { more.hidden = all.length <= REC_FEW; more.textContent = recOpen ? S.recLess : fmt(S.recMore, { n: all.length }); more.setAttribute('aria-expanded', recOpen ? 'true' : 'false'); }
    box.parentNode.classList.toggle('open', recOpen);
    box.textContent = '';
    runs.forEach(function (r) {
      var li = el('li'), b = store.best(r.cond);
      li.appendChild(el('span', 'rc-when', when(r.at)));
      li.appendChild(el('span', 'rc-cond', condLabel(r)));
      var v = el('b', 'num', num(r.v)); li.appendChild(v); li.appendChild(el('span', 'rc-u', r.unit === 'ko' ? S.unit : 'WPM'));
      li.appendChild(el('span', 'rc-acc num', r.acc == null ? '' : r.acc + '%'));
      if (b && b.at === r.at) li.appendChild(el('span', 'rc-best', S.bestTag));
      box.appendChild(li);
    });
    $('rec-empty').hidden = has; box.hidden = !has;
    var bb = store.best(TJ.Store.cond(e.cond())), bl = $('rec-best');
    if (bl) bl.textContent = bb ? fmt(S.recBest, { c: condLabel(e.cond()), b: num(bb.v), u: KO || CFG.ui === 'ko' ? S.unit : 'WPM' }) : '';
    var mk = $('rec-keys'), miss = store.missed(CFG.text, 6);
    if (mk) {
      mk.textContent = '';
      miss.forEach(function (m) { var c = el('span', 'cap miss', keyLabel(m.key)); c.appendChild(el('small', '', m.miss + S.times)); mk.appendChild(c); });
      $('rec-keys-empty').hidden = miss.length > 0; mk.hidden = !miss.length;
      var rd = $('rec-drill'); if (rd) rd.hidden = !miss.length;
    }
    var clr = $('rec-clear'); if (clr) clr.hidden = !store.hasRecords();
  }

  /* ================= 결과 그림(공유) ================= */
  function shareImage(e) {
    var res = e.result; if (!res) return;
    var rep = res.rep, c = D.createElement('canvas'), W = 1200, Hh = 630, g = c.getContext('2d'), cs = getComputedStyle(root), col = function (n) { return cs.getPropertyValue(n).trim(); };
    c.width = W; c.height = Hh;
    var font = function (w, s) { g.font = w + ' ' + s + 'px ' + cs.getPropertyValue('--font'); };
    g.fillStyle = col('--bg'); g.fillRect(0, 0, W, Hh);
    g.fillStyle = col('--card'); rounded(g, 60, 60, W - 120, Hh - 120, 28); g.fill();
    g.strokeStyle = col('--line-2'); g.lineWidth = 2; g.stroke();
    g.fillStyle = col('--main'); g.fillRect(60 + 28, 60, W - 120 - 56, 6);
    g.fillStyle = col('--ink'); font(700, 34); g.textBaseline = 'alphabetic'; g.fillText(S.brand, 110, 140);
    g.fillStyle = col('--muted'); font(500, 26); g.fillText(condLabel(e.cond()) + ' · ' + when(Date.now()), 110, 186);
    g.fillStyle = col('--main'); g.font = '700 190px ' + cs.getPropertyValue('--numfont'); var big = num(res.v); g.fillText(big, 104, 400);
    var bw = g.measureText(big).width;
    g.fillStyle = col('--ink-2'); font(600, 44); g.fillText(res.unit === 'ko' ? S.unit : 'WPM', 104 + bw + 24, 400);
    g.fillStyle = col('--ink'); font(600, 34); g.fillText(S.accuracy + ' ' + (rep.accuracy == null ? '–' : rep.accuracy + '%') + (res.maxCombo >= 10 ? '  ·  ' + fmt(S.bCombo, { n: num(res.maxCombo) }) : ''), 110, 470);
    g.fillStyle = col('--muted'); font(500, 26); g.fillText(res.unit === 'ko' ? fmt(S.formulaKo, { n: num(rep.strokes), t: rep.secsText, s: num(rep.speed) }) : fmt(S.formulaEn, { n: num(rep.chars), t: rep.secsText, s: num(rep.wpm) }), 110, 516);
    /* 틀린 키: 키 모양으로 */
    var miss = res.missed.slice(0, 5), x = 760, y = 300;
    g.fillStyle = col('--muted'); font(500, 26); g.fillText(miss.length ? S.missed : S.none, x, y - 30);
    miss.forEach(function (m, i) {
      var kx = x + i * 76;
      g.fillStyle = col('--bad'); rounded(g, kx, y + 5, 64, 64, 12); g.fill();
      g.fillStyle = col('--bad-soft'); g.strokeStyle = col('--bad'); g.lineWidth = 2; rounded(g, kx, y, 64, 64, 12); g.fill(); g.stroke();
      g.fillStyle = col('--bad'); font(700, 30); g.textAlign = 'center'; g.fillText(m.key === ' ' ? '␣' : m.key === '\n' ? '⏎' : m.key, kx + 32, y + 43); g.textAlign = 'left';
    });
    g.fillStyle = col('--muted'); font(500, 24); g.textAlign = 'right'; g.fillText(CFG.host, W - 110, Hh - 100); g.textAlign = 'left';
    c.toBlob(function (blob) {
      if (!blob) return;
      var name = 'todok-' + res.v + (res.unit === 'ko' ? 'ta' : 'wpm') + '.png', file = null;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (err) { file = null; }
      if (TOUCH && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file] }).catch(function () {}); return; }
      var a = D.createElement('a'), url = URL.createObjectURL(blob);
      a.href = url; a.download = name; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, 'image/png');
  }

  /* ================= 화면 A: 종이 한 장(속도 측정·영타) ================= */
  function ViewA() {
    this.txt = $('txt'); this.layer = new TextLayer(this.txt, { keep: 1, slotDy: window.innerWidth <= 720 ? 28 : 36 }); this.keys = board($('kb')); this.stats = new Stats();
  }
  ViewA.prototype.onReset = function (e) {
    this.layer.build(e.T.chars, 0, null, false, e.breaks());
    $('result').hidden = true; $('playbox').hidden = false;
    var d = new Date(), daily = $('daily');
    daily.textContent = e.drill ? S.drillLabel : e.round === 0 ? fmt(S.daily, { m: d.getMonth() + 1, d: d.getDate(), mon: S.months ? S.months[d.getMonth()] : '' }) : '';
    $('left-l').textContent = e.limit() ? S.timeLeft : S.elapsed;
    syncOpts(e);
  };
  ViewA.prototype.onExtend = function (e, from) { this.layer.append(e.T.chars, from, e.breaks()); };
  ViewA.prototype.tick = function (live, e) { this.stats.show(CFG.ui === 'en' ? live.wpm : live.speed, live.wpm, live.acc, live.left, e.session.combo); };
  ViewA.prototype.render = function (r, live, e) {
    this.layer.paint(r, e.session.mode === 'char');
    this.tick(live, e);
    nextCap(e.done ? null : r.next);
  };
  ViewA.prototype.onFinish = function (res, rep, e) {
    $('playbox').hidden = true; $('result').hidden = false;
    fillResult(res, rep, e);
    litMap(this.keys, res, true);
  };

  /* ================= 화면 C: 화면 자판(자리 연습) ================= */
  function ViewC() {
    this.txt = $('txt'); this.layer = new TextLayer(this.txt, { keep: 0, slotDy: 30 }); this.keys = board($('kb')); this.lit = []; this.stats = new Stats(); this.tok = undefined;
  }
  ViewC.prototype.light = function (tok) {
    this.lit.forEach(function (k) { k.classList.remove('next', 'with'); }); this.lit = [];
    if (tok == null) return null;
    var p = TJ.keyPlace(tok), k = keyEl(this.keys, tok); if (!p || !k) return null;
    k.classList.add('next'); this.lit.push(k);
    if (p.shift) { var sh = this.keys[p.finger <= 4 ? 'ShiftR' : 'ShiftL']; sh.classList.add('with'); this.lit.push(sh); }
    return p;
  };
  /* 방금 누른 키가 화면 자판에서 한 번 눌린다 */
  ViewC.prototype.pressKey = function (tok) { if (TOUCH || tok == null || !FX) return; var k = keyEl(this.keys, tok); if (k) FX.press(k, 'tap'); };
  ViewC.prototype.onReset = function (e) {
    var keys = this.keys;
    this.layer.build(e.T.chars);
    $('result').hidden = true; $('playbox').hidden = false; $('kb-legend').hidden = true; $('kb-say').hidden = false;
    $('left-l').textContent = S.elapsed;
    clearMap(keys); this.lit = []; this.tok = undefined;
    /* 이번 단계에서 새로 배우는 키에 점을 찍어 둔다 */
    if (!e.drill) TJ.lessons.list[CFG.text][e.lesson].keys.forEach(function (k) { var x = keyEl(keys, k); if (x) x.classList.add('new'); });
    Array.prototype.forEach.call($('steps').children, function (b, i) {
      b.setAttribute('aria-pressed', i === e.lesson && !e.drill ? 'true' : 'false');
      b.classList.toggle('done', e.passed.indexOf(i) >= 0);
    });
    $('step-say').textContent = e.drill ? S.drillLabel : S.lessonSay[e.lesson];
  };
  ViewC.prototype.onExtend = function () {};
  ViewC.prototype.tick = function (live, e) { this.stats.show(CFG.ui === 'en' ? live.wpm : live.speed, live.wpm, live.acc, live.left, e.session.combo); };
  ViewC.prototype.render = function (r, live, e) {
    this.layer.paint(r, e.session.mode === 'char');
    this.tick(live, e);
    if (e.done || r.next === this.tok) return;
    this.tok = r.next;
    var p = this.light(r.next), say = $('kb-say');
    say.textContent = '';
    if (p) {
      say.appendChild(el('span', '', S.nextKey)); say.appendChild(el('b', 'cap', keyLabel(r.next)));
      say.appendChild(el('span', '', (p.shift ? 'Shift + ' : '') + S.fingers[p.finger]));
    }
  };
  ViewC.prototype.onFinish = function (res, rep, e) {
    $('playbox').hidden = true; $('result').hidden = false;
    fillResult(res, rep, e);
    /* 숫자 띠도 결과 값으로 맞춘다(치는 중의 어림값과 결과의 식이 어긋나 보이지 않게) */
    this.stats.show(num(res.v), rep.wpm, rep.accText, rep.secsText, res.maxCombo);
    this.lit = []; this.tok = undefined;
    litMap(this.keys, res, true);
    var pass = $('r-pass'), again = $('again');
    pass.textContent = e.drill ? '' : res.pass ? (e.lesson < 4 ? fmt(S.passed, { n: e.lesson + 1 }) : S.passedAll) : fmt(S.notPassed, { a: TJ.lessons.PASS_ACC });
    pass.classList.toggle('ok', !!res.pass);
    again.firstChild.nodeValue = (res.pass && e.lesson < 4 && !e.drill ? fmt(S.nextLesson, { name: S.lessons[e.lesson + 1] }) : S.againBtn) + ' ';
    $('kb-legend').hidden = false; $('kb-say').hidden = true;
    root.classList.remove('kb-off');
    Array.prototype.forEach.call($('steps').children, function (b, i) { b.classList.toggle('done', e.passed.indexOf(i) >= 0); });
  };

  /* ================= 화면 B: 보고 치는 글 + 내가 친 글(문장 연습) ================= */
  function ViewB() {
    this.txt = $('txt'); this.layer = new TextLayer(this.txt, { scroll: false, jolt: this.txt.parentNode, slotRight: true, slotDy: 26 }); this.lines = []; this.cur = -1; this.bars = []; this.keys = board($('kb')); this.stats = new Stats();
    var spark = $('spark');
    for (var i = 0; i < 30; i++) { var b = D.createElement('i'); spark.appendChild(b); this.bars.push(b); }
  }
  /* 브라우저가 줄을 나눈 대로 줄 목록을 만든다(문장이 끝나면 줄도 바뀐다) */
  ViewB.prototype.measure = function (chars) {
    var txt = this.txt, L = this.layer;
    txt.classList.add('measuring');
    L.build(chars, 0, null, true);
    var out = [], top = null, from = 0;
    L.spans.forEach(function (s, i) {
      if (s.classList.contains('sp')) return;
      var box = s.parentNode;
      if (top == null) top = box.offsetTop;
      if (box.offsetTop !== top && s === box.firstChild) { out.push([from, i]); from = i; top = box.offsetTop; }
    });
    out.push([from, chars.length]);
    txt.classList.remove('measuring');
    return out;
  };
  ViewB.prototype.lineText = function (e, k) { return k >= 0 && k < this.lines.length ? e.T.chars.slice(this.lines[k][0], this.lines[k][1]).join('').replace(/\s+$/, '') : ''; };
  ViewB.prototype.show = function (e, k) {
    this.cur = k;
    this.layer.build(e.T.chars, this.lines[k][0], this.lines[k][1]);
    var prev = $('prev');
    prev.className = 'ln prev' + (k === 0 ? ' first' : '');
    prev.textContent = k === 0 ? S.topicSay[e.topic] : this.lineText(e, k - 1);
    $('next1').textContent = this.lineText(e, k + 1); $('next2').textContent = this.lineText(e, k + 2);
  };
  ViewB.prototype.onReset = function (e) {
    this.lines = this.measure(e.T.chars); this.show(e, 0);
    $('result').hidden = true; $('playbox').hidden = false;
    $('g-label').textContent = S.speedNow; $('left-l').textContent = S.progress;
    this.bars.forEach(function (b) { b.style.transform = 'scaleY(.05)'; b.className = ''; });
    this.mine = ''; this.nb = -1;
    syncOpts(e);
  };
  ViewB.prototype.onExtend = function () {};
  ViewB.prototype.tick = function (live, e) {
    var T = e.T, r = e.session.cmp, done = 0;
    for (var i = 0; i < r.cursor && i < T.chars.length; i++) if (T.chars[i] === '\n') done++;
    this.stats.show(live.speed, live.wpm, live.acc, (e.done ? e.count : Math.min(e.count, done + 1)) + '/' + e.count, e.session.combo);
    /* 초마다 속도 막대: 새 초가 생겼을 때만 다시 그린다 */
    var s = e.session.samples, n = s.length, bars = this.bars;
    if (n && n !== this.nb) {
      this.nb = n;
      var maxv = 1, vals = [];
      for (var j = Math.max(0, n - 30); j < n; j++) { var d = s[j].net - (j ? s[j - 1].net : 0); vals.push({ v: Math.max(0, d), er: s[j].miss > (j ? s[j - 1].miss : 0) }); if (d > maxv) maxv = d; }
      vals.forEach(function (x, q) { bars[q].style.transform = 'scaleY(' + Math.max(0.05, x.v / maxv).toFixed(2) + ')'; bars[q].className = x.er ? 'er' : 'on'; });
    }
  };
  ViewB.prototype.render = function (r, live, e) {
    var k = 0, lines = this.lines, T = e.T;
    while (k + 1 < lines.length && r.cursor >= lines[k + 1][0]) k++;
    if (k !== this.cur) this.show(e, k);
    this.layer.paint(r, e.session.mode === 'char');
    /* 내가 친 글: 이 줄에 해당하는 단어만 */
    var w0 = 0; while (w0 < T.words.length && T.words[w0].ci[0] < lines[k][0]) w0++;
    var mine = r.value.split(/[ \n]/).slice(w0).join(' ');
    if (mine !== this.mine) { $('mine-t').textContent = mine; this.mine = mine; }
    this.tick(live, e);
  };
  ViewB.prototype.onFinish = function (res, rep, e) {
    $('playbox').hidden = true; $('result').hidden = false;
    fillResult(res, rep, e);
    this.stats.show(num(rep.speed), rep.wpm, rep.accText, e.count + '/' + e.count, res.maxCombo);
    $('g-label').textContent = S.thisRun;
    litMap(this.keys, res, true);
  };

  /* ================= 옵션(단추) ================= */
  function press(group, val) { if (!group) return; Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(val) ? 'true' : 'false'); }); }
  function syncOpts(e) {
    press($('kind'), e.kind); press($('len-t'), 't' + e.secs); press($('len-c'), 'c' + e.count); press($('topic'), e.topic);
    var cnt = $('count'); if (cnt) cnt.value = String(e.count);
    var mode = $('mode'); if (mode) press(mode, e.mode);
    /* 시간 단추와 분량 단추는 같은 자리에 겹쳐 두고 하나만 보인다(바꿔도 옆 단추가 밀리지 않게) */
    var lt = $('len-t'), lc = $('len-c'); if (lt && lc) { lt.toggleAttribute('data-off', e.mode !== 'time'); lc.toggleAttribute('data-off', e.mode !== 'count'); }
    var ll = $('l-len'); if (ll) ll.textContent = e.mode === 'time' ? S.lenTime : S.lenSize;
    var pn = $('punct'), nn = $('nums'), wo = $('words-only');
    if (pn) pn.checked = e.punct; if (nn) nn.checked = e.nums; if (wo) wo.hidden = e.kind !== 'words';
  }
  function seg(id, fn) {
    var g = $(id); if (!g) return;
    g.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b && g.contains(b)) fn(b.getAttribute('data-v')); });
  }
  function click(id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); }

  /* ================= 이펙트 세기·키 소리 ================= */
  /* 고른 값은 todok.set 의 'fx' 칸에(l = 세기 0~2, s = 소리). 느린 기기라서 스스로 내린 단계는 남기지 않는다(다음 방문에 다시 재 본다) */
  function showFx(auto) {
    var g = $('fx-seg'), say = $('fx-say');
    press(g, FX.level); press($('snd-seg'), FX.sound ? 1 : 0);
    if (g && FX.locked) Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) { b.disabled = true; });
    if (say) say.textContent = FX.reduced ? S.fxReduced : (auto ? S.fxAuto : '');
  }
  /* 처음 온 기기가 느린지 어림해 본다(짧은 셈 네 번 가운데 가장 빠른 값, 기기 메모리). 느리면 '가볍게'에서 시작한다. 고른 값이 있으면 그 값을 따른다.
     화면이 다 뜬 뒤 한 번만 재고, 저장하지 않는다(치는 중에 늦어지는지는 FX.note 가 따로 본다) */
  function slowDevice() {
    var ts = [], x = 0;
    for (var k = 0; k < 4; k++) { var t = performance.now(); for (var i = 0; i < 150000; i++) x += Math.sqrt(i) % 7; ts.push(performance.now() - t); }
    ts.sort(function (a, b) { return a - b; });
    /* 가장 빨랐던 한 번으로 본다(처음 한두 번은 준비 시간이 섞인다). 보통 컴퓨터는 0.3~1ms, 3ms 를 넘으면 느린 기기로 친다 */
    return ts[0] > 3 || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2) || x < 0;
  }
  if (FX) {
    var fxSet = store.settings('fx');
    FX.init({ stage: D.querySelector('.stage'), over: $('fx'), S: S, level: fxSet.l == null ? 2 : fxSet.l, sound: !!fxSet.s, phone: TOUCH, onChange: showFx });
    if (fxSet.l == null && !FX.locked && !AUTO) setTimeout(function () { if (FX.level === 2 && !FX.auto && store.settings('fx').l == null && slowDevice()) { FX.level = 1; FX.apply(); showFx(false); } }, 400);
    showFx(false);
    /* 소리를 켜 둔 채 다시 왔을 때: 브라우저는 처음 누른 뒤에야 소리를 낼 수 있다 */
    if (FX.sound) {
      var unlock = function () { FX.snd.ensure(); D.removeEventListener('keydown', unlock, true); D.removeEventListener('pointerdown', unlock, true); };
      D.addEventListener('keydown', unlock, true); D.addEventListener('pointerdown', unlock, true);
    }
  }

  var view = CFG.layout === 'c' ? new ViewC() : CFG.layout === 'b' ? new ViewB() : new ViewA();
  var E = new Engine(view);
  renderRecords(E);
  function saveFx() { store.saveSettings('fx', { l: FX.level, s: FX.sound ? 1 : 0 }); }
  seg('fx-seg', function (v) { if (!FX || FX.locked) return; FX.setLevel(+v, false); saveFx(); });
  seg('snd-seg', function (v) { if (!FX) return; FX.setSound(v === '1'); FX.snd.play('k'); saveFx(); });
  /* 태블릿의 화면 자판: 자판이 올라와 보이는 높이가 낮아지면 머리·제목·고르기를 접어 글과 숫자 줄이 자판 위에 다 보이게 한다(휴대폰은 m-tall 이 한다) */
  var vv = window.visualViewport;
  if (TOUCH && vv) {
    var vk = function () {
      var on = D.activeElement === E.trap && vv.height < 560 && vv.width > 720;
      if (on) root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
      if (on !== root.classList.contains('vk')) { root.classList.toggle('vk', on); if (on) window.scrollTo(0, 0); }
    };
    vv.addEventListener('resize', vk);
    E.trap.addEventListener('focus', function () { setTimeout(vk, 80); }); E.trap.addEventListener('blur', function () { setTimeout(vk, 80); });
  }
  seg('kind', function (v) { E.next({ kind: v }); });
  seg('len-t', function (v) { E.next({ secs: +v.slice(1), mode: 'time' }); });
  seg('len-c', function (v) { E.next({ count: +v.slice(1), mode: 'count' }); });
  seg('mode', function (v) { E.next({ mode: v, focus: false }); });
  seg('topic', function (v) { E.next({ topic: v }); });
  seg('steps', function (v) { E.next({ lesson: +v }); });
  var cnt = $('count'); if (cnt) cnt.addEventListener('change', function () { E.next({ count: +cnt.value, focus: false }); });
  ['punct', 'nums'].forEach(function (id) { var c = $(id); if (c) c.addEventListener('change', function () { var o = { focus: false }; o[id] = c.checked; E.next(o); }); });
  click('again', function () { E.primary(); });
  click('same', function () { E.next({ same: true }); });
  click('fresh', function () { E.next(); });
  click('quit', function () { E.quit(); });
  click('quit2', function () { E.quit(); });
  function drillKeys(list) { return list.slice(0, 4).map(function (m) { return m.key; }).filter(function (k) { return k !== ' ' && k !== '\n'; }); }
  click('drill', function () { var k = drillKeys(E.result ? E.result.missed : []); if (k.length) E.next({ drill: k, save: false }); });
  click('rec-drill', function () { var k = drillKeys(store.missed(CFG.text, 6)); if (k.length) { E.next({ drill: k, save: false }); var st = D.querySelector('.stage'); if (st && st.scrollIntoView) st.scrollIntoView({ block: 'start' }); } });
  click('share', function () { shareImage(E); });
  click('rec-more', function () { recOpen = !recOpen; renderRecords(E); });
  click('rec-clear', function () {
    var b = $('rec-clear');
    if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = S.clearSure; setTimeout(function () { b.removeAttribute('data-sure'); b.textContent = S.clearBtn; }, 4000); return; }
    store.clearRecords(); b.removeAttribute('data-sure'); b.textContent = S.clearBtn;
    renderRecords(E);
    var say = $('rec-say'); if (say) say.textContent = S.cleared;
  });
  click('kb-toggle', function () {
    var off = root.classList.toggle('kb-off'), b = $('kb-toggle');
    b.setAttribute('aria-pressed', off ? 'true' : 'false'); b.textContent = off ? S.kbShow : S.kbHide;
    E.trap.focus({ preventScroll: true });
  });
  /* 접어 둔 설정: 밖을 누르면 닫는다 */
  var more = $('more');
  if (more) D.addEventListener('click', function (ev) { if (more.open && !more.contains(ev.target)) more.open = false; });
  window.__E = E; window.__store = store;
})();
