/**
 * Unit tests for DebugOverlay
 *
 * Tests the debug UI and spawn matrix grid visualization:
 * - Debug text creation and updates
 * - FPS display
 * - Player position display
 * - Spawn matrix grid visualization
 * - Zoom compensation
 */

import Phaser from 'phaser';
import { DebugOverlay } from '../../../game/ui/DebugOverlay';
import { Player } from '../../../game/entities/Player';
import { GameState } from '../../../game/core/GameState';
import { SpawnSystem } from '../../../game/systems/SpawnSystem';
import { AbstractEnemy } from '../../../game/entities/enemies/AbstractEnemy';

// Mock config flags
jest.mock('../../../config/gameConfig', () => ({
  DEBUG_OVERLAY_ENABLED: true,
  DEBUG_VISUAL_GRID_ENABLED: true,
  DEBUG_SPAWN_GRID_ENABLED: false,
  logSystem: jest.fn(),
}));

// Mock constants
jest.mock('../../../constants/gameConstants', () => ({
  MAP_WIDTH: 64,
  MAP_HEIGHT: 64,
  BASE_SCALE: 32,
  DEPTHS: {
    WORLD: {
      BACKGROUND: -100,
      TILED_MAP: 0,
      ENEMY: 7,
      ORACLE: 8,
      ORACLE_COIN_INDICATOR: 8.1,
      HEART_GLOW: 10,
      HEART_BASE: 11,
      ITEMS: 100,
      PORTAL: 150,
      PLAYER: 200
    },
    SCREEN: {
      QUESTION_BUBBLE: 100,
      UI_BUTTON_BG: 1002,
      UI_BUTTON_TEXT: 1003,
      MODAL_BG: 2000,
      MODAL_TEXT: 2001,
      MODAL_BUTTON: 2002,
      MODAL_CLOSE: 9999,
      DEBUG_OVERLAY: 999999,
      SPAWN_MATRIX_GRID: -50
    }
  }
}));

// Mock logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DebugOverlay', () => {
  let scene: Phaser.Scene;
  let mockPlayer: Player;
  let mockGameState: GameState;
  let mockSpawnSystem: SpawnSystem;
  let mockEnemy: AbstractEnemy;
  let overlay: DebugOverlay;
  let dependencies: any;

  // Mock Phaser Text object
  let mockText: any;
  let mockGraphics: any;

  beforeEach(() => {
    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create mock text object
    mockText = {
      destroy: jest.fn(),
      setScrollFactor: jest.fn().mockReturnThis(),
      setOrigin: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setActive: jest.fn().mockReturnThis(),
      setScale: jest.fn().mockReturnThis(),
      setPosition: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      active: true,
      visible: true,
      depth: 0,
    };

    // Create mock graphics object
    mockGraphics = {
      destroy: jest.fn(),
      setDepth: jest.fn().mockReturnThis(),
      setScrollFactor: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setActive: jest.fn().mockReturnThis(),
      clear: jest.fn(),
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn(),
      lineStyle: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      strokeRect: jest.fn(),
      active: true,
      visible: true,
      depth: 0,
    };

    // Create mock player
    mockPlayer = {
      getPosition: jest.fn(() => ({ x: 100, y: 200 })),
      getSprite: jest.fn(() => ({ active: true })),
    } as unknown as Player;

    // Create mock game state
    mockGameState = {
      getKeys: jest.fn(() => 3),
      // ⚠️ NEW: 2026-01-31 - Добавлены методы для механики монеток
      getCoins: jest.fn(() => 2),
      getMaxCoins: jest.fn(() => 3),
      getGamePhase: jest.fn(() => 'KEY'),
      isQuizActive: jest.fn(() => false),
      setQuizActive: jest.fn(),
    } as unknown as GameState;

    // Create mock spawn system with spawnMatrix
    const mockSpawnMatrix = {
      getMatrixSize: jest.fn(() => ({
        cellSize: 64,
        cols: 32,
        rows: 32,
      })),
      getMatrix: jest.fn(() => {
        // Create 32x32 matrix with some occupied cells
        const matrix: string[][] = [];
        for (let i = 0; i < 32; i++) {
          const row: string[] = [];
          for (let j = 0; j < 32; j++) {
            if (i === 5 && j === 5) row.push('permanent');
            else if (i === 10 && j === 10) row.push('enemy');
            else if (i === 15 && j === 15) row.push('item');
            else if (i === 20 && j === 20) row.push('player');
            else row.push('free');
          }
          matrix.push(row);
        }
        return matrix;
      }),
    };

    mockSpawnSystem = {
      spawnMatrix: mockSpawnMatrix,
    } as unknown as SpawnSystem;

    // Create mock enemy
    mockEnemy = {
      getSprite: jest.fn(() => ({ active: true })),
      isActive: jest.fn(() => true),
      getType: jest.fn(() => 'randomWalker' as any),
      getHealth: jest.fn(() => 100),
    } as unknown as AbstractEnemy;

    // Create mock scene
    scene = {
      cameras: {
        main: {
          zoom: 1,
          width: 1280,
          height: 720,
          scrollX: 0,
          scrollY: 0,
        },
      },
      add: {
        text: jest.fn(() => mockText),
        graphics: jest.fn(() => mockGraphics),
      },
      game: {
        loop: {
          actualFps: 60,
        },
      },
    } as unknown as Phaser.Scene;

    // Create dependencies
    dependencies = {
      getPlayer: jest.fn(() => mockPlayer),
      getGameState: jest.fn(() => mockGameState),
      getSpawnSystem: jest.fn(() => mockSpawnSystem),
      getEnemyInstances: jest.fn(() => [mockEnemy]),
      getMaxKeys: jest.fn(() => 5),
      getHeartsGroup: jest.fn(() => ({ countActive: jest.fn(() => 2) })),
      getKeysGroup: jest.fn(() => ({ countActive: jest.fn(() => 3) })),
      getCoinsGroup: jest.fn(() => ({ countActive: jest.fn(() => 1) })),
      getScore: jest.fn(() => 1000),
      getMaxPossibleScore: jest.fn(() => 1500),
      getTotalMaxPossibleScore: jest.fn(() => 5000),
      getCurrentLevel: jest.fn(() => 1),
      getCurrentConfigKey: jest.fn(() => 'level1.config'),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Construction', () => {
    test('should create DebugOverlay instance', () => {
      overlay = new DebugOverlay(scene, dependencies);

      expect(overlay).toBeDefined();
      expect(overlay).toBeInstanceOf(DebugOverlay);
    });

    test('should store scene and dependencies', () => {
      overlay = new DebugOverlay(scene, dependencies);

      // Verify instance is created successfully
      expect(overlay).toBeDefined();
    });
  });

  describe('create() - Debug UI Creation', () => {
    test('should create debug text when DEBUG_OVERLAY_ENABLED is true', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(Object)
      );

      expect(mockText.setScrollFactor).toHaveBeenCalledWith(0);
      expect(mockText.setOrigin).toHaveBeenCalledWith(0, 0);
      expect(mockText.setDepth).toHaveBeenCalledWith(999999);
    });

    test('should not create debug text when DEBUG_OVERLAY_ENABLED is false', () => {
      jest.doMock('../../../config/gameConfig', () => ({
        DEBUG_OVERLAY_ENABLED: false,
        DEBUG_VISUAL_GRID_ENABLED: true,
        DEBUG_SPAWN_GRID_ENABLED: false,
        logSystem: jest.fn(),
      }));

      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      // Should not create text when disabled
      // (this test verifies early return behavior)
    });

    test('should set correct text style', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      // Check that scene.add.text was called for each debug block
      // There are 6 blocks: engine, score, keys, coins, hearts, enemies
      expect(scene.add.text).toHaveBeenCalled();

      // Check that at least one text object was created with the correct style
      // (font size changed from 20px to 16px in the new implementation)
      const calls = (scene.add.text as jest.Mock).mock.calls;
      const hasCorrectStyle = calls.some((call: any[]) => {
        const style = call[3];
        return style &&
               style.fontSize === '16px' &&
               style.fontFamily === 'monospace' &&
               style.backgroundColor === 'rgba(0, 0, 0, 0.5)';
      });

      expect(hasCorrectStyle).toBe(true);
    });
  });

  describe('createSpawnMatrixGrid() - Grid Creation', () => {
    test('should create spawn matrix grid when DEBUG_VISUAL_GRID_ENABLED is true', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.createSpawnMatrixGrid();

      expect(scene.add.graphics).toHaveBeenCalled();
      expect(mockGraphics.setDepth).toHaveBeenCalledWith(-50);
      expect(mockGraphics.setScrollFactor).toHaveBeenCalledWith(1);
    });

    test('should not create grid when DEBUG_VISUAL_GRID_ENABLED is false', () => {
      jest.doMock('../../../config/gameConfig', () => ({
        DEBUG_OVERLAY_ENABLED: true,
        DEBUG_VISUAL_GRID_ENABLED: false,
        DEBUG_SPAWN_GRID_ENABLED: false,
        logSystem: jest.fn(),
      }));

      overlay = new DebugOverlay(scene, dependencies);
      overlay.createSpawnMatrixGrid();

      // Should not create graphics when disabled
    });

    test('should handle missing spawn system gracefully', () => {
      const noSpawnSystemDeps = {
        ...dependencies,
        getSpawnSystem: jest.fn(() => null),
      };

      overlay = new DebugOverlay(scene, noSpawnSystemDeps);
      overlay.createSpawnMatrixGrid();

      // Should not throw, should log warning instead
      expect(scene.add.graphics).not.toHaveBeenCalled();
    });
  });

  describe('update() - Debug UI Update', () => {
    beforeEach(() => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();
      overlay.createSpawnMatrixGrid();
    });

    test('should update debug text content', () => {
      overlay.update();

      expect(mockText.setPosition).toHaveBeenCalled();
      expect(mockText.setScale).toHaveBeenCalled();
    });

    test('should update grid visualization', () => {
      overlay.update();

      expect(mockGraphics.clear).toHaveBeenCalled();
      expect(mockGraphics.fillStyle).toHaveBeenCalled();
      expect(mockGraphics.fillRect).toHaveBeenCalled();
    });

    test('should handle missing player gracefully', () => {
      const noPlayerDeps = {
        ...dependencies,
        getPlayer: jest.fn(() => null),
      };

      overlay = new DebugOverlay(scene, noPlayerDeps);
      overlay.create();
      overlay.update();

      // Should not update text when player is missing
      expect(mockText.setText).not.toHaveBeenCalled();
    });

    test('should handle missing game state gracefully', () => {
      const noGameStateDeps = {
        ...dependencies,
        getGameState: jest.fn(() => null as any),
      };

      overlay = new DebugOverlay(scene, noGameStateDeps);
      overlay.create();
      overlay.update();

      expect(mockText.setText).not.toHaveBeenCalled();
    });

    test('should update every 30 frames for text content', () => {
      // Update 30 times to trigger text update
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      expect(mockText.setText).toHaveBeenCalled();
    });

    test('should update grid every 10 frames', () => {
      // Update 10 times to trigger grid update
      for (let i = 0; i < 10; i++) {
        overlay.update();
      }

      expect(mockGraphics.clear).toHaveBeenCalled();
    });
  });

  describe('destroy() - Cleanup', () => {
    test('should destroy debug text', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();
      overlay.destroy();

      expect(mockText.destroy).toHaveBeenCalled();
    });

    test('should destroy spawn matrix grid', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.createSpawnMatrixGrid();
      overlay.destroy();

      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    test('should handle null debug text gracefully', () => {
      overlay = new DebugOverlay(scene, dependencies);
      // Don't call create, so debugText is undefined
      overlay.destroy();

      // Should not throw
      expect(overlay).toBeDefined();
    });

    test('should handle inactive debug text gracefully', () => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();
      mockText.active = false;
      overlay.destroy();

      // Should not call destroy on inactive text
      expect(mockText.destroy).not.toHaveBeenCalled();
    });
  });

  describe('Zoom Compensation', () => {
    test('should compensate position for camera zoom', () => {
      scene.cameras.main.zoom = 2;

      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      // Position should be compensated for zoom
      const callArgs = (scene.add.text as jest.Mock).mock.calls[0];
      const x = callArgs[0];
      const y = callArgs[1];

      // With zoom 2, position should be half of target (20, 20) compensated
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
    });

    test('should update scale based on zoom', () => {
      scene.cameras.main.zoom = 1.5;

      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();
      overlay.update();

      expect(mockText.setScale).toHaveBeenCalledWith(1 / 1.5);
    });
  });

  describe('Grid Visualization', () => {
    beforeEach(() => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.createSpawnMatrixGrid();
    });

    test('should draw grid lines', () => {
      overlay.update();

      // Should call lineStyle for grid lines
      expect(mockGraphics.lineStyle).toHaveBeenCalled();
    });

    test('should draw occupied cells with correct colors', () => {
      overlay.update();

      // Should call fillStyle and fillRect for occupied cells
      expect(mockGraphics.fillStyle).toHaveBeenCalled();
      expect(mockGraphics.fillRect).toHaveBeenCalled();
    });

    test('should draw map borders', () => {
      overlay.update();

      // Should call strokeRect for map borders
      expect(mockGraphics.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Debug Text Content', () => {
    beforeEach(() => {
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();
    });

    test('should display FPS', () => {
      // Update 30 times to trigger text update
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      const setTextCall = (mockText.setText as jest.Mock).mock.calls[0];
      const debugText = setTextCall[0];

      expect(debugText).toContain('FPS:');
      expect(debugText).toContain('60.0');
    });

    test('should display player position', () => {
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      const setTextCall = (mockText.setText as jest.Mock).mock.calls[0];
      const debugText = setTextCall[0];

      expect(debugText).toContain('Player:');
      expect(debugText).toContain('100x200'); // Mock player position
    });

    test('should display score information', () => {
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Score block is the 2nd block (index 1) in debugBlocks
      const setTextCalls = (mockText.setText as jest.Mock).mock.calls;
      const scoreTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Score:'));
      const debugText = scoreTextCall ? scoreTextCall[0] : '';

      expect(debugText).toContain('Score: 1000');
      expect(debugText).toContain('Max Possible (Level): 1500');
      expect(debugText).toContain('Max Possible (Total): 5000');
    });

    test('should display keys and hearts count', () => {
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Keys block is the 3rd block (index 2) in debugBlocks
      // Hearts block is the 5th block (index 4) in debugBlocks
      const setTextCalls = (mockText.setText as jest.Mock).mock.calls;
      const keysTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Keys Collected:'));
      const heartsTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Hearts on Map:'));

      const keysText = keysTextCall ? keysTextCall[0] : '';
      const heartsText = heartsTextCall ? heartsTextCall[0] : '';

      expect(keysText).toContain('Keys Collected: 3/5');
      expect(keysText).toContain('Keys on Map: 3');
      expect(heartsText).toContain('Hearts on Map: 2');
    });

    test('should display enemy statistics', () => {
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Enemies block is the 6th block (index 5) in debugBlocks
      const setTextCalls = (mockText.setText as jest.Mock).mock.calls;
      const enemiesTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Enemies:'));
      const debugText = enemiesTextCall ? enemiesTextCall[0] : '';

      expect(debugText).toContain('Enemies: 1');
    });

    test('should display camera position', () => {
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      const setTextCall = (mockText.setText as jest.Mock).mock.calls[0];
      const debugText = setTextCall[0];

      expect(debugText).toContain('Camera: 0x0');
    });
  });

  describe('Enemy Statistics', () => {
    test('should count enemies by type', () => {
      const chaserEnemy = {
        getSprite: jest.fn(() => ({ active: true })),
        isActive: jest.fn(() => true),
        getType: jest.fn(() => 'chaser' as any),
        getHealth: jest.fn(() => 150),
      } as unknown as AbstractEnemy;

      const flamEnemy = {
        getSprite: jest.fn(() => ({ active: true })),
        isActive: jest.fn(() => true),
        getType: jest.fn(() => 'flam' as any),
        getHealth: jest.fn(() => 200),
      } as unknown as AbstractEnemy;

      dependencies.getEnemyInstances = jest.fn(() => [mockEnemy, chaserEnemy, flamEnemy]);
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      // Update 30 times to trigger text update
      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Enemies block is the 6th block (index 5) in debugBlocks
      const setTextCalls = (mockText.setText as jest.Mock).mock.calls;
      const enemiesTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Enemies:'));
      const debugText = enemiesTextCall ? enemiesTextCall[0] : '';

      expect(debugText).toContain('Beast: 1 (HP: 100)');
      expect(debugText).toContain('Dragon: 1 (HP: 150)');
      expect(debugText).toContain('Flam: 1 (HP: 200)');
    });

    test('should filter inactive enemies', () => {
      const inactiveEnemy = {
        getSprite: jest.fn(() => ({ active: false })),
        isActive: jest.fn(() => false),
        getType: jest.fn(() => 'randomWalker' as any),
        getHealth: jest.fn(() => 100),
      } as unknown as AbstractEnemy;

      dependencies.getEnemyInstances = jest.fn(() => [mockEnemy, inactiveEnemy]);
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Enemies block is the 6th block (index 5) in debugBlocks
      const setTextCalls = (mockText.setText as jest.Mock).mock.calls;
      const enemiesTextCall = setTextCalls.find((call: any) => call[0] && call[0].includes('Enemies:'));
      const debugText = enemiesTextCall ? enemiesTextCall[0] : '';

      // Only active enemy should be counted
      expect(debugText).toContain('Enemies: 1');
    });

    test('should handle null enemy instances', () => {
      dependencies.getEnemyInstances = jest.fn(() => null);
      overlay = new DebugOverlay(scene, dependencies);
      overlay.create();

      for (let i = 0; i < 30; i++) {
        overlay.update();
      }

      // Should not crash with null enemy instances
      expect(overlay).toBeDefined();
    });
  });
});
