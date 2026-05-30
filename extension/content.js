// content.js - Injected into Robo-Python web pages
// We use a MutationObserver to ensure we can inject into the DOM as early as possible
// or just append to document.documentElement since run_at is document_start.

function injectVerificationElement() {
    if (document.getElementById("robo-extension-installed")) return;
    
    const checkElement = document.createElement("div");
    checkElement.id = "robo-extension-installed";
    checkElement.style.display = "none";
    checkElement.innerText = "Extension is running";
    checkElement.dataset.version = chrome.runtime.getManifest().version;

    // We use documentElement to avoid waiting for document.body
    if (document.documentElement) {
        document.documentElement.appendChild(checkElement);
        console.log("[Robo-Python Monitor] Extension verification element injected.");
    }
}

injectVerificationElement();

// Just in case it failed initially, retry when DOM is ready
document.addEventListener("DOMContentLoaded", injectVerificationElement);

// Listen for messages from the background script and forward them to the webpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TAB_EVENT") {
        window.postMessage({
            source: "ROBO_EXTENSION",
            type: "TAB_EVENT",
            payload: message.payload
        }, "*");
    }
});
