/**
 * Unit тесты для GameState
 */

import { GameState, GameStateData } from '../../../game/core/GameState';
import { GamePhase } from '../../../constants/gameConstants';

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  describe('Инициализация', () => {
    it('должен создавать состояние с начальными значениями', () => {
      const state = gameState.getState();
      
      expect(state.level).toBe(1);
      expect(state.health).toBe(3);
      expect(state.maxHealth).toBe(3);
      expect(state.keys).toBe(0);
      expect(state.maxKeys).toBe(3);
      expect(state.score).toBe(0);
      expect(state.isOracleActivated).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isGameOver).toBe(false);
    });
  });

  describe('Управление здоровьем', () => {
    it('должен устанавливать здоровье в допустимых пределах', () => {
      gameState.setHealth(5);
      expect(gameState.getHealth()).toBe(3); // maxHealth = 3

      gameState.setHealth(-1);
      expect(gameState.getHealth()).toBe(0);

      gameState.setHealth(2);
      expect(gameState.getHealth()).toBe(2);
    });

    it('должен наносить урон', () => {
      gameState.setHealth(3);
      const isAlive = gameState.takeDamage(1);
      
      expect(gameState.getHealth()).toBe(2);
      expect(isAlive).toBe(true);
    });

    it('должен возвращать false при смерти', () => {
      gameState.setHealth(1);
      const isAlive = gameState.takeDamage(2);
      
      expect(gameState.getHealth()).toBe(0);
      expect(isAlive).toBe(false);
    });

    it('должен добавлять здоровье с ограничением', () => {
      gameState.setHealth(2);
      gameState.addHealth(5);
      
      expect(gameState.getHealth()).toBe(3); // maxHealth = 3
    });
  });

  describe('Управление ключами', () => {
    it('должен устанавливать ключи в допустимых пределах', () => {
      gameState.setKeys(5);
      expect(gameState.getKeys()).toBe(3); // maxKeys = 3

      gameState.setKeys(-1);
      expect(gameState.getKeys()).toBe(0);
    });

    it('должен добавлять ключ', () => {
      expect(gameState.addKey()).toBe(true);
      expect(gameState.getKeys()).toBe(1);
    });

    it('не должен добавлять ключ при достижении максимума', () => {
      gameState.setKeys(3);
      expect(gameState.addKey()).toBe(false);
      expect(gameState.getKeys()).toBe(3);
    });

    it('должен убирать ключ', () => {
      gameState.setKeys(2);
      expect(gameState.removeKey()).toBe(true);
      expect(gameState.getKeys()).toBe(1);
    });

    it('не должен убирать ключ при нулевом количестве', () => {
      gameState.setKeys(0);
      expect(gameState.removeKey()).toBe(false);
      expect(gameState.getKeys()).toBe(0);
    });
  });

  describe('Управление очками', () => {
    it('должен устанавливать очки', () => {
      gameState.setScore(100);
      expect(gameState.getScore()).toBe(100);
    });

    it('не должен устанавливать отрицательные очки', () => {
      gameState.setScore(-10);
      expect(gameState.getScore()).toBe(0);
    });

    it('должен добавлять очки', () => {
      gameState.setScore(50);
      gameState.addScore(25);
      expect(gameState.getScore()).toBe(75);
    });
  });

  describe('Управление оракулом', () => {
    it('должен устанавливать активацию оракула', () => {
      gameState.setOracleActivated(true);
      expect(gameState.isOracleActivated()).toBe(true);

      gameState.setOracleActivated(false);
      expect(gameState.isOracleActivated()).toBe(false);
    });
  });

  describe('Управление паузой', () => {
    it('должен устанавливать паузу', () => {
      gameState.setPaused(true);
      expect(gameState.isPaused()).toBe(true);

      gameState.setPaused(false);
      expect(gameState.isPaused()).toBe(false);
    });
  });

  describe('Управление Game Over', () => {
    it('должен устанавливать Game Over с результатом', () => {
      gameState.setGameOver('win');
      
      expect(gameState.isGameOver()).toBe(true);
      expect(gameState.getGameOverResult()).toBe('win');
    });

    it('должен устанавливать Game Over с результатом lose', () => {
      gameState.setGameOver('lose');
      
      expect(gameState.isGameOver()).toBe(true);
      expect(gameState.getGameOverResult()).toBe('lose');
    });
  });

  describe('Управление уровнем', () => {
    it('должен устанавливать уровень', () => {
      gameState.setLevel(5);
      expect(gameState.getLevel()).toBe(5);
    });
  });

  describe('Установка состояния', () => {
    it('должен обновлять состояние частично', () => {
      gameState.setState({ health: 2, keys: 1 });
      
      const state = gameState.getState();
      expect(state.health).toBe(2);
      expect(state.keys).toBe(1);
      expect(state.level).toBe(1); // остальные значения не изменились
    });
  });

  describe('Сброс состояния', () => {
    it('должен сбрасывать состояние к начальным значениям', () => {
      gameState.setLevel(5);
      gameState.setHealth(1);
      gameState.setKeys(2);
      gameState.setScore(100);
      gameState.setState({ isOracleActivated: true });
      gameState.setGameOver('win');

      gameState.reset();

      const state = gameState.getState();
      expect(state.level).toBe(1);
      expect(state.health).toBe(3);
      expect(state.keys).toBe(0);
      expect(state.score).toBe(0);
      expect(state.isOracleActivated).toBe(false);
      expect(state.isGameOver).toBe(false);
    });

    it('должен сбрасывать coin и phase состояние', () => {
      gameState.setCoins(5);
      gameState.setGamePhase(GamePhase.KEY);

      gameState.reset();

      expect(gameState.getCoins()).toBe(0);
      expect(gameState.getGamePhase()).toBe(GamePhase.COIN);
    });

    it('должен сбрасывать quiz состояние', () => {
      gameState.setQuizActive(true, 'coin');

      gameState.reset();

      expect(gameState.isQuizActive()).toBe(false);
      expect(gameState.getQuizType()).toBeNull();
    });

    it('должен очищать used statements', () => {
      gameState.addUsedTrueStatement('test1');
      gameState.addUsedFalseStatement('test2');

      gameState.reset();

      expect(gameState.getUsedTrueStatements()).toEqual([]);
      expect(gameState.getUsedFalseStatements()).toEqual([]);
    });
  });

  describe('Coin & Phase методы', () => {
    it('должен устанавливать фазу игры', () => {
      gameState.setGamePhase(GamePhase.KEY);
      expect(gameState.getGamePhase()).toBe(GamePhase.KEY);

      gameState.setGamePhase(GamePhase.PORTAL);
      expect(gameState.getGamePhase()).toBe(GamePhase.PORTAL);
    });

    it('должен устанавливать количество монет', () => {
      gameState.setCoins(5);
      expect(gameState.getCoins()).toBe(5);
    });

    it('не должен устанавливать отрицательное количество монет', () => {
      gameState.setCoins(-5);
      expect(gameState.getCoins()).toBe(0);
    });

    it('должен получать максимальное количество монет', () => {
      expect(gameState.getMaxCoins()).toBe(3);
    });

    it('должен добавлять монетку', () => {
      const initial = gameState.getCoins();
      gameState.addCoin();
      expect(gameState.getCoins()).toBe(initial + 1);
    });

    it('должен убирать монетку', () => {
      gameState.setCoins(3);
      expect(gameState.removeCoin()).toBe(true);
      expect(gameState.getCoins()).toBe(2);
    });

    it('не должен убирать монетку при нулевом количестве', () => {
      gameState.setCoins(0);
      expect(gameState.removeCoin()).toBe(false);
      expect(gameState.getCoins()).toBe(0);
    });
  });

  describe('Quiz методы', () => {
    it('должен возвращать статус квиза', () => {
      expect(gameState.isQuizActive()).toBe(false);

      gameState.setQuizActive(true, 'coin');
      expect(gameState.isQuizActive()).toBe(true);
    });

    it('должен устанавливать статус квиза с типом', () => {
      gameState.setQuizActive(true, 'key');
      expect(gameState.getQuizType()).toBe('key');

      gameState.setQuizActive(true, 'portal');
      expect(gameState.getQuizType()).toBe('portal');
    });

    it('должен сбрасывать тип квиза при деактивации', () => {
      gameState.setQuizActive(true, 'coin');
      gameState.setQuizActive(false);

      expect(gameState.isQuizActive()).toBe(false);
      expect(gameState.getQuizType()).toBeNull();
    });

    it('должен устанавливать quiz active без типа', () => {
      gameState.setQuizActive(true);
      expect(gameState.isQuizActive()).toBe(true);
      expect(gameState.getQuizType()).toBeNull();
    });
  });

  describe('Used Coin Statements', () => {
    it('должен добавлять true-утверждение', () => {
      gameState.addUsedTrueStatement('test statement 1');
      gameState.addUsedTrueStatement('test statement 2');

      expect(gameState.getUsedTrueStatements()).toEqual(['test statement 1', 'test statement 2']);
    });

    it('не должен добавлять дубликаты true-утверждений', () => {
      gameState.addUsedTrueStatement('test');
      gameState.addUsedTrueStatement('test');
      gameState.addUsedTrueStatement('test');

      expect(gameState.getUsedTrueStatements()).toEqual(['test']);
    });

    it('должен добавлять false-утверждение', () => {
      gameState.addUsedFalseStatement('false statement 1');
      gameState.addUsedFalseStatement('false statement 2');

      expect(gameState.getUsedFalseStatements()).toEqual(['false statement 1', 'false statement 2']);
    });

    it('не должен добавлять дубликаты false-утверждений', () => {
      gameState.addUsedFalseStatement('test');
      gameState.addUsedFalseStatement('test');

      expect(gameState.getUsedFalseStatements()).toEqual(['test']);
    });

    it('должен возвращать копию массива true-утверждений', () => {
      gameState.addUsedTrueStatement('test');
      const arr1 = gameState.getUsedTrueStatements();
      const arr2 = gameState.getUsedTrueStatements();

      expect(arr1).not.toBe(arr2); // Разные ссылки
      expect(arr1).toEqual(arr2); // Одинаковое содержимое
    });

    it('должен возвращать копию массива false-утверждений', () => {
      gameState.addUsedFalseStatement('test');
      const arr1 = gameState.getUsedFalseStatements();
      const arr2 = gameState.getUsedFalseStatements();

      expect(arr1).not.toBe(arr2);
      expect(arr1).toEqual(arr2);
    });

    it('должен очищать использованные утверждения', () => {
      gameState.addUsedTrueStatement('test1');
      gameState.addUsedFalseStatement('test2');

      gameState.clearUsedStatements();

      expect(gameState.getUsedTrueStatements()).toEqual([]);
      expect(gameState.getUsedFalseStatements()).toEqual([]);
    });
  });

  describe('Дополнительные проверки здоровья', () => {
    it('должен принимать amount по умолчанию = 1 в takeDamage', () => {
      gameState.setHealth(3);
      gameState.takeDamage(); // Без параметра

      expect(gameState.getHealth()).toBe(2);
    });

    it('должен наносить больший урон', () => {
      gameState.setHealth(3);
      gameState.takeDamage(2);

      expect(gameState.getHealth()).toBe(1);
    });

    it('должен принимать amount по умолчанию = 1 в addHealth', () => {
      gameState.setHealth(1);
      gameState.addHealth(); // Без параметра

      expect(gameState.getHealth()).toBe(2);
    });
  });

  describe('Установка максимального количества ключей', () => {
    it('должен устанавливать maxKeys', () => {
      gameState.setMaxKeys(5);

      expect(gameState.addKey()).toBe(true);
      expect(gameState.addKey()).toBe(true);
      expect(gameState.addKey()).toBe(true);
      expect(gameState.addKey()).toBe(true);
      expect(gameState.addKey()).toBe(true);
      expect(gameState.addKey()).toBe(false); // Максимум
    });
  });

  describe('setState с coin/quiz полями', () => {
    it('должен обновлять coin поля', () => {
      gameState.setState({
        coins: 5,
        currentPhase: GamePhase.PORTAL
      });

      expect(gameState.getCoins()).toBe(5);
      expect(gameState.getGamePhase()).toBe(GamePhase.PORTAL);
    });

    it('должен обновлять quiz поля', () => {
      gameState.setState({
        isQuizActive: true,
        quizType: 'portal'
      });

      expect(gameState.isQuizActive()).toBe(true);
      expect(gameState.getQuizType()).toBe('portal');
    });

    it('должен обновлять used statements', () => {
      gameState.setState({
        usedCoinTrueStatements: ['test1', 'test2'],
        usedCoinFalseStatements: ['test3']
      });

      expect(gameState.getUsedTrueStatements()).toEqual(['test1', 'test2']);
      expect(gameState.getUsedFalseStatements()).toEqual(['test3']);
    });
  });

  describe('Интеграционные тесты', () => {
    it('полный цикл игры: от начала до game over', () => {
      // Начальное состояние
      expect(gameState.getHealth()).toBe(3);
      expect(gameState.getCoins()).toBe(0);
      expect(gameState.getGamePhase()).toBe(GamePhase.COIN);

      // Фаза COIN: собираем монеты
      gameState.addCoin();
      gameState.addCoin();
      gameState.addCoin();
      expect(gameState.getCoins()).toBe(3);

      // Переход к фазе KEY
      gameState.setGamePhase(GamePhase.KEY);

      // Получаем ключи
      gameState.addKey();
      gameState.addKey();
      gameState.addKey();
      expect(gameState.getKeys()).toBe(3);

      // Переход к PORTAL
      gameState.setGamePhase(GamePhase.PORTAL);

      // Урон
      gameState.takeDamage(1);
      expect(gameState.getHealth()).toBe(2);

      // Game Over
      gameState.setGameOver('lose');
      expect(gameState.isGameOver()).toBe(true);
      expect(gameState.getGameOverResult()).toBe('lose');

      // Сброс
      gameState.reset();
      expect(gameState.getHealth()).toBe(3);
      expect(gameState.getCoins()).toBe(0);
      expect(gameState.getGamePhase()).toBe(GamePhase.COIN);
    });

    it('quiz активация и деактивация', () => {
      gameState.setQuizActive(true, 'coin');
      expect(gameState.isQuizActive()).toBe(true);

      gameState.setQuizActive(false);
      expect(gameState.isQuizActive()).toBe(false);
      expect(gameState.getQuizType()).toBeNull();
    });
  });
});








