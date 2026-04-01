export { state, robot, canvasArea, MAX_SENSORS, MAX_GRIPS } from "./variableGlobal.js";
export {
  sensorPluginRegistry,
  registerSensorPlugin,
  getSensorPlugin,
  getAllSensorPlugins,
} from "./sensor-plugin-registry.js";
export {
  physicsAdapter,
  getCurrentEngineAdapter,
  getCurrentEngineName,
} from "./physics/physics-adapter.js";
export {
  SimulationService,
} from "./simulation-service.js";
export { buildSensorGlobals, forEachActiveDevice } from "./simulation-context.js";
