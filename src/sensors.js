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

    // Add button logic
    let addBtnHtml = "";
    if (config.maxLimit > 1) {
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

    // Special components like Wheel that don't use 'add' logic might have custom logic here.
    // For wheel, we inject the template directly if maxLimit is 1 and it has no array items
    if (config.maxLimit === 1) {
      document.getElementById(`list-${type}`).innerHTML =
        window.SensorTemplates[type] || "";
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
        (config.targetArray === "grips" && s.type !== "light" && s.type !== "ultrasonic"),
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
        (config.targetArray === "grips" && s.type !== "light" && s.type !== "ultrasonic"),
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
  let isGrip = (config.targetArray === "grips" || grips.some((g) => g.id === id));
  if (isGrip) {
    grips = grips.filter((g) => g.id !== id);
    renderDynamicSensorsList(typeVal || "grip");
  } else {
    const s = sensors.find((s) => s.id === id);
    if (s) {
      const type = s.type;
      sensors = sensors.filter((s) => s.id !== id);
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
  const sensor = targetArray.find((s) => s.id === id);
  if (!sensor) return;

  const numValue = parseFloat(value);
  const inputConfig = config.inputs
    ? config.inputs.find((i) => i.id === axis)
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

  if (config.maxLimit === 1) return; // Singles are statically rendered in the container

  const targetArray =
    config.targetArray === "grips" ? grips : sensors.filter((s) => s.type === type);
  const countLabel = document.getElementById(`count-label-${type}`);
  const addBtn = document.getElementById(`btn-add-${type}`);

  if (countLabel)
    countLabel.textContent = `(${targetArray.length}/${config.maxLimit})`;
  if (addBtn) addBtn.disabled = targetArray.length >= config.maxLimit;

  if (targetArray.length === 0) {
    container.innerHTML = `<div class="panel-empty-message">No ${config.name} added. Click ADD to start. (Max ${config.maxLimit})</div>`;
    return;
  }

  const templateStr = window.SensorTemplates[type] || "";

  container.innerHTML = targetArray
    .map((sensor, index) => {
      // Replace variables in template
      let html = templateStr;
      html = html.replace(/{id}/g, sensor.id);
      html = html.replace(/{INDEX}/g, index + 1);
      html = html.replace(/{NAME}/g, config.name.toUpperCase());
      html = html.replace(/{TYPE}/g, type);

      // Replace values dynamically
      if (config.inputs) {
        config.inputs.forEach((input) => {
          const val =
            sensor[input.id] !== undefined ? sensor[input.id] : input.default;
          html = html.replace(new RegExp(`{${input.id}}`, "g"), val);
        });
      }
      return html;
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
