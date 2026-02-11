/**
 * Генератор PWA иконок для ArcadeQuiz с использованием pngjs
 *
 * Создаёт icon-192.png и icon-512.png
 *
 * Запуск: node scripts/generate-pwa-icons-pngjs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Вспомогательные функции для работы с цветами
 */
function rgbaToInt(r, g, b, a) {
    return (a << 24) | (b << 16) | (g << 8) | r;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Линейная интерполяция между двумя цветами
 */
function lerpColor(color1, color2, t) {
    return {
        r: Math.round(color1.r * (1 - t) + color2.r * t),
        g: Math.round(color1.g * (1 - t) + color2.g * t),
        b: Math.round(color1.b * (1 - t) + color2.b * t)
    };
}

/**
 * Рисует эллипс на изображении
 */
function drawEllipse(data, width, height, centerX, centerY, radiusX, radiusY, r, g, b, a = 255) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            const distance = dx * dx + dy * dy;

            if (distance <= 1) {
                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }
}

/**
 * Рисует кольцо (рамка портала)
 */
function drawEllipseRing(data, width, height, centerX, centerY, radiusX, radiusY, r, g, b, a = 255) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            const distance = dx * dx + dy * dy;

            // Рисуем кольцо между 0.6 и 1.0
            if (distance <= 1 && distance >= 0.6) {
                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }
}

/**
 * Рисует круг
 */
function drawCircle(data, width, height, centerX, centerY, radius, r, g, b, a = 255) {
    const radiusSquared = radius * radius;
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(height, Math.ceil(centerY + radius));
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(width, Math.ceil(centerX + radius));

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            if (dx * dx + dy * dy <= radiusSquared) {
                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }
}

/**
 * Рисует прямоугольную рамку
 */
function drawRectBorder(data, width, height, padding, borderWidth, r, g, b, a = 255) {
    for (let y = padding; y < height - padding; y++) {
        for (let x = padding; x < width - padding; x++) {
            // Верхняя и нижняя границы
            const onTopBottom = y < padding + borderWidth || y > height - padding - borderWidth;
            // Левая и правая границы
            const onLeftRight = x < padding + borderWidth || x > width - padding - borderWidth;

            if (onTopBottom || onLeftRight) {
                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }
}

/**
 * Рисует текст "MP"
 */
function drawText(data, width, height, size, r, g, b, a = 255) {
    // Простая битовая карта для букв "MP"
    // Буква M (6x7)
    const m = [
        [1,0,0,0,0,1],
        [1,1,0,0,1,1],
        [1,0,1,1,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1],
        [1,0,0,0,0,1]
    ];

    // Буква P (6x7)
    const p = [
        [1,1,1,1,1,0],
        [1,0,0,0,0,1],
        [1,1,1,1,1,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0],
        [1,0,0,0,0,0]
    ];

    const letterWidth = Math.floor(size * 0.15);
    const letterHeight = Math.floor(size * 0.25);
    const gap = Math.floor(size * 0.05);
    const startX = Math.floor((width - (letterWidth * 2 + gap)) / 2);
    const startY = Math.floor((height - letterHeight) / 2);

    // Рисуем M
    drawLetter(data, width, height, m, startX, startY, letterWidth, letterHeight, r, g, b, a);

    // Рисуем P
    drawLetter(data, width, height, p, startX + letterWidth + gap, startY, letterWidth, letterHeight, r, g, b, a);
}

function drawLetter(data, width, height, pattern, startX, startY, letterWidth, letterHeight, r, g, b, a) {
    const rows = pattern.length;
    const cols = pattern[0].length;
    const pixelW = Math.floor(letterWidth / cols);
    const pixelH = Math.floor(letterHeight / rows);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (pattern[row][col]) {
                const x = startX + col * pixelW;
                const y = startY + row * pixelH;

                for (let py = y; py < y + pixelH && py < height; py++) {
                    for (let px = x; px < x + pixelW && px < width; px++) {
                        const idx = (py * width + px) * 4;
                        data[idx] = r;
                        data[idx + 1] = g;
                        data[idx + 2] = b;
                        data[idx + 3] = a;
                    }
                }
            }
        }
    }
}

/**
 * Создаёт иконку с заданным размером
 */
function createIcon(size) {
    const png = new PNG({ width: size, height: size });
    const data = png.data;

    // Цвета
    const color1 = hexToRgb('#1a202c');  // тёмно-синий
    const color2 = hexToRgb('#2d3748');  // синий-серый
    const greenColor = hexToRgb('#48bb78');  // зелёный
    const purpleColor = hexToRgb('#9f7aea'); // фиолетовый
    const yellowColor = hexToRgb('#f6e05e'); // жёлтый

    // Градиентный фон
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const t = (x + y) / (2 * size);
            const color = lerpColor(color1, color2, t);
            const idx = (y * size + x) * 4;
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
        }
    }

    // Декоративная рамка
    const padding = Math.floor(size * 0.08);
    const borderWidth = Math.floor(size * 0.04);
    drawRectBorder(data, size, size, padding, borderWidth,
        greenColor.r, greenColor.g, greenColor.b, 255);

    // Центральный портал
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);
    const portalWidth = size * 0.4;
    const portalHeight = size * 0.5;

    // Внешний фиолетовый овал (свечение)
    drawEllipse(data, size, size, centerX, centerY, portalWidth / 2, portalHeight / 2,
        purpleColor.r, purpleColor.g, purpleColor.b, 255);

    // Внутренний чёрный овал
    drawEllipse(data, size, size, centerX, centerY, portalWidth / 2.5, portalHeight / 2.5,
        0, 0, 0, 255);

    // Ещё один слой черного для глубины
    drawEllipse(data, size, size, centerX, centerY, portalWidth / 3, portalHeight / 3,
        0, 0, 0, 255);

    // Звёзды/частицы вокруг портала
    const particleCount = size >= 512 ? 8 : 4;
    const particleDistance = size * 0.28;
    const particleSize = Math.floor(size * 0.04);

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const px = Math.floor(centerX + Math.cos(angle) * particleDistance);
        const py = Math.floor(centerY + Math.sin(angle) * particleDistance);
        drawCircle(data, size, size, px, py, particleSize,
            yellowColor.r, yellowColor.g, yellowColor.b, 255);
    }

    // Текст "MP" для больших иконок
    if (size >= 192) {
        // Тень
        drawText(data, size, size, size, 0, 0, 0, 180);
        // Основной текст
        drawText(data, size, size, size, 255, 255, 255, 255);
    }

    return png;
}

/**
 * Основная функция генерации
 */
async function generateIcons() {
    console.log('🎨 Генерация PWA иконок для ArcadeQuiz...\n');

    try {
        // Создаём иконку 192x192
        console.log('📐 Создание иконки 192x192...');
        const icon192 = createIcon(192);
        const buffer192 = PNG.sync.write(icon192);
        const outputPath192 = path.join(projectRoot, 'public', 'icon-192.png');
        fs.writeFileSync(outputPath192, buffer192);
        console.log('✅ Создан: public/icon-192.png (192x192)');

        // Создаём иконку 512x512
        console.log('📐 Создание иконки 512x512...');
        const icon512 = createIcon(512);
        const buffer512 = PNG.sync.write(icon512);
        const outputPath512 = path.join(projectRoot, 'public', 'icon-512.png');
        fs.writeFileSync(outputPath512, buffer512);
        console.log('✅ Создан: public/icon-512.png (512x512)');

        console.log('\n🎉 PWA иконки успешно созданы!');
        console.log('\nСледующие шаги:');
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

// Запуск
generateIcons().then(success => {
    process.exit(success ? 0 : 1);
});
