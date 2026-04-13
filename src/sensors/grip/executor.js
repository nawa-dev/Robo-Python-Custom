export function registerGripPythonAPI(Sk, robotObj) {
  robotObj.grab = new Sk.builtin.func(function (index) {
    Sk.builtin.pyCheckArgs("grab", arguments, 1, 1);
    if (typeof stopRequest !== "undefined" && stopRequest) {
      throw "StopExecution";
    }
    const idx = Sk.builtin.asnum$(index);
    if (typeof window.grabObject === "function") {
      window.grabObject(idx);
    }
    return Sk.builtin.none.none$;
  });

  robotObj.release = new Sk.builtin.func(function (index) {
    Sk.builtin.pyCheckArgs("release", arguments, 1, 1);
    if (typeof stopRequest !== "undefined" && stopRequest) {
      throw "StopExecution";
    }
    const idx = Sk.builtin.asnum$(index);
    if (typeof window.releaseObject === "function") {
      window.releaseObject(idx);
    }
    return Sk.builtin.none.none$;
  });
}
