// 글쓰기 · 글 고치기 (사진 올리기 포함)
(async function () {
  'use strict';
  const { sb, h, S, params, $, num } = App;
  const editId = parseInt(params.get('id'), 10) || null;
  const ok = await App.init({ active: '', needLogin: true, board: params.get('b') });
  if (!ok) return;

  const form = $('#w-form');
  const title = $('#w-t');
  const content = $('#w-c');
  const msg = $('#w-msg');
  const submit = $('#w-submit');
  const fileInput = $('#w-file');
  const prevBox = $('#w-prev');
  const noticeWrap = $('#w-notice-wrap');
  const noticeBox = $('#w-notice');

  let post = null;          // 고치는 중인 글
  let existing = [];        // 이미 올라가 있는 사진
  let removed = [];         // 뺀 사진 (저장하면 지워요)
  const added = [];         // 새로 고른 사진
  let dirty = false;

  const startBoard = App.boardOf(params.get('b')) ? params.get('b') : S.boards[0].slug;
  $('#w-boards').append(...S.boards.map((b) => h('label', null,
    h('input', { type: 'radio', name: 'board', value: b.slug, checked: b.slug === startBoard }),
    h('span', null, b.full))));
  if (App.isAdmin()) noticeWrap.hidden = false;

  function showMsg(text, focusEl) {
    msg.textContent = text;
    msg.hidden = false;
    if (focusEl) focusEl.focus();
    else msg.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const setCount = () => {
    $('#w-t-n').textContent = `${title.value.length}/80`;
    $('#w-c-n').textContent = `${num(content.value.length)}/10,000`;
  };

  if (editId) {
    document.title = `글 고치기 · ${S.name}`;
    $('#w-title').textContent = '글 고치기';
    $('#w-sub').textContent = '고친 뒤 아래 버튼을 누르면 바로 바뀌어요.';
    submit.textContent = '고친 내용 올리기';
    const r = await sb.from('posts').select('id,author_id,board_slug,title,content,images,is_notice').eq('id', editId).maybeSingle();
    if (r.error || !r.data) {
      form.replaceChildren(h('div', { class: 'card' }, App.empty('글을 찾을 수 없어요', '지워졌거나 주소가 잘못됐어요.', h('a', { class: 'btn primary sm', href: '/' }, '첫 화면으로'))));
      return;
    }
    if (r.data.author_id !== App.user.id) {
      form.replaceChildren(h('div', { class: 'card' }, App.empty('내 글만 고칠 수 있어요', '다른 사람의 글은 고칠 수 없어요.', h('a', { class: 'btn primary sm', href: `/post/?id=${editId}` }, '글로 돌아가기'))));
      return;
    }
    post = r.data;
    existing = (post.images || []).slice();
    title.value = post.title;
    content.value = post.content;
    noticeBox.checked = post.is_notice;
    const radio = form.querySelector(`input[name=board][value="${post.board_slug}"]`);
    if (radio) radio.checked = true;
    $('#w-cancel').href = `/post/?id=${post.id}`;
  } else {
    $('#w-cancel').href = App.boardOf(params.get('b')) ? `/board/?b=${params.get('b')}` : '/';
  }
  setCount();

  // ---------- 사진 ----------
  const kept = () => existing.filter((p) => !removed.includes(p));
  const photoCount = () => kept().length + added.length;
  const addBtn = h('button', { class: 'add-photo', type: 'button', onclick: () => fileInput.click() },
    App.icon('plus'), h('span', null, '사진 추가'));
  function preview(src, onRemove) {
    return h('div', { class: 'preview' },
      h('img', { src, alt: '' }),
      h('button', { type: 'button', class: 'x', 'aria-label': '이 사진 빼기', onclick: onRemove }, App.icon('x')));
  }
  function renderPreviews() {
    prevBox.replaceChildren();
    kept().forEach((p) => prevBox.append(preview(App.imgUrl(p), () => { removed.push(p); dirty = true; renderPreviews(); })));
    added.forEach((a) => prevBox.append(preview(a.url, () => {
      URL.revokeObjectURL(a.url);
      added.splice(added.indexOf(a), 1);
      renderPreviews();
    })));
    if (photoCount() < S.maxImages) prevBox.append(addBtn);
    $('#w-photo-n').textContent = `${photoCount()}/${S.maxImages}`;
  }
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    for (const f of files) {
      if (photoCount() >= S.maxImages) { App.toast(`사진은 ${S.maxImages}장까지 올릴 수 있어요`); break; }
      try {
        const prepared = await App.prepareImage(f);
        added.push({ prepared, url: URL.createObjectURL(prepared.blob) });
        dirty = true;
      } catch (e) {
        App.toast(e.message || '사진을 넣지 못했어요', 'error');
      }
      renderPreviews();
    }
  });
  renderPreviews();

  // ---------- 저장 ----------
  [title, content].forEach((el) => el.addEventListener('input', () => { dirty = true; msg.hidden = true; setCount(); }));
  form.addEventListener('change', () => { dirty = true; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;
    const board = (form.querySelector('input[name=board]:checked') || {}).value;
    const t = title.value.trim();
    const c = content.value.trim();
    if (!board) return showMsg('게시판을 골라 주세요.');
    if (!t) return showMsg('제목을 써 주세요.', title);
    if (!c && photoCount() === 0) return showMsg('내용을 쓰거나 사진을 한 장 이상 올려 주세요.', content);

    submit.classList.add('is-busy');
    const label = submit.textContent;
    submit.textContent = added.length ? '사진 올리는 중…' : '올리는 중…';
    const uploaded = [];
    try {
      for (const a of added) uploaded.push(await App.uploadImage(a.prepared));
      const images = kept().concat(uploaded);
      let postId;
      if (post) {
        const r = await sb.from('posts').update({ board_slug: board, title: t, content: c, images }).eq('id', post.id).select('id');
        if (r.error) throw r.error;
        if (!r.data.length) throw new Error('권한이 없어요. 내 글만 고칠 수 있어요.');
        postId = post.id;
        await App.removeImages(removed);
      } else {
        const r = await sb.from('posts').insert({ board_slug: board, title: t, content: c, images }).select('id').single();
        if (r.error) throw r.error;
        postId = r.data.id;
      }
      if (App.isAdmin() && noticeBox.checked !== !!(post && post.is_notice)) {
        await sb.rpc('set_notice', { p_post_id: postId, p_value: noticeBox.checked });
      }
      dirty = false;
      App.flash(post ? '글을 고쳤어요' : '글을 올렸어요');
      location.href = `/post/?id=${postId}`;
    } catch (err) {
      await App.removeImages(uploaded);
      submit.classList.remove('is-busy');
      submit.textContent = label;
      showMsg(App.friendlyError(err));
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
})();
