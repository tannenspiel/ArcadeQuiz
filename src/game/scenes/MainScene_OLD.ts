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
    MAX_LEVELS
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
import { SPRITESHEET_CONFIGS } from '../../config/spritesheetConfigs';
// DEBUG_CONFIG больше не используется - настройки отладки берутся из конфига уровня
import { EVENTS } from '../../constants/gameConstants';
import { UIManager } from '../ui/UIManager';
// Modals imports removed as they are now handled by UIManager
import { WorldGenerator } from '../systems/WorldGenerator';
import { GameOverType } from '../ui/GameOverModal'; // Keep enum for type checking if needed
import { DebugOverlay } from '../ui/DebugOverlay';
import { QuestionData, QuestionType, ParsedQuestion } from '../../types/questionTypes';
import { logger } from '../../utils/Logger';
// ✅ calculateBubbleY больше не импортируется - используется внутри класса Oracle

// ✅ Интерфейс для конфигурации порталов из Tiled Map
interface TiledPortalConfig {
    id: number;
    x: number;
    y: number;
    overrideCollision: boolean;
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
    public portals!: Phaser.Physics.Arcade.Group;


    // Background Sprites
    private grassBackground!: GrassBackgroundSprite;

    // Расширенный фон для заполнения экрана
    private mapBackgroundTileSprite: Phaser.GameObjects.TileSprite | null = null;

    // Collision Objects
    private bushCollisionObjects?: BushCollisionObject;
    public tiledMapCollisionBodies?: Phaser.Physics.Arcade.StaticGroup; // ✅ Коллизии из Tiled Map

    // Single Objects
    public oracle!: Oracle;
    public oracleLabel!: Phaser.GameObjects.Text;
    private globalQuestionText!: Phaser.GameObjects.Text | null;
    private globalQuestionImage!: Phaser.GameObjects.Image | null;
    public currentGlobalQuestionData: ParsedQuestion | null = null; // ✅ Сохраняем выбранный глобальный вопрос (портал)
    private currentMiniQuizData: ParsedQuestion | null = null;    // ✅ Сохраняем текущий мини-вопрос (ключ)
    // ✅ Баббл вопроса теперь хранится в классе Oracle

    // ✅ Конфигурация порталов, загруженная из Tiled Map
    public tiledPortalsConfig: TiledPortalConfig[] = [];

    // ✅ Данные маски оверлапа для проверки в реальном времени (CollisionSystem)
    public currentOverlapData: number[] | null = null;
    public tiledMapInfo?: { width: number; height: number; tileWidth: number; tileHeight: number };

    // HUD Elements (Phaser UI)
    private keysHUDText!: Phaser.GameObjects.Text;
    private scoreHUDText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    // Debug UI
    private debugOverlay!: DebugOverlay;

    // Systems
    private healthSystem!: HealthSystem;
    private scoreSystem!: ScoreSystem;
    public quizManager!: QuizManager;
    public levelManager!: LevelManager; // Инициализируется в BaseScene, но используем public для генератора
    private audioManager!: AudioManager;
    public spawnSystem!: SpawnSystem;
    public collisionSystem!: CollisionSystem;
    public worldGenerator!: WorldGenerator;
    private uiManager!: UIManager;

    // UI
    // Modals are now handled by UIManager
    private currentKeySprite: Phaser.Physics.Arcade.Sprite | null = null;
    private currentKeyId: string | null = null; // Track processing keyId for cleanup
    private remainingModalPropertiesRemoved: boolean = true; // Placeholder to ensure replacement works

    // Game State (используем gameState из BaseScene)
    // ✅ MAX_KEYS теперь конфигурируется через levelConfig и хранится в gameState
    // private readonly MAX_KEYS: number = 3;

    // Flash intervals tracking (для предотвращения множественных одновременных миганий)
    private playerFlashLoseKeyInterval: Phaser.Time.TimerEvent | null = null;
    private playerFlashGetKeyInterval: Phaser.Time.TimerEvent | null = null;

    // ✅ Отслеживание отвеченных уникальных вопросов на уровне
    private answeredQuestions: Set<string> = new Set();
    private playerFlashGetKeyPositionTimer: Phaser.Time.TimerEvent | null = null;
    private playerFlashGetKeySprites: Phaser.GameObjects.Sprite[] = [];

    // Oracle State
    private isOracleActivated: boolean = false;

    // Interaction Cooldowns
    private lastDepositTime: number = 0;
    private lastFullWarningTime: number = 0;
    private lastEnemyCollisionTime: number = 0; // ✅ Cooldown для столкновений с врагами
    private readonly ENEMY_COLLISION_COOLDOWN: number = 500; // 500ms между столкновениями

    // Track which portal is currently being interacted with for entry
    private pendingPortal: AbstractPortal | null = null;


    // ✅ Защита от немедленного повторного открытия модального окна после CANCEL
    private portalModalCooldown: number = 0;
    private readonly PORTAL_MODAL_COOLDOWN_MS: number = 500; // 500ms задержка после закрытия модального окна


    // ✅ Пул для floating text (оптимизация памяти)
    private floatingTextPool: Phaser.GameObjects.Text[] = [];

    constructor() {
        super('MainScene');
    }

    async create() {
        console.log('🔄 MainScene: create() called - starting scene initialization');

        try {
            // Инициализация базовых систем (из BaseScene)
            console.log('🔄 MainScene: Calling initBaseSystems()');
            this.initBaseSystems();
            console.log('✅ MainScene: initBaseSystems() completed');

            console.log('🔄 MainScene: Calling setupPhysics()');
            this.setupPhysics();
            console.log('✅ MainScene: setupPhysics() completed');

            console.log('🔄 MainScene: Calling setupCamera()');
            this.setupCamera();
            console.log('✅ MainScene: setupCamera() completed');
        } catch (error) {
            console.error('❌ MainScene: Error in create() initialization:', error);
            throw error;
        }

        console.log('✅ MainScene: Try-catch block completed, continuing...');

        // ✅ ВАЖНО: Включаем input в начале create() для правильной работы после рестарта
        console.log('🔄 MainScene: Enabling input');
        this.input.enabled = true;
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
            this.input.keyboard.resetKeys();
        }

        // ✅ PERSISTENCE: Восстанавливаем текущий уровень из Registry ДО инициализации систем
        // Это гарантирует, что QuizManager и другие системы загрузят данные для правильного уровня
        const savedLevel = this.registry.get('currentLevel') || 1;
        console.log(`🔄 MainScene: Restoring level from registry: ${savedLevel}`);
        this.levelManager.setCurrentLevel(savedLevel);

        // Инициализация игровых систем
        console.log('🔄 MainScene: Calling initializeSystems()');
        await this.initializeSystems();

        // ✅ PERSISTENCE: Восстанавливаем очки из Registry
        // Если это первый уровень (или сброс), очки могут быть 0
        const savedScore = this.registry.get('score') || 0;
        console.log(`🔄 MainScene: Restoring score from registry: ${savedScore}`);
        if (this.scoreSystem) {
            this.scoreSystem.setScore(savedScore);
        }

        console.log('✅ MainScene: initializeSystems() completed');

        // Сохраняем начальные размеры окна
        this.lastWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
        this.lastWindowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

        // Создаем основной игровой мир
        console.log('🔄 MainScene: Calling createGameWorld()');
        await this.createGameWorld();
        console.log('✅ MainScene: createGameWorld() completed');

        // Добавляем слушатели событий
        this.setupEventListeners();

        // Настройка коллизий
        console.log('🔄 MainScene: Calling setupCollisions()');
        await this.setupCollisions();
        console.log('✅ MainScene: setupCollisions() completed');

        // Спавн объектов
        console.log('🔄 MainScene: Calling spawnInitialObjects()');
        await this.spawnInitialObjects();
        console.log('✅ MainScene: spawnInitialObjects() completed');

        // Настройка камеры - ПОСЛЕ создания игрока!
        this.setupCameraFollow();

        // Настройка периодических событий
        this.setupPeriodicEvents();

        // Настройка EventBus
        this.setupEventBus();

        // ✅ Создание UI сразу после настройки камеры
        // Камера уже настроена в setupCameraFollow(), поэтому UI можно создавать сразу
        // setScrollFactor(0) работает в координатах камеры, которые уже готовы
        // Создание отладочного UI
        console.log('🔍 MainScene.create(): DEBUG_UI_ENABLED =', DEBUG_UI_ENABLED);
        if (DEBUG_UI_ENABLED) {
            console.log('✅ MainScene.create(): Creating debug UI...');
            this.debugOverlay = new DebugOverlay(this, {
                getPlayer: () => this.player,
                getGameState: () => this.gameState,
                getSpawnSystem: () => this.spawnSystem,
                getEnemyInstances: () => this.enemyInstances,
                getMaxKeys: () => this.gameState.getState().maxKeys,
                getHeartsGroup: () => this.hearts,
                getKeysGroup: () => this.keys,
                getScore: () => this.scoreSystem ? this.scoreSystem.getScore() : 0,
                getMaxPossibleScore: () => this.scoreSystem ? this.scoreSystem.getMaxPossibleScore() : 0,
                getTotalMaxPossibleScore: () => this.scoreSystem ? this.scoreSystem.getTotalMaxPossibleScore() : 0
            });
            this.debugOverlay.create(); // Создает только debugText
            console.log('✅ MainScene.create(): Debug UI created');
        } else {
            console.warn('⚠️ MainScene.create(): DEBUG_UI_ENABLED is false, skipping debug UI creation');
        }

        // ✅ Создаем сетку матрицы спавна после создания всех объектов и debugOverlay
        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            this.debugOverlay.createSpawnMatrixGrid();
            console.log('✅ MainScene.create(): Spawn matrix grid created');
        }

        // Создание HUD (Phaser UI)
        if (DEBUG_UI_ENABLED) {
            this.createHUD();
        }

        console.log('✅ MainScene: create() completed, input enabled:', this.input.enabled, 'keyboard enabled:', this.input.keyboard?.enabled);

        // ✅ ТЕСТ: Запускаем анимацию через 1 секунду после создания
        this.time.delayedCall(1000, () => {
            console.log('🧪 TEST: Forcing animations...');

            // Тест игрока
            const playerSprite = this.player.getSprite();
            console.log('🧪 Player anims exists:', this.anims.exists('boy_down'));
            if (this.anims.exists('boy_down')) {
                playerSprite.anims.play('boy_down', true);
                console.log('🧪 Forced boy_down');
            }

            // Тест врага
            if (this.enemyInstances && this.enemyInstances.length > 0) {
                const enemySprite = this.enemyInstances[0].getSprite();
                console.log('🧪 Enemy anims exists:', this.anims.exists('beast_down'));
                if (this.anims.exists('beast_down')) {
                    enemySprite.anims.play('beast_down', true);
                    console.log('🧪 Forced beast_down');
                }
            }
        });

        // ✅ ТЕСТ: Проверяем через 4 секунды
        this.time.delayedCall(4000, () => {
            const playerSprite = this.player.getSprite();
            const currentAnim = playerSprite.anims.currentAnim;
            console.log('🧪 FINAL STATE - PLAYER:');
            console.log('- Current anim key:', currentAnim?.key);
            console.log('- Is playing:', playerSprite.anims.isPlaying);
            console.log('- Current frame name:', playerSprite.frame?.name);
            const playerFrame = playerSprite.frame as unknown as FrameObject;
            if (playerFrame && hasFrameIndex(playerFrame)) {
                console.log('- Current frame index:', playerFrame.index ?? playerFrame.frame?.index);
            } else {
                console.log('- Current frame index:', undefined);
            }
            console.log('- Current anim frame index:', playerSprite.anims.currentFrame?.index);
            console.log('- Animation frameRate:', currentAnim?.frameRate);
            console.log('- Animation repeat:', currentAnim?.repeat);
            console.log('- Animation total frames:', currentAnim?.frames?.length);
            if (currentAnim?.frames) {
                const framesDetail = currentAnim.frames.map((f: Phaser.Animations.AnimationFrame, idx: number) => {
                    const frameObj: FrameObject = f.frame || f;
                    let spritesheetIndex: number | string = 'unknown';

                    if (hasFrameIndex(frameObj)) {
                        spritesheetIndex = frameObj.index ?? frameObj.frame?.index ?? 0;
                    } else if (hasFrameName(frameObj)) {
                        const name = frameObj.name ?? frameObj.frame?.name;
                        spritesheetIndex = name ?? 'unknown';
                    } else if (typeof frameObj === 'number') {
                        spritesheetIndex = frameObj;
                    }

                    const frameName = hasFrameName(frameObj)
                        ? (frameObj.name ?? frameObj.frame?.name ?? String(spritesheetIndex))
                        : String(spritesheetIndex);

                    return {
                        animIndex: idx,
                        spritesheetIndex: spritesheetIndex,
                        frameName: frameName,
                        isCurrent: idx === playerSprite.anims.currentFrame?.index
                    };
                });
                console.log('- Animation frames:', JSON.stringify(framesDetail, null, 2));
            }

            if (this.enemyInstances && this.enemyInstances.length > 0) {
                const enemySprite = this.enemyInstances[0].getSprite();
                const enemyAnim = enemySprite.anims.currentAnim;
                console.log('🧪 FINAL STATE - ENEMY:');
                console.log('- Current anim key:', enemyAnim?.key);
                console.log('- Is playing:', enemySprite.anims.isPlaying);
                console.log('- Current frame name:', enemySprite.frame?.name);
                const enemyFrame = enemySprite.frame as unknown as FrameObject;
                if (enemyFrame && hasFrameIndex(enemyFrame)) {
                    console.log('- Current frame index:', enemyFrame.index ?? enemyFrame.frame?.index);
                } else {
                    console.log('- Current frame index:', undefined);
                }
                console.log('- Current anim frame index:', enemySprite.anims.currentFrame?.index);
                console.log('- Animation frameRate:', enemyAnim?.frameRate);
                console.log('- Animation repeat:', enemyAnim?.repeat);
                console.log('- Animation total frames:', enemyAnim?.frames?.length);
                if (enemyAnim?.frames) {
                    const framesDetail = enemyAnim.frames.map((f: Phaser.Animations.AnimationFrame, idx: number) => {
                        const frameObj: FrameObject = f.frame || f;
                        let spritesheetIndex: number | string = 'unknown';

                        if (hasFrameIndex(frameObj)) {
                            spritesheetIndex = frameObj.index ?? frameObj.frame?.index ?? 0;
                        } else if (hasFrameName(frameObj)) {
                            const name = frameObj.name ?? frameObj.frame?.name;
                            spritesheetIndex = name ?? 'unknown';
                        } else if (typeof frameObj === 'number') {
                            spritesheetIndex = frameObj;
                        }

                        const frameName = hasFrameName(frameObj)
                            ? (frameObj.name ?? frameObj.frame?.name ?? String(spritesheetIndex))
                            : String(spritesheetIndex);

                        return {
                            animIndex: idx,
                            spritesheetIndex: spritesheetIndex,
                            frameName: frameName,
                            isCurrent: idx === enemySprite.anims.currentFrame?.index
                        };
                    });
                    console.log('- Animation frames:', JSON.stringify(framesDetail, null, 2));
                }
            }
        });
    }

    /**
     * Инициализация всех систем
     */
    private async initializeSystems(): Promise<void> {
        console.log('🔄 initializeSystems: Starting...');

        // ✅ Загружаем спрайтшит для визуализации ключей у персонажа (78x26, 3 кадра по 26x26)
        // Делаем это здесь, так как assetLoader уже инициализирован в initBaseSystems()
        await this.assetLoader.loadSpritesheet(
            'Character.KeyHold_78x26.png',
            'Character.KeyHold_78x26.png',
            { frameWidth: 26, frameHeight: 26 }
        );

        // HealthSystem
        console.log('🔄 initializeSystems: Creating HealthSystem');
        this.healthSystem = new HealthSystem(this, this.assetLoader);
        await this.healthSystem.initialize();
        this.healthSystem.setMaxHealth(MAX_HEALTH);
        this.healthSystem.setHealth(MAX_HEALTH);
        console.log('✅ initializeSystems: HealthSystem initialized');

        // ScoreSystem
        console.log('🔄 initializeSystems: Creating ScoreSystem');
        this.scoreSystem = new ScoreSystem({
            uniqueKeyPoints: 3,
            repeatKeyPoints: 1,
            portalPoints: 10
        });
        console.log('✅ initializeSystems: ScoreSystem created');

        // QuizManager
        console.log('🔄 initializeSystems: Creating QuizManager');
        this.quizManager = new QuizManager(this.assetLoader);
        // Сохраняем QuizManager в data сцены для доступа из UI компонентов
        this.data.set('quizManager', this.quizManager);
        // Сохраняем текущий уровень в data сцены (будет обновляться при изменении уровня)
        const currentLevel = this.levelManager.getCurrentLevel();
        this.data.set('currentLevel', currentLevel);

        // ✅ Загружаем вопросы для текущего уровня ДО создания объектов, которые их используют
        console.log('🔄 initializeSystems: Loading level questions for level', currentLevel);
        try {
            await this.quizManager.loadLevelQuestions(currentLevel);
            console.log('✅ initializeSystems: Level questions loaded');

            // ✅ РАССЧИТЫВАЕМ МАКСИМАЛЬНЫЙ БАЛЛ ДЛЯ ТЕКУЩЕГО УРОВНЯ
            const fullConfig = await this.levelManager.getCurrentLevelConfig();
            const initialKeys = fullConfig.itemSpawn?.keys?.initial || 0;
            const maxScore = await this.quizManager.calculateMaxPossibleScore(currentLevel, initialKeys);
            this.scoreSystem.setMaxPossibleScore(maxScore);
            console.log(`✅ initializeSystems: Max possible score for level ${currentLevel} is ${maxScore}`);

            // ✅ РАССЧИТЫВАЕМ МАКСИМАЛЬНЫЙ БАЛЛ ДЛЯ ВСЕЙ ИГРЫ (ОДИН РАЗ)
            let totalMax = 0;
            for (let i = 1; i <= MAX_LEVELS; i++) {
                try {
                    // ✅ Загружаем конфиг уровня, чтобы знать количество ключей
                    const levelConfig = await this.levelManager.loadLevelConfig(i);
                    const initialKeys = levelConfig.itemSpawn?.keys?.initial || 0;

                    // ✅ Используем единый метод расчета (уже включает загрузку вопросов)
                    const levelMax = await this.quizManager.calculateMaxPossibleScore(i, initialKeys);
                    totalMax += levelMax;
                    console.log(`- Level ${i} max: ${levelMax}`);
                } catch (e) {
                    console.warn(`Could not load data for level ${i} to calculate total max score`);
                }
            }
            this.scoreSystem.setTotalMaxPossibleScore(totalMax);
            console.log(`✅ initializeSystems: Total max possible score for game is ${totalMax}`);

        } catch (error) {
            console.warn('⚠️ initializeSystems: Failed to load level questions, will use fallback:', error);
            // Не критично, бабблы будут использовать fallback текст
        }

        console.log('✅ initializeSystems: QuizManager created');

        // AudioManager
        console.log('🔄 initializeSystems: Creating AudioManager');
        this.audioManager = new AudioManager(this, this.assetLoader);
        // Сохраняем AudioManager в data сцены для доступа из UI компонентов
        this.data.set('audioManager', this.audioManager);
        console.log('✅ initializeSystems: AudioManager created');

        // Загружаем все звуки
        console.log('🔄 initializeSystems: Loading all sounds');
        await this.audioManager.loadAllSounds();
        console.log('✅ initializeSystems: All sounds loaded');

        // Запускаем фоновую музыку
        console.log('🔄 initializeSystems: Playing background music');
        await this.audioManager.playBackgroundMusic();
        console.log('✅ initializeSystems: Background music started');

        // SpawnSystem
        console.log('🔄 initializeSystems: Creating SpawnSystem');
        this.spawnSystem = new SpawnSystem(this, this.levelManager, this.quizManager);
        console.log('✅ initializeSystems: SpawnSystem created');

        // WorldGenerator
        console.log('🔄 initializeSystems: Creating WorldGenerator');
        this.worldGenerator = new WorldGenerator(this);
        console.log('✅ initializeSystems: WorldGenerator created');

        // UIManager
        console.log('🔄 initializeSystems: Creating UIManager');
        this.uiManager = new UIManager(this, EventBus);
        console.log('✅ initializeSystems: UIManager created');

        // ✅ Инициализируем настройки уровня (Max Keys)
        const levelConfig = await this.levelManager.getLevelConfig();
        if (typeof levelConfig !== 'undefined' && levelConfig.maxInventoryKeys !== undefined) {
            this.gameState.setMaxKeys(levelConfig.maxInventoryKeys);
            console.log(`✅ MainScene: Set maxInventoryKeys from config to ${levelConfig.maxInventoryKeys}`);
        } else {
            this.gameState.setMaxKeys(3); // Fallback
            console.log(`✅ MainScene: Set maxInventoryKeys to default (3)`);
        }

        // ✅ Регистрируем callback для создания клонов врагов
        this.data.set('createEnemyClone', this.createEnemyClone.bind(this));
        console.log('✅ initializeSystems: Enemy clone callback registered');

        // AnimationManager - создаем анимации из загруженных спрайтшитов
        console.log('🔄 initializeSystems: Creating animations');
        const animationManager = new AnimationManager(this);

        // Логируем все доступные текстуры
        console.log('🔵 Available textures:', Object.keys(this.textures.list));

        SPRITESHEET_CONFIGS.forEach((config) => {
            // Проверяем, что спрайтшит загружен
            const exists = this.textures.exists(config.load.key);
            const isOracle = config.load.key.includes('oracle');
            const logPrefix = isOracle ? '🔴 ORACLE' : '🔵';

            console.log(`${logPrefix} Checking spritesheet "${config.load.key}": ${exists ? '✅ exists' : '❌ not found'}`);

            if (exists) {
                // ✅ Проверяем, не созданы ли уже все анимации для этого спрайтшита
                const allAnimationsExist = config.animations.every(animConfig =>
                    this.anims.exists(animConfig.key)
                );

                if (allAnimationsExist) {
                    console.log(`${logPrefix} All animations for "${config.load.key}" already exist, skipping creation`);
                    // ✅ Только логируем существующие анимации
                    config.animations.forEach(animConfig => {
                        const animExists = this.anims.exists(animConfig.key);
                        const animLogPrefix = isOracle ? '🔴 ORACLE' : '🔵';
                        console.log(`  ${animLogPrefix} ${animExists ? '✅' : '❌'} Animation "${animConfig.key}": ${animExists ? 'exists' : 'MISSING'}`);

                        // Для оракула выводим дополнительную информацию
                        if (isOracle && animExists) {
                            const animInstance = this.anims.get(animConfig.key);
                            console.log(`  ${animLogPrefix} Animation "${animConfig.key}" details:`, {
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
                    console.log(`${logPrefix} Some animations missing for "${config.load.key}", creating...`);
                    animationManager.createAnimations(config.load.key, config.animations);

                    // ✅ УПРОЩЕННАЯ ПРОВЕРКА: только логируем созданные анимации
                    config.animations.forEach(animConfig => {
                        const animExists = this.anims.exists(animConfig.key);
                        const animLogPrefix = isOracle ? '🔴 ORACLE' : '🔵';
                        console.log(`  ${animLogPrefix} ${animExists ? '✅' : '❌'} Animation "${animConfig.key}": ${animExists ? 'created' : 'FAILED'}`);

                        // Для оракула выводим дополнительную информацию
                        if (isOracle && animExists) {
                            const animInstance = this.anims.get(animConfig.key);
                            console.log(`  ${animLogPrefix} Animation "${animConfig.key}" details:`, {
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
        console.log(`✅ Animation creation summary: ${createdAnimations.length}/${allAnimations.length} animations created`);

        // ✅ ДИАГНОСТИКА: Выводим все созданные анимации
        const knownAnimKeys = [
            'beast_down', 'beast_up', 'beast_left', 'beast_right',
            'dragon_down', 'dragon_up', 'dragon_left', 'dragon_right',
            'flam_down', 'flam_up', 'flam_left', 'flam_right',
            'boy_down', 'boy_up', 'boy_left', 'boy_right',
            'key_idle', 'boy_jump_win', 'character_lose_key', 'character_get_key', 'character_apply_key', 'enemy_death'
        ];
        const existingAnims = knownAnimKeys.filter(key => this.anims.exists(key));
        console.log('🎬 ALL CREATED ANIMATIONS:', existingAnims);

        // ✅ ДИАГНОСТИКА: Проверяем спрайтшиты
        console.log('🖼️ ALL LOADED TEXTURES:', Object.keys(this.textures.list));

        console.log('✅ initializeSystems: All systems initialized');
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
    private setupEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Слушаем ресайз окна
        window.addEventListener('resize', this.handleWindowResize.bind(this));

        // ✅ Слушаем поворот экрана - закрывает все модальные окна
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

        // Слушаем ресайз от Phaser
        this.scale.on('resize', this.handlePhaserResize, this);
    }

    /**
     * Обработчик поворота экрана — закрывает все модальные окна
     */
    private handleOrientationChange(): void {
        console.log('📱 MainScene: Orientation change detected');

        // Модальные окна управляются UIManager
        this.resumeGame();

        // Обновляем отладочный UI
        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            this.debugOverlay.update();
        }
    }

    /**
     * Обработчик ресайза окна браузера
     */
    private handleWindowResize(): void {
        // Дебаунс ресайза
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (typeof window !== 'undefined') {
                this.lastWindowWidth = window.innerWidth;
                this.lastWindowHeight = window.innerHeight;
            }

            // Пересоздаем расширенный фон при изменении размера
            this.createExtendedBackground();
        }, 250);
    }

    /**
     * Обработчик ресайза от Phaser
     */
    private handlePhaserResize(gameSize: Phaser.Structs.Size): void {
        if (typeof window === 'undefined') return;

        // Проверяем, если размеры сильно изменились
        const widthChanged = Math.abs(this.lastWindowWidth - window.innerWidth) > 50;
        const heightChanged = Math.abs(this.lastWindowHeight - window.innerHeight) > 50;

        if (widthChanged || heightChanged) {
            this.handleWindowResize();
        }
    }



    private async createGameWorld(): Promise<void> {
        // ✅ Очищаем занятые зоны перед созданием нового игрового мира
        this.spawnSystem.clearOccupiedZones();

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048 виртуальных пикселей
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048 виртуальных пикселей

        // Получаем конфиг уровня для проверки флага useTiledMap
        const levelConfig = await this.levelManager.getLevelConfig();
        const useTiledMap = levelConfig?.useTiledMap ?? false;
        const tiledMapKey = levelConfig?.tiledMapKey ?? 'level1_json';

        // Groups (создаем всегда, независимо от режима)
        this.enemies = this.physics.add.group();
        this.chasers = this.physics.add.group();
        this.hearts = this.physics.add.group();
        this.keys = this.physics.add.group();
        this.portals = this.physics.add.group();
        // ✅ Кольца ключей теперь создаются и управляются в классе Player

        // ✅ Инициализируем массив порталов (очищаем старые ссылки)
        this.portalInstances = [];

        // ✅ Очищаем ссылки на группы коллизий из предыдущих запусков (критично для рестарта)
        this.tiledMapCollisionBodies = undefined;
        this.bushCollisionObjects = undefined;

        // Физика строго ограничена 2048×2048. Игрок не выйдет за эти рамки.
        this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);

        if (useTiledMap) {
            // ✅ НОВАЯ ЛОГИКА: Tiled Map реализация
            await this.createGameWorldTiled(tiledMapKey, mapWidthScaled, mapHeightScaled);
        } else {
            // ✅ СТАРАЯ ЛОГИКА: Random Spawn реализация
            await this.createGameWorldRandom(mapWidthScaled, mapHeightScaled);
        }

        // ✅ Сетка создается в create() после создания debugOverlay
    }

    /**
     * Создание игрового мира с использованием Tiled Map
     */
    /**
     * Обработчик подтвержденного входа в портал (вызванный через событие)
     */
    private handlePortalEnterConfirmed(portal: AbstractPortal): void {
        console.log('✅ MainScene: handlePortalEnterConfirmed callback called');

        // ✅ Сохраняем ссылку на портал ПЕРЕД очисткой
        const portalUsed = portal || this.pendingPortal;

        // ✅ Логируем информацию о портале
        if (portalUsed) {
            console.log('🔵 MainScene: Portal info before entry:', {
                portalId: portalUsed.getConfig().id,
                isCorrect: portalUsed.getConfig().isCorrect,
                answerText: portalUsed.getConfig().answerText,
                state: portalUsed.getState()
            });
        } else {
            console.error('❌ MainScene: portalUsed is null in handlePortalEnterConfirmed callback!');
            return;
        }

        // ✅ Очищаем pendingPortal перед обработкой входа
        this.pendingPortal = null;

        // ✅ Устанавливаем mustExit на использованный портал, чтобы предотвратить повторное использование
        portalUsed.setMustExit();
        console.log('✅ MainScene: Set mustExit=true on used portal');

        // ✅ Обрабатываем вход в портал
        console.log('🔵 MainScene: Calling handlePortalEntry with portal:', portalUsed.getConfig().id);
        this.handlePortalEntry(portalUsed);
        console.log('🔵 MainScene: handlePortalEntry completed');

        // ✅ Включаем overlap коллайдер обратно после обработки входа
        this.collisionSystem.enablePortalOverlap();
        console.log('✅ MainScene: Portal overlap collider re-enabled after portal entry');
    }

    /**
     * ✅ НОВЫЙ МЕТОД: Обработчик отмены входа в портал
     * Вызывается, когда игрок нажимает "Отмена" или закрывает модальное окно
     */
    private handlePortalEnterCancelled(): void {
        console.log('✅ MainScene: Portal enter cancelled');

        // ✅ Очищаем pendingPortal
        this.pendingPortal = null;

        // ✅ Устанавливаем cooldown, чтобы предотвратить немедленное повторное открытие
        // пока игрок выходит из зоны
        this.portalModalCooldown = this.time.now + this.PORTAL_MODAL_COOLDOWN_MS;
        console.log('✅ MainScene: Portal cooldown set to:', this.portalModalCooldown);

        // ✅ Возобновляем игру
        this.resumeGame();

        // ✅ Включаем overlap коллайдер обратно
        this.collisionSystem.enablePortalOverlap();
        console.log('✅ MainScene: Game resumed and overlap re-enabled');
    }

    private async createGameWorldTiled(
        tiledMapKey: string,
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        console.log('🔄 MainScene: Delegating world generation to WorldGenerator');
        await this.worldGenerator.generate(tiledMapKey, mapWidthScaled, mapHeightScaled);
        console.log('✅ MainScene: World generation complete');
    }


    /**
     * Обработчик оверлапа с маской портала
     * Находит ближайший портал и вызывает логику входа
     */
    public handlePortalOverlapByMask(_playerSprite: any, tileBody: any): void {
        if (!this.player || !this.portalInstances.length) return;

        // Tile body - это прямоугольник зоны
        // const zone = tileBody as Phaser.GameObjects.Rectangle; // Use if needed

        // Используем центр зоны для поиска ближайшего портала
        // tileBody.body.center.x/y доступны для Physics Objects
        // Но tileBody переданный из overlap может быть GameObject или Body.
        // Безопаснее взять x/y объекта.
        const zoneX = tileBody.x;
        const zoneY = tileBody.y;

        let nearestPortal: AbstractPortal | null = null;
        let minDist = Infinity;

        for (const portal of this.portalInstances) {
            // Используем getX()/getY()
            const dist = Phaser.Math.Distance.Between(zoneX, zoneY, portal.getX(), portal.getY());

            // Находим ближайший портал
            if (dist < minDist) {
                minDist = dist;
                nearestPortal = portal;
            }
        }

        // Если нашли портал, вызываем стандартную логику входа
        // Важно: AbstractPortal сам проверяет mustExit и cooldown
        if (nearestPortal) {
            // Проверяем дистанцию (опционально, чтобы не срабатывало слишком далеко, хотя overlap точный)
            // ✅ Уменьшаем радиус срабатывания до 50 пикселей (ближе к центру), чтобы не срабатывало на краях маски
            if (minDist < 50) {
                this.handlePortalOverlapEntry(nearestPortal);
            }
        }
    }

    /**
     * Создание игрового мира с использованием Random Spawn (старая логика)
     */
    private async createGameWorldRandom(
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        // --- 1. РАСШИРЕННЫЙ ФОН (для заполнения экрана) ---
        // Создаем расширенный фон ПЕРЕД основной картой (depth -200)
        this.createExtendedBackground();

        // --- 2. ОСНОВНАЯ КАРТА (Визуальная часть) ---
        // Динамический выбор фона
        const currentLevel = this.levelManager.getCurrentLevel();
        const mapBgKey = `map_bg_standard_l${currentLevel}`;

        // Основная карта (Bg.Base.Standard.LevelX.512x512.png) - самый нижний слой
        const mapBackground = this.add.image(MAP_CENTER_X, MAP_CENTER_Y, mapBgKey);
        mapBackground.setScale(BASE_SCALE);
        mapBackground.setDepth(-200);

        // --- 2.1. ФОНОВЫЕ СПРАЙТЫ (Трава) ---
        // Трава (Bg.Grass.64x64.png) - выше основного фона, но ниже всех игровых объектов
        await this.createBackgroundSprites(mapWidthScaled, mapHeightScaled);

        // --- 2. ГРАНИЦЫ (Физическая часть) ---
        // Граница основной карты (для отладки, всегда видима)
        this.add.rectangle(MAP_CENTER_X, MAP_CENTER_Y, mapWidthScaled, mapHeightScaled)
            .setStrokeStyle(2, 0x666666, 0.3)
            .setDepth(1);

        // ✅ ПОРЯДОК СПАВНА (важно для безопасного размещения):
        // 1. Оракул (самый важный объект, должен быть в центре)
        this.createOracle();

        // 2. Персонаж (спавнится под оракулом)
        this.createPlayer();

        // 3. Порталы (должны спавниться до предметов и врагов, чтобы занять лучшие позиции)
        // Ждем завершения создания порталов перед спавном предметов
        await this.createPortals();

        // 3.1. Объекты коллизии (кусты) - спавнятся после порталов, чтобы учитывать их зоны
        await this.createCollisionObjects();

        // 4. Сердечки (спавнятся после порталов и объектов коллизии, но до врагов)
        const playerPos = this.player.getPosition();
        await this.spawnSystem.spawnItems(
            this.hearts,
            this.keys,
            playerPos.x,
            playerPos.y
        );
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

        // ✅ Титры оракула - работает в виртуальном разрешении 720×1280
        // Надпись Oracle ставим выше, чтобы она была над оракулом, а не поверх него
        this.oracleLabel = this.add.text(oracleX, oracleY - 150, 'ORACLE (0/3)', {
            fontSize: `${ORACLE_LABEL_FONT_SIZE}px`, // ✅ Используем константу
            fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
            fontStyle: ORACLE_LABEL_FONT_STYLE, // ✅ Используем константу
            color: ORACLE_LABEL_COLOR, // ✅ Используем константу
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

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
                console.log('✅ Global question selected:', this.currentGlobalQuestionData.questionText);
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
                console.log(`🗺️ MainScene.createPortals: Using Tiled Map config for ${this.tiledPortalsConfig.length} portals`);

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
                            console.log(`✅ MainScene: Expanded Portal ${config.id} body for interaction sensor`);
                        }

                        this.portals.add(portal.getSprite());
                        this.portalInstances.push(portal);
                        console.log(`✅ Portal ${config.id} created at [${config.x}, ${config.y}] (Override: ${config.overrideCollision})`);
                    } else {
                        console.warn(`⚠️ MainScene.createPortals: Portal ID ${config.id} out of range for answers (count: ${shuffledAnswers.length})`);
                    }
                });

            } else {
                // ✅ СТАРАЯ ЛОГИКА (FALLBACK): Круговой спавн для авто-режима или если нет Tiled объектов
                console.log('🔄 MainScene.createPortals: Using Circular Spawn (Automatic Mode)');

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
                        console.log(`🔵 Portal ${index + 1} spawn on circle:`, {
                            position: { x: posResult.x.toFixed(2), y: posResult.y.toFixed(2) },
                            angle: (angle * 180 / Math.PI).toFixed(1) + '°',
                            portalSpawnRadius
                        });
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

            console.log('✅ Portals created from global question:', shuffledAnswers);

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

            console.log('🔵 MainScene.createCollisionObjects():', {
                collisionConfig,
                bushConfig,
                hasCount: bushConfig?.count !== undefined,
                count: bushConfig?.count
            });

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
                console.log('✅ MainScene.createCollisionObjects(): BushCollisionObject created and spawned');
            } else {
                console.log('⚠️ MainScene.createCollisionObjects(): Bush config not found or count is 0, skipping');
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
    private setupCameraBounds(): void {
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;  // 2048
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048

        this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
        this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);

        console.log('✅ Camera bounds set:', {
            x: 0,
            y: 0,
            width: mapWidthScaled,
            height: mapHeightScaled
        });
    }

    /**
     * Расчет зума камеры на основе высоты игрока
     * Зум рассчитывается так, чтобы игрок всегда занимал определенный процент высоты экрана
     */
    private calculateCameraZoom(): number {
        // Высота игрока в виртуальных координатах (базовый размер кадра * масштаб)
        const playerScale = BASE_SCALE * ACTOR_SIZES.PLAYER;
        const playerHeightInVirtual = PLAYER_FRAME_HEIGHT * playerScale; // 16 * 4 = 64

        // Желаемая высота игрока на экране (в виртуальных координатах)
        const desiredPlayerHeight = BASE_GAME_HEIGHT * PLAYER_HEIGHT_PERCENT;

        // Зум = желаемая высота / текущая высота игрока
        // Если зум > 1, игрок будет меньше (камера отдалится)
        // Если зум < 1, игрок будет больше (камера приблизится)
        const zoom = desiredPlayerHeight / playerHeightInVirtual;

        return zoom;
    }

    /**
     * Настройка камеры
     */
    private setupCameraFollow(): void {
        const playerSprite = this.player.getSprite();

        if (!playerSprite?.active) {
            console.error('❌ Player not ready for camera!');
            return;
        }

        // Настраиваем границы камеры и физики
        this.setupCameraBounds();

        // Рассчитываем и применяем зум камеры
        // Зум обеспечивает, что игрок всегда занимает определенный процент высоты экрана
        const zoom = this.calculateCameraZoom();
        this.cameras.main.setZoom(zoom);

        // Обновляем HUD (с учетом нового зума)
        this.updateHUD();

        // Центрируем камеру на игроке (который находится в центре карты)
        // Это обеспечит, что центр карты будет в центре экрана
        this.cameras.main.centerOn(playerSprite.x, playerSprite.y);

        // Следование за игроком
        // Важно: камера будет следовать за игроком даже когда весь мир виден,
        // так как зум уменьшает видимую область и камера может двигаться
        this.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);
        this.cameras.main.setDeadzone(0, 0);
        this.cameras.main.roundPixels = true;

        // Слушаем изменение размеров
        this.scale.on('resize', this.handleResize, this);

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        console.log('✅ Camera follow enabled', {
            bounds: `${mapWidthScaled}x${MAP_HEIGHT * BASE_SCALE}`,
            zoom: zoom.toFixed(2),
            playerHeightPercent: `${(PLAYER_HEIGHT_PERCENT * 100).toFixed(1)}%`
        });
    }


    /**
     * Создает расширенный фон для заполнения экрана
     * Фон расширяется в 2 раза по ширине для покрытия широких экранов
     * Синхронизирован с камерой и основной картой
     */
    private createExtendedBackground(): void {
        // Удаляем старый, если есть
        if (this.mapBackgroundTileSprite) {
            this.mapBackgroundTileSprite.destroy();
            this.mapBackgroundTileSprite = null;
        }

        try {
            // Всегда создаём широкий фон (2× ширины карты для покрытия широких экранов)
            const extendedBaseWidth = MAP_WIDTH * 2; // 1024 базовых → 4096 виртуальных
            const extendedBaseHeight = MAP_HEIGHT;   // 512 базовых

            // Позиция — как у основной карты (центрированная)
            const backgroundX = MAP_CENTER_X; // 1024
            const backgroundY = MAP_CENTER_Y; // 1024

            // TileSprite создается с размерами в БАЗОВЫХ пикселях
            // setScale масштабирует САМ СПРАЙТ, setTileScale масштабирует ТАЙЛЫ текстуры
            // Решение: размер спрайта БАЗОВЫЙ, setTileScale(1, 1), setScale(BASE_SCALE, BASE_SCALE)
            this.mapBackgroundTileSprite = this.add.tileSprite(
                backgroundX,
                backgroundY,
                extendedBaseWidth,  // БАЗОВЫЕ пиксели - размер спрайта
                MAP_HEIGHT,  // БАЗОВЫЕ пиксели
                this.levelManager.getCurrentLevel() === 1 ? KEYS.MAP_BG_STANDARD_L1 : KEYS.MAP_BG_STANDARD_L2
            );

            // setTileScale(1, 1) - НЕ масштабируем тайлы отдельно
            // Тайлы остаются 512×512 базовых пикселей
            this.mapBackgroundTileSprite.setTileScale(1, 1);

            // setScale масштабирует САМ СПРАЙТ до виртуального размера
            // Тайлы также масштабируются вместе со спрайтом
            this.mapBackgroundTileSprite.setScale(BASE_SCALE, BASE_SCALE);

            // Origin (0.5, 0.5) — как у основной карты (центрированная)
            this.mapBackgroundTileSprite.setOrigin(0.5, 0.5);

            // Синхронизация тайлинга с основной картой
            // При origin (0.5, 0.5) и центрировании в (1024, 1024)
            // tilePosition должен быть установлен так, чтобы тайлинг совпадал с основной картой в точке (0, 0)
            const tilePositionX = 0;
            const tilePositionY = 0;
            this.mapBackgroundTileSprite.setTilePosition(tilePositionX, tilePositionY);

            // Убеждаемся, что спрайт виден и активен
            this.mapBackgroundTileSprite.setScrollFactor(1, 1); // Синхронно с камерой
            this.mapBackgroundTileSprite.setDepth(-200); // ✅ Расширенный фон - самый нижний слой (для широких экранов)
            this.mapBackgroundTileSprite.setVisible(true);
            this.mapBackgroundTileSprite.setActive(true);

            console.log('✅ Extended background created:', {
                width: extendedBaseWidth,
                height: extendedBaseHeight,
                virtualWidth: extendedBaseWidth * BASE_SCALE,
                virtualHeight: extendedBaseHeight * BASE_SCALE
            });
        } catch (error) {
            console.error('❌ Error creating extended background:', error);
            this.mapBackgroundTileSprite = null;
        }
    }


    /**
     * Обработчик изменения размера экрана
     * Пересоздает расширенный фон и обновляет границы камеры
     */
    private handleResize(gameSize: Phaser.Structs.Size): void {
        // Пересоздаем фон при изменении размера (Phaser не позволяет безопасно менять размер TileSprite)
        this.createExtendedBackground();

        // Обновляем границы камеры
        this.setupCameraBounds();

        // Пересчитываем и применяем зум камеры (на случай изменения виртуального разрешения)
        const zoom = this.calculateCameraZoom();
        this.cameras.main.setZoom(zoom);

        // Обновляем HUD (позиции и масштабы с учетом зума)
        this.updateHUD();

        console.log('✅ MainScene: Resize handled', {
            screenSize: `${gameSize.width}x${gameSize.height}`,
            virtualSize: `${gameSize.width}x${gameSize.height}`,
            zoom: zoom.toFixed(2)
        });
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
            console.log(`🗺️ MainScene.setupCollisions(): Found ${tiledCollisions.length} Tiled Map collision bodies (will be handled separately)`);
        }

        // Проверяем, должны ли быть кусты в конфиге
        const collisionConfig = await this.levelManager.getCollisionObjectConfig();
        const bushConfig = collisionConfig?.bush;
        const shouldHaveBushes = bushConfig && bushConfig.count !== undefined && bushConfig.count > 0;

        if (this.bushCollisionObjects) {
            const bushSprites = this.bushCollisionObjects.getSprites();
            console.log(`🌳 MainScene.setupCollisions(): Found ${bushSprites.length} bush sprites`);
            bushSprites.forEach((sprite, index) => {
                if (sprite && sprite.active) {
                    collisionObjectsGroup.add(sprite);
                    console.log(`🌳 MainScene.setupCollisions(): Added bush ${index + 1} to collision group: x=${sprite.x.toFixed(0)}, y=${sprite.y.toFixed(0)}, visible=${sprite.visible}, body=${sprite.body ? 'exists' : 'missing'}`);
                } else {
                    console.warn(`⚠️ MainScene.setupCollisions(): Bush sprite ${index + 1} is not active or missing`);
                }
            });
            console.log(`🌳 MainScene.setupCollisions(): Collision group size: ${collisionObjectsGroup.getChildren().length}`);
        } else if (shouldHaveBushes) {
            // Предупреждаем только если кусты должны быть, но не созданы
            console.warn(`⚠️ MainScene.setupCollisions(): bushCollisionObjects is not initialized, but bushes are expected (count: ${bushConfig?.count})`);
        } else {
            // Кусты не нужны (count = 0 или не указан) - это нормально
            console.log(`ℹ️ MainScene.setupCollisions(): No bushes needed (count: ${bushConfig?.count ?? 'not specified'})`);
        }

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
            (await this.levelManager.getLevelConfig())?.useTiledMap ?? false // ✅ Флаг кастомных коллизий
        );

        // ✅ Дополнительные коллайдеры для врагов с Tiled Map коллизиями
        // (StaticGroup нельзя добавить в обычную Group, поэтому добавляем коллайдеры отдельно)
        if (this.tiledMapCollisionBodies) {
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

            console.log(`✅ MainScene.setupCollisions(): Added colliders for enemies with Tiled Map collision bodies`);
        }

        // Обработчики коллизий
        this.collisionSystem.setOnPlayerEnemyCollision((enemy: AbstractEnemy) => {
            this.handlePlayerEnemyCollision(enemy);
        });

        this.collisionSystem.setOnPlayerHeartCollision((heart) => {
            this.handlePlayerHeartCollision(heart);
        });

        this.collisionSystem.setOnPlayerKeyCollision((key) => {
            this.handlePlayerKeyCollision(key);
        });

        // ✅ Добавляем обработчик коллизии с оракулом
        this.collisionSystem.setOnPlayerOracleCollision(() => {
            this.handlePlayerOracleCollision();
        });

        this.collisionSystem.setOnPlayerPortalCollision((portal: AbstractPortal) => {
            this.handlePortalSolidCollision(portal);
        });

        this.collisionSystem.setOnPlayerPortalOverlap((portal: AbstractPortal) => {
            // ✅ Если портал в процессе активации, пытаемся вставить ключ
            const now = this.time.now;
            // Debounce for overlap interactions to prevent multi-frame key loss
            if (portal.isActivating() && now - this.lastDepositTime > 500) {
                if (this.gameState.getKeys() > 0) {
                    console.log('🗝️ MainScene: Depositing key into portal', portal.getConfig().id);
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
                        console.log('🔒 MainScene: Portal rejected key (busy or full)');
                    }
                } else {
                    // Можно показать хинт "Need more keys"
                    console.log('🔒 MainScene: Portal needs key, but player has none');
                }
            } else {
                // Иначе обрабатываем вход (если открыт)
                this.handlePortalOverlapEntry(portal);
            }
        });
    }

    /**
     * Спавн начальных объектов
     * ✅ ИЗМЕНЕНО: Теперь спавнит только врагов
     * Предметы (сердечки и ключи) спавнятся в createGameWorld() после порталов
     * Враги спавнятся последними и могут спавниться поверх предметов
     */
    private async spawnInitialObjects(): Promise<void> {
        const playerPos = this.player.getPosition();

        // 6. Враги (спавнятся последними, им разрешено спавниться поверх сердечек и ключей)
        // ✅ Callback для немедленного обновления enemyInstances и вызова update() после создания каждого врага
        await this.spawnSystem.spawnInitialEnemies(
            this.enemies,
            this.chasers,
            playerPos.x,
            playerPos.y,
            (enemy: AbstractEnemy) => {
                // ✅ Обновляем enemyInstances сразу после создания врага
                this.updateEnemyInstances();
                // ✅ Немедленно вызываем update для только что созданного врага
                if (this.player && enemy && enemy.getSprite && enemy.getSprite().active) {
                    enemy.update(this.player.getSprite());
                }
            }
        );

        // ✅ Финальное обновление enemyInstances на случай, если callback не сработал
        this.updateEnemyInstances();
    }

    /**
     * Обновить список экземпляров врагов из групп
     */
    private updateEnemyInstances(): void {
        this.enemyInstances = [];

        // ✅ Проверка на существование групп и активность сцены
        if (!this.enemies || !this.enemies.scene || !this.chasers || !this.chasers.scene) {
            return;
        }

        this.enemies.getChildren().forEach((sprite: any) => {
            const enemy = sprite.getData('enemy') as AbstractEnemy;
            if (enemy) {
                this.enemyInstances.push(enemy);
            }
        });

        this.chasers.getChildren().forEach((sprite: any) => {
            const enemy = sprite.getData('enemy') as AbstractEnemy;
            if (enemy) {
                this.enemyInstances.push(enemy);
            }
        });
    }

    /**
     * Контроль максимального количества врагов
     * Убивает самых старых врагов, если превышен лимит
     */
    private async controlMaxEnemies(): Promise<void> {
        try {
            const spawnConfig = await this.levelManager.getEnemySpawnConfig();

            // Если maxEnemies = null, не контролируем
            if (spawnConfig.maxEnemies === null) {
                return;
            }

            const totalEnemies = this.enemies.countActive() + this.chasers.countActive();

            // Если врагов больше лимита, убиваем самых старых
            if (totalEnemies > spawnConfig.maxEnemies) {
                const enemiesToKill = totalEnemies - spawnConfig.maxEnemies;

                // ✅ Сортируем врагов по времени создания (самые старые первыми)
                // Ключевое правило: убиваем по возрасту, независимо от того, клон это или нет
                const sortedEnemies = [...this.enemyInstances]
                    .filter(e => e && e.isActive())
                    .sort((a, b) => {
                        const aTime = (a as any).spawnTime || 0;
                        const bTime = (b as any).spawnTime || 0;
                        return aTime - bTime; // Старые первыми
                    });

                // Убиваем самых старых врагов (по возрасту, независимо от того, клон это или нет)
                for (let i = 0; i < enemiesToKill && i < sortedEnemies.length; i++) {
                    const enemy = sortedEnemies[i];
                    if (enemy && enemy.isActive()) {
                        logger.log('ENEMY_CONTROL', 'Killing oldest enemy to maintain maxEnemies limit', {
                            enemyId: enemy.getId(),
                            type: enemy.getType(),
                            isClone: (enemy as any).isClone,
                            spawnTime: (enemy as any).spawnTime,
                            totalEnemies,
                            maxEnemies: spawnConfig.maxEnemies
                        });

                        // Убиваем врага через состояние DYING
                        enemy.getSprite().disableBody(true, false);
                        (enemy as any).setState(EnemyState.DYING);
                        (enemy as any).isDying = true;
                        (enemy as any).playDeathAnimation(true);
                    }
                }

                // Обновляем список экземпляров после убийства
                this.updateEnemyInstances();
            }
        } catch (error) {
            logger.log('ENEMY_CONTROL', 'Error controlling max enemies', { error });
        }
    }

    /**
     * Создать клон врага (callback для AbstractEnemy)
     */
    private createEnemyClone(config: {
        type: EnemyType;
        x: number;
        y: number;
        speed: number;
        health: number;
        damage: number;
        isClone: boolean;
        parentId: string;
        spawnTime: number;
        cloneDetectionRadius: number;
        chaseRadius: number;
        chaseSpeed: number;
        clonesCanClone: boolean;
        cloneLifetime: number;
        cloneCount: number;
        cloneSpawnDelay?: number;
        showDetectionRadius?: boolean;
        initialAngle?: number;
        shouldBlink?: boolean;
    }): void {
        logger.log('ENEMY_CLONE', 'Creating enemy clone', config);

        let enemy: AbstractEnemy;
        const enemyConfig: any = {
            type: config.type,
            speed: config.speed,
            x: config.x,
            y: config.y,
            health: config.health,
            damage: config.damage,
            isClone: config.isClone,
            parentId: config.parentId,
            spawnTime: config.spawnTime,
            cloneDetectionRadius: config.cloneDetectionRadius,
            chaseRadius: config.chaseRadius,
            chaseSpeed: config.chaseSpeed,
            clonesCanClone: config.clonesCanClone,
            cloneLifetime: config.cloneLifetime,
            cloneCount: config.cloneCount,
            cloneSpawnDelay: config.cloneSpawnDelay ?? 0,
            showDetectionRadius: config.showDetectionRadius ?? false
        };

        if (config.type === EnemyType.RANDOM_WALKER) {
            enemy = new EnemyRandomWalker(this, enemyConfig);
            this.enemies.add(enemy.getSprite());
        } else if (config.type === EnemyType.CHASER) {
            enemy = new EnemyChaser(this, enemyConfig);
            this.chasers.add(enemy.getSprite());
        } else if (config.type === EnemyType.FLAM) {
            enemy = new EnemyFlam(this, {
                ...enemyConfig
            });
            this.chasers.add(enemy.getSprite());
        } else {
            logger.log('ENEMY_CLONE', 'Unknown enemy type, skipping', { type: config.type });
            return;
        }

        // Устанавливаем начальное направление движения
        if (config.initialAngle !== undefined) {
            this.physics.velocityFromAngle(config.initialAngle, config.speed, enemy.getSprite().body.velocity);
        }

        // ✅ Мигание белым для клона при создании (если нужно)
        if (config.shouldBlink) {
            enemy.startCloneBlinkAnimation();
        }

        // ✅ Воспроизводим звук спавна клона (с проверкой видимости внутри метода)
        enemy.playSpawnSound();

        // Обновляем список экземпляров
        this.updateEnemyInstances();

        // ✅ Немедленно вызываем update для клона, чтобы запустить анимацию и обновить отладочные шейпы
        if (enemy && enemy.getSprite && enemy.getSprite().active && this.player) {
            enemy.update(this.player.getSprite());
        }

        logger.log('ENEMY_CLONE', 'Clone created successfully', {
            enemyId: enemy.getId(),
            parentId: config.parentId
        });
    }

    /**
     * Настройка периодических событий
     */
    private async setupPeriodicEvents(): Promise<void> {
        const spawnConfig = await this.levelManager.getEnemySpawnConfig();
        const itemConfig = await this.levelManager.getItemSpawnConfig();

        // Периодический спавн врагов
        this.time.addEvent({
            delay: spawnConfig.periodicSpawnDelay,
            callback: async () => {
                // ✅ Проверка активности сцены перед выполнением
                if (!this.sys.settings.active) return;

                await this.spawnSystem.spawnEnemy(
                    this.enemies,
                    this.chasers,
                    this.player.getX(),
                    this.player.getY()
                );

                // ✅ Проверка активности сцены после await
                if (this.sys.settings.active) {
                    this.updateEnemyInstances();
                }
            },
            callbackScope: this,
            loop: true
        });

        // Периодический спавн предметов
        this.time.addEvent({
            delay: itemConfig.keys.spawnDelay,
            callback: async () => {
                await this.spawnSystem.spawnPeriodicItems(
                    this.hearts,
                    this.keys,
                    this.player.getX(),
                    this.player.getY()
                );
            },
            callbackScope: this,
            loop: true
        });
    }

    // ✅ Храним ссылки на обработчики для очистки
    private onPortalEnterCancelledHandler = () => {
        console.log('✅ MainScene: Portal enter cancelled event received');
        this.handlePortalEnterCancelled();
    };

    private onPortalEnterConfirmedHandler = (data: { portal: AbstractPortal }) => {
        console.log('✅ MainScene: Portal enter confirmed', data.portal.getConfig().id);
        this.handlePortalEnterConfirmed(data.portal);
    };

    private onKeyQuizCompletedHandler = (data: { result: 'correct' | 'wrong' | 'closed', damage?: number }) => {
        console.log('✅ MainScene: Key quiz completed', data);
        if (data.result === 'correct') {
            this.handleKeyQuizCorrect(this.currentMiniQuizData || undefined);
        } else if (data.result === 'wrong') {
            this.handleKeyQuizWrong(data.damage);
        } else {
            this.handleKeyQuizClose();
        }
    };

    private onRestartGameHandler = () => {
        console.log('✅ MainScene: Restart game requested (Global Handler)');
        // Пользователь требует, чтобы кнопка RESTART GAME всегда сбрасывала игру на 1-й уровень
        this.handleFullGameRestart();
    };

    private onNextLevelHandler = () => {
        console.log('✅ MainScene: Next Level requested via EventBus');
        this.handleNextLevel();
    };

    private onQuizHandler = (data: { correct: boolean, context: string }) => {
        this.handleQuizCompleted(data);
    };

    private onViewportHandler = ({ realWidth, realHeight }: { realWidth: number; realHeight: number }) => {
        this.realViewportWidth = realWidth;
        this.realViewportHeight = realHeight;
        console.log('✅ MainScene: Viewport size updated', { realWidth, realHeight });
    };

    /**
     * Настройка EventBus (обработчики событий UI)
     */
    private setupEventBus(): void {
        // Обработчики результатов от UIManager
        EventBus.on(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
        EventBus.on(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);
        EventBus.on(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
        EventBus.on(EVENTS.RESTART_GAME, this.onRestartGameHandler);
        EventBus.on(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

        // Legacy/Other events
        EventBus.on('quiz-completed', this.onQuizHandler);
        EventBus.on('restart-game', this.onRestartGameHandler); // Using same handler
        EventBus.on('viewport-update', this.onViewportHandler);

        // ✅ Очищаем при уничтожении сцены
        this.events.once('shutdown', () => {
            console.log('🧹 MainScene: Cleaning EventBus listeners');
            EventBus.off(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
            EventBus.off(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);
            EventBus.off(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
            EventBus.off(EVENTS.RESTART_GAME, this.onRestartGameHandler);
            EventBus.off(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

            EventBus.off('quiz-completed', this.onQuizHandler);
            EventBus.off('restart-game', this.onRestartGameHandler);
            EventBus.off('viewport-update', this.onViewportHandler);

            this.scale.off('resize', this.handlePhaserResize, this);

            // ✅ Очищаем таймеры мигания ключей
            if (this.playerFlashLoseKeyInterval) {
                this.playerFlashLoseKeyInterval.destroy();
                this.playerFlashLoseKeyInterval = null;
            }
            if (this.playerFlashGetKeyInterval) {
                this.playerFlashGetKeyInterval.destroy();
                this.playerFlashGetKeyInterval = null;
            }
            if (this.playerFlashGetKeyPositionTimer) {
                this.playerFlashGetKeyPositionTimer.destroy();
                this.playerFlashGetKeyPositionTimer = null;
            }

            // ✅ Очищаем таймаут ресайза
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = null;
            }
        });

        // ✅ Дополнительная очистка при destroy
        this.events.once('destroy', () => {
            console.log('🗑️ MainScene: Destroying EventBus listeners');
            EventBus.off(EVENTS.PORTAL_ENTER_CONFIRMED, this.onPortalEnterConfirmedHandler);
            EventBus.off(EVENTS.PORTAL_ENTER_CANCELLED, this.onPortalEnterCancelledHandler);
            EventBus.off(EVENTS.KEY_QUIZ_COMPLETED, this.onKeyQuizCompletedHandler);
            EventBus.off(EVENTS.RESTART_GAME, this.onRestartGameHandler);
            EventBus.off(EVENTS.NEXT_LEVEL, this.onNextLevelHandler);

            EventBus.off('quiz-completed', this.onQuizHandler);
            EventBus.off('restart-game', this.onRestartGameHandler);
            EventBus.off('viewport-update', this.onViewportHandler);

            // Очищаем слушатели событий ресайза и поворота экрана
            // ПРИМЕЧАНИЕ: removeEventListener здесь не работает корректно, так как bind(this) создает новую функцию
            // Слушатели будут очищены браузером при выгрузке страницы (page unload)
            // Для корректной очистки нужно хранить bound функции в свойствах класса (требует рефакторинга)
            /*
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', this.handleWindowResize.bind(this));
                window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
            }
            */

            if (this.scale) {
                this.scale.off('resize', this.handlePhaserResize, this);
            }

            // Очищаем таймаут
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = null;
            }

            // ✅ Очищаем таймеры мигания ключей
            if (this.playerFlashLoseKeyInterval) {
                this.playerFlashLoseKeyInterval.destroy();
                this.playerFlashLoseKeyInterval = null;
            }
            if (this.playerFlashGetKeyInterval) {
                this.playerFlashGetKeyInterval.destroy();
                this.playerFlashGetKeyInterval = null;
            }
            if (this.playerFlashGetKeyPositionTimer) {
                this.playerFlashGetKeyPositionTimer.destroy();
                this.playerFlashGetKeyPositionTimer = null;
            }

            // ✅ Очищаем спрайты мигания ключей
            if (this.playerFlashGetKeySprites && this.playerFlashGetKeySprites.length > 0) {
                this.playerFlashGetKeySprites.forEach(sprite => {
                    if (sprite && typeof sprite.destroy === 'function') {
                        try {
                            sprite.destroy();
                        } catch (e) {
                            console.warn('⚠️ Error destroying flash key sprite in destroy handler:', e);
                        }
                    }
                });
                this.playerFlashGetKeySprites = [];
            }

            // ✅ Очищаем floating text pool
            if (this.floatingTextPool && this.floatingTextPool.length > 0) {
                this.floatingTextPool.forEach(t => {
                    if (t && typeof t.destroy === 'function') {
                        try {
                            t.destroy();
                        } catch (e) {
                            console.warn('⚠️ Error destroying floating text in destroy handler:', e);
                        }
                    }
                });
                this.floatingTextPool = [];
            }
        });
    }

    update(time: number, delta: number) {
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
        if (DEBUG_UI_ENABLED && this.debugOverlay && this.debugOverlay['debugText'] && this.debugOverlay['debugText'].active) {
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
                        console.log('✅ MainScene: Player exited portal zone, mustExit reset, overlap re-enabled');
                    }
                }
            });
        }

        // ✅ Обновление колец ключей (теперь в классе Player)
        if (this.player) {
            const keyCount = this.gameState.getKeys();
            this.player.updateKeyRings(keyCount);
        }

        // ✅ Обновление AI врагов (проверяем существование массива)
        if (this.enemyInstances && Array.isArray(this.enemyInstances)) {
            this.enemyInstances.forEach(enemy => {
                const enemySprite = enemy.getSprite();
                if (enemySprite && enemySprite.active && this.player) {
                    enemy.update(this.player.getSprite());
                }
            });
        }

        // ✅ Контроль maxEnemies - убиваем старых врагов, если превышен лимит
        this.controlMaxEnemies();

        // ✅ Обновление анимации ключей (для physics спрайтов нужна ручная синхронизация по таймеру)
        if (this.keys && this.keys.getChildren) {
            const delta = this.game.loop.delta;
            this.keys.getChildren().forEach((rune: any) => {
                if (!rune || !rune.active || !rune.anims || !rune.anims.isPlaying) {
                    return;
                }

                const anim = rune.anims.currentAnim;
                if (!anim || !anim.frames || anim.frames.length === 0) {
                    return;
                }

                // ✅ Используем тот же подход, что и в SpriteAnimationHandler - ручное переключение по таймеру
                // Инициализируем таймеры, если их еще нет (проверяем наличие флага инициализации)
                if (rune._animationInitialized !== true) {
                    rune._animationTimer = 0;
                    rune._animationFrameIndex = 0;
                    const frameRate = anim.frameRate || 8;
                    rune._animationInterval = 1000 / frameRate;
                    rune._animationInitialized = true;
                    console.log(`🔑 Rune animation initialized: frameRate=${frameRate}, interval=${rune._animationInterval}ms, frames=${anim.frames.length}`);
                }

                // Обновляем таймер
                rune._animationTimer += delta;

                // Если прошло достаточно времени, переключаем кадр
                if (rune._animationTimer >= rune._animationInterval) {
                    rune._animationTimer = 0;
                    rune._animationFrameIndex = (rune._animationFrameIndex + 1) % anim.frames.length;

                    // Получаем кадр из массива кадров анимации
                    const animFrame = anim.frames[rune._animationFrameIndex];
                    if (!animFrame || !animFrame.frame) {
                        return;
                    }

                    const animFrameObj = animFrame.frame;
                    let frameIndex: number | undefined;

                    // Получаем индекс кадра из спрайтшита
                    // ✅ Обрабатываем случай, когда frame - это объект {key: "...", frame: 0}
                    if (animFrameObj && typeof animFrameObj === 'object' && (animFrameObj as any).frame !== undefined) {
                        frameIndex = (animFrameObj as any).frame;
                    } else if ((animFrameObj as any)?.index !== undefined) {
                        frameIndex = (animFrameObj as any).index;
                    } else if (animFrameObj?.name !== undefined) {
                        const nameAsNum = parseInt(String(animFrameObj.name), 10);
                        if (!isNaN(nameAsNum)) {
                            frameIndex = nameAsNum;
                        }
                    } else if (typeof animFrameObj === 'number') {
                        frameIndex = animFrameObj;
                    }

                    // Устанавливаем кадр
                    if (frameIndex !== undefined) {
                        rune.setFrame(frameIndex);

                        // Логируем только изредка для диагностики
                        if (Math.random() < 0.05) {
                            console.log(`🔑 Key: Manual frame ${rune._animationFrameIndex}/${anim.frames.length} -> frameIndex ${frameIndex} (anim: ${anim.key})`);
                        }
                    } else {
                        console.warn(`⚠️ Rune: Could not determine frameIndex for frame ${rune._animationFrameIndex}`, animFrameObj);
                    }
                }
            });
        }

        // ✅ Обновление анимаций порталов (для physics спрайтов нужна ручная синхронизация по таймеру)
        if (this.portals && this.portals.getChildren) {
            const delta = this.game.loop.delta;
            this.portals.getChildren().forEach((portalSprite: any) => {
                const portal = portalSprite.getData('portal') as AbstractPortal;
                if (!portal || !portalSprite || !portalSprite.active) {
                    return;
                }

                // ✅ Проверяем состояние портала и необходимость синхронизации анимации
                const state = portal.getState();
                const isBase = state === PortalState.BASE;
                const isActivating = state === PortalState.ACTIVATING;
                const isActivated = state === PortalState.ACTIVATED;
                const isInteraction = state === PortalState.INTERACTION;

                // ✅ Пропускаем только если портал не в состоянии, требующем анимации
                // Базовое состояние тоже требует анимации для спрайтшитов (не для статичных текстур)
                if (!isBase && !isActivating && !isActivated && !isInteraction) {
                    return; // Портал в неопределенном состоянии, анимация не нужна
                }

                // ✅ Для базового состояния проверяем, что это не статичная текстура
                if (isBase && (portal as any).useTiledMapTextures) {
                    return; // Статичная текстура в базовом состоянии, анимация не нужна
                }

                if (!portalSprite.anims || !portalSprite.anims.currentAnim) {
                    return;
                }

                const anim = portalSprite.anims.currentAnim;
                if (!anim || !anim.frames || anim.frames.length === 0) {
                    return;
                }

                // ✅ Если включен флаг ручной синхронизации, мы ИГНОРИРУЕМ native isPlaying и обновляем кадры вручную
                if ((portalSprite as any)._needsManualSync) {
                    // Manual sync proceed...
                } else if (portalSprite.anims.isPlaying) {
                    return; // Если ручная синхронизация НЕ нужна, и анимация играет нативно - выходим
                }

                // (Explicitly check false flag was removed as it's handled above)

                // ✅ Ручная синхронизация кадров для physics спрайтов
                if (portalSprite._animationInitialized !== true) {
                    portalSprite._animationTimer = 0;
                    portalSprite._animationFrameIndex = 0;
                    const frameRate = anim.frameRate || 8;
                    portalSprite._animationInterval = 1000 / frameRate;
                    portalSprite._animationInitialized = true;
                    console.log(`🔵 Portal animation initialized: frameRate=${frameRate}, interval=${portalSprite._animationInterval}ms, frames=${anim.frames.length}`);
                }

                // Обновляем таймер
                portalSprite._animationTimer += delta;

                // Переключаем кадр, если прошло достаточно времени
                if (portalSprite._animationTimer >= portalSprite._animationInterval) {
                    portalSprite._animationTimer = 0;
                    const nextIndex = portalSprite._animationFrameIndex + 1;
                    const isLooping = anim.repeat === -1;

                    if (nextIndex >= anim.frames.length) {
                        if (isLooping) {
                            portalSprite._animationFrameIndex = 0;
                        } else {
                            // Stop at last frame
                            portalSprite._animationFrameIndex = anim.frames.length - 1;
                            // Disable sync to stop checking
                            portalSprite._needsManualSync = false;
                            // Emit completion event
                            portalSprite.emit('animationcomplete', anim, anim.frames[portalSprite._animationFrameIndex]);
                        }
                    } else {
                        portalSprite._animationFrameIndex = nextIndex;
                    }

                    // Получаем кадр из анимации
                    const animFrame = anim.frames[portalSprite._animationFrameIndex];
                    if (animFrame) {
                        let frameIndex: number | undefined;

                        // Определяем индекс кадра
                        const animFrameObj = animFrame.frame;
                        if (animFrameObj !== undefined) {
                            if ((animFrameObj as any).index !== undefined) {
                                frameIndex = (animFrameObj as any).index;
                            } else if (animFrameObj?.name !== undefined) {
                                const nameAsNum = parseInt(String(animFrameObj.name), 10);
                                if (!isNaN(nameAsNum)) {
                                    frameIndex = nameAsNum;
                                }
                            } else if (typeof animFrameObj === 'number') {
                                frameIndex = animFrameObj;
                            }
                        }

                        // Устанавливаем кадр
                        if (frameIndex !== undefined) {
                            portalSprite.setFrame(frameIndex);
                        }
                    }
                }
            });
        }



        // ✅ Обновление анимаций Оракула (для physics спрайтов нужна ручная синхронизация по таймеру)
        if (this.oracle) {
            const oracleSprite = this.oracle.getSprite();
            if (oracleSprite && oracleSprite.active) {
                // Если включен флаг ручной синхронизации
                if ((oracleSprite as any)._needsManualSync) {
                    const anim = oracleSprite.anims.currentAnim;
                    if (anim && anim.frames && anim.frames.length > 0) {
                        const delta = this.game.loop.delta;

                        // Инициализируем таймер
                        if ((oracleSprite as any)._animationInitialized !== true) {
                            (oracleSprite as any)._animationTimer = 0;
                            (oracleSprite as any)._animationFrameIndex = 0;
                            const frameRate = anim.frameRate || 8;
                            (oracleSprite as any)._animationInterval = 1000 / frameRate;
                            (oracleSprite as any)._animationInitialized = true;
                            // console.log(`🔵 Oracle animation initialized`);
                        }

                        // Обновляем таймер
                        (oracleSprite as any)._animationTimer += delta;

                        // Переключаем кадр
                        if ((oracleSprite as any)._animationTimer >= (oracleSprite as any)._animationInterval) {
                            (oracleSprite as any)._animationTimer = 0;
                            const nextIndex = (oracleSprite as any)._animationFrameIndex + 1;
                            const isLooping = anim.repeat === -1;

                            if (nextIndex >= anim.frames.length) {
                                if (isLooping) {
                                    (oracleSprite as any)._animationFrameIndex = 0;
                                } else {
                                    // Stop at last frame
                                    (oracleSprite as any)._animationFrameIndex = anim.frames.length - 1;
                                    // Disable sync
                                    (oracleSprite as any)._needsManualSync = false;
                                    // Emit completion event
                                    oracleSprite.emit('animationcomplete', anim, anim.frames[(oracleSprite as any)._animationFrameIndex]);
                                }
                            } else {
                                (oracleSprite as any)._animationFrameIndex = nextIndex;
                            }

                            // Получаем кадр
                            const animFrame = anim.frames[(oracleSprite as any)._animationFrameIndex];
                            if (animFrame && animFrame.frame) {
                                const animFrameObj = animFrame.frame;
                                let frameIndex: number | undefined;

                                if (typeof (animFrameObj as any).index === 'number') {
                                    frameIndex = (animFrameObj as any).index;
                                } else if (typeof animFrameObj.name === 'string') {
                                    frameIndex = parseInt(animFrameObj.name, 10);
                                }

                                if (frameIndex !== undefined) {
                                    oracleSprite.setFrame(frameIndex);
                                }
                            }
                        }
                    }
                }
            }
        }

        // ✅ Обновление анимации повреждения персонажа (для physics спрайтов нужна ручная синхронизация по таймеру)
        if (this.player) {
            const playerSprite = this.player.getSprite();
            // ✅ КРИТИЧНО: Для physics спрайтов проверяем состояние игрока, а не isPlaying
            // потому что isPlaying может быть false для physics спрайтов даже когда анимация должна проигрываться
            const playerState = this.player.getState();
            if (playerSprite && playerSprite.active && playerState === 'damaged') {
                // Проверяем, что текстура правильная
                if (playerSprite.texture.key === 'character_damaged') {
                    const anim = this.anims.get('character_damaged');
                    if (anim && anim.frames && anim.frames.length > 0) {
                        const delta = this.game.loop.delta;

                        // Инициализируем таймеры, если их еще нет
                        if ((playerSprite as any)._damageAnimationInitialized !== true) {
                            (playerSprite as any)._damageAnimationTimer = 0;
                            (playerSprite as any)._damageAnimationFrameIndex = 0;
                            const frameRate = anim.frameRate || 12;
                            (playerSprite as any)._damageAnimationInterval = 1000 / frameRate;
                            (playerSprite as any)._damageAnimationInitialized = true;
                            console.log(`💥 Player damage animation initialized: frameRate=${frameRate}, interval=${(playerSprite as any)._damageAnimationInterval}ms, frames=${anim.frames.length}`);
                        }

                        // Обновляем таймер
                        (playerSprite as any)._damageAnimationTimer += delta;

                        // Если прошло достаточно времени, переключаем кадр
                        if ((playerSprite as any)._damageAnimationTimer >= (playerSprite as any)._damageAnimationInterval) {
                            (playerSprite as any)._damageAnimationTimer = 0;

                            // Для анимации повреждения (repeat: 0) - переходим к следующему кадру, но не зацикливаем
                            if ((playerSprite as any)._damageAnimationFrameIndex < anim.frames.length - 1) {
                                (playerSprite as any)._damageAnimationFrameIndex++;
                            } else {
                                // Достигли последнего кадра - останавливаем анимацию
                                (playerSprite as any)._damageAnimationFrameIndex = anim.frames.length - 1;
                            }

                            // Получаем кадр из массива кадров анимации
                            const animFrame = anim.frames[(playerSprite as any)._damageAnimationFrameIndex];
                            if (animFrame && animFrame.frame) {
                                const animFrameObj = animFrame.frame;
                                let frameIndex: number | undefined;

                                // Получаем индекс кадра из спрайтшита
                                if (animFrameObj && typeof animFrameObj === 'object' && (animFrameObj as any).frame !== undefined) {
                                    frameIndex = (animFrameObj as any).frame;
                                } else if ((animFrameObj as any)?.index !== undefined) {
                                    frameIndex = (animFrameObj as any).index;
                                } else if (animFrameObj?.name !== undefined) {
                                    const nameAsNum = parseInt(String(animFrameObj.name), 10);
                                    if (!isNaN(nameAsNum)) {
                                        frameIndex = nameAsNum;
                                    }
                                } else if (typeof animFrameObj === 'number') {
                                    frameIndex = animFrameObj;
                                }

                                // Устанавливаем кадр
                                if (frameIndex !== undefined) {
                                    playerSprite.setFrame(frameIndex);

                                    // Логируем только изредка для диагностики
                                    if (Math.random() < 0.05) {
                                        console.log(`💥 Player: Damage animation frame ${(playerSprite as any)._damageAnimationFrameIndex}/${anim.frames.length} -> frameIndex ${frameIndex}`);
                                    }

                                    // ✅ Если достигли последнего кадра анимации повреждения, проверяем завершение
                                    if ((playerSprite as any)._damageAnimationFrameIndex === anim.frames.length - 1) {
                                        // Даем небольшую задержку перед проверкой завершения (чтобы последний кадр отобразился)
                                        this.time.delayedCall((playerSprite as any)._damageAnimationInterval, () => {
                                            if (playerSprite.anims && playerSprite.anims.currentAnim && playerSprite.anims.currentAnim.key === anim.key) {
                                                // Анимация завершилась - вручную вызываем событие animationcomplete
                                                console.log('💥 Player: Damage animation completed manually, emitting animationcomplete event');
                                                playerSprite.emit('animationcomplete', anim);
                                            }
                                        });
                                    }
                                } else {
                                    console.warn(`⚠️ Player: Could not determine frameIndex for damage frame ${(playerSprite as any)._damageAnimationFrameIndex}`, animFrameObj);
                                }
                            }
                        }
                    } else {
                        // Анимация не найдена - логируем для отладки
                        if (Math.random() < 0.01) {
                            console.warn('⚠️ Player: character_damaged animation not found or has no frames');
                        }
                    }
                } else {
                    // Текстура не установлена - логируем для отладки
                    if (Math.random() < 0.01) {
                        console.warn('⚠️ Player: texture is not character_damaged, current:', playerSprite.texture.key);
                    }
                }
            }
        }

        // ✅ Обновление анимации оракула (для physics спрайтов нужна ручная синхронизация по таймеру)
        if (this.oracle) {
            const oracleSprite = this.oracle.getSprite();
            // ✅ FIX: Check _needsManualSync flag before manual update to avoid conflict with Phaser's native update
            if (oracleSprite && oracleSprite.active && oracleSprite.anims && oracleSprite.anims.isPlaying && (oracleSprite as any)._needsManualSync) {
                const delta = this.game.loop.delta;
                const anim = oracleSprite.anims.currentAnim;
                if (anim && anim.frames && anim.frames.length > 0) {
                    // Инициализируем таймеры, если их еще нет
                    if ((oracleSprite as any)._animationInitialized !== true) {
                        (oracleSprite as any)._animationTimer = 0;
                        (oracleSprite as any)._animationFrameIndex = 0;
                        const frameRate = anim.frameRate || 12;
                        (oracleSprite as any)._animationInterval = 1000 / frameRate;
                        (oracleSprite as any)._animationInitialized = true;
                        console.log(`🔮 Oracle animation initialized: frameRate=${frameRate}, interval=${(oracleSprite as any)._animationInterval}ms, frames=${anim.frames.length}, animKey=${anim.key}`);
                    }

                    // Обновляем таймер
                    (oracleSprite as any)._animationTimer += delta;

                    // Если прошло достаточно времени, переключаем кадр
                    // Если прошло достаточно времени, переключаем кадр
                    // FIX: Use while loop to catch up multiple frames if delta is large (lag spike or low fps)
                    let safetyCounter = 0;
                    while ((oracleSprite as any)._animationTimer >= (oracleSprite as any)._animationInterval && safetyCounter < 5) {
                        (oracleSprite as any)._animationTimer -= (oracleSprite as any)._animationInterval;
                        safetyCounter++;

                        // DEBUG: Uncomment if still freezing
                        console.log(`🔮 Oracle Tick: Frame ${(oracleSprite as any)._animationFrameIndex} -> Next (Interval: ${(oracleSprite as any)._animationInterval})`);

                        // ✅ Для анимации активации (repeat: 0) - переходим к следующему кадру, но не зацикливаем
                        // Для анимации активированного состояния (repeat: -1) - зацикливаем
                        if (anim.repeat === 0) {
                            // Анимация активации - переходим к следующему кадру, если не последний
                            if ((oracleSprite as any)._animationFrameIndex < anim.frames.length - 1) {
                                (oracleSprite as any)._animationFrameIndex++;
                            } else {
                                // Достигли последнего кадра - останавливаем анимацию
                                (oracleSprite as any)._animationFrameIndex = anim.frames.length - 1;
                                // Force break to prevent unnecessary loops once stuck at end
                                break;
                            }
                        } else {
                            // Анимация активированного состояния - зацикливаем
                            (oracleSprite as any)._animationFrameIndex = ((oracleSprite as any)._animationFrameIndex + 1) % anim.frames.length;
                        }
                    }      // Получаем кадр из массива кадров анимации
                    const animFrame = anim.frames[(oracleSprite as any)._animationFrameIndex];
                    if (animFrame && animFrame.frame) {
                        const animFrameObj = animFrame.frame;

                        // ✅ FIX: Get frameIndex the same way as in AnimationManager
                        // Для спрайтшитов имя кадра - это число (0, 1, 2, ...)
                        // Если .index есть - используем его, иначе используем name или сам объект
                        let frameIndex: number | undefined;

                        if (typeof (animFrameObj as any).index === 'number') {
                            frameIndex = (animFrameObj as any).index;
                        } else if (typeof animFrameObj.name === 'number') {
                            frameIndex = animFrameObj.name;
                        } else if (typeof animFrameObj.name === 'string') {
                            // Для спрайтшитов name может быть строкой "0", "1", ...
                            frameIndex = parseInt(animFrameObj.name, 10);
                        } else {
                            // Fallback: пробуем использовать сам объект как число
                            frameIndex = (animFrameObj as any);
                        }

                        if (frameIndex !== undefined) {
                            oracleSprite.setFrame(frameIndex);

                            // Логируем только изредка для диагностики
                            if (Math.random() < 0.05) {
                                console.log(`🔮 Oracle: Manual frame ${(oracleSprite as any)._animationFrameIndex}/${anim.frames.length} -> frameIndex ${frameIndex} (anim: ${anim.key}, repeat: ${anim.repeat})`);
                            }

                            // ✅ Если достигли последнего кадра анимации активации, проверяем завершение
                            if (anim.repeat === 0 && (oracleSprite as any)._animationFrameIndex === anim.frames.length - 1) {
                                // Даем небольшую задержку перед проверкой завершения (чтобы последний кадр отобразился)
                                this.time.delayedCall((oracleSprite as any)._animationInterval, () => {
                                    if (oracleSprite.anims && oracleSprite.anims.currentAnim && oracleSprite.anims.currentAnim.key === anim.key) {
                                        // Анимация завершилась - вручную вызываем событие animationcomplete
                                        // Это нужно, потому что для physics спрайтов Phaser может не вызвать событие автоматически
                                        console.log('🔮 Oracle: Activation animation completed manually, emitting animationcomplete event');
                                        oracleSprite.emit('animationcomplete', anim);
                                    }
                                });
                            }
                        } else {
                            console.warn(`⚠️ Oracle: Could not determine frameIndex for frame ${(oracleSprite as any)._animationFrameIndex}`, animFrameObj);
                        }
                    }
                }
            }
        }





        // ✅ Обновление анимаций персонажа (получение/потеря/применение ключа) - синхронизация через Player
        if (this.player) {
            const delta = this.game.loop.delta;
            this.player.updateAnimationSync(delta);
        }

        // ✅ Обновление анимаций смерти врагов - ручная синхронизация кадров

        // ✅ NEW: Manual Sync for Portals (Fixing freeze)
        if (this.portals && Array.isArray(this.portals)) {
            this.portals.forEach(portal => {
                const sprite = portal.getSprite();
                // DEBUG: Remove comment if needed, but for now let's just log if it SHOULD be syncing but isn't
                // if ((sprite as any)._needsManualSync && (!sprite.anims.isPlaying)) {
                //    console.warn(`⚠️ MainScene: Portal ${portal.getConfig().id} needs sync but isPlaying=false!`);
                // }

                if (sprite && sprite.active && sprite.anims && sprite.anims.isPlaying && (sprite as any)._needsManualSync) {
                    const delta = this.game.loop.delta;
                    const anim = sprite.anims.currentAnim;

                    if (anim && anim.frames && anim.frames.length > 0) {
                        // Initialize
                        if ((sprite as any)._animationInitialized !== true) {
                            (sprite as any)._animationTimer = 0;
                            (sprite as any)._animationFrameIndex = 0;
                            const frameRate = anim.frameRate || 10;
                            (sprite as any)._animationInterval = 1000 / frameRate;
                            (sprite as any)._animationInitialized = true;
                            // console.log(`🚪 Portal anim init: ${anim.key}`);
                        }

                        (sprite as any)._animationTimer += delta;

                        // FIX: Use while loop to catch up multiple frames (robust sync)
                        let safetyCounter = 0;
                        while ((sprite as any)._animationTimer >= (sprite as any)._animationInterval && safetyCounter < 5) {
                            (sprite as any)._animationTimer -= (sprite as any)._animationInterval;
                            safetyCounter++;

                            // Logic for looping vs one-shot
                            if (anim.repeat === 0) {
                                if ((sprite as any)._animationFrameIndex < anim.frames.length - 1) {
                                    (sprite as any)._animationFrameIndex++;
                                } else {
                                    (sprite as any)._animationFrameIndex = anim.frames.length - 1;
                                    // ✅ Fix: Emitting event for Manual Sync usage
                                    sprite.emit('animationcomplete', anim, anim.frames[(sprite as any)._animationFrameIndex]);
                                    break; // Stop processing once finished
                                }
                            } else {
                                // Loop
                                (sprite as any)._animationFrameIndex = ((sprite as any)._animationFrameIndex + 1) % anim.frames.length;
                            }
                        }

                        // Apply frame
                        const animFrame = anim.frames[(sprite as any)._animationFrameIndex];
                        if (animFrame) {
                            const frameIndex = (animFrame.frame as any).name || (animFrame.frame as any).index || animFrame.frame;
                            if (frameIndex !== undefined) {
                                sprite.setFrame(frameIndex);
                            }
                        }
                    }
                }
            });
        }

        // ✅ Обновление анимаций смерти врагов - ручная синхронизация кадров
        if (this.enemyInstances && Array.isArray(this.enemyInstances)) {
            this.enemyInstances.forEach((enemy, index) => {
                const deathSprite = (enemy as any).deathAnimationSprite;
                if (deathSprite && deathSprite.active) {
                    // ✅ Проверяем, существует ли анимация enemy_death
                    if (!this.anims.exists('enemy_death')) {
                        // Если анимация не существует, уничтожаем спрайт сразу
                        if (index === 0) {
                            logger.log('ENEMY_ANIMATION_SYNC', 'Animation enemy_death not found, destroying sprite', {
                                enemyIndex: index
                            });
                        }
                        deathSprite.destroy();
                        (enemy as any).deathAnimationSprite = undefined;
                        return;
                    }

                    // ✅ Получаем анимацию напрямую из менеджера анимаций
                    const anim = this.anims.get('enemy_death');
                    if (anim && anim.frames && anim.frames.length > 0) {
                        if ((deathSprite as any)._animationInitialized !== true) {
                            (deathSprite as any)._animationTimer = 0;
                            (deathSprite as any)._animationFrameIndex = 0;
                            (deathSprite as any)._lastFrameShown = false; // ✅ Сбрасываем флаг последнего кадра
                            const frameRate = anim.frameRate || 12;
                            (deathSprite as any)._animationInterval = 1000 / frameRate;
                            (deathSprite as any)._animationInitialized = true;

                            // Логируем только при инициализации, чтобы не засорять логи
                            if (index === 0) { // Логируем только для первого врага
                                logger.log('ENEMY_ANIMATION_SYNC', 'Initializing frame sync', {
                                    enemyIndex: index,
                                    frameRate,
                                    animationInterval: (deathSprite as any)._animationInterval,
                                    totalFrames: anim.frames.length
                                });
                            }
                        }

                        const delta = this.game.loop.delta;
                        (deathSprite as any)._animationTimer += delta;

                        if ((deathSprite as any)._animationTimer >= (deathSprite as any)._animationInterval) {
                            (deathSprite as any)._animationTimer = 0;
                            const maxFrameIndex = anim.frames.length - 1;
                            const oldFrameIndex = (deathSprite as any)._animationFrameIndex;

                            // ✅ Позволяем анимации проиграться полностью, включая последний кадр
                            if ((deathSprite as any)._animationFrameIndex < maxFrameIndex) {
                                (deathSprite as any)._animationFrameIndex++;
                            }

                            // Логируем только при изменении кадра и только для первого врага
                            if (index === 0 && oldFrameIndex !== (deathSprite as any)._animationFrameIndex) {
                                logger.log('ENEMY_ANIMATION_SYNC', 'Frame updated', {
                                    enemyIndex: index,
                                    oldFrameIndex,
                                    newFrameIndex: (deathSprite as any)._animationFrameIndex,
                                    maxFrameIndex,
                                    reachedLastFrame: (deathSprite as any)._animationFrameIndex >= maxFrameIndex
                                });
                            }

                            const currentFrameIndex = Math.min((deathSprite as any)._animationFrameIndex, maxFrameIndex);
                            const animFrame = anim.frames[currentFrameIndex];
                            if (animFrame && animFrame.frame) {
                                const animFrameObj = animFrame.frame;
                                let frameIndex: number | undefined;

                                if (animFrameObj && typeof animFrameObj === 'object' && (animFrameObj as any).frame !== undefined) {
                                    frameIndex = (animFrameObj as any).frame;
                                } else if ((animFrameObj as any)?.index !== undefined) {
                                    frameIndex = (animFrameObj as any).index;
                                } else if (animFrameObj?.name !== undefined) {
                                    const nameAsNum = parseInt(String(animFrameObj.name), 10);
                                    if (!isNaN(nameAsNum)) {
                                        frameIndex = nameAsNum;
                                    }
                                } else if (typeof animFrameObj === 'number') {
                                    frameIndex = animFrameObj;
                                }

                                if (frameIndex !== undefined) {
                                    deathSprite.setFrame(frameIndex);

                                    // ✅ Если это последний кадр, уничтожаем спрайт сразу после его установки
                                    const reachedLastFrame = (deathSprite as any)._animationFrameIndex >= maxFrameIndex;
                                    if (reachedLastFrame && !(deathSprite as any)._lastFrameShown) {
                                        (deathSprite as any)._lastFrameShown = true;

                                        if (index === 0) {
                                            logger.log('ENEMY_ANIMATION_SYNC', 'Last frame set, destroying sprite immediately', {
                                                enemyIndex: index,
                                                frameIndex: (deathSprite as any)._animationFrameIndex,
                                                maxFrameIndex
                                            });
                                        }

                                        // ✅ Уничтожаем спрайт сразу после установки последнего кадра
                                        // Не используем задержку - уничтожаем сразу, так как кадр уже установлен
                                        if (deathSprite && deathSprite.active) {
                                            deathSprite.destroy();
                                            (enemy as any).deathAnimationSprite = undefined;

                                            if (index === 0) {
                                                logger.log('ENEMY_ANIMATION_SYNC', 'Sprite destroyed after last frame', {
                                                    enemyIndex: index
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Логируем, если спрайт активен, но анимация не найдена
                        if (index === 0) {
                            logger.log('ENEMY_ANIMATION_SYNC', 'Sprite active but animation not found', {
                                enemyIndex: index,
                                spriteActive: deathSprite.active,
                                hasAnims: !!deathSprite.anims,
                                hasCurrentAnim: !!deathSprite.anims?.currentAnim
                            });
                        }
                    }
                }
            });
        }
    }

    // --- Collision Handlers ---

    private handlePlayerEnemyCollision(enemy: AbstractEnemy): void {
        if (!this.sys.settings.active) return;
        const enemySprite = enemy.getSprite();
        if (!enemySprite || !enemySprite.active) return;

        // ✅ Cooldown для предотвращения множественных столкновений с ЭТИМ конкретным врагом
        const now = this.time.now;
        const lastCollisionTime = (enemy as any).lastCollisionTime || 0;
        const collisionCooldown = (enemy as any).COLLISION_COOLDOWN || 500;

        if (now - lastCollisionTime < collisionCooldown) {
            return; // Игнорируем столкновение, если прошло меньше времени cooldown для этого врага
        }
        (enemy as any).lastCollisionTime = now;

        // ✅ Получаем урон из конфига врага
        const enemyDamage = enemy.getDamage();

        // ✅ Вычисляем направление от врага к игроку для отбрасывания
        // Это гарантирует одинаковую силу отбрасывания при каждом столкновении
        const playerSprite = this.player.getSprite();
        const playerPos = { x: playerSprite.x, y: playerSprite.y };
        const enemyPos = { x: enemySprite.x, y: enemySprite.y };

        // Вектор от врага к игроку (направление отбрасывания)
        const directionX = playerPos.x - enemyPos.x;
        const directionY = playerPos.y - enemyPos.y;

        // ✅ Враг всегда умирает при столкновении
        enemy.onPlayerCollision(this.player.getSprite());

        // ✅ Логика потери ключа у персонажа: если есть ключи - теряется ключ, иначе - здоровье
        const keyCount = this.gameState.getKeys();
        if (keyCount > 0) {
            // У игрока есть ключи - теряется ключ, НЕ теряется здоровье
            this.gameState.removeKey();
            // ✅ Воспроизводим звук потери ключа
            this.audioManager.playDamageKey();
            this.scoreSystem.addScore(-1); // Убираем очко за потерянный ключ
            this.triggerRingLossEffect();
            // ✅ Мигание персонажа при потере ключа
            logger.log('FLASH_PLAYER', 'Calling flashPlayerLoseKey from handlePlayerEnemyCollision', {
                keyCount: this.gameState.getKeys()
            });
            this.flashPlayerLoseKey();
            // ✅ Проигрываем анимацию потери ключа через машину состояний
            this.player.loseKey();
        } else {
            // У игрока нет ключей - теряется здоровье
            // ✅ Используем машину состояний для получения урона
            // Передаем направление от врага к игроку для отбрасывания
            this.player.takeDamage(directionX, directionY);
            this.audioManager.playDamage();

            // ✅ Обработка завершения анимации повреждения
            const handleDamageComplete = () => {
                const isAlive = this.healthSystem.takeDamage(enemyDamage);
                if (!isAlive) {
                    // Переходим в состояние смерти (спрайт уже установлен в finishDamage)
                    this.player.finishDamage(false);
                    // ✅ Воспроизводим звук смерти персонажа
                    this.audioManager.playCharacterDead();
                    // Показываем окно проигрыша с задержкой (спрайт смерти уже показан)
                    this.time.delayedCall(1000, () => {
                        this.handleGameOver('lose');
                    });
                } else {
                    // Возвращаемся к нормальному состоянию
                    this.player.finishDamage(true);
                }
                this.updateHUD();
            };

            // Ждем завершения анимации повреждения (событие будет вызвано вручную в update())
            playerSprite.once('animationcomplete', (animation: Phaser.Animations.Animation) => {
                if (animation.key === 'character_damaged') {
                    handleDamageComplete();
                }
            });
        }
        this.updateHUD();
    }

    private handlePlayerHeartCollision(heart: Phaser.Physics.Arcade.Sprite): void {
        if (!this.sys.settings.active) return;
        const health = this.healthSystem.getHealth();
        if (health < MAX_HEALTH && heart && heart.active) {
            this.healthSystem.addHealth(1);
            heart.destroy();
            // Воспроизводим звук подбора жизни
            this.audioManager.playPickupLife();
            this.updateHUD();
        }
    }

    private async handlePlayerKeyCollision(key: Phaser.Physics.Arcade.Sprite): Promise<void> {
        if (!this.sys.settings.active || !key || !key.active) return;

        // ✅ Calculate keyId for cleanup (use rounded coordinates for consistency)
        const keyId = `key-${Math.round(key.x)}-${Math.round(key.y)}`;

        // ✅ ROBUST DEBOUNCE: Используем таймштамп вместо булевого флага
        // Это решает проблему "застрявшего" флага при Object Pooling и двойного подбора
        const now = this.time.now;
        const lastTouch = (key as any).lastTouchTime || 0;

        // Дебаунс 500мс
        if (now - lastTouch < 500) {
            console.log('🔑 Key debounce active, ignoring');
            this.collisionSystem?.clearProcessingKey(keyId); // ✅ Fix: Clear processing flag for debounce
            return;
        }

        console.log('🔑 Key Collision Validated. Processing...');
        (key as any).lastTouchTime = now;

        const keyCount = this.gameState.getKeys();
        // ✅ Используем конфигурируемое значение из GameState
        const maxKeys = this.gameState.getState().maxKeys;

        if (keyCount >= maxKeys) {
            const now = this.time.now;
            if (now - this.lastFullWarningTime > 1000) {
                this.showFloatingText(
                    this.player.getX(),
                    this.player.getY() - 50,
                    "BAG FULL!",
                    0xff9900
                );
                this.lastFullWarningTime = now;
            }
            // ✅ Fix: Clear processing flag to prevent jamming
            this.collisionSystem?.clearProcessingKey(keyId);
            return;
        }

        // ✅ Check for state lock (e.g. losing key animation)
        // If player is busy losing a key, ignore new pickups for a moment
        if (this.player.getState() === PlayerState.LOSING_KEY) {
            this.collisionSystem?.clearProcessingKey(keyId);
            return;
        }



        // Воспроизводим звук подбора ключа
        this.audioManager.playPickupKey();

        // ✅ Используем машину состояний для перехода в состояние вопроса
        this.player.enterQuiz();

        // Останавливаем игрока
        this.player.stop();

        // НЕ паузим сцену полностью - это блокирует input для UI
        // Вместо этого останавливаем только физику и обновление игрока
        this.physics.pause();

        // ✅ Отключаем клавиатуру и сбрасываем состояние клавиш
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
            // Сбрасываем состояние всех клавиш, чтобы предотвратить продолжение движения
            this.input.keyboard.resetKeys();
        }

        // ВАЖНО: Включаем pointer input для модального окна
        this.input.enabled = true;
        this.input.setTopOnly(false);

        // Сохраняем ссылку на ключ и его ID
        this.currentKeySprite = key;
        this.currentKeyId = keyId;

        // Загружаем случайный мини-квиз
        try {
            const currentLevel = this.levelManager.getCurrentLevel();
            // Обновляем currentLevel в scene.data для доступа из модальных окон
            this.data.set('currentLevel', currentLevel);
            console.log('MainScene: Loading quiz for level:', currentLevel);
            // ✅ ИСПОЛЬЗУЕМ ПРЕДЗАПОЛНЕННЫЕ ДАННЫЕ ВОПРОСА
            let questionData = key.getData('questionData');

            if (!questionData) {
                console.log('ℹ️ MainScene: Key has no pre-assigned question, picking random');
                questionData = await this.quizManager.getRandomMiniQuiz(currentLevel);
            } else {
                console.log('✅ MainScene: Using unique pre-assigned question:', questionData.questionText);
            }

            console.log('MainScene: Quiz data loaded:', questionData);

            // ✅ Сохраняем данные вопроса для последующей проверки уникальности в handleKeyQuizCorrect
            // Используем отдельное поле, чтобы не перезаписывать глобальный вопрос портала
            this.currentMiniQuizData = questionData;

            // Создаем модальное окно вопроса
            console.log('MainScene: Creating KeyQuestionModal...');
            console.log('MainScene: Scene state - isPaused:', this.scene.isPaused(), 'physics paused:', this.physics.world.isPaused);

            // Обновляем currentLevel в scene.data перед событием
            this.data.set('currentLevel', currentLevel);

            // ВАЖНО: Включаем input для UI элементов
            this.input.enabled = true;
            this.input.setTopOnly(false);

            // Emit SHOW_KEY_QUIZ event
            EventBus.emit(EVENTS.SHOW_KEY_QUIZ, { question: questionData });
            console.log('MainScene: SHOW_KEY_QUIZ event emitted');

        } catch (error) {
            console.error('MainScene: Failed to load quiz question:', error);
            // Fallback: используем вопросы по умолчанию из констант
            const fallbackQuestions = [
                { question: "2 + 2 = ?", correctAnswer: "4", wrongAnswers: ["3", "5"], feedbacks: ["Правильно!"], wrongFeedbacks: ["Неверно"] },
                { question: "Grass color?", correctAnswer: "Green", wrongAnswers: ["Red", "Blue"], feedbacks: ["Правильно!"], wrongFeedbacks: ["Неверно"] }
            ];
            const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

            // Конвертируем в ParsedQuestion формат
            const parsedQuestion = {
                type: QuestionType.TEXT_ONLY,
                questionText: randomQuestion.question,
                image: undefined,
                correctAnswer: randomQuestion.correctAnswer,
                wrongAnswers: randomQuestion.wrongAnswers,
                allAnswers: [randomQuestion.correctAnswer, ...randomQuestion.wrongAnswers].sort(() => Math.random() - 0.5),
                feedbacks: randomQuestion.feedbacks,
                wrongFeedbacks: randomQuestion.wrongFeedbacks
            };

            // Обновляем currentLevel в scene.data перед созданием модального окна
            const currentLevel = this.levelManager.getCurrentLevel();
            this.data.set('currentLevel', currentLevel);

            // Включаем input
            this.input.enabled = true;
            this.input.setTopOnly(false);

            // Emit SHOW_KEY_QUIZ event
            EventBus.emit(EVENTS.SHOW_KEY_QUIZ, { question: parsedQuestion });
        }
    }



    private handleKeyQuizCorrect(questionData?: ParsedQuestion): void {
        if (this.currentKeySprite) {
            this.currentKeySprite.destroy();
            this.currentKeySprite = null;
        }

        // ✅ Clear processing key
        if (this.currentKeyId) {
            this.collisionSystem?.clearProcessingKey(this.currentKeyId);
            this.currentKeyId = null;
        }

        // ✅ Определяем уникальность вопроса для начисления баллов
        let isUnique = true;
        if (questionData && questionData.questionText) {
            if (this.answeredQuestions.has(questionData.questionText)) {
                isUnique = false;
            } else {
                this.answeredQuestions.add(questionData.questionText);
            }
        }

        this.gameState.addKey();
        this.scoreSystem.addKeyScore(isUnique);

        // ✅ Воспроизводим звук успешного взятия ключа (одновременно с анимацией)
        this.audioManager.playSuccessKey();

        // ✅ Мигание персонажа при взятии ключа
        logger.log('FLASH_PLAYER', 'Calling flashPlayerGetKey from handleKeyQuizCorrect', {
            keyCount: this.gameState.getKeys()
        });
        this.flashPlayerGetKey();
        // ✅ Используем машину состояний для получения ключа
        this.player.getKey();
        this.resumeGame();
        this.updateHUD();
    }

    private handleKeyQuizWrong(damage: number = 1): void {
        // ✅ Используем урон из вопроса (по умолчанию 1)
        const isAlive = this.healthSystem.takeDamage(damage);
        // ✅ Звук damage не воспроизводится в окне минивопроса - только при получении урона на карте
        this.updateHUD();

        // ✅ Если жизни закончились, закрываем модальное окно и показываем Game Over
        if (!isAlive) {
            console.log('❌ Game Over: No lives left after wrong answer');
            // Удаляем ключ
            if (this.currentKeySprite) {
                this.currentKeySprite.destroy();
                this.currentKeySprite = null;
            }

            // ✅ Clear processing key
            if (this.currentKeyId) {
                this.collisionSystem?.clearProcessingKey(this.currentKeyId);
                this.currentKeyId = null;
            }

            // ✅ Выходим из состояния вопроса
            this.player.exitQuiz();

            // ✅ Переходим в состояние смерти (без анимации повреждения, т.к. это не столкновение)
            this.player.setState(PlayerState.DEAD);
            // ✅ Воспроизводим звук смерти персонажа
            this.audioManager.playCharacterDead();

            // Показываем Game Over с задержкой
            this.time.delayedCall(1000, () => {
                this.handleGameOver('lose');
            });
        } else {
            // ✅ Выходим из состояния вопроса
            this.player.exitQuiz();

            // ✅ Fix: Clear processing flag for the key so it can be picked up again
            if (this.currentKeyId) {
                this.collisionSystem?.clearProcessingKey(this.currentKeyId);
                this.currentKeyId = null;
            }
        }
    }

    private handleKeyQuizClose(): void {
        if (this.currentKeySprite) {
            this.currentKeySprite.destroy();
            this.currentKeySprite = null;
        }

        // ✅ Clear processing key
        if (this.currentKeyId) {
            this.collisionSystem?.clearProcessingKey(this.currentKeyId);
            this.currentKeyId = null;
        }

        this.resumeGame();
    }

    private handlePlayerOracleCollision(): void {
        // ✅ Проверяем, не активирован ли уже оракул
        console.log('🔵 MainScene.handlePlayerOracleCollision: Called');
        console.log('🔵 MainScene: oracle.isActivated():', this.oracle.isActivated());
        console.log('🔵 MainScene: oracle.getState():', this.oracle.getState());
        console.log('🔵 MainScene: oracle.getStoredKeys():', this.oracle.getStoredKeys());

        if (this.oracle.isActivated()) {
            console.log('⚠️ MainScene: Oracle already activated, returning');
            return;
        }

        const now = this.time.now;
        if (now - this.lastDepositTime < 500) {
            console.log('⚠️ MainScene: Too soon since last deposit, returning');
            return;
        }

        const keyCount = this.gameState.getKeys();
        console.log('🔵 MainScene: keyCount from gameState:', keyCount);

        if (keyCount > 0) {
            console.log('🔵 MainScene: Calling oracle.depositKey()...');
            // ✅ Используем метод depositKey() класса Oracle
            const keyDeposited = this.oracle.depositKey();
            console.log('🔵 MainScene: oracle.depositKey() returned:', keyDeposited);

            if (keyDeposited) {
                this.gameState.removeKey();
                this.lastDepositTime = now;

                // Воспроизводим звук применения ключа к оракулу
                this.audioManager.playApplyKey();

                // ✅ Используем машину состояний для применения ключа
                this.player.applyKey();

                // ✅ Визуальный эффект мигания убран - теперь используется анимация активации оракула

                // ✅ Обновляем метку оракула
                const storedKeys = this.oracle.getStoredKeys();
                console.log('🔵 MainScene: storedKeys after deposit:', storedKeys);
                this.oracleLabel.setText(`ORACLE (${storedKeys}/3)`);
                this.updateHUD();

                // ✅ Если все ключи собраны, активируем оракул
                if (storedKeys >= 3) {
                    this.isOracleActivated = true;
                    this.gameState.setOracleActivated(true);
                    this.oracleLabel.setText('ORACLE ACTIVE').setColor(ORACLE_LABEL_ACTIVE_COLOR);

                    // Воспроизводим звук активации оракула
                    this.audioManager.playOracleActivated();

                    // ✅ Машина состояний Oracle автоматически переключится на ACTIVATED после завершения ACTIVATING
                    // Состояние изменится в методе setActivatingState() класса Oracle

                    // Показываем прогресс порталов
                    this.portalInstances.forEach(portal => {
                        const sprite = portal.getSprite();
                        const progressText = sprite.getData('progressText');
                        if (progressText) {
                            progressText.setVisible(true);
                        }
                    });

                    // Показываем глобальный вопрос
                    console.log('🔵 Calling showGlobalQuestion() from handlePlayerOracleCollision');
                    this.safeShowGlobalQuestion();

                    // ✅ Настраиваем обработчик кликов по Оракулу для переключения видимости баббла
                    this.setupOracleClickHandler();

                    if (DEBUG_UI_ENABLED) {
                        this.updateHUD();
                    }
                }
            }
        }
    }



    private handlePortalSolidCollision(portal: AbstractPortal): void {
        if (!this.isOracleActivated) return;

        const isOpen = portal.isOpen();
        const now = this.time.now;

        // ✅ Разрешаем депозит ключей во время активации (но не когда уже открыт)
        if (!isOpen && now - this.lastDepositTime > 500) {
            const keyCount = this.gameState.getKeys();
            const storedKeys = portal.getStoredKeys();

            if (keyCount > 0 && storedKeys < 3) {
                // ✅ Try to deposit key first
                if (portal.depositKey()) {
                    this.gameState.removeKey();

                    this.lastDepositTime = now;

                    // Воспроизводим звук применения ключа к порталу
                    this.audioManager.playApplyKey();

                    // ✅ Проигрываем анимацию применения ключа
                    this.player.playApplyKeyAnimation();
                } else {
                    console.log('🔒 MainScene: Portal rejected key solid collision (busy or full)');
                }

                // ✅ Звук активации портала теперь воспроизводится в методе activate() класса AbstractPortal
                // одновременно с началом анимации активации

                this.updateHUD();
            }
        }
    }

    private async handlePortalOverlapEntry(portal: AbstractPortal): Promise<void> {
        // ✅ Логирование для диагностики
        const portalState = portal.getState();
        const storedKeys = portal.getStoredKeys();
        const now = this.time.now;
        console.log('🔵 handlePortalOverlapEntry called:', {
            isOpen: portal.isOpen(),
            isActivating: portal.isActivating(),
            mustExit: portal.mustExit(),
            // hasCurrentModal check removed (UIManager handles it)
            hasPendingPortal: !!this.pendingPortal,
            portalState: portalState,
            storedKeys: storedKeys,
            portalId: portal.getConfig().id,
            cooldownActive: now < this.portalModalCooldown,
            cooldownRemaining: Math.max(0, this.portalModalCooldown - now)
        });

        // ✅ Проверка cooldown - защита от немедленного повторного открытия после CANCEL
        if (now < this.portalModalCooldown) {
            console.log('🔵 handlePortalOverlapEntry: Early return (cooldown active)', {
                cooldownRemaining: this.portalModalCooldown - now
            });
            return;
        }

        if (portal.isActivating()) {
            return;
        }



        // Если портал закрыт - проверяем mustExit (выход после отказа от входа)
        if (portal.mustExit()) {
            console.log('🔵 handlePortalOverlapEntry: Early return (portal not ready or mustExit)', {
                isOpen: portal.isOpen(),
                isActivating: portal.isActivating(),
                mustExit: portal.mustExit(),
                state: portalState,
                storedKeys: storedKeys
            });
            return;
        }



        // ✅ Не открываем модальное окно, если уже есть pendingPortal
        if (this.pendingPortal) {
            console.log('🔵 handlePortalOverlapEntry: Early return (pendingPortal exists)');
            return;
        }

        // ✅ Расстояние уже проверено в processCallback CollisionSystem (< 30 пикселей)
        // Если мы здесь, значит персонаж находится близко к центру портала
        // Не нужно проверять расстояние снова - просто открываем модальное окно

        // ✅ КРИТИЧНО: Устанавливаем mustExit ПЕРЕД открытием модального окна
        // Это предотвращает повторное открытие, пока игрок находится в зоне портала
        portal.setMustExit();

        // ✅ AB-ТЕСТИРОВАНИЕ: Мгновенный вход без подтверждения
        if (AB_TESTING && AB_TESTING.ENABLE_PORTAL_CONFIRMATION === false) {
            console.log('🔵 handlePortalOverlapEntry: IMMEADIATE ENTRY (AB-Test ENABLE_PORTAL_CONFIRMATION=false)');

            // Устанавливаем флаги защиты от повторного входа
            portal.setMustExit();
            this.pendingPortal = portal;
            this.collisionSystem.disablePortalOverlap();

            // Останавливаем игрока и физику (как при обычном подтверждении)
            this.player.enterPortal();
            this.player.stop();
            this.physics.pause();
            if (this.input.keyboard) this.input.keyboard.enabled = false;

            // Сразу переходим к обработке входа
            this.handlePortalEntry(portal);
            return;
        }

        // ✅ Сначала устанавливаем pendingPortal, чтобы предотвратить повторное открытие
        this.pendingPortal = portal;

        // ✅ Отключаем overlap коллайдер с порталами, чтобы предотвратить повторное открытие
        // пока модальное окно открыто или только что закрылось
        this.collisionSystem.disablePortalOverlap();

        // ✅ Используем машину состояний для входа в портал
        this.player.enterPortal();

        // Пауза игры
        this.player.stop();
        this.physics.pause();

        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        // ✅ ВАЖНО: Включаем input для модального окна
        this.input.enabled = true;
        this.input.setTopOnly(false);

        // ✅ ИСПОЛЬЗУЕМ НОВЫЙ PORTAL MODAL via Events
        this.eventBus.emit(EVENTS.PORTAL_ENTER, {
            portal,
            globalQuestion: this.currentGlobalQuestionData
        });
    }


    /**
     * ✅ НОВЫЙ МЕТОД: Обработка входа в портал
     */
    private handlePortalEntry(portal: AbstractPortal): void {
        // ✅ REMOVED: if (portal.mustExit()) return; 
        // We handle mustExit logic in the Caller (overlap or modal confirm).
        // Checking it here causes logic failure because caller sets it TRUE before calling.

        console.log('🔵 MainScene.handlePortalEntry: Called with portal:', {
            portalId: portal.getConfig().id,
            isCorrect: portal.getConfig().isCorrect,
            answerText: portal.getConfig().answerText
        });

        const config = portal.getConfig();

        if (config.isCorrect) {
            console.log('✅ PortalModal: Correct portal - WIN!');
            this.scoreSystem.addPortalScore();
            this.handleGameOver('win');
        } else {
            console.log('❌ PortalModal: Wrong portal - IMMEDIATE GAME OVER (lose)');
            // ✅ В базовой реализации вход в неправильный портал = немедленный проигрыш
            // НЕ применяется урон, НЕ проверяется здоровье - сразу Game Over
            // ✅ Выходим из состояния портала
            this.player.exitPortal();

            // ✅ Переходим в состояние смерти (без анимации повреждения, т.к. это не столкновение)
            this.player.setState(PlayerState.DEAD);
            // ✅ Воспроизводим звук смерти персонажа
            this.audioManager.playCharacterDead();

            // Показываем Game Over с задержкой
            this.time.delayedCall(1000, () => {
                this.handleGameOver('lose');
            });
        }
    }

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

            // Возобновляем сцену если она была на паузе
            if (this.scene && this.scene.isPaused()) {
                this.scene.resume();
            }
        } catch (e) {
            console.log('Error resuming scene:', e);
        }
    }

    private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number = 0xffffff, duration: number = 1000, onComplete?: () => void): void {
        // ✅ Сохраняем оригинальный blend mode
        const originalBlendMode = sprite.blendMode;
        // ✅ Используем ADD blend mode вместо Multiply (делает светлее, не черным)
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        sprite.setTint(color);
        this.tweens.add({
            targets: sprite,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                // ✅ Восстанавливаем оригинальный blend mode
                sprite.setBlendMode(originalBlendMode);
                sprite.clearTint();
                sprite.setAlpha(1);
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * ✅ Мигание персонажа при потере ключа
     * Мигание между белым прозрачным и оригинальным цветом непрозрачным
     */
    private flashPlayerLoseKey(): void {
        logger.log('FLASH_PLAYER', 'flashPlayerLoseKey called', {
            hasPlayer: !!this.player,
            hasSprite: !!this.player?.getSprite(),
            spriteActive: this.player?.getSprite()?.active,
            hasActiveInterval: !!this.playerFlashLoseKeyInterval
        });

        const playerSprite = this.player.getSprite();
        if (!playerSprite || !playerSprite.active) {
            logger.warn('FLASH_PLAYER', 'flashPlayerLoseKey early return - sprite not available', {
                hasSprite: !!playerSprite,
                spriteActive: playerSprite?.active
            });
            return;
        }

        // ✅ Очищаем предыдущий интервал мигания, если он существует
        if (this.playerFlashLoseKeyInterval) {
            logger.log('FLASH_PLAYER', 'Clearing previous lose key flash interval', {
                intervalActive: this.playerFlashLoseKeyInterval.hasDispatched
            });
            this.playerFlashLoseKeyInterval.destroy();
            this.playerFlashLoseKeyInterval = null;
            // Восстанавливаем оригинальный вид персонажа
            playerSprite.clearTint();
            playerSprite.setAlpha(1);
            playerSprite.setBlendMode(Phaser.BlendModes.NORMAL);
        }

        // Сохраняем оригинальный alpha и blend mode
        const originalAlpha = playerSprite.alpha;
        const originalBlendMode = playerSprite.blendMode;

        logger.log('FLASH_PLAYER', 'Starting lose key flash animation', {
            originalAlpha,
            originalBlendMode,
            spriteX: playerSprite.x,
            spriteY: playerSprite.y
        });

        // Мигание: белый прозрачный <-> оригинальный цвет непрозрачный
        // Используем time.addEvent для более точного контроля
        let flashCount = 0;
        const maxFlashes = 10; // 10 миганий
        const flashDelay = 100; // Унифицированная скорость мигания

        // ✅ Начинаем мигание сразу (первое состояние - белый прозрачный)
        // Используем ADD blend mode для белого (делает светлее, не черным)
        playerSprite.setBlendMode(Phaser.BlendModes.ADD);
        playerSprite.setTint(0xffffff);
        playerSprite.setAlpha(0.3);
        flashCount++;

        const flashInterval = this.time.addEvent({
            delay: flashDelay,
            callback: () => {
                if (flashCount >= maxFlashes) {
                    logger.log('FLASH_PLAYER', 'Lose key flash completed, destroying interval', {
                        flashCount,
                        maxFlashes
                    });
                    flashInterval.destroy();
                    this.playerFlashLoseKeyInterval = null; // ✅ Очищаем ссылку
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.clearTint();
                    playerSprite.setAlpha(originalAlpha);
                    return;
                }

                if (flashCount % 2 === 0) {
                    // Четное - белый прозрачный
                    logger.log('FLASH_PLAYER', 'Lose key flash - setting white transparent', {
                        flashCount,
                        isEven: true
                    });
                    playerSprite.setBlendMode(Phaser.BlendModes.ADD);
                    playerSprite.setTint(0xffffff);
                    playerSprite.setAlpha(0.3);
                } else {
                    // Нечетное - оригинальный цвет непрозрачный
                    logger.log('FLASH_PLAYER', 'Lose key flash - clearing tint, restoring original', {
                        flashCount,
                        isEven: false
                    });
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.clearTint();
                    playerSprite.setAlpha(originalAlpha);
                }

                flashCount++;
            },
            loop: true
        });

        // ✅ Сохраняем ссылку на интервал для возможной очистки
        this.playerFlashLoseKeyInterval = flashInterval;

        logger.log('FLASH_PLAYER', 'Lose key flash interval created', {
            delay: flashDelay,
            maxFlashes: 10,
            startedImmediately: true
        });
    }

    /**
     * ✅ Мигание персонажа при взятии ключа
     * Мигание между белым непрозрачным и своим цветом непрозрачным
     * Используем двойное наложение ADD blend mode для более яркого белого эффекта
     */
    private flashPlayerGetKey(): void {
        logger.log('FLASH_PLAYER', 'flashPlayerGetKey called', {
            hasPlayer: !!this.player,
            hasSprite: !!this.player?.getSprite(),
            spriteActive: this.player?.getSprite()?.active,
            hasActiveInterval: !!this.playerFlashGetKeyInterval
        });

        const playerSprite = this.player.getSprite();
        if (!playerSprite || !playerSprite.active) {
            logger.warn('FLASH_PLAYER', 'flashPlayerGetKey early return - sprite not available', {
                hasSprite: !!playerSprite,
                spriteActive: playerSprite?.active
            });
            return;
        }

        // ✅ Очищаем предыдущие интервалы и спрайты, если они существуют
        if (this.playerFlashGetKeyInterval) {
            logger.log('FLASH_PLAYER', 'Clearing previous get key flash interval', {
                intervalActive: this.playerFlashGetKeyInterval.hasDispatched
            });
            this.playerFlashGetKeyInterval.destroy();
            this.playerFlashGetKeyInterval = null;
        }
        if (this.playerFlashGetKeyPositionTimer) {
            this.playerFlashGetKeyPositionTimer.destroy();
            this.playerFlashGetKeyPositionTimer = null;
        }
        // Уничтожаем предыдущие спрайты мигания
        this.playerFlashGetKeySprites.forEach(sprite => {
            if (sprite && sprite.active) {
                sprite.destroy();
            }
        });
        this.playerFlashGetKeySprites = [];

        // Сохраняем оригинальный alpha и blend mode
        const originalAlpha = playerSprite.alpha;
        const originalBlendMode = playerSprite.blendMode;

        logger.log('FLASH_PLAYER', 'Starting get key flash animation with double ADD blend', {
            originalAlpha,
            originalBlendMode,
            spriteX: playerSprite.x,
            spriteY: playerSprite.y
        });

        // Устанавливаем непрозрачность сразу
        playerSprite.setAlpha(1.0);

        // ✅ Создаем два белых спрайта поверх персонажа для двойного наложения ADD
        const currentFrame = playerSprite.frame.name;

        // Первый белый спрайт
        const whiteFlashSprite1 = this.add.sprite(
            playerSprite.x,
            playerSprite.y,
            'character_walk_sheet',
            currentFrame
        );
        whiteFlashSprite1.setDepth(playerSprite.depth + 1);
        whiteFlashSprite1.setScale(playerSprite.scaleX, playerSprite.scaleY);
        whiteFlashSprite1.setOrigin(playerSprite.originX, playerSprite.originY);
        whiteFlashSprite1.setScrollFactor(playerSprite.scrollFactorX, playerSprite.scrollFactorY);
        whiteFlashSprite1.setBlendMode(Phaser.BlendModes.ADD);
        whiteFlashSprite1.setTint(0xffffff);
        whiteFlashSprite1.setAlpha(1.0);

        // Второй белый спрайт для двойного наложения
        const whiteFlashSprite2 = this.add.sprite(
            playerSprite.x,
            playerSprite.y,
            'character_walk_sheet',
            currentFrame
        );
        whiteFlashSprite2.setDepth(playerSprite.depth + 2);
        whiteFlashSprite2.setScale(playerSprite.scaleX, playerSprite.scaleY);
        whiteFlashSprite2.setOrigin(playerSprite.originX, playerSprite.originY);
        whiteFlashSprite2.setScrollFactor(playerSprite.scrollFactorX, playerSprite.scrollFactorY);
        whiteFlashSprite2.setBlendMode(Phaser.BlendModes.ADD);
        whiteFlashSprite2.setTint(0xffffff);
        whiteFlashSprite2.setAlpha(1.0);

        // Мигание: белый непрозрачный <-> свой цвет непрозрачный
        let flashCount = 0;
        const maxFlashes = 10; // 10 миганий
        const flashDelay = 100; // Унифицированная скорость мигания

        // ✅ Начинаем мигание сразу (первое состояние - белый видимый)
        whiteFlashSprite1.setVisible(true);
        whiteFlashSprite2.setVisible(true);
        flashCount++;

        // ✅ Синхронизируем позицию и кадр с персонажем для обоих спрайтов
        const updatePosition = () => {
            if (playerSprite && playerSprite.active) {
                const currentPlayerFrame = playerSprite.frame.name;

                if (whiteFlashSprite1 && whiteFlashSprite1.active) {
                    whiteFlashSprite1.setPosition(playerSprite.x, playerSprite.y);
                    if (whiteFlashSprite1.frame.name !== currentPlayerFrame) {
                        whiteFlashSprite1.setFrame(currentPlayerFrame);
                    }
                }

                if (whiteFlashSprite2 && whiteFlashSprite2.active) {
                    whiteFlashSprite2.setPosition(playerSprite.x, playerSprite.y);
                    if (whiteFlashSprite2.frame.name !== currentPlayerFrame) {
                        whiteFlashSprite2.setFrame(currentPlayerFrame);
                    }
                }

                return true;
            }
            return false;
        };

        const positionUpdateTimer = this.time.addEvent({
            delay: 16, // ~60 FPS
            callback: updatePosition,
            loop: true
        });

        // ✅ Сохраняем ссылки на спрайты для возможной очистки
        this.playerFlashGetKeySprites.push(whiteFlashSprite1, whiteFlashSprite2);
        this.playerFlashGetKeyPositionTimer = positionUpdateTimer;

        const flashInterval = this.time.addEvent({
            delay: flashDelay,
            callback: () => {
                if (flashCount >= maxFlashes) {
                    logger.log('FLASH_PLAYER', 'Get key flash completed, destroying overlay sprites', {
                        flashCount,
                        maxFlashes
                    });
                    flashInterval.destroy();
                    this.playerFlashGetKeyInterval = null; // ✅ Очищаем ссылку
                    positionUpdateTimer.destroy();
                    this.playerFlashGetKeyPositionTimer = null; // ✅ Очищаем ссылку
                    if (whiteFlashSprite1) {
                        whiteFlashSprite1.destroy();
                    }
                    if (whiteFlashSprite2) {
                        whiteFlashSprite2.destroy();
                    }
                    // Очищаем массив спрайтов
                    this.playerFlashGetKeySprites = [];
                    // Восстанавливаем оригинальный blend mode персонажа
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.setAlpha(originalAlpha);
                    return;
                }

                // Переключаем видимость белых спрайтов
                if (flashCount % 2 === 0) {
                    // Четное - белый видимый (двойное ADD наложение)
                    whiteFlashSprite1.setVisible(true);
                    whiteFlashSprite2.setVisible(true);
                } else {
                    // Нечетное - белый скрыт (показываем оригинальный цвет)
                    whiteFlashSprite1.setVisible(false);
                    whiteFlashSprite2.setVisible(false);
                }

                flashCount++;
            },
            loop: true
        });

        // ✅ Сохраняем ссылку на интервал для возможной очистки
        this.playerFlashGetKeyInterval = flashInterval;

        logger.log('FLASH_PLAYER', 'Get key flash interval created with double ADD blend overlay', {
            delay: flashDelay,
            maxFlashes: 10,
            startedImmediately: true
        });
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

    private showFloatingText(x: number, y: number, message: string, color: number): void {
        if (!this.sys.settings.active) return;

        // ✅ Ищем неактивный текст в пуле, который еще не уничтожен
        let text = this.floatingTextPool.find(t => !t.active && t.scene);

        if (!text) {
            // ✅ Создаем новый, если пул пуст
            // ✅ Floating text - работает в виртуальном разрешении 720×1280
            text = this.add.text(0, 0, '', {
                fontSize: `${FLOATING_TEXT_FONT_SIZE}px`, // ✅ Используем константу
                fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
                fontStyle: FLOATING_TEXT_FONT_STYLE, // ✅ Используем константу
                color: FLOATING_TEXT_COLOR, // ✅ Используем константу (базовый цвет, меняется динамически)
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.floatingTextPool.push(text);
        }

        // ✅ Активируем и настраиваем
        text.setPosition(x, y)
            .setText(message)
            .setColor(`#${color.toString(16).padStart(6, '0')}`)
            .setAlpha(1)
            .setActive(true)
            .setVisible(true);

        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                text.setActive(false).setVisible(false); // ✅ Возвращаем в пул
            }
        });
    }

    // ✅ Метод calculateBubbleY удален - теперь позиционирование баббла выполняется внутри класса Oracle

    private async showGlobalQuestion(): Promise<void> {
        console.log('🔵 showGlobalQuestion() called');

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
            console.log('🔵 Current level:', currentLevel);

            // ✅ ИСПОЛЬЗУЕМ СОХРАНЕННЫЙ ВОПРОС (тот же, что и для порталов)
            if (!this.currentGlobalQuestionData) {
                console.log('🔵 Loading global question...');
                this.currentGlobalQuestionData = await this.quizManager.getRandomGlobalQuestion(currentLevel);
                console.log('✅ Global question selected for display:', this.currentGlobalQuestionData.questionText);
            } else {
                console.log('🔵 Using existing global question:', this.currentGlobalQuestionData.questionText);
            }

            const questionData = this.currentGlobalQuestionData;

            if (!questionData) {
                throw new Error('Question data is null');
            }

            // ✅ AB ТЕСТИРОВАНИЕ: Используем QuestionBubble если флаг включен
            if (USE_QUESTION_BUBBLE) {
                console.log('🔵 Using QuestionBubble for global question');

                // ✅ Используем баббл из класса Oracle (позиционируется относительно реальных координат спрайта)
                await this.oracle.setQuestion(questionData, this.assetLoader);

                console.log('✅ QuestionBubble question set in Oracle');
            } else {
                // ✅ СТАРАЯ РЕАЛИЗАЦИЯ: Используем текст и изображение
                console.log('🔵 Using old implementation for global question');

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

                        console.log('🔵 Loading image from JSON:', {
                            originalImage: questionData.image,
                            imageKey: imageKey,
                            imagePath: questionData.image
                        });

                        // ✅ Загружаем изображение через AssetLoader
                        // Используем оригинальное имя из JSON для пути, но без префикса QuizGame_ для ключа
                        let imagePath = questionData.image;
                        // Убираем префикс QuizGame_ из пути, если он есть
                        imagePath = imagePath.replace(/^QuizGame_/, '');

                        console.log('🔵 Loading image:', {
                            imageKey: imageKey,
                            imagePath: imagePath,
                            originalPath: questionData.image
                        });

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
                        this.globalQuestionImage.setDepth(2); // ✅ Тексты глобальных вопросов - выше травы, но ниже кустов, порталов и остальных объектов
                        console.log('✅ Global question image created at:', oracleX, imageY);

                        // ✅ Масштабируем изображение, если оно слишком большое
                        const maxWidth = 300;
                        const maxHeight = 200;
                        if (this.globalQuestionImage.width > maxWidth || this.globalQuestionImage.height > maxHeight) {
                            const scaleX = maxWidth / this.globalQuestionImage.width;
                            const scaleY = maxHeight / this.globalQuestionImage.height;
                            const scale = Math.min(scaleX, scaleY);
                            this.globalQuestionImage.setScale(scale);
                        }
                        console.log('✅ Question image loaded and displayed:', questionData.image, 'key:', imageKey);
                    } catch (imageError) {
                        console.error('Failed to load question image:', questionData.image, imageError);
                    }
                }

                // ✅ ТЕКСТ ВОПРОСА - работает в виртуальном разрешении 720×1280
                // Позиционируем относительно оракула в мировых координатах
                // ✅ Используем утилиту для расчета позиции (правило: нижняя граница баббла совпадает с верхней границей Оракула)
                const { calculateBubbleY } = require('../utils/BubblePositionCalculator');
                const questionY = calculateBubbleY(oracleY, 'oracle', 'oracle');

                console.log('🔵 Creating question text at:', oracleX, questionY, 'Text:', questionData.questionText);
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
                }).setOrigin(0.5).setDepth(2).setVisible(true); // ✅ Текст глобального вопроса - на уровне текстов

                console.log('✅ Global question text created:', {
                    x: oracleX,
                    y: questionY,
                    text: questionData.questionText,
                    visible: this.globalQuestionText.visible,
                    active: this.globalQuestionText.active,
                    depth: this.globalQuestionText.depth
                });
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
            console.log('🔵 Using QuestionBubble for fallback question');

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

            console.log('✅ Fallback QuestionBubble created');
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
            }).setOrigin(0.5).setDepth(2); // ✅ Fallback текст глобального вопроса - на уровне текстов
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
            console.log('🔵 Oracle click handler already set up');
            return;
        }

        // Делаем спрайт Оракула интерактивным
        oracleSprite.setInteractive({ useHandCursor: true });

        // Обработчик клика
        oracleSprite.on('pointerdown', () => {
            console.log('🔵 Oracle clicked, toggling bubble visibility');
            // ✅ Используем метод Oracle для переключения видимости баббла
            this.oracle.toggleQuestionBubble();
        });

        console.log('✅ Oracle click handler set up');
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
                console.log(`🔵 Portal ${index + 1} click handler already set up`);
                return;
            }

            try {
                // Делаем спрайт портала интерактивным
                portalSprite.setInteractive({ useHandCursor: true });

                // Обработчик клика
                portalSprite.on('pointerdown', () => {
                    // ✅ Блокируем взаимодействие, если Оракул еще не активирован
                    if (this.oracle && !this.oracle.isActivated()) {
                        console.log(`⚠️ Portal ${index + 1} clicked, but Oracle is not activated yet. Ignoring.`);
                        return;
                    }

                    console.log(`🔵 Portal ${index + 1} clicked, toggling bubble visibility`);
                    // ✅ Используем метод AbstractPortal для переключения видимости баббла
                    portal.toggleAnswerBubble();
                });

                console.log(`✅ Portal ${index + 1} click handler set up`);

                // ✅ REMOVED: disableInteractive() logic here. 
                // It conflicted with AbstractPortal's setActivatedState() and prevented bubbles from showing.
                // AbstractPortal handles its own interaction state.
            } catch (e) {
                console.error(`❌ Error setting up portal ${index + 1} click handler:`, e);
            }
        });
    }

    /**
     * Создание HUD в Phaser (Keys, Score и подсказки)
     */
    private createHUD(): void {
        // Инициализируем элементы с дефолтными значениями
        // Нам не нужно их позиционировать здесь, так как updateHUD() сделает это с компенсацией зума

        // 1. Keys HUD
        this.keysHUDText = this.add.text(0, 0, '', {
            fontSize: '24px',
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: 'bold',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0).setDepth(1000).setScrollFactor(0).setVisible(false); // ✅ СКРЫТО по просьбе пользователя

        // 2. Score HUD
        this.scoreHUDText = this.add.text(0, 0, '', {
            fontSize: `${SCORE_HUD_FONT_SIZE}px`,
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: SCORE_HUD_FONT_STYLE,
            color: SCORE_HUD_COLOR,
            stroke: SCORE_HUD_STROKE,
            strokeThickness: SCORE_HUD_STROKE_THICKNESS,
            backgroundColor: '#000000',
            padding: { x: 15, y: 5 }
        }).setOrigin(0.5, 0).setDepth(1000).setScrollFactor(0).setVisible(true);

        // 3. Подсказка
        this.hintText = this.add.text(0, 0, 'Collect 3 Keys and find the Oracle!', {
            fontSize: '20px',
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: 'bold',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#000000',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5, 0.5).setDepth(1000).setScrollFactor(0).setVisible(true);

        // Обновляем видимость и позицию всех элементов HUD сразу после создания
        this.updateHUD();
    }

    private getZoomCompensatedHUDPosition(targetScreenX: number, targetScreenY: number): { x: number, y: number } {
        const cam = this.cameras.main;
        const zoom = cam.zoom;

        // ✅ ВАЖНО: Используем экранные центры камеры для компенсации зума
        // Если использовать worldCenter, HUD будет «плавать» при движении камеры
        const centerX = cam.width / 2;
        const centerY = cam.height / 2;

        const x = centerX + (targetScreenX - centerX) / zoom;
        const y = centerY + (targetScreenY - centerY) / zoom;

        return { x, y };
    }

    /**
     * Обновление HUD (Score, Keys и подсказки)
     * ✅ Внедрена компенсация зума: элементы сохраняют масштаб и позицию на экране
     */
    private updateHUD(): void {
        const zoom = this.cameras.main.zoom;
        const cam = this.cameras.main;
        const invZoom = 1 / zoom;

        // 1. Обновляем Keys HUD (правый верхний угол)
        if (this.keysHUDText && this.keysHUDText.visible) {
            this.keysHUDText.setText(`Keys: ${this.gameState.getKeys()}/${this.gameState.getState().maxKeys}`);
            this.keysHUDText.setScale(invZoom);

            const targetX = cam.width - 20;
            const targetY = 20;
            const pos = this.getZoomCompensatedHUDPosition(targetX, targetY);
            this.keysHUDText.setPosition(pos.x, pos.y);
        }

        // 2. Обновляем Score HUD (верх по центру)
        if (this.scoreHUDText) {
            this.scoreHUDText.setText(`Score: ${this.scoreSystem.getScore()}`);
            this.scoreHUDText.setScale(invZoom);

            const targetX = cam.width / 2;
            const targetY = 20;
            const pos = this.getZoomCompensatedHUDPosition(targetX, targetY);
            this.scoreHUDText.setPosition(pos.x, pos.y);
        }

        // 3. Обновляем подсказку (низ по центру)
        if (this.hintText) {
            this.hintText.setVisible(!this.isOracleActivated);
            this.hintText.setScale(invZoom);

            const targetX = cam.width / 2;
            const targetY = cam.height - 40;
            const pos = this.getZoomCompensatedHUDPosition(targetX, targetY);
            this.hintText.setPosition(pos.x, pos.y);
        }
    }

    private handleGameOver(result: 'win' | 'lose'): void {
        console.log('🎮 MainScene: handleGameOver called with result:', result);
        console.trace('🔵 MainScene: handleGameOver stack trace');

        if (result === 'lose' && this.player.getState() !== PlayerState.DEAD) {
            this.player.setState(PlayerState.DEAD);
            this.audioManager.playCharacterDead();
        }

        this.audioManager.stopMusic();
        this.physics.pause();
        if (this.input.keyboard) {
            this.input.keyboard.enabled = false;
        }

        let gameOverType: GameOverType;
        if (result === 'win') {
            const currentLevel = this.levelManager.getCurrentLevel();
            if (currentLevel >= MAX_LEVELS) {
                gameOverType = GameOverType.WIN_GAME;
            } else {
                gameOverType = GameOverType.WIN_LEVEL;
            }
            this.audioManager.playWinMusic();
        } else {
            gameOverType = GameOverType.LOSE;
            this.audioManager.playGameOverMusic();
        }

        const score = this.scoreSystem.getScore();
        this.gameState.setGameOver(result);

        this.time.delayedCall(1000, async () => {
            let feedbackText = '';

            if (result === 'win') {
                const maxScore = gameOverType === GameOverType.WIN_GAME
                    ? this.scoreSystem.getTotalMaxPossibleScore()
                    : this.scoreSystem.getMaxPossibleScore();

                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const currentLevel = this.levelManager.getCurrentLevel();

                feedbackText = await this.quizManager.getTieredWinMessage(
                    currentLevel,
                    percentage,
                    gameOverType === GameOverType.WIN_GAME ? 'game' : 'level'
                );
            }

            if (gameOverType === GameOverType.WIN_GAME) {
                this.handleGameWin(score, feedbackText);
            } else {
                EventBus.emit(EVENTS.GAME_OVER, {
                    result: result,
                    score: score,
                    feedbackText: feedbackText
                });
            }
            console.log('🎮 MainScene: End of game/level UI displayed');
        });
    }

    private restartGame(): void {
        console.log('🔄 MainScene: Restarting game...');

        if (this.audioManager) {
            this.audioManager.stopMusic();
            this.audioManager.destroy();
        }
        if (this.sound) {
            this.sound.stopAll();
        }

        this.scale.off('resize', this.handleResize, this);

        if (this.grassBackground) {
            try {
                this.grassBackground.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying grassBackground:', e);
            }
        }

        if (this.bushCollisionObjects) {
            try {
                this.bushCollisionObjects.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying bushCollisionObjects:', e);
            }
        }

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

        // ✅ Улучшенная очистка floatingTextPool с проверкой типа
        this.floatingTextPool.forEach(t => {
            if (t) {
                if (typeof t.destroy === 'function') {
                    try {
                        t.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying floating text:', e);
                    }
                }
            }
        });
        this.floatingTextPool = [];

        if (DEBUG_UI_ENABLED && this.debugOverlay) {
            try {
                this.debugOverlay.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying debugOverlay:', e);
            }
        }

        if (this.healthSystem) this.healthSystem.reset();
        if (this.scoreSystem) this.scoreSystem.reset();
        if (this.gameState) this.gameState.reset();
        if (this.levelManager) this.levelManager.reset();
        if (this.player) this.player.reset();

        this.answeredQuestions.clear();
        this.isOracleActivated = false;
        this.lastDepositTime = 0;
        this.pendingPortal = null;
        this.portalModalCooldown = 0;
        this.currentGlobalQuestionData = null;
        this.currentMiniQuizData = null;
        this.lastEnemyCollisionTime = 0;
        this.lastFullWarningTime = 0;

        if (this.playerFlashLoseKeyInterval) {
            this.playerFlashLoseKeyInterval.destroy();
            this.playerFlashLoseKeyInterval = null;
        }
        if (this.playerFlashGetKeyInterval) {
            this.playerFlashGetKeyInterval.destroy();
            this.playerFlashGetKeyInterval = null;
        }
        if (this.playerFlashGetKeyPositionTimer) {
            this.playerFlashGetKeyPositionTimer.destroy();
            this.playerFlashGetKeyPositionTimer = null;
        }

        // ✅ Улучшенная очистка playerFlashGetKeySprites с проверкой типа
        if (this.playerFlashGetKeySprites && this.playerFlashGetKeySprites.length > 0) {
            this.playerFlashGetKeySprites.forEach(sprite => {
                if (sprite) {
                    if (typeof sprite.destroy === 'function') {
                        try {
                            sprite.destroy();
                        } catch (e) {
                            console.warn('⚠️ Error destroying flash key sprite:', e);
                        }
                    }
                }
            });
            this.playerFlashGetKeySprites = [];
        }

        this.tiledPortalsConfig = [];
        this.currentOverlapData = null;
        this.tiledMapInfo = undefined;
        console.log('🔄 MainScene: Tiled Map state cleared');

        // ✅ Улучшенная очистка enemyInstances с проверкой типа
        if (this.enemyInstances && this.enemyInstances.length > 0) {
            console.log(`🔄 MainScene: Destroying ${this.enemyInstances.length} enemy instances`);
            this.enemyInstances.forEach(enemy => {
                if (enemy) {
                    if (typeof enemy.destroy === 'function') {
                        try {
                            enemy.destroy();
                        } catch (e) {
                            console.warn('⚠️ Error destroying enemy instance:', e);
                        }
                    }
                }
            });
            this.enemyInstances = [];
        }

        if (this.enemies) this.enemies.clear(true, true);
        if (this.chasers) this.chasers.clear(true, true);
        if (this.hearts) this.hearts.clear(true, true);
        if (this.keys) this.keys.clear(true, true);

        // ✅ Улучшенная очистка portalInstances с проверкой типа
        if (this.portalInstances && this.portalInstances.length > 0) {
            this.portalInstances.forEach(portal => {
                if (portal) {
                    if (typeof portal.destroy === 'function') {
                        try {
                            portal.destroy();
                        } catch (e) {
                            console.warn('⚠️ Error destroying portal:', e);
                        }
                    }
                }
            });
            this.portalInstances = [];
        }

        if (this.portals) {
            try {
                this.portals.clear(true, true);
            } catch (e) {
                console.warn('⚠️ Error clearing portals group:', e);
            }
        }

        if (this.oracle) this.oracle.reset();

        if (this.oracleLabel) {
            this.oracleLabel.setText('ORACLE (0/3)').setColor(ORACLE_LABEL_COLOR);
        }

        if (this.physics && this.physics.world && this.physics.world.isPaused) {
            console.log('🔄 MainScene: Resuming physics before restart');
            this.physics.resume();
        }

        if (this.scene && this.scene.isPaused && this.scene.isPaused()) {
            console.log('🔄 MainScene: Resuming scene before restart');
            this.scene.resume();
        }

        if (this.input) {
            this.input.enabled = true;
            if (this.input.keyboard) {
                this.input.keyboard.enabled = true;
                this.input.keyboard.resetKeys();
            }
        }

        console.log('🔄 MainScene: Restarting scene');
        const game = this.game;
        this.scene.stop('MainScene');
        requestAnimationFrame(() => {
            console.log('🔄 MainScene: Starting MainScene via game.scene.start()');
            game.scene.start('MainScene');
        });
    }
    private async handleNextLevel(): Promise<void> {
        console.log('🔄 MainScene: Handling Next Level transition...');

        // ✅ Проверяем, достигли ли мы конца игры
        const currentLevel = this.levelManager.getCurrentLevel();
        // Используем MAX_LEVELS из констант (импортируем его)
        if (currentLevel >= MAX_LEVELS) {
            console.log('🏆 MainScene: Game Completed! Max level reached.');
            const score = this.scoreSystem ? this.scoreSystem.getScore() : 0;
            this.handleGameWin(score, ''); // Pass empty feedback for now, will be generated in handleGameWin
            return;
        }

        try {
            // ✅ PERSISTENCE: Сохраняем текущие очки перед переходом
            const currentScore = this.scoreSystem ? this.scoreSystem.getScore() : 0;
            this.registry.set('score', currentScore);
            console.log(`✅ MainScene: Score saved to registry: ${currentScore}`);

            // Переходим на следующий уровень через LevelManager
            await this.levelManager.nextLevel();

            // ✅ PERSISTENCE: Сохраняем новый уровень в Registry
            const newLevel = this.levelManager.getCurrentLevel();
            this.registry.set('currentLevel', newLevel);
            console.log(`✅ MainScene: Level saved to registry. Current level is now: ${newLevel}`);

            // Перезапускаем игру с новым уровнем
            this.restartGame();
        } catch (error) {
            console.error('❌ MainScene: Failed to transition to next level:', error);
        }
    }

    private handleGameWin(score: number, feedbackText: string): void {
        console.log('🏆 Showing Game Win Screen with score:', score);
        // Показываем окно победы
        this.uiManager.showGameWinModal(
            score,
            feedbackText,
            () => this.handleFullGameRestart() // onRestart
        );
    }

    private handleFullGameRestart(): void {
        console.log('🔄 MainScene: Full Game Restart Requested');
        this.levelManager.setCurrentLevel(1);
        this.registry.set('currentLevel', 1);
        this.registry.set('score', 0);
        this.restartGame();
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
}


