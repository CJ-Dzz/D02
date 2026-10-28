// 本轮资源交易、日限购、概率地图与动态模型回归。需本地 8766 HTTP 与 9230 CDP。
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const output = process.argv[2] || "content-review-output";
mkdirSync(output, { recursive:true });
const targets = await (await fetch("http://127.0.0.1:9230/json/list")).json();
const target = targets.find((entry)=>entry.type==="page"&&!entry.url.startsWith("edge:"));
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending=new Map(), errors=[], passed=[];let seq=0;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
const call=(method,params={})=>new Promise((resolve)=>{const id=++seq;pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});
const wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
async function run(expression){const r=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.result.exceptionDetails)throw Error(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text);return r.result.result.value;}
async function shot(name){await wait(180);const r=await call("Page.captureScreenshot",{format:"png"});writeFileSync(join(output,name+".png"),Buffer.from(r.result.data,"base64"));}
function check(name,value){assert.ok(value,name);passed.push(name);}
try {
  await call("Runtime.enable");await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await call("Page.navigate",{url:"http://127.0.0.1:8766/index.html"});await wait(2000);
  const portraits=await run(`(()=>{const result=[];for(const id of ['sprout','beat','mochi']){document.querySelector('.character-card[data-character='+id+']').click();const c=document.querySelector('.companion-art'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261,n=0;for(let i=0;i<p.length;i++){hash=Math.imul(hash^p[i],16777619);if(i%4===3&&p[i]>0)n++;}result.push({id,hash,n});}return result;})()`);
  check("三位主立绘都有实际像素且内容不同",portraits.every((p)=>p.n>50000)&&new Set(portraits.map((p)=>p.hash)).size===3);
  await shot("01-mochi-portrait");
  const models=await run(`(()=>{const out=[];for(const id of ['rifle','shotgun','rail','wand','scythe']){const c=document.createElement('canvas');c.width=240;c.height=180;const ctx=c.getContext('2d');const hashes=[];for(const attack of [0,1]){ctx.clearRect(0,0,240,180);ctx.save();ctx.translate(55,90);ctx.scale(1.7,1.7);WildrootWeapons.draw(ctx,id,{time:1,attack,hands:true});ctx.restore();const p=ctx.getImageData(0,0,240,180).data;let h=0;for(let i=0;i<p.length;i+=4)h=(Math.imul(h,31)+p[i]+p[i+3])|0;hashes.push(h);}out.push({id,hashes});}return out;})()`);
  check("五种结构模型各不相同且攻击姿态改变",models.every((m)=>m.hashes[0]!==m.hashes[1])&&new Set(models.map((m)=>m.hashes[0])).size===5);
  const weapons=await run(`(()=>{const out=[];for(const id of ['rifle','shotgun','rail','wand','scythe']){__wildrootDebug.startWithWeapon(id);__wildrootDebug.fireShots(1);const a=__wildrootDebug.content67().weaponFx.time;__wildrootDebug.tick(.05);out.push({id,a,b:__wildrootDebug.content67().weaponFx.time,mode:__wildrootDebug.snapshot().attackMode});}__wildrootDebug.freeze();return out;})()`);
  check("五种武器攻击均启动并推进动作，镰刀仍为近战",weapons.every((w)=>w.a>0&&w.b<w.a)&&weapons.at(-1).mode==="melee");
  const shop=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');d.toRest();const initial=d.snapshot().merchantStock.length;d.resources({coins:100,water:0,hp:40});d.offerShop(['canteen','rations','seedparcel','compass']);d.purchase('canteen');const a=d.snapshot();d.purchase('canteen');const b=d.snapshot();d.purchase('rations');const beforeSeeds=d.snapshot().seeds.reduce((a,b)=>a+b,0);d.purchase('seedparcel');const seedGain=d.snapshot().seeds.reduce((a,b)=>a+b,0)-beforeSeeds;d.purchase('compass');const c=d.snapshot(),more=d.content67();d.setWave(4);d.offerShop(['canteen','compass']);d.purchase('canteen');const next=d.snapshot();d.purchase('compass');const same=d.snapshot();return {initial,a,b,c,more,seedGain,next,same};})()`);
  check("商店库存为四件；补给扣费与同日限购",shop.initial===4&&shop.a.biomass===94&&shop.a.water===3&&shop.b.biomass===94&&shop.b.water===3);
  check("便当治疗、种子包与罗盘准确结算",shop.c.hp===62&&shop.seedGain===3&&shop.more.interactReach===18);
  check("补给隔日可购、永久道具隔日仍限购",shop.next.water===6&&shop.next.biomass===shop.same.biomass);
  const moreShop=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');d.toRest();d.resources({coins:100});d.offerShop(['nectar','compost','waterseal','harvestward','grip']);for(const id of ['nectar','compost','waterseal','harvestward','grip'])d.purchase(id);const result=d.content67();d.readyCrop(1);d.harvestReady();return {result,after:d.content67(),coins:d.snapshot().biomass,undefinedUI:document.querySelector('#build-items').textContent.includes('undefined')};})()`);
  check("农务商品应用、丰收护符只在收获时消耗",moreShop.result.wetReserve===2&&moreShop.result.charges.ward===6&&moreShop.after.charges.ward===5&&!moreShop.undefinedUI);
  const rolls=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');const zero=d.worldRoll(0);let valid=true,count=0;const seen=new Set();for(let i=0;i<150;i++){const nodes=d.worldRoll(1);count+=nodes.length;if(nodes.length>4||new Set(nodes.map(n=>n.id)).size!==nodes.length||nodes.some(n=>n.x>1050&&n.x<1330))valid=false;nodes.forEach(n=>seen.add(n.id));}const noTypes=d.worldRoll(1,{rain:0,composter:0,seedcache:0,memory:0,workbench:0,pollen:0});d.worldRoll(.72,{rain:1.3,composter:1.1,seedcache:1,memory:.7,workbench:.95,pollen:.8});return {zero:zero.length,valid,count,seen:[...seen],noTypes:noTypes.length};})()`);
  check("地图概率 0/1、数量上限、类型去重、无河道生成及零权重生效",rolls.zero===0&&rolls.valid&&rolls.count>0&&rolls.seen.length===6&&rolls.noTypes===0);
  const facilities=await run(`(()=>{const d=__wildrootDebug,results=[];for(const id of ['rain','composter','seedcache','memory','workbench','pollen']){d.startWithWeapon('rifle');d.resources({coins:20,water:2,shovel:0});d.worldFixture(id);const a={s:d.snapshot(),c:d.content67()};const used=d.worldUse();const b={s:d.snapshot(),c:d.content67()};d.worldUse();const c={s:d.snapshot(),c:d.content67()};results.push({id,used,a,b,c});}return results;})()`);
  check("六种设施均能通过 E 互动且不可重复领取",facilities.every((f)=>f.used&&f.b.s.biomass===f.c.s.biomass&&f.b.s.water===f.c.s.water&&f.b.c.crystals===f.c.c.crystals));
  const f=Object.fromEntries(facilities.map((entry)=>[entry.id,entry]));
  check("雨水、堆肥、种子柜、记忆、修铲、授粉实际收益正确",f.rain.b.s.water===4&&f.composter.b.s.water===1&&f.composter.b.s.biomass===24&&f.seedcache.b.s.biomass===15&&f.seedcache.b.s.seeds[0]===f.seedcache.a.s.seeds[0]+3&&f.memory.b.c.crystals===f.memory.a.c.crystals+1&&f.workbench.b.s.activeTools.shovel===2&&f.pollen.b.c.charges.pollen===3);
  const rejected=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');d.resources({coins:0});d.worldFixture('seedcache');const poor=d.worldUse();d.resources({coins:20,water:0});d.worldFixture('composter');const dry=d.worldUse();d.resources({shovel:5});d.worldFixture('workbench');const full=d.worldUse();const coins=d.snapshot().biomass;d.resources({shovel:4});const repaired=d.worldUse();return {poor,dry,full,coins,repaired,durability:d.snapshot().activeTools.shovel,after:d.snapshot().biomass};})()`);
  check("余额不足、无水、满耐久均不扣费且保留设施；修复不超过5",!rejected.poor&&!rejected.dry&&!rejected.full&&rejected.coins===20&&rejected.repaired&&rejected.durability===5&&rejected.after===16);
  const harvest=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');d.resources({coins:20});d.worldFixture('pollen');d.worldUse();for(let i=0;i<3;i++){d.readyCrop(1);d.harvestReady();}const charges=d.content67().charges.pollen;const frozen=d.probeRestGrowth();return {charges,frozen};})()`);
  check("授粉恰好三次收获耗尽，休整仍冻结植物生长与湿度",harvest.charges===0&&JSON.stringify(harvest.frozen.before)===JSON.stringify(harvest.frozen.after));
  const refresh=await run(`(()=>{const d=__wildrootDebug;d.startWithWeapon('rifle');d.toRest();const fees=[d.refreshShop(),d.refreshShop()];d.setWave(4);d.toRest();fees.push(d.refreshShop());d.freeze();return fees;})()`);
  check("刷新费跨日继续 2/4/6",JSON.stringify(refresh)==="[2,4,6]");
  await shot("02-expanded-shop");
  await run(`document.querySelector('#shop-toggle').click();__wildrootDebug.worldFixture('memory');__wildrootDebug.freeze()`);await shot("03-memory-terminal");
  for(const id of ["rain","composter","seedcache","workbench","pollen"]){await run(`__wildrootDebug.worldFixture('${id}')`);await shot("facility-"+id);check(id+" 设施实际进入画面渲染",await run(`__wildrootDebug.content67().rendered.includes('${id}')`));}
  check("浏览器没有脚本异常",errors.length===0);
  const report={passed,portraits,models,weapons,rolls,errors};writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally { ws.close(); }
