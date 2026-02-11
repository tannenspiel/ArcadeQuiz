/**
 * Unit тесты для констант масштабирования
 */

import {
  BASE_GAME_HEIGHT,
  BASE_SCALE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_CENTER_X,
  MAP_CENTER_Y,
  ACTOR_SIZES
} from '../../../constants/gameConstants';

describe('Scaling Constants', () => {
  describe('Виртуальное разрешение', () => {
    it('BASE_GAME_HEIGHT должен быть 1280', () => {
      expect(BASE_GAME_HEIGHT).toBe(1280);
    });

    it('BASE_GAME_HEIGHT должен быть положительным числом', () => {
      expect(BASE_GAME_HEIGHT).toBeGreaterThan(0);
      expect(typeof BASE_GAME_HEIGHT).toBe('number');
    });
  });

  describe('Базовый масштаб', () => {
    it('BASE_SCALE должен быть 4.0', () => {
      expect(BASE_SCALE).toBe(4.0);
    });
  });

  describe('Размеры карты', () => {
    it('MAP_WIDTH должен быть 512', () => {
      expect(MAP_WIDTH).toBe(512);
    });

    it('MAP_HEIGHT должен быть 512', () => {
      expect(MAP_HEIGHT).toBe(512);
    });

    it('MAP_CENTER_X должен быть вычислен корректно', () => {
      const expectedCenterX = (MAP_WIDTH * BASE_SCALE) / 2;
      expect(MAP_CENTER_X).toBe(expectedCenterX);
      expect(MAP_CENTER_X).toBe(1024);
    });

    it('MAP_CENTER_Y должен быть вычислен корректно', () => {
      const expectedCenterY = (MAP_HEIGHT * BASE_SCALE) / 2;
      expect(MAP_CENTER_Y).toBe(expectedCenterY);
      expect(MAP_CENTER_Y).toBe(1024);
    });

    it('Виртуальный размер карты должен быть 2048×2048', () => {
      const virtualMapWidth = MAP_WIDTH * BASE_SCALE;
      const virtualMapHeight = MAP_HEIGHT * BASE_SCALE;
      expect(virtualMapWidth).toBe(2048);
      expect(virtualMapHeight).toBe(2048);
    });
  });

  describe('ACTOR_SIZES', () => {
    it('должен содержать все необходимые типы акторов', () => {
      expect(ACTOR_SIZES).toHaveProperty('PLAYER');
      expect(ACTOR_SIZES).toHaveProperty('ENEMY');
      expect(ACTOR_SIZES).toHaveProperty('HEART');
      expect(ACTOR_SIZES).toHaveProperty('KEY');
      expect(ACTOR_SIZES).toHaveProperty('PORTAL');
      expect(ACTOR_SIZES).toHaveProperty('ORACLE');
    });

    it('PLAYER должен иметь множитель 1.0', () => {
      expect(ACTOR_SIZES.PLAYER).toBe(1.0);
    });

    it('KEY должен иметь множитель 1.0', () => {
      expect(ACTOR_SIZES.KEY).toBe(1.0);
    });

    it('Финальный масштаб PLAYER должен быть BASE_SCALE × 1.0', () => {
      const finalScale = BASE_SCALE * ACTOR_SIZES.PLAYER;
      expect(finalScale).toBe(4.0);
    });

    it('Финальный масштаб KEY должен быть BASE_SCALE × 1.0', () => {
      const finalScale = BASE_SCALE * ACTOR_SIZES.KEY;
      expect(finalScale).toBe(4.0);
    });

    it('Все множители должны быть положительными числами', () => {
      Object.values(ACTOR_SIZES).forEach(size => {
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
      });
    });
  });

  // LETTERBOXING_CONFIG больше не используется - удален из констант

  describe('Математические проверки', () => {
    it('Центр карты должен быть в середине виртуального размера', () => {
      const virtualMapWidth = MAP_WIDTH * BASE_SCALE;
      const virtualMapHeight = MAP_HEIGHT * BASE_SCALE;
      
      expect(MAP_CENTER_X).toBe(virtualMapWidth / 2);
      expect(MAP_CENTER_Y).toBe(virtualMapHeight / 2);
    });

    it('Виртуальный размер карты должен быть больше базовой высоты экрана', () => {
      const virtualMapWidth = MAP_WIDTH * BASE_SCALE;
      const virtualMapHeight = MAP_HEIGHT * BASE_SCALE;
      
      expect(virtualMapWidth).toBeGreaterThan(BASE_GAME_HEIGHT);
      expect(virtualMapHeight).toBeGreaterThan(BASE_GAME_HEIGHT);
    });
  });
});

