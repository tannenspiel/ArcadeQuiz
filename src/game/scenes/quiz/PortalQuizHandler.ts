import Phaser from 'phaser';
import { AbstractPortal } from '../../entities/portals/AbstractPortal';
import { logger } from '../../../utils/Logger';

/**
 * Callbacks for operations that require MainScene
 */
export interface PortalQuizCallbacks {
    resumeGame: () => void;
    handlePortalEntry: (portal: AbstractPortal) => void;
    enablePortalOverlap: () => void;
}

/**
 * Dependencies for PortalQuizHandler
 */
export interface PortalQuizDependencies {
    scene: Phaser.Scene;
    portalModalCooldownMs: number;
    onSetPortalCooldown: (cooldown: number) => void;
    onClearPendingPortal: () => void;
}

/**
 * Handles portal entry logic (confirm/cancel)
 */
export class PortalQuizHandler {
    constructor(
        private deps: PortalQuizDependencies,
        private callbacks: PortalQuizCallbacks
    ) { }

    /**
     * Handles confirmed portal entry
     */
    public handleEnterConfirmed(portal: AbstractPortal | null, pendingPortal: AbstractPortal | null): void {
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: handleEnterConfirmed called');

        // Save portal reference before clearing
        const portalUsed = portal || pendingPortal;

        if (!portalUsed) {
            console.error('❌ PortalQuizHandler: portalUsed is null!');
            return;
        }

        logger.log('QUIZ_PORTAL', '🔵 PortalQuizHandler: Portal info:', {
            portalId: portalUsed.getConfig().id,
            isCorrect: portalUsed.getConfig().isCorrect,
            answerText: portalUsed.getConfig().answerText,
            state: portalUsed.getState()
        });

        // Clear pending portal
        this.deps.onClearPendingPortal();

        // Set mustExit on portal to prevent reuse
        portalUsed.setMustExit();
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: Set mustExit=true on portal');

        // Handle portal entry
        logger.log('QUIZ_PORTAL', '🔵 PortalQuizHandler: Calling handlePortalEntry');
        this.callbacks.handlePortalEntry(portalUsed);
        logger.log('QUIZ_PORTAL', '🔵 PortalQuizHandler: handlePortalEntry completed');

        // Re-enable overlap collider via callback
        this.callbacks.enablePortalOverlap();
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: Portal overlap re-enabled');
    }

    /**
     * Handles cancelled portal entry
     */
    public handleEnterCancelled(): void {
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: Portal enter cancelled');

        // Clear pending portal
        this.deps.onClearPendingPortal();

        // Set cooldown to prevent immediate reopen
        const cooldown = this.deps.scene.time.now + this.deps.portalModalCooldownMs;
        this.deps.onSetPortalCooldown(cooldown);
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: Portal cooldown set to:', cooldown);

        // Resume game
        this.callbacks.resumeGame();

        // Re-enable overlap collider via callback
        this.callbacks.enablePortalOverlap();
        logger.log('QUIZ_PORTAL', '✅ PortalQuizHandler: Game resumed and overlap re-enabled');
    }
}
