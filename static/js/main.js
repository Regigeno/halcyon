// Menus, persistence and flow between nights.
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('screen');
  const ctx = canvas.getContext('2d');
  const STORY_BIRDS = ['raven', 'eagle', 'cardinal', 'dove', 'crane'];
  const WISE_NIGHT = 7;
  const SCALE = { raven: 0.44, eagle: 0.38, cardinal: 0.44, dove: 0.44, crane: 0.31, owl: 0.5 };
  const settings = Object.assign({ volume: 80, voice: true, warp: true, shake: true }, JSON.parse(localStorage.getItem('halcyon.settings') || '{}'));
  let data = null;
  let mode = 'menu';
  let lastNight = null;
  const custom = { raven: 5, eagle: 5, cardinal: 5, dove: 5, crane: 5, owl: 0 };

  const owlSeen = () => !!(data && data.birds.owl);
  const birdIds = () => owlSeen() ? [...STORY_BIRDS, 'owl'] : STORY_BIRDS;

  function fit() {
    const k = Math.min(innerWidth / 1280, innerHeight / 720);
    $('stage').style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener('resize', fit);
  fit();

  Scenes.init();
  Game.init(canvas);
  Overtime.init(canvas);

  async function api(path, body) {
    const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    return r.json();
  }

  async function refresh() {
    try {
      data = await api('/api/state');
    } catch (e) {
      data = null;
    }
    renderMenu();
  }

  function applySettings() {
    localStorage.setItem('halcyon.settings', JSON.stringify(settings));
    Sfx.setVolume(settings.volume / 100);
    Sfx.voice = settings.voice;
  }
  applySettings();

  // ---------------- menu ----------------
  function show(id) {
    ['menu', 'archive', 'settings', 'custom', 'overtime', 'message'].forEach(x => $(x).classList.toggle('hidden', x !== id));
  }

  function renderMenu() {
    show('menu');
    mode = 'menu';
    const st = $('menu-stats');
    if (!data) {
      st.innerHTML = '<span style="color:#e66">Cannot reach the aviary server. Start it with <b>python server.py</b>.</span>';
      return;
    }
    const sv = data.save;
    const next = data.next_night;
    const pending = data.pending_overtime;
    $('btn-continue').textContent = pending ? `Continue (Overtime ${pending})` : sv.nights_beaten > 0 ? `Continue (Night ${Math.min(next, 5)})` : 'Continue';
    $('btn-continue').disabled = sv.nights_beaten === 0;
    $('btn-night6').classList.toggle('hidden', sv.nights_beaten < 5);
    $('btn-custom').classList.toggle('hidden', !data.custom_unlocked);
    $('btn-wise').classList.toggle('hidden', !data.wise_unlocked);
    $('btn-wise').textContent = sv.wise_beaten ? 'Wise Night ✦' : 'Wise Night';
    const deaths = birdIds().map(b => `${data.birds[b].name.replace('The ', '')}: ${sv.deaths[b] || 0}`).join(' &middot; ');
    const stars = (sv.endings || []).map(e => ({ normal: '★', keeper: '★', true: '✦' }[e])).join(' ');
    st.innerHTML = `
      Nights survived: ${sv.nights_beaten} / 6 ${stars ? '&nbsp; ' + stars : ''} &nbsp;&middot;&nbsp; Overtime: ${sv.overtime_done.length} / 4<br>
      Mara's cranes found: <span class="crane-count">${sv.cranes_found.length} / 5</span><br>
      Paper cranes folded: <span class="crane-count">${sv.cranes_folded_total} / 1000</span><br>
      <span style="font-size:18px">Claimed by &mdash; ${deaths}</span>`;
  }

  document.body.addEventListener('click', e => {
    Sfx.resume();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    Sfx.play.click();
    const a = btn.dataset.action;
    if (a === 'new') newGame();
    if (a === 'continue') { if (data.pending_overtime) openOvertime(data.pending_overtime); else startNight(Math.min(data.next_night, 5)); }
    if (a === 'night6') startNight(6);
    if (a === 'wise') startNight(WISE_NIGHT);
    if (a === 'custom') openCustom();
    if (a === 'archive') openArchive();
    if (a === 'settings') openSettings();
    if (a === 'back') renderMenu();
  });

  async function newGame() {
    if (!data) return;
    if (data.save.nights_beaten > 0 && !confirm('Start over from Night 1? (Found cranes, deaths and folds are kept. Use Settings to erase everything.)')) return;
    startNight(1);
  }

  // ---------------- archive ----------------
  function openArchive() {
    if (!data) return;
    show('archive');
    mode = 'archive';
    const list = $('archive-list');
    list.innerHTML = '';
    const entries = [...data.archive.map(d => ({ ...d, note: false }))];
    Object.entries(data.notes).forEach(([n, text]) => entries.push({ id: 'note' + n, title: `Mara's Crane #${n}`, kind: 'A note folded inside a paper crane', body: text, note: true }));
    Object.entries(data.calls).forEach(([n, text]) => entries.push({ id: 'call' + n, title: `Phone Recording - Night ${n}`, kind: 'Transcript', body: text }));
    entries.forEach((d, i) => {
      const b = document.createElement('button');
      b.textContent = d.title;
      b.onclick = () => {
        [...list.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        const doc = $('archive-doc');
        doc.className = 'archive-doc' + (d.note ? ' note' : '');
        doc.innerHTML = `<h3></h3><div class="kind"></div><div class="body"></div>`;
        doc.querySelector('h3').textContent = d.title;
        doc.querySelector('.kind').textContent = d.kind;
        doc.querySelector('.body').textContent = d.body;
      };
      list.appendChild(b);
      if (i === 0) b.click();
    });
    const lockedCranes = 5 - Object.keys(data.notes).length;
    for (let i = 0; i < lockedCranes; i++) {
      const l = document.createElement('div'); l.className = 'locked'; l.textContent = '???  (a crane yet unfound)'; list.appendChild(l);
    }
    const lockedDocs = data.archive_total - data.archive.length;
    for (let i = 0; i < lockedDocs; i++) {
      const l = document.createElement('div'); l.className = 'locked'; l.textContent = '???  (survive more nights)'; list.appendChild(l);
    }
  }

  // ---------------- settings ----------------
  function openSettings() {
    show('settings');
    mode = 'settings';
    $('set-volume').value = settings.volume;
    $('set-voice').checked = settings.voice;
    $('set-warp').checked = settings.warp;
    $('set-shake').checked = settings.shake;
  }
  $('set-volume').oninput = e => { settings.volume = +e.target.value; applySettings(); };
  $('set-voice').onchange = e => { settings.voice = e.target.checked; applySettings(); };
  $('set-warp').onchange = e => { settings.warp = e.target.checked; applySettings(); };
  $('set-shake').onchange = e => { settings.shake = e.target.checked; applySettings(); };
  $('btn-reset').onclick = async () => {
    if (!confirm('Erase all progress, cranes and records?')) return;
    data = await api('/api/reset', {});
    renderMenu();
  };

  // ---------------- custom night ----------------
  function openCustom() {
    show('custom');
    mode = 'custom';
    const wrap = $('custom-sliders');
    const ids = birdIds();
    wrap.style.gridTemplateColumns = `repeat(${ids.length}, minmax(0, 1fr))`;
    wrap.innerHTML = '';
    ids.forEach(b => {
      const card = document.createElement('div');
      card.className = 'custom-card';
      const c = document.createElement('canvas'); c.width = 180; c.height = 220;
      const cx = c.getContext('2d');
      const eyes = Sprites.draw(cx, b, 90, 212, SCALE[b], { t: 1, fury: 0.2 });
      Sprites.drawEyes(cx, eyes, 0.8);
      card.appendChild(c);
      card.insertAdjacentHTML('beforeend', `<div class="name">${data.birds[b].name}</div><div class="sym">${data.birds[b].symbol} &rarr; ${data.birds[b].inverted}</div><div class="lvl">${custom[b]}</div><input type="range" min="0" max="20" value="${custom[b]}">`);
      card.querySelector('input').oninput = e => { custom[b] = +e.target.value; card.querySelector('.lvl').textContent = custom[b]; };
      wrap.appendChild(card);
    });
  }
  $('btn-custom-start').onclick = () => startNight(0, { ...custom, owl: owlSeen() ? custom.owl : 0 });

  // ---------------- overtime ----------------
  // Overtime n follows night n and must be survived before night n+1.
  function openOvertime(n) {
    const t = data.overtime_tasks[n];
    show('overtime');
    mode = 'overtime-menu';
    $('ot-title').textContent = `Overtime ${n}: ${t.name}`;
    $('ot-desc').textContent = t.desc;
    $('ot-controls').textContent = t.controls;
    $('ot-threat').textContent = `${data.birds[t.bird].name}: ${t.threat}`;
    $('btn-ot-begin').onclick = () => runOvertime(n);
  }

  function runOvertime(n) {
    const t = data.overtime_tasks[n];
    Sfx.resume();
    show(null);
    mode = 'overtime';
    Overtime.run(t.id, { ...t, ot: n }, async res => {
      if (res.left) return refresh();
      try { data = await api('/api/overtime', { ot: n, ...res }); } catch (e) { /* keep old data */ }
      mode = 'message';
      show('message');
      $('message').classList.remove('ending');
      const bird = data.birds[t.bird];
      if (res.caught) {
        $('msg-title').textContent = 'CLAIMED ON OVERTIME';
        $('msg-body').textContent = `${bird.name} - once ${bird.symbol}, now ${bird.inverted}.`;
        $('msg-hint').textContent = 'Hint: ' + t.hint;
        setButtons({ text: 'Try again', fn: () => runOvertime(n) });
        return;
      }
      $('msg-title').textContent = `OVERTIME ${n} COMPLETE`;
      $('msg-body').textContent = `${bird.name} lets you go home. The sun is coming up.`;
      $('msg-hint').textContent = '';
      setButtons({ text: `Begin Night ${n + 1}`, fn: () => startNight(n + 1) });
    });
  }

  function setButtons(primary, extra) {
    const retry = $('msg-retry'), ex = $('msg-extra');
    retry.textContent = primary.text;
    retry.onclick = primary.fn;
    ex.classList.toggle('hidden', !extra);
    if (extra) { ex.textContent = extra.text; ex.onclick = extra.fn; }
  }

  // ---------------- nights ----------------
  function startNight(n, ai) {
    if (!data) return;
    Sfx.resume();
    show(null);
    mode = 'game';
    lastNight = { n, ai };
    Game.start({
      night: n,
      ai: n === WISE_NIGHT ? {} : ai || data.nights[n],
      call: n === WISE_NIGHT ? data.wise_call : n > 0 ? data.calls[n] : null,
      foundNotes: data.save.cranes_found,
      settings,
      onEnd: onNightEnd,
    });
  }

  async function onNightEnd(result, death) {
    let res = null;
    const owlBefore = owlSeen();
    try { res = await api('/api/result', result); data = res; } catch (e) { /* keep old data */ }
    Game.stop();
    mode = 'message';
    show('message');
    const m = $('message');
    m.classList.remove('ending');
    const owlNote = !owlBefore && owlSeen() ? ' Something new waits in the Archive.' : '';
    if (!result.survived) {
      const bird = data.birds[result.killer] || data.birds.raven;
      $('msg-title').textContent = death.title;
      $('msg-body').textContent = result.killer === 'power'
        ? 'The power failed. In the dark, the Raven came to collect what it remembered.'
        : `${bird.name} - once ${bird.symbol}, now ${bird.inverted}.`;
      $('msg-hint').textContent = 'Hint: ' + death.hint + owlNote;
      setButtons({ text: 'Try again', fn: () => startNight(lastNight.n, lastNight.ai) });
      return;
    }
    if (res && res.ending) {
      m.classList.add('ending');
      $('msg-title').textContent = res.ending.title;
      $('msg-body').textContent = res.ending.text;
      $('msg-hint').textContent = { true: 'Thank you for being kind to her.', wise: 'You survived the Wise Night. Her letter is now in the Archive.' }[res.ending.id] || owlNote;
      if (res.ending.id === 'normal') setButtons({ text: 'Night 6', fn: () => startNight(6) });
      else setButtons({ text: 'Continue', fn: refresh });
      return;
    }
    if (result.night === 0) {
      $('msg-title').textContent = '6 AM';
      $('msg-body').textContent = `You survived a custom night (total difficulty ${result.custom_total} / ${birdIds().length * 20}).`;
      $('msg-hint').textContent = owlNote;
      setButtons({ text: 'Again', fn: () => startNight(0, lastNight.ai) });
      return;
    }
    $('msg-title').textContent = `NIGHT ${result.night} COMPLETE`;
    $('msg-body').textContent = result.folded ? `Paper cranes folded tonight: ${result.folded}` : 'The aviary is quiet. For now.';
    const docs = data.archive.filter(d => d.unlock === result.night && !d.owl);
    $('msg-hint').textContent = (docs.length ? `New in the Archive: ${docs.map(d => d.title).join(', ')}.` : '') + owlNote;
    if (data.overtime_tasks[result.night]) setButtons({ text: `Clock in: Overtime ${result.night}`, fn: () => openOvertime(result.night) });
    else setButtons({ text: `Begin Night ${result.night + 1}`, fn: () => startNight(result.night + 1) });
  }
  $('msg-menu').onclick = () => refresh();

  addEventListener('keydown', e => {
    if (e.code === 'Escape' && !['game', 'menu', 'overtime'].includes(mode)) refresh();
  });

  // ---------------- title screen animation ----------------
  let titleBird = 'raven', titleT = 0, twitch = 0, lastTs = performance.now();
  function nextTitleBird() {
    const ids = birdIds();
    if (!owlSeen() && Math.random() < 1 / 15) return 'owl';
    const cur = ids.indexOf(titleBird);
    return ids[(cur + 1) % ids.length];
  }
  function titleLoop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (mode !== 'game' && mode !== 'overtime') {
      titleT += dt;
      const span = titleBird === 'owl' && !owlSeen() ? 2.4 : 9;
      if (titleT > span) { titleT = 0; titleBird = titleBird === 'owl' && !owlSeen() ? 'crane' : nextTitleBird(); }
      if (Math.random() < dt * 0.8) twitch = (Math.random() - 0.5) * 0.5;
      twitch *= 0.85;
      const W = 1280, H = 720;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const flick = Math.random() < 0.04 ? 0.25 : 1;
      const fade = Math.min(1, titleT / 1.2, (span - titleT) / 1.2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade) * flick;
      const back = ctx.createRadialGradient(930, 300, 20, 930, 330, 420);
      back.addColorStop(0, 'rgba(120,110,140,.55)'); back.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = back; ctx.fillRect(500, 0, 780, H);
      const sc = { raven: 1.25, eagle: 1.12, cardinal: 1.5, dove: 1.55, crane: 0.95, owl: 1.45 }[titleBird];
      const eyes = Sprites.draw(ctx, titleBird, 930 + twitch * 30, 790, sc, { t: ts / 1000, twitch, fury: 0.15, look: 0, turn: Math.min(1, titleT / 1.5) });
      ctx.restore();
      const g = ctx.createRadialGradient(930, 330, 60, 930, 360, 640);
      g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.94)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, 600, H);
      Sprites.drawEyes(ctx, eyes, Math.max(0, fade) * flick);
      ctx.globalAlpha = 0.09 + (Math.random() < 0.03 ? 0.3 : 0);
      ctx.drawImage(Scenes.noiseFrame(ts / 1000), 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.drawImage(Scenes.cache.scan, 0, 0);
      if (data && mode === 'menu') {
        ctx.fillStyle = 'rgba(200,190,170,.5)'; ctx.font = '22px VT323, monospace'; ctx.textAlign = 'right';
        const b = data.birds[titleBird];
        ctx.fillText(b ? `${b.name.toUpperCase()}  -  ${b.symbol} / ${b.inverted}` : '? ? ?', W - 40, H - 30);
      }
    }
    requestAnimationFrame(titleLoop);
  }
  requestAnimationFrame(titleLoop);

  refresh();
})();
