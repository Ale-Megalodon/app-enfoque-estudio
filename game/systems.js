/* Sistemas del minijuego (Entrada, Audio, Generación y Comportamiento de Criaturas) */
import { ZONES, WORLD } from "./data.js";

// 1. GESTIÓN DE ENTRADA (Teclado y Joystick Táctil)
export function createInput(canvas, joy, biteBtn) {
  const keys = {};
  let biting = false;
  let dashing = false;
  let joyActive = false;
  let joyVec = { x: 0, y: 0 };

  const onKeyDown = (e) => {
    keys[e.code] = true;
    if (e.code === "Space") biting = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") dashing = true;
  };

  const onKeyUp = (e) => {
    keys[e.code] = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") dashing = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  if (biteBtn) {
    biteBtn.addEventListener("pointerdown", () => { biting = true; });
  }

  if (joy) {
    const onJoyMove = (e) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        joyVec.x = dx / (len > 1 ? len : 1);
        joyVec.y = dy / (len > 1 ? len : 1);
      }
    };

    joy.addEventListener("pointerdown", (e) => { joyActive = true; onJoyMove(e); });
    window.addEventListener("pointermove", (e) => { if (joyActive) onJoyMove(e); });
    window.addEventListener("pointerup", () => { joyActive = false; joyVec.x = 0; joyVec.y = 0; });
  }

  return {
    dir() {
      let x = 0, y = 0;
      if (keys["KeyW"] || keys["ArrowUp"]) y -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) y += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) x += 1;

      if (joyVec.x !== 0 || joyVec.y !== 0) {
        x = joyVec.x;
        y = joyVec.y;
      }

      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    },
    dash() {
      return dashing || keys["KeyZ"] || false;
    },
    takeBite() {
      const b = biting;
      biting = false;
      return b;
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    }
  };
}

// 2. GESTIÓN DE AUDIO PROCEDURAL Y AMBIENTE
export function createAudio(volumeGetter) {
  let ctx = null;

  const getCtx = () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const playTone = (freq, type, duration, volMod = 1) => {
    const vol = (volumeGetter ? volumeGetter() : 70) / 100 * 0.15 * volMod;
    if (vol <= 0) return;
    const c = getCtx();
    if (!c) return;

    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration);
    } catch (e) {
      console.error(e);
    }
  };

  return {
    sfx: {
      swim: () => playTone(120, "sine", 0.08, 0.4),
      bite: () => { playTone(240, "sawtooth", 0.12, 0.8); setTimeout(() => playTone(180, "sawtooth", 0.1, 0.8), 60); },
      eat: () => { playTone(440, "sine", 0.1); setTimeout(() => playTone(660, "sine", 0.15), 80); },
      hurt: () => playTone(90, "sawtooth", 0.3, 1),
      treasure: () => { playTone(523.25, "sine", 0.1); setTimeout(() => playTone(659.25, "sine", 0.1), 100); setTimeout(() => playTone(783.99, "sine", 0.2), 200); },
      zone: () => { playTone(350, "triangle", 0.4); }
    },
    ambience(zoneIndex) {
      // Audio de ambiente por zona (silencioso o sutil)
    },
    stop() {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
    }
  };
}

// 3. GENERACIÓN DE CRIATURAS (SPAWN)
export function spawn(def, zone, rnd) {
  const yRange = def.y || [0.05, 0.95];
  const x = zone.x + 80 + rnd() * (zone.w - 160);
  const y = zone.y + zone.h * yRange[0] + rnd() * (zone.h * (yRange[1] - yRange[0]));
  return {
    id: def.id,
    def,
    zone: ZONES.indexOf(zone),
    x, y,
    hx: x, hy: y,
    a: rnd() * 6.3,
    t: rnd() * 3,
    hit: 0,
    dead: 0
  };
}

// 4. COMPORTAMIENTO E INTELIGENCIA ARTIFICIAL DE CRIATURAS (Actualizado Beta 4.1)
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
     c.y = Math.min(z.y + z.h - 30, Math.max(z.y + 30, c.y));
  } else {
     c.y = Math.min(WORLD.h - 30, Math.max(30, c.y));
  }

  c.hit = Math.max(0, c.hit - dt);

  return dist;
}