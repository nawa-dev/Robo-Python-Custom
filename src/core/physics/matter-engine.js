import { canvasArea, state } from "../variableGlobal.js";
import { MOTOR_SPEED_FACTOR, robotDrive } from "./drive-controller.js";
import { runSensorPhysicsStep } from "./sensor-physics.js";

export function initMatter() {
  console.log("Initializing Matter.js Engine...");
  if (!window.Matter || !canvasArea) {
    console.error("Matter.js or canvas area not available.");
    return;
  }

  const { Engine, Bodies, Composite } = Matter;

  if (!state.matterState.engine) {
    state.matterState.engine = Engine.create({
      gravity: { x: 0, y: 0 },
      enableSleeping: false,
    });
    state.matterState.world = state.matterState.engine.world;
  }

  const world = state.matterState.world;
  Composite.clear(world, false);
  state.matterState.objectBodies.clear();
  state.matterState.wallBodies = [];

  const width = canvasArea.offsetWidth;
  const height = canvasArea.offsetHeight;
  const thickness = 100;
  const walls = [
    Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
    Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height + thickness * 2, { isStatic: true }),
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height + thickness * 2, { isStatic: true }),
  ];

  state.matterState.wallBodies = walls;
  Composite.add(world, walls);

  state.matterState.robotBody = Bodies.rectangle(
    state.robotX,
    state.robotY,
    state.robotWidth,
    state.robotHeight,
    {
      frictionAir: 0.02,
      friction: 0.5,
      restitution: 0.2,
      mass: state.robotUseMass && state.robotMass > 0 ? state.robotMass : 1.0,
    },
  );

  Matter.Body.setAngle(state.matterState.robotBody, (state.angle * Math.PI) / 180);
  Composite.add(world, state.matterState.robotBody);

  (state.canvasObjects || []).forEach((obj) => {
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

export function applyMatterPhysicsStep(dt) {
  if (!state.matterState.engine || !state.matterState.robotBody) {
    initMatter();
    return;
  }

  const { Engine, Body } = Matter;
  const robotBody = state.matterState.robotBody;
  const speedFactor = dt * MOTOR_SPEED_FACTOR;
  const wheelBase = state.robotHeight || 42;
  const wheelSensors = state.sensors.filter((sensor) => sensor.type === "wheel");
  const isHolonomic =
    wheelSensors.length === 2 &&
    wheelSensors.every((sensor) => sensor.wheelType === "omni");
  const normalWheels = wheelSensors.filter((sensor) => sensor.wheelType !== "omni");
  const omniWheels = wheelSensors.filter((sensor) => sensor.wheelType === "omni");

  let activeMotorPosPercent = state.motorPos !== undefined ? state.motorPos : 20;
  if (normalWheels.length > 0) {
    activeMotorPosPercent =
      normalWheels.reduce((sum, sensor) => sum + (parseFloat(sensor.motorPos) || 0), 0) /
      normalWheels.length;
  } else if (omniWheels.length > 0) {
    activeMotorPosPercent =
      omniWheels.reduce((sum, sensor) => sum + (parseFloat(sensor.motorPos) || 0), 0) /
      omniWheels.length;
  }

  const activeMotorPos =
    state.robotWidth / 2 - (activeMotorPosPercent / 100) * state.robotWidth;

  const targetFL = state.motorFL !== undefined ? state.motorFL : state.motorL || 0;
  const targetFR = state.motorFR !== undefined ? state.motorFR : state.motorR || 0;
  const targetBL = state.motorBL !== undefined ? state.motorBL : state.motorL || 0;
  const targetBR = state.motorBR !== undefined ? state.motorBR : state.motorR || 0;

  robotDrive.setTargets4(targetFL, targetFR, targetBL, targetBR);
  robotDrive.step({ x: 0, y: 0, theta: 0 }, dt, isHolonomic);

  const vFL = robotDrive.fl.current;
  const vFR = robotDrive.fr.current;
  const vBL = robotDrive.bl.current;
  const vBR = robotDrive.br.current;

  if (isHolonomic) {
    const vxLocal = (vFL + vFR + vBL + vBR) / 4;
    const vyLocal = (-vFL + vFR + vBL - vBR) / 4;
    const omega = (-vFL + vFR - vBL + vBR) / (wheelBase * 2);

    const cos = Math.cos(robotBody.angle);
    const sin = Math.sin(robotBody.angle);
    const vxAtAxle = (vxLocal * cos - vyLocal * sin) * speedFactor;
    const vyAtAxle = (vxLocal * sin + vyLocal * cos) * speedFactor;
    const rx = activeMotorPos * cos;
    const ry = activeMotorPos * sin;
    Body.setVelocity(robotBody, {
      x: vxAtAxle + omega * speedFactor * ry,
      y: vyAtAxle - omega * speedFactor * rx,
    });
    Body.setAngularVelocity(robotBody, omega * speedFactor);
  } else {
    const leftVelocity = (vFL + vBL) / 2;
    const rightVelocity = (vFR + vBR) / 2;
    const linearVelocity = (rightVelocity + leftVelocity) / 2;
    const omega = (rightVelocity - leftVelocity) / wheelBase;
    const cos = Math.cos(robotBody.angle);
    const sin = Math.sin(robotBody.angle);
    const vxAtAxle = linearVelocity * cos * speedFactor;
    const vyAtAxle = linearVelocity * sin * speedFactor;
    const rx = activeMotorPos * cos;
    const ry = activeMotorPos * sin;

    Body.setVelocity(robotBody, {
      x: vxAtAxle + omega * speedFactor * ry,
      y: vyAtAxle - omega * speedFactor * rx,
    });
    Body.setAngularVelocity(robotBody, omega * speedFactor);
  }

  Engine.update(state.matterState.engine, dt * 1000);

  state.robotX = robotBody.position.x;
  state.robotY = robotBody.position.y;
  state.angle = (robotBody.angle * 180) / Math.PI;

  state.matterState.objectBodies.forEach((body, obj) => {
    if (state.grabbedObjects && state.grabbedObjects.includes(obj)) {
      Body.setPosition(body, { x: obj.x, y: obj.y });
      Body.setVelocity(body, { x: 0, y: 0 });
      return;
    }

    obj.x = body.position.x;
    obj.y = body.position.y;
    obj.vx = body.velocity.x * 60;
    obj.vy = body.velocity.y * 60;
  });

  runSensorPhysicsStep(dt);
}

export function resetMatter() {
  if (!(state.physicsEngine === "matter" && state.matterState.robotBody)) {
    return;
  }

  const { Body } = Matter;
  Body.setPosition(state.matterState.robotBody, { x: state.robotX, y: state.robotY });
  Body.setAngle(state.matterState.robotBody, (state.angle * Math.PI) / 180);
  Body.setVelocity(state.matterState.robotBody, { x: 0, y: 0 });
  Body.setAngularVelocity(state.matterState.robotBody, 0);

  state.matterState.objectBodies.forEach((body, obj) => {
    Body.setPosition(body, { x: obj.x, y: obj.y });
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  });
}

export function syncStateToMatter() {
  resetMatter();
}

window.addEventListener("load", () => {
  if (state.physicsEngine === "matter") {
    initMatter();
  }
});

window.initMatter = initMatter;
window.resetMatter = resetMatter;
window.syncStateToMatter = syncStateToMatter;

