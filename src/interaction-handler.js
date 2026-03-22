/**
 * Interaction Handler - Robot and Object Dragging, Rotation, and Manual Angle Control
 */

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
  
  const rect = canvasArea.getBoundingClientRect();

  let nextX = e.clientX - rect.left - 25;
  let nextY = e.clientY - rect.top - 25;

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
        const rect = canvasArea.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

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
    const rect = canvasArea.getBoundingClientRect();
    draggingObjectOnCanvas.x = Math.round(e.clientX - rect.left - dragOffsetX);
    draggingObjectOnCanvas.y = Math.round(e.clientY - rect.top - dragOffsetY);
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
