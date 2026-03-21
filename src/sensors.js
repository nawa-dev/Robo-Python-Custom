/**
 * Sensor Management System
 */

// --- Tab Switching ---
function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  // Remove active class from buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activate selected tab and button
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
  
  if (tabId === "settings") {
    updateSensorPreview();
    renderSensorsList();
  } else if (tabId === "code") {
    // Refresh editor layout when switching back to code tab, otherwise Monaco may not render properly
    if (typeof editor !== 'undefined' && editor !== null) {
      setTimeout(() => {
        editor.layout();
      }, 0);
    }
  }
}

// --- Add sensor ---
function addSensorToList(type = "light") {
  if (sensors.length >= MAX_SENSORS) {
    logToConsole(`Maximum sensors (${MAX_SENSORS}) reached!`, "error");
    return;
  }

  const id = Date.now();
  // Count existing sensors of this type for naming
  const count = sensors.filter((s) => s.type === type).length + 1;
  const name = type === "light" ? `Light ${count}` : `Ultra ${count}`;

  sensors.push({
    id: id,
    type: type, // "light" or "ultrasonic"
    x: 45,
    y: 25,
    angle: 0, // Ultrasonic mostly needs angle relative to robot
    color: "#000000", // Default obstacle color (Black)
    name: name,
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

  // Validate X/Y Position (0-50)
  if ((axis === "x" || axis === "y") && (isNaN(numValue) || numValue < 0 || numValue > 50)) {
    logToConsole(`Position must be between 0 and 50!`, "error");
    document.getElementById(`sensor-${id}-${axis}`).value = sensor[axis];
    return;
  }

  // Validate Angle (-180 to 180)
  if (axis === "angle" && (isNaN(numValue) || numValue < -180 || numValue > 180)) {
    logToConsole(`Angle must be between -180 and 180!`, "error");
    document.getElementById(`sensor-${id}-angle`).value = sensor.angle;
    return;
  }

  if (axis === "x") {
    sensor.x = numValue;
  } else if (axis === "y") {
    sensor.y = numValue;
  } else if (axis === "angle") {
      // Angle logic
      if (isNaN(numValue)) return;
      sensor.angle = numValue;
  } else if (axis === "color") {
      // Color logic
      sensor.color = value;
  }

  sensor.isNew = false;
  updateSensorPreview();
  updateSensorDots();
  logToConsole(
    `Sensor ${sensor.name} updated to (${sensor.x.toFixed(1)}, ${sensor.y.toFixed(1)}${sensor.angle !== undefined ? ", " + sensor.angle + "°" : ""})`,
    "info",
  );
}

// --- Update sensor preview ---
function updateSensorPreview() {
  const svg = document.getElementById("preview-svg");

  svg.querySelectorAll(".sensor-circle").forEach((el) => el.remove());

  sensors.forEach((sensor) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Draw direction line for Ultrasonic
    if (sensor.type === "ultrasonic") {
        const rad = ((sensor.angle || 0) * Math.PI) / 180;
        const lineLen = 15; // Length of preview ray
        const endX = sensor.x + Math.cos(rad) * lineLen;
        const endY = sensor.y + Math.sin(rad) * lineLen;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", sensor.x);
        line.setAttribute("y1", sensor.y);
        line.setAttribute("x2", endX);
        line.setAttribute("y2", endY);
        line.setAttribute("stroke", "rgba(9, 132, 227, 0.7)");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("class", "sensor-circle"); // Reuse class for cleanup
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

    // Show different color for Ultrasonic
    if (sensor.type === "ultrasonic") {
        circle.style.fill = "#0984e3"; 
        circle.setAttribute("fill", "#0984e3");
    } 
    svg.appendChild(circle);
  });
}

// --- Render sensors list ---
function renderSensorsList() {
  const container = document.getElementById("sensors-container");

  if (sensors.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No sensors added yet. Click "+ Add Sensor" to start.</div>';
    return;
  }

  container.innerHTML = sensors
    .map(
      (sensor, index) => `
    <div class="sensor-item ${sensor.isNew ? "sensor-item-new" : ""}" style="border-left: 4px solid ${sensor.type === "ultrasonic" ? "#0984e3" : "#ff4757"}">
      <div class="sensor-item-info">
        <div class="sensor-item-label">
          <i class="fas ${sensor.type === "ultrasonic" ? "fa-wifi" : "fa-lightbulb"}"></i>
          <span>${index}: ${sensor.name}</span>
        </div>
        <div class="sensor-item-coords">
          <div class="sensor-coord-input">
            <label>X:</label>
            <input
              type="number"
              id="sensor-${sensor.id}-x"
              min="0"
              max="50"
              value="${sensor.x}"
              onchange="updateSensorValue(${sensor.id}, 'x', this.value)"
              onclick="event.stopPropagation()"
            />
          </div>
          <div class="sensor-coord-input">
            <label>Y:</label>
            <input
              type="number"
              id="sensor-${sensor.id}-y"
              min="0"
              max="50"
              value="${sensor.y}"
              onchange="updateSensorValue(${sensor.id}, 'y', this.value)"
              onclick="event.stopPropagation()"
            />
          </div>
          ${
            sensor.type === "ultrasonic"
              ? `
          <div class="sensor-coord-input">
            <label>∠:</label>
            <input
              type="number"
              id="sensor-${sensor.id}-angle"
              min="-180"
              max="180"
              value="${sensor.angle || 0}"
              onchange="updateSensorValue(${sensor.id}, 'angle', this.value)"
              onclick="event.stopPropagation()"
              title="Angle relative to robot"
            />
          </div>
          <div class="sensor-coord-input">
            <label>Color:</label>
            <input
              type="color"
              id="sensor-${sensor.id}-color"
              value="${sensor.color || "#000000"}"
              onchange="updateSensorValue(${sensor.id}, 'color', this.value)"
              onclick="event.stopPropagation()"
              title="Obstacle Color to detect"
              style="width: 30px; padding: 0; border: none; background: none;"
            />
          </div>`
              : ""
          }
        </div>
      </div>
      <div class="sensor-item-actions">
        <button class="btn-delete-sensor" onclick="deleteSensor(${
          sensor.id
        })">Delete</button>
      </div>
    </div>
  `,
    )
    .join("");

  const addBtns = document.querySelectorAll(".btn-add-sensor");
  addBtns.forEach(btn => {
     if (sensors.length >= MAX_SENSORS) {
        btn.disabled = true;
     } else {
        btn.disabled = false;
     }
  });
}

