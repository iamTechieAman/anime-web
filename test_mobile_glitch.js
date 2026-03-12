const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Puppeteer for mobile responsiveness test...');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Set viewport to iPhone 12/13
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('Navigating to home page...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 60000 });

    await new Promise(r => setTimeout(r, 6000));

    console.log('Taking full page mobile screenshot...');
    await page.screenshot({ path: 'mobile_glitch_test.png', fullPage: true });

    await browser.close();
    console.log('Done!');
})();
