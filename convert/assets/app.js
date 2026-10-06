// 인플레이스 화면. 도구마다 '고르기 → 설정 → 변환 → 받기'를 같은 흐름으로 그린다.
// 엔진은 필요할 때만 불러온다(engines/*.js). 파일은 이 브라우저 밖으로 나가지 않는다.
import { TOOLS, KINDS } from './tools.js';

const LANG = document.documentElement.lang.startsWith('ko') ? 'ko' : 'en';
const BASE = LANG === 'ko' ? '/ko/' : '/';
const T = {
  en: {
    choose: 'Choose file', chooseMany: 'Choose files', orDrop: 'or drop it here', orDropMany: 'or drop them here',
    stays: 'Converted on this device. Nothing is uploaded.', convert: 'Convert', working: 'Converting…',
    cancel: 'Cancel', done: 'Done', download: 'Download', downloadAll: 'Download all (ZIP)', share: 'Share',
    again: 'Convert another file', change: 'Choose another file', remove: 'Remove', addMore: 'Add more',
    took: 'Took {s}', copied: 'Copied without re-encoding: same quality, near-instant.',
    estimate: 'Estimated size about {size}', from: 'from', to: 'to', start: 'Start', end: 'End', length: 'Length',
    play: 'Play selection', pause: 'Pause', format: 'Format', quality: 'Quality', bitrate: 'Bitrate',
    fadeIn: 'Fade in', fadeOut: 'Fade out', off: 'Off', exact: 'Exact cut (slower, re-encodes)',
    fast: 'Fast cut snaps to the nearest keyframe, so it may start a moment early.',
    smaller: 'Smaller file', balanced: 'Balanced', better: 'Better quality', resolution: 'Max resolution', original: 'Original',
    fps: 'Frame rate', width: 'Width', height: 'Height', percent: 'Percent', keepRatio: 'Keep aspect ratio', byPixels: 'Pixels', byPercent: 'Percent',
    pageSize: 'Page size', fitImage: 'Fit to image', margin: 'Margin', none: 'None', small: 'Small',
    dpi: 'Resolution', pages: 'Pages', allPages: 'All pages', pagesHint: 'e.g. 1-3, 5', mode: 'Mode',
    extract: 'Pick pages → one PDF', every: 'Every page as its own PDF', chunks: 'Every N pages', n: 'N',
    order: 'Order', up: 'Move up', down: 'Move down', direction: 'Direction',
    header: 'First row is the header', types: 'Detect numbers and true/false', bom: 'Excel-friendly (UTF-8 with BOM)',
    delimiter: 'Delimiter', auto: 'Auto', comma: 'Comma', semicolon: 'Semicolon', tab: 'Tab', sheet: 'Sheet', allSheets: 'All sheets (ZIP)',
    preview: 'Preview', rows: '{n} rows', maxWidth: 'Max width (px)', keep: 'Keep size', liveSize: '{name}: {a} → about {b} ({w}×{h})', savings: '{a} → {b}',
    loading: 'Loading the converter…', reading: 'Reading the file…', waveform: 'Drawing the waveform…',
    errDecode: 'This browser can’t read the {what} in this file. Try the latest Chrome or Edge, or a different file.',
    errEncode: 'This browser can’t create that format. Try another format or the latest Chrome or Edge.',
    errFormat: 'This file type isn’t supported here.', errEncrypted: 'This PDF is password-protected, so it can’t be opened here.',
    errPdf: 'This PDF couldn’t be read. It may be damaged.', errRange: 'Check the page numbers (1 to {n}), e.g. 1-3, 5.',
    errJson: 'This JSON needs to be a list of objects or a list of rows.', errJsonParse: 'This isn’t valid JSON: {m}',
    errXlsx: 'This spreadsheet couldn’t be read.', errMemory: 'The device ran out of memory. Try a shorter range, a smaller file, or a computer.',
    errBrowser: 'This browser doesn’t support in-browser video and audio processing. Use a recent Chrome, Edge, Safari or Firefox.',
    errGeneric: 'Something went wrong: {m}', errType: '{name} isn’t a file this tool can open.', errEmpty: 'No pages selected.',
    whatToDo: 'What do you want to do with it?', openPage: 'Open the full {name} page', video: 'video', audio: 'audio', image: 'image',
    notHere: 'No tool here opens .{ext} files yet.', files: '{n} files', items: '{n} items', sizeWarn: 'Large file: phones may run out of memory.',
    gifLong: 'GIFs over 15 seconds get very large.', copiedHint: 'Will copy without re-encoding if possible.', seconds: 's',
    noAudio: 'This file has no audio track.', noVideo: 'This file has no video track.', result: 'Result'
  },
  ko: {
    choose: '파일 고르기', chooseMany: '파일 고르기', orDrop: '또는 여기에 끌어 놓기', orDropMany: '또는 여러 개를 끌어 놓기',
    stays: '이 기기 안에서 변환해요. 아무것도 올라가지 않아요.', convert: '변환하기', working: '변환 중…',
    cancel: '그만두기', done: '다 됐어요', download: '받기', downloadAll: '모두 받기 (ZIP)', share: '공유',
    again: '다른 파일 변환하기', change: '다른 파일 고르기', remove: '빼기', addMore: '더 넣기',
    took: '{s} 걸림', copied: '다시 인코딩하지 않고 옮겨 담았어요. 화질 그대로, 거의 바로 끝나요.',
    estimate: '예상 크기 약 {size}', from: '', to: '', start: '시작', end: '끝', length: '길이',
    play: '고른 구간 듣기', pause: '멈춤', format: '형식', quality: '품질', bitrate: '비트레이트',
    fadeIn: '서서히 커지기', fadeOut: '서서히 작아지기', off: '안 함', exact: '정확히 자르기 (느림, 다시 인코딩)',
    fast: '빠른 자르기는 가장 가까운 키프레임에서 잘라서 조금 앞에서 시작할 수 있어요.',
    smaller: '작은 파일', balanced: '균형', better: '좋은 화질', resolution: '최대 해상도', original: '원본',
    fps: '초당 장면 수', width: '가로', height: '세로', percent: '비율', keepRatio: '비율 유지', byPixels: '픽셀', byPercent: '비율(%)',
    pageSize: '쪽 크기', fitImage: '이미지 크기에 맞춤', margin: '여백', none: '없음', small: '조금',
    dpi: '해상도', pages: '쪽', allPages: '모든 쪽', pagesHint: '예: 1-3, 5', mode: '나누는 방법',
    extract: '고른 쪽 → PDF 하나', every: '쪽마다 PDF 하나씩', chunks: 'N쪽씩', n: 'N',
    order: '순서', up: '위로', down: '아래로', direction: '방향',
    header: '첫 줄이 제목 줄', types: '숫자와 true/false를 값으로', bom: '엑셀에서 한글 안 깨지게 (UTF-8 BOM)',
    delimiter: '구분 기호', auto: '자동', comma: '쉼표', semicolon: '세미콜론', tab: '탭', sheet: '시트', allSheets: '모든 시트 (ZIP)',
    preview: '미리 보기', rows: '{n}줄', maxWidth: '최대 가로 (px)', keep: '크기 그대로', liveSize: '{name}: {a} → 약 {b} ({w}×{h})', savings: '{a} → {b}',
    loading: '변환기를 불러오는 중…', reading: '파일을 읽는 중…', waveform: '파형을 그리는 중…',
    errDecode: '이 브라우저는 이 파일의 {what}를 읽지 못해요. 최신 크롬·엣지로 열거나 다른 파일로 해 보세요.',
    errEncode: '이 브라우저는 그 형식을 만들지 못해요. 다른 형식을 고르거나 최신 크롬·엣지로 해 보세요.',
    errFormat: '이 파일 형식은 여기서 열 수 없어요.', errEncrypted: '암호가 걸린 PDF라 여기서 열 수 없어요.',
    errPdf: 'PDF를 읽지 못했어요. 파일이 손상됐을 수 있어요.', errRange: '쪽 번호를 확인해 주세요 (1~{n}). 예: 1-3, 5',
    errJson: 'JSON이 객체 목록이나 줄 목록이어야 해요.', errJsonParse: '올바른 JSON이 아니에요: {m}',
    errXlsx: '표 파일을 읽지 못했어요.', errMemory: '기기 메모리가 부족해요. 구간을 줄이거나, 작은 파일로, 또는 컴퓨터에서 해 보세요.',
    errBrowser: '이 브라우저는 동영상·오디오 변환을 지원하지 않아요. 최신 크롬, 엣지, 사파리, 파이어폭스로 열어 주세요.',
    errGeneric: '문제가 생겼어요: {m}', errType: '{name}은(는) 이 도구가 열 수 있는 파일이 아니에요.', errEmpty: '고른 쪽이 없어요.',
    whatToDo: '이 파일로 무엇을 할까요?', openPage: '{name} 페이지로 가기', video: '동영상', audio: '오디오', image: '이미지',
    notHere: '.{ext} 파일을 여는 도구는 아직 없어요.', files: '파일 {n}개', items: '{n}개', sizeWarn: '큰 파일이라 휴대폰에선 메모리가 모자랄 수 있어요.',
    gifLong: '15초가 넘는 GIF는 아주 커져요.', copiedHint: '되면 다시 인코딩하지 않고 옮겨 담아요.', seconds: '초',
    noAudio: '이 파일에는 오디오가 없어요.', noVideo: '이 파일에는 영상이 없어요.', result: '결과'
  }
}[LANG];
const t = (k, v = {}) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');

// ---------- 작은 도구들 ----------
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
export function fmtSize(b) {
  if (b < 1000) return b + ' B';
  if (b < 1e6) return (b / 1e3).toFixed(b < 1e4 ? 1 : 0) + ' KB';
  if (b < 1e9) return (b / 1e6).toFixed(b < 1e7 ? 2 : 1) + ' MB';
  return (b / 1e9).toFixed(2) + ' GB';
}
export function fmtTime(s, dec = 1) {
  if (!isFinite(s)) s = 0;
  const m = Math.floor(s / 60), r = s - m * 60;
  const sec = r.toFixed(dec).padStart(dec ? 3 + dec : 2, '0');
  return m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + sec : m + ':' + sec;
}
function parseTime(str) {
  const p = String(str).trim().split(':').map(Number);
  if (p.some((x) => !isFinite(x))) return NaN;
  return p.reduce((a, x) => a * 60 + x, 0);
}
const extOf = (name) => (name.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
const baseOf = (name) => name.replace(/\.[^.]+$/, '') || 'file';
function kindOf(file) {
  const e = extOf(file.name);
  for (const [k, list] of Object.entries(KINDS)) if (list.includes(e)) return k;
  if (/^video\//.test(file.type)) return 'video';
  if (/^audio\//.test(file.type)) return 'audio';
  if (/^image\//.test(file.type)) return 'image';
  return null;
}
const accepts = (tool, file) => tool.accept.split(',').some((a) => a === '.' + extOf(file.name) || (a.endsWith('/*') && file.type.startsWith(a.slice(0, -1))));
function chips(name, options, value, onChange) {
  const box = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': name });
  const set = (v) => {
    value = v;
    box.querySelectorAll('button').forEach((b) => { const on = b.dataset.v === String(v); b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    onChange && onChange(v);
  };
  for (const [v, label] of options) box.append(h('button', { type: 'button', role: 'radio', 'data-v': v, onclick: () => set(v) }, label));
  box.addEventListener('keydown', (e) => {
    if (!/Arrow(Left|Right|Up|Down)/.test(e.key)) return;
    const bs = [...box.querySelectorAll('button')], i = bs.findIndex((b) => b.dataset.v === String(value));
    const n = bs[(i + (/Right|Down/.test(e.key) ? 1 : bs.length - 1)) % bs.length];
    e.preventDefault(); n.click(); n.focus();
  });
  setTimeout(() => set(value));
  box.get = () => value;
  return box;
}
const field = (label, control, extra) => h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), control, extra || null);
function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked: checked || null, onchange: () => onChange && onChange(input.checked) });
  const el = h('label', { class: 'toggle' }, input, h('span', {}, label));
  el.get = () => input.checked;
  return el;
}
function numInput(label, value, attrs = {}) {
  const input = h('input', { type: 'number', inputmode: 'numeric', value, min: 1, ...attrs });
  return { el: h('label', { class: 'num' }, h('span', {}, label), input), input };
}
function memErr(e) { return e && (e.name === 'RangeError' || /memory|allocation/i.test(e.message || '')); }

// 결과 이름: 원래이름(-꼬리).확장자
const outName = (file, ext, tail) => baseOf(file.name) + (tail ? '-' + tail : '') + '.' + ext;

// ---------- 도구 화면 ----------
class Panel {
  constructor(root, tool) {
    this.root = root; this.tool = tool; this.files = []; this.job = null;
    this.drop = $('.drop', root); this.work = $('.work', root);
    this.input = $('input[type=file]', root);
    this.input.addEventListener('change', () => { if (this.input.files.length) this.take([...this.input.files]); this.input.value = ''; });
    bindDrop(this.drop, (files) => this.take(files));
  }
  take(files) {
    const ok = files.filter((f) => accepts(this.tool, f));
    const bad = files.filter((f) => !accepts(this.tool, f));
    if (!ok.length) { this.flash(t('errType', { name: bad[0] ? bad[0].name : '' })); return; }
    this.files = this.tool.multiple ? this.files.concat(ok) : [ok[0]];
    if (bad.length) this.flash(t('errType', { name: bad[0].name }));
    this.open();
  }
  flash(msg) {
    let m = $('.drop-msg', this.root);
    if (!m) { m = h('p', { class: 'drop-msg', role: 'alert' }); this.drop.after(m); }
    m.textContent = msg;
  }
  async open() {
    $('.drop-msg', this.root)?.remove();
    this.drop.hidden = true; this.work.hidden = false; this.work.replaceChildren();
    this.root.classList.add('busy-open');
    const runner = RUNNERS[this.tool.id];
    this.head = h('div', { class: 'work-head' });
    this.opts = h('div', { class: 'opts' });
    this.actions = h('div', { class: 'actions' });
    this.out = h('div', { class: 'out', 'aria-live': 'polite' });
    this.work.append(this.head, this.opts, this.actions, this.out);
    this.renderFiles();
    try {
      this.ctl = await runner.setup(this, this.files);
    } catch (e) { this.fail(e); return; }
    if (!this.ctl) return;
    this.go = h('button', { type: 'button', class: 'btn-go', onclick: () => this.run() }, h('span', {}, this.ctl.label || ACTION[this.tool.id]?.[LANG] || t('convert')));
    this.actions.replaceChildren(this.go);
    this.ctl.after && this.ctl.after();
    this.work.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  renderFiles() {
    const list = h('ul', { class: 'files' });
    this.files.forEach((f, i) => {
      const ext = extOf(f.name).toUpperCase().slice(0, 4) || '?';
      const li = h('li', { class: 'file' },
        flapEl(ext, 'sm'),
        h('span', { class: 'file-name', title: f.name }, f.name),
        h('span', { class: 'file-size' }, fmtSize(f.size)),
        this.tool.order && this.files.length > 1 ? h('span', { class: 'file-order' },
          h('button', { type: 'button', class: 'icon', 'aria-label': t('up'), disabled: i === 0 || null, onclick: () => { this.move(i, -1); } }, '↑'),
          h('button', { type: 'button', class: 'icon', 'aria-label': t('down'), disabled: i === this.files.length - 1 || null, onclick: () => { this.move(i, 1); } }, '↓')) : null,
        this.tool.multiple ? h('button', { type: 'button', class: 'icon', 'aria-label': t('remove') + ' ' + f.name, onclick: () => { this.files.splice(i, 1); this.files.length ? this.refresh() : this.reset(); } }, '×') : null
      );
      list.append(li);
    });
    const bar = h('div', { class: 'files-bar' },
      this.tool.multiple
        ? h('button', { type: 'button', class: 'link', onclick: () => this.input.click() }, '+ ' + t('addMore'))
        : h('button', { type: 'button', class: 'link', onclick: () => this.input.click() }, t('change')),
      this.files.length > 1 ? h('span', { class: 'muted' }, t('files', { n: this.files.length })) : null);
    this.head.replaceChildren(list, bar);
  }
  move(i, d) { const f = this.files.splice(i, 1)[0]; this.files.splice(i + d, 0, f); this.renderFiles(); this.ctl?.onFiles?.(this.files); }
  refresh() { this.renderFiles(); this.ctl?.onFiles ? this.ctl.onFiles(this.files) : this.open(); }
  reset() {
    this.cancel();
    this.ctl?.dispose?.();
    this.files = []; this.work.hidden = true; this.work.replaceChildren(); this.drop.hidden = false;
    this.root.classList.remove('busy-open');
    this.drop.querySelector('.btn-pick')?.focus();
  }
  cancel() { if (this.job && this.job.cancel) this.job.cancel(); this.job = null; }
  progress(p, label) {
    if (!this.bar) {
      this.bar = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i'));
      this.barLabel = h('span', { class: 'progress-label' });
      this.out.replaceChildren(h('div', { class: 'working' }, this.barLabel, this.bar,
        h('button', { type: 'button', class: 'link', onclick: () => { this.cancel(); this.idle(); } }, t('cancel'))));
    }
    const pct = Math.max(0, Math.min(100, Math.round((p || 0) * 100)));
    this.bar.firstChild.style.transform = `scaleX(${pct / 100})`;
    this.bar.setAttribute('aria-valuenow', pct);
    this.barLabel.textContent = (label || t('working')) + ' ' + pct + '%';
  }
  idle() { this.bar = null; this.out.replaceChildren(); this.go && (this.go.disabled = false); this.opts.classList.remove('locked'); }
  async run() {
    this.go.disabled = true; this.opts.classList.add('locked');
    const t0 = performance.now();
    this.progress(0);
    try {
      const res = await this.ctl.run((p, l) => this.progress(p, l), (job) => (this.job = job));
      this.bar = null;
      if (!res) { this.idle(); return; }
      this.showResult(res, performance.now() - t0);
    } catch (e) {
      this.bar = null;
      if (e && e.name === 'AbortError') { this.idle(); return; }
      this.fail(e);
      this.go.disabled = false; this.opts.classList.remove('locked');
    }
  }
  fail(e) {
    console.error(e);
    const code = e && e.code;
    const what = this.tool.cat === 'image' ? t('image') : (this.ctlWhat || t('video'));
    const msg = memErr(e) ? t('errMemory')
      : code === 'decode' ? t('errDecode', { what })
      : code === 'encode' ? t('errEncode')
      : code === 'format' ? t('errFormat')
      : code === 'encrypted' ? t('errEncrypted')
      : code === 'pdf' ? t('errPdf')
      : code === 'range' ? t('errRange', { n: e.n || '?' })
      : code === 'empty' ? t('errEmpty')
      : code === 'json-shape' ? t('errJson')
      : code === 'json-parse' ? t('errJsonParse', { m: e.message })
      : code === 'xlsx' ? t('errXlsx')
      : code === 'browser' ? t('errBrowser')
      : code === 'msg' ? e.message
      : t('errGeneric', { m: (e && e.message) || e });
    this.out.replaceChildren(h('p', { class: 'err', role: 'alert' }, msg));
  }
  // res: { items: [{ blob, name, note, preview: 'audio'|'video'|'image', meta }], note, zipName, before }
  showResult(res, ms) {
    const items = res.items;
    const card = h('div', { class: 'result', tabindex: '-1' });
    const total = items.reduce((a, x) => a + x.blob.size, 0);
    const toExt = extOf(items[0].name).toUpperCase().slice(0, 4);
    const fromExt = extOf(this.files[0].name).toUpperCase().slice(0, 4);
    const flap = flapEl(fromExt, 'md');
    card.append(h('div', { class: 'result-top' }, flap,
      h('div', {}, h('p', { class: 'result-title' }, t('done')),
        h('p', { class: 'muted' }, [res.before ? t('savings', { a: fmtSize(res.before), b: fmtSize(total) }) : fmtSize(total), ' · ', t('took', { s: (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + (LANG === 'ko' ? '초' : ' s') })].join('')))));
    setTimeout(() => flipTo(flap, toExt), 60);
    if (res.note) card.append(h('p', { class: 'note' }, res.note));
    const urls = [];
    const one = items.length === 1;
    if (one) {
      const it = items[0];
      const url = URL.createObjectURL(it.blob); urls.push(url);
      if (it.preview === 'audio') card.append(h('audio', { controls: true, src: url, preload: 'metadata', class: 'preview' }));
      if (it.preview === 'video') card.append(h('video', { controls: true, src: url, preload: 'metadata', playsinline: true, class: 'preview' }));
      if (it.preview === 'image') card.append(h('img', { src: url, alt: '', class: 'preview img', width: it.meta?.width, height: it.meta?.height }));
      const btns = h('div', { class: 'result-btns' },
        h('a', { class: 'btn-go', href: url, download: it.name }, h('span', {}, t('download')), h('small', {}, it.name)));
      const sf = new File([it.blob], it.name, { type: it.blob.type });
      if (navigator.canShare && navigator.canShare({ files: [sf] })) {
        btns.append(h('button', { type: 'button', class: 'btn-ghost', onclick: () => navigator.share({ files: [sf] }).catch(() => {}) }, t('share')));
      }
      card.append(btns);
    } else {
      const ul = h('ul', { class: 'out-list' });
      for (const it of items) {
        const url = URL.createObjectURL(it.blob); urls.push(url);
        ul.append(h('li', {}, h('span', { class: 'file-name' }, it.name), h('span', { class: 'file-size' }, it.meta?.label || fmtSize(it.blob.size)),
          h('a', { class: 'btn-small', href: url, download: it.name }, t('download'))));
      }
      const zipBtn = h('button', { type: 'button', class: 'btn-go', onclick: async () => {
        zipBtn.disabled = true;
        const { zipSync } = await import('./vendor/fflate.mjs');
        const files = {}; const used = {};
        for (const it of items) {
          let n = it.name; if (used[n]) { n = baseOf(n) + '-' + (++used[it.name]) + '.' + extOf(n); } else used[n] = 1;
          files[n] = [new Uint8Array(await it.blob.arrayBuffer()), { level: /\.(csv|json|txt|svg)$/i.test(n) ? 6 : 0 }];
        }
        const zurl = URL.createObjectURL(new Blob([zipSync(files)], { type: 'application/zip' }));
        urls.push(zurl);
        const a = h('a', { href: zurl, download: res.zipName || 'converted.zip' }); document.body.append(a); a.click(); a.remove();
        zipBtn.disabled = false;
      } }, h('span', {}, t('downloadAll')));
      card.append(h('div', { class: 'result-btns' }, zipBtn), ul);
    }
    card.append(h('div', { class: 'result-foot' },
      h('button', { type: 'button', class: 'link', onclick: () => { urls.forEach(URL.revokeObjectURL); this.reset(); } }, t('again')),
      h('span', { class: 'muted' }, t('stays'))));
    this.out.replaceChildren(card);
    this.go.disabled = false; this.opts.classList.remove('locked');
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

function bindDrop(zone, onFiles) {
  let depth = 0;
  zone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; zone.classList.add('over'); });
  zone.addEventListener('dragover', (e) => e.preventDefault());
  zone.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; zone.classList.remove('over'); } });
  zone.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; zone.classList.remove('over'); const f = [...(e.dataTransfer?.files || [])]; if (f.length) onFiles(f); });
}

// ---------- 넘기는 글자판(상징): 확장자가 제자리에서 바뀐다 ----------
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
export function flapEl(text, size) {
  const el = h('span', { class: 'flap ' + (size || ''), 'aria-hidden': 'true' });
  for (const ch of text) el.append(h('b', {}, ch));
  el.dataset.text = text;
  return el;
}
export function flipTo(el, text) {
  const cur = el.dataset.text || '';
  const n = Math.max(cur.length, text.length);
  while (el.children.length < n) el.append(h('b', {}, ' '));
  while (el.children.length > n) el.lastChild.remove();
  [...el.children].forEach((b, i) => {
    const ch = text[i] || ' ';
    b.classList.toggle('blank', ch === ' ');
    if (b.textContent === ch) return;
    if (REDUCED.matches) { b.textContent = ch; return; }
    setTimeout(() => { b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); setTimeout(() => { b.textContent = ch; }, 140); }, i * 70);
  });
  el.dataset.text = text;
  // 글자 수가 줄면 애니메이션이 끝난 뒤 남는 빈 칸을 지운다
  const trim = () => { if (el.dataset.text !== text) return; while (el.children.length > text.length) el.lastChild.remove(); };
  if (REDUCED.matches) trim(); else setTimeout(trim, n * 70 + 400);
}

// 실행 버튼 이름: '변환하기' 대신 그 도구가 하는 일
const ACTION = {
  'video-to-mp3': { en: 'Extract audio', ko: '오디오 추출하기' }, 'audio-converter': { en: 'Convert audio', ko: '오디오 변환하기' },
  'cut-audio': { en: 'Cut and save', ko: '잘라서 저장하기' }, 'video-converter': { en: 'Convert video', ko: '동영상 변환하기' },
  'cut-video': { en: 'Cut and save', ko: '잘라서 저장하기' }, 'compress-video': { en: 'Compress video', ko: '동영상 줄이기' },
  'video-to-gif': { en: 'Make GIF', ko: 'GIF 만들기' }, 'image-converter': { en: 'Convert images', ko: '이미지 변환하기' },
  'heic-to-jpg': { en: 'Convert photos', ko: '사진 변환하기' }, 'compress-image': { en: 'Compress images', ko: '용량 줄이기' },
  'resize-image': { en: 'Resize images', ko: '크기 바꾸기' }, 'images-to-pdf': { en: 'Make PDF', ko: 'PDF 만들기' },
  'pdf-to-jpg': { en: 'Save as images', ko: '이미지로 저장하기' }, 'csv-json': { en: 'Convert data', ko: '데이터 변환하기' },
  'excel-csv': { en: 'Convert sheet', ko: '표 변환하기' },
};

// ---------- 공통 옵션 조각 ----------
async function media() {
  const m = await import('./engines/media.js');
  if (!m.supported()) throw Object.assign(new Error('browser'), { code: 'browser' });
  return m;
}
const loadingNote = (p) => { const n = h('p', { class: 'muted loading' }, t('loading')); p.opts.replaceChildren(n); return n; };

// 시간 띠: 파형 또는 필름 띠 + 손잡이 두 개. 반환: { el, get(): {start,end}, set }
function timeline(p, file, info, { kind, onChange, initEnd }) {
  const dur = info.duration;
  let start = 0, end = initEnd ? Math.min(initEnd, dur) : dur;
  const wrap = h('div', { class: 'tl' });
  const strip = h('div', { class: 'tl-strip' });
  const cv = h('canvas', { class: 'tl-canvas', 'aria-hidden': 'true' });
  const sel = h('div', { class: 'tl-sel' });
  const hA = h('div', { class: 'tl-h a', role: 'slider', tabindex: 0, 'aria-label': t('start'), 'aria-valuemin': 0, 'aria-valuemax': dur.toFixed(1) });
  const hB = h('div', { class: 'tl-h b', role: 'slider', tabindex: 0, 'aria-label': t('end'), 'aria-valuemin': 0, 'aria-valuemax': dur.toFixed(1) });
  const head = h('div', { class: 'tl-play' });
  const dimL = h('div', { class: 'tl-dim l' }), dimR = h('div', { class: 'tl-dim r' });
  strip.append(cv, dimL, dimR, sel, head, hA, hB);
  const inA = h('input', { type: 'text', inputmode: 'decimal', class: 'time', 'aria-label': t('start'), spellcheck: 'false' });
  const inB = h('input', { type: 'text', inputmode: 'decimal', class: 'time', 'aria-label': t('end'), spellcheck: 'false' });
  const len = h('span', { class: 'tl-len' });
  const mediaEl = h(kind === 'video' ? 'video' : 'audio', { preload: 'metadata', playsinline: true, class: kind === 'video' ? 'tl-video' : 'sr' });
  const url = URL.createObjectURL(file); mediaEl.src = url;
  const playBtn = h('button', { type: 'button', class: 'btn-ghost play' }, '▶ ' + t('play'));
  const row = h('div', { class: 'tl-row' },
    h('label', {}, h('span', {}, t('start')), inA), h('label', {}, h('span', {}, t('end')), inB), len, playBtn);
  if (kind === 'video') wrap.append(mediaEl); else wrap.append(mediaEl);
  wrap.append(strip, row);
  const minLen = Math.min(0.2, dur);
  function draw() {
    const pa = (start / dur) * 100, pb = (end / dur) * 100;
    hA.style.left = pa + '%'; hB.style.left = pb + '%';
    sel.style.left = pa + '%'; sel.style.width = (pb - pa) + '%';
    dimL.style.width = pa + '%'; dimR.style.width = (100 - pb) + '%';
    hA.setAttribute('aria-valuenow', start.toFixed(1)); hA.setAttribute('aria-valuetext', fmtTime(start));
    hB.setAttribute('aria-valuenow', end.toFixed(1)); hB.setAttribute('aria-valuetext', fmtTime(end));
    if (document.activeElement !== inA) inA.value = fmtTime(start);
    if (document.activeElement !== inB) inB.value = fmtTime(end);
    len.textContent = t('length') + ' ' + fmtTime(end - start);
    onChange && onChange(start, end);
  }
  function setA(v) { start = Math.max(0, Math.min(v, end - minLen)); draw(); }
  function setB(v) { end = Math.min(dur, Math.max(v, start + minLen)); draw(); }
  function drag(handle, setter) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const r = strip.getBoundingClientRect();
      const mv = (ev) => setter(((ev.clientX - r.left) / r.width) * dur);
      const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); if (setter === setA) seek(start); };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
    });
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 1 : Math.max(0.1, dur / 200);
      const cur = setter === setA ? start : end;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setter(cur - step); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setter(cur + step); }
      if (e.key === 'Home') { e.preventDefault(); setter(0); }
      if (e.key === 'End') { e.preventDefault(); setter(dur); }
    });
  }
  drag(hA, setA); drag(hB, setB);
  strip.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('tl-h')) return;
    const r = strip.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * dur;
    (Math.abs(x - start) < Math.abs(x - end) ? setA : setB)(x);
  });
  for (const [inp, setter] of [[inA, setA], [inB, setB]]) {
    inp.addEventListener('change', () => { const v = parseTime(inp.value); if (isFinite(v)) setter(v); else draw(); });
    inp.addEventListener('blur', draw);
  }
  function seek(x) { try { mediaEl.currentTime = x; } catch (e) {} }
  let raf = 0;
  function tick() {
    const ct = mediaEl.currentTime;
    head.style.left = (ct / dur) * 100 + '%';
    if (ct >= end) { mediaEl.pause(); }
    if (!mediaEl.paused) raf = requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => {
    if (!mediaEl.paused) { mediaEl.pause(); return; }
    if (mediaEl.currentTime < start || mediaEl.currentTime >= end - 0.05) seek(start);
    mediaEl.play().catch(() => {});
  });
  mediaEl.addEventListener('play', () => { playBtn.textContent = '❚❚ ' + t('pause'); head.style.opacity = 1; raf = requestAnimationFrame(tick); });
  mediaEl.addEventListener('pause', () => { playBtn.textContent = '▶ ' + t('play'); cancelAnimationFrame(raf); });
  // 그림: 파형(소리) 또는 필름 띠(영상)
  const ac = new AbortController();
  requestAnimationFrame(() => {
    const W = Math.max(300, strip.clientWidth), H = strip.clientHeight || 72, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const css = getComputedStyle(wrap);
    if (kind === 'video') {
      const n = Math.max(4, Math.min(12, Math.round(W / 90)));
      media().then((m) => m.thumbs(file, n, H)).then((list) => {
        list.forEach((c, i) => { if (!c) return; const w = W / n, ar = c.width / c.height, dw = Math.max(w, H * ar); ctx.drawImage(c, i * w + (w - dw) / 2, 0, dw, H); });
        ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 1; i < n; i++) ctx.fillRect((i * W) / n, 0, 1, H);
      }).catch(() => {});
    } else {
      const bars = Math.floor(W / 3);
      const color = css.getPropertyValue('--wave').trim() || '#888';
      media().then((m) => m.peaks(file, bars, (pk) => {
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = color;
        let max = 0.02; for (const v of pk) if (v > max) max = v;
        for (let i = 0; i < bars; i++) { const bh = Math.max(1.5, (pk[i] / max) * (H - 8)); ctx.fillRect(i * 3, (H - bh) / 2, 2, bh); }
      }, ac.signal)).catch(() => {});
    }
  });
  draw();
  return {
    el: wrap, get: () => ({ start, end }),
    dispose: () => { ac.abort(); mediaEl.pause(); URL.revokeObjectURL(url); }
  };
}

function infoLine(info) {
  const bits = [fmtTime(info.duration, 0)];
  if (info.hasVideo) bits.push(info.width + '×' + info.height);
  if (info.videoCodec) bits.push(info.videoCodec.toUpperCase());
  if (info.audioCodec) bits.push(info.audioCodec.replace(/^pcm.*/, 'PCM').toUpperCase());
  return h('p', { class: 'file-info muted' }, bits.join(' · '));
}

async function probeOrFail(p, file, need) {
  const m = await media();
  const note = loadingNote(p);
  note.textContent = t('reading');
  let info;
  try { info = await m.probe(file); } catch (e) { throw Object.assign(new Error('format'), { code: 'format' }); }
  if (need === 'audio' && !info.hasAudio) throw Object.assign(new Error(t('noAudio')), { code: 'msg' });
  if (need === 'video' && !info.hasVideo) throw Object.assign(new Error(t('noVideo')), { code: 'msg' });
  p.head.append(infoLine(info));
  if (file.size > 1.5e9) p.head.append(h('p', { class: 'warn' }, t('sizeWarn')));
  return { m, info };
}

const AUDIO_LABEL = { mp3: 'MP3', m4a: 'M4A', wav: 'WAV', ogg: 'OGG', flac: 'FLAC' };
const sizeEst = (kbps, secs) => fmtSize(Math.round((kbps * 1000 * secs) / 8));
const WAV_KBPS = (info) => (info.sampleRate || 48000) * Math.min(2, info.channels || 2) * 16 / 1000;

// 음성 내보내기 공통(동영상→MP3, 음성 변환, 음성 자르기)
async function audioRunner(p, files, { formats, defaultFormat, trimUI, fadeUI, tail }) {
  const file = files[0];
  const { m, info } = await probeOrFail(p, file, 'audio');
  p.ctlWhat = info.hasVideo ? t('video') : t('audio');
  const can = await m.encodableAudio();
  const list = formats.filter((f) => can.includes(f));
  let fmt = list.includes(defaultFormat) ? defaultFormat : list[0], kbps = 192, fadeIn = 0, fadeOut = 0;
  const est = h('p', { class: 'est muted' });
  let tl = null;
  const update = () => {
    const r = tl ? tl.get() : { start: 0, end: info.duration };
    const secs = r.end - r.start;
    const rate = fmt === 'wav' ? WAV_KBPS(info) : fmt === 'flac' ? null : kbps;
    est.textContent = rate ? t('estimate', { size: sizeEst(rate, secs) }) : '';
    brField.hidden = fmt === 'wav' || fmt === 'flac';
  };
  const fmtChips = chips(t('format'), list.map((f) => [f, AUDIO_LABEL[f]]), fmt, (v) => { fmt = v; update(); });
  const brChips = chips(t('bitrate'), [[128, '128 kbps'], [192, '192 kbps'], [320, '320 kbps']], kbps, (v) => { kbps = +v; update(); });
  const brField = field(t('bitrate'), brChips);
  p.opts.replaceChildren();
  if (trimUI) { tl = timeline(p, file, info, { kind: info.hasVideo && trimUI === 'video' ? 'video' : 'audio', onChange: () => update() }); p.opts.append(tl.el); }
  p.opts.append(field(t('format'), fmtChips), brField);
  if (fadeUI) {
    const fo = [[0, t('off')], [1, '1' + t('seconds')], [3, '3' + t('seconds')]];
    p.opts.append(h('div', { class: 'two' }, field(t('fadeIn'), chips(t('fadeIn'), fo, 0, (v) => { fadeIn = +v; })), field(t('fadeOut'), chips(t('fadeOut'), fo, 0, (v) => { fadeOut = +v; }))));
  }
  p.opts.append(est);
  update();
  return {
    dispose: () => tl && tl.dispose(),
    run: async (prog, setJob) => {
      const r = tl ? tl.get() : null;
      const job = m.convert(file, { target: fmt, bitrate: fmt === 'wav' || fmt === 'flac' ? undefined : kbps, trim: r, fade: { in: fadeIn, out: fadeOut } }, prog);
      setJob(job);
      const res = await job.promise;
      const cut = r && (r.start > 0.01 || r.end < info.duration - 0.01);
      return { items: [{ blob: res.blob, name: outName(file, res.ext, cut ? (tail || 'cut') : ''), preview: 'audio' }], note: res.copied ? t('copied') : '' };
    }
  };
}

// 도구별 설정 화면
const RUNNERS = {
  'video-to-mp3': { setup: (p, f) => audioRunner(p, f, { formats: ['mp3', 'm4a', 'wav'], defaultFormat: 'mp3', trimUI: 'video' }) },
  'audio-converter': { setup: (p, f) => audioRunner(p, f, { formats: ['mp3', 'm4a', 'wav', 'ogg', 'flac'], defaultFormat: extOf(f[0].name) === 'mp3' ? 'm4a' : 'mp3' }) },
  'cut-audio': { setup: (p, f) => audioRunner(p, f, { formats: ['mp3', 'm4a', 'wav'], defaultFormat: ['m4a', 'wav'].includes(extOf(f[0].name)) ? extOf(f[0].name) : 'mp3', trimUI: 'audio', fadeUI: true, tail: 'cut' }) },

  'video-converter': {
    async setup(p, files) {
      const file = files[0];
      const { m, info } = await probeOrFail(p, file, 'video');
      let fmt = extOf(file.name) === 'mp4' ? 'webm' : 'mp4';
      const hint = h('p', { class: 'est muted' }, t('copiedHint'));
      p.opts.replaceChildren(field(t('format'), chips(t('format'), [['mp4', 'MP4'], ['webm', 'WebM'], ['mov', 'MOV']], fmt, (v) => { fmt = v; })), hint);
      return {
        run: async (prog, setJob) => {
          const job = m.convert(file, { target: fmt }, prog); setJob(job);
          const res = await job.promise;
          return { items: [{ blob: res.blob, name: outName(file, res.ext), preview: 'video' }], note: res.copied ? t('copied') : '' };
        }
      };
    }
  },
  'cut-video': {
    async setup(p, files) {
      const file = files[0];
      const { m, info } = await probeOrFail(p, file, 'video');
      const tl = timeline(p, file, info, { kind: 'video' });
      const ex = toggle(t('exact'), false);
      p.opts.replaceChildren(tl.el, ex, h('p', { class: 'est muted' }, t('fast')));
      return {
        dispose: () => tl.dispose(),
        run: async (prog, setJob) => {
          const r = tl.get();
          const target = ['mp4', 'webm', 'mov'].includes(extOf(file.name)) ? extOf(file.name) : 'mp4';
          const job = m.convert(file, { target, trim: r, exact: ex.get() }, prog); setJob(job);
          const res = await job.promise;
          return { items: [{ blob: res.blob, name: outName(file, res.ext, 'cut'), preview: 'video' }] };
        }
      };
    }
  },
  'compress-video': {
    async setup(p, files) {
      const file = files[0];
      const { m, info } = await probeOrFail(p, file, 'video');
      let q = 'medium', maxH = info.height > 1080 ? 1080 : info.height > 720 ? 720 : 0;
      const res = [[0, t('original') + ' (' + info.height + 'p)'], ...[1080, 720, 480].filter((x) => x < info.height).map((x) => [x, x + 'p'])];
      p.opts.replaceChildren(
        field(t('quality'), chips(t('quality'), [['low', t('smaller')], ['medium', t('balanced')], ['high', t('better')]], q, (v) => { q = v; })),
        field(t('resolution'), chips(t('resolution'), res, maxH, (v) => { maxH = +v; })));
      return {
        run: async (prog, setJob) => {
          const job = m.convert(file, { target: 'mp4', compress: true, quality: q, maxHeight: maxH || undefined }, prog); setJob(job);
          const r = await job.promise;
          return { items: [{ blob: r.blob, name: outName(file, 'mp4', 'small'), preview: 'video' }], before: file.size };
        }
      };
    }
  },
  'video-to-gif': {
    async setup(p, files) {
      const file = files[0];
      const { m, info } = await probeOrFail(p, file, 'video');
      let fps = 10, width = Math.min(480, info.width);
      const warn = h('p', { class: 'warn', hidden: true }, t('gifLong'));
      const tl = timeline(p, file, info, { kind: 'video', initEnd: 10, onChange: (a, b) => { warn.hidden = b - a <= 15; } });
      p.opts.replaceChildren(tl.el,
        h('div', { class: 'two' },
          field(t('fps'), chips(t('fps'), [[10, '10 fps'], [15, '15 fps'], [20, '20 fps']], fps, (v) => { fps = +v; })),
          field(t('width'), chips(t('width'), [320, 480, 640].filter((w) => w <= info.width || w === 320).map((w) => [w, w + ' px']), width > 320 && width < 480 ? 320 : width, (v) => { width = +v; }))),
        warn);
      return {
        dispose: () => tl.dispose(),
        run: async (prog, setJob) => {
          const r = tl.get();
          const job = m.toGif(file, { start: r.start, end: r.end, fps, width }, prog); setJob(job);
          const res = await job.promise;
          return { items: [{ blob: res.blob, name: outName(file, 'gif'), preview: 'image', meta: { width: res.width, height: res.height } }] };
        }
      };
    }
  },

  'image-converter': {
    async setup(p, files) {
      const img = await import('./engines/image.js');
      const fmts = [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']];
      if (await img.canEncode('avif')) fmts.push(['avif', 'AVIF']);
      let fmt = img.sameFormat(files[0]) === 'jpg' ? 'png' : 'jpg', q = 0.9;
      const qVal = h('output', {}, '90');
      const qIn = h('input', { type: 'range', min: 40, max: 100, value: 90, 'aria-label': t('quality'), oninput: () => { q = qIn.value / 100; qVal.textContent = qIn.value; } });
      const qField = field(t('quality'), h('div', { class: 'range' }, qIn, qVal));
      const upd = () => { qField.hidden = fmt === 'png'; };
      p.opts.replaceChildren(field(t('format'), chips(t('format'), fmts, fmt, (v) => { fmt = v; upd(); })), qField);
      upd();
      return {
        onFiles: () => {},
        run: (prog) => batchImages(p.files, img, (im) => ({ format: fmt, quality: q }), prog)
      };
    }
  },
  'heic-to-jpg': {
    async setup(p, files) {
      const img = await import('./engines/image.js');
      let fmt = 'jpg';
      p.opts.replaceChildren(field(t('format'), chips(t('format'), [['jpg', 'JPG'], ['png', 'PNG']], fmt, (v) => { fmt = v; })));
      return { onFiles: () => {}, run: (prog) => batchImages(p.files, img, () => ({ format: fmt, quality: 0.92 }), prog) };
    }
  },
  'compress-image': {
    async setup(p, files) {
      const img = await import('./engines/image.js');
      let fmt = (await img.canEncode('webp')) && img.sameFormat(files[0]) === 'webp' ? 'webp' : 'jpg', q = 0.75, maxW = 0;
      const qVal = h('output', {}, '75');
      // 움직이는 동안 첫 사진을 실제로 다시 저장해 용량과 모습을 바로 보여 준다
      const live = h('div', { class: 'live', 'aria-live': 'polite' });
      const liveImg = h('img', { alt: '', class: 'live-img' }), liveTxt = h('p', { class: 'est' });
      live.append(liveImg, liveTxt);
      let src = null, srcFile = null, timer = 0, seq = 0, liveUrl = '';
      const sizeFor = (im) => { const s = maxW && im.width > maxW ? maxW / im.width : 1; return { width: im.width * s, height: im.height * s }; };
      async function estimate() {
        const my = ++seq;
        try {
          if (srcFile !== p.files[0]) { if (src) img.release(src); srcFile = p.files[0]; src = await img.decode(srcFile); }
          const r = await img.encode(src, { format: fmt, quality: q, ...sizeFor(src) });
          if (my !== seq) return;
          if (liveUrl) URL.revokeObjectURL(liveUrl);
          liveUrl = URL.createObjectURL(r.blob); liveImg.src = liveUrl;
          liveTxt.textContent = t('liveSize', { name: srcFile.name, a: fmtSize(srcFile.size), b: fmtSize(r.blob.size), w: r.width, h: r.height });
        } catch (e) { liveTxt.textContent = ''; }
      }
      const later = () => { clearTimeout(timer); timer = setTimeout(estimate, 180); };
      const qIn = h('input', { type: 'range', min: 30, max: 95, value: 75, 'aria-label': t('quality'), oninput: () => { q = qIn.value / 100; qVal.textContent = qIn.value; later(); } });
      p.opts.replaceChildren(
        field(t('quality'), h('div', { class: 'range' }, qIn, qVal)),
        h('div', { class: 'two' },
          field(t('format'), chips(t('format'), [['jpg', 'JPG'], ['webp', 'WebP']], fmt, (v) => { fmt = v; later(); })),
          field(t('maxWidth'), chips(t('maxWidth'), [[0, t('keep')], [1920, '1920'], [1600, '1600'], [1280, '1280'], [600, '600']], 0, (v) => { maxW = +v; later(); }))),
        live);
      estimate();
      return {
        onFiles: later,
        dispose: () => { clearTimeout(timer); seq++; if (src) img.release(src); if (liveUrl) URL.revokeObjectURL(liveUrl); },
        run: async (prog) => {
          const before = p.files.reduce((a, f) => a + f.size, 0);
          const r = await batchImages(p.files, img, (im) => ({ format: fmt, quality: q, ...sizeFor(im) }), prog, true);
          r.before = before; return r;
        }
      };
    }
  },
  'resize-image': {
    async setup(p, files) {
      const img = await import('./engines/image.js');
      const first = await img.decode(files[0]);
      const W0 = first.width, H0 = first.height; img.release(first);
      let mode = 'px', lock = true, pct = 50;
      const w = numInput(t('width'), W0, { max: 20000 }), hh = numInput(t('height'), H0, { max: 20000 });
      const pc = numInput(t('percent'), 50, { max: 400 });
      w.input.addEventListener('input', () => { if (lock && +w.input.value) hh.input.value = Math.round((+w.input.value * H0) / W0); });
      hh.input.addEventListener('input', () => { if (lock && +hh.input.value) w.input.value = Math.round((+hh.input.value * W0) / H0); });
      const lockT = toggle(t('keepRatio'), true, (v) => { lock = v; });
      const pxBox = h('div', { class: 'two' }, w.el, hh.el);
      const pxWrap = h('div', {}, pxBox, lockT);
      const pcWrap = h('div', { hidden: true }, pc.el);
      p.opts.replaceChildren(field(t('mode'), chips(t('mode'), [['px', t('byPixels')], ['pct', t('byPercent')]], mode, (v) => { mode = v; pxWrap.hidden = v !== 'px'; pcWrap.hidden = v !== 'pct'; })), pxWrap, pcWrap);
      return {
        onFiles: () => {},
        run: (prog) => batchImages(p.files, img, (im) => {
          let W, H;
          if (mode === 'pct') { const s = Math.max(1, +pc.input.value || 100) / 100; W = im.width * s; H = im.height * s; }
          else {
            const tw = +w.input.value || W0, th = +hh.input.value || H0;
            if (lock) { const s = Math.min(tw / im.width, th / im.height); W = im.width * s; H = im.height * s; } else { W = tw; H = th; }
          }
          const f = img.sameFormat(im.file);
          return { format: f, quality: 0.92, width: W, height: H };
        }, prog, false, 'resized')
      };
    }
  },

  'images-to-pdf': {
    async setup(p, files) {
      let page = 'fit', margin = 0;
      p.opts.replaceChildren(
        field(t('pageSize'), chips(t('pageSize'), [['fit', t('fitImage')], ['a4', 'A4'], ['letter', 'Letter']], page, (v) => { page = v; })),
        field(t('margin'), chips(t('margin'), [[0, t('none')], [24, t('small')]], margin, (v) => { margin = +v; })));
      return {
        onFiles: () => {},
        run: async (prog) => {
          const img = await import('./engines/image.js');
          const pdf = await import('./engines/pdf.js');
          const items = [];
          for (let i = 0; i < p.files.length; i++) {
            const f = p.files[i];
            const isJpg = /\.jpe?g$/i.test(f.name) || f.type === 'image/jpeg';
            const isPng = /\.png$/i.test(f.name) || f.type === 'image/png';
            if (isJpg || isPng) items.push({ bytes: new Uint8Array(await f.arrayBuffer()), kind: isJpg ? 'jpg' : 'png' });
            else { const d = await img.decode(f); const e = await img.encode(d, { format: 'jpg', quality: 0.92 }); img.release(d); items.push({ bytes: new Uint8Array(await e.blob.arrayBuffer()), kind: 'jpg' }); }
            prog((i + 1) / p.files.length * 0.5);
          }
          const blob = await pdf.imagesToPdf(items, { page, margin }, (x) => prog(0.5 + x * 0.5));
          return { items: [{ blob, name: (p.files.length === 1 ? baseOf(p.files[0].name) : 'images') + '.pdf' }] };
        }
      };
    }
  },
  'pdf-to-jpg': {
    async setup(p, files) {
      const pdf = await import('./engines/pdf.js');
      const n = await pdf.numPagesJs(files[0]);
      p.head.append(h('p', { class: 'file-info muted' }, (LANG === 'ko' ? n + '쪽' : n + (n === 1 ? ' page' : ' pages'))));
      let fmt = 'jpg', dpi = 150;
      const pages = h('input', { type: 'text', placeholder: t('allPages'), 'aria-label': t('pages'), class: 'text', spellcheck: 'false' });
      p.opts.replaceChildren(
        h('div', { class: 'two' },
          field(t('format'), chips(t('format'), [['jpg', 'JPG'], ['png', 'PNG']], fmt, (v) => { fmt = v; })),
          field(t('dpi'), chips(t('dpi'), [[72, '72 dpi'], [150, '150 dpi'], [300, '300 dpi']], dpi, (v) => { dpi = +v; }))),
        field(t('pages'), pages, h('small', { class: 'muted' }, t('pagesHint'))));
      return {
        run: async (prog) => {
          let list;
          try { list = pages.value.trim() ? pdf.parseRanges(pages.value, n) : [...Array(n).keys()]; } catch (e) { e.n = n; throw e; }
          const res = await pdf.toImages(files[0], list, { dpi, format: fmt }, prog);
          return {
            items: res.map((r) => ({ blob: r.blob, name: baseOf(files[0].name) + '-' + String(r.page).padStart(String(n).length, '0') + '.' + fmt, preview: 'image', meta: { width: r.width, height: r.height } })),
            zipName: baseOf(files[0].name) + '-' + fmt + '.zip'
          };
        }
      };
    }
  },
  'merge-pdf': {
    async setup(p) {
      p.opts.replaceChildren(h('p', { class: 'est muted' }, LANG === 'ko' ? '위 목록 순서대로 합쳐요. ↑↓로 순서를 바꿔요.' : 'Merged in the order above. Use ↑↓ to reorder.'));
      return {
        label: LANG === 'ko' ? '합치기' : 'Merge',
        onFiles: () => {},
        run: async (prog) => {
          const pdf = await import('./engines/pdf.js');
          const blob = await pdf.merge(p.files, prog);
          return { items: [{ blob, name: 'merged.pdf' }] };
        }
      };
    }
  },
  'split-pdf': {
    async setup(p, files) {
      const pdf = await import('./engines/pdf.js');
      const n = await pdf.pageCount(files[0]);
      p.head.append(h('p', { class: 'file-info muted' }, (LANG === 'ko' ? n + '쪽' : n + (n === 1 ? ' page' : ' pages'))));
      let mode = 'extract';
      const pages = h('input', { type: 'text', value: n > 1 ? '1-' + Math.min(n, 3) : '1', 'aria-label': t('pages'), class: 'text', spellcheck: 'false' });
      const nIn = numInput(t('n'), Math.min(2, n), { max: n });
      const pBox = field(t('pages'), pages, h('small', { class: 'muted' }, t('pagesHint')));
      const nBox = h('div', { hidden: true }, nIn.el);
      p.opts.replaceChildren(field(t('mode'), chips(t('mode'), [['extract', t('extract')], ['every', t('every')], ['chunks', t('chunks')]], mode, (v) => { mode = v; pBox.hidden = v !== 'extract'; nBox.hidden = v !== 'chunks'; })), pBox, nBox);
      return {
        label: LANG === 'ko' ? '나누기' : 'Split',
        run: async (prog) => {
          let groups;
          if (mode === 'extract') { try { groups = [pdf.parseRanges(pages.value, n)]; } catch (e) { e.n = n; throw e; } }
          else if (mode === 'every') groups = [...Array(n).keys()].map((i) => [i]);
          else { const k = Math.max(1, Math.min(n, +nIn.input.value || 1)); groups = []; for (let i = 0; i < n; i += k) groups.push([...Array(Math.min(k, n - i)).keys()].map((j) => i + j)); }
          const blobs = await pdf.split(files[0], groups, prog);
          const label = (g) => g.length === 1 ? String(g[0] + 1) : (g[g.length - 1] - g[0] === g.length - 1 ? (g[0] + 1) + '-' + (g[g.length - 1] + 1) : 'pages');
          return {
            items: blobs.map((b, i) => ({ blob: b, name: baseOf(files[0].name) + '-' + label(groups[i]) + '.pdf', meta: { label: (LANG === 'ko' ? groups[i].length + '쪽 · ' : groups[i].length + ' p · ') + fmtSize(b.size) } })),
            zipName: baseOf(files[0].name) + '-split.zip'
          };
        }
      };
    }
  },

  'csv-json': {
    async setup(p, files) {
      const d = await import('./engines/data.js');
      const file = files[0];
      const isJson = extOf(file.name) === 'json' || file.type === 'application/json';
      const { text, encoding } = await d.readText(file);
      const prev = h('div', { class: 'table-prev' });
      if (!isJson) {
        let header = true, types = false, delim = 'auto';
        const showPrev = () => {
          const { rows } = d.parseCSV(text, delim === 'auto' ? undefined : delim);
          renderTable(prev, rows.slice(0, 6), header);
          prev.prepend(h('p', { class: 'muted' }, t('rows', { n: rows.length }) + ' · ' + encoding));
        };
        p.opts.replaceChildren(
          field(t('delimiter'), chips(t('delimiter'), [['auto', t('auto')], [',', t('comma')], [';', t('semicolon')], ['\t', t('tab')]], delim, (v) => { delim = v; showPrev(); })),
          toggle(t('header'), true, (v) => { header = v; showPrev(); }), toggle(t('types'), false, (v) => { types = v; }), prev);
        showPrev();
        return {
          label: 'CSV → JSON',
          run: async () => {
            const { rows } = d.parseCSV(text, delim === 'auto' ? undefined : delim);
            const json = JSON.stringify(d.rowsToJson(rows, { header, types }), null, 2);
            return { items: [{ blob: new Blob([json + '\n'], { type: 'application/json' }), name: outName(file, 'json') }] };
          }
        };
      }
      let value;
      try { value = JSON.parse(text); } catch (e) { throw Object.assign(new Error(e.message), { code: 'json-parse' }); }
      const rows = d.jsonToRows(value);
      let bom = LANG === 'ko', delim = ',';
      renderTable(prev, rows.slice(0, 6), true);
      prev.prepend(h('p', { class: 'muted' }, t('rows', { n: rows.length - 1 })));
      p.opts.replaceChildren(
        field(t('delimiter'), chips(t('delimiter'), [[',', t('comma')], [';', t('semicolon')], ['\t', t('tab')]], delim, (v) => { delim = v; })),
        toggle(t('bom'), bom, (v) => { bom = v; }), prev);
      return {
        label: 'JSON → CSV',
        run: async () => ({ items: [{ blob: new Blob([d.toCSV(rows, { delimiter: delim, bom })], { type: 'text/csv' }), name: outName(file, delim === '\t' ? 'tsv' : 'csv') }] })
      };
    }
  },
  'excel-csv': {
    async setup(p, files) {
      const d = await import('./engines/data.js');
      const file = files[0];
      const prev = h('div', { class: 'table-prev' });
      if (/^(csv|tsv|txt)$/.test(extOf(file.name))) {
        const { text } = await d.readText(file);
        const { rows } = d.parseCSV(text);
        renderTable(prev, rows.slice(0, 6), true);
        prev.prepend(h('p', { class: 'muted' }, t('rows', { n: rows.length })));
        p.opts.replaceChildren(prev);
        return { label: 'CSV → Excel', run: async () => ({ items: [{ blob: await d.rowsToXlsx(rows, baseOf(file.name)), name: outName(file, 'xlsx') }] }) };
      }
      const wb = await d.readWorkbook(file);
      const names = wb.SheetNames;
      let sheet = names[0], bom = LANG === 'ko';
      const showPrev = async () => { if (sheet === '*') { prev.replaceChildren(); return; } const rows = await d.sheetToRows(wb, sheet); renderTable(prev, rows.slice(0, 6), true); prev.prepend(h('p', { class: 'muted' }, t('rows', { n: rows.length }))); };
      const opts = names.map((n) => [n, n]); if (names.length > 1) opts.push(['*', t('allSheets')]);
      p.opts.replaceChildren(field(t('sheet'), chips(t('sheet'), opts, sheet, (v) => { sheet = v; showPrev(); })), toggle(t('bom'), bom, (v) => { bom = v; }), prev);
      await showPrev();
      return {
        label: 'Excel → CSV',
        run: async () => {
          const list = sheet === '*' ? names : [sheet];
          const items = [];
          for (const n of list) {
            const rows = await d.sheetToRows(wb, n);
            items.push({ blob: new Blob([d.toCSV(rows, { bom })], { type: 'text/csv' }), name: baseOf(file.name) + (names.length > 1 ? '-' + n.replace(/[\\/:*?"<>|]/g, '_') : '') + '.csv' });
          }
          return { items, zipName: baseOf(file.name) + '-csv.zip' };
        }
      };
    }
  }
};

function renderTable(box, rows, header) {
  const tbl = h('table', {});
  const cols = Math.min(8, Math.max(0, ...rows.map((r) => r.length)));
  rows.forEach((r, i) => {
    const tr = h('tr');
    for (let c = 0; c < cols; c++) { const v = r[c]; tr.append(h(i === 0 && header ? 'th' : 'td', {}, v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v).slice(0, 60))); }
    tbl.append(tr);
  });
  box.replaceChildren(h('div', { class: 'table-scroll' }, tbl));
}

// 그림 여러 장 차례로
async function batchImages(files, img, optsFor, prog, showSaving, tail) {
  const items = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const d = await img.decode(f); d.file = f;
    const o = optsFor(d);
    const r = await img.encode(d, o);
    img.release(d);
    items.push({ blob: r.blob, name: outName(f, r.ext, tail || ''), preview: 'image', meta: { width: r.width, height: r.height, label: (showSaving ? fmtSize(f.size) + ' → ' : '') + fmtSize(r.blob.size) + ' · ' + r.width + '×' + r.height } });
    prog((i + 1) / files.length);
    await new Promise((res) => setTimeout(res));
  }
  return { items, zipName: (tail || 'converted') + '-images.zip' };
}

// ---------- 첫 페이지: 무엇이든 놓으면 맞는 도구를 고르게 ----------
function hub(root) {
  const zone = $('.drop', root), input = $('input[type=file]', root), pick = $('.pick', root);
  const show = (files) => {
    const f = files[0];
    const k = kindOf(f);
    const ext = extOf(f.name);
    const matches = Object.values(TOOLS).filter((tl) => accepts(tl, f));
    if (!matches.length) { pick.replaceChildren(h('p', { class: 'err', role: 'alert' }, t('notHere', { ext }))); pick.hidden = false; return; }
    if (k === 'image' && /^hei[cf]$/.test(ext)) matches.sort((a) => (a.id === 'heic-to-jpg' ? -1 : 1));
    const list = h('div', { class: 'pick-list' });
    for (const tl of matches) {
      list.append(h('button', { type: 'button', class: 'pick-card cat-' + tl.cat, onclick: () => mountInline(root, tl, files) },
        flapEl(tl.pair[1], 'xs'), h('span', { class: 'pick-name' }, tl.name[LANG]), h('span', { class: 'pick-line' }, tl.short[LANG])));
    }
    pick.replaceChildren(h('p', { class: 'pick-q' }, h('strong', {}, f.name + (files.length > 1 ? ' + ' + (files.length - 1) : '')), ' — ', t('whatToDo')), list);
    pick.hidden = false;
    list.querySelector('button')?.focus();
  };
  input.addEventListener('change', () => { if (input.files.length) show([...input.files]); input.value = ''; });
  bindDrop(zone, show);
}
function mountInline(root, tool, files) {
  const tpl = $('#tool-tpl');
  const sec = tpl.content.firstElementChild.cloneNode(true);
  sec.querySelector('.inline-title').textContent = tool.name[LANG];
  const a = sec.querySelector('.inline-link'); a.href = BASE + tool.id + '/'; a.textContent = t('openPage', { name: tool.name[LANG] });
  const inp = sec.querySelector('input[type=file]'); inp.accept = tool.accept; inp.multiple = !!tool.multiple;
  $('.inline-tool', root)?.remove();
  root.append(sec);
  const panel = new Panel(sec, tool);
  panel.take(files);
}

// ---------- 시작 ----------
function boot() {
  const tool = document.querySelector('[data-tool]');
  if (tool) new Panel(tool, TOOLS[tool.dataset.tool]);
  const hb = document.querySelector('[data-hub]');
  if (hb) hub(hb);
  // 머리 글자판: 짝을 차례로 넘긴다(동작 줄이기면 멈춤)
  const hero = document.querySelector('.hero-flaps');
  if (hero && !REDUCED.matches) {
    const pairs = JSON.parse(hero.dataset.pairs || '[]');
    const [a, b] = hero.querySelectorAll('.flap');
    let i = 0;
    setInterval(() => { if (document.hidden) return; i = (i + 1) % pairs.length; flipTo(a, pairs[i][0]); setTimeout(() => flipTo(b, pairs[i][1]), 260); }, 2800);
  }
  // 다른 언어판 안내 띠(자동으로 넘기지 않음)
  const other = document.querySelector('link[rel=alternate][hreflang="' + (LANG === 'ko' ? 'en' : 'ko') + '"]');
  let dismissed = null; try { dismissed = localStorage.getItem('ip.lang'); } catch (e) {}
  const nav = (navigator.language || '').toLowerCase();
  if (other && !dismissed && (LANG === 'en' ? nav.startsWith('ko') : !nav.startsWith('ko'))) {
    const bar = h('div', { class: 'lang-bar', lang: LANG === 'en' ? 'ko' : 'en' },
      h('a', { href: other.href, onclick: () => { try { localStorage.setItem('ip.lang', LANG === 'en' ? 'ko' : 'en'); } catch (e) {} } }, LANG === 'en' ? '한국어로 보기 →' : 'View in English →'),
      h('button', { type: 'button', class: 'icon', 'aria-label': LANG === 'en' ? '닫기' : 'Close', onclick: () => { bar.remove(); try { localStorage.setItem('ip.lang', LANG); } catch (e) {} } }, '×'));
    document.body.prepend(bar);
  }
  window.IP_ADS && window.IP_ADS.mount();
}
boot();
