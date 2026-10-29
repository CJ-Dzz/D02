/* BUILD 7.0 / 斜俯视场景：实体底座、风化材质、接地细节与深度排序。 */
(() => {
  "use strict";
  const TAU=Math.PI*2;
  const PROPS = [
    {id:"shelter",kind:"cabin",x:992,y:628,w:112,h:100},
    {id:"home-tank",kind:"tank",x:1434,y:684,w:62,h:85},
    {id:"ruin-arch",kind:"ruin",x:1542,y:352,w:112,h:136},
    {id:"ruin-tower",kind:"tank",x:1954,y:326,w:82,h:128},
    {id:"greenhouse",kind:"glass",x:430,y:302,w:150,h:109},
    {id:"solar-crates",kind:"crates",x:786,y:483,w:70,h:62},
    {id:"willow",kind:"tree",x:1854,y:1210,w:112,h:146},
    {id:"home-tree",kind:"tree",x:827,y:872,w:106,h:142},
    {id:"west-rock",kind:"rock",x:424,y:1080,w:81,h:52},
    {id:"crater-rock",kind:"rock",x:1440,y:1277,w:70,h:48},
    {id:"west-sign",kind:"ruin",x:274,y:635,w:61,h:80}
  ];
  // 碎石与大型地标使用同一份物件数据，不能再画出没有实体的石块。
  const fields=[[1190,740],[610,390],[1770,390],[1630,1110]];
  for(let i=0;i<420;i+=21){
    const x=35+((i*83.17)%2310),y=35+((i*139.71)%1410);
    if(x<75||x>2305||y<75||y>1405||Math.abs(x-1190)<125||fields.some(([a,b])=>Math.abs(x-a)<285&&Math.abs(y-b)<235)||PROPS.some(p=>Math.hypot(p.x-x,p.y-y)<115))continue;
    PROPS.push({id:`rubble-${i}`,kind:"rock",x,y,w:32+(i%3)*5,h:23+(i%2)*4,small:true});
  }
  function colliders(){
    const result=[];
    for(const p of PROPS){
      const add=(part,shape)=>result.push({id:p.id+part,prop:p.id,blocksShots:true,...shape});
      if(p.kind==="tree")add("",{shape:"ellipse",x:p.x+3,y:p.y-3,rx:10,ry:8});
      else if(p.kind==="rock")add("",{shape:"ellipse",x:p.x+p.w*.02,y:p.y-p.h*.19,rx:p.w*.49,ry:p.h*.32});
      else if(p.kind==="ruin"&&p.w>80){for(const [part,left,width]of [["-left",-.5,.30],["-right",.17,.43]])add(part,{shape:"rect",x:p.x+p.w*left,y:p.y-29,w:p.w*width,h:33});}
      else {const w=p.kind==="tank"?p.w*.88:p.w*.98,h=p.kind==="crates"?38:p.kind==="tank"?24:32;add("",{shape:"rect",x:p.x-w*.49,y:p.y-h+4,w,h});}
    }
    return result;
  }
  const SOLIDS=colliders();
  function polygon(c,points,fill,stroke=null,width=1) {
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function line(c,x,y,a,b,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke(); }
  function terrace(c,zone,night) {
    const sizes={home:[466,318,30],solar:[506,324,25],ruin:[522,344,54],crater:[442,310,22]};
    const [w,h,depth]=sizes[zone.id],x=zone.x-w/2,y=zone.y-h/2,r=16,b=y+h;
    const stone=zone.id==="ruin",wet=zone.id==="crater";
    c.save();
    c.fillStyle="#142c2440";c.beginPath();c.roundRect(x+12,y+22,w+20,h+depth,24);c.fill();
    const side=c.createLinearGradient(0,b,0,b+depth);side.addColorStop(0,night?"#3e524b":stone?"#777d6c":"#776c48");side.addColorStop(1,night?"#263d37":stone?"#4c5d50":"#465738");
    polygon(c,[[x+r,b],[x+w-r,b],[x+w,b-r],[x+w,b+depth-r],[x+w-r,b+depth],[x+r,b+depth],[x,b+depth-r],[x,b-r]],side);
    polygon(c,[[x+w,y+r],[x+w+13,y+r+depth*.45],[x+w+13,b+depth-r],[x+w-r,b+depth],[x+w-r,b],[x+w,b-r]],night?"#30453b":stone?"#546855":"#5e6f44");
    const top=c.createLinearGradient(x,y,x+w,b);top.addColorStop(0,night?"#627361":stone?"#a2a58d":wet?"#a0ae83":"#acb087");top.addColorStop(1,night?"#506751":stone?"#86967a":wet?"#819c72":"#879b6e");
    polygon(c,[[x+r,y],[x+w-r,y],[x+w,y+r],[x+w,b-r],[x+w-r,b],[x+r,b],[x,b-r],[x,y+r]],top,night?"#9aa98b77":"#d0cf9a99",1.5);
    line(c,x+r,y+3,x+w-r,y+3,"#e4e0ac66",2);
    for(let i=0;i<Math.floor(w/48);i++) {
      const xx=x+20+i*48;
      line(c,xx,b+5,xx+4,b+depth-5,night?"#263d394d":"#344a314d",1.5);
      if(i%2===0)line(c,xx+8,b+depth*.53,xx+35,b+depth*.53,"#b0ad7350",1);
    }
    if(!stone)for(let i=0;i<12;i++){
      const xx=x+26+(i*41)%(w-50);c.strokeStyle=night?"#456247":"#73905a";c.lineWidth=1.5;
      c.beginPath();c.moveTo(xx,b+1);c.quadraticCurveTo(xx-4,b+depth*.6,xx+4,b+depth-3);c.stroke();
      c.fillStyle=night?"#6b8459":"#9cb877";c.beginPath();c.ellipse(xx+2,b+depth*.55,4,2,-.5,0,TAU);c.fill();
    }
    // 台地接近南侧的坡道留出一条视觉通路，顶面坐标与战斗坐标保持一致。
    const rampX=zone.x-37;
    polygon(c,[[rampX,b-12],[rampX+74,b-12],[rampX+83,b+depth+14],[rampX-9,b+depth+14]],night?"#8a9573":"#c3bc8d","#64764e",1);
    for(let i=0;i<6;i++){const yy=b-9+i*(depth+20)/6;line(c,rampX-i,yy,rampX+74+i,yy,night?"#5b7159":"#938e62",1.8);}
    if(stone) {
      for(let row=0;row<4;row++)for(let col=0;col<8;col++){const xx=x+20+col*60+(row%2)*9,yy=y+22+row*77;line(c,xx,yy,xx+35,yy+2,"#3a5a4240",1);}
    }else {
      for(let i=0;i<22;i++){const xx=x+22+(i*83)%(w-44),yy=y+18+(i*53)%(h-36);c.fillStyle=wet?"#ccdaaf33":"#e1ddaa22";c.beginPath();c.ellipse(xx,yy,12+i%4*6,3+i%3,0,0,TAU);c.fill();}
    }
    c.restore();
  }
  function ground(c,{zones,night,time,variant,bridge}) {
    c.save();
    // 柔和移动云影与成组岩脊，让平面草地具有大尺度起伏。
    for(let i=0;i<5;i++) {
      const x=260+i*430+Math.sin(time*.035+i)*55,y=225+(i*263)%1010;
      const shadow=c.createRadialGradient(x,y,15,x,y,240);shadow.addColorStop(0,"#274c3520");shadow.addColorStop(1,"#274c3500");c.fillStyle=shadow;c.fillRect(x-245,y-245,490,490);
    }
    for(const zone of zones)terrace(c,zone,night);
    // 湿地栈道：顶面、横梁、木桩投影和相连桥板。
    const cx=zones.find((z)=>z.id==="crater");
    const pathY=cx.y+112;
    polygon(c,[[cx.x-190,pathY],[cx.x+184,pathY-26],[cx.x+185,pathY+1],[cx.x-191,pathY+27]],night?"#546953":"#9c966b","#596d47",2);
    polygon(c,[[cx.x-191,pathY+27],[cx.x+185,pathY+1],[cx.x+185,pathY+11],[cx.x-191,pathY+37]],"#4b6245");
    for(let i=0;i<24;i++){const xx=cx.x-184+i*15,yy=pathY-(xx-(cx.x-190))*.068;line(c,xx,yy,xx,yy+26,"#555f3c99",1);}
    if(bridge)river(c,night,time);
    c.restore();
  }
  function river(c,night,t) {
    const segments=[[0,180],[330,660],[820,1140],[1300,1480]];
    for(const [top,bottom] of segments){
      c.fillStyle=night?"#193940":"#355e60";c.fillRect(1110,top,160,bottom-top);
      const water=c.createLinearGradient(1110,0,1270,0);water.addColorStop(0,"#264a4a");water.addColorStop(.4,night?"#42656a":"#789d8f");water.addColorStop(1,"#426e69");c.fillStyle=water;c.fillRect(1125,top,130,bottom-top);
      c.fillStyle=night?"#374f43":"#6b7550";c.fillRect(1109,top,17,bottom-top);
      c.fillStyle=night?"#4d6353":"#a0a173";c.fillRect(1260,top,12,bottom-top);
      line(c,1108,top,1108,bottom,"#c8c69a",3);line(c,1273,top,1273,bottom,"#d2cda1aa",2);
      for(let yy=top+12;yy<bottom;yy+=39){line(c,1111,yy,1124,yy+8,"#344d35",1.5);line(c,1260,yy+13,1272,yy+5,"#435c3f",1);}
      c.save();c.beginPath();c.rect(1127,top,132,bottom-top);c.clip();
      for(let i=0;i<8;i++){const yy=top+((i*61+t*12)%(bottom-top));line(c,1142+i%3*29,yy,1170+i%3*29,yy-3,"#c4d7bc4d",1.3);}c.restore();
    }
    for(const [top,bottom] of [[180,330],[660,820],[1140,1300]]){
      polygon(c,[[1103,top+4],[1277,top+4],[1277,bottom+13],[1103,bottom+13]],"#263f3460");
      polygon(c,[[1100,top],[1280,top],[1280,bottom],[1100,bottom]],night?"#677256":"#b59b6b","#4c6244",2);
      c.fillStyle="#4a5d3f";c.fillRect(1100,bottom,180,12);c.fillStyle="#d2bb85";c.fillRect(1100,bottom,180,3);
      for(let xx=1106;xx<1280;xx+=16){line(c,xx,top+2,xx,bottom-2,"#655e3e",1.5);line(c,xx+2,top+3,xx+2,bottom-3,"#e6ce9650",1);}
      for(const xx of [1104,1275])for(const yy of [top+8,bottom-8]){c.fillStyle="#384e36";c.fillRect(xx-3,yy-16,6,21);c.fillStyle="#d7c287";c.beginPath();c.ellipse(xx,yy-16,5,3,0,0,TAU);c.fill();}
    }
  }
  function prop(c,p,{night,time,actors=[]}) {
    const obscures=actors.some((a)=>Math.abs(a.x-p.x)<p.w*.57&&a.y<p.y+13&&a.y>p.y-p.h-30);
    c.save();c.translate(p.x,p.y);c.globalAlpha=obscures?.33:1;
    c.fillStyle="#15382b35";c.beginPath();c.ellipse(12,7,p.w*.62,p.small?7:16,0,0,TAU);c.fill();
    // 深色接触阴影仅贴住实体底座，冠层、屋顶的投影不能误导通行判断。
    c.fillStyle="#1c352e66";c.beginPath();c.ellipse(1,-1,p.kind==="tree"?13:p.w*.47,p.kind==="tree"?6:p.small?5:9,0,0,TAU);c.fill();
    const ink=night?"#203b34":"#3b563e",light=night?"#87957c":"#c6c29a",mid=night?"#4b6351":"#8a9c70",dark=night?"#304b40":"#566f4f";
    if(p.kind==="cabin"||p.kind==="glass"){
      const glass=p.kind==="glass",w=p.w,h=p.h;
      polygon(c,[[-w*.5,-h*.64],[w*.25,-h*.64],[w*.25,0],[-w*.5,-10]],glass?"#9bbc9a7d":mid,ink,2);
      polygon(c,[[w*.25,-h*.64],[w*.53,-h*.48],[w*.53,-12],[w*.25,0]],glass?"#6b94846b":dark,ink,2);
      polygon(c,[[-w*.58,-h*.64],[-w*.15,-h],[w*.62,-h*.77],[w*.25,-h*.56]],glass?"#c3d6b38c":"#4c7157",ink,2);
      polygon(c,[[-w*.15,-h],[w*.62,-h*.77],[w*.62,-h*.59],[w*.25,-h*.56]],glass?"#a0c3a274":"#365b48",ink,2);
      for(let i=0;i<4;i++){const x=-w*.43+i*w*.16;line(c,x,-h*.6,x,-14,light,2);line(c,x,-h*.7,x+w*.32,-h*.94,light,1.5);}
      line(c,-w*.5,-h*.34,w*.25,-h*.28,light,2);
      if(!glass){c.fillStyle="#294d3e";c.fillRect(-9,-h*.46,24,h*.43);c.fillStyle=night?"#e6cc7b":"#b6c8a2";c.fillRect(-w*.38,-h*.52,21,23);c.fillStyle="#dac28d";c.fillRect(8,-18,3,3);}
      c.fillStyle="#b2a273";c.fillRect(-w*.5,-11,w*.76,9);
      for(let i=0;i<5;i++)line(c,-w*.45+i*w*.13,-h*.68,-w*.16+i*w*.14,-h*.91,"#e7dfad40",1);
      if(!glass){line(c,-w*.5,-h*.19,w*.25,-h*.14,"#d4c99855",1);c.fillStyle="#e1cb87";c.beginPath();c.arc(w*.19,-h*.44,3,0,TAU);c.fill();}
      // 玻璃窗分格、门铰链、屋檐排水与黄铜固定件。
      for(let i=0;i<4;i++){const xx=-w*.43+i*w*.16;line(c,xx,-h*.61,xx+w*.10,-h*.43,glass?"#ecf2d069":"#a9ba8055",1);c.fillStyle="#d8c48e";c.beginPath();c.arc(xx,-h*.34,1.4,0,TAU);c.fill();}
      line(c,-w*.5,-h*.61,w*.25,-h*.54,ink,2.7);
      if(glass){for(let i=0;i<3;i++){const xx=-w*.37+i*w*.2;c.fillStyle="#576c44";c.fillRect(xx,-17,w*.13,7);line(c,xx+w*.06,-17,xx+w*.06,-29,"#b6cc8d",1.6);}}
      else {line(c,-7,-h*.40,-7,-h*.35,"#d6c18a",2);line(c,-7,-h*.17,-7,-h*.12,"#d6c18a",2);c.fillStyle="#d7ce9c";c.fillRect(-w*.34,-h*.76,17,3);}
    }else if(p.kind==="tank"){
      const w=p.w,h=p.h;
      for(const x of [-w*.33,w*.33]){line(c,x,0,x,-h*.37,ink,5);line(c,x,1,x+20,10,"#183c2b33",4);}
      const shell=c.createLinearGradient(-w/2,0,w/2,0);shell.addColorStop(0,dark);shell.addColorStop(.36,light);shell.addColorStop(1,mid);
      c.fillStyle=shell;c.beginPath();c.roundRect(-w/2,-h,w,h*.73,w*.2);c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();
      c.fillStyle=light;c.beginPath();c.ellipse(0,-h+5,w/2,10,0,0,TAU);c.fill();c.stroke();
      for(const y of [-h*.75,-h*.4]){line(c,-w/2+2,y,w/2-2,y,ink,3);line(c,-w/2+2,y-2,w/2-2,y-2,"#ddd2a085",1);}
      c.strokeStyle="#b6ba8f";c.lineWidth=3;c.beginPath();c.moveTo(w*.4,-h*.5);c.lineTo(w*.65,-h*.5);c.lineTo(w*.65,-12);c.stroke();
      c.fillStyle="#355d54";c.fillRect(-w*.29,-h*.63,7,h*.24);c.fillStyle="#a4cdc0";c.fillRect(-w*.27,-h*.58,3,h*.18);
      for(let i=0;i<3;i++)line(c,-w*.37,-h*.58+i*7,-w*.27,-h*.58+i*7,"#ddd8ab",1);
      c.fillStyle="#beaa74";c.beginPath();c.arc(w*.62,-h*.43,5,0,TAU);c.fill();line(c,w*.62-3,-h*.43,w*.62+3,-h*.43,ink,1);
      for(let i=0;i<5;i++){const yy=-h*.87+i*h*.13;line(c,w*.17,yy,w*.42,yy,"#3b574660",1);c.fillStyle="#d1c38e";c.beginPath();c.arc(-w*.34,yy,1.2,0,TAU);c.fill();}
      c.fillStyle="#e0cf98";c.beginPath();c.roundRect(-w*.12,-h*.59,w*.29,h*.11,2);c.fill();line(c,-w*.07,-h*.55,w*.1,-h*.55,ink,1);
    }else if(p.kind==="ruin"){
      const w=p.w,h=p.h;
      polygon(c,[[-w/2,0],[-w/2,-h*.8],[-w*.3,-h],[-w*.1,-h*.86],[w*.1,-h*.93],[w*.4,-h*.69],[w*.4,0]],mid,ink,2);
      polygon(c,[[w*.4,0],[w*.4,-h*.69],[w*.6,-h*.64],[w*.6,-8]],dark,ink,1.5);
      for(let i=1;i<6;i++){const yy=-i*h*.14;line(c,-w/2+2,yy,w*.38,yy,"#536c4f",2);line(c,-w*.26+(i%2)*w*.3,yy,-w*.26+(i%2)*w*.3,yy+h*.13,"#536c4f",1);}
      c.fillStyle=night?"#273e34":"#334f38";c.beginPath();c.roundRect(-w*.2,-h*.62,w*.36,h*.65,[18,18,0,0]);c.fill();
      c.strokeStyle="#a4b775";c.lineWidth=2;c.beginPath();c.moveTo(-w*.41,-h*.73);c.bezierCurveTo(0,-h*.4,-w*.4,-h*.2,-w*.28,-8);c.stroke();
      for(let i=0;i<7;i++){const xx=-w*.33+Math.sin(i)*8,yy=-h*.7+i*h*.09;c.fillStyle=i%2?"#7d9c65":"#acc080";c.beginPath();c.ellipse(xx,yy,6,3,i%2?-.7:.7,0,TAU);c.fill();}
      for(let i=0;i<8;i++){const xx=-w*.44+(i*19)%(w*.78),yy=-h*.82+(i*31)%(h*.68);line(c,xx,yy,xx+7,yy+4,"#ccd0aa66",1);}
      line(c,-w*.48,-h*.18,-w*.34,-h*.11,ink,1);line(c,-w*.34,-h*.11,-w*.40,-5,ink,1);
    }else if(p.kind==="tree"){
      const sway=Math.sin(time*.7+p.x)*2;
      polygon(c,[[-7,1],[-4,-p.h*.6],[7,-p.h*.7],[13,-2]],"#766c48",ink,1);
      const lobes=[[-.27,-.52,.31,.24],[.25,-.56,.33,.26],[-.15,-.78,.34,.25],[.18,-.83,.27,.23],[0,-.99,.27,.22]];
      for(let i=0;i<lobes.length;i++){const [x,y,rx,ry]=lobes[i];c.fillStyle=["#4e7b59","#608865","#729466","#83a16e","#91ad77"][i];c.strokeStyle=ink;c.lineWidth=1.1;c.beginPath();c.ellipse(x*p.w+sway,y*p.h,rx*p.w,ry*p.h,-.08,0,TAU);c.fill();c.stroke();}
      for(let i=0;i<21;i++){const x=sway+Math.sin(i*2.4)*p.w*.4,y=-p.h*.55-(i*17)%(p.h*.55);c.fillStyle=i%5?"#ccda9f35":"#e0c587";c.beginPath();c.ellipse(x,y,i%5?5:2.5,i%5?2:3,-.5,0,TAU);c.fill();}
      line(c,2,-p.h*.21,4,-p.h*.35,"#b9a170",2);
      for(const [x,y]of [[-13,2],[15,3],[-19,-3]]){line(c,3,-p.h*.19,x,y,"#7b704d",3);line(c,3,-p.h*.19,x,y,"#baa47966",1);}
    }else if(p.kind==="crates"){
      for(const [x,y] of [[-20,0],[19,-9],[-8,-26]]){
        polygon(c,[[x-18,y-22],[x+12,y-22],[x+12,y],[x-18,y]],"#ae9664",ink,1.5);
        polygon(c,[[x+12,y-22],[x+24,y-30],[x+24,y-7],[x+12,y]],"#6e8052",ink,1);
        polygon(c,[[x-18,y-22],[x-7,y-30],[x+24,y-30],[x+12,y-22]],"#c6b37e",ink,1);
        line(c,x-15,y-19,x+8,y-3,"#d4bf8c",2);
        line(c,x-15,y-6,x+8,y-18,"#766548",1.3);for(const xx of [x-13,x+8])for(const yy of [y-18,y-4]){c.fillStyle="#40543b";c.beginPath();c.arc(xx,yy,1.1,0,TAU);c.fill();}
      }
    }else{
      polygon(c,[[-p.w*.5,-6],[-p.w*.38,-p.h*.75],[-p.w*.05,-p.h],[p.w*.4,-p.h*.8],[p.w*.55,-8],[p.w*.1,4]],mid,ink,1.5);
      polygon(c,[[-p.w*.38,-p.h*.75],[-p.w*.05,-p.h],[p.w*.4,-p.h*.8],[p.w*.08,-p.h*.5]],light);
      polygon(c,[[p.w*.08,-p.h*.5],[p.w*.4,-p.h*.8],[p.w*.55,-8],[p.w*.1,4]],dark);
      line(c,-p.w*.34,-p.h*.69,p.w*.02,-p.h*.51,"#e0d9b877",1.2);
      line(c,p.w*.10,-p.h*.47,p.w*.23,-p.h*.30,ink,1);line(c,p.w*.23,-p.h*.30,p.w*.15,-p.h*.15,ink,1);
      for(let i=0;i<7;i++){const x=-p.w*.35+(i*17)%(p.w*.7),y=-p.h*.15+(i%3)*2;c.fillStyle=i%2?"#648358":"#8da16a";c.beginPath();c.ellipse(x,y,p.small?2.5:4,p.small?1.3:2,-.3,0,TAU);c.fill();}
      if(!p.small){for(let i=0;i<3;i++){const x=-p.w*.44+i*10;line(c,x,3,x-3,-4,"#a7b37d",1.3);}}
    }
    c.restore();return obscures;
  }
  window.WildrootDepth={ground,river,prop,props:PROPS,solids:SOLIDS,terrace};
})();
