/**
 * Unit тесты для AnimationSyncManager
 */

import { AnimationSyncManager, AnimationSyncer } from '../../../../game/scenes/animation/AnimationSyncManager';

describe('AnimationSyncManager', () => {
    let manager: AnimationSyncManager;
    let mockSyncer1: AnimationSyncer;
    let mockSyncer2: AnimationSyncer;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new AnimationSyncManager();

        mockSyncer1 = {
            update: jest.fn()
        };

        mockSyncer2 = {
            update: jest.fn()
        };
    });

    describe('register', () => {
        it('должен регистрировать синхронизатор', () => {
            manager.register(mockSyncer1);

            expect(manager['syncers']).toContain(mockSyncer1);
        });

        it('должен регистрировать несколько синхронизаторов', () => {
            manager.register(mockSyncer1);
            manager.register(mockSyncer2);

            expect(manager['syncers']).toHaveLength(2);
            expect(manager['syncers']).toContain(mockSyncer1);
            expect(manager['syncers']).toContain(mockSyncer2);
        });

        it('должен сохранять порядок регистрации', () => {
            manager.register(mockSyncer1);
            manager.register(mockSyncer2);

            expect(manager['syncers'][0]).toBe(mockSyncer1);
            expect(manager['syncers'][1]).toBe(mockSyncer2);
        });
    });

    describe('update', () => {
        it('должен обновлять все зарегистрированные синхронизаторы', () => {
            manager.register(mockSyncer1);
            manager.register(mockSyncer2);

            manager.update(16.67);

            expect(mockSyncer1.update).toHaveBeenCalledWith(16.67);
            expect(mockSyncer2.update).toHaveBeenCalledWith(16.67);
        });

        it('должен передавать delta значение синхронизаторам', () => {
            manager.register(mockSyncer1);

            manager.update(33.33);

            expect(mockSyncer1.update).toHaveBeenCalledWith(33.33);
        });

        it('не должен падать если нет синхронизаторов', () => {
            expect(() => manager.update(16.67)).not.toThrow();
        });

        it('должен вызывать update у всех синхронизаторов в порядке регистрации', () => {
            const callOrder: number[] = [];
            mockSyncer1.update = jest.fn(() => callOrder.push(1));
            mockSyncer2.update = jest.fn(() => callOrder.push(2));

            manager.register(mockSyncer1);
            manager.register(mockSyncer2);

            manager.update(16.67);

            expect(callOrder).toEqual([1, 2]);
        });
    });

    describe('destroy', () => {
        it('должен очищать список синхронизаторов', () => {
            manager.register(mockSyncer1);
            manager.register(mockSyncer2);

            manager.destroy();

            expect(manager['syncers']).toHaveLength(0);
        });

        it('должен позволять регистрировать новые синхронизаторы после destroy', () => {
            manager.register(mockSyncer1);
            manager.destroy();

            manager.register(mockSyncer2);

            expect(manager['syncers']).toHaveLength(1);
            expect(manager['syncers']).toContain(mockSyncer2);
        });

        it('не должен вызывать destroy у синхронизаторов', () => {
            // AnimationSyncManager не отвечает за lifecycle синхронизаторов
            const syncerWithDestroy = {
                update: jest.fn(),
                destroy: jest.fn()
            } as any;

            manager.register(syncerWithDestroy);
            manager.destroy();

            expect(syncerWithDestroy.destroy).not.toHaveBeenCalled();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно работать с динамической регистрацией', () => {
            manager.register(mockSyncer1);
            manager.update(16.67);

            expect(mockSyncer1.update).toHaveBeenCalledTimes(1);

            manager.register(mockSyncer2);
            manager.update(16.67);

            expect(mockSyncer1.update).toHaveBeenCalledTimes(2);
            expect(mockSyncer2.update).toHaveBeenCalledTimes(1);
        });

        it('должен игнорировать удалённые синхронизаторы после destroy', () => {
            manager.register(mockSyncer1);
            manager.register(mockSyncer2);
            manager.destroy();

            manager.update(16.67);

            expect(mockSyncer1.update).not.toHaveBeenCalled();
            expect(mockSyncer2.update).not.toHaveBeenCalled();
        });
    });
});
