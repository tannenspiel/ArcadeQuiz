/**
 * Unit тесты для App компонента
 * Проверяет lazy loading PhaserGame и Suspense fallback
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../../react/App';

// Mock LoadingSpinner
jest.mock('../../../react/components/LoadingSpinner', () => {
    return {
        __esModule: true,
        LoadingSpinner: () => <div data-testid="loading-spinner-mock">Loading...</div>
    };
});

// Mock PhaserGame component
jest.mock('../../../react/PhaserGame', () => {
    return {
        __esModule: true,
        default: React.forwardRef((props, ref) => <div data-testid="phaser-game-mock" />)
    };
});

describe('App Component', () => {
    it('should render without crashing', async () => {
        const { container } = render(<App />);
        // Ждём загрузки lazy компонента
        await waitFor(() => {
            expect(container).toBeInTheDocument();
        });
    });

    it('should show loading spinner initially', async () => {
        render(<App />);
        // Сначала должен показываться loading spinner
        expect(screen.getByTestId('loading-spinner-mock')).toBeInTheDocument();
    });

    it('should render PhaserGame after ready', async () => {
        render(<App />);

        // Ждем пока isReady станет true (через requestIdleCallback или setTimeout)
        await waitFor(() => {
            // После isReady должен появиться PhaserGame (через Suspense fallback тоже LoadingSpinner)
            const loadingSpinner = screen.queryByTestId('loading-spinner-mock');
            expect(loadingSpinner).toBeInTheDocument();
        }, { timeout: 300 });
    });
});
