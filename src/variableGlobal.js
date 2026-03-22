/**
 * ตัวแปรสถานะส่วนกลาง (Global State Variables)
 * ใช้สำหรับจัดเก็บค่าพื้นฐานที่ทุกส่วนของโปรแกรมต้องเข้าถึงร่วมกัน
 */

class SimulationState {
  constructor() {
    // --- 2. สถานะตำแหน่งและทิศทางของหุ่นยนต์ ---
    this.robotX = 100;
    this.robotY = 100;
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
    this.sensors = [];
    
    // --- 8. ระบบ Grip ---
    this.grips = [];

    // --- 7. ระบบวัตถุบนแคนวาส (Movable Canvas Objects) ---
    this.canvasObjects = [];
    this.grabbedObjects = [];

    // --- 6. ข้อมูลภาพสำหรับประมวลผลเซนเซอร์ ---
    this.canvasImageData = null;
    this.canvasPixelData = null;

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

