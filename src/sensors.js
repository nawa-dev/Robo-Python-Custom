/**
 * Sensor Management System
 */

// --- Tab Switching ---
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((el) => {
    el.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`tab-${tabId}`).classList.add("active");
  document.getElementById(`tab-btn-${tabId}`).classList.add("active");

  if (tabId === "settings") {
    updateSensorPreview();
    renderSensorsList();
  } else if (tabId === "code") {
    if (typeof editor !== "undefined" && editor !== null) {
      setTimeout(() => {
        editor.layout();
      }, 0);
    }
  }
}

// --- Select Device in settings tab ---
let currentDevice = "light";

function selectDevice(type) {
  currentDevice = type;

  ["wheel", "ultrasonic", "light", "grip"].forEach((t) => {
    const panel = document.getElementById(`panel-${t}`);
    if (panel) panel.style.display = t === type ? "flex" : "none";
  });

  ["wheel", "ultrasonic", "light", "grip"].forEach((t) => {
    const btn = document.getElementById(`dev-btn-${t}`);
    if (btn) btn.classList.toggle("active", t === type);
  });

  renderSensorsList();
}

// --- Add sensor ---
function addSensorToList(type = "light") {
  if (sensors.length >= MAX_SENSORS) {
    logToConsole(`Maximum sensors (${MAX_SENSORS}) reached!`, "error");
    return;
  }

  const id = Date.now();
  const count = sensors.filter((s) => s.type === type).length + 1;
  const name = type === "light" ? `Light ${count}` : `Ultra ${count}`;

  sensors.push({
    id,
    type,
    x: 45,
    y: 25,
    angle: 0,
    color: "#000000",
    name,
    isNew: true,
  });

  updateSensorPreview();
  renderSensorsList();
  updateSensorDots();
  logToConsole(`New ${type} sensor added.`, "info");
}

// --- Delete sensor ---
function deleteSensor(id) {
  sensors = sensors.filter((s) => s.id !== id);
  updateSensorPreview();
  renderSensorsList();
  updateSensorDots();
  logToConsole("Sensor deleted.", "info");
}

// --- Update sensor value ---
function updateSensorValue(id, axis, value) {
  const sensor = sensors.find((s) => s.id === id);
  if (!sensor) return;

  const numValue = parseFloat(value);

  if (
    (axis === "x" || axis === "y") &&
    (isNaN(numValue) || numValue < 0 || numValue > 50)
  ) {
    logToConsole(`Position must be between 0 and 50!`, "error");
    document.getElementById(`sensor-${id}-${axis}`).value = sensor[axis];
    return;
  }

  if (
    axis === "angle" &&
    (isNaN(numValue) || numValue < -180 || numValue > 180)
  ) {
    logToConsole(`Angle must be between -180 and 180!`, "error");
    document.getElementById(`sensor-${id}-angle`).value = sensor.angle;
    return;
  }

  if (axis === "x") sensor.x = numValue;
  else if (axis === "y") sensor.y = numValue;
  else if (axis === "angle") {
    if (!isNaN(numValue)) sensor.angle = numValue;
  } else if (axis === "color") sensor.color = value;

  sensor.isNew = false;
  updateSensorPreview();
  updateSensorDots();
  logToConsole(
    `Sensor ${sensor.name} updated to (${sensor.x.toFixed(1)}, ${sensor.y.toFixed(1)}${sensor.angle !== undefined ? ", " + sensor.angle + "°" : ""})`,
    "info",
  );
}

// =============================================
// GRIP SYSTEM
// =============================================

let showGripPreview = true;

function toggleGripPreview(checked) {
  showGripPreview = checked;
  updateSensorPreview();
  if (typeof updateSensorDots === "function") updateSensorDots();
}

function addGrip() {
  if (grips.length >= MAX_GRIPS) {
    logToConsole(`Maximum grips (${MAX_GRIPS}) reached!`, "error");
    return;
  }

  const id = Date.now();
  const count = grips.length + 1;

  grips.push({
    id,
    name: `Grip ${count}`,
    x: 45,
    y: 25,
    angle: 0,
  });

  updateSensorPreview();
  renderGripsList();
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole(`Grip ${count} added.`, "info");
}

function deleteGrip(id) {
  grips = grips.filter((g) => g.id !== id);
  updateSensorPreview();
  renderGripsList();
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole("Grip deleted.", "info");
}

function updateGripValue(id, axis, value) {
  const grip = grips.find((g) => g.id === id);
  if (!grip) return;

  const numValue = parseFloat(value);

  if (
    (axis === "x" || axis === "y") &&
    (isNaN(numValue) || numValue < -25 || numValue > 75)
  ) {
    logToConsole(`Grip position must be between -25 and 75!`, "error");
    const el = document.getElementById(`grip-${id}-${axis}`);
    if (el) el.value = grip[axis];
    return;
  }

  if (
    axis === "angle" &&
    (isNaN(numValue) || numValue < -180 || numValue > 180)
  ) {
    logToConsole(`Grip angle must be between -180 and 180!`, "error");
    const el = document.getElementById(`grip-${id}-angle`);
    if (el) el.value = grip.angle;
    return;
  }

  grip[axis] = numValue;
  updateSensorPreview();
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole(`${grip.name} updated: ${axis}=${numValue}`, "info");
}

function renderGripsList() {
  const container = document.getElementById("list-grip");
  if (!container) return;

  const countLabel = document.getElementById("grip-count-label");
  if (countLabel) countLabel.textContent = `(${grips.length}/${MAX_GRIPS})`;

  const addBtn = document.querySelector(".btn-panel-add-grip");
  if (addBtn) addBtn.disabled = grips.length >= MAX_GRIPS;

  if (grips.length === 0) {
    container.innerHTML = `<div class="panel-empty-message">No grip added. Click ADD to start. (Max ${MAX_GRIPS})</div>`;
    return;
  }

  container.innerHTML = grips
    .map(
      (grip, index) => `
    <div class="sensor-panel-item grip-panel-item">
      <div class="sensor-panel-item-info">
        <span class="sensor-panel-item-name grip-name">GRIP ${index + 1}</span>
        <label>X:</label>
        <input type="number" id="grip-${grip.id}-x"
          min="-25" max="75" value="${grip.x}"
          onchange="updateGripValue(${grip.id}, 'x', this.value)"
          onclick="event.stopPropagation()" />
        <label>Y:</label>
        <input type="number" id="grip-${grip.id}-y"
          min="-25" max="75" value="${grip.y}"
          onchange="updateGripValue(${grip.id}, 'y', this.value)"
          onclick="event.stopPropagation()" />
        <label>&#x2220;:</label>
        <input type="number" id="grip-${grip.id}-angle"
          min="-180" max="180" value="${grip.angle}"
          onchange="updateGripValue(${grip.id}, 'angle', this.value)"
          onclick="event.stopPropagation()" title="Facing angle (degrees)" />
      </div>
      <button class="btn-panel-delete" onclick="deleteGrip(${grip.id})">DELETE</button>
    </div>
  `,
    )
    .join("");
}

// =============================================
// SENSOR PREVIEW (sensors + grips)
// =============================================

function updateSensorPreview() {
  const svg = document.getElementById("preview-svg");
  if (!svg) return;

  // Clear previous sensor circles and grip elements
  svg.querySelectorAll(".sensor-circle").forEach((el) => el.remove());
  svg.querySelectorAll(".grip-preview-el").forEach((el) => el.remove());

  // Draw sensors
  sensors.forEach((sensor) => {
    if (sensor.type === "ultrasonic") {
      const rad = ((sensor.angle || 0) * Math.PI) / 180;
      const lineLen = 15;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", sensor.x);
      line.setAttribute("y1", sensor.y);
      line.setAttribute("x2", sensor.x + Math.cos(rad) * lineLen);
      line.setAttribute("y2", sensor.y + Math.sin(rad) * lineLen);
      line.setAttribute("stroke", "rgba(9, 132, 227, 0.7)");
      line.setAttribute("stroke-width", "1");
      line.setAttribute("class", "sensor-circle");
      svg.appendChild(line);
    }

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("class", "sensor-circle");
    circle.setAttribute("cx", sensor.x);
    circle.setAttribute("cy", sensor.y);
    circle.setAttribute("r", "2");
    if (sensor.type === "ultrasonic") {
      circle.setAttribute("fill", "#0984e3");
    }
    svg.appendChild(circle);
  });

  // Draw grips
  if (showGripPreview) {
    grips.forEach((grip) => {
      const rad = (grip.angle * Math.PI) / 180;
      const armLen = 10;
      const tipX = grip.x + Math.cos(rad) * armLen;
      const tipY = grip.y + Math.sin(rad) * armLen;

      // Arm
      const arm = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      arm.setAttribute("x1", grip.x);
      arm.setAttribute("y1", grip.y);
      arm.setAttribute("x2", tipX);
      arm.setAttribute("y2", tipY);
      arm.setAttribute("stroke", "#f39c12");
      arm.setAttribute("stroke-width", "2");
      arm.setAttribute("class", "grip-preview-el");
      svg.appendChild(arm);

      // Left jaw
      const jawLen = 5;
      const jL = rad + 0.5;
      const jawL = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      jawL.setAttribute("x1", tipX);
      jawL.setAttribute("y1", tipY);
      jawL.setAttribute("x2", tipX + Math.cos(jL) * jawLen);
      jawL.setAttribute("y2", tipY + Math.sin(jL) * jawLen);
      jawL.setAttribute("stroke", "#f39c12");
      jawL.setAttribute("stroke-width", "1.5");
      jawL.setAttribute("class", "grip-preview-el");
      svg.appendChild(jawL);

      // Right jaw
      const jR = rad - 0.5;
      const jawR = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      jawR.setAttribute("x1", tipX);
      jawR.setAttribute("y1", tipY);
      jawR.setAttribute("x2", tipX + Math.cos(jR) * jawLen);
      jawR.setAttribute("y2", tipY + Math.sin(jR) * jawLen);
      jawR.setAttribute("stroke", "#f39c12");
      jawR.setAttribute("stroke-width", "1.5");
      jawR.setAttribute("class", "grip-preview-el");
      svg.appendChild(jawR);

      // Base dot
      const dot = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      dot.setAttribute("cx", grip.x);
      dot.setAttribute("cy", grip.y);
      dot.setAttribute("r", "2.5");
      dot.setAttribute("fill", "#e67e22");
      dot.setAttribute("class", "grip-preview-el");
      svg.appendChild(dot);
    });
  }
}

// --- Render all sensor panels ---
function renderSensorsList() {
  renderSensorPanel("light", "list-light");
  renderSensorPanel("ultrasonic", "list-ultrasonic");
  renderGripsList();

  const addBtns = document.querySelectorAll(
    ".btn-panel-add:not(.btn-panel-add-grip)",
  );
  addBtns.forEach((btn) => {
    btn.disabled = sensors.length >= MAX_SENSORS;
  });
}

function renderSensorPanel(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = sensors.filter((s) => s.type === type);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="panel-empty-message">No ${type} sensor added. Click ADD to start.</div>`;
    return;
  }

  container.innerHTML = filtered
    .map((sensor, index) => {
      const extraInputs =
        sensor.type === "ultrasonic"
          ? `
      <label>&#x2220;:</label>
      <input type="number" id="sensor-${sensor.id}-angle"
        min="-180" max="180" value="${sensor.angle || 0}"
        onchange="updateSensorValue(${sensor.id}, 'angle', this.value)"
        onclick="event.stopPropagation()" title="Angle" />
      <label>Color:</label>
      <input type="color" id="sensor-${sensor.id}-color"
        value="${sensor.color || "#000000"}"
        onchange="updateSensorValue(${sensor.id}, 'color', this.value)"
        onclick="event.stopPropagation()" title="Detect Color" />
    `
          : "";

      return `
    <div class="sensor-panel-item">
      <div class="sensor-panel-item-info">
        <span class="sensor-panel-item-name">${type.toUpperCase()} ${index}</span>
        <label>X:</label>
        <input type="number" id="sensor-${sensor.id}-x"
          min="0" max="50" value="${sensor.x}"
          onchange="updateSensorValue(${sensor.id}, 'x', this.value)"
          onclick="event.stopPropagation()" />
        <label>Y:</label>
        <input type="number" id="sensor-${sensor.id}-y"
          min="0" max="50" value="${sensor.y}"
          onchange="updateSensorValue(${sensor.id}, 'y', this.value)"
          onclick="event.stopPropagation()" />
        ${extraInputs}
      </div>
      <button class="btn-panel-delete" onclick="deleteSensor(${sensor.id})">DELETE</button>
    </div>`;
    })
    .join("");
}

// --- Settings top-row vertical resizer ---
document.addEventListener("DOMContentLoaded", () => {
  const resizer = document.getElementById("settings-v-resizer");
  if (!resizer) return;

  const topRow = resizer.parentElement;

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    resizer.classList.add("dragging");

    const startX = e.clientX;
    const previewBox = topRow.querySelector(".settings-preview-box");
    const startWidth = previewBox.getBoundingClientRect().width;

    function onMove(e) {
      const delta = e.clientX - startX;
      const newWidth = Math.max(
        80,
        Math.min(startWidth + delta, topRow.offsetWidth - 80),
      );
      previewBox.style.width = newWidth + "px";
      previewBox.style.flex = "none";
    }

    function onUp() {
      resizer.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
});
