// 连续碰撞、脚底通行空间、地图可达性与弹道遮挡。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const physics=require('../world-physics.js');const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../world-depth.js'),'utf8'),sandbox);
const depth=sandbox.window.WildrootDepth,solids=depth.solids,passed=[];
const check=(name,value)=>{assert.ok(value,name);passed.push(name);};
const rock=solids.find(o=>o.id==='west-rock');
for(const [dx,dy]of [[350,0],[-350,0],[0,350],[0,-350]]){
  const a={x:rock.x-Math.sign(dx)*120,y:rock.y-Math.sign(dy)*90};
  physics.move(a,dx,dy,[rock],{radius:11,offsetY:0});
  check(`高速位移 ${dx},${dy} 不穿过岩石`,!physics.blocked(a.x,a.y,11,[rock])&&(dx?Math.sign(a.x-rock.x)===-Math.sign(dx):Math.sign(a.y-rock.y)===-Math.sign(dy)));
}
const wall={shape:'rect',x:100,y:40,w:60,h:150},slider={x:80,y:70};physics.move(slider,60,80,[wall],{radius:10,offsetY:0});
check('斜向推墙保留沿墙移动',slider.x<=90.1&&slider.y>145);
const escaped=physics.safePoint(rock.x,rock.y,11,solids);check('出生或切地形后从实体中安全恢复',!physics.blocked(escaped.x,escaped.y,11,solids));
const tree=depth.props.find(p=>p.id==='home-tree');check('树冠后方可通行，树干底座不可穿过',!physics.blocked(tree.x,tree.y-55,11,solids)&&physics.blocked(tree.x,tree.y-3,11,solids));
const arch=depth.props.find(p=>p.id==='ruin-arch');check('拱门中间保留可通行门洞',!physics.blocked(arch.x-2,arch.y-12,11,solids));
check('看得见的碎石都有实体数据',depth.props.filter(p=>p.kind==='rock').every(p=>solids.some(o=>o.prop===p.id)));
check('岩石对高速弹道形成遮挡',Boolean(physics.trace(rock.x-100,rock.y,rock.x+100,rock.y,3,solids)));
const river=[[0,180],[330,660],[820,1140],[1300,1480]].map(([top,bottom])=>({shape:'rect',x:1110,y:top,w:160,h:bottom-top,blocksShots:false}));
const all=[...solids,...river],cross={x:1060,y:740};physics.move(cross,280,0,all,{radius:11,offsetY:11});check('桥面保持东西通行',cross.x>1280);
const gap={x:1060,y:500};physics.move(gap,280,0,all,{radius:11,offsetY:11});check('冲刺不能跨越桥外河道',gap.x<1110&&!physics.blocked(gap.x,gap.y+11,11,all));
check('河道不阻挡空中弹道',!physics.trace(1080,500,1300,500,2,river));
// 20 像素采样检查四个农区、地标邻近处以及商人位置连通；防止修复碰撞后封死农区。
for(const [name,obstacles]of [['普通地形',solids],['断桥地形',all]]){
  const step=20,cols=119,rows=74,seen=new Set(),queue=[[52,36]];
  const free=(x,y)=>x>0&&x<cols-1&&y>0&&y<rows-1&&!physics.blocked(x*step,y*step,11,obstacles);
  for(let index=0;index<queue.length;index++){
    const [x,y]=queue[index],key=y*cols+x;if(seen.has(key)||!free(x,y))continue;seen.add(key);
    for(const [a,b]of [[1,0],[-1,0],[0,1],[0,-1]])if(!seen.has((y+b)*cols+x+a)&&free(x+a,y+b))queue.push([x+a,y+b]);
  }
  for(const [id,x,y]of [['home',1190,740],['solar',610,390],['ruin',1770,390],['crater',1630,1110],['merchant',1345,858]]){
    const reachable=queue.some(([a,b])=>seen.has(b*cols+a)&&Math.hypot(a*step-x,b*step-y)<70);
    check(`${name} ${id} 有可达交互区域`,reachable);
  }
}
console.log(JSON.stringify({passed,props:depth.props.length,colliders:solids.length},null,2));
