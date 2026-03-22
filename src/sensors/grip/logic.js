window.showGripPreview = true;
window.toggleGripPreview = function(checked) {
  window.showGripPreview = checked;
  if (typeof updateSensorPreview === 'function') updateSensorPreview();
};

window.SensorRegistry["grip"] = {
  create: function(id, count) {
    return {
      id,
      type: "grip",
      x: 45,
      y: 25,
      angle: 0,
      name: `Grip ${count}`
    };
  },
  drawPreview: function(svg, grip) {
    if (typeof showGripPreview !== 'undefined' && !showGripPreview) return;
    
    const rad = (grip.angle * Math.PI) / 180;
    const armLen = 10;
    const tipX = grip.x + Math.cos(rad) * armLen;
    const tipY = grip.y + Math.sin(rad) * armLen;

    // Arm
    const arm = document.createElementNS("http://www.w3.org/2000/svg", "line");
    arm.setAttribute("x1", grip.x);
    arm.setAttribute("y1", grip.y);
    arm.setAttribute("x2", tipX);
    arm.setAttribute("y2", tipY);
    arm.setAttribute("stroke", "#f39c12");
    arm.setAttribute("stroke-width", "2");
    arm.setAttribute("class", "grip-preview-el");
    svg.appendChild(arm);

    // Left jaw
    const jawLen = 5;
    const jL = rad + 0.5;
    const jawL = document.createElementNS("http://www.w3.org/2000/svg", "line");
    jawL.setAttribute("x1", tipX);
    jawL.setAttribute("y1", tipY);
    jawL.setAttribute("x2", tipX + Math.cos(jL) * jawLen);
    jawL.setAttribute("y2", tipY + Math.sin(jL) * jawLen);
    jawL.setAttribute("stroke", "#f39c12");
    jawL.setAttribute("stroke-width", "1.5");
    jawL.setAttribute("class", "grip-preview-el");
    svg.appendChild(jawL);

    // Right jaw
    const jR = rad - 0.5;
    const jawR = document.createElementNS("http://www.w3.org/2000/svg", "line");
    jawR.setAttribute("x1", tipX);
    jawR.setAttribute("y1", tipY);
    jawR.setAttribute("x2", tipX + Math.cos(jR) * jawLen);
    jawR.setAttribute("y2", tipY + Math.sin(jR) * jawLen);
    jawR.setAttribute("stroke", "#f39c12");
    jawR.setAttribute("stroke-width", "1.5");
    jawR.setAttribute("class", "grip-preview-el");
    svg.appendChild(jawR);

    // Base dot
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", grip.x);
    dot.setAttribute("cy", grip.y);
    dot.setAttribute("r", "2.5");
    dot.setAttribute("fill", "#e67e22");
    dot.setAttribute("class", "grip-preview-el");
    svg.appendChild(dot);
  },
  read: function(sensor, globals) {
    // Grips don't usually return an analog value this way
    return 0;
  },
  updateValue: function(id, axis, value) {
    window.updateSensorValueDOM(id, "grip", axis, value);
  },
  deleteItem: function(id) {
    window.deleteSensor(id, "grip");
  },
  physicsStep: function(grip, index, globals) {
    if (typeof grabbedObjects !== "undefined" && grabbedObjects.length > 0) {
      const obj = grabbedObjects[index];
      if (!obj) return;

      const rad_val = (globals.angle * Math.PI) / 180;
      const cos_v = Math.cos(rad_val);
      const sin_v = Math.sin(rad_val);

      const localX = grip.x - 25;
      const localY = grip.y - 25;
      const rotatedX = localX * cos_v - localY * sin_v;
      const rotatedY = localX * sin_v + localY * cos_v;
      const gripCanvasX = globals.robotX + 25 + rotatedX;
      const gripCanvasY = globals.robotY + 25 + rotatedY;

      const gripGlobalAngle = (globals.angle + (grip.angle || 0)) * (Math.PI / 180);
      const grabDist = 15;

      obj.x = gripCanvasX + grabDist * Math.cos(gripGlobalAngle);
      obj.y = gripCanvasY + grabDist * Math.sin(gripGlobalAngle);
      obj.vx = 0;
      obj.vy = 0;
    }
  },
  drawCanvas: function(canvasArea, grip, globals, index) {
    if (!globals.showGripPreview) return;

    const rad = (globals.angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    const localX = grip.x - 25;
    const localY = grip.y - 25;
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    const canvasX = globals.robotX + 25 + rotatedX;
    const canvasY = globals.robotY + 25 + rotatedY;
    const globalAngle = globals.angle + (grip.angle || 0);

    const gripContainer = document.createElement("div");
    gripContainer.className = "grip-canvas-el";
    gripContainer.style.left = canvasX + "px";
    gripContainer.style.top = canvasY + "px";
    gripContainer.style.transform = `rotate(${globalAngle}deg)`;

    const arm = document.createElement("div");
    arm.className = "grip-arm-canvas-el";
    arm.style.width = "10px";
    gripContainer.appendChild(arm);

    const tipX = 10;
    const tipY = 0;

    const jawL = document.createElement("div");
    jawL.className = "grip-jaw-canvas-el";
    jawL.style.width = "5px";
    jawL.style.left = tipX + "px";
    jawL.style.top = tipY + "px";
    jawL.style.transform = "rotate(30deg)";
    gripContainer.appendChild(jawL);

    const jawR = document.createElement("div");
    jawR.className = "grip-jaw-canvas-el";
    jawR.style.width = "5px";
    jawR.style.left = tipX + "px";
    jawR.style.top = tipY + "px";
    jawR.style.transform = "rotate(-30deg)";
    gripContainer.appendChild(jawR);

    const base = document.createElement("div");
    base.className = "grip-base-canvas-el";
    gripContainer.appendChild(base);

    canvasArea.appendChild(gripContainer);
  }
};
