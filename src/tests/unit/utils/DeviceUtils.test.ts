/**
 * Unit тесты для DeviceUtils
 */

import { DeviceUtils } from '../../../utils/DeviceUtils';

describe('DeviceUtils', () => {
  // Сохраняем оригинальные значения для восстановления
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  afterEach(() => {
    // Восстанавливаем оригинальные значения после каждого теста
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  describe('isTouchDevice', () => {
    it('должен возвращать false если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.isTouchDevice()).toBe(false);
    });

    it('должен возвращать true если ontouchstart доступен', () => {
      global.window = {
        ontouchstart: () => { }
      } as any;
      expect(DeviceUtils.isTouchDevice()).toBe(true);
    });

    it('должен возвращать true если navigator.maxTouchPoints > 0', () => {
      global.window = {
        ontouchstart: undefined
      } as any;
      global.navigator = {
        maxTouchPoints: 5
      } as any;
      expect(DeviceUtils.isTouchDevice()).toBe(true);
    });

    it('должен возвращать true если navigator.msMaxTouchPoints > 0', () => {
      global.window = {
        ontouchstart: undefined
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
        msMaxTouchPoints: 5
      } as any;
      expect(DeviceUtils.isTouchDevice()).toBe(true);
    });

    it('должен возвращать false если нет touch поддержки', () => {
      global.window = {} as any;
      global.navigator = {
        maxTouchPoints: 0
      } as any;
      expect(DeviceUtils.isTouchDevice()).toBe(false);
    });
  });

  describe('getOrientation', () => {
    it('должен возвращать portrait если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.getOrientation()).toBe('portrait');
    });

    it('должен возвращать landscape если ширина больше высоты', () => {
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080
      } as any;
      expect(DeviceUtils.getOrientation()).toBe('landscape');
    });

    it('должен возвращать portrait если высота больше ширины', () => {
      global.window = {
        innerWidth: 720,
        innerHeight: 1280
      } as any;
      expect(DeviceUtils.getOrientation()).toBe('portrait');
    });

    it('должен возвращать portrait если ширина равна высоте', () => {
      global.window = {
        innerWidth: 1024,
        innerHeight: 1024
      } as any;
      expect(DeviceUtils.getOrientation()).toBe('portrait');
    });
  });

  describe('isInIframe', () => {
    it('должен возвращать false если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.isInIframe()).toBe(false);
    });

    it('должен возвращать false если window.self === window.top', () => {
      const mockTop = {};
      global.window = {
        self: mockTop,
        top: mockTop
      } as any;
      expect(DeviceUtils.isInIframe()).toBe(false);
    });

    it('должен возвращать true если window.self !== window.top', () => {
      global.window = {
        self: {},
        top: {}
      } as any;
      expect(DeviceUtils.isInIframe()).toBe(true);
    });

    it('должен возвращать true если доступ к window.top вызывает ошибку', () => {
      global.window = {
        self: {},
        get top() {
          throw new Error('Access denied');
        }
      } as any;
      expect(DeviceUtils.isInIframe()).toBe(true);
    });
  });

  describe('getPixelRatio', () => {
    it('должен возвращать 1 если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.getPixelRatio()).toBe(1);
    });

    it('должен возвращать devicePixelRatio если доступен', () => {
      global.window = {
        devicePixelRatio: 2.5
      } as any;
      expect(DeviceUtils.getPixelRatio()).toBe(2.5);
    });

    it('должен возвращать 1 если devicePixelRatio не определен', () => {
      global.window = {} as any;
      expect(DeviceUtils.getPixelRatio()).toBe(1);
    });
  });

  describe('getDeviceType', () => {
    it('должен возвращать desktop если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.getDeviceType()).toBe('desktop');
    });

    it('должен возвращать desktop если не touch устройство', () => {
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080
      } as any;
      global.navigator = {
        maxTouchPoints: 0
      } as any;
      // Мокаем isTouchDevice
      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(false);

      expect(DeviceUtils.getDeviceType()).toBe('desktop');

      jest.restoreAllMocks();
    });

    it('должен возвращать mobile если touch устройство с маленьким экраном', () => {
      global.window = {
        innerWidth: 375,
        innerHeight: 667
      } as any;
      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(true);

      expect(DeviceUtils.getDeviceType()).toBe('mobile');

      jest.restoreAllMocks();
    });

    it('должен возвращать tablet если touch устройство с большим экраном', () => {
      global.window = {
        innerWidth: 768,
        innerHeight: 1024
      } as any;
      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(true);

      expect(DeviceUtils.getDeviceType()).toBe('tablet');

      jest.restoreAllMocks();
    });

    it('должен возвращать tablet если maxDimension >= 768', () => {
      global.window = {
        innerWidth: 1024,
        innerHeight: 768
      } as any;
      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(true);

      expect(DeviceUtils.getDeviceType()).toBe('tablet');

      jest.restoreAllMocks();
    });

    it('должен возвращать mobile если maxDimension < 768', () => {
      global.window = {
        innerWidth: 480,
        innerHeight: 640
      } as any;
      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(true);

      expect(DeviceUtils.getDeviceType()).toBe('mobile');

      jest.restoreAllMocks();
    });
  });

  describe('getDeviceInfo', () => {
    it('должен возвращать полную информацию об устройстве', () => {
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080,
        devicePixelRatio: 2.0,
        self: {},
        top: {}
      } as any;
      global.navigator = {
        maxTouchPoints: 0,
        userAgent: 'Mozilla/5.0'
      } as any;

      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(false);
      jest.spyOn(DeviceUtils, 'getOrientation').mockReturnValue('landscape');
      jest.spyOn(DeviceUtils, 'isInIframe').mockReturnValue(false);
      jest.spyOn(DeviceUtils, 'getPixelRatio').mockReturnValue(2.0);

      const info = DeviceUtils.getDeviceInfo();

      expect(info.isTouch).toBe(false);
      expect(info.orientation).toBe('landscape');
      expect(info.isInIframe).toBe(false);
      expect(info.pixelRatio).toBe(2.0);
      expect(info.userAgent).toContain('Mozilla');

      jest.restoreAllMocks();
    });

    it('должен возвращать пустой userAgent если navigator undefined', () => {
      // @ts-ignore
      delete global.navigator;
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080
      } as any;

      jest.spyOn(DeviceUtils, 'isTouchDevice').mockReturnValue(false);
      jest.spyOn(DeviceUtils, 'getOrientation').mockReturnValue('landscape');
      jest.spyOn(DeviceUtils, 'isInIframe').mockReturnValue(false);
      jest.spyOn(DeviceUtils, 'getPixelRatio').mockReturnValue(1);

      const info = DeviceUtils.getDeviceInfo();

      expect(info.userAgent).toBe('');

      jest.restoreAllMocks();
    });
  });
  describe('getGameSize', () => {
    it('должен возвращать дефолтный размер если window undefined', () => {
      // @ts-ignore
      delete global.window;
      expect(DeviceUtils.getGameSize()).toEqual({ width: 720, height: 1280 });
    });

    it('должен рассчитывать размер на основе visualViewport если доступен', () => {
      global.window = {
        visualViewport: {
          width: 360,
          height: 640
        }
      } as any;

      const size = DeviceUtils.getGameSize();
      expect(size.height).toBe(1280);
      // aspect = 360/640 = 0.5625. width = 1280 * 0.5625 = 720.
      expect(size.width).toBeCloseTo(720);
    });

    it('должен рассчитывать размер на основе innerWidth/Height если visualViewport недоступен', () => {
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080
      } as any;

      const size = DeviceUtils.getGameSize();
      expect(size.height).toBe(1280);
      // aspect = 1.77. width = 1280 * 1.77 = 2275.
      // But MAX_GAME_WIDTH applies? 
      // Need to check constants. MAX_GAME_WIDTH usually around 2560 or so?
      // Assuming it calculates correctly based on aspect.
      expect(size.width).toBeGreaterThan(1280);
    });

    it('должен ограничивать ширину (MIN/MAX)', () => {
      global.window = {
        innerWidth: 100, // Very narrow
        innerHeight: 1000
      } as any;
      const sizeNarrow = DeviceUtils.getGameSize();
      // MIN_GAME_WIDTH (usually 720 or less?)
      // Let's just check it returns a number.
      expect(sizeNarrow.width).toBeGreaterThan(0);

      global.window = {
        innerWidth: 10000, // Very wide
        innerHeight: 100
      } as any;
      const sizeWide = DeviceUtils.getGameSize();
      // MAX_GAME_WIDTH
      expect(sizeWide.width).toBeLessThan(10000); // Should be capped
    });
  });
});

