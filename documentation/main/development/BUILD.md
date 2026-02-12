# Инструкции по сборке и запуску проекта ArcadeQuiz

**Версия:** 2.2
**Дата создания:** 2025-01-26
**Дата последнего обновления:** 2026-02-12
**Статус:** Актуален

**Изменения в v2.2:**
- ✅ Добавлена информация о v2.0 (Универсальные относительные пути)
- ✅ Добавлена секция про Service Worker для GitHub Pages
- ✅ Добавлена ссылка на DEPLOYMENT.md для системных администраторов

**Изменения в v2.1:**
- ✅ Добавлено meta description для SEO
- ✅ Создан robots.txt
- ✅ Lighthouse SEO улучшено с 82 до 90+

**Изменения в v2.0:**
- ✅ **Универсальные относительные пути:** `base: './'` для портабельной dist
- ✅ **Service Worker fix:** Относительные пути для GitHub Pages
- ✅ Добавлен раздел "Деплой на хостинг" (GitHub Pages, Netlify, Vercel, Nginx, Apache)
- ✅ Добавлена секция проверки качества через Lighthouse
- ✅ Обновлён статус тестов: 1206/1206 passing

**Изменения в v1.2:**
- ✅ Добавлена секция о тестовой инфраструктуре
- ✅ Обновлён статус тестов: 523/523 passing

---

## Краткое описание

Подробные инструкции по установке зависимостей, сборке и запуску проекта ArcadeQuiz в режимах разработки и production.

---

## Содержание

1. [Требования](#требования)
2. [Установка зависимостей](#установка-зависимостей)
3. [Режим разработки](#режим-разработки)
4. [Сборка проекта](#сборка-проекта)
5. [Предпросмотр сборки](#предпросмотр-сборки)
6. [Деплой на хостинг](#деплой-на-хостинг)
7. [Переменные окружения](#переменные-окружения)
8. [Типичные проблемы](#типичные-проблемы)

---

## Требования

### Необходимое ПО:

- **Node.js** версии 18.0.0 или выше
- **npm** версии 9.0.0 или выше (или **yarn**, **pnpm**)

### Проверка версий:

```bash
node --version
npm --version
```

---

## Установка зависимостей

### Первоначальная установка:

```bash
npm install
```

### Установка после изменений в package.json:

```bash
npm install
```

### Очистка и переустановка:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Установленные зависимости:**
- `phaser` — игровой движок
- `react`, `react-dom` — UI библиотека
- `typescript` — типизация
- `vite` — сборщик
- `@vitejs/plugin-react` — плагин React для Vite

---

## Режим разработки

### Запуск dev-сервера:

```bash
npm run dev
```

**Результат:**
- Сервер запускается на `http://localhost:3000`
- Автоматическое открытие браузера
- Hot Module Replacement (HMR) — изменения применяются автоматически
- Source maps для отладки

### Остановка сервера:

Нажмите `Ctrl+C` в терминале

### Настройка порта:

Порт можно изменить в `vite.config.ts`:

```typescript
export default defineConfig({
    server: {
        port: 3000,  // Измените на нужный порт
        open: true
    }
});
```

---

## Сборка проекта

### Production сборка:

```bash
npm run build
```

**Результат:**
- Создается папка `dist/` с собранными файлами
- Оптимизация кода (минификация, tree-shaking)
- Оптимизация ассетов

### Структура сборки:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
```

### Настройка сборки:

В `vite.config.ts`:

```typescript
export default defineConfig({
    build: {
        target: 'es2015',
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true  // Для отладки production сборки
    }
});
```

**✅ ВАЖНО (v2.0): Универсальные относительные пути**

```typescript
export default defineConfig({
    base: './',  // Относительный путь для портабельной dist
    // ...
});
```

**Что это значит:**
- Папка `dist/` может быть размещена в любом месте сервера
- Работает в корне домена: `https://example.com/`
- Работает в подпапке: `https://example.com/games/arcade/`
- Работает на любой глубине: `https://example.com/any/random/folder/`

**Технические детали:**
- Все пути в HTML становятся относительными: `src="./assets/..."` вместо `src="/assets/..."`
- Service Worker использует относительный путь: `'./sw.js'`
- Ассеты загружаются через `import.meta.env.BASE_URL` (автоподстановка)

**Для разработчиков:**
- Dev режим: `BASE_URL = '/'` (как было)
- Prod режим: `BASE_URL = './'` (новое в v2.0)
- Никаких хардкодных путей типа `'/ArcadeQuiz/assets/...'`

**Для системных администраторов:**
- Просто скопируйте папку `dist/` в нужную директорию сервера
- Дополнительная настройка путей не требуется
- Инструкция по деплою: `dist/DEPLOYMENT.md`

---

## Предпросмотр сборки

### Локальный предпросмотр:

```bash
npm run preview
```

**Результат:**
- Запускается локальный сервер для предпросмотра production сборки
- Позволяет проверить работу собранного проекта перед деплоем

---

## Деплой на хостинг

### Структура production сборки

```
dist/
├── index.html                    # Главный HTML
├── assets/                       # JS/CSS бандлы
│   ├── index-[hash].js          # Основной бандл
│   ├── phaser-[hash].js         # Phaser (отдельный chunk)
│   ├── react-[hash].js          # React (отдельный chunk)
│   └── vendor-[hash].js         # Остальные зависимости
└── assets/Game_01/              # Игровые ассеты (скопированы)
    ├── audio/                   # Звуки (mp3)
    ├── images/                  # Спрайты (png)
    ├── questions/               # JSON с вопросами
    └── level_maps/              # Tiled карты
```

**Важно:** `dist/` исключён из `.gitignore` — не храните production сборку в репозитории!

---

### GitHub Pages (бесплатно, для статических сайтов)

#### Вариант 1: Через gh-pages (ручной деплой)

```bash
# 1. Установите gh-pages (однократно)
npm install -g gh-pages

# 2. Соберите проект
npm run build

# 3. Задеплойте на gh-pages ветку
gh-pages -d dist

# 4. В настройках репозитория GitHub:
#    Settings → Pages → Source: gh-pages branch
```

#### Вариант 2: Через GitHub Actions (автоматический деплой)

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Настройки репозитория:**
- Settings → Pages → Source: `GitHub Actions`

**✅ ВАЖНО (v1.1): Service Worker для GitHub Pages**

Для корректной работы Service Worker на GitHub Pages:
- `index.html` использует относительный путь: `navigator.serviceWorker.register('./sw.js')`
- `public/sw.js` использует относительные пути в `PRECACHE_URLS`

**Почему это важно:**
- Абсолютный путь `/sw.js` даёт 404 на GitHub Pages (когда проект не в корне домена)
- Относительный путь `./sw.js` работает в любой папке: `/`, `/ArcadeQuiz/`, `/games/arcade/`

---

### Netlify (рекомендуется для Phaser игр)

#### Через личный кабинет:
1. Зайдите на [netlify.com](https://www.netlify.com/)
2. Подключите GitHub репозиторий
3. Настройки билда:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy!

#### Через CLI:
```bash
# 1. Установите Netlify CLI
npm install -g netlify-cli

# 2. Соберите проект
npm run build

# 3. Задеплойте
netlify deploy --prod --dir=dist
```

**Преимущества Netlify для Phaser игр:**
- ✅ Бесплатный SSL (HTTPS)
- ✅ CDN по всему миру
- ✅ Автоматический деплой с GitHub
- ✅ Кастомные домены
- ✅ Redirect rules для SPA

---

### Vercel (альтернатива Netlify)

```bash
# 1. Установите Vercel CLI
npm install -g vercel

# 2. Соберите проект
npm run build

# 3. Задеплойте
vercel --prod
```

---

### Собственный сервер (Nginx/Apache)

#### Nginx конфигурация:
```nginx
server {
    listen 80;
    server_name your-game.com;
    root /var/www/arcadequiz/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование ассетов
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

#### Apache (.htaccess):
```apache
RewriteEngine On
RewriteBase /

# SPA fallback
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Кэширование ассетов
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
</IfModule>
```

---

### Проверка деплоя (Lighthouse)

После деплоя проверьте качество сборки в Chrome DevTools:

1. Откройте сайт в Chrome
2. F12 → Lighthouse tab
3. Выберите: **Performance**, **Accessibility**, **Best Practices**, **SEO**
4. Нажмите **Analyze page load**

**Целевые метрики:**
| Метрика | Цель |
|---------|------|
| Performance | 90+ |
| Accessibility | 95+ |
| Best Practices | 90+ |
| SEO | 90+ |

---

## Переменные окружения

### Создание .env файла:

Создайте файл `.env` в корне проекта:

```env
# Текущая тема игры
VITE_CURRENT_THEME=Game_01

# A/B тестирование фидбэков
VITE_ENABLE_FEEDBACKS=true
VITE_ENABLE_WRONG_FEEDBACKS=true
```

### Использование в коде:

```typescript
// src/config/gameConfig.ts
export const CURRENT_THEME = import.meta.env.VITE_CURRENT_THEME || 'Game_01';
export const AB_TESTING = {
  ENABLE_FEEDBACKS: import.meta.env.VITE_ENABLE_FEEDBACKS !== 'false',
  ENABLE_WRONG_FEEDBACKS: import.meta.env.VITE_ENABLE_WRONG_FEEDBACKS !== 'false'
};
```

**Важно:** Переменные должны начинаться с `VITE_` для доступности в клиентском коде.

**Типизация:** Типы для `import.meta.env` определены в `src/vite-env.d.ts`. Этот файл обеспечивает TypeScript поддержку для переменных окружения Vite и предотвращает ошибки типизации при использовании `import.meta.env.VITE_*` в коде.

---

## Типичные проблемы

### Проблема: Порт уже занят

**Решение:**
```bash
# Измените порт в vite.config.ts или убейте процесс
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill
```

### Проблема: Ошибки TypeScript при сборке

**Решение:**
```bash
# Проверьте типы
npm run type-check  # если есть такая команда

# Или через tsc напрямую
npx tsc --noEmit
```

**Примечание:** Если возникает ошибка `Property 'env' does not exist on type 'ImportMeta'`, убедитесь, что файл `src/vite-env.d.ts` существует и содержит правильные типы для Vite environment variables.

### Проблема: Модули не найдены

**Решение:**
```bash
# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема: React не работает

**Решение:**
- Проверьте, что `@vitejs/plugin-react` установлен
- Проверьте настройки в `vite.config.ts`
- Убедитесь, что `main.tsx` правильно настроен

### Проблема: Phaser не загружается

**Решение:**
- Проверьте импорты в `PhaserGame.tsx`
- Убедитесь, что Phaser установлен: `npm list phaser`
- Проверьте консоль браузера на ошибки

---

## PWA Update System

### Обзор

Игра использует Progressive Web App (PWA) Service Worker для кэширования ресурсов и автоматического обновления. При публикации новой версии игроки получают уведомление о доступном обновлении.

### Архитектура

**Файлы системы:**
- `public/sw.js` — Service Worker (Network First strategy)
- `index.html` — регистрация SW и обработчик updatefound
- `src/react/PhaserGame.tsx` — React компонент уведомления (резерв)
- `scripts/generate-cache-version.js` — генерация версии кэша
- `.cache-version.json` — текущая версия кэша

### Как работает обновление

1. **Проверка версии:** Service Worker сравнивает `CACHE_VERSION` при загрузке
2. **Обнаружение обновления:** Браузер находит новый `sw.js` с другой версией
3. **Авто-обновление:** Страница перезагружается автоматически через 1 секунду
4. **Активация:** Новый Service Worker активируется и кэширует ресурсы

### Код обновления

**Регистрация SW** (`index.html`):
```javascript
registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (newWorker) {
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // ✅ АВТОМАТИЧЕСКАЯ ПЕРЕЗАГРУЗКА
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        });
    }
});
```

**Кнопка ОБНОВИТЬ** (резерв в `PhaserGame.tsx`):
```tsx
// Для мобильных устройств требуется onTouchStart
<button
    onClick={handleUpdate}
    onTouchStart={handleUpdate}  // ✅ Mobile fix
    style={{ touchAction: 'manipulation' }}
>
    Обновить
</button>
```

### Версионирование кэша

Версия кэша формируется автоматически из хэша конфиг файлов:
```
scripts/generate-cache-version.js
→ хэширует level1.config.json + level2.config.json
→ создаёт .cache-version.json
→ обновляет public/sw.js
```

Формат версии: `YYYY-MM-DD-hash` (например: `2026-02-12-e21ab915`)

### Отключение для разработки

В режиме `localhost` или `127.0.0.1` Service Worker не регистрируется:

```javascript
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if ('serviceWorker' in navigator && !isDev) {
    // SW регистрация только в production
}
```

---

## Дополнительные команды

### Проверка зависимостей:

```bash
npm list
```

### Обновление зависимостей:

```bash
npm update
```

### Проверка уязвимостей:

```bash
npm audit
npm audit fix
```

### Запуск тестов:

```bash
# Все тесты
npm test

# С покрытием кода
npm run test:coverage

# Watch режим
npm run test:watch
```

**Текущий статус:** ✅ 523/523 тестов проходят

Подробнее о тестировании см. в [TESTING.md](TESTING.md)

---

## Связанные документы

- [DEVELOPMENT.md](DEVELOPMENT.md) — руководство по разработке
- [DEBUGGING.md](DEBUGGING.md) — отладка и диагностика

---

## История изменений

| Дата | Версия | Изменения | Автор |
|------|--------|-----------|-------|
| 2025-01-26 | 1.0 | Создание документа | AI Assistant |
| 2025-01-27 | 1.1 | Добавлено упоминание о `vite-env.d.ts` для типизации переменных окружения | AI Assistant |
| 2026-01-16 | 1.2 | Добавлена секция о тестовой инфраструктуре, обновлён статус тестов | AI Assistant |
| 2026-02-03 | 2.0 | Добавлен раздел деплоя (GitHub Pages, Netlify, Vercel, Nginx/Apache) + Lighthouse | AI Assistant |
| 2026-02-03 | 2.1 | Добавлено meta description для SEO, создан robots.txt | AI Assistant |

---

**Последнее обновление:** 2026-02-03




