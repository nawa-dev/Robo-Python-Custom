# 🤖 Robo-Python

A web-based **2D robot programming simulator** that allows users to control a robot using **Python**, designed for learning, experimentation, and education.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Language-Python-yellow)

---

## ✨ Features

- **2D robot simulation** with differential drive kinematics
- **Multiple Sensor Types**: Support for **Light Sensors** (brightness) and **Ultrasonic Sensors** (distance)
- **Color Detection**: Ultrasonic sensors can detect specific colors as obstacles
- **Interactive UI**: Drag & drop robot, configurable map, and sensor settings
- **Smart Python Environment**:
    - **In-browser execution** via [Skulpt](https://skulpt.org/)
    - **Auto-Delay Injection**: Automatically prevents browser freeze in infinite loops
    - **Native Stop**: Stop button interrupts execution immediately
- **Customizable**: Change sensor positions (X, Y), angles (-180° to 180°), and detection colors

---

## 🚀 Getting Started

1. **Open** `index.html` in your browser.
2. **Add Sensors**: Click "Sensor Settings" to add Light or Ultrasonic sensors.
3. **Configure**: Set position, angle, and target color for each sensor.
4. **Code**: Write Python code using the API below.
5. **Run**: Click "Run" to simulate!

---

## 📟 Python API Reference

| Command              | Description                                                                                                                                                                                                 |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motor(left, right)` | Control motors. Speed: `-100` to `100`.<br>Example: `motor(50, 50)` moves forward.                                                                                                                          |
| `delay(ms)`          | Pause execution for `ms` milliseconds.<br>Example: `delay(1000)` pauses for 1 second.                                                                                                                       |
| `analogRead(index)`  | Read value from sensor at `index` (0, 1, 2...).<br>- **Light Sensor**: Returns brightness (0-1024).<br>- **Ultrasonic Sensor**: Returns distance in pixels (0-800).                                         |
| `SW()`               | Check the state of the switch button `SW1` (if available). Returns `True` if pressed.                                                                                                                       |
| `waitSW()`           | Pause program until the switch button `SW1` is pressed.                                                                                                                                                     |
| `print(message)`     | Print text to the debug console.                                                                                                                                                                            |
| `getSensorCount()`   | Returns total number of sensors attached.                                                                                                                                                                   |

### 💡 Tips
- **Infinite Loops**: You can safely use `while True:` or `while 1:` loops. The system automatically inserts a small delay to keep the browser responsive.
- **Ultrasonic Color**: In sensor settings, pick a color (e.g., Red). The simulator will treat *only* that color as an obstacle for that specific sensor.
