
import axios from 'axios';
import * as cheerio from 'cheerio';

async function dump() {
    try {
        const res = await axios.get('https://anikai.to/home');
        const $ = cheerio.load(res.data);
        const slide = $('.swiper-wrapper .swiper-slide').first().html();
        console.log("Slide HTML:", slide);
    } catch (e) { console.error(e); }
}
dump();
