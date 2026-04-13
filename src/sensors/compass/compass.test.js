import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
  state,
} from "../../../tests/helpers/test-environment.js";

const { default: compassPlugin } = await importProjectModule("src/sensors/compass/index.js");

test("compass sensor API returns rounded angle only when a compass exists", () => {
  resetSimulatorState();
  state.angle = 91.6;

  const robotObj = {};
  compassPlugin.registerPythonAPI(Sk, robotObj);

  assert.equal(robotObj.getCompass().v, 0);

  state.sensors.push({ id: "compass_1", type: "compass" });
  assert.equal(robotObj.getCompass().v, 92);
  assert.equal(robotObj.compass().v, 92);
});
