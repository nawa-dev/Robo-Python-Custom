/**
 * อ่านค่าความสว่างของพิกเซลที่กำหนดจากข้อมูลภาพในหน่วยความจำ
 * @param {number} x - พิกัดแนวนอนบนแคนวาส
 * @param {number} y - พิกัดแนวตั้งบนแคนวาส
 * @returns {number} ค่าความสว่าง (0 = ขาว, 1024 = ดำ)
 */
window.getPixelBrightness = function(x, y) {
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
};
