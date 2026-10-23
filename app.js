(function () {
"use strict";

/* ---------- Site settings (edit these) ---------- */
const SITE = {
  name: "Psychology Quiz",
  subject: "Psychology & Pedagogy",
  secondsPerQuestion: 30
};

const ALL = window.QUIZZES || [];
const ONLY = window.QUIZ_ONLY || null;   // set on a topic page so it shows just that quiz
const QUIZZES = ONLY ? ALL.filter(q => q.id === ONLY) : ALL;
const L = "ABCD";
const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Storage helpers (never required) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("pq:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("pq:" + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem("pq:" + k); } catch (e) {} }
};

/* ---------- Theme + sound ---------- */
let theme = store.get("theme", "system");
function applyTheme() {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
applyTheme();
let soundOn = store.get("sound", true);
let actx = null;
function beep(kind) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    const notes = kind === "good" ? [[660, 0], [990, .09]] : kind === "win" ? [[523, 0], [659, .1], [784, .2], [1047, .3]] : [[196, 0], [147, .1]];
    notes.forEach(([f, t]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === "bad" ? "triangle" : "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.12 : 0.16, now + t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
      o.connect(g).connect(actx.destination);
      o.start(now + t); o.stop(now + t + 0.25);
    });
  } catch (e) {}
}

/* ---------- Utilities ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function hexRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
let toastTimer;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600); }

const ICON = {
  mark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-1.6 2.3-4.6 2.4-5.4 5.4s1.6 3.9.8 6.2 2.2 3.9 4.6 1.6c2.4 2.3 5.4.7 4.6-1.6s1.6-3.2.8-6.2-3.8-3.1-5.4-5.4zM12 18.6v3"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5.5 5 5.5 10.2A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.5c0-2.5 1.3-4.3 2.6-5.6.2 1.8 1 3 2.3 3.4C11 7.6 12 2 12 2zm0 20a7.5 7.5 0 0 0 7.5-7.5c0 0-1 1.7-3 2.7a4.5 4.5 0 0 1-9 0c-2-1-3-2.7-3-2.7A7.5 7.5 0 0 0 12 22z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
};

/* ---------- Inkblot renderer (symmetric metaballs) ---------- */
function makeBlot(seedStr, opt) {
  opt = opt || {};
  const R = rng(hashStr(seedStr));
  const balls = [];
  const main = opt.main || 16, specks = opt.specks == null ? 12 : opt.specks;
  for (let i = 0; i < main; i++) {
    const dx = Math.pow(R(), 1.1) * 0.34;           // distance from centre line, biased inward
    balls.push({ x: 0.5 - dx, y: 0.13 + R() * 0.64, r: (0.022 + R() * 0.06 * (1 - dx * 1.2)) * (opt.rs || 1), ph: R() * 6.28, sp: 0.4 + R() * 0.8, am: 0.012 + R() * 0.02 });
  }
  for (let i = 0; i < specks; i++) {
    balls.push({ x: 0.5 - (0.2 + R() * 0.24), y: 0.1 + R() * 0.8, r: 0.005 + R() * 0.01, ph: R() * 6.28, sp: 0.5 + R(), am: 0.006 });
  }
  return balls;
}
function drawBlot(canvas, balls, color, t) {
  const css = canvas.clientWidth || canvas.width;
  if (!css) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(css * dpr);
  if (canvas.width !== W) { canvas.width = W; canvas.height = W; }
  const G = Math.min(W, 320);
  const off = canvas._off || (canvas._off = document.createElement("canvas"));
  off.width = G; off.height = G;
  const octx = off.getContext("2d");
  const img = octx.createImageData(G, G);
  const d = img.data;
  const [cr, cg, cb] = hexRgb(color);
  const bs = balls.map(b => ({ x: b.x + Math.sin(t * b.sp + b.ph) * b.am, y: b.y + Math.cos(t * b.sp * 0.8 + b.ph) * b.am, r2: b.r * b.r }));
  const n = bs.length, inv = 1 / G, half = G / 2;
  for (let py = 0; py < G; py++) {
    const y = (py + 0.5) * inv;
    for (let px = 0; px < half; px++) {
      const x = (px + 0.5) * inv;
      let f = 0;
      for (let k = 0; k < n; k++) { const b = bs[k]; const ddx = x - b.x, ddy = y - b.y; f += b.r2 / (ddx * ddx + ddy * ddy + 1e-6); }
      let a = 0;
      if (f > 0.97) a = f < 1.03 ? (f - 0.97) / 0.06 : 1;
      if (a > 0) {
        const A = Math.round(Math.max(0, Math.min(1, a)) * 255);
        let i = (py * G + px) * 4; d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = A;
        i = (py * G + (G - 1 - px)) * 4; d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = A;
      }
    }
  }
  octx.putImageData(img, 0, 0);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, W);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, 0, 0, W, W);
}
let animId = 0;
function animateBlot(canvas, balls, colorVar) {
  cancelAnimationFrame(animId);
  const color = cssVar(colorVar);
  if (reduceMotion) { drawBlot(canvas, balls, color, 0); return; }
  const t0 = performance.now();
  let last = 0;
  const loop = now => {
    if (!canvas.isConnected) return;
    if (now - last > 33) { drawBlot(canvas, balls, color, (now - t0) / 1000); last = now; }
    animId = requestAnimationFrame(loop);
  };
  animId = requestAnimationFrame(loop);
}

/* ---------- State ---------- */
let quiz = null;      // current quiz object
let run = null;       // current attempt
let filter = "all";
let timer = null;

function quizById(id) { return QUIZZES.find(q => q.id === id); }
function qAt(i) { return quiz.questions[i]; }
function newRun(ids, opts) {
  const perm = {};
  ids.forEach(i => perm[i] = shuffle([0, 1, 2, 3]));
  return { ids, i: 0, ans: {}, perm, done: false, points: 0, streak: 0, bestStreak: 0,
    timed: !!opts.timed, name: opts.name || "", label: opts.label || "", qStart: 0 };
}
function save() { if (quiz && run) store.set("run:" + quiz.id, run); }
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

/* ---------- Shell ---------- */
function topbar(extra) {
  const themeIcon = theme === "dark" ? ICON.moon : theme === "light" ? ICON.sun : ICON.auto;
  return `<header class="topbar">
    <button class="brand" data-act="home" aria-label="All topics">
      <span class="brand-mark" style="color:var(--gold)">${ICON.mark}</span>
      <span class="brand-text"><b>${esc(SITE.name)}</b><span>${esc(SITE.subject)}</span></span>
    </button>
    <div class="icon-row">${extra || ""}
      <button class="icon-btn" data-act="sound" aria-label="${soundOn ? "Mute sounds" : "Turn sounds on"}" title="Sound">${soundOn ? ICON.soundOn : ICON.soundOff}</button>
      <button class="icon-btn" data-act="theme" aria-label="Theme: ${theme}" title="Theme: ${theme}">${themeIcon}</button>
    </div>
  </header>`;
}

/* ---------- Home ---------- */
function renderHome() {
  stopTimer(); quiz = null; run = null;
  document.title = SITE.name;
  app.innerHTML = `<div class="screen">${topbar()}
    <section class="hero">
      <span class="eyebrow">${esc(SITE.subject)}</span>
      <h1>Test yourself, <em>learn why.</em></h1>
      <p>Pick a topic. Every answer is explained the moment you choose it, and you get a full review at the end.</p>
    </section>
    <section class="topics">${QUIZZES.map(q => {
      const best = store.get("best:" + q.id, null);
      const prog = store.get("run:" + q.id, null);
      const inProg = prog && !prog.done && Object.keys(prog.ans || {}).length;
      return `<button class="topic" data-open="${esc(q.id)}">
        <canvas data-blot="${esc(q.id)}" width="92" height="92"></canvas>
        <span class="topic-body"><span class="eyebrow">${esc(q.kicker || "")}</span><h2>${esc(q.title)}</h2>
        <p>${esc(q.blurb || "")}</p>
        <span class="chips"><span class="chip">${q.questions.length} questions</span>${best ? `<span class="chip best">Best ${best.right}/${best.total}</span>` : ""}${inProg ? `<span class="chip">In progress</span>` : ""}</span></span>
      </button>`;
    }).join("")}</section>
    <p class="footer">${esc(SITE.subject)} · practice questions</p></div>`;
  const color = cssVar("--blot");
  app.querySelectorAll("canvas[data-blot]").forEach(c => drawBlot(c, makeBlot(c.dataset.blot, { main: 14, specks: 6 }), color, 0));
}

/* ---------- Start ---------- */
function renderStart() {
  stopTimer();
  document.title = quiz.title + " · " + SITE.name;
  const best = store.get("best:" + quiz.id, null);
  const prog = store.get("run:" + quiz.id, null);
  const inProg = prog && !prog.done && Object.keys(prog.ans || {}).length && prog.ids.every(i => quiz.questions[i]);
  const name = store.get("name", "");
  const timed = store.get("timed", true);
  const mins = Math.max(3, Math.round(quiz.questions.length * 0.4));
  app.innerHTML = `<div class="screen">${topbar(QUIZZES.length > 1 ? `<button class="icon-btn" data-act="home" aria-label="All topics" title="All topics">${ICON.back}</button>` : "")}
    <section class="start">
      <div class="plate"><canvas id="heroBlot"></canvas><span class="plate-tag">${esc(quiz.kicker || "Topic")}</span></div>
      <div class="start-body">
        <h1>${esc(quiz.title)}</h1>
        <p>${esc(quiz.blurb || "")}</p>
        <div class="facts"><span class="chip">${quiz.questions.length} questions</span><span class="chip">About ${mins} min</span><span class="chip">Explained answers</span>${best ? `<span class="chip best">Your best ${best.right}/${best.total}</span>` : ""}</div>
        <div class="field"><label for="nameIn">Your name (shown on your result card)</label>
          <input class="input" id="nameIn" maxlength="40" autocomplete="name" placeholder="e.g. Anna Petrova" value="${esc(name)}"></div>
        <label class="toggle" for="timedIn"><span><b>Timed mode</b><small>${SITE.secondsPerQuestion} seconds per question, faster answers earn bonus points</small></span>
          <span class="switch"><input type="checkbox" id="timedIn" ${timed ? "checked" : ""}><span></span></span></label>
        <button class="btn big" data-act="begin">Start quiz ${ICON.arrow}</button>
        ${inProg ? `<p class="resume">You stopped at question ${prog.i + 1} of ${prog.ids.length}. <button data-act="resume">Continue where you left off</button></p>` : ""}
      </div>
    </section></div>`;
  animateBlot(document.getElementById("heroBlot"), makeBlot(quiz.id, { main: 17, specks: 14, rs: 0.9 }), "--blot");
}

/* ---------- Question ---------- */
function rightCount() { return run.ids.filter(i => run.ans[i] && run.ans[i].o === qAt(i).a).length; }

function hud() {
  const n = run.ids.length;
  return `<div class="hud"><div class="hud-row">
      <span class="hud-q">${run.label ? esc(run.label) + " · " : ""}${run.i + 1} / ${n}</span>
      <span class="hud-spacer"></span>
      <span class="stat streak ${run.streak ? "" : "off"}" id="stStreak" title="Streak">${ICON.flame}<span>${run.streak}</span></span>
      <span class="stat points" id="stPoints" title="Points">${ICON.star}<span>${run.points}</span></span>
    </div>
    <div class="segs">${run.ids.map((qi, k) => {
      const a = run.ans[qi];
      const cls = a ? (a.o === qAt(qi).a ? "ok" : "no") : "";
      const reachable = a || k === firstOpen();
      return `<button class="seg ${cls} ${k === run.i ? "cur" : ""}" ${reachable ? `data-go="${k}"` : "disabled"} aria-label="Question ${k + 1}"></button>`;
    }).join("")}</div></div>`;
}
function firstOpen() { const k = run.ids.findIndex(i => !run.ans[i]); return k < 0 ? run.ids.length : k; }

function renderQuestion(focus) {
  stopTimer();
  const qi = run.ids[run.i], q = qAt(qi), a = run.ans[qi], perm = run.perm[qi];
  const done = !!a;
  const pos = o => perm.indexOf(o);
  const opts = perm.map((o, p) => {
    let cls = "", tag = "", mark = "";
    if (done) {
      if (o === q.a) { cls = "is-correct"; tag = o === a.o ? "Your answer" : "Correct answer"; mark = ICON.check; }
      else if (o === a.o) { cls = "is-wrong"; tag = "Your answer"; mark = ICON.x; }
      else cls = "is-dim";
    }
    return `<li><button class="opt ${cls}" data-o="${o}" ${done ? "disabled" : ""}>
      <span class="key">${L[p]}</span>
      <span class="opt-text">${tag ? `<span class="tag">${tag}</span>` : ""}<span>${esc(q.o[o][0])}</span></span>
      <span class="mark">${mark}</span></button></li>`;
  }).join("");

  let fb = "";
  if (done) {
    const ok = a.o === q.a;
    const head = ok ? "Correct" : a.timeout ? "Time's up" : "Not quite";
    fb = `<div class="fb" aria-live="polite">
      <div class="verdict ${ok ? "ok" : "no"}"><h3>${head}</h3>${ok ? `<span class="gain">+${a.pts} points</span>` : `<span class="chip">Answer: ${L[pos(q.a)]}</span>`}</div>
      ${a.o >= 0 ? `<div class="why"><h4>${ok ? "Why " + L[pos(a.o)] + " is right" : "Why " + L[pos(a.o)] + " is wrong"}</h4><p>${esc(q.o[a.o][1])}</p></div>` : ""}
      ${ok ? "" : `<div class="why"><h4>Why ${L[pos(q.a)]} is right</h4><p>${esc(q.o[q.a][1])}</p></div>`}
      <div class="why keypoint"><h4>Key point</h4><p>${esc(q.e)}</p></div>
    </div>`;
  }
  const last = run.i === run.ids.length - 1;
  const allDone = run.ids.every(i => run.ans[i]);
  const C = 2 * Math.PI * 33;
  app.innerHTML = `<div class="screen">${topbar()}${hud()}
    <article class="qcard">
      <div class="qhead">
        <div class="qplate"><canvas id="qBlot" width="62" height="62"></canvas>
          ${run.timed && !done ? `<svg class="ring" viewBox="0 0 72 72"><circle class="track" cx="36" cy="36" r="33"/><circle class="bar" id="ringBar" cx="36" cy="36" r="33" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>` : ""}
        </div>
        <div class="qmeta"><b>Question ${run.i + 1}</b><span id="qClock">${run.timed && !done ? SITE.secondsPerQuestion + " seconds" : esc(quiz.title)}</span></div>
      </div>
      <h2 class="qtext" id="qtext" tabindex="-1">${esc(q.q)}</h2>
      <ul class="opts">${opts}</ul>
      ${fb}
      ${done ? `<div class="qnav">
        <button class="btn ghost" data-act="prev" ${run.i === 0 ? "disabled" : ""}>${ICON.back} Back</button>
        ${last ? `<button class="btn" data-act="finish" ${allDone ? "" : "disabled"}>${allDone ? "See my results" : "Answer all to finish"} ${ICON.arrow}</button>`
               : `<button class="btn" data-act="next">Next question ${ICON.arrow}</button>`}
      </div>` : ""}
    </article>
    <p class="kbd-hint">Keys: 1–4 or A–D to answer · Enter for next</p></div>`;

  const color = done ? cssVar(a.o === q.a ? "--good" : "--bad") : cssVar("--blot");
  drawBlot(document.getElementById("qBlot"), makeBlot(quiz.id + ":" + qi, { main: 12, specks: 5 }), color, 0);

  if (focus === "q") document.getElementById("qtext").focus({ preventScroll: true });
  if (focus === "next") { const b = app.querySelector('[data-act="next"],[data-act="finish"]:not(:disabled)'); if (b) b.focus({ preventScroll: true }); }

  if (run.timed && !done) {
    const total = SITE.secondsPerQuestion * 1000;
    run.qStart = Date.now();
    const bar = document.getElementById("ringBar"), clock = document.getElementById("qClock");
    timer = setInterval(() => {
      const left = Math.max(0, total - (Date.now() - run.qStart));
      if (bar) { bar.setAttribute("stroke-dashoffset", String(C * (1 - left / total))); bar.classList.toggle("low", left < 8000); }
      if (clock) clock.textContent = Math.ceil(left / 1000) + " seconds";
      if (left <= 0) { stopTimer(); answer(-1); }
    }, 100);
  } else if (!done) {
    run.qStart = Date.now();
  }
}

function bump(id) { const el = document.getElementById(id); if (el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } }

function answer(o) {
  const qi = run.ids[run.i];
  if (run.ans[qi]) return;
  stopTimer();
  const q = qAt(qi);
  const ms = Math.max(0, Date.now() - (run.qStart || Date.now()));
  const ok = o === q.a;
  let pts = 0;
  if (ok) {
    run.streak++;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    pts = 100 + Math.min(run.streak - 1, 5) * 10;
    if (run.timed) pts += Math.round(50 * Math.max(0, 1 - ms / (SITE.secondsPerQuestion * 1000)));
    run.points += pts;
  } else run.streak = 0;
  run.ans[qi] = { o, ms, pts, timeout: o < 0 };
  save();
  beep(ok ? "good" : "bad");
  renderQuestion("next");
  if (ok) { bump("stPoints"); bump("stStreak"); }
  if (ok && [3, 5, 10, 15, 20].includes(run.streak)) toast(run.streak + " in a row");
}

/* ---------- Results ---------- */
const RANKS = [
  [95, "Professor Emeritus", "Flawless. You could be teaching this topic."],
  [80, "Resident Psychologist", "Strong grasp. Check the few you missed and you're exam-ready."],
  [60, "Clinical Intern", "Good base. Review the missed questions to lock it in."],
  [40, "Lab Assistant", "Getting there. Read the explanations below, then retry what you missed."],
  [0, "First-Year Observer", "A starting point. Go through the review, then try the missed ones again."]
];
function finish() {
  stopTimer();
  run.done = true;
  const right = rightCount(), total = run.ids.length;
  if (!run.label) {
    const prev = store.get("best:" + quiz.id, null);
    if (!prev || right > prev.right || (right === prev.right && run.points > (prev.points || 0))) store.set("best:" + quiz.id, { right, total, points: run.points });
  }
  save();
  renderResults(true);
}
function renderResults(celebrate) {
  stopTimer();
  const total = run.ids.length, right = rightCount(), pct = Math.round(right / total * 100);
  const rank = RANKS.find(r => pct >= r[0]);
  const times = run.ids.map(i => run.ans[i] && run.ans[i].ms).filter(x => x != null);
  const avg = times.length ? Math.round(times.reduce((s, x) => s + x, 0) / times.length / 1000) : 0;
  const wrong = run.ids.filter(i => !run.ans[i] || run.ans[i].o !== qAt(i).a);
  const C = 2 * Math.PI * 56;
  const items = run.ids.map((qi, k) => ({ qi, k })).filter(({ qi }) => filter === "all" || wrong.includes(qi)).map(({ qi, k }) => {
    const q = qAt(qi), a = run.ans[qi], ok = a && a.o === q.a;
    const yours = !a ? "Not answered" : a.o < 0 ? "No answer (time ran out)" : q.o[a.o][0];
    return `<li class="ri ${ok ? "ok" : "no"}">
      <div class="ri-head"><span class="dot">${ok ? ICON.check : ICON.x}</span><p class="ri-q">${k + 1}. ${esc(q.q)}</p></div>
      <div class="ri-a"><span><b>You:</b> <span class="${ok ? "right" : "yours"}">${esc(yours)}</span></span>
      ${ok ? "" : `<span><b>Correct:</b> <span class="right">${esc(q.o[q.a][0])}</span></span>`}</div>
      <details><summary>Explanation</summary>${!ok && a && a.o >= 0 ? `<p>${esc(q.o[a.o][1])}</p>` : ""}<p>${esc(q.e)}</p></details>
    </li>`;
  }).join("");
  const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  app.innerHTML = `<div class="screen">${topbar()}
    <section class="result" aria-labelledby="resRank">
      <canvas class="res-blot" id="resBlot" width="300" height="300"></canvas>
      <span class="eyebrow">${esc(quiz.title)}${run.label ? " · " + esc(run.label) : ""}</span>
      <div class="res-top">
        <div class="score-ring"><svg viewBox="0 0 132 132"><circle class="track" cx="66" cy="66" r="56"/><circle class="bar" id="scoreBar" cx="66" cy="66" r="56" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div class="num"><span><b>${right}</b><small>of ${total}</small></span></div></div>
        <div class="res-title">${run.name ? `<span class="who">${esc(run.name)}</span>` : ""}<h2 id="resRank">${rank[1]}</h2><p>${rank[2]}</p></div>
      </div>
      <div class="res-stats">
        <div class="rs"><b>${pct}%</b><span>Accuracy</span></div>
        <div class="rs"><b>${run.points}</b><span>Points</span></div>
        <div class="rs"><b>${run.bestStreak}</b><span>Best streak</span></div>
        <div class="rs"><b>${avg}s</b><span>Avg per question</span></div>
      </div>
      <p class="res-foot">${esc(SITE.subject)} · ${date}${run.timed ? " · Timed" : ""}</p>
    </section>
    <div class="actions">
      ${wrong.length ? `<button class="btn" data-act="retry">${ICON.redo} Retry the ${wrong.length} I missed</button>` : ""}
      <button class="btn ghost" data-act="restart">${ICON.redo} Start again</button>
      <button class="btn ghost" data-act="copy">${ICON.copy} Copy my score</button>
    </div>
    <input class="input copy-out" id="copyOut" readonly hidden aria-label="Score text">
    <section>
      <div class="review-head"><h2>Review</h2>
        <div class="seg-ctl" role="group" aria-label="Filter">
          <button data-filter="all" aria-pressed="${filter === "all"}">All ${total}</button>
          <button data-filter="wrong" aria-pressed="${filter === "wrong"}">Missed ${wrong.length}</button></div></div>
      ${items ? `<ol class="review">${items}</ol>` : `<p class="empty">Nothing missed. Every answer was correct.</p>`}
    </section></div>`;
  const ink = cssVar("--plate-fg") || "#efeeff";
  drawBlot(document.getElementById("resBlot"), makeBlot(quiz.id + ":result", { main: 20, specks: 12 }), ink, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => { const b = document.getElementById("scoreBar"); if (b) b.setAttribute("stroke-dashoffset", String(C * (1 - right / total))); }));
  if (celebrate) { window.scrollTo({ top: 0 }); if (pct >= 70) { confetti(); beep("win"); } }
}

/* ---------- Confetti (ink drops) ---------- */
function confetti() {
  if (reduceMotion) return;
  const cv = document.getElementById("confetti"), ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const cols = [cssVar("--gold"), cssVar("--ink"), cssVar("--good"), "#ff7a2f"];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12, vy: -6 - Math.random() * 9, r: 3 + Math.random() * 5,
    c: cols[Math.floor(Math.random() * cols.length)], s: Math.random() < 0.5
  }));
  const t0 = performance.now();
  (function step(now) {
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => {
      p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy;
      ctx.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx.fillStyle = p.c; ctx.beginPath();
      if (p.s) ctx.ellipse(p.x, p.y, p.r, p.r * 1.35, Math.atan2(p.vy, p.vx), 0, 6.283);
      else ctx.arc(p.x, p.y, p.r * 0.8, 0, 6.283);
      ctx.fill();
    });
    if (t < 2600) requestAnimationFrame(step); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* ---------- Routing ---------- */
function route() {
  const id = (location.hash || "").replace(/^#/, "");
  const q = quizById(id);
  if (q) { quiz = q; run = null; filter = "all"; renderStart(); }
  else if (QUIZZES.length === 1) { quiz = QUIZZES[0]; run = null; renderStart(); }
  else renderHome();
  window.scrollTo({ top: 0 });
}
function goHome() {
  if (QUIZZES.length === 1) { route(); return; }
  if (location.hash) location.hash = ""; else renderHome();
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
window.addEventListener("hashchange", route);

/* ---------- Events ---------- */
app.addEventListener("click", e => {
  const t = e.target;
  const open = t.closest("[data-open]");
  if (open) { location.hash = open.dataset.open; return; }
  const opt = t.closest(".opt");
  if (opt && !opt.disabled) { answer(+opt.dataset.o); return; }
  const seg = t.closest("[data-go]");
  if (seg) { run.i = +seg.dataset.go; save(); renderQuestion("q"); return; }
  const f = t.closest("[data-filter]");
  if (f) { filter = f.dataset.filter; renderResults(false); return; }
  const b = t.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "home") goHome();
  else if (act === "theme") { theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system"; store.set("theme", theme); applyTheme(); rerender(); }
  else if (act === "sound") { soundOn = !soundOn; store.set("sound", soundOn); rerender(); if (soundOn) beep("good"); }
  else if (act === "begin") {
    const name = (document.getElementById("nameIn").value || "").trim();
    const timed = document.getElementById("timedIn").checked;
    store.set("name", name); store.set("timed", timed);
    run = newRun(quiz.questions.map((_, i) => i), { name, timed });
    save(); renderQuestion("q"); window.scrollTo({ top: 0 });
  }
  else if (act === "resume") { run = store.get("run:" + quiz.id, null); if (run) { renderQuestion("q"); window.scrollTo({ top: 0 }); } }
  else if (act === "next") { run.i++; save(); renderQuestion("q"); window.scrollTo({ top: 0 }); }
  else if (act === "prev") { run.i--; save(); renderQuestion("q"); }
  else if (act === "finish") finish();
  else if (act === "restart") { run = newRun(quiz.questions.map((_, i) => i), { name: run.name, timed: run.timed }); filter = "all"; save(); renderQuestion("q"); window.scrollTo({ top: 0 }); }
  else if (act === "retry") {
    const wrong = run.ids.filter(i => !run.ans[i] || run.ans[i].o !== qAt(i).a);
    run = newRun(wrong, { name: run.name, timed: run.timed, label: "Retry" }); filter = "all"; save(); renderQuestion("q"); window.scrollTo({ top: 0 });
  }
  else if (act === "copy") {
    const total = run.ids.length, right = rightCount(), pct = Math.round(right / total * 100), rank = RANKS.find(r => pct >= r[0])[1];
    const txt = `${run.name ? run.name + ": " : ""}${right}/${total} (${pct}%) on ${SITE.name}, ${quiz.title}${run.label ? " [" + run.label + "]" : ""}. Rank: ${rank}. ${run.points} points.`;
    const out = document.getElementById("copyOut");
    const fallback = () => { out.hidden = false; out.value = txt; out.select(); toast("Select and copy the text"); };
    try { navigator.clipboard.writeText(txt).then(() => toast("Score copied"), fallback); } catch (err) { fallback(); }
  }
});
function rerender() {
  if (!quiz) renderHome();
  else if (!run) renderStart();
  else if (run.done) renderResults(false);
  else { const keep = run.qStart; renderQuestion(); if (keep && run.timed) run.qStart = keep; }
}
document.addEventListener("keydown", e => {
  if (!run || run.done || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const qi = run.ids[run.i];
  const k = e.key.toUpperCase();
  let p = L.indexOf(k); if (p < 0) p = ["1", "2", "3", "4"].indexOf(e.key);
  if (p >= 0 && !run.ans[qi]) { e.preventDefault(); answer(run.perm[qi][p]); return; }
  if (e.key === "Enter" && run.ans[qi] && !e.target.closest("button")) {
    const b = app.querySelector('[data-act="next"],[data-act="finish"]:not(:disabled)'); if (b) { e.preventDefault(); b.click(); }
  }
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (theme === "system") rerender(); });

route();
})();
