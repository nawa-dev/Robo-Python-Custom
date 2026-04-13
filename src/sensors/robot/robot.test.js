import test from "node:test";
import assert from "node:assert/strict";

import {
  getElement,
  importProjectModule,
  resetSimulatorState,
  state,
} from "../../../tests/helpers/test-environment.js";

const { default: robotPlugin } = await importProjectModule("src/sensors/robot/index.js");

test("robot settings coerce values and update preview-related DOM", () => {
  resetSimulatorState();

  const calls = [];
  window.updateRobotDOM = () => calls.push("updateRobotDOM");
  window.updateSensorDots = () => calls.push("updateSensorDots");
  window.updateSensorPreview = () => calls.push("updateSensorPreview");
  window.renderDynamicSensorsList = (type) => calls.push(`render:${type}`);
  window.SensorConfigs = { wheel: {}, light: {} };

  robotPlugin.updateValue("robotWidth", "123.4");
  robotPlugin.updateValue("robotUseMass", "true");
  robotPlugin.updateValue("robotImage", "robot.png");

  assert.equal(state.robotWidth, 123.4);
  assert.equal(state.robotUseMass, true);
  assert.match(getElement("preview-robot-robotImage").style.backgroundImage, /robot\.png/);
  assert.equal(getElement("wrapper-robot-robotImage").style.display, "inline-block");
  assert.ok(calls.includes("updateRobotDOM"));
  assert.ok(calls.includes("updateSensorDots"));
  assert.ok(calls.includes("updateSensorPreview"));
  assert.ok(calls.includes("render:wheel"));
  assert.ok(calls.includes("render:light"));
});
