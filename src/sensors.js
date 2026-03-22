/**
 * Dynamic Sensor Management System
 */

// --- Tab Switching ---
window.switchTab = function (tabId) {
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
    // Render all connected panels to make sure values are sync
    Object.keys(window.SensorConfigs || {}).forEach(renderDynamicSensorsList);
  } else if (tabId === "code") {
    if (typeof editor !== "undefined" && editor !== null) {
      setTimeout(() => editor.layout(), 0);
    }
  }
};

let currentDevice = "light";

window.selectDevice = function (type) {
  currentDevice = type;

  // Hide all panels, show selected
  document.querySelectorAll(".device-panel").forEach((panel) => {
    panel.style.display = panel.id === `panel-${type}` ? "flex" : "none";
  });

  // Toggle active button class
  document.querySelectorAll(".device-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `dev-btn-${type}`);
  });

  renderDynamicSensorsList(type);
};

// Render the device selector buttons and panels based on loaded configs
window.renderSensorTabs = function () {
  const selectorContainer = document.getElementById("dynamic-device-selector");
  const panelsContainer = document.getElementById("dynamic-device-panels");

  if (!selectorContainer || !panelsContainer || !window.SensorConfigs) return;

  // Clear injected content except title
  selectorContainer.innerHTML =
    '<div class="device-selector-title">Devices</div>';
  panelsContainer.innerHTML = "";

  let firstDevice = null;

  Object.keys(window.SensorConfigs).forEach((type) => {
    const config = window.SensorConfigs[type];
    if (config.visible === false) return; // Skip if explicitly hidden

    if (!firstDevice) firstDevice = type;

    // 1. Create Selector Button
    const btn = document.createElement("button");
    btn.id = `dev-btn-${type}`;
    btn.className = "device-btn";
    btn.innerHTML = `<i class="${config.icon || "fas fa-plug"}"></i> ${config.name}`;
    btn.onclick = () => selectDevice(type);
    selectorContainer.appendChild(btn);

    // 2. Create Panel Container
    const panel = document.createElement("div");
    panel.id = `panel-${type}`;
    panel.className = "device-panel";
    panel.style.display = "none";

    // Add button logic — show for all non-singleton sensors
    let addBtnHtml = "";
    if (!config.singleton) {
      addBtnHtml = `<button class="btn-panel-add" id="btn-add-${type}" onclick="addDynamicSensor('${type}')">ADD</button>`;
    }

    panel.innerHTML = `
      <div class="device-panel-header">
        <span>${config.name.toUpperCase()} <span id="count-label-${type}" style="font-weight: 400; font-size: 12px; color: #aaa"></span></span>
        ${addBtnHtml}
      </div>
      <div id="list-${type}" class="device-panel-body sensors-container"></div>
    `;

    panelsContainer.appendChild(panel);

    // If singleton: true, inject auto-generated UI without add/delete flow.
    if (config.singleton === true) {
      let inputsHtml = "";
      if (config.inputs && Array.isArray(config.inputs)) {
        config.inputs.forEach((input) => {
          const key = input.key || input.id;
          const defaultVal = input.default !== undefined ? input.default : "";
          // Singleton values might be stored globally, rely on registry to handle it or use default
          inputsHtml += `
            <div class="sensor-row" style="margin-bottom: 5px;">
              <span style="display:inline-block; width: 100px;">${input.label}</span>
              <input type="${input.type || "number"}" class="sensor-input" 
                     id="singleton-${type}-${key}"
                     min="${input.min !== undefined ? input.min : ""}" 
                     max="${input.max !== undefined ? input.max : ""}" 
                     value="${defaultVal}" 
                     onchange="window.SensorRegistry['${type}'].updateValue('${key}', this.value)" />
            </div>
          `;
        });
      }
      document.getElementById(`list-${type}`).innerHTML = `
        <div class="sensor-panel-item">
          <div class="sensor-panel-item-info">
             ${inputsHtml.length > 0 ? inputsHtml : `<span>${config.name} is active.</span>`}
          </div>
        </div>
      `;
    }
  });

  if (firstDevice) {
    selectDevice(firstDevice);
  }
};

// --- Add sensor ---
window.addDynamicSensor = function (type) {
  const config = window.SensorConfigs[type];
  if (!config || !window.SensorRegistry[type]) return;

  // Decide which array it belongs to (backward compat for storage.js)
  const targetArray = config.targetArray === "grips" ? grips : sensors;

  if (
    targetArray.filter(
      (s) =>
        s.type === type ||
        (config.targetArray === "grips" &&
          s.type !== "light" &&
          s.type !== "ultrasonic"),
    ).length >= config.maxLimit
  ) {
    logToConsole(
      `Maximum ${config.name} (${config.maxLimit}) reached!`,
      "error",
    );
    return;
  }

  const id = Date.now();
  const count =
    targetArray.filter(
      (s) =>
        s.type === type ||
        (config.targetArray === "grips" &&
          s.type !== "light" &&
          s.type !== "ultrasonic"),
    ).length + 1;

  const newSensor = window.SensorRegistry[type].create(id, count);
  targetArray.push(newSensor);

  updateSensorPreview();
  renderDynamicSensorsList(type);
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole(`New ${config.name} added.`, "info");
};

// --- Delete sensor ---
window.deleteSensor = function (id, typeVal) {
  const config = window.SensorConfigs[typeVal] || { targetArray: null };
  let isGrip =
    config.targetArray === "grips" ||
    grips.some((g) => String(g.id) === String(id));
  if (isGrip) {
    grips = grips.filter((g) => String(g.id) !== String(id));
    renderDynamicSensorsList(typeVal || "grip");
  } else {
    const s = sensors.find((s) => String(s.id) === String(id));
    if (s) {
      const type = s.type;
      sensors = sensors.filter((s) => String(s.id) !== String(id));
      renderDynamicSensorsList(type);
    }
  }

  updateSensorPreview();
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole("Sensor deleted.", "info");
};

// --- Update sensor value ---
window.updateSensorValueDOM = function (id, type, axis, value) {
  const config = window.SensorConfigs[type] || {};
  const targetArray = config.targetArray === "grips" ? grips : sensors;
  // Use String coercion: sensor.id may be a Number but the template passes it as a string
  const sensor = targetArray.find((s) => String(s.id) === String(id));
  if (!sensor) return;

  const numValue = parseFloat(value);
  // Support both 'key' (new standard) and legacy 'id' field in config.inputs
  const inputConfig = config.inputs
    ? config.inputs.find((i) => (i.key || i.id) === axis)
    : null;

  if (inputConfig && inputConfig.type === "number") {
    if (
      isNaN(numValue) ||
      numValue < inputConfig.min ||
      numValue > inputConfig.max
    ) {
      logToConsole(
        `Value must be between ${inputConfig.min} and ${inputConfig.max}!`,
        "error",
      );

      // revert DOM
      const inputPrefix = config.targetArray === "grips" ? "grip" : "sensor";
      const inputEl = document.getElementById(`${inputPrefix}-${id}-${axis}`);
      if (inputEl) inputEl.value = sensor[axis];
      return;
    }
    sensor[axis] = numValue;
  } else if (inputConfig && inputConfig.type === "checkbox") {
    // Boolean value from checkbox
    sensor[axis] =
      value === true || value === "true" || value === 1 || value === "1";
  } else {
    sensor[axis] = value;
  }

  sensor.isNew = false;
  updateSensorPreview();
  if (typeof updateSensorDots === "function") updateSensorDots();

  logToConsole(`${config.name} updated: ${axis} = ${value}`, "info");
};
window.updateSensorValue = function (id, axis, value) {
  const s = sensors.find((x) => x.id === id);
  if (s) updateSensorValueDOM(id, s.type, axis, value);
};

// =============================================
// SENSOR PREVIEW (Dynamic Drawing)
// =============================================

window.updateSensorPreview = function () {
  const svg = document.getElementById("preview-svg");
  if (!svg) return;

  // Clear previous sensor elements
  svg.querySelectorAll(".sensor-circle").forEach((el) => el.remove());
  svg.querySelectorAll(".grip-preview-el").forEach((el) => el.remove());

  // Dynamic ViewBox Zoom: Calculate bounding box to fit all sensors + robot
  let minX = 0,
    minY = 0,
    maxX = 50,
    maxY = 50;

  [...sensors, ...grips].forEach((s) => {
    // Basic position
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);

    // Tip position (for grips)
    if (s.armLength) {
      const rad = (s.angle || 0) * (Math.PI / 180);
      const tx = s.x + Math.cos(rad) * s.armLength;
      const ty = s.y + Math.sin(rad) * s.armLength;
      minX = Math.min(minX, tx);
      minY = Math.min(minY, ty);
      maxX = Math.max(maxX, tx);
      maxY = Math.max(maxY, ty);
    }
    // Tip position (for ultrasonic)
    if (s.type === "ultrasonic") {
      const rad = (s.angle || 0) * (Math.PI / 180);
      const tx = s.x + Math.cos(rad) * 15; // static preview ray length
      const ty = s.y + Math.sin(rad) * 15;
      minX = Math.min(minX, tx);
      minY = Math.min(minY, ty);
      maxX = Math.max(maxX, tx);
      maxY = Math.max(maxY, ty);
    }
  });

  const padding = 15;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = maxX - minX + padding * 2;
  const viewBoxH = maxY - minY + padding * 2;

  // Keep it square if possible to maintain aspect ratio, or just let it fit
  svg.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`,
  );

  // Draw sensors dynamically
  sensors.forEach((sensor) => {
    const registry = window.SensorRegistry[sensor.type];
    if (registry && registry.drawPreview) {
      registry.drawPreview(svg, sensor);
    }
  });

  // Draw grips dynamically
  grips.forEach((grip) => {
    const registry = window.SensorRegistry["grip"];
    if (registry && registry.drawPreview) {
      registry.drawPreview(svg, grip);
    }
  });
};

// --- Render dynamic list ---
window.renderDynamicSensorsList = function (type) {
  const container = document.getElementById(`list-${type}`);
  if (!container) return;

  const config = window.SensorConfigs[type];
  if (!config) return;

  if (config.singleton === true) return; // Singleton devices are rendered inline at tab creation

  const targetArray =
    config.targetArray === "grips"
      ? grips
      : sensors.filter((s) => s.type === type);
  const countLabel = document.getElementById(`count-label-${type}`);
  const addBtn = document.getElementById(`btn-add-${type}`);

  if (countLabel)
    countLabel.textContent = `(${targetArray.length}/${config.maxLimit})`;
  if (addBtn) addBtn.disabled = targetArray.length >= config.maxLimit;

  if (targetArray.length === 0) {
    container.innerHTML = `<div class="panel-empty-message">No ${config.name} added. Click ADD to start. (Max ${config.maxLimit})</div>`;
    return;
  }

  // Auto-generate UI dynamically from config.inputs
  container.innerHTML = targetArray
    .map((sensor, index) => {
      let inputsHtml = "";
      if (config.inputs && Array.isArray(config.inputs)) {
        config.inputs.forEach((input) => {
          const key = input.key || input.id;
          const val = sensor[key] !== undefined ? sensor[key] : input.default;
          if (input.type === "checkbox") {
            inputsHtml += `
              <label>${input.label}:</label>
              <input type="checkbox" class="sensor-checkbox" 
                     id="${config.targetArray === "grips" ? "grip" : "sensor"}-${sensor.id}-${key}"
                     ${val ? "checked" : ""} 
                     onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.checked)" 
                     onclick="event.stopPropagation()" />
            `;
          } else {
            inputsHtml += `
              <label>${input.label}:</label>
              <input type="${input.type || "number"}" class="sensor-input" 
                     id="${config.targetArray === "grips" ? "grip" : "sensor"}-${sensor.id}-${key}"
                     min="${input.min !== undefined ? input.min : ""}" 
                     max="${input.max !== undefined ? input.max : ""}" 
                     value="${val}" 
                     onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.value)" 
                     onclick="event.stopPropagation()" />
            `;
          }
        });
      }

      return `
        <div class="sensor-panel-item" id="sensor-item-${type}-${sensor.id}">
          <div class="sensor-panel-item-info">
            <span class="sensor-panel-item-name">${config.name.toUpperCase()} ${index}</span>
            <div style="margin-top: 4px;">
              ${inputsHtml}
            </div>
          </div>
          <button class="btn-panel-delete" onclick="window.deleteSensor('${sensor.id}', '${type}')"><i class="fas fa-trash"></i></button>
        </div>
      `;
    })
    .join("");
};

// Render all compatibility function
window.renderSensorsList = function () {
  if (window.SensorConfigs) {
    Object.keys(window.SensorConfigs).forEach((type) => {
      renderDynamicSensorsList(type);
    });
  }
};

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
