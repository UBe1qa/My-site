// Moon phase for a date, computed in the browser (low-precision lunar and solar theory, good to a few hours).
// phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. fraction = lit part of the disc (0..1).
const PI = Math.PI, rad = PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, E = rad * 23.4397;
export const SYNODIC = 29.530588;

const toDays = date => date.valueOf() / DAY - 0.5 + J1970 - J2000;
const ra = (l, b) => Math.atan2(Math.sin(l) * Math.cos(E) - Math.tan(b) * Math.sin(E), Math.cos(l));
const dec = (l, b) => Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l));

function sun(d) {
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + PI;
  return { ra: ra(L, 0), dec: dec(L, 0) };
}
function moon(d) {
  const L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
  const l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F);
  return { ra: ra(l, b), dec: dec(l, b), dist: 385001 - 20905 * Math.cos(M) };
}

export function moonState(date = new Date()) {
  const d = toDays(date), s = sun(d), m = moon(d), sd = 149598000;
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi));
  const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
  const fraction = (1 + Math.cos(inc)) / 2;
  const phase = 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / PI;
  return { fraction, phase, age: phase * SYNODIC };
}

export function phaseName(p) {
  const d = x => Math.abs(((p - x) % 1 + 1.5) % 1 - 0.5);   // distance in phase, wrapping round
  if (d(0) < 0.025) return 'New moon';
  if (d(0.5) < 0.025) return 'Full moon';
  if (d(0.25) < 0.02) return 'First quarter';
  if (d(0.75) < 0.02) return 'Last quarter';
  if (p < 0.25) return 'Waxing crescent';
  if (p < 0.5) return 'Waxing gibbous';
  if (p < 0.75) return 'Waning gibbous';
  return 'Waning crescent';
}

// next moment the phase passes 0.5 (full), searched forward from date
export function nextFullMoon(date = new Date(), skipCurrent = true) {
  let t = date.valueOf();
  // if we are at (or just past) full now, look for the one after
  if (skipCurrent) { const p = moonState(date).phase; if (p > 0.45 && p < 0.6) t += 5 * DAY; }
  let prev = moonState(new Date(t)).phase;
  for (let i = 0; i < 160; i++) {
    const t2 = t + DAY / 4, p = moonState(new Date(t2)).phase;
    if (prev < 0.5 && p >= 0.5) {
      let a = t, b = t2;
      for (let k = 0; k < 30; k++) { const c = (a + b) / 2; if (moonState(new Date(c)).phase < 0.5) a = c; else b = c; }
      return new Date(b);
    }
    t = t2; prev = p;
  }
  return new Date(date.valueOf() + SYNODIC * DAY);
}
