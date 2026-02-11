/**
 * Основная игровая сцена
 * Использует модульную архитектуру
 */

import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { EventBus } from '../EventBus';
import { AssetLoader } from '../core/AssetLoader';
import { LevelManager } from '../core/LevelManager';
import {
    KEYS, MAP_WIDTH, MAP_HEIGHT, MAP_CENTER_X, MAP_CENTER_Y, MAX_HEALTH, ACTOR_SIZES, BASE_SCALE,
    BASE_GAME_HEIGHT, PLAYER_HEIGHT_PERCENT, PLAYER_FRAME_HEIGHT, TILEMAP_CONSTANTS, COLLISION_CONFIG,
    MAX_LEVELS, LOADING_PROGRESS_EVENT, FINISH_LOADING_EVENT
} from '../../constants/gameConstants';
import { DeviceUtils } from '../../utils/DeviceUtils';
import { ASSETS_BASE_PATH, CURRENT_THEME, AB_TESTING, USE_QUESTION_BUBBLE, DEBUG_UI_ENABLED } from '../../config/gameConfig';
import {
    DEFAULT_FONT_FAMILY,
    DEBUG_FONT_FAMILY,
    ORACLE_LABEL_FONT_SIZE,
    GLOBAL_QUESTION_FONT_SIZE,
    FLOATING_TEXT_FONT_SIZE,
    DEBUG_TEXT_FONT_SIZE,
    ORACLE_LABEL_FONT_STYLE,
    GLOBAL_QUESTION_FONT_STYLE,
    FLOATING_TEXT_FONT_STYLE,
    DEBUG_TEXT_FONT_STYLE,
    ORACLE_LABEL_COLOR,
    ORACLE_LABEL_ACTIVE_COLOR,
    GLOBAL_QUESTION_COLOR,
    GLOBAL_QUESTION_BACKGROUND_COLOR,
    SCORE_HUD_FONT_SIZE,
    SCORE_HUD_FONT_STYLE,
    SCORE_HUD_COLOR,
    SCORE_HUD_STROKE,
    SCORE_HUD_STROKE_THICKNESS,
    FLOATING_TEXT_COLOR,
    DEBUG_TEXT_COLOR,
    DEBUG_TEXT_BACKGROUND_COLOR
} from '../../constants/textStyles';
import { PORTALS_DATA } from '../../constants/gameConstants';
import { PortalConfig, PortalType, PortalState } from '../../types/portalTypes';

// Импорты новых модулей
import { Player, PlayerState } from '../entities/Player';
import { EnemyRandomWalker } from '../entities/enemies/EnemyRandomWalker';
import { EnemyChaser } from '../entities/enemies/EnemyChaser';
import { EnemyFlam } from '../entities/enemies/EnemyFlam';
import { AbstractEnemy } from '../entities/enemies/AbstractEnemy';
import { EnemyType, EnemyState } from '../../types/enemyTypes';
import { StandardPortal } from '../entities/portals/StandardPortal';
import { AbstractPortal } from '../entities/portals/AbstractPortal';
import { Oracle } from '../entities/Oracle';
import { HealthSystem } from '../systems/HealthSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { QuizManager } from '../systems/QuizManager';
import { AudioManager } from '../systems/AudioManager';
import { SpawnSystem } from '../systems/SpawnSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { AnimationManager } from '../systems/AnimationManager';
import { GrassBackgroundSprite } from '../entities/background/GrassBackgroundSprite';
import { BushCollisionObject } from '../entities/collision/BushCollisionObject';
import { StoneCollisionObject } from '../entities/collision/StoneCollisionObject';
import { SPRITESHEET_CONFIGS } from '../../config/spritesheetConfigs';
// DEBUG_CONFIG больше не используется - настройки отладки берутся из конфига уровня
import { EVENTS, GamePhase, DEPTHS } from '../../constants/gameConstants';
import { UIManager } from '../ui/UIManager';
// ✅ GameFlow Handlers - Step 8
import { EventBusManager, GameOverHandler, LevelTransitionHandler } from './gameflow';
import type { EventBusManagerDependencies, EventBusManagerCallbacks } from './gameflow';
import type { GameOverDependencies, GameOverCleanupObjects, GameOverCallbacks } from './gameflow';
import type { LevelTransitionDependencies, LevelTransitionCallbacks } from './gameflow';
// Modals imports removed as they are now handled by UIManager
import { WorldGenerator } from '../systems/WorldGenerator';
import { GameOverType } from '../ui/GameOverModal'; // Keep enum for type checking if needed
import { DebugOverlay } from '../ui/DebugOverlay';
import { QuestionData, QuestionType, ParsedQuestion } from '../../types/questionTypes';
import { logger } from '../../utils/Logger';
import { getAspectRangeInfo } from '../ui/ModalSizeCalculator';
// ✅ calculateBubbleY больше не импортируется - используется внутри класса Oracle

// ✅ Animation sync modules - выносят ~500 строк из update()
import {
    AnimationSyncManager,
    KeyAnimationSync,
    CoinAnimationSync,
    PortalAnimationSync,
    OracleAnimationSync,
    PlayerAnimationSync,
    EnemyAnimationSync
} from './animation';

// ✅ Collision handlers - выносят обработку коллизий из MainScene
import {
    EnemyCollisionHandler,
    ItemCollisionHandler,
    OracleCollisionHandler,
    PortalCollisionHandler
} from './collision';

// ✅ World Factories - Step 4: вынос создания мира и сущностей
import {
    WorldFactory,
    EntityFactory,
    CollisionObjectFactory
} from './world';

// ✅ Enemy Management - Step 5
import { EnemyManager, EnemySpawner } from './enemy';

// ✅ Quiz Handlers - Step 6
import {
    KeyQuizHandler,
    CoinQuizHandler,
    PortalQuizHandler,
    GlobalQuestionManager,
    KeyQuizCallbacks,
    KeyQuizDependencies,
    CoinQuizCallbacks,
    CoinQuizDependencies,
    PortalQuizCallbacks,
    PortalQuizDependencies,
    GlobalQuestionCallbacks,
    GlobalQuestionDependencies
} from './quiz';

// ✅ UI Managers - Step 7
import {
    HUDManager,
    CameraManager,
    EffectsManager
} from './ui';

// ✅ Интерфейс для конфигурации порталов из Tiled Map
interface TiledPortalConfig {
    id: number;
    x: number;
    y: number;
    overrideCollision: boolean;
    bubblePosition?: { x: number, y: number }; // ✅ Позиция баббла из Tiled
}

// Type definition for frame objects with optional index
interface FrameObject {
    frame?: { index?: number; name?: string };
    index?: number;
    name?: string;
    texture: Phaser.Textures.Texture;
}

// Type guard to check if frame object has index
function hasFrameIndex(obj: FrameObject): obj is FrameObject & { index: number } {
    return obj.index !== undefined || obj.frame?.index !== undefined;
}

// Type guard to check if frame object has name
function hasFrameName(obj: FrameObject): obj is FrameObject & { name: string } {
    return obj.name !== undefined || obj.frame?.name !== undefined;
}

export default class MainScene extends BaseScene {
    // ✅ КРИТИЧЕСКИ ВАЖНО: Предотвращает раннее обновление
    private isReady: boolean = false;

    // Реальный размер viewport (для ограничения модальных окон)
    public realViewportWidth: number = 1280;
    public realViewportHeight: number = 720;

    // Override BaseScene protected properties to public for WorldGenerator
    public assetLoader!: AssetLoader;

    // Entities
    public player!: Player;
    public enemyInstances: AbstractEnemy[] = [];
    public portalInstances: AbstractPortal[] = [];

    // Groups (для Phaser коллизий)
    public enemies!: Phaser.Physics.Arcade.Group;
    public chasers!: Phaser.Physics.Arcade.Group;
    public hearts!: Phaser.Physics.Arcade.Group;
    public keys!: Phaser.Physics.Arcade.Group;
    public coins!: Phaser.Physics.Arcade.Group; // ⚠️ НОВОЕ: Coin group
    public portals!: Phaser.Physics.Arcade.Group;


    // Background Sprites
    private grassBackground!: GrassBackgroundSprite;

    // Расширенный фон для заполнения экрана


    // Collision Objects
    public bushCollisionObjects?: BushCollisionObject;
    public stoneCollisionObjects?: StoneCollisionObject;
    public tiledMapCollisionBodies?: Phaser.Physics.Arcade.StaticGroup; // ✅ Коллизии из Tiled Map

    // Single Objects
    public oracle!: Oracle;

    private globalQuestionText!: Phaser.GameObjects.Text | null;
    private globalQuestionImage!: Phaser.GameObjects.Image | null;
    public currentGlobalQuestionData: ParsedQuestion | null = null; // ✅ Сохраняем выбранный глобальный вопрос (портал)
    private currentMiniQuizData: ParsedQuestion | null = null;    // ✅ Сохраняем текущий мини-вопрос (ключ)
    // ✅ Баббл вопроса теперь хранится в классе Oracle

    // ✅ Конфигурация порталов, загруженная из Tiled Map
    public tiledPortalsConfig: TiledPortalConfig[] = [];
    // ✅ Конфигурация Оракула, загруженная из Tiled Map
    public tiledOracleConfig?: { x: number, y: number, bubblePosition?: { x: number, y: number } };

    // ✅ Группа коллизий для оверлап зон (Tiled Map)
    public tiledOverlapBodies?: Phaser.Physics.Arcade.StaticGroup;

    // ✅ Данные маски оверлапа для проверки в реальном времени (CollisionSystem)
    public currentOverlapData: number[] | null = null;
    public tiledMapInfo?: { width: number; height: number; tileWidth: number; tileHeight: number };

    // HUD Elements now managed by HUDManager (Step 7)

    // Debug UI
    public debugOverlay!: DebugOverlay;

    // Systems
    public healthSystem!: HealthSystem;
    public scoreSystem!: ScoreSystem;
    public quizManager!: QuizManager;
    public levelManager!: LevelManager; // Инициализируется в BaseScene, но используем public для генератора
    public audioManager!: AudioManager;
    public spawnSystem!: SpawnSystem;
    public collisionSystem!: CollisionSystem;
    public worldGenerator!: WorldGenerator;
    public uiManager!: UIManager;

    // ✅ Animation sync - централизованная синхронизация всех анимаций physics спрайтов
    public animationSyncManager!: AnimationSyncManager;

    // ✅ Collision handlers - выносят обработку коллизий из MainScene
    private enemyCollisionHandler!: EnemyCollisionHandler;
    private itemCollisionHandler!: ItemCollisionHandler;
    private oracleCollisionHandler!: OracleCollisionHandler;
    private portalCollisionHandler!: PortalCollisionHandler;

    // ✅ World Factories - Step 4: вынос создания мира и сущностей
    private worldFactory!: WorldFactory;
    private entityFactory!: EntityFactory;
    private collisionObjectFactory!: CollisionObjectFactory;

    // ✅ Enemy Management - Step 5
    public enemyManager!: EnemyManager;
    private enemySpawner!: EnemySpawner;

    // ✅ Quiz Handlers - Step 6
    public keyQuizHandler!: KeyQuizHandler;
    public coinQuizHandler!: CoinQuizHandler; // ⚠️ НОВОЕ
    public portalQuizHandler!: PortalQuizHandler;
    public globalQuestionManager!: GlobalQuestionManager;

    // ✅ UI Managers - Step 7
    public hudManager!: HUDManager;
    public cameraManager!: CameraManager;
    public effectsManager!: EffectsManager;

    // ✅ GameFlow Handlers - Step 8
    public eventBusManager!: EventBusManager;
    public gameOverHandler!: GameOverHandler;
    public levelTransitionHandler!: LevelTransitionHandler;

    // UI
    // Modals are now handled by UIManager
    private currentKeySprite: Phaser.Physics.Arcade.Sprite | null = null;
    private currentKeyId: string | null = null; // Track processing keyId for cleanup
    private currentCoinId: string | null = null; // Track processing coinId for cleanup
    private remainingModalPropertiesRemoved: boolean = true; // Placeholder to ensure replacement works

    // ✅ TEST: Text blur testing objects (safe to remove)
    private testTextObjects: Phaser.GameObjects.Text[] = [];

    // Game State (используем gameState из BaseScene)
    // ✅ MAX_KEYS теперь конфигурируется через levelConfig и хранится в gameState
    // private readonly MAX_KEYS: number = 3;

    // ✅ Flash effects now managed by EffectsManager (Step 7)
    // ✅ Отслеживание отвеченных уникальных вопросов на уровне
    private answeredQuestions: Set<string> = new Set();
    // ✅ НОВОЕ: Отслеживание отвеченных уникальных утверждений монеток
    private answeredCoinStatements: Set<string> = new Set();

    // Oracle State
    public isOracleActivated: boolean = false;

    // Interaction Cooldowns
    public lastDepositTime: number = 0;
    public lastFullWarningTime: number = 0;
    private lastEnemyCollisionTime: number = 0; // ✅ Cooldown для столкновений с врагами
    private readonly ENEMY_COLLISION_COOLDOWN: number = 500; // 500ms между столкновениями

    // Track which portal is currently being interacted with for entry
    public pendingPortal: AbstractPortal | null = null;


    // ✅ Защита от немедленного повторного открытия модального окна после CANCEL
    public portalModalCooldown: number = 0;
    private readonly PORTAL_MODAL_COOLDOWN_MS: number = 500; // 500ms задержка после закрытия модального окна

    // ✅ Floating text now managed by EffectsManager (Step 7)

    constructor() {
        super('MainScene');
    }

    async create() {
        logger.log('SCENE_CREATE', 'MainScene: create() called - starting scene initialization');

        try {
            // Инициализация базовых систем (из BaseScene)
            logger.log('SCENE_INIT', 'MainScene: Calling initBaseSystems()');
            this.initBaseSystems();
            logger.log('SCENE_INIT', 'MainScene: initBaseSystems() completed');

            logger.log('SCENE_PHYSICS', 'MainScene: Calling setupPhysics()');
            this.setupPhysics();
            logger.log('SCENE_PHYSICS', 'MainScene: setupPhysics() completed');

            logger.log('SCENE_CAMERA', 'MainScene: Calling setupCamera()');
            this.setupCamera();
            logger.log('SCENE_CAMERA', 'MainScene: setupCamera() completed');
        } catch (error) {
            console.error('❌ MainScene: Error in create() initialization:', error);
            throw error;
        }

        logger.log('SCENE_CREATE', 'MainScene: Try-catch block completed, continuing...');

        // ✅ ВАЖНО: Включаем input в начале create() для правильной работы после рестарта
        logger.log('SCENE_CREATE', 'MainScene: Enabling input');
        this.input.enabled = true;
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
            this.input.keyboard.resetKeys();
        }

        // ✅ PERSISTENCE: Восстанавливаем текущий уровень из Registry ДО инициализации систем
        // Это гарантирует, что QuizManager и другие системы загрузят данные для правильного уровня
        const savedLevel = this.registry.get('currentLevel') || 1;
        logger.log('SCENE_CREATE', `MainScene: Restoring level from registry: ${savedLevel}`);
        this.levelManager.setCurrentLevel(savedLevel);

        // ✅ Создаём группы ДО инициализации фабрик (Step 4)
        // Фабрикам нужны эти группы при инициализации
        logger.log('SCENE_PHYSICS', 'MainScene: Checking physics.add availability before creating groups...', {
            hasPhysics: !!this.physics,
            hasPhysicsAdd: !!this.physics?.add
        });

        if (!this.physics?.add) {
            throw new Error('MainScene: physics.add is not available. Cannot create game groups.');
        }

        this.enemies = this.physics.add.group();
        this.chasers = this.physics.add.group();
        this.hearts = this.physics.add.group();
        this.keys = this.physics.add.group();
        this.coins = this.physics.add.group(); // ⚠️ НОВОЕ: Coin group
        this.portals = this.physics.add.group();

        // Инициализация игровых систем
        logger.log('SCENE_INIT', 'MainScene: About to emit 50% progress');
        // ✅ Progress reporting: 50-60%
        try {
            EventBus.emit(LOADING_PROGRESS_EVENT, {
                percent: 50,
                text: 'Инициализация систем...'
            });
        } catch (error) {
            console.error('MainScene: EventBus.emit() threw error:', error);
        }
        logger.log('SCENE_INIT', 'MainScene: Progress emitted, calling initializeSystems()');

        try {
            await this.initializeSystems();
            logger.log('SCENE_INIT', 'MainScene: initializeSystems() completed successfully');
        } catch (error) {
            logger.error('SCENE_INIT', `MainScene: initializeSystems() failed: ${error}`);
            console.error('MainScene initializeSystems error:', error);
            throw error;
        }

        // ✅ PERSISTENCE: Восстанавливаем очки из Registry
        // Если это первый уровень (или сброс), очки могут быть 0
        const savedScore = this.registry.get('score') || 0;
        logger.log('SCENE_CREATE', `MainScene: Restoring score from registry: ${savedScore}`);
        if (this.scoreSystem) {
            this.scoreSystem.setScore(savedScore);
        }

        logger.log('SCENE_CREATE', 'MainScene: initializeSystems() completed');

        // Сохраняем начальные размеры окна
        this.lastWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        this.lastWindowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

        // Создаем основной игровой мир
        logger.log('SCENE_CREATE', 'MainScene: Calling createGameWorld()');
        await this.createGameWorld();
        logger.log('SCENE_CREATE', 'MainScene: createGameWorld() completed');

        // ✅ Progress reporting: 60% - ПОСЛЕ создания мира
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 60,
            text: 'Создание мира...'
        });

        // ✅ Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 100));

        // Добавляем слушатели событий
        this.setupEventListeners();

        // ✅ ОБРАБОТЧИК ВОЗОБНОВЛЕНИЯ СЦЕНЫ (таб switching)
        // Когда пользователь возвращается на вкладку, Phaser автоматически возобновляет звуки
        // Но мы должны проверить состояние muted и снова поставить музыку на паузу если нужно
        this.events.on('resume', () => {
            if (this.audioManager && this.audioManager.isMuted()) {
                // Пользователь выключил звук кнопкой - ставим музыку обратно на паузу
                this.audioManager.pauseAll();
                console.log('🔇 MainScene: Scene resumed - keeping audio muted (user preference)');
                logger.log('BOOTSTRAP', 'MainScene: Scene resumed - keeping audio muted (user preference)');
            }
        });

        // ================================================
        // РАЗБЛОКИРОВКА АУДИО ДЛЯ iOS/ANDROID
        // ================================================
        // iOS требует явного действия пользователя для запуска AudioContext
        // Добавляем обработчик первого касания на сцене
        this.setupAudioUnlock();

        // Настройка коллизий
        logger.log('SCENE_CREATE', 'MainScene: Calling setupCollisions()');
        await this.setupCollisions();
        logger.log('SCENE_CREATE', 'MainScene: setupCollisions() completed');

        // ✅ Progress reporting: 70% - ПОСЛЕ настройки коллизий
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 70,
            text: 'Настройка коллизий...'
        });

        // ✅ Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 100));

        // Спавн объектов
        logger.log('SCENE_CREATE', 'MainScene: Calling spawnInitialObjects()');
        await this.spawnInitialObjects();
        logger.log('SCENE_CREATE', 'MainScene: spawnInitialObjects() completed');

        // ✅ Progress reporting: 80% - ПОСЛЕ спавна объектов
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 80,
            text: 'Спавн объектов...'
        });

        // ✅ Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 100));

        // Настройка камеры - ПОСЛЕ создания игрока!
        this.cameraManager.setupFollow();

        // Настройка периодических событий
        this.setupPeriodicEvents();

        // Настройка EventBus
        // Настройка EventBus
        // this.setupEventBus(); // ✅ REMOVED: Already called in initGameFlowHandlers() -> initQuizHandlers()

        // ✅ Создание UI сразу после настройки камеры
        // Камера уже настроена в setupCameraFollow(), поэтому UI можно создавать сразу
        // setScrollFactor(0) работает в координатах камеры, которые уже готовы
        // Создание отладочного UI
        logger.log('SCENE_CREATE', `MainScene.create(): DEBUG_UI_ENABLED = ${DEBUG_UI_ENABLED}`);
        if (DEBUG_UI_ENABLED) {
            logger.log('SCENE_CREATE', 'MainScene.create(): Creating debug UI...');
            this.debugOverlay = new DebugOverlay(this, {
                getPlayer: () => this.player,
                getGameState: () => this.gameState,
                getSpawnSystem: () => this.spawnSystem,
                getEnemyInstances: () => this.enemyManager.getInstances(),
                getMaxKeys: () => this.gameState.getState().maxKeys,
                getHeartsGroup: () => this.hearts,
                getKeysGroup: () => this.keys,
                getCoinsGroup: () => this.coins,
                getScore: () => this.scoreSystem ? this.scoreSystem.getScore() : 0,
                getMaxPossibleScore: () => this.scoreSystem ? this.scoreSystem.getMaxPossibleScore() : 0,
                getTotalMaxPossibleScore: () => this.scoreSystem ? this.scoreSystem.getTotalMaxPossibleScore() : 0,
                getCurrentLevel: () => this.levelManager.getCurrentLevel(),
                getCurrentConfigKey: () => this.levelManager.getCurrentConfigKey()
            });
            this.debugOverlay.create(); // Создает только debugText
            logger.log('SCENE_CREATE', 'MainScene.create(): Debug UI created');

            // === УТИЛИТА ДЛЯ ТЕСТИРОВАНИЯ ASPECT RANGES ===
            // Функция для тестирования всех 5 диапазонов aspect ratio
            // Использование в browser console: testModalRanges() или testModalRanges(375, 667)
            if (typeof window !== 'undefined') {
                (window as any).testModalRanges = (width?: number, height?: number) => {
                    const canvasWidth = width ?? window.innerWidth;
                    const canvasHeight = height ?? window.innerHeight;
                    const info = getAspectRangeInfo(canvasWidth, canvasHeight);
                    console.log(`🧪 Modal Aspect Range Test:`);
                    console.log(`   Canvas: ${canvasWidth}×${canvasHeight}`);
                    console.log(`   Screen AR: ${info.screenAR.toFixed(2)}`);
                    console.log(`   Range: ${info.rangeName}`);
                    console.log(`   Modal AR: ${info.aspectRatio.toFixed(2)}`);
                    console.log(`   ${info.rangeDescription}`);
                    return info;
                };
                console.log('✅ Modal range testing available: testModalRanges(width, height)');
            }
        } else {
            console.warn('⚠️ MainScene.create(): DEBUG_UI_ENABLED is false, skipping debug UI creation');
        }

        // ✅ Создаем сетку матрицы спавна после создания всех объектов и debugOverlay
        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            this.debugOverlay.createSpawnMatrixGrid();
            logger.log('SCENE_CREATE', 'MainScene.create(): Spawn matrix grid created');
        }

        // Создание HUD (Phaser UI) - ВСЕГДА создаем, это не debug фича!
        this.hudManager.create();

        // ✅ Progress reporting: 90% - ПОСЛЕ создания Debug UI и HUD
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 90,
            text: 'Финализация...'
        });

        // ✅ Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 100));
        logger.log('SCENE_CREATE', `MainScene: create() completed, input enabled: ${this.input.enabled}, keyboard enabled: ${this.input.keyboard?.enabled}`);

        // ✅ Всегда сообщаем о завершении загрузки
        EventBus.emit(FINISH_LOADING_EVENT);

        // ✅ Небольшая задержка для отображения 100% прогресса
        await new Promise(resolve => setTimeout(resolve, 200));

        // ✅ КРИТИЧНО: Поднимаем MainScene поверх LoadingScene
        this.scene.bringToTop();
        logger.log('SCENE_CREATE', 'MainScene: Brought to top');

        this.isReady = true;
        logger.log('SCENE_CREATE', 'MainScene: create() completed, isReady=true');
    }

    /**
     * Инициализация всех систем
     */
    private async initializeSystems(): Promise<void> {
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Starting...');

        // ✅ Загружаем спрайтшит для визуализации ключей у персонажа (78x26, 3 кадра по 26x26)
        // Делаем это здесь, так как assetLoader уже инициализирован в initBaseSystems()
        await this.assetLoader.loadSpritesheet(
            'Character.KeyHold_78x26.png',
            'Character.KeyHold_78x26.png',
            { frameWidth: 26, frameHeight: 26 }
        );
        // ✅ Progress: 52%
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 52,
            text: 'Инициализация систем... (ключи)'
        });

        // HealthSystem
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating HealthSystem');
        this.healthSystem = new HealthSystem(this, this.assetLoader);
        await this.healthSystem.initialize();
        this.healthSystem.setMaxHealth(MAX_HEALTH);
        this.healthSystem.setHealth(MAX_HEALTH);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: HealthSystem initialized');
        // ✅ Progress: 54%
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 54,
            text: 'Инициализация систем... (здоровье)'
        });

        // ScoreSystem
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating ScoreSystem');
        // ✅ Используем константы по умолчанию из scoreConstants.ts
        this.scoreSystem = new ScoreSystem();
        logger.log('SCENE_SYSTEMS', 'initializeSystems: ScoreSystem created');

        // QuizManager
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating QuizManager');
        this.quizManager = new QuizManager(this.assetLoader);
        // Сохраняем QuizManager в data сцены для доступа из UI компонентов
        this.data.set('quizManager', this.quizManager);
        // Сохраняем текущий уровень в data сцены (будет обновляться при изменении уровня)
        const currentLevel = this.levelManager.getCurrentLevel();
        this.data.set('currentLevel', currentLevel);

        // ✅ Загружаем вопросы для текущего уровня ДО создания объектов, которые их используют
        logger.log('SCENE_SYSTEMS', `initializeSystems: Loading level questions for level ${currentLevel}`);
        try {
            await this.quizManager.loadLevelQuestions(currentLevel);
            logger.log('SCENE_SYSTEMS', 'initializeSystems: Level questions loaded');

            // ✅ РАССЧИТЫВАЕМ МАКСИМАЛЬНЫЙ БАЛЛ ДЛЯ ТЕКУЩЕГО УРОВНЯ
            const fullConfig = await this.levelManager.getCurrentLevelConfig();
            const initialKeys = fullConfig.itemSpawn?.keys?.initial || 0;
            const initialCoins = fullConfig.itemSpawn?.coins?.initial || 0;  // ✅ НОВОЕ
            const maxScore = await this.quizManager.calculateMaxPossibleScore(currentLevel, initialKeys, initialCoins);
            this.scoreSystem.setMaxPossibleScore(maxScore);
            logger.log('SCENE_SYSTEMS', `initializeSystems: Max possible score for level ${currentLevel} is ${maxScore}`);

            // ✅ OPTIMIZATION: Calculate Total Max Score in background to reduce TBT
            // Don't await this loop during critical initialization
            this.calculateTotalMaxScoreInBackground();


        } catch (error) {
            logger.warn('SCENE_SYSTEMS', `initializeSystems: Failed to load level questions or calculate max score: ${error}`);
        }


        logger.log('SCENE_SYSTEMS', 'initializeSystems: QuizManager created');
        // ✅ Progress: 56%
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 56,
            text: 'Инициализация систем... (викторина)'
        });

        // AudioManager
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating AudioManager');
        this.audioManager = new AudioManager(this, this.assetLoader);
        // Сохраняем AudioManager в data сцены для доступа из UI компонентов
        this.data.set('audioManager', this.audioManager);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: AudioManager created');

        // SpawnSystem
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating SpawnSystem');
        this.spawnSystem = new SpawnSystem(this, this.levelManager, this.quizManager);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: SpawnSystem created');

        // ✅ Enemy Manager Initialization - Step 5
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating EnemyManager');
        this.enemyManager = new EnemyManager({
            scene: this,
            enemiesGroup: this.enemies,
            chasersGroup: this.chasers,
            levelManager: this.levelManager
        });

        // Create Spawner
        this.enemySpawner = new EnemySpawner(
            this,
            this.spawnSystem,
            this.levelManager,
            this.enemies,
            this.chasers,
            this.hearts,
            this.keys,
            this.coins, // ⚠️ НОВОЕ: Pass coins group
            () => this.player.getPosition(),
            (enemy) => {
                // Опциональный коллбэк, если нужно что-то делать в сцене после спавна
            },
            () => this.enemyManager.updateEnemyInstances()
        );

        // Link them
        this.enemyManager.setSpawner(this.enemySpawner);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: EnemyManager created');
        // ✅ Progress: 58%
        EventBus.emit(LOADING_PROGRESS_EVENT, {
            percent: 58,
            text: 'Инициализация систем... (враги)'
        });

        // ✅ Загружаем звуки через AssetLoader (использует scene.load.audio + scene.load.start)
        // Это работает в create() потому что мы явно вызываем load.start()
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Loading all sounds');
        await this.audioManager.loadAllSounds((current, total) => {
            const progress = 58 + (current / total);
            EventBus.emit(LOADING_PROGRESS_EVENT, {
                percent: Math.round(progress * 10) / 10,
                text: `Загрузка аудио... (${current}/${total})`
            });
        });
        logger.log('SCENE_SYSTEMS', 'initializeSystems: All sounds loaded');

        // Запускаем фоновую музыку
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Playing background music');
        await this.audioManager.playBackgroundMusic();
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Background music started');



        // WorldGenerator
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating WorldGenerator');
        this.worldGenerator = new WorldGenerator(this);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: WorldGenerator created');

        // UIManager
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating UIManager');
        this.uiManager = new UIManager(this, EventBus);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: UIManager created');

        // ✅ AnimationSyncManager - централизованная синхронизация анимаций
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating AnimationSyncManager');
        this.animationSyncManager = new AnimationSyncManager();

        // Регистрируем синхронизаторы
        this.animationSyncManager.register(new KeyAnimationSync(this));
        this.animationSyncManager.register(new CoinAnimationSync(this)); // ⚠️ НОВОЕ
        this.animationSyncManager.register(new PortalAnimationSync(this));
        this.animationSyncManager.register(new OracleAnimationSync(this));
        this.animationSyncManager.register(new PlayerAnimationSync(this));
        this.animationSyncManager.register(new EnemyAnimationSync(this));
        logger.log('SCENE_SYSTEMS', 'initializeSystems: AnimationSyncManager created with 6 syncers');

        // ✅ CollisionHandlers - выносят обработку коллизий из MainScene
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating CollisionHandlers');
        this.enemyCollisionHandler = new EnemyCollisionHandler(this);
        this.itemCollisionHandler = new ItemCollisionHandler(this);
        this.oracleCollisionHandler = new OracleCollisionHandler(this);
        this.portalCollisionHandler = new PortalCollisionHandler(this);
        logger.log('SCENE_SYSTEMS', 'initializeSystems: CollisionHandlers created (4 handlers)');

        // ✅ World Factories - Step 4: вынос создания мира и сущностей
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating WorldFactory');
        this.worldFactory = new WorldFactory(this, {
            spawnSystem: this.spawnSystem,
            levelManager: this.levelManager,
            worldGenerator: this.worldGenerator,
            physics: this.physics,
            add: this.add
        });
        logger.log('SCENE_SYSTEMS', 'initializeSystems: WorldFactory created');

        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating EntityFactory');
        this.entityFactory = new EntityFactory(this, {
            spawnSystem: this.spawnSystem,
            levelManager: this.levelManager,
            quizManager: this.quizManager,
            physics: this.physics,
            add: this.add,
            portals: this.portals,
            oracle: this.oracle,
            player: this.player,
            healthSystem: this.healthSystem,
            tiledPortalsConfig: this.tiledPortalsConfig
        });
        logger.log('SCENE_SYSTEMS', 'initializeSystems: EntityFactory created');

        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating CollisionObjectFactory');
        this.collisionObjectFactory = new CollisionObjectFactory(this, {
            levelManager: this.levelManager,
            spawnSystem: this.spawnSystem
        });
        logger.log('SCENE_SYSTEMS', 'initializeSystems: CollisionObjectFactory created');

        // ✅ Quiz Handlers - Step 6: создаются лениво после инициализации сущностей
        logger.log('SCENE_SYSTEMS', 'initializeSystems: QuizHandlers will be initialized lazily after entities are created');

        // ✅ Инициализируем настройки уровня (Max Keys)
        const levelConfig = await this.levelManager.getLevelConfig();
        if (typeof levelConfig !== 'undefined' && levelConfig.maxInventoryKeys !== undefined) {
            this.gameState.setMaxKeys(levelConfig.maxInventoryKeys);
            logger.log('SCENE_SYSTEMS', `MainScene: Set maxInventoryKeys from config to ${levelConfig.maxInventoryKeys}`);
        } else {
            this.gameState.setMaxKeys(3); // Fallback
            logger.log('SCENE_SYSTEMS', 'MainScene: Set maxInventoryKeys to default (3)');
        }



        // ✅ Регистрируем callback для создания клонов врагов
        this.data.set('createEnemyClone', this.createEnemyClone.bind(this));
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Enemy clone callback registered');

        // AnimationManager - создаем анимации из загруженных спрайтшитов
        logger.log('SCENE_SYSTEMS', 'initializeSystems: Creating animations');
        const animationManager = new AnimationManager(this);

        SPRITESHEET_CONFIGS.forEach((config) => {
            // Проверяем, что спрайтшит загружен
            const exists = this.textures.exists(config.load.key);
            const isOracle = config.load.key.includes('oracle');
            const logPrefix = isOracle ? 'ORACLE' : 'SPRITESHEET';

            logger.log('ANIMATION_CREATE', `Checking spritesheet "${config.load.key}": ${exists ? 'exists' : 'not found'}`);

            if (exists) {
                // ✅ Проверяем, не созданы ли уже все анимации для этого спрайтшита
                const allAnimationsExist = config.animations.every(animConfig =>
                    this.anims.exists(animConfig.key)
                );

                if (allAnimationsExist) {
                    logger.log('ANIMATION_CREATE', `All animations for "${config.load.key}" already exist, skipping creation`);
                    // ✅ Только логируем существующие анимации
                    config.animations.forEach(animConfig => {
                        const animExists = this.anims.exists(animConfig.key);
                        logger.log('ANIMATION_CREATE', `Animation "${animConfig.key}": ${animExists ? 'exists' : 'MISSING'}`);

                        // Для оракула выводим дополнительную информацию
                        if (isOracle && animExists) {
                            const animInstance = this.anims.get(animConfig.key);
                            logger.log('ANIMATION_CREATE', `Animation "${animConfig.key}" details:`, {
                                key: animInstance.key,
                                frames: animInstance.frames.length,
                                frameRate: animInstance.frameRate,
                                repeat: animInstance.repeat,
                                duration: animInstance.duration
                            });
                        }
                    });
                } else {
                    // ✅ Создаем только недостающие анимации
                    logger.log('ANIMATION_CREATE', `Some animations missing for "${config.load.key}", creating...`);
                    animationManager.createAnimations(config.load.key, config.animations);

                    // ✅ УПРОЩЕННАЯ ПРОВЕРКА: только логируем созданные анимации
                    config.animations.forEach(animConfig => {
                        const animExists = this.anims.exists(animConfig.key);
                        logger.log('ANIMATION_CREATE', `Animation "${animConfig.key}": ${animExists ? 'created' : 'FAILED'}`);

                        // Для оракула выводим дополнительную информацию
                        if (isOracle && animExists) {
                            const animInstance = this.anims.get(animConfig.key);
                            logger.log('ANIMATION_CREATE', `Animation "${animConfig.key}" details:`, {
                                key: animInstance.key,
                                frames: animInstance.frames.length,
                                frameRate: animInstance.frameRate,
                                repeat: animInstance.repeat,
                                duration: animInstance.duration
                            });
                        }
                    });
                }
            } else {
                console.warn(`${logPrefix} Spritesheet "${config.load.key}" not loaded, skipping animations`);
            }
        });

        // ✅ ПРОСТАЯ ПРОВЕРКА: логируем только ключи созданных анимаций
        const allAnimations = SPRITESHEET_CONFIGS.flatMap(config =>
            config.animations.map(anim => anim.key)
        );
        const createdAnimations = allAnimations.filter(key => this.anims.exists(key));
        logger.log('ANIMATION_CREATE', `Animation creation summary: ${createdAnimations.length}/${allAnimations.length} animations created`);

        // ✅ ДИАГНОСТИКА: Выводим все созданные анимации
        const knownAnimKeys = [
            'beast_down', 'beast_up', 'beast_left', 'beast_right',
            'dragon_down', 'dragon_up', 'dragon_left', 'dragon_right',
            'flam_down', 'flam_up', 'flam_left', 'flam_right',
            'boy_down', 'boy_up', 'boy_left', 'boy_right',
            'key_idle', 'boy_jump_win', 'character_lose_key', 'character_get_key', 'character_apply_key', 'enemy_death'
        ];
        const existingAnims = knownAnimKeys.filter(key => this.anims.exists(key));
        logger.log('ANIMATION_CREATE', `ALL CREATED ANIMATIONS:`, existingAnims);

        // ✅ ДИАГНОСТИКА: Проверяем спрайтшиты
        logger.log('ANIMATION_CREATE', `ALL LOADED TEXTURES:`, Object.keys(this.textures.list));

        logger.log('SCENE_SYSTEMS', 'initializeSystems: All systems initialized');
    }

    // ✅ Deprecated: Delegate to EnemyManager
    // This is public because it might be called by AbstractEnemy via scene reference
    public createEnemyClone(config: any): void {
        if (this.enemyManager) {
            this.enemyManager.createClone(config);
        } else {
            console.error('❌ MainScene: EnemyManager not initialized, cannot create clone');
        }
    }

    /**
     * Создание игрового мира
     */
    // Отслеживание размеров окна для обработки ресайза
    private lastWindowWidth: number = 0;
    private lastWindowHeight: number = 0;
    private resizeTimeout: any;


    /**
     * Настройка слушателей событий для ресайза
     */
    /**
     * ✅ Step 8: Event listeners are now managed by EventBusManager
     */
    private setupEventListeners(): void {
        this.eventBusManager.setupEventListeners();

        // ================================================
        // ОБРАБОТЧИКИ ПОТЕРИ ФОКУСА (AUDIO PAUSE/RESUME)
        // ================================================
        // При переключении вкладки или приложения приостанавливаем аудио
        EventBus.on('pause-audio', () => {
            if (this.audioManager) {
                this.audioManager.pauseAll();
                console.log('🔇 MainScene: Audio paused due to lost focus');
                logger.log('BOOTSTRAP', 'MainScene: Audio paused due to lost focus');
            }
        });

        EventBus.on('resume-audio', () => {
            if (this.audioManager) {
                // ✅ Проверяем состояние muted перед возобновлением
                // Если пользователь выключил звук кнопкой, не возобновляем музыку
                if (!this.audioManager.isMuted()) {
                    this.audioManager.resumeAll();
                    console.log('🔊 MainScene: Audio resumed after regaining focus');
                    logger.log('BOOTSTRAP', 'MainScene: Audio resumed after regaining focus');
                } else {
                    console.log('🔇 MainScene: Audio NOT resumed (sound is muted by user)');
                    logger.log('BOOTSTRAP', 'MainScene: Audio NOT resumed (sound is muted by user)');
                }
            }
        });

        // ================================================
        // ✅ ORACLE ACTIVATED HANDLER
        // ================================================
        EventBus.on(EVENTS.ORACLE_ACTIVATED, () => {
            logger.log('ORACLE', 'MainScene: Oracle ACTIVATED event received. Showing global question.');
            this.showGlobalQuestion();
        });

        // ================================================
        // ✅ GAME PHASE CHANGE HANDLER
        // ================================================
        EventBus.on(EVENTS.GAME_PHASE_CHANGED, async (payload: { newPhase: any }) => {
            const { newPhase } = payload;
            logger.log('GAME_PHASE', `⚠️ MainScene: Phase changed to ${newPhase}`);

            // 1. Update GameState
            this.gameState.setGamePhase(newPhase);

            if (newPhase === GamePhase.KEY) { // GamePhase.KEY
                // 2. Clear remaining coins
                if (this.coins) {
                    logger.log('GAME_PHASE', `Clearing ${this.coins.getLength()} remaining coins`);
                    this.coins.clear(true, true);
                }

                // 3. Spawn Keys (using SpawnSystem)
                logger.log('GAME_PHASE', 'Spawning Keys for Phase 2');
                await this.spawnSystem.spawnItems(
                    this.hearts,
                    this.keys,
                    this.coins
                );

                // ❌ ОТКЛЮЧЕНО: Floating text "PHASE 2: FIND KEYS!" - не нужен
                // // 4. Update HUD
                // if (this.effectsManager) {
                //     this.effectsManager.showFloatingText(
                //         this.player.getX(),
                //         this.player.getY() - 80,
                //         "PHASE 2: FIND KEYS!",
                //         0x00FF00
                //     );
                // }
            }
        });
    }

    /**
     * ================================================
     * РАЗБЛОКИРОВКА АУДИО ДЛЯ iOS/ANDROID
     * ================================================
     * iOS требует явного действия пользователя для запуска AudioContext
     * Добавляем обработчик первого касания на сцене
     */
    private setupAudioUnlock(): void {
        // Флаг для отслеживания разблокировки
        let audioUnlocked = false;

        const unlockHandler = () => {
            if (audioUnlocked) return;
            audioUnlocked = true;

            logger.log('BOOTSTRAP', '🔓 First user interaction - attempting to unlock AudioContext');
            this.audioManager.unlockAudio();

            // Удаляем обработчик после первого срабатывания
            this.input.off('pointerdown', unlockHandler);
        };

        // Добавляем обработчик на первое касание
        this.input.on('pointerdown', unlockHandler);
        logger.log('BOOTSTRAP', 'Audio unlock handler registered on first pointerdown');
    }

    /**
     * Обработчик поворота экрана — закрывает все модальные окна
     */
    private handleOrientationChange(): void {
        logger.log('SCENE_INIT', 'MainScene: Orientation change detected');

        // Модальные окна управляются UIManager
        this.resumeGame();

        // Обновляем отладочный UI
        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            this.debugOverlay.update();
        }
    }

    /**
     * ✅ Step 8: Обработчик ресайза окна браузера - EventBusManager callback
     */
    private handleWindowResize(): void {
        // Дебаунс ресайза
        // Дебаунс ресайза - cleanup предыдущего таймера выполняется внутри eventBusManager.setResizeTimeout

        const newTimeout = setTimeout(() => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const height = window.innerHeight;
                if (this.eventBusManager) {
                    this.eventBusManager.updateWindowSize(width, height);
                }
                this.lastWindowWidth = width;
                this.lastWindowHeight = height;
            }

            // ✅ Step 4: Пересоздаем расширенный фон через WorldFactory
            this.worldFactory.handleResize();
        }, 250);

        if (this.eventBusManager) {
            this.eventBusManager.setResizeTimeout(newTimeout);
        }
    }

    /**
     * ✅ Step 8: Обработчик ресайза от Phaser - EventBusManager callback
     */
    private handlePhaserResize(gameSize: Phaser.Structs.Size): void {
        if (typeof window === 'undefined') return;

        // Получаем текущий размер через EventBusManager
        const windowSize = this.eventBusManager ? this.eventBusManager.getWindowSize() : { width: this.lastWindowWidth, height: this.lastWindowHeight };

        // Проверяем, если размеры сильно изменились
        const widthChanged = Math.abs(windowSize.width - window.innerWidth) > 50;
        const heightChanged = Math.abs(windowSize.height - window.innerHeight) > 50;

        if (widthChanged || heightChanged) {
            this.handleWindowResize();
        }
    }

    /**
     * ✅ Step 6: Инициализация QuizHandlers после создания всех сущностей
     * Вызывается после entityFactory.createAll() когда player и oracle уже созданы
     */
    private initQuizHandlers(): void {
        logger.log('SCENE_SYSTEMS', 'initQuizHandlers: Creating QuizHandlers');

        // KeyQuizHandler
        const keyQuizCallbacks: KeyQuizCallbacks = {
            flashPlayerGetKey: () => this.flashPlayerGetKey(),
            resumeGame: () => this.resumeGame(),
            updateHUD: () => this.updateHUD(),
            handleGameOver: (result) => this.handleGameOver(result)
        };
        const keyQuizDeps: KeyQuizDependencies = {
            scene: this,
            gameState: this.gameState,
            scoreSystem: this.scoreSystem,
            healthSystem: this.healthSystem,
            audioManager: this.audioManager,
            collisionSystem: this.collisionSystem,
            player: this.player,
            answeredQuestions: this.answeredQuestions
        };
        this.keyQuizHandler = new KeyQuizHandler(keyQuizDeps, keyQuizCallbacks);
        logger.log('SCENE_SYSTEMS', 'initQuizHandlers: KeyQuizHandler created');

        // ⚠️ НОВОЕ: CoinQuizHandler
        const coinQuizCallbacks: CoinQuizCallbacks = {
            resumeGame: () => this.resumeGame(),
            updateHUD: () => this.updateHUD()
        };
        const coinQuizDeps: CoinQuizDependencies = {
            scene: this,
            gameState: this.gameState,
            scoreSystem: this.scoreSystem,
            healthSystem: this.healthSystem,
            audioManager: this.audioManager,
            answeredCoinStatements: this.answeredCoinStatements  // ✅ НОВОЕ: Отслеживание уникальности
        };
        this.coinQuizHandler = new CoinQuizHandler(coinQuizDeps, coinQuizCallbacks);
        logger.log('SCENE_SYSTEMS', 'initQuizHandlers: CoinQuizHandler created');

        // PortalQuizHandler
        const portalQuizCallbacks: PortalQuizCallbacks = {
            resumeGame: () => this.resumeGame(),
            handlePortalEntry: (portal) => this.portalCollisionHandler.handleEntry(portal),
            enablePortalOverlap: () => {
                if (this.collisionSystem) {
                    this.collisionSystem.enablePortalOverlap();
                } else {
                    console.warn('⚠️ PortalQuizHandler: collisionSystem not yet initialized');
                }
            }
        };
        const portalQuizDeps: PortalQuizDependencies = {
            scene: this,
            portalModalCooldownMs: this.PORTAL_MODAL_COOLDOWN_MS,
            onSetPortalCooldown: (cooldown) => { this.portalModalCooldown = cooldown; },
            onClearPendingPortal: () => { this.pendingPortal = null; }
        };
        this.portalQuizHandler = new PortalQuizHandler(portalQuizDeps, portalQuizCallbacks);
        logger.log('SCENE_SYSTEMS', 'initQuizHandlers: PortalQuizHandler created');

        // GlobalQuestionManager
        const globalQuestionCallbacks: GlobalQuestionCallbacks = {
            onQuestionDisplayed: () => { },
            isSceneAndObjectActive: (obj) => {
                return !!(this.scene?.isActive() && this.sys?.settings?.active && (obj === undefined || obj.active !== false));
            }
        };
        const globalQuestionDeps: GlobalQuestionDependencies = {
            scene: this,
            oracle: this.oracle,
            assetLoader: this.assetLoader,
            quizManager: this.quizManager,
            levelManager: this.levelManager,
            currentGlobalQuestionData: this.currentGlobalQuestionData,
            onSetCurrentGlobalQuestion: (data) => { this.currentGlobalQuestionData = data; },
            getGlobalQuestionText: () => this.globalQuestionText,
            setGlobalQuestionText: (text) => { this.globalQuestionText = text; },
            getGlobalQuestionImage: () => this.globalQuestionImage,
            setGlobalQuestionImage: (image) => { this.globalQuestionImage = image; }
        };
        this.globalQuestionManager = new GlobalQuestionManager(globalQuestionDeps, globalQuestionCallbacks);
        logger.log('SCENE_SYSTEMS', 'initQuizHandlers: GlobalQuestionManager created');

        // ✅ Step 7: Initialize UI Managers
        this.initUIManagers();

        // ✅ Step 8: Initialize GameFlow Handlers
        this.initGameFlowHandlers();
    }

    /**
     * ✅ Step 7: Инициализация UI Managers после создания сущностей
     * Вызывается после initQuizHandlers()
     */
    private initUIManagers(): void {
        logger.log('SCENE_SYSTEMS', 'initUIManagers: Creating UI Managers');

        // HUDManager
        const hudDeps = {
            scene: this,
            gameState: this.gameState,
            scoreSystem: this.scoreSystem,
            audioManager: this.audioManager, // ✅ Добавляем AudioManager для кнопки звука
            isOracleActivated: this.isOracleActivated,
            getCurrentLevel: () => this.levelManager.getCurrentLevel()
        };
        this.hudManager = new HUDManager(hudDeps);
        logger.log('SCENE_SYSTEMS', 'initUIManagers: HUDManager created');

        // CameraManager
        const cameraCallbacks = {
            onResize: () => {
                if (this.hudManager) this.hudManager.update();
            }
        };
        const cameraDeps = {
            scene: this,
            player: this.player,
            worldFactory: this.worldFactory,
            physics: this.physics
        };
        this.cameraManager = new CameraManager(cameraDeps, cameraCallbacks);
        logger.log('SCENE_SYSTEMS', 'initUIManagers: CameraManager created');

        // EffectsManager
        const effectsCallbacks = {
            onUpdateHUD: () => {
                if (this.hudManager) this.hudManager.update();
            },
            getZoomCompensatedPosition: (screenX: number, screenY: number) => {
                // Inline simple calculation or delegate
                const cam = this.cameras.main;
                const zoom = cam.zoom;
                const centerX = cam.width / 2;
                const centerY = cam.height / 2;
                return {
                    x: centerX + (screenX - centerX) / zoom,
                    y: centerY + (screenY - centerY) / zoom
                };
            }
        };
        const effectsDeps = {
            scene: this,
            player: this.player,
            tweens: this.tweens
        };
        this.effectsManager = new EffectsManager(effectsDeps, effectsCallbacks);
        logger.log('SCENE_SYSTEMS', 'initUIManagers: EffectsManager created');
    }

    /**
     * ✅ Step 8: Инициализация GameFlow Handlers
     * Вызывается после initUIManagers()
     */
    private initGameFlowHandlers(): void {
        logger.log('SCENE_SYSTEMS', 'initGameFlowHandlers: Creating GameFlow Handlers');

        // EventBusManager
        const eventBusCallbacks: EventBusManagerCallbacks = {
            // Portal handlers - delegate directly to PortalQuizHandler
            onPortalEnterConfirmed: (data) => {
                if (this.portalQuizHandler) {
                    this.portalQuizHandler.handleEnterConfirmed(data.portal, this.pendingPortal);
                }
            },
            onPortalEnterCancelled: () => {
                if (this.portalQuizHandler) {
                    this.portalQuizHandler.handleEnterCancelled();
                }
            },

            // Quiz handlers - delegate directly to KeyQuizHandler
            onKeyQuizCompleted: (data) => {
                if (!this.keyQuizHandler) return;

                if (data.result === 'correct') {
                    this.keyQuizHandler.handleCorrect(this.currentMiniQuizData || undefined);
                    // Sync back for resumeGame cleanup
                    this.currentKeySprite = this.keyQuizHandler.getCurrentKeySprite();
                    this.currentKeyId = this.keyQuizHandler.getCurrentKeyId();
                } else if (data.result === 'wrong') {
                    this.keyQuizHandler.handleWrong(data.damage);
                    // Sync back
                    this.currentKeySprite = this.keyQuizHandler.getCurrentKeySprite();
                    this.currentKeyId = this.keyQuizHandler.getCurrentKeyId();
                } else {
                    this.keyQuizHandler.handleClose();
                    // Sync back
                    this.currentKeySprite = this.keyQuizHandler.getCurrentKeySprite();
                    this.currentKeyId = this.keyQuizHandler.getCurrentKeyId();
                }
            },

            // ⚠️ НОВОЕ: Coin quiz handler - delegate to CoinQuizHandler
            onCoinQuizCompleted: (data) => {
                if (!this.coinQuizHandler) return;

                // Reset quiz state
                this.gameState.setQuizActive(false);

                if (data.result === 'correct') {
                    // ✅ НОВОЕ: Передаем текст утверждения для отслеживания уникальности
                    this.coinQuizHandler.handleCorrect(data.statementText);
                } else {
                    this.coinQuizHandler.handleWrong();
                }
            },

            // ⚠️ НОВОЕ: Game phase changed handler - clear coins on COIN → KEY transition
            onGamePhaseChanged: (data) => {
                console.log('🔥🔥🔥 MAIN_SCENE onGamePhaseChanged CALLED!!!', data);
                logger.log('MAIN_SCENE', `Game phase changed to: ${data.newPhase}`);

                // Update game state
                if (data.newPhase === GamePhase.KEY) {
                    this.gameState.setGamePhase(GamePhase.KEY);
                    // ✅ Clear remaining coins from gameState (fix: coins displayed after phase transition)
                    console.log('🔥🔥🔥 MAIN_SCENE KEY phase: clearing gameState coins, was=', this.gameState.getCoins());
                    this.gameState.setCoins(0);
                    // Clear all coins from the scene
                    this.coins.clear(true, true); // destroy, remove from group
                    // ✅ Clear coins from player display (fix: remaining coins shown above player)
                    // Используем специальный метод для принудительной очистки
                    console.log('🔥🔥🔥 MAIN_SCENE KEY phase: player exists?', !!this.player, 'player has clearPlayerCoins?', !!(this.player && (this.player as any).clearPlayerCoins));
                    if (this.player && (this.player as any).clearPlayerCoins) {
                        console.log('🔥🔥🔥 MAIN_SCENE Calling player.clearPlayerCoins()...');
                        logger.log('MAIN_SCENE', `Calling player.clearPlayerCoins()...`);
                        this.player.clearPlayerCoins();
                    } else {
                        console.log('❌❌❌ MAIN_SCENE ERROR: player or clearPlayerCoins missing!');
                    }
                } else if (data.newPhase === GamePhase.COIN) {
                    this.gameState.setGamePhase(GamePhase.COIN);
                }

                // Update HUD to reflect new phase
                this.updateHUD();
            },

            // Legacy handler
            onQuizCompleted: (data) => {
                // Just resume game for legacy events
                this.resumeGame();
            },

            // Game flow handlers - delegate to new handlers
            onRestartGame: () => this.gameOverHandler.handleFullGameRestart(),
            onNextLevel: () => this.levelTransitionHandler.handleNextLevel(),

            // Viewport handler - delegate to existing handler
            onViewportUpdate: ({ realWidth, realHeight }) => {
                this.realViewportWidth = realWidth;
                this.realViewportHeight = realHeight;
            },

            // Event listener handlers - delegate to existing handlers
            handleWindowResize: () => this.handleWindowResize(),
            handleOrientationChange: () => this.handleOrientationChange(),
            handlePhaserResize: (gameSize) => this.handlePhaserResize(gameSize),

            // Oracle handlers
            onOracleActivated: () => {
                logger.log('MAIN_SCENE', '🔥 ORACLE_ACTIVATED event handled: updating UI and showing question');
                // ❌ ОТКЛЮЧЕНО: Oracle label - не нужна
                // // ✅ Обновляем метку оракула
                // if (this.oracleLabel) {
                //     this.oracleLabel.setText('ORACLE ACTIVE').setColor(ORACLE_LABEL_ACTIVE_COLOR);
                // }
                // ✅ Показываем глобальный вопрос
                if (this.globalQuestionManager) {
                    this.globalQuestionManager.showGlobalQuestion();
                }
                // ✅ Обновляем HUD
                this.updateHUD();
            },

            // Additional callbacks
            resumeGame: () => this.resumeGame(),
            updateDebugOverlay: () => {
                if (DEBUG_UI_ENABLED && this.debugOverlay) {
                    this.debugOverlay.update();
                }
            }
        };

        const eventBusDeps: EventBusManagerDependencies = {
            scene: this,
            events: this.events,
            scale: this.scale
        };
        this.eventBusManager = new EventBusManager(eventBusDeps, eventBusCallbacks);
        logger.log('SCENE_SYSTEMS', 'initGameFlowHandlers: EventBusManager created');

        // Setup event listeners and EventBus subscriptions
        this.eventBusManager.setupEventListeners();
        this.eventBusManager.setupEventBus();

        // GameOverHandler
        const gameOverCleanupObjects: GameOverCleanupObjects = {
            grassBackground: this.grassBackground,
            bushCollisionObjects: this.bushCollisionObjects,
            stoneCollisionObjects: this.stoneCollisionObjects,
            debugOverlay: this.debugOverlay,
            globalQuestionText: this.globalQuestionText,
            globalQuestionImage: this.globalQuestionImage,
            floatingTextPool: [], // ✅ EffectsManager handles floatingTextPool cleanup
            playerFlashGetKeySprites: [], // ✅ EffectsManager handles flash effects cleanup
            enemyInstances: this.enemyInstances,
            portalInstances: this.portalInstances,
            enemies: this.enemies,
            chasers: this.chasers,
            hearts: this.hearts,
            keys: this.keys,
            portals: this.portals,
            oracle: this.oracle,

        };

        const gameOverCallbacks: GameOverCallbacks = {
            // Registry operations
            getRegistry: () => this.registry,

            // Game state to reset
            getAnsweredQuestions: () => this.answeredQuestions,
            setAnsweredQuestions: (value) => { this.answeredQuestions = value; },
            // ✅ НОВОЕ: Отслеживание уникальности утверждений монеток
            getAnsweredCoinStatements: () => this.answeredCoinStatements,
            setAnsweredCoinStatements: (value) => { this.answeredCoinStatements = value; },
            getIsOracleActivated: () => this.isOracleActivated,
            setIsOracleActivated: (value) => { this.isOracleActivated = value; },
            getLastDepositTime: () => this.lastDepositTime,
            setLastDepositTime: (value) => { this.lastDepositTime = value; },
            getPendingPortal: () => this.pendingPortal,
            setPendingPortal: (value) => { this.pendingPortal = value; },
            getPortalModalCooldown: () => this.portalModalCooldown,
            setPortalModalCooldown: (value) => { this.portalModalCooldown = value; },
            getCurrentGlobalQuestionData: () => this.currentGlobalQuestionData,
            setCurrentGlobalQuestionData: (value) => { this.currentGlobalQuestionData = value; },
            getCurrentMiniQuizData: () => this.currentMiniQuizData,
            setCurrentMiniQuizData: (value) => { this.currentMiniQuizData = value; },
            getLastEnemyCollisionTime: () => this.lastEnemyCollisionTime,
            setLastEnemyCollisionTime: (value) => { this.lastEnemyCollisionTime = value; },
            getLastFullWarningTime: () => this.lastFullWarningTime,
            setLastFullWarningTime: (value) => { this.lastFullWarningTime = value; },

            // Tiled map state to reset
            getTiledPortalsConfig: () => this.tiledPortalsConfig,
            setTiledPortalsConfig: (value) => { this.tiledPortalsConfig = value; },
            getCurrentOverlapData: () => this.currentOverlapData,
            setCurrentOverlapData: (value) => { this.currentOverlapData = value; },
            getTiledMapInfo: () => this.tiledMapInfo,
            setTiledMapInfo: (value) => { this.tiledMapInfo = value; },

            // Flash timers to clear
            getPlayerFlashLoseKeyInterval: () => null, // ✅ EffectsManager handles this
            setPlayerFlashLoseKeyInterval: (value) => { /* EffectsManager handles this */ },
            getPlayerFlashGetKeyInterval: () => null, // ✅ EffectsManager handles this
            setPlayerFlashGetKeyInterval: (value) => { /* EffectsManager handles this */ },
            getPlayerFlashGetKeyPositionTimer: () => null, // ✅ EffectsManager handles this
            setPlayerFlashGetKeyPositionTimer: (value) => { /* EffectsManager handles this */ },

            // UI operations
            showGameWinModal: (score, feedbackText, onRestart) => {
                this.uiManager.showGameWinModal(score, feedbackText, onRestart);
            },
            getUiManager: () => this.uiManager,

            // Additional cleanup
            destroyGrassBackground: () => {
                if (this.grassBackground) {
                    try {
                        this.grassBackground.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying grassBackground:', e);
                    }
                }
            },
            destroyBushCollisionObjects: () => {
                if (this.bushCollisionObjects) {
                    try {
                        this.bushCollisionObjects.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying bushCollisionObjects:', e);
                    }
                }
            },
            destroyStoneCollisionObjects: () => {
                if (this.stoneCollisionObjects) {
                    try {
                        this.stoneCollisionObjects.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying stoneCollisionObjects:', e);
                    }
                }
            },
            destroyDebugOverlay: () => {
                if (this.debugOverlay) {
                    try {
                        this.debugOverlay.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying debugOverlay:', e);
                    }
                }
            },
            destroyGlobalQuestionObjects: () => {
                if (this.globalQuestionText) {
                    try {
                        this.globalQuestionText.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying globalQuestionText:', e);
                    }
                    this.globalQuestionText = null;
                }
                if (this.globalQuestionImage) {
                    try {
                        this.globalQuestionImage.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying globalQuestionImage:', e);
                    }
                    this.globalQuestionImage = null;
                }
            }
        };

        const gameOverDeps: GameOverDependencies = {
            scene: this,
            player: this.player,
            audioManager: this.audioManager,
            physics: this.physics,
            input: this.input,
            time: this.time,
            game: this.game,
            scale: this.scale,
            levelManager: this.levelManager,
            scoreSystem: this.scoreSystem,
            healthSystem: this.healthSystem,
            gameState: this.gameState,
            quizManager: this.quizManager
        };
        this.gameOverHandler = new GameOverHandler(gameOverDeps, gameOverCleanupObjects, gameOverCallbacks);
        logger.log('SCENE_SYSTEMS', 'initGameFlowHandlers: GameOverHandler created');

        // LevelTransitionHandler
        const levelTransitionCallbacks: LevelTransitionCallbacks = {
            // Перезапуск сцены с сохранением уровня (для перехода на следующий уровень)
            restartScene: () => this.restartScene(),
            // Полный перезапуск на уровень 1
            restartGame: () => this.handleFullGameRestart(),
            handleGameWin: (score, feedbackText) => this.handleGameWin(score, feedbackText)
        };

        const levelTransitionDeps: LevelTransitionDependencies = {
            levelManager: this.levelManager,
            scoreSystem: this.scoreSystem,
            registry: this.registry
        };
        this.levelTransitionHandler = new LevelTransitionHandler(levelTransitionDeps, levelTransitionCallbacks);
        logger.log('SCENE_SYSTEMS', 'initGameFlowHandlers: LevelTransitionHandler created');
    }

    private async createGameWorld(): Promise<void> {
        // ✅ Groups создаются в create() ДО initializeSystems() (Step 4)

        // ✅ Инициализируем массив порталов (очищаем старые ссылки)
        this.portalInstances = [];

        // ✅ Очищаем и уничтожаем объекты коллизий из предыдущих запусков (критично для рестарта)
        if (this.bushCollisionObjects) {
            this.bushCollisionObjects.destroy();
            this.bushCollisionObjects = undefined;
        }
        if (this.stoneCollisionObjects) {
            this.stoneCollisionObjects.destroy();
            this.stoneCollisionObjects = undefined;
        }
        if (this.tiledMapCollisionBodies) {
            this.tiledMapCollisionBodies.destroy();
            this.tiledMapCollisionBodies = undefined;
        }

        // ✅ Step 4: Используем WorldFactory для создания мира
        await this.worldFactory.create();

        // ✅ Step 4: Используем EntityFactory для создания Oracle, Player, Portals
        const entities = await this.entityFactory.createAll(
            this.tiledPortalsConfig,
            this.tiledOracleConfig
        );
        // ✅ Обновляем ссылки в MainScene на созданные объекты
        this.oracle = entities.oracle;
        this.player = entities.player;

        // ✅ CRITICAL FIX: Синхронизируем глобальный вопрос с фабрикой
        this.currentGlobalQuestionData = entities.globalQuestionData;
        logger.log('SCENE_INIT', `MainScene: Global question synchronized from EntityFactory: ${this.currentGlobalQuestionData?.questionText}`);

        // ✅ Step 6: Инициализируем QuizHandlers после создания всех сущностей
        this.initQuizHandlers();

        // ✅ Step 4: Используем CollisionObjectFactory для создания объектов коллизии (кусты, камни)
        const currentLevel = this.levelManager.getCurrentLevel();
        const collisionObjects = await this.collisionObjectFactory.create(currentLevel);
        this.bushCollisionObjects = collisionObjects.bushCollisionObjects ?? undefined;
        this.stoneCollisionObjects = collisionObjects.stoneCollisionObjects ?? undefined;

        // ✅ Сердечки (спавнятся после порталов и объектов коллизии, но до врагов)
        const playerPos = this.player.getPosition();
        await this.spawnSystem.spawnItems(
            this.hearts,
            this.keys,
            this.coins, // ⚠️ НОВОЕ: coinsGroup
            playerPos.x,
            playerPos.y
        );

        // ✅ Сетка создается в create() после создания debugOverlay
    }

    /**
     * Создание игрового мира с использованием Tiled Map
     */
    /**
     * Обработчик подтвержденного входа в портал (вызванный через событие)
     */
    /**
     * ✅ Step 6: Delegate to PortalQuizHandler
     */
    private handlePortalEnterConfirmed(portal: AbstractPortal): void {
        if (this.portalQuizHandler) {
            this.portalQuizHandler.handleEnterConfirmed(portal, this.pendingPortal);
        } else {
            console.error('❌ MainScene: PortalQuizHandler not initialized');
        }
    }

    /**
     * ✅ Step 6: Delegate to PortalQuizHandler
     * Вызывается, когда игрок нажимает "Отмена" или закрывает модальное окно
     */
    private handlePortalEnterCancelled(): void {
        if (this.portalQuizHandler) {
            this.portalQuizHandler.handleEnterCancelled();
        } else {
            console.error('❌ MainScene: PortalQuizHandler not initialized');
        }
    }

    /**
     * Обработчик оверлапа с маской портала
     * Находит ближайший портал и вызывает логику входа
     */
    public handlePortalOverlapByMask(_playerSprite: any, tileBody: any): void {
        // ✅ Вынесено в PortalCollisionHandler
        this.portalCollisionHandler.handleOverlapByMask(_playerSprite, tileBody);
    }

    /**
     * Создание оракула
     * ✅ Использует матричную систему для размещения
     */
    private createOracle(): void {
        // ✅ Используем матричную систему для спавна оракула
        const oraclePos = this.spawnSystem.spawnOracleMatrix();
        const oracleX = oraclePos.x;
        const oracleY = oraclePos.y;

        // ✅ Создаем экземпляр класса Oracle с машиной состояний
        this.oracle = new Oracle(this, oracleX, oracleY);

        // ❌ ОТКЛЮЧЕНО: Титры оракула - не нужны
        // Надпись Oracle ставим выше, чтобы она была над оракулом, а не поверх него
        // this.oracleLabel = this.add.text(oracleX, oracleY - 150, 'ORACLE (0/3)', {
        //     fontSize: `${ORACLE_LABEL_FONT_SIZE}px`, // ✅ Используем константу
        //     fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
        //     fontStyle: ORACLE_LABEL_FONT_STYLE, // ✅ Используем константу
        //     color: ORACLE_LABEL_COLOR, // ✅ Используем константу
        //     stroke: '#000',
        //     strokeThickness: 4
        // }).setOrigin(0.5);

        // ✅ Создаем баббл вопроса для Оракула (позиционируется относительно реальных координат спрайта)
        if (USE_QUESTION_BUBBLE) {
            const currentLevel = this.levelManager.getCurrentLevel();
            this.oracle.createQuestionBubble(this.quizManager, currentLevel);
            // ✅ Обновляем позицию баббла после создания, чтобы убедиться, что он позиционирован правильно
            // (в локальной системе координат относительно Oracle)
            this.oracle.updateBubblePosition();
        }

        // ✅ Позиция уже занята в матрице через spawnOracleMatrix()
    }

    /**
     * Создание порталов на основе глобального вопроса из JSON
     * ✅ Использует сохраненный вопрос, если он уже выбран
     */
    private async createPortals(): Promise<void> {
        try {
            const currentLevel = this.levelManager.getCurrentLevel();

            // ✅ Загружаем глобальный вопрос ОДИН РАЗ и сохраняем
            if (!this.currentGlobalQuestionData) {
                this.currentGlobalQuestionData = await this.quizManager.getRandomGlobalQuestion(currentLevel);
                logger.log('SCENE_INIT', `Global question selected: ${this.currentGlobalQuestionData.questionText}`);
            }

            const questionData = this.currentGlobalQuestionData;

            // ✅ Создаем массив всех ответов (правильный + неправильные)
            const allAnswers = [
                questionData.correctAnswer,
                ...questionData.wrongAnswers
            ];

            // ✅ Перемешиваем ответы для случайного порядка порталов
            const shuffledAnswers = this.shuffleArray([...allAnswers]);

            // ✅ Создаем порталы на основе ответов
            // ✅ НОВАЯ ЛОГИКА: Используем константу радиуса из конфига уровня
            const levelConfig = await this.levelManager.getLevelConfig();
            const portalSpawnRadius = levelConfig?.portalSpawnRadius ?? 576; // По умолчанию 576

            // ✅ Размещаем порталы на окружности (fallback) или используем Tiled Config
            // const angleStep = (2 * Math.PI) / shuffledAnswers.length; // 120° в радианах для 3 порталов (MOVED TO ELSE)

            // ✅ НОВАЯ ЛОГИКА: Cначала проверяем, есть ли конфиг от Tiled Map
            if (this.tiledPortalsConfig && this.tiledPortalsConfig.length > 0) {
                logger.log('PORTAL', `MainScene.createPortals: Using Tiled Map config for ${this.tiledPortalsConfig.length} portals`);

                this.tiledPortalsConfig.forEach(config => {
                    // ID портала начинается с 1. Индекс ответа = ID - 1
                    const answerIndex = config.id - 1;

                    if (answerIndex >= 0 && answerIndex < shuffledAnswers.length) {
                        const answer = shuffledAnswers[answerIndex];
                        const isCorrect = answer === questionData.correctAnswer;

                        const portalConfig: PortalConfig = {
                            id: config.id,
                            type: PortalType.STANDARD,
                            isCorrect: isCorrect,
                            answerText: answer,
                            damage: 3
                        };

                        const portal = new StandardPortal(
                            this,
                            portalConfig,
                            config.x,
                            config.y
                        );

                        // ✅ Применяем флаг переопределения коллизии
                        if (config.overrideCollision) {
                            portal.setCollisionOverride(true);
                        }

                        // ✅ TILED MODE FIX: Если мы в режиме Tiled Map, расширяем тело портала для сенсора
                        const pSprite = portal.getSprite();
                        const pBody = pSprite.body as Phaser.Physics.Arcade.Body;
                        if (pBody) {
                            const expand = COLLISION_CONFIG.TILED_SENSOR_EXPANSION;
                            // Порталы в Tiled могут иметь разные размеры, но AbstractPortal обычно создает стандартное тело
                            // Расширяем его чтобы overlap срабатывал при касании воксельных стен
                            pBody.setSize(pBody.width + expand, pBody.height + expand, true);
                            logger.log('PORTAL', `MainScene: Expanded Portal ${config.id} body for interaction sensor`);
                        }

                        this.portals.add(portal.getSprite());
                        this.portalInstances.push(portal);
                        logger.log('PORTAL', `Portal ${config.id} created at [${config.x}, ${config.y}] (Override: ${config.overrideCollision})`);
                    } else {
                        console.warn(`⚠️ MainScene.createPortals: Portal ID ${config.id} out of range for answers (count: ${shuffledAnswers.length})`);
                    }
                });

            } else {
                // ✅ СТАРАЯ ЛОГИКА (FALLBACK): Круговой спавн для авто-режима или если нет Tiled объектов
                logger.log('PORTAL', 'MainScene.createPortals: Using Circular Spawn (Automatic Mode)');

                const centerX = MAP_CENTER_X; // Центр карты (и оракула)
                const centerY = MAP_CENTER_Y;
                const angleStep = (2 * Math.PI) / shuffledAnswers.length; // 120° в радианах для 3 порталов

                for (let index = 0; index < shuffledAnswers.length; index++) {
                    const answer = shuffledAnswers[index];
                    const isCorrect = answer === questionData.correctAnswer;

                    const portalConfig: PortalConfig = {
                        id: index + 1,
                        type: PortalType.STANDARD,
                        isCorrect: isCorrect,
                        answerText: answer,
                        damage: 3,
                        useTiledMapTextures: false // ✅ Явно указываем Standard Mode
                    };

                    // ✅ Вычисляем позицию на окружности с шагом 120 градусов
                    const angle = index * angleStep; // Угол в радианах (0°, 120°, 240°)

                    // ✅ Используем spawnPortalMatrix для правильного выравнивания по сетке
                    const posResult = this.spawnSystem.spawnPortalMatrix(
                        centerX,
                        centerY,
                        portalSpawnRadius,
                        angle
                    );

                    if (!posResult.success) {
                        console.warn(`⚠️ MainScene.createPortals: Не удалось найти безопасную позицию для портала ${index + 1}. Пропускаем.`);
                        continue;
                    }

                    // ✅ Логируем для отладки
                    if (process.env.NODE_ENV === 'development') {
                        logger.log('PORTAL', `Portal ${index + 1} spawn on circle: position: ${posResult.x.toFixed(2)}, ${posResult.y.toFixed(2)}, angle: ${(angle * 180 / Math.PI).toFixed(1)}°, radius: ${portalSpawnRadius}`);
                    }

                    const portal = new StandardPortal(
                        this,
                        portalConfig,
                        posResult.x,
                        posResult.y
                    );

                    this.portals.add(portal.getSprite());
                    this.portalInstances.push(portal);
                }
            }

            logger.log('PORTAL', `Portals created from global question: [${shuffledAnswers.join(', ')}]`);

            // ✅ Настраиваем обработчики кликов для порталов (переключение видимости бабблов)
            // ✅ Логика обработки кликов перенесена внутрь AbstractPortal

        } catch (error) {
            console.error('Failed to create portals from question, using fallback:', error);
            // Fallback на хардкод, если не удалось загрузить вопрос
            await this.createPortalsFallback();
        }
    }

    /**
     * Fallback создание порталов (если не удалось загрузить вопрос)
     */
    private async createPortalsFallback(): Promise<void> {
        // ✅ Используем константу радиуса из конфига уровня
        const levelConfig = await this.levelManager.getLevelConfig();
        const portalSpawnRadius = levelConfig?.portalSpawnRadius ?? 576; // По умолчанию 576

        const centerX = MAP_CENTER_X; // Центр карты (и оракула)
        const centerY = MAP_CENTER_Y;

        // ✅ Размещаем порталы на окружности с шагом 120° (360° / 3 = 120°)
        const angleStep = (2 * Math.PI) / PORTALS_DATA.length; // 120° в радианах для 3 порталов

        for (let index = 0; index < PORTALS_DATA.length; index++) {
            const portalConfig = PORTALS_DATA[index];

            // ✅ Вычисляем позицию на окружности с шагом 120 градусов
            const angle = index * angleStep; // Угол в радианах (0°, 120°, 240°)

            // ✅ Используем spawnPortalMatrix для правильного выравнивания по сетке
            const posResult = this.spawnSystem.spawnPortalMatrix(
                centerX,
                centerY,
                portalSpawnRadius,
                angle
            );

            if (!posResult.success) {
                console.warn(`⚠️ MainScene.createPortalsFallback: Не удалось найти безопасную позицию для портала ${index + 1}. Пропускаем.`);
                continue;
            }

            const portal = new StandardPortal(
                this,
                portalConfig,
                posResult.x,
                posResult.y
            );

            this.portals.add(portal.getSprite());
            this.portalInstances.push(portal);
        }

        // ✅ Настраиваем обработчики кликов для порталов (переключение видимости бабблов)
        // ✅ Логика обработки кликов перенесена внутрь AbstractPortal
    }

    /**
     * Перемешать массив
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Создание фоновых спрайтов (трава)
     */
    private async createBackgroundSprites(mapWidth: number, mapHeight: number): Promise<void> {
        try {
            const bgConfig = await this.levelManager.getBackgroundSpriteConfig();
            const grassConfig = bgConfig?.grass;

            if (grassConfig) {
                // Используем count из конфига, если указан, иначе density
                const count = grassConfig.count;
                const density = grassConfig.density || 0.08;

                this.grassBackground = new GrassBackgroundSprite(this, density);
                this.grassBackground.spawnOnMap(mapWidth, mapHeight, count);
            } else {
                // Fallback: используем значения по умолчанию
                this.grassBackground = new GrassBackgroundSprite(this, 0.08);
                this.grassBackground.spawnOnMap(mapWidth, mapHeight);
            }
        } catch (error) {
            console.error('❌ Error creating background sprites:', error);
            // Fallback: создаем с дефолтными значениями
            this.grassBackground = new GrassBackgroundSprite(this, 0.08);
            this.grassBackground.spawnOnMap(mapWidth, mapHeight);
        }
    }

    /**
     * Создание объектов коллизии (кусты)
     */
    public async createCollisionObjects(): Promise<void> {
        try {
            const collisionConfig = await this.levelManager.getCollisionObjectConfig();
            const bushConfig = collisionConfig?.bush;

            logger.log('COLLISION', `MainScene.createCollisionObjects(): config=${JSON.stringify(collisionConfig)}, bushCount=${bushConfig?.count}`);

            if (bushConfig && bushConfig.count !== undefined && bushConfig.count > 0) {
                const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
                const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

                // ✅ Передаем настройку отладки из конфига уровня (если задана)
                this.bushCollisionObjects = new BushCollisionObject(this, bushConfig.showCollisionDebug);
                this.bushCollisionObjects.spawnOnMap(
                    mapWidthScaled,
                    mapHeightScaled,
                    bushConfig.count,
                    this.spawnSystem
                );
                logger.log('COLLISION', 'MainScene.createCollisionObjects(): BushCollisionObject created and spawned');
            } else {
                logger.log('COLLISION', 'MainScene.createCollisionObjects(): Bush config not found or count is 0, skipping');
            }
        } catch (error) {
            console.error('❌ Error creating collision objects:', error);
        }
    }

    /**
     * Создание игрока
     * ✅ Использует матричную систему для размещения
     */
    public createPlayer(): void {
        // ✅ Получаем позицию оракула (уже создан в createOracle)
        const oracleX = this.oracle ? this.oracle.getSprite().x : MAP_CENTER_X;
        const oracleY = this.oracle ? this.oracle.getSprite().y : MAP_CENTER_Y;

        // ✅ Используем матричную систему для спавна персонажа под оракулом
        const playerPos = this.spawnSystem.spawnPlayerMatrix(oracleX, oracleY);

        this.player = new Player(
            this,
            playerPos.x,
            playerPos.y,
            'character_walk_sheet' // ✅ Используем спрайтшит вместо сгенерированной текстуры
        );

        // Создание отображения здоровья над игроком
        const finalPlayerPos = this.player.getPosition();
        this.healthSystem.createPlayerHealthDisplay(finalPlayerPos.x, finalPlayerPos.y);

        // ✅ Позиция уже занята в матрице через spawnPlayerMatrix()
    }

    /**
     * Настройка границ камеры и физики
     * Границы камеры и физики строго ограничены 2048×2048 (игровой мир)
     * Расширенный фон заполняет экран за пределами игрового мира, но игрок не может выйти за пределы 2048×2048
     */
    /**
     * @deprecated Use CameraManager.setupBounds() instead
     */
    private setupCameraBounds(): void {
        // Delegate to CameraManager (handled internally)
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;
        this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
        this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    }

    /**
     * @deprecated Use CameraManager.calculateZoom() instead
     */
    private calculateCameraZoom(): number {
        // Delegate to CameraManager (handled internally)
        const playerScale = BASE_SCALE * ACTOR_SIZES.PLAYER;
        const playerHeightInVirtual = PLAYER_FRAME_HEIGHT * playerScale;
        const desiredPlayerHeight = BASE_GAME_HEIGHT * PLAYER_HEIGHT_PERCENT;
        return desiredPlayerHeight / playerHeightInVirtual;
    }

    /**
     * @deprecated Use CameraManager.setupFollow() instead
     */
    private setupCameraFollow(): void {
        if (this.cameraManager) {
            this.cameraManager.setupFollow();
        }
    }





    /**
     * @deprecated Handle by CameraManager automatically
     */
    private handleResize(gameSize: Phaser.Structs.Size): void {
        // CameraManager now handles resize internally via its own handler
        logger.log('SCENE_CAMERA', 'MainScene.handleResize called - this should be handled by CameraManager');
    }

    /**
     * Настройка коллизий
     */
    private async setupCollisions(): Promise<void> {
        // Создаем группу для объектов коллизии (кусты)
        // Примечание: Tiled Map коллизии (StaticGroup) обрабатываются отдельно через прямые коллайдеры
        const collisionObjectsGroup = this.physics.add.group();

        // ✅ Логируем информацию о Tiled Map коллизиях (если есть)
        if (this.tiledMapCollisionBodies) {
            const tiledCollisions = this.tiledMapCollisionBodies.getChildren();
            logger.log('COLLISION', `MainScene.setupCollisions(): Found ${tiledCollisions.length} Tiled Map collision bodies (will be handled separately)`);
        }

        // Проверяем, должны ли быть кусты в конфиге
        const collisionConfig = await this.levelManager.getCollisionObjectConfig();
        const bushConfig = collisionConfig?.bush;
        const stoneConfig = collisionConfig?.stone;
        const shouldHaveBushes = bushConfig && bushConfig.count !== undefined && bushConfig.count > 0;
        const shouldHaveStones = stoneConfig && stoneConfig.count !== undefined && stoneConfig.count > 0;

        // Обработка кустов
        if (this.bushCollisionObjects) {
            const bushSprites = this.bushCollisionObjects.getSprites();
            logger.log('COLLISION', `MainScene.setupCollisions(): Found ${bushSprites.length} bush sprites`);
            bushSprites.forEach((sprite, index) => {
                if (sprite && sprite.active) {
                    collisionObjectsGroup.add(sprite);
                    logger.log('COLLISION', `MainScene.setupCollisions(): Added bush ${index + 1} to collision group: x=${sprite.x.toFixed(0)}, y=${sprite.y.toFixed(0)}, visible=${sprite.visible}, body=${sprite.body ? 'exists' : 'missing'}`);
                } else {
                    console.warn(`⚠️ MainScene.setupCollisions(): Bush sprite ${index + 1} is not active or missing`);
                }
            });
        } else if (shouldHaveBushes) {
            // Предупреждаем только если кусты должны быть, но не созданы
            logger.log('COLLISION', `MainScene.setupCollisions(): bushCollisionObjects is not initialized, but bushes are expected (count: ${bushConfig?.count})`);
        } else {
            // Кусты не нужны (count = 0 или не указан) - это нормально
            logger.log('COLLISION', `MainScene.setupCollisions(): No bushes needed (count: ${bushConfig?.count ?? 'not specified'})`);
        }

        // Обработка камней
        if (this.stoneCollisionObjects) {
            const stoneSprites = this.stoneCollisionObjects.getSprites();
            logger.log('COLLISION', `MainScene.setupCollisions(): Found ${stoneSprites.length} stone sprites`);
            stoneSprites.forEach((sprite, index) => {
                if (sprite && sprite.active) {
                    collisionObjectsGroup.add(sprite);
                    logger.log('COLLISION', `MainScene.setupCollisions(): Added stone ${index + 1} to collision group: x=${sprite.x.toFixed(0)}, y=${sprite.y.toFixed(0)}, visible=${sprite.visible}, body=${sprite.body ? 'exists' : 'missing'}`);
                } else {
                    console.warn(`⚠️ MainScene.setupCollisions(): Stone sprite ${index + 1} is not active or missing`);
                }
            });
        } else if (shouldHaveStones) {
            // Предупреждаем только если камни должны быть, но не созданы
            logger.log('COLLISION', `MainScene.setupCollisions(): stoneCollisionObjects is not initialized, but stones are expected (count: ${stoneConfig?.count})`);
        } else {
            // Камни не нужны (count = 0 или не указан) - это нормально
            logger.log('COLLISION', `MainScene.setupCollisions(): No stones needed (count: ${stoneConfig?.count ?? 'not specified'})`);
        }

        logger.log('COLLISION', `MainScene.setupCollisions(): Collision group size: ${collisionObjectsGroup.getChildren().length}`);

        this.collisionSystem = new CollisionSystem(
            this,
            this.player,
            this.enemies,
            this.chasers,
            this.hearts,
            this.keys,
            this.portals,
            this.oracle.getSprite(), // ✅ Передаем спрайт через метод getSprite()
            collisionObjectsGroup, // ✅ Группа объектов коллизии (кусты)
            (await this.levelManager.getLevelConfig())?.useTiledMap ?? false, // ✅ Флаг кастомных коллизий
            this.coins // ⚠️ НОВОЕ: Pass coins group for collision handling
        );

        // ✅ Дополнительные коллайдеры для врагов с Tiled Map коллизиями
        // (StaticGroup нельзя добавить в обычную Group, поэтому добавляем коллайдеры отдельно)
        if (this.tiledMapCollisionBodies) {
            // ✅ Коллайдер игрока с коллизиями из Tiled Map (важно для фикса прохождения сквозь стены)
            this.physics.add.collider(this.player.getSprite(), this.tiledMapCollisionBodies);

            // ✅ Tiled Map: Overlap Mask (быстрое детектирование входа в портал)
            if (this.tiledOverlapBodies) {
                logger.log('COLLISION', 'MainScene: Setting up Tiled Map Overlap Mask collider');
                this.physics.add.overlap(
                    this.player.getSprite(),
                    this.tiledOverlapBodies,
                    this.handlePortalOverlapByMask,
                    undefined,
                    this
                );
            }

            // Коллайдеры врагов с коллизиями из Tiled Map
            this.physics.add.collider(
                this.enemies,
                this.tiledMapCollisionBodies,
                undefined,
                undefined,
                this
            );

            this.physics.add.collider(
                this.chasers,
                this.tiledMapCollisionBodies,
                undefined,
                undefined,
                this
            );

            logger.log('COLLISION', `MainScene.setupCollisions(): Added colliders for player and enemies with Tiled Map collision bodies`);
        }

        // Обработчики коллизий
        this.collisionSystem.setOnPlayerEnemyCollision((enemy: AbstractEnemy) => {
            this.enemyCollisionHandler.handle(enemy);
        });

        this.collisionSystem.setOnPlayerHeartCollision((heart) => {
            this.itemCollisionHandler.handleHeart(heart);
        });

        this.collisionSystem.setOnPlayerKeyCollision((key) => {
            this.itemCollisionHandler.handleKey(key);
        });

        // ✅ Добавляем обработчик коллизии с монетками
        this.collisionSystem.setOnPlayerCoinCollision((coin) => {
            this.itemCollisionHandler.handleKey(coin); // handleKey обрабатывает обе фазы (COIN и KEY)
        });

        // ✅ Добавляем обработчик коллизии с оракулом
        this.collisionSystem.setOnPlayerOracleCollision(() => {
            this.oracleCollisionHandler.handle();
        });

        this.collisionSystem.setOnPlayerPortalCollision((portal: AbstractPortal) => {
            this.portalCollisionHandler.handleSolidCollision(portal);
        });

        this.collisionSystem.setOnPlayerPortalOverlap((portal: AbstractPortal) => {
            // 🔍 DEBUG: Log portal state on overlap
            logger.log('PORTAL', `MainScene: Portal overlap detected! Portal ${portal.getConfig().id}, state: ${portal.getState()}, isActivating: ${portal.isActivating()}`);

            // ✅ Если портал в процессе активации, пытаемся вставить ключ
            const now = this.time.now;
            // Debounce for overlap interactions to prevent multi-frame key loss
            if (portal.isActivating() && now - this.lastDepositTime > 500) {
                if (this.gameState.getKeys() > 0) {
                    logger.log('PORTAL', `MainScene: Depositing key into portal ${portal.getConfig().id}`);
                    // Update lastDepositTime BEFORE removing to align with logic
                    this.lastDepositTime = now;

                    // ✅ Try to deposit key first
                    if (portal.depositKey()) {
                        // Only remove key if deposit was successful
                        const success = this.gameState.removeKey();
                        if (success) {
                            this.updateHUD(); // Обновляем UI
                            this.player.applyKey(); // Анимация игрока
                            // Если это был последний ключ для этого портала, он сам перейдет в состояние ACTIVATED
                        }
                    } else {
                        logger.log('PORTAL', 'MainScene: Portal rejected key (busy or full)');
                    }
                } else {
                    // Можно показать хинт "Need more keys"
                    logger.log('PORTAL', 'MainScene: Portal needs key, but player has none');
                }
            } else {
                // Иначе обрабатываем вход (если открыт)
                this.portalCollisionHandler.handleOverlapEntry(portal);
            }
        });

        // ✅ CRITICAL: Mark CollisionSystem as ready after all callbacks are set
        // This prevents collisions from being processed before callbacks are initialized
        this.collisionSystem.setReady();
    }

    /**
     * Спавн начальных объектов
     * ✅ ИЗМЕНЕНО: Теперь спавнит только врагов
     * Предметы (сердечки и ключи) спавнятся в createGameWorld() после порталов
     * Враги спавнятся последними и могут спавниться поверх предметов
     */
    private async spawnInitialObjects(): Promise<void> {
        // 6. Враги (спавнятся последними, им разрешено спавниться поверх сердечек и ключей)
        // ✅ Delegated to EnemySpawner - Step 5
        await this.enemySpawner.spawnInitialEnemies();
    }



    /**
     * Настройка периодических событий
     */
    private async setupPeriodicEvents(): Promise<void> {
        // ✅ Delegated to EnemySpawner - Step 5
        await this.enemySpawner.setupPeriodicEvents();
    }

    // ✅ Step 8: Handler properties now managed by EventBusManager
    // Legacy handlers removed - all event handling now goes through EventBusManager

    /**
     * ✅ Step 8: EventBus subscriptions are now managed by EventBusManager
     */
    private setupEventBus(): void {
        this.eventBusManager.setupEventBus();
    }

    update(time: number, delta: number) {
        // ✅ КРИТИЧЕСКИ ВАЖНО: Предотвращаем обновление до завершения инициализации
        if (!this.isReady) {
            return;
        }

        // ✅ ВАЖНО: Проверяем, что все необходимые объекты инициализированы
        // Это предотвращает ошибки при рестарте игры
        if (!this.player || !this.player.getSprite() || !this.player.getSprite().active) {
            return;
        }

        // Если физика на паузе (модальное окно открыто), не обновляем игрока
        // Но продолжаем обновление для UI элементов
        const isPhysicsPaused = this.physics.world.isPaused;

        if (this.scene.isPaused()) {
            return;
        }

        const playerPos = this.player.getPosition();
        const cam = this.cameras.main;

        // ✅ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ КАМЕРЫ (если startFollow не работает)
        // Проверяем, следует ли камера автоматически
        if (cam && (!(cam as any)._follow || !(cam as any)._follow.active)) {
            // Если автоматическое следование не работает, делаем ручное центрирование
            cam.centerOn(playerPos.x, playerPos.y);
        }

        // ✅ Обновляем игрока
        if (!isPhysicsPaused) {
            this.player.update();
        }

        // ✅ Обновление позиции здоровья над игроком (проверяем существование)
        if (this.healthSystem) {
            this.healthSystem.updatePlayerHealthPosition(playerPos.x, playerPos.y);
        }

        // Обновление отладочного UI (проверка внутри функции)
        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            this.debugOverlay.update();
        }

        // ✅ Глобальный вопрос привязан к мировым координатам, не нужно обновлять позицию

        // Проверка выхода из портала (проверяем существование portals)
        if (this.portals && this.portals.getChildren) {
            this.portals.getChildren().forEach((portalSprite: any) => {
                const portal = portalSprite.getData('portal') as AbstractPortal;
                if (portal && portal.mustExit()) {
                    const dist = Phaser.Math.Distance.Between(
                        playerPos.x,
                        playerPos.y,
                        portalSprite.x,
                        portalSprite.y
                    );
                    if (dist > 80) {
                        portal.resetMustExit();
                        // ✅ Включаем overlap коллайдер обратно, когда игрок вышел из зоны портала
                        // Это позволяет снова открыть модальное окно, если игрок вернется к порталу
                        this.collisionSystem.enablePortalOverlap();
                        logger.log('PORTAL', 'MainScene: Player exited portal zone, mustExit reset, overlap re-enabled');
                    }
                }
            });
        }

        // ✅ Обновление колец ключей (теперь в классе Player)
        if (this.player && this.healthSystem) {
            const keyCount = this.gameState.getKeys();
            const playerPos = this.player.getPosition();
            const heartPositions = this.healthSystem.getHeartPositions(playerPos.x, playerPos.y);
            const goldHeartTexture = this.healthSystem.getGoldHeartTextureKey();
            const heartScale = 4.0; // Совпадает с HealthSystem.getHeartScale()

            this.player.updateKeyRings(keyCount, heartPositions, goldHeartTexture, heartScale);
        }

        // ✅ Обновление AI врагов (проверяем существование массива)
        // ✅ Обновление AI врагов и контроль лимита - Step 5
        // Delegated to EnemyManager
        if (this.enemyManager) {
            this.enemyManager.update(time, delta, this.player.getSprite());
        }

        // ✅ Централизованная синхронизация всех анимаций physics спрайтов
        // Вынесено в AnimationSyncManager - см. src/game/scenes/animation/
        // Ключи, Порталы, Оракул, Игрок, Враги - ~640 строк заменено на 1 вызов
        this.animationSyncManager.update(delta);

        // ⚠️ НОВОЕ: Distance-based item interaction checking
        // Проверка расстояния до айтемов (coins, keys, hearts) вместо overlap collision
        if (this.collisionSystem) {
            this.collisionSystem.update();
        }
    }

    // --- Collision Handlers ---
    // ✅ All collision logic delegated to specific handlers in ./collision/ folder
    // EnemyCollisionHandler, ItemCollisionHandler, OracleCollisionHandler, PortalCollisionHandler


    private handleQuizCompleted(data: { correct: boolean, context: string }): void {
        const { correct, context } = data;

        // ✅ Логика порталов теперь обрабатывается в handlePortalEntry
        // Оставляем только логику для ключей (если нужно)
        if (context === 'key') {
            // Логика ключей обрабатывается в handleRuneQuizCorrect/Wrong
            return;
        }

        // Если пришло событие для портала (старый код), игнорируем
        // так как теперь используется PortalModal
        this.resumeGame();
    }

    // --- Helper Methods ---

    private resumeGame(): void {
        try {
            // ✅ Reset Quiz Active state
            this.gameState.setQuizActive(false);

            // ✅ Выходим из состояний IN_QUIZ или IN_PORTAL, если в них находимся
            const currentState = this.player.getState();
            if (currentState === PlayerState.IN_QUIZ) {
                this.player.exitQuiz();
            } else if (currentState === PlayerState.IN_PORTAL) {
                this.player.exitPortal();
            }

            // ✅ Останавливаем игрока перед возобновлением игры
            this.player.stop();

            // ✅ Сбрасываем состояние клавиатуры, чтобы предотвратить продолжение движения
            if (this.input.keyboard) {
                this.input.keyboard.resetKeys();
            }

            // ✅ ВАЖНО: Включаем input перед возобновлением
            this.input.enabled = true;
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
            }

            // Возобновляем физику
            if (this.physics.world.isPaused) {
                this.physics.resume();
            }

            // ✅ Clear currentKeyId if set
            if (this.currentKeyId) {
                this.collisionSystem?.clearProcessingKey(this.currentKeyId);
                this.currentKeyId = null;
            }

            // ✅ Clear currentCoinId if set
            if (this.currentCoinId) {
                this.collisionSystem?.clearProcessingKey(this.currentCoinId);
                this.currentCoinId = null;
            }

            // Возобновляем сцену если она была на паузе
            if (this.scene && this.scene.isPaused()) {
                this.scene.resume();
            }
        } catch (e) {
            logger.log('FLOW', `Error resuming scene: ${e}`);
        }
    }

    /**
     * @deprecated Use EffectsManager.flashSprite() instead
     */
    private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number = 0xffffff, duration: number = 1000, onComplete?: () => void): void {
        if (this.effectsManager) {
            this.effectsManager.flashSprite(sprite, color, duration, onComplete);
        }
    }

    /**
     * @deprecated Use EffectsManager.flashPlayerLoseKey() instead
     */
    private flashPlayerLoseKey(): void {
        if (this.effectsManager) {
            this.effectsManager.flashPlayerLoseKey();
        }
    }

    /**
     * @deprecated Use EffectsManager.flashPlayerGetKey() instead
     */
    private flashPlayerGetKey(): void {
        if (this.effectsManager) {
            this.effectsManager.flashPlayerGetKey();
        }
    }

    private triggerRingLossEffect(): void {
        const keyCount = this.gameState.getKeys();
        const radius = 25 + (keyCount + 1) * 8;
        const ring = this.add.graphics();
        ring.lineStyle(4, 0x38a169, 1);
        ring.strokeCircle(0, 0, radius);
        const playerPos = this.player.getPosition();
        ring.setPosition(playerPos.x, playerPos.y);
        this.tweens.add({
            targets: ring,
            alpha: 0,
            scale: 1.2,
            duration: 500,
            onUpdate: () => {
                const pos = this.player.getPosition();
                ring.setPosition(pos.x, pos.y);
            },
            onComplete: () => {
                ring.destroy();
            }
        });
    }

    /**
     * @deprecated Use EffectsManager.showFloatingText() instead
     */
    private showFloatingText(worldX: number, worldY: number, message: string, color: number): void {
        if (this.effectsManager) {
            this.effectsManager.showFloatingText(worldX, worldY, message, color);
        }
    }

    // ✅ Метод calculateBubbleY удален - теперь позиционирование баббла выполняется внутри класса Oracle

    private async showGlobalQuestion(): Promise<void> {
        // ✅ Очищаем предыдущий вопрос (старая реализация)
        if (this.globalQuestionText) {
            this.globalQuestionText.destroy();
            this.globalQuestionText = null;
        }
        if (this.globalQuestionImage) {
            this.globalQuestionImage.destroy();
            this.globalQuestionImage = null;
        }

        try {
            const currentLevel = this.levelManager.getCurrentLevel();

            // ✅ ИСПОЛЬЗУЕМ СОХРАНЕННЫЙ ВОПРОС (тот же, что и для порталов)
            if (!this.currentGlobalQuestionData) {
                this.currentGlobalQuestionData = await this.quizManager.getRandomGlobalQuestion(currentLevel);
            }

            const questionData = this.currentGlobalQuestionData;

            if (!questionData) {
                throw new Error('Question data is null');
            }

            // ✅ AB ТЕСТИРОВАНИЕ: Используем QuestionBubble если флаг включен
            if (USE_QUESTION_BUBBLE) {
                // ✅ Используем баббл из класса Oracle (позиционируется относительно реальных координат спрайта)
                await this.oracle.setQuestion(questionData, this.assetLoader);
            } else {
                // ✅ СТАРАЯ РЕАЛИЗАЦИЯ: Используем текст и изображение

                // ✅ Получаем реальные координаты Oracle из спрайта
                const oracleSprite = this.oracle.getSprite();
                const oracleX = oracleSprite.x;
                const oracleY = oracleSprite.y;

                // ✅ ОТОБРАЖЕНИЕ ИЗОБРАЖЕНИЯ (если есть)
                if (questionData.image) {
                    try {
                        // ✅ Загружаем изображение динамически из JSON
                        // Используем имя файла как ключ (без расширения)
                        // ✅ УБИРАЕМ ВСЕ ПРЕФИКСЫ - используем только имя из JSON
                        let imageKey = questionData.image.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
                        // Убираем возможный префикс "QuizGame_" если он есть
                        imageKey = imageKey.replace(/^QuizGame_/, '');

                        // ✅ Загружаем изображение через AssetLoader
                        // Используем оригинальное имя из JSON для пути, но без префикса QuizGame_ для ключа
                        let imagePath = questionData.image;
                        // Убираем префикс QuizGame_ из пути, если он есть
                        imagePath = imagePath.replace(/^QuizGame_/, '');

                        await this.assetLoader.loadImage(imageKey, imagePath);

                        // Проверяем, что текстура загружена
                        if (!this.textures.exists(imageKey)) {
                            throw new Error(`Image texture not found after loading: ${imageKey}`);
                        }

                        // Создаем спрайт изображения
                        // ✅ Привязка к мировым координатам оракула
                        const imageY = oracleY - 280; // Выше оракула
                        this.globalQuestionImage = this.add.image(oracleX, imageY, imageKey);
                        this.globalQuestionImage.setOrigin(0.5);
                        this.globalQuestionImage.setDepth(DEPTHS.SCREEN.GLOBAL_QUESTION);

                        // ✅ Масштабируем изображение, если оно слишком большое
                        const maxWidth = 300;
                        const maxHeight = 200;
                        if (this.globalQuestionImage.width > maxWidth || this.globalQuestionImage.height > maxHeight) {
                            const scaleX = maxWidth / this.globalQuestionImage.width;
                            const scaleY = maxHeight / this.globalQuestionImage.height;
                            const scale = Math.min(scaleX, scaleY);
                            this.globalQuestionImage.setScale(scale);
                        }
                    } catch (imageError) {
                        console.error('Failed to load question image:', questionData.image, imageError);
                    }
                }

                // ✅ ТЕКСТ ВОПРОСА - работает в виртуальном разрешении 720×1280
                // Позиционируем относительно оракула в мировых координатах
                // ✅ Используем утилиту для расчета позиции (правило: нижняя граница баббла совпадает с верхней границей Оракула)
                const { calculateBubbleY } = require('../utils/BubblePositionCalculator');
                const questionY = calculateBubbleY(oracleY, 'oracle', 'oracle');

                this.globalQuestionText = this.add.text(oracleX, questionY, questionData.questionText, {
                    fontSize: `${GLOBAL_QUESTION_FONT_SIZE}px`, // ✅ Используем константу
                    fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
                    fontStyle: GLOBAL_QUESTION_FONT_STYLE, // ✅ Используем константу
                    color: FLOATING_TEXT_COLOR, // ✅ Используем константу (базовый цвет, меняется динамически)
                    stroke: '#000000',
                    strokeThickness: 4,
                    backgroundColor: GLOBAL_QUESTION_BACKGROUND_COLOR, // ✅ Используем константу
                    padding: { x: 15, y: 10 },
                    align: 'center',
                    wordWrap: { width: 500 } // ✅ Ширина в виртуальном разрешении
                }).setOrigin(0.5).setDepth(DEPTHS.SCREEN.GLOBAL_QUESTION).setVisible(true);
            }

        } catch (error) {
            console.error('Failed to load global question:', error);
            // Fallback
            this.showFallbackGlobalQuestion();
        }
    }

    private showFallbackGlobalQuestion(): void {
        // Очищаем изображение, если было
        if (this.globalQuestionImage) {
            this.globalQuestionImage.destroy();
            this.globalQuestionImage = null;
        }

        // Случайный fallback вопрос
        const fallbackQuestions = [
            'What is the capital of France?',
            'What is 5 × 5?',
            'What is the chemical formula for water?',
            'What is the largest planet in our solar system?'
        ];

        const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

        // ✅ AB ТЕСТИРОВАНИЕ: Используем QuestionBubble если флаг включен
        if (USE_QUESTION_BUBBLE) {
            // Создаем ParsedQuestion для fallback
            const fallbackQuestionData: ParsedQuestion = {
                type: QuestionType.TEXT_ONLY,
                questionText: randomQuestion,
                image: undefined,
                correctAnswer: 'Paris', // Базовый ответ для fallback
                wrongAnswers: ['London', 'Berlin'],
                allAnswers: ['Paris', 'London', 'Berlin'].sort(() => Math.random() - 0.5),
                feedbacks: ['Correct!'],
                wrongFeedbacks: ['Try again!']
            };

            // ✅ Используем баббл из класса Oracle (позиционируется относительно реальных координат спрайта)
            this.safeSetOracleQuestion(fallbackQuestionData);
        } else {
            // ✅ СТАРАЯ РЕАЛИЗАЦИЯ: Используем текст
            // ✅ Получаем реальные координаты Oracle из спрайта
            const oracleSprite = this.oracle.getSprite();
            const oracleX = oracleSprite.x;
            const oracleY = oracleSprite.y;

            // ✅ Используем утилиту для расчета позиции
            const { calculateBubbleY } = require('../utils/BubblePositionCalculator');
            const questionY = calculateBubbleY(oracleY, 'oracle', 'oracle');

            // ✅ Fallback вопрос - работает в виртуальном разрешении 720×1280
            this.globalQuestionText = this.add.text(oracleX, questionY, randomQuestion, {
                fontSize: `${GLOBAL_QUESTION_FONT_SIZE}px`, // ✅ Используем константу
                fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
                fontStyle: GLOBAL_QUESTION_FONT_STYLE, // ✅ Используем константу
                color: GLOBAL_QUESTION_COLOR, // ✅ Используем константу
                stroke: '#000000',
                strokeThickness: 4,
                backgroundColor: GLOBAL_QUESTION_BACKGROUND_COLOR, // ✅ Используем константу
                padding: { x: 15, y: 10 },
                align: 'center',
                wordWrap: { width: 500 } // ✅ Ширина в виртуальном разрешении
            }).setOrigin(0.5).setDepth(DEPTHS.SCREEN.GLOBAL_QUESTION); // ✅ Fallback текст глобального вопроса - на уровне текстов
        }
    }

    /**
     * Настройка обработчика кликов по Оракулу для переключения видимости баббла
     */
    private setupOracleClickHandler(): void {
        if (!this.oracle || !USE_QUESTION_BUBBLE) {
            return;
        }

        const oracleSprite = this.oracle.getSprite();

        // Проверяем, не установлен ли уже обработчик
        if (oracleSprite.input) {
            return;
        }

        // Делаем спрайт Оракула интерактивным
        oracleSprite.setInteractive({ useHandCursor: true });

        // Обработчик клика
        oracleSprite.on('pointerdown', () => {
            // ✅ Используем метод Oracle для переключения видимости баббла
            this.oracle.toggleQuestionBubble();
        });
    }

    /**
     * Настройка обработчиков кликов по порталам для переключения видимости бабблов
     */
    private setupPortalClickHandlers(): void {
        if (!this.portalInstances || this.portalInstances.length === 0 || !USE_QUESTION_BUBBLE) {
            return;
        }

        this.portalInstances.forEach((portal, index) => {
            // ✅ Проверяем, что портал существует и не уничтожен
            if (!portal) {
                console.warn(`⚠️ Portal ${index + 1} is null or undefined, skipping click handler setup`);
                return;
            }

            let portalSprite;
            try {
                portalSprite = portal.getSprite();
            } catch (e) {
                console.warn(`⚠️ Error getting portal ${index + 1} sprite:`, e);
                return;
            }

            // ✅ Проверяем, что спрайт существует и активен
            if (!portalSprite || !portalSprite.active || !portalSprite.scene) {
                console.warn(`⚠️ Portal ${index + 1} sprite is not active or destroyed, skipping click handler setup`);
                return;
            }

            // Проверяем, не установлен ли уже обработчик
            if (portalSprite.input) {
                logger.log('PORTAL', `Portal ${index + 1} click handler already set up`);
                return;
            }

            try {
                // Делаем спрайт портала интерактивным
                portalSprite.setInteractive({ useHandCursor: true });

                // Обработчик клика
                portalSprite.on('pointerdown', () => {
                    // ✅ Блокируем взаимодействие, если Оракул еще не активирован
                    if (this.oracle && !this.oracle.isActivated()) {
                        logger.log('PORTAL', `Portal ${index + 1} clicked, but Oracle is not activated yet. Ignoring.`);
                        return;
                    }

                    logger.log('PORTAL', `Portal ${index + 1} clicked, toggling bubble visibility`);
                    // ✅ Используем метод AbstractPortal для переключения видимости баббла
                    portal.toggleAnswerBubble();
                });

                logger.log('PORTAL', `Portal ${index + 1} click handler set up`);

                // ✅ REMOVED: disableInteractive() logic here. 
                // It conflicted with AbstractPortal's setActivatedState() and prevented bubbles from showing.
                // AbstractPortal handles its own interaction state.
            } catch (e) {
                console.error(`❌ Error setting up portal ${index + 1} click handler:`, e);
            }
        });
    }

    /**
     * @deprecated Use HUDManager.create() instead
     */
    private createHUD(): void {
        if (this.hudManager) {
            this.hudManager.create();
        }
    }

    /**
     * @deprecated Use HUDManager.getZoomCompensatedHUDPosition() or EffectsManager callback instead
     */
    private getZoomCompensatedHUDPosition(targetScreenX: number, targetScreenY: number): { x: number; y: number } {
        const cam = this.cameras.main;
        const zoom = cam.zoom;
        const centerX = cam.width / 2;
        const centerY = cam.height / 2;
        return {
            x: centerX + (targetScreenX - centerX) / zoom,
            y: centerY + (targetScreenY - centerY) / zoom
        };
    }

    /**
     * @deprecated Use HUDManager.update() instead
     */
    private updateHUD(): void {
        if (this.hudManager) {
            this.hudManager.update();
        }
    }

    /**
     * ✅ Step 8: Delegate to GameOverHandler
     */
    private handleGameOver(result: 'win' | 'lose'): void {
        this.gameOverHandler.handleGameOver(result);
    }

    /**
     * ✅ Step 8: Delegate to GameOverHandler
     */
    private restartGame(): void {
        this.gameOverHandler.restartGame();
    }

    /**
     * ✅ Step 8: Restart scene WITHOUT resetting level (for next level transition)
     */
    private restartScene(): void {
        this.gameOverHandler.restartScene();
    }

    /**
     * ✅ Step 8: Delegate to LevelTransitionHandler
     */
    private async handleNextLevel(): Promise<void> {
        await this.levelTransitionHandler.handleNextLevel();
    }

    /**
     * ✅ Step 8: Delegate to GameOverHandler
     */
    private handleGameWin(score: number, feedbackText: string): void {
        this.gameOverHandler.handleGameWin(score, feedbackText);
    }

    /**
     * ✅ Step 8: Delegate to GameOverHandler
     */
    private handleFullGameRestart(): void {
        this.gameOverHandler.handleFullGameRestart();
    }

    /**
     * Safe wrapper for showGlobalQuestion with error handling
     */
    private async safeShowGlobalQuestion(): Promise<void> {
        try {
            if (!this.isSceneAndObjectActive()) {
                console.warn('⚠️ MainScene: Scene not active, skipping showGlobalQuestion');
                return;
            }
            await this.showGlobalQuestion();
        } catch (error) {
            console.error('❌ MainScene: Error in showGlobalQuestion:', error);
        }
    }

    /**
     * Safe wrapper for setting oracle question with error handling
     */
    private async safeSetOracleQuestion(questionData: ParsedQuestion): Promise<void> {
        try {
            if (!this.isSceneAndObjectActive()) {
                console.warn('⚠️ MainScene: Scene not active, skipping setOracleQuestion');
                return;
            }
            if (!this.oracle || !this.oracle.getSprite()?.active) {
                console.warn('⚠️ MainScene: Oracle not available, skipping setQuestion');
                return;
            }
            await this.oracle.setQuestion(questionData, this.assetLoader);
        } catch (error) {
            console.error('❌ MainScene: Failed to set oracle question:', error);
        }
    }

    /**
     * Check if scene and object are safe to operate on
     */
    protected isSceneAndObjectActive(obj?: { active?: boolean }): boolean {
        return !!(
            this.scene?.isActive() &&
            this.sys?.settings?.active &&
            (obj === undefined || obj.active !== false)
        );
    }

    public isPositionInOverlapMask(worldX: number, worldY: number): boolean {
        if (!this.currentOverlapData || !this.tiledMapInfo) return false;

        const originalX = worldX / BASE_SCALE;
        const originalY = worldY / BASE_SCALE;

        const col = Math.floor(originalX / this.tiledMapInfo.tileWidth);
        const row = Math.floor(originalY / this.tiledMapInfo.tileHeight);

        if (col < 0 || col >= this.tiledMapInfo.width || row < 0 || row >= this.tiledMapInfo.height) {
            return false;
        }

        const tileIndex = row * this.tiledMapInfo.width + col;
        const tileValue = this.currentOverlapData[tileIndex];

        return tileValue === TILEMAP_CONSTANTS.OVERLAP_TILE_GID;
    }

    // ================================================================
    // ✅ TEST: Text Blur Analysis - Safe Testing Methods
    // ================================================================
    // These methods create test text objects to diagnose blur issues
    // Call from browser console: window.__TEST_SCENE__?.testTextBlur()
    // Remove after testing is complete

    /**
     * Creates test text objects with different configurations to diagnose blur
     * Each line tests a different combination of settings
     * Based on analysis of HUDManager (sharp) vs Modal text (blurry)
     */
    public testTextBlur(): void {
        // Clear any existing test text first
        this.clearTestText();

        const cam = this.cameras.main;
        const zoom = cam.zoom;
        const invZoom = 1 / zoom;

        console.log('=== TEXT BLUR TEST ===');
        console.log(`Camera zoom: ${zoom.toFixed(3)}`);
        console.log(`Inverse zoom: ${invZoom.toFixed(3)}`);
        console.log(`Canvas size: ${cam.width} x ${cam.height}`);

        // Center of screen (in world coordinates with scrollFactor 0)
        const centerX = cam.width / 2;
        const startY = 100; // Start from top
        const lineHeight = 45; // Spacing between lines

        // ================================================
        // TEST 1: HUD-style text (SHARP - expected)
        // Fixed fontSize + setScale(invZoom) + no setResolution
        // ================================================
        const test1 = this.add.text(centerX, startY, 'TEST 1: Fixed 20px + setScale(invZoom) [SHARP - HUD style]', {
            fontSize: '20px',
            fontFamily: 'Nunito', // or DEFAULT_FONT_FAMILY
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        test1.setScale(invZoom); // ✅ KEY: Zoom compensation like HUD
        this.testTextObjects.push(test1);

        console.log('TEST 1: Fixed 20px, setScale(' + invZoom.toFixed(3) + ')');

        // ================================================
        // TEST 2: Modal-style text (BLURRY - expected)
        // Dynamic fontSize + no setScale + setResolution(1)
        // ================================================
        const fontSize2 = 25.5; // ✅ Fractional size (like FontSizeCalculator)
        const test2 = this.add.text(centerX, startY + lineHeight, 'TEST 2: Dynamic 25.5px + setResolution(1) [BLURRY - Modal style]', {
            fontSize: `${Math.round(fontSize2)}px`,
            fontFamily: 'monospace',
            color: '#ffaa00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        test2.setResolution(1); // ✅ KEY: setResolution like modals
        // ❌ NO setScale() - this is why it's blurry!
        this.testTextObjects.push(test2);

        console.log('TEST 2: Dynamic ' + fontSize2 + 'px, setResolution(1), NO setScale');

        // ================================================
        // TEST 3: Fixed size + NO scale + NO resolution (BASELINE)
        // ================================================
        const test3 = this.add.text(centerX, startY + lineHeight * 2, 'TEST 3: Fixed 24px + NO scale + NO resolution [BASELINE]', {
            fontSize: '24px',
            fontFamily: 'sans-serif',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        // ❌ NO setScale, NO setResolution
        this.testTextObjects.push(test3);

        console.log('TEST 3: Fixed 24px, NO scale, NO resolution');

        // ================================================
        // TEST 4: Dynamic size + setScale(invZoom) + setResolution(1)
        // Tests if adding setScale to modal-style text fixes blur
        // ================================================
        const fontSize4 = 28;
        const test4 = this.add.text(centerX, startY + lineHeight * 3, 'TEST 4: Dynamic 28px + setScale(invZoom) + setResolution(1) [POTENTIAL FIX]', {
            fontSize: `${fontSize4}px`,
            fontFamily: 'monospace',
            color: '#ff6600',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        test4.setScale(invZoom); // ✅ Added setScale!
        test4.setResolution(1);
        this.testTextObjects.push(test4);

        console.log('TEST 4: Dynamic ' + fontSize4 + 'px, setScale(' + invZoom.toFixed(3) + '), setResolution(1)');

        // ================================================
        // TEST 5: Fractional size test (25.5px rounded)
        // ================================================
        const fontSize5 = 25.5;
        const test5 = this.add.text(centerX, startY + lineHeight * 4, 'TEST 5: Fractional 25.5px -> rounded ' + Math.round(fontSize5) + 'px + setScale(invZoom)', {
            fontSize: `${Math.round(fontSize5)}px`,
            fontFamily: 'sans-serif',
            color: '#ff44ff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        test5.setScale(invZoom);
        this.testTextObjects.push(test5);

        console.log('TEST 5: Fractional ' + fontSize5 + 'px -> ' + Math.round(fontSize5) + 'px, setScale(' + invZoom.toFixed(3) + ')');

        // ================================================
        // TEST 6: Show current zoom value
        // ================================================
        const test6 = this.add.text(centerX, startY + lineHeight * 5, `Camera zoom: ${zoom.toFixed(3)}x | Inverse: ${invZoom.toFixed(3)}`, {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#ffff00',
            backgroundColor: '#000033',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTHS.SCREEN.MODAL_CLOSE);

        test6.setScale(invZoom);
        this.testTextObjects.push(test6);

        console.log('=== TEST TEXT CREATED ===');
        console.log('To clear: window.__TEST_SCENE__?.clearTestText()');
        console.log('=====================================');

        // Make this method globally accessible via window
        if (typeof window !== 'undefined') {
            (window as any).__TEST_SCENE__ = this;
            console.log('✅ Test scene available as window.__TEST_SCENE__');
        }
    }

    /**
     * Clears all test text objects created by testTextBlur()
     */
    public clearTestText(): void {
        this.testTextObjects.forEach(text => {
            if (text && text.active) {
                text.destroy();
            }
        });
        this.testTextObjects = [];
        console.log('✅ Test text cleared');
    }

    /**
     * Calculates total max score for all levels in background
     * Helps reduce TBT during scene initialization
     */
    private async calculateTotalMaxScoreInBackground(): Promise<void> {
        // Yield to let the frame render
        await new Promise(resolve => setTimeout(resolve, 100));

        logger.log('SCENE_SYSTEMS', 'Starting background total score calculation...');
        let totalMax = 0;
        try {
            // Get MAX_LEVELS from constants if possible, or assume it's imported
            // We use the imported MAX_LEVELS
            for (let i = 1; i <= MAX_LEVELS; i++) {
                try {
                    const levelConfig = await this.levelManager.loadLevelConfig(i);
                    const initialKeys = levelConfig.itemSpawn?.keys?.initial || 0;
                    const initialCoins = levelConfig.itemSpawn?.coins?.initial || 0;  // ✅ НОВОЕ
                    const levelMax = await this.quizManager.calculateMaxPossibleScore(i, initialKeys, initialCoins);
                    totalMax += levelMax;

                    // Yield every loop to keep UI responsive
                    await new Promise(resolve => setTimeout(resolve, 5));
                } catch (e) {
                    logger.warn('SCENE_SYSTEMS', `Background score calc failed for level ${i}: ${e}`);
                }
            }

            if (this.scoreSystem) {
                this.scoreSystem.setTotalMaxPossibleScore(totalMax);
                logger.log('SCENE_SYSTEMS', `Background total score calculation completed: ${totalMax}`);
            }
        } catch (error) {
            logger.error('SCENE_SYSTEMS', `Background total score calculation failed: ${error}`);
        }
    }
}


