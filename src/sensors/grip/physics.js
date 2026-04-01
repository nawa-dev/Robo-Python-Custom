import { state } from "../../core/variableGlobal.js";
import { robotDrive } from "../../core/physics/drive-controller.js";

function updateObjectsView() {
  if (typeof window.updateObjectsDOM === "function") {
    window.updateObjectsDOM();
  }
}

export function grabObject(index = 0) {
  if (!state.grips || !state.grips[index]) return;
  if (state.grabbedObjects && state.grabbedObjects[index]) return;

  const rad = (state.angle * Math.PI) / 180;
  const grip = state.grips[index];
  const localX = state.robotWidth / 2 - (grip.x / 100) * state.robotWidth;
  const localY = (grip.y / 100) * state.robotHeight;
  const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
  const gripCanvasX = state.robotX + rotatedX;
  const gripCanvasY = state.robotY + rotatedY;

  const gripGlobalAngle = (state.angle + (grip.angle || 0)) * (Math.PI / 180);
  const totalLen = (grip.armLength || 20) + 10;
  const tipX = gripCanvasX + totalLen * Math.cos(gripGlobalAngle);
  const tipY = gripCanvasY + totalLen * Math.sin(gripGlobalAngle);

  let closestObj = null;
  let closestDist = 22;

  (state.canvasObjects || []).forEach((obj) => {
    if (state.grabbedObjects.includes(obj)) return;

    const dx = obj.x - tipX;
    const dy = obj.y - tipY;
    const dist = Math.hypot(dx, dy);

    if (dist <= closestDist) {
      closestObj = obj;
      closestDist = dist;
    }
  });

  if (closestObj) {
    state.grabbedObjects[index] = closestObj;
    closestObj.isGrabbed = true;
    updateObjectsView();
  }
}

export function releaseObject(index = 0) {
  if (!(state.grabbedObjects && state.grabbedObjects[index])) return;

  const obj = state.grabbedObjects[index];
  obj.isGrabbed = false;

  const grip = state.grips[index];
  const totalLen = (grip.armLength || 20) + 10;
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

  const robotVelocity = 0.5 * (robotDrive.left.current + robotDrive.right.current);
  obj.vx = robotVelocity * Math.cos((state.angle * Math.PI) / 180);
  obj.vy = robotVelocity * Math.sin((state.angle * Math.PI) / 180);

  state.grabbedObjects[index] = null;
  updateObjectsView();
}

window.grabObject = grabObject;
window.releaseObject = releaseObject;
