const wheelPlugin = {
  create: function (id) {
    return {
      id,
      type: "wheel",
      name: "Wheel",
      motorPos: 0,
      wheelType: "normal",
    };
  },
  drawPreview: function () {
    if (typeof window.syncWheelDOM === "function") {
      window.syncWheelDOM(true);
    }
  },
  read: function () {
    return 0;
  },
  updateValue: function (id, axis, value) {
    if (typeof window.updateSensorValueDOM === "function") {
      window.updateSensorValueDOM(id, "wheel", axis, value);
    }
  },
  getDisplayName: function (sensor, index) {
    if (index === 0) {
      return "FRONT WHEEL";
    }
    return "BACK WHEEL";
  },
};

if (window.registerSensorPlugin) {
  window.registerSensorPlugin("wheel", wheelPlugin);
} else {
  window.SensorRegistry["wheel"] = wheelPlugin;
}

export default wheelPlugin;
