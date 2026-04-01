/**
 * Dynamic Sensor Management System
 */

import { getSensorPlugin, state } from "../core/index.js";
import { logToConsole } from "../ui/ui-manager.js";

function getPlugin(type) {
  return getSensorPlugin(type) || window.SensorRegistry[type];
}

function updateSingletonSensorValue(type, key, value) {
  const plugin = getPlugin(type);
  if (plugin && typeof plugin.updateValue === "function") {
    plugin.updateValue(key, value);
  }
}

let currentDevice = "Robot";
window.SensorNextIndices = {};
window.SensorSettings = {
  visibility: {},
};

window.updateSingletonSensorValue = updateSingletonSensorValue;

window.toggleSensorVisibility = function (type, enabled) {
  if (!window.SensorSettings.visibility) window.SensorSettings.visibility = {};
  window.SensorSettings.visibility[type] = enabled;
  if (typeof window.updateSensorDots === "function") window.updateSensorDots();
  if (typeof window.updateSensorPreview === "function") window.updateSensorPreview();
};

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

  window.renderDynamicSensorsList(type);
};

// Render the device selector buttons and panels based on loaded configs
window.renderSensorTabs = function () {
  const selectorContainer = document.getElementById("dynamic-device-selector");
  const panelsContainer = document.getElementById("dynamic-device-panels");

  if (!selectorContainer || !panelsContainer || !window.SensorConfigs) return;

  // Clear injected content except title
  selectorContainer.innerHTML = `<div class="device-selector-title" data-i18n="settings.devices">${window.i18n.t("settings.devices")}</div>`;
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
    const sensorName = window.i18n.t(`sensors.${type}.name`) || config.name;
    btn.innerHTML = `<i class="${config.icon || "fas fa-plug"}"></i> ${sensorName}`;
    btn.onclick = () => window.selectDevice(type);
    selectorContainer.appendChild(btn);

    // 2. Create Panel Container
    const panel = document.createElement("div");
    panel.id = `panel-${type}`;
    panel.className = "device-panel";
    panel.style.display = "none";

    // Add button logic — show for all non-singleton sensors
    let addBtnHtml = "";
    if (!config.singleton) {
      const addText = window.i18n.t("sensors.common.add");
      addBtnHtml = `<button class="btn-panel-add" id="btn-add-${type}" onclick="window.addDynamicSensor('${type}')">${addText}</button>`;
    }

    const displayName = window.i18n.t(`sensors.${type}.name`) || config.name;
    panel.innerHTML = `
      <div class="device-panel-header">
        <span>${displayName.toUpperCase()} <span id="count-label-${type}" style="font-weight: 400; font-size: 12px; color: #aaa"></span></span>
        ${addBtnHtml}
      </div>
      <div id="list-${type}" class="device-panel-body sensors-container"></div>
    `;

    panelsContainer.appendChild(panel);

    // If singleton: true, inject auto-generated UI without add/delete flow.
    if (config.singleton === true) {
      const groups = {};
      if (config.inputs && Array.isArray(config.inputs)) {
        config.inputs.forEach((input) => {
          const groupKey = input.group || "default";
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(input);
        });
      }

      let groupCardsHtml = "";
      Object.keys(groups).forEach((groupKey) => {
        let inputsHtml = "";
        groups[groupKey].forEach((input) => {
          const key = input.key || input.id;
          const defaultVal = input.default !== undefined ? input.default : "";
          const currentVal =
            state && state[key] !== undefined ? state[key] : defaultVal;

          if (input.type === "select") {
            inputsHtml += `
                <div class="sensor-input-wrapper">
                  <label>${window.i18n.t(`sensors.${type}.inputs.${key}`) || input.label}</label>
                  <select class="sensor-input" 
                         id="singleton-${type}-${key}"
                         onchange="window.updateSingletonSensorValue('${type}', '${key}', this.value)">
                    ${(input.options || []).map((opt) => `<option value="${opt.value}" ${opt.value == currentVal ? "selected" : ""}>${window.i18n.t(`sensors.${type}.inputs.${opt.value}`) || opt.label}</option>`).join("")}
                  </select>
                </div>
              `;
          } else if (input.type === "image-upload") {
            inputsHtml += `
                <div class="sensor-input-wrapper" style="grid-column: span 2;">
                  <label>${window.i18n.t(`sensors.${type}.inputs.${key}`) || input.label}</label>
                    <div class="image-upload-controls" style="display: flex; gap: 10px; align-items: center;">
                      <input type="file" accept="image/*" style="display:none" id="file-${type}-${key}" 
                             onchange="if(this.files[0] && this.files[0].size > 512 * 1024) { alert(window.i18n.t('sensors.common.max_reached').replace('{name}', 'File').replace('{limit}', '512KB') || 'File too large (max 512KB)'); return; } const r=new FileReader(); r.onload=(e)=>window.updateSingletonSensorValue('${type}', '${key}', e.target.result); if(this.files[0]) r.readAsDataURL(this.files[0])" />
                      <button class="btn btn-secondary" onclick="document.getElementById('file-${type}-${key}').click()" title="Upload">
                        <i class="fas fa-upload"></i>
                      </button>
                      <div id="wrapper-${type}-${key}" class="image-preview-wrapper" style="display: ${currentVal ? "inline-block" : "none"};">
                        <div id="preview-${type}-${key}" class="image-preview-box" style="background-image: ${currentVal ? `url('${currentVal}')` : "none"}"></div>
                        <button class="btn btn-danger btn-badge-delete" 
                                onclick="window.updateSingletonSensorValue('${type}', '${key}', '')" 
                                title="Remove">
                          <i class="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                </div>
              `;
          } else {
            inputsHtml += `
                <div class="sensor-input-wrapper">
                  <label>${window.i18n.t(`sensors.${type}.inputs.${key}`) || input.label}</label>
                  <input type="${input.type || "number"}" class="sensor-input" 
                         id="singleton-${type}-${key}"
                         ${input.type === "checkbox" ? (currentVal ? "checked" : "") : `value="${currentVal}"`}
                         min="${input.min !== undefined ? input.min : ""}" 
                         max="${input.max !== undefined ? input.max : ""}" 
                         onchange="window.updateSingletonSensorValue('${type}', '${key}', this.type === 'checkbox' ? this.checked : this.value)" />
                </div>
              `;
          }
        });

        const groupTitle =
          window.i18n.t(`sensors.${type}.groups.${groupKey}`) || groupKey;
        groupCardsHtml += `
          <div class="sensor-panel-item" style="margin-bottom: 15px;">
            <div class="sensor-panel-item-info">
              <div class="sensor-panel-item-header">
                  <span class="sensor-panel-item-name">${groupTitle}</span>
              </div>
              <div class="sensor-panel-inputs-grid">
                  ${inputsHtml}
              </div>
            </div>
          </div>
        `;
      });

      document.getElementById(`list-${type}`).innerHTML =
        groupCardsHtml ||
        `<span>${window.i18n.t(`sensors.${type}.name`) || config.name} is active.</span>`;
    }
  });

  if (firstDevice) {
    window.selectDevice(firstDevice);
  }

  // --- Dynamic Preview Toggles ---
  const togglesContainer = document.getElementById("preview-toggles");
  if (togglesContainer) {
    togglesContainer.innerHTML = "";
    Object.keys(window.SensorConfigs).forEach((type) => {
      const config = window.SensorConfigs[type];
      if (config.hideable) {
        // Initialize visibility state if not set
        if (window.SensorSettings.visibility[type] === undefined) {
          window.SensorSettings.visibility[type] = true;
        }

        const label = document.createElement("label");
        label.style.cssText =
          "font-size: 11px; display: flex; align-items: center; gap: 4px; color: #aaa; cursor: pointer;";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = window.SensorSettings.visibility[type];
        checkbox.onchange = (e) =>
          window.toggleSensorVisibility(type, e.target.checked);

        label.appendChild(checkbox);
        const toggleName = window.i18n.t(`sensors.${type}.name`) || config.name;
        label.appendChild(document.createTextNode(toggleName));
        togglesContainer.appendChild(label);
      }
    });
  }
};

// --- Helper: Get Target Array for a sensor type ---
window.getSensorTargetArray = function (type) {
  const config = window.SensorConfigs[type];
  if (!config) return state.sensors;
  if (config.targetArray === "grips") return state.grips;
  if (config.targetArray === "canvasObjects") return state.canvasObjects;
  return state.sensors;
};

// --- Add sensor ---
window.addDynamicSensor = function (type) {
  const config = window.SensorConfigs[type];
  const plugin = getPlugin(type);
  if (!config || !plugin) return;

  const targetArray = window.getSensorTargetArray(type);

  if (targetArray.filter((s) => s.type === type).length >= config.maxLimit) {
    const msg = window.i18n
      .t("sensors.common.max_reached")
      .replace("{name}", window.i18n.t(`sensors.${type}.name`) || config.name)
      .replace("{limit}", config.maxLimit);
    logToConsole(msg, "error");
    return;
  }

  const id = Date.now();

  if (!window.SensorNextIndices[type]) {
    // If not initialized, try to find max index in current targetArray
    const existingTyped = targetArray.filter((s) => s.type === type);
    if (existingTyped.length === 0) {
      window.SensorNextIndices[type] = 0;
    } else {
      window.SensorNextIndices[type] =
        Math.max(
          ...existingTyped.map((s) => (s.index !== undefined ? s.index : -1)),
        ) + 1;
    }
  }

  const index = window.SensorNextIndices[type]++;
  const newSensor = plugin.create(id, index);
  newSensor.index = index;
  targetArray.push(newSensor);

  window.updateSensorPreview();
  window.renderDynamicSensorsList(type);
  if (typeof window.updateSensorDots === "function") window.updateSensorDots();
  const addedMsg = window.i18n
    .t("sensors.common.new_added")
    .replace("{name}", window.i18n.t(`sensors.${type}.name`) || config.name);
  logToConsole(addedMsg, "info");
};

// --- Delete sensor ---
window.deleteSensor = function (id, typeVal) {
  const config = window.SensorConfigs[typeVal];
  const targetArray = window.getSensorTargetArray(typeVal);

  const sensor = targetArray.find((s) => String(s.id) === String(id));
  if (!sensor) return;

  const type = sensor.type || typeVal;
  const typedConfig = window.SensorConfigs[type] || {};

  // Protected index check (e.g., Front wheel index 0)
  if (
    typedConfig.protectedIndex !== undefined &&
    sensor.index === typedConfig.protectedIndex
  ) {
    const protMsg = window.i18n
      .t("sensors.common.protected")
      .replace(
        "{name}",
        window.i18n.t(`sensors.${type}.name`) || typedConfig.name,
      );
    logToConsole(protMsg, "error");
    return;
  }

  const minLimit = typedConfig.minLimit || 0;
  const currentTyped = targetArray.filter((s) => s.type === type);

  if (currentTyped.length <= minLimit) {
    const minMsg = window.i18n
      .t("sensors.common.min_required")
      .replace("{limit}", minLimit);
    logToConsole(minMsg, "error");
    return;
  }

  // Perform deletion
  if (config && config.targetArray === "grips") {
    state.grips = state.grips.filter((g) => String(g.id) !== String(id));
  } else if (config && config.targetArray === "canvasObjects") {
    state.canvasObjects = state.canvasObjects.filter((o) => String(o.id) !== String(id));
  } else {
    state.sensors = state.sensors.filter((s) => String(s.id) !== String(id));
  }

  // Sync SensorNextIndices
  const remainingTyped = (
    config && config.targetArray === "grips" ? state.grips : state.sensors
  ).filter((s) => s.type === type);

  if (remainingTyped.length === 0) {
    window.SensorNextIndices[type] = 0;
  } else {
    window.SensorNextIndices[type] =
      Math.max(
        ...remainingTyped.map((s) => (s.index !== undefined ? s.index : -1)),
      ) + 1;
  }

  window.updateSensorPreview();
  window.renderDynamicSensorsList(type);
  if (typeof window.updateSensorDots === "function") window.updateSensorDots();
  logToConsole(window.i18n.t("sensors.common.deleted"), "info");
};

// --- Update sensor value ---
window.updateSensorValueDOM = function (id, type, axis, value) {
  const config = window.SensorConfigs[type] || {};
  const targetArray = window.getSensorTargetArray(type);

  const sensor = targetArray.find((s) => String(s.id) === String(id));
  if (!sensor) return;

  const numValue = parseFloat(value);
  const inputConfig = config.inputs
    ? config.inputs.find((i) => (i.key || i.id) === axis)
    : null;

  if (inputConfig && inputConfig.type === "number") {
    let min = inputConfig.min;
    let max = inputConfig.max;
    if (axis === "x") {
      min = 0;
      max = 100;
    } else if (axis === "y") {
      min = -50;
      max = 50;
    }

    if (
      isNaN(numValue) ||
      (min !== undefined && numValue < min) ||
      (max !== undefined && numValue > max)
    ) {
      logToConsole(
        `Value must be between ${min} and ${max}!`,
        "error",
      );

      // revert DOM
      let prefix = "sensor";
      if (config.targetArray === "grips") prefix = "grip";
      else if (config.targetArray === "canvasObjects") prefix = "object";
      
      const inputId = `${prefix}-${id}-${axis}`;
      const inputEl = document.getElementById(inputId);
      if (inputEl) inputEl.value = sensor[axis];
      return;
    }
    sensor[axis] = numValue;
  } else if (inputConfig && inputConfig.type === "checkbox") {
    sensor[axis] =
      value === true || value === "true" || value === 1 || value === "1";
  } else {
    sensor[axis] = value;
  }

  sensor.isNew = false;
  window.updateSensorPreview();
  if (typeof window.updateSensorDots === "function") window.updateSensorDots();

  const upMsg = window.i18n
    .t("sensors.common.updated")
    .replace("{name}", window.i18n.t(`sensors.${type}.name`) || config.name)
    .replace(
      "{axis}",
      inputConfig
        ? window.i18n.t(`sensors.${type}.inputs.${axis}`) || inputConfig.label
        : axis,
    )
    .replace("{value}", value);
  logToConsole(upMsg, "info");
};
window.updateSensorValue = function (id, axis, value) {
  const s = state.sensors.find((x) => x.id === id);
  if (s) window.updateSensorValueDOM(id, s.type, axis, value);
};

// =============================================
// SENSOR PREVIEW (Dynamic Drawing)
// =============================================

window.updateSensorPreview = function () {
  const svg = document.getElementById("preview-svg");
  if (!svg) return;

  // Ensure robot body is updated
  if (typeof window.updateRobotPreview === "function")
    window.updateRobotPreview();

  // Clear previous sensor elements
  svg.querySelectorAll(".sensor-circle").forEach((el) => el.remove());
  svg.querySelectorAll(".grip-preview-el").forEach((el) => el.remove());

  // Dynamic ViewBox Zoom: Calculate bounding box to fit all sensors + robot
  const halfW = (state.robotWidth || 50) / 2;
  const halfH = (state.robotHeight || 50) / 2;
  let minX = -halfW,
    minY = -halfH,
    maxX = halfW,
    maxY = halfH;

  // Collect all sensors from all possible target arrays
  const allTargetArrays = new Set(["sensors", "grips"]); // Initial defaults
  if (window.SensorConfigs) {
    Object.values(window.SensorConfigs).forEach((conf) => {
      if (conf.targetArray) allTargetArrays.add(conf.targetArray);
    });
  }

  const allSensors = [];
  allTargetArrays.forEach((key) => {
    if (state[key] && Array.isArray(state[key])) {
      allSensors.push(...state[key]);
    }
  });

  const visibleSensors = allSensors.filter((s) => {
    return !(
      window.SensorSettings &&
      window.SensorSettings.visibility &&
      window.SensorSettings.visibility[s.type] === false
    );
  });

  visibleSensors.forEach((s) => {
    const registry = getPlugin(s.type);

    // 1. Basic position
    if (s.x !== undefined && s.y !== undefined) {
      const px = state.robotWidth / 2 - (s.x / 100) * state.robotWidth;
      const py = (s.y / 100) * state.robotHeight;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }

    // 2. Dynamic bounding box from registry
    if (registry && registry.getBounds) {
      const points = registry.getBounds(s);
      if (Array.isArray(points)) {
        points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      }
    }
  });

  const padding = 15;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxW = maxX - minX + padding * 2;
  const viewBoxH = maxY - minY + padding * 2;

  svg.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`,
  );

  // Draw sensors dynamically from all target arrays
  allSensors.forEach((sensor) => {
    const isVisible = !(
      window.SensorSettings &&
      window.SensorSettings.visibility &&
      window.SensorSettings.visibility[sensor.type] === false
    );
    if (!isVisible) return;

    const registry = getPlugin(sensor.type);
    if (registry && registry.drawPreview) {
      registry.drawPreview(svg, sensor);
    }
  });

  if (typeof syncWheelDOM === "function") syncWheelDOM();
};

// --- Render dynamic list ---
window.renderDynamicSensorsList = function (type) {
  const container = document.getElementById(`list-${type}`);
  if (!container) return;

  const config = window.SensorConfigs[type];
  if (!config) return;

  if (config.singleton === true) return; // Singleton devices are rendered inline at tab creation

  const targetArray = window
    .getSensorTargetArray(type)
    .filter((s) => s.type === type)
    .sort((a, b) => (a.index || 0) - (b.index || 0));
  const countLabel = document.getElementById(`count-label-${type}`);
  const addBtn = document.getElementById(`btn-add-${type}`);

  if (countLabel)
    countLabel.textContent = `(${targetArray.length}/${config.maxLimit})`;
  if (addBtn) addBtn.disabled = targetArray.length >= config.maxLimit;

  if (targetArray.length === 0) {
    const emptyMsg = window.i18n
      .t("sensors.common.empty")
      .replace("{name}", window.i18n.t(`sensors.${type}.name`) || config.name)
      .replace("{limit}", config.maxLimit);
    container.innerHTML = `<div class="panel-empty-message">${emptyMsg}</div>`;
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

          let inputElHtml = "";
          const inputId = `${config.targetArray === "grips" ? "grip" : "sensor"}-${sensor.id}-${key}`;

          if (input.type === "checkbox") {
            inputElHtml = `
              <input type="checkbox" class="sensor-checkbox" 
                     id="${inputId}"
                     ${val ? "checked" : ""} 
                     onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.checked)" 
                     onclick="event.stopPropagation()" />
            `;
          } else if (input.type === "select") {
            inputElHtml = `
              <select class="sensor-input" 
                      id="${inputId}"
                      onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.value)" 
                      onclick="event.stopPropagation()">
                ${(input.options || []).map((opt) => `<option value="${opt.value}" ${val === opt.value ? "selected" : ""}>${window.i18n.t(`sensors.${type}.inputs.${opt.value}`) || opt.label}</option>`).join("")}
              </select>
            `;
          } else {
            let min = input.min;
            let max = input.max;
            if (key === "x") {
              min = 0;
              max = 100;
            } else if (key === "y") {
              min = -50;
              max = 50;
            }

            inputElHtml = `
              <input type="${input.type || "number"}" class="sensor-input" 
                     id="${inputId}"
                     min="${min !== undefined ? min : ""}" 
                     max="${max !== undefined ? max : ""}" 
                     value="${val}" 
                     onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.value)" 
                     onclick="event.stopPropagation()" />
            `;
          }

          const labelText =
            window.i18n.t(`sensors.${type}.inputs.${key}`) || input.label;
          inputsHtml += `
            <div class="sensor-input-wrapper">
              <label>${labelText}</label>
              ${inputElHtml}
            </div>
          `;
        });
      }

      const registry = getPlugin(type);
      let displayName =
        registry && registry.getDisplayName
          ? registry.getDisplayName(
              sensor,
              sensor.index !== undefined ? sensor.index : index,
            )
          : `${window.i18n.t(`sensors.${type}.name`) || config.name.toUpperCase()} ${sensor.index !== undefined ? sensor.index : index}`;

      // Special case: if getDisplayName returns a key that we can translate
      if (type === "wheel") {
        if (displayName === "FRONT WHEEL")
          displayName = window.i18n.t("sensors.wheel.front");
        if (displayName === "BACK WHEEL")
          displayName = window.i18n.t("sensors.wheel.back");
      }

      const isProtected =
        config.protectedIndex !== undefined &&
        sensor.index === config.protectedIndex;

      return `
        <div class="sensor-panel-item" id="sensor-item-${type}-${sensor.id}">
          <div class="sensor-panel-item-info">
            <div class="sensor-panel-item-header">
              <span class="sensor-panel-item-name">${displayName}</span>
              <button class="btn-panel-delete" 
                      style="display: ${isProtected ? "none" : "flex"}"
                      onclick="window.deleteSensor('${sensor.id}', '${type}')" 
                      title="${window.i18n.t("sensors.common.delete")}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <div class="sensor-panel-inputs-grid">
              ${inputsHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
};

// Render all compatibility function
window.renderSensorsList = function () {
  if (window.SensorConfigs) {
    Object.keys(window.SensorConfigs).forEach((type) => {
      window.renderDynamicSensorsList(type);
    });
  }
};

// --- Language Change Listener ---
window.addEventListener("langChanged", () => {
  // Re-render both tabs (for category names) and current list (for labels)
  window.renderSensorTabs();
  if (typeof currentDevice !== "undefined") {
    window.renderDynamicSensorsList(currentDevice);
  } else {
    window.renderSensorsList();
  }
});

const sensorsManagerApi = {
  addDynamicSensor: window.addDynamicSensor,
  deleteSensor: window.deleteSensor,
  getSensorTargetArray: window.getSensorTargetArray,
  renderDynamicSensorsList: window.renderDynamicSensorsList,
  renderSensorsList: window.renderSensorsList,
  renderSensorTabs: window.renderSensorTabs,
  selectDevice: window.selectDevice,
  toggleSensorVisibility: window.toggleSensorVisibility,
  updateSensorPreview: window.updateSensorPreview,
  updateSensorValue: window.updateSensorValue,
  updateSensorValueDOM: window.updateSensorValueDOM,
  updateSingletonSensorValue: window.updateSingletonSensorValue,
};

const renderDynamicSensorsList = (...args) =>
  window.renderDynamicSensorsList(...args);
const renderSensorsList = (...args) => window.renderSensorsList(...args);
const renderSensorTabs = (...args) => window.renderSensorTabs(...args);
const updateSensorPreview = (...args) => window.updateSensorPreview(...args);

export {
  sensorsManagerApi,
  renderDynamicSensorsList,
  renderSensorsList,
  renderSensorTabs,
  updateSensorPreview,
};
