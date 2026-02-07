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

    updateRobotDOM();
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

  sensors.forEach((sensor, index) => {
    const dot = document.createElement("div");
    dot.className = "sensor-dot";

    // คำนวณตำแหน่งเซนเซอร์สัมพัทธ์กับจุดหมุนของหุ่นยนต์
    const localX = sensor.x - 25;
    const localY = sensor.y - 25;

    const rad = (angle * Math.PI) / 180;
    const cos_a = Math.cos(rad);
    const sin_a = Math.sin(rad);

    // ใช้ Rotation Matrix เพื่อหาตำแหน่งเซนเซอร์หลังการหมุนตัวหุ่น
    const rotatedX = localX * cos_a - localY * sin_a;
    const rotatedY = localX * sin_a + localY * cos_a;

    const canvasX = robotX + 25 + rotatedX;
    const canvasY = robotY + 25 + rotatedY;

    dot.style.left = canvasX + "px";
    dot.style.top = canvasY + "px";

    if (sensor.type === "ultrasonic") {
        dot.style.backgroundColor = sensor.color || "#0984e3";
        // Calculate Direction of Sensor
        // Sensor angle is relative to Robot angle
        const sensorGlobalAngle = angle + (sensor.angle || 0); 
        const dist = getUltrasonicDistance(canvasX, canvasY, sensorGlobalAngle, sensor.color || "#000000");
        
        sensor.value = dist; // Store current value
        
        dot.title = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} cm/px\nDetecting: ${sensor.color || "#000000"}`;

        dot.title = `${sensor.name} [${index}]\nDistance: ${dist.toFixed(1)} cm/px\nDetecting: ${sensor.color || "#000000"}`;

        // Visualize Ray
        if (showSensorRays) {
            const rayLine = document.createElement("div");
            rayLine.style.position = "absolute";
            rayLine.style.left = canvasX + "px";
            rayLine.style.top = canvasY + "px";
            rayLine.style.width = dist + "px";
            rayLine.style.height = "1px";
            
            // Use sensor color for ray, but semi-transparent
            const rayColor = sensor.color || "#0984e3";
            rayLine.style.backgroundColor = rayColor; 
            rayLine.style.opacity = "0.5";
            
            rayLine.style.transformOrigin = "0 0";
            rayLine.style.transform = `rotate(${sensorGlobalAngle}deg)`;
            rayLine.style.pointerEvents = "none";
            rayLine.className = "sensor-dot"; // Add class to remove on next update
            canvasArea.appendChild(rayLine);
        }

    } else {
        // Light Sensor
        // คำนวณค่าความสว่างพื้นผิวใต้ตำแหน่งเซนเซอร์
        let brightness = 512;
        if (canvasPixelData) {
            brightness = getPixelBrightness(canvasX, canvasY);
        }
        sensor.value = brightness; // Store value
        dot.title = `${sensor.name} [${index}]\nBrightness: ${brightness}`;
    }

    dot.dataset.sensorId = sensor.id;

    canvasArea.appendChild(dot);
  });
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
    let tr = 0, tg = 0, tb = 0;
    if (targetColor && targetColor.startsWith("#")) {
        const hex = targetColor.substring(1);
        tr = parseInt(hex.substring(0, 2), 16);
        tg = parseInt(hex.substring(2, 4), 16);
        tb = parseInt(hex.substring(4, 6), 16);
    }

    let dist = 0;
    const step = 2; // Step size for optimization
    const maxDist = 800; // Max range
    const threshold = 100; // Color distance threshold (0-441 approx)

    while (dist < maxDist) {
        dist += step;
        const cx = startX + dist * cosA;
        const cy = startY + dist * sinA;

        // Check boundaries
        if (cx < 0 || cx >= canvasArea.offsetWidth || cy < 0 || cy >= canvasArea.offsetHeight) {
            return dist;
        }

        const pixelX = Math.round(cx);
        const pixelY = Math.round(cy);
        const width = canvasArea.offsetWidth;
        const idx = (pixelY * width + pixelX) * 4;

        if (idx < 0 || idx >= canvasPixelData.length) return dist;

        const r = canvasPixelData[idx];
        const g = canvasPixelData[idx+1];
        const b = canvasPixelData[idx+2];
        
        // Calculate Euclidean distance between colors
        // dist = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
        const colorDist = Math.sqrt(
            Math.pow(r - tr, 2) + 
            Math.pow(g - tg, 2) + 
            Math.pow(b - tb, 2)
        );

        if (colorDist < threshold) {
            return dist;
        }
    }

    return maxDist;
}
