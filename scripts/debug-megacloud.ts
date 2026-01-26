
import axios from 'axios';

const ID = "xuUUugghlRmj";
const BASE = "https://megacloud.blog";
const EMBED = `${BASE}/embed-2/v3/e-1/${ID}?k=1`;

async function check(url: string) {
    try {
        console.log(`Checking ${url}...`);
        const res = await axios.get(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': EMBED,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        console.log(`[SUCCESS]`, res.data);
    } catch (e: any) {
        console.log(`[FAIL] ${e.response?.status} ${e.response?.statusText}`);
    }
}

async function debug() {
    await check(`${BASE}/embed-2/ajax/e-1/getSources?id=${ID}`);
    await check(`${BASE}/embed-2/ajax/getSources?id=${ID}`);
}

debug();
