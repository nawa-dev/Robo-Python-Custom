import { canvasArea, state } from "../../core/index.js";

export function getPixelBrightness(x, y, targetColor = "#ff0000") {
  if (!state.canvasPixelData) return 512;

  const pixelX = Math.round(x);
  const pixelY = Math.round(y);

  if (
    pixelX < 0 ||
    pixelX >= canvasArea.offsetWidth ||
    pixelY < 0 ||
    pixelY >= canvasArea.offsetHeight
  ) {
    return 512;
  }

  const imageWidth = canvasArea.offsetWidth;
  const pixelIndex = (pixelY * imageWidth + pixelX) * 4;

  if (pixelIndex + 2 >= state.canvasPixelData.length) return 512;

  const r = state.canvasPixelData[pixelIndex];
  const g = state.canvasPixelData[pixelIndex + 1];
  const b = state.canvasPixelData[pixelIndex + 2];

  let wr = 1;
  let wg = 0;
  let wb = 0;
  if (targetColor && targetColor.startsWith("#")) {
    const hex = targetColor.substring(1);
    wr = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
    wg = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
    wb = (parseInt(hex.substring(4, 6), 16) || 0) / 255;
  }

  const totalWeight = wr + wg + wb || 1;
  const weightedIntensity = (r * wr + g * wg + b * wb) / totalWeight;

  return Math.round((weightedIntensity / 255) * 1024);
}

window.getPixelBrightness = getPixelBrightness;
