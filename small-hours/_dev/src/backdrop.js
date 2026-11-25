// Full-screen stage behind the watch. One shader: painted stages and photographed sets, the next one opening as a circle out of the watch.
// 0 night sky · 1 blueprint · 2 paper · 3 workbench with a beam of light · 4 night sky with tonight's moon · 5 dawn
import * as THREE from 'three';

const frag = /* glsl */`
precision highp float;
uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform float uDrift;
uniform float uFrom; uniform float uTo; uniform float uWipe;
uniform vec4 uMoon; uniform float uPhase; uniform float uBeam; uniform float uGrid;
uniform vec3 uZoom;   // star field zoom: xy = centre in css px, z = scale (1 = none)
uniform vec4 uHole;   // the dial seen as a hole in the sky: xy centre, z radius (css px), w how much the sky outside it dims
uniform sampler2D tSet0, tSet1, tSet2, tSet3;   // the photographed sets (desk, drafting table, engraver's bench, morning table)
uniform vec4 uWin[4];  // each photo's window in tan space: xy centre, zw half size
uniform vec4 uCam;     // the watch camera now: x tan(fov/2), y aspect, z ox, w oy (its view offset)
uniform vec3 uIris;    // where scene changes open from: xy css px (bottom left origin), z radius scale
uniform sampler2D tType; uniform float uTypeOp;   // giant words drawn into the world, behind the watch
varying vec2 vUv;

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }

// one layer of stars: cell size in css px, density 0..1
float stars(vec2 px, float cell, float dens, float seed){
  vec2 g = px / cell, id = floor(g), f = fract(g) - 0.5;
  float r = h21(id + seed);
  if (r > dens) return 0.0;
  vec2 o = vec2(h21(id + seed + 3.1), h21(id + seed + 7.7)) - 0.5;
  float d = length((f - o * 0.7) * cell);
  float size = mix(0.45, 1.3, pow(h21(id + seed + 1.3), 3.0));
  float tw = 0.65 + 0.35 * sin(uTime * (0.6 + 2.0 * h21(id + 9.0)) + r * 40.0);
  return smoothstep(size, 0.0, d) * tw * mix(0.35, 1.0, pow(h21(id + 4.4), 2.0));
}

vec3 night(vec2 uv, vec2 px, float withMoon){
  float y = uv.y;
  vec3 top = vec3(0.027, 0.039, 0.094), mid = vec3(0.043, 0.063, 0.149);
  vec3 c = mix(mid, top, smoothstep(0.35, 1.0, y));
  // horizon glow: a thin warm band low on the screen, cooler above it
  float hz = 0.2;
  c += vec3(0.79, 0.64, 0.36) * 0.11 * exp(-pow((y - hz) * 9.0, 2.0));
  c += vec3(0.18, 0.24, 0.48) * 0.12 * exp(-pow((y - hz - 0.08) * 4.0, 2.0));
  c *= mix(0.55, 1.0, smoothstep(0.0, hz, y));
  // faint milky haze so the sky is never an empty flat colour
  float haze = fbm(px / 260.0 + vec2(0.0, uDrift / 260.0));
  c += vec3(0.10, 0.12, 0.24) * 0.16 * smoothstep(0.3, 0.9, haze);
  c += vec3(0.16, 0.14, 0.22) * 0.05 * (fbm(px / 40.0 + vec2(0.0, uDrift / 40.0)) - 0.5);   // fine grain of the night
  // aventurine star dust, drifting up as you scroll
  vec2 sp = (px - uZoom.xy) / uZoom.z + uZoom.xy + vec2(0.0, uDrift);
  // a faint milky band across the sky: denser dust and a soft glow, broken up by dark lanes
  vec2 bp = (sp - vec2(0.0, uRes.y / uDpr * 0.55)) / (uRes.y / uDpr);
  float bd = bp.y - bp.x * 0.55 * (uRes.x / uRes.y) + 0.05;
  float lane = fbm(sp / 90.0) * fbm(sp / 33.0 + 4.0);
  float band = exp(-bd * bd * 22.0) * (0.55 + 0.9 * lane);
  c += vec3(0.20, 0.22, 0.38) * 0.22 * band * smoothstep(hz, hz + 0.25, y);
  c += vec3(0.85, 0.78, 0.62) * 0.05 * band * smoothstep(0.55, 0.85, fbm(sp / 18.0));
  float st = stars(sp, 4.0, 0.12 + 0.5 * band, 13.0) * (0.25 + 0.35 * band) + stars(sp, 9.0, 0.16, 1.0) * 0.55 + stars(sp * 0.97, 23.0, 0.26, 5.0) + stars(sp * 1.03, 61.0, 0.35, 9.0) * 1.3;
  st *= smoothstep(hz - 0.02, hz + 0.15, y);
  // outside the dial the sky goes quiet, so the stars inside read as the dial's own
  float outside = uHole.w * smoothstep(uHole.z * 0.99, uHole.z * 1.04, length(px - uHole.xy));
  st *= 1.0 - 0.92 * outside;
  c = mix(c, c * 0.45, outside);
  c += vec3(1.0, 0.95, 0.86) * st * 0.85;
  if (withMoon > 0.0) {
    vec2 m = (px - uMoon.xy) / uMoon.z;
    float r = length(m);
    // glow grows with how much of the moon is lit
    float lit = 0.5 - 0.5 * cos(uPhase);
    c += vec3(0.95, 0.85, 0.62) * withMoon * (0.10 * exp(-max(r - 1.0, 0.0) * 1.6) + 0.06 * exp(-max(r - 1.0, 0.0) * 0.35)) * (0.25 + lit);
    if (r < 1.0) {
      vec3 N = vec3(m.x, -m.y, sqrt(1.0 - r*r));
      vec3 L = normalize(vec3(sin(uPhase), 0.0, -cos(uPhase)));
      float sh = smoothstep(-0.04, 0.10, dot(N, L));
      vec2 q = m * 1.7 + vec2(3.0, 1.4);
      float maria = smoothstep(0.45, 0.72, fbm(q)) * 0.24 + smoothstep(0.5, 0.8, fbm(q * 2.3 + 5.0)) * 0.08;
      float crat = smoothstep(0.7, 0.9, noise(m * 16.0)) * 0.06 + (noise(m * 60.0) - 0.5) * 0.05;
      vec3 alb = vec3(0.95, 0.92, 0.85) * (1.0 - maria - crat) * pow(N.z, 0.22);
      vec3 moonC = alb * sh + vec3(0.05, 0.07, 0.13) * (1.0 - sh) * 0.5;   // earthshine on the dark side
      float edge = smoothstep(1.0, 0.985, r);
      c = mix(c, moonC, edge * withMoon);
    }
  }
  return c;
}

vec3 blueprint(vec2 uv, vec2 px){
  vec3 c = mix(vec3(0.047, 0.071, 0.165), vec3(0.031, 0.047, 0.118), smoothstep(0.2, 1.0, length(uv - 0.5) * 1.3));
  vec2 g = px / 16.0; vec2 gm = abs(fract(g - 0.5) - 0.5) * 16.0;
  float minor = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.3, min(gm.x, gm.y));
  vec2 G = px / 80.0; vec2 GM = abs(fract(G - 0.5) - 0.5) * 80.0;
  float major = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.35, min(GM.x, GM.y));
  vec3 gold = vec3(0.79, 0.64, 0.36);
  c += gold * (minor * 0.045 + major * 0.11) * uGrid;
  // centre line and a circle for the case, like a drawing sheet
  c += gold * 0.03 * fbm(px / 120.0);
  return c;
}

vec3 paper(vec2 uv, vec2 px){
  vec3 c = vec3(0.933, 0.910, 0.863);
  float fib = fbm(px / vec2(3.0, 40.0)) - 0.5;
  c += fib * 0.025;
  c *= 1.0 - 0.10 * smoothstep(0.35, 0.95, length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.2)));
  // a few gold-foil stars on the paper
  float st = stars(px, 70.0, 0.22, 21.0);
  c = mix(c, vec3(0.78, 0.62, 0.34), clamp(st * 0.9, 0.0, 1.0));
  return c;
}

vec3 bench(vec2 uv, vec2 px){
  vec3 c = mix(vec3(0.018, 0.024, 0.047), vec3(0.035, 0.043, 0.082), uv.y);
  // a diagonal blade of warm light that slides across while you scroll
  vec2 d = normalize(vec2(0.42, 1.0));
  float k = dot(uv - 0.5, vec2(d.y, -d.x)) * (uRes.x / uRes.y);
  float beam = exp(-pow((k - uBeam) * 5.0, 2.0));
  c += vec3(0.85, 0.70, 0.45) * beam * 0.09 * (0.6 + 0.4 * fbm(px / 90.0 + uTime * 0.05));
  c += vec3(0.79, 0.64, 0.36) * 0.03 * fbm(px / 34.0);
  c *= 1.0 - 0.35 * smoothstep(0.3, 1.0, length(uv - 0.5) * 1.4);
  return c;
}


// ---- worlds for the middle of the story (each chapter lives somewhere else) ----
float vig(vec2 uv, float k){ return 1.0 - k * smoothstep(0.25, 1.05, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.2)); }

// oxblood leather pad under the crown: pebble grain and a soft top light
vec3 leather(vec2 uv, vec2 px){
  vec3 c = mix(vec3(0.075, 0.012, 0.020), vec3(0.20, 0.035, 0.050), smoothstep(-0.1, 1.1, uv.y));
  float peb = fbm(px / 3.2) * 0.6 + fbm(px / 9.0) * 0.4;
  c *= 0.82 + 0.36 * peb;
  c += vec3(0.55, 0.18, 0.14) * 0.10 * exp(-pow(length((uv - vec2(0.35, 0.85)) * vec2(uRes.x / uRes.y, 1.0)) * 1.6, 2.0));
  return c * vig(uv, 0.55);
}

// walnut desk under a work lamp: long grain and a warm pool of light
vec3 lamp(vec2 uv, vec2 px){
  vec2 g = px / vec2(520.0, 11.0);
  float grain = fbm(g + vec2(fbm(px / 160.0) * 3.0, 0.0));
  vec3 c = mix(vec3(0.060, 0.030, 0.014), vec3(0.17, 0.090, 0.040), grain);
  c *= 0.85 + 0.3 * smoothstep(0.4, 0.6, fbm(px / vec2(900.0, 26.0) + 3.0));
  float d = length((uv - vec2(0.72, 0.78)) * vec2(uRes.x / uRes.y, 1.0));
  c += vec3(1.0, 0.62, 0.28) * 0.42 * exp(-d * d * 2.6) * (0.75 + 0.25 * grain);
  c += vec3(0.85, 0.70, 0.45) * exp(-pow((dot(uv - 0.5, normalize(vec2(0.9, -0.4))) * (uRes.x / uRes.y) - uBeam) * 6.0, 2.0)) * 0.05;
  return c * vig(uv, 0.6);
}

// cyanotype: Prussian blue paper, white grid, fibres
vec3 cyan(vec2 uv, vec2 px){
  vec3 c = mix(vec3(0.050, 0.20, 0.46), vec3(0.085, 0.29, 0.60), smoothstep(0.0, 1.0, uv.y));
  c *= 0.9 + 0.2 * fbm(px / 70.0);
  c += (fbm(px / vec2(2.0, 30.0)) - 0.5) * 0.05;
  vec2 gm = abs(fract(px / 24.0 - 0.5) - 0.5) * 24.0, GM = abs(fract(px / 120.0 - 0.5) - 0.5) * 120.0;
  float minor = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.3, min(gm.x, gm.y));
  float major = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.4, min(GM.x, GM.y));
  c = mix(c, vec3(0.86, 0.93, 1.0), (minor * 0.08 + major * 0.2) * uGrid);
  return c * vig(uv, 0.35);
}

// drafting film: warm white, a fine millimetre grid and crop marks in the corners
vec3 draft(vec2 uv, vec2 px){
  vec3 c = vec3(0.925, 0.905, 0.860);
  c *= 1.0 - 0.06 * smoothstep(0.3, 1.0, length(uv - 0.5) * 1.4);
  c += (fbm(px / 5.0) - 0.5) * 0.02;
  vec2 gm = abs(fract(px / 12.0 - 0.5) - 0.5) * 12.0, GM = abs(fract(px / 60.0 - 0.5) - 0.5) * 60.0;
  float minor = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.25, min(gm.x, gm.y));
  float major = 1.0 - smoothstep(0.0, 1.0 / uDpr + 0.35, min(GM.x, GM.y));
  c = mix(c, vec3(0.42, 0.50, 0.58), minor * 0.07 + major * 0.16);
  return c;
}

// green felt of a watchmaker's bench pad
vec3 felt(vec2 uv, vec2 px){
  vec3 c = mix(vec3(0.020, 0.075, 0.055), vec3(0.045, 0.15, 0.105), smoothstep(-0.1, 1.0, uv.y));
  c *= 0.86 + 0.28 * fbm(px / 2.2);
  c += vec3(0.6, 0.9, 0.7) * 0.05 * exp(-pow(length((uv - vec2(0.3, 0.9)) * vec2(uRes.x / uRes.y, 1.0)) * 1.4, 2.0));
  return c * vig(uv, 0.6);
}

vec3 voidw(vec2 uv, vec2 px){ return vec3(0.010, 0.011, 0.016) * vig(uv, 0.5) + (fbm(px / 300.0) - 0.5) * 0.01; }

// first light: the night sky with the horizon warming and the stars going out
vec3 dawn(vec2 uv, vec2 px){
  float y = uv.y;
  vec3 c = mix(vec3(0.93, 0.66, 0.50), vec3(0.30, 0.36, 0.58), smoothstep(0.05, 0.75, y));
  c = mix(c, vec3(0.16, 0.20, 0.38), smoothstep(0.7, 1.0, y));
  c += vec3(1.0, 0.82, 0.58) * 0.35 * exp(-pow((y - 0.12) * 5.0, 2.0));
  c += (fbm(px / 300.0 + vec2(uTime * 0.01, 0.0)) - 0.5) * 0.04;
  float st = stars(px + vec2(0.0, uDrift), 23.0, 0.2, 5.0) * smoothstep(0.55, 0.95, y);
  c += vec3(1.0, 0.95, 0.86) * st * 0.35;
  return c;
}

// a photographed set: every screen pixel is a ray of the watch camera; the photo was shot by the same fixed camera,
// so the ray picks the same spot in the photo whatever the zoom or the view offset (the camera never moves inside a set)
vec3 photo(int i, vec2 uv){
  vec2 n = vec2(uv.x - uCam.z, uv.y - uCam.w) * 2.0 - 1.0;
  vec2 t = n * vec2(uCam.x * uCam.y, uCam.x);
  vec4 w = i == 0 ? uWin[0] : i == 1 ? uWin[1] : i == 2 ? uWin[2] : uWin[3];
  vec2 p = (t - w.xy) / w.zw * 0.5 + 0.5;
  vec2 q = clamp(p, 0.001, 0.999);
  vec3 c = i == 0 ? texture2D(tSet0, q).rgb : i == 1 ? texture2D(tSet1, q).rgb : i == 2 ? texture2D(tSet2, q).rgb : texture2D(tSet3, q).rgb;
  float out_ = length(max(abs(p - 0.5) - 0.5, 0.0)) * 6.0;
  // the night sets keep their tops and bottoms dark enough for the words on them
  if (i < 3) c *= mix(1.0, 0.42, smoothstep(0.6, 1.0, uv.y)) * mix(1.0, 0.7, smoothstep(0.3, 0.0, uv.y));
  return c * exp(-out_);
}

vec3 stage(float s, vec2 uv, vec2 px){
  if (s > 19.5) return photo(int(s - 19.5), uv);
  // 0 night · 1 blueprint · 2 paper · 3 bench · 4 night + moon · 5 dawn · 6 lamp · 7 void · 8 cyanotype · 9 drafting film · 10 leather · 11 felt
  if (s < 0.5) return night(uv, px, 0.0);
  if (s < 1.5) return blueprint(uv, px);
  if (s < 2.5) return paper(uv, px);
  if (s < 3.5) return bench(uv, px);
  if (s < 4.5) return night(uv, px, 1.0);
  if (s < 5.5) return dawn(uv, px);
  if (s < 6.5) return lamp(uv, px);
  if (s < 7.5) return voidw(uv, px);
  if (s < 8.5) return cyan(uv, px);
  if (s < 9.5) return draft(uv, px);
  if (s < 10.5) return leather(uv, px);
  return felt(uv, px);
}

void main(){
  vec2 px = vUv * uRes / uDpr;                 // css px, origin bottom left
  vec3 a = stage(uFrom, vUv, px);
  vec3 c = a;
  if (uWipe > 0.0) {
    vec3 b = stage(uTo, vUv, px);
    // the next world opens as a circle out of the watch (the dial, the loupe, the moon: one shape all the way)
    vec2 sz = uRes / uDpr;
    float far = max(max(length(uIris.xy), length(uIris.xy - sz)), max(length(uIris.xy - vec2(sz.x, 0.0)), length(uIris.xy - vec2(0.0, sz.y))));
    float r = uWipe * (far + 80.0) * uIris.z, d = length(px - uIris.xy);
    float m = smoothstep(r + 40.0, r - 40.0, d);
    c = mix(a, b, m);
  }
  if (uTypeOp > 0.0) { vec4 ty = texture2D(tType, vUv); c = mix(c, ty.rgb, ty.a * uTypeOp); }
  // fine grain so gradients do not band on phones
  c += (h21(px * 1.37 + fract(uTime)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(c, 1.0);
}`;

export function makeBackdrop() {
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uTime: { value: 0 }, uDrift: { value: 0 },
    uFrom: { value: 0 }, uTo: { value: 0 }, uWipe: { value: 0 },
    uMoon: { value: new THREE.Vector4(0, 0, 60, 0) }, uPhase: { value: Math.PI }, uBeam: { value: 0 }, uGrid: { value: 1 }, uZoom: { value: new THREE.Vector3(0, 0, 1) }, uHole: { value: new THREE.Vector4(0, 0, 1, 0) },
    tSet0: { value: null }, tSet1: { value: null }, tSet2: { value: null }, tSet3: { value: null },
    uWin: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 1)) }, uCam: { value: new THREE.Vector4(0.2, 0.5, 0, 0) },
    uIris: { value: new THREE.Vector3(0, 0, 1) }, tType: { value: null }, uTypeOp: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: frag,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = new THREE.Camera();
  return { scene, cam, uniforms };
}
