/**
 * Prototype для проверки поведения scene.launch()
 *
 * Проверки:
 * 1. Какая сцена получает input при launch()?
 * 2. Когда вызывается update() при async create()?
 * 3. Двойное обновление CPU?
 * 4. Порядок сцен
 */

import Phaser from 'phaser';

// ============================================
// TestScene 1 — первая сцена (LoadingScene prototype)
// ============================================
class TestLoadingScene extends Phaser.Scene {
  private updateCount: number = 0;
  private frameCount: number = 0;

  constructor() {
    super({ key: 'TestLoadingScene' });
  }

  preload() {
    console.log('🔵 TestLoadingScene: preload()');

    // Имитация загрузки ассетов
    this.load.on('progress', (p: number) => {
      console.log(`🔵 Loading progress: ${Math.round(p * 100)}%`);
    });

    this.load.once('complete', () => {
      console.log('🔵 TestLoadingScene: Assets loaded, launching TestMainScene...');

      // ✅ Ключевой момент: launch vs start
      setTimeout(() => {
        this.scene.launch('TestMainScene');

        console.log('🔵 TestLoadingScene: after launch()');
        console.log('🔵 Active scenes:', this.scene.manager.getActiveScenes());
      }, 500);
    });

    // Запускаем загрузку
    this.load.start();
  }

  create() {
    console.log('🔵 TestLoadingScene: create()');

    // Добавляем текст на экран
    this.add.text(100, 50, 'Loading Scene', { fontSize: '24px', color: '#00ff00' });
    const progressText = this.add.text(100, 80, 'Progress: 0%', { fontSize: '18px', color: '#ffffff' });

    // Сохраняем ссылку для обновления
    (this as any).progressText = progressText;
  }

  update(time: number, delta: number) {
    this.updateCount++;
    this.frameCount++;

    if (this.updateCount <= 5) {
      console.log(`🔵 TestLoadingScene: update() #${this.updateCount}, frame=${this.frameCount}`);
    }

    // Проверяем input
    if (this.input.keyboard && this.input.keyboard.enabled) {
      const keys = this.input.keyboard.createCursorKeys();
      if (keys.left.isDown || keys.right.isDown || keys.up.isDown || keys.down.isDown) {
        console.log(`🔵 TestLoadingScene: INPUT DETECTED! (frame=${this.frameCount})`);
      }
    }
  }

  // Метод для обновления прогресса из внешнего источника
  setProgress(percent: number, text: string) {
    console.log(`🔵 TestLoadingScene: setProgress(${percent}%, ${text})`);
    if ((this as any).progressText) {
      (this as any).progressText.setText(`${text}: ${percent}%`);
    }
  }
}

// ============================================
// TestScene 2 — вторая сцена (MainScene prototype)
// ============================================
class TestMainScene extends Phaser.Scene {
  private updateCount: number = 0;
  private frameCount: number = 0;
  private isReady: boolean = false;

  constructor() {
    super({ key: 'TestMainScene' });
  }

  async create() {
    console.log('🟢 TestMainScene: create() START');

    // Добавляем текст
    this.add.text(100, 150, 'Main Scene', { fontSize: '24px', color: '#ff0000' });
    const statusText = this.add.text(100, 180, 'Initializing...', { fontSize: '18px', color: '#ffffff' });

    // Имитация async инициализации
    console.log('🟢 TestMainScene: Before delay (1000ms)');
    console.log('🟢 TestMainScene: update() should NOT be called yet');

    await this.delay(1000);
    console.log('🟢 TestMainScene: After delay 1');

    await this.delay(1000);
    console.log('🟢 TestMainScene: After delay 2');

    statusText.setText('Ready!');
    this.isReady = true;

    console.log('🟢 TestMainScene: create() END, isReady=${this.isReady}');
    console.log('🟢 TestMainScene: Active scenes:', this.scene.manager.getActiveScenes());

    // Обновляем LoadingScene progress
    const loadingScene = this.scene.get('TestLoadingScene') as any;
    if (loadingScene && loadingScene.setProgress) {
      loadingScene.setProgress(100, 'Ready');
      setTimeout(() => {
        this.scene.stop('TestLoadingScene');
        console.log('🟢 TestMainScene: LoadingScene stopped');
      }, 500);
    }
  }

  update(time: number, delta: number) {
    this.updateCount++;
    this.frameCount++;

    if (this.updateCount <= 10) {
      console.log(`🟢 TestMainScene: update() #${this.updateCount}, frame=${this.frameCount}, isReady=${this.isReady}`);
    }

    // ✅ НЕ обрабатываем игру пока не готовы
    if (!this.isReady) {
      return;
    }

    // Проверяем input
    if (this.input.keyboard && this.input.keyboard.enabled) {
      const keys = this.input.keyboard.createCursorKeys();
      if (keys.left.isDown || keys.right.isDown || keys.up.isDown || keys.down.isDown) {
        console.log(`🟢 TestMainScene: INPUT DETECTED! (frame=${this.frameCount})`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}

// ============================================
// Конфигурация игры
// ============================================
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a202c',
  scene: [TestLoadingScene, TestMainScene],  // ✅ Порядок важен!
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }
    }
  }
};

// ============================================
// Инициализация
// ============================================
window.onload = () => {
  console.log('🎮 Starting game...');
  const game = new Phaser.Game(config);
};
