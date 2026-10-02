/* Configuración central - Mundo Híbrido, Ecosistema Expandido y Bestiario Visual - Beta 4.1 */

export const SAVE_VERSION = 3;
export const WORLD = { w: 16000, h: 8000 };

export const BP = {
  plankton: 1, starfish: 2, seahorse: 4, shrimp: 5, small: 10, crab: 15, medium: 25, 
  large: 50, ray: 60, octopus: 75, eel: 80, barracuda: 100, sword: 150, 
  shark: 300, golem: 400, giant: 500,
  zone: 300, poi: 500, coin: 250, gem: 500, chest: 800, relic: 1000
};

export const LEVELS = [
  { size: 16, speed: 110, power: 0, hp: 20 },  // 0. Huevito
  { size: 22, speed: 130, power: 1, hp: 40 },  // 1. Cría
  { size: 30, speed: 150, power: 2, hp: 60 },  // 2. Tiburoncito
  { size: 40, speed: 170, power: 3, hp: 80 },  // 3. Joven
  { size: 55, speed: 190, power: 4, hp: 120 }, // 4. Explorador
  { size: 75, speed: 210, power: 5, hp: 160 }, // 5. Cazador
  { size: 100, speed: 225, power: 6, hp: 220 },// 6. Guardián
  { size: 130, speed: 240, power: 7, hp: 300 },// 7. Gran blanco
  { size: 170, speed: 260, power: 8, hp: 400 },// 8. Rey del arrecife
  { size: 260, speed: 290, power: 9, hp: 600 } // 9. Megalodón
];

export const SHARK_COLORS = ["#f5e6c8", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#2563eb", "#4f46e5", "#64748b", "#7c3aed", "#1e293b"];

export const ZONES = [
  { n: ["Coast", "Costa"], x: 0, y: 0, w: 3000, h: 2000, min: 0, c: ["#8fe3ee", "#2a8fb0"], d: "weed", m: 130 },
  { n: ["Coral Reef", "Arrecife de coral"], x: 3000, y: 0, w: 4000, h: 3000, min: 1, c: ["#59cfe0", "#1b7aa8"], d: "coral", m: 147 },
  { n: ["Open Sea", "Mar abierto"], x: 7000, y: 0, w: 9000, h: 4000, min: 4, c: ["#3a9bd8", "#0f4c86"], d: "weed", m: 110, gate: "cur" },
  { n: ["Shipwreck Graveyard", "Cementerio de naufragios"], x: 1000, y: 3000, w: 5000, h: 3000, min: 5, c: ["#2a6f9e", "#0c3558"], d: "hull", m: 98 },
  { n: ["Abyss", "Abismo"], x: 0, y: 6000, w: 9000, h: 2000, min: 7, c: ["#0f2038", "#010308"], d: "glow", m: 65, dark: 0.85, gate: "deep" },
  { n: ["Ancient Ruins", "Ruinas antiguas"], x: 9000, y: 4000, w: 4000, h: 2500, min: 8, c: ["#174860", "#051824"], d: "column", m: 87, gate: "seal" },
  { n: ["Atlantis", "Atlantis"], x: 10000, y: 6500, w: 6000, h: 1500, min: 9, c: ["#147a8c", "#041a22"], d: "column", m: 78, dark: 0.3, gate: "seal" }
];

export const GATES = [
  { x: 3000, y: 0, w: 50, h: 2000, min: 1, t: "egg" },                 
  { x: 0, y: 2000, w: 3000, h: 50, min: 1, t: "egg" },                 
  { x: 7000, y: 0, w: 60, h: 3000, min: 3, t: "cur" },                 
  { x: 0, y: 3000, w: 6000, h: 50, min: 5, t: "deep" },                
  { x: 0, y: 6000, w: 16000, h: 80, min: 7, t: "deep" },               
  { x: 9000, y: 4000, w: 60, h: 2500, min: 8, t: "seal" },             
  { x: 10000, y: 6500, w: 16000, h: 50, min: 9, t: "atlantis_seal" }   
];

export const POIS = [
  { id: "cove", n: ["Hidden Cove", "Cala escondida"], x: 1200, y: 1800, r: 150 },
  { id: "reefcave", n: ["Coral Cave", "Cueva de coral"], x: 4500, y: 2500, r: 160 },
  { id: "wreck1", n: ["Sunken Galleon", "Galeón hundido"], x: 2500, y: 4500, r: 200 },
  { id: "abysscave", n: ["Luminous Cave", "Cueva luminosa"], x: 4000, y: 7500, r: 200 },
  { id: "temple", n: ["Sunken Temple", "Templo hundido"], x: 11000, y: 5500, r: 220 },
  { id: "core", n: ["Heart of Atlantis", "Corazón de Atlantis"], x: 14000, y: 7500, r: 300 }
];

export const TREASURES = [ { id: "t1", k: "chest", x: 2800, y: 4600 }, { id: "t2", k: "relic", x: 14100, y: 7600 } ];
export const TREASURE_PER_ZONE = [2, 3, 4, 6, 4, 5, 8];

export const CREATURES = [
  { id: "plankton", name: ["Plankton", "Plancton"], r: 0, s: 8, bp: BP.plankton, b: "school", z: [0, 1], n: 25, sp: 20, heal: 1 },
  { id: "starfish", name: ["Starfish", "Estrella de mar"], r: 0, s: 12, bp: BP.starfish, b: "ignore", z: [0, 1], n: 10, sp: 5, y: [0.95, 1] },
  { id: "shrimp", name: ["Shrimp", "Camarón"], r: 1, s: 14, bp: BP.shrimp, b: "flee", z: [0, 1], n: 10, sp: 50 },
  { id: "seahorse", name: ["Seahorse", "Caballito de mar"], r: 1, s: 15, bp: BP.seahorse, b: "flee", z: [1], n: 8, sp: 35 },
  { id: "crab_small", name: ["Small Crab", "Cangrejo"], r: 1, s: 18, bp: BP.crab, b: "ignore", z: [0, 1, 2], n: 8, sp: 25, y: [0.9, 1] },
  { id: "sardine", name: ["Sardine", "Sardina"], r: 2, s: 20, bp: BP.small, b: "school", z: [0, 1, 2], n: 15, sp: 80 },
  { id: "tropical", name: ["Tropical Fish", "Pez tropical"], r: 2, s: 26, bp: BP.small, b: "school", z: [1], n: 12, sp: 70 },
  { id: "puffer", name: ["Pufferfish", "Pez globo"], r: 3, s: 35, bp: BP.medium, b: "ignore", z: [1, 2], n: 4, sp: 30, dm: 8 },
  { id: "squid", name: ["Squid", "Calamar"], r: 3, s: 40, bp: BP.medium, b: "flee", z: [2, 3, 4], n: 5, sp: 110 },
  { id: "eel_moray", name: ["Moray Eel", "Morena"], r: 3, s: 45, bp: BP.eel, b: "guard", z: [1, 3], n: 3, sp: 90, dm: 12, y: [0.7, 1] },
  { id: "ray_manta", name: ["Manta Ray", "Mantarraya"], r: 4, s: 65, bp: BP.ray, b: "flee", z: [1, 2, 3], n: 4, sp: 85, y: [0.6, 0.95] },
  { id: "octopus", name: ["Octopus", "Pulpo"], r: 4, s: 60, bp: BP.octopus, b: "flee", z: [3, 5], n: 3, sp: 90 },
  { id: "barracuda", name: ["Barracuda", "Barracuda"], r: 5, s: 80, bp: BP.barracuda, b: "chase", z: [2, 3], n: 3, sp: 140, dm: 15 },
  { id: "swordfish", name: ["Swordfish", "Pez espada"], r: 6, s: 110, bp: BP.sword, b: "chase", z: [2, 3, 4], n: 2, sp: 160, dm: 25 },
  { id: "jelly", name: ["Jellyfish", "Medusa"], r: 6, s: 45, bp: BP.medium, b: "ignore", z: [4, 5], n: 6, sp: 20, dm: 10, glow: 1 },
  { id: "snake_abyss", name: ["Abyssal Snake", "Serpiente abisal"], r: 6, s: 75, bp: BP.eel, b: "chase", z: [4, 5], n: 3, sp: 150, dm: 22, glow: 1 },
  { id: "shark1", name: ["Reef Shark", "Tiburón de arrecife"], r: 6, s: 100, bp: BP.shark, b: "chase", z: [2, 3], n: 2, sp: 130, dm: 20 },
  { id: "angler", name: ["Anglerfish", "Pez linterna"], r: 7, s: 85, bp: BP.shark, b: "chase", z: [4], n: 3, sp: 115, dm: 35, glow: 1 },
  { id: "crab_giant", name: ["Giant Crab", "Cangrejo gigante"], r: 7, s: 95, bp: BP.crab * 5, b: "guard", z: [3, 4], n: 2, sp: 50, dm: 30, y: [0.9, 1] },
  { id: "golem_atlantean", name: ["Atlantean Golem", "Gólem atlante"], r: 8, s: 160, bp: BP.golem, b: "guard", z: [5, 6], n: 1.5, sp: 90, dm: 50, y: [0.6, 1], glow: 1 },
  { id: "guardian", name: ["Guardian", "Guardián"], r: 8, s: 180, bp: BP.giant, b: "guard", z: [5, 6], n: 1, sp: 120, dm: 45 },
  { id: "kraken", name: ["Kraken", "Kraken"], r: 9, s: 280, bp: BP.giant, b: "guard", z: [4, 5], n: 0.5, sp: 100, dm: 60, glow: 1 },
  { id: "leviathan", name: ["Elder Leviathan", "Leviatán anciano"], r: 9, s: 350, bp: BP.giant, b: "chase", z: [6], n: 0.4, sp: 130, dm: 80 }
];

export const TEXT = {
  en: { back: "  BACK", lvl: "Level", bp: "Break Points", big: "TOO BIG", disc: "NEW DISCOVERY", died: "YOU WERE DEVOURED", egg: "Hatch first to swim farther", cur: "CURRENT TOO STRONG", deep: "WATER PRESSURE TOO HIGH", seal: "SEALED BY ANCIENT POWER", small: "TUNNEL TOO NARROW", door: "NEEDS MORE STRENGTH", atlantis_seal: "ONLY THE APEX PREDATOR MAY ENTER", treasure: "TREASURE", hint: "Move: WASD   Bite: Space   Dash: Shift", diet: "HUNTING GUIDE (EDIBLE PREY):" },
  es: { back: "  VOLVER", lvl: "Nivel", bp: "Break Points", big: "DEMASIADO GRANDE", disc: "NUEVO DESCUBRIMIENTO", died: "TE HAN DEVORADO", egg: "Eclosiona primero para nadar más lejos", cur: "CORRIENTE DEMASIADO FUERTE", deep: "PRESIÓN DEMASIADO ALTA", seal: "SELLADO POR UN PODER ANTIGUO", small: "TÚNEL DEMASIADO ESTRECHO", door: "REQUIERE MÁS FUERZA", atlantis_seal: "SÓLO EL DEPREDADOR ALFA PUEDE ENTRAR", treasure: "TESORO", hint: "Mover: WASD   Morder: Espacio   Dash: Shift", diet: "GUÍA DE CAZA (PRESAS COMESTIBLES):" }
};