/**
 * Object configuration physics logic (optional)
 * Singleton settings for mass and friction
 */
window.SensorRegistry["object"] = window.SensorRegistry["object"] || {};
window.SensorRegistry["object"].physicsStep = function(sensor, typeIdx, globals) {
    // Objects are currently handled globally in core/physics.js
    // This file exists to satisfy the dynamic loader and silence 404 errors.
};
