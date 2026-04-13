import test from "node:test";
import assert from "node:assert/strict";
import {
  getElement,
  importProjectModule,
  resetSimulatorState,
  state,
} from "./helpers/test-environment.js";

const executorModule = await importProjectModule("src/core/executor.js");

const {
  builtinRead,
  preprocessCode,
  resetPosition,
  stopProgram,
} = executorModule;

test.beforeEach(() => {
  resetSimulatorState();
});

test("preprocessCode injects delay into block while loops", () => {
  const source = ["while True:", "    print('tick')"].join("\n");

  const processed = preprocessCode(source);

  assert.equal(processed, ["while True:", "    delay(1)", "    print('tick')"].join("\n"));
});

test("preprocessCode injects delay into inline while loops", () => {
  const processed = preprocessCode("while x < 10: print(x)");

  assert.equal(processed, "while x < 10: delay(1);  print(x)");
});

test("builtinRead returns robot bridge and lets plugins register Python API", () => {
  let pluginContext = null;
  window.SensorConfigs = { ultrasonic: {} };
  window.SensorRegistry.ultrasonic = {
    registerPythonAPI(sk, robotBuiltins, context) {
      pluginContext = { sk, robotBuiltins, context };
    },
  };

  const result = builtinRead("src/lib/robot.js");

  assert.match(result, /\$builtinmodule/);
  assert.equal(pluginContext.sk, Sk);
  assert.equal(pluginContext.robotBuiltins, Sk.builtins.robot);
  assert.deepEqual(pluginContext.context.sensors, state.sensors);
  assert.deepEqual(pluginContext.context.grips, state.grips);
});

test("builtinRead resolves external libraries and throws when file is missing", () => {
  Sk.externalLibraries.helper = {
    code() {
      return "helper-code";
    },
  };

  assert.equal(builtinRead("helper"), "helper-code");
  assert.throws(() => builtinRead("missing.py"), /File not found/);
});

test("stopProgram clears motors, releases grabbed objects, and restores run button", () => {
  state.isRunning = true;
  state.motorL = 10;
  state.motorR = 20;
  state.motorFL = 30;
  state.motorFR = 40;
  state.motorBL = 50;
  state.motorBR = 60;
  const grabbed = { isGrabbed: true };
  state.grabbedObjects = [grabbed];

  stopProgram();

  assert.equal(state.isRunning, false);
  assert.equal(state.motorL, 0);
  assert.equal(state.motorR, 0);
  assert.equal(state.motorFL, 0);
  assert.equal(state.motorFR, 0);
  assert.equal(state.motorBL, 0);
  assert.equal(state.motorBR, 0);
  assert.equal(state.grabbedObjects.length, 0);
  assert.equal(grabbed.isGrabbed, false);
  assert.equal(getElement("run-stop-btn").className, "btn-run");
});

test("resetPosition restores default pose and notifies plugins and adapters", () => {
  const calls = [];
  state.robotX = 999;
  state.robotY = 555;
  state.angle = 90;
  state.sensors = [{ id: "robot_instance", type: "robot", index: 0 }, { id: "u1", type: "ultrasonic", index: 1 }];
  state.grips = [{ id: "g1", type: "grip", index: 0 }];
  window.updateRobotDOM = () => calls.push("updateRobotDOM");
  window.physicsAdapter = {
    reset() {
      calls.push("physicsReset");
    },
  };
  window.SensorConfigs = { ultrasonic: {}, grip: {} };
  window.SensorRegistry.ultrasonic = {
    onReset(payload) {
      calls.push(["ultrasonic", payload]);
    },
  };
  window.SensorRegistry.grip = {
    onReset(payload) {
      calls.push(["grip", payload]);
    },
  };

  resetPosition();

  assert.equal(state.robotX, 100);
  assert.equal(state.robotY, 100);
  assert.equal(state.angle, 0);
  assert.deepEqual(calls[0], "updateRobotDOM");
  assert.deepEqual(calls[1], "physicsReset");
  assert.deepEqual(calls[2], [
    "ultrasonic",
    { sensors: state.sensors, grips: state.grips },
  ]);
  assert.deepEqual(calls[3], [
    "grip",
    { sensors: state.sensors, grips: state.grips },
  ]);
});
