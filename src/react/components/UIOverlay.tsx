import React from 'react';

interface UIOverlayProps {
    health: number;
    keys: number;
    isOracleActive: boolean;
    globalQuestion: string;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ health, keys, isOracleActive, globalQuestion }) => {
    return (
        <div className="w-full h-full p-4 pointer-events-none select-none">
            <div className="flex flex-col justify-between h-full">
            
            {/* Top Stats Bar */}
            <div className="flex justify-between items-start">
                {/* Health */}
                <div className="bg-gray-800 bg-opacity-80 p-3 rounded-lg border border-gray-600 shadow-lg">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Health</div>
                    <div className="flex space-x-2">
                        {[...Array(3)].map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-8 h-8 rounded-md transition-all duration-300 ${
                                    i < health ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.7)]' : 'bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Global Quest Display */}
                {isOracleActive && (
                    <div className="bg-indigo-900 bg-opacity-90 p-4 rounded-xl border-2 border-indigo-400 shadow-2xl max-w-md text-center animate-pulse">
                        <div className="text-indigo-300 text-xs uppercase font-bold mb-1">Ancient Oracle Active</div>
                        <h2 className="text-xl font-bold text-white">{globalQuestion}</h2>
                        <p className="text-xs text-indigo-200 mt-2">Find the matching portal! (Cost: 3 Keys to open)</p>
                    </div>
                )}

                {/* Keys */}
                <div className="bg-gray-800 bg-opacity-80 p-3 rounded-lg border border-gray-600 shadow-lg">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Keys</div>
                    <div className="flex items-center space-x-3">
                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-green-500 filter drop-shadow-[0_0_5px_rgba(72,187,120,0.8)]"></div>
                        <span className="text-3xl font-mono font-bold text-green-400">{keys}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Hints */}
            <div className="text-center mb-4">
                {!isOracleActive && (
                    <div className="inline-block bg-black bg-opacity-60 text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold">
                        Collect 3 Keys and find the Oracle!
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default UIOverlay;



