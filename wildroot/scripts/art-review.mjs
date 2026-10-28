// 在本地 HTTP 服务与 9230 调试端口的浏览器中检查美术与关键交互。
// node scripts/art-review.mjs [输出目录] [页面URL]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const output = process.argv[2] || "art-review-output";
const url = process.argv[3] || "http://127.0.0.1:8766/index.html";
mkdirSync(output, { recursive: true });
const targets = await (await fetch("http://127.0.0.1:9230/json/list")).json();
const target = targets.find((entry) => entry.type === "page" && !entry.url.startsWith("edge:"));
if (!target) throw new Error("没有可用的浏览器页面");
const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const requests = new Map();
const errors = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) { requests.get(message.id)?.(message); requests.delete(message.id); }
  if (message.method === "Runtime.exceptionThrown") errors.push({ description:message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text, url:message.params.exceptionDetails.url, stack:message.params.exceptionDetails.stackTrace });
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error" && !message.params.entry.url?.endsWith("favicon.ico") && !message.params.entry.url?.includes("tampermonkey.net")) errors.push(message.params.entry);
};
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
const call = (method, params = {}) => new Promise((resolve) => { const id = ++sequence; requests.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
  return response.result.result.value;
}
async function shot(name) {
  await wait(200);
  const response = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(join(output, name + ".png"), Buffer.from(response.result.data, "base64"));
}
await call("Runtime.enable"); await call("Log.enable"); await call("Page.enable");
await call("Emulation.setDeviceMetricsOverride", { width:1280, height:720, deviceScaleFactor:1, mobile:false });
await call("Page.navigate", { url }); await wait(2500);
const initial = await evaluate("({version:document.querySelector('.version').textContent,atlas:window.__wildrootDebug?.artAssets(),hero:[...document.querySelector('.companion-art').getContext('2d').getImageData(0,0,512,1024).data].some((value,index)=>index%4===3&&value>0),startVisible:!document.querySelector('#start-screen').classList.contains('hidden')})");
await shot("01-menu");
await evaluate("document.querySelector('[data-character=beat]').click()"); await shot("02-beat");
await evaluate("document.querySelector('#lab-btn').click()");
const labVisible = await evaluate("!document.querySelector('#lab-overlay').classList.contains('hidden')"); await shot("03-lab");
await evaluate("document.querySelector('#lab-close').click();document.querySelector('#start-btn').click()"); await shot("04-weapons");
await evaluate("document.querySelector('#start-btn').click()"); await shot("04-story");
await evaluate("document.querySelector('#story-skip').click()"); await wait(400);
const started = await evaluate("window.__wildrootDebug?.snapshot()");
await shot("05-game");
if (started) {
  await evaluate("window.__wildrootDebug.artGallery()"); await shot("06-gallery");
  await evaluate("window.__wildrootDebug.startWithWeapon('scythe');window.__wildrootDebug.toRest()"); await shot("07-shop");
  await evaluate("document.querySelector('#shop-toggle').click()");
  const collapsed = await evaluate("document.querySelector('#rest-shop').classList.contains('collapsed')");
  await shot("08-collapsed");
  await evaluate("window.__wildrootDebug.setWave(6)"); await wait(150); await shot("09-boss-intro");
  await wait(2500); await shot("10-boss");
  await evaluate("window.__wildrootDebug.openChoice('milestone')"); await shot("11-choice");
  await evaluate("document.querySelector('#home-pause-btn').click();document.querySelector('#codex-btn').click()");await shot("12-codex");
  await evaluate("document.querySelector('#codex-close').click()");
  const characters=[];
  for(const id of ["sprout","beat","mochi"]){await evaluate(`document.querySelector('[data-character=${id}]').click();window.__wildrootDebug.startWithWeapon('rifle')`);await wait(150);characters.push(await evaluate("window.__wildrootDebug.snapshot().character"));await evaluate("document.querySelector('#home-pause-btn').click()");}
  await call("Emulation.setDeviceMetricsOverride", { width:960, height:540, deviceScaleFactor:1, mobile:false });await wait(150);await shot("13-small-menu");
  const small = await evaluate("(()=>{const a=document.querySelector('#game-shell').getBoundingClientRect(),b=document.querySelector('#start-btn').getBoundingClientRect();return {scale:window.__wildrootDebug.artAssets().scale,buttonInside:b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom}})()");
  console.log(JSON.stringify({ initial, labVisible, started: { character:started.character, weapon:started.weapon, wave:started.wave }, collapsed,characters,small, errors }, null, 2));
} else console.log(JSON.stringify({ initial, labVisible, errors }, null, 2));
socket.close();
