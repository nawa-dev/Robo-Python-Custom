/**
 * ตัวแปรสถานะส่วนกลาง (Global State Variables)
 * ใช้สำหรับจัดเก็บค่าพื้นฐานที่ทุกส่วนของโปรแกรมต้องเข้าถึงร่วมกัน
 */

// Initialize Sensor Registries early to avoid race conditions
window.SensorRegistry = window.SensorRegistry || {};
window.SensorTemplates = window.SensorTemplates || {};
window.SensorPreviewTemplates = window.SensorPreviewTemplates || {};
window.SensorConfigs = window.SensorConfigs || {};

class SimulationState {
  constructor() {
    // --- 2. สถานะตำแหน่งและทิศทางของหุ่นยนต์ ---
    this.robotX = 400; // Center of default 800x600 canvas
    this.robotY = 300;
    this.angle = 0;

    // --- 3. สถานะการทำงานของมอเตอร์ ---
    this.motorL = 0;
    this.motorR = 0;
    this.motorFL = 0;
    this.motorFR = 0;
    this.motorBL = 0;
    this.motorBR = 0;

    // --- 4. สถานะการรันโปรแกรมและอินเตอร์เฟซ ---
    this.isRunning = false;
    this.isDragging = false;
    this.myInterpreter = null;

    // --- 5. ระบบเซนเซอร์ ---
    this.sensors = [
        { id: "robot_instance", type: "robot", index: 0 }
    ];
    
    // --- 8. ระบบ Grip ---
    this.grips = [];

    // --- 7. ระบบวัตถุบนแคนวาส (Movable Canvas Objects) ---
    this.canvasObjects = [];
    this.grabbedObjects = [];

    // --- 6. ข้อมูลภาพสำหรับประมวลผลเซนเซอร์ ---
    this.canvasImageData = null;
    this.canvasPixelData = null;

    // --- 9. ระบบ Zoom และ Pan ---
    this.zoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.dragMode = false;

    // --- 10. ระบบปรับแต่งหุ่นยนต์ ---
    this.robotWidth = 50;
    this.robotHeight = 50;
    this.robotColor = "#ff4757";
    this.robotImage = "";
    this.robotBorderSize = 1;
    this.robotBorderColor = "#333333";
    this.robotUseMass = false;
    this.robotMass = 1.0;

    // --- 11. ระบบปรับแต่งวัตถุ (Defaults for dragged objects) ---
    this.objectMass = 1.0;
    this.objectFriction = 0.92;

    // --- 12. ระบบ Physics Engine (Multi-Engine support) ---
    this.physicsEngine = "custom"; // "custom" or "matter"
    this.matterState = {
        engine: null,
        world: null,
        robotBody: null,
        objectBodies: new Map(), // Map of state.canvasObjects -> Matter.Body
        wallBodies: []
    };

    // --- Legacy / Others ---
    this.motorPos = 0;
  }
}

// Create the global state instance
window.state = new SimulationState();

// --- 1. การอ้างอิง Element ใน DOM ---
// ตัวแทนหุ่นยนต์ (SVG/Div) ในหน้าเว็บ
const robot = document.getElementById("robot");
// พื้นที่แคนวาสหรือสนามจำลอง
const canvasArea = document.getElementById("canvas-area");

// --- Constants ---
const MAX_SENSORS = 25;
const MAX_GRIPS = 4;

// Forward-compatibility getters/setters to avoid breaking everything immediately
// (Optional but recommended for large refactors. I'll stick to direct refactor if I can update all files).
// Given I can update all files, I'll remove the top-level let declarations.

