/**
 * Скрипт для анализа всех JSON файлов с вопросами и генерации констант
 * Запускается перед сборкой (prebuild) или вручную
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LongestTexts {
  question: string;
  answer: string;
  feedback: string;
  maxLength: number;
}

interface LongestTextsMiniQuizzes {
  question: string;
  answer: string;
  feedback: string;
  maxLength: number;
}

interface QuestionData {
  question?: string;
  question_Sign?: {
    text: string;
    image: string;
  };
  correctAnswer: string;
  wrongAnswers: string[];
  feedbacks: string[];
  wrongFeedbacks: string[];
}

interface LevelQuestionsData {
  category: string;
  winmessage: any;
  miniQuizzes: QuestionData[];
  globalQuestion: QuestionData;
  globalQuestionWithImage?: QuestionData;
}

/**
 * Анализирует данные уровня и находит самые длинные тексты
 */
function analyzeLevelData(levelData: LevelQuestionsData): LongestTexts {
  let maxQuestion = '';
  let maxAnswer = '';
  let maxFeedback = '';

  // Анализируем miniQuizzes
  if (levelData.miniQuizzes) {
    levelData.miniQuizzes.forEach((quiz: QuestionData) => {
      // Вопрос
      if (quiz.question && quiz.question.length > maxQuestion.length) {
        maxQuestion = quiz.question;
      } else if (quiz.question_Sign?.text && quiz.question_Sign.text.length > maxQuestion.length) {
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

  // Анализируем globalQuestion
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

  // Анализируем globalQuestionWithImage
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

  const maxLength = Math.max(maxQuestion.length, maxAnswer.length, maxFeedback.length);

  return {
    question: maxQuestion,
    answer: maxAnswer,
    feedback: maxFeedback,
    maxLength
  };
}

/**
 * Анализирует только miniQuizzes (для KeyQuestionModal)
 * Не включает globalQuestion и globalQuestionWithImage
 */
function analyzeMiniQuizzes(levelData: LevelQuestionsData): LongestTextsMiniQuizzes {
  let maxQuestion = '';
  let maxAnswer = '';
  let maxFeedback = '';

  // Анализируем ТОЛЬКО miniQuizzes
  if (levelData.miniQuizzes) {
    levelData.miniQuizzes.forEach((quiz: QuestionData) => {
      // Вопрос
      if (quiz.question && quiz.question.length > maxQuestion.length) {
        maxQuestion = quiz.question;
      } else if (quiz.question_Sign?.text && quiz.question_Sign.text.length > maxQuestion.length) {
        maxQuestion = quiz.question_Sign.text;
      }

      // Правильный ответ
      if (quiz.correctAnswer && quiz.correctAnswer.length > maxAnswer.length) {
        maxAnswer = quiz.correctAnswer;
      }

      // WrongAnswers тоже могут быть длиннее
      if (quiz.wrongAnswers) {
        quiz.wrongAnswers.forEach(answer => {
          if (answer && answer.length > maxAnswer.length) {
            maxAnswer = answer;
          }
        });
      }

      // Фидбэки
      if (quiz.feedbacks) {
        quiz.feedbacks.forEach(fb => {
          if (fb && fb.length > maxFeedback.length) {
            maxFeedback = fb;
          }
        });
      }

      // WrongFeedbacks тоже могут быть длиннее
      if (quiz.wrongFeedbacks) {
        quiz.wrongFeedbacks.forEach(fb => {
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
 * Находит самый длинный текст из всех уровней
 */
function findLongestTexts(levelsData: LevelQuestionsData[]): LongestTexts {
  let result: LongestTexts = {
    question: '',
    answer: '',
    feedback: '',
    maxLength: 0
  };

  levelsData.forEach(levelData => {
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
}

/**
 * Находит самый длинный текст из всех уровней (только miniQuizzes)
 */
function findLongestTextsMiniQuizzes(levelsData: LevelQuestionsData[]): LongestTextsMiniQuizzes {
  let result: LongestTextsMiniQuizzes = {
    question: '',
    answer: '',
    feedback: '',
    maxLength: 0
  };

  levelsData.forEach(levelData => {
    const levelResult = analyzeMiniQuizzes(levelData);
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
}

/**
 * Главная функция скрипта
 */
async function main() {
  const questionsDir = path.join(__dirname, '../src/assets/Game_01/questions');
  const outputFile = path.join(__dirname, '../src/constants/textLengths.ts');

  console.log('🔍 Analyzing question files...');

  try {
    // Читаем все файлы level*.questions.json
    const files = fs.readdirSync(questionsDir)
      .filter(file => file.startsWith('level') && file.endsWith('.questions.json'))
      .sort();

    if (files.length === 0) {
      console.warn('⚠️ No question files found, using fallback from level1');
      // Пытаемся загрузить level1 как fallback
      const fallbackFile = path.join(questionsDir, 'level1.questions.json');
      if (fs.existsSync(fallbackFile)) {
        const fallbackData = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
        const longestTexts = analyzeLevelData(fallbackData);
        const longestTextsMiniQuizzes = analyzeMiniQuizzes(fallbackData);
        generateConstantsFile(outputFile, longestTexts, longestTextsMiniQuizzes);
        console.log('✅ Generated constants from level1 fallback');
        return;
      } else {
        throw new Error('No question files found and level1 fallback not available');
      }
    }

    // Загружаем все уровни
    const levelsData: LevelQuestionsData[] = [];
    for (const file of files) {
      const filePath = path.join(questionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const levelData: LevelQuestionsData = JSON.parse(content);
      levelsData.push(levelData);
      console.log(`  ✓ Loaded ${file}`);
    }

    // Находим самые длинные тексты
    const longestTexts = findLongestTexts(levelsData);
    const longestTextsMiniQuizzes = findLongestTextsMiniQuizzes(levelsData);

    // Генерируем файл констант
    generateConstantsFile(outputFile, longestTexts, longestTextsMiniQuizzes);

    console.log('✅ Generated constants file:', outputFile);
    console.log('   All question types:');
    console.log(`     Longest question: ${longestTexts.question.length} chars`);
    console.log(`     Longest answer: ${longestTexts.answer.length} chars`);
    console.log(`     Longest feedback: ${longestTexts.feedback.length} chars`);
    console.log(`     Max length: ${longestTexts.maxLength} chars`);
    console.log('   MiniQuizzes only (for KeyQuestionModal):');
    console.log(`     Longest question: ${longestTextsMiniQuizzes.question.length} chars`);
    console.log(`     Longest answer: ${longestTextsMiniQuizzes.answer.length} chars`);
    console.log(`     Longest feedback: ${longestTextsMiniQuizzes.feedback.length} chars`);
    console.log(`     Max length: ${longestTextsMiniQuizzes.maxLength} chars`);

  } catch (error) {
    console.error('❌ Error analyzing texts:', error);
    process.exit(1);
  }
}

/**
 * Генерирует файл с константами
 */
function generateConstantsFile(outputPath: string, longestTexts: LongestTexts, longestTextsMiniQuizzes: LongestTextsMiniQuizzes) {
  const content = `// Этот файл автоматически генерируется скриптом scripts/analyze-texts.ts
// Не редактировать вручную!

// Самые длинные тексты из ВСЕХ типов вопросов (miniQuizzes + globalQuizzes + globalQuestionWithImage)
export const LONGEST_TEXTS = {
  question: ${JSON.stringify(longestTexts.question)},
  answer: ${JSON.stringify(longestTexts.answer)},
  feedback: ${JSON.stringify(longestTexts.feedback)},
  maxLength: ${longestTexts.maxLength}
} as const;

// Самые длинные тексты ТОЛЬКО из miniQuizzes (для KeyQuestionModal)
export const LONGEST_TEXTS_MINI_QUIZZES = {
  question: ${JSON.stringify(longestTextsMiniQuizzes.question)},
  answer: ${JSON.stringify(longestTextsMiniQuizzes.answer)},
  feedback: ${JSON.stringify(longestTextsMiniQuizzes.feedback)},
  maxLength: ${longestTextsMiniQuizzes.maxLength}
} as const;

// Самые длинные тексты для CoinBubbleQuiz (бабблы монеток)
// Найденный максимум: ~46-50 символов (Level 3)
export const LONGEST_TEXTS_COIN_QUIZZES = {
  text: "Газовая плита требует выключения после готовки!!!", // ~50 chars
  maxLength: 50
} as const;
`;

  fs.writeFileSync(outputPath, content, 'utf-8');
}

// Запускаем скрипт
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


















































