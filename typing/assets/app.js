/* 토독 도구 화면(속도 측정·자리 연습·문장 연습·영타). 로직은 tj-core.js·tj-store.js·tj-lessons.js 에 있고 여기는 화면 연결만 한다.
   화면 글자는 빌드가 페이지에 넣어 둔 #tj-cfg JSON 에서 읽는다(이 파일에는 언어별 문구를 두지 않는다).
   - 입력: 보이지 않는 입력칸(#trap) + composition 이벤트. 붙여 넣기는 막는다. 자판 글쇠 이벤트가 한 번도 안 보이면 터치 자판으로 보고 글자 단위로 잰다.
     자판에서는 지우기 키가 눌렸는지를, 터치 자판에서는 조합 중인 문자열의 길이를 로직(Session.update)에 같이 넘긴다.
   - 초점: 컴퓨터는 열자마자 치는 칸. 여백을 눌러도 초점을 지키고, 다른 곳에 있다가 치기 시작하면(한글 입력기가 켜진 키 포함) 치는 칸으로 온다.
     휴대폰은 글을 눌렀을 때만 치는 화면으로 간다(옵션을 고르는 것만으로는 가지 않는다).
   - 치는 중에는 색만 바뀐다(움직임 없음). 결과 칸은 자리를 미리 잡아 둬서 화면이 밀리지 않는다.
   - 연출: 틀린 키 지도 켜짐(결과가 뜬 순간), 최고 기록 키 튀기(같은 조건의 앞 최고를 넘었을 때). 동작 줄이기면 둘 다 안 움직인다. */
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
  var TEXT = window.TJ_TEXT[CFG.text], KO = CFG.text === 'ko';
  var PHYS = /^(Key|Digit|Space|Minus|Equal|Bracket|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)/;
  var SALT = (Date.now() % 100000) + 17;

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
    this.iv = 0; this.started = false; this.done = false; this.doneAt = 0;
    this.recent = [];   /* 이 방문에서 이미 나온 문장(오래된 것부터). 저장하지 않는다. 다음 글을 고를 때 뒤로 미룬다 */
    this.parts = null;  /* 지금 글을 이루는 문장들(단어로 된 글이면 null) */
    var trap = this.trap;
    trap.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); if (!self.done || performance.now() - self.doneAt > 700) self.next(); return; }
      if (e.key === 'Escape') { e.preventDefault(); self.quit(); return; }
      if (self.done && e.key === 'Enter') { e.preventDefault(); if (performance.now() - self.doneAt > 700) self.primary(); return; }
      if (e.code && PHYS.test(e.code)) self.phys = true;
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
      if (D.hidden) self.timer.pause(); else { self.timer.resume(); self.session.breakTiming(); }
    });
    D.addEventListener('keydown', function (e) {
      if (e.target === trap || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target, tag = (t && t.tagName) || '';
      /* 치기 시작한 키: 글자 키, 또는 한글 입력기가 켜진 채 누른 키(key 가 'Process', keyCode 229 로 온다) */
      var typing = e.key === 'Process' || e.keyCode === 229 || e.isComposing || (!!e.key && e.key.length === 1 && e.key !== ' ');
      if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(tag)) {
        /* 설정을 바꾼 뒤 바로 치기 시작하면(고르기 단추·체크 칸에 초점이 남아 있다) 팝업을 닫고 치는 칸으로 */
        var pick = tag === 'BUTTON' || tag === 'SUMMARY' || (tag === 'INPUT' && t.type === 'checkbox');
        if (typing && pick && !self.done && t.closest('.opts, .steps')) { closeMore(); trap.focus({ preventScroll: true }); }
        return;
      }
      if (self.done && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); if (performance.now() - self.doneAt > 700) { if (e.key === 'Enter') self.primary(); else self.next(); } return; }
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
  Engine.prototype.reset = function () {
    clearInterval(this.iv); this.iv = 0;
    this.timer.reset(); this.started = false; this.done = false; this.lastSec = 0; this.result = null;
    if (!this.same || !this.text) this.text = this.makeText();
    this.same = false;
    this.session = new TJ.Session(this.text, { soft: !!CFG.lines });
    this.T = this.session.T;
    this.trap.value = ''; this.vlen = 0; this.delKey = false; this.comp = '';
    root.classList.add('idle'); root.classList.remove('running', 'finished');
    stopBurst();
    readable(this);
    this.view.onReset(this);
    this.view.render(this.session.cmp, this.live(), this);
  };
  Engine.prototype.save = function () {
    store.saveSettings(CFG.page, { kind: this.kind, mode: this.mode, secs: this.secs, count: this.count, punct: this.punct, nums: this.nums, topic: this.topic, lesson: this.lesson, passed: this.passed });
  };
  /* 다른 글로 다시(옵션을 바꿀 때도) */
  Engine.prototype.next = function (opt) {
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
  Engine.prototype.onInput = function () {
    var trap = this.trap, v = trap.value;
    if (this.done) { trap.value = ''; return; }
    if (!this.started) {
      if (!v) return;
      /* 자판 글쇠가 한 번도 안 보였으면 터치 자판으로 보고, 글자가 끝날 때 판정한다 */
      if (!this.phys) { this.session = new TJ.Session(this.text, { mode: 'char', soft: !!CFG.lines }); this.T = this.session.T; }
      this.start();
    }
    /* 자판: 이 변화가 지우기 키 때문인지 알려 준다(값이 길어졌으면 지우기가 아니다). 터치 자판: 조합 중인 문자열의 글자 수를 알려 준다 */
    var touch = this.session.mode === 'char', del = this.delKey && v.length <= this.vlen;
    var r = this.session.update(v, performance.now(), touch ? { hold: this.composing ? Array.from(this.comp).length : 0 } : { del: del });
    if (!this.composing && r.value !== v) trap.value = r.value;
    this.vlen = trap.value.length;
    /* 시간으로 재는 판에서 글이 모자라면 잇는다 */
    if (this.limit() && this.T.chars.length - r.cursor < 90) {
      var rnd = P.rng(this.seed() + this.T.chars.length), more;
      if (this.kind === 'words') more = P.words(TEXT.words, 40, rnd, { lang: CFG.text, punct: this.punct, numbers: this.nums }).join(' ');
      else { var mp = this.note(P.sentences(this.pool(), 200, rnd, this.recent)); this.parts = (this.parts || []).concat(mp); more = mp.join(' '); }
      this.session.extend(more); this.T = this.session.T; r = this.session.cmp;
      readable(this);
      this.view.onExtend(this);
    }
    showHint(r.hint);
    this.view.render(r, this.live(), this);
    /* 터치 자판은 마지막 글자 판정을 미루므로 '지금 끝난 것으로 보면 다 쳤나'로 본다(마지막 글자를 조합하는 중이어도 다 쳤으면 끝) */
    if (r.complete || (touch && this.session.wouldComplete())) this.finish();
  };
  Engine.prototype.start = function () {
    var self = this;
    this.started = true; this.timer.start();
    root.classList.remove('idle'); root.classList.add('running');
    this.iv = setInterval(function () {
      var ms = self.timer.elapsed(), sec = Math.floor(ms / 1000);
      while (self.lastSec < sec) { self.lastSec++; self.session.sample(self.lastSec); }
      if (self.limit() && ms >= self.limit()) { self.finish(); return; }
      self.view.render(self.session.cmp, self.live(), self);
    }, 200);
  };
  Engine.prototype.finish = function () {
    clearInterval(this.iv); this.iv = 0;
    var lim = this.limit(), ms = lim ? Math.min(this.timer.elapsed(), lim) : this.timer.elapsed();
    this.timer.pause();
    this.done = true; this.doneAt = performance.now();
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
    this.view.render(this.session.cmp, this.live(), this);
    this.view.onFinish(res, rep, this);
    renderRecords(this);
    if (TOUCH) this.trap.blur();
  };

  /* ================= 그리기 도우미 ================= */
  /* 글자마다 span. 단어는 줄 끝에서 갈라지지 않게 묶는다. brk = 줄바꿈 글자 뒤에서 실제로 줄을 바꾼다(문장 연습) */
  function buildText(box, chars, from, to, brk, marks) {
    var spans = [], base = [], w = null, frag = D.createDocumentFragment();
    from = from || 0; to = to == null ? chars.length : to;
    for (var i = from; i < to; i++) {
      var ch = chars[i], s = D.createElement('span');
      /* 띄어쓰기 칸은 앞 단어 묶음의 끝에 붙인다(줄이 띄어쓰기로 시작하지 않게) */
      if (ch === ' ' || ch === '\n') { base[i] = marks && marks[i] ? 'sp brk' : 'sp'; s.textContent = ' '; (w || frag).appendChild(s); w = null; if (brk && ch === '\n') frag.appendChild(D.createElement('br')); }
      else { if (!w) { w = D.createElement('span'); w.className = 'w'; frag.appendChild(w); } base[i] = 'c'; s.textContent = ch; w.appendChild(s); }
      s.className = base[i];
      spans[i] = s;
    }
    box.textContent = ''; box.appendChild(frag);
    return { spans: spans, base: base, chars: chars, prev: [], pend: -1, cur: -1 };
  }
  /* 화면 읽기 프로그램이 읽을 '칠 글'(그림으로 그린 글자 줄은 숨겨 두고 이 문단을 읽게 한다) */
  function readable(e) { var x = $('txt-sr'); if (x) x.textContent = e.T.text.replace(/\n/g, ' '); }
  function closeMore() { var m = $('more'); if (m) m.open = false; }
  function stageInView() { var st = D.querySelector('.stage'); if (!st) return false; var b = st.getBoundingClientRect(); return b.bottom > 80 && b.top < window.innerHeight - 80; }
  var CLS = ['', 'ok', 'bad', 'pend'];
  /* 조합 중인 글자: 목표 글자는 그대로 두고, 친 만큼만 왼쪽부터 색을 채운다(다른 글자로 바꿔 그리면 틀린 것처럼 보인다) */
  function paint(view, r, lenient) {
    var sp = view.spans, i;
    for (i = 0; i < r.st.length; i++) {
      if (!sp[i]) continue;
      if (view.prev[i] !== r.st[i]) { sp[i].className = view.base[i] + ' ' + CLS[r.st[i]] + (view.cur === i ? ' cur' : ''); view.prev[i] = r.st[i]; }
    }
    if (r.pendingAt >= 0 && sp[r.pendingAt]) {
      var total = H.keysOf(view.chars[r.pendingAt]).length, done = lenient ? 0 : H.keyStream(r.pendingText || '').length;
      var f = lenient || !total ? 50 : Math.max(18, Math.min(86, Math.round(done / total * 100)));
      sp[r.pendingAt].style.setProperty('--f', f + '%');
    }
    if (view.cur !== r.cursor) {
      if (view.cur >= 0 && sp[view.cur]) sp[view.cur].classList.remove('cur');
      if (sp[r.cursor]) sp[r.cursor].classList.add('cur');
      view.cur = r.cursor;
    }
  }
  /* 지금 줄이 보이게 글 덩어리를 위로 민다. keep = 지금 줄 위에 남길 줄 수 */
  function scrollLines(inner, view, keep) {
    var s = view.spans[Math.min(view.cur < 0 ? 0 : view.cur, view.spans.length - 1)];
    if (!s) return;
    var box = s.classList.contains('sp') ? s : s.parentNode, lh = parseFloat(getComputedStyle(inner).lineHeight);
    var line = Math.round(box.offsetTop / lh), y = Math.max(0, line - keep) * lh;
    if (inner._y !== y) { inner.style.transform = 'translateY(' + (-y) + 'px)'; inner._y = y; }
  }
  function showHint(h) {
    var box = $('hint'); if (!box) return;
    if (!h) { box.hidden = true; return; }
    box.innerHTML = h === 'ko' ? S.needKo : h === 'en' ? S.needEn : S.caps;
    box.hidden = false;
  }
  /* 다음에 누를 키를 키 모양 하나로(상징) */
  function nextCap(tok) {
    var c = $('nextkey'); if (!c) return;
    var p = tok == null ? null : TJ.keyPlace(tok);
    c.textContent = tok == null ? '' : keyLabel(tok);
    c.classList.toggle('wide', tok === ' ' || tok === '\n');
    var sh = $('nextshift'); if (sh) sh.hidden = !(p && p.shift);
  }
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
    if (n > 1) html += '<path class="area" d="' + d + ' L' + X(n - 1).toFixed(1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + ' Z"/><path class="line" d="' + d + '"/>';
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
    var dr = $('drill'); if (dr) dr.hidden = !res.missed.length;
    var cap = $('map-cap'); if (cap) mapCaption(cap, res);
    var ch = $('chart'); if (ch) chart(ch, res);
    /* 연출 3 '최고 기록 키 튀기': 같은 조건의 앞 최고를 넘었고 정확도 90% 이상일 때만 */
    if (best && rep.accuracy != null && rep.accuracy >= 90) burst();
  }

  /* ================= 연출 3: 최고 기록 키 튀기(캔버스) ================= */
  var burstRaf = 0, burstAt = -1e9;
  function stopBurst() { if (burstRaf) cancelAnimationFrame(burstRaf); burstRaf = 0; var c = $('burst'); if (c) { c.hidden = true; c.width = c.width; } }
  function burst() {
    var c = $('burst'), now = performance.now();
    if (!c || REDUCED || D.hidden || now - burstAt < 30000) return;
    burstAt = now;
    var box = c.parentNode.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = box.width, h = box.height;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.hidden = false;
    var g = c.getContext('2d'), cs = getComputedStyle(root), col = function (n) { return cs.getPropertyValue(n).trim(); };
    var KEY = col('--key'), EDGE = col('--key-edge'), MAIN = col('--main');
    var big = $('r-speed'), o = big ? big.getBoundingClientRect() : box, ox = o.left - box.left + o.width / 2, oy = o.top - box.top + o.height * 0.7;
    var n = w < 560 ? 24 : 40, parts = [], i;
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, v = 260 + Math.random() * 300;
      parts.push({ x: ox + (Math.random() - 0.5) * 60, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 12 + Math.random() * 10, r: (Math.random() - 0.5) * 0.8, vr: (Math.random() - 0.5) * 5, main: i % 5 === 0 });
    }
    var t0 = now, last = now, DUR = 1400;
    function frame() {
      var t = performance.now(), dt = Math.min(0.05, (t - last) / 1000), el = t - t0; last = t;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      if (el >= DUR || D.hidden) { stopBurst(); return; }
      g.globalAlpha = el > DUR - 350 ? Math.max(0, (DUR - el) / 350) : 1;
      parts.forEach(function (p) {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        var s = p.s, rr = s * 0.24;
        g.fillStyle = p.main ? MAIN : EDGE; rounded(g, -s / 2, -s / 2 + 2, s, s, rr); g.fill();
        g.fillStyle = p.main ? MAIN : KEY; g.strokeStyle = p.main ? MAIN : EDGE; g.lineWidth = 1; rounded(g, -s / 2, -s / 2, s, s, rr); g.fill(); g.stroke();
        g.restore();
      });
      burstRaf = requestAnimationFrame(frame);
    }
    burstRaf = requestAnimationFrame(frame);
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
    g.fillStyle = col('--main'); font(800, 200); var big = num(res.v); g.fillText(big, 104, 400);
    var bw = g.measureText(big).width;
    g.fillStyle = col('--ink-2'); font(600, 44); g.fillText(res.unit === 'ko' ? S.unit : 'WPM', 104 + bw + 24, 400);
    g.fillStyle = col('--ink'); font(600, 34); g.fillText(S.accuracy + ' ' + (rep.accuracy == null ? '–' : rep.accuracy + '%'), 110, 470);
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
    this.txt = $('txt'); this.v = null; this.keys = board($('kb'));
  }
  ViewA.prototype.onReset = function (e) {
    this.v = buildText(this.txt, e.T.chars, 0, null, false, e.breaks()); this.txt.style.transform = ''; this.txt._y = 0;
    $('result').hidden = true; $('playbox').hidden = false;
    var d = new Date(), daily = $('daily');
    daily.textContent = e.drill ? S.drillLabel : e.round === 0 ? fmt(S.daily, { m: d.getMonth() + 1, d: d.getDate(), mon: S.months ? S.months[d.getMonth()] : '' }) : '';
    $('left-l').textContent = e.limit() ? S.timeLeft : S.elapsed;
    syncOpts(e);
  };
  ViewA.prototype.onExtend = function (e) {
    var y = this.txt._y, tr = this.txt.style.transform;
    this.v = buildText(this.txt, e.T.chars, 0, null, false, e.breaks()); this.txt.style.transform = tr; this.txt._y = y;
  };
  ViewA.prototype.render = function (r, live, e) {
    paint(this.v, r, e.session.mode === 'char'); scrollLines(this.txt, this.v, 1);
    $('speed').textContent = live.speed; var w = $('wpm'); if (w) w.textContent = live.wpm;
    if (CFG.ui === 'en') $('speed').textContent = live.wpm;
    $('acc').textContent = live.acc == null ? '–' : live.acc; $('left').textContent = live.left;
    $('bar').style.transform = 'scaleX(' + live.frac + ')';
    nextCap(e.done ? null : r.next);
  };
  ViewA.prototype.onFinish = function (res, rep, e) {
    fillResult(res, rep, e);
    litMap(this.keys, res, true);
    $('playbox').hidden = true; $('result').hidden = false;
  };

  /* ================= 화면 C: 화면 자판(자리 연습) ================= */
  function ViewC() {
    this.txt = $('txt'); this.v = null; this.keys = board($('kb')); this.lit = [];
  }
  ViewC.prototype.light = function (tok) {
    this.lit.forEach(function (k) { k.classList.remove('next', 'with'); }); this.lit = [];
    if (tok == null) return null;
    var p = TJ.keyPlace(tok), k = keyEl(this.keys, tok); if (!p || !k) return null;
    k.classList.add('next'); this.lit.push(k);
    if (p.shift) { var sh = this.keys[p.finger <= 4 ? 'ShiftR' : 'ShiftL']; sh.classList.add('with'); this.lit.push(sh); }
    return p;
  };
  ViewC.prototype.onReset = function (e) {
    var keys = this.keys;
    this.v = buildText(this.txt, e.T.chars); this.txt.style.transform = ''; this.txt._y = 0;
    $('result').hidden = true; $('playbox').hidden = false; $('kb-legend').hidden = true; $('kb-say').hidden = false;
    $('left-l').textContent = S.elapsed;
    clearMap(keys); this.lit = [];
    /* 이번 단계에서 새로 배우는 키에 점을 찍어 둔다 */
    if (!e.drill) TJ.lessons.list[CFG.text][e.lesson].keys.forEach(function (k) { var x = keyEl(keys, k); if (x) x.classList.add('new'); });
    Array.prototype.forEach.call($('steps').children, function (b, i) {
      b.setAttribute('aria-pressed', i === e.lesson && !e.drill ? 'true' : 'false');
      b.classList.toggle('done', e.passed.indexOf(i) >= 0);
    });
    $('step-say').textContent = e.drill ? S.drillLabel : S.lessonSay[e.lesson];
  };
  ViewC.prototype.onExtend = function () {};
  ViewC.prototype.render = function (r, live, e) {
    paint(this.v, r, e.session.mode === 'char'); scrollLines(this.txt, this.v, 0);
    $('speed').textContent = CFG.ui === 'en' ? live.wpm : live.speed; $('acc').textContent = live.acc == null ? '–' : live.acc; $('left').textContent = live.left;
    $('bar').style.transform = 'scaleX(' + live.frac + ')';
    if (e.done) return;
    var p = this.light(r.next), say = $('kb-say');
    say.textContent = '';
    if (p) {
      say.appendChild(D.createTextNode(S.nextKey + ' ')); say.appendChild(el('b', '', keyLabel(r.next)));
      say.appendChild(D.createTextNode(' · ' + (p.shift ? 'Shift + ' : '') + S.fingers[p.finger]));
    }
  };
  ViewC.prototype.onFinish = function (res, rep, e) {
    fillResult(res, rep, e);
    /* 숫자 띠도 결과 값으로 맞춘다(치는 중의 어림값과 결과의 식이 어긋나 보이지 않게) */
    $('speed').textContent = num(res.v); $('acc').textContent = rep.accText; $('left').textContent = rep.secsText;
    this.lit = [];
    litMap(this.keys, res, true);
    var pass = $('r-pass'), again = $('again');
    pass.textContent = e.drill ? '' : res.pass ? (e.lesson < 4 ? fmt(S.passed, { n: e.lesson + 1 }) : S.passedAll) : fmt(S.notPassed, { a: TJ.lessons.PASS_ACC });
    pass.classList.toggle('ok', !!res.pass);
    again.firstChild.nodeValue = (res.pass && e.lesson < 4 && !e.drill ? fmt(S.nextLesson, { name: S.lessons[e.lesson + 1] }) : S.againBtn) + ' ';
    $('kb-legend').hidden = false; $('kb-say').hidden = true;
    $('playbox').hidden = true; $('result').hidden = false;
    root.classList.remove('kb-off');
    Array.prototype.forEach.call($('steps').children, function (b, i) { b.classList.toggle('done', e.passed.indexOf(i) >= 0); });
  };

  /* ================= 화면 B: 보고 치는 글 + 내가 친 글(문장 연습) ================= */
  function ViewB() {
    this.txt = $('txt'); this.v = null; this.lines = []; this.cur = -1; this.bars = []; this.keys = board($('kb'));
    var spark = $('spark');
    for (var i = 0; i < 30; i++) { var b = D.createElement('i'); spark.appendChild(b); this.bars.push(b); }
  }
  /* 브라우저가 줄을 나눈 대로 줄 목록을 만든다(문장이 끝나면 줄도 바뀐다) */
  ViewB.prototype.measure = function (chars) {
    var txt = this.txt;
    txt.classList.add('measuring');
    var v = buildText(txt, chars, 0, null, true), out = [], top = null, from = 0;
    v.spans.forEach(function (s, i) {
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
    this.v = buildText(this.txt, e.T.chars, this.lines[k][0], this.lines[k][1]);
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
    syncOpts(e);
  };
  ViewB.prototype.onExtend = function () {};
  ViewB.prototype.render = function (r, live, e) {
    var k = 0, lines = this.lines, T = e.T;
    while (k + 1 < lines.length && r.cursor >= lines[k + 1][0]) k++;
    if (k !== this.cur) this.show(e, k);
    paint(this.v, r, e.session.mode === 'char');
    /* 내가 친 글: 이 줄에 해당하는 단어만 */
    var w0 = 0; while (w0 < T.words.length && T.words[w0].ci[0] < lines[k][0]) w0++;
    $('mine-t').textContent = r.value.split(/[ \n]/).slice(w0).join(' ');
    $('speed').textContent = live.speed; $('acc').textContent = live.acc == null ? '–' : live.acc;
    var done = 0; for (var i = 0; i < r.cursor && i < T.chars.length; i++) if (T.chars[i] === '\n') done++;
    $('left').textContent = (e.done ? e.count : Math.min(e.count, done + 1)) + '/' + e.count;
    $('bar').style.transform = 'scaleX(' + live.frac + ')';
    var s = e.session.samples, n = s.length, bars = this.bars;
    if (n) {
      var maxv = 1, vals = [];
      for (var j = Math.max(0, n - 30); j < n; j++) { var d = s[j].net - (j ? s[j - 1].net : 0); vals.push({ v: Math.max(0, d), er: s[j].miss > (j ? s[j - 1].miss : 0) }); if (d > maxv) maxv = d; }
      vals.forEach(function (x, q) { bars[q].style.transform = 'scaleY(' + Math.max(0.05, x.v / maxv).toFixed(2) + ')'; bars[q].className = x.er ? 'er' : 'on'; });
    }
  };
  ViewB.prototype.onFinish = function (res, rep, e) {
    fillResult(res, rep, e);
    $('speed').textContent = num(rep.speed); $('g-label').textContent = S.thisRun;
    $('acc').textContent = rep.accText;
    litMap(this.keys, res, true);
    $('playbox').hidden = true; $('result').hidden = false;
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

  var view = CFG.layout === 'c' ? new ViewC() : CFG.layout === 'b' ? new ViewB() : new ViewA();
  var E = new Engine(view);
  renderRecords(E);
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
