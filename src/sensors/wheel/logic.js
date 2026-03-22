window.SensorRegistry["wheel"] = {
  create: function(id, count) {
    return {
      id,
      type: "wheel",
      name: "Wheel",
      motorPos: 0,
      wheelType: "normal"
    };
  },
  drawPreview: function(svg, sensor) {
    if (typeof window.syncWheelDOM === "function") window.syncWheelDOM();
  },
  read: function(sensor, globals) {
    return 0;
  },
  updateValue: function(id, axis, value) {
    // Use the standard window.updateSensorValueDOM for non-singleton
    if (typeof window.updateSensorValueDOM === "function") {
        window.updateSensorValueDOM(id, "wheel", axis, value);
    }
  }
};
