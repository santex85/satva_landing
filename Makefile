# Корневой Makefile: локальный стек (Docker) и быстрый деплой статики на прод (SSH).
#
#   make deploy-dev         — Postgres + API + nginx локально (docker-compose.yml)
#   make deploy-prod        — на сервере: git pull, make css + yoga-css, chown, nginx
#   make deploy-prod-min    — то же, с минифицированным CSS (build-prod, yoga-build-prod)
#
# Параметры прод-деплоя (при необходимости):
#   make deploy-prod DEPLOY_USER=root DEPLOY_HOST=1.2.3.4 DEPLOY_PATH=/var/www/satva-landing
#
# Подробности: DEPLOY.md

.PHONY: deploy-dev deploy-dev-down deploy-dev-logs deploy-prod deploy-prod-min

COMPOSE := docker compose

DEPLOY_USER ?= root
DEPLOY_HOST ?= 152.42.186.191
DEPLOY_PATH ?= /var/www/satva-landing

# Поднять всё: при первом запуске создаётся server/.env из примера, собирается CSS из SCSS.
deploy-dev:
	@if [ ! -f server/.env ]; then \
		cp server/.env.example server/.env; \
		echo "→ Создан server/.env из server/.env.example (при необходимости отредактируйте)"; \
	fi
	$(MAKE) -C frontend css
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Готово: http://localhost/"
	@echo "Health:  http://localhost/api/health"
	@echo "Админка: http://localhost/admin.html"

deploy-dev-down:
	$(COMPOSE) down

deploy-dev-logs:
	$(COMPOSE) logs -f

# Статика на прод-сервере: pull, сборка main.css + yoga.css (expanded), права, проверка nginx
deploy-prod:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git pull origin main && cd frontend && make css && make yoga-css && cd .. && chown -R www-data:www-data . && nginx -t && systemctl reload nginx && echo Deploy OK'

# То же с минифицированным CSS (как рекомендовано в DEPLOY.md для production)
deploy-prod-min:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git pull origin main && cd frontend && make build-prod && make yoga-build-prod && cd .. && chown -R www-data:www-data . && nginx -t && systemctl reload nginx && echo Deploy OK'
