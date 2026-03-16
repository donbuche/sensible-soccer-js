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
const GOAL_BALL_BOUNCE = 0.2;
const GOAL_BALL_FRICTION = 0.95;
const GOAL_BALL_STOP_SPEED = 11;
const GOAL_COLLISION_DAMPING = 0.72;
const BOTTOM_GOAL_POSITION = {
  x: 0.5,
  goalLineY: 0.875,
  width: 0.12,
  penaltySpotY: 0.752,
};
const GOAL_WALL_THICKNESS = 6;
const GOAL_BACK_DEPTH = 18;
const DEBUG_GOAL_WALLS = false;
const TEAMMATE_CONTROL_SWITCH_RADIUS = 34;
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

const TEAM1_TEAMMATE_LAYOUT = [
  { x: 0.33, y: 0.77, direction: "n" },
  { x: 0.44, y: 0.8, direction: "n" },
  { x: 0.56, y: 0.8, direction: "n" },
  { x: 0.67, y: 0.77, direction: "n" },
  { x: 0.28, y: 0.65, direction: "n" },
  { x: 0.43, y: 0.66, direction: "n" },
  { x: 0.57, y: 0.66, direction: "n" },
  { x: 0.72, y: 0.65, direction: "n" },
  { x: 0.5, y: 0.54, direction: "n" },
];

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
  const isMoving = player.body.velocity.lengthSq() > 180;
  const { flipX, frames } = TEAM2_DIRECTION_ANIMS[direction];

  player.setFlipX(flipX);

  if (!isMoving) {
    player.stop();
    player.setTexture(TEAM2_DIRECTION_ANIMS[direction].key ?? "team2", frames[0]);
    return;
  }

  player.play(`team2-${direction}`, true);
}

function syncLayering(player, ball, direction) {
  const playerAboveBall = direction === "n" || direction === "ne" || direction === "nw";

  if (playerAboveBall) {
    player.setDepth(7);
    ball.setDepth(4);
    return;
  }

  ball.setDepth(4);
  player.setDepth(7);
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

  if (ball.scene.goalScored) {
    ball.body.velocity.scale(GOAL_BALL_FRICTION);
    const goalSpeed = ball.body.velocity.length();

    if (goalSpeed < GOAL_BALL_STOP_SPEED) {
      ball.body.setVelocity(0, 0);
      ball.anims.stop();
      ball.setFrame(0);
      return;
    }

    if (!ball.anims.isPlaying) {
      ball.play("ball-roll");
    }

    ball.anims.msPerFrame = Phaser.Math.Clamp(150 - goalSpeed * 0.1, 60, 150);
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
    this.goalScored = false;
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
    controller.hasBallSince = this.time.now;
    this.activeController = controller;
    this.resetGoalBallState();
    this.possessionClaim = null;
  }

  handleGoalWallCollision() {
    if (!this.goalScored) {
      return;
    }

    this.ball.body.velocity.scale(GOAL_COLLISION_DAMPING);
  }

  resetGoalBallState() {
    if (!this.goalScored) {
      return;
    }

    this.goalScored = false;
    this.ball.body.setBounce(BALL_BOUNCE);
  }

  createOutfieldPlayer(x, y, textureKey, direction = "n", immovable = false) {
    const textureConfig = textureKey === "team1" ? DIRECTION_ANIMS[direction] : TEAM2_DIRECTION_ANIMS[direction];
    const sprite = this.physics.add
      .sprite(x, y, textureConfig.key ?? textureKey, textureConfig.frames[0])
      .setScale(PLAYER_SCALE)
      .setDepth(3);

    sprite.body.setSize(6, 5);
    sprite.body.setOffset(6, 10);
    sprite.body.setCollideWorldBounds(true);
    sprite.body.setDrag(900, 900);
    sprite.body.setBounce(0.08);
    sprite.body.setImmovable(immovable);

    return sprite;
  }

  setControlledPlayerPhysics(sprite) {
    sprite.body.setImmovable(false);
    sprite.body.moves = true;
    sprite.body.setVelocity(0, 0);
  }

  setPassiveTeammatePhysics(sprite) {
    sprite.body.setVelocity(0, 0);
    sprite.body.setImmovable(true);
  }

  rebuildControlledPlayerColliders() {
    this.playerBallCollider?.destroy();
    this.playersCollider?.destroy();
    this.playerTeammatesCollider?.destroy();
    this.playerGoalLeftCollider?.destroy();
    this.playerGoalRightCollider?.destroy();
    this.playerGoalBackCollider?.destroy();

    this.playerBallCollider = this.physics.add.collider(this.player, this.ball);
    this.playersCollider = this.physics.add.collider(this.player, this.opponent);
    this.playerTeammatesCollider = this.physics.add.collider(this.player, this.team1Teammates);
    this.playerGoalLeftCollider = this.physics.add.collider(this.player, this.bottomGoalLeftWall);
    this.playerGoalRightCollider = this.physics.add.collider(this.player, this.bottomGoalRightWall);
    this.playerGoalBackCollider = this.physics.add.collider(this.player, this.bottomGoalBackWall);
  }

  switchTeam1ControlledPlayer(nextPlayer) {
    if (!nextPlayer || nextPlayer === this.player) {
      return;
    }

    const previousPlayer = this.player;
    this.team1Teammates.remove(nextPlayer, false, false);
    this.setControlledPlayerPhysics(nextPlayer);

    this.team1Teammates.add(previousPlayer);
    this.setPassiveTeammatePhysics(previousPlayer);

    this.player = nextPlayer;
    this.team1Controller.player = nextPlayer;
    this.rebuildControlledPlayerColliders();
  }

  maybeSwitchTeam1Receiver() {
    if (this.team1Controller.isControllingBall()) {
      return;
    }

    let nearestTeammate = null;
    let nearestDistance = Infinity;

    this.team1Teammates.children.iterate((teammate) => {
      const distance = Phaser.Math.Distance.Between(teammate.x, teammate.y, this.ball.x, this.ball.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestTeammate = teammate;
      }
    });

    if (!nearestTeammate || nearestDistance > TEAMMATE_CONTROL_SWITCH_RADIUS) {
      return;
    }

    const controlledDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.ball.x,
      this.ball.y
    );

    if (nearestDistance >= controlledDistance) {
      return;
    }

    this.switchTeam1ControlledPlayer(nearestTeammate);
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

    const goalDisplayWidth = worldWidth * BOTTOM_GOAL_POSITION.width;
    this.bottomGoalBack = this.add
      .image(
        worldWidth * BOTTOM_GOAL_POSITION.x,
        worldHeight * BOTTOM_GOAL_POSITION.goalLineY,
        "bottom-goal-back"
      )
      .setOrigin(0.5, 0)
      .setDisplaySize(
        goalDisplayWidth,
        goalDisplayWidth * (46 / 322)
      )
      .setDepth(8);
    this.bottomGoalFront = this.add
      .image(
        worldWidth * BOTTOM_GOAL_POSITION.x,
        worldHeight * BOTTOM_GOAL_POSITION.goalLineY,
        "bottom-goal-front"
      )
      .setOrigin(0.5, 1)
      .setDisplaySize(
        goalDisplayWidth,
        goalDisplayWidth * (80 / 322)
      )
      .setDepth(8);

    const goalCenterX = worldWidth * BOTTOM_GOAL_POSITION.x;
    const goalLineY = worldHeight * BOTTOM_GOAL_POSITION.goalLineY;
    this.bottomGoalLineY = goalLineY;
    const halfGoalWidth = goalDisplayWidth / 2;
    const goalBackHeight = goalDisplayWidth * (46 / 322);
    const wallHeight = goalBackHeight + GOAL_WALL_THICKNESS;
    const leftPostX = goalCenterX - halfGoalWidth + GOAL_WALL_THICKNESS / 2;
    const rightPostX = goalCenterX + halfGoalWidth - GOAL_WALL_THICKNESS / 2;
    const goalWallCenterY = goalLineY + wallHeight / 2;

    this.bottomGoalLeftWall = this.add.rectangle(
      leftPostX,
      goalWallCenterY,
      GOAL_WALL_THICKNESS,
      wallHeight,
      0xff0000,
      DEBUG_GOAL_WALLS ? 0.35 : 0
    );
    this.physics.add.existing(this.bottomGoalLeftWall, true);
    this.bottomGoalLeftWall.setDepth(20);

    this.bottomGoalRightWall = this.add.rectangle(
      rightPostX,
      goalWallCenterY,
      GOAL_WALL_THICKNESS,
      wallHeight,
      0xff0000,
      DEBUG_GOAL_WALLS ? 0.35 : 0
    );
    this.physics.add.existing(this.bottomGoalRightWall, true);
    this.bottomGoalRightWall.setDepth(20);

    this.bottomGoalBackWall = this.add.rectangle(
      goalCenterX,
      goalLineY + goalBackHeight - GOAL_WALL_THICKNESS / 2,
      goalDisplayWidth,
      GOAL_WALL_THICKNESS,
      0xff0000,
      DEBUG_GOAL_WALLS ? 0.35 : 0
    );
    this.physics.add.existing(this.bottomGoalBackWall, true);
    this.bottomGoalBackWall.setDepth(20);

    this.bottomGoalZone = this.add.zone(
      goalCenterX,
      goalLineY + goalBackHeight / 2,
      goalDisplayWidth - GOAL_WALL_THICKNESS * 2,
      goalBackHeight
    );

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

    const playerX = worldWidth * BOTTOM_GOAL_POSITION.x;
    const playerY = worldHeight * BOTTOM_GOAL_POSITION.penaltySpotY;

    this.player = this.createOutfieldPlayer(playerX, playerY, "team1", "n");

    this.ball = this.physics.add
      .sprite(playerX, playerY, "ball", 0)
      .setScale(3)
      .setDepth(4);
    this.ball.body.setCircle(2, 0, 0);
    this.ball.body.setBounce(BALL_BOUNCE);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setDamping(false);
    this.ball.body.setDrag(0, 0);
    this.ball.body.setMaxVelocity(1200, 1200);

    this.opponent = this.createOutfieldPlayer(worldWidth / 2, worldHeight * 0.42, "team2", "s");

    this.team1Teammates = this.physics.add.group();
    TEAM1_TEAMMATE_LAYOUT.forEach(({ x, y, direction }) => {
      const teammate = this.createOutfieldPlayer(
        worldWidth * x,
        worldHeight * y,
        "team1",
        direction,
        true
      );
      this.team1Teammates.add(teammate);
    });

    this.activeController = null;
    this.team1Controller = new PlayerController(this, this.player, this.ball, this.team1Controls);
    this.team2Controller = new PlayerController(this, this.opponent, this.ball, this.team2Controls);
    this.rebuildControlledPlayerColliders();
    this.opponentBallCollider = this.physics.add.collider(this.opponent, this.ball);
    this.team1TeammateBallCollider = this.physics.add.collider(this.team1Teammates, this.ball);
    this.opponentTeammatesCollider = this.physics.add.collider(this.opponent, this.team1Teammates);
    this.team1TeammatesInternalCollider = this.physics.add.collider(this.team1Teammates, this.team1Teammates);
    this.ballGoalLeftCollider = this.physics.add.collider(
      this.ball,
      this.bottomGoalLeftWall,
      () => this.handleGoalWallCollision()
    );
    this.ballGoalRightCollider = this.physics.add.collider(
      this.ball,
      this.bottomGoalRightWall,
      () => this.handleGoalWallCollision()
    );
    this.ballGoalBackCollider = this.physics.add.collider(
      this.ball,
      this.bottomGoalBackWall,
      () => this.handleGoalWallCollision()
    );
    this.opponentGoalLeftCollider = this.physics.add.collider(this.opponent, this.bottomGoalLeftWall);
    this.opponentGoalRightCollider = this.physics.add.collider(this.opponent, this.bottomGoalRightWall);
    this.opponentGoalBackCollider = this.physics.add.collider(this.opponent, this.bottomGoalBackWall);
    this.team1TeammatesGoalLeftCollider = this.physics.add.collider(
      this.team1Teammates,
      this.bottomGoalLeftWall
    );
    this.team1TeammatesGoalRightCollider = this.physics.add.collider(
      this.team1Teammates,
      this.bottomGoalRightWall
    );
    this.team1TeammatesGoalBackCollider = this.physics.add.collider(
      this.team1Teammates,
      this.bottomGoalBackWall
    );
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
    this.maybeSwitchTeam1Receiver();
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
    this.checkBottomGoal();
    this.keepFreeBallInsideBottomGoal();
    this.resetGoalStateIfBallReturnedToField();
  }

  checkBottomGoal() {
    if (this.goalScored) {
      return;
    }

    const goalBounds = this.bottomGoalZone.getBounds();
    const ballBounds = this.ball.getBounds();
    const fullyPastGoalLine = ballBounds.top > this.bottomGoalLineY;
    const insideGoalMouth =
      ballBounds.left >= goalBounds.left &&
      ballBounds.right <= goalBounds.right &&
      ballBounds.bottom <= goalBounds.bottom;

    if (!fullyPastGoalLine || !insideGoalMouth) {
      return;
    }

    this.goalScored = true;
    this.ball.body.setBounce(GOAL_BALL_BOUNCE);
    this.activeController?.forceReleaseBall();
    this.activeController = null;
  }

  resetGoalStateIfBallReturnedToField() {
    if (!this.goalScored || this.activeController) {
      return;
    }

    const goalBounds = this.bottomGoalZone.getBounds();
    const ballBounds = this.ball.getBounds();
    const outsideGoalMouth =
      ballBounds.right < goalBounds.left ||
      ballBounds.left > goalBounds.right ||
      ballBounds.top <= this.bottomGoalLineY;

    if (!outsideGoalMouth) {
      return;
    }

    this.resetGoalBallState();
  }

  keepFreeBallInsideBottomGoal() {
    if (!this.goalScored || this.activeController) {
      return;
    }

    const goalBounds = this.bottomGoalZone.getBounds();
    const ballBounds = this.ball.getBounds();
    const ballRadius = this.ball.displayHeight / 2;
    const overlapsGoalWidth =
      ballBounds.right > goalBounds.left && ballBounds.left < goalBounds.right;
    const tryingToExitToField =
      overlapsGoalWidth &&
      ballBounds.top <= this.bottomGoalLineY &&
      this.ball.body.velocity.y < 0;

    if (!tryingToExitToField) {
      const slippingBelowBack = ballBounds.bottom >= goalBounds.bottom;
      if (!slippingBelowBack) {
        return;
      }

      this.ball.y = goalBounds.bottom - ballRadius - 1;
      this.ball.body.velocity.y = -Math.max(Math.abs(this.ball.body.velocity.y) * 0.18, 8);
      this.ball.body.velocity.x *= 0.75;
      return;
    }

    this.ball.y = this.bottomGoalLineY + ballRadius + 1;
    this.ball.body.velocity.y = Math.max(Math.abs(this.ball.body.velocity.y) * 0.18, 12);
    this.ball.body.velocity.x *= 0.6;
  }
}
