/**
 * Скрипт для сохранения результатов тестов в файлы
 * Использование: node scripts/save-test-results.js [test-file]
 * Пример: node scripts/save-test-results.js src/tests/unit/ui/QuestionBubble.test.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Получаем аргументы командной строки
const testFile = process.argv[2] || 'src/tests/unit/ui/QuestionBubble.test.ts';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

// Определяем имя файла для результатов
const testFileName = path.basename(testFile, '.test.ts');
const resultsDir = path.join(rootDir, 'documentation', 'temp_docs');
const logFile = path.join(resultsDir, `TEST_${testFileName}_${timestamp}.log`);
const jsonFile = path.join(resultsDir, `TEST_${testFileName}_${timestamp}.json`);

// Создаем директорию, если её нет
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

console.log(`🧪 Запуск тестов: ${testFile}`);
console.log(`📁 Результаты будут сохранены в:`);
console.log(`   - Лог: ${logFile}`);
console.log(`   - JSON: ${jsonFile}`);

try {
  // Запускаем тесты с сохранением в лог
  console.log('\n📝 Сохранение текстового лога...');
  execSync(`npm test -- ${testFile} > "${logFile}" 2>&1`, {
    cwd: rootDir,
    encoding: 'utf-8'
  });

  // Запускаем тесты с сохранением в JSON
  console.log('\n📊 Сохранение JSON результатов...');
  execSync(`npm test -- ${testFile} --json --outputFile="${jsonFile}"`, {
    cwd: rootDir,
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log('\n✅ Результаты тестов успешно сохранены!');
  console.log(`   📄 Лог: ${logFile}`);
  console.log(`   📊 JSON: ${jsonFile}`);
  
  // Показываем краткую статистику из JSON
  if (fs.existsSync(jsonFile)) {
    const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    console.log('\n📈 Статистика тестов:');
    console.log(`   ✅ Успешно: ${jsonData.numPassedTests}`);
    console.log(`   ❌ Провалено: ${jsonData.numFailedTests}`);
    console.log(`   ⏱️  Время: ${(jsonData.testResults[0]?.endTime - jsonData.testResults[0]?.startTime) / 1000}s`);
    
    // Генерируем читаемый отчет
    console.log('\n📝 Генерация читаемого отчета...');
    try {
      execSync(`node scripts/generate-test-report.js "${jsonFile}"`, {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'inherit'
      });
      const reportFile = jsonFile.replace('.json', '_REPORT.md');
      console.log(`   📄 Отчет: ${reportFile}`);
    } catch (e) {
      console.warn('⚠️ Не удалось создать отчет:', e.message);
    }
  }
} catch (error) {
  console.error('\n❌ Ошибка при выполнении тестов:', error.message);
  process.exit(1);
}

