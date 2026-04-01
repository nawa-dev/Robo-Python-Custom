import { state } from "../../core/index.js";

export function registerUltrasonicPythonAPI(Sk, robotObj) {
  const fn = new Sk.builtin.func(function (index) {
    let sensorIndex = 0;
    if (index !== undefined) {
      sensorIndex = Sk.builtin.asnum$(index);
    }

    const ultrasonicSensors = state.sensors.filter(
      (sensor) => sensor.type === "ultrasonic",
    );

    if (sensorIndex >= 0 && sensorIndex < ultrasonicSensors.length) {
      return new Sk.builtin.int_(Math.round(ultrasonicSensors[sensorIndex].value || 0));
    }

    return new Sk.builtin.int_(0);
  });

  robotObj.getUltrasonic = fn;
  robotObj.ultrasonic = fn;
}
