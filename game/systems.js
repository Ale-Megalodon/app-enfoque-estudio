/* Entrada, Audio Procedural e IA de Criaturas - Beta 3.2 (Superficie y Profundidad Estricta) */
import { CREATURES, ZONES, WORLD } from "./data.js";

export function createInput(canvas, joyEl, biteEl, dashEl) {
  const keys = new Set();
  let joy = { x: 0, y: 0 };
  let bite = false;
  let isDashing = false;

  const map = { arrowleft: "a", arrowright: "d", arrowup: "w", arrowdown: "s", shift: "shift" };

  const down = (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") { bite = true; e.preventDefault(); }
    keys.add(map[k] || k);
  };

  const up = (e) => keys.delete(map[e.key.toLowerCase()] || e.key.toLowerCase());

  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  
  canvas.addEventListener("pointerdown", () => { bite = true; });
  
  biteEl?.addEventListener("pointerdown", (e) => { e.stopPropagation(); bite = true; });
  dashEl?.addEventListener("pointerdown", (e) => { e.stopPropagation(); isDashing = true; });
  dashEl?.addEventListener("pointerup", (e) => { e.stopPropagation(); isDashing = false; });
  dashEl?.addEventListener("pointerleave", (e) => { e.stopPropagation(); isDashing = false; });

  joyEl?.addEventListener("pointermove", (e) => {
    if (!(e.buttons || e.pointerType === "touch")) return;
    const r = joyEl.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2;
    const dy = e.clientY - r.top - r.height / 2;
    const m = Math.hypot(dx, dy) || 1;
    joy = { x: dx / Math.max(m, r.width / 3), y: dy / Math.max(m, r.width / 3) };
  });

  const reset = () => { joy = { x: 0, y: 0 }; };
  joyEl?.addEventListener("pointerup", reset);
  joyEl?.addEventListener("pointerleave", reset);

  return {
    dir() {
      let x = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + joy.x;
      let y = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + joy.y;
      const m = Math.hypot(x, y);
      return m > 1 ? { x: x / m, y: y / m } : { x, y };
    },
    takeBite() {
      const b = bite;
      bite = false;
      return b;
    },
    dash() {
      return keys.has("shift") || isDashing;
    },
    destroy() {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    }
  };
}

export function createAudio(getVolume) {
  let ctx = null, drone = null, gain = null;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  const vol = () => Math.min(1, getVolume() / 100);

  function tone(f, d = 0.15, type = "sine", v = 0.15, slide = 0) {
    if (vol() <= 0) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), c.currentTime + d);
      g.gain.setValueAtTime(v * vol(), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d);
    } catch (_) {}
  }

  return {
    sfx: {
      swim: () => tone(180, 0.1, "sine", 0.03, -60),
      eat: () => tone(420, 0.12, "triangle", 0.18, 260),
      bite: () => tone(160, 0.1, "sawtooth", 0.08, -60),
      hurt: () => tone(120, 0.3, "square", 0.15, -70),
      treasure: () => { tone(880, 0.15, "sine", 0.15); setTimeout(() => tone(1320, 0.25, "sine", 0.15), 110); },
      zone: () => { tone(330, 0.4, "sine", 0.12, 200); setTimeout(() => tone(495, 0.5, "sine", 0.12, 300), 200); }
    },
    ambience(zone) {
      if (vol() <= 0) return;
      try {
        const c = ac();
        if (!drone) {
          drone = c.createOscillator(); gain = c.createGain();
          drone.type = "sine"; drone.connect(gain); gain.connect(c.destination); drone.start();
        }
        const zDef = ZONES[zone];
        const freq = zDef ? zDef.m : 100;
        drone.frequency.setTargetAtTime(freq, c.currentTime, 1.5);
        gain.gain.setTargetAtTime(0.05 * vol(), c.currentTime, 0.5);
      } catch (_) {}
    },
    stop() {
      try { gain?.gain.setTargetAtTime(0, ctx.currentTime, 0.2); drone?.stop(ctx.currentTime + 1); } catch (_) {}
      drone = null;
    }
  };
}

export const speciesById = Object.fromEntries(CREATURES.map((c) => [c.id, c]));

export function spawn(def, zone, rnd) {
  // Asegura que las criaturas de fondo (ej. cangrejos con y: [0.9, 1]) nazcan en el suelo
  const [y0, y1] = def.y || [0.05, 0.95];
  const x = zone.x + 60 + rnd() * (zone.w - 120);
  const y = zone.y + (zone.h * (y0 + rnd() * (y1 - y0)));
  return { def, x, y, hx: x, hy: y, a: rnd() * 6.28, zone: ZONES.indexOf(zone), t: rnd() * 5, hit: 0 };
}

export function updateCreature(c, dt, p, power, rnd) {
  const d = c.def;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dist = Math.hypot(dx, dy) || 1;
  const stronger = d.r > power; 
  const awake = dist < 500 + d.s; 

  let want = null;
  let sp = d.sp * 0.4; 
  c.t -= dt;

  if (c.t <= 0) {
    c.a += (rnd() - 0.5) * 2;
    c.t = 1 + rnd() * 3;
  }

  if (awake && d.b !== "ignore") {
    const fleeing = d.b === "flee" || d.b === "school" || (!stronger && d.b === "chase");

    if (fleeing && dist < 380) {
      want = Math.atan2(-dy, -dx); 
      sp = d.sp * 1.25; 
    } 
    else if (d.b === "chase" && stronger && dist < 550) {
      want = Math.atan2(dy, dx); 
      sp = d.sp * 1.15;
    } 
    else if (d.b === "guard" && stronger && dist < 350 + d.s) {
      want = Math.atan2(dy, dx); 
      sp = d.sp * 1.35;
    }
  }

  if (want !== null) {
    let da = want - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += da * Math.min(1, dt * 4);
  }

  // Correa (Leash): Evita que persigan eternamente o se queden atascadas
  if (Math.hypot(c.hx - c.x, c.hy - c.y) > 700 && want === null) {
    let returnAngle = Math.atan2(c.hy - c.y, c.hx - c.x);
    let da = returnAngle - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += da * Math.min(1, dt * 2);
  }

  c.x += Math.cos(c.a) * sp * dt;
  c.y += Math.sin(c.a) * sp * dt;

  const z = ZONES[c.zone];
  if (z) {
     c.x = Math.min(z.x + z.w - 30, Math.max(z.x + 30, c.x));
     // BARRERA DE SUPERFICIE Y PROFUNDIDAD: 
     // El límite Y=30 evita que salgan volando hacia el cielo en la Costa o Mar Abierto.
     c.y = Math.min(z.y + z.h - 30, Math.max(z.y + 30, c.y));
  } else {
     c.y = Math.min(WORLD.h - 30, Math.max(30, c.y));
  }

  c.hit = Math.max(0, c.hit - dt);

  return dist;
}