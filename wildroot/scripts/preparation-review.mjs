// BUILD 6.8：真实键盘两步选择、转场、中途返回、角落入口与场景深度回归。
import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
const output=process.argv[2]||"preparation-review-output";mkdirSync(output,{recursive:true});
const targets=await(await fetch("http://127.0.0.1:9230/json/list")).json();
const target=targets.find((t)=>t.type==="page"&&!t.url.startsWith("edge:"));
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],passed=[];let seq=0;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
const call=(method,params={})=>new Promise((resolve)=>{const id=++seq;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});
const wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
async function run(expression){const r=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.result.exceptionDetails)throw Error(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text);return r.result.result.value;}
async function key(key){const codes={Enter:13,ArrowLeft:37,ArrowRight:39,Escape:27};await call("Input.dispatchKeyEvent",{type:"keyDown",key,code:key,windowsVirtualKeyCode:codes[key]});await call("Input.dispatchKeyEvent",{type:"keyUp",key,code:key,windowsVirtualKeyCode:codes[key]});}
async function shot(name){await wait(100);const r=await call("Page.captureScreenshot",{format:"png"});writeFileSync(join(output,name+".png"),Buffer.from(r.result.data,"base64"));}
function check(name,value){assert.ok(value,name);passed.push(name);}
try{
  await call("Runtime.enable");await call("Page.enable");await call("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await call("Page.navigate",{url:"http://127.0.0.1:8766/index.html"});await wait(1700);
  const initial=await run(`({s:__wildrootDebug.preparation68(),words:document.querySelector('#start-screen').innerText.length,weapons:[...document.querySelectorAll('.weapon-card')].filter(c=>c.getClientRects().length).length,details:document.querySelector('#character-more').open})`);
  check("首次只显示同行者，武器与完整技能默认收起",initial.s.step==="character"&&initial.weapons===0&&!initial.details&&initial.words<420);
  await run(`window.__prepTransitionSeen=false;document.querySelector('.companion-art').addEventListener('animationstart',()=>window.__prepTransitionSeen=true)`);
  await key("ArrowRight");await shot("01-character-transition");
  check("左右键触发人物切换与转场",await run(`__wildrootDebug.preparation68().character==='beat'&&(__wildrootDebug.preparation68().transitioning||window.__prepTransitionSeen)`));
  await wait(500);await shot("02-beat-selected");
  check("转场结束清理状态，立绘与姓名同属当前人物",await run(`!__wildrootDebug.preparation68().transitioning&&document.querySelector('#character-name').textContent==='霹雳'&&document.querySelector('.companion-art').dataset.character==='beat'`));
  await run(`document.querySelector('#character-more').open=true`);await shot("03-skill-details");
  await key("ArrowLeft");await key("ArrowLeft");
  check("人物反向循环及关闭上位人物的详情",await run(`__wildrootDebug.preparation68().character==='mochi'&&!document.querySelector('#character-more').open`));
  await run(`for(let i=0;i<14;i++)document.querySelector('#character-next').click()`);await wait(530);
  check("快速切换最终选择与转场状态一致",await run(`__wildrootDebug.preparation68().character==='beat'&&!__wildrootDebug.preparation68().transitioning`));
  await run(`document.querySelector('#start-btn').focus()`);await key("Enter");await shot("04-weapon-step");
  check("第一次确认只进入武器整备，不启动剧情或战斗",await run(`__wildrootDebug.preparation68().step==='weapon'&&__wildrootDebug.preparation68().state==='start'&&document.querySelector('#story-screen').classList.contains('hidden')`));
  await key("ArrowLeft");
  check("武器支持反向循环，近战从武器页选择",await run(`__wildrootDebug.preparation68().weapon==='scythe'&&document.querySelector('#weapon-name').textContent==='月芽收割镰'`));
  await run(`document.querySelector('#lab-btn').click()`);await key("ArrowRight");
  check("实验室打开时键盘不修改出发选择",await run(`!document.querySelector('#lab-overlay').classList.contains('hidden')&&__wildrootDebug.preparation68().weapon==='scythe'`));
  await shot("05-laboratory");await key("Escape");
  await run(`document.querySelector('#codex-btn').click()`);await key("Escape");
  check("两个角落入口可打开关闭并保留当前准备步骤",await run(`__wildrootDebug.preparation68().step==='weapon'&&__wildrootDebug.preparation68().state==='start'&&document.querySelector('#codex-screen').classList.contains('hidden')&&document.querySelector('#lab-overlay').classList.contains('hidden')`));
  await key("Escape");
  check("武器页可退回人物页且保留武器",await run(`__wildrootDebug.preparation68().step==='character'&&__wildrootDebug.preparation68().weapon==='scythe'`));
  await key("Enter");await key("Enter");
  check("第二次确认进入剧情",await run(`__wildrootDebug.preparation68().state==='story'&&!document.querySelector('#story-screen').classList.contains('hidden')`));
  await run(`document.querySelector('#story-skip').click();__wildrootDebug.freeze()`);
  check("选定人物与武器传入新一局",await run(`__wildrootDebug.snapshot().character==='beat'&&__wildrootDebug.snapshot().weapon==='scythe'&&__wildrootDebug.snapshot().attackMode==='melee'`));
  const zones=[];
  for(const id of ["home","solar","ruin","crater"]){await run(`__wildrootDebug.viewZone('${id}')`);await shot("map-"+id);const d=await run(`__wildrootDebug.depth68()`);check(id+" 区绘制立体物件且场景按脚底排序",d.stats.props>0&&d.stats.order.every((e,i,a)=>!i||e.y>=a[i-1].y));zones.push({id,props:d.stats.props});}
  await run(`__wildrootDebug.depthScene(827,820)`);await shot("06-behind-tree");
  const behind=await run(`__wildrootDebug.depth68().stats`);
  check("高物件遮住人物时自动淡化",behind.faded>0&&behind.order.findIndex(e=>e.id==='player')<behind.order.findIndex(e=>e.id==='scenery:home-tree'));
  await run(`__wildrootDebug.depthScene(827,910)`);await shot("07-in-front-of-tree");
  const front=await run(`__wildrootDebug.depth68().stats`);
  check("走到树前时遮挡顺序翻转",front.order.findIndex(e=>e.id==='player')>front.order.findIndex(e=>e.id==='scenery:home-tree'));
  await run(`__wildrootDebug.setTerrain('bridge');__wildrootDebug.viewZone('home')`);await shot("08-river-bridges");
  await run(`__wildrootDebug.setTerrain('blackout');__wildrootDebug.viewZone('ruin',true)`);await shot("09-night-ruins");
  const bridgeSpawns=await run(`(()=>{const d=__wildrootDebug,original=Math.random;try{Math.random=()=>.9999;d.startWithWeapon('rifle');}finally{Math.random=original;}d.tick(.05);const out=d.snapshot().terrain.includes('bridge')?[{hp:d.snapshot().hp,x:d.depth68().player.x}]:[];d.freeze();return out;})()`);
  check("断桥日开局落在岸边且不扣血",bridgeSpawns.length>0&&bridgeSpawns.every(s=>s.x===1055&&s.hp===100));
  await run(`document.querySelector('#home-pause-btn').click()`);
  check("返回主页重新从同行者开始",await run(`__wildrootDebug.preparation68().step==='character'&&__wildrootDebug.preparation68().state==='start'`));
  for(const [w,h] of [[960,540],[1280,720]]){await call("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:1,mobile:false});await wait(100);check(w+" 宽窗口的确认和角落图标在界内",await run(`(()=>{const s=document.querySelector('#game-shell').getBoundingClientRect();return ['start-btn','lab-btn','codex-btn'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom;});})()`));if(w===960)await shot("10-small-menu");}
  await call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await key("ArrowRight");
  check("减少动态效果设置生效",await run(`getComputedStyle(document.querySelector('.companion-art')).animationName==='none'`));
  await call("Emulation.setEmulatedMedia",{features:[]});check("浏览器无脚本异常",errors.length===0);
  const report={initial,passed,zones,bridgeSpawns,errors};writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{ws.close();}
