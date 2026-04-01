import wheelPlugin from "./logic.js";
import { registerWheelPythonAPI } from "./executor.js";
import { wheelPhysicsStep } from "./physics.js";

wheelPlugin.registerPythonAPI = registerWheelPythonAPI;
wheelPlugin.physicsStep = wheelPhysicsStep;

export default wheelPlugin;
