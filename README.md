# 🤖 Robo-Python

A web-based **2D robot programming simulator** that allows users to control a robot using **Python**, designed for learning, experimentation, and education.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-v1.3.0-blue)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Language-Python-yellow)

---

## ✨ Features

- **2D robot simulation** with differential drive kinematics
- **Integrated Tabbed Interface**: Seamlessly switch between the **Code Editor** and **Robot Settings** within the same pane.
- **Multiple Sensor Types**:
    - **Light Sensors**: Measure surface brightness.
    - **Ultrasonic Sensors**: Measure distance to obstacles.
- **Actuators & Objects**:
    - **Grip System**: Grab and release objects in the environment.
    - **Interactive Objects**: Drag and drop objects with different colors onto the canvas.
- **Smart Python Environment**:
    - **In-browser execution** via [Skulpt](https://skulpt.org/)
    - **Auto-Delay Injection**: Automatically prevents browser freeze in infinite loops.
    - **Native Stop**: Stop button interrupts execution immediately.
- **Customizable**: Configure sensor/grip positions, angles, and detection parameters.

---

## 🚀 Getting Started

1. **Open** `index.html` in your browser.
2. **Switch to Robot Setting Tab**: Select the "Robot Setting" tab in the left pane to configure your robot.
3. **Configure Devices**: Add Wheels, Ultrasonic, Light Sensors, or Grips and set their parameters.
4. **Write Code**: Switch back to the "Code" tab and write Python code using the API below.
5. **Run**: Click the "Run" button in the toolbar to start the simulation!

---

## 📟 Python API Reference

| Command                | Description                                                                                                                                                                                                 |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motor(left, right)`   | Control motors. Speed: `-100` to `100`.<br>Example: `motor(50, 50)` moves forward.                                                                                                                          |
| `delay(ms)`            | Pause execution for `ms` milliseconds.<br>Example: `delay(1000)` pauses for 1 second.                                                                                                                       |
| `analogRead(index)`    | Read value from sensor at `index` (0, 1, 2...).<br>- **Light Sensor**: Returns brightness (0-1024).<br>- **Ultrasonic Sensor**: Returns distance in pixels (0-800).                                         |
| `SW(index)`            | Check the state of switch button `SW1`, `SW2`, or `SW3`. Returns `True` if pressed.<br>Example: `SW(1)` for SW1.                                                                                            |
| `waitSW(index)`        | Pause program until switch button is pressed.                                                                                                                                                               |
| `grab(index)`          | Activate grabber at `index`.                                                                                                                                                                                |
| `release(index)`       | Deactivate grabber at `index`.                                                                                                                                                                              |
| `spawn_object(color)`  | Dynamically spawn an object of the specified color.<br>Example: `spawn_object("#e74c3c")`.                                                                                                                  |
| `getSensorCount()`     | Returns total number of sensors attached.                                                                                                                                                                   |
| `print(message)`       | Print text to the debug console.                                                                                                                                                                            |

---

### 💡 Tips
- **Infinite Loops**: You can safely use `while True:` or `while 1:` loops. The system automatically inserts a small delay to keep the browser responsive.
- **Ultrasonic Color**: In sensor settings, pick a color (e.g., Red). The simulator will treat *only* that color as an obstacle for that specific sensor.
- **Grip Interaction**: Use `grab()` and `release()` to interact with canvas objects. You can find the device index in the Robot Settings tab.
