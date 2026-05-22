const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://anikai.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

async function testHome() {
    try {
        console.log("Fetching home...");
        const res = await axios.get(`${BASE_URL}/home`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const $ = cheerio.load(res.data);
        
        console.log("=== LATEST UPDATES ===");
        const latest = [];
        // We want to select the items directly
        const items = $('#latest-updates .tab-body .aitem');
        console.log("Total .aitem count in latest-updates:", items.length);
        
        items.each((_, el) => {
            const $el = $(el);
            const $poster = $el.find('.poster');
            const href = $poster.attr('href') || $el.find('a').attr('href');
            let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
            if (id.includes('#')) id = id.split('#')[0];
            
            const title = $el.find('.title').text().trim();
            const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');
            
            if (id && title) {
                latest.push({ id, title, image });
            }
        });
        
        console.log(`Parsed ${latest.length} latest items.`);
        console.log("First 3 items:", latest.slice(0, 3));

        console.log("\n=== HERO CAROUSEL / SLIDES ===");
        const slides = [];
        const slideElements = $('.swiper-wrapper .swiper-slide');
        console.log("Slide elements found:", slideElements.length);
        slideElements.each((_, el) => {
            const $el = $(el);
            const title = $el.find('.title, .film-title, .film-name').text().trim();
            const desc = $el.find('.desc, .description, .film-description').text().trim();
            const href = $el.find('.watch-btn, a').attr('href');
            const id = href?.split('/watch/')[1]?.split('?')[0] || '';
            
            // Background image style on .swiper-slide itself
            const style = $el.attr('style') || "";
            let image = "";
            if (style.includes('url(')) {
                image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
            }
            if (!image) {
                image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";
            }
            
            if (id && title) {
                slides.push({ id, title, image, desc });
            }
        });
        console.log(`Parsed ${slides.length} slides.`);
        console.log("First slide:", slides[0]);

        console.log("\n=== TRENDING SIDEBAR ===");
        const trending = [];
        const trendingItems = $('.sidebar-section .aitem');
        console.log("Trending items found:", trendingItems.length);
        trendingItems.each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
            if (id.includes('#')) id = id.split('#')[0];
            
            const title = $el.find('.title').text().trim();
            
            // Check if there is an image in style or img tag
            const style = $el.attr('style') || "";
            let image = "";
            if (style.includes('url(')) {
                image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
            }
            if (!image) {
                image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";
            }
            
            if (id && title) {
                trending.push({ id, title, image });
            }
        });
        console.log(`Parsed ${trending.length} trending items.`);
        console.log("First 3 trending items:", trending.slice(0, 3));

    } catch (e) {
        console.error("Home error:", e);
    }
}

async function testTrendingAjax() {
    try {
        console.log("\n=== AJAX TRENDING TEST ===");
        const res = await axios.get(`${BASE_URL}/ajax/home/items`, {
            params: { name: 'trending' },
            headers: {
                'User-Agent': USER_AGENT,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${BASE_URL}/home`
            }
        });
        console.log("Ajax response status:", res.status);
        console.log("Response data:", JSON.stringify(res.data).substring(0, 500));
        let html = res.data;
        if (res.data && res.data.result) {
            html = res.data.result;
            console.log("Found result field in JSON response.");
        } else if (res.data && res.data.html) {
            html = res.data.html;
            console.log("Found html field in JSON response.");
        }


        
        const $ = cheerio.load(html);
        const results = [];
        const items = $('.aitem');
        console.log("Ajax trending items found (.aitem):", items.length);
        
        items.each((_, element) => {
            const $el = $(element);
            const href = $el.attr('href') || $el.find('a').first().attr('href');
            let id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
            if (id.includes('#')) id = id.split('#')[0];
            
            const title = $el.find('.title').text().trim();
            // Background image in style or image in img tag
            const style = $el.attr('style') || $el.find('.poster').attr('style') || "";
            let image = "";
            if (style.includes('url(')) {
                image = style.split('url(')[1].split(')')[0].replace(/['"]/g, '');
            }
            if (!image) {
                image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || "";
            }
            
            if (id && title) {
                results.push({ id, title, image });
            }
        });
        
        console.log(`Parsed ${results.length} trending items from AJAX.`);
        console.log("First 3 trending items:", results.slice(0, 3));
    } catch (e) {
        console.error("Trending AJAX error:", e.message);
    }
}

async function testSearch() {
    try {
        console.log("\n=== SEARCH TEST ===");
        const query = 'naruto';
        const res = await axios.get(`${BASE_URL}/browser`, {
            params: { keyword: query },
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': BASE_URL,
                'Origin': BASE_URL
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];
        const items = $('.aitem');
        console.log("Search items found (.aitem):", items.length);
        
        items.each((_, element) => {
            const $el = $(element);
            const $poster = $el.find('.poster');
            const href = $poster.attr('href') || $el.find('a').attr('href');
            const id = href?.split('/watch/')[1] || href?.split('/').pop() || '';
            const title = $el.find('.title').text().trim();
            const image = $poster.find('img').attr('data-src') || $poster.find('img').attr('src');
            
            if (id && title) {
                results.push({ id, title, image });
            }
        });
        
        console.log(`Parsed ${results.length} search results.`);
        console.log("First 3 search results:", results.slice(0, 3));
    } catch (e) {
        console.error("Search error:", e.message);
    }
}

async function run() {
    await testHome();
    await testTrendingAjax();
    await testSearch();
}

run();


