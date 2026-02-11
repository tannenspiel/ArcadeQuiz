import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { ScoreSystem } from '../../systems/ScoreSystem';
import { AudioManager } from '../../systems/AudioManager';
import {
    DEFAULT_FONT_FAMILY,
    SCORE_HUD_FONT_SIZE,
    SCORE_HUD_FONT_STYLE,
    SCORE_HUD_COLOR,
    SCORE_HUD_STROKE,
    SCORE_HUD_STROKE_THICKNESS,
    UI_TEXT
} from '../../../constants/textStyles';
import { DEPTHS, KEYS } from '../../../constants/gameConstants';

/**
 * Dependencies for HUDManager
 */
export interface HUDManagerDependencies {
    scene: Phaser.Scene;
    gameState: GameState;
    scoreSystem: ScoreSystem;
    audioManager: AudioManager; // ✅ Добавлен AudioManager для кнопки звука
    isOracleActivated: boolean;
    getCurrentLevel: () => number; // ✅ Для отображения уровня
}

/**
 * Manages HUD elements (keys, score, hint)
 */
export class HUDManager {
    private scoreHUDText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private soundButton!: Phaser.GameObjects.Sprite; // ✅ Кнопка звука (спрайт)
    private hasEverCollectedKey: boolean = false; // Флаг: был ли взят хотя бы один ключ
    private hasEverCollectedCoin: boolean = false; // Флаг: была ли взята хотя бы одна монетка

    constructor(private deps: HUDManagerDependencies) { }

    /**
     * Creates all HUD elements
     */
    public create(): void {
        const { scene } = this.deps;

        // 1. Score HUD (top center) - унифицированный padding для совпадения высоты с иконкой звука (32px)
        this.scoreHUDText = scene.add.text(0, 0, '', {
            fontSize: `${SCORE_HUD_FONT_SIZE}px`,
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: SCORE_HUD_FONT_STYLE,
            color: SCORE_HUD_COLOR,
            stroke: SCORE_HUD_STROKE,
            strokeThickness: SCORE_HUD_STROKE_THICKNESS,
            backgroundColor: '#000000',
            padding: { x: 15, y: 5 }  // ✅ Высота 32px (как у кнопки звука)
        }).setOrigin(0.5, 0).setDepth(DEPTHS.SCREEN.HUD).setScrollFactor(0).setVisible(true);

        // 2. Sound button (top right, near score) - спрайт UI.SoundToggle_16x8.png
        // Кадр 0: 🔊 (звук вкл), Кадр 1: 🔤 (звук выкл)
        const soundFrame = this.deps.audioManager.isMuted() ? 1 : 0;
        this.soundButton = scene.add.sprite(0, 0, KEYS.UI_SOUND_TOGGLE, soundFrame)
          .setOrigin(0.5, 0)
          .setDepth(DEPTHS.SCREEN.HUD)
          .setScrollFactor(0)
          .setVisible(true)
          .setScale(4); // ✅ Устанавливаем масштаб сразу

        // ✅ Настраиваем интерактивность с правильным hit area (32×32)
        this.soundButton.setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(0, 0, 32, 32),
            cursor: 'pointer'
        });

        this.soundButton.on('pointerdown', () => {
              // Переключаем звук
              const newMuted = this.deps.audioManager.toggleMute();
              // Обновляем кадр спрайта: 0 = вкл, 1 = выкл
              this.soundButton.setFrame(newMuted ? 1 : 0);

              // Небольшая визуальная обратная связь
              this.soundButton.setScale(4 * 0.9);
              scene.time.delayedCall(100, () => {
                  if (this.soundButton && this.soundButton.scene) {
                      this.soundButton.setScale(4);
                  }
              });
          });

        // 3. Hint text / Keys counter (bottom center) - один элемент для обеих целей
        this.hintText = scene.add.text(0, 0, 'Собери 3 ключа и отнеси Оракулу!', {
            fontSize: `${SCORE_HUD_FONT_SIZE}px`,
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: SCORE_HUD_FONT_STYLE,
            color: SCORE_HUD_COLOR,
            stroke: SCORE_HUD_STROKE,
            strokeThickness: SCORE_HUD_STROKE_THICKNESS,
            backgroundColor: '#000000',
            padding: { x: 15, y: 5 }  // ✅ Высота 32px (как у кнопки звука)
        }).setOrigin(0.5, 0).setDepth(DEPTHS.SCREEN.HUD).setScrollFactor(0).setVisible(true);

        // Initial update
        this.update();
    }

    /**
     * Updates all HUD elements
     * ⚠️ НОВОЕ: Поддержка отображения монеток/ключей по фазе
     */
    public update(): void {
        const cam = this.deps.scene.cameras.main;
        const zoom = cam.zoom;
        const invZoom = 1 / zoom;
        const currentKeys = this.deps.gameState.getKeys();
        const currentCoins = this.deps.gameState.getCoins();
        const currentPhase = this.deps.gameState.getGamePhase();

        // Проверяем: был ли взят хотя бы один предмет
        if (currentKeys > 0) {
            this.hasEverCollectedKey = true;
        }
        if (currentCoins > 0) {
            this.hasEverCollectedCoin = true;
        }

        // 1. Update Score HUD (top center)
        if (this.scoreHUDText && this.scoreHUDText.scene) {
            // ✅ "Уровень: X. Счёт: Y" (двоеточие после "Уровень", точка после номера)
            this.scoreHUDText.setText(`Уровень: ${this.deps.getCurrentLevel()}. ${UI_TEXT.SCORE_PREFIX}${this.deps.scoreSystem.getScore()}`);
            this.scoreHUDText.setScale(invZoom);

            const pos = this.getZoomCompensatedHUDPosition(cam.width / 2, 20);
            this.scoreHUDText.setPosition(pos.x, pos.y);
        }

        // 2. Update Sound button (справа от scoreHUD, впритык)
        if (this.soundButton && this.soundButton.scene) {
            // ✅ Используем BASE_SCALE без invZoom (как question_bubble, portal_question_bubble)
            this.soundButton.setScale(4);

            // ✅ Обновляем hit area для интерактивности (8×8 → 32×32)
            this.soundButton.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(0, 0, 32, 32),
                cursor: 'pointer'
            });

            // Позиционируем кнопку справа от текста счёта
            const textHalfDisplayWidth = this.scoreHUDText.displayWidth / 2;
            const buttonGap = 20; // 20px = 5 базовых пикселей × 4 (16 + 4)
            const buttonOffsetWorld = (textHalfDisplayWidth + buttonGap) * zoom;
            const pos = this.getZoomCompensatedHUDPosition(cam.width / 2 + buttonOffsetWorld, 20);
            this.soundButton.setPosition(pos.x, pos.y);
        }

        // 2. Update hint / Counter (bottom center) - показывает монетки или ключи по фазе
        if (this.hintText) {
            const showHint = !this.deps.isOracleActivated;
            this.hintText.setVisible(showHint);

            if (showHint) {
                this.hintText.setScale(invZoom);
                const pos = this.getZoomCompensatedHUDPosition(cam.width / 2, cam.height - 60);
                this.hintText.setPosition(pos.x, pos.y);

                // ⚠️ НОВОЕ: Показываем счётчик по фазе с динамическими сообщениями
                if (currentPhase === 'coin') {
                    if (!this.hasEverCollectedCoin) {
                        this.hintText.setText('Собери монетки для Оракула!');
                    } else {
                        this.hintText.setText(`${UI_TEXT.COINS_PREFIX}${currentCoins}/3`);
                    }
                } else {
                    if (!this.hasEverCollectedKey) {
                        this.hintText.setText('Открой ключами порталы!');
                    } else {
                        this.hintText.setText(`${UI_TEXT.KEYS_PREFIX}${currentKeys}/3`);
                    }
                }
            }
        }
    }

    /**
     * Calculates zoom-compensated screen position
     */
    private getZoomCompensatedHUDPosition(targetScreenX: number, targetScreenY: number): { x: number; y: number } {
        const cam = this.deps.scene.cameras.main;
        const zoom = cam.zoom;

        // Use screen centers for zoom compensation
        const centerX = cam.width / 2;
        const centerY = cam.height / 2;

        const x = centerX + (targetScreenX - centerX) / zoom;
        const y = centerY + (targetScreenY - centerY) / zoom;

        return { x, y };
    }

    /**
     * Destroys all HUD elements
     */
    public destroy(): void {
        if (this.scoreHUDText) {
            this.scoreHUDText.destroy();
            this.scoreHUDText = null as any;
        }
        if (this.hintText) {
            this.hintText.destroy();
            this.hintText = null as any;
        }
        if (this.soundButton) {
            this.soundButton.destroy();
            this.soundButton = null as any;
        }
    }
}
