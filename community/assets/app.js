// ─────────────────────────────────────────────
// 마당 · 모든 페이지가 함께 쓰는 기능
// (머리 메뉴, 로그인 상태, 목록 한 줄, 시간 표시, 알림 창, 사진 줄이기 등)
// ─────────────────────────────────────────────
(function () {
  'use strict';
  const S = window.SITE;
  const sb = window.supabase.createClient(S.supabaseUrl, S.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // ---------- 화면 요소 만들기 (글자는 항상 '글자'로만 넣어서 안전하게) ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const params = new URLSearchParams(location.search);

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>',
    thumb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7Zm0 0 3.6-6.9A1.9 1.9 0 0 1 14.2 5l-.6 4h5a2 2 0 0 1 2 2.4l-1.3 6.9a2 2 0 0 1-2 1.7H7"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  };
  function icon(name, cls) {
    const s = h('span', { class: cls || 'ico', 'aria-hidden': 'true' });
    s.innerHTML = ICONS[name] || '';
    return s;
  }

  // ---------- 숫자·시간 ----------
  const num = (n) => Number(n || 0).toLocaleString('ko-KR');
  function timeAgo(iso) {
    const d = new Date(iso), now = new Date();
    const s = (now - d) / 1000;
    if (s < 60) return '방금 전';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
    if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}.${d.getDate()}`;
    return `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}.${d.getDate()}`;
  }
  function fullTime(iso) {
    const d = new Date(iso), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // ---------- 게시판 ----------
  const boardOf = (slug) => S.boards.find((b) => b.slug === slug);
  const boardName = (slug) => (boardOf(slug) || {}).name || slug;
  const LIST_COLS = 'id,board_slug,title,images,is_notice,view_count,like_count,comment_count,created_at,updated_at,author:profiles!posts_author_id_fkey(nickname,is_admin)';
  function imgUrl(path) {
    return `${S.supabaseUrl}/storage/v1/object/public/post-images/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  // ---------- 알아듣기 쉬운 오류 문장 ----------
  function friendlyError(err) {
    const m = (err && (err.message || err.error_description || err.msg)) || String(err || '');
    const map = [
      [/Invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요.'],
      [/Email not confirmed/i, '메일 인증이 아직 안 된 계정이에요. 운영자에게 알려 주세요.'],
      [/already registered|already been registered|already exists/i, '이미 가입한 이메일이에요. 로그인해 주세요.'],
      [/Password should be at least|password.*(short|length)/i, '비밀번호가 너무 짧아요. 8자 이상으로 써 주세요.'],
      [/weak.?password|known to be weak|pwned/i, '너무 쉬운 비밀번호예요. 다른 비밀번호를 써 주세요.'],
      [/Unable to validate email|invalid format|email.*invalid|invalid.*email/i, '이메일 주소를 다시 확인해 주세요.'],
      [/sending confirmation email|not authorized/i, '지금은 가입 확인 메일을 보낼 수 없어요. 운영자에게 알려 주세요.'],
      [/For security purposes|rate limit|too many requests/i, '잠깐만요, 너무 빨라요. 잠시 후 다시 해 주세요.'],
      [/JWT expired|session.*missing|not authenticated|Auth session/i, '로그인이 풀렸어요. 다시 로그인해 주세요.'],
      [/profiles_nickname_lower_key/i, '이미 누가 쓰는 닉네임이에요.'],
      [/profiles_nickname_check|valid_nickname/i, '닉네임은 2~12자, 한글·영문·숫자·밑줄(_)만 쓸 수 있어요.'],
      [/reports_once/i, '이미 신고했어요. 운영자가 확인할게요.'],
      [/post_likes_pkey/i, '이미 추천했어요.'],
      [/posts_content_len/i, '내용을 쓰거나 사진을 한 장 이상 올려 주세요.'],
      [/posts_title_check/i, '제목은 1~80자로 써 주세요.'],
      [/row-level security|permission denied/i, '권한이 없어요. 내 글·댓글만 고칠 수 있어요.'],
      [/Payload too large|maximum allowed size|exceeded/i, '사진이 너무 커요.'],
      [/mime type|not supported/i, '이 형식의 사진은 올릴 수 없어요. JPG·PNG로 올려 주세요.'],
      [/Failed to fetch|NetworkError|Load failed|network/i, '인터넷 연결을 확인해 주세요.'],
    ];
    for (const [re, ko] of map) if (re.test(m)) return ko;
    if (/[가-힣]/.test(m)) return m; // 데이터베이스가 보낸 한국어 안내(도배 방지 등)는 그대로
    return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
  }

  // ---------- 알림 ----------
  let toastTimer;
  function toast(msg, type) {
    let el = $('.toast');
    if (!el) {
      el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.append(el);
    }
    el.textContent = msg;
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  const flash = (msg) => { try { sessionStorage.setItem('flash', msg); } catch (e) { /* 저장 못 해도 괜찮아요 */ } };
  function showFlash() {
    try {
      const m = sessionStorage.getItem('flash');
      if (m) { sessionStorage.removeItem('flash'); toast(m); }
    } catch (e) { /* 무시 */ }
  }

  // ---------- 확인 창 ----------
  function modal({ title, desc, body, confirm = '확인', cancel = '취소', danger = false, onConfirm }) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const ok = h('button', { class: 'btn sm ' + (danger ? 'danger' : 'primary'), type: 'button' }, confirm);
      const no = h('button', { class: 'btn sm ghost', type: 'button' }, cancel);
      const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h3', null, title),
        desc ? h('p', { class: 'desc' }, desc) : null,
        body ? h('div', { class: 'body' }, body) : null,
        h('div', { class: 'acts' }, no, ok));
      const back = h('div', { class: 'modal-back' }, box);
      const onKey = (e) => { if (e.key === 'Escape') close(false); };
      function close(v) {
        back.remove();
        document.removeEventListener('keydown', onKey);
        if (prev && prev.focus) prev.focus();
        resolve(v);
      }
      back.addEventListener('mousedown', (e) => { if (e.target === back) close(false); });
      no.addEventListener('click', () => close(false));
      ok.addEventListener('click', async () => {
        if (onConfirm) {
          ok.classList.add('is-busy');
          let res;
          try { res = await onConfirm(); } finally { ok.classList.remove('is-busy'); }
          if (res === false) return;
        }
        close(true);
      });
      document.addEventListener('keydown', onKey);
      document.body.append(back);
      (box.querySelector('input:not([type=radio]),textarea') || box.querySelector('input') || ok).focus();
    });
  }

  // ---------- 링크 자동 연결 ----------
  function linkify(text) {
    const frag = document.createDocumentFragment();
    const re = /https?:\/\/[^\s<>"']+/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      const url = m[0].replace(/[)\].,!?'"]+$/, '');
      frag.append(text.slice(last, m.index));
      frag.append(h('a', { href: url, target: '_blank', rel: 'nofollow ugc noopener noreferrer' }, url));
      last = m.index + url.length;
      re.lastIndex = last;
    }
    frag.append(text.slice(last));
    return frag;
  }

  // ---------- 목록 조각 ----------
  function authorEl(a, cls) {
    return h('span', { class: cls || 'author' },
      (a && a.nickname) || '(알 수 없음)',
      a && a.is_admin ? h('span', { class: 'admin-badge' }, '운영자') : null);
  }
  function postRow(p, opts) {
    const showBoard = !opts || opts.board !== false;
    return h('li', { class: p.is_notice ? 'notice' : null },
      h('a', { class: 'row', href: `/post/?id=${p.id}` },
        h('span', { class: 'row-title' },
          p.is_notice ? h('span', { class: 'badge notice' }, '공지')
            : showBoard ? h('span', { class: 'badge' }, boardName(p.board_slug)) : null,
          h('span', { class: 't' }, p.title),
          p.images && p.images.length ? icon('image', 'pic') : null,
          p.comment_count > 0 ? h('span', { class: 'cc' }, `[${p.comment_count}]`) : null),
        h('span', { class: 'row-meta' },
          authorEl(p.author, 'm-author'),
          h('span', { class: 'm-time' }, timeAgo(p.created_at)),
          h('span', { class: 'm-views' }, '조회 ' + num(p.view_count)),
          h('span', { class: 'm-likes' }, '추천 ' + num(p.like_count)))));
  }
  function skeleton(n) {
    return Array.from({ length: n }, (_, i) =>
      h('li', { class: 'skel-row', 'aria-hidden': 'true' }, h('div', { class: 'skel', style: `width:${55 + ((i * 17) % 35)}%` })));
  }
  function empty(title, text, btn) {
    return h('div', { class: 'empty' }, h('strong', null, title), text ? h('span', null, text) : null, btn || null);
  }
  function pager(total, page, size, hrefFor) {
    const pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) return null;
    const nav = h('nav', { class: 'pager', 'aria-label': '쪽 번호' });
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    if (page > 1) nav.append(h('a', { href: hrefFor(page - 1), 'aria-label': '이전 쪽' }, '‹'));
    for (let i = start; i <= end; i++) {
      nav.append(i === page ? h('span', { class: 'on', 'aria-current': 'page' }, String(i)) : h('a', { href: hrefFor(i) }, String(i)));
    }
    if (page < pages) nav.append(h('a', { href: hrefFor(page + 1), 'aria-label': '다음 쪽' }, '›'));
    return nav;
  }

  // ---------- 사진 줄이기·올리기 ----------
  function loadViaImg(file) {
    return new Promise((res) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { res(img); URL.revokeObjectURL(url); };
      img.onerror = () => { res(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }
  const toBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));
  async function prepareImage(file) {
    if (!file.type || !file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있어요.');
    if (file.type === 'image/gif') {
      if (file.size > 3 * 1024 * 1024) throw new Error('움직이는 사진(GIF)은 3MB까지만 올릴 수 있어요.');
      return { blob: file, ext: 'gif', type: 'image/gif' };
    }
    let src = null;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = await loadViaImg(file); }
    if (!src) throw new Error('이 사진은 열 수 없어요. JPG나 PNG로 바꿔서 올려 주세요.');
    const W = src.naturalWidth || src.width, H = src.naturalHeight || src.height;
    let max = 1600, q = 0.85;
    for (let i = 0; i < 4; i++) {
      const scale = Math.min(1, max / Math.max(W, H));
      const w = Math.max(1, Math.round(W * scale)), hh = Math.max(1, Math.round(H * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = hh;
      const ctx = c.getContext('2d');
      ctx.drawImage(src, 0, 0, w, hh);
      let blob = await toBlob(c, 'image/webp', q), type = 'image/webp', ext = 'webp';
      if (!blob || blob.type !== 'image/webp') {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, hh);
        blob = await toBlob(c, 'image/jpeg', q); type = 'image/jpeg'; ext = 'jpg';
      }
      if (blob && blob.size <= 2.8 * 1024 * 1024) return { blob, type, ext };
      max = Math.round(max * 0.8); q = Math.max(0.6, q - 0.1);
    }
    throw new Error('사진이 너무 커요. 더 작은 사진으로 올려 주세요.');
  }
  async function uploadImage(prepared) {
    const rnd = Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join('');
    const path = `${App.user.id}/${Date.now().toString(36)}-${rnd}.${prepared.ext}`;
    const { error } = await sb.storage.from('post-images').upload(path, prepared.blob, {
      contentType: prepared.type, cacheControl: '31536000', upsert: false,
    });
    if (error) throw error;
    return path;
  }
  async function removeImages(paths) {
    if (!paths || !paths.length) return;
    try { await sb.storage.from('post-images').remove(paths); } catch (e) { /* 사진 정리는 실패해도 넘어가요 */ }
  }

  // ---------- 안전한 돌아갈 주소 ----------
  function safeNext(v, fallback) {
    return typeof v === 'string' && /^\/(?![\/\\])/.test(v) ? v : (fallback || '/');
  }
  const here = () => location.pathname + location.search;

  // ---------- 머리·바닥 ----------
  function renderHeader(active) {
    const tabs = [['home', '/', '홈'], ['hot', '/board/?b=hot', '인기글']]
      .concat(S.boards.map((b) => [b.slug, `/board/?b=${b.slug}`, b.name]));
    const header = h('header', { class: 'top' },
      h('div', { class: 'wrap top-in' },
        h('a', { class: 'logo', href: '/', 'aria-label': `${S.name} 첫 화면` },
          h('span', { class: 'logo-mark', 'aria-hidden': 'true' }, S.mark), h('span', null, S.name)),
        h('nav', { class: 'tabs', 'aria-label': '게시판' },
          tabs.map(([k, href, label]) => h('a', { href, class: k === active ? 'on' : null, 'aria-current': k === active ? 'page' : null }, label))),
        h('div', { class: 'top-right' },
          h('form', { class: 'search', action: '/board/', role: 'search' },
            h('input', { type: 'hidden', name: 'b', value: 'all' }),
            icon('search'),
            h('input', { name: 'q', placeholder: '글 검색', 'aria-label': '글 검색', maxlength: '50', required: true, value: params.get('q') || null })),
          h('a', { class: 'icon-btn', href: '/board/?b=all&find=1', 'aria-label': '글 검색' }, icon('search')),
          h('div', { class: 'auth-area', id: 'auth-area' }))));
    document.body.prepend(header);
  }
  function renderAuthArea() {
    const box = $('#auth-area');
    if (!box) return;
    box.replaceChildren();
    const next = encodeURIComponent(here());
    if (!App.user) {
      if (location.pathname.startsWith('/login')) return;
      box.append(
        h('a', { class: 'btn-text', href: `/login/?next=${next}` }, '로그인'),
        h('a', { class: 'btn primary sm', href: `/login/?mode=signup&next=${next}` }, '가입하기'));
    } else {
      const nick = App.nick();
      if (!location.pathname.startsWith('/write')) {
        box.append(h('a', { class: 'btn primary sm', href: App.writeHref() }, '글쓰기'));
      }
      box.append(h('a', { class: 'me-chip', href: '/me/', title: '내 정보' },
        h('span', { class: 'avatar', 'aria-hidden': 'true' }, nick.slice(0, 1)),
        h('span', { class: 'me-name' }, nick)));
    }
  }
  function renderFooter() {
    document.body.append(h('footer', { class: 'foot' },
      h('div', { class: 'foot-in' },
        h('span', null, `${S.name} · ${S.about}`),
        h('nav', null, h('a', { href: '/rules/' }, '이용 규칙'), h('a', { href: '/rules/#privacy' }, '개인정보 처리방침')))));
  }

  // ---------- 로그인 상태 ----------
  const App = {
    S, sb, h, $, icon, num, timeAgo, fullTime, boardOf, boardName, LIST_COLS, imgUrl, friendlyError,
    toast, flash, modal, linkify, authorEl, postRow, skeleton, empty, pager, prepareImage, uploadImage,
    removeImages, safeNext, params, here,
    user: null,
    profile: null,
    board: null, // 지금 보고 있는 게시판 (글쓰기 버튼이 그 게시판으로 가게)
    nick() {
      return (this.profile && this.profile.nickname) || (this.user && this.user.user_metadata && this.user.user_metadata.nickname) || '회원';
    },
    isAdmin() { return !!(this.profile && this.profile.is_admin); },
    writeHref() { return this.board && boardOf(this.board) ? `/write/?b=${this.board}` : '/write/'; },
    async loadProfile() {
      if (!this.user) { this.profile = null; return null; }
      const { data } = await sb.from('profiles').select('id,nickname,is_admin,created_at').eq('id', this.user.id).maybeSingle();
      this.profile = data || null;
      return this.profile;
    },
    refreshHeader() { renderAuthArea(); },
    async init(opts) {
      const o = opts || {};
      this.board = o.board || null;
      renderHeader(o.active || '');
      renderFooter();
      showFlash();
      try {
        const { data } = await sb.auth.getSession();
        this.user = (data && data.session && data.session.user) || null;
      } catch (e) { this.user = null; }
      if (this.user) await this.loadProfile().catch(() => null);
      renderAuthArea();
      sb.auth.onAuthStateChange((event, session) => {
        const u = (session && session.user) || null;
        if ((u && u.id) !== (this.user && this.user.id)) {
          this.user = u;
          if (!u) this.profile = null;
          renderAuthArea();
        }
      });
      if (o.needLogin && !this.user) {
        location.replace('/login/?next=' + encodeURIComponent(here()));
        return false;
      }
      return true;
    },
  };
  window.App = App;
})();
