# Lighthouse — `yoga.html` (desktop)

- **URL:** `http://127.0.0.1:8765/yoga.html` (static `python3 -m http.server`, 2026-04-23)  
- **JSON:** [lighthouse_yoga_desktop.json](lighthouse_yoga_desktop.json)  
- **HTML (просмотр):** [lighthouse_yoga_desktop.report.html](lighthouse_yoga_desktop.report.html)  

## Итоговые оценки

| Категория      | Оценка | Порог плана |
|----------------|--------|-------------|
| Performance    | **88** | ≥ 85        |
| Accessibility  | **96** | ≥ 90        |
| SEO            | **100**| ≥ 95        |

**Примечание:** в консоли Lighthouse были предупреждения `RootCauses` / `frame_sequence` (артефакт среды); на итоговые баллы performance это не влияло критично.

## Top issues (Sprint 5)

1. **Serve images in next-gen formats** — снижение веса hero/галереи (WebP/AVIF).  
2. **Efficiently encode images** — дополнительное сжатие JPEG.  
3. **Properly size images** — responsive `srcset` / кропы под DPR.  
4. **Enable text compression** — ожидаемо `0` на `http.server` (на проде с gzip/brotli улучшится).  

A11y и SEO проходят пороги; отдельных блокирующих замечаний нет.
