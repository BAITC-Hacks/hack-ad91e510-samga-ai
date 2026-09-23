// Общая тема действующего входа АКИМ и панели симулятора.
(() => {
  let theme = 'light';
  try {
    const saved = localStorage.getItem('site-starter-theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (error) { console.warn('Сохранённая тема недоступна.', error); }
  document.documentElement.dataset.theme = theme;
})();
