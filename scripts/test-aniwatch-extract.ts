
import { AniWatchProvider } from '../src/lib/providers/aniwatch';

async function test() {
    const provider = new AniWatchProvider();

    console.log("1. Searching 'One Piece'...");
    const search = await provider.search("One Piece");
    if (search.length === 0) { console.log("Search failed"); return; }

    const animeId = search[0].id; // Likely 'one-piece-100' or similar
    console.log(`Found: ${animeId}`);

    console.log("2. Fetching Info/Episodes...");
    const info = await provider.getInfo(animeId);
    const epNum = info.episodes[0].number.toString();
    console.log(`First Episode Number: ${epNum} (ID: ${info.episodes[0].id})`);

    console.log("3. Fetching Sources...");
    try {
        const sources = await provider.getSources(animeId, epNum, 'sub');
        console.log("Sources:", JSON.stringify(sources, null, 2));
    } catch (e: any) {
        console.error("Extraction Failed:", e.message);
    }
}

test();
