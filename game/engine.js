/* Motor del minijuego (Beta 4.4 - Fase 0: rescate jugable)
   Cambios principales respecto a 4.3:
   - Tiburón centrado, a escala del hitbox y con cola/ojo en su sitio. Marcador rojo eliminado (F2 = modo debug).
   - Partículas y textos flotantes actualizados con dt y eliminados al morir (con tope).
   - Se dibujan decoración, tesoros y puntos de interés. Zonas bloqueadas visibles.
   - Bloqueo de niveles por ZONA (sin huecos). Mapa completo.
   - Pantalla de dieta: pausa el juego y se cierra con cualquier tecla/toque.
   - Todos los listeners de la partida se sueltan con un AbortController.
   - HUD solo toca el DOM cuando cambia un valor. */
import { BP, WORLD, LEVELS, SHARK_COLORS, ZONES, POIS, TREASURES, TREASURE_PER_ZONE, CREATURES, TEXT, SAVE_VERSION } from "./data.js";
import { createInput, createAudio, spawn, updateCreature } from "./systems.js";

const rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TREASURE_ICON = { coin: "🪙", gem: "💎", chest: "🏴‍☠️", relic: "🔱" };
const FX_MAX = 400; // tope de partículas simultáneas
const FT_MAX = 40;  // tope de textos flotantes

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

/* Huevo: elipse a escala del hitbox (radio = size/2). */
function exactEgg(ctx, s) {
  ctx.fillStyle = "#f5e6c8";
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2c99a";
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.stroke();
  ctx.fillStyle = "#e2c99a";
  ctx.beginPath(); ctx.arc(-s * 0.18, -s * 0.15, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.2, s * 0.22, s * 0.13, 0, Math.PI * 2); ctx.fill();
}

/* Tiburón: la ruta SVG mide ~210 x 106 unidades (cuerpo de x=4 a x=214).
   Se centra en (109, 53) y se escala a 2 x size de largo: el hocico queda a ~size del centro
   (coincide con el punto de mordida del motor) y el hitbox (size/2) cae dentro del cuerpo.
   `wag` es el ángulo de la cola en radianes. */
function exactShark(ctx, s, color, wag) {
  const k = (s * 2) / 210;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(-109, -53);

  // cola: pivota sobre su punto de unión con el cuerpo (40, 55)
  ctx.save();
  ctx.translate(40, 55);
  ctx.rotate(wag);
  ctx.translate(-40, -55);
  ctx.fillStyle = color;
  ctx.fill(PetPaths.tail);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.fill(PetPaths.body);

  ctx.fillStyle = "#eaf6ff";
  ctx.fill(PetPaths.belly);

  ctx.fillStyle = color;
  ctx.fill(PetPaths.finTop);
  ctx.fill(PetPaths.finBottom);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fill(PetPaths.finBottom);

  ctx.strokeStyle = "rgba(11, 27, 51, 0.25)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke(PetPaths.gills);

  // ojo: misma posición que el SVG del acuario (180, 52)
  ctx.fillStyle = "#0b1b33";
  ctx.beginPath();
  ctx.arc(180, 52, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(181.5, 50.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

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

/* Decoración de fondo (semitransparente, anclada por la base en (0,0)). */
const DecorArt = {
  weed(ctx, d, t) {
    const h = d.s * 1.6, sway = Math.sin(t * 1.2 + d.h * 10) * d.s * 0.2;
    ctx.strokeStyle = "rgba(40,150,95,.55)"; ctx.lineWidth = Math.max(3, d.s * 0.08); ctx.lineCap = "round";
    for (let i = -1; i <= 1; i += 1) {
      const bx = i * d.s * 0.22;
      ctx.beginPath(); ctx.moveTo(bx, 0);
      ctx.quadraticCurveTo(bx + sway, -h * 0.5, bx + sway * 1.6, -h * (0.8 + 0.1 * i)); ctx.stroke();
    }
  },
  coral(ctx, d, t) {
    const hue = 330 + d.h * 60;
    ctx.fillStyle = `hsla(${hue},70%,62%,.6)`;
    const w = Math.max(5, d.s * 0.14);
    [[-0.3, 0.9], [0, 1.25], [0.3, 0.8]].forEach(([ox, hh]) => {
      ctx.fillRect(ox * d.s - w / 2, -hh * d.s, w, hh * d.s);
      ctx.beginPath(); ctx.arc(ox * d.s, -hh * d.s, w * 0.9 + Math.sin(t + d.h * 9) * 1.2, 0, 6.3); ctx.fill();
    });
  },
  hull(ctx, d) {
    const s = d.s;
    ctx.fillStyle = "rgba(60,46,38,.62)";
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.25); ctx.lineTo(s, -s * 0.25); ctx.lineTo(s * 0.7, s * 0.1); ctx.lineTo(-s * 0.7, s * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillRect(-s * 0.05, -s * 1.0, s * 0.1, s * 0.75);
    ctx.fillStyle = "rgba(90,70,55,.5)"; ctx.fillRect(-s * 0.45, -s * 0.95, s * 0.9, s * 0.35);
  },
  glow(ctx, d, t) {
    const r = d.s * 1.2, a = 0.35 + Math.sin(t * 1.5 + d.h * 12) * 0.15;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(120,255,230,${a})`); g.addColorStop(1, "rgba(120,255,230,0)");
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
  },
  column(ctx, d) {
    const s = d.s;
    ctx.fillStyle = "rgba(120,190,205,.38)";
    ctx.fillRect(-s * 0.18, -s * 1.4, s * 0.36, s * 1.4);
    ctx.fillStyle = "rgba(150,215,225,.45)";
    ctx.fillRect(-s * 0.32, -s * 1.5, s * 0.64, s * 0.12);
    ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.1);
  }
};

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildWorld() {
  const r = rng(7), decor = [], treasures = TREASURES.map((t) => ({ ...t })), creatures = [];
  ZONES.forEach((z, zi) => {
    const count = Math.round((z.w * z.h / 1000000) * 15);
    const floating = z.d === "glow";
    for (let i = 0; i < count; i += 1) {
      // lo "anclado" se concentra en la parte baja de la zona; el brillo flota libremente
      const y = floating ? z.y + r() * z.h : z.y + z.h * (0.55 + r() * 0.45);
      decor.push({ x: z.x + r() * z.w, y, s: 30 + r() * 80, k: z.d, h: r(), zi });
    }
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
  
  let S, p, input, audio, ac = null, raf = 0, last = 0, running = false, vw = 0, vh = 0, time = 0, saveT = 0, darkV = 0, bannerT = 0, lastBanner = "", gateCd = 0, errT = 0;
  let camScale = 1; 
  let showDietOverlay = true;
  let debug = false;
  const hudCache = {};

  const fx = [], ft = [], txt = () => TEXT[o.lang()] || TEXT.en, fmt = (n) => Math.round(n).toLocaleString(o.lang() === "es" ? "es-BO" : "en-US");
  const L = (pair) => pair[o.lang() === "es" ? 1 : 0];
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones }), 1200); };

  function say(msg, cls = "") {
    if (msg === lastBanner && performance.now() - bannerT < 900) return;
    lastBanner = msg; bannerT = performance.now(); banner.textContent = msg; banner.className = `game-banner show ${cls}`;
    clearTimeout(say.t); say.t = setTimeout(() => { banner.className = "game-banner"; }, 1900);
  }

  const burst = (x, y, col, n = 8, isBlood = false) => { 
    for (let i = 0; i < n && fx.length < FX_MAX; i += 1) fx.push({ x, y, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, life: 0.8, max: 0.8, col, r: (isBlood ? 3 : 2) + Math.random() * 4 }); 
  };
  const addBp = (n, x, y) => {
    S.bp += n;
    if (ft.length < FT_MAX) ft.push({ s: `+${fmt(n)} BP`, x, y: y - 30, life: 1.3, col: "#ffe27a" });
    save();
  };

  function setLevel(lv) {
    S.lvl = lv; p.hp = LEVELS[lv].hp; p.energy = Math.max(p.energy, 70);
    if (S.bpLevel !== lv) { 
      S.bpLevel = lv; S.bp = 0; 
      say(o.lang() === "es" ? `¡${txt().lvl} ${lv + 1} - ${o.name(lv)}!` : `${txt().lvl} ${lv + 1} - ${o.name(lv)}!`, "good"); 
      burst(p.x, p.y, "#fff", 25); save(); 
      showDietOverlay = true; 
    }
  }

  /* Zona que contiene el punto, o -1 si está fuera del mundo. Las zonas forman una partición completa. */
  const zoneIdx = (x, y) => {
    for (let i = 0; i < ZONES.length; i += 1) {
      const z = ZONES[i];
      if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return i;
    }
    return -1;
  };
  const zoneAt = (x, y) => Math.max(0, zoneIdx(x, y));

  /* Una zona con `min` > nivel es infranqueable. Se comprueba el centro y 4 puntos del contorno del jugador. */
  const blocking = (x, y, r) => {
    const pts = [[x, y], [x + r, y], [x - r, y], [x, y + r], [x, y - r]];
    for (let i = 0; i < pts.length; i += 1) {
      const zi = zoneIdx(pts[i][0], pts[i][1]);
      if (zi >= 0 && ZONES[zi].min > S.lvl) return ZONES[zi];
    }
    return null;
  };

  function step(dt) {
    time += dt;
    const currentEvolutionLevel = o.getLevel(); 
    if (currentEvolutionLevel !== S.lvl) setLevel(currentEvolutionLevel);

    const st = LEVELS[S.lvl], r = st.size * 0.5, d = input.dir();

    // Seguridad: si por cualquier motivo el jugador quedó dentro de una zona bloqueada, vuelve al inicio
    if (blocking(p.x, p.y, r)) { p.x = ZONES[0].x + ZONES[0].w / 2; p.y = ZONES[0].y + ZONES[0].h / 2; p.vx = 0; p.vy = 0; }
    
    const a = Math.min(1, dt * (S.lvl === 0 ? 8 : 4));
    const isDashing = input.dash() && p.energy > 0;
    const speedMult = isDashing ? 1.8 : 1;
    
    camScale += ((60 / Math.max(60, st.size * 0.8)) - camScale) * dt * 2;

    p.vx += (d.x * st.speed * speedMult - p.vx) * a; 
    p.vy += (d.y * st.speed * speedMult - p.vy) * a;
    
    for (const ax of ["x", "y"]) {
      const nx = ax === "x" ? p.x + p.vx * dt : p.x, ny = ax === "y" ? p.y + p.vy * dt : p.y, g = blocking(nx, ny, r);
      if (g) { 
        if (gateCd <= 0) { say(txt()[g.gate] || txt().door, "warn"); gateCd = 1.6; } 
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
    
    if (isDashing && spd > 40 && Math.random() < dt * 25 && fx.length < FX_MAX) fx.push({ x: p.x - Math.cos(p.a) * st.size, y: p.y - Math.sin(p.a) * st.size, vx: -p.vx * 0.2, vy: -10, life: 0.6, max: 0.6, col: "rgba(255,255,255,.8)", r: 2 + Math.random() * 2 });

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
      S.found[q.id] = 1; audio.sfx.zone(); addBp(BP.poi, p.x, p.y); say(`${txt().disc}   ${L(q.n)}`, "good");
    });

    const zi = zoneAt(p.x, p.y);
    if (zi !== p.zone) {
      p.zone = zi; audio.ambience(zi);
      if (zi && !S.zones[zi]) { S.zones[zi] = 1; audio.sfx.zone(); addBp(BP.zone, p.x, p.y); say(`${txt().disc}   ${L(ZONES[zi].n)}`, "good"); }
    }
    
    if (p.hp <= 0) { say(txt().died, "warn"); burst(p.x, p.y, "#ff3333", 30, true); Object.assign(p, { x: 300, y: 200, vx: 0, vy: 0, hp: st.hp, energy: 60, inv: 3 }); }
    darkV += ((ZONES[zi].dark || 0) - darkV) * Math.min(1, dt);

    // Partículas y textos flotantes: se mueven con dt y se eliminan al terminar su vida
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      const f = fx[i];
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
      if (f.life <= 0) { fx[i] = fx[fx.length - 1]; fx.pop(); }
    }
    for (let i = ft.length - 1; i >= 0; i -= 1) {
      const f = ft[i];
      f.y -= 40 * dt; f.life -= dt;
      if (f.life <= 0) ft.splice(i, 1);
    }

    renderHud(st);
  }

  // Solo escribe en el DOM cuando el valor cambia
  const setText = (el, key, val) => { if (hudCache[key] !== val) { hudCache[key] = val; el.textContent = val; } };
  const setWidth = (el, key, pct) => { const v = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`; if (hudCache[key] !== v) { hudCache[key] = v; el.style.width = v; } };

  function renderHud(st) {
    setText(hud.lvl, "lvl", `  ${txt().lvl} ${S.lvl + 1} — ${o.name(S.lvl)}`);
    setText(hud.bp, "bp", `🟡 ${txt().bp}: ${fmt(S.bp)}`);
    setText(hud.zone, "zone", `📍 ${ZONES[p.zone] ? L(ZONES[p.zone].n) : ""}`);
    setWidth(hud.hp, "hp", (p.hp / st.hp) * 100);
    setWidth(hud.en, "en", p.energy);
  }

  function drawDietOverlay(ctx, power) {
    if (!showDietOverlay) return;
    
    const es = o.lang() === "es";
    const panelW = Math.min(420, vw * 0.85);
    const panelH = Math.min(480, vh * 0.8);
    const px = vw / 2 - panelW / 2;
    const py = vh / 2 - panelH / 2;
    
    ctx.save();
    ctx.fillStyle = "rgba(8, 24, 40, 0.95)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)"; ctx.shadowBlur = 25;
    roundRectPath(ctx, px, py, panelW, panelH, 20); ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = "rgba(125, 226, 255, 0.3)"; ctx.lineWidth = 1.5; ctx.stroke();
    
    ctx.fillStyle = "#7de2ff"; ctx.textAlign = "center"; ctx.font = "bold 16px system-ui";
    ctx.fillText(txt().diet, vw / 2, py + 38);
    
    ctx.fillStyle = "#8aabcc"; ctx.font = "12px system-ui";
    ctx.fillText(txt().start, vw / 2, py + 62);
    
    // Presas más relevantes para el nivel actual: las de mayor rango primero (antes mostraba solo las 7 más fáciles)
    const uniqueMap = new Map();
    CREATURES.filter((c) => c.r <= power).forEach((c) => {
      const name = c.name[es ? 1 : 0];
      if (!uniqueMap.has(name)) uniqueMap.set(name, c);
    });
    const itemH = 46;
    const startY = py + 84;
    const maxItems = Math.max(1, Math.min(7, Math.floor((panelH - 100) / itemH)));
    const items = Array.from(uniqueMap.values()).sort((a, b) => (b.r - a.r) || (b.bp - a.bp)).slice(0, maxItems);
    
    items.forEach((c, i) => {
      const iy = startY + i * itemH;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      roundRectPath(ctx, px + 24, iy, panelW - 48, 38, 10); ctx.fill();
      
      ctx.save();
      ctx.translate(px + 50, iy + 19);
      if (c.id.includes("crab")) BestiaryIcons.drawMiniCrab(ctx);
      else if (c.id.includes("eel") || c.id.includes("snake")) BestiaryIcons.drawMiniEel(ctx);
      else if (c.id.includes("ray")) BestiaryIcons.drawMiniRay(ctx);
      else BestiaryIcons.drawMiniFish(ctx, "#29b6f6", "#0288d1");
      ctx.restore();
      
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.font = "14px system-ui";
      ctx.fillText(c.name[es ? 1 : 0], px + 85, iy + 24);
      
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

    // Fondo por zonas (las zonas cubren todo el mundo)
    ZONES.forEach((z) => {
      if (z.x + z.w < cx || z.x > cx + vwp || z.y + z.h < cy || z.y > cy + vhp) return;
      const g = ctx.createLinearGradient(0, z.y - cy, 0, z.y + z.h - cy); 
      g.addColorStop(0, z.c[0]); g.addColorStop(1, z.c[1]);
      ctx.fillStyle = g; ctx.fillRect(z.x - cx, z.y - cy, z.w + 1, z.h + 1);
    });
    
    // Ondas de superficie
    if (cy < 100) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.moveTo(0, -cy);
      for(let x = 0; x <= vwp + 20; x += 30) ctx.lineTo(x, -cy + Math.sin(time * 3 + x * 0.05 + cx*0.01) * 8);
      ctx.lineTo(vwp, -cy); ctx.lineTo(vwp, Math.max(0, -cy)); ctx.lineTo(0, Math.max(0, -cy)); ctx.fill();
    }

    ctx.save(); ctx.translate(-cx, -cy);

    // Decoración
    for (let i = 0; i < world.decor.length; i += 1) {
      const dc = world.decor[i];
      if (dc.x < cx - 200 || dc.x > cx + vwp + 200 || dc.y < cy - 200 || dc.y > cy + vhp + 200) continue;
      const art = DecorArt[dc.k];
      if (!art) continue;
      ctx.save(); ctx.translate(dc.x, dc.y); art(ctx, dc, time); ctx.restore();
    }

    // Zonas bloqueadas: velo oscuro + borde discontinuo + candado
    ZONES.forEach((z) => {
      if (z.min <= S.lvl) return;
      if (z.x + z.w < cx || z.x > cx + vwp || z.y + z.h < cy || z.y > cy + vhp) return;
      ctx.fillStyle = "rgba(4, 10, 28, 0.5)"; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = "rgba(255, 120, 140, 0.55)"; ctx.lineWidth = 6 / camScale; ctx.setLineDash([30 / camScale, 20 / camScale]);
      ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.setLineDash([]);
      const lx = Math.min(Math.max(p.x, z.x + 120), z.x + z.w - 120), ly = Math.min(Math.max(p.y, z.y + 120), z.y + z.h - 120);
      ctx.font = `${28 / camScale}px system-ui`; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillText(`🔒 ${txt().lvl} ${z.min + 1}`, lx, ly);
    });

    // Puntos de interés sin descubrir: anillo discreto
    POIS.forEach((q) => {
      if (S.found[q.id] || q.x < cx - q.r || q.x > cx + vwp + q.r || q.y < cy - q.r || q.y > cy + vhp + q.r) return;
      ctx.strokeStyle = `rgba(255, 240, 160, ${0.25 + Math.sin(time * 2) * 0.1})`; ctx.lineWidth = 4 / camScale;
      ctx.setLineDash([16 / camScale, 14 / camScale]); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
    });

    // Tesoros sin recoger: icono con brillo
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    world.treasures.forEach((t) => {
      if (S.found[t.id] || t.x < cx - 60 || t.x > cx + vwp + 60 || t.y < cy - 60 || t.y > cy + vhp + 60) return;
      const sz = Math.max(26, 18 / camScale), bob = Math.sin(time * 2.5 + t.x) * 3;
      const gl = ctx.createRadialGradient(t.x, t.y + bob, 0, t.x, t.y + bob, sz * 1.1);
      gl.addColorStop(0, "rgba(255,240,150,.5)"); gl.addColorStop(1, "rgba(255,240,150,0)");
      ctx.fillStyle = gl; ctx.fillRect(t.x - sz * 1.1, t.y + bob - sz * 1.1, sz * 2.2, sz * 2.2);
      ctx.font = `${sz}px system-ui`; ctx.fillStyle = "#fff"; ctx.fillText(TREASURE_ICON[t.k], t.x, t.y + bob);
    });
    ctx.textBaseline = "alphabetic";
    
    // Criaturas
    world.creatures.forEach((c) => {
      if (c.dead > 0 || c.x < cx - 300 || c.x > cx + vwp + 300 || c.y < cy - 300 || c.y > cy + vhp + 300) return;
      const df = c.def;
      const dxp = c.x - p.x, dyp = c.y - p.y;
      ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 2 + c.ph) * 2);

      // Aro de ayuda cercano: verde = comestible, rojo = peligroso
      if (dxp * dxp + dyp * dyp < 640000) {
        const edibleNow = df.r <= st.power;
        if (edibleNow || df.dm || df.b === "chase" || df.b === "guard") {
          ctx.strokeStyle = edibleNow ? "rgba(120,255,160,.55)" : "rgba(255,90,90,.6)";
          ctx.lineWidth = 2 / camScale; ctx.beginPath(); ctx.arc(0, 0, df.s * 0.75, 0, 6.3); ctx.stroke();
        }
      }
      
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

    // Jugador (el huevo no rota; el tiburón rota hacia su rumbo y se voltea para no quedar boca abajo)
    ctx.save(); ctx.translate(p.x, p.y);
    if (S.lvl > 0) { ctx.rotate(p.a); if (Math.cos(p.a) < 0) ctx.scale(1, -1); }
    ctx.globalAlpha = p.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 1;
    
    const spriteId = p.biteT > 0 ? `player_bite_lvl${S.lvl}` : `player_swim_lvl${S.lvl}`;
    const frameCount = p.biteT > 0 ? 2 : 4; 
    
    if (!AssetManager.drawSprite(ctx, spriteId, 0, 0, st.size * 3, st.size * 1.5, time, frameCount, 10)) {
        if (S.lvl === 0) exactEgg(ctx, st.size); 
        else exactShark(ctx, st.size, SHARK_COLORS[S.lvl], Math.sin(time * 9) * 0.28);
    }
    ctx.restore();

    // Modo debug (F2): hitbox y punto de mordida
    if (debug) {
      ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = 2 / camScale;
      ctx.beginPath(); ctx.arc(p.x, p.y, st.size * 0.5, 0, 6.3); ctx.stroke();
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath(); ctx.arc(p.x + Math.cos(p.a) * st.size * 0.95, p.y + Math.sin(p.a) * st.size * 0.95, 4 / camScale, 0, 6.3); ctx.fill();
    }

    // Partículas (solo se dibujan; se actualizan en step)
    for (let i = 0; i < fx.length; i += 1) { 
      const f = fx[i];
      ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.3); ctx.fill();
    }

    // Textos flotantes (+BP)
    ctx.textAlign = "center"; ctx.font = `bold ${17 / camScale}px system-ui`;
    for (let i = 0; i < ft.length; i += 1) {
      const f = ft[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life)); ctx.fillStyle = f.col; ctx.fillText(f.s, f.x, f.y);
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
    const dpr = window.devicePixelRatio || 1; 
    vw = canvas.clientWidth || window.innerWidth; 
    vh = canvas.clientHeight || window.innerHeight;
    canvas.width = vw * dpr; 
    canvas.height = vh * dpr; 
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(ts) { 
    if (!running) return; 
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); 
    last = ts; 
    try {
      if (showDietOverlay) { time += dt; renderHud(LEVELS[S.lvl]); } // pausado mientras se lee la guía
      else step(dt);
      draw();
    } catch (e) {
      const now = performance.now();
      if (now - errT > 2000) { errT = now; console.error("❌ Error en el bucle del juego:", e); }
    }
    raf = requestAnimationFrame(loop); 
  }

  function open() {
    if (running) return;
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
    fx.length = 0; ft.length = 0;
    for (const k in hudCache) delete hudCache[k];
    gateCd = 0; darkV = 0; time = 0;

    // Un único AbortController por partida: al cerrar se sueltan TODOS los listeners
    ac = new AbortController();
    const signal = ac.signal;

    input = createInput(canvas, joy, biteBtn, signal); 
    audio = createAudio(o.volume);
    audio.unlock();

    const dismissOverlay = () => { if (showDietOverlay) { showDietOverlay = false; input.takeBite(); } };
    view.addEventListener("pointerdown", dismissOverlay, { signal });
    window.addEventListener("keydown", (e) => {
      if (e.code === "F2") { debug = !debug; return; }
      if (["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code) || e.key === "Escape") return;
      dismissOverlay();
    }, { signal });
    window.addEventListener("resize", resize, { signal });

    view.hidden = false; 
    requestAnimationFrame(() => {
      resize();
      view.classList.add("is-open");
    });
    
    back.textContent = txt().back;
    running = true; last = performance.now(); raf = requestAnimationFrame(loop); 
    say(txt().hint);
  }

  function close() {
    if (!running) return; running = false; cancelAnimationFrame(raf); clearTimeout(saveT);
    o.save({ v: SAVE_VERSION, bpLevel: S.bpLevel, bp: S.bp, found: S.found, zones: S.zones });
    if (ac) { ac.abort(); ac = null; }
    input.destroy(); audio.stop(); view.classList.remove("is-open");
    setTimeout(() => { if (!running) view.hidden = true; }, 500);
  }

  back.addEventListener("click", close);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return { open, close, resize };
}