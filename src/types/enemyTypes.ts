/**
 * Типы для системы врагов
 */

export enum EnemyType {
  RANDOM_WALKER = 'randomWalker',
  CHASER = 'chaser',
  FLAM = 'flam' // Враг Flam (с настраиваемым здоровьем)
}

/**
 * Состояния врага
 */
export enum EnemyState {
  IDLE = 'idle',                    // Стоит
  MOVING = 'moving',                // Движется
  WANDERING = 'wandering',          // Случайное блуждание
  CHASING = 'chasing',              // Преследует игрока
  RETREATING = 'retreating',        // Отступает от краев карты
  DETECTING = 'detecting',          // Обнаружил игрока (перед клонированием)
  SPAWNING = 'spawning',            // Клонируется/заспавнен (мигает белым)
  DAMAGED = 'damaged',              // Получил урон (не финальная смерть)
  DYING = 'dying',                  // Умирает (финальная смерть, анимация смерти)
  DEAD = 'dead'                     // Мертв (финальное состояние, готов к очистке памяти)
}

export interface EnemyConfig {
  type: EnemyType;
  speed: number;
  x: number;
  y: number;
  damage?: number; // ✅ Урон, наносимый игроку при столкновении (по умолчанию 1)
  health?: number; // ✅ Количество жизней врага (по умолчанию 1)
  // ✅ Настройки для машины состояний
  cloneDetectionRadius?: number; // Радиус детекции игрока для клонирования (для DETECTING состояния)
  chaseRadius?: number; // Радиус преследования (для CHASING)
  chaseSpeed?: number; // Скорость преследования (если не указана, используется speed)
  clonesCanClone?: boolean; // Могут ли клоны клонироваться
  cloneLifetime?: number; // Время жизни клонов в мс (0 = бессмертные)
  cloneCount?: number; // Количество клонов при клонировании
  cloneSpawnDelay?: number; // Задержка между спавном каждого клона в мс (по умолчанию 0 - одновременный)
  showDetectionRadius?: boolean; // Показывать ли кольцо радиуса детекции для отладки
  // ✅ Флаги для клонов
  isClone?: boolean; // Является ли этот враг клоном
  parentId?: string; // ID родительского врага (для клонов)
  spawnTime?: number; // Время создания (для клонов с ограниченным временем жизни)
}

export interface EnemySpawnData {
  type: EnemyType;
  position: { x: number; y: number };
}

