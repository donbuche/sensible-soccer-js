export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.image("field", "assets/sprites/pitch/field.png");
    this.load.spritesheet("ball", "assets/sprites/ball/ball.png", {
      frameWidth: 6,
      frameHeight: 6,
    });
    this.load.spritesheet("team1", "assets/sprites/players/team1.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet("team2", "assets/sprites/players/team2.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet("goalkeeper", "assets/sprites/players/goalkeeper.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    this.scene.start("match");
  }
}
