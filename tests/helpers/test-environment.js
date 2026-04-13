import { pathToFileURL } from "node:url";

function createClassList() {
  return {
    add() {},
    remove() {},
    contains() {
      return false;
    },
  };
}

function createElement(overrides = {}) {
  return {
    style: {},
    className: "",
    innerHTML: "",
    innerText: "",
    textContent: "",
    scrollTop: 0,
    scrollHeight: 0,
    offsetWidth: 800,
    offsetHeight: 600,
    children: [],
    listeners: {},
    attributes: {},
    parentElement: {
      querySelector() {
        return createElement();
      },
      offsetWidth: 800,
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    removeEventListener(type) {
      delete this.listeners[type];
    },
    appendChild(child) {
      this.children.push(child);
      this.lastChild = child;
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      return child;
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    setAttributeNS(_ns, name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector() {
      return createElement();
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { bottom: 500, height: 400, width: 300 };
    },
    classList: createClassList(),
    ...overrides,
  };
}

let initialized = false;
let elements;

function clearObject(target) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
}

function ensureElement(id, overrides = {}) {
  if (!elements.has(id)) {
    elements.set(id, createElement(overrides));
  }
  return elements.get(id);
}

function setupDom() {
  elements = new Map();

  ensureElement("robot");
  ensureElement("canvas-area", { offsetWidth: 800, offsetHeight: 600 });
  ensureElement("run-stop-btn");
  ensureElement("button1");
  ensureElement("button2");
  ensureElement("button3");
  ensureElement("console-output", {
    appendChild(child) {
      this.children.push(child);
      this.lastChild = child;
      this.scrollTop = this.scrollHeight;
      return child;
    },
  });
  ensureElement("preview-svg");
  ensureElement("preview-robot-robotImage");
  ensureElement("wrapper-robot-robotImage");
  ensureElement("robot-preview-body-rect");
  ensureElement("motor-left");
  ensureElement("motor-right");
  ensureElement("motor-left-back");
  ensureElement("motor-right-back");

  globalThis.document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector() {
      return createElement();
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return createElement();
    },
    createElementNS() {
      return createElement();
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

function setupSk() {
  class SkBool {
    constructor(value) {
      this.v = Boolean(value);
    }
  }

  SkBool.false$ = new SkBool(false);

  globalThis.Sk = {
    builtin: {
      str: class {
        constructor(value) {
          this.v = value;
        }
      },
      func: function (fn) {
        return fn;
      },
      pyCheckArgs() {},
      asnum$(value) {
        if (value && typeof value === "object" && "v" in value) {
          return value.v;
        }
        return value;
      },
      none: {
        none$: { __type: "none" },
      },
      bool: SkBool,
      int_: class {
        constructor(value) {
          this.v = value;
        }
      },
    },
    builtins: {},
    builtinFiles: {
      files: {
        "sys.py": "print('ok')",
      },
    },
    externalLibraries: {},
    misceval: {
      promiseToSuspension: function (promise) {
        this.promise = promise;
        return promise;
      },
      asyncToPromise(callback) {
        return Promise.resolve().then(callback);
      },
    },
    configure() {},
    importMainWithBody() {
      return {};
    },
    python3: {},
  };
}

export function initializeTestEnvironment() {
  if (initialized) {
    return;
  }

  globalThis.window = globalThis;
  globalThis.console = console;
  globalThis.setTimeout = setTimeout;
  globalThis.clearTimeout = clearTimeout;
  globalThis.fetch = async () => {
    throw new Error("fetch is not available in unit tests");
  };
  globalThis.window.addEventListener = function () {};
  globalThis.window.removeEventListener = function () {};
  globalThis.window.autoSaveToWebStorage = undefined;
  globalThis.window.editor = undefined;
  globalThis.window.SensorSettings = { visibility: {} };
  globalThis.Matter = {
    Engine: {
      create() {
        return { world: {} };
      },
      update() {},
    },
    Bodies: {
      rectangle() {
        return {};
      },
      circle() {
        return {};
      },
    },
    Composite: {
      clear() {},
      add() {},
    },
    Body: {
      setAngle() {},
      setVelocity() {},
      setAngularVelocity() {},
      setPosition() {},
    },
  };

  setupDom();
  setupSk();
  initialized = true;
}

initializeTestEnvironment();

const variableGlobalModule = await import("../../src/core/variableGlobal.js");
const { state } = variableGlobalModule;

export function getElement(id) {
  return ensureElement(id);
}

export function createSvgRoot() {
  return createElement({
    appendChild(child) {
      this.children.push(child);
      return child;
    },
  });
}

export function buildSensorGlobals(overrides = {}) {
  return {
    robotX: state.robotX,
    robotY: state.robotY,
    angle: state.angle,
    dt: 1 / 60,
    robotWidth: state.robotWidth,
    robotHeight: state.robotHeight,
    robotRenderPose: state.robotRenderPose,
    sensorVisibility: { ...window.SensorSettings.visibility },
    ...overrides,
  };
}

export function resetSimulatorState() {
  state.robotX = 400;
  state.robotY = 300;
  state.angle = 0;
  state.motorL = 0;
  state.motorR = 0;
  state.motorFL = 0;
  state.motorFR = 0;
  state.motorBL = 0;
  state.motorBR = 0;
  state.isRunning = false;
  state.isDragging = false;
  state.sensors = [{ id: "robot_instance", type: "robot", index: 0 }];
  state.grips = [];
  state.canvasObjects = [];
  state.grabbedObjects = [];
  state.zoom = 1;
  state.cameraX = 0;
  state.cameraY = 0;
  state.dragMode = false;
  state.robotWidth = 50;
  state.robotHeight = 50;
  state.robotColor = "#ff4757";
  state.robotImage = "";
  state.robotBorderSize = 1;
  state.robotBorderColor = "#333333";
  state.robotUseMass = false;
  state.robotMass = 1;
  state.objectMass = 1;
  state.objectFriction = 0.92;
  state.physicsEngine = "custom";
  state.matterState = {
    engine: null,
    world: null,
    robotBody: null,
    objectBodies: new Map(),
    wallBodies: [],
  };
  state.motorPos = 0;
  state.robotRenderPose = null;
  state.canvasPixelData = null;

  window.SensorRegistry = window.SensorRegistry || {};
  window.SensorTemplates = window.SensorTemplates || {};
  window.SensorPreviewTemplates = window.SensorPreviewTemplates || {};
  window.SensorConfigs = window.SensorConfigs || {};
  clearObject(window.SensorRegistry);
  clearObject(window.SensorTemplates);
  clearObject(window.SensorPreviewTemplates);
  clearObject(window.SensorConfigs);
  window.SensorSettings = { visibility: {} };
  window.physicsAdapter = undefined;
  window.updateRobotDOM = undefined;
  window.updateSensorDots = undefined;
  window.updateSensorPreview = undefined;
  window.renderDynamicSensorsList = undefined;
  window.updateSensorValueDOM = undefined;
  window.deleteSensor = undefined;
  window.syncWheelDOM = undefined;
  window.grabObject = undefined;
  window.releaseObject = undefined;
  window.updateObjectsDOM = undefined;

  Sk.externalLibraries = {};

  const runStopBtn = ensureElement("run-stop-btn");
  runStopBtn.innerHTML = "";
  runStopBtn.className = "";

  const consoleOutput = ensureElement("console-output");
  consoleOutput.children = [];
  consoleOutput.lastChild = undefined;

  ensureElement("preview-robot-robotImage").style = {};
  ensureElement("wrapper-robot-robotImage").style = {};
}

export async function importProjectModule(relativePath) {
  const url = new URL(`../../${relativePath}`, import.meta.url);
  return import(url.href);
}

export async function importFileByPath(filePath) {
  return import(pathToFileURL(filePath).href);
}

export { state };
