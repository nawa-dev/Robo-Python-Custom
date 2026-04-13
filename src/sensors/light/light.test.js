import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
  state,
} from "../../../tests/helpers/test-environment.js";

const { default: lightPlugin } = await importProjectModule("src/sensors/light/index.js");

test("light sensor API reads the matching light sensor with type-relative indexing", async () => {
  resetSimulatorState();

  state.robotX = 10;
  state.robotY = 20;
  state.angle = 30;
  state.sensors.push(
    { id: "l0", type: "light", x: 1, y: 2, color: "#f00", value: 0 },
    { id: "u0", type: "ultrasonic", value: 77 },
    { id: "l1", type: "light", x: 3, y: 4, color: "#0f0", value: 0 },
  );

  const seen = [];
  window.SensorRegistry.light = {
    read(sensor, globals) {
      seen.push({ sensor, globals });
      return sensor.id === "l0" ? 321 : 654;
    },
  };
  window.getSensorPlugin = () => window.SensorRegistry.light;

  const robotObj = {};
  lightPlugin.registerPythonAPI(Sk, robotObj);

  const first = await robotObj.analogRead(0);
  const second = await robotObj.analogRead(1);
  const missing = await robotObj.analogRead(9);

  assert.equal(first.v, 321);
  assert.equal(second.v, 654);
  assert.equal(missing.v, 0);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].sensor.id, "l0");
  assert.equal(seen[1].sensor.id, "l1");
  assert.equal(seen[0].globals.robotX, 10);
  assert.equal(seen[0].globals.robotY, 20);
  assert.equal(seen[0].globals.angle, 30);
});
