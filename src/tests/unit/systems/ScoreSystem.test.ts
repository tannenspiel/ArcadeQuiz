/**
 * Unit тесты для ScoreSystem
 *
 * Тесты привязаны к документации (GameDescription.md, scoreConstants.ts)
 */

import { ScoreSystem } from '../../../game/systems/ScoreSystem';
import { REWARD, PENALTY } from '../../../constants/scoreConstants';

// Мокируем Logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    scoreSystem = new ScoreSystem();
  });

  describe('Инициализация', () => {
    it('должен создавать систему с нулевыми очками', () => {
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('должен инициализироваться с константами из scoreConstants.ts', () => {
      const config = scoreSystem.getConfig();
      expect(config.uniqueKeyPoints).toBe(REWARD.KEY_UNIQUE); // 5
      expect(config.repeatKeyPoints).toBe(REWARD.KEY_REPEAT); // 3
      expect(config.uniqueCoinPoints).toBe(REWARD.COIN_UNIQUE); // 3
      expect(config.repeatCoinPoints).toBe(REWARD.COIN_REPEAT); // 2
      expect(config.portalPoints).toBe(REWARD.PORTAL_CORRECT); // 10
    });
  });

  describe('Очки за ключи (согласно GameDescription.md)', () => {
    it('должен добавлять +5 очков за уникальный ключ (REWARD.KEY_UNIQUE)', () => {
      scoreSystem.addKeyScore(true); // isUnique = true
      expect(scoreSystem.getScore()).toBe(REWARD.KEY_UNIQUE); // 5
    });

    it('должен добавлять +3 очка за повторный ключ (REWARD.KEY_REPEAT)', () => {
      scoreSystem.addKeyScore(false); // isUnique = false
      expect(scoreSystem.getScore()).toBe(REWARD.KEY_REPEAT); // 3
    });

    it('должен считать количество собранных ключей', () => {
      scoreSystem.addKeyScore(true);
      scoreSystem.addKeyScore(false);
      scoreSystem.addKeyScore(true);

      const scoreData = scoreSystem.getScoreData();
      expect(scoreData.keys).toBe(3);
    });

    it('должен вычислять общий счёт корректно для микса уникальных и повторных ключей', () => {
      scoreSystem.addKeyScore(true);  // +5
      scoreSystem.addKeyScore(false); // +3
      scoreSystem.addKeyScore(true);  // +5
      // Итого: 5 + 3 + 5 = 13

      expect(scoreSystem.getScore()).toBe(13);
    });
  });

  describe('Очки за монетки (v4 feature)', () => {
    it('должен добавлять +3 очка за уникальную монетку (REWARD.COIN_UNIQUE)', () => {
      scoreSystem.addCoinScore(true); // isUnique = true
      expect(scoreSystem.getScore()).toBe(REWARD.COIN_UNIQUE); // 3
    });

    it('должен добавлять +2 очка за повторную монетку (REWARD.COIN_REPEAT)', () => {
      scoreSystem.addCoinScore(false); // isUnique = false
      expect(scoreSystem.getScore()).toBe(REWARD.COIN_REPEAT); // 2
    });

    it('должен считать количество собранных монеток', () => {
      scoreSystem.addCoinScore(true);
      scoreSystem.addCoinScore(true);
      scoreSystem.addCoinScore(true);

      const scoreData = scoreSystem.getScoreData();
      expect(scoreData.coins).toBe(3);
    });
  });

  describe('Очки за портал (согласно GameDescription.md)', () => {
    it('должен добавлять +10 очков за правильный портал (REWARD.PORTAL_CORRECT)', () => {
      scoreSystem.addPortalScore();
      expect(scoreSystem.getScore()).toBe(REWARD.PORTAL_CORRECT); // 10
    });

    it('должен считать количество завершённых порталов', () => {
      scoreSystem.addPortalScore();
      scoreSystem.addPortalScore();

      const scoreData = scoreSystem.getScoreData();
      expect(scoreData.portals).toBe(2);
    });
  });

  describe('Штрафы (removeScore)', () => {
    it('должен снимать очки при штрафе', () => {
      scoreSystem.setScore(10);
      scoreSystem.removeScore(3);
      expect(scoreSystem.getScore()).toBe(7);
    });

    it('должен защищать от отрицательных очков (минимум = 0 согласно PENALTY.MIN_SCORE)', () => {
      scoreSystem.setScore(2);
      scoreSystem.removeScore(5); // Штраф больше текущих очков
      expect(scoreSystem.getScore()).toBe(PENALTY.MIN_SCORE); // 0
    });

    it('должен корректно обрабатывать штраф с нулевыми очками', () => {
      scoreSystem.setScore(0);
      scoreSystem.removeScore(10);
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('должен логировать штраф (согласно документации)', () => {
      const { logger } = require('../../../utils/Logger');
      scoreSystem.setScore(10);
      scoreSystem.removeScore(3);

      expect(logger.log).toHaveBeenCalledWith('SCORE', expect.stringContaining('-3'));
    });

    it('должен применять базовый штраф -2 за урон врага (PENALTY.ENEMY_DAMAGE_BASE)', () => {
      scoreSystem.setScore(10);
      scoreSystem.removeScore(Math.abs(PENALTY.ENEMY_DAMAGE_BASE)); // -2
      expect(scoreSystem.getScore()).toBe(8);
    });

    it('должен применять штраф -3 за ошибку в квизе монетки (PENALTY.QUIZ_COIN_WRONG)', () => {
      scoreSystem.setScore(10);
      scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_COIN_WRONG)); // -3
      expect(scoreSystem.getScore()).toBe(7);
    });

    it('должен применять штраф -5 за ошибку в квизе ключа (PENALTY.QUIZ_KEY_WRONG)', () => {
      scoreSystem.setScore(10);
      scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_KEY_WRONG)); // -5
      expect(scoreSystem.getScore()).toBe(5);
    });

    it('должен применять штраф -10 за ошибку в портале (PENALTY.QUIZ_PORTAL_WRONG)', () => {
      scoreSystem.setScore(15);
      scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_PORTAL_WRONG)); // -10
      expect(scoreSystem.getScore()).toBe(5);
    });
  });

  describe('setScore с защитой от отрицательных значений', () => {
    it('должен устанавливать положительные очки', () => {
      scoreSystem.setScore(100);
      expect(scoreSystem.getScore()).toBe(100);
    });

    it('должен clamp к 0 при установке отрицательного значения', () => {
      scoreSystem.setScore(-10);
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('должен устанавливать нулевые очки', () => {
      scoreSystem.setScore(0);
      expect(scoreSystem.getScore()).toBe(0);
    });
  });

  describe('getScoreData (v4 feature)', () => {
    it('должен возвращать полную структуру данных очков', () => {
      scoreSystem.addKeyScore(true);
      scoreSystem.addCoinScore(true);
      scoreSystem.addPortalScore();

      const scoreData = scoreSystem.getScoreData();

      expect(scoreData).toEqual({
        total: 18, // 5 + 3 + 10
        keys: 1,
        coins: 1,
        portals: 1
      });
    });

    it('должен возвращать нулевые значения для новой системы', () => {
      const scoreData = scoreSystem.getScoreData();

      expect(scoreData).toEqual({
        total: 0,
        keys: 0,
        coins: 0,
        portals: 0
      });
    });
  });

  describe('Максимальный балл уровня', () => {
    it('должен устанавливать максимальный балл для уровня', () => {
      scoreSystem.setMaxPossibleScore(25);
      expect(scoreSystem.getMaxPossibleScore()).toBe(25);
    });

    it('должен возвращать 0 если максимальный балл не установлен', () => {
      expect(scoreSystem.getMaxPossibleScore()).toBe(0);
    });
  });

  describe('Максимальный балл всей игры', () => {
    it('должен устанавливать максимальный балл для всей игры', () => {
      scoreSystem.setTotalMaxPossibleScore(100);
      expect(scoreSystem.getTotalMaxPossibleScore()).toBe(100);
    });

    it('должен возвращать 0 если максимальный балл не установлен', () => {
      expect(scoreSystem.getTotalMaxPossibleScore()).toBe(0);
    });
  });

  describe('Произвольное добавление очков', () => {
    it('должен добавлять произвольное количество очков', () => {
      scoreSystem.addScore(42);
      expect(scoreSystem.getScore()).toBe(42);
    });

    it('должен добавлять отрицательные очки', () => {
      scoreSystem.setScore(10);
      scoreSystem.addScore(-5);
      expect(scoreSystem.getScore()).toBe(5);
    });
  });

  describe('Сброс очков', () => {
    it('должен сбрасывать очки в ноль', () => {
      scoreSystem.setScore(100);
      scoreSystem.reset();
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('должен сбрасывать счётчики ключей, монеток и порталов', () => {
      scoreSystem.addKeyScore(true);
      scoreSystem.addCoinScore(true);
      scoreSystem.addPortalScore();

      scoreSystem.reset();

      const scoreData = scoreSystem.getScoreData();
      expect(scoreData.keys).toBe(0);
      expect(scoreData.coins).toBe(0);
      expect(scoreData.portals).toBe(0);
    });

    it('должен сбрасывать максимальный балл уровня', () => {
      scoreSystem.setMaxPossibleScore(25);
      scoreSystem.reset();
      expect(scoreSystem.getMaxPossibleScore()).toBe(0);
    });

    it('НЕ должен сбрасывать максимальный балл всей игры при обычном reset', () => {
      scoreSystem.setTotalMaxPossibleScore(100);
      scoreSystem.reset();
      expect(scoreSystem.getTotalMaxPossibleScore()).toBe(100);
    });
  });

  describe('Полный сброс (fullReset)', () => {
    it('должен сбрасывать всё включая максимальный балл всей игры', () => {
      scoreSystem.setScore(50);
      scoreSystem.addKeyScore(true);
      scoreSystem.setMaxPossibleScore(25);
      scoreSystem.setTotalMaxPossibleScore(100);

      scoreSystem.fullReset();

      expect(scoreSystem.getScore()).toBe(0);
      expect(scoreSystem.getMaxPossibleScore()).toBe(0);
      expect(scoreSystem.getTotalMaxPossibleScore()).toBe(0);

      const scoreData = scoreSystem.getScoreData();
      expect(scoreData.keys).toBe(0);
      expect(scoreData.coins).toBe(0);
      expect(scoreData.portals).toBe(0);
    });
  });

  describe('Конфигурация', () => {
    it('должен возвращать копию конфигурации', () => {
      const config = scoreSystem.getConfig();
      expect(config).toEqual({
        uniqueKeyPoints: REWARD.KEY_UNIQUE,
        repeatKeyPoints: REWARD.KEY_REPEAT,
        uniqueCoinPoints: REWARD.COIN_UNIQUE,
        repeatCoinPoints: REWARD.COIN_REPEAT,
        portalPoints: REWARD.PORTAL_CORRECT
      });
    });

    it('должен позволять изменять конфигурацию частично', () => {
      scoreSystem.setConfig({ uniqueKeyPoints: 100 });

      const config = scoreSystem.getConfig();
      expect(config.uniqueKeyPoints).toBe(100);
      expect(config.repeatKeyPoints).toBe(REWARD.KEY_REPEAT); // Не изменился
    });

    it('должен использовать новую конфигурацию для подсчёта очков', () => {
      scoreSystem.setConfig({ uniqueKeyPoints: 100 });
      scoreSystem.addKeyScore(true);
      expect(scoreSystem.getScore()).toBe(100);
    });
  });

  describe('Форматирование очков', () => {
    it('должен форматировать очки для отображения (ru-RU локаль)', () => {
      scoreSystem.setScore(1234);
      const formatted = scoreSystem.getFormattedScore();

      // В русской локали формат: "1 234"
      expect(formatted).toMatch(/1[\s\u00A0]234/);
    });

    it('должен форматировать большие числа с разделителями', () => {
      scoreSystem.setScore(1234567);
      const formatted = scoreSystem.getFormattedScore();

      // В русской локали формат: "1 234 567"
      expect(formatted).toMatch(/1[\s\u00A0]234[\s\u00A0]567/);
    });

    it('должен форматировать нулевые очки', () => {
      scoreSystem.setScore(0);
      const formatted = scoreSystem.getFormattedScore();

      expect(formatted).toBe('0');
    });
  });

  describe('Интеграционные сценарии (согласно GameDescription.md)', () => {
    it('должен вычислять идеальный проход уровня: 3 ключа × 5 + портал × 10 = 25', () => {
      // 3 уникальных ключа
      scoreSystem.addKeyScore(true);
      scoreSystem.addKeyScore(true);
      scoreSystem.addKeyScore(true);

      // Правильный портал
      scoreSystem.addPortalScore();

      expect(scoreSystem.getScore()).toBe(25);
    });

    it('должен вычислять счёт с миксом уникальных и повторных вопросов', () => {
      // 2 уникальных ключа, 1 повторный
      scoreSystem.addKeyScore(true);  // +5
      scoreSystem.addKeyScore(true);  // +5
      scoreSystem.addKeyScore(false); // +3

      // 1 уникальная монетка, 2 повторные
      scoreSystem.addCoinScore(true);  // +3
      scoreSystem.addCoinScore(false); // +2
      scoreSystem.addCoinScore(false); // +2

      // Правильный портал
      scoreSystem.addPortalScore(); // +10

      // Итого: 5 + 5 + 3 + 3 + 2 + 2 + 10 = 30
      expect(scoreSystem.getScore()).toBe(30);
    });

    it('должен вычислять штраф за урон с потерянной монеткой', () => {
      // Игрок собрал монетку (+3)
      scoreSystem.addCoinScore(true);

      // Получил урон: базовый -2 + потерянная монетка -3 = -5
      scoreSystem.removeScore(Math.abs(PENALTY.ENEMY_DAMAGE_BASE)); // -2
      scoreSystem.removeScore(Math.abs(PENALTY.COIN_LOST)); // -3

      // Итого: 3 - 2 - 3 = -2 → clamp to 0
      expect(scoreSystem.getScore()).toBe(0);
    });

    it('должен вычислять штраф за ошибку в квизе ключа', () => {
      // Игрок собрал ключ (+5)
      scoreSystem.addKeyScore(true);

      // Ошибка в квизе: -5
      scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_KEY_WRONG));

      // Итого: 5 - 5 = 0
      expect(scoreSystem.getScore()).toBe(0);
    });
  });
});
