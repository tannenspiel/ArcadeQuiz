/**
 * Unit тесты для QuizManager
 */

import { QuizManager } from '../../../game/systems/QuizManager';
import { AssetLoader } from '../../../game/core/AssetLoader';
import { LevelQuestionsData, QuestionType } from '../../../types/questionTypes';

// Моки
jest.mock('../../../game/core/AssetLoader');

describe('QuizManager', () => {
  let mockAssetLoader: jest.Mocked<AssetLoader>;
  let quizManager: QuizManager;

  const mockLevelData: LevelQuestionsData = {
    category: 'Test Level',
    gameWinMessage: {
      win1: ['Win with 1 life'],
      win2: ['Win with 2 lives'],
      win3: ['Win with 3 lives']
    },
    levelWinMessage: {
      win1: ['Level complete with 1 life'],
      win2: ['Level complete with 2 lives'],
      win3: ['Level complete with 3 lives']
    },
    miniQuizzes: [
      {
        question: 'What is 2+2?',
        correctAnswer: '4',
        wrongAnswers: ['3', '5'],
        feedbacks: ['Correct!'],
        wrongFeedbacks: ['Wrong!']
      },
      {
        question: 'What is the capital of France?',
        correctAnswer: 'Paris',
        wrongAnswers: ['London', 'Berlin'],
        feedbacks: ['Correct!'],
        wrongFeedbacks: ['Wrong!']
      }
    ],
    globalQuestion: {
      question: 'Global question?',
      correctAnswer: 'Answer A',
      wrongAnswers: ['Answer B', 'Answer C'],
      feedbacks: ['Correct!'],
      wrongFeedbacks: ['Wrong!']
    },
    globalQuestionWithImage: {
      question_Sign: {
        text: 'Question with image?',
        image: 'test.png'
      },
      correctAnswer: 'Answer A',
      wrongAnswers: ['Answer B'],
      feedbacks: ['Correct!'],
      wrongFeedbacks: ['Wrong!']
    }
  };

  beforeEach(() => {
    mockAssetLoader = {
      loadJSON: jest.fn()
    } as any;

    quizManager = new QuizManager(mockAssetLoader);
  });

  describe('Загрузка вопросов', () => {
    it('должен загружать вопросы уровня через AssetLoader', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      const result = await quizManager.loadLevelQuestions(1);

      expect(mockAssetLoader.loadJSON).toHaveBeenCalledWith(
        'questions/level1.questions.json'
      );
      expect(result).toEqual(mockLevelData);
    });

    it('должен кэшировать загруженные вопросы', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      await quizManager.loadLevelQuestions(1);
      await quizManager.loadLevelQuestions(1);

      expect(mockAssetLoader.loadJSON).toHaveBeenCalledTimes(1);
    });

    it('должен выбрасывать ошибку при неудачной загрузке', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockRejectedValue(new Error('Load failed'));

      await expect(quizManager.loadLevelQuestions(1)).rejects.toThrow('Load failed');
    });
  });

  describe('Получение мини-квизов', () => {
    beforeEach(async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);
    });

    it('должен возвращать случайный мини-квиз', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // Выберет первый вопрос

      const quiz = await quizManager.getRandomMiniQuiz(1);

      expect(quiz.questionText).toBe('What is 2+2?');
      expect(quiz.correctAnswer).toBe('4');
      expect(quiz.type).toBe(QuestionType.TEXT_ONLY);

      Math.random = originalRandom;
    });

    it('должен перемешивать ответы', async () => {
      // Мокаем Math.random чтобы гарантированно выбрать первый вопрос (математический)
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // Малый индекс выберет первый вопрос

      const quiz = await quizManager.getRandomMiniQuiz(1);

      // Проверяем, что все ответы из математического вопроса присутствуют
      expect(quiz.allAnswers).toContain('4');
      expect(quiz.allAnswers).toContain('3');
      expect(quiz.allAnswers).toContain('5');
      expect(quiz.allAnswers.length).toBe(3);
      // Проверяем, что правильный ответ есть в списке
      expect(quiz.allAnswers).toContain(quiz.correctAnswer);

      Math.random = originalRandom;
    });
  });

  describe('Получение глобальных вопросов', () => {
    beforeEach(async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);
    });

    it('должен возвращать случайный глобальный вопрос', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // Выберет текстовый вопрос

      const question = await quizManager.getRandomGlobalQuestion(1);

      expect(question.questionText).toBe('Global question?');
      expect(question.correctAnswer).toBe('Answer A');

      Math.random = originalRandom;
    });

    it('должен возвращать вопрос с изображением, если выбран', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.8); // Выберет вопрос с изображением

      const question = await quizManager.getRandomGlobalQuestion(1);

      expect(question.type).toBe(QuestionType.TEXT_WITH_IMAGE);
      expect(question.image).toBe('test.png');

      Math.random = originalRandom;
    });

    it('должен возвращать fallback вопрос при отсутствии глобальных вопросов', async () => {
      const levelDataWithoutGlobal = {
        ...mockLevelData,
        globalQuestion: undefined,
        globalQuestionWithImage: undefined
      };
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(levelDataWithoutGlobal);

      const question = await quizManager.getRandomGlobalQuestion(1);

      expect(question.questionText).toBe('What is the capital of France?');
      expect(question.correctAnswer).toBe('Paris');
    });

    it('должен использовать getGlobalQuestion как алиас для getRandomGlobalQuestion', async () => {
      const question1 = await quizManager.getGlobalQuestion(1);
      const question2 = await quizManager.getRandomGlobalQuestion(1);

      // Оба метода должны работать одинаково
      expect(question1).toBeDefined();
      expect(question2).toBeDefined();
    });
  });

  describe('Парсинг вопросов', () => {
    it('должен парсить текстовый вопрос', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);
      
      // Мокаем Math.random чтобы получить первый вопрос
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Малый индекс

      const quiz = await quizManager.getRandomMiniQuiz(1);

      expect(quiz.type).toBe(QuestionType.TEXT_ONLY);
      // Проверяем, что вопрос соответствует одному из ожидаемых
      expect(['What is 2+2?', 'What is the capital of France?']).toContain(quiz.questionText);
      expect(quiz.image).toBeUndefined();
      
      // Восстанавливаем Math.random
      Math.random = originalRandom;
    });

    it('должен парсить вопрос с изображением', async () => {
      const levelDataWithImage = {
        ...mockLevelData,
        miniQuizzes: [
          {
            question_Sign: {
              text: 'What is shown?',
              image: 'test.png'
            },
            correctAnswer: 'Answer',
            wrongAnswers: ['Wrong'],
            feedbacks: ['Correct!'],
            wrongFeedbacks: ['Wrong!']
          }
        ]
      };
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(levelDataWithImage);

      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      const quiz = await quizManager.getRandomMiniQuiz(1);

      expect(quiz.type).toBe(QuestionType.TEXT_WITH_IMAGE);
      expect(quiz.questionText).toBe('What is shown?');
      expect(quiz.image).toBe('test.png');

      Math.random = originalRandom;
    });
  });

  describe('Победные сообщения', () => {
    beforeEach(async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);
    });

    it('должен возвращать сообщение для 3 жизней', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      const message = await quizManager.getWinMessages(1, 3);

      expect(message).toBe('Level complete with 3 lives');

      Math.random = originalRandom;
    });

    it('должен возвращать сообщение для 2 жизней', async () => {
      const message = await quizManager.getWinMessages(1, 2);
      expect(message).toBe('Level complete with 2 lives');
    });

    it('должен возвращать сообщение для 1 жизни', async () => {
      const message = await quizManager.getWinMessages(1, 1);
      expect(message).toBe('Level complete with 1 life');
    });
  });

  describe('Очистка кэша', () => {
    it('должен очищать кэш загруженных вопросов', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      await quizManager.loadLevelQuestions(1);
      quizManager.clearCache();
      await quizManager.loadLevelQuestions(1);

      expect(mockAssetLoader.loadJSON).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLongestTexts', () => {
    it('должен использовать fallback на анализ текущего уровня, если константы дефолтные', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      await quizManager.loadLevelQuestions(1);
      const result = quizManager.getLongestTexts(1);

      expect(result).toBeDefined();
      expect(result.question).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.maxLength).toBeGreaterThan(0);
      // Проверяем, что результат содержит тексты из mockLevelData
      expect(result.question.length).toBeGreaterThan(0);
      expect(result.answer.length).toBeGreaterThan(0);
    });

    it('должен использовать level1 как fallback, если levelNumber не передан', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      await quizManager.loadLevelQuestions(1);
      const result = quizManager.getLongestTexts();

      expect(result).toBeDefined();
      expect(result.question).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.feedback).toBeDefined();
    });

    it('должен кешировать результат', async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelData);

      await quizManager.loadLevelQuestions(1);
      const result1 = quizManager.getLongestTexts(1);
      const result2 = quizManager.getLongestTexts(1);

      // Должен вернуть тот же объект (кешированный)
      expect(result1).toBe(result2);
    });
  });

  // ================================================
  // ✅ НОВОЕ: Тесты системы уникальности вопросов
  // ================================================

  describe('Система уникальности вопросов (getUniqueMiniQuiz)', () => {
    const mockLevelDataWithMultipleQuestions: LevelQuestionsData = {
      category: 'Test Level',
      gameWinMessage: {
        win1: ['Win with 1 life'],
        win2: ['Win with 2 lives'],
        win3: ['Win with 3 lives']
      },
      levelWinMessage: {
        win1: ['Level complete with 1 life'],
        win2: ['Level complete with 2 lives'],
        win3: ['Level complete with 3 lives']
      },
      miniQuizzes: [
        {
          question: 'Question 1',
          correctAnswer: 'Answer 1',
          wrongAnswers: ['Wrong 1'],
          feedbacks: ['Correct!'],
          wrongFeedbacks: ['Wrong!']
        },
        {
          question: 'Question 2',
          correctAnswer: 'Answer 2',
          wrongAnswers: ['Wrong 2'],
          feedbacks: ['Correct!'],
          wrongFeedbacks: ['Wrong!']
        },
        {
          question: 'Question 3',
          correctAnswer: 'Answer 3',
          wrongAnswers: ['Wrong 3'],
          feedbacks: ['Correct!'],
          wrongFeedbacks: ['Wrong!']
        }
      ],
      globalQuestion: {
        question: 'Global question?',
        correctAnswer: 'Answer A',
        wrongAnswers: ['Answer B', 'Answer C'],
        feedbacks: ['Correct!'],
        wrongFeedbacks: ['Wrong!']
      }
    };

    beforeEach(async () => {
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(mockLevelDataWithMultipleQuestions);
    });

    it('должен возвращать вопрос, не входящий в список исключённых', async () => {
      const excludedTexts = ['Question 1', 'Question 2'];
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // Выберет первый из доступных (Question 3)

      const quiz = await quizManager.getUniqueMiniQuiz(1, excludedTexts);

      expect(quiz.questionText).toBe('Question 3');
      expect(excludedTexts).not.toContain(quiz.questionText);

      Math.random = originalRandom;
    });

    it('должен возвращать случайный вопрос, когда все вопросы исключены (fallback)', async () => {
      const excludedTexts = ['Question 1', 'Question 2', 'Question 3'];
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      const quiz = await quizManager.getUniqueMiniQuiz(1, excludedTexts);

      // Должен вернуть какой-то вопрос из полного списка (fallback)
      expect(['Question 1', 'Question 2', 'Question 3']).toContain(quiz.questionText);

      Math.random = originalRandom;
    });

    it('должен возвращать разные вопросы при последовательных вызовах с разным excludedTexts', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      const quiz1 = await quizManager.getUniqueMiniQuiz(1, []);
      const quiz2 = await quizManager.getUniqueMiniQuiz(1, [quiz1.questionText]);
      const quiz3 = await quizManager.getUniqueMiniQuiz(1, [quiz1.questionText, quiz2.questionText]);

      // Все три вопроса должны быть разными
      expect(quiz1.questionText).not.toBe(quiz2.questionText);
      expect(quiz2.questionText).not.toBe(quiz3.questionText);
      expect(quiz1.questionText).not.toBe(quiz3.questionText);

      // Совокупность должна содержать все три вопроса
      const allQuestions = [quiz1.questionText, quiz2.questionText, quiz3.questionText];
      expect(allQuestions).toContain('Question 1');
      expect(allQuestions).toContain('Question 2');
      expect(allQuestions).toContain('Question 3');

      Math.random = originalRandom;
    });

    it('должен работать с вопросами, имеющими изображения', async () => {
      const levelWithImageQuestions: LevelQuestionsData = {
        ...mockLevelDataWithMultipleQuestions,
        miniQuizzes: [
          {
            question_Sign: {
              text: 'Image Question 1',
              image: 'test1.png'
            },
            correctAnswer: 'Answer 1',
            wrongAnswers: ['Wrong 1'],
            feedbacks: ['Correct!'],
            wrongFeedbacks: ['Wrong!']
          },
          {
            question_Sign: {
              text: 'Image Question 2',
              image: 'test2.png'
            },
            correctAnswer: 'Answer 2',
            wrongAnswers: ['Wrong 2'],
            feedbacks: ['Correct!'],
            wrongFeedbacks: ['Wrong!']
          }
        ]
      };
      mockAssetLoader.loadJSON = jest.fn().mockResolvedValue(levelWithImageQuestions);

      const excludedTexts = ['Image Question 1'];
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      const quiz = await quizManager.getUniqueMiniQuiz(1, excludedTexts);

      expect(quiz.questionText).toBe('Image Question 2');
      expect(quiz.image).toBe('test2.png');
      expect(excludedTexts).not.toContain(quiz.questionText);

      Math.random = originalRandom;
    });
  });

  describe('Система уникальности утверждений монеток (getUniqueCoinStatements)', () => {
    const mockCoinQuizData = {
      true: [
        { text: 'True Statement 1' },
        { text: 'True Statement 2' },
        { text: 'True Statement 3' }
      ],
      false: [
        { text: 'False Statement 1' },
        { text: 'False Statement 2' },
        { text: 'False Statement 3' }
      ]
    };

    beforeEach(() => {
      // Мокаем загрузку coin-quiz
      mockAssetLoader.loadJSON = jest.fn().mockImplementation((path: string) => {
        if (path.includes('coin-quiz')) {
          return Promise.resolve(mockCoinQuizData);
        }
        return Promise.resolve(mockLevelData);
      });
    });

    it('должен возвращать утверждения, не входящие в списки использованных', async () => {
      const usedTrueTexts = ['True Statement 1'];
      const usedFalseTexts = ['False Statement 1'];

      const statements = await quizManager.getUniqueCoinStatements(1, usedTrueTexts, usedFalseTexts);

      expect(['True Statement 2', 'True Statement 3']).toContain(statements.true);
      expect(['False Statement 2', 'False Statement 3']).toContain(statements.false);
    });

    it('должен возвращать случайные утверждения при использовании всех (fallback)', async () => {
      const usedTrueTexts = ['True Statement 1', 'True Statement 2', 'True Statement 3'];
      const usedFalseTexts = ['False Statement 1', 'False Statement 2', 'False Statement 3'];

      const statements = await quizManager.getUniqueCoinStatements(1, usedTrueTexts, usedFalseTexts);

      // Должен вернуть какие-то утверждения из полных списков
      expect(['True Statement 1', 'True Statement 2', 'True Statement 3']).toContain(statements.true);
      expect(['False Statement 1', 'False Statement 2', 'False Statement 3']).toContain(statements.false);
    });

    it('должен возвращать разные утверждения при последовательных вызовах', async () => {
      const statements1 = await quizManager.getUniqueCoinStatements(1, [], []);
      const statements2 = await quizManager.getUniqueCoinStatements(1, [statements1.true], [statements1.false]);
      const statements3 = await quizManager.getUniqueCoinStatements(1,
        [statements1.true, statements2.true],
        [statements1.false, statements2.false]
      );

      // Все true утверждения должны быть разными
      expect(statements1.true).not.toBe(statements2.true);
      expect(statements2.true).not.toBe(statements3.true);
      expect(statements1.true).not.toBe(statements3.true);

      // Все false утверждения должны быть разными
      expect(statements1.false).not.toBe(statements2.false);
      expect(statements2.false).not.toBe(statements3.false);
      expect(statements1.false).not.toBe(statements3.false);
    });
  });
});


