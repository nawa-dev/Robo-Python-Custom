/**
 * Sensor Plugin Registry
 * Centralizes sensor plugin registration and provides a stable contract.
 */

export function createNoopPlugin(type) {
  return {
    type,
    create(id, index) {
      return { id, type, index };
    },
    drawPreview() {},
    drawCanvas() {},
    read() {
      return 0;
    },
    updateValue() {},
    deleteItem() {},
    physicsStep() {},
    registerPythonAPI() {},
  };
}

export function normalizePlugin(type, plugin) {
  const safePlugin = plugin || {};
  return Object.assign(createNoopPlugin(type), safePlugin, { type });
}

const plugins = window.SensorRegistry || {};

export const sensorPluginRegistry = {
  register(type, plugin) {
    if (!type) {
      throw new Error("Sensor plugin type is required");
    }
    const normalized = normalizePlugin(type, plugin);
    plugins[type] = normalized;
    return normalized;
  },

  get(type) {
    if (!type) return null;
    const plugin = plugins[type];
    return plugin ? normalizePlugin(type, plugin) : null;
  },

  getAll() {
    return Object.keys(plugins).reduce((acc, type) => {
      acc[type] = this.get(type);
      return acc;
    }, {});
  },

  has(type) {
    return Boolean(type && plugins[type]);
  },

  listTypes() {
    return Object.keys(plugins);
  },
};

export function registerSensorPlugin(type, plugin) {
  return sensorPluginRegistry.register(type, plugin);
}

export function getSensorPlugin(type) {
  return sensorPluginRegistry.get(type);
}

export function getAllSensorPlugins() {
  return sensorPluginRegistry.getAll();
}

window.SensorRegistry = plugins;
window.SensorPluginRegistry = sensorPluginRegistry;
window.registerSensorPlugin = registerSensorPlugin;
window.getSensorPlugin = getSensorPlugin;
window.getAllSensorPlugins = getAllSensorPlugins;
