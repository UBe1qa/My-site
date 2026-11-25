// Small Hours: studio environment built in code (no HDR download).
// Axes: dial normal = +Z, 12 o'clock = +Y. Returns { env, soft, tent }:
//   env  = for every material (bright tent + softboxes + pin lights for sparkle)
//   soft = dimmer, no pin lights: use as envMap of the sapphire crystal so it stays clear
//   tent = env with a bright horizon: pass as polishEnv to setupWatch (mirror-polished parts of the movement)
import * as THREE from 'three';

// opt.photo (texture) + opt.envOnly: the same studio with a set's photo as the room, for that set's reflections
export function makeStudio(renderer, opt = {}) {
  const s = new THREE.Scene();
  const box = (w, h, d, pos, color, intensity) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); return m;
  };
  // light tent: soft cool grey in front of the dial and behind the case back, darker band around the horizon,
  // so brushed steel reads silver while polished edges still get dark lines
  const U = { pole: { value: new THREE.Color().setRGB(0.30, 0.325, 0.38) }, hor: { value: new THREE.Color().setRGB(0.035, 0.05, 0.10) }, k: { value: 1.0 }, ab: { value: new THREE.Vector2(0.74, 0.40) } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: U,
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 p; uniform vec3 pole; uniform vec3 hor; uniform float k; uniform vec2 ab; uniform sampler2D photo; uniform float pk;
      void main(){ float h = smoothstep(0.08, 0.85, abs(p.z)); float d = dot(p, normalize(vec3(-0.6, 0.5, 0.0)));
        vec3 c = mix(hor, pole, h)*k*max(0.02, ab.x + ab.y*d);
        // a set's photo wrapped round the room, so the steel reflects the desk, the lamp and the leather it floats over
        if (pk > 0.0) { vec2 uv = vec2(0.5 + atan(p.x, -p.z) / 6.2832, 0.5 + asin(clamp(p.y, -1.0, 1.0)) / 3.1416);
          vec3 ph = pow(texture2D(photo, uv).rgb, vec3(2.2)); c = mix(c, ph * pk, 0.7); }
        gl_FragColor = vec4(c, 1.0); }`
  }));
  U.photo = { value: opt.photo ?? null }; U.pk = { value: opt.photo ? (opt.photoGain ?? 2.2) : 0 };
  s.add(dome);
  // key softbox: large, warm white, front-left above the dial
  box(26, 16, 0.5, [-22, 10, 30], 0xfff3e2, 6.5);
  // long cool strip on the right: edge light on the case band and bezel
  box(5, 44, 0.5, [34, 4, 12], 0xcfe0ff, 7.0);
  // low strip from the 6 o'clock side (lights the case band in the hero view)
  box(34, 7, 0.5, [0, -36, 8], 0xffe9d0, 4.5);
  // top/back strip so polished parts get a clean line
  box(40, 3.5, 0.5, [0, 36, 16], 0xffffff, 6.0);
  // left strip
  box(6, 46, 0.5, [-40, 0, 6], 0xd5e2ff, 3.2);
  // behind the watch (case back view)
  box(26, 16, 0.5, [18, 10, -30], 0xfff3e2, opt.backKey ?? 2.0);   // kept low: the movement faces it squarely when the watch is turned
  box(5, 40, 0.5, [-32, -4, -14], 0xcfe0ff, 5.0);
  box(34, 6, 0.5, [0, -34, -12], 0xffffff, 3.0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  U.k.value = opt.glassAmbient ?? 0.3;
  const soft = pmrem.fromScene(s, 0.0, 0.1, 200).texture;
  U.k.value = opt.ambient ?? 1.0;
  // pin lights: tiny and very bright, they make the aventurine flakes and polished bevels sparkle
  const pins = [[-8, 30, 26], [14, 22, 34], [-26, -6, 30], [24, -14, 30], [4, -24, 36], [-14, 14, 40], [30, 20, 18], [-30, 22, 14],
                [10, 4, 44], [-4, -10, 44], [20, 8, -34], [-12, -18, -34], [0, 30, -24]];
  pins.forEach(p => box(1.1, 1.1, 0.3, p, 0xffffff, 70.0));
  const env = pmrem.fromScene(s, 0.0, 0.1, 200).texture;
  if (opt.envOnly) { pmrem.dispose(); s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); return { env }; }
  // same studio with the horizon lit like a light tent: polished chamfers of the movement reflect it and read as bright lines
  // lit from the upper left, dark on the other side: every bridge outline gets a bright edge and a dark edge
  U.hor.value.setRGB(...(opt.tentHorizon ?? [1.0, 1.0, 1.04])); U.ab.value.set(0.5, 0.8);
  const tent = pmrem.fromScene(s, 0.0, 0.1, 200).texture;
  pmrem.dispose();
  s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return { env, soft, tent };
}
