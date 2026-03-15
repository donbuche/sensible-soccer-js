import { gameConfig } from "./game/config.js";

window.addEventListener("load", () => {
  if (!window.Phaser) {
    throw new Error("Phaser no se ha cargado correctamente.");
  }

  new Phaser.Game(gameConfig);
});
