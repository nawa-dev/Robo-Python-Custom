/**
 * Physics Adapter
 * Routes simulation steps to the selected engine and hides engine-specific hooks.
 */

import { state } from "../variableGlobal.js";
import {
  applyCustomPhysicsStep,
} from "./custom-engine.js";
import {
  applyMatterPhysicsStep,
  initMatter,
  resetMatter,
  syncStateToMatter,
} from "./matter-engine.js";

export function getCurrentEngineName() {
  return state.physicsEngine === "matter" ? "matter" : "custom";
}

export function getCurrentEngineAdapter() {
  const engineName = getCurrentEngineName();
  return engineName === "matter"
    ? {
        step(dt) {
          applyMatterPhysicsStep(dt);
        },
        sync() {
          syncStateToMatter();
        },
        reset() {
          resetMatter();
        },
        reinitialize() {
          initMatter();
        },
      }
    : {
        step(dt) {
          applyCustomPhysicsStep(dt);
        },
        sync() {},
        reset() {},
        reinitialize() {},
      };
}

export const physicsAdapter = {
  getEngineName: getCurrentEngineName,
  getCurrentEngineAdapter,
  step(dt) {
    getCurrentEngineAdapter().step(dt);
  },
  sync() {
    getCurrentEngineAdapter().sync();
  },
  reset() {
    getCurrentEngineAdapter().reset();
  },
  reinitialize() {
    getCurrentEngineAdapter().reinitialize();
  },
};

window.physicsAdapter = physicsAdapter;
