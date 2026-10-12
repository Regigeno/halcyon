// Procedural audio for HALCYON. Everything is synthesized with WebAudio; no asset files.
const Sfx = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let volume = 0.8;
  const loops = {};

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() {
    init();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }

  const now = () => ctx.currentTime;

  function out(pan = 0, gain = 1) {
    const g = ctx.createGain();
    g.gain.value = gain;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p).connect(master);
    } else {
      g.connect(master);
    }
    return g;
  }

  function noise(dest, { t = now(), dur = 0.3, type = 'bandpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, freqEnd = null } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  function tone(dest, { t = now(), dur = 0.3, type = 'sine', freq = 440, freqEnd = null, gain = 0.3, attack = 0.01, release = null, detune = 0 } = {}) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (release ?? dur));
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + (release ?? dur) + 0.05);
    return o;
  }

  // ---------- one-shots ----------
  const play = {
    camUp() { const d = out(0, 0.5); tone(d, { freq: 900, freqEnd: 1500, dur: 0.12, type: 'square', gain: 0.08 }); noise(d, { dur: 0.25, freq: 3000, gain: 0.15 }); },
    camDown() { const d = out(0, 0.5); tone(d, { freq: 1300, freqEnd: 600, dur: 0.12, type: 'square', gain: 0.08 }); noise(d, { dur: 0.2, freq: 2000, gain: 0.12 }); },
    camSwitch() { const d = out(0, 0.6); noise(d, { dur: 0.22, type: 'highpass', freq: 1500, gain: 0.35 }); tone(d, { freq: 2400, dur: 0.05, type: 'square', gain: 0.05 }); },
    door(pan) {
      const d = out(pan, 0.9);
      noise(d, { dur: 0.35, type: 'lowpass', freq: 900, freqEnd: 200, gain: 0.9 });
      tone(d, { freq: 70, freqEnd: 40, dur: 0.35, type: 'sine', gain: 0.8 });
      noise(d, { t: now() + 0.02, dur: 0.12, freq: 4000, q: 3, gain: 0.2 });
    },
    click() { const d = out(0, 0.4); tone(d, { freq: 1800, dur: 0.03, type: 'square', gain: 0.1 }); },
    denied() { const d = out(0, 0.5); tone(d, { freq: 160, dur: 0.25, type: 'square', gain: 0.12 }); },
    step(pan = 0, gain = 0.5) {
      const d = out(pan, gain);
      tone(d, { freq: 90, freqEnd: 45, dur: 0.18, gain: 0.7 });
      noise(d, { dur: 0.1, type: 'lowpass', freq: 600, gain: 0.4 });
      noise(d, { dur: 0.05, freq: 3000, q: 4, gain: 0.08 });
    },
    footsteps(pan = 0, n = 4, gain = 0.4) { for (let i = 0; i < n; i++) setTimeout(() => play.step(pan, gain * (0.7 + Math.random() * 0.3)), i * 420 + Math.random() * 60); },
    rustle(pan = 0, gain = 0.5) {
      const d = out(pan, gain);
      for (let i = 0; i < 6; i++) noise(d, { t: now() + i * 0.05 + Math.random() * 0.03, dur: 0.12, freq: 2500 + Math.random() * 3000, q: 1.5, gain: 0.25 });
    },
    caw(pan = 0, gain = 0.6) {
      const d = out(pan, gain);
      for (let i = 0; i < 3; i++) {
        const t = now() + i * 0.38;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 4; bp.connect(d);
        tone(bp, { t, freq: 620, freqEnd: 420, dur: 0.3, type: 'sawtooth', gain: 0.9, attack: 0.02 });
        tone(bp, { t, freq: 640, freqEnd: 400, dur: 0.3, type: 'square', gain: 0.4, attack: 0.02, detune: 30 });
        noise(d, { t, dur: 0.28, freq: 1600, q: 2, gain: 0.25 });
      }
    },
    screech(pan = 0, gain = 0.7) {
      const d = out(pan, gain);
      const t = now();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 38;
      const lfoG = ctx.createGain(); lfoG.gain.value = 140;
      lfo.connect(lfoG);
      const o = tone(d, { t, freq: 2600, freqEnd: 1300, dur: 1.1, type: 'sawtooth', gain: 0.35, attack: 0.05 });
      lfoG.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.2);
      noise(d, { t, dur: 1.0, freq: 3500, freqEnd: 1800, q: 2, gain: 0.3 });
    },
    whistle(pan = 0, gain = 0.5) {
      const d = out(pan, gain);
      const t = now();
      // "cheer, cheer, purty-purty-purty"
      for (let i = 0; i < 2; i++) tone(d, { t: t + i * 0.32, freq: 2600, freqEnd: 1700, dur: 0.24, gain: 0.4 });
      for (let i = 0; i < 4; i++) tone(d, { t: t + 0.75 + i * 0.13, freq: 1900, freqEnd: 3100, dur: 0.1, gain: 0.32 });
    },
    coo(pan = 0, gain = 0.5) {
      const d = out(pan, gain);
      const t = now();
      const seq = [[0, 0.25, 330], [0.32, 0.55, 380], [0.95, 0.35, 320]];
      for (const [s, dur, f] of seq) {
        const o = tone(d, { t: t + s, freq: f, freqEnd: f * 0.85, dur, gain: 0.4, attack: 0.06 });
        const v = ctx.createOscillator(); v.frequency.value = 7; const vg = ctx.createGain(); vg.gain.value = 9;
        v.connect(vg).connect(o.frequency); v.start(t + s); v.stop(t + s + dur);
      }
    },
    craneCall(pan = 0, gain = 0.5) {
      const d = out(pan, gain);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3; bp.connect(d);
      const t = now();
      for (let i = 0; i < 3; i++) {
        tone(bp, { t: t + i * 0.5, freq: 720, freqEnd: 860, dur: 0.18, type: 'square', gain: 0.8, attack: 0.03 });
        tone(bp, { t: t + i * 0.5 + 0.2, freq: 860, freqEnd: 690, dur: 0.22, type: 'square', gain: 0.8, attack: 0.02 });
      }
    },
    fold() {
      const d = out(0, 0.5);
      for (let i = 0; i < 4; i++) noise(d, { t: now() + Math.random() * 0.25, dur: 0.07, type: 'highpass', freq: 2500 + Math.random() * 3000, gain: 0.3 });
    },
    wings(pan = 0, gain = 0.5, beats = 6) {
      const d = out(pan, gain);
      for (let i = 0; i < beats; i++) {
        const t = now() + i * 0.26;
        noise(d, { t, dur: 0.16, type: 'bandpass', freq: 700 + i * 40, q: 0.9, gain: 0.55, attack: 0.03 });
        tone(d, { t, freq: 70, freqEnd: 45, dur: 0.12, gain: 0.25 });
      }
    },
    hoot(pan = 0, gain = 0.4) {
      const d = out(pan, gain);
      const t = now();
      [[0, 0.32, 360], [0.5, 0.18, 340], [0.75, 0.6, 320]].forEach(([s, dur, f]) => {
        tone(d, { t: t + s, freq: f, freqEnd: f * 0.92, dur, gain: 0.5, attack: 0.05 });
        noise(d, { t: t + s, dur, type: 'lowpass', freq: 500, gain: 0.08, attack: 0.05 });
      });
    },
    ratchet(pan = 0, gain = 0.25) {
      const d = out(pan, gain);
      for (let i = 0; i < 3; i++) noise(d, { t: now() + i * 0.035, dur: 0.025, type: 'bandpass', freq: 2800, q: 6, gain: 0.6 });
    },
    note(midi, gain = 0.3) {
      const d = out(0, 0.6);
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      tone(d, { freq: f, dur: 1.2, gain, attack: 0.003 });
      tone(d, { freq: f * 3, dur: 0.4, gain: gain * 0.15, attack: 0.003 });
    },
    buzz() { const d = out(0, 0.5); tone(d, { freq: 90, dur: 0.4, type: 'sawtooth', gain: 0.25 }); tone(d, { freq: 95, dur: 0.4, type: 'square', gain: 0.12 }); },
    zap() { const d = out(0, 0.5); noise(d, { dur: 0.3, type: 'highpass', freq: 3000, gain: 0.5 }); tone(d, { freq: 1600, freqEnd: 200, dur: 0.25, type: 'square', gain: 0.1 }); },
    folded() {
      const d = out(0, 0.5);
      noise(d, { dur: 0.15, type: 'highpass', freq: 3000, gain: 0.3 });
      tone(d, { t: now() + 0.05, freq: 880, dur: 0.6, gain: 0.15 });
      tone(d, { t: now() + 0.18, freq: 1318, dur: 0.8, gain: 0.12 });
    },
    bang(pan) {
      const d = out(pan, 1);
      for (let i = 0; i < 3; i++) {
        const t = now() + i * 0.32;
        noise(d, { t, dur: 0.3, type: 'lowpass', freq: 1400, freqEnd: 300, gain: 1 });
        tone(d, { t, freq: 110, freqEnd: 50, dur: 0.3, gain: 0.8 });
        noise(d, { t, dur: 0.25, freq: 5000, q: 5, gain: 0.15 });
      }
    },
    powerOut() {
      const d = out(0, 0.9);
      tone(d, { freq: 120, freqEnd: 20, dur: 2.2, type: 'sawtooth', gain: 0.4 });
      noise(d, { dur: 0.6, type: 'lowpass', freq: 800, gain: 0.6 });
    },
    scream() {
      const d = out(0, 1.2);
      const t = now();
      noise(d, { t, dur: 1.4, type: 'bandpass', freq: 2200, q: 0.7, gain: 1, attack: 0.01 });
      for (const f of [440, 466, 622, 933]) tone(d, { t, freq: f, freqEnd: f * 0.6, dur: 1.4, type: 'sawtooth', gain: 0.28 });
      tone(d, { t, freq: 60, freqEnd: 30, dur: 1.2, type: 'square', gain: 0.5 });
    },
    chime() {
      const d = out(0, 0.6);
      const notes = [784, 659, 698, 523, 0, 523, 698, 784, 659];
      notes.forEach((f, i) => {
        if (!f) return;
        const t = now() + i * 0.55;
        tone(d, { t, freq: f, dur: 2.5, gain: 0.3, attack: 0.005 });
        tone(d, { t, freq: f * 2.01, dur: 1.2, gain: 0.08, attack: 0.005 });
      });
    },
    sting() { const d = out(0, 0.6); tone(d, { freq: 110, dur: 3, type: 'sawtooth', gain: 0.2, attack: 0.6 }); tone(d, { freq: 116.5, dur: 3, type: 'sawtooth', gain: 0.2, attack: 0.6 }); },
    chip(freq, dur = 0.08, type = 'square', gain = 0.1, freqEnd = null) { const d = out(0, 0.5); tone(d, { freq, freqEnd, dur, type, gain, attack: 0.002 }); },
    flash() {
      const d = out(0, 0.6);
      tone(d, { freq: 1800, freqEnd: 5200, dur: 0.35, type: 'sine', gain: 0.06 });
      noise(d, { t: now() + 0.32, dur: 0.18, type: 'highpass', freq: 2500, gain: 0.7, attack: 0.002 });
      tone(d, { t: now() + 0.32, freq: 160, freqEnd: 60, dur: 0.15, gain: 0.5 });
    },
    taze() {
      const d = out(0, 0.7);
      for (let i = 0; i < 6; i++) noise(d, { t: now() + i * 0.06, dur: 0.07, type: 'highpass', freq: 3500 + Math.random() * 2000, gain: 0.6, attack: 0.002 });
      tone(d, { freq: 60, dur: 0.4, type: 'sawtooth', gain: 0.35 });
      tone(d, { freq: 120, dur: 0.4, type: 'square', gain: 0.12 });
    },
    mask(on) {
      const d = out(0, 0.6);
      noise(d, { dur: 0.25, type: 'bandpass', freq: on ? 900 : 1400, q: 1, gain: 0.5 });
      tone(d, { t: now() + 0.12, freq: 90, freqEnd: 60, dur: 0.12, gain: 0.4 });
    },
    pickup() { const d = out(0, 0.5); [1046, 1318, 1568, 2093].forEach((f, i) => tone(d, { t: now() + i * 0.08, freq: f, dur: 0.5, gain: 0.15 })); },
    phoneRing() {
      const d = out(0.3, 0.35);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) {
        const t = now() + r * 1.4 + i * 0.05;
        tone(d, { t, freq: 440, dur: 0.04, type: 'square', gain: 0.2 }); tone(d, { t, freq: 480, dur: 0.04, type: 'square', gain: 0.2 });
      }
    },
  };

  // ---------- loops ----------
  function startAmbience() {
    stopLoop('amb');
    const g = out(0, 0.0001);
    g.gain.setTargetAtTime(0.35, now(), 1.5);
    const hum = ctx.createOscillator(); hum.frequency.value = 55; hum.type = 'sawtooth';
    const humF = ctx.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 180;
    const humG = ctx.createGain(); humG.gain.value = 0.18;
    hum.connect(humF).connect(humG).connect(g);
    const fan = ctx.createBufferSource(); fan.buffer = noiseBuf; fan.loop = true;
    const fanF = ctx.createBiquadFilter(); fanF.type = 'bandpass'; fanF.frequency.value = 420; fanF.Q.value = 0.8;
    const fanG = ctx.createGain(); fanG.gain.value = 0.22;
    const fanLfo = ctx.createOscillator(); fanLfo.frequency.value = 9; const fanLfoG = ctx.createGain(); fanLfoG.gain.value = 0.06;
    fanLfo.connect(fanLfoG).connect(fanG.gain);
    fan.connect(fanF).connect(fanG).connect(g);
    const wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
    const windF = ctx.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 300;
    const windLfo = ctx.createOscillator(); windLfo.frequency.value = 0.07; const windLfoG = ctx.createGain(); windLfoG.gain.value = 200;
    windLfo.connect(windLfoG).connect(windF.frequency);
    const windG = ctx.createGain(); windG.gain.value = 0.25;
    wind.connect(windF).connect(windG).connect(g);
    [hum, fan, fanLfo, wind, windLfo].forEach(n => n.start());
    loops.amb = { nodes: [hum, fan, fanLfo, wind, windLfo], gain: g };
  }

  function lightBuzz(on, pan) {
    const key = 'light' + pan;
    if (!on) return stopLoop(key);
    if (loops[key]) return;
    const g = out(pan, 0.06);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2;
    o.connect(f).connect(g); o.start();
    loops[key] = { nodes: [o], gain: g };
  }

  // Music box: the Cardinal's lullaby. `level` (0..1) controls tempo sag; `vol` follows the camera.
  const LULLABY = [76, 74, 72, 74, 76, 76, 76, 0, 74, 74, 74, 0, 76, 79, 79, 0, 76, 74, 72, 74, 76, 76, 76, 76, 74, 74, 76, 74, 72, 0, 0, 0];
  const mb = { running: false, step: 0, next: 0, gain: null, level: 1, timer: null, broken: false };
  function musicBoxStart() {
    if (mb.running) return;
    mb.running = true;
    mb.gain = out(0, 0.0001);
    mb.next = now() + 0.1;
    mb.step = 0;
    mb.broken = false;
    mb.timer = setInterval(scheduleBox, 50);
  }
  function scheduleBox() {
    const beat = mb.broken ? 0.16 : 0.32 + (1 - mb.level) * 0.5;
    while (mb.next < now() + 0.2) {
      const n = LULLABY[mb.step % LULLABY.length];
      if (n) {
        const f = 440 * Math.pow(2, (n - 69) / 12) * (mb.broken ? 1.0 : 1 - (1 - mb.level) * 0.04);
        tone(mb.gain, { t: mb.next, freq: f, dur: 1.2, gain: 0.25, attack: 0.003 });
        tone(mb.gain, { t: mb.next, freq: f * 3, dur: 0.4, gain: 0.04, attack: 0.003 });
      }
      mb.step++;
      mb.next += beat;
    }
  }
  function musicBox(level, vol, broken = false) {
    if (!mb.running) return;
    mb.level = level;
    mb.broken = broken;
    mb.gain.gain.setTargetAtTime(vol, now(), 0.15);
  }
  function musicBoxStop() {
    if (!mb.running) return;
    clearInterval(mb.timer);
    mb.gain.gain.setTargetAtTime(0.0001, now(), 0.1);
    mb.running = false;
  }

  // Dove's calm: a soft major pad while it sits with you.
  function calm(on) {
    if (!on) return stopLoop('calm', 0.6);
    if (loops.calm) return;
    const g = out(0, 0.0001);
    g.gain.setTargetAtTime(0.12, now(), 0.8);
    const nodes = [261.6, 329.6, 392, 523.2].map((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      o.connect(g); o.start(); return o;
    });
    if (loops.amb) loops.amb.gain.gain.setTargetAtTime(0.05, now(), 0.6);
    loops.calm = { nodes, gain: g, onStop: () => loops.amb && loops.amb.gain.gain.setTargetAtTime(0.35, now(), 0.6) };
  }

  function heartbeat(on, rate = 1) {
    if (!on) { if (loops.heart) { clearInterval(loops.heart.timer); delete loops.heart; } return; }
    if (loops.heart) { loops.heart.rate = rate; return; }
    const st = { rate, timer: null, nodes: [], gain: null };
    const beat = () => {
      const d = out(0, 0.5);
      tone(d, { freq: 60, freqEnd: 40, dur: 0.15, gain: 0.8 });
      tone(d, { t: now() + 0.22, freq: 55, freqEnd: 38, dur: 0.15, gain: 0.6 });
    };
    st.timer = setInterval(beat, 800 / rate);
    loops.heart = st;
  }

  // Old printing press: motor whir, a ka-chunk every sheet, and random squeaks that hide faint sounds.
  function printer(on) {
    if (!on) return stopLoop('printer', 0.08);
    if (loops.printer) return;
    const g = out(0, 0.0001);
    g.gain.setTargetAtTime(0.5, now(), 0.06);
    const motor = ctx.createOscillator(); motor.type = 'sawtooth'; motor.frequency.value = 72;
    const motorF = ctx.createBiquadFilter(); motorF.type = 'lowpass'; motorF.frequency.value = 320;
    const motorG = ctx.createGain(); motorG.gain.value = 0.35;
    motor.connect(motorF).connect(motorG).connect(g);
    const hiss = ctx.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
    const hissF = ctx.createBiquadFilter(); hissF.type = 'bandpass'; hissF.frequency.value = 1200; hissF.Q.value = 0.6;
    const hissG = ctx.createGain(); hissG.gain.value = 0.28;
    hiss.connect(hissF).connect(hissG).connect(g);
    motor.start(); hiss.start();
    let beat = 0;
    const timer = setInterval(() => {
      const t = now();
      noise(g, { t, dur: 0.09, type: 'lowpass', freq: 700, gain: 0.9 });
      tone(g, { t, freq: 110, freqEnd: 55, dur: 0.1, gain: 0.6 });
      noise(g, { t: t + 0.18, dur: 0.16, type: 'highpass', freq: 2600, gain: 0.35 });
      if (++beat % 2 === 0) noise(g, { t: t + 0.3, dur: 0.05, freq: 4200, q: 6, gain: 0.25 });
      if (Math.random() < 0.18) tone(g, { t: t + Math.random() * 0.4, freq: 300 + Math.random() * 500, freqEnd: 250 + Math.random() * 300, dur: 0.3 + Math.random() * 0.3, gain: 0.05, attack: 0.05 });
      if (Math.random() < 0.12) noise(g, { t: t + Math.random() * 0.4, dur: 0.25, type: 'bandpass', freq: 600 + Math.random() * 600, q: 0.9, gain: 0.12, attack: 0.03 });
    }, 450);
    loops.printer = { nodes: [motor, hiss], gain: g, timer };
  }

  function stopLoop(key, fade = 0.15) {
    const l = loops[key];
    if (!l) return;
    if (l.timer) clearInterval(l.timer);
    if (l.gain) l.gain.gain.setTargetAtTime(0.0001, now(), fade);
    const nodes = l.nodes || [];
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) {} }), fade * 6000);
    if (l.onStop) l.onStop();
    delete loops[key];
  }

  function stopAll() {
    Object.keys(loops).forEach(k => stopLoop(k));
    musicBoxStop();
  }

  // ---------- phone call voice ----------
  let voiceEnabled = true;
  function speak(text, onBoundary, onEnd) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\[[^\]]*\]/g, ' ... '));
    const voices = speechSynthesis.getVoices();
    const pick = voices.find(v => /en[-_](US|GB)/i.test(v.lang) && /male|david|george|daniel|guy/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang));
    if (pick) u.voice = pick;
    u.rate = 0.92;
    u.pitch = 0.75;
    u.volume = Math.min(1, volume * 0.9);
    if (onBoundary) u.onboundary = e => onBoundary(e.charIndex);
    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
    return true;
  }
  function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  return {
    resume, setVolume, play, startAmbience, lightBuzz, musicBoxStart, musicBox, musicBoxStop,
    calm, heartbeat, printer, stopAll, stopLoop, speak, stopSpeech,
    set voice(v) { voiceEnabled = v; }, get voice() { return voiceEnabled; },
  };
})();
