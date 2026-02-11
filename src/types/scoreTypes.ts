/**
 * Типы для системы очков
 *
 * ✅ v2 - Обновленная система очков:
 * - uniqueKeyPoints: 5 (было 3)
 * - repeatKeyPoints: 2 (было 1)
 * - uniqueCoinPoints: 5 (новое)
 * - repeatCoinPoints: 2 (новое)
 * - portalPoints: 10 (без изменений)
 */

export interface ScoreConfig {
  uniqueKeyPoints: number;    // Очки за уникальный ключ (по умолчанию 5)
  repeatKeyPoints: number;    // Очки за повторный ключ (по умолчанию 2)
  uniqueCoinPoints: number;   // ✅ НОВОЕ: Очки за уникальную монетку (по умолчанию 5)
  repeatCoinPoints: number;   // ✅ НОВОЕ: Очки за повторную монетку (по умолчанию 2)
  keyPoints?: number;         // Устаревшее, оставлено для совместимости
  portalPoints: number;       // Очки за правильный портал (по умолчанию 10)
}

export interface ScoreData {
  total: number;
  keys: number;             // Количество собранных ключей
  coins: number;            // ✅ НОВОЕ: Количество собранных монеток
  portals: number;          // Количество пройденных порталов
}

