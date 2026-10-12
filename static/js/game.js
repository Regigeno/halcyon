// Core night simulation for HALCYON.
const Game = (() => {
  const { W, H, ROOM_W, OFFICE_W, ROOMS, OFFICE } = Scenes;
  const params = new URLSearchParams(location.search);
  const HOUR = params.has('fast') ? 12 : 72;
  const SCROLL_MAX = OFFICE_W - W;
  const FOLD_TIME = 2.4;
  const CAM_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const MAP = { x: W - 340, y: H - 300, bw: 58, bh: 32 };

  const HIDDEN_SPOTS = {
    1: [[420, 600], [1230, 590]], 2: [[330, 640], [1270, 600]], 3: [[1030, 660], [600, 690]],
    5: [[560, 690], [1050, 660]], 7: [[300, 410], [1260, 640]], 8: [[300, 660], [1400, 640]], 9: [[420, 680], [1180, 650]],
  };

  const DEATH = {
    raven: { title: 'THE RAVEN REMEMBERS YOU', hint: 'Watch the left doorway. Close the LEFT door when the Raven is there. It cannot move while you watch it on camera.' },
    eagle: { title: 'YOU WERE SEEN', hint: 'The Eagle hates being watched, and CAM 1 most of all. When it screeches, close the RIGHT door.' },
    cardinal: { title: 'THE SONG ENDED', hint: 'Keep the music box on CAM 7 wound. Hold the WIND button (or W) while viewing it.' },
    dove: { title: 'BE STILL. FOREVER.', hint: 'When you hear wings overhead and see feathers falling, stop. Once the Dove lands, do nothing at all until it flies away, even if your monitor is up. Looking around is fine.' },
    crane: { title: 'NOT THIS WISH', hint: 'Doors cannot stop the Crane. When it appears in the window behind the desk, hold F or the paper to fold a crane.' },
    power: { title: 'IN THE DARK', hint: 'Doors, lights and cameras all draw power. Use them only when needed.' },
    owl: { title: 'IT SAW YOU WATCHING', hint: 'If you find the Owl on a camera, switch away before its head turns all the way around. Listen for the hoot.' },
  };
  const OWL_CAMS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Wise Night: the Owl alone, with one answer for each place it can appear.
  const WISE_NIGHT = 7;
  const WISE_LOCS = ['left', 'right', 'window', 'cam', 'office'];
  const WISE_DEATH = {
    left: { title: 'THE SUN WENT DOWN', hint: 'A hush from the LEFT, where the sun goes down: close the LEFT door until it leaves.' },
    right: { title: 'NO DAWN CAME', hint: 'Waiting on the RIGHT, where the sun comes up: turn on the RIGHT light and keep it on.' },
    window: { title: 'NO WISH FOR HIM', hint: 'A face at the window: fold a crane (hold F) while it watches.' },
    cam: { title: 'IT WAS IN THE WIRES', hint: 'Hiding in a camera (its button on the map flickers): view that camera and press Z to taze it.' },
    office: { title: 'YOU WORE YOUR OWN FACE', hint: 'Wings beating inside the office: lower the monitor and put on the mask (X). Keep it on until it leaves.' },
  };
  const WISE_SUFFIX = ' And keep the music box wound. The more it unwinds, the faster the Owl comes back.';
  const TAZE_BTN = [60, H - 240, 300, 70];
  const MASK_BTN = [W - 290, H - 40, 260, 32];

  let canvas, ctx, s = null, onEnd = null, last = 0, running = false;
  const mouse = { x: W / 2, y: H / 2, down: false };
  const keys = {};

  const rand = (a, b) => a + Math.random() * (b - a);
  const roll = lvl => lvl > 0 && Math.floor(Math.random() * 20) + 1 <= lvl;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
    canvas.addEventListener('mousemove', e => { const p = toStage(e); mouse.x = p.x; mouse.y = p.y; });
    canvas.addEventListener('mousedown', e => { const p = toStage(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; if (s && running) onClick(p.x, p.y); });
    window.addEventListener('mouseup', () => { mouse.down = false; if (s) { s.fold.holding = false; s.winding = false; } });
    window.addEventListener('keydown', e => {
      if (!s || !running) return;
      if (e.repeat) { if (e.code === 'Space') e.preventDefault(); return; }
      keys[e.code] = true;
      onKey(e.code);
      if (['Space', 'KeyW', 'KeyF'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (!s) return;
      if (e.code === 'KeyF') s.fold.holding = false;
      if (e.code === 'KeyW') s.winding = false;
    });
  }

  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  // ---------------- setup ----------------
  function start(opts) {
    const ai = { raven: 0, eagle: 0, cardinal: 0, dove: 0, crane: 0, owl: 0, ...opts.ai };
    s = {
      owl: { cam: null, stay: 0, turn: 0, timer: 0, seen: false, tick: 0 },
      wise: opts.night === WISE_NIGHT,
      wiseOwl: { loc: 'roost', t: rand(10, 14), window: 0, prog: 0, cam: null, last: null },
      mask: { on: false, anim: 0 },
      taze: { cd: 0, flash: 0 },
      wiseKill: null,
      night: opts.night, ai, settings: opts.settings, call: opts.call, foundNotes: opts.foundNotes || [],
      time: 0, clock: 0, power: 100, powerOut: false, powerOutT: 0, powerOutEyes: 0, powerOutStage: 0,
      camUp: false, camAnim: 0, cam: 1, camStatic: 0, camSwitchT: 0,
      doors: { left: { closed: false, anim: 0 }, right: { closed: false, anim: 0 } },
      lights: { left: false, right: false },
      raven: { pos: ai.raven > 0 ? 2 : null, timer: 0, doorT: 0, look: 0, officeT: 0 },
      eagle: { fury: 0, phase: 'roost', t: 0, warned: false },
      cardinal: { box: 100, phase: 'cage', t: 0, keySpin: 0, warned: false },
      dove: { phase: 'cote', t: 0, anim: 0, cooldown: 30, timer: 0, weep: false },
      crane: { stage: 0, timer: 0, windowT: 0 },
      fold: { holding: false, active: false, progress: 0 },
      winding: false, folded: 0,
      hiddenCrane: null, foundThisNight: null,
      feathers: [], lampFlicker: 1, glitch: 0, scroll: SCROLL_MAX / 2,
      dead: null, jumpT: 0, deathPending: null, won: false, winT: 0,
      ambientT: rand(8, 16), shake: 0, toastT: 0,
      sub: { active: false, idx: 0, sentences: [], t: 0, speaking: false },
    };
    if (opts.night >= 1 && opts.night <= 5 && !s.foundNotes.includes(opts.night)) {
      const cams = Object.keys(HIDDEN_SPOTS).map(Number);
      const cam = cams[Math.floor(Math.random() * cams.length)];
      const spot = HIDDEN_SPOTS[cam][Math.floor(Math.random() * HIDDEN_SPOTS[cam].length)];
      s.hiddenCrane = { cam, x: spot[0], y: spot[1], found: false };
    }
    onEnd = opts.onEnd;
    Sfx.stopAll();
    Sfx.startAmbience();
    Sfx.musicBoxStart();
    if (s.call) setTimeout(() => { if (s && running && !s.dead) startCall(s.call); }, 2500);
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    Sfx.stopAll();
    Sfx.stopSpeech();
    hideSubs();
  }

  // ---------------- phone call ----------------
  function startCall(text) {
    Sfx.play.phoneRing();
    setTimeout(() => {
      if (!s || !running) return;
      const sentences = text.match(/[^.!?\]]+[.!?\]]+\s*/g) || [text];
      s.sub = { active: true, idx: 0, sentences, t: 0, speaking: false, starts: [] };
      let acc = 0;
      sentences.forEach(x => { s.sub.starts.push(acc); acc += x.length; });
      s.sub.speaking = Sfx.speak(text, ci => {
        let i = 0;
        while (i + 1 < s.sub.starts.length && s.sub.starts[i + 1] <= ci) i++;
        s.sub.idx = i;
        showSub(s.sub.sentences[i]);
      }, () => endCall());
      showSub(sentences[0]);
    }, 2900);
  }
  function updateCall(dt) {
    const sub = s.sub;
    if (!sub.active || sub.speaking) return;
    sub.t += dt;
    const cur = sub.sentences[sub.idx];
    if (sub.t > Math.max(2.2, cur.length / 15)) {
      sub.t = 0;
      sub.idx++;
      if (sub.idx >= sub.sentences.length) return endCall();
      showSub(sub.sentences[sub.idx]);
    }
  }
  function endCall() { if (s) s.sub.active = false; Sfx.stopSpeech(); hideSubs(); }
  function showSub(text) {
    const el = document.getElementById('subtitles');
    el.innerHTML = `<span class="who">PHONE:</span>${escapeHtml(text.trim())}`;
    el.classList.remove('hidden');
  }
  function hideSubs() { document.getElementById('subtitles').classList.add('hidden'); }
  function escapeHtml(t) { return t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function toast(html, secs = 7) {
    const el = document.getElementById('toast');
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    s.toastT = secs;
  }

  // ---------------- input ----------------
  function doveWatching() { return s.dove.phase === 'landing' || s.dove.phase === 'office'; }
  function disturb() {
    if (doveWatching()) { s.dove.weep = true; kill('dove', 0.35); return true; }
    return false;
  }

  function onKey(code) {
    if (s.dead || s.won) return;
    if (code === 'KeyM') return endCall();
    if (code === 'Space' || code === 'KeyS') return toggleCam();
    if (code === 'KeyQ') return toggleDoor('left');
    if (code === 'KeyE') return toggleDoor('right');
    if (code === 'KeyA') return toggleLight('left');
    if (code === 'KeyD') return toggleLight('right');
    if (code === 'KeyF') return startFold();
    if (code === 'KeyX') return toggleMask();
    if (code === 'KeyZ') return taze();
    if (code === 'KeyW') { if (s.camUp && s.cam === 7) { if (disturb()) return; s.winding = true; } return; }
    const m = code.match(/^(Digit|Numpad)([1-9])$/);
    if (m && s.camUp) switchCam(Number(m[2]));
  }

  function onClick(x, y) {
    if (s.dead || s.won) return;
    if (s.sub.active && x < 170 && y < 60) return endCall();
    if (y > H - 46 && x > W / 2 - 300 && x < W / 2 + 300) return toggleCam();
    const inR = ([bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    if (s.wise && !s.camUp && inR(MASK_BTN)) return toggleMask();
    if (s.wise && s.camUp && inR(TAZE_BTN)) return taze();
    if (s.camUp && s.camAnim > 0.95) {
      for (const id of CAM_LIST) {
        const [bx, by] = mapPos(id);
        if (x >= bx && x <= bx + MAP.bw && y >= by && y <= by + MAP.bh) return switchCam(id);
      }
      if (s.cam === 7 && windRect(x, y)) { if (disturb()) return; s.winding = true; return; }
      const hc = s.hiddenCrane;
      if (hc && !hc.found && hc.cam === s.cam) {
        const rx = x + camPan(s.cam);
        if (Math.hypot(rx - hc.x, y - hc.y) < 36) return collectCrane();
      }
      return;
    }
    if (s.camUp) return;
    const hit = Scenes.hitOffice(x, y, s.scroll);
    if (!hit) return;
    if (hit === 'paper') return startFold();
    if (hit === 'leftDoor') toggleDoor('left');
    if (hit === 'rightDoor') toggleDoor('right');
    if (hit === 'leftLight') toggleLight('left');
    if (hit === 'rightLight') toggleLight('right');
  }

  function windRect(x, y) { return x > 60 && x < 360 && y > H - 150 && y < H - 80; }

  function toggleCam() {
    if (s.powerOut || s.mask.on) return;
    if (disturb()) return;
    s.camUp = !s.camUp;
    s.fold.holding = false;
    if (s.camUp) {
      Sfx.play.camUp();
      s.lights.left = s.lights.right = false;
      Sfx.lightBuzz(false, -0.7); Sfx.lightBuzz(false, 0.7);
      s.camStatic = 1;
    } else {
      Sfx.play.camDown();
      s.winding = false;
    }
  }

  function switchCam(id) {
    if (id === s.cam) return;
    if (disturb()) return;
    s.cam = id;
    s.camStatic = 1;
    s.camSwitchT = 0.18;
    s.winding = false;
    Sfx.play.camSwitch();
  }

  function toggleDoor(side) {
    if (s.powerOut || s.camUp) return;
    if (disturb()) return;
    s.doors[side].closed = !s.doors[side].closed;
    Sfx.play.door(side === 'left' ? -0.7 : 0.7);
  }

  function toggleLight(side) {
    if (s.powerOut || s.camUp) return;
    if (disturb()) return;
    const other = side === 'left' ? 'right' : 'left';
    s.lights[side] = !s.lights[side];
    s.lights[other] = false;
    Sfx.lightBuzz(s.lights.left, -0.7);
    Sfx.lightBuzz(s.lights.right, 0.7);
    Sfx.play.click();
    const who = side === 'left' ? s.raven.pos === 'door' : (s.eagle.phase === 'door');
    if (s.lights[side] && who) { Sfx.play.sting(); s.shake = 0.3; }
  }

  function startFold() {
    if (s.camUp || s.powerOut || s.mask.on) return;
    if (disturb()) return;
    s.fold.holding = true;
  }

  function completeFold() {
    const f = s.fold;
    f.progress = 0; f.active = false; f.holding = false;
    s.folded++;
    Sfx.play.folded();
    const c = s.crane;
    if (c.stage === 4) { c.stage = 2; c.windowT = 0; Sfx.heartbeat(false); Sfx.play.craneCall(0, 0.12); }
    else if (c.stage > 0) c.stage--;
    c.timer = 0;
    if (s.wise && s.wiseOwl.loc === 'window') repelWise();
  }

  function toggleMask() {
    if (!s.wise || s.camUp || s.powerOut) return;
    s.mask.on = !s.mask.on;
    if (s.mask.on) s.fold.holding = false;
    Sfx.play.mask(s.mask.on);
  }

  function taze() {
    if (!s.wise || !s.camUp || s.camAnim < 1 || s.taze.cd > 0 || s.powerOut) return;
    s.taze.cd = 2.5;
    s.taze.flash = 1;
    s.camStatic = 1;
    s.power = Math.max(0, s.power - 1.5);
    Sfx.play.taze();
    if (s.wiseOwl.loc === 'cam' && s.wiseOwl.cam === s.cam && s.camSwitchT <= 0) repelWise();
  }

  async function collectCrane() {
    const hc = s.hiddenCrane;
    hc.found = true;
    s.foundThisNight = s.night;
    Sfx.play.pickup();
    toast(`<b>ONE OF MARA'S PAPER CRANES</b>You unfold it carefully...`);
    try {
      const r = await fetch('/api/crane', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ night: s.night }) });
      const d = await r.json();
      if (s && d.note) toast(`<b>MARA'S CRANE ${d.found} / 5</b>${escapeHtml(d.note)}`, 10);
    } catch (e) { /* offline: the result post will still record it */ }
  }

  // ---------------- simulation ----------------
  function loop(now) {
    if (!running) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function kill(who, delay = 0) {
    if (s.dead || s.deathPending || s.won) return;
    s.deathPending = { who, t: delay };
  }

  function update(dt) {
    s.time += dt;
    if (s.toastT > 0 && (s.toastT -= dt) <= 0) document.getElementById('toast').classList.add('hidden');

    if (s.dead) {
      s.jumpT += dt;
      if (s.jumpT > 1.5) finish(false, s.dead);
      return;
    }
    if (s.deathPending) {
      s.deathPending.t -= dt;
      if (s.camUp && s.deathPending.who !== 'power') { s.camUp = false; Sfx.play.camDown(); }
      if (s.deathPending.t <= 0) {
        const who = s.deathPending.who === 'power' ? 'raven' : s.deathPending.who;
        s.killer = s.deathPending.who;
        s.dead = who;
        s.jumpT = 0;
        s.camUp = false;
        Sfx.stopAll(); Sfx.stopSpeech(); hideSubs();
        Sfx.play.scream();
        return;
      }
    }
    if (s.won) {
      s.winT += dt;
      if (s.winT > 7) finish(true);
      return;
    }

    s.clock = s.time / HOUR;
    if (s.clock >= 6) return win();

    updateCall(dt);
    updateView(dt);
    updatePower(dt);
    updateFeathers(dt);
    if (s.powerOut) return updatePowerOut(dt);

    const calm = doveWatching();
    updateDove(dt);
    if (!calm) {
      updateRaven(dt);
      updateEagle(dt);
      updateCardinal(dt);
      updateCrane(dt);
      updateOwl(dt);
      if (s.wise) updateWise(dt);
    }
    updateFold(dt);
    updateAmbient(dt);

    // music box mix
    const vol = s.camUp && s.cam === 7 ? 0.85 : calm ? 0.02 : 0.1;
    Sfx.musicBox(Math.max(0.05, s.cardinal.box / 100), s.cardinal.phase === 'cage' ? vol : 0.7, s.cardinal.phase !== 'cage');
  }

  function updateView(dt) {
    s.camAnim = clamp(s.camAnim + (s.camUp ? dt : -dt) * 4.5, 0, 1);
    s.camStatic = Math.max(0, s.camStatic - dt * 3.5);
    s.camSwitchT = Math.max(0, s.camSwitchT - dt);
    s.glitch = Math.max(0, s.glitch - dt * 2);
    s.shake = Math.max(0, s.shake - dt);
    s.mask.anim = clamp(s.mask.anim + (s.mask.on ? dt : -dt) * 4, 0, 1);
    s.taze.cd = Math.max(0, s.taze.cd - dt);
    s.taze.flash = Math.max(0, s.taze.flash - dt * 3);
    for (const side of ['left', 'right']) {
      const d = s.doors[side];
      d.anim = clamp(d.anim + (d.closed ? dt : -dt) * 5, 0, 1);
    }
    if (!s.camUp) {
      const edge = 0.32;
      const nx = mouse.x / W;
      let v = 0;
      if (nx < edge) v = -(edge - nx) / edge;
      else if (nx > 1 - edge) v = (nx - (1 - edge)) / edge;
      s.scroll = clamp(s.scroll + v * 1100 * dt, 0, SCROLL_MAX);
    }
    // lamp flicker
    if (Math.random() < dt * 0.4) s.lampFlicker = rand(0.2, 0.7);
    s.lampFlicker += (1 - s.lampFlicker) * dt * 6;
  }

  function usage() {
    let u = 1;
    if (s.doors.left.closed) u++;
    if (s.doors.right.closed) u++;
    if (s.lights.left || s.lights.right) u++;
    if (s.camUp) u++;
    return u;
  }

  function updatePower(dt) {
    if (s.powerOut) return;
    s.power -= dt * (0.072 + (s.wise ? 4 : s.night) * 0.004) * usage();
    if (s.power <= 0) {
      s.power = 0;
      s.powerOut = true;
      s.camUp = false;
      s.doors.left.closed = s.doors.right.closed = false;
      s.lights.left = s.lights.right = false;
      s.fold.holding = false;
      Sfx.lightBuzz(false, -0.7); Sfx.lightBuzz(false, 0.7);
      Sfx.stopLoop('amb', 0.3);
      Sfx.musicBoxStop();
      Sfx.calm(false);
      Sfx.play.powerOut();
      endCall();
      s.powerOutT = rand(4, 9);
      s.powerOutStage = 0;
    }
  }

  function updatePowerOut(dt) {
    s.powerOutT -= dt;
    if (s.powerOutStage === 0 && s.powerOutT <= 0) {
      s.powerOutStage = 1;
      s.powerOutT = rand(7, 16);
      Sfx.musicBoxStart();
      Sfx.musicBox(0.6, 0.5, false);
      Sfx.play.footsteps(-0.7, 4, 0.5);
    }
    if (s.powerOutStage === 1) {
      s.powerOutEyes = Math.min(1, s.powerOutEyes + dt * 0.6) * (Math.random() < 0.08 ? 0.2 : 1);
      if (s.powerOutT <= 0) {
        s.powerOutStage = 2;
        Sfx.musicBoxStop();
        s.powerOutEyes = 0;
        s.powerOutT = rand(1.5, 4);
      }
    }
    if (s.powerOutStage === 2 && s.powerOutT <= 0) kill('power');
  }

  function updateRaven(dt) {
    const r = s.raven;
    if (r.pos === null) return;
    const watched = s.camUp && s.cam === r.pos;
    r.look += ((watched ? 0 : Math.sin(s.time * 0.4)) - r.look) * dt * 3;
    if (r.pos === 'office') {
      r.officeT += dt;
      if (!s.camUp || r.officeT > 1.4) kill('raven', s.camUp ? 0.3 : 0.15);
      return;
    }
    if (r.pos === 'door') {
      r.doorT -= dt;
      if (r.doorT <= 0) {
        if (s.doors.left.closed) {
          r.pos = Math.random() < 0.6 ? 2 : 3;
          Sfx.play.footsteps(-0.8, 3, 0.35);
          r.timer = 0;
        } else {
          r.pos = 'office';
          r.officeT = 0;
          s.lights.left = false; Sfx.lightBuzz(false, -0.7);
        }
      }
      return;
    }
    r.timer += dt;
    const interval = 5.0;
    if (r.timer < interval) return;
    r.timer = 0;
    if (watched) return;
    if (!roll(s.ai.raven)) return;
    const from = r.pos;
    if (r.pos === 2) r.pos = 3;
    else if (r.pos === 3) r.pos = Math.random() < 0.22 ? 2 : 4;
    else if (r.pos === 4) {
      r.pos = 'door';
      r.doorT = Math.max(3.2, 8 - s.ai.raven * 0.22);
      Sfx.play.rustle(-0.85, 0.6);
      if (Math.random() < 0.35) setTimeout(() => s && running && !s.dead && Sfx.play.caw(-0.85, 0.25), 500);
      spawnFeathers(220, 320, 6, '#141018');
    }
    if (s.camUp && (s.cam === from || s.cam === r.pos)) { s.glitch = 1; s.camStatic = 1; }
    if (r.pos === 4) Sfx.play.footsteps(-0.7, 2, 0.3);
  }

  function updateEagle(dt) {
    const e = s.eagle, lvl = s.ai.eagle;
    if (lvl <= 0) return;
    if (e.phase === 'roost') {
      // Watching makes it furious; at higher levels it keeps simmering even when unwatched.
      if (s.camUp) e.fury += dt * (1.2 + lvl * 0.45) * (s.cam === 1 ? 2 : 1);
      else e.fury -= dt * 0.7;
      e.fury += dt * lvl * 0.08;
      e.fury = clamp(e.fury, 0, 100);
      if (e.fury > 80 && !e.warned) { e.warned = true; Sfx.play.screech(0.3, 0.14); }
      if (e.fury < 60) e.warned = false;
      if (e.fury >= 100) {
        e.phase = 'run5'; e.t = 1.0;
        Sfx.play.screech(0.5, 0.8);
        if (s.camUp && s.cam === 1) { s.camStatic = 1; s.glitch = 1; }
      }
      return;
    }
    e.t -= dt;
    if (e.t > 0) return;
    if (e.phase === 'run5') { e.phase = 'run6'; e.t = 0.8; Sfx.play.footsteps(0.6, 3, 0.75); }
    else if (e.phase === 'run6') { e.phase = 'door'; e.t = 1.0; Sfx.play.step(0.85, 0.9); }
    else if (e.phase === 'door') {
      if (s.doors.right.closed) {
        e.phase = 'bang'; e.t = 1.2;
        Sfx.play.bang(0.85);
        s.power = Math.max(0, s.power - (4 + lvl * 0.2));
        s.shake = 0.6;
        spawnFeathers(1700, 300, 8, '#4a3220');
      } else {
        s.lights.right = false; Sfx.lightBuzz(false, 0.7);
        kill('eagle', 0.1);
      }
    } else if (e.phase === 'bang') {
      e.phase = 'roost';
      e.fury = Math.min(45, lvl * 2.5);
    }
  }

  function updateCardinal(dt) {
    const c = s.cardinal, lvl = s.ai.cardinal;
    if (c.phase === 'cage') {
      const wind = s.winding && s.camUp && s.cam === 7;
      if (wind) c.box = Math.min(100, c.box + dt * 24);
      else if (lvl > 0) c.box -= dt * (0.22 + lvl * 0.105);
      c.keySpin += dt * (wind ? 7 : 0.4);
      if (c.box < 30 && !c.warned) { c.warned = true; Sfx.play.whistle(-0.4, 0.12); }
      if (c.box > 45) c.warned = false;
      if (c.box <= 0) {
        c.box = 0; c.phase = 'out'; c.t = 5.5;
        Sfx.play.whistle(-0.4, 0.6);
      }
      return;
    }
    if (c.phase === 'out') {
      c.t -= dt;
      if (c.t < 2 && c.t + dt >= 2) Sfx.play.whistle(0.2, 0.9);
      if (c.t <= 0) { c.phase = 'office'; kill('cardinal', 0.2); }
    }
  }

  function updateDove(dt) {
    const d = s.dove, lvl = s.ai.dove;
    if (d.phase === 'cote') {
      if (lvl <= 0) return;
      d.cooldown -= dt;
      d.timer += dt;
      if (d.timer < 10 || d.cooldown > 0) return;
      d.timer = 0;
      const clear = !s.camUp && !s.fold.active && s.raven.pos !== 'door' && s.raven.pos !== 'office' &&
        s.eagle.phase === 'roost' && s.eagle.fury < 80 && s.cardinal.phase === 'cage' && s.cardinal.box > 20 && s.crane.stage < 4;
      if (!clear || !roll(lvl)) return;
      // Warning: wings overhead and drifting feathers. Input is still safe here.
      d.phase = 'arriving'; d.anim = 0; d.weep = false;
      Sfx.play.wings(0, 0.35, 8);
      Sfx.play.coo(0, 0.3);
      spawnFeathers(s.scroll + W / 2, 40, 6, '#f2f2f2');
      return;
    }
    if (d.phase === 'arriving') {
      d.anim += dt / 2.0;
      if (Math.random() < dt * 4) spawnFeathers(s.scroll + W / 2, 30, 1, '#f2f2f2');
      if (d.anim >= 1) {
        d.phase = 'landing'; d.anim = 0;
        Sfx.play.coo(0, 0.5);
        Sfx.play.rustle(0, 0.5);
        spawnFeathers(s.scroll + W / 2, 80, 14, '#f2f2f2');
      }
      return;
    }
    if (d.phase === 'landing') {
      d.anim += dt / 1.5;
      if (d.anim >= 1) { d.phase = 'office'; d.t = 6 + lvl * 0.18; Sfx.calm(true); }
      return;
    }
    if (d.phase === 'office') {
      d.t -= dt;
      if (Math.random() < dt * 0.15) Sfx.play.coo(0, 0.25);
      if (d.t <= 0) { d.phase = 'leaving'; d.anim = 0; Sfx.calm(false); Sfx.play.rustle(0, 0.6); spawnFeathers(s.scroll + W / 2, 380, 10, '#f2f2f2'); }
      return;
    }
    if (d.phase === 'leaving') {
      d.anim += dt / 1.2;
      if (d.anim >= 1) { d.phase = 'cote'; d.cooldown = Math.max(14, 34 - lvl); d.timer = 0; }
    }
  }

  function updateCrane(dt) {
    const c = s.crane, lvl = s.ai.crane;
    if (lvl <= 0) return;
    if (c.stage === 4) {
      c.windowT += dt;
      if (c.windowT > Math.max(4.5, 10 - lvl * 0.3)) kill('crane', 0.2);
      return;
    }
    c.timer += dt;
    if (c.timer < Math.max(4, 6.5 - lvl * 0.12)) return;
    c.timer = 0;
    if (!roll(lvl)) return;
    c.stage++;
    if (s.camUp && (s.cam === 8 || s.cam === 2)) { s.camStatic = 0.8; }
    if (c.stage === 3) Sfx.play.craneCall(0, 0.2);
    if (c.stage === 4) { c.windowT = 0; Sfx.play.craneCall(0, 0.5); Sfx.heartbeat(true, 1.2); }
  }

  function updateOwl(dt) {
    const o = s.owl, lvl = s.ai.owl;
    if (lvl <= 0) return;
    if (o.cam === null) {
      o.timer += dt;
      if (o.timer < 10) return;
      o.timer = 0;
      if (!roll(lvl)) return;
      const choices = OWL_CAMS.filter(c => !(s.camUp && c === s.cam));
      o.cam = choices[Math.floor(Math.random() * choices.length)];
      o.stay = 12 + lvl * 0.3;
      o.turn = 0;
      o.tick = 0;
      Sfx.play.hoot(rand(-0.6, 0.6), 0.22);
      return;
    }
    o.stay -= dt;
    const watching = s.camUp && s.camAnim >= 1 && s.cam === o.cam && s.camSwitchT <= 0;
    if (watching) {
      o.seen = true;
      o.turn += dt / Math.max(1.3, 2.8 - lvl * 0.07);
      if (Math.floor(o.turn * 8) > o.tick) { o.tick = Math.floor(o.turn * 8); Sfx.play.ratchet(0, 0.15 + o.turn * 0.25); }
      if (o.turn >= 1) { o.turn = 1; kill('owl', 0.15); }
    } else {
      o.turn = Math.max(0, o.turn - dt * 0.25);
      o.tick = Math.floor(o.turn * 8);
      if (o.stay <= 0) { o.cam = null; o.timer = 0; o.turn = 0; }
    }
  }

  // Aggression grows exponentially as the music box unwinds: x1 when full, about x11 when empty.
  function wiseFactor() { return Math.exp(2.4 * (1 - s.cardinal.box / 100)); }

  function updateWise(dt) {
    const o = s.wiseOwl, c = s.cardinal;
    if (!(s.winding && s.camUp && s.cam === 7)) c.box = Math.max(0.5, c.box - dt * 0.8);
    const f = wiseFactor();
    if (o.loc === 'roost') {
      o.t -= dt * f;
      if (o.t <= 0) appearWise(f);
      return;
    }
    if (o.loc === 'arriving') {
      s.lampFlicker = rand(0.05, 0.5);
      o.t -= dt;
      if (o.t <= 0) { o.loc = 'office'; o.t = o.window; Sfx.play.hoot(0, 0.45); }
      return;
    }
    o.t -= dt;
    let repelled = false;
    if (o.loc === 'left') { if (s.doors.left.closed) o.prog += dt; repelled = o.prog >= 1.5; }
    else if (o.loc === 'right') { if (s.lights.right) o.prog += dt; repelled = o.prog >= 1.2; }
    else if (o.loc === 'office') { o.prog = s.mask.on && s.mask.anim >= 1 ? o.prog + dt : 0; repelled = o.prog >= 2; }
    if (repelled) return repelWise();
    if (o.t <= 0) { s.wiseKill = o.loc; kill('owl', 0.1); }
  }

  function appearWise(f) {
    const o = s.wiseOwl;
    const choices = WISE_LOCS.filter(l => l !== o.last);
    o.loc = choices[Math.floor(Math.random() * choices.length)];
    o.last = o.loc;
    o.prog = 0;
    o.window = clamp(8 / Math.sqrt(f), 3, 8);
    o.t = o.window;
    if (o.loc === 'left') { Sfx.play.hoot(-0.85, 0.3); Sfx.play.footsteps(-0.8, 2, 0.25); }
    else if (o.loc === 'right') { Sfx.play.hoot(0.85, 0.3); Sfx.play.rustle(0.85, 0.35); }
    else if (o.loc === 'window') {
      Sfx.play.hoot(0, 0.15);
      for (let i = 0; i < 3; i++) setTimeout(() => s && running && Sfx.play.ratchet(0, 0.4), 400 + i * 260);
    } else if (o.loc === 'cam') {
      const cams = CAM_LIST.filter(c => !(s.camUp && c === s.cam));
      o.cam = cams[Math.floor(Math.random() * cams.length)];
      Sfx.play.hoot(0, 0.1);
      Sfx.play.camSwitch();
    } else {
      o.loc = 'arriving';
      o.t = 1.3;
      o.window = Math.max(3.5, o.window);
      Sfx.play.wings(0, 0.6, 6);
    }
  }

  function repelWise() {
    const o = s.wiseOwl;
    const pan = o.loc === 'left' ? -0.8 : o.loc === 'right' ? 0.8 : 0;
    Sfx.play.wings(pan, 0.25, 4);
    Sfx.play.hoot(pan, 0.12);
    o.loc = 'roost'; o.cam = null; o.prog = 0;
    o.t = rand(7, 12);
  }

  function updateFold(dt) {
    const f = s.fold;
    const holding = (f.holding && (mouse.down || keys.KeyF)) && !s.camUp && !s.powerOut;
    if (!holding) f.holding = false;
    if (holding) {
      if (!f.active) { f.active = true; }
      const before = f.progress;
      f.progress += dt / FOLD_TIME;
      if (Math.floor(before * 5) !== Math.floor(f.progress * 5)) Sfx.play.fold();
      if (f.progress >= 1) completeFold();
    } else if (f.progress > 0) {
      f.progress = Math.max(0, f.progress - dt * 1.5);
      if (f.progress === 0) f.active = false;
    }
  }

  function updateAmbient(dt) {
    s.ambientT -= dt;
    if (s.ambientT > 0) return;
    s.ambientT = rand(10, 24);
    const r = Math.random();
    if (r < 0.3) Sfx.play.footsteps(rand(-1, 1), 3, 0.12);
    else if (r < 0.5) Sfx.play.rustle(rand(-1, 1), 0.15);
    else if (r < 0.62 && s.night >= 3) Sfx.play.caw(rand(-1, 1), 0.08);
    else if (r < 0.7 && s.night >= 4) Sfx.play.craneCall(rand(-1, 1), 0.05);
  }

  function spawnFeathers(x, y, n, color) {
    for (let i = 0; i < n; i++) s.feathers.push({ x: x + rand(-80, 80), y: y + rand(-40, 40), vx: rand(-20, 20), vy: rand(20, 60), r: rand(0, 6), vr: rand(-2, 2), a: 0.9, color, life: rand(3, 6) });
  }
  function updateFeathers(dt) {
    for (const f of s.feathers) {
      f.life -= dt;
      f.x += (f.vx + Math.sin(s.time * 2 + f.r) * 30) * dt;
      f.y += f.vy * dt;
      f.r += f.vr * dt;
      f.a = Math.min(0.9, f.life / 2);
    }
    s.feathers = s.feathers.filter(f => f.life > 0 && f.y < H + 20);
  }

  function win() {
    s.won = true;
    s.winT = 0;
    Sfx.stopAll(); Sfx.stopSpeech(); hideSubs();
    Sfx.play.chime();
  }

  function finish(survived, who) {
    if (!running) return;
    running = false;
    Sfx.stopAll();
    const result = {
      night: s.night, survived, killer: survived ? null : (s.killer || who),
      folded: s.folded, crane_found: s.foundThisNight,
      power_out: !survived && s.killer === 'power',
      owl_seen: s.owl.seen,
      custom_total: Object.values(s.ai).reduce((a, b) => a + b, 0),
    };
    let death = survived ? null : DEATH[result.killer] || DEATH.raven;
    if (!survived && s.wise && s.wiseKill) death = { ...WISE_DEATH[s.wiseKill], hint: WISE_DEATH[s.wiseKill].hint + WISE_SUFFIX };
    onEnd && onEnd(result, death);
  }

  // ---------------- rendering ----------------
  function camPan(cam) {
    const t = s.time * 0.16 + cam * 1.7;
    const tri = Math.abs(((t % 2) + 2) % 2 - 1);
    const sm = clamp((tri - 0.15) / 0.7, 0, 1);
    return (ROOM_W - W) * (sm * sm * (3 - 2 * sm));
  }

  function render() {
    ctx.save();
    if (s.shake > 0 && s.settings.shake) ctx.translate(rand(-1, 1) * s.shake * 14, rand(-1, 1) * s.shake * 14);

    if (s.dead) {
      Scenes.drawJumpscare(ctx, s, s.dead, s.jumpT);
      if (s.jumpT > 1.0) {
        ctx.globalAlpha = (s.jumpT - 1.0) * 2;
        ctx.drawImage(Scenes.noiseFrame(s.time), 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      return;
    }
    if (s.won) { renderWin(); ctx.restore(); return; }

    if (s.camAnim >= 1) {
      Scenes.drawCam(ctx, s.cam, s, camPan(s.cam));
      Scenes.camOverlay(ctx, s, s.cam, s.camStatic * 0.9 + s.glitch * 0.5 + (s.cam === 1 ? s.eagle.fury / 400 : 0));
      if (s.camSwitchT > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.8; ctx.drawImage(Scenes.noiseFrame(s.time, 60), 0, 0, W, H); ctx.globalAlpha = 1; }
      drawMap();
      if (s.cam === 7) drawWindButton();
      if (s.wise) drawTaze();
    } else {
      Scenes.drawOffice(ctx, s, s.scroll);
      if (s.mask.anim > 0) drawMask(s.mask.anim);
      if (s.camAnim > 0) drawMonitorFlip(s.camAnim);
    }
    drawHUD();
    ctx.restore();
  }

  function drawMask(k) {
    const e = k * k * (3 - 2 * k);
    const holes = [[W / 2 - 200, H / 2 - 30], [W / 2 + 200, H / 2 - 30]];
    ctx.save();
    ctx.translate(0, (1 - e) * H);
    ctx.fillStyle = Sprites.rg(ctx, W / 2, H / 2, 100, 900, [[0, '#5a3c20'], [1, '#1a1008']]);
    ctx.beginPath();
    ctx.rect(-40, -40, W + 80, H + 80);
    for (const [hx, hy] of holes) { ctx.moveTo(hx + 150, hy); ctx.ellipse(hx, hy, 150, 115, 0, 0, Math.PI * 2); }
    ctx.fill('evenodd');
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 3;
    for (const [hx, hy] of holes) for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.ellipse(hx, hy, 170 + r * 26, 135 + r * 22, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#7a5a2a';
    ctx.beginPath(); ctx.moveTo(W / 2 - 40, H / 2 + 40); ctx.lineTo(W / 2 + 40, H / 2 + 40); ctx.lineTo(W / 2, H / 2 + 170); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.restore();
    if (e > 0.9) {
      ctx.fillStyle = 'rgba(239,233,218,.6)'; ctx.font = '24px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillText('you breathe slowly behind the mask...', W / 2, H - 70);
    }
  }

  function drawTaze() {
    const ready = s.taze.cd <= 0;
    const [x, y, w, h] = TAZE_BTN;
    ctx.fillStyle = ready ? 'rgba(60,110,200,.55)' : 'rgba(20,20,20,.75)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#9ac0ff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    if (!ready) { ctx.fillStyle = 'rgba(154,192,255,.35)'; ctx.fillRect(x, y + h - 6, w * (1 - s.taze.cd / 2.5), 6); }
    ctx.fillStyle = '#eef4ff'; ctx.font = '30px VT323, monospace'; ctx.textAlign = 'center';
    ctx.fillText(ready ? 'TAZE  (Z)' : 'CHARGING...', x + w / 2, y + 44);
    if (s.taze.flash > 0) {
      ctx.fillStyle = `rgba(190,215,255,${s.taze.flash * 0.7})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(255,255,255,${s.taze.flash})`; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); let lx = rand(200, W - 200), ly = 0; ctx.moveTo(lx, ly);
        while (ly < H) { lx += rand(-60, 60); ly += rand(40, 90); ctx.lineTo(lx, ly); }
        ctx.stroke();
      }
    }
  }

  function drawMonitorFlip(k) {
    const e = k * k * (3 - 2 * k);
    const y = H * (1 - e);
    ctx.save();
    ctx.translate(0, y);
    ctx.fillStyle = '#121212'; ctx.fillRect(-20, 0, W + 40, H + 20);
    ctx.fillStyle = '#060806'; ctx.fillRect(30, 26, W - 60, H - 52);
    ctx.globalAlpha = 0.35; ctx.drawImage(Scenes.noiseFrame(s.time), 30, 26, W - 60, H - 52); ctx.globalAlpha = 1;
    ctx.restore();
  }

  function mapPos(id) {
    const [mx, my] = ROOMS[id].map;
    return [MAP.x + mx - MAP.bw / 2 + 20, MAP.y + my];
  }

  function drawMap() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(MAP.x - 10, MAP.y - 30, 350, 300);
    ctx.strokeStyle = 'rgba(220,230,220,.55)'; ctx.lineWidth = 3;
    const c = id => { const [x, y] = mapPos(id); return [x + MAP.bw / 2, y + MAP.bh / 2]; };
    const links = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [2, 7], [2, 8], [1, 9], [9, 8]];
    ctx.beginPath();
    links.forEach(([a, b]) => { const [x0, y0] = c(a), [x1, y1] = c(b); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); });
    const [ox, oy] = [MAP.x + 170, MAP.y + 238];
    const [x4, y4] = c(4), [x6, y6] = c(6);
    ctx.moveTo(x4, y4); ctx.lineTo(ox - 30, oy); ctx.moveTo(x6, y6); ctx.lineTo(ox + 30, oy);
    ctx.stroke();
    ctx.fillStyle = '#2a3a2a'; ctx.fillRect(ox - 34, oy - 14, 68, 30);
    ctx.fillStyle = '#e9efe6'; ctx.font = '20px VT323, monospace'; ctx.textAlign = 'center'; ctx.fillText('YOU', ox, oy + 7);
    for (const id of CAM_LIST) {
      const [x, y] = mapPos(id);
      const sel = id === s.cam;
      const blink = sel && Math.floor(s.time * 3) % 2;
      ctx.fillStyle = sel ? (blink ? '#9fd29a' : '#6fae6a') : '#3b4a3b';
      ctx.fillRect(x, y, MAP.bw, MAP.bh);
      if (s.wise && s.wiseOwl.loc === 'cam' && s.wiseOwl.cam === id && Math.random() < 0.35) {
        ctx.globalAlpha = 0.7; ctx.drawImage(Scenes.noiseFrame(s.time, 40), x, y, MAP.bw, MAP.bh); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = '#d6e2d4'; ctx.lineWidth = 2; ctx.strokeRect(x, y, MAP.bw, MAP.bh);
      ctx.fillStyle = '#f2f6f0'; ctx.font = '22px VT323, monospace';
      ctx.fillText(`CAM${id}`, x + MAP.bw / 2, y + 22);
      if (id === 7 && s.cardinal.box < 35 && s.cardinal.phase === 'cage' && Math.floor(s.time * 4) % 2) {
        ctx.fillStyle = '#ff4a3a'; ctx.fillText('!', x + MAP.bw + 8, y + 22);
      }
    }
    ctx.restore();
  }

  function drawWindButton() {
    const on = s.winding;
    ctx.fillStyle = on ? 'rgba(200,170,90,.55)' : 'rgba(20,20,20,.75)';
    ctx.fillRect(60, H - 150, 300, 70);
    ctx.strokeStyle = '#d8c48a'; ctx.lineWidth = 2; ctx.strokeRect(60, H - 150, 300, 70);
    ctx.fillStyle = '#f4ead0'; ctx.font = '30px VT323, monospace'; ctx.textAlign = 'center';
    ctx.fillText(s.cardinal.phase === 'cage' ? 'HOLD TO WIND (W)' : '...THE CAGE IS EMPTY', 210, H - 106);
  }

  function hourLabel() {
    const h = Math.floor(s.clock);
    return h === 0 ? '12 AM' : `${h} AM`;
  }

  function drawHUD() {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#efe9da';
    ctx.font = '54px VT323, monospace';
    ctx.fillText(hourLabel(), W - 30, 56);
    ctx.font = '26px VT323, monospace';
    ctx.fillText(s.night === 0 ? 'Custom Night' : s.wise ? 'Wise Night' : `Night ${s.night}`, W - 30, 84);

    ctx.textAlign = 'left';
    ctx.font = '28px VT323, monospace';
    const p = Math.max(0, Math.ceil(s.power));
    ctx.fillStyle = p < 15 ? '#ff6a5a' : '#efe9da';
    ctx.fillText(`Power left: ${p}%`, 30, H - 60);
    ctx.fillStyle = '#efe9da';
    ctx.fillText('Usage:', 30, H - 26);
    const u = s.powerOut ? 0 : usage();
    for (let i = 0; i < u; i++) {
      ctx.fillStyle = i < 2 ? '#5fbf6a' : i < 3 ? '#d9b23a' : '#d9453a';
      ctx.fillRect(110 + i * 22, H - 46, 16, 24);
    }

    if (!s.powerOut) {
      const camHover = mouse.y > H - 46 && mouse.x > W / 2 - 300 && mouse.x < W / 2 + 300;
      ctx.fillStyle = camHover ? 'rgba(220,230,220,.35)' : 'rgba(220,230,220,.16)';
      ctx.fillRect(W / 2 - 300, H - 40, 600, 32);
      ctx.strokeStyle = 'rgba(230,240,230,.55)'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 300, H - 40, 600, 32);
      ctx.fillStyle = '#eef3ec'; ctx.font = '26px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillText(s.camUp ? 'v  LOWER MONITOR  [SPACE]  v' : '^  CAMERAS  [SPACE]  ^', W / 2, H - 16);
      if (s.wise && !s.camUp) {
        const [x, y, w, h] = MASK_BTN;
        ctx.fillStyle = s.mask.on ? 'rgba(160,110,50,.6)' : 'rgba(220,230,220,.16)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(230,200,150,.6)'; ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f4ead0'; ctx.fillText(s.mask.on ? 'REMOVE MASK [X]' : 'MASK [X]', x + w / 2, y + 24);
      }
    }

    if (!s.camUp && !s.powerOut && !s.mask.on) {
      ctx.textAlign = 'center';
      const fx = OFFICE.paper[0] + 75 - s.scroll;
      if (fx > 0 && fx < W && !s.fold.active) {
        ctx.fillStyle = 'rgba(240,230,210,.55)'; ctx.font = '20px VT323, monospace';
        ctx.fillText('hold F to fold', fx, OFFICE.paper[1] - 8);
      }
    }
    if (s.cardinal.phase === 'cage' && s.cardinal.box < 35 && Math.floor(s.time * 3) % 2 && !s.powerOut) {
      ctx.fillStyle = '#ff5a4a'; ctx.font = '40px VT323, monospace'; ctx.textAlign = 'right';
      ctx.fillText('♪ !', W - 30, 130);
    }
    if (s.sub.active) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(14, 14, 156, 40);
      ctx.strokeStyle = '#8a2b2b'; ctx.strokeRect(14, 14, 156, 40);
      ctx.fillStyle = '#efe6d3'; ctx.font = '26px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillText('MUTE CALL [M]', 92, 42);
    }
    if (s.time < 4) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(1 - (s.time - 2.5) / 1.5, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(239,233,218,${clamp(1 - (s.time - 2.5) / 1.5, 0, 1)})`;
      ctx.textAlign = 'center'; ctx.font = '72px VT323, monospace';
      ctx.fillText('12:00 AM', W / 2, H / 2 - 10);
      ctx.font = '40px VT323, monospace';
      ctx.fillText(s.night === 0 ? 'Custom Night' : s.wise ? 'Wise Night' : `${['', '1st', '2nd', '3rd', '4th', '5th', '6th'][s.night]} Night`, W / 2, H / 2 + 40);
    }
    ctx.restore();
  }

  function renderWin() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const k = clamp(s.winT / 2.5, 0, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, H / 2 - 60, W, 120); ctx.clip();
    ctx.fillStyle = '#efe9da'; ctx.font = '120px VT323, monospace'; ctx.textAlign = 'center';
    const off = k * 120;
    ctx.fillText('5', W / 2 - 60, H / 2 + 40 - off);
    ctx.fillText('6', W / 2 - 60, H / 2 + 160 - off);
    ctx.fillText('AM', W / 2 + 60, H / 2 + 40);
    ctx.restore();
    for (let i = 0; i < 14; i++) {
      const x = (i * 97 + s.winT * 30) % W, y = (s.winT * 40 + i * 63) % H;
      Sprites.paperCrane(ctx, x, y, 1.2, Math.sin(s.winT + i) * 0.3, `rgba(240,234,220,${0.15 + (i % 3) * 0.08})`);
    }
    if (s.winT > 3) {
      ctx.fillStyle = `rgba(200,190,170,${clamp(s.winT - 3, 0, 1)})`; ctx.font = '30px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillText(s.folded ? `You folded ${s.folded} crane${s.folded === 1 ? '' : 's'} tonight.` : 'The birds return to their perches.', W / 2, H / 2 + 120);
    }
  }

  function debugStep(secs) {
    for (let t = 0; t < secs && running; t += 1 / 60) update(1 / 60);
    if (running) render();
  }

  return { init, start, stop, get state() { return s; }, DEATH, debugStep: params.has('debug') ? debugStep : undefined };
})();
