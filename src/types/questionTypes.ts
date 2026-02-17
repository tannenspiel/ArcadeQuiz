/**
 * Типы для системы вопросов
 * Соответствуют структуре JSON файлов с вопросами
 */

/**
 * Тип вопроса: обычный текст или с изображением
 */
export enum QuestionType {
  TEXT_ONLY = 'TEXT_ONLY',
  TEXT_WITH_IMAGE = 'TEXT_WITH_IMAGE'
}

/**
 * Стандартный вопрос (только текст)
 */
export interface StandardQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  feedbacks: string[];
  wrongFeedbacks: string[];
}

/**
 * Вопрос с изображением
 */
export interface QuestionWithImage {
  question_Sign: {
    text: string;
    image: string; // Имя файла изображения (без пути)
  };
  correctAnswer: string;
  wrongAnswers: string[];
  feedbacks: string[];
  wrongFeedbacks: string[];
}

/**
 * Объединенный тип вопроса
 */
export type QuestionData = StandardQuestion | QuestionWithImage;

/**
 * Победные сообщения для разных результатов
 */
export interface WinMessages {
  win1: string[]; // Сообщения при завершении с 1 жизнью
  win2: string[]; // Сообщения при завершении с 2 жизнями
  win3: string[]; // Сообщения при завершении с 3 жизнями (идеальный результат)
  gameover?: string[]; // Сообщения при проигрыше (0 жизней)
}

/**
 * Полная структура JSON файла с вопросами уровня
 */
export interface LevelQuestionsData {
  category: string; // Название категории/уровня
  gameWinMessage?: WinMessages; // ❌ УБРАНО: теперь в feedbacks.json (для обратной совместимости опционально)
  levelWinMessage: WinMessages; // Фидбэк прохождения уровня (LEVEL COMPLETE)
  miniQuizzes: QuestionData[]; // Вопросы для мини-квизов (ключи)
  globalQuizzes?: QuestionData[]; // Массив глобальных вопросов для порталов
  globalQuizzesWithImage?: QuestionWithImage[]; // Массив глобальных вопросов с изображением для порталов
}

/**
 * Структура JSON файла с общими фидбэками (feedbacks.json)
 */
export interface FeedbacksData {
  description: string;
  gameWinMessage: WinMessages; // Фидбэк всей игры (YOU WIN) - общий для всех уровней
}

/**
 * Результат парсинга вопроса
 */
export interface ParsedQuestion {
  type: QuestionType;
  questionText: string;
  image?: string; // Путь к изображению, если есть
  correctAnswer: string;
  wrongAnswers: string[];
  allAnswers: string[]; // Все ответы в случайном порядке
  feedbacks: string[];
  wrongFeedbacks: string[];
  damage?: number; // ✅ Урон, наносимый игроку за неправильный ответ (по умолчанию 1 для мини-вопросов)
}

