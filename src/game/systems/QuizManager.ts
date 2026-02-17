/**
 * Менеджер вопросов
 * Загружает и управляет вопросами из JSON файлов
 */

import { LevelQuestionsData, QuestionData, ParsedQuestion, QuestionType, FeedbacksData } from '../../types/questionTypes';
import { AssetLoader } from '../core/AssetLoader';
import { findLongestTexts, LongestTexts } from '../utils/TextAnalyzer';
import { LONGEST_TEXTS } from '../../constants/textLengths';
import { logger } from '../../utils/Logger';
import { REWARD } from '../../constants/scoreConstants';

// ================================================
// ✅ НОВОЕ: Coin Statements Types
// ================================================

export interface CoinStatement {
  text: string;
}

export interface CoinQuizData {
  true: CoinStatement[];
  false: CoinStatement[];
}

export interface QuizStatements {
  true: string;
  false: string;
}

export class QuizManager {
  private assetLoader: AssetLoader;
  private loadedQuestions: Map<number, LevelQuestionsData> = new Map();
  private longestTextsCache: LongestTexts | null = null;
  private feedbacksCache: FeedbacksData | null = null; // ✅ НОВОЕ: кеш для общих фидбэков

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }

  /**
   * Загрузить вопросы для уровня
   */
  public async loadLevelQuestions(levelNumber: number): Promise<LevelQuestionsData> {
    if (this.loadedQuestions.has(levelNumber)) {
      return this.loadedQuestions.get(levelNumber)!;
    }

    try {
      const questions = await this.assetLoader.loadJSON<LevelQuestionsData>(
        `questions/level${levelNumber}.questions.json`
      );
      this.loadedQuestions.set(levelNumber, questions);
      return questions;
    } catch (error) {
      console.error(`Failed to load questions for level ${levelNumber}`, error);
      throw error;
    }
  }

  /**
   * ✅ НОВОЕ: Загрузить общие фидбэки игры (gameWinMessage.json)
   */
  public async loadFeedbacks(): Promise<FeedbacksData> {
    if (this.feedbacksCache) {
      return this.feedbacksCache;
    }

    try {
      const feedbacks = await this.assetLoader.loadJSON<FeedbacksData>(
        'questions/gameWinMessage.json'
      );
      this.feedbacksCache = feedbacks;
      return feedbacks;
    } catch (error) {
      console.error('Failed to load gameWinMessage.json', error);
      throw error;
    }
  }

  /**
   * Получить случайный мини-квиз для ключа
   */
  public async getRandomMiniQuiz(levelNumber: number): Promise<ParsedQuestion> {
    const levelData = await this.loadLevelQuestions(levelNumber);
    const randomIndex = Math.floor(Math.random() * levelData.miniQuizzes.length);
    const question = levelData.miniQuizzes[randomIndex];
    return this.parseQuestion(question);
  }

  /**
   * Получить уникальный мини-квиз для ключа, исключая уже существующие на карте
   * @param levelNumber Номер уровня
   * @param excludedTexts Тексты вопросов, которые уже заняты другими ключами
   */
  public async getUniqueMiniQuiz(levelNumber: number, excludedTexts: string[]): Promise<ParsedQuestion> {
    const levelData = await this.loadLevelQuestions(levelNumber);

    // Фильтруем список вопросов, исключая те, что уже есть на карте
    const availableQuizzes = levelData.miniQuizzes.filter(quiz => {
      const text = 'question' in quiz ? quiz.question : quiz.question_Sign.text;
      return !excludedTexts.includes(text);
    });

    // Если уникальные вопросы закончились, берем любой случайный из основного списка
    if (availableQuizzes.length === 0) {
      logger.log('QUIZ', `QuizManager: No unique quizzes left, falling back to random. (Excluded: ${excludedTexts.length})`);
      return this.getRandomMiniQuiz(levelNumber);
    }

    // Выбираем случайный из доступных уникальных
    const randomIndex = Math.floor(Math.random() * availableQuizzes.length);
    const question = availableQuizzes[randomIndex];

    return this.parseQuestion(question);
  }

  // ================================================
  // ✅ НОВОЕ: Coin Statements Management
  // ================================================

  /**
   * Получить уникальные утверждения для монетки, исключая уже использованные
   * @param levelNumber Номер уровня
   * @param usedTrueTexts Список уже использованных true-утверждений
   * @param usedFalseTexts Список уже использованных false-утверждений
   */
  public async getUniqueCoinStatements(
    levelNumber: number,
    usedTrueTexts: string[],
    usedFalseTexts: string[]
  ): Promise<QuizStatements> {
    try {
      const data = await this.assetLoader.loadJSON<CoinQuizData>(
        `questions/level${levelNumber}.coin-quiz.json`
      );

      // Фильтруем true-утверждения
      const availableTrue = data.true.filter(stmt => !usedTrueTexts.includes(stmt.text));
      const availableFalse = data.false.filter(stmt => !usedFalseTexts.includes(stmt.text));

      // Если уникальные утверждения закончились, возвращаем случайные из полного списка
      if (availableTrue.length === 0) {
        logger.log('QUIZ', `QuizManager: No unique true statements left, using random. (Used: ${usedTrueTexts.length})`);
        const randomTrue = data.true[Math.floor(Math.random() * data.true.length)];
        return {
          true: randomTrue?.text || '2 + 2 = 4',
          false: this.getUniqueFalseStatement(data.false, usedFalseTexts)
        };
      }

      if (availableFalse.length === 0) {
        logger.log('QUIZ', `QuizManager: No unique false statements left, using random. (Used: ${usedFalseTexts.length})`);
        const randomFalse = data.false[Math.floor(Math.random() * data.false.length)];
        return {
          true: this.getUniqueTrueStatement(data.true, usedTrueTexts),
          false: randomFalse?.text || '2 + 2 = 5'
        };
      }

      // Выбираем случайные из доступных уникальных
      const selectedTrue = availableTrue[Math.floor(Math.random() * availableTrue.length)];
      const selectedFalse = availableFalse[Math.floor(Math.random() * availableFalse.length)];

      logger.log('QUIZ', `QuizManager: Selected unique coin statements`, {
        true: selectedTrue.text,
        false: selectedFalse.text,
        remainingTrue: availableTrue.length - 1,
        remainingFalse: availableFalse.length - 1
      });

      return {
        true: selectedTrue.text,
        false: selectedFalse.text
      };
    } catch (error) {
      logger.error('QUIZ', `Failed to load coin statements for level ${levelNumber}`, error);
      // Fallback statements
      return {
        true: '2 + 2 = 4',
        false: '2 + 2 = 5'
      };
    }
  }

  /**
   * Получить уникальное true-утверждение (вспомогательный метод)
   */
  private getUniqueTrueStatement(allTrue: CoinStatement[], usedTexts: string[]): string {
    const available = allTrue.filter(stmt => !usedTexts.includes(stmt.text));
    if (available.length === 0) {
      return allTrue[Math.floor(Math.random() * allTrue.length)]?.text || '2 + 2 = 4';
    }
    return available[Math.floor(Math.random() * available.length)].text;
  }

  /**
   * Получить уникальное false-утверждение (вспомогательный метод)
   */
  private getUniqueFalseStatement(allFalse: CoinStatement[], usedTexts: string[]): string {
    const available = allFalse.filter(stmt => !usedTexts.includes(stmt.text));
    if (available.length === 0) {
      return allFalse[Math.floor(Math.random() * allFalse.length)]?.text || '2 + 2 = 5';
    }
    return available[Math.floor(Math.random() * available.length)].text;
  }

  /**
   * Получить случайный глобальный вопрос для порталов
   */
  public async getRandomGlobalQuestion(levelNumber: number): Promise<ParsedQuestion> {
    try {
      const levelData = await this.loadLevelQuestions(levelNumber);

      // ✅ Создаем массив ВСЕХ возможных глобальных вопросов
      const globalQuestions: ParsedQuestion[] = [];
      const forcedQuestions: ParsedQuestion[] = []; // Вопросы с меткой _force

      // 1. Добавляем вопросы из массива globalQuizzes (если есть) - приоритет
      if (levelData.globalQuizzes && levelData.globalQuizzes.length > 0) {
        levelData.globalQuizzes.forEach(question => {
          const parsed = this.parseQuestion(question);
          // ✅ Проверяем метку _force в вопросе
          if ((question as any)._force === true) {
            forcedQuestions.push(parsed);
            logger.log('QUIZ', '🎯 Found forced question (globalQuizzes):', parsed.questionText?.substring(0, 30));
          } else {
            globalQuestions.push(parsed);
          }
        });
      }

      // 2. Добавляем вопросы с изображениями из массива globalQuizzesWithImage
      if (levelData.globalQuizzesWithImage && levelData.globalQuizzesWithImage.length > 0) {
        levelData.globalQuizzesWithImage.forEach(question => {
          const parsed = this.parseQuestion(question);
          if ((question as any)._force === true) {
            forcedQuestions.push(parsed);
            logger.log('QUIZ', '🎯 Found forced question (globalQuizzesWithImage):', parsed.questionText);
          } else {
            globalQuestions.push(parsed);
          }
        });
      }

      // ✅ Случайно выбираем один из глобальных вопросов
      // Приоритет: сначала вопросы с меткой _force, потом случайные
      if (forcedQuestions.length > 0) {
        logger.log('QUIZ', `🎯 Using forced question (${forcedQuestions.length} available)`);
        // Если несколько forced вопросов, выбираем случайный из них
        const randomIndex = Math.floor(Math.random() * forcedQuestions.length);
        return forcedQuestions[randomIndex];
      }

      if (!globalQuestions || globalQuestions.length === 0) {
        console.warn('⚠️ QuizManager: No global questions found for level', levelNumber);
        // Return fallback question instead of throwing
        return this.getFallbackQuestion();
      }

      const randomIndex = Math.floor(Math.random() * globalQuestions.length);
      return globalQuestions[randomIndex];

    } catch (error) {
      console.error('Failed to load random global question:', error);
      return this.getFallbackQuestion();
    }
  }

  /**
   * Get fallback question when no questions are available
   */
  private getFallbackQuestion(): ParsedQuestion {
    return {
      type: QuestionType.TEXT_ONLY,
      questionText: 'What is the capital of France?',
      image: undefined,
      correctAnswer: 'Paris',
      wrongAnswers: ['London', 'Berlin'],
      allAnswers: ['Paris', 'London', 'Berlin'].sort(() => Math.random() - 0.5),
      feedbacks: ['Correct! Paris is the capital of France!'],
      wrongFeedbacks: ['Try again!']
    };
  }

  /**
   * Получить глобальный вопрос для порталов (обратная совместимость)
   */
  public async getGlobalQuestion(levelNumber: number): Promise<ParsedQuestion> {
    // Для обратной совместимости используем случайный выбор
    return this.getRandomGlobalQuestion(levelNumber);
  }

  /**
   * Парсинг вопроса в унифицированный формат
   */
  private parseQuestion(question: QuestionData): ParsedQuestion {
    let type: QuestionType;
    let questionText: string;
    let image: string | undefined;

    // Определяем тип вопроса
    if ('question_Sign' in question) {
      type = QuestionType.TEXT_WITH_IMAGE;
      questionText = question.question_Sign.text;
      image = question.question_Sign.image;
    } else {
      type = QuestionType.TEXT_ONLY;
      questionText = question.question;
    }

    // Перемешиваем ответы
    const allAnswers = [
      question.correctAnswer,
      ...question.wrongAnswers
    ];
    const shuffledAnswers = this.shuffleArray([...allAnswers]);

    // Находим индекс правильного ответа после перемешивания
    const correctIndex = shuffledAnswers.indexOf(question.correctAnswer);

    return {
      type,
      questionText,
      image,
      correctAnswer: question.correctAnswer,
      wrongAnswers: question.wrongAnswers,
      allAnswers: shuffledAnswers,
      feedbacks: question.feedbacks,
      wrongFeedbacks: question.wrongFeedbacks
    };
  }

  /**
   * Перемешать массив
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * ✅ v2 - Рассчитать максимально возможный балл для уровня
   * Учитываются УНИКАЛЬНЫЕ вопросы ключей + УНИКАЛЬНЫЕ утверждения монеток + портал
   *
   * Формула:
   * - Ключи: min(initialKeysCount, uniqueQuestionsCount) × 5 + max(0, initialKeysCount - uniqueQuestionsCount) × 2
   * - Монетки: min(initialCoinsCount, uniqueStatementsCount) × 5 + max(0, initialCoinsCount - uniqueStatementsCount) × 2
   * - Портал: 10
   *
   * @param levelNumber Номер уровня
   * @param initialKeysCount Начальное количество ключей на карте
   * @param initialCoinsCount Начальное количество монеток на карте (для coin phase)
   */
  public async calculateMaxPossibleScore(
    levelNumber: number,
    initialKeysCount: number,
    initialCoinsCount: number = 0  // ✅ НОВОЕ
  ): Promise<number> {
    const levelData = await this.loadLevelQuestions(levelNumber);

    // ================================================
    // Очки за ключи
    // ================================================
    const uniqueQuestionsCount = levelData.miniQuizzes.length;
    const uniqueKeyPointsCount = Math.min(initialKeysCount, uniqueQuestionsCount);
    const repeatKeyPointsCount = Math.max(0, initialKeysCount - uniqueQuestionsCount);

    // ✅ v4: Обновленные множители: 5 за уникальный ключ, 3 за повторный
    const scoreFromKeys = (uniqueKeyPointsCount * REWARD.KEY_UNIQUE) + (repeatKeyPointsCount * REWARD.KEY_REPEAT);

    // ================================================
    // ✅ НОВОЕ: Очки за монетки
    // ================================================
    // Загружаем данные об утверждениях монеток
    const coinData = await this.assetLoader.loadJSON<CoinQuizData>(`questions/level${levelNumber}.coin-quiz.json`);
    const uniqueTrueStatements = coinData.true?.length || 0;
    const uniqueFalseStatements = coinData.false?.length || 0;
    const uniqueStatementsCount = uniqueTrueStatements + uniqueFalseStatements;

    const uniqueCoinPointsCount = Math.min(initialCoinsCount, uniqueStatementsCount);
    const repeatCoinPointsCount = Math.max(0, initialCoinsCount - uniqueStatementsCount);

    // ✅ v4: 3 за уникальную монетку, 2 за повторную
    const scoreFromCoins = (uniqueCoinPointsCount * REWARD.COIN_UNIQUE) + (repeatCoinPointsCount * REWARD.COIN_REPEAT);

    // ================================================
    // Очки за портал
    // ================================================
    const portalPoints = REWARD.PORTAL_CORRECT;

    const totalScore = scoreFromKeys + scoreFromCoins + portalPoints;

    logger.log('QUIZ', `📊 Max possible score calculation for level ${levelNumber}:`, {
      keys: { initial: initialKeysCount, unique: uniqueKeyPointsCount, repeat: repeatKeyPointsCount, score: scoreFromKeys },
      coins: { initial: initialCoinsCount, unique: uniqueCoinPointsCount, repeat: repeatCoinPointsCount, score: scoreFromCoins },
      portal: portalPoints,
      total: totalScore
    });

    return totalScore;
  }

  /**
   * Получить уровневые/игровые сообщения на основе процента успеха
   */
  public async getTieredWinMessage(
    levelNumber: number,
    percentage: number,
    type: 'level' | 'game'
  ): Promise<string> {
    let messages;

    if (type === 'game') {
      // ✅ НОВОЕ: Загружаем общие фидбэки из feedbacks.json
      const feedbacks = await this.loadFeedbacks();
      messages = feedbacks.gameWinMessage;
    } else {
      // levelWinMessage остается в файлах уровней (тематические фидбэки)
      const levelData = await this.loadLevelQuestions(levelNumber);
      messages = levelData.levelWinMessage;
    }

    let selectedTier: string[];

    if (percentage >= 100) {
      selectedTier = messages.win3; // 100%
    } else if (percentage >= 50) {
      selectedTier = messages.win2; // >= 50%
    } else {
      selectedTier = messages.win1; // < 50%
    }

    // Возвращаем случайное сообщение из выбранного тира
    return selectedTier[Math.floor(Math.random() * selectedTier.length)];
  }

  /**
   * ✅ НОВОЕ: Получить сообщение при проигрыше (Game Over)
   */
  public async getGameOverMessage(levelNumber: number): Promise<string> {
    try {
      const levelData = await this.loadLevelQuestions(levelNumber);
      const messages = levelData.levelWinMessage.gameover;

      if (messages && messages.length > 0) {
        return messages[Math.floor(Math.random() * messages.length)];
      }

      logger.warn('QUIZ', `No gameover messages found for level ${levelNumber}, using default.`);
      return "Game Over!";
    } catch (error) {
      logger.error('QUIZ', `Failed to load gameover message for level ${levelNumber}`, error);
      return "Game Over!";
    }
  }

  /**
   * Получить победные сообщения для уровня (устаревший метод, оставлен для совместимости)
   */
  public async getWinMessages(levelNumber: number, livesRemaining: number): Promise<string> {
    // Используем упрощенную логику для обратной совместимости
    const percentage = livesRemaining >= 3 ? 100 : (livesRemaining === 2 ? 66 : 33);
    return this.getTieredWinMessage(levelNumber, percentage, 'level');
  }

  /**
   * Очистить кеш
   */
  public clearCache(): void {
    this.loadedQuestions.clear();
  }

  /**
   * Получить самые длинные тексты из всех уровней (гибридный подход)
   * Сначала пытается использовать константы, сгенерированные при сборке
   * Если константы отсутствуют или являются дефолтными - анализирует текущий уровень (fallback)
   */
  public getLongestTexts(levelNumber?: number): LongestTexts {
    // Если кеш уже есть - возвращаем его
    if (this.longestTextsCache) {
      return this.longestTextsCache;
    }

    // Проверяем, являются ли константы дефолтными (не сгенерированными)
    // Если вопрос равен дефолтному - значит файл не был сгенерирован
    const isDefault = (LONGEST_TEXTS.question as string) === 'Какая планета известна как \'Красная планета\'?';

    if (!isDefault) {
      // Константы были сгенерированы - используем их
      this.longestTextsCache = LONGEST_TEXTS;
      logger.log('QUIZ', 'Using pre-generated longest texts from constants');
      return this.longestTextsCache;
    }

    // Fallback: константы дефолтные или отсутствуют - анализируем текущий уровень
    logger.log('QUIZ', 'Pre-generated constants not found or default, using fallback');

    if (levelNumber !== undefined) {
      this.longestTextsCache = this.analyzeCurrentLevel(levelNumber);
      return this.longestTextsCache;
    }

    // Если levelNumber не передан - пытаемся использовать level1
    try {
      this.longestTextsCache = this.analyzeCurrentLevel(1);
      return this.longestTextsCache;
    } catch (error) {
      console.warn('⚠️ Failed to analyze level 1, using default values');
      // Используем дефолтные значения из констант
      this.longestTextsCache = LONGEST_TEXTS;
      return this.longestTextsCache;
    }
  }

  /**
   * Анализирует текущий уровень и возвращает самые длинные тексты (fallback метод)
   */
  private analyzeCurrentLevel(levelNumber: number): LongestTexts {
    // Проверяем, загружен ли уровень
    if (!this.loadedQuestions.has(levelNumber)) {
      // Синхронная загрузка для fallback (может быть медленной, но это fallback)
      // В реальности уровень должен быть уже загружен
      throw new Error(`Level ${levelNumber} is not loaded. Call loadLevelQuestions() first.`);
    }

    const levelData = this.loadedQuestions.get(levelNumber)!;
    const longestTexts = findLongestTexts(levelData);

    logger.log('QUIZ', `Analyzed level ${levelNumber} for longest texts`);
    return longestTexts;
  }

  /**
   * ✅ НОВОЕ: Загрузить вопросы монеток для уровня (с кешированием resource loader)
   */
  public async loadCoinQuestions(levelNumber: number): Promise<CoinQuizData> {
    // AssetLoader кеширует по URL, так что повторная загрузка быстрая
    return this.assetLoader.loadJSON<CoinQuizData>(
      `questions/level${levelNumber}.coin-quiz.json`
    );
  }

  /**
   * ✅ НОВОЕ (Data-Driven Sizing): Найти самое длинное утверждение в JSON монеток уровня
   * Используется для расчета размера шрифта в CoinBubbleQuiz.
   */
  public async getLongestCoinStatement(levelNumber: number): Promise<string> {
    try {
      const data = await this.loadCoinQuestions(levelNumber);
      let longest = '';

      // Сканируем true statements
      if (data.true) {
        for (const item of data.true) {
          if (item.text.length > longest.length) longest = item.text;
        }
      }

      // Сканируем false statements
      if (data.false) {
        for (const item of data.false) {
          if (item.text.length > longest.length) longest = item.text;
        }
      }

      // Fallback
      if (longest.length === 0) {
        logger.warn('QUIZ', `Coin quiz scan found no text, using short fallback`);
        return 'Test'; // ✅ CHANGE: Short fallback to ensure large font on error
      }

      logger.log('QUIZ', `📏 Data-Driven Coin Size: Level ${levelNumber} max length = ${longest.length} chars ("${longest.substring(0, 20)}...")`);
      return longest;
    } catch (e) {
      logger.error('QUIZ', `Failed to scan coin questions for level ${levelNumber}`, e);
      return 'Error'; // ✅ CHANGE: Short fallback
    }
  }

  /**
   * ✅ НОВОЕ (Data-Driven Sizing): Найти самые длинные тексты в miniQuizzes уровня
   * Используется для KeyQuestionModal.
   */
  public async getLongestMiniQuizTexts(levelNumber: number): Promise<{ question: string, answer: string, feedback: string }> {
    try {
      // Используем loadLevelQuestions, который уже имеет кеш
      const data = await this.loadLevelQuestions(levelNumber);

      let maxQuestion = '';
      let maxAnswer = '';
      let maxFeedback = '';

      if (data.miniQuizzes) {
        for (const q of data.miniQuizzes) {
          // Вопрос
          const qText = 'question' in q ? q.question : q.question_Sign.text;
          if (qText.length > maxQuestion.length) maxQuestion = qText;

          // Ответы (правильный)
          if (q.correctAnswer.length > maxAnswer.length) maxAnswer = q.correctAnswer;
          // Ответы (неправильные)
          if (q.wrongAnswers) {
            for (const ans of q.wrongAnswers) {
              if (ans.length > maxAnswer.length) maxAnswer = ans;
            }
          }
          // ✅ FIX: wrongFeedbacks отображаются НА КНОПКАХ, поэтому входят в answer
          if (q.wrongFeedbacks) {
            for (const wf of q.wrongFeedbacks) {
              if (wf.length > maxAnswer.length) maxAnswer = wf;
            }
          }

          // Фидбэки (только правильные — отображаются в поле feedbackText)
          if (q.feedbacks) {
            for (const fb of q.feedbacks) {
              if (fb.length > maxFeedback.length) maxFeedback = fb;
            }
          }
        }
      }

      // Fallbacks
      // ✅ CHANGE: Short fallbacks to ensure large font on error/empty
      if (maxQuestion.length === 0) maxQuestion = 'Q?';
      if (maxAnswer.length === 0) maxAnswer = 'A';
      if (maxFeedback.length === 0) maxFeedback = 'OK';

      logger.log('QUIZ', `📏 Data-Driven Key Size: Level ${levelNumber} | Q:${maxQuestion.length} A:${maxAnswer.length} F:${maxFeedback.length}`);

      return {
        question: maxQuestion,
        answer: maxAnswer,
        feedback: maxFeedback
      };

    } catch (e) {
      logger.error('QUIZ', `Failed to scan mini quizzes for level ${levelNumber}`, e);
      return {
        question: 'Error?',
        answer: 'Err',
        feedback: 'Error'
      };
    }
  }
}

