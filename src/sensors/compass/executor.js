export function registerCompassPythonAPI(Sk, robotObj) {
  const getValue = new Sk.builtin.func(function () {
    const hasCompass =
      typeof state.sensors !== "undefined" &&
      state.sensors.some((sensor) => sensor.type === "compass");

    if (hasCompass && typeof state.angle !== "undefined") {
      const angle = ((Math.round(state.angle) % 360) + 360) % 360;
      return new Sk.builtin.int_(angle);
    }
    return new Sk.builtin.int_(0);
  });

  robotObj.getCompass = getValue;
  robotObj.compass = getValue;
}
