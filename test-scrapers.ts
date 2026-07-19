import { getProvider } from './src/lib/providers';

async function testProviders() {
    console.log("Testing HiAnime...");
    try {
        const hianime = getProvider('hianime');
        const sources = await hianime.getSources("naruto-shippuden-1155", "23348", "sub", "hd-1");
        console.log("HiAnime Sub:", sources.length > 0 ? "Success" : "Empty");
    } catch (e: any) {
        console.error("HiAnime Error:", e.response?.status, e.response?.statusText || e.message);
    }

    console.log("Testing Cinevo...");
    try {
        const cinevo = getProvider('cinevo');
        const sources = await cinevo.getSources("movie/299534", "movie", "sub"); // Avengers endgame
        console.log("Cinevo Movie:", sources.length > 0 ? "Success" : "Empty");
    } catch (e: any) {
        console.error("Cinevo Error:", e.response?.status, e.response?.statusText || e.message);
    }

    console.log("Testing Gogoanime...");
    try {
        const gogoanime = getProvider('gogoanime');
        const sources = await gogoanime.getSources("naruto-shippuden", "naruto-shippuden-episode-1", "sub");
        console.log("Gogoanime Sub:", sources.length > 0 ? "Success" : "Empty");
    } catch (e: any) {
        console.error("Gogoanime Error:", e.response?.status, e.response?.statusText || e.message);
    }

    console.log("Testing AniwatchTV...");
    try {
        const aniwatch = getProvider('aniwatchtv');
        const sources = await aniwatch.getSources("naruto-shippuden-1155", "23348", "sub");
        console.log("AniwatchTV Sub:", sources.length > 0 ? "Success" : "Empty");
    } catch (e: any) {
        console.error("AniwatchTV Error:", e.response?.status, e.response?.statusText || e.message);
    }
}

testProviders();
