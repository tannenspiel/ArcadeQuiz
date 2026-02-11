/**
 * Unit tests for CoinBubbleQuiz
 */

import { CoinBubbleQuiz, CoinBubbleQuizConfig } from '../../../game/ui/CoinBubbleQuiz';

// ✅ Shared time tracker for mocking Phaser time progression
let mockTimeNow = 1000;

// Helper function to create mock scene with all required methods
const createMockScene = () => ({
    add: {
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setText: jest.fn(),
            setScale: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis(),
        })),
        image: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setScale: jest.fn().mockReturnThis(),
            play: jest.fn(),
            add: jest.fn().mockReturnThis(),
        })),
        sprite: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setScale: jest.fn().mockReturnThis(),
            play: jest.fn(),
            add: jest.fn().mockReturnThis(),
        })),
        container: jest.fn(() => {
            const list: any[] = [];
            return {
                setDepth: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                add: jest.fn().mockImplementation((obj: any) => {
                    list.push(obj);
                    return this;
                }),
                list: list,
                destroy: jest.fn(),
            };
        }),
    },
    scale: {
        canvas: {
            width: 800,
            height: 600
        }
    },
    cameras: {
        main: {
            zoom: 1,
            width: 1280,
            height: 720
        }
    },
    data: {
        get: jest.fn((key: string) => {
            if (key === 'currentLevel') return 1;
            return undefined;
        })
    },
    time: {
        get now() { return mockTimeNow; },
        delayedCall: jest.fn((delay: number, callback: Function) => {
            // ✅ Advance time when delayedCall is invoked
            mockTimeNow += delay;
            if (callback && typeof callback === 'function') callback();
            return { destroy: jest.fn() };
        })
    },
    assetLoader: {
        loadJSON: jest.fn().mockResolvedValue({
            true: [{ text: '2+2=4' }],
            false: [{ text: '2+2=5' }]
        })
    },
    levelManager: {
        getCurrentLevel: jest.fn().mockReturnValue(1)
    },
    quizManager: {
        getUniqueCoinStatements: jest.fn().mockResolvedValue({
            true: '2 + 2 = 4',
            false: '2 + 2 = 5'
        })
    },
    gameState: {
        getAnsweredCoinStatements: jest.fn().mockReturnValue(new Set()),
        getUsedTrueStatements: jest.fn().mockReturnValue([]),
        getUsedFalseStatements: jest.fn().mockReturnValue([]),
        addUsedTrueStatement: jest.fn(),
        addUsedFalseStatement: jest.fn()
    }
});

// Mock NineSliceBackground
jest.mock('../../../game/ui/NineSliceBackground', () => {
    const mockListeners = new Map<string, Function>();
    return {
        NineSliceBackground: jest.fn().mockImplementation(() => {
            const callbacks: any = {};
            return {
                setScrollFactor: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setupInteractive: jest.fn(),
                add: jest.fn().mockReturnThis(),
                on: jest.fn().mockImplementation((event: string, callback: Function) => {
                    callbacks[event] = callback;
                }),
                setTint: jest.fn(),
                clearTint: jest.fn(),
                // Store event callbacks for testing via access to private callbacks
                _callbacks: callbacks,
                emit: function(event: string, ...args: any[]) {
                    const cb = this._callbacks[event];
                    if (cb) cb(...args);
                }
            };
        })
    };
});

// Mock FontSizeCalculator
jest.mock('../../../game/utils/FontSizeCalculator', () => ({
    calculateUnifiedBaseFontSize: jest.fn().mockReturnValue(16),
    calculateButtonFontSize: jest.fn().mockReturnValue(16),
    calculateBaseFontSize: jest.fn().mockReturnValue(16),
    getButtonPadding: jest.fn().mockReturnValue({
        paddingX: 16,
        paddingY: 12,
        availableWidth: 100,
        availableHeight: 40
    }),
    getFontSizeMultiplier: jest.fn().mockReturnValue(1)
}));

describe('CoinBubbleQuiz', () => {
    let mockScene: any;
    let mockConfig: CoinBubbleQuizConfig;
    let mockOnCorrect: jest.Mock;
    let mockOnWrong: jest.Mock;
    let mockCoinSprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockOnCorrect = jest.fn();
        mockOnWrong = jest.fn();
        mockCoinSprite = { x: 100, y: 100 };

        mockScene = createMockScene();

        mockConfig = {
            coinSprite: mockCoinSprite,
            onCorrect: mockOnCorrect,
            onWrong: mockOnWrong
        };

        // Mock global fetch
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    true: [{ text: '2+2=4' }],
                    false: [{ text: '2+2=5' }]
                })
            })
        ) as jest.Mock;
    });

    afterEach(() => {
        // Ensure static instance is cleared
        if (CoinBubbleQuiz['activeQuiz']) {
            CoinBubbleQuiz['activeQuiz'].destroy();
        }
    });

    it('should create CoinBubbleQuiz instance', () => {
        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        expect(quiz).toBeDefined();
    });

    it('should prevent multiple concurrent instances', () => {
        const quiz1 = new CoinBubbleQuiz(mockScene, mockConfig);
        const spyDestroy = jest.spyOn(quiz1, 'destroy');

        // Creating second instance should disable first one
        const quiz2 = new CoinBubbleQuiz(mockScene, mockConfig);

        expect(spyDestroy).toHaveBeenCalled();
        expect(CoinBubbleQuiz['activeQuiz']).toBe(quiz2);
    });

    it('should load statements via QuizManager.getUniqueCoinStatements', async () => {
        new CoinBubbleQuiz(mockScene, mockConfig);

        // Wait for async operations (delayedCall callback calls loadStatements)
        await new Promise(process.nextTick);

        // QuizManager should have been called with level 1
        expect(mockScene.quizManager.getUniqueCoinStatements).toHaveBeenCalledWith(
            1, // currentLevel
            expect.any(Array), // usedTrueStatements
            expect.any(Array)  // usedFalseStatements
        );
    });

    it('should create UI elements after loading', async () => {
        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        await new Promise(process.nextTick);

        // Check that containers were added
        expect(mockScene.add.container).toHaveBeenCalled();
        expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('should handle correct click logic', async () => {
        // Force deterministic random: < 0.5 -> correctIndex = 0 (Bubble 1)
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        await new Promise(process.nextTick);

        // Use public testing method to simulate click
        quiz.simulateBubbleClick(0);

        expect(mockOnCorrect).toHaveBeenCalled();
        expect(mockOnWrong).not.toHaveBeenCalled();

        randomSpy.mockRestore();
    });

    it('should handle wrong click logic', async () => {
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.5 -> correctIndex = 0

        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        await new Promise(process.nextTick);

        // Use public testing method to simulate click
        quiz.simulateBubbleClick(1);

        expect(mockOnWrong).toHaveBeenCalled();
        expect(mockOnCorrect).not.toHaveBeenCalled();

        randomSpy.mockRestore();
    });

    it('should destroy UI after answer with delay', async () => {
        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        await new Promise(process.nextTick);

        // Reset call count for delayedCall to check the destruction delay
        (mockScene.time.delayedCall as jest.Mock).mockClear();

        // Use public testing method to simulate click
        quiz.simulateBubbleClick(0);

        expect(mockScene.time.delayedCall).toHaveBeenCalledWith(200, expect.any(Function));
    });

    it('should prevent multiple answers', async () => {
        // Force deterministic random: < 0.5 -> correctIndex = 0 (Bubble 1)
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const quiz = new CoinBubbleQuiz(mockScene, mockConfig);
        await new Promise(process.nextTick);

        // Click twice using public testing method
        quiz.simulateBubbleClick(0);
        quiz.simulateBubbleClick(0);

        expect(mockOnCorrect).toHaveBeenCalledTimes(1); // Only once
        expect(mockOnWrong).not.toHaveBeenCalled();

        randomSpy.mockRestore();
    });
});
