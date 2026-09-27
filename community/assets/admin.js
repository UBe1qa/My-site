// 운영자: 숫자 한눈에 보기 + 신고함
(async function () {
  'use strict';
  const { sb, h, S, $, num } = App;
  const ok = await App.init({ active: '', needLogin: true });
  if (!ok) return;
  const root = $('#admin-root');
  if (!App.isAdmin()) {
    root.replaceChildren(h('div', { class: 'card' }, App.empty('운영자만 볼 수 있어요', '운영자 계정으로 로그인해 주세요.', h('a', { class: 'btn primary sm', href: '/' }, '첫 화면으로'))));
    return;
  }

  const head = (t) => sb.from(t).select('*', { count: 'exact', head: true });
  const statsBox = h('div', { class: 'stats' });
  root.append(statsBox);
  async function loadStats() {
    const [users, posts, comments, open] = await Promise.all([
      head('profiles'), head('posts'), head('comments'),
      sb.from('reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
    ]);
    statsBox.replaceChildren(...[['회원', users.count], ['글', posts.count], ['댓글', comments.count], ['확인 안 한 신고', open.count]]
      .map(([k, v]) => h('div', { class: 'stat' }, h('b', null, num(v || 0)), h('span', null, k))));
  }

  const listBox = h('div', { class: 'card' });
  root.append(h('div', { class: 'sec-head' }, h('h2', null, '신고함'), h('span', { class: 'hint' }, '확인 안 한 신고가 위에 보여요')), listBox);

  async function load() {
    loadStats();
    listBox.replaceChildren(h('ul', null, App.skeleton(3)));
    const r = await sb.from('reports')
      .select('id,reason,resolved,created_at,post_id,comment_id,post:posts!reports_post_id_fkey(id,title,images),comment:comments!reports_comment_id_fkey(id,content,post_id),reporter:profiles!reports_reporter_id_fkey(nickname)')
      .order('resolved', { ascending: true }).order('created_at', { ascending: false }).limit(100);
    if (r.error) { listBox.replaceChildren(App.empty('신고함을 불러오지 못했어요', App.friendlyError(r.error))); return; }
    if (!r.data.length) { listBox.replaceChildren(App.empty('들어온 신고가 없어요', '신고가 생기면 여기에 보여요.')); return; }
    listBox.replaceChildren(...r.data.map(item));
  }

  function item(rep) {
    const isPost = !!rep.post_id;
    const target = isPost ? rep.post : rep.comment;
    const href = isPost ? `/post/?id=${rep.post_id}` : (rep.comment ? `/post/?id=${rep.comment.post_id}#c${rep.comment_id}` : null);
    const what = target
      ? (isPost ? `글 · ${rep.post.title}` : `댓글 · ${rep.comment.content.slice(0, 60)}`)
      : '(이미 지워진 글·댓글)';
    const box = h('div', { class: 'report' + (rep.resolved ? ' done' : '') },
      h('div', { class: 'what' }, what),
      h('div', { class: 'why' }, `${rep.reason} · 신고한 사람 ${(rep.reporter && rep.reporter.nickname) || '(탈퇴)'} · ${App.timeAgo(rep.created_at)}`));
    const acts = h('div', { class: 'acts' });
    if (href) acts.append(h('a', { class: 'btn xs ghost', href, target: '_blank' }, '보러 가기'));
    if (target) {
      acts.append(h('button', { class: 'btn xs danger-ghost', type: 'button', onclick: async () => {
        const done = await App.modal({
          title: isPost ? '이 글을 지울까요?' : '이 댓글을 지울까요?',
          desc: '규칙에 어긋난 내용이면 지워 주세요. 되돌릴 수 없어요.',
          confirm: '지우기', danger: true,
          onConfirm: async () => {
            const q = isPost ? sb.from('posts').delete().eq('id', rep.post_id) : sb.from('comments').delete().eq('id', rep.comment_id);
            const d = await q.select('id');
            if (d.error || !d.data.length) { App.toast(d.error ? App.friendlyError(d.error) : '지우지 못했어요.', 'error'); return false; }
            if (isPost) await App.removeImages(rep.post.images);
            return true;
          },
        });
        if (done) { App.toast('지웠어요'); load(); }
      } }, isPost ? '글 지우기' : '댓글 지우기'));
    }
    acts.append(h('button', { class: 'btn xs soft', type: 'button', onclick: async () => {
      const u = await sb.from('reports').update({ resolved: !rep.resolved }).eq('id', rep.id).select('id');
      if (u.error) { App.toast(App.friendlyError(u.error), 'error'); return; }
      load();
    } }, rep.resolved ? '다시 확인할래요' : '확인했어요'));
    box.append(acts);
    return box;
  }
  load();
  document.title = `운영자 · ${S.name}`;
})();
