# 🛠️ Sensor Creation Manual (Robo-Python v2.1.0)

This guide explains how to create and install a new sensor or actuator in the Robo-Python simulator.

---

## 📂 Sensor Directory Structure

Each sensor is a self-contained module located in `src/sensors/[sensor_name]/`.

| File | Responsibility |
| :--- | :--- |
| `config.json` | Defines the sensor's name, UI category, and configurable inputs (x, y, angle, etc.). |
| `render.html` | Contains the SVG snippet that defines how the sensor looks on the robot. |
| `logic.js` | The heart of the sensor. Handles creation, drawing on canvas, reading values, and physics. |
| `executor.js` | Registers the Python API functions for this sensor (e.g., `analogRead`, `getUltrasonic`). |
| `physics.js` | (Optional) Advanced collision or physics logic if the sensor interacts with objects. |

---

## 🚀 Step-by-Step Creation

### 1. Create the Folder
Create a new directory: `src/sensors/my_sensor/`

### 2. Define `config.json`
This file tells the UI what controls to show for your sensor.

```json
{
  "name": "My Sensor",
  "category": "Sensor",
  "inputs": [
    { "axis": "x", "label": "X Position", "type": "number", "min": 0, "max": 50, "step": 1 },
    { "axis": "y", "label": "Y Position", "type": "number", "min": 0, "max": 50, "step": 1 },
    { "axis": "angle", "label": "Angle", "type": "number", "min": -180, "max": 180, "step": 5 }
  ],
  "api": [
    { "keyword": "readMySensor" }
  ]
}
```

### 3. Create `render.html`
Provide an SVG group (`<g>`) that represents your sensor's visual design.

```html
<g class="my-sensor-el">
  <circle cx="0" cy="0" r="5" fill="#3498db" stroke="white" stroke-width="1" />
  <line x1="0" y1="0" x2="10" y2="0" stroke="white" stroke-width="1" />
</g>
```

### 4. Implement `logic.js`
Register your sensor in the global `window.SensorRegistry`.

```javascript
window.SensorRegistry["my_sensor"] = {
  create: function (id, count) {
    return {
      id: "my_sensor_" + id,
      type: "my_sensor",
      name: `My Sensor ${count}`,
      x: 25, y: 25, angle: 0,
      value: 0
    };
  },
  drawCanvas: function (svg, sensor, globals, index) {
    // Logic to calculate canvasX/Y and append the template to the SVG layer
  },
  read: function (sensor, globals) {
    // Logic to calculate the sensor value (e.g., distance or brightness)
    return sensor.value;
  }
};
```

### 5. Register Python API in `executor.js`
Add your functions to the `robot` object.

```javascript
if (window.SensorRegistry["my_sensor"]) {
  window.SensorRegistry["my_sensor"].registerPythonAPI = function (Sk, robotObj, globals) {
    robotObj.readMySensor = new Sk.builtin.func(function (index) {
      Sk.builtin.pyCheckArgs("readMySensor", arguments, 1, 1);
      // Logic to find the specific sensor and return its value
      return new Sk.builtin.int_(42); 
    });
  };
}
```

### 6. Installation
Open the root `config.json` and add your sensor name to the list:

```json
{
  "installed_sensors": [
    "light",
    "ultrasonic",
    "grip",
    "compass",
    "wheel",
    "my_sensor" 
  ]
}
```

---

## 💡 Best Practices
- **Type-Relative Indexing**: In `executor.js`, always filter the global `sensors` array by your sensor's type before using the user-provided `index`. This ensures `myFunction(0)` always refers to the first sensor of that specific type.
- **Yielding to Browser**: For reading functions, use the `Promise`/`setTimeout(0)` pattern to prevent the Python loop from locking the browser UI.
