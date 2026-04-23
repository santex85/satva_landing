# Окружение Sprint 4

## Docker `docker compose up`

На машине агента **Docker daemon недоступен** (`unix:///…/docker.sock: no such file or directory`). Локальный стек `app` + `nginx` + `postgres` не поднят.

**Действие на стороне разработчика:** запустить Docker Desktop и выполнить `docker compose up -d` из корня репозитория; проверить `http://localhost/yoga` → `yoga.html`, `GET /api/public-config` → JSON с `turnstileSiteKey`.

## Статика для UI/ Lighthouse / Browser MCP

Для снимков и Lighthouse использовано:

`cd frontend && python3 -m http.server 8765` → `http://127.0.0.1:8765/yoga.html`

Ограничения:

- `POST /api/booking` **не** проверялся (нет бэкенда на том же origin).  
- Чистый URL `/yoga` без nginx — открыт `yoga.html` напрямую (эквивалент контента после редиректа в prod).

## Прод `https://satvasamui.site` (smoke, 2026-04-23)

| Запрос | Наблюдение |
|--------|------------|
| `GET /yoga` | `200`, но тело = главная `index.html` (детокс-лендинг), не `yoga.html` |
| `GET /yoga.html` | то же: размер/контент как у главной, не отдельный йога-файл |
| `GET /api/public-config` | отдаётся **HTML** главной, не JSON |

**Вывод:** на текущем прод-хосте нет согласованности с [nginx.conf](../../../nginx.conf) (rewrite `/yoga`, proxy `/api/`). Требуется выкат актуального фронта + nginx/бэкенда по [DEPLOY.md](../../../DEPLOY.md) и повторный smoke.

## Notion (часть F плана)

MCP Notion в этой среде не подключён. Вручную в доске `collection://2eab7a0f-ab79-4dbb-b436-fc69d624af29`:

- Закрыть задачи QA/Testing и Deploy по факту выкладки.
- Создать в этапе **5️⃣ Post-launch** карточки: WebP/форматы изображений, preconnect, аналитика, повтор Rich Results после прод-URL (по [lighthouse_yoga_desktop.md](lighthouse_yoga_desktop.md) и рискам [SPRINT4_ENV.md](SPRINT4_ENV.md)).
