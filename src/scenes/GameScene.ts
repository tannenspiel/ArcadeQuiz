export class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Временные ассеты для тестирования
        this.load.setBaseURL('https://labs.phaser.io');
        this.load.image('sky', 'assets/skies/space3.png');
        this.load.image('logo', 'assets/sprites/phaser3-logo.png');
    }

    create() {
        this.add.image(400, 300, 'sky');
        
        const logo = this.add.image(400, 150, 'logo');
        logo.setScale(0.5);

        this.add.text(400, 400, 'ArcadeQuiz Project Ready!', {
            fontSize: '32px',
            color: '#fff'
        }).setOrigin(0.5);

        // Тест интерактивности
        this.input.on('pointerdown', () => {
            this.cameras.main.shake(300, 0.01);
        });
    }

    update() {
        // Игровой цикл
    }
}