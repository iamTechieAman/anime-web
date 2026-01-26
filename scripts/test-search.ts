
import { AnikaiProvider } from '../src/lib/providers/anikai';

async function testSearch() {
    const provider = new AnikaiProvider();
    console.log("Testing search for 'One Piece'...");
    try {
        const results = await provider.search("One Piece");
        console.log("Results count:", results.length);
        if (results.length > 0) {
            console.log("First result:", results[0]);
        } else {
            console.log("No results found.");
        }
    } catch (e) {
        console.error("Search failed:", e);
    }
}

testSearch();
