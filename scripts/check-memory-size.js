/**
 * Скрипт проверки и ротации HISTORY.md
 *
 * Правило:
 * - Лимит: 200 строк
 * - При превышении → архивация в documentation/memory/archive/
 * - В основном файле оставлять: заголовок + summary + последние 10 записей
 *
 * Использование: node scripts/check-memory-size.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Константы
const HISTORY_FILE = path.join(projectRoot, 'documentation/memory/HISTORY.md');
const ARCHIVE_DIR = path.join(projectRoot, 'documentation/memory/archive');
const LINE_LIMIT = 200;  // Триггер ротации
const KEEP_ENTRIES = 10;  // Сколько последних записей оставить

console.log('🧠 Проверка размера HISTORY.md...\n');

/**
 * Форматирование размера файла
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Получить текущий квартал
 */
function getCurrentQuarter() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3);
    return `${year}_Q${quarter}`;
}

/**
 * Основная функция ротации
 */
function rotateHistory() {
    try {
        // 1. Проверяем существование HISTORY.md
        if (!fs.existsSync(HISTORY_FILE)) {
            console.log('   ⚠️  HISTORY.md не найден. Создам базовый файл.');
            // Базовый шаблон
            const baseTemplate = `# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## [Current Date] - Initial Setup

**Status:** ✅ FINISHED

### Summary
Memory system initialized. First entry in HISTORY.md.

---

**Rotation Policy:** If this file exceeds ${LINE_LIMIT} lines, archive older entries.
`;
            fs.writeFileSync(HISTORY_FILE, baseTemplate, 'utf-8');
            console.log('   ✅ HISTORY.md создан');
            return;
        }

        // 2. Читаем HISTORY.md
        const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const lines = content.split('\n');
        const lineCount = lines.length;
        const stats = fs.statSync(HISTORY_FILE);
        const fileSize = stats.size;

        console.log(`   📊 Текущий размер: ${lineCount} строк / ${formatSize(fileSize)}`);
        console.log(`   📏 Лимит: ${LINE_LIMIT} строк`);

        // 3. Проверяем лимит
        if (lineCount <= LINE_LIMIT) {
            console.log('   ✅ В пределах нормы. Ротация не требуется.\n');
            return;
        }

        console.log(`   ⚠️  Превышен лимит! Требуется ротация.\n`);

        // 4. Пропускаем старый Archived Summary, если он есть
        // Находим конец старого summary (ищем второй "---" после "Archived Summary")
        let startIndex = 0;
        let foundArchivedSummary = false;
        let dashCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('Archived Summary') || line.includes('📦')) {
                foundArchivedSummary = true;
                continue;
            }
            if (foundArchivedSummary && line.trim() === '---') {
                dashCount++;
                if (dashCount === 2) {
                    // Пропускаем пустые строки после второго "---"
                    startIndex = i + 1;
                    while (startIndex < lines.length && lines[startIndex].trim() === '') {
                        startIndex++;
                    }
                    break;
                }
            }
        }

        const linesToProcess = startIndex > 0 ? lines.slice(startIndex) : lines;
        console.log(`   📌 Пропущено ${startIndex} строк (старый summary + заголовки)`);

        // 5. Находим разделы (начиная с ##) в оставшихся строках
        const sections = [];
        let currentSection = [];

        for (let i = 0; i < linesToProcess.length; i++) {
            const line = linesToProcess[i];

            if (line.startsWith('## ') && currentSection.length > 0) {
                sections.push(currentSection);
                currentSection = [line];
            } else {
                currentSection.push(line);
            }
        }

        if (currentSection.length > 0) {
            sections.push(currentSection);
        }

        console.log(`   📑 Найдено разделов: ${sections.length}`);

        // 5. Разделяем на "новые" (последние KEEP_ENTRIES) и "старые"
        const newSections = sections.slice(-KEEP_ENTRIES);
        const oldSections = sections.slice(0, sections.length - KEEP_ENTRIES);

        console.log(`   📦 Для архивации: ${oldSections.length} разделов`);
        console.log(`   ✅ Остается в HISTORY.md: ${newSections.length} разделов\n`);

        // 6. Создаём архивный файл
        const quarter = getCurrentQuarter();
        const archiveFileName = `HISTORY_${quarter}.md`;
        const archiveFilePath = path.join(ARCHIVE_DIR, archiveFileName);

        // Проверяем существование архива
        let archiveContent = '';
        if (fs.existsSync(archiveFilePath)) {
            archiveContent = fs.readFileSync(archiveFilePath, 'utf-8');
            console.log(`   📝 Архив ${archiveFileName} существует. Добавляю записи.`);
        } else {
            console.log(`   📝 Создаю новый архив ${archiveFileName}`);
        }

        // Добавляем старые разделы в архив
        const archivedSectionsText = oldSections.map(section => section.join('\n')).join('\n\n');

        // Если архив новый - добавляем заголовок
        if (archiveContent === '') {
            archiveContent = `# Project History Archive - ${quarter}

**Source:** documentation/memory/HISTORY.md
**Archived:** ${new Date().toISOString()}

This file contains historical milestones that were rotated out of the main HISTORY.md file.

---

${archivedSectionsText}

---

**End of Archive ${quarter}**
`;
        } else {
            // Добавляем в конец существующего архива
            const insertPosition = archiveContent.lastIndexOf('---');
            if (insertPosition !== -1) {
                archiveContent =
                    archiveContent.slice(0, insertPosition) +
                    '\n' + archivedSectionsText + '\n\n' +
                    archiveContent.slice(insertPosition);
            } else {
                archiveContent += '\n\n' + archivedSectionsText;
            }
        }

        fs.writeFileSync(archiveFilePath, archiveContent, 'utf-8');
        console.log(`   ✅ Архивировано: ${archiveFileName}\n`);

        // 7. Создаём новый HISTORY.md с summary и новыми разделами
        const summaryLineCount = oldSections.reduce((acc, section) => acc + section.length, 0);
        const archivedDate = new Date().toISOString().split('T')[0];

        const newHistoryContent = `# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## 📦 Archived Summary (${archivedDate})

**Note:** ${oldSections.length} historical milestones have been archived.
**Archive:** [documentation/memory/archive/${archiveFileName}](documentation/memory/archive/${archiveFileName})

**Archived content:**
- ${summaryLineCount} lines of historical data
- ${oldSections.length} major milestones
- Period: Project start through ${archivedDate}

---

${newSections.map(section => section.join('\n')).join('\n\n')}

---

**Rotation Policy:** If this file exceeds ${LINE_LIMIT} lines, archive older entries to \`documentation/memory/archive/\`.
`;

        fs.writeFileSync(HISTORY_FILE, newHistoryContent, 'utf-8');

        // 8. Итог
        const newStats = fs.statSync(HISTORY_FILE);
        const newLineCount = newHistoryContent.split('\n').length;

        console.log('✅ Ротация завершена!\n');
        console.log(`   📊 До ротации: ${lineCount} строк / ${formatSize(fileSize)}`);
        console.log(`   📊 После ротации: ${newLineCount} строк / ${formatSize(newStats.size)}`);
        console.log(`   📦 Архив: documentation/memory/archive/${archiveFileName}`);
        console.log(`   📦 Архив размер: ${formatSize(fs.statSync(archiveFilePath).size)}`);

    } catch (err) {
        console.error(`\n❌ Ошибка: ${err.message}`);
        process.exit(1);
    }
}

// Запуск
console.log('='.repeat(50));
rotateHistory();
console.log('='.repeat(50));
