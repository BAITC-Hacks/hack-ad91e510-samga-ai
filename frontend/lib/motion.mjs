import { fmt } from './format.mjs';
export function animateNumbers(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count), from = Number(el.dataset.from ?? target);
    const start = performance.now();
    const tick = now => {
      if (!el.isConnected) return;
      const progress = reduced ? 1 : Math.min(1, (now-start)/700);
      el.textContent = fmt(from + (target-from)*(1-Math.pow(1-progress,3)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
export function haptic() { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(8); }
