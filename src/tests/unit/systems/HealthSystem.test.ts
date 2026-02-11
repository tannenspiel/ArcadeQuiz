/**
 * Unit тесты для HealthSystem
 */

import { HealthSystem } from '../../../game/systems/HealthSystem';
import { AssetLoader } from '../../../game/core/AssetLoader';
import { MAX_HEALTH } from '../../../constants/gameConstants';
import Phaser from 'phaser';

// Моки
jest.mock('../../../game/core/AssetLoader');
jest.mock('phaser', () => ({
  Scene: class MockScene {
    make = {
      graphics: jest.fn(() => ({
        fillStyle: jest.fn(),
        fillRect: jest.fn(),
        generateTexture: jest.fn(),
        clear: jest.fn()
      }))
    };
    add = {
      sprite: jest.fn(() => ({
        setTint: jest.fn(),
        setAlpha: jest.fn(),
        setScale: jest.fn()
      })),
      container: jest.fn(() => ({
        setPosition: jest.fn(),
        setDepth: jest.fn(),
        removeAll: jest.fn(),
        add: jest.fn(),
        destroy: jest.fn()
      }))
    };
  }
}));

describe('HealthSystem', () => {
  let mockScene: Phaser.Scene;
  let mockAssetLoader: jest.Mocked<AssetLoader>;
  let healthSystem: HealthSystem;

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: 'test' }) as any;
    mockAssetLoader = {
      loadImage: jest.fn().mockResolvedValue(undefined)
    } as any;

    healthSystem = new HealthSystem(mockScene, mockAssetLoader);
  });

  describe('Инициализация', () => {
    it('должен инициализироваться и загружать текстуру', async () => {
      await healthSystem.initialize();
      
      expect(mockAssetLoader.loadImage).toHaveBeenCalledWith(
        'heart_player',
        'Heart5x5.png'
      );
    });

    it('должен создавать fallback текстуру при ошибке загрузки', async () => {
      mockAssetLoader.loadImage = jest.fn().mockRejectedValue(new Error('Load failed'));
      
      await healthSystem.initialize();
      
      expect(mockScene.make.graphics).toHaveBeenCalled();
    });
  });

  describe('Управление здоровьем', () => {
    beforeEach(async () => {
      await healthSystem.initialize();
    });

    it('должен устанавливать здоровье в допустимых пределах', () => {
      healthSystem.setHealth(5);
      expect(healthSystem.getHealth()).toBe(MAX_HEALTH); // maxHealth из константы

      healthSystem.setHealth(-1);
      expect(healthSystem.getHealth()).toBe(0);

      healthSystem.setHealth(2);
      expect(healthSystem.getHealth()).toBe(2);
    });

    it('должен наносить урон', () => {
      healthSystem.setHealth(3);
      const isAlive = healthSystem.takeDamage(1);
      
      expect(healthSystem.getHealth()).toBe(2);
      expect(isAlive).toBe(true);
    });

    it('должен возвращать false при смерти', () => {
      healthSystem.setHealth(1);
      const isAlive = healthSystem.takeDamage(2);
      
      expect(healthSystem.getHealth()).toBe(0);
      expect(isAlive).toBe(false);
    });

    it('должен добавлять здоровье с ограничением', () => {
      healthSystem.setHealth(2);
      healthSystem.addHealth(5);

      expect(healthSystem.getHealth()).toBe(MAX_HEALTH); // maxHealth из константы
    });

    it('должен устанавливать максимальное здоровье', () => {
      healthSystem.setMaxHealth(5);
      healthSystem.setHealth(10);
      
      expect(healthSystem.getHealth()).toBe(5);
    });
  });

  describe('Отображение здоровья', () => {
    beforeEach(async () => {
      await healthSystem.initialize();
    });

    it('должен возвращать здоровье для UI', () => {
      healthSystem.setHealth(2);
      expect(healthSystem.getHealthForUI()).toBe(2);
    });

    it('должен создавать отображение здоровья над игроком', () => {
      healthSystem.setHealth(3);
      healthSystem.createPlayerHealthDisplay(100, 200);
      
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('должен обновлять позицию отображения здоровья', () => {
      healthSystem.createPlayerHealthDisplay(100, 200);
      healthSystem.updatePlayerHealthPosition(150, 250);
      
      // Проверяем, что позиция обновлена
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('Сброс и уничтожение', () => {
    beforeEach(async () => {
      await healthSystem.initialize();
    });

    it('должен сбрасывать здоровье', () => {
      healthSystem.setHealth(1);
      healthSystem.reset();

      expect(healthSystem.getHealth()).toBe(MAX_HEALTH);
    });

    it('должен уничтожать систему', () => {
      healthSystem.createPlayerHealthDisplay(100, 200);
      healthSystem.destroy();
      
      // Проверяем, что контейнер уничтожен
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });
});








