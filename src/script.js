/**
 * ROBOT IDE SIMULATOR - Core Script
 * Main initialization and UI event handlers
 */

// ส่วนที่ 1: Monaco Editor Setup
let editor;
let currentFontSize = 16;

require.config({
  paths: {
    vs: "src/cdn_file/monaco-editor/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("monaco-container"), {
    value: [
      "print('Robot Start')",
      "",
      "while True:",
      "    motor(60, 60)",
      "    delay(200)",
      "",
      "    motor(60, -60)",
      "    delay(50)",
      "",
      "motor(0, 0)",
    ].join("\n"),
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: currentFontSize,
    minimap: { enabled: false },
  });

  // ✅ ซูมเฉพาะ Monaco (Ctrl + Scroll)
  editor.onMouseWheel((e) => {
    // ✅ ใช้ ctrlKey ของ Monaco event
    if (!e.ctrlKey) return;

    e.preventDefault?.(); // เผื่อ browser รองรับ
    e.stopPropagation?.();

    if (e.deltaY < 0) {
      currentFontSize += 1;
    } else {
      currentFontSize -= 1;
    }

    currentFontSize = Math.max(10, Math.min(30, currentFontSize));

    editor.updateOptions({
      fontSize: currentFontSize,
    });
  });
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, // Ctrl +
    () => {
      zoomIn();
    },
  );

  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, // Ctrl -
    () => {
      zoomOut();
    },
  );

  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, // Ctrl 0
    () => {
      resetZoom();
    },
  );

  // ================= Zoom Functions =================
  function zoomIn() {
    currentFontSize = Math.min(30, currentFontSize + 1);
    editor.updateOptions({ fontSize: currentFontSize });
  }

  function zoomOut() {
    currentFontSize = Math.max(10, currentFontSize - 1);
    editor.updateOptions({ fontSize: currentFontSize });
  }

  function resetZoom() {
    currentFontSize = 16;
    editor.updateOptions({ fontSize: currentFontSize });
  }
  editor.addAction({
    id: "zoom-in",
    label: "Zoom In",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1,
    run: function () {
      currentFontSize = Math.min(30, currentFontSize + 1);
      editor.updateOptions({ fontSize: currentFontSize });
    },
  });

  editor.addAction({
    id: "zoom-out",
    label: "Zoom Out",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 2,
    run: function () {
      currentFontSize = Math.max(10, currentFontSize - 1);
      editor.updateOptions({ fontSize: currentFontSize });
    },
  });

  editor.addAction({
    id: "zoom-reset",
    label: "Reset Zoom",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3,
    run: function () {
      currentFontSize = 16;
      editor.updateOptions({ fontSize: currentFontSize });
    },
  });

  setupRobotHighlighting(editor);
  setupAutocomplete();
});

// ตั้งค่าการไฮไลต์สำหรับ Robot API
function getDynamicAPIKeywords() {
  const baseKeywords = ["motor", "delay", "sleep", "analogRead", "getSensorCount", "print", "spawn_object"];
  if (window.SensorConfigs) {
    Object.values(window.SensorConfigs).forEach(config => {
      if (config.api && Array.isArray(config.api)) {
        config.api.forEach(apiDef => {
          if (apiDef.keyword && !baseKeywords.includes(apiDef.keyword)) {
            baseKeywords.push(apiDef.keyword);
          }
        });
      }
    });
  }
  return baseKeywords;
}

function setupRobotHighlighting(editor) {
  let decorationIds = [];

  function updateDecorations() {
    const model = editor.getModel();
    if (!model) return;

    const keywords = getDynamicAPIKeywords();
    const robotRegex = new RegExp(`\\b(${keywords.join("|")})|SW|waitSW\\b`, "g");


    const text = model.getValue();
    const decorations = [];
    let match;

    while ((match = robotRegex.exec(text)) !== null) {
      const index = match.index;
      const word = match[0];

      const start = model.getPositionAt(index);
      const end = model.getPositionAt(index + word.length);

      // ตรวจสอบว่าบรรทัดนี้เป็นคอมเมนต์หรือไม่
      const lineContent = model.getLineContent(start.lineNumber).trim();

      // ถ้าบรรทัดเริ่มต้นด้วย // หรือบรรทัดว่าง ให้ข้ามไป
      if (lineContent.startsWith("#") || lineContent.length === 0) {
        continue;
      }

      decorations.push({
        range: new monaco.Range(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column,
        ),
        options: {
          inlineClassName: "robot-function",
        },
      });
    }

    decorationIds = editor.deltaDecorations(decorationIds, decorations);
  }

  // --- NEW: Expose globally so sensorLoader can refresh once ready ---
  window.refreshEditorHighlighting = updateDecorations;

  updateDecorations();
  editor.onDidChangeModelContent(updateDecorations);
}

// ตั้งค่า Autocomplete สำหรับ Robot API
function setupAutocomplete() {
  const robotAPI = [
    {
      label: "motor",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "motor(${1:left}, ${2:right})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation:
        "Control robot motors. motor(left, right) - left/right: 0-100",
      detail: "motor(left: number, right: number) -> void",
    },
    {
      label: "delay",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "delay(${1:milliseconds})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Pause program for specified milliseconds",
      detail: "delay(ms: number) -> Promise",
    },
    {
      label: "analogRead",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "analogRead(${1:sensorIndex})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation:
        "Read sensor value. Light: 0-1024 (Brightness), Ultrasonic: 0-800 (Distance pixels)",
      detail: "analogRead(index: number) -> number",
    },
    {
      label: "getSensorCount",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "getSensorCount()",
      documentation: "Get total number of sensors",
      detail: "getSensorCount() -> number",
    },
    {
      label: "log",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "log(${1:message})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Print message to console",
      detail: "log(message: string) -> void",
    },
    {
      label: "SW",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "SW(${1:n})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: "(n) -> boolean",
      documentation:
        "คืนค่า true หากปุ่มที่ระบุถูกกด และ false หากไม่ได้กด (1=SW1, 2=SW2, 3=SW3)",
    },
    {
      label: "waitSW",
      kind: monaco.languages.CompletionItemKind.Function,
      // Python style: waitSW(n)
      insertText: "waitSW(${1:n})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: "waitSW(n) -> void",
      documentation: "Pause program until button n is pressed",
    },
    {
      label: "print",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "print(${1:message})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Print message to console",
      detail: "print(message) -> void",
    },
    {
      label: "delay",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "delay(${1:milliseconds})",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation:
        "Pause program for specified milliseconds (e.g. 1000 = 1s)",
      detail: "delay(ms) -> void",
    },
    {
      label: "spawn_object",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "spawn_object('${1:red}')",
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Spawn a new object on the canvas. Colors: red, blue, green, yellow",
      detail: "spawn_object(color: string) -> void",
    }
  ];

  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model, position) => {
      // Create a fresh copy of the base auto-completes
      let dynamicAPI = [...robotAPI];
      
      // Inject dynamically from loaded components
      if (window.SensorConfigs) {
        Object.values(window.SensorConfigs).forEach(config => {
          if (config.api && Array.isArray(config.api)) {
            config.api.forEach(apiDef => {
              if (apiDef.snippet) {
                dynamicAPI.push({
                  label: apiDef.snippet.label,
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: apiDef.snippet.insertText,
                  insertTextRules: apiDef.snippet.insertTextRules === "snippet" ? 
                      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
                  documentation: apiDef.snippet.documentation,
                  detail: apiDef.snippet.detail
                });
              }
            });
          }
        });
      }

      return {
        suggestions: dynamicAPI,
      };
    },
  });
}

// ส่วนที่ 2: ตั้งค่า Resizers สำหรับปรับขนาด
const resizerV = document.getElementById("drag-resizer");
const resizerH = document.getElementById("h-drag-resizer");
const editorPane = document.querySelector(".editor-pane");
const consolePane = document.querySelector(".console-pane");

resizerV.addEventListener("mousedown", () => {
  document.addEventListener("mousemove", resizeVertical);
  document.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", resizeVertical),
  );
});

function resizeVertical(e) {
  let newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth > 15 && newWidth < 85) {
    editorPane.style.width = newWidth + "%";
  }
}

resizerH.addEventListener("mousedown", () => {
  document.addEventListener("mousemove", resizeHorizontal);
  document.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", resizeHorizontal),
  );
});

function resizeHorizontal(e) {
  const rect = editorPane.getBoundingClientRect();
  let newHeight = rect.bottom - e.clientY;
  if (newHeight > 50 && newHeight < rect.height - 100) {
    consolePane.style.height = newHeight + "px";
  }
}

// ส่วนที่ 3: ฟังก์ชันลาก-วาง Robot
robot.addEventListener("mousedown", () => {
  isDragging = true;
});

window.addEventListener("mouseup", () => (isDragging = false));

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const rect = canvasArea.getBoundingClientRect();

  let nextX = e.clientX - rect.left - 25;
  let nextY = e.clientY - rect.top - 25;

  const maxX = canvasArea.offsetWidth - 50;
  const maxY = canvasArea.offsetHeight - 50;

  robotX = Math.max(0, Math.min(nextX, maxX));
  robotY = Math.max(0, Math.min(nextY, maxY));

  updateRobotDOM();
});

// ส่วนที่ 4: อัปเดตตำแหน่ง Robot บน DOM
function updateRobotDOM() {
  robot.style.left = robotX + "px";
  robot.style.top = robotY + "px";
  robot.style.transform = `rotate(${angle}deg)`;
  updateSensorDots();
}

// ส่วนที่ 5: ระบบ Console สำหรับแสดงข้อความ
function logToConsole(msg, type = "info") {
  const output = document.getElementById("console-output");
  const div = document.createElement("div");
  div.className = type === "error" ? "log-error" : "log-info";
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function clearConsole() {
  document.getElementById("console-output").innerHTML = "";
}

// ส่วนที่ 6: ควบคุมมุม Robot

function handleAngleInput(value) {
  if (isRunning) {
    logToConsole("Cannot change angle while program is running!", "error");
    return;
  }

  let newAngle = parseFloat(value);
  if (isNaN(newAngle)) return;

  // Wrap angle between 0-359
  newAngle = ((newAngle % 360) + 360) % 360;

  angle = newAngle;
  updateRobotDOM();
  logToConsole(`Robot angle set to ${Math.round(angle)}°`, "info");
}

function rotateRobot(delta) {
  if (isRunning) {
    logToConsole("Cannot rotate robot while program is running!", "error");
    return;
  }

  // Snap to multiples of 45
  let newAngle;
  if (delta > 0) {
    newAngle = (Math.floor(angle / 45) + 1) * 45;
  } else {
    newAngle = (Math.ceil(angle / 45) - 1) * 45;
  }

  // Wrap angle between 0-359
  newAngle = ((newAngle % 360) + 360) % 360;

  angle = newAngle;
  updateRobotDOM();
  logToConsole(`Robot rotated to ${Math.round(angle)}°`, "info");
}

function handleMotorPosition(value) {
  let newPos = parseFloat(value);
  if (isNaN(newPos)) {
    document.getElementById("motorPos-input").value = Math.round(motorPos);
    return;
  }

  motorPos = newPos;
  let dPosition = newPos + 20;
  document.getElementById("motorPos-input").value = Math.round(newPos);
  document.getElementById("motor-left").setAttribute("x", dPosition);
  document.getElementById("motor-right").setAttribute("x", dPosition);
  document.documentElement.style.setProperty("--motorPos", dPosition + "px");
  updateRobotDOM();
  testUpdatePos();
}

function updateRobotAngle(value) {
  if (isRunning) {
    logToConsole("Cannot change angle while program is running!", "error");
    return;
  }

  angle = parseFloat(value);
  updateRobotDOM();
}

// ส่วนที่ 7: เริ่มต้นระบบ
updatePhysics();
updateCanvasSize();
setTimeout(() => {
  updateCanvasImageData();
  logToConsole("System initialized.", "info");
}, 100);

/**
 * ระบบการเรนเดอร์ Canvas 2D พร้อม Track Buffer
 * ระบบการเรนเดอร์แบบขนาน: รักษา DOM ไว้แต่เพิ่ม Canvas 2D เพื่อความแม่นยำที่ดีขึ้น
 */

let canvasRenderer = null;
let trackBufferCanvas = null;
let trackBufferCtx = null;

function initCanvasRenderer() {
  const canvasArea = document.getElementById("canvas-area");
  if (!canvasArea) return;

  // สร้าง Canvas หลักที่มองเห็นได้บนหน้าจอ
  canvasRenderer = document.createElement("canvas");
  canvasRenderer.id = "main-render-canvas";
  canvasRenderer.width = canvasArea.offsetWidth;
  canvasRenderer.height = canvasArea.offsetHeight;
  canvasRenderer.style.position = "absolute";
  canvasRenderer.style.top = "0";
  canvasRenderer.style.left = "0";
  canvasRenderer.style.zIndex = "5";
  canvasRenderer.style.cursor = "crosshair";

  // สร้าง Canvas ที่ซ่อนไว้สำหรับเก็บข้อมูล Track
  trackBufferCanvas = document.createElement("canvas");
  trackBufferCanvas.width = canvasRenderer.width;
  trackBufferCanvas.height = canvasRenderer.height;
  trackBufferCtx = trackBufferCanvas.getContext("2d");

  canvasArea.style.position = "relative";
  canvasArea.insertBefore(canvasRenderer, canvasArea.firstChild);

  logToConsole("Canvas 2D renderer initialized.", "info");
}

// --- Object Drag & Drop System ---
let draggingObjectFromPalette = null;
let draggingObjectOnCanvas = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// 1. จาก Palette สู่ Canvas
document.querySelectorAll(".draggable-obj").forEach((obj) => {
  obj.addEventListener("dragstart", (e) => {
    draggingObjectFromPalette = {
      color: e.target.dataset.color,
    };
  });
});

canvasArea.addEventListener("dragover", (e) => {
  e.preventDefault();
});

canvasArea.addEventListener("drop", (e) => {
  e.preventDefault();
  if (draggingObjectFromPalette) {
    const rect = canvasArea.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const newObj = {
      id: "obj_" + Date.now(),
      x: x,
      y: y,
      radius: 15,
      color: draggingObjectFromPalette.color,
      vx: 0,
      vy: 0,
    };
    canvasObjects.push(newObj);

    logToConsole(`Placed object at (${x}, ${y}) [Drop]`, "info");

    draggingObjectFromPalette = null;
    updateObjectsDOM();
    updateSensorDots();
  }
});

// 2. การลากย้ายบน Canvas และการลบทิ้ง
function updateObjectsDOM() {
  // ลบ Element เก่าที่ไม่ได้อยู่ในอาเรย์ออก
  const existingElements = document.querySelectorAll(".canvas-object-item");
  existingElements.forEach((el) => {
    const id = el.dataset.id;
    if (!canvasObjects.find((o) => o.id === id)) {
      el.remove();
    }
  });

  // สร้างหรืออัปเดต Element
  canvasObjects.forEach((obj) => {
    let el = document.querySelector(`.canvas-object-item[data-id="${obj.id}"]`);
    if (!el) {
      el = document.createElement("div");
      el.className = "canvas-object-item";
      el.dataset.id = obj.id;
      el.style.backgroundColor = obj.color;

      el.addEventListener("mousedown", (e) => {
        if (obj.isGrabbed) return; // ห้ามลากถ้ากำลังถูกคีบอยู่
        draggingObjectOnCanvas = obj;
        const rect = el.getBoundingClientRect();
        // คำนวณ offset จากกึ่งกลางวัตถุ
        dragOffsetX = e.clientX - rect.left - rect.width / 2;
        dragOffsetY = e.clientY - rect.top - rect.height / 2;
        e.stopPropagation();
      });

      canvasArea.appendChild(el);
    }

    el.style.left = obj.x - 15 + "px";
    el.style.top = obj.y - 15 + "px";
  });
}

window.addEventListener("mousemove", (e) => {
  if (draggingObjectOnCanvas) {
    const rect = canvasArea.getBoundingClientRect();
    draggingObjectOnCanvas.x = Math.round(e.clientX - rect.left - dragOffsetX);
    draggingObjectOnCanvas.y = Math.round(e.clientY - rect.top - dragOffsetY);
    draggingObjectOnCanvas.vx = 0;
    draggingObjectOnCanvas.vy = 0;

    updateObjectsDOM();
    updateSensorDots();
  }
});

window.addEventListener("mouseup", (e) => {
  if (draggingObjectOnCanvas) {
    // ลบวัตถุหากลากออกนอกขอบ Canvas
    const rect = canvasArea.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      canvasObjects = canvasObjects.filter(
        (o) => o.id !== draggingObjectOnCanvas.id,
      );
      logToConsole("Object deleted.", "info");
    } else {
      logToConsole(
        `Moved object to (${draggingObjectOnCanvas.x}, ${draggingObjectOnCanvas.y})`,
        "info",
      );
    }

    draggingObjectOnCanvas = null;
    updateObjectsDOM();
    updateSensorDots();
  }
});

function renderCanvasFrame() {
  if (!canvasRenderer) return;

  const ctx = canvasRenderer.getContext("2d");
  const w = canvasRenderer.width;
  const h = canvasRenderer.height;

  // ล้าง Canvas และวาดพื้นหลัง
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, w, h);

  // วาดแผนที่ถ้ามีการโหลด
  if (currentMapImage) {
    ctx.drawImage(currentMapImage, 0, 0, w, h);
  }

  // วาด Robot เป็นวงกลมพร้อมตัวชี้ทิศทาง
  const robotSize = 25;
  ctx.fillStyle = "#2d3436";
  ctx.beginPath();
  ctx.arc(robotX + 25, robotY + 25, robotSize, 0, Math.PI * 2);
  ctx.fill();

  // วาดเส้นทิศทาง
  const rad = (angle * Math.PI) / 180;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(robotX + 25, robotY + 25);
  ctx.lineTo(
    robotX + 25 + Math.cos(rad) * robotSize,
    robotY + 25 + Math.sin(rad) * robotSize,
  );
  ctx.stroke();

  // วาดตำแหน่งของเซนเซอร์เป็นจุดเล็ก ๆ
  ctx.fillStyle = "rgba(100,200,255,0.6)";
  sensors.forEach((s) => {
    const localX = s.x - 25;
    const localY = s.y - 25;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;
    const canvasX = robotX + 25 + rotatedX;
    const canvasY = robotY + 25 + rotatedY;
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * อัปเดต Track Buffer: คัดลอกข้อมูลพิกเซลจาก Canvas ที่มองเห็นได้
 * เพื่อให้เซนเซอร์สามารถอ่านข้อมูลได้โดยไม่ต้องอ่านจาก DOM/CSS ซ้ำ ๆ
 */
function updateTrackBuffer() {
  if (!trackBufferCtx || !canvasRenderer) return;
  const ctx = canvasRenderer.getContext("2d");
  const imgData = ctx.getImageData(
    0,
    0,
    trackBufferCanvas.width,
    trackBufferCanvas.height,
  );
  trackBufferCtx.putImageData(imgData, 0, 0);
}

// เชื่อมต่อปุ่ม Run/Stop กับลูปการจำลอง
const runBtn = document.getElementById("run-btn");
const stopBtn = document.getElementById("stop-btn");

const originalRunCode = window.runCode;
window.runCode = function () {
  if (typeof originalRunCode === "function") {
    originalRunCode.call(this);
  }
  // เริ่มลูป RAF เมื่อโค้ดของผู้ใช้เริ่มทำงาน
  if (typeof startSimulationLoop === "function") {
    startSimulationLoop();
  }

  // --- DYNAMIC HOOK: onProgramStart ---
  if (window.SensorConfigs) {
      Object.keys(window.SensorConfigs).forEach(type => {
          const registry = window.SensorRegistry[type];
          if (registry && typeof registry.onProgramStart === "function") {
              registry.onProgramStart({ sensors: typeof sensors !== 'undefined' ? sensors : [], grips: typeof grips !== 'undefined' ? grips : [] });
          }
      });
  }
};

const originalStopProgram = window.stopProgram;
window.stopProgram = function () {
  if (typeof originalStopProgram === "function") {
    originalStopProgram.call(this);
  }
  // หยุดลูป RAF เมื่อโค้ดของผู้ใช้หยุดทำงาน
  if (typeof stopSimulationLoop === "function") {
    stopSimulationLoop();
  }

  // --- DYNAMIC HOOK: onProgramStop ---
  if (window.SensorConfigs) {
      Object.keys(window.SensorConfigs).forEach(type => {
          const registry = window.SensorRegistry[type];
          if (registry && typeof registry.onProgramStop === "function") {
              registry.onProgramStop({ sensors: typeof sensors !== 'undefined' ? sensors : [], grips: typeof grips !== 'undefined' ? grips : [] });
          }
      });
  }
};

// --- Initialization ---
if (typeof updateObjectsDOM === "function") {
  updateObjectsDOM();
}
