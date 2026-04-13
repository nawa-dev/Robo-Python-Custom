/**
 * Differential Drive Kinematics
 */
export function DifferentialDrive(opts) {
  opts = opts || {};
  this.wheelBase = opts.wheelBase || 40;
  this.maxAccel = opts.maxAccel || 300;
  this.maxSpeed = opts.maxSpeed || 250;
  this.axisOffset = opts.axisOffset || 0;

  this.fl = { target: 0, current: 0 };
  this.fr = { target: 0, current: 0 };
  this.bl = { target: 0, current: 0 };
  this.br = { target: 0, current: 0 };

  // Legacy compatibility for 2-wheel access
  this.left = this.fl;
  this.right = this.fr;
}

DifferentialDrive.prototype.setTargets4 = function (fl, fr, bl, br) {
  const cap = (v) => Math.max(-this.maxSpeed, Math.min(this.maxSpeed, v));
  this.fl.target = cap(fl);
  this.fr.target = cap(fr);
  this.bl.target = cap(bl);
  this.br.target = cap(br);
};

DifferentialDrive.prototype.setTargets = function (vL, vR) {
  this.setTargets4(vL, vR, vL, vR);
};

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
    const vx = (vFL + vFR + vBL + vBR) / 4;
    const vy = (-vFL + vFR + vBL - vBR) / 4;
    const omega = (-vFL + vFR - vBL + vBR) / (this.wheelBase * 2);

    const dx = (vx * Math.cos(pose.theta) - vy * Math.sin(pose.theta)) * dt;
    const dy = (vx * Math.sin(pose.theta) + vy * Math.cos(pose.theta)) * dt;

    pose.x += dx;
    pose.y += dy;
    pose.theta += omega * dt;
  } else {
    const leftv = (vFL + vBL) / 2;
    const rightv = (vFR + vBR) / 2;

    const v = (rightv + leftv) / 2;
    const omega = (rightv - leftv) / this.wheelBase;

    pose.x += v * Math.cos(pose.theta) * dt;
    pose.y += v * Math.sin(pose.theta) * dt;
    pose.theta += omega * dt;
  }

  if (isNaN(pose.x)) pose.x = 0;
  if (isNaN(pose.y)) pose.y = 0;
  if (isNaN(pose.theta)) pose.theta = 0;

  pose.theta = ((pose.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

};

DifferentialDrive.prototype.resetCurrentSpeeds = function () {
  this.fl.current = 0;
  this.fr.current = 0;
  this.bl.current = 0;
  this.br.current = 0;
};


