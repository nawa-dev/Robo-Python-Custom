/**
 * Dynamic Sensor Management System
 */

let currentDevice = "light";
window.SensorNextIndices = {};
window.SensorSettings = {
  visibility: {},
};

window.toggleSensorVisibility = function (type, enabled) {
  if (!window.SensorSettings.visibility) window.SensorSettings.visibility = {};
  window.SensorSettings.visibility[type] = enabled;
  if (typeof updateSensorDots === "function") updateSensorDots();
  if (typeof updateSensorPreview === "function") updateSensorPreview();
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
          if (input.type === "select") {
            let optionsHtml = (input.options || [])
              .map(
                (opt) =>
                  `<option value="${opt.value}" ${opt.value == defaultVal ? "selected" : ""}>${opt.label}</option>`,
              )
              .join("");
            inputsHtml += `
                <div class="sensor-input-wrapper">
                  <label>${input.label}</label>
                  <select class="sensor-input" 
                         id="singleton-${type}-${key}"
                         onchange="window.SensorRegistry['${type}'].updateValue('${key}', this.value)">
                    ${optionsHtml}
                  </select>
                </div>
              `;
          } else {
            inputsHtml += `
                <div class="sensor-input-wrapper">
                  <label>${input.label}</label>
                  <input type="${input.type || "number"}" class="sensor-input" 
                         id="singleton-${type}-${key}"
                         min="${input.min !== undefined ? input.min : ""}" 
                         max="${input.max !== undefined ? input.max : ""}" 
                         value="${defaultVal}" 
                         onchange="window.SensorRegistry['${type}'].updateValue('${key}', this.value)" />
                </div>
              `;
          }
        });
      }
      document.getElementById(`list-${type}`).innerHTML = `
        <div class="sensor-panel-item">
          <div class="sensor-panel-item-info">
             <div class="sensor-panel-item-header">
                <span class="sensor-panel-item-name">${config.name}</span>
             </div>
             <div class="sensor-panel-inputs-grid">
                ${inputsHtml.length > 0 ? inputsHtml : `<span>${config.name} is active.</span>`}
             </div>
          </div>
        </div>
      `;
    }
  });

  if (firstDevice) {
    selectDevice(firstDevice);
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
        label.appendChild(document.createTextNode(config.name));
        togglesContainer.appendChild(label);
      }
    });
  }
};

// --- Helper: Get Target Array for a sensor type ---
window.getSensorTargetArray = function (type) {
  const config = window.SensorConfigs[type];
  if (!config) return state.sensors;
  return config.targetArray === "grips" ? state.grips : state.sensors;
};

// --- Add sensor ---
window.addDynamicSensor = function (type) {
  const config = window.SensorConfigs[type];
  if (!config || !window.SensorRegistry[type]) return;

  const targetArray = window.getSensorTargetArray(type);

  if (targetArray.filter((s) => s.type === type).length >= config.maxLimit) {
    logToConsole(
      `Maximum ${config.name} (${config.maxLimit}) reached!`,
      "error",
    );
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
  const newSensor = window.SensorRegistry[type].create(id, index);
  newSensor.index = index;
  targetArray.push(newSensor);

  updateSensorPreview();
  renderDynamicSensorsList(type);
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole(`New ${config.name} added.`, "info");
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
    logToConsole(`Cannot delete protected ${typedConfig.name}!`, "error");
    return;
  }

  const minLimit = typedConfig.minLimit || 0;
  const currentTyped = targetArray.filter((s) => s.type === type);

  if (currentTyped.length <= minLimit) {
    logToConsole(
      `Cannot delete! Minimum ${typedConfig.name || type} (${minLimit}) required.`,
      "error",
    );
    return;
  }

  // Perform deletion
  if (config && config.targetArray === "grips") {
    state.grips = state.grips.filter((g) => String(g.id) !== String(id));
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

  updateSensorPreview();
  renderDynamicSensorsList(type);
  if (typeof updateSensorDots === "function") updateSensorDots();
  logToConsole("Sensor deleted.", "info");
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
      const inputId = `${config.targetArray === "grips" ? "grip" : "sensor"}-${id}-${axis}`;
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
  updateSensorPreview();
  if (typeof updateSensorDots === "function") updateSensorDots();

  logToConsole(`${config.name} updated: ${axis} = ${value}`, "info");
};
window.updateSensorValue = function (id, axis, value) {
  const s = state.sensors.find((x) => x.id === id);
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
    const registry = window.SensorRegistry[s.type];

    // 1. Basic position
    if (s.x !== undefined && s.y !== undefined) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x);
      maxY = Math.max(maxY, s.y);
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

    const registry = window.SensorRegistry[sensor.type];
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

  const targetArray = window.getSensorTargetArray(type)
    .filter((s) => s.type === type)
    .sort((a, b) => (a.index || 0) - (b.index || 0));
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
            let optionsHtml = (input.options || [])
              .map(
                (opt) =>
                  `<option value="${opt.value}" ${
                    val === opt.value ? "selected" : ""
                  }>${opt.label}</option>`,
              )
              .join("");
            inputElHtml = `
              <select class="sensor-input" 
                      id="${inputId}"
                      onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.value)" 
                      onclick="event.stopPropagation()">
                ${optionsHtml}
              </select>
            `;
          } else {
            inputElHtml = `
              <input type="${input.type || "number"}" class="sensor-input" 
                     id="${inputId}"
                     min="${input.min !== undefined ? input.min : ""}" 
                     max="${input.max !== undefined ? input.max : ""}" 
                     value="${val}" 
                     onchange="window.updateSensorValueDOM('${sensor.id}', '${type}', '${key}', this.value)" 
                     onclick="event.stopPropagation()" />
            `;
          }

          inputsHtml += `
            <div class="sensor-input-wrapper">
              <label>${input.label}</label>
              ${inputElHtml}
            </div>
          `;
        });
      }

      const registry = window.SensorRegistry[type];
      const displayName =
        registry && registry.getDisplayName
          ? registry.getDisplayName(
              sensor,
              sensor.index !== undefined ? sensor.index : index,
            )
          : `${config.name.toUpperCase()} ${sensor.index !== undefined ? sensor.index : index}`;

      const isProtected = config.protectedIndex !== undefined && sensor.index === config.protectedIndex;

      return `
        <div class="sensor-panel-item" id="sensor-item-${type}-${sensor.id}">
          <div class="sensor-panel-item-info">
            <div class="sensor-panel-item-header">
              <span class="sensor-panel-item-name">${displayName}</span>
              <button class="btn-panel-delete" 
                      style="display: ${isProtected ? "none" : "flex"}"
                      onclick="window.deleteSensor('${sensor.id}', '${type}')" 
                      title="Delete Device">
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
      renderDynamicSensorsList(type);
    });
  }
};
