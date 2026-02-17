// Этот файл автоматически генерируется скриптом scripts/analyze-texts.ts
// Не редактировать вручную!

// Самые длинные тексты из ВСЕХ типов вопросов (miniQuizzes + globalQuizzes + globalQuestionWithImage)
export const LONGEST_TEXTS = {
  question: "Что обязательно взять в поход от солнца?",
  answer: "Наша планета называется Земля",
  feedback: "Правильно! Осенью природа меняет цвета!",
  maxLength: 40
} as const;

// Самые длинные тексты ТОЛЬКО из miniQuizzes (для KeyQuestionModal)
export const LONGEST_TEXTS_MINI_QUIZZES = {
  question: "Что обязательно взять в поход от солнца?",
  answer: "Наша планета называется Земля",
  feedback: "Правильно! Осенью природа меняет цвета!",
  maxLength: 40
} as const;

// Самые длинные тексты для CoinBubbleQuiz (бабблы монеток)
// Найденный максимум: ~46-50 символов (Level 3)
export const LONGEST_TEXTS_COIN_QUIZZES = {
  text: "Газовая плита требует выключения после готовки!!!", // ~50 chars
  maxLength: 50
} as const;
