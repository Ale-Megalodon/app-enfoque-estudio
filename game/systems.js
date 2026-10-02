/* Entrada (teclado/ratón/táctil), audio procedural e IA de criaturas. */
import { CREATURES, ZONES, WORLD } from "./data.js";

export function createInput(canvas, joyEl, biteEl) {
  const keys = new Set();
  let joy = { x: 0, y: 0 };
  let bite = false;

  const map = { arrowleft: "a", arrowright: "d", arrowup: "w", arrowdown: "s" };

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
    } catch (_) { /* audio opcional */ }
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
  const [y0, y1] = def.y || [0.05, 0.95];
  const x = zone.x + 60 + rnd() * (zone.w - 120);
  const y = WORLD.h * (y0 + rnd() * (y1 - y0));
  return { def, x, y, hx: x, hy: y, a: rnd() * 6.28, zone: ZONES.indexOf(zone), t: rnd() * 5, hit: 0 };
}

export function updateCreature(c, dt, p, power, rnd) {
  const d = c.def;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dist = Math.hypot(dx, dy) || 1;
  const stronger = d.r > power; // La criatura es más fuerte que el tiburón
  const awake = dist < 450 + d.s; // Distancia de detección

  let want = null;
  let sp = d.sp * 0.4; // Velocidad base de patrullaje
  c.t -= dt;

  // Patrullaje aleatorio
  if (c.t <= 0) {
    c.a += (rnd() - 0.5) * 2;
    c.t = 1 + rnd() * 3;
  }

  // Máquina de estados lógicos basada en el poder del jugador
  if (awake && d.b !== "ignore") {
    // Si la criatura siempre huye, o si es un depredador pero el tiburón ha evolucionado a ser más fuerte
    const fleeing = d.b === "flee" || d.b === "school" || (!stronger && d.b === "chase");

    if (fleeing && dist < 350) {
      want = Math.atan2(-dy, -dx); // Huir en dirección opuesta
      sp = d.sp * 1.2; // Acelerar por el pánico
    } 
    else if (d.b === "chase" && stronger && dist < 500) {
      want = Math.atan2(dy, dx); // Perseguir agresivamente al tiburón menor
      sp = d.sp * 1.1;
    } 
    else if (d.b === "guard" && stronger && dist < 300 + d.s) {
      want = Math.atan2(dy, dx); // Atacar al invasor que entra a su territorio
      sp = d.sp * 1.3;
    }
  }

  if (want !== null) {
    // Interpolación del giro para evitar rotaciones instantáneas (movimiento más orgánico)
    let da = want - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += da * Math.min(1, dt * 4);
  }

  // Retorno al hábitat: Evita que las criaturas persigan infinitamente fuera de su zona o se acumulen en los bordes
  if (Math.hypot(c.hx - c.x, c.hy - c.y) > 600 && want === null) {
    let returnAngle = Math.atan2(c.hy - c.y, c.hx - c.x);
    let da = returnAngle - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += da * Math.min(1, dt * 2);
  }

  c.x += Math.cos(c.a) * sp * dt;
  c.y += Math.sin(c.a) * sp * dt;

  // Lógica estricta de colisión con los límites del bioma y profundidad
  const z = ZONES[c.zone];
  if (z) {
     c.x = Math.min(z.x + z.w - 30, Math.max(z.x + 30, c.x));
  }
  c.y = Math.min(WORLD.h - 30, Math.max(30, c.y));

  c.hit = Math.max(0, c.hit - dt);

  return dist;
}