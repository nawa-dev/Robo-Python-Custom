import {
  state,
  sensorPluginRegistry,
  physicsAdapter,
  SimulationService,
} from "./core/index.js";
import { switchTab, logToConsole, clearConsole } from "./ui/ui-manager.js";
import { initAppControls } from "./ui/app-controls.js";
import { initTourAutoStart } from "./ui/tour.js";
import { initSensors } from "./utils/sensorLoader.js";
import { loadExampleMenu, loadFromWebStorage } from "./utils/storage.js";

window.appBootstrap = {
  state,
  sensorPluginRegistry,
  physicsAdapter,
  SimulationService,
  switchTab,
  logToConsole,
  clearConsole,
};

function waitForDomReady() {
  if (document.readyState === "loading") {
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }
  return Promise.resolve();
}

function waitForCondition(predicate, timeoutMs = 5000, intervalMs = 25) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    function check() {
      if (predicate()) {
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      window.setTimeout(check, intervalMs);
    }

    check();
  });
}

async function bootstrapApp() {
  await waitForDomReady();
  initAppControls();

  await waitForCondition(
    () =>
      typeof window.renderSensorTabs === "function" &&
      typeof window.renderSensorsList === "function",
  );

  await initSensors();
  initTourAutoStart();

  loadExampleMenu();

  await waitForCondition(
    () => typeof window.applyProjectData === "function",
  );

  await waitForCondition(
    () => window.editor || !localStorage.getItem("robot_sim_autosave"),
    4000,
  );

  loadFromWebStorage();

  return window.appBootstrap;
}

window.appBootstrapReady = bootstrapApp();
