window.showGripPreview = true;
window.toggleGripPreview = function (checked) {
  window.showGripPreview = checked;
  if (typeof updateSensorPreview === "function") {
    updateSensorPreview();
  }
};

const gripPlugin = {
  create: function (id, count) {
    return {
      id,
      type: "grip",
      x: 0,
      y: 0,
      angle: 0,
      armLength: 20,
      name: `Grip ${count}`,
    };
  },
  drawPreview: function (svg, grip) {
    if (typeof showGripPreview !== "undefined" && !showGripPreview) {
      return;
    }

    const template = window.SensorTemplates && window.SensorTemplates["grip"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      const lx =
        window.state.robotWidth / 2 - (grip.x / 100) * window.state.robotWidth;
      const ly = (grip.y / 100) * window.state.robotHeight;
      g.setAttribute(
        "transform",
        `translate(${lx}, ${ly}) rotate(${grip.angle || 0})`,
      );
      g.classList.add("grip-preview-el");

      const armLen = grip.armLength || 20;
      const jawLen = 10;
      const arm = g.querySelector(".grip-arm-el");
      const jawL = g.querySelector(".grip-jaw-l");
      const jawR = g.querySelector(".grip-jaw-r");
      if (arm) {
        arm.setAttribute("x2", armLen);
      }
      if (jawL) {
        jawL.setAttribute("x1", armLen);
        jawL.setAttribute("x2", armLen + jawLen);
      }
      if (jawR) {
        jawR.setAttribute("x1", armLen);
        jawR.setAttribute("x2", armLen + jawLen);
      }

      svg.appendChild(g);
    }
  },
  read: function () {
    return 0;
  },
  updateValue: function (id, axis, value) {
    window.updateSensorValueDOM(id, "grip", axis, value);
  },
  deleteItem: function (id) {
    window.deleteSensor(id, "grip");
  },
  physicsStep: function (grip, index, globals) {
    if (typeof state.grabbedObjects !== "undefined") {
      const obj = state.grabbedObjects[index];
      const armLen = grip.armLength || 20;
      const rad = (globals.angle * Math.PI) / 180;
      const gripRad = (globals.angle + (grip.angle || 0)) * (Math.PI / 180);

      const localX =
        globals.robotWidth / 2 - (grip.x / 100) * globals.robotWidth;
      const localY = (grip.y / 100) * globals.robotHeight;
      const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
      const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
      const gripCanvasX = globals.robotX + rotatedX;
      const gripCanvasY = globals.robotY + rotatedY;

      if (obj) {
        const totalLen = armLen + 10;
        obj.x = gripCanvasX + totalLen * Math.cos(gripRad);
        obj.y = gripCanvasY + totalLen * Math.sin(gripRad);
        obj.vx = 0;
        obj.vy = 0;
      } else {
        const config = window.SensorConfigs && window.SensorConfigs["grip"];
        const canInteract = config
          ? config.canInteractWithObject !== false
          : true;

        if (canInteract && typeof state.canvasObjects !== "undefined") {
          const totalLen = armLen + 10;
          const tipX = gripCanvasX + totalLen * Math.cos(gripRad);
          const tipY = gripCanvasY + totalLen * Math.sin(gripRad);

          state.canvasObjects.forEach((targetObj) => {
            if (state.grabbedObjects.includes(targetObj)) {
              return;
            }

            const dx = targetObj.x - tipX;
            const dy = targetObj.y - tipY;
            const dist = Math.hypot(dx, dy);
            const minDist = (targetObj.radius || 15) + 2;

            if (dist < minDist) {
              const angleToObj = Math.atan2(dy, dx);
              const overlap = minDist - dist;
              targetObj.x += Math.cos(angleToObj) * overlap;
              targetObj.y += Math.sin(angleToObj) * overlap;

              if (typeof robotDrive !== "undefined") {
                const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
                targetObj.vx += v * Math.cos(rad) * 0.8;
                targetObj.vy += v * Math.sin(rad) * 0.8;
              }
            }
          });
        }
      }
    }
  },
  drawCanvas: function (svg, grip, globals, index) {
    const isVisible =
      globals.sensorVisibility && globals.sensorVisibility["grip"] !== false;
    if (!isVisible) {
      return;
    }

    const rad = (globals.angle * Math.PI) / 180;
    const localX =
      globals.robotWidth / 2 - (grip.x / 100) * globals.robotWidth;
    const localY = (grip.y / 100) * globals.robotHeight;
    const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
    const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
    const canvasX = globals.robotX + rotatedX;
    const canvasY = globals.robotY + rotatedY;
    const globalAngle = globals.angle + (grip.angle || 0);

    const template = window.SensorTemplates && window.SensorTemplates["grip"];
    if (template) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = template;
      g.setAttribute(
        "transform",
        `translate(${canvasX}, ${canvasY}) rotate(${globalAngle})`,
      );

      const armLen = grip.armLength || 20;
      const jawLen = 10;
      const arm = g.querySelector(".grip-arm-el");
      const jawL = g.querySelector(".grip-jaw-l");
      const jawR = g.querySelector(".grip-jaw-r");
      if (arm) {
        arm.setAttribute("x2", armLen);
      }
      if (jawL) {
        jawL.setAttribute("x1", armLen);
        jawL.setAttribute("x2", armLen + jawLen);
      }
      if (jawR) {
        jawR.setAttribute("x1", armLen);
        jawR.setAttribute("x2", armLen + jawLen);
      }

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title",
      );
      title.textContent = `Grip ${index + 1}`;
      g.appendChild(title);

      svg.appendChild(g);
    }
  },
  getBounds: function (grip) {
    const sx =
      window.state.robotWidth / 2 - (grip.x / 100) * window.state.robotWidth;
    const sy = (grip.y / 100) * window.state.robotHeight;
    const rad = ((grip.angle || 0) * Math.PI) / 180;
    const armLen = grip.armLength || 20;
    return [
      { x: sx, y: sy },
      {
        x: sx + Math.cos(rad) * armLen,
        y: sy + Math.sin(rad) * armLen,
      },
      {
        x: sx + Math.cos(rad) * (armLen + 10),
        y: sy + Math.sin(rad) * (armLen + 10),
      },
    ];
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("grip", gripPlugin);
} else {
  window.SensorRegistry["grip"] = gripPlugin;
}

export default gripPlugin;
