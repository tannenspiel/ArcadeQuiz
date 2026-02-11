/**
 * Unit тесты для KeyQuizHandler
 */

import { KeyQuizHandler, KeyQuizCallbacks, KeyQuizDependencies } from '../../../../game/scenes/quiz/KeyQuizHandler';
import { Player } from '../../../../game/entities/Player';
import type { ParsedQuestion } from '../../../../types/questionTypes';

// Моки для зависимостей
jest.mock('../../../../game/systems/ScoreSystem');
jest.mock('../../../../game/systems/HealthSystem');
jest.mock('../../../../game/systems/AudioManager');
jest.mock('../../../../game/systems/CollisionSystem');
jest.mock('../../../../game/core/GameState');
jest.mock('../../../../game/entities/Player');

describe('KeyQuizHandler', () => {
    let handler: KeyQuizHandler;
    let mockDeps: KeyQuizDependencies;
    let mockCallbacks: KeyQuizCallbacks;
    let mockKeySprite: any;
    let mockQuestionData: ParsedQuestion;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock key sprite
        mockKeySprite = {
            destroy: jest.fn(),
            x: 100,
            y: 200,
            active: true
        };

        // Mock question data
        mockQuestionData = {
            type: 'text' as any,
            questionText: 'What is 2+2?',
            correctAnswer: '4',
            wrongAnswers: ['3', '5', '6'],
            allAnswers: ['4', '3', '5', '6'],
            feedbacks: ['Correct!', 'Wrong', 'Wrong', 'Wrong'],
            wrongFeedbacks: ['Wrong', 'Wrong', 'Wrong']
        };

        // Mock dependencies
        const mockScene = {
            time: {
                now: 1000,
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            },
            collisionSystem: {
                clearProcessingKey: jest.fn()
            }
        };

        const mockGameState = {
            addKey: jest.fn(),
            getKeys: jest.fn().mockReturnValue(0) as jest.Mock,
            // ⚠️ NEW: 2026-01-31 - Добавлены методы для механики монеток
            getCoins: jest.fn().mockReturnValue(0) as jest.Mock,
            getMaxCoins: jest.fn().mockReturnValue(3) as jest.Mock,
            getGamePhase: jest.fn().mockReturnValue('KEY') as jest.Mock,
            isQuizActive: jest.fn().mockReturnValue(false) as jest.Mock,
            setQuizActive: jest.fn(),
        };

        const mockScoreSystem = {
            addKeyScore: jest.fn(),
            removeScore: jest.fn() // ✅ Добавлено для штрафов
        };

        const mockHealthSystem = {
            takeDamage: jest.fn().mockReturnValue(true) as jest.Mock
        };

        const mockAudioManager = {
            playSuccessKey: jest.fn(),
            playCharacterDead: jest.fn()
        };

        const mockCollisionSystem = {
            clearProcessingKey: jest.fn()
        };

        const mockPlayer = {
            getKey: jest.fn(),
            exitQuiz: jest.fn(),
            setState: jest.fn()
        } as any;

        const answeredQuestions = new Set<string>();

        mockDeps = {
            scene: mockScene as any,
            gameState: mockGameState as any,
            scoreSystem: mockScoreSystem as any,
            healthSystem: mockHealthSystem as any,
            audioManager: mockAudioManager as any,
            collisionSystem: mockCollisionSystem as any,
            player: mockPlayer,
            answeredQuestions
        };

        mockCallbacks = {
            flashPlayerGetKey: jest.fn(),
            resumeGame: jest.fn(),
            updateHUD: jest.fn(),
            handleGameOver: jest.fn()
        };

        handler = new KeyQuizHandler(mockDeps, mockCallbacks);
    });

    describe('setCurrentKey и getCurrentKey', () => {
        it('должен устанавливать и возвращать текущий ключ', () => {
            handler.setCurrentKey(mockKeySprite, 'key-123');

            expect(handler.getCurrentKeySprite()).toBe(mockKeySprite);
            expect(handler.getCurrentKeyId()).toBe('key-123');
        });

        it('должен возвращать null если ключ не установлен', () => {
            expect(handler.getCurrentKeySprite()).toBeNull();
            expect(handler.getCurrentKeyId()).toBeNull();
        });

        it('должен позволять изменять текущий ключ', () => {
            handler.setCurrentKey(mockKeySprite, 'key-123');
            expect(handler.getCurrentKeyId()).toBe('key-123');

            const newSprite = { destroy: jest.fn(), x: 150, y: 250, active: true } as any;
            handler.setCurrentKey(newSprite, 'key-456');

            expect(handler.getCurrentKeySprite()).toBe(newSprite);
            expect(handler.getCurrentKeyId()).toBe('key-456');
        });
    });

    describe('handleCorrect', () => {
        beforeEach(() => {
            handler.setCurrentKey(mockKeySprite, 'key-123');
        });

        it('должен уничтожать спрайт ключа', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockKeySprite.destroy).toHaveBeenCalled();
            expect(handler.getCurrentKeySprite()).toBeNull();
        });

        it('должен очищать processing key в collision system', () => {
            handler.handleCorrect(mockQuestionData);

            expect((mockDeps.scene as any).collisionSystem.clearProcessingKey).toHaveBeenCalledWith('key-123');
            expect(handler.getCurrentKeyId()).toBeNull();
        });

        it('должен добавлять ключ в gameState', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockDeps.gameState.addKey).toHaveBeenCalled();
        });

        it('должен добавлять очки за ключ', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockDeps.scoreSystem.addKeyScore).toHaveBeenCalled();
        });

        it('должен отмечать вопрос как отвеченный', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockDeps.answeredQuestions.has('What is 2+2?')).toBe(true);
        });

        it('должен определять уникальность вопроса', () => {
            // Первый ответ - уникальный
            handler.handleCorrect(mockQuestionData);
            expect(mockDeps.scoreSystem.addKeyScore).toHaveBeenCalledWith(true);

            // Второй ответ на тот же вопрос - не уникальный
            handler.setCurrentKey(mockKeySprite, 'key-456');
            handler.handleCorrect(mockQuestionData);
            expect(mockDeps.scoreSystem.addKeyScore).toHaveBeenCalledWith(false);
        });

        it('должен проигрывать звук успеха', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockDeps.audioManager.playSuccessKey).toHaveBeenCalled();
        });

        it('должен вызывать flashPlayerGetKey', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockCallbacks.flashPlayerGetKey).toHaveBeenCalled();
        });

        it('должен вызывать getKey у игрока', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockDeps.player.getKey).toHaveBeenCalled();
        });

        it('должен возобновлять игру', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });

        it('должен обновлять HUD', () => {
            handler.handleCorrect(mockQuestionData);

            expect(mockCallbacks.updateHUD).toHaveBeenCalled();
        });

        it('должен работать без questionData', () => {
            handler.handleCorrect();

            expect(mockDeps.gameState.addKey).toHaveBeenCalled();
            expect(mockDeps.scoreSystem.addKeyScore).toHaveBeenCalledWith(true);
        });
    });

    describe('handleWrong', () => {
        beforeEach(() => {
            handler.setCurrentKey(mockKeySprite, 'key-123');
            (mockDeps.healthSystem.takeDamage as jest.Mock).mockReturnValue(true);
        });

        it('должен наносить урон здоровью', () => {
            handler.handleWrong(1);

            expect(mockDeps.healthSystem.takeDamage).toHaveBeenCalledWith(1);
        });

        it('должен использовать стандартный урон 1 если не указан', () => {
            handler.handleWrong();

            expect(mockDeps.healthSystem.takeDamage).toHaveBeenCalledWith(1);
        });

        it('должен обновлять HUD', () => {
            handler.handleWrong();

            expect(mockCallbacks.updateHUD).toHaveBeenCalled();
        });

        it('должен НЕ выходить из quiz состояния если игрок жив (модальное окно остается открытым)', () => {
            handler.handleWrong();

            expect(mockDeps.player.exitQuiz).not.toHaveBeenCalled();
        });

        it('должен НЕ очищать processing key если игрок жив (модальное окно остается открытым)', () => {
            handler.handleWrong();

            expect(mockDeps.collisionSystem.clearProcessingKey).not.toHaveBeenCalled();
            expect(handler.getCurrentKeyId()).toBe('key-123');
        });

        it('должен НЕ уничтожать ключ если игрок жив', () => {
            handler.handleWrong();

            expect(mockKeySprite.destroy).not.toHaveBeenCalled();
        });

        describe('Game Over при смерти', () => {
            beforeEach(() => {
                (mockDeps.healthSystem.takeDamage as jest.Mock).mockReturnValue(false);
            });

            it('должен уничтожать ключ при game over', () => {
                handler.handleWrong();

                expect(mockKeySprite.destroy).toHaveBeenCalled();
            });

            it('должен очищать processing key при game over', () => {
                handler.handleWrong();

                expect((mockDeps.scene as any).collisionSystem.clearProcessingKey).toHaveBeenCalledWith('key-123');
            });

            it('должен выходить из quiz состояния', () => {
                handler.handleWrong();

                expect(mockDeps.player.exitQuiz).toHaveBeenCalled();
            });

            it('должен устанавливать состояние DEAD', () => {
                handler.handleWrong();

                expect(mockDeps.player.setState).toHaveBeenCalledWith('DEAD');
            });

            it('должен проигрывать звук смерти', () => {
                handler.handleWrong();

                expect(mockDeps.audioManager.playCharacterDead).toHaveBeenCalled();
            });

            it('должен вызывать handleGameOver с lose после задержки', () => {
                handler.handleWrong();

                expect(mockDeps.scene.time.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
                // Callback должен вызвать handleGameOver
                const callback = (mockDeps.scene.time.delayedCall as jest.Mock).mock.calls[0][1];
                callback();
                expect(mockCallbacks.handleGameOver).toHaveBeenCalledWith('lose');
            });
        });
    });

    describe('handleClose', () => {
        beforeEach(() => {
            handler.setCurrentKey(mockKeySprite, 'key-123');
        });

        it('должен уничтожать спрайт ключа', () => {
            handler.handleClose();

            expect(mockKeySprite.destroy).toHaveBeenCalled();
            expect(handler.getCurrentKeySprite()).toBeNull();
        });

        it('должен очищать processing key', () => {
            handler.handleClose();

            expect((mockDeps.scene as any).collisionSystem.clearProcessingKey).toHaveBeenCalledWith('key-123');
            expect(handler.getCurrentKeyId()).toBeNull();
        });

        it('должен возобновлять игру', () => {
            handler.handleClose();

            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });

        it('должен работать без установленного ключа', () => {
            handler.setCurrentKey(null, null);

            expect(() => handler.handleClose()).not.toThrow();
            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });
    });
});
