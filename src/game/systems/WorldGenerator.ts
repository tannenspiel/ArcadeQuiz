import Phaser from 'phaser';
import { KEYS, BASE_SCALE, MAP_CENTER_X, MAP_CENTER_Y, TILEMAP_CONSTANTS, COLLISION_CONFIG, DEPTHS } from '../../constants/gameConstants';
import { ORACLE_LABEL_FONT_SIZE, DEFAULT_FONT_FAMILY, ORACLE_LABEL_FONT_STYLE, ORACLE_LABEL_COLOR } from '../../constants/textStyles';
import { USE_QUESTION_BUBBLE } from '../../config/gameConfig';
import { PortalConfig, PortalType } from '../../types/portalTypes';
import { StandardPortal } from '../entities/portals/StandardPortal';
import { Oracle } from '../entities/Oracle';
import { Player } from '../entities/Player';
import { SpawnSystem } from './SpawnSystem';
import { QuizManager } from './QuizManager';
import { AbstractPortal } from '../entities/portals/AbstractPortal';
import { LevelManager } from '../core/LevelManager';
import { logger } from '../../utils/Logger';

// Интерфейс для сцены, с которой работает генератор (чтобы избежать циклической зависимости от MainScene)
export interface IWorldGeneratorScene extends Phaser.Scene {
    spawnSystem: SpawnSystem;
    physics: Phaser.Physics.Arcade.ArcadePhysics;
    add: Phaser.GameObjects.GameObjectFactory;
    levelManager: LevelManager;
    quizManager: QuizManager;
    assetLoader: any; // Или уточнить тип, если есть AssetLoader

    // Группы объектов
    enemies: Phaser.Physics.Arcade.Group;
    chasers: Phaser.Physics.Arcade.Group;
    hearts: Phaser.Physics.Arcade.Group;
    keys: Phaser.Physics.Arcade.Group;
    portals: Phaser.Physics.Arcade.Group;

    // Состояние, которое заполняет генератор
    tiledMapCollisionBodies?: Phaser.Physics.Arcade.StaticGroup;
    tiledOverlapBodies?: Phaser.Physics.Arcade.StaticGroup; // ✅ Новое: Группа для оверлап зон
    currentOverlapData: number[] | null;
    tiledPortalsConfig: any[];
    tiledOracleConfig?: { x: number, y: number, bubblePosition?: { x: number, y: number } }; // ✅ Новое: Конфиг Оракула из Tiled
    tiledMapInfo?: { width: number; height: number; tileWidth: number; tileHeight: number };

    // Методы сцены, которые вызывает генератор
    // handlePortalOverlapByMask(player: any, zone: any): void; // ❌ Removed
    // createCollisionObjects(): Promise<void>; // ❌ Removed
}

export class WorldGenerator {
    private scene: IWorldGeneratorScene;

    constructor(scene: IWorldGeneratorScene) {
        this.scene = scene;
    }

    /**
     * Создание игрового мира с использованием Tiled Map
     */
    public async generate(
        tiledMapKey: string,
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        // --- 1. ВИЗУАЛЬНЫЕ СЛОИ ФОНА ---
        const currentLevel = this.scene.levelManager.getCurrentLevel();

        // Формируем ключи динамически: MAP_BG_TILED_BASE_L1, MAP_BG_TILED_BASE_L2 ...
        const bgBaseKey = `map_bg_tiled_base_l${currentLevel}`;
        const bgStructKey = `map_bg_tiled_struct_l${currentLevel}`;
        const bgOverlayKey = `map_bg_tiled_overlay_l${currentLevel}`;

        logger.log('WORLD_GENERATOR', `Loading backgrounds for level ${currentLevel}: ${bgBaseKey}, ${bgStructKey}, ${bgOverlayKey}`);

        // Слой 1: Base BG (самый нижний)
        const baseBg = this.scene.add.image(MAP_CENTER_X, MAP_CENTER_Y, bgBaseKey);
        baseBg.setScale(BASE_SCALE);
        baseBg.setDepth(-100);

        // --- 2. ЗАГРУЗКА И НАСТРОЙКА TILED MAP ---
        let mapData: any;
        try {
            // Используем assetLoader сцены
            // Формируем имя файла на основе уровня: Level1_map.json, Level2_map.json
            const mapFileName = `level_maps/Level${currentLevel}_map.json`;
            logger.log('WORLD_GENERATOR', `Loading map file: ${mapFileName}`);
            mapData = await this.scene.assetLoader.loadJSON(mapFileName);
        } catch (error) {
            logger.error('WORLD_GENERATOR', `Failed to load Tiled Map JSON: ${error}`);
            return;
        }

        // Создаем физический слой коллизий вручную (для отладки)
        const collisionGraphics = this.scene.add.graphics();
        collisionGraphics.setDepth(-50);
        (this.scene as any).collisionLayerGraphics = collisionGraphics;

        // Получаем Tile Layer "Overlap Mask"
        const overlapLayerData = mapData.layers?.find((layer: any) => layer.name === 'Overlap Mask');
        const overlapData = (overlapLayerData && overlapLayerData.data) ? overlapLayerData.data : null;
        this.scene.currentOverlapData = overlapData;

        // Получаем Tile Layer "Collision Mask"
        const collisionLayerData = mapData.layers?.find((layer: any) => layer.name === 'Collision Mask');
        if (!collisionLayerData || !collisionLayerData.data) {
            logger.error('WORLD_GENERATOR', 'Collision Mask layer not found in Tiled Map');
            return;
        }

        // Создаем физические тела для коллизий
        // Safety check: physics.add may be null during scene restart
        logger.log('WORLD_GENERATOR', 'Checking physics availability...', {
            hasScene: !!this.scene,
            hasPhysics: !!this.scene?.physics,
            hasPhysicsAdd: !!this.scene?.physics?.add
        });

        if (!this.scene?.physics?.add) {
            logger.warn('WORLD_GENERATOR', 'Scene physics.add not available, skipping collision bodies creation');
            return;
        }

        const collisionBodies: Phaser.Physics.Arcade.StaticGroup = this.scene.physics.add.staticGroup();
        this.scene.tiledMapCollisionBodies = collisionBodies;
        (this.scene as any).collisionLayer = collisionBodies;

        // --- 3. ИНТЕГРАЦИЯ КОЛЛИЗИЙ С SPAWNMATRIX ---
        const tileData = collisionLayerData.data;
        const mapWidth = mapData.width || 64;
        const mapHeight = collisionLayerData.height || 64;
        const tileWidth = mapData.tilewidth || 8;
        const tileHeight = mapData.tileheight || 8;

        this.scene.tiledMapInfo = {
            width: mapWidth,
            height: mapHeight,
            tileWidth: tileWidth,
            tileHeight: tileHeight
        };

        if (tileData && Array.isArray(tileData)) {
            for (let row = 0; row < mapHeight; row++) {
                for (let col = 0; col < mapWidth; col++) {
                    const tileIndex = row * mapWidth + col;
                    const tileValue = tileData[tileIndex];

                    // OVERLAP MASK OVERRIDE: Игнорируем коллизию, если есть маска
                    if (overlapData && overlapData[tileIndex] === TILEMAP_CONSTANTS.OVERLAP_TILE_GID) {
                        continue;
                    }

                    if (tileValue && tileValue !== 0) {
                        // Конвертируем координаты и занимаем место в матрице
                        const worldX = (col * tileWidth + tileWidth / 2) * BASE_SCALE;
                        const worldY = (row * tileHeight + tileHeight / 2) * BASE_SCALE;
                        this.scene.spawnSystem.occupyPositionMatrix(worldX, worldY, 1, 1, 'permanent');

                        // Создаем физическое тело
                        const bodyX = col * tileWidth * BASE_SCALE;
                        const bodyY = row * tileHeight * BASE_SCALE;
                        const bodyWidth = tileWidth * BASE_SCALE;
                        const bodyHeight = tileHeight * BASE_SCALE;

                        const collisionBody = this.scene.add.rectangle(
                            bodyX + bodyWidth / 2,
                            bodyY + bodyHeight / 2,
                            bodyWidth,
                            bodyHeight,
                            0xff0000,
                            0 // Alpha 0
                        );
                        this.scene.physics.add.existing(collisionBody, true);
                        collisionBodies.add(collisionBody);
                    }
                }
            }
        }

        // --- 4. ПАРСИНГ ОБЪЕКТОВ (БЕЗ СОЗДАНИЯ СУЩНОСТЕЙ) ---
        // ✅ Clears array inplace to preserve reference for EntityFactory
        if (this.scene.tiledPortalsConfig) {
            this.scene.tiledPortalsConfig.length = 0;
        } else {
            // Fallback if undefined (should be defined in MainScene)
            this.scene.tiledPortalsConfig = [];
        }
        this.scene.tiledOracleConfig = undefined;

        const interactiveObjectsLayer = mapData.layers?.find((layer: any) => layer.name === 'InteractiveObjects' && layer.type === 'objectgroup');

        // Временная карта для бабблов (OracleMsg / PortalMsg)
        let oracleMsgData: { x: number, y: number } | undefined;
        const portalMsgMap = new Map<number, { x: number, y: number }>();

        // Проход 1: Сбор бабблов (чтобы привязать их к объектам, если нужно, хотя теперь EntityFactory сама решит)
        // В текущей архитектуре EntityFactory сама может позиционировать бабблы, 
        // но мы можем сохранить координаты бабблов в конфиг, если захотим.
        // Пока просто собираем координаты основных объектов.

        if (interactiveObjectsLayer) {
            // ✅ Проход 1: Сбор бабблов (PortalMsg, OracleMsg)
            for (const obj of interactiveObjectsLayer.objects) {
                if (obj.x === undefined || obj.y === undefined) continue;

                const objWidth = obj.width ?? 32;
                const objHeight = obj.height ?? 48;
                const centerX = obj.x + objWidth / 2;
                const centerY = obj.y + objHeight / 2;
                const worldX = centerX * BASE_SCALE;
                const worldY = centerY * BASE_SCALE;

                if (obj.type === 'OracleMsg') {
                    // ✅ Сохраняем координаты баббла оракула
                    oracleMsgData = { x: worldX, y: worldY };
                    logger.log('WORLD_GENERATOR', `Found OracleMsg at [${worldX}, ${worldY}]`);

                } else if (obj.type === 'PortalMsg') {
                    // ✅ Сохраняем координаты баббла портала по portalMsgId
                    const portalId = obj.properties?.find((prop: any) => prop.name === 'portalMsgId')?.value ?? 1;
                    portalMsgMap.set(Number(portalId), { x: worldX, y: worldY });
                    logger.log('WORLD_GENERATOR', `Found PortalMsg for portal ${portalId} (portalMsgId) at [${worldX}, ${worldY}]`);
                }
            }

            logger.log('WORLD_GENERATOR', `Pass 1 complete. portalMsgMap size = ${portalMsgMap.size}`);

            // ✅ Проход 2: Создание объектов (Oracle, Portal) с использованием собранных бабблов
            for (const obj of interactiveObjectsLayer.objects) {
                if (obj.x === undefined || obj.y === undefined) continue;

                const objWidth = obj.width ?? 32;
                const objHeight = obj.height ?? 48;
                const centerX = obj.x + objWidth / 2;
                const centerY = obj.y + objHeight / 2;
                const worldX = centerX * BASE_SCALE;
                const worldY = centerY * BASE_SCALE;

                if (obj.type === 'Oracle') {
                    // ✅ Просто сохраняем координаты Оракула в конфиг сцены (включая баббл)
                    this.scene.tiledOracleConfig = {
                        x: worldX,
                        y: worldY,
                        bubblePosition: oracleMsgData
                    };
                    logger.log('WORLD_GENERATOR', `Found Oracle config at [${worldX}, ${worldY}]${oracleMsgData ? ` Bubble: [${oracleMsgData.x}, ${oracleMsgData.y}]` : ''}`);

                    // Voxel collision для Оракула (СТЕНЫ)
                    // Генерируем коллизии вокруг места оракула, чтобы он не стоял в пустоте, если там есть стены
                    if (overlapData && this.scene.tiledMapInfo) {
                        const info = this.scene.tiledMapInfo as NonNullable<IWorldGeneratorScene['tiledMapInfo']>;
                        const startCol = Math.floor(obj.x / info.tileWidth);
                        const endCol = Math.floor((obj.x + objWidth) / info.tileWidth);
                        const startRow = Math.floor(obj.y / info.tileHeight);
                        const endRow = Math.floor((obj.y + objHeight) / info.tileHeight);

                        for (let r = startRow; r < endRow; r++) {
                            for (let c = startCol; c < endCol; c++) {
                                const tileIdx = r * info.width + c;
                                if (overlapData[tileIdx] !== TILEMAP_CONSTANTS.OVERLAP_TILE_GID) {
                                    const bodyW = info.tileWidth * BASE_SCALE;
                                    const bodyH = info.tileHeight * BASE_SCALE;
                                    const cb = this.scene.add.rectangle(
                                        (c * info.tileWidth * BASE_SCALE) + bodyW / 2,
                                        (r * info.tileHeight * BASE_SCALE) + bodyH / 2,
                                        bodyW, bodyH, 0xff00ff, 0
                                    );
                                    this.scene.physics.add.existing(cb, true);
                                    collisionBodies.add(cb);
                                }
                            }
                        }
                    }

                    // Спавн зоны оракула в матрице (чтобы другие объекты не спавнились там)
                    this.scene.spawnSystem.spawnOracleMatrix();

                } else if (obj.type === 'Portal') {
                    // ✅ Обработка порталов из Tiled Map
                    let portalId = obj.properties?.find((prop: any) => prop.name === 'portalId')?.value ?? 1;
                    portalId = Number(portalId);

                    // ✅ Получаем позицию баббла из карты (собранной в Проходе 1)
                    const bubblePos = portalMsgMap.get(portalId);
                    logger.log('WORLD_GENERATOR', `Portal ${portalId} bubblePos from map:`, bubblePos);

                    // Voxel collision для Портала (СТЕНЫ)
                    const portalCollisionBodies: Phaser.GameObjects.GameObject[] = [];
                    if (overlapData && this.scene.tiledMapInfo) {
                        const info = this.scene.tiledMapInfo as NonNullable<IWorldGeneratorScene['tiledMapInfo']>;
                        const startCol = Math.floor(obj.x / info.tileWidth);
                        const endCol = Math.floor((obj.x + objWidth) / info.tileWidth);
                        const startRow = Math.floor(obj.y / info.tileHeight);
                        const endRow = Math.floor((obj.y + objHeight) / info.tileHeight);

                        for (let r = startRow; r < endRow; r++) {
                            for (let c = startCol; c < endCol; c++) {
                                const tileIdx = r * info.width + c;
                                if (overlapData[tileIdx] !== TILEMAP_CONSTANTS.OVERLAP_TILE_GID) {
                                    const bodyW = info.tileWidth * BASE_SCALE;
                                    const bodyH = info.tileHeight * BASE_SCALE;
                                    const cb = this.scene.add.rectangle(
                                        (c * info.tileWidth * BASE_SCALE) + bodyW / 2,
                                        (r * info.tileHeight * BASE_SCALE) + bodyH / 2,
                                        bodyW, bodyH, 0x00ffff, 0
                                    );
                                    this.scene.physics.add.existing(cb, true);
                                    collisionBodies.add(cb);
                                    // ✅ Сохраняем ссылку на тело стены для портала
                                    portalCollisionBodies.push(cb);
                                }
                            }
                        }
                    }

                    // ✅ Создаём конфиг портала
                    this.scene.tiledPortalsConfig.push({
                        id: portalId,
                        x: worldX,
                        y: worldY,
                        overrideCollision: false,
                        bubblePosition: bubblePos,
                        collisionBodies: portalCollisionBodies // ✅ Передаем стены порталу
                    });
                    logger.log('WORLD_GENERATOR', `Portal ${portalId} config added at [${worldX}, ${worldY}] with ${portalCollisionBodies.length} linked collision bodies`);
                }
            }
        }

        // --- 6. СОЗДАНИЕ ПЕРСОНАЖА ---
        // --- 6. СОЗДАНИЕ ПЕРСОНАЖА ---
        // ❌ УДАЛЕНО: Теперь персонаж создается снаружи через EntityFactory и MainScene
        // this.scene.createPlayer();

        // ❌ УДАЛЕНО: Коллизия игрока с вокселями перенесена в MainScene.setupCollisions()
        // if ((this.scene as any).collisionLayer && this.scene.player) {
        //     this.scene.physics.add.collider(this.scene.player.getSprite(), (this.scene as any).collisionLayer);
        // }

        // --- 7. OVERLAP MASK PHYSICS ---
        // Создаем невидимые зоны оверлапа для быстрого детектирования входа в портал
        if (overlapLayerData && overlapData) {
            const overlapBodies = this.scene.physics.add.staticGroup();
            this.scene.tiledOverlapBodies = overlapBodies; // ✅ Сохраняем группу в сцене для MainScene

            for (let row = 0; row < mapHeight; row++) {
                for (let col = 0; col < mapWidth; col++) {
                    const tileIndex = row * mapWidth + col;
                    if (overlapData[tileIndex] === TILEMAP_CONSTANTS.OVERLAP_TILE_GID) {
                        const bodyW = tileWidth * BASE_SCALE;
                        const bodyH = tileHeight * BASE_SCALE;
                        const overlapBody = this.scene.add.rectangle(
                            (col * tileWidth * BASE_SCALE) + bodyW / 2,
                            (row * tileHeight * BASE_SCALE) + bodyH / 2,
                            bodyW, bodyH, 0x00ff00, 0
                        );
                        this.scene.physics.add.existing(overlapBody, true);
                        overlapBodies.add(overlapBody);
                    }
                }
            }
            // ❌ УДАЛЕНО: MainScene настроит overlap с игроком, так как здесь нет доступа к player
            logger.log('WORLD_GENERATOR', 'Overlap bodies created and assigned to scene.tiledOverlapBodies');
        }


        // --- 8. ВЕРХНИЕ СЛОИ И ПРЕДМЕТЫ ---
        // Создаем структурный фон (стены, балки)
        const structBg = this.scene.add.image(MAP_CENTER_X, MAP_CENTER_Y, bgStructKey);
        structBg.setScale(BASE_SCALE);
        structBg.setDepth(DEPTHS.WORLD.TILED_STRUCT_BG);

        // await this.scene.createCollisionObjects(); // Кусты и прочее - MainScene

        // Items - MainScene

        // Создаем оверлей (туман, тени)
        const overlayBg = this.scene.add.image(MAP_CENTER_X, MAP_CENTER_Y, bgOverlayKey);
        overlayBg.setScale(BASE_SCALE);
        overlayBg.setDepth(DEPTHS.WORLD.TILED_OVERLAY);

        logger.log('WORLD_GENERATOR', 'Background layers created');
    }

    private shuffleArray(array: any[]): any[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
