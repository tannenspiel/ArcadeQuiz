import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center w-full h-full bg-black">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 mb-4 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-cyan-500"></div>
                <div className="text-xl font-bold text-white font-nunito animate-pulse">
                    Загрузка...
                </div>
            </div>
        </div>
    );
};
