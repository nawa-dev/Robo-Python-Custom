/**
 * ROBOT IDE SIMULATOR - Core Script
 * Main initialization and shared rendering logic
 */

// --- 1. Robot DOM Updates ---
function updateRobotDOM() {
  if (typeof robot === "undefined" || !robot) return;
  robot.style.left = state.robotX + "px";
  robot.style.top = state.robotY + "px";
  robot.style.transform = `rotate(${state.angle}deg)`;
  if (typeof updateSensorDots === "function") updateSensorDots();
  syncWheelDOM();
}

function handleMotorPosition(value) {
  updateRobotDOM();
}

function syncWheelDOM() {
  const isVisible = !(
    window.SensorSettings &&
    window.SensorSettings.visibility &&
    window.SensorSettings.visibility.wheel === false
  );
  const wheelSensors = isVisible
    ? state.sensors.filter((s) => s.type === "wheel")
    : [];

  const getSvgX = (offset) => 21 + (parseFloat(offset) || 0);

  const ml = document.getElementById("motor-left");
  const mr = document.getElementById("motor-right");
  if (ml) ml.style.display = isVisible && wheelSensors.length > 0 ? "block" : "none";
  if (mr) mr.style.display = isVisible && wheelSensors.length > 0 ? "block" : "none";

  if (isVisible && wheelSensors.length > 0) {
    const sensor = wheelSensors[0];
    const rawPos = parseFloat(sensor.motorPos) || 0;
    const isOmni = sensor.wheelType === "omni";
    const color = isOmni ? "#888" : "#000";

    robot.style.setProperty("--motorPos", rawPos);

    const wl = robot.querySelector(".w-l");
    const wr = robot.querySelector(".w-r");
    if (wl) {
      wl.style.backgroundColor = color;
      wl.style.display = "block";
    }
    if (wr) {
      wr.style.backgroundColor = color;
      wr.style.display = "block";
    }

    const dPosSvg = getSvgX(rawPos);
    if (ml) {
      ml.setAttribute("x", dPosSvg);
      ml.setAttribute("fill", color);
    }
    if (mr) {
      mr.setAttribute("x", dPosSvg);
      mr.setAttribute("fill", color);
    }
  } else {
    const wl = robot.querySelector(".w-l");
    const wr = robot.querySelector(".w-r");
    if (wl) wl.style.display = "none";
    if (wr) wr.style.display = "none";
  }

  const displayBack = wheelSensors.length > 1 ? "block" : "none";
  const lb = robot.querySelector(".w-l-back");
  const rb = robot.querySelector(".w-r-back");
  if (lb) lb.style.display = displayBack;
  if (rb) rb.style.display = displayBack;

  const mlb = document.getElementById("motor-left-back");
  const mrb = document.getElementById("motor-right-back");
  if (mlb) mlb.style.display = displayBack;
  if (mrb) mrb.style.display = displayBack;

  if (wheelSensors.length > 1) {
    const sensorBack = wheelSensors[1];
    const rawPosBack = parseFloat(sensorBack.motorPos) || 0;
    const isOmniBack = sensorBack.wheelType === "omni";
    const colorBack = isOmniBack ? "#888" : "#000";

    robot.style.setProperty("--motorPosBack", rawPosBack);

    if (lb) lb.style.backgroundColor = colorBack;
    if (rb) rb.style.backgroundColor = colorBack;

    const dPosSvgBack = getSvgX(rawPosBack);
    if (mlb) {
      mlb.setAttribute("x", dPosSvgBack);
      mlb.setAttribute("fill", colorBack);
    }
    if (mrb) {
      mrb.setAttribute("x", dPosSvgBack);
      mrb.setAttribute("fill", colorBack);
    }
  }
}

window.syncWheelDOM = syncWheelDOM;
window.updateRobotDOM = updateRobotDOM;

// --- 2. Initial System Start ---
updatePhysics();
updateCanvasSize();
setTimeout(() => {
  updateCanvasImageData();
  if (typeof logToConsole === "function") logToConsole("System initialized.", "info");
}, 100);

// --- 3. Canvas Renderer (Optional/Alternate) ---
let canvasRenderer = null;
let trackBufferCanvas = null;
let trackBufferCtx = null;

function initCanvasRenderer() {
  const canvasArea = document.getElementById("canvas-area");
  if (!canvasArea) return;

  canvasRenderer = document.createElement("canvas");
  canvasRenderer.id = "main-render-canvas";
  canvasRenderer.width = canvasArea.offsetWidth;
  canvasRenderer.height = canvasArea.offsetHeight;
  canvasRenderer.style.position = "absolute";
  canvasRenderer.style.top = "0";
  canvasRenderer.style.left = "0";
  canvasRenderer.style.zIndex = "5";
  canvasRenderer.style.cursor = "crosshair";

  trackBufferCanvas = document.createElement("canvas");
  trackBufferCanvas.width = canvasRenderer.width;
  trackBufferCanvas.height = canvasRenderer.height;
  trackBufferCtx = trackBufferCanvas.getContext("2d");

  canvasArea.style.position = "relative";
  canvasArea.insertBefore(canvasRenderer, canvasArea.firstChild);

  if (typeof logToConsole === "function") logToConsole("Canvas 2D renderer initialized.", "info");
}

function renderCanvasFrame() {
  if (!canvasRenderer) return;

  const ctx = canvasRenderer.getContext("2d");
  const w = canvasRenderer.width;
  const h = canvasRenderer.height;

  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, w, h);

  if (typeof currentMapImage !== "undefined" && currentMapImage) {
    ctx.drawImage(currentMapImage, 0, 0, w, h);
  }

  const robotSize = 25;
  ctx.fillStyle = "#2d3436";
  ctx.beginPath();
  ctx.arc(state.robotX + 25, state.robotY + 25, robotSize, 0, Math.PI * 2);
  ctx.fill();

  const rad = (state.angle * Math.PI) / 180;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(state.robotX + 25, state.robotY + 25);
  ctx.lineTo(
    state.robotX + 25 + Math.cos(rad) * robotSize,
    state.robotY + 25 + Math.sin(rad) * robotSize,
  );
  ctx.stroke();

  ctx.fillStyle = "rgba(100,200,255,0.6)";
  state.sensors.forEach((s) => {
    const localX = s.x - 25;
    const localY = s.y - 25;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    ctx.beginPath();
    ctx.arc(state.robotX + 25 + rotatedX, state.robotY + 25 + rotatedY, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}
