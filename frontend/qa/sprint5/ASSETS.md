# Ассеты `img/yoga_tour` (йога-лендинг)

Сводка для ТЗ §13: файлы в репо не нулевые; `download_assets.sh` проверяет `-s` после curl. Пустые wix-прокси (`*~mv2.*`, `*f000.jpg`) в `.gitignore`, не коммитятся.

## Используются в `yoga.html`

| Роль | JPEG/PNG (bytes) | WebP (bytes) | Примечание |
|------|------------------|--------------|------------|
| Hero LCP | hero_sunset@1x.jpg (677330) | hero_sunset@1x.webp (29236) | q90 для webp; max 1280px, без @2x |
| OG/JSON-LD | hero_sunset.jpg (= копия канон.) | hero_sunset.webp (29236) | дубль имени для совместимости |
| §05 beach bg | beach_day.jpg | beach_day.webp | image-set |
| §06 | yoga_platform.jpg | yoga_platform.webp | picture |
| §07 | food_healthy.jpg | food_healthy.webp | |
| §08 | room_twin, room_superior | *.webp | |
| §11 team ×5 | team_*.jpg | team_*.webp | |
| §12 | excursion_temple, club_evening | *.webp | |
| §14 form bg | beach_sunset.jpg (1471310) | beach_sunset.webp (840942) | **Sprint 6:** замена битого cta_sunset |
| Иконки §04 | icon_*.png | icon_*.webp (опц.) | в HTML пока PNG |

## Не в HTML, но в папке

См. `ls img/yoga_tour/` — запасные/старые загрузки (ayurveda_*, beach_calm, …). При уборке не удалять без проверки ссылок из других страниц.

## Пересборка WebP

```bash
cd frontend && make yoga-webp
# Hero с градиентом неба — при артефактах:
cwebp -q 90 img/yoga_tour/hero_sunset.jpg -o img/yoga_tour/hero_sunset.webp
cwebp -q 90 img/yoga_tour/hero_sunset@1x.jpg -o img/yoga_tour/hero_sunset@1x.webp
```
