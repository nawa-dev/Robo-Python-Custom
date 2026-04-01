import { clearConsole, switchTab } from "./ui-manager.js";
import {
  resetView,
  rotateRobot,
  toggleDragMode,
  zoomIn,
  zoomOut,
} from "./interaction-handler.js";
import { startTour } from "./tour.js";
import {
  handleMapSelectChange,
  loadMapFile,
  updateCanvasSize,
} from "../core/canvas.js";
import { loadProject, newProject, openProject, saveProjectAs } from "../utils/storage.js";

function track(action, category, label) {
  if (typeof window.trackEvent === "function") {
    window.trackEvent(action, category, label);
  }
}

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (!element || element.dataset.bound === "true") {
    return;
  }
  element.addEventListener("click", handler);
  element.dataset.bound = "true";
}

function bindChange(id, handler) {
  const element = document.getElementById(id);
  if (!element || element.dataset.bound === "true") {
    return;
  }
  element.addEventListener("change", handler);
  element.dataset.bound = "true";
}

export function initAppControls() {
  bindClick("menu-new-project", () => {
    newProject();
    track("click", "FileMenu", "New");
  });

  bindClick("menu-open-project", () => {
    openProject();
    track("click", "FileMenu", "Open");
  });

  bindClick("menu-export-project", () => {
    saveProjectAs();
    track("click", "FileMenu", "Export");
  });

  bindClick("run-stop-btn", () => {
    if (typeof window.toggleRunStop === "function") {
      window.toggleRunStop();
      track("click", "Toolbar", "RunStop");
    }
  });

  bindClick("reset-btn", () => {
    if (typeof window.resetPosition === "function") {
      window.resetPosition();
      track("click", "Toolbar", "Reset");
    }
  });

  bindClick("rotate-left-btn", () => {
    rotateRobot(-45);
  });

  bindClick("rotate-right-btn", () => {
    rotateRobot(45);
  });

  bindChange("canvas-w", () => {
    updateCanvasSize();
  });

  bindChange("canvas-h", () => {
    updateCanvasSize();
  });

  bindChange("map-select", (event) => {
    handleMapSelectChange(event.currentTarget);
    track("change", "Settings", `MapSelect:${event.currentTarget.value}`);
  });

  bindChange("map-upload", (event) => {
    loadMapFile(event.currentTarget);
  });

  bindChange("engine-select", (event) => {
    const value = event.currentTarget.value;
    if (window.state) {
      window.state.physicsEngine = value;
    }
    if (
      window.physicsAdapter &&
      typeof window.physicsAdapter.reinitialize === "function"
    ) {
      window.physicsAdapter.reinitialize();
    }
    track("change", "Settings", `EngineSelect:${value}`);
  });

  bindClick("lang-th", () => {
    if (window.i18n && typeof window.i18n.setLanguage === "function") {
      window.i18n.setLanguage("th");
    }
  });

  bindClick("lang-en", () => {
    if (window.i18n && typeof window.i18n.setLanguage === "function") {
      window.i18n.setLanguage("en");
    }
  });

  bindClick("tour-btn", () => {
    startTour();
    track("click", "Toolbar", "Tour");
  });

  bindClick("tab-btn-code", () => {
    switchTab("code");
  });

  bindClick("tab-btn-settings", () => {
    switchTab("settings");
  });

  bindClick("console-clear-btn", () => {
    clearConsole();
    track("click", "Console", "Clear");
  });

  bindClick("button1", () => {
    track("click", "Input", "SW1");
  });

  bindClick("button2", () => {
    track("click", "Input", "SW2");
  });

  bindClick("button3", () => {
    track("click", "Input", "SW3");
  });

  bindClick("menu-zoom-in", () => {
    zoomIn();
  });

  bindClick("menu-zoom-out", () => {
    zoomOut();
  });

  bindClick("menu-drag-mode", () => {
    toggleDragMode();
  });

  bindClick("menu-reset-view", () => {
    resetView();
  });

  bindChange("file-input", (event) => {
    loadProject(event.currentTarget);
  });
}
