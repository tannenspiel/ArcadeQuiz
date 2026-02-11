/**
 * Генератор PWA иконок для ArcadeQuiz с использованием Jimp
 *
 * Создаёт icon-192.png и icon-512.png
 *
 * Запуск: node scripts/generate-pwa-icons-jimp.js
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Import Jimp properly for ESM
const { default: Jimp } = await import('jimp');

/**
 * Рисует эллипс (портал) на изображении
 */
function drawEllipse(image, centerX, centerY, radiusX, radiusY, color) {
    for (let y = 0; y < image.bitmap.height; y++) {
        for (let x = 0; x < image.bitmap.width; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            const distance = dx * dx + dy * dy;

            if (distance <= 1) {
                image.setPixelColor(color, x, y);
            }
        }
    }
}

/**
 * Рисует кольцо (рамка портала)
 */
function drawEllipseRing(image, centerX, centerY, radiusX, radiusY, color, thickness) {
    for (let y = 0; y < image.bitmap.height; y++) {
        for (let x = 0; x < image.bitmap.width; x++) {
            const dx = (x - centerX) / radiusX;
            const dy = (y - centerY) / radiusY;
            const distance = dx * dx + dy * dy;

            if (distance <= 1 && distance >= 0.7) {
                image.setPixelColor(color, x, y);
            }
        }
    }
}

/**
 * Рисует круг (звёзды/частицы)
 */
function drawCircle(image, centerX, centerY, radius, color) {
    for (let y = Math.floor(centerY - radius); y <= centerY + radius; y++) {
        for (let x = Math.floor(centerX - radius); x <= centerX + radius; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            if (dx * dx + dy * dy <= radius * radius) {
                if (y >= 0 && y < image.bitmap.height && x >= 0 && x < image.bitmap.width) {
                    image.setPixelColor(color, x, y);
                }
            }
        }
    }
}

/**
 * Создаёт градиентный фон
 */
function createGradientBackground(image, size) {
    const color1 = Jimp.cssColorToRGBA('#1a202c');
    const color2 = Jimp.cssColorToRGBA('#2d3748');

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const t = (x + y) / (2 * size); // Градиент от 0 до 1
            const r = Math.round(color1.r * (1 - t) + color2.r * t);
            const g = Math.round(color1.g * (1 - t) + color2.g * t);
            const b = Math.round(color1.b * (1 - t) + color2.b * t);
            const a = 255;
            const hex = Jimp.rgbaToInt(r, g, b, a);
            image.setPixelColor(hex, x, y);
        }
    }
}

/**
 * Создаёт иконку с заданным размером
 */
async function createIcon(size) {
    console.log(`📐 Создание иконки ${size}x${size}...`);

    const image = new Jimp(size, size);

    // Градиентный фон
    createGradientBackground(image, size);

    // Декоративная рамка
    const padding = Math.floor(size * 0.08);
    const borderThickness = Math.floor(size * 0.04);
    const borderColor = Jimp.cssColorToHex('#48bb78');

    // Рисуем рамку (прямоугольник)
    for (let y = padding; y < size - padding; y++) {
        for (let x = padding; x < size - padding; x++) {
            // Верхняя и нижняя границы
            if (y < padding + borderThickness || y > size - padding - borderThickness) {
                image.setPixelColor(borderColor, x, y);
            }
            // Левая и правая границы
            if (x < padding + borderThickness || x > size - padding - borderThickness) {
                image.setPixelColor(borderColor, x, y);
            }
        }
    }

    // Центральный портал (овал)
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);
    const portalWidth = size * 0.4;
    const portalHeight = size * 0.5;

    // Внешний фиолетовый овал (свечение)
    const glowColor = Jimp.cssColorToHex('#9f7aea');
    drawEllipse(image, centerX, centerY, portalWidth / 2, portalHeight / 2, glowColor);

    // Внутренний чёрный овал
    const blackColor = Jimp.cssColorToHex('#000000');
    drawEllipse(image, centerX, centerY, portalWidth / 2.5, portalHeight / 2.5, blackColor);

    // Второй слой черного для большей глубины
    drawEllipse(image, centerX, centerY, portalWidth / 3, portalHeight / 3, 0xFF000000);

    // Звёзды/частицы вокруг портала
    const particleCount = size >= 512 ? 8 : 4;
    const particleDistance = size * 0.28;
    const particleSize = Math.floor(size * 0.04);
    const yellowColor = Jimp.cssColorToHex('#f6e05e');

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const px = Math.floor(centerX + Math.cos(angle) * particleDistance);
        const py = Math.floor(centerY + Math.sin(angle) * particleDistance);
        drawCircle(image, px, py, particleSize, yellowColor);
    }

    // Текст "MP" для больших иконок
    if (size >= 192) {
        const font = await Jimp.loadFont(
            size >= 512
                ? Jimp.FONT_SANS_128_WHITE
                : Jimp.FONT_SANS_64_WHITE
        );

        const fontSize = size >= 512 ? 128 : 64;
        const text = 'MP';
        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text);

        const textX = Math.floor((size - textWidth) / 2);
        const textY = Math.floor((size - textHeight) / 2);

        // Тень для текста
        image.print(font, textX + 2, textY + 2, {
            text: text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }, size, size);

        // Основной текст
        image.print(font, textX, textY, {
            text: 'MP',
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }, size, size);
    }

    return image;
}

/**
 * Основная функция генерации
 */
async function generateIcons() {
    console.log('🎨 Генерация PWA иконок для ArcadeQuiz...\n');

    try {
        // Создаём иконку 192x192
        const icon192 = await createIcon(192);
        const outputPath192 = path.join(projectRoot, 'public', 'icon-192.png');
        await icon192.writeAsync(outputPath192);
        console.log('✅ Создан: public/icon-192.png (192x192)');

        // Создаём иконку 512x512
        const icon512 = await createIcon(512);
        const outputPath512 = path.join(projectRoot, 'public', 'icon-512.png');
        await icon512.writeAsync(outputPath512);
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
