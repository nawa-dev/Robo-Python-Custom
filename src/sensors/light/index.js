import lightPlugin from "./logic.js";
import { registerLightPythonAPI } from "./executor.js";
import "./physics.js";

lightPlugin.registerPythonAPI = registerLightPythonAPI;

export default lightPlugin;
