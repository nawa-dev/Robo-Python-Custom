// extension-enforcer.js

export function verifyExtensionInstallation() {
    // Wait for config and DOM to be fully ready
    fetch("./config.json")
        .then(r => r.json())
        .then(config => {
            if (config.ui && config.ui.enableExtensionCheck === true) {
                // Give the extension 1 second to inject the element just in case
                setTimeout(() => {
                    const isInstalled = document.getElementById("robo-extension-installed") !== null;
                    if (!isInstalled) {
                        showExtensionBlocker();
                    } else {
                        console.log("[Extension Enforcer] Verification passed.");
                    }
                }, 1000);
            }
        })
        .catch(err => console.error("Error loading config for extension enforcer:", err));

    // Listen for tab events from the extension
    window.addEventListener("message", (event) => {
        if (event.data && event.data.source === "ROBO_EXTENSION" && event.data.type === "TAB_EVENT") {
            const payload = event.data.payload;
            if (window.state && window.state.tabHistory) {
                window.state.tabHistory.push(payload);
                if (window.state.tabHistory.length > 1000) {
                    window.state.tabHistory.shift();
                }

                // Check for suspicious URLs
                if (payload.url) {
                    const urlLower = payload.url.toLowerCase();
                    const suspiciousKeywords = ["chatgpt", "gemini", "claude", "openai", "deepseek"];
                    const isSuspicious = suspiciousKeywords.some(keyword => urlLower.includes(keyword));
                    
                    if (isSuspicious) {
                        if (!window.state.suspiciousFlags) window.state.suspiciousFlags = [];
                        window.state.suspiciousFlags.push({
                            timestamp: payload.timestamp || Date.now(),
                            reason: `แอบเปิดเว็บ AI: ${payload.title || "Unknown Tab"}`,
                            codeIndex: window.state.codeHistory ? Math.max(0, window.state.codeHistory.length - 1) : 0
                        });
                    }
                }
            }
        }
    });
}

function showExtensionBlocker() {
    const blocker = document.createElement("div");
    blocker.id = "extension-blocker";
    blocker.style.position = "fixed";
    blocker.style.top = "0";
    blocker.style.left = "0";
    blocker.style.width = "100vw";
    blocker.style.height = "100vh";
    blocker.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    blocker.style.zIndex = "999999"; // Highest z-index
    blocker.style.display = "flex";
    blocker.style.flexDirection = "column";
    blocker.style.justifyContent = "center";
    blocker.style.alignItems = "center";
    blocker.style.color = "white";
    blocker.style.fontFamily = "sans-serif";

    blocker.innerHTML = `
        <div style="background-color: var(--panel-bg, #2c3e50); padding: 40px; border-radius: 10px; text-align: center; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #e74c3c;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 20px;"></i>
            <h2 style="margin-top: 0;">Extension Required</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
                You must install the <strong>Robo-Python Monitor</strong> extension to use this application.<br><br>
                Please download the extension, install it in your browser (Developer Mode -> Load Unpacked), and then refresh this page.
            </p>
            <a href="./extension.zip" download="robo-python-extension.zip" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; transition: background-color 0.2s;">
                <i class="fas fa-download"></i> Download Extension
            </a>
            <p style="font-size: 12px; color: #aaa; margin-top: 20px;">
                If you have already installed it, please refresh the page.
            </p>
        </div>
    `;

    document.body.appendChild(blocker);
    // Try to stop any running scripts or interactions
    if (window.stopProgram) window.stopProgram();
}
