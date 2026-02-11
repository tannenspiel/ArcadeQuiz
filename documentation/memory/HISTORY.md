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

**7. Исплен критический баг с путями к ассетам:**
- **Проблема:** `ASSETS_BASE_PATH = '/assets/Game_01'` не учитывал base path
- В production Phaser загружал `/assets/...` вместо `/ArcadeQuiz/assets/...`
- **Решение:** `${import.meta.env.BASE_URL}assets/${CURRENT_THEME}`
- `BASE_URL` автоматически подставляет `/` или `/ArcadeQuiz/` в зависимости от режима
- Файл: `src/config/gameConfig.ts`
- Пересобран проект и протестирован — игра загружается корректно

**8. Деплой на GitHub Pages:**
- Проект успешно задеплоен: `https://tannenspiel.github.io/ArcadeQuiz/`
- CI/CD через GitHub Actions работает (зелёный билд)

**9. Исплен Service Worker для GitHub Pages:**
- **Проблема:** SW регистрировался как `/sw.js` → 404 на GitHub Pages
- **Решение 1:** `index.html` — изменён `'./sw.js'` (относительный путь)
- **Решение 2:** `public/sw.js` — `PRECACHE_URLS` с относительными путями
- Файлы: `index.html`, `public/sw.js`
- Коммит: `5a0fcf8`
- SW теперь корректно регистрируется по `/ArcadeQuiz/sw.js`

**10. Универсальные относительные пути для автономности dist:**
- **Проблема:** Проект привязан к `/ArcadeQuiz/` через `base` в vite.config.ts
- Нужно сделать папку `dist` переносимой на любой путь сервера
- **Решение:** Изменён `base: './'` в vite.config.ts
- Файлы: `vite.config.ts`, `public/sw.js` (уже был с относительными путями), `src/config/gameConfig.ts` (уже использовал BASE_URL)
- **Результат:** Папка `dist` теперь полностью портабельна
- **Проверено:** Собрано и протестировано через npm run preview (localhost:4176)
- **GitHub Pages:** Продолжает работать (относительные пути универсальны)
- **Коммиты:** `6576f34`, `c0c8689`

**11. Создана документация для деплоя:**
- Создан файл `DEPLOYMENT.md` с полной инструкцией для системных администраторов
- Содержит: состав сборки, требования к серверу, примеры Nginx/Apache
- Описывает процесс развертывания через архивацию dist/
- Коммит: `c0c8689`

---

## Archived Entries

Previous milestones have been archived to:
**→ [archive/HISTORY_documentation-review_20260211.md](archive/HISTORY_documentation-review_20260211.md)**

---

**Rotation Policy:** Новая задача = новый файл (жёсткое правило).

**Last rotation:** 2026-02-11
