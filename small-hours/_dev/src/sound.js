// Sound: two music files (night loop for scenes 1-5, moon cue once at scene 6) + mechanical ticks made in code.
// Nothing loads or plays until the visitor turns sound on.
export function makeSound(base = 'assets/audio/') {
  let ctx = null, master = null, on = false, tickBuf = null, clackBuf = null;
  const music = { night: null, moon: null }, gains = {};
  let nightGain = 0, moonPlayed = false, wantMoon = false;

  function noiseTick(len, f1, f2, decay) {
    const sr = ctx.sampleRate, n = Math.floor(sr * len), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr, env = Math.exp(-t / decay);
      // a click of noise plus two metallic partials: a small steel part striking another
      d[i] = env * ((Math.random() * 2 - 1) * 0.55 + Math.sin(2 * Math.PI * f1 * t) * 0.35 + Math.sin(2 * Math.PI * f2 * t) * 0.18 * Math.exp(-t / (decay * 0.5)));
    }
    return b;
  }
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    tickBuf = noiseTick(0.03, 4200, 7300, 0.0045);
    clackBuf = noiseTick(0.12, 1900, 3100, 0.018);
    // night: decoded once and looped on bar lines (72 BPM, 4/4): 4 bars of intro, then 24 bars round and round
    const BAR = 60 / 72 * 4;
    const ng = ctx.createGain(); ng.gain.value = 0; ng.connect(master); gains.night = ng.gain;
    fetch(base + 'night.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).then(buf => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      src.loopStart = 4 * BAR; src.loopEnd = Math.min(buf.duration, 28 * BAR);
      src.connect(ng); src.start(); music.night = src;
    }).catch(() => {});
    for (const k of ['moon']) {
      const a = new Audio(); a.preload = 'auto'; a.crossOrigin = 'anonymous';
      a.src = base + k + '.mp3';
      a.addEventListener('error', () => { music[k] = null; });
      music[k] = a;
      // volume goes through Web Audio: iPhone ignores audio.volume
      try { const src = ctx.createMediaElementSource(a), g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master); gains[k] = g.gain; a.volume = 1; }
      catch (e) { gains[k] = { set value(v) { a.volume = v; }, get value() { return a.volume; } }; }
    }
  }
  function play(buf, gain = 0.35, rate = 1, pan = 0) {
    if (!on || !ctx || !buf) return;
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 900;
    let node = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(bp); bp.connect(g); node.connect(master); s.start();
  }
  const api = {
    get on() { return on; },
    toggle() {
      init(); on = !on;
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (on) { if (wantMoon && music.moon && !moonPlayed) api.moon(); }
      else { if (music.moon) music.moon.pause(); if (gains.night) gains.night.value = 0; }
      // the night loop keeps running silently while sound is off; the context is suspended to save battery
      if (ctx) { if (on) ctx.resume(); else ctx.suspend(); }
      return on;
    },
    tick(gain = 0.3, rate = 1) { play(tickBuf, gain, rate * (0.96 + Math.random() * 0.08), (Math.random() - 0.5) * 0.3); },
    clack() { play(clackBuf, 0.55, 1); },
    // the night loop: louder while the watch is running, ducked under the moon cue
    level(v) { nightGain = v; },
    moon() {
      wantMoon = true;
      if (!on || moonPlayed || !music.moon) return;
      moonPlayed = true; music.moon.currentTime = 0; gains.moon.value = 0.9; music.moon.play().catch(() => { moonPlayed = false; });
    },
    resetMoon() { wantMoon = false; },
    frame(dt) {
      if (!on) return;
      const g = gains.night; if (!music.night || !g) return;
      const moonOn = music.moon && !music.moon.paused && !music.moon.ended;
      const target = moonOn ? nightGain * 0.15 : nightGain;
      g.value = Math.max(0, Math.min(1, g.value + (target - g.value) * Math.min(1, dt * 1.5)));
    },
  };
  return api;
}
