import { siteConfig, loginConfig } from './config.js?v=akim-emblem-2';
import { initBrandMotion } from './assets/brand-motion.js';

const pageConfig = document.querySelector('#login-form') ? loginConfig : siteConfig;

const paths = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 3.7M6.6 6.6C3.6 8.7 2 12 2 12s3.5 7 10 7c2.1 0 3.9-.7 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  layout: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  moon: '<path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
  activity: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  exit: '<path d="M9 4H4v16h5m5-13 5 5-5 5M8 12h11"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
function drawIcon(element, name = element.dataset.icon) {
  if (!paths[name]) throw new Error(`Неизвестная иконка: ${name}`);
  // Только фиксированные строки из локального набора, не пользовательский HTML.
  element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
document.querySelectorAll('[data-icon]').forEach(element => drawIcon(element));
document.querySelectorAll('[data-brand]').forEach(element => { element.textContent = pageConfig.name; });
document.querySelectorAll('[data-description]').forEach(element => { element.textContent = pageConfig.description; });
document.title = `${pageConfig.name} — ${document.querySelector('#login-form') ? 'вход' : 'главная'}`;
document.querySelector('link[rel="icon"]').href = pageConfig.logo;
document.querySelectorAll('[data-brand-logo]').forEach(element => { element.src = pageConfig.logo; });
document.querySelectorAll('.live-wolf').forEach(element => {
  element.querySelector('img').src = pageConfig.logo;
  if (pageConfig.animateLogo) initBrandMotion(element);
  else {
    element.disabled = true;
    element.setAttribute('aria-label', pageConfig.name);
  }
});

function updateThemeButtons() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    drawIcon(button.querySelector('[data-icon]'), dark ? 'sun' : 'moon');
  });
}
updateThemeButtons();
document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('site-starter-theme', next); }
    catch (error) { console.warn('Тема применена, но её не удалось сохранить.', error); }
    updateThemeButtons();
  });
});
const formatClock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Asia/Almaty' });
function updateClock() {
  const now = new Date();
  document.querySelectorAll('[data-clock]').forEach(element => {
    element.textContent = formatClock.format(now);
    element.dateTime = now.toISOString();
  });
  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = now.getFullYear(); });
}
updateClock();setInterval(updateClock, 30_000);

const password = document.querySelector('#password');
const peek = document.querySelector('#password-toggle');
peek?.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  peek.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
  peek.setAttribute('aria-pressed', String(show));
  drawIcon(peek.querySelector('[data-icon]'), show ? 'eye-off' : 'eye');
});
document.querySelector('#login-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const status = document.querySelector('#login-status');
  status.textContent = 'Авторизация не подключена. Используйте предпросмотр главного экрана.';
  status.hidden = false;
  password.value = '';
});

const openMenu = document.querySelector('#open-menu');
const sidebar = document.querySelector('#sidebar');
const backdrop = document.querySelector('#menu-backdrop');
const mobile = matchMedia('(max-width: 860px)');
let menuOpen = false;
function setMenu(open, restoreFocus = false) {
  if (!sidebar) return;
  menuOpen = open;
  document.body.classList.toggle('menu-open', open);
  openMenu.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
  sidebar.inert = mobile.matches && !open;
  if (open) document.querySelector('#close-menu').focus();
  else if (restoreFocus) openMenu.focus();
}
openMenu?.addEventListener('click', () => setMenu(!menuOpen, true));
document.querySelector('#close-menu')?.addEventListener('click', () => setMenu(false, true));
backdrop?.addEventListener('click', () => setMenu(false, true));
mobile.addEventListener('change', () => setMenu(false));
setMenu(false);
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => {
    item.classList.toggle('is-active', item === link);
    if (item === link) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  });
  setMenu(false, mobile.matches);
}));
document.addEventListener('keydown', event => {
  if (!menuOpen) return;
  if (event.key === 'Escape') setMenu(false, true);
  if (event.key === 'Tab') {
    const focusable = [...sidebar.querySelectorAll('a[href], button:not([disabled])')].filter(element => element.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault();last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first.focus(); }
  }
});
