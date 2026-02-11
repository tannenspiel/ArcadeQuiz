/**
 * Утилиты для определения характеристик устройства
 */

import { BASE_GAME_HEIGHT, MIN_GAME_WIDTH, MAX_GAME_WIDTH } from '../constants/gameConstants';

export class DeviceUtils {
    /**
     * Определяет, является ли устройство touch-устройством
     */
    static isTouchDevice(): boolean {
        if (typeof window === 'undefined') return false;
        
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               (navigator as any).msMaxTouchPoints > 0;
    }
    
    /**
     * Определяет ориентацию экрана
     */
    static getOrientation(): 'portrait' | 'landscape' {
        if (typeof window === 'undefined') return 'portrait';
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    /**
     * Определяет, запущено ли приложение в iframe
     */
    static isInIframe(): boolean {
        if (typeof window === 'undefined') return false;
        
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }
    
    /**
     * Получает pixel ratio устройства
     */
    static getPixelRatio(): number {
        if (typeof window === 'undefined') return 1;
        return window.devicePixelRatio || 1;
    }
    
    /**
     * Получает информацию об устройстве
     */
    static getDeviceInfo(): {
        isTouch: boolean;
        orientation: 'portrait' | 'landscape';
        isInIframe: boolean;
        pixelRatio: number;
        userAgent: string;
    } {
        return {
            isTouch: this.isTouchDevice(),
            orientation: this.getOrientation(),
            isInIframe: this.isInIframe(),
            pixelRatio: this.getPixelRatio(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
        };
    }
    
    /**
     * Определяет тип устройства: 'mobile', 'tablet' или 'desktop'
     */
    static getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        if (typeof window === 'undefined') return 'desktop';
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        const maxDimension = Math.max(width, height);
        const isTouch = this.isTouchDevice();
        
        // Если это touch-устройство
        if (isTouch) {
            // Планшеты обычно имеют больший экран
            if (maxDimension >= 768) {
                return 'tablet';
            }
            // Мобильные устройства
            return 'mobile';
        }
        
        // Desktop устройства
        return 'desktop';
    }
    /**
     * Рассчитывает размеры игры на основе текущего окна браузера.
     * Виртуальный экран адаптируется под соотношение сторон.
     */
    static getGameSize(): { width: number; height: number } {
        if (typeof window === 'undefined') {
            return { width: 720, height: BASE_GAME_HEIGHT };
        }
        
        // Используем visualViewport для мобильных устройств (учитывает адресную строку)
        let w: number, h: number;
        if (window.visualViewport) {
            w = window.visualViewport.width;
            h = window.visualViewport.height;
        } else {
            w = window.innerWidth;
            h = window.innerHeight;
        }
        
        const height = BASE_GAME_HEIGHT;
        const aspect = w / h;
        let width = height * aspect;
        // Защита от слишком узких/широких экранов
        width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));
        return { width, height };
    }
}




