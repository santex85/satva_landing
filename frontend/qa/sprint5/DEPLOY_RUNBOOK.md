# Runbook: деплой satva_landing (Docker + prod smoke)

## Диагностика до выката (Sprint 6)

Вставьте вывод трёх команд в тикет / чат (см. также [../sprint6/PROD_SMOKE.md](../sprint6/PROD_SMOKE.md)):

```bash
ssh root@152.42.186.191 "ls -la /var/www/satva-landing/frontend/yoga.html"
ssh root@152.42.186.191 "docker ps"
ssh root@152.42.186.191 "grep -R server_name /etc/nginx/sites-enabled/ 2>/dev/null | head -20"
```

## Быстрый выкат (Docker на хосте)

```bash
ssh root@152.42.186.191
cd /var/www/satva-landing
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build
docker compose -f docker-compose.prod.yml logs --tail=100 app nginx
```

Проверьте в `.env.deploy` на сервере: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, SMTP при необходимости.

**Если `cwebp` / WebP** ещё не сгенерированы в репозитории, на агенте/CI: `cd frontend && make yoga-webp`, затем коммит артефактов — или один раз сгенерировать на хосте после `git pull` (реже).

## Не Docker (host-nginx) — fallback

См. [DEPLOY.md](../../../DEPLOY.md) (около §179): `git pull`, `cd frontend && make yoga-build-prod` (и при смене фронта `make build-prod`), `systemctl reload nginx`, пути к `root` как на сервере.

## Почему `/yoga` отдаёт главную (index) вместо `yoga.html`

Пошаговая диагностика:

1. **Файл на диске**
   ```bash
   ssh root@152.42.186.191 "ls -la /var/www/satva-landing/frontend/yoga.html"
   ```
   Ожидание: файл есть, размер > 0, дата близка к последнему деплою.

2. **Кто обслуживает HTTP**
   ```bash
   ssh root@152.42.186.191 "docker ps --format 'table {{.Names}}\t{{.Image}}' ; which nginx 2>/dev/null; systemctl is-active nginx 2>/dev/null"
   ```
   Понять: трафик идёт в контейнер `nginx` или в системный `nginx` / Cloudflare → другой бэкенд.

3. **Nginx в Docker (ожидаемый конфиг репо)**
   - В compose volumes должны монтировать `./frontend` → `root` контейнера (см. `docker-compose.prod.yml` и [nginx.conf](../../../nginx.conf): `location = /yoga` → `yoga.html`).

4. **Nginx на хосте**
   ```bash
   ssh root@152.42.186.191 "grep -E 'root|yoga|server_name' /etc/nginx/sites-enabled/* 2>/dev/null | head -40"
   ```
   Убедиться, что `root` указывает на актуальную папку `frontend`, а не на старую копию только с `index.html`.

5. **Cloudflare**
   - В кэше мог лежать старый ответ: **Caching → Purge** для `https://satvasamui.site/yoga*`.

6. **После фикса — повторить smoke (ниже).**

## Post-deploy smoke

```bash
curl -I https://satvasamui.site/yoga
# Ожидание: HTTP/2 200, без лишнего редиректа (или ожидаемый 301/308 только если так настроено снаружи).

curl -s https://satvasamui.site/yoga | grep -c 'yoga.css'
# Ожидание: >= 1

curl -sS https://satvasamui.site/api/public-config | head -c 200
# Ожидание: JSON, не HTML главной. При необходимости: | jq .turnstileSiteKey
```

Ручные проверки: виджет Tawk, форма с меткой `[TEST]`, [Turnstile](https://dash.cloudflare.com/) → **Allowed domains** для `satvasamui.site` / `www`, [Rich Results Test](https://search.google.com/test/rich-results) по финальному URL `…/yoga`.

## Brotli (опционально)

В образе `nginx:alpine` нет `ngx_brotli`. Gzip включён в [nginx.conf](../../../nginx.conf). Для Brotli — смена образа или отдельный слой; вынести в отдельную задачу, если Profiling/Lighthouse покажет выигрыш.
