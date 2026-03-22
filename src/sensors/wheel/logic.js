window.SensorRegistry["wheel"] = {
  create: function(id, count) {
    return {
      id,
      type: "wheel",
      name: "Wheel"
    };
  },
  drawPreview: function(svg, sensor) {
    // Wheel is statically drawn in HTML generally, but can be added here if needed
  },
  read: function(sensor, globals) {
    return 0;
  },
  updateValue: function(id, axis, value) {
    if (typeof handleMotorPosition === "function") {
        handleMotorPosition(value);
    }
  }
};
