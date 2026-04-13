import test from "node:test";
import assert from "node:assert/strict";

import {
  importProjectModule,
  resetSimulatorState,
  state,
} from "../../../tests/helpers/test-environment.js";

const { default: objectPlugin } = await importProjectModule("src/sensors/object/index.js");

test("object sensor settings propagate mass and friction to existing canvas objects", () => {
  resetSimulatorState();

  const updates = [];
  globalThis.updateObjectsDOM = () => updates.push("updated");
  state.canvasObjects = [
    { mass: 1, friction: 0.5 },
    { mass: 1, friction: 0.5 },
  ];

  objectPlugin.updateValue("objectMass", 3.5);
  objectPlugin.updateValue("objectFriction", 0.25);

  assert.equal(state.objectMass, 3.5);
  assert.equal(state.objectFriction, 0.25);
  assert.deepEqual(
    state.canvasObjects.map((obj) => ({ mass: obj.mass, friction: obj.friction })),
    [
      { mass: 3.5, friction: 0.25 },
      { mass: 3.5, friction: 0.25 },
    ],
  );
  assert.equal(updates.length, 2);
});
