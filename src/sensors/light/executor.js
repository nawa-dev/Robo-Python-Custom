if (window.SensorRegistry["light"]) {
  window.SensorRegistry["light"].registerPythonAPI = function (Sk, robotObj, globals) {
    robotObj.analogRead = new Sk.builtin.func(function (index) {
        Sk.builtin.pyCheckArgs("analogRead", arguments, 1, 1);
        let i = Sk.builtin.asnum$(index);

        let promise = new Promise(function (resolve, reject) {
            // Initial check
            if (typeof stopRequest !== "undefined" && stopRequest) {
                reject("StopExecution");
                return;
            }

            setTimeout(() => {
                const lightSensors = sensors.filter(s => s.type === "light");
                if (i < 0 || i >= lightSensors.length) {
                    resolve(new Sk.builtin.int_(0));
                    return;
                }

                const s = lightSensors[i];
                const registry = window.SensorRegistry["light"];
                let result = 0;
                if (registry && typeof registry.read === "function") {
                    result = registry.read(s, { robotX, robotY, angle, motorPos });
                }
                resolve(new Sk.builtin.int_(result));
            }, 0);
        });

        return new Sk.misceval.promiseToSuspension(promise);
    });
  };
}
