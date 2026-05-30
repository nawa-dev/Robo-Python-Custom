import { state } from "./variableGlobal.js";
import { getSensorPlugin } from "./sensor-plugin-registry.js";
import { clearConsole, logToConsole, showModal } from "../ui/ui-manager.js";
import {
  addCanvasObject,
  releaseAllObjects,
} from "./physics/object-physics.js";
import { resetDrive, setDriveTargets4 } from "./physics/drive-controller.js";

/**
 * Code Execution System with Skulpt (Python)
 * รองรับการหยุดรอ (simulating blocking calls) ด้วย Suspension
 */

// Global state for Skulpt
// let isRunning = false; // Used from variableGlobal.js
let executionPromise = null; // Promise ของ Sk.misceval.asyncToPromise
let stopRequest = false; // Stop flag for suspension-aware helpers
let runStartTime = null; // Time when run was clicked
const ENABLE_BROWSER_DEBUG_LOG = false;

function getPlugin(type) {
  return getSensorPlugin(type) || window.SensorRegistry[type];
}

function cloneForDebug(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function buildExecutionSnapshot(extra = {}) {
  return {
    timestamp: new Date().toISOString(),
    robot: {
      x: state.robotX,
      y: state.robotY,
      angle: state.angle,
      width: state.robotWidth,
      height: state.robotHeight,
      color: state.robotColor,
      image: state.robotImage,
      borderSize: state.robotBorderSize,
      borderColor: state.robotBorderColor,
      useMass: state.robotUseMass,
      mass: state.robotMass,
      renderPose: cloneForDebug(state.robotRenderPose),
    },
    motors: {
      left: state.motorL,
      right: state.motorR,
      frontLeft: state.motorFL,
      frontRight: state.motorFR,
      backLeft: state.motorBL,
      backRight: state.motorBR,
    },
    canvas: {
      zoom: state.zoom,
      cameraX: state.cameraX,
      cameraY: state.cameraY,
      dragMode: state.dragMode,
      physicsEngine: state.physicsEngine,
    },
    objects: {
      canvasObjects: cloneForDebug(state.canvasObjects),
      grabbedObjects: cloneForDebug(state.grabbedObjects),
      grips: cloneForDebug(state.grips),
    },
    sensors: cloneForDebug(state.sensors),
    flags: {
      isRunning: state.isRunning,
      isDragging: state.isDragging,
      stopRequest,
    },
    ...extra,
  };
}

function debugRunLog(label, payload) {
  if (!ENABLE_BROWSER_DEBUG_LOG) return;
  if (!window.console || typeof window.console.log !== "function") return;

  const prefix = "[Robot Run Debug]";
  if (payload === undefined) {
    console.log(`${prefix} ${label}`);
    return;
  }
  console.log(`${prefix} ${label}`, payload);
}

/* =========================
 * Run user code (Python)
 * ========================= */
function runCode() {
  if (typeof Sk === "undefined") {
    logToConsole("Error: Skulpt library not loaded.", "error");
    return;
  }

  // เตรียมสถานะ
  if (typeof window.autoSaveToWebStorage === "function") {
    window.autoSaveToWebStorage();
  }
  stopProgram(); // หยุดโปรแกรมเดิมถ้ามีวิ่งอยู่
  clearConsole();

  if (!window.editor) {
    logToConsole("Error: Editor is not ready yet.", "error");
    return;
  }

  const code = window.editor.getValue();
  state.isRunning = true;
  stopRequest = false;
  runStartTime = Date.now();
  updateRunStopButtonIO("stop");

  logToConsole("Starting Python execution...", "info");

  // ตั้งค่า Skulpt
  Sk.configure({
    output: (text) => {
      // Skulpt จะส่ง output มาที่นี่ (เช่น print)
      // ตัด newline ท้ายคำออกถ้ามี เพราะ logToConsole สร้างบรรทัดใหม่ให้แล้ว
      if (text.endsWith("\n")) text = text.slice(0, -1);
      if (text) {
        logToConsole(text);
        debugRunLog("Python output", text);
      }
    },
    read: builtinRead,
    __future__: Sk.python3, // ใช้ Python 3 syntax
  });

  // Prepend imports to make usage simpler for the user
  // This allows calling motor(), delay() directly without imports
  // delay(ms) is added to match the previous JS API (milliseconds)
  const headerCode = "from robot import *\n";

  // Inject automatic delay(1) into while loops to prevent freezing
  const processedCode = preprocessCode(code);
  const finalCode = headerCode + processedCode;

  if (ENABLE_BROWSER_DEBUG_LOG) {
    console.groupCollapsed("[Robot Run Debug] Run started");
    debugRunLog(
      "Execution snapshot before start",
      buildExecutionSnapshot({
        editor: {
          codeLength: code.length,
          processedCodeLength: processedCode.length,
          finalCodeLength: finalCode.length,
        },
      }),
    );
    debugRunLog("Original code", code);
    debugRunLog("Processed code", processedCode);
    debugRunLog("Final code", finalCode);
    console.groupEnd();
  }

  // รันโค้ด
  executionPromise = Sk.misceval
    .asyncToPromise(() => {
      return Sk.importMainWithBody("<stdin>", false, finalCode, true);
    })
    .then((mod) => {
      if (state.isRunning) {
        logToConsole("Program finished.", "info");
      }
      debugRunLog("Program finished", buildExecutionSnapshot());
    })
    .catch((err) => {
      if (err.toString().includes("StopExecution")) {
        logToConsole("Program stopped.", "info");
        debugRunLog(
          "Program stopped",
          buildExecutionSnapshot({
            reason: err.toString(),
          }),
        );
      } else {
        logToConsole("Runtime Error: " + err.toString(), "error");
        if (ENABLE_BROWSER_DEBUG_LOG) {
          console.error(
            "[Robot Run Debug] Runtime error",
            err,
            buildExecutionSnapshot(),
          );
        }
      }
    })
    .finally(() => {
      debugRunLog("Execution cleanup", buildExecutionSnapshot());
      state.isRunning = false;
      stopProgram();
    });
}

/**
 * Preprocess Python code to inject delay(5) into while loops.
 * This prevents the browser from freezing (infinite loops) without using yieldLimit.
 * Supports:
 * - Block while: while True:\n    ... -> while True:\n    delay(5)\n    ...
 * - Inline while: while True: print(1) -> while True: delay(5); print(1)
 */
function preprocessCode(code) {
  const lines = code.split("\n");
  let result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for 'while' statement (basic regex, ignores strings/comments for simplicity)
    // Matches: whitespace + while + condition + :
    if (/^\s*while\s+.*:/.test(line)) {
      // Case 1: Inline while (e.g. while 1: print(1))
      // Check if there is content after the colon
      const parts = line.split(":");
      const afterColon = parts.slice(1).join(":").trim();

      if (afterColon.length > 0 && !afterColon.startsWith("#")) {
        // Determine indentation of the while statement
        const loopIndentMatch = line.match(/^(\s*)/);
        const loopIndent = loopIndentMatch ? loopIndentMatch[1] : "";

        // Reconstruct: "while ... : delay(1); ..."
        // parts[0] is "while ..."
        const preColon = parts[0];

        // Need to be careful with nested colons? regex is safer.
        // Improve regex to capture pre-colon and post-colon
        const matchIndex = line.indexOf(":");
        const declaration = line.substring(0, matchIndex + 1);
        const content = line.substring(matchIndex + 1);

        result.push(`${declaration} delay(1); ${content}`);
        continue;
      }

      // Case 2: Block while (e.g. while 1:\n    ...)
      result.push(line);

      // Look ahead for the next non-empty line to find indentation
      let nextLineIndex = i + 1;
      let nextIndent = "";

      while (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex];
        if (nextLine.trim().length > 0 && !nextLine.trim().startsWith("#")) {
          const indentMatch = nextLine.match(/^(\s+)/);
          if (indentMatch) {
            nextIndent = indentMatch[1];
          }
          break;
        }
        nextLineIndex++;
      }

      // If found valid indentation, inject delay
      if (nextIndent) {
        result.push(`${nextIndent}delay(1)`);
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

function stopProgram() {
  const wasRunning = state.isRunning;
  if (state.isRunning) {
    stopRequest = true; // บอกให้ custom functions รู้ว่าต้องหยุด
    state.isRunning = false;
    logToConsole("Stopping...", "info");
  }
  state.motorL = 0;
  state.motorR = 0;
  state.motorFL = 0;
  state.motorFR = 0;
  state.motorBL = 0;
  state.motorBR = 0;
  resetDrive();
  releaseAllObjects();
  updateRunStopButtonIO("run");

  if (wasRunning || stopRequest) {
    debugRunLog("stopProgram invoked", buildExecutionSnapshot());
  }
}

window.resetPosition = resetPosition;
function resetPosition() {
  stopProgram();
  state.robotX = 100;
  state.robotY = 100;
  state.angle = 0;
  if (typeof window.updateRobotDOM === "function") {
    window.updateRobotDOM();
  }
  if (
    window.physicsAdapter &&
    typeof window.physicsAdapter.reset === "function"
  ) {
    window.physicsAdapter.reset();
  }
  logToConsole("Robot position reset.", "info");

  // --- DYNAMIC HOOK: onReset ---
  if (window.SensorConfigs) {
    Object.keys(window.SensorConfigs).forEach((type) => {
      const registry = getPlugin(type);
      if (registry && typeof registry.onReset === "function") {
        registry.onReset({
          sensors: typeof state.sensors !== "undefined" ? state.sensors : [],
          grips: typeof state.grips !== "undefined" ? state.grips : [],
        });
      }
    });
  }
}

/* =========================
 * Toggle Run/Stop Logic
 * ========================= */
window.toggleRunStop = toggleRunStop;
function toggleRunStop() {
  if (state.isRunning) {
    stopProgram();
  } else {
    runCode();
  }
}

function updateRunStopButtonIO(state) {
  const btn = document.getElementById("run-stop-btn");
  if (!btn) return;

  if (state === "run") {
    // Show "Run"
    btn.innerHTML = '<i class="fas fa-play"></i> Run';
    btn.className = "btn-run";
  } else {
    // Show "Stop"
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    btn.className = "btn-stop";
  }
}

// Expose functions to global scope for HTML buttons
window.runCode = runCode;
window.stopProgram = stopProgram;
window.resetPosition = resetPosition;
window.toggleRunStop = toggleRunStop;

/* =========================
 * Skulpt Module Loader
 * ========================= */
/* =========================
 * Skulpt Module Loader
 * ========================= */
function builtinRead(x) {
  // logToConsole("Loading: " + x); // Debug logging

  if (x === "src/lib/robot.js" || x.endsWith("/robot.js")) {
    // --- DYNAMIC HOOK: Allow sensors to register custom Python functions ---
    if (window.SensorConfigs) {
      Object.keys(window.SensorConfigs).forEach((type) => {
        const registry = getPlugin(type);
        if (registry && typeof registry.registerPythonAPI === "function") {
          registry.registerPythonAPI(Sk, Sk.builtins.robot, {
            sensors: typeof state.sensors !== "undefined" ? state.sensors : [],
            grips: typeof state.grips !== "undefined" ? state.grips : [],
          });
        }
      });
    }

    // Skulpt expects a $builtinmodule function when loading a JS module.
    // We bridge it to our manually defined Sk.builtins.robot.
    return "var $builtinmodule = function(name) { return Sk.builtins.robot; };";
  }

  if (x === "src/lib/robot.py" || x.endsWith("/robot.py")) {
    return "pass";
  }

  if (
    Sk.builtinFiles === undefined ||
    Sk.builtinFiles["files"][x] === undefined
  ) {
    if (Sk.externalLibraries && Sk.externalLibraries[x]) {
      return Sk.externalLibraries[x].code();
    }
    throw "File not found: '" + x + "'";
  }
  return Sk.builtinFiles["files"][x];
}

// Register custom module 'robot'
// นี่คือวิธีที่ Skulpt ใช้สำหรับ built-in modules ที่เขียนด้วย JS
Sk.builtins.robot = {
  __name__: new Sk.builtin.str("robot"),

  // motor(left, right)
  motor: new Sk.builtin.func(function (left, right) {
    Sk.builtin.pyCheckArgs("motor", arguments, 2, 2);
    if (stopRequest) throw "StopExecution";

    let l = Sk.builtin.asnum$(left);
    let r = Sk.builtin.asnum$(right);

    // Update global motors (Set front and back same for 2-channel call)
    state.motorL = l;
    state.motorR = r;
    state.motorFL = l;
    state.motorBL = l;
    state.motorFR = r;
    state.motorBR = r;

    setDriveTargets4(l, r, l, r);
    debugRunLog("motor()", {
      input: { left: l, right: r },
      motors: buildExecutionSnapshot().motors,
    });

    return Sk.builtin.none.none$;
  }),

  // motor4(fl, fr, bl, br)
  motor4: new Sk.builtin.func(function (fl, fr, bl, br) {
    Sk.builtin.pyCheckArgs("motor4", arguments, 4, 4);
    if (stopRequest) throw "StopExecution";

    let vFL = Sk.builtin.asnum$(fl);
    let vFR = Sk.builtin.asnum$(fr);
    let vBL = Sk.builtin.asnum$(bl);
    let vBR = Sk.builtin.asnum$(br);

    // Update global motors
    state.motorFL = vFL;
    state.motorFR = vFR;
    state.motorBL = vBL;
    state.motorBR = vBR;

    // Sync legacy motorL/motorR for general use
    state.motorL = (vFL + vBL) / 2;
    state.motorR = (vFR + vBR) / 2;

    setDriveTargets4(vFL, vFR, vBL, vBR);
    debugRunLog("motor4()", {
      input: { frontLeft: vFL, frontRight: vFR, backLeft: vBL, backRight: vBR },
      motors: buildExecutionSnapshot().motors,
    });

    return Sk.builtin.none.none$;
  }),

  // SW(n) -> bool
  SW: new Sk.builtin.func(function (n) {
    Sk.builtin.pyCheckArgs("SW", arguments, 1, 1);
    let i = Sk.builtin.asnum$(n) - 1;
    const pressed = i >= 0 && i < swStates.length ? swStates[i] : false;
    debugRunLog("SW()", {
      button: i + 1,
      pressed,
      allSwitches: [...swStates],
    });
    if (i >= 0 && i < swStates.length) {
      return new Sk.builtin.bool(swStates[i]);
    }
    return Sk.builtin.bool.false$;
  }),

  // waitSW(n) -> blocking
  waitSW: new Sk.builtin.func(function (n) {
    Sk.builtin.pyCheckArgs("waitSW", arguments, 1, 1);
    let btnIndex = Sk.builtin.asnum$(n) - 1;
    debugRunLog("waitSW() start", {
      button: btnIndex + 1,
      allSwitches: [...swStates],
    });

    let promise = new Promise(function (resolve, reject) {
      function checkBtn() {
        if (stopRequest) {
          // Rejecting leads to an error in Python, usually we just want to stop.
          // Throwing StopExecution exception string is handled in runCode catch block.
          reject("StopExecution");
          return;
        }
        if (btnIndex >= 0 && btnIndex < swStates.length && swStates[btnIndex]) {
          debugRunLog("waitSW() resolved", {
            button: btnIndex + 1,
            allSwitches: [...swStates],
          });
          resolve(Sk.builtin.none.none$);
        } else {
          setTimeout(checkBtn, 50);
        }
      }
      checkBtn();
    });

    return new Sk.misceval.promiseToSuspension(promise);
  }),

  // delay(ms)
  delay: new Sk.builtin.func(function (ms) {
    Sk.builtin.pyCheckArgs("delay", arguments, 1, 1);
    let duration = Sk.builtin.asnum$(ms);
    debugRunLog("delay()", {
      duration,
      isRunning: state.isRunning,
    });

    let promise = new Promise(function (resolve, reject) {
      // Initial check
      if (stopRequest) {
        reject("StopExecution");
        return;
      }

      setTimeout(() => {
        // Check again when waking up
        if (stopRequest) {
          reject("StopExecution");
        } else {
          resolve(Sk.builtin.none.none$);
        }
      }, duration);
    });

    return new Sk.misceval.promiseToSuspension(promise);
  }),

  // getSensorCount()
  getSensorCount: new Sk.builtin.func(function () {
    debugRunLog("getSensorCount()", {
      count: state.sensors.length,
    });
    return new Sk.builtin.int_(state.sensors.length);
  }),

  // grab: MOVED to grip/logic.js
  // release: MOVED to grip/logic.js

  // spawn_object(color)
  spawn_object: new Sk.builtin.func(function (color) {
    Sk.builtin.pyCheckArgs("spawn_object", arguments, 1, 1);
    if (stopRequest) throw "StopExecution";
    let c = color;
    if (color && typeof color.v === "string") {
      c = color.v;
    } else {
      c = Sk.builtin.asnum$(color);
    }
    addCanvasObject(c);
    debugRunLog("spawn_object()", {
      color: c,
      canvasObjects: cloneForDebug(state.canvasObjects),
    });
  }),

  // finish()
  finish: new Sk.builtin.func(function () {
    if (stopRequest) throw "StopExecution";
    let elapsedMs = Date.now() - runStartTime;
    let elapsedSec = (elapsedMs / 1000).toFixed(2);
    
    stopRequest = true; // Signals everything to stop
    
    let title = window.i18n ? window.i18n.t("execution.finished") : "Execution Finished";
    let messageTemplate = window.i18n ? window.i18n.t("execution.total_time") : "Total execution time: {time} seconds.";
    let message = messageTemplate.replace("{time}", elapsedSec);

    showModal(title, message);
    
    debugRunLog("finish() called", { time: elapsedSec });
    throw "StopExecution";
  }),
};

// --- DYNAMIC HOOK MOVED TO builtinRead ---

/* ==================
 * Override time.sleep to use Browser Logic
 * ================== */
// เราต้องเตรียม library 'time' ให้ Skulpt หรือ override function sleep
// วิธีง่ายสุดคือเพิ่ม built-ins ผ่าน configuration หรือ hack module

// สร้าง module wrapper สำหรับ custom libraries
/* ==================
 * External Libraries Configuration
 * ================== */
Sk.externalLibraries = Sk.externalLibraries || {};

// Inject 'robot' module
// เมื่อ Skulpt เจอ 'import robot', มันจะเรียก builtinRead ด้วย 'src/lib/robot.js' (หรือ path ที่ config)
// แต่เราจะดักจับใน builtinRead ให้ return code แทน
// การใช้ Sk.builtins.robot โดยตรงทำให้ไม่ต้องโหลดไฟล์ซ้ำซ้อน
// แต่การใส่ใน builtins ไม่ได้ทำให้ import ทำงานอัตโนมัติเสมอไปถ้าไม่ได้ config read function ให้ถูก
// วิธีที่ง่ายที่สุดคือปล่อยให้มันหาไฟล์ไม่เจอ แล้วเรา return dummy code
// แล้ว Skulpt จะไปโหลด property จาก Sk.builtins.robot เอง

// ส่วน Button States logic
let swStates = [false, false, false];
const swIds = ["button1", "button2", "button3"];
swIds.forEach((id, index) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("mousedown", () => {
      swStates[index] = true;
      logToConsole(`SW${index + 1} Pressed`);
      debugRunLog("Switch pressed", {
        button: index + 1,
        allSwitches: [...swStates],
      });
    });
    btn.addEventListener("mouseup", () => {
      swStates[index] = false;
      debugRunLog("Switch released", {
        button: index + 1,
        allSwitches: [...swStates],
      });
    });
    btn.addEventListener("mouseleave", () => {
      swStates[index] = false;
      debugRunLog("Switch released", {
        button: index + 1,
        allSwitches: [...swStates],
        reason: "mouseleave",
      });
    });
  }
});

const executorApi = {
  builtinRead,
  preprocessCode,
  resetPosition,
  runCode,
  stopProgram,
  toggleRunStop,
};

export {
  builtinRead,
  executorApi,
  preprocessCode,
  resetPosition,
  runCode,
  stopProgram,
  toggleRunStop,
};
