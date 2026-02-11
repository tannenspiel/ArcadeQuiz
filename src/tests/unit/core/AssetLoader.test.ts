/**
 * Unit тесты для AssetLoader
 */

import { AssetLoader } from '../../../game/core/AssetLoader';
import Phaser from 'phaser';

// Моки
jest.mock('phaser', () => ({
  Scene: class MockScene {
    textures = {
      exists: jest.fn()
    };
    load = {
      image: jest.fn(),
      audio: jest.fn(),
      json: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      start: jest.fn(),
      isLoading: jest.fn().mockReturnValue(false)
    };
  }
}));

// Мок для fetch
global.fetch = jest.fn();

describe('AssetLoader', () => {
  let mockScene: Phaser.Scene;
  let assetLoader: AssetLoader;

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: 'test' }) as any;
    assetLoader = new AssetLoader(mockScene);
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // ✅ Mock для аудио системы (для loadAudio через fetch)
    mockScene.sound = {
      context: {
        decodeAudioData: jest.fn().mockResolvedValue({ duration: 1.0 })
      },
      add: jest.fn().mockReturnValue({
        play: jest.fn(),
        destroy: jest.fn()
      }),
      locked: false
    };
    mockScene.cache = {
      audio: {
        exists: jest.fn().mockReturnValue(false),
        add: jest.fn()
      }
    };
  });

  describe('loadImage', () => {
    it('должен возвращать кэшированное изображение, если уже загружено', async () => {
      // Симулируем, что ассет уже загружен
      (assetLoader as any).loadedAssets.set('test_image', true);

      await assetLoader.loadImage('test_image', 'test.png');

      expect(mockScene.load.image).not.toHaveBeenCalled();
    });

    it('должен использовать существующую текстуру, если она есть', async () => {
      mockScene.textures.exists = jest.fn().mockReturnValue(true);

      await assetLoader.loadImage('test_image', 'test.png');

      expect(mockScene.textures.exists).toHaveBeenCalledWith('test_image');
      expect(mockScene.load.image).not.toHaveBeenCalled();
    });

    it('должен загружать изображение через scene.load.image', async () => {
      mockScene.textures.exists = jest.fn().mockReturnValue(false);
      
      // Симулируем успешную загрузку
      const onComplete = jest.fn();
      mockScene.load.once = jest.fn((event, callback) => {
        if (event === 'filecomplete-image-test_image') {
          setTimeout(() => callback(), 0);
        }
        return mockScene.load;
      });

      const promise = assetLoader.loadImage('test_image', 'test.png');
      
      // Вызываем callback для завершения загрузки
      const callbacks = (mockScene.load.once as jest.Mock).mock.calls;
      const completeCallback = callbacks.find(([event]) => event === 'filecomplete-image-test_image')?.[1];
      if (completeCallback) {
        completeCallback();
      }

      await promise;

      expect(mockScene.load.image).toHaveBeenCalledWith(
        'test_image',
        expect.stringContaining('/images/test.png')
      );
    });

    it('должен обрабатывать ошибки загрузки', async () => {
      mockScene.textures.exists = jest.fn().mockReturnValue(false);
      
      const errorFile = { key: 'test_image', src: 'test.png', type: 'image', state: 'error' };
      mockScene.load.once = jest.fn((event, callback) => {
        if (event === 'loaderror') {
          setTimeout(() => callback(errorFile), 0);
        }
        return mockScene.load;
      });

      await expect(assetLoader.loadImage('test_image', 'test.png')).rejects.toThrow();
    });
  });

  describe('loadAudio', () => {
    it('должен возвращать кэшированное аудио, если уже загружено', async () => {
      (assetLoader as any).loadedAssets.set('test_audio', true);

      await assetLoader.loadAudio('test_audio', 'test.mp3');

      expect(mockScene.load.audio).not.toHaveBeenCalled();
    });

    it('должен загружать аудио через scene.load.audio + scene.load.start', async () => {
      mockScene.cache = {
        audio: {
          exists: jest.fn().mockReturnValue(false)
        }
      } as any;

      // Симулируем успешную загрузку
      const onComplete = jest.fn();
      mockScene.load.once = jest.fn((event, callback) => {
        if (event === 'filecomplete-audio-test_audio') {
          setTimeout(() => callback(), 0);
        }
        return mockScene.load;
      });

      const promise = assetLoader.loadAudio('test_audio', 'test.mp3');

      // Вызываем callback для завершения загрузки
      const callbacks = (mockScene.load.once as jest.Mock).mock.calls;
      const completeCallback = callbacks.find(([event]) => event === 'filecomplete-audio-test_audio')?.[1];
      if (completeCallback) {
        completeCallback();
      }

      await promise;

      expect(mockScene.load.audio).toHaveBeenCalledWith(
        'test_audio',
        expect.stringContaining('/audio/test.mp3')
      );
      expect(mockScene.load.start).toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки загрузки аудио', async () => {
      mockScene.cache = {
        audio: {
          exists: jest.fn().mockReturnValue(false)
        }
      } as any;

      const errorFile = { key: 'test_audio', src: 'test.mp3', type: 'audio', state: 'error' };
      mockScene.load.once = jest.fn((event, callback) => {
        if (event === 'loaderror') {
          setTimeout(() => callback(errorFile), 0);
        }
        return mockScene.load;
      });

      await expect(assetLoader.loadAudio('test_audio', 'test.mp3')).rejects.toThrow();
    });
  });

  describe('loadJSON', () => {
    it('должен загружать JSON файл через fetch', async () => {
      const mockData = { level: 1, enemies: 5 };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const result = await assetLoader.loadJSON('questions/level1.questions.json');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/questions/level1.questions.json')
      );
      expect(result).toEqual(mockData);
    });

    it('должен использовать абсолютный путь для config/', async () => {
      const mockData = { level: 1 };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const result = await assetLoader.loadJSON('config/levelConfigs/level1.config.json');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/src/config/levelConfigs/level1.config.json')
      );
      expect(result).toEqual(mockData);
    });

    it('должен обрабатывать ошибки загрузки JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(assetLoader.loadJSON('invalid.json')).rejects.toThrow();
    });

    it('должен обрабатывать сетевые ошибки', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(assetLoader.loadJSON('test.json')).rejects.toThrow('Network error');
    });
  });

  describe('Кэширование', () => {
    it('должен проверять, загружен ли ассет', () => {
      expect(assetLoader.isLoaded('test')).toBe(false);
      
      (assetLoader as any).loadedAssets.set('test', true);
      expect(assetLoader.isLoaded('test')).toBe(true);
    });

    it('должен получать загруженный ассет', () => {
      const asset = { data: 'test' };
      (assetLoader as any).loadedAssets.set('test', asset);
      
      expect(assetLoader.getAsset('test')).toEqual(asset);
    });

    it('должен очищать кэш', () => {
      (assetLoader as any).loadedAssets.set('test', true);
      assetLoader.clearCache();
      
      expect(assetLoader.isLoaded('test')).toBe(false);
    });
  });
});


