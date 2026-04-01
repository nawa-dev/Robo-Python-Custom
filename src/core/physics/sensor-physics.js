import { state } from "../variableGlobal.js";
import { getSensorPlugin } from "../sensor-plugin-registry.js";
import { buildSensorGlobals, forEachActiveDevice } from "../simulation-context.js";
import { robotDrive } from "./drive-controller.js";

let showSensorRays = true;

export function toggleSensorRays(enabled) {
  showSensorRays = enabled;
  updateSensorDots();
}

export function runSensorPhysicsStep(dt) {
  const globals = buildSensorGlobals(dt);
  forEachActiveDevice((device, type, typeIndex) => {
    const plugin = getSensorPlugin(type) || window.SensorRegistry[type];
    if (plugin && typeof plugin.physicsStep === "function") {
      plugin.physicsStep(device, typeIndex, globals);
    }
  });
}

export function updateSensorDots() {
  const sensorsSvg = document.getElementById("sensors-svg");
  if (!sensorsSvg) return;
  sensorsSvg.innerHTML = "";

  const globals = buildSensorGlobals(0);
  if (!showSensorRays) {
    globals.sensorVisibility = {
      ...globals.sensorVisibility,
      ultrasonic: false,
    };
  }

  forEachActiveDevice((device, type, typeIndex) => {
    const plugin = getSensorPlugin(type) || window.SensorRegistry[type];
    if (plugin && typeof plugin.drawCanvas === "function") {
      plugin.drawCanvas(sensorsSvg, device, globals, typeIndex);
    }
  });
}

export function handleGenericSensorCollision(sensor, globals) {
  if (!state.canvasObjects) return;

  const rad = (globals.angle * Math.PI) / 180;
  const localX =
    globals.robotWidth / 2 - ((sensor.x || 0) / 100) * globals.robotWidth;
  const localY = ((sensor.y || 0) / 100) * globals.robotHeight;

  const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
  const worldX = globals.robotX + rotatedX;
  const worldY = globals.robotY + rotatedY;

  state.canvasObjects.forEach((obj) => {
    if (state.grabbedObjects && state.grabbedObjects.includes(obj)) {
      return;
    }

    const dx = obj.x - worldX;
    const dy = obj.y - worldY;
    const dist = Math.hypot(dx, dy);
    const minDist = (obj.radius || 15) + 5;

    if (dist < minDist) {
      const angleToObj = Math.atan2(dy, dx);
      const overlap = minDist - dist;

      obj.x += Math.cos(angleToObj) * overlap;
      obj.y += Math.sin(angleToObj) * overlap;

      const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
      const mRobot = state.robotUseMass && state.robotMass > 0 ? state.robotMass : 1.0;
      const mObj = obj.mass || 1.0;
      const transferVelocity = v * 1.2 * (mRobot / mObj);

      obj.vx += transferVelocity * Math.cos(rad);
      obj.vy += transferVelocity * Math.sin(rad);
    }
  });
}

window.toggleSensorRays = toggleSensorRays;
window.updateSensorDots = updateSensorDots;
window.handleGenericSensorCollision = handleGenericSensorCollision;

