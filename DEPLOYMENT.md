# Инструкция по развертыванию ArcadeQuiz

Данный проект представляет собой **SPA (Single Page Application)** на базе **Phaser 3** и **Vite**. Все ресурсы скомпилированы в статическую папку `dist`.

## Состав сборки

Для работы приложения на сервере необходимы только файлы из папки `dist`:

- **index.html** — точка входа
- **assets/** — графические и аудио ресурсы, а также JS/CSS бандлы
- **sw.js** — Service Worker для кэширования и работы Offline
- **manifest.json** — PWA манифест

## Требования к серверу (Nginx / Apache)

Поскольку билд настроен на **относительные пути** (`base: './'`), папку `dist` можно размещать:
- В корне домена: `https://example.com/`
- В любой подпапке: `https://example.com/games/arcade/` или `https://example.com/any/random/folder/`

### Важные настройки:

**HTTPS:** Для корректной регистрации и работы **Service Worker** наличие SSL-сертификата (HTTPS) является обязательным требованием современных браузеров.

**MIME-types:** Убедитесь, что сервер отдаёт `.js` файлы с заголовком `Content-Type: application/javascript` и `.json` с `application/json`.

**Fallback (Routing):** Для SPA настройте сервер так, чтобы на любые запросы, не являющиеся физическими файлами, он отдавал `index.html`.

## Пример конфигурации Nginx

Если игра размещается в корне:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    root /var/www/arcade_quiz/dist;
    index index.html;

    # SSL сертификат (обязателен для Service Worker)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Fallback для SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Правильные MIME-типы
    location ~* \.(js|json)$ {
        add_header Content-Type application/javascript;
    }
}
```

Если игра размещается в подпапке (например, `/games/arcade/`):

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    root /var/www;
    index index.html;

    location /games/arcade/ {
        try_files $uri $uri/ /games/arcade/index.html;
    }
}
```

## Развертывание

1. **Архивирование:** Заархивируйте папку `dist` в `dist.zip` или `dist.tar.gz`
2. **Передача:** Передайте архив системному администратору
3. **Распаковка:** Админ распаковывает архив в нужную директорию сервера
4. **Готово:** Игра доступна по настроенному адресу

## Кэширование

Приложение использует **Service Worker** для автоматического кэширования ресурсов.

При обновлении файлов на сервере пользователям может потребоваться 1-2 перезагрузки страницы для активации новой версии кэша, либо Service Worker обновится автоматически в фоновом режиме при изменении хэша в `sw.js`.

## Проверка работоспособности

После развертывания проверьте:
1. Откройте URL игры в браузере
2. Нажмите F12 → Console
3. Убедитесь, что нет ошибок 404 при загрузке ассетов
4. Проверьте, что Service Worker зарегистрирован без ошибок

## Поддержка

При возникновении проблем:
- Проверьте, что сервер отдаёт файлы из папки `dist`
- Убедитесь, что HTTPS настроен корректно
- Проверьте консоль браузера на наличие ошибок загрузки ресурсов
