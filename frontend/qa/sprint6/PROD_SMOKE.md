# Prod smoke — Sprint 6

Заполнить **после выката** по [DEPLOY_RUNBOOK.md](../sprint5/DEPLOY_RUNBOOK.md).

## Команды (ожидаемый зелёный прогон)

```bash
curl -I https://satvasamui.site/yoga
curl -s https://satvasamui.site/yoga | head -20
curl -s https://satvasamui.site/api/public-config
curl -sI https://satvasamui.site/css/yoga.css
curl -sI https://satvasamui.site/img/yoga_tour/hero_sunset.webp
```

## Результаты

| Проверка | Статус | Комментарий |
|----------|--------|-------------|
| `/yoga` → 200, body с `yoga.css` | ⏳ | |
| `/api/public-config` → JSON | ⏳ | |
| Статика 200 | ⏳ | |

**Дата / исполнитель:** _вручную_
