window.grabObject = function (index = 0) {
  if (typeof state.grips === "undefined" || !state.grips[index]) return;
  if (typeof state.grabbedObjects !== "undefined" && state.grabbedObjects[index]) return;

  const rad = (state.angle * Math.PI) / 180;
  const cos_a = Math.cos(rad);
  const sin_a = Math.sin(rad);

  // หาตำแหน่ง global ของกริปที่ต้องการ
  const grip = state.grips[index];
  const localX = grip.x - 25;
  const localY = grip.y - 25;
  const rotatedX = localX * cos_a - localY * sin_a;
  const rotatedY = localX * sin_a + localY * cos_a;
  const gripCanvasX = state.robotX + 25 + rotatedX;
  const gripCanvasY = state.robotY + 25 + rotatedY;
  
  const gripGlobalAngle = (state.angle + (grip.angle || 0)) * (Math.PI / 180);
  const armLen = grip.armLength || 20;
  const totalLen = armLen + 10; // Arm + Jaws
  const tipX = gripCanvasX + totalLen * Math.cos(gripGlobalAngle);
  const tipY = gripCanvasY + totalLen * Math.sin(gripGlobalAngle);

  let closestObj = null;
  let closestDist = 19; // รัศมีวัตถุ (15) + ระยะผลัก (2) + ระยะจับที่มากกว่า (2)

  if (typeof state.canvasObjects !== "undefined" && state.canvasObjects) {
    state.canvasObjects.forEach((obj) => {
      // ข้ามวัตถุที่ถูกจับโดยกริปอื่นอยู่แล้ว
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

    // ปล่อยวัตถุไว้ที่ตำแหน่งกริป (บวกระยะยื่นเล็กน้อย)
    const grip = state.grips[index];
    const armLen = grip.armLength || 20;
    const totalLen = armLen + 10; // Arm + Jaws
    const gripGlobalAngle = (state.angle + (grip.angle || 0)) * (Math.PI / 180);

    // Calculate tip position again to ensure it's released exactly at the current tip
    const rad = (state.angle * Math.PI) / 180;
    const localX = grip.x - 25;
    const localY = grip.y - 25;
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
    const gripCanvasX = state.robotX + 25 + rotatedX;
    const gripCanvasY = state.robotY + 25 + rotatedY;
    
    obj.x = gripCanvasX + totalLen * Math.cos(gripGlobalAngle);
    obj.y = gripCanvasY + totalLen * Math.sin(gripGlobalAngle);

    obj.vx = 0;
    obj.vy = 0;

    state.grabbedObjects[index] = null;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};
