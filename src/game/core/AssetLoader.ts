/**
 * Централизованная загрузка ресурсов
 * Загружает ресурсы по CURRENT_THEME
 */

import Phaser from 'phaser';
import { CURRENT_THEME, ASSETS_BASE_PATH } from '../../config/gameConfig';
import { logger } from '../../utils/Logger';

export class AssetLoader {
  private scene: Phaser.Scene;
  private loadedAssets: Map<string, any> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Загружает изображение
   */
  public loadImage(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedAssets.has(key)) {
        logger.log('ASSET_CACHE', `Image already loaded (cached): ${key}`);
        resolve();
        return;
      }

      const fullPath = `${ASSETS_BASE_PATH}/images/${path}`;
      logger.log('ASSET_LOAD', `AssetLoader.loadImage: ${key}, ${path}, ${fullPath}`);

      // Проверяем, не загружена ли уже текстура
      if (this.scene.textures.exists(key)) {
        logger.log('ASSET_CACHE', `Image texture already exists: ${key}`);
        this.loadedAssets.set(key, true);
        resolve();
        return;
      }

      // ✅ Регистрируем обработчики ПЕРЕД вызовом load.image
      const onComplete = () => {
        logger.log('ASSET_LOAD', `Image loaded successfully: ${key} ${fullPath}`);
        this.loadedAssets.set(key, true);
        this.scene.load.off('filecomplete-image-' + key, onComplete);
        this.scene.load.off('loaderror', onError);
        resolve();
      };

      const onError = (file: any) => {
        console.error('🔴 Load error event:', file);
        if (file && (file.key === key || file.src === fullPath)) {
          console.error(`❌ Failed to load image: ${fullPath}`, {
            key: file.key,
            src: file.src,
            type: file.type,
            state: file.state
          });
          this.scene.load.off('filecomplete-image-' + key, onComplete);
          this.scene.load.off('loaderror', onError);
          reject(new Error(`Failed to load image: ${fullPath}. Key: ${file.key || key}`));
        }
      };

      this.scene.load.once('filecomplete-image-' + key, onComplete);
      this.scene.load.once('loaderror', onError);

      logger.log('ASSET_LOAD', `Registering image load: ${key} ${fullPath}`);
      this.scene.load.image(key, fullPath);

      // Запускаем загрузку только если она еще не идет
      if (!this.scene.load.isLoading()) {
        logger.log('ASSET_LOAD', 'Starting image load...');
        this.scene.load.start();
      } else {
        logger.log('ASSET_LOAD', 'Image load already in progress, queuing...');
      }
    });
  }

  /**
   * Загружает спрайтшит
   */
  public loadSpritesheet(key: string, path: string, frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedAssets.has(key)) {
        logger.log('ASSET_CACHE', `Spritesheet already loaded (cached): ${key}`);
        resolve();
        return;
      }

      const fullPath = `${ASSETS_BASE_PATH}/images/${path}`;
      logger.log('ASSET_LOAD', `AssetLoader.loadSpritesheet: ${key}, ${path}, ${fullPath}, ${JSON.stringify(frameConfig)}`);

      if (this.scene.textures.exists(key)) {
        logger.log('ASSET_CACHE', `Spritesheet texture already exists: ${key}`);
        this.loadedAssets.set(key, true);
        resolve();
        return;
      }

      const onComplete = () => {
        logger.log('ASSET_LOAD', `Spritesheet loaded successfully: ${key} ${fullPath}`);
        this.loadedAssets.set(key, true);
        this.scene.load.off('filecomplete-spritesheet-' + key, onComplete);
        this.scene.load.off('loaderror', onError);
        resolve();
      };

      const onError = (file: any) => {
        if (file && (file.key === key || file.src === fullPath)) {
          console.error(`❌ Failed to load spritesheet: ${fullPath}`, file);
          this.scene.load.off('filecomplete-spritesheet-' + key, onComplete);
          this.scene.load.off('loaderror', onError);
          reject(new Error(`Failed to load spritesheet: ${fullPath}`));
        }
      };

      this.scene.load.once('filecomplete-spritesheet-' + key, onComplete);
      this.scene.load.once('loaderror', onError);

      this.scene.load.spritesheet(key, fullPath, frameConfig);

      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  /**
   * Загружает аудио файл
   * ✅ ИСПОЛЬЗУЕТ scene.load.audio() + scene.load.start() - работает даже вне preload фазы
   */
  public loadAudio(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedAssets.has(key)) {
        logger.log('AUDIO', `Audio already loaded (cached): ${key}`);
        resolve();
        return;
      }

      const fullPath = `${ASSETS_BASE_PATH}/audio/${path}`;
      logger.log('AUDIO', `AssetLoader.loadAudio: ${key}, ${path}, ${fullPath}`);

      // Проверяем, не загружен ли уже звук в Phaser кеше
      if (this.scene.cache?.audio?.exists && this.scene.cache.audio.exists(key)) {
        logger.log('AUDIO', `Audio already exists in cache: ${key}`);
        this.loadedAssets.set(key, true);
        resolve();
        return;
      }

      // ✅ Регистрируем обработчики ПЕРЕД вызовом load.audio
      const onComplete = () => {
        logger.log('AUDIO', `Audio loaded successfully: ${key} ${fullPath}`);
        this.loadedAssets.set(key, true);
        this.scene.load.off('filecomplete-audio-' + key, onComplete);
        this.scene.load.off('loaderror', onError);
        resolve();
      };

      const onError = (file: any) => {
        console.error('🔴 Load error event:', file);
        if (file && (file.key === key || file.src === fullPath)) {
          console.error(`❌ Failed to load audio: ${fullPath}`, {
            key: file.key,
            src: file.src,
            type: file.type,
            state: file.state
          });
          this.scene.load.off('filecomplete-audio-' + key, onComplete);
          this.scene.load.off('loaderror', onError);
          reject(new Error(`Failed to load audio: ${fullPath}. Key: ${file.key || key}`));
        }
      };

      this.scene.load.once('filecomplete-audio-' + key, onComplete);
      this.scene.load.once('loaderror', onError);

      logger.log('ASSET_LOAD', `Registering audio load: ${key} ${fullPath}`);
      this.scene.load.audio(key, fullPath);

      // ✅ ВСЕГДА запускаем загрузку (Phaser сам обработает очередь)
      // Если загрузка уже идет, новые файлы добавятся в очередь
      logger.log('ASSET_LOAD', 'Starting audio load...');
      this.scene.load.start();
    });
  }

  /**
   * Загружает JSON файл
   */
  public async loadJSON<T>(path: string): Promise<T> {
    // Если путь начинается с config/, используем абсолютный путь от корня
    let fullPath: string;
    if (path.startsWith('config/')) {
      fullPath = `/src/${path}`;
    } else {
      fullPath = `${ASSETS_BASE_PATH}/${path}`;
    }

    try {
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${fullPath} (${response.status})`);
      }
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`Error loading JSON: ${fullPath}`, error);
      throw error;
    }
  }

  /**
   * Получить загруженный ассет
   */
  public getAsset(key: string): any {
    return this.loadedAssets.get(key);
  }

  /**
   * Проверить, загружен ли ассет
   */
  public isLoaded(key: string): boolean {
    return this.loadedAssets.has(key);
  }

  /**
   * Очистить кеш
   */
  public clearCache(): void {
    this.loadedAssets.clear();
  }
  /**
   * Получить JSON из кеша Phaser
   */
  public getJSON(key: string): any {
    return this.scene.cache.json.get(key);
  }
}

