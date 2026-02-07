/**
 * Config Manager
 * Loads settings from config.json and applies them to the UI
 */

const CONFIG_PATH = "./config.json";

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_PATH);
    if (!response.ok) throw new Error("Failed to load config");
    const config = await response.json();
    applyConfig(config);
  } catch (error) {
    console.error("Config load error:", error);
  }
}

function applyConfig(config) {
  if (!config) return;

  // 1. App Title
  if (config.app?.title) {
    document.title = config.app.title;
  }

  // 2. Version Overlay
  const versionEl = document.querySelector(".version-overlay");
  if (versionEl) {
    if (config.ui?.showVersionOverlay === false) {
      versionEl.style.display = "none";
    } else if (config.app?.version) {
      versionEl.textContent = config.app.version;
      versionEl.style.display = "block";
    }
  }

  // 3. Logo Position
  // We handle this by manipulating the toolbar flex settings
  const toolbar = document.querySelector(".toolbar");
  const logo = document.querySelector(".logo");
  const actions = document.querySelector(".actions");

  if (toolbar && logo && actions && config.ui?.logoPosition) {
    const pos = config.ui.logoPosition.toLowerCase();

    // Reset styles first
    toolbar.style.flexDirection = "row";
    logo.style.position = "static";
    logo.style.transform = "none";
    logo.style.margin = "0 15px 0 0";
    
    if (pos === "right") {
        // Swap order visually
        // toolbar.appendChild(logo); // Moves logo to end of flex container
        // But better to use flex order or direction if we want to keep DOM order
        // Let's use flex-direction row-reverse for the container, but that flips inside items too?
        // No, row-reverse flips the main axis.
        // Easiest: appendChild or order.
        
        // Using order
        logo.style.order = "2";
        actions.style.order = "1";
        logo.style.marginLeft = "15px";
        logo.style.marginRight = "0";
        
    } else if (pos === "center") {
        // Absolute centering
        logo.style.position = "absolute";
        logo.style.left = "50%";
        logo.style.transform = "translateX(-50%)";
    } else {
        // Left (Default) - Reset order to let DOM order take over
        logo.style.order = "";
        actions.style.order = "";
        
        // Ensure no leftover margin from other states
        logo.style.marginLeft = "";
        logo.style.marginRight = "15px";
    }
  }
  
  // 4. Update Logo Text (Optional, if structure allows)
  // If app name is specifically set and different from default HTML, we might textContent it
  // But our logo has spans relative to specific styling (ROBO-PYTHON), so we might skip this unless requested.
}

// Auto-load on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  loadConfig();
});
