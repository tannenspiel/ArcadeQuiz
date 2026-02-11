/**
 * Сцена загрузки ресурсов (persistent)
 * Загружает все необходимые ресурсы перед запуском игры
 
 * ✅ UNIFIED LOADING SCREEN
 * - Показывает реальный прогресс загрузки (0-100%)
 * - 0-50%: Загрузка ассетов через Phaser loader
 * - 50-100%: Инициализация MainScene (через EventBus)
 * - Остается активной пока MainScene инициализируется
 
 * ✅ DOM OVERLAY FIX: Текст через DOM для обхода ошибок текстур Phaser
 */

import Phaser from 'phaser';

import { BaseScene } from './BaseScene';

import {
  DEFAULT_FONT_FAMILY,
  LOADING_TEXT_FONT_SIZE,
  LOADING_PROGRESS_FONT_SIZE,
  LOADING_TEXT_FONT_STYLE,
  LOADING_PROGRESS_FONT_STYLE,
  LOADING_TEXT_COLOR
} from '../../constants/textStyles';

import { ASSETS_BASE_PATH } from '../../config/gameConfig';

import {
  KEYS,
  MAX_LEVELS,
  LevelAssetKeys,
  LOADING_PROGRESS_EVENT,
  FINISH_LOADING_EVENT,
  LoadingProgressEvent
} from '../../constants/gameConstants';

import { AnimationManager } from '../systems/AnimationManager';

import { SPRITESHEET_CONFIGS } from '../../config/spritesheetConfigs';

import { EventBus } from '../EventBus';

import { logger } from '../../utils/Logger';

import { IProgressReporter } from '../interfaces/IProgressReporter';

/**
 * ✅ КРИТИЧНО: Глобальный флаг для предотвращения двойного вызова finishLoading()
 * Phaser создает LoadingScene дважды, каждый экземпляр подписывается на FINISH_LOADING_EVENT
 * Этот флаг общий для всех экземпляров
 */
let globalFinishLoadingExecuted = false;

/**
 * Bar width for progress bar (fixed width)
 */
const BAR_WIDTH = 400;
const BAR_HEIGHT = 30;

export default class LoadingScene extends BaseScene implements IProgressReporter {
  private progressBar?: Phaser.GameObjects.Rectangle;
  private progressBarBg?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private loadingText?: Phaser.GameObjects.Text;
  private animationManager?: AnimationManager;
  private currentProgress: number = 0;
  private isFinishing: boolean = false; // Флаг для предотвращения обновлений после завершения
  private isFinished: boolean = false; // ✅ Флаг для предотвращения повторного вызова finishLoading()

  // DOM overlay для текста (решает проблему с текстурами)
  private domTextOverlay?: HTMLDivElement;
  private domLoadingText?: HTMLDivElement;
  private domProgressText?: HTMLDivElement;

  constructor() {
    super('LoadingScene');
  }

  preload() {
    this.initBaseSystems();
    this.createLoadingUI();
    this.createDOMTextOverlay(); // ✅ Добавлено: DOM overlay для текста
    this.setupEventBusListeners();
    this.startLoading();
  }

  /**
   * Создать UI загрузки
   */
  private createLoadingUI(): void {
    const { width, height } = this.cameras.main;

    // Фон
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
    bg.setOrigin(0.5);

    // Заголовок - используем простой текст без текстуры
    const title = this.add.text(width / 2, height / 2 - 100, 'ArcadeQuiz', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    title.setOrigin(0.5).setVisible(false); // Скрываем, используем DOM overlay

    // Текст загрузки - используем простой текст без текстуры
    this.loadingText = this.add.text(width / 2, height / 2, 'Загрузка...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.loadingText.setOrigin(0.5).setVisible(false); // Скрываем, используем DOM overlay

    // Прогресс бар - фон
    const barBg = this.add.rectangle(width / 2, height / 2 + 50, BAR_WIDTH, BAR_HEIGHT, 0x333333);
    barBg.setOrigin(0.5);

    // Прогресс бар - заполнение (используем Rectangle для надежности)
    this.progressBar = this.add.rectangle(
      width / 2 - BAR_WIDTH / 2,
      height / 2 + 50,
      0,
      BAR_HEIGHT,
      0x00ff00
    );
    this.progressBar.setOrigin(0, 0.5);

    // Текст процентов - используем простой текст без текстуры
    this.progressText = this.add.text(width / 2, height / 2 + 100, '0%', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.progressText.setOrigin(0.5).setVisible(false); // Скрываем, используем DOM overlay
  }

  /**
   * Создать DOM overlay для текста
   * Решает проблему с ошибками текстур Phaser
   */
  private createDOMTextOverlay(): void {
    // ✅ КРИТИЧНО: Удаляем ВСЕ существующие DOM overlay из document.body
    // Это предотвращает дублирование при повторном создании LoadingScene (Phaser создает LoadingScene дважды)
    const existingOverlays = document.querySelectorAll('[data-loading-overlay="true"]');
    if (existingOverlays.length > 0) {
      existingOverlays.forEach(overlay => {
        try {
          document.body.removeChild(overlay);
        } catch (e) {
          // Игнорируем ошибки при удалении
        }
      });
    }

    this.domTextOverlay = document.createElement('div');
    this.domTextOverlay.setAttribute('data-loading-overlay', 'true'); // Маркер для глобальной очистки
    this.domTextOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      font-family: 'Nunito', sans-serif;
    `;

    // Заголовок
    const title = document.createElement('div');
    title.textContent = 'ArcadeQuiz';
    title.style.cssText = `
      font-size: 48px;
      color: #ffffff;
      margin-bottom: 150px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      font-weight: bold;
    `;
    this.domTextOverlay.appendChild(title);

    // Текст загрузки
    this.domLoadingText = document.createElement('div');
    this.domLoadingText.textContent = 'Загрузка...';
    this.domLoadingText.style.cssText = `
      font-size: 24px;
      color: #ffffff;
      margin-top: 80px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;
    this.domTextOverlay.appendChild(this.domLoadingText);

    // Текст процентов
    this.domProgressText = document.createElement('div');
    this.domProgressText.textContent = '0%';
    this.domProgressText.style.cssText = `
      font-size: 20px;
      color: #ffffff;
      margin-top: 10px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;
    this.domTextOverlay.appendChild(this.domProgressText);

    document.body.appendChild(this.domTextOverlay);
  }

  /**
   * Подписаться на события EventBus
   */
  private setupEventBusListeners(): void {
    // Подписываемся на события прогресса из MainScene
    EventBus.on(LOADING_PROGRESS_EVENT, (data: LoadingProgressEvent) => {
      try {
        this.setProgress(data.percent, data.text);
      } catch (error) {
        console.error('LoadingScene: Error in LOADING_PROGRESS_EVENT handler:', error);
      }
    });

    // Подписываемся на событие завершения загрузки
    EventBus.on(FINISH_LOADING_EVENT, () => {
      try {
        this.finishLoading();
      } catch (error) {
        console.error('LoadingScene: Error in FINISH_LOADING_EVENT handler:', error);
      }
    });
  }

  /**
   * Начать загрузку ресурсов
   */
  private startLoading(): void {
    // 1. Генерируем базовые текстуры
    this.generateBaseTextures();

    // 2. Загружаем PNG текстуры
    const heartKey = 'heart_icon';
    const heartPath = `${ASSETS_BASE_PATH}/images/Heart15x15.png`;
    this.load.image(heartKey, heartPath);

    this.load.spritesheet(KEYS.COIN, `${ASSETS_BASE_PATH}/images/Coin_192x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
      startFrame: 0,
      endFrame: 11
    });

    this.load.image(KEYS.PORTAL_CLOSED, `${ASSETS_BASE_PATH}/images/Portal.Door.Base_32x48.png`);
    this.load.image(KEYS.ORACLE, `${ASSETS_BASE_PATH}/images/Oracle.Base_32x64.png`);

    this.load.spritesheet(KEYS.BG_GRASS_SHEET, `${ASSETS_BASE_PATH}/images/Bg.Grass.64x64.png`, {
      frameWidth: 16,
      frameHeight: 16,
      startFrame: 0,
      endFrame: 15
    });

    this.load.spritesheet(KEYS.COLLISION_BUSH_SHEET, `${ASSETS_BASE_PATH}/images/CollisionObject.Bush.64x32.png`, {
      frameWidth: 32,
      frameHeight: 32,
      startFrame: 0,
      endFrame: 1
    });

    this.load.spritesheet(KEYS.COLLISION_STONE_SHEET, `${ASSETS_BASE_PATH}/images/CollisionObject.Stone.128x32.png`, {
      frameWidth: 32,
      frameHeight: 32,
      startFrame: 0,
      endFrame: 3
    });

    this.load.image(KEYS.QUESTION_BUBBLE, `${ASSETS_BASE_PATH}/images/BubbleMsg.Transparent136x56.png`);
    this.load.image(KEYS.PORTAL_QUESTION_BUBBLE, `${ASSETS_BASE_PATH}/images/BubbleMsg.Transparent128x36.png`);
    this.load.image(KEYS.COIN_HEART, `${ASSETS_BASE_PATH}/images/Coin5x5.png`);
    this.load.image(KEYS.POINTER, `${ASSETS_BASE_PATH}/images/Character.Pointer_3x3.png`); // ✅ Указатель направления движения

    // Dynamic Asset Loading Loop
    for (let i = 1; i <= MAX_LEVELS; i++) {
      this.load.image(LevelAssetKeys.getMapBgStandard(i), `${ASSETS_BASE_PATH}/images/Bg.Base_Standard_Level${i}_512x512.png`);
      this.load.image(LevelAssetKeys.getMapBgTiledBase(i), `${ASSETS_BASE_PATH}/images/Bg.Base_Tiled_Level${i}_512x512.png`);
      this.load.image(LevelAssetKeys.getMapBgTiledStruct(i), `${ASSETS_BASE_PATH}/images/Bg.Struct_Tiled_Level${i}_512x512.png`);
      this.load.image(LevelAssetKeys.getMapBgTiledOverlay(i), `${ASSETS_BASE_PATH}/images/Bg.Overlay_Tiled_Level${i}_512x512.png`);
    }

    this.load.image(KEYS.PORTAL_BASE_NEW, `${ASSETS_BASE_PATH}/images/Portal.Door.Base_32x48.png`);
    this.load.image(KEYS.PORTAL_ACTIVATION_NEW, `${ASSETS_BASE_PATH}/images/Portal.Door.Base_32x48.png`);
    this.load.spritesheet(KEYS.PORTAL_ACTIVATED_NEW, `${ASSETS_BASE_PATH}/images/Portal.Door.Activated_24F_768x48.png`, {
      frameWidth: 32,
      frameHeight: 48
    });

    // 3. Инициализируем AnimationManager и загружаем спрайтшиты
    this.animationManager = new AnimationManager(this);
    SPRITESHEET_CONFIGS.forEach((config) => {
      this.animationManager!.loadSpritesheet(config.load);
    });

    // ✅ Этап 1: Загрузка ассетов (0-50%)
    this.load.on('progress', (value: number) => {
      const progress = value * 50; // 0-50%
      EventBus.emit(LOADING_PROGRESS_EVENT, {
        percent: progress,
        text: 'Загрузка ассетов...'
      });
    });

    // Обработчик завершения загрузки ассетов
    this.load.once('complete', async () => {
      logger.log('ASSET_LOAD', 'LoadingScene: All assets loaded');

      // Создаём анимации (как в оригинале)
      SPRITESHEET_CONFIGS.forEach((config) => {
        this.animationManager!.createAnimations(config.load.key, config.animations);
      });

      try {
        await this.loadLevelConfigs();
      } catch (error) {
        logger.warn('ASSET_LOAD', `LoadingScene: Failed to load level configs: ${error}`);
      }

      try {
        await this.loadLevelQuestions();
      } catch (error) {
        logger.warn('QUIZ', `LoadingScene: Failed to load level questions: ${error}`);
      }

      // ✅ Запускаем MainScene параллельно (используем launch вместо start)
      logger.log('LOADING_SCENE', 'Launching MainScene...');
      this.scene.launch('MainScene');
    });

    this.load.once('loaderror', (file: any) => {
      if (file.key === heartKey) {
        logger.warn('ASSET_LOAD', 'LoadingScene: Failed to load heart texture, using fallback');
      }
    });

    this.load.start();
  }

  /**
   * Реализация IProgressReporter.setProgress()
   * Обновляет UI прогресс-бара
   */
  setProgress(percent: number, text: string): void {
    if (this.isFinishing) {
      return;
    }

    this.currentProgress = Math.max(0, Math.min(100, percent));

    // Обновляем Phaser прогресс-бар (Graphics - без текстур)
    if (this.progressBar && !this.isFinishing) {
      try {
        const newWidth = BAR_WIDTH * (this.currentProgress / 100);
        this.progressBar.width = newWidth;
      } catch (e) {
        // Игнорируем ошибки
      }
    }

    // ✅ Обновляем DOM текст (без ошибок текстур!)
    if (this.domLoadingText) {
      this.domLoadingText.textContent = text;
    }

    if (this.domProgressText) {
      const percentText = `${Math.round(this.currentProgress)}%`;
      this.domProgressText.textContent = percentText;
    }

    // Старые Phaser Text объекты больше не используются, но оставляем для совместимости
    if (this.loadingText && !this.isFinishing) {
      try {
        this.loadingText.setText(text);
      } catch (e) {
        // Игнорируем ошибки текстур
      }
    }

    if (this.progressText && !this.isFinishing) {
      try {
        const percentText = `${Math.round(this.currentProgress)}%`;
        this.progressText.setText(percentText);
      } catch (e) {
        // Игнорируем ошибки текстур
      }
    }

    logger.log('LOADING_SCENE', `Progress: ${this.currentProgress}% - ${text}`);
  }

  /**
   * Реализация IProgressReporter.finishLoading()
   * Завершает загрузку и уничтожает LoadingScene
   */
  finishLoading(): void {
    // ✅ КРИТИЧНО: Проверяем глобальный флаг (работает между экземплярами)
    if (globalFinishLoadingExecuted) {
      return;
    }

    globalFinishLoadingExecuted = true; // Устанавливаем глобальный флаг сразу
    this.isFinished = true; // Также устанавливаем локальный флаг

    // Unsubscribe from events BEFORE updating UI
    EventBus.off(LOADING_PROGRESS_EVENT);
    EventBus.off(FINISH_LOADING_EVENT);

    // Final UI update
    this.setProgress(100, 'Готово!');

    // ✅ UX Fix: Ждем 300мс, чтобы пользователь успел увидеть "100%", и только потом убираем
    // ✅ UX Fix: Ждем 300мс, чтобы пользователь успел увидеть "100%", и только потом убираем
    // Используем setTimeout вместо this.time.delayedCall, чтобы таймер сработал, 
    // даже если MainScene поставит LoadingScene на паузу (Race Condition Fix)
    setTimeout(() => {
      // ✅ КРИТИЧНО: Удаляем ВСЕ DOM overlay глобально (защита от двойного вызова)
      const allOverlays = document.querySelectorAll('[data-loading-overlay="true"]');
      if (allOverlays.length > 0) {
        allOverlays.forEach(overlay => {
          try {
            (overlay as HTMLElement).style.display = 'none';
            document.body.removeChild(overlay);
          } catch (e) {
            // Игнорируем ошибки
          }
        });
      }

      this.domTextOverlay = undefined;
      this.isFinishing = true;

      // ✅ Stop the scene to free resources
      // Проверяем наличие сцены и систем, чтобы избежать 'queueOp' error
      if (this.sys && this.scene) {
        try {
          if (this.sys.isActive() || this.sys.isPaused()) {
            this.scene.stop('LoadingScene');
          }
        } catch (err) {
          // Игнорируем ошибки
        }
      }
    }, 300);
  }

  /**
   * Минимальный update() — не содержит логики
   * LoadingScene остаётся active но не тратит CPU
   * Прогресс обновляется через EventBus + setProgress()
   */
  update(): void {
    // ✅ Пустой — progress обновляется через EventBus
  }

  private generateBaseTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x2d3748);
    graphics.fillRect(0, 0, 16, 16);
    graphics.lineStyle(1, 0x4a5568);
    graphics.strokeRect(0, 0, 16, 16);
    graphics.generateTexture(KEYS.TILE, 16, 16);
    graphics.clear();

    graphics.fillStyle(0xe53e3e);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture(KEYS.ENEMY, 32, 32);
    graphics.clear();

    graphics.fillStyle(0x9f7aea);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(2, 0x553c9a);
    graphics.strokeCircle(16, 16, 14);
    graphics.generateTexture(KEYS.CHASER, 32, 32);
    graphics.clear();

    graphics.fillStyle(0xd53f8c);
    graphics.fillRect(8, 8, 16, 16);
    graphics.generateTexture(KEYS.HEART, 32, 32);
    graphics.clear();

    graphics.fillStyle(0x00ff00, 0.3);
    graphics.fillRect(0, 0, 8, 8);
    graphics.generateTexture(KEYS.OVERLAP_TILE, 8, 8);
    graphics.clear();
  }

  private async loadLevelConfigs(): Promise<void> {
    logger.log('ASSET_LOAD', 'LoadingScene: Loading level configs via dynamic import...');

    for (let i = 1; i <= MAX_LEVELS; i++) {
      try {
        const configModule = await import(`../../config/levelConfigs/level${i}.config.json`);
        const configData = configModule.default || configModule;
        const cacheKey = LevelAssetKeys.getLevelConfig(i);
        this.cache.json.add(cacheKey, configData);
        logger.log('ASSET_LOAD', `LoadingScene: Level ${i} config loaded as "${cacheKey}"`);
      } catch (error) {
        logger.warn('ASSET_LOAD', `LoadingScene: Failed to load level ${i} config: ${error}`);
        throw error;
      }
    }

    logger.log('ASSET_LOAD', `LoadingScene: All ${MAX_LEVELS} level configs loaded successfully`);
  }

  private async loadLevelQuestions(): Promise<void> {
    try {
      const levelData = await this.assetLoader.loadJSON(`questions/level1.questions.json`);
      logger.log('QUIZ', 'LoadingScene: Level 1 questions loaded');
    } catch (error) {
      logger.warn('QUIZ', `LoadingScene: Failed to load level questions, will use defaults: ${error}`);
    }
  }

  create() {
    // ✅ КРИТИЧНО: Поднимаем LoadingScene поверх MainScene
    // Это гарантирует, что Phaser Graphics (прогресс-бар) будут видны
    // даже после запуска MainScene через scene.launch()
    this.scene.bringToTop();
  }
}
