import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { EventBus } from '../game/EventBus';
import LoadingScene from '../game/scenes/LoadingScene';
import MainScene from '../game/scenes/MainScene';
import { BASE_GAME_HEIGHT } from '../constants/gameConstants';
import { DeviceUtils } from '../utils/DeviceUtils';
import { logger } from '../utils/Logger';
import { logAspectRatioRange } from '../game/utils/FontSizeCalculator';

export interface IPhaserGameRef {
    game: Phaser.Game | null;
}

// Helper function to get viewport size with SSR safety
const getViewportSize = () => {
    if (typeof window === 'undefined') {
        // SSR fallback - use project's virtual resolution
        return { width: 1280, height: 720 };
    }
    return {
        width: window.visualViewport?.width || window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight
    };
};

const PhaserGame = forwardRef<IPhaserGameRef, {}>((props, ref) => {
    const gameInstance = React.useRef<Phaser.Game | null>(null);
    const [showUpdate, setShowUpdate] = useState(false);

    useImperativeHandle(ref, () => ({ game: gameInstance.current }), []);

    useEffect(() => {
        // ================================================
        // АДАПТИВНОЕ ВИРТУАЛЬНОЕ РАЗРЕШЕНИЕ ИГРЫ
        // ================================================
        // Виртуальный экран адаптируется под соотношение сторон реального экрана
        // Высота фиксирована (BASE_GAME_HEIGHT), ширина вычисляется динамически
        // Phaser.Scale.FIT масштабирует виртуальный экран на реальный экран с сохранением пропорций
        // Canvas заполняет 100% viewport → letterboxing отсутствует



        const gameSize = DeviceUtils.getGameSize();
        const viewportSize = getViewportSize();
        logger.log('VIEWPORT_RESIZE', `Virtual screen size (adaptive): ${gameSize.width} x ${gameSize.height}`);
        logger.log('VIEWPORT_RESIZE', `Viewport size: ${viewportSize.width} x ${viewportSize.height}`);
        logger.log('VIEWPORT_RESIZE', 'Scale mode: FIT (adaptive virtual resolution)');

        const config: Phaser.Types.Core.GameConfig = {
            // ✅ Явно указываем WEBGL (быстрее на ПК)
            // AUTO может выбирать CANVAS на некоторых системах, что медленнее
            type: Phaser.WEBGL,
            parent: 'game-container',
            width: gameSize.width,
            height: gameSize.height,
            backgroundColor: '#000000', // ✅ Черный фон для совпадения с LoadingScene
            fps: {
                // Ограничиваем до 60 FPS для стабильности
                // На ПК с 144Hz мониторами может рендерить больше, чем нужно
                target: 60,
                forceSetTimeOut: true
            },
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                    gravity: { x: 0, y: 0 }
                }
            },
            scale: {
                // ================================================
                // СИСТЕМА МАСШТАБИРОВАНИЯ (FIT для стабильности)
                // ================================================
                // FIT масштабирует адаптивный виртуальный экран до максимального размера,
                // полностью вмещая его в видимую область (Viewport) экрана
                // Виртуальная ширина вычисляется динамически на основе соотношения сторон экрана
                // Виртуальная высота фиксирована (BASE_GAME_HEIGHT = 1280)
                // Canvas заполняет 100% viewport → letterboxing отсутствует
                // Расширенный фон (TileSprite) заполняет области за пределами игрового мира 2048×2048
                mode: Phaser.Scale.FIT,
                // Центрирование игрового холста на экране
                autoCenter: Phaser.Scale.CENTER_BOTH,
                // Используем visualViewport для мобильных устройств (если доступен)
                resizeInterval: 100
            },
            scene: [LoadingScene, MainScene],
            // ✅ ОТКЛЮЧАЕМ логи Phaser в production для чистой консоли
            fps: {
                min: 30,
                target: 60,
                forceSetTimeOut: true, // ✅ Устраняет [Violation] 'setTimeout' handler took <N>ms
                smoothStep: true,
                // ✅ Отключаем warnings о долгих обработчиках
                poll: false // Отключаем polling (уменьшает setTimeout calls)
            },
            // ✅ ОТКЛЮЧАЕМ warnings о долгих setTimeout
            // Добавляем min/max FPS для отключения логирования
            render: {
                antialias: false,
                pixelArt: true, // ✅ Пиксельная графика
                roundPixels: true,
                // ✅ Добавляем limiting для оптимизации на ПК
                // Меньше пикселей для рендера = выше FPS
                maxTextures: 20
            },
            // ✅ ДОБАВИТЬ callbacks для отладки
            callbacks: {
                postBoot: (game) => {
                    logger.log('BOOT', 'Phaser game booted successfully');

                    // ✅ Применяем NEAREST фильтр для четкости текста (pixelArt: true уже установлен в config)
                    // Применяем NEAREST фильтр ко всем загруженным текстурам
                    if (game.textures) {
                        const textureManager = game.textures;
                        const textureKeys = textureManager.getTextureKeys();
                        textureKeys.forEach(key => {
                            const texture = textureManager.get(key);
                            if (texture && typeof texture.setFilter === 'function') {
                                texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                            }
                        });
                    }

                    // Отключаем сглаживание для canvas (для четкости пиксельной графики)
                    const canvas = game.canvas;
                    if (canvas) {
                        const context = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('2d');
                        if (context) {
                            // Для 2D context
                            if (typeof (context as any).imageSmoothingEnabled !== 'undefined') {
                                (context as any).imageSmoothingEnabled = false;
                            }
                        }
                    }

                    logger.log('BOOT', 'Texture filters set to NEAREST, canvas smoothing disabled');
                }
            }
        };

        gameInstance.current = new Phaser.Game(config);

        // ✅ Глобальный доступ для отладки в консоли браузера
        if (typeof window !== 'undefined') {
            (window as any).__PHASER_GAME__ = gameInstance.current;
            logger.log('BOOTSTRAP', 'Debug: game instance available as window.__PHASER_GAME__');

            // ✅ Глобальная функция для логирования текущего диапазона aspect ratio
            (window as any).logAspectRatioRange = (width?: number, height?: number) => {
                const w = width || window.visualViewport?.width || window.innerWidth;
                const h = height || window.visualViewport?.height || window.innerHeight;
                logAspectRatioRange(w, h, 'manual');
            };
            logger.log('BOOTSTRAP', 'Debug: window.logAspectRatioRange() available - logs aspect ratio range');
        }

        // ================================================
        // ПЕРЕДАЧА РЕАЛЬНОГО РАЗМЕРА VIEWPORT В СЦЕНУ
        // ================================================
        // Передаем реальный размер viewport в сцену через EventBus
        // Это необходимо для корректного расчета размеров модальных окон
        const sendViewportSize = () => {
            if (typeof window === 'undefined') return;

            // Используем visualViewport для мобильных устройств (учитывает адресную строку)
            const realWidth = window.visualViewport?.width || window.innerWidth;
            const realHeight = window.visualViewport?.height || window.innerHeight;

            EventBus.emit('viewport-update', { realWidth, realHeight });

            // 🎯 Логируем текущий диапазон aspect ratio при изменении размера экрана
            logAspectRatioRange(realWidth, realHeight, 'resize');
        };

        // Отправляем размер viewport сразу после создания игры
        sendViewportSize();

        // ================================================
        // ОБРАБОТЧИКИ RESIZE ДЛЯ КОРРЕКТНОГО МАСШТАБИРОВАНИЯ
        // ================================================
        // При изменении размера окна браузера обновляем виртуальный размер игры
        // только если изменилось соотношение сторон
        let resizeTimeout: NodeJS.Timeout;

        // Функция обновления размера игры (используется в handleResize и handleOrientationChange)
        const updateGameSize = () => {
            if (!gameInstance.current || !gameInstance.current.scale) {
                return;
            }

            const { width: newW, height: newH } = DeviceUtils.getGameSize();
            const game = gameInstance.current;
            const currentWidth = game.scale.gameSize.width;
            const currentHeight = game.scale.gameSize.height;
            const aspectChanged = Math.abs(newW / newH - currentWidth / currentHeight) > 0.01;

            if (aspectChanged) {
                logger.log('BOOTSTRAP', `Aspect ratio changed, updating game size: from ${currentWidth}x${currentHeight} to ${newW}x${newH}`);
                game.scale.setGameSize(newW, newH);
                game.scale.refresh();

                // ✅ Явно центрируем canvas после изменения размера
                // Это гарантирует, что canvas останется по центру после поворота экрана
                game.scale.updateCenter();
            } else {
                // Если соотношение не изменилось, просто обновляем масштаб
                game.scale.refresh();
                // ✅ Также центрируем при обычном refresh
                game.scale.updateCenter();
            }

            // Отправляем обновленный размер viewport в сцену
            sendViewportSize();
        };

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateGameSize();
            }, 100);
        };

        // Named handlers for visualViewport events to enable proper cleanup
        const handleVisualViewportResize = () => {
            handleResize(); // handleResize уже вызывает sendViewportSize()
        };

        // Throttle для scroll событий - не чаще 1 раза в 100мс
        let scrollThrottle: NodeJS.Timeout | null = null;
        const handleVisualViewportScroll = () => {
            if (!scrollThrottle) {
                scrollThrottle = setTimeout(() => {
                    sendViewportSize();
                    scrollThrottle = null;
                }, 100);
            }
        };

        // Основной обработчик изменения размера окна (client-side only)
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);

            // Слушаем visualViewport для отслеживания изменений размера видимой области
            // (включая появление/скрытие адресной строки браузера)
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleVisualViewportResize);
                window.visualViewport.addEventListener('scroll', handleVisualViewportScroll);
            }
        }

        // ================================================
        // ОБРАБОТЧИК ПОВОРОТА ЭКРАНА (ORIENTATION CHANGE)
        // ================================================
        // При повороте экрана на мобильных устройствах:
        // 1. Ждем завершения поворота (300ms) - браузеру нужно время для обновления размеров
        // 2. Пересчитываем виртуальное разрешение на основе новых размеров экрана
        // 3. Обновляем размер игры через game.scale.setGameSize()
        // 4. Вызываем game.scale.refresh() для перерисовки
        // 5. Модальные окна при следующем открытии автоматически используют новые размеры через getBoundingClientRect()
        let orientationTimeout: NodeJS.Timeout;

        const handleOrientationChange = () => {
            logger.log('BOOTSTRAP', 'Orientation change detected');

            // Очищаем предыдущий таймер, если он есть
            clearTimeout(orientationTimeout);

            // Ждем завершения поворота (300ms) перед обновлением размеров
            // Это необходимо, чтобы браузер успел обновить window.innerWidth/innerHeight
            orientationTimeout = setTimeout(() => {
                logger.log('BOOTSTRAP', 'Processing orientation change...');

                // Используем дебаунс 100ms (как в handleResize) для финального обновления
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    updateGameSize();

                    // ✅ Дополнительное центрирование после поворота экрана
                    // Вызываем через небольшую задержку, чтобы браузер успел обновить layout
                    setTimeout(() => {
                        if (gameInstance.current && gameInstance.current.scale) {
                            const canvas = gameInstance.current.canvas;
                            if (canvas) {
                                // Логируем позицию canvas до центрирования
                                const rectBefore = canvas.getBoundingClientRect();
                                const viewport = getViewportSize();
                                logger.log('BOOTSTRAP', `Canvas position before centering: left=${rectBefore.left}, top=${rectBefore.top}, size=${rectBefore.width}x${rectBefore.height}, viewport=${viewport.width}x${viewport.height}`);

                                // Центрируем canvas
                                gameInstance.current.scale.updateCenter();

                                // Логируем позицию canvas после центрирования
                                setTimeout(() => {
                                    const rectAfter = canvas.getBoundingClientRect();
                                    const viewportAfter = getViewportSize();
                                    const centerX = viewportAfter.width / 2;
                                    const centerY = viewportAfter.height / 2;
                                    const canvasCenterX = rectAfter.left + rectAfter.width / 2;
                                    const canvasCenterY = rectAfter.top + rectAfter.height / 2;

                                    logger.log('BOOTSTRAP', `Canvas position after centering: left=${rectAfter.left}, top=${rectAfter.top}, size=${rectAfter.width}x${rectAfter.height}, offset=${(canvasCenterX - centerX).toFixed(1)}x${(canvasCenterY - centerY).toFixed(1)}`);
                                }, 10);
                            }
                        }
                    }, 50);

                    logger.log('BOOTSTRAP', 'Orientation change processed, game size updated');
                }, 100);
            }, 300);
        };

        // Добавляем обработчик поворота экрана (client-side only)
        if (typeof window !== 'undefined') {
            window.addEventListener('orientationchange', handleOrientationChange);
        }

        // ✅ Предотвращаем контекстное меню на мобильных
        const preventContextMenu = (e: Event) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('contextmenu', preventContextMenu);
        // Для touch devices
        document.addEventListener('touchstart', preventContextMenu, { passive: false });

        // ✅ Добавьте предзагрузку для iOS
        const preventZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchstart', preventZoom, { passive: false });

        // ✅ Отключение "pull-to-refresh" на Android
        const originalOverscrollBehavior = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';

        // ================================================
        // ОБРАБОТЧИКИ ПОТЕРИ ФОКУСА (PAUSE/RESUME AUDIO)
        // ================================================
        // При переключении вкладки или приложения приостанавливаем аудио
        // При возврате - возобновляем

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logger.log('BOOTSTRAP', 'Page hidden - pausing audio');
                EventBus.emit('pause-audio');
            } else {
                logger.log('BOOTSTRAP', 'Page visible - resuming audio');
                EventBus.emit('resume-audio');
            }
        };

        const handleBlur = () => {
            logger.log('BOOTSTRAP', 'Window blurred - pausing audio');
            EventBus.emit('pause-audio');
        };

        const handleFocus = () => {
            logger.log('BOOTSTRAP', 'Window focused - resuming audio');
            EventBus.emit('resume-audio');
        };

        // Регистрируем обработчики (client-side only)
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleBlur);
            window.addEventListener('focus', handleFocus);
        }

        return () => {
            logger.log('BOOTSTRAP', 'PhaserGame: Unmounting and cleaning up...');

            // ✅ Очищаем все слушатели (client-side only)
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('orientationchange', handleOrientationChange);
                if (window.visualViewport) {
                    window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
                    window.visualViewport.removeEventListener('scroll', handleVisualViewportScroll);
                }
            }

            // ✅ Очищаем обработчики фокуса/видимости
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleBlur);
                window.removeEventListener('focus', handleFocus);
            }
            clearTimeout(resizeTimeout);
            clearTimeout(orientationTimeout);
            clearTimeout(scrollThrottle!);

            // ✅ Очищаем обработчики контекстного меню
            document.removeEventListener('contextmenu', preventContextMenu);
            document.removeEventListener('touchstart', preventContextMenu);
            document.removeEventListener('touchstart', preventZoom);

            // ✅ Восстанавливаем overscrollBehavior
            document.body.style.overscrollBehavior = originalOverscrollBehavior;

            // ✅ Полное уничтожение игры
            if (gameInstance.current) {
                gameInstance.current.destroy(true);
                gameInstance.current = null;
            }
        };
    }, []);

    // Регистрация функции показа уведомления об обновлении (для Service Worker)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        (window as any).showUpdateNotification = () => {
            logger.log('PWA', 'Showing update notification');
            setShowUpdate(true);
        };

        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).showUpdateNotification;
            }
        };
    }, []);

    const handleUpdate = () => {
        logger.log('PWA', 'User clicked update - reloading...');
        // Сообщаем Service Worker'у, что можно активироваться
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            });
        }
        // Перезагружаем страницу
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <>
            <div id="game-container" />

            {/* Уведомление об обновлении игры */}
            {showUpdate && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(26, 32, 44, 0.95)',
                        border: '2px solid #4ade80',
                        borderRadius: '16px',
                        padding: '24px',
                        zIndex: 10000,
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        fontFamily: 'Nunito, sans-serif'
                    }}
                >
                    <div style={{ textAlign: 'center' }}>
                        <h3
                            style={{
                                color: '#4ade80',
                                margin: '0 0 12px 0',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}
                        >
                            🎮 Доступно обновление!
                        </h3>
                        <p
                            style={{
                                color: '#e5e7eb',
                                margin: '0 0 20px 0',
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}
                        >
                            Игра была обновлена. Нажмите кнопку ниже для применения изменений.
                        </p>
                        <button
                            onClick={handleUpdate}
                            style={{
                                backgroundColor: '#4ade80',
                                color: '#1a202c',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 32px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Nunito, sans-serif'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#22c55e';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#4ade80';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            Обновить
                        </button>
                    </div>
                </div>
            )}
        </>
    );
});

export default PhaserGame;

