import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
  state,
} from "../../../tests/helpers/test-environment.js";

const { default: ultrasonicPlugin } = await importProjectModule("src/sensors/ultrasonic/index.js");

test("ultrasonic sensor API reads sensors by ultrasonic-only index", () => {
  resetSimulatorState();

  state.sensors.push(
    { id: "u0", type: "ultrasonic", value: 12.6 },
    { id: "l0", type: "light", value: 500 },
    { id: "u1", type: "ultrasonic", value: 99.2 },
  );

  const robotObj = {};
  ultrasonicPlugin.registerPythonAPI(Sk, robotObj);

  assert.equal(robotObj.getUltrasonic(0).v, 13);
  assert.equal(robotObj.getUltrasonic(1).v, 99);
  assert.equal(robotObj.getUltrasonic(8).v, 0);
  assert.equal(robotObj.ultrasonic(1).v, 99);
});
