/**
 * Unit тесты для TextAnalyzer
 */

import { findLongestTexts, LongestTexts } from '../../../game/utils/TextAnalyzer';
import { LevelQuestionsData } from '../../../types/questionTypes';

describe('TextAnalyzer', () => {
  describe('analyzeLevelData', () => {
    // Тестируем через findLongestTexts с одним уровнем

    it('должен анализировать miniQuizzes', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Короткий вопрос',
            correctAnswer: 'Ответ',
            feedbacks: ['Фидбэк 1']
          },
          {
            question: 'Самый длинный вопрос в этом уровне',
            correctAnswer: 'Самый длинный ответ',
            feedbacks: ['Самый длинный фидбэк из всех']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Самый длинный вопрос в этом уровне');
      expect(result.answer).toBe('Самый длинный ответ');
      expect(result.feedback).toBe('Самый длинный фидбэк из всех');
      expect(result.maxLength).toBe(34); // Длина "Самый длинный вопрос в этом уровне" (34 символа)
    });

    it('должен анализировать globalQuizzes', () => {
      const levelData: LevelQuestionsData = {
        globalQuizzes: [
          {
            question: 'Вопрос глобальной викторины',
            correctAnswer: 'Глобальный ответ',
            feedbacks: ['Глобальный фидбэк']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Вопрос глобальной викторины');
      expect(result.answer).toBe('Глобальный ответ');
      expect(result.feedback).toBe('Глобальный фидбэк');
    });

    it('должен анализировать globalQuestion', () => {
      const levelData: LevelQuestionsData = {
        globalQuestion: {
          question: 'Глобальный вопрос',
          correctAnswer: 'Глобальный ответ',
          feedbacks: ['Фидбэк 1', 'Фидбэк 2', 'Длинный фидбэк']
        }
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Глобальный вопрос');
      expect(result.answer).toBe('Глобальный ответ');
      expect(result.feedback).toBe('Длинный фидбэк');
    });

    it('должен анализировать globalQuestionWithImage', () => {
      const levelData: LevelQuestionsData = {
        globalQuestionWithImage: {
          question_Sign: {
            text: 'Вопрос с изображением'
          },
          correctAnswer: 'Ответ на вопрос с изображением',
          feedbacks: ['Фидбэк с изображением']
        }
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Вопрос с изображением');
      expect(result.answer).toBe('Ответ на вопрос с изображением');
      expect(result.feedback).toBe('Фидбэк с изображением');
    });

    it('должен анализировать levelWinMessage', () => {
      const levelData: LevelQuestionsData = {
        levelWinMessage: {
          win1: ['Победа 1', 'Длинная победа 1'],
          win2: ['Победа 2'],
          win3: ['Победа 3', 'Самая длинная победа из всех категорий']
        }
      };

      const result = findLongestTexts(levelData);

      // levelWinMessage влияет только на feedbacks
      expect(result.feedback).toBe('Самая длинная победа из всех категорий');
    });

    it('должен обрабатывать вопрос в формате question_Sign для miniQuizzes', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question_Sign: {
              text: 'Вопрос в формате Sign'
            },
            correctAnswer: 'Ответ',
            feedbacks: ['Фидбэк']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Вопрос в формате Sign');
    });

    it('должен обрабатывать вопрос в формате question_Sign для globalQuizzes', () => {
      const levelData: LevelQuestionsData = {
        globalQuizzes: [
          {
            question_Sign: {
              text: 'Глобальный вопрос в формате Sign'
            },
            correctAnswer: 'Ответ',
            feedbacks: ['Фидбэк']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Глобальный вопрос в формате Sign');
    });

    it('должен приоритизировать question над question_Sign', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Обычный вопрос',
            question_Sign: {
              text: 'Вопрос в формате Sign'
            },
            correctAnswer: 'Ответ',
            feedbacks: ['Фидбэк']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      // Если есть question, он должен использоваться
      expect(result.question).toBe('Обычный вопрос');
    });

    it('должен возвращать пустые строки если данных нет', () => {
      const levelData: LevelQuestionsData = {};

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('');
      expect(result.answer).toBe('');
      expect(result.feedback).toBe('');
      expect(result.maxLength).toBe(0);
    });
  });

  describe('findLongestTexts с массивом уровней', () => {
    it('должен находить максимум среди нескольких уровней', () => {
      const level1: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Короткий вопрос',
            correctAnswer: 'Короткий ответ',
            feedbacks: ['Короткий фидбэк']
          }
        ]
      };

      const level2: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Длинный вопрос уровня 2',
            correctAnswer: 'Длинный ответ уровня 2',
            feedbacks: ['Длинный фидбэк уровня 2']
          }
        ]
      };

      const level3: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Самый длинный вопрос из всех уровней',
            correctAnswer: 'Средний ответ',
            feedbacks: ['Средний фидбэк']
          }
        ]
      };

      const result = findLongestTexts([level1, level2, level3]);

      expect(result.question).toBe('Самый длинный вопрос из всех уровней');
      expect(result.answer).toBe('Длинный ответ уровня 2');
      expect(result.feedback).toBe('Длинный фидбэк уровня 2');
    });

    it('должен обрабатывать пустой массив', () => {
      const result = findLongestTexts([]);

      expect(result.question).toBe('');
      expect(result.answer).toBe('');
      expect(result.feedback).toBe('');
      expect(result.maxLength).toBe(0);
    });

    it('должен обрабатывать массив с одним уровнем', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Одиночный вопрос',
            correctAnswer: 'Одиночный ответ',
            feedbacks: ['Одиночный фидбэк']
          }
        ]
      };

      const result = findLongestTexts([levelData]);

      expect(result.question).toBe('Одиночный вопрос');
      expect(result.answer).toBe('Одиночный ответ');
      expect(result.feedback).toBe('Одиночный фидбэк');
    });

    it('должен корректно вычислять maxLength', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Вопрос из 10 символов',
            correctAnswer: 'Ответ из 6',
            feedbacks: ['Фидбэк из 20 символов!!!!']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.maxLength).toBe(25); // Длина "Вопрос из 10 символов" (25 символов)
    });
  });

  describe('Краевые условия', () => {
    it('должен обрабатывать пустые строки', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: '',
            correctAnswer: '',
            feedbacks: ['', '', '']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('');
      expect(result.answer).toBe('');
      expect(result.feedback).toBe('');
      expect(result.maxLength).toBe(0);
    });

    it('должен обрабатывать null и undefined значения', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: undefined as any,
            correctAnswer: null as any,
            feedbacks: undefined as any
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('');
      expect(result.answer).toBe('');
      expect(result.feedback).toBe('');
    });

    it('должен обрабатывать пустой массив miniQuizzes', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: []
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('');
      expect(result.answer).toBe('');
      expect(result.feedback).toBe('');
    });

    it('должен обрабатывать пустой массив feedbacks', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Вопрос',
            correctAnswer: 'Ответ',
            feedbacks: []
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Вопрос');
      expect(result.answer).toBe('Ответ');
      expect(result.feedback).toBe('');
    });

    it('должен обрабатывать null в feedbacks', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Вопрос',
            correctAnswer: 'Ответ',
            feedbacks: [null, null, 'Нормальный фидбэк', null] as any
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.feedback).toBe('Нормальный фидбэк');
    });
  });

  describe('Смешанные сценарии', () => {
    it('должен анализировать все типы данных одновременно', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Mini вопрос',
            correctAnswer: 'Mini ответ',
            feedbacks: ['Mini фидбэк']
          }
        ],
        globalQuizzes: [
          {
            question: 'Глобальный вопрос длиннее',
            correctAnswer: 'Глобальный ответ',
            feedbacks: ['Глобальный фидбэк']
          }
        ],
        globalQuestion: {
          question: 'Ещё более длинный глобальный вопрос',
          correctAnswer: 'Ответ',
          feedbacks: ['Фидбэк']
        },
        levelWinMessage: {
          win1: ['Победа'],
          win2: ['Очень длинное сообщение победы категории win2'],
          win3: ['Победа']
        }
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Ещё более длинный глобальный вопрос');
      expect(result.feedback).toBe('Очень длинное сообщение победы категории win2');
    });

    it('должн корректно обрабатывать комбинацию question и question_Sign', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question_Sign: {
              text: 'Вопрос Sign короче'
            }
          }
        ],
        globalQuizzes: [
          {
            question: 'Обычный вопрос длиннее Sign',
            correctAnswer: 'Ответ',
            feedbacks: ['Фидбэк']
          }
        ]
      };

      const result = findLongestTexts(levelData);

      expect(result.question).toBe('Обычный вопрос длиннее Sign');
    });
  });

  describe('Интеграционные сценарии', () => {
    it('должен работать с реалистичными данными уровня', () => {
      const levelData: LevelQuestionsData = {
        miniQuizzes: [
          {
            question: 'Какая планета известна как "Красная планета"?',
            correctAnswer: 'Марс',
            feedbacks: [
              'Правильно! Марс известен своим красным цветом из-за оксида железа в почве.',
              'Неправильно. Правильный ответ: Марс.'
            ]
          },
          {
            question: 'Какая столица Франции?',
            correctAnswer: 'Париж',
            feedbacks: [
              'Верно! Париж — столица Франции.',
              'Неверно. Правильный ответ: Париж.'
            ]
          }
        ],
        globalQuestion: {
          question: 'Какое животное известно как "король джунглей"?',
          correctAnswer: 'Лев',
          feedbacks: [
            'Правильно! Лев называют королём джунглей.',
            'Неправильно. Правильный ответ: Лев.'
          ]
        },
        levelWinMessage: {
          win1: ['Отличная работа! Ты прошёл уровень!'],
          win2: ['Превосходно! Все ответы правильные!'],
          win3: ['Фантастика! Ты настоящий знаток!']
        }
      };

      const result = findLongestTexts(levelData);

      expect(result.question.length).toBeGreaterThan(0);
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.maxLength).toBeGreaterThan(0);

      // Проверяем что нашли действительно самый длинный текст
      expect(result.maxLength).toBeGreaterThanOrEqual(result.question.length);
      expect(result.maxLength).toBeGreaterThanOrEqual(result.answer.length);
      expect(result.maxLength).toBeGreaterThanOrEqual(result.feedback.length);
    });
  });
});
