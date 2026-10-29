/* BUILD 7.0 / 实体底座碰撞：脚底滑动、连续步进、出生恢复与弹道遮挡。 */
(() => {
  "use strict";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function contact(x,y,r,o) {
    if(o.shape==="ellipse") {
      const rx=o.rx+r,ry=o.ry+r,dx=x-o.x,dy=y-o.y,q=Math.hypot(dx/rx,dy/ry);
      if(q>=1)return null;
      if(q<1e-8)return {x:rx+.01,y:0};
      return {x:dx*(1/q-1)+dx/q*.0001,y:dy*(1/q-1)+dy/q*.0001};
    }
    const a=o.x,b=o.y,right=a+o.w,bottom=b+o.h,px=clamp(x,a,right),py=clamp(y,b,bottom),dx=x-px,dy=y-py,d=Math.hypot(dx,dy);
    if(d>=r)return null;
    if(d>1e-8)return {x:dx/d*(r-d+.01),y:dy/d*(r-d+.01)};
    const sides=[{d:x-a,x:a-r-.01-x,y:0},{d:right-x,x:right+r+.01-x,y:0},{d:y-b,x:0,y:b-r-.01-y},{d:bottom-y,x:0,y:bottom+r+.01-y}];
    return sides.reduce((best,side)=>side.d<best.d?side:best);
  }
  function blocked(x,y,r,obstacles){return obstacles.some(o=>contact(x,y,r,o));}
  function resolve(x,y,r,obstacles,bounds) {
    for(let pass=0;pass<10;pass++){
      let changed=false;
      for(const o of obstacles){const hit=contact(x,y,r,o);if(hit){x+=hit.x;y+=hit.y;changed=true;}}
      if(bounds){x=clamp(x,bounds.minX,bounds.maxX);y=clamp(y,bounds.minY,bounds.maxY);}
      if(!changed)break;
    }
    return {x,y};
  }
  function move(actor,dx,dy,obstacles,options={}) {
    const r=options.radius??11,offset=options.offsetY??10,bounds=options.bounds;
    let p=resolve(actor.x,actor.y+offset,r,obstacles,bounds),hit=false;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,Math.min(6,r*.5))));
    for(let i=0;i<steps;i++){
      const x=p.x+dx/steps,y=p.y+dy/steps,next=resolve(x,y,r,obstacles,bounds);
      if(Math.hypot(next.x-x,next.y-y)>.001)hit=true;
      p=next;
    }
    const result={x:p.x,y:p.y-offset,blocked:hit};actor.x=result.x;actor.y=result.y;return result;
  }
  function trace(x,y,endX,endY,r,obstacles) {
    const steps=Math.max(1,Math.ceil(Math.hypot(endX-x,endY-y)/5));
    for(let i=0;i<=steps;i++){const t=i/steps,px=x+(endX-x)*t,py=y+(endY-y)*t;for(const obstacle of obstacles)if(obstacle.blocksShots!==false&&contact(px,py,Math.max(.5,r),obstacle))return {x:px,y:py,obstacle};}
    return null;
  }
  function safePoint(x,y,r,obstacles,bounds){return resolve(x,y,r,obstacles,bounds);}
  const api={move,blocked,trace,safePoint,contact};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else globalThis.WildrootPhysics=api;
})();
