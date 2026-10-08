/* Sistemas del minijuego (Beta 4.4 - Fase 0) - Entrada, Audio, Generación y Comportamiento */
import { ZONES, WORLD } from "./data.js";

// 1. GESTIÓN DE ENTRADA (Teclado y Joystick Táctil)
// `signal` (AbortSignal) permite soltar TODOS los listeners de golpe al cerrar la partida.
export function createInput(canvas, joy, biteBtn, signal) {
  const opts = signal ? { signal } : undefined;
  const keys = {};
  const JOY_DEADZONE = 0.12;
  const BLOCKED_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  let keyBite = false;      // Espacio mantenido
  let btnBite = false;      // botón táctil mantenido
  let biteQueued = false;   // pulsación breve (aunque se suelte antes del siguiente frame)
  let joyId = null;         // pointerId que controla el joystick
  let biteId = null;        // pointerId que controla el botón de morder
  const joyVec = { x: 0, y: 0 };

  const clearAll = () => {
    for (const k in keys) keys[k] = false;
    keyBite = false; btnBite = false; biteQueued = false;
    joyId = null; biteId = null; joyVec.x = 0; joyVec.y = 0;
  };

  const onKeyDown = (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault(); // evita scroll y que Espacio active el botón enfocado
    keys[e.code] = true;
    if (e.code === "Space") { keyBite = true; if (!e.repeat) biteQueued = true; }
  };

  const onKeyUp = (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    keys[e.code] = false;
    if (e.code === "Space") keyBite = false;
  };

  window.addEventListener("keydown", onKeyDown, opts);
  window.addEventListener("keyup", onKeyUp, opts);
  window.addEventListener("blur", clearAll, opts);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearAll(); }, opts);

  // Botón de morder: su propio pointerId, independiente del joystick (se puede mover y morder a la vez)
  if (biteBtn) {
    biteBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (biteId !== null) return;
      biteId = e.pointerId;
      try { biteBtn.setPointerCapture(e.pointerId); } catch (_) {}
      btnBite = true; biteQueued = true;
    }, opts);
    const endBite = (e) => {
      if (e.pointerId !== biteId) return;
      biteId = null; btnBite = false;
    };
    biteBtn.addEventListener("pointerup", endBite, opts);
    biteBtn.addEventListener("pointercancel", endBite, opts);
    biteBtn.addEventListener("lostpointercapture", endBite, opts);
  }

  // Joystick: captura el puntero, así levantar el otro dedo no lo suelta
  if (joy) {
    const updateJoy = (e) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let x = (e.clientX - cx) / (rect.width / 2);
      let y = (e.clientY - cy) / (rect.height / 2);
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      if (Math.hypot(x, y) < JOY_DEADZONE) { x = 0; y = 0; }
      joyVec.x = x; joyVec.y = y;
    };
    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (joyId !== null) return;
      joyId = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch (_) {}
      updateJoy(e);
    }, opts);
    joy.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) updateJoy(e); }, opts);
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; joyVec.x = 0; joyVec.y = 0;
    };
    joy.addEventListener("pointerup", endJoy, opts);
    joy.addEventListener("pointercancel", endJoy, opts);
    joy.addEventListener("lostpointercapture", endJoy, opts);
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
      return Boolean(keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyZ"]);
    },
    // true mientras se mantiene morder, o si hubo una pulsación breve desde el último frame
    takeBite() {
      const b = biteQueued || keyBite || btnBite;
      biteQueued = false;
      return b;
    },
    destroy() {
      clearAll(); // los listeners los suelta el AbortController de la partida
    }
  };
}

// 2. GESTIÓN DE AUDIO PROCEDURAL Y AMBIENTE
export function createAudio(volumeGetter) {
  let ctx = null;
  let closed = false; // tras stop() no se vuelve a crear el contexto

  const getCtx = () => {
    if (closed) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
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
    // Llamar dentro del gesto del usuario (al abrir el juego) para que el navegador permita el audio
    unlock() { getCtx(); },
    sfx: {
      swim: () => playTone(120, "sine", 0.08, 0.4),
      bite: () => { playTone(240, "sawtooth", 0.12, 0.8); setTimeout(() => playTone(180, "sawtooth", 0.1, 0.8), 60); },
      eat: () => { playTone(440, "sine", 0.1); setTimeout(() => playTone(660, "sine", 0.15), 80); },
      hurt: () => playTone(90, "sawtooth", 0.3, 1),
      treasure: () => { playTone(523.25, "sine", 0.1); setTimeout(() => playTone(659.25, "sine", 0.1), 100); setTimeout(() => playTone(783.99, "sine", 0.2), 200); },
      zone: () => { playTone(350, "triangle", 0.4); }
    },
    ambience(zoneIndex) {},
    stop() {
      closed = true;
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
    t: rnd() * 3,   // temporizador de IA
    ph: rnd() * 6.3, // fase visual (separada de la IA para que no haya saltos al dibujar)
    hit: 0,
    dead: 0
  };
}

// 4. COMPORTAMIENTO E INTELIGENCIA ARTIFICIAL DE CRIATURAS
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
    const nx = Math.min(z.x + z.w - 30, Math.max(z.x + 30, c.x));
    const ny = Math.min(z.y + z.h - 30, Math.max(z.y + 30, c.y));
    if (nx !== c.x || ny !== c.y) {
      // Al tocar el borde de su zona rebota hacia el centro (antes se quedaban pegadas a la pared)
      c.x = nx; c.y = ny;
      c.a = Math.atan2(z.y + z.h / 2 - c.y, z.x + z.w / 2 - c.x) + (rnd() - 0.5) * 0.9;
      c.t = 0.8 + rnd() * 1.5;
    }
  } else {
    c.y = Math.min(WORLD.h - 30, Math.max(30, c.y));
  }

  c.hit = Math.max(0, c.hit - dt);

  return dist;
}