# Начать здесь — SAMGA AI

Основной интерфейс: **demos/astana-city/ — ASTANA / City Lab**.
Он сохраняет выбранную Каримом карту и подключён к общему серверу.
Один запуск из корня: `node backend/server.mjs`, адрес http://127.0.0.1:4197/.

## Что прочитать

1. [README.md](README.md) — воспроизведение, эталон и честный статус AI.
2. [Прогресс интеграции](docs/integration/progress.md) — SHA и фактические проверки.
3. [SOURCES.md](SOURCES.md) — участники, внешние материалы, исходные коммиты.
4. [Датасет DOCX](docs/brief-analysis/dist/sources/dataset.docx),
   [постановка PDF](docs/brief-analysis/dist/sources/brief.pdf).
5. [API](backend/README.md) и [аналитика](analytics/README.md).

## Карта кода

- demos/astana-city/app.mjs — существующая карта и «Сейчас / После решений».
- demos/astana-city/planner.mjs — каталог, выбор, результат и показ AI.
- demos/astana-city/session.mjs — HTTP-контракт и защита от устаревших ответов.
- frontend/lib/scenario.mjs и format.mjs — повторно используемый вклад Аслана.
- backend/server.mjs и static.mjs — один loopback сервер, публичные ресурсы по списку.
- analytics/scenarios.mjs — серверные сценарии/идентичность и проверка результатов.
- docs/brief-analysis/dist/model.mjs — единственная формула расчёта.
- backend/ai.mjs — OpenAI; analytics/grounding.mjs — проверка фактов и точные тексты.

GET /api/catalog даёт baseline и каталог. POST /api/simulate получает {choices};
весь его ответ передаётся в POST /api/analyze. Не подменяйте этот контракт
legacy-маршрутами отдельного frontend. LLM не рассчитывает Score.

## Границы

История Аслана и Меруерт сохранена. Основной checkout и параллельный
demos/astana-story не входят в эту интеграционную правку. При продолжении проверяйте
реальные ветки и незакоммиченные изменения; не переключайте чужую рабочую копию.

Без настроенного командного API режим demo явно обозначен «Без LLM».
Наличие конфигурации не равно живому пруфу; только успешный вызов подтверждает AI.
Не читайте ключи и не включайте backend/.env в Git или архив.

Сарайшык не имеет конкурсных данных. PDF о пяти направлениях и DOCX о пяти мерах
пока расходятся; до официального ответа работает модель DOCX.
Все числа учебные. Публичная публикация, push и PR merge требуют разрешения Карима.
