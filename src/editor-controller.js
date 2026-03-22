/**
 * Editor Controller - Manages Monaco Editor, Highlighting, and Autocomplete
 */

let editor;
let currentFontSize = 16;

require.config({
  paths: {
    vs: "src/cdn_file/monaco-editor/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("monaco-container"), {
    value: [
      "print('Robot Start')",
      "",
      "while True:",
      "    motor(60, 60)",
      "    delay(200)",
      "",
      "    motor(60, -60)",
      "    delay(50)",
      "",
      "motor(0, 0)",
    ].join("\n"),
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: currentFontSize,
    minimap: { enabled: false },
  });

  // ✅ ซูมเฉพาะ Monaco (Ctrl + Scroll)
  editor.onMouseWheel((e) => {
    if (!e.ctrlKey) return;
    e.preventDefault?.(); 
    e.stopPropagation?.();

    if (e.deltaY < 0) {
      currentFontSize += 1;
    } else {
      currentFontSize -= 1;
    }
    currentFontSize = Math.max(10, Math.min(30, currentFontSize));
    editor.updateOptions({ fontSize: currentFontSize });
  });

  // Hotkeys
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => zoomIn());
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => zoomOut());
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => resetZoom());

  // Actions
  editor.addAction({
    id: "zoom-in",
    label: "Zoom In",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1,
    run: zoomIn
  });

  editor.addAction({
    id: "zoom-out",
    label: "Zoom Out",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 2,
    run: zoomOut
  });

  editor.addAction({
    id: "zoom-reset",
    label: "Reset Zoom",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3,
    run: resetZoom
  });

  function zoomIn() {
    currentFontSize = Math.min(30, currentFontSize + 1);
    editor.updateOptions({ fontSize: currentFontSize });
  }

  function zoomOut() {
    currentFontSize = Math.max(10, currentFontSize - 1);
    editor.updateOptions({ fontSize: currentFontSize });
  }

  function resetZoom() {
    currentFontSize = 16;
    editor.updateOptions({ fontSize: currentFontSize });
  }

  setupRobotHighlighting(editor);
  setupAutocomplete();
  
  // Expose editor globally if needed by other modules
  window.editor = editor;
});

// --- API Highlighting ---
function getDynamicAPIKeywords() {
  const baseKeywords = [
    "motor", "motor4", "delay", "sleep", "analogRead", "getSensorCount", "print", "spawn_object"
  ];
  if (window.SensorConfigs) {
    Object.values(window.SensorConfigs).forEach((config) => {
      if (config.api && Array.isArray(config.api)) {
        config.api.forEach((apiDef) => {
          if (apiDef.keyword && !baseKeywords.includes(apiDef.keyword)) {
            baseKeywords.push(apiDef.keyword);
          }
        });
      }
    });
  }
  return baseKeywords;
}

function setupRobotHighlighting(editor) {
  let decorationIds = [];

  function updateDecorations() {
    const model = editor.getModel();
    if (!model) return;

    const keywords = getDynamicAPIKeywords();
    const sortedKeywords = [...keywords, "SW", "waitSW"].sort((a, b) => b.length - a.length);
    const robotRegex = new RegExp(`\\b(${sortedKeywords.join("|")})\\b`, "g");

    const text = model.getValue();
    const decorations = [];
    let match;

    while ((match = robotRegex.exec(text)) !== null) {
      const index = match.index;
      const word = match[0];
      const start = model.getPositionAt(index);
      const end = model.getPositionAt(index + word.length);

      const lineContent = model.getLineContent(start.lineNumber).trim();
      if (lineContent.startsWith("#") || lineContent.length === 0) continue;

      decorations.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { inlineClassName: "robot-function" },
      });
    }
    decorationIds = editor.deltaDecorations(decorationIds, decorations);
  }

  window.refreshEditorHighlighting = updateDecorations;
  updateDecorations();
  editor.onDidChangeModelContent(updateDecorations);
}

// --- Autocomplete ---
function setupAutocomplete() {
  const robotAPI = [
    {
      label: "motor",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "motor(${1:left}, ${2:right})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Control robot motors. motor(left, right) - left/right: 0-100",
      detail: "motor(left: number, right: number) -> void",
    },
    {
       label: "motor4",
       kind: monaco.languages.CompletionItemKind.Function,
       insertText: "motor4(${1:fl}, ${2:fr}, ${3:bl}, ${4:br})",
       insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
       documentation: "Control 4 robot motors independently.",
       detail: "motor4(fl, fr, bl, br) -> void",
    },
    {
      label: "delay",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "delay(${1:milliseconds})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Pause program for specified milliseconds",
      detail: "delay(ms: number) -> Promise",
    },
    {
      label: "analogRead",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "analogRead(${1:sensorIndex})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Read sensor value.",
      detail: "analogRead(index: number) -> number",
    },
    {
      label: "getSensorCount",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "getSensorCount()",
      documentation: "Get total number of sensors",
      detail: "getSensorCount() -> number",
    },
    {
      label: "SW",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "SW(${1:n})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: "(n) -> boolean",
      documentation: "คืนค่า true หากปุ่มที่ระบุถูกกด (1=SW1, 2=SW2, 3=SW3)",
    },
    {
      label: "waitSW",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "waitSW(${1:n})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: "waitSW(n) -> void",
      documentation: "Pause program until button n is pressed",
    },
    {
      label: "print",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "print(${1:message})",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Print message to console",
      detail: "print(message) -> void",
    },
    {
      label: "spawn_object",
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: "spawn_object('${1:red}')",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Spawn a new object on the canvas. Colors: red, blue, green, yellow",
      detail: "spawn_object(color: string) -> void",
    },
  ];

  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model, position) => {
      let dynamicAPI = [...robotAPI];
      if (window.SensorConfigs) {
        Object.values(window.SensorConfigs).forEach((config) => {
          if (config.api && Array.isArray(config.api)) {
            config.api.forEach((apiDef) => {
              if (apiDef.snippet) {
                dynamicAPI.push({
                  label: apiDef.snippet.label,
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: apiDef.snippet.insertText,
                  insertTextRules: apiDef.snippet.insertTextRules === "snippet"
                      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                      : undefined,
                  documentation: apiDef.snippet.documentation,
                  detail: apiDef.snippet.detail,
                });
              }
            });
          }
        });
      }
      return { suggestions: dynamicAPI };
    },
  });
}
