import { getProvider } from './src/lib/providers';

async function testCinevo() {
    console.log("Testing Cinevo...");
    try {
        const cinevo = getProvider('cinevo');
        const info = await cinevo.getInfo("cinevo:movie:299534");
        console.log("Cinevo Info:", info.title);
        
        const sources = await cinevo.getSources("cinevo:movie:299534", "299534:movie"); 
        console.log("Cinevo Movie sources:", sources.length > 0 ? "Success" : "Empty", sources[0]);
    } catch (e: any) {
        console.error("Cinevo Error:", e.message);
    }
}

testCinevo();
