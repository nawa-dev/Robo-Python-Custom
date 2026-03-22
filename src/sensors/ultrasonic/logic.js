window.SensorRegistry["ultrasonic"] = {
  create: function (id, count) {
    return {
      id,
      type: "ultrasonic",
      x: 45,
      y: 25,
      angle: 0,
      color: "#000000",
      name: `Ultra ${count}`,
      isNew: true,
    };
  },
  drawPreview: function (svg, sensor) {
    const template =
      window.SensorTemplates && window.SensorTemplates["ultrasonic"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute(
        "transform",
        `translate(${sensor.x}, ${sensor.y}) rotate(${sensor.angle || 0})`,
      );
      g.classList.add("sensor-circle");
      svg.appendChild(g);
    }
  },
  read: function (sensor, globals) {
    const value = Math.round(sensor.value || 0);
    console.log(`[Ultrasonic Read] ${sensor.name}: Value: ${value}`);
    return value;
  },
  updateValue: function (id, axis, value) {
    window.updateSensorValueDOM(id, "ultrasonic", axis, value);
  },
  deleteItem: function (id) {
    window.deleteSensor(id, "ultrasonic");
  },
  drawCanvas: function (svg, sensor, globals, index) {
    const rad = (globals.angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const localX = sensor.x - 25;
    const localY = sensor.y - 25;
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;
    const sensorGlobalAngle = globals.angle + (sensor.angle || 0);

    let dist = 800;
    if (typeof getUltrasonicDistance === "function") {
      dist = getUltrasonicDistance(
        canvasX,
        canvasY,
        sensorGlobalAngle,
        sensor.color || "#000000",
      );
    }
    sensor.value = dist;

    // Use unified SVG template
    const template =
      window.SensorTemplates && window.SensorTemplates["ultrasonic"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute(
        "transform",
        `translate(${canvasX}, ${canvasY}) rotate(${sensorGlobalAngle})`,
      );

      // Update ray line if it exists
      const isVisible = globals.sensorVisibility && globals.sensorVisibility["ultrasonic"] !== false;
      if (isVisible) {
        const ray = g.querySelector(".ultrasonic-ray");
        if (ray) {
          ray.setAttribute("x2", dist);
          ray.style.stroke = sensor.color || "#3498db";
        }
      } else {
        const ray = g.querySelector(".ultrasonic-ray");
        if (ray) ray.remove();
      }

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title",
      );
      title.textContent = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} px`;
      g.appendChild(title);

      svg.appendChild(g);
    }
  },
  getBounds: function (sensor) {
    const rad = ((sensor.angle || 0) * Math.PI) / 180;
    return [
      { x: sensor.x, y: sensor.y },
      {
        x: sensor.x + Math.cos(rad) * 15,
        y: sensor.y + Math.sin(rad) * 15,
      },
    ];
  },
};
