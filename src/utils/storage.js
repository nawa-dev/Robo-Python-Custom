/**
 * ระบบจัดการการบันทึกและโหลดโปรเจกต์ (Project Save/Load System)
 */

let currentProjectName = "Untitled Project";
let currentProjectPath = null;

/**
 * รวบรวมข้อมูลปัจจุบันในระบบเพื่อสร้างออบเจกต์สำหรับจัดเก็บ
 */
function createProjectData() {
  const currentOpt = document.getElementById("current-map-option");
  return {
    version: "1.1",
    timestamp: new Date().toISOString(),
    projectName: currentProjectName,
    canvas: {
      width: document.getElementById("canvas-w").value,
      height: document.getElementById("canvas-h").value,
    },
    map: {
      type: canvasArea.style.backgroundImage === "none" ? "default" : "custom",
      imageData: canvasArea.style.backgroundImage
        .replace(/^url\(['"]?/, "")
        .replace(/['"]?\)$/, ""),
      fileName: currentOpt ? currentOpt.dataset.filename : "",
    },
    sensors: state.sensors.map((s) => ({ ...s })),
    grips: (state.grips || []).map((g) => ({ ...g })),
    canvasObjects: (state.canvasObjects || []).map((obj) => ({
      id: obj.id,
      x: obj.x,
      y: obj.y,
      radius: obj.radius || 15,
      color: obj.color,
      vx: 0,
      vy: 0,
    })),
    sourceCode: editor.getValue(),
    robotState: {
      x: state.robotX,
      y: state.robotY,
      angle: state.angle,
      motorPos: state.motorPos, // Keep for backward compat if needed, though we use sensors now
    },
  };
}

/**
 * บันทึกโปรเจกต์ปัจจุบันลงเครื่องคอมพิวเตอร์เป็นไฟล์ .json
 */
function saveProjectAs() {
  const projectName = prompt("กรุณาใส่ชื่อโปรเจกต์", currentProjectName);
  if (!projectName) return;

  currentProjectName = projectName;
  currentProjectPath = projectName + ".json";

  const projectData = createProjectData();
  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = currentProjectPath;
  a.click();
  URL.revokeObjectURL(url);

  logToConsole(`บันทึกโปรเจกต์เรียบร้อย: ${currentProjectPath}`, "info");
  // updateStatusBar();
}

/**
 * เปิดหน้าต่างเลือกไฟล์เพื่อโหลดโปรเจกต์
 */
function openProject() {
  document.getElementById("file-input").click();
}

/**
 * อ่านข้อมูลจากไฟล์ที่เลือกและนำเข้าสู่ระบบ
 * @param {HTMLInputElement} inputElement
 */
function loadProject(inputElement) {
  if (!inputElement.files || !inputElement.files[0]) return;

  const file = inputElement.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target.result);
      applyProjectData(projectData);
      currentProjectPath = file.name;

      logToConsole(`โหลดโปรเจกต์เรียบร้อย: ${file.name}`, "info");
      // updateStatusBar();
    } catch (error) {
      logToConsole(`เกิดข้อผิดพลาดในการโหลดไฟล์: ${error.message}`, "error");
    }
  };

  reader.readAsText(file);
  inputElement.value = "";
}

/**
 * โหลดรายชื่อตัวอย่างจาก examplemenu.json
 */
function loadExampleMenu() {
  const menuContainer = document.getElementById("example-list");
  if (!menuContainer) return;

  fetch("./examplemenu.json")
    .then((response) => response.json())
    .then((examples) => {
      if (examples.length === 0) {
        menuContainer.innerHTML = '<a href="#">No examples</a>';
        return;
      }
      
      menuContainer.innerHTML = ""; // Clear loading text
      
      examples.forEach((ex) => {
        const link = document.createElement("a");
        link.href = "javascript:void(0)";
        link.innerHTML = `<i class="fas fa-file-code"></i> ${ex.name}`;
        link.onclick = () => {
             loadExampleProject(ex.file);
             trackEvent('click', 'FileMenu', `Example:${ex.name}`);
        };
        menuContainer.appendChild(link);
      });
    })
    .catch((err) => {
      console.error("Failed to load example menu:", err);
      menuContainer.innerHTML = '<a href="#" style="color:red">Error loading menu</a>';
    });
}

/**
 * โหลดโปรเจกต์ตัวอย่างจากไฟล์ที่ระบุ
 * @param {string} filename - ชื่อไฟล์ JSON (default: sampleSetup.json)
 */
function loadExampleProject(filename = "sampleSetup.json") {
  if (
    confirm(
      `โหลดตัวอย่าง "${filename}"? ข้อมูลปัจจุบันที่ยังไม่บันทึกจะหายไป`,
    )
  ) {
    fetch(`./${filename}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Example file not found: ${filename}`);
        }
        return response.json();
      })
      .then((data) => {
        applyProjectData(data);
        logToConsole(`โหลดตัวอย่างเรียบร้อย: ${filename}`, "info");
      })
      .catch((error) => {
        console.error("Error loading example:", error);
        logToConsole(`โหลดตัวอย่างล้มเหลว: ${error.message}`, "error");
      });
  }
}

function applyProjectData(projectData) {
  if (!projectData) return;

  // หยุดการทำงานของโปรแกรมเดิมก่อนโหลดข้อมูลใหม่
  stopProgram();

  // 1. ตั้งค่าพื้นผิวและขนาดแคนวาส
  const mapSelect = document.getElementById("map-select");
  const currentOpt = document.getElementById("current-map-option");

  const cv = projectData.canvas || {};
  document.getElementById("canvas-w").value = cv.width || 800;
  document.getElementById("canvas-h").value = cv.height || 600;
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
      currentOpt.textContent = `แผนที่ปัจจุบัน: ${fileName}`;
      currentOpt.dataset.filename = fileName;
      if (mapSelect) mapSelect.value = "current";
    }
    setTimeout(updateCanvasImageData, 100);
  } else {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    if (mapSelect) mapSelect.value = "default";
    if (currentOpt) currentOpt.textContent = "ไม่ได้โหลดแผนที่";
    updateCanvasImageData();
  }

  // 2. คืนค่าเซนเซอร์
  const typeIndices = {};
  state.sensors = (projectData.sensors || []).map((s) => {
    const type = s.type || "light";
    if (typeIndices[type] === undefined) typeIndices[type] = 0;
    
    const assignedIndex = s.index !== undefined ? s.index : typeIndices[type];
    typeIndices[type] = Math.max(typeIndices[type], assignedIndex + 1);

    return {
      type: type,
      index: assignedIndex,
      ...s,
      isNew: false,
    };
  });

  // 2b. คืนค่า Grip
  state.grips = (projectData.grips || []).map((g, idx) => ({
    type: "grip",
    index: g.index !== undefined ? g.index : idx,
    ...g,
    x: g.x !== undefined ? g.x : 45,
    y: g.y !== undefined ? g.y : 25,
  }));

  updateSensorPreview();
  renderSensorsList();
  updateSensorDots();

  // Recalculate index trackers
  window.SensorNextIndices = {};
  [...state.sensors, ...state.grips].forEach(s => {
    const type = s.type;
    if (s.index !== undefined) {
      window.SensorNextIndices[type] = Math.max(window.SensorNextIndices[type] || 0, s.index + 1);
    }
  });

  // 2c. คืนค่าวัตถุบนแคนวาส
  if (typeof state.canvasObjects !== "undefined") {
    state.canvasObjects.length = 0;
    if (projectData.canvasObjects) {
      projectData.canvasObjects.forEach((obj) => {
        state.canvasObjects.push(obj);
      });
    }
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }

  // 3. คืนค่ารหัสต้นฉบับใน Editor
  if (editor && projectData.sourceCode !== undefined) {
      editor.setValue(projectData.sourceCode);
  }

  // 4. คืนค่าสถานะของหุ่นยนต์
  const rs = projectData.robotState || {};
  state.robotX = rs.x || 100;
  state.robotY = rs.y || 100;
  state.angle = rs.angle || 0;
  state.motorPos = rs.motorPos || 0;
  updateRobotDOM();
  // Ensure at least one wheel exists if none in project
  if (state.sensors.filter(s => s.type === "wheel").length === 0) {
    state.sensors.push({ id: Date.now(), type: "wheel", name: "Wheel", motorPos: 0, index: 0 });
  }
  if (typeof syncWheelDOM === "function") syncWheelDOM();

  currentProjectName = projectData.projectName || "Untitled Project";
  // updateStatusBar();
}

/**
 * ระบบบันทึกอัตโนมัติลงใน Web Storage
 */
const STORAGE_KEY = "robot_sim_autosave";

function updateMotorPostion() {
  // Legacy function - we now use syncWheelDOM
  if (typeof syncWheelDOM === "function") syncWheelDOM();
}

function autoSaveToWebStorage() {
  const data = createProjectData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  console.log("บันทึกข้อมูลอัตโนมัติเรียบร้อย");
}

function loadFromWebStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      applyProjectData(JSON.parse(saved));
      logToConsole("กู้คืนสถานะเดิมจากการบันทึกอัตโนมัติ", "info");
    } catch (e) {
      console.error("การโหลดจาก WebStorage ล้มเหลว:", e);
      applyProjectData({ sensors: [] }); // Fallback to default
    }
  } else {
    // Initial startup with no saved data
    applyProjectData({ sensors: [] });
  }
}

/**
 * เริ่มโปรเจกต์ใหม่และล้างข้อมูลทั้งหมด
 */
function newProject() {
  if (
    confirm(
      "สร้างโปรเจกต์ใหม่ใช่หรือไม่? ข้อมูลที่ไม่ได้บันทึกเป็นไฟล์จะหายไปทั้งหมด",
    )
  ) {
    stopProgram();

    // ล้างข้อมูลใน LocalStorage
    localStorage.removeItem(STORAGE_KEY);

    // รีเซ็ตตัวแปรพื้นฐาน
    currentProjectName = "Untitled Project";
    currentProjectPath = null;

    // รีเซ็ตตำแหน่งหุ่นยนต์
    state.robotX = 100;
    state.robotY = 100;
    state.angle = 0;
    state.motorPos = 0;
    updateRobotDOM();

    // รีเซ็ตแผนที่กลับเป็นค่าเริ่มต้น
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    const mapSelect = document.getElementById("map-select");
    const currentOpt = document.getElementById("current-map-option");
    if (mapSelect) mapSelect.value = "default";
    if (currentOpt) {
      currentOpt.textContent = "ไม่ได้โหลดแผนที่";
      currentOpt.dataset.filename = "";
    }
    updateCanvasImageData();

    // ล้างข้อมูลเซนเซอร์และ Grip
    state.sensors = [];
    state.grips = [];
    state.canvasObjects = [];
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    updateSensorPreview();
    renderSensorsList();
    updateSensorDots();

    clearConsole();
    // updateStatusBar();
    logToConsole("สร้างโปรเจกต์ใหม่สำเร็จ", "info");

    // รีโหลดหน้าเว็บเพื่อเริ่มใหม่ทั้งหมด
    location.reload();
  }
}

// หน่วงเวลาการเรียกสถานะเริ่มต้นเล็กน้อย
// setTimeout(updateStatusBar, 100);
