/* 루멘랩 홈 첫 화면: 안개 낀 호수 위, 손으로 분 유리 등 하나 (2026-11-05).
   짜임: 크고 조용한 사진 한 장이 천천히 살아 있고, 글은 안개 두 겹 사이에 써지며,
   첫 스크롤에 화면을 잠그고 장면이 세로 띠로 찢어지며 그 구멍으로 아래 글이 올라온다. 이름은 머리말의 작은 글자뿐.
   그림: 사진 한 장(img/hero/lake.webp, GPT Image 2.6) 위에 WebGL2 두 단계.
     ① 안개(작게 그림, 화면의 0.4배): 사진과 같은 카메라로 물 위에 깔린 안개를 광선으로 훑는다(3D 잡음 한 장, 36걸음).
        등불이 안개를 비추고(가까울수록·등 쪽을 볼수록 밝게), 등보다 먼 안개 = 뒤 겹, 가까운 안개 + 화면을 지나는 옅은 안개 = 앞 겹.
     ② 합치기: 사진(물 아래는 물결에 흔들리는 반사) → 뒤 안개(등불 빛을 받아 따뜻해짐) → 글(왼쪽부터 흐리게 번지며 써짐) → 앞 안개 → 등불 빛무리·깜빡임
        → 물 위 금빛 반짝임 → 낟알. 넓은 화면은 사진 양옆을 흐린 가장자리 색으로 이어 붙인다.
   들어올 때: 어두운 호수에 등불이 먼저 붙고 그 빛이 안개를 채운 뒤 글이 써진다(2.6초). 머무는 동안 안개가 흐르고 등불이 깜빡인다. 누르면 물에 동그란 물결.
   첫 스크롤(휠·손가락·키·'내려서 만든 것 보기'): 1.1초 찢기. 띠는 가는 것 3~9px·굵은 것 18~38px, 진행×36 박자마다 새 배치,
     굵은 띠엔 이 파일의 셰이더 코드 줄. 끝 40%에 조각마다 구멍이 뚫려(다시 안 닫힘) 뒤의 '만든 것'이 보이고 올라온다.
     '만든 것' 맨 위에서 위로 올리면 거꾸로(구멍이 닫히며 장면이 돌아옴).
   동작 줄이기·WebGL2 없음: 사진 한 장과 글, 잠금 없음. 30fps 상한, 느리면 해상도를 낮추고, 화면 밖·탭 숨김이면 쉰다. */
(function () {
  var d = document.documentElement, hero = document.querySelector('[data-lake]');
  if (!hero) return;
  window.__lakeOn = true;
  var stage = hero.querySelector('.lake__stage'), cv = hero.querySelector('.lake__gl'), h1 = hero.querySelector('.lake__h1'),
    works = document.getElementById('works'), bar = document.querySelector('.top'), metas = document.querySelectorAll('meta[name="theme-color"]');
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var day = [].map.call(metas, function (m) { return m.content; });
  var NIGHT = '#16339a';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ss = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function theme(on) { [].forEach.call(metas, function (m, i) { m.content = on ? NIGHT : day[i]; }); }
  function hdr(mode) {   // 머리말: 첫 화면 위(투명·흰 글) / 넘어가는 중(숨김) / 글 위(원래)
    d.classList.toggle('top-lake', mode === 'hero');
    d.classList.toggle('top-mid', mode === 'mid');
    theme(mode === 'hero');
  }

  var gl = !calm && cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  var deep = !!location.hash && location.hash !== '#main';   // #works 등으로 들어오면 첫 화면을 건너뛴 상태
  if (!gl) {   // 사진 한 장 + 글. 머리말만 맡는다
    hero.classList.add('gl-off'); d.classList.remove('lake-js');
    var still = function () { hdr(scrollY < hero.offsetHeight - 80 ? 'hero' : 'page'); };
    addEventListener('scroll', still, { passive: true }); still();
    return;
  }

  /* ---------- 셰이더 ---------- */
  var VS = '#version 300 es\nlayout(location=0) in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  var NOISE = [
    'float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
    '  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }',
    'float fbm3(vec2 p){ float s = 0., a = .5; mat2 r = mat2(.8,.6,-.6,.8); for (int i = 0; i < 3; i++){ s += a*vn(p); p = r*p*2.03 + 3.7; a *= .5; } return s; }'
  ].join('\n');
  // ① 안개(작게): 사진과 같은 카메라로 물 위 안개를 광선으로 훑는다(3D 잡음 텍스처 한 장).
  //   카메라 높이 uHc, 초점 uF(화면 높이 단위), 수평선 uHz. 물에 닿거나 안개 층(높이 1.6) 위로 나가면 멈추고, 등 뒤는 등에 가려 안 본다.
  //   빛 = 그 자리 사진 색(흐리게) + 등불(거리에 따라 줄고, 등 쪽을 볼수록 밝게 퍼짐). 등보다 가까운 안개는 앞 겹(oF), 먼 안개는 뒤 겹(oB).
  //   앞 겹엔 화면을 천천히 지나는 옅은 안개도 더한다(글 위로 지나감).
  var FS_FOG = '#version 300 es\nprecision highp float;\nprecision highp sampler3D;\n' + [
    'uniform sampler3D uN; uniform sampler2D uImg;',
    'uniform vec2 uRes; uniform vec4 uMapH; uniform vec2 uLs; uniform vec3 uLw, uWarm;',
    'uniform float uT, uHz, uF, uHc, uLr, uPow, uLook;',
    'layout(location=0) out vec4 oB; layout(location=1) out vec4 oF;'
  ].join('\n') + '\n' + NOISE + '\n' + [
    'float N3(vec3 p){ return texture(uN, p*.11).r*.56 + texture(uN, p*.23 + .37).r*.29 + texture(uN, p*.5 + .71).r*.15; }',
    'float dens(vec3 p){',
    '  vec3 w = vec3(uT*.07, 0., -uT*.11);',
    '  float n = N3(p*vec3(1., 2.4, 1.) + w);',
    '  float banks = smoothstep(.44, .76, n) * exp(-p.y*2.6);',
    '  return banks*1.5 + .035*exp(-p.y*1.4);',
    '}',
    'void main(){',
    '  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes.y;',
    '  vec3 rd = normalize(vec3((q.x - uLs.x)/uF + uLook*.012, (uHz - q.y)/uF, 1.));',
    '  vec3 ro = vec3(0., uHc, 0.);',
    '  float tW = rd.y < -1e-4 ? uHc/(-rd.y) : 1e3, tTop = rd.y > 1e-4 ? (1.6 - uHc)/rd.y : 1e3;',
    '  float tMax = min(min(tW, tTop), 70.);',
    '  vec2 lq = (q - uLs) * vec2(1., .78);',
    '  if (length(lq) < uLr) tMax = min(tMax, uLw.z);',
    '  vec2 uv = (q - uMapH.xy) / uMapH.zw;',
    '  vec3 amb = textureLod(uImg, clamp(uv, vec2(.02), vec2(.98)), 6.).rgb;',
    '  vec3 base = amb*1.3 + vec3(.03, .035, .06);',
    '  float TB = 1., TF = 1.; vec3 aB = vec3(0.), aF = vec3(0.);',
    '  float j = fract(52.98*fract(dot(gl_FragCoord.xy, vec2(.0671, .00584)))), t0 = .3, prev = t0, lf = exp(-dot(lq, lq)/(uLr*uLr*2.2));',
    '  for (int i = 1; i <= 36; i++){',
    '    float tt = t0*pow(tMax/t0, (float(i) - j)/36.);',
    '    float dt = tt - prev; prev = tt;',
    '    vec3 p = ro + rd*tt;',
    '    float s = dens(p);',
    '    float a = 1. - exp(-s*dt*.7);',
    '    vec3 dv = p - uLw; float d2 = dot(dv, dv);',
    '    float c = dot(dv*inversesqrt(d2 + 1e-4), -rd), g = .6;',
    '    float hg = (1. - g*g) / pow(1. + g*g - 2.*g*c, 1.5) * .25;',
    '    vec3 col = base + uWarm * uPow * (1.2/(1. + d2*5.)) * (.25 + hg*1.5);',
    '    if (tt < uLw.z*.9) { a *= 1. - .7*lf; aF += TF*a*col; TF *= 1. - a; } else { aB += TB*a*col; TB *= 1. - a; }',
    '  }',
    '  float v = fbm3(vec2(q.x*1.1 + uT*.014 + uLook*.03, q.y*1.5 - uT*.004) + 21.);',
    '  float va = smoothstep(.52, .88, v) * .2;',
    '  vec3 vc = base*1.05 + uWarm*uPow*.18*exp(-dot(q - uLs, q - uLs)/.03);',
    '  aF = aF*(1. - va) + vc*va; TF *= 1. - va;',
    '  oB = vec4(aB, 1. - TB); oF = vec4(aF, 1. - TF);',
    '}'
  ].join('\n');
  // ② 합치기 + 찢기
  var FS = '#version 300 es\nprecision highp float;\n' + [
    'uniform sampler2D uImg, uB, uFg, uTxt, uCode;',
    'uniform vec2 uRes, uFt; uniform vec4 uMap;     // 화면, 안개 한 칸 크기, 사진 자리(왼쪽 위 x,y, 폭, 높이: 기기 화소)',
    'uniform vec2 uL; uniform float uLW, uWL, uHz;  // 등 가운데·폭, 물 시작선, 수평선(사진 좌표)',
    'uniform float uT, uIn, uWr, uX, uDpr, uFl, uHc, uF, uZL;',
    'uniform vec3 uWarm;',
    'uniform vec4 uSeg0, uSeg1; uniform vec2 uOrd;  // 글 조각 둘(기기 화소)과 쓰는 순서 경계',
    'uniform vec4 uRip[3];                           // 물결: 화면 높이 단위 x,y, 시작 시각, 세기',
    'out vec4 o;'
  ].join('\n') + '\n' + NOISE + '\n' + [
    'float ss(float a, float b, float v){ return smoothstep(a, b, v); }',
    'vec3 photo(vec2 uv){',
    '  float e = min(uv.x, 1. - uv.x);',
    '  vec3 edge = textureLod(uImg, vec2(clamp(uv.x, .02, .98), clamp(uv.y, .001, .999)), 5.5).rgb;',
    '  vec3 c = texture(uImg, clamp(uv, .001, .999)).rgb;',
    '  c = mix(edge, c, ss(-.01, .1, e));',
    '  return c * (1. - .28*ss(0., .7, -e));',
    '}',
    'vec4 scene(vec2 p){',
    '  vec2 uv = (p - uMap.xy) / uMap.zw, q = p / uRes.y;',
    '  vec2 Ls = (uMap.xy + uL*uMap.zw) / uRes.y; float lw = uLW*uMap.z/uRes.y, hz = (uMap.y + uHz*uMap.w)/uRes.y;',
    '  float t = uT;',
    '  // 물: 사진 속 반사가 가로 물결에 흔들림(먼 물결은 잘고 약하게)',
    '  float dyw = q.y - hz, wet = ss(uWL - .003, uWL + .015, uv.y);',
    '  float zw = uHc*uF/max(dyw, .002), xw = (q.x - Ls.x)/uF*zw;',
    '  float ph = zw*6.5 - t*1.25 + sin(xw*1.2 + t*.35)*1.1;',
    '  float amp = clamp(dyw*14., .2, 1.);',
    '  float ring = 0.;',
    '  for (int i = 0; i < 3; i++){ vec4 R = uRip[i]; float age = t - R.z; if (R.w <= 0. || age < 0. || age > 5.) continue;',
    '    float zc = uHc*uF/max(R.y - hz, .002), xc = (R.x - Ls.x)/uF*zc;',
    '    float dd = length(vec2(xw - xc, zw - zc)), rr = age*.8;',
    '    ring += exp(-pow((dd - rr)/(.1 + age*.05), 2.)) * exp(-age*.8) * sin((dd - rr)*26.) * R.w;',
    '  }',
    '  ring *= step(0., dyw);',
    '  vec2 dpx = vec2((sin(ph)*.0042 + sin(ph*2.6 + 1.1)*.0016)*amp*wet + ring*.008, ring*.002);',
    '  vec3 c = photo(uv + dpx);',
    '  vec2 dl = q - Ls; float r2 = dot(dl, dl);',
    '  float intro = ss(.05, 1.9, uIn);',
    '  c *= 1. + (uFl - .95)*1.4*exp(-r2/.0035);   // 등불 깜빡임',
    '  vec2 fu = vec2(p.x/uRes.x, 1. - p.y/uRes.y);',
    '  vec2 e1 = uFt*vec2(.75, .75), e2 = uFt*vec2(.75, -.75);   // 안개는 네 점을 섞어 계단·낟알을 지운다',
    '  vec4 B = (texture(uB, fu + e1) + texture(uB, fu - e1) + texture(uB, fu + e2) + texture(uB, fu - e2))*.25;',
    '  vec4 F = (texture(uFg, fu + e1) + texture(uFg, fu - e1) + texture(uFg, fu + e2) + texture(uFg, fu - e2))*.25;',
    '  c = c*(1. - B.a) + B.rgb;',
    '  // 글: 두 겹 사이에 써진다. 왼쪽부터, 번지는 끝은 흐리게',
    '  float ord = -1.;',
    '  if (p.y > uSeg0.y && p.y < uSeg0.w && p.x > uSeg0.x - 40.*uDpr && p.x < uSeg0.z + 40.*uDpr) ord = mix(0., uOrd.x, (p.x - uSeg0.x)/max(uSeg0.z - uSeg0.x, 1.));',
    '  if (p.y > uSeg1.y && p.y < uSeg1.w && p.x > uSeg1.x - 40.*uDpr && p.x < uSeg1.z + 40.*uDpr) ord = mix(uOrd.x, 1., (p.x - uSeg1.x)/max(uSeg1.z - uSeg1.x, 1.));',
    '  if (ord > -.5) {',
    '    float soft = .14, e = uWr*(1. + soft);',
    '    float a = 1. - ss(e - soft, e, ord);',
    '    float ta = textureLod(uTxt, vec2(p.x/uRes.x, p.y/uRes.y), (1. - a)*3.4).a * a;',
    '    c = mix(c, vec3(1., .975, .93), ta*.96);',
    '  }',
    '  c = c*(1. - F.a) + F.rgb;',
    '  // 물 위 금빛: 등과 나 사이 물에 반짝이는 점',
    '  if (dyw > 0. && zw < uZL*.97) {',
    '    vec2 g = vec2(xw*7., zw*2.4), gi = floor(g), gf = fract(g) - .5;',
    '    float r = h21(gi); vec2 off = vec2(h21(gi + 3.1), h21(gi + 7.7)) - .5;',
    '    vec2 dd = (gf - off*.55)*vec2(1., 2.6);',
    '    float dot0 = exp(-dot(dd, dd)*90.);',
    '    float tw = pow(.5 + .5*sin(t*(1.4 + r*2.2) + r*40.), 12.) * step(.45, r);',
    '    float path = exp(-pow(xw/(.12 + (uZL - zw)*.035), 2.)) * ss(.0, .6, uZL - zw);',
    '    c += uWarm * (dot0*tw*1.4 + .02) * path * uFl * intro;',
    '    c += uWarm * max(ring, 0.) * .2 * path;',
    '  }',
    '  c += uWarm * exp(-r2/.0011) * .09 * uFl * intro;',
    '  // 들어올 때: 어두운 호수에 등불이 먼저 붙고, 그 빛이 안개로 번진다',
    '  float lamp = exp(-r2/.006) * ss(.05, .5, uIn);',
    '  c *= max(mix(.05, 1., intro), lamp);',
    '  return vec4(c, 1.);',
    '}',
    'void main(){',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  float X = uX;',
    '  if (X <= 0.) { vec4 s = scene(p); s.rgb += (h21(p + fract(uT)*91.) - .5)*.024; o = s; return; }',
    '  // 찢기: 굵은 띠(18~38px)와 가는 띠(3~9px). 진행×36 박자마다 새 배치',
    '  float beat = floor(X*36.), D = uDpr;',
    '  float cell = 44.*D, ci = floor(p.x/cell), lx = p.x - ci*cell;',
    '  float r0 = h21(vec2(ci, beat)), tw = mix(18., 38., r0)*D, ts = h21(vec2(ci, beat + 9.))*(cell - tw);',
    '  float thick = step(ts, lx) * step(lx, ts + tw);',
    '  float tn = mix(3., 9., h21(vec2(ci, beat + 3.)))*D;',
    '  float lo = lx - (lx > ts ? tw : 0.);',
    '  float bid = thick > .5 ? ci*7. + 1. : ci*7. + 2. + floor(lo/tn);',
    '  float b0 = thick > .5 ? ci*cell + ts : p.x - mod(lo, tn);',
    '  float I = ss(0., .42, X);',
    '  float r1 = h21(vec2(bid, beat + 1.)), r2 = h21(vec2(bid, beat + 2.)), r3 = h21(vec2(bid, beat + 5.));',
    '  bool on = r1 < I*(thick > .5 ? .85 : .6);',
    '  vec2 sp = p;',
    '  if (on) {',
    '    sp.x += (r2 - .5) * (thick > .5 ? 220. : 70.) * D * I;',
    '    if (r3 > .72) sp.x = b0 + (r2 - .5)*90.*D;',
    '  }',
    '  vec4 s = scene(sp);',
    '  if (on && thick > .5 && r3 < .5) {',
    '    vec2 cu = vec2((p.x - b0 + r2*700.*D)/(512.*D), (p.y + beat*17.*D)/(512.*D));',
    '    float ca = texture(uCode, fract(cu)).a;',
    '    s.rgb = mix(s.rgb*.32 + vec3(.01, .02, .06), vec3(.78, .86, 1.), ca*.9);',
    '  }',
    '  s.rgb += (h21(p + fract(uT)*91.) - .5)*.024;',
    '  float hc = floor(p.x/(10.*D)), hr = floor(p.y/((40. + 90.*h21(vec2(hc, 3.)))*D));',
    '  if (h21(vec2(hc, hr) + .37) < ss(.58, 1., X)*1.04) { o = vec4(0.); return; }',
    '  o = s;',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function prog(fs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }
  var P1, P2;
  try { P1 = prog(FS_FOG); P2 = prog(FS); } catch (e) { console.warn('lake', e); gl = null; }
  if (!gl) { hero.classList.add('gl-off'); d.classList.remove('lake-js'); addEventListener('scroll', function () { hdr(scrollY < hero.offsetHeight - 80 ? 'hero' : 'page'); }, { passive: true }); hdr(deep ? 'page' : 'hero'); return; }

  var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  function tex(mip) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function put(t, src, mip) {
    gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  }
  var tImg = tex(true), tTxt = tex(true), tCode = tex(false), tB = tex(false), tF = tex(false), fb = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, tCode); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  // 3D 잡음(64³, 반복): 무작위 값을 세 번 흐려 부드러운 안개 덩어리
  var tN = gl.createTexture();
  (function () {
    var S = 64, n = S * S * S, A = new Float32Array(n), B = new Float32Array(n), i, x, y, z, seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (i = 0; i < n; i++) A[i] = rnd();
    var id = function (x, y, z) { return ((z & 63) * S + (y & 63)) * S + (x & 63); };
    for (var pass = 0; pass < 2; pass++) for (var ax = 0; ax < 3; ax++) {
      for (z = 0; z < S; z++) for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
        var a0 = ax === 0 ? id(x - 1, y, z) : ax === 1 ? id(x, y - 1, z) : id(x, y, z - 1), a2 = ax === 0 ? id(x + 1, y, z) : ax === 1 ? id(x, y + 1, z) : id(x, y, z + 1);
        B[id(x, y, z)] = (A[a0] + A[id(x, y, z)] * 2 + A[a2]) / 4;
      }
      var tmp = A; A = B; B = tmp;
    }
    var lo = 1, hi = 0; for (i = 0; i < n; i++) { if (A[i] < lo) lo = A[i]; if (A[i] > hi) hi = A[i]; }
    var U = new Uint8Array(n); for (i = 0; i < n; i++) U[i] = Math.round((A[i] - lo) / (hi - lo) * 255);
    gl.bindTexture(gl.TEXTURE_3D, tN); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, S, S, S, 0, gl.RED, gl.UNSIGNED_BYTE, U);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R].forEach(function (w) { gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT); });
  })();
  var WARM = [1, .64, .26], CAM = { f: 1.25, hc: .3 };

  // 사진 좌표(이 사진에서 잰 값): 등 가운데, 유리 폭, 물 시작선, 수평선
  var IMG = { ar: 1440 / 2560, lx: .505, ly: .632, lw: .134, wl: .669, hz: .612 };
  var img = new Image(), imgOk = false;
  img.decoding = 'async';
  img.onload = function () { put(tImg, img, true); imgOk = true; kick(); };
  img.src = hero.querySelector('.lake__photo img').currentSrc || hero.querySelector('.lake__photo img').src;

  // 코드 띠에 찍을 글: 이 첫 화면의 셰이더 코드 그대로
  (function () {
    var c = document.createElement('canvas'), D = Math.min(devicePixelRatio || 1, 2), S = 512 * D; c.width = c.height = S;
    var x = c.getContext('2d'), lines = (FS_FOG + '\n' + FS).split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(function (l) { return l.length > 8; });
    x.font = 500 * 1 + ' ' + (10.5 * D) + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; x.fillStyle = '#fff'; x.textBaseline = 'top';
    for (var i = 0, y = 4 * D; y < S; i++, y += 14 * D) x.fillText(lines[(i * 7) % lines.length], 4 * D - (i % 3) * 30 * D, y);
    put(tCode, c, false);
  })();

  /* ---------- 글(h1)을 그림으로: 화면에 놓인 글 조각 자리 그대로 ---------- */
  var tc = document.createElement('canvas'), segs = [[0, 0, 0, 0], [0, 0, 0, 0]], ordX = .5;
  function drawText() {
    var D = cv.width / Math.max(1, cv.clientWidth), W = cv.width, H = cv.height, sr = cv.getBoundingClientRect();
    tc.width = W; tc.height = H;
    var x = tc.getContext('2d'), cs = getComputedStyle(h1);
    x.clearRect(0, 0, W, H);
    x.font = cs.fontWeight + ' ' + (parseFloat(cs.fontSize) * D) + 'px ' + cs.fontFamily;
    try { x.letterSpacing = (parseFloat(cs.letterSpacing) || 0) * D + 'px'; } catch (e) {}
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    var parts = [].slice.call(h1.querySelectorAll('span'));
    if (!parts.length) parts = [h1];
    var rs = [], total = 0;
    parts.forEach(function (s) {
      var rg = document.createRange(); rg.selectNodeContents(s); var r = rg.getBoundingClientRect(); if (!r.width) return;
      var m = x.measureText(s.textContent), asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent, des = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
      var L = (r.left - sr.left) * D, T = (r.top - sr.top) * D, Hh = r.height * D;
      x.fillText(s.textContent, L, T + (Hh - (asc + des)) / 2 + asc);
      rs.push([L, T - 6 * D, L + r.width * D, T + Hh + 6 * D]); total += r.width;
    });
    segs = [rs[0] || [0, 0, 0, 0], rs[1] || [0, 0, 0, 0]];
    ordX = rs.length > 1 ? (rs[0][2] - rs[0][0]) / (total * D) : 1;
    put(tTxt, tc, true);
  }

  /* ---------- 크기 ---------- */
  var scale = 1, fogS = .4, W = 0, H = 0, map = [0, 0, 1, 1], fW = 0, fH = 0, geo = null;
  function layout() {
    var D = Math.min(devicePixelRatio || 1, 2) * scale, cw = stage.clientWidth, ch = stage.clientHeight;
    W = Math.round(cw * D); H = Math.round(ch * D); cv.width = W; cv.height = H;
    var a = W / H, hd, wd, x0, y0;
    if (a <= IMG.ar) { hd = H * 1.02; wd = hd * IMG.ar; x0 = (W - wd) / 2; y0 = (H - hd) / 2; }
    else { hd = Math.min(W / IMG.ar, H * 1.55); wd = hd * IMG.ar; x0 = (W - wd) / 2; y0 = clamp(H * .6 - IMG.ly * hd, H - hd, 0); }
    map = [x0, y0, wd, hd];
    fW = Math.max(2, Math.round(W * fogS)); fH = Math.max(2, Math.round(H * fogS));
    [tB, tF].forEach(function (t) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fW, fH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tB, 0); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tF, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // 사진과 같은 카메라: 등이 물에 닿는 선이 수평선보다 얼마나 아래인가로 등까지 거리를 정한다
    var hz = (map[1] + IMG.hz * map[3]) / H, wl = (map[1] + IMG.wl * map[3]) / H, ls = [(map[0] + IMG.lx * map[2]) / H, (map[1] + IMG.ly * map[3]) / H];
    var zl = CAM.f * CAM.hc / Math.max(wl - hz, .01);
    geo = { hz: hz, ls: ls, zl: zl, ly: CAM.hc + (hz - ls[1]) / CAM.f * zl, lr: IMG.lw * map[2] / H * .56 };
    drawText();
  }

  /* ---------- 그리기 ---------- */
  var t0 = performance.now(), raf = 0, last = 0, slow = 0, X = 0, look = 0, lookT = 0, rips = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], ri = 0, drawn = false;
  var IN = deep ? 99 : 0;   // 들어오는 연출을 건너뛸 때는 처음부터 다 켜진 상태
  function frame(now) {
    var t = (now - t0) / 1000, D = W / Math.max(1, cv.clientWidth), tin = IN > 50 ? 9 : t;
    look += (lookT - look) * .04;
    var fl = .93 + .035 * Math.sin(t * 7.3) + .025 * Math.sin(t * 13.1 + 1.3) + .02 * Math.sin(t * 3.7 + .5);   // 등불 깜빡임
    var pw = (.25 + .75 * ss(.1, 1.6, tin)) * fl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, fW, fH);
    gl.useProgram(P1.p); var v = P1.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg); gl.uniform1i(v.uImg, 0);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_3D, tN); gl.uniform1i(v.uN, 4);
    gl.uniform2f(v.uRes, fW, fH); gl.uniform1f(v.uT, t); gl.uniform1f(v.uLook, look);
    gl.uniform4f(v.uMapH, map[0] / H, map[1] / H, map[2] / H, map[3] / H);
    gl.uniform2f(v.uLs, geo.ls[0], geo.ls[1]); gl.uniform3f(v.uLw, 0, geo.ly, geo.zl); gl.uniform3f(v.uWarm, WARM[0], WARM[1], WARM[2]);
    gl.uniform1f(v.uHz, geo.hz); gl.uniform1f(v.uF, CAM.f); gl.uniform1f(v.uHc, CAM.hc); gl.uniform1f(v.uLr, geo.lr); gl.uniform1f(v.uPow, pw);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(P2.p); var u = P2.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg); gl.uniform1i(u.uImg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tB); gl.uniform1i(u.uB, 1);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, tF); gl.uniform1i(u.uFg, 5);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tTxt); gl.uniform1i(u.uTxt, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tCode); gl.uniform1i(u.uCode, 3);
    gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uFt, 1 / fW, 1 / fH); gl.uniform4f(u.uMap, map[0], map[1], map[2], map[3]);
    gl.uniform2f(u.uL, IMG.lx, IMG.ly); gl.uniform1f(u.uLW, IMG.lw); gl.uniform1f(u.uWL, IMG.wl); gl.uniform1f(u.uHz, IMG.hz);
    gl.uniform1f(u.uT, t); gl.uniform1f(u.uIn, clamp(tin / 2.6, 0, 1) * 2.6); gl.uniform1f(u.uWr, ss(1.1, 3.6, tin)); gl.uniform1f(u.uX, X);
    gl.uniform1f(u.uDpr, D); gl.uniform1f(u.uFl, fl); gl.uniform1f(u.uHc, CAM.hc); gl.uniform1f(u.uF, CAM.f); gl.uniform1f(u.uZL, geo.zl);
    gl.uniform3f(u.uWarm, WARM[0], WARM[1], WARM[2]);
    gl.uniform4f(u.uSeg0, segs[0][0], segs[0][1], segs[0][2], segs[0][3]); gl.uniform4f(u.uSeg1, segs[1][0], segs[1][1], segs[1][2], segs[1][3]);
    gl.uniform2f(u.uOrd, ordX, 1);
    gl.uniform4fv(u.uRip, new Float32Array([].concat(rips[0], rips[1], rips[2])));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!drawn) { drawn = true; hero.classList.add('gl-on'); }
    if (tin > 3.4) hero.classList.add('lake--in');
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 31) return;   // 흐르는 안개엔 초당 30장이면 충분
    var dt = now - last; last = now;
    if (dt > 55 && dt < 400 && ++slow > 24 && scale > .5) { scale = Math.max(.5, scale * .85); slow = 0; layout(); }
    if (imgOk && fontOk && !document.querySelector('dialog[open]')) frame(now);   // 소개 창이 떠 있으면 쉰다
  }
  var visible = true, fontOk = false;
  function kick() { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function rest() { cancelAnimationFrame(raf); raf = 0; }
  new IntersectionObserver(function (es) {   // 머리말 밑에 숨은 만큼은 안 보이는 것으로
    visible = es[0].isIntersecting || state !== 'page';
    if (visible && state === 'page' && !busy) X = 0;   // 글 상태에서 손으로 올려 다시 보이면 찢기 전 장면
    visible ? kick() : rest();
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  document.addEventListener('visibilitychange', function () { document.hidden ? rest() : kick(); });
  var fontWait = document.fonts && document.fonts.load ? document.fonts.load(getComputedStyle(h1).fontWeight + ' 30px "Hahmlet Hero"', h1.textContent) : Promise.resolve();
  Promise.race([fontWait, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { fontOk = true; t0 = performance.now(); layout(); kick(); });

  /* ---------- 첫 스크롤: 잠그고 찢으며 넘어가기, 맨 위에서 올리면 되돌아오기 ---------- */
  var state = 'hero', busy = false;
  function target() {   // '만든 것' 맨 위가 머리말 바로 밑에 오는 스크롤 자리(옮겨 놓은 동안엔 옮긴 만큼 빼고)
    var r = works.getBoundingClientRect().top, m = getComputedStyle(works).transform;
    if (m && m !== 'none') r -= new DOMMatrixReadOnly(m).m42;
    return Math.max(1, Math.round(r + scrollY - (bar ? bar.offsetHeight : 0)));
  }
  function jump(y) { try { scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { scrollTo(0, y); } }   // 사이트가 부드러운 스크롤이라 바로 옮기기
  function tween(ms, f) { return new Promise(function (res) { var s = performance.now(); (function st(n) { var v = clamp((n - s) / ms, 0, 1); f(v); v < 1 ? requestAnimationFrame(st) : res(); })(s); }); }
  function rev(v) { d.style.setProperty('--rev', v.toFixed(3)); }
  function lock(on) { d.classList.toggle('lake-lock', on); }
  function exit() {
    if (busy || state !== 'hero') return; busy = true; state = 'exit';
    var y = target();   // '만든 것'을 옮기기(lake-rev) 전에 잰다
    lock(true); hdr('mid'); hero.classList.add('lake--fixed'); d.classList.add('lake-rev'); rev(0);
    jump(y); kick();
    return tween(1100, function (v) { X = v; rev(ss(.32, 1, v)); }).then(function () {
      X = 1; hero.classList.remove('lake--fixed'); d.classList.remove('lake-rev'); rev(1); lock(false); hdr('page');
      state = 'page'; rest(); setTimeout(function () { busy = false; }, 120);
    });
  }
  function enter() {
    if (busy || state !== 'page') return; busy = true; state = 'enter';
    lock(true); hdr('mid'); X = 1; hero.classList.add('lake--fixed'); d.classList.add('lake-rev'); rev(1); kick();
    return tween(900, function (v) { X = 1 - v; rev(1 - ss(0, .7, v)); }).then(function () {
      X = 0; jump(0); hero.classList.remove('lake--fixed'); d.classList.remove('lake-rev'); rev(1); hdr('hero');
      state = 'hero'; setTimeout(function () { busy = false; }, 120);
    });
  }
  function atTop() { return Math.abs(scrollY - target()) < 6 || scrollY < target(); }
  if (deep) { state = 'page'; hdr('page'); }
  else { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; jump(0); lock(true); hdr('hero'); }
  addEventListener('wheel', function (e) {
    if (state === 'hero' || busy) { e.preventDefault(); if (!busy && e.deltaY > 4) exit(); }
    else if (state === 'page' && atTop() && e.deltaY < -4) { e.preventDefault(); enter(); }
  }, { passive: false });
  var ty0 = null, tx0 = 0;
  addEventListener('touchstart', function (e) { ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchmove', function (e) {
    if ((state === 'hero' || busy) && e.cancelable) e.preventDefault();   // 잠긴 동안엔 손가락이 끝날 때까지 화면이 안 움직이게
    if (ty0 == null) return;
    var dy = e.touches[0].clientY - ty0;
    if (state === 'hero' || busy) { if (!busy && dy < -10) { ty0 = null; exit(); } }
    else if (state === 'page' && atTop() && dy > 14) { if (e.cancelable) e.preventDefault(); ty0 = null; enter(); }
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (state === 'hero' && ['ArrowDown', 'PageDown', ' ', 'Spacebar'].indexOf(e.key) >= 0) { e.preventDefault(); exit(); }
    else if (state === 'page' && atTop() && ['ArrowUp', 'PageUp'].indexOf(e.key) >= 0) { e.preventDefault(); enter(); }
  });
  [].forEach.call(hero.querySelectorAll('[data-lake-go]'), function (a) { a.addEventListener('click', function (e) { if (state === 'hero') { e.preventDefault(); exit(); } }); });
  // 스크립트 밖에서 옮긴 스크롤(머리말 '만든 것'·찾기·포커스): 잠금을 풀고 글 상태로
  addEventListener('scroll', function () {
    if (busy) return;
    if (state === 'hero' && scrollY > 8) { lock(false); hdr('page'); state = 'page'; }
    else if (state === 'page' && scrollY < 2) { lock(true); hdr('hero'); state = 'hero'; X = 0; kick(); }
    else if (state === 'page') hdr(scrollY < hero.offsetHeight - 70 ? 'hero' : 'page');
  }, { passive: true });
  addEventListener('hashchange', function () { if (state === 'hero' && location.hash && location.hash !== '#main') { lock(false); hdr('page'); state = 'page'; } });

  /* ---------- 만지기: 누르면 물결, PC 마우스로 안개가 살짝 ---------- */
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button')) return;
    var r = cv.getBoundingClientRect(), Hh = r.height || 1;
    var qx = (e.clientX - r.left) / Hh, qy = (e.clientY - r.top) / Hh, hz = (map[1] + IMG.hz * map[3]) / H;
    if (qy < hz + .02) qy = hz + .06 + Math.random() * .08;   // 하늘을 누르면 등 앞 물에
    rips[ri] = [qx, qy, (performance.now() - t0) / 1000, 1]; ri = (ri + 1) % 3; kick();
  });
  stage.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') lookT = clamp((e.clientX / innerWidth - .5) * 2, -1, 1); });
  var rz = 0; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (fontOk) layout(); if (state === 'hero') jump(0); }, 120); });
  if (document.fonts) document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', function () { if (fontOk) drawText(); });
})();
