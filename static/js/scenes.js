// Room backgrounds, camera feeds and the office for HALCYON.
const Scenes = (() => {
  const W = 1280, H = 720;
  const ROOM_W = 1600;
  const OFFICE_W = 1920;
  const { rg, lg, ell, poly } = Sprites;

  const ROOMS = {
    1: { name: 'The Roost', map: [150, 26] },
    2: { name: 'Grand Atrium', map: [150, 92] },
    3: { name: 'West Hall', map: [70, 160] },
    4: { name: 'West Corner', map: [70, 222] },
    5: { name: 'East Hall', map: [230, 160] },
    6: { name: 'East Corner', map: [230, 222] },
    7: { name: 'Songbird Parlor', map: [26, 92] },
    8: { name: 'Wishing Pond', map: [274, 92] },
    9: { name: 'Dovecote', map: [274, 26] },
  };

  // Where each character stands on each camera (room coords, feet position).
  const SPOTS = {
    raven: { 2: [540, 610, 0.62], 3: [860, 600, 0.55], 4: [760, 820, 1.25] },
    eagle: { 1: [800, 560, 0.72], 5: [820, 700, 0.95], 6: [700, 820, 1.25] },
    cardinal: { 7: [1135, 470, 0.42], 6: [900, 560, 0.7] },
    dove: { 9: [800, 575, 0.62] },
    crane: { 8: [[1060, 470, 0.36], [700, 590, 0.62], [820, 1000, 1.25]], 2: [1180, 520, 0.5] },
    // Kept within x 380-1220 so the Owl stays in frame for the whole camera pan.
    owl: {
      1: [1120, 548, 0.42], 2: [460, 560, 0.5], 3: [640, 560, 0.45], 4: [1000, 720, 0.85], 5: [960, 580, 0.45],
      6: [560, 720, 0.85], 7: [430, 422, 0.38], 8: [1180, 560, 0.5], 9: [520, 342, 0.32],
    },
  };

  const cache = {};
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---------- drawing helpers ----------
  function roomBox(ctx, b, c) {
    // ceiling
    ctx.fillStyle = lg(ctx, 0, 0, 0, b.y0, [[0, c.ceil[0]], [1, c.ceil[1]]]);
    ctx.fillRect(0, 0, ROOM_W, b.y0 + 1);
    // left & right walls
    poly(ctx, [[0, 0], [b.x0, b.y0], [b.x0, b.y1], [0, H]]);
    ctx.fillStyle = lg(ctx, 0, 0, b.x0, 0, [[0, c.side[0]], [1, c.side[1]]]); ctx.fill();
    poly(ctx, [[ROOM_W, 0], [b.x1, b.y0], [b.x1, b.y1], [ROOM_W, H]]);
    ctx.fillStyle = lg(ctx, ROOM_W, 0, b.x1, 0, [[0, c.side[0]], [1, c.side[1]]]); ctx.fill();
    // back wall
    ctx.fillStyle = lg(ctx, 0, b.y0, 0, b.y1, [[0, c.wall[0]], [1, c.wall[1]]]);
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    // floor checker in perspective
    const rows = 9, cols = 12;
    const bx0 = b.x0, bx1 = b.x1, fx0 = -ROOM_W * 0.35, fx1 = ROOM_W * 1.35;
    const rowY = k => b.y1 + (H - b.y1) * Math.pow(k / rows, 1.7);
    for (let k = 0; k < rows; k++) {
      const ya = rowY(k), yb = rowY(k + 1);
      const fa = (ya - b.y1) / (H - b.y1), fb = (yb - b.y1) / (H - b.y1);
      const la = bx0 + (fx0 - bx0) * fa, ra = bx1 + (fx1 - bx1) * fa;
      const lb = bx0 + (fx0 - bx0) * fb, rb = bx1 + (fx1 - bx1) * fb;
      for (let i = 0; i < cols; i++) {
        const u0 = i / cols, u1 = (i + 1) / cols;
        poly(ctx, [[la + (ra - la) * u0, ya], [la + (ra - la) * u1, ya], [lb + (rb - lb) * u1, yb], [lb + (rb - lb) * u0, yb]]);
        ctx.fillStyle = (i + k) % 2 ? c.floorA : c.floorB;
        ctx.fill();
      }
    }
    // edge shading
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y0); ctx.lineTo(ROOM_W, 0);
    ctx.moveTo(0, H); ctx.lineTo(b.x0, b.y1); ctx.lineTo(b.x1, b.y1); ctx.lineTo(ROOM_W, H);
    ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x0, b.y1); ctx.moveTo(b.x1, b.y0); ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
  }

  function wallpaper(ctx, x, y, w, h, color, alpha = 0.12) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = color; ctx.globalAlpha = alpha;
    for (let yy = y; yy < y + h; yy += 40) for (let xx = x + ((yy / 40) % 2) * 20; xx < x + w; xx += 40) {
      ctx.beginPath();
      ctx.moveTo(xx, yy - 8); ctx.lineTo(xx + 6, yy); ctx.lineTo(xx, yy + 8); ctx.lineTo(xx - 6, yy); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function poster(ctx, x, y, w, h, kind, skew = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, skew, 0, 1, 0, 0);
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(80,50,20,.25)'; ctx.fillRect(0, 0, w, h);
    if (kind === 'peace') {
      ctx.fillStyle = '#6f8fb0'; ctx.fillRect(w * 0.06, h * 0.05, w * 0.88, h * 0.62);
      Sprites.draw(ctx, 'dove', w / 2, h * 0.64, h / 900, { halo: false });
      ctx.fillStyle = '#2b2b3a';
      ctx.font = `bold ${Math.round(w * 0.11)}px Georgia`; ctx.textAlign = 'center';
      ctx.fillText('PEACE OF MIND', w / 2, h * 0.8);
      ctx.font = `${Math.round(w * 0.08)}px Georgia`;
      ctx.fillText('at the Halcyon', w / 2, h * 0.92);
    } else if (kind === 'drawing') {
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      const cols = ['#c22', '#222', '#a80', '#ddd', '#aaa'];
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = cols[i];
        const bx = w * (0.15 + i * 0.17), by = h * 0.6;
        ctx.beginPath(); ctx.arc(bx, by, w * 0.06, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by - w * 0.06); ctx.lineTo(bx, by - w * 0.16); ctx.stroke();
      }
      ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.25, w * 0.08, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.33); ctx.lineTo(w * 0.5, h * 0.48); ctx.stroke();
      ctx.fillStyle = '#c22'; ctx.font = `${Math.round(w * 0.12)}px Comic Sans MS, cursive`; ctx.textAlign = 'center';
      ctx.fillText('MY BIRDS', w / 2, h * 0.92);
    } else if (kind === 'aquila') {
      ctx.fillStyle = '#1c2a20'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c9a43a';
      ctx.font = `bold ${Math.round(w * 0.5)}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', w / 2, h * 0.42);
      ctx.font = `${Math.round(w * 0.1)}px Georgia`; ctx.fillText('AQUILA HOLDINGS', w / 2, h * 0.8);
      ctx.font = `${Math.round(w * 0.07)}px Georgia`; ctx.fillText('WE ARE ALWAYS WATCHING OUT FOR YOU', w / 2, h * 0.9);
    } else if (kind === 'halcyon') {
      ctx.fillStyle = '#2a1a14'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8d6a8';
      ctx.font = `bold ${Math.round(w * 0.16)}px Georgia`; ctx.textAlign = 'center';
      ctx.fillText('HALCYON', w / 2, h * 0.3);
      ctx.font = `${Math.round(w * 0.075)}px Georgia`; ctx.fillText('AVIARY OF WONDERS', w / 2, h * 0.42);
      ['raven', 'eagle', 'cardinal', 'dove', 'crane'].forEach((b, i) => Sprites.draw(ctx, b, w * (0.12 + i * 0.19), h * 0.92, h / (b === 'crane' ? 1500 : 1100), { halo: false }));
    }
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  function lamp(ctx, x, y, r = 220, color = '255,220,160', a = 0.25) {
    ctx.fillStyle = rg(ctx, x, y, 2, r, [[0, `rgba(${color},${a})`], [1, `rgba(${color},0)`]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgba(${color},.9)`;
    ell(ctx, x, y, 8, 6); ctx.fill();
  }

  function corridor(ctx, opts) {
    const b = { x0: 620, y0: 230, x1: 980, y1: 470 };
    roomBox(ctx, b, opts.colors);
    wallpaper(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#d4c79a', 0.08);
    // doorway at end
    ctx.fillStyle = '#050505'; ctx.fillRect(740, 290, 120, 180);
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 8; ctx.strokeRect(740, 290, 120, 180);
    // side-wall posters (skewed)
    opts.posters.forEach(([x, y, w, h, kind, skew]) => poster(ctx, x, y, w, h, kind, skew));
    // ceiling lights
    [[800, 250, 180], [800, 120, 300]].forEach(([x, y, r]) => lamp(ctx, x, y, r));
  }

  // ---------- rooms ----------
  const ROOM_DRAW = {
    1(ctx) { // The Roost
      const b = { x0: 300, y0: 120, x1: 1300, y1: 520 };
      roomBox(ctx, b, { ceil: ['#0b0d0b', '#141a14'], side: ['#0e140f', '#1a2a1d'], wall: ['#1b2f20', '#0f1a12'], floorA: '#1f1a14', floorB: '#2c251c' });
      wallpaper(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#c9a43a', 0.1);
      poster(ctx, 690, 150, 220, 250, 'aquila');
      // curtains
      for (const side of [0, 1]) {
        for (let i = 0; i < 6; i++) {
          const x = side ? 1300 - i * 26 : 300 + i * 26;
          ctx.fillStyle = i % 2 ? '#5a0d14' : '#721620';
          ctx.beginPath(); ctx.moveTo(x, 120); ctx.quadraticCurveTo(x + (side ? -20 : 20), 320, x, 520); ctx.lineTo(x + (side ? -26 : 26), 520); ctx.quadraticCurveTo(x + (side ? -6 : 6), 320, x + (side ? -26 : 26), 120); ctx.fill();
        }
      }
      // stage
      ctx.fillStyle = lg(ctx, 0, 520, 0, 600, [[0, '#4a3a26'], [1, '#1f160c']]);
      ctx.beginPath(); ctx.moveTo(380, 520); ctx.lineTo(1220, 520); ctx.lineTo(1290, 600); ctx.lineTo(310, 600); ctx.fill();
      ctx.fillStyle = '#c9a43a'; ctx.fillRect(310, 598, 980, 6);
      // perch
      ctx.fillStyle = lg(ctx, 0, 548, 0, 570, [[0, '#e3c46a'], [1, '#6d5214']]);
      ctx.fillRect(600, 548, 400, 18);
      ctx.fillRect(640, 560, 14, 50); ctx.fillRect(946, 560, 14, 50);
      // spotlight cone
      ctx.fillStyle = lg(ctx, 0, 0, 0, 600, [[0, 'rgba(255,240,200,.18)'], [1, 'rgba(255,240,200,.04)']]);
      ctx.beginPath(); ctx.moveTo(760, 0); ctx.lineTo(840, 0); ctx.lineTo(1040, 600); ctx.lineTo(560, 600); ctx.fill();
    },
    2(ctx) { // Grand Atrium
      const b = { x0: 220, y0: 60, x1: 1380, y1: 470 };
      roomBox(ctx, b, { ceil: ['#05070c', '#0b1220'], side: ['#0b0f16', '#171e2a'], wall: ['#141c2a', '#0c111a'], floorA: '#202326', floorB: '#2e3236' });
      // arched glass dome windows
      for (let i = 0; i < 5; i++) {
        const x = 300 + i * 220, y = 100, w = 160, h = 280;
        ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [[0, '#2a3e66'], [1, '#0e1628']]);
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 70); ctx.arc(x + w / 2, y + 70, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.fill();
        ctx.strokeStyle = '#3c3428'; ctx.lineWidth = 5; ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + w / 2, y - 10); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + 150); ctx.lineTo(x + w, y + 150); ctx.stroke();
      }
      // moon
      ctx.fillStyle = rg(ctx, 1040, 160, 4, 90, [[0, 'rgba(230,240,255,.9)'], [0.25, 'rgba(200,220,255,.4)'], [1, 'rgba(200,220,255,0)']]);
      ctx.fillRect(950, 70, 180, 180);
      // moonbeam
      ctx.fillStyle = 'rgba(160,190,255,.07)';
      ctx.beginPath(); ctx.moveTo(980, 120); ctx.lineTo(1100, 120); ctx.lineTo(900, 720); ctx.lineTo(560, 720); ctx.fill();
      // fountain
      ctx.fillStyle = '#3b3f45'; ell(ctx, 800, 560, 260, 60); ctx.fill();
      ctx.fillStyle = '#16191d'; ell(ctx, 800, 550, 230, 46); ctx.fill();
      ctx.fillStyle = '#4a4f56'; ctx.fillRect(785, 420, 30, 130);
      ctx.fillStyle = '#555b63'; ell(ctx, 800, 420, 70, 16); ctx.fill();
      // chandelier
      ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(800, 0); ctx.lineTo(800, 120); ctx.stroke();
      ctx.strokeStyle = '#8a6f30';
      ctx.beginPath(); ell(ctx, 800, 130, 120, 22); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.fillStyle = 'rgba(255,220,150,.5)'; ell(ctx, 800 + Math.cos(a) * 120, 130 + Math.sin(a) * 22, 4, 7); ctx.fill(); }
    },
    3(ctx) {
      corridor(ctx, {
        colors: { ceil: ['#0a0907', '#17130e'], side: ['#1c150e', '#2c2216'], wall: ['#2a2016', '#181209'], floorA: '#2a2a2a', floorB: '#151515' },
        posters: [[180, 220, 150, 210, 'peace', 0.22], [1270, 240, 140, 190, 'drawing', -0.2]],
      });
    },
    4(ctx) { // West Corner
      const b = { x0: 460, y0: 160, x1: 1300, y1: 560 };
      roomBox(ctx, b, { ceil: ['#060504', '#120f0b'], side: ['#16110b', '#271e14'], wall: ['#2a1f15', '#150f09'], floorA: '#262626', floorB: '#111' });
      wallpaper(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#d4c79a', 0.07);
      ctx.fillStyle = '#030303'; ctx.fillRect(1320, 150, 200, 500);
      ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 10; ctx.strokeRect(1320, 150, 200, 500);
      poster(ctx, 560, 230, 170, 230, 'drawing');
      ctx.fillStyle = '#333'; ctx.fillRect(820, 0, 4, 140);
    },
    5(ctx) {
      corridor(ctx, {
        colors: { ceil: ['#07090a', '#0f1416'], side: ['#0e1416', '#1b2528'], wall: ['#1e2a2c', '#0f1617'], floorA: '#262626', floorB: '#131313' },
        posters: [[180, 220, 150, 210, 'aquila', 0.22], [1270, 240, 140, 190, 'peace', -0.2]],
      });
    },
    6(ctx) { // East Corner
      const b = { x0: 300, y0: 160, x1: 1140, y1: 560 };
      roomBox(ctx, b, { ceil: ['#050607', '#0e1214'], side: ['#0e1416', '#1b2528'], wall: ['#1d282a', '#0e1415'], floorA: '#232323', floorB: '#101010' });
      ctx.fillStyle = '#030303'; ctx.fillRect(80, 150, 200, 500);
      ctx.strokeStyle = '#2a3236'; ctx.lineWidth = 10; ctx.strokeRect(80, 150, 200, 500);
      poster(ctx, 850, 220, 180, 240, 'halcyon');
      ctx.fillStyle = '#333'; ctx.fillRect(760, 0, 4, 140);
    },
    7(ctx) { // Songbird Parlor
      const b = { x0: 260, y0: 110, x1: 1340, y1: 500 };
      roomBox(ctx, b, { ceil: ['#0c0405', '#1c0a0c'], side: ['#22070b', '#3a0f15'], wall: ['#3d1016', '#22080c'], floorA: '#2b1a12', floorB: '#3a2418' });
      wallpaper(ctx, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#e0b060', 0.12);
      // portrait of Celia
      ctx.fillStyle = '#6d5214'; ctx.fillRect(430, 160, 170, 220);
      ctx.fillStyle = '#20140c'; ctx.fillRect(442, 172, 146, 196);
      ctx.fillStyle = '#7a6250'; ell(ctx, 515, 250, 38, 48); ctx.fill();
      ctx.fillStyle = '#3a2216'; ctx.beginPath(); ctx.arc(515, 236, 46, Math.PI, 0); ctx.fill(); ctx.fillRect(469, 236, 18, 80); ctx.fillRect(543, 236, 18, 80);
      ctx.fillStyle = '#5a1c22'; ctx.fillRect(470, 300, 90, 68);
      ctx.fillStyle = '#c9a43a'; ctx.font = '13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('CELIA WREN', 515, 392);
      // piano
      ctx.fillStyle = '#0d0907'; ctx.fillRect(160, 420, 300, 170);
      ctx.fillStyle = '#e8e2d0'; ctx.fillRect(180, 470, 260, 26);
      ctx.fillStyle = '#0d0907'; for (let i = 0; i < 18; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(192 + i * 14, 470, 7, 15);
      // pedestal for music box
      ctx.fillStyle = lg(ctx, 700, 0, 900, 0, [[0, '#2a1c12'], [0.5, '#5a4028'], [1, '#2a1c12']]);
      ctx.fillRect(710, 470, 180, 170);
      ctx.fillStyle = '#6d5214'; ctx.fillRect(696, 460, 208, 14);
      // birdcage
      ctx.strokeStyle = '#b08a2a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(1135, 220); ctx.lineTo(1135, 250); ctx.stroke();
      for (let i = 0; i <= 12; i++) {
        const x = 1035 + i * (200 / 12);
        ctx.beginPath(); ctx.moveTo(x, 490); ctx.lineTo(x, 330); ctx.quadraticCurveTo(x + (1135 - x) * 0.5, 250, 1135, 250); ctx.stroke();
      }
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1030, 490); ctx.lineTo(1240, 490); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1035, 400); ctx.lineTo(1235, 400); ctx.stroke();
      ctx.fillStyle = '#3a2a14'; ctx.fillRect(1100, 490, 70, 140);
      lamp(ctx, 800, 130, 360, '255,190,140', 0.22);
    },
    8(ctx) { // Wishing Pond
      const b = { x0: 160, y0: 80, x1: 1440, y1: 380 };
      roomBox(ctx, b, { ceil: ['#030608', '#061014'], side: ['#071216', '#0e1e22'], wall: ['#0d1c20', '#081215'], floorA: '#1a2224', floorB: '#121819' });
      // painted mural of a sky full of cranes
      ctx.fillStyle = lg(ctx, 0, 80, 0, 380, [[0, '#0f2230'], [1, '#183238']]);
      ctx.fillRect(160, 80, 1280, 300);
      for (let i = 0; i < 40; i++) Sprites.paperCrane(ctx, 200 + ((i * 131) % 1200), 110 + ((i * 71) % 220), 0.8 + (i % 3) * 0.3, (i % 5) * 0.1, 'rgba(230,225,210,.35)');
      // pond
      ctx.fillStyle = '#5b5850'; ell(ctx, 800, 560, 760, 190); ctx.fill();
      ctx.fillStyle = lg(ctx, 0, 380, 0, 740, [[0, '#0d2a33'], [1, '#04121a']]);
      ell(ctx, 800, 560, 720, 165); ctx.fill();
      // reeds
      ctx.strokeStyle = '#1f3a22'; ctx.lineWidth = 4;
      for (let i = 0; i < 30; i++) {
        const x = i < 15 ? 120 + i * 14 : 1300 + (i - 15) * 14, y = 600 + (i % 4) * 20;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 120, x + ((i % 3) - 1) * 30, y - 220 - (i % 5) * 20); ctx.stroke();
      }
      // coins
      for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(200,170,90,.35)'; ell(ctx, 300 + ((i * 97) % 1000), 540 + ((i * 53) % 130), 6, 3); ctx.fill(); }
    },
    9(ctx) { // Dovecote
      const b = { x0: 250, y0: 90, x1: 1350, y1: 500 };
      roomBox(ctx, b, { ceil: ['#0c0c0e', '#18181c'], side: ['#18181c', '#2a2a30'], wall: ['#2e2e34', '#1c1c20'], floorA: '#2c2c2e', floorB: '#222224' });
      // cubbies
      for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) {
        const x = 290 + c * 86, y = 120 + r * 74;
        ctx.fillStyle = '#d8d6cf'; ctx.fillRect(x, y, 78, 66);
        ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.moveTo(x + 14, y + 66); ctx.lineTo(x + 14, y + 30); ctx.arc(x + 39, y + 30, 25, Math.PI, 0); ctx.lineTo(x + 64, y + 66); ctx.fill();
      }
      // window light
      ctx.fillStyle = 'rgba(220,230,255,.08)';
      ctx.beginPath(); ctx.moveTo(1180, 0); ctx.lineTo(1340, 0); ctx.lineTo(1040, 720); ctx.lineTo(700, 720); ctx.fill();
      // perch stand
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(790, 575, 20, 120); ctx.fillRect(700, 575, 200, 12); ctx.fillRect(740, 690, 120, 14);
      // feathers on floor
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(240,240,240,.6)'; ell(ctx, 300 + ((i * 113) % 1000), 560 + ((i * 41) % 150), 10, 3, (i % 7) * 0.5); ctx.fill(); }
      ctx.fillStyle = '#e8e6df'; ctx.font = 'bold 30px Georgia'; ctx.textAlign = 'center';
    },
  };

  // ---------- office ----------
  const OFFICE = {
    leftDoor: { x0: 70, x1: 330, y0: 120, y1: 640 },
    rightDoor: { x0: 1590, x1: 1850, y0: 120, y1: 640 },
    win: { x0: 740, x1: 1180, y0: 110, y1: 400 },
    buttons: {
      leftDoor: [355, 300, 54, 54], leftLight: [355, 370, 54, 54],
      rightDoor: [1500, 300, 54, 54], rightLight: [1500, 370, 54, 54],
    },
    paper: [1030, 560, 170, 80],
  };

  function buildOffice() {
    const c = mk(OFFICE_W, H), ctx = c.getContext('2d');
    // walls
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [[0, '#121614'], [0.6, '#1d2420'], [1, '#0b0d0c']]);
    ctx.fillRect(0, 0, OFFICE_W, H);
    // tiles on lower wall
    for (let y = 430; y < 620; y += 30) for (let x = 0; x < OFFICE_W; x += 30) {
      ctx.fillStyle = ((x + y) / 30) % 2 ? '#26302b' : '#1e2723';
      ctx.fillRect(x + 1, y + 1, 28, 28);
    }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 424, OFFICE_W, 8);
    wallpaper(ctx, 0, 0, OFFICE_W, 424, '#a9c4a0', 0.06);
    // ceiling band + pipes
    ctx.fillStyle = '#0a0b0a'; ctx.fillRect(0, 0, OFFICE_W, 60);
    ctx.fillStyle = lg(ctx, 0, 62, 0, 80, [[0, '#3a3a3a'], [1, '#151515']]); ctx.fillRect(0, 64, OFFICE_W, 14);
    // floor
    ctx.fillStyle = lg(ctx, 0, 620, 0, H, [[0, '#1c1a17'], [1, '#0a0908']]); ctx.fillRect(0, 620, OFFICE_W, 100);
    // window frame
    const w = OFFICE.win;
    ctx.fillStyle = '#2a2018'; ctx.fillRect(w.x0 - 20, w.y0 - 20, w.x1 - w.x0 + 40, w.y1 - w.y0 + 40);
    ctx.clearRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
    // posters
    poster(ctx, 470, 150, 190, 250, 'peace');
    poster(ctx, 1260, 140, 220, 260, 'halcyon');
    poster(ctx, 1010 - 520, 440, 90, 120, 'drawing');
    // door frames
    for (const d of [OFFICE.leftDoor, OFFICE.rightDoor]) {
      ctx.fillStyle = '#3a3a36'; ctx.fillRect(d.x0 - 22, d.y0 - 22, d.x1 - d.x0 + 44, d.y1 - d.y0 + 22);
      ctx.fillStyle = '#26261f';
      for (let y = d.y0 - 10; y < d.y1; y += 40) { ctx.fillRect(d.x0 - 18, y, 10, 4); ctx.fillRect(d.x1 + 8, y, 10, 4); }
      ctx.clearRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    }
    // button panels
    for (const k of ['left', 'right']) {
      const b = OFFICE.buttons[k + 'Door'];
      ctx.fillStyle = '#2a2a28'; ctx.fillRect(b[0] - 12, b[1] - 14, 78, 156);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(b[0] - 12, b[1] - 14, 78, 156);
    }
    // desk
    ctx.fillStyle = lg(ctx, 0, 540, 0, 720, [[0, '#4a3624'], [0.08, '#3a2a1b'], [1, '#160f09']]);
    ctx.beginPath(); ctx.moveTo(560, 540); ctx.lineTo(1360, 540); ctx.lineTo(1440, 720); ctx.lineTo(480, 720); ctx.fill();
    ctx.fillStyle = '#5a4430'; ctx.fillRect(560, 536, 800, 8);
    // phone
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(640, 570, 110, 50);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(630, 556, 130, 22);
    ctx.fillStyle = '#7a1a1a'; ell(ctx, 735, 598, 6, 6); ctx.fill();
    // CRT monitor
    ctx.fillStyle = '#2a2824'; ctx.fillRect(800, 450, 200, 120);
    ctx.fillStyle = '#0c120e'; ctx.fillRect(816, 464, 168, 90);
    ctx.fillStyle = '#211f1b'; ctx.fillRect(870, 570, 60, 14);
    // cup
    ctx.fillStyle = '#c8c0b0'; ctx.fillRect(1225, 570, 34, 42);
    ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1263, 590, 9, -1.2, 1.2); ctx.stroke();
    // paper stack (fold station)
    const p = OFFICE.paper;
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#e8e2d2' : '#f4efe2'; ctx.fillRect(p[0] + i, p[1] + 30 - i * 3, p[2] - 20, 40); }
    ctx.fillStyle = '#6a5a40'; ctx.font = '15px Special Elite, Georgia'; ctx.textAlign = 'center';
    ctx.fillText('FOLD', p[0] + 75, p[1] + 60);
    // hanging crane strings
    for (let s = 0; s < 9; s++) {
      const x = 120 + s * 210 + (s > 3 ? 40 : 0);
      ctx.strokeStyle = 'rgba(200,190,170,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 78); ctx.lineTo(x, 78 + 40 + (s % 3) * 26 + 4 * 22); ctx.stroke();
      for (let k = 0; k < 4 + (s % 3); k++) Sprites.paperCrane(ctx, x, 100 + k * 22, 0.9, 0, k % 3 === 0 ? '#c8bfa8' : '#e4ddcc');
    }
    cache.office = c;
  }

  function buildRooms() {
    for (const id of Object.keys(ROOM_DRAW)) {
      const c = mk(ROOM_W, H), ctx = c.getContext('2d');
      ROOM_DRAW[id](ctx);
      cache['room' + id] = c;
    }
    // static noise frames
    cache.noise = [];
    for (let k = 0; k < 6; k++) {
      const c = mk(320, 180), ctx = c.getContext('2d');
      const img = ctx.createImageData(320, 180);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      cache.noise.push(c);
    }
    // scanlines
    const s = mk(W, H), sctx = s.getContext('2d');
    sctx.fillStyle = 'rgba(0,0,0,.22)';
    for (let y = 0; y < H; y += 3) sctx.fillRect(0, y, W, 1);
    cache.scan = s;
  }

  function init() {
    buildRooms();
    buildOffice();
    cache.view = mk(W, H);
  }

  // ---------- camera feed ----------
  function charactersOn(cam, s) {
    const list = [];
    const t = s.time;
    if (s.raven.pos === cam && SPOTS.raven[cam]) list.push(['raven', SPOTS.raven[cam], { t, look: s.raven.look, twitch: s.glitch * 0.1 }]);
    if (cam === 1 && s.eagle.phase === 'roost') list.push(['eagle', SPOTS.eagle[1], { t, fury: s.eagle.fury / 100 }]);
    if ((cam === 5 && s.eagle.phase === 'run5') || (cam === 6 && s.eagle.phase === 'run6')) list.push(['eagle', SPOTS.eagle[cam], { t, fury: 1, blur: true }]);
    if (cam === 7 && s.cardinal.phase === 'cage') list.push(['cardinal', SPOTS.cardinal[7], { t, keySpin: s.cardinal.keySpin, look: s.cardinal.box < 30 ? 0 : Math.sin(t * 0.3) }]);
    if (cam === 6 && s.cardinal.phase === 'out') list.push(['cardinal', SPOTS.cardinal[6], { t, pose: 'attack' }]);
    if (cam === 9 && s.dove.phase === 'cote') list.push(['dove', SPOTS.dove[9], { t }]);
    if (cam === 8 && s.crane.stage <= 2) list.push(['crane', SPOTS.crane[8][s.crane.stage], { t }]);
    if (cam === 2 && s.crane.stage === 3) list.push(['crane', SPOTS.crane[2], { t, look: 0.5 }]);
    if (s.owl && s.owl.cam === cam) list.push(['owl', SPOTS.owl[cam], { t, turn: s.owl.turn, twitch: s.owl.turn > 0.7 ? (Math.random() - 0.5) * 0.04 : 0 }]);
    if (s.wiseOwl && s.wiseOwl.loc === 'cam' && s.wiseOwl.cam === cam) list.push(['owl', SPOTS.owl[cam], { t, turn: 1, twitch: (Math.random() - 0.5) * 0.03 }]);
    return list;
  }

  function drawCam(ctx, cam, s, pan) {
    const t = s.time;
    ctx.save();
    ctx.translate(-pan, 0);
    ctx.drawImage(cache['room' + cam], 0, 0);

    if (cam === 7) drawMusicBox(ctx, s);
    if (cam === 8) drawPondRipples(ctx, t);

    const eyes = [];
    for (const [id, [x, y, sc], opts] of charactersOn(cam, s)) {
      if (opts.blur) {
        for (let k = 3; k >= 1; k--) Sprites.draw(ctx, id, x - k * 60, y, sc, { ...opts, alpha: 0.18 });
      }
      eyes.push(...Sprites.draw(ctx, id, x, y, sc, opts));
    }
    if (cam === 7 && s.cardinal.phase !== 'cage') {
      ctx.fillStyle = '#000'; ctx.fillRect(1100, 400, 70, 90);
    }
    // hidden paper crane
    const hc = s.hiddenCrane;
    if (hc && !hc.found && hc.cam === cam) {
      Sprites.paperCrane(ctx, hc.x, hc.y, 1.25, 0.2, '#f6f1e2');
      ctx.fillStyle = `rgba(255,250,230,${0.06 + Math.sin(t * 3) * 0.04})`;
      ell(ctx, hc.x + 4, hc.y - 4, 30, 22); ctx.fill();
    }

    // darkness: vignette spotlight per room
    ctx.restore();
    const dark = ctx.createRadialGradient(W / 2, H * 0.48, 120, W / 2, H / 2, 820);
    dark.addColorStop(0, 'rgba(0,0,0,.15)');
    dark.addColorStop(1, 'rgba(0,0,0,.92)');
    ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
    Sprites.drawEyes(ctx, eyes, 0.9);

    // camera tint
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = s.dove.phase === 'office' || s.dove.phase === 'landing' ? '#f2ead8' : '#b9d4c2';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawMusicBox(ctx, s) {
    const box = s.cardinal.box;
    const x = 800, y = 460;
    ctx.fillStyle = lg(ctx, x - 90, 0, x + 90, 0, [[0, '#3a240f'], [0.5, '#7a5228'], [1, '#3a240f']]);
    ctx.fillRect(x - 85, y - 70, 170, 70);
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(x - 85, y - 74, 170, 6); ctx.fillRect(x - 85, y - 4, 170, 4);
    // lid open with tiny dancing bird
    ctx.fillStyle = '#5a3a1c';
    ctx.beginPath(); ctx.moveTo(x - 85, y - 74); ctx.lineTo(x + 85, y - 74); ctx.lineTo(x + 70, y - 150); ctx.lineTo(x - 70, y - 150); ctx.fill();
    ctx.fillStyle = '#2a1608'; ctx.fillRect(x - 64, y - 142, 128, 60);
    const spin = s.cardinal.keySpin;
    ctx.save();
    ctx.translate(x, y - 74);
    ctx.scale(Math.cos(spin * 2), 1);
    Sprites.draw(ctx, 'cardinal', 0, 0, 0.12, { t: s.time, halo: false });
    ctx.restore();
    // gauge
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 70, y - 54, 140, 16);
    ctx.fillStyle = box > 50 ? '#5fbf6a' : box > 25 ? '#d9b23a' : '#d9453a';
    ctx.fillRect(x - 68, y - 52, 136 * box / 100, 12);
  }

  function drawPondRipples(ctx, t) {
    ctx.save();
    ctx.beginPath(); ell(ctx, 800, 560, 720, 165); ctx.clip();
    ctx.strokeStyle = 'rgba(160,200,220,.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const r = ((t * 40 + i * 70) % 420);
      ctx.globalAlpha = 1 - r / 420;
      ell(ctx, 1020, 520, r, r * 0.22); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(220,235,255,.18)';
    ell(ctx, 1040 + Math.sin(t) * 6, 600, 60, 10); ctx.fill();
    ctx.restore();
  }

  function noiseFrame(t, rate = 30) {
    const n = cache.noise.length;
    return cache.noise[((Math.floor(t * rate) % n) + n) % n];
  }

  function camOverlay(ctx, s, cam, staticAmt) {
    const t = s.time;
    const n = noiseFrame(t);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.07 + staticAmt);
    ctx.drawImage(n, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.drawImage(cache.scan, 0, (t * 40) % 3);
    // rolling band
    const by = (t * 120) % (H + 200) - 100;
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, by, W, 60);
    ctx.restore();
    // frame & labels
    ctx.strokeStyle = 'rgba(220,230,220,.5)'; ctx.lineWidth = 2;
    const m = 30, l = 40;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + dy * l); ctx.lineTo(x, y); ctx.lineTo(x + dx * l, y); ctx.stroke();
    });
    ctx.fillStyle = '#e9efe6'; ctx.font = '34px VT323, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`CAM ${cam}  ${ROOMS[cam].name.toUpperCase()}`, 56, 74);
    if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#e22'; ell(ctx, 66, 106, 9, 9); ctx.fill(); }
    ctx.fillStyle = '#e9efe6'; ctx.font = '26px VT323, monospace'; ctx.fillText('REC', 84, 114);
  }

  // ---------- office ----------
  function drawOffice(ctx, s, scroll) {
    const v = cache.view, vctx = v.getContext('2d');
    const t = s.time;
    vctx.save();
    vctx.clearRect(0, 0, W, H);
    vctx.translate(-scroll, 0);
    const eyes = [];
    const powered = !s.powerOut;

    // window: atrium beyond
    const w = OFFICE.win;
    vctx.save();
    vctx.beginPath(); vctx.rect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0); vctx.clip();
    vctx.fillStyle = lg(vctx, 0, w.y0, 0, w.y1, [[0, '#0e1830'], [1, '#05080f']]);
    vctx.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
    vctx.fillStyle = 'rgba(150,180,255,.07)';
    vctx.beginPath(); vctx.moveTo(w.x0 + 260, w.y0); vctx.lineTo(w.x0 + 340, w.y0); vctx.lineTo(w.x0 + 200, w.y1); vctx.lineTo(w.x0 + 80, w.y1); vctx.fill();
    if (s.wiseOwl && s.wiseOwl.loc === 'window') {
      eyes.push(...Sprites.draw(vctx, 'owl', 960, w.y1 + 330, 1.25, { t, turn: 1 }));
    } else if (s.crane.stage === 4) {
      eyes.push(...Sprites.draw(vctx, 'crane', 960 + Math.sin(t * 0.5) * 20, w.y1 + 200, 0.7, { t, glow: 0.3 }));
    } else if (s.crane.stage === 3) {
      vctx.globalAlpha = 0.5;
      eyes.push(...Sprites.draw(vctx, 'crane', 1090, w.y1 + 40, 0.22, { t }));
      vctx.globalAlpha = 1;
    }
    vctx.fillStyle = 'rgba(0,0,0,.35)'; vctx.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
    // glass glare
    vctx.fillStyle = 'rgba(255,255,255,.04)';
    vctx.beginPath(); vctx.moveTo(w.x0, w.y0); vctx.lineTo(w.x0 + 120, w.y0); vctx.lineTo(w.x0, w.y0 + 140); vctx.fill();
    vctx.restore();
    // window bars
    vctx.fillStyle = '#20180f';
    for (let i = 1; i < 4; i++) vctx.fillRect(w.x0 + i * (w.x1 - w.x0) / 4 - 4, w.y0, 8, w.y1 - w.y0);
    vctx.fillRect(w.x0, (w.y0 + w.y1) / 2 - 4, w.x1 - w.x0, 8);

    // doorways
    drawDoorway(vctx, OFFICE.leftDoor, 'left', s, eyes);
    drawDoorway(vctx, OFFICE.rightDoor, 'right', s, eyes);

    vctx.drawImage(cache.office, 0, 0);

    // buttons
    for (const side of ['left', 'right']) {
      const bd = OFFICE.buttons[side + 'Door'], bl = OFFICE.buttons[side + 'Light'];
      button(vctx, bd, powered && s.doors[side].closed ? '#ff3a2a' : '#5a1410', 'DOOR');
      button(vctx, bl, powered && s.lights[side] ? '#f4f0d8' : '#3a3a34', 'LIGHT');
    }

    // fan
    const fx = 1320, fy = 520;
    vctx.fillStyle = '#1e1e1e'; vctx.fillRect(fx - 8, fy, 16, 40); vctx.fillRect(fx - 40, fy + 36, 80, 10);
    vctx.save(); vctx.translate(fx, fy - 10);
    vctx.strokeStyle = '#444'; vctx.lineWidth = 2; vctx.beginPath(); vctx.arc(0, 0, 46, 0, Math.PI * 2); vctx.stroke();
    if (powered) vctx.rotate(t * 25);
    vctx.fillStyle = 'rgba(80,80,80,.85)';
    for (let i = 0; i < 3; i++) { vctx.rotate(Math.PI * 2 / 3); ell(vctx, 22, 0, 22, 9); vctx.fill(); }
    vctx.restore();

    // folded cranes on desk
    for (let i = 0; i < Math.min(s.folded, 24); i++) {
      Sprites.paperCrane(vctx, 1150 + (i % 6) * 22 - (i % 2) * 6, 662 - Math.floor(i / 6) * 10 + (i % 3) * 4, 1, (i % 4) * 0.2 - 0.3);
    }
    // folding animation
    if (s.fold.active) {
      const p = s.fold.progress;
      const px = OFFICE.paper[0] + 80, py = OFFICE.paper[1] + 10;
      vctx.save(); vctx.translate(px, py);
      vctx.rotate(Math.sin(p * 18) * 0.15);
      vctx.scale(1.6 - p * 0.6, 1.6 - p * 0.6);
      vctx.fillStyle = '#f6f1e2';
      if (p < 0.5) {
        const k = 1 - p * 1.4;
        poly(vctx, [[-30 * k, -30 * k], [30 * k, -30 * k], [30 * k, 30 * k * (1 - p)], [-30 * k, 30 * k]]); vctx.fill();
      } else {
        Sprites.paperCrane(vctx, 0, 0, 1.4 + (p - 0.5) * 2, 0);
      }
      vctx.restore();
      vctx.fillStyle = 'rgba(0,0,0,.6)'; vctx.fillRect(px - 80, py - 70, 160, 12);
      vctx.fillStyle = '#efe6d0'; vctx.fillRect(px - 78, py - 68, 156 * p, 8);
    }

    // the Dove visiting
    if (s.dove.phase === 'office' || s.dove.phase === 'landing' || s.dove.phase === 'leaving') {
      const k = s.dove.phase === 'landing' ? s.dove.anim : s.dove.phase === 'leaving' ? 1 - s.dove.anim : 1;
      const dy = (1 - k) * -300;
      vctx.globalAlpha = Math.min(1, k * 1.3);
      eyes.push(...Sprites.draw(vctx, 'dove', 905, 560 + dy, 0.6, { t, weep: s.dove.weep }));
      vctx.globalAlpha = 1;
    }

    if (s.wiseOwl && s.wiseOwl.loc === 'office') {
      eyes.push(...Sprites.draw(vctx, 'owl', 960, 760, 1.5, { t, turn: 1, twitch: (Math.random() - 0.5) * 0.02 }));
    }

    // lighting
    if (powered) {
      vctx.fillStyle = rg(vctx, 960, 60, 40, 900, [[0, 'rgba(255,230,180,.12)'], [0.5, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,.7)']]);
      vctx.fillRect(0, 0, OFFICE_W, H);
      // ceiling lamp
      vctx.fillStyle = '#222'; vctx.fillRect(956, 0, 8, 70);
      vctx.fillStyle = '#3a3a30'; vctx.beginPath(); vctx.moveTo(910, 90); vctx.lineTo(1010, 90); vctx.lineTo(985, 66); vctx.lineTo(935, 66); vctx.fill();
      const flick = s.lampFlicker;
      vctx.fillStyle = `rgba(255,230,170,${0.9 * flick})`; ell(vctx, 960, 92, 40, 6); vctx.fill();
      if (s.dove.phase === 'office') {
        vctx.fillStyle = 'rgba(255,240,215,.2)'; vctx.fillRect(0, 0, OFFICE_W, H);
      } else if (s.dove.phase === 'arriving') {
        const k = s.dove.anim * (0.75 + Math.sin(t * 9) * 0.25);
        vctx.fillStyle = rg(vctx, 960, 0, 20, 700, [[0, `rgba(255,244,220,${0.35 * k})`], [1, 'rgba(255,244,220,0)']]);
        vctx.fillRect(0, 0, OFFICE_W, H);
      }
    } else {
      vctx.fillStyle = 'rgba(0,0,0,.93)'; vctx.fillRect(0, 0, OFFICE_W, H);
      if (s.powerOutEyes > 0) {
        eyes.length = 0;
        const d = OFFICE.leftDoor;
        const ex = (d.x0 + d.x1) / 2 - scroll;
        eyes.push({ x: ex - 22, y: 330, r: 9, color: '#d9e6ff', core: '#fff' }, { x: ex + 22, y: 330, r: 9, color: '#d9e6ff', core: '#fff' });
      }
    }
    // feathers drifting
    for (const f of s.feathers) {
      vctx.save(); vctx.translate(f.x, f.y); vctx.rotate(f.r);
      vctx.fillStyle = f.color; vctx.globalAlpha = f.a;
      ell(vctx, 0, 0, 12, 3.5); vctx.fill();
      vctx.restore();
    }
    vctx.globalAlpha = 1;
    vctx.restore();
    Sprites.drawEyes(vctx, eyes, powered ? 1 : (s.powerOutEyes || 0));

    // lens warp to screen
    if (s.settings.warp) {
      const strip = 8;
      for (let x = 0; x < W; x += strip) {
        const d = (x + strip / 2 - W / 2) / (W / 2);
        const sc = 1 + 0.085 * d * d;
        const hh = H * sc;
        ctx.drawImage(v, x, 0, strip, H, x, (H - hh) / 2, strip, hh);
      }
    } else {
      ctx.drawImage(v, 0, 0);
    }
  }

  function button(ctx, [x, y, w, h], color, label) {
    ctx.fillStyle = '#111'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = rg(ctx, x + w * 0.4, y + h * 0.35, 2, w * 0.8, [[0, '#fff8'], [0.25, color], [1, '#000']]);
    ell(ctx, x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 4); ctx.fill();
    ctx.fillStyle = '#9a9488'; ctx.font = '13px VT323, monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 15);
  }

  function drawDoorway(ctx, d, side, s, eyes) {
    const lit = s.lights[side] && !s.powerOut;
    const w = d.x1 - d.x0, h = d.y1 - d.y0;
    ctx.save();
    ctx.beginPath(); ctx.rect(d.x0, d.y0, w, h); ctx.clip();
    if (lit) {
      ctx.fillStyle = lg(ctx, 0, d.y0, 0, d.y1, [[0, '#4a4a3c'], [1, '#2a2620']]);
      ctx.fillRect(d.x0, d.y0, w, h);
      ctx.fillStyle = '#3a3630'; ctx.fillRect(d.x0, d.y1 - 120, w, 120);
      ctx.fillStyle = '#26231f';
      for (let i = 0; i < 6; i++) ctx.fillRect(d.x0, d.y1 - 120 + i * 22, w, 2);
    } else {
      ctx.fillStyle = '#020202'; ctx.fillRect(d.x0, d.y0, w, h);
    }
    const cx = (d.x0 + d.x1) / 2;
    const owlHere = s.wiseOwl && s.wiseOwl.loc === side;
    const who = owlHere ? 'owl' : side === 'left' ? (s.raven.pos === 'door' ? 'raven' : null) : (s.eagle.phase === 'door' || s.eagle.phase === 'bang' ? 'eagle' : null);
    if (who) {
      const scale = { eagle: 1.02, raven: 1.08, owl: 1.15 }[who];
      const e = Sprites.draw(ctx, who, cx + (side === 'left' ? 10 : -10), d.y1 + 30, scale, { t: s.time, fury: 1, turn: 1, pose: s.eagle.phase === 'bang' && who === 'eagle' ? 'attack' : undefined });
      if (lit) eyes.push(...e);
      else if (who === 'raven' || who === 'owl') { ctx.fillStyle = 'rgba(0,0,0,.96)'; ctx.fillRect(d.x0, d.y0, w, h); eyes.push(...e.map(x => ({ ...x, r: x.r * 0.5 }))); }
      else { ctx.fillStyle = 'rgba(0,0,0,.96)'; ctx.fillRect(d.x0, d.y0, w, h); }
      if (lit) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(d.x0, d.y0, w, h); }
    }
    if (lit) {
      ctx.fillStyle = rg(ctx, cx, d.y0 + 40, 10, 420, [[0, 'rgba(255,245,200,.25)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(d.x0, d.y0, w, h);
    }
    // shutter
    const k = s.doors[side].anim;
    if (k > 0.001) {
      const sh = h * k;
      ctx.fillStyle = lg(ctx, d.x0, 0, d.x1, 0, [[0, '#3a3a3a'], [0.5, '#6a6a68'], [1, '#2e2e2e']]);
      ctx.fillRect(d.x0, d.y0, w, sh);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      for (let y = d.y0 + sh - 24; y > d.y0; y -= 24) ctx.fillRect(d.x0, y, w, 3);
      ctx.fillStyle = '#c8a020';
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(d.x0 + i * 46, d.y0 + sh - 16); ctx.fillRect(0, 0, 23, 12); ctx.restore(); }
      ctx.fillStyle = '#111'; for (let i = 0; i < 6; i++) ctx.fillRect(d.x0 + 23 + i * 46, d.y0 + sh - 16, 23, 12);
    }
    ctx.restore();
  }

  function hitOffice(px, py, scroll) {
    const x = px + scroll, y = py;
    const inR = ([bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    for (const [k, r] of Object.entries(OFFICE.buttons)) if (inR(r)) return k;
    if (inR(OFFICE.paper)) return 'paper';
    return null;
  }

  function drawJumpscare(ctx, s, who, k) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const sc = { raven: 1.55, eagle: 1.45, cardinal: 1.9, dove: 2.0, crane: 1.05, owl: 1.75 }[who];
    const lift = { raven: 1180, eagle: 1220, cardinal: 1050, dove: 1060, crane: 1200, owl: 1080 }[who];
    const z = 0.7 + Math.min(1, k * 4) * 0.5;
    const jx = (Math.random() - 0.5) * 40, jy = (Math.random() - 0.5) * 40;
    const eyes = Sprites.draw(ctx, who, W / 2 + jx, lift * z * 0.7 + jy, sc * z, { t: s.time * 8, pose: 'attack', fury: 1, glow: 0.6 });
    ctx.fillStyle = rg(ctx, W / 2, H / 2, 200, 760, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.8)']]);
    ctx.fillRect(0, 0, W, H);
    Sprites.drawEyes(ctx, eyes, 1.3);
    ctx.save(); ctx.globalAlpha = 0.25; ctx.drawImage(cache.noise[Math.floor(Math.random() * 6)], 0, 0, W, H); ctx.restore();
  }

  return { W, H, ROOM_W, OFFICE_W, ROOMS, SPOTS, OFFICE, init, drawCam, camOverlay, drawOffice, hitOffice, drawJumpscare, noiseFrame, cache };
})();
