# Satva Landing — быстрые команды

SASS := sass
CSS_SRC := css/main.scss
CSS_OUT := css/main.css
PORT ?= 8765

.PHONY: css build watch serve clean build-prod optimize-images help

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

# Запустить локальный сервер
serve:
	python3 -m http.server $(PORT)
	@echo "→ http://localhost:$(PORT)/"

# Собрать и запустить сервер (одна команда)
run: css serve

# Удалить сгенерированный CSS
clean:
	rm -f css/main.css css/main.css.map

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
	@echo "  make        — собрать CSS (то же что make css)"
	@echo "  make css    — пересобрать стили из SCSS"
	@echo "  make watch  — следить за SCSS и пересобирать"
	@echo "  make serve  — запустить сервер на порту $(PORT)"
	@echo "  make run    — собрать CSS и запустить сервер"
	@echo "  make clean  — удалить main.css и .map"
	@echo "  make optimize-images — создать JPG из больших PNG (1200px, 80%%)"
	@echo "  make build-prod   — собрать минифицированный CSS"
	@echo "  make help   — эта справка"
