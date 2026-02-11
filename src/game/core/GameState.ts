/**
 * Глобальное состояние игры
 */

import { GamePhase } from '../../constants/gameConstants';

export type QuizType = 'coin' | 'key' | 'portal' | null;

export interface GameStateData {
  level: number;
  health: number;
  maxHealth: number;
  keys: number;
  maxKeys: number;
  score: number;
  isOracleActivated: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  gameOverResult?: 'win' | 'lose';
  // ⚠️ НОВОЕ: Coin mechanic
  currentPhase: GamePhase;
  coins: number;
  maxCoins: number;
  isQuizActive: boolean;
  quizType: QuizType;
  // ✅ НОВОЕ: Tracking used coin statements to minimize repeats
  usedCoinTrueStatements: string[];
  usedCoinFalseStatements: string[];
}

export class GameState {
  private state: GameStateData;

  constructor() {
    this.state = {
      level: 1,
      health: 3,
      maxHealth: 3,
      keys: 0,
      maxKeys: 3,
      score: 0,
      isOracleActivated: false,
      isPaused: false,
      isGameOver: false,
      // ⚠️ НОВОЕ: Coin mechanic defaults
      currentPhase: GamePhase.COIN,
      coins: 0,
      maxCoins: 3, // ✅ НОВОЕ: Max coins limit
      isQuizActive: false,
      quizType: null,
      // ✅ НОВОЕ: Tracking used coin statements
      usedCoinTrueStatements: [],
      usedCoinFalseStatements: []
    };
  }

  /**
   * Получить текущее состояние
   */
  public getState(): GameStateData {
    return { ...this.state };
  }

  /**
   * Установить состояние
   */
  public setState(newState: Partial<GameStateData>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Установить уровень
   */
  public setLevel(level: number): void {
    this.state.level = level;
  }

  /**
   * Получить уровень
   */
  public getLevel(): number {
    return this.state.level;
  }

  /**
   * Установить здоровье
   */
  public setHealth(health: number): void {
    this.state.health = Math.max(0, Math.min(health, this.state.maxHealth));
  }

  /**
   * Получить здоровье
   */
  public getHealth(): number {
    return this.state.health;
  }

  /**
   * Нанести урон
   */
  public takeDamage(amount: number = 1): boolean {
    this.state.health = Math.max(0, this.state.health - amount);
    return this.state.health > 0;
  }

  /**
   * Добавить здоровье
   */
  public addHealth(amount: number = 1): void {
    this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
  }

  /**
   * Установить максимальное количество ключей (для инвентаря)
   */
  public setMaxKeys(max: number): void {
    this.state.maxKeys = max;
  }

  /**
   * Установить количество ключей
   */
  public setKeys(keys: number): void {
    this.state.keys = Math.max(0, Math.min(keys, this.state.maxKeys));
  }

  /**
   * Получить количество ключей
   */
  public getKeys(): number {
    return this.state.keys;
  }

  /**
   * Добавить ключ
   */
  public addKey(): boolean {
    if (this.state.keys < this.state.maxKeys) {
      this.state.keys++;
      return true;
    }
    return false;
  }

  /**
   * Убрать ключ
   */
  public removeKey(): boolean {
    if (this.state.keys > 0) {
      this.state.keys--;
      return true;
    }
    return false;
  }

  /**
   * Установить очки
   */
  public setScore(score: number): void {
    this.state.score = Math.max(0, score);
  }

  /**
   * Получить очки
   */
  public getScore(): number {
    return this.state.score;
  }

  /**
   * Добавить очки
   */
  public addScore(amount: number): void {
    this.state.score += amount;
  }

  /**
   * Установить активацию оракула
   */
  public setOracleActivated(activated: boolean): void {
    this.state.isOracleActivated = activated;
  }

  /**
   * Проверить активацию оракула
   */
  public isOracleActivated(): boolean {
    return this.state.isOracleActivated;
  }

  /**
   * Установить паузу
   */
  public setPaused(paused: boolean): void {
    this.state.isPaused = paused;
  }

  /**
   * Проверить паузу
   */
  public isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Установить Game Over
   */
  public setGameOver(result: 'win' | 'lose'): void {
    this.state.isGameOver = true;
    this.state.gameOverResult = result;
  }

  /**
   * Проверить Game Over
   */
  public isGameOver(): boolean {
    return this.state.isGameOver;
  }

  /**
   * Получить результат игры
   */
  public getGameOverResult(): 'win' | 'lose' | undefined {
    return this.state.gameOverResult;
  }

  // ================================================
  // ⚠️ НОВОЕ: Coin & Phase Methods
  // ================================================

  /**
   * Установить фазу игры
   */
  public setGamePhase(phase: GamePhase): void {
    this.state.currentPhase = phase;
  }

  /**
   * Получить текущую фазу игры
   */
  public getGamePhase(): GamePhase {
    return this.state.currentPhase;
  }

  /**
   * Установить количество монет
   */
  public setCoins(coins: number): void {
    this.state.coins = Math.max(0, coins);
  }

  /**
   * Получить количество монет
   */
  public getCoins(): number {
    return this.state.coins;
  }

  /**
   * Получить максимальное количество монет
   */
  public getMaxCoins(): number {
    return this.state.maxCoins || 3;
  }

  /**
   * Добавить монетку
   */
  public addCoin(): void {
    this.state.coins++;
  }

  /**
   * Убрать монетку
   */
  public removeCoin(): boolean {
    if (this.state.coins > 0) {
      this.state.coins--;
      return true;
    }
    return false;
  }

  /**
   * Проверить, активен ли квиз
   */
  public isQuizActive(): boolean {
    return this.state.isQuizActive;
  }

  /**
   * Установить статус квиза
   */
  public setQuizActive(active: boolean, type: QuizType = null): void {
    this.state.isQuizActive = active;
    this.state.quizType = active ? type : null;
  }

  /**
   * Получить тип активного квиза
   */
  public getQuizType(): QuizType {
    return this.state.quizType;
  }

  /**
   * Сбросить состояние
   */
  public reset(): void {
    this.state = {
      level: 1,
      health: 3,
      maxHealth: 3,
      keys: 0,
      maxKeys: 3,
      score: 0,
      isOracleActivated: false,
      isPaused: false,
      isGameOver: false,
      // ⚠️ НОВОЕ: Coin mechanic defaults
      currentPhase: GamePhase.COIN,
      coins: 0,
      maxCoins: 3, // ✅ НОВОЕ: Max coins limit
      isQuizActive: false,
      quizType: null,
      // ✅ НОВОЕ: Reset used coin statements
      usedCoinTrueStatements: [],
      usedCoinFalseStatements: []
    };
  }

  // ================================================
  // ✅ НОВОЕ: Used Coin Statements Tracking
  // ================================================

  /**
   * Добавить использованное true-утверждение
   */
  public addUsedTrueStatement(text: string): void {
    if (!this.state.usedCoinTrueStatements.includes(text)) {
      this.state.usedCoinTrueStatements.push(text);
    }
  }

  /**
   * Добавить использованное false-утверждение
   */
  public addUsedFalseStatement(text: string): void {
    if (!this.state.usedCoinFalseStatements.includes(text)) {
      this.state.usedCoinFalseStatements.push(text);
    }
  }

  /**
   * Получить список использованных true-утверждений
   */
  public getUsedTrueStatements(): string[] {
    return [...this.state.usedCoinTrueStatements];
  }

  /**
   * Получить список использованных false-утверждений
   */
  public getUsedFalseStatements(): string[] {
    return [...this.state.usedCoinFalseStatements];
  }

  /**
   * Очистить список использованных утверждений (например, при смене уровня)
   */
  public clearUsedStatements(): void {
    this.state.usedCoinTrueStatements = [];
    this.state.usedCoinFalseStatements = [];
  }
}

