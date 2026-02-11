/**
 * Скрипт для генерации читаемого отчета из JSON результатов тестов
 * Использование: node scripts/generate-test-report.js [json-file]
 * Пример: node scripts/generate-test-report.js documentation/temp_docs/TEST_QuestionBubble_2025-12-08T20-09-39.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Получаем аргументы командной строки
const jsonFile = process.argv[2] || 'documentation/temp_docs/TEST_QuestionBubble_2025-12-08T20-09-39.json';

if (!fs.existsSync(jsonFile)) {
  console.error(`❌ Файл не найден: ${jsonFile}`);
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
const reportFile = jsonFile.replace('.json', '_REPORT.md');

// Генерируем отчет
let report = `# Отчет о результатах тестов\n\n`;
report += `**Дата:** ${new Date(jsonData.startTime).toLocaleString('ru-RU')}\n`;
report += `**Файл теста:** ${jsonData.testResults[0]?.name || 'N/A'}\n\n`;

// Общая статистика
report += `## 📊 Общая статистика\n\n`;
report += `- ✅ **Успешно:** ${jsonData.numPassedTests}\n`;
report += `- ❌ **Провалено:** ${jsonData.numFailedTests}\n`;
report += `- ⏱️ **Всего тестов:** ${jsonData.numTotalTests}\n`;
report += `- 📦 **Test Suites:** ${jsonData.numPassedTestSuites}/${jsonData.numTotalTestSuites} прошли\n`;

if (jsonData.testResults[0]) {
  const duration = (jsonData.testResults[0].endTime - jsonData.testResults[0].startTime) / 1000;
  report += `- ⏱️ **Время выполнения:** ${duration.toFixed(2)}s\n`;
}

report += `\n## ✅ Результаты тестов\n\n`;

// Группируем тесты по категориям
const testResults = jsonData.testResults[0]?.assertionResults || [];
const groupedTests = {};

testResults.forEach(test => {
  const category = test.ancestorTitles[1] || 'Без категории';
  if (!groupedTests[category]) {
    groupedTests[category] = [];
  }
  groupedTests[category].push(test);
});

// Выводим результаты по категориям
Object.entries(groupedTests).forEach(([category, tests]) => {
  report += `### ${category}\n\n`;
  
  tests.forEach(test => {
    const status = test.status === 'passed' ? '✅' : '❌';
    const duration = test.duration ? `(${test.duration}ms)` : '';
    report += `${status} **${test.title}** ${duration}\n`;
    
    if (test.failureMessages && test.failureMessages.length > 0) {
      report += `\n\`\`\`\n${test.failureMessages.join('\n')}\n\`\`\`\n`;
    }
  });
  
  report += `\n`;
});

// Статистика по категориям
report += `## 📈 Статистика по категориям\n\n`;
Object.entries(groupedTests).forEach(([category, tests]) => {
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const total = tests.length;
  const avgDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0) / total;
  
  report += `### ${category}\n`;
  report += `- Всего: ${total}\n`;
  report += `- ✅ Успешно: ${passed}\n`;
  report += `- ❌ Провалено: ${failed}\n`;
  report += `- ⏱️ Среднее время: ${avgDuration.toFixed(2)}ms\n\n`;
});

// Самые медленные тесты
const slowTests = [...testResults]
  .sort((a, b) => (b.duration || 0) - (a.duration || 0))
  .slice(0, 5);

if (slowTests.length > 0) {
  report += `## 🐌 Самые медленные тесты (топ-5)\n\n`;
  slowTests.forEach((test, index) => {
    report += `${index + 1}. **${test.title}** - ${test.duration}ms\n`;
  });
  report += `\n`;
}

// Сохраняем отчет
fs.writeFileSync(reportFile, report, 'utf-8');
console.log(`✅ Отчет создан: ${reportFile}`);
console.log(`\n📊 Статистика:`);
console.log(`   ✅ Успешно: ${jsonData.numPassedTests}`);
console.log(`   ❌ Провалено: ${jsonData.numFailedTests}`);
console.log(`   ⏱️ Время: ${((jsonData.testResults[0]?.endTime - jsonData.testResults[0]?.startTime) / 1000).toFixed(2)}s`);













