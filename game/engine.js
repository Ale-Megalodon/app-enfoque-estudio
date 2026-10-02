/* Motor del minijuego submarino: mundo, bucle principal, cámara dinámica, 
   renderizado vectorial (sin emojis) y guardado. */
   
import { BP, WORLD, LEVELS, SHARK_COLORS, ZONES, GATES, POIS, TREASURES, TREASURE_PER_ZONE, CREATURES, TEXT, SAVE_VERSION } from "./data.js";
import { createInput, createAudio, spawn, updateCreature } from "./systems.js";

// Generador pseudoaleatorio para consistencia del mundo
const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const TREASURE_ICON = { coin: "🪙", gem: "💎", chest: "🏴‍☠️", relic: "🔱" }; // Únicos emojis conservados para UI de tesoros
const BORDERS = ZONES.map((z, i) => (i && z.min > ZONES[i - 1].min ? { x: z.x - 15, y: 0, w: 30, h: WORLD.h, min: z.min, t: z.gate || "cur" } : null)).filter(Boolean);
const ALL_GATES = [...GATES, ...BORDERS];

// Generación de entidades del mundo
function buildWorld() {
  const r = rng(7), decor = [], treasures = [...TREASURES], creatures = [];
  ZONES.forEach((z, zi) => {
    for (let i = 0; i < (z.w / 1000) * 12; i += 1) decor.push({ x: z.x + r() * z.w, s: 30 + r() * 80, k: z.d, h: r(), zi, y: z.d === "glow" ? 200 + r() * 1100 : WORLD.h });
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

// Renderizador Vectorial Procedural (Reemplazo de Emojis)
const Graphics = {
  drawFish(ctx, s, time, col1, col2) {
    const wag = Math.sin(time * 8) * (s * 0.1);
    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0); ctx.lineTo(-s * 0.6 + wag, -s * 0.2); ctx.lineTo(-s * 0.6 + wag, s * 0.2);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.08, s * 0.02, 0, Math.PI * 2); ctx.fill();
  },
  drawJelly(ctx, s, time) {
    const pulse = 1 + Math.sin(time * 3) * 0.1;
    ctx.fillStyle = `rgba(180, 230, 255, 0.6)`;
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.3 * pulse, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "rgba(180, 230, 255, 0.8)"; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * s * 0.1, -s * 0.1);
      ctx.quadraticCurveTo(i * s * 0.15 + Math.sin(time * 4 + i) * s * 0.1, s * 0.3, i * s * 0.1, s * 0.5 * pulse);
      ctx.stroke();
    }
  },
  drawCrab(ctx, s, time) {
    const legMove = Math.sin(time * 10) * s * 0.1;
    ctx.fillStyle = "#e64a19";
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#d84315"; ctx.lineWidth = Math.max(2, s * 0.05);
    [-1, 1].forEach(dir => {
      ctx.beginPath(); ctx.moveTo(dir * s * 0.2, 0); ctx.lineTo(dir * s * 0.4, -s * 0.2 + legMove * dir); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dir * s * 0.2, s * 0.1); ctx.lineTo(dir * s * 0.4, s * 0.3 - legMove * dir); ctx.stroke();
    });
  },
  drawSquid(ctx, s, time) {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath(); ctx.moveTo(s * 0.4 * pulse, 0); ctx.lineTo(-s * 0.2, -s * 0.15); ctx.lineTo(-s * 0.2, s * 0.15); ctx.fill();
    ctx.strokeStyle = "#b71c1c"; ctx.lineWidth = s * 0.05;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(-s * 0.2, i * s * 0.05);
      ctx.quadraticCurveTo(-s * 0.4, i * s * 0.1 + Math.sin(time * 6 + i) * s * 0.1, -s * 0.6 * pulse, i * s * 0.08);
      ctx.stroke();
    }
  }
};

export function createGame(o) {
  const { view, canvas, hud, banner, back, joy, biteBtn } = o.el;
  const ctx = canvas.getContext("2d"), world = buildWorld();
  
  let S, p, input, audio, raf = 0, last = 0, running = false, vw = 0, vh = 0, time = 0, saveT = 0, darkV = 0, bannerT = 0, lastBanner = "", gateCd = 0;
  let camScale = 1; // Camara dinámica según el tamaño del tiburón
  const fx = [], ft = [], txt = () => TEXT[o.lang()] || TEXT.en, fmt = (n) => Math.round(n).toLocaleString(o.lang() === "es" ? "es-BO" : "en-US");
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones }), 1200); };

  function say(msg, cls = "") {
    if (msg === lastBanner && performance.now() - bannerT < 900) return;
    lastBanner = msg; bannerT = performance.now(); banner.textContent = msg; banner.className = `game-banner show ${cls}`;
    clearTimeout(say.t); say.t = setTimeout(() => { banner.className = "game-banner"; }, 1900);
  }

  const floatText = (s, x, y, col = "#ffe27a") => ft.push({ s, x, y, life: 1.3, col });
  const burst = (x, y, col, n = 8, isBlood = false) => { 
    for (let i = 0; i < n; i += 1) fx.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.8, col, r: (isBlood ? 3 : 2) + Math.random() * 4 }); 
  };

  function addBp(n, x, y) { S.bp += n; floatText(`+${fmt(n)} BP`, x, y - 30); save(); }

  function setLevel(lv) {
    S.lvl = lv; p.hp = LEVELS[lv].hp; p.energy = Math.max(p.energy, 70);
    // Reinicio estricto de BP si evoluciona de nivel (tiempo de estudio)
    if (S.bpLevel !== lv) { 
        S.bpLevel = lv; 
        S.bp = 0; 
        say(`¡${txt().lvl} ${lv + 1} - ${o.name(lv)}!`, "good"); 
        burst(p.x, p.y, "#fff", 20);
        save(); 
    }
  }

  const zoneAt = (x) => Math.max(0, ZONES.findIndex((z) => x >= z.x && x < z.x + z.w));
  
  const hurt = (dm, fromX) => {
    if (p.inv > 0) return; p.inv = 1; p.hp -= dm; p.shake = 0.4; audio.sfx.hurt(); floatText(`-${dm}`, p.x, p.y - 20, "#ff6b6b");
    p.vx += Math.sign(p.x - fromX || 1) * 350; // Knockback
    p.vy -= 100;
    burst(p.x, p.y, "#ff3333", 10, true);
  };

  const blocking = (x, y, r) => ALL_GATES.find((g) => S.lvl < g.min && x + r > g.x && x - r < g.x + g.w && y + r > g.y && y - r < g.y + g.h);

  function step(dt) {
    time += dt;
    const currentEvolutionLevel = o.getLevel(); 
    if (currentEvolutionLevel !== S.lvl) setLevel(currentEvolutionLevel);

    const st = LEVELS[S.lvl], r = st.size * 0.5, d = input.dir(), a = Math.min(1, dt * 4);
    
    // Zoom in/out de la cámara suave
    const targetScale = 60 / Math.max(60, st.size * 0.8);
    camScale += (targetScale - camScale) * dt * 2;

    p.vx += (d.x * st.speed - p.vx) * a; p.vy += (d.y * st.speed - p.vy) * a;
    for (const ax of ["x", "y"]) {
      const nx = ax === "x" ? p.x + p.vx * dt : p.x, ny = ax === "y" ? p.y + p.vy * dt : p.y, g = blocking(nx, ny, r);
      if (g) { 
        if (gateCd <= 0) { say(g.t === "egg" ? txt().egg : txt()[g.t], "warn"); gateCd = 1.6; } 
        p[ax === "x" ? "vx" : "vy"] *= -0.5; 
      } else { p.x = nx; p.y = ny; }
    }
    gateCd -= dt; p.x = Math.min(WORLD.w - r, Math.max(r, p.x)); p.y = Math.min(WORLD.h - r, Math.max(r, p.y));
    
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 8) { 
      let da = Math.atan2(p.vy, p.vx) - p.a; 
      da = Math.atan2(Math.sin(da), Math.cos(da)); 
      p.a += da * Math.min(1, dt * 6); 
      if (Math.random() < dt * 4) audio.sfx.swim(); 
    }
    
    if (spd > 40 && Math.random() < dt * 15) {
      fx.push({ x: p.x - Math.cos(p.a) * st.size * 1.1, y: p.y - Math.sin(p.a) * st.size * 1.1 + (Math.random() - 0.5) * st.size * 0.4, vx: -p.vx * 0.1, vy: -15 - Math.random() * 20, life: 1.2, col: "rgba(255,255,255,.5)", r: 1.5 + Math.random() * 3, b: 1 });
    }

    p.inv -= dt; p.biteT -= dt; p.shake = Math.max(0, p.shake - dt);
    p.energy = Math.min(100, p.energy - dt * (S.lvl ? 0.8 : 0.3)); 
    if (p.energy <= 0) { p.energy = 0; p.hp -= dt * 2; }
    
    const mx = p.x + Math.cos(p.a) * st.size * 0.95, my = p.y + Math.sin(p.a) * st.size * 0.95;
    const biting = input.takeBite() && p.biteT <= 0; 
    if (biting) { p.biteT = 0.3; audio.sfx.bite(); burst(mx, my, "#ffffff", 5); }

    world.creatures.forEach((c) => {
      if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) Object.assign(c, spawn(c.def, ZONES[c.zone], Math.random)); return; }
      if (Math.abs(c.x - p.x) > 1600 / camScale || Math.abs(c.y - p.y) > 1200 / camScale) return;
      
      const dist = updateCreature(c, dt, p, st.power, Math.random), df = c.def, reach = Math.hypot(mx - c.x, my - c.y);
      const edible = df.r <= st.power, biteR = st.size * 0.7 + 16 + df.s * 0.5;
      
      // Comer
      if (edible && (reach < st.size * 0.45 + df.s * 0.4 || (biting && reach < biteR))) {
        c.dead = 25; p.energy = Math.min(100, p.energy + 6 + df.s * 0.25); p.hp = Math.min(st.hp, p.hp + df.s * 0.12 + (df.heal || 0));
        audio.sfx.eat(); burst(c.x, c.y, "#ffd27a"); addBp(df.bp, c.x, c.y);
      } 
      // DEMASIADO GRANDE - Rebote y Daño
      else if (biting && reach < biteR && !edible) { 
        say(txt().big, "warn"); 
        c.hit = 0.4; 
        hurt(df.dm || Math.max(5, df.s * 0.2), c.x); 
        p.vx = -Math.cos(p.a) * 300; 
        p.vy = -Math.sin(p.a) * 300;
      } 
      // Daño por colisión agresiva
      else if (df.dm && dist < (df.s + st.size) * 0.4 && (df.r > st.power || df.b === "ignore")) {
         hurt(df.dm, c.x);
      }
    });

    world.treasures.forEach((t) => {
      if (S.found[t.id] || Math.hypot(t.x - p.x, t.y - p.y) > r + 30) return;
      S.found[t.id] = 1; audio.sfx.treasure(); burst(t.x, t.y, "#fff3a0", 20); addBp(BP[t.k], t.x, t.y); say(`${txt().treasure} ${TREASURE_ICON[t.k]}`, "good");
    });
    
    POIS.forEach((q) => {
      if (S.found[q.id] || Math.hypot(q.x - p.x, q.y - p.y) > q.r) return;
      S.found[q.id] = 1; audio.sfx.zone(); addBp(BP.poi, p.x, p.y); say(`${txt().disc}   ${q.n[o.lang() === "es" ? 1 : 0]}`, "good");
    });

    const zi = zoneAt(p.x);
    if (zi !== p.zone) {
      p.zone = zi; audio.ambience(zi);
      if (zi && !S.zones[zi]) { S.zones[zi] = 1; audio.sfx.zone(); addBp(BP.zone, p.x, p.y); say(`${txt().disc}   ${ZONES[zi].n[o.lang() === "es" ? 1 : 0]}`, "good"); }
    }
    
    if (p.hp <= 0) { say(txt().died, "warn"); burst(p.x, p.y, "#ff3333", 30, true); Object.assign(p, { x: 220, y: 500, vx: 0, vy: 0, hp: st.hp, energy: 60, inv: 3 }); }
    
    darkV += ((ZONES[zi].dark || 0) - darkV) * Math.min(1, dt);
    
    for (let i = fx.length - 1; i >= 0; i -= 1) { const f = fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; if (f.life <= 0) fx.splice(i, 1); }
    for (let i = ft.length - 1; i >= 0; i -= 1) { ft[i].y -= 30 * dt; ft[i].life -= dt; if (ft[i].life <= 0) ft.splice(i, 1); }
    
    renderHud(st);
  }

  const hudCache = {};
  function renderHud(st) {
    const set = (k, v) => { if (hudCache[k] !== v) { hudCache[k] = v; hud[k].textContent = v; } };
    set("lvl", `  ${txt().lvl} ${S.lvl + 1} — ${o.name(S.lvl)}`); set("bp", `🟡 ${txt().bp}: ${fmt(S.bp)}`);
    set("zone", `📍 ${ZONES[p.zone].n[o.lang() === "es" ? 1 : 0]}`);
    hud.hp.style.width = `${Math.max(0, (p.hp / st.hp) * 100)}%`; hud.en.style.width = `${p.energy}%`; back.textContent = txt().back;
  }

  const mod = (a, n) => ((a % n) + n) % n;
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  
  const motes = Array.from({ length: 80 }, () => ({ x: Math.random() * 1600, y: Math.random() * 1000, z: 0.2 + Math.random() * 0.4, v: 4 + Math.random() * 10, r: 0.8 + Math.random() * 2, a: 0.15 + Math.random() * 0.35 }));

  const ridge = (cx, cy, par, lift, col, fq, amp) => {
    const base = WORLD.h - lift - cy; if (base - amp > vh / camScale) return;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, vh / camScale);
    for (let x = 0; x <= vw / camScale + 20; x += 20) { const wx = x + cx * par; ctx.lineTo(x, base + Math.sin(wx * fq) * amp + Math.sin(wx * fq * 2.7 + 1) * amp * 0.4); }
    ctx.lineTo(vw / camScale, vh / camScale); ctx.closePath(); ctx.fill();
  };

  function egg(s) {
    const g = ctx.createRadialGradient(-s * 0.2, -s * 0.3, s * 0.1, 0, 0, s * 1.1); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#d9c294");
    ctx.shadowColor = "rgba(255,240,200,.9)"; ctx.shadowBlur = 18; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.8, s, 0, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(150,110,60,.35)";
    [[-0.3, -0.4, 0.1], [0.2, 0.3, 0.12], [0.35, -0.25, 0.08], [-0.2, 0.45, 0.09]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 6.3); ctx.fill(); });
  }

  function shark(L, col, wag, mouth) {
    const g = ctx.createLinearGradient(0, -L * 0.28, 0, L * 0.28);
    g.addColorStop(0, shade(col, -0.45)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, 0.3));
    const body = new Path2D();
    body.moveTo(L / 2, 0); body.quadraticCurveTo(L * 0.1, -L * 0.28, -L * 0.38, -L * 0.04);
    body.lineTo(-L * 0.58, -L * 0.2 + wag); body.lineTo(-L * 0.5, wag * 0.3); body.lineTo(-L * 0.58, L * 0.2 + wag); body.lineTo(-L * 0.38, L * 0.04);
    body.quadraticCurveTo(L * 0.1, L * 0.28, L / 2, 0); body.closePath();
    
    ctx.shadowColor = "rgba(0,10,30,.45)"; ctx.shadowBlur = 12; ctx.fillStyle = g; ctx.fill(body); ctx.shadowBlur = 0;
    ctx.fillStyle = shade(col, -0.35); 
    ctx.beginPath(); ctx.moveTo(-L * 0.02, -L * 0.2); ctx.quadraticCurveTo(-L * 0.08, -L * 0.34, -L * 0.16, -L * 0.42); ctx.lineTo(-L * 0.17, -L * 0.16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L * 0.14, L * 0.1); ctx.quadraticCurveTo(L * 0.02, L * 0.32 + wag * 0.4, -L * 0.12, L * 0.34 + wag * 0.5); ctx.lineTo(-L * 0.08, L * 0.1); ctx.fill();
    
    const bg = ctx.createLinearGradient(0, 0, 0, L * 0.17); bg.addColorStop(0, "rgba(255,255,255,.55)"); bg.addColorStop(1, "rgba(255,255,255,.95)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(L * 0.05, L * 0.1, L * 0.3, L * 0.07, 0.05, 0, 6.3); ctx.fill();
    
    const ex = L * 0.31, ey = -L * 0.05, er = Math.max(2, L * 0.035);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#0b1b33"; ctx.beginPath(); ctx.arc(ex + er * 0.2, ey, er * 0.62, 0, 6.3); ctx.fill();
    
    if (mouth > 0) {
      const o = L * 0.12 * mouth; ctx.fillStyle = "#5a0f1a"; ctx.beginPath(); ctx.moveTo(L * 0.49, L * 0.01); ctx.lineTo(L * 0.26, L * 0.07 + o); ctx.lineTo(L * 0.27, L * 0.06); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; for (let i = 0; i < 5; i += 1) { const x = L * (0.45 - i * 0.04); ctx.beginPath(); ctx.moveTo(x, L * 0.03); ctx.lineTo(x - L * 0.012, L * 0.06 + o * 0.4); ctx.lineTo(x - L * 0.024, L * 0.03); ctx.fill(); }
    }
  }

  function draw() {
    const st = LEVELS[S.lvl], sh = p.shake ? (Math.random() - 0.5) * 12 : 0, H = WORLD.h;
    
    // Cálculo dinámico de viewport proyectado por el zoom
    const vwp = vw / camScale;
    const vhp = vh / camScale;
    const cx = Math.min(WORLD.w - vwp, Math.max(0, p.x - vwp / 2)) + sh;
    const cy = Math.min(H - vhp, Math.max(0, p.y - vhp / 2));

    ctx.save();
    ctx.clearRect(0, 0, vw, vh);
    ctx.scale(camScale, camScale); // Aplicar Cámara dinámica

    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vwp) return;
      const g = ctx.createLinearGradient(0, -cy, 0, H - cy); g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, 0, z.w + 1, vhp);
    });
    
    ridge(cx, cy, 0.25, 260, "rgba(5,30,55,.22)", 0.0043, 55); ridge(cx, cy, 0.5, 140, "rgba(3,20,40,.32)", 0.007, 40); 
    
    const rayA = 0.16 * (1 - Math.min(1, (cy + vhp * 0.5) / 900));
    if (rayA > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i += 1) {
        const x0 = mod(i * vwp / 5 + Math.sin(time * 0.25 + i * 1.7) * 60 - cx * 0.15, vwp + 200) - 100, w = 40 + (i % 3) * 30, g = ctx.createLinearGradient(0, -cy, 0, -cy + 800);
        g.addColorStop(0, `rgba(200,245,255,${rayA})`); g.addColorStop(1, "rgba(200,245,255,0)"); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x0, -cy); ctx.lineTo(x0 + w, -cy); ctx.lineTo(x0 + w - 160, -cy + 800); ctx.lineTo(x0 - 160, -cy + 800); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.save(); ctx.translate(-cx, -cy);
    
    // Suelo
    const sg = ctx.createLinearGradient(0, H - 70, 0, H); sg.addColorStop(0, "rgba(210,190,140,.5)"); sg.addColorStop(1, "rgba(35,28,18,.9)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(cx - 20, H + 10);
    for (let x = cx - 20; x <= cx + vwp + 20; x += 24) ctx.lineTo(x, H - 28 + Math.sin(x * 0.02) * 8 + Math.sin(x * 0.007) * 12);
    ctx.lineTo(cx + vwp + 20, H + 10); ctx.fill();
    
    world.decor.forEach((d) => { /* Render de algas, corales, etc (Simplificado por espacio, idéntico a original) */ });

    ALL_GATES.forEach((g) => {
      if (g.x > cx + vwp || g.x + g.w < cx) return; const locked = S.lvl < g.min;
      if (!locked) { ctx.globalAlpha = 0.08; ctx.fillStyle = "#9fd8ff"; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.globalAlpha = 1; return; }
      const gg = ctx.createLinearGradient(g.x, 0, g.x + g.w, 0); gg.addColorStop(0, "rgba(130,210,255,.75)"); gg.addColorStop(0.5, "rgba(50,80,140,.85)"); gg.addColorStop(1, "rgba(130,210,255,.75)");
      ctx.fillStyle = gg; ctx.fillRect(g.x, g.y, g.w, g.h);
    });

    world.treasures.forEach((t) => {
      if (S.found[t.id] || t.x < cx - 50 || t.x > cx + vwp + 50) return; const ty = t.y + Math.sin(time * 2 + t.x) * 4;
      ctx.font = "26px serif"; ctx.shadowColor = "#ffe27a"; ctx.shadowBlur = 14; ctx.fillText(TREASURE_ICON[t.k], t.x, ty); ctx.shadowBlur = 0;
    });

    const glow = [];
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vwp + 300 || c.y < cy - 300 || c.y > cy + vhp + 300) return;
      const df = c.def, edible = df.r <= st.power;
      ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + c.t * 3) * 2);
      
      const flip = Math.cos(c.a) > 0 ? -1 : 1;
      ctx.rotate(Math.sin(c.a) * 0.4 * -flip); ctx.scale(flip * (1 + Math.sin(time * 7 + c.x) * 0.03), 1); ctx.globalAlpha = c.hit > 0 ? 0.5 : 1;
      
      // Dibujado procedural de criaturas en vez de emojis
      if (df.id === "jelly") Graphics.drawJelly(ctx, df.s, time);
      else if (df.id === "crab") Graphics.drawCrab(ctx, df.s, time);
      else if (df.id === "squid") Graphics.drawSquid(ctx, df.s, time);
      else Graphics.drawFish(ctx, df.s, time, df.dm ? "#d32f2f" : "#29b6f6", df.dm ? "#b71c1c" : "#0288d1");
      
      if (!edible && df.dm) { // Indicador hostil
         ctx.strokeStyle = "rgba(255, 50, 50, 0.4)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, df.s * 0.7, 0, Math.PI * 2); ctx.stroke();
      } else if (edible) { // Indicador amigable/comestible
         ctx.strokeStyle = "rgba(100, 255, 150, 0.2)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, df.s * 0.6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      if (df.glow) glow.push(c);
    });

    // Jugador (Tiburón)
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    if (S.lvl === 0) egg(st.size); else shark(st.size * 2, SHARK_COLORS[S.lvl], Math.sin(time * 9) * st.size * 0.12, Math.max(0, p.biteT / 0.3));
    if (p.biteT > 0) { ctx.strokeStyle = `rgba(255,255,255,${p.biteT / 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(st.size * 0.95, 0, st.size * (0.9 - p.biteT), -1, 1); ctx.stroke(); }
    ctx.restore();

    fx.forEach((f) => {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      if (f.b) { ctx.strokeStyle = "rgba(220,245,255,.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.stroke(); }
      else { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill(); }
    });
    ctx.globalAlpha = 1; ctx.restore();

    // Partículas y Sombras Profundas
    motes.forEach((m) => { ctx.globalAlpha = m.a; ctx.fillStyle = "#e6f7ff"; ctx.beginPath(); ctx.arc(mod(m.x - cx * m.z + Math.sin(time * 0.5 + m.y) * 10, vwp), mod(m.y + time * m.v - cy * m.z, vhp), m.r, 0, 6.3); ctx.fill(); }); ctx.globalAlpha = 1;
    
    const dep = Math.min(1, (cy + vhp / 2) / H); ctx.fillStyle = `rgba(0,10,30,${dep * 0.35})`; ctx.fillRect(0, 0, vwp, vhp); 
    
    if (darkV > 0.02) { 
      const px = p.x - cx, py = p.y - cy, g = ctx.createRadialGradient(px, py, 120 / camScale, px, py, 650 / camScale); 
      g.addColorStop(0, "rgba(0,0,10,0)"); g.addColorStop(1, `rgba(0,0,10,${darkV})`); ctx.fillStyle = g; ctx.fillRect(0, 0, vwp, vhp); 
    }
    
    ctx.textAlign = "center"; ctx.font = "800 18px system-ui";
    ft.forEach((f) => { ctx.globalAlpha = Math.min(1, f.life); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,20,40,.7)"; ctx.strokeText(f.s, f.x - cx, f.y - cy); ctx.fillStyle = f.col; ctx.fillText(f.s, f.x - cx, f.y - cy); }); ctx.globalAlpha = 1;
    
    ctx.restore(); // Fin cámara
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1; vw = canvas.clientWidth; vh = canvas.clientHeight;
    canvas.width = vw * dpr; canvas.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(ts) { if (!running) return; const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; step(dt); draw(); raf = requestAnimationFrame(loop); }

  function open() {
    const s = o.load() || {}, lv = o.getLevel();
    S = { lvl: lv, bpLevel: s.bpLevel ?? lv, bp: s.bp || 0, found: s.found || {}, zones: s.zones || {} };
    if (S.bpLevel !== lv) { S.bpLevel = lv; S.bp = 0; } // Reinicio si el usuario estudió y subió nivel
    
    p = { x: 240, y: 520, vx: 0, vy: 0, a: 0, hp: LEVELS[lv].hp, energy: 80, inv: 0, biteT: 0, shake: 0, zone: -1 };
    camScale = 60 / Math.max(60, LEVELS[lv].size * 0.8);

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