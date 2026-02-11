/**
 * Unit tests for CoinQuizHandler
 */

import { CoinQuizHandler, CoinQuizCallbacks, CoinQuizDependencies } from '../../../../game/scenes/quiz/CoinQuizHandler';
import { SOUND_KEYS } from '../../../../constants/gameConstants';
import { createMockGameState } from '../../../helpers/mocks';

// Mocks
jest.mock('../../../../game/systems/ScoreSystem');
jest.mock('../../../../game/systems/HealthSystem');
jest.mock('../../../../game/systems/AudioManager');
jest.mock('../../../../game/core/GameState');

describe('CoinQuizHandler', () => {
    let handler: CoinQuizHandler;
    let mockDeps: CoinQuizDependencies;
    let mockCallbacks: CoinQuizCallbacks;
    let mockCoinSprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock coin sprite
        mockCoinSprite = {
            playDeathAnimation: jest.fn(),
            x: 100,
            y: 200,
            active: true,
            destroy: jest.fn()
        };

        // Mock dependencies
        const mockScene = {
            time: {
                now: 1000,
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            }
        };

        const mockGameState = createMockGameState();
        // The helper already provides jest.fn() methods, no need to mockClear

        const mockScoreSystem = {
            addScore: jest.fn(),
            addCoinScore: jest.fn(), // ✅ Добавлено
            removeScore: jest.fn() // ✅ Добавлено для штрафов
        };

        const mockHealthSystem = {
            removeLife: jest.fn(),
            takeDamage: jest.fn().mockReturnValue(true) // Returns true if alive, false if dead
        };

        const mockAudioManager = {
            playSound: jest.fn(),
            playSuccessCoin: jest.fn()
        };

        const answeredCoinStatements = new Set<string>(); // ✅ Добавлено

        mockDeps = {
            scene: mockScene as any,
            gameState: mockGameState as any,
            scoreSystem: mockScoreSystem as any,
            healthSystem: mockHealthSystem as any,
            audioManager: mockAudioManager as any,
            answeredCoinStatements // ✅ Добавлено
        };

        mockCallbacks = {
            resumeGame: jest.fn(),
            updateHUD: jest.fn()
        };

        handler = new CoinQuizHandler(mockDeps, mockCallbacks);
    });

    describe('setCurrentCoin and getCurrentCoinSprite', () => {
        it('should set and get current coin', () => {
            handler.setCurrentCoin(mockCoinSprite);
            expect(handler.getCurrentCoinSprite()).toBe(mockCoinSprite);
        });

        it('should return null if not set', () => {
            expect(handler.getCurrentCoinSprite()).toBeNull();
        });
    });

    describe('handleCorrect', () => {
        beforeEach(() => {
            handler.setCurrentCoin(mockCoinSprite);
        });

        it('should add coin score', () => {
            handler.handleCorrect('Test statement text');
            expect(mockDeps.scoreSystem.addCoinScore).toHaveBeenCalledWith(true); // Unique by default
        });

        it('should add coin to game state', () => {
            handler.handleCorrect('Test statement text');
            expect(mockDeps.gameState.addCoin).toHaveBeenCalled();
        });

        it('should play success coin sound', () => {
            handler.handleCorrect('Test statement text');
            expect(mockDeps.audioManager.playSuccessCoin).toHaveBeenCalled();
        });

        it('should destroy coin sprite immediately (no death animation)', () => {
            handler.handleCorrect('Test statement text');
            expect(mockCoinSprite.destroy).toHaveBeenCalled();
        });

        it('should clear current coin sprite', () => {
            handler.handleCorrect('Test statement text');
            expect(handler.getCurrentCoinSprite()).toBeNull();
        });

        it('should update HUD', () => {
            handler.handleCorrect('Test statement text');
            expect(mockCallbacks.updateHUD).toHaveBeenCalled();
        });

        it('should resume game', () => {
            handler.handleCorrect('Test statement text');
            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });

        it('should work if coin sprite is null', () => {
            handler.setCurrentCoin(null);
            expect(() => handler.handleCorrect('Test statement text')).not.toThrow();
            expect(mockDeps.gameState.addCoin).toHaveBeenCalled();
        });
    });

    describe('handleWrong', () => {
        beforeEach(() => {
            handler.setCurrentCoin(mockCoinSprite);
        });

        it('should remove life', () => {
            handler.handleWrong();
            expect(mockDeps.healthSystem.takeDamage).toHaveBeenCalledWith(1);
        });

        it('should play damage sound', () => {
            handler.handleWrong();
            expect(mockDeps.audioManager.playSound).toHaveBeenCalledWith(SOUND_KEYS.DAMAGE);
        });

        it('should destroy coin sprite without death animation', () => {
            handler.handleWrong();
            expect(mockCoinSprite.destroy).toHaveBeenCalled();
        });

        it('should clear current coin sprite', () => {
            handler.handleWrong();
            expect(handler.getCurrentCoinSprite()).toBeNull();
        });

        it('should update HUD', () => {
            handler.handleWrong();
            expect(mockCallbacks.updateHUD).toHaveBeenCalled();
        });

        it('should resume game', () => {
            handler.handleWrong();
            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });

        it('should NOT add coin', () => {
            handler.handleWrong();
            expect(mockDeps.gameState.addCoin).not.toHaveBeenCalled();
        });

        it('should work if coin sprite is null', () => {
            handler.setCurrentCoin(null);
            expect(() => handler.handleWrong()).not.toThrow();
        });
    });

    describe('handleClose', () => {
        it('should treat close as wrong answer', () => {
            const spyHandleWrong = jest.spyOn(handler, 'handleWrong');
            handler.handleClose();
            expect(spyHandleWrong).toHaveBeenCalled();
        });
    });

    describe('reset', () => {
        it('should clear current coin sprite', () => {
            handler.setCurrentCoin(mockCoinSprite);
            handler.reset();
            expect(handler.getCurrentCoinSprite()).toBeNull();
        });
    });
});
