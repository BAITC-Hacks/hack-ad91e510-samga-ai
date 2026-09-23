# AKIM assistant service

Локальный Node.js 24 сервис без npm-зависимостей. Запуск из этого каталога:

```sh
node server.mjs
```

Сервис слушает только `127.0.0.1:4198`. Страница должна работать с `http://127.0.0.1:8095` или `http://localhost:8095`. Другие `Origin` отклоняются; для любого POST заголовок `Origin` обязателен. Ключи можно ввести через локальную панель (POST `/api/assistant/config`) либо передать переменными `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_MODEL`, `ELEVENLABS_VOICE_ID`. Файл `.env` сервис не читает. Значения, отправленные в `/config`, хранятся только в памяти процесса и исчезают после его завершения. Ключи не появляются в ответах, логах и файлах.

| Маршрут | Вход | Выход |
| --- | --- | --- |
| `GET /api/assistant/status` | — | `{openai, elevenlabs, model, voiceId}` |
| `POST /api/assistant/config` | JSON `{openaiKey?, elevenlabsKey?, model?, voiceId?}` | Только статус, без ключей |
| `POST /api/assistant/chat` | JSON `{message, choices, selectedDistrict?, history?}` | SSE `meta`, `delta`, `done` либо `error` |
| `POST /api/assistant/speech` | JSON `{text}` | Поток `audio/mpeg` |
| `POST /api/assistant/transcribe` | Сырые байты аудио с `Content-Type: audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav` или `audio/ogg` | JSON `{text}` |

Чат отправляет только серверный пересчёт решений из `demos/astana-story/comparison.mjs`. Для 0–4 допустимых мер возвращается `meta.facts.draft: true`, `score: null` и исходные показатели; завершённый балл вычисляется только для пяти допустимых мер. `meta.comparison` содержит три канонических варианта с `id`, `title`, `cost`, `score`, `critical` и районными показателями. `done.actions` ограничены типами `focus_comparison`, `focus_district`, `select_preset`. История ограничена восемью сообщениями (`user`/`assistant`), ключи не передаются в браузерный чат.

Лимиты: JSON 16 KiB, запись 10 MiB, два одновременных запроса, ответ AI 6000 символов. Ответ OpenAI идёт через Responses API с `stream:true`, `store:false`; звук — ElevenLabs Flash v2.5; распознавание — Scribe v2. Ошибка провайдера передаётся безопасным сообщением без тела ответа или ключа. Без ключа сервис возвращает явную ошибку подключения, а не демонстрационный AI-ответ.

Проверка:

```sh
node --test test/*.test.mjs
```

Официальные API: [OpenAI Responses](https://platform.openai.com/docs/api-reference/responses), [ElevenLabs stream speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), [ElevenLabs speech-to-text](https://elevenlabs.io/docs/api-reference/speech-to-text/convert).
