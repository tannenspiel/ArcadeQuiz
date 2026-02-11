/**
 * Настройка тестового окружения
 */

import '@testing-library/jest-dom';

jest.mock('phaser', () => {
    const PhaserMock = require('./mocks/phaser-mock').default;
    return {
        default: PhaserMock,
        ...PhaserMock,
    };
});

// Моки для import.meta.env (Vite) - через замену модуля
jest.mock('../config/gameConfig', () => ({
  CURRENT_THEME: 'Game_01',
  ASSETS_BASE_PATH: '/src/assets/Game_01',
  AB_TESTING: {
    ENABLE_FEEDBACKS: true,
    ENABLE_WRONG_FEEDBACKS: true
  }
}));

// Mock для debugConfig - предотвращаем загрузку оригинала с import.meta.env
jest.mock('../config/debugConfig', () => ({
  // Все debug флаги выключены в тестах (для чистого вывода)
  DEBUG_ALL: false,
  DEBUG_ENABLED: false,
  DEBUG_SCENES: false,
  DEBUG_UI: false,
  DEBUG_ENTITIES: false,
  DEBUG_SYSTEMS: false,
  DEBUG_COLLISION: false,
  DEBUG_ANIMATION: false,
  DEBUG_SPAWN_VERBOSE: false,
  DEBUG_QUIZ: false,
  DEBUG_QUIZ_PORTAL: false,
  DEBUG_FORCE_PORTAL_IMAGE_QUESTION: false,
  DEBUG_GAMEFLOW: false,
  DEBUG_PERF: false,
  DEBUG_BOOTSTRAP: false,
  DEBUG_ASSETS: false,
  DEBUG_SCENE_INIT: false,
  DEBUG_OVERLAY_ENABLED: false,
  DEBUG_VISUAL_GRID_ENABLED: false,
  DEBUG_SPAWN_GRID_ENABLED: false,
  // Вспомогательные функции (пустые для тестов)
  logScene: jest.fn(),
  logUI: jest.fn(),
  logEntity: jest.fn(),
  logSystem: jest.fn(),
  logCollision: jest.fn(),
  logAnimation: jest.fn(),
  logQuiz: jest.fn(),
  logGameflow: jest.fn(),
  logPerf: jest.fn(),
  logBootstrap: jest.fn(),
  logAsset: jest.fn(),
  logSceneInit: jest.fn(),
}), { virtual: true });

// Mock для Logger - добавляем warn, log, error методы
jest.mock('../utils/Logger', () => {
  return {
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      clear: jest.fn(),
      getLogs: jest.fn(() => []),
    },
    __esModule: true,
    default: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      clear: jest.fn(),
      getLogs: jest.fn(() => []),
    },
  };
});

// Моки для window и DOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Моки для ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
} as any;

// Подавление console.warn в тестах (опционально)
// global.console = {
//   ...console,
//   warn: jest.fn(),
//   error: jest.fn(),
// };


