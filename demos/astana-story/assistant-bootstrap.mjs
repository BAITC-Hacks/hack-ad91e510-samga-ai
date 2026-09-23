import { initAssistant } from './assistant/assistant.mjs';

function start() {
  const bridge = window.akimAssistant;
  if (!bridge?.getContext || !bridge?.onAction) {
    console.error('Ассистент: панель симулятора не предоставила контекст.');
    return;
  }
  window.akimAssistantUI = initAssistant({
    getContext: () => bridge.getContext(),
    onAction: (action) => bridge.onAction(action),
    headModuleUrl: new URL('./assistant/avatar/head.mjs', import.meta.url).href,
    apiBase: `${location.protocol}//${location.hostname}:4198`,
  });
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
