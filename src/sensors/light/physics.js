/**
 * อ่านค่าความสว่างของพิกเซลที่กำหนดจากข้อมูลภาพในหน่วยความจำ
 * @param {string} [targetColor="#ff0000"] - สีที่ต้องการตรวจจับ (Hex code)
 * @returns {number} ค่าความเข้มข้นของสี (0 = เหมือนมาก, 1024 = ต่างกันมาก)
 */
window.getPixelBrightness = function (x, y, targetColor = "#ff0000") {
  if (!state.canvasPixelData) return 512;

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

  if (pixelIndex + 2 >= state.canvasPixelData.length) return 512;

  // อ่านค่าสี Red, Green, Blue จากพิกเซล
  const r = state.canvasPixelData[pixelIndex];
  const g = state.canvasPixelData[pixelIndex + 1];
  const b = state.canvasPixelData[pixelIndex + 2];

  // แปลงสีเป้าหมายจาก Hex เป็น RGB Weights (0-1)
  let wr = 1,
    wg = 0,
    wb = 0;
  if (targetColor && targetColor.startsWith("#")) {
    const hex = targetColor.substring(1);
    wr = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
    wg = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
    wb = (parseInt(hex.substring(4, 6), 16) || 0) / 255;
  }

  // คำนวณความเข้มของสีตามน้ำหนัก (Weighted Intensity)
  // หากเลือกสีขาว (1,1,1) จะได้เฉลี่ย (r+g+b)/3
  // หากเลือกสีแดง (1,0,0) จะได้ค่า r
  const totalWeight = wr + wg + wb || 1;
  const weightedIntensity = (r * wr + g * wg + b * wb) / totalWeight;

  // แปลงความเข้ม (0 - 255) ให้เป็นช่วงค่าเซนเซอร์ (0 - 1024)
  // 0 = มืด (สีดำ/ไม่เจอสี), 1024 = สว่าง (สีขาว/เจอสีที่เลือก)
  return Math.round((weightedIntensity / 255) * 1024);
};
