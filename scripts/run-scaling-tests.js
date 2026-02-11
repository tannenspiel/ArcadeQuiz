/**
 * Скрипт для запуска тестов масштабирования модальных окон
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Запуск тестов масштабирования модальных окон...\n');

const tests = [
  'src/tests/unit/ui/ModalSizeCalculator.test.ts',
  'src/tests/unit/utils/FontSizeCalculator.test.ts',
  'src/tests/unit/ui/KeyQuestionModal.test.ts',
  'src/tests/unit/ui/PortalModal.test.ts',
  'src/tests/unit/ui/GameOverModal.test.ts',
  'src/tests/integration/modal-scaling.test.ts'
];

let totalPassed = 0;
let totalFailed = 0;

tests.forEach((testFile, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/${tests.length}] Запуск: ${testFile}`);
  console.log('='.repeat(60));
  
  try {
    const result = execSync(
      `npx jest "${testFile}" --no-coverage --reporters=default`,
      { 
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: __dirname
      }
    );
    totalPassed++;
  } catch (error) {
    totalFailed++;
    console.error(`\n❌ Тесты в ${testFile} завершились с ошибками`);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
console.log('='.repeat(60));
console.log(`✅ Успешно: ${totalPassed}`);
console.log(`❌ С ошибками: ${totalFailed}`);
console.log(`📁 Всего файлов: ${tests.length}`);
console.log('='.repeat(60));

if (totalFailed > 0) {
  process.exit(1);
}











































