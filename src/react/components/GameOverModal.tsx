import React from 'react';
import { ASSETS_BASE_PATH } from '../../config/gameConfig';

interface GameOverModalProps {
    result: 'win' | 'lose';
    onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ result, onRestart }) => {
    const isWin = result === 'win';
    // Путь к изображению персонажа в состоянии смерти
    const gameOverImagePath = `${ASSETS_BASE_PATH}/images/Character.GameOver_16x16.png`;

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
            <div className={`p-10 rounded-3xl shadow-2xl text-center max-w-2xl w-full border-4 ${isWin ? 'bg-indigo-900 border-blue-400' : 'bg-red-900 border-red-500'}`}>
                
                <h1 className={`text-6xl font-black mb-4 ${isWin ? 'text-blue-300' : 'text-red-300'}`}>
                    {isWin ? 'VICTORY!' : 'GAME OVER'}
                </h1>
                
                {/* Показываем персонажа в состоянии смерти при проигрыше */}
                {!isWin && (
                    <div className="flex justify-center mb-6">
                        <img 
                            src={gameOverImagePath} 
                            alt="Character Game Over" 
                            className="w-16 h-16 pixelated"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    </div>
                )}
                
                <p className="text-white text-xl mb-10">
                    {isWin 
                        ? "You successfully solved the riddle of the ancients and escaped!" 
                        : "Your spirit has faded away..."}
                </p>

                <button
                    onClick={onRestart}
                    className={`px-8 py-4 rounded-full text-xl font-bold text-white transition-all transform hover:scale-105 shadow-xl ${
                        isWin 
                        ? 'bg-blue-500 hover:bg-blue-400' 
                        : 'bg-red-600 hover:bg-red-500'
                    }`}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
};

export default GameOverModal;



