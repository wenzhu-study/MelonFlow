/* Pastel artwork follows the live soft-body outline; each face has its own blink rhythm. */
window.FruitArt = (() => {
  const fruits = [
    {name:'小樱桃', short:'樱桃', r:19, color:'#ee7c91', light:'#ffb7c4', dark:'#d85675'},
    {name:'小草莓', short:'草莓', r:25, color:'#f39aa4', light:'#ffd0cd', dark:'#df7588'},
    {name:'葡萄啵啵', short:'葡萄', r:31, color:'#b09ad8', light:'#dbcaf1', dark:'#957bc2'},
    {name:'元气橘橘', short:'橘子', r:38, color:'#f5b664', light:'#ffdda0', dark:'#e49a4c'},
    {name:'柠檬团子', short:'柠檬', r:45, color:'#f2da70', light:'#fff1ac', dark:'#dfc052'},
    {name:'蜜桃屁屁', short:'蜜桃', r:53, color:'#f2a5b7', light:'#ffdae2', dark:'#df8ca3'},
    {name:'番茄小红', short:'番茄', r:62, color:'#ee8c81', light:'#ffb9aa', dark:'#dc736c'},
    {name:'一颗小梨', short:'雪梨', r:72, color:'#c8dc89', light:'#e9f2b1', dark:'#a8c06d'},
    {name:'椰椰宝宝', short:'椰子', r:83, color:'#cdb99c', light:'#e6d6b9', dark:'#b5a083'},
    {name:'蜜瓜同学', short:'蜜瓜', r:96, color:'#c1dba3', light:'#e4efbf', dark:'#9fbd82'},
    {name:'大西瓜！', short:'西瓜', r:112, color:'#82b992', light:'#b5d9ac', dark:'#68a47f'},
  ];
  const TAU = Math.PI * 2;
  const animatedIcons = new Map();
  let lastIconTime = -1;

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
    const p=points[0],n=points[1];
    c.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);c.closePath();
  }
  function leaf(c,x,y,size,rotation,color='#83aa7c'){
    c.save();c.translate(x,y);c.rotate(rotation);
    c.beginPath();c.moveTo(0,0);
    c.bezierCurveTo(-size*.4,-size*.65,size*.43,-size*.97,size,-size*.18);
    c.bezierCurveTo(size*.63,size*.17,size*.2,size*.24,0,0);
    c.fillStyle=color;c.fill();c.restore();
  }
  function outline(type,r){
    const points=[];
    for(let i=0;i<40;i++){
      const a=i/40*TAU;
      let scale=1+.008*Math.sin(a*3);
      if(type===1)scale*=1-.09*Math.sin(a);
      if(type===4)scale*=1+.055*Math.cos(a*2);
      if(type===5)scale*=1-.035*Math.cos(a*2)+.025*Math.sin(a*3);
      if(type===7)scale*=1+.075*Math.sin(a);
      points.push({x:Math.cos(a)*r*scale,y:Math.sin(a)*r*scale});
    }
    return points;
  }
  function smooth(t){return t*t*(3-2*t);}
  function eyeOpenness(time,seed){
    const period=3.4+(seed*37%17)*.1;
    const phase=((time+seed*.731)%period+period)%period;
    const t=phase-(period-.32);
    if(t<0||t>.27)return 1;
    if(t<.085)return 1-smooth(t/.085);
    if(t<.135)return 0;
    return smooth((t-.135)/.135);
  }
  function face(c,type,r,time,seed,happy){
    const y=r*.14,gap=r*.25,eyeR=Math.max(1.25,r*.047);
    const open=eyeOpenness(time,seed);
    for(const side of [-1,1]){
      ellipse(c,side*r*.43,y+r*.14,r*.14,r*.071,type===10?'#e2a08b80':'#e9809766');
    }
    c.strokeStyle='#405044';c.lineWidth=Math.max(1.3,r*.03);c.lineCap='round';
    for(const side of [-1,1]){
      if(happy||open<.14){
        c.beginPath();c.moveTo(side*gap-eyeR,y+eyeR*.12);
        c.quadraticCurveTo(side*gap,y+(happy?-1:1)*eyeR*.85,side*gap+eyeR,y+eyeR*.12);c.stroke();
      }else{
        ellipse(c,side*gap,y,eyeR,eyeR*1.18*open,'#405044');
        if(open>.4)ellipse(c,side*gap-eyeR*.2,y-eyeR*.32*open,eyeR*.27,eyeR*.28*open,'#ffffffcf');
      }
    }
    c.beginPath();c.moveTo(-r*.075,y+r*.12);
    c.quadraticCurveTo(0,y+r*.24,r*.075,y+r*.12);c.stroke();
  }
  function draw(c,type,x,y,r,options={}){
    const f=fruits[type],time=options.time??0,seed=options.seed??type*19+7;
    const pts=options.points||outline(type,r);
    c.save();c.translate(x,y);c.rotate(options.angle||0);
    c.shadowColor=options.noShadow?'transparent':f.dark+'1c';
    c.shadowBlur=r*.12;c.shadowOffsetY=r*.055;
    path(c,pts);
    const body=c.createRadialGradient(-r*.38,-r*.5,r*.06,r*.08,r*.17,r*1.5);
    body.addColorStop(0,f.light);body.addColorStop(.58,f.color);body.addColorStop(1,f.dark);
    c.fillStyle=body;c.fill();c.shadowColor='transparent';
    c.lineWidth=Math.max(.8,r*.015);c.strokeStyle=f.dark+'52';c.stroke();
    c.save();path(c,pts);c.clip();

    if(type===10){
      c.strokeStyle='#559b716e';c.lineWidth=r*.1;c.lineCap='round';
      for(let k=-2;k<=2;k++){
        const offset=k*r*.37;
        c.beginPath();c.moveTo(offset*.7,-r*1.08);
        c.bezierCurveTo(offset-r*.19,-r*.57,offset+r*.22,-r*.32,offset,r*.02);
        c.bezierCurveTo(offset-r*.15,r*.4,offset+r*.2,r*.71,offset*.77,r*1.08);c.stroke();
      }
    }
    if(type===9){
      c.strokeStyle='#f7f9d48c';c.lineWidth=Math.max(.7,r*.014);
      for(let k=-4;k<=4;k++){
        c.beginPath();c.moveTo(-r*1.1,k*r*.35-r*.7);c.lineTo(r*1.1,k*r*.35+r*.7);c.stroke();
        c.beginPath();c.moveTo(-r*1.1,k*r*.35+r*.7);c.lineTo(r*1.1,k*r*.35-r*.7);c.stroke();
      }
    }
    if(type===8){
      c.strokeStyle='#947e5e32';c.lineWidth=r*.015;
      for(let k=-3;k<=3;k++){
        c.beginPath();c.moveTo(k*r*.27,-r);c.quadraticCurveTo(k*r*.38,0,k*r*.25,r);c.stroke();
      }
      ellipse(c,0,-r*.03,r*.74,r*.73,'#faf1db');
      ellipse(c,-r*.1,-r*.16,r*.59,r*.55,'#fff9e8');
    }
    if(type===1){
      for(let row=0;row<4;row++)for(let col=0;col<4;col++){
        const px=(col-1.5)*r*.39+(row%2)*r*.14,py=(row-1.5)*r*.39;
        if(Math.abs(px)<r*.73&&!(Math.abs(px)<r*.42&&py>-.1*r&&py<r*.46)){
          ellipse(c,px,py,r*.026,r*.057,'#fff0c5e6',-.23);
        }
      }
    }
    if([3,4,7].includes(type))for(let k=0;k<16;k++){
      const a=k*2.4,rr=(.58+(k%4)*.08)*r;
      ellipse(c,Math.cos(a)*rr,Math.sin(a)*rr,r*.014,r*.017,f.dark+'48');
    }
    if(type===5){
      c.beginPath();c.moveTo(0,-r*.89);c.bezierCurveTo(-r*.12,-r*.64,-r*.035,-r*.48,0,-r*.28);
      c.strokeStyle='#d87e975c';c.lineWidth=Math.max(.8,r*.021);c.stroke();
    }
    ellipse(c,-r*.39,-r*.48,r*.205,r*.105,'#ffffff82',-.65);
    ellipse(c,-r*.59,-r*.17,r*.058,r*.042,'#ffffff3d',-.6);
    c.restore();

    const top=Math.min(...pts.map(p=>p.y));
    if([0,2,3,5,7,9,10].includes(type)){
      c.strokeStyle='#80936d';c.lineWidth=Math.max(1.25,r*.045);c.lineCap='round';
      c.beginPath();c.moveTo(0,top+r*.07);c.quadraticCurveTo(-r*.04,top-r*.12,r*.075,top-r*.17);c.stroke();
      leaf(c,r*.02,top-r*.015,r*(type===10?.36:.3),-.32);
      if(type===5)leaf(c,-r*.02,top+r*.015,r*.24,-2.65,'#93b485');
    }
    if(type===1||type===6){
      const length=r*(type===6?.4:.29);
      for(let i=0;i<4;i++)leaf(c,0,top+r*.1,length,(i-1.5)*.7-.2);
    }
    face(c,type,r,time,seed,options.happy);
    c.restore();
  }
  function renderIcon(canvas,entry,time){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    draw(c,entry.type,canvas.width/2,canvas.height*.55,entry.radius,{time,seed:entry.seed,noShadow:true});
  }
  function icon(canvas,type,radius){
    const existing=animatedIcons.get(canvas);
    const entry={type,radius:radius||Math.min(canvas.width,canvas.height)*.36,seed:existing?.seed??101+animatedIcons.size*23};
    animatedIcons.set(canvas,entry);
    renderIcon(canvas,entry,Math.max(0,lastIconTime));
  }
  function animateIcons(time){
    if(time>=lastIconTime&&time-lastIconTime<1/30)return;
    lastIconTime=time;
    for(const [canvas,entry] of animatedIcons){
      if(canvas.isConnected&&canvas.getClientRects().length)renderIcon(canvas,entry,time);
    }
  }
  function backdrop(canvas){
    const w=window.innerWidth,h=window.innerHeight,dpr=Math.min(window.devicePixelRatio||1,1.5),c=canvas.getContext('2d');
    canvas.width=w*dpr;canvas.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);
    const scale=w<681?.6:1;
    for(const [type,x,y,r,a] of [[5,-.035,.5,125,-.2],[3,.015,1.055,132,.3],[4,.21,1.075,110,-.3],[1,1.045,.28,130,.3],[7,1.065,.79,140,-.4]]){
      c.save();c.globalAlpha=.5;draw(c,type,w*x,h*y,r*scale,{angle:a,time:0,noShadow:true});c.restore();
    }
    c.save();c.globalAlpha=.32;
    for(const [x,y,size,a] of [[.03,.22,60,-.3],[.97,.12,72,1.3],[.985,.58,80,2.7],[.04,.79,78,-1.8],[.77,1.01,94,-1.2]])leaf(c,w*x,h*y,size*scale,a);
    c.restore();
  }
  return {fruits,draw,icon,animateIcons,backdrop};
})();
