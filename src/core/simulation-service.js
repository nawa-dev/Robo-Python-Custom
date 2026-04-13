/**
 * Simulation Service
 * Owns the orchestration flow between physics, sensors, and higher-level runtime.
 */

import { state } from "./variableGlobal.js";
import { getSensorPlugin } from "./sensor-plugin-registry.js";
import { physicsAdapter } from "./physics/physics-adapter.js";
import { buildSensorGlobals, forEachActiveDevice } from "./simulation-context.js";

export const SimulationService = {
  buildSensorGlobals,
  forEachActiveDevice,
  runSensorPhysics(dt) {
    const globals = buildSensorGlobals(dt);
    forEachActiveDevice((device, type, typeIndex) => {
      const plugin = getSensorPlugin(type);
      if (plugin && typeof plugin.physicsStep === "function") {
        plugin.physicsStep(device, typeIndex, globals);
      }
    });
  },
  step(dt) {
    if (physicsAdapter && typeof physicsAdapter.step === "function") {
      physicsAdapter.step(dt);
    }
  },
};

window.SimulationService = SimulationService;
