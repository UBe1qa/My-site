// Small Hours: one scroll drives everything. s = screens scrolled (0..END). Each scene is a range of s,
// and every movement is a fit() of s inside that range (the Oryzo way: real browser scroll, no hijacking).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { makeStudio } from './studio.js';
import { setupWatch } from './watch-setup.js';
import { makeBackdrop } from './backdrop.js';
import { moonState, nextFullMoon, phaseName, SYNODIC } from './moon.js';
import { makeSound } from './sound.js';

const END = 17;
const SCENES = [[0, 2], [2, 4.5], [4.5, 8.5], [8.5, 10.5], [10.5, 13.5], [13.5, 16], [16, 17]];
const STAGES = [[0, 0], [4.5, 1], [8.5, 2], [10.5, 3], [13.5, 4]];   // [starts at s, backdrop stage]
// when each scene's text comes in, relative to its start (scene 7 waits for the watch to shrink)
const IN = [[0, 0], [0.05, 0.4], [0.1, 0.45], [0.45, 0.8], [0.0, 0.35], [0.0, 0.35], [0.35, 0.7]];
const D = 3.9;              // case diameter in scene units (39 mm)
const FOV = 24;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fit = (x, a, b) => clamp((x - a) / (b - a));
const sineInOut = t => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

// ---------- tonight ----------
const now = new Date();
const moonNow = moonState(now);
const nextFull = nextFullMoon(now);
const daysToFull = Math.max(1, Math.round((nextFull - now) / 864e5));
const fmt = (d, o) => d.toLocaleDateString('en-GB', o).toUpperCase();
const pctNow = Math.round(moonNow.fraction * 100);
if (innerWidth >= 900 && !coarse) $('sizeNote').innerHTML = '<strong>39 × 46 × 11.2 mm.</strong> On a phone this scene shows it at about actual size. The lines under it are wrists of 15, 17 and 19 cm, seen from above.';
(function writeMoonText() {
  const name = phaseName(moonNow.phase);
  let l1 = 'Tonight, the', l2 = `moon is ${pctNow}% lit.`;
  if (pctNow >= 98) l2 = 'moon is full.';
  else if (pctNow <= 2) { l1 = 'Tonight there'; l2 = 'is no moon.'; }
  $('moonLine1').textContent = l1; $('moonLine2').textContent = l2;
  $('moonDate').textContent = `${fmt(now, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${name.toUpperCase()}`;
  $('moonPct').textContent = pctNow;
  $('days').textContent = daysToFull;
  $('fullDate').textContent = `Until the full moon on ${fmt(nextFull, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  $('today').textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
})();

// ---------- layout & scroll ----------
let W = innerWidth, H = innerHeight, unit = innerHeight, wide = false;
const track = $('track');
function layout() {
  W = innerWidth; H = innerHeight;
  wide = W >= 900 && W > H * 1.05;
  // one "screen" of scroll is fixed when the page opens, so the phone's address bar does not shift the story
  if (!layout.done || Math.abs(innerHeight - unit) > 160 || layout.w !== W) { unit = innerHeight; layout.w = W; }
  layout.done = true;
  track.style.height = `${Math.round(END * unit + innerHeight)}px`;
}
layout();
let sRaw = scrollY / unit, s = sRaw;
addEventListener('scroll', () => { sRaw = scrollY / unit; }, { passive: true });

// ---------- DOM bits ----------
const ticks = $('ticks');
for (let i = 0; i < 60; i++) ticks.appendChild(document.createElement('i'));
const tickEls = [...ticks.children];
const sections = SCENES.map((_, i) => $('s' + (i + 1)));
const lines = sections.map(sec => [...sec.querySelectorAll('.ln')]);
const blocks = sections.map(sec => [...sec.querySelectorAll('.blk, .sheet, .dims')]);

const sound = makeSound();
const soundBtn = $('sound');
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.st').textContent = on ? ' on' : ' off';
});

const menu = $('menu'), menuBtn = $('menuBtn');
const setMenu = open => {
  if (open) { const cur = SCENES.findIndex(([a, b]) => s < b) ; menu.querySelectorAll('a').forEach((x, i) => x.toggleAttribute('aria-current', i === (cur < 0 ? 6 : cur))); }
  menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('a').focus(); else menuBtn.focus(); };
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
const goTo = (n, smooth = true) => {
  const [a] = SCENES[n - 1];
  const target = n === 1 ? 0 : n === 7 ? END : n === 6 ? 15.15 : a + (n === 3 ? 0.9 : 0.6);
  scrollTo({ top: target * unit, behavior: smooth && !reduced ? 'smooth' : 'auto' });
};
menu.addEventListener('click', e => {
  const a = e.target.closest('a[data-go]'); if (!a) return;
  e.preventDefault(); setMenu(false); goTo(+a.dataset.go);
  history.replaceState(null, '', a.dataset.go === '1' ? location.pathname : '#s' + a.dataset.go);
});
$('top').addEventListener('click', e => { e.preventDefault(); goTo(1); });
// keyboard users: focusing something in a scene that is not on screen scrolls to that scene
document.addEventListener('focusin', e => {
  const sec = e.target.closest?.('.sc'); if (!sec) return;
  const n = +sec.dataset.scene, [a, b] = SCENES[n - 1];
  if (s < a || s > b) goTo(n, false);
});

// promises: one question per row, the answer opens underneath
$('qa').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const open = b.getAttribute('aria-expanded') !== 'true';
  for (const x of $('qa').querySelectorAll('button')) {
    const o = x === b && open; x.setAttribute('aria-expanded', String(o));
    const a = x.nextElementSibling; a.style.height = o ? a.scrollHeight + 'px' : '0px';
  }
});

// sign-up: nothing is sent anywhere
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('email').value.trim(), note = $('note');
  const bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $('email').setAttribute('aria-invalid', String(bad));
  if (bad) { note.textContent = v ? "That doesn't look like an email address." : 'Type an email address first.'; $('email').focus(); return; }
  note.textContent = 'Thank you. This is a concept site, so nothing was sent and your address was not kept.';
  $('email').value = '';
});

// ---------- WebGL ----------
const canvas = $('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-gl'); document.documentElement.classList.remove('js');
}
const loaderEl = $('loader');

if (renderer) {
  const DPR = Math.min(coarse ? 1.5 : 1.75, devicePixelRatio || 1);
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const studio = makeStudio(renderer);
  scene.environment = studio.env;
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 400);
  const backdrop = makeBackdrop();
  const group = new THREE.Group(); scene.add(group);

  // soft contact shadow, seen on the paper stage
  const shTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(20,24,43,0.55)'); r.addColorStop(0.55, 'rgba(20,24,43,0.18)'); r.addColorStop(1, 'rgba(20,24,43,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 9.5), shadowMat);
  shadow.position.set(0.35, -0.45, -1.2); shadow.renderOrder = -1; group.add(shadow);

  let watch = null;
  const draco = new DRACOLoader(); draco.setDecoderPath('assets/draco/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  gltfLoader.load('assets/watch.glb', g => {
    group.add(g.scene);
    watch = setupWatch(g.scene, { glassEnv: studio.soft, polishEnv: studio.tent, anisotropy: 8, glassReflect: 0.14, glassBoost: 0.3, seconds: true });
    renderer.compile(scene, camera);
    loaderEl.style.transform = 'scaleX(1)'; loaderEl.classList.add('is-done');
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
    buildLabels();
  }, p => { if (p.total) loaderEl.style.transform = `scaleX(${(p.loaded / p.total) * 0.95})`; },
  () => { document.documentElement.classList.add('no-gl'); document.documentElement.classList.remove('js'); loaderEl.classList.add('is-done'); });

  // ---------- camera keyframes ----------
  // rot = watch orientation, tgt = point on the watch (scene units) that sits at the screen centre,
  // size = case diameter as a share of the screen width (phone) or height (wide), ox/oy = shift of the image.
  const EX = -Math.PI / 2 + 0.42;   // exploded view: watch axis upright, seen a little from above
  const pxPerMm = () => (coarse && Math.min(screen.width, screen.height) < 600) ? 6.05 : coarse ? 5.2 : 4.2;
  function keys() {
    const actual = wide ? 0.42 : (39 * pxPerMm()) / W;
    const k = (s, rx, ry, rz, tgt, size, oy = 0, ox = 0) => ({ s, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'ZYX')), tgt: new THREE.Vector3(...tgt), size, oy, ox });
    const C = [1.9, 0, -0.2], M = [0, -0.8, 0.1], O = [0, 0, 0], B = [0.25, -0.1, -0.5];
    if (!wide) return [
      k(0, -0.26, 0, 0, O, 0.74, -0.17),
      k(1.7, -0.30, -0.24, 0.05, O, 0.8, -0.12),
      k(2.55, -0.25, -1.1, -0.75, C, 2.0, 0.21),
      k(3.25, -0.35, -0.95, -0.65, C, 1.9, 0.21),
      k(3.85, 0.3, Math.PI - 0.55, 0.2, B, 1.55, 0.2),
      k(4.2, 0.32, Math.PI - 0.45, 0.25, B, 1.45, 0.2),
      k(4.6, EX, 0, 0, O, 0.6, -0.02, -0.08),
      k(5.35, EX, 0.06, 0, [0, 0, 4.8], 0.64, -0.04, -0.13),
      k(7.9, EX, -0.06, 0, [0, 0, -6.2], 0.64, 0.0, -0.13),
      k(8.45, EX * 0.5, 0, 0, O, 0.55, 0.0),
      k(9.05, 0, 0, -0.5, O, actual, -0.02),
      k(10.3, 0, 0, -0.5, O, actual, -0.02),
      k(10.85, 0.14, Math.PI - 0.24, 0, [0, 0, -0.4], 0.66, 0.1),
      k(13.35, 0.08, Math.PI + 0.22, 0, [0, 0, -0.4], 0.68, 0.1),
      k(13.9, -0.5, 0.1, 0, M, 1.45, -0.22),
      k(15.7, -0.45, 0.03, 0, M, 1.4, -0.22),
      k(16.55, -0.14, 0.28, 0, O, 0.40, 0.24),
      k(17, -0.12, 0.3, 0, O, 0.40, 0.24),
    ];
    return [
      k(0, -0.10, 0.12, 0, O, 0.54, -0.02, 0.15),
      k(1.7, -0.32, -0.16, 0.05, O, 0.58, 0, 0.15),
      k(2.55, -0.25, -1.1, -0.75, C, 1.2, 0.12, 0.22),
      k(3.25, -0.35, -0.95, -0.65, C, 1.15, 0.12, 0.22),
      k(3.85, 0.3, Math.PI - 0.55, 0.2, B, 1.0, 0.05, 0.2),
      k(4.2, 0.32, Math.PI - 0.45, 0.25, B, 0.95, 0.05, 0.2),
      k(4.6, EX, 0, 0, O, 0.4, 0, 0.12),
      k(5.35, EX, 0.06, 0, [0, 0, 3.8], 0.36, 0, 0.12),
      k(7.9, EX, -0.06, 0, [0, 0, -5.0], 0.36, 0, 0.12),
      k(8.45, EX * 0.5, 0, 0, O, 0.4, 0, 0.05),
      k(9.05, 0, 0, -0.5, O, actual, -0.02, 0),
      k(10.3, 0, 0, -0.5, O, actual, -0.02, 0),
      k(10.85, 0.14, Math.PI - 0.24, 0, [0, 0, -0.4], 0.46, 0, 0.02),
      k(13.35, 0.08, Math.PI + 0.22, 0, [0, 0, -0.4], 0.48, 0, 0.02),
      k(13.9, -0.5, 0.1, 0, M, 1.3, -0.06, 0.19),
      k(15.7, -0.45, 0.03, 0, M, 1.25, -0.06, 0.19),
      k(16.55, -0.14, 0.28, 0, O, 0.4, 0.02, 0.2),
      k(17, -0.12, 0.3, 0, O, 0.4, 0.02, 0.2),
    ];
  }
  let K = keys();
  const pose = { q: new THREE.Quaternion(), tgt: new THREE.Vector3(), size: 1, oy: 0, ox: 0 };
  function poseAt(x) {
    let i = 0; while (i < K.length - 2 && x > K[i + 1].s) i++;
    const a = K[i], b = K[i + 1];
    const t = sineInOut(fit(x, a.s, b.s));
    pose.q.slerpQuaternions(a.q, b.q, t);
    pose.tgt.lerpVectors(a.tgt, b.tgt, t);
    // size changes are felt in proportion, so interpolate them on a log scale
    pose.size = Math.exp(lerp(Math.log(a.size), Math.log(b.size), t));
    pose.oy = lerp(a.oy, b.oy, t); pose.ox = lerp(a.ox, b.ox, t);
    return pose;
  }

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
      const xEnd = W - (wide ? 64 : 24);
      const width = Math.max(0, xEnd - xEdge);
      const vis = show * fit(y, 70, 110) * (1 - fit(y, H - 70, H - 30)) * (width > 60 ? 1 : 0);
      l.el.style.opacity = vis.toFixed(3);
      l.el.style.transform = `translate(${xEdge.toFixed(1)}px, ${(y - 6).toFixed(1)}px)`;
      l.el.style.width = width.toFixed(1) + 'px';
      l.line.style.flex = '1';
    }
  }

  // ---------- actual-size markings printed on the paper (scene 4), lying under the watch ----------
  const MM = 12, PW = 110, PH = 170;   // texture px per mm, paper size in mm
  const marksCanvas = document.createElement('canvas');
  const drawMarks = () => {
    const c = marksCanvas; c.width = PW * MM; c.height = PH * MM;
    const g = c.getContext('2d'); g.scale(MM, MM); g.translate(PW / 2, PH / 2);
    const ink = 'rgba(20,24,43,0.55)', gold = '#A8853F';
    g.lineWidth = 0.16; g.font = '500 2.1px "Inter Tight", system-ui, sans-serif'; g.fillStyle = 'rgba(20,24,43,0.7)';
    // wrists of 15, 17 and 19 cm seen from above: a wrist is an oval about 1.4 times wider than deep,
    // so its width is about 0.37 x its circumference (55.7 / 63.1 / 70.5 mm)
    g.textAlign = 'center';
    [150, 170, 190].forEach((cm, i) => {
      const w = cm * 0.371 / 2;
      g.strokeStyle = i === 1 ? gold : ink; g.lineWidth = i === 1 ? 0.22 : 0.14; g.setLineDash(i === 1 ? [] : [0.6, 1.0]);
      g.beginPath(); g.moveTo(-w, -80); g.lineTo(-w, 80); g.moveTo(w, -80); g.lineTo(w, 80); g.stroke();
      g.save(); g.translate(w + 1.2, 26 + i * 6); g.rotate(-Math.PI / 2); g.textAlign = 'left'; g.fillText(`${cm / 10} CM`, 0, 0); g.restore();
    });
    g.setLineDash([]);
    // case width
    g.strokeStyle = gold; g.lineWidth = 0.2;
    const y = -31; g.beginPath(); g.moveTo(-19.5, y - 1.5); g.lineTo(-19.5, y + 1.5); g.moveTo(19.5, y - 1.5); g.lineTo(19.5, y + 1.5); g.moveTo(-19.5, y); g.lineTo(19.5, y); g.stroke();
    g.textAlign = 'center'; g.fillText('39 MM', 0, y - 1.6);
    // millimetre tape along the inside of the 17 cm line
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
  const marksMat = new THREE.MeshBasicMaterial({ map: marks, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const marksMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW / 10, PH / 10), marksMat);
  marksMesh.renderOrder = -2; scene.add(marksMesh);

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let last = 0, lastCrownStep = 0, beatAcc = 0, moonClicked = false, woundAt = -1;
  function resize() {
    layout(); K = keys();
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    backdrop.uniforms.uRes.value.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
    backdrop.uniforms.uDpr.value = renderer.getPixelRatio();
  }
  addEventListener('resize', resize);
  resize();

  function frame() {
    const dt = Math.min(0.1, clock.getDelta()), time = clock.elapsedTime;
    // wheels and trackpads move in steps: ease the value a little on desktop. Fingers already have inertia.
    s = coarse || reduced ? sRaw : s + (sRaw - s) * (1 - Math.exp(-dt * 14));
    if (Math.abs(sRaw - s) < 1e-4) s = sRaw;
    const S = clamp(s, 0, END);

    // scenes: text in and out
    SCENES.forEach(([a, b], i) => {
      const first = i === 0, lastS = i === SCENES.length - 1;
      const inn = first ? 1 : fit(S, a + IN[i][0], a + IN[i][1]);
      let out = lastS ? 1 : 1 - fit(S, b - 0.45, b - 0.2);
      const op = inn * out, sec = sections[i];
      const on = op > 0.005;
      if (on !== sec._on) {
        sec.classList.toggle('is-on', on); sec._on = on;
        if (!on) sec.style.opacity = '0';
        if (!on && i === 4) for (const x of sec.querySelectorAll('.qa button[aria-expanded="true"]')) x.click();
      }
      if (!on) return;
      sec.style.opacity = op.toFixed(3);
      lines[i].forEach((ln, j) => {
        const li = first ? 1 : fit(S, a + IN[i][0] + 0.07 * j, a + IN[i][1] + 0.07 * j);
        ln.style.transform = `translate3d(0, ${((1 - li) * 28 - (1 - out) * 18).toFixed(1)}px, 0)`;
      });
      if (i === 2) {   // the parts: the paragraph gives way to the labels
        const f = 1 - fit(S, 5.75, 6.15);
        blocks[2][0].style.opacity = f.toFixed(3);
      }
    });

    // backdrop stage and wipe
    let from = 0, to = 0, wipe = 0;
    for (let i = 0; i < STAGES.length; i++) if (S >= STAGES[i][0] - 0.45) from = STAGES[i][1];
    for (let i = 1; i < STAGES.length; i++) {
      const [b, st] = STAGES[i];
      if (S > b - 0.45 && S < b + 0.15) { from = STAGES[i - 1][1]; to = st; wipe = fit(S, b - 0.45, b + 0.15); }
    }
    const U = backdrop.uniforms;
    U.uFrom.value = from; U.uTo.value = to; U.uWipe.value = wipe;
    U.uTime.value = reduced ? 0 : time;
    U.uDrift.value = S * 40;
    U.uBeam.value = lerp(-0.9, 0.9, fit(S, 10.6, 13.3));
    const paperOn = S > 8.3 && S < 10.4;
    if (paperOn !== document.body._paper) { document.body.classList.toggle('is-paper', paperOn); document.body._paper = paperOn; document.querySelector('meta[name=theme-color]').content = paperOn ? '#EEE8DC' : '#0B1026'; }

    // moon in the sky: rises in scene 6, grows behind the watch in scene 7
    const mIn = fit(S, 13.4, 14.4), big = sineInOut(fit(S, 15.8, 16.7));
    const minD = Math.min(W, H);
    const mx = lerp(wide ? W * 0.86 : W * 0.84, W * (wide ? 0.7 : 0.5), big);
    const myTop = lerp(lerp(H * 0.7, H * 0.8, sineInOut(mIn)), H * (wide ? 0.53 : 0.76), big);
    const mr = lerp(minD * (wide ? 0.07 : 0.075), minD * (wide ? 0.3 : 0.34), big);
    U.uMoon.value.set(mx, myTop, mr, 1);
    U.uPhase.value = lerp(moonNow.phase * Math.PI * 2, Math.PI, big);

    // ticks of the minute track
    const lit = Math.round(60 * S / END);
    if (lit !== frame.lit) { tickEls.forEach((t, i) => t.classList.toggle('on', i < lit)); frame.lit = lit; }

    // power reserve readout in scene 2
    const wound = fit(S, 2.3, 4.2);
    if (sections[1]._on) { $('reserveNum').textContent = Math.round(42 * wound) + ' h'; $('reserveBar').style.transform = `scaleX(${wound.toFixed(3)})`; }

    // ---- watch ----
    poseAt(S);
    group.quaternion.copy(pose.q);
    group.updateMatrixWorld();
    const tgtW = v3.copy(pose.tgt).applyQuaternion(pose.q);
    const ref = wide ? H : W;
    const dist = D * H / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * pose.size * ref);
    camera.position.set(tgtW.x, tgtW.y, tgtW.z + dist);
    camera.lookAt(tgtW);
    camera.near = Math.max(0.05, dist - 12); camera.far = dist + 30;
    camera.setViewOffset(W, H, -pose.ox * W, pose.oy * H, W, H);
    camera.updateProjectionMatrix();

    const paperW = fit(S, 8.6, 9.0) * (1 - fit(S, 10.2, 10.6));
    shadowMat.opacity = 0.9 * paperW;
    marksMat.opacity = fit(S, 8.8, 9.2) * (1 - fit(S, 10.1, 10.4));
    marksMesh.visible = marksMat.opacity > 0.001;
    // the paper lies a little behind the watch: scale it back so the ruler stays true at the watch's distance
    marksMesh.position.set(0, 0, -1.3); marksMesh.scale.setScalar((dist + 1.3) / dist);
    marksMesh.rotation.z = -0.5;
    renderer.toneMappingExposure = 1.0 - 0.2 * fit(S, 10.4, 10.9) * (1 - fit(S, 13.3, 13.8));

    if (watch) {
      // explode (scene 3)
      const ex = fit(S, 4.7, 6.1) * (1 - fit(S, 7.9, 8.4));
      watch.setExplode(ex, 'detail', 0.55);
      if (S > 13.3) { const k = 1 - 0.65 * fit(S, 13.5, 14.0); watch.parts.crystal.traverse(o => { if (o.material) o.material.envMapIntensity = 0.14 * k; }); }
      // winding: one full turn of the crown per screen, a tick every 30 degrees
      const crown = Math.PI * 2 * clamp(S - 2.3, 0, 1.9);
      watch.setCrown(crown, 0);
      const step = Math.floor(crown / (Math.PI / 6));
      if (step !== lastCrownStep) { if (S < 4.6 && Math.abs(step - lastCrownStep) < 4) sound.tick(0.32, 1); lastCrownStep = step; }
      // the movement breathes once it has been wound
      const amp = fit(S, 2.4, 3.3);
      watch.setMovement(time, 90, amp);
      watch.setRotor(S * 2.1);
      if (amp > 0 && S < 13.6) { beatAcc += dt * 8; if (beatAcc >= 1) { beatAcc %= 1; sound.tick(S < 4.6 ? 0.06 : 0.035, 1.25); } }
      // hands: stopped at 10:08, run with the scroll, then glide to your real time for tonight's moon
      const T1 = 10 * 60 + 8 + Math.max(0, S - 2) * 6;
      const d = new Date(), T2 = 9 * 60 + 15;   // 9:15 keeps both hands off the moon window at six
      let diff = ((T2 - T1) % 720 + 720) % 720; if (diff > 360) diff -= 720;
      const T = T1 + diff * sineInOut(fit(S, 13.5, 14.3));
      watch.setTime(Math.floor(T / 60), T % 60);
      if (amp > 0.02 && woundAt < 0) woundAt = time; if (amp <= 0.02) woundAt = -1;
      const run = woundAt < 0 ? 0 : Math.floor((time - woundAt) * 8) / 8;
      const sec1 = (37 + run) % 60, sec2 = d.getSeconds() + Math.floor(d.getMilliseconds() / 125) / 8;
      let ds = ((sec2 - sec1) % 60 + 60) % 60; if (ds > 30) ds -= 60;
      const sec = sec1 + ds * sineInOut(fit(S, 13.5, 14.3));
      watch.parts.hand_second.rotation.z = -sec / 60 * Math.PI * 2;
      // moon disc: from no moon to tonight's moon in scene 6, one click when it lands
      const turn = fit(S, 14.0, 15.0);
      const eased = turn < 1 ? 1 - Math.pow(1 - turn, 3) : 1;
      const age = S < 13.9 ? 0.6 : lerp(0.6, moonNow.age, eased);
      watch.setMoonAge(age);
      if (turn >= 1 && !moonClicked) { moonClicked = true; sound.clack(); sound.moon(); }
      if (S < 13.8 && moonClicked) { moonClicked = false; sound.resetMoon(); }
    }
    sound.level(S < 13.5 ? 0.55 : 0.4);
    sound.frame(dt);

    // days counter in scene 7

    // render
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(backdrop.scene, backdrop.cam);
    renderer.render(scene, camera);
    placeLabels(fit(S, 6.15, 6.45) * (1 - fit(S, 7.75, 8.0)));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// open on a chapter from the address (#s3 etc.)
const hm = /^#s([1-7])$/.exec(location.hash);
if (hm) requestAnimationFrame(() => goTo(+hm[1], false));
