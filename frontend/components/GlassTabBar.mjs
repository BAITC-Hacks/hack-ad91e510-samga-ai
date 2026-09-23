import { Icon } from './Icon.mjs';
export const tabs = [['home','Начало','home'],['play','Решения','decisions'],['map','Карта','map'],['result','Итог','chart']];
export const routes = ['home','play','map','result','decisions','districts'];
export const GlassTabBar = active => `<nav class="tab-bar" aria-label="Главная навигация">${tabs.map(([id,label,icon]) => `<a href="#${id}" class="tab ${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''}>${Icon(icon)}<span>${label}</span></a>`).join('')}</nav>`;
