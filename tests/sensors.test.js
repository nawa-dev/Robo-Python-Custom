import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSensorGlobals,
  createSvgRoot,
  importFileByPath,
  importProjectModule,
  resetSimulatorState,
  state,
} from "./helpers/test-environment.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const sensorsRoot = path.join(repoRoot, "src", "sensors");

async function listSensorNames() {
  const entries = await readdir(sensorsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function buildSampleSensor(sensorName, plugin) {
  if (typeof plugin.create === "function") {
    return plugin.create(`${sensorName}_1`, 1);
  }

  return {
    id: `${sensorName}_1`,
    type: sensorName,
    x: 25,
    y: 25,
    angle: 0,
    color: "#000000",
    armLength: 20,
    motorPos: 20,
    wheelType: "normal",
    value: 123,
  };
}

function bucketForSensor(sensorName, config) {
  if (config.targetArray === "grips") {
    return state.grips;
  }
  if (config.targetArray === "sensors" || config.singleton || !config.targetArray) {
    return state.sensors;
  }
  return state.sensors;
}

const sensorNames = await listSensorNames();

for (const sensorName of sensorNames) {
  const sensorDir = path.join(sensorsRoot, sensorName);
  const customEntries = await readdir(sensorDir, { withFileTypes: true });
  const customTests = customEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
    .map((entry) => path.join(sensorDir, entry.name));

  for (const customTestFile of customTests) {
    await importFileByPath(customTestFile);
  }
}

for (const sensorName of sensorNames) {
  const sensorDir = path.join(sensorsRoot, sensorName);
  const configPath = path.join(sensorDir, "config.json");
  const indexPath = path.join(sensorDir, "index.js");
  const logicPath = path.join(sensorDir, "logic.js");
  const executorPath = path.join(sensorDir, "executor.js");
  const renderPath = path.join(sensorDir, "render.html");

  test(`sensor ${sensorName} has the expected module files`, async () => {
    for (const filePath of [configPath, indexPath, logicPath, executorPath, renderPath]) {
      const info = await stat(filePath);
      assert.equal(info.isFile(), true, `${filePath} should exist`);
    }
  });

  test(`sensor ${sensorName} exports a usable plugin contract`, async () => {
    resetSimulatorState();

    const config = await readJson(configPath);
    window.SensorConfigs[sensorName] = config;
    window.SensorTemplates[sensorName] = `<g data-sensor="${sensorName}"><circle></circle><line class="ultrasonic-ray"></line><line class="grip-arm-el"></line><line class="grip-jaw-l"></line><line class="grip-jaw-r"></line><image></image></g>`;

    const sensorModule = await importProjectModule(`src/sensors/${sensorName}/index.js`);
    const plugin = sensorModule.default;

    assert.equal(typeof plugin, "object");
    window.SensorRegistry[sensorName] = plugin;
    assert.equal(window.SensorRegistry[sensorName], plugin);

    const sample = buildSampleSensor(sensorName, plugin);
    const bucket = bucketForSensor(sensorName, config);
    if (sample.type !== "robot" || sensorName !== "robot") {
      bucket.push(sample);
    }

    if (typeof plugin.create === "function") {
      assert.equal(sample.type, sensorName);
      assert.ok(sample.id);
    }

    const svg = createSvgRoot();
    const globals = buildSensorGlobals({
      sensorVisibility: {
        [sensorName]: true,
      },
    });

    if (typeof plugin.drawPreview === "function") {
      assert.doesNotThrow(() => plugin.drawPreview(svg, sample));
    }

    if (typeof plugin.drawCanvas === "function") {
      assert.doesNotThrow(() => plugin.drawCanvas(svg, sample, globals, 0));
    }

    if (typeof plugin.read === "function") {
      assert.doesNotThrow(() => plugin.read(sample, globals, 0));
    }

    if (typeof plugin.getDisplayName === "function") {
      const label = plugin.getDisplayName(sample, 0);
      assert.equal(typeof label, "string");
      assert.ok(label.length > 0);
    }

    if (typeof plugin.registerPythonAPI === "function") {
      const robotObj = {};
      assert.doesNotThrow(() =>
        plugin.registerPythonAPI(Sk, robotObj, {
          sensors: state.sensors,
          grips: state.grips,
        }),
      );

      if (Array.isArray(config.api)) {
        for (const api of config.api) {
          assert.equal(
            typeof robotObj[api.keyword],
            "function",
            `${sensorName} should register API ${api.keyword}`,
          );
        }
      }
    }
  });
}
