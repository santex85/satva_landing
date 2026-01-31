# Инструкция по деплою Satva Samui Landing

Для будущих агентов и разработчиков: как выкатить обновления на прод-сервер.

---

## Сервер

- **Хост:** `152.42.186.191`
- **Пользователь:** `root` (SSH по ключу)
- **Домен:** https://satvasamui.site
- **Каталог проекта на сервере:** `/var/www/satva-landing`
- **Владелец файлов:** `www-data:www-data` (для nginx)
- **Веб-сервер:** nginx

---

## Шаги деплоя

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

Проект использует SCSS; на сервере должен быть установлен `sass`. Сборка через Makefile:

```bash
make css
```

Или вручную:

```bash
sass css/main.scss css/main.css --style=expanded
```

Для production-сборки (минифицированный CSS):

```bash
make build-prod
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

С локального компьютера (при настроенном доступе по SSH):

```bash
ssh root@152.42.186.191 "cd /var/www/satva-landing && git config --global --add safe.directory /var/www/satva-landing 2>/dev/null; git fetch origin && git pull origin main && make css && chown -R www-data:www-data /var/www/satva-landing && nginx -t && systemctl reload nginx && echo Deploy OK"
```

`safe.directory` выполняется один раз; при повторных деплоях можно использовать короткий вариант:

```bash
ssh root@152.42.186.191 "cd /var/www/satva-landing && git pull origin main && make css && chown -R www-data:www-data /var/www/satva-landing && systemctl reload nginx && echo Deploy OK"
```

---

## Проверка после деплоя

- Открыть https://satvasamui.site и убедиться, что загружается новая версия.
- При необходимости: жёсткое обновление (Ctrl+F5 / Cmd+Shift+R) или проверка в режиме инкогнито — возможен кэш браузера или CDN.

---

## Google Maps (карта в футере)

Карта в футере встроена через **Google Maps Embed API**. В `index.html` в iframe карты используется плейсхолдер ключа: `KEY_GOOGLE_MAPS_EMBED`.

- **Если ключ не подставлен:** на месте карты отображается блок «Нажмите, чтобы открыть карту» со ссылкой на Google Maps (Place ID Satva Samui).
- **Чтобы показывать карту:** создать API key в [Google Cloud Console](https://console.cloud.google.com) (включить Maps Embed API), ограничить его по HTTP referrers (`https://satvasamui.site/*`, `http://localhost:*`), затем в `index.html` заменить строку `KEY_GOOGLE_MAPS_EMBED` в атрибуте `src` iframe карты на реальный ключ. Ключ не коммитить в репозиторий — подставлять при деплое на сервере (например, через `sed` или локальный конфиг).

---

## Зависимости на сервере

- **git** — для pull
- **sass** (Dart Sass) — для сборки CSS (`make css`). Установка, если нет:  
  - через npm: `npm install -g sass`  
  - или пакетом, если есть в репозитории ОС
- **nginx** — раздача статики из `/var/www/satva-landing`

---

## Репозиторий на сервере

- **Remote:** `git@github.com:santex85/satva_landing.git`
- **Ветка для деплоя:** `main`
- На GitHub должен быть добавлен SSH-ключ сервера («Server landing»), чтобы `git pull` работал без пароля.
