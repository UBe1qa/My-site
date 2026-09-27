// 첫 화면: 인사말 + 인기글 + 새 글
(async function () {
  'use strict';
  const { sb, h, S } = App;
  await App.init({ active: 'home' });

  document.querySelector('#hot-hint').textContent = `추천 ${S.hotLikes}개 이상`;
  document.querySelector('#check-hot').textContent = `추천 ${S.hotLikes}개면 인기글`;

  // 로그인한 사람에게는 가입 안내 대신 짧은 인사
  if (App.user) {
    document.getElementById('hero').classList.add('compact');
    document.querySelector('.hero-copy').replaceChildren(
      h('p', { class: 'eyebrow' }, `반가워요, ${App.nick()}님`),
      h('h1', null, '오늘은 어떤 이야기를', h('br'), h('span', { class: 'hl' }, '올려 볼까요?')),
      h('p', { class: 'lead' }, '자유·질문·사진 게시판 중 하나를 골라 쓰면 돼요.'),
      h('div', { class: 'cta' },
        h('a', { class: 'btn primary', href: '/write/' }, '글쓰기'),
        h('a', { class: 'btn ghost', href: '/me/' }, '내가 쓴 글')));
  }

  const hotList = document.getElementById('hot-list');
  const latest = document.getElementById('latest-list');
  hotList.append(...App.skeleton(4));
  latest.append(...App.skeleton(6));

  const [hot, notices, recent] = await Promise.all([
    sb.from('posts').select(App.LIST_COLS).gte('like_count', S.hotLikes).eq('is_notice', false)
      .order('like_count', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    sb.from('posts').select(App.LIST_COLS).eq('is_notice', true).order('created_at', { ascending: false }).limit(3),
    sb.from('posts').select(App.LIST_COLS).eq('is_notice', false).order('created_at', { ascending: false }).limit(15),
  ]);

  hotList.replaceChildren();
  if (hot.error) {
    hotList.append(h('li', { class: 'empty small' }, App.friendlyError(hot.error)));
  } else if (!hot.data.length) {
    hotList.append(h('li', { class: 'empty small' }, `아직 인기글이 없어요. 추천 ${S.hotLikes}개를 받으면 여기에 올라와요.`));
  } else {
    hot.data.forEach((p, i) => hotList.append(h('li', null,
      h('a', { href: `/post/?id=${p.id}` },
        h('span', { class: 'rank' }, String(i + 1)),
        h('span', { class: 'hot-title' }, h('span', { class: 't' }, p.title),
          p.comment_count > 0 ? h('span', { class: 'cc' }, `[${p.comment_count}]`) : null),
        h('span', { class: 'likes' }, '추천 ' + App.num(p.like_count))))));
  }

  latest.replaceChildren();
  if (recent.error) {
    latest.append(h('li', null, App.empty('글을 불러오지 못했어요', App.friendlyError(recent.error))));
    return;
  }
  const rows = (notices.data || []).concat(recent.data || []);
  if (!rows.length) {
    latest.append(h('li', null, App.empty('아직 글이 없어요', '처음으로 글을 남겨 보세요.',
      h('a', { class: 'btn primary sm', href: App.user ? '/write/' : '/login/?mode=signup&next=%2Fwrite%2F' }, '첫 글 쓰기'))));
  } else {
    rows.forEach((p) => latest.append(App.postRow(p)));
  }
})();
