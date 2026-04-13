import gripPlugin from "./logic.js";
import { registerGripPythonAPI } from "./executor.js";
import { grabObject, releaseObject } from "./physics.js";

gripPlugin.registerPythonAPI = registerGripPythonAPI;
gripPlugin.grabObject = grabObject;
gripPlugin.releaseObject = releaseObject;

export default gripPlugin;
