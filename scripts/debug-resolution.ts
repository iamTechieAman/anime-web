
import axios from 'axios';
import { AllAnimeProvider } from '../src/lib/providers/allanime';
import { AniWatchProvider } from '../src/lib/providers/aniwatch';
import { HiAnimeProvider } from '../src/lib/providers/hianime';

async function debug(id: string) {
    console.log(`[Debug] Resolving AniList ID: ${id}`);

    // 1. Fetch Title
    let title = "";
    try {
        const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji english } } }`;
        const res = await axios.post('https://graphql.anilist.co', {
            query, variables: { id: parseInt(id) }
        });
        const media = res.data.data.Media;
        title = media.title.english || media.title.romaji;
        console.log(`[Debug] Resolved Title: "${title}"`);
    } catch (e: any) {
        console.error(`[Debug] AniList Fetch Failed: ${e.message}`);
        return;
    }

    if (!title) return;

    // 2. Test AllAnime
    try {
        console.log(`\n[AllAnime] Searching "${title}"...`);
        const p = new AllAnimeProvider();
        const res = await p.search(title);
        console.log(`[AllAnime] Results: ${res.length}`);
        if (res.length > 0) console.log(`[AllAnime] Match: ${res[0].title} (${res[0].id})`);
    } catch (e) { console.error(e); }

    // 3. Test AniWatch
    try {
        console.log(`\n[AniWatch] Searching "${title}"...`);
        const p = new AniWatchProvider();
        const res = await p.search(title);
        console.log(`[AniWatch] Results: ${res.length}`);
        if (res.length > 0) console.log(`[AniWatch] Match: ${res[0].title} (${res[0].id})`);
    } catch (e) { console.error(e); }

    // 4. Test HiAnime
    try {
        console.log(`\n[HiAnime] Searching "${title}"...`);
        const p = new HiAnimeProvider();
        const res = await p.search(title);
        console.log(`[HiAnime] Results: ${res.length}`);
        if (res.length > 0) console.log(`[HiAnime] Match: ${res[0].title} (${res[0].id})`);
    } catch (e) { console.error(e); }
}

debug("172463");
