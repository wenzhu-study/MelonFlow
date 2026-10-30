globalThis.refreshErrors=[];
page.on('pageerror',e=>globalThis.refreshErrors.push(e.message));
await page.goto('file:///D:/Desktop/%E7%B4%A0%E6%9D%90/%E5%88%9B%E4%BD%9C/MelonFlow/MelonFlow.html?qa=1',{waitUntil:'load'});
await page.setViewportSize({width:1505,height:1045});
await page.evaluate(()=>{document.querySelector('[data-mode="soft"]').click();MelonFlowQA.advance(180);});
return {screenshot:await page.screenshot({fullPage:true}),errors:globalThis.refreshErrors,layout:await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,canvases:[...document.querySelectorAll('canvas')].map(c=>({id:c.id,width:c.width,height:c.height})),state:MelonFlow.getState()}))};
