const puppeteer = require('puppeteer');

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const routes = [
    '/',
    '/discover',
    '/search',
    '/genres',
    '/az-list/all',
    '/history',
    '/watchlist',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
];
const viewports = [
    { name: 'phone-small', width: 320, height: 740 },
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'desktop', width: 1920, height: 1080 },
];

function compact(value, max = 90) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const report = [];

    for (const viewport of viewports) {
        await page.setViewport({
            width: viewport.width,
            height: viewport.height,
            isMobile: viewport.width <= 480,
            hasTouch: viewport.width <= 1024,
        });

        for (const route of routes) {
            const url = `${BASE_URL}${route}`;
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 1200));

                const issues = await page.evaluate(() => {
                    const visible = element => {
                        const style = getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                    };
                    const intentionalScroller = element => {
                        const style = getComputedStyle(element);
                        return ['auto', 'scroll'].includes(style.overflowX) ||
                            element.classList.contains('hide-scrollbar') ||
                            element.classList.contains('netflix-row');
                    };
                    const selector = element => {
                        const tag = element.tagName.toLowerCase();
                        const id = element.id ? `#${element.id}` : '';
                        const classes = [...element.classList].slice(0, 3).map(name => `.${name.replace(/[^a-zA-Z0-9_-]/g, '')}`).join('');
                        return `${tag}${id}${classes}`;
                    };

                    const documentOverflow = Math.max(
                        document.documentElement.scrollWidth,
                        document.body.scrollWidth,
                    ) - window.innerWidth;

                    const overflow = [...document.querySelectorAll('body *')]
                        .filter(visible)
                        .filter(element => !intentionalScroller(element))
                        .filter(element => element.scrollWidth - element.clientWidth > 2)
                        .slice(0, 20)
                        .map(element => ({
                            selector: selector(element),
                            overflow: Math.round(element.scrollWidth - element.clientWidth),
                            text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) || '',
                        }));

                    const clippedText = [...document.querySelectorAll('h1,h2,h3,h4,p,span,a,button')]
                        .filter(visible)
                        .filter(element => {
                            const style = getComputedStyle(element);
                            if (style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none') return false;
                            return element.scrollHeight - element.clientHeight > 2 ||
                                (style.whiteSpace !== 'normal' && element.scrollWidth - element.clientWidth > 2);
                        })
                        .slice(0, 20)
                        .map(element => ({
                            selector: selector(element),
                            text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) || '',
                        }));

                    const offscreen = [...document.querySelectorAll('h1,h2,h3,.premium-card-container,.responsive-grid > *')]
                        .filter(visible)
                        .filter(element => {
                            const rect = element.getBoundingClientRect();
                            return rect.left < -2 || rect.right > window.innerWidth + 2;
                        })
                        .slice(0, 20)
                        .map(element => ({
                            selector: selector(element),
                            left: Math.round(element.getBoundingClientRect().left),
                            right: Math.round(element.getBoundingClientRect().right),
                            text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) || '',
                        }));

                    return { documentOverflow, overflow, clippedText, offscreen };
                });

                if (issues.documentOverflow > 2 || issues.overflow.length || issues.clippedText.length || issues.offscreen.length) {
                    report.push({ viewport: viewport.name, route, ...issues });
                }
            } catch (error) {
                report.push({ viewport: viewport.name, route, navigationError: error.message });
            }
        }
    }

    await browser.close();

    if (report.length === 0) {
        console.log('Responsive audit passed with no measurable clipping or overflow.');
        return;
    }

    for (const item of report) {
        console.log(`\n[${item.viewport}] ${item.route}`);
        if (item.navigationError) {
            console.log(`  navigation: ${item.navigationError}`);
            continue;
        }
        if (item.documentOverflow > 2) console.log(`  document overflow: ${item.documentOverflow}px`);
        for (const issue of item.overflow) {
            console.log(`  overflow ${issue.overflow}px: ${issue.selector} :: ${compact(issue.text)}`);
        }
        for (const issue of item.clippedText) {
            console.log(`  clipped text: ${issue.selector} :: ${compact(issue.text)}`);
        }
        for (const issue of item.offscreen) {
            console.log(`  offscreen [${issue.left}, ${issue.right}]: ${issue.selector} :: ${compact(issue.text)}`);
        }
    }

    process.exitCode = 1;
})();
