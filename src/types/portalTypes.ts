/**
 * Типы для системы порталов
 */

export enum PortalType {
  STANDARD = 'standard',
  TRAP = 'trap',
  BONUS = 'bonus'
}

/**
 * Состояния портала
 */
export enum PortalState {
  BASE = 'base',                    // Базовое состояние (анимация Portal_X.Base_24F_1536x48.png, 24 кадра)
  INTERACTION = 'interaction',      // Интеракция: получен ключ (анимация)
  ACTIVATING = 'activating',        // Активация: Оракул активирован, ждем ключи (цикличная анимация)
  ACTIVATED = 'activated'           // Активированное состояние (циклическая анимация Portal_X.Activated, 24 кадра)
}

export interface PortalConfig {
  id: number;
  type: PortalType;
  isCorrect: boolean;
  answerText: string;
  position?: { x: number; y: number };
  damage?: number; // ✅ Урон, наносимый игроку при входе в неправильный портал (по умолчанию 1)
  useTiledMapTextures?: boolean; // ✅ Использовать статичные текстуры для Tiled Map реализации
  bubblePosition?: { x: number; y: number }; // ✅ Координаты баббла вопроса (из Tiled Map)
  collisionBodies?: Phaser.GameObjects.GameObject[]; // ✅ Статические тела коллизий (voxels) для отключения при открытии
}


