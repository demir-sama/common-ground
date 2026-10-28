// Common Ground — front end. Plain ES modules, no build step.
const COLORS = ['#ff5d8f', '#4de1c1', '#ffb347', '#7c8cff'];
const MAX_PEOPLE = 4, MAX_LOVES = 8;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = { movie: '🎬', tv_show: '📺', artist: '🎧', book: '📖', podcast: '🎙️', place: '📍' };
const LABEL = { movie: 'Film', tv_show: 'Series', artist: 'Music', book: 'Book', podcast: 'Podcast', place: 'Place' };

const PRESETS = [
  { label: 'Date night', city: 'London', people: [
    { name: 'Maya', loves: ['Blade Runner 2049', 'Radiohead', 'Dune'] },
    { name: 'Jonas', loves: ['Amélie', 'Khruangbin', 'Norwegian Wood'] } ] },
  { label: 'Roommates', city: 'New York', people: [
    { name: 'Ade', loves: ['Burna Boy', 'Black Panther', 'Americanah'] },
    { name: 'Sam', loves: ['Phoebe Bridgers', 'Fleabag', 'Normal People'] } ] },
  { label: 'Friend trio', city: 'Tokyo', people: [
    { name: 'Kai', loves: ['Nujabes', 'Spirited Away'] },
    { name: 'Lina', loves: ['Severance|tv_show', 'Daft Punk'] },
    { name: 'Omar', loves: ['Parasite', 'Kendrick Lamar'] } ] },
  { label: 'Lagos night out', city: 'Lagos', people: [
    { name: 'Ade', loves: ['Burna Boy', 'Black Panther'] },
    { name: 'Tola', loves: ['Wizkid', 'Money Heist|tv_show'] } ] },
];

const state = { people: [], city: '', domains: new Set(['movie', 'tv_show', 'artist', 'book', 'place']), mode: 'mock', result: null, running: false };

/* ---------- procedural art (used whenever Qloo has no image) ---------- */
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function artStyle(key) {
  const h = hash(key), a = h % 360, b = (a + 40 + (h >> 8) % 90) % 360, ang = (h >> 4) % 360;
  return `--bg-art:radial-gradient(120% 90% at ${20 + (h % 60)}% 10%,hsl(${b} 80% 60% / .9),transparent 60%),linear-gradient(${ang}deg,hsl(${a} 70% 32%),hsl(${b} 70% 16%))`;
}
const artHTML = (e, cls = '') => `<div class="art ${cls}" style="${artStyle(e.id || e.name)}">${e.image ? `<img src="${esc(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="g">${ICON[e.type] ?? '✦'}</span></div>`;

/* ---------- state helpers ---------- */
const newPerson = (i) => ({ name: ['Maya', 'Jonas', 'Ade', 'Kai'][i] ?? `Person ${i + 1}`, loves: [] });
function resetPeople() { state.people = [newPerson(0), newPerson(1)]; }

/* ---------- builder ---------- */
function renderPeople() {
  const wrap = $('#people');
  wrap.innerHTML = state.people.map((p, i) => `
    <div class="person" style="--c:${COLORS[i]};animation-delay:${i * 60}ms" data-i="${i}">
      <div class="ph"><span class="dot"></span>
        <input class="name" value="${esc(p.name)}" maxlength="24" aria-label="Person ${i + 1} name" />
        ${state.people.length > 2 ? `<button class="rm" aria-label="Remove ${esc(p.name)}" title="Remove">×</button>` : ''}
      </div>
      <div class="love-chips">${p.loves.map((e, j) => `<span class="love">${artHTML(e, 'mini').replace('class="art mini"', 'class="art"')}${esc(e.name)}<button data-rm="${j}" aria-label="Remove ${esc(e.name)}">×</button></span>`).join('')}</div>
      <div class="search">
        <input type="search" class="q" placeholder="${p.loves.length ? 'Add another thing they love…' : 'A film, band, book, show, podcast they love…'}" aria-label="Search things ${esc(p.name)} loves" autocomplete="off" ${p.loves.length >= MAX_LOVES ? 'disabled' : ''} />
        <div class="dropdown" hidden></div>
      </div>
    </div>`).join('');
  $('#addPerson').hidden = state.people.length >= MAX_PEOPLE;
  wrap.querySelectorAll('.person').forEach(bindPerson);
  updateGo();
}

function bindPerson(el) {
  const i = Number(el.dataset.i), p = state.people[i];
  $('.name', el).addEventListener('input', (e) => { p.name = e.target.value; });
  $('.rm', el)?.addEventListener('click', () => { state.people.splice(i, 1); renderPeople(); });
  el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { p.loves.splice(Number(b.dataset.rm), 1); renderPeople(); }));
  const q = $('.q', el), dd = $('.dropdown', el);
  let t, seq = 0, items = [], active = -1;
  const show = (list, msg) => {
    items = list; active = -1;
    dd.innerHTML = list.length ? list.map((e, k) => `<button class="opt" data-k="${k}">${artHTML(e)}<span><b>${esc(e.name)}</b><small>${LABEL[e.type] ?? e.type}${e.subtitle ? ` · ${esc(e.subtitle)}` : ''}</small></span></button>`).join('') : `<div class="empty-dd">${esc(msg)}</div>`;
    dd.hidden = false;
    dd.querySelectorAll('.opt').forEach((o) => o.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(items[Number(o.dataset.k)]); }));
  };
  const pick = (e) => { if (!e || p.loves.some((x) => x.id === e.id) || p.loves.length >= MAX_LOVES) return; p.loves.push(e); renderPeople(); $$focus(i); };
  const run = async () => {
    const term = q.value.trim(); const mine = ++seq;
    if (term.length < 2) { if (state.mode === 'mock' && !term) { const r = await api('/api/suggest'); if (mine === seq) show(r.results ?? [], ''); } else dd.hidden = true; return; }
    try { const r = await api(`/api/search?q=${encodeURIComponent(term)}`); if (mine === seq) show(r.results ?? [], 'No match — try another spelling.'); }
    catch (err) { if (mine === seq) show([], err.message); }
  };
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 180); });
  q.addEventListener('focus', run);
  q.addEventListener('blur', () => setTimeout(() => { dd.hidden = true; }, 120));
  q.addEventListener('keydown', (ev) => {
    const opts = dd.querySelectorAll('.opt');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); active = (active + (ev.key === 'ArrowDown' ? 1 : -1) + opts.length) % (opts.length || 1); opts.forEach((o, k) => o.classList.toggle('active', k === active)); }
    else if (ev.key === 'Enter') { ev.preventDefault(); pick(items[active >= 0 ? active : 0]); }
    else if (ev.key === 'Escape') dd.hidden = true;
  });
}
const $$focus = (i) => requestAnimationFrame(() => document.querySelectorAll('.person')[i]?.querySelector('.q')?.focus());

function updateGo() {
  const ok = state.people.length >= 2 && state.people.every((p) => p.loves.length >= 1) && !state.running;
  $('#go').disabled = !ok;
  $('#goHint').textContent = ok ? `${state.people.reduce((n, p) => n + p.loves.length, 0)} signals ready.` : state.running ? 'The Mediator is working…' : 'Each person needs at least one thing they love.';
}

function renderDomains(list) {
  $('#domains').innerHTML = list.map((d) => `<button class="dom" type="button" aria-pressed="${state.domains.has(d.key)}" data-k="${d.key}">${d.icon} ${d.label}</button>`).join('');
  $('#domains').querySelectorAll('.dom').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k; state.domains.has(k) ? (state.domains.size > 1 && state.domains.delete(k)) : state.domains.add(k);
    b.setAttribute('aria-pressed', state.domains.has(k));
  }));
}

function renderPresets() {
  $('#presets').innerHTML = PRESETS.map((p, i) => `<button type="button" data-i="${i}">${esc(p.label)}</button>`).join('');
  $('#presets').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => loadPreset(PRESETS[Number(b.dataset.i)], b)));
}

async function loadPreset(preset, btn) {
  btn.disabled = true;
  try {
    const people = [];
    for (const [i, p] of preset.people.entries()) {
      const loves = [];
      for (const spec of p.loves) {
        const [name, type] = spec.split('|');
        const r = await api(`/api/search?q=${encodeURIComponent(name)}${type ? `&type=${type}` : ''}`);
        const hit = (r.results ?? []).find((e) => e.name.toLowerCase() === name.toLowerCase()) ?? r.results?.[0];
        if (hit) loves.push(hit);
      }
      people.push({ name: p.name, loves });
    }
    state.people = people; state.city = preset.city; $('#city').value = preset.city;
    renderPeople();
  } catch (err) { alert(err.message); } finally { btn.disabled = false; }
}

/* ---------- API ---------- */
async function api(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ? `${body.error}${body.hint ? ` — ${body.hint}` : ''}` : `Request failed (${res.status})`);
  return body;
}

/* ---------- run the agent ---------- */
async function run() {
  if (state.running) return;
  state.running = true; updateGo();
  const trace = $('#trace'), list = $('#traceList'), results = $('#results');
  trace.hidden = false; trace.classList.remove('finished'); list.innerHTML = ''; results.hidden = true;
  trace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const body = {
    people: state.people.map((p) => ({ name: p.name, entities: p.loves.map(({ id, name, type, tags }) => ({ id, name, type, tags })) })),
    city: $('#city').value.trim() || null, domains: [...state.domains],
  };
  try {
    const res = await fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Request failed (${res.status})`); }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (line) handleEvent(JSON.parse(line)); }
    }
  } catch (err) {
    list.insertAdjacentHTML('beforeend', `<li class="err"><span class="st"></span><div><b>Something went wrong</b><p>${esc(err.message)}</p></div></li>`);
  } finally { state.running = false; trace.classList.add('finished'); updateGo(); }
}

function handleEvent(evt) {
  const list = $('#traceList');
  if (evt.type === 'step') {
    let li = list.querySelector(`[data-id="${CSS.escape(evt.id)}"]`);
    if (evt.status === 'start') {
      li = document.createElement('li'); li.dataset.id = evt.id;
      li.innerHTML = `<span class="st"></span><div><b>${esc(evt.title)}</b>${evt.tool ? `<span class="tool">${esc(evt.tool)}</span>` : ''}<p>${esc(evt.detail)}</p></div>`;
      list.append(li);
    } else if (li) { li.classList.add(evt.error ? 'err' : 'done'); li.querySelector('p').textContent = evt.detail; }
  } else if (evt.type === 'result') { state.result = evt.result; renderResult(evt.result); }
  else if (evt.type === 'error') { list.insertAdjacentHTML('beforeend', `<li class="err"><span class="st"></span><div><b>Error</b><p>${esc(evt.error)}${evt.hint ? ` — ${esc(evt.hint)}` : ''}</p></div></li>`); }
}

/* ---------- results ---------- */
const pct = (x) => Math.round((x ?? 0) * 100);
function renderResult(r) {
  const res = $('#results'); res.hidden = false;
  $('#headline').textContent = r.plan.headline;
  $('#disclaimer').textContent = `${r.disclaimer}${r.mode === 'mock' ? ' · DEMO DATA: this run used bundled mock data, not live Qloo results.' : ''} Copy written ${r.narration === 'llm' ? 'by an LLM from' : 'from'} the Qloo evidence above.`;
  renderVenn(r);
  const ov = pct(r.overlap.score);
  requestAnimationFrame(() => { $('#ringBar').style.strokeDashoffset = 213.6 * (1 - r.overlap.score); });
  countUp($('#ringVal'), ov);
  $('#shared').innerHTML = (r.commonGround.shared.length ? r.commonGround.shared : []).map((t, i) => `<span class="chip shared" style="animation-delay:${i * 60}ms">${esc(t.name)}</span>`).join('')
    + r.people.map((p, i) => (r.commonGround.distinct[p.id] ?? []).slice(0, 3).map((t) => `<span class="chip" style="border-color:${COLORS[i]}66;color:${COLORS[i]}">${esc(p.name)} · ${esc(t.name)}</span>`).join('')).join('');
  $('#plan').innerHTML = r.plan.items.map((it, i) => cardHTML(it, r, i)).join('') || '<div class="note">Nothing to plan yet — Qloo returned no results.</div>';
  renderConstellation(r);
  renderTabs(r);
  bindBars(res);
  res.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function countUp(el, to) { const t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / 1400); el.textContent = `${Math.round(to * (1 - Math.pow(1 - k, 3)))}%`; if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }

function renderVenn(r) {
  const n = r.people.length, R = 4 + (1 - Math.min(1, r.overlap.score * 1.4)) * 30; // closer circles = more overlap
  const el = $('#venn');
  el.innerHTML = r.people.map((p, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (n === 2 ? Math.PI / 2 : 0);
    return `<div class="vc" style="--c:${COLORS[i]};transform:translate(${Math.cos(a) * 0}%,${Math.sin(a) * 0}%) scale(.6)" data-dx="${(Math.cos(a) * R).toFixed(1)}" data-dy="${(Math.sin(a) * R).toFixed(1)}">${esc(p.name)}</div>`;
  }).join('') + `<div class="lens">${esc(r.commonGround.shared.slice(0, 2).map((t) => t.name).join(' · '))}</div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.vc').forEach((c) => { c.style.transform = `translate(${c.dataset.dx * 2}%,${c.dataset.dy * 2}%) scale(1)`; })));
}

function barsHTML(it, r) {
  return `<div class="bars">${r.people.map((p, i) => `<div class="bar-row" style="--c:${COLORS[i]}"><span>${esc(p.name)}</span><span class="tr"><span class="fl" data-w="${pct(it.affinities[p.id])}"></span></span><b>${pct(it.affinities[p.id])}</b></div>`).join('')}</div>`;
}
function cardHTML(it, r, i = 0) {
  const e = it.entity;
  return `<article class="card" style="--i:${i}" data-id="${esc(e.id)}">
    <div class="harm" title="Harmony: least-misery weighted score">${pct(it.harmony)}<small>harmony</small></div>
    ${artHTML(e)}<span class="dtag">${ICON[e.type] ?? ''} ${LABEL[e.type] ?? e.type}</span>
    <div class="body"><h4>${esc(e.name)}</h4><div class="meta">${esc(e.subtitle ?? '')}</div>
      <p class="desc">${esc(e.description ?? '')}</p><p class="why">${esc(it.why ?? '')}</p>${barsHTML(it, r)}${it.estimated ? '<span class="est">Some per-person scores are estimated from the group signal.</span>' : ''}</div></article>`;
}
function bindBars(root) { requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.fl').forEach((f) => { f.style.width = `${f.dataset.w}%`; }))); }

function renderTabs(r) {
  const doms = r.domains.filter((d) => d.picks.length || d.note);
  const tabs = $('#tabs'); const picks = $('#picks');
  const show = (key) => {
    tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.k === key));
    const d = doms.find((x) => x.key === key);
    picks.innerHTML = d.picks.length ? d.picks.map((p, i) => cardHTML(p, r, i)).join('') : `<div class="note">${esc(d.note ?? 'No results.')}</div>`;
    bindBars(picks);
  };
  tabs.innerHTML = doms.map((d) => `<button class="tab" role="tab" data-k="${d.key}">${d.icon} ${esc(d.label)}</button>`).join('');
  tabs.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.k)));
  if (doms.length) show(doms[0].key);
}

/* ---------- constellation ---------- */
function renderConstellation(r) {
  const n = r.people.length;
  const lanes = r.domains.filter((d) => d.picks.length);
  const lanesMode = n === 2;                       // 2 people: one lane per category, x = who it leans toward
  const W = 900, H = lanesMode ? 90 + lanes.length * 112 : 560, cx = W / 2, cy = H / 2;
  const nodes = r.people.map((p, i) => {
    const a = n === 2 ? (i === 0 ? Math.PI : 0) : (Math.PI * 2 * i) / n - Math.PI / 2;
    return { p, x: cx + Math.cos(a) * (n === 2 ? 392 : 300), y: lanesMode ? 44 : cy + Math.sin(a) * 205, color: COLORS[i] };
  });
  const orbs = lanes.flatMap((d, li) => d.picks.map((pk) => ({ pk, d, li }))).map(({ pk, d, li }) => {
    const rad = 12 + pk.harmony * 22;
    if (lanesMode) {
      const [a, b] = r.people.map((p) => pk.affinities[p.id] ?? 0);
      const t = Math.max(0, Math.min(1, 0.5 + (b - a) * 2.4));        // 0 = all person A, 1 = all person B
      return { pk, d, rad, x: 100 + 700 * t, y: 96 + li * 112 + 8, lane: li, t, w: [1 - t, t] };
    }
    const w = r.people.map((p) => Math.pow(Math.max(0.01, pk.affinities[p.id] ?? 0.01), 6));
    const sum = w.reduce((x, y) => x + y, 0);
    let x = 0, y = 0; w.forEach((wi, i) => { x += (wi / sum) * nodes[i].x; y += (wi / sum) * nodes[i].y; });
    const h = hash(pk.entity.id); x = cx + (x - cx) * 0.8 + ((h % 60) - 30); y = cy + (y - cy) * 0.8 + (((h >> 8) % 60) - 30);
    return { pk, d, rad, x, y, w: w.map((wi) => wi / sum) };
  });
  for (let it = 0; it < 120; it++) for (let a = 0; a < orbs.length; a++) for (let b = a + 1; b < orbs.length; b++) {
    const A = orbs[a], B = orbs[b]; let dx = B.x - A.x, dy = B.y - A.y; const dist = Math.hypot(dx, dy) || 0.01, min = A.rad + B.rad + 8;
    if (dist < min) { const push = (min - dist) / 2; dx /= dist; dy /= dist; const ky = lanesMode ? 0.35 : 1; A.x -= dx * push; A.y -= dy * push * ky; B.x += dx * push; B.y += dy * push * ky; }
  }
  orbs.forEach((o) => {
    o.x = Math.max(o.rad + 70, Math.min(W - o.rad - 70, o.x));
    o.y = lanesMode ? Math.max(96 + o.lane * 112 - 30, Math.min(96 + o.lane * 112 + 40, o.y)) : Math.max(o.rad + 24, Math.min(H - o.rad - 24, o.y));
  });
  const orbColor = (o) => (lanesMode ? lerp3(COLORS[0], '#ffe9c7', COLORS[1], o.t) : blend(o.w));
  const defs = orbs.map((o, k) => {
    let acc = 0; const stops = o.w.map((wi, i) => { const s = `${COLORS[i]} ${(acc * 100).toFixed(0)}% ${((acc + wi) * 100).toFixed(0)}%`; acc += wi; return s; });
    return `<radialGradient id="og${k}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${orbColor(o)}"/><stop offset="1" stop-color="${shade(orbColor(o))}"/></radialGradient>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Constellation of picks positioned between the people who love them">
    <defs>${defs}<radialGradient id="bgc"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="260" fill="url(#bgc)"/>
    ${lanesMode ? lanes.map((d, li) => `<line x1="70" x2="${W - 70}" y1="${96 + li * 112 + 8}" y2="${96 + li * 112 + 8}" stroke="#fff" stroke-opacity=".07" stroke-dasharray="2 8"/><text x="24" y="${96 + li * 112 + 13}" style="font-size:12px;fill:#a7a3b8">${d.icon} ${esc(d.label)}</text>`).join('') + `<line x1="${cx}" x2="${cx}" y1="70" y2="${H - 16}" stroke="#fff" stroke-opacity=".12"/><text x="${cx}" y="${H - 4}" text-anchor="middle" style="font-size:11px;fill:#a7a3b8">equally loved</text>` : [110, 190, 270].map((rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#fff" stroke-opacity=".05" stroke-dasharray="2 8"/>`).join('')}
    ${nodes.map((nd) => `<g><circle cx="${nd.x}" cy="${nd.y}" r="${lanesMode ? 34 : 46}" fill="${nd.color}" fill-opacity=".14"/><circle cx="${nd.x}" cy="${nd.y}" r="${lanesMode ? 16 : 26}" fill="${nd.color}"/><text x="${nd.x}" y="${nd.y + (lanesMode ? 50 : 52)}" text-anchor="middle">${esc(nd.p.name)}</text></g>`).join('')}
    ${orbs.map((o, k) => `<g class="orb" data-k="${k}" style="transform:translate(${cx - o.x}px,${cy - o.y}px) scale(.3);opacity:0" tabindex="0" role="button" aria-label="${esc(o.pk.entity.name)}, harmony ${pct(o.pk.harmony)}">
        ${lanesMode ? '' : nodes.map((nd, i) => `<line class="lnk" data-i="${i}" x1="${o.x}" y1="${o.y}" x2="${nd.x}" y2="${nd.y}" stroke="${nd.color}"/>`).join('')}
        <circle class="halo" cx="${o.x}" cy="${o.y}" r="${o.rad + 7}" fill="${orbColor(o)}" fill-opacity=".35" style="animation-delay:${-(k * 0.37).toFixed(2)}s"/>
        <circle class="core" cx="${o.x}" cy="${o.y}" r="${o.rad}" fill="url(#og${k})"/>
        <text class="glyph" x="${o.x}" y="${o.y + 5}" text-anchor="middle">${ICON[o.pk.entity.type] ?? ''}</text>
      </g>`).join('')}
  </svg>
  <div class="legend">${nodes.map((nd) => `<span style="--c:${nd.color}"><i></i>${esc(nd.p.name)}</span>`).join('')}<span>Bigger orb = higher harmony · sitting between people = loved by both</span></div>`;
  const host = $('#constellation'); host.innerHTML = svg;
  const tip = $('#tooltip');
  host.querySelectorAll('.orb').forEach((g, k) => {
    const o = orbs[k];
    setTimeout(() => { g.style.transform = 'translate(0,0) scale(1)'; g.style.opacity = '1'; }, 150 + k * 55);
    const on = (ev) => {
      g.classList.add('hl'); g.querySelectorAll('.lnk').forEach((l) => l.classList.add('on'));
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(o.pk.entity.name)}</b>${esc(LABEL[o.pk.entity.type] ?? '')} · harmony ${pct(o.pk.harmony)}<br>${r.people.map((p) => `${esc(p.name)} ${pct(o.pk.affinities[p.id])}`).join(' · ')}`;
      const x = ev.clientX ?? g.getBoundingClientRect().x, y = ev.clientY ?? g.getBoundingClientRect().y;
      tip.style.left = `${Math.min(window.innerWidth - 280, x + 16)}px`; tip.style.top = `${y + 16}px`;
    };
    const off = () => { g.classList.remove('hl'); g.querySelectorAll('.lnk').forEach((l) => l.classList.remove('on')); tip.hidden = true; };
    g.addEventListener('pointermove', on); g.addEventListener('pointerleave', off); g.addEventListener('focus', on); g.addEventListener('blur', off);
    g.addEventListener('click', () => {
      const id = o.pk.entity.id;
      const tabBtn = document.querySelector(`.tab[data-k="${o.d.key}"]`); tabBtn?.click();
      const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`) ?? document.querySelector(`.picks .card[data-id="${CSS.escape(id)}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); card?.classList.add('hl'); setTimeout(() => card?.classList.remove('hl'), 1800);
    });
  });
}
function lerp3(c0, mid, c1, t) {
  const A = hexToRgb(t < 0.5 ? c0 : mid), B = hexToRgb(t < 0.5 ? mid : c1), k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function blend(ws) { const rgb = ws.reduce((acc, wi, i) => { const c = hexToRgb(COLORS[i]); return acc.map((v, k) => v + c[k] * wi); }, [0, 0, 0]); return `rgb(${rgb.map(Math.round).join(',')})`; }
function shade(rgb) { const m = rgb.match(/\d+/g).map(Number); return `rgb(${m.map((v) => Math.round(v * 0.45)).join(',')})`; }

/* ---------- copy / reset ---------- */
function planText(r) {
  return [`${r.plan.headline}`, '', ...r.plan.items.map((it) => `${ICON[it.entity.type] ?? '•'} ${LABEL[it.entity.type] ?? it.entity.type}: ${it.entity.name} — harmony ${pct(it.harmony)} (${r.people.map((p) => `${p.name} ${pct(it.affinities[p.id])}`).join(', ')})`), '', `Made with Common Ground · taste data by Qloo${r.mode === 'mock' ? ' (demo data)' : ''}`].join('\n');
}

/* ---------- init ---------- */
async function init() {
  resetPeople(); renderPeople(); renderPresets();
  $('#addPerson').addEventListener('click', () => { if (state.people.length < MAX_PEOPLE) { state.people.push(newPerson(state.people.length)); renderPeople(); $$focus(state.people.length - 1); } });
  $('#go').addEventListener('click', run);
  $('#copy').addEventListener('click', async (e) => { await navigator.clipboard?.writeText(planText(state.result)); e.target.textContent = 'Copied ✓'; setTimeout(() => (e.target.textContent = 'Copy the plan'), 1600); });
  $('#again').addEventListener('click', () => { resetPeople(); $('#results').hidden = true; $('#trace').hidden = true; renderPeople(); $('#builder').scrollIntoView({ behavior: 'smooth' }); });
  try {
    const s = await api('/api/status');
    state.mode = s.mode;
    const b = $('#modeBadge'); b.hidden = false; b.className = `badge ${s.mode}`;
    b.textContent = s.mode === 'live' ? '● Live Qloo data' : 'Demo data · mock';
    if (s.notice) b.title = s.notice;
    renderDomains(s.domains);
    if (s.cities) $('#cityList').innerHTML = s.cities.map((c) => `<option value="${esc(c)}">`).join('');
    if (s.mode === 'mock' && !$('#city').value) $('#city').value = 'London';
  } catch { renderDomains([]); }
}
init();
