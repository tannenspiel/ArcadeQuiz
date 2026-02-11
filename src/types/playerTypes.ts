/**
 * Типы для системы игрока
 */

/**
 * Состояния машины состояний игрока
 */
export enum PlayerState {
  IDLE = 'idle',                    // Стоит
  MOVING = 'moving',                // Движется
  LOSING_KEY = 'losing_key',        // Теряет ключ
  GETTING_KEY = 'getting_key',      // Получает ключ
  APPLYING_KEY = 'applying_key',    // Применяет ключ
  IN_QUIZ = 'in_quiz',              // В режиме вопроса
  IN_PORTAL = 'in_portal',          // В портале
  DAMAGED = 'damaged',              // Получил урон (краткое состояние)
  DEAD = 'dead'                     // Мертв (Game Over)
}



























































