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

      // จัดการวัตถุที่ถูกจับ (ตามตำแหน่งของแต่ละ Grip)
      if (typeof grabbedObjects !== "undefined" && grabbedObjects.length > 0) {
        const rad_val = (angle * Math.PI) / 180;
        const cos_v = Math.cos(rad_val);
        const sin_v = Math.sin(rad_val);

        grips.forEach((grip, idx) => {
          const obj = grabbedObjects[idx];
          if (!obj) return;

          // คำนวณตำแหน่ง global ของ grip
          const localX = grip.x - 25;
          const localY = grip.y - 25;
          const rotatedX = localX * cos_v - localY * sin_v;
          const rotatedY = localX * sin_v + localY * cos_v;
          const gripCanvasX = robotX + 25 + rotatedX;
          const gripCanvasY = robotY + 25 + rotatedY;
          
          // มุม global ของ grip
          const gripGlobalAngle = (angle + (grip.angle || 0)) * (Math.PI / 180);
          
          // ระยะห่างจากจุดยึด grip ไปยังจุดศูนย์กลางวัตถุ
          const grabDist = 15; // รัศมีวัตถุโดยประมาณ
          
          obj.x = gripCanvasX + grabDist * Math.cos(gripGlobalAngle);
          obj.y = gripCanvasY + grabDist * Math.sin(gripGlobalAngle);
          obj.vx = 0;
          obj.vy = 0;
        });
      }

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
  const oldDots = document.querySelectorAll(".sensor-dot");
  oldDots.forEach((dot) => dot.remove());

  // Remove old grip elements
  const oldGrips = document.querySelectorAll(".grip-canvas-el");
  oldGrips.forEach((el) => el.remove());

  const rad = (angle * Math.PI) / 180;
  const cos_a = Math.cos(rad);
  const sin_a = Math.sin(rad);

  // 1. Render Sensors
  sensors.forEach((sensor, index) => {
    const dot = document.createElement("div");
    dot.className = "sensor-dot";

    const localX = sensor.x - 25;
    const localY = sensor.y - 25;

    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;

    const canvasX = robotX + 25 + rotatedX;
    const canvasY = robotY + 25 + rotatedY;

    dot.style.left = canvasX + "px";
    dot.style.top = canvasY + "px";

    if (sensor.type === "ultrasonic") {
      dot.style.backgroundColor = sensor.color || "#0984e3";
      const sensorGlobalAngle = angle + (sensor.angle || 0);
      const dist = getUltrasonicDistance(
        canvasX,
        canvasY,
        sensorGlobalAngle,
        sensor.color || "#000000",
      );
      sensor.value = dist;
      dot.title = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} cm/px`;

      if (showSensorRays) {
        const rayLine = document.createElement("div");
        rayLine.style.position = "absolute";
        rayLine.style.left = canvasX + "px";
        rayLine.style.top = canvasY + "px";
        rayLine.style.width = dist + "px";
        rayLine.style.height = "1px";
        rayLine.style.backgroundColor = sensor.color || "#0984e3";
        rayLine.style.opacity = "0.5";
        rayLine.style.transformOrigin = "0 0";
        rayLine.style.transform = `rotate(${sensorGlobalAngle}deg)`;
        rayLine.style.pointerEvents = "none";
        rayLine.className = "sensor-dot";
        canvasArea.appendChild(rayLine);
      }
    } else {
      let brightness = 512;
      if (canvasPixelData) brightness = getPixelBrightness(canvasX, canvasY);
      sensor.value = brightness;
      dot.title = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
    }
    canvasArea.appendChild(dot);
  });

  // 2. Render Grips
  if (typeof showGripPreview !== "undefined" && showGripPreview) {
    grips.forEach((grip) => {
      const localX = grip.x - 25;
      const localY = grip.y - 25;
      const rotatedX = localX * cos_a - localY * sin_a;
      const rotatedY = localX * sin_a + localY * cos_a;
      const canvasX = robotX + 25 + rotatedX;
      const canvasY = robotY + 25 + rotatedY;
      const globalAngle = angle + (grip.angle || 0);

      const gripContainer = document.createElement("div");
      gripContainer.className = "grip-canvas-el";
      gripContainer.style.left = canvasX + "px";
      gripContainer.style.top = canvasY + "px";
      gripContainer.style.transform = `rotate(${globalAngle}deg)`;

      // Arm
      const arm = document.createElement("div");
      arm.className = "grip-arm-canvas-el";
      arm.style.width = "10px";
      gripContainer.appendChild(arm);

      // Tip (where jaws start)
      const tipX = 10;
      const tipY = 0;

      // Jaws
      const jawL = document.createElement("div");
      jawL.className = "grip-jaw-canvas-el";
      jawL.style.width = "5px";
      jawL.style.left = tipX + "px";
      jawL.style.top = tipY + "px";
      jawL.style.transform = "rotate(30deg)";
      gripContainer.appendChild(jawL);

      const jawR = document.createElement("div");
      jawR.className = "grip-jaw-canvas-el";
      jawR.style.width = "5px";
      jawR.style.left = tipX + "px";
      jawR.style.top = tipY + "px";
      jawR.style.transform = "rotate(-30deg)";
      gripContainer.appendChild(jawR);

      // Base
      const base = document.createElement("div");
      base.className = "grip-base-canvas-el";
      gripContainer.appendChild(base);

      canvasArea.appendChild(gripContainer);
    });
  }
}

/**
 * อ่านค่าความสว่างของพิกเซลที่กำหนดจากข้อมูลภาพในหน่วยความจำ
 * @param {number} x - พิกัดแนวนอนบนแคนวาส
 * @param {number} y - พิกัดแนวตั้งบนแคนวาส
 * @returns {number} ค่าความสว่าง (0 = ขาว, 1024 = ดำ)
 */
function getPixelBrightness(x, y) {
  if (!canvasPixelData) return 512;

  const pixelX = Math.round(x);
  const pixelY = Math.round(y);

  // ตรวจสอบขอบเขตของพิกัด
  if (
    pixelX < 0 ||
    pixelX >= canvasArea.offsetWidth ||
    pixelY < 0 ||
    pixelY >= canvasArea.offsetHeight
  ) {
    return 512;
  }

  const imageWidth = canvasArea.offsetWidth;
  const pixelIndex = (pixelY * imageWidth + pixelX) * 4;

  if (pixelIndex + 2 >= canvasPixelData.length) return 512;

  // อ่านค่าสี Red, Green, Blue
  const r = canvasPixelData[pixelIndex];
  const g = canvasPixelData[pixelIndex + 1];
  const b = canvasPixelData[pixelIndex + 2];

  // คำนวณค่าเฉลี่ยความสว่างและแปลงช่วงค่า
  // ปรับให้ค่าสูง (ใกล้ 1024) แทนสีดำ และค่าต่ำแทนสีขาว เพื่อให้ง่ายต่อการเขียนโค้ดเดินตามเส้น
  const avgBrightness = (r + g + b) / 3;
  return Math.round((255 - avgBrightness) * 4);
}

/**
 * Calculate distance using Raycasting
 * @param {number} startX - Start X coordinate
 * @param {number} startY - Start Y coordinate
 * @param {number} angleDeg - Ray angle in degrees
 * @returns {number} Distance in pixels (max 800)
 */
/**
 * Calculate distance using Raycasting
 * @param {number} startX - Start X coordinate
 * @param {number} startY - Start Y coordinate
 * @param {number} angleDeg - Ray angle in degrees
 * @param {string} targetColor - Hex color to detect (e.g., "#000000")
 * @returns {number} Distance in pixels (max 800)
 */
function getUltrasonicDistance(startX, startY, angleDeg, targetColor) {
  if (!canvasPixelData) return 800;

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  // Parse target color
  let tr = 0,
    tg = 0,
    tb = 0;
  if (targetColor && targetColor.startsWith("#")) {
    const hex = targetColor.substring(1);
    tr = parseInt(hex.substring(0, 2), 16);
    tg = parseInt(hex.substring(2, 4), 16);
    tb = parseInt(hex.substring(4, 6), 16);
  }

  let minDist = 800;
  // --- 1. ตรวจสอบระยะห่างจากวัตถุบนแคนวาส (canvasObjects) ---
  if (typeof canvasObjects !== "undefined" && canvasObjects) {
    for (let i = 0; i < canvasObjects.length; i++) {
      const obj = canvasObjects[i];
      const ocX = startX - obj.x;
      const ocY = startY - obj.y;
      const b = 2 * (cosA * ocX + sinA * ocY);
      const c = ocX * ocX + ocY * ocY - (obj.radius || 15) * (obj.radius || 15);
      const disc = b * b - 4 * c;
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / 2;
        if (t >= 0 && t < minDist) {
          minDist = t;
        }
      }
    }
  }

  let dist = 0;
  const step = 2; // Step size for optimization
  const maxDist = minDist; // Max range
  const threshold = 100; // Color distance threshold (0-441 approx)

  while (dist < maxDist) {
    dist += step;
    const cx = startX + dist * cosA;
    const cy = startY + dist * sinA;

    // Check boundaries
    if (
      cx < 0 ||
      cx >= canvasArea.offsetWidth ||
      cy < 0 ||
      cy >= canvasArea.offsetHeight
    ) {
      return dist;
    }

    const pixelX = Math.round(cx);
    const pixelY = Math.round(cy);
    const width = canvasArea.offsetWidth;
    const idx = (pixelY * width + pixelX) * 4;

    if (idx < 0 || idx >= canvasPixelData.length) return dist;

    const r = canvasPixelData[idx];
    const g = canvasPixelData[idx + 1];
    const b = canvasPixelData[idx + 2];

    // Calculate Euclidean distance between colors
    // dist = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
    const colorDist = Math.sqrt(
      Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2),
    );

    if (colorDist < threshold) {
      return dist;
    }
  }

  return maxDist;
}

// --- 8. ระบบหยิบจับวัตถุ (Grabbing System) ---
window.grabObject = function (index = 0) {
  if (typeof grips === "undefined" || !grips[index]) return;
  if (typeof grabbedObjects !== "undefined" && grabbedObjects[index]) return;

  const rad = (angle * Math.PI) / 180;
  const cos_a = Math.cos(rad);
  const sin_a = Math.sin(rad);

  // หาตำแหน่ง global ของกริปที่ต้องการ
  const grip = grips[index];
  const localX = grip.x - 25;
  const localY = grip.y - 25;
  const rotatedX = localX * cos_a - localY * sin_a;
  const rotatedY = localX * sin_a + localY * cos_a;
  const gripCanvasX = robotX + 25 + rotatedX;
  const gripCanvasY = robotY + 25 + rotatedY;
  
  const gripGlobalAngle = (angle + (grip.angle || 0)) * (Math.PI / 180);

  let closestObj = null;
  let closestDist = 30; // รัศมีวัตถุ 15 + ระยะเอื้อม 15

  if (typeof canvasObjects !== "undefined" && canvasObjects) {
    canvasObjects.forEach((obj) => {
      // ข้ามวัตถุที่ถูกจับโดยกริปอื่นอยู่แล้ว
      if (grabbedObjects.includes(obj)) return;

      const dx = obj.x - gripCanvasX;
      const dy = obj.y - gripCanvasY;
      const dist = Math.hypot(dx, dy);

      if (dist <= closestDist) {
        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToObj - gripGlobalAngle);
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        angleDiff = Math.abs(angleDiff);

        if (angleDiff <= Math.PI / 3) {
          closestObj = obj;
          closestDist = dist;
        }
      }
    });
  }

  if (closestObj) {
    grabbedObjects[index] = closestObj;
    closestObj.isGrabbed = true;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};

window.releaseObject = function (index = 0) {
  if (typeof grabbedObjects !== "undefined" && grabbedObjects[index]) {
    const obj = grabbedObjects[index];
    obj.isGrabbed = false;

    // ปล่อยวัตถุไว้ที่ตำแหน่งกริป (บวกระยะยื่นเล็กน้อย)
    const grip = grips[index];
    const gripGlobalAngle = (angle + (grip.angle || 0)) * (Math.PI / 180);
    
    // obj.x += Math.cos(gripGlobalAngle) * 5;
    // obj.y += Math.sin(gripGlobalAngle) * 5;

    obj.vx = 0;
    obj.vy = 0;

    grabbedObjects[index] = null;
    if (typeof updateObjectsDOM === "function") updateObjectsDOM();
  }
};

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
