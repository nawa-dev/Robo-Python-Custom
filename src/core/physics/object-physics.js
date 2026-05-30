import { canvasArea, state } from "../variableGlobal.js";

function updateObjectsView() {
  if (typeof window.updateObjectsDOM === "function") {
    window.updateObjectsDOM();
  }
}

export function addCanvasObject(color = "#e74c3c") {
  if (!state.canvasObjects) {
    return null;
  }

  const obj = {
    id: `obj_${Date.now()}`,
    x: Math.random() * (canvasArea.offsetWidth - 100) + 50,
    y: Math.random() * (canvasArea.offsetHeight - 100) + 50,
    radius: 15,
    mass: state.objectMass !== undefined ? state.objectMass : 1.0,
    friction: state.objectFriction !== undefined ? state.objectFriction : 0.92,
    color,
    vx: 0,
    vy: 0,
    isGrabbed: false,
  };

  state.canvasObjects.push(obj);

  if (state.physicsEngine === "matter" && state.matterState.world) {
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

  updateObjectsView();
  return obj;
}

export function releaseAllObjects() {
  if (state.canvasObjects) {
    state.canvasObjects.forEach((obj) => {
      obj.vx = 0;
      obj.vy = 0;
    });
  }

  if (
    state.physicsEngine === "matter" &&
    state.matterState &&
    state.matterState.objectBodies &&
    typeof Matter !== "undefined"
  ) {
    state.matterState.objectBodies.forEach((body) => {
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
    });
  }

  if (!state.grabbedObjects) {
    return;
  }

  state.grabbedObjects.forEach((obj) => {
    if (obj) {
      obj.isGrabbed = false;
    }
  });
  state.grabbedObjects.length = 0;
  updateObjectsView();
}

window.addCanvasObject = addCanvasObject;
window.releaseAllObjects = releaseAllObjects;
