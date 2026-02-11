/**
 * Тесты для config модулей
 * Тестируем через моки, так как оригинальные модули используют import.meta.env
 */

// Мокаем debugConfig.ts
jest.mock('../../../config/debugConfig', () => ({
  DEBUG_ALL: false,
  DEBUG_ENABLED: false,
  DEBUG_SCENES: false,
  DEBUG_UI: false,
  DEBUG_ENTITIES: false,
  DEBUG_SYSTEMS: false,
  DEBUG_COLLISION: false,
  DEBUG_ANIMATION: false,
  DEBUG_QUIZ: false,
  DEBUG_GAMEFLOW: false,
  DEBUG_PERF: false,
  DEBUG_BOOTSTRAP: false,
  DEBUG_ASSETS: false,
  DEBUG_SCENE_INIT: false,
  DEBUG_OVERLAY_ENABLED: false,
  DEBUG_VISUAL_GRID_ENABLED: false,
  DEBUG_SPAWN_GRID_ENABLED: false,
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
}));

// Мокаем gameConfig.ts
jest.mock('../../../config/gameConfig', () => ({
  CURRENT_THEME: 'Game_01',
  ASSETS_BASE_PATH: '/assets/Game_01',
  AB_TESTING: {
    ENABLE_FEEDBACKS: true,
    ENABLE_WRONG_FEEDBACKS: true,
    ENABLE_PORTAL_CONFIRMATION: true,
    USE_NINE_SLICE_MODAL: true,
    USE_NINE_SLICE_BUTTON: true,
    ENABLE_ORACLE_COIN_INDICATORS: true,
  },
  USE_QUESTION_BUBBLE: true,
  SOUND_ENABLED: true,
  SOUND_VOLUME: 0.5,
  DEBUG_UI_ENABLED: false,
  PWA_CONFIG: {
    VERSION: '1.0.0',
    AUTO_UPDATE: true,
    UPDATE_NOTIFICATION: true,
    FORCE_UPDATE_ON_NEW_VERSION: true,
    get CACHE_NAME() { return `portals-v${this.VERSION}`; },
  },
  // Реэкспорты из debugConfig
  DEBUG_ENABLED: false,
  DEBUG_SCENES: false,
  DEBUG_UI: false,
  DEBUG_ENTITIES: false,
  DEBUG_SYSTEMS: false,
  logScene: jest.fn(),
  logUI: jest.fn(),
  logEntity: jest.fn(),
  logSystem: jest.fn(),
}));

describe('config modules (через моки)', () => {
  describe('debugConfig.ts', () => {
    it('должен экспортировать все DEBUG флаги', async () => {
      const debugConfig = await import('../../../config/debugConfig');

      expect(debugConfig.DEBUG_ALL).toBe(false);
      expect(debugConfig.DEBUG_ENABLED).toBe(false);
      expect(debugConfig.DEBUG_SCENES).toBe(false);
      expect(debugConfig.DEBUG_UI).toBe(false);
      expect(debugConfig.DEBUG_ENTITIES).toBe(false);
      expect(debugConfig.DEBUG_SYSTEMS).toBe(false);
      expect(debugConfig.DEBUG_COLLISION).toBe(false);
    });

    it('должен экспортировать все log функции', async () => {
      const debugConfig = await import('../../../config/debugConfig');

      expect(typeof debugConfig.logScene).toBe('function');
      expect(typeof debugConfig.logUI).toBe('function');
      expect(typeof debugConfig.logEntity).toBe('function');
      expect(typeof debugConfig.logSystem).toBe('function');
      expect(typeof debugConfig.logCollision).toBe('function');
      expect(typeof debugConfig.logAnimation).toBe('function');
      expect(typeof debugConfig.logQuiz).toBe('function');
    });

    it('log функции можно вызывать без ошибок', async () => {
      const { logScene, logUI, logEntity } = await import('../../../config/debugConfig');

      expect(() => logScene('test')).not.toThrow();
      expect(() => logUI('test')).not.toThrow();
      expect(() => logEntity('test')).not.toThrow();
    });
  });

  describe('gameConfig.ts', () => {
    it('должен экспортировать CURRENT_THEME', async () => {
      const { CURRENT_THEME } = await import('../../../config/gameConfig');
      expect(CURRENT_THEME).toBe('Game_01');
    });

    it('должен экспортировать AB_TESTING', async () => {
      const { AB_TESTING } = await import('../../../config/gameConfig');
      expect(AB_TESTING.ENABLE_FEEDBACKS).toBe(true);
      expect(AB_TESTING.ENABLE_WRONG_FEEDBACKS).toBe(true);
      expect(AB_TESTING.ENABLE_PORTAL_CONFIRMATION).toBe(true);
    });

    it('должен экспортировать PWA_CONFIG', async () => {
      const { PWA_CONFIG } = await import('../../../config/gameConfig');
      expect(PWA_CONFIG.VERSION).toBe('1.0.0');
      expect(PWA_CONFIG.AUTO_UPDATE).toBe(true);
    });

    it('PWA_CONFIG.CACHE_NAME должен включать VERSION', async () => {
      const { PWA_CONFIG } = await import('../../../config/gameConfig');
      expect(PWA_CONFIG.CACHE_NAME).toContain('v1.0.0');
    });
  });
});
