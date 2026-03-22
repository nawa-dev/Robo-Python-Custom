window.SensorRegistry["ultrasonic"] = {
  create: function(id, count) {
    return {
      id,
      type: "ultrasonic",
      x: 45,
      y: 25,
      angle: 0,
      color: "#000000",
      name: `Ultra ${count}`,
      isNew: true
    };
  },
  drawPreview: function(svg, sensor) {
    const rad = ((sensor.angle || 0) * Math.PI) / 180;
    const lineLen = 15;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", sensor.x);
    line.setAttribute("y1", sensor.y);
    line.setAttribute("x2", sensor.x + Math.cos(rad) * lineLen);
    line.setAttribute("y2", sensor.y + Math.sin(rad) * lineLen);
    line.setAttribute("stroke", "rgba(9, 132, 227, 0.7)");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("class", "sensor-circle");
    svg.appendChild(line);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "sensor-circle");
    circle.setAttribute("cx", sensor.x);
    circle.setAttribute("cy", sensor.y);
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "#0984e3");
    svg.appendChild(circle);
  },
  read: function(sensor, globals) {
    return Math.round(sensor.value || 0);
  },
  updateValue: function(id, axis, value) {
    window.updateSensorValueDOM(id, "ultrasonic", axis, value);
  },
  deleteItem: function(id) {
    window.deleteSensor(id, "ultrasonic");
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
    dot.style.backgroundColor = sensor.color || "#0984e3";

    const sensorGlobalAngle = globals.angle + (sensor.angle || 0);
    let dist = 800;
    if (typeof getUltrasonicDistance === "function") {
        dist = getUltrasonicDistance(canvasX, canvasY, sensorGlobalAngle, sensor.color || "#000000");
    }
    sensor.value = dist;
    dot.title = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} cm/px`;
    
    if (globals.showSensorRays) {
        const rayLine = document.createElement("div");
        rayLine.style.position = "absolute";
        rayLine.style.left = canvasX + "px";
        rayLine.style.top = canvasY + "px";
        rayLine.style.width = dist + "px";
        rayLine.style.height = "1px";
        rayLine.style.backgroundColor = sensor.color || "#0984e3";
        rayLine.style.opacity = "0.5";
        rayLine.style.transformOrigin = "0 0";
        rayLine.style.transform = `rotate(${sensorGlobalAngle}deg)`;
        rayLine.style.pointerEvents = "none";
        rayLine.className = "sensor-dot";
        canvasArea.appendChild(rayLine);
    }
    canvasArea.appendChild(dot);
  }
};
