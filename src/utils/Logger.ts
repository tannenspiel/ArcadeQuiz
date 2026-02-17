/**
 * Утилита для логирования в файл и консоль
 * С автоматической фильтрацией по категориям через debug флаги
 */

import { DEBUG_ENABLED, DEBUG_ENTITIES, DEBUG_ANIMATION, DEBUG_UI, DEBUG_SYSTEMS, DEBUG_SCENES, DEBUG_BOOTSTRAP, DEBUG_ASSETS, DEBUG_SCENE_INIT, DEBUG_QUIZ, DEBUG_COLLISION, DEBUG_GAMEFLOW, DEBUG_PERF, DEBUG_SPAWN_VERBOSE } from '../config/debugConfig';

/**
 * Карта соответствия категорий логов к debug флагам
 */
const CATEGORY_FLAGS: Record<string, boolean> = {
  // COLLISION -> DEBUG_COLLISION (CollisionSystem логи)
  'COLLISION': DEBUG_COLLISION,

  // GAMEFLOW -> DEBUG_GAMEFLOW (игровой поток, Game Over, переходы)
  'GAMEFLOW': DEBUG_GAMEFLOW,
  'FLOW': DEBUG_GAMEFLOW,

  // PERF -> DEBUG_PERF (производительность)
  'PERF': DEBUG_PERF,

  // SPAWN_VERBOSE -> DEBUG_SPAWN_VERBOSE (детальные логи сетки)
  'SPAWN_VERBOSE': DEBUG_SPAWN_VERBOSE,
  'SPAWN_GRID': DEBUG_SPAWN_VERBOSE,

  // ENEMY_* категории -> DEBUG_ENTITIES
  'ENEMY_INIT': DEBUG_ENTITIES,
  'ENEMY_STATE': DEBUG_ENTITIES,
  'ENEMY_VISUAL_STATE': DEBUG_ENTITIES,
  'ENEMY_SPAWNING': DEBUG_ENTITIES,
  'ENEMY_DETECTION': DEBUG_ENTITIES,
  'ENEMY_COLLISION': DEBUG_ENTITIES,
  'ENEMY_DESTROY': DEBUG_ENTITIES,
  'ENEMY_DEATH': DEBUG_ENTITIES,
  'ENEMY_CONTROL': DEBUG_ENTITIES,
  'ENEMY_CLONE': DEBUG_ENTITIES,

  // PLAYER_* категории -> DEBUG_ENTITIES
  'PLAYER_STATE': DEBUG_ENTITIES,
  'PLAYER_VISUAL': DEBUG_ENTITIES,
  'PLAYER_DAMAGE': DEBUG_ENTITIES,
  'PLAYER_FLASH': DEBUG_ENTITIES,
  'FLASH_PLAYER': DEBUG_ENTITIES,

  // PLAYER_ANIMATION -> DEBUG_ANIMATION
  'PLAYER_ANIMATION': DEBUG_ANIMATION,

  // ENEMY_ANIMATION* -> DEBUG_ANIMATION
  'ENEMY_ANIMATION': DEBUG_ANIMATION,
  'ENEMY_ANIMATION_SYNC': DEBUG_ANIMATION,

  // ANIMATION_CREATE -> DEBUG_ANIMATION (создание анимаций в AnimationManager)
  'ANIMATION_CREATE': DEBUG_ANIMATION,

  // UI -> DEBUG_UI
  'UI': DEBUG_UI,

  // SPAWN_SYSTEM -> DEBUG_SYSTEMS
  'SPAWN_SYSTEM': DEBUG_SYSTEMS,

  // Подкатегории DEBUG_SYSTEMS для создания мира и сущностей
  'WORLD_GENERATOR': DEBUG_SYSTEMS,
  'ENTITY_FACTORY': DEBUG_SYSTEMS,
  'PORTAL': DEBUG_SYSTEMS,
  'ORACLE': DEBUG_SYSTEMS,

  // SCENES -> DEBUG_SCENES (инициализация систем, создание объектов)
  'SCENES': DEBUG_SCENES,

  // SCENE_INIT -> DEBUG_SCENE_INIT (детальная инициализация сцен - MainScene, BaseScene)
  'SCENE_INIT': DEBUG_SCENE_INIT,
  'SCENE_CREATE': DEBUG_SCENE_INIT,
  'SCENE_PHYSICS': DEBUG_SCENE_INIT,
  'SCENE_CAMERA': DEBUG_SCENE_INIT,
  'SCENE_SYSTEMS': DEBUG_SCENE_INIT,

  // EVENT_BUS -> DEBUG_SCENE_INIT (EventBus.emit логи)
  'EVENT_BUS': DEBUG_SCENE_INIT,

  // AUDIO -> DEBUG_SCENES (загрузка аудио, пока группируем с SCENES)
  'AUDIO': DEBUG_SCENES,

  // VIEWPORT_RESIZE -> Пока всегда включен (не отключаем пока)
  'VIEWPORT_RESIZE': true,

  // BOOTSTRAP -> DEBUG_BOOTSTRAP (PhaserGame.tsx - загрузка/разгрузка игры, PWA)
  'BOOTSTRAP': DEBUG_BOOTSTRAP,
  'BOOT': DEBUG_BOOTSTRAP,
  'PWA': DEBUG_BOOTSTRAP,

  // ASSET_LOAD -> DEBUG_ASSETS (AssetLoader.ts - загрузка изображений, спрайтов, аудио)
  'ASSET_LOAD': DEBUG_ASSETS,
  'ASSET_CACHE': DEBUG_ASSETS,

  // MODAL_UI -> DEBUG_UI (подкатегория UI для модальных окон)
  'MODAL_UI': DEBUG_UI,
  'MODAL_SIZE': DEBUG_UI,
  'BUTTON_EVENTS': DEBUG_UI,

  // COIN_BUBBLE_QUIZ -> DEBUG_UI (бабблы квиза монеток)
  'COIN_BUBBLE_QUIZ': DEBUG_UI,

  // NINE_SLICE -> DEBUG_UI (NineSliceBackground интерактивность)
  'NINE_SLICE': DEBUG_UI,

  // QUIZ -> DEBUG_QUIZ (QuizManager логи)
  'QUIZ': DEBUG_QUIZ,
  'QUIZ_QUESTION': DEBUG_QUIZ,
  'QUIZ_ANSWER': DEBUG_QUIZ,
  'QUIZ_FEEDBACK': DEBUG_QUIZ,
  'QUIZ_GLOBAL': DEBUG_QUIZ,
  'QUIZ_KEY': DEBUG_QUIZ,
  'QUIZ_PORTAL': DEBUG_QUIZ,

  // GAME_OVER -> DEBUG_GAMEFLOW (Game Over handler)
  'GAME_OVER': DEBUG_GAMEFLOW,

  // LEVEL_TRANSITION -> DEBUG_GAMEFLOW (Level transition handler)
  'LEVEL_TRANSITION': DEBUG_GAMEFLOW,

  // COLLISION_* подкатегории -> DEBUG_COLLISION
  'COLLISION_PORTAL': DEBUG_COLLISION,
  'COLLISION_ITEM': DEBUG_COLLISION,
  'COLLISION_BUSH': DEBUG_COLLISION,
  'COLLISION_STONE': DEBUG_COLLISION,

  // PIXEL_FONT -> DEBUG_UI (Pixel font calculator)
  'PIXEL_FONT': DEBUG_UI,

  // BACKGROUND -> DEBUG_ENTITIES (Background sprites)
  'BACKGROUND': DEBUG_ENTITIES,
};

class Logger {
  private logs: string[] = [];
  private maxLogs: number = 10000; // Максимальное количество логов в памяти
  // ✅ PROD: В продакшене отключаем сохранение логов в память во избежание утечек
  // ✅ TEST: Используем безопасную проверку через глобальный объект
  private logToFile: boolean = (globalThis as any).import?.meta?.env?.DEV ?? false;
  private logToConsole: boolean = true;

  /**
   * Проверить, разрешена ли категория для логирования
   */
  private isCategoryEnabled(category: string): boolean {
    // ✅ ОТЛАДКА: Выводим значения флагов для диагностики
    if (category === 'NINE_SLICE' || category === 'COIN_BUBBLE_QUIZ') {
      console.log(`🔍 Logger check [${category}]: DEBUG_ENABLED=${DEBUG_ENABLED}, in map=${category in CATEGORY_FLAGS}, value=${CATEGORY_FLAGS[category]}`);
    }

    // Master switch: если DEBUG_ENABLED=false - отключаем всё (кроме hard-coded)
    if (!DEBUG_ENABLED) {
      // VIEWPORT_RESIZE остается включенным (для отладки ресайза)
      if (category === 'VIEWPORT_RESIZE') {
        return true;
      }
      // Для остальных - проверяем CATEGORY_FLAGS, но многие будут false
    }

    // Если категория в карте - используем её флаг
    if (category in CATEGORY_FLAGS) {
      return CATEGORY_FLAGS[category];
    }

    // Если категория не в карте - запрещаем (для отлова неструктурированных логов)
    // Это заставит разработчиков явно добавить категорию в CATEGORY_FLAGS
    return false;
  }

  /**
   * Безопасно преобразовать объект в JSON с обработкой циклических ссылок
   */
  private safeStringify(obj: any): string {
    if (obj === undefined || obj === null) {
      return String(obj);
    }

    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (e) {
      return `[Object - ${(e as Error)?.message || 'Error stringifying'}]`;
    }
  }

  /**
   * Добавить лог
   */
  public log(category: string, message: string, data?: any): void {
    // Проверяем, разрешена ли категория
    if (!this.isCategoryEnabled(category)) {
      return; // Пропускаем лог если категория отключена
    }

    const timestamp = new Date().toISOString();
    const dataStr = data ? ' ' + this.safeStringify(data) : '';
    const logEntry = `[${timestamp}] [${category}] ${message}${dataStr}`;

    if (this.logToConsole) {
      console.log(logEntry);
    }

    if (this.logToFile) {
      this.logs.push(logEntry);

      // Ограничиваем размер массива логов
      if (this.logs.length > this.maxLogs) {
        this.logs.shift(); // Удаляем самый старый лог
      }
    }
  }

  /**
   * Добавить предупреждение
   */
  public warn(category: string, message: string, data?: any): void {
    // Проверяем, разрешена ли категория
    if (!this.isCategoryEnabled(category)) {
      return; // Пропускаем лог если категория отключена
    }

    const timestamp = new Date().toISOString();
    const dataStr = data ? ' ' + this.safeStringify(data) : '';
    const logEntry = `[${timestamp}] [WARN] [${category}] ${message}${dataStr}`;

    if (this.logToConsole) {
      console.warn(logEntry);
    }

    if (this.logToFile) {
      this.logs.push(logEntry);

      // Ограничиваем размер массива логов
      if (this.logs.length > this.maxLogs) {
        this.logs.shift(); // Удаляем самый старый лог
      }
    }
  }

  /**
   * Добавить ошибку
   */
  public error(category: string, message: string, data?: any): void {
    // Ошибки всегда логируем (игнорируем отключенные категории)
    const timestamp = new Date().toISOString();
    const dataStr = data ? ' ' + this.safeStringify(data) : '';
    const logEntry = `[${timestamp}] [ERROR] [${category}] ${message}${dataStr}`;

    if (this.logToConsole) {
      console.error(logEntry);
    }

    if (this.logToFile) {
      this.logs.push(logEntry);

      // Ограничиваем размер массива логов
      if (this.logs.length > this.maxLogs) {
        this.logs.shift(); // Удаляем самый старый лог
      }
    }
  }

  /**
   * Очистить логи
   */
  public clear(): void {
    this.logs = [];
  }

  /**
   * Получить все логи
   */
  public getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Скачать логи как файл
   */
  public downloadLogs(filename: string = 'animation_debug.log'): void {
    const content = this.logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Получить логи как строку
   */
  public getLogsAsString(): string {
    return this.logs.join('\n');
  }

  /**
   * Включить/выключить логирование в консоль
   */
  public setConsoleLogging(enabled: boolean): void {
    this.logToConsole = enabled;
  }

  /**
   * Включить/выключить логирование в файл
   */
  public setFileLogging(enabled: boolean): void {
    this.logToFile = enabled;
  }
}

// Экспортируем singleton
export const logger = new Logger();

// Добавляем в window для доступа из консоли браузера
if (typeof window !== 'undefined') {
  (window as any).logger = logger;
  (window as any).downloadLogs = () => logger.downloadLogs('animation_debug.log');
}
