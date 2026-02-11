import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logFile = join(__dirname, 'documentation', 'temp_docs', 'TEST_MODAL_FIXES.log');

console.log('Запуск тестов...\n');

try {
  const output = execSync(
    'npx jest src/tests/unit/ui/GameOverModal.test.ts src/tests/unit/ui/KeyQuestionModal.test.ts --verbose --no-coverage',
    {
      encoding: 'utf8',
      cwd: __dirname,
      stdio: 'pipe'
    }
  );
  
  writeFileSync(logFile, output, 'utf8');
  console.log('✅ Все тесты прошли успешно!');
  console.log(`Результаты сохранены в: ${logFile}`);
  console.log('\n--- Последние 30 строк ---\n');
  const lines = output.split('\n');
  console.log(lines.slice(-30).join('\n'));
  
} catch (error) {
  const errorOutput = error.stdout || error.stderr || error.message || String(error);
  const fullOutput = `❌ Ошибка при выполнении тестов:\n\n${errorOutput}\n`;
  writeFileSync(logFile, fullOutput, 'utf8');
  console.error('❌ Ошибка при выполнении тестов');
  console.error('\n--- Последние 50 строк ошибки ---\n');
  const lines = errorOutput.split('\n');
  console.error(lines.slice(-50).join('\n'));
  process.exit(1);
}


