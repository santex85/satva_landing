# Инструкция по деплою Satva Samui Landing

Для будущих агентов и разработчиков: как выкатить обновления на прод-сервер.

---

## Сервер

- **Хост:** `152.42.186.191`
- **Пользователь:** `root` (SSH по ключу)
- **Домен:** https://satvasamui.com
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

Создай файл **`server/.env`** (не в git): `JWT_SECRET`, `RESEND_*`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_SITE_KEY`, `CORS_ORIGINS=https://satvasamui.com,https://www.satvasamui.com,https://satvasamui.ru,https://www.satvasamui.ru`, и т.д. (см. `server/.env.example`). На `.ru` формы шлют запросы cross-origin на `https://satvasamui.com/api` — без `.ru` в CORS заявки с русского домена не пройдут.

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

Для `server_name satvasamui.com` вместо `root` на статику используй прокси на контейнер:

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

### 5. Email-уведомления (Resend)

После сохранения заявки в БД приложение шлёт письмо на `RESEND_TO` (можно несколько адресов через запятую). Обязательны **`RESEND_API_KEY`**, **`RESEND_FROM`** и **`RESEND_TO`**; при пустых значениях почта просто не отправляется, ответ пользователю остаётся успешным.

Заполни в **`server/.env`:**

| Переменная | Назначение |
|------------|------------|
| `RESEND_API_KEY` | API-ключ из [Resend Dashboard](https://resend.com/api-keys) |
| `RESEND_FROM` | Адрес «От» с подтверждённым доменом, напр. `Satva Samui <hello@satvasamui.com>` (не используйте `noreply@`) |
| `RESEND_TO` | Кому дублировать заявки (один или несколько адресов через запятую) |

Домен отправителя нужно подтвердить в Resend ([DNS-записи](https://resend.com/domains)). Ошибки отправки пишутся в лог контейнера `app`; при сбое доставки заявка в PostgreSQL уже сохранена.

### 6. Капча Cloudflare Turnstile

В панели Cloudflare Turnstile в списке **доменов сайта** (allowed hostnames) должны быть: **`satvasamui.com`**, **`www.satvasamui.com`**, а для локальной отладки — **`localhost`**, **`127.0.0.1`**.  
Страница **йога-тура** (`/yoga` и `/yoga.html`) использует тот же `turnstileSiteKey` с бэкенда (`GET /api/public-config`); отдельный ключ не нужен.

Ключи прописать в `server/.env`. Если секрет задан, а ключ сайта нет — виджет не появится; в проде должны быть оба.

Локально при открытии сайта как `http://localhost/…` или `http://127.0.0.1/…` бэкенд **не требует** Turnstile (проверка отключена по заголовку `Host`). На бою с реальным доменом капча обязательна, если задан `TURNSTILE_SECRET_KEY`.

### 7. Обновление кода

```bash
git checkout -- frontend/css/main.css frontend/css/yoga.css 2>/dev/null || true
git pull origin main
cd frontend && make build-all && cd ..
docker compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.deploy restart nginx
```

На сервере **хостовый nginx** раздаёт `frontend/` напрямую (не через Docker). После изменений в `deploy/nginx-host-satvasamui.com.conf`:

```bash
cp deploy/nginx-host-satvasamui.com.conf /etc/nginx/sites-available/satvasamui.com
ln -sf /etc/nginx/sites-available/satvasamui.com /etc/nginx/sites-enabled/satvasamui.com
nginx -t && systemctl reload nginx
```

### Админка

Панель заявок **не** доступна по `/admin.html` (404). Рабочий URL:

**https://satvasamui.com/samui-ctl-x7f2**

Файл в репозитории: `frontend/samui-ctl-x7f2.html`. Прямой доступ к `*.html` этого пути тоже закрыт в nginx.


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

Собранные в репозитории файлы `frontend/css/main.css` и `frontend/css/yoga.css` иногда оказываются с локальными правками на сервере (например после ручного `sass`), и `git pull` прерывается с *«Your local changes would be overwritten»*. Перед pull сбросьте только их (после pull всё равно пересоберите CSS шагом 4):

```bash
git checkout -- frontend/css/main.css frontend/css/yoga.css
```

Далее:

```bash
git fetch origin
git pull origin main
```

Если Git ругается на «dubious ownership», один раз выполнить:

```bash
git config --global --add safe.directory /var/www/satva-landing
```

### 4. Собрать CSS (обязательно)

Статика в каталоге **`frontend/`**. Главная отдаёт йога-лендинг и подключает **`css/yoga.css`** — собирайте **оба** бандла:

```bash
cd frontend && make build-all
```

Только основной лендинг (legacy `index.legacy.html`, `privacy` и т.д.):

```bash
cd frontend && make css
```

Или вручную:

```bash
cd frontend && sass css/main.scss css/main.css --style=expanded
sass css/yoga.scss css/yoga.css --style=expanded
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
ssh root@152.42.186.191 "cd /var/www/satva-landing && git config --global --add safe.directory /var/www/satva-landing 2>/dev/null; git fetch origin && git checkout -- frontend/css/main.css frontend/css/yoga.css 2>/dev/null || true && git pull origin main && cd frontend && make build-all && cd .. && chown -R www-data:www-data /var/www/satva-landing && nginx -t && systemctl reload nginx && echo Deploy OK"
```

`safe.directory` выполняется один раз; при повторных деплоях можно использовать короткий вариант:

```bash
ssh root@152.42.186.191 "cd /var/www/satva-landing && git checkout -- frontend/css/main.css frontend/css/yoga.css 2>/dev/null || true && git pull origin main && cd frontend && make build-all && cd .. && chown -R www-data:www-data /var/www/satva-landing && systemctl reload nginx && echo Deploy OK"
```

Для продакшн-CSS (минификация): `make build-prod && make yoga-build-prod` вместо `make css && make yoga-css` (или `make deploy-prod-min` с локального корня репо).

---

## Проверка после деплоя

- Открыть https://satvasamui.com и убедиться, что загружается новая версия.
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

## Админ-панель v2

- **URL:** `https://satvasamui.com/samui-ctl-x7f2` (путь задаётся `ADMIN_PATH` в `server/.env`, синхронизировать с nginx).
- **Первый owner:** на сервере в контейнере или локально с `DATABASE_URL`:
  ```bash
  cd server && python scripts/create_admin.py owner@example.com 'strong-password'
  ```
  Скрипт создаёт пользователя с ролью `owner`.
- **Приглашения:** owner приглашает manager/owner по email (`POST /api/admin/users/invite`); письмо через Resend. Срок — `INVITE_EXPIRE_HOURS` (по умолчанию 72).
- **Новые переменные в `server/.env`:**

| Переменная | Назначение |
|------------|------------|
| `ADMIN_PATH` | Обфусцированный путь админки без слэша, напр. `samui-ctl-x7f2` |
| `SITE_BASE_URL` | Базовый URL для ссылок в письмах, напр. `https://satvasamui.com` |
| `INVITE_EXPIRE_HOURS` | Срок жизни приглашения в часах (по умолчанию 72) |
| `JWT_SECRET` | **Обязателен на проде** — не дефолт `change-me-in-production`; иначе приложение не стартует |

- **Миграции:** `005`–`007` (роли, приглашения, заметки, аудит) применяются при старте контейнера `app`.
- **noindex:** nginx отдаёт `X-Robots-Tag: noindex, nofollow` для пути админки; в `frontend/robots.txt` — `Disallow` для того же пути.

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
