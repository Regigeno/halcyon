// Required overtime shifts, worked between story nights. Each is haunted by one bird.
const Overtime = (() => {
  const W = 1280, H = 720;
  const { rg, lg, ell, poly } = Sprites;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * clamp(k, 0, 1);

  let canvas, ctx, game = null, onDone = null, last = 0, running = false, endT = 0, task = null;
  const held = {};

  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  }

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
    canvas.addEventListener('mousedown', e => {
      if (!running || !game || game.over) return;
      held.mouse = true;
      game.click && game.click(...toStage(e));
    });
    canvas.addEventListener('mousemove', e => { if (running && game && !game.over && game.mouse) game.mouse(...toStage(e)); });
    window.addEventListener('mouseup', () => { held.mouse = false; });
    window.addEventListener('keydown', e => {
      if (!running || !game) return;
      if (e.code === 'Space') e.preventDefault();
      held[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'Escape' && !game.over) { game.left = true; end(false, 'You walk away. The work will still be here tomorrow.'); return; }
      if (!game.over && game.key) game.key(e.code);
    });
    window.addEventListener('keyup', e => { held[e.code] = false; });
  }

  function run(id, info, done) {
    task = info;
    Object.keys(held).forEach(k => { held[k] = false; });
    game = MINI[id]();
    Object.assign(game, { t: 0, over: false, caught: false, left: false, threat: 0, shown: 0 });
    onDone = done;
    endT = 0;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function end(success, text) {
    if (game.over) return;
    game.over = true;
    game.success = success;
    game.result = text;
    Sfx.heartbeat(false);
    Sfx.printer(false);
  }

  function claim(delay = 0) {
    if (game.over || game.claimT != null) return;
    game.claimT = delay;
  }

  function loop(now) {
    if (!running) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    step(dt);
    draw();
    if (game.over && endT > (game.caught ? 3.2 : 2.6)) {
      running = false;
      onDone({ success: !!game.success, caught: game.caught, left: game.left });
      return;
    }
    requestAnimationFrame(loop);
  }

  function step(dt) {
    game.t += dt;
    if (game.over) { endT += dt; return; }
    if (game.claimT != null) {
      game.claimT -= dt;
      if (game.claimT <= 0) { end(false, ''); game.caught = true; Sfx.play.scream(); }
      return;
    }
    game.update(dt);
    if (game.stalker) updateStalker(dt);
  }

  // ---- A bird creeping in from the edge as `threat` rises (used by the tapes) ----
  function threaten(amount) { if (!game.over) game.threat = clamp(game.threat + amount, 0, 1); }
  function updateStalker(dt) {
    const pan = game.stalker.side * 0.7;
    game.shown += (game.threat - game.shown) * Math.min(1, dt * 4);
    if (game.threat >= 0.5 && !game.warned) { game.warned = 1; game.stalker.warn(pan); }
    if (game.threat >= 0.8 && game.warned === 1) { game.warned = 2; game.stalker.warn(pan); Sfx.play.wings(pan, 0.3, 3); }
    if (game.threat < 0.4) game.warned = 0;
    Sfx.heartbeat(game.threat > 0.6, 1 + game.threat);
    if (game.threat >= 1) claim(0);
  }
  function drawStalker(c) {
    const st = game.stalker, k = game.shown;
    if (k < 0.02) return;
    const edge = st.side < 0 ? 0 : W;
    const x = edge - st.side * (-60 + k * 230);
    c.save();
    c.globalAlpha = clamp(k * 1.6, 0, 1);
    const eyes = Sprites.draw(c, task.bird, x, H + st.lift, st.scale * (0.55 + k * 0.6), { t: game.t, fury: k, flip: st.side > 0 });
    c.restore();
    c.fillStyle = lg(c, edge, 0, edge - st.side * 420, 0, [[0, `rgba(0,0,0,${0.75 - k * 0.55})`], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(st.side < 0 ? 0 : W - 420, 0, 420, H);
    Sprites.drawEyes(c, eyes, 0.25 + k * 0.9);
    if (k > 0.55) {
      c.fillStyle = rg(c, W / 2, H / 2, 260, 820, [[0, 'rgba(0,0,0,0)'], [1, `rgba(90,0,0,${(k - 0.55) * 0.7 * (0.8 + Math.sin(game.t * 9) * 0.2)})`]]);
      c.fillRect(0, 0, W, H);
    }
  }

  function draw() {
    if (game.caught && endT < 1.1) {
      Scenes.drawJumpscare(ctx, { time: game.t }, task.bird, endT);
      return;
    }
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#14110d'], [1, '#050404']]);
    ctx.fillRect(0, 0, W, H);
    game.render(ctx);
    if (game.stalker) drawStalker(ctx);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a2b2b'; ctx.font = '24px VT323, monospace';
    ctx.fillText(`OVERTIME ${task.ot}  -  6:10 AM`, 40, 46);
    ctx.fillStyle = '#efe6d3'; ctx.font = '44px Special Elite, Georgia, serif';
    ctx.fillText(task.name, 40, 92);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7a7266'; ctx.font = '22px VT323, monospace';
    ctx.fillText('ESC to walk away', W - 40, 46);
    if (game.over) {
      ctx.fillStyle = `rgba(0,0,0,${game.caught ? 1 : Math.min(0.78, endT * 1.2)})`; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = game.success ? '#cfe8c0' : '#f0a090';
      ctx.font = '76px Special Elite, Georgia, serif';
      ctx.fillText(game.caught ? 'CLAIMED' : game.success ? 'SHIFT OVER' : 'NOT TONIGHT', W / 2, H / 2 - 10);
      ctx.fillStyle = '#efe6d3'; ctx.font = '30px VT323, monospace';
      ctx.fillText(game.caught ? task.threat : game.result || '', W / 2, H / 2 + 44);
    }
  }

  function instructions(c, text) {
    c.textAlign = 'center'; c.fillStyle = '#b9ad94'; c.font = '26px VT323, monospace';
    c.fillText(text, W / 2, H - 22);
  }
  function label(c, text, x, y, size = 30, color = '#efe6d3', align = 'center') {
    c.textAlign = align; c.fillStyle = color; c.font = `${size}px VT323, monospace`; c.fillText(text, x, y);
  }

  const MINI = {
    // ================= OT1: SIMON SAYS (the Cardinal) =================
    // A colored panel inside the Cardinal's open chest. One wrong press, or a long silence, is fatal.
    simon() {
      const COLORS = [['#b8241e', '#ff7a6a'], ['#1f56b8', '#86b6ff'], ['#c8961a', '#fff0a0'], ['#1f8a3c', '#9af0a8'], ['#7a2cc0', '#dcb0ff'], ['#b8b8b0', '#ffffff']];
      const NOTES = [64, 67, 71, 74, 60, 77];
      const STAGES = [
        { buttons: 4, from: 3, to: 8, beat: 0.62 },
        { buttons: 4, from: 3, to: 8, beat: 0.52 },
        { buttons: 6, from: 3, to: 8, beat: 0.52 },
        { buttons: 6, from: 4, to: 9, beat: 0.44 },
      ];
      const IDLE_LIMIT = 5;
      const HATCH = { x: W / 2 - 280, y: 262, w: 560, h: 360 };
      const g = { stage: 0, seq: [], len: 0, mode: 'intro', timer: 3.2, idx: 0, lit: -1, litT: 0, idle: 0, wrong: -1, hatch: 0, whistled: false };
      const cfg = () => STAGES[g.stage];
      const newStage = () => {
        const st = cfg();
        g.seq = []; g.len = st.from;
        while (g.seq.length < st.to) g.seq.push(Math.floor(Math.random() * st.buttons));
      };
      newStage();
      const btn = i => {
        const n = cfg().buttons, cols = n === 4 ? 2 : 3, rows = 2;
        const cw = HATCH.w / cols, ch = HATCH.h / rows;
        const c = i % cols, r = Math.floor(i / cols);
        return { x: HATCH.x + cw * (c + 0.5), y: HATCH.y + ch * (r + 0.5), r: Math.min(cw, ch) * 0.36 };
      };
      const press = i => {
        if (g.mode !== 'input' || i >= cfg().buttons) return;
        g.lit = i; g.litT = 0.25; g.idle = 0; g.whistled = false;
        if (i !== g.seq[g.idx]) {
          g.wrong = i;
          Sfx.play.buzz();
          g.mode = 'dead';
          claim(0.45);
          return;
        }
        Sfx.play.note(NOTES[i], 0.32);
        g.idx++;
        if (g.idx >= g.len) {
          if (g.len >= cfg().to) {
            g.stage++;
            if (g.stage >= STAGES.length) { end(true, 'The panel clicks shut. The Cardinal hums, wound and content.'); return; }
            g.mode = 'stage'; g.timer = 3.4; Sfx.play.pickup();
            newStage();
          } else { g.len++; g.mode = 'wait'; g.timer = 1.1; }
        }
      };
      g.click = (x, y) => {
        for (let i = 0; i < cfg().buttons; i++) { const b = btn(i); if (Math.hypot(x - b.x, y - b.y) < b.r) return press(i); }
      };
      g.key = code => { const m = code.match(/^(Digit|Numpad)([1-6])$/); if (m) press(+m[2] - 1); };
      g.update = dt => {
        g.hatch = Math.min(1, g.hatch + dt * 0.8);
        g.litT = Math.max(0, g.litT - dt);
        if (!g.litT && g.mode !== 'dead') g.lit = -1;
        if (g.mode === 'intro' || g.mode === 'stage' || g.mode === 'wait') {
          g.timer -= dt;
          if (g.mode === 'stage' && g.timer < 1.6 && g.timer + dt >= 1.6) Sfx.play.ratchet(0, 0.4);
          if (g.timer <= 0) { g.mode = 'show'; g.idx = 0; g.timer = 0.3; }
        } else if (g.mode === 'show') {
          g.timer -= dt;
          if (g.timer <= 0) {
            if (g.idx >= g.len) { g.mode = 'input'; g.idx = 0; g.idle = 0; g.lit = -1; return; }
            g.lit = g.seq[g.idx]; g.litT = cfg().beat * 0.7;
            Sfx.play.note(NOTES[g.lit], 0.3);
            g.idx++; g.timer = cfg().beat;
          }
        } else if (g.mode === 'input') {
          g.idle += dt;
          if (g.idle > IDLE_LIMIT - 1.6 && !g.whistled) { g.whistled = true; Sfx.play.whistle(0, 0.25); }
          if (g.idle > IDLE_LIMIT) { g.mode = 'dead'; claim(0.2); }
        }
      };
      g.render = c => {
        // feathered chest filling the view
        c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#3a0806'], [0.5, '#6a1410'], [1, '#2a0504']]);
        c.fillRect(0, 0, W, H);
        for (let row = 0; row < 16; row++) for (let col = 0; col < 24; col++) {
          const x = col * 60 + (row % 2) * 30, y = 110 + row * 40;
          c.fillStyle = `rgba(${150 + ((row * 7 + col * 3) % 40)},20,16,.55)`;
          c.beginPath(); c.arc(x, y, 34, 0, Math.PI); c.fill();
          c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 34, 0.2, Math.PI - 0.2); c.stroke();
        }
        // the head looking down from above
        const eyes = Sprites.draw(c, 'cardinal', W / 2, 760, 2.1, { t: g.t, look: 0 });
        c.fillStyle = lg(c, 0, 600, 0, H, [[0, 'rgba(58,8,6,0)'], [0.35, '#3a0806'], [1, '#1a0302']]);
        c.fillRect(0, 600, W, H - 600);
        c.fillStyle = lg(c, 0, 0, 0, H, [[0, 'rgba(0,0,0,0)'], [0.32, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]);
        c.fillRect(0, 0, W, H);
        // hatch
        const k = g.hatch * g.hatch * (3 - 2 * g.hatch);
        const pad = 26;
        c.fillStyle = '#120806'; c.fillRect(HATCH.x - pad, HATCH.y - pad, HATCH.w + pad * 2, HATCH.h + pad * 2);
        c.strokeStyle = '#c9a43a'; c.lineWidth = 6; c.strokeRect(HATCH.x - pad, HATCH.y - pad, HATCH.w + pad * 2, HATCH.h + pad * 2);
        for (let i = 0; i < 4; i++) {
          const rx = i % 2 ? HATCH.x + HATCH.w + pad - 10 : HATCH.x - pad + 10, ry = i < 2 ? HATCH.y - pad + 10 : HATCH.y + HATCH.h + pad - 10;
          ell(c, rx, ry, 5, 5); c.fillStyle = '#e0c060'; c.fill();
        }
        c.fillStyle = 'rgba(255,200,120,.05)';
        for (let i = 0; i < 8; i++) c.fillRect(HATCH.x, HATCH.y + i * 45, HATCH.w, 2);
        for (let i = 0; i < cfg().buttons; i++) {
          const b = btn(i), on = g.lit === i, bad = g.wrong === i;
          const [base, glow] = COLORS[i];
          ell(c, b.x, b.y + 8, b.r + 10, b.r + 10); c.fillStyle = '#050202'; c.fill();
          ell(c, b.x, b.y, b.r + 6, b.r + 6); c.fillStyle = '#6a5020'; c.fill();
          c.fillStyle = rg(c, b.x - b.r * 0.3, b.y - b.r * 0.35, 2, b.r * 1.4, [[0, on || bad ? '#fff' : glow], [0.3, on ? glow : base], [1, '#000']]);
          ell(c, b.x, b.y, b.r, b.r); c.fill();
          if (on) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, b.x, b.y, 4, b.r * 2.4, [[0, glow], [1, 'rgba(0,0,0,0)']]); ell(c, b.x, b.y, b.r * 2.4, b.r * 2.4); c.fill(); c.restore(); }
          if (bad) { c.strokeStyle = '#ff2a1a'; c.lineWidth = 6; ell(c, b.x, b.y, b.r + 10, b.r + 10); c.stroke(); }
          label(c, String(i + 1), b.x, b.y + b.r + 30, 24, '#d8c49a');
        }
        // hatch doors swinging open
        if (k < 1) {
          const dw = (HATCH.w / 2 + pad) * (1 - k);
          c.fillStyle = '#7a1612';
          c.fillRect(HATCH.x - pad, HATCH.y - pad, dw, HATCH.h + pad * 2);
          c.fillRect(HATCH.x + HATCH.w + pad - dw, HATCH.y - pad, dw, HATCH.h + pad * 2);
        }
        const danger = g.mode === 'input' ? clamp((g.idle - 2.5) / (IDLE_LIMIT - 2.5), 0, 1) : g.mode === 'dead' ? 1 : 0;
        Sprites.drawEyes(c, eyes, 0.5 + g.stage * 0.15 + danger * 0.6);
        if (danger > 0) {
          c.fillStyle = rg(c, W / 2, H / 2, 300, 800, [[0, 'rgba(0,0,0,0)'], [1, `rgba(120,0,0,${danger * 0.6 * (0.8 + Math.sin(g.t * 12) * 0.2)})`]]);
          c.fillRect(0, 0, W, H);
        }
        const st = cfg();
        const status = g.mode === 'input' ? `Repeat it  (${g.idx} / ${g.len})` : g.mode === 'stage' ? 'Panel cleared. The wiring shifts...' : g.mode === 'intro' ? 'The chest opens...' : 'Watch...';
        c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(W / 2 - 330, 196, 660, 40);
        label(c, `Panel ${g.stage + 1} of ${STAGES.length}   -   ${status}`, W / 2, 226, 32);
        instructions(c, `Click the buttons or press 1-${st.buttons}. One wrong press is fatal. Do not hesitate.`);
      };
      return g;
    },

    // ================= OT2: TEST THE ARCADE (the Eagle) =================
    // Play SKY KEEPER to 5,500 while the Eagle walks up behind you. SPACE turns and flashes.
    arcade() {
      const TARGET = 5500, SCR = { x: 420, y: 150, w: 440, h: 380 };
      const g = {
        score: 0, px: SCR.w / 2, vx: 0, items: [], pops: [], spawnT: 1, stunT: 0, elapsed: 0, stars: [],
        turn: 'none', turnT: 0, cooldown: 0, flashT: 0, flashedStage: 0,
        eagle: { stage: 0, t: rand(6, 9), behindT: 0 },
        mouseX: null,
      };
      for (let i = 0; i < 40; i++) g.stars.push([Math.random() * SCR.w, Math.random() * SCR.h, Math.random()]);
      const progress = () => clamp(g.score / TARGET, 0, 1);
      const turnK = () => {
        if (g.turn === 'out') return clamp(g.turnT / 0.28, 0, 1);
        if (g.turn === 'hold') return 1;
        if (g.turn === 'back') return 1 - clamp(g.turnT / 0.28, 0, 1);
        return 0;
      };
      const turnAround = () => {
        if (g.turn !== 'none' || g.cooldown > 0) return;
        g.turn = 'out'; g.turnT = 0;
        Sfx.play.flash();
      };
      g.key = code => { if (code === 'Space') turnAround(); };
      g.click = (x, y) => { if (y > SCR.y + SCR.h + 60) turnAround(); };
      g.mouse = x => { g.mouseX = x; };
      const spawn = () => {
        const r = Math.random();
        const kind = r < 0.17 ? 'lead' : r < 0.29 ? 'gold' : 'crane';
        g.items.push({ kind, x: rand(24, SCR.w - 24), y: -20, spin: rand(-1, 1) });
      };
      g.update = dt => {
        g.elapsed += dt;
        g.cooldown = Math.max(0, g.cooldown - dt);
        g.flashT = Math.max(0, g.flashT - dt * 1.6);
        // turning around
        if (g.turn !== 'none') {
          g.turnT += dt;
          if (g.turn === 'out' && g.turnT >= 0.32) {
            g.turn = 'hold'; g.turnT = 0; g.flashT = 1; g.cooldown = 2;
            g.flashedStage = g.eagle.stage;
            if (g.eagle.stage > 0) {
              Sfx.play.screech(0, 0.12 + g.eagle.stage * 0.05);
              g.eagle.stage = 0; g.eagle.behindT = 0;
              g.eagle.t = rand(5, 8) * (1 - progress() * 0.4);
              Sfx.heartbeat(false);
            }
          } else if (g.turn === 'hold' && g.turnT >= 0.5) { g.turn = 'back'; g.turnT = 0; }
          else if (g.turn === 'back' && g.turnT >= 0.28) { g.turn = 'none'; }
        }
        // the Eagle walks up behind you while you face the cabinet
        const e = g.eagle;
        if (g.turn === 'none' || g.turn === 'back') {
          if (e.stage < 4) {
            e.t -= dt;
            if (e.t <= 0) {
              e.stage++;
              e.t = rand(4.5, 7.5) * (1 - progress() * 0.4);
              Sfx.play.step(rand(-0.15, 0.15), 0.06 + e.stage * 0.07);
              if (e.stage >= 3) setTimeout(() => running && game === g && Sfx.play.step(0, 0.08 + e.stage * 0.06), 380);
              if (e.stage === 4) { e.behindT = lerp(2.4, 1.7, progress()); Sfx.play.screech(0, 0.08); Sfx.heartbeat(true, 1.6); }
            }
          } else {
            e.behindT -= dt;
            if (e.behindT <= 0) claim(0.05);
          }
        }
        // the cabinet game keeps running whether you watch it or not
        const speed = Math.min(330, 130 + g.elapsed * 1.3);
        const left = held.KeyA || held.ArrowLeft, right = held.KeyD || held.ArrowRight;
        g.vx = right ? 1 : left ? -1 : 0;
        if (g.stunT > 0) g.stunT -= dt;
        else if (left || right) { g.px += (right ? 1 : -1) * 420 * dt; g.mouseX = null; }
        else if (g.mouseX != null && turnK() === 0) g.px += clamp(g.mouseX - SCR.x - g.px, -420 * dt, 420 * dt);
        g.px = clamp(g.px, 30, SCR.w - 30);
        g.spawnT -= dt;
        if (g.spawnT <= 0) { spawn(); g.spawnT = Math.max(0.55, 1.15 - g.elapsed * 0.003) * rand(0.8, 1.2); }
        for (const it of g.items) {
          it.y += speed * dt * (it.kind === 'lead' ? 1.15 : 1);
          if (!it.done && it.y > SCR.h - 52 && it.y < SCR.h - 20 && Math.abs(it.x - g.px) < 44) {
            it.done = true;
            if (it.kind === 'lead') { g.score = Math.max(0, g.score - 200); g.stunT = 0.5; Sfx.play.chip(140, 0.3, 'sawtooth', 0.12, 60); g.pops.push({ x: it.x, y: it.y, txt: '-200', t: 0, bad: true }); }
            else {
              const v = it.kind === 'gold' ? 120 : 40;
              g.score += v;
              Sfx.play.chip(it.kind === 'gold' ? 1320 : 880, 0.07, 'square', 0.08, it.kind === 'gold' ? 1760 : 1175);
              g.pops.push({ x: it.x, y: it.y, txt: '+' + v, t: 0 });
            }
          }
        }
        g.items = g.items.filter(it => !it.done && it.y < SCR.h + 30);
        for (const p of g.pops) p.t += dt;
        g.pops = g.pops.filter(p => p.t < 0.8);
        if (g.score >= TARGET) {
          Sfx.heartbeat(false);
          [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => Sfx.play.chip(f, 0.15, 'square', 0.1), i * 110));
          end(true, `HIGH SCORE: ${g.score}. Behind you, footsteps walk away.`);
        }
      };
      const drawScreen = c => {
        c.save();
        c.beginPath(); c.rect(SCR.x, SCR.y, SCR.w, SCR.h); c.clip();
        c.translate(SCR.x, SCR.y);
        c.fillStyle = lg(c, 0, 0, 0, SCR.h, [[0, '#0a0a2a'], [1, '#1a1040']]); c.fillRect(0, 0, SCR.w, SCR.h);
        for (const [sx, sy, b] of g.stars) { c.fillStyle = `rgba(255,255,255,${0.2 + b * 0.5})`; c.fillRect(sx, (sy + g.elapsed * 20 * (0.3 + b)) % SCR.h, 2, 2); }
        for (const it of g.items) {
          if (it.kind === 'lead') {
            c.fillStyle = '#3a3a44'; c.beginPath(); c.moveTo(it.x - 14, it.y + 12); c.lineTo(it.x + 14, it.y + 12); c.lineTo(it.x + 9, it.y - 12); c.lineTo(it.x - 9, it.y - 12); c.fill();
            c.fillStyle = '#c03030'; c.font = '14px VT323, monospace'; c.textAlign = 'center'; c.fillText('A', it.x, it.y + 6);
          } else {
            Sprites.paperCrane(c, it.x, it.y, 1.6, Math.sin(g.elapsed * 3 + it.spin) * 0.3, it.kind === 'gold' ? '#ffd24a' : '#f4efe2');
          }
        }
        const by = SCR.h - 34, stun = g.stunT > 0 && Math.floor(g.elapsed * 20) % 2;
        c.fillStyle = stun ? '#ff5a4a' : '#4ad0ff';
        c.fillRect(g.px - 40, by, 80, 10); c.fillRect(g.px - 40, by - 16, 8, 16); c.fillRect(g.px + 32, by - 16, 8, 16);
        for (const p of g.pops) { c.fillStyle = p.bad ? `rgba(255,90,80,${1 - p.t})` : `rgba(255,240,160,${1 - p.t})`; c.font = '22px VT323, monospace'; c.textAlign = 'center'; c.fillText(p.txt, p.x, p.y - p.t * 40); }
        c.fillStyle = '#fff'; c.font = '26px VT323, monospace'; c.textAlign = 'left';
        c.fillText(`SCORE ${String(g.score).padStart(5, '0')}`, 12, 28);
        c.textAlign = 'right'; c.fillStyle = '#ffd24a'; c.fillText(`GOAL ${TARGET}`, SCR.w - 12, 28);
        // reflection of what stands behind you
        const refl = [0, 0.03, 0.08, 0.16, 0.3][g.eagle.stage];
        if (refl) {
          c.globalAlpha = refl * (0.85 + Math.sin(g.elapsed * 7) * 0.15);
          const eyes = Sprites.draw(c, 'eagle', SCR.w * 0.62, SCR.h + 150 - g.eagle.stage * 20, 0.35 + g.eagle.stage * 0.12, { t: g.elapsed, fury: 0.6 });
          c.globalAlpha = 1;
          Sprites.drawEyes(c, eyes, refl * 2.2);
        }
        c.fillStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(160, 0); c.lineTo(0, 200); c.fill();
        c.globalAlpha = 0.18; c.drawImage(Scenes.cache.scan, 0, 0, SCR.w, SCR.h); c.globalAlpha = 1;
        c.restore();
      };
      const drawFront = c => {
        c.fillStyle = '#050407'; c.fillRect(0, 0, W, H);
        c.fillStyle = rg(c, W / 2, 340, 40, 620, [[0, 'rgba(60,40,120,.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        // cabinet body
        c.fillStyle = '#16121e';
        poly(c, [[400, 60], [880, 60], [960, 720], [320, 720]]); c.fill();
        c.fillStyle = '#231b34'; poly(c, [[370, 60], [400, 60], [320, 720], [280, 720]]); c.fill(); poly(c, [[880, 60], [910, 60], [1000, 720], [960, 720]]); c.fill();
        // marquee
        c.fillStyle = lg(c, 0, 70, 0, 130, [[0, '#ffcf4a'], [1, '#c0661a']]); c.fillRect(420, 72, 440, 58);
        c.fillStyle = '#2a0e00'; c.font = '50px VT323, monospace'; c.textAlign = 'center'; c.fillText('SKY KEEPER', W / 2, 118);
        c.fillStyle = '#000'; c.fillRect(SCR.x - 14, SCR.y - 14, SCR.w + 28, SCR.h + 28);
        drawScreen(c);
        // control panel
        c.fillStyle = '#2a2236'; poly(c, [[360, SCR.y + SCR.h + 20], [920, SCR.y + SCR.h + 20], [950, 640], [330, 640]]); c.fill();
        c.fillStyle = '#111'; ell(c, 520, 600, 22, 10); c.fill(); c.fillStyle = '#c03030'; ell(c, 520 + clamp(g.vx, -1, 1) * 6, 580, 14, 14); c.fill();
        [[700, '#e03a3a'], [760, '#3ab0e0'], [820, '#e0c03a']].forEach(([bx, col]) => { ell(c, bx, 596, 18, 12); c.fillStyle = col; c.fill(); });
        c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, 280, H); c.fillRect(1000, 0, 280, H);
      };
      const drawBack = c => {
        c.fillStyle = '#040305'; c.fillRect(0, 0, W, H);
        c.fillStyle = lg(c, 0, 380, 0, H, [[0, '#0c0a10'], [1, '#1a1620']]); c.fillRect(0, 380, W, H - 380);
        for (let i = 0; i < 5; i++) {
          const x = 120 + i * 260, s = 0.6;
          c.fillStyle = '#0e0c14'; c.fillRect(x, 250, 120 * s + 40, 220);
          c.fillStyle = `rgba(${[80, 40, 120, 60, 30][i]},${[40, 90, 60, 30, 80][i]},140,.35)`; c.fillRect(x + 14, 270, 80, 60);
        }
        const st = g.flashT > 0 ? g.flashedStage : g.eagle.stage;
        if (st > 0) {
          const pos = [null, [640, 450, 0.32], [610, 540, 0.5], [660, 650, 0.74], [640, 820, 1.05]][st];
          const e = Sprites.draw(c, 'eagle', pos[0], pos[1], pos[2], { t: g.t, fury: g.flashT > 0 ? 1 : 0.5, pose: g.flashT > 0 ? 'attack' : undefined });
          c.fillStyle = `rgba(0,0,0,${0.9 - g.flashT * 0.85})`; c.fillRect(0, 0, W, H);
          Sprites.drawEyes(c, e, 0.6 + st * 0.15);
        } else {
          c.fillStyle = `rgba(0,0,0,${0.9 - g.flashT * 0.85})`; c.fillRect(0, 0, W, H);
        }
        if (g.flashT > 0) { c.fillStyle = `rgba(255,255,250,${g.flashT * g.flashT * 0.9})`; c.fillRect(0, 0, W, H); }
      };
      g.render = c => {
        const k = turnK(), e = k * k * (3 - 2 * k);
        c.save(); c.translate(-e * W, 0); drawFront(c); c.restore();
        if (e > 0) { c.save(); c.translate(W - e * W, 0); drawBack(c); c.restore(); }
        // HUD
        const ready = g.cooldown <= 0 && g.turn === 'none';
        c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(W / 2 - 170, H - 92, 340, 38);
        c.fillStyle = ready ? '#f4f0d8' : '#6a6458'; c.fillRect(W / 2 - 166, H - 88, 332 * (1 - g.cooldown / 2), 30);
        label(c, ready ? 'TURN + FLASH  [SPACE]' : 'FLASH CHARGING', W / 2, H - 64, 26, ready ? '#1a1610' : '#efe6d3');
        label(c, `${g.score} / ${TARGET}`, W - 40, 92, 34, '#ffd24a', 'right');
        instructions(c, 'A / D or mouse to catch cranes. Avoid lead weights. Listen behind you.');
      };
      return g;
    },

    // ================= OT3: PRINT FLYERS (the Dove) =================
    // Hold to run the press. A faint coo or flutter under the noise means: stop, and stay stopped.
    flyers() {
      const GOAL = 300, SHEET = 0.45, GRACE = 1.6;
      const g = { printed: 0, printing: false, sheetT: 0, roll: 0, shake: 0, nextVisit: rand(9, 14), visit: null, sheets: [], feather: null };
      const progress = () => g.printed / GOAL;
      const lever = [1010, 330, 120, 260];
      const holding = () => held.Space || (held.mouse && g.leverHeld);
      g.click = (x, y) => { g.leverHeld = x >= lever[0] && x <= lever[0] + lever[2] && y >= lever[1] && y <= lever[1] + lever[3]; };
      g.update = dt => {
        if (!held.mouse) g.leverHeld = false;
        const want = holding();
        if (want !== g.printing) { g.printing = want; Sfx.printer(want); }
        if (g.printing) {
          g.roll += dt * 9; g.shake = 1;
          g.sheetT += dt;
          while (g.sheetT >= SHEET) {
            g.sheetT -= SHEET; g.printed++;
            g.sheets.push({ t: 0, r: rand(-0.08, 0.08) });
          }
          if (!g.visit) g.nextVisit -= dt;
        } else g.shake = Math.max(0, g.shake - dt * 4);
        for (const s of g.sheets) s.t += dt;
        g.sheets = g.sheets.filter(s => s.t < 0.5);
        if (!g.visit && g.nextVisit <= 0) {
          g.visit = { phase: 'grace', t: GRACE };
          const gain = lerp(0.12, 0.06, progress()), pan = rand(-0.8, 0.8);
          if (Math.random() < 0.5) Sfx.play.coo(pan, gain); else Sfx.play.wings(pan, gain * 0.9, 3);
          g.feather = { x: rand(380, 900), y: 120, t: 0 };
        }
        if (g.feather) { g.feather.t += dt; g.feather.y += dt * 40; if (g.feather.t > 5) g.feather = null; }
        const v = g.visit;
        if (v) {
          v.t -= dt;
          if (v.phase === 'grace' && v.t <= 0) { v.phase = 'present'; v.t = rand(2.5, 4); }
          else if (v.phase === 'present') {
            if (g.printing) { claim(0.15); return; }
            if (v.t <= 0) { g.visit = null; g.nextVisit = rand(9, 16) * (1 - progress() * 0.3); }
          }
        }
        if (g.printed >= GOAL) { Sfx.printer(false); end(true, 'Three hundred flyers. GRAND REOPENING. Something soft settles in the rafters.'); }
      };
      const flyer = (c, x, y, s, r) => {
        c.save(); c.translate(x, y); c.rotate(r); c.scale(s, s);
        c.fillStyle = '#f2ead6'; c.fillRect(-60, -80, 120, 160);
        c.fillStyle = '#8a1a14'; c.font = 'bold 18px Georgia'; c.textAlign = 'center'; c.fillText('HALCYON', 0, -54);
        c.fillStyle = '#3a2a1a'; c.font = '11px Georgia'; c.fillText('GRAND REOPENING', 0, -38);
        Sprites.paperCrane(c, 0, 4, 1.6, 0, '#c8b890');
        c.fillStyle = '#5a4a3a'; c.font = '9px Georgia'; c.fillText('Peace of mind, guaranteed.', 0, 62);
        c.restore();
      };
      g.render = c => {
        const sx = g.shake ? rand(-2, 2) : 0;
        c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#14120e'], [1, '#080706']]); c.fillRect(0, 0, W, H);
        c.fillStyle = '#1a1712'; c.fillRect(0, 520, W, 200);
        for (let i = 0; i < 6; i++) { c.fillStyle = '#100e0b'; c.fillRect(i * 230, 60, 20, 460); }
        // lamp
        const sway = Math.sin(g.t * 0.7) * 0.06;
        c.save(); c.translate(640, 0); c.rotate(sway);
        c.strokeStyle = '#333'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 64); c.stroke();
        c.fillStyle = '#3a3a30'; poly(c, [[-40, 94], [40, 94], [20, 64], [-20, 64]]); c.fill();
        c.restore();
        c.fillStyle = rg(c, 640 + sway * 400, 110, 20, 560, [[0, 'rgba(255,220,160,.22)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
        // the press
        c.save(); c.translate(sx, 0);
        c.fillStyle = '#2c2a26'; c.fillRect(300, 260, 640, 280);
        c.fillStyle = '#3c3a34'; c.fillRect(320, 280, 600, 90);
        for (let i = 0; i < 3; i++) {
          const rx = 400 + i * 220;
          ell(c, rx, 325, 38, 38); c.fillStyle = '#1a1a18'; c.fill();
          c.save(); c.translate(rx, 325); c.rotate(g.roll * (i % 2 ? -1 : 1));
          c.strokeStyle = '#8a8070'; c.lineWidth = 4; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(32, 0); c.stroke(); }
          c.restore();
        }
        c.fillStyle = '#1e1c18'; c.fillRect(340, 390, 560, 30);
        c.fillStyle = '#c9a43a'; c.font = '20px VT323, monospace'; c.textAlign = 'center'; c.fillText('AQUILA PRINTING CO. - MODEL 9', 620, 470);
        for (const s of g.sheets) flyer(c, 620, 400 + s.t * 220, 0.7, s.r);
        c.restore();
        // output stack
        const stack = Math.min(40, Math.floor(g.printed / 8));
        for (let i = 0; i < stack; i++) { c.fillStyle = i % 2 ? '#e2dac6' : '#f2ead6'; c.fillRect(530 + (i % 3), 640 - i * 2, 180, 6); }
        flyer(c, 180, 420, 1.1, -0.06);
        // lever
        const down = g.printing ? 1 : 0;
        c.fillStyle = '#2a2824'; c.fillRect(lever[0] + 40, lever[1] + 100, 40, 160);
        c.save(); c.translate(lever[0] + 60, lever[1] + 140); c.rotate(-0.6 + down * 1.2);
        c.fillStyle = '#8a8070'; c.fillRect(-6, -110, 12, 110);
        ell(c, 0, -116, 22, 22); c.fillStyle = '#b02a20'; c.fill();
        c.restore();
        label(c, 'HOLD', lever[0] + 60, lever[1] + 290, 22, '#9a9488');
        if (g.feather) {
          c.save(); c.globalAlpha = Math.min(0.35, (5 - g.feather.t) * 0.2);
          c.translate(g.feather.x + Math.sin(g.feather.t * 2) * 30, g.feather.y); c.rotate(Math.sin(g.feather.t) * 0.6);
          c.fillStyle = '#f4f4f0'; ell(c, 0, 0, 10, 3); c.fill(); c.restore();
        }
        label(c, `Flyers: ${g.printed} / ${GOAL}`, W / 2, 150, 36);
        label(c, g.printing ? 'PRINTING...' : 'press idle', W / 2, 186, 26, g.printing ? '#d9c48a' : '#6a6458');
        instructions(c, 'Hold SPACE or the lever to print. If you hear her over the press, let go and wait.');
      };
      return g;
    },

    // ================= OT4: REVIEW THE TAPES (the Raven) =================
    // Footage plays live; eyes appear in one tape for a moment. Mark it. Mistakes call the Raven.
    tapes() {
      const ROUNDS = 24, AREA = { x: 150, y: 132, w: 980, h: 520 };
      const g = { round: 0, correct: 0, thumbs: [], cells: [], answer: 0, rt: 0, appear: 0, window: 2, eye: null, state: 'play', reveal: 0, picked: -1, cams: [] };
      g.stalker = { side: -1, scale: 1.0, lift: 60, warn: p => Sfx.play.caw(p, 0.35) };
      const count = () => g.round < 8 ? 4 : g.round < 16 ? 6 : 9;
      const fake = t => ({
        time: t, glitch: 0, hiddenCrane: null, owl: null,
        raven: { pos: null, look: 0 }, eagle: { phase: 'away', fury: 0 },
        cardinal: { phase: 'cage', box: 70, keySpin: t }, dove: { phase: 'away' }, crane: { stage: 9 },
      });
      const layout = n => {
        const cols = n === 4 ? 2 : 3, rows = Math.ceil(n / cols), gap = 16;
        const cw = Math.min((AREA.w - (cols - 1) * gap) / cols, ((AREA.h - (rows - 1) * gap) / rows) * 16 / 9), ch = cw * 9 / 16;
        const ox = AREA.x + (AREA.w - (cols * cw + (cols - 1) * gap)) / 2, oy = AREA.y + (AREA.h - (rows * ch + (rows - 1) * gap)) / 2;
        return Array.from({ length: n }, (_, i) => [ox + (i % cols) * (cw + gap), oy + Math.floor(i / cols) * (ch + gap), cw, ch]);
      };
      const buildRound = () => {
        const n = count();
        g.cells = layout(n);
        g.cams = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9));
        g.thumbs = g.cams.map(cam => {
          const off = document.createElement('canvas'); off.width = 640; off.height = 360;
          const o = off.getContext('2d'); o.scale(0.5, 0.5);
          const fs = fake(rand(0, 100));
          Scenes.drawCam(o, cam, fs, rand(0, 320));
          Scenes.camOverlay(o, fs, cam, 0.12);
          return off;
        });
        g.answer = Math.floor(Math.random() * n);
        g.rt = 0; g.appear = rand(2, 7); g.window = lerp(2.0, 1.1, g.round / ROUNDS);
        g.eye = { x: rand(0.15, 0.8), y: rand(0.2, 0.6) };
        g.state = 'play'; g.picked = -1;
      };
      buildRound();
      const finish = ok => {
        g.state = 'reveal'; g.reveal = 0.9;
        if (ok) { g.correct++; Sfx.play.pickup(); threaten(-0.06); } else { Sfx.play.buzz(); threaten(0.3); }
      };
      g.click = (x, y) => {
        if (g.state !== 'play') return;
        g.cells.forEach(([cx, cy, cw, ch], i) => {
          if (x < cx || x > cx + cw || y < cy || y > cy + ch) return;
          g.picked = i;
          finish(i === g.answer && g.rt >= g.appear && g.rt <= g.appear + g.window + 0.8);
        });
      };
      g.update = dt => {
        g.rt += dt;
        if (g.state === 'reveal') {
          g.reveal -= dt;
          if (g.reveal <= 0) {
            g.round++;
            if (g.round >= ROUNDS) { end(true, `${g.correct} of ${ROUNDS} sightings marked. The Raven will remember you were careful.`); return; }
            buildRound();
          }
          return;
        }
        threaten(dt * 0.004);
        if (g.rt > g.appear + g.window + 0.8) { g.picked = -1; finish(false); }
      };
      g.render = c => {
        const visible = g.rt >= g.appear && g.rt <= g.appear + g.window;
        g.cells.forEach(([cx, cy, cw, ch], i) => {
          c.drawImage(g.thumbs[i], cx, cy, cw, ch);
          c.globalAlpha = 0.12; c.drawImage(Scenes.noiseFrame(g.rt + i * 0.37), cx, cy, cw, ch); c.globalAlpha = 1;
          c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(cx, cy + ((g.rt * 50 + i * 40) % ch), cw, 14);
          if (i === g.answer && (visible || g.state === 'reveal')) {
            const flick = g.state === 'reveal' ? 0.8 : (0.55 + Math.random() * 0.45) * Math.min(1, (g.rt - g.appear) * 4, (g.appear + g.window - g.rt) * 4);
            const r = Math.max(3, cw / 70), ex = cx + g.eye.x * cw, ey = cy + g.eye.y * ch;
            Sprites.drawEyes(c, [{ x: ex, y: ey, r, color: '#ffb030', core: '#fff4d0' }, { x: ex + r * 5, y: ey, r, color: '#ffb030', core: '#fff4d0' }], flick);
          }
          c.lineWidth = 4;
          c.strokeStyle = g.state === 'reveal' && i === g.answer ? '#7fd07a' : g.state === 'reveal' && i === g.picked ? '#d66' : '#3a3630';
          c.strokeRect(cx, cy, cw, ch);
          const secs = Math.floor(g.round * 7 + g.rt);
          label(c, `CAM ${g.cams[i]}  03:${String(10 + Math.floor(secs / 60) % 50).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, cx + 8, cy + ch - 8, Math.max(14, cw / 24), '#e9efe6', 'left');
        });
        label(c, `Tape ${Math.min(g.round + 1, ROUNDS)} of ${ROUNDS}   -   Marked: ${g.correct}`, W / 2, 120, 30);
        instructions(c, 'Click a tape the moment eyes appear in it. Wrong marks and missed sightings are remembered.');
      };
      return g;
    },
  };

  const api = { init, run, get running() { return running; } };
  if (/[?&]debug/.test(location.search)) api.debugGame = () => game;
  return api;
})();
