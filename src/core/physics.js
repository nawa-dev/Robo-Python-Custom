/**
 * ระบบฟิสิกส์และระบบเซนเซอร์ (Physics & Sensor System)
 * รองรับการคำนวณจลนศาสตร์แบบ Differential Drive
 */

// ตัวคูณความเร็วล้อ (ปรับค่านี้เพื่อความเร็วที่สมจริง - เดิมคือ 2.5)
const MOTOR_SPEED_FACTOR = 1;

// --- 1. ระบบขับเคลื่อน Differential Drive ---
/**
 * ฟังก์ชันสำหรับจัดการคำนวณจลนศาสตร์และความเร่งของล้อ
 * @param {Object} opts - การตั้งค่าเริ่มต้น (wheelBase, maxAccel, maxSpeed, axisOffset)
 */
function DifferentialDrive(opts) {
  opts = opts || {};
  this.wheelBase = opts.wheelBase || 40; // ระยะห่างระหว่างล้อซ้าย-ขวา (พิกเซล)
  this.maxAccel = opts.maxAccel || 300; // ความเร่งสูงสุด (พิกเซลต่อวินาทีกำลังสอง)
  this.maxSpeed = opts.maxSpeed || 250; // ความเร็วสูงสุด (พิกเซลต่อวินาที)

  // ระยะจากจุดศูนย์กลางหุ่นยนต์ไปถึงแกนล้อ (ใช้สำหรับการปรับแต่งสมดุลเครื่อง)
  this.axisOffset = opts.axisOffset || 0;

  this.fl = { target: 0, current: 0 };
  this.fr = { target: 0, current: 0 };
  this.bl = { target: 0, current: 0 };
  this.br = { target: 0, current: 0 };

  // Legacy compatibility for 2-wheel access
  this.left = this.fl;
  this.right = this.fr;
}

/**
 * กำหนดความเร็วเป้าหมายของล้อ 4 ล้อ
 */
DifferentialDrive.prototype.setTargets4 = function (fl, fr, bl, br) {
  const cap = (v) => Math.max(-this.maxSpeed, Math.min(this.maxSpeed, v));
  this.fl.target = cap(fl);
  this.fr.target = cap(fr);
  this.bl.target = cap(bl);
  this.br.target = cap(br);
};

/**
 * กำหนดความเร็วเป้าหมายของล้อซ้ายและขวา (Legacy 2-wheel)
 */
DifferentialDrive.prototype.setTargets = function (vL, vR) {
  this.setTargets4(vL, vR, vL, vR);
};

/**
 * คำนวณความเร็วและตำแหน่งใหม่ตามระยะเวลาที่ผ่านไป (Delta Time)
 */
DifferentialDrive.prototype.step = function (pose, dt, isHolonomic) {
  if (!dt || dt <= 0) return;

  const limit = this.maxAccel * dt;
  const updateWheel = (m) => {
    const diff = m.target - m.current;
    if (Math.abs(diff) <= limit) m.current = m.target;
    else m.current += Math.sign(diff) * limit;
    return m.current;
  };

  const vFL = updateWheel(this.fl);
  const vFR = updateWheel(this.fr);
  const vBL = updateWheel(this.bl);
  const vBR = updateWheel(this.br);

  if (isHolonomic) {
    // Mecanum Kinematics (Local Frame)
    // vx = Forward, vy = Strafe Right, omega = Rotation
    const vx = (vFL + vFR + vBL + vBR) / 4;
    const vy = (-vFL + vFR + vBL - vBR) / 4;
    const omega = (-vFL + vFR - vBL + vBR) / (this.wheelBase * 2);

    // Global Transformation
    const dx = (vx * Math.cos(pose.theta) - vy * Math.sin(pose.theta)) * dt;
    const dy = (vx * Math.sin(pose.theta) + vy * Math.cos(pose.theta)) * dt;

    pose.x += dx;
    pose.y += dy;
    pose.theta += omega * dt;
  } else {
    // Standard Differential Drive (Skid-steer)
    const leftv = (vFL + vBL) / 2;
    const rightv = (vFR + vBR) / 2;

    const v = (rightv + leftv) / 2;
    const omega = (rightv - leftv) / this.wheelBase;

    pose.x += v * Math.cos(pose.theta) * dt;
    pose.y += v * Math.sin(pose.theta) * dt;
    pose.theta += omega * dt;
  }

  // ปรับแก้ค่าพิกัดให้เป็นตัวเลขที่ถูกต้อง
  if (isNaN(pose.x)) pose.x = 0;
  if (isNaN(pose.y)) pose.y = 0;
  if (isNaN(pose.theta)) pose.theta = 0;

  // ควบคุมค่ามุมให้อยู่ในช่วง 0 ถึง 2π (360 องศา)
  pose.theta = ((pose.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
};

// สร้างอินสแตนซ์สำหรับการขับเคลื่อน
const robotDrive = new DifferentialDrive({
  wheelBase: state.robotHeight || 42,
  maxAccel: 400,
  axisOffset: 0,
});

/**
 * Reset all current wheel speeds to 0 immediately.
 */
DifferentialDrive.prototype.resetCurrentSpeeds = function () {
  this.fl.current = 0;
  this.fr.current = 0;
  this.bl.current = 0;
  this.br.current = 0;
};

let lastPhysicTime = 0;
let physicsAccumulator = 0;
const FIXED_DT = 1 / 60; // 60Hz

// --- 2. ลูปการทำงานหลักของระบบฟิสิกส์ (Main Physics Loop) ---
/**
 * ฟังก์ชันทำงานวนซ้ำเพื่ออัปเดตตำแหน่งและการชนของหุ่นยนต์
 * @param {number} timestamp - เวลาปัจจุบันจากเบราว์เซอร์
 */
function updatePhysics(timestamp) {
  if (state.isRunning && !state.isDragging) {
    if (!lastPhysicTime) lastPhysicTime = timestamp;
    let frameTime = (timestamp - lastPhysicTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // ป้องกันการคำนวณมหาศาลหากเบราว์เซอร์ค้าง (Spiral of Death)
    lastPhysicTime = timestamp;

    physicsAccumulator += frameTime;

    // รันฟิสิกส์ตามจำนวน Step ที่คงที่
    while (physicsAccumulator >= FIXED_DT) {
      applyPhysicsStep(FIXED_DT);
      physicsAccumulator -= FIXED_DT;
    }

    // อัปเดตการแสดงผล (Rendering) ทำเพียงครั้งเดียวต่อเฟรม
    updateRobotDOM();
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    if (typeof updateTrackBuffer === "function") updateTrackBuffer();
    if (typeof updateSensorDots === "function") updateSensorDots();
  } else {
    // รีเซ็ตค่าเวลาเมื่อหยุดการทำงาน เพื่อป้องกันการกระโดดของตำแหน่ง (Time Warping)
    lastPhysicTime = 0;
    physicsAccumulator = 0;
  }
  requestAnimationFrame(updatePhysics);
}

/**
 * ฟังก์ชันคำนวณฟิสิกส์ในหนึ่งขั้นตอน (Single Physics Step)
 * @param {number} dt - ระยะเวลาคงที่ (Fixed Delta Time)
 */
function applyPhysicsStep(dt) {
  if (state.physicsEngine === "matter") {
    applyMatterPhysicsStep(dt);
  } else {
    applyCustomPhysicsStep(dt);
  }
}

/**
 * 1. ระบบฟิสิกส์เดิม (Custom)
 */
function applyCustomPhysicsStep(dt) {
  // Update wheelBase dynamically if it changed
  robotDrive.wheelBase = state.robotHeight || 42;

  // ตั้งค่าความเร็วมอเตอร์พร้อมตัวคูณเพื่อความเร็วที่สมจริงในโปรแกรมจำลอง
  let speedFactor = MOTOR_SPEED_FACTOR;
  if (state.robotUseMass && state.robotMass > 0) {
    // Soften the mass penalty to keep the robot moving noticeably (mass^0.25)
    speedFactor = MOTOR_SPEED_FACTOR / Math.pow(state.robotMass, 0.25);
    // Scale acceleration (inertia) based on mass: heavier = slower acceleration/braking
    robotDrive.maxAccel = 400 / Math.sqrt(state.robotMass);
  } else {
    robotDrive.maxAccel = 400; // Default acceleration
  }

  if (typeof robotDrive.setTargets4 === "function") {
    robotDrive.setTargets4(
      state.motorFL * speedFactor,
      state.motorFR * speedFactor,
      state.motorBL * speedFactor,
      state.motorBR * speedFactor,
    );
  } else {
    robotDrive.setTargets(
      state.motorL * speedFactor,
      state.motorR * speedFactor,
    );
  }

  // ดึงค่า motorPos จากเซนเซอร์ล้อ
  const wheelSensors = state.sensors.filter((s) => s.type === "wheel");
  const normalWheels = wheelSensors.filter((s) => s.wheelType !== "omni");
  const omniWheels = wheelSensors.filter((s) => s.wheelType === "omni");

  let activeMotorPosPercent =
    typeof state.motorPos !== "undefined" ? state.motorPos : 20;

  // ถ้ามีล้อธรรมดา ให้ใช้ตำแหน่งล้อธรรมดาเป็นจุดหมุนหลัก (เพราะล้อออมนิสไลด์ข้างได้)
  if (normalWheels.length > 0) {
    const sumPos = normalWheels.reduce((sum, s) => sum + (s.motorPos || 0), 0);
    activeMotorPosPercent = sumPos / normalWheels.length;
  } else if (omniWheels.length > 0) {
    // ถ้าไม่มีล้อธรรมดาเลย (เป็นออมนิทั้งหมด) ให้เฉลี่ยจากออมนิ
    const sumPos = omniWheels.reduce((sum, s) => sum + (s.motorPos || 0), 0);
    activeMotorPosPercent = sumPos / omniWheels.length;
  }

  // Convert percentage to pixels (0% front, 100% back)
  const activeMotorPos =
    state.robotWidth / 2 - (activeMotorPosPercent / 100) * state.robotWidth;

  const halfWidth = state.robotWidth / 2;
  const halfHeight = state.robotHeight / 2;

  // คำนวณตำแหน่งปัจจุบันโดยอ้างอิงจากแกนล้อ
  let pose = {
    x: state.robotX + activeMotorPos * Math.cos((state.angle * Math.PI) / 180),
    y: state.robotY + activeMotorPos * Math.sin((state.angle * Math.PI) / 180),
    theta: state.angle * (Math.PI / 180),
  };

  // ตรวจสอบว่าเป็น Holonomic Mode หรือไม่ (ต้องมี 2 รายการล้อ และทุกตัวเป็น Omni)
  const isHolonomic =
    wheelSensors.length === 2 &&
    wheelSensors.every((s) => s.wheelType === "omni");
  robotDrive.step(pose, dt, isHolonomic);

  // แปลงพิกัดกลับจากจุดกึ่งกลางแกนล้อ มาเป็นพิกัดกึ่งกลางหุ่นยนต์ (Global Coordinates)
  const nextX = pose.x - activeMotorPos * Math.cos(pose.theta);
  const nextY = pose.y - activeMotorPos * Math.sin(pose.theta);

  // ตรวจสอบการชนขอบเขตสนาม (Collision Detection)
  if (
    nextX < halfWidth ||
    nextX > canvasArea.offsetWidth - halfWidth ||
    nextY < halfHeight ||
    nextY > canvasArea.offsetHeight - halfHeight
  ) {
    stopProgram();
    logToConsole("ข้อผิดพลาดการชน: หุ่นยนต์ชนขอบสนาม!", "error");
  } else {
    // อัปเดตค่าตัวแปรหลักของระบบ
    state.robotX = nextX;
    state.robotY = nextY;
    state.angle = pose.theta * (180 / Math.PI);
  }

  const physicsGlobals = {
    robotX: state.robotX,
    robotY: state.robotY,
    angle: state.angle,
    dt,
    robotWidth: state.robotWidth,
    robotHeight: state.robotHeight,
  };
  const typeCounters = {};
  [...state.sensors, ...state.grips].forEach((sensor) => {
    const type = sensor.type;
    if (!typeCounters[type]) typeCounters[type] = 0;
    const typeIdx = typeCounters[type]++;

    const registry = window.SensorRegistry[type];
    if (registry && typeof registry.physicsStep === "function") {
      registry.physicsStep(sensor, typeIdx, physicsGlobals);
    }
  });

  // --- อัปเดตฟิสิกส์ของวัตถุบนแคนวาส ---
  if (typeof state.canvasObjects !== "undefined" && state.canvasObjects) {
    state.canvasObjects.forEach((obj) => {
      // ข้ามวัตถุที่ถูกจับอยู่ (ในกริปใดๆ)
      if (
        typeof state.grabbedObjects !== "undefined" &&
        state.grabbedObjects.includes(obj)
      )
        return;

      // อัปเดตตำแหน่งตามความเร็ว
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // แรงเสียดทาน (ลดความเร็วลงเรื่อยๆ)
      // ปรับสเกลให้เห็นผลชัดเจนขึ้น: 0.0 = ลื่นมากๆ (0.998), 1.0 = หนืด (0.85)
      const userFrictionValue = obj.friction !== undefined ? obj.friction : 0.4;
      const f = Math.max(0.5, Math.min(0.999, 1.0 - (userFrictionValue * userFrictionValue * 0.15) - 0.002));
      
      obj.vx *= f;
      obj.vy *= f;

      if (Math.abs(obj.vx) < 1) obj.vx = 0;
      if (Math.abs(obj.vy) < 1) obj.vy = 0;

      // ชนขอบหน้าจอ
      const hw = obj.radius || 15;
      if (obj.x - hw < 0) {
        obj.x = hw;
        obj.vx *= -0.8;
      }
      if (obj.x + hw > canvasArea.offsetWidth) {
        obj.x = canvasArea.offsetWidth - hw;
        obj.vx *= -0.8;
      }
      if (obj.y - hw < 0) {
        obj.y = hw;
        obj.vy *= -0.8;
      }
      if (obj.y + hw > canvasArea.offsetHeight) {
        obj.y = canvasArea.offsetHeight - hw;
        obj.vy *= -0.8;
      }
    });

    // เช็คการชนระหว่างหุ่นยนต์กับวัตถุที่ไม่ได้ถูกจับ
    const robotCenter = {
      x: state.robotX,
      y: state.robotY,
    };
    state.canvasObjects.forEach((obj) => {
      if (
        typeof state.grabbedObjects !== "undefined" &&
        state.grabbedObjects.includes(obj)
      )
        return;

      const dx = obj.x - robotCenter.x;
      const dy = obj.y - robotCenter.y;
      const dist = Math.hypot(dx, dy);
      const minDist = Math.max(halfWidth, halfHeight) + (obj.radius || 15);

      if (dist < minDist) {
        // หากระยะห่างน้อยกว่ารัศมีรวม (เกิดการชน)
        const angleToObj = Math.atan2(dy, dx);
        const overlap = minDist - dist;

        // ดันวัตถุออกไปไม่ให้ซ้อนทับหุ่นยนต์
        obj.x += Math.cos(angleToObj) * overlap;
        obj.y += Math.sin(angleToObj) * overlap;

        // ถ่ายเทความเร็วจากหุ่นยนต์ไปยังวัตถุ (Exaggerated Momentum Transfer)
        const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
        const mRobot = (state.robotUseMass && state.robotMass > 0) ? state.robotMass : 1.0;
        const mObj = obj.mass || 1.0;
        
        // Exaggerated formula for "Game Physics" feel
        const momentumFactor = (mRobot / mObj);
        const transferVelocity = v * 1.2 * momentumFactor;
        
        obj.vx += transferVelocity * Math.cos((state.angle * Math.PI) / 180);
        obj.vy += transferVelocity * Math.sin((state.angle * Math.PI) / 180);
      }
    });
  }
}

/**
 * 2. ระบบฟิสิกส์ Matter.js
 */
function initMatter() {
  console.log("Initializing Matter.js Engine...");
  if (!window.Matter) {
    console.error("Matter.js library not found! Please check index.html script tags.");
    return;
  }
  const { Engine, World, Bodies, Composite } = Matter;

  const canvasArea = document.getElementById("canvas-area");
  if (!canvasArea) {
    console.warn("canvas-area not found during initMatter");
    return;
  }

  if (!state.matterState.engine) {
    state.matterState.engine = Engine.create({ 
        gravity: { x: 0, y: 0 },
        enableSleeping: false 
    });
    state.matterState.world = state.matterState.engine.world;
  }

  const world = state.matterState.world;
  Composite.clear(world, false);
  state.matterState.objectBodies.clear();
  state.matterState.wallBodies = [];

  // Create Walls (Boundaries)
  const w = canvasArea.offsetWidth;
  const h = canvasArea.offsetHeight;
  const thickness = 100;
  const walls = [
    Bodies.rectangle(w / 2, -thickness / 2, w + thickness * 2, thickness, { isStatic: true }), // Top
    Bodies.rectangle(w / 2, h + thickness / 2, w + thickness * 2, thickness, { isStatic: true }), // Bottom
    Bodies.rectangle(-thickness / 2, h / 2, thickness, h + thickness * 2, { isStatic: true }), // Left
    Bodies.rectangle(w + thickness / 2, h / 2, thickness, h + thickness * 2, { isStatic: true }), // Right
  ];
  state.matterState.wallBodies = walls;
  Composite.add(world, walls);

  // Create Robot Body
  state.matterState.robotBody = Bodies.rectangle(
    state.robotX,
    state.robotY,
    state.robotWidth,
    state.robotHeight,
    {
      frictionAir: 0.02, // ลดลงจาก 0.1 เพื่อให้เห็นอาการแกว่ง
      friction: 0.5,
      restitution: 0.2,
      mass: (state.robotUseMass && state.robotMass > 0) ? state.robotMass : 1.0,
    }
  );
  Matter.Body.setAngle(state.matterState.robotBody, (state.angle * Math.PI) / 180);
  Composite.add(world, state.matterState.robotBody);

  // Create Object Bodies
  if (state.canvasObjects) {
    state.canvasObjects.forEach((obj) => {
      const body = Bodies.circle(obj.x, obj.y, obj.radius || 15, {
        frictionAir: 0.05,
        friction: 0.1,
        restitution: 0.8,
        mass: obj.mass || 1.0,
      });
      state.matterState.objectBodies.set(obj, body);
      Composite.add(world, body);
    });
  }
}

function applyMatterPhysicsStep(dt) {
  if (!state.matterState.engine || !state.matterState.robotBody) {
    initMatter();
    return;
  }

  const { Engine, Body } = Matter;
  const robotBody = state.matterState.robotBody;

  // Differential Drive logic mapping to Body velocity
  const speedFactor = dt * MOTOR_SPEED_FACTOR;
  
  const wheelBase = state.robotHeight || 42;
  const isHolonomic = state.sensors.filter(s => s.type === 'wheel').length === 2 && 
                     state.sensors.every(s => s.wheelType === 'omni');

  // 1. Sync targets to robotDrive and apply ramping (Acceleration logic)
  const vFL_target = state.motorFL !== undefined ? state.motorFL : (state.motorL || 0);
  const vFR_target = state.motorFR !== undefined ? state.motorFR : (state.motorR || 0);
  const vBL_target = state.motorBL !== undefined ? state.motorBL : (state.motorL || 0);
  const vBR_target = state.motorBR !== undefined ? state.motorBR : (state.motorR || 0);

  robotDrive.setTargets4(vFL_target, vFR_target, vBL_target, vBR_target);
  
  // Use a dummy pose just to run the ramping logic inside step
  const dummyPose = { x: 0, y: 0, theta: 0 };
  robotDrive.step(dummyPose, dt, isHolonomic);

  // Get RAMPED velocities
  const vFL = robotDrive.fl.current;
  const vFR = robotDrive.fr.current;
  const vBL = robotDrive.bl.current;
  const vBR = robotDrive.br.current;

  if (isHolonomic) {
    const vxL = (vFL + vFR + vBL + vBR) / 4;
    const vyL = (-vFL + vFR + vBL - vBR) / 4;
    const omega = (-vFL + vFR - vBL + vBR) / (wheelBase * 2);

    const cos = Math.cos(robotBody.angle);
    const sin = Math.sin(robotBody.angle);
    const vxG = (vxL * cos - vyL * sin) * speedFactor;
    const vyG = (vxL * sin + vyL * cos) * speedFactor;

    Body.setVelocity(robotBody, { x: vxG, y: vyG });
    Body.setAngularVelocity(robotBody, omega * speedFactor);
  } else {
    const leftv = (vFL + vBL) / 2;
    const rightv = (vFR + vBR) / 2;
    const v = (rightv + leftv) / 2;
    const omega = (rightv - leftv) / wheelBase;

    const vx = v * Math.cos(robotBody.angle) * speedFactor;
    const vy = v * Math.sin(robotBody.angle) * speedFactor;

    Body.setVelocity(robotBody, { x: vx, y: vy });
    Body.setAngularVelocity(robotBody, omega * speedFactor);
  }

  // 2. Step Engine (Using fixed dt from our loop)
  Engine.update(state.matterState.engine, dt * 1000);

  // 3. Sync State back from Matter.js
  state.robotX = robotBody.position.x;
  state.robotY = robotBody.position.y;
  state.angle = (robotBody.angle * 180) / Math.PI;

  // Sync canvas objects
  state.matterState.objectBodies.forEach((body, obj) => {
    // If object is grabbed, sync from state to Matter.js
    if (typeof state.grabbedObjects !== 'undefined' && state.grabbedObjects.includes(obj)) {
        Body.setPosition(body, { x: obj.x, y: obj.y });
        Body.setVelocity(body, { x: 0, y: 0 });
        return;
    }
    obj.x = body.position.x;
    obj.y = body.position.y;
    obj.vx = body.velocity.x * 60; // Approximate scale
    obj.vy = body.velocity.y * 60;
  });

  // 4. Handle Sensor Physics Step (Internal sensor logic like light reading)
  const physicsGlobals = {
    robotX: state.robotX,
    robotY: state.robotY,
    angle: state.angle,
    dt,
    robotWidth: state.robotWidth,
    robotHeight: state.robotHeight,
  };
  const typeCounters = {};
  [...state.sensors, ...state.grips].forEach((sensor) => {
    const type = sensor.type;
    if (!typeCounters[type]) typeCounters[type] = 0;
    const typeIdx = typeCounters[type]++;

    const registry = window.SensorRegistry[type];
    if (registry && typeof registry.physicsStep === "function") {
      registry.physicsStep(sensor, typeIdx, physicsGlobals);
    }
  });
}

// Automatically init Matter if engine is switched or objects added
window.addEventListener('load', () => {
    if (state.physicsEngine === 'matter') initMatter();
});

// Watch for object additions to sync with Matter
const originalAddCanvasObject = window.addCanvasObject;
window.addCanvasObject = function(color) {
    const obj = originalAddCanvasObject(color);
    if (state.physicsEngine === 'matter' && state.matterState.world) {
        const { Bodies, Composite } = Matter;
        const body = Bodies.circle(obj.x, obj.y, obj.radius || 15, {
            frictionAir: 0.05,
            friction: 0.1,
            restitution: 0.8,
            mass: obj.mass || 1.0,
        });
        state.matterState.objectBodies.set(obj, body);
        Composite.add(state.matterState.world, body);
    }
    return obj;
};

window.initMatter = initMatter;
window.resetMatter = function() {
    if (state.physicsEngine === 'matter' && state.matterState.robotBody) {
        const { Body } = Matter;
        Body.setPosition(state.matterState.robotBody, { x: state.robotX, y: state.robotY });
        Body.setAngle(state.matterState.robotBody, (state.angle * Math.PI) / 180);
        Body.setVelocity(state.matterState.robotBody, { x: 0, y: 0 });
        Body.setAngularVelocity(state.matterState.robotBody, 0);
        
        // Reset objects too
        state.matterState.objectBodies.forEach((body, obj) => {
            Body.setPosition(body, { x: obj.x, y: obj.y });
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
        });
    }
};

window.syncStateToMatter = function() {
    if (state.physicsEngine === 'matter' && state.matterState.robotBody) {
        const { Body } = Matter;
        // Sync Robot
        Body.setPosition(state.matterState.robotBody, { x: state.robotX, y: state.robotY });
        Body.setAngle(state.matterState.robotBody, (state.angle * Math.PI) / 180);
        Body.setVelocity(state.matterState.robotBody, { x: 0, y: 0 });
        Body.setAngularVelocity(state.matterState.robotBody, 0);

        // Sync Objects
        state.matterState.objectBodies.forEach((body, obj) => {
            Body.setPosition(body, { x: obj.x, y: obj.y });
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
        });
    }
};

// Expose to window for executor.js
window.physics = robotDrive;

// --- 3. ระบบการจัดการเซนเซอร์ (Sensor Management) ---

let showSensorRays = true;

function toggleSensorRays(enabled) {
  showSensorRays = enabled;
  updateSensorDots();
}

/**
 * อัปเดตตำแหน่งและการแสดงผลของจุดเซนเซอร์บนตัวหุ่นยนต์
 */
function updateSensorDots() {
  const sensorsSvg = document.getElementById("sensors-svg");
  if (sensorsSvg) sensorsSvg.innerHTML = "";

  const globals = {
    robotX: state.robotX,
    robotY: state.robotY,
    angle: state.angle,
    robotWidth: state.robotWidth,
    robotHeight: state.robotHeight,
    sensorVisibility: window.SensorSettings
      ? window.SensorSettings.visibility
      : {},
  };

  const typeCountersDraw = {};
  [...state.sensors, ...state.grips].forEach((sensor) => {
    const type = sensor.type;
    if (typeCountersDraw[type] === undefined) typeCountersDraw[type] = 0;
    const typeIdx = typeCountersDraw[type]++;

    const registry = window.SensorRegistry[type];
    if (registry && typeof registry.drawCanvas === "function") {
      registry.drawCanvas(sensorsSvg, sensor, globals, typeIdx);
    }
  });
}

window.addCanvasObject = function (color = "#e74c3c") {
  if (typeof state.canvasObjects !== "undefined") {
    const obj = {
      id: "obj_" + Date.now(),
      x: Math.random() * (canvasArea.offsetWidth - 100) + 50,
      y: Math.random() * (canvasArea.offsetHeight - 100) + 50,
      radius: 15,
      mass: state.objectMass !== undefined ? state.objectMass : 1.0,
      friction: state.objectFriction !== undefined ? state.objectFriction : 0.92,
      color: color,
      vx: 0,
      vy: 0,
      isGrabbed: false,
    };
    state.canvasObjects.push(obj);
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    return obj;
  }
};

window.releaseAllObjects = function () {
  if (typeof state.grabbedObjects !== "undefined") {
    state.grabbedObjects.forEach((obj) => {
      if (obj) obj.isGrabbed = false;
    });
    state.grabbedObjects.length = 0;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};
function handleGenericSensorCollision(sensor, globals) {
  if (typeof canvasObjects === "undefined" || !canvasObjects) return;

  const rad = (globals.angle * Math.PI) / 180;
  const localX =
    globals.robotWidth / 2 - ((sensor.x || 0) / 100) * globals.robotWidth;
  const localY = ((sensor.y || 0) / 100) * globals.robotHeight;

  // คำนวณตำแหน่งโลกของเซนเซอร์
  const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
  const worldX = globals.robotX + rotatedX;
  const worldY = globals.robotY + rotatedY;

  state.canvasObjects.forEach((obj) => {
    if (
      typeof state.grabbedObjects !== "undefined" &&
      state.grabbedObjects.includes(obj)
    )
      return;

    const dx = obj.x - worldX;
    const dy = obj.y - worldY;
    const dist = Math.hypot(dx, dy);
    const minDist = (obj.radius || 15) + 5; // รัศมีวัตถุ + จุดเล็งเซนเซอร์ (5)

    if (dist < minDist) {
      const angleToObj = Math.atan2(dy, dx);
      const overlap = minDist - dist;

      // ผลักวัตถุ
      obj.x += Math.cos(angleToObj) * overlap;
      obj.y += Math.sin(angleToObj) * overlap;

      // ถ่ายเทความเร็ว (Exaggerated Momentum Transfer)
      if (typeof robotDrive !== "undefined") {
        const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
        const mRobot = (state.robotUseMass && state.robotMass > 0) ? state.robotMass : 1.0;
        const mObj = obj.mass || 1.0;
        const transferVelocity = v * 1.2 * (mRobot / mObj);

        obj.vx += transferVelocity * Math.cos(rad);
        obj.vy += transferVelocity * Math.sin(rad);
      }
    }
  });
}
