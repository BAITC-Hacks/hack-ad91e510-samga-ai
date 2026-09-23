# Сторонние компоненты frontend

## Three.js 0.186.0

`vendor/three/` содержит локальные модули Three.js и OrbitControls.
Автор: three.js authors. Лицензия MIT сохранена в `vendor/three/LICENSE`.
Исходный проект: <https://github.com/mrdoob/three.js>.

Версия зафиксирована, список URL и SHA-256 файлов — `vendor/three/manifest.json`.
Внесены только изменения путей импортов: OrbitControls использует локальный
renderer, renderer — локальный minified core. В браузере нет запросов к CDN.
Воспроизведение: `node frontend/scripts/vendor-three.mjs`.

Three.js используется только для геометрии, камеры и отрисовки карты.
Бюджет, правила и Quality of Life Score не зависят от графической библиотеки.

## OpenStreetMap

Границы районов, дороги, вода, парки и контуры зданий предоставлены участниками
OpenStreetMap под ODbL 1.0. Атрибуция отображается на карте. Точные источники,
даты срезов, ограничения покрытия и подготовка производной базы приведены
в [MAP-SOURCES.md](MAP-SOURCES.md).
