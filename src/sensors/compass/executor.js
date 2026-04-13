export function registerCompassPythonAPI(Sk, robotObj) {
  const getValue = new Sk.builtin.func(function () {
    const hasCompass =
      typeof state.sensors !== "undefined" &&
      state.sensors.some((sensor) => sensor.type === "compass");

    if (hasCompass && typeof state.angle !== "undefined") {
      return new Sk.builtin.int_(Math.round(state.angle));
    }
    return new Sk.builtin.int_(0);
  });

  robotObj.getCompass = getValue;
  robotObj.compass = getValue;
}
