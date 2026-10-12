// Procedural canvas sprites for the five Songbirds.
// Sprites.draw(ctx, id, x, y, scale, opts) draws with feet at (x, y), returns eye points.
// Sprites.drawEyes(ctx, eyes, intensity) renders glowing eyes (call after darkness overlays).
const Sprites = (() => {
  const TAU = Math.PI * 2;

  function lg(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  function rg(ctx, x, y, r0, r1, stops, x1 = x, y1 = y) {
    const g = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  function ell(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  }
  function sym(ctx, fn) {
    ctx.save(); fn(1); ctx.restore();
    ctx.save(); ctx.scale(-1, 1); fn(-1); ctx.restore();
  }
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function rivet(ctx, x, y, r = 4) {
    ell(ctx, x, y, r, r);
    ctx.fillStyle = rg(ctx, x - r * 0.3, y - r * 0.3, 0, r, [[0, '#d8d8d8'], [1, '#3a3a3a']]);
    ctx.fill();
  }
  function eyeAt(ctx, eyes, lx, ly, r, color, core = '#fff') {
    const m = ctx.getTransform();
    const p = m.transformPoint(new DOMPoint(lx, ly));
    eyes.push({ x: p.x, y: p.y, r: r * Math.hypot(m.a, m.b), color, core });
  }
  // A feather: elongated leaf shape from (0,0) pointing along +y.
  function feather(ctx, x, y, len, w, ang, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w, len * 0.45, 0, len);
    ctx.quadraticCurveTo(-w, len * 0.45, 0, 0);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, len * 0.92); ctx.stroke();
    }
    ctx.restore();
  }
  function metalLeg(ctx, x0, y0, x1, y1, x2, y2, w, paint = '#6b6b6b') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = w + 4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = lg(ctx, x0 - w, 0, x0 + w, 0, [[0, '#2b2b2b'], [0.45, paint], [1, '#222']]);
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    rivet(ctx, x1, y1, w * 0.55);
  }
  function talons(ctx, x, y, size, color = '#222') {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = size * 0.28;
    [-0.9, 0, 0.9].forEach(a => {
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.quadraticCurveTo(x + Math.sin(a) * size * 1.1, y + 2, x + Math.sin(a) * size * 1.4, y + size * 0.35);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x - size * 0.2, y - size * 0.7); ctx.stroke();
  }
  function cracks(ctx, pts, color = 'rgba(0,0,0,.55)', w = 1.4) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }

  // ===================== THE RAVEN (Memory) =====================
  function raven(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const bob = Math.sin(t * 1.7) * 3;
    const tilt = Math.sin(t * 0.6) * 0.06 + (o.twitch || 0);

    sym(ctx, () => {
      metalLeg(ctx, 34, -125, 44, -62, 36, -4, 12);
      talons(ctx, 36, -4, 22);
    });
    ctx.translate(0, bob);

    // tail
    for (let i = -3; i <= 3; i++) feather(ctx, i * 9, -115, 110, 20, i * 0.12, '#0a090d', 'rgba(110,100,150,.25)');

    // wings
    sym(ctx, s => {
      ctx.beginPath();
      ctx.moveTo(62, -315);
      ctx.bezierCurveTo(150, -280, 150, -150, 112, -60);
      ctx.bezierCurveTo(98, -110, 70, -150, 50, -170);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 60, -300, 130, -80, [[0, '#1b1826'], [0.5, '#0b0a10'], [1, '#040305']]);
      ctx.fill();
      for (let i = 0; i < 7; i++) feather(ctx, 85 + i * 5, -270 + i * 26, 70, 13, -0.15, '#0d0c13', 'rgba(120,110,170,.3)');
      if (s < 0) {
        // torn wing: exposed endoskeleton
        ctx.fillStyle = '#16121b';
        ell(ctx, 112, -190, 20, 42, -0.2); ctx.fill();
        ctx.strokeStyle = '#7a7a80'; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(98, -220 + i * 18); ctx.lineTo(126, -212 + i * 18); ctx.stroke(); }
        ctx.strokeStyle = '#a33'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(104, -230); ctx.bezierCurveTo(130, -200, 96, -180, 118, -150); ctx.stroke();
      }
    });

    // body
    ell(ctx, 0, -210, 96, 128);
    ctx.fillStyle = rg(ctx, -30, -270, 5, 150, [[0, '#2e2a46'], [0.35, '#131119'], [1, '#040305']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,180,.18)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 6; r++) for (let c = -3; c <= 3; c++) {
      const x = c * 22 + (r % 2) * 11, y = -300 + r * 26;
      if (Math.abs(x) > 80 - r * 2) continue;
      ctx.beginPath(); ctx.arc(x, y, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    // locket (memory)
    ctx.strokeStyle = '#8d8a80'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-40, -322); ctx.quadraticCurveTo(0, -250, 40, -322); ctx.stroke();
    ell(ctx, 0, -262, 15, 19);
    ctx.fillStyle = lg(ctx, -15, -280, 15, -245, [[0, '#e3dcc4'], [0.5, '#8a826c'], [1, '#4b4536']]);
    ctx.fill();
    ctx.fillStyle = '#1a1712'; ell(ctx, 0, -265, 3, 4); ctx.fill(); ctx.fillRect(-1.5, -263, 3, 8);

    // head
    ctx.save();
    ctx.translate((o.look || 0) * 10, -372);
    ctx.rotate(tilt);
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * 0.15 + (i / 13) * Math.PI * 0.7;
      feather(ctx, Math.cos(a) * 52, Math.sin(a) * 40, 34, 9, a - Math.PI / 2, '#0b0a0f');
    }
    ell(ctx, 0, 0, 66, 62);
    ctx.fillStyle = rg(ctx, -20, -25, 4, 80, [[0, '#302b48'], [0.5, '#121017'], [1, '#050406']]);
    ctx.fill();
    [-0.5, -0.15, 0.25].forEach((a, i) => feather(ctx, a * 50, -52, -38 - i * 6, 8, a * 0.6, '#0d0b12'));
    // brows
    sym(ctx, () => {
      poly(ctx, [[8, -26], [58, -40], [56, -26], [14, -12]]);
      ctx.fillStyle = '#050407'; ctx.fill();
      ctx.strokeStyle = 'rgba(140,130,190,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(8, -26); ctx.lineTo(58, -40); ctx.stroke();
    });
    sym(ctx, () => { ell(ctx, 31, -10, 17, 14); ctx.fillStyle = '#000'; ctx.fill(); });
    cracks(ctx, [[-44, -4], [-50, 6], [-46, 16], [-55, 28]], 'rgba(170,160,200,.35)');
    eyeAt(ctx, eyes, 31, -10, 11, '#d9e6ff');
    eyeAt(ctx, eyes, -31, -10, 11, '#d9e6ff');

    // beak
    const open = atk ? 1 : (o.beak || 0);
    if (open > 0) {
      ell(ctx, 0, 26 + open * 18, 24, 26 + open * 18);
      ctx.fillStyle = rg(ctx, 0, 30 + open * 18, 2, 40, [[0, '#ff4422'], [0.4, '#5a0a08'], [1, '#100'],]);
      ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 20 + open * 10); ctx.lineTo(i * 7, 40 + open * 26); ctx.stroke(); }
    }
    ctx.save();
    ctx.translate(0, -open * 8);
    ctx.beginPath();
    ctx.moveTo(-25, 2); ctx.lineTo(25, 2);
    ctx.quadraticCurveTo(16, 40, 0, 78 - open * 26);
    ctx.quadraticCurveTo(-16, 40, -25, 2);
    ctx.fillStyle = lg(ctx, -25, 0, 25, 0, [[0, '#0d0d10'], [0.45, '#4a4856'], [0.55, '#2a2932'], [1, '#09090b']]);
    ctx.fill();
    ctx.fillStyle = '#000'; ell(ctx, -8, 12, 3, 2); ctx.fill(); ell(ctx, 8, 12, 3, 2); ctx.fill();
    ctx.restore();
    if (open > 0) {
      ctx.beginPath();
      ctx.moveTo(-18, 30 + open * 30); ctx.lineTo(18, 30 + open * 30); ctx.lineTo(0, 64 + open * 36); ctx.closePath();
      ctx.fillStyle = '#18171c'; ctx.fill();
    }
    ctx.restore();
  }

  // ===================== THE EAGLE (Courage / Control) =====================
  function eagle(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const fury = atk ? 1 : (o.fury || 0);
    const spread = Math.max(0, Math.min(1, (fury - 0.45) / 0.45));
    const bob = Math.sin(t * 1.3) * 2.5;
    const look = o.look ?? (fury > 0.3 ? 0 : Math.sin(t * 0.25) * 0.9);

    sym(ctx, () => {
      metalLeg(ctx, 40, -130, 50, -64, 42, -6, 15, '#b8962a');
      talons(ctx, 42, -6, 28, '#1c1a14');
    });
    ctx.translate(0, bob);

    // wings (spread with fury)
    sym(ctx, () => {
      ctx.save();
      ctx.translate(78, -305);
      ctx.rotate(-0.25 * spread);
      const reach = 70 + 290 * spread;
      const drop = 260 - 130 * spread;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(reach * 0.5, -40 * spread - 10, reach, -30 * spread, reach + 10, 20);
      ctx.lineTo(reach * 0.6 + 30, drop);
      ctx.bezierCurveTo(reach * 0.4, drop * 0.7, 20, 120, -10, 60);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 0, reach, drop, [[0, '#4a3220'], [0.6, '#2b1b10'], [1, '#160d07']]);
      ctx.fill();
      const n = 9;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const x = 10 + (reach - 5) * f;
        const y = 30 + f * (drop * 0.25) + (1 - f) * 60;
        feather(ctx, x, y, 90 + spread * 90 * f, 16, -0.35 * f * spread + 0.1, '#20140b', 'rgba(200,160,110,.25)');
      }
      ctx.restore();
    });

    // body
    ell(ctx, 0, -220, 115, 138);
    ctx.fillStyle = rg(ctx, -35, -280, 8, 160, [[0, '#6b4a2e'], [0.45, '#3b2616'], [1, '#140b05']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,180,120,.18)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 6; r++) for (let c = -4; c <= 4; c++) {
      const x = c * 22 + (r % 2) * 11, y = -280 + r * 26;
      if (Math.abs(x) > 96 - r * 6) continue;
      ctx.beginPath(); ctx.arc(x, y, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    // Aquila badge
    ctx.beginPath();
    ctx.moveTo(0, -292); ctx.lineTo(30, -280); ctx.lineTo(26, -236); ctx.lineTo(0, -216); ctx.lineTo(-26, -236); ctx.lineTo(-30, -280); ctx.closePath();
    ctx.fillStyle = lg(ctx, -30, -290, 30, -220, [[0, '#f6e08a'], [0.5, '#b08a2a'], [1, '#5e4410']]);
    ctx.fill();
    ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a2a08';
    ctx.font = 'bold 30px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, -252);
    // wires at neck
    ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 3;
    [[-30, '#922'], [0, '#229'], [26, '#aa2']].forEach(([x, c]) => {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x, -330); ctx.bezierCurveTo(x + 20, -310, x - 20, -300, x + 6, -290); ctx.stroke();
    });

    // head
    ctx.save();
    ctx.translate(look * 18, -395);
    ctx.rotate(look * 0.08 + (o.twitch || 0));
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 0.1 + (i / 17) * Math.PI * 0.8;
      feather(ctx, Math.cos(a) * 60, Math.sin(a) * 48, 46, 11, a - Math.PI / 2, '#ece6d6', 'rgba(120,110,90,.35)');
    }
    ell(ctx, 0, 0, 72, 68);
    ctx.fillStyle = rg(ctx, -24, -30, 6, 90, [[0, '#ffffff'], [0.6, '#ddd5c2'], [1, '#9b917c']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,100,80,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) { const x = -55 + i * 7.5; ctx.beginPath(); ctx.moveTo(x, -50 + Math.abs(x) * 0.3); ctx.lineTo(x + 3, -38 + Math.abs(x) * 0.3); ctx.stroke(); }
    const lx = look * 26;
    // brows
    sym(ctx, () => {
      poly(ctx, [[6 + lx * 0.6, -22], [64, -36], [60, -16], [16 + lx * 0.6, -6]]);
      ctx.fillStyle = lg(ctx, 0, -36, 0, -6, [[0, '#d8c06a'], [1, '#7c6a2a']]);
      ctx.fill();
    });
    // left eye (amber), right eye (camera lens)
    ell(ctx, -30 + lx, -4, 15, 13); ctx.fillStyle = '#100a00'; ctx.fill();
    eyeAt(ctx, eyes, -30 + lx, -4, 10, fury > 0.85 ? '#ff2a1a' : '#ffb21a');
    ell(ctx, 31 + lx, -4, 21, 21); ctx.fillStyle = '#0b0b0b'; ctx.fill();
    ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 4; ctx.stroke();
    ell(ctx, 31 + lx, -4, 13, 13);
    ctx.fillStyle = rg(ctx, 27 + lx, -9, 1, 14, [[0, '#6a84a6'], [0.4, '#16202e'], [1, '#05070a']]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ell(ctx, 25 + lx, -11, 4, 3, -0.5); ctx.fill();
    eyeAt(ctx, eyes, 31 + lx, -4, 5, '#ff2020', '#ffd0d0');
    const recOn = Math.floor(t * 1.5) % 2 === 0;
    if (recOn) eyeAt(ctx, eyes, 54 + lx, -22, 3, '#ff1010', '#fff');

    // beak
    const open = atk ? 1 : 0;
    if (open) {
      ell(ctx, lx, 40, 30, 40);
      ctx.fillStyle = rg(ctx, lx, 46, 2, 44, [[0, '#ff6a00'], [0.4, '#601400'], [1, '#120200']]);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(lx, -open * 12);
    ctx.beginPath();
    ctx.moveTo(-28, 6); ctx.lineTo(28, 6);
    ctx.bezierCurveTo(26, 40, 18, 66, 2, 86);
    ctx.quadraticCurveTo(-6, 80, -4, 64);
    ctx.bezierCurveTo(-14, 50, -24, 30, -28, 6);
    ctx.fillStyle = lg(ctx, -28, 0, 28, 0, [[0, '#a8700c'], [0.4, '#ffd23c'], [0.6, '#e9a91c'], [1, '#8a5a08']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,0,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#3a2000'; ell(ctx, -9, 18, 3, 2); ctx.fill(); ell(ctx, 9, 18, 3, 2); ctx.fill();
    ctx.restore();
    if (open) {
      ctx.beginPath(); ctx.moveTo(lx - 20, 64); ctx.lineTo(lx + 20, 64); ctx.lineTo(lx, 100); ctx.closePath();
      ctx.fillStyle = '#c98a14'; ctx.fill();
    }
    ctx.restore();
  }

  // ===================== THE CARDINAL (Love / Grief) =====================
  function cardinal(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const bob = Math.sin(t * 2.4) * 3;
    const keySpin = o.keySpin ?? t * 0.6;

    sym(ctx, () => {
      metalLeg(ctx, 26, -92, 34, -48, 28, -4, 9, '#8a5a50');
      talons(ctx, 28, -4, 16, '#2a1414');
    });
    ctx.translate(0, bob);

    // winding key (behind)
    ctx.save();
    ctx.translate(70, -235);
    ctx.strokeStyle = '#6e5418'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(40, -40); ctx.stroke();
    ctx.translate(48, -46);
    ctx.scale(Math.cos(keySpin * 3), 1);
    sym(ctx, () => {
      ell(ctx, 22, 0, 22, 14);
      ctx.fillStyle = lg(ctx, 0, -14, 0, 14, [[0, '#f2d27a'], [1, '#7a5a12']]);
      ctx.fill();
      ell(ctx, 22, 0, 9, 5); ctx.fillStyle = '#2a1a04'; ctx.fill();
    });
    ctx.restore();

    // tail
    for (let i = -2; i <= 2; i++) feather(ctx, i * 9, -78, 80, 16, i * 0.15, '#5a0610', 'rgba(255,120,120,.25)');

    // wings
    sym(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(52, -240);
      ctx.bezierCurveTo(120, -210, 118, -110, 88, -48);
      ctx.bezierCurveTo(74, -90, 54, -110, 40, -120);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 52, -240, 100, -50, [[0, '#9c0c1c'], [1, '#3e0309']]);
      ctx.fill();
      for (let i = 0; i < 6; i++) feather(ctx, 72 + i * 4, -210 + i * 24, 50, 10, -0.12, '#6a0612', 'rgba(255,150,150,.3)');
    });

    // body
    ell(ctx, 0, -168, 88, 108);
    ctx.fillStyle = rg(ctx, -28, -220, 6, 130, [[0, '#ff4a4f'], [0.4, '#c3101f'], [1, '#4a0208']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,200,.18)'; ctx.lineWidth = 1.4;
    for (let r = 0; r < 5; r++) for (let c = -3; c <= 3; c++) {
      const x = c * 20 + (r % 2) * 10, y = -235 + r * 24;
      if (Math.abs(x) > 72 - r * 3) continue;
      ctx.beginPath(); ctx.arc(x, y, 10, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    // heart-shaped music comb
    ctx.save();
    ctx.translate(0, -160);
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.bezierCurveTo(-46, -2, -30, -40, 0, -18);
    ctx.bezierCurveTo(30, -40, 46, -2, 0, 28);
    ctx.fillStyle = lg(ctx, -30, -30, 30, 30, [[0, '#f5dc8c'], [0.5, '#b9902e'], [1, '#5b4310']]);
    ctx.fill();
    ctx.strokeStyle = '#3d2c06'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,5,.8)'; ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 4, -12 + Math.abs(i) * 1.5); ctx.lineTo(i * 4, 10 - Math.abs(i) * 1.2); ctx.stroke(); }
    ctx.restore();

    // head
    ctx.save();
    ctx.translate((o.look || 0) * 10, -298);
    ctx.rotate(Math.sin(t * 0.9) * 0.07 + (o.twitch || 0));
    // crest
    for (let i = 0; i < 5; i++) feather(ctx, -6 + i * 4, -40, -90 + i * 12, 14 - i, -0.25 + i * 0.05, i % 2 ? '#d01828' : '#a80e1c');
    ell(ctx, 0, 0, 58, 54);
    ctx.fillStyle = rg(ctx, -18, -22, 4, 70, [[0, '#ff5a5a'], [0.5, '#c4111f'], [1, '#55030a']]);
    ctx.fill();
    // black mask
    ctx.beginPath();
    ctx.moveTo(-48, -14); ctx.quadraticCurveTo(0, -30, 48, -14);
    ctx.quadraticCurveTo(46, 14, 20, 30);
    ctx.quadraticCurveTo(0, 46, -20, 30);
    ctx.quadraticCurveTo(-46, 14, -48, -14);
    ctx.fillStyle = '#0c0405'; ctx.fill();
    eyeAt(ctx, eyes, -25, -8, 8, '#ffd6dd');
    eyeAt(ctx, eyes, 25, -8, 8, '#ffd6dd');
    // beak
    const open = atk ? 1 : 0;
    if (open) {
      ell(ctx, 0, 22, 18, 22);
      ctx.fillStyle = rg(ctx, 0, 24, 1, 26, [[0, '#ff9a6a'], [0.5, '#6a0a00'], [1, '#100']]);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(0, -open * 8);
    ctx.beginPath(); ctx.moveTo(-19, 2); ctx.lineTo(19, 2); ctx.quadraticCurveTo(10, 24, 0, 36 - open * 10); ctx.quadraticCurveTo(-10, 24, -19, 2);
    ctx.fillStyle = lg(ctx, -19, 0, 19, 0, [[0, '#c4421a'], [0.5, '#ff8a4a'], [1, '#a2340f']]);
    ctx.fill();
    ctx.restore();
    if (open) {
      ctx.beginPath(); ctx.moveTo(-14, 30); ctx.lineTo(14, 30); ctx.lineTo(0, 52); ctx.closePath();
      ctx.fillStyle = '#d0582a'; ctx.fill();
    }
    ctx.restore();
  }

  // ===================== THE DOVE (Peace / Silence) =====================
  function dove(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const bob = Math.sin(t * 1.1) * 2;

    if (o.halo !== false) {
      ctx.fillStyle = rg(ctx, 0, -230, 10, 260, [[0, 'rgba(255,250,235,.28)'], [1, 'rgba(255,250,235,0)']]);
      ctx.fillRect(-260, -490, 520, 520);
    }
    sym(ctx, () => {
      metalLeg(ctx, 24, -78, 30, -42, 25, -4, 8, '#b06a70');
      talons(ctx, 25, -4, 14, '#7a3e44');
    });
    ctx.translate(0, bob);

    for (let i = -3; i <= 3; i++) feather(ctx, i * 9, -70, 75, 15, i * 0.14, '#cfd2d8', 'rgba(120,130,150,.35)');

    sym(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(56, -230);
      ctx.bezierCurveTo(124, -200, 124, -100, 92, -40);
      ctx.bezierCurveTo(78, -80, 58, -100, 44, -110);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 56, -230, 100, -40, [[0, '#f4f4f2'], [0.7, '#c6cad2'], [1, '#7c828e']]);
      ctx.fill();
      for (let i = 0; i < 6; i++) feather(ctx, 76 + i * 4, -200 + i * 24, 50, 10, -0.12, i > 3 ? '#9aa0ab' : '#e2e4e8', 'rgba(110,120,140,.35)');
    });

    ell(ctx, 0, -160, 100, 112);
    ctx.fillStyle = rg(ctx, -30, -210, 6, 140, [[0, '#ffffff'], [0.55, '#e6e7ea'], [1, '#9fa5b0']]);
    ctx.fill();
    // breast blush and cracks in porcelain
    ell(ctx, 0, -190, 60, 50); ctx.fillStyle = 'rgba(210,190,200,.25)'; ctx.fill();
    cracks(ctx, [[-30, -240], [-20, -215], [-28, -190], [-12, -168], [-18, -140]], 'rgba(70,70,80,.5)');
    cracks(ctx, [[40, -130], [30, -112], [42, -96]], 'rgba(70,70,80,.45)');

    ctx.save();
    ctx.translate((o.look || 0) * 10, -288);
    ctx.rotate(Math.sin(t * 0.5) * 0.05 + (o.twitch || 0));
    ell(ctx, 0, 0, 56, 52);
    ctx.fillStyle = rg(ctx, -16, -20, 4, 70, [[0, '#ffffff'], [0.6, '#e4e5e9'], [1, '#a3a8b2']]);
    ctx.fill();
    cracks(ctx, [[18, -46], [12, -30], [22, -18], [16, -4]], 'rgba(60,60,70,.55)');
    // void eyes
    sym(ctx, () => {
      ell(ctx, 24, -6, 13, 14);
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ell(ctx, 20, -11, 3, 3); ctx.fill();
      if (atk || o.weep) {
        ctx.fillStyle = 'rgba(0,0,0,.85)';
        ctx.beginPath(); ctx.moveTo(18, 2); ctx.quadraticCurveTo(22, 40, 16, 70); ctx.quadraticCurveTo(28, 40, 30, 2); ctx.fill();
      }
    });
    if (o.weep || atk) {
      eyeAt(ctx, eyes, 24, -6, 3, '#9fb4ff', '#fff');
      eyeAt(ctx, eyes, -24, -6, 3, '#9fb4ff', '#fff');
    }
    // cere and beak
    const open = atk ? 1 : 0;
    if (open) {
      ell(ctx, 0, 28, 22, 34);
      ctx.fillStyle = rg(ctx, 0, 30, 1, 36, [[0, '#000'], [1, '#2a0a10']]);
      ctx.fill();
    }
    ell(ctx, 0, 4, 10, 6); ctx.fillStyle = '#f2eef0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, 8 - open * 6); ctx.lineTo(10, 8 - open * 6); ctx.lineTo(0, 30 - open * 10); ctx.closePath();
    ctx.fillStyle = '#8f6f78'; ctx.fill();
    // olive branch of wire
    ctx.save();
    ctx.translate(0, 22 + open * 40);
    ctx.strokeStyle = '#6a6f5c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-90, 6); ctx.quadraticCurveTo(0, -6, 92, 10); ctx.stroke();
    ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 1.5;
    for (let i = -4; i <= 4; i++) {
      const x = i * 20;
      ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 6); ctx.moveTo(x + 4, 0); ctx.lineTo(x - 4, 6); ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = -80 + i * 27, side = i % 2 ? 1 : -1;
      feather(ctx, x, 2, 18, 6, side * 2.2, '#6f7d4a');
    }
    ctx.restore();
    ctx.restore();
  }

  // ===================== THE CRANE (Hope / The Unfinished Wish) =====================
  function crane(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const sway = Math.sin(t * 0.8) * 10;
    const glow = 0.6 + Math.sin(t * 2.2) * 0.25 + (o.glow || 0);

    sym(ctx, () => {
      ctx.strokeStyle = '#121212'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(24, -270); ctx.lineTo(30, -140); ctx.lineTo(24, -4); ctx.stroke();
      rivet(ctx, 30, -140, 7);
      talons(ctx, 24, -4, 20, '#111');
    });

    // black plume bustle
    for (let i = -4; i <= 4; i++) feather(ctx, i * 12, -260, 120, 20, i * 0.1, '#0d0d0f', 'rgba(150,150,150,.25)');

    // origami body: faceted diamond
    const facets = [
      [[0, -440], [-110, -340], [0, -330], '#f3efe6'],
      [[0, -440], [110, -340], [0, -330], '#d9d3c6'],
      [[-110, -340], [0, -330], [-60, -250], '#c9c2b2'],
      [[110, -340], [0, -330], [60, -250], '#ebe6db'],
      [[-60, -250], [0, -330], [0, -230], '#b5ad9c'],
      [[60, -250], [0, -330], [0, -230], '#d0c9ba'],
    ];
    facets.forEach(([a, b, c, col]) => { poly(ctx, [a, b, c]); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(90,80,60,.35)'; ctx.lineWidth = 1; ctx.stroke(); });
    // wings: folded-paper planes with black tips
    sym(ctx, () => {
      poly(ctx, [[100, -350], [168, -420], [150, -260], [70, -270]]);
      ctx.fillStyle = '#e4ded1'; ctx.fill(); ctx.strokeStyle = 'rgba(90,80,60,.4)'; ctx.stroke();
      poly(ctx, [[150, -260], [168, -420], [190, -300], [172, -220]]);
      ctx.fillStyle = '#141414'; ctx.fill();
    });
    // heart window with 999 cranes
    ctx.save();
    ctx.translate(0, -320);
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.bezierCurveTo(-62, 0, -44, -54, 0, -26);
    ctx.bezierCurveTo(44, -54, 62, 0, 0, 40);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rg(ctx, 0, 0, 2, 70, [[0, `rgba(255,214,140,${0.95 * glow})`], [0.6, `rgba(220,90,60,${0.7 * glow})`], [1, 'rgba(60,10,10,.9)']]);
    ctx.fillRect(-60, -60, 120, 110);
    ctx.fillStyle = 'rgba(255,250,240,.85)';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 37) % 80) - 40, y = ((i * 23) % 64) - 36;
      poly(ctx, [[x, y], [x + 7, y - 4], [x + 4, y + 2], [x + 10, y + 1], [x, y + 4]]);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 40); ctx.bezierCurveTo(-62, 0, -44, -54, 0, -26); ctx.bezierCurveTo(44, -54, 62, 0, 0, 40);
    ctx.stroke();
    rivet(ctx, -30, -24, 3); rivet(ctx, 30, -24, 3); rivet(ctx, 0, 30, 3);
    ctx.restore();
    eyeAt(ctx, eyes, 0, -322, 26 * glow, 'rgba(255,170,90,.6)', 'rgba(255,230,190,.25)');

    // neck: segmented, black
    const headX = atk ? 0 : sway + (o.look || 0) * 30;
    const headY = atk ? -560 : -640;
    ctx.strokeStyle = '#1a1a1c'; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -430); ctx.bezierCurveTo(0, -510, headX * 1.4, -560, headX, headY + 20); ctx.stroke();
    ctx.strokeStyle = '#4a4a50'; ctx.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      const f = i / 8;
      const x = (1 - f) * (1 - f) * 0 + 2 * (1 - f) * f * headX * 1.2 + f * f * headX;
      const y = -430 + f * (headY + 20 + 430);
      ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.stroke();
    }
    // head
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(atk ? 0 : Math.sin(t * 0.8 + 1) * 0.12 + (o.twitch || 0));
    const hs = atk ? 1.6 : 1;
    ctx.scale(hs, hs);
    ell(ctx, 0, 0, 30, 26);
    ctx.fillStyle = '#141416'; ctx.fill();
    sym(ctx, () => { ell(ctx, 18, 6, 12, 14); ctx.fillStyle = '#ecebe6'; ctx.fill(); });
    ell(ctx, 0, -18, 18, 10); ctx.fillStyle = '#c4081a'; ctx.fill();
    eyeAt(ctx, eyes, -11, -2, 3.5, '#ffb347');
    eyeAt(ctx, eyes, 11, -2, 3.5, '#ffb347');
    const open = atk ? 1 : 0;
    ctx.fillStyle = '#6b6a4e';
    if (open) {
      poly(ctx, [[-7, 10], [7, 10], [0, 90]]); ctx.fillStyle = '#4a4934'; ctx.fill();
      poly(ctx, [[-8, 6], [8, 6], [-24, 80]]); ctx.fillStyle = '#7a795a'; ctx.fill();
      poly(ctx, [[-8, 6], [8, 6], [24, 80]]); ctx.fill();
    } else {
      poly(ctx, [[-6, 8], [6, 8], [26, 74], [20, 76]]); ctx.fill();
    }
    ctx.restore();
  }

  // ===================== THE OWL (Wisdom / Regret) - secret =====================
  // opts.turn: 0 = back of head toward viewer, 1 = staring straight at viewer.
  function owl(ctx, o, eyes) {
    const t = o.t || 0;
    const atk = o.pose === 'attack';
    const turn = atk ? 1 : (o.turn ?? 1);
    const a = (1 - turn) * Math.PI;
    const facing = Math.cos(a);
    const side = Math.sin(a);
    const bob = Math.sin(t * 0.9) * 2;

    sym(ctx, () => {
      metalLeg(ctx, 28, -70, 34, -38, 30, -4, 10, '#6a5a44');
      talons(ctx, 30, -4, 18, '#2a2218');
    });
    ctx.translate(0, bob);

    for (let i = -2; i <= 2; i++) feather(ctx, i * 10, -70, 70, 16, i * 0.12, '#4a3c2c', 'rgba(220,200,160,.25)');

    // wings with bars
    sym(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(60, -230);
      ctx.bezierCurveTo(128, -200, 126, -100, 96, -40);
      ctx.bezierCurveTo(80, -80, 60, -100, 46, -110);
      ctx.closePath();
      ctx.fillStyle = lg(ctx, 60, -230, 100, -40, [[0, '#6e5a42'], [1, '#2e2418']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,210,170,.35)'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(70 + i * 3, -200 + i * 26); ctx.lineTo(108 - i * 2, -192 + i * 26); ctx.stroke(); }
    });

    // body: mottled with chevrons
    ell(ctx, 0, -150, 96, 116);
    ctx.fillStyle = rg(ctx, -30, -200, 6, 140, [[0, '#a08a6a'], [0.45, '#6a5640'], [1, '#2a2016']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,28,16,.55)'; ctx.lineWidth = 2;
    for (let r = 0; r < 6; r++) for (let c = -3; c <= 3; c++) {
      const x = c * 22 + (r % 2) * 11, y = -230 + r * 26;
      if (Math.abs(x) > 74 - r * 3) continue;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x, y + 3); ctx.lineTo(x + 6, y - 4); ctx.stroke();
    }
    // brass name tag
    ctx.fillStyle = lg(ctx, -24, -128, 24, -108, [[0, '#f0d488'], [1, '#7a5a1a']]);
    ctx.fillRect(-24, -130, 48, 22);
    ctx.strokeStyle = '#3a2a08'; ctx.lineWidth = 1.5; ctx.strokeRect(-24, -130, 48, 22);
    ctx.fillStyle = '#3a2a08'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('E.W.', 0, -119);

    // neck servo ring
    ell(ctx, 0, -236, 62, 13);
    ctx.fillStyle = '#3a3630'; ctx.fill();
    ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * Math.PI * 2 + a;
      if (Math.sin(ang) < 0) continue;
      const x = Math.cos(ang) * 60;
      ctx.beginPath(); ctx.moveTo(x, -240); ctx.lineTo(x, -230); ctx.stroke();
    }

    // head
    ctx.save();
    ctx.translate(0, -305 + (atk ? 10 : 0));
    ctx.rotate(Math.sin(t * 0.6) * 0.03 + (o.twitch || 0));
    ell(ctx, 0, 0, 80, 72);
    ctx.fillStyle = rg(ctx, -24, -28, 6, 96, [[0, '#a8926e'], [0.5, '#6e5a42'], [1, '#2e2418']]);
    ctx.fill();
    // ear tufts follow the rotation
    for (const sx of [-1, 1]) {
      const x = sx * 46 * Math.abs(facing) + side * 20 * sx * 0.3;
      ctx.beginPath();
      ctx.moveTo(x - 16, -50); ctx.lineTo(x + sx * 14, -104); ctx.lineTo(x + 16, -46); ctx.closePath();
      ctx.fillStyle = '#4a3a28'; ctx.fill();
    }
    if (facing < 0.05) {
      // back of the head: feather seam and rivets
      ctx.save();
      ctx.translate(side * 40, 0);
      ctx.scale(Math.max(0.15, -facing), 1);
      ctx.strokeStyle = 'rgba(30,20,10,.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-50 + i * 4, -30 + i * 16); ctx.lineTo(0, -10 + i * 16); ctx.lineTo(50 - i * 4, -30 + i * 16); ctx.stroke(); }
      ctx.strokeStyle = '#2a2a28'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, 66); ctx.stroke();
      for (let i = -2; i <= 2; i++) rivet(ctx, 0, i * 24, 4);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(side * 40, 4);
      ctx.scale(Math.max(0.12, facing), 1);
      // facial disk
      sym(ctx, () => { ell(ctx, 30, 0, 40, 46); ctx.fillStyle = rg(ctx, 30, 0, 4, 46, [[0, '#e6d8bc'], [1, '#9c8662']]); ctx.fill(); });
      ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 2;
      sym(ctx, () => { ctx.beginPath(); ctx.arc(30, 0, 44, -2.2, 2.2); ctx.stroke(); });
      const er = atk ? 24 : 19;
      sym(ctx, () => {
        ell(ctx, 30, -4, er + 3, er + 3); ctx.fillStyle = '#1a0e04'; ctx.fill();
        ell(ctx, 30, -4, er, er); ctx.fillStyle = rg(ctx, 26, -8, 2, er, [[0, '#ffd27a'], [0.6, '#d68a14'], [1, '#6a3a04']]); ctx.fill();
        ell(ctx, 30, -4, er * 0.45, er * 0.45); ctx.fillStyle = '#050302'; ctx.fill();
        // wire spectacles
        ctx.strokeStyle = '#d4b462'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(30, -4, er + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30 + er + 9, -6); ctx.lineTo(76, -14); ctx.stroke();
      });
      ctx.strokeStyle = '#d4b462'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-30 + er + 9, -8); ctx.quadraticCurveTo(0, -16, 30 - er - 9, -8); ctx.stroke();
      if (facing > 0.35) {
        eyeAt(ctx, eyes, 30, -4, er * 0.45, '#ffb030', '#fff4d0');
        eyeAt(ctx, eyes, -30, -4, er * 0.45, '#ffb030', '#fff4d0');
      }
      // beak
      const open = atk ? 1 : 0;
      if (open) { ell(ctx, 0, 34, 14, 22); ctx.fillStyle = '#2a0804'; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(10, 12); ctx.quadraticCurveTo(6, 30, 0, 40 - open * 14); ctx.quadraticCurveTo(-6, 30, -10, 12);
      ctx.fillStyle = '#6a6250'; ctx.fill();
      if (open) { poly(ctx, [[-8, 44], [8, 44], [0, 62]]); ctx.fillStyle = '#5a5240'; ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  const DRAW = { raven, eagle, cardinal, dove, crane, owl };

  function draw(ctx, id, x, y, scale, opts = {}) {
    const eyes = [];
    ctx.save();
    ctx.translate(x, y);
    if (opts.rotate) ctx.rotate(opts.rotate);
    ctx.scale(scale * (opts.flip ? -1 : 1), scale);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    DRAW[id](ctx, opts, eyes);
    ctx.restore();
    return eyes;
  }

  function drawEyes(ctx, eyes, intensity = 1) {
    if (!eyes.length || intensity <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of eyes) {
      const r = e.r;
      ctx.globalAlpha = Math.min(1, intensity);
      ctx.fillStyle = rg(ctx, e.x, e.y, 0, r * 4, [[0, e.color], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 4, 0, TAU); ctx.fill();
      ctx.fillStyle = e.core;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.45, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // Small white paper crane (hidden collectible + desk decoration).
  function paperCrane(ctx, x, y, s, rot = 0, color = '#f3efe4') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const shade = 'rgba(0,0,0,.18)';
    poly(ctx, [[-14, 0], [0, -4], [14, 0], [0, 6]]); ctx.fillStyle = color; ctx.fill();
    poly(ctx, [[-4, -2], [-10, -18], [2, -2]]); ctx.fill();
    poly(ctx, [[4, -2], [12, -16], [0, -2]]); ctx.fillStyle = shade; ctx.fill();
    ctx.fillStyle = color;
    poly(ctx, [[12, 0], [20, -12], [22, -10], [16, 2]]); ctx.fill();
    poly(ctx, [[20, -12], [26, -10], [22, -10]]); ctx.fill();
    poly(ctx, [[-12, 0], [-22, -8], [-14, 3]]); ctx.fill();
    ctx.restore();
  }

  return { draw, drawEyes, paperCrane, rg, lg, ell, poly };
})();
