import objectPlugin from "./logic.js";
import { registerObjectPythonAPI } from "./executor.js";
import { objectPhysicsStep } from "./physics.js";

objectPlugin.registerPythonAPI = registerObjectPythonAPI;
objectPlugin.physicsStep = objectPhysicsStep;

export default objectPlugin;
