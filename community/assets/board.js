// 게시판 목록 · 인기글 · 전체 글 · 검색
(async function () {
  'use strict';
  const { sb, h, S, params, $ } = App;
  const VIRTUAL = {
    hot: { slug: 'hot', name: '인기글', full: '인기글', desc: `추천을 ${S.hotLikes}개 이상 받은 글이에요` },
    all: { slug: 'all', name: '전체', full: '전체 글', desc: '모든 게시판의 글을 새 글부터 보여 줘요' },
  };
  let b = params.get('b') || 'all';
  if (!App.boardOf(b) && !VIRTUAL[b]) b = 'all';
  const real = App.boardOf(b);
  const info = real || VIRTUAL[b];
  const q = (params.get('q') || '').trim().slice(0, 50);
  const page = Math.max(1, parseInt(params.get('p') || '1', 10) || 1);
  const size = S.pageSize;

  await App.init({ active: b === 'all' ? '' : b, board: real ? b : null });
  document.title = `${q ? `‘${q}’ 검색 · ` : ''}${info.full} · ${S.name}`;

  $('#b-title').textContent = q ? `‘${q}’ 검색 결과` : info.full;
  $('#b-desc').textContent = q ? `${info.full}에서 찾았어요` : info.desc;
  const writeHref = App.writeHref();
  $('#b-write').href = App.user ? writeHref : `/login/?next=${encodeURIComponent(writeHref)}`;

  const qi = $('#q');
  qi.value = q;
  qi.placeholder = b === 'all' ? '모든 글에서 검색' : `${info.full}에서 검색`;
  if (params.get('find')) qi.focus();
  $('#b-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = qi.value.trim();
    location.href = `/board/?b=${b}` + (v ? `&q=${encodeURIComponent(v)}` : '');
  });

  const box = $('#b-list');
  const gallery = b === 'photo' && !q;
  box.replaceChildren(h('ul', { class: 'post-list card' }, App.skeleton(8)));

  const from = (page - 1) * size;
  const to = from + size - 1;
  let query;
  if (q) {
    query = sb.rpc('search_posts', { p_query: q, p_board: real ? b : null }, { count: 'exact' }).select(App.LIST_COLS);
    if (b === 'hot') query = query.gte('like_count', S.hotLikes);
  } else {
    query = sb.from('posts').select(App.LIST_COLS, { count: 'exact' }).eq('is_notice', false);
    if (real) query = query.eq('board_slug', b);
    if (b === 'hot') query = query.gte('like_count', S.hotLikes);
    query = query.order('created_at', { ascending: false });
  }
  const noticeQuery = (!q && page === 1 && b !== 'hot')
    ? (real ? sb.from('posts').select(App.LIST_COLS).eq('is_notice', true).eq('board_slug', b)
            : sb.from('posts').select(App.LIST_COLS).eq('is_notice', true))
        .order('created_at', { ascending: false }).limit(5)
    : null;

  const [res, nres] = await Promise.all([query.range(from, to), noticeQuery || Promise.resolve({ data: [] })]);
  box.replaceChildren();
  if (res.error) {
    box.append(h('div', { class: 'card' }, App.empty('글을 불러오지 못했어요', App.friendlyError(res.error))));
    return;
  }
  const posts = res.data || [];
  const notices = (nres && nres.data) || [];
  const total = res.count || 0;

  if (q) {
    const note = $('#b-note');
    note.hidden = false;
    note.textContent = total ? `${App.num(total)}개 찾았어요` : '';
  }

  if (!posts.length && !notices.length) {
    const writeBtn = h('a', { class: 'btn primary sm', href: $('#b-write').href }, '첫 글 쓰기');
    box.append(h('div', { class: 'card' },
      q ? App.empty(`‘${q}’에 맞는 글이 없어요`, '다른 말로 찾아보세요.')
        : b === 'hot' ? App.empty('아직 인기글이 없어요', `마음에 드는 글에 추천을 눌러 주세요. ${S.hotLikes}개를 받으면 여기에 올라와요.`)
          : App.empty('아직 글이 없어요', '처음으로 글을 남겨 보세요.', writeBtn)));
    return;
  }

  const showBoard = !real;
  if (notices.length) {
    box.append(h('ul', { class: 'post-list card', style: 'margin-bottom:14px' }, notices.map((p) => App.postRow(p, { board: showBoard }))));
  }
  if (gallery) {
    box.append(h('div', { class: 'gallery' }, posts.map((p) => {
      const first = p.images && p.images[0];
      return h('a', { class: 'g-item', href: `/post/?id=${p.id}` },
        h('div', { class: 'g-thumb' }, first ? h('img', { src: App.imgUrl(first), alt: '', loading: 'lazy' }) : App.icon('image')),
        h('div', { class: 'g-body' },
          h('div', { class: 'g-title' }, h('span', { class: 't' }, p.title),
            p.comment_count > 0 ? h('span', { class: 'cc' }, `[${p.comment_count}]`) : null),
          h('div', { class: 'g-meta' },
            `${(p.author && p.author.nickname) || '(알 수 없음)'} · ${App.timeAgo(p.created_at)} · 추천 ${App.num(p.like_count)}`)));
    })));
  } else if (posts.length) {
    box.append(h('ul', { class: 'post-list card' }, posts.map((p) => App.postRow(p, { board: showBoard }))));
  }

  const nav = App.pager(total, page, size, (n) => `/board/?b=${b}${q ? `&q=${encodeURIComponent(q)}` : ''}&p=${n}`);
  if (nav) $('#b-pager').append(nav);
})();
