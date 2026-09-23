import { parseSseStream } from './sse.mjs';

const styleId = 'akim-assistant-style';
const defaults = { model: 'gpt-4.1-mini', voiceId: 'JBFqnCBsd6RMkjVDRZzb' };
const quickQuestions = ['Сравни варианты', 'Почему Нура?', 'Что улучшить?'];
const allowedActions = new Set(['focus_comparison', 'focus_district', 'select_preset']);

function loadStyle() {
  if (document.getElementById(styleId)) return;
  const link = document.createElement('link');
  link.id = styleId;
  link.rel = 'stylesheet';
  link.href = new URL('./assistant.css', import.meta.url).href;
  document.head.append(link);
}

function button(label, className, title = label) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  el.setAttribute('aria-label', title);
  return el;
}

function contextCopy(getContext) {
  const source = getContext() || {};
  return JSON.parse(JSON.stringify({
    choices: source.choices ?? [],
    selectedDistrict: source.selectedDistrict ?? null,
    activePreset: source.activePreset ?? null,
  }));
}

function contextLabel(context) {
  const district = context.selectedDistrict || 'все районы';
  const preset = ({ capital: 'Всё в Есиль', source: 'Помочь слабым районам', cheap: 'Сохранить резерв' })[context.activePreset] || 'текущий план';
  const count = Array.isArray(context.choices) ? context.choices.length : 0;
  return `${district} · ${preset} · ${count} решений`;
}

function errorMessage(error) {
  if (error?.name === 'AbortError') return '';
  return error?.message || 'Сервис временно недоступен.';
}

export function initAssistant({ getContext, onAction, headModuleUrl, apiBase = 'http://127.0.0.1:4198' }) {
  if (typeof getContext !== 'function' || typeof onAction !== 'function') {
    throw new TypeError('initAssistant: getContext и onAction должны быть функциями');
  }
  loadStyle();
  const root = document.createElement('section');
  root.className = 'akim-assistant';
  root.innerHTML = `
    <div class="akim-assistant__panel" role="dialog" aria-label="АКИМ AI-ассистент" aria-modal="false" aria-hidden="true" inert>
      <header class="akim-assistant__header">
        <div class="akim-assistant__brand"><strong>АКИМ</strong><span>AI-ассистент</span></div>
        <span class="akim-assistant__state" role="status">Готов</span>
        <button class="akim-assistant__icon akim-assistant__settings-toggle" type="button" aria-label="Настройки" title="Настройки">⚙</button>
        <button class="akim-assistant__icon akim-assistant__close" type="button" aria-label="Свернуть ассистента" title="Свернуть">×</button>
      </header>
      <div class="akim-assistant__head-zone"><div class="akim-assistant__head" aria-hidden="true"></div></div>
      <div class="akim-assistant__chat-view">
        <p class="akim-assistant__availability" role="status">Проверяем подключение…</p>
        <div class="akim-assistant__messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
        <div class="akim-assistant__quick" aria-label="Короткие вопросы"></div>
        <form class="akim-assistant__form">
          <input class="akim-assistant__input" type="text" maxlength="1200" autocomplete="off" aria-label="Вопрос ассистенту" placeholder="Спросите о плане…">
          <button class="akim-assistant__mic" type="button" aria-label="Записать голосовой вопрос" title="Записать голосовой вопрос">◉</button>
          <button class="akim-assistant__send" type="submit" aria-label="Отправить вопрос">↑</button>
        </form>
        <div class="akim-assistant__foot"><span class="akim-assistant__record-status" role="status"></span><button class="akim-assistant__voice" type="button" aria-pressed="false">Звук выключен</button></div>
      </div>
      <form class="akim-assistant__settings" hidden autocomplete="off">
        <p>Ключи хранятся только в памяти локального сервера до его перезапуска.</p>
        <label>OpenAI API key<input name="openaiKey" type="password" autocomplete="off" placeholder="sk-…"></label>
        <label>ElevenLabs API key<input name="elevenlabsKey" type="password" autocomplete="off" placeholder="Ключ ElevenLabs"></label>
        <label>Модель<input name="model" type="text" value="gpt-4.1-mini"></label>
        <label>Voice ID<input name="voiceId" type="text" value="JBFqnCBsd6RMkjVDRZzb"></label>
        <button class="akim-assistant__connect" type="submit">Подключить</button>
        <span class="akim-assistant__settings-status" role="status"></span>
      </form>
    </div>
    <button class="akim-assistant__orb" type="button" aria-label="Открыть АКИМ AI-ассистента" aria-expanded="false" title="Открыть АКИМ AI-ассистента"><span class="akim-assistant__orb-rim"></span><span class="akim-assistant__orb-core"></span><span class="akim-assistant__orb-shine"></span></button>`;
  document.body.append(root);
  const q = selector => root.querySelector(selector);
  const panel = q('.akim-assistant__panel');
  const orb = q('.akim-assistant__orb');
  const stateEl = q('.akim-assistant__state');
  const availability = q('.akim-assistant__availability');
  const messages = q('.akim-assistant__messages');
  const input = q('.akim-assistant__input');
  const sendButton = q('.akim-assistant__send');
  const micButton = q('.akim-assistant__mic');
  const recordStatus = q('.akim-assistant__record-status');
  const voiceButton = q('.akim-assistant__voice');
  const settings = q('.akim-assistant__settings');
  const settingsToggle = q('.akim-assistant__settings-toggle');
  const settingsStatus = q('.akim-assistant__settings-status');
  const quick = q('.akim-assistant__quick');
  const headContainer = q('.akim-assistant__head');
  let open = false;
  let destroyed = false;
  let head;
  let headAttempted = false;
  let headMountToken = 0;
  let previousFocus;
  let voiceEnabled = false;
  let openaiAvailable = false;
  let elevenAvailable = false;
  let history = [];
  let chatController;
  let speechController;
  let statusController;
  let configController;
  let transcribeController;
  let audio;
  let audioUrl;
  let recorder;
  let microphoneStream;
  let recordTimeout;
  let requestSerial = 0;
  let statusSerial = 0;

  const endpoint = path => `${apiBase.replace(/\/$/, '')}${path}`;
  function setState(value) {
    root.dataset.state = value;
    stateEl.textContent = ({ idle: openaiAvailable ? 'Готов' : 'Нужна настройка', listening: 'Слушает', thinking: 'Думает', speaking: 'Говорит', alert: 'Ошибка' })[value] || 'Нужна настройка';
    try { head?.setState?.(value === 'alert' ? 'idle' : value); }
    catch { headContainer.classList.add('akim-assistant__head--fallback'); }
  }
  function stopAudio() {
    speechController?.abort();
    speechController = undefined;
    audio?.pause();
    audio = undefined;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = undefined;
    if (open && !chatController && !recorder) setState('idle');
  }
  function stopRecording() {
    clearTimeout(recordTimeout);
    if (recorder?.state === 'recording') recorder.stop();
    microphoneStream?.getTracks().forEach(track => track.stop());
    microphoneStream = undefined;
    micButton.classList.remove('is-recording');
    micButton.setAttribute('aria-label', 'Записать голосовой вопрос');
    recordStatus.textContent = '';
    if (open && !chatController) setState('idle');
  }
  function abortActivity() {
    requestSerial++;
    chatController?.abort();
    chatController = undefined;
    statusController?.abort();
    configController?.abort();
    transcribeController?.abort();
    stopAudio();
    stopRecording();
  }
  function disposeHead() {
    headMountToken++;
    if (head) {
      try { head.dispose?.(); } catch { headContainer.classList.add('akim-assistant__head--fallback'); }
      head = undefined;
    }
    headContainer.replaceChildren();
    headContainer.classList.remove('akim-assistant__head--fallback');
    headAttempted = false;
  }
  function addMessage(kind, text, snapshot) {
    const item = document.createElement('div');
    item.className = `akim-assistant__message akim-assistant__message--${kind}`;
    if (snapshot) {
      const label = document.createElement('small');
      label.className = 'akim-assistant__context';
      label.textContent = `Контекст запроса: ${contextLabel(snapshot)}`;
      item.append(label);
    }
    const content = document.createElement('p');
    content.textContent = text;
    item.append(content);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return { item, content };
  }
  function showAvailability(text) { availability.textContent = text; }
  function renderComparison(meta, holder) {
    const rows = Array.isArray(meta?.comparison) ? meta.comparison.slice(0, 3) : [];
    if (!rows.length) return;
    const section = document.createElement('section');
    section.className = 'akim-assistant__comparison';
    const title = document.createElement('strong');
    title.textContent = 'Сравнение вариантов · 2 года';
    section.append(title);
    for (const row of rows) {
      const card = document.createElement('div');
      card.className = 'akim-assistant__compare-row';
      const name = document.createElement('span');
      name.textContent = String(row.title || 'Вариант');
      const figures = document.createElement('small');
      const score = row.score == null ? '—' : Number(row.score).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
      figures.textContent = `${row.cost ?? '—'} ед. · индекс ${score} · критических ${row.critical ?? '—'}`;
      card.append(name, figures);
      section.append(card);
    }
    if (meta.facts?.draft) {
      const draft = document.createElement('small');
      draft.textContent = 'Черновой план: итоговый индекс пока не рассчитан.';
      section.append(draft);
    }
    holder.append(section);
  }
  async function refreshStatus() {
    statusController?.abort();
    const controller = new AbortController();
    statusController = controller;
    const serial = ++statusSerial;
    try {
      const response = await fetch(endpoint('/api/assistant/status'), { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);
      const status = await response.json();
      if (serial !== statusSerial || !open) return;
      openaiAvailable = Boolean(status.openai);
      elevenAvailable = Boolean(status.elevenlabs);
      settings.elements.model.value = status.model || defaults.model;
      settings.elements.voiceId.value = status.voiceId || defaults.voiceId;
      showAvailability(openaiAvailable ? 'Ключ OpenAI настроен. Задайте вопрос по текущему плану.' : 'OpenAI не подключён. Откройте настройки и добавьте ключ.');
      sendButton.disabled = !openaiAvailable;
      voiceButton.disabled = !elevenAvailable;
      micButton.disabled = !elevenAvailable;
      if (root.dataset.state === 'idle') setState('idle');
      if (voiceEnabled && !elevenAvailable) toggleVoice(false);
    } catch (error) {
      if (error.name === 'AbortError' || !open) return;
      openaiAvailable = false;
      elevenAvailable = false;
      sendButton.disabled = true;
      micButton.disabled = true;
      voiceButton.disabled = true;
      showAvailability('Локальный API недоступен. Запустите сервер на 127.0.0.1:4198.');
      setState('alert');
    } finally {
      if (statusController === controller) statusController = undefined;
    }
  }
  function toggleVoice(force) {
    voiceEnabled = typeof force === 'boolean' ? force : !voiceEnabled;
    voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
    voiceButton.textContent = voiceEnabled ? 'Звук включён' : 'Звук выключен';
    if (!voiceEnabled) stopAudio();
  }
  async function speak(text, serial) {
    if (!voiceEnabled || !elevenAvailable || !text.trim() || !open) return;
    stopAudio();
    const controller = new AbortController();
    speechController = controller;
    try {
      const response = await fetch(endpoint('/api/assistant/speech'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 3000) }), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Озвучивание недоступно (${response.status})`);
      const blob = await response.blob();
      if (!open || serial !== requestSerial || controller.signal.aborted) return;
      audioUrl = URL.createObjectURL(blob);
      audio = new Audio(audioUrl);
      audio.onended = () => { stopAudio(); setState('idle'); };
      audio.onerror = () => { stopAudio(); recordStatus.textContent = 'Не удалось воспроизвести ответ.'; };
      setState('speaking');
      await audio.play();
    } catch (error) {
      if (error.name !== 'AbortError' && open && serial === requestSerial) {
        recordStatus.textContent = 'Озвучивание недоступно; текст ответа сохранён.';
        stopAudio();
      }
    } finally {
      if (speechController === controller) speechController = undefined;
    }
  }
  function renderActions(actions, snapshot, holder) {
    if (!Array.isArray(actions)) return;
    const row = document.createElement('div');
    row.className = 'akim-assistant__actions';
    for (const action of actions) {
      if (!action || !allowedActions.has(action.type)) continue;
      const label = String(action.label || 'Показать на панели').slice(0, 90);
      const control = button(label, 'akim-assistant__action');
      control.addEventListener('click', () => {
        if (JSON.stringify(contextCopy(getContext)) !== JSON.stringify(snapshot)) {
          addMessage('notice', 'План изменился после этого ответа. Спросите ещё раз, чтобы применить действие к текущим данным.');
          return;
        }
        const payload = { type: action.type };
        if (action.type === 'focus_district' && typeof action.district === 'string') payload.district = action.district;
        if (action.type === 'select_preset' && typeof action.preset === 'string') payload.preset = action.preset;
        try { onAction(payload); } catch (error) { addMessage('notice', errorMessage(error)); }
      });
      row.append(control);
    }
    if (row.childElementCount) holder.append(row);
  }
  async function send(message) {
    const trimmed = message.trim().slice(0, 1200);
    if (!trimmed || !open) return;
    if (!openaiAvailable) { showAvailability('OpenAI не подключён. Откройте настройки и добавьте ключ.'); return; }
    chatController?.abort();
    stopAudio();
    const serial = ++requestSerial;
    const controller = new AbortController();
    chatController = controller;
    const snapshot = contextCopy(getContext);
    const priorHistory = history.slice(-8).map(entry => ({ role: entry.role, content: entry.content.slice(0, 500) }));
    addMessage('user', trimmed, snapshot);
    const answer = addMessage('assistant', 'Отвечаю…');
    let received = '';
    let done = false;
    let actions = [];
    let meta;
    let streamError = '';
    input.value = '';
    sendButton.disabled = true;
    setState('thinking');
    try {
      const response = await fetch(endpoint('/api/assistant/chat'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, choices: snapshot.choices, selectedDistrict: snapshot.selectedDistrict, history: priorHistory }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        let detail = '';
        try { const body = await response.json(); detail = body.error?.message || body.error || body.message || ''; } catch { /* HTTP status is enough */ }
        throw new Error(typeof detail === 'string' && detail ? detail : `AI недоступен (${response.status})`);
      }
      await parseSseStream(response.body, frame => {
        if (serial !== requestSerial || !open) return;
        let value;
        try { value = JSON.parse(frame.data); } catch { return; }
        const type = frame.event === 'message' ? value.type : frame.event;
        if (type === 'meta') {
          meta = value;
        } else if (type === 'delta' && typeof value.text === 'string') {
          received += value.text;
          answer.content.textContent = received;
          messages.scrollTop = messages.scrollHeight;
        } else if (type === 'done') {
          done = true;
          if (typeof value.text === 'string') received = value.text;
          actions = value.actions;
        } else if (type === 'error') {
          streamError = String(value.message || 'Ошибка потокового ответа.');
        }
      });
      if (!open || serial !== requestSerial) return;
      if (streamError) throw new Error(streamError);
      if (!done) throw new Error('Соединение прервано до завершения ответа.');
      answer.content.textContent = received || 'Ответ пуст. Повторите вопрос.';
      renderComparison(meta, answer.item);
      if (received) {
        history = [...priorHistory, { role: 'user', content: trimmed }, { role: 'assistant', content: received }].slice(-8);
        renderActions(actions, snapshot, answer.item);
      }
      setState('idle');
      if (received) await speak(received, serial);
    } catch (error) {
      if (error.name !== 'AbortError' && open && serial === requestSerial) {
        answer.content.textContent = `Не удалось получить ответ: ${errorMessage(error)}`;
        setState('alert');
      }
    } finally {
      if (chatController === controller) chatController = undefined;
      if (open && serial === requestSerial) sendButton.disabled = !openaiAvailable;
    }
  }
  async function startRecording() {
    if (recorder?.state === 'recording') { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      recordStatus.textContent = 'Запись голоса не поддерживается этим браузером.';
      return;
    }
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!open) { microphoneStream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(microphoneStream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        clearTimeout(recordTimeout);
        microphoneStream?.getTracks().forEach(track => track.stop());
        microphoneStream = undefined;
        micButton.classList.remove('is-recording');
        micButton.setAttribute('aria-label', 'Записать голосовой вопрос');
        if (!open || !chunks.length) { recordStatus.textContent = ''; return; }
        recordStatus.textContent = 'Распознаём речь…';
        setState('thinking');
        const controller = new AbortController();
        transcribeController = controller;
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const response = await fetch(endpoint('/api/assistant/transcribe'), {
            method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Распознавание недоступно (${response.status})`);
          const result = await response.json();
          if (open && typeof result.text === 'string') {
            input.value = result.text;
            input.focus();
            recordStatus.textContent = result.text ? 'Проверьте текст и отправьте вопрос.' : 'Речь не распознана. Попробуйте ещё раз.';
          }
        } catch (error) {
          if (error.name !== 'AbortError' && open) recordStatus.textContent = errorMessage(error);
        } finally {
          if (transcribeController === controller) transcribeController = undefined;
          if (open) setState('idle');
        }
      };
      recorder.start();
      micButton.classList.add('is-recording');
      micButton.setAttribute('aria-label', 'Остановить запись');
      recordStatus.textContent = 'Идёт запись. Нажмите ещё раз для остановки (до 30 с).';
      setState('listening');
      recordTimeout = setTimeout(stopRecording, 30000);
    } catch (error) {
      microphoneStream?.getTracks().forEach(track => track.stop());
      microphoneStream = undefined;
      recordStatus.textContent = error.name === 'NotAllowedError' ? 'Доступ к микрофону не разрешён.' : errorMessage(error);
      setState('idle');
    }
  }
  async function mountHeadOnce() {
    if (headAttempted || !headModuleUrl) return;
    headAttempted = true;
    const token = ++headMountToken;
    const slot = document.createElement('div');
    slot.className = 'akim-assistant__head-slot';
    headContainer.replaceChildren(slot);
    try {
      const module = await import(headModuleUrl);
      if (destroyed || !open || token !== headMountToken) return;
      const mounted = await Promise.resolve(module.mountHead(slot));
      if (destroyed || !open || token !== headMountToken) {
        mounted?.dispose?.();
        slot.remove();
        return;
      }
      head = mounted;
      setState(root.dataset.state || 'idle');
    } catch {
      if (open && token === headMountToken) {
        headContainer.textContent = 'АКИМ';
        headContainer.classList.add('akim-assistant__head--fallback');
      }
    }
  }
  function showSettings(value) {
    settings.hidden = !value;
    q('.akim-assistant__chat-view').hidden = value;
    q('.akim-assistant__head-zone').hidden = value;
    settingsToggle.setAttribute('aria-label', value ? 'Вернуться к чату' : 'Настройки');
    if (value) settings.elements.openaiKey.focus(); else input.focus();
  }
  function openPanel() {
    if (open || destroyed) return;
    previousFocus = document.activeElement;
    open = true;
    root.classList.add('is-open');
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    orb.setAttribute('aria-expanded', 'true');
    orb.setAttribute('aria-label', 'Свернуть АКИМ AI-ассистента');
    showSettings(false);
    mountHeadOnce();
    refreshStatus();
    input.focus();
  }
  function closePanel() {
    if (!open) return;
    open = false;
    abortActivity();
    disposeHead();
    root.classList.remove('is-open');
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    orb.setAttribute('aria-expanded', 'false');
    orb.setAttribute('aria-label', 'Открыть АКИМ AI-ассистента');
    setState('idle');
    (previousFocus?.isConnected ? previousFocus : orb).focus();
  }
  function onDocumentPointer(event) { if (open && !root.contains(event.target)) closePanel(); }
  function onDocumentKey(event) {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); closePanel(); return; }
    if (event.key !== 'Tab') return;
    const focusables = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(el => !el.closest('[hidden]'));
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  orb.addEventListener('click', () => open ? closePanel() : openPanel());
  q('.akim-assistant__close').addEventListener('click', closePanel);
  settingsToggle.addEventListener('click', () => showSettings(settings.hidden));
  voiceButton.addEventListener('click', () => toggleVoice());
  micButton.addEventListener('click', startRecording);
  q('.akim-assistant__form').addEventListener('submit', event => { event.preventDefault(); send(input.value); });
  settings.addEventListener('submit', async event => {
    event.preventDefault();
    configController?.abort();
    const controller = new AbortController();
    configController = controller;
    const payload = {
      model: settings.elements.model.value.trim() || defaults.model,
      voiceId: settings.elements.voiceId.value.trim() || defaults.voiceId,
    };
    if (settings.elements.openaiKey.value.trim()) payload.openaiKey = settings.elements.openaiKey.value.trim();
    if (settings.elements.elevenlabsKey.value.trim()) payload.elevenlabsKey = settings.elements.elevenlabsKey.value.trim();
    settings.elements.openaiKey.value = '';
    settings.elements.elevenlabsKey.value = '';
    settingsStatus.textContent = 'Подключаем…';
    try {
      const response = await fetch(endpoint('/api/assistant/config'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Настройки не сохранены (${response.status})`);
      settingsStatus.textContent = 'Настройки приняты сервером.';
      await refreshStatus();
    } catch (error) {
      if (error.name !== 'AbortError' && open) settingsStatus.textContent = errorMessage(error);
    } finally {
      if (configController === controller) configController = undefined;
    }
  });
  for (const question of quickQuestions) {
    const item = button(question, 'akim-assistant__prompt');
    item.addEventListener('click', () => send(question));
    quick.append(item);
  }
  document.addEventListener('pointerdown', onDocumentPointer);
  document.addEventListener('keydown', onDocumentKey);
  sendButton.disabled = true;
  micButton.disabled = true;
  voiceButton.disabled = true;
  setState('idle');
  return {
    open: openPanel,
    close: closePanel,
    destroy() {
      if (destroyed) return;
      closePanel();
      destroyed = true;
      document.removeEventListener('pointerdown', onDocumentPointer);
      document.removeEventListener('keydown', onDocumentKey);
      disposeHead();
      root.remove();
    },
  };
}
