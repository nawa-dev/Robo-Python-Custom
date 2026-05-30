/**
 * ตัวแปรสถานะส่วนกลาง (Global State Variables)
 * ใช้สำหรับจัดเก็บค่าพื้นฐานที่ทุกส่วนของโปรแกรมต้องเข้าถึงร่วมกัน
 */

window.SensorRegistry = window.SensorRegistry || {};
window.SensorTemplates = window.SensorTemplates || {};
window.SensorPreviewTemplates = window.SensorPreviewTemplates || {};
window.SensorConfigs = window.SensorConfigs || {};

class SimulationState {
  constructor() {
    this.robotX = 400;
    this.robotY = 300;
    this.angle = 0;

    this.motorL = 50;
    this.motorR = 50;
    this.motorFL = 0;
    this.motorFR = 0;
    this.motorBL = 0;
    this.motorBR = 0;

    this.isRunning = false;
    this.isDragging = false;
    this.myInterpreter = null;

    this.sensors = [{ id: "robot_instance", type: "robot", index: 0 }];
    this.grips = [];
    this.canvasObjects = [];
    this.grabbedObjects = [];

    this.canvasImageData = null;
    this.canvasPixelData = null;

    this.zoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.dragMode = false;

    this.robotWidth = 50;
    this.robotHeight = 50;
    this.robotColor = "#ff4757";
    this.robotImage = "";
    this.robotBorderSize = 1;
    this.robotBorderColor = "#333333";
    this.robotUseMass = false;
    this.robotMass = 1.0;

    this.objectMass = 1.0;
    this.objectFriction = 0.92;

    this.physicsEngine = "custom";
    this.matterState = {
      engine: null,
      world: null,
      robotBody: null,
      objectBodies: new Map(),
      wallBodies: [],
    };

    this.motorPos = 50;
    this.robotRenderPose = null;
  }
}

export const state = window.state || new SimulationState();
window.state = state;

export const robot = document.getElementById("robot");
export const canvasArea = document.getElementById("canvas-area");

window.robot = robot;
window.canvasArea = canvasArea;

export const MAX_SENSORS = 25;
export const MAX_GRIPS = 4;
