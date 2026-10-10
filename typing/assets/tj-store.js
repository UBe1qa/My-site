/* 토독 기록 저장. 화면(DOM)을 모른다. 브라우저에서는 TJ.Store(window.localStorage), 노드 시험에서는 흉내 저장소를 넘긴다.
   이 기기(브라우저 저장소)에만 남기고 어디로도 보내지 않는다. 쓰는 키는 아래 KEYS 다섯 개뿐이고, 개인정보 처리방침에 같은 이름으로 적혀 있다
   (_dev/check.py 가 이 파일의 키와 방침을 대조한다).
   - todok.runs : 최근 기록(가장 새것부터 50개까지). 한 판의 조건·속도·정확도·시각. 친 글 자체는 저장하지 않는다.
   - todok.best : 조건(도구·글 언어·글 종류·길이)마다의 최고 기록
   - todok.keys : 키마다 틀린 횟수와 맞은 횟수(글 언어별)
   - todok.set  : 마지막으로 고른 설정(글 종류·시간·자판 가리기·자리 연습 단계)
   - todok.lang : 다른 언어판 안내 띠를 닫았다는 표시 */
(function (root) {
  'use strict';
  var KEYS = { runs: 'todok.runs', best: 'todok.best', keys: 'todok.keys', set: 'todok.set', lang: 'todok.lang' };
  var MAX_RUNS = 50;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

  function Store(storage) {
    this.s = storage || null;
  }
  Store.KEYS = KEYS;
  Store.MAX_RUNS = MAX_RUNS;
  Store.prototype._get = function (key, fallback) {
    try {
      var raw = this.s && this.s.getItem(key);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  };
  /* 저장 못 해도(사생활 보호 모드, 용량 초과) 화면은 그대로 돌아야 한다 */
  Store.prototype._put = function (key, v) {
    try { if (this.s) { this.s.setItem(key, JSON.stringify(v)); return true; } } catch (e) { /* 무시 */ }
    return false;
  };
  /* 조건 이름: 같은 조건끼리만 최고·지난 기록을 견준다 */
  Store.cond = function (c) {
    return [c.tool, c.lang, c.kind || '-', c.len || '-', (c.punct ? 'p' : '') + (c.nums ? 'n' : '') || '-'].join('|');
  };
  Store.prototype.runs = function () {
    var list = this._get(KEYS.runs, []);
    if (!Array.isArray(list)) return [];
    return list.filter(function (r) { return isObj(r) && typeof r.cond === 'string' && isNum(r.v) && isNum(r.at); }).slice(0, MAX_RUNS);
  };
  Store.prototype.bests = function () {
    var b = this._get(KEYS.best, {}), out = {};
    if (!isObj(b)) return out;
    Object.keys(b).forEach(function (k) { if (isObj(b[k]) && isNum(b[k].v) && isNum(b[k].at)) out[k] = b[k]; });
    return out;
  };
  Store.prototype.best = function (cond) { return this.bests()[cond] || null; };
  /* 그 조건의 가장 최근 기록 */
  Store.prototype.last = function (cond) {
    var list = this.runs();
    for (var i = 0; i < list.length; i++) if (list[i].cond === cond) return list[i];
    return null;
  };
  /* 한 판을 적는다. run = { cond, v(견줄 값: 한글 글은 타/분, 영어 글은 WPM), unit('ko'|'en'), acc, secs, at, label… }
     돌려주는 값: { first(그 조건의 첫 기록), prev(바로 앞 기록 값), diff(v − prev), best(앞 최고 값), isBest(앞 최고를 넘었나) } */
  Store.prototype.addRun = function (run) {
    var prev = this.last(run.cond), bests = this.bests(), b = bests[run.cond] || null;
    var out = { first: !prev && !b, prev: prev ? prev.v : null, diff: prev ? run.v - prev.v : null, best: b ? b.v : null, isBest: !!b && run.v > b.v };
    var list = this.runs();
    list.unshift(run);
    this._put(KEYS.runs, list.slice(0, MAX_RUNS));
    if (!b || run.v > b.v) { bests[run.cond] = { v: run.v, at: run.at, acc: run.acc }; this._put(KEYS.best, bests); }
    return out;
  };
  /* 키별 틀린 횟수·맞은 횟수 더하기. list = [{ key, miss, hit }] */
  Store.prototype.addKeys = function (lang, list) {
    var all = this._get(KEYS.keys, {});
    if (!isObj(all)) all = {};
    var m = isObj(all[lang]) ? all[lang] : (all[lang] = {});
    list.forEach(function (x) {
      if (!x || typeof x.key !== 'string' || !(x.miss > 0 || x.hit > 0)) return;
      var cur = Array.isArray(m[x.key]) ? m[x.key] : [0, 0];
      m[x.key] = [(+cur[0] || 0) + (x.miss || 0), (+cur[1] || 0) + (x.hit || 0)];
    });
    this._put(KEYS.keys, all);
  };
  /* 쌓인 기록에서 자주 틀린 키: 틀린 횟수가 많은 순, 같으면 틀린 비율이 높은 순 */
  Store.prototype.missed = function (lang, n) {
    var all = this._get(KEYS.keys, {}), m = isObj(all) && isObj(all[lang]) ? all[lang] : {};
    var list = Object.keys(m).filter(function (k) { return Array.isArray(m[k]) && m[k][0] > 0; }).map(function (k) {
      return { key: k, miss: +m[k][0] || 0, hit: +m[k][1] || 0 };
    });
    list.sort(function (a, b) { return b.miss - a.miss || (b.miss / (b.miss + b.hit)) - (a.miss / (a.miss + a.hit)) || (a.key < b.key ? -1 : 1); });
    return n ? list.slice(0, n) : list;
  };
  /* 설정: 페이지(도구)마다 따로 */
  Store.prototype.settings = function (page) {
    var all = this._get(KEYS.set, {});
    return isObj(all) && isObj(all[page]) ? all[page] : {};
  };
  Store.prototype.saveSettings = function (page, patch) {
    var all = this._get(KEYS.set, {});
    if (!isObj(all)) all = {};
    var cur = isObj(all[page]) ? all[page] : {};
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    all[page] = cur;
    this._put(KEYS.set, all);
  };
  Store.prototype.langDismissed = function () { return this._get(KEYS.lang, null) != null; };
  Store.prototype.dismissLang = function () { this._put(KEYS.lang, 1); };
  /* '기록 지우기': 기록 세 가지(최근·최고·키별 횟수)를 지운다. 설정과 안내 띠 표시는 남는다 */
  Store.prototype.clearRecords = function () {
    var s = this.s;
    [KEYS.runs, KEYS.best, KEYS.keys].forEach(function (k) { try { if (s) s.removeItem(k); } catch (e) { /* 무시 */ } });
  };
  Store.prototype.hasRecords = function () { return this.runs().length > 0 || Object.keys(this.bests()).length > 0 || this.missed('ko', 1).length > 0 || this.missed('en', 1).length > 0; };

  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  else (root.TJ = root.TJ || {}).Store = Store;
})(typeof globalThis !== 'undefined' ? globalThis : this);
