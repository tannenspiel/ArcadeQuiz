import Phaser from 'phaser';
import { Oracle } from '../../entities/Oracle';
import { AssetLoader } from '../../core/AssetLoader';
import { QuizManager } from '../../systems/QuizManager';
import { LevelManager } from '../../core/LevelManager';
import { ParsedQuestion, QuestionType } from '../../../types/questionTypes';
import { USE_QUESTION_BUBBLE } from '../../../config/gameConfig';
import { DEPTHS } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';
import {
    GLOBAL_QUESTION_FONT_SIZE,
    DEFAULT_FONT_FAMILY,
    GLOBAL_QUESTION_FONT_STYLE,
    GLOBAL_QUESTION_COLOR,
    GLOBAL_QUESTION_BACKGROUND_COLOR
} from '../../../constants/textStyles';

/**
 * Callbacks for operations that require MainScene
 */
export interface GlobalQuestionCallbacks {
    onQuestionDisplayed: () => void;
    isSceneAndObjectActive: (obj?: { active?: boolean }) => boolean;
}

/**
 * Dependencies for GlobalQuestionManager
 */
export interface GlobalQuestionDependencies {
    scene: Phaser.Scene;
    oracle: Oracle;
    assetLoader: AssetLoader;
    quizManager: QuizManager;
    levelManager: LevelManager;
    currentGlobalQuestionData: ParsedQuestion | null;
    onSetCurrentGlobalQuestion: (data: ParsedQuestion | null) => void;
    getGlobalQuestionText: () => Phaser.GameObjects.Text | null;
    setGlobalQuestionText: (text: Phaser.GameObjects.Text | null) => void;
    getGlobalQuestionImage: () => Phaser.GameObjects.Image | null;
    setGlobalQuestionImage: (image: Phaser.GameObjects.Image | null) => void;
}

/**
 * Manages global question display for Oracle
 */
export class GlobalQuestionManager {
    constructor(
        private deps: GlobalQuestionDependencies,
        private callbacks: GlobalQuestionCallbacks
    ) { }

    /**
     * Shows the global question for the current level
     */
    public async showGlobalQuestion(): Promise<void> {
        logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: showGlobalQuestion() called');

        // Clear previous question
        const prevText = this.deps.getGlobalQuestionText();
        if (prevText) {
            prevText.destroy();
            this.deps.setGlobalQuestionText(null);
        }
        const prevImage = this.deps.getGlobalQuestionImage();
        if (prevImage) {
            prevImage.destroy();
            this.deps.setGlobalQuestionImage(null);
        }

        try {
            const currentLevel = this.deps.levelManager.getCurrentLevel();
            logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Current level:', currentLevel);

            // Use saved question or load new one
            let questionData = this.deps.currentGlobalQuestionData;
            if (!questionData) {
                logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Loading global question...');
                questionData = await this.deps.quizManager.getRandomGlobalQuestion(currentLevel);
                this.deps.onSetCurrentGlobalQuestion(questionData);
                logger.log('QUIZ_GLOBAL', '✅ GlobalQuestionManager: Question selected:', questionData.questionText);
            } else {
                logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Using existing question:', questionData.questionText);
            }

            if (!questionData) {
                throw new Error('Question data is null');
            }

            // Use QuestionBubble if flag is enabled
            if (USE_QUESTION_BUBBLE) {
                logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Using QuestionBubble');
                await this.deps.oracle.setQuestion(questionData, this.deps.assetLoader);
                logger.log('QUIZ_GLOBAL', '✅ GlobalQuestionManager: QuestionBubble set');
            } else {
                // Old implementation with text and image
                await this.showQuestionOldImpl(questionData);
            }

            this.callbacks.onQuestionDisplayed();
        } catch (error) {
            console.error('❌ GlobalQuestionManager: Error showing question:', error);
        }
    }

    /**
     * Shows fallback global question (used when no question available)
     */
    public async showFallbackGlobalQuestion(): Promise<void> {
        logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: showFallbackGlobalQuestion() called');

        // Clear previous
        const prevImage = this.deps.getGlobalQuestionImage();
        if (prevImage) {
            prevImage.destroy();
            this.deps.setGlobalQuestionImage(null);
        }

        // Fallback questions
        const fallbackQuestions = [
            'What is the capital of France?',
            'What is 5 × 5?',
            'What is the chemical formula for water?',
            'What is the largest planet in our solar system?'
        ];

        const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

        if (USE_QUESTION_BUBBLE) {
            logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Using QuestionBubble for fallback');

            const fallbackQuestionData: ParsedQuestion = {
                type: QuestionType.TEXT_ONLY,
                questionText: randomQuestion,
                image: undefined,
                correctAnswer: 'Paris',
                wrongAnswers: ['London', 'Berlin'],
                allAnswers: ['Paris', 'London', 'Berlin'].sort(() => Math.random() - 0.5),
                feedbacks: ['Correct!'],
                wrongFeedbacks: ['Try again!']
            };

            await this.safeSetOracleQuestion(fallbackQuestionData);
            logger.log('QUIZ_GLOBAL', '✅ GlobalQuestionManager: Fallback QuestionBubble created');
        } else {
            // Old implementation with text
            const oracleSprite = this.deps.oracle.getSprite();
            const oracleX = oracleSprite.x;
            const oracleY = oracleSprite.y;

            // Calculate bubble Y position
            const { calculateBubbleY } = require('../../utils/BubblePositionCalculator');
            const questionY = calculateBubbleY(oracleY, 'oracle', 'oracle');

            const questionText = this.deps.scene.add.text(oracleX, questionY, randomQuestion, {
                fontSize: `${GLOBAL_QUESTION_FONT_SIZE}px`,
                fontFamily: DEFAULT_FONT_FAMILY,
                fontStyle: GLOBAL_QUESTION_FONT_STYLE,
                color: GLOBAL_QUESTION_COLOR,
                stroke: '#000000',
                strokeThickness: 4,
                backgroundColor: GLOBAL_QUESTION_BACKGROUND_COLOR,
                padding: { x: 15, y: 10 },
                align: 'center',
                wordWrap: { width: 500 }
            }).setOrigin(0.5).setDepth(DEPTHS.SCREEN.GLOBAL_QUESTION);

            this.deps.setGlobalQuestionText(questionText);
        }
    }

    /**
     * Safe wrapper for setting oracle question
     */
    public async safeSetOracleQuestion(questionData: ParsedQuestion): Promise<void> {
        try {
            if (!this.callbacks.isSceneAndObjectActive()) {
                console.warn('⚠️ GlobalQuestionManager: Scene not active, skipping setQuestion');
                return;
            }
            if (!this.deps.oracle || !this.deps.oracle.getSprite()?.active) {
                console.warn('⚠️ GlobalQuestionManager: Oracle not available, skipping setQuestion');
                return;
            }
            await this.deps.oracle.setQuestion(questionData, this.deps.assetLoader);
        } catch (error) {
            console.error('❌ GlobalQuestionManager: Failed to set oracle question:', error);
        }
    }

    /**
     * Old implementation for showing question with text and image
     */
    private async showQuestionOldImpl(questionData: ParsedQuestion): Promise<void> {
        logger.log('QUIZ_GLOBAL', '🔵 GlobalQuestionManager: Using old implementation');

        const oracleSprite = this.deps.oracle.getSprite();
        const oracleX = oracleSprite.x;
        const oracleY = oracleSprite.y;

        // Display image if available
        if (questionData.image) {
            try {
                let imageKey = questionData.image.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
                imageKey = imageKey.replace(/^QuizGame_/, '');

                let imagePath = questionData.image.replace(/^QuizGame_/, '');

                await this.deps.assetLoader.loadImage(imageKey, imagePath);

                if (!this.deps.scene.textures.exists(imageKey)) {
                    throw new Error(`Image texture not found: ${imageKey}`);
                }

                const imageY = oracleY - 280;
                const image = this.deps.scene.add.image(oracleX, imageY, imageKey);
                image.setOrigin(0.5);
                image.setDepth(DEPTHS.SCREEN.GLOBAL_QUESTION);

                // Scale if too large
                const maxWidth = 300;
                const maxHeight = 200;
                if (image.width > maxWidth || image.height > maxHeight) {
                    const scaleX = maxWidth / image.width;
                    const scaleY = maxHeight / image.height;
                    const scale = Math.min(scaleX, scaleY);
                    image.setScale(scale);
                }

                this.deps.setGlobalQuestionImage(image);
                logger.log('QUIZ_GLOBAL', '✅ GlobalQuestionManager: Image created');
            } catch (error) {
                console.error('❌ GlobalQuestionManager: Failed to load image:', error);
            }
        }

        logger.log('QUIZ_GLOBAL', '✅ GlobalQuestionManager: Old implementation complete');
    }
}
