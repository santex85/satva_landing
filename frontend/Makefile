# Satva Landing — быстрые команды

SASS := sass
YOGA_SRC := css/yoga.scss
YOGA_OUT := css/yoga.css

PORT ?= 8765

# Корень репозитория (frontend/Makefile → на уровень выше)
GIT_ROOT := $(abspath $(CURDIR)/..)

.PHONY: pull sync deploy-dev css build watch serve run stop-port clean build-prod \
        yoga-css yoga-watch yoga-build-prod build-all yoga-clean \
        yoga-webp yoga-beach-variants yoga-hero-variants help

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
	@$(MAKE) yoga-webp yoga-beach-variants

# Следить за изменениями и пересобирать
watch yoga-watch:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --watch --style=expanded

# Копия hero для HTML: исходник max 1280px — @2x не делаем (апскейл ухудшает качество)
yoga-hero-variants:
	@test -f img/yoga_tour/hero_sunset.jpg || { echo "missing img/yoga_tour/hero_sunset.jpg"; exit 1; }
	@cp -f img/yoga_tour/hero_sunset.jpg img/yoga_tour/hero_sunset@1x.jpg
	@echo "✓ hero_sunset@1x.jpg (затем: cwebp -q 90 hero_sunset@1x.jpg -o hero_sunset@1x.webp && make yoga-webp)"

# WebP для йога-тура (рекурсивно): apt install webp / brew install webp
yoga-webp:
	@command -v cwebp >/dev/null 2>&1 || { echo "Install: apt-get install webp OR brew install webp"; exit 1; }
	@find img/yoga_tour -type f \( -name '*.jpg' -o -name '*.png' \) ! -path '*/.*' | while read -r f; do \
		out="$${f%.*}.webp"; \
		if [ ! -f "$$out" ] || [ "$$f" -nt "$$out" ]; then \
			cwebp -q 82 "$$f" -o "$$out" -quiet; \
		fi; \
	done
	@if [ -f img/satva-logo.png ]; then \
		out=img/satva-logo.webp; \
		if [ ! -f "$$out" ] || [ img/satva-logo.png -nt "$$out" ]; then \
			cwebp -q 90 img/satva-logo.png -o "$$out" -quiet; \
		fi; \
	fi
	@echo "✓ WebP в img/yoga_tour/ (рекурсивно) и img/satva-logo.webp"

# Адаптивные варианты beach_day + основной webp ≤1600px
yoga-beach-variants:
	@command -v cwebp >/dev/null 2>&1 || { echo "Install: apt-get install webp OR brew install webp"; exit 1; }
	@set -e; \
	SRC=""; \
	if [ -f img/yoga_tour/beach_day.jpg ]; then SRC=img/yoga_tour/beach_day.jpg; \
	elif [ -f img/yoga_tour/beach_day.png ]; then SRC=img/yoga_tour/beach_day.png; \
	elif [ -f img/yoga_tour/beach_day.webp ] && command -v dwebp >/dev/null 2>&1; then \
		dwebp img/yoga_tour/beach_day.webp -o /tmp/beach_day_src.png -quiet; \
		SRC=/tmp/beach_day_src.png; \
	fi; \
	if [ -z "$$SRC" ]; then echo "⚠ beach_day source not found, skip variants"; exit 0; fi; \
	for w in 800 1200 1600; do \
		cwebp -q 82 -resize $$w 0 "$$SRC" -o "img/yoga_tour/beach_day-$${w}.webp" -quiet; \
	done; \
	cwebp -q 82 -resize 1600 0 "$$SRC" -o img/yoga_tour/beach_day.webp -quiet; \
	echo "✓ beach_day responsive WebP variants"

build-all: build yoga-webp yoga-beach-variants

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
