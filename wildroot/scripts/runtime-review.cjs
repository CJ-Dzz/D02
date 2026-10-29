// 无浏览器依赖的实际游戏运行回归；linkedom 仅用于测试，游戏无需安装它。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require(path.join(os.tmpdir(),'wildroot-testdom/node_modules/linkedom'));
const {createCanvas,Image}=require('@napi-rs/canvas');
const root=path.join(__dirname,'..'),output=process.argv[2]||path.join(os.tmpdir(),'wildroot-runtime70');fs.mkdirSync(output,{recursive:true});
const html=fs.readFileSync(process.env.WILDROOT_PACKED_HTML||path.join(root,'index.html'),'utf8');
const {window}=parseHTML(html),document=window.document;
const surfaces=new WeakMap();
for(const [name,fallback]of [['width',300],['height',150]])Object.defineProperty(window.HTMLCanvasElement.prototype,name,{get(){return Number(this.getAttribute(name))||fallback;},set(value){this.setAttribute(name,String(value));},configurable:true});
function surface(element){let s=surfaces.get(element);if(!s){s=createCanvas(Number(element.width)||300,Number(element.height)||150);surfaces.set(element,s);}if(s.width!==Number(element.width))s.width=Number(element.width)||300;if(s.height!==Number(element.height))s.height=Number(element.height)||150;return s;}
window.HTMLCanvasElement.prototype.getContext=function(){const c=surface(this).getContext('2d');return new Proxy(c,{get(target,key){if(key==='drawImage')return (image,...args)=>target.drawImage(surfaces.has(image)?surface(image):image,...args);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){Reflect.set(target,key,value,target);return true;}});};
window.HTMLElement.prototype.getBoundingClientRect=function(){return{x:0,y:0,left:0,top:0,width:1280,height:720,right:1280,bottom:720};};
window.HTMLElement.prototype.focus=function(){};
Object.defineProperty(window.HTMLInputElement.prototype,'files',{get(){return this._files;},set(v){this._files=v;},configurable:true});
let nextFrame=null,time=0;const saved=new Map();
class LocalImage extends Image{
  constructor(){super();this.listeners={};}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);if(type==='load'&&this.complete)setImmediate(()=>fn());}
  set src(value){super.src=value.startsWith('data:')?Buffer.from(value.split(',')[1],'base64'):fs.readFileSync(path.join(root,value));}
  get src(){return super.src;}
}
const sandbox={window,document,Image:LocalImage,console,Math,Date,JSON,Map,Set,Promise,Blob,URL,Uint8Array,Float32Array,performance:{now:()=>time},navigator:{userActivation:{hasBeenActive:false}},location:{hostname:'localhost',href:'http://localhost/index.html'},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>(nextFrame=fn,1),setTimeout:fn=>{return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},getComputedStyle:()=>({}),atob:v=>Buffer.from(v,'base64').toString('binary'),innerWidth:1280,innerHeight:720,devicePixelRatio:1};
window.matchMedia=()=>({matches:false,addEventListener(){}});window.innerWidth=1280;window.innerHeight=720;window.devicePixelRatio=1;window.localStorage=sandbox.localStorage;
sandbox.Node=window.Node;sandbox.Event=window.Event;
vm.createContext(sandbox);
const scripts=process.env.WILDROOT_PACKED_HTML?[...document.querySelectorAll('script')].map((s,i)=>({name:'packed-'+i,code:s.textContent})):['game-config.js','weapon-models.js','world-depth.js','world-physics.js','character-voices.js','audio-engine.js','game.js'].map(name=>({name,code:fs.readFileSync(path.join(root,name),'utf8')}));
for(const {name,code}of scripts){vm.runInContext(code,sandbox,{filename:name});if(sandbox.WildrootPhysics)window.WildrootPhysics=sandbox.WildrootPhysics;}
sandbox.__wildrootDebug=window.__wildrootDebug;
function run(code){return vm.runInContext(code,sandbox);}
function frame(){time+=16.67;const fn=nextFrame;nextFrame=null;fn?.(time);}
function shot(name){frame();fs.writeFileSync(path.join(output,name+'.png'),surface(document.getElementById('game')).toBuffer('image/png'));}
const passed=[],check=(name,value)=>{assert.ok(value,name);passed.push(name);};
(async()=>{
  await new Promise(r=>setTimeout(r,80));
  run('__wildrootDebug.startWithWeapon("rifle");__wildrootDebug.setTerrain("blackout");__wildrootDebug.freeze()');
  check('实际游戏脚本可初始化、选武器并开局',run('__wildrootDebug.snapshot().weapon==="rifle"'));
  const walk=run('__wildrootDebug.motion70(320,1060,["d"],false,24)');check('实际走路不能钻入大岩石',walk.x<389&&!walk.penetrating);
  const dash=run('__wildrootDebug.motion70(350,1060,["d"],true,12)');check('实际冲刺不能穿过岩石',dash.x<380&&!dash.penetrating);
  const push=run('__wildrootDebug.push70(369,1060,300,1060)');check('受击位移不能把人物推入岩石',push.x<380&&!push.penetrating);
  const canopy=run('__wildrootDebug.motion70(827,810,["d"],false,12)');check('角色仍可从树冠后通过',canopy.x>850&&!canopy.penetrating);
  const door=run('__wildrootDebug.motion70(1540,310,["s"],false,22)');check('角色能穿过旧城拱门门洞',door.y>370&&!door.penetrating);
  const merchant=run('__wildrootDebug.motion70(1280,860,["d"],true,12)');check('商人底座也具有碰撞',merchant.x<1330&&!merchant.penetrating);
  const station=run(`(()=>{const d=__wildrootDebug;d.setTerrain('irrigation');const o=d.physics70().solids.find(s=>s.id==='irrigation-base');return {o,result:d.motion70(o.x-65,o.y-11,['d'],true,12)};})()`);check('灌溉泵底座也具有碰撞',station.result.x<station.o.x-25&&!station.result.penetrating);run('__wildrootDebug.setTerrain("blackout")');
  const enemy=run('__wildrootDebug.enemyRoute70("boar",320,1068,540,1068,280)');check('地面敌人会沿岩石侧缘绕行',enemy.x>460&&!enemy.penetrating);
  const air=run('__wildrootDebug.enemyRoute70("wasp",320,1068,540,1068,150)');check('飞行敌人可越过地面岩石',air.x>520);
  run('__wildrootDebug.setTerrain("bridge")');
  const bridge=run('__wildrootDebug.motion70(1040,740,["d"],true,90)');check('桥面可连续通过两岸',bridge.x>1300&&!bridge.penetrating);
  const river=run('__wildrootDebug.motion70(1040,500,["d"],true,90)');check('真实冲刺不能越过桥外河道',river.x<1100&&!river.penetrating);
  run('__wildrootDebug.setTerrain("blackout")');
  for(const id of ['home','solar','ruin','crater']){run(`__wildrootDebug.viewZone('${id}')`);shot('map-'+id);}
  run('__wildrootDebug.depthScene(350,1070)');shot('rock-contact');
  run('document.querySelector("#home-pause-btn").click()');
  for(const id of ['rifle','shotgun','rail','wand','scythe']){
    run(`__wildrootDebug.startWithWeapon('${id}');__wildrootDebug.setTerrain('blackout');__wildrootDebug.fireShots(1)`);
    const before=run('__wildrootDebug.content67().weaponFx.time');run('__wildrootDebug.tick(.05)');
    check(id+' 武器可正常攻击且动作计时推进',before>0&&run('__wildrootDebug.content67().weaponFx.time')<before);
  }
  const shop=run(`(()=>{const d=__wildrootDebug;d.toRest();d.resources({coins:100,water:0,hp:40});d.offerShop(['canteen','rations']);d.purchase('canteen');d.purchase('canteen');d.purchase('rations');return d.snapshot();})()`);
  check('碰撞接入后商店交易与日限购正常',shop.water===3&&shop.hp===62);
  const growth=run('__wildrootDebug.probeRestGrowth()');check('休整继续冻结植物成长',growth.before.growth===growth.after.growth&&growth.before.wet===growth.after.wet);
  const drops=run('__wildrootDebug.mergeDrops()');check('聚合掉落价值守恒',drops.count===1&&drops.value===5);
  for(const type of ['crowboss','slimeboss','boss']){run(`__wildrootDebug.summonBoss('${type}');__wildrootDebug.castBossSkill();__wildrootDebug.tick(.04)`);check(type+' 首领可出现并释放技能',run('__wildrootDebug.snapshot().hazards')>0);}
  run('document.querySelector("#home-pause-btn").click()');
  const original=saved.get('wildroot-save');
  const input=document.getElementById('save-file');input.files=[{size:200,text:async()=>JSON.stringify({format:'wildroot-save',version:1,meta:{best:999,crystals:24,runs:3,modules:{soil:2},discoveries:{'crop:pepper':1790000000000}}})}];input.dispatchEvent(new window.Event('change'));await new Promise(r=>setTimeout(r,20));
  check('通过导入界面恢复局外存档',JSON.parse(saved.get('wildroot-save')).crystals===24&&document.getElementById('meta-crystals').textContent==='24');
  const valid=saved.get('wildroot-save');input.files=[{size:20,text:async()=>'{broken'}];input.dispatchEvent(new window.Event('change'));await new Promise(r=>setTimeout(r,20));
  check('损坏存档不会覆盖原存档',saved.get('wildroot-save')===valid);
  check('导入过滤未知字段与过大实验室等级',run('__wildrootDebug.archive70({best:0,modules:{soil:99,unknown:8},evil:true}).modules.soil===8 && !("evil" in __wildrootDebug.archive70({best:0,evil:true}))'));
  if(original)saved.set('wildroot-save',original);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed,walk,dash,push,canopy,door,enemy,air,bridge,river},null,2));console.log(JSON.stringify({passed,enemy,packed:Boolean(process.env.WILDROOT_PACKED_HTML),output},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
