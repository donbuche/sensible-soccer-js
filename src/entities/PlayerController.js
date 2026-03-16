const PLAYER_SPEED = 190;
const PLAYER_SPEED_WITH_BALL = 170;
const BALL_CONTROL_RADIUS = 30;
const BALL_CARRY_OFFSETS = {
  n: { x: 6, y: -6 },
  ne: { x: 5, y: -5 },
  e: { x: 12, y: 8 },
  se: { x: 8, y: 18 },
  s: { x: 0, y: 20 },
  sw: { x: -25, y: 20 },
  w: { x: -33, y: 8 },
  nw: { x: -26, y: -6 },
};
const PASS_POWER = 360;
const SHOOT_POWER_MIN = 1283;
const SHOOT_POWER_MAX = 1721;
const SHOOT_HOLD_THRESHOLD = 180;
const SHOOT_HOLD_MAX = 650;
const RECONTROL_COOLDOWN = 220;
const BALL_OWNER_PROTECTION = 160;
const STEAL_EXTRA_REACH = -7;

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
    this.hasBallSince = 0;
  }

  update() {
    const direction = this.getInputDirection();

    if (direction.lengthSq() > 0) {
      this.lastMoveDirection.copy(direction);
      this.lastDirectionKey = this.scene.directionVectorToKey(direction);
    }

    const speed = this.hasBall ? PLAYER_SPEED_WITH_BALL : PLAYER_SPEED;
    this.player.body.setVelocity(direction.x * speed, direction.y * speed);

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
    this.hasBallSince = 0;
    this.lastKickAt = this.scene.time.now;
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
      const activeController = this.scene.activeController;
      const activeProtected =
        activeController &&
        activeController !== this &&
        now - activeController.hasBallSince < BALL_OWNER_PROTECTION;
      const controlRadius =
        BALL_CONTROL_RADIUS + (activeController && activeController !== this ? STEAL_EXTRA_REACH : 0);

      if (!activeProtected && toBall.length() <= controlRadius && ballSpeed <= playerSpeed + 120) {
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
    this.hasBallSince = 0;
    this.lastKickAt = this.scene.time.now;
    const carryOffset = BALL_CARRY_OFFSETS[this.lastDirectionKey];
    this.ball.setPosition(
      this.player.x + carryOffset.x + direction.x * 8,
      this.player.y + carryOffset.y + direction.y * 8
    );
    this.ball.body.setVelocity(direction.x * power, direction.y * power);
  }
}
