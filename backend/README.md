# SAMGA AI — backend Меру

Node.js 24+, встроенные HTTP/fetch/test, без внешних пакетов и установки зависимостей.
Основа из ветки `meru/ai`; проверяемая аналитика расширяет этот backend. Полный новый контракт: [analytics/README.md](../analytics/README.md).

## Быстрое воспроизведение

Команды из корня репозитория, PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
node --env-file=backend/.env backend/server.mjs
```

В другом терминале:

```powershell
node backend/demo.mjs
node --test backend/test/api.test.mjs docs/brief-analysis/test/model.test.mjs
```

Пример использует решения организатора. Ожидается Score около 56.54307,
стоимость 95 и `mode: "demo"`. Деморежим явно возвращает шаблон, не выдаёт
его за AI и не обращается в сеть. Сервер слушает только 127.0.0.1:3001.

## Живой AI

В локальном `backend/.env` задать `AI_MODE=openai`, `OPENAI_API_KEY`,
`OPENAI_MODEL` — доступную вашей команде модель Responses API с поддержкой
strict Structured Outputs. Перезапустить сервер и повторить `node backend/demo.mjs`.
Без ключа/модели анализ вернёт 503; simulator продолжит работать.
Наличие значений в health означает только конфигурацию, не проверку доступа к API.
Ключ никогда не передаётся в браузер, не логируется и не добавляется в Git.

Используется POST /v1/responses, `text.format.type=json_schema`,
`strict=true`, `store=false`; структура сверена с
[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
Модель намеренно не зафиксирована: доступ команды не проверен.

## Ответственность компонентов

- Frontend выбирает меры, отображает числа simulator и отдельно текст AI.
- `simulator-adapter.mjs` вызывает существующий engine Карима и копирует его результат.
- `contracts.mjs` задаёт контракт v1 и проверяет структуру/диапазоны.
- `ai.mjs` передаёт проверенный JSON и факты в OpenAI; принимает только допустимые ID фактов, после чего сервер формирует текст.
- `server.mjs` обрабатывает HTTP, ошибки, CORS и ограничение параллельных AI-запросов.

**OpenAI не рассчитывает Score.** В ответе /api/analyze поле `score`
копируется из `input.result.score`. В схеме AI-ответа числовых полей нет.
Структурированный AI-ответ содержит только ID фактов и следующее действие; числовые оценки и фактический текст формирует сервер.
Рекомендации являются гипотезами, пока simulator не оценит новый набор.
Проверяются существование фактов и их допустимость как улучшений/рисков. Полнота выбора фактов и понимание свободного запроса требуют оценки на живой модели.

## Контракт frontend → simulator → AI

| Endpoint | Назначение |
|---|---|
| GET /api/health | Работоспособность и режим, без секретов |
| GET /api/contracts | Машиночитаемые requestSchema, analysisSchema, simulateSchema |
| POST /api/simulate | Принимает `{choices}`, вызывает engine, возвращает контракт v1 |
| POST /api/analyze | Принимает готовый контракт v1, возвращает объяснение |

Пример запроса симуляции:

```json
{"choices":[{"id":"M7","district":"Нура"},{"id":"M8","district":"Нура"},{"id":"M10","district":"Нура"},{"id":"M12"},{"id":"M5","district":"Сарыарка"}]}
```

Городская мера не имеет поля district. Ответ симуляции:
`{contractVersion:"1", scenarioId, choices, baseline, result}`.
baseline/result содержат cost, score, average, minimum, critical, districts, synergies.
У района — name, pop, values (все 10 показателей), score, critical.
Адаптер удаляет описательные profile и служебное errors из успешного результата engine.

Отправьте весь ответ /api/simulate без изменений в /api/analyze.
Ответ:
`{contractVersion:"1",scenarioId,score,mode,analysis}`.
analysis содержит summary и массивы strengths, risks, recommendations.
Элемент массива: `{text, evidence:["result.districts"]}`; допустимые ссылки перечислены в схеме.
Frontend должен показывать mode=demo и вставлять текст как текст, не как HTML.
scenarioId связывает ответ с планом: после изменения решений игнорируйте устаревший AI-ответ.

```javascript
async function post(path, data) {
  const response = await fetch('http://127.0.0.1:3001' + path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw body.error;
  return body;
}
const simulation = await post('/api/simulate', {choices});
// Сначала отрисовать simulation.result: доступен даже при ошибке AI.
try {
  const explanation = await post('/api/analyze', simulation);
  // Отдельно отрисовать explanation.analysis и explanation.mode.
} catch (error) {
  // Сохранить числовой результат и показать error.message + кнопку повтора.
}
```

FRONTEND_ORIGIN должен точно совпадать с origin сайта; по умолчанию
http://127.0.0.1:4193. localhost и 127.0.0.1 — разные origin.

## Ошибки

Формат: `{error:{code,message,requestId,details?}}`.

| HTTP | Коды |
|---|---|
| 400 / 413 / 415 | INVALID_JSON / BODY_TOO_LARGE / CONTENT_TYPE |
| 422 | VALIDATION_ERROR, INVALID_SCENARIO |
| 403 / 404 / 405 | ORIGIN_DENIED / NOT_FOUND / METHOD_NOT_ALLOWED |
| 429 | AI_BUSY, AI_RATE_LIMIT |
| 503 | AI_NOT_CONFIGURED, AI_AUTH_ERROR |
| 504 | AI_TIMEOUT |
| 502 | AI_CONNECTION_ERROR, AI_UPSTREAM_ERROR, AI_REFUSAL, AI_INCOMPLETE, AI_INVALID_RESPONSE |
| 500 | INTERNAL_ERROR |

Ожидание OpenAI ограничено 20 секундами, тело запроса — 64 KiB,
одновременно выполняются до двух AI-запросов. Автоматических платных повторов нет.
Ошибка провайдера не подменяется незаметно деморезультатом.

## Границы текущего этапа

Это локальный backend для командной демонстрации. Рабочий экран аналитики доступен на корневом маршруте backend; отдельный командный frontend требует интеграции.
Числа /api/analyze повторно рассчитываются по choices. Несоответствие baseline/result/scenarioId отвергается до AI. scenarioId зависит от выбора, версии модели и данных.
Перед публичным размещением потребуется серверное хранение/подпись результатов,
авторизация и ограничение запросов по пользователям. CORS не является авторизацией.
Формулу, данные и UI Карима этот этап не меняет.

Тесты используют заглушку OpenAI и проверяют HTTP, контракты, копирование чисел,
обработку отказов/таймаута, ограничения и совместимость с настоящим engine.
Живой вызов нужно отдельно проверить с ключом и моделью команды.
