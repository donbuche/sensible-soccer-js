export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.image("field", "assets/sprites/pitch/field_upscaled.png");
    this.load.image("ball-strip", "assets/sprites/ball/ball.png");
    this.load.image("bottom-goal-back", "assets/sprites/goals/bottom_goal_back.png");
    this.load.image("bottom-goal-front", "assets/sprites/goals/bottom_goal_front.png");
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
