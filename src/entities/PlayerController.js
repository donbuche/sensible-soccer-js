const PLAYER_SPEED = 180;
const BALL_CONTROL_RADIUS = 30;
const BALL_CARRY_OFFSETS = {
  n: { x: 6, y: -16 },
  ne: { x: 5, y: -5 },
  e: { x: 12, y: 8 },
  se: { x: 8, y: 18 },
  s: { x: 0, y: 20 },
  sw: { x: -25, y: 20 },
  w: { x: -33, y: 8 },
  nw: { x: -26, y: -6 },
};
const PASS_POWER = 360;
const SHOOT_POWER_MIN = 640;
const SHOOT_POWER_MAX = 860;
const SHOOT_HOLD_THRESHOLD = 180;
const SHOOT_HOLD_MAX = 650;
const RECONTROL_COOLDOWN = 220;

export class PlayerController {
  constructor(scene, player, ball, controls) {
    this.scene = scene;
    this.player = player;
    this.ball = ball;
    this.controls = controls;

    this.lastKickAt = 0;
    this.lastMoveDirection = new Phaser.Math.Vector2(0, 1);
    this.lastDirectionKey = "s";
    this.actionPressedAt = null;
    this.hasBall = false;
  }

  update() {
    const direction = this.getInputDirection();

    if (direction.lengthSq() > 0) {
      this.lastMoveDirection.copy(direction);
      this.lastDirectionKey = this.scene.directionVectorToKey(direction);
    }

    this.player.body.setVelocity(
      direction.x * PLAYER_SPEED,
      direction.y * PLAYER_SPEED
    );

    this.updateBallPossession();
    this.updateKickInput();
  }

  getFacingDirectionKey() {
    return this.lastDirectionKey;
  }

  isControllingBall() {
    return this.hasBall;
  }

  forceReleaseBall() {
    this.hasBall = false;
  }

  getInputDirection() {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.controls.left.isDown) direction.x -= 1;
    if (this.controls.right.isDown) direction.x += 1;
    if (this.controls.up.isDown) direction.y -= 1;
    if (this.controls.down.isDown) direction.y += 1;

    return direction.normalize();
  }

  updateBallPossession() {
    const now = this.scene.time.now;
    const toBall = new Phaser.Math.Vector2(
      this.ball.x - this.player.x,
      this.ball.y - this.player.y
    );

    if (!this.hasBall && now - this.lastKickAt >= RECONTROL_COOLDOWN) {
      const playerSpeed = this.player.body.velocity.length();
      const ballSpeed = this.ball.body.velocity.length();

      if (toBall.length() <= BALL_CONTROL_RADIUS && ballSpeed <= playerSpeed + 120) {
        this.scene.requestPossession(this, toBall.length());
      }
    }

    if (!this.hasBall) return;

    const carryOffset = BALL_CARRY_OFFSETS[this.lastDirectionKey];

    this.ball.body.setVelocity(0, 0);
    this.ball.setPosition(
      this.player.x + carryOffset.x,
      this.player.y + carryOffset.y
    );
  }

  updateKickInput() {
    const now = this.scene.time.now;

    if (Phaser.Input.Keyboard.JustDown(this.controls.action)) {
      this.actionPressedAt = now;
    }

    if (!Phaser.Input.Keyboard.JustUp(this.controls.action)) {
      return;
    }

    if (this.actionPressedAt === null || !this.hasBall) {
      this.actionPressedAt = null;
      return;
    }

    const holdDuration = now - this.actionPressedAt;
    if (holdDuration >= SHOOT_HOLD_THRESHOLD) {
      this.shoot(holdDuration);
    } else {
      this.pass();
    }

    this.actionPressedAt = null;
  }

  pass() {
    this.releaseBall(PASS_POWER);
  }

  shoot(holdDuration) {
    const charge = Phaser.Math.Clamp(
      (holdDuration - SHOOT_HOLD_THRESHOLD) / (SHOOT_HOLD_MAX - SHOOT_HOLD_THRESHOLD),
      0,
      1
    );
    const power = Phaser.Math.Linear(SHOOT_POWER_MIN, SHOOT_POWER_MAX, charge);
    this.releaseBall(power);
  }

  releaseBall(power) {
    const direction = this.lastMoveDirection.clone().normalize();
    if (direction.lengthSq() === 0) {
      direction.set(0, 1);
    }

    this.hasBall = false;
    if (this.scene.activeController === this) {
      this.scene.activeController = null;
    }
    this.lastKickAt = this.scene.time.now;
    const carryOffset = BALL_CARRY_OFFSETS[this.lastDirectionKey];
    this.ball.setPosition(
      this.player.x + carryOffset.x + direction.x * 8,
      this.player.y + carryOffset.y + direction.y * 8
    );
    this.ball.body.setVelocity(direction.x * power, direction.y * power);
  }
}
