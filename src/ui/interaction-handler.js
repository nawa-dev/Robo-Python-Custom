import { canvasArea, robot, state } from "../core/index.js";
import { logToConsole } from "./ui-manager.js";

function updateCanvas() {
  if (typeof window.updateCanvasTransform === "function") {
    window.updateCanvasTransform();
  }
}

function syncMatterState() {
  if (typeof window.syncStateToMatter === "function") {
    window.syncStateToMatter();
  }
}

function updateRobotView() {
  if (typeof window.updateRobotDOM === "function") {
    window.updateRobotDOM();
  }
}

function updateSensorDotsView() {
  if (typeof window.updateSensorDots === "function") {
    window.updateSensorDots();
  }
}

function updateObjectsView() {
  if (typeof window.updateObjectsDOM === "function") {
    window.updateObjectsDOM();
  }
}

function screenToCanvas(clientX, clientY) {
  if (!canvasArea) {
    return { x: 0, y: 0 };
  }
  const rect = canvasArea.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / state.zoom,
    y: (clientY - rect.top) / state.zoom,
  };
}

let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

export function zoomIn() {
  const oldZoom = state.zoom;
  state.zoom = Math.min(state.zoom * 1.2, 10);
  const viewport = document.getElementById("canvas-viewport");
  if (viewport) {
    const mx = viewport.offsetWidth / 2;
    const my = viewport.offsetHeight / 2;
    state.cameraX = mx - (mx - state.cameraX) * (state.zoom / oldZoom);
    state.cameraY = my - (my - state.cameraY) * (state.zoom / oldZoom);
  }
  updateCanvas();
}

export function zoomOut() {
  const oldZoom = state.zoom;
  state.zoom = Math.max(state.zoom / 1.2, 0.1);
  const viewport = document.getElementById("canvas-viewport");
  if (viewport) {
    const mx = viewport.offsetWidth / 2;
    const my = viewport.offsetHeight / 2;
    state.cameraX = mx - (mx - state.cameraX) * (state.zoom / oldZoom);
    state.cameraY = my - (my - state.cameraY) * (state.zoom / oldZoom);
  }
  updateCanvas();
}

export function fitCanvasToViewport() {
  const viewport = document.getElementById("canvas-viewport");
  if (!viewport || !canvasArea) {
    return;
  }

  const vw = viewport.offsetWidth;
  const vh = viewport.offsetHeight;
  const cw = canvasArea.offsetWidth;
  const ch = canvasArea.offsetHeight;

  if (cw === 0 || ch === 0) {
    return;
  }

  const padding = 20;
  const availableW = vw - padding * 2;
  const availableH = vh - padding * 2;
  const zoomX = availableW / cw;
  const zoomY = availableH / ch;

  state.zoom = Math.min(zoomX, zoomY, 1.0);
  state.cameraX = (vw - cw * state.zoom) / 2;
  state.cameraY = (vh - ch * state.zoom) / 2;

  updateCanvas();
}

export function resetView() {
  fitCanvasToViewport();
}

export function toggleDragMode() {
  state.dragMode = !state.dragMode;

  const menuBtn = document.getElementById("menu-drag-mode");
  if (menuBtn) {
    menuBtn.classList.toggle("active", state.dragMode);
  }

  if (canvasArea) {
    canvasArea.style.cursor = state.dragMode ? "grab" : "";
  }
}

export function handleAngleInput(value) {
  if (state.isRunning) {
    logToConsole(window.i18n.t("interaction.canvas.running_error"), "error");
    return;
  }

  let newAngle = parseFloat(value);
  if (Number.isNaN(newAngle)) {
    return;
  }

  newAngle = ((newAngle % 360) + 360) % 360;
  state.angle = newAngle;
  updateRobotView();
  syncMatterState();

  const msg = window.i18n.t("interaction.robot.angle_set").replace("{angle}", Math.round(state.angle));
  logToConsole(msg, "info");
}

export function rotateRobot(delta) {
  if (state.isRunning) {
    logToConsole(window.i18n.t("interaction.canvas.running_error"), "error");
    return;
  }

  let newAngle;
  if (delta > 0) {
    newAngle = (Math.floor(state.angle / 45) + 1) * 45;
  } else {
    newAngle = (Math.ceil(state.angle / 45) - 1) * 45;
  }

  newAngle = ((newAngle % 360) + 360) % 360;
  state.angle = newAngle;
  updateRobotView();
  syncMatterState();

  const msg = window.i18n.t("interaction.robot.rotated").replace("{angle}", Math.round(state.angle));
  logToConsole(msg, "info");
}

export function updateRobotAngle(value) {
  if (state.isRunning) {
    logToConsole(window.i18n.t("interaction.canvas.running_error"), "error");
    return;
  }

  state.angle = parseFloat(value);
  updateRobotView();
  syncMatterState();
}

let draggingObjectFromPalette = null;
let draggingObjectOnCanvas = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

if (canvasArea) {
  canvasArea.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) {
        return;
      }

      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.1, delta / 100);
      const oldZoom = state.zoom;
      const newZoom = Math.min(Math.max(oldZoom * zoomFactor, 0.1), 10);

      if (newZoom !== oldZoom) {
        const viewport = document.getElementById("canvas-viewport");
        const viewportRect = viewport
          ? viewport.getBoundingClientRect()
          : canvasArea.parentElement.getBoundingClientRect();

        const mx = e.clientX - viewportRect.left;
        const my = e.clientY - viewportRect.top;

        state.cameraX = mx - (mx - state.cameraX) * (newZoom / oldZoom);
        state.cameraY = my - (my - state.cameraY) * (newZoom / oldZoom);
        state.zoom = newZoom;
        updateCanvas();
      }
    },
    { passive: false },
  );

  canvasArea.addEventListener("contextmenu", (e) => e.preventDefault());

  canvasArea.addEventListener("mousedown", (e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && state.dragMode)) {
      isPanning = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      canvasArea.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
    }
  });

  canvasArea.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvasArea.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggingObjectFromPalette) {
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);

    const newObj = {
      id: `obj_${Date.now()}`,
      x,
      y,
      radius: 15,
      color: draggingObjectFromPalette.color,
      vx: 0,
      vy: 0,
    };
    state.canvasObjects.push(newObj);

    const msg = window.i18n.t("interaction.object.placed")
      .replace("{x}", x)
      .replace("{y}", y);
    logToConsole(msg, "info");

    draggingObjectFromPalette = null;
    updateObjectsView();
    updateSensorDotsView();
  });
}

if (robot) {
  robot.addEventListener("mousedown", () => {
    state.isDragging = true;
  });
}

window.addEventListener("mouseup", (e) => {
  if (e.button === 1 || e.button === 2 || (e.button === 0 && state.dragMode)) {
    isPanning = false;
    if (canvasArea) {
      canvasArea.style.cursor = state.dragMode ? "grab" : "";
    }
  }

  state.isDragging = false;

  if (draggingObjectOnCanvas) {
    if (!canvasArea) {
      return;
    }
    const rect = canvasArea.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      state.canvasObjects = state.canvasObjects.filter(
        (obj) => obj.id !== draggingObjectOnCanvas.id,
      );
      logToConsole(window.i18n.t("interaction.object.deleted"), "info");
    } else {
      const msg = window.i18n.t("interaction.object.moved")
        .replace("{x}", draggingObjectOnCanvas.x)
        .replace("{y}", draggingObjectOnCanvas.y);
      logToConsole(msg, "info");
    }

    draggingObjectOnCanvas = null;
    updateObjectsView();
    updateSensorDotsView();
  }
});

window.addEventListener("mousemove", (e) => {
  if (isPanning) {
    const dx = e.clientX - lastPanX;
    const dy = e.clientY - lastPanY;
    state.cameraX += dx;
    state.cameraY += dy;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    updateCanvas();
  }

  if (!state.isDragging || !canvasArea) {
    return;
  }

  const pos = screenToCanvas(e.clientX, e.clientY);
  const halfWidth = state.robotWidth / 2;
  const halfHeight = state.robotHeight / 2;
  const minX = halfWidth;
  const minY = halfHeight;
  const maxX = canvasArea.offsetWidth - halfWidth;
  const maxY = canvasArea.offsetHeight - halfHeight;

  state.robotX = Math.max(minX, Math.min(pos.x, maxX));
  state.robotY = Math.max(minY, Math.min(pos.y, maxY));

  updateRobotView();
  syncMatterState();
});

window.addEventListener("mousemove", (e) => {
  if (!draggingObjectOnCanvas || !canvasArea) {
    return;
  }

  const pos = screenToCanvas(e.clientX, e.clientY);
  draggingObjectOnCanvas.x = Math.round(pos.x - dragOffsetX);
  draggingObjectOnCanvas.y = Math.round(pos.y - dragOffsetY);
  draggingObjectOnCanvas.vx = 0;
  draggingObjectOnCanvas.vy = 0;

  updateObjectsView();
  updateSensorDotsView();
  syncMatterState();
});

document.querySelectorAll(".draggable-obj").forEach((obj) => {
  obj.addEventListener("dragstart", (e) => {
    draggingObjectFromPalette = {
      color: e.target.dataset.color,
    };
  });
});

export function updateObjectsDOM() {
  const existingElements = document.querySelectorAll(".canvas-object-item");
  existingElements.forEach((element) => {
    const id = element.dataset.id;
    if (!state.canvasObjects.find((obj) => obj.id === id)) {
      element.remove();
    }
  });

  state.canvasObjects.forEach((obj) => {
    let element = document.querySelector(`.canvas-object-item[data-id="${obj.id}"]`);
    if (!element) {
      element = document.createElement("div");
      element.className = "canvas-object-item";
      element.dataset.id = obj.id;
      element.style.backgroundColor = obj.color;

      element.addEventListener("mousedown", (e) => {
        if (obj.isGrabbed) {
          return;
        }
        draggingObjectOnCanvas = obj;
        const rect = element.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left - rect.width / 2;
        dragOffsetY = e.clientY - rect.top - rect.height / 2;
        e.stopPropagation();
      });

      if (canvasArea) {
        canvasArea.appendChild(element);
      }
    }

    element.style.left = `${obj.x - 15}px`;
    element.style.top = `${obj.y - 15}px`;
  });
}

window.fitCanvasToViewport = fitCanvasToViewport;
window.resetView = resetView;
window.handleAngleInput = handleAngleInput;
window.updateRobotAngle = updateRobotAngle;
window.updateObjectsDOM = updateObjectsDOM;
