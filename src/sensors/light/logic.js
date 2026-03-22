window.SensorRegistry["light"] = {
  create: function(id, count) {
    return {
      id,
      type: "light",
      x: 45,
      y: 25,
      name: `Light ${count}`,
      isNew: true
    };
  },
  drawPreview: function(svg, sensor) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "sensor-circle");
    circle.setAttribute("cx", sensor.x);
    circle.setAttribute("cy", sensor.y);
    circle.setAttribute("r", "2");
    svg.appendChild(circle);
  },
  read: function(sensor, globals) {
    const localX = sensor.x - 25;
    const localY = sensor.y - 25;
    const rad = (globals.angle * Math.PI) / 180;
    
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
    
    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;
    
    return typeof getPixelBrightness === "function" ? getPixelBrightness(canvasX, canvasY) : 0;
  },
  updateValue: function(id, axis, value) {
    window.updateSensorValueDOM(id, "light", axis, value);
  },
  deleteItem: function(id) {
    window.deleteSensor(id, "light");
  },
  drawCanvas: function(canvasArea, sensor, globals, index) {
    const rad = (globals.angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const dot = document.createElement("div");
    dot.className = "sensor-dot";

    const localX = sensor.x - 25;
    const localY = sensor.y - 25;

    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;

    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;

    dot.style.left = canvasX + "px";
    dot.style.top = canvasY + "px";

    let brightness = 512;
    if (typeof canvasPixelData !== "undefined" && canvasPixelData) {
        brightness = (typeof getPixelBrightness === "function") ? getPixelBrightness(canvasX, canvasY) : 0;
    }
    sensor.value = brightness;
    dot.title = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
    canvasArea.appendChild(dot);
  }
};
