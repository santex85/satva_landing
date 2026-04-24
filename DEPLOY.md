# Инструкция по деплою Satva Samui Landing

Для будущих агентов и разработчиков: как выкатить обновления на прод-сервер.

---

## Сервер

- **Хост:** `152.42.186.191`
- **Пользователь:** `root` (SSH по ключу)
- **Домен:** https://satvasamui.site
- **Каталог проекта на сервере:** `/var/www/satva-landing` (или иной путь к клону репозитория)
- **Владелец файлов:** при раздаче только статики — `www-data`; при Docker — файлы репо могут принадлежать root/deploy-пользователю
- **Веб-сервер:** nginx на хосте (TLS, Certbot) + опционально стек в Docker (см. ниже)

---

## Прод: Docker (`docker-compose.prod.yml`) + nginx на хосте

Полный стек как в ТЗ: **Postgres + FastAPI + nginx в контейнерах**. Наружу на хосте публикуется только **127.0.0.1:9080** (контейнерный nginx). TLS и домен остаются на **системном nginx** с `proxy_pass` на `http://127.0.0.1:9080`.

### 1. На сервере

- Установлены **Docker** и **Docker Compose v2**.
- В корне репозитория лежат `docker-compose.prod.yml`, `frontend/`, `server/`, `nginx.conf`.

### 2. Секреты

Создай файл **`server/.env`** (не в git): `JWT_SECRET`, `SMTP_*`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`, `CORS_ORIGINS=https://satvasamui.site`, и т.д. (см. `server/.env.example`).

Для Postgres задай пароль при запуске compose, например файл **`.env.deploy`** в корне репо (не коммитить):

```env
POSTGRES_USER=satva
POSTGRES_PASSWORD=сгенерируй-надёжный-пароль
POSTGRES_DB=satva
```

Переменная `DATABASE_URL` в сервисе `app` в `docker-compose.prod.yml` собирается из этих значений и должна совпадать с пользователем/паролем БД.

### 3. Запуск

```bash
cd /path/to/satva_landing
docker compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build
```

Миграции Alembic выполняются при старте контейнера `app` (`docker-entrypoint.sh`).

### 4. Nginx на хосте (HTTPS)

Для `server_name satvasamui.site` вместо `root` на статику используй прокси на контейнер:

```nginx
location / {
    proxy_pass http://127.0.0.1:9080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Проверка: `nginx -t && systemctl reload nginx`.

### 5. SMTP (письма о заявках)

После сохранения заявки в БД приложение шлёт письмо на `SMTP_TO` (можно несколько адресов через запятую). Обязательны **`SMTP_HOST`** и **`SMTP_TO`**; при пустых значениях почта просто не отправляется, ответ пользователю остаётся успешным.

Заполни в **`server/.env`:**

| Переменная | Назначение |
|------------|------------|
| `SMTP_HOST`, `SMTP_PORT` | Хост и порт (часто **587** — STARTTLS, **465** — сразу TLS) |
| `SMTP_USER`, `SMTP_PASSWORD` | Логин SMTP и пароль (у Gmail — [пароль приложения](https://support.google.com/accounts/answer/185833)) |
| `SMTP_FROM` | Адрес «От» (часто совпадает с `SMTP_USER`) |
| `SMTP_TO` | Кому дублировать заявки |
| `SMTP_USE_SSL` | `true`, если провайдер требует implicit TLS на нестандартном порту; порт **465** обрабатывается автоматически |

Порты: **587** — соединение без TLS, затем `STARTTLS` и при наличии логина — авторизация. **465** — `SMTP_SSL` сразу. Ошибки SMTP пишутся в лог контейнера `app`; при сбое доставки заявка в PostgreSQL уже сохранена.

### 6. Капча Cloudflare Turnstile

В панели Cloudflare Turnstile в списке **доменов сайта** (allowed hostnames) должны быть: **`satvasamui.site`**, а для локальной отладки — **`localhost`**, **`127.0.0.1`**.  
Страница **йога-тура** (`/yoga` и `/yoga.html`) использует тот же `turnstileSiteKey` с бэкенда (`GET /api/public-config`); отдельный ключ не нужен.

Ключи прописать в `server/.env`. Если секрет задан, а ключ сайта нет — виджет не появится; в проде должны быть оба.

Локально при открытии сайта как `http://localhost/…` или `http://127.0.0.1/…` бэкенд **не требует** Turnstile (проверка отключена по заголовку `Host`). На бою с реальным доменом капча обязательна, если задан `TURNSTILE_SECRET_KEY`.

### 7. Обновление кода

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build
```

---

## Шаги деплоя (только статика, без Docker API)

### 1. Подключиться по SSH

```bash
ssh root@152.42.186.191
```

Или выполнять команды одной строкой через `ssh root@152.42.186.191 "команда"`.

### 2. Перейти в каталог проекта

```bash
cd /var/www/satva-landing
```

### 3. Обновить код из Git

```bash
git fetch origin
git pull origin main
```

Если Git ругается на «dubious ownership», один раз выполнить:

```bash
git config --global --add safe.directory /var/www/satva-landing
```

### 4. Собрать CSS (обязательно)

Статика в каталоге **`frontend/`**. SCSS собирается так:

```bash
cd frontend && make css
```

Или:

```bash
cd frontend && sass css/main.scss css/main.css --style=expanded
```

Production (минификация):

```bash
cd frontend && make build-prod
```

### 5. Права на файлы

Чтобы nginx мог читать файлы:

```bash
chown -R www-data:www-data /var/www/satva-landing
```

### 6. Перезагрузить nginx (при необходимости)

Если меняли конфиг nginx или нужно применить изменения:

```bash
nginx -t && systemctl reload nginx
```

---

## Одной командой с локальной машины

**Короткий путь из корня репозитория** (тот же сценарий, что и SSH-строки ниже; хост и путь можно переопределить: `make deploy-prod DEPLOY_HOST=… DEPLOY_PATH=…`):

```bash
make deploy-prod
```

Минифицированный CSS на сервере: `make deploy-prod-min`.

---

С тем же сценарием вручную (при настроенном доступе по SSH):

```bash
ssh root@152.42.186.191 "cd /var/www/satva-landing && git config --global --add safe.directory /var/www/satva-landing 2>/dev/null; git fetch origin && git pull origin main && cd frontend && make css && cd .. && chown -R www-data:www-data /var/www/satva-landing && nginx -t && systemctl reload nginx && echo Deploy OK"
```

`safe.directory` выполняется один раз; при повторных деплоях можно использовать короткий вариант:

```bash
ssh root@152.42.186.191 "cd /var/www/satva-landing && git pull origin main && cd frontend && make css && make yoga-css && cd .. && chown -R www-data:www-data /var/www/satva-landing && systemctl reload nginx && echo Deploy OK"
```

Для продакшн-CSS (минификация): `make build-prod && make yoga-build-prod` вместо `make css && make yoga-css` (или `make deploy-prod-min` с локального корня репо).

---

## Проверка после деплоя

- Открыть https://satvasamui.site и убедиться, что загружается новая версия.
- При необходимости: жёсткое обновление (Ctrl+F5 / Cmd+Shift+R) или проверка в режиме инкогнито — возможен кэш браузера или CDN.

---

## Карта в футере

В футере отображаются **иконка и ссылка** на точку Satva Samui в Google Maps (открывается на стороне Google). Отдельный API-ключ Google Maps и эндпоинт `/api/config` **не используются**.

---

## Лендинг йога-тура (`/yoga`)

- **Файл:** `frontend/yoga.html`; статика: `css/yoga.css`, `js/yoga.js`, `img/yoga_tour/`, `video/`.
- **Nginx (Docker):** в корневом `nginx.conf` задано `location = /yoga { rewrite ^ /yoga.html last; }` — открытие `https://домен/yoga` без `.html`.
- **Сборка CSS в проде:** из каталога `frontend/`: `make yoga-build-prod` (минифицированный `yoga.css`). В составной деплой имеет смысл включать и `make build-prod` (главный лендинг), и `make yoga-build-prod`.
- **Форма** на лендинге шлёт `POST /api/booking` (JSON) — тот же бэкенд, что и форма бронирования на `index.html`.

---

## Зависимости на сервере

- **git** — для pull
- **sass** (Dart Sass) — для сборки CSS (`make css`). Установка, если нет:  
  - через npm: `npm install -g sass`  
  - или пакетом, если есть в репозитории ОС
- **nginx** — раздача статики из `/var/www/satva-landing/frontend` (актуальная вёрстка) или прокси на Docker (см. выше)

---

## Репозиторий на сервере

- **Remote:** `git@github.com:santex85/satva_landing.git`
- **Ветка для деплоя:** `main`
- На GitHub должен быть добавлен SSH-ключ сервера («Server landing»), чтобы `git pull` работал без пароля.
