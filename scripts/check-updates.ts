
import axios from 'axios';
import * as cheerio from 'cheerio';

const URLS = [
    'https://anikai.to/new-releases',
    'https://hianime.to/recently-updated',
    'https://zorotv.com.in/recently-updated'
];

async function check() {
    for (const url of URLS) {
        try {
            console.log(`\nChecking ${url}...`);
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': url
                },
                timeout: 5000
            });
            const $ = cheerio.load(res.data);
            const items = $('.film_list-wrap .flw-item');
            if (items.length > 0) {
                console.log(`[SUCCESS] Found ${items.length} items.`);
                console.log(`Sample: ${items.first().find('.film-name, .film-title').text()}`);
            } else {
                console.log(`[FAIL] No items found.`);
            }
        } catch (e: any) {
            console.log(`[ERROR] ${e.message}`);
        }
    }
}

check();
