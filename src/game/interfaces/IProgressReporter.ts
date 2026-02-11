/**
 * Interface для сцены которая показывает progress bar загрузки
 *
 * Используется LoadingScene для получения прогресса из MainScene
 */
export interface IProgressReporter {
  /**
   * Обновить прогресс загрузки
   * @param percent - Прогресс 0-100
   * @param text - Текст описания этапа
   */
  setProgress(percent: number, text: string): void;

  /**
   * Завершить загрузку и уничтожить loading scene
   */
  finishLoading(): void;
}
