import { PlayerController } from "../entities/PlayerController.js";

const FIELD_WIDTH = 672;
const FIELD_HEIGHT = 880;

const PLAY_AREA_RATIO = {
  left: 0.121,
  right: 0.879,
  top: 0.108,
  bottom: 0.892,
};

const PLAYER_SCALE = 2.6;
const BALL_SCALE = 2.4;
const BALL_STOP_SPEED = 18;
const BALL_FREE_FRICTION = 0.988;
const BALL_BOUNCE = 0.62;
const BALL_SOURCE_FRAMES = [
  { x: 1, y: 1, width: 4, height: 4 },
  { x: 7, y: 1, width: 4, height: 4 },
  { x: 13, y: 1, width: 4, height: 4 },
  { x: 19, y: 1, width: 4, height: 4 },
];
const BALL_DIRECTION_ANGLE = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
};

const DIRECTION_ANIMS = {
  s: { key: "team1-down-fixed", frames: [0, 1, 2, 1], flipX: false },
  se: { frames: [23, 24, 25, 24], flipX: false },
  e: { frames: [6, 7, 8, 7], flipX: false },
  ne: { frames: [29, 30, 31, 30], flipX: false },
  n: { key: "team1-up-fixed", frames: [0, 1, 2, 1], flipX: false },
  nw: { frames: [26, 27, 28, 27], flipX: false },
  w: { frames: [9, 10, 11, 10], flipX: false },
  sw: { frames: [20, 21, 22, 21], flipX: false },
};

const TEAM2_DIRECTION_ANIMS = {
  s: { key: "team2-down-fixed", frames: [0, 1, 2, 1], flipX: false },
  se: { frames: [23, 24, 25, 24], flipX: false },
  e: { frames: [6, 7, 8, 7], flipX: false },
  ne: { frames: [29, 30, 31, 30], flipX: false },
  n: { key: "team2-up-fixed", frames: [0, 1, 2, 1], flipX: false },
  nw: { frames: [26, 27, 28, 27], flipX: false },
  w: { frames: [9, 10, 11, 10], flipX: false },
  sw: { frames: [20, 21, 22, 21], flipX: false },
};

const ALIGNED_DIRECTION_TEXTURES = [
  { key: "team1-up-fixed", sourceFrames: [0, 1, 2], sourceTextureKey: "team1" },
  { key: "team1-down-fixed", sourceFrames: [3, 4, 5], sourceTextureKey: "team1" },
  { key: "team2-up-fixed", sourceFrames: [0, 1, 2], sourceTextureKey: "team2" },
  { key: "team2-down-fixed", sourceFrames: [3, 4, 5], sourceTextureKey: "team2" },
];

function createAlignedDirectionTexture(scene, textureKey, sourceFrames, sourceTextureKey) {
  if (scene.textures.exists(textureKey)) {
    scene.textures.remove(textureKey);
  }

  const sourceTexture = scene.textures.get(sourceTextureKey);
  const sourceImage = sourceTexture.getSourceImage();
  const sampleCanvas = scene.textures.createCanvas(`${textureKey}-sample`, 16, 16);
  const sampleContext = sampleCanvas.context;
  const outputTexture = scene.textures.createCanvas(textureKey, 16 * sourceFrames.length, 16);
  const outputContext = outputTexture.context;

  sourceFrames.forEach((frameNumber, index) => {
    const frame = sourceTexture.get(frameNumber);
    sampleContext.clearRect(0, 0, 16, 16);
    sampleContext.drawImage(
      sourceImage,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      16,
      16
    );

    const { data } = sampleContext.getImageData(0, 0, 16, 16);
    let minX = 16;
    let maxX = -1;

    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const alpha = data[(y * 16 + x) * 4 + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }

    const contentWidth = maxX >= minX ? maxX - minX + 1 : 16;
    const drawX = index * 16 + Math.round((16 - contentWidth) / 2) - minX;

    outputContext.drawImage(
      sourceImage,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      drawX,
      0,
      16,
      16
    );
  });

  sampleCanvas.destroy();
  outputTexture.refresh();
  outputTexture.add("__BASE", 0, 0, 0, 16 * sourceFrames.length, 16);

  sourceFrames.forEach((_, index) => {
    outputTexture.add(index, 0, index * 16, 0, 16, 16);
  });
}

function createBallTexture(scene) {
  if (scene.textures.exists("ball")) {
    scene.textures.remove("ball");
  }

  const sourceImage = scene.textures.get("ball-strip").getSourceImage();
  const frameWidth = BALL_SOURCE_FRAMES[0].width;
  const frameHeight = BALL_SOURCE_FRAMES[0].height;
  const texture = scene.textures.createCanvas(
    "ball",
    frameWidth * BALL_SOURCE_FRAMES.length,
    frameHeight
  );

  BALL_SOURCE_FRAMES.forEach((frame, index) => {
    texture.context.drawImage(
      sourceImage,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      index * frameWidth,
      0,
      frameWidth,
      frameHeight
    );
  });

  texture.refresh();
  texture.add("__BASE", 0, 0, 0, frameWidth * BALL_SOURCE_FRAMES.length, frameHeight);
  BALL_SOURCE_FRAMES.forEach((_, index) => {
    texture.add(index, 0, index * frameWidth, 0, frameWidth, frameHeight);
  });
}

function ensureAnimations(scene) {
  ALIGNED_DIRECTION_TEXTURES.forEach(({ key, sourceFrames, sourceTextureKey }) => {
    createAlignedDirectionTexture(scene, key, sourceFrames, sourceTextureKey);
  });
  createBallTexture(scene);

  if (!scene.anims.exists("ball-roll")) {
    scene.anims.create({
      key: "ball-roll",
      frames: scene.anims.generateFrameNumbers("ball", { start: 0, end: 3 }),
      frameRate: 14,
      repeat: -1,
    });
  }

  for (const [direction, config] of Object.entries(DIRECTION_ANIMS)) {
    const key = `team1-${direction}`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: config.frames.map((frame) => ({
        key: config.key ?? "team1",
        frame,
      })),
      frameRate: 10,
      repeat: -1,
    });
  }

  for (const [direction, config] of Object.entries(TEAM2_DIRECTION_ANIMS)) {
    const key = `team2-${direction}`;
    if (scene.anims.exists(key)) continue;

    scene.anims.create({
      key,
      frames: config.frames.map((frame) => ({
        key: config.key ?? "team2",
        frame,
      })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

function directionVectorToKey(vector) {
  const x = vector.x;
  const y = vector.y;
  const magnitude = Math.hypot(x, y);

  if (magnitude < 0.0001) {
    return "s";
  }

  const nx = x / magnitude;
  const ny = y / magnitude;
  const threshold = 0.35;

  if (Math.abs(nx) < threshold && Math.abs(ny) < threshold) {
    return "s";
  }

  if (Math.abs(ny) > Math.abs(nx) * 1.6) {
    return ny < 0 ? "n" : "s";
  }

  if (Math.abs(nx) > Math.abs(ny) * 1.6) {
    return nx < 0 ? "w" : "e";
  }

  if (nx > 0 && ny < 0) return "ne";
  if (nx > 0 && ny > 0) return "se";
  if (nx < 0 && ny < 0) return "nw";
  return "sw";
}

function syncPlayerAnimation(player, direction) {
  const isMoving = player.body.velocity.lengthSq() > 180;
  const { flipX, frames } = DIRECTION_ANIMS[direction];

  player.setFlipX(flipX);

  if (!isMoving) {
    player.stop();
    player.setTexture(DIRECTION_ANIMS[direction].key ?? "team1", frames[0]);
    return;
  }

  player.play(`team1-${direction}`, true);
}

function syncTeam2Animation(player, direction) {
  const { flipX, frames } = TEAM2_DIRECTION_ANIMS[direction];

  player.setFlipX(flipX);
  player.stop();
  player.setTexture(TEAM2_DIRECTION_ANIMS[direction].key ?? "team2", frames[0]);
}

function syncLayering(player, ball, direction) {
  const playerAboveBall = direction === "n" || direction === "ne" || direction === "nw";

  if (playerAboveBall) {
    player.setDepth(5);
    ball.setDepth(4);
    return;
  }

  ball.setDepth(5);
  player.setDepth(4);
}

function syncBallMotion(ball, hasBall) {
  const direction = hasBall
    ? ball.scene.activeController.getFacingDirectionKey()
    : directionVectorToKey(ball.body.velocity);

  ball.setAngle(BALL_DIRECTION_ANGLE[direction] ?? 0);

  if (hasBall) {
    const playerSpeed = ball.scene.activeController.player.body.velocity.length();

    ball.body.setVelocity(0, 0);

    if (playerSpeed < BALL_STOP_SPEED) {
      ball.anims.stop();
      ball.setFrame(0);
      return;
    }

    if (!ball.anims.isPlaying) {
      ball.play("ball-roll");
    }

    ball.anims.msPerFrame = Phaser.Math.Clamp(150 - playerSpeed * 0.18, 50, 150);
    return;
  }

  ball.body.velocity.scale(BALL_FREE_FRICTION);
  const speed = ball.body.velocity.length();

  if (speed < BALL_STOP_SPEED) {
    ball.body.setVelocity(0, 0);
    ball.anims.stop();
    ball.setFrame(0);
    return;
  }

  if (!ball.anims.isPlaying) {
    ball.play("ball-roll");
  }

  ball.anims.msPerFrame = Phaser.Math.Clamp(140 - speed * 0.08, 45, 140);
}

export class MatchScene extends Phaser.Scene {
  constructor() {
    super("match");
    this.possessionClaim = null;
  }

  create() {
    this.directionVectorToKey = directionVectorToKey;
    ensureAnimations(this);
    this.buildWorld();

    this.scale.on("resize", () => {
      this.scene.restart();
    });
  }

  requestPossession(controller, distanceToBall) {
    if (controller.isControllingBall()) {
      return;
    }

    if (!this.possessionClaim || distanceToBall < this.possessionClaim.distance) {
      this.possessionClaim = { controller, distance: distanceToBall };
    }
  }

  resolvePossessionClaims() {
    if (!this.possessionClaim) {
      return;
    }

    const { controller } = this.possessionClaim;
    if (this.activeController && this.activeController !== controller) {
      this.activeController.forceReleaseBall();
    }
    controller.hasBall = true;
    this.activeController = controller;
    this.possessionClaim = null;
  }

  buildWorld() {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const worldWidth = viewportWidth;
    const worldHeight = Math.round(worldWidth * (FIELD_HEIGHT / FIELD_WIDTH));

    const playArea = {
      left: worldWidth * PLAY_AREA_RATIO.left,
      right: worldWidth * PLAY_AREA_RATIO.right,
      top: worldHeight * PLAY_AREA_RATIO.top,
      bottom: worldHeight * PLAY_AREA_RATIO.bottom,
    };

    this.cameras.main.setBackgroundColor("#0d1f14");
    this.physics.world.setBounds(
      playArea.left,
      playArea.top,
      playArea.right - playArea.left,
      playArea.bottom - playArea.top
    );
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setSize(viewportWidth, viewportHeight);

    this.add.image(0, 0, "field").setOrigin(0).setDisplaySize(worldWidth, worldHeight);

    this.team1Controls = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      action: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.team2Controls = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      action: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    const playerX = worldWidth / 2;
    const playerY = worldHeight * 0.58;

    this.player = this.physics.add
      .sprite(playerX, playerY, "team1", DIRECTION_ANIMS.s.frames[0])
      .setScale(PLAYER_SCALE)
      .setDepth(3);
    this.player.body.setSize(6, 5);
    this.player.body.setOffset(6, 10);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setDrag(900, 900);

    this.ball = this.physics.add
      .sprite(playerX + 32, playerY - 8, "ball", 0)
      .setScale(3)
      .setDepth(4);
    this.ball.body.setCircle(2, 0, 0);
    this.ball.body.setBounce(BALL_BOUNCE);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setDamping(false);
    this.ball.body.setDrag(0, 0);
    this.ball.body.setMaxVelocity(1200, 1200);

    this.opponent = this.add
      .sprite(worldWidth / 2 + 120, worldHeight * 0.35, "team2", 0)
      .setScale(PLAYER_SCALE)
      .setDepth(3);
    this.physics.add.existing(this.opponent);
    this.opponent.body.setSize(6, 5);
    this.opponent.body.setOffset(6, 10);
    this.opponent.body.setCollideWorldBounds(true);
    this.opponent.body.setDrag(900, 900);

    this.activeController = null;
    this.team1Controller = new PlayerController(this, this.player, this.ball, this.team1Controls);
    this.team2Controller = new PlayerController(this, this.opponent, this.ball, this.team2Controls);
    this.playerBallCollider = this.physics.add.collider(this.player, this.ball);
    this.opponentBallCollider = this.physics.add.collider(this.opponent, this.ball);
    const facing = this.team1Controller.getFacingDirectionKey();
    syncPlayerAnimation(this.player, facing);
    syncTeam2Animation(this.opponent, "n");
    syncLayering(this.player, this.ball, facing);

    this.cameras.main.startFollow(this.ball, false, 0.14, 0.14, 0, 0);
  }

  update() {
    this.possessionClaim = null;
    this.team1Controller.update();
    this.team2Controller.update();
    this.resolvePossessionClaims();
    this.playerBallCollider.active = !this.team1Controller.isControllingBall();
    this.opponentBallCollider.active = !this.team2Controller.isControllingBall();
    const facing = this.team1Controller.getFacingDirectionKey();
    const team2Facing = this.team2Controller.getFacingDirectionKey();
    syncPlayerAnimation(this.player, facing);
    syncTeam2Animation(this.opponent, team2Facing);
    const activePlayer = this.activeController?.player ?? this.player;
    const activeDirection = this.activeController?.getFacingDirectionKey() ?? facing;
    syncLayering(activePlayer, this.ball, activeDirection);
    syncBallMotion(this.ball, Boolean(this.activeController));
  }
}
