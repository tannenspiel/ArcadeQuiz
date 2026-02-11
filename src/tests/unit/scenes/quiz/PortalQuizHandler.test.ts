/**
 * Unit тесты для PortalQuizHandler
 */

import { PortalQuizHandler, PortalQuizCallbacks, PortalQuizDependencies } from '../../../../game/scenes/quiz/PortalQuizHandler';
import type { AbstractPortal } from '../../../../game/entities/portals/AbstractPortal';
import { logger } from '../../../../utils/Logger';

// Моки для зависимостей
jest.mock('../../../../game/entities/portals/AbstractPortal');
jest.mock('../../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('PortalQuizHandler', () => {
    let handler: PortalQuizHandler;
    let mockDeps: PortalQuizDependencies;
    let mockCallbacks: PortalQuizCallbacks;
    let mockPortal: jest.Mocked<AbstractPortal>;
    let mockPendingPortal: jest.Mocked<AbstractPortal>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock portal
        mockPortal = {
            getConfig: jest.fn().mockReturnValue({
                id: 1,
                isCorrect: true,
                answerText: 'Yes'
            }),
            getState: jest.fn().mockReturnValue('idle'),
            setMustExit: jest.fn()
        } as any;

        // Mock pending portal
        mockPendingPortal = {
            getConfig: jest.fn().mockReturnValue({
                id: 2,
                isCorrect: false,
                answerText: 'No'
            }),
            getState: jest.fn().mockReturnValue('idle'),
            setMustExit: jest.fn()
        } as any;

        // Mock scene
        const mockScene = {
            time: {
                now: 1000
            }
        };

        mockDeps = {
            scene: mockScene as any,
            portalModalCooldownMs: 500,
            onSetPortalCooldown: jest.fn(),
            onClearPendingPortal: jest.fn()
        };

        mockCallbacks = {
            resumeGame: jest.fn(),
            handlePortalEntry: jest.fn(),
            enablePortalOverlap: jest.fn()
        };

        handler = new PortalQuizHandler(mockDeps, mockCallbacks);
    });

    describe('handleEnterConfirmed', () => {
        it('должен использовать portal если он предоставлен', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            expect(mockCallbacks.handlePortalEntry).toHaveBeenCalledWith(mockPortal);
        });

        it('должен использовать pendingPortal если portal null', () => {
            handler.handleEnterConfirmed(null, mockPendingPortal);

            expect(mockCallbacks.handlePortalEntry).toHaveBeenCalledWith(mockPendingPortal);
        });

        it('должен очищать pendingPortal', () => {
            handler.handleEnterConfirmed(mockPortal, mockPendingPortal);

            expect(mockDeps.onClearPendingPortal).toHaveBeenCalled();
        });

        it('должен устанавливать mustExit на портале', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            expect(mockPortal.setMustExit).toHaveBeenCalled();
        });

        it('должен вызывать handlePortalEntry', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            expect(mockCallbacks.handlePortalEntry).toHaveBeenCalledWith(mockPortal);
        });

        it('должен включать portal overlap', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            expect(mockCallbacks.enablePortalOverlap).toHaveBeenCalled();
        });

        it('должен log-ировать информацию о портале', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            // Проверяем, что logger.log был вызван с правильными аргументами
            expect(logger.log).toHaveBeenCalledWith(
                'QUIZ_PORTAL',
                '🔵 PortalQuizHandler: Portal info:',
                {
                    portalId: 1,
                    isCorrect: true,
                    answerText: 'Yes',
                    state: 'idle'
                }
            );
        });

        it('должен возвращать ошибку если оба портала null', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            handler.handleEnterConfirmed(null, null);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('portalUsed is null')
            );
            expect(mockCallbacks.handlePortalEntry).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('должен приоритет отдавать portal над pendingPortal', () => {
            handler.handleEnterConfirmed(mockPortal, mockPendingPortal);

            expect(mockCallbacks.handlePortalEntry).toHaveBeenCalledWith(mockPortal);
            expect(mockCallbacks.handlePortalEntry).not.toHaveBeenCalledWith(mockPendingPortal);
        });
    });

    describe('handleEnterCancelled', () => {
        it('должен очищать pendingPortal', () => {
            handler.handleEnterCancelled();

            expect(mockDeps.onClearPendingPortal).toHaveBeenCalled();
        });

        it('должен устанавливать cooldown', () => {
            handler.handleEnterCancelled();

            expect(mockDeps.onSetPortalCooldown).toHaveBeenCalledWith(1500); // 1000 + 500
        });

        it('должен возобновлять игру', () => {
            handler.handleEnterCancelled();

            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
        });

        it('должен включать portal overlap', () => {
            handler.handleEnterCancelled();

            expect(mockCallbacks.enablePortalOverlap).toHaveBeenCalled();
        });

        it('должен log-ировать cooldown значение', () => {
            handler.handleEnterCancelled();

            // Проверяем, что logger.log был вызван с правильными аргументами
            expect(logger.log).toHaveBeenCalledWith(
                'QUIZ_PORTAL',
                '✅ PortalQuizHandler: Portal cooldown set to:',
                1500
            );
        });

        it('должен правильно рассчитывать cooldown от текущего времени', () => {
            mockDeps.scene.time.now = 2000;

            handler.handleEnterCancelled();

            expect(mockDeps.onSetPortalCooldown).toHaveBeenCalledWith(2500); // 2000 + 500
        });

        it('должен использовать portalModalCooldownMs для расчета', () => {
            mockDeps.portalModalCooldownMs = 1000;
            mockDeps.scene.time.now = 500;

            handler.handleEnterCancelled();

            expect(mockDeps.onSetPortalCooldown).toHaveBeenCalledWith(1500); // 500 + 1000
        });
    });

    describe('Интеграция сценариев', () => {
        it('должен корректно обрабатывать последовательность: confirm', () => {
            handler.handleEnterConfirmed(mockPortal, null);

            expect(mockDeps.onClearPendingPortal).toHaveBeenCalled();
            expect(mockPortal.setMustExit).toHaveBeenCalled();
            expect(mockCallbacks.handlePortalEntry).toHaveBeenCalledWith(mockPortal);
            expect(mockCallbacks.enablePortalOverlap).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать последовательность: cancel', () => {
            handler.handleEnterCancelled();

            expect(mockDeps.onClearPendingPortal).toHaveBeenCalled();
            expect(mockDeps.onSetPortalCooldown).toHaveBeenCalled();
            expect(mockCallbacks.resumeGame).toHaveBeenCalled();
            expect(mockCallbacks.enablePortalOverlap).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать: cancel после confirm', () => {
            handler.handleEnterConfirmed(mockPortal, null);
            handler.handleEnterCancelled();

            // onClearPendingPortal должен быть вызван дважды
            expect(mockDeps.onClearPendingPortal).toHaveBeenCalledTimes(2);
            // enablePortalOverlap тоже дважды
            expect(mockCallbacks.enablePortalOverlap).toHaveBeenCalledTimes(2);
        });
    });
});
