// BUILD 6.9：真实手势解锁、配乐信号、中文语音、混音设置与人物清晰度。
import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
const output=process.argv[2]||"audio-review-output";mkdirSync(output,{recursive:true});
const targets=await(await fetch("http://127.0.0.1:9230/json/list")).json();
const ws=new WebSocket(targets.find(t=>t.type==="page"&&!t.url.startsWith("edge:")).webSocketDebuggerUrl);
const pending=new Map(),errors=[],passed=[];let seq=0;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
const call=(method,params={})=>new Promise(resolve=>{const id=++seq;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function run(expression){const m=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(m.result.exceptionDetails.exception?.description||m.result.exceptionDetails.text);return m.result.result.value;}
async function click(id){const p=await run(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);await call("Input.dispatchMouseEvent",{type:"mousePressed",...p,button:"left",clickCount:1});await call("Input.dispatchMouseEvent",{type:"mouseReleased",...p,button:"left",clickCount:1});}
async function shot(name){const r=await call("Page.captureScreenshot",{format:"png"});writeFileSync(join(output,name+".png"),Buffer.from(r.result.data,"base64"));}
async function sample(n=10,interval=80){return run(`(async()=>{const samples=[];for(let i=0;i<${n};i++){samples.push(__wildrootDebug.audio69().rms);await new Promise(r=>setTimeout(r,${interval}));}return {min:Math.min(...samples),max:Math.max(...samples),mean:samples.reduce((a,b)=>a+b,0)/samples.length};})()`);}
function check(name,value){assert.ok(value,name);passed.push(name);}
try{
  await call("Runtime.enable");await call("Page.enable");await call("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await call("Page.navigate",{url:"http://127.0.0.1:8766/index.html"});await wait(1500);
  check("未交互时不强制自动播放",await run(`!__wildrootDebug.audio69().unlocked`));
  const saved=await run(`__wildrootDebug.audio69().settings`);
  await run(`__wildrootDebug.audioSetting('muted',false);__wildrootDebug.audioSetting('music',.65);__wildrootDebug.audioSetting('sfx',0);__wildrootDebug.audioSetting('voice',.85)`);
  await click("audio-btn");await wait(180);await shot("01-audio-settings");
  check("第一次真实点击解锁音乐，声音面板可打开",await run(`__wildrootDebug.audio69().context==='running'&&__wildrootDebug.audio69().unlocked&&!document.querySelector('#audio-overlay').classList.contains('hidden')`));
  await click("audio-close");const menu=await sample(15);
  check("主菜单实际输出配乐信号",menu.max>.002&&menu.max<.9);
  check("完整32小节主题使用持续调度",await run(`__wildrootDebug.audio69().scheduledNotes>10&&__wildrootDebug.audio69().loopSeconds>80&&__wildrootDebug.audio69().activeSources<140`));
  const modes=[];
  await run(`__wildrootDebug.startWithWeapon('rifle');__wildrootDebug.freeze()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  await run(`__wildrootDebug.setWave(3);__wildrootDebug.freeze()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  await run(`__wildrootDebug.setWave(9);__wildrootDebug.freeze()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  await run(`__wildrootDebug.toRest();__wildrootDebug.freeze()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  await run(`__wildrootDebug.setWave(6);__wildrootDebug.freeze()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  await run(`__wildrootDebug.endRun()`);await wait(100);modes.push(await run(`__wildrootDebug.audio69().scene`));
  check("白昼、奖励、夜间、休整、Boss与结算均有对应编配",JSON.stringify(modes)==='["day","reward","night","rest","boss","ending"]');
  await run(`document.querySelector('#home-end-btn').click();__wildrootDebug.startWithWeapon('rifle');__wildrootDebug.freeze()`);
  await click("sound-btn");
  check("战斗时打开声音设置会安全暂停",await run(`__wildrootDebug.preparation68().state==='paused'`));await click("audio-close");
  check("关闭声音设置恢复原战斗状态",await run(`__wildrootDebug.preparation68().state==='playing'`));
  await run(`__wildrootDebug.audioSetting('muted',true)`);await wait(450);const muted=await sample(5);
  check("全部静音确实消除输出",muted.max<.0001);
  await run(`__wildrootDebug.audioSetting('muted',false);__wildrootDebug.audioSetting('music',0);__wildrootDebug.audioSetting('sfx',0)`);await wait(600);
  const voices=[],renders=[];
  for(const id of ["sprout","beat","mochi"]){
    await run(`document.querySelector('#home-pause-btn').click();document.querySelector('.character-card[data-character=${id}]').click();__wildrootDebug.startWithWeapon('rifle');__wildrootDebug.viewZone('home');`);
    for(let i=1;i<=2;i++){
      await run(`__wildrootDebug.useSkill()`);await wait(150);
      const voice=await run(`({audio:__wildrootDebug.audio69(),render:__wildrootDebug.render69(),clip:WILDROOT_VOICES['${id}-${i}'].text})`);
      check(id+" 第"+i+"句技能语音与字幕一致",voice.audio.voice===id+"-"+i&&voice.render.subtitle===voice.clip&&voice.audio.ducked);
      const signal=await sample(8,80);check(id+" 第"+i+"句录制语音有实际输出",signal.max>.002);voices.push({id:id+"-"+i,text:voice.clip,signal});
      await run(`__wildrootDebug.trySkill69();__wildrootDebug.ambientSpeech69()`);
      check(id+" 冷却中不重播，普通提示不覆盖技能台词",await run(`__wildrootDebug.render69().subtitle===WILDROOT_VOICES['${id}-${i}'].text&&__wildrootDebug.audio69().voice==='${id}-${i}'`));
    }
    for(const hurt of [0,.62,.4,.2]){
      await run(`__wildrootDebug.posePlayer(${hurt},0)`);await wait(60);const r=await run(`__wildrootDebug.render69()`);
      check(id+" 受伤保护 "+hurt+" 时角色保持不透明、无滤镜",r.player.alpha===1&&r.player.filter==="none"&&r.caches.length===3&&r.caches.every(c=>c.width===108&&c.height===196));renders.push({id,hurt,state:r.player});
    }
    await shot("character-"+id+"-hurt");
  }
  await run(`document.querySelector('#home-pause-btn').click();document.querySelector('#start-btn').click()`);
  for(const id of ["rifle","shotgun","rail"]){await run(`document.querySelector('[data-weapon=${id}]').click()`);await wait(120);await shot("weapon-"+id);}
  await run(`__wildrootDebug.audioSetting('music',.31);__wildrootDebug.audioSetting('sfx',.22);__wildrootDebug.audioSetting('voice',.44);__wildrootDebug.audioSetting('muted',true)`);
  await call("Page.reload",{ignoreCache:true});await wait(1400);const persisted=await run(`__wildrootDebug.audio69().settings`);
  check("音乐、音效、语音和静音设置刷新后保留",persisted.music===.31&&persisted.sfx===.22&&persisted.voice===.44&&persisted.muted);
  await run(`for(const [k,v]of Object.entries(${JSON.stringify(saved)}))__wildrootDebug.audioSetting(k,v)`);
  check("音频与渲染无脚本异常",errors.length===0);
  const report={passed,menu,muted,modes,voices,renders,errors};writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify({passed,menu,muted,modes,voices,errors},null,2));
}finally{ws.close();}
