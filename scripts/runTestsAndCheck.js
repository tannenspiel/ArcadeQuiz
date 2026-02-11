/**
 * Скрипт для автоматического запуска тестов и проверки результатов
 * Запускает npm run test:log и анализирует лог-файл на наличие ошибок
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// __dirname указывает на scripts/, поэтому нужно подняться на уровень вверх
const projectRoot = join(__dirname, '..');
const logPath = join(projectRoot, 'documentation/temp_docs/TEST_RESULTS.log');

// Очистка экрана для лучшей читаемости
console.clear();
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 АВТОМАТИЧЕСКИЙ ЗАПУСК ТЕСТОВ');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📝 Запуск тестов с логированием в файл...\n');

try {
  // Шаг 1: Запуск тестов с выводом в терминал
  // Используем 'inherit' для отображения прогресса, но основная информация будет в логе
  execSync('npm run test:log', { 
    stdio: 'inherit',
    cwd: __dirname,
    encoding: 'utf8'
  });
  
  console.log('\n📊 Анализ результатов тестов...\n');
  
  // Шаг 2: Проверка существования лог-файла
  if (!existsSync(logPath)) {
    console.error('❌ Лог-файл не найден:', logPath);
    process.exit(1);
  }
  
  // Шаг 3: Чтение лог-файла
  const logData = readFileSync(logPath, 'utf-8');
  
  // Шаг 4: Парсинг результатов тестов
  const testSuitesMatch = logData.match(/Test Suites: (\d+) failed, (\d+) passed, (\d+) total/);
  const testsMatch = logData.match(/Tests:\s+(\d+) failed, (\d+) passed, (\d+) total/);
  
  if (!testSuitesMatch || !testsMatch) {
    console.error('❌ Не удалось найти информацию о результатах тестов в логе');
    process.exit(1);
  }
  
  const failedSuites = parseInt(testSuitesMatch[1], 10);
  const passedSuites = parseInt(testSuitesMatch[2], 10);
  const totalSuites = parseInt(testSuitesMatch[3], 10);
  
  const failedTests = parseInt(testsMatch[1], 10);
  const passedTests = parseInt(testsMatch[2], 10);
  const totalTests = parseInt(testsMatch[3], 10);
  
  // Вывод статистики
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 СТАТИСТИКА ТЕСТОВ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Test Suites: ${failedSuites} failed, ${passedSuites} passed, ${totalSuites} total`);
  console.log(`Tests:       ${failedTests} failed, ${passedTests} passed, ${totalTests} total`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Шаг 5: Поиск упавших тестовых файлов
  const failPattern = /FAIL\s+(.+\.test\.ts)/g;
  const failedFiles = [];
  let match;
  
  while ((match = failPattern.exec(logData)) !== null) {
    if (!failedFiles.includes(match[1])) {
      failedFiles.push(match[1]);
    }
  }
  
  // Поиск ошибок в логе
  const errorPattern = /TypeError|ReferenceError|SyntaxError|Error:/g;
  const errorMessages = [];
  const errorLines = logData.split('\n');
  
  errorLines.forEach((line, index) => {
    if (errorPattern.test(line)) {
      // Берем контекст вокруг ошибки (2 строки до и после)
      const start = Math.max(0, index - 2);
      const end = Math.min(errorLines.length, index + 3);
      const context = errorLines.slice(start, end).map((l, i) => {
        const lineNum = start + i + 1;
        const prefix = i === 2 ? '>>> ' : '    ';
        return `${prefix}${lineNum}: ${l}`;
      }).join('\n');
      
      errorMessages.push({
        line: index + 1,
        error: line.trim(),
        context: context
      });
    }
  });
  
  // Шаг 6: Вывод результатов
  if (failedSuites === 0 && failedTests === 0) {
    console.log('✅ Все тесты прошли успешно!\n');
    process.exit(0);
  } else {
    console.log('❌ Обнаружены ошибки в тестах:\n');
    
    // Вывод упавших файлов
    if (failedFiles.length > 0) {
      console.log('📁 Упавшие тестовые файлы:');
      failedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('');
    }
    
    // Вывод ошибок
    if (errorMessages.length > 0) {
      console.log(`🔍 Найдено ошибок: ${errorMessages.length}`);
      console.log('   (Первые 5 ошибок для анализа)\n');
      
      errorMessages.slice(0, 5).forEach((error, index) => {
        console.log(`   Ошибка ${index + 1} (строка ${error.line}):`);
        console.log(`   ${error.error}\n`);
        if (error.context) {
          console.log(`   Контекст:`);
          console.log(error.context);
          console.log('');
        }
      });
      
      if (errorMessages.length > 5) {
        console.log(`   ... и еще ${errorMessages.length - 5} ошибок\n`);
      }
    }
    
    console.log('💡 Для детального анализа откройте файл:');
    console.log(`   ${logPath}\n`);
    
    process.exit(1);
  }
  
} catch (error) {
  // Ошибка выполнения команды - это нормально, если тесты упали
  // Продолжаем анализ лога, даже если команда вернула ошибку
  if (error.status !== undefined && error.status !== 0) {
    console.log('\n⚠️  Тесты завершились с ошибками (это ожидаемо, если есть упавшие тесты)');
    console.log('📊 Продолжаем анализ результатов...\n');
  } else {
    console.error('\n❌ Ошибка при выполнении скрипта:', error.message);
    if (error.stdout) {
      console.error('Stdout:', error.stdout.toString());
    }
    if (error.stderr) {
      console.error('Stderr:', error.stderr.toString());
    }
    process.exit(1);
  }
}
