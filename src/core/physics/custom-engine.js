import { canvasArea, state } from "../variableGlobal.js";
import { logToConsole } from "../../ui/ui-manager.js";
import { stopProgram } from "../executor.js";
import { MOTOR_SPEED_FACTOR, robotDrive } from "./drive-controller.js";
import { runSensorPhysicsStep } from "./sensor-physics.js";

export function applyCustomPhysicsStep(dt) {
  robotDrive.wheelBase = state.robotHeight || 42;

  let speedFactor = MOTOR_SPEED_FACTOR;
  if (state.robotUseMass && state.robotMass > 0) {
    speedFactor = MOTOR_SPEED_FACTOR / Math.pow(state.robotMass, 0.25);
    robotDrive.maxAccel = 400 / Math.sqrt(state.robotMass);
  } else {
    robotDrive.maxAccel = 400;
  }

  robotDrive.setTargets4(
    state.motorFL * speedFactor,
    state.motorFR * speedFactor,
    state.motorBL * speedFactor,
    state.motorBR * speedFactor,
  );

  const wheelSensors = state.sensors.filter((sensor) => sensor.type === "wheel");
  const normalWheels = wheelSensors.filter((sensor) => sensor.wheelType !== "omni");
  const omniWheels = wheelSensors.filter((sensor) => sensor.wheelType === "omni");

  let activeMotorPosPercent = state.motorPos !== undefined ? state.motorPos : 20;
  if (normalWheels.length > 0) {
    activeMotorPosPercent =
      normalWheels.reduce((sum, sensor) => sum + (sensor.motorPos || 0), 0) /
      normalWheels.length;
  } else if (omniWheels.length > 0) {
    activeMotorPosPercent =
      omniWheels.reduce((sum, sensor) => sum + (sensor.motorPos || 0), 0) /
      omniWheels.length;
  }

  const activeMotorPos =
    state.robotWidth / 2 - (activeMotorPosPercent / 100) * state.robotWidth;
  const halfWidth = state.robotWidth / 2;
  const halfHeight = state.robotHeight / 2;

  const pose = {
    x: state.robotX + activeMotorPos * Math.cos((state.angle * Math.PI) / 180),
    y: state.robotY + activeMotorPos * Math.sin((state.angle * Math.PI) / 180),
    theta: state.angle * (Math.PI / 180),
  };

  const isHolonomic =
    wheelSensors.length === 2 &&
    wheelSensors.every((sensor) => sensor.wheelType === "omni");

  robotDrive.step(pose, dt, isHolonomic);

  const nextX = pose.x - activeMotorPos * Math.cos(pose.theta);
  const nextY = pose.y - activeMotorPos * Math.sin(pose.theta);

  if (
    nextX < halfWidth ||
    nextX > canvasArea.offsetWidth - halfWidth ||
    nextY < halfHeight ||
    nextY > canvasArea.offsetHeight - halfHeight
  ) {
    stopProgram();
    logToConsole("¢éÍ¼Ô´¾ÅÒ´¡ÒÃª¹: ËØè¹Â¹µìª¹¢ÍºÊ¹ÒÁ!", "error");
  } else {
    state.robotX = nextX;
    state.robotY = nextY;
    state.angle = pose.theta * (180 / Math.PI);
  }

  runSensorPhysicsStep(dt);

  if (!state.canvasObjects) {
    return;
  }

  state.canvasObjects.forEach((obj) => {
    if (state.grabbedObjects && state.grabbedObjects.includes(obj)) {
      return;
    }

    obj.x += obj.vx * dt;
    obj.y += obj.vy * dt;

    const userFrictionValue = obj.friction !== undefined ? obj.friction : 0.4;
    const friction = Math.max(
      0.5,
      Math.min(0.999, 1.0 - userFrictionValue * userFrictionValue * 0.15 - 0.002),
    );

    obj.vx *= friction;
    obj.vy *= friction;

    if (Math.abs(obj.vx) < 1) obj.vx = 0;
    if (Math.abs(obj.vy) < 1) obj.vy = 0;

    const halfObject = obj.radius || 15;
    if (obj.x - halfObject < 0) {
      obj.x = halfObject;
      obj.vx *= -0.8;
    }
    if (obj.x + halfObject > canvasArea.offsetWidth) {
      obj.x = canvasArea.offsetWidth - halfObject;
      obj.vx *= -0.8;
    }
    if (obj.y - halfObject < 0) {
      obj.y = halfObject;
      obj.vy *= -0.8;
    }
    if (obj.y + halfObject > canvasArea.offsetHeight) {
      obj.y = canvasArea.offsetHeight - halfObject;
      obj.vy *= -0.8;
    }
  });

  const robotCenter = { x: state.robotX, y: state.robotY };
  state.canvasObjects.forEach((obj) => {
    if (state.grabbedObjects && state.grabbedObjects.includes(obj)) {
      return;
    }

    const dx = obj.x - robotCenter.x;
    const dy = obj.y - robotCenter.y;
    const dist = Math.hypot(dx, dy);
    const minDist = Math.max(halfWidth, halfHeight) + (obj.radius || 15);

    if (dist < minDist) {
      const angleToObj = Math.atan2(dy, dx);
      const overlap = minDist - dist;

      obj.x += Math.cos(angleToObj) * overlap;
      obj.y += Math.sin(angleToObj) * overlap;

      const v = 0.5 * (robotDrive.left.current + robotDrive.right.current);
      const mRobot = state.robotUseMass && state.robotMass > 0 ? state.robotMass : 1.0;
      const mObj = obj.mass || 1.0;
      const transferVelocity = v * 1.2 * (mRobot / mObj);

      obj.vx += transferVelocity * Math.cos((state.angle * Math.PI) / 180);
      obj.vy += transferVelocity * Math.sin((state.angle * Math.PI) / 180);
    }
  });
}


