/* AI 영상 노트 — 화면 그리기
   내용(요약·챕터·숫자)은 data.js에서 고쳐요. 이 파일은 그 내용을 화면에 배치만 해요. */
(function () {
  'use strict';
  var S = window.SITE, C = window.CHAPTERS, V = window.VIDEOS;
  var LABEL = { must: '영상으로 꼭 보기', skim: '요약으로 충분', later: '필요할 때 구간만' };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 작은 도구 ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function secs(t) { return String(t).split(':').map(Number).reduce(function (a, b) { return a * 60 + b; }, 0); }
  function hm(m) { var h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + '시간 ' + r + '분' : h + '시간') : r + '분'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKo(d) { return d ? d.replace(/-/g, '.') : ''; }
  function chIds(c) { return c.order.map(function (o) { return o.id; }); }
  function chOf(id) { return C.filter(function (c) { return c.id === V[id].chapter; })[0]; }
  function sumSecs(ids) { return ids.reduce(function (a, id) { return a + secs(V[id].duration); }, 0); }
  function mins(ids) { return Math.round(sumSecs(ids) / 60); }            // 부분 길이: 반올림
  var allIds = C.reduce(function (a, c) { return a.concat(chIds(c)); }, []);
  var totalMin = Math.floor(sumSecs(allIds) / 60);                         // 전체 길이: 시계처럼 버림
  function readMin(ids) {                                                  // 요약 읽는 시간 (1분 500자)
    var n = ids.reduce(function (a, id) {
      var v = V[id];
      return a + (v.headline + v.summary + (v.key_points || []).map(function (k) { return k.title + k.body; }).join('')).length;
    }, 0);
    return Math.max(1, Math.ceil(n / 500));
  }
  function href(id) { return '/chapter/?id=' + V[id].chapter + '#' + id; }
  function chHref(c) { return '/chapter/?id=' + c.id; }
  function thumb(id, big) { return 'https://i.ytimg.com/vi/' + id + (big ? '/maxresdefault.jpg' : '/hqdefault.jpg'); }
  function yt(id, t) { return 'https://www.youtube.com/watch?v=' + id + (t ? '&t=' + t + 's' : ''); }

  /* ---------- 다 본 영상 (이 브라우저에만 저장) ---------- */
  var KEY = 'ai-video-notes:seen', mem = [];
  var Seen = {
    all: function () {
      try { var raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw) || []; } catch (e) { /* 저장소를 못 쓰면 이 창에서만 기억 */ }
      return mem;
    },
    toggle: function (id) {
      var s = this.all().slice(), i = s.indexOf(id);
      if (i >= 0) s.splice(i, 1); else s.push(id);
      mem = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ }
    }
  };
  function idsOf(key) {
    if (key === 'all') return allIds;
    var c = C.filter(function (x) { return x.id === key; })[0];
    return c ? chIds(c) : [];
  }
  function syncSeen() {
    var s = Seen.all();
    $$('[data-seen-id]').forEach(function (el) {
      var on = s.indexOf(el.getAttribute('data-seen-id')) >= 0;
      el.classList.toggle('is-seen', on);
      if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', String(on));
      var txt = $('.txt', el);
      if (txt) txt.textContent = on ? '봤어요' : '다 보면 체크';
    });
    $$('[data-seen-count]').forEach(function (el) {
      var ids = idsOf(el.getAttribute('data-seen-count'));
      el.textContent = ids.filter(function (id) { return s.indexOf(id) >= 0; }).length + '/' + ids.length;
    });
    $$('[data-seen-prog]').forEach(function (el) {
      var ids = idsOf(el.getAttribute('data-seen-prog'));
      el.style.width = (ids.filter(function (id) { return s.indexOf(id) >= 0; }).length / ids.length * 100) + '%';
    });
  }
  var afterSeen = null;

  /* ---------- 영상 재생 (이 페이지 안에서) ---------- */
  function player(v) {
    var img = '<img src="' + thumb(v.id, true) + '" data-fallback="' + thumb(v.id) + '" alt="" loading="lazy">';
    if (v.noembed) {  // 채널이 다른 사이트 재생을 막아 둔 영상은 유튜브로 열기
      return '<div class="player" data-player="' + v.id + '"><a class="poster" href="' + yt(v.id) + '" target="_blank" rel="noopener" aria-label="' +
        esc(v.headline) + ' — 유튜브에서 보기 (새 창)">' + img + '<span class="play">▶ 유튜브에서 보기 · ' + v.duration + ' ↗</span></a></div>';
    }
    return '<div class="player" data-player="' + v.id + '">' +
      '<button type="button" class="poster" data-play="' + v.id + '" data-t="0" aria-label="' + esc(v.headline) + ' — 여기서 재생">' +
      img + '<span class="play">▶ 여기서 재생 · ' + v.duration + '</span></button></div>';
  }
  function jumpLink(v, t) {  // '바로 가는 장면'의 시간 하나
    var s = secs(t.t);
    if (v.noembed) {
      return '<a class="go" href="' + yt(v.id, s) + '" target="_blank" rel="noopener" aria-label="' + t.t + '부터 유튜브에서 보기: ' + esc(t.label) + '">' + t.t + '</a>';
    }
    return '<button type="button" class="go" data-play="' + v.id + '" data-t="' + s + '" aria-label="' + t.t + '부터 재생: ' + esc(t.label) + '">' + t.t + '</button>';
  }
  function play(id, t) {
    var v = V[id], box = document.querySelector('[data-player="' + id + '"]');
    if (!box || v.noembed) { window.open(yt(id, t), '_blank', 'noopener'); return; }
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?start=' + (t || 0) +
      '&autoplay=1&rel=0&playsinline=1" title="' + esc(v.headline) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" ' +
      'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    var r = box.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }
  function fixImgs(root) {  // 큰 썸네일이 없으면(유튜브는 120px 회색 그림을 줌) 보통 썸네일로
    $$('img[data-fallback]', root).forEach(function (img) {
      function swap() { if (img.src !== img.getAttribute('data-fallback')) img.src = img.getAttribute('data-fallback'); }
      img.addEventListener('error', swap);
      img.addEventListener('load', function () { if (img.naturalWidth && img.naturalWidth <= 120) swap(); });
      if (img.complete && img.naturalWidth && img.naturalWidth <= 120) swap();
    });
  }

  document.addEventListener('click', function (e) {
    var tg = e.target.closest('[data-seen-toggle]');
    if (tg) { Seen.toggle(tg.getAttribute('data-seen-toggle')); syncSeen(); if (afterSeen) afterSeen(); return; }
    var pl = e.target.closest('[data-play]');
    if (pl) { e.preventDefault(); play(pl.getAttribute('data-play'), +(pl.getAttribute('data-t') || 0)); }
  });

  /* ---------- 위·아래 공통 ---------- */
  function frame(active) {
    var h = $('#site-header');
    if (h) h.outerHTML = '<header class="site-head"><div class="wrap bar">' +
      '<a class="logo" href="/">AI 영상 <b>노트</b></a>' +
      '<nav class="gnav" aria-label="챕터">' + C.map(function (c) {
        return '<a href="' + chHref(c) + '"' + (active === c.id ? ' aria-current="page"' : '') + '><span class="no">' + c.no + '</span>' + esc(c.name) + '</a>';
      }).join('') + '</nav></div></header>';
    var f = $('#site-footer');
    if (f) f.outerHTML = '<footer class="site-foot"><div class="wrap">' +
      '<p>' + esc(S.source) + ' · ' + dateKo(S.updated) + ' 기준</p>' +
      '<p>요약은 각 영상의 자동 자막과 설명란을 바탕으로 정리했어요. 수익·성과 숫자는 만든 사람의 주장이고, 영상의 권리는 각 채널에 있어요.</p>' +
      '</div></footer>';
  }
  function fill(sel, text) { $$(sel).forEach(function (el) { el.textContent = text; }); }

  /* ---------- 홈 ---------- */
  function home() {
    frame('home');
    var n = allIds.length;
    var must = allIds.filter(function (id) { return V[id].verdict === 'must'; });
    fill('[data-n-total]', n);
    fill('[data-time-total]', hm(totalMin));
    fill('[data-n-ch]', C.length);

    // 목차
    $('#toc').innerHTML = '<div class="toc-head"><b>목차</b><span>' + C.length + '개 챕터 · 봤어요 <span data-seen-count="all"></span></span></div>' +
      C.map(function (c) {
        var ids = chIds(c);
        return '<a href="' + chHref(c) + '"><span class="n">' + c.no + '</span><span class="t">' + esc(c.title) +
          '<span class="s">' + esc(c.name) + ' · ' + ids.length + '편 · 영상 ' + hm(mins(ids)) + ' · 읽기 ' + readMin(ids) + '분</span></span>' +
          '<span class="p" data-seen-count="' + c.id + '"></span></a>';
      }).join('');

    // 먼저 볼 영상
    var mustMin = mins(must);
    $('#first-title').textContent = '화면 보며 따라 할 ' + must.length + '개부터, ' + hm(mustMin) + '이에요';
    $('#first-lead').textContent = '나머지 ' + (n - must.length) + '개는 요약부터 읽고, 필요한 장면만 골라 봐도 돼요.';
    $('#lenbar').innerHTML =
      '<div class="lenbar-head"><span>영상 ' + n + '개를 길이대로 나란히</span><span><em>빨간 칸</em> = 먼저 볼 ' + must.length + '개 · ' + hm(mustMin) + ' / 전체 ' + hm(totalMin) + '</span></div>' +
      '<div class="tbar">' + allIds.map(function (id) {
        var v = V[id];
        return '<a href="' + href(id) + '" class="' + (v.verdict === 'must' ? 'must' : '') + '" style="flex:' + secs(v.duration) + '" title="' + esc(v.short + ' · ' + v.duration) + '" aria-label="' + esc(v.short + ' ' + v.duration) + '"></a>';
      }).join('') + '</div>' +
      '<div class="tlabels" aria-hidden="true">' + C.map(function (c) {
        return '<span style="flex:' + sumSecs(chIds(c)) + '"><b>' + c.no + '</b>' + esc(c.name) + '</span>';
      }).join('') + '</div>';
    $('#first-cards').innerHTML = must.map(function (id) {
      var v = V[id], c = chOf(id);
      return '<a class="card" href="' + href(id) + '"><div class="thumb"><img src="' + thumb(id) + '" alt="" loading="lazy"><span class="len">' + v.duration + '</span></div>' +
        '<div><div class="ch">' + c.no + ' ' + esc(c.name) + '</div><h3>' + esc(v.headline) + '</h3><p>' + esc(v.verdict_reason) + '</p></div></a>';
    }).join('');

    // 공통 결론
    $('#insights').innerHTML = window.INSIGHTS.map(function (it, i) {
      return '<div><div class="n">' + pad(i + 1) + '</div><h3>' + esc(it.t) + '</h3><p>' + esc(it.b) + '</p><div class="refs">' +
        it.refs.map(function (id) { return '<a href="' + href(id) + '"><b>' + chOf(id).no + '</b>' + esc(V[id].short) + '</a>'; }).join('') + '</div></div>';
    }).join('');

    // 제목과 실제
    $('#vs').innerHTML = window.TITLE_VS.map(function (r) {
      var v = V[r.id];
      return '<a class="vs-row" href="' + href(r.id) + '"><div><div class="q">' + esc(r.claim) + '</div><small>' + esc(v.channel) + ' · ' + esc(v.short) + '</small></div>' +
        '<div class="real"><b>영상 속 실제</b><p>' + esc(r.real) + '</p></div></a>';
    }).join('');

    // 전체 목록 + 거르기
    var counts = { all: n, must: 0, skim: 0, later: 0 };
    allIds.forEach(function (id) { counts[V[id].verdict]++; });
    $('#filters').innerHTML = [['all', '전체'], ['must', LABEL.must], ['skim', LABEL.skim], ['later', LABEL.later], ['unseen', '아직 안 본 것']].map(function (f) {
      return '<button type="button" data-filter="' + f[0] + '" aria-pressed="' + (f[0] === 'all') + '">' + f[1] + '<span class="c" data-fcount="' + f[0] + '">' + (f[0] === 'unseen' ? '' : counts[f[0]]) + '</span></button>';
    }).join('');
    var no = 0;
    $('#list').innerHTML = C.map(function (c) {
      return '<div class="grp" data-grp="' + c.id + '"><b>' + c.no + '</b><a href="' + chHref(c) + '">' + esc(c.name) + '</a><span>' + esc(c.title) + '</span></div>' +
        chIds(c).map(function (id) {
          var v = V[id]; no++;
          return '<div class="row" data-id="' + id + '" data-v="' + v.verdict + '" data-seen-id="' + id + '">' +
            '<span class="no">' + pad(no) + '</span>' +
            '<div class="tt"><a class="t" href="' + href(id) + '">' + esc(v.headline) + '</a><span class="o">' + esc(v.channel) + ' · ' + esc(v.title) + '</span></div>' +
            '<div class="meta"><span class="d">' + v.duration + '</span><span class="chip ' + v.verdict + '">' + LABEL[v.verdict] + '</span></div>' +
            '<button type="button" class="seen-toggle" data-seen-toggle="' + id + '" data-seen-id="' + id + '" aria-pressed="false" aria-label="다 봤어요: ' + esc(v.short) + '"><span class="seen-dot">✓</span></button></div>';
        }).join('');
    }).join('') + '<p class="empty" hidden>여기에 해당하는 영상이 없어요.</p>';
    var cur = 'all';
    function apply() {
      var s = Seen.all(), shown = 0;
      $$('#list .row').forEach(function (r) {
        var id = r.getAttribute('data-id');
        var ok = cur === 'all' || (cur === 'unseen' ? s.indexOf(id) < 0 : r.getAttribute('data-v') === cur);
        r.hidden = !ok; if (ok) shown++;
      });
      $$('#list .grp').forEach(function (g) {
        var ch = g.getAttribute('data-grp');
        g.hidden = !$$('#list .row').some(function (r) { return !r.hidden && V[r.getAttribute('data-id')].chapter === ch; });
      });
      $('#list .empty').hidden = shown > 0;
      $('[data-fcount="unseen"]').textContent = allIds.filter(function (id) { return s.indexOf(id) < 0; }).length;
    }
    $('#filters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      cur = b.getAttribute('data-filter');
      $$('#filters button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
    afterSeen = apply;

    // 마지막 띠
    var first = C[0], fIds = chIds(first);
    $('#end-lead').textContent = '첫 챕터 ' + first.name + '는 영상 ' + fIds.length + '편(' + hm(mins(fIds)) + ')이고, 요약은 약 ' + readMin(fIds) + '분이면 읽어요.';
    $('#end-go').setAttribute('href', chHref(first));
    $('#end-go').innerHTML = first.no + ' ' + esc(first.name) + '부터 읽기 <span class="arr">→</span>';

    fixImgs(document);
    syncSeen();
    apply();
  }

  /* ---------- 챕터 ---------- */
  function videoHTML(v, n) {
    var h = '';
    h += '<article class="vid" id="' + v.id + '">';
    h += '<div class="vid-top"><span class="vid-no">' + pad(n) + '</span><span class="chip ' + v.verdict + '">' + LABEL[v.verdict] + '</span>' +
      '<span>' + esc(v.format) + ' · ' + esc(v.difficulty) + ' · ' + v.duration + ' · ' + dateKo(v.published) + '</span></div>';
    h += '<h2>' + esc(v.headline) + '</h2>';
    h += '<p class="orig">원래 제목: ' + esc(v.title) + ' · ' + esc(v.channel) + '</p>';
    h += player(v);
    h += '<p class="sum">' + esc(v.summary) + '</p>';
    h += '<p class="for"><b>이런 분께</b>' + esc(v.for_whom) + '</p>';
    h += '<h3>핵심</h3><ol class="points">' + v.key_points.map(function (k) { return '<li><b>' + esc(k.title) + '</b><p>' + esc(k.body) + '</p></li>'; }).join('') + '</ol>';
    if (v.result) {
      h += '<h3>실험 결과</h3><div class="result"><div><span>조건</span><p>' + esc(v.result.setup) + '</p></div><div><span>결과</span><p>' + esc(v.result.outcome) +
        '</p></div><div><span>교훈</span><p>' + esc(v.result.lesson) + '</p></div></div>';
    }
    if (v.tiers) {
      h += '<h3>부업 등급표</h3><table class="tiers"><tbody>' + v.tiers.map(function (t, i) {
        return '<tr class="' + (i < 2 ? 'top' : '') + '"><th scope="row">' + esc(t.tier) + '</th><td>' + t.items.map(function (it) {
          var parts = it.split(' — ');
          return '<p><b>' + esc(parts[0]) + '</b>' + (parts.length > 1 ? ' — ' + esc(parts.slice(1).join(' — ')) : '') + '</p>';
        }).join('') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (v.predictions) h += '<h3>이런 전망을 해요</h3><ul class="says">' + v.predictions.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
    if (v.actions) h += '<h3>그래서 하라는 것</h3><ul class="says">' + v.actions.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
    if (v.numbers && v.numbers.length) {
      h += '<h3>숫자로 보면</h3><div class="nums">' + v.numbers.map(function (x) {
        return '<div><b>' + esc(x.value) + '</b><span>' + esc(x.label) + '</span>' + (x.claim ? '<em class="claim">영상 속 주장</em>' : '') + '</div>';
      }).join('') + '</div>';
    }
    h += '<h3>바로 가는 장면</h3><p class="hint">' + (v.noembed
      ? '이 채널은 다른 사이트에서 재생을 막아 둬서, 시간을 누르면 유튜브에서 그 장면부터 열려요.'
      : '시간을 누르면 위 화면에서 그 장면부터 재생돼요.') + '</p><ul class="tl">' + v.timeline.map(function (t) {
      return '<li>' + jumpLink(v, t) + '<span>' + esc(t.label) + '</span></li>';
    }).join('') + '</ul>';
    h += '<div class="try"><b>바로 해 볼 것</b><p>' + esc(v.try_first) + '</p></div>';
    h += '<div class="warn"><b>알고 보기</b><p>' + esc(v.watch_out) + '</p></div>';
    if (v.in_description) h += '<div class="desc"><b>영상 설명란에는</b><p>' + esc(v.in_description) + '</p></div>';
    if (v.tools && v.tools.length) h += '<div class="tools" aria-label="영상에 나온 도구">' + v.tools.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
    h += '<div class="vid-foot"><button type="button" class="seen-btn" data-seen-toggle="' + v.id + '" data-seen-id="' + v.id + '" aria-pressed="false">' +
      '<span class="seen-dot">✓</span><span class="txt">다 보면 체크</span></button>' +
      '<a class="yt" href="' + yt(v.id) + '" target="_blank" rel="noopener">유튜브에서 열기 ↗</a></div>';
    var rel = (v.related || []).filter(function (r) { return V[r.id]; });
    if (rel.length) {
      h += '<p class="rel"><b>같이 보면 좋은 영상</b>' + rel.map(function (r) {
        return '<a href="' + href(r.id) + '">' + chOf(r.id).no + ' ' + esc(V[r.id].short) + ' — ' + esc(r.why) + '</a>';
      }).join('') + '</p>';
    }
    return h + '</article>';
  }

  function chapter() {
    var q = new URLSearchParams(location.search).get('id');
    var c = C.filter(function (x) { return x.id === q; })[0] || C[0];
    var idx = C.indexOf(c), nxt = C[idx + 1], ids = chIds(c);
    frame(c.id);
    document.title = c.no + ' ' + c.name + ' — ' + c.title + ' · ' + S.name;

    $('#ch-hero').innerHTML = '<p class="label">챕터 ' + c.no + ' · ' + esc(c.name) + '</p><h1>' + esc(c.title) + '</h1><p class="lede">' + esc(c.lede) + '</p>' +
      '<div class="ch-stats"><span>영상 <b>' + ids.length + '편</b></span><span>길이 <b>' + hm(mins(ids)) + '</b></span><span>요약 읽기 <b>약 ' + readMin(ids) + '분</b></span>' +
      '<span>봤어요 <b data-seen-count="' + c.id + '"></b></span><span class="bar"><span class="prog"><i data-seen-prog="' + c.id + '"></i></span></span></div>';

    var h = '<section class="blk"><p class="blk-title">이 챕터의 핵심</p><ol class="keys">' + c.points.map(function (p, i) {
      return '<li><span class="n">' + (i + 1) + '</span><div><b>' + esc(p.t) + '</b><p>' + esc(p.b) + '</p></div></li>';
    }).join('') + '</ol></section>';
    if (c.highlights) {
      h += '<section class="blk"><p class="blk-title">결과 한눈에</p><div class="hl">' + c.highlights.map(function (x) {
        return '<a href="#' + x.id + '"><b>' + esc(x.value) + '</b><span>' + esc(x.label) + '</span></a>';
      }).join('') + '</div></section>';
    }
    h += '<section class="blk"><p class="blk-title">보는 순서</p><ol class="order">' + c.order.map(function (o) {
      var v = V[o.id];
      return '<li><div><a href="#' + o.id + '">' + esc(v.headline) + '</a><span class="m">' + v.duration + ' · ' + LABEL[v.verdict] + '</span><p>' + esc(o.why) + '</p></div></li>';
    }).join('') + '</ol>' + (c.conflict ? '<div class="note"><b>영상끼리 엇갈리는 점</b>' + esc(c.conflict) + '</div>' : '') + '</section>';
    h += ids.map(function (id, i) { return videoHTML(V[id], i + 1); }).join('');
    $('#ch-main').innerHTML = h;

    $('#ch-side').innerHTML = '<div class="side-head"><b>이 챕터 영상</b><span data-seen-count="' + c.id + '"></span></div>' +
      ids.map(function (id, i) {
        var v = V[id];
        return '<a href="#' + id + '" data-seen-id="' + id + '"><span class="n">' + (i + 1) + '</span><span><span class="t">' + esc(v.short) + '</span><small>' +
          v.duration + ' · ' + LABEL[v.verdict] + '</small></span><span class="seen-dot" aria-hidden="true">✓</span></a>';
      }).join('') +
      (nxt ? '<a class="side-next" href="' + chHref(nxt) + '">다음 챕터: ' + nxt.no + ' ' + esc(nxt.name) + ' →</a>' : '<a class="side-next" href="/">처음 화면으로 →</a>');

    $('#ch-next').innerHTML = nxt
      ? '<a class="next" href="' + chHref(nxt) + '"><div><small>다음 챕터 ' + nxt.no + ' · ' + esc(nxt.name) + '</small><strong>' + esc(nxt.title) + '</strong><span>영상 ' +
        chIds(nxt).length + '편 · ' + hm(mins(chIds(nxt))) + ' · 요약 읽기 약 ' + readMin(chIds(nxt)) + '분</span></div><span class="arr">→</span></a>'
      : '<a class="next" href="/#all"><div><small>마지막 챕터예요</small><strong>전체 목록에서 안 본 영상 고르기</strong><span>다 본 영상은 ✓로 표시돼요.</span></div><span class="arr">→</span></a>';

    fixImgs(document);
    syncSeen();
    if (location.hash) {
      // 글꼴·그림이 늦게 들어오면 위쪽 글 높이가 바뀌어서, 들어온 뒤에 한 번 더 맞춰요 (직접 스크롤을 시작하면 멈춤)
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1))), moved = false;
      var stop = function () { moved = true; };
      ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
      var jump = function () { if (el && !moved) el.scrollIntoView(); };
      if (el) {
        setTimeout(jump, 0);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(jump);
        window.addEventListener('load', function () { setTimeout(jump, 50); }, { once: true });
      }
    }
  }

  window.App = { home: home, chapter: chapter };
})();
