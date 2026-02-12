/**
 * Конфигурация игры
 * Аналог #define CURRENT_THEME из C++ проекта
 */

import * as DebugFlags from './debugConfig';

// Текущая тема игры (можно менять через переменную окружения)
export const CURRENT_THEME = import.meta.env.VITE_CURRENT_THEME || 'Game_01';

// ✅ PROD FIT: Ассеты теперь лежат в dist/assets, учитываем base path для GitHub Pages
// Vite автоматически подставляет BASE_URL: '/' для dev, '/ArcadeQuiz/' для prod
export const ASSETS_BASE_PATH = `${import.meta.env.BASE_URL}assets/${CURRENT_THEME}`;

// A/B тестирование для фидбэков в мини-вопросах
export const AB_TESTING = {
  // Включить показ feedbacks (правильные ответы)
  ENABLE_FEEDBACKS: import.meta.env.VITE_ENABLE_FEEDBACKS !== 'false',

  // Включить показ wrongFeedbacks (неправильные ответы)
  ENABLE_WRONG_FEEDBACKS: import.meta.env.VITE_ENABLE_WRONG_FEEDBACKS !== 'false',

  // Включить модальное окно подтверждения входа в портал
  ENABLE_PORTAL_CONFIRMATION: import.meta.env.VITE_ENABLE_PORTAL_CONFIRMATION !== 'false',

  // Включить новый 9-slice фон для модальных окон
  USE_NINE_SLICE_MODAL: import.meta.env.VITE_USE_NINE_SLICE_MODAL !== 'false',

  // Включить новый 9-slice фон для кнопок модальных окон
  USE_NINE_SLICE_BUTTON: import.meta.env.VITE_USE_NINE_SLICE_BUTTON !== 'false',

  // Включить визуальные индикаторы собранных монет на Оракуле
  ENABLE_ORACLE_COIN_INDICATORS: import.meta.env.VITE_ENABLE_ORACLE_COIN_INDICATORS !== 'false',

    // 🆕 Отладка логов кнопок (шаг 6 плана)
    DEBUG_BUTTON_EVENTS: import.meta.env.VITE_DEBUG_BUTTON_EVENTS !== 'false'
};

// A/B тестирование для глобальных вопросов
export const USE_QUESTION_BUBBLE = import.meta.env.VITE_USE_QUESTION_BUBBLE !== 'false';

// 🔊 Настройки звука
// Отключение звука для тестирования (можно включить через .env)
export const SOUND_ENABLED = import.meta.env.VITE_SOUND_ENABLED !== 'false';

// Громкость звука (0.0 - 1.0)
export const SOUND_VOLUME = Number(import.meta.env.VITE_SOUND_VOLUME) || 0.5;

// ✅ Настройки отладки перенесены в конфиги уровней
// Используйте showDetectionRadius в enemyBehavior и showCollisionDebug в collisionObjects

// Настройки отладочного UI
export const DEBUG_UI_ENABLED = import.meta.env.VITE_DEBUG_UI_ENABLED === 'true';

// ============================================
// RE-EXPORT DEBUG FLAGS для удобства импорта
// ============================================
export const {
  DEBUG_ENABLED,
  DEBUG_SCENES,
  DEBUG_UI,
  DEBUG_ENTITIES,
  DEBUG_SYSTEMS,
  DEBUG_COLLISION,
  DEBUG_ANIMATION,
  DEBUG_SPAWN_VERBOSE,
  DEBUG_QUIZ,
  DEBUG_GAMEFLOW,
  DEBUG_PERF,
  DEBUG_BOOTSTRAP,
  DEBUG_ASSETS,
  DEBUG_SCENE_INIT,
  DEBUG_OVERLAY_ENABLED,
  DEBUG_VISUAL_GRID_ENABLED,
  DEBUG_SPAWN_GRID_ENABLED,
  logScene,
  logUI,
  logEntity,
  logSystem,
  logCollision,
  logAnimation,
  logQuiz,
  logGameflow,
  logPerf,
  logBootstrap,
  logAsset,
  logSceneInit
} = DebugFlags;

/**
 * PWA и Service Worker конфигурация
 * Версию нужно менять при каждом обновлении игры!
 */
export const PWA_CONFIG = {
  // Версия приложения (менять при релизе: major.minor.patch)
  VERSION: '1.0.0',

  // Название кэша (генерируется автоматически из версии)
  get CACHE_NAME() {
    return `portals-v${this.VERSION}`;
  },

  // Автоматически проверять обновления
  AUTO_UPDATE: true,

  // Показывать уведомление об обновлении
  UPDATE_NOTIFICATION: true,

  // Принудительно обновлять при обнаружении новой версии
  FORCE_UPDATE_ON_NEW_VERSION: true
};


