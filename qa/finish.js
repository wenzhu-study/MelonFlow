const gamePage=pages().find(p=>p.url().includes('/MelonFlow/MelonFlow.html'));
if(!gamePage)throw new Error('Game page missing');
usePage(gamePage);
await page.goto('file:///D:/Desktop/%E7%B4%A0%E6%9D%90/%E5%88%9B%E4%BD%9C/MelonFlow/MelonFlow.html',{waitUntil:'load'});
for(const scratch of pages())if(scratch!==page&&(scratch.url()==='about:blank'||scratch.url().startsWith('https://melon-game.jack-514.chatgpt.site/')))await scratch.close();
return{title:await page.title(),ready:await page.evaluate(()=>!!window.MelonFlow&&!window.MelonFlowQA),url:page.url()};
