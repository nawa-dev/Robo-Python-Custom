import { state } from "../core/index.js";

const MAX_HISTORY = 10000;
let isPlaybackActive = false;
let playbackEditor = null;
let playInterval = null;
let currentIndex = 0;

export function initCodePlayback(editor) {
    if (!editor) return;

    editor.onDidChangeModelContent((e) => {
        // If we are currently in playback mode, don't record changes (though editor is read-only)
        if (isPlaybackActive) return;

        const currentCode = editor.getValue();
        const timestamp = Date.now();
        
        // Paste Detection
        let pastedLargeAmount = false;
        if (e.changes) {
            for (let change of e.changes) {
                if (change.text && change.text.length > 50) {
                    pastedLargeAmount = true;
                    break;
                }
            }
        }

        if (pastedLargeAmount) {
            let tabSwitchedRecently = false;
            let lastTabEvent = null;
            if (state.tabHistory && state.tabHistory.length > 0) {
                lastTabEvent = state.tabHistory[state.tabHistory.length - 1];
                if (timestamp - lastTabEvent.timestamp < 60000) { // 60 seconds
                    tabSwitchedRecently = true;
                }
            }
            
            if (!state.suspiciousFlags) state.suspiciousFlags = [];
            
            state.suspiciousFlags.push({
                timestamp: timestamp,
                reason: tabSwitchedRecently 
                    ? `Pasted code shortly after returning from [${lastTabEvent.title || 'Another Tab'}]`
                    : "Pasted a large amount of code at once",
                codeIndex: state.codeHistory.length
            });
        }
        
        // Prevent saving the exact same code twice in a row
        if (state.codeHistory.length > 0) {
            const lastState = state.codeHistory[state.codeHistory.length - 1];
            if (lastState.code === currentCode) return;
        }

        state.codeHistory.push({
            timestamp: timestamp,
            code: currentCode
        });

        if (state.codeHistory.length > MAX_HISTORY) {
            state.codeHistory.shift(); // Remove oldest
        }
    });
}

export function showPlaybackModal() {
    if (state.codeHistory.length === 0) {
        if (window.showModal) {
            window.showModal(
                window.i18n ? window.i18n.t("toolbar.playback") || "Playback" : "Playback", 
                "No code history available for this project."
            );
        } else {
            alert("No code history available.");
        }
        return;
    }

    isPlaybackActive = true;
    currentIndex = 0;

    // Create Modal UI
    const modal = document.createElement("div");
    modal.className = "playback-modal";
    modal.id = "playback-modal-container";

    const content = document.createElement("div");
    content.className = "playback-content";

    // Header
    const header = document.createElement("div");
    header.className = "playback-header";
    header.innerHTML = `
        <h2><i class="fas fa-history"></i> ${window.i18n ? window.i18n.t("toolbar.playback") || "Code Playback" : "Code Playback"}</h2>
        <button class="playback-close-btn"><i class="fas fa-times"></i></button>
    `;

    // Body container (Editor + Sidebar)
    const body = document.createElement("div");
    body.className = "playback-body";
    body.style.display = "flex";
    body.style.flexDirection = "row";
    
    // Editor Container
    const editorContainer = document.createElement("div");
    editorContainer.id = "playback-editor-container";
    editorContainer.style.flex = "1";
    editorContainer.style.borderRight = "1px solid var(--border-color)";
    
    // Sidebar for Flags & Tabs
    const sidebar = document.createElement("div");
    sidebar.className = "playback-sidebar";
    sidebar.style.width = "300px";
    sidebar.style.display = "flex";
    sidebar.style.flexDirection = "column";
    sidebar.style.backgroundColor = "var(--panel-bg)";
    sidebar.style.overflowY = "auto";
    sidebar.style.padding = "10px";
    
    let sidebarHTML = `<h3 style="margin-top: 0; color: #e74c3c;"><i class="fas fa-flag"></i> Suspicious Flags</h3>`;
    
    if (state.suspiciousFlags && state.suspiciousFlags.length > 0) {
        sidebarHTML += `<ul style="list-style: none; padding: 0; font-size: 13px; margin-bottom: 20px;">`;
        state.suspiciousFlags.forEach(flag => {
            const time = new Date(flag.timestamp).toLocaleTimeString();
            sidebarHTML += `<li style="padding: 8px; margin-bottom: 5px; background: rgba(231, 76, 60, 0.1); border-left: 3px solid #e74c3c; cursor: pointer;" onclick="document.getElementById('playback-slider-input').value = ${flag.codeIndex}; document.getElementById('playback-slider-input').dispatchEvent(new Event('input'));">
                <strong>${time}</strong><br>${flag.reason}
            </li>`;
        });
        sidebarHTML += `</ul>`;
    } else {
        sidebarHTML += `<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">No suspicious behavior detected.</p>`;
    }
    
    sidebarHTML += `<h3 style="margin-top: 0; color: #3498db;"><i class="fas fa-external-link-alt"></i> Tab History</h3>`;
    if (state.tabHistory && state.tabHistory.length > 0) {
        sidebarHTML += `<ul style="list-style: none; padding: 0; font-size: 12px; color: #ccc;">`;
        [...state.tabHistory].reverse().forEach(tab => {
            const time = new Date(tab.timestamp).toLocaleTimeString();
            const icon = tab.action === "lost_focus" ? "fa-eye-slash" : "fa-window-maximize";
            sidebarHTML += `<li style="padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="color: #888;">${time}</span> <i class="fas ${icon}"></i> 
                ${tab.title}
            </li>`;
        });
        sidebarHTML += `</ul>`;
    } else {
        sidebarHTML += `<p style="font-size: 13px; color: var(--text-muted);">No tab switches recorded.</p>`;
    }
    
    sidebar.innerHTML = sidebarHTML;
    
    body.appendChild(editorContainer);
    body.appendChild(sidebar);

    // Footer (Controls)
    const footer = document.createElement("div");
    footer.className = "playback-footer";

    const playBtn = document.createElement("button");
    playBtn.className = "playback-play-btn";
    playBtn.innerHTML = '<i class="fas fa-play"></i> Play';

    const timeline = document.createElement("div");
    timeline.className = "playback-timeline";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.id = "playback-slider-input";
    slider.className = "playback-slider";
    slider.min = 0;
    slider.max = state.codeHistory.length - 1;
    slider.value = 0;

    const info = document.createElement("div");
    info.className = "playback-info";
    info.innerText = `1 / ${state.codeHistory.length}`;

    timeline.appendChild(slider);
    timeline.appendChild(info);

    footer.appendChild(playBtn);
    footer.appendChild(timeline);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);

    document.body.appendChild(modal);

    // Initialize Monaco Editor
    playbackEditor = monaco.editor.create(editorContainer, {
        value: state.codeHistory[0].code,
        language: "python",
        theme: "vs-dark",
        automaticLayout: true,
        readOnly: true,
        minimap: { enabled: false }
    });

    // Close Event
    header.querySelector(".playback-close-btn").addEventListener("click", () => {
        closePlaybackModal();
    });

    // Slider Event
    slider.addEventListener("input", (e) => {
        currentIndex = parseInt(e.target.value);
        updatePlaybackView();
        pausePlayback(); // Pause if user scrubs
    });

    // Play Event
    playBtn.addEventListener("click", () => {
        if (playInterval) {
            pausePlayback();
        } else {
            startPlayback();
        }
    });

    function updatePlaybackView() {
        if (!playbackEditor || currentIndex >= state.codeHistory.length) return;
        
        playbackEditor.setValue(state.codeHistory[currentIndex].code);
        slider.value = currentIndex;
        info.innerText = `${currentIndex + 1} / ${state.codeHistory.length}`;

        // Format Date
        const date = new Date(state.codeHistory[currentIndex].timestamp);
        info.innerText += ` (${date.toLocaleTimeString()})`;
    }

    function startPlayback() {
        if (currentIndex >= state.codeHistory.length - 1) {
            currentIndex = 0; // Restart if at the end
        }
        
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        playBtn.classList.add("playing");
        
        playInterval = setInterval(() => {
            currentIndex++;
            if (currentIndex >= state.codeHistory.length) {
                currentIndex = state.codeHistory.length - 1;
                pausePlayback();
            } else {
                updatePlaybackView();
            }
        }, 300); // 300ms per step
    }

    function pausePlayback() {
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        playBtn.classList.remove("playing");
    }

    function closePlaybackModal() {
        pausePlayback();
        if (playbackEditor) {
            playbackEditor.dispose();
            playbackEditor = null;
        }
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        isPlaybackActive = false;
    }
}
