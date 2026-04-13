# Robo-Python

A web-based **2D robot programming simulator** that lets users control a robot using **Python** for learning, experimentation, and education.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-v2.2.3-blue)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Language-Python-yellow)

---

## Features

- **2D robot simulation** with differential drive kinematics
- **Integrated tabbed interface** for switching between the code editor and robot settings
- **Sensor APIs**:
  - `analogRead(index)` for light sensors
  - `getUltrasonic(index)` / `ultrasonic(index)` for ultrasonic sensors
  - `getCompass()` / `compass()` for compass readings
- **Actuator and object support**:
  - `grab(index)` / `release(index)` for grips
  - Interactive canvas objects that can be dragged during runtime
- **Dynamic modular sensor architecture** where each sensor is a standalone package
- **In-browser Python execution** via [Skulpt](https://skulpt.org/)
- **Automatic loop delay injection** to reduce browser freezing from tight `while` loops
- **Configurable robot and sensor settings** such as position, angle, color, and interaction options

---

## Getting Started

1. Open `index.html` in your browser.
2. Switch to the Robot Settings tab.
3. Add or configure Wheels, Ultrasonic sensors, Light sensors, Grips, Compass, and other supported modules.
4. Return to the Code tab and write Python code using the simulator API.
5. Click **Run** in the toolbar to start the simulation.

### Development

1. Install [Node.js](https://nodejs.org/) 18+.
2. From the project root, run:

```bash
npm test
```

---

## Python API Reference

| Command | Description |
| :-- | :-- |
| `motor(left, right)` | Control motors with speed from `-100` to `100`. Example: `motor(50, 50)` |
| `delay(ms)` | Pause execution for `ms` milliseconds |
| `analogRead(index)` | Read value from a light sensor using type-relative indexing |
| `getUltrasonic(index)` | Read distance from an ultrasonic sensor |
| `ultrasonic(index)` | Alias for `getUltrasonic(index)` |
| `getCompass()` | Read the robot angle if a compass is installed |
| `compass()` | Alias for `getCompass()` |
| `SW(index)` | Check whether `SW1`, `SW2`, or `SW3` is pressed |
| `waitSW(index)` | Pause execution until the selected switch is pressed |
| `grab(index)` | Activate a grip |
| `release(index)` | Release a grip |
| `spawn_object(color)` | Spawn an object with the given color |
| `getSensorCount()` | Return the total number of attached sensors |
| `print(message)` | Print text to the debug console |

---

## Tips

- **Type-relative indexing**: `analogRead(0)` is always the first light sensor, and `getUltrasonic(0)` is always the first ultrasonic sensor.
- **Infinite loops**: You can safely use `while True:` because the system injects `delay(1)` into loop execution paths.
- **Runtime interaction**: Canvas objects can still be dragged while code is running.
- **Wheel management**: The robot starts with a protected front wheel and can be extended with additional wheels.
- **Dynamic storage**: Standard sensors and actuators are stored in separate arrays based on each sensor's configuration.

---

## Automation Testing

The project includes a Node-based automation test suite for the core execution flow and the sensor plugin system.

### Run Tests

```bash
npm test
```

### Run End-to-End Tests

```bash
npm run test:e2e
```

### Run End-to-End Tests With Browser Window

```bash
npm run test:e2e:headed
```

### Run End-to-End Tests In Playwright UI

```bash
npm run test:e2e:ui
```

### Run Everything

```bash
npm run test:all
```

### Current Coverage

- Core execution behavior in `src/core/executor.js`
- Shared sensor contract checks for every sensor under `src/sensors/`
- Optional sensor-specific behavior tests when a sensor provides its own `*.test.js`
- Browser end-to-end coverage for app boot, run/stop/reset, sensor APIs, and settings flows

### Sensor Test Strategy

The sensor test system is designed to support future sensors without forcing every sensor to have a dedicated test file.

- `tests/sensors.test.js` automatically discovers all sensor folders in `src/sensors/`
- Each sensor is checked for the expected module files:
  - `config.json`
  - `index.js`
  - `logic.js`
  - `executor.js`
  - `render.html`
- Shared contract tests validate that sensor plugins can be imported and used safely
- If `config.json` declares Python APIs, the shared tests verify that those APIs are registered
- If a sensor folder contains one or more `*.test.js` files, those tests are loaded automatically
- If a sensor does not contain its own `.test.js`, it still receives baseline coverage from the shared contract tests
- Browser-level E2E tests live under `tests/e2e/` and validate the integrated app in Playwright

### Adding a New Sensor

When adding a new sensor in `src/sensors/<name>/`:

1. Add the sensor files: `config.json`, `index.js`, `logic.js`, `executor.js`, and `render.html`
2. Register the sensor name in the root `config.json`
3. Run `npm test`
4. Optionally add `src/sensors/<name>/<name>.test.js` for sensor-specific behavior
5. Run `npm run test:e2e` if the new sensor affects browser flows, rendering, or Python execution behavior

This keeps every sensor testable by default while allowing richer tests for more complex sensors.
