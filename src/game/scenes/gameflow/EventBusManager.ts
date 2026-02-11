/**
 * EventBusManager - Управление EventBus и слушателями событий
 *
 * Отвечает за:
 * - Настройку EventBus подписчиков
 * - Управление слушателями окна (resize, orientation)
 * - Cleanup при shutdown/destroy
 */

import Phaser from 'phaser';
import { EventBus } from '../../EventBus';
import { EVENTS } from '../../../constants/gameConstants';
import type { AbstractPortal } from '../../entities/portals/AbstractPortal';
import { logger } from '../../../utils/Logger';

// ✅ Static set to track all active EventBusManager instances for proper cleanup
const activeEventBusManagers = new WeakMap<Phaser.Scene, EventBusManager>();

/**
 * Dependencies for EventBusManager
 */
export interface EventBusManagerDependencies {
    scene: Phaser.Scene;
    events: Phaser.Events.EventEmitter;
    scale: Phaser.Scale.ScaleManager;
}

/**
 * Callbacks for operations that require MainScene
 */
export interface EventBusManagerCallbacks {
    // Portal handlers
    onPortalEnterConfirmed: (data: { portal: AbstractPortal }) => void;
    onPortalEnterCancelled: () => void;

    // Quiz handlers
    onKeyQuizCompleted: (data: { result: 'correct' | 'wrong' | 'closed', damage?: number }) => void;
    onCoinQuizCompleted: (data: { result: 'correct' | 'wrong' }) => void; // ⚠️ НОВОЕ
    onQuizCompleted: (data: { correct: boolean, context: string }) => void;
    onGamePhaseChanged: (data: { newPhase: string }) => void; // ⚠️ НОВОЕ

    // Game flow handlers
    onRestartGame: () => void;
    onNextLevel: () => void;

    // Viewport handler
    onViewportUpdate: ({ realWidth, realHeight }: { realWidth: number; realHeight: number }) => void;

    // Event listener handlers
    handleWindowResize: () => void;
    handleOrientationChange: () => void;
    handlePhaserResize: (gameSize: Phaser.Structs.Size) => void;

    // Oracle handlers
    onOracleActivated: () => void; // ⚠️ НОВОЕ

    // Additional callbacks
    resumeGame: () => void;
    updateDebugOverlay?: () => void;
}

/**
 * Manages EventBus subscriptions and window event listeners
 */
export class EventBusManager {
    // Helper methods для event listeners (хранятся для cleanup)
    private boundHandleWindowResize?: () => void;
    private boundHandleOrientationChange?: () => void;
    private boundHandlePhaserResize?: (gameSize: Phaser.Structs.Size) => void;

    // Window size tracking
    private lastWindowWidth: number = window.innerWidth;
    private lastWindowHeight: number = window.innerHeight;

    // Resize timeout
    private resizeTimeout?: NodeJS.Timeout;

    constructor(
        private deps: EventBusManagerDependencies,
        private callbacks: EventBusManagerCallbacks
    ) { }

    /**
     * Setup all window event listeners
     */
    public setupEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Store bound functions for proper cleanup
        this.boundHandleWindowResize = this.callbacks.handleWindowResize.bind(this.callbacks);
        this.boundHandleOrientationChange = this.callbacks.handleOrientationChange.bind(this.callbacks);
        this.boundHandlePhaserResize = this.callbacks.handlePhaserResize.bind(this.callbacks);

        // Listen for window resize
        window.addEventListener('resize', this.boundHandleWindowResize);

        // Listen for screen orientation change
        window.addEventListener('orientationchange', this.boundHandleOrientationChange);

        // Listen for Phaser scale resize
        this.deps.scale.on('resize', this.boundHandlePhaserResize);

        logger.log('EVENT_BUS', 'EventBusManager: Event listeners setup complete');
    }

    private isSetup = false;

    /**
     * Setup all EventBus subscriptions
     */
    public setupEventBus(): void {
        // ✅ GUARD: Prevent duplicate subscriptions within the same instance
        if (this.isSetup) {
            console.warn('⚠️ EventBusManager: Already setup, skipping duplicate subscriptions');
            return;
        }
        this.isSetup = true;

        // ✅ CRITICAL FIX: Clean up any existing EventBusManager for this scene
        // This prevents duplicate subscriptions when scene is restarted
        const existingManager = activeEventBusManagers.get(this.deps.scene);
        if (existingManager && existingManager !== this) {
            console.warn('🧹 EventBusManager: Cleaning up previous instance for this scene');
            existingManager.forceCleanup();
        }

        // Register this instance
        activeEventBusManagers.set(this.deps.scene, this);

        // Portal events
        EventBus.on(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
        EventBus.on(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);

        // Quiz events
        EventBus.on(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
        EventBus.on(EVENTS.COIN_QUIZ_COMPLETED, this.onCoinQuizCompletedHandler); // ⚠️ НОВОЕ

        // Game flow events
        EventBus.on(EVENTS.GAME_PHASE_CHANGED, this.onGamePhaseChangedHandler); // ⚠️ НОВОЕ
        EventBus.on(EVENTS.ORACLE_ACTIVATED, this.onOracleActivatedHandler); // ⚠️ НОВОЕ
        EventBus.on(EVENTS.RESTART_GAME, this.onRestartGameHandler);
        EventBus.on(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

        // Legacy events
        EventBus.on('quiz-completed', this.onQuizHandler);
        EventBus.on('restart-game', this.onRestartGameHandler); // Same handler
        EventBus.on('viewport-update', this.onViewportHandler);

        // Setup cleanup on scene shutdown
        this.deps.events.once('shutdown', () => {
            this.cleanup();
        });

        // Setup cleanup on scene destroy
        this.deps.events.once('destroy', () => {
            this.cleanup();
        });

        logger.log('EVENT_BUS', 'EventBusManager: EventBus subscriptions setup complete');
    }

    /**
     * Handler: Portal enter confirmed
     */
    private onPortalEnterConfirmedHandler = (data: { portal: AbstractPortal }) => {
        logger.log('EVENT_BUS', `EventBusManager: PORTAL_ENTER_CONFIRMED event received ${data.portal.getConfig().id}`);
        this.callbacks.onPortalEnterConfirmed(data);
    };

    /**
     * Handler: Portal enter cancelled
     */
    private onPortalEnterCancelledHandler = () => {
        logger.log('EVENT_BUS', 'EventBusManager: PORTAL_ENTER_CANCELLED event received');
        this.callbacks.onPortalEnterCancelled();
    };

    /**
     * Handler: Key quiz completed
     */
    private onKeyQuizCompletedHandler = (data: { result: 'correct' | 'wrong' | 'closed', damage?: number }) => {
        logger.log('EVENT_BUS', `EventBusManager: KEY_QUIZ_COMPLETED event received`, data);
        this.callbacks.onKeyQuizCompleted(data);
    };

    /**
     * ⚠️ НОВОЕ: Handler: Coin quiz completed
     */
    private onCoinQuizCompletedHandler = (data: { result: 'correct' | 'wrong' }) => {
        logger.log('EVENT_BUS', `EventBusManager: COIN_QUIZ_COMPLETED event received`, data);
        this.callbacks.onCoinQuizCompleted(data);
    };

    /**
     * ⚠️ НОВОЕ: Handler: Game phase changed
     */
    private onGamePhaseChangedHandler = (data: { newPhase: string }) => {
        logger.log('EVENT_BUS', `EventBusManager: GAME_PHASE_CHANGED event received`, data);
        logger.log('EVENT_BUS', `EventBusManager: onGamePhaseChanged exists: ${!!this.callbacks.onGamePhaseChanged}`);
        try {
            this.callbacks.onGamePhaseChanged(data);
            logger.log('EVENT_BUS', `EventBusManager: onGamePhaseChanged callback executed successfully`);
        } catch (error) {
            logger.error('EVENT_BUS', `EventBusManager: onGamePhaseChanged callback error:`, error);
        }
    };

    /**
     * ⚠️ НОВОЕ: Handler: Oracle activated
     */
    private onOracleActivatedHandler = () => {
        logger.log('EVENT_BUS', `EventBusManager: ORACLE_ACTIVATED event received`);
        this.callbacks.onOracleActivated();
    };

    /**
     * Handler: Restart game requested
     */
    private onRestartGameHandler = () => {
        logger.log('EVENT_BUS', 'EventBusManager: RESTART_GAME event received (Global Handler)');
        this.callbacks.onRestartGame();
    };

    /**
     * Handler: Next level requested
     */
    private onNextLevelHandler = () => {
        logger.log('EVENT_BUS', 'EventBusManager: NEXT_LEVEL event received');
        this.callbacks.onNextLevel();
    };

    /**
     * Handler: Legacy quiz completed
     */
    private onQuizHandler = (data: { correct: boolean, context: string }) => {
        logger.log('EVENT_BUS', 'EventBusManager: Legacy quiz-completed event received', data);
        this.callbacks.onQuizCompleted(data);
    };

    /**
     * Handler: Viewport update
     */
    private onViewportHandler = ({ realWidth, realHeight }: { realWidth: number; realHeight: number }) => {
        logger.log('VIEWPORT_RESIZE', `Viewport size updated: ${realWidth} x ${realHeight}`);
        this.callbacks.onViewportUpdate({ realWidth, realHeight });
    };

    /**
     * Cleanup all event subscriptions and listeners
     */
    private cleanup(): void {
        logger.log('EVENT_BUS', 'EventBusManager: Cleaning up all listeners');

        // Remove from active instances map
        activeEventBusManagers.delete(this.deps.scene);

        // Cleanup EventBus subscriptions
        EventBus.off(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
        EventBus.off(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);
        EventBus.off(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
        EventBus.off(EVENTS.COIN_QUIZ_COMPLETED, this.onCoinQuizCompletedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.GAME_PHASE_CHANGED, this.onGamePhaseChangedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.ORACLE_ACTIVATED, this.onOracleActivatedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.RESTART_GAME, this.onRestartGameHandler);
        EventBus.off(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

        EventBus.off('quiz-completed', this.onQuizHandler);
        EventBus.off('restart-game', this.onRestartGameHandler);
        EventBus.off('viewport-update', this.onViewportHandler);

        // ✅ Reset setup flag to allow re-setup if needed
        this.isSetup = false;

        // Cleanup Phaser scale listener
        if (this.boundHandlePhaserResize) {
            this.deps.scale.off('resize', this.boundHandlePhaserResize);
        }

        // Cleanup resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = undefined;
        }

        // Note: window.removeEventListener needs the same function reference that was used in addEventListener
        // The bound functions are stored for this purpose
        if (typeof window !== 'undefined') {
            if (this.boundHandleWindowResize) {
                window.removeEventListener('resize', this.boundHandleWindowResize);
            }
            if (this.boundHandleOrientationChange) {
                window.removeEventListener('orientationchange', this.boundHandleOrientationChange);
            }
        }

        logger.log('EVENT_BUS', 'EventBusManager: Cleanup complete');
    }

    /**
     * Force cleanup without checking setup state
     * Called when a new EventBusManager is created for the same scene
     */
    public forceCleanup(): void {
        logger.log('EVENT_BUS', 'EventBusManager: Force cleanup called');

        // Remove from active instances map
        activeEventBusManagers.delete(this.deps.scene);

        // Cleanup EventBus subscriptions
        EventBus.off(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
        EventBus.off(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);
        EventBus.off(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
        EventBus.off(EVENTS.COIN_QUIZ_COMPLETED, this.onCoinQuizCompletedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.GAME_PHASE_CHANGED, this.onGamePhaseChangedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.ORACLE_ACTIVATED, this.onOracleActivatedHandler); // ⚠️ НОВОЕ
        EventBus.off(EVENTS.RESTART_GAME, this.onRestartGameHandler);
        EventBus.off(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

        EventBus.off('quiz-completed', this.onQuizHandler);
        EventBus.off('restart-game', this.onRestartGameHandler);
        EventBus.off('viewport-update', this.onViewportHandler);

        // Reset setup flag
        this.isSetup = false;

        // Cleanup Phaser scale listener
        if (this.boundHandlePhaserResize) {
            this.deps.scale.off('resize', this.boundHandlePhaserResize);
        }

        // Cleanup resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = undefined;
        }

        // Cleanup window listeners
        if (typeof window !== 'undefined') {
            if (this.boundHandleWindowResize) {
                window.removeEventListener('resize', this.boundHandleWindowResize);
            }
            if (this.boundHandleOrientationChange) {
                window.removeEventListener('orientationchange', this.boundHandleOrientationChange);
            }
        }

        logger.log('EVENT_BUS', 'EventBusManager: Force cleanup complete');
    }

    /**
     * Get current window size (for debounce logic)
     */
    public getWindowSize(): { width: number; height: number } {
        return {
            width: this.lastWindowWidth,
            height: this.lastWindowHeight
        };
    }

    /**
     * Update stored window size (call after resize)
     */
    public updateWindowSize(width: number, height: number): void {
        this.lastWindowWidth = width;
        this.lastWindowHeight = height;
    }

    /**
     * Set resize timeout (returns previous timeout for cleanup)
     */
    public setResizeTimeout(timeout: NodeJS.Timeout): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = timeout;
    }

    /**
     * Clear resize timeout
     */
    public clearResizeTimeout(): void {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = undefined;
        }
    }
}
