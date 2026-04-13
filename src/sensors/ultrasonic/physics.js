import { canvasArea, state } from "../../core/index.js";

export function getUltrasonicDistance(startX, startY, angleDeg, targetColor) {
  if (!state.canvasPixelData) {
    return 800;
  }

  const rad = (angleDeg * Math.PI) / 180;
  const cosAngle = Math.cos(rad);
  const sinAngle = Math.sin(rad);

  let targetR = 0;
  let targetG = 0;
  let targetB = 0;
  if (targetColor && targetColor.startsWith("#")) {
    const hex = targetColor.substring(1);
    targetR = parseInt(hex.substring(0, 2), 16);
    targetG = parseInt(hex.substring(2, 4), 16);
    targetB = parseInt(hex.substring(4, 6), 16);
  }

  let minDist = 800;
  if (state.canvasObjects) {
    for (let i = 0; i < state.canvasObjects.length; i += 1) {
      const obj = state.canvasObjects[i];
      const ocX = startX - obj.x;
      const ocY = startY - obj.y;
      const b = 2 * (cosAngle * ocX + sinAngle * ocY);
      const c = ocX * ocX + ocY * ocY - (obj.radius || 15) * (obj.radius || 15);
      const disc = b * b - 4 * c;
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / 2;
        if (t >= 0 && t < minDist) {
          minDist = t;
        }
      }
    }
  }

  let dist = 0;
  const step = 2;
  const threshold = 100;

  while (dist < minDist) {
    dist += step;
    const cx = startX + dist * cosAngle;
    const cy = startY + dist * sinAngle;

    if (
      cx < 0 ||
      cx >= canvasArea.offsetWidth ||
      cy < 0 ||
      cy >= canvasArea.offsetHeight
    ) {
      return dist;
    }

    const pixelX = Math.round(cx);
    const pixelY = Math.round(cy);
    const idx = (pixelY * canvasArea.offsetWidth + pixelX) * 4;

    if (idx < 0 || idx >= state.canvasPixelData.length) {
      return dist;
    }

    const r = state.canvasPixelData[idx];
    const g = state.canvasPixelData[idx + 1];
    const b = state.canvasPixelData[idx + 2];

    const colorDist = Math.sqrt(
      Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2),
    );

    if (colorDist < threshold) {
      return dist;
    }
  }

  return minDist;
}

window.getUltrasonicDistance = getUltrasonicDistance;
