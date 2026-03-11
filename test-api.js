const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });

    // Test AnimeParadise
    console.log("Testing AnimeParadise...");
    let page = await browser.newPage();
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api') || response.headers()['content-type']?.includes('json')) {
            console.log('AnimeParadise API:', url);
        }
    });
    await page.goto('https://www.animeparadise.moe/search?keyword=naruto', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log(e.message));
    await page.close();

    // Test FireAni
    console.log("\nTesting FireAni...");
    page = await browser.newPage();
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api') || response.headers()['content-type']?.includes('json')) {
            console.log('FireAni API:', url);
        }
    });
    await page.goto('https://fireani.me/search?q=naruto', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log(e.message));

    await browser.close();
})();
