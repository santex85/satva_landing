# Hero (Sprint 6)

## Откат перед редизайном hero

**Коммит-метка:** `6e3797a` — `backup: hero before redesign`  
**Дата:** 2026-05-21  
**Состояние:** hero с tagline «Сатва Самуи — больше, чем просто отдых у моря…», до изменений редизайна.

### Откатить только frontend (hero и стили)

```bash
git checkout 6e3797a -- frontend/index.html frontend/css/yoga/
cd frontend && make build-all
```

### Полный откат рабочей копии к метке

```bash
git reset --hard 6e3797a
```

### После отката на прод

См. [DEPLOY.md](../../../DEPLOY.md): `git pull` на сервере, `make build-all` в `frontend/`, перезапуск nginx/контейнеров при необходимости.

---

- **Исходник:** `hero_sunset.jpg` — 1280×792; **без @2x** (апскейл убран).
- **WebP:** пересобрано `cwebp -q 90` → `hero_sunset.webp`, `hero_sunset@1x.webp` (~29 КБ каждый).
- **Browser MCP** (localhost:8765/yoga.html): визуально без заметной блочности на градиенте неба — скрины `qa_hero_1440.png`, `qa_hero_375.png`.
