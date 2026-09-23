# АКИМ / SAMGA AI — мобильные демо

В пакете два независимых SwiftUI-прототипа для iPhone. Они демонстрируют две роли и не синхронизируются с веб-панелью, друг с другом или городскими системами.

| Роль | Каталог | Проверенный маршрут |
|---|---|---|
| Аким | [`akim/`](akim/README.md) | События → карточка → «Взять на контроль»; Помощник → «Проект поручения» → «Сохранить черновик» |
| Житель | [`citizen/`](citizen/README.md) | Фото → «Посмотреть пример» → «Продолжить» → проверка адреса → «Отправить в демо» → №104 → «Открыть обращение» → «Получено» |

Откройте [страницу просмотра](index.html) в браузере или передайте её AI-судье: она показывает только реальные iPhone-снимки из [`preview/`](preview/).

## Что в пакете

- Исходники Swift, тесты, `project.yml`, `Package.swift` (где он есть), ресурсы и README обеих ролей.
- Происхождение иллюстраций акима: [`akim/Resources/demo-image-sources.md`](akim/Resources/demo-image-sources.md).
- Не включены сборки, `.build`, `Delivery`, `.git`, логи, состояния устройств, ключи и конфигурации с секретами.

## Запуск нативной версии

Нужны macOS, Xcode, XcodeGen и любой доступный iOS Simulator. Выберите доступный идентификатор симулятора командой:

```sh
xcrun simctl list devices available
```

Соберите роль акима:

```sh
cd mobile/akim
xcodegen generate --spec project.yml
xcodebuild -project AKIM.xcodeproj -scheme AKIM -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=ИМЯ_ДОСТУПНОГО_СИМУЛЯТОРА' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

Соберите роль жителя и выполните её независимые unit-тесты:

```sh
cd mobile/citizen
xcodegen generate --spec project.yml
xcodebuild -project AKIMCitizen.xcodeproj -scheme AKIMCitizen -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=ИМЯ_ДОСТУПНОГО_СИМУЛЯТОРА' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
swift test
```

Конкретный Mac, Xcode и симулятор должны быть проверены перед показом. Этот пакет не обещает работу камеры в симуляторе: там используйте галерею или подготовленный пример.

## Честные границы

Все карточки, сроки, адреса, статусы и изображения учебные. «Взять на контроль», чаты и черновики акима локальны. Обращение жителя сохраняется на устройстве; «Отправить в демо» не отправляет его в городские службы. Анализ AI возможен только после самостоятельного ввода ключа пользователем и не подтверждён в этом пакете.
