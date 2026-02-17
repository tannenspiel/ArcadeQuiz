/**
 * Константы размеров, стилей и цветов текстов для UI элементов
 * Все размеры работают в виртуальном разрешении 720×1280
 *
 * Согласно требованиям:
 * - Тексты вопросов, фидбэков, кнопок уменьшены до 75% от исходного размера
 * - Фидбэк на правильный ответ увеличен до размера вопроса
 */

import { BASE_SCALE } from './gameConstants';

// ================================================
// ОБЩИЕ НАСТРОЙКИ ШРИФТА
// ================================================
export const USE_CUSTOM_FONT = false; // ✅ Флаг для включения/выключения кастомного шрифта
export const DISABLE_ALL_MULTIPLIERS = false; // ✅ Флаг для отключения всех множителей (true = все множители = 1.0)

// ✅ Мультипликаторы для точечной настройки размеров шрифта в GameOverModal
export const GAMEOVER_TITLE_FONT_MULTIPLIER = 0.85;
export const GAMEOVER_FEEDBACK_FONT_MULTIPLIER = 0.85;
export const GAMEOVER_SCORE_FONT_MULTIPLIER = 0.85;
export const GAMEOVER_BUTTON_FONT_MULTIPLIER = 0.85;

// Если USE_CUSTOM_FONT = true, используем PixeloidSans, иначе sans-serif (нативный)
// Nunito удалён для ускорения загрузки
export const DEFAULT_FONT_FAMILY = USE_CUSTOM_FONT ? 'PixeloidSans' : 'sans-serif'; // Основной шрифт игры
export const DEBUG_FONT_FAMILY = 'monospace'; // Шрифт для отладочного текста

// Ограничения размера шрифта для динамического расчета
export const MIN_FONT_SIZE_TEXT = 16; // Минимальный размер шрифта для текста (вопрос, фидбэк)
export const MIN_FONT_SIZE_BUTTON = 16; // Минимальный размер шрифта для кнопок
export const MAX_FONT_SIZE = 64; // Максимальный размер шрифта для всех элементов

// Начертания шрифта
export const FONT_STYLE = {
  NORMAL: 'normal',
  BOLD: 'bold',
  ITALIC: 'italic'
} as const;

// ================================================
// ЦВЕТА ТЕКСТОВ
// ================================================
export const TEXT_COLORS = {
  // Основные цвета
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GOLD: '#FFD700',        // Золотой (для заголовков, счета, фидбэков)
  LIGHT_GRAY: '#cbd5e0',  // Светло-серый (для меток порталов)
  PURPLE: '#4B0082',      // Фиолетовый (для фона глобальных вопросов)
  MODAL_BORDER: '#60422f', // ✅ Цвет текста под цвет границ модального окна (Dark Brown)

  // Динамические цвета порталов
  PORTAL_CORRECT: '#00FF00',   // Зеленый для правильного портала (debug mode)
  PORTAL_WRONG: '#FF4444',     // Красный для неправильного портала
  PORTAL_CORRECT_NORMAL: '#FF4500',  // Красно-оранжевый для правильного портала (normal mode)

  // Цвета для отладки
  DEBUG_GREEN: '#00ff00',

  // Цвета для состояний
  ORACLE_ACTIVE: '#FF8C00',     // Оранжевый для активного оракула
  WIN_COLOR: '#00FF00',         // Зеленый для победы (GameOverModal)
  PORTAL_OPEN: '#00FFFF',      // Голубой для открытого портала
} as const;

// ================================================
// МАКСИМАЛЬНЫЕ РАЗМЕРЫ ШРИФТА ДЛЯ МОДАЛЬНЫХ ОКОН (v3 Tiered System)
// ================================================
// ⚠️ Эти константы ограничивают результат calculateTieredFontSizeSimple
// Множители (_FONT_SIZE_MULTIPLIER) применяются ПОСЛЕ этого ограничения
//
// Все модальные окна имеют общий потолок 48px (настраивается здесь)
// ================================================

export const KEY_QUESTION_MODAL_MAX_FONT_SIZE = 42;    // Вопрос, фидбэк, кнопки (KeyQuestionModal)
export const PORTAL_MODAL_MAX_FONT_SIZE = 42;           // Заголовок, вопрос, ответ, кнопки (PortalModal)
export const GAMEOVER_MODAL_MAX_FONT_SIZE = 42;         // Заголовок, счёт, кнопки (GameOverModal)

// ================================================
// РАЗМЕРЫ ТЕКСТОВ В МОДАЛЬНЫХ ОКНАХ
// ================================================

// KeyQuestionModal (вопросы ключей)
// ✅ Мультипликаторы теперь относительные к базовому размеру (1.0 = базовый размер)
// Базовый размер рассчитывается динамически с проверкой дефолтного размера
export const KEY_QUESTION_FONT_SIZE_MULTIPLIER = 1.0; // Базовый размер, можно корректировать
export const KEY_FEEDBACK_FONT_SIZE_MULTIPLIER = 1.0; // Тот же размер, что и вопрос, можно корректировать
export const KEY_BUTTON_FONT_SIZE_MULTIPLIER = 1.0; // Размер текста в кнопках, можно корректировать

// PortalModal (порталы)
export const PORTAL_TITLE_FONT_SIZE = 28; // Размер заголовка
// ✅ Мультипликаторы для точечной настройки размеров шрифта в PortalModal
export const PORTAL_TITLE_FONT_MULTIPLIER = 0.85;
export const PORTAL_QUESTION_FONT_MULTIPLIER = 0.85;
export const PORTAL_ANSWER_FONT_MULTIPLIER = 0.85;
export const PORTAL_BUTTON_FONT_MULTIPLIER = 0.85;

// Button (общий класс кнопок)
export const BUTTON_DEFAULT_FONT_SIZE_MULTIPLIER = 0.3; // 30% от высоты кнопки (75% от 40%)
export const BUTTON_FEEDBACK_FONT_SIZE = 16; // Размер фидбэка в методе setFeedback

// LoadingScene (экран загрузки)
export const LOADING_TEXT_FONT_SIZE = 32; // Размер текста "Загрузка..."
export const LOADING_PROGRESS_FONT_SIZE = 20; // Размер текста прогресса

// MainScene (игровая сцена)
export const ORACLE_LABEL_FONT_SIZE = 24; // Размер титров оракула
export const GLOBAL_QUESTION_FONT_SIZE = 24; // Размер глобального вопроса
export const FLOATING_TEXT_FONT_SIZE = 18; // Размер плавающего текста
export const SCORE_HUD_FONT_SIZE = 32; // Размер текста счета в HUD
export const DEBUG_TEXT_FONT_SIZE = 14; // Размер отладочного текста

// AbstractPortal (порталы в игре)
export const PORTAL_LABEL_FONT_SIZE = 20; // Размер названия портала
export const PORTAL_ANSWER_FONT_SIZE = 20; // Размер текста ответа в портале
export const PORTAL_PROGRESS_FONT_SIZE = 16; // Размер текста прогресса портала

// ================================================
// СТИЛИ ТЕКСТОВ (начертания)
// ================================================

// KeyQuestionModal
export const KEY_QUESTION_FONT_STYLE = FONT_STYLE.BOLD;
export const KEY_FEEDBACK_FONT_STYLE = 'bold italic' as string; // ✅ Жирный курсив для фидбэка
export const KEY_BUTTON_FONT_STYLE = FONT_STYLE.BOLD;
export const KEY_CLOSE_BUTTON_FONT_STYLE = FONT_STYLE.BOLD;

// CoinBubbleQuiz (⚠️ НОВОЕ - бабблы для квиза монеток)
export const COIN_QUESTION_FONT_SIZE_MULTIPLIER = 1.0; // Базовый размер, можно корректировать
export const COIN_BUTTON_FONT_SIZE_MULTIPLIER = 1.0; // Размер текста в бабблах, можно корректировать
export const COIN_BUBBLE_FONT_MULTIPLIERS = { // ✅ ВОССТАНОВЛЕН!
  ULTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.89,   // Экстремально узкие
  EXTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.02,   // Очень узкие
  MOBILE_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.12,   // Узкие мобильные
  MOBILE_STANDARD: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.45,  // Стандартные мобильные
  TABLET_SQUARE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.50,    // Планшеты
  MONITOR_SMALL: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.55,    // Небольшие мониторы
  MONITOR_LARGE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.55      // Большие мониторы
} as const;
export const COIN_QUESTION_FONT_STYLE = FONT_STYLE.NORMAL;
export const COIN_BUTTON_FONT_STYLE = FONT_STYLE.BOLD;

// PortalModal
export const PORTAL_TITLE_FONT_STYLE = FONT_STYLE.BOLD;
export const PORTAL_QUESTION_FONT_STYLE = FONT_STYLE.BOLD;
export const PORTAL_INFO_FONT_STYLE = 'bold italic' as string; // Жирный курсив
export const MODAL_FONT_MULTIPLIERS = {   // ✅ Множители для модальных окон
  ULTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.5,
  EXTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.85,
  MOBILE_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.85,     // Узкие мобильные (AR 0.60-0.75)
  MOBILE_STANDARD: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.85,      // Стандартные мобильные
  TABLET_SQUARE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.8,        // Планшеты
  MONITOR_SMALL: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.85,         // Небольшие мониторы
  MONITOR_LARGE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.85          // Большие мониторы
} as const;
export const PORTAL_BUTTON_FONT_STYLE = FONT_STYLE.BOLD;

// GameOverModal
export const GAMEOVER_TITLE_FONT_STYLE = FONT_STYLE.BOLD;
export const GAMEOVER_SCORE_FONT_STYLE = FONT_STYLE.BOLD;
export const GAMEOVER_BUTTON_FONT_STYLE = FONT_STYLE.BOLD;

// Button (общий класс)
export const BUTTON_DEFAULT_FONT_STYLE = FONT_STYLE.BOLD;
export const BUTTON_FEEDBACK_FONT_STYLE = FONT_STYLE.ITALIC;

// LoadingScene
export const LOADING_TEXT_FONT_STYLE = FONT_STYLE.BOLD;
export const LOADING_PROGRESS_FONT_STYLE = FONT_STYLE.NORMAL;

// MainScene
export const ORACLE_LABEL_FONT_STYLE = FONT_STYLE.NORMAL;
export const GLOBAL_QUESTION_FONT_STYLE = FONT_STYLE.BOLD;
export const FLOATING_TEXT_FONT_STYLE = FONT_STYLE.BOLD;
export const SCORE_HUD_FONT_STYLE = FONT_STYLE.BOLD;
export const DEBUG_TEXT_FONT_STYLE = FONT_STYLE.NORMAL;

// AbstractPortal
export const PORTAL_LABEL_FONT_STYLE = FONT_STYLE.BOLD;
export const PORTAL_ANSWER_FONT_STYLE = FONT_STYLE.NORMAL;
export const PORTAL_PROGRESS_FONT_STYLE = FONT_STYLE.NORMAL;

// ================================================
// ЦВЕТА ТЕКСТОВ ПО КОМПОНЕНТАМ
// ================================================

// Button
export const BUTTON_TEXT_COLOR = TEXT_COLORS.MODAL_BORDER; // ✅ Коричневый текст кнопок
export const BUTTON_FEEDBACK_COLOR = TEXT_COLORS.GOLD; // ✅ Золотой фидбэк на кнопках
// ⚠️ НОВОЕ (Фаза 5): Цвета для состояний кнопок (используется в CoinBubbleQuiz)
export const BUTTON_HOVER_GOLD = 0xFFEC8B; // Светло-золотой при наведении (Light Gold) - hex: 0xFFEC8B
export const BUTTON_PRESSED_GOLD = 0xD4A017; // Темно-золотой при нажатии (Dark Gold) - hex: 0xD4A017

// RuneQuestionModal
export const KEY_CLOSE_BUTTON_COLOR = TEXT_COLORS.BLACK;  // Чёрный для крестика
export const KEY_QUESTION_COLOR = TEXT_COLORS.BLACK;      // Чёрный для вопроса
export const KEY_FEEDBACK_COLOR = TEXT_COLORS.MODAL_BORDER; // ✅ Коричневый (как цвет границ модального окна)

// PortalModal
export const PORTAL_TITLE_COLOR = TEXT_COLORS.BLACK; // ✅ Чёрный заголовок
export const PORTAL_QUESTION_COLOR = TEXT_COLORS.BLACK; // ✅ Чёрный текст вопроса
export const PORTAL_INFO_CORRECT_COLOR_DEBUG = TEXT_COLORS.MODAL_BORDER;  // Коричневый (debug mode) - как кнопки
export const PORTAL_INFO_CORRECT_COLOR = TEXT_COLORS.MODAL_BORDER; // Коричневый (normal mode) - как кнопки
export const PORTAL_INFO_WRONG_COLOR = TEXT_COLORS.MODAL_BORDER; // Коричневый (неправильный ответ) - как кнопки
export const PORTAL_INFO_BACKGROUND_COLOR = TEXT_COLORS.BLACK;

// GameOverModal
export const GAMEOVER_SCORE_COLOR = TEXT_COLORS.MODAL_BORDER; // ✅ Коричневый для Score
// GAMEOVER_TITLE_COLOR определяется динамически через getTitleColor()

// LoadingScene
export const LOADING_TEXT_COLOR = TEXT_COLORS.WHITE;
export const LOADING_PROGRESS_COLOR = TEXT_COLORS.WHITE;

// MainScene
export const ORACLE_LABEL_COLOR = TEXT_COLORS.GOLD;
export const ORACLE_LABEL_ACTIVE_COLOR = TEXT_COLORS.ORACLE_ACTIVE;
export const GLOBAL_QUESTION_COLOR = TEXT_COLORS.BLACK; // ✅ Чёрный текст глобального вопроса
export const GLOBAL_QUESTION_BACKGROUND_COLOR = TEXT_COLORS.PURPLE;
export const FLOATING_TEXT_COLOR = TEXT_COLORS.WHITE; // Базовый цвет, меняется динамически
export const SCORE_HUD_COLOR = TEXT_COLORS.GOLD;
export const SCORE_HUD_STROKE = TEXT_COLORS.BLACK;
export const SCORE_HUD_STROKE_THICKNESS = 4;
export const DEBUG_TEXT_COLOR = TEXT_COLORS.DEBUG_GREEN;
export const DEBUG_TEXT_BACKGROUND_COLOR = TEXT_COLORS.BLACK;

// AbstractPortal
export const PORTAL_LABEL_COLOR = TEXT_COLORS.LIGHT_GRAY;
export const PORTAL_ANSWER_COLOR = TEXT_COLORS.BLACK; // ✅ Чёрный текст ответа на портале
export const PORTAL_ANSWER_BACKGROUND_COLOR = TEXT_COLORS.BLACK;
export const PORTAL_PROGRESS_COLOR = TEXT_COLORS.WHITE;
export const PORTAL_PROGRESS_OPEN_COLOR = TEXT_COLORS.PORTAL_OPEN;

// QuestionBubble (бабблы вопросов и ответов)
export const BUBBLE_QUESTION_FONT_STYLE = FONT_STYLE.BOLD; // ✅ Стиль шрифта для текста вопроса в баббле (жирный)
export const BUBBLE_QUESTION_COLOR = TEXT_COLORS.BLACK; // ✅ Цвет текста вопроса в баббле (черный)
export const BUBBLE_QUESTION_STROKE = TEXT_COLORS.BLACK; // ✅ Цвет обводки текста вопроса (не используется, т.к. толщина 0)
export const BUBBLE_QUESTION_STROKE_THICKNESS = 0; // ✅ Без обводки
export const BUBBLE_HINT_COLOR = TEXT_COLORS.WHITE; // ✅ Цвет текста подсказки (белый, как было)
export const BUBBLE_HINT_STROKE = TEXT_COLORS.BLACK; // ✅ Цвет обводки текста подсказки
export const BUBBLE_HINT_STROKE_THICKNESS = 4; // ✅ Толщина обводки текста подсказки (как было)

// ================================================
// UI ТЕКСТЫ ⚠️ НОВОЕ (Фаза 5: Hardcode Refactoring)
// ================================================
// Централизованные текстовые константы для UI элементов
//
// ⚠️ КРИТИЧЕСКИ ВАЖНО: Пробелы в конце префиксов ОБЯЗАТЕЛЬНЫ!
// Причина: конкатенация с числами → "Счёт: 123", не "Счёт:123"
//
// Если забыт пробел → текст "слипается":
//   'Счёт:' + 1500 = "Счёт:1500" ❌
//   'Счёт: ' + 1500 = "Счёт: 1500" ✅
// ================================================
export const UI_TEXT = {
  // ================================================
  // Префиксы (с пробелами в конце!)
  // ================================================
  SCORE_PREFIX: 'Счёт: ',      // ← Пробел в конце ОБЯЗАТЕЛЕН!
  KEYS_PREFIX: 'Ключей: ',     // ← Пробел в конце ОБЯЗАТЕЛЕН!
  COINS_PREFIX: 'Монеток: ',   // ← Пробел в конце (для будущего)

  // ================================================
  // Кнопки (без пробелов - это не префиксы)
  // ================================================
  CLOSE_BUTTON: 'Закрыть',
  CONTINUE_BUTTON: 'Продолжить',
  RESTART_BUTTON: 'Начать заново',

  // ================================================
  // Другие тексты
  // ================================================
  LEVEL_COMPLETE: 'Уровень пройден!',
  GAME_OVER: 'Игра окончена',
  YOU_WIN: 'Победа!',

} as const;

// ================================================
// АДАПТИВНЫЕ ОТСТУПЫ ДЛЯ КНОПОК (в пикселях исходной графики)
// ================================================
// Отступы в пикселях исходной графики (масштабируются через BASE_SCALE)
// BASE_SCALE = 4 означает, что каждый пиксель исходной графики = 4 виртуальных пикселя
export const BUTTON_PADDING_BASE_X = 3; // 3px исходной графики → 12px виртуальных (×4)
export const BUTTON_PADDING_BASE_Y = 2; // 2px исходной графики → 8px виртуальных (×4)

// ================================================
// АДАПТИВНЫЕ МНОЖИТЕЛИ РАЗМЕРА ШРИФТА ПО ДИАПАЗОНАM ASPECT RATIO
// ================================================
// Множители для каждого диапазона aspect ratio (система 7 диапазонов)
// Меньше множитель → меньше шрифт → больше текста влезает в узкие экраны
// ✅ v7 - Увеличены на ~10% для лучшей читаемости
export const FONT_SIZE_MULTIPLIERS = {
  ULTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 0.75,   // Экстремально узкие (AR 0.25-0.45) — было 1.15 (+9.6%)
  EXTRA_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.0,   // Очень узкие (AR 0.45-0.6) — было 1.22 (+9.8%)
  MOBILE_NARROW: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.3,  // Узкие мобильные (AR 0.6-0.75) — было 1.28 (+10.2%)
  MOBILE_STANDARD: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.35, // Стандартные мобильные (AR 0.75-1.0) — было 1.32 (+9.8%)
  TABLET_SQUARE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.4,  // Планшеты, квадратные (AR 1.0-1.3) — было 1.35 (+10.4%)
  MONITOR_SMALL: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.45,   // Небольшие мониторы (AR 1.3-1.6) — было 1.4 (+10%)
  MONITOR_LARGE: DISABLE_ALL_MULTIPLIERS ? 1.0 : 1.55    // Большие мониторы (AR 1.6+) — было 1.4 (+10%)
} as const;

