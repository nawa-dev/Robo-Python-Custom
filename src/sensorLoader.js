/**
 * Sensor Loader
 * Dynamically loads sensor configurations, templates, and logics based on config.json
 */

window.SensorRegistry = {};
window.SensorTemplates = {};
window.SensorConfigs = {};

async function initSensors() {
  try {
    const response = await fetch("./config.json");
    const mainConfig = await response.json();
    
    if (mainConfig.installed_sensors && Array.isArray(mainConfig.installed_sensors)) {
      for (const sensorName of mainConfig.installed_sensors) {
        await loadSensorComponent(sensorName);
      }
    }
    
    // Once everything is loaded, we can trigger rendering
    if (typeof renderSensorTabs === "function") {
      renderSensorTabs();
    }
    
    // Refresh UI components for existing arrays populated by storage.js
    if (typeof renderSensorsList === "function") {
      renderSensorsList();
    }
    if (typeof updateSensorPreview === "function") {
      updateSensorPreview();
    }
    if (typeof updateSensorDots === "function") {
      updateSensorDots();
    }
  } catch (error) {
    console.error("Error initializing sensors:", error);
  }
}

async function loadSensorComponent(sensorName) {
  const basePath = `./src/sensors/${sensorName}`;
  
  try {
    // 1. Load config
    const configRes = await fetch(`${basePath}/config.json`);
    if (!configRes.ok) throw new Error(`Missing ${sensorName}/config.json`);
    const config = await configRes.json();
    window.SensorConfigs[sensorName] = config;

    // 2. Load render template
    const templateRes = await fetch(`${basePath}/render.html`);
    if (!templateRes.ok) throw new Error(`Missing ${sensorName}/render.html`);
    const templateHtml = await templateRes.text();
    window.SensorTemplates[sensorName] = templateHtml;

    // 3. Load logic script
    const script = document.createElement("script");
    script.src = `${basePath}/logic.js`;
    script.defer = true;
    document.head.appendChild(script);

    // 4. Load physics script (optional)
    try {
        const physRes = await fetch(`${basePath}/physics.js`);
        if (physRes.ok) {
            const physText = await physRes.text();
            const physScript = document.createElement("script");
            physScript.innerHTML = physText;
            document.head.appendChild(physScript);
        }
    } catch (e) {
        // Optional file, ignore error
    }

  } catch (err) {
    console.warn(`Failed to load component for sensor '${sensorName}':`, err);
  }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
  // Load config then components
  initSensors();
});
