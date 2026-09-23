import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { buildContext, InputError, trustedPrompt } from './context.mjs';
import { ProviderError, streamOpenAI, speech, transcribe } from './providers.mjs';

const origins = new Set(['http://127.0.0.1:8095', 'http://localhost:8095', 'http://127.0.0.1:4198', 'http://localhost:4198']);
const audioTypes = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']);
const validModel = value => typeof value === 'string' && /^[a-zA-Z0-9._-]{2,80}$/.test(value);
const validVoice = value => typeof value === 'string' && (value === '' || /^[a-zA-Z0-9_-]{8,100}$/.test(value));
const actions = [
  { type: 'focus_comparison', label: 'Сравнить варианты' },
  { type: 'focus_district', district: 'Нура', label: 'Показать Нуру' },
  { type: 'select_preset', preset: 'source', label: 'Помочь слабым районам' },
];
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = (message, status = 422) => { throw new InputError(message, status); };

async function readBody(req, max) {
  if (Number(req.headers['content-length']) > max) fail('Размер запроса превышен.', 413);
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) fail('Размер запроса превышен.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') fail('Используйте application/json.', 415);
  let value;
  try { value = JSON.parse((await readBody(req, 16 * 1024)).toString('utf8')); }
  catch (error) { if (error instanceof InputError) throw error; fail('Некорректный JSON.', 400); }
  if (!isObject(value)) fail('Ожидается JSON-объект.');
  return value;
}

function only(value, keys) {
  if (!isObject(value) || Object.keys(value).some(key => !keys.includes(key))) fail('Недопустимые поля запроса.');
}

function validateChat(value) {
  only(value, ['message', 'choices', 'selectedDistrict', 'history']);
  if (typeof value.message !== 'string' || value.message.trim().length < 2 || value.message.length > 1200) fail('Введите вопрос от 2 до 1200 символов.');
  if (value.history !== undefined && (!Array.isArray(value.history) || value.history.length > 8 || value.history.some(item => !isObject(item) || Object.keys(item).some(key => !['role', 'content'].includes(key)) || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 500))) fail('Некорректная история диалога.');
  return buildContext({ choices: value.choices, selectedDistrict: value.selectedDistrict });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function writeEvent(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }

export function createApp({ env = process.env, fetchImpl = fetch } = {}) {
  const config = {
    openaiKey: env.OPENAI_API_KEY || '', elevenlabsKey: env.ELEVENLABS_API_KEY || '',
    model: validModel(env.OPENAI_MODEL) ? env.OPENAI_MODEL : 'gpt-4.1-mini',
    voiceId: validVoice(env.ELEVENLABS_VOICE_ID) ? env.ELEVENLABS_VOICE_ID : '',
  };
  let active = 0;
  const status = () => ({ openai: Boolean(config.openaiKey), elevenlabs: Boolean(config.elevenlabsKey), model: config.model, voiceId: config.voiceId });
  const app = createServer(async (req, res) => {
    try {
      const origin = req.headers.origin;
      if (origin && !origins.has(origin)) fail('Источник запроса не разрешён.', 403);
      if (req.method !== 'GET' && !origin) fail('Укажите доверенный Origin.', 403);
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const path = new URL(req.url, 'http://127.0.0.1').pathname;
      if (path === '/api/assistant/status' && req.method === 'GET') { sendJson(res, 200, status()); return; }
      if (path === '/api/assistant/config' && req.method === 'POST') {
        const input = await readJson(req); only(input, ['openaiKey', 'elevenlabsKey', 'model', 'voiceId']);
        for (const key of ['openaiKey', 'elevenlabsKey']) if (key in input && (typeof input[key] !== 'string' || input[key].length > 500)) fail('Некорректное значение ключа.');
        if ('model' in input && !validModel(input.model)) fail('Некорректная модель.');
        if ('voiceId' in input && !validVoice(input.voiceId)) fail('Некорректный голос.');
        for (const key of ['openaiKey', 'elevenlabsKey', 'model', 'voiceId']) if (key in input) config[key] = input[key].trim();
        sendJson(res, 200, status()); return;
      }
      if (!['/api/assistant/chat', '/api/assistant/speech', '/api/assistant/transcribe'].includes(path)) fail('Маршрут не найден.', 404);
      if (req.method !== 'POST') fail('Используйте POST.', 405);
      if (active >= 2) fail('Ассистент занят. Повторите позже.', 429);
      active++;
      try {
      if (path === '/api/assistant/chat') {
        const input = await readJson(req);
        const context = validateChat(input);
        if (!config.openaiKey) fail('Подключите ключ OpenAI.', 503);
        const controller = new AbortController();
        res.on('close', () => controller.abort());
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        writeEvent(res, 'meta', { facts: context.facts, comparison: context.comparison });
        let text = '';
        try {
          const history = input.history ?? [];
          const prompt = [{ role: 'developer', content: 'Проверенные данные модели (JSON): ' + trustedPrompt(context) }, ...history, { role: 'user', content: input.message.trim() }];
          for await (const delta of streamOpenAI({ apiKey: config.openaiKey, model: config.model, input: prompt, fetchImpl, signal: controller.signal })) {
            if (text.length + delta.length > 6000) throw new ProviderError(502, 'Ответ AI слишком длинный.');
            text += delta; writeEvent(res, 'delta', { text: delta });
          }
          if (!text.trim()) throw new ProviderError(502, 'OpenAI вернул пустой ответ.');
          writeEvent(res, 'done', { text, actions });
        } catch (error) {
          if (!res.destroyed) writeEvent(res, 'error', { message: error instanceof ProviderError ? error.message : 'Не удалось получить ответ AI.' });
        } finally { res.end(); }
        return;
      }
      if (path === '/api/assistant/speech') {
        const input = await readJson(req); only(input, ['text']);
        if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 3000) fail('Введите текст до 3000 символов.');
        const controller = new AbortController(); res.on('close', () => controller.abort());
        const body = await speech({ text: input.text, apiKey: config.elevenlabsKey, voiceId: config.voiceId, fetchImpl, signal: controller.signal });
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        await pipeline(Readable.fromWeb(body), res);
        return;
      }
      const mime = req.headers['content-type']?.split(';')[0].trim();
      if (!audioTypes.has(mime)) fail('Поддерживаются audio/webm, mp4, mpeg, wav и ogg.', 415);
      const audio = await readBody(req, 10 * 1024 * 1024);
      if (!audio.length) fail('Запись пуста.');
      const controller = new AbortController(); res.on('close', () => controller.abort());
      sendJson(res, 200, await transcribe({ audio, mime, apiKey: config.elevenlabsKey, fetchImpl, signal: controller.signal }));
      } finally { active--; }
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const known = error instanceof InputError || error instanceof ProviderError;
      sendJson(res, known ? error.status : 500, { message: known ? error.message : 'Внутренняя ошибка сервера.' });
    }
  });
  app.requestTimeout = 45000;
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(4198, '127.0.0.1', () => console.log('AKIM assistant: http://127.0.0.1:4198'));
}
