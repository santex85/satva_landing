# JSON-LD (йога-лендинг) — валидация

## Источник

Фрагмент `application/ld+json` в [frontend/yoga.html](../../yoga.html): `@type: LodgingBusiness` (Satva Samui Retreat Hotel), поля `name`, `url`, `image`, `address`, `geo`, `starRating`, `amenityFeature`, `sameAs`.

## Локальные проверки (Sprint 4)

- **Синтаксис JSON** — объект в `yoga.html` корректен (ручной разбор, без trailing comma).  
- **Lighthouse (локальный прогон)** — аудит «Structured data is valid» (см. [lighthouse_yoga_desktop.json](lighthouse_yoga_desktop.json), ключ `audits["structured-data"]`).

## Google Rich Results Test (ручной шаг)

План: прогнать **опубликованный** URL страницы йога-тура (после исправления прод-деплоя) в [Rich Results Test](https://search.google.com/test/rich-results).

- Пока на `https://satvasamui.site/yoga` отдаётся **не** `yoga.html` (см. `SPRINT4_ENV.md`) — внешний тест бессмысленен до фикса nginx/статики.  
- После выкладки: вставить финальный `https://…/yoga` или `https://…/yoga.html` и сохранить скрин/ссылку «Page is eligible for …» в этот файл при следующем прогоне.
