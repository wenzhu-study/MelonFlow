/* Gloss and refraction follow the live spring outline, so squeezed fruit stays shiny. */
window.FruitArt = (() => {
  const fruits = [
    {name:'小樱桃', short:'樱桃', r:19, color:'#ff7195', light:'#ffc9dc', dark:'#e74479'},
    {name:'小草莓', short:'草莓', r:25, color:'#ff87a7', light:'#ffd7e4', dark:'#ec5f8b'},
    {name:'葡萄啵啵', short:'葡萄', r:31, color:'#b895f4', light:'#e7d6ff', dark:'#9863df'},
    {name:'元气橘橘', short:'橘子', r:38, color:'#ffc263', light:'#ffeab2', dark:'#eda13c'},
    {name:'柠檬团子', short:'柠檬', r:45, color:'#ffe478', light:'#fff8bf', dark:'#ecc849'},
    {name:'蜜桃屁屁', short:'蜜桃', r:53, color:'#ffadc5', light:'#ffe5ee', dark:'#ed84a7'},
    {name:'番茄小红', short:'番茄', r:62, color:'#ff9094', light:'#ffd2d0', dark:'#eb626d'},
    {name:'一颗小梨', short:'雪梨', r:72, color:'#d5ed9e', light:'#f4ffcf', dark:'#b1ce72'},
    {name:'椰椰宝宝', short:'椰子', r:83, color:'#f4e8cf', light:'#fffdf2', dark:'#cbb896'},
    {name:'蜜瓜同学', short:'蜜瓜', r:96, color:'#c5e7a0', light:'#efffd5', dark:'#9bca78'},
    {name:'大西瓜！', short:'西瓜', r:112, color:'#a1e29b', light:'#dfffcb', dark:'#68b977'},
  ];
  const TAU = Math.PI * 2;
  function ellipse(c,x,y,rx,ry,fill,rotation=0){
    c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);
    if(fill){c.fillStyle=fill;c.fill();}
  }
  function path(c,points){
    c.beginPath();
    for(let i=0;i<points.length;i++){
      const p=points[i],n=points[(i+1)%points.length],mx=(p.x+n.x)/2,my=(p.y+n.y)/2;
      if(!i)c.moveTo(mx,my);else c.quadraticCurveTo(p.x,p.y,mx,my);
    }
    const p=points[0],n=points[1];c.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);c.closePath();
  }
  function leaf(c,x,y,size,rotation){
    c.save();c.translate(x,y);c.rotate(rotation);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-size*.1,-size*.66,size*.56,-size*.94,size,-size*.61);
    c.bezierCurveTo(size*.91,-size*.07,size*.37,size*.2,0,0);
    const g=c.createLinearGradient(0,-size*.7,size*.5,size*.2);
    g.addColorStop(0,'#d1f1a4');g.addColorStop(.35,'#92cf76');g.addColorStop(1,'#4e9a52');
    c.fillStyle=g;c.fill();c.strokeStyle='#5c9f5966';c.lineWidth=Math.max(.7,size*.018);c.stroke();
    c.beginPath();c.moveTo(size*.06,-size*.02);c.quadraticCurveTo(size*.45,-size*.22,size*.9,-size*.58);
    c.strokeStyle='#f2ffcfb3';c.lineWidth=Math.max(.6,size*.025);c.stroke();
    c.beginPath();c.moveTo(size*.39,-size*.2);c.lineTo(size*.29,-size*.43);
    c.moveTo(size*.6,-size*.35);c.lineTo(size*.79,-size*.24);c.strokeStyle='#e3fdb46b';c.lineWidth=Math.max(.5,size*.012);c.stroke();
    ellipse(c,size*.49,-size*.5,size*.19,size*.055,'#fff8',-.45);c.restore();
  }
  function outline(type,r,time){
    const points=[];
    for(let i=0;i<40;i++){
      const a=i/40*TAU;
      let scale=1+Math.sin(a*3+time)*.009;
      if(type===1)scale*=1-.12*Math.sin(a);
      if(type===4)scale*=1+.055*Math.cos(a*2);
      if(type===5)scale*=1-.025*Math.cos(a*2)+.025*Math.sin(a*3);
      if(type===7)scale*=1+.09*Math.sin(a);
      points.push({x:Math.cos(a)*r*scale,y:Math.sin(a)*r*scale});
    }
    return points;
  }
  function contourHighlight(c,points,start,end,inset,width,color){
    const n=points.length;c.beginPath();
    for(let step=0;step<=30;step++){
      const index=((start+(end-start)*step/30)/TAU*n+n*4)%n;
      const i=Math.floor(index),t=index-i,a=points[i],b=points[(i+1)%n];
      const x=(a.x+(b.x-a.x)*t)*inset,y=(a.y+(b.y-a.y)*t)*inset;
      if(!step)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.lineWidth=width;c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.stroke();
  }
  function draw(c,type,x,y,r,options={}){
    const f=fruits[type],time=options.time||0,pts=options.points||outline(type,r,time);
    c.save();c.translate(x,y);c.rotate(options.angle||0);
    c.shadowColor=options.noShadow?'transparent':f.dark+'38';c.shadowBlur=r*.18;c.shadowOffsetY=r*.09;
    path(c,pts);
    const body=c.createRadialGradient(-r*.34,-r*.45,r*.03,r*.02,r*.08,r*1.15);
    body.addColorStop(0,f.light);body.addColorStop(.44,f.color);body.addColorStop(.77,f.color);body.addColorStop(.95,f.light);body.addColorStop(1,f.dark);
    c.fillStyle=body;c.fill();c.shadowColor='transparent';
    c.lineWidth=Math.max(1,r*.018);c.strokeStyle=f.dark+'77';c.stroke();
    c.save();path(c,pts);c.clip();
    if(type===10){
      for(let k=-2;k<=2;k++){
        const offset=k*r*.36,w=r*(.055+(.025*(2-Math.abs(k))));
        c.beginPath();c.moveTo(offset*.7-w*.3,-r*1.1);
        c.bezierCurveTo(offset-r*.2-w,-r*.55,offset+r*.2-w,-r*.3,offset-w,r*.02);
        c.bezierCurveTo(offset-r*.19-w,r*.43,offset+r*.16-w,r*.67,offset*.75-w*.2,r*1.05);
        c.lineTo(offset*.75+w*.2,r*1.05);
        c.bezierCurveTo(offset+r*.16+w,r*.67,offset-r*.19+w,r*.43,offset+w,r*.02);
        c.bezierCurveTo(offset+r*.2+w,-r*.3,offset-r*.2+w,-r*.55,offset*.7+w*.3,-r*1.1);
        const stripe=c.createLinearGradient(-r,-r,r,r);stripe.addColorStop(0,'#8bd47c55');stripe.addColorStop(.55,'#55ae6b8a');stripe.addColorStop(1,'#5eab7955');
        c.fillStyle=stripe;c.fill();
      }
    }
    if(type===9){
      c.lineWidth=Math.max(.8,r*.011);c.strokeStyle='#fcffe2a1';
      for(let k=-4;k<=4;k++){
        c.beginPath();c.moveTo(-r*1.1,k*r*.35-r*.7);c.lineTo(r*1.1,k*r*.35+r*.7);c.stroke();
        c.beginPath();c.moveTo(-r*1.1,k*r*.35+r*.7);c.lineTo(r*1.1,k*r*.35-r*.7);c.stroke();
      }
    }
    if(type===2){
      for(let k=0;k<6;k++){
        const a=k*TAU/6,px=Math.cos(a)*r*.69,py=Math.sin(a)*r*.63;
        const g=c.createRadialGradient(px-r*.04,py-r*.08,0,px,py,r*.31);
        g.addColorStop(0,'#f5e8ff66');g.addColorStop(1,'#e9d1ff00');ellipse(c,px,py,r*.31,r*.3,g);
      }
    }
    if(type===8){
      c.strokeStyle='#bba47c38';c.lineWidth=r*.012;
      for(let k=-3;k<=3;k++){c.beginPath();c.moveTo(k*r*.25,-r);c.quadraticCurveTo(k*r*.43,0,k*r*.25,r);c.stroke();}
      const milk=c.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*.85);milk.addColorStop(0,'#ffffffdb');milk.addColorStop(1,'#fff8e977');
      ellipse(c,0,-r*.07,r*.78,r*.75,milk);
    }
    if(type===1){
      for(let row=0;row<4;row++)for(let col=0;col<4;col++){
        const px=(col-1.5)*r*.39+(row%2)*r*.14,py=(row-1.5)*r*.37;
        if(Math.abs(px)<r*.72&&!(Math.abs(px)<r*.56&&py>-r*.2&&py<r*.5)){
          ellipse(c,px,py,r*.026,r*.056,'#d9547a55',-.3);ellipse(c,px-r*.01,py-r*.014,r*.018,r*.038,'#fff4cbea',-.3);
        }
      }
    }
    if([3,4,7].includes(type))for(let k=0;k<14;k++){
      const a=k*2.4,rr=(.57+(k%4)*.07)*r;ellipse(c,Math.cos(a)*rr,Math.sin(a)*rr,r*.012,r*.014,f.dark+'4d');
    }
    if(type===5){c.beginPath();c.moveTo(0,-r*.93);c.bezierCurveTo(-r*.14,-r*.62,-r*.05,-r*.5,0,-r*.29);c.strokeStyle='#e98aa66b';c.lineWidth=r*.024;c.stroke();}
    const light=c.createRadialGradient(-r*.38,-r*.52,0,-r*.2,-r*.4,r*.8);
    light.addColorStop(0,'#ffffff6e');light.addColorStop(.45,'#ffffff22');light.addColorStop(1,'#ffffff00');
    ellipse(c,-r*.2,-r*.4,r*.85,r*.65,light,-.3);
    const glow=c.createRadialGradient(r*.22,r*.64,0,r*.14,r*.55,r*.64);
    glow.addColorStop(0,f.light+'be');glow.addColorStop(.5,f.light+'48');glow.addColorStop(1,f.light+'00');
    ellipse(c,r*.12,r*.62,r*.85,r*.55,glow);
    path(c,pts.map(p=>({x:p.x*.965,y:p.y*.965})));c.strokeStyle='#ffffff9c';c.lineWidth=Math.max(1.2,r*.027);c.stroke();
    contourHighlight(c,pts,-2.93,-1.86,.9,Math.max(1.4,r*.035),'#ffffffdb');
    contourHighlight(c,pts,-.43,.42,.89,Math.max(1.2,r*.032),'#ffffffa8');
    contourHighlight(c,pts,.76,1.61,.89,Math.max(1.6,r*.048),'#ffffffe6');
    contourHighlight(c,pts,1.78,2.44,.94,Math.max(.8,r*.021),'#ffffffab');
    ellipse(c,-r*.38,-r*.57,r*.17,r*.088,'#ffffffed',-.64);
    ellipse(c,-r*.61,-r*.3,r*.048,r*.073,'#ffffffc9',.3);
    ellipse(c,r*.65,-r*.18,r*.025,r*.044,'#ffffffb3',-.3);
    ellipse(c,r*.48,r*.58,r*.07,r*.026,'#ffffffa8',-.7);
    c.restore();
    const top=Math.min(...pts.map(p=>p.y));
    if([0,2,3,5,7,9,10].includes(type)){
      c.strokeStyle='#75a05b';c.lineWidth=Math.max(1.3,r*.042);c.lineCap='round';
      c.beginPath();c.moveTo(0,top+r*.08);c.quadraticCurveTo(-r*.07,top-r*.12,r*.07,top-r*.18);c.stroke();
      leaf(c,r*.015,top+r*.005,r*(type===10?.4:.37),-.3);
      if(type===5||type===10)leaf(c,-r*.02,top+r*.02,r*.3,-2.17);
    }
    if(type===1||type===6)for(let i=0;i<3;i++)leaf(c,0,top+r*.12,r*(type===6?.36:.28),(i-1)*1.12-.48);
    const faceY=r*.22,eyeGap=r*.24,eyeR=Math.max(1.35,r*.045);
    for(const side of [-1,1]){
      const cheek=c.createRadialGradient(side*r*.4,faceY+r*.105,0,side*r*.4,faceY+r*.105,r*.15);
      cheek.addColorStop(0,type===10?'#ffad9fb5':'#f980a188');cheek.addColorStop(1,'#ffb0c000');
      ellipse(c,side*r*.4,faceY+r*.105,r*.16,r*.105,cheek);
    }
    const blink=Math.sin(time*1.9+type*7)>.998;
    c.strokeStyle='#533e40';c.lineWidth=Math.max(1.2,r*.024);c.lineCap='round';
    for(const side of [-1,1]){
      if(options.wink&&side===1){c.beginPath();c.moveTo(eyeGap+eyeR,faceY-eyeR);c.lineTo(eyeGap-eyeR*.5,faceY);c.lineTo(eyeGap+eyeR,faceY+eyeR*.6);c.stroke();}
      else if(blink||options.happy){c.beginPath();c.arc(side*eyeGap,faceY+eyeR*.4,eyeR*1.1,Math.PI*1.12,Math.PI*1.88);c.stroke();}
      else{
        const eye=c.createLinearGradient(0,faceY-eyeR,0,faceY+eyeR);eye.addColorStop(0,'#775158');eye.addColorStop(1,'#3f353c');
        ellipse(c,side*eyeGap,faceY,eyeR,eyeR*1.28,eye);
        ellipse(c,side*eyeGap-eyeR*.23,faceY-eyeR*.4,eyeR*.35,eyeR*.33,'#fff');
        ellipse(c,side*eyeGap+eyeR*.3,faceY+eyeR*.42,eyeR*.15,eyeR*.14,'#ffcfdcc2');
      }
    }
    c.beginPath();c.moveTo(-r*.068,faceY+r*.09);c.bezierCurveTo(-r*.045,faceY+r*.19,r*.045,faceY+r*.19,r*.068,faceY+r*.09);c.stroke();
    c.restore();
  }
  function icon(canvas,type,radius){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    draw(c,type,canvas.width/2,canvas.height*.55,radius||Math.min(canvas.width,canvas.height)*.36,{time:1,wink:type===10&&canvas.width>200});
  }
  function backdrop(canvas){
    const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,1.5),c=canvas.getContext('2d');
    canvas.width=w*dpr;canvas.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);
    const scale=w<681?.6:1;
    const scenes=[[5,-.035,.5,125,-.2],[3,.015,1.055,132,.3],[4,.21,1.075,110,-.3],[1,1.045,.28,130,.3],[7,1.065,.79,140,-.4]];
    for(const [type,x,y,r,a] of scenes){c.save();c.globalAlpha=.5;draw(c,type,w*x,h*y,r*scale,{angle:a,time:1,noShadow:true});c.restore();}
    c.save();c.globalAlpha=.32;
    for(const [x,y,size,a] of [[.03,.22,60,-.3],[.97,.12,72,1.3],[.985,.58,80,2.7],[.04,.79,78,-1.8],[.77,1.01,94,-1.2]])leaf(c,w*x,h*y,size*scale,a);
    c.restore();
  }
  return {fruits,draw,icon,backdrop};
})();
