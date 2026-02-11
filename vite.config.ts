import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteCompression from 'vite-plugin-compression';

console.log('✅ [Vite Config] NODE_ENV:', process.env.NODE_ENV);
console.log('✅ [Vite Config] ESBUILD settings:', process.env.NODE_ENV === 'production' ? 'Dropping logs' : 'Keeping logs');

console.log('✅ [Vite Config] NODE_ENV:', process.env.NODE_ENV);

export default defineConfig(({ command, mode }) => {
    console.log(`✅ [Vite Config] Mode: ${mode}, Command: ${command}`);
    const isProd = mode === 'production';

    return {
        // ✅ PROD: Base path for GitHub Pages deployment (repository name)
        base: isProd ? '/ArcadeQuiz/' : '/',
        plugins: [
            react(),
            // ✅ Gzip compression for production build to limit FCP/LCP impact
            viteCompression({
                algorithm: 'gzip',
                ext: '.gz',
            }),
            // Копируем ассеты из src/assets в dist/assets для продакшн сборки
            // Исключаем: audio_archive (не нужен), fonts (PixeloidSans не используется)
            viteStaticCopy({
                targets: [
                    { src: 'src/assets/Game_01/audio', dest: 'assets/Game_01' },
                    { src: 'src/assets/Game_01/images', dest: 'assets/Game_01' },
                    { src: 'src/assets/Game_01/questions', dest: 'assets/Game_01' },
                    { src: 'src/assets/Game_01/level_maps', dest: 'assets/Game_01' }
                ]
            })
        ],
        // Разрешаем загрузку переменных окружения с префиксами VITE_ и ARCADE_LOG_
        envPrefix: ['VITE_', 'ARCADE_LOG_'],
        server: {
            port: 3000,
            strictPort: true,
            open: false,
            host: '0.0.0.0',
            // Отключаем WebSocket HMR полностью (вызывает ошибки в Windows)
            // Обновляйте страницу вручную (F5) после изменения файлов
            hmr: false
        },
        build: {
            target: 'es2015',
            outDir: 'dist',
            assetsDir: 'assets',
            // ✅ PROD: Удаляем все console.log и debugger из сборки
            minify: 'esbuild',
            // ❌ TBT FIX: Отключаем предзагрузку модулей, чтобы Phaser грузился ТОЛЬКО по требованию
            // Это критично для мгновенного FCP, иначе браузер парсит 1.2MB JS сразу же
            modulePreload: false,
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        if (id.includes('node_modules')) {
                            if (id.includes('phaser')) return 'phaser';
                            if (id.includes('react')) return 'react';
                            return 'vendor';
                        }
                    }
                }
            }
        },
        // ✅ PROD: Удаляем все console.log и debugger ТОЛЬКО из production сборки
        // В dev режиме логи должны работать для отладки
        esbuild: isProd ? {
            drop: ['console', 'debugger']
        } : {},
        // PWA: копируем Service Worker и manifest из public в корень dist
        publicDir: 'public'
    };
});