# 3D-голова ассистента

Самостоятельный браузерный модуль с локальной GLB-моделью и локальным Three.js.
Backend, React и внешние сетевые зависимости не требуются. Откройте `preview.html` через
любой локальный HTTP-сервер (например, из этого каталога: `python3 -m http.server 8000`).
Протокол `file://` для загрузки модулей и GLB не подходит.

```js
import { mountHead } from './assistant-avatar/head.mjs';

const head = mountHead(document.querySelector('#avatar'));
head.setState('thinking'); // idle | thinking | speaking | listening
head.replay();             // повторить лазерную сборку
head.dispose();            // закрытие панели: освободить WebGL и обработчики
```

Контейнеру нужна ненулевая высота. Создавайте экземпляр при открытии панели и
вызывайте `dispose()` при закрытии. Модуль сам приостанавливает кадры, когда
вкладка скрыта или контейнер вне экрана. При `prefers-reduced-motion: reduce`
голова показывается сразу без лазерной сборки.

Визуальное происхождение и ограничение на публикацию модели — в [ORIGIN.md](./ORIGIN.md).
