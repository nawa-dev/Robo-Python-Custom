import { state } from "./variableGlobal.js";

export function buildSensorGlobals(dt) {
  return {
    robotX: state.robotX,
    robotY: state.robotY,
    angle: state.angle,
    dt,
    robotWidth: state.robotWidth,
    robotHeight: state.robotHeight,
    robotRenderPose: state.robotRenderPose,
    sensorVisibility: window.SensorSettings
      ? window.SensorSettings.visibility
      : {},
  };
}

export function forEachActiveDevice(callback) {
  const devices = [...state.sensors, ...state.grips];
  const typeCounters = {};

  devices.forEach((device) => {
    const type = device.type;
    if (typeCounters[type] === undefined) {
      typeCounters[type] = 0;
    }
    const typeIndex = typeCounters[type]++;
    callback(device, type, typeIndex);
  });
}
