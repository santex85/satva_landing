# QA Sprint 3b — йога-лендинг (форма, privacy, /yoga)

Проверки на `http://127.0.0.1:8765/yoga.html` (статика) и, после выкладки, на проде. **Sprint 4:** [SPRINT4_ENV.md](SPRINT4_ENV.md). **Sprint 5:** runbook — [../sprint5/DEPLOY_RUNBOOK.md](../sprint5/DEPLOY_RUNBOOK.md).

## Макет и регрессии

- [x] Секция формы (14): фон `cta_sunset`, glass-панель, логотип, поля читаемы на 1440 / 768 / 375 — скрины: `qa_sprint3b_form_1440.png`, `_768`, `_375`
- [x] Модалка privacy: открытие по ссылке в чекбоксе (делегирование `click` + `closest('.js-open-yoga-privacy')` в Sprint 5), закрытие по ×, overlay, Esc — *Browser MCP: повторный прогон после выката по желанию*
- [ ] Tab-цикл внутри модалки privacy не уходит за пределы диалога — *ручная проверка*
- [x] Полный скролл страницы: секции 00–14 без визуальных поломок — *визуально при навигации + Lighthouse full-page*

## Форма и API

- [ ] `GET /api/public-config` возвращает `turnstileSiteKey` — *локально не поднимался API; на проде сейчас HTML вместо JSON — см. SPRINT4_ENV.md*
- [ ] Успешная отправка: `POST /api/booking` с `procedure: "Йога-тур на Самуи"`, в ответ 2xx — *нужен docker или прод с рабочим /api/*
- [ ] Ошибка сети / 4xx / 5xx → красный блок `#yogaFormError`, Turnstile сброшен — *не гонялось в Sprint 4 (нет бэка)*

## Валидация и безопасность

- [ ] Консент снят → сообщение об ошибке, отправка не уходит
- [ ] Телефон короче 10 цифр → ошибка под полем / общая ошибка
- [ ] Honeypot: в DevTools заполнить `#yogaWebsite` → ожидается ошибка от API (400)
- [ ] Cooldown: две отправки подряд быстрее 5 с → предупреждение

## Доступность и motion

- [ ] `prefers-reduced-motion: reduce`: параллакс и pulse CTA отключены (как ранее) — *не проверялось в DevTools Rendering в этом прогоне*
- [x] Консоль без критичных ошибок на статике; 404 — не наблюдались на базовом проходе *при сценариях Lighthouse/браузера*

## Lighthouse (desktop, при необходимости)

- [x] Performance ≥ 85 — **88** (см. [lighthouse_yoga_desktop.md](lighthouse_yoga_desktop.md))
- [x] Accessibility ≥ 95 — **96**
- [x] SEO ≥ 95 — **100**

## JSON-LD

- [x] Тип `LodgingBusiness` в разметке; Lighthouse: structured data valid — см. [rich_results.md](rich_results.md)
- [ ] Google Rich Results Test по **живому** prod-URL — после фикса деплоя

## Прод (после деплоя)

- [ ] `https://satvasamui.site/yoga` открывается (rewrite на `yoga.html`) — **сейчас не выполняется** (отдаётся главная), см. SPRINT4_ENV.md
- [ ] Тестовая заявка с прода, уведомление
- [ ] `curl` статики, `/api/public-config` JSON, Turnstile domains

---

**Примечание:** схема `POST /api/contact` с полями `preferred_date` / `booking_comment` для йога-лендинга **не используется**; заявки идут в `POST /api/booking` с полем `comment` (см. `BookingRequest`).
