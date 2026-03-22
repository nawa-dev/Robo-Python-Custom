/**
 * UI Manager - Handling Resizing, Tabs, and Layout
 */

// --- 1. Resizer logic for Editor and Console ---
const resizerV = document.getElementById("drag-resizer");
const resizerH = document.getElementById("h-drag-resizer");
const editorPane = document.querySelector(".editor-pane");
const consolePane = document.querySelector(".console-pane");

if (resizerV) {
  resizerV.addEventListener("mousedown", () => {
    document.addEventListener("mousemove", resizeVertical);
    document.addEventListener("mouseup", () =>
      document.removeEventListener("mousemove", resizeVertical),
    );
  });
}

function resizeVertical(e) {
  let newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth > 15 && newWidth < 85) {
    editorPane.style.width = newWidth + "%";
  }
}

if (resizerH) {
  resizerH.addEventListener("mousedown", () => {
    document.addEventListener("mousemove", resizeHorizontal);
    document.addEventListener("mouseup", () =>
      document.removeEventListener("mousemove", resizeHorizontal),
    );
  });
}

function resizeHorizontal(e) {
  const rect = editorPane.getBoundingClientRect();
  let newHeight = rect.bottom - e.clientY;
  if (newHeight > 50 && newHeight < rect.height - 100) {
    consolePane.style.height = newHeight + "px";
  }
}

// --- 2. Tab Switching ---
window.switchTab = function (tabId) {
  document.querySelectorAll(".tab-content").forEach((el) => {
    el.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`tab-${tabId}`).classList.add("active");
  document.getElementById(`tab-btn-${tabId}`).classList.add("active");

  if (tabId === "settings") {
    if (typeof updateSensorPreview === "function") updateSensorPreview();
    // Render all connected panels to make sure values are sync
    if (window.SensorConfigs && typeof renderDynamicSensorsList === "function") {
        Object.keys(window.SensorConfigs).forEach(renderDynamicSensorsList);
    }
  } else if (tabId === "code") {
    if (typeof editor !== "undefined" && editor !== null) {
      setTimeout(() => editor.layout(), 0);
    }
  }
};

// --- 3. Console Logging ---
window.logToConsole = function (msg, type = "info") {
  const output = document.getElementById("console-output");
  if (!output) return;
  const div = document.createElement("div");
  div.className = type === "error" ? "log-error" : "log-info";
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
};

window.clearConsole = function () {
  const output = document.getElementById("console-output");
  if (output) output.innerHTML = "";
};

// --- 4. Settings View Resizer (Vertical) ---
document.addEventListener("DOMContentLoaded", () => {
  const resizer = document.getElementById("settings-v-resizer");
  if (!resizer) return;

  const topRow = resizer.parentElement;

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    resizer.classList.add("dragging");

    const startX = e.clientX;
    const previewBox = topRow.querySelector(".settings-preview-box");
    const startWidth = previewBox.getBoundingClientRect().width;

    function onMove(e) {
      const delta = e.clientX - startX;
      const newWidth = Math.max(
        80,
        Math.min(startWidth + delta, topRow.offsetWidth - 80),
      );
      previewBox.style.width = newWidth + "px";
      previewBox.style.flex = "none";
    }

    function onUp() {
      resizer.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
});
