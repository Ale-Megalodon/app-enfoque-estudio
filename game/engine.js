/* Motor del minijuego (Beta 3.0) 
   Soporte para Sprites (Imágenes), Mundo 2D Híbrido, y Físicas mejoradas. */
   
import { BP, WORLD, LEVELS, SHARK_COLORS, ZONES, GATES, POIS, TREASURES, TREASURE_PER_ZONE, CREATURES, TEXT, SAVE_VERSION } from "./data.js";
import { createInput, createAudio, spawn, updateCreature } from "./systems.js";

const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TREASURE_ICON = { coin: "🪙", gem: "💎", chest: "🏴‍☠️", relic: "🔱" };
const ALL_GATES = [...GATES];

// GESTOR DE RECURSOS (Imágenes/Sprites)
// Cuando tengas los .png, simplemente añade las rutas en 'urls'. El motor las dibujará automáticamente.
const AssetManager = {
  images: {},
  urls: {
    // Ejemplo: 'shark_lvl1': 'assets/shark1.png',
    // Ejemplo: 'crab_small': 'assets/crab.png'
  },
  init() {
    Object.keys(this.urls).forEach(key => {
      const img = new Image();
      img.src = this.urls[key];
      img.onload = () => { this.images[key] = img; };
    });
  },
  // Si la imagen existe, la dibuja. Si no, devuelve false para que actúe el Fallback Vectorial
  drawSprite(ctx, id, x, y, width, height) {
    if (this.images[id]) {
      ctx.drawImage(this.images[id], x - width/2, y - height/2, width, height);
      return true; 
    }
    return false;
  }
};

const PetPaths = {
  tail: new Path2D("M40 55 L4 18 Q20 55 4 92 Z"),
  body: new Path2D("M30 55 Q80 8 150 30 Q200 45 214 58 Q190 84 140 88 Q70 98 30 55Z"),
  belly: new Path2D("M60 78 Q120 94 196 66 Q150 88 100 88Z"),
  finTop: new Path2D("M95 30 L116 0 L136 32Z"),
  finBottom: new Path2D("M120 82 L98 106 L146 86Z"),
  gills: new Path2D("M140 56 q4 8 0 16 M148 55 q4 8 0 16")
};

function buildWorld() {
  const r = rng(7), decor = [], treasures = [...TREASURES], creatures = [];
  ZONES.forEach((z, zi) => {
    // Decoración distribuida en el plano X y el plano Y de la zona
    for (let i = 0; i < (z.w * z.h / 1000000) * 15; i += 1) {
      decor.push({ x: z.x + r() * z.w, y: z.y + r() * z.h, s: 30 + r() * 80, k: z.d, h: r(), zi });
    }
    for (let i = 0; i < TREASURE_PER_ZONE[zi]; i += 1) {
      const k = ["coin", "coin", "gem", "chest"][Math.floor(r() * 4)];
      treasures.push({ id: `t${zi}_${i}`, k, x: z.x + 80 + r() * (z.w - 160), y: z.y + z.h * (0.6 + r() * 0.38) });
    }
    CREATURES.filter((c) => c.z.includes(zi)).forEach((def) => {
      for (let i = 0; i < Math.round((z.w * z.h / 1000000) * def.n); i += 1) creatures.push(spawn(def, z, r));
    });
  });
  return { decor, treasures, creatures };
}

// Fallback Vectorial 
const Graphics = {
  drawFish(ctx, s, time, c1, c2) {
    const wag = Math.sin(time * 12) * (s * 0.15);
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-s*0.3, 0); ctx.lineTo(-s*0.6+wag, -s*0.25); ctx.lineTo(-s*0.6+wag, s*0.25); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, 0, s*0.5, s*0.25, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s*0.25, -s*0.08, s*0.06, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(s*0.27, -s*0.08, s*0.03, 0, 6.3); ctx.fill();
  },
  drawRay(ctx, s, time) {
    const flap = Math.sin(time * 5) * s * 0.3;
    ctx.fillStyle = "#5c6bc0"; ctx.beginPath(); ctx.moveTo(s*0.4, 0); ctx.lineTo(0, -s*0.4 + flap); ctx.lineTo(-s*0.3, 0); ctx.lineTo(0, s*0.4 - flap); ctx.fill();
    ctx.strokeStyle = "#3f51b5"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-s*0.3, 0); ctx.lineTo(-s*0.8 + Math.sin(time*8)*s*0.1, Math.sin(time*6)*s*0.1); ctx.stroke();
  },
  drawEel(ctx, s, time, isHostile) {
    ctx.strokeStyle = isHostile ? "#2e7d32" : "#d4e157"; ctx.lineWidth = s * 0.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    for(let i=0; i<5; i++) ctx.lineTo(-i * s * 0.25, Math.sin(time * 10 - i * 0.8) * s * 0.15);
    ctx.stroke();
    ctx.fillStyle = isHostile ? "#1b5e20" : "#9ccc65"; ctx.beginPath(); ctx.arc(0, Math.sin(time*10)*s*0.15, s*0.15, 0, 6.3); ctx.fill();
  },
  drawCrab(ctx, s, time) {
    const leg = Math.sin(time * 15) * s * 0.1;
    ctx.fillStyle = "#d84315"; ctx.beginPath(); ctx.ellipse(0, 0, s*0.3, s*0.2, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "#bf360c"; ctx.lineWidth = Math.max(2, s*0.05);
    [-1, 1].forEach(dir => {
      ctx.beginPath(); ctx.moveTo(dir*s*0.2, 0); ctx.lineTo(dir*s*0.4, -s*0.2 + leg*dir); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dir*s*0.2, s*0.1); ctx.lineTo(dir*s*0.4, s*0.3 - leg*dir); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dir*s*0.25, -s*0.1); ctx.lineTo(dir*s*0.45, -s*0.3); ctx.arc(dir*s*0.45, -s*0.3, s*0.08, 0, Math.PI); ctx.fill();
    });
  },
  drawGolem(ctx, s, time) {
    const hover = Math.sin(time * 2) * 5;
    ctx.fillStyle = "#37474f"; ctx.fillRect(-s*0.3, -s*0.4 + hover, s*0.6, s*0.8);
    ctx.fillStyle = "#00e5ff"; ctx.globalAlpha = 0.6 + Math.sin(time*8)*0.4;
    ctx.fillRect(-s*0.1, -s*0.2 + hover, s*0.2, s*0.4); ctx.globalAlpha = 1;
    ctx.fillStyle = "#263238"; ctx.fillRect(-s*0.4, -s*0.3 + hover, s*0.1, s*0.6); ctx.fillRect(s*0.3, -s*0.3 + hover, s*0.1, s*0.6);
  }
};

export function createGame(o) {
  const { view, canvas, hud, banner, back, joy, biteBtn } = o.el;
  const ctx = canvas.getContext("2d");
  
  AssetManager.init(); // Inicializa carga de sprites
  const world = buildWorld();
  
  let S, p, input, audio, raf = 0, last = 0, running = false, vw = 0, vh = 0, time = 0, saveT = 0, darkV = 0, bannerT = 0, lastBanner = "", gateCd = 0;
  let camScale = 1; 
  const fx = [], ft = [], txt = () => TEXT[o.lang()] || TEXT.en, fmt = (n) => Math.round(n).toLocaleString(o.lang() === "es" ? "es-BO" : "en-US");
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones }), 1200); };

  function say(msg, cls = "") {
    if (msg === lastBanner && performance.now() - bannerT < 900) return;
    lastBanner = msg; bannerT = performance.now(); banner.textContent = msg; banner.className = `game-banner show ${cls}`;
    clearTimeout(say.t); say.t = setTimeout(() => { banner.className = "game-banner"; }, 1900);
  }

  const floatText = (s, x, y, col = "#ffe27a") => ft.push({ s, x, y, life: 1.3, col });
  const burst = (x, y, col, n = 8, isBlood = false) => { 
    for (let i = 0; i < n; i += 1) fx.push({ x, y, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, life: 0.8, col, r: (isBlood ? 3 : 2) + Math.random() * 4 }); 
  };

  function addBp(n, x, y) { S.bp += n; floatText(`+${fmt(n)} BP`, x, y - 30); save(); }

  function setLevel(lv) {
    S.lvl = lv; p.hp = LEVELS[lv].hp; p.energy = Math.max(p.energy, 70);
    if (S.bpLevel !== lv) { 
        S.bpLevel = lv; S.bp = 0; 
        say(`¡${txt().lvl} ${lv + 1} - ${o.name(lv)}!`, "good"); 
        burst(p.x, p.y, "#fff", 25); save(); 
    }
  }

  const zoneAt = (x, y) => {
    // Búsqueda en 2D (Eje X e Y)
    let found = 0;
    for(let i=0; i<ZONES.length; i++) {
       const z = ZONES[i];
       if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) found = i;
    }
    return found;
  };
  
  const hurt = (dm, fromX) => {
    if (p.inv > 0) return; p.inv = 1; p.hp -= dm; p.shake = 0.4; audio.sfx.hurt(); floatText(`-${dm}`, p.x, p.y - 20, "#ff6b6b");
    p.vx += Math.sign(p.x - fromX || 1) * 350; p.vy -= 100;
    burst(p.x, p.y, "#ff3333", 10, true);
  };

  // Verificación AABB (Eje X e Y)
  const blocking = (x, y, r) => ALL_GATES.find((g) => S.lvl < g.min && x + r > g.x && x - r < g.x + g.w && y + r > g.y && y - r < g.y + g.h);

  function step(dt) {
    time += dt;
    const currentEvolutionLevel = o.getLevel(); 
    if (currentEvolutionLevel !== S.lvl) setLevel(currentEvolutionLevel);

    const st = LEVELS[S.lvl], r = st.size * 0.5, d = input.dir();
    
    // BUFF DEL HUEVO: El multiplicador de aceleración ahora es el doble si es Nivel 0
    const a = Math.min(1, dt * (S.lvl === 0 ? 8 : 4));
    
    const isDashing = input.dash && input.dash() && p.energy > 0;
    const speedMult = isDashing ? 1.8 : 1;
    
    camScale += ((60 / Math.max(60, st.size * 0.8)) - camScale) * dt * 2;

    p.vx += (d.x * st.speed * speedMult - p.vx) * a; 
    p.vy += (d.y * st.speed * speedMult - p.vy) * a;
    
    for (const ax of ["x", "y"]) {
      const nx = ax === "x" ? p.x + p.vx * dt : p.x, ny = ax === "y" ? p.y + p.vy * dt : p.y, g = blocking(nx, ny, r);
      if (g) { 
        if (gateCd <= 0) { say(g.t === "egg" ? txt().egg : txt()[g.t], "warn"); gateCd = 1.6; } 
        p[ax === "x" ? "vx" : "vy"] *= -0.5; 
      } else { p.x = nx; p.y = ny; }
    }
    gateCd -= dt; 
    p.x = Math.min(WORLD.w - r, Math.max(r, p.x)); 
    p.y = Math.min(WORLD.h - r, Math.max(0, p.y)); // El límite superior ahora es la superficie (Y=0)
    
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 8) { 
      let da = Math.atan2(p.vy, p.vx) - p.a; 
      da = Math.atan2(Math.sin(da), Math.cos(da)); 
      p.a += da * Math.min(1, dt * 6); 
      if (Math.random() < dt * 4) audio.sfx.swim(); 
    }
    
    if (isDashing && spd > 40 && Math.random() < dt * 25) {
      fx.push({ x: p.x - Math.cos(p.a) * st.size, y: p.y - Math.sin(p.a) * st.size + (Math.random() - 0.5) * 10, vx: -p.vx * 0.2, vy: -10, life: 0.6, col: "rgba(255,255,255,.8)", r: 2 + Math.random() * 2, b: 1 });
    }

    p.inv -= dt; p.biteT -= dt; p.shake = Math.max(0, p.shake - dt);
    
    const energyDrain = (S.lvl ? 0.8 : 0.3) * (isDashing ? 3.5 : 1);
    p.energy = Math.min(100, p.energy - dt * energyDrain); 
    if (p.energy <= 0) { p.energy = 0; p.hp -= dt * 3; }
    
    const mx = p.x + Math.cos(p.a) * st.size * 0.95, my = p.y + Math.sin(p.a) * st.size * 0.95;
    const biting = input.takeBite() && p.biteT <= 0; 
    if (biting) { p.biteT = 0.3; audio.sfx.bite(); burst(mx, my, "#ffffff", 5); }

    world.creatures.forEach((c) => {
      if (c.dead > 0) { c.dead -= dt; if (c.dead <= 0) Object.assign(c, spawn(c.def, ZONES[c.zone], Math.random)); return; }
      if (Math.abs(c.x - p.x) > 1600 / camScale || Math.abs(c.y - p.y) > 1200 / camScale) return;
      
      const dist = updateCreature(c, dt, p, st.power, Math.random), df = c.def, reach = Math.hypot(mx - c.x, my - c.y);
      const edible = df.r <= st.power, biteR = st.size * 0.7 + 16 + df.s * 0.5;
      
      if (edible && (reach < st.size * 0.45 + df.s * 0.4 || (biting && reach < biteR))) {
        c.dead = 25; p.energy = Math.min(100, p.energy + 8 + df.s * 0.3); p.hp = Math.min(st.hp, p.hp + df.s * 0.15 + (df.heal || 0));
        audio.sfx.eat(); burst(c.x, c.y, "#ffd27a"); addBp(df.bp, c.x, c.y);
      } else if (biting && reach < biteR && !edible) { 
        say(txt().big, "warn"); c.hit = 0.4; hurt(df.dm || Math.max(5, df.s * 0.2), c.x); 
        p.vx = -Math.cos(p.a) * 350; p.vy = -Math.sin(p.a) * 350;
      } else if (df.dm && dist < (df.s + st.size) * 0.4 && (df.r > st.power || df.b === "ignore")) {
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

    const zi = zoneAt(p.x, p.y);
    if (zi !== p.zone) {
      p.zone = zi; audio.ambience(zi);
      if (zi && !S.zones[zi]) { S.zones[zi] = 1; audio.sfx.zone(); addBp(BP.zone, p.x, p.y); say(`${txt().disc}   ${ZONES[zi].n[o.lang() === "es" ? 1 : 0]}`, "good"); }
    }
    
    if (p.hp <= 0) { say(txt().died, "warn"); burst(p.x, p.y, "#ff3333", 30, true); Object.assign(p, { x: 300, y: 200, vx: 0, vy: 0, hp: st.hp, energy: 60, inv: 3 }); }
    
    darkV += ((ZONES[zi].dark || 0) - darkV) * Math.min(1, dt);
    renderHud(st);
  }

  function renderHud(st) {
    hud.lvl.textContent = `  ${txt().lvl} ${S.lvl + 1} — ${o.name(S.lvl)}`; 
    hud.bp.textContent = `🟡 ${txt().bp}: ${fmt(S.bp)}`;
    hud.zone.textContent = `📍 ${ZONES[p.zone].n[o.lang() === "es" ? 1 : 0]}`;
    hud.hp.style.width = `${Math.max(0, (p.hp / st.hp) * 100)}%`; hud.en.style.width = `${p.energy}%`; back.textContent = txt().back;
  }

  function exactEgg(s, time) {
    const scale = (s * 2.2) / 100;
    ctx.save(); ctx.scale(scale, scale); ctx.translate(-50, -65);
    ctx.translate(50, 130); ctx.rotate(Math.sin(time * 6) * 0.08); ctx.translate(-50, -130);
    ctx.fillStyle = "#f5e6c8"; ctx.beginPath(); ctx.ellipse(50, 70, 38, 52, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#e2c99a";
    ctx.beginPath(); ctx.arc(36, 55, 6, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(62, 82, 8, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(58, 44, 4, 0, 6.3); ctx.fill();
    ctx.restore();
  }

  function exactShark(L, col, wag, mouth) {
    const scale = (L * 2.8) / 220; 
    ctx.save(); ctx.scale(scale, scale); ctx.translate(-110, -55);
    ctx.save(); ctx.translate(40, 55); ctx.rotate(wag * 0.05); ctx.translate(-40, -55);
    ctx.fillStyle = col; ctx.fill(PetPaths.tail); ctx.restore();
    ctx.fillStyle = col; ctx.fill(PetPaths.body);
    ctx.fillStyle = "#eaf6ff"; ctx.fill(PetPaths.belly);
    ctx.fillStyle = col; ctx.fill(PetPaths.finTop);
    ctx.fillStyle = col; ctx.globalAlpha = 0.8; ctx.fill(PetPaths.finBottom); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(11, 27, 51, 0.25)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(PetPaths.gills);
    ctx.fillStyle = "#0b1b33"; ctx.beginPath(); ctx.arc(180, 52, 4.5, 0, 6.3); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(181.5, 50.5, 1.4, 0, 6.3); ctx.fill();
    if (mouth > 0) {
       ctx.fillStyle = "#5a0f1a";
       ctx.beginPath(); ctx.moveTo(214, 58); ctx.lineTo(190 + mouth*12, 58 + mouth*18); ctx.lineTo(180, 80); ctx.fill();
       ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(214, 58); ctx.lineTo(204, 66); ctx.lineTo(200, 58); ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    const st = LEVELS[S.lvl], sh = p.shake ? (Math.random() - 0.5) * 12 : 0, H = WORLD.h;
    const vwp = vw / camScale, vhp = vh / camScale;
    const cx = Math.min(WORLD.w - vwp, Math.max(0, p.x - vwp / 2)) + sh;
    const cy = Math.min(H - vhp, Math.max(0, p.y - vhp / 2));

    ctx.save(); ctx.clearRect(0, 0, vw, vh); ctx.scale(camScale, camScale); 

    // Render de bloques de zonas (Ejes X e Y)
    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vwp || z.y + z.h < cy || z.y > cy + vhp) return;
      const g = ctx.createLinearGradient(0, z.y - cy, 0, z.y + z.h - cy); 
      g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, z.y - cy, z.w + 1, z.h + 1);
    });
    
    // Superficie del agua (Olas dinámicas)
    if (cy < 100) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.moveTo(0, -cy);
      for(let x = 0; x <= vwp + 20; x += 30) ctx.lineTo(x, -cy + Math.sin(time * 3 + x * 0.05) * 8);
      ctx.lineTo(vwp, -cy); ctx.lineTo(vwp, 0); ctx.lineTo(0, 0); ctx.fill();
    }

    ctx.save(); ctx.translate(-cx, -cy);
    
    // Suelo inferior
    const sg = ctx.createLinearGradient(0, H - 70, 0, H); sg.addColorStop(0, "rgba(210,190,140,.5)"); sg.addColorStop(1, "rgba(35,28,18,.9)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(cx - 20, H + 10);
    for (let x = cx - 20; x <= cx + vwp + 20; x += 24) ctx.lineTo(x, H - 28 + Math.sin(x * 0.02) * 8);
    ctx.lineTo(cx + vwp + 20, H + 10); ctx.fill();
    
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vwp + 300 || c.y < cy - 300 || c.y > cy + vhp + 300) return;
      const df = c.def, edible = df.r <= st.power;
      ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + c.t * 3) * 2);
      
      const flip = Math.cos(c.a) > 0 ? -1 : 1;
      ctx.rotate(Math.sin(c.a) * 0.4 * -flip); ctx.scale(flip, 1); ctx.globalAlpha = c.hit > 0 ? 0.5 : 1;
      
      // SISTEMA DE SPRITES: Dibuja la imagen si existe, sino dibuja el vector procedural
      if (!AssetManager.drawSprite(ctx, df.id, 0, 0, df.s * 2, df.s * 2)) {
         if (df.id.includes("ray")) Graphics.drawRay(ctx, df.s, time);
         else if (df.id.includes("eel") || df.id.includes("snake")) Graphics.drawEel(ctx, df.s, time, df.dm);
         else if (df.id.includes("crab")) Graphics.drawCrab(ctx, df.s, time);
         else if (df.id.includes("golem") || df.id.includes("construct")) Graphics.drawGolem(ctx, df.s, time);
         else Graphics.drawFish(ctx, df.s, time, df.dm ? "#d32f2f" : "#29b6f6", df.dm ? "#b71c1c" : "#0288d1");
      }
      ctx.restore();
    });

    // Jugador (Tiburón 1:1)
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); 
    ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    if (!AssetManager.drawSprite(ctx, `player_lvl${S.lvl}`, 0, 0, st.size * 3, st.size * 1.5)) {
        if (S.lvl === 0) exactEgg(st.size, time); else exactShark(st.size, SHARK_COLORS[S.lvl], Math.sin(time * 9) * st.size, Math.max(0, p.biteT / 0.3));
    }
    ctx.restore();

    for (let i = fx.length - 1; i >= 0; i -= 1) { 
      const f = fx[i]; f.x += f.vx * 0.016; f.y += f.vy * 0.016; f.life -= 0.016; 
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
    }
    
    ctx.globalAlpha = 1; ctx.restore();
    ctx.restore(); 
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
    
    // Punto de origen ajustado a la costa superficial (X=300, Y=200)
    p = { x: 300, y: 200, vx: 0, vy: 0, a: 0, hp: LEVELS[lv].hp, energy: 80, inv: 0, biteT: 0, shake: 0, zone: -1 };
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