/**
 * Animation sync modules for MainScene
 * Выносят ~500 строк ручной синхронизации анимаций из MainScene.update()
 */

export { AnimationSyncManager, type AnimationSyncer } from './AnimationSyncManager';
export { KeyAnimationSync } from './KeyAnimationSync';
export { CoinAnimationSync } from './CoinAnimationSync';
export { PortalAnimationSync } from './PortalAnimationSync';
export { OracleAnimationSync } from './OracleAnimationSync';
export { PlayerAnimationSync } from './PlayerAnimationSync';
export { EnemyAnimationSync } from './EnemyAnimationSync';
