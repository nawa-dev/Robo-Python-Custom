/**
 * ระบบฟิสิกส์และระบบเซนเซอร์ (Physics & Sensor System)
 * รองรับการคำนวณจลนศาสตร์แบบ Differential Drive
 */

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

  this.left = { target: 0, current: 0 };
  this.right = { target: 0, current: 0 };
}

/**
 * กำหนดความเร็วเป้าหมายของล้อซ้ายและขวา
 * @param {number} vL - ความเร็วล้อซ้าย
 * @param {number} vR - ความเร็วล้อขวา
 */
DifferentialDrive.prototype.setTargets = function (vL, vR) {
  this.left.target = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, vL));
  this.right.target = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, vR));
};

/**
 * คำนวณความเร็วและตำแหน่งใหม่ตามระยะเวลาที่ผ่านไป (Delta Time)
 * @param {Object} pose - ออบเจกต์ตำแหน่งปัจจุบัน (x, y, theta)
 * @param {number} dt - ระยะเวลาที่เปลี่ยนไปในหน่วยวินาที
 */
DifferentialDrive.prototype.step = function (pose, dt) {
  if (!dt || dt <= 0) return;

  const limit = this.maxAccel * dt;
  const updateWheel = (m) => {
    const diff = m.target - m.current;
    if (Math.abs(diff) <= limit) m.current = m.target;
    else m.current += Math.sign(diff) * limit;
    return m.current;
  };

  const vL = updateWheel(this.left);
  const vR = updateWheel(this.right);

  // คำนวณความเร็วเชิงเส้น (v) และความเร็วเชิงมุม (omega)
  const v = 0.5 * (vR + vL);
  const omega = (vR - vL) / this.wheelBase;

  // ปรับปรุงตำแหน่งพิกัด x, y และมุม theta (หน่วยเรเดียน)
  pose.x += v * Math.cos(pose.theta) * dt;
  pose.y += v * Math.sin(pose.theta) * dt;
  pose.theta += omega * dt;

  // ควบคุมค่ามุมให้อยู่ในช่วง 0 ถึง 2π (360 องศา)
  pose.theta = ((pose.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
};

// สร้างอินสแตนซ์สำหรับการขับเคลื่อน
const robotDrive = new DifferentialDrive({
  wheelBase: 42,
  maxAccel: 400,
  axisOffset: 0, // ค่านี้จะถูกอัปเดตตาม motorPos จริง
});

let lastPhysicTime = 0;

// --- 2. ลูปการทำงานหลักของระบบฟิสิกส์ (Main Physics Loop) ---
/**
 * ฟังก์ชันทำงานวนซ้ำเพื่ออัปเดตตำแหน่งและการชนของหุ่นยนต์
 * @param {number} timestamp - เวลาปัจจุบันจากเบราว์เซอร์
 */
function updatePhysics(timestamp) {
  if (isRunning && !isDragging) {
    if (!lastPhysicTime) lastPhysicTime = timestamp;
    const dt = (timestamp - lastPhysicTime) / 1000;
    lastPhysicTime = timestamp;

    // ตั้งค่าความเร็วมอเตอร์พร้อมตัวคูณเพื่อความเร็วที่สมจริงในโปรแกรมจำลอง
    robotDrive.setTargets(motorL * 2.5, motorR * 2.5);

    // คำนวณตำแหน่งปัจจุบันโดยอ้างอิงจากแกนล้อ
    let pose = {
      x: robotX + 25 + motorPos * Math.cos((angle * Math.PI) / 180),
      y: robotY + 25 + motorPos * Math.sin((angle * Math.PI) / 180),
      theta: angle * (Math.PI / 180),
    };

    robotDrive.step(pose, dt);

    // แปลงพิกัดกลับจากจุดกึ่งกลางแกนล้อ มาเป็นพิกัดมุมซ้ายบนของหุ่นยนต์ (Global Coordinates)
    const newCenterX = pose.x - motorPos * Math.cos(pose.theta);
    const newCenterY = pose.y - motorPos * Math.sin(pose.theta);

    const nextX = newCenterX - 25;
    const nextY = newCenterY - 25;

    // ตรวจสอบการชนขอบเขตสนาม (Collision Detection)
    if (
      nextX < 0 ||
      nextX > canvasArea.offsetWidth - 50 ||
      nextY < 0 ||
      nextY > canvasArea.offsetHeight - 50
    ) {
      stopProgram();
      logToConsole("ข้อผิดพลาดการชน: หุ่นยนต์ชนขอบสนาม!", "error");
    } else {
      // อัปเดตค่าตัวแปรหลักของระบบ
      robotX = nextX;
      robotY = nextY;
      angle = pose.theta * (180 / Math.PI);
    }

    const physicsGlobals = { robotX, robotY, angle, dt };
    [...sensors, ...grips].forEach((sensor, index) => {
        const registry = window.SensorRegistry[sensor.type];
        if (registry && typeof registry.physicsStep === "function") {
            registry.physicsStep(sensor, index, physicsGlobals);
        }
    });

    // --- อัปเดตฟิสิกส์ของวัตถุบนแคนวาส ---
    if (typeof canvasObjects !== "undefined" && canvasObjects) {
      canvasObjects.forEach((obj) => {
        // ข้ามวัตถุที่ถูกจับอยู่ (ในกริปใดๆ)
        if (typeof grabbedObjects !== "undefined" && grabbedObjects.includes(obj))
          return;

        // อัปเดตตำแหน่งตามความเร็ว
        obj.x += obj.vx * dt;
        obj.y += obj.vy * dt;

        // แรงเสียดทาน (ลดความเร็วลงเรื่อยๆ)
        obj.vx *= 0.92;
        obj.vy *= 0.92;

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
      const robotCenter = { x: robotX + 25, y: robotY + 25 };
      canvasObjects.forEach((obj) => {
        if (typeof grabbedObjects !== "undefined" && grabbedObjects.includes(obj))
          return;

        const dx = obj.x - robotCenter.x;
        const dy = obj.y - robotCenter.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 25 + (obj.radius || 15);

        if (dist < minDist) {
          // หากระยะห่างน้อยกว่ารัศมีรวม (เกิดการชน)
          const angleToObj = Math.atan2(dy, dx);
          const overlap = minDist - dist;

          // ดันวัตถุออกไปไม่ให้ซ้อนทับหุ่นยนต์
          obj.x += Math.cos(angleToObj) * overlap;
          obj.y += Math.sin(angleToObj) * overlap;

          // ถ่ายเทความเร็วจากหุ่นยนต์ไปยังวัตถุ
          const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
          obj.vx += v * Math.cos((angle * Math.PI) / 180) * 0.8;
          obj.vy += v * Math.sin((angle * Math.PI) / 180) * 0.8;
        }
      });
    }

    updateRobotDOM();
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    if (typeof updateSensorDots === "function") updateSensorDots();
  } else {
    // รีเซ็ตค่าเวลาเมื่อหยุดการทำงาน เพื่อป้องกันการกระโดดของตำแหน่ง (Time Warping)
    lastPhysicTime = 0;
  }
  requestAnimationFrame(updatePhysics);
}

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
      robotX: robotX,
      robotY: robotY,
      angle: angle,
      showSensorRays: showSensorRays,
      showGripPreview: typeof showGripPreview !== "undefined" ? showGripPreview : true
  };

  [...sensors, ...grips].forEach((sensor, index) => {
      const registry = window.SensorRegistry[sensor.type];
      if (registry && typeof registry.drawCanvas === "function") {
          registry.drawCanvas(sensorsSvg, sensor, globals, index);
      }
  });
}







window.addCanvasObject = function (color = "#e74c3c") {
  if (typeof canvasObjects !== "undefined") {
    const obj = {
      id: "obj_" + Date.now(),
      x: Math.random() * (canvasArea.offsetWidth - 100) + 50,
      y: Math.random() * (canvasArea.offsetHeight - 100) + 50,
      radius: 15,
      color: color,
      vx: 0,
      vy: 0,
      isGrabbed: false,
    };
    canvasObjects.push(obj);
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    return obj;
  }
};

window.releaseAllObjects = function () {
  if (typeof grabbedObjects !== "undefined") {
    grabbedObjects.forEach((obj) => {
      if (obj) obj.isGrabbed = false;
    });
    grabbedObjects.length = 0;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};
function handleGenericSensorCollision(sensor, globals) {
  if (typeof canvasObjects === "undefined" || !canvasObjects) return;

  const rad = (globals.angle * Math.PI) / 180;
  const localX = (sensor.x || 0) - 25;
  const localY = (sensor.y || 0) - 25;
  
  // คำนวณตำแหน่งโลกของเซนเซอร์
  const rotatedX = localX * Math.cos(rad) - localY * Math.sin(rad);
  const rotatedY = localX * Math.sin(rad) + localY * Math.cos(rad);
  const worldX = globals.robotX + 25 + rotatedX;
  const worldY = globals.robotY + 25 + rotatedY;

  canvasObjects.forEach((obj) => {
    if (typeof grabbedObjects !== "undefined" && grabbedObjects.includes(obj)) return;

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

      // ถ่ายเทความเร็ว
      if (typeof robotDrive !== "undefined") {
        const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
        obj.vx += v * Math.cos(rad) * 0.8;
        obj.vy += v * Math.sin(rad) * 0.8;
      }
    }
  });
}
