/**
 * Service Worker для кэширования игры "Mysterious Portals"
 *
 * Стратегия: Network First с fallback на Cache
 * - Сначала пытается загрузить с сервера (свежие данные)
 * - При ошибке сети берёт из кэша (работает оффлайн)
 * - Автоматическое обновление при изменении версии
 */

// Версия кэша (автоматически обновляется скриптом generate-cache-version.js)
// Формат: YYYY-MM-DD-Hash (где Hash - первые 8 символов от хэша конфиг файлов)
const CACHE_VERSION = '2026-02-17-e21ab915';
const CACHE_NAME = `portals-v${CACHE_VERSION}`;

// Ресурсы для кэширования при первом запуске
// ✅ Используем относительные пути для работы с GitHub Pages (/ArcadeQuiz/)
const PRECACHE_URLS = [
  './',
  './index.html',
  // ✅ Phaser и другие lazy chunks кэшируются динамически через fetch handler
  // (phaser-[hash].js, react-[hash].js, vendor-[hash].js)
  // Ассеты будут кэшироваться динамически по мере загрузки
];

// Установка Service Worker'а
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching static resources');
      // Кэшируем базовые ресурсы
      return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => {
      // Принудительно активируем новый SW сразу
      return self.skipWaiting();
    })
  );
});

// Активация нового Service Worker'а
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые кэши
          if (cacheName !== CACHE_NAME && cacheName.startsWith('portals-v')) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Управляем всеми клиентами сразу
      return self.clients.claim();
    })
  );
});

// Перехват запросов (Network First с fallback на Cache)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы и протоколы отличные от http(s)
  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // Для HTML файлов всегда Network First (нужна свежая версия)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кэшируем успешные ответы
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // При ошибке сети берём из кэша
          return caches.match(request);
        })
    );
    return;
  }

  // Для остальных ресурсов (JS, CSS, изображения, аудио)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // Сначала проверяем кэш
      return cache.match(request).then((cachedResponse) => {
        // Запрос к серверу (в любом случае, для обновления)
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Кэшируем успешные ответы
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Возвращаем кэш сразу (быстро), но обновляем в фоне
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Принудительная очистка всех кэшей
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    console.log('[SW] Clearing all caches...');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log(`[SW] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] All caches cleared');
      // Оповещаем клиента об успешной очистке
      event.ports[0].postMessage({ type: 'CACHES_CLEARED' });
    });
  }

  // Получение информации о текущей версии
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
});
