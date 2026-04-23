# Satva Landing — быстрые команды

SASS := sass
CSS_SRC := css/main.scss
CSS_OUT := css/main.css

YOGA_SRC := css/yoga.scss
YOGA_OUT := css/yoga.css

PORT ?= 8765

.PHONY: css build watch serve run stop-port clean build-prod \
        yoga-css yoga-watch yoga-build-prod build-all yoga-clean \
        yoga-webp yoga-hero-variants optimize-images help

# Собрать CSS из SCSS (по умолчанию)
css build:
	$(SASS) $(CSS_SRC) $(CSS_OUT) --style=expanded
	@echo "✓ $(CSS_OUT) собран"

# Production: минифицированный CSS
build-prod:
	$(SASS) $(CSS_SRC) $(CSS_OUT) --style=compressed --no-source-map
	@echo "✓ $(CSS_OUT) (production) собран"

# Следить за изменениями и пересобирать
watch:
	$(SASS) $(CSS_SRC) $(CSS_OUT) --watch --style=expanded

# --- Yoga tour (yoga.html) ---------------------------------------------------

yoga-css:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --style=expanded
	@echo "✓ $(YOGA_OUT) собран"

yoga-watch:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --watch --style=expanded

yoga-build-prod:
	$(SASS) $(YOGA_SRC) $(YOGA_OUT) --style=compressed --no-source-map
	@echo "✓ $(YOGA_OUT) (production) собран"

yoga-clean:
	rm -f $(YOGA_OUT) $(YOGA_OUT).map

# Варианты hero для srcset: @1x = исходник, @2x = 2560px по длинной стороне
yoga-hero-variants:
	@test -f img/yoga_tour/hero_sunset.jpg || { echo "missing img/yoga_tour/hero_sunset.jpg"; exit 1; }
	@cp -f img/yoga_tour/hero_sunset.jpg img/yoga_tour/hero_sunset@1x.jpg
	@sips -Z 2560 img/yoga_tour/hero_sunset.jpg --out img/yoga_tour/hero_sunset@2x.jpg
	@echo "✓ hero_sunset@1x.jpg, hero_sunset@2x.jpg (затем make yoga-webp)"

# WebP для йога-тура: brew install webp
yoga-webp:
	@command -v cwebp >/dev/null 2>&1 || { echo "Install: brew install webp"; exit 1; }
	@for f in img/yoga_tour/*.jpg img/yoga_tour/*.png; do \
		[ -f "$$f" ] || continue; \
		[ -s "$$f" ] || continue; \
		cwebp -q 82 "$$f" -o "$${f%.*}.webp" -quiet; \
	done
	@echo "✓ WebP в img/yoga_tour/"

# Удобный суммарный таргет: оба проекта (dev)
build-all: build yoga-css

# -----------------------------------------------------------------------------

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

# Собрать CSS (оба проекта), освободить порт при необходимости и запустить сервер
run: build-all stop-port serve

# Удалить сгенерированный CSS
clean:
	rm -f css/main.css css/main.css.map
	rm -f css/yoga.css css/yoga.css.map

# Оптимизация больших изображений (resize + JPEG 80%) — процедуры и команда
IMG_OPT := img/Shirodhara.png img/adbhianga.png img/antiage.png img/ayurvedic_therapy.png img/diagnostic.png img/doctor.png img/pinndasvedana.png img/smuthi.png img/udvartana.png img/yog_lady.png img/yog_man.png img/yoga.png img/relax2.png
optimize-images:
	@for f in $(IMG_OPT); do \
		if [ -f "$$f" ]; then \
			out="$${f%.png}.jpg"; \
			sips -s format jpeg -s formatOptions 80 -Z 1200 "$$f" --out "$$out" 2>/dev/null && echo "✓ $$out" || echo "skip $$f"; \
		fi; \
	done
	@echo "✓ Оптимизированные JPG созданы. Обновите index.html на .jpg для этих изображений."

help:
	@echo "Satva Landing — команды:"
	@echo ""
	@echo "  Основной лендинг (index.html):"
	@echo "    make / make css      — пересобрать main.css из SCSS"
	@echo "    make watch           — watch-режим для main.scss"
	@echo "    make build-prod      — минифицированный main.css"
	@echo ""
	@echo "  Йога-тур (yoga.html):"
	@echo "    make yoga-css        — пересобрать yoga.css из SCSS"
	@echo "    make yoga-watch      — watch-режим для yoga.scss"
	@echo "    make yoga-build-prod — минифицированный yoga.css"
	@echo "    make yoga-webp      — cwebp: *.webp рядом с jpg/png в img/yoga_tour/"
	@echo "    make yoga-clean      — удалить yoga.css и .map"
	@echo ""
	@echo "  Общее:"
	@echo "    make build-all       — собрать main.css + yoga.css (dev)"
	@echo "    make serve           — запустить сервер на порту $(PORT)"
	@echo "    make stop-port       — освободить порт $(PORT)"
	@echo "    make run             — build-all + освободить порт + запустить сервер"
	@echo "    make clean           — удалить все сгенерированные CSS"
	@echo "    make optimize-images — создать JPG из больших PNG (1200px, 80%%)"
	@echo "    make help            — эта справка"
