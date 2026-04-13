/**
 * Sensor Loader
 * Module-first bootstrap for sensor configurations, templates, and plugins.
 */

import { registerSensorPlugin } from "../core/sensor-plugin-registry.js";

function resolveSensorAssetUrl(sensorName, fileName) {
  return new URL(`../sensors/${sensorName}/${fileName}`, import.meta.url);
}

export async function initSensors() {
  try {
    const sensorNames = await resolveInstalledSensors();

    for (const sensorName of sensorNames) {
      await loadSensorComponent(sensorName);
    }

    if (typeof window.renderSensorTabs === "function") {
      window.renderSensorTabs();
    }

    if (typeof window.renderSensorsList === "function") {
      window.renderSensorsList();
    }
    if (typeof window.updateSensorPreview === "function") {
      window.updateSensorPreview();
    }
    if (typeof window.updateSensorDots === "function") {
      window.updateSensorDots();
    }

    if (typeof window.refreshEditorHighlighting === "function") {
      window.refreshEditorHighlighting();
    }
  } catch (error) {
    console.error("Error initializing sensors:", error);
  }
}

export async function resolveInstalledSensors() {
  const response = await fetch("./config.json");
  const mainConfig = await response.json();
  if (
    mainConfig.installed_sensors &&
    Array.isArray(mainConfig.installed_sensors)
  ) {
    return mainConfig.installed_sensors;
  }
  return [];
}

export async function loadSensorModule(basePath, sensorName) {
  try {
    const moduleUrl = new URL("index.js", basePath);
    const module = await import(moduleUrl.href);
    const plugin = module.default || module.sensorPlugin || module.plugin;
    if (!plugin) {
      throw new Error(`Sensor module '${sensorName}' did not export a plugin`);
    }

    registerSensorPlugin(sensorName, plugin);
    return plugin;
  } catch (error) {
    console.error(`Failed to load sensor module '${sensorName}'`, error);
    throw error;
  }
}

export async function loadSensorComponent(sensorName) {
  const basePath = new URL(`../sensors/${sensorName}/`, import.meta.url);

  try {
    const configRes = await fetch(resolveSensorAssetUrl(sensorName, "config.json"));
    if (!configRes.ok) {
      throw new Error(`Missing ${sensorName}/config.json`);
    }
    const config = await configRes.json();
    window.SensorConfigs[sensorName] = config;

    const templateRes = await fetch(resolveSensorAssetUrl(sensorName, "render.html"));
    if (!templateRes.ok) {
      throw new Error(`Missing ${sensorName}/render.html`);
    }
    const templateHtml = await templateRes.text();
    window.SensorTemplates[sensorName] = templateHtml.trim();

    await loadSensorModule(basePath, sensorName);
  } catch (err) {
    console.warn(`Failed to load component for sensor '${sensorName}':`, err);
  }
}

window.initSensors = initSensors;
