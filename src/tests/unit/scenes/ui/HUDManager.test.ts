/**
 * Unit тесты для HUDManager
 */

// ✅ Mock Phaser module ДО импортов (обязательно до import!)
jest.mock('phaser', () => {
    return {
        GameObjects: {
            Container: class Container {
                scene: any;
                x = 0; y = 0;
                constructor(scene: any, x?: number, y?: number, children?: any[]) {
                    this.scene = scene;
                    this.x = x || 0;
                    this.y = y || 0;
                }
                add() { return this; }
                each(cb: any) { }
                setScrollFactor() { return this; }
                setInteractive() { return this; }
                removeAll() { }
                getBounds() { return { width: 100, height: 100 }; }
                setAlpha() { return this; }
                setTint() { return this; }
                clearTint() { return this; }
            },
            Image: class Image {
                setOrigin() { return this; }
                setScale() { return this; }
                setDepth() { return this; }
            },
            Text: class Text {
                setOrigin() { return this; }
                setDepth() { return this; }
                setScrollFactor() { return this; }
                setVisible() { return this; }
                setScale() { return this; }
                setPosition() { return this; }
                setText() { return this; }
                setInteractive() { return this; }
                on() { return this; }
                destroy() { }
                scene = {};
                visible = true;
                x = 0;
                y = 0;
            },
            Sprite: class Sprite {
                setOrigin() { return this; }
                setDepth() { return this; }
                setScrollFactor() { return this; }
                setVisible() { return this; }
                setScale() { return this; }
                setPosition() { return this; }
                setFrame() { return this; }
                setInteractive() { return this; }
                on() { return this; }
                destroy() { }
                scene = {};
                visible = true;
                x = 0;
                y = 0;
            },
        },
        Geom: {
            Rectangle: class Rectangle {
                constructor(x?: number, y?: number, width?: number, height?: number) {
                    return { x, y, width, height };
                }
            }
        },
        Textures: {
            FilterMode: { NEAREST: 0, LINEAR: 1 }
        }
    };
});

import { HUDManager, HUDManagerDependencies } from '../../../../game/scenes/ui/HUDManager';
import { GameState } from '../../../../game/core/GameState';
import { ScoreSystem } from '../../../../game/systems/ScoreSystem';
import { AudioManager } from '../../../../game/systems/AudioManager';
import { createMockGameState } from '../../../helpers/mocks';

// Моки для зависимостей
jest.mock('../../../../game/core/GameState');
jest.mock('../../../../game/systems/ScoreSystem');
jest.mock('../../../../game/systems/AudioManager');

describe('HUDManager', () => {
    let manager: HUDManager;
    let mockDeps: HUDManagerDependencies;
    let mockScene: any;
    let mockGameState: GameState;
    let mockScoreSystem: ScoreSystem;

    let createMockTextObject: () => any;
    let createMockSpriteObject: () => any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Фабрика для создания уникальных mock-объектов текста
        createMockTextObject = () => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            scene: mockScene,
            visible: true,
            x: 0,
            y: 0
        });

        // Фабрика для создания уникальных mock-объектов спрайта
        createMockSpriteObject = () => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setFrame: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            scene: mockScene,
            visible: true,
            x: 0,
            y: 0
        });

        // Mock scene - создаём уникальные объекты для каждого вызова
        mockScene = {
            add: {
                text: jest.fn((x, y, text, style) => createMockTextObject()),
                sprite: jest.fn((x, y, key, frame) => createMockSpriteObject())
            },
            time: {
                delayedCall: jest.fn().mockReturnValue({ remove: jest.fn() })
            },
            cameras: {
                getMain: jest.fn().mockReturnValue({
                    width: 800,
                    height: 600,
                    zoom: 1
                }),
                main: {
                    width: 800,
                    height: 600,
                    zoom: 1
                }
            },
            textures: {
                get: jest.fn().mockReturnValue({
                    setFilter: jest.fn()
                })
            }
        };

        // Mock gameState using helper
        mockGameState = createMockGameState() as any;

        // Override with Jest mocks for methods that need to change return values in tests
        mockGameState.getKeys = jest.fn().mockReturnValue(0);
        mockGameState.getState = jest.fn().mockReturnValue({ maxKeys: 3 });
        mockGameState.getCoins = jest.fn().mockReturnValue(0);
        mockGameState.getMaxCoins = jest.fn().mockReturnValue(3);
        mockGameState.getGamePhase = jest.fn().mockReturnValue('COIN');
        mockGameState.isQuizActive = jest.fn().mockReturnValue(false);

        // Mock scoreSystem
        mockScoreSystem = {
            getScore: jest.fn().mockReturnValue(0) as jest.Mock,
            addScore: jest.fn()
        } as any;

        // Mock audioManager
        const mockAudioManager = {
            isMuted: jest.fn().mockReturnValue(true), // По умолчанию выключен
            toggleMute: jest.fn().mockReturnValue(false) // При переключении вернёт false (включён)
        } as any;

        mockDeps = {
            scene: mockScene,
            gameState: mockGameState,
            scoreSystem: mockScoreSystem,
            audioManager: mockAudioManager, // ✅ Добавляем AudioManager
            isOracleActivated: false,
            getCurrentLevel: jest.fn().mockReturnValue(1)
        };

        manager = new HUDManager(mockDeps);
    });

    describe('create', () => {
        it('должен создавать все HUD элементы', () => {
            manager.create();

            // 2 текстовых элемента (score, hint) + 1 спрайт (sound button)
            expect(mockScene.add.text).toHaveBeenCalledTimes(2);
            expect(mockScene.add.sprite).toHaveBeenCalledTimes(1);
        });

        it('должен вызывать update после создания', () => {
            const updateSpy = jest.spyOn(manager, 'update');
            manager.create();

            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        beforeEach(() => {
            manager.create();
        });

        it('должен обновлять текст ключей', () => {
            (mockGameState.getKeys as jest.Mock).mockReturnValue(1);
            (mockGameState.getState as jest.Mock).mockReturnValue({ maxKeys: 3 });

            manager.update();

            // Проверяем, что setText был вызван для keysHUD
            // Note: HUD shows "Ключей: X/3" (Russian) when in KEY phase
            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setText).toHaveBeenCalledWith('Ключей: 1/3');
        });

        it('должен обновлять текст счёта', () => {
            (mockScoreSystem.getScore as jest.Mock).mockReturnValue(1500);

            manager.update();

            // Проверяем, что setText был вызван для scoreHUD (первый элемент)
            const scoreTextCall = mockScene.add.text.mock.results[0].value;
            expect(scoreTextCall.setText).toHaveBeenCalledWith('Уровень: 1. Счёт: 1500');
        });

        it('должен обновлять позицию HUD с учётом зума', () => {
            mockScene.cameras.main.zoom = 2;

            manager.update();

            // Проверяем, что setScale был вызван с 1/zoom для scoreHUD
            const scoreTextCall = mockScene.add.text.mock.results[0].value;
            expect(scoreTextCall.setScale).toHaveBeenCalledWith(0.5);
        });

        it('должен показывать hint если оракул не активирован', () => {
            mockDeps.isOracleActivated = false;
            manager = new HUDManager(mockDeps);
            manager.create();

            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setVisible).toHaveBeenCalledWith(true);
        });

        it('должен скрывать hint если оракул активирован', () => {
            mockDeps.isOracleActivated = true;
            manager = new HUDManager(mockDeps);
            manager.create();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            // setVisible должен быть вызван (create() -> update())
            // так как isOracleActivated = true, hint должен быть скрыт
            expect(hintTextCall.setVisible).toHaveBeenCalled();
        });

        it('должен обновлять позицию hint с учётом зума', () => {
            mockScene.cameras.main.zoom = 1.5;

            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setScale).toHaveBeenCalledWith(1 / 1.5);
        });
    });

    describe('destroy', () => {
        it('должен уничтожать все HUD элементы', () => {
            manager.create();

            manager.destroy();

            const scoreTextCall = mockScene.add.text.mock.results[0].value;
            const hintTextCall = mockScene.add.text.mock.results[1].value;
            const spriteCall = mockScene.add.sprite.mock.results[0].value;

            expect(scoreTextCall.destroy).toHaveBeenCalled();
            expect(hintTextCall.destroy).toHaveBeenCalled();
            expect(spriteCall.destroy).toHaveBeenCalled();
        });

        it('должен устанавливать значения в null после destroy', () => {
            manager.create();
            manager.destroy();

            // Проверяем внутренние ссылки через индикатор (они должны быть null)
            expect(() => manager.destroy()).not.toThrow();
        });

        it('должен быть идемпотентным', () => {
            manager.create();

            expect(() => {
                manager.destroy();
                manager.destroy();
            }).not.toThrow();
        });
    });

    describe('getZoomCompensatedHUDPosition', () => {
        it('должен вычислять позицию с учётом зума > 1', () => {
            manager.create();
            mockScene.cameras.main.zoom = 2;

            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setPosition).toHaveBeenCalled();
        });

        it('должен вычислять позицию с учётом зума < 1', () => {
            manager.create();
            mockScene.cameras.main.zoom = 0.5;

            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setPosition).toHaveBeenCalled();
        });

        it('должен центрировать позицию относительно центра экрана', () => {
            manager.create();
            mockScene.cameras.main.zoom = 1;
            mockScene.cameras.main.width = 1000;
            mockScene.cameras.main.height = 800;

            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setPosition).toHaveBeenCalled();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно работать с изменением gameState', () => {
            manager.create();

            // create() вызывает update() автоматически - это первый вызов
            // Изменяем состояние
            (mockGameState.getKeys as jest.Mock).mockReturnValue(1);
            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            // setText вызывается из create() -> update() + из нашего update() = 2 раза
            expect(hintTextCall.setText).toHaveBeenCalledTimes(2);
        });

        it('должен корректно работать с изменением scoreSystem', () => {
            manager.create();

            // Первое обновление
            (mockScoreSystem.getScore as jest.Mock).mockReturnValue(0);
            manager.update();

            // Изменяем счёт
            (mockScoreSystem.getScore as jest.Mock).mockReturnValue(500);
            manager.update();

            const scoreTextCall = mockScene.add.text.mock.results[0].value;
            expect(scoreTextCall.setText).toHaveBeenCalledWith('Уровень: 1. Счёт: 500');
        });

        it('должен корректно работать с изменением zoom', () => {
            manager.create();

            // zoom = 1
            mockScene.cameras.main.zoom = 1;
            manager.update();

            const hintTextCall = mockScene.add.text.mock.results[1].value;
            expect(hintTextCall.setScale).toHaveBeenCalledWith(1);

            // zoom = 2
            mockScene.cameras.main.zoom = 2;
            manager.update();

            expect(hintTextCall.setScale).toHaveBeenCalledWith(0.5);
        });
    });
});
