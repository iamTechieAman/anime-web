
import axios from 'axios';
import { HiAnimeProvider } from '../src/lib/providers/hianime';
import { AllAnimeProvider } from '../src/lib/providers/allanime';

async function validate() {
    console.log("=== Validating Providers ===");

    // 1. Check Anikai Reachability
    try {
        console.log("\n[Anikai] Connecting to https://anikai.to/home...");
        const res = await axios.get('https://anikai.to/home', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 5000
        });
        console.log(`[Anikai] Status: ${res.status}`);
        console.log(`[Anikai] HTML Preview: ${res.data.substring(0, 100)}...`);
    } catch (e: any) {
        console.log(`[Anikai] Failed: ${e.message}`);
        if (e.response) console.log(`[Anikai] Response: ${e.response.status}`);
    }

    // 2. Check HiAnime Search
    try {
        console.log("\n[HiAnime] Searching 'One Piece'...");
        const hi = new HiAnimeProvider();
        const results = await hi.search("One Piece");
        console.log(`[HiAnime] Found ${results.length} results.`);
        if (results.length > 0) console.log(`[HiAnime] Top result: ${JSON.stringify(results[0])}`);
    } catch (e: any) {
        console.log(`[HiAnime] Search Failed: ${e.message}`);
    }

    // 3. Check AllAnime Search
    try {
        console.log("\n[AllAnime] Searching 'One Piece'...");
        const all = new AllAnimeProvider();
        const results = await all.search("One Piece");
        console.log(`[AllAnime] Found ${results.length} results.`);
        if (results.length > 0) console.log(`[AllAnime] Top result: ${JSON.stringify(results[0])}`);
    } catch (e: any) {
        console.log(`[AllAnime] Search Failed: ${e.message}`);
    }
}

validate();
