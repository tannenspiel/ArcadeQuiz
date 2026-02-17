/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
    // ✅ ФИКС: FontSizeCalculator как единый модуль (без суффикса _1)
    '^game/(utils|systems|ui|entities|scenes|constants)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  globals: {
    'import.meta.env': {
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
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/tests/**',
    '!src/main.tsx'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000
};
