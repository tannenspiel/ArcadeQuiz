/**
 * Скрипт для поиска неиспользуемых функций, классов и файлов в проекте
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum' | 'default';
  file: string;
  line: number;
}

interface ImportInfo {
  name: string;
  from: string;
  file: string;
}

interface FileInfo {
  path: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  isUsed: boolean;
}

// Игнорируемые файлы и папки
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx)$/,
  /\.cy\.(ts|tsx)$/,
  /\.config\.(ts|js)$/,
  /vite-env\.d\.ts$/,
  /setup\.ts$/,
  /\.backup/,
  / \(2\)\.ts$/,
  /prototype\//,
  /tutorial\//,
];

// Файлы, которые должны быть проигнорированы (точные совпадения)
const IGNORE_FILES = [
  'main.tsx',
  'App.tsx',
  'index.html',
];

// Функции/классы, которые могут использоваться косвенно (например, через строки)
const INDIRECT_USAGE = [
  'default',
  'GameScene',
  'LoadingScene',
  'MainScene',
];

function shouldIgnoreFile(filePath: string): boolean {
  const relativePath = relative(projectRoot, filePath);
  
  // Проверка точных совпадений
  if (IGNORE_FILES.some(ignore => relativePath.endsWith(ignore))) {
    return false; // Не игнорируем основные файлы
  }
  
  // Проверка паттернов
  return IGNORE_PATTERNS.some(pattern => pattern.test(relativePath));
}

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !shouldIgnoreFile(filePath)) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function extractExports(filePath: string, content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split('\n');
  
  // Регулярные выражения для разных типов экспортов
  const exportPatterns = [
    // export function name
    { regex: /^export\s+(?:async\s+)?function\s+(\w+)/gm, type: 'function' as const },
    // export class name
    { regex: /^export\s+(?:abstract\s+)?class\s+(\w+)/gm, type: 'class' as const },
    // export interface name
    { regex: /^export\s+interface\s+(\w+)/gm, type: 'interface' as const },
    // export type name
    { regex: /^export\s+type\s+(\w+)/gm, type: 'type' as const },
    // export const name
    { regex: /^export\s+const\s+(\w+)/gm, type: 'const' as const },
    // export enum name
    { regex: /^export\s+enum\s+(\w+)/gm, type: 'enum' as const },
    // export default
    { regex: /^export\s+default\s+/gm, type: 'default' as const, name: 'default' },
    // export { name }
    { regex: /^export\s*\{\s*(\w+)/gm, type: 'const' as const },
  ];
  
  for (const pattern of exportPatterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    
    while ((match = regex.exec(content)) !== null) {
      const name = pattern.name || match[1];
      const line = content.substring(0, match.index).split('\n').length;
      
      exports.push({
        name,
        type: pattern.type,
        file: filePath,
        line,
      });
    }
  }
  
  return exports;
}

function extractImports(filePath: string, content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = content.split('\n');
  
  // Регулярные выражения для импортов
  const importPatterns = [
    // import { name } from 'path'
    { regex: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g },
    // import name from 'path'
    { regex: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g },
    // import * as name from 'path'
    { regex: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g },
  ];
  
  for (const pattern of importPatterns) {
    let match;
    
    while ((match = pattern.regex.exec(content)) !== null) {
      const importPart = match[1].trim();
      const fromPath = match[2];
      
      // Обработка именованных импортов { name1, name2 }
      if (importPart.includes(',')) {
        const names = importPart.split(',').map(n => n.trim().split(' as ')[0].trim());
        for (const name of names) {
          imports.push({
            name,
            from: fromPath,
            file: filePath,
          });
        }
      } else {
        // Обработка default импорта или * as name
        const name = importPart.split(' as ')[0].trim();
        imports.push({
          name,
          from: fromPath,
          file: filePath,
        });
      }
    }
  }
  
  return imports;
}

function resolveImportPath(fromPath: string, fromFile: string): string | null {
  // Удаляем расширение
  let resolved = fromPath.replace(/\.(ts|tsx)$/, '');
  
  // Если путь начинается с . или /, это относительный путь
  if (resolved.startsWith('.')) {
    const fromDir = dirname(fromFile);
    resolved = join(fromDir, resolved);
  } else {
    // Абсолютный путь от src
    resolved = join(srcDir, resolved);
  }
  
  // Пробуем разные расширения
  const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    const fullPath = resolved + ext;
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  // Если не нашли, возвращаем путь без расширения
  return resolved;
}

function analyzeProject(): {
  unusedExports: ExportInfo[];
  unusedFiles: string[];
  duplicateFiles: string[];
} {
  const allFiles = getAllTsFiles(srcDir);
  const fileInfoMap = new Map<string, FileInfo>();
  const exportMap = new Map<string, ExportInfo[]>();
  const importMap = new Map<string, ImportInfo[]>();
  
  // Сбор информации о файлах
  for (const filePath of allFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const exports = extractExports(filePath, content);
      const imports = extractImports(filePath, content);
      
      fileInfoMap.set(filePath, {
        path: filePath,
        exports,
        imports,
        isUsed: false,
      });
      
      // Индексируем экспорты
      for (const exp of exports) {
        if (!exportMap.has(exp.name)) {
          exportMap.set(exp.name, []);
        }
        exportMap.get(exp.name)!.push(exp);
      }
      
      // Индексируем импорты
      for (const imp of imports) {
        if (!importMap.has(imp.name)) {
          importMap.set(imp.name, []);
        }
        importMap.get(imp.name)!.push(imp);
      }
    } catch (error) {
      console.error(`Ошибка при чтении файла ${filePath}:`, error);
    }
  }
  
  // Поиск неиспользуемых экспортов
  const unusedExports: ExportInfo[] = [];
  
  for (const [name, exports] of exportMap.entries()) {
    // Пропускаем косвенно используемые
    if (INDIRECT_USAGE.includes(name)) {
      continue;
    }
    
    const imports = importMap.get(name) || [];
    
    // Проверяем, используется ли экспорт
    let isUsed = false;
    for (const exp of exports) {
      for (const imp of imports) {
        const resolvedPath = resolveImportPath(imp.from, imp.file);
        if (resolvedPath && exp.file.replace(/\\/g, '/').includes(resolvedPath.replace(/\\/g, '/'))) {
          isUsed = true;
          break;
        }
      }
      
      // Проверяем использование в том же файле
      if (!isUsed) {
        const fileInfo = fileInfoMap.get(exp.file);
        if (fileInfo) {
          const content = readFileSync(exp.file, 'utf-8');
          // Ищем использование имени (но не определение)
          const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
          const matches = content.match(usageRegex);
          if (matches && matches.length > 1) { // Больше одного (определение + использование)
            isUsed = true;
          }
        }
      }
      
      if (!isUsed) {
        unusedExports.push(exp);
      }
    }
  }
  
  // Поиск неиспользуемых файлов
  const unusedFiles: string[] = [];
  
  for (const [filePath, fileInfo] of fileInfoMap.entries()) {
    // Пропускаем файлы с экспортами по умолчанию (могут использоваться косвенно)
    const hasDefaultExport = fileInfo.exports.some(e => e.type === 'default');
    if (hasDefaultExport) {
      continue;
    }
    
    // Проверяем, импортируется ли файл
    let isImported = false;
    for (const [otherPath, otherInfo] of fileInfoMap.entries()) {
      if (otherPath === filePath) continue;
      
      for (const imp of otherInfo.imports) {
        const resolvedPath = resolveImportPath(imp.from, imp.file);
        if (resolvedPath && filePath.replace(/\\/g, '/').includes(resolvedPath.replace(/\\/g, '/'))) {
          isImported = true;
          break;
        }
      }
      if (isImported) break;
    }
    
    // Если файл не импортируется и не имеет экспортов, он может быть неиспользуемым
    if (!isImported && fileInfo.exports.length === 0) {
      unusedFiles.push(filePath);
    }
  }
  
  // Поиск дубликатов файлов
  const duplicateFiles: string[] = [];
  const fileNames = new Map<string, string[]>();
  
  for (const filePath of allFiles) {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    const baseName = fileName.replace(/\.(ts|tsx)$/, '').replace(/ \(2\)$/, '').replace(/\.backup\d*$/, '');
    
    if (!fileNames.has(baseName)) {
      fileNames.set(baseName, []);
    }
    fileNames.get(baseName)!.push(filePath);
  }
  
  for (const [baseName, paths] of fileNames.entries()) {
    if (paths.length > 1) {
      // Проверяем, есть ли основной файл и резервные копии
      const mainFile = paths.find(p => !p.includes(' (2)') && !p.includes('.backup'));
      const backups = paths.filter(p => p.includes(' (2)') || p.includes('.backup'));
      
      if (mainFile && backups.length > 0) {
        duplicateFiles.push(...backups);
      } else if (paths.length > 1) {
        duplicateFiles.push(...paths.slice(1));
      }
    }
  }
  
  return {
    unusedExports,
    unusedFiles,
    duplicateFiles,
  };
}

// Запуск анализа
console.log('🔍 Анализ проекта на неиспользуемые функции и файлы...\n');

const results = analyzeProject();

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА');
console.log('═══════════════════════════════════════════════════════════\n');

// Неиспользуемые экспорты
if (results.unusedExports.length > 0) {
  console.log(`❌ Найдено неиспользуемых экспортов: ${results.unusedExports.length}\n`);
  
  // Группируем по файлам
  const byFile = new Map<string, ExportInfo[]>();
  for (const exp of results.unusedExports) {
    if (!byFile.has(exp.file)) {
      byFile.set(exp.file, []);
    }
    byFile.get(exp.file)!.push(exp);
  }
  
  for (const [file, exports] of byFile.entries()) {
    const relPath = relative(projectRoot, file);
    console.log(`📁 ${relPath}`);
    for (const exp of exports) {
      console.log(`   - ${exp.type} ${exp.name} (строка ${exp.line})`);
    }
    console.log('');
  }
} else {
  console.log('✅ Неиспользуемых экспортов не найдено\n');
}

// Неиспользуемые файлы
if (results.unusedFiles.length > 0) {
  console.log(`❌ Найдено потенциально неиспользуемых файлов: ${results.unusedFiles.length}\n`);
  for (const file of results.unusedFiles) {
    const relPath = relative(projectRoot, file);
    console.log(`   - ${relPath}`);
  }
  console.log('');
} else {
  console.log('✅ Неиспользуемых файлов не найдено\n');
}

// Дубликаты файлов
if (results.duplicateFiles.length > 0) {
  console.log(`⚠️  Найдено дубликатов/резервных копий: ${results.duplicateFiles.length}\n`);
  for (const file of results.duplicateFiles) {
    const relPath = relative(projectRoot, file);
    console.log(`   - ${relPath}`);
  }
  console.log('');
} else {
  console.log('✅ Дубликатов файлов не найдено\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('💡 Рекомендации:');
console.log('   - Проверьте неиспользуемые экспорты вручную');
console.log('   - Удалите резервные копии и дубликаты файлов');
console.log('   - Некоторые экспорты могут использоваться косвенно');
console.log('═══════════════════════════════════════════════════════════\n');
