// 영상·음성 엔진. 전부 브라우저 안(WebCodecs + Mediabunny)에서 돈다. 파일을 서버로 보내지 않는다.
// 페이지의 import map이 "mediabunny" → /assets/vendor/mediabunny.min.mjs 로 잇는다(인코더 확장이 그 이름을 쓴다).
import {
  Input, ALL_FORMATS, BlobSource, Output, BufferTarget, Conversion, Quality,
  Mp3OutputFormat, Mp4OutputFormat, WavOutputFormat, OggOutputFormat, FlacOutputFormat,
  WebMOutputFormat, MovOutputFormat, canEncodeAudio, AudioSample, AudioBufferSource,
  AudioSampleSink, CanvasSink, getFirstEncodableVideoCodec
} from 'mediabunny';

const OUT = {
  mp3: { make: () => new Mp3OutputFormat(), ext: 'mp3', mime: 'audio/mpeg', audioOnly: true, codec: 'mp3' },
  m4a: { make: () => new Mp4OutputFormat({ fastStart: 'in-memory' }), ext: 'm4a', mime: 'audio/mp4', audioOnly: true, codec: 'aac' },
  wav: { make: () => new WavOutputFormat(), ext: 'wav', mime: 'audio/wav', audioOnly: true, codec: 'pcm-s16' },
  ogg: { make: () => new OggOutputFormat(), ext: 'ogg', mime: 'audio/ogg', audioOnly: true, codec: 'opus' },
  flac: { make: () => new FlacOutputFormat(), ext: 'flac', mime: 'audio/flac', audioOnly: true, codec: 'flac' },
  mp4: { make: () => new Mp4OutputFormat({ fastStart: 'in-memory' }), ext: 'mp4', mime: 'video/mp4' },
  webm: { make: () => new WebMOutputFormat(), ext: 'webm', mime: 'video/webm' },
  mov: { make: () => new MovOutputFormat({ fastStart: 'in-memory' }), ext: 'mov', mime: 'video/quicktime' }
};

export const supported = () => typeof window !== 'undefined' && 'VideoDecoder' in window && 'AudioDecoder' in window;

let mp3Ready = null, aacReady = null;
async function ensureEncoder(codec) {
  if (codec === 'mp3') {
    if (!mp3Ready) mp3Ready = (async () => {
      if (!(await canEncodeAudio('mp3'))) (await import('/assets/vendor/mediabunny-mp3-encoder.min.mjs')).registerMp3Encoder();
    })();
    return mp3Ready;
  }
  if (codec === 'aac') {
    if (!aacReady) aacReady = (async () => {
      if (!(await canEncodeAudio('aac'))) (await import('/assets/vendor/mediabunny-aac-encoder.min.mjs')).registerAacEncoder();
    })();
    return aacReady;
  }
}

// 이 브라우저가 만들 수 있는 음성 형식(못 만드는 건 화면에서 숨긴다). mp3·aac는 WebAssembly 인코더가 있어 늘 된다.
export async function encodableAudio() {
  const out = ['mp3', 'm4a', 'wav'];
  try { if (await canEncodeAudio('opus')) out.push('ogg'); } catch (e) {}
  try { if (await canEncodeAudio('flac')) out.push('flac'); } catch (e) {}
  return out;
}

function openInput(file) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

// 파일 정보: 길이·영상 크기·코덱. 화면의 파일 카드와 예상 용량에 쓴다.
export async function probe(file) {
  const input = openInput(file);
  try {
    const [v, a] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    const duration = await input.computeDuration();
    const info = { duration, hasVideo: !!v, hasAudio: !!a };
    if (v) { info.width = v.displayWidth; info.height = v.displayHeight; info.videoCodec = v.codec; }
    if (a) { info.audioCodec = a.codec; info.sampleRate = a.sampleRate; info.channels = a.numberOfChannels; }
    // 소리만 있는 파일은 크기 ÷ 길이로 대략의 비트레이트(kbps). 기본 음질을 원본보다 높게 잡지 않으려고 쓴다.
    if (a && !v && duration > 0) info.kbps = Math.round((file.size * 8) / duration / 1000);
    return info;
  } finally { input.dispose && input.dispose(); }
}

// 소리 모양(파형): 구간마다 가장 큰 소리. 끝까지 읽으며 onPartial로 조금씩 그린다.
export async function peaks(file, buckets, onPartial, signal) {
  const input = openInput(file);
  const track = await input.getPrimaryAudioTrack();
  if (!track) return null;
  const duration = await input.computeDuration();
  const out = new Float32Array(buckets);
  const sink = new AudioSampleSink(track);
  let lastDraw = 0;
  for await (const s of sink.samples()) {
    if (signal && signal.aborted) { s.close(); break; }
    const n = s.numberOfFrames, buf = new Float32Array(n);
    s.copyTo(buf, { planeIndex: 0, format: 'f32-planar' });
    const t0 = s.timestamp, dt = 1 / s.sampleRate;
    const step = Math.max(1, Math.floor(n / 64));
    for (let i = 0; i < n; i += step) {
      const b = Math.min(buckets - 1, Math.max(0, Math.floor(((t0 + i * dt) / duration) * buckets)));
      const v = Math.abs(buf[i]);
      if (v > out[b]) out[b] = v;
    }
    s.close();
    const now = performance.now();
    if (onPartial && now - lastDraw > 120) { lastDraw = now; onPartial(out, (t0 + n * dt) / duration); }
  }
  onPartial && onPartial(out, 1);
  return out;
}

// 영상 앞모습 몇 장(자르기 화면의 필름 띠)
export async function thumbs(file, count, height) {
  const input = openInput(file);
  const track = await input.getPrimaryVideoTrack();
  if (!track || !(await track.canDecode())) return [];
  const duration = await input.computeDuration();
  const sink = new CanvasSink(track, { height, fit: 'contain', poolSize: 0 });
  const times = Array.from({ length: count }, (_, i) => (duration * (i + 0.5)) / count);
  const res = [];
  for await (const w of sink.canvasesAtTimestamps(times)) res.push(w ? w.canvas : null);
  return res;
}

function fadeProcessor(fade, start, end) {
  const fi = fade.in || 0, fo = fade.out || 0;
  return (sample) => {
    const t0 = sample.timestamp, sr = sample.sampleRate, n = sample.numberOfFrames, ch = sample.numberOfChannels;
    const t1 = t0 + n / sr;
    if (!(fi && t0 < start + fi) && !(fo && t1 > end - fo)) return sample;
    const data = new Float32Array(n * ch);
    for (let c = 0; c < ch; c++) sample.copyTo(data.subarray(c * n, (c + 1) * n), { planeIndex: c, format: 'f32-planar' });
    for (let i = 0; i < n; i++) {
      const t = t0 + i / sr;
      let g = 1;
      if (fi && t < start + fi) g = Math.max(0, (t - start) / fi);
      if (fo && t > end - fo) g = Math.min(g, Math.max(0, (end - t) / fo));
      if (g < 1) for (let c = 0; c < ch; c++) data[c * n + i] *= g;
    }
    const ns = new AudioSample({ data, format: 'f32-planar', numberOfChannels: ch, sampleRate: sr, timestamp: t0 });
    sample.close();
    return ns;
  };
}

// 변환 하나. opts: { target, bitrate(kbps), trim:{start,end}, fade:{in,out}, exact, maxHeight, quality('low'|'medium'|'high'), compress }
// 돌려주는 값: { blob, ext, mime, copied } — copied = 다시 인코딩하지 않고 옮겨 담기만 함(빠르고 화질 그대로)
export function convert(file, opts, onProgress) {
  let conversion = null, canceled = false;
  const job = (async () => {
    const out = OUT[opts.target];
    if (!out) throw new Error('unknown target');
    const input = openInput(file);
    const dur = await input.computeDuration();
    if (out.codec === 'mp3' || out.codec === 'aac') await ensureEncoder(out.codec);
    if (!out.audioOnly) await ensureEncoder('aac');
    const output = new Output({ format: out.make(), target: new BufferTarget() });
    const trim = opts.trim && (opts.trim.start > 0.01 || opts.trim.end < dur - 0.01) ? { start: opts.trim.start, end: opts.trim.end } : undefined;
    const start = trim ? trim.start : 0, end = trim ? trim.end : dur;
    const audio = { };
    let compat = true;
    if (out.audioOnly) { audio.codec = out.codec; }
    if (opts.bitrate) audio.bitrate = opts.bitrate * 1000;
    if (opts.fade && (opts.fade.in || opts.fade.out)) { audio.process = fadeProcessor(opts.fade, start, end); audio.forceTranscode = true; }
    if (opts.forceAudioTranscode) audio.forceTranscode = true;
    let video;
    if (out.audioOnly) video = { discard: true };
    else {
      video = {};
      if (opts.compress) {
        // H.264가 가장 널리 열리니 먼저, 못 만들면 이 브라우저가 만들 수 있는 다음 코덱
        const vc = await getFirstEncodableVideoCodec(out.make().getSupportedVideoCodecs().filter((c) => ['avc', 'hevc', 'vp9', 'av1'].includes(c)).sort((a, b) => ['avc', 'hevc', 'vp9', 'av1'].indexOf(a) - ['avc', 'hevc', 'vp9', 'av1'].indexOf(b)));
        if (!vc) { const e = new Error('encode'); e.code = 'encode'; throw e; }
        video.codec = vc;
        video.forceTranscode = true;
        video.bitrate = new Quality(opts.quality || 'medium');
        audio.bitrate = 128000;
      }
      if (opts.exact) video.forceTranscode = true;
      // MP4·MOV로 바꾸는 이유는 대개 '어디서나 열리게'라서, VP9·AV1 영상과 Opus·Vorbis 소리는 H.264·AAC로 다시 만든다
      if (out.ext === 'mp4' || out.ext === 'mov') {
        const [vt, at] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
        if (vt && !video.codec && !['avc', 'hevc'].includes(vt.codec)) {
          const vc = await getFirstEncodableVideoCodec(['avc', 'hevc']);
          if (vc) { video.codec = vc; if (!video.bitrate) video.bitrate = new Quality('high'); }
          else compat = false; // 이 브라우저가 H.264·HEVC를 못 만들면 그대로 담고 화면에 알린다
        }
        if (at && !audio.codec && !['aac', 'mp3'].includes(at.codec)) audio.codec = 'aac';
      }
    }
    const conf = { input, output, audio, video, showWarnings: false };
    if (trim) conf.trim = trim;
    if (!out.audioOnly && opts.maxHeight) {
      const v = await input.getPrimaryVideoTrack();
      if (v && v.displayHeight > opts.maxHeight) {
        const w = Math.round((v.displayWidth * opts.maxHeight) / v.displayHeight / 2) * 2;
        video.width = w; video.height = opts.maxHeight; video.fit = 'contain';
      }
    }
    // 빠른 자르기: 다시 인코딩하지 않고 가장 가까운 경계(영상은 키프레임, 소리는 수십 ms 단위 프레임)에서 자른다.
    // 소리만 자를 때도 같은 코덱이면 옮겨 담아 음질·비트레이트를 그대로 둔다(128kbps MP3가 320kbps로 커지지 않게).
    // 영상은 기본값(키프레임까지 넓혀서 옮겨 담기). 소리는 프레임 경계에 맞추려면 아주 조금(0.1초 이하) 밀어야 해서 그만큼 허용한다.
    if (trim && !opts.exact && out.audioOnly && !audio.process && !opts.bitrate) conf.copy = { shiftTolerance: 0.1 };
    conversion = await Conversion.init(conf);
    if (canceled) throw new DOMException('canceled', 'AbortError');
    if (!conversion.isValid) {
      // 음성만 뽑는데 브라우저가 이 코덱을 못 풀면: Web Audio 해독으로 한 번 더 (예: 오래된 사파리)
      if (out.audioOnly) return await audioFallback(file, out, opts, start, end, onProgress);
      const why = conversion.discardedTracks.map((d) => d.reason).join(',');
      const err = new Error('invalid:' + why); err.code = /undecodable/.test(why) ? 'decode' : /encod/.test(why) ? 'encode' : 'format';
      throw err;
    }
    const copied = conversion.utilizedTracks.length > 0 && isCopy(conversion, audio, video);
    conversion.onProgress = (p) => onProgress && onProgress(p);
    await conversion.execute();
    return { blob: new Blob([output.target.buffer], { type: out.mime }), ext: out.ext, mime: out.mime, copied, compat };
  })();
  return { promise: job, cancel: () => { canceled = true; conversion && conversion.cancel(); } };
}

// 모든 트랙이 옮겨 담기(copy)로 처리되는지. 코덱·비트레이트·크기를 바꾸라고 했거나 출력 형식이 그 코덱을 못 받으면 다시 인코딩된다.
function isCopy(conversion, audio, video) {
  try {
    const fmt = conversion.output.format;
    for (const t of conversion.utilizedTracks) {
      const o = t.isVideoTrack() ? video : audio;
      const codecs = t.isVideoTrack() ? fmt.getSupportedVideoCodecs() : fmt.getSupportedAudioCodecs();
      if (!codecs.includes(t.codec)) return false;
      if (o.forceTranscode || o.process || o.bitrate || o.width || o.height || o.sampleRate || o.numberOfChannels) return false;
      if (o.codec && o.codec !== t.codec) return false;
    }
    return true;
  } catch (e) { return false; }
}

async function audioFallback(file, out, opts, start, end, onProgress) {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let buf;
  try { buf = await ctx.decodeAudioData(await file.arrayBuffer()); }
  catch (e) { const err = new Error('decode'); err.code = 'decode'; throw err; }
  finally { ctx.close && ctx.close(); }
  onProgress && onProgress(0.3);
  // 자르기
  const sr = buf.sampleRate, s0 = Math.floor(start * sr), s1 = Math.min(buf.length, Math.floor(end * sr));
  const off = new Ctx(buf.numberOfChannels, Math.max(1, s1 - s0), sr);
  const part = off.createBuffer(buf.numberOfChannels, Math.max(1, s1 - s0), sr);
  for (let c = 0; c < buf.numberOfChannels; c++) part.copyToChannel(buf.getChannelData(c).subarray(s0, s1), c);
  if (opts.fade) {
    const fi = opts.fade.in || 0, fo = opts.fade.out || 0, len = part.length;
    for (let c = 0; c < part.numberOfChannels; c++) {
      const d = part.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / sr, rest = (len - i) / sr; let g = 1;
        if (fi && t < fi) g = t / fi;
        if (fo && rest < fo) g = Math.min(g, rest / fo);
        if (g < 1) d[i] *= g;
      }
    }
  }
  const output = new Output({ format: out.make(), target: new BufferTarget() });
  const src = new AudioBufferSource({ codec: out.codec, bitrate: (opts.bitrate || 192) * 1000 });
  output.addAudioTrack(src);
  await output.start();
  await src.add(part);
  src.close();
  await output.finalize();
  onProgress && onProgress(1);
  return { blob: new Blob([output.target.buffer], { type: out.mime }), ext: out.ext, mime: out.mime, copied: false };
}

// 영상 → GIF. 프레임을 그림으로 꺼내 gifenc로 묶는다. opts: { start, end, fps, width }
export function toGif(file, opts, onProgress) {
  let canceled = false;
  const job = (async () => {
    const { GIFEncoder, quantize, applyPalette } = await import('/assets/vendor/gifenc.mjs');
    const input = openInput(file);
    const track = await input.getPrimaryVideoTrack();
    if (!track) { const e = new Error('novideo'); e.code = 'format'; throw e; }
    if (!(await track.canDecode())) { const e = new Error('decode'); e.code = 'decode'; throw e; }
    const w = Math.min(opts.width, track.displayWidth);
    const h = Math.round((track.displayHeight * w) / track.displayWidth / 2) * 2;
    const sink = new CanvasSink(track, { width: w, height: h, fit: 'fill', poolSize: 1 });
    const step = 1 / opts.fps, times = [];
    for (let t = opts.start; t < opts.end - 1e-6; t += step) times.push(t);
    const gif = GIFEncoder();
    const delay = Math.round(1000 / opts.fps);
    let i = 0;
    for await (const wc of sink.canvasesAtTimestamps(times)) {
      if (canceled) throw new DOMException('canceled', 'AbortError');
      if (!wc) continue;
      const ctx = wc.canvas.getContext('2d', { willReadFrequently: true });
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay });
      i++; onProgress && onProgress(i / times.length);
      if (i % 4 === 0) await new Promise((r) => setTimeout(r));
    }
    gif.finish();
    return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), ext: 'gif', mime: 'image/gif', frames: i, width: w, height: h };
  })();
  return { promise: job, cancel: () => { canceled = true; } };
}
