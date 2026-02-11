import React from 'react';
import { QuizData } from '../../types/gameTypes';

interface QuizModalProps {
    quiz: QuizData;
    onAnswer: (correct: boolean) => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, onAnswer }) => {
    const isPortal = quiz.context === 'portal';

    // Theme configuration
    const theme = isPortal ? {
        borderColor: 'border-cyan-500',
        titleColor: 'text-cyan-400',
        titleText: 'PORTAL CONNECTION',
        buttonBg: 'bg-gray-700',
        buttonHover: 'hover:bg-cyan-600',
        buttonBorder: 'hover:border-cyan-400',
        helperText: 'Choose wisely. The wrong path leads to doom.'
    } : {
        borderColor: 'border-green-500',
        titleColor: 'text-green-400',
        titleText: 'KEY GUARDIAN QUIZ',
        buttonBg: 'bg-gray-700',
        buttonHover: 'hover:bg-green-600',
        buttonBorder: 'hover:border-green-400',
        helperText: 'Correct answer grants a Key. Incorrect drains Health.'
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'auto'
            }}
        >
            <div
                className={`bg-gray-800 border-4 ${theme.borderColor} p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all scale-100`}
                style={{ pointerEvents: 'auto' }}
            >
                <h2 className={`${theme.titleColor} text-lg font-bold uppercase tracking-widest mb-2 text-center`}>
                    {theme.titleText}
                </h2>

                <div className="text-white text-2xl font-semibold text-center mb-8 py-4 bg-gray-900 rounded-lg border border-gray-700">
                    {quiz.question}
                </div>

                <div className="grid gap-4">
                    {quiz.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Quiz button clicked:', index, 'Correct:', index === quiz.correctIndex);
                                onAnswer(index === quiz.correctIndex);
                            }}
                            style={{
                                width: '100%',
                                padding: '1rem 1.5rem',
                                backgroundColor: '#374151',
                                color: 'white',
                                fontSize: '1.125rem',
                                fontWeight: '500',
                                borderRadius: '0.5rem',
                                border: '1px solid #4B5563',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isPortal ? '#0891b2' : '#16a34a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#374151';
                            }}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <p className="text-gray-400 text-xs text-center mt-6">
                    {theme.helperText}
                </p>
            </div>
        </div>
    );
};

export default QuizModal;

