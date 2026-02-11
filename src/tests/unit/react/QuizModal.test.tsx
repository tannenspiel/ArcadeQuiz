/**
 * Unit тесты для QuizModal компонента
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizModal from '../../../react/components/QuizModal';
import { QuizData } from '../../../types/gameTypes';

describe('QuizModal', () => {
  const mockQuizRune: QuizData = {
    question: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctIndex: 1,
    context: 'key'
  };

  const mockQuizPortal: QuizData = {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris'],
    correctIndex: 2,
    context: 'portal'
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    mockOnAnswer.mockClear();
  });

  describe('Рендеринг', () => {
    it('должен отображать модальное окно викторины', () => {
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);
      
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    it('должен отображать все варианты ответов', () => {
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('должен отображать тему для ключей', () => {
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);

      expect(screen.getByText(/KEY GUARDIAN QUIZ/i)).toBeInTheDocument();
    });

    it('должен отображать тему для порталов', () => {
      render(<QuizModal quiz={mockQuizPortal} onAnswer={mockOnAnswer} />);
      
      expect(screen.getByText(/PORTAL CONNECTION/i)).toBeInTheDocument();
    });
  });

  describe('Обработка ответов', () => {
    it('должен вызывать onAnswer с true при правильном ответе', async () => {
      const user = userEvent.setup();
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);
      
      const correctButton = screen.getByText('4');
      await user.click(correctButton);
      
      expect(mockOnAnswer).toHaveBeenCalledWith(true);
    });

    it('должен вызывать onAnswer с false при неправильном ответе', async () => {
      const user = userEvent.setup();
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);
      
      const wrongButton = screen.getByText('3');
      await user.click(wrongButton);
      
      expect(mockOnAnswer).toHaveBeenCalledWith(false);
    });

    it('должен обрабатывать клики на все варианты ответов', async () => {
      const user = userEvent.setup();
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);
      
      await user.click(screen.getByText('3'));
      expect(mockOnAnswer).toHaveBeenCalledWith(false);
      
      mockOnAnswer.mockClear();
      
      await user.click(screen.getByText('4'));
      expect(mockOnAnswer).toHaveBeenCalledWith(true);
      
      mockOnAnswer.mockClear();
      
      await user.click(screen.getByText('5'));
      expect(mockOnAnswer).toHaveBeenCalledWith(false);
    });
  });

  describe('Темы', () => {
    it('должен показывать правильный текст подсказки для ключей', () => {
      render(<QuizModal quiz={mockQuizRune} onAnswer={mockOnAnswer} />);

      expect(screen.getByText(/Correct answer grants a Key/i)).toBeInTheDocument();
    });

    it('должен показывать правильный текст подсказки для порталов', () => {
      render(<QuizModal quiz={mockQuizPortal} onAnswer={mockOnAnswer} />);
      
      expect(screen.getByText(/Choose wisely/i)).toBeInTheDocument();
    });
  });
});










































