/**
 * Interaction Handler - Robot and Object Dragging, Rotation, and Manual Angle Control
 * Includes Zoom and Pan support
 */

// --- Helper: Convert screen coordinates to zoomed/panned canvas coordinates ---
function screenToCanvas(clientX, clientY) {
  if (!canvasArea) return { x: 0, y: 0 };
  const rect = canvasArea.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / state.zoom,
    y: (clientY - rect.top) / state.zoom
  };
}

// --- Zoom Logic (Ctrl + Wheel) ---
if (typeof canvasArea !== "undefined" && canvasArea) {
  canvasArea.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = Math.pow(1.1, delta / 100);
      
      const oldZoom = state.zoom;
      const newZoom = Math.min(Math.max(oldZoom * zoomFactor, 0.1), 10);
      
      if (newZoom !== oldZoom) {
        const viewport = document.getElementById("canvas-viewport");
        const viewportRect = viewport ? viewport.getBoundingClientRect() : canvasArea.parentElement.getBoundingClientRect();
        
        // Mouse position relative to the viewport
        const mx = e.clientX - viewportRect.left;
        const my = e.clientY - viewportRect.top;
        
        // Update camera to keep mouse over the same canvas point
        state.cameraX = mx - (mx - state.cameraX) * (newZoom / oldZoom);
        state.cameraY = my - (my - state.cameraY) * (newZoom / oldZoom);
        state.zoom = newZoom;
        
        if (typeof updateCanvasTransform === "function") updateCanvasTransform();
      }
    }
  }, { passive: false });
}

// --- Panning Logic (Middle Click) ---
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

if (typeof canvasArea !== "undefined" && canvasArea) {
  // Prevent context menu to allow for smooth right-click dragging
  canvasArea.addEventListener("contextmenu", (e) => e.preventDefault());

  canvasArea.addEventListener("mousedown", (e) => {
    // Middle button (1) OR Right button (2) OR Left button (0) if Drag Mode
    if (e.button === 1 || e.button === 2 || (e.button === 0 && state.dragMode)) {
      isPanning = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      canvasArea.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation(); // Prevent robot/object dragging
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
      if (typeof updateCanvasTransform === "function") updateCanvasTransform();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && state.dragMode)) {
      isPanning = false;
      if (canvasArea) canvasArea.style.cursor = state.dragMode ? "grab" : "";
    }
  });
}

window.zoomIn = function() {
  const oldZoom = state.zoom;
  state.zoom = Math.min(state.zoom * 1.2, 10);
  // Zoom towards center of viewport
  const viewport = document.getElementById("canvas-viewport");
  if (viewport) {
    const mx = viewport.offsetWidth / 2;
    const my = viewport.offsetHeight / 2;
    state.cameraX = mx - (mx - state.cameraX) * (state.zoom / oldZoom);
    state.cameraY = my - (my - state.cameraY) * (state.zoom / oldZoom);
  }
  if (typeof updateCanvasTransform === "function") updateCanvasTransform();
};

window.zoomOut = function() {
  const oldZoom = state.zoom;
  state.zoom = Math.max(state.zoom / 1.2, 0.1);
  // Zoom towards center of viewport
  const viewport = document.getElementById("canvas-viewport");
  if (viewport) {
    const mx = viewport.offsetWidth / 2;
    const my = viewport.offsetHeight / 2;
    state.cameraX = mx - (mx - state.cameraX) * (state.zoom / oldZoom);
    state.cameraY = my - (my - state.cameraY) * (state.zoom / oldZoom);
  }
  if (typeof updateCanvasTransform === "function") updateCanvasTransform();
};

window.fitCanvasToViewport = function() {
  const viewport = document.getElementById("canvas-viewport");
  if (!viewport || !canvasArea) return;

  const vw = viewport.offsetWidth;
  const vh = viewport.offsetHeight;
  const cw = canvasArea.offsetWidth;
  const ch = canvasArea.offsetHeight;

  if (cw === 0 || ch === 0) return;

  // Calculate zoom to fit with some padding (90% of viewport)
  const padding = 20;
  const availableW = vw - padding * 2;
  const availableH = vh - padding * 2;
  
  const zoomX = availableW / cw;
  const zoomY = availableH / ch;
  state.zoom = Math.min(zoomX, zoomY, 1.0); // Fit but don't upscale past 1.0x by default
  
  // Center
  state.cameraX = (vw - cw * state.zoom) / 2;
  state.cameraY = (vh - ch * state.zoom) / 2;

  if (typeof updateCanvasTransform === "function") updateCanvasTransform();
};

window.resetView = function() {
  window.fitCanvasToViewport();
};

window.toggleDragMode = function() {
  state.dragMode = !state.dragMode;
  
  // Update dropdown menu item if exists
  const menuBtn = document.getElementById("menu-drag-mode");
  if (menuBtn) {
    menuBtn.classList.toggle("active", state.dragMode);
  }

  if (canvasArea) {
    canvasArea.style.cursor = state.dragMode ? "grab" : "";
  }
};

// --- 1. Robot Dragging ---
if (typeof robot !== "undefined" && robot) {
  robot.addEventListener("mousedown", () => {
    state.isDragging = true;
  });
}

window.addEventListener("mouseup", () => (state.isDragging = false));

window.addEventListener("mousemove", (e) => {
  if (!state.isDragging) return;
  if (!canvasArea) return;
  
  const pos = screenToCanvas(e.clientX, e.clientY);
  let nextX = pos.x - 25;
  let nextY = pos.y - 25;

  const maxX = canvasArea.offsetWidth - 50;
  const maxY = canvasArea.offsetHeight - 50;

  state.robotX = Math.max(0, Math.min(nextX, maxX));
  state.robotY = Math.max(0, Math.min(nextY, maxY));

  if (typeof updateRobotDOM === "function") updateRobotDOM();
});

// --- 2. Robot Rotation and Angle Control ---
window.handleAngleInput = function (value) {
  if (state.isRunning) {
    if (typeof logToConsole === "function") logToConsole("Cannot change angle while program is running!", "error");
    return;
  }

  let newAngle = parseFloat(value);
  if (isNaN(newAngle)) return;

  // Wrap angle between 0-359
  newAngle = ((newAngle % 360) + 360) % 360;

  state.angle = newAngle;
  if (typeof updateRobotDOM === "function") updateRobotDOM();
  if (typeof logToConsole === "function") logToConsole(`Robot angle set to ${Math.round(state.angle)}°`, "info");
};

window.rotateRobot = function (delta) {
  if (state.isRunning) {
    if (typeof logToConsole === "function") logToConsole("Cannot rotate robot while program is running!", "error");
    return;
  }

  // Snap to multiples of 45
  let newAngle;
  if (delta > 0) {
    newAngle = (Math.floor(state.angle / 45) + 1) * 45;
  } else {
    newAngle = (Math.ceil(state.angle / 45) - 1) * 45;
  }

  // Wrap angle between 0-359
  newAngle = ((newAngle % 360) + 360) % 360;

  state.angle = newAngle;
  if (typeof updateRobotDOM === "function") updateRobotDOM();
  if (typeof logToConsole === "function") logToConsole(`Robot rotated to ${Math.round(state.angle)}°`, "info");
};

window.updateRobotAngle = function (value) {
  if (state.isRunning) {
    if (typeof logToConsole === "function") logToConsole("Cannot change angle while program is running!", "error");
    return;
  }
  state.angle = parseFloat(value);
  if (typeof updateRobotDOM === "function") updateRobotDOM();
};

// --- 3. Object Drag & Drop System ---
let draggingObjectFromPalette = null;
let draggingObjectOnCanvas = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// From Palette to Canvas
document.querySelectorAll(".draggable-obj").forEach((obj) => {
  obj.addEventListener("dragstart", (e) => {
    draggingObjectFromPalette = {
      color: e.target.dataset.color,
    };
  });
});

if (typeof canvasArea !== "undefined" && canvasArea) {
    canvasArea.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    canvasArea.addEventListener("drop", (e) => {
      e.preventDefault();
      if (draggingObjectFromPalette) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const x = Math.round(pos.x);
        const y = Math.round(pos.y);

        const newObj = {
          id: "obj_" + Date.now(),
          x: x,
          y: y,
          radius: 15,
          color: draggingObjectFromPalette.color,
          vx: 0,
          vy: 0,
        };
        state.canvasObjects.push(newObj);

        if (typeof logToConsole === "function") logToConsole(`Placed object at (${x}, ${y}) [Drop]`, "info");

        draggingObjectFromPalette = null;
        if (typeof updateObjectsDOM === "function") updateObjectsDOM();
        if (typeof updateSensorDots === "function") updateSensorDots();
      }
    });
}

// Moving on Canvas and Deleting
window.updateObjectsDOM = function () {
  const existingElements = document.querySelectorAll(".canvas-object-item");
  existingElements.forEach((el) => {
    const id = el.dataset.id;
    if (!state.canvasObjects.find((o) => o.id === id)) {
      el.remove();
    }
  });

  state.canvasObjects.forEach((obj) => {
    let el = document.querySelector(`.canvas-object-item[data-id="${obj.id}"]`);
    if (!el) {
      el = document.createElement("div");
      el.className = "canvas-object-item";
      el.dataset.id = obj.id;
      el.style.backgroundColor = obj.color;

      el.addEventListener("mousedown", (e) => {
        if (obj.isGrabbed) return; 
        draggingObjectOnCanvas = obj;
        const rect = el.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left - rect.width / 2;
        dragOffsetY = e.clientY - rect.top - rect.height / 2;
        e.stopPropagation();
      });

      if (typeof canvasArea !== "undefined" && canvasArea) canvasArea.appendChild(el);
    }

    el.style.left = obj.x - 15 + "px";
    el.style.top = obj.y - 15 + "px";
  });
};

window.addEventListener("mousemove", (e) => {
  if (draggingObjectOnCanvas) {
    if (!canvasArea) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    draggingObjectOnCanvas.x = Math.round(pos.x - dragOffsetX);
    draggingObjectOnCanvas.y = Math.round(pos.y - dragOffsetY);
    draggingObjectOnCanvas.vx = 0;
    draggingObjectOnCanvas.vy = 0;

    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    if (typeof updateSensorDots === "function") updateSensorDots();
  }
});

window.addEventListener("mouseup", (e) => {
  if (draggingObjectOnCanvas) {
    if (!canvasArea) return;
    const rect = canvasArea.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      state.canvasObjects = state.canvasObjects.filter(
        (o) => o.id !== draggingObjectOnCanvas.id,
      );
      if (typeof logToConsole === "function") logToConsole("Object deleted.", "info");
    } else {
      if (typeof logToConsole === "function") logToConsole(`Moved object to (${draggingObjectOnCanvas.x}, ${draggingObjectOnCanvas.y})`, "info");
    }

    draggingObjectOnCanvas = null;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    if (typeof updateSensorDots === "function") updateSensorDots();
  }
});
