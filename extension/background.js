chrome.runtime.onInstalled.addListener(() => {
    console.log("[Robo-Python Monitor] Extension installed and active.");
});

async function notifyRoboPythonTabs(eventData) {
    try {
        const roboTabs = await chrome.tabs.query({url: ["http://127.0.0.1/*", "http://localhost/*", "https://*.github.io/*"]});
        for (let rTab of roboTabs) {
            // Don't send if the active tab IS the robo tab itself (to avoid noise)
            // But if the user switches BACK to robo tab, we might want to know.
            chrome.tabs.sendMessage(rTab.id, {
                type: "TAB_EVENT",
                payload: eventData
            }).catch(() => {});
        }
    } catch(e) {}
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        notifyRoboPythonTabs({
            action: "switched_tab",
            title: tab.title || "Unknown Tab",
            url: tab.url || "Unknown URL",
            timestamp: Date.now()
        });
    } catch(e) {}
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        notifyRoboPythonTabs({
            action: "lost_focus",
            title: "Outside Browser",
            url: "",
            timestamp: Date.now()
        });
    } else {
        try {
            const tabs = await chrome.tabs.query({active: true, windowId: windowId});
            if (tabs.length > 0) {
                notifyRoboPythonTabs({
                    action: "window_focus",
                    title: tabs[0].title || "Unknown Tab",
                    url: tabs[0].url || "Unknown URL",
                    timestamp: Date.now()
                });
            }
        } catch (e) {}
    }
});
