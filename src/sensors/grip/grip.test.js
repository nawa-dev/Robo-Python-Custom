import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
} from "../../../tests/helpers/test-environment.js";

const { default: gripPlugin } = await importProjectModule("src/sensors/grip/index.js");

test("grip sensor API delegates grab and release to window handlers", () => {
  resetSimulatorState();

  const calls = [];
  window.grabObject = (index) => calls.push(["grab", index]);
  window.releaseObject = (index) => calls.push(["release", index]);

  const robotObj = {};
  gripPlugin.registerPythonAPI(Sk, robotObj);
  robotObj.grab(2);
  robotObj.release(1);

  assert.deepEqual(calls, [
    ["grab", 2],
    ["release", 1],
  ]);
});
