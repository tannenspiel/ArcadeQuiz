/**
 * Unit tests for UIManager
 *
 * Tests the central UI manager that coordinates modal windows:
 * - Portal modal switching
 * - Key quiz modal management
 * - Game over modal handling
 * - Event bus integration
 * - Input management
 * - Modal cleanup and destruction
 */

// Mock modal classes BEFORE importing UIManager
jest.mock('../../../game/ui/PortalModal');
jest.mock('../../../game/ui/KeyQuestionModal');
jest.mock('../../../game/ui/GameOverModal');

// Mock logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock game constants to avoid Phaser import
jest.mock('../../../constants/gameConstants', () => ({
  EVENTS: {
    PORTAL_ENTER: 'PORTAL_ENTER',
    PORTAL_ENTER_CONFIRMED: 'PORTAL_ENTER_CONFIRMED',
    PORTAL_ENTER_CANCELLED: 'PORTAL_ENTER_CANCELLED',
    SHOW_KEY_QUIZ: 'SHOW_KEY_QUIZ',
    KEY_QUIZ_COMPLETED: 'KEY_QUIZ_COMPLETED',
    GAME_OVER: 'GAME_OVER',
    RESTART_GAME: 'RESTART_GAME',
    NEXT_LEVEL: 'NEXT_LEVEL',
  },
  PHASER_SCENE_EVENTS: {
    SHUTDOWN: 'shutdown',
  },
  MAP_WIDTH: 64,
  MAP_HEIGHT: 64,
  BASE_SCALE: 32,
  // ... other constants
}));

import { UIManager } from '../../../game/ui/UIManager';
import { PortalModal } from '../../../game/ui/PortalModal';
import { KeyQuestionModal } from '../../../game/ui/KeyQuestionModal';
import { GameOverModal, GameOverType } from '../../../game/ui/GameOverModal';
import { AbstractPortal } from '../../../game/entities/portals/AbstractPortal';
import { ParsedQuestion } from '../../../types/questionTypes';

describe('UIManager', () => {
  let scene: any;
  let eventBus: any;
  let manager: UIManager;
  let mockPortal: AbstractPortal;
  let mockPortalConfig: any;

  beforeEach(() => {
    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create mock scene - add mock for Phaser.Scenes.Events
    scene = {
      events: {
        once: jest.fn(),
      },
      input: {
        enabled: true,
        setTopOnly: jest.fn(),
      },
      // Mock Phaser.Scenes as used in UIManager
      scene: { scenes: {} },
    };

    // Create mock event bus
    eventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };

    // Create mock portal
    mockPortalConfig = {
      x: 100,
      y: 200,
      type: 'standard',
    };

    mockPortal = {
      getConfig: jest.fn(() => mockPortalConfig),
    } as unknown as AbstractPortal;
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('Construction', () => {
    test('should create UIManager instance', () => {
      manager = new UIManager(scene, eventBus);

      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(UIManager);
    });

    test('should store scene and eventBus', () => {
      manager = new UIManager(scene, eventBus);

      expect(manager['scene']).toBe(scene);
      expect(manager['eventBus']).toBe(eventBus);
    });

    test('should initialize event listeners', () => {
      manager = new UIManager(scene, eventBus);

      expect(eventBus.on).toHaveBeenCalledWith(
        'PORTAL_ENTER',
        expect.any(Function),
        manager
      );
      expect(eventBus.on).toHaveBeenCalledWith(
        'SHOW_KEY_QUIZ',
        expect.any(Function),
        manager
      );
      expect(eventBus.on).toHaveBeenCalledWith(
        'GAME_OVER',
        expect.any(Function),
        manager
      );
    });

    test('should register shutdown listener', () => {
      manager = new UIManager(scene, eventBus);

      expect(scene.events.once).toHaveBeenCalled();
    });
  });

  describe('Portal Modal Handling', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should create portal modal on PORTAL_ENTER event', (done) => {
      (PortalModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      // Get the event handler
      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      // Call the handler
      handler.call(manager, { portal: mockPortal });

      expect(PortalModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          portalConfig: mockPortalConfig,
        })
      );
      done();
    });

    test('should enable input when creating portal modal', (done) => {
      (PortalModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      scene.input.enabled = false;

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      handler.call(manager, { portal: mockPortal });

      expect(scene.input.enabled).toBe(true);
      expect(scene.input.setTopOnly).toHaveBeenCalledWith(false);
      done();
    });

    test('should close existing portal modal before opening new one', (done) => {
      const mockDestroy = jest.fn();
      (PortalModal as jest.Mock).mockImplementation(() => ({
        destroy: mockDestroy,
      }));

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      handler.call(manager, { portal: mockPortal });
      handler.call(manager, { portal: mockPortal });

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      done();
    });

    test('should emit PORTAL_ENTER_CONFIRMED on enter', (done) => {
      let onEnterCallback: (() => void) | null = null;

      (PortalModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onEnterCallback = config.onEnter;
        return { destroy: jest.fn() };
      });

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      handler.call(manager, { portal: mockPortal });

      onEnterCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('PORTAL_ENTER_CONFIRMED', {
        portal: mockPortal,
      });
      done();
    });

    test('should emit PORTAL_ENTER_CANCELLED on cancel', (done) => {
      let onCancelCallback: (() => void) | null = null;

      (PortalModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onCancelCallback = config.onCancel;
        return { destroy: jest.fn() };
      });

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      handler.call(manager, { portal: mockPortal });

      onCancelCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('PORTAL_ENTER_CANCELLED', {
        portal: mockPortal,
      });
      done();
    });

    test('should support global question parameter', (done) => {
      (PortalModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const handler = onCall[1];

      handler.call(manager, {
        portal: mockPortal,
        globalQuestion: mockQuestion,
      });

      expect(PortalModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          globalQuestion: mockQuestion,
        })
      );
      done();
    });
  });

  describe('Key Quiz Modal Handling', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should create key quiz modal on SHOW_KEY_QUIZ event', (done) => {
      (KeyQuestionModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });

      expect(KeyQuestionModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          question: mockQuestion,
        })
      );
      done();
    });

    test('should enable input when creating key quiz modal', (done) => {
      (KeyQuestionModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      scene.input.enabled = false;

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });

      expect(scene.input.enabled).toBe(true);
      expect(scene.input.setTopOnly).toHaveBeenCalledWith(false);
      done();
    });

    test('should close existing key modal before opening new one', (done) => {
      const mockDestroy = jest.fn();
      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      (KeyQuestionModal as jest.Mock).mockImplementation(() => ({
        destroy: mockDestroy,
      }));

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });
      handler.call(manager, { question: mockQuestion });

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      done();
    });

    test('should emit KEY_QUIZ_COMPLETED with correct result', (done) => {
      let onCorrectCallback: (() => void) | null = null;

      (KeyQuestionModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onCorrectCallback = config.onCorrectAnswer;
        return { destroy: jest.fn() };
      });

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });

      onCorrectCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('KEY_QUIZ_COMPLETED', {
        result: 'correct',
      });
      done();
    });

    test('should emit KEY_QUIZ_COMPLETED with wrong result and damage', (done) => {
      let onWrongCallback: ((damage: number) => void) | null = null;

      (KeyQuestionModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onWrongCallback = config.onWrongAnswer;
        return { destroy: jest.fn() };
      });

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });

      onWrongCallback!(25);

      expect(eventBus.emit).toHaveBeenCalledWith('KEY_QUIZ_COMPLETED', {
        result: 'wrong',
        damage: 25,
      });
      done();
    });

    test('should emit KEY_QUIZ_COMPLETED with closed result', (done) => {
      let onCloseCallback: (() => void) | null = null;

      (KeyQuestionModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onCloseCallback = config.onClose;
        return { destroy: jest.fn() };
      });

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
      };

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const handler = onCall[1];

      handler.call(manager, { question: mockQuestion });

      onCloseCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('KEY_QUIZ_COMPLETED', {
        result: 'closed',
      });
      done();
    });
  });

  describe('Game Over Modal Handling', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should create WIN_LEVEL modal on win result', (done) => {
      (GameOverModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const handler = onCall[1];

      handler.call(manager, {
        result: 'win',
        score: 1000,
        feedbackText: 'Great job!',
      });

      expect(GameOverModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          type: GameOverType.WIN_LEVEL,
          score: 1000,
          feedbackText: 'Great job!',
        })
      );
      done();
    });

    test('should create LOSE modal on lose result', (done) => {
      (GameOverModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const handler = onCall[1];

      handler.call(manager, {
        result: 'lose',
        score: 500,
      });

      expect(GameOverModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          type: GameOverType.LOSE,
          score: 500,
        })
      );
      done();
    });

    test('should close all existing modals before showing game over', (done) => {
      // Track each modal's destroy function
      const portalModals: Array<{ destroy: jest.Mock }> = [];
      const keyModals: Array<{ destroy: jest.Mock }> = [];
      const gameOverModals: Array<{ destroy: jest.Mock }> = [];

      (PortalModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        portalModals.push(modal);
        return modal;
      });
      (KeyQuestionModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        keyModals.push(modal);
        return modal;
      });
      (GameOverModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        gameOverModals.push(modal);
        return modal;
      });

      // Open portal modal
      const portalOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const portalHandler = portalOnCall[1];
      portalHandler.call(manager, { portal: mockPortal });

      // Open key modal
      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0,
      };
      const keyOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const keyHandler = keyOnCall[1];
      keyHandler.call(manager, { question: mockQuestion });

      // Now trigger game over
      const gameOverOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const gameOverHandler = gameOverOnCall[1];
      gameOverHandler.call(manager, { result: 'win', score: 1000 });

      // The portal modal should have been destroyed
      expect(portalModals[0].destroy).toHaveBeenCalled();
      // The key modal should have been destroyed
      expect(keyModals[0].destroy).toHaveBeenCalled();
      // Any previous game over modal should have been destroyed (if existed)
      done();
    });

    test('should emit RESTART_GAME on restart', (done) => {
      let onRestartCallback: (() => void) | null = null;

      (GameOverModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onRestartCallback = config.onRestart;
        return { destroy: jest.fn() };
      });

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const handler = onCall[1];

      handler.call(manager, { result: 'lose', score: 500 });

      onRestartCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('RESTART_GAME');
      done();
    });

    test('should emit NEXT_LEVEL on next level', (done) => {
      let onNextLevelCallback: (() => void) | null = null;

      (GameOverModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        onNextLevelCallback = config.onNextLevel;
        return { destroy: jest.fn() };
      });

      const onCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const handler = onCall[1];

      handler.call(manager, { result: 'win', score: 1000 });

      onNextLevelCallback!();

      expect(eventBus.emit).toHaveBeenCalledWith('NEXT_LEVEL');
      done();
    });

    test('should handle errors when destroying key modal', (done) => {
      const mockKeyDestroy = jest.fn(() => {
        throw new Error('Test error');
      });

      (KeyQuestionModal as jest.Mock).mockImplementation(() => ({
        destroy: mockKeyDestroy,
      }));

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0,
      };

      const keyOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const keyHandler = keyOnCall[1];
      keyHandler.call(manager, { question: mockQuestion });

      // Should not throw, should log warning instead
      const gameOverOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const gameOverHandler = gameOverOnCall[1];

      expect(() => {
        gameOverHandler.call(manager, { result: 'win', score: 1000 });
      }).not.toThrow();
      done();
    });
  });

  describe('showGameWinModal() - Win Game Modal', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should create WIN_GAME modal', () => {
      const onRestart = jest.fn();

      (GameOverModal as jest.Mock).mockImplementation(() => ({
        destroy: jest.fn(),
      }));

      manager.showGameWinModal(5000, 'You won!', onRestart);

      expect(GameOverModal).toHaveBeenCalledWith(
        scene,
        expect.objectContaining({
          type: GameOverType.WIN_GAME,
          score: 5000,
          feedbackText: 'You won!',
        })
      );
    });

    test('should call custom onRestart callback', () => {
      let capturedOnRestart: (() => void) | null = null;

      (GameOverModal as jest.Mock).mockImplementation((scene: any, config: any) => {
        capturedOnRestart = config.onRestart;
        return { destroy: jest.fn() };
      });

      const onRestart = jest.fn();
      manager.showGameWinModal(5000, 'You won!', onRestart);

      capturedOnRestart!();

      expect(onRestart).toHaveBeenCalled();
    });

    test('should close all existing modals before showing win game', () => {
      // Track each modal's destroy function
      const portalModals: Array<{ destroy: jest.Mock }> = [];
      const keyModals: Array<{ destroy: jest.Mock }> = [];
      const gameOverModals: Array<{ destroy: jest.Mock }> = [];

      (PortalModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        portalModals.push(modal);
        return modal;
      });
      (KeyQuestionModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        keyModals.push(modal);
        return modal;
      });
      (GameOverModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        gameOverModals.push(modal);
        return modal;
      });

      // Open portal modal
      const portalOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const portalHandler = portalOnCall[1];
      portalHandler.call(manager, { portal: mockPortal });

      const onRestart = jest.fn();
      manager.showGameWinModal(5000, 'You won!', onRestart);

      // The portal modal should have been destroyed
      expect(portalModals[0].destroy).toHaveBeenCalled();
    });
  });

  describe('Modal Switching', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should close existing portal modal when opening new portal modal', (done) => {
      // Track each modal's destroy function
      const portalModals: Array<{ destroy: jest.Mock }> = [];

      (PortalModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        portalModals.push(modal);
        return modal;
      });

      // Open portal modal first time
      const portalOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const portalHandler = portalOnCall[1];
      portalHandler.call(manager, { portal: mockPortal });

      // Open portal modal second time (should close first one)
      portalHandler.call(manager, { portal: mockPortal });

      // The first portal modal should have been destroyed
      expect(portalModals[0].destroy).toHaveBeenCalled();
      done();
    });

    test('should close existing key modal when opening new key modal', (done) => {
      // Track each modal's destroy function
      const keyModals: Array<{ destroy: jest.Mock }> = [];

      (KeyQuestionModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        keyModals.push(modal);
        return modal;
      });

      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0,
      };

      // Open key modal first time
      const keyOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const keyHandler = keyOnCall[1];
      keyHandler.call(manager, { question: mockQuestion });

      // Open key modal second time (should close first one)
      keyHandler.call(manager, { question: mockQuestion });

      // The first key modal should have been destroyed
      expect(keyModals[0].destroy).toHaveBeenCalled();
      done();
    });
  });

  describe('Destroy/Cleanup', () => {
    beforeEach(() => {
      manager = new UIManager(scene, eventBus);
    });

    test('should destroy all active modals', () => {
      // Track each modal's destroy function
      const portalModals: Array<{ destroy: jest.Mock }> = [];
      const keyModals: Array<{ destroy: jest.Mock }> = [];
      const gameOverModals: Array<{ destroy: jest.Mock }> = [];

      (PortalModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        portalModals.push(modal);
        return modal;
      });
      (KeyQuestionModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        keyModals.push(modal);
        return modal;
      });
      (GameOverModal as jest.Mock).mockImplementation(() => {
        const modal = { destroy: jest.fn() };
        gameOverModals.push(modal);
        return modal;
      });

      // Open portal modal
      const portalOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'PORTAL_ENTER'
      );
      const portalHandler = portalOnCall[1];
      portalHandler.call(manager, { portal: mockPortal });

      // Open key modal
      const mockQuestion: ParsedQuestion = {
        type: 'text',
        question: 'Test?',
        options: ['A', 'B'],
        correctAnswer: 0,
      };
      const keyOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'SHOW_KEY_QUIZ'
      );
      const keyHandler = keyOnCall[1];
      keyHandler.call(manager, { question: mockQuestion });

      // Trigger game over (creates GameOver modal, but also closes portal/key modals)
      const gameOverOnCall = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'GAME_OVER'
      );
      const gameOverHandler = gameOverOnCall[1];
      gameOverHandler.call(manager, { result: 'win', score: 1000 });

      // Now destroy the manager (should destroy the GameOver modal)
      manager.destroy();

      // Verify all modals were destroyed
      // Portal modal was destroyed when game over was triggered
      expect(portalModals[0].destroy).toHaveBeenCalled();
      // Key modal was destroyed when game over was triggered
      expect(keyModals[0].destroy).toHaveBeenCalled();
      // Game over modal should be destroyed when manager.destroy() is called
      expect(gameOverModals[0].destroy).toHaveBeenCalled();
    });

    test('should remove event listeners on destroy', () => {
      manager.destroy();

      expect(eventBus.off).toHaveBeenCalledWith(
        'PORTAL_ENTER',
        manager['handlePortalEnterRequest'],
        manager
      );
      expect(eventBus.off).toHaveBeenCalledWith(
        'SHOW_KEY_QUIZ',
        manager['handleShowKeyQuiz'],
        manager
      );
      expect(eventBus.off).toHaveBeenCalledWith(
        'GAME_OVER',
        manager['handleGameOver'],
        manager
      );
    });

    test('should handle null modals gracefully on destroy', () => {
      // Don't open any modals, just destroy
      expect(() => {
        manager.destroy();
      }).not.toThrow();
    });
  });

  describe('Event Bus Integration', () => {
    test('should properly bind event handlers to instance', () => {
      manager = new UIManager(scene, eventBus);

      expect(manager['handlePortalEnterRequest']).toBeDefined();
      expect(manager['handleShowKeyQuiz']).toBeDefined();
      expect(manager['handleGameOver']).toBeDefined();
    });
  });
});
