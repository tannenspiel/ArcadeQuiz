/**
 * Типы для системы анимаций спрайтшитов
 */

/**
 * Формат расположения кадров в спрайтшите
 */
export enum SpritesheetLayout {
  /** Горизонтальная полоса (кадры идут слева направо) */
  HORIZONTAL = 'horizontal',
  /** Вертикальная полоса (кадры идут сверху вниз) */
  VERTICAL = 'vertical',
  /** Сетка (rows x cols) */
  GRID = 'grid',
  /** Кастомное расположение (явное указание кадров) */
  CUSTOM = 'custom'
}

/**
 * Конфигурация одного кадра анимации
 */
export interface AnimationFrame {
  /** Индекс кадра в спрайтшите */
  frame: number;
  /** Длительность кадра в миллисекундах (опционально) */
  duration?: number;
}

/**
 * Конфигурация анимации
 */
export interface AnimationConfig {
  /** Ключ анимации (например, 'key_idle', 'boy_down') */
  key: string;
  /** Кадры анимации */
  frames: AnimationFrame[] | number[];
  /** Частота кадров (кадров в секунду) */
  frameRate?: number;
  /** Повторять ли анимацию (-1 = бесконечно, 0 = один раз, N = N раз) */
  repeat?: number;
  /** Задержка перед началом анимации */
  delay?: number;
  /** Запускать ли анимацию в обратном порядке */
  yoyo?: boolean;
}

/**
 * Конфигурация загрузки спрайтшита
 */
export interface SpritesheetLoadConfig {
  /** Ключ спрайтшита */
  key: string;
  /** Путь к файлу относительно ASSETS_BASE_PATH/images/ */
  path: string;
  /** Ширина одного кадра */
  frameWidth: number;
  /** Высота одного кадра */
  frameHeight: number;
  /** Формат расположения кадров */
  layout: SpritesheetLayout;
  /** Количество кадров (для HORIZONTAL/VERTICAL) */
  frameCount?: number;
  /** Количество строк (для GRID) */
  rows?: number;
  /** Количество столбцов (для GRID) */
  cols?: number;
  /** Начальный кадр (для GRID, если нужно пропустить кадры) */
  startFrame?: number;
}

/**
 * Полная конфигурация спрайтшита с анимациями
 */
export interface SpritesheetConfig {
  /** Конфигурация загрузки */
  load: SpritesheetLoadConfig;
  /** Конфигурация анимаций */
  animations: AnimationConfig[];
}































































