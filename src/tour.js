/**
 * Robo-Python Product Tour
 * Uses Driver.js for interactive guidance
 */

function startTour() {
  // Check if Driver.js is loaded
  if (
    typeof window.driver === "undefined" ||
    typeof window.driver.js === "undefined"
  ) {
    console.error("Driver.js not loaded");
    return;
  }

  const driver = window.driver.js.driver;

  const driverObj = driver({
    popoverClass: "driverjs-theme",
    showProgress: true,
    animate: true,
    allowClose: true,
    doneBtnText: "Finish",
    closeBtnText: "Close",
    nextBtnText: "Next",
    prevBtnText: "Previous",
    steps: [
      {
        popover: {
          title: "Welcome to ROBO-PYTHON!",
          description:
            "This is a high-performance, web-based 2D robotics simulation environment for learning Python programming. Let's take a quick look at the main features!",
          side: "center",
          align: "center",
          popoverClass: "welcome-modal driverjs-theme",
        },
      },
      {
        element: ".dropbtn",
        popover: {
          title: "File Menu",
          description:
            "Everything related to project management is here. You can create, open, and export your robot projects.",
          side: "bottom",
          align: "start",
        },
        onHighlightStarted: (element) => {
          const dropdown = document.querySelector(".dropdown");
          if (dropdown) dropdown.classList.add("show-dropdown");
        },
        onDeselected: () => {
          const dropdown = document.querySelector(".dropdown");
          if (dropdown) dropdown.classList.remove("show-dropdown");
        },
      },
      {
        element: ".submenu-trigger",
        popover: {
          title: "Load Examples",
          description:
            "Check out our built-in examples to see what Robo-Python can do! We have everything from basic motor controls to advanced line following.",
          side: "right",
          align: "start",
        },
        onHighlightStarted: (element) => {
          const dropdown = document.querySelector(".dropdown");
          if (dropdown) dropdown.classList.add("show-dropdown");
        },
        onDeselected: () => {
          const dropdown = document.querySelector(".dropdown");
          if (dropdown) dropdown.classList.remove("show-dropdown");
        },
      },
      {
        element: "#run-stop-btn",
        popover: {
          title: "Run & Stop",
          description:
            'Click here to execute your Python code. The button will change to "Stop" while the code is running.',
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#reset-btn",
        popover: {
          title: "Reset",
          description:
            "Resets the robot to its initial position and clears the simulation state.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: ".canvas-settings",
        popover: {
          title: "Environment Settings",
          description:
            "Change the canvas size or select/upload a map to test your robot in different environments.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: ".editor-tabs",
        popover: {
          title: "Editor Tabs",
          description:
            "Switch between writing **Code** and configuring **Robot Settings** (sensors, motors, etc.).",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tab-btn-settings",
        popover: {
          title: "Robot Settings",
          description:
            "Configure your robot's sensors, motors, and other hardware components here. We will switch to this tab for you!",
          side: "bottom",
          align: "center",
        },
        onHighlighted: () => {
          if (typeof switchTab === "function") switchTab("settings");
        },
      },
      {
        element: ".settings-preview-box",
        popover: {
          title: "Robot Preview",
          description:
            "See a top-down view of your robot. Changes to sensor positions or motor types will be reflected here in real-time.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#dynamic-device-selector",
        popover: {
          title: "Device Categories",
          description:
            "Select a category (like Wheels, Sensors, or Grips) to see the attached hardware.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#dynamic-device-panels",
        popover: {
          title: "Hardware Configuration",
          description:
            "Adjust specific parameters for each device, such as motor ports, sensor ranges, or installation angles.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tab-btn-code",
        popover: {
          title: "Back to Code",
          description:
            "When you're done configuring, switch back to the Code tab to write your logic.",
          side: "bottom",
          align: "center",
        },
        onHighlighted: () => {
          if (typeof switchTab === "function") switchTab("code");
        },
      },
      {
        element: "#monaco-container",
        popover: {
          title: "Python Editor",
          description:
            "Write your robot logic here. We support modern Python features and provide autocomplete for robot-specific commands.",
          side: "right",
          align: "center",
        },
      },
      {
        element: ".console-pane",
        popover: {
          title: "Console",
          description:
            "This is where you see your program output, sensor readings, and error messages.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#canvas-area",
        popover: {
          title: "Simulation Arena",
          description:
            "This is where the magic happens! Watch your robot move and interact with the environment.",
          side: "left",
          align: "center",
        },
      },
      {
        element: ".button-sensor-container",
        popover: {
          title: "Interactions & Objects",
          description:
            "Use SW1-SW3 virtual buttons to interact with your code, or drag objects from the palette into the arena.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: ".github-button",
        popover: {
          title: "Join the Community",
          description:
            "Check out our GitHub repository to see the source code, report bugs, or contribute to the project!",
          side: "left",
          align: "center",
        },
      },
    ],
  });

  driverObj.drive();
}

// Auto-start tour for first-time visitors
window.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for other scripts and UI components (like Monaco) to initialize
  setTimeout(() => {
    const hasSeenTour = localStorage.getItem("robo_python_tour_completed");
    if (!hasSeenTour) {
      if (typeof startTour === "function") {
        startTour();
        // Mark as seen immediately so it doesn't pop up again on refresh
        // if they've at least seen the welcome
        localStorage.setItem("robo_python_tour_completed", "true");
      }
    }
  }, 1500);
});
