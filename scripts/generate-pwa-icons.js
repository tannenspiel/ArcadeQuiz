/**
 * Генератор PWA иконок для ArcadeQuiz
 *
 * Создаёт icon-192.png и icon-512.png с помощью Canvas API
 *
 * Запуск: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Создаёт иконку с заданным размером
 */
function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Фон - тёмный градиент (под тему игры)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a202c');   // тёмно-синий
    gradient.addColorStop(0.5, '#2d3748'); // синий-серый
    gradient.addColorStop(1, '#1a202c');   // тёмно-синий
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Декоративная рамка
    const padding = size * 0.08;
    const borderWidth = size * 0.04;

    ctx.strokeStyle = '#48bb78'; // зелёный (цвет победы)
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(padding, padding, size - padding * 2, size - padding * 2);

    // Центральный элемент - портал (овал)
    const centerX = size / 2;
    const centerY = size / 2;
    const portalWidth = size * 0.4;
    const portalHeight = size * 0.5;

    // Свечение портала
    ctx.shadowColor = '#9f7aea'; // фиолетовый
    ctx.shadowBlur = size * 0.08;

    ctx.fillStyle = '#9f7aea';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, portalWidth / 2, portalHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Внутренность портала (чёрный)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, portalWidth / 2.5, portalHeight / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Звёзды/частицы вокруг портала
    const particleCount = size >= 512 ? 8 : 4;
    const particleDistance = size * 0.28;
    const particleSize = size * 0.04;

    ctx.fillStyle = '#f6e05e'; // жёлтый
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const x = centerX + Math.cos(angle) * particleDistance;
        const y = centerY + Math.sin(angle) * particleDistance;

        ctx.beginPath();
        ctx.arc(x, y, particleSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Текст "MP" (Mysterious Portals) для больших иконок
    if (size >= 192) {
        const fontSize = size * 0.2;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Тень для текста
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = size * 0.02;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = size * 0.01;

        ctx.fillText('MP', centerX, centerY + size * 0.02);
    }

    return canvas;
}

/**
 * Сохраняет canvas как PNG файл
 */
function saveCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

        const buffer = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(__dirname, '..', 'public', filename);

        fs.writeFile(outputPath, buffer, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
}

/**
 * Основная функция генерации
 */
async function generateIcons() {
    console.log('🎨 Генерация PWA иконок для ArcadeQuiz...\n');

    try {
        // Создаём иконку 192x192
        console.log('📐 Создание icon-192.png...');
        const icon192 = createIcon(192);
        await saveCanvas(icon192, 'icon-192.png');
        console.log('✅ Создан: public/icon-192.png (192x192)\n');

        // Создаём иконку 512x512
        console.log('📐 Создание icon-512.png...');
        const icon512 = createIcon(512);
        await saveCanvas(icon512, 'icon-512.png');
        console.log('✅ Создан: public/icon-512.png (512x512)\n');

        console.log('🎉 PWA иконки успешно созданы!\n');
        console.log('Следующие шаги:');
        console.log('1. Проверьте файлы: public/icon-192.png и public/icon-512.png');
        console.log('2. Соберите проект: npm run build');
        console.log('3. Протестируйте PWA: npm run dev');
        console.log('4. В Chrome DevTools → Application → Manifest проверьте иконки\n');

        return true;
    } catch (error) {
        console.error('❌ Ошибка при генерации иконок:', error);
        return false;
    }
}

// Запуск генерации (если выполняется как скрипт)
if (typeof window === 'undefined') {
    // Node.js окружение - используём JSDOM для Canvas
    const { createCanvas } = require('canvas');

    // Переопределяем document.createElement для JSDOM
    global.document = {
        createElement: (tag) => {
            if (tag === 'canvas') {
                return createCanvas(size, size);
            }
            throw new Error(`Unsupported tag: ${tag}`);
        }
    };

    generateIcons().then(success => {
        process.exit(success ? 0 : 1);
    });
}
