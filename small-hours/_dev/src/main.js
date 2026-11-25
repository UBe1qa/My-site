// Small Hours 2: one object, one long chain of transformations. s = screens scrolled (0..FILM_END).
// The sky is the dial -> the crown winds it -> the back opens -> a dive into the balance wheel -> the watch drops
// into a viewfinder -> six people who are up at 3 a.m. -> the last frame is a window onto the bench -> the moon disc
// spins 122 years -> gold lines -> every part -> a crescent -> your line on the back -> a dive back into the dial,
// which turns into tonight's real sky -> dawn -> actual size on paper. Then an ordinary page in the morning.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { makeStudio } from './studio.js';
import { setupWatch } from './watch-setup.js';
import { makeBackdrop } from './backdrop.js';
import { moonState, nextFullMoon, phaseName, SYNODIC } from './moon.js';
import { makeSound } from './sound.js';

const FILM_END = 48.5;
const CH = { c1: [0, 3], c2: [3, 7.6], c3: [7.6, 14], c4: [14, 26], c5: [26, 36], c6: [36, 40.4], c7: [40.4, 46], c8: [46, FILM_END] };
const GO = { c1: 0, c2: 4.0, c3: 8.7, c4: 15.9, c5: 26.7, c6: 37.1, c7: 43.1, c8: 47.6 };
// backdrop: [from s, stage]  0 night · 4 night with tonight's moon · 5 dawn · 7 void · 9 drafting film
// 20.. photographed sets: 20 the desk at night · 21 the drafting table · 22 the engraver's bench · 23 the morning table
const STAGES = [[0, 0], [2.0, 20], [21, 21], [34.9, 7], [36.4, 22], [41.9, 4], [45.9, 23]];
const D = 3.9, FOV = 24;
// The sets. Inside a set the camera stands still DSET away (it only zooms and shifts), the watch turns in front of it,
// and a table lies h below the focus at e degrees: the photo was made from a Blender layout with exactly this camera
// (see _dev/sets/). w(S) = how much the set camera is in charge. light = where the shadow on the table comes from (added to the table's up).
const DSET = 20;
const SETS = [
  { name: 'desk', e: 18, h: 3.34, light: [-0.35, 0, 0.12], shadow: 0.8, tint: [1.07, 0.97, 0.87], w: S => S < 9 ? fit(S, 1.55, 2.15) * (1 - fit(S, 8.6, 9.3)) : fit(S, 13.2, 13.8) },
  { name: 'drafting', e: 48, h: 2.19, light: [-0.35, 0, 0.1], shadow: 0.7, tint: [1.04, 0.98, 0.92], w: S => fit(S, 21, 22) * (1 - fit(S, 34.6, 35.0)) },
  { name: 'engrave', e: 28, h: 2.97, light: [-0.35, 0, 0.12], shadow: 0.8, tint: [1.06, 0.98, 0.88], w: S => fit(S, 36.0, 36.5) * (1 - fit(S, 41.0, 41.45)) },
  { name: 'morning', e: 90, h: 1.54, light: [-0.3, 0, 0], shadow: 0, tint: [1, 1, 1], w: S => fit(S, 46.6, 47.0) },
];
// each chapter has its own light: tungsten at the desk, cold daylight at the drawing board, lume green in the dark,
// brass at the engraver's bench. [from S, gain, lift], crossfaded over 0.6 screens. Applied to the room and the watch.
const GRADES = [
  [0, [1, 1, 1], [0, 0, 0]],
  [2.2, [1.1, 0.96, 0.82], [0.006, 0.002, 0]],
  [14.2, [1, 1, 1], [0, 0, 0]],
  [21.6, [0.8, 0.97, 1.12], [0, 0.006, 0.014]],
  [34.7, [0.38, 1.1, 0.74], [0, 0.075, 0.05]],
  [36.4, [1.25, 0.9, 0.62], [0.022, 0.006, 0]],
  [41.8, [1, 1, 1], [0, 0, 0]],
];
const gradeAt = (S, out) => {
  let i = 0; while (i < GRADES.length - 1 && S >= GRADES[i + 1][0] - 0.3) i++;
  const a = GRADES[Math.max(0, i - 1)], b = GRADES[i], t = i === 0 ? 1 : fit(S, b[0] - 0.3, b[0] + 0.3);
  for (let j = 0; j < 3; j++) { out.g[j] = lerp(a[1][j], b[1][j], t); out.l[j] = lerp(a[2][j], b[2][j], t); }
  return out;
};
const grade = { g: [1, 1, 1], l: [0, 0, 0] };
const setAt = S => S < 17 ? 0 : S < 34.6 ? 1 : S < 44 ? 2 : 3;
// each photo's window in tan space (xc, yc, half w, half h) for phone and wide screens, from the layout script
const SET_WIN = {
  p: [[0, 0.0738, 0.1838, 0.3268], [0, 0.0757, 0.1613, 0.2867], [0, 0.0211, 0.1573, 0.2796], [0, 0.0698, 0.2079, 0.3697]],
  w: [[-0.1124, 0.0224, 0.4138, 0.2328], [-0.1067, 0.0175, 0.3926, 0.2208], [-0.0447, 0.0050, 0.3480, 0.1958], [0, 0.0093, 0.4375, 0.2461]],
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fit = (x, a, b) => clamp((x - a) / (b - a));
const sineInOut = t => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const bell = (x, a, b, c, d) => fit(x, a, b) * (1 - fit(x, c, d));
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;

// ---------- tonight ----------
const now = new Date();
const moonNow = moonState(now);
const nextFull = nextFullMoon(now);
const daysToFull = Math.max(1, Math.round((nextFull - now) / 864e5));
const fmt = (d, o) => d.toLocaleDateString('en-GB', o).toUpperCase();
const pctNow = Math.round(moonNow.fraction * 100);
(function writeMoonText() {
  const name = phaseName(moonNow.phase);
  let l1 = 'Tonight,', l2 = `the moon is ${moonNow.phase < 0.5 ? 'waxing' : 'waning'}.`;   // the per cent is the big number below
  if (Math.abs(moonNow.phase - 0.5) * SYNODIC < 0.6) l2 = 'the moon is full.';
  else if (pctNow <= 2) { l1 = 'Tonight'; l2 = 'there is no moon.'; }
  $('moonLine1').textContent = l1; $('moonLine2').textContent = l2;
  $('moonDate').textContent = `${fmt(now, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${name.toUpperCase()}`;
  $('moonPct').textContent = pctNow;
  $('days').textContent = daysToFull;
  $('fullDate').textContent = `Until the full moon on ${fmt(nextFull, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  $('today').textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  // the almanac: the next twelve full moons, the first one is the launch
  const alm = $('alm'); let from = now;
  for (let i = 0; i < 12; i++) {
    const f = nextFullMoon(from, i === 0);
    const li = document.createElement('li'); if (i === 0) li.className = 'go';
    li.innerHTML = `<i aria-hidden="true"></i><span>${fmt(f, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>`;
    alm.appendChild(li); from = new Date(f.valueOf() + 3 * 864e5);
  }
})();
if (innerWidth >= 900 && !coarse) $('sizeNote').innerHTML = '<strong>39 × 46 × 11.2 mm.</strong> On a phone this chapter shows it at about actual size. The lines under it are wrists of 15, 17 and 19 cm, seen from above.';

// ---------- words that rise into place (time based, started by the scroll) ----------
function splitWords(blk) {
  let n = 0;
  const walk = el => {
    for (const node of [...el.childNodes]) {
      if (node.nodeType === 3) {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); continue; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('i'); i.style.setProperty('--i', n++); i.textContent = p;
          w.appendChild(i); frag.appendChild(w);
        }
        node.replaceWith(frag);
      } else if (node.nodeType === 1) walk(node);
    }
  };
  blk.querySelectorAll('.ln').forEach(walk);
}

// ---------- layout & scroll ----------
let W = innerWidth, H = innerHeight, unit = innerHeight, wide = false;
const track = $('track'), frameEl = $('frame'), gallery = $('gallery');
const FR = { l: 0, t: 0, w: 1, h: 1, cx: 0, cy: 0 };
function layout() {
  W = innerWidth; H = innerHeight;
  wide = W >= 900 && W > H * 1.05;
  // one "screen" of scroll is fixed when the page opens, so the phone's address bar (or the keyboard) does not shift the story
  const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
  if (!layout.done || (!typing && (Math.abs(innerHeight - unit) > 160 || layout.w !== W))) { unit = innerHeight; layout.w = W; }
  layout.done = true;
  track.style.height = `${Math.round(FILM_END * unit + innerHeight)}px`;
  const r = frameEl.getBoundingClientRect();
  Object.assign(FR, { l: r.left, t: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
  gallery.style.setProperty('--fw-px', r.width + 'px');
  gallery.style.setProperty('--fh', (r.height / 2) + 'px');
}
gallery.style.visibility = 'hidden';
layout();
let sRaw = scrollY / unit, s = sRaw;
addEventListener('scroll', () => { sRaw = scrollY / unit; }, { passive: true });

// ---------- text blocks: [element, in from, in to, out from, out to] ----------
const q = sel => document.querySelector(sel);
const TEXT = [
  [$('lie'), -1, -1, 0.75, 1.15], [q('#c1 .hint'), -1, -1, 0.2, 0.5], [$('hero'), 1.75, 2.05, 2.95, 3.3],
  [q('#c2 .bot'), 3.75, 4.05, 6.55, 6.95],
  [q('#c3 .top'), 8.2, 8.5, 13.3, 13.7], [q('#c3 .bot'), 9.0, 9.3, 13.3, 13.7],
  [q('#gallery .head'), 15.3, 15.6, 17.0, 17.4],
  [$('b5a'), 26.25, 26.55, 28.95, 29.3], [$('b5b'), 29.75, 30.05, 31.8, 32.1], [$('b5c'), 32.45, 32.75, 34.55, 34.9],
  [q('#c6 .top'), 36.75, 37.05, 40.0, 40.35],
  [q('#c7 .top'), 42.6, 42.9, 45.4, 45.8], [q('#c7 .bot'), 43.0, 43.3, 45.4, 45.8],
  [q('#c8 .top'), 47.05, 47.35, 99, 99], [q('#c8 .bot'), 47.4, 47.7, 99, 99],
].filter(t => t[0]).map(([el, a, b, c, d]) => { splitWords(el); return { el, a, b, c, d, sec: el.closest('.sc'), on: null, inn: null }; });
const secs = [...document.querySelectorAll('.sc')];

// ---------- sound, menu, form, questions ----------
const sound = makeSound();
const soundBtn = $('sound');
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.st').textContent = on ? ' on' : ' off';
});

const menu = $('menu'), menuBtn = $('menuBtn');
const currentChapter = () => {
  if (scrollY > (FILM_END + 0.6) * unit) {
    const l = $('launch').getBoundingClientRect().top;
    return l < H * 0.6 ? 'launch' : 'questions';
  }
  return Object.keys(CH).find(k => s < CH[k][1]) || 'c8';
};
const setMenu = open => {
  if (open) { const cur = currentChapter(); menu.querySelectorAll('a').forEach(x => x.toggleAttribute('aria-current', x.dataset.go === cur)); }
  menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('a').focus(); else menuBtn.focus();
};
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
$('menuClose').addEventListener('click', () => setMenu(false));
addEventListener('keydown', e => {
  if (menu.hidden) return;
  if (e.key === 'Escape') setMenu(false);
  if (e.key === 'Tab') {   // keep focus inside the open menu
    const f = [...menu.querySelectorAll('a, button')], i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
const goTo = (id, smooth = true) => {
  const behavior = smooth && !reduced ? 'smooth' : 'auto';
  if (id in GO && !root.classList.contains('no-gl')) scrollTo({ top: GO[id] * unit, behavior });
  else $(id)?.scrollIntoView({ behavior });
};
menu.addEventListener('click', e => {
  const a = e.target.closest('a[data-go]'); if (!a) return;
  e.preventDefault(); setMenu(false); goTo(a.dataset.go);
  history.replaceState(null, '', a.dataset.go === 'c1' ? location.pathname : '#' + a.dataset.go);
});
$('top').addEventListener('click', e => { e.preventDefault(); goTo('c1'); });
// keyboard users: focusing something in a chapter that is not on screen scrolls to that chapter
document.addEventListener('focusin', e => {
  const sec = e.target.closest?.('.sc'); if (!sec || root.classList.contains('no-gl')) return;
  const [a, b] = CH[sec.id];
  if (s < a || s > b) goTo(sec.id, false);
});

$('qa').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const open = b.getAttribute('aria-expanded') !== 'true';
  for (const x of $('qa').querySelectorAll('button')) {
    const o = x === b && open; x.setAttribute('aria-expanded', String(o));
    const a = x.nextElementSibling; a.style.height = o ? a.scrollHeight + 'px' : '0px';
  }
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('email').value.trim(), note = $('note');
  const bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $('email').setAttribute('aria-invalid', String(bad));
  if (bad) { note.textContent = v ? "That doesn't look like an email address." : 'Type an email address first.'; $('email').focus(); return; }
  note.textContent = 'Thank you. This is a concept site, so nothing was sent and your address was not kept.';
  $('email').value = '';
});

// ---------- the gallery ----------
const shots = [...$('reel').children], imgs = shots.map(f => f.querySelector('img'));
const CAPS = [['Ward 4, night shift', '03:12'], ['First loaves', '04:05'], ['The 2 a.m. feed', '02:40'], ['Clear sky, finally', '01:55'], ['Last fare home', '03:30'], ['One more page', '04:20'], ['And the bench where it is made', 'Now']];
// the light of each photo spills into the room around the frame: ward teal, oven ember, nursery rose, sky blue, taxi neon, desk lamp, walnut bench
const GLOW = [[[24, 70, 72], [5, 20, 24]], [[96, 44, 16], [26, 10, 4]], [[88, 46, 64], [24, 10, 20]], [[22, 42, 96], [5, 9, 26]], [[96, 22, 76], [24, 4, 22]], [[90, 66, 22], [24, 16, 6]], [[64, 34, 14], [18, 9, 4]]];
// keep each wrist in the picture on a narrow phone (where the watch sits across each photo)
['42% 50%', '4% 50%', '24% 50%', '2% 50%', '86% 50%', '30% 50%'].forEach((p, i) => { if (imgs[i]) imgs[i].style.objectPosition = p; });
const galIndex = x => { const r = fit(x, 16.3, 24.0) * 6, f = Math.floor(r); return Math.min(6, f + sineInOut(fit(r - f, 0.1, 0.9))); };
let capWas = -1;
function galleryFrame(S) {
  const on = S > 14.55 && S < 25.9;
  if (on !== galleryFrame.on) { gallery.style.visibility = on ? 'visible' : 'hidden'; galleryFrame.on = on; }
  if (!on) return;
  gallery.style.opacity = (fit(S, 14.6, 15.1) * (1 - fit(S, 24.9, 25.8))).toFixed(3);
  const e = galIndex(S);
  // the last picture does not slide away: it dissolves, and the bench behind it is simply there (no seam between photo and render)
  $('reel').style.transform = `translate3d(${(-Math.min(e, 5) * FR.w).toFixed(1)}px,0,0)`;
  shots[5].style.opacity = (1 - fit(e, 5.02, 5.35)).toFixed(3);
  imgs.forEach((im, i) => { if (!im) return; const d = clamp(i - e, -1, 1); im.style.transform = `translate3d(${(-d * 22).toFixed(2)}%,0,0) scale(1.2)`; });
  const i0 = Math.floor(e), i1 = Math.min(6, i0 + 1), f = e - i0, mix3 = (a, b) => a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(',');
  const g0 = GLOW[i0], g1 = GLOW[i1];
  // the gallery lies over the watch: see-through while the watch drops in and again once the window onto the bench comes
  gallery.style.background = (S < 16.2 || e > 5.02) ? 'transparent' : `radial-gradient(120% 90% at 50% 60%, rgb(${mix3(g0[0], g1[0])}) 0%, rgb(${mix3(g0[1], g1[1])}) 100%)`;
  imgs[0].style.opacity = fit(S, 15.7, 16.2).toFixed(3);
  const c = Math.round(e);
  if (c !== capWas) { capWas = c; $('cap').className = 'cap p' + [0, 1, 3, 2, 1, 3, 0][c]; $('capL').textContent = CAPS[c][0]; $('capR').textContent = CAPS[c][1]; $('galCount').textContent = `${String(c + 1).padStart(2, '0')} / 07`; }
  $('cap').style.opacity = (fit(S, 15.9, 16.3) * (1 - fit(S, 23.9, 24.3)) * (1 - fit(Math.abs(e - c), 0.25, 0.45))).toFixed(3);
  return e;
}

// ---------- WebGL ----------
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { root.classList.add('no-gl'); root.classList.remove('js'); }
const loaderEl = $('loader');

if (renderer) {
  const DPR = Math.min(coarse ? 1.5 : 1.75, devicePixelRatio || 1);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const studio = makeStudio(renderer, { ambient: 0.5 });
  scene.environment = studio.env;
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 400);
  const backdrop = makeBackdrop();
  const U = backdrop.uniforms;
  const group = new THREE.Group(); scene.add(group);

  // ---------- the photographed sets ----------
  const texLoader = new THREE.TextureLoader(), setTex = { p: [], w: [] }, setEnv = [];
  const loadSets = kind => {
    if (setTex[kind].length) return;
    setTex[kind] = SETS.map((st, i) => texLoader.load(`img/set-${st.name}-${kind}.webp`, t => {
      t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
      if (!setEnv[i]) setEnv[i] = makeStudio(renderer, { ambient: 0.5, photo: t, photoGain: st.envGain ?? 1.5, envOnly: true }).env;
    }));
  };
  texLoader.load('img/moon-map.webp', t => { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; U.tMoon.value = t; U.uMoonMap.value = 1; });
  const useSets = () => {
    const kind = wide ? 'w' : 'p'; loadSets(kind);
    setTex[kind].forEach((t, i) => { U['tSet' + i].value = t; U.uWin.value[i].set(...SET_WIN[kind][i]); });
  };
  // the table under the watch only catches its shadow (the photo is the table you see)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; renderer.shadowMap.autoUpdate = false;
  const sun = new THREE.DirectionalLight(0xffffff, 0.0001);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 9; sun.shadow.blurSamples = 16; sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 90 });
  scene.add(sun, sun.target);
  const catcherMat = new THREE.ShadowMaterial({ color: 0x050302, opacity: 0, depthWrite: false });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), catcherMat);
  catcher.receiveShadow = true; catcher.renderOrder = -3; scene.add(catcher);
  const tint = new THREE.Vector3(1, 1, 1), upV = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
  let strapMats = []; const mvMats = new Map(); const lumeMats = new Set(), lumeCol = new THREE.Color(0.32, 1.0, 0.72);

  // ---------- words as pictures: a few giant words drawn into the world, behind the watch ----------
  const typeCv = document.createElement('canvas'), tg = typeCv.getContext('2d');
  const typeTex = new THREE.CanvasTexture(typeCv); typeTex.minFilter = THREE.LinearFilter; typeTex.generateMipmaps = false;
  U.tType.value = typeTex;
  let typeKey = '';
  const GOLD = '#C9A45C', NAVY = '#14182B';
  function typeFrame(S) {
    // [key, opacity, draw]: one moment at a time
    let m = null;
    const yrs = Math.round(122 * fit(S, 26.3, 28.8));
    const eng = ($('line').value || 'For the small hours').trim();
    if (S > 3.55 && S < 7.15) m = [`r${Math.round(72 * fit(S, 3.75, 6.45))}`, bell(S, 3.55, 4.05, 6.75, 7.15), g => tall(g, `${Math.round(72 * fit(S, 3.75, 6.45))}`, 'hours', GOLD)];
    else if (S > 29.6 && S < 32.2) m = [`v${Math.round(72 * fit(S, 29.9, 30.4))}`, bell(S, 29.6, 30.0, 31.7, 32.1), g => tall(g, `${Math.round(72 * fit(S, 29.9, 30.4))}`, 'hours', GOLD, 0.93)];
    else if (S > 26.0 && S < 29.4) m = [`y${yrs}`, bell(S, 26.0, 26.5, 29.0, 29.4), g => big(g, String(yrs), '', '#EFE6D2', 0.43)];
    U.uTypeOp.value = m ? m[1] : 0;
    if (!m || m[0] === typeKey) return;
    typeKey = m[0];
    const pr = renderer.getPixelRatio(), w = Math.round(W * pr), h = Math.round(H * pr);
    if (typeCv.width !== w || typeCv.height !== h) { typeCv.width = w; typeCv.height = h; typeTex.dispose(); }
    tg.setTransform(pr, 0, 0, pr, 0, 0); tg.clearRect(0, 0, W, H);
    m[2](tg); typeTex.needsUpdate = true;
  }
  // a number that fills the width, its unit small and italic beside it
  function big(g, num, unit, color, y) {
    const lim = (wide ? W * 0.62 : W * 1.04);
    let px = Math.min(H * (wide ? 0.78 : 0.5), lim / (0.52 * num.length + (unit ? 0.4 : 0)));
    g.font = `400 ${px}px "Instrument Serif", Georgia, serif`;
    const nw = g.measureText(num).width; g.font = `italic 400 ${px * 0.42}px "Instrument Serif", Georgia, serif`;
    const uw = unit ? g.measureText(unit).width + px * 0.04 : 0;
    const x0 = (wide ? W * 0.66 : W * 0.5) - (nw + uw) / 2, yb = H * y + px * 0.34;
    g.fillStyle = color; g.textBaseline = 'alphabetic';
    g.font = `400 ${px}px "Instrument Serif", Georgia, serif`; g.letterSpacing = `${-px * 0.04}px`; g.fillText(num, x0, yb);
    if (unit) { g.font = `italic 400 ${px * 0.42}px "Instrument Serif", Georgia, serif`; g.letterSpacing = '0px'; g.fillText(unit, x0 + nw + px * 0.04, yb); }
  }
  // a number standing on its side up the right edge, running behind the watch, its unit small at its foot
  function tall(g, num, unit, color, y = 0.555) {
    const px = wide ? H * 0.62 : Math.min(W * 0.66, H * 0.36);
    g.save(); g.translate(wide ? W * 0.93 : W - px * 0.12, wide ? H * 0.86 : H * y); g.rotate(-Math.PI / 2);
    g.fillStyle = color; g.textBaseline = 'alphabetic';
    g.font = `400 ${px}px "Instrument Serif", Georgia, serif`; g.letterSpacing = `${-px * 0.04}px`; g.fillText(num, 0, 0);
    const nw = g.measureText(num).width;
    g.font = `italic 400 ${px * 0.16}px "Instrument Serif", Georgia, serif`; g.letterSpacing = '0px'; g.fillText(unit, nw + px * 0.05, 0);
    g.restore();
  }
  // the engraving, set as huge italic lines that run off the edges
  function words(g, text, color) {
    const ws = text.split(/\s+/).slice(0, 5), px = Math.min(H * 0.2, (wide ? W * 0.55 : W) / 3.2);
    g.font = `italic 400 ${px}px "Instrument Serif", Georgia, serif`; g.fillStyle = color; g.globalAlpha = 0.85; g.textBaseline = 'middle';
    const cx = wide ? W * 0.66 : W * 0.5, top = H * 0.52 - (ws.length - 1) * px * 0.45;
    ws.forEach((wd, i) => { const tw = g.measureText(wd).width; g.fillText(wd, cx - tw / 2 + (i % 2 ? px * 0.5 : -px * 0.5), top + i * px * 0.9); });
    g.globalAlpha = 1;
  }
  document.fonts?.load('400 40px "Instrument Serif"').then(() => { typeKey = ''; }).catch(() => {});
  document.fonts?.load('italic 400 40px "Instrument Serif"').then(() => { typeKey = ''; }).catch(() => {});

  // soft contact shadow on the paper
  const shTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(20,24,43,0.55)'); r.addColorStop(0.55, 'rgba(20,24,43,0.18)'); r.addColorStop(1, 'rgba(20,24,43,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 9.5), shadowMat);
  shadow.position.set(0.35, -0.45, -1.2); shadow.renderOrder = -1; group.add(shadow);

  // gold lines: the watch drawn as its own blueprint (an outline pass on top of the normal render)
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uC: { value: new THREE.Color(1.0, 0.74, 0.36) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uK; uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float e = pow(f, 14.0) * 2.2 + smoothstep(0.965, 1.0, f) * 1.6; gl_FragColor = vec4(uC * e * uK, 1.0); }',
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, toneMapped: false,
  });

  let watch = null, dialMats = [], dialHoles = [], hideWhenOpen = [], engraveRing = null, engrave = null;
  const draco = new DRACOLoader(); draco.setDecoderPath('assets/draco/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  gltfLoader.load('assets/watch.glb', g => {
    group.add(g.scene);
    watch = setupWatch(g.scene, { glassEnv: studio.soft, polishEnv: studio.tent, anisotropy: 8, glassReflect: 0.14, glassBoost: 0.3, seconds: true });
    const P = watch.parts;
    // the aventurine of the dial can turn see-through: then the sky behind it is the real one
    // (a depth-only copy of the dial is drawn first, so the case behind it never shows: only the backdrop does)
    const holeMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    P.dial.traverse(o => { if (o.isMesh && o.material.name === 'dial') {
      dialMats.push(o.material);
      const m = new THREE.Mesh(o.geometry, holeMat); m.renderOrder = -10; m.name = 'dial_hole'; o.add(m); dialHoles.push(m);
    } });
    hideWhenOpen = ['movement', 'caseback', 'caseback_glass', 'caseback_engraving', 'hand_hour_shadow', 'hand_minute_shadow', 'crystal'].map(n => P[n]).filter(Boolean);
    engrave = makeEngraving(P);
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.name !== 'dial_hole'; o.receiveShadow = false; } });
    for (const n of ['strap_long', 'strap_short']) P[n]?.traverse(o => { if (o.isMesh) strapMats.push(o.material); });
    // lume: hands and indices that glow when the room goes dark
    const LUME = ['gold_satin_free', 'gold_polished_free', 'gold_satin'];
    for (const n of ['hand_hour', 'hand_minute', 'dial']) P[n]?.traverse(o => { if (o.isMesh && LUME.includes(o.material.name) && o.material.emissive) lumeMats.add(o.material); });
    strapMats = [...new Set(strapMats)];
    // the gold moon reads as beaten leaf, not a sticker: deeper relief, a little more sheen
    // brushed steel: the grain catches the light as streaks, not as plastic
    const aniso = new Map();
    g.scene.traverse(o => {
      if (!o.isMesh || !/^steel_(brushed|satin)/.test(o.material.name)) return;
      if (!aniso.has(o.material)) { const p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, o.material); p.defines = { STANDARD: '', PHYSICAL: '' }; p.anisotropy = 0.7; p.anisotropyRotation = 0; aniso.set(o.material, p); }
      o.material = aniso.get(o.material);
    });
    g.scene.traverse(o => { if (o.isMesh && o.material.name === 'moon_gold') { o.material.normalScale.set(2.2, 2.2); o.material.roughness = 0.6; o.material.envMapIntensity = 1.4; } });
    // the movement: when it faces the camera the front key light floods it white, so its reflections are turned down then
    g.scene.traverse(o => { if (o.isMesh && /_mv$/.test(o.material.name)) mvMats.set(o.material, o.material.envMapIntensity); });
    renderer.compile(scene, camera);
    loaderEl.style.transform = 'scaleX(1)'; loaderEl.classList.add('is-done');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
    buildLabels();
    if (/[?&]debug/.test(location.search)) window.__sh = { watch, camera, group, scene, THREE, catcher, sun, renderer, get s() { return s; } };
  }, p => { if (p.total) loaderEl.style.transform = `scaleX(${(p.loaded / p.total) * 0.95})`; },
  () => { root.classList.add('no-gl'); root.classList.remove('js'); loaderEl.classList.add('is-done'); });

  // ---------- your line, cut into the case back ----------
  function makeEngraving(P) {
    const src = P.caseback_engraving; if (!src) return null;
    const box = new THREE.Box3().setFromBufferAttribute(src.geometry.attributes.position);
    const outer = Math.max(box.max.x, -box.min.x, box.max.y, -box.min.y) * 1.005, inner = outer * 0.865;
    const size = 1024, c = document.createElement('canvas'); c.width = c.height = size;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.85, roughness: 0.42, map: tex, transparent: true, emissive: new THREE.Color(0xffb565), emissiveMap: tex, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -4 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160, 1), mat);
    ring.rotation.y = Math.PI; ring.position.z = box.min.z - 0.03; ring.visible = false; ring.renderOrder = 3;
    P.caseback.add(ring); engraveRing = ring;
    const arc = (g, text, mid, r, px, upright) => {
      g.font = `400 ${px}px "Instrument Serif", Georgia, serif`;
      const sp = px * 0.16, widths = [...text].map(ch => g.measureText(ch).width + sp);
      const total = widths.reduce((a, b) => a + b, 0), ang = total / r;
      let a = mid - (upright ? ang / 2 : -ang / 2);
      [...text].forEach((ch, i) => {
        const half = widths[i] / 2 / r; a += upright ? half : -half;
        g.save(); g.rotate(a); g.translate(0, upright ? -r : r); g.rotate(upright ? 0 : Math.PI); g.fillText(ch, 0, 0); g.restore();
        a += upright ? half : -half;
      });
    };
    const draw = line => {
      const g = c.getContext('2d'); g.clearRect(0, 0, size, size);
      g.save(); g.translate(size / 2, size / 2); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const rMid = size / 2 * (1 + inner / outer) / 2, px = size / 2 * (1 - inner / outer) * 0.62;
      arc(g, line.toUpperCase(), 0, rMid, px, true);
      arc(g, 'SMALL HOURS · CAL. SH-01 · No. 001', 0, rMid, px * 0.72, false);
      g.restore(); tex.needsUpdate = true;
    };
    let heat = 0;
    const input = $('line');
    input.addEventListener('input', () => {
      const v = input.value.trim();
      ring.visible = !!v; src.visible = !v;
      if (v) { draw(v); heat = 1; if (sound.on) sound.tick(0.5, 0.6); }
    });
    return { frame(dt) { heat = Math.max(0, heat - dt * 0.8); mat.emissiveIntensity = 2.2 * heat * heat; } };
  }

  // ---------- camera keyframes ----------
  // rot = watch orientation, tgt = point on the watch (scene units) that sits at the screen centre,
  // size = case diameter as a share of the screen width (phone) or height (wide), ox/oy = shift of the image.
  const EX = -Math.PI / 2 + 0.42, PI = Math.PI;
  const pxPerMm = () => (coarse && Math.min(screen.width, screen.height) < 600) ? 6.05 : coarse ? 5.2 : 4.2;
  const O = [0, 0, 0], C = [1.9, 0, -0.2], B = [0.25, -0.1, -0.5], M = [0, -0.8, 0.1], BACK = [0, 0, -0.4];
  const SKY = [-0.62, -0.22, 0.05], SKY2 = [-0.4, -0.18, 0.05], DIVE = [0, -0.8, 0.05];   // the dive goes in through the moon window
  const BAL = [-0.954, 0.124, -0.32], ROT = [0.45, -0.45, -0.45];
  function keys() {
    const ref = wide ? H : W;
    const actual = wide ? 0.42 : (39 * pxPerMm()) / W;
    const fS = FR.w * 0.84 / ref, fOy = -(FR.cy - H / 2) / H, fOx = (FR.cx - W / 2) / W;
    // phone values; wide screens shrink the watch and move it right of the text unless a key says otherwise
    const k = (s, rx, ry, rz, tgt, size, oy = 0, ox = 0, w) => {
      if (wide) { if (w) [size, oy, ox] = w; else { size *= 0.6; oy *= 0.3; ox += 0.16; } }
      return { s, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'ZYX')), tgt: new THREE.Vector3(...tgt), size, oy, ox };
    };
    const fr = [fS, fOy, fOx];
    return [
      k(0, 0, 0, 0, SKY, 10.5, 0, 0, [12, 0, 0]),
      k(0.95, -0.04, 0.02, 0, SKY2, 3.0, -0.02, 0, [2.6, 0, 0.05]),
      k(2.0, -0.26, 0, 0, O, 0.74, -0.17),
      k(3.0, -0.30, -0.2, 0.05, O, 0.8, -0.12),
      k(3.75, -0.25, -1.1, -0.75, C, 2.0, 0.21),
      k(6.45, -0.35, -0.95, -0.62, C, 1.9, 0.21),
      k(7.1, 0.3, PI - 0.55, 0.2, B, 1.55, 0.2),
      k(8.3, 0.32, PI - 0.42, 0.25, B, 1.45, 0.2),
      k(10.2, 0.15, PI - 0.2, 0.05, BAL, 5.0, 0.0, 0, [3.2, 0, 0.16]),
      k(11.8, 0.1, PI - 0.08, 0.12, BAL, 5.6, 0.0, 0, [3.5, 0, 0.16]),
      k(13.0, 0.12, PI + 0.15, 0, ROT, 1.8, 0.05),
      k(14.0, 0.0, PI + 0.3, 0, BACK, 0.9, 0.0),
      k(14.9, -0.42, 0.62, 0.32, O, fS, fOy, fOx, fr),
      k(16.0, -0.4, 0.55, 0.3, O, fS, fOy, fOx, fr),
      k(22.6, -0.62, 0.3, 0.4, O, fS * 0.95, fOy, fOx, [fS * 0.95, fOy, fOx]),
      k(24.0, -0.6, 0.25, 0.4, O, fS * 0.95, fOy, fOx, [fS * 0.95, fOy, fOx]),
      k(26.0, -0.5, 0.1, 0, M, 0.95, -0.3, 0, [1.0, -0.1, 0.2]),
      k(28.9, -0.45, 0.03, 0, M, 1.0, -0.3, 0, [1.05, -0.1, 0.2]),
      k(29.8, -0.3, -0.45, 0.15, O, 0.85, -0.08, -0.3, [0.95, -0.02, -0.05]),
      k(31.9, -0.25, -0.15, 0.1, O, 0.88, -0.08, -0.28, [1.0, -0.02, -0.03]),
      k(32.4, EX, 0, 0, O, 0.6, -0.02, -0.08, [0.4, 0, 0.12]),
      k(33.1, EX, 0.06, 0, [0, 0, 4.8], 0.46, 0.1, -0.13, [0.27, 0.1, 0.13]),
      k(34.4, EX, -0.06, 0, [0, 0, -6.2], 0.46, 0.12, -0.13, [0.27, 0.12, 0.13]),
      k(35.2, -0.05, 0, 0, O, 0.62, 0.0, 0, [0.5, 0, 0]),
      k(35.9, -0.05, 0, 0, O, 0.62, 0.0, 0, [0.5, 0, 0]),
      k(36.7, 0.12, PI - 0.15, 0, BACK, 0.92, -0.1),
      k(39.8, 0.10, PI + 0.12, 0, BACK, 0.95, -0.1),
      k(40.6, -0.08, 0, 0, O, 0.8, -0.04, 0, [0.55, 0, 0]),
      k(41.45, 0, 0, 0, DIVE, 9, 0, 0, [6, 0, 0]),
      k(45.6, 0.5, -0.6, -0.9, O, 0.3, 0.05, 0, [0.2, 0, 0]),
      k(46.35, -0.15, -0.2, -0.6, O, 0.95, 0.05, 0, [0.62, 0, 0.14]),
      k(47.0, 0, 0, -0.5, O, actual, -0.1, 0, [actual, -0.02, 0]),
      k(48.5, 0, 0, -0.5, O, actual, -0.1, 0, [actual, -0.02, 0]),
    ];
  }
  // the camera path: one smooth curve through all the keys (monotone cubic, so it never overshoots a key
  // and a held pose stays held), instead of easing in and out of every key like a robot arm
  function makeTrack(K) {
    const n = K.length, xs = K.map(k => k.s);
    for (let i = 1; i < n; i++) if (K[i].q.dot(K[i - 1].q) < 0) K[i].q.set(-K[i].q.x, -K[i].q.y, -K[i].q.z, -K[i].q.w);
    const ch = [k => k.q.x, k => k.q.y, k => k.q.z, k => k.q.w, k => k.tgt.x, k => k.tgt.y, k => k.tgt.z, k => Math.log(k.size), k => k.oy, k => k.ox].map(f => K.map(f));
    const sl = ch.map(ys => {
      const d = [], m = new Array(n).fill(0);
      for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
      for (let i = 1; i < n - 1; i++) {
        if (d[i - 1] * d[i] <= 0) continue;
        const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
      return m;
    });
    const out = new Array(ch.length);
    return x => {
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = clamp((x - xs[i]) / h), t2 = t * t, t3 = t2 * t;
      const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, e = t3 - t2;
      for (let j = 0; j < ch.length; j++) out[j] = a * ch[j][i] + b * h * sl[j][i] + c * ch[j][i + 1] + e * h * sl[j][i + 1];
      return out;
    };
  }
  let K = keys(), track = makeTrack(K);
  const pose = { q: new THREE.Quaternion(), tgt: new THREE.Vector3(), size: 1, oy: 0, ox: 0 };
  function poseAt(x) {
    const v = track(x);
    pose.q.set(v[0], v[1], v[2], v[3]).normalize();
    pose.tgt.set(v[4], v[5], v[6]);
    pose.size = Math.exp(v[7]); pose.oy = v[8]; pose.ox = v[9];
    return pose;
  }

  // ---------- the finish: the watch is drawn into its own HDR layer, gets a bloom, then film tone, grain and a vignette ----------
  renderer.setClearColor(0x000000, 0);
  const sceneRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: coarse ? 2 : 4 });
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.12, 0.35, 3.0);
  const finish = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tScene: { value: sceneRT.texture }, uExp: { value: 1 }, uWarm: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uLoupe: { value: 0 }, uTime: { value: 0 }, uVig: { value: 0.4 }, uGrain: { value: 0.03 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tScene; uniform float uExp, uTime, uVig, uGrain, uWarm, uLoupe; uniform vec3 uTint; uniform vec2 uRes; varying vec2 vUv;
      vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        return clamp(O * rrt(I * (c / 0.6)), 0.0, 1.0); }
      // AgX (Blender's view transform) with a punchy look: highlights roll off into colour instead of clipping to white
      vec3 agx(vec3 c){
        const mat3 I = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
        const mat3 O = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
        const mat3 toR = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
        const mat3 toS = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
        c = I * (toR * c * 1.6);
        c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
        vec3 x2 = c * c, x4 = x2 * x2;
        c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = pow(max(c, 0.0), vec3(1.3)); l = pow(max(l, 0.0), 1.3);
        c = l + 1.25 * (c - l);
        c = O * c;
        return clamp(toS * pow(max(c, 0.0), vec3(2.2)), 0.0, 1.0); }
      vec3 srgb(vec3 c){ return mix(pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 t = texture2D(tScene, vUv);
        vec3 c = srgb(agx(max(t.rgb, 0.0) * uExp * uTint * mix(vec3(1.0), vec3(1.12, 0.94, 0.80), uWarm)));
        float v = smoothstep(0.35, 1.15, length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.15)) * uVig;
        // inside the movement we look through a loupe: a circle of light, a thin bright rim, black around it
        vec2 lq = (vUv - 0.5) * uRes / min(uRes.x, uRes.y); float ld = length(lq - vec2(0.0, -0.04)), lr = 0.47;
        v = max(v, uLoupe * smoothstep(lr, lr + 0.012, ld) * 0.97);
        c *= 1.0 - v;
        c += uLoupe * vec3(0.95, 0.88, 0.74) * 0.35 * exp(-pow((ld - lr - 0.004) / 0.0035, 2.0));
        c += (h(floor(vUv * uRes) + fract(uTime) * 71.0) - 0.5) * uGrain;
        gl_FragColor = vec4(c, 1.0 - (1.0 - clamp(t.a, 0.0, 1.0)) * (1.0 - v));
      }`,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, depthTest: false, depthWrite: false, transparent: true,
  }));

  // ---------- part labels for the exploded view ----------
  const LABELS = [['crystal', 'Sapphire', 15.5], ['bezel', 'Bezel', 19.5], ['hand_minute', 'Hands', 2], ['dial', 'Dial', 15.5],
    ['moon_disc', 'Moon disc', 6], ['mv_barrel', 'Barrel', 5.5], ['mv_wheel_third', 'Wheels', 4],
    ['mv_balance', 'Balance', 5], ['mv_bridge_train', 'Bridges', 12], ['rotor', 'Micro-rotor', 7], ['caseback', 'Case back', 19.5]];
  const labelsEl = $('labels'); let labelNodes = [];
  function buildLabels() {
    labelNodes = LABELS.filter(([n]) => watch.parts[n]).map(([n, text, r], i) => {
      const el = document.createElement('div'); el.className = 'lab';
      el.innerHTML = `<i></i><b>${String(i + 1).padStart(2, '0')}</b><span>${text}</span>`;
      labelsEl.appendChild(el); return { el, obj: watch.parts[n], r: r * 0.1, line: el.firstChild };
    });
  }
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), right = new THREE.Vector3();
  function placeLabels(show) {
    if (!labelNodes.length) return;
    if (show <= 0.001) { if (placeLabels.was) for (const l of labelNodes) l.el.style.opacity = 0; placeLabels.was = false; return; }
    placeLabels.was = true;
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    for (const l of labelNodes) {
      l.obj.getWorldPosition(v3);
      v3b.copy(v3).addScaledVector(right, l.r);
      v3.project(camera); v3b.project(camera);
      const y = (1 - v3.y) / 2 * H, xEdge = (v3b.x + 1) / 2 * W + 6;
      const width = Math.max(0, W - (wide ? 64 : 24) - xEdge);
      const vis = show * fit(y, 70, 110) * (1 - fit(y, H - 70, H - 30)) * (width > 60 ? 1 : 0);
      l.el.style.opacity = vis.toFixed(3);
      l.el.style.transform = `translate(${xEdge.toFixed(1)}px, ${(y - 6).toFixed(1)}px)`;
      l.el.style.width = width.toFixed(1) + 'px';
      l.line.style.flex = '1';
    }
  }

  // ---------- the crescent: two rings leave the case and become the mark ----------
  const NS = 'http://www.w3.org/2000/svg', logo = $('logo');
  logo.innerHTML = `<defs><mask id="lm" maskUnits="userSpaceOnUse"><rect x="-9999" y="-9999" width="99999" height="99999" fill="#fff"/><circle id="lmB" style="fill:#000;stroke:none"/></mask></defs><circle id="lA"/><circle id="lB"/><circle id="lF" mask="url(#lm)" style="fill:#C9A45C;stroke:none"/>`;
  const lA = $('lA'), lB = $('lB'), lF = $('lF'), lmB = $('lmB');
  const setC = (el, x, y, r) => { el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1)); el.setAttribute('r', Math.max(0, r).toFixed(1)); };
  function logoFrame(S, caseR, cx, cy) {
    const op = fit(S, 35.0, 35.35) * (1 - fit(S, 36.15, 36.5));
    if (op <= 0) { if (logo._on) { logo.style.opacity = 0; logo._on = false; } return; }
    logo._on = true; logo.style.opacity = op.toFixed(3);
    const t = sineInOut(fit(S, 35.35, 35.95));
    const R = lerp(caseR * 1.02, Math.min(W, H) * (wide ? 0.13 : 0.2), t);
    const x = lerp(cx, W / 2, t), y = lerp(cy, H * (wide ? 0.5 : 0.56), t);
    const off = R * 0.42 * sineInOut(fit(S, 35.6, 36.0));
    setC(lA, x, y, R); setC(lB, x + off, y - off * 0.35, R * 0.98);
    setC(lF, x, y, R); setC(lmB, x + off, y - off * 0.35, R * 0.98);
    lF.style.opacity = fit(S, 35.8, 36.05).toFixed(3);
    lB.style.opacity = (1 - fit(S, 35.85, 36.05)).toFixed(3);
  }

  // ---------- actual-size markings printed on the paper ----------
  const MM = 12, PW = 110, PH = 170;
  const marksCanvas = document.createElement('canvas');
  const drawMarks = () => {
    const c = marksCanvas; c.width = PW * MM; c.height = PH * MM;
    const g = c.getContext('2d'); g.scale(MM, MM); g.translate(PW / 2, PH / 2);
    const ink = 'rgba(20,24,43,0.55)', gold = '#A8853F';
    g.lineWidth = 0.16; g.font = '500 2.1px "Inter Tight", system-ui, sans-serif'; g.fillStyle = 'rgba(20,24,43,0.7)';
    // wrists of 15, 17 and 19 cm seen from above: width is about 0.37 x the circumference
    g.textAlign = 'center';
    [150, 170, 190].forEach((cm, i) => {
      const w = cm * 0.371 / 2;
      g.strokeStyle = i === 1 ? gold : ink; g.lineWidth = i === 1 ? 0.22 : 0.14; g.setLineDash(i === 1 ? [] : [0.6, 1.0]);
      g.beginPath(); g.moveTo(-w, -80); g.lineTo(-w, 80); g.moveTo(w, -80); g.lineTo(w, 80); g.stroke();
      g.save(); g.translate(w + 1.2, 26 + i * 6); g.rotate(-Math.PI / 2); g.textAlign = 'left'; g.fillText(`${cm / 10} CM`, 0, 0); g.restore();
    });
    g.setLineDash([]);
    g.strokeStyle = gold; g.lineWidth = 0.2;
    const y = -31; g.beginPath(); g.moveTo(-19.5, y - 1.5); g.lineTo(-19.5, y + 1.5); g.moveTo(19.5, y - 1.5); g.lineTo(19.5, y + 1.5); g.moveTo(-19.5, y); g.lineTo(19.5, y); g.stroke();
    g.textAlign = 'center'; g.fillText('39 MM', 0, y - 1.6);
    g.strokeStyle = ink; g.lineWidth = 0.12; g.textAlign = 'left';
    const x0 = -63.1 / 2;
    for (let i = -60; i <= 60; i++) {
      const len = i % 10 === 0 ? 2.6 : i % 5 === 0 ? 1.6 : 0.9;
      g.beginPath(); g.moveTo(x0, i); g.lineTo(x0 + len, i); g.stroke();
      if (i % 10 === 0 && i > -60) g.fillText(String((i + 60) / 10), x0 + 3.2, i + 0.8);
    }
  };
  drawMarks();
  const marks = new THREE.CanvasTexture(marksCanvas); marks.colorSpace = THREE.SRGBColorSpace; marks.anisotropy = 4;
  document.fonts?.load('500 12px "Inter Tight"').then(() => { drawMarks(); marks.needsUpdate = true; }).catch(() => {});
  document.fonts?.load('400 12px "Instrument Serif"').catch(() => {});
  const marksMat = new THREE.MeshBasicMaterial({ map: marks, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const marksMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW / 10, PH / 10), marksMat);
  marksMesh.renderOrder = -2; scene.add(marksMesh);

  // ---------- helpers ----------
  const proj = new THREE.Vector3();
  const toScreen = (x, y, z) => { proj.set(x, y, z).applyMatrix4(group.matrixWorld).project(camera); return [(proj.x + 1) / 2 * W, (1 - proj.y) / 2 * H]; };
  const clockEl = $('clock'), flash = $('flash'), barEl = document.querySelector('.bar');
  const nightMinutes = S => 22 * 60 + 8 + Math.max(0, S - 7.1) * (470 / (FILM_END - 7.1));

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let lastCrownStep = 0, beatAcc = 0, spun = false, moonCued = false, woundAt = -1, clockWas = '';
  function resize() {
    layout(); K = keys(); track = makeTrack(K); useSets();
    renderer.setSize(W, H, false);
    const pr = renderer.getPixelRatio();
    sceneRT.setSize(Math.round(W * pr), Math.round(H * pr)); bloom.setSize(Math.round(W * pr), Math.round(H * pr));
    finish.material.uniforms.uRes.value.set(W * pr, H * pr);
    camera.aspect = W / H;
    U.uRes.value.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
    U.uDpr.value = renderer.getPixelRatio();
  }
  addEventListener('resize', resize);
  resize();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, clock.getDelta()), time = clock.elapsedTime;
    // wheels and trackpads move in steps: ease a little on desktop. Fingers already have inertia.
    s = coarse || reduced ? sRaw : s + (sRaw - s) * (1 - Math.exp(-dt * 14));
    if (Math.abs(sRaw - s) < 1e-4) s = sRaw;
    const S = clamp(s, 0, FILM_END);

    // text
    const secOn = new Set();
    for (const t of TEXT) {
      const op = (t.a < 0 ? 1 : fit(S, t.a, t.b)) * (1 - fit(S, t.c, t.d));
      const inn = S >= t.a && S < t.c + (t.d - t.c) * 0.5;
      if (inn !== t.inn) { t.el.classList.toggle('is-in', inn); t.inn = inn; }
      if (op > 0.003) secOn.add(t.sec);
      const o = op.toFixed(3); if (o !== t.on) { t.el.style.opacity = o; t.on = o; }
    }
    for (const sec of secs) { const on = secOn.has(sec); if (on !== sec._on) { sec._on = on; sec.classList.toggle('is-on', on); sec.style.opacity = on ? 1 : 0; } }

    // the clock in the margin: the night passing
    const T = nightMinutes(S), hh = Math.floor(T / 60) % 24, mm = Math.floor(T % 60);
    const cs = `<b>${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}</b> ${hh >= 12 ? 'PM' : 'AM'}`;
    if (cs !== clockWas) { clockEl.innerHTML = cs; clockWas = cs; }
    clockEl.style.opacity = s > FILM_END + 0.2 ? 0 : 1;
    // after the night the bar sits on paper or on the dark bands: follow what is under it
    let onPaper = false;
    if (s > FILM_END + 0.6) { const el = document.elementsFromPoint(W / 2, 30).find(e => !e.closest('header')); onPaper = !!el && !el.closest('.launch') && !!el.closest('#after'); }
    if (onPaper !== frame.onPaper) { frame.onPaper = onPaper; barEl.classList.toggle('on-paper', onPaper); }
    const solid = s > FILM_END + 0.3; if (solid !== frame.solid) { frame.solid = solid; barEl.classList.toggle('solid', solid); }

    const e = galleryFrame(S);
    const paperOn = S > 46.9 && s < FILM_END + 0.8;
    if (paperOn !== document.body._paper) { document.body.classList.toggle('is-paper', paperOn); document.body._paper = paperOn; document.querySelector('meta[name=theme-color]').content = paperOn ? '#EEE8DC' : '#070A18'; }

    // power reserve while winding
    const wound = fit(S, 3.75, 6.45);
    if (wound !== frame.wound) { frame.wound = wound; $('reserveNum').textContent = Math.round(72 * wound) + ' h'; $('reserveBar').style.transform = `scaleX(${wound.toFixed(3)})`; }
    // the bench: counters
    const spin = fit(S, 26.3, 28.8);
    $('years').textContent = Math.round(122 * spin); $('off').textContent = spin >= 1 ? 1 : 0;
    $('drift').style.left = (spin * 100).toFixed(1) + '%';
    $('hours').textContent = Math.round(72 * sineInOut(fit(S, 30.0, 31.6)));

    // the canvas: where it is seen during the gallery (the viewfinder, then the window), and whether to draw at all
    let clip = null, canvasOp = 1, z = '0', extraOx = 0;
    if (S > 14.7 && S < 26) {
      z = '4';
      const inset = [FR.t, W - FR.l - FR.w, H - FR.t - FR.h, FR.l];   // top right bottom left
      if (S < 16.3) { const t = sineInOut(fit(S, 14.8, 15.6)); clip = inset.map(v => v * t); canvasOp = 1 - fit(S, 15.7, 16.2); }
      else if (S < 24) {
        const off = e > 5 ? 0 : FR.w;   // the bench is behind the last picture, which dissolves
        clip = [inset[0], inset[1], inset[2], inset[3] + off]; canvasOp = off >= FR.w - 0.5 ? 0 : 1; extraOx = off / W;
      } else { const t = sineInOut(fit(S, 24.0, 25.8)); clip = inset.map(v => v * (1 - t)); }
    }
    if (z !== canvas._z) { canvas.style.zIndex = z; canvas._z = z; }
    const cl = clip ? `inset(${clip.map(v => Math.max(0, v).toFixed(1) + 'px').join(' ')})` : '';
    if (cl !== canvas._cl) { canvas.style.clipPath = cl; canvas.style.webkitClipPath = cl; canvas._cl = cl; }
    const co = canvasOp.toFixed(3); if (co !== canvas._op) { canvas.style.opacity = co; canvas._op = co; }
    const draw = canvasOp > 0 && s < FILM_END + 1.05;

    // sound that follows the film
    sound.level(S < 41.9 ? 0.55 : 0.4);
    sound.frame(dt);

    if (!draw) { if (watch) watch.setMovement(time, 90, fit(S, 7.05, 7.5)); return; }

    // ---- backdrop stage and wipe ----
    let from = 0, to = 0, wipe = 0;
    for (let i = 0; i < STAGES.length; i++) if (S >= STAGES[i][0] - 0.45) from = STAGES[i][1];
    for (let i = 1; i < STAGES.length; i++) {
      const [b, st] = STAGES[i];
      if (S > b - 0.45 && S < b + 0.15) { from = STAGES[i - 1][1]; to = st; wipe = fit(S, b - 0.45, b + 0.15); }
    }
    U.uFrom.value = from; U.uTo.value = to; U.uWipe.value = wipe;
    U.uTime.value = reduced ? 0 : time;
    U.uDrift.value = S * 30;
    U.uBeam.value = lerp(-0.9, 0.9, fit(S, 21, 41));
    // tonight's moon in the real sky
    const minD = Math.min(W, H), grow = sineInOut(fit(S, 42.2, 43.8));
    U.uMoon.value.set(W * (wide ? 0.66 : 0.5), H * (wide ? 0.5 : 0.47), minD * lerp(0.05, wide ? 0.34 : 0.47, grow), 1);   // tonight's moon fills the frame
    U.uPhase.value = moonNow.phase * Math.PI * 2;

    // ---- watch ----
    poseAt(S);
    group.quaternion.copy(pose.q);
    const tgtW = v3.copy(pose.tgt).applyQuaternion(pose.q);
    group.position.copy(tgtW).negate();   // the point we look at sits at the origin, the camera on +Z
    group.updateMatrixWorld();
    const backK = lerp(1, 0.5, fit(-v3b.set(0, 0, 1).applyQuaternion(pose.q).z, -0.1, 0.6));
    if (backK !== frame.backK) { frame.backK = backK; for (const [m, b] of mvMats) m.envMapIntensity = b * backK; }
    const ref = wide ? H : W;
    const dist = D * H / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * pose.size * ref);
    // inside a set the camera stands still and zooms; between sets it travels as before
    const si = setAt(S), SET = SETS[si], sw = SET.w(S);
    const camDist = Math.exp(lerp(Math.log(dist), Math.log(DSET), sw));
    const tanH = D * H / (2 * pose.size * ref * camDist);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanH));
    camera.position.set(0, 0, camDist);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.05, camDist - 12); camera.far = camDist + 60;
    const ox = pose.ox + extraOx;
    camera.setViewOffset(W, H, -ox * W, pose.oy * H, W, H);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    U.uCam.value.set(tanH, W / H, ox, pose.oy);
    // the table and its shadow
    const er = THREE.MathUtils.degToRad(SET.e);
    upV.set(0, Math.cos(er), Math.sin(er));
    catcher.position.copy(upV).multiplyScalar(-SET.h);
    catcher.quaternion.setFromUnitVectors(zAxis, upV);
    catcherMat.opacity = SET.shadow * sw * (1 - bell(S, 32.2, 32.6, 34.4, 34.8));   // the parts float off the table during the explode
    catcher.visible = catcherMat.opacity > 0.003;
    if (catcher.visible) {
      sun.position.set(...SET.light).add(upV).normalize().multiplyScalar(40); sun.target.position.set(0, -SET.h * 0.5, 0);
      sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
      renderer.shadowMap.needsUpdate = true;
    }
    tint.set(1, 1, 1).lerp(v3b.set(...SET.tint), sw);
    const envWant = sw > 0.5 && setEnv[si] ? setEnv[si] : studio.env;
    if (scene.environment !== envWant) scene.environment = envWant;
    gradeAt(S, grade); U.uGain.value.set(...grade.g); U.uLift.value.set(...grade.l);
    tint.multiply(v3b.set(...grade.g));
    finish.material.uniforms.uTint.value.copy(tint);

    // the dial as a window: see-through at the start (the sky is the dial) and again when we dive back into it
    const dialOp = S < 30 ? fit(S, 1.15, 1.6) : 1 - fit(S, 41.9, 42.35) * (1 - fit(S, 45.6, 45.62));
    group.visible = !(S > 42.4 && S < 45.6);
    const pxPerUnit = H / (2 * tanH * camDist);
    const [cx, cy] = toScreen(0, 0, 0);
    let zoom = 1;
    if (S < 2.2) zoom = Math.max(1, pose.size / 0.74);
    else if (S > 40.6 && S < 45.6) zoom = S < 41.9 ? Math.max(1, pose.size / 0.8) : lerp(pose.size / 0.8 * 0.8, 1, sineInOut(fit(S, 41.9, 43.4)));
    U.uZoom.value.set(cx, H - cy, zoom);
    U.uHole.value.set(cx, H - cy, 1.62 * pxPerUnit, bell(S, 0.4, 1.4, 2.3, 3.1));
    U.uIris.value.set(cx, H - cy, 1);
    typeFrame(S);

    // the flash when the balance starts to swing
    const fl = Math.exp(-Math.pow((S - 7.2) / 0.22, 2));
    flash.style.opacity = fl > 0.01 ? (0.55 * fl).toFixed(3) : 0;

    // exposure: the logo moment turns the watch into a silhouette (a new moon), the blueprint dims it under the lines
    const bp = bell(S, 29.4, 29.9, 31.9, 32.3);
    const dim = bell(S, 34.75, 35.2, 36.15, 36.6);
    const exposure = (1 - 0.3 * bell(S, 6.5, 7.0, 8.4, 8.9)) * (1 + 0.6 * fl) * (1 - 0.95 * bp) * (1 - 0.985 * dim) * (1 - 0.5 * bell(S, 8.6, 9.6, 12.8, 13.6)) * (1 + 0.15 * bell(S, 45.7, 46.3, 46.9, 47.3));
    finish.material.uniforms.uExp.value = exposure;
    finish.material.uniforms.uTime.value = reduced ? 0 : time;
    lineMat.uniforms.uK.value = bp / exposure;
    // the bloom: a quiet glow on polished edges, a burst when the balance starts, the gold lines of the blueprint glowing
    bloom.strength = 0.12 + 0.55 * fl + 0.08 * bp;
    bloom.threshold = 3.0 - 1.8 * fl - 2.85 * bp;
    finish.material.uniforms.uWarm.value = bell(S, 45.7, 46.3, 46.9, 47.3);
    finish.material.uniforms.uLoupe.value = bell(S, 8.3, 9.0, 13.2, 13.8);

    const paperW = fit(S, 46.9, 47.3);
    shadowMat.opacity = 0.9 * paperW;
    marksMat.opacity = fit(S, 47.0, 47.4);
    marksMesh.visible = marksMat.opacity > 0.001;
    marksMesh.position.set(0, 0, -1.3); marksMesh.scale.setScalar((camDist + 1.3) / camDist);
    marksMesh.rotation.z = -0.5;

    if (watch) {
      const P = watch.parts;
      for (const m of dialMats) { const t = dialOp < 0.999; if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; } m.opacity = dialOp; }
      const open = dialOp < 0.999;
      for (const o of hideWhenOpen) o.visible = !open;
      for (const m of dialHoles) m.visible = open;
      if (engraveRing) engraveRing.visible = engraveRing.visible && !open;

      // the explode
      const ex = fit(S, 32.3, 33.2) * (1 - fit(S, 34.4, 35.1));
      watch.setExplode(ex, 'detail', 0.55);
      if (bp > 0.5 && P.strap_long) P.strap_long.visible = P.strap_short.visible = false;   // gold outlines on leather read as a mustard strap
      // on the benches the watch is a head without its strap (as it is while being made): the strap goes after the hero, comes back for the night sky
      const strapOp = S < 14 ? 1 - fit(S, 3.15, 3.6) : fit(S, 14.3, 14.8) * (1 - bell(S, 32.0, 32.3, 34.7, 35.1));
      if (strapOp < 1) {
        for (const m of strapMats) { m.transparent = true; m.opacity = Math.min(m.opacity, strapOp); }
        if (strapOp < 0.01 && P.strap_long) P.strap_long.visible = P.strap_short.visible = false;
      }
      // winding: one turn of the crown per screen, a tick every 30 degrees
      const crown = Math.PI * 2 * clamp(S - 3.75, 0, 2.7);
      watch.setCrown(crown, 0);
      const step = Math.floor(crown / (Math.PI / 6));
      if (step !== lastCrownStep) { if (S < 6.6 && Math.abs(step - lastCrownStep) < 4) sound.tick(0.32, 1); lastCrownStep = step; }
      // the movement starts with the flash
      const amp = fit(S, 7.05, 7.5);
      watch.setMovement(time, 90, amp);
      watch.setRotor(S * 0.9 + Math.PI * 2 * sineInOut(fit(S, 12.2, 13.9)));
      if (amp > 0 && S < 41.9 && !(S > 16 && S < 22.6)) { beatAcc += dt * 8; if (beatAcc >= 1) { beatAcc %= 1; sound.tick(S < 14 ? 0.07 : 0.035, 1.25); } }
      if (S > 7.15 && !frame.flashed) { frame.flashed = true; sound.clack(); } if (S < 6.9) frame.flashed = false;
      // hands: stopped at 10:08 until it is wound, then the night runs with the scroll
      // before the dive the hands sweep up to 10:08, clear of the moon window we go through, and come back once we are out
      const cur = T % 720, away = sineInOut(fit(S, 40.25, 41.0)) * (1 - fit(S, 45.3, 45.8));
      const Td = cur + (((608 - cur) % 720 + 720) % 720) * away;
      watch.setTime(Math.floor(Td / 60), Td % 60);
      if (amp > 0.02 && woundAt < 0) woundAt = time; if (amp <= 0.02) woundAt = -1;
      const run = woundAt < 0 ? 0 : Math.floor((time - woundAt) * 8) / 8;
      if (P.hand_second) P.hand_second.rotation.z = -((23 + run) % 60) / 60 * Math.PI * 2 * (1 - away) - Math.PI / 2 * away;   // parked at three o'clock, its tail out of the moon window
      // the moon disc: 122 years in three screens, then one click
      const spinE = spin < 1 ? sineInOut(spin) : 1;
      watch.setMoonAge((moonNow.age + SYNODIC * 24 * spinE) % SYNODIC);
      if (spin >= 1 && !spun) { spun = true; sound.clack(); } if (spin < 0.95) spun = false;
      // tonight's real moon, with its music
      if (S > 42.6 && !moonCued) { moonCued = true; sound.moon(); }
      if (S < 41 && moonCued) { moonCued = false; sound.resetMoon(); }
      engrave?.frame(dt);
      // the lights go out before the crescent: only the lume is left
      const lume = bell(S, 34.7, 35.1, 36.2, 36.6);
      if (lume !== frame.lume) { frame.lume = lume; for (const m of lumeMats) { m.emissive.copy(lumeCol); m.emissiveIntensity = lume * 0.9 / Math.max(0.02, exposure); } }
    }

    // render
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(backdrop.scene, backdrop.cam);
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    if (group.visible || marksMesh.visible) renderer.render(scene, camera);
    if (bp > 0.001 && watch) {
      scene.overrideMaterial = lineMat; const sh = shadow.visible, mk = marksMesh.visible, ct = catcher.visible; shadow.visible = marksMesh.visible = catcher.visible = false;
      renderer.render(scene, camera);
      scene.overrideMaterial = null; shadow.visible = sh; marksMesh.visible = mk; catcher.visible = ct;
    }
    bloom.render(renderer, null, sceneRT);
    renderer.setRenderTarget(null);
    finish.render(renderer);
    placeLabels(fit(S, 33.2, 33.5) * (1 - fit(S, 34.2, 34.5)));
    logoFrame(S, 0.5 * pose.size * ref, cx, cy);
  }
  requestAnimationFrame(frame);
}

// open on a chapter from the address (#c3 etc.)
const hm = /^#(c[1-8]|questions|launch)$/.exec(location.hash);
if (hm) requestAnimationFrame(() => goTo(hm[1], false));
