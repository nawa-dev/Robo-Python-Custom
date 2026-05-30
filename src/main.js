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
import { initCodePlayback, showPlaybackModal } from "./utils/code-playback.js";
import { verifyExtensionInstallation } from "./utils/extension-enforcer.js";

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
  verifyExtensionInstallation();
  
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

  const setupPlayback = () => {
    if (window.editor) {
      initCodePlayback(window.editor);
    } else {
      setTimeout(setupPlayback, 500);
    }
  };
  setupPlayback();

  fetch("./config.json")
    .then((r) => r.json())
    .then((config) => {
      if (config.ui && config.ui.enablePlayback) {
        const btn = document.getElementById("playback-btn");
        if (btn) {
          btn.style.display = "inline-flex";
          btn.addEventListener("click", showPlaybackModal);
        }
      }
    })
    .catch((err) => console.error("Error loading config for playback:", err));

  return window.appBootstrap;
}

window.appBootstrapReady = bootstrapApp();
