window.SensorRegistry["object"] = {
  updateValue: function (key, value) {
    state[key] = value;
    
    // Support propagating template changes to all existing objects
    const prop = key === "objectMass" ? "mass" : (key === "objectFriction" ? "friction" : null);
    if (prop && state.canvasObjects) {
      state.canvasObjects.forEach(obj => {
        obj[prop] = value;
      });
      if (typeof updateObjectsDOM === "function") updateObjectsDOM();
    }
  }
};
