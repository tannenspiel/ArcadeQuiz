/**
 * Настройка тестового окружения
 */
import '@testing-library/jest-dom';

// ✅ Mock import.meta.env for tests (before any imports that use it)
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
        VITE_CURRENT_THEME: 'Game_01',
        VITE_ENABLE_FEEDBACKS: 'true',
        VITE_ENABLE_WRONG_FEEDBACKS: 'true',
        VITE_ENABLE_PORTAL_CONFIRMATION: 'true',
        VITE_USE_NINE_SLICE_MODAL: 'true',
        VITE_USE_NINE_SLICE_BUTTON: 'true',
        VITE_ENABLE_ORACLE_COIN_INDICATORS: 'true',
        VITE_USE_QUESTION_BUBBLE: 'true',
        VITE_SOUND_ENABLED: 'true',
        VITE_SOUND_VOLUME: '0.5',
        VITE_DEBUG_UI_ENABLED: 'false'
      }
    }
  },
  writable: true,
  configurable: true
});
