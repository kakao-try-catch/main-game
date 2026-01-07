// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class AppleMain extends Phaser.Scene {
    constructor() {
        super('AppleMain');
    }

    init() {
        // Initialize scene
    }

    preload ()
    {
        this.load.image('ref', 'assets/apple/reference.png');
        //this.load.image('background', 'assets/apple/background.png');
        //this.load.spritesheet('dude', 
        //    'assets/dude.png',
        //    { frameWidth: 32, frameHeight: 48 }
        //);
    }
    create() {
        // Create game objects
        this.add.image(0, 0, 'ref').setOrigin(0,0);
        //this.add.image(0, 0, 'background').setOrigin(0,0);
    }

}
