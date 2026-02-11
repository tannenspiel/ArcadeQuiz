/**
 * Unit тесты для GameOverModal компонента
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameOverModal from '../../../react/components/GameOverModal';

describe('GameOverModal', () => {
  const mockOnRestart = jest.fn();

  beforeEach(() => {
    mockOnRestart.mockClear();
  });

  describe('Рендеринг победы', () => {
    it('должен отображать экран победы', () => {
      render(<GameOverModal result="win" onRestart={mockOnRestart} />);

      expect(screen.getByText(/victory!/i)).toBeInTheDocument();
      expect(screen.getByText(/you successfully solved/i)).toBeInTheDocument();
    });

    it('должен отображать кнопку "Try Again"', () => {
      render(<GameOverModal result="win" onRestart={mockOnRestart} />);
      
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Рендеринг поражения', () => {
    it('должен отображать экран поражения', () => {
      render(<GameOverModal result="lose" onRestart={mockOnRestart} />);
      
      expect(screen.getByText('GAME OVER')).toBeInTheDocument();
      expect(screen.getByText(/Your spirit has faded/i)).toBeInTheDocument();
    });
  });

  describe('Обработка перезапуска', () => {
    it('должен вызывать onRestart при клике на кнопку', async () => {
      const user = userEvent.setup();
      render(<GameOverModal result="win" onRestart={mockOnRestart} />);
      
      const restartButton = screen.getByText('Try Again');
      await user.click(restartButton);
      
      expect(mockOnRestart).toHaveBeenCalledTimes(1);
    });

    it('должен вызывать onRestart для экрана поражения', async () => {
      const user = userEvent.setup();
      render(<GameOverModal result="lose" onRestart={mockOnRestart} />);
      
      const restartButton = screen.getByText('Try Again');
      await user.click(restartButton);
      
      expect(mockOnRestart).toHaveBeenCalledTimes(1);
    });
  });
});
































































