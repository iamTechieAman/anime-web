
import axios from 'axios';
import * as cheerio from 'cheerio';

const URLS = [
    'https://aniwatchtv.to/recently-updated',
    'https://aniwatchtv.to/tv'
];

async function check() {
    for (const url of URLS) {
        try {
            console.log(`\nChecking ${url}...`);
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://aniwatchtv.to/'
                },
                timeout: 5000
            });
            const $ = cheerio.load(res.data);
            const items = $('.film_list-wrap .flw-item'); // Standard Zoro selector
            if (items.length > 0) {
                console.log(`[SUCCESS] Found ${items.length} items.`);
                const first = items.first();
                const title = first.find('.film-name, .film-title').text().trim();
                const link = first.find('a').attr('href');
                console.log(`Sample: ${title} (${link})`);
            } else {
                console.log(`[FAIL] No items found with standard selector.`);
                // Dump parsing if standard fails
                console.log(`HTML Snippet: ${res.data.substring(0, 500)}`);
            }
        } catch (e: any) {
            console.log(`[ERROR] ${e.message}`);
        }
    }
}

check();
