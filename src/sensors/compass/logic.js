window.SensorRegistry["compass"] = {
  create: function (id, count) {
    return {
      id: "compass_" + id,
      type: "compass",
      name: `Compass ${count}`,
      x: 25,
      y: 25,
    };
  },

  drawPreview: function (svg, sensor) {
    const template = window.SensorTemplates && window.SensorTemplates["compass"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${sensor.x}, ${sensor.y})`);
      g.classList.add("sensor-circle");
      svg.appendChild(g);
    }
  },

  drawCanvas: function (svg, sensor, globals, index) {
    const isVisible = globals.sensorVisibility && globals.sensorVisibility["compass"] !== false;
    if (!isVisible) return;

    const rad = (globals.angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const localX = sensor.x - 25;
    const localY = sensor.y - 25;
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;

    // Use unified SVG template
    const template = window.SensorTemplates && window.SensorTemplates["compass"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${canvasX}, ${canvasY})`);
      
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `Compass [${index}]\nAngle: ${Math.round(globals.angle)}°`;
      g.appendChild(title);

      svg.appendChild(g);
    }
  },

  read: function (sensor, globals) {
    const angle = Math.round(globals.angle);
    console.log(`[Compass Read] ${sensor.name}:
      - Robot Angle: ${angle}°`);
    return angle;
  },

  updateValue: function (key, value) {
    // Singleton – no item-level update needed (no id)
  },

  deleteItem: function (id) {
    if (typeof window.deleteSensor === "function") {
      window.deleteSensor(id, "compass");
    }
  }
};
