const output = await page.evaluate(()=>{
  const api=MelonFlowQA;
  const modes={};
  for(const mode of ['jelly','soft','juice']){
    document.querySelector('[data-mode="'+mode+'"]').click();api.reset();
    const start=performance.now();const state=api.advance(240);
    modes[mode]={averageDeformation:state.fruits.reduce((n,f)=>n+f.deformation,0)/state.fruitCount,msPerStep:(performance.now()-start)/240};
    if(state.fruits.some(f=>!Number.isFinite(f.x)||!Number.isFinite(f.y)||f.y>640))throw new Error('Unstable physics in '+mode);
  }
  if(modes.juice.averageDeformation<=modes.jelly.averageDeformation)throw new Error('Modes have no physical effect');
  document.querySelector('[data-mode="soft"]').click();api.reset();api.clear();
  api.spawn(9,260,500);api.advance(120);api.spawn(9,260,240);
  const watermelon=api.advance(180);
  if(!watermelon.fruits.some(f=>f.type===10)||watermelon.score<=0)throw new Error('Watermelon merge failed');
  api.clear();api.spawn(10,260,490);api.advance(120);api.spawn(10,260,220);
  const maxed=api.advance(180);
  if(maxed.fruitCount!==0||maxed.score<=watermelon.score)throw new Error('Max tier merge failed');
  api.reset();api.clear();
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)api.spawn(6+(row+col)%4,100+col*155,540-row*150);
  const crowded=api.advance(600);
  const finite=crowded.fruits.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y));
  if(!finite)throw new Error('Crowded board unstable');
  return {modes,watermelon:{score:watermelon.score,count:watermelon.fruitCount},maxed:{score:maxed.score,count:maxed.fruitCount},crowded:{over:crowded.over,count:crowded.fruitCount,finite},errors:[]};
});
return output;
