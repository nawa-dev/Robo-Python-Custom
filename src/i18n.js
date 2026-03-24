/**
 * Lightweight i18n system for ROBO-PYTHON
 */

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem("robo_python_lang") || "th";
    this.translations = {};
    this.isLoaded = false;
  }

  async init() {
    try {
      const response = await fetch("src/lang.json");
      this.translations = await response.json();
      this.isLoaded = true;
      this.updateUI();
    } catch (error) {
      console.error("Failed to load translations:", error);
    }
  }

  updateUI() {
    if (!this.isLoaded) return;

    // Update static elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const text = this.getNestedValue(this.translations[this.currentLang], key);
      
      if (text) {
        // Special handling for elements with icons (preserve the icon)
        const icon = el.querySelector("i");
        if (icon) {
          // Keep the icon and replace only the text node
          // This assumes the icon is the first child or we can find it
          el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
              node.textContent = " " + text;
            }
          });
          // If no text node found but we want to add text
          if (!Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE)) {
              el.appendChild(document.createTextNode(" " + text));
          }
        } else {
          el.textContent = text;
        }
      }
    });

    // Update titles for tooltips
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const text = this.getNestedValue(this.translations[this.currentLang], key);
      if (text) {
        el.title = text;
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;

    // Dispatch event for other modules (e.g., tour.js)
    window.dispatchEvent(
      new CustomEvent("langChanged", { detail: this.currentLang })
    );

    // Update the switcher button itself if needed
    this.updateSwitcherButtons();
  }

  updateSwitcherButtons() {
    const btnEn = document.getElementById("lang-en");
    const btnTh = document.getElementById("lang-th");
    if (btnEn && btnTh) {
      if (this.currentLang === "en") {
        btnEn.classList.add("active");
        btnTh.classList.remove("active");
      } else {
        btnTh.classList.add("active");
        btnEn.classList.remove("active");
      }
    }
  }

  setLanguage(lang) {
    if (lang !== "en" && lang !== "th") return;
    this.currentLang = lang;
    localStorage.setItem("robo_python_lang", lang);
    this.updateUI();
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((prev, curr) => (prev ? prev[curr] : null), obj);
  }

  t(key) {
    if (!this.isLoaded) return key;
    return this.getNestedValue(this.translations[this.currentLang], key) || key;
  }
}

// Global instance
window.i18n = new I18nManager();

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
    window.i18n.init();
});
