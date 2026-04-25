const puppeteer = require('puppeteer');

(async () => {
    console.log("=========================================");
    console.log("🕵️‍♂️ Starting Zero-Touch Automated Audit...");
    console.log("=========================================\n");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let errors = [];
    let failedRequests = [];

    // Intercept console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`[Console Error]: ${msg.text()}`);
        }
    });

    // Intercept page errors (uncaught exceptions)
    page.on('pageerror', err => {
        errors.push(`[Page Exception]: ${err.toString()}`);
    });

    // Intercept failed network requests
    page.on('requestfailed', request => {
        // Ignore tracking or ad networks if they fail
        if (!request.url().includes('google') && !request.url().includes('analytics')) {
            failedRequests.push(`[Failed Request]: ${request.url()} - ${request.failure().errorText}`);
        }
    });

    // Check HTTP responses
    page.on('response', response => {
        const status = response.status();
        if (status >= 400 && status !== 429) { // We ignore 429 because it just means we hit rate limits in dev
             if (!response.url().includes('favicon') && !response.url().includes('google')) {
                errors.push(`[HTTP Error ${status}]: ${response.url()}`);
             }
        }
    });

    const routesToAudit = [
        'http://localhost:3000/',
        'http://localhost:3000/discover',
        'http://localhost:3000/search',
        'http://localhost:3000/profile'
    ];

    for (const route of routesToAudit) {
        console.log(`\nNavigating to: ${route}`);
        try {
            await page.goto(route, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`✅ Loaded ${route} successfully.`);
        } catch (err) {
            console.log(`❌ Timeout or failure loading ${route}`);
            errors.push(`[Navigation Failed]: ${route}`);
        }
    }

    await browser.close();

    console.log("\n=========================================");
    console.log("📋 Audit Report");
    console.log("=========================================");
    
    if (errors.length === 0 && failedRequests.length === 0) {
        console.log("🌟 PASSED: No critical console errors or HTTP failures detected!");
    } else {
        if (errors.length > 0) {
            console.log("\n⚠️ Errors Found:");
            errors.forEach(e => console.log(`  - ${e}`));
        }
        if (failedRequests.length > 0) {
            console.log("\n⚠️ Network Failures:");
            failedRequests.forEach(f => console.log(`  - ${f}`));
        }
        console.log("\nNote: Some network failures (like ads being blocked) or hydration mismatches are expected in dev mode.");
    }
    console.log("=========================================");
})();
