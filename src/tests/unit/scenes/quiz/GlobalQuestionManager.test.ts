/**
 * Unit тесты для GlobalQuestionManager
 */

import { GlobalQuestionManager, GlobalQuestionCallbacks, GlobalQuestionDependencies } from '../../../../game/scenes/quiz/GlobalQuestionManager';
import { Oracle } from '../../../../game/entities/Oracle';
import { AssetLoader } from '../../../../game/core/AssetLoader';
import { QuizManager } from '../../../../game/systems/QuizManager';
import { LevelManager } from '../../../../game/core/LevelManager';
import type { ParsedQuestion } from '../../../../types/questionTypes';
import { QuestionType } from '../../../../types/questionTypes';

// Моки для зависимостей
jest.mock('../../../../game/entities/Oracle');
jest.mock('../../../../game/core/AssetLoader');
jest.mock('../../../../game/systems/QuizManager');
jest.mock('../../../../game/core/LevelManager');

describe('GlobalQuestionManager', () => {
    let manager: GlobalQuestionManager;
    let mockDeps: GlobalQuestionDependencies;
    let mockCallbacks: GlobalQuestionCallbacks;
    let mockScene: any;
    let mockOracle: jest.Mocked<Oracle>;
    let mockAssetLoader: jest.Mocked<AssetLoader>;
    let mockQuizManager: jest.Mocked<QuizManager>;
    let mockLevelManager: jest.Mocked<LevelManager>;
    let mockQuestionData: ParsedQuestion;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock scene
        mockScene = {
            add: {
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setDepth: jest.fn().mockReturnThis()
                }),
                image: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setDepth: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    width: 200,
                    height: 150
                })
            },
            textures: {
                exists: jest.fn().mockReturnValue(true)
            }
        };

        // Mock oracle
        const mockOracleSprite = {
            active: true,
            x: 400,
            y: 300
        };

        mockOracle = {
            getSprite: jest.fn().mockReturnValue(mockOracleSprite),
            setQuestion: jest.fn().mockResolvedValue(undefined)
        } as any;

        // Mock assetLoader
        mockAssetLoader = {
            loadImage: jest.fn().mockResolvedValue(undefined)
        } as any;

        // Mock quizManager
        mockQuestionData = {
            type: QuestionType.TEXT_ONLY,
            questionText: 'What is 2+2?',
            image: undefined,
            correctAnswer: '4',
            wrongAnswers: ['3', '5'],
            allAnswers: ['3', '4', '5'],
            feedbacks: ['Correct!'],
            wrongFeedbacks: ['Wrong!']
        };

        mockQuizManager = {
            getRandomGlobalQuestion: jest.fn().mockResolvedValue(mockQuestionData)
        } as any;

        // Mock levelManager
        mockLevelManager = {
            getCurrentLevel: jest.fn().mockReturnValue(1)
        } as any;

        // Mock callbacks
        mockCallbacks = {
            onQuestionDisplayed: jest.fn(),
            isSceneAndObjectActive: jest.fn().mockReturnValue(true) as jest.Mock
        };

        // Mock getters/setters for currentGlobalQuestionData
        let currentQuestion: ParsedQuestion | null = null;

        mockDeps = {
            scene: mockScene,
            oracle: mockOracle,
            assetLoader: mockAssetLoader,
            quizManager: mockQuizManager,
            levelManager: mockLevelManager,
            get currentGlobalQuestionData() { return currentQuestion; },
            set currentGlobalQuestionData(value) { currentQuestion = value; },
            onSetCurrentGlobalQuestion: jest.fn((data) => {
                currentQuestion = data;
                // Also update the deps object
                (mockDeps as any).currentGlobalQuestionData = data;
            }),
            getGlobalQuestionText: jest.fn().mockReturnValue(null) as jest.Mock,
            setGlobalQuestionText: jest.fn(),
            getGlobalQuestionImage: jest.fn().mockReturnValue(null) as jest.Mock,
            setGlobalQuestionImage: jest.fn()
        };

        manager = new GlobalQuestionManager(mockDeps, mockCallbacks);
    });

    describe('showGlobalQuestion', () => {
        it('должен выполняться без ошибок', async () => {
            await expect(manager.showGlobalQuestion()).resolves.not.toThrow();
        });

        it('должен загружать вопрос', async () => {
            await manager.showGlobalQuestion();

            expect(mockQuizManager.getRandomGlobalQuestion).toHaveBeenCalledWith(1);
        });

        it('должен сохранять вопрос в currentGlobalQuestionData', async () => {
            await manager.showGlobalQuestion();

            expect(mockDeps.onSetCurrentGlobalQuestion).toHaveBeenCalledWith(mockQuestionData);
        });

        it('должен вызывать onQuestionDisplayed callback', async () => {
            await manager.showGlobalQuestion();

            expect(mockCallbacks.onQuestionDisplayed).toHaveBeenCalled();
        });

        it('должен использовать существующий вопрос если он есть', async () => {
            mockDeps.currentGlobalQuestionData = mockQuestionData;

            await manager.showGlobalQuestion();

            expect(mockQuizManager.getRandomGlobalQuestion).not.toHaveBeenCalled();
        });

        it('должен уничтожать предыдущий текст вопроса', async () => {
            const mockPrevText = { destroy: jest.fn() };
            (mockDeps.getGlobalQuestionText as jest.Mock).mockReturnValue(mockPrevText);

            await manager.showGlobalQuestion();

            expect(mockPrevText.destroy).toHaveBeenCalled();
        });

        it('должен уничтожать предыдущее изображение вопроса', async () => {
            const mockPrevImage = { destroy: jest.fn() };
            (mockDeps.getGlobalQuestionImage as jest.Mock).mockReturnValue(mockPrevImage);

            await manager.showGlobalQuestion();

            expect(mockPrevImage.destroy).toHaveBeenCalled();
        });

        it('должен обрабатывать ошибки загрузки', async () => {
            mockQuizManager.getRandomGlobalQuestion.mockRejectedValue(new Error('Load failed'));

            await expect(manager.showGlobalQuestion()).resolves.not.toThrow();
        });
    });

    describe('showFallbackGlobalQuestion', () => {
        it('должен выполняться без ошибок', async () => {
            await expect(manager.showFallbackGlobalQuestion()).resolves.not.toThrow();
        });

        it('должен уничтожать предыдущее изображение', async () => {
            const mockPrevImage = { destroy: jest.fn() };
            (mockDeps.getGlobalQuestionImage as jest.Mock).mockReturnValue(mockPrevImage);

            await manager.showFallbackGlobalQuestion();

            expect(mockPrevImage.destroy).toHaveBeenCalled();
        });
    });

    describe('safeSetOracleQuestion', () => {
        it('должен устанавливать вопрос если сцена активна', async () => {
            (mockCallbacks.isSceneAndObjectActive as jest.Mock).mockReturnValue(true);

            await manager.safeSetOracleQuestion(mockQuestionData);

            expect(mockOracle.setQuestion).toHaveBeenCalledWith(mockQuestionData, mockAssetLoader);
        });

        it('не должен устанавливать вопрос если сцена неактивна', async () => {
            (mockCallbacks.isSceneAndObjectActive as jest.Mock).mockReturnValue(false);

            await manager.safeSetOracleQuestion(mockQuestionData);

            expect(mockOracle.setQuestion).not.toHaveBeenCalled();
        });

        it('не должен устанавливать вопрос если оракул недоступен', async () => {
            (mockOracle.getSprite as jest.Mock).mockReturnValue(null as any);

            await manager.safeSetOracleQuestion(mockQuestionData);

            expect(mockOracle.setQuestion).not.toHaveBeenCalled();
        });

        it('не должен устанавливать вопрос если спрайт оракула неактивен', async () => {
            (mockOracle.getSprite as jest.Mock).mockReturnValue({ active: false } as any);

            await manager.safeSetOracleQuestion(mockQuestionData);

            expect(mockOracle.setQuestion).not.toHaveBeenCalled();
        });

        it('должен обрабатывать ошибки установки вопроса', async () => {
            mockOracle.setQuestion.mockRejectedValue(new Error('Set failed'));

            await expect(manager.safeSetOracleQuestion(mockQuestionData)).resolves.not.toThrow();
        });
    });

    describe('showQuestionOldImpl', () => {
        it('должен показывать вопрос с изображением если image доступен', async () => {
            const questionWithImage: ParsedQuestion = {
                ...mockQuestionData,
                image: 'QuizGame_test_image.png'
            };

            // Приватный метод, но мы можем проверить через showGlobalQuestion
            // при отключенном USE_QUESTION_BUBBLE
            await manager['showQuestionOldImpl'](questionWithImage);

            expect(mockAssetLoader.loadImage).toHaveBeenCalled();
        });

        it('должен масштабировать изображение если оно слишком большое', async () => {
            const questionWithImage: ParsedQuestion = {
                ...mockQuestionData,
                image: 'QuizGame_large.png'
            };

            // Мок с большим изображением
            const mockLargeImage = {
                setOrigin: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis(),
                width: 500,
                height: 400
            };

            mockScene.add.image.mockReturnValue(mockLargeImage);

            await manager['showQuestionOldImpl'](questionWithImage);

            expect(mockLargeImage.setScale).toHaveBeenCalled();
        });

        it('должен обрабатывать ошибки загрузки изображения', async () => {
            const questionWithImage: ParsedQuestion = {
                ...mockQuestionData,
                image: 'nonexistent.png'
            };

            mockAssetLoader.loadImage.mockRejectedValue(new Error('Image not found'));

            await expect(manager['showQuestionOldImpl'](questionWithImage)).resolves.not.toThrow();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно работать с последовательными вызовами showGlobalQuestion', async () => {
            // Первый вызов - загружаем вопрос
            await manager.showGlobalQuestion();
            const callCount = mockQuizManager.getRandomGlobalQuestion.mock.calls.length;

            // Второй вызов - должен использовать существующий вопрос
            await manager.showGlobalQuestion();
            expect(mockQuizManager.getRandomGlobalQuestion).toHaveBeenCalledTimes(callCount); // Не увеличился
        });

        it('должен корректно работать с fallback вопросом', async () => {
            // Просто проверяем, что fallback выполняется без ошибок
            await expect(manager.showFallbackGlobalQuestion()).resolves.not.toThrow();
        });
    });
});
