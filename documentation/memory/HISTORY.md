# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## 2026-02-11: Deploy + GitHub Actions ✅

**Status:** ✅ COMPLETED

### Summary
Настройка деплоя проекта через GitHub Actions. Проверено vite.config.js, собрана продакшн версия, создан workflow для автоматического деплоя, инициализирован Git.

### Выполненные действия

**1. Обновлён vite.config.ts:**
- Добавлен `base: '/ArcadeQuiz/'` для production сборки
- Dev режим использует `/`, prod — `/ArcadeQuiz/`

**2. Собрана продакшн версия:**
- `npm run build` выполнен успешно
- Создана папка `dist/` с оптимизированными ассетами
- Gzip-сжатие применено ко всем файлам

**3. Проверена работоспособность:**
- `npm run preview` запущен на `http://localhost:4173/ArcadeQuiz/`
- Настройка `base` работает корректно

**4. Создан GitHub Actions workflow:**
- Файл: `.github/workflows/deploy.yml`
- Триггер: push в main ветку
- Действия: install → build → deploy to GitHub Pages

**5. Инициализирован Git:**
- Создан `.gitignore` (node_modules, dist, .env, .DS_Store, .temp)
- `git init` выполнен
- Первый коммит: `022b536` (542 файла, 122860 строк)
- Второй коммит: `911ba00` (обновление памяти)

**6. Протестирован preview:**
- Production сборка загружается корректно
- Base path `/ArcadeQuiz/` работает правильно (manifest.css, assets)
- Проверено через `curl` и браузер

---

## Archived Entries

Previous milestones have been archived to:
**→ [archive/HISTORY_documentation-review_20260211.md](archive/HISTORY_documentation-review_20260211.md)**

---

**Rotation Policy:** Новая задача = новый файл (жёсткое правило).

**Last rotation:** 2026-02-11
