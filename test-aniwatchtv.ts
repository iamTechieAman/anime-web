import { getProvider } from './src/lib/providers';

async function testAniwatch() {
    console.log("Testing AniwatchTV...");
    try {
        const p = getProvider('aniwatchtv');
        const search = await p.search('naruto');
        console.log("Search:", search.slice(0, 2));

        if (search.length > 0) {
            const info = await p.getInfo(search[0].id);
            console.log("Info:", info.title, "Episodes:", info.episodes.length);
            
            if (info.episodes.length > 0) {
                const sources = await p.getSources(info.id, info.episodes[0].id, "sub");
                console.log("Sources:", sources.length > 0 ? "Success" : "Empty");
            }
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

testAniwatch();
