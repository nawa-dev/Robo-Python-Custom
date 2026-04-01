import { state } from "../../core/index.js";

export function registerLightPythonAPI(Sk, robotObj) {
  robotObj.analogRead = new Sk.builtin.func(function (index) {
    Sk.builtin.pyCheckArgs("analogRead", arguments, 1, 1);
    const sensorIndex = Sk.builtin.asnum$(index);

    const promise = new Promise((resolve, reject) => {
      if (typeof stopRequest !== "undefined" && stopRequest) {
        reject("StopExecution");
        return;
      }

      setTimeout(() => {
        const lightSensors = state.sensors.filter((sensor) => sensor.type === "light");
        if (sensorIndex < 0 || sensorIndex >= lightSensors.length) {
          resolve(new Sk.builtin.int_(0));
          return;
        }

        const sensor = lightSensors[sensorIndex];
        const registry = window.getSensorPlugin
          ? window.getSensorPlugin("light")
          : window.SensorRegistry.light;

        let result = 0;
        if (registry && typeof registry.read === "function") {
          result = registry.read(sensor, {
            robotX: state.robotX,
            robotY: state.robotY,
            angle: state.angle,
            motorPos: state.motorPos,
            robotWidth: state.robotWidth,
            robotHeight: state.robotHeight,
          });
        }

        resolve(new Sk.builtin.int_(result));
      }, 0);
    });

    return new Sk.misceval.promiseToSuspension(promise);
  });
}
