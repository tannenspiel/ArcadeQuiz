import Phaser from 'phaser';
import { EventBus } from '@/game/EventBus';
import { LOADING_PROGRESS_EVENT, FINISH_LOADING_EVENT, LoadingProgressEvent } from '@/constants/gameConstants';
import { logger } from '@/utils/logger';
import { AnimationManager } from '@/game/managers/AnimationManager';
import { IProgressReporter } from '@/types/IProgressReporter';
import { ASSET_CONFIGS } from '@/config/assetConfig';
import { LEVEL_CONFIGS } from '@/config/levelConfigs';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 30;

/**
 * Сцена загрузки с использованием DOM элементов
 * Решает проблему с ошибками текстур Phaser
 */
export class LoadingSceneDOM extends Phaser.Scene implements IProgressReporter {
    private currentProgress: number = 0;
    private isFinishing: boolean = false;
    private animationManager?: AnimationManager;

    // DOM элементы
    private domContainer?: HTMLDivElement;
    private domLoadingText?: HTMLDivElement;
    private domProgressBar?: HTMLDivElement;
    private domProgressText?: HTMLDivElement;

    constructor() {
        super({ key: 'LoadingScene' });
    }

    init() {
        logger.log('LOADING_SCENE', 'LoadingScene: init()');
        this.currentProgress = 0;
        this.isFinishing = false;
    }

    preload() {
        this.initBaseSystems();
        this.createDOMLoadingUI();
        this.setupEventBusListeners();
        this.startLoading();
    }

    private initBaseSystems(): void {
        this.animationManager = new AnimationManager(this);
    }

    /**
     * Создать DOM UI загрузки
     */
    private createDOMLoadingUI(): void {
        this.domContainer = document.createElement('div');
        this.domContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;

        const title = document.createElement('div');
        title.textContent = 'ArcadeQuiz';
        title.style.cssText = `
      font-size: 48px;
      color: #ffffff;
      margin-bottom: 50px;
    `;
        this.domContainer.appendChild(title);

        this.domLoadingText = document.createElement('div');
        this.domLoadingText.textContent = 'Загрузка...';
        this.domLoadingText.style.cssText = `
      font-size: 24px;
      color: #ffffff;
      margin-bottom: 20px;
    `;
        this.domContainer.appendChild(this.domLoadingText);

        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
      width: ${BAR_WIDTH}px;
      height: ${BAR_HEIGHT}px;
      background: #333333;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 10px;
    `;

        this.domProgressBar = document.createElement('div');
        this.domProgressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: #00ff00;
      transition: width 0.1s ease-out;
    `;
        barContainer.appendChild(this.domProgressBar);
        this.domContainer.appendChild(barContainer);

        this.domProgressText = document.createElement('div');
        this.domProgressText.textContent = '0%';
        this.domProgressText.style.cssText = `
      font-size: 20px;
      color: #ffffff;
    `;
        this.domContainer.appendChild(this.domProgressText);

        document.body.appendChild(this.domContainer);
    }

    private setupEventBusListeners(): void {
        EventBus.on(LOADING_PROGRESS_EVENT, (data: LoadingProgressEvent) => {
            try {
                this.setProgress(data.percent, data.text);
            } catch (error) {
                console.error('[DEBUG] LoadingScene: Error in LOADING_PROGRESS_EVENT handler:', error);
            }
        });

        EventBus.on(FINISH_LOADING_EVENT, () => {
            try {
                this.finishLoading();
            } catch (error) {
                console.error('[DEBUG] LoadingScene: Error in FINISH_LOADING_EVENT handler:', error);
            }
        });
    }

    private startLoading(): void {
        this.load.setPath('assets/');

        // Загрузка всех ассетов
        ASSET_CONFIGS.forEach(config => {
            if (config.type === 'spritesheet' && config.load) {
                this.load.spritesheet(config.load.key, config.load.url, config.load.frameConfig);
            } else if (config.type === 'image' && config.load) {
                this.load.image(config.load.key, config.load.url);
            }
        });

        this.load.on('progress', (value: number) => {
            const percent = Math.floor(value * 50);
            this.setProgress(percent, 'Загрузка ассетов...');
        });

        this.load.once('complete', () => {
            ASSET_CONFIGS.forEach(config => {
                if (config.animations && this.animationManager) {
                    this.animationManager.createAnimations(config.load.key, config.animations);
                }
            });

            this.scene.launch('MainScene');
        });
    }

    setProgress(percent: number, text: string): void {
        if (this.isFinishing) {
            return;
        }

        this.currentProgress = Math.max(0, Math.min(100, percent));

        if (this.domProgressBar) {
            this.domProgressBar.style.width = `${this.currentProgress}%`;
        }

        if (this.domLoadingText) {
            this.domLoadingText.textContent = text;
        }

        if (this.domProgressText) {
            this.domProgressText.textContent = `${Math.round(this.currentProgress)}%`;
        }

        logger.log('LOADING_SCENE', `Progress: ${this.currentProgress}% - ${text}`);
    }

    finishLoading(): void {
        this.isFinishing = true;

        EventBus.off(LOADING_PROGRESS_EVENT);
        EventBus.off(FINISH_LOADING_EVENT);

        this.setProgress(100, 'Готово!');

        this.time.delayedCall(300, () => {
            if (this.domContainer) {
                document.body.removeChild(this.domContainer);
                this.domContainer = undefined;
            }
            this.scene.stop('LoadingScene');
        });
    }
}
