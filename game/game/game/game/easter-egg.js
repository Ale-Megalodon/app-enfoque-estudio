/* Entrada secreta: N clics seguidos sobre un elemento (sin botón de "jugar"). */
export function attachMultiClick(el, { count = 5, gapMs = 1200, onTick, onTrigger }) {
  let n = 0, timer = null;
  el.addEventListener("click", () => {
    n += 1;
    clearTimeout(timer);
    if (n >= count) { n = 0; onTick?.(0); onTrigger(); return; }
    onTick?.(n);
    timer = setTimeout(() => { n = 0; onTick?.(0); }, gapMs);
  });
}