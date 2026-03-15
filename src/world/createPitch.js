export function createPitch(scene, x, y, width, height) {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x2f8146, 1);
  graphics.fillRect(x, y, width, height);

  graphics.fillStyle(0x27683a, 1);
  const stripeHeight = height / 8;
  for (let index = 0; index < 8; index += 1) {
    if (index % 2 === 0) continue;
    graphics.fillRect(x, y + stripeHeight * index, width, stripeHeight);
  }

  graphics.lineStyle(4, 0xf6f0d0, 1);
  graphics.strokeRect(x, y, width, height);
  graphics.strokeCircle(x + width / 2, y + height / 2, 58);
  graphics.lineBetween(x + width / 2, y, x + width / 2, y + height);

  graphics.strokeRect(x, y + height / 2 - 90, 80, 180);
  graphics.strokeRect(x + width - 80, y + height / 2 - 90, 80, 180);

  graphics.strokeRect(x, y + height / 2 - 45, 26, 90);
  graphics.strokeRect(x + width - 26, y + height / 2 - 45, 26, 90);

  graphics.fillStyle(0xf6f0d0, 1);
  graphics.fillCircle(x + width / 2, y + height / 2, 4);
}
