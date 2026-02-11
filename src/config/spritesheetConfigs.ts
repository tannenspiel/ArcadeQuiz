/**
 * Конфигурации всех спрайтшитов игры
 * Используется AnimationManager для универсальной загрузки и создания анимаций
 */

import {
  SpritesheetConfig,
  SpritesheetLayout,
  AnimationConfig
} from '../types/animationTypes';
import { AnimationManager } from '../game/systems/AnimationManager';

/**
 * Конфигурации всех спрайтшитов
 */
export const SPRITESHEET_CONFIGS: SpritesheetConfig[] = [
  // ========== ВРАГИ И ИГРОК (формат: 4x4 сетка, 4 направления x 4 кадра) ==========
  {
    load: {
      key: 'beast_sheet',
      path: 'Enemy.Beast_62x64.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.GRID,
      rows: 4,
      cols: 4
    },
    animations: [
      {
        key: 'beast_down',
        frames: AnimationManager.generateGridDirectionFrames('down', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'beast_up',
        frames: AnimationManager.generateGridDirectionFrames('up', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'beast_left',
        frames: AnimationManager.generateGridDirectionFrames('left', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'beast_right',
        frames: AnimationManager.generateGridDirectionFrames('right', 4, 4),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  {
    load: {
      key: 'dragon_sheet',
      path: 'Enemy.Dragon_64x64.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.GRID,
      rows: 4,
      cols: 4
    },
    animations: [
      {
        key: 'dragon_down',
        frames: AnimationManager.generateGridDirectionFrames('down', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'dragon_up',
        frames: AnimationManager.generateGridDirectionFrames('up', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'dragon_left',
        frames: AnimationManager.generateGridDirectionFrames('left', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'dragon_right',
        frames: AnimationManager.generateGridDirectionFrames('right', 4, 4),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  {
    load: {
      key: 'flam_sheet',
      path: 'Enemy.Flam_64x64.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.GRID,
      rows: 4,
      cols: 4
    },
    animations: [
      {
        key: 'flam_down',
        frames: AnimationManager.generateGridDirectionFrames('down', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'flam_up',
        frames: AnimationManager.generateGridDirectionFrames('up', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'flam_left',
        frames: AnimationManager.generateGridDirectionFrames('left', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'flam_right',
        frames: AnimationManager.generateGridDirectionFrames('right', 4, 4),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  {
    load: {
      key: 'character_walk_sheet',
      path: 'Character.Walk_64x64.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.GRID,
      rows: 4,
      cols: 4
    },
    animations: [
      {
        key: 'boy_down',
        frames: AnimationManager.generateGridDirectionFrames('down', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'boy_up',
        frames: AnimationManager.generateGridDirectionFrames('up', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'boy_left',
        frames: AnimationManager.generateGridDirectionFrames('left', 4, 4),
        frameRate: 8,
        repeat: -1
      },
      {
        key: 'boy_right',
        frames: AnimationManager.generateGridDirectionFrames('right', 4, 4),
        frameRate: 8,
        repeat: -1
      }
    ]
  },

  // ========== ГОРИЗОНТАЛЬНЫЕ ПОЛОСЫ (4 кадра в ряд) ==========
  {
    load: {
      key: 'key_sheet',
      path: 'Key_64x16.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 4
    },
    animations: [
      {
        key: 'key_idle',
        frames: AnimationManager.generateHorizontalFrames(0, 3),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  {
    load: {
      key: 'coin_sheet',
      path: 'Coin_192x16.png',  // ⚠️ НОВОЕ - 12 кадров по 16x16
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 12
    },
    animations: [
      {
        key: 'coin_idle',
        frames: AnimationManager.generateHorizontalFrames(0, 11),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  {
    load: {
      key: 'character_win',
      path: 'Character.Win_64x16.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 4
    },
    animations: [
      {
        key: 'boy_jump_win',
        frames: AnimationManager.generateHorizontalFrames(0, 3),
        frameRate: 8,
        repeat: -1
      }
    ]
  },

  // ========== АНИМАЦИИ ПЕРСОНАЖА ==========
  {
    load: {
      key: 'character_lose_key',
      path: 'Character.LoseKey_144x26.png',
      frameWidth: 24, // 144 / 6 = 24
      frameHeight: 26,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 6
    },
    animations: [
      {
        key: 'character_lose_key',
        frames: AnimationManager.generateHorizontalFrames(0, 5),
        frameRate: 12,
        repeat: 0 // Проигрывается один раз, без цикла
      }
    ]
  },
  {
    load: {
      key: 'character_get_key',
      path: 'Character.GetKey_424x35.png',
      frameWidth: 53, // 424 / 8 = 53
      frameHeight: 35,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 8
    },
    animations: [
      {
        key: 'character_get_key',
        frames: AnimationManager.generateHorizontalFrames(0, 7),
        frameRate: 12,
        repeat: 0 // Проигрывается один раз, без цикла
      }
    ]
  },
  {
    load: {
      key: 'character_apply_key',
      path: 'Character.ApplyKey128x32.png',
      frameWidth: 32, // 128 / 4 = 32
      frameHeight: 32,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 4
    },
    animations: [
      {
        key: 'character_apply_key',
        frames: AnimationManager.generateHorizontalFrames(0, 3),
        frameRate: 12,
        repeat: 0 // Проигрывается один раз, без цикла
      }
    ]
  },
  {
    load: {
      key: 'character_damaged',
      path: 'Character.Damaged_64x16.png',
      frameWidth: 16, // 64 / 4 = 16
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 4
    },
    animations: [
      {
        key: 'character_damaged',
        frames: AnimationManager.generateHorizontalFrames(0, 3),
        frameRate: 12,
        repeat: 0 // Проигрывается один раз, без цикла
      }
    ]
  },
  {
    load: {
      key: 'character_gameover',
      path: 'Character.GameOver_16x16.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 1
    },
    animations: [] // Статическая текстура, анимация не нужна
  },

  // ========== АНИМАЦИИ ВРАГОВ ==========
  {
    load: {
      key: 'enemy_death',
      path: 'Enemy.Death_192x32.png',
      frameWidth: 32, // 192 / 6 = 32
      frameHeight: 32,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 6
    },
    animations: [
      {
        key: 'enemy_death',
        frames: AnimationManager.generateHorizontalFrames(0, 5),
        frameRate: 12,
        repeat: 0 // Проигрывается один раз, без цикла
      }
    ]
  },

  // ========== АНИМАЦИИ ОРАКУЛА ==========
  {
    load: {
      key: 'oracle_coin_sheet',
      path: 'Oracle.Coin_128x64.png',
      frameWidth: 32, // 128 / 4 = 32 (4 кадра горизонтально)
      frameHeight: 64,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 4
    },
    animations: [] // Статические кадры, анимация не нужна (кадры переключаются вручную)
  },
  {
    load: {
      key: 'oracle_activation_sheet',
      path: 'Oracle.Activation_16F_512x64.png',
      frameWidth: 32, // 512 / 16 = 32 (файл 512x64, 16 кадров горизонтально)
      frameHeight: 64,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 16
    },
    animations: [
      {
        key: 'oracle_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 15), // Кадры 0-15 (16 кадров)
        frameRate: 12, // Скорость анимации
        repeat: -1 // Проигрывается циклично
      }
    ]
  },
  {
    load: {
      key: 'oracle_activated_sheet',
      path: 'Oracle.Activated_16F_512x64.png',
      frameWidth: 32, // 512 / 16 = 32 (файл 512x64, 16 кадров горизонтально)
      frameHeight: 64,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 16
    },
    animations: [
      {
        key: 'oracle_activated',
        frames: AnimationManager.generateHorizontalFrames(0, 15), // Кадры 0-15 (16 кадров)
        frameRate: 12, // Increased from 8 to prevent "slow" feel
        repeat: -1 // Проигрывается циклично после активации
      }
    ]
  },
  {
    load: {
      key: 'oracle_interaction_sheet',
      path: 'Oracle.Interaction_16F_512x64.png',
      frameWidth: 32,
      frameHeight: 64,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 16
    },
    animations: [
      {
        key: 'oracle_interaction',
        frames: AnimationManager.generateHorizontalFrames(0, 15),
        frameRate: 24, // Ускорено до 24 FPS для быстрого отклика (0.66с)
        repeat: 0
      }
    ]
  },

  // ========== АНИМАЦИИ ПОРТАЛОВ ==========
  // Портал A - Base состояние
  {
    load: {
      key: 'portal_a_base_sheet',
      path: 'Portal_A.Base_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_a_base',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована с другими состояниями порталов)
        repeat: -1 // Циклично
      }
    ]
  },
  // Портал A - Activation состояние
  {
    load: {
      key: 'portal_a_activation_sheet',
      path: 'Portal_A.Activation_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_a_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_a_activation_2x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_a_activation_3x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      }
    ]
  },
  // Портал A - Activated состояние
  {
    load: {
      key: 'portal_a_activated_sheet',
      path: 'Portal_A.Activated_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_a_activated',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично после активации
      }
    ]
  },
  // Портал B - Base состояние
  {
    load: {
      key: 'portal_b_base_sheet',
      path: 'Portal_B.Base_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_b_base',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично
      }
    ]
  },
  // Портал B - Activation состояние
  {
    load: {
      key: 'portal_b_activation_sheet',
      path: 'Portal_B.Activation_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_b_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_b_activation_2x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_b_activation_3x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      }
    ]
  },
  // Портал B - Activated состояние
  {
    load: {
      key: 'portal_b_activated_sheet',
      path: 'Portal_B.Activated_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_b_activated',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично после активации
      }
    ]
  },
  // Портал C - Base состояние
  {
    load: {
      key: 'portal_c_base_sheet',
      path: 'Portal_C.Base_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_c_base',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично
      }
    ]
  },
  // Портал C - Activation состояние
  {
    load: {
      key: 'portal_c_activation_sheet',
      path: 'Portal_C.Activation_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_c_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_c_activation_2x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      },
      {
        key: 'portal_c_activation_3x',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично во время активации
      }
    ]
  },
  // Портал C - Activated состояние
  {
    load: {
      key: 'portal_c_activated_sheet',
      path: 'Portal_C.Activated_24F_1536x48.png',
      frameWidth: 64, // 1536 / 24 = 64 (файл 1536x48, 24 кадра горизонтально)
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_c_activated',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23 (24 кадра)
        frameRate: 8, // Скорость анимации (унифицирована)
        repeat: -1 // Циклично после активации
      }
    ]
  },
  // ========== АНИМАЦИИ ПОРТАЛОВ (STANDARD - AUTO MODE) ==========
  // Portal Standard Interaction (Common for A, B, C)
  {
    load: {
      key: 'portal_interaction_sheet',
      path: 'Portal_ABC.Interaction_8F_512x48.png',
      frameWidth: 64, // 512 / 8 = 64
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 8
    },
    animations: [
      {
        key: 'portal_interaction',
        frames: AnimationManager.generateHorizontalFrames(0, 7),
        frameRate: 12,
        repeat: 0
      }
    ]
  },

  // ========== АНИМАЦИИ PORTAL DOOR (TILED MAP MODE) ==========
  // Portal Door Interaction (Common for A, B, C)
  {
    load: {
      key: 'portal_door_interaction_sheet',
      path: 'PortalDoor.ABC.Interaction_8F_256x48.png',
      frameWidth: 32, // 256 / 8 = 32
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 8
    },
    animations: [
      {
        key: 'portal_door_interaction',
        frames: AnimationManager.generateHorizontalFrames(0, 7),
        frameRate: 12,
        repeat: 0
      }
    ]
  },
  // Portal Door A - Activation
  {
    load: {
      key: 'portal_door_a_activation_sheet',
      path: 'PortalDoor.A.Activation_24F_768x48.png',
      frameWidth: 32, // 768 / 24 = 32
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_door_a_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  // Portal Door B - Activation
  {
    load: {
      key: 'portal_door_b_activation_sheet',
      path: 'PortalDoor.B.Activation_24F_768x48.png',
      frameWidth: 32,
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_door_b_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  // Portal Door C - Activation
  {
    load: {
      key: 'portal_door_c_activation_sheet',
      path: 'PortalDoor.C.Activation_24F_768x48.png',
      frameWidth: 32,
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24
    },
    animations: [
      {
        key: 'portal_door_c_activation',
        frames: AnimationManager.generateHorizontalFrames(0, 23),
        frameRate: 8,
        repeat: -1
      }
    ]
  },
  // Portal Door Activated (24 frames animation)
  {
    load: {
      key: 'portal_door_activated_sheet',
      path: 'Portal.Door.Activated_24F_768x48.png', // ✅ Новый анимированный спрайтшит
      frameWidth: 32, // 768 / 24 = 32
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 24 // ✅ 24 кадра вместо 1
    },
    animations: [
      {
        key: 'portal_door_activated',
        frames: AnimationManager.generateHorizontalFrames(0, 23), // Кадры 0-23
        frameRate: 8, // Скорость анимации (унифицирована с portal states)
        repeat: -1 // Циклично
      }
    ]
  },
  // Portal Door Base (Single frame treated as animation for consistency if needed, or just load as image)
  // Loading as spritesheet to allow easy switching if it becomes animated later
  {
    load: {
      key: 'portal_door_base_sheet',
      path: 'Portal.Door.Base_32x48.png', // Используем общий файл
      frameWidth: 32,
      frameHeight: 48,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 1
    },
    animations: [
      {
        key: 'portal_door_base',
        frames: AnimationManager.generateHorizontalFrames(0, 0),
        frameRate: 1,
        repeat: -1
      }
    ]
  },
  // ========== UI ЭЛЕМЕНТЫ (9-slice) ==========
  {
    load: {
      key: 'ui_dialog_box',
      path: 'UI.DialogBox_24x24.png',
      frameWidth: 8,
      frameHeight: 8,
      layout: SpritesheetLayout.GRID,
      rows: 3,
      cols: 3
    },
    animations: [] // Статические кадры для 9-slice фона
  },
  {
    load: {
      key: 'ui_dialog_button',
      path: 'UI.DialogButton_15x15.png',
      frameWidth: 5,
      frameHeight: 5,
      layout: SpritesheetLayout.GRID,
      rows: 3,
      cols: 3
    },
    animations: [] // Статические кадры для 9-slice кнопок
  },
  {
    load: {
      key: 'ui_coin_bubble',
      path: 'UI.CoinBubble_30x30.png',  // ⚠️ НОВОЕ - 9-sliced баббл для квиза монеток
      frameWidth: 10,  // 30 / 3 = 10
      frameHeight: 10, // 30 / 3 = 10
      layout: SpritesheetLayout.GRID,
      rows: 3,
      cols: 3
    },
    animations: [] // Статические кадры для 9-slice кнопок монеток
  },
  {
    load: {
      key: 'ui_dialog_close',
      path: 'UI.DialogClose_14x14.png',
      frameWidth: 14,
      frameHeight: 14,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 1
    },
    animations: [] // Одиночный кадр для кнопки закрытия
  },
  {
    load: {
      key: 'ui_sound_toggle',
      path: 'UI.SoundToggle_16x8.png',
      frameWidth: 8,
      frameHeight: 8,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 2
    },
    animations: [] // Кадр 0: звук вкл, Кадр 1: звук выкл
  }
];


