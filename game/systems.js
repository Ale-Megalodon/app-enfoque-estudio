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