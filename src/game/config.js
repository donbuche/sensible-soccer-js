import { BootScene } from "../scenes/BootScene.js";
import { MatchScene } from "../scenes/MatchScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#0d1f14",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MatchScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  pixelArt: true,
};
