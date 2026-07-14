/* Cultural Sound Studio — app logic. No dependencies; audio is synthesized live via Web Audio. */

const state = {
  selected: [],                       // element ids in the composition
  unlocked: new Set(JSON.parse(localStorage.getItem("css-unlocked") || "[]")),
  filter: "All",
  fidelity: 0.35,                     // 0 reproduce ↔ 1 reinterpret
  blend: 0.35,                        // 0 single tradition ↔ 1 blended
  promptTags: [],
};
const byId = (id) => ELEMENTS.find((e) => e.id === id);
const $ = (s) => document.querySelector(s);
const icon = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ---------------- Audio engine (Web Audio, synthesized) ---------------- */
const AE = {
  ctx: null, out: null, nodes: [], noiseBuf: null, endTimer: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = this.ctx.createDynamicsCompressor();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.55;
      this.out.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  stop() {
    this.nodes.forEach((n) => { try { n.stop(); } catch (_) {} });
    this.nodes = [];
    clearTimeout(this.endTimer);
    document.querySelectorAll(".is-playing").forEach((b) => b.classList.remove("is-playing"));
  },
  pluck(freq, t, dur = 0.5, vol = 0.35, type = "triangle") {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur);
    this.nodes.push(o);
  },
  noise(t, { dur = 0.08, vol = 0.4, freq = 2000, q = 1 } = {}) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur);
    this.nodes.push(s);
  },
  drum(t, { freq = 100, decay = 0.25, vol = 0.8 } = {}) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + decay);
    this.nodes.push(o);
    this.noise(t, { dur: 0.02, vol: vol * 0.3, freq: 3500 });
  },
  hit(name, t) {
    ({
      hi:   () => { this.pluck(950, t, 0.09, 0.35, "square"); this.noise(t, { dur: 0.05, vol: 0.25, freq: 2400, q: 4 }); },
      bass: () => this.drum(t, { freq: 75, decay: 0.3, vol: 0.9 }),
      tone: () => this.drum(t, { freq: 185, decay: 0.14, vol: 0.55 }),
      slap: () => this.noise(t, { dur: 0.09, vol: 0.5, freq: 2600, q: 1.5 }),
      don:  () => this.drum(t, { freq: 58, decay: 0.42, vol: 1.05 }),
      ka:   () => this.noise(t, { dur: 0.05, vol: 0.3, freq: 4200, q: 3 }),
      acc:  () => this.noise(t, { dur: 0.1, vol: 0.5, freq: 1500, q: 0.8 }),
      tick: () => this.noise(t, { dur: 0.05, vol: 0.18, freq: 1800, q: 0.8 }),
    })[name]();
  },
  freq(el, idx, rootOverride) {
    const s = el.sound, root = rootOverride || s.root;
    return s.cents ? root * Math.pow(2, s.cents[idx] / 1200) : root * Math.pow(2, s.notes[idx] / 12);
  },
  // Schedule one element for `bars` bars starting at t0. eighth = seconds per 8th note.
  schedule(el, t0, bars, eighth, rootOverride) {
    const s = el.sound;
    if (!s) return;
    if (s.kind === "rhythm") {
      const slots = s.twelve ? 12 : s.bars2 ? 16 : 8;
      const cycle = slots * eighth, reps = Math.max(1, Math.round((bars * 8 * eighth) / cycle));
      for (let r = 0; r < reps; r++)
        s.pattern.forEach((p) => this.hit(p.s, t0 + r * cycle + p.i * eighth));
    } else if (s.kind === "arp") {
      const reps = bars;
      for (let r = 0; r < reps; r++)
        s.notes.forEach((n, i) => this.pluck((rootOverride || s.root) * Math.pow(2, n / 12), t0 + r * 8 * eighth + i * eighth, 0.6, 0.28));
    } else if (s.kind === "pipes") {
      const step = eighth * 2;
      s.notes.forEach((_, i) => {
        const f = this.freq(el, i, rootOverride), t = t0 + i * step;
        this.pluck(f, t, step * 1.6, 0.3, "sine");
        this.noise(t, { dur: step, vol: 0.06, freq: f * 2, q: 6 });
      });
    } else if (s.kind === "scale") {
      const count = (s.cents || s.notes).length, step = eighth * 2;
      for (let i = 0; i < count; i++)
        this.pluck(this.freq(el, i, rootOverride), t0 + i * step, 0.8, 0.3);
    }
  },
  durationOf(el, bars, eighth) {
    const s = el.sound;
    if (!s) return 0;
    if (s.kind === "rhythm" || s.kind === "arp") return bars * 8 * eighth + 0.6;
    return ((s.cents || s.notes).length + 1) * eighth * 2 + 0.8;
  },
  preview(el, btn) {
    if (btn && btn.classList.contains("is-playing")) { this.stop(); return; }
    this.stop(); this.init();
    const eighth = 0.3, t0 = this.ctx.currentTime + 0.06;
    this.schedule(el, t0, 2, eighth);
    if (btn) {
      btn.classList.add("is-playing");
      this.endTimer = setTimeout(() => btn.classList.remove("is-playing"), this.durationOf(el, 2, eighth) * 1000);
    }
  },
  playComposition(els, btn) {
    if (btn.classList.contains("is-playing")) { this.stop(); return; }
    this.stop(); this.init();
    const eighth = 0.3, bars = 4, t0 = this.ctx.currentTime + 0.08;
    let melodics = 0;
    els.forEach((el) => {
      if (!el.sound) return;
      const isMelodic = el.sound.kind !== "rhythm";
      // Transpose melodic elements to a shared tonal center so layers agree.
      const root = isMelodic ? (el.sound.root >= 400 ? 440 : 220) : null;
      const offset = isMelodic ? melodics++ * 4 * eighth : 0;
      AE.schedule(el, t0 + offset, bars, eighth, root);
    });
    btn.classList.add("is-playing");
    this.endTimer = setTimeout(() => btn.classList.remove("is-playing"), (bars * 8 * eighth + 1.5) * 1000);
  },
    // Offline render – returns a Promise that resolves with an AudioBuffer
  renderOffline(elements, bars = 4, eighth = 0.3) {
    // Calculate total duration (matching playComposition)
    let maxDur = 0;
    let melodics = 0;
    elements.forEach(el => {
      if (!el.sound) return;
      const isMelodic = el.sound.kind !== "rhythm";
      const offset = isMelodic ? melodics++ * 4 * eighth : 0;
      const dur = this.durationOf(el, bars, eighth) + offset;
      if (dur > maxDur) maxDur = dur;
    });
    const totalDur = maxDur + 0.2; // extra tail

    const sampleRate = 44100;
    const ctx = new OfflineAudioContext(2, sampleRate * totalDur, sampleRate);

    // Copy gain and compressor setup (like in init)
    const comp = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(comp);
    comp.connect(ctx.destination);

    // Schedule each element (reuse schedule logic)
    let melodicsIdx = 0;
    const t0 = 0; // start at 0 for offline
    elements.forEach(el => {
      if (!el.sound) return;
      const isMelodic = el.sound.kind !== "rhythm";
      const root = isMelodic ? (el.sound.root >= 400 ? 440 : 220) : null;
      const offset = isMelodic ? melodicsIdx++ * 4 * eighth : 0;
      // We need to re-implement schedule using this offline context
      const s = el.sound;
      if (!s) return;
      // Duplicate the scheduling logic but using ctx and out
      const scheduleOffline = (el, t0, bars, eighth, root) => {
        const s = el.sound;
        if (!s) return;
        const pluckOff = (freq, t, dur = 0.5, vol = 0.35, type = "triangle") => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = type;
          o.frequency.value = freq;
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          o.connect(g);
          g.connect(out);
          o.start(t);
          o.stop(t + dur);
        };
        const noiseOff = (t, { dur = 0.08, vol = 0.4, freq = 2000, q = 1 } = {}) => {
          // Need noise buffer – we can generate one in this context
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const s = ctx.createBufferSource();
          s.buffer = buf;
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = freq;
          f.Q.value = q;
          const g = ctx.createGain();
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          s.connect(f);
          f.connect(g);
          g.connect(out);
          s.start(t);
          s.stop(t + dur);
        };
        const drumOff = (t, { freq = 100, decay = 0.25, vol = 0.8 } = {}) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(freq * 2.2, t);
          o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + decay);
          o.connect(g);
          g.connect(out);
          o.start(t);
          o.stop(t + decay);
          noiseOff(t, { dur: 0.02, vol: vol * 0.3, freq: 3500 });
        };
        const hitOff = (name, t) => {
          ({
            hi:   () => { pluckOff(950, t, 0.09, 0.35, "square"); noiseOff(t, { dur: 0.05, vol: 0.25, freq: 2400, q: 4 }); },
            bass: () => drumOff(t, { freq: 75, decay: 0.3, vol: 0.9 }),
            tone: () => drumOff(t, { freq: 185, decay: 0.14, vol: 0.55 }),
            slap: () => noiseOff(t, { dur: 0.09, vol: 0.5, freq: 2600, q: 1.5 }),
            don:  () => drumOff(t, { freq: 58, decay: 0.42, vol: 1.05 }),
            ka:   () => noiseOff(t, { dur: 0.05, vol: 0.3, freq: 4200, q: 3 }),
            acc:  () => noiseOff(t, { dur: 0.1, vol: 0.5, freq: 1500, q: 0.8 }),
            tick: () => noiseOff(t, { dur: 0.05, vol: 0.18, freq: 1800, q: 0.8 }),
          })[name]();
        };
        const freqOff = (el, idx, rootOverride) => {
          const s = el.sound;
          const root = rootOverride || s.root;
          return s.cents ? root * Math.pow(2, s.cents[idx] / 1200) : root * Math.pow(2, s.notes[idx] / 12);
        };
        if (s.kind === "rhythm") {
          const slots = s.twelve ? 12 : s.bars2 ? 16 : 8;
          const cycle = slots * eighth;
          const reps = Math.max(1, Math.round((bars * 8 * eighth) / cycle));
          for (let r = 0; r < reps; r++)
            s.pattern.forEach((p) => hitOff(p.s, t0 + r * cycle + p.i * eighth));
        } 
        else if (s.kind === "arp") {
          const reps = bars;
          for (let r = 0; r < reps; r++)
            s.notes.forEach((n, i) => pluckOff((root || s.root) * Math.pow(2, n / 12), t0 + r * 8 * eighth + i * eighth, 0.6, 0.28));
        } 
        else if (s.kind === "pipes") {
          const step = eighth * 2;
          s.notes.forEach((_, i) => {
            const f = freqOff(el, i, root);
            const t = t0 + i * step;
            pluckOff(f, t, step * 1.6, 0.3, "sine");
            noiseOff(t, { dur: step, vol: 0.06, freq: f * 2, q: 6 });
          });
        } 
        else if (s.kind === "scale") {
          const count = (s.cents || s.notes).length;
          const step = eighth * 2;
          for (let i = 0; i < count; i++)
            pluckOff(freqOff(el, i, root), t0 + i * step, 0.8, 0.3);
        }
      };

      scheduleOffline(el, t0 + offset, bars, eighth, root);
    });

    return ctx.startRendering();
  },
};

function animateTrack(track, duration){

  const head = track.querySelector(".track-playhead");
  
  track.classList.add("playing");
  
  head.animate(
  [
  {left:"0%"},
  {left:"100%"}
  ],
  {
  duration,
  easing:"linear"
  }
  );
  
  setTimeout(()=>{
  track.classList.remove("playing");
  },duration);
}  

/* ---------------- Library grid ---------------- */
const STATUS_META = {
  open: { label: "Open", ic: "unlock" },
  "learn-first": { label: "Learn first", ic: "book" },
  restricted: { label: "Restricted", ic: "ban" },
};
function statusOf(el) {
  return el.status === "learn-first" && state.unlocked.has(el.id) ? "unlocked" : el.status;
}
function renderGrid() {
  const grid = $("#grid");
  grid.innerHTML = "";
  ELEMENTS.filter((e) => state.filter === "All" || e.type === state.filter).forEach((el) => {
    const st = statusOf(el);
    const card = document.createElement("button");
    card.className = `card st-${st}` + (state.selected.includes(el.id) ? " in-comp" : "");
    card.dataset.id = el.id;
    const chip = st === "unlocked"
      ? `<span class="status st-unlocked">${icon("check")} Unlocked</span>`
      : `<span class="status st-${st}">${icon(STATUS_META[el.status].ic)} ${STATUS_META[el.status].label}</span>`;
    card.innerHTML = `
      <div class="card-top"><span class="type t-${el.type}">${el.type}</span>${chip}</div>
      <h3>${el.name}</h3>
      <p class="trad">${icon("globe")} ${el.tradition} · ${el.region}</p>`;
    card.addEventListener("click", () => openModal(el.id));
    grid.appendChild(card);
  });
}

/* ---------------- Detail modal ---------------- */
function openModal(id) {
  const el = byId(id), st = statusOf(el);
  const wrap = $("#modal");
  const canUse = st === "open" || st === "unlocked";
  const inComp = state.selected.includes(id);
  let statusBlock = "";
  if (st === "learn-first") {
  // Countdown logic – 20 seconds
  let secondsLeft = 20;
  statusBlock = `<div class="learn-box">
    <h4>${icon("book")} Learn before you use this</h4><p>${el.context}</p>
    <button class="btn btn-gold" id="m-unlock" disabled>${icon("unlock")} Wait ${secondsLeft}s</button>
  </div>`;
  // We'll update the button after the modal is inserted
  // Use a small delay to ensure the DOM is ready
  setTimeout(() => {
    const unlockBtn = document.getElementById("m-unlock");
    if (!unlockBtn) return;
    const timer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = `${icon("unlock")} I've read this — unlock`;
        unlockBtn.onclick = () => {
          state.unlocked.add(id);
          localStorage.setItem("css-unlocked", JSON.stringify([...state.unlocked]));
          renderGrid(); renderSuggestions(); openModal(id);
        };
      } else {
        unlockBtn.innerHTML = `${icon("unlock")} Wait ${secondsLeft}s`;
      }
    }, 1000);
  }, 50);
}
  else if (st === "restricted")
    statusBlock = `<div class="restrict-box">
      <h4>${icon("ban")} Why this stays view-only</h4><p>${el.context}</p>
      <p class="mut">This studio doesn't imitate sounds whose custodians have asked for them not to be taken. Therefore we do not provide preview.</p>
    </div>`;
  else if (st === "unlocked")
    statusBlock = `<div class="learn-box unlocked-box"><h4>${icon("check")} Unlocked by learning</h4><p>${el.context}</p></div>`;

  wrap.innerHTML = `
  <div class="modal-card" role="dialog" aria-modal="true">
    <button class="modal-x" id="m-close" aria-label="Close">✕</button>
    <div class="card-top"><span class="type t-${el.type}">${el.type}</span>
      <span class="status st-${st}">${icon(st === "unlocked" ? "check" : STATUS_META[el.status].ic)} ${st === "unlocked" ? "Unlocked" : STATUS_META[el.status].label}</span></div>
    <h2>${el.name}</h2>
    <p class="trad">${icon("globe")} ${el.tradition} · ${el.region}</p>
    <div class="chain">
      <div class="chain-row"><span>Meaning</span><p>${el.meaning}</p></div>
      <div class="chain-row"><span>Source</span><p>${el.source}</p></div>
    </div>
    ${statusBlock}
    <div class="modal-actions">
      ${el.sound && canUse ? `<button class="btn" id="m-play">${icon("play")} Preview</button>` : ""}
      ${canUse ? `<button class="btn btn-gold" id="m-add">${inComp ? icon("check") + " In composition — remove" : icon("plus") + " Add to composition"}</button>` : ""}
    </div>
  </div>`;
  wrap.classList.remove("hidden");
  wrap.onclick = (e) => { if (e.target === wrap) closeModal(); };
  $("#m-close").onclick = closeModal;
  const play = $("#m-play");
  if (play) play.onclick = () => {
  
  AE.preview(el, play);
  
  animateTrack(row, 5200);
  
  };
  const add = $("#m-add");
  if (add) add.onclick = () => { toggleElement(id); closeModal(); };
  const unlock = $("#m-unlock");
  if (unlock) unlock.onclick = () => {
    state.unlocked.add(id);
    localStorage.setItem("css-unlocked", JSON.stringify([...state.unlocked]));
    renderGrid(); renderSuggestions(); renderProducer(); openModal(id);
  };
}
function closeModal() { AE.stop(); $("#modal").classList.add("hidden"); }

/* ---------------- Composition ---------------- */
function toggleElement(id) {
  const i = state.selected.indexOf(id);
  if (i >= 0) state.selected.splice(i, 1);
  else state.selected.push(id);
  renderGrid(); renderComp(); renderFlags(); renderSuggestions(); renderProducer(); 
}
function renderComp() {
  const box = $("#comp");
  if (!state.selected.length) {
    box.innerHTML = `<p class="empty">Nothing here yet. Click an element to hear it then add it, or describe what you want to the assistant.</p>`;
    return;
  }
  box.innerHTML = "";
  const icons = {
    Rhythm: "🥁",
    Scale: "🎼",
    Instrument: "🎵",
    Song: "🎤"
    };
  state.selected.forEach(id => {

      const el = byId(id);
      
      const row = document.createElement("div");
      row.className = "track";
      
      row.innerHTML = `
      
      <div class="track-top">
      
      <div class="track-title">
      
      <div class="track-icon">
      ${icons[el.type] || "🎶"}
      </div>
      
      <div class="track-info">
      <strong>${el.name}</strong>
      <span>${el.tradition} • ${el.region}</span>
      </div>
      
      </div>
      
      <div class="track-type">
      ${el.type}
      </div>
      
      </div>
      
      <div class="track-controls">
      
      ${
      el.sound
      ? `<button class="btn btn-sm track-play">▶</button>`
      : `<button class="btn btn-sm track-play" disabled>—</button>`
      }
      
      <input
      type="range"
      min="0"
      max="100"
      value="80"
      >
      
      <button class="track-remove">✕</button>
      
      </div>
      
      <div class="track-timeline">
      
      <div class="track-wave"></div>
      
      <div class="track-playhead"></div>
      
      </div>
      
      `;
      
      const remove = row.querySelector(".track-remove");
      
      remove.onclick = () => toggleElement(id);
      
      const play = row.querySelector(".track-play");
      
      if(el.sound){
      
      play.onclick = () => AE.preview(el, play);
      
      }
      
      box.appendChild(row);
      
    });
}

/* ---------------- Ethics flags ---------------- */
function computeFlags() {
  const els = state.selected.map(byId), flags = [];
  const trads = [...new Set(els.map((e) => e.tradition))];
  if (trads.length >= 3 && state.blend < 0.4)
    flags.push({ level: "warn", text: `You're combining ${trads.length} traditions (${trads.join(", ")}) while set close to “single tradition”. Please be warned that in this case, distinct musics could get flattened into one vague flavor. We suggest either narrow your palette or move the blend slider to own this as a deliberate fusion.` });
  const modal = els.filter((e) => e.type === "Scale");
  if (modal.length >= 2)
    flags.push({ level: "warn", text: `${modal.map((m) => m.name).join(" and ")} are separate modal systems with independent grammar. Please be warned that averaging them together could risk becoming a generic music that belonged to no culture.` });
  if (els.length && trads.length >= 2 && state.fidelity > 0.6)
    flags.push({ level: "info", text: `You're leaning toward reinterpretation across ${trads.length} traditions. Please be informed that our export will describe this piece as inspired by its list of sources.` });
  if (els.some((e) => statusOf(e) === "unlocked"))
    flags.push({ level: "good", text: `You unlocked ${els.filter((e) => statusOf(e) === "unlocked").length} element(s).` });
  return flags;
}
function renderFlags() {
  const box = $("#flags");
  const flags = computeFlags();
  box.innerHTML = flags.map((f) =>
    `<div class="flag f-${f.level}">${icon(f.level === "warn" ? "warn" : f.level === "good" ? "check" : "spark")}<p>${f.text}</p></div>`).join("");
}

/* ---------------- Transparent suggestions ---------------- */
function scoreElement(el, selectedEls) {
  if (el.status === "restricted" || state.selected.includes(el.id)) return null;
  const selTags = new Set(selectedEls.flatMap((e) => e.tags));
  let score = 0; const reasons = [];
  const shared = el.tags.filter((t) => selTags.has(t));
  if (shared.length) { score += shared.length; reasons.push(`shares a ${shared[0]} role with what you've picked`); }
  const promptShared = el.tags.filter((t) => state.promptTags.includes(t));
  if (promptShared.length) { score += promptShared.length * 2; reasons.push(`matches your ask for something ${promptShared.join(", ")}`); }
  const sameTrad = selectedEls.some((e) => e.tradition === el.tradition || e.region === el.region);
  if (selectedEls.length) {
    if (sameTrad) { score += (1 - state.blend) * 2; if (state.blend < 0.5) reasons.push(`stays within the ${el.tradition} tradition. This matches your “single tradition” setting`); }
    else { score += state.blend * 1.6; if (state.blend >= 0.5) reasons.push(`brings in a different tradition. This matches your “blended” setting`); }
  }
  score += 1 - Math.abs(state.fidelity - el.flex);
  if (statusOf(el) === "learn-first") score -= 0.3;
  return { el, score, reasons };
}
function renderSuggestions() {
  const box = $("#suggest");
  const selectedEls = state.selected.map(byId);
  if (!selectedEls.length && !state.promptTags.length) {
    box.innerHTML = `<p class="empty">Suggestions appear here once you add an element or send a prompt.</p>`;
    return;
  }
  const ranked = ELEMENTS.map((e) => scoreElement(e, selectedEls)).filter(Boolean)
    .sort((a, b) => b.score - a.score).slice(0, 3);
  box.innerHTML = ranked.map(({ el, reasons }) => {
    const locked = statusOf(el) === "learn-first";
    return `<div class="sug" data-id="${el.id}">
      <div class="sug-head"><strong>${el.name}</strong><span class="trad">${el.tradition}</span></div>
      <p class="why"><em>Why:</em> ${reasons.length ? reasons.join("; ") : "a good fit for your current settings"}.</p>
      <p class="src">${icon("globe")} ${el.region} · ${el.source}</p>
      <div class="sug-actions">
        <button class="btn btn-sm" data-act="info">Details</button>
        ${locked
          ? `<button class="btn btn-sm btn-gold" data-act="info">${icon("book")} Read to unlock</button>`
          : `<button class="btn btn-sm btn-gold" data-act="add">${icon("plus")} Add</button>`}
      </div></div>`;
  }).join("");
  box.querySelectorAll(".sug").forEach((s) => {
    const id = s.dataset.id;
    s.querySelectorAll("button").forEach((b) => {
      b.onclick = () => (b.dataset.act === "add" ? toggleElement(id) : openModal(id));
    });
  });
}

function renderProducer(){

  const box = $("#producerNotes");
  
  if(!box) return;
  
  const els = state.selected.map(byId);
  
  const notes = [];
  
  const rhythms = els.filter(e=>e.type==="Rhythm").length;
  const melody = els.filter(e=>e.type==="Instrument").length;
  const scales = els.filter(e=>e.type==="Scale").length;
  
  if(rhythms && !melody){
  
  notes.push({
  type:"warn",
  title:"Texture",
  body:"Your composition is rhythm-heavy. Adding an instrument could create a stronger melodic focus."
  });
  
  }
  
  if(melody && !scales){
  
  notes.push({
  type:"warn",
  title:"Harmony",
  body:"You have melodic material but no modal framework. Adding a scale will give the melody more context."
  });
  
  }
  
  const traditions = [...new Set(els.map(e=>e.tradition))];
  
  if(traditions.length>=2){
  
  if(state.blend<0.5){
  
  notes.push({
  type:"warn",
  title:"Fusion",
  body:`You're combining ${traditions.join(", ")} while your Blend slider favors a single tradition. Consider increasing Blend or narrowing your palette.`
  });
  
  }else{
  
  notes.push({
  type:"good",
  title:"Fusion",
  body:`Your Blend setting matches your cross-cultural composition. The liner notes will preserve attribution for every tradition used.`
  });
  
  }
  
  }
  
  const unlocked = els.filter(e=>statusOf(e)==="unlocked");
  
  if(unlocked.length){
  
  notes.push({
  type:"good",
  title:"Learning",
  body:`You've unlocked ${unlocked.length} cultural element(s). Their learning context will be included in the exported credits.`
  });
  
  }
  
  if(!notes.length){
  
  notes.push({
  type:"good",
  title:"Ready",
  body:"Your composition is balanced so far. Keep experimenting, and I'll let you know if I notice anything worth improving."
  });
  
  }
  
  box.innerHTML = notes.map(n=>`
  
  <div class="producer-card ${n.type}">
  
  <h4>${n.title}</h4>
  
  <p>${n.body}</p>
  
  </div>
  
  `).join("");
  
  }

/* ---------------- Prompt box ---------------- */
function addMsg(kind, html) {
  const feed = $("#feed");
  const m = document.createElement("div");
  m.className = `msg m-${kind}`;
  m.innerHTML = kind === "ai" ? `<div class="ai-tag">${icon("spark")} Assistant</div>${html}` : html;
  feed.appendChild(m);
  feed.scrollTop = feed.scrollHeight;
}
function handlePrompt(text) {
  addMsg("user", `<p>${text.replace(/</g, "&lt;")}</p>`);
  for (const p of STEREOTYPE_PATTERNS)
    if (p.re.test(text)) { addMsg("ai", `<p>${p.reply}</p>`); return; }
  const tags = [...new Set(KEYWORD_TAGS.filter(([re]) => re.test(text)).map(([, t]) => t))];
  if (!tags.length) {
    addMsg("ai", `<p>Tell us the <strong>feeling</strong> (calm, festive, longing…) or the <strong>occasion</strong> (a celebration, an evening piece, something for studying) and we will suggest specific elements.</p>`);
    return;
  }
  state.promptTags = tags;
  const matches = ELEMENTS.map((e) => scoreElement(e, state.selected.map(byId))).filter(Boolean)
    .sort((a, b) => b.score - a.score).slice(0, 3).filter((r) => r.score > 0);
  if (!matches.length) { addMsg("ai", `<p>Nothing in the current library fits that closely. Please try another feeling, or browse the grid.</p>`); return; }
  const items = matches.map(({ el }) => {
    const locked = statusOf(el) === "learn-first";
    return `<li><strong>${el.name}</strong> (${el.tradition}) — ${el.meaning.split(". ")[0].replace(/\.$/, "")}. <span class="src">Source: ${el.source}.</span>${locked ? ` <span class="locknote">${icon("book")} Learn-first. Please open it to read its context and unlock.</span>` : ""}</li>`;
  }).join("");
  addMsg("ai", `<p>For something <strong>${tags.join(", ")}</strong>, here's what fits and why:</p><ul>${items}</ul><p class="mut">These are also ranked in “Suggested next”.</p>`);
  renderSuggestions(); renderProducer();
  matches.forEach(({ el }) => {
    const card = document.querySelector(`.card[data-id="${el.id}"]`);
    if (card) { card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 2600); }
  });
}

/* ---------------- Liner notes export ---------------- */
function linerNotes() {
  const els = state.selected.map(byId);
  const title = $("#title").value.trim() || "Untitled piece";
  const pct = (v) => Math.round(v * 100);
  const lines = [
    "CULTURAL SOUND STUDIO — LINER NOTES",
    `“${title}” · exported ${new Date().toLocaleDateString()}`,
    "",
    `Approach: ${pct(1 - state.fidelity)}% reproduce / ${pct(state.fidelity)}% reinterpret · ${pct(1 - state.blend)}% single-tradition / ${pct(state.blend)}% blended`,
    "",
    "ELEMENTS & CREDITS",
  ];
  els.forEach((el, i) => {
    lines.push(`${i + 1}. ${el.name} (${el.type}) — ${el.tradition}, ${el.region}`);
    lines.push(`   Meaning: ${el.meaning}`);
    lines.push(`   Source: ${el.source}`);
    if (statusOf(el) === "unlocked") lines.push(`   ✓ Used after reading its cultural context.`);
    lines.push("");
  });
  const flags = computeFlags().filter((f) => f.level === "warn");
  if (flags.length) {
    lines.push("NOTES FROM THE STUDIO");
    flags.forEach((f) => lines.push(`- ${f.text}`));
    lines.push("");
  }
  lines.push("This piece draws on the living traditions credited above. If you share the music, share these notes with it, since credit is part of the composition.",
    "", "Made with Cultural Sound Studio, a prototype for transparent, culturally respectful AI-assisted creation.");
  return { title, text: lines.join("\n") };
}
function exportNotes() {
  if (!state.selected.length) { renderFlagsMsg(); return; }
  const { title, text } = linerNotes();
  const wrap = $("#modal");
  wrap.innerHTML = `<div class="modal-card wide" role="dialog" aria-modal="true">
    <button class="modal-x" id="m-close" aria-label="Close">✕</button>
    <h2>${icon("notes")} Liner notes</h2>
    <p class="mut">Every export credits its sources.</p>
    <pre class="liner">${text.replace(/</g, "&lt;")}</pre>
    <div class="modal-actions"><button class="btn btn-gold" id="m-dl">${icon("download")} Download .txt</button></div>
  </div>`;
  wrap.classList.remove("hidden");
  wrap.onclick = (e) => { if (e.target === wrap) closeModal(); };
  $("#m-close").onclick = closeModal;
  $("#m-dl").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${title.replace(/[^\w\- ]+/g, "").trim().replace(/ +/g, "-") || "liner-notes"}-liner-notes.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  };
}
function renderFlagsMsg() {
  const box = $("#flags");
  box.innerHTML = `<div class="flag f-warn">${icon("warn")}<p>Please add at least one element before exporting.</p></div>`;
}

/* ---------------- Wiring ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderGrid(); renderComp(); renderSuggestions(); renderFlags(); renderProducer();

  document.querySelectorAll(".filters button").forEach((b) => {
    b.onclick = () => {
      state.filter = b.dataset.f;
      document.querySelectorAll(".filters button").forEach((x) => x.classList.toggle("on", x === b));
      renderGrid();
    };
  });

  const bindSlider = (id, key) => {
    const s = $(id);
    s.addEventListener("input", () => { state[key] = +s.value / 100; renderFlags(); renderSuggestions(); renderProducer();});
  };
  bindSlider("#s-fidelity", "fidelity");
  bindSlider("#s-blend", "blend");

  $("#play").onclick = () => {
    if (!state.selected.length) { renderFlagsMsg(); return; }
    const rows = document.querySelectorAll(".track");
    rows.forEach(r=>{animateTrack(r,11000);});
    AE.playComposition(state.selected.map(byId), $("#play"));
  };
  $("#clear").onclick = () => { state.selected = []; AE.stop(); renderGrid(); renderComp(); renderFlags(); renderSuggestions(); };
  $("#export").onclick = exportNotes;
    // Download MP3
  $("#download-mp3").onclick = async function() {
    const els = state.selected.map(byId);
    if (!els.length) {
      renderFlagsMsg(); // reuses the existing warning
      return;
    }
    // Disable button during processing
    this.disabled = true;
    this.textContent = "Rendering…";
    try {
      // Render offline
      const buffer = await AE.renderOffline(els, 4, 0.3);
      // Encode to MP3 using lamejs
      const mp3Data = encodeAudioBufferToMP3(buffer);
      // Create blob and download
      const blob = new Blob([mp3Data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const title = $("#title").value.trim() || "Untitled";
      a.download = `${title.replace(/[^\w\- ]+/g, "").trim().replace(/ +/g, "-") || "composition"}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // Show success flag
      const box = $("#flags");
      box.innerHTML = `<div class="flag f-good">${icon("check")}<p>MP3 downloaded successfully.</p></div>`;
    } catch (err) {
      console.error("Download error:", err);
      alert("Could not render MP3. See console for details.");
    } finally {
      this.disabled = false;
      this.innerHTML = `<svg class="ic"><use href="#i-download"/></svg> Download MP3`;
    }
  };

  // Helper: encode AudioBuffer to MP3 using lamejs
  function encodeAudioBufferToMP3(buffer) {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const samples = buffer.length;
    // Get interleaved PCM data (float32, -1..1)
    const pcm = new Float32Array(samples * channels);
    for (let ch = 0; ch < channels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < samples; i++) {
        pcm[i * channels + ch] = channelData[i];
      }
    }
    // Convert to 16-bit int (lamejs expects Int16Array)
    const pcmInt16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    // Encode with lamejs
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128 kbps
    const mp3Data = [];
    const blockSize = 1152; // samples per channel per frame
    for (let i = 0; i < pcmInt16.length; i += blockSize * channels) {
      const chunk = pcmInt16.subarray(i, i + blockSize * channels);
      let mp3buf;
      if (chunk.length >= blockSize * channels) {
        // Split into left/right if stereo
        if (channels === 2) {
          const left = new Int16Array(blockSize);
          const right = new Int16Array(blockSize);
          for (let j = 0; j < blockSize; j++) {
            left[j] = chunk[j * 2];
            right[j] = chunk[j * 2 + 1];
          }
          mp3buf = mp3encoder.encodeBuffer(left, right);
        } else {
          mp3buf = mp3encoder.encodeBuffer(chunk);
        }
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
    }
    const finalBuf = mp3encoder.flush();
    if (finalBuf.length > 0) mp3Data.push(finalBuf);
    // Combine into one Uint8Array
    const totalLen = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const buf of mp3Data) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  $("#promptForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#prompt");
    const v = input.value.trim();
    if (v) { handlePrompt(v); input.value = ""; }
  });
  document.querySelectorAll(".try button").forEach((b) => (b.onclick = () => handlePrompt(b.textContent.trim())));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  addMsg("ai", `<p>Welcome to the Cultural Sound Studio. Browse the library to hear real rhythms, scales and instruments. Each card shows <strong>where it's from, what it means, and the source</strong>. Describe what you want below, or just start clicking.</p>`);
});
