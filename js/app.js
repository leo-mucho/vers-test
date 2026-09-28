/* global PROJECTS, PICTURES, BY_OPTIONS, AS_OPTIONS, ROOM, ABOUT — from data.js */

/* ------------------------------------------------------------------
   State + routing
   Routes (hash based so the site runs from any static host):
     #/                         room (hero)
     #/list?pic=p01&by=materials
     #/grid?pic=p01&by=materials
     #/projects
     #/projects/:id             project modal over the overview
     #/about                    about modal over the last base view
------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const byId = (list, id) => list.find((x) => x.id === id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  view: 'room',      // room | list | grid | projects
  by: null,          // one of BY_OPTIONS, or null = not selected
  project: null,     // project id chosen from the bottom-left list (when by = project)
  pic: null,         // selected picture id
  modal: null,       // null | 'about' | project id
};

const app = $('#app');
const overlay = $('#overlay');
const barWrap = $('#bar-wrap');
let currentView = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const q = Object.fromEntries(new URLSearchParams(query));
  const parts = path.split('/').filter(Boolean);
  const next = { view: 'room', modal: null, by: BY_OPTIONS.includes(q.by) ? q.by : state.by, pic: q.pic && byId(PICTURES, q.pic) ? q.pic : null, project: q.project && byId(PROJECTS, q.project) ? q.project : (q.by ? null : state.project) };
  if (parts[0] === 'list' || parts[0] === 'grid') next.view = parts[0];
  else if (parts[0] === 'projects') { next.view = 'projects'; if (parts[1] && byId(PROJECTS, parts[1])) next.modal = parts[1]; }
  else if (parts[0] === 'about') { next.view = currentView || state.view; next.pic = state.pic; next.by = state.by; next.modal = 'about'; } // overlay on whatever view is open
  return next;
}

function hashFor({ view = state.view, by = state.by, pic = state.pic, project = state.project, modal = null } = {}) {
  if (modal === 'about') return '#/about';
  if (modal) return `#/projects/${modal}`;
  if (view === 'room') return '#/';
  if (view === 'projects') return '#/projects';
  const q = new URLSearchParams();
  if (pic) q.set('pic', pic);
  if (by) q.set('by', by);
  if (by === 'project' && project) q.set('project', project);
  return `#/${view}?${q}`;
}

function go(opts) { location.hash = hashFor(opts); }

/* ------------------------------------------------------------------
   Ordering helpers for "Show me more by […]"
------------------------------------------------------------------- */

function orderedPictures() {
  const selected = state.pic ? byId(PICTURES, state.pic) : null;
  let rest = PICTURES.filter((p) => !selected || p.id !== selected.id);
  if (state.by === "project" && state.project) {
    rest = rest.slice().sort((a, b) => (a.project === state.project ? 0 : 1) - (b.project === state.project ? 0 : 1));
  } else if (state.by) {
    // group by the chosen facet, the selected picture's value first
    const key = state.by;
    const sameAs = (p) => selected && p[key] === selected[key] ? 0 : 1;
    rest = rest.slice().sort((a, b) => sameAs(a) - sameAs(b) || String(a[key]).localeCompare(String(b[key])));
  } else if (selected) {
    // no facet chosen: rank by similarity to the clicked picture (Pinterest-style "more like this")
    const score = (p) => (p.project === selected.project ? 3 : 0) + (p.materials === selected.materials ? 2 : 0)
      + (p.patterns === selected.patterns ? 1 : 0) + (p.colors === selected.colors ? 1 : 0);
    rest = rest.slice().sort((a, b) => score(b) - score(a));
  }
  return selected ? [selected, ...rest] : rest;
}

/* ------------------------------------------------------------------
   Views
------------------------------------------------------------------- */

const chip = () => `<button class="chip" type="button"><img src="assets/icons/arrow_outward.svg" alt="" width="14" height="14">View Project</button>`;

const DIMENSIONS = 3;          // rooms stacked along the depth axis (recycled, so travel is endless)
const DIM_GAP = 1400;          // px between rooms along Z (matches the camera perspective)

/* Perspective mapping: each panel is a quadrilateral, so the photo is projected onto it
   with a homography (CSS matrix3d) instead of being clipped flat. */
function quadPoints(d) {
  const pts = []; let cur = [0, 0];
  for (const m of d.matchAll(/([MLHVZ])\s*([^MLHVZ]*)/gi)) {
    const c = m[1].toUpperCase(); const n = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (c === 'M' || c === 'L') cur = [n[0], n[1]];
    else if (c === 'H') cur = [n[0], cur[1]];
    else if (c === 'V') cur = [cur[0], n[0]];
    else continue;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - cur[0], last[1] - cur[1]) > 0.5) pts.push(cur);
  }
  const f = pts[0], l = pts[pts.length - 1];
  if (pts.length > 4 && Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.5) pts.pop();
  // clockwise (screen space) and starting from the top-left-most corner
  let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) pts.reverse();
  let s = 0; for (let i = 1; i < pts.length; i++) if (pts[i][0] + pts[i][1] < pts[s][0] + pts[s][1]) s = i;
  return [...pts.slice(s), ...pts.slice(0, s)].slice(0, 4);
}

// Homography from the w×h rectangle to the four corner points, as a CSS matrix3d string.
function homography(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = q[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  // Gaussian elimination
  const n = 8, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const hh = M.map((r, i) => r[n] / r[i]); const [a, bb, c, d, e, f, g, hgt] = hh;
  return `matrix3d(${a},${d},0,${g},${bb},${e},0,${hgt},0,0,1,0,${c},${f},0,1)`;
}

function renderRoom() {
  const layer = (k) => ROOM.panels.map((p, i) => {
    // each dimension rotates the picture assignment so every room shows different work
    const pic = p.pic ? PICTURES[(PICTURES.findIndex((x) => x.id === p.pic) + k * 4) % PICTURES.length] : null;
    // Intro: tiles start close to the camera, pushed outward from the centre, and fly into place.
    const cx = p.x + p.w / 2 - ROOM.width / 2, cy = p.y + p.h / 2 - ROOM.height / 2;
    const fx = (cx * 0.55).toFixed(0), fy = (cy * 0.55).toFixed(0);
    const delay = ((i * 37) % 420 + (1 - p.depth) * 500).toFixed(0);
    const m = pic ? homography(p.w, p.h, quadPoints(p.d)) : '';
    return `<div class="panel-wrap" data-project="${pic ? pic.project : ''}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;--d:${(0.55 + 0.45 * p.depth).toFixed(2)};--z:${((p.depth - 0.5) * 260).toFixed(0)}px">
      <div class="panel-inner" style="--fx:${fx}px;--fy:${fy}px;--delay:${delay}ms">
        <svg class="panel ${pic ? 'panel--pic' : ''}" data-pic="${pic ? pic.id : ''}" viewBox="0 0 ${p.w} ${p.h}" ${pic ? `role="button" tabindex="0" aria-label="${esc(pic.caption)}"` : 'aria-hidden="true"'}>
          <path class="fill" d="${p.d}" fill="${p.fill}"/>
        </svg>
        ${pic ? `<img class="panel__img" src="${pic.src}" alt="" width="${Math.round(p.w)}" height="${Math.round(p.h)}" style="transform:${m}">` : ''}
      </div>
    </div>`;
  }).join('');
  const layers = Array.from({ length: DIMENSIONS }, (_, k) => `<div class="room__layer" data-layer="${k}">
        ${layer(k)}
      </div>`).join("");
  return `<section class="view room" id="room" aria-label="Walk through the space">
    <div class="room__camera">
      <div class="room__stage" id="stage">${layers}</div>
    </div>
    <div class="room__label" id="room-label" aria-hidden="true"></div>
  </section>`;
}

const listItem = (p, i, eager) => `<a class="list__item ${i === 0 ? 'is-active' : ''}" href="#/projects/${p.project}" data-pic="${p.id}" data-cursor-chip style="--w:${p.w}px;--h:${p.h}px" aria-label="${esc(p.caption)} — View Project">
      <img src="${p.src}" alt="" loading="${eager ? 'eager' : 'lazy'}" width="${p.w}" height="${p.h}">
    </a>`;

function renderList() {
  const pics = orderedPictures();
  const active = pics[0];
  const items = pics.map((p, i) => listItem(p, i, i < 2)).join('');
  const proj = byId(PROJECTS, active.project);
  return `<section class="view list" aria-label="Pictures as a list">
    <div class="list__caption" id="list-caption">
      <p class="list__date">${esc(proj.date)}</p>
      <p class="list__title">${esc(active.caption)}</p>
    </div>
    <div class="list__items" id="list-items">${items}</div>
    <div class="list__more" id="list-more" aria-hidden="true"></div>
  </section>`;
}

function renderGrid() {
  const pics = orderedPictures();
  const items = pics.map((p, i) => `<a class="grid__item ${state.pic === p.id ? 'is-selected' : ''}" href="#/projects/${p.project}" data-pic="${p.id}" data-cursor-chip aria-label="${esc(p.caption)} — View Project">
      <img src="${p.src}" alt="" loading="${i < 10 ? 'eager' : 'lazy'}">
    </a>`).join('');
  return `<section class="view grid" aria-label="Pictures as a grid"><div class="grid__items">${items}</div></section>`;
}

// Each overview row uses the wireframe's five image sizes.
const ROW_SIZES = [[225, 180], [226, 226], [273, 261], [225, 180], [225, 261]];

function renderProjects() {
  const rows = PROJECTS.map((proj) => {
    const pics = PICTURES.filter((p) => p.project === proj.id);
    const fill = [...pics, ...PICTURES.filter((p) => p.project !== proj.id)].slice(0, 5);
    const imgs = fill.map((p, i) => `<div class="prow__img" style="width:${ROW_SIZES[i][0]}px;height:${ROW_SIZES[i][1]}px"><img src="${p.src}" alt="" loading="lazy"></div>`).join('');
    return `<a class="prow" href="#/projects/${proj.id}" data-cursor-chip aria-label="${esc(proj.title)} — View Project">
      <div class="prow__meta"><p class="prow__date">${esc(proj.date)}</p><p class="prow__title">${esc(proj.title)}</p></div>
      <div class="prow__images">${imgs}</div>
    </a>`;
  }).join('');
  return `<section class="view projects" aria-label="Projects">${rows}</section>`;
}

const VIEWS = { room: renderRoom, list: renderList, grid: renderGrid, projects: renderProjects };

/* ------------------------------------------------------------------
   Modal (project + about)
------------------------------------------------------------------- */

function modalHTML(kind) {
  if (kind === 'about') {
    return `<div class="modal modal--about" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal__close" type="button" data-close aria-label="Close"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 3L17 17"/><path d="M17 3L3 17"/></svg></button>
      <h2 class="modal__title" id="modal-title">${esc(ABOUT.title)}</h2>
      <div class="modal__grid"><div class="modal__text">${ABOUT.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div>
      <figure class="modal__image"><img src="${ABOUT.photo}" alt="The vers team"></figure>
    </div>`;
  }
  const proj = byId(PROJECTS, kind);
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button class="modal__close" type="button" data-close aria-label="Close"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 3L17 17"/><path d="M17 3L3 17"/></svg></button>
    <h2 class="modal__title" id="modal-title">${esc(proj.title)}</h2>
    <div class="modal__grid">
      <div class="modal__text">${proj.description.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="modal__meta">
        <p class="dim">${esc(proj.location)}<br>${esc(proj.size)}</p>
        <ul class="modal__awards">${proj.awards.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>
    </div>
    <figure class="modal__image"><img src="${proj.hero}" alt=""></figure>
  </div>`;
}

let modalOpenKind = null;

function openModal(kind) {
  const wasOpen = !overlay.hidden;
  const isProject = kind !== 'about';
  const pager = isProject ? `<div class="pager"><button type="button" data-step="-1">prev</button><button type="button" data-step="1">next</button></div>` : '';
  if (wasOpen && modalOpenKind) {
    // swap content in place (prev / next)
    const modal = $('.modal', overlay);
    modal.classList.add('is-swapping');
    setTimeout(() => {
      overlay.innerHTML = pager + modalHTML(kind);
      overlay.scrollTop = 0;
      $('.modal__close', overlay).focus({ preventScroll: true });
    }, 180);
  } else {
    overlay.innerHTML = pager + modalHTML(kind);
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    barWrap.classList.add('is-hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-open')));
    setTimeout(() => $('.modal__close', overlay)?.focus({ preventScroll: true }), 50);
  }
  modalOpenKind = kind;
}

function closeModal() {
  if (overlay.hidden) return;
  overlay.classList.remove('is-open');
  modalOpenKind = null;
  document.body.classList.remove('no-scroll');
  barWrap.classList.toggle('is-hidden', state.view === 'projects');
  setTimeout(() => { if (!modalOpenKind) { overlay.hidden = true; overlay.innerHTML = ''; } }, 420);
}

function stepProject(dir) {
  if (!modalOpenKind || modalOpenKind === 'about') return;
  const i = PROJECTS.findIndex((p) => p.id === modalOpenKind);
  const next = PROJECTS[(i + dir + PROJECTS.length) % PROJECTS.length];
  go({ modal: next.id });
}

overlay.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) { stepProject(Number(step.dataset.step)); return; }
  if (e.target.closest('[data-close]') || !e.target.closest('.modal, .pager')) {
    go({ view: state.view, pic: state.pic });
  }
});

/* ------------------------------------------------------------------
   Room interactions: drag to walk, hover to light a picture
------------------------------------------------------------------- */

function initRoom(root) {
  const stage = $('#stage', root);
  const label = $('#room-label', root);
  const LIMIT = 150;
  let px = 0, py = 0, tx = 0, ty = 0, vx = 0, vy = 0;
  let dragging = false, moved = 0, last = null, raf = null, downTarget = null;

  const fit = () => {
    const s = Math.max(innerWidth / ROOM.width, innerHeight / ROOM.height);
    stage.style.setProperty('--scale', s.toFixed(4));
  };
  fit();
  addEventListener('resize', fit);

  // Camera look-around (follows the cursor) and the intro pull-back zoom.
  let rx = 0, ry = 0, trx = 0, try_ = 0, zoom = 1.32, tzoom = 1.32;
  // Dimensions: the camera travels along Z; rooms are recycled behind the camera so travel is endless.
  const layers = $$('.room__layer', root);
  const layerZ = layers.map((_, k) => -k * DIM_GAP);
  let camz = 0, tcamz = 0, wheelTimer = null;
  let glide = null; // timed travel used by clicks (slower than the wheel's ease)
  const placeLayers = () => {
    layers.forEach((el, k) => {
      // apparent depth of this room relative to the camera (0 = here, negative = ahead, positive = passed)
      while (camz + layerZ[k] > 900) layerZ[k] -= DIMENSIONS * DIM_GAP;
      while (camz + layerZ[k] < -(DIMENSIONS - 1) * DIM_GAP - 500) layerZ[k] += DIMENSIONS * DIM_GAP;
      const z = camz + layerZ[k];
      // passed rooms fade out as they fly by; rooms ahead stay hidden until the camera is about halfway there
      const opacity = z > 0 ? Math.max(0, 1 - z / 720) : Math.max(0, 1 + z / (DIM_GAP * 0.6));
      const gone = z >= 880 || opacity <= 0;
      el.style.transform = `translateZ(${z.toFixed(1)}px)`;
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = gone ? 'hidden' : 'visible';
      el.style.pointerEvents = Math.abs(z) < DIM_GAP / 2 ? 'auto' : 'none';
    });
  };
  placeLayers();

  const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));
  const tick = () => {
    if (!dragging) {
      tx = clamp(tx + vx); ty = clamp(ty + vy);
      vx *= 0.92; vy *= 0.92;
    }
    px += (tx - px) * 0.14; py += (ty - py) * 0.14;
    rx += (trx - rx) * 0.06; ry += (try_ - ry) * 0.06;
    zoom += (tzoom - zoom) * 0.035;
    if (glide) {
      const t = Math.min(1, (performance.now() - glide.t0) / glide.dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in-out cubic
      camz = glide.from + (glide.to - glide.from) * e;
      placeLayers();
      if (t >= 1) glide = null;
    } else if (Math.abs(tcamz - camz) > 0.05) { camz += (tcamz - camz) * 0.08; placeLayers(); }
    stage.style.setProperty('--px', `${px.toFixed(2)}px`);
    stage.style.setProperty('--py', `${py.toFixed(2)}px`);
    stage.style.setProperty('--rx', `${rx.toFixed(3)}deg`);
    stage.style.setProperty('--ry', `${ry.toFixed(3)}deg`);
    stage.style.setProperty('--zoom', zoom.toFixed(4));
    const still = Math.abs(tx - px) < 0.05 && Math.abs(ty - py) < 0.05 && Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05
      && Math.abs(trx - rx) < 0.01 && Math.abs(try_ - ry) < 0.01 && Math.abs(tzoom - zoom) < 0.001 && Math.abs(tcamz - camz) < 0.05 && !glide;
    raf = (!still || dragging) ? requestAnimationFrame(tick) : null;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  kick();

  // Intro: tiles fly in and the camera pulls back. Runs once the preloader is gone
  // (first page load) or immediately when returning to the room.
  const startIntro = () => {
    root.classList.add('is-intro');
    tzoom = 1;
    kick();
    setTimeout(() => root.classList.remove('is-intro'), 2400);
    setTimeout(() => root.classList.add('is-ready'), 200);
  };
  if (document.body.classList.contains('is-loading')) pendingIntro = startIntro;
  else startIntro();

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; last = { x: e.clientX, y: e.clientY, t: performance.now() };
    downTarget = e.target; // pointer capture retargets the later click to the room, so remember what was pressed
    root.classList.add('is-dragging');
    root.setPointerCapture(e.pointerId);
    kick();
  });
  root.addEventListener('pointermove', (e) => {
    if (dragging && last) {
      const s = parseFloat(stage.style.getPropertyValue('--scale')) || 1;
      const dx = (e.clientX - last.x) / s, dy = (e.clientY - last.y) / s;
      moved += Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y); // screen px, so a click with a wobble still counts as a click
      tx = clamp(tx + dx); ty = clamp(ty + dy);
      const dt = Math.max(1, performance.now() - last.t);
      const cap = (v) => Math.max(-30, Math.min(30, v));
      vx = cap(dx / dt * 12); vy = cap(dy / dt * 12);
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
    } else {
      // look around: the camera turns toward the cursor, plus a touch of drift
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      try_ = nx * -9; trx = ny * 6;
      tx = clamp(nx * -24); ty = clamp(ny * -16);
      kick();
    }
    if (label.classList.contains('is-on')) { label.style.left = `${e.clientX}px`; label.style.top = `${e.clientY}px`; }
  });
  const end = () => { if (!dragging) return; dragging = false; last = null; root.classList.remove('is-dragging'); kick(); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  const travel = (dir) => {
    tcamz = (Math.round(tcamz / DIM_GAP) + dir) * DIM_GAP;
    glide = { from: camz, to: tcamz, t0: performance.now(), dur: 2200 };
    kick();
  };
  root.addEventListener('click', (e) => {
    if (moved > 14) return; // a real drag, not a click
    const target = downTarget || e.target;
    const panel = target.closest('.panel--pic');
    if (panel) { go({ view: 'list', pic: panel.dataset.pic, by: state.by }); return; }
    if (target.closest('.room__label')) return;
    // white space: step forward into the next dimension
    travel(1);
  });
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    glide = null;
    tcamz += e.deltaY * (e.deltaMode === 1 ? 40 : 1.6);
    kick();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { tcamz = Math.round(tcamz / DIM_GAP) * DIM_GAP; kick(); }, 160);
  }, { passive: false });
  root.addEventListener('keydown', (e) => {
    const panel = e.target.closest('.panel--pic');
    if (panel && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go({ view: 'list', pic: panel.dataset.pic, by: state.by }); }
  });

  root.addEventListener('pointerover', (e) => {
    const panel = e.target.closest('.panel--pic');
    if (!panel) return;
    const pic = byId(PICTURES, panel.dataset.pic);
    const proj = byId(PROJECTS, pic.project);
    label.innerHTML = `<em>${esc(pic.caption)}</em>${esc(proj.title)} · ${esc(pic[!state.by || state.by === 'project' ? 'materials' : state.by])}`;
    label.classList.add('is-on');
  });
  root.addEventListener('pointerout', (e) => { if (e.target.closest('.panel--pic')) label.classList.remove('is-on'); });

}

/* ------------------------------------------------------------------
   List interactions: scroll picks the active picture
------------------------------------------------------------------- */

function initList(root) {
  const caption = $('#list-caption', root);
  const wrap = $('#list-items', root);
  const items = () => $$('.list__item', root);
  let activeId = items()[0]?.dataset.pic;
  let raf = null;

  const setActive = (el) => {
    if (!el || el.dataset.pic === activeId && el.classList.contains('is-active')) return;
    activeId = el.dataset.pic;
    items().forEach((i) => i.classList.toggle('is-active', i === el));
    const pic = byId(PICTURES, activeId);
    const proj = byId(PROJECTS, pic.project);
    caption.classList.add('is-swapping');
    setTimeout(() => {
      $('.list__date', caption).textContent = proj.date;
      $('.list__title', caption).textContent = pic.caption;
      caption.classList.remove('is-swapping');
    }, 180);
  };

  // the picture crossing the centre line is the active one
  const pick = () => {
    raf = null;
    const line = innerHeight * 0.5;
    let best = null, bestDist = Infinity;
    for (const el of items()) {
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { best = el; break; }
      const d = Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
      if (d < bestDist) { bestDist = d; best = el; }
    }
    setActive(best);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
  addEventListener('scroll', onScroll, { passive: true });

  // infinite scroll: keep appending the related sequence as you approach the end
  const MAX_CYCLES = 12;
  let cycles = 1;
  const more = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting) || cycles >= MAX_CYCLES) return;
    cycles++;
    wrap.insertAdjacentHTML('beforeend', orderedPictures().map((p) => listItem(p, -1, false)).join(''));
  }, { rootMargin: '120% 0px' });
  more.observe($('#list-more', root));

  root._cleanup = () => { removeEventListener('scroll', onScroll); more.disconnect(); };
  scrollTo(0, 0);
}

/* ------------------------------------------------------------------
   Bottom bar: two dropdowns
------------------------------------------------------------------- */

const projectList = $('#project-list');

function applyProjectFocus() {
  const room = $('.room');
  if (!room) return;
  $$('.panel-wrap', room).forEach((w) => w.classList.toggle('is-dim', !!(state.by === 'project' && state.project) && w.dataset.project !== state.project));
}

function syncProjectList() {
  const show = state.by === 'project' && state.view !== 'projects';
  projectList.hidden = !show;
  projectList.innerHTML = PROJECTS.map((p) => `<li><button type="button" data-project="${p.id}" aria-pressed="${p.id === state.project}">${p.id === state.project ? `[${esc(p.title)}]` : esc(p.title)}</button></li>`).join('');
  applyProjectFocus();
}

projectList.addEventListener('click', (e) => {
  const b = e.target.closest('[data-project]');
  if (!b) return;
  state.project = state.project === b.dataset.project ? null : b.dataset.project; // click again to clear
  if (state.view === 'list' || state.view === 'grid') go({ view: state.view, pic: state.pic, by: state.by, project: state.project });
  else syncProjectList();
});

function syncBar() {
  syncProjectList();
  $$('.dd').forEach((dd) => {
    const kind = dd.dataset.dd;
    const value = kind === 'by' ? state.by : state.view === 'projects' ? 'grid' : state.view;
    $('.dd__value', dd).textContent = `[${value || BY_NONE}]`;
    const opts = kind === 'by' ? BY_OPTIONS : AS_OPTIONS;
    $('.dd__menu', dd).innerHTML = opts.map((o) => `<li role="option" tabindex="0" data-value="${o}" aria-selected="${o === value}">${o}</li>`).join('');
  });
}

function closeDropdowns() {
  $$('.dd.is-open').forEach((dd) => { dd.classList.remove('is-open'); $('.dd__btn', dd).setAttribute('aria-expanded', 'false'); });
}

$('#bar').addEventListener('click', (e) => {
  const btn = e.target.closest('.dd__btn');
  const opt = e.target.closest('.dd__menu li');
  if (btn) {
    const dd = btn.closest('.dd');
    const open = !dd.classList.contains('is-open');
    closeDropdowns();
    dd.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) $('.dd__menu li[aria-selected="true"]', dd)?.focus();
    return;
  }
  if (opt) {
    const dd = opt.closest('.dd');
    const value = opt.dataset.value;
    closeDropdowns();
    if (dd.dataset.dd === 'by') {
      state.by = value;
      if (value !== 'project') state.project = null;
      if (state.view === 'list' || state.view === 'grid') go({ view: state.view, pic: state.pic, by: value, project: state.project });
      else syncBar();
    } else {
      go({ view: value, pic: state.pic, by: state.by });
    }
  }
});
$('#bar').addEventListener('keydown', (e) => {
  const opt = e.target.closest('.dd__menu li');
  if (!opt) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); (opt.nextElementSibling || opt.parentElement.firstElementChild).focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); (opt.previousElementSibling || opt.parentElement.lastElementChild).focus(); }
});
document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) closeDropdowns(); });

/* ------------------------------------------------------------------
   Cursor chip: "View Project" follows the pointer over grid tiles
------------------------------------------------------------------- */

const cursorChip = $('#cursor-chip');
(() => {
  let x = 0, y = 0, cx = 0, cy = 0, on = false, raf = null;
  const tick = () => {
    cx += (x - cx) * 0.35; cy += (y - cy) * 0.35;
    cursorChip.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    raf = (on || Math.abs(x - cx) > 0.3 || Math.abs(y - cy) > 0.3) ? requestAnimationFrame(tick) : null;
  };
  const show = () => { if (on) return; on = true; cx = x; cy = y; cursorChip.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(tick); };
  const hide = () => { on = false; cursorChip.classList.remove('is-on'); };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    const over = !!e.target.closest?.('[data-cursor-chip]');
    if (over && !on) show(); else if (!over && on) hide();
  }, { passive: true });
  document.addEventListener('pointerleave', hide);
  addEventListener('hashchange', hide);
})();

/* ------------------------------------------------------------------
   Global keys
------------------------------------------------------------------- */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('.dd.is-open')) { closeDropdowns(); return; }
    if (!overlay.hidden) go({ view: state.view, pic: state.pic });
  }
  if (!overlay.hidden && modalOpenKind !== 'about') {
    if (e.key === 'ArrowRight') stepProject(1);
    if (e.key === 'ArrowLeft') stepProject(-1);
  }
});

/* ------------------------------------------------------------------
   Render cycle
------------------------------------------------------------------- */

function mountView(view) {
  const old = $('.view', app);
  old?._cleanup?.();
  app.innerHTML = VIEWS[view]();
  const root = $('.view', app);
  if (view === 'room') { initRoom(root); applyProjectFocus(); }
  if (view === 'list') initList(root);
  if (view === 'grid' || view === 'projects') scrollTo(0, 0);
  currentView = view;
  document.body.dataset.view = view;
  barWrap.classList.toggle('is-hidden', view === 'projects');
  $$('.menu__nav a').forEach((a) => a.classList.toggle('is-active', (a.dataset.nav === 'projects' && view === 'projects') || (a.dataset.nav === 'about' && state.modal === 'about')));
}

function render() {
  const next = parseHash();
  const viewChanged = next.view !== currentView;
  const contentChanged = next.by !== state.by || next.pic !== state.pic;
  Object.assign(state, next);

  if (viewChanged || (contentChanged && (state.view === 'list' || state.view === 'grid'))) {
    if (currentView) {
      app.classList.add('is-switching');
      setTimeout(() => { mountView(state.view); app.classList.remove('is-switching'); }, 180);
    } else mountView(state.view);
  }
  syncBar();
  if (state.modal) openModal(state.modal); else closeModal();
  $$('.menu__nav a').forEach((a) => a.classList.toggle('is-active', (a.dataset.nav === 'projects' && state.view === 'projects' && !state.modal) || (a.dataset.nav === 'about' && state.modal === 'about')));
}

/* ------------------------------------------------------------------
   Preloader: white screen with the logo while the room's pictures and
   fonts load (at least 1.4 s, at most 4.5 s), then hand over to the intro.
------------------------------------------------------------------- */

let pendingIntro = null;

function preload() {
  const pre = $('#preloader');
  if (!pre) return;
  const t0 = performance.now();
  barWrap.classList.add("is-hidden");
  const imgs = ROOM.panels.filter((p) => p.pic).map((p) => new Promise((res) => {
    const im = new Image(); im.onload = im.onerror = res; im.src = byId(PICTURES, p.pic).src;
  }));
  const ready = Promise.all([...imgs, document.fonts ? document.fonts.ready : Promise.resolve()]);
  Promise.race([ready, new Promise((r) => setTimeout(r, 4500))]).then(() => {
    const wait = Math.max(0, 1400 - (performance.now() - t0));
    setTimeout(() => {
      pre.classList.add('is-done');
      document.body.classList.remove('is-loading');
      if (pendingIntro) { pendingIntro(); pendingIntro = null; }
      setTimeout(() => barWrap.classList.toggle("is-hidden", state.view === "projects" || !overlay.hidden), 1500);
      setTimeout(() => pre.remove(), 700);
    }, wait);
  });
}

addEventListener('hashchange', render);
render();
preload();
