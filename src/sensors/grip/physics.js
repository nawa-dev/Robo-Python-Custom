window.grabObject = function (index = 0) {
  if (typeof state.grips === "undefined" || !state.grips[index]) return;
  if (typeof state.grabbedObjects !== "undefined" && state.grabbedObjects[index]) return;

  const rad = (state.angle * Math.PI) / 180;
  const cos_a = Math.cos(rad);
  const sin_a = Math.sin(rad);

  // Find global position of the grip using percentage-based local coordinates
  const grip = state.grips[index];
  const localX = state.robotWidth / 2 - (grip.x / 100) * state.robotWidth;
  const localY = (grip.y / 100) * state.robotHeight;
  const rotatedX = localX * cos_a - localY * sin_a;
  const rotatedY = localX * sin_a + localY * cos_a;
  const gripCanvasX = state.robotX + rotatedX;
  const gripCanvasY = state.robotY + rotatedY;
  
  const gripGlobalAngle = (state.angle + (grip.angle || 0)) * (Math.PI / 180);
  const armLen = grip.armLength || 20;
  const totalLen = armLen + 10; // Arm + Jaws
  const tipX = gripCanvasX + totalLen * Math.cos(gripGlobalAngle);
  const tipY = gripCanvasY + totalLen * Math.sin(gripGlobalAngle);

  let closestObj = null;
  let closestDist = 22; // Extended slightly for reliability (Radius 15 + buffer)

  if (typeof state.canvasObjects !== "undefined" && state.canvasObjects) {
    state.canvasObjects.forEach((obj) => {
      // Skip objects already grabbed
      if (state.grabbedObjects.includes(obj)) return;

      const dx = obj.x - tipX;
      const dy = obj.y - tipY;
      const dist = Math.hypot(dx, dy);

      if (dist <= closestDist) {
        closestObj = obj;
        closestDist = dist;
      }
    });
  }

  if (closestObj) {
    state.grabbedObjects[index] = closestObj;
    closestObj.isGrabbed = true;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};

window.releaseObject = function (index = 0) {
  if (typeof state.grabbedObjects !== "undefined" && state.grabbedObjects[index]) {
    const obj = state.grabbedObjects[index];
    obj.isGrabbed = false;

    // Release at grip position
    const grip = state.grips[index];
    const armLen = grip.armLength || 20;
    const totalLen = armLen + 10; // Arm + Jaws
    const gripGlobalAngle = (state.angle + (grip.angle || 0)) * (Math.PI / 180);

    const rad = (state.angle * Math.PI) / 180;
    const localX = state.robotWidth / 2 - (grip.x / 100) * state.robotWidth;
    const localY = (grip.y / 100) * state.robotHeight;
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
    const gripCanvasX = state.robotX + rotatedX;
    const gripCanvasY = state.robotY + rotatedY;
    
    obj.x = gripCanvasX + totalLen * Math.cos(gripGlobalAngle);
    obj.y = gripCanvasY + totalLen * Math.sin(gripGlobalAngle);

    const robotV = 0.5 * (window.physics.left.current + window.physics.right.current);
    obj.vx = robotV * Math.cos((state.angle * Math.PI) / 180);
    obj.vy = robotV * Math.sin((state.angle * Math.PI) / 180);

    state.grabbedObjects[index] = null;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};
