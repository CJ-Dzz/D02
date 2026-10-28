/* 动态结构模型：Canvas 几何建模，同一渲染器服务于选装预览和角色握持。 */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const ink = "#344b39", gold = "#d7b969";
  function draw(c, weapon, pose = {}) {
    const t = pose.time || 0, attack = Math.max(0, Math.min(1, pose.attack || 0));
    const kick = attack * attack, cycle = Math.sin((1 - attack) * Math.PI) * (attack > 0 ? 1 : 0);
    const box = (x,y,w,h,fill,r=2) => { c.fillStyle=fill; c.beginPath(); c.roundRect(x,y,w,h,r); c.fill(); c.stroke(); };
    const line = (x,y,a,b,color,width) => { c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke(); };
    const hand = (x,y) => { c.strokeStyle=ink;c.lineWidth=1;box(x,y,9,8,"#e8cfaa",3);line(x+3,y+1,x+3,y+5,"#b59675",.7); };
    c.save();c.lineJoin="round";c.lineCap="round";
    c.translate(8-kick*(weapon==="shotgun"?8:4),1);
    c.rotate(weapon==="scythe"?(attack>0?-.95+(1-attack)*2.1:.20):-kick*.08);
    c.strokeStyle=ink;c.lineWidth=1.3;
    if(pose.hands) line(-12,9,9,6,"#6d8161",6);
    if(weapon==="scythe") {
      line(-7,9,46,-5,ink,8);line(-7,7,46,-7,"#947348",5);line(2,5,40,-5,"#ddc486",1.4);
      for(let i=5;i<32;i+=5) line(i,4-i/4,i+1,9-i/4,"#475d42",2.5);
      c.strokeStyle=ink;c.lineWidth=1.4;c.fillStyle="#779d91";
      c.beginPath();c.moveTo(33,-9);c.bezierCurveTo(72,-37,84,-2,65,27);c.bezierCurveTo(72,0,53,-8,33,-2);c.closePath();c.fill();c.stroke();
      c.fillStyle="#e8ead3";c.beginPath();c.moveTo(35,-10);c.bezierCurveTo(71,-33,80,-3,65,27);c.bezierCurveTo(73,-6,53,-13,35,-7);c.closePath();c.fill();
      line(39,-8,54,-10,gold,2);c.fillStyle=gold;c.beginPath();c.arc(36,-4,3,0,TAU);c.fill();
      if(attack>0){c.globalAlpha=attack*.5;c.strokeStyle="#d5ead4";c.lineWidth=3;c.beginPath();c.arc(10,2,68,-.6,.55);c.stroke();c.globalAlpha=1;}
      if(pose.hands){hand(2,5);hand(22,-1);}
    } else if(weapon==="wand") {
      line(-5,4,37,-1,ink,8);line(-5,2,37,-3,"#a38557",5);line(1,1,34,-4,"#dfc98b",1.2);
      c.strokeStyle="#719963";c.lineWidth=2;c.beginPath();c.moveTo(0,5);c.bezierCurveTo(20,9,16,-10,32,-3);c.stroke();
      c.fillStyle="#94af75";c.beginPath();c.ellipse(15,0,7,3,-.65,0,TAU);c.fill();
      const orbX=47+Math.sin(t*3)*2;
      c.save();c.translate(orbX,0);c.rotate(t*.8);c.strokeStyle="#718965";c.lineWidth=2;c.beginPath();c.ellipse(0,0,14,8,0,0,TAU);c.stroke();
      for(let i=0;i<3;i++){c.rotate(TAU/3);c.fillStyle=gold;c.beginPath();c.moveTo(11,-3);c.lineTo(17,0);c.lineTo(11,4);c.closePath();c.fill();}c.restore();
      const glow=c.createRadialGradient(orbX-2,-2,0,orbX,0,9+attack*4);glow.addColorStop(0,"#fff3bb");glow.addColorStop(.5,"#a9ccb0");glow.addColorStop(1,"#638879");
      c.fillStyle=glow;c.strokeStyle=ink;c.lineWidth=1;c.beginPath();c.arc(orbX,0,8-kick*2,0,TAU);c.fill();c.stroke();
      if(pose.hands)hand(10,3);
    } else {
      box(-12,-5,18,12,"#51664e",3);box(-11,-7,14,8,"#829374",2);
      box(6,6,8,13,"#665c46",2);box(9,7,9,4,"#ba9566",1);
      const long=weapon==="rail"?51:weapon==="shotgun"?39:37;
      box(0,-6,long,17,"#495e4c",3);
      const body=c.createLinearGradient(0,-10,0,6);body.addColorStop(0,"#f2e9c9");body.addColorStop(.48,"#d1d7b4");body.addColorStop(1,"#889b79");
      box(0,-10,long,15,body,3);line(4,-8,long-4,-8,"#fff4cf",1);c.strokeStyle=ink;c.lineWidth=1;
      if(weapon==="shotgun") {
        box(28,-7,27,5,"#4a5a46",1);box(28,0,27,5,"#4a5a46",1);box(50,-8,6,14,"#b99b61",2);
        c.fillStyle="#283e34";c.fillRect(54,-6,3,3);c.fillRect(54,1,3,3);c.strokeStyle=ink;c.lineWidth=1;
        box(16-cycle*8,5,19,7,"#b18354",2);for(let i=19;i<33;i+=4)line(i-cycle*8,6,i-cycle*8,11,"#70583c",1);
        c.strokeStyle=ink;c.lineWidth=1;box(4,-6,9,9,"#ac7956",1);c.fillStyle=gold;c.beginPath();c.arc(8,-1,2,0,TAU);c.fill();
      } else if(weapon==="rail") {
        box(4,-6,41,8,"#436258",1);for(let i=9;i<47;i+=9){box(i,-11,5,17,"#9fae8c",1);line(i+1,-8,i+1,3,"#e5dcb3",1.3);c.strokeStyle=ink;c.lineWidth=1;}
        line(7,-1,48,-1,attack>.1?"#ecf7d2":"#9bc7ad",2+attack*2);c.strokeStyle=ink;c.lineWidth=1;
        box(49,-4,15,7,"#435e50",1);box(55,-5,4,9,"#c0aa69",1);c.fillStyle="#d5ebc8";c.fillRect(62,-2,3,3);
      } else {
        box(10,-6,18,9,"#af8c60",2);box(13-cycle*6,-4,10,4,"#3b5243",1);box(35,-4,15,7,"#465d49",1);box(46,-5,5,9,"#c6ad6c",1);
        box(16,6,10,9,"#7c8f6e",1);line(18,8,24,8,pose.charged?"#f4d879":"#bad4ad",2);c.strokeStyle=ink;c.lineWidth=1;
        box(21,-14,12,5,"#4a604b",1);c.fillStyle="#b8d1ab";c.fillRect(29,-13,3,2);
      }
      c.strokeStyle=ink;c.lineWidth=1;for(const x of [4,long-4]){c.fillStyle="#5b7055";c.beginPath();c.arc(x,-3,1,0,TAU);c.fill();}
      if(attack>.74){const muzzle=weapon==="rail"?65:weapon==="shotgun"?58:52;c.fillStyle=weapon==="rail"?"#cfeacd":"#f3d58d";c.beginPath();c.moveTo(muzzle,-2);c.lineTo(muzzle+7,-7);c.lineTo(muzzle+18,0);c.lineTo(muzzle+8,5);c.lineTo(muzzle,2);c.closePath();c.fill();c.fillStyle="#fff2c7";c.beginPath();c.ellipse(muzzle+5,0,6,2,0,0,TAU);c.fill();}
      if(attack>.12&&attack<.82&&weapon!=="rail"){c.save();c.translate(19+(1-attack)*8,-12-(1-attack)*14);c.rotate((1-attack)*5);c.fillStyle=gold;c.fillRect(-3,-1,6,3);c.restore();}
      if(pose.hands){hand(6,8);hand(weapon==="shotgun"?23-cycle*8:29,5);}
    }
    c.restore();
  }
  window.WildrootWeapons = { draw };
})();
