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

Начните в новом терминале из корня репозитория, как и для первой роли.

```sh
cd mobile/citizen
xcodegen generate --spec project.yml
xcodebuild -project AKIMCitizen.xcodeproj -scheme AKIMCitizen -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=ИМЯ_ДОСТУПНОГО_СИМУЛЯТОРА' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
swift test
```

После сборки установите приложение на выбранный симулятор. Из папки соответствующей роли замените UUID на значение из `xcrun simctl list devices available`:

```sh
AKIM_SIM_ID='UUID_ВАШЕГО_СИМУЛЯТОРА'
xcrun simctl boot "$AKIM_SIM_ID"
# Для акима, из mobile/akim:
xcrun simctl install "$AKIM_SIM_ID" build/Build/Products/Debug-iphonesimulator/AKIM.app
xcrun simctl launch "$AKIM_SIM_ID" kz.hackalem.akim --demo
# Для жителя, из mobile/citizen, вместо двух предыдущих команд:
xcrun simctl install "$AKIM_SIM_ID" build/Build/Products/Debug-iphonesimulator/AKIMCitizen.app
xcrun simctl launch "$AKIM_SIM_ID" kz.hackalem.akim.citizen.demo
```

Если выбранный симулятор уже Booted, команду `boot` пропустите. Запускайте только команды выбранной роли.

Конкретный Mac, Xcode и симулятор должны быть проверены перед показом. Этот пакет не обещает работу камеры в симуляторе: там используйте галерею или подготовленный пример.

## Честные границы

Все карточки, сроки, адреса, статусы и изображения учебные. «Взять на контроль», чаты и черновики акима локальны. Обращение жителя сохраняется на устройстве; «Отправить в демо» не отправляет его в городские службы. Анализ AI возможен только после самостоятельного ввода ключа пользователем и не подтверждён в этом пакете.
