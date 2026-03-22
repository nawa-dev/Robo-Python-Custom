# 🤖 Robo-Python

A web-based **2D robot programming simulator** that allows users to control a robot using **Python**, designed for learning, experimentation, and education.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-v2.2.0-blue)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Language-Python-yellow)

---

## ✨ Features

- **2D robot simulation** with differential drive kinematics
- **Integrated Tabbed Interface**: Seamlessly switch between the **Code Editor** and **Robot Settings** within the same pane.
- **Specialized Sensor APIs**:
    - **Light Sensors**: Use `analogRead(index)` to measure surface brightness.
    - **Ultrasonic Sensors**: Use `getUltrasonic(index)` or `ultrasonic(index)` for distance (type-relative indexing).
    - **Compass**: Use `getCompass()` or `compass()` for robot orientation (only if equipped).
- **Actuators & Objects**:
    - **Grip System**: Use `grab(index)` and `release(index)` to interact with objects.
    - **Interactive Objects**: Drag and drop objects onto the canvas. Now supports **manual interaction during runtime!**
- **Dynamic Modular Architecture**: Every sensor is a standalone module with its own drawing, physics, and Python API logic.
- **Smart Python Environment**:
    - **In-browser execution** via [Skulpt](https://skulpt.org/)
    - **Auto-Delay Injection**: Automatically prevents browser freeze in infinite loops.
    - **Zero-Based Indexing**: UI and Code consistent with 0-based counting.
- **Customizable**: Configure sensor positions, angles, arm lengths, and detection parameters.

---

## 🚀 Getting Started

1. **Open** `index.html` in your browser.
2. **Switch to Robot Setting Tab**: Configure your robot by adding Wheels, Ultrasonic, Light Sensors, or Grips.
3. **Configure Devices**: Each device has its own panel with parameters like `x`, `y`, `angle`, and specialized options like `canInteractWithObject`.
4. **Write Code**: Switch back to the "Code" tab and write Python code using the API below.
5. **Run**: Click the "Run" button in the toolbar to start the simulation!

---

## 📟 Python API Reference

| Command                | Description                                                                                                                                                                                                 |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motor(left, right)`   | Control motors. Speed: `-100` to `100`.<br>Example: `motor(50, 50)` moves forward.                                                                                                                          |
| `delay(ms)`            | Pause execution for `ms` milliseconds.<br>Example: `delay(1000)` pauses for 1 second.                                                                                                                       |
| `analogRead(index)`    | Read value from **Light Sensor** at `index` (separately indexed for Light type). Returns 0-1024.                                                                                                            |
| `getUltrasonic(index)` | Read distance from **Ultrasonic Sensor** at `index` (pixels 0-800). Alias: `ultrasonic(index)`.                                                                                                             |
| `getCompass()`         | Returns the robot's current angle (0-359). Only returns values if a Compass sensor is equipped. Alias: `compass()`.                                                                                       |
| `SW(index)`            | Check state of switch pins `SW1`, `SW2`, or `SW3`. Returns `True` if pressed.<br>Example: `SW(1)`.                                                                                                            |
| `waitSW(index)`        | Pause program until switch button is pressed.                                                                                                                                                               |
| `grab(index)`          | Activate grabber at `index`.                                                                                                                                                                                |
| `release(index)`       | Deactivate grabber at `index`.                                                                                                                                                                              |
| `spawn_object(color)`  | Dynamically spawn an object of the specified color.<br>Example: `spawn_object("red")`.                                                                                                                      |
| `getSensorCount()`     | Returns total number of sensors attached.                                                                                                                                                                   |
| `print(message)`       | Print text to the debug console.                                                                                                                                                                            |

---

### 💡 Tips
- **Index Separation**: Light Sensors and Ultrasonic Sensors have their own independent counts. `analogRead(0)` is always the first Light sensor, and `getUltrasonic(0)` is always the first Ultrasonic sensor.
- **Infinite Loops**: You can safely use `while True:`. The system handles delays automatically.
- **Runtime Interaction**: You can manually drag objects on the canvas even while your code is running to test your robot's reaction!
- **Wheel Management**: The robot always starts with a permanent **FRONT WHEEL**. You can add a **BACK WHEEL** for stability, but the front wheel is protected from deletion to maintain basic mobility.
- **Dynamic Storage**: Sensors and Actuators are now stored in specialized arrays (`sensors` vs `grips`) based on their configuration, managed automatically by the core system.
