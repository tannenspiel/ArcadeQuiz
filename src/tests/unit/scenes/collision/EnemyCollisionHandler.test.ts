/**
 * Unit тесты для EnemyCollisionHandler
 */

import { EnemyCollisionHandler } from '../../../../game/scenes/collision/EnemyCollisionHandler';
import type { AbstractEnemy } from '../../../../game/entities/enemies/AbstractEnemy';
import { PENALTY } from '../../../../constants/scoreConstants';

describe('EnemyCollisionHandler', () => {
    let handler: EnemyCollisionHandler;
    let mockScene: any;
    let mockEnemy: any;
    let mockPlayer: any;
    let mockPlayerSprite: any;
    let mockEnemySprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock player sprite
        mockPlayerSprite = {
            x: 100,
            y: 100,
            active: true,
            once: jest.fn()
        };

        // Mock player
        mockPlayer = {
            getSprite: jest.fn().mockReturnValue(mockPlayerSprite),
            loseKey: jest.fn(),
            takeDamage: jest.fn(),
            finishDamage: jest.fn()
        };

        // Mock enemy sprite
        mockEnemySprite = {
            x: 50,
            y: 50,
            active: true
        };

        // Mock enemy
        mockEnemy = {
            getSprite: jest.fn().mockReturnValue(mockEnemySprite),
            getDamage: jest.fn().mockReturnValue(1),
            onPlayerCollision: jest.fn(),
            lastCollisionTime: 0,
            COLLISION_COOLDOWN: 500
        };

        // Mock scene dependencies
        const mockGameState = {
            getKeys: jest.fn().mockReturnValue(0),
            removeKey: jest.fn(),
            // ⚠️ NEW: 2026-01-31 - Добавлены методы для механики монеток
            getCoins: jest.fn().mockReturnValue(0),
            removeCoin: jest.fn(),
            getMaxCoins: jest.fn().mockReturnValue(3),
            getGamePhase: jest.fn().mockReturnValue('KEY'),
            isQuizActive: jest.fn().mockReturnValue(false),
            setQuizActive: jest.fn(),
        };

        const mockAudioManager = {
            playDamageKey: jest.fn(),
            playDamage: jest.fn(),
            playDamageCoin: jest.fn(),
            playCharacterDead: jest.fn()
        };

        const mockScoreSystem = {
            addScore: jest.fn(),
            removeScore: jest.fn() // ✅ Добавлено для штрафов
        };

        const mockHealthSystem = {
            takeDamage: jest.fn().mockReturnValue(true),
            getHeartPositions: jest.fn().mockReturnValue([])
        };

        const mockEffectsManager = {
            triggerRingLossEffect: jest.fn(),
            flashPlayerLoseKey: jest.fn()
        };

        const mockHUDManager = {
            update: jest.fn()
        };

        const mockGameOverHandler = {
            handleGameOver: jest.fn()
        };

        // Mock player
        mockPlayer = {
            getSprite: jest.fn().mockReturnValue(mockPlayerSprite),
            loseKey: jest.fn(),
            takeDamage: jest.fn(),
            finishDamage: jest.fn(),
            updateCoins: jest.fn()
        };

        // Mock scene
        mockScene = {
            sys: {
                settings: {
                    active: true
                }
            },
            time: {
                now: 1000,
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            },
            player: mockPlayer,
            audioManager: mockAudioManager,
            scoreSystem: mockScoreSystem,
            healthSystem: mockHealthSystem,
            effectsManager: mockEffectsManager,
            hudManager: mockHUDManager,
            gameOverHandler: mockGameOverHandler
        };

        // Add gameState via getter (as it's accessed via (this.scene as any).gameState)
        Object.defineProperty(mockScene, 'gameState', {
            get: jest.fn().mockReturnValue(mockGameState),
            configurable: true
        });

        handler = new EnemyCollisionHandler(mockScene);
    });

    describe('Обработка коллизии с врагом', () => {
        it('должен игнорировать коллизию если сцена неактивна', () => {
            mockScene.sys.settings.active = false;

            handler.handle(mockEnemy);

            expect(mockEnemy.onPlayerCollision).not.toHaveBeenCalled();
        });

        it('должен игнорировать коллизию если спрайт врага неактивен', () => {
            mockEnemySprite.active = false;
            mockEnemy.getSprite.mockReturnValue(mockEnemySprite);

            handler.handle(mockEnemy);

            expect(mockEnemy.onPlayerCollision).not.toHaveBeenCalled();
        });

        it('должен игнорировать коллизию если спрайт врага отсутствует', () => {
            mockEnemy.getSprite.mockReturnValue(null);

            handler.handle(mockEnemy);

            expect(mockEnemy.onPlayerCollision).not.toHaveBeenCalled();
        });

        it('должен уважать cooldown коллизии для одного врага', () => {
            mockEnemy.lastCollisionTime = 900; // Недавно столкновение
            mockScene.time.now = 1000;

            handler.handle(mockEnemy);

            expect(mockEnemy.onPlayerCollision).not.toHaveBeenCalled();
        });

        it('должен вызывать onPlayerCollision у врага', () => {
            handler.handle(mockEnemy);

            expect(mockEnemy.onPlayerCollision).toHaveBeenCalledWith(mockPlayerSprite);
            expect((mockEnemy as any).lastCollisionTime).toBe(1000);
        });
    });

    describe('Потеря ключа при наличии ключей', () => {
        beforeEach(() => {
            mockScene.gameState.getKeys.mockReturnValue(3);
        });

        it('должен удалять один ключ', () => {
            handler.handle(mockEnemy);

            expect(mockScene.gameState.removeKey).toHaveBeenCalled();
        });

        it('должен проигрывать звук потери ключа', () => {
            handler.handle(mockEnemy);

            expect(mockScene.audioManager.playDamageKey).toHaveBeenCalled();
        });

        it('должен уменьшать счёт на 7 (PENALTY.ENEMY_DAMAGE_BASE + PENALTY.KEY_LOST)', () => {
            handler.handle(mockEnemy);

            const expectedPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.KEY_LOST); // 2 + 5 = 7
            expect(mockScene.scoreSystem.removeScore).toHaveBeenCalledWith(expectedPenalty);
        });

        it('должен вызывать triggerRingLossEffect с количеством ключей', () => {
            handler.handle(mockEnemy);

            expect(mockScene.effectsManager.triggerRingLossEffect).toHaveBeenCalledWith(3);
        });

        it('должен вызывать flashPlayerLoseKey', () => {
            handler.handle(mockEnemy);

            expect(mockScene.effectsManager.flashPlayerLoseKey).toHaveBeenCalled();
        });

        it('должен вызывать loseKey у игрока', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.loseKey).toHaveBeenCalled();
        });

        it('НЕ должен вызывать takeDamage у игрока', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).not.toHaveBeenCalled();
        });

        it('НЕ должен вызывать HealthSystem.takeDamage', () => {
            handler.handle(mockEnemy);

            expect(mockScene.healthSystem.takeDamage).not.toHaveBeenCalled();
        });

        it('должен обновлять HUD', () => {
            handler.handle(mockEnemy);

            expect(mockScene.hudManager.update).toHaveBeenCalled();
        });
    });

    describe('Получение урона при отсутствии ключей', () => {
        beforeEach(() => {
            mockScene.gameState.getKeys.mockReturnValue(0);
        });

        it('должен вызывать takeDamage у игрока с направлением от врага', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(50, 50); // playerPos - enemyPos
        });

        it('должен проигрывать звук урона', () => {
            handler.handle(mockEnemy);

            expect(mockScene.audioManager.playDamage).toHaveBeenCalled();
        });

        it('НЕ должен удалять ключ', () => {
            handler.handle(mockEnemy);

            expect(mockScene.gameState.removeKey).not.toHaveBeenCalled();
        });

        it('НЕ должен вызывать loseKey у игрока', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.loseKey).not.toHaveBeenCalled();
        });

        describe('Обработка анимации повреждения', () => {
            it('должен подписываться на событие animationcomplete', () => {
                handler.handle(mockEnemy);

                expect(mockPlayerSprite.once).toHaveBeenCalledWith(
                    'animationcomplete',
                    expect.any(Function)
                );
            });
        });

        describe('Выживание после урона', () => {
            beforeEach(() => {
                mockScene.healthSystem.takeDamage.mockReturnValue(true);
            });

            it('должен вызывать finishDamage(true) при выживании', () => {
                // Эмулируем callback из animationcomplete
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                // Эмулируем событие animationcomplete
                const mockAnimation = { key: 'character_damaged' };
                animationCallback(mockAnimation);

                expect(mockScene.healthSystem.takeDamage).toHaveBeenCalledWith(1);
                expect(mockPlayer.finishDamage).toHaveBeenCalledWith(true);
                expect(mockScene.audioManager.playCharacterDead).not.toHaveBeenCalled();
                expect(mockScene.gameOverHandler.handleGameOver).not.toHaveBeenCalled();
            });

            it('должен обновлять HUD', () => {
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                const mockAnimation = { key: 'character_damaged' };
                animationCallback(mockAnimation);

                expect(mockScene.hudManager.update).toHaveBeenCalled();
            });
        });

        describe('Смерть от урона', () => {
            beforeEach(() => {
                mockScene.healthSystem.takeDamage.mockReturnValue(false);
            });

            it('должен вызывать finishDamage(false) при смерти', () => {
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                const mockAnimation = { key: 'character_damaged' };
                animationCallback(mockAnimation);

                expect(mockScene.healthSystem.takeDamage).toHaveBeenCalledWith(1);
                expect(mockPlayer.finishDamage).toHaveBeenCalledWith(false);
                expect(mockScene.audioManager.playCharacterDead).toHaveBeenCalled();
            });

            it('должен вызывать handleGameOver после задержки', () => {
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                const mockAnimation = { key: 'character_damaged' };
                animationCallback(mockAnimation);

                expect(mockScene.gameOverHandler.handleGameOver).toHaveBeenCalledWith('lose');
            });

            it('должен обновлять HUD', () => {
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                const mockAnimation = { key: 'character_damaged' };
                animationCallback(mockAnimation);

                expect(mockScene.hudManager.update).toHaveBeenCalled();
            });
        });

        describe('Игнорирование других анимаций', () => {
            it('не должен обрабатывать animationcomplete для других анимаций', () => {
                handler.handle(mockEnemy);
                const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

                const mockAnimation = { key: 'character_idle' };
                animationCallback(mockAnimation);

                expect(mockScene.healthSystem.takeDamage).not.toHaveBeenCalled();
            });
        });
    });

    describe('Направление отбрасывания', () => {
        it('должен вычислять правильное направление когда игрок справа от врага', () => {
            mockPlayerSprite.x = 150;
            mockPlayerSprite.y = 100;
            mockEnemySprite.x = 50;
            mockEnemySprite.y = 100;

            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(100, 0); // x: 150-50=100, y: 100-100=0
        });

        it('должен вычислять правильное направление когда игрок слева от врага', () => {
            mockPlayerSprite.x = 50;
            mockPlayerSprite.y = 100;
            mockEnemySprite.x = 150;
            mockEnemySprite.y = 100;

            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(-100, 0); // x: 50-150=-100, y: 100-100=0
        });

        it('должен вычислять правильное направление когда игрок над врагом', () => {
            mockPlayerSprite.x = 100;
            mockPlayerSprite.y = 50;
            mockEnemySprite.x = 100;
            mockEnemySprite.y = 150;

            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(0, -100); // x: 100-100=0, y: 50-150=-100
        });

        it('должен вычислять правильное направление по диагонали', () => {
            mockPlayerSprite.x = 150;
            mockPlayerSprite.y = 150;
            mockEnemySprite.x = 50;
            mockEnemySprite.y = 50;

            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(100, 100); // x: 150-50=100, y: 150-50=100
        });
    });

    describe('Получение урона от врага', () => {
        it('должен использовать урон из конфига врага', () => {
            mockEnemy.getDamage.mockReturnValue(2);
            mockScene.gameState.getKeys.mockReturnValue(0);

            handler.handle(mockEnemy);
            const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

            const mockAnimation = { key: 'character_damaged' };
            animationCallback(mockAnimation);

            expect(mockScene.healthSystem.takeDamage).toHaveBeenCalledWith(2);
        });

        it('должен использовать дефолтный урон если getDamage не вызывался', () => {
            mockEnemy.getDamage.mockReturnValue(1);
            mockScene.gameState.getKeys.mockReturnValue(0);

            handler.handle(mockEnemy);
            const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

            const mockAnimation = { key: 'character_damaged' };
            animationCallback(mockAnimation);

            expect(mockScene.healthSystem.takeDamage).toHaveBeenCalledWith(1);
        });
    });

    // ================================================
    // ✅ НОВЫЕ ТЕСТЫ: Монеты НЕ защищают от урона
    // ================================================
    describe('Механика монеток согласно GameDescription.md', () => {
        beforeEach(() => {
            // НЕТ ключей, ЕСТЬ монетки
            mockScene.gameState.getKeys.mockReturnValue(0);
            mockScene.gameState.getCoins.mockReturnValue(2);
        });

        it('должен удалять одну монетку при наличии монеток', () => {
            handler.handle(mockEnemy);

            expect(mockScene.gameState.removeCoin).toHaveBeenCalled();
        });

        it('должен вызывать takeDamage у игрока (монеты НЕ защищают!)', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.takeDamage).toHaveBeenCalled();
        });

        it('должен вызывать HealthSystem.takeDamage (монеты НЕ защищают!)', () => {
            handler.handle(mockEnemy);
            const animationCallback = mockPlayerSprite.once.mock.calls[0][1];

            const mockAnimation = { key: 'character_damaged' };
            animationCallback(mockAnimation);

            expect(mockScene.healthSystem.takeDamage).toHaveBeenCalled();
        });

        it('должен проигрывать звук потери монетки', () => {
            handler.handle(mockEnemy);

            expect(mockScene.audioManager.playDamageCoin).toHaveBeenCalled();
        });

        it('должен обновлять мон acreтки над игроком', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.updateCoins).toHaveBeenCalled();
        });

        it('должен уменьшать счёт на 5 (PENALTY.ENEMY_DAMAGE_BASE + PENALTY.COIN_LOST)', () => {
            handler.handle(mockEnemy);

            const expectedPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.COIN_LOST); // 2 + 3 = 5
            expect(mockScene.scoreSystem.removeScore).toHaveBeenCalledWith(expectedPenalty);
        });

        it('НЕ должен удалять ключ (ключей нет)', () => {
            handler.handle(mockEnemy);

            expect(mockScene.gameState.removeKey).not.toHaveBeenCalled();
        });

        it('НЕ должен вызывать loseKey (ключей нет)', () => {
            handler.handle(mockEnemy);

            expect(mockPlayer.loseKey).not.toHaveBeenCalled();
        });
    });

    describe('Сравнение штрафов согласно GameDescription.md', () => {
        it('должен штрафовать на 7 очков при потере ключа (2 + 5)', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockScene.gameState.getCoins.mockReturnValue(0);

            handler.handle(mockEnemy);

            const expectedPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.KEY_LOST); // 2 + 5 = 7
            expect(mockScene.scoreSystem.removeScore).toHaveBeenCalledWith(expectedPenalty);
        });

        it('должен штрафовать на 5 очков при потере мон acreтки (2 + 3)', () => {
            mockScene.gameState.getKeys.mockReturnValue(0);
            mockScene.gameState.getCoins.mockReturnValue(1);

            handler.handle(mockEnemy);

            const expectedPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.COIN_LOST); // 2 + 3 = 5
            expect(mockScene.scoreSystem.removeScore).toHaveBeenCalledWith(expectedPenalty);
        });

        it('должен штрафовать на 2 очка когда нет ни ключей, ни монеток', () => {
            mockScene.gameState.getKeys.mockReturnValue(0);
            mockScene.gameState.getCoins.mockReturnValue(0);

            handler.handle(mockEnemy);

            const expectedPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE); // 2
            expect(mockScene.scoreSystem.removeScore).toHaveBeenCalledWith(expectedPenalty);
        });
    });
});
