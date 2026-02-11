/**
 * Менеджер аудио
 * Управление звуками и музыкой
 */

import Phaser from 'phaser';
import { AssetLoader } from '../core/AssetLoader';
import { ASSETS_BASE_PATH } from '../../config/gameConfig';
import { SOUND_KEYS, SOUND_VOLUMES, AUDIO_PATHS } from '../../constants/gameConstants';
import { logger } from '../../utils/Logger';

// ✅ Ключ для сохранения состояния muted в game.registry (между уровнями)
const AUDIO_MUTED_KEY = 'audio.muted';

export class AudioManager {
  private scene: Phaser.Scene;
  private assetLoader: AssetLoader;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private music?: Phaser.Sound.BaseSound;
  private masterVolume: number = 1.0;
  private musicVolume: number = 0.7;
  private soundVolume: number = 1.0;
  private muted: boolean = true;  // ✅ По умолчанию звук выключен
  private soundsLoaded: boolean = false;
  private unlockAttempted: boolean = false; // Флаг для отслеживания попытки разблокировки

  constructor(scene: Phaser.Scene, assetLoader: AssetLoader) {
    this.scene = scene;
    this.assetLoader = assetLoader;

    // ✅ Восстанавливаем состояние muted из registry (между уровнями)
    // Если значение не сохранено, используется значение по умолчанию (true)
    // Используем defensive проверку для тестов, где scene.game.registry может отсутствовать
    if (scene.game && scene.game.registry && scene.game.registry.has) {
      if (scene.game.registry.has(AUDIO_MUTED_KEY)) {
        this.muted = scene.game.registry.get(AUDIO_MUTED_KEY);
        logger.log('AUDIO', `🔊 AudioManager: Restored muted state from registry: ${this.muted}`);
      } else {
        // При первой инициализации сохраняем значение по умолчанию
        scene.game.registry.set(AUDIO_MUTED_KEY, this.muted);
        logger.log('AUDIO', `🔊 AudioManager: Initialized with default muted: ${this.muted}`);
      }
    }
  }

  /**
   * Загрузить все звуковые файлы
   * @param onProgress Optional callback для reporting прогресса загрузки
   */
  public async loadAllSounds(onProgress?: (current: number, total: number) => void): Promise<void> {
    if (this.soundsLoaded) {
      return;
    }

    try {
      const sounds = [
        { key: SOUND_KEYS.MUSIC_BASE, path: AUDIO_PATHS.MUSIC.BASE },
        { key: SOUND_KEYS.MUSIC_WIN, path: AUDIO_PATHS.MUSIC.WIN },
        { key: SOUND_KEYS.MUSIC_GAME_OVER, path: AUDIO_PATHS.MUSIC.GAME_OVER },
        { key: SOUND_KEYS.BTN_CLICK, path: AUDIO_PATHS.BUTTONS.CLICK },
        { key: SOUND_KEYS.BTN_QUESTION_CLOSE, path: AUDIO_PATHS.BUTTONS.QUESTION_CLOSE },
        { key: SOUND_KEYS.BTN_QUESTION_SUCCESS, path: AUDIO_PATHS.BUTTONS.QUESTION_SUCCESS },
        { key: SOUND_KEYS.BTN_QUESTION_FAILURE, path: AUDIO_PATHS.BUTTONS.QUESTION_FAILURE },
        { key: SOUND_KEYS.BTN_PORTAL_ENTER, path: AUDIO_PATHS.BUTTONS.PORTAL_ENTER },
        { key: SOUND_KEYS.BTN_PORTAL_CANCEL, path: AUDIO_PATHS.BUTTONS.PORTAL_CANCEL },
        { key: SOUND_KEYS.DAMAGE, path: AUDIO_PATHS.CHARACTER.DAMAGE },
        { key: SOUND_KEYS.DAMAGE_KEY, path: AUDIO_PATHS.CHARACTER.DAMAGE_KEY },
        { key: SOUND_KEYS.DAMAGE_COIN, path: AUDIO_PATHS.CHARACTER.DAMAGE_COIN },
        { key: SOUND_KEYS.PICKUP_LIFE, path: AUDIO_PATHS.CHARACTER.PICKUP_LIFE },
        { key: SOUND_KEYS.PICKUP_KEY, path: AUDIO_PATHS.CHARACTER.PICKUP_KEY },
        { key: SOUND_KEYS.PICKUP_COIN, path: AUDIO_PATHS.CHARACTER.PICKUP_COIN },
        { key: SOUND_KEYS.SUCCESS_KEY, path: AUDIO_PATHS.CHARACTER.SUCCESS_KEY },
        { key: SOUND_KEYS.SUCCESS_COIN, path: AUDIO_PATHS.CHARACTER.SUCCESS_COIN },
        { key: SOUND_KEYS.APPLY_KEY, path: AUDIO_PATHS.CHARACTER.APPLY_KEY },
        { key: SOUND_KEYS.CHARACTER_DEAD, path: AUDIO_PATHS.CHARACTER.DEAD },
        { key: SOUND_KEYS.ORACLE_ACTIVATED, path: AUDIO_PATHS.GAME.ORACLE_ACTIVATED },
        { key: SOUND_KEYS.PORTAL_ACTIVATED, path: AUDIO_PATHS.GAME.PORTAL_ACTIVATED },
        { key: SOUND_KEYS.PORTAL_ACTIVATED_COMPLETE, path: AUDIO_PATHS.GAME.PORTAL_ACTIVATED },
        { key: SOUND_KEYS.ENEMY_SPAWN_01, path: AUDIO_PATHS.ENEMY_SPAWN[0] },
        { key: SOUND_KEYS.ENEMY_SPAWN_02, path: AUDIO_PATHS.ENEMY_SPAWN[1] },
        { key: SOUND_KEYS.ENEMY_SPAWN_03, path: AUDIO_PATHS.ENEMY_SPAWN[2] },
        { key: SOUND_KEYS.ENEMY_SPAWN_04, path: AUDIO_PATHS.ENEMY_SPAWN[3] },
        { key: SOUND_KEYS.ENEMY_SPAWN_05, path: AUDIO_PATHS.ENEMY_SPAWN[4] },
      ];

      const total = sounds.length;
      for (let i = 0; i < total; i++) {
        await this.loadSound(sounds[i].key, sounds[i].path);
        // Вызываем callback после каждого загруженного файла
        if (onProgress) {
          onProgress(i + 1, total);
        }
      }

      this.soundsLoaded = true;
      logger.log('AUDIO', '✅ AudioManager: All sounds loaded successfully');
    } catch (error) {
      logger.log('AUDIO', '❌ AudioManager: Failed to load some sounds:', error);
    }
  }

  /**
   * Загрузить звуковой файл
   */
  public async loadSound(key: string, path: string): Promise<void> {
    try {
      await this.assetLoader.loadAudio(key, path);
      // Звук автоматически доступен через scene.sound после загрузки
    } catch (error) {
      logger.log('AUDIO', `Failed to load sound: ${key}`, error);
    }
  }

  /**
   * Воспроизвести звук
   */
  /**
   * Воспроизвести звук
   */
  public playSound(key: string, volume: number = 1.0): Phaser.Sound.BaseSound | null {
    if (this.muted) return null;

    // ✅ Если контекст заблокирован, не пытаемся играть звук и не спамим ошибками
    if (this.scene.sound.locked) {
      // Можно попробовать разблокировать, если еще нет слушателя
      this.unlockAudio();
      return null;
    }

    try {
      const sound = this.scene.sound.add(key, {
        volume: volume * this.soundVolume * this.masterVolume
      });
      sound.play();
      this.sounds.set(key, sound);
      return sound;
    } catch (error) {
      logger.log('AUDIO', `Failed to play sound: ${key}`, error);
      return null;
    }
  }

  /**
   * Воспроизвести музыку (зацикленная)
   */
  public async playMusic(key: string, path?: string, volume: number = 1.0): Promise<void> {
    if (this.muted) return;

    try {
      // Останавливаем предыдущую музыку
      if (this.music) {
        this.music.stop();
      }

      // Загружаем звук, если путь указан
      if (path) {
        await this.loadSound(key, path);
      }

      this.music = this.scene.sound.add(key, {
        volume: volume * this.musicVolume * this.masterVolume,
        loop: true
      });

      // ✅ Проверяем, заблокирован ли AudioContext
      if (this.scene.sound.locked) {
        // Браузеры блокируют автовоспроизведение — нормальное поведение
        this.unlockAudio();
      } else {
        this.music.play();
      }
    } catch (error) {
      logger.log('AUDIO', `Failed to play music: ${key}`, error);
    }
  }

  /**
   * Разблокировать аудио контекст по клику пользователя
   * Вызывается при первом взаимодействии пользователя с игрой
   */
  public unlockAudio(): void {
    // Если уже пробовали разблокировать - ничего не делаем
    if (this.unlockAttempted) {
      return;
    }

    this.unlockAttempted = true;

    // Проверяем, заблокирован ли AudioContext
    const wasLocked = this.scene.sound.locked;

    // Пытаемся разблокировать
    this.scene.sound.unlock();

    // Если был заблокирован - логируем успешную разблокировку
    if (wasLocked) {
      logger.log('AUDIO', '✅ AudioManager: AudioContext unlocked by user interaction');

      // Возобновляем музыку, если она была создана но не запущена
      if (this.music && !this.music.isPlaying) {
        this.music.play();
      }
    } else {
      logger.log('AUDIO', 'ℹ️ AudioManager: AudioContext was already unlocked');
    }
  }

  /**
   * Воспроизвести фоновую музыку
   */
  public async playBackgroundMusic(): Promise<void> {
    await this.playMusic(SOUND_KEYS.MUSIC_BASE, undefined, SOUND_VOLUMES.MUSIC_BASE);
  }

  /**
   * Воспроизвести музыку победы
   */
  public async playWinMusic(): Promise<void> {
    logger.log('AUDIO', '🎵 AudioManager: playWinMusic() called');
    // trace removed - use logger only
    await this.playMusic(SOUND_KEYS.MUSIC_WIN, undefined, SOUND_VOLUMES.MUSIC_WIN);
  }

  /**
   * Воспроизвести музыку проигрыша
   */
  public async playGameOverMusic(): Promise<void> {
    await this.playMusic(SOUND_KEYS.MUSIC_GAME_OVER, undefined, SOUND_VOLUMES.MUSIC_GAME_OVER);
  }

  /**
   * Воспроизвести звук клика по кнопке
   */
  public playButtonClick(): void {
    this.playSound(SOUND_KEYS.BTN_CLICK, SOUND_VOLUMES.BTN_CLICK);
  }

  /**
   * Воспроизвести звук закрытия вопроса
   */
  public playQuestionClose(): void {
    this.playSound(SOUND_KEYS.BTN_QUESTION_CLOSE, SOUND_VOLUMES.BTN_QUESTION_CLOSE);
  }

  /**
   * Воспроизвести звук правильного ответа
   */
  public playQuestionSuccess(): void {
    this.playSound(SOUND_KEYS.BTN_QUESTION_SUCCESS, SOUND_VOLUMES.BTN_QUESTION_SUCCESS);
  }

  /**
   * Воспроизвести звук неправильного ответа
   */
  public playQuestionFailure(): void {
    this.playSound(SOUND_KEYS.BTN_QUESTION_FAILURE, SOUND_VOLUMES.BTN_QUESTION_FAILURE);
  }

  /**
   * Воспроизвести звук входа в портал
   */
  public playPortalEnter(): void {
    this.playSound(SOUND_KEYS.BTN_PORTAL_ENTER, SOUND_VOLUMES.BTN_PORTAL_ENTER);
  }

  /**
   * Воспроизвести звук отмены портала
   */
  public playPortalCancel(): void {
    this.playSound(SOUND_KEYS.BTN_PORTAL_CANCEL, SOUND_VOLUMES.BTN_PORTAL_CANCEL);
  }

  /**
   * Воспроизвести звук получения урона
   */
  public playDamage(): void {
    this.playSound(SOUND_KEYS.DAMAGE, SOUND_VOLUMES.DAMAGE);
  }

  /**
   * Воспроизвести звук потери ключа при столкновении с врагом
   */
  public playDamageKey(): void {
    this.playSound(SOUND_KEYS.DAMAGE_KEY, SOUND_VOLUMES.DAMAGE_KEY);
  }

  /**
   * Воспроизвести звук потери монетки при столкновении с врагом
   */
  public playDamageCoin(): void {
    this.playSound(SOUND_KEYS.DAMAGE_COIN, SOUND_VOLUMES.DAMAGE_COIN);
  }

  /**
   * Воспроизвести звук подбора жизни
   */
  public playPickupLife(): void {
    this.playSound(SOUND_KEYS.PICKUP_LIFE, SOUND_VOLUMES.PICKUP_LIFE);
  }

  /**
   * Воспроизвести звук подбора ключа
   */
  public playPickupKey(): void {
    this.playSound(SOUND_KEYS.PICKUP_KEY, SOUND_VOLUMES.PICKUP_KEY);
  }

  /**
   * Воспроизвести звук подбора монетки (пересечение на карте)
   */
  public playPickupCoin(): void {
    this.playSound(SOUND_KEYS.PICKUP_COIN, SOUND_VOLUMES.PICKUP_COIN);
  }

  /**
   * Воспроизвести звук успешного взятия ключа (правильный ответ на вопрос)
   */
  public playSuccessKey(): void {
    this.playSound(SOUND_KEYS.SUCCESS_KEY, SOUND_VOLUMES.SUCCESS_KEY);
  }

  /**
   * Воспроизвести звук успешного взятия монетки (правильный ответ на вопрос)
   */
  public playSuccessCoin(): void {
    this.playSound(SOUND_KEYS.SUCCESS_COIN, SOUND_VOLUMES.SUCCESS_COIN);
  }

  /**
   * Воспроизвести звук применения ключа (к порталу или алтарю)
   */
  public playApplyKey(): void {
    this.playSound(SOUND_KEYS.APPLY_KEY, SOUND_VOLUMES.APPLY_KEY);
  }

  /**
   * Воспроизвести звук смерти персонажа (Game Over)
   */
  public playCharacterDead(): void {
    this.playSound(SOUND_KEYS.CHARACTER_DEAD, SOUND_VOLUMES.CHARACTER_DEAD);
  }

  /**
   * Воспроизвести звук спавна врага/клона
   * Перебирает звуки 01-05 по кругу
   */
  private lastSpawnSoundIndex: number = 0;
  public playEnemySpawn(): void {
    const spawnSounds = [
      { key: SOUND_KEYS.ENEMY_SPAWN_01, volume: SOUND_VOLUMES.ENEMY_SPAWN_01 },
      { key: SOUND_KEYS.ENEMY_SPAWN_02, volume: SOUND_VOLUMES.ENEMY_SPAWN_02 },
      { key: SOUND_KEYS.ENEMY_SPAWN_03, volume: SOUND_VOLUMES.ENEMY_SPAWN_03 },
      { key: SOUND_KEYS.ENEMY_SPAWN_04, volume: SOUND_VOLUMES.ENEMY_SPAWN_04 },
      { key: SOUND_KEYS.ENEMY_SPAWN_05, volume: SOUND_VOLUMES.ENEMY_SPAWN_05 }
    ];

    const soundConfig = spawnSounds[this.lastSpawnSoundIndex];
    this.lastSpawnSoundIndex = (this.lastSpawnSoundIndex + 1) % spawnSounds.length;

    this.playSound(soundConfig.key, soundConfig.volume);
  }

  /**
   * Воспроизвести звук активации алтаря (Oracle)
   */
  public playOracleActivated(): void {
    this.playSound(SOUND_KEYS.ORACLE_ACTIVATED, SOUND_VOLUMES.ORACLE_ACTIVATED);
  }

  /**
   * Воспроизвести звук активации портала (начало активации)
   */
  public playPortalActivated(): void {
    this.playSound(SOUND_KEYS.PORTAL_ACTIVATED, SOUND_VOLUMES.PORTAL_ACTIVATED);
  }

  /**
   * Воспроизвести звук завершения активации портала (когда появляется надпись ответа)
   */
  public playPortalActivatedComplete(): void {
    this.playSound(SOUND_KEYS.PORTAL_ACTIVATED_COMPLETE, SOUND_VOLUMES.PORTAL_ACTIVATED_COMPLETE);
  }

  /**
   * Остановить музыку
   */
  public stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music = undefined;
    }
  }

  /**
   * Пауза всех звуков
   */
  public pauseAll(): void {
    this.scene.sound.pauseAll();
  }

  /**
   * Возобновить все звуки
   */
  public resumeAll(): void {
    this.scene.sound.resumeAll();
  }

  /**
   * Установить громкость мастера
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Установить громкость музыки
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.music) {
      (this.music as any).volume = volume * this.masterVolume;
    }
  }

  /**
   * Установить громкость звуков
   */
  public setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Обновить громкость всех звуков
   */
  private updateAllVolumes(): void {
    this.sounds.forEach((sound, key) => {
      (sound as any).volume = this.soundVolume * this.masterVolume;
    });
    if (this.music) {
      (this.music as any).volume = this.musicVolume * this.masterVolume;
    }
  }

  /**
   * Включить/выключить звук
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    // ✅ Сохраняем состояние в registry для сохранения между уровнями
    if (this.scene.game && this.scene.game.registry && this.scene.game.registry.set) {
      this.scene.game.registry.set(AUDIO_MUTED_KEY, muted);
    }
    if (muted) {
      this.pauseAll();
    } else {
      this.resumeAll();
    }
  }

  /**
   * Проверить, выключен ли звук
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Получить громкость мастера
   */
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Получить громкость музыки
   */
  public getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Получить громкость звуков
   */
  public getSoundVolume(): number {
    return this.soundVolume;
  }

  /**
   * Переключить звук (включить/выключить)
   * @returns новое состояние звука (false = включён, true = выключён)
   */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    // ✅ Сохраняем состояние в registry для сохранения между уровнями
    if (this.scene.game && this.scene.game.registry && this.scene.game.registry.set) {
      this.scene.game.registry.set(AUDIO_MUTED_KEY, this.muted);
    }

    // Если включили звук
    if (!this.muted) {
      // Если музыка была на паузе, возобновляем
      if (this.music && !this.music.isPlaying) {
        this.music.resume();
      }
      // Если музыки нет совсем, запускаем фоновую музыку
      else if (!this.music) {
        this.playBackgroundMusic();
      }
    }
    // Если выключили звук и музыка играет, ставим на паузу
    else if (this.muted && this.music && this.music.isPlaying) {
      this.music.pause();
    }

    logger.log('AUDIO', `🔊 Sound toggled: ${this.muted ? 'MUTED' : 'UNMUTED'}`);
    return this.muted;
  }

  /**
   * Очистить все звуки
   */
  public destroy(): void {
    this.stopMusic();
    this.sounds.forEach(sound => sound.destroy());
    this.sounds.clear();
    // Сбрасываем флаг загрузки, чтобы при следующей инициализации звуки загрузились заново
    this.soundsLoaded = false;
  }

  /**
   * ✅ Сбросить состояние muted на значение по умолчанию
   * Используется при полном рестарте игры (resetLevel = true)
   */
  public resetMutedState(): void {
    this.muted = true; // По умолчанию звук выключен
    if (this.scene.game && this.scene.game.registry && this.scene.game.registry.set) {
      this.scene.game.registry.set(AUDIO_MUTED_KEY, this.muted);
    }
    logger.log('AUDIO', `🔊 AudioManager: Muted state reset to default: ${this.muted}`);
  }
}

