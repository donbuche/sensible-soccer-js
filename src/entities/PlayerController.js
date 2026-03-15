const PLAYER_SPEED = 180;
const BALL_CONTROL_RADIUS = 30;
const BALL_CARRY_OFFSETS = {
  n: { x: 0, y: -18 },
  ne: { x: 14, y: -14 },
  e: { x: 16, y: 2 },
  se: { x: 14, y: 16 },
  s: { x: 0, y: 20 },
  sw: { x: -14, y: 16 },
  w: { x: -16, y: 2 },
  nw: { x: -14, y: -14 },
};
const PASS_POWER = 360;
const SHOOT_POWER_MIN = 640;
const SHOOT_POWER_MAX = 860;
const SHOOT_HOLD_THRESHOLD = 180;
const SHOOT_HOLD_MAX = 650;
const RECONTROL_COOLDOWN = 220;

export class PlayerController {
  constructor(scene, player, ball) {
    this.scene = scene;
    this.player = player;
    this.ball = ball;

    this.lastKickAt = 0;
    this.lastMoveDirection = new Phaser.Math.Vector2(0, 1);
    this.lastDirectionKey = "s";
    this.spacePressedAt = null;
    this.hasBall = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shoot: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
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

  getFacingDirection() {
    return this.lastMoveDirection.clone();
  }

  getFacingDirectionKey() {
    return this.lastDirectionKey;
  }

  isControllingBall() {
    return this.hasBall;
  }

  getInputDirection() {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.wasd.left.isDown) direction.x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) direction.x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) direction.y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) direction.y += 1;

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
        this.hasBall = true;
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
    const shootKey = this.cursors.space ?? this.wasd.shoot;
    const now = this.scene.time.now;

    if (Phaser.Input.Keyboard.JustDown(shootKey)) {
      this.spacePressedAt = now;
    }

    if (!Phaser.Input.Keyboard.JustUp(shootKey)) {
      return;
    }

    if (this.spacePressedAt === null || !this.hasBall) {
      this.spacePressedAt = null;
      return;
    }

    const holdDuration = now - this.spacePressedAt;
    if (holdDuration >= SHOOT_HOLD_THRESHOLD) {
      this.shoot(holdDuration);
    } else {
      this.pass();
    }

    this.spacePressedAt = null;
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
    this.lastKickAt = this.scene.time.now;
    const carryOffset = BALL_CARRY_OFFSETS[this.lastDirectionKey];
    this.ball.setPosition(
      this.player.x + carryOffset.x + direction.x * 8,
      this.player.y + carryOffset.y + direction.y * 8
    );
    this.ball.body.setVelocity(direction.x * power, direction.y * power);
  }
}
