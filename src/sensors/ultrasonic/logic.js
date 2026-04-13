import { state } from "../../core/index.js";
import { getUltrasonicDistance } from "./physics.js";

const ultrasonicPlugin = {
  create(id, count) {
    return {
      id,
      type: "ultrasonic",
      x: 0,
      y: 0,
      angle: 0,
      color: "#000000",
      name: `Ultra ${count}`,
      isNew: true,
    };
  },
  drawPreview(svg, sensor) {
    const template = window.SensorTemplates && window.SensorTemplates.ultrasonic;
    if (!template) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.innerHTML = template;
    const localX = state.robotWidth / 2 - (sensor.x / 100) * state.robotWidth;
    const localY = (sensor.y / 100) * state.robotHeight;
    group.setAttribute(
      "transform",
      `translate(${localX}, ${localY}) rotate(${sensor.angle || 0})`,
    );
    group.classList.add("sensor-circle");
    svg.appendChild(group);
  },
  read(sensor) {
    return Math.round(sensor.value || 0);
  },
  updateValue(id, axis, value) {
    window.updateSensorValueDOM(id, "ultrasonic", axis, value);
  },
  deleteItem(id) {
    window.deleteSensor(id, "ultrasonic");
  },
  drawCanvas(svg, sensor, globals, index) {
    const rad = (globals.angle * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    const localX = globals.robotWidth / 2 - (sensor.x / 100) * globals.robotWidth;
    const localY = (sensor.y / 100) * globals.robotHeight;
    const rotatedX = localX * cosAngle - localY * sinAngle;
    const rotatedY = localX * sinAngle + localY * cosAngle;
    const canvasX = globals.robotX + rotatedX;
    const canvasY = globals.robotY + rotatedY;
    const sensorGlobalAngle = globals.angle + (sensor.angle || 0);

    const dist = getUltrasonicDistance(
      canvasX,
      canvasY,
      sensorGlobalAngle,
      sensor.color || "#000000",
    );
    sensor.value = dist;

    const template = window.SensorTemplates && window.SensorTemplates.ultrasonic;
    if (!template) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.innerHTML = template;
    group.setAttribute(
      "transform",
      `translate(${canvasX}, ${canvasY}) rotate(${sensorGlobalAngle})`,
    );

    const isVisible =
      globals.sensorVisibility && globals.sensorVisibility.ultrasonic !== false;
    const ray = group.querySelector(".ultrasonic-ray");
    if (ray) {
      if (isVisible) {
        ray.setAttribute("x2", dist);
        ray.style.stroke = sensor.color || "#3498db";
      } else {
        ray.remove();
      }
    }

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} px`;
    group.appendChild(title);

    svg.appendChild(group);
  },
  getBounds(sensor) {
    const localX = state.robotWidth / 2 - (sensor.x / 100) * state.robotWidth;
    const localY = (sensor.y / 100) * state.robotHeight;
    const rad = ((sensor.angle || 0) * Math.PI) / 180;
    return [
      { x: localX, y: localY },
      {
        x: localX + Math.cos(rad) * 15,
        y: localY + Math.sin(rad) * 15,
      },
    ];
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("ultrasonic", ultrasonicPlugin);
} else {
  window.SensorRegistry.ultrasonic = ultrasonicPlugin;
}

export default ultrasonicPlugin;
