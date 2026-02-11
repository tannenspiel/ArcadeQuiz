/**
 * Unit тесты для AudioManager
 */

// ✅ Mock gameConfig BEFORE importing AudioManager
// This must be done before the import to ensure the config is mocked at load time
jest.mock('../../../config/gameConfig', () => ({
  SOUND_ENABLED: true,
  SOUND_VOLUME: 0.5,
  ASSETS_BASE_PATH: '/assets/Game_01',
  CURRENT_THEME: 'Game_01',
  AB_TESTING: {
    ENABLE_FEEDBACKS: true,
    ENABLE_WRONG_FEEDBACKS: true,
    ENABLE_PORTAL_CONFIRMATION: true,
    USE_NINE_SLICE_MODAL: true,
    USE_NINE_SLICE_BUTTON: true,
    ENABLE_ORACLE_COIN_INDICATORS: true
  },
  USE_QUESTION_BUBBLE: true,
  DEBUG_UI_ENABLED: false,
  __esModule: true
}), { virtual: true });

// Моки
jest.mock('../../../game/core/AssetLoader');

import { AudioManager } from '../../../game/systems/AudioManager';
import { AssetLoader } from '../../../game/core/AssetLoader';
import { SOUND_KEYS, SOUND_VOLUMES } from '../../../constants/gameConstants';
import Phaser from 'phaser';

describe('AudioManager', () => {
  let mockScene: any;
  let mockAssetLoader: jest.Mocked<AssetLoader>;
  let audioManager: AudioManager;

  // Mock sound object
  let mockSound: any;

  beforeEach(() => {
    // Create a factory function for mock sounds to return fresh objects each time
    const createMockSound = (key: string = 'mock_sound') => {
      const soundObj: any = {
        key,
        volume: 1.0,
        isPlaying: false,

        // Methods that return this for chaining
        play: jest.fn().mockImplementation(function() {
          soundObj.isPlaying = true;
          return soundObj;
        }),
        stop: jest.fn().mockImplementation(function() {
          soundObj.isPlaying = false;
          return soundObj;
        }),
        setVolume: jest.fn().mockImplementation(function(vol: number) {
          soundObj.volume = vol;
          return soundObj;
        }),
        destroy: jest.fn().mockImplementation(function() {
          soundObj.isPlaying = false;
          return soundObj;
        })
      };
      return soundObj;
    };

    mockSound = createMockSound();

    // Create mock scene with sound property
    mockScene = {
      sound: {
        add: jest.fn().mockImplementation((key: string) => {
          // Return a fresh mock sound object for each call
          return createMockSound(key);
        }),
        pauseAll: jest.fn(),
        resumeAll: jest.fn(),
        locked: false // ✅ AudioContext не заблокирован
      }
    };

    mockAssetLoader = {
      loadAudio: jest.fn().mockResolvedValue(undefined)
    } as any;

    audioManager = new AudioManager(mockScene as any, mockAssetLoader);

    // ✅ Включаем звук по умолчанию для тестов
    // (дефолтное значение muted=true может ломать тесты воспроизведения)
    audioManager.setMuted(false);
  });

  describe('Загрузка звуков', () => {
    it('должен загружать звук через AssetLoader', async () => {
      await audioManager.loadSound('test_sound', 'test.mp3');

      expect(mockAssetLoader.loadAudio).toHaveBeenCalledWith('test_sound', 'test.mp3');
    });

    it('должен обрабатывать ошибки загрузки', async () => {
      mockAssetLoader.loadAudio = jest.fn().mockRejectedValue(new Error('Load failed'));

      await audioManager.loadSound('test_sound', 'test.mp3');

      // Не должно выбрасывать ошибку, только логировать
      expect(mockAssetLoader.loadAudio).toHaveBeenCalled();
    });
  });

  describe('Воспроизведение звуков', () => {
    it('должен воспроизводить звук', () => {
      const sound = audioManager.playSound('test_sound', 0.5);

      expect(mockScene.sound.add).toHaveBeenCalledWith(
        'test_sound',
        expect.objectContaining({
          volume: expect.any(Number)
        })
      );
      expect(sound).toBeDefined();
    });

    it('не должен воспроизводить звук, если звук выключен', () => {
      audioManager.setMuted(true);
      const sound = audioManager.playSound('test_sound');

      expect(sound).toBeNull();
      expect(mockScene.sound.add).not.toHaveBeenCalled();

      // ✅ Возвращаем звук обратно для следующих тестов
      audioManager.setMuted(false);
    });

    it('должен учитывать громкость звука', () => {
      audioManager.setSoundVolume(0.5);
      audioManager.playSound('test_sound', 0.8);

      const call = (mockScene.sound.add as jest.Mock).mock.calls[0];
      expect(call[1].volume).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Воспроизведение музыки', () => {
    it('должен воспроизводить музыку с зацикливанием', async () => {
      await audioManager.playMusic('test_music', 'test.mp3', 0.7);

      expect(mockAssetLoader.loadAudio).toHaveBeenCalledWith('test_music', 'test.mp3');
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        'test_music',
        expect.objectContaining({
          volume: expect.any(Number),
          loop: true
        })
      );
    });

    it('должен останавливать предыдущую музыку при запуске новой', async () => {
      // Create mock music objects
      const mockMusic1 = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        volume: 0.7
      };
      const mockMusic2 = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        volume: 0.7
      };

      // Set up mock to return different music objects
      (mockScene.sound.add as jest.Mock)
        .mockReturnValueOnce(mockMusic1)
        .mockReturnValueOnce(mockMusic2);

      await audioManager.playMusic('music1', 'music1.mp3');
      await audioManager.playMusic('music2', 'music2.mp3');

      expect(mockMusic1.stop).toHaveBeenCalled();
    });

    it('не должен воспроизводить музыку, если звук выключен', async () => {
      audioManager.setMuted(true);
      await audioManager.playMusic('test_music', 'test.mp3');

      expect(mockAssetLoader.loadAudio).not.toHaveBeenCalled();
    });
  });

  describe('Управление музыкой', () => {
    it('должен останавливать музыку', async () => {
      const mockMusic = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        volume: 0.7
      };
      (mockScene.sound.add as jest.Mock).mockReturnValueOnce(mockMusic);
      await audioManager.playMusic('test_music', 'test.mp3');

      audioManager.stopMusic();

      expect(mockMusic.stop).toHaveBeenCalled();
    });
  });

  describe('Управление громкостью', () => {
    it('должен устанавливать громкость мастера', () => {
      audioManager.setMasterVolume(0.5);
      expect(audioManager.getMasterVolume()).toBe(0.5);
    });

    it('должен ограничивать громкость мастера в пределах 0-1', () => {
      audioManager.setMasterVolume(-1);
      expect(audioManager.getMasterVolume()).toBe(0);

      audioManager.setMasterVolume(2);
      expect(audioManager.getMasterVolume()).toBe(1);
    });

    it('должен устанавливать громкость музыки', () => {
      audioManager.setMusicVolume(0.6);
      expect(audioManager.getMusicVolume()).toBe(0.6);
    });

    it('должен устанавливать громкость звуков', () => {
      audioManager.setSoundVolume(0.8);
      expect(audioManager.getSoundVolume()).toBe(0.8);
    });
  });

  describe('Пауза и возобновление', () => {
    it('должен ставить на паузу все звуки', () => {
      audioManager.pauseAll();

      expect(mockScene.sound.pauseAll).toHaveBeenCalled();
    });

    it('должен возобновлять все звуки', () => {
      audioManager.resumeAll();

      expect(mockScene.sound.resumeAll).toHaveBeenCalled();
    });

    it('должен ставить на паузу при выключении звука', () => {
      audioManager.setMuted(true);

      expect(mockScene.sound.pauseAll).toHaveBeenCalled();
    });

    it('должен возобновлять при включении звука', () => {
      audioManager.setMuted(true);
      audioManager.setMuted(false);

      expect(mockScene.sound.resumeAll).toHaveBeenCalled();
    });
  });

  describe('Переключение звука (toggleMute)', () => {
    it('должен переключать muted с true на false', () => {
      audioManager.setMuted(true);
      expect(audioManager.isMuted()).toBe(true);

      const newMuted = audioManager.toggleMute();
      expect(newMuted).toBe(false);
      expect(audioManager.isMuted()).toBe(false);
    });

    it('должен переключать muted с false на true', () => {
      audioManager.setMuted(false);
      expect(audioManager.isMuted()).toBe(false);

      const newMuted = audioManager.toggleMute();
      expect(newMuted).toBe(true);
      expect(audioManager.isMuted()).toBe(true);
    });

    it('должен запускать фоновую музыку при включении звука, если её нет', async () => {
      audioManager.setMuted(true);

      // playBackgroundMusic должен быть вызван при включении звука
      const playBackgroundMusicSpy = jest.spyOn(audioManager, 'playBackgroundMusic');

      audioManager.toggleMute(); // Включаем звук

      // Проверяем, что playBackgroundMusic был вызван (музыка запущена)
      expect(playBackgroundMusicSpy).toHaveBeenCalled();
    });

    it('должен ставить музыку на паузу при выключении звука', async () => {
      const mockMusic = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        pause: jest.fn().mockReturnThis(),
        resume: jest.fn().mockReturnThis(),
        isPlaying: true,
        volume: 0.7
      };
      (mockScene.sound.add as jest.Mock).mockReturnValueOnce(mockMusic);

      await audioManager.playMusic('test_music', 'test.mp3');
      expect(mockMusic.isPlaying).toBe(true);

      audioManager.toggleMute(); // Выключаем звук

      expect(mockMusic.pause).toHaveBeenCalled();
    });
  });

  describe('Проверка состояния', () => {
    it('должен проверять, выключен ли звук', () => {
      // ✅ В beforeEach звук включен, поэтому проверяем что он включен
      expect(audioManager.isMuted()).toBe(false);

      audioManager.setMuted(true);
      expect(audioManager.isMuted()).toBe(true);

      // ✅ Возвращаем обратно
      audioManager.setMuted(false);
    });
  });

  describe('Уничтожение', () => {
    it('должен уничтожать все звуки', () => {
      const mockSound = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        destroy: jest.fn().mockReturnThis(),
        volume: 1.0
      };
      (mockScene.sound.add as jest.Mock).mockReturnValueOnce(mockSound);

      audioManager.playSound('test_sound');
      audioManager.destroy();

      expect(mockSound.destroy).toHaveBeenCalled();
    });
  });

  describe('Загрузка всех звуков', () => {
    it('должен загружать все звуки через loadAllSounds', async () => {
      await audioManager.loadAllSounds();

      // Проверяем, что были вызваны загрузки для различных категорий звуков
      expect(mockAssetLoader.loadAudio).toHaveBeenCalled();
    });

    it('не должен загружать звуки повторно, если уже загружены', async () => {
      await audioManager.loadAllSounds();
      const firstCallCount = (mockAssetLoader.loadAudio as jest.Mock).mock.calls.length;

      await audioManager.loadAllSounds();
      const secondCallCount = (mockAssetLoader.loadAudio as jest.Mock).mock.calls.length;

      // Количество вызовов не должно увеличиться
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('Воспроизведение игровых звуков', () => {
    it('должен воспроизводить звук урона', () => {
      audioManager.playDamage();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.DAMAGE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.DAMAGE * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук потери ключа', () => {
      audioManager.playDamageKey();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.DAMAGE_KEY,
        expect.objectContaining({
          volume: SOUND_VOLUMES.DAMAGE_KEY * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук подбора жизни', () => {
      audioManager.playPickupLife();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.PICKUP_LIFE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.PICKUP_LIFE * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук подбора ключа', () => {
      audioManager.playPickupKey();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.PICKUP_KEY,
        expect.objectContaining({
          volume: SOUND_VOLUMES.PICKUP_KEY * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук успешного взятия ключа', () => {
      audioManager.playSuccessKey();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.SUCCESS_KEY,
        expect.objectContaining({
          volume: SOUND_VOLUMES.SUCCESS_KEY * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук успешного взятия монетки', () => {
      audioManager.playSuccessCoin();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.SUCCESS_COIN,
        expect.objectContaining({
          volume: SOUND_VOLUMES.SUCCESS_COIN * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук применения ключа', () => {
      audioManager.playApplyKey();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.APPLY_KEY,
        expect.objectContaining({
          volume: SOUND_VOLUMES.APPLY_KEY * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук смерти персонажа', () => {
      audioManager.playCharacterDead();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.CHARACTER_DEAD,
        expect.objectContaining({
          volume: SOUND_VOLUMES.CHARACTER_DEAD * 1.0 * audioManager.getMasterVolume()
        })
      );
    });
  });

  describe('Воспроизведение звуков UI', () => {
    it('должен воспроизводить звук клика кнопки', () => {
      audioManager.playButtonClick();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_CLICK,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_CLICK * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук закрытия вопроса', () => {
      audioManager.playQuestionClose();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_QUESTION_CLOSE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_QUESTION_CLOSE * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук правильного ответа', () => {
      audioManager.playQuestionSuccess();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_QUESTION_SUCCESS,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_QUESTION_SUCCESS * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук неправильного ответа', () => {
      audioManager.playQuestionFailure();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_QUESTION_FAILURE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_QUESTION_FAILURE * 1.0 * audioManager.getMasterVolume()
        })
      );
    });
  });

  describe('Воспроизведение звуков порталов', () => {
    it('должен воспроизводить звук входа в портал', () => {
      audioManager.playPortalEnter();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_PORTAL_ENTER,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_PORTAL_ENTER * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук отмены портала', () => {
      audioManager.playPortalCancel();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.BTN_PORTAL_CANCEL,
        expect.objectContaining({
          volume: SOUND_VOLUMES.BTN_PORTAL_CANCEL * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук активации портала', () => {
      audioManager.playPortalActivated();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.PORTAL_ACTIVATED,
        expect.objectContaining({
          volume: SOUND_VOLUMES.PORTAL_ACTIVATED * 1.0 * audioManager.getMasterVolume()
        })
      );
    });

    it('должен воспроизводить звук завершения активации портала', () => {
      audioManager.playPortalActivatedComplete();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.PORTAL_ACTIVATED_COMPLETE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.PORTAL_ACTIVATED_COMPLETE * 1.0 * audioManager.getMasterVolume()
        })
      );
    });
  });

  describe('Воспроизведение звуков активации', () => {
    it('должен воспроизводить звук активации оракула', () => {
      audioManager.playOracleActivated();
      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.ORACLE_ACTIVATED,
        expect.objectContaining({
          volume: SOUND_VOLUMES.ORACLE_ACTIVATED * 1.0 * audioManager.getMasterVolume()
        })
      );
    });
  });

  describe('Воспроизведение звуков спавна врагов', () => {
    it('должен воспроизводить звук спавна врага', () => {
      audioManager.playEnemySpawn();
      expect(mockScene.sound.add).toHaveBeenCalled();
    });

    it('должен циклически перебирать звуки спавна', () => {
      // Первый вызов
      audioManager.playEnemySpawn();
      const firstCall = (mockScene.sound.add as jest.Mock).mock.calls[0];

      // Второй вызов
      audioManager.playEnemySpawn();
      const secondCall = (mockScene.sound.add as jest.Mock).mock.calls[1];

      // Третий вызов
      audioManager.playEnemySpawn();
      const thirdCall = (mockScene.sound.add as jest.Mock).mock.calls[2];

      // Звуки должны быть разными
      expect(firstCall[0]).toBe(SOUND_KEYS.ENEMY_SPAWN_01);
      expect(secondCall[0]).toBe(SOUND_KEYS.ENEMY_SPAWN_02);
      expect(thirdCall[0]).toBe(SOUND_KEYS.ENEMY_SPAWN_03);
    });

    it('должен использовать правильную громкость для звуков спавна', () => {
      audioManager.playEnemySpawn();
      const call = (mockScene.sound.add as jest.Mock).mock.calls[0];

      expect(call[1].volume).toBe(SOUND_VOLUMES.ENEMY_SPAWN_01 * 1.0 * audioManager.getMasterVolume());
    });
  });

  describe('Воспроизведение фоновой музыки', () => {
    it('должен воспроизводить фоновую музыку', async () => {
      await audioManager.playBackgroundMusic();

      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.MUSIC_BASE,
        expect.objectContaining({
          volume: SOUND_VOLUMES.MUSIC_BASE * 0.7 * audioManager.getMasterVolume(),
          loop: true
        })
      );
    });

    it('должен воспроизводить музыку победы', async () => {
      await audioManager.playWinMusic();

      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.MUSIC_WIN,
        expect.objectContaining({
          volume: SOUND_VOLUMES.MUSIC_WIN * 0.7 * audioManager.getMasterVolume(),
          loop: true
        })
      );
    });

    it('должен воспроизводить музыку проигрыша', async () => {
      await audioManager.playGameOverMusic();

      expect(mockScene.sound.add).toHaveBeenCalledWith(
        SOUND_KEYS.MUSIC_GAME_OVER,
        expect.objectContaining({
          volume: SOUND_VOLUMES.MUSIC_GAME_OVER * 0.7 * audioManager.getMasterVolume(),
          loop: true
        })
      );
    });
  });

  describe('Обновление громкости всех звуков', () => {
    it('должен обновлять громкость всех звуков при изменении master volume', () => {
      const mockSound1 = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        destroy: jest.fn().mockReturnThis(),
        volume: 1.0
      };
      const mockSound2 = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        destroy: jest.fn().mockReturnThis(),
        volume: 1.0
      };

      (mockScene.sound.add as jest.Mock)
        .mockReturnValueOnce(mockSound1)
        .mockReturnValueOnce(mockSound2);

      audioManager.playSound('sound1');
      audioManager.playSound('sound2');

      audioManager.setMasterVolume(0.5);

      // Громкость должна быть обновлена для всех звуков
      expect(mockSound1.volume).toBe(1.0 * 0.5); // soundVolume * masterVolume
      expect(mockSound2.volume).toBe(1.0 * 0.5);
    });

    it('должен обновлять громкость музыки при изменении music volume', async () => {
      const mockMusic = {
        play: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        setVolume: jest.fn().mockReturnThis(),
        volume: 0.7
      };
      (mockScene.sound.add as jest.Mock).mockReturnValueOnce(mockMusic);

      // ✅ Сначала включаем звук, так как по умолчанию muted = true
      audioManager.setMuted(false);
      await audioManager.playMusic('test_music', 'test.mp3');

      audioManager.setMusicVolume(0.5);

      expect(mockMusic.volume).toBe(0.5 * audioManager.getMasterVolume()); // musicVolume * masterVolume
    });
  });
});

