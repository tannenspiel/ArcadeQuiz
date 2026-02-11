/**
 * Скрипт для очистки временных файлов проекта
 *
 * Очищает:
 * - tmpclaude-*-cwd файлы (создаются Claude Code)
 *
 * Использование: node scripts/cleanup-temp-files.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 Очистка временных файлов проекта...\n');

let deletedCount = 0;
let totalSize = 0;

// Функция для форматирования размера
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 1. Очистка tmpclaude-*-cwd файлов
console.log('📁 Проверка tmpclaude-*-cwd файлов в корне...');
try {
    const files = fs.readdirSync(projectRoot);
    const tmpclaudeFiles = files.filter(f => f.startsWith('tmpclaude-') && f.endsWith('-cwd'));

    if (tmpclaudeFiles.length === 0) {
        console.log('   ✅ Файлов не найдено');
    } else {
        console.log(`   🔍 Найдено файлов: ${tmpclaudeFiles.length}`);

        tmpclaudeFiles.forEach(file => {
            const filePath = path.join(projectRoot, file);
            try {
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;
                fs.unlinkSync(filePath);
                deletedCount++;
                totalSize += fileSize;
                console.log(`   🗑️  Удалён: ${file} (${formatSize(fileSize)})`);
            } catch (err) {
                console.log(`   ⚠️  Ошибка удаления ${file}: ${err.message}`);
            }
        });
    }
} catch (err) {
    console.log(`   ❌ Ошибка чтения директории: ${err.message}`);
}

// Итог
console.log('\n' + '='.repeat(50));
console.log(`✅ Очистка завершена!`);
console.log(`   Удалено файлов: ${deletedCount}`);
console.log(`   Освобождено: ${formatSize(totalSize)}`);
console.log('='.repeat(50));
