import robotPlugin from "./logic.js";
import { registerRobotPythonAPI } from "./executor.js";
import { robotPhysicsStep } from "./physics.js";

robotPlugin.registerPythonAPI = registerRobotPythonAPI;
robotPlugin.physicsStep = robotPhysicsStep;

export default robotPlugin;
