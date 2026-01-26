
import axios from 'axios';
import * as cheerio from 'cheerio';

async function debug() {
    try {
        console.log("Fetching https://aniwatchtv.to/search?keyword=One+Piece");
        const res = await axios.get('https://aniwatchtv.to/search?keyword=One+Piece', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(res.data);
        const items = $('.film_list-wrap .flw-item');
        console.log(`Found ${items.length} items.`);
        if (items.length > 0) {
            console.log(`First HTML: ${items.first().html()}`);
        } else {
            console.log(`HTML Preview: ${res.data.substring(0, 500)}`);
        }
    } catch (e: any) {
        console.log(e.message);
    }
}
debug();
