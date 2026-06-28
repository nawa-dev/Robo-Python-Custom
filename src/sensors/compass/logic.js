const compassPlugin = {
  create: function (id, count) {
    return {
      id: `compass_${id}`,
      type: "compass",
      name: `Compass ${count}`,
      x: 50,
      y: 0,
    };
  },

  drawPreview: function (svg, sensor) {
    const template = window.SensorTemplates && window.SensorTemplates["compass"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      const lx =
        window.state.robotWidth / 2 - (sensor.x / 100) * window.state.robotWidth;
      const ly = (sensor.y / 100) * window.state.robotHeight;
      g.setAttribute("transform", `translate(${lx}, ${ly})`);
      g.classList.add("sensor-circle");
      svg.appendChild(g);
    }
  },

  drawCanvas: function (svg, sensor, globals, index) {
    const isVisible =
      globals.sensorVisibility && globals.sensorVisibility["compass"] !== false;
    if (!isVisible) {
      return;
    }

    const rad = (globals.angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const localX =
      globals.robotWidth / 2 - (sensor.x / 100) * globals.robotWidth;
    const localY = (sensor.y / 100) * globals.robotHeight;
    const rotatedX = localX * cosA - localY * sinA;
    const rotatedY = localX * sinA + localY * cosA;
    const canvasX = globals.robotX + rotatedX;
    const canvasY = globals.robotY + rotatedY;

    const template = window.SensorTemplates && window.SensorTemplates["compass"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${canvasX}, ${canvasY})`);

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `Compass [${index}]\nAngle: ${Math.round(globals.angle)} deg`;
      g.appendChild(title);

      svg.appendChild(g);
    }
  },

  read: function (sensor, globals) {
    const angle = (Math.round(globals.angle) % 360 + 360) % 360;
    console.log(`[Compass Read] ${sensor.name}: Robot Angle ${angle} deg`);
    return angle;
  },

  updateValue: function () {
    // Singleton: no item-level update needed.
  },

  deleteItem: function (id) {
    if (typeof window.deleteSensor === "function") {
      window.deleteSensor(id, "compass");
    }
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("compass", compassPlugin);
} else {
  window.SensorRegistry["compass"] = compassPlugin;
}

export default compassPlugin;
