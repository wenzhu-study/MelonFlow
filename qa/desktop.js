await page.goto('file:///D:/Desktop/%E7%B4%A0%E6%9D%90/%E5%88%9B%E4%BD%9C/MelonFlow/index.html', {waitUntil:'load'});
await page.setViewportSize({width:1440,height:1000});
await page.waitForFunction(() => window.MelonFlow && MelonFlow.getState().gameTime > 1800);
globalThis.gameErrors = [];
page.on('pageerror', error => globalThis.gameErrors.push(error.message));
return {state:await page.evaluate(() => MelonFlow.getState()), screenshot:await page.screenshot({fullPage:false}), errors:globalThis.gameErrors};
