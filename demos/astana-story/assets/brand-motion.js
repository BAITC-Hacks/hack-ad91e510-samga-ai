// ARLAN sign motion, extracted from 5.Web/src/brand/LiveWolf.tsx and the
// canonical packages/ui/brand/{wolfLayers,markMotion}.ts on 2026-09-23.
// This file deliberately keeps the original geometry and timing dependency-free.

const FRAME = '82 113 860 860';
const CYAN = '#68DEF3';
const DUTY = {
  breathPeriod: 5200,
  blinkMin: 22_000,
  blinkMax: 48_000,
  blinkDur: 140,
  blinkTwiceChance: 0.25,
  blinkGap: 90,
  arcDur: 240,
  arcRedraw: 30,
  arcSegs: 7,
  arcSpread: 13,
  arcDepth: 0,
  arcHaloWidth: 7,
  arcCoreWidth: 2.4,
};

const EYES = [
  {
    side: 'L',
    body: 'M 348 527 L 422 547 L 422 564 L 369 578 Z',
    x: 385,
    y: 552.5,
    gradient: { x1: 348, y1: 527, x2: 422, y2: 578 },
  },
  {
    side: 'R',
    body: 'M 676 527 L 602 547 L 602 564 L 655 578 Z',
    x: 639,
    y: 552.5,
    gradient: { x1: 602, y1: 527, x2: 676, y2: 578 },
  },
];

let instance = 0;
const svgNs = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(svgNs, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

function boltPath(x1, y1, x2, y2, segments, spread, depth = 1) {
  const points = [[x1, y1]];
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const nx = -(y2 - y1);
  const ny = x2 - x1;
  const length = Math.hypot(nx, ny) || 1;
  for (let index = 1; index < segments; index += 1) {
    const progress = index / segments;
    const offset = (Math.random() - 0.5) * spread * Math.sin(Math.PI * progress) * 2;
    points.push([x1 + dx * index + (nx / length) * offset, y1 + dy * index + (ny / length) * offset]);
  }
  points.push([x2, y2]);
  let path = `M ${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')}`;
  if (depth > 0) {
    for (let branch = 0; branch < 2; branch += 1) {
      const node = points[1 + Math.floor(Math.random() * (points.length - 2))];
      if (!node) continue;
      const [x, y] = node;
      path += ` ${boltPath(x, y, x + (Math.random() - 0.5) * spread * 3, y + Math.random() * spread * 2.4, 4, spread * 0.6, depth - 1)}`;
    }
  }
  return path;
}

function createOverlay(id) {
  const svg = svgElement('svg', { viewBox: FRAME, fill: 'none', 'aria-hidden': 'true' });
  const defs = svgElement('defs');
  const glowId = `${id}-glow`;
  for (const eye of EYES) {
    const gradient = svgElement('linearGradient', {
      id: `${id}-gemGradient_eye_${eye.side}`,
      x1: eye.gradient.x1,
      y1: eye.gradient.y1,
      x2: eye.gradient.x2,
      y2: eye.gradient.y2,
      gradientUnits: 'userSpaceOnUse',
    });
    for (const [offset, stopColor] of [['0.0', '#C3E6EC'], ['0.55', '#93C3CB'], ['1.0', '#57889A']]) {
      gradient.append(svgElement('stop', { offset, 'stop-color': stopColor }));
    }
    defs.append(gradient);
    const clip = svgElement('clipPath', { id: `${id}-${eye.side}` });
    clip.append(svgElement('path', { d: eye.body }));
    defs.append(clip);
  }
  const filter = svgElement('filter', { id: glowId, x: '-60%', y: '-120%', width: '220%', height: '340%' });
  filter.append(svgElement('feGaussianBlur', { stdDeviation: '6' }));
  defs.append(filter);
  svg.append(defs);

  for (const eye of EYES) {
    const group = svgElement('g');
    group.append(
      svgElement('path', { class: 'live-wolf__breath', d: eye.body, fill: CYAN, filter: `url(#${glowId})` }),
      svgElement('path', { class: 'live-wolf__flare', d: eye.body, fill: '#d9fbff', filter: `url(#${glowId})` }),
    );
    const lid = svgElement('g', { class: 'live-wolf__lid', 'clip-path': `url(#${id}-${eye.side})` });
    lid.append(svgElement('path', { d: eye.body, fill: '#10232b' }));
    const gem = svgElement('g', { class: 'live-wolf__gem' });
    gem.style.transformOrigin = `${eye.x}px ${eye.y}px`;
    gem.append(svgElement('path', { d: eye.body, fill: `url(#${id}-gemGradient_eye_${eye.side})` }));
    lid.append(gem);
    group.append(lid, svgElement('path', { class: 'live-wolf__flash', d: eye.body, fill: '#e8ffff' }));
    svg.append(group);
  }
  const arc = svgElement('g', { class: 'live-wolf__arc', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  arc.append(
    svgElement('path', { class: 'live-wolf__bolt', stroke: CYAN, 'stroke-width': DUTY.arcHaloWidth, filter: `url(#${glowId})` }),
    svgElement('path', { class: 'live-wolf__bolt', stroke: CYAN, 'stroke-width': DUTY.arcHaloWidth }),
    svgElement('path', { class: 'live-wolf__bolt', stroke: '#fff', 'stroke-width': DUTY.arcCoreWidth }),
  );
  svg.append(arc);
  return svg;
}

/** Add the canonical eye overlay and return a function that removes all listeners and markup. */
export function initBrandMotion(root) {
  if (!(root instanceof Element)) throw new TypeError('initBrandMotion expects a DOM element');
  const id = `brand-motion-${++instance}`;
  const overlay = createOverlay(id);
  root.append(overlay);

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bolts = overlay.querySelectorAll('.live-wolf__bolt');
  const timers = new Set();
  let redraw;
  let visible = true;

  const later = (callback, milliseconds) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, milliseconds);
    timers.add(timer);
  };
  const clear = () => {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    window.clearInterval(redraw);
    root.classList.remove('is-blinking', 'is-sparking');
    root.dataset.motion = 'rest';
  };
  const active = () => visible && !document.hidden && !motion.matches;
  const blink = () => {
    if (!active()) return;
    root.classList.add('is-blinking');
    root.dataset.motion = 'blink';
    later(() => {
      root.classList.remove('is-blinking');
      root.dataset.motion = 'rest';
    }, DUTY.blinkDur);
  };
  const draw = () => {
    const path = boltPath(EYES[0].x, EYES[0].y, EYES[1].x, EYES[1].y, DUTY.arcSegs, DUTY.arcSpread, DUTY.arcDepth);
    bolts.forEach((bolt) => bolt.setAttribute('d', path));
  };
  const strike = () => {
    if (!active()) return;
    draw();
    root.classList.add('is-sparking');
    root.dataset.motion = 'spark';
    redraw = window.setInterval(draw, DUTY.arcRedraw);
    later(() => window.clearInterval(redraw), DUTY.arcDur * 1.6 + 70);
    later(() => {
      root.classList.remove('is-sparking');
      root.dataset.motion = 'rest';
    }, 1400);
  };
  const scheduleBlink = () => later(() => {
    blink();
    if (Math.random() < DUTY.blinkTwiceChance) later(blink, DUTY.blinkDur + DUTY.blinkGap);
    scheduleBlink();
  }, between(DUTY.blinkMin, DUTY.blinkMax));
  const scheduleSpark = () => later(() => {
    strike();
    scheduleSpark();
  }, between(10_000, 15_000));
  const start = () => {
    clear();
    root.dataset.paused = String(!active());
    if (!active()) return;
    // Initial display mirrors the source: show both gestures once, then idle naturally.
    later(() => {
      blink();
      scheduleBlink();
    }, 900);
    later(() => {
      strike();
      scheduleSpark();
    }, 2500);
  };
  const onIntersection = (entries) => {
    const next = entries[0] ? entries[0].isIntersecting : false;
    if (next !== visible) {
      visible = next;
      start();
    }
  };
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(onIntersection) : null;
  observer?.observe(root);
  const onMotionChange = () => start();
  document.addEventListener('visibilitychange', start);
  motion.addEventListener?.('change', onMotionChange);
  motion.addListener?.(onMotionChange);
  root.addEventListener('click', start);
  start();

  return () => {
    clear();
    observer?.disconnect();
    document.removeEventListener('visibilitychange', start);
    motion.removeEventListener?.('change', onMotionChange);
    motion.removeListener?.(onMotionChange);
    root.removeEventListener('click', start);
    delete root.dataset.paused;
    delete root.dataset.motion;
    overlay.remove();
  };
}
