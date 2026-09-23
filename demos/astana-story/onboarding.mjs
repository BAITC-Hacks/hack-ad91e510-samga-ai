const styleUrl = new URL('./onboarding.css', import.meta.url).href;

function ensureStyles() {
  if (document.querySelector(`link[href="${styleUrl}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = styleUrl;
  document.head.append(link);
}

function mountGuide() {
  const content = document.querySelector('#content');
  const demoButton = document.querySelector('#play-demo');
  const newPlanButton = document.querySelector('#new-plan');
  if (!content || !demoButton || !newPlanButton || document.querySelector('#onboarding-guide')) return;

  const guide = document.createElement('section');
  guide.className = 'onboarding-guide';
  guide.id = 'onboarding-guide';
  guide.setAttribute('aria-labelledby', 'onboarding-title');
  guide.innerHTML = `
    <div class="onboarding-guide__summary">
      <span class="onboarding-guide__eyebrow">Старт симуляции</span>
      <h2 id="onboarding-title">Пять решений для города</h2>
      <p>Выберите меры, удержите бюджет и посмотрите результат через два года.</p>
      <div class="onboarding-guide__facts" aria-label="Цель симуляции">
        <span><b>5</b> решений</span><span><b>100</b> ед. бюджета</span><span><b>2</b> года</span>
      </div>
    </div>
    <div class="onboarding-guide__actions">
      <button type="button" class="onboarding-guide__primary" data-onboarding-action="demo">Посмотреть пример</button>
      <button type="button" class="onboarding-guide__secondary" data-onboarding-action="plan">Составить свой план</button>
      <button type="button" class="onboarding-guide__help" data-onboarding-action="help" aria-haspopup="dialog">Как пользоваться</button>
    </div>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'onboarding-dialog';
  dialog.id = 'onboarding-dialog';
  dialog.setAttribute('aria-labelledby', 'onboarding-dialog-title');
  dialog.innerHTML = `
    <form method="dialog" class="onboarding-dialog__panel">
      <div class="onboarding-dialog__heading">
        <div><span>Короткий путь</span><h2 id="onboarding-dialog-title">Как пользоваться</h2></div>
        <button class="onboarding-dialog__close" value="close" aria-label="Закрыть инструкцию">×</button>
      </div>
      <ol class="onboarding-dialog__steps">
        <li><b>Выберите 5 мер.</b><span>Добавляйте или заменяйте решения в карточке «Пять решений».</span></li>
        <li><b>Следите за бюджетом.</b><span>Все меры вместе должны стоить не больше 100 единиц.</span></li>
        <li><b>Сравните результат.</b><span>После пятой меры результат рассчитывается автоматически. Индекс показывает итог учебной модели через два года; районные показатели ниже 40 отмечены как критические. В примере медицина Нуры остаётся на уровне 35.</span></li>
      </ol>
      <section class="onboarding-dialog__example" aria-label="Проверенный пример">
        <span>Пример для объяснения модели</span>
        <p>Автобусные полосы — Нура · парк — Сарыарка · школа — Нура · освещение — Нура · обращения — весь город</p>
        <dl><div><dt>Расход</dt><dd>83</dd></div><div><dt>Индекс</dt><dd>55,61</dd></div><div><dt>Критических</dt><dd>1</dd></div></dl>
      </section>
      <p class="onboarding-dialog__note">Пример покрывает пять направлений. Расчёт работает без ИИ. Задайте помощнику вопрос «Почему Нура?» — он объяснит текущий план. Если подключение недоступно, помощник покажет причину.</p>
      <button class="onboarding-dialog__done" value="close">Понятно</button>
    </form>`;

  const anchor = content.querySelector('.panel-context');
  (anchor || content).insertAdjacentElement(anchor ? 'afterend' : 'afterbegin', guide);
  document.body.append(dialog);

  const collapse = () => {
    guide.classList.add('onboarding-guide--compact');
    guide.querySelectorAll('[data-onboarding-action="demo"], [data-onboarding-action="plan"]').forEach(button => { button.hidden = true; });
  };
  guide.addEventListener('click', event => {
    const action = event.target.closest('[data-onboarding-action]')?.dataset.onboardingAction;
    if (!action) return;
    if (action === 'help') {
      dialog.showModal();
      dialog.querySelector('.onboarding-dialog__close').focus();
      return;
    }
    const target = action === 'demo' ? demoButton : newPlanButton;
    target.click();
    collapse();
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}

ensureStyles();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountGuide, { once: true });
else mountGuide();
