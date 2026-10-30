await page.goto('https://melon-game.jack-514.chatgpt.site/', {waitUntil: 'domcontentloaded'});
return await page.screenshot({fullPage: false});
