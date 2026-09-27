// 로그인 · 가입하기
(async function () {
  'use strict';
  const { sb, h, params, $ } = App;
  await App.init({ active: '' });
  const next = App.safeNext(params.get('next'), '/');
  if (App.user) { location.replace(next); return; }

  // ---------- 탭 ----------
  const tabs = { login: $('#tab-login'), signup: $('#tab-signup') };
  const panes = { login: $('#pane-login'), signup: $('#pane-signup') };
  function show(mode, focus) {
    Object.keys(tabs).forEach((k) => {
      const on = k === mode;
      tabs[k].classList.toggle('on', on);
      tabs[k].setAttribute('aria-selected', String(on));
      panes[k].hidden = !on;
    });
    document.title = `${mode === 'signup' ? '가입하기' : '로그인'} · ${App.S.name}`;
    const u = new URL(location.href);
    if (mode === 'signup') u.searchParams.set('mode', 'signup'); else u.searchParams.delete('mode');
    history.replaceState(null, '', u.pathname + u.search);
    if (focus) panes[mode].querySelector('input').focus();
  }
  tabs.login.addEventListener('click', () => show('login', true));
  tabs.signup.addEventListener('click', () => show('signup', true));
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(a.dataset.go, true); }));
  show(params.get('mode') === 'signup' ? 'signup' : 'login');

  function fail(form, text) {
    const m = form.querySelector('.msg');
    m.className = 'msg error';
    m.textContent = text;
    m.hidden = false;
  }
  function busy(form, on, text) {
    const b = form.querySelector('button[type=submit]');
    if (on) { b.dataset.label = b.textContent; b.textContent = text; b.classList.add('is-busy'); }
    else { b.textContent = b.dataset.label || b.textContent; b.classList.remove('is-busy'); }
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  // ---------- 로그인 ----------
  const fl = $('#f-login');
  fl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = fl.email.value.trim();
    const password = fl.password.value;
    if (!emailOk(email)) return fail(fl, '이메일 주소를 다시 확인해 주세요.');
    if (!password) return fail(fl, '비밀번호를 넣어 주세요.');
    busy(fl, true, '로그인하는 중…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { busy(fl, false); return fail(fl, App.friendlyError(error)); }
    App.flash('다시 만나서 반가워요!');
    location.href = next;
  });

  // ---------- 가입 ----------
  const fs = $('#f-signup');
  const nickMsg = $('#nick-msg');
  const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,12}$/;
  const RESERVED = /(운영자|관리자|운영진|admin|어드민)/i;
  let nickTimer = null;
  let nickState = { value: '', ok: false };
  function setNick(text, cls) { nickMsg.textContent = text; nickMsg.className = cls || ''; }
  async function checkNick() {
    const v = fs.nickname.value.trim();
    if (!v) { setNick('2~12자, 한글·영문·숫자·밑줄(_)'); nickState = { value: v, ok: false }; return false; }
    if (!NICK_RE.test(v)) { setNick('2~12자, 한글·영문·숫자·밑줄(_)만 쓸 수 있어요', 'bad'); nickState = { value: v, ok: false }; return false; }
    if (RESERVED.test(v)) { setNick('운영자로 헷갈릴 수 있는 이름은 쓸 수 없어요', 'bad'); nickState = { value: v, ok: false }; return false; }
    if (nickState.value === v && nickState.checked) return nickState.ok;
    setNick('확인하는 중…');
    const { data, error } = await sb.rpc('nickname_available', { p_nickname: v });
    if (fs.nickname.value.trim() !== v) return false;
    if (error) { setNick('지금은 확인할 수 없어요. 그대로 가입해도 돼요.'); nickState = { value: v, ok: true, checked: false }; return true; }
    nickState = { value: v, ok: !!data, checked: true };
    setNick(data ? '쓸 수 있는 닉네임이에요' : '이미 누가 쓰는 닉네임이에요', data ? 'good' : 'bad');
    return !!data;
  }
  fs.nickname.addEventListener('input', () => { clearTimeout(nickTimer); nickTimer = setTimeout(checkNick, 350); });

  fs.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = fs.nickname.value.trim();
    const email = fs.email.value.trim();
    const password = fs.password.value;
    if (!(await checkNick())) return fail(fs, '닉네임을 확인해 주세요.');
    if (!emailOk(email)) return fail(fs, '이메일 주소를 다시 확인해 주세요.');
    if (password.length < 8) return fail(fs, '비밀번호는 8자 이상으로 써 주세요.');
    if (password !== fs.password2.value) return fail(fs, '비밀번호 확인이 같지 않아요.');
    if (!fs.agree.checked) return fail(fs, '이용 규칙과 개인정보 처리방침에 동의해 주세요.');
    busy(fs, true, '가입하는 중…');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nickname } } });
    if (error) { busy(fs, false); return fail(fs, App.friendlyError(error)); }
    if (data.session) {
      App.flash(`가입을 환영해요, ${nickname}님!`);
      location.href = next;
      return;
    }
    busy(fs, false);
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return fail(fs, '이미 가입한 이메일이에요. 로그인해 주세요.');
    }
    const m = fs.querySelector('.msg');
    m.className = 'msg info';
    m.textContent = `${email}로 확인 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요.`;
    m.hidden = false;
  });
})();
