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
    const template = window.SensorTemplates && window.SensorTemplates["light"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${sensor.x}, ${sensor.y})`);
      g.classList.add("sensor-circle");
      svg.appendChild(g);
    }
  },
  read: function(sensor, globals) {
    const localX = sensor.x - 25;
    const localY = sensor.y - 25;
    const rad = (globals.angle * Math.PI) / 180;
    
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
    
    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;
    
    const brightness = typeof getPixelBrightness === "function" ? getPixelBrightness(canvasX, canvasY) : 0;
    console.log(`[Light Sensor Read] ${sensor.name}:
      - Robot Pos: (${Math.round(globals.robotX)}, ${Math.round(globals.robotY)})
      - Robot Angle: ${Math.round(globals.angle)}°
      - Local Offset: (${localX}, ${localY})
      - Rotated Offset: (${Math.round(rotatedX)}, ${Math.round(rotatedY)})
      - Final Canvas Pos: (${Math.round(canvasX)}, ${Math.round(canvasY)})
      - Value: ${brightness}`);
    return brightness;
  },
  updateValue: function(id, axis, value) {
    window.updateSensorValueDOM(id, "light", axis, value);
  },
  deleteItem: function(id) {
    window.deleteSensor(id, "light");
  },
  drawCanvas: function(svg, sensor, globals, index) {
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
    const template = window.SensorTemplates && window.SensorTemplates["light"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute("transform", `translate(${canvasX}, ${canvasY})`);
      
      // Add title for tooltip (SVG <title> tag works well)
      let brightness = 512;
      if (typeof canvasPixelData !== "undefined" && canvasPixelData) {
        brightness = (typeof getPixelBrightness === "function") ? getPixelBrightness(canvasX, canvasY) : 0;
      }
      sensor.value = brightness;
      
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
      g.appendChild(title);
      
      svg.appendChild(g);
    }
  }
};
