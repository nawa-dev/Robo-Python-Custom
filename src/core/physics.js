import { state } from "./variableGlobal.js";
import { FIXED_DT, robotDrive } from "./physics/drive-controller.js";
import { physicsAdapter } from "./physics/physics-adapter.js";

let lastPhysicTime = 0;
let physicsAccumulator = 0;

function updateRobotView() {
  if (typeof window.updateRobotDOM === "function") {
    window.updateRobotDOM();
  }
}

function updateObjectsView() {
  if (typeof window.updateObjectsDOM === "function") {
    window.updateObjectsDOM();
  }
}

export function applyPhysicsStep(dt) {
  physicsAdapter.step(dt);
}

export function updatePhysics(timestamp) {
  if (state.isRunning && !state.isDragging) {
    if (!lastPhysicTime) {
      lastPhysicTime = timestamp;
    }

    let frameTime = (timestamp - lastPhysicTime) / 1000;
    if (frameTime > 0.25) {
      frameTime = 0.25;
    }
    lastPhysicTime = timestamp;
    physicsAccumulator += frameTime;

    while (physicsAccumulator >= FIXED_DT) {
      applyPhysicsStep(FIXED_DT);
      physicsAccumulator -= FIXED_DT;
    }

    updateRobotView();
    updateObjectsView();
    if (typeof window.updateTrackBuffer === "function") {
      window.updateTrackBuffer();
    }
  } else {
    lastPhysicTime = 0;
    physicsAccumulator = 0;
  }

  requestAnimationFrame(updatePhysics);
}

export function startPhysicsLoop() {
  requestAnimationFrame(updatePhysics);
}

window.updatePhysics = updatePhysics;
window.applyPhysicsStep = applyPhysicsStep;

startPhysicsLoop();
