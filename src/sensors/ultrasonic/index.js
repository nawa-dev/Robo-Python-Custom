import ultrasonicPlugin from "./logic.js";
import { registerUltrasonicPythonAPI } from "./executor.js";
import "./physics.js";

ultrasonicPlugin.registerPythonAPI = registerUltrasonicPythonAPI;

export default ultrasonicPlugin;
