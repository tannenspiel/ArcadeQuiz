/**
 * Система подсчета очков
 *
 * ✅ v4 - Обновленная система очков с новыми константами из scoreConstants.ts:
 *
 * **Награды (+):**
 * - Монетка уникальная: +3 очка
 * - Монетка повторная: +2 очка
 * - Ключ уникальный: +5 очков
 * - Ключ повторный: +3 очка
 * - Портал правильный: +10 очков
 *
 * **Штрафы (-):**
 * - Урон от врага (базовый): -2 очка (всегда применяется)
 * - Потерянная монетка: -3 очка (дополнительно к базовому)
 * - Потерянный ключ: -5 очков (дополнительно к базовому)
 * - Ошибка в квизе монетки: -3 очка
 * - Ошибка в квизе ключа: -5 очков (и -1 ключ)
 * - Ошибка в портале: -10 очков
 *
 * **Правило:** Минимум очков = 0 (не могут быть отрицательными)
 *
 * Идеальный проход уровня: 3 ключа × 5 + портал × 10 = 25 очков
 */

import { ScoreConfig, ScoreData } from '../../types/scoreTypes';
import { REWARD, PENALTY, applyPenalty } from '../../constants/scoreConstants';
import { logger } from '../../utils/Logger';

export class ScoreSystem {
  private score: number = 0;
  private keysCollected: number = 0;
  private coinsCollected: number = 0; // ✅ НОВОЕ: Счетчик собранных монеток
  private portalsCompleted: number = 0;
  private maxPossibleScore: number = 0; // Максимальный балл для ТЕКУЩЕГО уровня
  private totalMaxPossibleScore: number = 0; // Максимальный балл для ВСЕЙ игры
  private config: ScoreConfig;

  constructor(config?: Partial<ScoreConfig>) {
    // ✅ Используем константы из scoreConstants.ts
    this.config = {
      uniqueKeyPoints: config?.uniqueKeyPoints ?? REWARD.KEY_UNIQUE,
      repeatKeyPoints: config?.repeatKeyPoints ?? REWARD.KEY_REPEAT,
      uniqueCoinPoints: config?.uniqueCoinPoints ?? REWARD.COIN_UNIQUE,
      repeatCoinPoints: config?.repeatCoinPoints ?? REWARD.COIN_REPEAT,
      portalPoints: config?.portalPoints ?? REWARD.PORTAL_CORRECT
    };
  }

  /**
   * Добавить очки за ключ
   * @param isUnique Флаг уникальности вопроса
   */
  public addKeyScore(isUnique: boolean = true): void {
    const points = isUnique ? this.config.uniqueKeyPoints : this.config.repeatKeyPoints;
    this.score += points;
    this.keysCollected++;
  }

  /**
   * ✅ НОВОЕ: Добавить очки за монетку
   * @param isUnique Флаг уникальности утверждения
   */
  public addCoinScore(isUnique: boolean = true): void {
    const points = isUnique ? this.config.uniqueCoinPoints : this.config.repeatCoinPoints;
    this.score += points;
    this.coinsCollected++;
  }

  /**
   * Добавить очки за правильный портал
   */
  public addPortalScore(): void {
    this.score += this.config.portalPoints;
    this.portalsCompleted++;
  }

  /**
   * Получить текущие очки
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Получить отформатированные очки для отображения
   */
  public getFormattedScore(): string {
    return this.score.toLocaleString('ru-RU');
  }

  /**
   * Получить данные очков
   */
  public getScoreData(): ScoreData {
    return {
      total: this.score,
      keys: this.keysCollected,
      coins: this.coinsCollected,  // ✅ НОВОЕ
      portals: this.portalsCompleted
    };
  }

  /**
   * Установить очки
   */
  public setScore(score: number): void {
    this.score = Math.max(0, score);
  }

  /**
   * Установить максимальный балл для ТЕКУЩЕГО уровня
   */
  public setMaxPossibleScore(score: number): void {
    this.maxPossibleScore = score;
  }

  /**
   * Получить максимальный балл для ТЕКУЩЕГО уровня
   */
  public getMaxPossibleScore(): number {
    return this.maxPossibleScore;
  }

  /**
   * Установить максимальный балл для ВСЕЙ игры
   */
  public setTotalMaxPossibleScore(score: number): void {
    this.totalMaxPossibleScore = score;
  }

  /**
   * Получить максимальный балл для ВСЕЙ игры
   */
  public getTotalMaxPossibleScore(): number {
    return this.totalMaxPossibleScore;
  }

  /**
   * Добавить очки (произвольное количество)
   */
  public addScore(amount: number): void {
    this.score += amount;
  }

  /**
   * ✅ НОВОЕ: Снять очки (штраф при уроне/ошибке)
   * ✅ Защита от отрицательных значений: очки не могут быть меньше 0
   */
  public removeScore(amount: number): void {
    this.score = applyPenalty(this.score, -amount);
    logger.log('SCORE', `Score penalty: -${amount} points (new total: ${this.score})`);
  }

  /**
   * Сбросить очки
   */

  /**
   * Сбросить очки
   */
  public reset(): void {
    this.score = 0;
    this.keysCollected = 0;
    this.coinsCollected = 0;  // ✅ НОВОЕ
    this.portalsCompleted = 0;
    this.maxPossibleScore = 0;
    // totalMaxPossibleScore не сбрасываем здесь, так как он может быть нужен между уровнями
    // или сбрасываем только при полном рестарте
  }

  /**
   * Полный сброс (включая прогресс всей игры)
   */
  public fullReset(): void {
    this.reset();
    this.totalMaxPossibleScore = 0;
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): ScoreConfig {
    return { ...this.config };
  }

  /**
   * Установить конфигурацию
   */
  public setConfig(config: Partial<ScoreConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

