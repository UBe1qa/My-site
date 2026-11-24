// Small Hours: runtime setup for watch.glb (materials that glTF cannot express + part controls).
// Axes after loading: dial normal = +Z, 12 o'clock = +Y, crown = +X. Root is scaled 0.1, children are in mm.
import * as THREE from 'three';

// explode layouts: offsets in mm at t = 1. A number moves along the dial axis (z), [x, y, z] moves freely.
export const EXPLODE = { // 'full': the big groups, case stays in the middle
  crystal: 62, bezel: 50, hand_second: 41, hand_minute: 39, hand_hour: 37, dial: 26, moon_disc: 15, case: 0,
  mv_plate: -14, mv_motion_works: -14, mv_balance_assy: -27, mv_train: -38, mv_bridges: -49, rotor: -62, caseback: -78, caseback_engraving: -78, caseback_glass: -78,
  strap_long: [0, -14, 0], strap_short: [0, 14, 0], crown: [9, 0, 0],
};
export const EXPLODE_STACK = { // 'stack': the key visual (20.png), nine layers. Case, bezel, crown and strap fade out; bridges stay on the plate
  crystal: 58, hand_second: 45, hand_minute: 43.5, hand_hour: 42, dial: 28, moon_disc: 14,
  mv_plate: 0, mv_bridges: 0, mv_balance_assy: -15, mv_train: -27, rotor: -40, caseback: -54, caseback_engraving: -54, caseback_glass: -54,
};
export const EXPLODE_DETAIL = { // 'detail': every part on its own, in the order a watchmaker takes it apart. Case and strap fade out
  crystal: 66, bezel: 57, hand_second: 50, hand_minute: 48.5, hand_hour: 47, dial: 37, moon_disc: 27, mv_motion_works: 18,
  mv_plate: 7, crown: [13, 0, 7],
  mv_mainspring: -1, mv_barrel: -6, mv_wheel_center: -10, mv_wheel_third: -13, mv_wheel_fourth: -16, mv_wheel_escape: -19, mv_pallet: -21.5,
  mv_balance: -28, mv_hairspring: -32,
  mv_bridge_barrel: -40, mv_bridge_train: -40, mv_bridge_escape: -40, mv_balance_cock: -40,
  mv_ratchet: -47, mv_crownwheel: -47, mv_click: -47, mv_screws: -53, mv_cock_screw: -53,
  rotor: -61, caseback: -73, caseback_engraving: -73, caseback_glass: -73,
};
const LAYOUTS = { full: EXPLODE, stack: EXPLODE_STACK, detail: EXPLODE_DETAIL };
const MOVED = [...new Set(Object.values(LAYOUTS).flatMap(Object.keys))];
const FADE = ['case', 'bezel', 'crown', 'strap_long', 'strap_short'];
const FADES = { full: [], stack: FADE, detail: ['case', 'strap_long', 'strap_short'] };
const SHADOWS = ['hand_hour_shadow', 'hand_minute_shadow', 'dial_window_shadow'];
const POLISHED = /^((steel_polished|gold_polished|ruby)_mv|blued_(mv|free))/;
const SYNODIC = 29.530588;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// moon age in days (0 = new moon) for a Date
export function moonAge(date = new Date()) {
  const d = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;   // a known new moon
  return ((d % SYNODIC) + SYNODIC) % SYNODIC;
}

export function setupWatch(root, opt = {}) {
  const parts = {}, home = {}, homeQ = {};
  root.traverse(o => { parts[o.name] = o; home[o.name] = o.position.clone(); homeQ[o.name] = o.quaternion.clone(); });

  // the fading group gets its own material copies, so the case can fade while the case back (same steel) stays
  const fadeMats = {};
  for (const n of FADE) { const clones = new Map(); fadeMats[n] = []; parts[n]?.traverse(o => {
    if (!o.isMesh) return;
    if (!clones.has(o.material)) { const c = o.material.clone(); clones.set(o.material, c); fadeMats[n].push(c); }
    o.material = clones.get(o.material);
  }); }

  const aoMats = new Set(); const glassMats = []; const glassBase = opt.glassReflect ?? 0.5;
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name.startsWith('sapphire')) {
      if (opt.glass !== 'physical') {
        // cheap sapphire: reflections only, added on top of what is behind (no transmission pass)
        const g = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.0, ior: 1.77, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: opt.glassReflect ?? 0.5 });
        if (opt.glassEnv) g.envMap = opt.glassEnv;
        g.name = m.name; o.material = g; glassMats.push(g);
      }
      o.renderOrder = 10;
    } else if (m.name.startsWith('shadow')) {
      m.depthWrite = false; m.transparent = true; m.polygonOffset = true; m.polygonOffsetFactor = -2; o.renderOrder = 2;
    } else {
      if (m.aoMap) aoMats.add(m);
      // mirror-polished parts of the movement (chamfers, sinks, screws, jewels) reflect the light tent
      if (opt.polishEnv && POLISHED.test(m.name)) m.envMap = opt.polishEnv;
      // brushed metal is seen at glancing angles: anisotropic filtering keeps the grain as lines
      for (const t of [m.normalMap, m.map]) if (t && opt.anisotropy) { t.anisotropy = opt.anisotropy; t.needsUpdate = true; }
    }
  });
  // sunray finish (ratchet and crown wheel): radial grain stretches the reflections into rays that turn with the wheel
  if (opt.sunray !== false) {
    const done = new Map();
    root.traverse(o => {
      if (!o.isMesh || !o.material.name.startsWith('sunray')) return;
      if (!done.has(o.material)) {
        const p = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(p, o.material);
        p.defines = { STANDARD: '', PHYSICAL: '' };
        p.anisotropy = opt.sunray ?? 0.85; p.anisotropyRotation = Math.PI / 2;
        if (aoMats.delete(o.material)) aoMats.add(p);
        done.set(o.material, p);
      }
      o.material = done.get(o.material);
    });
  }
  if (parts.hand_second) parts.hand_second.visible = !!opt.seconds;   // the key visual has no seconds hand

  const qz = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
  const spin = (name, angle, axis = Z) => { const o = parts[name]; if (o) o.quaternion.copy(homeQ[name]).multiply(qz.setFromAxisAngle(axis, angle)); };
  const api = { parts, home, spin };

  // t = 0 assembled .. 1 apart.  layout 'full' (default), 'stack' (nine layers) or 'detail' (every part)
  let crownPull = 0, crownOut = 0;
  // stagger 0..1 (site addition): parts leave one after another, top first, instead of all together
  const RANK = {};
  for (const [k, L] of Object.entries(LAYOUTS)) {
    const vals = [...new Set(Object.values(L).map(v => typeof v === 'number' ? v : v[2]))].sort((a, b) => b - a);
    RANK[k] = {}; for (const [n, v] of Object.entries(L)) RANK[k][n] = vals.indexOf(typeof v === 'number' ? v : v[2]) / Math.max(1, vals.length - 1);
  }
  api.setExplode = (t, layout = 'full', stagger = 0) => {
    const L = LAYOUTS[layout] ?? EXPLODE;
    const own = name => { if (!stagger) return t; const r = RANK[layout]?.[name] ?? 0; const a = r * stagger; const x = Math.min(1, Math.max(0, (t - a) / (1 - stagger))); return x * x * (3 - 2 * x); };
    for (const name of MOVED) {
      const o = parts[name]; if (!o) continue;
      const v = L[name] ?? 0, h = home[name], ti = own(name);
      if (typeof v === 'number') o.position.set(h.x, h.y, h.z + v * ti); else o.position.set(h.x + v[0] * ti, h.y + v[1] * ti, h.z + v[2] * ti);
    }
    crownOut = (Array.isArray(L.crown) ? L.crown[0] : 0) * own('crown');
    if (parts.crown) parts.crown.position.x = home.crown.x + crownOut + crownPull;
    const gone = 1 - smooth(0.0, 0.3, t);
    for (const n of FADE) {
      const op = (FADES[layout] ?? []).includes(n) ? gone : 1;
      for (const m of fadeMats[n]) { m.transparent = op < 1; m.opacity = op; }
      if (parts[n]) parts[n].visible = op > 0.01;
    }
    for (const n of SHADOWS) if (parts[n]) parts[n].traverse(o => { if (o.material) o.material.opacity = Math.max(0, 1 - t * 4); });
    // the baked contact shadows belong to the assembled watch: let them go as the parts leave
    const ao = 1 - 0.92 * smooth(0.0, 0.15, t);
    for (const m of aoMats) m.aoMapIntensity = ao;
    for (const g of glassMats) g.envMapIntensity = glassBase + (opt.glassBoost ?? 1.1) * smooth(0.1, 0.6, t);   // loose glass needs to read as an object
  };

  // moon age in days since new moon (0..29.53). 14.77 = full moon in the middle of the window
  api.setMoonAge = age => { parts.moon_disc.rotation.z = Math.PI / 2 - Math.PI * (age / SYNODIC); };
  api.setMoonDate = date => api.setMoonAge(moonAge(date));

  api.setTime = (h, m, s = 0) => {
    parts.hand_hour.rotation.z = -((h % 12) + m / 60 + s / 3600) / 12 * Math.PI * 2;
    parts.hand_minute.rotation.z = -(m + s / 60) / 60 * Math.PI * 2;
    if (parts.hand_second) parts.hand_second.rotation.z = -s / 60 * Math.PI * 2;
  };

  // winding: angle in radians (keep adding as the user drags). Crown turns, crown wheel and ratchet follow.
  api.setCrown = (angle, pull = 0) => {
    spin('crown', angle, X);
    crownPull = pull; if (parts.crown) parts.crown.position.x = home.crown.x + crownOut + pull;       // pull 0..1.2 mm
    spin('mv_crownwheel', angle * 0.6);
    spin('mv_ratchet', -angle * 0.6 * 41 / 52);
  };

  // running movement. time in seconds; rate 1 = real speed (the train barely moves), use ~30-120 for show
  api.setMovement = (time, rate = 1, amplitude = 1) => {
    const f = 4, a = Math.sin(2 * Math.PI * f * time) * (270 * Math.PI / 180) * amplitude;
    spin('mv_balance', a);
    spin('mv_hairspring', a * 0.35);
    if (parts.mv_hairspring) { const s = 1 + 0.04 * Math.sin(2 * Math.PI * f * time) * amplitude; parts.mv_hairspring.scale.set(s, s, 1); }
    spin('mv_pallet', (Math.sin(2 * Math.PI * f * time) > 0 ? 1 : -1) * 8 * Math.PI / 180 * Math.min(1, amplitude * 4));
    const c = -2 * Math.PI * time * rate / 3600;                           // centre wheel: one turn per hour
    spin('mv_wheel_center', c); spin('mv_barrel', c * -10 / 84); spin('mv_wheel_third', c * -8);
    spin('mv_wheel_fourth', c * 60); spin('mv_wheel_escape', c * -548.5714);
  };
  api.setRotor = angle => spin('rotor', angle);
  return api;
}
