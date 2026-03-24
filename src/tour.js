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

  // Use the global i18n system
  if (!window.i18n || !window.i18n.isLoaded) {
    console.error("i18n system not loaded");
    return;
  }

  // Get localized button text
  const doneBtnText = window.i18n.t("tour.doneBtnText");
  const closeBtnText = window.i18n.t("tour.closeBtnText");
  const nextBtnText = window.i18n.t("tour.nextBtnText");
  const prevBtnText = window.i18n.t("tour.prevBtnText");

  // Define step metadata (elements and handlers)
  const stepsMetadata = [
    {
      popover: {
        side: "center",
        align: "center",
        popoverClass: "welcome-modal driverjs-theme",
      },
    },
    {
      element: ".dropbtn",
      popover: { side: "bottom", align: "start" },
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
      popover: { side: "right", align: "start" },
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
      popover: { side: "bottom", align: "center" },
    },
    {
      element: "#reset-btn",
      popover: { side: "bottom", align: "center" },
    },
    {
      element: ".canvas-settings",
      popover: { side: "bottom", align: "center" },
    },
    {
      element: ".editor-tabs",
      popover: { side: "right", align: "start" },
    },
    {
      element: "#tab-btn-settings",
      popover: { side: "bottom", align: "center" },
      onHighlighted: () => {
        if (typeof switchTab === "function") switchTab("settings");
      },
    },
    {
      element: ".settings-preview-box",
      popover: { side: "right", align: "start" },
    },
    {
      element: "#dynamic-device-selector",
      popover: { side: "left", align: "start" },
    },
    {
      element: "#dynamic-device-panels",
      popover: { side: "top", align: "center" },
    },
    {
      element: "#tab-btn-code",
      popover: { side: "bottom", align: "center" },
      onHighlighted: () => {
        if (typeof switchTab === "function") switchTab("code");
      },
    },
    {
      element: "#monaco-container",
      popover: { side: "right", align: "center" },
    },
    {
      element: ".console-pane",
      popover: { side: "top", align: "center" },
    },
    {
      element: "#canvas-area",
      popover: { side: "left", align: "center" },
    },
    {
      element: ".button-sensor-container",
      popover: { side: "bottom", align: "center" },
    },
    {
      element: ".github-button",
      popover: { side: "left", align: "center" },
    },
  ];

  // Map localized titles and descriptions from lang.json
  const localizedSteps = window.i18n.t("tour.steps");
  const steps = stepsMetadata.map((meta, index) => {
    const localized = localizedSteps[index] || { title: "", description: "" };
    return {
      ...meta,
      popover: {
        ...meta.popover,
        title: localized.title,
        description: localized.description,
      },
    };
  });

  const driverObj = driver({
    popoverClass: "driverjs-theme",
    showProgress: true,
    animate: true,
    allowClose: true,
    doneBtnText: doneBtnText,
    closeBtnText: closeBtnText,
    nextBtnText: nextBtnText,
    prevBtnText: prevBtnText,
    steps: steps,
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
