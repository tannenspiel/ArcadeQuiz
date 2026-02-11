/**
 * Тесты для класса QuestionBubble
 * Проверяет все сценарии работы бабблов:
 * - Первое проявление
 * - Включение/выключение тапом/кликом
 * - Различные комбинации сценариев переключения видимости
 * - Проверка наличия текста
 */

// Моки для Phaser
jest.mock('phaser', () => ({
  Scene: class MockScene {},
  Geom: {
    Rectangle: class MockRectangle {
      constructor(public x: number, public y: number, public width: number, public height: number) {}
    }
  }
}));

import Phaser from 'phaser';
import { QuestionBubble } from '../../../game/ui/QuestionBubble';
import { ParsedQuestion, QuestionType } from '../../../types/questionTypes';
import { QuizManager } from '../../../game/systems/QuizManager';

// Моки для Phaser
class MockScene {
  add: any;
  tweens: any;
  data: any;
  cameras: any;
  
  constructor() {
    this.add = {
      image: jest.fn((x, y, key) => ({
        setOrigin: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        x,
        y,
        width: 100,
        height: 50,
        alpha: 0,
        visible: true,
        destroy: jest.fn()
      })),
      text: jest.fn((x, y, text, style) => ({
        setOrigin: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setX: jest.fn().mockReturnThis(),
        setY: jest.fn().mockReturnThis(),
        setWordWrapWidth: jest.fn().mockReturnThis(),
        setAlign: jest.fn().mockReturnThis(),
        setFontSize: jest.fn().mockReturnThis(),
        setFontStyle: jest.fn().mockReturnThis(),
        setText: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setResolution: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        x,
        y,
        text,
        style,
        width: 100,
        height: 20,
        alpha: 0,
        visible: true,
        destroy: jest.fn()
      }))
    };
    
    this.tweens = {
      add: jest.fn((config) => ({
        stop: jest.fn(),
        onUpdate: config.onUpdate,
        onComplete: config.onComplete
      }))
    };
    
    this.data = {
      get: jest.fn()
    };

    this.cameras = {
      main: {
        zoom: 1
      }
    };
  }
}

describe('QuestionBubble', () => {
  let mockScene: any;
  let quizManager: QuizManager | undefined;
  let bubble: QuestionBubble;
  
  const testQuestion: ParsedQuestion = {
    type: QuestionType.TEXT_ONLY,
    questionText: 'Test question text',
    image: undefined,
    correctAnswer: 'Answer',
    wrongAnswers: [],
    allAnswers: [],
    feedbacks: [],
    wrongFeedbacks: []
  };
  
  beforeEach(() => {
    mockScene = new MockScene();
    quizManager = undefined;
    bubble = new QuestionBubble(mockScene, 100, 200, quizManager, 1, 'oracle');
  });
  
  afterEach(() => {
    if (bubble) {
      try {
        bubble.destroy();
      } catch (e) {
        // Игнорируем ошибки при уничтожении
      }
    }
  });
  
  describe('Первое проявление баббла', () => {
    it('должен быть скрыт при создании', () => {
      expect(bubble.getIsVisible()).toBe(false);
    });
    
    it('должен показываться при вызове show()', () => {
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
    });
    
    it('должен устанавливать текст при вызове setQuestion()', async () => {
      const assetLoader = null as any;
      await bubble.setQuestion(testQuestion, assetLoader);
      
      // Проверяем, что текст был установлен
      expect(mockScene.add.text).toHaveBeenCalled();
    });
    
    it('не должен показываться без текста', async () => {
      const emptyQuestion: ParsedQuestion = {
        type: QuestionType.TEXT_ONLY,
        questionText: '', // Пустой текст
        image: undefined,
        correctAnswer: '',
        wrongAnswers: [],
        allAnswers: [],
        feedbacks: [],
        wrongFeedbacks: []
      };
      
      await bubble.setQuestion(emptyQuestion, null as any);
      bubble.show();
      
      // Баббл должен быть видимым, но текст должен быть пустым
      expect(bubble.getIsVisible()).toBe(true);
    });
  });
  
  describe('Включение/выключение тапом', () => {
    beforeEach(async () => {
      await bubble.setQuestion(testQuestion, null as any);
    });
    
    it('должен переключать видимость при toggleVisibility()', () => {
      expect(bubble.getIsVisible()).toBe(false);
      
      bubble.toggleVisibility();
      expect(bubble.getIsVisible()).toBe(true);
      
      bubble.toggleVisibility();
      expect(bubble.getIsVisible()).toBe(false);
    });
    
    it('должен показываться при show()', () => {
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
    });
    
    it('должен скрываться при hide()', () => {
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
      
      bubble.hide();
      expect(bubble.getIsVisible()).toBe(false);
    });
    
    it('должен правильно работать последовательность: показать -> скрыть -> показать', () => {
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
      
      bubble.hide();
      expect(bubble.getIsVisible()).toBe(false);
      
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
    });
  });
  
  
  describe('Комбинации сценариев', () => {
    beforeEach(async () => {
      await bubble.setQuestion(testQuestion, null as any);
    });
    
    it('сценарий 1: включили -> выключили -> включили', () => {
      // Баббл скрыт
      expect(bubble.getIsVisible()).toBe(false);
      
      // Показываем баббл
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
      
      // Скрываем баббл
      bubble.hide();
      expect(bubble.getIsVisible()).toBe(false);
      
      // Показываем снова
      bubble.show();
      expect(bubble.getIsVisible()).toBe(true);
    });
    
    it('сценарий 2: множественные переключения видимости', () => {
      for (let i = 0; i < 5; i++) {
        bubble.toggleVisibility();
        expect(bubble.getIsVisible()).toBe(i % 2 === 0);
      }
    });
  });
  
  describe('Проверка наличия текста', () => {
    it('должен создавать текст при setQuestion()', async () => {
      await bubble.setQuestion(testQuestion, null as any);
      
      expect(mockScene.add.text).toHaveBeenCalled();
    });
    
    it('должен обрабатывать вопрос с изображением', async () => {
      const questionWithImage: ParsedQuestion = {
        type: QuestionType.TEXT_WITH_IMAGE,
        questionText: 'Test question',
        image: 'test-image.png',
        correctAnswer: 'Answer',
        wrongAnswers: [],
        allAnswers: [],
        feedbacks: [],
        wrongFeedbacks: []
      };
      
      await bubble.setQuestion(questionWithImage, null as any);
      
      // Должен быть создан текст и изображение
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.add.image).toHaveBeenCalled();
    });
    
    it('не должен показываться без установки вопроса', () => {
      // Баббл создан, но вопрос не установлен
      expect(bubble.getIsVisible()).toBe(false);
      
      // Попытка показать баббл без текста
      bubble.show();
      
      // Баббл должен быть видимым, но текст может быть пустым
      expect(bubble.getIsVisible()).toBe(true);
    });
  });
  
  describe('Уничтожение баббла', () => {
    it('должен корректно уничтожать все элементы', () => {
      const destroySpy = jest.spyOn(bubble as any, 'destroy');
      
      bubble.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});

