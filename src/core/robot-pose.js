import { state } from "./variableGlobal.js";

export function sensorPercentToLocal(sensor, robotWidth, robotHeight) {
  return {
    localX: robotWidth / 2 - ((sensor.x || 0) / 100) * robotWidth,
    localY: ((sensor.y || 0) / 100) * robotHeight,
  };
}

export function localToWorld(localX, localY, globals) {
  const rad = (globals.angle * Math.PI) / 180;
  const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
  return {
    worldX: globals.robotX + rotatedX,
    worldY: globals.robotY + rotatedY,
  };
}

export function sensorPercentToWorld(sensor, globals) {
  const { localX, localY } = sensorPercentToLocal(
    sensor,
    globals.robotWidth,
    globals.robotHeight,
  );
  return localToWorld(localX, localY, globals);
}

export function updateRobotRenderPose(pose) {
  state.robotRenderPose = pose;
}

window.updateRobotRenderPose = updateRobotRenderPose;
