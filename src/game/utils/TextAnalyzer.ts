/**
 * Утилита для анализа текстов в вопросах
 * Находит самый длинный текст среди вопросов, ответов и фидбэков
 */

import { LevelQuestionsData, QuestionData } from '../../types/questionTypes';

export interface LongestTexts {
  question: string;
  answer: string;
  feedback: string;
  maxLength: number;
}

/**
 * Находит самый длинный текст в данных уровня
 */
function analyzeLevelData(levelData: LevelQuestionsData): LongestTexts {
  let maxQuestion = '';
  let maxAnswer = '';
  let maxFeedback = '';

  // Анализируем miniQuizzes
  if (levelData.miniQuizzes) {
    levelData.miniQuizzes.forEach((quiz: QuestionData) => {
      // Вопрос
      if ('question' in quiz && quiz.question && quiz.question.length > maxQuestion.length) {
        maxQuestion = quiz.question;
      } else if ('question_Sign' in quiz && quiz.question_Sign?.text && quiz.question_Sign.text.length > maxQuestion.length) {
        maxQuestion = quiz.question_Sign.text;
      }

      // Правильный ответ
      if (quiz.correctAnswer && quiz.correctAnswer.length > maxAnswer.length) {
        maxAnswer = quiz.correctAnswer;
      }

      // Фидбэки
      if (quiz.feedbacks) {
        quiz.feedbacks.forEach(fb => {
          if (fb && fb.length > maxFeedback.length) {
            maxFeedback = fb;
          }
        });
      }
    });
  }

  // Анализируем globalQuizzes (новое)
  if (levelData.globalQuizzes) {
    levelData.globalQuizzes.forEach((quiz: QuestionData) => {
      // Вопрос
      if ('question' in quiz && quiz.question && quiz.question.length > maxQuestion.length) {
        maxQuestion = quiz.question;
      } else if ('question_Sign' in quiz && quiz.question_Sign?.text && quiz.question_Sign.text.length > maxQuestion.length) {
        maxQuestion = quiz.question_Sign.text;
      }

      // Правильный ответ
      if (quiz.correctAnswer && quiz.correctAnswer.length > maxAnswer.length) {
        maxAnswer = quiz.correctAnswer;
      }

      // Фидбэки
      if (quiz.feedbacks) {
        quiz.feedbacks.forEach(fb => {
          if (fb && fb.length > maxFeedback.length) {
            maxFeedback = fb;
          }
        });
      }
    });
  }

  // Анализируем globalQuestion (для обратной совместимости)
  if (levelData.globalQuestion) {
    const gq = levelData.globalQuestion;
    if (gq.question && gq.question.length > maxQuestion.length) {
      maxQuestion = gq.question;
    }
    if (gq.correctAnswer && gq.correctAnswer.length > maxAnswer.length) {
      maxAnswer = gq.correctAnswer;
    }
    if (gq.feedbacks) {
      gq.feedbacks.forEach(fb => {
        if (fb && fb.length > maxFeedback.length) {
          maxFeedback = fb;
        }
      });
    }
  }

  // Анализируем globalQuestionWithImage (для обратной совместимости)
  if (levelData.globalQuestionWithImage) {
    const gqi = levelData.globalQuestionWithImage;
    if (gqi.question_Sign?.text && gqi.question_Sign.text.length > maxQuestion.length) {
      maxQuestion = gqi.question_Sign.text;
    }
    if (gqi.correctAnswer && gqi.correctAnswer.length > maxAnswer.length) {
      maxAnswer = gqi.correctAnswer;
    }
    if (gqi.feedbacks) {
      gqi.feedbacks.forEach(fb => {
        if (fb && fb.length > maxFeedback.length) {
          maxFeedback = fb;
        }
      });
    }
  }

  // ✅ Анализируем levelWinMessage (сообщения при завершении уровня)
  if (levelData.levelWinMessage) {
    const lwm = levelData.levelWinMessage;
    // Проверяем все категории: win1, win2, win3
    ['win1', 'win2', 'win3'].forEach(category => {
      if (lwm[category] && Array.isArray(lwm[category])) {
        lwm[category].forEach((fb: string) => {
          if (fb && fb.length > maxFeedback.length) {
            maxFeedback = fb;
          }
        });
      }
    });
  }

  const maxLength = Math.max(maxQuestion.length, maxAnswer.length, maxFeedback.length);

  return {
    question: maxQuestion,
    answer: maxAnswer,
    feedback: maxFeedback,
    maxLength
  };
}

/**
 * Находит самый длинный текст из одного или нескольких уровней
 * @param questionsData - данные одного уровня или массив данных уровней
 * @returns объект с самыми длинными текстами
 */
export function findLongestTexts(
  questionsData: LevelQuestionsData | LevelQuestionsData[]
): LongestTexts {
  if (Array.isArray(questionsData)) {
    // Если передан массив - находим максимум среди всех уровней
    let result: LongestTexts = {
      question: '',
      answer: '',
      feedback: '',
      maxLength: 0
    };

    questionsData.forEach(levelData => {
      const levelResult = analyzeLevelData(levelData);
      if (levelResult.question.length > result.question.length) {
        result.question = levelResult.question;
      }
      if (levelResult.answer.length > result.answer.length) {
        result.answer = levelResult.answer;
      }
      if (levelResult.feedback.length > result.feedback.length) {
        result.feedback = levelResult.feedback;
      }
    });

    result.maxLength = Math.max(result.question.length, result.answer.length, result.feedback.length);
    return result;
  } else {
    // Если передан один уровень - анализируем его
    return analyzeLevelData(questionsData);
  }
}


















