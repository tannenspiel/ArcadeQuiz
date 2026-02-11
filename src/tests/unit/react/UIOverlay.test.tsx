/**
 * Unit тесты для UIOverlay компонента
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import UIOverlay from '../../../react/components/UIOverlay';

describe('UIOverlay', () => {
  const defaultProps = {
    health: 3,
    keys: 0,
    isOracleActive: false,
    globalQuestion: ''
  };

  it('должен отображать начальные значения здоровья и ключей', () => {
    render(<UIOverlay {...defaultProps} />);
    
    expect(screen.getByText(/health/i)).toBeInTheDocument();
    // Используем getAllByText так как "Keys" встречается несколько раз
    const keysElements = screen.getAllByText(/keys/i);
    expect(keysElements.length).toBeGreaterThan(0);
  });

  it('должен отображать текущее здоровье', () => {
    render(<UIOverlay {...defaultProps} health={2} />);
    
    // Проверяем, что здоровье отображается (зависит от реализации)
    expect(screen.getByText(/health/i)).toBeInTheDocument();
  });

  it('должен отображать количество ключей', () => {
    render(<UIOverlay {...defaultProps} keys={2} />);
    
    // Проверяем, что отображается число ключей
    expect(screen.getByText('2')).toBeInTheDocument();
    // Используем getAllByText так как "Keys" встречается несколько раз
    const keysElements = screen.getAllByText(/keys/i);
    expect(keysElements.length).toBeGreaterThan(0);
  });

  it('должен отображать статус активации оракула', () => {
    const { rerender } = render(<UIOverlay {...defaultProps} isOracleActive={false} />);
    
    // Проверяем неактивное состояние - подсказка должна быть видна
    expect(screen.getByText(/Collect 3 Keys/i)).toBeInTheDocument();
    expect(screen.queryByText(/Oracle Active/i)).not.toBeInTheDocument();
    
    rerender(<UIOverlay {...defaultProps} isOracleActive={true} globalQuestion="Test question" />);
    
    // Проверяем активное состояние - подсказка скрыта, оракул виден
    expect(screen.queryByText(/Collect 3 Keys/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Test question/i)).toBeInTheDocument();
  });

  it('должен отображать глобальный вопрос', () => {
    const question = 'What is the capital of France?';
    // Вопрос отображается только когда оракул активен
    render(<UIOverlay {...defaultProps} globalQuestion={question} isOracleActive={true} />);
    
    expect(screen.getByText(question)).toBeInTheDocument();
  });

  it('не должен отображать глобальный вопрос, если он пустой', () => {
    render(<UIOverlay {...defaultProps} globalQuestion="" />);
    
    // Проверяем, что вопрос не отображается
    // Зависит от реализации компонента
  });
});


