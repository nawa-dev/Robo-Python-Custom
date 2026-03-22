/**
 * Code Execution System with Skulpt (Python)
 * รองรับการหยุดรอ (simulating blocking calls) ด้วย Suspension
 */

// Global state for Skulpt
// let isRunning = false; // Used from variableGlobal.js
let executionPromise = null; // Promise ของ Sk.misceval.asyncToPromise
let stopRequest = false; // Flag สำหรับสั่งหยุด

/* =========================
 * Run user code (Python)
 * ========================= */
function runCode() {
  if (typeof Sk === "undefined") {
    logToConsole("Error: Skulpt library not loaded.", "error");
    return;
  }

  // เตรียมสถานะ
  autoSaveToWebStorage();
  stopProgram(); // หยุดโปรแกรมเดิมถ้ามีวิ่งอยู่
  clearConsole();

  const code = editor.getValue();
  isRunning = true;
  stopRequest = false;
  updateRunStopButtonIO("stop");

  logToConsole("Starting Python execution...", "info");

  // ตั้งค่า Skulpt
  Sk.configure({
    output: (text) => {
      // Skulpt จะส่ง output มาที่นี่ (เช่น print)
      // ตัด newline ท้ายคำออกถ้ามี เพราะ logToConsole สร้างบรรทัดใหม่ให้แล้ว
      if (text.endsWith("\n")) text = text.slice(0, -1);
      if (text) logToConsole(text);
    },
    read: builtinRead,
    __future__: Sk.python3, // ใช้ Python 3 syntax
  });

  // Prepend imports to make usage simpler for the user
  // This allows calling motor(), delay() directly without imports
  // delay(ms) is added to match the previous JS API (milliseconds)
  const headerCode = "from robot import *\n";
  
  // Inject automatic delay(1) into while loops to prevent freezing
  const processedCode = preprocessCode(code);
  const finalCode = headerCode + processedCode;

  // รันโค้ด
  executionPromise = Sk.misceval.asyncToPromise(() => {
    return Sk.importMainWithBody("<stdin>", false, finalCode, true);
  })
    .then((mod) => {
      if (isRunning) {
        logToConsole("Program finished.", "info");
      }
    })
    .catch((err) => {
      if (err.toString().includes("StopExecution")) {
        logToConsole("Program stopped.", "info");
      } else {
        logToConsole("Runtime Error: " + err.toString(), "error");
      }
    })
    .finally(() => {
      isRunning = false;
      stopProgram();
    });
}

/**
 * Preprocess Python code to inject delay(5) into while loops.
 * This prevents the browser from freezing (infinite loops) without using yieldLimit.
 * Supports:
 * - Block while: while True:\n    ... -> while True:\n    delay(5)\n    ...
 * - Inline while: while True: print(1) -> while True: delay(5); print(1)
 */
function preprocessCode(code) {
    const lines = code.split("\n");
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for 'while' statement (basic regex, ignores strings/comments for simplicity)
        // Matches: whitespace + while + condition + :
        if (/^\s*while\s+.*:/.test(line)) {
            
            // Case 1: Inline while (e.g. while 1: print(1))
            // Check if there is content after the colon
            const parts = line.split(":");
            const afterColon = parts.slice(1).join(":").trim();
            
            if (afterColon.length > 0 && !afterColon.startsWith("#")) {
                // Determine indentation of the while statement
                const loopIndentMatch = line.match(/^(\s*)/);
                const loopIndent = loopIndentMatch ? loopIndentMatch[1] : "";
                
                // Reconstruct: "while ... : delay(1); ..."
                // parts[0] is "while ..."
                const preColon = parts[0]; 
                
                // Need to be careful with nested colons? regex is safer.
                // Improve regex to capture pre-colon and post-colon
                const matchIndex = line.indexOf(":");
                const declaration = line.substring(0, matchIndex + 1);
                const content = line.substring(matchIndex + 1);
                
                result.push(`${declaration} delay(1); ${content}`);
                continue;
            }

            // Case 2: Block while (e.g. while 1:\n    ...)
            result.push(line);
            
            // Look ahead for the next non-empty line to find indentation
            let nextLineIndex = i + 1;
            let nextIndent = "";
            
            while (nextLineIndex < lines.length) {
                const nextLine = lines[nextLineIndex];
                if (nextLine.trim().length > 0 && !nextLine.trim().startsWith("#")) {
                    const indentMatch = nextLine.match(/^(\s+)/);
                    if (indentMatch) {
                        nextIndent = indentMatch[1];
                    }
                    break;
                }
                nextLineIndex++;
            }
            
            // If found valid indentation, inject delay
            if (nextIndent) {
                result.push(`${nextIndent}delay(1)`);
            }
        } else {
            result.push(line);
        }
    }
    
    return result.join("\n");
}

function stopProgram() {
  if (isRunning) {
    stopRequest = true; // บอกให้ custom functions รู้ว่าต้องหยุด
    isRunning = false;
    logToConsole("Stopping...", "info");
  }
  motorL = 0;
  motorR = 0;
  if (window.physics) window.physics.setTargets(0, 0);
  if (typeof window.releaseAllObjects === "function") {
    window.releaseAllObjects();
  }
  updateRunStopButtonIO("run");
}

function resetPosition() {
  stopProgram();
  robotX = 100;
  robotY = 100;
  angle = 0;
  updateRobotDOM();
  logToConsole("Robot position reset.", "info");

  // --- DYNAMIC HOOK: onReset ---
  if (window.SensorConfigs) {
      Object.keys(window.SensorConfigs).forEach(type => {
          const registry = window.SensorRegistry[type];
          if (registry && typeof registry.onReset === "function") {
              registry.onReset({ sensors: typeof sensors !== 'undefined' ? sensors : [], grips: typeof grips !== 'undefined' ? grips : [] });
          }
      });
  }
}

/* =========================
 * Toggle Run/Stop Logic
 * ========================= */
function toggleRunStop() {
  if (isRunning) {
    stopProgram();
  } else {
    runCode();
  }
}

function updateRunStopButtonIO(state) {
  const btn = document.getElementById("run-stop-btn");
  if (!btn) return;

  if (state === "run") {
    // Show "Run"
    btn.innerHTML = '<i class="fas fa-play"></i> Run';
    btn.className = "btn-run";
  } else {
    // Show "Stop"
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    btn.className = "btn-stop";
  }
}

// Expose functions to global scope for HTML buttons
window.runCode = runCode;
window.stopProgram = stopProgram;
window.resetPosition = resetPosition;
window.toggleRunStop = toggleRunStop;

/* =========================
 * Skulpt Module Loader
 * ========================= */
/* =========================
 * Skulpt Module Loader
 * ========================= */
function builtinRead(x) {
  // logToConsole("Loading: " + x); // Debug logging

  if (x === "src/lib/robot.js" || x.endsWith("/robot.js")) {
    // --- DYNAMIC HOOK: Allow sensors to register custom Python functions ---
    if (window.SensorConfigs) {
      Object.keys(window.SensorConfigs).forEach(type => {
          const registry = window.SensorRegistry[type];
          if (registry && typeof registry.registerPythonAPI === "function") {
              registry.registerPythonAPI(Sk, Sk.builtins.robot, { sensors: typeof sensors !== 'undefined' ? sensors : [], grips: typeof grips !== 'undefined' ? grips : [] });
          }
      });
    }

    // Skulpt expects a $builtinmodule function when loading a JS module.
    // We bridge it to our manually defined Sk.builtins.robot.
    return "var $builtinmodule = function(name) { return Sk.builtins.robot; };";
  }
  
  if (x === "src/lib/robot.py" || x.endsWith("/robot.py")) {
    return "pass";
  }

  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
    if (Sk.externalLibraries && Sk.externalLibraries[x]) {
       return Sk.externalLibraries[x].code();
    }
    throw "File not found: '" + x + "'";
  }
  return Sk.builtinFiles["files"][x];
}

// Register custom module 'robot'
// นี่คือวิธีที่ Skulpt ใช้สำหรับ built-in modules ที่เขียนด้วย JS
Sk.builtins.robot = {
  __name__: new Sk.builtin.str("robot"),
  
  // motor(left, right)
  motor: new Sk.builtin.func(function(left, right) {
    Sk.builtin.pyCheckArgs("motor", arguments, 2, 2);
    if(stopRequest) throw "StopExecution";
    
    let l = Sk.builtin.asnum$(left);
    let r = Sk.builtin.asnum$(right);
    
    // Update global motors
    motorL = (l / 220) * 100; // calibrate ตามเดิม
    motorR = (r / 220) * 100;
    
    if (window.physics) {
      window.physics.setTargets(l, r);
    }
    
    return Sk.builtin.none.none$;
  }),

  // analogRead(index)
  // analogRead(index)
  analogRead: new Sk.builtin.func(function(index) {
    Sk.builtin.pyCheckArgs("analogRead", arguments, 1, 1);
    let i = Sk.builtin.asnum$(index);
    
    // Create a promise to yield to the browser's event loop
    let promise = new Promise(function(resolve, reject) {
        if (stopRequest) {
            reject("StopExecution");
            return;
        }

        // Use setTimeout(0) to allow UI updates/events to process
        setTimeout(() => {
            if (stopRequest) {
                reject("StopExecution");
                return;
            }

            if (i < 0 || i >= sensors.length) {
                resolve(new Sk.builtin.int_(0));
                return;
            }
            
            const s = sensors[i];
            let result = 0;
            const registry = window.SensorRegistry[s.type];
            if (registry && typeof registry.read === "function") {
                const globals = { robotX, robotY, angle, motorPos };
                result = registry.read(s, globals);
            }
            
            resolve(new Sk.builtin.int_(result));
        }, 0);
    });

    return new Sk.misceval.promiseToSuspension(promise);
  }),

  // SW(n) -> bool
  SW: new Sk.builtin.func(function(n) {
    Sk.builtin.pyCheckArgs("SW", arguments, 1, 1);
    let i = Sk.builtin.asnum$(n) - 1;
    if (i >= 0 && i < swStates.length) {
      return new Sk.builtin.bool(swStates[i]);
    }
    return Sk.builtin.bool.false$;
  }),

  // waitSW(n) -> blocking
  waitSW: new Sk.builtin.func(function(n) {
    Sk.builtin.pyCheckArgs("waitSW", arguments, 1, 1);
    let btnIndex = Sk.builtin.asnum$(n) - 1;

    let promise = new Promise(function(resolve, reject) {
      function checkBtn() {
        if (stopRequest) {
          // Rejecting leads to an error in Python, usually we just want to stop.
          // Throwing StopExecution exception string is handled in runCode catch block.
          reject("StopExecution");
          return;
        }
        if (btnIndex >= 0 && btnIndex < swStates.length && swStates[btnIndex]) {
          resolve(Sk.builtin.none.none$); 
        } else {
          setTimeout(checkBtn, 50);
        }
      }
      checkBtn();
    });
    
    return new Sk.misceval.promiseToSuspension(promise);
  }),
  
  // delay(ms)
  delay: new Sk.builtin.func(function(ms) {
    Sk.builtin.pyCheckArgs("delay", arguments, 1, 1);
    let duration = Sk.builtin.asnum$(ms);

    let promise = new Promise(function(resolve, reject) {
       // Initial check
       if (stopRequest) {
           reject("StopExecution");
           return;
       }
       
       setTimeout(() => {
           // Check again when waking up
           if (stopRequest) {
               reject("StopExecution");
           } else {
               resolve(Sk.builtin.none.none$);
           }
       }, duration);
    });

    return new Sk.misceval.promiseToSuspension(promise);
  }),
  
  // getSensorCount()
  getSensorCount: new Sk.builtin.func(function() {
     return new Sk.builtin.int_(sensors.length);
  }),

  // grab(index)
  grab: new Sk.builtin.func(function(index) {
    Sk.builtin.pyCheckArgs("grab", arguments, 1, 1);
    if(stopRequest) throw "StopExecution";
    let idx = Sk.builtin.asnum$(index);
    if (typeof window.grabObject === "function") {
      window.grabObject(idx);
    }
    return Sk.builtin.none.none$;
  }),

  // release(index)
  release: new Sk.builtin.func(function(index) {
    Sk.builtin.pyCheckArgs("release", arguments, 1, 1);
    if(stopRequest) throw "StopExecution";
    let idx = Sk.builtin.asnum$(index);
    if (typeof window.releaseObject === "function") {
      window.releaseObject(idx);
    }
    return Sk.builtin.none.none$;
  }),



  // spawn_object(color)
  spawn_object: new Sk.builtin.func(function(color) {
    Sk.builtin.pyCheckArgs("spawn_object", arguments, 1, 1);
    if(stopRequest) throw "StopExecution";
    let c = Sk.builtin.asnum$(color);
    if (typeof window.addCanvasObject === "function") {
      window.addCanvasObject(c);
    }
  })
};

// --- DYNAMIC HOOK MOVED TO builtinRead ---


/* ==================
 * Override time.sleep to use Browser Logic
 * ================== */
// เราต้องเตรียม library 'time' ให้ Skulpt หรือ override function sleep
// วิธีง่ายสุดคือเพิ่ม built-ins ผ่าน configuration หรือ hack module

// สร้าง module wrapper สำหรับ custom libraries
/* ==================
 * External Libraries Configuration
 * ================== */
Sk.externalLibraries = Sk.externalLibraries || {};

// Inject 'robot' module
// เมื่อ Skulpt เจอ 'import robot', มันจะเรียก builtinRead ด้วย 'src/lib/robot.js' (หรือ path ที่ config)
// แต่เราจะดักจับใน builtinRead ให้ return code แทน
// การใช้ Sk.builtins.robot โดยตรงทำให้ไม่ต้องโหลดไฟล์ซ้ำซ้อน
// แต่การใส่ใน builtins ไม่ได้ทำให้ import ทำงานอัตโนมัติเสมอไปถ้าไม่ได้ config read function ให้ถูก
// วิธีที่ง่ายที่สุดคือปล่อยให้มันหาไฟล์ไม่เจอ แล้วเรา return dummy code
// แล้ว Skulpt จะไปโหลด property จาก Sk.builtins.robot เอง


// ส่วน Button States logic
let swStates = [false, false, false];
const swIds = ["button1", "button2", "button3"];
swIds.forEach((id, index) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("mousedown", () => { swStates[index] = true; logToConsole(`SW${index + 1} Pressed`); });
    btn.addEventListener("mouseup", () => { swStates[index] = false; });
    btn.addEventListener("mouseleave", () => { swStates[index] = false; });
  }
});
