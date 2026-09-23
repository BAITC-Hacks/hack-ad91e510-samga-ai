import { Icon } from './Icon.mjs';
export const tabs = [['home','Карта','map'],['decisions','Решения','decisions'],['districts','Районы','grid'],['result','Итог','chart']];
export const GlassTabBar = active => `<nav class="tab-bar" aria-label="Главная навигация">${tabs.map(([id,label,icon]) => `<a href="#${id}" class="tab ${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''}>${Icon(icon)}<span>${label}</span></a>`).join('')}</nav>`;
