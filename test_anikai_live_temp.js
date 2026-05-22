const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://anikai.to';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

async function testSearch() {
    try {
        console.log("Fetching search results...");
        const res = await axios.get(`${BASE_URL}/browser`, {
            params: { keyword: 'naruto' },
            headers: { 'User-Agent': USER_AGENT }
        });
        const $ = cheerio.load(res.data);
        console.log("Search status:", res.status);
        console.log("Total .aitem found:", $('.aitem').length);
        
        $('.aitem').each((i, el) => {
            const $el = $(el);
            const href = $el.find('a.poster').attr('href') || $el.find('a').first().attr('href');
            const id = href?.split('/watch/')[1]?.split('#')[0] || href?.split('/').pop() || '';
            const title = $el.find('.title').text().trim() || $el.find('a.title').attr('title') || '';
            const image = $el.find('.poster img').attr('data-src') || $el.find('.poster img').attr('src') || '';
            console.log(`Search item ${i}: id=${id}, title=${title}, image=${image}`);
        });
    } catch (e) {
        console.error("Search error:", e.message);
    }
}

async function testAZList() {
    try {
        console.log("\nFetching AZ-list results...");
        const res = await axios.get(`${BASE_URL}/az-list`, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const $ = cheerio.load(res.data);
        console.log("AZ-list status:", res.status);
        console.log("Total .aitem found:", $('.aitem').length);
        
        $('.aitem').slice(0, 3).each((i, el) => {
            const $el = $(el);
            const href = $el.find('a.poster').attr('href') || $el.find('a').first().attr('href');
            const id = href?.split('/watch/')[1]?.split('#')[0] || href?.split('/').pop() || '';
            const title = $el.find('.title').text().trim() || $el.find('a.title').attr('title') || '';
            const image = $el.find('.poster img').attr('data-src') || $el.find('.poster img').attr('src') || '';
            console.log(`AZ item ${i}: id=${id}, title=${title}, image=${image}`);
        });
    } catch (e) {
        console.error("AZ-list error:", e.message);
    }
}

async function run() {
    await testSearch();
    await testAZList();
}
run();
