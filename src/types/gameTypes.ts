export interface QuizData {
    question: string;
    options: string[];
    correctIndex: number;
    context?: 'key' | 'portal';
}

export interface GameState {
    health: number;
    keys: number;
    oracleActivated: boolean;
}



