# Корневой Makefile: локальный стек (Docker) и быстрый деплой статики на прод (SSH).
#
#   make deploy-dev         — git pull, main+yoga CSS, Postgres + API + nginx локально
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

# Поднять всё: git pull, при первом запуске — server/.env из примера, сборка main.css + yoga.css, Docker.
deploy-dev:
	git pull origin main
	@if [ ! -f server/.env ]; then \
		cp server/.env.example server/.env; \
		echo "→ Создан server/.env из server/.env.example (при необходимости отредактируйте)"; \
	fi
	$(MAKE) -C frontend build-all
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
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git pull origin main && cd frontend && make build-all && cd .. && chown -R www-data:www-data . && nginx -t && systemctl reload nginx && echo Deploy OK'

# То же с минифицированным CSS (как рекомендовано в DEPLOY.md для production)
deploy-prod-min:
	ssh $(DEPLOY_USER)@$(DEPLOY_HOST) 'cd $(DEPLOY_PATH) && git pull origin main && cd frontend && make build-prod && make yoga-build-prod && cd .. && chown -R www-data:www-data . && nginx -t && systemctl reload nginx && echo Deploy OK'
