// 내 정보: 닉네임, 내가 쓴 글·댓글, 로그아웃, 탈퇴
(async function () {
  'use strict';
  const { sb, h, S, $, num } = App;
  const ok = await App.init({ active: '', needLogin: true });
  if (!ok) return;
  const me = App.user;
  const root = $('#me-root');
  if (!App.profile) await App.loadProfile();
  const prof = App.profile || { nickname: App.nick(), is_admin: false, created_at: me.created_at };

  // ---------- 프로필 ----------
  const nickText = h('span', null, prof.nickname);
  const avatar = h('span', { class: 'avatar lg', 'aria-hidden': 'true' }, prof.nickname.slice(0, 1));
  const editBox = h('div', { class: 'nick-edit', hidden: true });
  const nickInput = h('input', { class: 'input', maxlength: '12', 'aria-label': '새 닉네임', value: prof.nickname });
  const nickNote = h('p', { class: 'hint', style: 'margin-top:6px' }, '2~12자, 한글·영문·숫자·밑줄(_)');
  const saveBtn = h('button', { class: 'btn sm primary', type: 'button' }, '저장');
  const cancelBtn = h('button', { class: 'btn sm ghost', type: 'button' }, '취소');
  editBox.append(nickInput, saveBtn, cancelBtn);
  const editBtn = h('button', { class: 'btn xs ghost', type: 'button' }, '닉네임 바꾸기');
  editBtn.addEventListener('click', () => { editBox.hidden = false; nickNote.hidden = false; editBtn.hidden = true; nickInput.focus(); nickInput.select(); });
  cancelBtn.addEventListener('click', () => { editBox.hidden = true; nickNote.hidden = true; editBtn.hidden = false; nickInput.value = prof.nickname; });
  nickNote.hidden = true;
  saveBtn.addEventListener('click', async () => {
    const v = nickInput.value.trim();
    if (v === prof.nickname) { cancelBtn.click(); return; }
    if (!/^[가-힣a-zA-Z0-9_]{2,12}$/.test(v)) { App.toast('2~12자, 한글·영문·숫자·밑줄(_)만 쓸 수 있어요', 'error'); return; }
    saveBtn.classList.add('is-busy');
    const r = await sb.from('profiles').update({ nickname: v }).eq('id', me.id).select('nickname');
    saveBtn.classList.remove('is-busy');
    if (r.error || !r.data.length) { App.toast(r.error ? App.friendlyError(r.error) : '바꾸지 못했어요.', 'error'); return; }
    prof.nickname = v;
    if (App.profile) App.profile.nickname = v;
    nickText.textContent = v;
    avatar.textContent = v.slice(0, 1);
    App.refreshHeader();
    cancelBtn.click();
    App.toast('닉네임을 바꿨어요');
  });

  root.append(
    h('div', { class: 'profile-card' },
      avatar,
      h('div', { class: 'who' },
        h('div', { class: 'nick' }, nickText, prof.is_admin ? h('span', { class: 'admin-badge' }, '운영자') : null),
        h('div', { class: 'mail' }, `${me.email} · ${App.fullTime(prof.created_at || me.created_at).slice(0, 10)} 가입`),
        editBox, nickNote),
      editBtn));

  if (prof.is_admin) {
    root.append(h('div', { class: 'login-nudge', style: 'margin-top:14px' },
      h('span', null, '운영자 계정이에요. 신고된 글과 댓글을 확인할 수 있어요.'),
      h('a', { class: 'btn primary sm', href: '/admin/' }, '신고함 열기')));
  }

  // ---------- 내가 쓴 글·댓글 ----------
  const tabPosts = h('button', { type: 'button', class: 'on' }, '내가 쓴 글');
  const tabComments = h('button', { type: 'button' }, '내가 쓴 댓글');
  const listBox = h('div');
  root.append(h('div', { class: 'inline-tabs', role: 'tablist' }, tabPosts, tabComments), listBox);

  async function showPosts() {
    tabPosts.classList.add('on'); tabComments.classList.remove('on');
    listBox.replaceChildren(h('ul', { class: 'post-list card' }, App.skeleton(4)));
    const r = await sb.from('posts').select(App.LIST_COLS, { count: 'exact' }).eq('author_id', me.id).order('created_at', { ascending: false }).limit(50);
    if (r.error) { listBox.replaceChildren(h('div', { class: 'card' }, App.empty('불러오지 못했어요', App.friendlyError(r.error)))); return; }
    tabPosts.textContent = `내가 쓴 글 ${num(r.count || 0)}`;
    if (!r.data.length) {
      listBox.replaceChildren(h('div', { class: 'card' }, App.empty('아직 쓴 글이 없어요', '', h('a', { class: 'btn primary sm', href: '/write/' }, '첫 글 쓰기'))));
      return;
    }
    listBox.replaceChildren(h('ul', { class: 'post-list card' }, r.data.map((p) => App.postRow(p))));
  }
  async function showComments() {
    tabComments.classList.add('on'); tabPosts.classList.remove('on');
    listBox.replaceChildren(h('ul', { class: 'post-list card' }, App.skeleton(4)));
    const r = await sb.from('comments').select('id,content,created_at,post:posts!comments_post_id_fkey(id,title)', { count: 'exact' })
      .eq('author_id', me.id).order('created_at', { ascending: false }).limit(50);
    if (r.error) { listBox.replaceChildren(h('div', { class: 'card' }, App.empty('불러오지 못했어요', App.friendlyError(r.error)))); return; }
    tabComments.textContent = `내가 쓴 댓글 ${num(r.count || 0)}`;
    if (!r.data.length) { listBox.replaceChildren(h('div', { class: 'card' }, App.empty('아직 쓴 댓글이 없어요'))); return; }
    listBox.replaceChildren(h('ul', { class: 'mini-list card' }, r.data.map((c) =>
      h('li', null,
        h('a', { href: c.post ? `/post/?id=${c.post.id}#c${c.id}` : '#', style: 'min-width:0;flex:1' },
          h('span', { class: 't', style: 'display:block' }, c.content),
          h('span', { class: 'sub' }, c.post ? `‘${c.post.title}’에 단 댓글` : '(지워진 글)')),
        h('span', { class: 's' }, App.timeAgo(c.created_at))))));
  }
  tabPosts.addEventListener('click', showPosts);
  tabComments.addEventListener('click', showComments);
  showPosts();

  // ---------- 로그아웃·탈퇴 ----------
  const logout = h('button', { class: 'btn ghost', type: 'button' }, '로그아웃');
  logout.addEventListener('click', async () => {
    logout.classList.add('is-busy');
    await sb.auth.signOut();
    App.flash('로그아웃했어요');
    location.href = '/';
  });
  root.append(h('div', { class: 'account-actions' }, logout));

  const leave = h('button', { class: 'btn sm danger-ghost', type: 'button' }, '회원 탈퇴');
  leave.addEventListener('click', async () => {
    const typed = h('input', { class: 'input', 'aria-label': '확인 글자', placeholder: '탈퇴' });
    const done = await App.modal({
      title: '정말 탈퇴할까요?',
      desc: '내가 쓴 글·댓글·사진이 모두 지워지고 되돌릴 수 없어요.',
      body: [h('p', { class: 'hint' }, '확인을 위해 아래 칸에 ‘탈퇴’라고 적어 주세요.'), typed],
      confirm: '탈퇴하기', danger: true,
      onConfirm: async () => {
        if (typed.value.trim() !== '탈퇴') { App.toast('‘탈퇴’라고 적어 주세요', 'error'); typed.focus(); return false; }
        const files = await sb.storage.from('post-images').list(me.id, { limit: 1000 });
        if (files.data && files.data.length) await App.removeImages(files.data.map((f) => `${me.id}/${f.name}`));
        const r = await sb.rpc('delete_my_account');
        if (r.error) { App.toast(App.friendlyError(r.error), 'error'); return false; }
        await sb.auth.signOut().catch(() => {});
        return true;
      },
    });
    if (done) { App.flash('탈퇴했어요. 그동안 고마웠어요.'); location.href = '/'; }
  });
  root.append(h('section', { class: 'danger-zone' },
    h('h2', null, '회원 탈퇴'),
    h('p', null, '탈퇴하면 내가 쓴 글·댓글·사진이 모두 지워져요. 되돌릴 수 없어요.'),
    leave));
  document.title = `내 정보 · ${S.name}`;
})();
