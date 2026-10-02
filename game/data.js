/* Configuración central del minijuego. Para añadir contenido nuevo, agrega entradas aquí. */
export const BP = { plankton: 2, shrimp: 5, small: 10, medium: 25, large: 50, octopus: 75, barracuda: 100, sword: 150, shark: 300, giant: 500, zone: 300, poi: 500, coin: 250, gem: 500, chest: 800, relic: 1000 };
export const WORLD = { w: 16400, h: 1500 };
export const SAVE_VERSION = 1;

// Capacidades por nivel de evolución (índice 0..9). power = rango máximo de criatura comestible.
// Las horas de evolución NO viven aquí: las gestiona la mascota (app.js).
export const LEVELS = [
  { size: 16, speed: 60, power: 0, hp: 20 }, { size: 26, speed: 130, power: 1, hp: 40 },
  { size: 34, speed: 150, power: 2, hp: 60 }, { size: 46, speed: 170, power: 3, hp: 80 },
  { size: 60, speed: 185, power: 4, hp: 110 }, { size: 78, speed: 200, power: 5, hp: 150 },
  { size: 100, speed: 215, power: 6, hp: 200 }, { size: 128, speed: 230, power: 7, hp: 270 },
  { size: 160, speed: 245, power: 8, hp: 350 }, { size: 230, speed: 260, power: 9, hp: 500 }
];
export const SHARK_COLORS = ["#f5e6c8", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#2563eb", "#4f46e5", "#64748b", "#7c3aed", "#1e293b"];

// min = nivel mínimo (índice) para entrar. n = [en, es]. d = decoración. m = frecuencia del ambiente.
export const ZONES = [
  { n: ["Coast", "Costa"], x: 0, w: 1800, min: 0, c: ["#8fe3ee", "#2a8fb0"], d: "weed", m: 130 },
  { n: ["Coral Reef", "Arrecife de coral"], x: 1800, w: 2200, min: 1, c: ["#59cfe0", "#1b7aa8"], d: "coral", m: 147 },
  { n: ["Open Sea", "Mar abierto"], x: 4000, w: 3200, min: 4, c: ["#3a9bd8", "#0f4c86"], d: "weed", m: 110, gate: "cur" },
  { n: ["Shipwreck Graveyard", "Cementerio de naufragios"], x: 7200, w: 2400, min: 4, c: ["#2a6f9e", "#0c3558"], d: "hull", m: 98 },
  { n: ["Ancient Ruins", "Ruinas antiguas"], x: 9600, w: 2000, min: 6, c: ["#1f5f7a", "#082a3d"], d: "column", m: 87, gate: "seal" },
  { n: ["Abyss", "Abismo"], x: 11600, w: 2200, min: 7, c: ["#10304f", "#02060e"], d: "glow", m: 65, dark: 0.82, gate: "deep" },
  { n: ["Atlantis", "Atlantis"], x: 13800, w: 2600, min: 8, c: ["#1b8a9c", "#06222c"], d: "column", m: 78, dark: 0.35, gate: "seal" }
];
// Barreras interiores: se atraviesan solo con nivel >= min. t = tipo de mensaje.
export const GATES = [
  { x: 700, y: 0, w: 30, h: 1500, min: 1, t: "egg" },
  { x: 3000, y: 0, w: 30, h: 1500, min: 3, t: "deep" },
  { x: 3150, y: 1100, w: 40, h: 330, min: 3, t: "small" },
  { x: 8950, y: 1150, w: 40, h: 330, min: 5, t: "door" },
  { x: 10700, y: 900, w: 40, h: 600, min: 7, t: "door" },
  { x: 15800, y: 0, w: 40, h: 1500, min: 9, t: "seal" }
];
// Descubrimientos (naufragios, cuevas, ruinas, Atlantis...). Dan BP.poi una sola vez.
export const POIS = [
  { id: "cove", n: ["Hidden Cove", "Cala escondida"], x: 900, y: 1250, r: 130 },
  { id: "reefcave", n: ["Coral Cave", "Cueva de coral"], x: 2500, y: 1300, r: 140 },
  { id: "tunnel", n: ["Narrow Tunnel", "Túnel estrecho"], x: 3350, y: 1200, r: 130 },
  { id: "wreck1", n: ["Sunken Galleon", "Galeón hundido"], x: 7700, y: 1330, r: 180 },
  { id: "wreck2", n: ["Rusted Freighter", "Carguero oxidado"], x: 8300, y: 1380, r: 180 },
  { id: "wreckbig", n: ["Great Wreck", "Gran naufragio"], x: 9150, y: 1300, r: 160 },
  { id: "temple", n: ["Sunken Temple", "Templo hundido"], x: 10200, y: 1250, r: 200 },
  { id: "stairs", n: ["Secret Stairway", "Escalera secreta"], x: 11000, y: 1100, r: 160 },
  { id: "vent", n: ["Glowing Vent", "Fuente luminosa"], x: 12500, y: 1000, r: 200 },
  { id: "atlgate", n: ["Gates of Atlantis", "Puertas de Atlantis"], x: 14100, y: 1100, r: 200 },
  { id: "palace", n: ["Palace of Atlantis", "Palacio de Atlantis"], x: 15000, y: 1000, r: 220 },
  { id: "plaza", n: ["Sunken Plaza", "Plaza sumergida"], x: 15500, y: 1250, r: 200 },
  { id: "core", n: ["Heart of Atlantis", "Corazón de Atlantis"], x: 16100, y: 900, r: 220 }
];
// Tesoros fijos (ocultos tras barreras o en cuevas); el resto se genera por zona (TREASURE_PER_ZONE).
export const TREASURES = [
  { id: "tt1", k: "chest", x: 3360, y: 1250 }, { id: "tw1", k: "chest", x: 9160, y: 1340 },
  { id: "tw2", k: "gem", x: 7720, y: 1380 }, { id: "ts1", k: "relic", x: 11050, y: 1150 },
  { id: "ta1", k: "relic", x: 16050, y: 920 }, { id: "ta2", k: "relic", x: 16200, y: 860 }, { id: "ta3", k: "chest", x: 16120, y: 980 }
];
export const TREASURE_PER_ZONE = [3, 4, 5, 6, 5, 5, 6];

// Criaturas. r = rango (comestible si r <= power). s = tamaño px. b = comportamiento.
// n = cantidad por 1000px. y = franja de profundidad (0 superficie..1 fondo). dm = daño por contacto.
export const CREATURES = [
  { id: "plankton", e: "✦", r: 0, s: 10, bp: BP.plankton, b: "school", z: [0, 1], n: 14, sp: 20, heal: 1 },
  { id: "shrimp", e: "🦐", r: 1, s: 16, bp: BP.shrimp, b: "flee", z: [0, 1], n: 8, sp: 60 },
  { id: "crab", e: "🦀", r: 1, s: 18, bp: BP.small, b: "ignore", z: [0, 1], n: 5, sp: 25, y: [0.85, 1] },
  { id: "sardine", e: "🐟", r: 2, s: 18, bp: BP.small, b: "school", z: [0, 1, 2], n: 12, sp: 70 },
  { id: "tropical", e: "🐠", r: 2, s: 22, bp: BP.small, b: "school", z: [1], n: 10, sp: 60 },
  { id: "puffer", e: "🐡", r: 3, s: 30, bp: BP.medium, b: "ignore", z: [1, 2], n: 3, sp: 30, dm: 6 },
  { id: "moray", e: "🐍", r: 3, s: 38, bp: BP.medium, b: "guard", z: [1, 3], n: 2, sp: 90, dm: 10, y: [0.7, 1] },
  { id: "octopus", e: "🐙", r: 4, s: 46, bp: BP.octopus, b: "flee", z: [1, 3], n: 2, sp: 80 },
  { id: "squid", e: "🦑", r: 4, s: 52, bp: BP.large, b: "flee", z: [2, 3], n: 3, sp: 100 },
  { id: "turtle", e: "🐢", r: 4, s: 44, bp: BP.large, b: "ignore", z: [1, 2], n: 2, sp: 30 },
  { id: "bigfish", e: "🐟", r: 4, s: 56, bp: BP.large, b: "flee", z: [2, 3], n: 3, sp: 90 },
  { id: "barracuda", e: "🐟", r: 5, s: 72, bp: BP.barracuda, b: "chase", z: [2, 3], n: 2, sp: 125, dm: 12 },
  { id: "seal", e: "🦭", r: 5, s: 66, bp: BP.barracuda, b: "flee", z: [2], n: 1, sp: 90 },
  { id: "swordfish", e: "🐟", r: 6, s: 96, bp: BP.sword, b: "chase", z: [2, 3], n: 1.5, sp: 140, dm: 20 },
  { id: "shark1", e: "🦈", r: 5, s: 84, bp: BP.shark, b: "chase", z: [2, 3], n: 1, sp: 120, dm: 15 },
  { id: "shark2", e: "🦈", r: 6, s: 115, bp: BP.shark, b: "chase", z: [2, 3, 4], n: 1, sp: 130, dm: 22 },
  { id: "shark3", e: "🦈", r: 7, s: 155, bp: BP.shark, b: "chase", z: [3, 5], n: 0.8, sp: 140, dm: 35 },
  { id: "jelly", e: "🪼", r: 6, s: 38, bp: BP.octopus, b: "ignore", z: [5], n: 4, sp: 20, dm: 8, glow: 1 },
  { id: "angler", e: "🐡", r: 7, s: 76, bp: BP.shark, b: "chase", z: [5], n: 2, sp: 105, dm: 28, glow: 1 },
  { id: "guardian", e: "🗿", r: 8, s: 130, bp: BP.giant, b: "guard", z: [4, 6], n: 1, sp: 110, dm: 30, y: [0.5, 1] },
  { id: "kraken", e: "🦑", r: 9, s: 250, bp: BP.giant, b: "guard", z: [5], n: 0.5, sp: 90, dm: 45, glow: 1 },
  { id: "leviathan", e: "🐉", r: 9, s: 290, bp: BP.giant, b: "chase", z: [6], n: 0.4, sp: 110, dm: 50 }
];

export const TEXT = {
  en: { back: "← BACK", lvl: "Level", bp: "Break Points", big: "TOO BIG", disc: "NEW DISCOVERY", died: "YOU WERE DEVOURED", egg: "Hatch first to swim farther", cur: "CURRENT TOO STRONG", deep: "TOO DEEP", seal: "SEALED BY ANCIENT POWER", small: "TUNNEL TOO NARROW", door: "NEEDS MORE STRENGTH", treasure: "TREASURE", hint: "Move: WASD / arrows · Bite: Space / click" },
  es: { back: "← VOLVER", lvl: "Nivel", bp: "Break Points", big: "DEMASIADO GRANDE", disc: "NUEVO DESCUBRIMIENTO", died: "TE HAN DEVORADO", egg: "Eclosiona primero para nadar más lejos", cur: "CORRIENTE DEMASIADO FUERTE", deep: "DEMASIADO PROFUNDO", seal: "SELLADO POR UN PODER ANTIGUO", small: "TÚNEL DEMASIADO ESTRECHO", door: "REQUIERE MÁS FUERZA", treasure: "TESORO", hint: "Mover: WASD / flechas · Morder: Espacio / clic" }
};