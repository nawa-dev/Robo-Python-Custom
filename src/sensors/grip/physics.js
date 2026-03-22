window.grabObject = function (index = 0) {
  if (typeof grips === "undefined" || !grips[index]) return;
  if (typeof grabbedObjects !== "undefined" && grabbedObjects[index]) return;

  const rad = (angle * Math.PI) / 180;
  const cos_a = Math.cos(rad);
  const sin_a = Math.sin(rad);

  // หาตำแหน่ง global ของกริปที่ต้องการ
  const grip = grips[index];
  const localX = grip.x - 25;
  const localY = grip.y - 25;
  const rotatedX = localX * cos_a - localY * sin_a;
  const rotatedY = localX * sin_a + localY * cos_a;
  const gripCanvasX = robotX + 25 + rotatedX;
  const gripCanvasY = robotY + 25 + rotatedY;
  
  const gripGlobalAngle = (angle + (grip.angle || 0)) * (Math.PI / 180);

  let closestObj = null;
  let closestDist = 30; // รัศมีวัตถุ 15 + ระยะเอื้อม 15

  if (typeof canvasObjects !== "undefined" && canvasObjects) {
    canvasObjects.forEach((obj) => {
      // ข้ามวัตถุที่ถูกจับโดยกริปอื่นอยู่แล้ว
      if (grabbedObjects.includes(obj)) return;

      const dx = obj.x - gripCanvasX;
      const dy = obj.y - gripCanvasY;
      const dist = Math.hypot(dx, dy);

      if (dist <= closestDist) {
        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToObj - gripGlobalAngle);
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= Math.PI / 3) {
          closestObj = obj;
          closestDist = dist;
        }
      }
    });
  }

  if (closestObj) {
    grabbedObjects[index] = closestObj;
    closestObj.isGrabbed = true;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};

window.releaseObject = function (index = 0) {
  if (typeof grabbedObjects !== "undefined" && grabbedObjects[index]) {
    const obj = grabbedObjects[index];
    obj.isGrabbed = false;

    // ปล่อยวัตถุไว้ที่ตำแหน่งกริป (บวกระยะยื่นเล็กน้อย)
    const grip = grips[index];
    const gripGlobalAngle = (angle + (grip.angle || 0)) * (Math.PI / 180);

    obj.vx = 0;
    obj.vy = 0;

    grabbedObjects[index] = null;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};
