/**
 * Unit тесты для QuizManager (Refactored logic)
 */

import { QuizManager } from '../../../game/systems/QuizManager';
import { AssetLoader } from '../../../game/core/AssetLoader';
import { LevelQuestionsData, QuestionType } from '../../../types/questionTypes';

// Моки
jest.mock('../../../game/core/AssetLoader');
jest.mock('../../../utils/Logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('QuizManager Refactor', () => {
    let mockAssetLoader: jest.Mocked<AssetLoader>;
    let quizManager: QuizManager;

    const newMockLevelData: LevelQuestionsData = {
        category: 'Test Level',
        levelWinMessage: {
            win1: ['Win 1'],
            win2: ['Win 2'],
            win3: ['Win 3'],
            gameover: ['Game Over Message 1', 'Game Over Message 2']
        },
        miniQuizzes: [],
        globalQuizzes: [
            {
                question: 'Text Q1',
                correctAnswer: 'A',
                wrongAnswers: ['B'],
                feedbacks: [],
                wrongFeedbacks: []
            }
        ],
        globalQuizzesWithImage: [
            {
                question_Sign: { text: 'Image Q1', image: 'img1.png' },
                correctAnswer: 'C',
                wrongAnswers: ['D'],
                feedbacks: [],
                wrongFeedbacks: []
            },
            {
                question_Sign: { text: 'Image Q2', image: 'img2.png' },
                correctAnswer: 'E',
                wrongAnswers: ['F'],
                feedbacks: [],
                wrongFeedbacks: []
            }
        ]
    };

    beforeEach(() => {
        mockAssetLoader = {
            loadJSON: jest.fn()
        } as any;

        quizManager = new QuizManager(mockAssetLoader);
    });

    describe('getGameOverMessage', () => {
        it('должен возвращать сообщение из gameover массива', async () => {
            mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(newMockLevelData);

            const message = await quizManager.getGameOverMessage(1);

            expect(newMockLevelData.levelWinMessage.gameover).toContain(message);
        });

        it('должен возвращать дефолтное сообщение, если gameover массив пуст или отсутствует', async () => {
            const dataWithoutGameOver = { ...newMockLevelData, levelWinMessage: { ...newMockLevelData.levelWinMessage, gameover: undefined } };
            mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(dataWithoutGameOver);

            const message = await quizManager.getGameOverMessage(1);

            expect(message).toBe("Game Over!");
        });
    });

    describe('getRandomGlobalQuestion (New Structure)', () => {
        it('должен выбирать вопросы из globalQuizzes (текст)', async () => {
            // Мокаем random, чтобы выбрать первый вопрос (из общего пула)
            // Пул вопросов: 1 текстовый + 2 картиночных = 3 вопроса.
            // Индексы: 0 (текст), 1 (картинка 1), 2 (картинка 2)
            // (Порядок добавления в QuizManager: сначала globalQuizzes, потом globalQuizzesWithImage)

            mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(newMockLevelData);
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0.1); // 0.1 * 3 = 0.3 -> индекс 0

            const question = await quizManager.getRandomGlobalQuestion(1);

            expect(question.type).toBe(QuestionType.TEXT_ONLY);
            expect(question.questionText).toBe('Text Q1');

            Math.random = originalRandom;
        });

        it('должен выбирать вопросы из globalQuizzesWithImage (картинка)', async () => {
            mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(newMockLevelData);
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0.5); // 0.5 * 3 = 1.5 -> индекс 1 (первый из Image)

            const question = await quizManager.getRandomGlobalQuestion(1);

            expect(question.type).toBe(QuestionType.TEXT_WITH_IMAGE);
            expect(question.questionText).toBe('Image Q1');
            expect(question.image).toBe('img1.png');

            Math.random = originalRandom;
        });

        it('должен выбирать второй вопрос из globalQuizzesWithImage', async () => {
            mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(newMockLevelData);
            const originalRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0.9); // 0.9 * 3 = 2.7 -> индекс 2 (второй из Image)

            const question = await quizManager.getRandomGlobalQuestion(1);

            expect(question.type).toBe(QuestionType.TEXT_WITH_IMAGE);
            expect(question.questionText).toBe('Image Q2');
            expect(question.image).toBe('img2.png');

            Math.random = originalRandom;
        });
    });
});
