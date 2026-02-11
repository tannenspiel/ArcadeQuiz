import React, { useRef, Suspense } from 'react';
import { IPhaserGameRef } from './PhaserGame';
import { LoadingSpinner } from './components/LoadingSpinner';

// ✅ Lazy load PhaserGame to reduce initial bundle size
// This allows the browser to render the splash screen immediately while Phaser downloads
const PhaserGame = React.lazy(() => import('./PhaserGame'));

/**
 * ✅ UNIFIED LOADING SCREEN
 * - LoadingScreen компонент React больше не нужен
 * - Phaser LoadingScene показывает единый прогресс-бар (0-100%)
 * - 0-50%: Загрузка ассетов через Phaser loader
 * - 50-100%: Инициализация MainScene (через EventBus)
 */
const App: React.FC = () => {
  // Ref to track if game is loaded
  const gameRef = useRef<IPhaserGameRef>(null);

  // ✅ TBT Optimization: Defer Phaser initialization
  // We wait for the initial render and hydration to complete before starting the heavy Phaser script.
  // This unblocks the main thread for ~200ms, allowing the LoadingSpinner to animate smoothly via CSS.
  // UPDATE: Using requestIdleCallback for safety.
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Fix TBT: Wait for browser idle to start heavy parsing
    // requestIdleCallback is safer than setTimeout
    const startPhaser = () => setIsReady(true);

    if ('requestIdleCallback' in window) {
      // Timeout 1s ensures it runs even if busy
      // @ts-ignore - requestIdleCallback might not be in TS types
      const handle = window.requestIdleCallback(startPhaser, { timeout: 1000 });
      // @ts-ignore
      return () => window.cancelIdleCallback(handle);
    } else {
      // Safari/Legacy fallback
      const timer = setTimeout(startPhaser, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {/* Phaser Game - заполняет всю область */}
      <div className="absolute inset-0">
        {isReady && (
          <Suspense fallback={<LoadingSpinner />}>
            <PhaserGame ref={gameRef} />
          </Suspense>
        )}
        {!isReady && <LoadingSpinner />}
      </div>
    </div>
  );
};

export default App;
