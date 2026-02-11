/**
 * Unit тесты для scoreConstants.ts
 */

import {
  REWARD,
  PENALTY,
  calculateEnemyDamagePenalty,
  applyPenalty,
  type RewardKey,
  type PenaltyKey
} from '../../../constants/scoreConstants';

describe('REWARD константы', () => {
  it('должен экспортировать REWARD объект', () => {
    expect(REWARD).toBeDefined();
  });

  it('должен иметь правильные значения для монеток', () => {
    expect(REWARD.COIN_UNIQUE).toBe(3);
    expect(REWARD.COIN_REPEAT).toBe(2);
  });

  it('должен иметь правильные значения для ключей', () => {
    expect(REWARD.KEY_UNIQUE).toBe(5);
    expect(REWARD.KEY_REPEAT).toBe(3);
  });

  it('должен иметь правильное значение для портала', () => {
    expect(REWARD.PORTAL_CORRECT).toBe(10);
  });

  it('уникальная награда больше повторной', () => {
    expect(REWARD.COIN_UNIQUE).toBeGreaterThan(REWARD.COIN_REPEAT);
    expect(REWARD.KEY_UNIQUE).toBeGreaterThan(REWARD.KEY_REPEAT);
  });
});

describe('PENALTY константы', () => {
  it('должен экспортировать PENALTY объект', () => {
    expect(PENALTY).toBeDefined();
  });

  it('должен иметь правильное значение для базового урона', () => {
    expect(PENALTY.ENEMY_DAMAGE_BASE).toBe(-2);
  });

  it('должен иметь правильные значения для потери предметов', () => {
    expect(PENALTY.COIN_LOST).toBe(-3);
    expect(PENALTY.KEY_LOST).toBe(-5);
  });

  it('должен иметь правильные значения для ошибок в квизах', () => {
    expect(PENALTY.QUIZ_COIN_WRONG).toBe(-3);
    expect(PENALTY.QUIZ_KEY_WRONG).toBe(-5);
    expect(PENALTY.QUIZ_PORTAL_WRONG).toBe(-10);
  });

  it('должен иметь MIN_SCORE = 0', () => {
    expect(PENALTY.MIN_SCORE).toBe(0);
  });

  it('все штрафы отрицательные (кроме MIN_SCORE)', () => {
    expect(PENALTY.ENEMY_DAMAGE_BASE).toBeLessThan(0);
    expect(PENALTY.COIN_LOST).toBeLessThan(0);
    expect(PENALTY.KEY_LOST).toBeLessThan(0);
    expect(PENALTY.QUIZ_COIN_WRONG).toBeLessThan(0);
    expect(PENALTY.QUIZ_KEY_WRONG).toBeLessThan(0);
    expect(PENALTY.QUIZ_PORTAL_WRONG).toBeLessThan(0);
  });
});

describe('calculateEnemyDamagePenalty', () => {
  it('должен возвращать базовый урон без предметов', () => {
    const result = calculateEnemyDamagePenalty(false, false);
    expect(result).toBe(PENALTY.ENEMY_DAMAGE_BASE); // -2
  });

  it('должен добавлять штраф за потерянную монетку', () => {
    const result = calculateEnemyDamagePenalty(true, false);
    expect(result).toBe(PENALTY.ENEMY_DAMAGE_BASE + PENALTY.COIN_LOST); // -2 + -3 = -5
  });

  it('должен добавлять штраф за потерянный ключ', () => {
    const result = calculateEnemyDamagePenalty(false, true);
    expect(result).toBe(PENALTY.ENEMY_DAMAGE_BASE + PENALTY.KEY_LOST); // -2 + -5 = -7
  });

  it('не должен добавлять оба штрафа одновременно (только один предмет)', () => {
    // Согласно логике функции: else if - только один предмет
    const result = calculateEnemyDamagePenalty(true, true);
    // Если есть монетка, добавляется штраф за монетку, ключ игнорируется
    expect(result).toBe(PENALTY.ENEMY_DAMAGE_BASE + PENALTY.COIN_LOST); // -5
  });

  it('штраф за ключ больше чем за монетку', () => {
    const coinPenalty = calculateEnemyDamagePenalty(true, false);
    const keyPenalty = calculateEnemyDamagePenalty(false, true);
    expect(keyPenalty).toBeLessThan(coinPenalty); // -7 < -5
  });
});

describe('applyPenalty', () => {
  it('должен вычитать штраф из очков', () => {
    const result = applyPenalty(100, -10);
    expect(result).toBe(90);
  });

  it('должен защищать от отрицательных значений', () => {
    const result = applyPenalty(5, -10);
    expect(result).toBe(PENALTY.MIN_SCORE); // 0
  });

  it('должен возвращать 0 при 0 очках и штрафе', () => {
    const result = applyPenalty(0, -5);
    expect(result).toBe(0);
  });

  it('должен возвращать текущие очки при нулевом штрафе', () => {
    const result = applyPenalty(50, 0);
    expect(result).toBe(50);
  });

  it('должен возвращать MIN_SCORE при большом штрафе', () => {
    const result = applyPenalty(1000, -2000);
    expect(result).toBe(0);
  });

  it('должен работать с положительными изменениями (награда)', () => {
    const result = applyPenalty(50, 10);
    expect(result).toBe(60);
  });

  it('должен возвращать точное значение при граничном условии', () => {
    const result = applyPenalty(5, -5);
    expect(result).toBe(0);
  });
});

describe('Типы', () => {
  it('RewardKey должен быть keyof typeof REWARD', () => {
    const key: RewardKey = 'COIN_UNIQUE';
    expect(key).toBeDefined();
  });

  it('PenaltyKey должен быть keyof typeof PENALTY', () => {
    const key: PenaltyKey = 'ENEMY_DAMAGE_BASE';
    expect(key).toBeDefined();
  });

  it('можно использовать RewardKey для доступа к REWARD', () => {
    const keys: RewardKey[] = ['COIN_UNIQUE', 'COIN_REPEAT', 'KEY_UNIQUE', 'KEY_REPEAT', 'PORTAL_CORRECT'];
    keys.forEach(key => {
      expect(REWARD[key]).toBeDefined();
      expect(typeof REWARD[key]).toBe('number');
    });
  });

  it('можно использовать PenaltyKey для доступа к PENALTY', () => {
    const keys: PenaltyKey[] = [
      'ENEMY_DAMAGE_BASE',
      'COIN_LOST',
      'KEY_LOST',
      'QUIZ_COIN_WRONG',
      'QUIZ_KEY_WRONG',
      'QUIZ_PORTAL_WRONG',
      'MIN_SCORE'
    ];
    keys.forEach(key => {
      expect(PENALTY[key]).toBeDefined();
      expect(typeof PENALTY[key]).toBe('number');
    });
  });
});

describe('Интеграционные тесты', () => {
  it('полный цикл: награда и штраф', () => {
    let score = 0;

    // Игрок получил монетку
    score += REWARD.COIN_UNIQUE; // +3
    expect(score).toBe(3);

    // Игрок получил урон
    score = applyPenalty(score, calculateEnemyDamagePenalty(true, false)); // -5
    expect(score).toBe(0); // Минимум 0
  });

  it('игрок с ключом теряет больше очков при уроне', () => {
    const coinDamage = calculateEnemyDamagePenalty(true, false);
    const keyDamage = calculateEnemyDamagePenalty(false, true);

    expect(keyDamage).toBeLessThan(coinDamage);
  });

  it('награда за портал максимальная', () => {
    expect(REWARD.PORTAL_CORRECT).toBeGreaterThan(REWARD.KEY_UNIQUE);
    expect(REWARD.PORTAL_CORRECT).toBeGreaterThan(REWARD.COIN_UNIQUE);
  });

  it('штраф за портал максимальный', () => {
    expect(PENALTY.QUIZ_PORTAL_WRONG).toBeLessThan(PENALTY.QUIZ_KEY_WRONG);
    expect(PENALTY.QUIZ_PORTAL_WRONG).toBeLessThan(PENALTY.QUIZ_COIN_WRONG);
  });
});
