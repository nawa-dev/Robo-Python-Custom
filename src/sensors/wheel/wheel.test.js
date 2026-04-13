import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
} from "../../../tests/helpers/test-environment.js";

const { default: wheelPlugin } = await importProjectModule("src/sensors/wheel/index.js");

test("wheel plugin exposes expected defaults and display names", () => {
  resetSimulatorState();

  const front = wheelPlugin.create("wheel_front", 0);
  const back = wheelPlugin.create("wheel_back", 1);

  assert.deepEqual(
    { type: front.type, motorPos: front.motorPos, wheelType: front.wheelType },
    { type: "wheel", motorPos: 0, wheelType: "normal" },
  );
  assert.equal(wheelPlugin.getDisplayName(front, 0), "FRONT WHEEL");
  assert.equal(wheelPlugin.getDisplayName(back, 1), "BACK WHEEL");
});
