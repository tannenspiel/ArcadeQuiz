import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logFile = join(__dirname, 'documentation', 'temp_docs', 'TEST_MODAL_FIXES.log');

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 ЗАПУСК ТЕСТОВ: GameOverModal и KeyQuestionModal');
console.log('═══════════════════════════════════════════════════════════\n');

const testFiles = [
  'src/tests/unit/ui/GameOverModal.test.ts',
  'src/tests/unit/ui/KeyQuestionModal.test.ts'
];

try {
  console.log('Запуск тестов...\n');
  const command = `npx jest ${testFiles.join(' ')} --verbose --no-coverage`;
  
  const output = execSync(command, {
    encoding: 'utf8',
    cwd: __dirname,
    stdio: 'pipe',
    maxBuffer: 10 * 1024 * 1024 // 10MB буфер для больших выводов
  });
  
  // Если дошли сюда, значит тесты прошли успешно
  const successMessage = `✅ Все тесты прошли успешно!\n\nКоманда: ${command}\n\n`;
  const fullOutput = successMessage + output;
  writeFileSync(logFile, fullOutput, 'utf8');
  console.log(output);
  console.log(`\n✅ Результаты сохранены в: ${logFile}`);
  
} catch (error) {
  // Логируем всю доступную информацию об ошибке
  console.error('=== DEBUG ERROR INFO ===');
  console.error('Error type:', error.constructor.name);
  console.error('Error keys:', Object.keys(error));
  console.error('Has stdout:', !!error.stdout);
  console.error('Has stderr:', !!error.stderr);
  console.error('Has message:', !!error.message);
  console.error('Has stack:', !!error.stack);
  console.error('Error code:', error.code);
  console.error('Error signal:', error.signal);
  console.error('======================\n');
  
  // Собираем полную информацию об ошибке
  let errorOutput = '';
  
  if (error.stdout) {
    errorOutput += '=== STDOUT ===\n' + error.stdout + '\n\n';
  }
  
  if (error.stderr) {
    errorOutput += '=== STDERR ===\n' + error.stderr + '\n\n';
  }
  
  if (error.message) {
    errorOutput += '=== ERROR MESSAGE ===\n' + error.message + '\n\n';
  }
  
  if (error.stack) {
    errorOutput += '=== STACK TRACE ===\n' + error.stack + '\n\n';
  }
  
  if (!errorOutput) {
    errorOutput = String(error);
  }
  
  const fullOutput = `❌ Ошибка при выполнении тестов:\n\nКоманда: npx jest ${testFiles.join(' ')} --verbose --no-coverage\n\n${errorOutput}`;
  writeFileSync(logFile, fullOutput, 'utf8');
  console.error('\n❌ Ошибка при выполнении тестов');
  console.error(errorOutput);
  process.exit(1);
}






