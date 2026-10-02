/* Motor del minijuego (Beta 4.2) - Corrección de funciones de dibujo del jugador, bugs visuales e IA */
import { BP, WORLD, LEVELS, SHARK_COLORS, ZONES, GATES, POIS, TREASURES, TREASURE_PER_ZONE, CREATURES, TEXT, SAVE_VERSION } from "./data.js";
import { createInput, createAudio, spawn, updateCreature } from "./systems.js";

const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TREASURE_ICON = { coin: "🪙", gem: "💎", chest: "🏴‍☠", relic: "🔱" };
const ALL_GATES = [...GATES];

const AssetManager = {
  images: {},
  urls: {},
  init() {
    Object.keys(this.urls).forEach(key => {
      const img = new Image();
      img.src = this.urls[key];
      img.onload = () => { this.images[key] = img; };
    });
  },
  drawSprite(ctx, id, x, y, width, height, time, frames = 1, speed = 8) {
    const img = this.images[id];
    if (img) {
      const currentFrame = Math.floor(time * speed) % frames;
      const frameWidth = img.width / frames;
      ctx.drawImage(img, currentFrame * frameWidth, 0, frameWidth, img.height, x - width / 2, y - height / 2, width, height);
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

// Funciones de renderizado vectorial para el jugador (Huevito y Tiburón)
function exactEgg(s) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5e6c8";
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.8, s * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2c99a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function exactShark(s, color, tailWag) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  const scale = s / 35;
  ctx.scale(scale, scale);
  
  // Cola
  ctx.save();
  ctx.translate(-40, 0);
  ctx.rotate(tailWag * 0.05);
  ctx.fillStyle = color;
  ctx.fill(PetPaths.tail);
  ctx.restore();

  // Cuerpo
  ctx.fillStyle = color;
  ctx.fill(PetPaths.body);

  // Panza
  ctx.fillStyle = "#eaf6ff";
  ctx.fill(PetPaths.belly);

  // Aleta dorsal
  ctx.fillStyle = color;
  ctx.fill(PetPaths.finTop);

  // Aleta pectoral
  ctx.fill(PetPaths.finBottom);

  // Branquias
  ctx.strokeStyle = "rgba(11, 27, 51, 0.25)";
  ctx.lineWidth = 2;
  ctx.stroke(PetPaths.gills);

  // Ojo
  ctx.fillStyle = "#0b1b33";
  ctx.beginPath();
  ctx.arc(60, -5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(61.5, -6.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Miniaturas vectoriales para el Bestiario Visual
const BestiaryIcons = {
  drawMiniFish(ctx, c1, c2) {
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-12, -5); ctx.lineTo(-12, 5); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, 6.3); ctx.fill();
  },
  drawMiniCrab(ctx) {
    ctx.fillStyle = "#d84315"; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, 6.3); ctx.fill();
  },
  drawMiniEel(ctx) {
    ctx.strokeStyle = "#d4e157"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
  },
  drawMiniRay(ctx) {
    ctx.fillStyle = "#5c6bc0"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -8); ctx.lineTo(-8, 0); ctx.lineTo(0, 8); ctx.fill();
  }
};

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

function buildWorld() {
  const r = rng(7), decor = [], treasures = [...TREASURES], creatures = [];
  ZONES.forEach((z, zi) => {
    for (let i = 0; i < (z.w * z.h / 1000000) * 15; i += 1) decor.push({ x: z.x + r() * z.w, y: z.y + r() * z.h, s: 30 + r() * 80, k: z.d, h: r(), zi });
    for (let i = 0; i < TREASURE_PER_ZONE[zi]; i += 1) treasures.push({ id: `t${zi}_${i}`, k: ["coin", "gem", "chest"][Math.floor(r() * 3)], x: z.x + 80 + r() * (z.w - 160), y: z.y + z.h * (0.6 + r() * 0.38) });
    CREATURES.filter((c) => c.z.includes(zi)).forEach((def) => {
      for (let i = 0; i < Math.round((z.w * z.h / 1000000) * def.n); i += 1) creatures.push(spawn(def, z, r));
    });
  });
  return { decor, treasures, creatures };
}

export function createGame(o) {
  const { view, canvas, hud, banner, back, joy, biteBtn } = o.el;
  const ctx = canvas.getContext("2d");
  
  AssetManager.init();
  const world = buildWorld();
  
  let S, p, input, audio, raf = 0, last = 0, running = false, vw = 0, vh = 0, time = 0, saveT = 0, darkV = 0, bannerT = 0, lastBanner = "", gateCd = 0;
  let camScale = 1; 
  let showDietOverlay = true;

  const fx = [], ft = [], txt = () => TEXT[o.lang()] || TEXT.en, fmt = (n) => Math.round(n).toLocaleString(o.lang() === "es" ? "es-BO" : "en-US");
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones }), 1200); };

  function say(msg, cls = "") {
    if (msg === lastBanner && performance.now() - bannerT < 900) return;
    lastBanner = msg; bannerT = performance.now(); banner.textContent = msg; banner.className = `game-banner show ${cls}`;
    clearTimeout(say.t); say.t = setTimeout(() => { banner.className = "game-banner"; }, 1900);
  }

  const burst = (x, y, col, n = 8, isBlood = false) => { 
    for (let i = 0; i < n; i += 1) fx.push({ x, y, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, life: 0.8, col, r: (isBlood ? 3 : 2) + Math.random() * 4 }); 
  };
  const addBp = (n, x, y) => { S.bp += n; ft.push({ s: `+${fmt(n)} BP`, x, y: y - 30, life: 1.3, col: "#ffe27a" }); save(); };

  function setLevel(lv) {
    S.lvl = lv; p.hp = LEVELS[lv].hp; p.energy = Math.max(p.energy, 70);
    if (S.bpLevel !== lv) { 
        S.bpLevel = lv; S.bp = 0; 
        say(`¡${txt().lvl} ${lv + 1} - ${o.name(lv)}!`, "good"); 
        burst(p.x, p.y, "#fff", 25); save(); 
        showDietOverlay = true; 
    }
  }

  const zoneAt = (x, y) => {
    let found = 0;
    for(let i=0; i<ZONES.length; i++) if (x >= ZONES[i].x && x < ZONES[i].x + ZONES[i].w && y >= ZONES[i].y && y < ZONES[i].y + ZONES[i].h) found = i;
    return found;
  };
  
  const blocking = (x, y, r) => ALL_GATES.find((g) => S.lvl < g.min && x + r > g.x && x - r < g.x + g.w && y + r > g.y && y - r < g.y + g.h);

  function step(dt) {
    time += dt;
    const currentEvolutionLevel = o.getLevel(); 
    if (currentEvolutionLevel !== S.lvl) setLevel(currentEvolutionLevel);

    const st = LEVELS[S.lvl], r = st.size * 0.5, d = input.dir();
    
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
    p.y = Math.min(WORLD.h - r, Math.max(20, p.y));
    
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 8) { 
      let da = Math.atan2(p.vy, p.vx) - p.a; 
      p.a += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, dt * 6); 
      if (Math.random() < dt * 4) audio.sfx.swim(); 
    }
    
    if (isDashing && spd > 40 && Math.random() < dt * 25) fx.push({ x: p.x - Math.cos(p.a) * st.size, y: p.y - Math.sin(p.a) * st.size, vx: -p.vx * 0.2, vy: -10, life: 0.6, col: "rgba(255,255,255,.8)", r: 2 + Math.random() * 2, b: 1 });

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
        say(txt().big, "warn"); c.hit = 0.4; 
        if (p.inv <= 0) { p.inv = 1; p.hp -= (df.dm || 5); p.shake = 0.4; audio.sfx.hurt(); p.vx = -Math.cos(p.a) * 350; p.vy = -Math.sin(p.a) * 350; burst(p.x, p.y, "#ff3333", 10, true); }
      } else if (df.dm && dist < (df.s + st.size) * 0.4 && (df.r > st.power || df.b === "ignore") && p.inv <= 0) {
        p.inv = 1; p.hp -= df.dm; p.shake = 0.4; audio.sfx.hurt(); p.vx += Math.sign(p.x - c.x || 1) * 350; burst(p.x, p.y, "#ff3333", 10, true);
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
    hud.zone.textContent = `📍 ${ZONES[p.zone]?.n[o.lang() === "es" ? 1 : 0] || ""}`;
    hud.hp.style.width = `${Math.max(0, (p.hp / st.hp) * 100)}%`; hud.en.style.width = `${p.energy}%`; back.textContent = txt().back;
  }

  function drawDietOverlay(ctx, power) {
    if (!showDietOverlay) return;
    
    const panelW = Math.min(420, vw * 0.85);
    const panelH = Math.min(480, vh * 0.8);
    const px = vw / 2 - panelW / 2;
    const py = vh / 2 - panelH / 2;
    
    ctx.save();
    ctx.fillStyle = "rgba(8, 24, 40, 0.95)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)"; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 20); ctx.fill();
    
    ctx.strokeStyle = "rgba(125, 226, 255, 0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
    
    ctx.fillStyle = "#7de2ff"; ctx.textAlign = "center"; ctx.font = "bold 18px system-ui";
    ctx.fillText(txt().diet, vw / 2, py + 40);
    
    ctx.fillStyle = "#8aabcc"; ctx.font = "12px system-ui";
    ctx.fillText(o.lang() === "es" ? "Haz clic en cualquier parte para comenzar a cazar" : "Click anywhere to start hunting", vw / 2, py + 65);
    
    const edibleCreatures = CREATURES.filter(c => c.r <= power);
    const uniqueMap = new Map();
    edibleCreatures.forEach(c => {
      const name = c.name[o.lang() === "es" ? 1 : 0];
      if (!uniqueMap.has(name)) uniqueMap.set(name, c);
    });
    const items = Array.from(uniqueMap.values());
    
    let startY = py + 95;
    const itemH = 46;
    
    items.slice(0, 7).forEach((c, i) => {
      const iy = startY + i * itemH;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.beginPath(); ctx.roundRect(px + 24, iy, panelW - 48, 38, 10); ctx.fill();
      
      ctx.save();
      ctx.translate(px + 50, iy + 19);
      if (c.id.includes("crab")) BestiaryIcons.drawMiniCrab(ctx);
      else if (c.id.includes("eel") || c.id.includes("snake")) BestiaryIcons.drawMiniEel(ctx);
      else if (c.id.includes("ray")) BestiaryIcons.drawMiniRay(ctx);
      else BestiaryIcons.drawMiniFish(ctx, "#29b6f6", "#0288d1");
      ctx.restore();
      
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.font = "14px system-ui";
      ctx.fillText(c.name[o.lang() === "es" ? 1 : 0], px + 85, iy + 24);
      
      ctx.fillStyle = "#ffd27a"; ctx.textAlign = "right"; ctx.font = "bold 12px system-ui";
      ctx.fillText(`+${c.bp} BP`, px + panelW - 40, iy + 24);
    });
    
    ctx.restore();
  }

  function draw() {
    const st = LEVELS[S.lvl], sh = p.shake ? (Math.random() - 0.5) * 12 : 0, H = WORLD.h;
    const vwp = vw / camScale, vhp = vh / camScale;
    
    const cx = Math.min(WORLD.w - vwp, Math.max(0, p.x - vwp / 2)) + sh;
    const cy = Math.min(H - vhp, Math.max(0, p.y - vhp / 2));

    ctx.imageSmoothingEnabled = false;

    ctx.save(); ctx.clearRect(0, 0, vw, vh); ctx.scale(camScale, camScale); 

    if (cy < 0) {
      const sky = ctx.createLinearGradient(0, -cy, 0, 0);
      sky.addColorStop(0, "#ffcf87"); sky.addColorStop(1, "#87ceeb");
      ctx.fillStyle = sky; ctx.fillRect(0, -cy, vwp, -cy * 2);
      ctx.fillStyle = "#e3ce98"; ctx.beginPath(); ctx.moveTo(0, 0);
      for(let x=0; x<=vwp; x+=50) ctx.lineTo(x, -20 + Math.sin(x*0.01 + cx*0.01)*15);
      ctx.lineTo(vwp, 0); ctx.fill();
    }

    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vwp || z.y + z.h < cy || z.y > cy + vhp) return;
      const g = ctx.createLinearGradient(0, z.y - cy, 0, z.y + z.h - cy); 
      g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, Math.max(0, z.y - cy), z.w + 1, z.h + 1);
    });
    
    if (cy < 100) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.moveTo(0, -cy);
      for(let x = 0; x <= vwp + 20; x += 30) ctx.lineTo(x, -cy + Math.sin(time * 3 + x * 0.05 + cx*0.01) * 8);
      ctx.lineTo(vwp, -cy); ctx.lineTo(vwp, Math.max(0, -cy)); ctx.lineTo(0, Math.max(0, -cy)); ctx.fill();
    }

    ctx.save(); ctx.translate(-cx, -cy);
    
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vwp + 300 || c.y < cy - 300 || c.y > cy + vhp + 300) return;
      const df = c.def;
      ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + c.t * 3) * 2);
      
      const movingRight = Math.cos(c.a) >= 0;
      const flip = movingRight ? 1 : -1;
      ctx.scale(flip, 1); 
      
      ctx.globalAlpha = c.hit > 0 ? 0.5 : 1;
      
      if (!AssetManager.drawSprite(ctx, df.id, 0, 0, df.s * 2, df.s * 2, time, 4, 8)) {
         if (df.id.includes("ray")) Graphics.drawRay(ctx, df.s, time);
         else if (df.id.includes("eel") || df.id.includes("snake")) Graphics.drawEel(ctx, df.s, time, df.dm);
         else if (df.id.includes("crab")) Graphics.drawCrab(ctx, df.s, time);
         else if (df.id.includes("golem") || df.id.includes("construct")) Graphics.drawGolem(ctx, df.s, time);
         else Graphics.drawFish(ctx, df.s, time, df.dm ? "#d32f2f" : "#29b6f6", df.dm ? "#b71c1c" : "#0288d1");
      }
      ctx.restore();
    });

    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); 
    ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    
    const spriteId = p.biteT > 0 ? `player_bite_lvl${S.lvl}` : `player_swim_lvl${S.lvl}`;
    const frameCount = p.biteT > 0 ? 2 : 4; 
    
    if (!AssetManager.drawSprite(ctx, spriteId, 0, 0, st.size * 3, st.size * 1.5, time, frameCount, 10)) {
        if (S.lvl === 0) exactEgg(st.size); 
        else exactShark(st.size, SHARK_COLORS[S.lvl], Math.sin(time * 9) * st.size);
    }
    ctx.restore();

    for (let i = fx.length - 1; i >= 0; i -= 1) { 
      const f = fx[i]; f.x += f.vx * 0.016; f.y += f.vy * 0.016; f.life -= 0.016; 
      ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
    }
    
    ctx.globalAlpha = 1; ctx.restore();
    
    const dep = Math.min(1, (cy + vhp / 2) / H); ctx.fillStyle = `rgba(0,10,30,${dep * 0.35})`; ctx.fillRect(0, 0, vwp, vhp); 
    if (darkV > 0.02) { 
      const px = p.x - cx, py = p.y - cy, g = ctx.createRadialGradient(px, py, 120 / camScale, px, py, 650 / camScale); 
      g.addColorStop(0, "rgba(0,0,10,0)"); g.addColorStop(1, `rgba(0,0,10,${darkV})`); ctx.fillStyle = g; ctx.fillRect(0, 0, vwp, vhp); 
    }
    ctx.restore(); 
    
    drawDietOverlay(ctx, st.power);
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
    
    const startZone = ZONES[0];
    p = { 
      x: startZone.x + startZone.w / 2, 
      y: startZone.y + startZone.h / 2, 
      vx: 0, vy: 0, a: 0, 
      hp: LEVELS[lv].hp, 
      energy: 80, 
      inv: 0, 
      biteT: 0, 
      shake: 0, 
      zone: 0 
    };

    camScale = 60 / Math.max(60, LEVELS[lv].size * 0.8);
    showDietOverlay = true;

    input = createInput(canvas, joy, biteBtn); 
    audio = createAudio(o.volume);
    
    canvas.addEventListener("pointerdown", () => {
      if (showDietOverlay) showDietOverlay = false;
    });

    view.hidden = false; resize(); window.addEventListener("resize", resize);
    requestAnimationFrame(() => view.classList.add("is-open")); 
    running = true; last = performance.now(); raf = requestAnimationFrame(loop); 
    say(txt().hint);
  }

  function close() {
    if (!running) return; running = false; cancelAnimationFrame(raf); clearTimeout(saveT);
    o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones });
    input.destroy(); audio.stop(); window.removeEventListener("resize", resize); view.classList.remove("is-open");
    setTimeout(() => { if (!running) view.hidden = true; }, 500);
  }

  back.addEventListener("click", close);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return { open, close, resize };
}