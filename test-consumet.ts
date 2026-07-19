import { getProvider } from './src/lib/providers';

async function testConsumet() {
    console.log("Testing Consumet (Zoro/HiAnime via Consumet)...");
    try {
        const consumet = getProvider('consumet');
        const sources = await consumet.getSources("naruto-shippuden-1155", "23348", "sub", "vidstreaming");
        console.log("Consumet Sub:", sources.length > 0 ? "Success" : "Empty");
    } catch (e: any) {
        console.error("Consumet Error:", e.response?.status, e.response?.statusText || e.message);
    }
}

testConsumet();
