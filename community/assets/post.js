// 글 보기 · 추천 · 신고 · 댓글
(async function () {
  'use strict';
  const { sb, h, S, params, $, icon, num } = App;
  const id = parseInt(params.get('id'), 10);
  await App.init({ active: '' });
  const root = $('#post-root');

  function missing(title, text) {
    root.replaceChildren(h('div', { class: 'card', style: 'margin-top:40px' },
      App.empty(title || '글을 찾을 수 없어요', text || '지워졌거나 주소가 잘못됐어요.',
        h('a', { class: 'btn primary sm', href: '/' }, '첫 화면으로'))));
  }
  if (!id) return missing();

  const POST_COLS = '*, author:profiles!posts_author_id_fkey(nickname,is_admin)';
  const C_COLS = 'id,post_id,author_id,content,created_at,updated_at,author:profiles!comments_author_id_fkey(nickname,is_admin)';
  const { data: post, error } = await sb.from('posts').select(POST_COLS).eq('id', id).maybeSingle();
  if (error) return missing('글을 불러오지 못했어요', App.friendlyError(error));
  if (!post) return missing();

  App.board = post.board_slug;
  App.refreshHeader();
  const tab = document.querySelector(`.tabs a[href="/board/?b=${post.board_slug}"]`);
  if (tab) tab.classList.add('on');
  document.title = `${post.title} · ${S.name}`;

  // 조회수: 한 번 열면 한 번만 올라가게
  let seen = false;
  try { seen = !!sessionStorage.getItem('seen-' + id); } catch (e) { /* 무시 */ }
  if (!seen) {
    sb.rpc('increment_view', { p_post_id: id }).then(() => {});
    try { sessionStorage.setItem('seen-' + id, '1'); } catch (e) { /* 무시 */ }
    post.view_count += 1;
  }

  const me = App.user;
  const mine = !!me && me.id === post.author_id;
  const admin = App.isAdmin();
  const board = App.boardOf(post.board_slug);
  const loginHref = `/login/?next=${encodeURIComponent(App.here())}`;

  // ---------- 본문 ----------
  const likeN = h('b', null, num(post.like_count));
  const metaLikes = h('span', null, '추천 ' + num(post.like_count));
  let liked = false;
  if (me && !mine) {
    const r = await sb.from('post_likes').select('post_id').eq('post_id', id).eq('user_id', me.id).maybeSingle();
    liked = !!(r.data);
  }
  const likeBtn = h('button', { class: 'like-btn' + (liked ? ' on' : ''), type: 'button', 'aria-pressed': String(liked) },
    icon('thumb'), h('span', null, '추천'), likeN);
  likeBtn.addEventListener('click', async () => {
    if (!me) { location.href = loginHref; return; }
    if (mine) { App.toast('내 글에는 추천할 수 없어요'); return; }
    likeBtn.classList.add('is-busy');
    const r = liked
      ? await sb.from('post_likes').delete().eq('post_id', id).eq('user_id', me.id)
      : await sb.from('post_likes').insert({ post_id: id });
    likeBtn.classList.remove('is-busy');
    if (r.error && !/post_likes_pkey/.test(r.error.message || '')) { App.toast(App.friendlyError(r.error), 'error'); return; }
    if (!r.error) post.like_count += liked ? -1 : 1;
    liked = r.error ? true : !liked;
    likeBtn.classList.toggle('on', liked);
    likeBtn.setAttribute('aria-pressed', String(liked));
    likeN.textContent = num(post.like_count);
    metaLikes.textContent = '추천 ' + num(post.like_count);
    if (liked && post.like_count === S.hotLikes) App.toast('이 글이 인기글에 올랐어요!');
  });

  const tools = h('div', { class: 'group' });
  tools.append(h('button', { class: 'btn xs ghost', type: 'button', onclick: copyLink }, icon('link'), '주소 복사'));
  if (me && !mine) tools.append(h('button', { class: 'btn xs ghost', type: 'button', onclick: () => report({ post_id: id }) }, '신고'));
  if (admin) tools.append(h('button', { class: 'btn xs ghost', type: 'button', onclick: toggleNotice }, post.is_notice ? '공지 내리기' : '공지로 올리기'));
  if (mine) tools.append(h('a', { class: 'btn xs ghost', href: `/write/?id=${id}` }, icon('pen'), '수정'));
  if (mine || admin) tools.append(h('button', { class: 'btn xs danger-ghost', type: 'button', onclick: deletePost }, '삭제'));

  const images = post.images || [];
  root.replaceChildren(
    h('nav', { class: 'crumb', 'aria-label': '위치' },
      h('a', { href: `/board/?b=${post.board_slug}` }, board ? board.full : '게시판')),
    h('article', null,
      h('header', { class: 'post-head' },
        post.is_notice ? h('span', { class: 'badge notice', style: 'margin-bottom:10px' }, '공지') : null,
        h('h1', { class: 'post-title' }, post.title),
        h('div', { class: 'post-meta' },
          h('span', { class: 'author' },
            h('span', { class: 'avatar', 'aria-hidden': 'true' }, ((post.author && post.author.nickname) || '?').slice(0, 1)),
            App.authorEl(post.author, 'name')),
          h('span', null, App.fullTime(post.created_at)),
          post.updated_at ? h('span', { title: App.fullTime(post.updated_at) }, '수정됨') : null,
          h('span', null, '조회 ' + num(post.view_count)),
          metaLikes)),
      post.content ? h('div', { class: 'post-body' }, App.linkify(post.content)) : null,
      images.length ? h('div', { class: 'post-images' }, images.map((p, i) =>
        h('a', { href: App.imgUrl(p), target: '_blank', rel: 'noopener' },
          h('img', { src: App.imgUrl(p), alt: `${post.title} 사진 ${i + 1}`, loading: i ? 'lazy' : 'eager' })))) : null,
      h('div', { class: 'post-actions' }, likeBtn),
      h('div', { class: 'post-tools' },
        h('a', { class: 'btn xs soft', href: `/board/?b=${post.board_slug}` }, '목록'),
        tools)),
    h('section', { class: 'comments', id: 'comments', 'aria-label': '댓글' }));

  // ---------- 글 관리 ----------
  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); App.toast('주소를 복사했어요'); }
    catch (e) { App.toast('주소창의 주소를 길게 눌러 복사해 주세요'); }
  }
  async function toggleNotice() {
    const r = await sb.rpc('set_notice', { p_post_id: id, p_value: !post.is_notice });
    if (r.error) { App.toast(App.friendlyError(r.error), 'error'); return; }
    App.flash(post.is_notice ? '공지에서 내렸어요' : '공지로 올렸어요');
    location.reload();
  }
  async function deletePost() {
    const done = await App.modal({
      title: '이 글을 지울까요?',
      desc: '글과 댓글, 사진이 모두 지워지고 되돌릴 수 없어요.',
      confirm: '지우기', danger: true,
      onConfirm: async () => {
        const r = await sb.from('posts').delete().eq('id', id).select('id');
        if (r.error || !r.data.length) { App.toast(r.error ? App.friendlyError(r.error) : '지우지 못했어요.', 'error'); return false; }
        await App.removeImages(images);
        return true;
      },
    });
    if (done) { App.flash('글을 지웠어요'); location.href = `/board/?b=${post.board_slug}`; }
  }
  async function report(target) {
    if (!me) { location.href = loginHref; return; }
    const reasons = ['욕설·비방', '광고·도배', '음란하거나 불쾌한 내용', '남의 개인정보·사진', '기타'];
    const list = h('div', { class: 'radio-list' }, reasons.map((r, i) =>
      h('label', null, h('input', { type: 'radio', name: 'reason', value: r, checked: i === 0 }), r)));
    const more = h('textarea', { class: 'input', rows: '3', maxlength: '200', placeholder: '더 알려 줄 내용이 있으면 적어 주세요 (안 써도 돼요)', style: 'height:auto;padding:10px 12px;font-size:15px' });
    await App.modal({
      title: target.comment_id ? '이 댓글을 신고할까요?' : '이 글을 신고할까요?',
      desc: '운영자가 확인하고 규칙에 어긋나면 지워요.',
      body: [list, more],
      confirm: '신고하기',
      onConfirm: async () => {
        const picked = list.querySelector('input:checked').value;
        const reason = (picked + (more.value.trim() ? ' — ' + more.value.trim() : '')).slice(0, 300);
        const r = await sb.from('reports').insert(Object.assign({ reason }, target));
        if (r.error) {
          App.toast(App.friendlyError(r.error), /reports_once/.test(r.error.message || '') ? undefined : 'error');
          return /reports_once/.test(r.error.message || '');
        }
        App.toast('신고했어요. 운영자가 확인할게요.');
        return true;
      },
    });
  }

  // ---------- 댓글 ----------
  const section = $('#comments');
  const countEl = h('span', { class: 'n' }, '0');
  const list = h('ul', { class: 'comment-list' });
  const emptyNote = h('p', { class: 'hint', style: 'padding:6px 0 4px' }, '아직 댓글이 없어요. 첫 댓글을 남겨 보세요.');
  section.append(h('h2', null, '댓글 ', countEl), list);
  let commentCount = 0;
  const setCount = (n) => { commentCount = n; countEl.textContent = num(n); emptyNote.hidden = n > 0; };

  function commentItem(c) {
    const cMine = !!me && me.id === c.author_id;
    const li = h('li', { id: 'c' + c.id });
    const body = h('div', { class: 'c-body' }, App.linkify(c.content));
    const acts = h('div', { class: 'c-actions' });
    if (cMine) {
      acts.append(h('button', { type: 'button', onclick: () => editComment(c, li, body) }, '수정'));
      acts.append(h('button', { type: 'button', onclick: () => deleteComment(c, li) }, '삭제'));
    } else {
      if (admin) acts.append(h('button', { type: 'button', onclick: () => deleteComment(c, li) }, '삭제'));
      if (me) acts.append(h('button', { type: 'button', onclick: () => report({ comment_id: c.id }) }, '신고'));
    }
    li.append(
      h('div', { class: 'c-meta' },
        App.authorEl(c.author),
        c.author_id === post.author_id ? h('span', { class: 'mine' }, '글쓴이') : null,
        h('span', { title: App.fullTime(c.created_at) }, App.timeAgo(c.created_at)),
        c.updated_at ? h('span', null, '수정됨') : null,
        acts),
      body);
    return li;
  }
  function editComment(c, li, body) {
    if (li.querySelector('.edit-box')) return;
    const ta = h('textarea', { maxlength: '1000', 'aria-label': '댓글 고치기' });
    ta.value = c.content;
    const save = h('button', { class: 'btn xs primary', type: 'button' }, '저장');
    const cancel = h('button', { class: 'btn xs ghost', type: 'button' }, '취소');
    const box = h('div', { class: 'edit-box' }, ta, h('div', { class: 'row' }, cancel, save));
    body.hidden = true;
    li.append(box);
    ta.focus();
    cancel.addEventListener('click', () => { box.remove(); body.hidden = false; });
    save.addEventListener('click', async () => {
      const v = ta.value.trim();
      if (!v) { ta.focus(); return; }
      save.classList.add('is-busy');
      const r = await sb.from('comments').update({ content: v }).eq('id', c.id).select('content,updated_at');
      save.classList.remove('is-busy');
      if (r.error || !r.data.length) { App.toast(r.error ? App.friendlyError(r.error) : '고치지 못했어요.', 'error'); return; }
      Object.assign(c, r.data[0]);
      li.replaceWith(commentItem(c));
      App.toast('댓글을 고쳤어요');
    });
  }
  async function deleteComment(c, li) {
    await App.modal({
      title: '댓글을 지울까요?', desc: '지운 댓글은 되돌릴 수 없어요.', confirm: '지우기', danger: true,
      onConfirm: async () => {
        const r = await sb.from('comments').delete().eq('id', c.id).select('id');
        if (r.error || !r.data.length) { App.toast(r.error ? App.friendlyError(r.error) : '지우지 못했어요.', 'error'); return false; }
        li.remove();
        setCount(commentCount - 1);
        App.toast('댓글을 지웠어요');
        return true;
      },
    });
  }

  const cres = await sb.from('comments').select(C_COLS).eq('post_id', id).order('created_at', { ascending: true });
  if (cres.error) {
    section.append(h('p', { class: 'msg error' }, '댓글을 불러오지 못했어요. ' + App.friendlyError(cres.error)));
  } else {
    cres.data.forEach((c) => list.append(commentItem(c)));
    setCount(cres.data.length);
  }
  section.append(emptyNote);

  if (me) {
    const ta = h('textarea', { maxlength: '1000', placeholder: '댓글을 남겨 보세요', 'aria-label': '댓글 내용' });
    const cnt = h('span', { class: 'count' }, '0/1,000');
    const btn = h('button', { class: 'btn primary sm', type: 'submit' }, '등록');
    const form = h('form', { class: 'comment-form' }, ta, h('div', { class: 'row' }, cnt, btn));
    ta.addEventListener('input', () => { cnt.textContent = `${num(ta.value.length)}/1,000`; });
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') form.requestSubmit(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = ta.value.trim();
      if (!v) { ta.focus(); return; }
      btn.classList.add('is-busy');
      const r = await sb.from('comments').insert({ post_id: id, content: v }).select(C_COLS).single();
      btn.classList.remove('is-busy');
      if (r.error) { App.toast(App.friendlyError(r.error), 'error'); return; }
      ta.value = '';
      cnt.textContent = '0/1,000';
      list.append(commentItem(r.data));
      setCount(commentCount + 1);
    });
    section.append(form);
  } else {
    section.append(h('div', { class: 'login-nudge' },
      h('span', null, '댓글을 쓰려면 로그인해 주세요.'),
      h('a', { class: 'btn primary sm', href: loginHref }, '로그인하고 댓글 쓰기')));
  }

  if (location.hash && /^#c\d+$/.test(location.hash)) {
    const target = document.querySelector(location.hash);
    if (target) { target.scrollIntoView({ block: 'center' }); target.style.background = 'var(--accent-weak)'; }
  }
})();
