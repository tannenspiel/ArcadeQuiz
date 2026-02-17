/**
 * Debug Configuration Flags
 *
 * Централизованная система управления логированием по модулям.
 * Все флаги управляются через переменные окружения (.env)
 *
 * Использование в .env:
 *   ARCADE_LOG_SCENES=true
 *   ARCADE_LOG_UI=true
 *   и т.д.
 */

// ============================================
// БАЗОВЫЕ ФЛАГИ
// ============================================

// Helper для безопасного доступа к import.meta.env (работает и в Jest)
function getEnv(key: string, defaultValue: string = ''): string {
    // @ts-ignore - import.meta не существует в Jest
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore - import.meta.env не существует в типах для Jest
        return import.meta.env[key] || defaultValue;
    }
    return defaultValue;
}

// Проверка на production mode - в продакшене все debug фичи отключены
function isProductionMode(): boolean {
    // @ts-ignore - import.meta не существует в Jest
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore - import.meta.env не существует в типах для Jest
        return import.meta.env.MODE === 'production';
    }
    return false;
}

// Helper для безопасного доступа ко всем env переменным
function getAllEnvKeys(): string[] {
    // @ts-ignore - import.meta не существует в Jest
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore - import.meta.env не существует в типах для Jest
        return Object.keys(import.meta.env).filter(k => k.startsWith('ARCADE_LOG_') || k.startsWith('VITE_'));
    }
    return [];
}

/// Глобальный флаг - включает ВСЁ логирование (опасно много спама!)
export const DEBUG_ALL = getEnv('ARCADE_LOG_ALL') === 'true';

/// Базовый debug режим (минимальные логи)
const _debugEnabledRaw = getEnv('ARCADE_LOG_ENABLED') === 'true';
export const DEBUG_ENABLED = DEBUG_ALL || _debugEnabledRaw;

// Debug: выводим значения в консоль для проверки
if (typeof window !== 'undefined') {
    (window as any).__DEBUG_FLAGS__ = {
        ARCADE_LOG_ENABLED: getEnv('ARCADE_LOG_ENABLED'),
        ARCADE_LOG_SCENE_INIT: getEnv('ARCADE_LOG_SCENE_INIT'),
        ARCADE_LOG_UI: getEnv('ARCADE_LOG_UI'),
        VITE_TEST_VALUE: getEnv('VITE_TEST_VALUE'),
        ALL_ENV_KEYS: getAllEnvKeys(),
        DEBUG_ENABLED: DEBUG_ENABLED,
    };
    console.log('[debugConfig] Loaded flags:', (window as any).__DEBUG_FLAGS__);
}

// ============================================
// МОДУЛЬНЫЕ ФЛАГИ
// ============================================

/// Логи сцен (MainScene, LoadingScene и т.д.)
/// Включает: init, create, update, ключевые события
export const DEBUG_SCENES = DEBUG_ALL || getEnv('ARCADE_LOG_SCENES') === 'true';

/// Логи UI (модальные окна, HUD, эффекты)
/// Включает: модалки, кнопки, тексты, анимации UI
export const DEBUG_UI = DEBUG_ALL || getEnv('ARCADE_LOG_UI') === 'true';

/// Логи сущностей (Player, Enemy, Portal, Oracle)
/// Включает: состояние, анимации, transitions
export const DEBUG_ENTITIES = DEBUG_ALL || getEnv('ARCADE_LOG_ENTITIES') === 'true';

/// Логи систем (SpawnSystem, CollisionSystem, WorldGenerator)
/// Включает: спавн, коллизии, генерацию мира
export const DEBUG_SYSTEMS = DEBUG_ALL || getEnv('ARCADE_LOG_SYSTEMS') === 'true';

/// Логи коллизий (детальные)
/// Включает: каждый collision event, overlap, process
/// ОСТОРОЖНО: Очень много спама!
/// Управляется через ARCADE_LOG_COLLISION (true=включены, false=отключены) или VITE_DISABLE_COLLISION_LOGS (инвертированная логика)

// Вспомогательная функция для очистки значений env от inline комментариев
function cleanEnvValue(val: string | undefined): string | undefined {
    if (!val) return undefined;
    // Удаляем всё после # и пробелы
    const cleaned = val.split('#')[0].trim();
    return cleaned || undefined;
}

// ВРЕМЕННО: Отладка
const _DEBUG_ALL = DEBUG_ALL;
const _ARCADE_LOG_COLLISION = getEnv('ARCADE_LOG_COLLISION') === 'true';
const _VITE_DISABLE_RAW = cleanEnvValue(getEnv('VITE_DISABLE_COLLISION_LOGS'));
// VITE_DISABLE_COLLISION_LOGS=true → ОТКЛЮЧАЕТ логи (disable collision logs)
// Поэтому _VITE_DISABLE_COLLISION_LOGS=true означает, что логи ВКЛЮЧЕНЫ (для включения в OR)
const _VITE_DISABLE_COLLISION_LOGS = _VITE_DISABLE_RAW === 'false';
export const DEBUG_COLLISION = _DEBUG_ALL || _ARCADE_LOG_COLLISION || _VITE_DISABLE_COLLISION_LOGS;

if (typeof window !== 'undefined') {
    (window as any).__DEBUG_COLLISION_DEBUG__ = {
        DEBUG_COLLISION,
        _DEBUG_ALL,
        _ARCADE_LOG_COLLISION,
        _VITE_DISABLE_COLLISION_LOGS,
        _VITE_DISABLE_RAW,
        ARCADE_LOG_COLLISION_raw: getEnv('ARCADE_LOG_COLLISION'),
        VITE_DISABLE_COLLISION_LOGS_raw: getEnv('VITE_DISABLE_COLLISION_LOGS'),
        VITE_DISABLE_CLEANED: _VITE_DISABLE_RAW
    };
}

/// Логи анимаций (AnimationSync)
/// Включает: frame changes, animation events
/// ОСТОРОЖНО: Каждый кадр анимации!
export const DEBUG_ANIMATION = DEBUG_ALL || getEnv('ARCADE_LOG_ANIMATION') === 'true';

/// Логи спавна (spawn matrix grid)
/// Включает: координаты permanent cells
/// ОСТОРОЖНО: Много спама при каждом обновлении сетки!
export const DEBUG_SPAWN_VERBOSE = DEBUG_ALL || getEnv('ARCADE_LOG_SPAWN_VERBOSE') === 'true';

/// Логи викторин (Quiz)
/// Включает: вопросы, ответы, feedback
export const DEBUG_QUIZ = DEBUG_ALL || getEnv('ARCADE_LOG_QUIZ') === 'true';

/// Подсветка правильного портала зелёным (debug mode для PortalModal)
/// Включает: правильный портал показывается зелёным (вместо красно-оранжевого)
export const DEBUG_QUIZ_PORTAL = DEBUG_ALL || getEnv('ARCADE_LOG_QUIZ_PORTAL') === 'true';

/// Принудительный показ конкретного глобального вопроса с картинкой для порталов
/// Включает: при входе в портал всегда показывается вопрос с картинкой (для тестирования PortalModal)
export const DEBUG_FORCE_PORTAL_IMAGE_QUESTION = DEBUG_ALL || getEnv('ARCADE_DEBUG_PORTAL_IMAGE') === 'true';

/// Лои игрового потока (Game Over, Level Transition)
/// Включает: рестарт, переходы, win/lose
export const DEBUG_GAMEFLOW = DEBUG_ALL || getEnv('ARCADE_LOG_GAMEFLOW') === 'true';

/// Логи производительности (FPS, timings)
/// Включает: измерение времени выполнения функций
export const DEBUG_PERF = getEnv('ARCADE_LOG_PERF') === 'true'; // Не включается через DEBUG_ALL

/// Логи загрузки игры (PhaserGame.tsx)
/// Включает: загрузка/разгрузку игры, PWA обновления, изменение ориентации
export const DEBUG_BOOTSTRAP = DEBUG_ALL || getEnv('ARCADE_LOG_BOOTSTRAP') === 'true';

/// Логи загрузки ассетов (AssetLoader.ts)
/// Включает: загрузку изображений, спрайтов, аудио файлов
export const DEBUG_ASSETS = DEBUG_ALL || getEnv('ARCADE_LOG_ASSETS') === 'true';

/// Логи детальной инициализации сцен (MainScene, BaseScene)
/// Включает: пошаговую инициализацию систем, create(), setupPhysics(), EventBus
export const DEBUG_SCENE_INIT = DEBUG_ALL || getEnv('ARCADE_LOG_SCENE_INIT') === 'true';

// ============================================
// ВИЗУАЛЬНЫЕ ФЛАГИ (Debug Overlay)
// ============================================

// 🔒 PRODUCTION SAFETY: В production режиме все визуальные debug фичи отключены
const _IS_PRODUCTION = isProductionMode();

/// Debug Overlay - текстовый оверлей (FPS, позиция игрока, счёт, враги)
/// Отдельный флаг от DEBUG_UI - можно включать overlay без логов
/// ⚠️ ВСЕГДА отключен в production
export const DEBUG_OVERLAY_ENABLED = !_IS_PRODUCTION && getEnv('ARCADE_LOG_OVERLAY_ENABLED') === 'true';

/// Visual Grid - визуальная сетка спавна на карте (ячейки 64×64, занятость)
/// Независимый флаг от DEBUG_OVERLAY_ENABLED - можно показывать сетку без текста
/// ⚠️ ВСЕГДА отключен в production
export const DEBUG_VISUAL_GRID_ENABLED = !_IS_PRODUCTION && getEnv('ARCADE_LOG_VISUAL_GRID_ENABLED') === 'true';

/// Детальные логи сетки спавна в консоли (координаты permanent cells)
/// ОСТОРОЖНО: Много спама при каждом обновлении сетки!
/// ⚠️ ВСЕГДА отключен в production
export const DEBUG_SPAWN_GRID_ENABLED = !_IS_PRODUCTION && getEnv('ARCADE_LOG_SPAWN_GRID_ENABLED') === 'true';

/// Отладочные рамки блоков модальных окон (KeyQuestionModal, PortalModal, CoinBubbleQuiz)
/// Показывает цветные прямоугольники вокруг каждого блока и текстового поля
/// ⚠️ ВСЕГДА отключен в production
export const DEBUG_MODAL_BOUNDS = !_IS_PRODUCTION && getEnv('VITE_DEBUG_MODAL_BOUNDS') === 'true';

export const DEBUG_BUTTON_EVENTS = getEnv('VITE_DEBUG_BUTTON_EVENTS') === 'true';

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Условное логирование для сцен
 */
export const logScene = (message: string, ...args: any[]) => {
    if (DEBUG_SCENES) {
        console.log(`[SCENE] ${message}`, ...args);
    }
};

/**
 * Условное логирование для UI
 */
export const logUI = (message: string, ...args: any[]) => {
    if (DEBUG_UI) {
        console.log(`[UI] ${message}`, ...args);
    }
};

/**
 * Условное логирование для сущностей
 */
export const logEntity = (message: string, ...args: any[]) => {
    if (DEBUG_ENTITIES) {
        console.log(`[ENTITY] ${message}`, ...args);
    }
};

/**
 * Условное логирование для систем
 */
export const logSystem = (message: string, ...args: any[]) => {
    if (DEBUG_SYSTEMS) {
        console.log(`[SYSTEM] ${message}`, ...args);
    }
};

/**
 * Условное логирование для коллизий
 */
export const logCollision = (message: string, ...args: any[]) => {
    if (DEBUG_COLLISION) {
        console.log(`[COLLISION] ${message}`, ...args);
    }
};

/**
 * Условное логирование для анимаций
 */
export const logAnimation = (message: string, ...args: any[]) => {
    if (DEBUG_ANIMATION) {
        console.log(`[ANIM] ${message}`, ...args);
    }
};

/**
 * Условное логирование для викторин
 */
export const logQuiz = (message: string, ...args: any[]) => {
    if (DEBUG_QUIZ) {
        console.log(`[QUIZ] ${message}`, ...args);
    }
};

/**
 * Условное логирование для игрового потока
 */
export const logGameflow = (message: string, ...args: any[]) => {
    if (DEBUG_GAMEFLOW) {
        console.log(`[FLOW] ${message}`, ...args);
    }
};

/**
 * Лог производительности (включается отдельно)
 */
export const logPerf = (message: string, ...args: any[]) => {
    if (DEBUG_PERF) {
        console.log(`[PERF] ${message}`, ...args);
    }
};

/**
 * Условное логирование для загрузки игры (Bootstrap/PhaserGame)
 */
export const logBootstrap = (message: string, ...args: any[]) => {
    if (DEBUG_BOOTSTRAP) {
        console.log(`[BOOTSTRAP] ${message}`, ...args);
    }
};

/**
 * Условное логирование для загрузки ассетов (AssetLoader)
 */
export const logAsset = (message: string, ...args: any[]) => {
    if (DEBUG_ASSETS) {
        console.log(`[ASSET] ${message}`, ...args);
    }
};

/**
 * Условное логирование для детальной инициализации сцен
 */
export const logSceneInit = (message: string, ...args: any[]) => {
    if (DEBUG_SCENE_INIT) {
        console.log(`[SCENE_INIT] ${message}`, ...args);
    }
};
