if (window.SensorRegistry["ultrasonic"]) {
  window.SensorRegistry["ultrasonic"].registerPythonAPI = function (Sk, robotObj, globals) {
    const fn = new Sk.builtin.func(function (index) {
        let i = 0;
        if (index !== undefined) i = Sk.builtin.asnum$(index);
        
        // กรองเฉพาะเซนเซอร์ชนิด ultrasonic
        const ultraSensors = state.sensors.filter(s => s.type === "ultrasonic");
        
        if (i >= 0 && i < ultraSensors.length) {
            return new Sk.builtin.int_(Math.round(ultraSensors[i].value || 0));
        }
        return new Sk.builtin.int_(0);
    });
    
    robotObj.getUltrasonic = fn;
    robotObj.ultrasonic = fn; // Alias for convenience
  };
}
