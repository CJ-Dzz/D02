/* BUILD 6.9 / 细化材质、光学结构、机匣与活动部件。动态结构模型：Canvas 几何建模，同一渲染器服务于选装预览和角色握持。 */
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
      const rail=weapon==="rail",shotgun=weapon==="shotgun";
      const metal=c.createLinearGradient(0,-12,0,12);metal.addColorStop(0,"#d9dcc2");metal.addColorStop(.19,"#f3ebcb");metal.addColorStop(.30,"#879b83");metal.addColorStop(.75,"#536f60");metal.addColorStop(1,"#344f44");
      const enamel=c.createLinearGradient(0,-10,0,7);enamel.addColorStop(0,"#f0e8ca");enamel.addColorStop(.22,"#dfe0bd");enamel.addColorStop(.8,"#9eae8b");enamel.addColorStop(1,"#748e70");
      const wood=c.createLinearGradient(0,-8,0,14);wood.addColorStop(0,"#cbab76");wood.addColorStop(.48,"#ad8051");wood.addColorStop(1,"#785c3e");
      const shape=(points,fill,stroke=ink,width=.75)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
      const screw=(x,y,r=.85)=>{c.fillStyle="#354d42";c.beginPath();c.arc(x,y,r+.4,0,TAU);c.fill();c.strokeStyle="#c5ceaf";c.lineWidth=.35;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();line(x-r*.5,y+r*.3,x+r*.5,y-r*.3,"#d6d8ba",.35);};
      const plate=(x,y,w,h,fill,r=1)=>{c.strokeStyle=ink;c.lineWidth=.65;box(x,y,w,h,fill,r);};
      // 枪托、贴腮垫、握把和扳机护圈独立于上机匣，具有可读的材质接缝。
      shape([[-14,-5],[-2,-8],[5,-6],[6,4],[-10,8],[-15,5]],shotgun?wood:"#70876d");
      plate(-15,-5,2,12,"#344d40",.5);plate(-12,-6,9,4,shotgun?"#997147":"#b1ba94",1.4);
      line(-11,4,-3,1,"#d6bc894d",.6);screw(-8,1,.6);
      shape([[4,3],[13,5],[11,19],[5,20],[3,17]],"#52664e");
      shape([[5,7],[10,8],[8,17],[5,17]],shotgun?wood:"#8b9b74",null);
      for(let i=0;i<4;i++)line(5,9+i*2,9,10+i*2,"#334e39",.55);
      c.strokeStyle=ink;c.lineWidth=1.2;c.beginPath();c.moveTo(11,6);c.lineTo(20,6);c.quadraticCurveTo(20,13,13,13);c.lineTo(11,10);c.stroke();
      line(15,5,14,10,"#c8ad73",.9);
      const length=rail?49:shotgun?34:35;
      shape([[-1,-7],[3,-11],[length-4,-11],[length,-7],[length,5],[30,9],[2,8],[-2,3]],"#3a5548",ink,1);
      shape([[0,-7],[4,-11],[length-4,-11],[length,-7],[length-3,3],[1,3]],shotgun?wood:enamel);
      line(3,-9,length-5,-9,"#fff2cf",.65);line(2,5,30,5,"#9cae87",.65);
      if(shotgun){
        // 双管的钢面与暗孔，木质泵动护木上的年轮与防滑槽。
        plate(25,-8,29,5,metal,.8);plate(25,-.7,29,5,metal,.8);
        line(27,-7,51,-7,"#dfe5c8",.5);line(27,.1,51,.1,"#b7c7ae",.5);
        plate(49,-9,6,15,"#b09b68",1);plate(51,-7,5,11,"#51614c",.7);
        for(const y of [-4.4,2.4]){c.fillStyle="#1d342d";c.beginPath();c.ellipse(55.1,y,1.9,2.1,0,0,TAU);c.fill();c.strokeStyle="#d1ba80";c.lineWidth=.45;c.stroke();}
        const pump=15-cycle*8;
        plate(pump,5,21,7,wood,2);line(pump+1,5.6,pump+18,5.6,"#e3c38b",.55);
        for(let i=0;i<7;i++)line(pump+3+i*2.4,7,pump+2+i*2.4,11,"#6c563a",.5);
        c.strokeStyle="#d1b37c";c.lineWidth=.35;c.beginPath();c.moveTo(2,-5);c.bezierCurveTo(8,-7,7,1,16,0);c.stroke();
        plate(2,-7,12,8,"#786e4c",1);screw(5,-3);screw(12,-3);
        for(let i=0;i<3;i++){plate(17+i*4,-5,2.5,6,"#a96e50",.7);c.fillStyle="#dec286";c.fillRect(17+i*4,-5,2.5,1.4);}
        plate(36,-10,3,2,"#d3bc7b",.3);line(37.5,-10,37.5,-12,"#f1e1ad",.7);
      }else if(rail){
        // 中空双轨、陶瓷绝缘座与铜线圈，通过阴影与玻璃导能芯建立深度。
        plate(10,-6,38,10,"#203c34",1);
        plate(9,-10,47,2,metal,.4);plate(9,5,47,2,metal,.4);
        const core=c.createLinearGradient(0,-2,0,2);core.addColorStop(0,"#5b9886");core.addColorStop(.5,attack>.1?"#ebf5c8":"#9bceb0");core.addColorStop(1,"#487261");
        c.fillStyle=core;c.fillRect(9,-2,45,4);line(12,-1,51,-1,"#f1f5cd",.45);
        for(let i=0;i<5;i++){
          const x=13+i*8;c.strokeStyle="#425b49";c.lineWidth=1.2;c.beginPath();c.ellipse(x,-1,2.8,8,0,0,TAU);c.stroke();
          c.strokeStyle="#c1a46d";c.lineWidth=1.4;c.beginPath();c.ellipse(x-.45,-1,2.6,7.6,0,Math.PI*.6,Math.PI*1.65);c.stroke();
          plate(x-1,-10,3,2.6,"#d5d9bb",.5);plate(x-1,5,3,2.6,"#adbc96",.5);
          if(attack>.05){const a=Math.max(0,1-Math.abs(i-(1-attack)*5)/2);c.fillStyle=`rgba(231,245,190,${a*.8})`;c.fillRect(x-1,-6,1.6,10);}
        }
        shape([[51,-8],[63,-7],[66,-4],[58,-3],[58,2],[66,3],[63,7],[51,8]],metal);
        c.fillStyle="#20372e";c.fillRect(57,-2,8,3);line(62,-4,66,-4,"#c6dfb1",.7);line(62,3,66,3,"#c6dfb1",.7);
        for(let i=0;i<4;i++)plate(1+i*2,-7,1,7,"#3a5746",.2);
        plate(0,-13,10,3,"#789074",1);line(1,-12,7,-12,"#cbd6ad",.45);
        shape([[12,9],[23,8],[25,15],[15,18]],enamel);screw(17,12,.7);
      }else{
        // 种荚弹仓、观察窗、分体滑套、铣槽、光学镜片与枪口散热口。
        shape([[12,7],[25,7],[24,17],[21,20],[13,19]],enamel);
        plate(14,9,8,7,"#304e3e",.9);for(let i=0;i<3;i++)line(16,10+i*2,21,10+i*2,pose.charged?"#ebcc78":"#93be8c",.7);
        plate(8,-6,19,7,"#777853",1.6);
        const chamber=c.createLinearGradient(0,-5,0,1);chamber.addColorStop(0,"#d0e2b2");chamber.addColorStop(.42,"#719980");chamber.addColorStop(1,"#375b4b");
        plate(11-cycle*5,-5,13,5,chamber,1);
        c.fillStyle="#d2bd7a";c.beginPath();c.ellipse(17-cycle*5,-2.4,3,1.1,-.35,0,TAU);c.fill();line(13-cycle*5,-4.4,21-cycle*5,-4.4,"#e7efcc",.45);
        plate(32,-4,17,7,metal,.7);plate(37,-6,7,2,"#405c47",.4);
        for(let i=0;i<4;i++)plate(34+i*2.7,-2,1.3,3,"#243c31",.2);
        plate(46,-5,6,9,metal,.5);c.fillStyle="#1c342c";c.beginPath();c.ellipse(51.7,-.5,1.3,3.2,0,0,TAU);c.fill();line(50,-4,50,3,"#c8b079",.65);
        line(4,-12,29,-12,"#304d3e",1.8);for(let i=0;i<7;i++)line(4+i*3.4,-13,4+i*3.4,-11,"#8b9f7c",.5);
        plate(19,-16,13,5,metal,1);plate(20,-12,2,3,"#3d5742",.3);plate(29,-12,2,3,"#3d5742",.3);
        c.fillStyle="#739f8d";c.beginPath();c.ellipse(31.8,-13.6,1.5,2.2,0,0,TAU);c.fill();c.strokeStyle="#e2d59f";c.lineWidth=.6;c.stroke();
        line(3,-1,6,-1,"#b7c198",.4);screw(4,-5);screw(29,-5);screw(28,4,.6);
      }
      // 细小接缝、黄铜铆钉与磨损；近距离展示时可辨认，局内保留清楚轮廓。
      for(const [x,y]of [[1,3],[31,3]])screw(x,y,.6);
      line(2,7,8,7,"#d8c79566",.35);line(28,-8,31,-8,"#fff0bb88",.4);
      c.fillStyle="#bbc69c";c.font="2.1px sans-serif";c.textAlign="left";c.fillText(rail?"R-03":shotgun?"S-02":"P-01",1.5,2.3);
      if(attack>.74){const muzzle=rail?66:shotgun?57:53;c.save();c.translate(muzzle,0);c.fillStyle=rail?"#cfeacd":"#f1cf84";c.beginPath();c.moveTo(0,-1.5);c.lineTo(5,-4);c.lineTo(14,0);c.lineTo(5,4);c.lineTo(0,1.5);c.closePath();c.fill();c.fillStyle="#fff4cc";c.beginPath();c.ellipse(4,0,5,1.2,0,0,TAU);c.fill();c.restore();}
      if(attack>.12&&attack<.82&&!rail){c.save();c.translate(19+(1-attack)*8,-13-(1-attack)*14);c.rotate((1-attack)*5);c.strokeStyle="#765c3c";c.lineWidth=.4;plate(-2.3,-1.1,4.6,2.2,"#d0ad67",.5);c.fillStyle="#f0d394";c.fillRect(-2.3,-1.1,1,2.2);c.restore();}
      if(pose.hands){hand(5,9);hand(shotgun?22-cycle*8:29,5);}
    }
    c.restore();
  }
  window.WildrootWeapons = { draw };
})();
