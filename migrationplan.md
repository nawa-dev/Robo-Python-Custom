# Migration Plan

เป้าหมายคือย้ายทั้งโปรเจคจาก "global script + `window.*` + inline handler" ไปเป็น "ES modules + clear boundaries + sensor plugin contract" โดยยังเปิดแอปได้ทุกช่วงของการย้าย

## Target End State

- มี `main.js` เป็น entry point เดียว
- ทุกไฟล์ใน `src/` ใช้ `import/export`
- ไม่มีการพึ่ง script order ใน `index.html`
- sensor ทุกตัวมี `index.js` และ export plugin มาตรฐาน
- `window.*` เหลือเฉพาะ bridge ชั่วคราวหรือ public API ที่ตั้งใจเปิดจริง
- event binding ย้ายออกจาก HTML ไปอยู่ใน JS
- physics, storage, rendering, runtime แยกบทบาทชัด

## Phase 1: Bootstrap ให้เป็น Module-First

ไฟล์หลัก: `index.html`

- เพิ่ม `src/main.js` เป็นตัว import ทุก subsystem
- ลด `<script>` หลายตัวใน HTML ให้เหลือ `vendor` ที่จำเป็นกับ `main.js`
- คง global bridge เฉพาะที่ยังต้องใช้กับ inline HTML และ legacy files
- ตั้งกติกาใหม่ว่าไฟล์ใหม่ทุกไฟล์ต้องเป็น ESM เท่านั้น

ผลลัพธ์ที่ต้องได้:

- แอปยังเปิดได้
- ไม่มีการพึ่ง "โหลดไฟล์นี้ก่อน/หลัง" แบบ implicit ในส่วน core ใหม่

## Phase 2: สร้าง Shared Module Foundations

ไฟล์หลัก:

- `src/core/variableGlobal.js`
- `src/core/sensor-plugin-registry.js`
- `src/core/simulation-service.js`
- `src/core/physics/physics-adapter.js`

งานที่ต้องทำ:

- แยก `state`, DOM refs, constants, registry, simulation service, physics adapter เป็น module ที่ import ได้
- ห้าม module ใหม่อ่าน `window.state` ตรง ถ้าไม่จำเป็น
- ทำ `dom-refs.js` แยกจาก `state` เพื่อไม่ให้ logic ต้อง import DOM ปนไปด้วย
- ทำ `services/index.js` หรือ `core/index.js` สำหรับ export รวม

ผลลัพธ์ที่ต้องได้:

- core modules import กันตรง ๆ ได้
- bridge ไป `window` เป็น optional compatibility layer เท่านั้น

## Phase 3: ทำ Sensor Contract ให้ตายตัว

โครงเป้าหมายต่อ sensor:

- `config.json`
- `render.html`
- `index.js`
- `logic.js`
- `physics.js`
- `executor.js`

contract ที่ควรบังคับ:

- `create(id, index)`
- `drawPreview(svg, sensor)`
- `drawCanvas(svg, sensor, globals, index)`
- `read(sensor, globals)`
- `updateValue(idOrKey, axis, value)`
- `physicsStep(sensor, index, globals)`
- `registerPythonAPI(Sk, robotObj, globals)`

งานที่ต้องทำ:

- เขียนเอกสาร contract กลาง
- ทำ helper validator ว่า plugin ไหนขาด method อะไร
- ให้ loader register plugin ผ่าน `registerSensorPlugin(...)` อย่างเดียว

ผลลัพธ์ที่ต้องได้:

- sensor ใหม่เขียนตามรูปแบบเดียวกัน
- ลด logic พิเศษเฉพาะตัวใน manager

## Phase 4: ย้าย Sensor ทุกตัวเป็น ESM

ตอนนี้เริ่มแล้วกับ `light`

ลำดับที่แนะนำ:

1. `light`
2. `ultrasonic`
3. `compass`
4. `grip`
5. `wheel`
6. `robot`
7. `object`

ต่อ sensor แต่ละตัว:

- เพิ่ม `index.js`
- เปลี่ยน `logic.js`, `physics.js`, `executor.js` ให้ export function/object
- ตัดการ assign ตรง ๆ แบบ `window.SensorRegistry["x"] = ...`
- เปลี่ยนไป export plugin แล้ว register ผ่าน loader หรือใน `index.js`

ผลลัพธ์ที่ต้องได้:

- ทุก sensor โหลดผ่าน module path ได้
- legacy fallback ถูกลบได้ในท้าย phase นี้

## Phase 5: ย้าย Sensor Loader เป็น Pure ESM

ไฟล์หลัก:

- `src/utils/sensorLoader.js`
- `config.json`

งานที่ต้องทำ:

- เปลี่ยน loader ให้ใช้ `import()` อย่างเดียว
- อ่านรายชื่อ sensor จาก `config.json`
- โหลด `config.json`, `render.html`, `index.js`
- ย้าย `window.SensorConfigs`, `window.SensorTemplates` ไปเป็น exported stores หรือ registry state ภายใน

ข้อจำกัดสำคัญ:

- ถ้าไม่มี build step/backend ยังต้องระบุ sensor names ใน `config.json`
- browser ไม่สามารถ scan folders เองได้

ผลลัพธ์ที่ต้องได้:

- ไม่มี dynamic `<script>` injection แบบ legacy แล้ว

## Phase 6: ย้าย Physics ทั้งหมดให้แยกชั้นชัด

ไฟล์หลัก:

- `src/core/physics.js`
- `src/core/physics/custom-engine.js`
- `src/core/physics/matter-engine.js`
- `src/core/physics/differential-drive.js`

งานที่ต้องทำ:

- ให้ `physics.js` เป็น loop orchestration อย่างเดียว
- ให้ `custom-engine` และ `matter-engine` เป็น adapter implementations
- ย้าย shared sensor-physics dispatch ออกมาที่ `SimulationService.runSensorPhysics()`
- ลดการที่ engine เรียก UI functions หรือ console โดยตรง
- ทำ `PhysicsPort` ภายในทีมแม้เป็น JS ปกติก็ได้

ผลลัพธ์ที่ต้องได้:

- เปลี่ยน engine ได้โดยกระทบ UI น้อย
- sensor ไม่ต้องรู้ว่ากำลังใช้ Matter หรือ custom

## Phase 7: ย้าย Runtime/Python Integration เป็น Module

ไฟล์หลัก: `src/core/executor.js`

งานที่ต้องทำ:

- แยกส่วน Skulpt runtime bootstrap ออกจาก robot API registration
- แยก `preprocessCode`, `runCode`, `stopProgram`, button state logic ออกจากกัน
- ให้ sensor python APIs register ผ่าน imported plugin registry แทน lookup global
- ทำ runtime service เช่น `python-runtime.js`

ผลลัพธ์ที่ต้องได้:

- Python API เพิ่มตาม sensor plugin ได้ง่าย
- executor ไม่ต้องรู้รายละเอียด sensor รายตัว

## Phase 8: ย้าย UI Event Binding ออกจาก HTML

ไฟล์หลัก: `index.html`

งานที่ต้องทำ:

- ลบ `onclick`, `onchange`, `href="javascript:void(0)"`
- ใส่ `id`/`data-action` ให้ element
- bind event ใน module เช่น `toolbar-controller.js`, `canvas-controller.js`, `file-menu-controller.js`
- ให้ HTML เหลือโครง markup อย่างเดียว

ผลลัพธ์ที่ต้องได้:

- ไม่มี global function แค่เพื่อให้ HTML เรียก
- test UI interactions ได้ง่ายขึ้นมาก

## Phase 9: แยก UI/Rendering/State Mutation

ไฟล์หลัก:

- `src/script.js`
- `src/core/canvas.js`
- `src/core/physics/sensor-physics.js`
- `src/sensors/sensors-manager.js`

แนะนำแยกเป็น:

- `renderers/robot-renderer.js`
- `renderers/sensor-preview-renderer.js`
- `renderers/canvas-overlay-renderer.js`
- `controllers/sensor-settings-controller.js`

ผลลัพธ์ที่ต้องได้:

- mutation ของ state ไม่ปนกับ DOM rendering
- render functions เรียกซ้ำได้และ debug ง่าย

## Phase 10: ตัด Legacy Bridge

เมื่อ phase ก่อน ๆ เสร็จแล้ว ค่อยลบ:

- `window.state`
- `window.SensorRegistry`
- `window.switchTab`
- `window.logToConsole`
- global helpers ที่เหลือ
- fallback loader ที่ยัง inject legacy scripts

ผลลัพธ์ที่ต้องได้:

- ระบบเป็น module-native จริง
- dependency graph ชัดและไม่มี dual-mode ซ้อน

## Phase 11: Stabilization และ Testing

แม้ไม่มี Node modules ก็ยังทำ smoke tests ได้แบบ manual checklist หรือ browser-based test page

อย่างน้อยควรมี checklist:

- app boot
- load project / save project
- run / stop python
- switch custom / matter physics
- add/remove sensor ทุกชนิด
- sensor preview
- light/ultrasonic/compass/grip APIs
- object interaction
- language switch

ควรมี test fixtures:

- example projects เดิม
- 1 project ต่อ 1 sensor type
- 1 mixed sensor project

## ลำดับทำงานที่แนะนำจริง

ถ้าจะลงมือทีละรอบ แนะนำลำดับนี้:

1. `main.js` + module bootstrap
2. core shared modules
3. `sensorLoader` module-first
4. ย้าย sensor ทั้งหมด
5. `executor.js`
6. `sensors-manager.js`
7. `script.js` และ renderers
8. ลบ inline handlers จาก HTML
9. ลบ legacy bridge

## ความเสี่ยงหลัก

- `index.html` ยังมี inline handlers เยอะ ถ้าย้ายไม่ครบจะมี function not found
- sensor หลายตัวพึ่ง helper globals ข้ามไฟล์
- Skulpt integration อ่อนไหวกับ timing และ globals
- Matter/custom physics มี logic ซ้ำบางส่วน อาจเกิด regression ตอนรวม flow

## Definition of Done

ถือว่า migration เสร็จเมื่อ:

- `src/` ใช้ `import/export` ทั้งหมด
- ไม่มี legacy `<script src="...">` สำหรับไฟล์แอป ยกเว้น vendor
- ไม่มี `window.SensorRegistry["x"] = ...`
- ไม่มี inline handler ใน HTML
- sensor ใหม่เพิ่มโดยทำ `folder + config.json + render.html + index.js`
- app ยังเปิดและฟีเจอร์หลักทั้งหมดทำงาน
