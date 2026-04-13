import compassPlugin from "./logic.js";
import { registerCompassPythonAPI } from "./executor.js";

compassPlugin.registerPythonAPI = registerCompassPythonAPI;

export default compassPlugin;
