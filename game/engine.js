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
    if (spd > 40 && Math.random() < dt * 12) fx.push({ x: p.x - Math.cos(p.a) * st.size * 1.1, y: p.y - Math.sin(p.a) * st.size * 1.1 + (Math.random() - 0.5) * st.size * 0.3, vx: -p.vx * 0.1, vy: -15 - Math.random() * 20, life: 1.1, col: "rgba(255,255,255,.7)", r: 1.5 + Math.random() * 2.5, b: 1 });
    p.inv -= dt; p.biteT -= dt; p.shake = Math.max(0, p.shake - dt);
    p.energy = Math.min(100, p.energy - dt * (S.lvl ? 0.8 : 0.3)); if (p.energy <= 0) { p.energy = 0; p.hp -= dt * 2; }

    const mx = p.x + Math.cos(p.a) * st.size * 0.95, my = p.y + Math.sin(p.a) * st.size * 0.95; // hocico visual (el cuerpo mide size*2)
    const biting = input.takeBite() && p.biteT <= 0; if (biting) { p.biteT = 0.3; audio.sfx.bite(); burst(mx, my, "#ffffff", 4); }
    world.creatures.forEach((c) => {
      if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) Object.assign(c, spawn(c.def, ZONES[c.zone], Math.random)); return; }
      if (Math.abs(c.x - p.x) > 1400 || Math.abs(c.y - p.y) > 1000) return;
      const dist = updateCreature(c, dt, p, st.power, Math.random), df = c.def, reach = Math.hypot(mx - c.x, my - c.y);
      const edible = df.r <= st.power, biteR = st.size * 0.7 + 16 + df.s * 0.5;
      if (edible && (reach < st.size * 0.45 + df.s * 0.4 || (biting && reach < biteR))) { // comer al tocar con la boca o al morder cerca
        c.dead = 25; p.energy = Math.min(100, p.energy + 6 + df.s * 0.25); p.hp = Math.min(st.hp, p.hp + df.s * 0.12 + (df.heal || 0));
        audio.sfx.eat(); burst(c.x, c.y, "#ffd27a"); addBp(df.bp, c.x, c.y);
      } else if (biting && reach < biteR) { say(txt().big, "warn"); c.hit = 0.4; hurt(df.dm || 4, c.x);
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

  const mod = (a, n) => ((a % n) + n) % n;
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const motes = Array.from({ length: 70 }, () => ({ x: Math.random() * 1600, y: Math.random() * 1000, z: 0.2 + Math.random() * 0.4, v: 4 + Math.random() * 10, r: 0.8 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.35 }));
  const ridge = (cx, cy, par, lift, col, fq, amp) => {
    const base = WORLD.h - lift - cy; if (base - amp > vh) return;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, vh);
    for (let x = 0; x <= vw + 20; x += 20) { const wx = x + cx * par; ctx.lineTo(x, base + Math.sin(wx * fq) * amp + Math.sin(wx * fq * 2.7 + 1) * amp * 0.4); }
    ctx.lineTo(vw, vh); ctx.closePath(); ctx.fill();
  };

  function egg(s) {
    const g = ctx.createRadialGradient(-s * 0.2, -s * 0.3, s * 0.1, 0, 0, s * 1.1); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#d9c294");
    ctx.shadowColor = "rgba(255,240,200,.9)"; ctx.shadowBlur = 18; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.8, s, 0, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(150,110,60,.35)";
    [[-0.3, -0.4, 0.1], [0.2, 0.3, 0.12], [0.35, -0.25, 0.08], [-0.2, 0.45, 0.09]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 6.3); ctx.fill(); });
    ctx.strokeStyle = "rgba(90,60,30,.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.1); ctx.lineTo(-s * 0.2, s * 0.05); ctx.lineTo(-s * 0.05, -s * 0.15); ctx.lineTo(s * 0.2, s * 0.08); ctx.stroke();
  }

  function shark(L, col, wag, mouth) {
    const g = ctx.createLinearGradient(0, -L * 0.28, 0, L * 0.28);
    g.addColorStop(0, shade(col, -0.45)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, 0.3));
    const body = new Path2D();
    body.moveTo(L / 2, 0); body.quadraticCurveTo(L * 0.1, -L * 0.28, -L * 0.38, -L * 0.04);
    body.lineTo(-L * 0.58, -L * 0.2 + wag); body.lineTo(-L * 0.5, wag * 0.3); body.lineTo(-L * 0.58, L * 0.2 + wag); body.lineTo(-L * 0.38, L * 0.04);
    body.quadraticCurveTo(L * 0.1, L * 0.28, L / 2, 0); body.closePath();
    ctx.shadowColor = "rgba(0,10,30,.45)"; ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fill(body); ctx.shadowBlur = 0;
    ctx.fillStyle = shade(col, -0.35); // aleta dorsal y pectoral
    ctx.beginPath(); ctx.moveTo(-L * 0.02, -L * 0.2); ctx.quadraticCurveTo(-L * 0.08, -L * 0.34, -L * 0.16, -L * 0.42); ctx.lineTo(-L * 0.17, -L * 0.16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L * 0.14, L * 0.1); ctx.quadraticCurveTo(L * 0.02, L * 0.32 + wag * 0.4, -L * 0.12, L * 0.34 + wag * 0.5); ctx.lineTo(-L * 0.08, L * 0.1); ctx.fill();
    const bg = ctx.createLinearGradient(0, 0, 0, L * 0.17); bg.addColorStop(0, "rgba(255,255,255,.55)"); bg.addColorStop(1, "rgba(255,255,255,.95)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(L * 0.05, L * 0.1, L * 0.3, L * 0.07, 0.05, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "rgba(0,15,40,.4)"; ctx.lineWidth = Math.max(1, L * 0.012); ctx.stroke(body);
    ctx.strokeStyle = "rgba(0,15,40,.3)"; for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(L * (0.17 - i * 0.03), -L * 0.07); ctx.quadraticCurveTo(L * (0.15 - i * 0.03), 0, L * (0.17 - i * 0.03), L * 0.06); ctx.stroke(); }
    const ex = L * 0.31, ey = -L * 0.05, er = Math.max(2, L * 0.035); // ojo
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#0b1b33"; ctx.beginPath(); ctx.arc(ex + er * 0.2, ey, er * 0.62, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + er * 0.45, ey - er * 0.3, er * 0.22, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "rgba(0,15,40,.6)"; ctx.lineWidth = Math.max(1, L * 0.014); ctx.beginPath(); ctx.moveTo(L * 0.5, L * 0.01); ctx.quadraticCurveTo(L * 0.38, L * 0.09, L * 0.27, L * 0.07); ctx.stroke();
    if (mouth > 0) { // boca abierta con dientes al morder
      const o = L * 0.12 * mouth; ctx.fillStyle = "#5a0f1a"; ctx.beginPath(); ctx.moveTo(L * 0.49, L * 0.01); ctx.lineTo(L * 0.26, L * 0.07 + o); ctx.lineTo(L * 0.27, L * 0.06); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i += 1) { const x = L * (0.45 - i * 0.04); ctx.beginPath(); ctx.moveTo(x, L * 0.03); ctx.lineTo(x - L * 0.012, L * 0.06 + o * 0.4); ctx.lineTo(x - L * 0.024, L * 0.03); ctx.fill(); }
    }
  }

  function draw() {
    const st = LEVELS[S.lvl], sh = p.shake ? (Math.random() - 0.5) * 10 : 0, H = WORLD.h;
    const cx = Math.min(WORLD.w - vw, Math.max(0, p.x - vw / 2)) + sh, cy = Math.min(H - vh, Math.max(0, p.y - vh / 2));
    ctx.clearRect(0, 0, vw, vh);
    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vw) return;
      const g = ctx.createLinearGradient(0, -cy, 0, H - cy); g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, 0, z.w + 1, vh);
    });
    ridge(cx, cy, 0.25, 260, "rgba(5,30,55,.22)", 0.0043, 55); ridge(cx, cy, 0.5, 140, "rgba(3,20,40,.32)", 0.007, 40); // montañas lejanas (parallax)
    const rayA = 0.16 * (1 - Math.min(1, (cy + vh * 0.5) / 900)); // rayos de luz cerca de la superficie
    if (rayA > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i += 1) {
        const x0 = mod(i * vw / 5 + Math.sin(time * 0.25 + i * 1.7) * 60 - cx * 0.15, vw + 200) - 100, w = 40 + (i % 3) * 30, g = ctx.createLinearGradient(0, -cy, 0, -cy + 800);
        g.addColorStop(0, `rgba(200,245,255,${rayA})`); g.addColorStop(1, "rgba(200,245,255,0)"); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x0, -cy); ctx.lineTo(x0 + w, -cy); ctx.lineTo(x0 + w - 160, -cy + 800); ctx.lineTo(x0 - 160, -cy + 800); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (cy < 60) { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.moveTo(0, -cy); for (let x = 0; x <= vw + 20; x += 20) ctx.lineTo(x, -cy + 10 + Math.sin(x * 0.02 + time * 2) * 4); ctx.lineTo(vw, -cy); ctx.fill(); }
    ctx.save(); ctx.translate(-cx, -cy);
    const sg = ctx.createLinearGradient(0, H - 70, 0, H); sg.addColorStop(0, "rgba(210,190,140,.5)"); sg.addColorStop(1, "rgba(35,28,18,.9)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(cx - 20, H + 10);
    for (let x = cx - 20; x <= cx + vw + 20; x += 24) ctx.lineTo(x, H - 28 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.007) * 12);
    ctx.lineTo(cx + vw + 20, H + 10); ctx.fill();
    world.decor.forEach((d) => {
      if (d.x < cx - 200 || d.x > cx + vw + 200) return; const sw = Math.sin(time * 1.5 + d.x) * 8;
      ctx.lineCap = "round";
      if (d.k === "weed") {
        ctx.strokeStyle = "#237a54"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(d.x, H); ctx.bezierCurveTo(d.x + sw, H - d.s * 0.7, d.x - sw, H - d.s * 1.3, d.x + sw * 0.5, H - d.s * 2); ctx.stroke();
        ctx.strokeStyle = "#5fe0a0"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(d.x - 1, H); ctx.bezierCurveTo(d.x + sw - 1, H - d.s * 0.7, d.x - sw - 1, H - d.s * 1.3, d.x + sw * 0.5 - 1, H - d.s * 2); ctx.stroke();
      } else if (d.k === "coral") {
        for (let i = 0; i < 4; i += 1) {
          const bx = d.x + i * 14 - 20, h = d.s * (0.5 + ((i * 37 + d.h * 10) % 3) * 0.25), tx = bx + Math.sin(i + d.h * 9) * 10;
          ctx.strokeStyle = `hsl(${d.h * 360 + i * 14},65%,48%)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, H - 4); ctx.lineTo(tx, H - h); ctx.moveTo(tx, H - h * 0.6); ctx.lineTo(tx + 9, H - h * 0.9); ctx.stroke();
          ctx.fillStyle = `hsl(${d.h * 360 + i * 14},75%,66%)`; ctx.beginPath(); ctx.arc(tx, H - h, 6, 0, 6.3); ctx.moveTo(tx + 14, H - h * 0.9); ctx.arc(tx + 9, H - h * 0.9, 5, 0, 6.3); ctx.fill();
        }
      } else if (d.k === "hull") {
        ctx.fillStyle = "#4a3326"; ctx.beginPath(); ctx.moveTo(d.x - d.s * 2, H - 20); ctx.lineTo(d.x - d.s * 1.5, H - d.s * 1.6); ctx.lineTo(d.x + d.s * 2, H - d.s * 1.3); ctx.lineTo(d.x + d.s * 2.4, H - 20); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; for (let i = 1; i < 4; i += 1) { const y = H - 20 - i * d.s * 0.35; ctx.beginPath(); ctx.moveTo(d.x - d.s * 1.9, y); ctx.lineTo(d.x + d.s * 2.2, y - d.s * 0.1); ctx.stroke(); }
        ctx.strokeStyle = "#2c1c12"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(d.x + d.s * 0.6, H - d.s * 1.4); ctx.lineTo(d.x + d.s * 0.9, H - d.s * 2.6); ctx.stroke();
        for (let i = 0; i < 3; i += 1) { ctx.fillStyle = "#e8d8a0"; ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x - d.s * 0.2 + i * d.s * 0.7, H - d.s * 0.8, 5, 0, 6.3); ctx.fill(); ctx.stroke(); }
      } else if (d.k === "column") {
        const w = d.s * 0.4, top = H - d.s * 3, cg = ctx.createLinearGradient(d.x, 0, d.x + w, 0);
        cg.addColorStop(0, "#9ab6ba"); cg.addColorStop(0.5, "#6f8f95"); cg.addColorStop(1, "#47646b"); ctx.fillStyle = cg; ctx.fillRect(d.x, top, w, d.s * 3);
        ctx.fillStyle = "#89a5a9"; ctx.fillRect(d.x - 8, top, w + 16, 12); ctx.fillRect(d.x - 10, H - 14, w + 20, 14);
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i += 1) { ctx.beginPath(); ctx.moveTo(d.x + w * i / 4, top + 12); ctx.lineTo(d.x + w * i / 4, H - 14); ctx.stroke(); }
      } else if (d.k === "glow") {
        ctx.fillStyle = "rgba(150,245,255,.9)"; ctx.shadowColor = "#5ae6ff"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(d.x, d.y, d.s * 0.09 * (1 + 0.15 * Math.sin(time * 2 + d.x)), 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
      }
    });
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ALL_GATES.forEach((g) => {
      if (g.x > cx + vw || g.x + g.w < cx) return; const locked = S.lvl < g.min;
      if (!locked) { ctx.globalAlpha = 0.08; ctx.fillStyle = "#9fd8ff"; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.globalAlpha = 1; return; }
      const gg = ctx.createLinearGradient(g.x, 0, g.x + g.w, 0); gg.addColorStop(0, "rgba(130,210,255,.75)"); gg.addColorStop(0.5, "rgba(50,80,140,.85)"); gg.addColorStop(1, "rgba(130,210,255,.75)");
      ctx.shadowColor = "rgba(120,200,255,.9)"; ctx.shadowBlur = 20; ctx.fillStyle = gg; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.shadowBlur = 0;
      const y0 = Math.max(g.y, Math.floor(cy / 40) * 40), y1 = Math.min(g.y + g.h, cy + vh); ctx.fillStyle = "rgba(220,245,255,.35)";
      for (let y = y0 + ((time * 30) % 40); y < y1; y += 40) ctx.fillRect(g.x, y, g.w, 2);
      ctx.font = "22px serif"; for (let y = g.y + 120; y < g.y + g.h; y += 300) if (y > cy - 30 && y < cy + vh + 30) ctx.fillText("🔒", g.x + g.w / 2, y);
    });
    world.treasures.forEach((t) => {
      if (S.found[t.id] || t.x < cx - 50 || t.x > cx + vw + 50) return; const ty = t.y + Math.sin(time * 2 + t.x) * 4;
      ctx.font = "26px serif"; ctx.shadowColor = "#ffe27a"; ctx.shadowBlur = 14 + Math.sin(time * 4) * 6; ctx.fillText(TREASURE_ICON[t.k], t.x, ty); ctx.shadowBlur = 0;
      ctx.font = "12px serif"; ctx.fillStyle = `rgba(255,250,200,${0.5 + 0.5 * Math.sin(time * 5 + t.x)})`; ctx.fillText("✦", t.x + 14, ty - 14);
    });
    const glow = [];
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vw + 300 || c.y < cy - 300 || c.y > cy + vh + 300) return;
      const df = c.def, edible = df.r <= st.power;
      ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + c.t * 3) * 2);
      if (df.id === "plankton") { // orbes luminosos
        const pr = 3.2 + Math.sin(time * 4 + c.x) * 0.8, g = ctx.createRadialGradient(0, 0, 0, 0, 0, pr * 3);
        g.addColorStop(0, "rgba(200,255,255,.95)"); g.addColorStop(1, "rgba(80,220,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, pr * 3, 0, 6.3); ctx.fill(); ctx.restore(); return;
      }
      const flip = Math.cos(c.a) > 0 ? -1 : 1;
      ctx.rotate(Math.sin(c.a) * 0.4 * -flip); ctx.scale(flip * (1 + Math.sin(time * 7 + c.x) * 0.03), 1); ctx.globalAlpha = c.hit > 0 ? 0.5 : 1;
      ctx.shadowColor = edible ? "rgba(110,255,170,.85)" : df.dm ? "rgba(255,90,90,.75)" : "rgba(0,0,0,.35)"; ctx.shadowBlur = edible || df.dm ? 12 : 6; // verde = comestible, rojo = peligroso
      ctx.font = `${df.s}px serif`; ctx.fillText(df.e, 0, 0); ctx.restore();
      if (df.glow) glow.push(c);
    });
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    if (S.lvl === 0) egg(st.size); else shark(st.size * 2, SHARK_COLORS[S.lvl], Math.sin(time * 9) * st.size * 0.12, Math.max(0, p.biteT / 0.3));
    if (p.biteT > 0) { ctx.strokeStyle = `rgba(255,255,255,${p.biteT / 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st.size * 0.95, 0, st.size * (0.9 - p.biteT), -1, 1); ctx.stroke(); }
    ctx.restore();
    fx.forEach((f) => {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      if (f.b) { ctx.strokeStyle = "rgba(220,245,255,.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(f.x - f.r * 0.4, f.y - f.r * 0.5, 1.5, 1.5); }
      else { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill(); }
    });
    ctx.globalAlpha = 1; ctx.restore();
    motes.forEach((m) => { ctx.globalAlpha = m.a; ctx.fillStyle = "#e6f7ff"; ctx.beginPath(); ctx.arc(mod(m.x - cx * m.z + Math.sin(time * 0.5 + m.y) * 10, vw), mod(m.y + time * m.v - cy * m.z, vh), m.r, 0, 6.3); ctx.fill(); }); ctx.globalAlpha = 1;
    const dep = Math.min(1, (cy + vh / 2) / H); ctx.fillStyle = `rgba(0,10,30,${dep * 0.3})`; ctx.fillRect(0, 0, vw, vh); // más oscuro con la profundidad
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75); vg.addColorStop(0, "rgba(0,10,25,0)"); vg.addColorStop(1, "rgba(0,10,25,.4)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
    if (darkV > 0.02) { const px = p.x - cx, py = p.y - cy, g = ctx.createRadialGradient(px, py, 90, px, py, 560); g.addColorStop(0, "rgba(0,0,10,0)"); g.addColorStop(1, `rgba(0,0,10,${darkV})`); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); }
    ctx.globalCompositeOperation = "lighter";
    glow.concat(world.decor.filter((d) => d.k === "glow" && d.x > cx - 100 && d.x < cx + vw + 100)).forEach((c) => {
      const x = c.x - cx, y = c.y - cy, R = c.def ? c.def.s * 1.1 : c.s * 0.5, g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, "rgba(90,230,255,.45)"); g.addColorStop(1, "rgba(90,230,255,0)"); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = "source-over"; ctx.textAlign = "center"; ctx.font = "800 18px system-ui";
    ft.forEach((f) => { ctx.globalAlpha = Math.min(1, f.life); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,20,40,.7)"; ctx.strokeText(f.s, f.x - cx, f.y - cy); ctx.fillStyle = f.col; ctx.fillText(f.s, f.x - cx, f.y - cy); }); ctx.globalAlpha = 1;
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
}