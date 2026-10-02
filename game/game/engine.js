/* Motor del minijuego submarino: mundo, bucle, render, HUD y guardado. Independiente de la lógica de evolución. */
import { BP, WORLD, LEVELS, SHARK_COLORS, ZONES, GATES, POIS, TREASURES, TREASURE_PER_ZONE, CREATURES, TEXT, SAVE_VERSION } from "./data.js";
import { createInput, createAudio, spawn, updateCreature } from "./systems.js";

const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TREASURE_ICON = { coin: "🪙", gem: "💎", chest: "🧰", relic: "🏺" };
const BORDERS = ZONES.map((z, i) => (i && z.min > ZONES[i - 1].min ? { x: z.x - 15, y: 0, w: 30, h: WORLD.h, min: z.min, t: z.gate || "cur" } : null)).filter(Boolean);
const ALL_GATES = [...GATES, ...BORDERS];

function buildWorld() {
  const r = rng(7), decor = [], treasures = [...TREASURES], creatures = [];
  ZONES.forEach((z, zi) => {
    for (let i = 0; i < (z.w / 1000) * 9; i += 1) decor.push({ x: z.x + r() * z.w, s: 30 + r() * 70, k: z.d, h: r(), zi, y: z.d === "glow" ? 200 + r() * 1100 : WORLD.h });
    for (let i = 0; i < TREASURE_PER_ZONE[zi]; i += 1) {
      const k = ["coin", "coin", "gem", "chest"][Math.floor(r() * 4)];
      treasures.push({ id: `t${zi}_${i}`, k, x: z.x + 80 + r() * (z.w - 160), y: WORLD.h * (0.6 + r() * 0.38) });
    }
    CREATURES.filter((c) => c.z.includes(zi)).forEach((def) => {
      for (let i = 0; i < Math.round((z.w / 1000) * def.n); i += 1) creatures.push(spawn(def, z, r));
    });
  });
  return { decor, treasures, creatures };
}

export function createGame(o) {
  const { view, canvas, hud, banner, back, joy, biteBtn } = o.el;
  const ctx = canvas.getContext("2d"), world = buildWorld();
  let S, p, input, audio, raf = 0, last = 0, running = false, vw = 0, vh = 0, time = 0, saveT = 0, darkV = 0, bannerT = 0, lastBanner = "", gateCd = 0;
  const fx = [], ft = [], txt = () => TEXT[o.lang()] || TEXT.en, fmt = (n) => Math.round(n).toLocaleString(o.lang() === "es" ? "es-BO" : "en-US");

  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones }), 1200); };
  function say(msg, cls = "") {
    if (msg === lastBanner && performance.now() - bannerT < 900) return;
    lastBanner = msg; bannerT = performance.now(); banner.textContent = msg; banner.className = `game-banner show ${cls}`;
    clearTimeout(say.t); say.t = setTimeout(() => { banner.className = "game-banner"; }, 1900);
  }
  const floatText = (s, x, y, col = "#ffe27a") => ft.push({ s, x, y, life: 1.3, col });
  const burst = (x, y, col, n = 8) => { for (let i = 0; i < n; i += 1) fx.push({ x, y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.7, col, r: 2 + Math.random() * 3 }); };
  function addBp(n, x, y) { S.bp += n; floatText(`+${fmt(n)} Break Points`, x, y - 30); save(); }
  function setLevel(lv, evolved) {
    S.lvl = lv; p.hp = LEVELS[lv].hp; p.energy = Math.max(p.energy, 70);
    if (S.bpLevel !== lv) { S.bpLevel = lv; S.bp = 0; if (evolved) say(`${txt().lvl} ${lv + 1} — ${o.name(lv)}`, "good"); save(); } // los Break Points pertenecen a la etapa actual
  }
  const zoneAt = (x) => Math.max(0, ZONES.findIndex((z) => x >= z.x && x < z.x + z.w));
  const hurt = (dm, fromX) => {
    if (p.inv > 0) return; p.inv = 1; p.hp -= dm; p.shake = 0.3; audio.sfx.hurt(); floatText(`-${dm}`, p.x, p.y - 20, "#ff6b6b");
    p.vx += Math.sign(p.x - fromX || 1) * 260; burst(p.x, p.y, "#ff6b6b", 6);
  };
  const blocking = (x, y, r) => ALL_GATES.find((g) => S.lvl < g.min && x + r > g.x && x - r < g.x + g.w && y + r > g.y && y - r < g.y + g.h);

  function step(dt) {
    time += dt;
    const lv = o.getLevel(); if (lv !== S.lvl) setLevel(lv, true);
    const st = LEVELS[S.lvl], r = st.size * 0.5, d = input.dir(), a = Math.min(1, dt * 4);
    p.vx += (d.x * st.speed - p.vx) * a; p.vy += (d.y * st.speed - p.vy) * a;
    for (const ax of ["x", "y"]) {
      const nx = ax === "x" ? p.x + p.vx * dt : p.x, ny = ax === "y" ? p.y + p.vy * dt : p.y, g = blocking(nx, ny, r);
      if (g) { if (gateCd <= 0) { say(g.t === "egg" ? txt().egg : txt()[g.t], "warn"); gateCd = 1.6; } p[ax === "x" ? "vx" : "vy"] *= -0.3; } else { p.x = nx; p.y = ny; }
    }
    gateCd -= dt; p.x = Math.min(WORLD.w - r, Math.max(r, p.x)); p.y = Math.min(WORLD.h - r, Math.max(r, p.y));
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 8) { let da = Math.atan2(p.vy, p.vx) - p.a; da = Math.atan2(Math.sin(da), Math.cos(da)); p.a += da * Math.min(1, dt * 6); if (Math.random() < dt * 4) { audio.sfx.swim(); } }
    p.inv -= dt; p.biteT -= dt; p.shake = Math.max(0, p.shake - dt);
    p.energy = Math.min(100, p.energy - dt * (S.lvl ? 0.8 : 0.3)); if (p.energy <= 0) { p.energy = 0; p.hp -= dt * 2; }

    const mx = p.x + Math.cos(p.a) * r, my = p.y + Math.sin(p.a) * r;
    const biting = input.takeBite() && p.biteT <= 0; if (biting) { p.biteT = 0.3; audio.sfx.bite(); burst(mx, my, "#ffffff", 4); }
    world.creatures.forEach((c) => {
      if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) Object.assign(c, spawn(c.def, ZONES[c.zone], Math.random)); return; }
      if (Math.abs(c.x - p.x) > 1400 || Math.abs(c.y - p.y) > 1000) return;
      const dist = updateCreature(c, dt, p, st.power, Math.random), df = c.def, reach = Math.hypot(mx - c.x, my - c.y);
      if (biting && reach < r * 0.9 + df.s * 0.5) {
        if (df.r <= st.power) {
          c.dead = 25; p.energy = Math.min(100, p.energy + 6 + df.s * 0.25); p.hp = Math.min(st.hp, p.hp + df.s * 0.12);
          audio.sfx.eat(); burst(c.x, c.y, "#ffd27a"); addBp(df.bp, c.x, c.y);
        } else { say(txt().big, "warn"); c.hit = 0.4; hurt(df.dm || 4, c.x); }
      } else if (df.dm && dist < (df.s + st.size) * 0.4 && (df.r > st.power || df.b === "ignore")) hurt(df.dm, c.x);
    });
    world.treasures.forEach((t) => {
      if (S.found[t.id] || Math.hypot(t.x - p.x, t.y - p.y) > r + 24) return;
      S.found[t.id] = 1; audio.sfx.treasure(); burst(t.x, t.y, "#fff3a0", 14); addBp(BP[t.k], t.x, t.y); say(`${txt().treasure} ${TREASURE_ICON[t.k]}`, "good");
    });
    POIS.forEach((q) => {
      if (S.found[q.id] || Math.hypot(q.x - p.x, q.y - p.y) > q.r) return;
      S.found[q.id] = 1; audio.sfx.zone(); addBp(BP.poi, p.x, p.y); say(`${txt().disc} · ${q.n[o.lang() === "es" ? 1 : 0]}`, "good");
    });
    const zi = zoneAt(p.x);
    if (zi !== p.zone) {
      p.zone = zi; audio.ambience(zi);
      if (zi && !S.zones[zi]) { S.zones[zi] = 1; audio.sfx.zone(); addBp(BP.zone, p.x, p.y); say(`${txt().disc} · ${ZONES[zi].n[o.lang() === "es" ? 1 : 0]}`, "good"); }
    }
    if (p.hp <= 0) { say(txt().died, "warn"); Object.assign(p, { x: 220, y: 500, vx: 0, vy: 0, hp: st.hp, energy: 60, inv: 2 }); }
    darkV += ((ZONES[zi].dark || 0) - darkV) * Math.min(1, dt);
    if (Math.random() < dt * 5) fx.push({ x: p.x + (Math.random() - 0.5) * vw, y: p.y + vh / 2, vx: 0, vy: -40 - Math.random() * 40, life: 6, col: "rgba(255,255,255,.35)", r: 1 + Math.random() * 3 });
    for (let i = fx.length - 1; i >= 0; i -= 1) { const f = fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; if (f.life <= 0) fx.splice(i, 1); }
    for (let i = ft.length - 1; i >= 0; i -= 1) { ft[i].y -= 30 * dt; ft[i].life -= dt; if (ft[i].life <= 0) ft.splice(i, 1); }
    renderHud(st);
  }

  const hudCache = {};
  function renderHud(st) {
    const set = (k, v) => { if (hudCache[k] !== v) { hudCache[k] = v; hud[k].textContent = v; } };
    set("lvl", `🦈 ${txt().lvl} ${S.lvl + 1} — ${o.name(S.lvl)}`); set("bp", `🟡 ${txt().bp}: ${fmt(S.bp)}`);
    set("zone", `📍 ${ZONES[p.zone].n[o.lang() === "es" ? 1 : 0]}`);
    hud.hp.style.width = `${Math.max(0, (p.hp / st.hp) * 100)}%`; hud.en.style.width = `${p.energy}%`; back.textContent = txt().back;
  }

  function shark(L, col, wag) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(L / 2, 0); ctx.quadraticCurveTo(L * 0.1, -L * 0.28, -L * 0.38, -L * 0.04);
    ctx.lineTo(-L * 0.58, -L * 0.2 + wag); ctx.lineTo(-L * 0.5, wag * 0.3); ctx.lineTo(-L * 0.58, L * 0.2 + wag); ctx.lineTo(-L * 0.38, L * 0.04);
    ctx.quadraticCurveTo(L * 0.1, L * 0.28, L / 2, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.02, -L * 0.2); ctx.lineTo(-L * 0.14, -L * 0.4); ctx.lineTo(-L * 0.16, -L * 0.17); ctx.fill();
    ctx.fillStyle = "#eaf6ff"; ctx.beginPath(); ctx.ellipse(L * 0.05, L * 0.1, L * 0.3, L * 0.07, 0.05, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#0b1b33"; ctx.beginPath(); ctx.arc(L * 0.3, -L * 0.05, Math.max(1.5, L * 0.025), 0, 6.3); ctx.fill();
  }

  function draw() {
    const st = LEVELS[S.lvl], sh = p.shake ? (Math.random() - 0.5) * 10 : 0;
    const cx = Math.min(WORLD.w - vw, Math.max(0, p.x - vw / 2)) + sh, cy = Math.min(WORLD.h - vh, Math.max(0, p.y - vh / 2));
    ctx.clearRect(0, 0, vw, vh);
    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vw) return;
      const g = ctx.createLinearGradient(0, -cy, 0, WORLD.h - cy); g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, 0, z.w + 1, vh);
    });
    ctx.save(); ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(cx, WORLD.h - 30, vw, 60);
    world.decor.forEach((d) => {
      if (d.x < cx - 200 || d.x > cx + vw + 200) return; const sw = Math.sin(time * 1.5 + d.x) * 8;
      if (d.k === "weed") { ctx.strokeStyle = "#2f9e6a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(d.x, WORLD.h); ctx.quadraticCurveTo(d.x + sw, WORLD.h - d.s, d.x - sw, WORLD.h - d.s * 2); ctx.stroke(); }
      else if (d.k === "coral") { ctx.fillStyle = `hsl(${d.h * 360},70%,60%)`; for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.arc(d.x + i * 14 - 20, WORLD.h - 10 - (i % 2) * 14, d.s * 0.3, 0, 6.3); ctx.fill(); } }
      else if (d.k === "hull") { ctx.fillStyle = "#4a3326"; ctx.beginPath(); ctx.moveTo(d.x - d.s * 2, WORLD.h - 20); ctx.lineTo(d.x - d.s * 1.5, WORLD.h - d.s * 1.6); ctx.lineTo(d.x + d.s * 2, WORLD.h - d.s * 1.3); ctx.lineTo(d.x + d.s * 2.4, WORLD.h - 20); ctx.fill(); ctx.fillStyle = "#e8d8a0"; ctx.fillRect(d.x - d.s * 0.4, WORLD.h - d.s * 1.1, 10, 10); }
      else if (d.k === "column") { ctx.fillStyle = "#6f8f95"; ctx.fillRect(d.x, WORLD.h - d.s * 3, d.s * 0.4, d.s * 3); ctx.fillRect(d.x - 8, WORLD.h - d.s * 3, d.s * 0.4 + 16, 12); }
    });
    ALL_GATES.forEach((g) => {
      if (g.x > cx + vw || g.x + g.w < cx) return; const locked = S.lvl < g.min;
      ctx.globalAlpha = locked ? 0.9 : 0.12; ctx.fillStyle = "#3b4756"; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.globalAlpha = 1;
      if (locked) for (let y = g.y + 120; y < g.y + g.h; y += 300) { ctx.font = "22px serif"; ctx.fillText("🔒", g.x + 4, y); }
    });
    world.treasures.forEach((t) => {
      if (S.found[t.id] || t.x < cx - 50 || t.x > cx + vw + 50) return;
      ctx.font = "26px serif"; ctx.shadowColor = "#ffe27a"; ctx.shadowBlur = 14 + Math.sin(time * 4) * 6; ctx.fillText(TREASURE_ICON[t.k], t.x - 13, t.y + Math.sin(time * 2 + t.x) * 4); ctx.shadowBlur = 0;
    });
    const glow = [];
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vw + 300 || c.y < cy - 300 || c.y > cy + vh + 300) return;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(Math.cos(c.a) > 0 ? -1 : 1, 1); ctx.globalAlpha = c.hit > 0 ? 0.5 : 1;
      ctx.font = `${c.def.s}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.def.e, 0, 0); ctx.restore();
      if (c.def.glow) glow.push(c);
    });
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    if (S.lvl === 0) { ctx.fillStyle = SHARK_COLORS[0]; ctx.beginPath(); ctx.ellipse(0, 0, st.size * 0.8, st.size, 0, 0, 6.3); ctx.fill(); }
    else shark(st.size * 2, SHARK_COLORS[S.lvl], Math.sin(time * 9) * st.size * 0.12);
    if (p.biteT > 0) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st.size, 0, st.size * 0.6, -1, 1); ctx.stroke(); }
    ctx.restore();
    fx.forEach((f) => { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill(); });
    ctx.restore();
    if (darkV > 0.02) { const px = p.x - cx, py = p.y - cy, g = ctx.createRadialGradient(px, py, 90, px, py, 560); g.addColorStop(0, "rgba(0,0,10,0)"); g.addColorStop(1, `rgba(0,0,10,${darkV})`); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); }
    ctx.globalCompositeOperation = "lighter";
    glow.concat(world.decor.filter((d) => d.k === "glow" && d.x > cx - 100 && d.x < cx + vw + 100)).forEach((c) => {
      const x = (c.def ? c.x : c.x) - cx, y = (c.def ? c.y : c.y) - cy, R = c.def ? c.def.s * 1.1 : c.s * 0.5, g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, "rgba(90,230,255,.45)"); g.addColorStop(1, "rgba(90,230,255,0)"); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = "source-over"; ctx.textAlign = "center"; ctx.font = "800 18px system-ui";
    ft.forEach((f) => { ctx.globalAlpha = Math.min(1, f.life); ctx.fillStyle = f.col; ctx.fillText(f.s, f.x - cx, f.y - cy); }); ctx.globalAlpha = 1;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1; vw = canvas.clientWidth; vh = canvas.clientHeight;
    canvas.width = vw * dpr; canvas.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loop(ts) { if (!running) return; const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; step(dt); draw(); raf = requestAnimationFrame(loop); }

  function open() {
    const s = o.load() || {}, lv = o.getLevel();
    S = { lvl: lv, bpLevel: s.bpLevel ?? lv, bp: s.bp || 0, found: s.found || {}, zones: s.zones || {} };
    if (S.bpLevel !== lv) { S.bpLevel = lv; S.bp = 0; }
    p = { x: 240, y: 520, vx: 0, vy: 0, a: 0, hp: LEVELS[lv].hp, energy: 80, inv: 0, biteT: 0, shake: 0, zone: -1 };
    input = createInput(canvas, joy, biteBtn); audio = createAudio(o.volume);
    view.hidden = false; resize(); window.addEventListener("resize", resize);
    requestAnimationFrame(() => view.classList.add("is-open")); running = true; last = performance.now(); raf = requestAnimationFrame(loop); say(txt().hint);
  }
  function close() {
    if (!running) return; running = false; cancelAnimationFrame(raf); clearTimeout(saveT);
    o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones });
    input.destroy(); audio.stop(); window.removeEventListener("resize", resize); view.classList.remove("is-open");
    setTimeout(() => { if (!running) view.hidden = true; }, 500);
  }
  back.addEventListener("click", close);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return { open, close };
}s