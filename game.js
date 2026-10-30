(() => {
  'use strict';
  const {Engine, Bodies, Body, Composite, Constraint, Events} = Matter;
  const {fruits: TYPES, draw: drawFruit, icon: fruitIcon} = FruitArt;
  const $ = id => document.getElementById(id);
  const QA = new URLSearchParams(location.search).get('qa') === '1';
  const canvas = $('game-canvas'), ctx = canvas.getContext('2d');
  const W = 520, H = 640, FLOOR = 625, LEFT = 14, RIGHT = 506, LIMIT = 116;
  const FIXED = 1000 / 60, NODE_COUNT = 14, TAU = Math.PI * 2;
  const MODE = {
    jelly: {spoke:.16, edge:.75, cross:.09, restitution:.42, air:.009, pressure:.0016, label:'JELLY', bars:2},
    soft: {spoke:.065, edge:.55, cross:.035, restitution:.18, air:.018, pressure:.0011, label:'SOFT', bars:3},
    juice: {spoke:.018, edge:.33, cross:.009, restitution:.04, air:.035, pressure:.0008, label:'JUICY', bars:5},
  };
  const engine = Engine.create({positionIterations:7, velocityIterations:6, constraintIterations:4, enableSleeping:false});
  engine.gravity.y = 1.05;
  const walls = [
    Bodies.rectangle(-20,H/2,68,H*3,{isStatic:true,friction:.15}),
    Bodies.rectangle(W+20,H/2,68,H*3,{isStatic:true,friction:.15}),
    Bodies.rectangle(W/2,FLOOR+40,W+100,80,{isStatic:true,friction:.3}),
  ];
  Composite.add(engine.world,walls);
  let fruits=[],particles=[],floaters=[],pendingMerges=[];
  let score=0,best=0,energy=100,mode='soft',current=1,next=0;
  let paused=false,over=false,sound=false,started=false,tilt=0,aim=W/2;
  let gameTime=0,lastDrop=-1000,lastMerge=-1000,combo=0,dropCount=0;
  let nextId=1,discovered=new Set(),audio=null,lastTime=0,accumulator=0,lastUI=0;
  let toastTimer,noticeTimer,autoPaused=false,modalWasPaused=false;
  let grab=null;
  const pendingIds=new Set();
  const storage = {
    read(key,fallback){try{return JSON.parse(localStorage.getItem((QA?'melonflow.qa.':'melonflow.')+key))??fallback;}catch{return fallback;}},
    write(key,value){try{localStorage.setItem((QA?'melonflow.qa.':'melonflow.')+key,JSON.stringify(value));}catch{/* Private browsing may disable storage. */}},
  };
  best=Number(storage.read('best',0))||0;sound=storage.read('sound',false)===true;
  if(MODE[storage.read('mode','soft')])mode=storage.read('mode','soft');

  function resizeCanvas(){
    const dpr=Math.min(2,Math.max(1,(window.devicePixelRatio||1)*(canvas.clientWidth/W||1)));
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    FruitArt.backdrop($('orchard-backdrop'));
  }
  resizeCanvas();window.addEventListener('resize',resizeCanvas);
  function paintIcon(id,type,radius){fruitIcon($(id),type,radius);}
  fruitIcon(document.querySelector('.brand-fruit'),10,42);
  paintIcon('goal-fruit',10,118);paintIcon('over-fruit',5,64);
  for(let i=0;i<TYPES.length;i++){
    const item=document.createElement('div');item.className='fruit-item';item.dataset.type=i;item.title=TYPES[i].name;
    const art=document.createElement('canvas');art.width=100;art.height=100;art.setAttribute('aria-label',TYPES[i].name);
    fruitIcon(art,i,37);const name=document.createElement('span');name.textContent=TYPES[i].short;
    item.append(art,name);$('fruit-collection').append(item);
  }
  const physicsSection=document.querySelector('.physics-section');
  const mobileMatch=window.matchMedia('(max-width:680px)');
  function positionPhysics(){
    if(mobileMatch.matches){physicsSection.classList.add('mobile-physics');document.querySelector('.right-column').append(physicsSection);}
    else{physicsSection.classList.remove('mobile-physics');document.querySelector('.left-column').insertBefore(physicsSection,document.querySelector('.little-note'));}
  }
  mobileMatch.addEventListener('change',positionPhysics);positionPhysics();
  lucide.createIcons();

  function createFruit(type,x,y,vx=0,vy=0){
    const r=TYPES[type].r,ringR=r*.81,nodeR=r*.205;
    const group=Body.nextGroup(true),id=nextId++;
    const composite=Composite.create({label:'fruit-'+id});
    const config=MODE[mode];
    const totalMass=r*r*.0021;
    const common={friction:.11,frictionStatic:.2,restitution:config.restitution,frictionAir:config.air,collisionFilter:{group},slop:.2};
    const core=Bodies.circle(x,y,r*.48,{...common,label:'fruit-core'});
    Body.setMass(core,totalMass*.4);
    core.plugin.fruitId=id;
    const nodes=[],links=[];
    for(let i=0;i<NODE_COUNT;i++){
      const a=i/NODE_COUNT*TAU;
      const node=Bodies.circle(x+Math.cos(a)*ringR,y+Math.sin(a)*ringR,nodeR,{...common,label:'fruit-skin'});
      Body.setMass(node,totalMass*.6/NODE_COUNT);node.plugin.fruitId=id;nodes.push(node);
    }
    for(let i=0;i<NODE_COUNT;i++){
      const spoke=Constraint.create({bodyA:core,bodyB:nodes[i],length:ringR,stiffness:config.spoke,damping:.12});spoke.plugin.kind='spoke';links.push(spoke);
      const edge=Constraint.create({bodyA:nodes[i],bodyB:nodes[(i+1)%NODE_COUNT],length:2*ringR*Math.sin(Math.PI/NODE_COUNT),stiffness:config.edge,damping:.12});edge.plugin.kind='edge';links.push(edge);
      if(i<NODE_COUNT/2){const cross=Constraint.create({bodyA:nodes[i],bodyB:nodes[i+NODE_COUNT/2],length:ringR*2,stiffness:config.cross,damping:.06});cross.plugin.kind='cross';links.push(cross);}
    }
    const all=[core,...nodes];
    for(const b of all)Body.setVelocity(b,{x:vx,y:vy});
    Composite.add(composite,[...all,...links]);Composite.add(engine.world,composite);
    const fruit={id,type,r,ringR,nodeR,composite,core,nodes,links,born:gameTime,danger:0,angle:0,targetArea:NODE_COUNT/2*ringR*ringR*Math.sin(TAU/NODE_COUNT)};
    fruits.push(fruit);discover(type);return fruit;
  }
  function releaseGrab(){if(grab){Composite.remove(engine.world,grab.constraint);grab=null;}canvas.style.cursor='crosshair';}
  function removeFruit(f){if(grab?.fruitId===f.id)releaseGrab();Composite.remove(engine.world,f.composite,true);fruits=fruits.filter(x=>x.id!==f.id);}
  function discover(type){
    if(discovered.has(type))return;discovered.add(type);
    const item=document.querySelector('.fruit-item[data-type="'+type+'"]');item.classList.remove('undiscovered');item.classList.add('just-found');
    $('discovered-count').textContent=discovered.size+' / 11';
  }
  function setMode(value,notify=true){
    if(!MODE[value])return;mode=value;const config=MODE[mode];
    for(const f of fruits){
      for(const body of [f.core,...f.nodes]){body.restitution=config.restitution;body.frictionAir=config.air;}
      for(const link of f.links)link.stiffness=config[link.plugin.kind];
    }
    document.querySelectorAll('[data-mode]').forEach(button=>{const selected=button.dataset.mode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',selected);});
    $('mode-value').textContent=config.label;
    document.querySelectorAll('.softness-meter b').forEach((bar,i)=>bar.style.background=i<config.bars?'#94cb84':'#e0eddb');
    storage.write('mode',mode);
    if(notify)tone(440,.05,'sine',.025);
  }
  function pickFruit(){const p=Math.random();return p<.27?0:p<.56?1:p<.8?2:p<.95?3:4;}
  function updateNext(){paintIcon('next-fruit',next,53);$('next-name').textContent=TYPES[next].name;}
  function scoreUI(){
    $('score').textContent=score.toLocaleString();$('best-score').textContent=best.toLocaleString();
    $('score').classList.remove('pop');void $('score').offsetWidth;$('score').classList.add('pop');
  }
  function energyUI(){
    $('energy-value').textContent=Math.floor(energy);$('energy-fill').style.width=energy+'%';
    document.querySelector('.energy-track').setAttribute('aria-valuenow',Math.floor(energy));
    $('stir-button').disabled=energy<30||paused||over;
  }
  function resetGame(){
    for(const f of [...fruits])removeFruit(f);
    Engine.clear(engine);pendingMerges=[];pendingIds.clear();particles=[];floaters=[];
    score=0;energy=100;gameTime=0;lastDrop=-1000;lastMerge=-1000;combo=0;dropCount=0;over=false;paused=false;autoPaused=false;tilt=0;aim=W/2;
    current=1;next=0;discovered=new Set();nextId=1;
    document.querySelectorAll('.fruit-item').forEach(item=>item.classList.add('undiscovered'));
    // A small starting assortment makes the first drop immediately interesting.
    [[5,98,555],[3,220,572],[6,397,550],[4,299,531],[2,179,485],[1,70,466],[0,351,449]].forEach(([type,x,y])=>createFruit(type,x,y));
    $('gameover-overlay').hidden=true;$('pause-overlay').hidden=true;
    $('stage-status').textContent='果池营业中';$('tank').style.transform='';
    setPauseIcon();scoreUI();energyUI();updateNext();started=true;
  }
  function drop(){
    if(paused||over||gameTime-lastDrop<520||document.querySelector('dialog[open]'))return;
    wakeAudio();const r=TYPES[current].r;
    createFruit(current,Math.max(LEFT+r+2,Math.min(RIGHT-r-2,aim)),48,tilt*1.5,1);
    current=next;next=pickFruit();lastDrop=gameTime;dropCount++;updateNext();tone(350+current*55,.1,'sine',.035);
  }

  function collisions(event){
    if(over)return;
    for(const pair of event.pairs){
      const aId=pair.bodyA.plugin.fruitId,bId=pair.bodyB.plugin.fruitId;
      if(!aId||!bId||aId===bId||pendingIds.has(aId)||pendingIds.has(bId))continue;
      const a=fruits.find(f=>f.id===aId),b=fruits.find(f=>f.id===bId);
      if(!a||!b||a.type!==b.type||gameTime-a.born<300||gameTime-b.born<300)continue;
      pendingIds.add(aId);pendingIds.add(bId);pendingMerges.push([a,b]);
    }
  }
  Events.on(engine,'collisionStart',collisions);Events.on(engine,'collisionActive',collisions);

  function processMerges(){
    for(const [a,b] of pendingMerges){
      const x=(a.core.position.x+b.core.position.x)/2,y=(a.core.position.y+b.core.position.y)/2;
      const vx=(a.core.velocity.x+b.core.velocity.x)/2,vy=Math.min(0,(a.core.velocity.y+b.core.velocity.y)/2)-1;
      const type=Math.min(a.type+1,10);removeFruit(a);removeFruit(b);
      const maxed=a.type===10;
      if(!maxed){const r=TYPES[type].r;createFruit(type,Math.max(LEFT+r,Math.min(RIGHT-r,x)),Math.min(FLOOR-r,y),vx,vy);}
      combo=gameTime-lastMerge<1800?combo+1:1;lastMerge=gameTime;
      const points=(maxed?1500:(type+1)*(type+2))*Math.min(combo,5);
      score+=points;energy=Math.min(100,energy+4+type);
      if(score>best){best=score;storage.write('best',best);}
      scoreUI();spawnBurst(x,y,TYPES[type].color,type>8?36:16);
      floaters.push({x,y:y-20,text:'+'+points,life:1,color:TYPES[type].dark});
      tone(380+type*65,.18,'sine',.04);setTimeout(()=>tone(570+type*70,.22,'sine',.02),70);
      if(type===10){showCombo(maxed?'西瓜自由！':'大西瓜诞生啦！');showNotice('合出大西瓜！继续挑战你的最高分');}
      else if(combo>1)showCombo(combo+' 连合 · 软萌暴击');
    }
    pendingMerges=[];pendingIds.clear();
  }
  function spawnBurst(x,y,color,count){
    for(let i=0;i<count;i++){const a=Math.random()*TAU,speed=1.2+Math.random()*3;particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-1,r:2+Math.random()*4,life:.7+Math.random()*.5,color,spin:Math.random()*TAU});}
  }
  function showCombo(text){clearTimeout(toastTimer);$('combo-toast').textContent=text;$('combo-toast').classList.add('show');toastTimer=setTimeout(()=>$('combo-toast').classList.remove('show'),1600);}
  function showNotice(text){clearTimeout(noticeTimer);$('notice').textContent=text;$('notice').classList.add('show');noticeTimer=setTimeout(()=>$('notice').classList.remove('show'),2600);}

  function stir(){
    if(energy<30||paused||over||document.querySelector('dialog[open]'))return;
    wakeAudio();energy-=30;
    for(const f of fruits){
      const vx=(W/2-f.core.position.x)*.018+(Math.random()-.5)*7,vy=-5-Math.random()*3;
      for(const body of [f.core,...f.nodes])Body.setVelocity(body,{x:body.velocity.x*.25+vx,y:vy});
    }
    spawnBurst(W/2,H*.7,'#accba4',22);energyUI();tone(180,.25,'triangle',.045);showCombo('摇摇晃晃，好运开场');
  }
  function setTilt(value){if(paused||over)value=0;tilt=value;$('tank').style.transform=value?'rotate('+value*1.5+'deg)':'';}

  function step(){
    gameTime+=FIXED;engine.gravity.x+=(tilt*.75-engine.gravity.x)*.09;
    // Ring springs provide elasticity; area pressure resists loss of fruit volume.
    for(const f of fruits){
      let area=0;
      for(let i=0;i<NODE_COUNT;i++){const a=f.nodes[i].position,b=f.nodes[(i+1)%NODE_COUNT].position;area+=a.x*b.y-b.x*a.y;}
      area=Math.abs(area)*.5;
      const pressure=Math.max(-.45,Math.min(1.6,f.targetArea/Math.max(area,f.targetArea*.3)-1))*MODE[mode].pressure;
      for(const node of f.nodes){
        const dx=node.position.x-f.core.position.x,dy=node.position.y-f.core.position.y,len=Math.hypot(dx,dy)||1;
        Body.applyForce(node,node.position,{x:dx/len*pressure*node.mass,y:dy/len*pressure*node.mass});
        if(node.speed>19)Body.setVelocity(node,{x:node.velocity.x*19/node.speed,y:node.velocity.y*19/node.speed});
      }
    }
    Engine.update(engine,FIXED);processMerges();
    energy=Math.min(100,energy+FIXED*.0015);
    let danger=0;
    for(const f of fruits){
      const top=Math.min(...f.nodes.map(n=>n.position.y-f.nodeR));
      const atRisk=gameTime-f.born>1600&&top<LIMIT;
      f.danger=atRisk?f.danger+FIXED:Math.max(0,f.danger-FIXED*2);
      danger=Math.max(danger,f.danger);
      if(f.danger>3000){finishGame();break;}
    }
    $('stage-status').textContent=danger>350?'快满啦，小心软着陆':'果池营业中';
    canvas.dataset.danger=danger>350?'true':'false';
    for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.life-=.025;p.spin+=.06;}
    particles=particles.filter(p=>p.life>0);
    for(const p of floaters){p.y-=.75;p.life-=.015;}floaters=floaters.filter(p=>p.life>0);
  }
  function finishGame(){
    over=true;releaseGrab();setTilt(0);$('final-score').textContent=score.toLocaleString();$('gameover-overlay').hidden=false;
    $('stage-status').textContent='这一池，圆满结束';energyUI();storage.write('session',null);tone(210,.3,'sine',.03);
  }

  function smoothPath(points){
    ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i],n=points[(i+1)%points.length];if(!i)ctx.moveTo((p.x+n.x)/2,(p.y+n.y)/2);else ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);}const p=points[0],n=points[1];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);ctx.closePath();
  }
  function render(){
    ctx.clearRect(0,0,W,H);
    // Shallow pooled color gives the glass a little life without hiding the fruit.
    ctx.fillStyle='#dfeeda45';ctx.beginPath();ctx.moveTo(0,H-17);
    for(let x=0;x<=W;x+=10)ctx.lineTo(x,H-17+Math.sin(x*.022+gameTime*.0014)*3);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    const danger=canvas.dataset.danger==='true';
    ctx.save();ctx.setLineDash([5,7]);ctx.strokeStyle=danger?'#dd9290':'#bdc8af88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,LIMIT);ctx.lineTo(W-24,LIMIT);ctx.stroke();ctx.restore();
    ctx.fillStyle='#b6c5ad66';ctx.font='8px "Segoe UI",sans-serif';ctx.textAlign='left';
    for(let y=180;y<=540;y+=90){ctx.fillRect(23,y,6,1);ctx.fillText(String((630-y)*2),33,y+3);}
    for(const f of fruits){
      const center=f.core.position;
      const points=f.nodes.map(n=>{const dx=n.position.x-center.x,dy=n.position.y-center.y,len=Math.hypot(dx,dy)||1;return{x:dx+dx/len*f.nodeR*.95,y:dy+dy/len*f.nodeR*.95};});
      drawFruit(ctx,f.type,center.x,center.y,f.r,{points,time:gameTime*.001+f.id*.3,happy:gameTime-f.born<600});
    }
    for(const p of particles){
      ctx.save();ctx.globalAlpha=Math.min(1,p.life);ctx.translate(p.x,p.y);ctx.rotate(p.spin);ctx.fillStyle=p.color;
      if(p.r>4){ctx.beginPath();ctx.moveTo(-p.r,0);ctx.quadraticCurveTo(0,-p.r*.3,0,-p.r);ctx.quadraticCurveTo(p.r*.3,0,p.r,0);ctx.quadraticCurveTo(0,p.r*.3,0,p.r);ctx.quadraticCurveTo(-p.r*.3,0,-p.r,0);ctx.fill();}
      else{ctx.beginPath();ctx.arc(0,0,p.r,0,TAU);ctx.fill();}ctx.restore();
    }
    for(const p of floaters){ctx.save();ctx.globalAlpha=p.life;ctx.font='bold 21px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);ctx.restore();}
    if(!over&&!paused){
      const r=TYPES[current].r,x=Math.max(LEFT+r+2,Math.min(RIGHT-r-2,aim));
      let landing=FLOOR;
      for(const f of fruits){const dx=Math.abs(f.core.position.x-x);if(dx<f.r+r*.5)landing=Math.min(landing,f.core.position.y-f.r);}
      ctx.save();ctx.globalAlpha=gameTime-lastDrop<520?.3:1;
      ctx.strokeStyle='#a4bd9680';ctx.setLineDash([3,8]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,53+r);ctx.lineTo(x,landing-10);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#96b68a35';ctx.beginPath();ctx.ellipse(x,Math.min(FLOOR-2,landing-2),r*.7,3,0,0,TAU);ctx.fill();
      drawFruit(ctx,current,x,48+Math.sin(gameTime*.002)*2,r,{time:gameTime*.001,noShadow:true});
      ctx.strokeStyle='#9ab58b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-3,15);ctx.lineTo(x,18);ctx.lineTo(x+3,15);ctx.stroke();ctx.restore();
    }
  }
  function frame(timestamp){
    const delta=Math.min(50,timestamp-(lastTime||timestamp));lastTime=timestamp;
    if(!QA&&!paused&&!over&&!document.hidden&&started){
      accumulator+=delta;let steps=0;
      while(accumulator>=FIXED&&steps<3){step();accumulator-=FIXED;steps++;if(over)break;}
    }else accumulator=0;
    render();if(timestamp-lastUI>160){energyUI();lastUI=timestamp;}
    requestAnimationFrame(frame);
  }

  function setIcon(button,name){button.innerHTML='<i data-lucide="'+name+'"></i>';lucide.createIcons({nodes:[button]});}
  function setPauseIcon(){setIcon($('pause-button'),paused?'play':'pause');$('pause-button').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');$('pause-button').title=paused?'继续':'暂停';$('pause-button').setAttribute('aria-pressed',paused);}
  function setPaused(value){
    if(over)return;paused=value;releaseGrab();setTilt(0);$('pause-overlay').hidden=!paused;setPauseIcon();energyUI();
    $('stage-status').textContent=paused?'水果休息中':'果池营业中';
  }
  function updateSound(){setIcon($('sound-button'),sound?'volume-2':'volume-x');$('sound-button').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('sound-button').setAttribute('aria-pressed',sound);$('sound-button').title=sound?'关闭声音':'开启声音';}
  function wakeAudio(){
    if(!sound)return;
    try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{sound=false;updateSound();}
  }
  function tone(freq,duration,type='sine',volume=.04){
    if(!sound||!audio||audio.state!=='running')return;
    const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;
    oscillator.frequency.setValueAtTime(freq,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(freq*.7,audio.currentTime+duration);
    gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration+.01);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  function pointAim(event){const rect=canvas.getBoundingClientRect();aim=Math.max(35,Math.min(W-35,(event.clientX-rect.left)/rect.width*W));}
  function pointerPosition(event){const rect=canvas.getBoundingClientRect();return{x:Math.max(LEFT,Math.min(RIGHT,(event.clientX-rect.left)/rect.width*W)),y:Math.max(25,Math.min(FLOOR,(event.clientY-rect.top)/rect.height*H))};}
  function fruitAt(p){return [...fruits].reverse().find(f=>Math.hypot(p.x-f.core.position.x,p.y-f.core.position.y)<f.r);}
  let activePointer=null,gestureWasGrab=false;
  canvas.addEventListener('pointerdown',event=>{
    if(activePointer!==null||event.button>0||paused||over)return;
    event.preventDefault();canvas.focus({preventScroll:true});activePointer=event.pointerId;pointAim(event);canvas.setPointerCapture(event.pointerId);
    const p=pointerPosition(event),fruit=fruitAt(p);gestureWasGrab=!!fruit;
    if(fruit){
      const nearest=fruit.nodes.reduce((a,b)=>Math.hypot(a.position.x-p.x,a.position.y-p.y)<Math.hypot(b.position.x-p.x,b.position.y-p.y)?a:b);
      const constraint=Constraint.create({pointA:p,bodyB:nearest,length:0,stiffness:.13,damping:.12});
      Composite.add(engine.world,constraint);grab={constraint,fruitId:fruit.id};canvas.style.cursor='grabbing';wakeAudio();
    }
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerType==='mouse'||event.pointerId===activePointer)pointAim(event);
    const p=pointerPosition(event);
    if(grab&&event.pointerId===activePointer)grab.constraint.pointA=p;
    else if(activePointer===null)canvas.style.cursor=fruitAt(p)?'grab':'crosshair';
  });
  canvas.addEventListener('pointerup',event=>{if(event.pointerId!==activePointer)return;pointAim(event);activePointer=null;releaseGrab();if(!gestureWasGrab)drop();});
  canvas.addEventListener('pointercancel',()=>{activePointer=null;releaseGrab();});
  canvas.addEventListener('lostpointercapture',()=>{activePointer=null;releaseGrab();});
  for(const [id,direction] of [['tilt-left',-1],['tilt-right',1]]){
    const button=$(id);
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);setTilt(direction);});
    button.addEventListener('pointerup',()=>setTilt(0));button.addEventListener('pointercancel',()=>setTilt(0));button.addEventListener('lostpointercapture',()=>setTilt(0));
  }
  window.addEventListener('keydown',event=>{
    if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    const key=event.key.toLowerCase();
    if(['arrowleft','arrowright','enter',' ','a','d','p'].includes(key)){
      if((key==='enter'||key===' ')&&event.target.closest('button,a'))return;
      event.preventDefault();
      if(key==='p'&&!event.repeat){setPaused(!paused);return;}
      if(paused||over)return;
      if(key==='arrowleft')aim=Math.max(35,aim-17);
      else if(key==='arrowright')aim=Math.min(W-35,aim+17);
      else if(key==='enter'&&!event.repeat)drop();
      else if(key===' '&&!event.repeat)stir();
      else if(key==='a')setTilt(-1);else if(key==='d')setTilt(1);
    }
  });
  window.addEventListener('keyup',event=>{if(['a','d'].includes(event.key.toLowerCase()))setTilt(0);});
  window.addEventListener('blur',()=>{setTilt(0);activePointer=null;releaseGrab();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&!paused&&!over){autoPaused=true;setPaused(true);}
    else if(!document.hidden&&autoPaused){autoPaused=false;setPaused(false);}
  });
  $('pause-button').addEventListener('click',()=>setPaused(!paused));$('resume-button').addEventListener('click',()=>setPaused(false));
  $('sound-button').addEventListener('click',()=>{sound=!sound;storage.write('sound',sound);wakeAudio();updateSound();tone(660,.12);});
  $('stir-button').addEventListener('click',stir);$('again-button').addEventListener('click',resetGame);
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  function openDialog(dialog){modalWasPaused=paused;setPaused(true);dialog.showModal();}
  function closeDialog(dialog){dialog.close();}
  for(const id of ['help-dialog','restart-dialog']){
    const dialog=$(id);dialog.addEventListener('close',()=>{if(!modalWasPaused&&!over)setPaused(false);});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);}});
  }
  $('help-button').addEventListener('click',()=>openDialog($('help-dialog')));
  document.querySelectorAll('.modal-close').forEach(button=>button.addEventListener('click',()=>closeDialog($('help-dialog'))));
  $('restart-button').addEventListener('click',()=>openDialog($('restart-dialog')));
  $('cancel-restart').addEventListener('click',()=>closeDialog($('restart-dialog')));
  $('confirm-restart').addEventListener('click',()=>{closeDialog($('restart-dialog'));modalWasPaused=false;resetGame();});

  function saveSession(){
    if(!started||over||QA)return;
    storage.write('session',{version:1,score,energy,current,next,dropCount,discovered:[...discovered],fruits:fruits.map(f=>({type:f.type,x:f.core.position.x,y:f.core.position.y})),savedAt:Date.now()});
  }
  function restoreSession(){
    const saved=storage.read('session',null);
    if(!saved||saved.version!==1||Date.now()-saved.savedAt>86400000||!Array.isArray(saved.fruits)||saved.fruits.length>100||saved.dropCount<1)return;
    const valid=saved.fruits.every(f=>Number.isInteger(f.type)&&TYPES[f.type]&&Number.isFinite(f.x)&&Number.isFinite(f.y)&&f.x>0&&f.x<W&&f.y>0&&f.y<H);
    if(!valid||!Number.isInteger(saved.current)||!TYPES[saved.current]||!Number.isInteger(saved.next)||!TYPES[saved.next])return;
    for(const f of [...fruits])removeFruit(f);
    for(const f of saved.fruits)createFruit(f.type,f.x,f.y);
    score=Math.max(0,Number(saved.score)||0);energy=Math.max(0,Math.min(100,Number(saved.energy)||0));current=saved.current;next=saved.next;dropCount=saved.dropCount;
    (saved.discovered||[]).filter(type=>Number.isInteger(type)&&TYPES[type]).forEach(discover);scoreUI();energyUI();updateNext();
  }
  window.addEventListener('pagehide',saveSession);setInterval(saveSession,3000);
  setMode(mode,false);resetGame();if(!QA)restoreSession();updateSound();requestAnimationFrame(frame);

  // Read-only state makes browser smoke checks possible without affecting a game.
  window.MelonFlow=Object.freeze({getState:()=>({score,best,energy,mode,current,next,paused,over,dropCount,gameTime,fruitCount:fruits.length,bodyCount:Composite.allBodies(engine.world).length,fruits:fruits.map(f=>({id:f.id,type:f.type,x:f.core.position.x,y:f.core.position.y,deformation:Math.max(...f.nodes.map(n=>Math.hypot(n.position.x-f.core.position.x,n.position.y-f.core.position.y)))-Math.min(...f.nodes.map(n=>Math.hypot(n.position.x-f.core.position.x,n.position.y-f.core.position.y)))}))})});
  if(QA)window.MelonFlowQA=Object.freeze({
    advance(frames){for(let i=0;i<Math.min(600,frames);i++)if(!paused&&!over)step();render();energyUI();return window.MelonFlow.getState();},
    clear(){for(const f of [...fruits])removeFruit(f);pendingMerges=[];pendingIds.clear();},
    spawn(type,x,y,anchored=false){if(TYPES[type]){const fruit=createFruit(type,x,y);if(anchored)for(const body of [fruit.core,...fruit.nodes])Body.setStatic(body,true);}},
    reset:resetGame,
  });
})();
