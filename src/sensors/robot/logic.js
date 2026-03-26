const state = window.state;

window.SensorRegistry["robot"] = {
  create: function (id, count) {
    return {
      id,
      type: "robot",
    };
  },
  drawPreview: function (svg, sensor) {
    if (typeof updateRobotPreview === "function") {
      updateRobotPreview();
    }
  },
  updateValue: function (key, value) {
    // Singleton updates global state directly
    if (
      key === "robotWidth" ||
      key === "robotHeight" ||
      key === "robotBorderSize" ||
      key === "robotMass"
    ) {
      state[key] = parseFloat(value) || 0;
    } else if (key === "robotUseMass") {
      state[key] = value === true || value === "true";
    } else {
      state[key] = value;
    }

    // Update the image preview div if it exists
    if (key === "robotImage") {
      const previewDiv = document.getElementById(`preview-robot-robotImage`);
      const wrapperDiv = document.getElementById(`wrapper-robot-robotImage`);
      if (previewDiv) {
        previewDiv.style.backgroundImage = value ? `url('${value}')` : "none";
      }
      if (wrapperDiv) {
        wrapperDiv.style.display = value ? "inline-block" : "none";
      }
    }

    // Trigger UI updates
    if (typeof updateRobotDOM === "function") updateRobotDOM();
    if (typeof updateSensorDots === "function") updateSensorDots();
    if (typeof updateSensorPreview === "function") updateSensorPreview();

    if (key === "robotWidth" || key === "robotHeight") {
      // Re-render all sensor lists to update min/max constraints in UI
      if (window.SensorConfigs) {
        Object.keys(window.SensorConfigs).forEach((type) => {
          if (typeof renderDynamicSensorsList === "function")
            renderDynamicSensorsList(type);
        });
      }
    }
  },
};

function updateRobotPreview() {
  const svg = document.getElementById("preview-svg");
  if (!svg) return;

  // Define pattern for robot image in SVG
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.prepend(defs);
  }

  let pattern = document.getElementById("robot-image-pattern");
  if (state.robotImage) {
    if (!pattern) {
      pattern = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "pattern",
      );
      pattern.setAttribute("id", "robot-image-pattern");
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("patternContentUnits", "objectBoundingBox");
      pattern.setAttribute("width", "1");
      pattern.setAttribute("height", "1");

      const img = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "image",
      );
      pattern.appendChild(img);
      defs.appendChild(pattern);
    }

    const img = pattern.querySelector("image");
    if (img) {
      img.setAttribute("x", "0");
      img.setAttribute("y", "0");
      img.setAttribute("width", "1");
      img.setAttribute("height", "1");
      img.setAttribute("preserveAspectRatio", "none");
      img.setAttribute("transform", "rotate(90, 0.5, 0.5)"); // Rotate image 90 degrees
      img.setAttribute("href", state.robotImage);
      img.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        state.robotImage,
      );
    }
  } else if (pattern) {
    pattern.remove();
  }

  const halfW = state.robotWidth / 2;
  const halfH = state.robotHeight / 2;

  // Find the main robot rect in the preview
  const rect = document.getElementById("robot-preview-body-rect");
  if (rect) {
    rect.setAttribute("x", -halfW);
    rect.setAttribute("y", -halfH);
    rect.setAttribute("width", state.robotWidth);
    rect.setAttribute("height", state.robotHeight);
    rect.setAttribute(
      "fill",
      state.robotImage
        ? "url(#robot-image-pattern)"
        : state.robotColor || "#ff4757",
    );
    rect.setAttribute("stroke", state.robotBorderColor);
    rect.setAttribute("stroke-width", state.robotImage ? 0 : state.robotBorderSize);
  }

  // Update motors/wheels in preview based on new size
  const ml = document.getElementById("motor-left");
  const mr = document.getElementById("motor-right");
  const mlb = document.getElementById("motor-left-back");
  const mrb = document.getElementById("motor-right-back");
  const text = svg.querySelector("text");

  if (ml) {
    ml.setAttribute("x", -4);
    ml.setAttribute("y", -halfH - 8);
  }
  if (mr) {
    mr.setAttribute("x", -4);
    mr.setAttribute("y", halfH - 6);
  }
  if (mlb) {
    mlb.setAttribute("x", -4);
    mlb.setAttribute("y", -halfH - 8);
  }
  if (mrb) {
    mrb.setAttribute("x", -4);
    mrb.setAttribute("y", halfH - 6);
  }
  if (text) {
    text.setAttribute("x", 0);
    text.setAttribute("y", 0);
    text.setAttribute("dominant-baseline", "middle");
    text.style.display = state.robotImage ? "none" : "block";
  }
}

window.updateRobotPreview = updateRobotPreview;
