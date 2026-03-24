/**
 * Canvas & Image Data System
 */

// --- Update canvas transform (Zoom & Pan) ---
function updateCanvasTransform() {
  if (!canvasArea) return;
  canvasArea.style.transformOrigin = "0 0";
  canvasArea.style.transform = `translate(${state.cameraX}px, ${state.cameraY}px) scale(${state.zoom})`;
}

// --- Update canvas image data when background changes ---
function updateCanvasImageData() {
  const canvas = document.createElement("canvas");
  canvas.width = canvasArea.offsetWidth;
  canvas.height = canvasArea.offsetHeight;
  const ctx = canvas.getContext("2d");

  const bgColor = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-color");
  ctx.fillStyle = bgColor || "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bgImage = window
    .getComputedStyle(canvasArea)
    .getPropertyValue("background-image");
  if (bgImage && bgImage !== "none") {
    try {
      const imageUrl = bgImage.match(/url\(["']?(.+?)["']?\)/)[1];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        state.canvasPixelData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        logToConsole("Canvas image data updated.", "info");
        if (typeof updateSensorDots === 'function') updateSensorDots();
      };
      img.onerror = () => {
        logToConsole("Failed to load background image, using default.", "info");
        state.canvasPixelData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        if (typeof updateSensorDots === 'function') updateSensorDots();
      };
      img.src = imageUrl;
    } catch (e) {
      logToConsole("Error parsing background image URL.", "info");
      state.canvasPixelData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      if (typeof updateSensorDots === 'function') updateSensorDots();
    }
  } else {
    state.canvasPixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    logToConsole("Using default canvas background.", "info");
    if (typeof updateSensorDots === 'function') updateSensorDots();
  }
}

// --- Update canvas size ---
function updateCanvasSize() {
  if (!canvasArea) return;

  // Temporarily disable transition for immediate calculation of fit/center
  const originalTransition = canvasArea.style.transition;
  canvasArea.style.transition = "none";

  canvasArea.style.width = document.getElementById("canvas-w").value + "px";
  canvasArea.style.height = document.getElementById("canvas-h").value + "px";

  // Force a reflow
  canvasArea.offsetHeight;

  updateCanvasImageData();
  if (typeof fitCanvasToViewport === "function") fitCanvasToViewport();

  // Restore transition for smooth manual resizing
  setTimeout(() => {
    canvasArea.style.transition = originalTransition;
  }, 0);
}

// --- Handle map change ---
// ensure file input is reset and clicked even if a custom map is already set
function handleMapChange(select) {
  if (select.value === "upload") {
    const fileInput = document.getElementById("map-upload");
    if (fileInput) {
      // clear previous value so same-file uploads trigger onchange
      fileInput.value = "";
      fileInput.click();
    } else {
      console.warn("map-upload input not found.");
    }
  } else {
    // switch to default map
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";

    // ensure canvas image data is refreshed
    updateCanvasImageData();

    // also reset the file input so future uploads (even same file) will fire
    const fileInput = document.getElementById("map-upload");
    if (fileInput) fileInput.value = "";
  }
}

// Handle selection in map dropdown: separate "current" (display) and "upload" (action)
function handleMapSelectChange(select) {
  const val = (select && select.value) || "";
  const currentOpt = document.getElementById("current-map-option");
  const fileInput = document.getElementById("map-upload");

  if (val === "upload") {
    if (fileInput) {
      try {
        fileInput.value = "";
      } catch (e) {}
      fileInput.click();
    }
    // keep UI showing current map (don't stay on "upload")
    if (currentOpt) select.value = "current";
    return;
  }

  // user chose default map
  if (val === "default") {
    canvasArea.style.backgroundImage = "none";
    canvasArea.style.backgroundColor = "#f0f0f0";
    if (currentOpt) {
      currentOpt.textContent = "No map loaded";
      currentOpt.dataset.filename = "";
    }
    updateCanvasImageData();
    if (fileInput) {
      try {
        fileInput.value = "";
      } catch (e) {}
    }
    return;
  }

  // val === "current" -> do nothing (display only)
}

// Load map file and update "current" display option
function loadMapFile(input) {
  if (input && input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      canvasArea.style.backgroundImage = `url('${e.target.result}')`;
      canvasArea.style.backgroundColor = "transparent";
      logToConsole("New map loaded successfully.");

      // Automatically resize canvas to match image dimensions
      const img = new Image();
      img.onload = () => {
        const wInput = document.getElementById("canvas-w");
        const hInput = document.getElementById("canvas-h");
        if (wInput && hInput) {
          wInput.value = img.naturalWidth;
          hInput.value = img.naturalHeight;
          updateCanvasSize();
          if (typeof resetView === "function") resetView();
          logToConsole(`Canvas resized to ${img.naturalWidth}x${img.naturalHeight} and view reset.`, "info");
        }
      };
      img.src = e.target.result;

      // update current map option to show filename
      const currentOpt = document.getElementById("current-map-option");
      if (currentOpt) {
        currentOpt.textContent = `Current: ${file.name}`;
        currentOpt.dataset.filename = file.name;
      }

      // ensure canvas image data refreshed
      setTimeout(updateCanvasImageData, 100);

      // clear input so same-file re-upload will trigger onchange later
      try {
        input.value = "";
      } catch (err) {}

      // set select back to current for clarity
      const sel = document.getElementById("map-select");
      if (sel) sel.value = "current";
    };
    reader.readAsDataURL(file);
  } else {
    try {
      if (input) input.value = "";
    } catch (err) {}
  }
}
