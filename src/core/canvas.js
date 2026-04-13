import { canvasArea, state } from "./index.js";
import { fitCanvasToViewport, resetView } from "../ui/interaction-handler.js";
import { logToConsole } from "../ui/ui-manager.js";

function t(key, fallback) {
  if (window.i18n && typeof window.i18n.t === "function") {
    const value = window.i18n.t(key);
    if (value && value !== key) {
      return value;
    }
  }
  return fallback;
}

function refreshSensorDots() {
  if (typeof window.updateSensorDots === "function") {
    window.updateSensorDots();
  }
}

export function updateCanvasTransform() {
  if (!canvasArea) return;
  canvasArea.style.transformOrigin = "0 0";
  canvasArea.style.transform = `translate(${state.cameraX}px, ${state.cameraY}px) scale(${state.zoom})`;
}

export function updateCanvasImageData() {
  const canvas = document.createElement("canvas");
  canvas.width = canvasArea.offsetWidth;
  canvas.height = canvasArea.offsetHeight;
  const ctx = canvas.getContext("2d");

  const bgColor = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-color");
  ctx.fillStyle = bgColor || "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bgImage = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-image");

  const setPixelData = () => {
    state.canvasPixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    refreshSensorDots();
  };

  if (bgImage && bgImage !== "none") {
    try {
      const imageUrl = bgImage.match(/url\(["']?(.+?)["']?\)/)[1];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPixelData();
        logToConsole("Canvas image data updated.", "info");
      };
      img.onerror = () => {
        logToConsole("Failed to load background image, using default.", "info");
        setPixelData();
      };
      img.src = imageUrl;
    } catch (error) {
      logToConsole("Error parsing background image URL.", "info");
      setPixelData();
    }
    return;
  }

  setPixelData();
  logToConsole("Using default canvas background.", "info");
}

export function updateCanvasSize() {
  if (!canvasArea) return;

  const originalTransition = canvasArea.style.transition;
  canvasArea.style.transition = "none";

  canvasArea.style.width = document.getElementById("canvas-w").value + "px";
  canvasArea.style.height = document.getElementById("canvas-h").value + "px";

  canvasArea.offsetHeight;

  updateCanvasImageData();
  fitCanvasToViewport();

  setTimeout(() => {
    canvasArea.style.transition = originalTransition;
  }, 0);
}

export function handleMapSelectChange(select) {
  const value = (select && select.value) || "";
  const currentOpt = document.getElementById("current-map-option");
  const fileInput = document.getElementById("map-upload");

  if (value === "upload") {
    if (fileInput) {
      try {
        fileInput.value = "";
      } catch (error) {}
      fileInput.click();
    }
    if (currentOpt && select) {
      select.value = "current";
    }
    return;
  }

  if (value === "default") {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    if (currentOpt) {
      currentOpt.textContent = t("toolbar.no_map", "No map loaded");
      currentOpt.dataset.filename = "";
    }
    updateCanvasImageData();
    if (fileInput) {
      try {
        fileInput.value = "";
      } catch (error) {}
    }
  }
}

export function loadMapFile(input) {
  if (!(input && input.files && input.files[0])) {
    try {
      if (input) input.value = "";
    } catch (error) {}
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    canvasArea.style.backgroundImage = `url('${event.target.result}')`;
    canvasArea.style.backgroundColor = "transparent";
    logToConsole("New map loaded successfully.");

    const img = new Image();
    img.onload = () => {
      const widthInput = document.getElementById("canvas-w");
      const heightInput = document.getElementById("canvas-h");
      if (widthInput && heightInput) {
        widthInput.value = img.naturalWidth;
        heightInput.value = img.naturalHeight;
        updateCanvasSize();
        resetView();
        logToConsole(
          `Canvas resized to ${img.naturalWidth}x${img.naturalHeight} and view reset.`,
          "info",
        );
      }
    };
    img.src = event.target.result;

    const currentOpt = document.getElementById("current-map-option");
    if (currentOpt) {
      currentOpt.textContent = `${t("toolbar.map", "Map")}${file.name ? `: ${file.name}` : ""}`;
      currentOpt.dataset.filename = file.name;
    }

    setTimeout(updateCanvasImageData, 100);

    try {
      input.value = "";
    } catch (error) {}

    const select = document.getElementById("map-select");
    if (select) {
      select.value = "current";
    }
  };

  reader.readAsDataURL(file);
}

window.updateCanvasTransform = updateCanvasTransform;
window.updateCanvasImageData = updateCanvasImageData;
window.updateCanvasSize = updateCanvasSize;
window.handleMapSelectChange = handleMapSelectChange;
window.loadMapFile = loadMapFile;
