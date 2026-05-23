# Корневой Makefile: локальный стек (Docker) и быстрый деплой статики на прод (SSH).
#
#   make deploy-dev         — один shell: pull, sass yoga, docker compose up (локально)
#   make deploy-prod        — на сервере: сброс собранного CSS при конфликте, pull, build-all, nginx
#   make deploy-prod-min    — то же, с минифицированным CSS (build-prod)
#
# Параметры прод-деплоя (при необходимости):
#   make deploy-prod DEPLOY_USER=root DEPLOY_HOST=1.2.3.4 DEPLOY_PATH=/var/www/satva-landing
#
# Подробности: DEPLOY.md

.PHONY: deploy-dev deploy-dev-down deploy-dev-logs deploy-prod deploy-prod-min

COMPOSE := docker compose
SASS    ?= sass

DEPLOY_USER ?= root
DEPLOY_HOST ?= 152.42.186.191
DEPLOY_PATH ?= /var/www/satva-landing

# Один проход shell: pull → .env → yoga.css → docker compose (запускать из корня репозитория).
deploy-dev:
	set -e; \
	git pull origin main; \
	if [ ! -f server/.env ]; then \
		cp server/.env.example server/.env; \
		echo "→ Создан server/.env из server/.env.example (при необходимости отредактируйте)"; \
	fi; \
	$(SASS) frontend/css/yoga.scss frontend/css/yoga.css --style=expanded; \
	echo "✓ frontend/css/yoga.css собран"; \
	$(COMPOSE) up -d --build; \
	echo ""; \
	echo "Готово (только этот компьютер): http://localhost/"; \
	echo "Health:  http://localhost/api/health"; \
	echo "Админка: http://localhost/samui-ctl-x7f2"; \
	echo ""; \
	echo "Сайт в интернете не обновляется этой командой. Прод: make deploy-prod"

deploy-dev-down:
	$(COMPOSE) down

deploy-dev-logs:
	$(COMPOSE) logs -f

# Статика + API на прод-сервере: pull, build CSS, docker rebuild (миграции в entrypoint)
deploy-prod:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git checkout -- frontend/css/yoga.css 2>/dev/null || true && git pull origin main && cd frontend && make build-all && cd .. && docker compose -f docker-compose.prod.yml --env-file .env.deploy up -d --build && docker compose -f docker-compose.prod.yml --env-file .env.deploy restart nginx && cp deploy/nginx-host-satvasamui.site.conf /etc/nginx/sites-available/satvasamui.site && chown -R www-data:www-data frontend && nginx -t && systemctl reload nginx && echo Deploy OK'

# То же с минифицированным CSS (как рекомендовано в DEPLOY.md для production)
deploy-prod-min:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git checkout -- frontend/css/yoga.css 2>/dev/null || true && git pull origin main && cd frontend && make build-prod && cd .. && chown -R www-data:www-data . && nginx -t && systemctl reload nginx && echo Deploy OK'
