# Satva Landing — быстрые команды

SASS := sass
YOGA_SRC := css/yoga.scss
YOGA_OUT := css/yoga.css

PORT ?= 8765

# Корень репозитория (frontend/Makefile → на уровень выше)
GIT_ROOT := $(abspath $(CURDIR)/..)

.PHONY: pull sync deploy-dev css build watch serve run stop-port clean build-prod \
        yoga-css yoga-watch yoga-build-prod build-all yoga-clean \
        yoga-webp yoga-hero-variants help

# Обновить ветку с origin (первая операция перед сборкой при работе из frontend/)
pull:
	git -C $(GIT_ROOT) pull origin main
	@echo "✓ git pull: $(GIT_ROOT)"

# git pull + yoga.css
sync: pull build-all

# Локальный стек (Docker + API): то же, что «make deploy-dev» из корня репозитория (включая git pull)
deploy-dev:
	$(MAKE) -C $(GIT_ROOT) deploy-dev

# Собрать yoga.css из SCSS (по умолчанию)
css build yoga-css:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --style=expanded
	@echo "✓ $(YOGA_OUT) собран"

# Production: минифицированный CSS
build-prod yoga-build-prod:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --style=compressed --no-source-map
	@echo "✓ $(YOGA_OUT) (production) собран"

# Следить за изменениями и пересобирать
watch yoga-watch:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --watch --style=expanded

# Копия hero для HTML: исходник max 1280px — @2x не делаем (апскейл ухудшает качество)
yoga-hero-variants:
	@test -f img/yoga_tour/hero_sunset.jpg || { echo "missing img/yoga_tour/hero_sunset.jpg"; exit 1; }
	@cp -f img/yoga_tour/hero_sunset.jpg img/yoga_tour/hero_sunset@1x.jpg
	@echo "✓ hero_sunset@1x.jpg (затем: cwebp -q 90 hero_sunset@1x.jpg -o hero_sunset@1x.webp && make yoga-webp)"

# WebP для йога-тура: brew install webp
yoga-webp:
	@command -v cwebp >/dev/null 2>&1 || { echo "Install: brew install webp"; exit 1; }
	@for f in img/yoga_tour/*.jpg img/yoga_tour/*.png; do \
		[ -f "$$f" ] || continue; \
		[ -s "$$f" ] || continue; \
		cwebp -q 82 "$$f" -o "$${f%.*}.webp" -quiet; \
	done
	@echo "✓ WebP в img/yoga_tour/"

build-all: build

yoga-clean clean:
	rm -f $(YOGA_OUT) $(YOGA_OUT).map

# Освободить порт, если занят (убить процесс на $(PORT))
stop-port:
	@pid=$$(lsof -ti :$(PORT) 2>/dev/null); \
	if [ -n "$$pid" ]; then \
		kill $$pid 2>/dev/null && echo "✓ Процесс на порту $(PORT) остановлен (PID $$pid)" || true; \
	else \
		echo "✓ Порт $(PORT) свободен"; \
	fi

# Запустить локальный сервер
serve:
	python3 -m http.server $(PORT)
	@echo "→ http://localhost:$(PORT)/"

# Собрать CSS, освободить порт при необходимости и запустить сервер
run: build-all stop-port serve

help:
	@echo "Satva Landing — команды:"
	@echo ""
	@echo "  Йога-тур (index.html):"
	@echo "    make / make css      — пересобрать yoga.css из SCSS"
	@echo "    make watch           — watch-режим для yoga.scss"
	@echo "    make build-prod      — минифицированный yoga.css"
	@echo "    make yoga-webp       — cwebp: *.webp рядом с jpg/png в img/yoga_tour/"
	@echo ""
	@echo "  Общее:"
	@echo "    make deploy-dev      — из корня: git pull + yoga.css + docker compose up"
	@echo "    make pull            — git pull origin main"
	@echo "    make sync            — pull + build-all"
	@echo "    make serve           — запустить сервер на порту $(PORT)"
	@echo "    make stop-port       — освободить порт $(PORT)"
	@echo "    make run             — build-all + освободить порт + запустить сервер"
	@echo "    make clean           — удалить yoga.css и .map"
	@echo "    make help            — эта справка"
