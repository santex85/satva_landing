# Быстрый локальный стек: Postgres + FastAPI + nginx (см. docker-compose.yml)

.PHONY: deploy-dev deploy-dev-down deploy-dev-logs

COMPOSE := docker compose

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
