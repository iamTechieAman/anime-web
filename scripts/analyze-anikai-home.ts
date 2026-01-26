
import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyze() {
    try {
        console.log("Fetching https://anikai.to/home...");
        const res = await axios.get('https://anikai.to/home', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://anikai.to/'
            },
            timeout: 10000
        });

        const $ = cheerio.load(res.data);

        console.log("\n=== Latest Updates Item Debug ===");
        const list = $('#latest-updates .tab-body');
        if (list.length > 0) {
            const firstLink = list.find('a').first();
            if (firstLink.length > 0) {
                console.log(`First link: ${firstLink.attr('href')}`);
                console.log("Parents:");
                firstLink.parents().each((i, el) => {
                    // @ts-ignore
                    const tag = el.tagName || el.name;
                    const cls = $(el).attr('class');
                    console.log(`- <${tag}> Class="${cls}"`);
                    if ($(el).is('.tab-body')) return false; // Stop at tab-body
                });

                // Inspect specific structure around the link
                const parent = firstLink.parent();
                console.log(`Parent HTML: ${parent.html()?.substring(0, 100)}...`);
            }
        }

    } catch (e: any) {
        console.error("Fetch failed:", e.message);
    }
}

analyze();
