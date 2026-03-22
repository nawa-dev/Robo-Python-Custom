/**
 * Calculate distance using Raycasting
 * @param {number} startX - Start X coordinate
 * @param {number} startY - Start Y coordinate
 * @param {number} angleDeg - Ray angle in degrees
 * @param {string} targetColor - Hex color to detect (e.g., "#000000")
 * @returns {number} Distance in pixels (max 800)
 */
window.getUltrasonicDistance = function(startX, startY, angleDeg, targetColor) {
  if (!state.canvasPixelData) return 800;

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // Parse target color
  let tr = 0,
    tg = 0,
    tb = 0;
  if (targetColor && targetColor.startsWith("#")) {
    const hex = targetColor.substring(1);
    tr = parseInt(hex.substring(0, 2), 16);
    tg = parseInt(hex.substring(2, 4), 16);
    tb = parseInt(hex.substring(4, 6), 16);
  }

  let minDist = 800;
  // --- 1. ตรวจสอบระยะห่างจากวัตถุบนแคนวาส (canvasObjects) ---
  if (typeof state.canvasObjects !== "undefined" && state.canvasObjects) {
    for (let i = 0; i < state.canvasObjects.length; i++) {
      const obj = state.canvasObjects[i];
      const ocX = startX - obj.x;
      const ocY = startY - obj.y;
      const b = 2 * (cosA * ocX + sinA * ocY);
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
  const step = 2; // Step size for optimization
  const maxDist = minDist; // Max range
  const threshold = 100; // Color distance threshold (0-441 approx)

  while (dist < maxDist) {
    dist += step;
    const cx = startX + dist * cosA;
    const cy = startY + dist * sinA;

    // Check boundaries
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
    const width = canvasArea.offsetWidth;
    const idx = (pixelY * width + pixelX) * 4;

    if (idx < 0 || idx >= state.canvasPixelData.length) return dist;

    const r = state.canvasPixelData[idx];
    const g = state.canvasPixelData[idx + 1];
    const b = state.canvasPixelData[idx + 2];

    // Calculate Euclidean distance between colors
    // dist = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
    const colorDist = Math.sqrt(
      Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2),
    );

    if (colorDist < threshold) {
      return dist;
    }
  }

  return maxDist;
};
