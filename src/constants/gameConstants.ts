import { QuizData } from '../types/gameTypes';
import { PortalConfig, PortalType } from '../types/portalTypes';

// ================================================
// ВИРТУАЛЬНОЕ РАЗРЕШЕНИЕ ИГРЫ (АДАПТИВНОЕ)
// ================================================
// Базовая высота (для сохранения пропорций и UI)
// Ширина вычисляется динамически на основе соотношения сторон экрана
export const BASE_GAME_HEIGHT = 1280;
// Мин/макс ширина для защиты от экстремальных экранов
export const MIN_GAME_WIDTH = 360;
export const MAX_GAME_WIDTH = 2560;

// ================================================
// БАЗОВЫЙ МАСШТАБ ДЛЯ ВСЕХ ЭЛЕМЕНТОВ
// ================================================
// Базовый масштаб применяется ко всем элементам игры:
// - Акторам (игрок, враги, предметы)
// - Тайловым текстурам фона
// - Другим игровым элементам
// Исходные текстуры ориентированы под 180×320 (в 4 раза меньше виртуального экрана 720×1280)
export const BASE_SCALE = 4.0;

// Размеры игровой карты (базовый размер, масштабируется до виртуального через BASE_SCALE)
// Базовый размер: 512×512 пикселей
// Виртуальный размер после масштабирования: 512 × BASE_SCALE = 2048×2048 пикселей
export const MAP_WIDTH = 512;
export const MAP_HEIGHT = 512;

// ✅ Максимальное количество уровней
export const MAX_LEVELS = 3;

// Центр карты в виртуальном разрешении (для удобства и будущего расширения карты)
export const MAP_CENTER_X = (MAP_WIDTH * BASE_SCALE) / 2;
export const MAP_CENTER_Y = (MAP_HEIGHT * BASE_SCALE) / 2;

// ================================================
// НАСТРОЙКИ ЗУМА КАМЕРЫ
// ================================================
// Процент высоты виртуального экрана, который должен занимать игрок
// Например, 0.08 означает, что игрок займет 8% высоты экрана
export const PLAYER_HEIGHT_PERCENT = 0.08; // 8% высоты экрана

// Размеры спрайта игрока (базовые, до масштабирования)
export const PLAYER_FRAME_HEIGHT = 16;

// Скорости движения (в виртуальном разрешении)
export const PLAYER_SPEED = 250;
// ✅ Скорости врагов (ENEMY_SPEED, CHASER_SPEED) удалены - теперь задаются только в конфигах уровней (level1.config.json)
export const MAX_HEALTH = 3;

// ================================================
// ОРАКУЛ — МАКСИМАЛЬНОЕ КОЛИЧЕСТВО АЙТЕМОВ
// ================================================
// Согласно GameDescription.md:
// - Фаза 1: Чтобы разбудить Оракула, нужно 3 монеты
// - Фаза 2: После активации Оракул хранит до 3 ключей для портала
export const ORACLE_MAX_COINS = 3;
export const ORACLE_MAX_KEYS = 3;

// ================================================
// ЖИЗНИ ВРАГОВ (по умолчанию)
// ================================================
// По умолчанию все враги имеют 1 жизнь
// Можно переопределить в конфигурации уровня (level1.config.json)
export const DEFAULT_ENEMY_HEALTH = 1;

// ================================================
// ФАЗЫ ИГРЫ ⚠️ НОВОЕ
// ================================================
// Двухэтапная механика сбора айтемов
export enum GamePhase {
    COIN = 'coin',      // Этап 1: Сбор монеток для Оракула
    KEY = 'key'         // Этап 2: Сбор ключей для порталов
}

// ================================================
// ТИПЫ АЙТЕМОВ ⚠️ НОВОЕ
// ================================================
// Типы собираемых предметов
export enum ItemType {
    COIN = 'coin',
    KEY = 'key',
    HEART = 'heart'
}

// ================================================
// МНОЖИТЕЛИ РАЗМЕРОВ АКТОРОВ
// ================================================
// Каждый актор имеет индивидуальный множитель размера
// Финальный масштаб = BASE_SCALE × ACTOR_SIZES[тип]
// Например: PLAYER = BASE_SCALE × 1.0 = 4.0 × 1.0 = 4.0
//           KEY = BASE_SCALE × 1.0 = 4.0 × 1.0 = 4.0
//           ORACLE = BASE_SCALE × 1.0 = 4.0 × 1.0 = 4.0
export const ACTOR_SIZES = {
    // Индивидуальные множители для каждого типа актора
    PLAYER: 1.0,            // Игрок (базовый размер)
    ENEMY: 1.0,             // Враги (базовый размер)
    HEART: 1.0,             // Сердечки (базовый размер)
    KEY: 1.0,            // Ключи (базовый размер)
    COIN: 1.0,              // Монетки (базовый размер, 16x16) ⚠️ НОВОЕ
    PORTAL: 1.0,            // Порталы (базовый размер)
    ORACLE: 1.0,            // Оракул (базовый размер, текстура Oracle.Base_32x56.png)
    GRASS: 1.0,             // Трава (базовый размер, текстура Bg.Grass.64x64.png, фреймы 16x16)
    BUSH: 1.0,              // Кусты (базовый размер, текстура CollisionObject.Bush.64x32.png, фреймы 32x32)
    QUESTION_BUBBLE: 1.0,   // Баббл сообщения (базовый размер, текстура BubbleMsg160x64.png)
    UI_SOUND_TOGGLE: 2.0,    // ✅ UI иконка звука (8x8px, множитель 2.0 для компенсации меньшего разрешения)
    POINTER: 1.0             // ✅ Указатель направления (стандартный масштаб как у всех акторов)
} as const;

// ================================================
// Z-DEPTH ИЕРАРХИЯ ⚠️ НОВОЕ
// ================================================
// Глубина рендеринга для слоёв игры (setDepth)
// Разделение на WORLD и SCREEN пространства для избежания конфликтов
//
// WORLD SPACE: объекты в игровом мире (setScrollFactor по умолчанию)
// SCREEN SPACE: UI элементы (setScrollFactor(0))
export const DEPTHS = {
    // ================================================
    // WORLD SPACE (setScrollFactor по умолчанию)
    // ================================================
    // Объекты, которые двигаются вместе с камерой
    WORLD: {
        // Background слои (самые нижние)
        BACKGROUND: -100,
        TILED_MAP: 0,           // Tiled Map слои (обычно 0-10)
        TILED_STRUCT_BG: 1,     // Структурный фон Tiled карты
        PORTAL_TEXT: 2,         // Текст над порталами

        // Entities (от низшего к высшему)
        ENEMY: 7,               // Враги
        ORACLE: 8,              // Оракул
        ORACLE_COIN_INDICATOR: 8.1,  // Индикатор монеток Оракула (чуть выше Оракула)
        HEART_GLOW: 10,         // Свечение сердечек
        HEART_BASE: 11,         // Основные сердечки

        // Спавннутые предметы
        SPAWNED_ITEM: 3,        // Hearts, Keys на карте

        // Collectible items (над Tiled Map)
        ITEMS: 100,             // Coin, Key, Heart

        // Portal and Player (выше всего в мире)
        PORTAL: 150,            // Порталы
        PLAYER: 200,            // Игрок (самый высокий в мире)

        // ✅ Overhead indicators (золотые сердечки, монетки над игроком)
        // Player + 1, чтобы быть поверх игрока, но под Tiled Overlay
        OVERHEAD_INDICATOR: 201,
        OVERHEAD_INDICATOR_GLOW: 202,

        // ✅ Tiled Overlay (всегда выше игрока)
        TILED_OVERLAY: 300
    },

    // ================================================
    // SCREEN SPACE (setScrollFactor(0))
    // ================================================
    // UI элементы, зафиксированные на экране
    SCREEN: {
        // Глобальные вопросы Оракула (setScrollFactor(0))
        GLOBAL_QUESTION: 500,    // Текст глобальных вопросов

        // HUD (игровой интерфейс)
        HUD: 1000,              // Счёт, ключи, подсказки

        // UI Buttons
        UI_BUTTON_BG: 1002,     // Фон кнопки
        UI_BUTTON_TEXT: 1003,   // Текст на кнопке

        // Question bubbles (поверх кнопок, НО ниже модалок)
        QUESTION_BUBBLE: 1500,

        // Modals (экранные окна) - самый высокий UI
        MODAL_BG: 2000,         // Фон модального окна
        MODAL_TEXT: 2001,       // Текст в модальном окне
        MODAL_BUTTON: 2002,     // Кнопки в модальном окне
        MODAL_CLOSE: 9999,      // Кнопка закрытия

        // Effects (партиклы, визуальные эффекты)
        EFFECTS: 2000,

        // Overlays (поверх всего)
        DEBUG_OVERLAY: 999999,  // Debug overlay (максимальный z-index)
        SPAWN_MATRIX_GRID: -50  // Сетка спавн-матрицы (ниже всего)
    }
} as const;

// Для обратной совместимости (старый код может использовать)
export const DEPTH_WORLD = DEPTHS.WORLD;
export const DEPTH_SCREEN = DEPTHS.SCREEN;

// ================================================
// AUDIO PATHS ⚠️ НОВОЕ
// ================================================
// Пути к аудиофайлам для централизованной загрузки
// Используются в AudioManager для loadSound()
//
// Путь указывается относительно assets/Game_01/audio/
// AssetLoader добавляет базовый путь автоматически
export const AUDIO_PATHS = {
    // ================================================
    // MUSIC (фоновая музыка)
    // ================================================
    MUSIC: {
        BASE: 'mp3/Music.Base.mp3',
        WIN: 'mp3/Music.Win.mp3',
        GAME_OVER: 'mp3/Music.GameOver.mp3'
    },

    // ================================================
    // SFX - BUTTONS (звуки кнопок UI)
    // ================================================
    BUTTONS: {
        CLICK: 'mp3/SFX_Btn.CLICK.mp3',
        QUESTION_CLOSE: 'mp3/SFX_Btn.Question.CLOSE.mp3',
        QUESTION_SUCCESS: 'mp3/SFX_Btn.Question.SUCCESS.mp3',
        QUESTION_FAILURE: 'mp3/SFX_Btn.Question.FAILURE.mp3',
        PORTAL_ENTER: 'mp3/SFX_Btn.PortalENTER.ACCEPT.mp3',
        PORTAL_CANCEL: 'mp3/SFX_Btn.PortalCANCEL.CANCEL.mp3'
    },

    // ================================================
    // SFX - CHARACTER (звуки персонажа)
    // ================================================
    CHARACTER: {
        DAMAGE: 'mp3/SFX_Character.Damage.mp3',
        DAMAGE_KEY: 'mp3/SFX_Character.Damage.Key.mp3',
        DAMAGE_COIN: 'mp3/SFX_Character.Damage.Coin.mp3',
        PICKUP_LIFE: 'mp3/SFX_Character.PickUp.Life.mp3',
        PICKUP_KEY: 'mp3/SFX_Character.PickUp.Key.mp3',
        PICKUP_COIN: 'mp3/SFX_Character.PickUp.Coin.mp3',
        SUCCESS_KEY: 'mp3/SFX_Character.Key.Success.mp3',
        SUCCESS_COIN: 'mp3/SFX_Character.Coin.Success.mp3',
        APPLY_KEY: 'mp3/SFX_Character.Key.Apply.mp3',
        DEAD: 'mp3/SFX_Character.Dead.mp3'
    },

    // ================================================
    // SFX - GAME EVENTS (игровые события)
    // ================================================
    GAME: {
        ORACLE_ACTIVATED: 'mp3/SFX_Oracle.ACTIVATED.mp3',
        PORTAL_ACTIVATED: 'mp3/SFX_Portal.ACTIVATED.mp3'
    },

    // ================================================
    // SFX - ENEMY SPAWN (звуки спавна врагов)
    // ================================================
    ENEMY_SPAWN: [
        'mp3/SFX_Enemy.Spawn_01.mp3',
        'mp3/SFX_Enemy.Spawn_02.mp3',
        'mp3/SFX_Enemy.Spawn_03.mp3',
        'mp3/SFX_Enemy.Spawn_04.mp3',
        'mp3/SFX_Enemy.Spawn_05.mp3'
    ]
} as const;

// Asset Keys (for internal generation)
export const KEYS = {
    PLAYER: 'player_tex',
    ENEMY: 'enemy_tex',
    CHASER: 'chaser_tex',
    HEART: 'heart_tex',
    COIN: 'coin_tex', // ✅ НОВОЕ: Coin texture key
    KEY: 'key_tex',
    ORACLE: 'oracle_tex',
    PORTAL_CLOSED: 'portal_closed_tex',
    PORTAL_OPEN: 'portal_open_tex',
    TILE: 'tile_tex', // Fallback тайл (генерируется программно)
    BG_GRASS_SHEET: 'bg_grass_sheet', // Текстура травы Bg.Grass.64x64.png (16 спрайтов по 16x16)
    COLLISION_BUSH_SHEET: 'collision_bush_sheet', // Текстура кустов CollisionObject.Bush.64x32.png (2 спрайта по 32x32)
    COLLISION_STONE_SHEET: 'collision_stone_sheet', // Текстура камней CollisionObject.Stone.128x32.png (4 спрайта по 32x32)
    QUESTION_BUBBLE: 'question_bubble', // Текстура баббла сообщения для Оракула (BubbleMsg160x64.png)
    PORTAL_QUESTION_BUBBLE: 'portal_question_bubble', // Текстура баббла сообщения для порталов (BubbleMsg.Transparent136x48.png)
    COIN_HEART: 'coin_heart', // ✅ НОВОЕ: Текстура мон acreтки для индикатора над игроком (Coin5x5.png)
    UI_SOUND_TOGGLE: 'ui_sound_toggle', // ✅ Спрайт кнопки переключения звука (16x8, 2 кадра по 8x8)
    POINTER: 'character_pointer', // ✅ Указатель направления движения (Character.Pointer_3x3.png)

    // Level 1 Backgrounds
    MAP_BG_STANDARD_L1: 'map_bg_standard_l1',
    MAP_BG_TILED_BASE_L1: 'map_bg_tiled_base_l1',
    MAP_BG_TILED_STRUCT_L1: 'map_bg_tiled_struct_l1',
    MAP_BG_TILED_OVERLAY_L1: 'map_bg_tiled_overlay_l1',

    // Level 2 Backgrounds
    MAP_BG_STANDARD_L2: 'map_bg_standard_l2',
    MAP_BG_TILED_BASE_L2: 'map_bg_tiled_base_l2',
    MAP_BG_TILED_STRUCT_L2: 'map_bg_tiled_struct_l2',
    MAP_BG_TILED_OVERLAY_L2: 'map_bg_tiled_overlay_l2',
    PORTAL_BASE_NEW: 'portal_base_new', // Portal.Base_32x48.png
    PORTAL_ACTIVATION_NEW: 'portal_activation_new', // Fallback/Base tex
    PORTAL_ACTIVATED_NEW: 'portal_activated_new', // Portal.Activated_32x48.png
    OVERLAP_TILE: 'overlap_tile' // Generated texture for overlap layer
};

/**
 * Helper to generate dynamic asset keys for levels
 * @param level Level number (1-based)
 * @param type Asset type prefix (e.g., 'map_bg_standard')
 * @returns Formatted key string (e.g., 'map_bg_standard_l1')
 */
export const getLevelAssetKey = (level: number, type: string): string => {
    return `${type}_l${level}`;
};

/**
 * Dynamic keys used for level loading loop
 */
export const DYNAMIC_KEYS = {
    // Prefixes for dynamic generation
    MAP_BG_STANDARD: 'map_bg_standard',
    MAP_BG_TILED_BASE: 'map_bg_tiled_base',
    MAP_BG_TILED_STRUCT: 'map_bg_tiled_struct',
    MAP_BG_TILED_OVERLAY: 'map_bg_tiled_overlay',
    LEVEL_CONFIG: 'level_config' // JSON config key prefix
};

/**
 * Helpers for specific asset types (Type Safety wrapper)
 */
export const LevelAssetKeys = {
    getMapBgStandard: (level: number) => getLevelAssetKey(level, DYNAMIC_KEYS.MAP_BG_STANDARD),
    getMapBgTiledBase: (level: number) => getLevelAssetKey(level, DYNAMIC_KEYS.MAP_BG_TILED_BASE),
    getMapBgTiledStruct: (level: number) => getLevelAssetKey(level, DYNAMIC_KEYS.MAP_BG_TILED_STRUCT),
    getMapBgTiledOverlay: (level: number) => getLevelAssetKey(level, DYNAMIC_KEYS.MAP_BG_TILED_OVERLAY),
    getLevelConfig: (level: number) => `level${level}_config` // Special case for config naming convention
};

// ... (existing code)

// ================================================
// TILED MAP CONSTANTS
// ================================================
export const TILEMAP_CONSTANTS = {
    OVERLAP_TILE_GID: 12
} as const;


// Sound Keys
export const SOUND_KEYS = {
    // Music
    MUSIC_BASE: 'music_base',
    MUSIC_WIN: 'music_win',
    MUSIC_GAME_OVER: 'music_game_over',

    // UI Sounds
    BTN_CLICK: 'btn_click',
    BTN_QUESTION_CLOSE: 'btn_question_close',

    // Quiz Sounds
    BTN_QUESTION_SUCCESS: 'btn_question_success',
    BTN_QUESTION_FAILURE: 'btn_question_failure',

    // Portal Sounds
    BTN_PORTAL_ENTER: 'btn_portal_enter',
    BTN_PORTAL_CANCEL: 'btn_portal_cancel',

    // Game Event Sounds
    DAMAGE: 'damage',
    DAMAGE_KEY: 'damage_key', // Звук потери ключа при столкновении с врагом
    DAMAGE_COIN: 'damage_coin', // Звук потери монетки при столкновении с врагом
    PICKUP_LIFE: 'pickup_life',
    PICKUP_KEY: 'pickup_key',
    PICKUP_COIN: 'pickup_coin', // Звук пересечения с монеткой на карте
    SUCCESS_KEY: 'success_key', // Звук успешного взятия ключа (правильный ответ на вопрос)
    SUCCESS_COIN: 'success_coin', // Звук успешного взятия монетки (правильный ответ на вопрос)
    APPLY_KEY: 'apply_key',
    CHARACTER_DEAD: 'character_dead', // Звук смерти персонажа (Game Over)
    ORACLE_ACTIVATED: 'oracle_activated',
    PORTAL_ACTIVATED: 'portal_activated', // Звук начала активации портала
    PORTAL_ACTIVATED_COMPLETE: 'portal_activated_complete', // Звук завершения активации портала (когда появляется надпись ответа)
    // Enemy Spawn Sounds
    ENEMY_SPAWN_01: 'enemy_spawn_01',
    ENEMY_SPAWN_02: 'enemy_spawn_02',
    ENEMY_SPAWN_03: 'enemy_spawn_03',
    ENEMY_SPAWN_04: 'enemy_spawn_04',
    ENEMY_SPAWN_05: 'enemy_spawn_05'
} as const;

// Sound Volume Constants (базовая громкость для каждого типа звука)
export const SOUND_VOLUMES = {
    // Music volumes
    MUSIC_BASE: 0.7,
    MUSIC_WIN: 0.8,
    MUSIC_GAME_OVER: 0.8,

    // UI sound volumes
    BTN_CLICK: 0.25,
    BTN_QUESTION_CLOSE: 1.2,

    // Quiz sound volumes
    BTN_QUESTION_SUCCESS: 0.35,
    BTN_QUESTION_FAILURE: 0.35,

    // Portal sound volumes
    BTN_PORTAL_ENTER: 0.8,
    BTN_PORTAL_CANCEL: 0.6,

    // Game event sound volumes
    DAMAGE: 1.0,
    DAMAGE_KEY: 1.0, // Громкость звука потери ключа
    DAMAGE_COIN: 1.0, // Громкость звука потери монетки
    PICKUP_LIFE: 0.8,
    PICKUP_KEY: 1.1,
    PICKUP_COIN: 0.35, // Громкость звука пересечения с монеткой на карте
    SUCCESS_KEY: 1.0, // Громкость звука успешного взятия ключа
    SUCCESS_COIN: 1.0, // Громкость звука успешного взятия монетки
    APPLY_KEY: 0.8,
    CHARACTER_DEAD: 0.7, // Громкость звука смерти персонажа
    ORACLE_ACTIVATED: 0.8,
    PORTAL_ACTIVATED: 0.3, // Громкость звука начала активации портала
    PORTAL_ACTIVATED_COMPLETE: 2.5, // Громкость звука завершения активации портала

    // Enemy spawn sound volumes
    ENEMY_SPAWN_01: 1.0,
    ENEMY_SPAWN_02: 1.0,
    ENEMY_SPAWN_03: 1.0,
    ENEMY_SPAWN_04: 1.0,
    ENEMY_SPAWN_05: 1.0
} as const;

export const PORTALS_DATA: PortalConfig[] = [
    { id: 1, type: PortalType.STANDARD, isCorrect: false, answerText: "Venus" },
    { id: 2, type: PortalType.STANDARD, isCorrect: true, answerText: "Mars" },
    { id: 3, type: PortalType.STANDARD, isCorrect: false, answerText: "Jupiter" }
];


// ================================================
// КОНФИГУРАЦИЯ КОЛЛИЗИЙ
// ================================================
export const COLLISION_CONFIG = {
    // Отступ коллизии для кустов (в виртуальных пикселях)
    // Позволяет персонажу немного заходить на куст
    // Отступ применяется со всех сторон (сверху, снизу, слева, справа)
    BUSH_COLLISION_OFFSET: 16, // 8 виртуальных пикселей = 2 пикселя в базовом размере
    // Расширение физического тела для сенсоров в Tiled Mode (общее расширение)
    // 2 пикселя = 1 пиксель с каждой стороны.
    // Это гарантирует срабатывание overlap при касании воксельной стены.
    TILED_SENSOR_EXPANSION: 2,
} as const;

// ================================================
// КОНФИГУРАЦИЯ ВЗАИМОДЕЙСТВИЙ
// ================================================
export const INTERACTION_CONFIG = {
    // Радиус, в пределах которого игрок может активировать портал (в пикселях)
    PORTAL_ACTIVATION_RADIUS: 30,
    // Радиус интеракции с айтемами (coins, keys, hearts) - расстояние между центрами спрайтов
    // Увеличен для более комфортной игры (50px вместо 25px)
    ITEM_INTERACTION_RADIUS: 50
} as const;

// ================================================
// КОНФИГУРАЦИЯ БАББЛОВ СООБЩЕНИЙ
// ================================================
// Размеры бабблов (базовые, до масштабирования)
export const BUBBLE_SIZES = {
    // Баббл для Оракула (BubbleMsg.Transparent136x56.png)
    ORACLE: {
        WIDTH: 136,
        HEIGHT: 56,
        TEXT_AREA_WIDTH: 120, //
        TEXT_AREA_HEIGHT: 36   //
    },
    // Баббл для порталов (BubbleMsg.Transparent128x36.png)
    PORTAL: {
        WIDTH: 128,
        HEIGHT: 36,
        TEXT_AREA_WIDTH: 110, //
        TEXT_AREA_HEIGHT: 28   //
    }
} as const;

// Размеры спрайтов для расчета позиционирования (базовые, до масштабирования)
export const SPRITE_SIZES = {
    ORACLE: {
        WIDTH: 32,
        HEIGHT: 56
    },
    PORTAL: {
        WIDTH: 64,
        HEIGHT: 46
    }
} as const;

// Смещения для подсказок (в виртуальных пикселях)
export const HINT_OFFSETS = {
    // Подсказка под Оракулом (смещение вниз от нижней границы Оракула до верхней границы текста)
    ORACLE_Y: 50,
    // Подсказка под Порталом (смещение вниз от нижней границы Портала до верхней границы текста)
    PORTAL_Y: 20
} as const;



// ================================================
// СОБЫТИЯ
// ================================================
export const EVENTS = {
    PORTAL_ENTER: 'portal_enter',
    PORTAL_ENTER_CONFIRMED: 'portal_enter_confirmed',
    PORTAL_ENTER_CANCELLED: 'portal_enter_cancelled',
    SHOW_KEY_QUIZ: 'show_key_quiz',
    KEY_QUIZ_COMPLETED: 'key_quiz_completed', // payload: { result: 'correct' | 'wrong' | 'closed', damage?: number }
    SHOW_COIN_QUIZ: 'show_coin_quiz',         // ⚠️ НОВОЕ - показать квиз для монетки
    COIN_QUIZ_COMPLETED: 'coin_quiz_completed', // ⚠️ НОВОЕ - квиз монетки завершён, payload: { result: 'correct' | 'wrong' }
    GAME_PHASE_CHANGED: 'game_phase_changed', // ⚠️ НОВОЕ - фаза игры изменилась, payload: { newPhase: GamePhase }
    GAME_OVER: 'game_over',
    RESTART_GAME: 'restart_game',
    NEXT_LEVEL: 'next_level',
    ORACLE_ACTIVATED: 'oracle_activated' // ⚠️ НОВОЕ - Оракул активирован (можно показывать вопрос)
} as const;

// ================================================
// PHASER SCENE EVENTS
// ================================================
// Phaser scene events (extracted for testability)
export const PHASER_SCENE_EVENTS = {
    SHUTDOWN: 'shutdown'
} as const;

// ================================================
// LOADING PROGRESS EVENTS
// ================================================
// Events for unified loading screen progress reporting
export const LOADING_PROGRESS_EVENT = 'loading-progress';
export const FINISH_LOADING_EVENT = 'finish-loading';
export const PAUSE_LOADING_EVENT = 'pause-loading';
export const RESUME_LOADING_EVENT = 'resume-loading';

// Type for loading progress event data
export interface LoadingProgressEvent {
    percent: number;
    text: string;
}
