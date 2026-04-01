import { state } from "../../core/index.js";
import { getPixelBrightness } from "./physics.js";
import { sensorPercentToLocal, sensorPercentToWorld } from "../../core/robot-pose.js";

const lightPlugin = {
  create(id, count) {
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
  drawPreview(svg, sensor) {
    const template = window.SensorTemplates && window.SensorTemplates.light;
    if (!template) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.innerHTML = template;
    const { localX, localY } = sensorPercentToLocal(
      sensor,
      state.robotWidth,
      state.robotHeight,
    );
    group.setAttribute("transform", `translate(${localX}, ${localY})`);
    group.classList.add("sensor-circle");

    const circle = group.querySelector("circle");
    if (circle) {
      circle.setAttribute("fill", sensor.color || "#ff0000ff");
      circle.setAttribute("stroke", sensor.color || "#ff0000ff");
    }

    svg.appendChild(group);
  },
  read(sensor, globals) {
    const { worldX: canvasX, worldY: canvasY } = sensorPercentToWorld(sensor, globals);

    return getPixelBrightness(canvasX, canvasY, sensor.color);
  },
  updateValue(id, axis, value) {
    window.updateSensorValueDOM(id, "light", axis, value);
  },
  deleteItem(id) {
    window.deleteSensor(id, "light");
  },
  drawCanvas(svg, sensor, globals, index) {
    const isVisible =
      globals.sensorVisibility && globals.sensorVisibility.light !== false;
    if (!isVisible) return;

    const { worldX: canvasX, worldY: canvasY } = sensorPercentToWorld(sensor, globals);

    const template = window.SensorTemplates && window.SensorTemplates.light;
    if (!template) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.innerHTML = template;
    group.setAttribute("transform", `translate(${canvasX}, ${canvasY})`);

    const circle = group.querySelector("circle");
    if (circle) {
      circle.setAttribute("fill", sensor.color || "#ff0000ff");
      circle.setAttribute("stroke", sensor.color || "#ff0000ff");
    }

    const brightness = state.canvasPixelData
      ? getPixelBrightness(canvasX, canvasY, sensor.color)
      : 512;
    sensor.value = brightness;

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
    group.appendChild(title);

    svg.appendChild(group);
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("light", lightPlugin);
} else {
  window.SensorRegistry.light = lightPlugin;
}

export default lightPlugin;
