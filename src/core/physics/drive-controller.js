import { state } from "../variableGlobal.js";
import { DifferentialDrive } from "./differential-drive.js";

export const MOTOR_SPEED_FACTOR = 1;
export const FIXED_DT = 1 / 60;

export const robotDrive = new DifferentialDrive({
  wheelBase: state.robotHeight || 42,
  maxAccel: 400,
  axisOffset: 0,
});

export function setDriveTargets(left, right) {
  robotDrive.setTargets(left, right);
}

export function setDriveTargets4(frontLeft, frontRight, backLeft, backRight) {
  robotDrive.setTargets4(frontLeft, frontRight, backLeft, backRight);
}

export function resetDrive() {
  robotDrive.resetCurrentSpeeds();
  robotDrive.setTargets4(0, 0, 0, 0);
}
