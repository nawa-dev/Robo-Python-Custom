import { canvasArea, state } from "../core/index.js";
import { updateCanvasImageData, updateCanvasSize } from "../core/canvas.js";
import { stopProgram } from "../core/executor.js";
import { clearConsole, logToConsole } from "../ui/ui-manager.js";
import {
  renderSensorTabs,
  renderSensorsList,
  updateSensorPreview,
} from "../sensors/sensors-manager.js";

const STORAGE_KEY = "robot_sim_autosave";
const UTF8_BOM = "\uFEFF";

let currentProjectName = "Untitled Project";
let currentProjectPath = null;

function serializeProjectData(projectData) {
  return `${UTF8_BOM}${JSON.stringify(projectData, null, 2)}`;
}

function stripUtf8Bom(text) {
  return text.replace(/^\uFEFF/, "");
}

function decodeProjectFile(buffer) {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

  try {
    return stripUtf8Bom(utf8Decoder.decode(buffer));
  } catch (_utf8Error) {
    // Fallback for older Thai-encoded project files created outside the app.
    return stripUtf8Bom(new TextDecoder("windows-874").decode(buffer));
  }
}

function updateObjectsView() {
  if (typeof window.updateObjectsDOM === "function") {
    window.updateObjectsDOM();
  }
}

function updateSensorDotsView() {
  if (typeof window.updateSensorDots === "function") {
    window.updateSensorDots();
  }
}

function updateRobotView() {
  if (typeof window.updateRobotDOM === "function") {
    window.updateRobotDOM();
  }
}

function syncWheelView() {
  if (typeof window.syncWheelDOM === "function") {
    window.syncWheelDOM();
  }
}

function trackExampleEvent(name) {
  if (typeof window.trackEvent === "function") {
    window.trackEvent("click", "FileMenu", `Example:${name}`);
  }
}

function t(key, fallback) {
  if (window.i18n && typeof window.i18n.t === "function") {
    const value = window.i18n.t(key);
    if (value && value !== key) {
      return value;
    }
  }
  return fallback;
}
export function createProjectData() {
  const currentOpt = document.getElementById("current-map-option");
  return {
    version: "1.1",
    timestamp: new Date().toISOString(),
    projectName: currentProjectName,
    canvas: {
      width: document.getElementById("canvas-w").value,
      height: document.getElementById("canvas-h").value,
      physicsEngine: state.physicsEngine,
    },
    map: {
      type: canvasArea.style.backgroundImage === "none" ? "default" : "custom",
      imageData: canvasArea.style.backgroundImage
        .replace(/^url\(['"]?/, "")
        .replace(/['"]?\)$/, ""),
      fileName: currentOpt ? currentOpt.dataset.filename : "",
    },
    sensors: state.sensors.map((sensor) => ({ ...sensor })),
    grips: (state.grips || []).map((grip) => ({ ...grip })),
    canvasObjects: (state.canvasObjects || []).map((obj) => ({
      id: obj.id,
      x: obj.x,
      y: obj.y,
      radius: obj.radius || 15,
      color: obj.color,
      vx: 0,
      vy: 0,
    })),
    sourceCode: window.editor ? window.editor.getValue() : "",
    robotState: {
      x: state.robotX,
      y: state.robotY,
      angle: state.angle,
      motorPos: state.motorPos,
      width: state.robotWidth,
      height: state.robotHeight,
      color: state.robotColor,
      image: state.robotImage,
      borderSize: state.robotBorderSize,
      robotBorderColor: state.robotBorderColor,
      robotUseMass: state.robotUseMass,
      robotMass: state.robotMass,
      objectMass: state.objectMass,
      objectFriction: state.objectFriction,
    },
  };
}

export function saveProjectAs() {
  const projectName = prompt("กรุณาใส่ชื่อโปรเจกต์", currentProjectName);
  if (!projectName) return;

  currentProjectName = projectName;
  currentProjectPath = `${projectName}.json`;

  const projectData = createProjectData();
  const jsonString = serializeProjectData(projectData);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = currentProjectPath;
  anchor.click();
  URL.revokeObjectURL(url);

  logToConsole(`Project saved: ${currentProjectPath}`, "info");
}

export function openProject() {
  const input = document.getElementById("file-input");
  if (input) {
    input.click();
  }
}

export async function loadProject(inputElement) {
  if (!inputElement.files || !inputElement.files[0]) return;

  const file = inputElement.files[0];
  inputElement.value = "";

  try {
    const buffer = await file.arrayBuffer();
    const projectData = JSON.parse(decodeProjectFile(buffer));
    applyProjectData(projectData);
    currentProjectPath = file.name;
    logToConsole(`Project loaded: ${file.name}`, "info");
  } catch (error) {
    logToConsole(`File load error: ${error.message}`, "error");
  }
}

export function loadExampleMenu() {
  const menuContainer = document.getElementById("example-list");
  if (!menuContainer) return;

  fetch("./examplemenu.json")
    .then((response) => response.json())
    .then((examples) => {
      if (examples.length === 0) {
        menuContainer.innerHTML = '<a href="#">No examples</a>';
        return;
      }

      menuContainer.innerHTML = "";

      examples.forEach((example) => {
        const link = document.createElement("a");
        link.href = "javascript:void(0)";
        link.innerHTML = `<i class="fas fa-file-code"></i> ${example.name}`;
        link.addEventListener("click", () => {
          loadExampleProject(example.file);
          trackExampleEvent(example.name);
        });
        menuContainer.appendChild(link);
      });
    })
    .catch((error) => {
      console.error("Failed to load example menu:", error);
      menuContainer.innerHTML =
        '<a href="#" style="color:red">Error loading menu</a>';
    });
}

export function loadExampleProject(filename = "sampleSetup.json") {
  const shouldLoad = confirm(
    `โหลดตัวอย่าง "${filename}"? ข้อมูลปัจจุบันที่ยังไม่ได้บันทึกจะหายไป`,
  );
  if (!shouldLoad) return;

  fetch(`./${filename}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Example file not found: ${filename}`);
      }
      return response.json();
    })
    .then((data) => {
      applyProjectData(data);
      logToConsole(`Example loaded: ${filename}`, "info");
    })
    .catch((error) => {
      console.error("Error loading example:", error);
      logToConsole(`Example load failed: ${error.message}`, "error");
    });
}

export function applyProjectData(projectData) {
  if (!projectData) return;

  stopProgram();

  const mapSelect = document.getElementById("map-select");
  const currentOpt = document.getElementById("current-map-option");
  const canvasConfig = projectData.canvas || {};

  document.getElementById("canvas-w").value = canvasConfig.width || 800;
  document.getElementById("canvas-h").value = canvasConfig.height || 600;
  state.physicsEngine =
    canvasConfig.physicsEngine || state.physicsEngine || "custom";

  const engineSelect = document.getElementById("engine-select");
  if (engineSelect) {
    engineSelect.value = state.physicsEngine;
  }

  updateCanvasSize();

  if (
    projectData.map &&
    projectData.map.type === "custom" &&
    projectData.map.imageData
  ) {
    canvasArea.style.backgroundImage = `url('${projectData.map.imageData}')`;
    canvasArea.style.backgroundColor = "transparent";

    if (currentOpt) {
      const fileName = projectData.map.fileName || "Project Map";
      currentOpt.textContent = `${t("toolbar.map", "Map")}: ${fileName}`;
      currentOpt.dataset.filename = fileName;
      if (mapSelect) {
        mapSelect.value = "current";
      }
    }

    setTimeout(updateCanvasImageData, 100);
  } else {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    if (mapSelect) {
      mapSelect.value = "default";
    }
    if (currentOpt) {
      currentOpt.textContent = t("toolbar.no_map", "No map loaded");
      currentOpt.dataset.filename = "";
    }
    updateCanvasImageData();
  }

  const typeIndices = {};
  state.sensors = (projectData.sensors || []).map((sensor) => {
    const type = sensor.type || "light";
    if (typeIndices[type] === undefined) {
      typeIndices[type] = 0;
    }

    const assignedIndex =
      sensor.index !== undefined ? sensor.index : typeIndices[type];
    typeIndices[type] = Math.max(typeIndices[type], assignedIndex + 1);

    return {
      type,
      index: assignedIndex,
      ...sensor,
      isNew: false,
    };
  });

  state.grips = (projectData.grips || []).map((grip, index) => ({
    type: "grip",
    index: grip.index !== undefined ? grip.index : index,
    ...grip,
    x: grip.x !== undefined ? grip.x : 45,
    y: grip.y !== undefined ? grip.y : 25,
  }));

  updateSensorPreview();
  renderSensorsList();
  updateSensorDotsView();

  window.SensorNextIndices = {};
  [...state.sensors, ...state.grips].forEach((sensor) => {
    if (sensor.index !== undefined) {
      const type = sensor.type;
      window.SensorNextIndices[type] = Math.max(
        window.SensorNextIndices[type] || 0,
        sensor.index + 1,
      );
    }
  });

  if (typeof state.canvasObjects !== "undefined") {
    state.canvasObjects.length = 0;
    (projectData.canvasObjects || []).forEach((obj) => {
      state.canvasObjects.push(obj);
    });
    updateObjectsView();
  }

  if (window.editor && projectData.sourceCode !== undefined) {
    window.editor.setValue(projectData.sourceCode);
  }

  const robotState = projectData.robotState || {};
  state.robotX = robotState.x ?? 100;
  state.robotY = robotState.y ?? 100;
  state.angle = robotState.angle ?? 0;
  state.motorPos = robotState.motorPos ?? 50;
  state.robotWidth = robotState.width || 50;
  state.robotHeight = robotState.height || 50;
  state.robotColor = robotState.color || "#ff4757";
  state.robotImage = robotState.image || "";
  state.robotBorderSize =
    robotState.borderSize !== undefined ? robotState.borderSize : 1;
  state.robotBorderColor =
    robotState.robotBorderColor || robotState.borderColor || "#333333";
  state.robotUseMass =
    robotState.robotUseMass !== undefined
      ? robotState.robotUseMass
      : robotState.useMass || false;
  state.robotMass =
    robotState.robotMass !== undefined
      ? robotState.robotMass
      : robotState.mass || 1.0;
  state.objectMass =
    robotState.objectMass !== undefined
      ? robotState.objectMass
      : projectData.objectMass !== undefined
        ? projectData.objectMass
        : 1.0;
  state.objectFriction =
    robotState.objectFriction !== undefined
      ? robotState.objectFriction
      : projectData.objectFriction !== undefined
        ? projectData.objectFriction
        : 0.92;

  updateRobotView();

  if (
    window.physicsAdapter &&
    typeof window.physicsAdapter.reinitialize === "function"
  ) {
    window.physicsAdapter.reinitialize();
  }

  if (state.sensors.filter((sensor) => sensor.type === "wheel").length === 0) {
    state.sensors.push({
      id: Date.now(),
      type: "wheel",
      name: "Wheel",
      motorPos: 50,
      index: 0,
    });
  }

  syncWheelView();

  currentProjectName = projectData.projectName || "Untitled Project";
  renderSensorTabs();
}

export function autoSaveToWebStorage() {
  const data = createProjectData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  console.debug("[autosave] saved");
}

export function loadFromWebStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      applyProjectData(JSON.parse(saved));
      logToConsole("Autosave restored.", "info");
      return;
    } catch (error) {
      console.error("WebStorage restore failed:", error);
      applyProjectData({ sensors: [] });
      return;
    }
  }

  applyProjectData({ sensors: [] });
}

export function newProject() {
  const shouldCreate = confirm(
    "สร้างโปรเจกต์ใหม่ใช่หรือไม่? ข้อมูลที่ยังไม่ได้บันทึกเป็นไฟล์จะหายไปทั้งหมด",
  );
  if (!shouldCreate) return;

  stopProgram();
  localStorage.removeItem(STORAGE_KEY);

  currentProjectName = "Untitled Project";
  currentProjectPath = null;

  state.robotX = 100;
  state.robotY = 100;
  state.angle = 0;
  state.motorPos = 50;
  updateRobotView();

  canvasArea.style.backgroundImage = "none";
  canvasArea.style.backgroundColor = "#f0f0f0";

  const mapSelect = document.getElementById("map-select");
  const currentOpt = document.getElementById("current-map-option");
  if (mapSelect) {
    mapSelect.value = "default";
  }
  if (currentOpt) {
    currentOpt.textContent = t("toolbar.no_map", "No map loaded");
    currentOpt.dataset.filename = "";
  }

  updateCanvasImageData();

  state.sensors = [];
  state.grips = [];
  state.canvasObjects = [];
  updateObjectsView();
  updateSensorPreview();
  renderSensorsList();
  updateSensorDotsView();

  clearConsole();
  logToConsole("New project created.", "info");

  location.reload();
}

window.saveProjectAs = saveProjectAs;
window.openProject = openProject;
window.loadProject = loadProject;
window.loadExampleMenu = loadExampleMenu;
window.newProject = newProject;
window.autoSaveToWebStorage = autoSaveToWebStorage;
window.applyProjectData = applyProjectData;
window.loadFromWebStorage = loadFromWebStorage;
