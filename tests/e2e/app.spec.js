import { expect, test } from "@playwright/test";

const blankProject = {
  version: "1.1",
  projectName: "E2E Blank",
  canvas: {
    width: "800",
    height: "600",
    physicsEngine: "custom",
  },
  map: {
    type: "default",
    imageData: "",
    fileName: "",
  },
  sensors: [
    {
      id: 1,
      type: "wheel",
      index: 0,
      name: "Wheel",
      motorPos: 0,
      wheelType: "normal",
    },
  ],
  grips: [],
  canvasObjects: [],
  sourceCode: "print('blank')",
  robotState: {
    x: 100,
    y: 100,
    angle: 0,
    motorPos: 0,
    width: 50,
    height: 50,
    color: "#ff4757",
    image: "",
    borderSize: 1,
    robotBorderColor: "#333333",
    robotUseMass: false,
    robotMass: 1,
    objectMass: 1,
    objectFriction: 0.92,
  },
};

function createMatterStubScript() {
  return `
    window.Matter = window.Matter || {
      Engine: { create: () => ({ world: {} }), update: () => {} },
      Bodies: { rectangle: () => ({}), circle: () => ({}) },
      Composite: { clear: () => {}, add: () => {} },
      Body: {
        setAngle: () => {},
        setVelocity: () => {},
        setAngularVelocity: () => {},
        setPosition: () => {},
      },
    };
  `;
}

async function stubExternalResources(page) {
  await page.route("https://www.googletagmanager.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });

  await page.route("https://cdn.jsdelivr.net/npm/driver.js@*/dist/driver.css", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/css",
      body: "",
    });
  });

  await page.route("https://cdn.jsdelivr.net/npm/driver.js@*/dist/driver.js.iife.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.driver={js:{driver:function(){return {drive(){},destroy(){}}}}};",
    });
  });

  await page.route("https://cdnjs.cloudflare.com/ajax/libs/matter-js/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: createMatterStubScript(),
    });
  });
}

async function loadApp(page) {
  await stubExternalResources(page);
  await page.addInitScript((project) => {
    window.confirm = () => true;
    window.alert = () => {};
    window.prompt = () => "E2E Project";
    localStorage.setItem("robot_sim_autosave", JSON.stringify(project));
  }, blankProject);

  await page.goto("/");
  await page.waitForFunction(() => {
    return Boolean(
      window.appBootstrapReady &&
        window.editor &&
        window.applyProjectData &&
        window.SensorConfigs &&
        Object.keys(window.SensorConfigs).length > 0,
    );
  });
  await page.evaluate(() => window.appBootstrapReady);
}

async function setCode(page, code) {
  await page.evaluate((value) => {
    window.editor.setValue(value);
  }, code);
}

async function seedProject(page, projectData) {
  await page.evaluate((project) => {
    window.applyProjectData(project);
    if (typeof window.updateSensorDots === "function") {
      window.updateSensorDots();
    }
  }, projectData);
}

async function consoleText(page) {
  return page.locator("#console-output").textContent();
}

async function expectConsoleToContain(page, text) {
  await expect
    .poll(async () => (await consoleText(page)) || "")
    .toContain(text);
}

test.beforeEach(async ({ page }) => {
  await loadApp(page);
});

test("boots and supports run, stop, and reset flows", async ({ page }) => {
  await expect(page.locator("#run-stop-btn")).toBeVisible();
  await expect(page.locator("#reset-btn")).toBeVisible();
  await expect(page.locator("#tab-btn-settings")).toBeVisible();

  await setCode(page, "print('E2E_BOOT_OK')");
  await page.click("#run-stop-btn");
  await expectConsoleToContain(page, "E2E_BOOT_OK");
  await expectConsoleToContain(page, "Program finished.");

  await setCode(
    page,
    [
      "while True:",
      "    motor(12, 34)",
      "    delay(20)",
    ].join("\n"),
  );
  await page.click("#run-stop-btn");
  await expect.poll(async () => {
    return page.evaluate(() => ({
      isRunning: window.state.isRunning,
      left: window.state.motorL,
      right: window.state.motorR,
    }));
  }).toEqual({
    isRunning: true,
    left: 12,
    right: 34,
  });

  await page.click("#run-stop-btn");
  await expect.poll(async () => page.evaluate(() => window.state.isRunning)).toBe(false);
  await expect
    .poll(async () => (await consoleText(page)) || "")
    .toMatch(/Program stopped\.|Stopping\.\.\./);

  await page.evaluate(() => {
    window.state.robotX = 321;
    window.state.robotY = 222;
    window.state.angle = 135;
    window.updateRobotDOM();
  });
  await page.click("#reset-btn");
  await expect.poll(async () => {
    return page.evaluate(() => ({
      x: window.state.robotX,
      y: window.state.robotY,
      angle: window.state.angle,
    }));
  }).toEqual({
    x: 100,
    y: 100,
    angle: 0,
  });
});

test("covers core Python APIs and all current sensor Python APIs", async ({ page }) => {
  const project = {
    ...blankProject,
    sensors: [
      { id: 1, type: "wheel", index: 0, name: "Wheel", motorPos: 0, wheelType: "normal" },
      { id: 2, type: "light", index: 0, name: "Light 0", x: 50, y: 0, color: "#ff0000" },
      { id: 3, type: "ultrasonic", index: 0, name: "Ultra 0", x: 50, y: 0, angle: 0, color: "#ffffff" },
      { id: 4, type: "compass", index: 0, name: "Compass 0", x: 50, y: 0 },
      { id: 5, type: "robot", index: 0, name: "Robot" },
    ],
    grips: [
      { id: 6, type: "grip", index: 0, name: "Grip 0", x: 50, y: 0, angle: 0, armLength: 20 },
    ],
    canvasObjects: [
      { id: "obj_seed", x: 100, y: 130, radius: 15, color: "#e74c3c", vx: 0, vy: 0 },
    ],
    robotState: {
      ...blankProject.robotState,
      x: 100,
      y: 100,
      angle: 90,
    },
  };

  await seedProject(page, project);
  await page.evaluate(() => {
    const width = window.state.canvasWidth || 800;
    const height = window.state.canvasHeight || 600;
    const data = new Uint8ClampedArray(width * height * 4);
    const pixelIndex = (100 * width + 100) * 4;
    data[pixelIndex] = 255;
    data[pixelIndex + 1] = 0;
    data[pixelIndex + 2] = 0;
    data[pixelIndex + 3] = 255;
    window.state.canvasPixelData = data;
    window.updateSensorDots();
  });

  await setCode(
    page,
    [
      "print('count=' + str(getSensorCount()))",
      "print('compass=' + str(getCompass()))",
      "print('ultra=' + str(getUltrasonic(0)))",
      "print('light=' + str(analogRead(0)))",
      "print('sw1=' + str(SW(1)))",
      "grab(0)",
      "delay(250)",
      "release(0)",
      "spawn_object('green')",
      "print('sensor-suite-done')",
    ].join("\n"),
  );

  await page.click("#run-stop-btn");
  await expect.poll(async () => page.evaluate(() => Boolean(window.state.grabbedObjects[0]))).toBe(true);

  await expectConsoleToContain(page, "count=5");
  await expectConsoleToContain(page, "compass=90");
  await expectConsoleToContain(page, "ultra=15");
  await expectConsoleToContain(page, "light=1024");
  await expectConsoleToContain(page, "sw1=False");
  await expectConsoleToContain(page, "sensor-suite-done");
  await expectConsoleToContain(page, "Program finished.");

  await expect.poll(async () => {
    return page.evaluate(() => ({
      objectCount: window.state.canvasObjects.length,
      grabbed: window.state.grabbedObjects[0] ?? null,
      firstObjectGrabbed: Boolean(window.state.canvasObjects[0]?.isGrabbed),
    }));
  }).toEqual({
    objectCount: 2,
    grabbed: null,
    firstObjectGrabbed: false,
  });
});

test("covers settings UI and every current sensor type", async ({ page }) => {
  await page.click("#tab-btn-settings");

  for (const type of ["robot", "object", "wheel", "light", "ultrasonic", "grip", "compass"]) {
    await expect(page.locator(`#dev-btn-${type}`)).toBeVisible();
  }

  await page.click("#dev-btn-wheel");
  await page.click("#btn-add-wheel");
  await expect.poll(async () => page.evaluate(() => window.state.sensors.filter((sensor) => sensor.type === "wheel").length)).toBe(2);

  await page.click("#dev-btn-light");
  await page.click("#btn-add-light");
  const lightId = await page.evaluate(() => window.state.sensors.filter((sensor) => sensor.type === "light")[0].id);
  await page.locator(`#sensor-${lightId}-x`).fill("50");
  await page.locator(`#sensor-${lightId}-x`).blur();
  await page.locator(`#sensor-${lightId}-y`).fill("10");
  await page.locator(`#sensor-${lightId}-y`).blur();

  await page.click("#dev-btn-ultrasonic");
  await page.click("#btn-add-ultrasonic");
  const ultrasonicId = await page.evaluate(() => window.state.sensors.filter((sensor) => sensor.type === "ultrasonic")[0].id);
  await page.locator(`#sensor-${ultrasonicId}-angle`).fill("45");
  await page.locator(`#sensor-${ultrasonicId}-angle`).blur();

  await page.click("#dev-btn-grip");
  await page.click("#btn-add-grip");
  const gripId = await page.evaluate(() => window.state.grips[0].id);
  await page.locator(`#grip-${gripId}-armLength`).fill("30");
  await page.locator(`#grip-${gripId}-armLength`).blur();

  await page.click("#dev-btn-compass");
  await page.click("#btn-add-compass");
  await expect.poll(async () => page.evaluate(() => window.state.sensors.filter((sensor) => sensor.type === "compass").length)).toBe(1);

  await page.evaluate(() => {
    window.state.canvasObjects.push({
      id: "ui-object",
      x: 180,
      y: 180,
      radius: 15,
      color: "#3498db",
      vx: 0,
      vy: 0,
      mass: 1,
      friction: 0.5,
    });
    window.updateObjectsDOM();
  });

  await page.click("#dev-btn-object");
  await page.locator("#singleton-object-objectMass").fill("3.5");
  await page.locator("#singleton-object-objectMass").blur();
  await page.locator("#singleton-object-objectFriction").fill("0.25");
  await page.locator("#singleton-object-objectFriction").blur();

  await page.click("#dev-btn-robot");
  await page.locator("#singleton-robot-robotWidth").fill("80");
  await page.locator("#singleton-robot-robotWidth").blur();
  await page.locator("#singleton-robot-robotHeight").fill("70");
  await page.locator("#singleton-robot-robotHeight").blur();

  await expect.poll(async () => {
    return page.evaluate(() => {
      const robot = document.getElementById("robot");
      const backWheel = document.querySelector(".w-l-back");
      const light = window.state.sensors.find((sensor) => sensor.type === "light");
      const ultrasonic = window.state.sensors.find((sensor) => sensor.type === "ultrasonic");
      return {
        robotWidth: window.state.robotWidth,
        robotHeight: window.state.robotHeight,
        objectMass: window.state.objectMass,
        objectFriction: window.state.objectFriction,
        firstObjectMass: window.state.canvasObjects[0].mass,
        firstObjectFriction: window.state.canvasObjects[0].friction,
        wheelCount: window.state.sensors.filter((sensor) => sensor.type === "wheel").length,
        lightX: light?.x,
        lightY: light?.y,
        ultrasonicAngle: ultrasonic?.angle,
        gripArmLength: window.state.grips[0]?.armLength,
        compassCount: window.state.sensors.filter((sensor) => sensor.type === "compass").length,
        robotStyleWidth: robot?.style.width,
        robotStyleHeight: robot?.style.height,
        backWheelDisplay: backWheel ? getComputedStyle(backWheel).display : "",
      };
    });
  }).toEqual({
    robotWidth: 80,
    robotHeight: 70,
    objectMass: "3.5",
    objectFriction: "0.25",
    firstObjectMass: "3.5",
    firstObjectFriction: "0.25",
    wheelCount: 2,
    lightX: 50,
    lightY: 10,
    ultrasonicAngle: 45,
    gripArmLength: 30,
    compassCount: 1,
    robotStyleWidth: "80px",
    robotStyleHeight: "70px",
    backWheelDisplay: "block",
  });
});
