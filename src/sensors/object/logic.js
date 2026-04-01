const objectPlugin = {
  updateValue: function (key, value) {
    state[key] = value;

    const prop =
      key === "objectMass"
        ? "mass"
        : key === "objectFriction"
          ? "friction"
          : null;
    if (prop && state.canvasObjects) {
      state.canvasObjects.forEach((obj) => {
        obj[prop] = value;
      });
      if (typeof updateObjectsDOM === "function") {
        updateObjectsDOM();
      }
    }
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("object", objectPlugin);
} else {
  window.SensorRegistry["object"] = objectPlugin;
}

export default objectPlugin;
