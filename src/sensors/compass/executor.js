if (window.SensorRegistry["compass"]) {
  window.SensorRegistry["compass"].registerPythonAPI = function (Sk, robotObj, globals) {
    const getValue = new Sk.builtin.func(function () {
      // Check if any compass sensor is currently equipped
      const hasCompass = typeof sensors !== "undefined" && sensors.some(s => s.type === "compass");
      
      if (hasCompass && typeof angle !== "undefined") {
        return new Sk.builtin.int_(Math.round(angle));
      }
      return new Sk.builtin.int_(0);
    });

    robotObj.getCompass = getValue;
    robotObj.compass = getValue; // Alias for convenience
  };
}
