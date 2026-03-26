window.SensorRegistry["light"] = {
  create: function (id, count) {
    return {
      id,
      type: "light",
      x: 10,
      y: 0,
      color: "#ff0000",
      name: `Light ${count}`,
      isNew: true,
    };
  },
  drawPreview: function (svg, sensor) {
    const template = window.SensorTemplates && window.SensorTemplates["light"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      const lx = (sensor.x / 100) * window.state.robotWidth - (window.state.robotWidth / 2);
      const ly = (sensor.y / 100) * window.state.robotHeight;
      g.setAttribute("transform", `translate(${lx}, ${ly})`);
      g.classList.add("sensor-circle");

      // Update circle color
      const circle = g.querySelector("circle");
      if (circle) {
        circle.setAttribute("fill", sensor.color || "#ff0000ff");
        circle.setAttribute("stroke", sensor.color || "#ff0000ff");
      }

      svg.appendChild(g);
    }
  },
  read: function (sensor, globals) {
    const localX = (sensor.x / 100) * globals.robotWidth - (globals.robotWidth / 2);
    const localY = (sensor.y / 100) * globals.robotHeight;
    const rad = (globals.angle * Math.PI) / 180;

    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);

    const canvasX = globals.robotX + rotatedX;
    const canvasY = globals.robotY + rotatedY;

    const brightness =
      typeof getPixelBrightness === "function"
        ? getPixelBrightness(canvasX, canvasY, sensor.color)
        : 0;
    
    return brightness;
  },
  updateValue: function (id, axis, value) {
    window.updateSensorValueDOM(id, "light", axis, value);
  },
  deleteItem: function (id) {
    window.deleteSensor(id, "light");
  },
  drawCanvas: function (svg, sensor, globals, index) {
    const isVisible = globals.sensorVisibility && globals.sensorVisibility["light"] !== false;
    if (!isVisible) return;
    
    const rad = (globals.angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const localX = (sensor.x / 100) * globals.robotWidth - (globals.robotWidth / 2);
    const localY = (sensor.y / 100) * globals.robotHeight;
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    const canvasX = globals.robotX + rotatedX;
    const canvasY = globals.robotY + rotatedY;

    // Use unified SVG template
    const template = window.SensorTemplates && window.SensorTemplates["light"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${canvasX}, ${canvasY})`);

      // Update circle color
      const circle = g.querySelector("circle");
      if (circle) {
        circle.setAttribute("fill", sensor.color || "#ff0000ff");
        circle.setAttribute("stroke", sensor.color || "#ff0000ff");
      }

      // Add title for tooltip (SVG <title> tag works well)
      let brightness = 512;
      if (typeof state.canvasPixelData !== "undefined" && state.canvasPixelData) {
        brightness =
          typeof getPixelBrightness === "function"
            ? getPixelBrightness(canvasX, canvasY, sensor.color)
            : 0;
      }
      sensor.value = brightness;

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title",
      );
      title.textContent = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
      g.appendChild(title);

      svg.appendChild(g);
    }
  },
};
